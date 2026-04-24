import { getAllUiStrings } from '@/lib/data/ui-strings'
import PromoPopupBannerClient, {
  type PromoPopupStrings,
} from './PromoPopupBannerClient'

const FALLBACK: PromoPopupStrings = {
  ctaDefault: 'Подробнее',
  closeAriaLabel: 'Закрыть баннер акции',
}

function pick(dict: Record<string, string>, key: string, fallback: string): string {
  const v = dict[key]
  return v && v.length > 0 ? v : fallback
}

/**
 * Server-обёртка промо-баннера. Читает строки из ui_strings
 * (namespace='modals', ключи `promo_popup.*`) и прокидывает в клиентский
 * компонент. Клиент сам делает fetch `/api/promotions/active`.
 */
export default async function PromoPopupBanner() {
  const dict = await getAllUiStrings()
  const strings: PromoPopupStrings = {
    ctaDefault: pick(dict, 'promo_popup.cta_default', FALLBACK.ctaDefault),
    closeAriaLabel: pick(
      dict,
      'promo_popup.close_aria_label',
      FALLBACK.closeAriaLabel,
    ),
  }
  return <PromoPopupBannerClient strings={strings} />
}
