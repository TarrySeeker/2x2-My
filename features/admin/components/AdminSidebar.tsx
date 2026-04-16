"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
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
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import clsx from "clsx";
import type { UserRole } from "@/types/database";
import { logoutAction } from "@/features/auth/actions";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Дашборд", href: "/admin/dashboard", icon: LayoutDashboard, roles: ["owner", "manager"] },
  { label: "Заказы", href: "/admin/orders", icon: ShoppingCart, roles: ["owner", "manager"] },
  { label: "Товары", href: "/admin/products", icon: Package, roles: ["owner", "manager"] },
  { label: "Категории", href: "/admin/categories", icon: FolderTree, roles: ["owner", "manager"] },
  { label: "Клиенты", href: "/admin/customers", icon: Users, roles: ["owner", "manager"] },
  { label: "Отзывы", href: "/admin/reviews", icon: MessageSquare, roles: ["owner", "manager"] },
  { label: "Промокоды", href: "/admin/promos", icon: Ticket, roles: ["owner", "manager"] },
  { label: "Блог", href: "/admin/blog", icon: FileText, roles: ["owner", "manager", "content"] },
  { label: "Контент", href: "/admin/content", icon: Paintbrush, roles: ["owner", "manager", "content"] },
  { label: "SEO", href: "/admin/seo", icon: Search, roles: ["owner", "manager"] },
  { label: "Настройки", href: "/admin/settings", icon: Settings, roles: ["owner", "manager"] },
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

function SidebarContent({
  items,
  pathname,
  profileName,
  profileEmail: _profileEmail,
  profileRole,
  onLogout,
  loggingOut,
  badges,
}: {
  items: NavItem[];
  pathname: string;
  profileName: string;
  profileEmail: string;
  profileRole: UserRole;
  onLogout: () => void;
  loggingOut: boolean;
  badges?: Record<string, number>;
}) {
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
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" &&
                pathname.startsWith(item.href));
            const Icon = item.icon;

            const badge = badges?.[item.href] ?? 0;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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
                  <span className="relative z-10">{item.label}</span>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 text-xs font-bold text-brand-orange">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {profileName}
              </p>
              <p className="text-[11px] text-neutral-500">
                {roleLabels[profileRole]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
              aria-label="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
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

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(profileRole),
  );

  const badges: Record<string, number> = {};
  if (newOrdersCount > 0) {
    badges["/admin/orders"] = newOrdersCount;
  }
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
  const currentPage =
    NAV_ITEMS.find(
      (item) =>
        pathname === item.href ||
        (item.href !== "/admin/dashboard" && pathname.startsWith(item.href)),
    )?.label ?? "Админ-панель";

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
