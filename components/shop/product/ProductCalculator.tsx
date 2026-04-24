"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Calculator as CalcIcon, Info } from "lucide-react";
import clsx from "clsx";
import Button from "@/components/ui/Button";
import CalculatorField, { type FieldDescriptor } from "./CalculatorField";
import { formatRub } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import type { ProductWithRelations } from "@/types";
import { trackEvent, EVENTS } from "@/lib/analytics";
import type { PriceCalculationResult } from "@/lib/data/catalog-demo";

type ProductCalculatorProps = {
  product: ProductWithRelations;
  className?: string;
};

/**
 * Универсальный клиентский калькулятор.
 * Читает product.calculator.fields[] и product.parameters[], строит форму
 * на их основе, вызывает POST /api/products/calculate (или при ошибке —
 * локальный demo-расчёт) при каждом изменении.
 */
export default function ProductCalculator({
  product,
  className,
}: ProductCalculatorProps) {
  const calc = product.calculator;
  const openQuote = useUIStore((s) => s.openQuote);
  const calcStarted = useRef(false);

  const fields: FieldDescriptor[] = useMemo(() => {
    const list: FieldDescriptor[] = [];
    const raw = Array.isArray(calc?.fields) ? (calc!.fields as FieldDescriptor[]) : [];
    list.push(...raw);
    // Append product_parameters (только те, что влияют на цену)
    for (const param of product.parameters ?? []) {
      if (!param.affects_price) continue;
      list.push({
        key: param.key,
        label: param.label,
        type: param.options?.length ? "select" : "number",
        options: param.options?.map((o) => ({
          value: o.value,
          label: o.label,
        })),
        default: param.default_value ?? undefined,
      });
    }
    return list;
  }, [calc, product.parameters]);

  const initialValues = useMemo(() => {
    const v: Record<string, string | number> = {};
    for (const f of fields) {
      if (f.default !== undefined) v[f.key] = f.default as string | number;
      else if (f.type === "number" && f.min !== undefined) v[f.key] = f.min;
    }
    return v;
  }, [fields]);

  const [values, setValues] = useState<Record<string, string | number>>(initialValues);
  const [result, setResult] = useState<PriceCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Начальный расчёт при монтировании
    calculate(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const calculate = (next: Record<string, string | number>) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/products/calculate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ product_id: product.id, params: next }),
        });
        if (res.ok) {
          const data = (await res.json()) as PriceCalculationResult;
          setResult(data);
          setError(null);
          trackEvent(EVENTS.calculator_result, { productId: product.id, total: data.total });
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      } catch {
        // Fallback — локально показываем базовую цену
        setResult({
          success: true,
          product_id: product.id,
          product_name: product.name,
          base_price: product.price,
          total: product.price,
          min_price: product.price,
          currency: "RUB",
          breakdown: [
            { label: "Базовая стоимость", value: "", price_delta: product.price },
          ],
          notes: calc?.notes ?? "Стартовая цена — уточнит менеджер",
        });
        setError("Расчёт временно недоступен. Показываем стартовую цену.");
      }
    });
  };

  const handleChange = (key: string, next: string | number) => {
    if (!calcStarted.current) {
      calcStarted.current = true;
      trackEvent(EVENTS.calculator_start, { productId: product.id, slug: product.slug });
    }
    setValues((prev) => {
      const merged = { ...prev, [key]: next };
      calculate(merged);
      return merged;
    });
  };

  const total = result?.total ?? product.price;
  const breakdown = result?.breakdown ?? [];
  const notes = result?.notes ?? calc?.notes;

  const handleQuote = () => {
    trackEvent('order_request_from_calculator', {
      productId: product.id,
      name: product.name,
      total,
    });
    openQuote({
      id: product.id,
      name: product.name,
      slug: product.slug,
      categoryId: product.category_id ?? undefined,
      prefillParams: { ...values, calculated_total: total },
    });
  };

  return (
    <section
      className={clsx(
        "flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm",
        className,
      )}
      aria-label="Калькулятор стоимости"
    >
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
          <CalcIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold text-brand-dark">
            Расчёт стоимости
          </h2>
          <p className="text-xs text-neutral-500">
            Изменение параметров обновляет цену автоматически
          </p>
        </div>
      </header>

      {fields.length > 0 && (
        <div className="flex flex-col gap-4">
          {fields.map((field) => (
            <CalculatorField
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(next) => handleChange(field.key, next)}
            />
          ))}
        </div>
      )}

      <div className="rounded-xl bg-surface-cream p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Итого
          </span>
          <span
            className={clsx(
              "font-display text-3xl font-bold tabular-nums text-brand-orange transition-opacity",
              pending && "opacity-50",
            )}
          >
            {formatRub(total)} ₽
          </span>
        </div>
        {breakdown.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-neutral-600">
            {breakdown.map((row, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>
                  {row.label}
                  {row.value ? `: ${row.value}` : ""}
                </span>
                <span className="font-semibold tabular-nums text-brand-dark">
                  {formatRub(Number(row.price_delta))} ₽
                </span>
              </li>
            ))}
          </ul>
        )}
        {notes && (
          <p className="mt-3 flex items-start gap-2 text-xs text-neutral-500">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-orange" />
            <span>{notes}</span>
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-[var(--color-danger)]">{error}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleQuote} className="flex-1">
          Заказать
        </Button>
      </div>
    </section>
  );
}
