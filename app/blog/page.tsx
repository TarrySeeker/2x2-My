import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import ServicesHero from '@/components/sections/services/ServicesHero'
import AnimatedSection from '@/components/ui/AnimatedSection'
import { buildMetadata } from '@/lib/seo/metadata'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'
import { blogStarters } from '@/content/blog-starters'
import { SITE, absoluteUrl } from '@/lib/seo/site'

export const revalidate = 3600

export const metadata: Metadata = buildMetadata({
  title: 'Блог о рекламе, вывесках и полиграфии — «2х2» Ханты-Мансийск',
  description:
    'Статьи о наружной рекламе, вывесках, полиграфии и оформлении фасадов. Цены, требования ХМАО, практические гайды от рекламной компании «2х2» в Ханты-Мансийске.',
  path: '/blog',
  keywords: [
    'блог о рекламе',
    'статьи о вывесках',
    'наружная реклама ханты-мансийск',
    'как выбрать вывеску',
    'сколько стоит вывеска',
    'требования к рекламным конструкциям хмао',
  ],
})

function buildBlogListJsonLd() {
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
    blogPost: blogStarters.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: absoluteUrl(`/blog/${post.slug}`),
      image: post.coverUrl,
      datePublished: '2026-02-01',
      author: { '@type': 'Organization', name: SITE.name },
    })),
  }
}

export default function BlogPage() {
  return (
    <main>
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Блог', url: '/blog' },
          ]),
          buildBlogListJsonLd(),
        ]}
      />
      <ServicesHero
        badge="Блог"
        title="Статьи, гайды и кейсы"
        description="Цены, практика и требования к рекламе в Ханты-Мансийске и ХМАО. Материалы от команды «2х2»."
      />

      <section className="bg-white py-16">
        <div className="container">
          <AnimatedSection>
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
              {blogStarters.map((post) => (
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
