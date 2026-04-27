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
import { getBlogPostBySlug, getPublishedBlogPosts } from '@/lib/data/blog'
import type { BlogPost } from '@/types'

// Источник истины — `blog_posts` в БД. Фоллбек на `content/blog-starters.ts`
// сохраняем для случаев, когда БД пустая или сбой (страница не должна 404'иться
// для статей, которые исторически жили в статике до подключения БД).
//
// `dynamic = force-dynamic` + `revalidate = 0`: выбор поста идёт по slug
// через `unstable_cache` (60 с) внутри `getBlogPostBySlug` — Next-кеш RSC
// нам тут не нужен, иначе после публикации новой статьи через админку
// пришлось бы ждать TTL вместо `revalidateTag`.
export const dynamic = 'force-dynamic'

type Params = { slug: string }

/**
 * generateStaticParams оставляем синхронным с известными starter'ами —
 * это безопасный bootstrap для билда. Динамические slug'и из БД
 * прекрасно резолвятся через dynamic-route + `dynamicParams=true` (по
 * умолчанию). Полностью убирать generateStaticParams нельзя, иначе
 * Next жалуется на отсутствие prerender для статически известных URL.
 */
export function generateStaticParams(): Params[] {
  return blogStarters.map((post) => ({ slug: post.slug }))
}

// Карта дат публикации для starter'ов (когда статья отдаётся как
// fallback из статики, но в БД её ещё нет). Если статья пришла из БД,
// дата берётся из `published_at` / `updated_at`.
const STARTER_PUBLISHED_AT: Record<string, string> = {
  'skolko-stoit-vyveska-v-khanty-mansijske-2026': '2026-02-12',
  'kak-vybrat-vyvesku-dlya-magazina-7-voprosov': '2026-02-26',
  'trebovaniya-k-reklamnym-konstrukciyam-v-khanty-mansijske': '2026-03-14',
  'svetovye-bukvy-ili-korob-chto-luchshe': '2026-03-28',
  'brending-transporta-primery-iz-yugry': '2026-04-08',
}

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?w=1600'

/**
 * Унифицированный shape статьи для рендера: либо из БД, либо из starter'а.
 */
type Article = {
  slug: string
  title: string
  excerpt: string
  content: string
  coverUrl: string
  readTimeMin: number
  seoTitle: string
  seoDescription: string
  seoKeywords: string[]
  publishedAt: string
}

function fromBlogPost(p: BlogPost): Article {
  const publishedAt =
    p.published_at ?? p.updated_at ?? p.created_at ?? new Date().toISOString()
  const keywords = (p.seo_keywords ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? '',
    content: p.content ?? '',
    coverUrl: p.cover_image_url || FALLBACK_COVER,
    readTimeMin: p.reading_time ?? 5,
    seoTitle: p.seo_title ?? p.title,
    seoDescription: p.seo_description ?? p.excerpt ?? '',
    seoKeywords: keywords,
    publishedAt,
  }
}

function fromStarter(s: BlogStarter): Article {
  return {
    slug: s.slug,
    title: s.title,
    excerpt: s.excerpt,
    content: s.content,
    coverUrl: s.coverUrl,
    readTimeMin: s.readTimeMin,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    seoKeywords: s.seoKeywords.split(',').map((k) => k.trim()).filter(Boolean),
    publishedAt: STARTER_PUBLISHED_AT[s.slug] ?? '2026-02-01',
  }
}

/**
 * Главный резолвер: сначала пробуем БД, затем — статические starter'ы.
 * Возвращает `null`, если статьи нет ни там, ни там.
 */
async function resolveArticle(slug: string): Promise<Article | null> {
  const dbPost = await getBlogPostBySlug(slug)
  if (dbPost) return fromBlogPost(dbPost)
  const starter = blogStarters.find((p) => p.slug === slug)
  return starter ? fromStarter(starter) : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>
}): Promise<Metadata> {
  const { slug } = await params
  const article = await resolveArticle(slug)
  if (!article) {
    return buildMetadata({
      title: 'Статья не найдена',
      description: 'Запрошенная статья блога не найдена.',
      path: `/blog/${slug}`,
      noindex: true,
    })
  }

  return buildMetadata({
    title: article.seoTitle,
    description: article.seoDescription,
    path: `/blog/${article.slug}`,
    image: article.coverUrl,
    type: 'article',
    keywords: article.seoKeywords,
    publishedTime: article.publishedAt,
    modifiedTime: article.publishedAt,
    authorName: 'Рекламная компания «2х2»',
  })
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const article = await resolveArticle(slug)
  if (!article) notFound()

  const publishedHuman = new Date(article.publishedAt).toLocaleDateString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )

  // «Читайте также»: берём свежие посты из БД, исключая текущий.
  // Если БД пустая — fallback на starter'ы (ровно как было).
  const dbPosts = await getPublishedBlogPosts()
  const relatedSource: Array<{
    slug: string
    title: string
    coverUrl: string
    readTimeMin: number
  }> =
    dbPosts.length > 0
      ? dbPosts.map((p) => ({
          slug: p.slug,
          title: p.title,
          coverUrl: p.cover_image_url || FALLBACK_COVER,
          readTimeMin: p.reading_time ?? 5,
        }))
      : blogStarters.map((s) => ({
          slug: s.slug,
          title: s.title,
          coverUrl: s.coverUrl,
          readTimeMin: s.readTimeMin,
        }))

  const related = relatedSource.filter((p) => p.slug !== article.slug).slice(0, 3)

  return (
    <main>
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Блог', url: '/blog' },
            { name: article.title, url: `/blog/${article.slug}` },
          ]),
          buildArticle({
            title: article.title,
            slug: article.slug,
            description: article.excerpt,
            image: article.coverUrl,
            datePublished: article.publishedAt,
            dateModified: article.publishedAt,
            authorName: 'Рекламная компания «2х2»',
            readTimeMin: article.readTimeMin,
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
                <span className="text-white">{article.title}</span>
              </nav>
              <h1 className="mb-6 max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
                <time dateTime={article.publishedAt}>{publishedHuman}</time>
                <span aria-hidden="true">·</span>
                <span>{article.readTimeMin} мин чтения</span>
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
                    src={article.coverUrl}
                    alt={article.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                    priority
                  />
                </div>
                {article.excerpt ? (
                  <p className="mb-8 text-lg leading-relaxed text-neutral-600">
                    {article.excerpt}
                  </p>
                ) : null}
                <SimpleMarkdown source={article.content} />
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
