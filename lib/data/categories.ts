import "server-only";

import { createClient } from "@/lib/supabase/server";
import { trySupabase } from "@/lib/data/try-supabase";
import type { Category } from "@/types";

export async function getCategories(): Promise<Category[]> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    [],
    "getCategories",
  );
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as Category | null) ?? null;
    },
    null,
    "getCategoryBySlug",
  );
}
