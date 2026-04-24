import HeroSection from '@/components/sections/HeroSection'
import ServicesPreview from '@/components/sections/ServicesPreview'
import PromotionsSection from '@/components/sections/PromotionsSection'
import PortfolioPreview from '@/components/sections/PortfolioPreview'
import AboutPreview from '@/components/sections/AboutPreview'
import FeaturesSection from '@/components/sections/FeaturesSection'
import FaqPreviewSection from '@/components/sections/FaqPreviewSection'
import CtaSection from '@/components/sections/CtaSection'

/**
 * Порядок секций главной (master-plan правка 5, 2026-04-23):
 *  1. Hero
 *  2. Услуги (с кнопкой «Заказать» под каждой и блоком «Также мы занимаемся»)
 *  3. Акции
 *  4. Наши работы (3 featured)
 *  5. О компании (с «Мы вас понимаем» + 17 городов)
 *  6. Почему выбирают нас
 *  7. Частые вопросы
 *  8. CTA (без волны)
 *
 * Удалено: TestimonialsSection (по решению клиента — компания не собирает
 * публичные отзывы на текущем этапе).
 */
export default function HomePage() {
  return (
    <main>
      <HeroSection />
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
