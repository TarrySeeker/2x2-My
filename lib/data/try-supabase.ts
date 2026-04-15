import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

/**
 * D-013 — паттерн graceful fallback на demo-данные.
 *
 * Если Supabase не сконфигурирован (placeholder URL / localhost / пусто) —
 * сразу возвращаем fallback без попытки сетевого запроса.
 * Если сконфигурирован — пробуем запрос, при ошибке логируем warn и
 * возвращаем fallback.
 *
 * Использование в серверных data-fetchers:
 *   return trySupabase(
 *     async () => {
 *       const supabase = await createClient();
 *       const { data, error } = await supabase.from("products").select("*");
 *       if (error) throw error;
 *       return data;
 *     },
 *     DEMO_PRODUCTS,
 *     "getProducts",
 *   );
 */
export async function trySupabase<T>(
  fn: () => Promise<T>,
  fallback: T,
  label = "trySupabase",
): Promise<T> {
  if (!isSupabaseConfigured()) {
    return fallback;
  }

  try {
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[${label}] Supabase request failed, using fallback:`, err);
    }
    return fallback;
  }
}
