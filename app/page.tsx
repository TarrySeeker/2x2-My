import HeroSection from '@/components/sections/HeroSection'
import TrustBar from '@/components/sections/TrustBar'
import ServicesPreview from '@/components/sections/ServicesPreview'
import PromotionsSection from '@/components/sections/PromotionsSection'
import PortfolioPreview from '@/components/sections/PortfolioPreview'
import AboutPreview from '@/components/sections/AboutPreview'
import AboutTeam from '@/components/sections/about/AboutTeam'
import FeaturesSection from '@/components/sections/FeaturesSection'
import FaqPreviewSection from '@/components/sections/FaqPreviewSection'
import CtaSection from '@/components/sections/CtaSection'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { SITE } from '@/lib/seo/site'

// CMS-driven: каждая секция (Hero, Services, Promotions, …) делает
// свой server-side fetch в Postgres через readPageSectionContent('/', key)
// (миграция 017 — унифицированный источник истины page_sections) и
// listActive*. На `next build` это вызывает зависание билда
// (DATABASE_URL=postgres://placeholder → connect_timeout 10s × N), а
// workaround `--network app-network` для buildx ломает воспроизводимость.
// Переводим главную в dynamic-режим: рендеринг выполняется на каждом
// запросе, кеширование — через unstable_cache внутри data-layer
// (revalidate: 60s в lib/data/page-sections.ts и т.п.). При сохранении
// в админке упсёрт инвалидирует тег `page-sections:/` — изменения
// появляются на сайте мгновенно (read-your-own-writes).
export const dynamic = 'force-dynamic'

/**
 * Мета главной страницы читается из БД (`page_metadata.path = '/'`).
 * Fallback — константы из `lib/seo/site.ts` (SITE.description/keywords).
 * При пустой БД работает как было.
 */
export const generateMetadata = makeGenerateMetadata({
  path: '/',
  fallback: {
    // Title укорочён до 55 символов (с 87) — вписывается в SERP-обрезку.
    // Подробности — в app/layout.tsx (title.default). Остальное берёт
    // CMS (page_metadata.path = '/'), если заполнено в админке.
    title: '2х2 Ханты-Мансийск — реклама, печать, вывески и фасады',
    description: SITE.description,
    keywords: [...SITE.keywords],
  },
})

/**
 * Порядок секций главной (master-plan правка 5, 2026-04-23;
 *  обновление 2026-04-27 — добавлен блок «Наша команда»):
 *  1. Hero
 *  2. Trust-bar (клиенты; рендерится только если site_settings.homepage_trust_bar.clients непустой)
 *  3. Услуги (с кнопкой «Заказать» под каждой и блоком «Также мы занимаемся»)
 *  4. Акции
 *  5. Наши работы (3 featured)
 *  6. О компании (с «Мы вас понимаем» + 17 городов)
 *  7. Наша команда (server-rendered AboutTeam — gracefully возвращает null,
 *     если в БД нет активных team_members; админка /admin/content/team)
 *  8. Почему выбирают нас
 *  9. Частые вопросы
 * 10. CTA (без волны)
 *
 * Удалено: TestimonialsSection (по решению клиента — компания не собирает
 * публичные отзывы на текущем этапе).
 */
export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <TrustBar />
      <ServicesPreview />
      <PromotionsSection />
      <PortfolioPreview />
      <AboutPreview />
      <AboutTeam />
      <FeaturesSection />
      <FaqPreviewSection />
      <CtaSection />
    </main>
  )
}
