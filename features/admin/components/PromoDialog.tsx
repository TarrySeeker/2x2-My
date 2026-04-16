"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { X, RefreshCw, Check, AlertCircle, Loader2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import {
  promoSchema,
  type PromoFormData,
} from "@/features/admin/schemas/promo";
import {
  createPromoCodeAction,
  updatePromoCodeAction,
  checkCodeUniquenessAction,
} from "@/features/admin/actions/promos";
import { generateCode } from "@/features/admin/utils/promo-code-generator";

interface PromoDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editData?: {
    id: number;
    code: string;
    description: string | null;
    type: "fixed" | "percent";
    value: number;
    min_order_amount: number | null;
    max_discount_amount: number | null;
    max_uses: number | null;
    is_active: boolean;
    valid_from: string | null;
    valid_to: string | null;
  } | null;
}

export default function PromoDialog({
  open,
  onClose,
  onSaved,
  editData,
}: PromoDialogProps) {
  const isEdit = !!editData;
  const [saving, setSaving] = useState(false);
  const [codeStatus, setCodeStatus] = useState<
    "idle" | "checking" | "unique" | "taken"
  >("idle");
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PromoFormData>({
    resolver: zodResolver(promoSchema),
    defaultValues: {
      code: "",
      description: "",
      type: "fixed",
      value: 0,
      min_order_amount: null,
      max_discount_amount: null,
      max_uses: null,
      is_active: true,
      valid_from: null,
      valid_to: null,
    },
  });

  const promoType = watch("type");
  const codeValue = watch("code");

  // Reset form when dialog opens/data changes
  useEffect(() => {
    if (!open) return;
    if (editData) {
      reset({
        code: editData.code,
        description: editData.description ?? "",
        type: editData.type,
        value: editData.value,
        min_order_amount: editData.min_order_amount,
        max_discount_amount: editData.max_discount_amount,
        max_uses: editData.max_uses,
        is_active: editData.is_active,
        valid_from: editData.valid_from
          ? editData.valid_from.slice(0, 10)
          : null,
        valid_to: editData.valid_to ? editData.valid_to.slice(0, 10) : null,
      });
      setCodeStatus("idle");
    } else {
      reset({
        code: "",
        description: "",
        type: "fixed",
        value: 0,
        min_order_amount: null,
        max_discount_amount: null,
        max_uses: null,
        is_active: true,
        valid_from: null,
        valid_to: null,
      });
      setCodeStatus("idle");
    }
  }, [open, editData, reset]);

  // Debounced code uniqueness check
  const checkUniqueness = useCallback(
    (code: string) => {
      clearTimeout(checkTimerRef.current);
      if (!code || code.length < 3) {
        setCodeStatus("idle");
        return;
      }
      // If editing and code hasn't changed, skip check
      if (isEdit && editData && code.toUpperCase() === editData.code) {
        setCodeStatus("unique");
        return;
      }
      setCodeStatus("checking");
      checkTimerRef.current = setTimeout(async () => {
        try {
          const result = await checkCodeUniquenessAction({ code });
          if (result.success && result.data) {
            setCodeStatus(result.data.isUnique ? "unique" : "taken");
          }
        } catch {
          setCodeStatus("idle");
        }
      }, 500);
    },
    [isEdit, editData],
  );

  useEffect(() => {
    checkUniqueness(codeValue);
    return () => clearTimeout(checkTimerRef.current);
  }, [codeValue, checkUniqueness]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function onSubmit(data: PromoFormData) {
    if (codeStatus === "taken") {
      toast.error("Код уже используется");
      return;
    }
    setSaving(true);
    try {
      const result = isEdit
        ? await updatePromoCodeAction(editData!.id, data)
        : await createPromoCodeAction(data);

      if (result.success) {
        toast.success(isEdit ? "Промокод обновлён" : "Промокод создан");
        onSaved();
        onClose();
      } else {
        toast.error(result.error ?? "Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  function handleGenerateCode() {
    const code = generateCode();
    setValue("code", code, { shouldValidate: true });
  }

  const inputClass = clsx(
    "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors",
    "border-neutral-200 hover:border-neutral-300 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
    "dark:border-white/10 dark:text-white dark:placeholder:text-neutral-500 dark:hover:border-white/20 dark:focus:border-brand-orange",
  );

  const labelClass =
    "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5";

  const errorClass = "mt-1 text-xs text-red-500";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              "relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl",
              "bg-white dark:bg-neutral-900 dark:border dark:border-white/10",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-brand-dark dark:text-white">
                {isEdit ? "Редактировать промокод" : "Новый промокод"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Code */}
              <div>
                <label className={labelClass}>Код промокода</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      {...register("code")}
                      placeholder="SALE2024"
                      className={clsx(inputClass, "font-mono uppercase pr-8")}
                    />
                    {/* Uniqueness indicator */}
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {codeStatus === "checking" && (
                        <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                      )}
                      {codeStatus === "unique" && (
                        <Check className="h-4 w-4 text-emerald-500" />
                      )}
                      {codeStatus === "taken" && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className={clsx(
                      "flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors",
                      "border-neutral-200 text-neutral-600 hover:bg-neutral-50",
                      "dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5",
                    )}
                    title="Сгенерировать код"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Создать</span>
                  </button>
                </div>
                {errors.code && (
                  <p className={errorClass}>{errors.code.message}</p>
                )}
                {codeStatus === "taken" && (
                  <p className={errorClass}>Этот код уже существует</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>Описание (необязательно)</label>
                <input
                  {...register("description")}
                  placeholder="Новогодняя акция..."
                  className={inputClass}
                />
              </div>

              {/* Type + Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Тип скидки</label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <div className="flex rounded-lg border border-neutral-200 dark:border-white/10 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => field.onChange("fixed")}
                          className={clsx(
                            "flex-1 py-2.5 text-sm font-medium transition-colors",
                            field.value === "fixed"
                              ? "bg-brand-orange text-white"
                              : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5",
                          )}
                        >
                          Фикс. ₽
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("percent")}
                          className={clsx(
                            "flex-1 py-2.5 text-sm font-medium transition-colors",
                            field.value === "percent"
                              ? "bg-brand-orange text-white"
                              : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-white/5",
                          )}
                        >
                          %
                        </button>
                      </div>
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Значение{" "}
                    {promoType === "percent" ? "(%, 1–100)" : "(₽)"}
                  </label>
                  <Controller
                    control={control}
                    name="value"
                    render={({ field }) => (
                      <input
                        type="number"
                        step={promoType === "percent" ? 1 : 0.01}
                        min={promoType === "percent" ? 1 : 0.01}
                        max={promoType === "percent" ? 100 : undefined}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : 0,
                          )
                        }
                        className={inputClass}
                        placeholder={promoType === "percent" ? "10" : "500"}
                      />
                    )}
                  />
                  {errors.value && (
                    <p className={errorClass}>{errors.value.message}</p>
                  )}
                </div>
              </div>

              {/* Max discount (only for percent) */}
              {promoType === "percent" && (
                <div>
                  <label className={labelClass}>
                    Макс. скидка, ₽ (необязательно)
                  </label>
                  <Controller
                    control={control}
                    name="max_discount_amount"
                    render={({ field }) => (
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className={inputClass}
                        placeholder="1000"
                      />
                    )}
                  />
                </div>
              )}

              {/* Min order + Max uses */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Мин. сумма заказа, ₽</label>
                  <Controller
                    control={control}
                    name="min_order_amount"
                    render={({ field }) => (
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className={inputClass}
                        placeholder="Без ограничений"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Макс. использований</label>
                  <Controller
                    control={control}
                    name="max_uses"
                    render={({ field }) => (
                      <input
                        type="number"
                        step={1}
                        min={0}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className={inputClass}
                        placeholder="0 = безлимит"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Начало действия</label>
                  <Controller
                    control={control}
                    name="valid_from"
                    render={({ field }) => (
                      <input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                        className={inputClass}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Конец действия</label>
                  <Controller
                    control={control}
                    name="valid_to"
                    render={({ field }) => (
                      <input
                        type="date"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value || null)
                        }
                        className={inputClass}
                      />
                    )}
                  />
                  {errors.valid_to && (
                    <p className={errorClass}>{errors.valid_to.message}</p>
                  )}
                </div>
              </div>

              {/* Active switch */}
              <div className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-3 dark:border-white/10">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Промокод активен
                </span>
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={field.value}
                      onClick={() => field.onChange(!field.value)}
                      className={clsx(
                        "relative h-6 w-11 rounded-full transition-colors",
                        field.value
                          ? "bg-brand-orange"
                          : "bg-neutral-300 dark:bg-white/20",
                      )}
                    >
                      <span
                        className={clsx(
                          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          field.value && "translate-x-5",
                        )}
                      />
                    </button>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className={clsx(
                    "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                    "dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15",
                  )}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving || codeStatus === "taken"}
                  className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  {saving && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
