"use client";

import { useFormContext } from "react-hook-form";
import { MapPin, Truck, Package } from "lucide-react";
import Input from "@/components/ui/Input";
import CdekWidget from "@/components/shop/checkout/CdekWidget";
import type { CdekSelectData } from "@/components/shop/checkout/CdekWidget";
import type { CheckoutFormValues } from "../checkout-form-types";

interface DeliverySectionProps {
  onCdekSelect?: (deliverySum: number) => void;
}

const DELIVERY_OPTIONS = [
  {
    value: "pickup" as const,
    label: "Самовывоз",
    hint: "Ханты-Мансийск, ул. Парковая 92 Б",
    price: "Бесплатно",
    icon: MapPin,
  },
  {
    value: "courier" as const,
    label: "Курьер по Ханты-Мансийску",
    hint: "Доставка по городу",
    price: "500 ₽",
    icon: Truck,
  },
  {
    value: "cdek" as const,
    label: "СДЭК (по России)",
    hint: "Пункт выдачи или курьер",
    price: "",
    icon: Package,
  },
] as const;

const DEFAULT_GOODS = [{ width: 20, height: 15, length: 30, weight: 1000 }];

export default function DeliverySection({ onCdekSelect }: DeliverySectionProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();

  const deliveryType = watch("delivery.type");
  const tariffCode = watch("delivery.tariffCode");

  const handleCdekSelect = (data: CdekSelectData) => {
    setValue("delivery.tariffCode", data.tariffCode);
    setValue("delivery.pointCode", data.pointCode ?? "");
    setValue("delivery.pointAddress", data.pointAddress ?? "");
    setValue("delivery.cityCode", data.cityCode);
    setValue("delivery.cost", data.deliverySum);
    onCdekSelect?.(data.deliverySum);
  };

  return (
    <fieldset className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <legend className="font-display text-lg font-bold text-brand-dark">
        Способ получения
      </legend>

      <div className="flex flex-col gap-3">
        {DELIVERY_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const checked = deliveryType === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-all",
                checked
                  ? "border-brand-orange bg-brand-orange-soft shadow-sm"
                  : "border-neutral-200 bg-white hover:border-brand-orange/60",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span
                  className={[
                    "mt-0.5 grid h-5 w-5 place-items-center rounded-full border-2 transition-colors",
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
                <div className="flex flex-col">
                  <span className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
                    <Icon className="h-4 w-4 text-neutral-400" />
                    {opt.label}
                  </span>
                  <span className="text-xs text-neutral-500">{opt.hint}</span>
                </div>
              </div>
              {opt.price && (
                <span className="shrink-0 text-sm font-display font-bold tabular-nums text-brand-orange">
                  {opt.price}
                </span>
              )}
              <input
                type="radio"
                className="sr-only"
                value={opt.value}
                aria-label={`${opt.label} — ${opt.hint}`}
                {...register("delivery.type")}
              />
            </label>
          );
        })}
      </div>

      {deliveryType === "courier" && (
        <Input
          label="Адрес доставки"
          placeholder="г. Ханты-Мансийск, ул. ..."
          error={errors.delivery?.address?.message}
          autoComplete="street-address"
          {...register("delivery.address")}
        />
      )}

      {deliveryType === "cdek" && (
        <div className="flex flex-col gap-3">
          <CdekWidget onSelect={handleCdekSelect} goods={DEFAULT_GOODS} />
          {deliveryType === "cdek" && !tariffCode && (
            <p className="text-xs text-red-500">
              Выберите пункт выдачи или курьерскую доставку
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
