"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { requireAuth } from "@/features/auth/api";
import { sql } from "@/lib/db/client";
import {
  invalidateAllUserSessions,
  createSession,
  generateSessionToken,
} from "@/lib/auth/lucia";
import { setSessionCookie, deleteSessionCookie } from "@/lib/auth/cookies";

/**
 * Server actions для смены собственного пароля админом.
 *
 * Используется в:
 *  - /admin/settings/account/password (обычная смена)
 *  - принудительная смена при `users.must_change_password = true`
 *    (после первого входа с временным паролем).
 *
 * После успешной смены:
 *  1. password_hash обновляется (bcrypt 12 раундов).
 *  2. must_change_password сбрасывается в false.
 *  3. failed_login_attempts/locked_until сбрасываются.
 *  4. ВСЕ сессии пользователя инвалидируются (защита от compromise).
 *  5. Создаётся новая сессия для текущего устройства, новый токен
 *     кладётся в cookie. Это значит: пользователь остаётся залогинен
 *     в этой вкладке, но во всех остальных — выкинут.
 *
 * НЕ логируем сами пароли. В audit_log пишем только факт смены.
 */

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль").max(128),
    newPassword: z
      .string()
      .min(12, "Минимум 12 символов")
      .max(128, "Максимум 128 символов"),
    newPasswordConfirm: z.string().min(1).max(128),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Новый пароль должен отличаться от текущего",
        path: ["newPassword"],
      });
    }
    if (data.newPassword !== data.newPasswordConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Пароли не совпадают",
        path: ["newPasswordConfirm"],
      });
    }
  });

export interface ChangePasswordResult {
  ok: boolean;
  error?: string;
}

export async function changePasswordAction(
  data: unknown,
): Promise<ChangePasswordResult> {
  const profile = await requireAuth();

  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  // 1. Считаем текущий хеш из БД (в profile он маскирован).
  const rows = await sql<{ password_hash: string }[]>`
    SELECT password_hash
    FROM users
    WHERE id = ${profile.id}
    LIMIT 1
  `;
  const userRow = rows[0];
  if (!userRow) {
    return { ok: false, error: "Пользователь не найден" };
  }

  // 2. Проверяем текущий пароль.
  const currentOk = await bcrypt.compare(
    parsed.data.currentPassword,
    userRow.password_hash,
  );
  if (!currentOk) {
    return { ok: false, error: "Текущий пароль введён неверно" };
  }

  // 3. Хешируем новый.
  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

  // 4. Обновляем.
  try {
    await sql`
      UPDATE users
      SET password_hash         = ${newHash},
          must_change_password  = false,
          failed_login_attempts = 0,
          locked_until          = NULL,
          updated_at            = NOW()
      WHERE id = ${profile.id}
    `;

    // 5. Инвалидируем ВСЕ сессии пользователя.
    await invalidateAllUserSessions(profile.id);

    // 6. Создаём новую сессию для текущего устройства, чтобы юзер
    //    остался залогинен в этой вкладке.
    await deleteSessionCookie();
    const token = generateSessionToken();
    const session = await createSession(profile.id, token);
    await setSessionCookie(token, session.expiresAt);

    // 7. Audit (без пароля!).
    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'account.change_password',
          'users',
          ${profile.id},
          NULL,
          NULL,
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[account.changePassword audit]", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сменить пароль";
    console.error("[account.changePassword]", message);
    return { ok: false, error: message };
  }
}
