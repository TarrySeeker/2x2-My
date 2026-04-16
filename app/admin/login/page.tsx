"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { loginAction } from "@/features/auth/actions";
import clsx from "clsx";

const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    try {
      const result = await loginAction(data.email, data.password);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Добро пожаловать!");
        router.push("/admin/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-orange/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-brand-orange/5 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Glass card */}
        <div
          className={clsx(
            "rounded-2xl border p-8",
            "bg-white/[0.04] border-white/10 backdrop-blur-xl",
            "shadow-2xl shadow-black/20",
          )}
        >
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/20">
              <span className="text-2xl font-black text-brand-orange">2×2</span>
            </div>
            <h1 className="text-xl font-bold text-white">Вход в панель</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Рекламная компания «2×2»
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider text-neutral-400"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@2x2hm.ru"
                {...register("email")}
                className={clsx(
                  "h-11 w-full rounded-lg border bg-white/5 px-4 text-sm text-white outline-none transition-colors",
                  "placeholder:text-neutral-500",
                  "focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
                  errors.email
                    ? "border-red-500"
                    : "border-white/10 hover:border-white/20",
                )}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wider text-neutral-400"
              >
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={clsx(
                    "h-11 w-full rounded-lg border bg-white/5 px-4 pr-10 text-sm text-white outline-none transition-colors",
                    "placeholder:text-neutral-500",
                    "focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
                    errors.password
                      ? "border-red-500"
                      : "border-white/10 hover:border-white/20",
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  tabIndex={-1}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                "flex h-11 w-full items-center justify-center gap-2 rounded-lg font-semibold text-white transition-all",
                "bg-brand-orange hover:bg-brand-orange-hover",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>
        </div>

        {/* Subtle footer */}
        <p className="mt-4 text-center text-xs text-neutral-600">
          «2×2, потому что с нами просто!»
        </p>
      </motion.div>
    </div>
  );
}
