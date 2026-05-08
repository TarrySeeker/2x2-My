import type { MetadataRoute } from "next";
import { asset } from "@/lib/asset";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Рекламная компания 2х2 — Ханты-Мансийск",
    short_name: "2х2",
    description:
      "Полиграфия, наружная реклама, вывески, световые буквы и фасады под ключ в Ханты-Мансийске и ХМАО.",
    start_url: asset("/"),
    scope: asset("/"),
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090B",
    theme_color: "#FF6600",
    lang: "ru-RU",
    dir: "ltr",
    categories: ["business", "shopping", "productivity"],
    icons: [
      // Реальные файлы лежат в /public как android-chrome-*.
      // Раньше тут были /icon-192.png и /icon-512.png — они никогда
      // не существовали, манифест ссылался в пустоту (2026-05-08 фикс).
      { src: asset("/android-chrome-192x192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: asset("/android-chrome-512x512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/android-chrome-512x512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
