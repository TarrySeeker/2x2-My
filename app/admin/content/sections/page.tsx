import { getPageSections } from "@/lib/data/page-sections";
import {
  PAGE_SECTIONS_ALLOWED,
  type PageSectionContentType,
} from "@/features/admin/schemas/page-sections";
import PageSectionsClient, {
  type SectionRow,
  type PagePayload,
} from "@/features/admin/components/PageSectionsClient";

export const metadata = { title: "Секции страниц" };

/**
 * Admin /admin/content/sections — редактор универсальных блоков
 * для внутренних страниц (page_sections, миграция 010).
 *
 * Whitelist страниц и возможных секций — в PAGE_SECTIONS_ALLOWED.
 * На UI страницы сгруппированы (каждая уникальная page_path — отдельный
 * таб), а секции каждой страницы показываются списком с reorder/toggle/edit.
 */

const PAGE_LABELS: Record<string, string> = {
  "/":           "Главная",
  "/about":      "О компании",
  "/contacts":   "Контакты",
  "/calculator": "Калькулятор",
  "/portfolio":  "Портфолио",
  "/faq":        "FAQ",
  "/blog":       "Блог",
  "/services":   "Услуги",
};

export default async function PageSectionsAdminPage() {
  // Уникальные страницы из whitelist
  const pagesSet = new Set(PAGE_SECTIONS_ALLOWED.map((a) => a.page_path));
  const pagePaths = Array.from(pagesSet);

  // Для каждой страницы — загружаем существующие секции (все, не только enabled)
  const pages: PagePayload[] = await Promise.all(
    pagePaths.map(async (path) => {
      const stored = await getPageSections(path, { enabledOnly: false });
      const storedByKey = new Map(stored.map((s) => [s.sectionKey, s]));

      // Отдаём клиенту список allowed секций; те, которых ещё нет в БД, —
      // как placeholder'ы с exists:false
      const allowed = PAGE_SECTIONS_ALLOWED.filter((a) => a.page_path === path);

      const sections: SectionRow[] = allowed.map((a) => {
        const s = storedByKey.get(a.section_key);
        return {
          pagePath: a.page_path,
          sectionKey: a.section_key,
          contentType: a.content_type as PageSectionContentType,
          content: s ? (s.content as Record<string, unknown>) : {},
          displayOrder: s?.displayOrder ?? allowed.indexOf(a) * 10,
          enabled: s?.enabled ?? false,
          updatedAt: s?.updatedAt ?? null,
          exists: Boolean(s),
        };
      });

      // Сортируем существующие — по display_order, несуществующие в конце
      sections.sort((a, b) => {
        if (a.exists && !b.exists) return -1;
        if (!a.exists && b.exists) return 1;
        return a.displayOrder - b.displayOrder;
      });

      return {
        path,
        label: PAGE_LABELS[path] ?? path,
        sections,
      };
    }),
  );

  return <PageSectionsClient pages={pages} />;
}
