import Image from 'next/image'
import Link from 'next/link'
import ServicesHero from '@/components/sections/services/ServicesHero'
import AnimatedSection from '@/components/ui/AnimatedSection'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { readPageSectionContent } from '@/lib/cms/page-section-content'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'
import { blogStarters } from '@/content/blog-starters'
import { getPublishedBlogPosts } from '@/lib/data/blog'
import type { BlogPost } from '@/types'
import { SITE, absoluteUrl } from '@/lib/seo/site'

// CMS-driven hero. Список постов теперь читаем из `blog_posts` через
// `getPublishedBlogPosts()` (см. lib/data/blog.ts). Если БД пустая или
// недоступна — fallback на `content/blog-starters.ts`, чтобы страница
// никогда не была пустой даже при сбое БД.
export const dynamic = 'force-dynamic'

export const generateMetadata = makeGenerateMetadata({
  path: '/blog',
  fallback: {
    // Title 47 символов; добавляется ` | 2х2` из layout → итог 53 символов.
    title: 'Блог о рекламе, вывесках и полиграфии в ХМАО',
    description:
      'Статьи о наружной рекламе, вывесках, полиграфии и оформлении фасадов. Цены, требования ХМАО, практические гайды от рекламной компании «2х2» в Ханты-Мансийске.',
    keywords: [
      'блог о рекламе',
      'статьи о вывесках',
      'наружная реклама ханты-мансийск',
      'как выбрать вывеску',
      'сколько стоит вывеска',
      'требования к рекламным конструкциям хмао',
    ],
  },
})

/**
 * Унифицированный shape карточки превью блога — собран либо из БД-row
 * `blog_posts`, либо из стартера `BlogStarter`. Локальный, чтобы
 * не размазывать типы по нескольким файлам.
 */
type BlogCard = {
  slug: string
  title: string
  excerpt: string
  coverUrl: string
  readTimeMin: number
  publishedAt: string | null
}

const FALLBACK_COVER = 'https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?w=1600'

function fromBlogPost(p: BlogPost): BlogCard {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt ?? '',
    coverUrl: p.cover_image_url || FALLBACK_COVER,
    // reading_time лежит в БД как nullable int; если нет — оценим в 5 мин.
    readTimeMin: p.reading_time ?? 5,
    publishedAt: p.published_at ?? p.updated_at ?? null,
  }
}

function fromStarter(s: (typeof blogStarters)[number]): BlogCard {
  return {
    slug: s.slug,
    title: s.title,
    excerpt: s.excerpt,
    coverUrl: s.coverUrl,
    readTimeMin: s.readTimeMin,
    publishedAt: null,
  }
}

function buildBlogListJsonLd(cards: BlogCard[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE.url}/blog#blog`,
    name: 'Блог рекламной компании «2х2»',
    description:
      'Гайды, кейсы и цены на наружную рекламу, вывески и полиграфию в Ханты-Мансийске и ХМАО.',
    url: absoluteUrl('/blog'),
    inLanguage: SITE.language,
    publisher: { '@id': `${SITE.url}/#organization` },
    blogPost: cards.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: absoluteUrl(`/blog/${post.slug}`),
      image: post.coverUrl,
      datePublished: post.publishedAt ?? '2026-02-01',
      author: { '@type': 'Organization', name: SITE.name },
    })),
  }
}

export default async function BlogPage() {
  const heroCms = await readPageSectionContent('/blog', 'hero', 'hero')

  // Источник истины: БД. Если пусто — fallback на статические стартеры,
  // чтобы страница не уходила в ноль (защита от пустой БД и от сбоя).
  const dbPosts = await getPublishedBlogPosts()
  const cards: BlogCard[] =
    dbPosts.length > 0
      ? dbPosts.map(fromBlogPost)
      : blogStarters.map(fromStarter)

  return (
    <main>
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Блог', url: '/blog' },
          ]),
          buildBlogListJsonLd(cards),
        ]}
      />
      <ServicesHero
        badge={heroCms?.content.badge || 'Блог'}
        title={heroCms?.content.title || 'Статьи, гайды и кейсы'}
        description={
          heroCms?.content.description ||
          'Цены, практика и требования к рекламе в Ханты-Мансийске и ХМАО. Материалы от команды «2х2».'
        }
      />

      <section className="bg-white py-16">
        <div className="container">
          <AnimatedSection>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              {cards.map((post) => (
                <article
                  key={post.slug}
                  className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-lg"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100">
                      <Image
                        src={post.coverUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                        unoptimized
                      />
                    </div>
                    <div className="p-6">
                      <div className="mb-3 flex items-center gap-3 text-xs text-neutral-500">
                        <span>{post.readTimeMin} мин чтения</span>
                        <span aria-hidden="true">·</span>
                        <span>Рекламная компания «2х2»</span>
                      </div>
                      <h2 className="font-display text-xl font-bold leading-snug text-brand-dark group-hover:text-brand-orange md:text-2xl">
                        {post.title}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                        {post.excerpt}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange">
                        Читать дальше →
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>
    </main>
  )
}
