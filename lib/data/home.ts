import "server-only";

import { sql } from "@/lib/db/client";
import type { Banner } from "@/types";

export interface HomeHeroContent {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

const HERO_FALLBACK: HomeHeroContent = {
  title: "Реклама, которая работает",
  subtitle: "Полиграфия, наружная реклама и оформление фасадов — под ключ в ХМАО и ЯНАО.",
  ctaLabel: "Рассчитать стоимость",
  ctaHref: "/contacts",
};

/**
 * Возвращает контент hero-секции главной.
 */
export async function getHomeHero(): Promise<HomeHeroContent> {
  try {
    const rows = await sql<{ value: unknown }[]>`
      SELECT value
      FROM settings
      WHERE key = 'home.hero'
      LIMIT 1
    `;
    if (rows.length === 0) return HERO_FALLBACK;
    return (rows[0]?.value as HomeHeroContent) ?? HERO_FALLBACK;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getHomeHero] DB request failed, using fallback:", err);
    }
    return HERO_FALLBACK;
  }
}

/**
 * Активные промо-баннеры главной (банер в секции PromotionsSection).
 * Fallback — пустой массив, секция сама рендерит статический контент.
 */
export async function getHomeBanners(): Promise<Banner[]> {
  try {
    const rows = await sql<Banner[]>`
      SELECT *
      FROM banners
      WHERE is_active = true
        AND position = 'home.promo'
      ORDER BY sort_order ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getHomeBanners] DB request failed:", err);
    }
    return [];
  }
}
