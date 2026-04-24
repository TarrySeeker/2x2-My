import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { parseBody, contactSchema } from "@/lib/validation";
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
  const rl = rateLimit(`contact:${ip}`, 5, 60_000);
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

  try {
    const parsed = parseBody(contactSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const input = parsed.data;

    const email = (input.email ?? null) as string | null;
    const phone = (input.phone ?? null) as string | null;
    const subject = (input.subject ?? null) as string | null;

    const idempotencyKey = readIdempotencyKey(request.headers);
    const consentIp = clientIpForInet(request.headers);

    if (idempotencyKey) {
      try {
        const existing = await sql<{ id: number }[]>`
          SELECT id FROM contact_requests
          WHERE idempotency_key = ${idempotencyKey}
          LIMIT 1
        `;
        const found = existing[0];
        if (found) {
          return NextResponse.json({
            success: true,
            duplicate: true,
            id: found.id,
          });
        }
      } catch (err) {
        console.warn("[contact] idempotency lookup failed:", err);
      }
    }

    let contactId: number | null = null;
    try {
      const rows = await sql<{ id: number }[]>`
        INSERT INTO contact_requests (
          name, email, phone, subject, message, status,
          pd_consent_at, pd_consent_version, pd_consent_ip,
          idempotency_key
        )
        VALUES (
          ${input.name},
          ${email},
          ${phone},
          ${subject},
          ${input.message},
          'new',
          NOW(), ${PD_CONSENT_VERSION}, ${consentIp},
          ${idempotencyKey}
        )
        RETURNING id
      `;
      contactId = rows[0]?.id ?? null;
    } catch (err) {
      if (
        idempotencyKey &&
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "23505"
      ) {
        const existing = await sql<{ id: number }[]>`
          SELECT id FROM contact_requests
          WHERE idempotency_key = ${idempotencyKey}
          LIMIT 1
        `;
        const found = existing[0];
        if (found) {
          return NextResponse.json({
            success: true,
            duplicate: true,
            id: found.id,
          });
        }
      }
      console.warn("[contact] DB insert failed:", err);
    }

    await sendNotification("contact_form", { customer_name: input.name });

    return NextResponse.json({ success: true, id: contactId });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
