"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Уже отформатированный текст для буфера обмена. Готовится на сервере. */
  text: string;
  label?: string;
}

/**
 * Простая копи-кнопка. Сам текст для копирования формируется на сервере
 * (страница `app/admin/leads/[type]/[id]/page.tsx`) — здесь только UI.
 */
export default function LeadCopyButton({ text, label = "Скопировать" }: Props) {
  const [done, setDone] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      toast.success("Данные скопированы");
      setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-transparent dark:text-neutral-300 dark:hover:bg-white/5"
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {label}
    </button>
  );
}
