import { type ReactNode } from "react";
import { getProfile } from "@/features/auth/api";
import { getNewOrdersCount } from "@/features/admin/api/orders";
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

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getProfile();

  // If not authenticated, render children without sidebar.
  // Middleware handles redirect for non-login admin routes.
  // This ensures /admin/login renders without causing a redirect loop.
  if (!profile) {
    return <>{children}</>;
  }

  const isManagerOrOwner =
    profile.role === "owner" || profile.role === "manager";

  const [newOrdersCount, pendingReviewsCount] = isManagerOrOwner
    ? await Promise.all([getNewOrdersCount(), getPendingReviewsCount()])
    : [0, 0];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AdminSidebar
        profileName={profile.full_name ?? profile.email ?? "Admin"}
        profileEmail={profile.email ?? ""}
        profileRole={profile.role}
        profileAvatar={profile.avatar_url}
        newOrdersCount={newOrdersCount}
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
