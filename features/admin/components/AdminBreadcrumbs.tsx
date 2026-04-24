"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  admin: "Админ",
  dashboard: "Дашборд",
  products: "Товары",
  categories: "Категории",
  orders: "Заказы",
  leads: "Заявки",
  customers: "Клиенты",
  reviews: "Отзывы",
  promos: "Промокоды",
  blog: "Блог",
  content: "Контент",
  seo: "SEO",
  settings: "Настройки",
  login: "Вход",
  new: "Новый",
  edit: "Редактирование",
  homepage: "Главная страница",
  promotions: "Акции",
  team: "Команда",
  portfolio: "Портфолио",
  account: "Аккаунт",
  password: "Смена пароля",
  banners: "Баннеры",
  pages: "Страницы",
  menu: "Меню",
  hero: "Hero",
  about: "О компании",
  services: "Услуги",
  features: "Преимущества",
  faq: "FAQ",
  cta: "CTA",
};

function toLabel(segment: string): string {
  return LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on dashboard (root admin page)
  if (segments.length <= 2 && segments[1] === "dashboard") return null;

  const crumbs = segments.map((seg, i) => ({
    label: toLabel(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        <li>
          <Link
            href="/admin/dashboard"
            className="flex items-center text-neutral-400 transition-colors hover:text-brand-orange dark:text-neutral-500 dark:hover:text-brand-orange"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {crumbs.slice(1).map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600" />
            {crumb.isLast ? (
              <span className="font-medium text-brand-dark dark:text-white">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-neutral-400 transition-colors hover:text-brand-orange dark:text-neutral-500 dark:hover:text-brand-orange"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
