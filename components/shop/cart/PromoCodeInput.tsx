// TODO(3.2): заменить статическую проверку на /api/promo/validate, сейчас магический код "2X2" = 500₽
"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useCartStore } from "@/store/cart";
import { trackEvent, EVENTS } from "@/lib/analytics";

export default function PromoCodeInput() {
  const promoCode = useCartStore((s) => s.promoCode);
  const setPromo = useCartStore((s) => s.setPromo);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    const code = value.trim().toUpperCase();
    if (!code) return;

    if (code === "2X2") {
      setPromo("2X2", 500);
      setError(null);
      setValue("");
      trackEvent(EVENTS.promo_apply, { code, success: true });
    } else {
      setError("Промокод не найден");
      trackEvent(EVENTS.promo_apply, { code, success: false });
    }
  };

  const handleRemove = () => {
    setPromo(null, 0);
    setValue("");
    setError(null);
  };

  if (promoCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-green-700">
          <Tag className="h-4 w-4" />
          <span>
            Применён: <strong>{promoCode}</strong> (−500 ₽)
          </span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Убрать промокод"
          className="flex h-6 w-6 items-center justify-center rounded-full text-green-600 hover:bg-green-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleApply();
        }}
        className="flex items-start gap-2"
      >
        <Input
          placeholder="Промокод"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          leftSlot={<Tag className="h-4 w-4" />}
          containerClassName="flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={!value.trim()}
          className="mt-px h-[46px]"
        >
          Применить
        </Button>
      </form>
      {error && (
        <p className="text-xs font-medium text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
