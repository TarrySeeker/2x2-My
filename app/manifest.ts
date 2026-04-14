import type { MetadataRoute } from "next";
import { asset } from "@/lib/asset";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "2×2 Рекламное агентство",
    short_name: "2×2",
    description: "Полиграфия, наружная реклама и оформление фасадов",
    start_url: asset("/"),
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FF6B00",
    icons: [
      { src: asset("/icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: asset("/icon-512.png"), sizes: "512x512", type: "image/png" },
    ],
  };
}
