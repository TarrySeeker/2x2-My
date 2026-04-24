import { getUiStringsByNamespace } from '@/lib/data/ui-strings'
import { cookieBanner as COOKIE_FALLBACK } from '@/content/cookie-banner'
import CookieBannerClient, {
  type CookieBannerStrings,
} from './CookieBannerClient'

/**
 * Server wrapper для CookieBanner. Читает тексты из ui_strings (namespace='cookie'),
 * fallback — `/content/cookie-banner.ts`. Storage-ключ и URL политики тоже
 * могут управляться из админки (cookie.storage_key, cookie.policy_url), но
 * при отсутствии записи берём константу.
 */
export default async function CookieBanner() {
  const cms = await getUiStringsByNamespace('cookie')

  const strings: CookieBannerStrings = {
    title: cms['cookie.title'] || COOKIE_FALLBACK.title,
    body: cms['cookie.body'] || COOKIE_FALLBACK.body,
    policyText: cms['cookie.policy_text'] || COOKIE_FALLBACK.policyText,
    policyUrl: cms['cookie.policy_url'] || COOKIE_FALLBACK.policyUrl,
    acceptLabel: cms['cookie.accept'] || COOKIE_FALLBACK.acceptLabel,
    declineLabel: cms['cookie.decline'] || COOKIE_FALLBACK.declineLabel,
    closeAriaLabel:
      cms['cookie.close_aria'] || COOKIE_FALLBACK.closeAriaLabel,
    // storageKey должен оставаться стабильным — не управляется через UI.
    storageKey: COOKIE_FALLBACK.storageKey,
  }

  return <CookieBannerClient strings={strings} />
}
