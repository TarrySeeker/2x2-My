import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// NOTE: @supabase/ssr@0.5.2 declares `createServerClient` with a generic
// signature (`SupabaseClient<Database, SchemaName, Schema>`) that misaligns
// with @supabase/supabase-js@2.103.1's `SupabaseClient<Database,
// SchemaNameOrClientOptions, SchemaName, Schema, ClientOptions>` — so the
// inferred `Schema` collapses to `never`, which breaks both `.from(...)`
// return rows and `.rpc(...)` Args inference. The runtime client is correct;
// only the declared return type is wrong. We re-type it via `SupabaseClient<Database>`,
// which is the shape supabase-js itself exposes for a typed client.
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  // Fallback-значения — чтобы data-fetchers могли вызывать createClient()
  // даже когда Supabase не сконфигурирован. trySupabase() проверяет
  // isSupabaseConfigured() ДО вызова и отдаёт demo-данные в этом случае,
  // так что реального запроса с этими placeholder'ами не будет.
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

  const client = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component — middleware обновит сессию.
          }
        },
      },
    },
  );

  return client as unknown as SupabaseClient<Database>;
}
