"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import {
  generalSettingsSchema,
  legalSettingsSchema,
  brandingSettingsSchema,
  deliverySettingsSchema,
  promoBarSettingsSchema,
  type GeneralSettingsData,
  type LegalSettingsData,
  type BrandingSettingsData,
  type DeliverySettingsData,
  type PromoBarSettingsData,
} from "@/features/admin/schemas/settings";
import { updateSettingsAction } from "@/features/admin/actions/settings";
import AdminPageHeader from "./AdminPageHeader";

const TABS = [
  { key: "general", label: "Общие" },
  { key: "legal", label: "Юр. данные" },
  { key: "branding", label: "Брендинг" },
  { key: "delivery", label: "Доставка" },
  { key: "promo", label: "Промо-бар" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface SettingsPageClientProps {
  settings: Record<string, unknown>;
}

function getSettingString(
  settings: Record<string, unknown>,
  key: string,
): string {
  const val = settings[key];
  return typeof val === "string" ? val : "";
}

function getSettingNumber(
  settings: Record<string, unknown>,
  key: string,
): number {
  const val = settings[key];
  return typeof val === "number" ? val : 0;
}

function getSettingBool(
  settings: Record<string, unknown>,
  key: string,
): boolean {
  const val = settings[key];
  return typeof val === "boolean" ? val : false;
}

export default function SettingsPageClient({
  settings,
}: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [uploading, setUploading] = useState(false);

  // General
  const generalForm = useForm<GeneralSettingsData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      store_name: getSettingString(settings, "store_name"),
      store_description: getSettingString(settings, "store_description"),
      store_phone: getSettingString(settings, "store_phone"),
      store_email: getSettingString(settings, "store_email"),
      store_address: getSettingString(settings, "store_address"),
      working_hours: getSettingString(settings, "working_hours"),
    },
  });

  // Legal
  const legalForm = useForm<LegalSettingsData>({
    resolver: zodResolver(legalSettingsSchema),
    defaultValues: {
      legal_name: getSettingString(settings, "legal_name"),
      legal_inn: getSettingString(settings, "legal_inn"),
      legal_ogrn: getSettingString(settings, "legal_ogrn"),
      legal_address: getSettingString(settings, "legal_address"),
    },
  });

  // Branding
  const brandingForm = useForm<BrandingSettingsData>({
    resolver: zodResolver(brandingSettingsSchema),
    defaultValues: {
      logo_url: getSettingString(settings, "logo_url"),
      favicon_url: getSettingString(settings, "favicon_url"),
      social_vk: getSettingString(settings, "social_vk"),
      social_telegram: getSettingString(settings, "social_telegram"),
      social_whatsapp: getSettingString(settings, "social_whatsapp"),
    },
  });

  const logoUrl = brandingForm.watch("logo_url");
  const faviconUrl = brandingForm.watch("favicon_url");

  // Delivery
  const deliveryForm = useForm<DeliverySettingsData>({
    resolver: zodResolver(deliverySettingsSchema),
    defaultValues: {
      cdek_from_city: getSettingString(settings, "cdek_from_city"),
      cdek_from_city_code: getSettingNumber(settings, "cdek_from_city_code"),
      free_delivery_threshold: getSettingNumber(settings, "free_delivery_threshold"),
    },
  });

  // Promo
  const promoForm = useForm<PromoBarSettingsData>({
    resolver: zodResolver(promoBarSettingsSchema),
    defaultValues: {
      promo_bar_text: getSettingString(settings, "promo_bar_text"),
      promo_bar_link: getSettingString(settings, "promo_bar_link"),
      promo_bar_active: getSettingBool(settings, "promo_bar_active"),
    },
  });

  const promoText = promoForm.watch("promo_bar_text");
  const promoActive = promoForm.watch("promo_bar_active");

  async function saveTab(data: Record<string, unknown>) {
    const updates = Object.entries(data)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) => ({ key, value: value as unknown }));

    if (updates.length === 0) return;

    try {
      await updateSettingsAction(updates);
      toast.success("Настройки сохранены");
    } catch {
      toast.error("Ошибка сохранения");
    }
  }

  async function handleUpload(
    file: File,
    field: "logo_url" | "favicon_url",
  ) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "images");
    formData.append("path", "branding");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        toast.error("Ошибка загрузки");
        return;
      }
      const { url } = await res.json();
      brandingForm.setValue(field, url);
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  function renderInput(
    label: string,
    registerReturn: UseFormRegisterReturn<string>,
    opts?: { type?: string; placeholder?: string },
  ) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-dark dark:text-neutral-300">
          {label}
        </label>
        <input
          {...registerReturn}
          type={opts?.type ?? "text"}
          placeholder={opts?.placeholder}
          className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
        />
      </div>
    );
  }

  function renderImageField(
    label: string,
    url: string | undefined,
    field: "logo_url" | "favicon_url",
  ) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-brand-dark dark:text-neutral-300">
          {label}
        </label>
        {url ? (
          <div className="relative inline-block">
            <Image
              src={url}
              alt={label}
              width={120}
              height={60}
              className="rounded-lg border border-neutral-200 object-contain dark:border-white/10"
            />
            <button
              type="button"
              onClick={() => brandingForm.setValue(field, "")}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="flex h-16 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 dark:border-white/10">
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, field);
              }}
            />
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand-orange" />
            ) : (
              <ImageIcon className="h-5 w-5 text-neutral-400" />
            )}
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Настройки" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-brand-dark shadow-sm dark:bg-white/10 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === "general" && (
        <form
          onSubmit={generalForm.handleSubmit((data) => saveTab(data))}
          className="max-w-xl space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-white/10"
        >
          {renderInput("Название магазина", generalForm.register("store_name"))}
          {renderInput("Описание", generalForm.register("store_description"))}
          {renderInput("Телефон", generalForm.register("store_phone"), {
            placeholder: "+7-932-424-77-40",
          })}
          {renderInput("Email", generalForm.register("store_email"), {
            type: "email",
          })}
          {renderInput("Адрес", generalForm.register("store_address"))}
          {renderInput("Часы работы", generalForm.register("working_hours"), {
            placeholder: "Пн–Пт 09:00–19:00",
          })}
          <button
            type="submit"
            disabled={generalForm.formState.isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            {generalForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить
          </button>
        </form>
      )}

      {/* Legal */}
      {activeTab === "legal" && (
        <form
          onSubmit={legalForm.handleSubmit((data) => saveTab(data))}
          className="max-w-xl space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-white/10"
        >
          {renderInput("Юр. название", legalForm.register("legal_name"))}
          {renderInput("ИНН", legalForm.register("legal_inn"))}
          {renderInput("ОГРН", legalForm.register("legal_ogrn"))}
          {renderInput("Юр. адрес", legalForm.register("legal_address"))}
          <button
            type="submit"
            disabled={legalForm.formState.isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            {legalForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить
          </button>
        </form>
      )}

      {/* Branding */}
      {activeTab === "branding" && (
        <form
          onSubmit={brandingForm.handleSubmit((data) => saveTab(data))}
          className="max-w-xl space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-white/10"
        >
          <div className="grid grid-cols-2 gap-4">
            {renderImageField("Логотип", logoUrl, "logo_url")}
            {renderImageField("Favicon", faviconUrl, "favicon_url")}
          </div>
          {renderInput("VK", brandingForm.register("social_vk"), {
            placeholder: "https://vk.com/...",
          })}
          {renderInput("Telegram", brandingForm.register("social_telegram"), {
            placeholder: "https://t.me/...",
          })}
          {renderInput("WhatsApp", brandingForm.register("social_whatsapp"), {
            placeholder: "https://wa.me/...",
          })}
          <button
            type="submit"
            disabled={brandingForm.formState.isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            {brandingForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить
          </button>
        </form>
      )}

      {/* Delivery */}
      {activeTab === "delivery" && (
        <form
          onSubmit={deliveryForm.handleSubmit((data) => saveTab(data))}
          className="max-w-xl space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-white/10"
        >
          {renderInput("Город СДЭК", deliveryForm.register("cdek_from_city"), {
            placeholder: "Ханты-Мансийск",
          })}
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark dark:text-neutral-300">
              Код города СДЭК
            </label>
            <input
              {...deliveryForm.register("cdek_from_city_code", {
                valueAsNumber: true,
              })}
              type="number"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark dark:text-neutral-300">
              Порог бесплатной доставки (₽)
            </label>
            <input
              {...deliveryForm.register("free_delivery_threshold", {
                valueAsNumber: true,
              })}
              type="number"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={deliveryForm.formState.isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            {deliveryForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить
          </button>
        </form>
      )}

      {/* Promo Bar */}
      {activeTab === "promo" && (
        <form
          onSubmit={promoForm.handleSubmit((data) => saveTab(data))}
          className="max-w-xl space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-white/10"
        >
          {renderInput("Текст промо-бара", promoForm.register("promo_bar_text"))}
          {renderInput("Ссылка", promoForm.register("promo_bar_link"))}
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              {...promoForm.register("promo_bar_active")}
              className="h-4 w-4 rounded accent-brand-orange"
            />
            Активен
          </label>

          {/* Preview */}
          {promoText && (
            <div className="rounded-lg border border-neutral-200 p-3 dark:border-white/10">
              <p className="mb-1 text-xs text-neutral-500">Предпросмотр:</p>
              <div
                className={clsx(
                  "rounded-lg px-4 py-2 text-center text-sm font-medium",
                  promoActive
                    ? "bg-brand-orange text-white"
                    : "bg-neutral-200 text-neutral-500 dark:bg-white/10 dark:text-neutral-400",
                )}
              >
                {promoText}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={promoForm.formState.isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            {promoForm.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить
          </button>
        </form>
      )}
    </div>
  );
}
