import type { Metadata, Viewport } from "next";
import { Manrope, Rubik } from "next/font/google";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/JsonLd";
import { siteUrl } from "@/lib/siteConfig";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "2×2 — Рекламное агентство | Полиграфия, наружная реклама, фасады",
    template: "%s | 2×2 Рекламное агентство",
  },
  description:
    "Рекламное агентство 2×2 — полиграфия, наружная реклама и оформление фасадов под ключ. Собственное производство, опыт 10+ лет, срочные заказы от 24 часов.",
  keywords: [
    "рекламное агентство",
    "полиграфия",
    "наружная реклама",
    "оформление фасадов",
    "вывески",
    "баннеры",
    "Ханты-Мансийск",
    "Москва",
  ],
  authors: [{ name: "2×2 Рекламное агентство" }],
  creator: "2×2",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName: "2×2 Рекламное агентство",
    title:
      "2×2 — Рекламное агентство | Полиграфия, наружная реклама, фасады",
    description:
      "Полиграфия, наружная реклама и оформление фасадов под ключ.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "2×2 Рекламное агентство",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "2×2 — Рекламное агентство",
    description:
      "Полиграфия, наружная реклама и оформление фасадов под ключ.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  ...(googleVerification
    ? { verification: { google: googleVerification } }
    : {}),
  alternates: { canonical: siteUrl },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "2×2 Рекламное агентство",
  description:
    "Рекламное агентство полного цикла: полиграфия, наружная реклама, оформление фасадов.",
  url: siteUrl,
  telephone: "+79044807740",
  email: "Sj_alex86@mail.ru",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ул. Парковая, 92Б",
    addressLocality: "Ханты-Мансийск",
    addressRegion: "ХМАО — Югра",
    addressCountry: "RU",
    postalCode: "628011",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ],
      opens: "09:00",
      closes: "19:00",
    },
  ],
  image: `${siteUrl}/og-image.jpg`,
  priceRange: "₽₽",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FF6B00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} ${rubik.variable} antialiased`}>
      <body className="flex min-h-screen min-w-0 flex-col">
        <Header />
        <JsonLd data={organizationSchema} />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
