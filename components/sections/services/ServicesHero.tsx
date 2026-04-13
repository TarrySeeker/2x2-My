import AnimatedSection from '@/components/ui/AnimatedSection'

export type ServicesHeroProps = {
  badge?: string
  title?: string
  description?: string
}

export default function ServicesHero({
  badge = 'Услуги',
  title = 'Всё для заметной рекламы',
  description = 'Полиграфия, наружная реклама и оформление фасадов — под ключ, с гарантией.',
}: ServicesHeroProps = {}) {
  return (
    <section className="relative overflow-hidden bg-brand-dark pt-32 pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,0,0.06),transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(255,107,0,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 50%)',
        }}
      />
      <div className="container relative z-10">
        <AnimatedSection>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-orange/20 px-4 py-2 text-sm font-medium text-brand-orange">
            {badge}
          </div>
          <h1 className="mb-6 max-w-3xl text-4xl font-black text-white md:text-6xl">{title}</h1>
          <p className="max-w-2xl text-lg leading-relaxed text-gray-300 md:text-xl">{description}</p>
        </AnimatedSection>
      </div>
    </section>
  )
}
