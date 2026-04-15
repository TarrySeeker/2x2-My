import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";
import { getCategories } from "@/lib/data/categories";
import { getProducts } from "@/lib/data/products";
import { getPortfolio } from "@/lib/data/portfolio";
import { blogStarters } from "@/content/blog-starters";
import { servicesTeasers } from "@/content/home";

export const revalidate = 3600; // пересборка sitemap раз в час

type Entry = MetadataRoute.Sitemap[number];

const now = new Date();

const STATIC_PAGES: Array<{ path: string; priority: number; changeFreq: Entry["changeFrequency"] }> = [
  { path: "",           priority: 1.0, changeFreq: "weekly"  },
  { path: "/about",     priority: 0.7, changeFreq: "monthly" },
  { path: "/catalog",   priority: 0.9, changeFreq: "weekly"  },
  { path: "/services",  priority: 0.9, changeFreq: "weekly"  },
  { path: "/portfolio", priority: 0.8, changeFreq: "weekly"  },
  { path: "/blog",      priority: 0.7, changeFreq: "weekly"  },
  { path: "/contacts",  priority: 0.6, changeFreq: "monthly" },
  { path: "/delivery",  priority: 0.5, changeFreq: "monthly" },
  { path: "/faq",       priority: 0.5, changeFreq: "monthly" },
  { path: "/calculator",priority: 0.7, changeFreq: "monthly" },
  { path: "/privacy",   priority: 0.2, changeFreq: "yearly"  },
  { path: "/oferta",    priority: 0.2, changeFreq: "yearly"  },
  { path: "/consent",   priority: 0.2, changeFreq: "yearly"  },
];

function abs(path: string): string {
  if (!path || path === "/") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: Entry[] = STATIC_PAGES.map((p) => ({
    url: abs(p.path),
    lastModified: now,
    changeFrequency: p.changeFreq,
    priority: p.priority,
  }));

  // Категории (Supabase, fallback = пусто)
  const categories = await getCategories();
  for (const c of categories) {
    entries.push({
      url: abs(`/catalog/${c.slug}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // Если Supabase не настроен — подстрахуемся из content/home.ts
  if (categories.length === 0) {
    for (const s of servicesTeasers) {
      entries.push({
        url: abs(s.href),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // Товары / услуги
  const products = await getProducts({ per_page: 500 });
  for (const p of products) {
    const updated = (p as { updated_at?: string }).updated_at;
    entries.push({
      url: abs(`/product/${p.slug}`),
      lastModified: updated ? new Date(updated) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Портфолио — страница списка уже в STATIC_PAGES; добавляем детальные
  // только если роут /portfolio/[slug] реально существует (D-012: пока
  // используется Lightbox на /portfolio, детальных страниц нет).
  // Оставляем закомментированным до появления детальной страницы.
  // const works = await getPortfolio();
  // for (const w of works) {
  //   entries.push({
  //     url: abs(`/portfolio/${w.slug}`),
  //     lastModified: w.published_at ? new Date(w.published_at) : now,
  //     changeFrequency: "monthly",
  //     priority: 0.5,
  //   });
  // }
  // Чтобы линтер не жаловался на неиспользуемый импорт — держим в тени.
  void getPortfolio;

  // Блог: стартовые статьи из TS-модуля (пока нет таблицы blog_posts)
  for (const post of blogStarters) {
    entries.push({
      url: abs(`/blog/${post.slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
