import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { parseBody, calcRequestSchema } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { Json } from "@/types/database";

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
        quoted_amount, quoted_at, assigned_to
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
        NULL, NULL, NULL
      )
      RETURNING id, request_number
    `;
    const row = rows[0];
    requestId = row?.id ?? null;
    requestNumber = row?.request_number ?? null;
  } catch (err) {
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
