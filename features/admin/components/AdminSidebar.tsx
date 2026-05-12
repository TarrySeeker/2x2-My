"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  Ticket,
  FileText,
  Paintbrush,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Layout,
  Megaphone,
  UsersRound,
  Image as ImageIcon,
  Layers,
  Languages,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Wrench,
  Search,
  ExternalLink,
  FileCode2,
  MapIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import clsx from "clsx";
import type { UserRole } from "@/types/database";
import { logoutAction } from "@/features/auth/actions";
import { siteUrl } from "@/lib/siteConfig";
import {
  canAccessByRole,
  type ClientResource,
} from "@/features/admin/utils/client-permissions";

interface NavLeaf {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Ресурс из ролевой матрицы — определяет видимость для роли. */
  resource: ClientResource;
  /** Если true — открыть в новой вкладке (для внешних ссылок типа sitemap.xml). */
  external?: boolean;
}

interface NavGroup {
  type: "group";
  label: string;
  icon: typeof LayoutDashboard;
  basePath: string;
  /**
   * Ресурс группы — определяет видимость самой группы. Если у роли
   * нет доступа к ресурсу группы, она скрыта целиком (даже если есть
   * доступ к подпунктам — это редкий corner case, мы его исключаем
   * для чистоты UX).
   *
   * Можно передать массив — группа видима, если ХОТЯ БЫ ОДИН ресурс
   * доступен. Используется для группы «Контент сайта», которая для
   * `manager` целиком пропадает (внутри только portfolio/blog/team —
   * они всё равно дублируются в выделенных пунктах меню).
   */
  resource: ClientResource | ClientResource[];
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).type === "group";
}

// ВАЖНО: пункты sidebar намеренно сокращены (cleanup 2026-04-25,
// продолжение 2026-05-06).
// Скрыты разделы, у которых нет читателя на витрине либо они дублируют
// другие. Сами роуты и страницы остались — доступны по прямому URL,
// но не отображаются в навигации:
//   /admin/customers          (нет учёта клиентов на сайте)
//   /admin/content/banners    (нет компонента-читателя на витрине)
//   /admin/content/pages      (дублирует legal-pages, таблица не читается)
//   /admin/content/menu       (Header/Footer hardcoded)
//
// Раздел «Товары» (/admin/products + /admin/categories) полностью
// удалён 2026-05-06: 2х2 продаёт услуги, а не товары — таблица
// products оставалась рудиментом шаблонной CMS. Все страницы, API
// и компоненты вычищены; данные products/categories в БД помечены
// deprecated на уровне комментария к таблице (миграция не требуется,
// просто перестаём использовать).
//
// Раздел «Отзывы» (/admin/reviews) полностью удалён 2026-05-12:
// у клиента нет отзывов и блок не нужен. Все страницы, API, компоненты
// и роутинг убраны; таблица reviews в БД помечена DEPRECATED через
// COMMENT ON TABLE (миграция 044), DROP TABLE не делаем из-за FK
// и истории.
//
// /admin/seo вернули обратно (2026-04-25 second pass): группа «SEO»
// содержит «Мета-теги страниц» (= /admin/content/metadata, основная
// точка входа), «Шаблоны и редиректы» (= /admin/seo), а также внешние
// ссылки на sitemap.xml и robots.txt — клиент должен видеть все
// SEO-инструменты в одном месте.
const NAV_ITEMS: NavEntry[] = [
  {
    label: "Дашборд",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    resource: "dashboard",
  },
  // Раздел «Заказы» удалён вместе с таблицей orders (миграция 006).
  // Вместо него — «Заявки» (calculation_requests + leads + contact_requests).
  //
  // Группа «Заявки и продажи»: для роли `manager` (с 2026-05-11) скрыт
  // подпункт «Заявки» (resource: leads — owner-only). «Промокоды»
  // менеджер видит. Группа целиком отображается, если хотя бы один
  // подпункт доступен.
  {
    type: "group",
    label: "Заявки и продажи",
    icon: ShoppingBag,
    basePath: "/admin/leads",
    resource: ["leads", "promos"],
    items: [
      {
        label: "Заявки",
        href: "/admin/leads",
        icon: Inbox,
        resource: "leads",
      },
      {
        label: "Промокоды",
        href: "/admin/promos",
        icon: Ticket,
        resource: "promos",
      },
    ],
  },
  // Группа «Услуги» — owner-only с 2026-05-11.
  {
    type: "group",
    label: "Услуги",
    icon: Wrench,
    basePath: "/admin/content/services",
    resource: ["services", "services.categories"],
    items: [
      {
        label: "Карточки услуг",
        href: "/admin/content/services",
        icon: Wrench,
        resource: "services",
      },
      {
        label: "Категории услуг",
        href: "/admin/content/services-categories",
        icon: Layers,
        resource: "services.categories",
      },
    ],
  },
  // Группа «Контент сайта». Для `manager` — скрыта целиком (он не
  // редактирует CMS-разделы). Подпункты, которые доступны менеджеру
  // (Портфолио, Блог, Команда, Акции) вынесены в отдельную группу
  // «Контент менеджера» ниже.
  {
    type: "group",
    label: "Контент сайта",
    icon: Paintbrush,
    basePath: "/admin/content",
    resource: "content.cms",
    items: [
      {
        label: "Главная (секции)",
        href: "/admin/content/homepage",
        icon: Layout,
        resource: "content.cms",
      },
      {
        label: "Внутренние страницы (секции)",
        href: "/admin/content/sections",
        icon: Layers,
        resource: "content.cms",
      },
      {
        label: "Политика и оферты",
        href: "/admin/content/legal-pages",
        icon: ScrollText,
        resource: "content.cms",
      },
      {
        label: "Тексты кнопок и ошибок",
        href: "/admin/content/ui-strings",
        icon: Languages,
        resource: "content.cms",
      },
      {
        label: "Акции",
        href: "/admin/content/promotions",
        icon: Megaphone,
        resource: "promotions",
      },
      {
        label: "Портфолио",
        href: "/admin/content/portfolio",
        icon: ImageIcon,
        resource: "portfolio",
      },
      {
        label: "Команда",
        href: "/admin/content/team",
        icon: UsersRound,
        resource: "team",
      },
      {
        label: "Блог",
        href: "/admin/blog",
        icon: FileText,
        resource: "blog",
      },
    ],
  },
  // Отдельная группа для менеджера: дублирует доступные подпункты
  // «Контент сайта», но без CMS. Owner и content тоже её увидят, но
  // у них и без того есть полная «Контент сайта» — так что здесь
  // только manager (см. `extraVisibilityFor` ниже, мы прячем эту
  // группу для owner/content, чтобы не было дубликатов).
  {
    type: "group",
    label: "Контент менеджера",
    icon: Paintbrush,
    basePath: "/admin/content/portfolio",
    resource: ["portfolio", "blog", "team", "promotions"],
    items: [
      {
        label: "Акции",
        href: "/admin/content/promotions",
        icon: Megaphone,
        resource: "promotions",
      },
      {
        label: "Портфолио",
        href: "/admin/content/portfolio",
        icon: ImageIcon,
        resource: "portfolio",
      },
      {
        label: "Категории портфолио",
        href: "/admin/content/portfolio-categories",
        icon: Layers,
        resource: "portfolio.categories",
      },
      {
        label: "Команда",
        href: "/admin/content/team",
        icon: UsersRound,
        resource: "team",
      },
      {
        label: "Блог",
        href: "/admin/blog",
        icon: FileText,
        resource: "blog",
      },
    ],
  },
  {
    type: "group",
    label: "SEO",
    icon: Search,
    basePath: "/admin/seo",
    resource: ["seo", "content.cms"],
    items: [
      {
        label: "Мета-теги страниц",
        href: "/admin/content/metadata",
        icon: ShieldCheck,
        resource: "content.cms",
      },
      {
        label: "Шаблоны и редиректы",
        href: "/admin/seo",
        icon: FileCode2,
        resource: "seo",
      },
      {
        label: "Sitemap.xml",
        href: `${siteUrl}/sitemap.xml`,
        icon: MapIcon,
        resource: "seo",
        external: true,
      },
      {
        label: "Robots.txt",
        href: `${siteUrl}/robots.txt`,
        icon: ExternalLink,
        resource: "seo",
        external: true,
      },
    ],
  },
  {
    label: "Настройки сайта",
    href: "/admin/content/settings",
    icon: Settings,
    resource: "settings.site",
  },
  {
    label: "Управление командой",
    href: "/admin/settings",
    icon: UsersRound,
    resource: "users",
  },
];

interface AdminSidebarProps {
  profileName: string;
  profileEmail: string;
  profileRole: UserRole;
  profileAvatar?: string | null;
  newOrdersCount?: number;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
      aria-label="Переключить тему"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function GroupItem({
  group,
  pathname,
  badges,
}: {
  group: NavGroup;
  pathname: string;
  badges?: Record<string, number>;
}) {
  // Группа считается активной только если активен один из её подпунктов.
  // basePath НЕ используем — иначе группа «Контент сайта» (/admin/content)
  // ложно срабатывает на «Настройках сайта» (/admin/content/settings),
  // которая теперь top-level. Проверка по подпунктам корректнее: «Блог»
  // лежит в /admin/blog, но визуально относится к «Контент сайта».
  const isInGroup = group.items.some(
    (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"),
  );
  const [open, setOpen] = useState(isInGroup);
  const Icon = group.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isInGroup
            ? "text-white"
            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
        )}
      >
        <Icon className="h-4.5 w-4.5 shrink-0" />
        <span>{group.label}</span>
        <span className="ml-auto">
          {open ? (
            <ChevronUp className="h-4 w-4 text-neutral-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-500" />
          )}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {group.items.map((sub) => {
              const isActive =
                !sub.external &&
                (pathname === sub.href || pathname.startsWith(sub.href + "/"));
              const SubIcon = sub.icon;
              const badge = badges?.[sub.href] ?? 0;

              const linkClass = clsx(
                "relative ml-4 flex items-center gap-2.5 rounded-md py-2 pl-3 pr-2 text-[13px] transition-colors",
                isActive
                  ? "bg-white/10 font-medium text-white"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
              );

              return (
                <li key={sub.href} className="mt-0.5">
                  {sub.external ? (
                    <a
                      href={sub.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkClass}
                    >
                      <SubIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{sub.label}</span>
                      <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-neutral-500" />
                    </a>
                  ) : (
                    <Link href={sub.href} className={linkClass}>
                      <SubIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{sub.label}</span>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-orange" />
                      )}
                      {badge > 0 && (
                        <span className="ml-auto flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-orange px-1.5 text-[10px] font-bold text-white">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}

function SidebarContent({
  items,
  pathname,
  profileName,
  profileEmail,
  profileRole,
  onLogout,
  loggingOut,
  badges,
}: {
  items: NavEntry[];
  pathname: string;
  profileName: string;
  profileEmail: string;
  profileRole: UserRole;
  onLogout: () => void;
  loggingOut: boolean;
  badges?: Record<string, number>;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const roleLabels: Record<UserRole, string> = {
    owner: "Владелец",
    manager: "Менеджер",
    content: "Контент",
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/20">
          <span className="text-sm font-black text-brand-orange">2х2</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Панель управления</p>
          <p className="text-[11px] text-neutral-500">admin.2x2hm.ru</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {items.map((entry) => {
            if (isGroup(entry)) {
              return (
                <GroupItem
                  key={entry.basePath}
                  group={entry}
                  pathname={pathname}
                  badges={badges}
                />
              );
            }

            const isActive =
              pathname === entry.href ||
              (entry.href !== "/admin/dashboard" &&
                pathname.startsWith(entry.href));
            const Icon = entry.icon;
            const badge = badges?.[entry.href] ?? 0;

            return (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  className={clsx(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-white"
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="admin-nav-active"
                      className="absolute inset-0 rounded-lg bg-white/10"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 35,
                      }}
                    />
                  )}
                  <Icon className="relative z-10 h-4.5 w-4.5 shrink-0" />
                  <span className="relative z-10">{entry.label}</span>
                  {badge > 0 && (
                    <span className="relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1.5 text-[11px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-orange" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Profile + Theme + Logout */}
      <div className="border-t border-white/10 p-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex w-full items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-white/5"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {profileName}
              </p>
              <p className="truncate text-[11px] text-neutral-500">
                {profileEmail || roleLabels[profileRole]}
              </p>
            </div>
            <ChevronUp
              className={clsx(
                "h-4 w-4 shrink-0 text-neutral-500 transition-transform",
                !profileOpen && "rotate-180",
              )}
            />
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-xl"
                role="menu"
              >
                <Link
                  href="/admin/settings/account/password"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
                  role="menuitem"
                >
                  <KeyRound className="h-4 w-4 text-neutral-400" />
                  Сменить пароль
                </Link>
                <div className="border-t border-white/10" />
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" />
                  {loggingOut ? "Выход..." : "Выйти"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar({
  profileName,
  profileEmail,
  profileRole,
  newOrdersCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Фильтрация по ролям через единую матрицу `lib/auth/permissions.ts`
  // (зеркалированную в client-permissions для bundle).
  //
  // Группа «Контент менеджера» — спец-кейс: дублирует подпункты «Контент
  // сайта». Показываем только manager'у, у которого «Контент сайта»
  // скрыт целиком (resource: content.cms — owner/content). У owner и
  // content «Контент менеджера» дублирует уже видимое — прячем.
  const filteredItems = NAV_ITEMS.flatMap<NavEntry>((entry) => {
    if (isGroup(entry)) {
      if (entry.label === "Контент менеджера" && profileRole !== "manager") {
        return [];
      }
      if (!canAccessByRole(profileRole, entry.resource)) return [];
      const subItems = entry.items.filter((s) =>
        canAccessByRole(profileRole, s.resource),
      );
      if (subItems.length === 0) return [];
      return [{ ...entry, items: subItems }];
    }
    if (!canAccessByRole(profileRole, entry.resource)) return [];
    return [entry];
  });

  const badges: Record<string, number> = {};
  // newOrdersCount всегда 0 (orders таблица удалена). Параметр оставлен
  // для API-совместимости — admin layout его пока ещё передаёт.
  void newOrdersCount;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutAction();
    } catch {
      toast.error("Ошибка при выходе");
      setLoggingOut(false);
    }
  }

  // Find current page title for mobile top bar.
  // Сначала проверяем top-level leaf'ы (включая Настройки сайта =
  // /admin/content/settings), затем подпункты групп. Так избегаем
  // ложного срабатывания группы «Контент сайта» по префиксу.
  const currentPage = (() => {
    for (const entry of NAV_ITEMS) {
      if (isGroup(entry)) continue;
      if (
        pathname === entry.href ||
        (entry.href !== "/admin/dashboard" && pathname.startsWith(entry.href))
      ) {
        return entry.label;
      }
    }
    for (const entry of NAV_ITEMS) {
      if (!isGroup(entry)) continue;
      const sub = entry.items.find(
        (s) => pathname === s.href || pathname.startsWith(s.href + "/"),
      );
      if (sub) return sub.label;
    }
    return "Админ-панель";
  })();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] bg-neutral-950 lg:block">
        <SidebarContent
          items={filteredItems}
          pathname={pathname}
          profileName={profileName}
          profileEmail={profileEmail}
          profileRole={profileRole}
          onLogout={handleLogout}
          loggingOut={loggingOut}
          badges={badges}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white/90 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-950/90 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 dark:text-neutral-400"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-brand-dark dark:text-white">
          {currentPage}
        </p>
        <ThemeToggle />
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-neutral-950 lg:hidden"
            >
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white"
                aria-label="Закрыть меню"
              >
                <X className="h-4 w-4" />
              </button>
              <div onClick={() => setMobileOpen(false)}>
                <SidebarContent
                  items={filteredItems}
                  pathname={pathname}
                  profileName={profileName}
                  profileEmail={profileEmail}
                  profileRole={profileRole}
                  onLogout={handleLogout}
                  loggingOut={loggingOut}
                  badges={badges}
                />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
