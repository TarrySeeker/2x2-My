import HeroSection from '@/components/sections/HeroSection'
import TrustBar from '@/components/sections/TrustBar'
import ServicesPreview from '@/components/sections/ServicesPreview'
import PromotionsSection from '@/components/sections/PromotionsSection'
import PortfolioPreview from '@/components/sections/PortfolioPreview'
import AboutPreview from '@/components/sections/AboutPreview'
import FeaturesSection from '@/components/sections/FeaturesSection'
import FaqPreviewSection from '@/components/sections/FaqPreviewSection'
import CtaSection from '@/components/sections/CtaSection'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { SITE } from '@/lib/seo/site'

/**
 * Мета главной страницы читается из БД (`page_metadata.path = '/'`).
 * Fallback — константы из `lib/seo/site.ts` (SITE.description/keywords).
 * При пустой БД работает как было.
 */
export const generateMetadata = makeGenerateMetadata({
  path: '/',
  fallback: {
    title:
      'Рекламная компания 2х2 — полиграфия, вывески, наружная реклама в Ханты-Мансийске',
    description: SITE.description,
    keywords: [...SITE.keywords],
  },
})

/**
 * Порядок секций главной (master-plan правка 5, 2026-04-23):
 *  1. Hero
 *  2. Trust-bar (клиенты; рендерится только если site_settings.homepage_trust_bar.clients непустой)
 *  3. Услуги (с кнопкой «Заказать» под каждой и блоком «Также мы занимаемся»)
 *  4. Акции
 *  5. Наши работы (3 featured)
 *  6. О компании (с «Мы вас понимаем» + 17 городов)
 *  7. Почему выбирают нас
 *  8. Частые вопросы
 *  9. CTA (без волны)
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
      <FeaturesSection />
      <FaqPreviewSection />
      <CtaSection />
    </main>
  )
}
