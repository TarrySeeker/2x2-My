export type PortfolioItem = {
  _id: string
  title: string
  slug: string
  category: string
  /** Текст на плашке; если нет — показывается category */
  badgeLabel?: string
  description: string
  imageUrl: string
  publishedAt: string
}
