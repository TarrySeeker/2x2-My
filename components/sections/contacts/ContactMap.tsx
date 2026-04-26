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
 * Координаты: Ханты-Мансийск, ул. Парковая 92Б (получены через
 * Yandex.Maps geocoder; источник: открытые данные).
 */

const OFFICE = {
  lat: 61.0029,
  lon: 69.0019,
  address: 'Ханты-Мансийск, ул. Парковая 92Б',
  shortAddress: 'ул. Парковая 92Б, Ханты-Мансийск',
}

// Yandex Static Maps API. pt=lon,lat,style — pinred для офиса.
// z=16 — близкий зум, чтобы было видно дом и окружение.
// Без API-ключа: лимит ~25k запросов/день per IP, нам хватит с запасом.
const STATIC_MAP_URL =
  `https://static-maps.yandex.ru/1.x/?ll=${OFFICE.lon},${OFFICE.lat}` +
  `&z=16&size=650,400&l=map&pt=${OFFICE.lon},${OFFICE.lat},pm2rdm`

// Deeplinks в нативные приложения карт.
const YANDEX_URL =
  `https://yandex.ru/maps/?ll=${OFFICE.lon},${OFFICE.lat}&z=17` +
  `&pt=${OFFICE.lon},${OFFICE.lat},pm2rdm&text=${encodeURIComponent(OFFICE.address)}`
const YANDEX_ROUTE_URL =
  `https://yandex.ru/maps/?rtext=~${OFFICE.lat},${OFFICE.lon}&rtt=auto`
const GOOGLE_URL =
  `https://www.google.com/maps/search/?api=1&query=${OFFICE.lat},${OFFICE.lon}`
const TWOGIS_URL = `https://2gis.ru/geo/${OFFICE.lon},${OFFICE.lat}`

interface ContactMapProps {
  title?: string
}

export default function ContactMap({ title }: ContactMapProps) {
  const mapTitle = title || 'Карта офиса 2×2'

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
            <div className="text-sm font-medium leading-tight">{OFFICE.address}</div>
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
