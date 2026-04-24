import "server-only";

import { getSection } from "@/lib/data/cms";
import { getSettingValue } from "@/lib/data/settings";
import {
  SECTION_SCHEMAS,
  type SectionKey,
} from "@/features/admin/schemas/cms";

/**
 * Безопасно читает контент секции главной из БД и валидирует его
 * через Zod-схему. При любой ошибке (нет записи, БД недоступна,
 * структура повреждена, секция не опубликована) — возвращает `null`.
 *
 * Server-component-обёртка должна сама смержить fallback:
 *  ```ts
 *  const cms = await readSectionContent("hero");
 *  const data = { ...DEFAULT_HERO, ...(cms ?? {}) };
 *  return <HeroSectionClient data={data} />;
 *  ```
 *
 * Никогда не бросает исключений.
 */
export async function readSectionContent<K extends SectionKey>(
  key: K,
): Promise<Record<string, unknown> | null> {
  try {
    const row = await getSection(key);
    if (!row) return null;
    if (row.isPublished === false) return null;
    const schema = SECTION_SCHEMAS[key];
    const parsed = schema.safeParse(row.content);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[cms.readSectionContent ${key}] zod validation failed`,
          parsed.error.issues,
        );
      }
      return null;
    }
    return parsed.data as Record<string, unknown>;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[cms.readSectionContent ${key}] failed:`, err);
    }
    return null;
  }
}

/**
 * Re-export для удобства импорта в server-обёртках.
 */
export { getSettingValue };
