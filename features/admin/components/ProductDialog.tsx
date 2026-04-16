"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2, Trash2, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { productSchema, type ProductFormData } from "@/features/admin/schemas/product";
import { transliterate } from "@/lib/transliterate";
import {
  getProductByIdAction,
  createProductAction,
  updateProductAction,
} from "@/features/admin/actions/product-form";
import { fetchCategoriesFlatAction } from "@/features/admin/actions/categories";
import type { Row } from "@/lib/supabase/table-types";
import ImageUploader, { type ImageItem } from "./ImageUploader";
import RichTextEditor from "./RichTextEditor";
import SerpPreview from "./SerpPreview";

type CategoryFlat = Row<"categories">;

interface ProductDialogProps {
  productId?: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TABS = [
  { id: "general", label: "Основное" },
  { id: "pricing", label: "Цены и склад" },
  { id: "images", label: "Изображения" },
  { id: "variants", label: "Варианты" },
  { id: "attributes", label: "Характеристики" },
  { id: "seo", label: "SEO" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const defaultValues: ProductFormData = {
  name: "",
  slug: "",
  category_id: null,
  status: "draft",
  pricing_mode: "fixed",
  short_description: null,
  description: null,
  price: 0,
  old_price: null,
  cost_price: null,
  price_from: false,
  unit: null,
  sku: null,
  barcode: null,
  stock: 0,
  track_stock: true,
  weight: null,
  dimensions: null,
  brand: null,
  is_featured: false,
  is_new: false,
  is_on_sale: false,
  has_installation: false,
  lead_time_days: null,
  min_quantity: null,
  attributes: {},
  tags: [],
  seo_title: null,
  seo_description: null,
  seo_keywords: null,
  sort_order: 0,
  images: [],
  variants: [],
};

export default function ProductDialog({
  productId,
  open,
  onClose,
  onSaved,
}: ProductDialogProps) {
  const [tab, setTab] = useState<TabId>("general");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [attrKeys, setAttrKeys] = useState<{ key: string; value: string }[]>([]);

  const isEdit = typeof productId === "number";

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });

  const nameValue = watch("name");
  const slugValue = watch("slug");
  const seoTitle = watch("seo_title") ?? "";
  const seoDesc = watch("seo_description") ?? "";

  // Auto-slug from name
  useEffect(() => {
    if (!isEdit && nameValue && !slugValue) {
      setValue("slug", transliterate(nameValue));
    }
  }, [nameValue, isEdit, slugValue, setValue]);

  // Load categories
  useEffect(() => {
    if (open) {
      fetchCategoriesFlatAction().then(setCategories).catch(() => {});
    }
  }, [open]);

  // Load product data for editing
  useEffect(() => {
    if (!open) return;

    if (isEdit && productId) {
      setLoading(true);
      getProductByIdAction(productId)
        .then((product) => {
          if (!product) {
            toast.error("Товар не найден");
            onClose();
            return;
          }

          const attrs = (
            typeof product.attributes === "object" &&
            product.attributes !== null &&
            !Array.isArray(product.attributes)
          )
            ? product.attributes as Record<string, unknown>
            : {};

          const safeAttrs: Record<string, string | number | boolean | null> = {};
          const keys: { key: string; value: string }[] = [];
          for (const [k, v] of Object.entries(attrs)) {
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null) {
              safeAttrs[k] = v;
              keys.push({ key: k, value: String(v ?? "") });
            }
          }
          setAttrKeys(keys);

          const variantAttrs = (v: Row<"product_variants">) => {
            const a = (typeof v.attributes === "object" && v.attributes !== null && !Array.isArray(v.attributes))
              ? v.attributes as Record<string, unknown>
              : {};
            const result: Record<string, string | number | boolean | null> = {};
            for (const [k, val] of Object.entries(a)) {
              if (typeof val === "string" || typeof val === "number" || typeof val === "boolean" || val === null) {
                result[k] = val;
              }
            }
            return result;
          };

          reset({
            name: product.name,
            slug: product.slug,
            category_id: product.category_id,
            status: product.status,
            pricing_mode: product.pricing_mode,
            short_description: product.short_description,
            description: product.description,
            price: product.price,
            old_price: product.old_price,
            cost_price: product.cost_price,
            price_from: product.price_from,
            unit: product.unit,
            sku: product.sku,
            barcode: product.barcode,
            stock: product.stock,
            track_stock: product.track_stock,
            weight: product.weight,
            dimensions: product.dimensions as ProductFormData["dimensions"],
            brand: product.brand,
            is_featured: product.is_featured,
            is_new: product.is_new,
            is_on_sale: product.is_on_sale,
            has_installation: product.has_installation,
            lead_time_days: product.lead_time_days,
            min_quantity: null,
            attributes: safeAttrs,
            tags: product.tags,
            seo_title: product.seo_title,
            seo_description: product.seo_description,
            seo_keywords: product.seo_keywords,
            sort_order: product.sort_order,
            images: product.images.map((img) => ({
              id: img.id,
              url: img.url,
              alt_text: img.alt_text,
              sort_order: img.sort_order,
              is_primary: img.is_primary,
            })),
            variants: product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              old_price: v.old_price,
              stock: v.stock,
              attributes: variantAttrs(v),
              image_url: v.image_url,
              is_active: v.is_active,
              sort_order: v.sort_order,
            })),
          });
        })
        .catch(() => toast.error("Ошибка загрузки товара"))
        .finally(() => setLoading(false));
    } else {
      reset(defaultValues);
      setAttrKeys([]);
      setTab("general");
    }
  }, [open, productId, isEdit, reset, onClose]);

  async function onSubmit(data: ProductFormData) {
    // Rebuild attributes from attrKeys
    const attrs: Record<string, string | number | boolean | null> = {};
    for (const { key, value } of attrKeys) {
      if (key.trim()) attrs[key.trim()] = value;
    }
    data.attributes = attrs;

    setSaving(true);
    try {
      if (isEdit && productId) {
        await updateProductAction(productId, data);
        toast.success("Товар обновлён");
      } else {
        await createProductAction(data);
        toast.success("Товар создан");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ошибка сохранения",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-stretch justify-end"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative flex w-full max-w-3xl flex-col bg-white shadow-2xl dark:bg-neutral-950"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-white/10">
              <h2 className="text-lg font-bold text-brand-dark dark:text-white">
                {isEdit ? "Редактирование товара" : "Новый товар"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-1 flex-col overflow-hidden"
              >
                {/* Tabs */}
                <div className="flex gap-0.5 overflow-x-auto border-b border-neutral-200 px-6 dark:border-white/10">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={clsx(
                        "-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                        tab === t.id
                          ? "border-brand-orange text-brand-orange"
                          : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {/* General tab */}
                  {tab === "general" && (
                    <div className="space-y-5">
                      <Field label="Название *" error={errors.name?.message}>
                        <input
                          {...register("name")}
                          className={inputClass(!!errors.name)}
                          placeholder="Световые буквы"
                        />
                      </Field>
                      <Field label="Slug *" error={errors.slug?.message}>
                        <input
                          {...register("slug")}
                          className={inputClass(!!errors.slug)}
                          placeholder="svetovye-bukvy"
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Категория">
                          <select
                            {...register("category_id", { valueAsNumber: true })}
                            className={inputClass(false)}
                          >
                            <option value="">Без категории</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Статус">
                          <select {...register("status")} className={inputClass(false)}>
                            <option value="draft">Черновик</option>
                            <option value="active">Активный</option>
                            <option value="archived">Архив</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Режим цены">
                        <select {...register("pricing_mode")} className={inputClass(false)}>
                          <option value="fixed">Фиксированная</option>
                          <option value="calculator">Калькулятор</option>
                          <option value="quote">По запросу</option>
                        </select>
                      </Field>
                      <Field label="Краткое описание">
                        <textarea
                          {...register("short_description")}
                          rows={3}
                          className={inputClass(false) + " resize-y"}
                          placeholder="Краткое описание для каталога"
                        />
                      </Field>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500">
                          Описание
                        </label>
                        <Controller
                          name="description"
                          control={control}
                          render={({ field }) => (
                            <RichTextEditor
                              value={field.value ?? ""}
                              onChange={(val) => field.onChange(val)}
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Pricing tab */}
                  {tab === "pricing" && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Цена *" error={errors.price?.message}>
                          <input
                            type="number"
                            step="0.01"
                            {...register("price", { valueAsNumber: true })}
                            className={inputClass(!!errors.price)}
                            placeholder="0"
                          />
                        </Field>
                        <Field label="Старая цена">
                          <input
                            type="number"
                            step="0.01"
                            {...register("old_price", { valueAsNumber: true })}
                            className={inputClass(false)}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Себестоимость">
                          <input
                            type="number"
                            step="0.01"
                            {...register("cost_price", { valueAsNumber: true })}
                            className={inputClass(false)}
                          />
                        </Field>
                        <Field label="Единица">
                          <input
                            {...register("unit")}
                            className={inputClass(false)}
                            placeholder="шт., м², кв.м."
                          />
                        </Field>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...register("price_from")} className="accent-brand-orange" />
                          Цена «от»
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...register("track_stock")} className="accent-brand-orange" />
                          Учёт остатков
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <Field label="SKU">
                          <input {...register("sku")} className={inputClass(false)} />
                        </Field>
                        <Field label="Штрихкод">
                          <input {...register("barcode")} className={inputClass(false)} />
                        </Field>
                        <Field label="Остаток">
                          <input
                            type="number"
                            {...register("stock", { valueAsNumber: true })}
                            className={inputClass(false)}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Вес (кг)">
                          <input
                            type="number"
                            step="0.01"
                            {...register("weight", { valueAsNumber: true })}
                            className={inputClass(false)}
                          />
                        </Field>
                        <Field label="Бренд">
                          <input {...register("brand")} className={inputClass(false)} />
                        </Field>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...register("is_featured")} className="accent-brand-orange" />
                          Рекомендуемый
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...register("is_new")} className="accent-brand-orange" />
                          Новинка
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...register("is_on_sale")} className="accent-brand-orange" />
                          Распродажа
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" {...register("has_installation")} className="accent-brand-orange" />
                          Монтаж
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Images tab */}
                  {tab === "images" && (
                    <Controller
                      name="images"
                      control={control}
                      render={({ field }) => (
                        <ImageUploader
                          images={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  )}

                  {/* Variants tab */}
                  {tab === "variants" && (
                    <div className="space-y-4">
                      {variantFields.map((vf, idx) => (
                        <div
                          key={vf.id}
                          className="rounded-xl border border-neutral-200 p-4 dark:border-white/10"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-medium text-neutral-500">
                              Вариант {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Название *">
                              <input
                                {...register(`variants.${idx}.name`)}
                                className={inputClass(false)}
                                placeholder="Красный / Большой"
                              />
                            </Field>
                            <Field label="SKU">
                              <input
                                {...register(`variants.${idx}.sku`)}
                                className={inputClass(false)}
                              />
                            </Field>
                            <Field label="Цена">
                              <input
                                type="number"
                                step="0.01"
                                {...register(`variants.${idx}.price`, { valueAsNumber: true })}
                                className={inputClass(false)}
                              />
                            </Field>
                            <Field label="Остаток">
                              <input
                                type="number"
                                {...register(`variants.${idx}.stock`, { valueAsNumber: true })}
                                className={inputClass(false)}
                              />
                            </Field>
                          </div>
                          <div className="mt-3">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                {...register(`variants.${idx}.is_active`)}
                                className="accent-brand-orange"
                              />
                              Активен
                            </label>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          appendVariant({
                            name: "",
                            sku: null,
                            price: null,
                            old_price: null,
                            stock: 0,
                            attributes: {},
                            image_url: null,
                            is_active: true,
                            sort_order: variantFields.length,
                          })
                        }
                        className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:border-brand-orange hover:text-brand-orange dark:border-white/10"
                      >
                        <Plus className="h-4 w-4" />
                        Добавить вариант
                      </button>
                    </div>
                  )}

                  {/* Attributes tab */}
                  {tab === "attributes" && (
                    <div className="space-y-4">
                      {attrKeys.map((attr, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <input
                            value={attr.key}
                            onChange={(e) => {
                              const next = [...attrKeys];
                              next[idx] = { ...next[idx], key: e.target.value };
                              setAttrKeys(next);
                            }}
                            className={inputClass(false)}
                            placeholder="Ключ (напр. Материал)"
                          />
                          <input
                            value={attr.value}
                            onChange={(e) => {
                              const next = [...attrKeys];
                              next[idx] = { ...next[idx], value: e.target.value };
                              setAttrKeys(next);
                            }}
                            className={inputClass(false)}
                            placeholder="Значение"
                          />
                          <button
                            type="button"
                            onClick={() => setAttrKeys(attrKeys.filter((_, i) => i !== idx))}
                            className="shrink-0 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAttrKeys([...attrKeys, { key: "", value: "" }])}
                        className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:border-brand-orange hover:text-brand-orange dark:border-white/10"
                      >
                        <Plus className="h-4 w-4" />
                        Добавить характеристику
                      </button>
                    </div>
                  )}

                  {/* SEO tab */}
                  {tab === "seo" && (
                    <div className="space-y-5">
                      <Field
                        label={`SEO заголовок (${(seoTitle ?? "").length}/60)`}
                      >
                        <input
                          {...register("seo_title")}
                          maxLength={60}
                          className={inputClass(false)}
                          placeholder="Заголовок для поисковых систем"
                        />
                      </Field>
                      <Field
                        label={`SEO описание (${(seoDesc ?? "").length}/160)`}
                      >
                        <textarea
                          {...register("seo_description")}
                          maxLength={160}
                          rows={3}
                          className={inputClass(false) + " resize-y"}
                          placeholder="Описание для поисковых систем"
                        />
                      </Field>
                      <Field label="Ключевые слова">
                        <input
                          {...register("seo_keywords")}
                          className={inputClass(false)}
                          placeholder="ключ1, ключ2, ключ3"
                        />
                      </Field>
                      <SerpPreview
                        title={seoTitle || watch("name")}
                        description={seoDesc || watch("short_description") || ""}
                        slug={slugValue}
                      />
                    </div>
                  )}
                </div>

                {/* Sticky footer */}
                <div className="flex items-center justify-between border-t border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur-md dark:border-white/10 dark:bg-neutral-950/95">
                  <div>
                    {isEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          // Delete handled via ProductsPageClient
                          onClose();
                        }}
                        className="text-sm text-red-500 hover:text-red-600"
                      >
                        Удалить товар
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-50"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      {isEdit ? "Сохранить" : "Создать"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Helper components ──

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return clsx(
    "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors",
    "focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
    "dark:text-white dark:placeholder:text-neutral-500",
    hasError
      ? "border-red-500"
      : "border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20",
  );
}
