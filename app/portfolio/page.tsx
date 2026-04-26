import type { PortfolioItem as LegacyPortfolioItem } from "@/lib/types";
import type { PortfolioItem } from "@/types";
import PortfolioGallery from "@/components/sections/portfolio/PortfolioGallery";
import ServicesHero from "@/components/sections/services/ServicesHero";
import CtaSection from "@/components/sections/CtaSection";
import { featuredPortfolioWorks } from "@/lib/featuredPortfolioWorks";
import { getPortfolio } from "@/lib/data/portfolio";
import { makeGenerateMetadata } from "@/lib/seo/metadata-cms";
import { readPageSectionContent } from "@/lib/cms/page-section-content";
import { JsonLdScript, buildBreadcrumbList } from "@/lib/seo/json-ld";

// CMS + Supabase data layer: portfolio items + hero. См. комментарий в
// app/page.tsx про деплой без --network workaround.
export const dynamic = "force-dynamic";

export const generateMetadata = makeGenerateMetadata({
  path: "/portfolio",
  fallback: {
    title: "Портфолио — наши работы в Ханты-Мансийске и Сургуте",
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
 * Категория для фильтра в галерее: пробуем `category_label` (поле, заведённое
 * специально под фильтр), иначе строка-плейсхолдер.
 */
function toLegacyItem(item: PortfolioItem): LegacyPortfolioItem {
  const category = item.category_label || "Наружная реклама";
  const year = item.year ?? new Date().getFullYear();
  return {
    _id: `pf-${item.id}`,
    title: item.title,
    slug: item.slug,
    category,
    badgeLabel: category,
    description: item.short_description ?? item.description ?? "",
    imageUrl: item.cover_url,
    publishedAt: item.published_at ?? `${year}-01-01`,
  };
}

export default async function PortfolioPage() {
  const dbItems = await getPortfolio();
  // getPortfolio() уже сам делает fallback на stub при пустой БД, но если
  // и stub'а вдруг нет (теоретически — при правке файла) — деградируем
  // до `featuredPortfolioWorks`, чтобы страница не была пустой.
  const items: LegacyPortfolioItem[] =
    dbItems.length > 0 ? dbItems.map(toLegacyItem) : featuredPortfolioWorks;

  const fallbackDescription = `${items.length} реализованных проектов — и сотни других задач`;

  const heroCms = await readPageSectionContent("/portfolio", "hero", "hero");

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
      <PortfolioGallery items={items} />
      <CtaSection />
    </main>
  );
}
