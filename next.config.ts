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
        images: {
          formats: ["image/avif", "image/webp"],
          remotePatterns: [
            // Демо-картинки (для seed-данных и preview).
            {
              protocol: "https",
              hostname: "images.unsplash.com",
            },
            // Self-hosted MinIO в dev (compose.dev.yml).
            {
              protocol: "http",
              hostname: "localhost",
              port: "9000",
            },
            // Production: Timeweb Cloud Object Storage.
            {
              protocol: "https",
              hostname: "*.s3.timeweb.cloud",
            },
            // Production: MinIO под собственным доменом media.<DOMAIN>.
            {
              protocol: "https",
              hostname: "media.*",
            },
          ],
        },
      }),
};

export default nextConfig;
