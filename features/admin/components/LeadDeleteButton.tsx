"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import ConfirmDialog from "./ConfirmDialog";
import { deleteLeadAction } from "@/features/admin/actions/leads";
import type { LeadType } from "@/features/admin/api/leads";

interface Props {
  type: LeadType;
  id: number;
  /**
   * Человеко-читаемый номер заявки (например "CR-000001").
   * НЕ зовём это поле `ref` — это зарезервированное имя в React 19,
   * eslint-plugin-react-hooks ругается даже на доступ к нему в render.
   */
  refNumber: string | null;
}

/**
 * Кнопка удаления заявки + модалка подтверждения.
 *
 * После успешного удаления редиректим на /admin/leads. Использовать
 * router.refresh() здесь нельзя — мы уходим со страницы, которой
 * больше нет (record_id записи только что удалён).
 *
 * Доступна только owner/manager — server-action `deleteLeadAction`
 * сам делает `requireAdmin(["owner","manager"])` и редиректит content
 * на /admin/blog (см. requireAdmin в `features/auth/api.ts`). Здесь
 * рендерить кнопку всегда — лишний клик content-юзера приведёт к
 * редиректу с понятным фидбеком, это не утечка приватного UI.
 */
export default function LeadDeleteButton({ type, id, refNumber }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const label = refNumber ?? `#${id}`;

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteLeadAction(type, id);
      if (result.ok) {
        toast.success(`Заявка ${label} удалена`);
        setOpen(false);
        router.push("/admin/leads");
        // refresh не нужен: push в Next.js App Router всегда тащит
        // свежие server-data для целевой страницы.
      } else {
        toast.error(result.error ?? "Не удалось удалить заявку");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-500/10"
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
        Удалить
      </button>

      <ConfirmDialog
        open={open}
        onClose={() => (isPending ? null : setOpen(false))}
        onConfirm={handleConfirm}
        title={`Удалить заявку ${label}?`}
        description="Действие необратимо. Запись будет полностью удалена из базы данных."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        loading={isPending}
      />
    </>
  );
}
