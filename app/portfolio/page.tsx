import type { PortfolioItem as LegacyPortfolioItem } from "@/lib/types";
import type { PortfolioItem } from "@/types";
import PortfolioGallery from "@/components/sections/portfolio/PortfolioGallery";
import ServicesHero from "@/components/sections/services/ServicesHero";
import CtaSection from "@/components/sections/CtaSection";
import { featuredPortfolioWorks } from "@/lib/featuredPortfolioWorks";
import { getPortfolio } from "@/lib/data/portfolio";
import { listPublishedPortfolioCategories } from "@/features/admin/api/portfolio-categories";
import { makeGenerateMetadata } from "@/lib/seo/metadata-cms";
import { readPageSectionContent } from "@/lib/cms/page-section-content";
import { JsonLdScript, buildBreadcrumbList } from "@/lib/seo/json-ld";

// CMS + Supabase data layer: portfolio items + hero. См. комментарий в
// app/page.tsx про деплой без --network workaround.
export const dynamic = "force-dynamic";

export const generateMetadata = makeGenerateMetadata({
  path: "/portfolio",
  fallback: {
    // Title 53 символа; добавляется ` | 2х2` из layout → итог 59 символов.
    title: "Портфолио работ в Ханты-Мансийске и Сургуте",
    description:
      "Реализованные проекты «2х2» в ХМАО: крышная вывеска ВТБ, стелы АЗС, оформление ЮКИОР, световые фигуры Брусники, новогоднее оформление автобусов.",
    keywords: [
      "портфолио 2х2",
      "реклама ханты-мансийск примеры",
      "вывески ханты-мансийск работы",
      "стелы азс хмао",
    ],
  },
});

/**
 * Портфолио читается из Supabase (`portfolio_items`) через `getPortfolio()`,
 * который сам падает на stub из `data/portfolio-stub.ts` при пустой БД
 * или сбое (см. lib/data/portfolio.ts:31). Здесь же мы только адаптируем
 * наш доменный `PortfolioItem` (DB-row) к легаси-форме `LegacyPortfolioItem`,
 * которую ожидает `PortfolioGallery` (Yna-вёрстка с _id/imageUrl/category).
 *
 * Категория для фильтра в галерее: разрешается в порядке приоритета
 *   1) `category_label` (свободная строка, основной механизм)
 *   2) label из `portfolio_categories` через `category_id` (если в админке
 *      выбрана категория, но `category_label` забыли проставить — тогда
 *      работа всё равно попадёт в нужный фильтр)
 *   3) "Наружная реклама" как дефолт.
 *
 * Этот резолв решает баг «опубликовал работу — не видна на витрине»:
 * раньше при категории, выбранной только через `category_id` (без
 * `category_label`), карточка падала в "Наружная реклама" и кликом на
 * целевой фильтр клиент её не находил.
 *
 * Изображение: при пустом `cover_url` подставляем картинку-плейсхолдер,
 * чтобы карточка визуально не проваливалась. Раньше пустой src приводил
 * к `<Image src="" />` → лэйаут срабатывал, но карточка казалась «битой».
 */
const PLACEHOLDER_COVER = "/img/placeholders/portfolio-default.svg";

function toLegacyItem(
  item: PortfolioItem,
  categoryById: Map<number, string>,
): LegacyPortfolioItem {
  const fromId =
    item.category_id !== null && item.category_id !== undefined
      ? categoryById.get(item.category_id)
      : undefined;
  const category =
    (item.category_label && item.category_label.trim()) ||
    fromId ||
    "Наружная реклама";
  const year = item.year ?? new Date().getFullYear();
  const imageUrl =
    item.cover_url && item.cover_url.trim()
      ? item.cover_url
      : PLACEHOLDER_COVER;
  return {
    _id: `pf-${item.id}`,
    title: item.title,
    slug: item.slug,
    category,
    badgeLabel: category,
    description: item.short_description ?? item.description ?? "",
    imageUrl,
    publishedAt: item.published_at ?? `${year}-01-01`,
  };
}

export default async function PortfolioPage() {
  // Параллельно: работы + список категорий-фильтров.
  // Категории из БД (миграция 031). Если БД упала / [], галерея сама
  // падает на хардкод PORTFOLIO_FILTER_LIST из lib/portfolio/categories.ts.
  const [dbItems, dbCategories, heroCms] = await Promise.all([
    getPortfolio(),
    listPublishedPortfolioCategories(),
    readPageSectionContent("/portfolio", "hero", "hero"),
  ]);

  // Map категорий по id — для резолва category_label, когда у работы
  // в админке выбрали category_id, но category_label остался пустым.
  // См. комментарий в toLegacyItem про порядок приоритета.
  const categoryById = new Map<number, string>(
    dbCategories.map((c) => [c.id, c.label]),
  );

  // getPortfolio() уже сам делает fallback на stub при пустой БД, но если
  // и stub'а вдруг нет (теоретически — при правке файла) — деградируем
  // до `featuredPortfolioWorks`, чтобы страница не была пустой.
  const items: LegacyPortfolioItem[] =
    dbItems.length > 0
      ? dbItems.map((it) => toLegacyItem(it, categoryById))
      : featuredPortfolioWorks;

  // Передаём в галерею label'ы опубликованных категорий из БД.
  // Если пусто — галерея использует свой fallback (PORTFOLIO_FILTER_LIST).
  const categoryLabels = dbCategories.map((c) => c.label);

  const fallbackDescription = `${items.length} реализованных проектов — и сотни других задач`;

  return (
    <main>
      <JsonLdScript
        data={buildBreadcrumbList([
          { name: "Главная", url: "/" },
          { name: "Портфолио", url: "/portfolio" },
        ])}
      />
      {/* H1 = «Портфолио» — единый формат с навигацией Header, breadcrumb и
          metadata.title (QA P0-3). Badge оставляем как описание секции. */}
      <ServicesHero
        badge={heroCms?.content.badge || "Реализованные проекты"}
        title={heroCms?.content.title || "Портфолио"}
        description={heroCms?.content.description || fallbackDescription}
      />
      <PortfolioGallery items={items} categoryLabels={categoryLabels} />
      <CtaSection />
    </main>
  );
}
