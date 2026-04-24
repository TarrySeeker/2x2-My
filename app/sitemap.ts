import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";
import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { getPortfolio } from "@/lib/data/portfolio";
import { getPublishedBlogPostsForSitemap } from "@/lib/data/blog";
import { blogStarters } from "@/content/blog-starters";

export const revalidate = 3600; // пересборка sitemap раз в час

type Entry = MetadataRoute.Sitemap[number];

/**
 * Статические маршруты, которые реально существуют в `app/*`.
 * Правки — руками при добавлении нового роута. Не тянем сюда
 * страницы, у которых нет файла (`/delivery`, `/oferta`, `/consent`
 * убраны — на этапе 3 их ещё нет в `app/`).
 */
const STATIC_PAGES: Array<{
  path: string;
  priority: number;
  changeFreq: Entry["changeFrequency"];
}> = [
  { path: "",           priority: 1.0, changeFreq: "weekly"  },
  { path: "/about",     priority: 0.7, changeFreq: "monthly" },
  { path: "/catalog",   priority: 0.9, changeFreq: "weekly"  },
  { path: "/services",  priority: 0.9, changeFreq: "weekly"  },
  { path: "/portfolio", priority: 0.8, changeFreq: "weekly"  },
  { path: "/blog",      priority: 0.7, changeFreq: "weekly"  },
  { path: "/contacts",  priority: 0.6, changeFreq: "monthly" },
  { path: "/faq",       priority: 0.5, changeFreq: "monthly" },
  { path: "/calculator",priority: 0.7, changeFreq: "monthly" },
  { path: "/privacy",   priority: 0.2, changeFreq: "yearly"  },
];

function abs(path: string): string {
  if (!path || path === "/") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function toDate(value: string | Date | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: Entry[] = STATIC_PAGES.map((p) => ({
    url: abs(p.path),
    lastModified: now,
    changeFrequency: p.changeFreq,
    priority: p.priority,
  }));

  // ── Категории каталога ──
  // Источник: Supabase `categories` (только is_active). Fallback — пусто.
  // NB: статических страниц «услуг» из content/home.ts сюда НЕ добавляем:
  // `/services` уже в STATIC_PAGES, а служебные `servicesTeasers` не имеют
  // отдельных роутов (`/catalog/<slug>` формируется из таблицы categories).
  try {
    const categories = await getCategories();
    for (const c of categories) {
      entries.push({
        url: abs(`/catalog/${c.slug}`),
        lastModified: toDate(
          (c as { updated_at?: string | Date | null }).updated_at,
          now,
        ),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sitemap] getCategories failed:", err);
    }
  }

  // ── Товары / услуги ──
  // Источник: products (status='active'). При ошибке БД — пустой список,
  // sitemap не падает.
  try {
    const products = await getProducts({ per_page: 500 });
    for (const p of products) {
      const updated = (p as { updated_at?: string | Date | null }).updated_at;
      entries.push({
        url: abs(`/product/${p.slug}`),
        lastModified: toDate(updated, now),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sitemap] getProducts failed:", err);
    }
  }

  // ── Портфолио ──
  // Сейчас карточек /portfolio/[slug] нет (D-012: lightbox на /portfolio).
  // Импорт сохранён ради будущего — чтобы не забыть при появлении роута.
  // Когда появится /portfolio/[slug], раскомментировать блок ниже.
  void getPortfolio;
  // try {
  //   const works = await getPortfolio();
  //   for (const w of works) {
  //     entries.push({
  //       url: abs(`/portfolio/${w.slug}`),
  //       lastModified: toDate(w.updated_at, now),
  //       changeFrequency: "monthly",
  //       priority: 0.5,
  //     });
  //   }
  // } catch (err) { /* silent */ }

  // ── Блог ──
  // 1) Основной источник — таблица `blog_posts` (status='published').
  // 2) Fallback — стартовые статьи из content/blog-starters.ts
  //    (они же сидятся в БД, но в dev/SSG без БД нужен запасной вариант,
  //    чтобы sitemap не терял статьи и sitemap.xml оставался валидным).
  let blogAdded = false;
  try {
    const posts = await getPublishedBlogPostsForSitemap();
    if (posts.length > 0) {
      for (const post of posts) {
        entries.push({
          url: abs(`/blog/${post.slug}`),
          lastModified: toDate(post.updated_at ?? post.published_at, now),
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }
      blogAdded = true;
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sitemap] blog fetch failed:", err);
    }
  }

  if (!blogAdded) {
    for (const post of blogStarters) {
      entries.push({
        url: abs(`/blog/${post.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
