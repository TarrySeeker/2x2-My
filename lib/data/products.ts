import "server-only";

import { createClient } from "@/lib/supabase/server";
import { trySupabase } from "@/lib/data/try-supabase";
import type { Product, ProductFilters } from "@/types";

/**
 * Заглушка getProducts — Этап 1 не требует реальных товаров.
 * Реализация с фильтрами и пагинацией придёт в Этапе 2 (каталог).
 */
export async function getProducts(
  _filters: ProductFilters = {},
): Promise<Product[]> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("sort_order", { ascending: true })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    [],
    "getProducts",
  );
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return (data as Product | null) ?? null;
    },
    null,
    "getProductBySlug",
  );
}
