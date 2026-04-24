import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { parseBody, calcRequestSchema } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  PD_CONSENT_VERSION,
  clientIpForInet,
  readIdempotencyKey,
} from "@/lib/forms/pd-consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`quote:${ip}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов, попробуйте позже" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(calcRequestSchema, body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input = parsed.data;
  const referer = request.headers.get("referer");
  const sourceUrl = input.source_url ?? referer ?? null;

  const idempotencyKey = readIdempotencyKey(request.headers);
  const consentIp = clientIpForInet(request.headers);

  // ── Idempotency check ──
  // Если клиент уже отправил эту форму с таким же ключом, возвращаем
  // предыдущий результат — никакого повторного INSERT.
  if (idempotencyKey) {
    try {
      const existing = await sql<
        { id: number; request_number: string | null }[]
      >`
        SELECT id, request_number
        FROM calculation_requests
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      const found = existing[0];
      if (found) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          request_id: found.id,
          request_number: found.request_number,
        });
      }
    } catch (err) {
      console.warn("[api/leads/quote] idempotency lookup failed:", err);
    }
  }

  let requestId: number | null = null;
  let requestNumber: string | null = null;

  try {
    const customerEmail = (input.customer_email ?? null) as string | null;
    const companyName = (input.company_name ?? null) as string | null;
    const comment = (input.comment ?? null) as string | null;
    const productId = (input.product_id ?? null) as number | null;
    const categoryId = (input.category_id ?? null) as number | null;
    const params = (input.params ?? {}) as Record<string, unknown>;
    const attachments = (input.attachments ?? []) as unknown[];

    const rows = await sql<{ id: number; request_number: string | null }[]>`
      INSERT INTO calculation_requests (
        product_id, category_id,
        customer_name, customer_phone, customer_email,
        company_name, params, attachments, comment,
        source_url, status, manager_comment,
        quoted_amount, quoted_at, assigned_to,
        pd_consent_at, pd_consent_version, pd_consent_ip,
        idempotency_key
      )
      VALUES (
        ${productId},
        ${categoryId},
        ${input.customer_name},
        ${input.customer_phone},
        ${customerEmail},
        ${companyName},
        ${sql.json(params as unknown as Parameters<typeof sql.json>[0])},
        ${sql.json(attachments as unknown as Parameters<typeof sql.json>[0])},
        ${comment},
        ${sourceUrl},
        'new',
        NULL,
        NULL, NULL, NULL,
        NOW(), ${PD_CONSENT_VERSION}, ${consentIp},
        ${idempotencyKey}
      )
      RETURNING id, request_number
    `;
    const row = rows[0];
    requestId = row?.id ?? null;
    requestNumber = row?.request_number ?? null;
  } catch (err) {
    // UNIQUE violation idempotency_key — конкурентный второй POST.
    // Перечитываем запись и отдаём её id как «duplicate».
    if (
      idempotencyKey &&
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      const existing = await sql<
        { id: number; request_number: string | null }[]
      >`
        SELECT id, request_number
        FROM calculation_requests
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      const found = existing[0];
      if (found) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          request_id: found.id,
          request_number: found.request_number,
        });
      }
    }
    console.warn("[api/leads/quote] DB insert failed:", err);
  }

  try {
    await sendNotification("calc_request_created", {
      request_number: requestNumber ?? `#${requestId ?? "draft"}`,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      product_name: input.product_name ?? undefined,
    });
  } catch (err) {
    console.warn("[api/leads/quote] notification failed:", err);
  }

  return NextResponse.json({
    success: true,
    request_id: requestId,
    request_number: requestNumber,
  });
}
