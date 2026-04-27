import type { NextConfig } from "next";
import path from "path";

const isStaticExport = process.env.BUILD_STATIC === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // D-044 — standalone для Docker-деплоя на Timeweb VPS.
  // При статическом экспорте (GitHub Pages preview) переключаемся через env.
  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        images: { unoptimized: true },
        ...(basePath ? { basePath, assetPrefix: basePath } : {}),
      }
    : {
        output: "standalone",
        async redirects() {
          // chore(catalog) 2026-04-26 — каталог /catalog и карточки
          // /product/<slug> удалены: сайт продаёт только услуги, всё
          // ушло в /services. Редиректы 308 (permanent) сохраняют
          // SEO-вес внешних ссылок на удалённые страницы.
          return [
            { source: "/catalog", destination: "/services", permanent: true },
            { source: "/catalog/:path*", destination: "/services", permanent: true },
            { source: "/product/:path*", destination: "/services", permanent: true },
          ];
        },
        images: {
          formats: ["image/avif", "image/webp"],
          remotePatterns: [
            // Демо-картинки (для seed-данных и preview).
            {
              protocol: "https",
              hostname: "images.unsplash.com",
            },
            // Production: MinIO через Caddy reverse-proxy на основном домене.
            // Файлы лежат под путём /2x2-media/uploads/... .
            {
              protocol: "https",
              hostname: "erfgv.website",
            },
            // Резерв под staging/альтернативные поддомены того же стека.
            {
              protocol: "https",
              hostname: "staging.erfgv.website",
            },
            {
              protocol: "https",
              hostname: "*.erfgv.website",
            },
            // Self-hosted MinIO в dev (compose.dev.yml).
            {
              protocol: "http",
              hostname: "localhost",
              port: "9000",
            },
            // Backup: Timeweb Cloud Object Storage (если включим в будущем).
            {
              protocol: "https",
              hostname: "*.s3.timeweb.cloud",
            },
            // Yandex Static Maps API — статическая карта-картинка офиса
            // на странице /contacts (см. ContactMap.tsx). Используется
            // вместо iframe-виджета, который блокировался cookie-consent
            // и показывал «Этот контент заблокирован» (правка 2026-04-25).
            {
              protocol: "https",
              hostname: "static-maps.yandex.ru",
            },
          ],
        },
      }),
};

export default nextConfig;
