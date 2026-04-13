import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
