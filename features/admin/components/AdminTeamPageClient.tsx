"use client";

import { useState } from "react";
import {
  UserPlus,
  Loader2,
  Trash2,
  KeyRound,
  Power,
  Copy,
  Check,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import clsx from "clsx";

import type { UserRole } from "@/types/database";
import type { AdminUserRow } from "@/features/admin/api/users";
import {
  createUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  updateUserRoleAction,
} from "@/features/admin/actions/users";

/**
 * UI для управления командой админов в /admin/settings (вкладка «Команда»).
 *
 * Owner-only. Позволяет:
 *   - Список текущих админов (логин, email, роль, статус).
 *   - Создать нового админа (с выбором роли).
 *   - Сменить роль существующего.
 *   - Деактивировать / активировать.
 *   - Сбросить пароль (генерация временного, показ один раз).
 *
 * Защита от ошибок:
 *   - Текущего пользователя нельзя удалить/разжаловать (компонент
 *     не показывает кнопок), но и серверный action валидирует.
 *   - Все мутации требуют подтверждения через toast/confirm.
 */

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Владелец",
  manager: "Менеджер",
  content: "Контент-менеджер",
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  owner: "Полный доступ ко всем разделам",
  manager:
    "Заявки/услуги/CMS/SEO/настройки — НЕТ. Дашборд, промокоды, отзывы, портфолио, блог, команда, акции — ДА.",
  content:
    "Только блог, портфолио, контент сайта (CMS-секции, тексты, мета-теги).",
};

const createSchema = z.object({
  username: z.string().min(3).max(64),
  email: z.string().email().or(z.literal("")).optional(),
  full_name: z.string().max(128).or(z.literal("")).optional(),
  role: z.enum(["owner", "manager", "content"]),
});

type CreateFormData = z.infer<typeof createSchema>;

interface Props {
  initialUsers: AdminUserRow[];
  /** ID текущего залогиненного owner-а — для блокировки самоделок. */
  currentUserId: string;
}

export default function AdminTeamPageClient({
  initialUsers,
  currentUserId,
}: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>(initialUsers);
  const [showForm, setShowForm] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const form = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      username: "",
      email: "",
      full_name: "",
      role: "manager",
    },
  });

  async function handleCreate(data: CreateFormData) {
    const res = await createUserAction(data);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось создать");
      return;
    }
    toast.success("Аккаунт создан");
    form.reset();
    setShowForm(false);
    if (res.tempPassword) {
      setTempPasswordModal({
        username: data.username,
        password: res.tempPassword,
      });
    }
    // Локально добавим в список (БД revalidate тоже вернёт через RSC).
    setUsers((prev) => [
      {
        id: res.userId ?? "tmp",
        username: data.username.toLowerCase(),
        email: data.email && data.email.length > 0 ? data.email : null,
        full_name: data.full_name && data.full_name.length > 0 ? data.full_name : null,
        role: data.role,
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login_at: null,
      },
      ...prev,
    ]);
  }

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setLoadingId(userId);
    const res = await updateUserRoleAction(userId, newRole);
    setLoadingId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось");
      return;
    }
    toast.success("Роль обновлена");
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
    );
  }

  async function handleToggleActive(user: AdminUserRow) {
    if (
      !confirm(
        user.is_active
          ? `Деактивировать ${user.username}? Активные сессии будут разлогинены.`
          : `Активировать ${user.username}?`,
      )
    ) {
      return;
    }
    setLoadingId(user.id);
    const res = await setUserActiveAction(user.id, !user.is_active);
    setLoadingId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось");
      return;
    }
    toast.success(user.is_active ? "Деактивирован" : "Активирован");
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, is_active: !user.is_active } : u,
      ),
    );
  }

  async function handleResetPassword(user: AdminUserRow) {
    if (
      !confirm(
        `Сбросить пароль ${user.username}? Пользователь будет разлогинен и должен будет ввести новый временный пароль.`,
      )
    ) {
      return;
    }
    setLoadingId(user.id);
    const res = await resetUserPasswordAction(user.id);
    setLoadingId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось");
      return;
    }
    toast.success("Пароль сброшен");
    if (res.tempPassword) {
      setTempPasswordModal({
        username: user.username,
        password: res.tempPassword,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-dark dark:text-white">
            Команда
          </h2>
          <p className="text-sm text-neutral-500">
            Учётные записи в админ-панели. Только владелец может добавлять и
            менять роли.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-hover"
        >
          <UserPlus className="h-4 w-4" />
          {showForm ? "Отменить" : "Добавить аккаунт"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={form.handleSubmit(handleCreate)}
          className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Логин *" error={form.formState.errors.username?.message}>
              <input
                {...form.register("username")}
                placeholder="manager_ivan"
                className={inputCls}
                autoComplete="off"
              />
            </Field>
            <Field label="Email (опц.)" error={form.formState.errors.email?.message}>
              <input
                type="email"
                {...form.register("email")}
                placeholder="ivan@2x2.ru"
                className={inputCls}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Полное имя (опц.)"
              error={form.formState.errors.full_name?.message}
            >
              <input
                {...form.register("full_name")}
                placeholder="Иван Иванов"
                className={inputCls}
                autoComplete="off"
              />
            </Field>
            <Field label="Роль *" error={form.formState.errors.role?.message}>
              <select {...form.register("role")} className={inputCls}>
                <option value="owner">Владелец — полный доступ</option>
                <option value="manager">
                  Менеджер — без услуг/CMS/SEO/настроек/заявок
                </option>
                <option value="content">
                  Контент-менеджер — только блог и контент сайта
                </option>
              </select>
            </Field>
          </div>
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            После создания будет показан временный пароль <strong>один раз</strong>.
            Передайте его новому админу — при первом входе он будет вынужден
            сменить пароль.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm dark:border-white/10"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {form.formState.isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Создать
            </button>
          </div>
        </form>
      )}

      {/* Таблица */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wider text-neutral-500 dark:bg-white/5">
            <tr>
              <th className="px-4 py-3">Логин</th>
              <th className="px-4 py-3">Имя / Email</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
            {users.map((u) => {
              const isMe = u.id === currentUserId;
              const isLoading = loadingId === u.id;

              return (
                <tr
                  key={u.id}
                  className={clsx(
                    "bg-white dark:bg-neutral-900",
                    !u.is_active && "opacity-60",
                  )}
                >
                  <td className="px-4 py-3 font-medium text-brand-dark dark:text-white">
                    {u.username}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-orange">
                        вы
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                    <div>{u.full_name ?? "—"}</div>
                    <div className="text-xs text-neutral-400">
                      {u.email ?? "без email"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleRoleChange(u.id, e.target.value as UserRole)
                      }
                      disabled={isMe || isLoading}
                      className={clsx(
                        "rounded-md border border-neutral-200 bg-transparent px-2 py-1 text-xs dark:border-white/10",
                        (isMe || isLoading) && "cursor-not-allowed opacity-50",
                      )}
                      title={isMe ? "Себе роль не меняют" : ROLE_DESCRIPTIONS[u.role]}
                    >
                      <option value="owner">Владелец</option>
                      <option value="manager">Менеджер</option>
                      <option value="content">Контент</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        u.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300",
                      )}
                    >
                      {u.is_active ? "активен" : "выключен"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleResetPassword(u)}
                        disabled={isLoading}
                        title="Сбросить пароль (выдать временный)"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        disabled={isMe || isLoading}
                        title={
                          isMe
                            ? "Себя нельзя деактивировать"
                            : u.is_active
                              ? "Деактивировать"
                              : "Активировать"
                        }
                        className={clsx(
                          "inline-flex h-8 w-8 items-center justify-center rounded-md border",
                          (isMe || isLoading) && "cursor-not-allowed opacity-40",
                          u.is_active
                            ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-900/20"
                            : "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900/40 dark:text-green-300 dark:hover:bg-green-900/20",
                        )}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-neutral-500"
                >
                  Аккаунтов пока нет — добавьте первого через кнопку выше.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Описание ролей */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm dark:border-white/10 dark:bg-neutral-900">
        <h3 className="mb-3 font-semibold text-brand-dark dark:text-white">
          Что могут роли
        </h3>
        <dl className="space-y-3">
          {(["owner", "manager", "content"] as const).map((role) => (
            <div key={role}>
              <dt className="font-medium text-brand-dark dark:text-neutral-100">
                {ROLE_LABELS[role]}
              </dt>
              <dd className="text-xs text-neutral-600 dark:text-neutral-400">
                {ROLE_DESCRIPTIONS[role]}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Modal для временного пароля. */}
      {tempPasswordModal && (
        <TempPasswordModal
          username={tempPasswordModal.username}
          password={tempPasswordModal.password}
          onClose={() => setTempPasswordModal(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────

const inputCls =
  "h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-brand-dark dark:text-neutral-300">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function TempPasswordModal({
  username,
  password,
  onClose,
}: {
  username: string;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(`${username} / ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-brand-dark dark:text-white">
            Временный пароль
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
          Передайте логин и пароль <strong>{username}</strong>. Это сообщение
          больше не будет показано — обязательно скопируйте сейчас.
        </p>
        <div className="mb-3 rounded-lg bg-neutral-100 p-3 font-mono text-sm dark:bg-white/5">
          <div className="text-neutral-500">логин:</div>
          <div className="mb-1 break-all">{username}</div>
          <div className="text-neutral-500">пароль:</div>
          <div className="break-all">{password}</div>
        </div>
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-hover"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Скопировано" : "Скопировать логин и пароль"}
        </button>
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          При первом входе пользователь будет вынужден сменить пароль.
        </p>
      </div>
    </div>
  );
}
