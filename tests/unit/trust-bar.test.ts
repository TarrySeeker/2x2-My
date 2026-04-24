/**
 * @vitest-environment node
 *
 * Unit-тесты для server-обёртки TrustBar.
 * Проверяем нормализацию clients и ранний return null.
 *
 * Server Component возвращает React-element <TrustBarClient ... /> без
 * фактического вызова клиентского компонента — поэтому проверяем
 * `element.props`, а не mock.calls.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ReactElement } from 'react'

const { mockGetSettingValue } = vi.hoisted(() => ({
  mockGetSettingValue: vi.fn(),
}))

vi.mock('@/lib/cms/section-content', () => ({
  getSettingValue: mockGetSettingValue,
  readSectionContent: vi.fn(),
}))

vi.mock('@/components/sections/TrustBarClient', () => ({
  // Помечаем mock-функцией с displayName, чтобы element.type был распознаваем.
  default: function TrustBarClientMock() {
    return null
  },
}))

import TrustBar from '@/components/sections/TrustBar'

beforeEach(() => {
  mockGetSettingValue.mockReset()
})

interface ClientProps {
  text: string
  clients: Array<{ name: string; logo?: string }>
}

async function renderServer(): Promise<ReactElement<ClientProps> | null> {
  return (await TrustBar()) as ReactElement<ClientProps> | null
}

describe('TrustBar (server)', () => {
  it('возвращает null, когда БД недоступна (fallback {text:"", clients:[]})', async () => {
    mockGetSettingValue.mockResolvedValueOnce({ text: '', clients: [] })
    const out = await renderServer()
    expect(out).toBeNull()
  })

  it('возвращает null, когда clients — не массив', async () => {
    mockGetSettingValue.mockResolvedValueOnce({ text: 'привет', clients: 'broken' })
    const out = await renderServer()
    expect(out).toBeNull()
  })

  it('возвращает null, когда после фильтрации в clients не осталось валидных записей', async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      text: 'Нам доверяют',
      clients: [
        null,
        {},
        { name: '' },
        { name: '   ' },
        { logo: '/x.svg' }, // без name
      ],
    })
    const out = await renderServer()
    expect(out).toBeNull()
  })

  it('возвращает null, если БД вернула null/undefined целиком', async () => {
    mockGetSettingValue.mockResolvedValueOnce(null)
    const out = await renderServer()
    expect(out).toBeNull()
  })

  it('передаёт нормализованные клиенты в TrustBarClient (пилюля без logo + с logo)', async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      text: '  Нам доверяют  ',
      clients: [
        { name: 'ВТБ' },
        { name: 'Брусника', logo: '/clients/brusnika.svg' },
        { name: '  Pirelli  ', logo: '' },
      ],
    })
    const out = await renderServer()
    expect(out).not.toBeNull()
    expect(out?.props.text).toBe('Нам доверяют')
    expect(out?.props.clients).toEqual([
      { name: 'ВТБ', logo: undefined },
      { name: 'Брусника', logo: '/clients/brusnika.svg' },
      { name: 'Pirelli', logo: undefined },
    ])
  })

  it('передаёт пустой text, если его нет в БД', async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      clients: [{ name: 'ВТБ' }],
    })
    const out = await renderServer()
    expect(out?.props.text).toBe('')
    expect(out?.props.clients).toHaveLength(1)
  })

  it('сохраняет порядок клиентов из БД (append/move в админке сохраняется как массив)', async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      text: 'Клиенты',
      clients: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
    })
    const out = await renderServer()
    expect(out?.props.clients.map((c) => c.name)).toEqual(['A', 'B', 'C'])
  })
})
