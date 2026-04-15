import { ImageResponse } from 'next/og'
import { blogStarters } from '@/content/blog-starters'

export const runtime = 'edge'
export const alt = 'Статья блога «2х2»'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

type Params = { slug: string }

export default async function BlogOgImage({
  params,
}: {
  params: Promise<Params>
}) {
  const { slug } = await params
  const post = blogStarters.find((p) => p.slug === slug)
  const title = post?.title ?? 'Статья блога «2х2»'
  const readMin = post?.readTimeMin ?? 5

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(ellipse at top right, rgba(255,107,0,0.3), transparent 60%), #09090B',
          padding: '72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#FAFAFA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: '#FF6600',
              fontSize: 32,
              fontWeight: 900,
              color: 'white',
            }}
          >
            2×2
          </div>
          <div
            style={{
              fontSize: 22,
              color: 'rgba(250,250,250,0.7)',
              fontWeight: 600,
            }}
          >
            БЛОГ · Рекламная компания «2х2»
          </div>
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            maxWidth: '1000px',
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: 'rgba(250,250,250,0.6)',
          }}
        >
          <span>{readMin} мин чтения · Ханты-Мансийск · ХМАО</span>
          <span style={{ color: '#FF6600', fontWeight: 700 }}>
            2x2agency.ru
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
