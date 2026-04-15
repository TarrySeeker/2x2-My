import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { parseBody, oneClickSchema } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { InsertRow } from "@/lib/supabase/table-types";

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

  let leadId: number | null = null;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("leads")
        .insert({
          source: "one_click",
          customer_name: input.name,
          customer_phone: input.phone,
          customer_email: null,
          product_id: input.product_id ?? null,
          context: {
            product_name: input.product_name ?? null,
            comment: input.comment ?? null,
          },
          page_url: pageUrl,
          utm_source: utm.utm_source ?? null,
          utm_medium: utm.utm_medium ?? null,
          utm_campaign: utm.utm_campaign ?? null,
          utm_content: utm.utm_content ?? null,
          utm_term: utm.utm_term ?? null,
          referer,
          user_agent: userAgent,
          status: "new",
          manager_comment: null,
          assigned_to: null,
        } as unknown as InsertRow<"leads">)
        .select("id")
        .single();

      if (error) throw error;
      leadId = (data as { id: number } | null)?.id ?? null;
    } catch (err) {
      console.warn("[api/leads/one-click] supabase insert failed:", err);
    }
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
