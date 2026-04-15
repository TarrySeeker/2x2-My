"use client";

import { Toaster } from "sonner";

/**
 * ToastProvider — монтирует Sonner Toaster один раз на весь сайт.
 * Вызов уведомлений: `import { toast } from "sonner"; toast.success("...")`.
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme="light"
      toastOptions={{
        style: {
          fontFamily: "var(--font-manrope), sans-serif",
        },
      }}
    />
  );
}
