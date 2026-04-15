import type { Metadata } from "next";
import type { PortfolioItem } from "@/lib/types";
import PortfolioGallery from "@/components/sections/portfolio/PortfolioGallery";
import ServicesHero from "@/components/sections/services/ServicesHero";
import CtaSection from "@/components/sections/CtaSection";
import { featuredPortfolioWorks } from "@/lib/featuredPortfolioWorks";
import { getPortfolioStub } from "@/lib/data/portfolio";
import { buildMetadata } from "@/lib/seo/metadata";
import { JsonLdScript, buildBreadcrumbList } from "@/lib/seo/json-ld";

export const metadata: Metadata = buildMetadata({
  title: "Портфолио — наши работы в Ханты-Мансийске и Сургуте",
  description:
    "Реализованные проекты «2х2» в ХМАО: крышная вывеска ВТБ, стелы АЗС, оформление ЮКИОР, световые фигуры Брусники, новогоднее оформление автобусов.",
  path: "/portfolio",
  keywords: [
    "портфолио 2х2",
    "реклама ханты-мансийск примеры",
    "вывески ханты-мансийск работы",
    "стелы азс хмао",
  ],
});

/**
 * Портфолио читается из Supabase (или падает на stub на Этапе 1).
 * PortfolioGallery ожидает легаси-форму из @/lib/types (совместимость с
 * Yna-версткой). Поэтому конвертируем стаб → легаси-форму.
 */
function toLegacyItem(stub: ReturnType<typeof getPortfolioStub>[number]): PortfolioItem {
  return {
    _id: `stub-${stub.id}`,
    title: stub.title,
    slug: stub.slug,
    category: stub.category_label,
    badgeLabel: stub.category_label,
    description: stub.description,
    imageUrl: stub.cover_url,
    publishedAt: `${stub.year}-01-01`,
  };
}

export default function PortfolioPage() {
  const stubs = getPortfolioStub();
  const items: PortfolioItem[] =
    stubs.length > 0 ? stubs.map(toLegacyItem) : featuredPortfolioWorks;

  const description = `${items.length} реализованных проектов — и сотни других задач`;

  return (
    <main>
      <JsonLdScript
        data={buildBreadcrumbList([
          { name: "Главная", url: "/" },
          { name: "Портфолио", url: "/portfolio" },
        ])}
      />
      <ServicesHero
        badge="Портфолио"
        title="Наши работы"
        description={description}
      />
      <PortfolioGallery items={items} />
      <CtaSection />
    </main>
  );
}
