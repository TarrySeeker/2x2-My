import HeroSection from '@/components/sections/HeroSection'
import AboutPreview from '@/components/sections/AboutPreview'
import FeaturesSection from '@/components/sections/FeaturesSection'
import ServicesPreview from '@/components/sections/ServicesPreview'
import PromotionsSection from '@/components/sections/PromotionsSection'
import FaqPreviewSection from '@/components/sections/FaqPreviewSection'
import PortfolioPreview from '@/components/sections/PortfolioPreview'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import CtaSection from '@/components/sections/CtaSection'

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <AboutPreview />
      <FeaturesSection />
      <ServicesPreview />
      <PromotionsSection />
      <PortfolioPreview />
      <FaqPreviewSection />
      <TestimonialsSection />
      <CtaSection />
    </main>
  )
}
