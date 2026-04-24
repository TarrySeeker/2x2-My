import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'
import SectionTitle from '@/components/ui/SectionTitle'
import { asset } from '@/lib/asset'

/**
 * Три ключевых показателя «Наша история». Значения согласованы с текстом
 * параграфов выше: основаны в 2011, команда из 7 человек, 15 лет опыта.
 * Если цифры устаревают — обновлять здесь и синхронизировать с текстом.
 */
const STATS = [
  { value: '2011', label: 'год основания' },
  { value: '7+', label: 'специалистов в команде' },
  { value: '15', label: 'лет на рынке ХМАО' },
] as const

export default function AboutStory() {
  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection direction="left">
            <SectionTitle title="Наша история" />
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Агентство 2×2 основано в 2011 году партнёрами с многолетним опытом. Начинали с
                небольшой студии полиграфии, но быстро поняли: клиентам нужен комплексный подход.
              </p>
              <p>
                Сегодня мы — команда из 7 специалистов: дизайнеры, технологи, монтажники.
              </p>
              <p>
                За 15 лет реализовали более 500 проектов — от визиток до брендирования масштабных
                работ.
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
              {/* Бадж с тремя ключевыми показателями. Регрессия QA P1-4:
                  на десктопе бэйдж позиционировался только bottom-left и
                  получал ширину по содержимому; при три-колоночной сетке
                  без явного min-width две правые колонки могли «уезжать»
                  за фон или схлопываться (визуально оставалось только «2011»).
                  Фикс: на md+ задаём `w-auto min-w-[24rem]`, оставляем
                  `flex` с фиксированными `divide-x` разделителями вместо grid. */}
              <div className="absolute -bottom-6 left-1/2 w-[calc(100%-3rem)] -translate-x-1/2 flex items-center justify-around gap-3 bg-brand-orange text-white px-5 py-4 rounded-2xl shadow-xl sm:left-auto sm:right-auto sm:-bottom-8 sm:-left-8 sm:translate-x-0 sm:w-auto sm:min-w-[26rem] sm:gap-0 sm:divide-x sm:divide-white/25 sm:px-2 sm:py-5">
                {STATS.map((s) => (
                  <div
                    key={s.label}
                    className="flex-1 text-center px-2 sm:px-6 sm:first:pl-4 sm:last:pr-4"
                  >
                    <div className="text-2xl font-black leading-none sm:text-3xl">{s.value}</div>
                    <div className="mt-1.5 text-[11px] leading-tight text-white/85 sm:text-xs">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  )
}
