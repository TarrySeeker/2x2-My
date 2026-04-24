import { readSectionContent, getSettingValue } from '@/lib/cms/section-content'
import AboutPreviewClient, {
  type AboutSectionData,
  type AboutStat,
  type AboutHighlightCard,
} from './AboutPreviewClient'

const DEFAULT_STATS: AboutStat[] = [
  { icon: 'Calendar',  value: 12,  suffix: '+', label: 'лет на рынке' },
  { icon: 'Briefcase', value: 500, suffix: '+', label: 'проектов' },
  { icon: 'Users',     value: 300, suffix: '+', label: 'клиентов' },
  { icon: 'MapPin',    value: 17,  suffix: '',  label: 'городов — ХМАО, ЯНАО' },
]

const DEFAULT_HIGHLIGHT: AboutHighlightCard = {
  text: 'Мы вас понимаем',
  icon: 'UserCheck',
}

const DEFAULT_ABOUT: AboutSectionData = {
  badge: 'О компании',
  headline: 'Рекламное агентство',
  paragraphs: [
    'Мы делаем рекламу для бизнеса в ХМАО и ЯНАО с 2012 года. Полиграфия, наружная реклама, вывески, световые буквы, оформление фасадов и транспорта — всё под ключ, от эскиза до монтажа.',
    'Среди наших клиентов — ВТБ, Брусника, ЮКИОР, сети АЗС. Работаем с малым бизнесом, госструктурами и федеральными сетями. Полиграфию отправляем по всей России.',
  ],
  highlight_card: DEFAULT_HIGHLIGHT,
  stats: DEFAULT_STATS,
  cta_text: 'Подробнее о нас',
  cta_url: '/about',
}

interface SiteStatsValue {
  years_in_business?: number
  projects_done?: number
  clients_count?: number
  cities_count?: number
  regions?: string
}

function isHighlightCard(v: unknown): v is AboutHighlightCard {
  return (
    !!v && typeof v === 'object' && 'text' in v && typeof (v as { text: unknown }).text === 'string'
  )
}

function isStatArray(v: unknown): v is AboutStat[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof (s as { label?: unknown }).label === 'string' &&
        ('value' in (s as Record<string, unknown>)),
    )
  )
}

/**
 * Server-обёртка About-секции.
 *
 * Источники данных:
 *  - homepage_sections.about (текст, параграфы, highlight_card, дефолтные stats)
 *  - site_settings.stats — глобальные счётчики (если заданы — переопределяют
 *    значения из секции, label оставляем из секции).
 */
export default async function AboutPreview() {
  const cms = await readSectionContent('about')
  const settingsStats = await getSettingValue<SiteStatsValue>('stats', {
    years_in_business: 12,
    projects_done: 500,
    clients_count: 300,
    cities_count: 17,
    regions: 'ХМАО, ЯНАО',
  })

  const rawHighlight = cms?.highlight_card
  const rawStats = cms?.stats

  const highlightFromCms = isHighlightCard(rawHighlight) ? rawHighlight : null

  const cmsStats: AboutStat[] = isStatArray(rawStats) ? rawStats : DEFAULT_STATS

  // Если в site_settings.stats заданы свежие числа — подменяем их в cmsStats
  // по эвристике: ищем stat с подходящим icon, обновляем value+suffix.
  // Это позволяет клиенту менять «17 городов» одним сеттером в админке.
  function pickValue(icon: string): { value: number | string; suffix: string } | null {
    if (icon === 'Calendar' && settingsStats.years_in_business)
      return { value: settingsStats.years_in_business, suffix: '+' }
    if (icon === 'Briefcase' && settingsStats.projects_done)
      return { value: settingsStats.projects_done, suffix: '+' }
    if (icon === 'Users' && settingsStats.clients_count)
      return { value: settingsStats.clients_count, suffix: '+' }
    if (icon === 'MapPin' && settingsStats.cities_count)
      return { value: settingsStats.cities_count, suffix: '' }
    return null
  }

  const stats: AboutStat[] = cmsStats.map((s) => {
    const override = pickValue(String(s.icon ?? ''))
    if (!override) return s
    // Если icon=MapPin и регионы есть — обновляем label на «… городов — РЕГИОНЫ»
    if (s.icon === 'MapPin' && settingsStats.regions) {
      return {
        ...s,
        value: override.value,
        suffix: override.suffix,
        label: `городов — ${settingsStats.regions}`,
      }
    }
    return { ...s, value: override.value, suffix: override.suffix }
  })

  const data: AboutSectionData = {
    badge: typeof cms?.badge === 'string' ? cms.badge : DEFAULT_ABOUT.badge,
    headline: typeof cms?.headline === 'string' ? cms.headline : DEFAULT_ABOUT.headline,
    paragraphs: (() => {
      const raw = cms?.paragraphs
      if (!Array.isArray(raw)) return DEFAULT_ABOUT.paragraphs
      return raw.filter((p): p is string => typeof p === 'string')
    })(),
    // highlight_card: если в БД явно null — оставляем null (клиент мог отключить).
    // Если в БД нет ключа вообще — берём дефолт.
    highlight_card:
      cms && 'highlight_card' in cms
        ? highlightFromCms
        : DEFAULT_HIGHLIGHT,
    stats,
    cta_text: typeof cms?.cta_text === 'string' ? cms.cta_text : DEFAULT_ABOUT.cta_text,
    cta_url: typeof cms?.cta_url === 'string' ? cms.cta_url : DEFAULT_ABOUT.cta_url,
  }

  return <AboutPreviewClient data={data} />
}
