import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-brand-dark text-white">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex max-w-full rounded-lg bg-white p-3 shadow-sm ring-1 ring-white/10"
            >
              <Image
                src="/img/logo.svg"
                alt="2×2 — рекламное агентство"
                className="h-9 w-auto max-h-10 max-w-[min(100%,260px)] object-contain object-left sm:h-10"
                width={498}
                height={71}
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Рекламное агентство полного цикла. Создаём рекламу, которую
              замечают.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Навигация
            </h3>
            <ul className="space-y-2">
              {(
                [
                  ['/', 'Главная'],
                  ['/about', 'О нас'],
                  ['/services', 'Услуги'],
                  ['/portfolio', 'Портфолио'],
                  ['/faq', 'FAQ'],
                  ['/contacts', 'Контакты'],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-gray-300 hover:text-brand-orange transition-colors text-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Услуги
            </h3>
            <ul className="space-y-2">
              {[
                'Полиграфия',
                'Наружная реклама',
                'Оформление фасадов',
              ].map((s) => (
                <li key={s}>
                  <Link
                    href="/services"
                    className="text-gray-300 hover:text-brand-orange transition-colors text-sm"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Контакты
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="tel:+79044807740"
                  className="text-gray-300 hover:text-brand-orange transition-colors"
                >
                  +7-904-480-77-40
                </a>
              </li>
              <li>
                <a
                  href="mailto:Sj_alex86@mail.ru"
                  className="text-gray-300 hover:text-brand-orange transition-colors break-all"
                >
                  Sj_alex86@mail.ru
                </a>
              </li>
              <li>
                <a
                  href="https://vk.com/ra2x2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-brand-orange transition-colors"
                >
                  ВКонтакте
                </a>
              </li>
              <li className="text-gray-400">
                г. Ханты-Мансийск, ул. Парковая, 92Б
              </li>
              <li className="text-gray-400">
                Пн–Пт: 9:00–19:00
                <br />
                Сб–Вс: На телефоне
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:flex-row">
          <p className="text-gray-500 text-sm">
            © {year} 2×2 Рекламное агентство. Все права защищены.
          </p>
          <p className="text-gray-600 text-xs">
            ИНН: 861006205140 · ОГРН: 323861700071382
          </p>
        </div>
      </div>
    </footer>
  )
}
