"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Phone,
  Clock3,
  Share2,
  BarChart3,
  Search,
  Save,
  Loader2,
  ImageIcon,
  X,
  MapPin,
  Mail,
} from "lucide-react";
import clsx from "clsx";

import {
  contactsSettingSchema,
  businessHoursSettingSchema,
  socialsSettingSchema,
  statsSettingSchema,
  seoDefaultsSettingSchema,
} from "@/features/admin/schemas/site-settings";
import { updateSiteSettingAction } from "@/features/admin/actions/site-settings";
import AdminPageHeader from "./AdminPageHeader";

export interface SiteSettingsBundle {
  contacts: {
    phone_primary: string;
    phone_secondary?: string;
    email?: string;
    address?: string;
    address_geo?: { lat: number | null; lng: number | null };
  };
  business_hours: {
    weekdays?: string;
    weekend?: string;
    weekdays_short?: string;
    weekend_short?: string;
  };
  socials: { vk?: string; telegram?: string; dzen?: string };
  stats: {
    years_in_business?: number;
    projects_done?: number;
    clients_count?: number;
    cities_count?: number;
    regions?: string;
  };
  seo_defaults: {
    title_template?: string;
    default_description?: string;
    default_og_image?: string;
  };
}

const TABS = [
  { key: "contacts", label: "Контакты", icon: Phone },
  { key: "hours", label: "Часы работы", icon: Clock3 },
  { key: "socials", label: "Соцсети", icon: Share2 },
  { key: "stats", label: "Статистика", icon: BarChart3 },
  { key: "seo", label: "SEO", icon: Search },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SiteSettingsPageClient({
  initial,
}: {
  initial: SiteSettingsBundle;
}) {
  const [tab, setTab] = useState<TabKey>("contacts");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Настройки сайта"
        description="Контакты, часы работы, соцсети, статистика и SEO по умолчанию"
      />

      <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1 dark:border-white/10 dark:bg-white/[0.03]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-brand-dark shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === "contacts" && <ContactsForm defaults={initial.contacts} />}
        {tab === "hours" && <HoursForm defaults={initial.business_hours} />}
        {tab === "socials" && <SocialsForm defaults={initial.socials} />}
        {tab === "stats" && <StatsForm defaults={initial.stats} />}
        {tab === "seo" && <SeoForm defaults={initial.seo_defaults} />}
      </div>
    </div>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  error,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-neutral-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCn =
  "h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";

function SaveButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      Сохранить
    </button>
  );
}

// ── Контакты ──
function ContactsForm({ defaults }: { defaults: SiteSettingsBundle["contacts"] }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["contacts"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(contactsSettingSchema) as any,
    defaultValues: {
      phone_primary: defaults.phone_primary ?? "",
      phone_secondary: defaults.phone_secondary ?? "",
      email: defaults.email ?? "",
      address: defaults.address ?? "",
      address_geo: defaults.address_geo ?? { lat: null, lng: null },
    },
  });

  async function onSubmit(data: SiteSettingsBundle["contacts"]) {
    const res = await updateSiteSettingAction("contacts", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Контакты сохранены");
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Основной телефон *"
          error={errors.phone_primary?.message}
        >
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              {...register("phone_primary")}
              className={clsx(inputCn, "pl-9")}
              placeholder="+7-932-424-77-40"
            />
          </div>
        </Field>

        <Field label="Дополнительный телефон">
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              {...register("phone_secondary")}
              className={clsx(inputCn, "pl-9")}
              placeholder="+7-904-480-77-40"
            />
          </div>
        </Field>

        <Field label="Email">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              {...register("email")}
              type="email"
              className={clsx(inputCn, "pl-9")}
              placeholder="info@2x2hm.ru"
            />
          </div>
        </Field>

        <Field label="Адрес офиса">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              {...register("address")}
              className={clsx(inputCn, "pl-9")}
              placeholder="г. Ханты-Мансийск, ул. Парковая 92 Б"
            />
          </div>
        </Field>

        <Field label="Координаты — широта" hint="Опционально, для карты">
          <input
            type="number"
            step="any"
            {...register("address_geo.lat", {
              setValueAs: (v) =>
                v === "" || v === null || v === undefined ? null : Number(v),
            })}
            className={inputCn}
            placeholder="61.0042"
          />
        </Field>

        <Field label="Координаты — долгота" hint="Опционально, для карты">
          <input
            type="number"
            step="any"
            {...register("address_geo.lng", {
              setValueAs: (v) =>
                v === "" || v === null || v === undefined ? null : Number(v),
            })}
            className={inputCn}
            placeholder="69.0019"
          />
        </Field>

        <div className="sm:col-span-2">
          <SaveButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </FormCard>
  );
}

// ── Часы работы ──
function HoursForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["business_hours"];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["business_hours"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(businessHoursSettingSchema) as any,
    defaultValues: {
      weekdays: defaults.weekdays ?? "",
      weekend: defaults.weekend ?? "",
      weekdays_short: defaults.weekdays_short ?? "",
      weekend_short: defaults.weekend_short ?? "",
    },
  });

  async function onSubmit(data: SiteSettingsBundle["business_hours"]) {
    const res = await updateSiteSettingAction("business_hours", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Часы работы сохранены");
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Пн–Пт (полное)"
          hint="Например: 09:00–19:00"
          error={errors.weekdays?.message}
        >
          <input
            {...register("weekdays")}
            className={inputCn}
            placeholder="09:00–19:00"
          />
        </Field>

        <Field
          label="Сб–Вс (полное)"
          hint="Например: По телефону"
          error={errors.weekend?.message}
        >
          <input
            {...register("weekend")}
            className={inputCn}
            placeholder="По телефону"
          />
        </Field>

        <Field label="Будни (короткое)">
          <input
            {...register("weekdays_short")}
            className={inputCn}
            placeholder="Пн–Пт"
          />
        </Field>

        <Field label="Выходные (короткое)">
          <input
            {...register("weekend_short")}
            className={inputCn}
            placeholder="Сб–Вс"
          />
        </Field>

        <div className="sm:col-span-2">
          <SaveButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </FormCard>
  );
}

// ── Соцсети ──
function SocialsForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["socials"];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["socials"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(socialsSettingSchema) as any,
    defaultValues: {
      vk: defaults.vk ?? "",
      telegram: defaults.telegram ?? "",
      dzen: defaults.dzen ?? "",
    },
  });

  async function onSubmit(data: SiteSettingsBundle["socials"]) {
    const res = await updateSiteSettingAction("socials", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Соцсети сохранены");
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="ВКонтакте" error={errors.vk?.message}>
          <input
            type="url"
            {...register("vk")}
            className={inputCn}
            placeholder="https://vk.com/..."
          />
        </Field>
        <Field label="Telegram" error={errors.telegram?.message}>
          <input
            type="url"
            {...register("telegram")}
            className={inputCn}
            placeholder="https://t.me/..."
          />
        </Field>
        <Field label="Дзен" error={errors.dzen?.message}>
          <input
            type="url"
            {...register("dzen")}
            className={inputCn}
            placeholder="https://dzen.ru/..."
          />
        </Field>

        <SaveButton isSubmitting={isSubmitting} />
      </form>
    </FormCard>
  );
}

// ── Статистика ──
function StatsForm({ defaults }: { defaults: SiteSettingsBundle["stats"] }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["stats"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(statsSettingSchema) as any,
    defaultValues: {
      years_in_business: defaults.years_in_business ?? 0,
      projects_done: defaults.projects_done ?? 0,
      clients_count: defaults.clients_count ?? 0,
      cities_count: defaults.cities_count ?? 0,
      regions: defaults.regions ?? "",
    },
  });

  async function onSubmit(data: SiteSettingsBundle["stats"]) {
    const res = await updateSiteSettingAction("stats", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Статистика сохранена");
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Лет на рынке" error={errors.years_in_business?.message}>
          <input
            type="number"
            min={0}
            {...register("years_in_business", { valueAsNumber: true })}
            className={inputCn}
          />
        </Field>
        <Field label="Реализовано проектов" error={errors.projects_done?.message}>
          <input
            type="number"
            min={0}
            {...register("projects_done", { valueAsNumber: true })}
            className={inputCn}
          />
        </Field>
        <Field label="Клиентов" error={errors.clients_count?.message}>
          <input
            type="number"
            min={0}
            {...register("clients_count", { valueAsNumber: true })}
            className={inputCn}
          />
        </Field>
        <Field label="Городов" error={errors.cities_count?.message}>
          <input
            type="number"
            min={0}
            {...register("cities_count", { valueAsNumber: true })}
            className={inputCn}
          />
        </Field>
        <Field
          label="Регионы (текст)"
          hint='Например: "ХМАО, ЯНАО"'
          error={errors.regions?.message}
        >
          <input
            {...register("regions")}
            className={inputCn}
            placeholder="ХМАО, ЯНАО"
          />
        </Field>

        <div className="sm:col-span-2">
          <SaveButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </FormCard>
  );
}

// ── SEO defaults ──
function SeoForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["seo_defaults"];
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["seo_defaults"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(seoDefaultsSettingSchema) as any,
    defaultValues: {
      title_template: defaults.title_template ?? "",
      default_description: defaults.default_description ?? "",
      default_og_image: defaults.default_og_image ?? "",
    },
  });

  const ogImage = watch("default_og_image") ?? "";
  const [uploading, setUploading] = useState(false);

  async function onSubmit(data: SiteSettingsBundle["seo_defaults"]) {
    const res = await updateSiteSettingAction("seo_defaults", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("SEO сохранено");
  }

  async function uploadOg(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "images");
    fd.append("path", "uploads");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        toast.error("Ошибка загрузки");
        return;
      }
      const { url } = await res.json();
      setValue("default_og_image", url, { shouldValidate: true });
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  return (
    <FormCard>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label="Шаблон заголовков"
          hint='Используйте %s для подстановки названия страницы. Пример: "%s | 2х2 Ханты-Мансийск"'
          error={errors.title_template?.message}
        >
          <input
            {...register("title_template")}
            className={inputCn}
            placeholder="%s | Рекламная компания 2х2"
          />
        </Field>

        <Field
          label="Описание по умолчанию"
          hint="Используется как meta description, если у страницы нет своего"
          error={errors.default_description?.message}
        >
          <textarea
            {...register("default_description")}
            rows={3}
            className={clsx(inputCn, "h-auto py-2 leading-relaxed")}
            placeholder="Краткое описание сайта (160 символов рекомендуется)"
          />
        </Field>

        <Field label="OG-изображение по умолчанию">
          {ogImage ? (
            <div className="relative inline-block">
              <Image
                src={ogImage}
                alt="OG image"
                width={240}
                height={126}
                className="rounded-lg border border-neutral-200 object-cover dark:border-white/10"
              />
              <button
                type="button"
                onClick={() =>
                  setValue("default_og_image", "", { shouldValidate: true })
                }
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
                aria-label="Удалить"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex h-32 w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 transition-colors hover:border-brand-orange/50 hover:bg-brand-orange/5 dark:border-white/10 dark:bg-white/[0.02]">
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadOg(f);
                }}
              />
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
              ) : (
                <ImageIcon className="h-6 w-6 text-neutral-400" />
              )}
              <span className="text-xs text-neutral-500">
                Загрузить изображение (1200×630)
              </span>
            </label>
          )}
        </Field>

        <SaveButton isSubmitting={isSubmitting} />
      </form>
    </FormCard>
  );
}
