import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { parseBody, contactSchema } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

    try {
      await sql`
        INSERT INTO contact_requests (name, email, phone, subject, message, status)
        VALUES (
          ${input.name},
          ${email},
          ${phone},
          ${subject},
          ${input.message},
          'new'
        )
      `;
    } catch (err) {
      console.warn("[contact] DB insert failed:", err);
    }

    await sendNotification("contact_form", { customer_name: input.name });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
