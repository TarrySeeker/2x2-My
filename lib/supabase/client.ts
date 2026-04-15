"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Браузерный Supabase-клиент.
 * Используется в Client Components.
 * Singleton — создаётся один раз на весь жизненный цикл страницы.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient() {
  if (browserClient) return browserClient;

  // Fallback-значения позволяют создать клиент даже без настроенного Supabase
  // (Этап 1). Запросы через такой клиент будут падать — data-fetchers
  // ловят это через trySupabase() и отдают demo-данные (D-013).
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  browserClient = createBrowserClient<Database>(url, key);

  return browserClient;
}
