import { readSectionContent } from '@/lib/cms/section-content'
import HeroSectionClient, { type HeroSectionData } from './HeroSectionClient'

const DEFAULT_HERO: HeroSectionData = {
  eyebrow:            'Рекламное агентство · ХМАО и ЯНАО',
  headline_line1:     'Мы создаем',
  headline_accent:    'рекламу,',
  headline_line3:     'которую замечают',
  titles: [
    'Региональный оператор наружной рекламы ХМАО и ЯНАО',
    'Мы создаём рекламу, которую замечают',
  ],
  typewriter:         '2×2, потому что с нами просто!',
  subheadline:
    'Полиграфия, вывески, наружная реклама и оформление фасадов — под ключ. Работаем по всему ХМАО и ЯНАО: Сургут, Нижневартовск и ещё 14 городов.',
  cta_primary_text:   'Получить расчёт',
  cta_primary_url:    'quote_modal',
  cta_secondary_text: 'Портфолио',
  cta_secondary_url:  '/portfolio',
}

function asString(v: unknown, fallback: string): string {
  if (typeof v === 'string' && v.length > 0) return v
  return fallback
}

function asStringArray(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback
  const clean = v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
  return clean.length > 0 ? clean : fallback
}

/**
 * Server-component-обёртка hero-секции.
 * Читает контент из homepage_sections.hero. При недоступности БД —
 * рендерит дефолт.
 */
export default async function HeroSection() {
  const cms = await readSectionContent('hero')
  const data: HeroSectionData = {
    eyebrow:            asString(cms?.eyebrow,            DEFAULT_HERO.eyebrow),
    headline_line1:     asString(cms?.headline_line1,     DEFAULT_HERO.headline_line1),
    headline_accent:    asString(cms?.headline_accent,    DEFAULT_HERO.headline_accent),
    headline_line3:     asString(cms?.headline_line3,     DEFAULT_HERO.headline_line3),
    titles:             asStringArray(cms?.titles,        DEFAULT_HERO.titles),
    typewriter:         asString(cms?.typewriter,         DEFAULT_HERO.typewriter),
    subheadline:        asString(cms?.subheadline,        DEFAULT_HERO.subheadline),
    cta_primary_text:   asString(cms?.cta_primary_text,   DEFAULT_HERO.cta_primary_text),
    cta_primary_url:    asString(cms?.cta_primary_url,    DEFAULT_HERO.cta_primary_url),
    cta_secondary_text: asString(cms?.cta_secondary_text, DEFAULT_HERO.cta_secondary_text),
    cta_secondary_url:  asString(cms?.cta_secondary_url,  DEFAULT_HERO.cta_secondary_url),
  }
  return <HeroSectionClient data={data} />
}
