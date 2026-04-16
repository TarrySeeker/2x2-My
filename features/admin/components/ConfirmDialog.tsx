"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import clsx from "clsx";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : variant === "warning"
        ? "bg-amber-500 hover:bg-amber-600 text-white"
        : "bg-brand-orange hover:bg-brand-orange-hover text-white";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              "relative w-full max-w-md rounded-2xl p-6 shadow-xl",
              "bg-white dark:bg-neutral-900 dark:border dark:border-white/10",
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              {variant === "danger" && (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-brand-dark dark:text-white">
                  {title}
                </h3>
                {description && (
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={clsx(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                  "dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15",
                )}
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={clsx(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50",
                  confirmClass,
                )}
              >
                {loading && (
                  <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
