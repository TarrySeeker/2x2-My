/**
 * /admin/settings — управление командой админов (2026-05-11).
 *
 * Бывшая «общая» страница настроек переехала в /admin/content/settings
 * (через site_settings). Этот раздел теперь полностью посвящён управлению
 * пользователями: список admin'ов, создание новых с выбором роли,
 * сброс паролей, активация/деактивация.
 *
 * Доступ: только owner. Защищено через `requireOwner()`. Layout
 * (`app/admin/layout.tsx`) тоже проверяет ресурс `users` через
 * `resolveAccessForPath("/admin/settings")` → `users`.
 */
import { requireOwner } from "@/features/auth/api";
import { listAdminUsers } from "@/features/admin/api/users";
import AdminTeamPageClient from "@/features/admin/components/AdminTeamPageClient";

export const metadata = { title: "Команда" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const profile = await requireOwner();
  const users = await listAdminUsers();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
          Управление командой
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Учётные записи в админ-панели «2х2».
        </p>
      </header>
      <AdminTeamPageClient
        initialUsers={users}
        currentUserId={profile.id}
      />
    </div>
  );
}
