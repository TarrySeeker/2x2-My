import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { parseBody, contactSchema } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { InsertRow } from "@/lib/supabase/table-types";

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

    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        await supabase.from("contact_requests").insert({
          name: input.name,
          email: input.email,
          phone: input.phone,
          subject: input.subject ?? null,
          message: input.message,
          status: "new",
        } as unknown as InsertRow<"contact_requests">);
      } catch (err) {
        console.warn("[contact] supabase insert failed:", err);
      }
    }

    await sendNotification("contact_form", { customer_name: input.name });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
