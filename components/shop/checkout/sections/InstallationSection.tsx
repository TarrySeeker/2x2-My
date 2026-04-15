"use client";

import { useFormContext } from "react-hook-form";
import { Wrench } from "lucide-react";
import Checkbox from "@/components/ui/Checkbox";
import Input from "@/components/ui/Input";
import type { CheckoutFormValues } from "../checkout-form-types";

export default function InstallationSection() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();

  const required = watch("installation.required");

  return (
    <fieldset className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <legend className="font-display text-lg font-bold text-brand-dark">
        <span className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-neutral-400" />
          Монтаж
        </span>
      </legend>

      <Checkbox
        label="Требуется монтаж на объекте"
        {...register("installation.required")}
      />

      {required && (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <Input
            label="Адрес монтажа"
            placeholder="г. Ханты-Мансийск, ул. ..."
            error={errors.installation?.address?.message}
            {...register("installation.address")}
          />
          <Input
            label="Желаемая дата"
            type="date"
            error={errors.installation?.date?.message}
            {...register("installation.date")}
          />
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="installation-notes"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
            >
              Примечания к монтажу
            </label>
            <textarea
              id="installation-notes"
              rows={2}
              maxLength={1000}
              placeholder="Высота, доступ, время..."
              className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-3 text-base text-brand-dark placeholder:text-neutral-400 outline-none transition-colors hover:border-neutral-300 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/25"
              {...register("installation.notes")}
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
