/**
 * Проверяет, настроен ли Supabase (не плейсхолдер и не пустая переменная).
 * Используется в data-модулях, чтобы сразу вернуть demo-данные без сетевого запроса,
 * когда .env.local содержит placeholder-URL (на dev-деплоях).
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return false;
  if (url.includes("placeholder")) return false;
  if (url.includes("your-project")) return false;
  if (url.includes("example")) return false;
  if (url.includes("localhost")) return false;
  return true;
}
