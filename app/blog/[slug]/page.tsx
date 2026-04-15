import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AnimatedSection from '@/components/ui/AnimatedSection'
import SimpleMarkdown from '@/components/blog/SimpleMarkdown'
import CtaSection from '@/components/sections/CtaSection'
import { buildMetadata } from '@/lib/seo/metadata'
import {
  JsonLdScript,
  buildArticle,
  buildBreadcrumbList,
} from '@/lib/seo/json-ld'
import { blogStarters, type BlogStarter } from '@/content/blog-starters'

export const revalidate = 3600

type Params = { slug: string }

export function generateStaticParams(): Params[] {
  return blogStarters.map((post) => ({ slug: post.slug }))
}

function findPost(slug: string): BlogStarter | undefined {
  return blogStarters.find((p) => p.slug === slug)
}

// Разнесённые даты публикации стартовых статей (Feb–Apr 2026).
// Совпадают с `seed.sql` blog_posts.published_at — источник истины
// до появления dynamic БД-роута.
const PUBLISHED_AT: Record<string, string> = {
  'skolko-stoit-vyveska-v-khanty-mansijske-2026': '2026-02-12',
  'kak-vybrat-vyvesku-dlya-magazina-7-voprosov': '2026-02-26',
  'trebovaniya-k-reklamnym-konstrukciyam-v-khanty-mansijske': '2026-03-14',
  'svetovye-bukvy-ili-korob-chto-luchshe': '2026-03-28',
  'brending-transporta-primery-iz-yugry': '2026-04-08',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const post = findPost(slug)
  if (!post) {
    return buildMetadata({
      title: 'Статья не найдена',
      description: 'Запрошенная статья блога не найдена.',
      path: `/blog/${slug}`,
      noindex: true,
    })
  }

  const publishedAt = PUBLISHED_AT[post.slug] ?? '2026-02-01'

  return buildMetadata({
    title: post.seoTitle,
    description: post.seoDescription,
    path: `/blog/${post.slug}`,
    image: post.coverUrl,
    type: 'article',
    keywords: post.seoKeywords.split(',').map((k) => k.trim()),
    publishedTime: publishedAt,
    modifiedTime: publishedAt,
    authorName: 'Рекламная компания «2х2»',
  })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const post = findPost(slug)
  if (!post) notFound()

  const publishedAt = PUBLISHED_AT[post.slug] ?? '2026-02-01'
  const publishedHuman = new Date(publishedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const related = blogStarters.filter((p) => p.slug !== post.slug).slice(0, 3)

  return (
    <main>
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Блог', url: '/blog' },
            { name: post.title, url: `/blog/${post.slug}` },
          ]),
          buildArticle({
            title: post.title,
            slug: post.slug,
            description: post.excerpt,
            image: post.coverUrl,
            datePublished: publishedAt,
            dateModified: publishedAt,
            authorName: 'Рекламная компания «2х2»',
            readTimeMin: post.readTimeMin,
          }),
        ]}
      />

      <article>
        <header className="relative overflow-hidden bg-brand-dark pt-32 pb-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.1),transparent_50%)]" />
          <div className="container relative z-10">
            <AnimatedSection>
              <nav
                aria-label="Хлебные крошки"
                className="mb-6 text-sm text-gray-400"
              >
                <Link href="/" className="hover:text-white">
                  Главная
                </Link>
                <span className="mx-2">/</span>
                <Link href="/blog" className="hover:text-white">
                  Блог
                </Link>
                <span className="mx-2">/</span>
                <span className="text-white">{post.title}</span>
              </nav>
              <h1 className="mb-6 max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                <time dateTime={publishedAt}>{publishedHuman}</time>
                <span aria-hidden="true">·</span>
                <span>{post.readTimeMin} мин чтения</span>
                <span aria-hidden="true">·</span>
                <span>Рекламная компания «2х2»</span>
              </div>
            </AnimatedSection>
          </div>
        </header>

        <section className="bg-white py-16">
          <div className="container">
            <div className="mx-auto max-w-3xl">
              <AnimatedSection>
                <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-2xl bg-neutral-100">
                  <Image
                    src={post.coverUrl}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                    priority
                    unoptimized
                  />
                </div>
                <p className="mb-8 text-lg leading-relaxed text-neutral-600">
                  {post.excerpt}
                </p>
                <SimpleMarkdown source={post.content} />
              </AnimatedSection>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section className="bg-neutral-50 py-16">
            <div className="container">
              <AnimatedSection>
                <h2 className="mb-8 text-center font-display text-2xl font-bold text-brand-dark md:text-3xl">
                  Читайте также
                </h2>
                <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
                  {related.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/blog/${p.slug}`}
                      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100">
                        <Image
                          src={p.coverUrl}
                          alt={p.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                          unoptimized
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-base font-semibold leading-snug text-brand-dark group-hover:text-brand-orange">
                          {p.title}
                        </h3>
                        <p className="mt-2 text-xs text-neutral-500">
                          {p.readTimeMin} мин чтения
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </section>
        )}
      </article>

      <CtaSection
        title="Готовы обсудить ваш проект?"
        subtitle="Замеры и фотомонтаж — в подарок. Ответим в течение часа в рабочее время."
      />
    </main>
  )
}
