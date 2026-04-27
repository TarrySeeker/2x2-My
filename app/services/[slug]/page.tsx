import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Check, type LucideIcon } from 'lucide-react'

// Link используется в breadcrumbs ниже.

import { getServiceBySlug } from '@/lib/data/services'
import { resolveIcon } from '@/lib/cms/icon-map'
import { siteUrl } from '@/lib/siteConfig'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'
import CtaSection from '@/components/sections/CtaSection'
import Button from '@/components/ui/Button'

// Услуга = редактируемая в админке карточка из таблицы `services`.
// Динамический роут — в build-time кешем не покрыт (force-dynamic + per-request
// data-layer cache 60s), это согласуется с другими CMS-страницами проекта
// (см. lib/db/client.ts о placeholder DATABASE_URL в Docker builder).
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

function lucideKebabToPascal(name: string | null | undefined): string | null {
  if (!name) return null
  return name
    .split('-')
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join('')
}


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) {
    return { title: 'Услуга не найдена', robots: { index: false } }
  }
  const title =
    service.seo_title ||
    `${service.title} в Ханты-Мансийске — рекламная компания «2х2»`
  const description =
    service.seo_description ||
    service.short_description ||
    `Заказ услуги «${service.title}» в рекламной компании «2х2». Расчёт за 1 час, замеры в подарок.`
  return {
    title,
    description,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/services/${service.slug}`,
      images: service.cover_image ? [{ url: service.cover_image }] : undefined,
    },
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params
  const service = await getServiceBySlug(slug)
  if (!service) notFound()

  const features = (service.features as string[] | null) ?? []

  return (
    <main className="bg-white">
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Услуги', url: '/services' },
            { name: service.title, url: `/services/${service.slug}` },
          ]),
        ]}
      />

      <section className="section-padding bg-gradient-to-b from-orange-50/40 to-white">
        <div className="container">
          <div className="mx-auto max-w-5xl">
            <nav className="mb-6 text-sm text-neutral-500">
              <Link href="/" className="hover:text-brand-orange">
                Главная
              </Link>
              {' / '}
              <Link href="/services" className="hover:text-brand-orange">
                Услуги
              </Link>
              {' / '}
              <span className="text-brand-dark">{service.title}</span>
            </nav>

            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10">
                  {[service].map((s) => {
                    // resolveIcon — lookup в map'е, не declarations.
                    // Идём через .map(), потому что react-hooks/incompatible-library
                    // (React Compiler) запрещает const Component = ... на
                    // верхнем уровне функции server-component'а; внутри
                    // .map()-callback'а — разрешено (см. ServicesPreviewClient).
                    const Icon: LucideIcon = resolveIcon(
                      lucideKebabToPascal(s.icon),
                    )
                    return (
                      <Icon
                        key="service-icon"
                        className="h-7 w-7 text-brand-orange"
                        strokeWidth={1.5}
                      />
                    )
                  })}
                </div>
                <h1 className="mb-4 text-3xl font-black text-brand-dark md:text-5xl">
                  {service.title}
                </h1>
                {service.short_description && (
                  <p className="mb-6 text-lg leading-relaxed text-gray-600">
                    {service.short_description}
                  </p>
                )}
                {(service.price_label || service.price_from) && (
                  <div className="mb-8">
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange/10 px-4 py-2 text-sm font-semibold text-brand-orange">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-orange" />
                      {service.price_label ??
                        (service.price_from
                          ? `от ${service.price_from} ₽${service.price_unit ? ` за ${service.price_unit}` : ''}`
                          : 'По запросу')}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button href={service.href ?? '/contacts'}>
                    Заказать <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {service.cover_image && (
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl shadow-xl">
                  <Image
                    src={service.cover_image}
                    alt={service.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {(service.long_description || features.length > 0) && (
        <section className="section-padding">
          <div className="container">
            <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[2fr_1fr]">
              {service.long_description && (
                <article className="prose prose-neutral max-w-none">
                  {service.long_description
                    .split(/\n{2,}/)
                    .map((paragraph: string, idx: number) => (
                      <p key={idx}>{paragraph.trim()}</p>
                    ))}
                </article>
              )}

              {features.length > 0 && (
                <aside>
                  <h2 className="mb-4 text-lg font-bold text-brand-dark">
                    Что включено
                  </h2>
                  <ul className="space-y-3">
                    {features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-white p-3 text-sm text-neutral-700 shadow-sm"
                      >
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-orange" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </div>
          </div>
        </section>
      )}

      <CtaSection
        title="Не нашли то, что нужно?"
        subtitle="Опишите задачу — пришлём расчёт и фотомонтаж в течение часа."
      />
    </main>
  )
}

// Хинт для sitemap. На текущем этапе app/sitemap.ts собирается статически
// (без БД-фетча, см. соответствующий комментарий там). Когда будем добавлять
// детальные URL услуг в карту сайта — импортнуть `listEnabledServices`
// из '@/lib/data/services' и наполнить sitemap.
