import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'
import SectionTitle from '@/components/ui/SectionTitle'
import { asset } from '@/lib/asset'

export default function AboutStory() {
  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection direction="left">
            <SectionTitle title="Наша история" />
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Агентство 2×2 основано в -- году партнёрами с многолетним опытом. Начинали с небольшой студии
                полиграфии, но быстро поняли: клиентам нужен комплексный подход.
              </p>
              <p>Сегодня мы — команда из -- специалистов: дизайнеры, технологи, монтажники.</p>
              <p>
                За -- лет реализовали более 500 проектов — от визиток до брендирования масштабных работ.
              </p>
            </div>
            <div className="mt-8 p-6 bg-brand-gray rounded-2xl border-l-4 border-brand-orange">
              <h3 className="font-bold text-brand-dark mb-2">Наша миссия</h3>
              <p className="text-gray-600 text-sm">
                Помогать бизнесу быть заметным. Создавать рекламу, которая привлекает внимание и приносит результат.
              </p>
            </div>
          </AnimatedSection>
          <AnimatedSection direction="right">
            <div className="relative">
              <div className="relative aspect-[600/500] w-full overflow-hidden rounded-2xl shadow-xl">
                <Image
                  src={asset("/img/about-story-print.png")}
                  alt="Полиграфия, цветовые образцы и контроль качества печати"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-brand-orange text-white p-6 rounded-2xl shadow-xl">
                <div className="text-3xl font-black">—</div>
                <div className="text-sm text-white/80">год основания</div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
