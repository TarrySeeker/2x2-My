"use client";

import { useFormContext } from "react-hook-form";
import { Banknote, FileText, CreditCard } from "lucide-react";
import type { CheckoutFormValues } from "../checkout-form-types";

const PAYMENT_OPTIONS = [
  {
    value: "cash_on_delivery" as const,
    label: "Оплата при получении",
    hint: "Наличными или переводом",
    icon: Banknote,
    disabled: false,
  },
  {
    value: "invoice" as const,
    label: "Счёт для юрлиц",
    hint: "Счёт выставит менеджер",
    icon: FileText,
    disabled: false,
  },
  {
    value: "cdek_pay" as const,
    label: "Онлайн картой (CDEK Pay)",
    hint: "Доступно в следующем обновлении",
    icon: CreditCard,
    disabled: true,
  },
] as const;

export default function PaymentSection() {
  const { register, watch } = useFormContext<CheckoutFormValues>();
  const paymentMethod = watch("payment.method");

  return (
    <fieldset className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <legend className="font-display text-lg font-bold text-brand-dark">
        Способ оплаты
      </legend>

      <div className="flex flex-col gap-3">
        {PAYMENT_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const checked = paymentMethod === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all",
                checked
                  ? "border-brand-orange bg-brand-orange-soft shadow-sm"
                  : "border-neutral-200 bg-white hover:border-brand-orange/60",
                opt.disabled ? "pointer-events-none opacity-50" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                  checked
                    ? "border-brand-orange bg-white"
                    : "border-neutral-300 bg-white",
                ].join(" ")}
                aria-hidden="true"
              >
                <span
                  className={[
                    "h-2 w-2 rounded-full bg-brand-orange transition-transform",
                    checked ? "scale-100" : "scale-0",
                  ].join(" ")}
                />
              </span>
              <Icon className="h-5 w-5 shrink-0 text-neutral-400" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-brand-dark">
                  {opt.label}
                </span>
                <span className="text-xs text-neutral-500">{opt.hint}</span>
              </div>
              <input
                type="radio"
                className="sr-only"
                value={opt.value}
                disabled={opt.disabled}
                aria-label={`${opt.label} — ${opt.hint}`}
                {...register("payment.method")}
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
