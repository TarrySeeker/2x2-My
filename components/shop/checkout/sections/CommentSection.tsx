"use client";

import { useFormContext } from "react-hook-form";
import type { CheckoutFormValues } from "../checkout-form-types";

const MAX_LEN = 2000;

export default function CommentSection() {
  const { register, watch } = useFormContext<CheckoutFormValues>();
  const value = watch("customerComment") ?? "";

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <legend className="font-display text-lg font-bold text-brand-dark">
        Комментарий
      </legend>

      <div className="flex flex-col gap-1.5">
        <textarea
          id="customerComment"
          rows={3}
          maxLength={MAX_LEN}
          placeholder="Пожелания к заказу, удобное время доставки, особые требования..."
          className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-base text-brand-dark placeholder:text-neutral-400 outline-none transition-colors hover:border-neutral-300 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/25"
          {...register("customerComment")}
        />
        <span className="self-end text-xs tabular-nums text-neutral-400">
          {value.length} / {MAX_LEN}
        </span>
      </div>
    </fieldset>
  );
}
