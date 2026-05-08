import Image from 'next/image'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'

/**
 * Статическая карточка-карта офиса.
 *
 * Зачем не iframe Yandex/Google: сторонние map-виджеты блокируются
 * cookie-consent / CSP / трекинг-блокерами и показывают пользователю
 * «Этот контент заблокирован» (жалоба клиента 2026-04-25). Статическая
 * карта-картинка + явные deeplink-кнопки в нативные карты-приложения
 * работают **всегда** — без cookies, без JS, без CSP-исключений.
 *
 * Карта-картинка: Yandex Static API (https://static-maps.yandex.ru) —
 * без ключа отдаёт статический PNG для любых координат. Если в будущем
 * Яндекс закроет публичный endpoint — fallback на static.maps.2gis.ru
 * через тег <picture> или Image onError.
 *
 * Координаты и адрес читаются из props (передаются server-component'ом
 * /contacts из site_settings.contacts.address_geo + site_settings.contacts.address).
 * Это исправляет давний баг: координаты были захардкожены здесь и
 * не реагировали на правки в админке (/admin/content/settings → Контакты).
 *
 * Fallback-значения: координаты Парковой 92Б в Ханты-Мансийске.
 * Используются когда клиент ещё не заполнил поля «широта/долгота»
 * в админке (lat=null или lng=null) — чтобы карта продолжала
 * работать на свежей БД без ручной настройки.
 */

const FALLBACK_LAT = 61.0029
const FALLBACK_LON = 69.0019
const FALLBACK_ADDRESS = 'Ханты-Мансийск, ул. Парковая 92Б'

interface ContactMapProps {
  title?: string
  /** Широта офиса (из site_settings.contacts.address_geo.lat). Если null/undefined — используется fallback. */
  lat?: number | null
  /** Долгота офиса (из site_settings.contacts.address_geo.lng). Если null/undefined — используется fallback. */
  lon?: number | null
  /** Полный адрес для подписи и deeplink-поиска (из site_settings.contacts.address). */
  address?: string | null
}

export default function ContactMap({
  title,
  lat,
  lon,
  address,
}: ContactMapProps) {
  const mapTitle = title || 'Карта офиса 2×2'

  // Если координаты не пришли (пустая БД, миграции не прогнаны, RHF
  // выставил null, и т.п.) — используем fallback. typeof === 'number'
  // защищает от NaN/строк/прочей грязи.
  const officeLat =
    typeof lat === 'number' && Number.isFinite(lat) ? lat : FALLBACK_LAT
  const officeLon =
    typeof lon === 'number' && Number.isFinite(lon) ? lon : FALLBACK_LON
  const officeAddress = address?.trim() || FALLBACK_ADDRESS

  // Yandex Static Maps API. pt=lon,lat,style — pinred для офиса.
  // z=16 — близкий зум, чтобы было видно дом и окружение.
  // Без API-ключа: лимит ~25k запросов/день per IP, нам хватит с запасом.
  const STATIC_MAP_URL =
    `https://static-maps.yandex.ru/1.x/?ll=${officeLon},${officeLat}` +
    `&z=16&size=650,400&l=map&pt=${officeLon},${officeLat},pm2rdm`

  // Deeplinks в нативные приложения карт.
  const YANDEX_URL =
    `https://yandex.ru/maps/?ll=${officeLon},${officeLat}&z=17` +
    `&pt=${officeLon},${officeLat},pm2rdm&text=${encodeURIComponent(officeAddress)}`
  const YANDEX_ROUTE_URL =
    `https://yandex.ru/maps/?rtext=~${officeLat},${officeLon}&rtt=auto`
  const GOOGLE_URL =
    `https://www.google.com/maps/search/?api=1&query=${officeLat},${officeLon}`
  const TWOGIS_URL = `https://2gis.ru/geo/${officeLon},${officeLat}`

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      {/* Статическая карта */}
      <div className="relative aspect-[16/10] w-full bg-gray-50">
        <Image
          src={STATIC_MAP_URL}
          alt={mapTitle}
          fill
          sizes="(max-width: 768px) 100vw, 600px"
          className="object-cover"
          // Яндекс отдаёт PNG, но не SSL-сертификат разрешён для img-src.
          // unoptimized — потому что это внешний URL без поддержки
          // Next/Image оптимизатора (он попытается перепаковать в WebP
          // и может упереться в CORS).
          unoptimized
          // Ленивый — карта обычно ниже первого экрана.
          loading="lazy"
        />
        {/* Полупрозрачный overlay снизу с адресом — улучшает читаемость
            и сразу показывает контекст, даже если картинка не успела
            загрузиться. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
          <div className="flex items-start gap-2 text-white">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange" />
            <div className="text-sm font-medium leading-tight">{officeAddress}</div>
          </div>
        </div>
      </div>

      {/* Deeplink-кнопки */}
      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
        <a
          href={YANDEX_ROUTE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <Navigation className="h-4 w-4" />
          Построить маршрут
        </a>
        <a
          href={YANDEX_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-orange hover:text-brand-orange"
        >
          <ExternalLink className="h-4 w-4" />
          Открыть в Яндекс.Картах
        </a>
      </div>

      {/* Альтернативные карты — компактный ряд */}
      <div className="flex items-center justify-center gap-4 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
        <span>Также доступно:</span>
        <a
          href={GOOGLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 transition-colors hover:text-brand-orange"
        >
          Google Maps
        </a>
        <span aria-hidden>·</span>
        <a
          href={TWOGIS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-gray-700 transition-colors hover:text-brand-orange"
        >
          2ГИС
        </a>
      </div>
    </div>
  )
}
