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
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
