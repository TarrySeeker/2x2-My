import "server-only";

import type { z } from "zod";

import { getPageSection, getPageSections } from "@/lib/data/page-sections";
import {
  PAGE_SECTION_SCHEMAS,
  type PageSectionContentType,
} from "@/features/admin/schemas/page-sections";

/**
 * Безопасно читает контент одной секции страницы и валидирует его
 * через Zod-схему, соответствующую `content_type`.
 *
 * При любой ошибке (нет записи, disabled, БД недоступна, content_type
 * неизвестен, схема не прошла) — возвращает `null`. Никогда не бросает.
 *
 * Используется в server wrappers компонентов:
 *   ```ts
 *   const cms = await readPageSectionContent("/about", "hero");
 *   const data = { ...DEFAULT_HERO, ...(cms?.content ?? {}) };
 *   return <HeroSection data={data} />;
 *   ```
 */

export interface ValidatedPageSection<T> {
  pagePath: string;
  sectionKey: string;
  contentType: PageSectionContentType;
  content: T;
  displayOrder: number;
}

/**
 * Overload 1: прочитать и валидировать по известному content_type.
 * Возвращает typed content.
 */
export async function readPageSectionContent<
  K extends PageSectionContentType,
>(
  pagePath: string,
  sectionKey: string,
  expectedContentType?: K,
): Promise<ValidatedPageSection<z.infer<(typeof PAGE_SECTION_SCHEMAS)[K]>> | null> {
  try {
    const section = await getPageSection(pagePath, sectionKey);
    if (!section) return null;

    const ct = section.contentType as PageSectionContentType;
    // Если явно задан ожидаемый тип — страхуемся (content_type в БД
    // мог разойтись со схемой).
    if (expectedContentType && ct !== expectedContentType) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[page-section-content ${pagePath}.${sectionKey}] content_type mismatch: ` +
            `expected=${expectedContentType}, actual=${ct}`,
        );
      }
      return null;
    }

    const schema = PAGE_SECTION_SCHEMAS[ct];
    if (!schema) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[page-section-content ${pagePath}.${sectionKey}] unknown content_type=${ct}`,
        );
      }
      return null;
    }

    const parsed = schema.safeParse(section.content);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[page-section-content ${pagePath}.${sectionKey}] zod validation failed`,
          parsed.error.issues,
        );
      }
      return null;
    }

    return {
      pagePath: section.pagePath,
      sectionKey: section.sectionKey,
      contentType: ct,
      content: parsed.data as z.infer<(typeof PAGE_SECTION_SCHEMAS)[K]>,
      displayOrder: section.displayOrder,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[page-section-content ${pagePath}.${sectionKey}] failed:`,
        err,
      );
    }
    return null;
  }
}

/**
 * Прочитать все опубликованные секции страницы с валидацией каждой.
 * Невалидные — отфильтровываются (с логом в dev).
 *
 * Возвращает в порядке `display_order ASC`.
 */
export async function readPageSections(
  pagePath: string,
): Promise<
  Array<
    ValidatedPageSection<
      z.infer<(typeof PAGE_SECTION_SCHEMAS)[PageSectionContentType]>
    >
  >
> {
  const sections = await getPageSections(pagePath, { enabledOnly: true });
  const out: Array<
    ValidatedPageSection<
      z.infer<(typeof PAGE_SECTION_SCHEMAS)[PageSectionContentType]>
    >
  > = [];
  for (const s of sections) {
    const ct = s.contentType as PageSectionContentType;
    const schema = PAGE_SECTION_SCHEMAS[ct];
    if (!schema) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[page-section-content ${pagePath}.${s.sectionKey}] unknown content_type=${ct}`,
        );
      }
      continue;
    }
    const parsed = schema.safeParse(s.content);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[page-section-content ${pagePath}.${s.sectionKey}] zod validation failed`,
          parsed.error.issues,
        );
      }
      continue;
    }
    out.push({
      pagePath: s.pagePath,
      sectionKey: s.sectionKey,
      contentType: ct,
      content: parsed.data,
      displayOrder: s.displayOrder,
    });
  }
  return out;
}
