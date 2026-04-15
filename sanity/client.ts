/**
 * Sanity удалён на Этапе 1. Stub оставлен, чтобы существующие импорты
 * (если где-то остались) не ломали сборку. sanityFetch всегда кидает ошибку —
 * data-fetchers выше отлавливают её и падают на fallback.
 */
export const client: null = null;

export async function sanityFetch<T>(
  _query: string,
  _params?: Record<string, unknown>,
): Promise<T> {
  throw new Error("Sanity removed at Stage 1 — use @/lib/data/* instead");
}
