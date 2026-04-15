import "server-only";

import { createClient } from "@/lib/supabase/server";
import { trySupabase } from "@/lib/data/try-supabase";
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
 * Этап 1: hero статичен в HeroYna/HeroSection, этот fetcher — заготовка
 * для будущего CMS-управления (Этап 6 admin/content).
 */
export async function getHomeHero(): Promise<HomeHeroContent> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "home.hero")
        .maybeSingle();
      if (error) throw error;
      if (!data) return HERO_FALLBACK;
      const row = data as { value: unknown } | null;
      return (row?.value as HomeHeroContent) ?? HERO_FALLBACK;
    },
    HERO_FALLBACK,
    "getHomeHero",
  );
}

/**
 * Активные промо-баннеры главной (банер в секции PromotionsSection).
 * Fallback — пустой массив, секция сама рендерит статический контент.
 */
export async function getHomeBanners(): Promise<Banner[]> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .eq("position", "home.promo")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
    [],
    "getHomeBanners",
  );
}
