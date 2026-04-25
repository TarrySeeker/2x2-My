import "server-only";

import { readPageSectionContent } from "@/lib/cms/page-section-content";
import { getSettingValue } from "@/lib/data/settings";
import { type SectionKey } from "@/features/admin/schemas/cms";
import { type PageSectionContentType } from "@/features/admin/schemas/page-sections";

/**
 * @deprecated Используется как обратно-совместимая обёртка после
 *   унификации CMS (миграция 017). Внутри читает из `page_sections`
 *   по `(page_path = '/', section_key = key, content_type = 'home_<key>')`.
 *
 * Новое использование — `readPageSectionContent('/', key)`.
 *
 * Безопасно читает контент секции главной из БД и валидирует его
 * через Zod-схему. При любой ошибке (нет записи, БД недоступна,
 * структура повреждена, секция отключена) — возвращает `null`.
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
  const expectedType = (`home_${key}`) as PageSectionContentType;
  const result = await readPageSectionContent("/", key, expectedType);
  if (!result) return null;
  // result.content уже валидирован Zod-схемой home_*-content_type.
  return result.content as unknown as Record<string, unknown>;
}

/**
 * Re-export для удобства импорта в server-обёртках. Используется
 * вместе с readSectionContent в компонентах главной для чтения
 * глобальных настроек (контакты, статистика и т.п.).
 */
export { getSettingValue };
