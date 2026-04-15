"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import RadioTile from "@/components/ui/RadioTile";
import QuantityStepper from "@/components/ui/QuantityStepper";
import RangeSlider from "@/components/ui/RangeSlider";

export type FieldDescriptor = {
  key: string;
  label: string;
  type?: "number" | "select" | "radio" | "stepper" | "slider";
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: string | number;
  options?: {
    value: string | number;
    label: string;
    hint?: string;
    price?: number;
  }[];
};

type CalculatorFieldProps = {
  field: FieldDescriptor;
  value: string | number | undefined;
  onChange: (next: string | number) => void;
};

export default function CalculatorField({ field, value, onChange }: CalculatorFieldProps) {
  const type = field.type ?? (field.options ? "select" : "number");

  if (type === "radio" && field.options) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {field.label}
        </span>
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options.map((opt) => (
            <RadioTile
              key={String(opt.value)}
              name={field.key}
              value={String(opt.value)}
              checked={String(value ?? "") === String(opt.value)}
              onChange={() => onChange(opt.value)}
              label={opt.label}
              hint={opt.hint}
              rightSlot={
                typeof opt.price === "number"
                  ? `${new Intl.NumberFormat("ru-RU").format(opt.price)} ₽`
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "select" && field.options) {
    return (
      <Select
        label={field.label}
        name={field.key}
        value={String(value ?? field.default ?? "")}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </Select>
    );
  }

  if (type === "stepper") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {field.label}
        </span>
        <QuantityStepper
          value={Number(value ?? field.default ?? field.min ?? 1)}
          onChange={(v) => onChange(v)}
          min={field.min ?? 1}
          max={field.max}
          step={field.step ?? 1}
        />
      </div>
    );
  }

  if (type === "slider") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          <span>{field.label}</span>
          <span className="tabular-nums text-brand-orange">
            {String(value ?? field.default ?? field.min ?? 0)}
            {field.unit ? ` ${field.unit}` : ""}
          </span>
        </div>
        <RangeSlider
          value={Number(value ?? field.default ?? field.min ?? 0)}
          onChange={(v) => onChange(v)}
          min={field.min ?? 0}
          max={field.max ?? 100}
          step={field.step ?? 1}
        />
      </div>
    );
  }

  // number default
  return (
    <Input
      label={field.label}
      type="number"
      name={field.key}
      value={String(value ?? field.default ?? field.min ?? "")}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? "" : Number(raw));
      }}
      min={field.min}
      max={field.max}
      step={field.step}
      hint={field.unit ? `в единицах: ${field.unit}` : undefined}
    />
  );
}
