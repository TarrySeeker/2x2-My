import type { Metadata, Viewport } from "next";
import { Manrope, Rubik } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/shop/cart/CartDrawer";
import AnalyticsScripts from "@/components/analytics/AnalyticsScripts";
import ShopModals from "@/components/shop/modals/ShopModals";
import {
  JsonLdScript,
  buildLocalBusiness,
  buildOrganization,
  buildWebSite,
} from "@/lib/seo/json-ld";
import { SITE, absoluteUrl } from "@/lib/seo/site";
import { ThemeProvider } from "@/providers/theme-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { ToastProvider } from "@/providers/toast-provider";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default:
      "Рекламная компания 2х2 — полиграфия, вывески, наружная реклама в Ханты-Мансийске",
    template: "%s | 2х2 Ханты-Мансийск",
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  creator: SITE.shortName,
  publisher: SITE.name,
  category: "business",
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title:
      "Рекламная компания 2х2 — полиграфия, вывески, наружная реклама в Ханты-Мансийске",
    description: SITE.description,
    images: [
      {
        url: absoluteUrl(SITE.ogImage),
        width: 1200,
        height: 630,
        alt: `${SITE.name} — ${SITE.slogan}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Рекламная компания 2х2 — Ханты-Мансийск",
    description: SITE.shortDescription,
    images: [absoluteUrl(SITE.ogImage)],
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
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${rubik.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen min-w-0 flex-col">
        <ThemeProvider>
          <SupabaseProvider>
            <Header />
            <CartDrawer />
            <JsonLdScript
              data={[buildOrganization(), buildLocalBusiness(), buildWebSite()]}
            />
            <div className="flex-1">{children}</div>
            <Footer />
            <ShopModals />
            <ToastProvider />
            <AnalyticsScripts />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
