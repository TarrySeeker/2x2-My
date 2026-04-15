import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/studio/",
          "/api/",
          "/cart",
          "/checkout",
          "/wishlist",
          "/search",
          "/_next/",
        ],
      },
      // Явно разрешаем Яндексу — главный поисковик в РФ
      {
        userAgent: "Yandex",
        allow: "/",
        disallow: ["/admin/", "/studio/", "/api/", "/cart", "/checkout", "/wishlist"],
      },
      // GPTBot/CCBot — для LLM-краулеров закрываем (опционально)
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl.replace(/^https?:\/\//, ""),
  };
}
