import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { PromoFilters } from "@/features/admin/schemas/promo";

// ── List with filters ──

export async function getPromoCodes(filters: PromoFilters) {
  if (!isSupabaseConfigured()) return { data: [], total: 0 };

  const supabase = createAdminClient();
  const { status, page, per_page } = filters;

  let query = supabase
    .from("promo_codes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * per_page, page * per_page - 1);

  const now = new Date().toISOString();

  if (status === "active") {
    query = query
      .eq("is_active", true)
      .or(`valid_to.is.null,valid_to.gt.${now}`);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  } else if (status === "expired") {
    query = query.lt("valid_to", now);
  }

  const { data, count } = await query;

  return { data: data ?? [], total: count ?? 0 };
}

// ── Create ──

export async function createPromoCode(input: {
  code: string;
  description?: string | null;
  type: "fixed" | "percent";
  value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  max_uses?: number | null;
  is_active: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
}) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: input.code,
      description: input.description ?? null,
      type: input.type,
      value: input.value,
      min_order_amount: input.min_order_amount ?? null,
      max_discount_amount: input.max_discount_amount ?? null,
      max_uses: input.max_uses ?? null,
      max_uses_per_user: null,
      applies_to_category_ids: [],
      applies_to_product_ids: [],
      is_active: input.is_active,
      valid_from: input.valid_from ?? null,
      valid_to: input.valid_to ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Update ──

export async function updatePromoCode(
  id: number,
  input: {
    code?: string;
    description?: string | null;
    type?: "fixed" | "percent";
    value?: number;
    min_order_amount?: number | null;
    max_discount_amount?: number | null;
    max_uses?: number | null;
    is_active?: boolean;
    valid_from?: string | null;
    valid_to?: string | null;
  },
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("promo_codes")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ── Delete ──

export async function deletePromoCode(id: number) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("promo_codes").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Check uniqueness ──

export async function checkCodeUniqueness(code: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("promo_codes")
    .select("*", { count: "exact", head: true })
    .eq("code", code.toUpperCase());

  return (count ?? 0) === 0;
}
