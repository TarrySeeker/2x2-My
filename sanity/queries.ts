import { groq } from 'next-sanity'

export const portfolioQuery = groq`
  *[_type == "portfolio"] | order(publishedAt desc) {
    _id,
    title,
    "slug": coalesce(slug.current, ""),
    "category": coalesce(category, "Полиграфия"),
    "description": coalesce(description, ""),
    "imageUrl": coalesce(image.asset->url, ""),
    publishedAt,
  }
`
