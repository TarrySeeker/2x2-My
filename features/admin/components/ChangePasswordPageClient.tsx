"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";

import { changePasswordAction } from "@/features/admin/actions/account";
import AdminPageHeader from "./AdminPageHeader";

const formSchema = z
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

type ChangePasswordFormData = z.infer<typeof formSchema>;

interface PasswordReq {
  label: string;
  ok: boolean;
}

function checkPassword(pwd: string, current: string): PasswordReq[] {
  return [
    { label: "Минимум 12 символов", ok: pwd.length >= 12 },
    { label: "Содержит букву", ok: /[a-zа-я]/i.test(pwd) },
    { label: "Содержит цифру", ok: /\d/.test(pwd) },
    {
      label: "Отличается от текущего",
      ok: pwd.length > 0 && pwd !== current,
    },
  ];
}

interface Props {
  mustChange: boolean;
}

export default function ChangePasswordPageClient({ mustChange }: Props) {
  const router = useRouter();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });

  const newPwd = watch("newPassword") ?? "";
  const currPwd = watch("currentPassword") ?? "";

  const requirements = useMemo(
    () => checkPassword(newPwd, currPwd),
    [newPwd, currPwd],
  );

  async function onSubmit(data: ChangePasswordFormData) {
    const res = await changePasswordAction(data);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось сменить пароль");
      return;
    }
    toast.success("Пароль изменён");
    router.replace("/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AdminPageHeader
        title="Смена пароля"
        description={
          mustChange
            ? "Перед началом работы установите свой пароль"
            : "Обновите пароль от админ-панели"
        }
        actions={
          !mustChange && (
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-dark dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Отмена
            </Link>
          )
        }
      />

      {mustChange && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Требуется сменить пароль
            </p>
            <p className="mt-1 text-amber-800/80 dark:text-amber-200/70">
              Вы вошли с временным паролем. Установите свой, чтобы
              продолжить работу.
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900"
      >
        <PasswordField
          label="Текущий пароль"
          icon={<Lock className="h-4 w-4" />}
          show={showCurrent}
          onToggle={() => setShowCurrent((v) => !v)}
          register={register("currentPassword")}
          error={errors.currentPassword?.message}
          autoComplete="current-password"
        />

        <PasswordField
          label="Новый пароль"
          icon={<KeyRound className="h-4 w-4" />}
          show={showNew}
          onToggle={() => setShowNew((v) => !v)}
          register={register("newPassword")}
          error={errors.newPassword?.message}
          autoComplete="new-password"
        />

        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {requirements.map((r) => (
            <li
              key={r.label}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-2 py-1 text-xs transition-colors",
                r.ok
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-neutral-400 dark:text-neutral-500",
              )}
            >
              {r.ok ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              {r.label}
            </li>
          ))}
        </ul>

        <PasswordField
          label="Повторите новый пароль"
          icon={<KeyRound className="h-4 w-4" />}
          show={showConfirm}
          onToggle={() => setShowConfirm((v) => !v)}
          register={register("newPasswordConfirm")}
          error={errors.newPasswordConfirm?.message}
          autoComplete="new-password"
        />

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-neutral-400">
          После смены пароля все остальные сессии (другие устройства)
          будут принудительно завершены. Текущее устройство останется
          залогиненным.
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          {mustChange ? "Установить пароль" : "Сменить пароль"}
        </button>
      </form>
    </div>
  );
}

interface PasswordFieldProps {
  label: string;
  icon: React.ReactNode;
  show: boolean;
  onToggle: () => void;
  register: UseFormRegisterReturn;
  error?: string;
  autoComplete?: string;
}

function PasswordField({
  label,
  icon,
  show,
  onToggle,
  register,
  error,
  autoComplete,
}: PasswordFieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {icon}
        </span>
        <input
          {...register}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          className={clsx(
            "h-11 w-full rounded-lg border bg-transparent pl-10 pr-11 text-sm transition-colors",
            "border-neutral-200 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20",
            "dark:border-white/10 dark:text-white dark:focus:border-brand-orange",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/20",
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
