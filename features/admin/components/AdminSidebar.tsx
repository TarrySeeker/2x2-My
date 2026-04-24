"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Inbox,
  Package,
  FolderTree,
  Users,
  MessageSquare,
  Ticket,
  FileText,
  Paintbrush,
  Search,
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
  Globe2,
  ListTree,
  FileType,
  ImagePlus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import clsx from "clsx";
import type { UserRole } from "@/types/database";
import { logoutAction } from "@/features/auth/actions";

interface NavLeaf {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

interface NavGroup {
  type: "group";
  label: string;
  icon: typeof LayoutDashboard;
  basePath: string;
  roles: UserRole[];
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return (entry as NavGroup).type === "group";
}

const NAV_ITEMS: NavEntry[] = [
  {
    label: "Дашборд",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
    roles: ["owner", "manager"],
  },
  // Раздел «Заказы» удалён вместе с таблицей orders (миграция 006).
  // Вместо него — «Заявки» (calculation_requests + leads + contact_requests).
  {
    label: "Заявки",
    href: "/admin/leads",
    icon: Inbox,
    roles: ["owner", "manager"],
  },
  {
    label: "Товары",
    href: "/admin/products",
    icon: Package,
    roles: ["owner", "manager"],
  },
  {
    label: "Категории",
    href: "/admin/categories",
    icon: FolderTree,
    roles: ["owner", "manager"],
  },
  {
    label: "Клиенты",
    href: "/admin/customers",
    icon: Users,
    roles: ["owner", "manager"],
  },
  {
    label: "Отзывы",
    href: "/admin/reviews",
    icon: MessageSquare,
    roles: ["owner", "manager"],
  },
  {
    label: "Промокоды",
    href: "/admin/promos",
    icon: Ticket,
    roles: ["owner", "manager"],
  },
  {
    label: "Блог",
    href: "/admin/blog",
    icon: FileText,
    roles: ["owner", "manager", "content"],
  },
  {
    type: "group",
    label: "Контент сайта",
    icon: Paintbrush,
    basePath: "/admin/content",
    roles: ["owner", "manager", "content"],
    items: [
      {
        label: "Главная страница",
        href: "/admin/content/homepage",
        icon: Layout,
        roles: ["owner", "manager", "content"],
      },
      {
        label: "Акции",
        href: "/admin/content/promotions",
        icon: Megaphone,
        roles: ["owner", "manager", "content"],
      },
      {
        label: "Команда",
        href: "/admin/content/team",
        icon: UsersRound,
        roles: ["owner", "manager", "content"],
      },
      {
        label: "Портфолио",
        href: "/admin/content/portfolio",
        icon: ImageIcon,
        roles: ["owner", "manager", "content"],
      },
      {
        label: "Настройки сайта",
        href: "/admin/content/settings",
        icon: Globe2,
        roles: ["owner", "manager"],
      },
      {
        label: "Баннеры",
        href: "/admin/content/banners",
        icon: ImagePlus,
        roles: ["owner", "manager", "content"],
      },
      {
        label: "Страницы",
        href: "/admin/content/pages",
        icon: FileType,
        roles: ["owner", "manager", "content"],
      },
      {
        label: "Меню",
        href: "/admin/content/menu",
        icon: ListTree,
        roles: ["owner", "manager"],
      },
    ],
  },
  {
    label: "SEO",
    href: "/admin/seo",
    icon: Search,
    roles: ["owner", "manager"],
  },
  {
    label: "Настройки",
    href: "/admin/settings",
    icon: Settings,
    roles: ["owner", "manager"],
  },
];

interface AdminSidebarProps {
  profileName: string;
  profileEmail: string;
  profileRole: UserRole;
  profileAvatar?: string | null;
  newOrdersCount?: number;
  pendingReviewsCount?: number;
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
  const isInGroup = pathname.startsWith(group.basePath);
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
                pathname === sub.href || pathname.startsWith(sub.href + "/");
              const SubIcon = sub.icon;
              const badge = badges?.[sub.href] ?? 0;

              return (
                <li key={sub.href} className="mt-0.5">
                  <Link
                    href={sub.href}
                    className={clsx(
                      "relative ml-4 flex items-center gap-2.5 rounded-md py-2 pl-3 pr-2 text-[13px] transition-colors",
                      isActive
                        ? "bg-white/10 font-medium text-white"
                        : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200",
                    )}
                  >
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
          <span className="text-sm font-black text-brand-orange">2×2</span>
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
  pendingReviewsCount = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Фильтрация по ролям: и группы, и отдельные пункты
  const filteredItems = NAV_ITEMS.flatMap<NavEntry>((entry) => {
    if (isGroup(entry)) {
      if (!entry.roles.includes(profileRole)) return [];
      const subItems = entry.items.filter((s) => s.roles.includes(profileRole));
      if (subItems.length === 0) return [];
      return [{ ...entry, items: subItems }];
    }
    if (!entry.roles.includes(profileRole)) return [];
    return [entry];
  });

  const badges: Record<string, number> = {};
  // newOrdersCount всегда 0 (orders таблица удалена). Параметр оставлен
  // для API-совместимости — admin layout его пока ещё передаёт.
  void newOrdersCount;
  if (pendingReviewsCount > 0) {
    badges["/admin/reviews"] = pendingReviewsCount;
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutAction();
    } catch {
      toast.error("Ошибка при выходе");
      setLoggingOut(false);
    }
  }

  // Find current page title for mobile top bar
  const currentPage = (() => {
    for (const entry of NAV_ITEMS) {
      if (isGroup(entry)) {
        const sub = entry.items.find(
          (s) => pathname === s.href || pathname.startsWith(s.href + "/"),
        );
        if (sub) return sub.label;
        if (pathname.startsWith(entry.basePath)) return entry.label;
      } else if (
        pathname === entry.href ||
        (entry.href !== "/admin/dashboard" &&
          pathname.startsWith(entry.href))
      ) {
        return entry.label;
      }
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
