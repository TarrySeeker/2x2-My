import { type ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getProfile } from "@/features/auth/api";
import { sql } from "@/lib/db/client";
import { getPendingReviewsCount } from "@/features/admin/api/reviews";
import AdminSidebar from "@/features/admin/components/AdminSidebar";
import AdminBreadcrumbs from "@/features/admin/components/AdminBreadcrumbs";

export const metadata = {
  title: {
    default: "Админ-панель — 2×2",
    template: "%s — Админ 2×2",
  },
  robots: { index: false, follow: false },
};

const FORCE_CHANGE_PATH = "/admin/settings/account/password";

/**
 * Проверка `must_change_password`: если флаг стоит, перебрасываем на
 * страницу смены пароля. Кэш на уровне функции не нужен — getProfile
 * сам вызывается через getCurrentUser, делает один SELECT.
 */
async function isForcePasswordChange(userId: string): Promise<boolean> {
  try {
    const rows = await sql<{ must_change_password: boolean }[]>`
      SELECT must_change_password FROM users WHERE id = ${userId} LIMIT 1
    `;
    return rows[0]?.must_change_password === true;
  } catch {
    return false;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Текущий путь — берём из заголовков (Next.js 15 устанавливает x-pathname).
  const h = await headers();
  const pathname = h.get("x-pathname") ?? h.get("x-invoke-path") ?? "";

  // /admin/login рендерим без сайдбара/гарда.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return <>{children}</>;
  }

  const profile = await getProfile();

  if (!profile) {
    // Edge middleware уже редиректит при отсутствии cookie, но если
    // cookie невалидна — guard здесь добивает.
    redirect("/admin/login");
  }

  // Force-change password: всех, у кого must_change_password=true,
  // не пускаем дальше /admin/settings/account/password.
  if (
    pathname &&
    !pathname.startsWith(FORCE_CHANGE_PATH) &&
    (await isForcePasswordChange(profile.id))
  ) {
    redirect(FORCE_CHANGE_PATH);
  }

  // Бизнес-роль content имеет доступ только к блогу/контенту.
  const allowedForContent =
    pathname.startsWith("/admin/blog") ||
    pathname.startsWith("/admin/content") ||
    pathname.startsWith("/admin/settings/account");
  if (profile.role === "content" && pathname && !allowedForContent) {
    redirect("/admin/blog");
  }

  const isManagerOrOwner =
    profile.role === "owner" || profile.role === "manager";

  const [pendingReviewsCount] = isManagerOrOwner
    ? await Promise.all([getPendingReviewsCount()])
    : [0];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminSidebar
        profileName={profile.full_name ?? profile.email ?? "Admin"}
        profileEmail={profile.email ?? ""}
        profileRole={profile.role}
        profileAvatar={profile.avatar_url}
        newOrdersCount={0}
        pendingReviewsCount={pendingReviewsCount}
      />

      {/* Main content */}
      <main className="min-h-screen pt-14 lg:ml-[280px] lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <AdminBreadcrumbs />
          {children}
        </div>
      </main>
    </div>
  );
}
