import { sql } from "@/lib/db/client";
import { getProfile } from "@/features/auth/api";
import ChangePasswordPageClient from "@/features/admin/components/ChangePasswordPageClient";

export const metadata = { title: "Смена пароля" };

/**
 * Страница смены собственного пароля админа.
 *
 * Если у пользователя `must_change_password = true` — режим
 * «принудительный»: ссылка «Отмена» / возврат скрывается. Сам редирект
 * на эту страницу делает admin layout (`app/admin/layout.tsx`).
 */
export default async function ChangePasswordPage() {
  const profile = await getProfile();

  let mustChange = false;
  if (profile) {
    try {
      const rows = await sql<{ must_change_password: boolean }[]>`
        SELECT must_change_password FROM users WHERE id = ${profile.id} LIMIT 1
      `;
      mustChange = rows[0]?.must_change_password === true;
    } catch {
      mustChange = false;
    }
  }

  return <ChangePasswordPageClient mustChange={mustChange} />;
}
