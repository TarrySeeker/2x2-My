import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { parseBody, calcRequestSchema } from "@/lib/validation";
import { sendNotification } from "@/lib/notifications";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { InsertRow } from "@/lib/supabase/table-types";

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

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("calculation_requests")
        .insert({
          product_id: input.product_id ?? null,
          category_id: input.category_id ?? null,
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          customer_email: input.customer_email ?? null,
          company_name: input.company_name ?? null,
          params: input.params,
          attachments: input.attachments,
          comment: input.comment ?? null,
          source_url: sourceUrl,
          status: "new",
          manager_comment: null,
          quoted_amount: null,
          quoted_at: null,
          assigned_to: null,
        } as unknown as InsertRow<"calculation_requests">)
        .select("id, request_number")
        .single();

      if (error) throw error;
      const row = data as { id: number; request_number: string | null } | null;
      requestId = row?.id ?? null;
      requestNumber = row?.request_number ?? null;
    } catch (err) {
      console.warn("[api/leads/quote] supabase insert failed:", err);
    }
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
