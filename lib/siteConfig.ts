/** Базовый URL сайта (прод: задать NEXT_PUBLIC_SITE_URL на Vercel). */
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://2x2agency.ru'
).replace(/\/$/, '')
