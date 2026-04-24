import { getSettingValue } from '@/lib/cms/section-content'
import TrustBarClient, { type TrustBarClient as TrustBarClientEntry } from './TrustBarClient'

/**
 * Trust-bar — лента клиентов под hero на главной.
 *
 * Источник данных: `site_settings.homepage_trust_bar`
 * Схема: { text: string, clients: [{ name: string, logo?: string }] }
 *
 * Админ редактирует здесь:
 *   /admin/content/settings → вкладка «Клиенты» (trust_bar)
 *
 * Поведение при пустых данных:
 *   - если `clients` не массив или пустой массив → секция не рендерится (null)
 *   - если `text` пустой → рендерим только логотипы/пилюли
 *   - если у клиента нет `logo` → рендерим «пилюлю» с названием
 *
 * Никогда не падает: getSettingValue возвращает fallback при любой
 * ошибке БД.
 */

interface TrustBarSetting {
  text?: string
  clients?: Array<{ name?: string; logo?: string }>
}

function normalizeClients(raw: unknown): TrustBarClientEntry[] {
  if (!Array.isArray(raw)) return []
  const out: TrustBarClientEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const name = typeof rec.name === 'string' ? rec.name.trim() : ''
    if (!name) continue
    const logo = typeof rec.logo === 'string' ? rec.logo.trim() : ''
    out.push({ name, logo: logo || undefined })
  }
  return out
}

export default async function TrustBar() {
  const raw = await getSettingValue<TrustBarSetting>('homepage_trust_bar', {
    text: '',
    clients: [],
  })

  const clients = normalizeClients(raw?.clients)
  if (clients.length === 0) return null

  const text = typeof raw?.text === 'string' ? raw.text.trim() : ''

  return <TrustBarClient text={text} clients={clients} />
}
