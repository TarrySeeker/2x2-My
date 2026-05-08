import type { Metadata, Viewport } from "next";
import { Manrope, Rubik } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AnalyticsScripts from "@/components/analytics/AnalyticsScripts";
import ShopModals from "@/components/shop/modals/ShopModals";
import ShopShell from "@/components/layout/ShopShell";
import CookieBanner from "@/components/shop/CookieBanner";
import PromoPopupBanner from "@/components/shop/PromoPopupBanner";
import {
  JsonLdScript,
  buildLocalBusiness,
  buildOrganization,
  buildWebSite,
  type OrgSocials,
} from "@/lib/seo/json-ld";
import { SITE, absoluteUrl } from "@/lib/seo/site";
import { getOrganization } from "@/lib/cms/organization";
import { getSettingValue } from "@/lib/data/settings";
import { ThemeProvider } from "@/providers/theme-provider";
import { ToastProvider } from "@/providers/toast-provider";
import UiStringsProviderServer from "@/features/cms/UiStringsProviderServer";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const yandexVerification = process.env.NEXT_PUBLIC_YANDEX_VERIFICATION;

/**
 * Root metadata: читает site_settings.organization из БД (slogan,
 * description, short_description, name, short_name, og_image, locale)
 * и подставляет в OpenGraph / Twitter / SEO. При недоступной БД
 * fallback на константы из `lib/seo/site.ts` (см. `getOrganization`).
 *
 * Из-за async-чтения экспортируется как `generateMetadata`, а не
 * `metadata`. Title.default остаётся hardcoded — это title главной
 * (страничный CMS-override происходит в app/page.tsx через
 * makeGenerateMetadata({ path: '/' })).
 */
export async function generateMetadata(): Promise<Metadata> {
  const org = await getOrganization();
  const ogImageUrl = absoluteUrl(org.og_image || SITE.ogImage);

  return {
    metadataBase: new URL(SITE.url),
    title: {
      // Title главной — укорочён с 87 до 65 символов (вписывается в SERP-обрезку
      // Google/Yandex ~60-70 символов). Раньше: «Рекламная компания 2х2 —
      // полиграфия, вывески, наружная реклама в Ханты-Мансийске».
      default:
        "2х2 Ханты-Мансийск — реклама, печать, вывески и фасады",
      // Шаблон укорочён с " | %s Ханты-Мансийск" (24 символа suffix) до
      // " | 2х2" (6 символов). Это убирает «дубль бренда» в SERP, когда
      // page-title уже содержит «2х2» / «Ханты-Мансийск» (аудит 2026-05-06).
      // Город указывается на самих страницах через page_metadata.title в БД.
      template: `%s | ${org.short_name}`,
    },
    description: org.description,
    keywords: org.keywords_global,
    applicationName: org.name,
    authors: [{ name: org.name }],
    creator: org.short_name,
    publisher: org.name,
    category: "business",
    openGraph: {
      type: "website",
      locale: org.locale,
      url: SITE.url,
      siteName: org.name,
      // OG-title укорочён до 55 символов (Telegram/VK обрезают ≤ 60 для
      // превью). Был 87 символов — обрезался посередине слова.
      title: "2х2 Ханты-Мансийск — реклама, печать, вывески и фасады",
      description: org.description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${org.name} — ${org.slogan}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${org.name} — Ханты-Мансийск`,
      description: org.short_description,
      images: [ogImageUrl],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: SITE.url,
      languages: { "ru-RU": SITE.url, "x-default": SITE.url },
    },
    verification: {
      ...(googleVerification ? { google: googleVerification } : {}),
      ...(yandexVerification ? { yandex: yandexVerification } : {}),
    },
    formatDetection: { telephone: true, email: true, address: true },
    // icons подхватываются автоматически из app/icon.svg, app/apple-icon.png, app/favicon.ico
  };
}

/**
 * Viewport: themeColor для prefers-color-scheme: light/dark.
 * Брендовый organization.theme_color (#FF6600) используется в JSON-LD
 * и админке, но не для themeColor мета-тега — там нужны фоновые цвета,
 * соответствующие реальному фону сайта (FAFAFA / 09090B).
 *
 * Если в будущем понадобится ставить org.theme_color в light-варианте —
 * заменить на `generateViewport()` async и читать `getOrganization()`.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
  ],
  colorScheme: "dark light",
};

// Архитектурное решение: проект массово CMS-driven. Header, Footer,
// UiStringsProviderServer (всё в RootLayout), а также все top-level
// страницы (главная, услуги, портфолио, о компании, контакты, FAQ,
// калькулятор, блог, админка) делают server-side SQL-запросы в Postgres.
//
// При `next build` в Docker DATABASE_URL=...placeholder... → SSG-prerender
// зависает на 60с per worker × 45 страниц = 30+ минут. Workaround
// `--network app-network` ломает воспроизводимость и BuildKit.
//
// Корректное решение: вся витрина — dynamic. Кеширование — через
// unstable_cache (60s) внутри data-layer (lib/data/*) и встроенный
// fetch-cache Next.js. Это даёт похожую скорость без проблем сборки.
//
// Когда контент перестанет меняться часто — можно вернуться к ISR на
// per-page основе (revalidate=600), при условии что DATABASE_URL на build
// будет указывать на реальную dev-БД (например, через docker compose
// run --network app-network) или внешний read-replica.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CMS-driven Organization data: подставляется в JSON-LD Organization /
  // LocalBusiness / WebSite. При недоступной БД — fallback на SITE/BUSINESS.
  const org = await getOrganization();
  // Socials из site_settings.socials → JSON-LD Organization.sameAs.
  // Раньше hardcoded CONTACTS.vk → отдавал нерабочий vk.com/ra2x2_hmao.
  // Если в админке поле пустое — sameAs не включается в JSON-LD вообще
  // (см. buildSameAs() в lib/seo/json-ld.tsx).
  const socials = await getSettingValue<OrgSocials>("socials", {});
  return (
    <html
      lang={org.language || "ru"}
      className={`${manrope.variable} ${rubik.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen min-w-0 flex-col">
        <ThemeProvider>
          <UiStringsProviderServer>
            <ShopShell>
              <Header />
              <PromoPopupBanner />
              <JsonLdScript
                data={[
                  buildOrganization(org, socials),
                  buildLocalBusiness(org),
                  buildWebSite(org),
                ]}
              />
            </ShopShell>
            <div className="flex-1">{children}</div>
            <ShopShell>
              <Footer />
              <ShopModals />
              <CookieBanner />
            </ShopShell>
            <ToastProvider />
            <AnalyticsScripts />
          </UiStringsProviderServer>
        </ThemeProvider>
      </body>
    </html>
  );
}
