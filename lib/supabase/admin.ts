import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Админский клиент Supabase с ключом service_role.
 * ⚠️ НИКОГДА не использовать в клиентском коде!
 * Только для серверных API-роутов, миграций, служебных задач,
 * где нужно обойти RLS (например, обработка webhook от CDEK Pay).
 *
 * Service role key имеет полный доступ к БД.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createSupabaseClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
