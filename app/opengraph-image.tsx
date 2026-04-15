import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Рекламная компания «2х2» — Ханты-Мансийск'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function RootOgImage() {
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
            'radial-gradient(ellipse at top right, rgba(255,107,0,0.35), transparent 60%), radial-gradient(ellipse at bottom left, rgba(245,158,11,0.2), transparent 60%), #09090B',
          padding: '72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#FAFAFA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 84,
              height: 84,
              borderRadius: 20,
              background: '#FF6600',
              fontSize: 48,
              fontWeight: 900,
              color: 'white',
            }}
          >
            2×2
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
              Рекламная компания
            </div>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#FF6600', lineHeight: 1.1 }}>
              «2х2»
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Полиграфия, вывески,
            <br />
            наружная реклама
          </div>
          <div
            style={{
              fontSize: 32,
              color: 'rgba(250,250,250,0.75)',
              fontWeight: 500,
            }}
          >
            Ханты-Мансийск · Сургут · ХМАО-Югра · ЯНАО
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(250,250,250,0.15)',
            paddingTop: 24,
            fontSize: 22,
            color: 'rgba(250,250,250,0.7)',
          }}
        >
          <span>2x2agency.ru</span>
          <span style={{ color: '#FF6600', fontWeight: 700 }}>
            2х2 — потому что с нами просто!
          </span>
        </div>
      </div>
    ),
    { ...size },
  )
}
