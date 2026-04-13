import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/about", "/services", "/portfolio", "/contacts", "/faq"];
  return pages.map((path) => ({
    url: path === "" ? siteUrl : `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
}
