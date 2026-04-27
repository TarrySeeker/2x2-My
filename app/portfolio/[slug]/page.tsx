import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { MapPin, Calendar, Building2, Tag, Layers } from 'lucide-react'

import { getPortfolioItemBySlug } from '@/lib/data/portfolio'
import { siteUrl } from '@/lib/siteConfig'
import {
  JsonLdScript,
  buildBreadcrumbList,
  buildPortfolioWork,
} from '@/lib/seo/json-ld'
import { asset } from '@/lib/asset'
import ServicesHero from '@/components/sections/services/ServicesHero'
import CtaSection from '@/components/sections/CtaSection'

// CMS-driven: portfolio_items + page_sections читаются по запросу.
// `force-dynamic` — единый подход с другими CMS-страницами проекта
// (см. lib/db/client.ts о placeholder DATABASE_URL в Docker builder).
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const item = await getPortfolioItemBySlug(slug)
  if (!item) {
    return { title: 'Работа не найдена', robots: { index: false } }
  }
  const title =
    item.seo_title ||
    `${item.title} — портфолио рекламной компании «2х2»`
  const description =
    item.seo_description ||
    item.short_description ||
    item.description?.slice(0, 200) ||
    `Реализованный проект «${item.title}» от рекламной компании «2х2» в ХМАО.`
  return {
    title,
    description,
    alternates: { canonical: `/portfolio/${item.slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/portfolio/${item.slug}`,
      images: item.cover_url ? [{ url: item.cover_url }] : undefined,
      type: 'article',
    },
  }
}

export default async function PortfolioWorkPage({ params }: Props) {
  const { slug } = await params
  const item = await getPortfolioItemBySlug(slug)
  if (!item) notFound()

  // Hero badge — собираем из доступных полей: категория + место + год.
  // Никакого «Реализованный проект» по умолчанию — дублирует контекст.
  const badgeBits: string[] = []
  if (item.category_label) badgeBits.push(item.category_label)
  if (item.location) badgeBits.push(item.location)
  if (item.year) badgeBits.push(String(item.year))
  const heroBadge =
    badgeBits.length > 0 ? badgeBits.join(' · ') : 'Реализованный проект'

  const heroDescription =
    item.short_description ||
    // Если short_description пуст, берём первый параграф длинного описания.
    (item.description ? item.description.split(/\n{2,}/)[0]?.slice(0, 280) : null) ||
    'Подробности проекта — ниже.'

  // Дополнительные изображения проекта (помимо cover_url) — рендерим
  // галереей. Стаб-данные хранят только cover в `images`, поэтому
  // отфильтровываем дубликат.
  const extraImages = (item.images ?? []).filter(
    (src) => typeof src === 'string' && src && src !== item.cover_url,
  )

  return (
    <main className="bg-white">
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Портфолио', url: '/portfolio' },
            { name: item.title, url: `/portfolio/${item.slug}` },
          ]),
          buildPortfolioWork({
            title: item.title,
            slug: item.slug,
            description:
              item.short_description ?? item.description ?? item.title,
            image: item.cover_url ?? '/og.png',
            datePublished: item.published_at ?? undefined,
            clientName: item.client_name ?? undefined,
            location: item.location ?? undefined,
          }),
        ]}
      />

      <ServicesHero
        badge={heroBadge}
        title={item.title}
        description={heroDescription}
      />

      <section className="section-padding">
        <div className="container">
          <nav className="mb-6 text-sm text-neutral-500">
            <Link href="/" className="hover:text-brand-orange">
              Главная
            </Link>
            {' / '}
            <Link href="/portfolio" className="hover:text-brand-orange">
              Портфолио
            </Link>
            {' / '}
            <span className="text-brand-dark">{item.title}</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            {/* Главное фото */}
            {item.cover_url ? (
              <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl shadow-xl">
                <Image
                  src={asset(item.cover_url)}
                  alt={item.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="flex aspect-[3/2] w-full items-center justify-center rounded-3xl bg-neutral-100 text-neutral-300">
                <Layers className="h-16 w-16" />
              </div>
            )}

            {/* Сводка по проекту */}
            <aside className="space-y-4">
              <h2 className="text-lg font-bold text-brand-dark">О проекте</h2>
              <dl className="space-y-3 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                {item.client_name && (
                  <MetaRow icon={Building2} label="Клиент" value={item.client_name} />
                )}
                {item.industry && (
                  <MetaRow icon={Tag} label="Отрасль" value={item.industry} />
                )}
                {item.location && (
                  <MetaRow icon={MapPin} label="Город" value={item.location} />
                )}
                {item.year && (
                  <MetaRow icon={Calendar} label="Год" value={String(item.year)} />
                )}
                {item.category_label && (
                  <MetaRow
                    icon={Layers}
                    label="Категория"
                    value={item.category_label}
                  />
                )}
                {/* Если ни одно поле не задано — оставим заголовок,
                    но покажем подсказку, чтобы карточка не выглядела
                    битой. */}
                {!item.client_name &&
                  !item.industry &&
                  !item.location &&
                  !item.year &&
                  !item.category_label && (
                    <p className="text-sm text-neutral-500">
                      Подробности проекта — в описании ниже.
                    </p>
                  )}
              </dl>

              <Link
                href="/portfolio"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
              >
                ← Все работы
              </Link>
            </aside>
          </div>

          {item.description && (
            <article className="prose prose-neutral mt-12 max-w-3xl">
              {item.description.split(/\n{2,}/).map((paragraph, idx) => (
                <p key={idx} className="whitespace-pre-line">
                  {paragraph.trim()}
                </p>
              ))}
            </article>
          )}

          {extraImages.length > 0 && (
            <div className="mt-12">
              <h2 className="mb-6 text-2xl font-black text-brand-dark">
                Ещё фото проекта
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {extraImages.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-md"
                  >
                    <Image
                      src={asset(src)}
                      alt={`${item.title} — фото ${i + 2}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <CtaSection
        title="Хотим такое же — даже лучше"
        subtitle="Опишите задачу — пришлём расчёт и фотомонтаж в течение часа."
      />
    </main>
  )
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </dt>
        <dd className="text-sm font-medium text-brand-dark">{value}</dd>
      </div>
    </div>
  )
}
