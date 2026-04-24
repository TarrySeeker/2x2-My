import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { parseBody, oneClickSchema } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import {
  PD_CONSENT_VERSION,
  clientIpForInet,
  readIdempotencyKey,
} from "@/lib/forms/pd-consent";
import type { Json } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getUtm(url: URL) {
  const sp = url.searchParams;
  return {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    utm_content: sp.get("utm_content"),
    utm_term: sp.get("utm_term"),
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`one-click:${ip}`, 5, 60_000);
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

  const parsed = parseBody(oneClickSchema, body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input = parsed.data;
  const referer = request.headers.get("referer");
  const userAgent = request.headers.get("user-agent");
  const pageUrl = input.page_url ?? referer ?? null;

  let utm: Record<string, string | null> = {};
  try {
    if (pageUrl) utm = getUtm(new URL(pageUrl));
  } catch {
    /* ignore invalid url */
  }

  const idempotencyKey = readIdempotencyKey(request.headers);
  const consentIp = clientIpForInet(request.headers);

  // Idempotency check.
  if (idempotencyKey) {
    try {
      const existing = await sql<{ id: number }[]>`
        SELECT id FROM leads
        WHERE idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      const found = existing[0];
      if (found) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          lead_id: found.id,
        });
      }
    } catch (err) {
      console.warn("[api/leads/one-click] idempotency lookup failed:", err);
    }
  }

  let leadId: number | null = null;

  try {
    const context: Json = {
      product_name: input.product_name ?? null,
      comment: input.comment ?? null,
    };

    const rows = await sql<{ id: number }[]>`
      INSERT INTO leads (
        source, customer_name, customer_phone, customer_email,
        product_id, context,
        page_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        referer, user_agent, status, manager_comment, assigned_to,
        pd_consent_at, pd_consent_version, pd_consent_ip,
        idempotency_key
      )
      VALUES (
        'one_click',
        ${input.name},
        ${input.phone},
        NULL,
        ${input.product_id ?? null},
        ${sql.json(context as unknown as Parameters<typeof sql.json>[0])},
        ${pageUrl},
        ${utm.utm_source ?? null},
        ${utm.utm_medium ?? null},
        ${utm.utm_campaign ?? null},
        ${utm.utm_content ?? null},
        ${utm.utm_term ?? null},
        ${referer},
        ${userAgent},
        'new',
        NULL,
        NULL,
        NOW(), ${PD_CONSENT_VERSION}, ${consentIp},
        ${idempotencyKey}
      )
      RETURNING id
    `;
    leadId = rows[0]?.id ?? null;
  } catch (err) {
    if (
      idempotencyKey &&
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      const existing = await sql<{ id: number }[]>`
        SELECT id FROM leads WHERE idempotency_key = ${idempotencyKey} LIMIT 1
      `;
      const found = existing[0];
      if (found) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          lead_id: found.id,
        });
      }
    }
    console.warn("[api/leads/one-click] DB insert failed:", err);
  }

  try {
    await sendNotification("one_click_lead", {
      customer_name: input.name,
      customer_phone: input.phone,
      product_name: input.product_name ?? undefined,
    });
  } catch (err) {
    console.warn("[api/leads/one-click] notification failed:", err);
  }

  return NextResponse.json({ success: true, lead_id: leadId });
}
