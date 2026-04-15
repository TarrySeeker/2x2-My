"use client";

import { useFormContext } from "react-hook-form";
import { User, Phone, Mail, Building2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import type { CheckoutFormValues } from "../checkout-form-types";

export default function ContactSection() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();

  const isB2B = watch("customer.isB2B");

  return (
    <fieldset className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <legend className="font-display text-lg font-bold text-brand-dark">
        Контактные данные
      </legend>

      <Input
        label="Имя"
        placeholder="Александр"
        leftSlot={<User className="h-4 w-4" />}
        error={errors.customer?.name?.message}
        autoComplete="name"
        {...register("customer.name")}
      />

      <Input
        label="Телефон"
        type="tel"
        placeholder="+7 932 424 77 40"
        leftSlot={<Phone className="h-4 w-4" />}
        error={errors.customer?.phone?.message}
        autoComplete="tel"
        {...register("customer.phone")}
      />

      <Input
        label="Email (необязательно)"
        type="email"
        placeholder="mail@example.com"
        leftSlot={<Mail className="h-4 w-4" />}
        error={errors.customer?.email?.message}
        autoComplete="email"
        {...register("customer.email")}
      />

      <Checkbox label="Я представляю юрлицо" {...register("customer.isB2B")} />

      {isB2B && (
        <div className="flex flex-col gap-4 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Реквизиты компании
          </p>
          <Input
            label="Название организации"
            placeholder="ООО «Пример»"
            leftSlot={<Building2 className="h-4 w-4" />}
            error={errors.customer?.company?.name?.message}
            autoComplete="organization"
            {...register("customer.company.name")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="ИНН"
              placeholder="1234567890"
              error={errors.customer?.company?.inn?.message}
              {...register("customer.company.inn")}
            />
            <Input
              label="КПП (необязательно)"
              placeholder="123456789"
              error={errors.customer?.company?.kpp?.message}
              {...register("customer.company.kpp")}
            />
          </div>
          <Input
            label="Юридический адрес (необязательно)"
            placeholder="г. Ханты-Мансийск, ул. ..."
            error={errors.customer?.company?.address?.message}
            {...register("customer.company.address")}
          />
          {errors.customer?.company?.message && (
            <p className="text-xs font-medium text-[var(--color-danger)]">
              {errors.customer.company.message}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
