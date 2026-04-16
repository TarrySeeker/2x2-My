"use client";

import clsx from "clsx";
import { Check, X, RotateCcw } from "lucide-react";
import type { OrderStatus } from "@/types/database";

/** Client-side copy of the workflow steps (server VALID_TRANSITIONS is server-only) */
const WORKFLOW_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "new", label: "Новый" },
  { status: "confirmed", label: "Подтверждён" },
  { status: "in_production", label: "В производстве" },
  { status: "ready", label: "Готов" },
  { status: "shipped", label: "Отправлен" },
  { status: "delivered", label: "Доставлен" },
  { status: "completed", label: "Завершён" },
];

const STATUS_INDEX = new Map(WORKFLOW_STEPS.map((s, i) => [s.status, i]));

interface OrderStatusStepperProps {
  currentStatus: OrderStatus;
}

export default function OrderStatusStepper({
  currentStatus,
}: OrderStatusStepperProps) {
  const isCancelled = currentStatus === "cancelled";
  const isReturned = currentStatus === "returned";
  const isTerminal = isCancelled || isReturned;

  const currentIdx = STATUS_INDEX.get(currentStatus) ?? -1;

  return (
    <div className="space-y-3">
      {/* Main stepper */}
      <div className="flex items-center gap-0">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isPast = !isTerminal && currentIdx > idx;
          const isCurrent = !isTerminal && currentIdx === idx;
          const isFuture = isTerminal || currentIdx < idx;

          return (
            <div key={step.status} className="flex items-center">
              {idx > 0 && (
                <div
                  className={clsx(
                    "h-0.5 w-4 sm:w-6 lg:w-8",
                    isPast
                      ? "bg-emerald-500"
                      : isCurrent
                        ? "bg-brand-orange"
                        : "bg-neutral-200 dark:bg-white/10",
                  )}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    isPast &&
                      "bg-emerald-500 text-white",
                    isCurrent &&
                      "bg-brand-orange text-white ring-4 ring-brand-orange/20",
                    isFuture &&
                      "bg-neutral-100 text-neutral-400 dark:bg-white/10 dark:text-neutral-500",
                  )}
                >
                  {isPast ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={clsx(
                    "hidden text-[10px] font-medium leading-tight sm:block",
                    isPast && "text-emerald-600 dark:text-emerald-400",
                    isCurrent && "text-brand-orange",
                    isFuture && "text-neutral-400 dark:text-neutral-500",
                  )}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancelled / Returned badge */}
      {isTerminal && (
        <div
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            isCancelled
              ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
          )}
        >
          {isCancelled ? (
            <X className="h-3 w-3" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          {isCancelled ? "Заказ отменён" : "Возврат"}
        </div>
      )}
    </div>
  );
}
