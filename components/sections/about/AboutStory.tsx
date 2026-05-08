import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'
import SectionTitle from '@/components/ui/SectionTitle'
import { asset } from '@/lib/asset'
import { readPageSectionContent } from '@/lib/cms/page-section-content'

/**
 * Три ключевых показателя «Наша история» (fallback).
 * Если CMS заполнен — используется стат-список из page_sections.
 *
 * Год основания — 2014 (см. lib/seo/site.ts BUSINESS.foundingYear,
 * этот же год идёт в JSON-LD foundingDate). Раньше тут стояло 2011 +
 * «15 лет» — несостыковка с JSON-LD, фикс 2026-05-08.
 *
 * «10+ лет на рынке» — мягкая формулировка, не привязанная к
 * конкретному числу (на 2026 год корректна для основания в 2014).
 */
const DEFAULT_STATS = [
  { value: '2014', label: 'год основания' },
  { value: '7+', label: 'специалистов в команде' },
  { value: '10+', label: 'лет на рынке ХМАО' },
] as const

const DEFAULT_PARAGRAPHS = [
  'Агентство 2×2 основано в 2014 году партнёрами с многолетним опытом. Начинали с небольшой студии полиграфии, но быстро поняли: клиентам нужен комплексный подход.',
  'Сегодня мы — команда из 7 специалистов: дизайнеры, технологи, монтажники.',
  'За 10+ лет реализовали более 500 проектов — от визиток до брендирования масштабных работ.',
] as const

const DEFAULT_MISSION = {
  title: 'Наша миссия',
  text:
    'Помогать бизнесу быть заметным. Создавать рекламу, которая привлекает внимание и приносит результат.',
} as const

const DEFAULT_HEADLINE = 'Наша история'
const DEFAULT_IMAGE = '/img/about-story-print.png'
const DEFAULT_IMAGE_ALT = 'Полиграфия, цветовые образцы и контроль качества печати'

export default async function AboutStory() {
  const cms = await readPageSectionContent('/about', 'story', 'text_block')

  const headline = cms?.content.headline || DEFAULT_HEADLINE
  const paragraphs =
    cms?.content.paragraphs && cms.content.paragraphs.length > 0
      ? cms.content.paragraphs
      : DEFAULT_PARAGRAPHS
  const mission =
    cms?.content.mission && cms.content.mission.title
      ? cms.content.mission
      : DEFAULT_MISSION
  const stats =
    cms?.content.stats && cms.content.stats.length > 0
      ? cms.content.stats.map((s) => ({
          value: typeof s.value === 'number' ? String(s.value) : s.value,
          label: s.label,
        }))
      : DEFAULT_STATS

  const imageSrc = cms?.content.image || DEFAULT_IMAGE
  const imageAlt = cms?.content.image_alt || DEFAULT_IMAGE_ALT

  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection direction="left">
            <SectionTitle title={headline} />
            <div className="space-y-4 text-gray-600 leading-relaxed">
              {paragraphs.map((p, i) => (
                <p key={`para-${i}`}>{p}</p>
              ))}
            </div>
            {mission && mission.title ? (
              <div className="mt-8 p-6 bg-brand-gray rounded-2xl border-l-4 border-brand-orange">
                <h3 className="font-bold text-brand-dark mb-2">{mission.title}</h3>
                <p className="text-gray-600 text-sm">{mission.text}</p>
              </div>
            ) : null}
          </AnimatedSection>
          <AnimatedSection direction="right">
            <div className="relative">
              <div className="relative aspect-[600/500] w-full overflow-hidden rounded-2xl shadow-xl">
                <Image
                  src={asset(imageSrc)}
                  alt={imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              {/* Бадж со статами — устойчив к числу колонок. */}
              <div className="absolute -bottom-6 left-1/2 w-[calc(100%-3rem)] -translate-x-1/2 flex items-center justify-around gap-3 bg-brand-orange text-white px-5 py-4 rounded-2xl shadow-xl sm:left-auto sm:right-auto sm:-bottom-8 sm:-left-8 sm:translate-x-0 sm:w-auto sm:min-w-[26rem] sm:gap-0 sm:divide-x sm:divide-white/25 sm:px-2 sm:py-5">
                {stats.map((s, i) => (
                  <div
                    key={`stat-${i}`}
                    className="flex-1 text-center px-2 sm:px-6 sm:first:pl-4 sm:last:pr-4"
                  >
                    <div className="text-2xl font-black leading-none sm:text-3xl">
                      {s.value}
                    </div>
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
