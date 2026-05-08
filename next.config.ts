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
          // chore(calculator) 2026-04-27 — /calculator также удалён:
          // все услуги по индивидуальному расчёту через QuoteModal.
          return [
            { source: "/catalog", destination: "/services", permanent: true },
            { source: "/catalog/:path*", destination: "/services", permanent: true },
            { source: "/product/:path*", destination: "/services", permanent: true },
            { source: "/calculator", destination: "/services", permanent: true },
            // 2026-05-08: опечатка 'pechtat' в slug блог-поста.
            // db/migrations/034_fix_blog_slug.sql переименовывает в БД,
            // редирект 308 сохраняет SEO-вес внешних ссылок и закладок.
            {
              source: "/blog/operativnaya-pechtat-vs-ofsetnaya-chto-vybrat",
              destination: "/blog/operativnaya-pechat-vs-ofsetnaya-chto-vybrat",
              permanent: true,
            },
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
            // Резерв под staging того же стека (явный хост, без wildcard —
            // защита от подмены через произвольные поддомены).
            {
              protocol: "https",
              hostname: "staging.erfgv.website",
            },
            // Self-hosted MinIO в dev (compose.dev.yml).
            {
              protocol: "http",
              hostname: "localhost",
              port: "9000",
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
