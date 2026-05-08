"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
  Building2,
  Landmark,
  Menu as MenuIcon,
  LayoutGrid,
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";

import {
  contactsSettingSchema,
  businessHoursSettingSchema,
  socialsSettingSchema,
  statsSettingSchema,
  seoDefaultsSettingSchema,
  legalEntitySettingSchema,
  organizationSettingSchema,
  navigationHeaderSettingSchema,
  navigationFooterSettingSchema,
  homepageTrustBarSettingSchema,
} from "@/features/admin/schemas/site-settings";
import { updateSiteSettingAction } from "@/features/admin/actions/site-settings";
import AdminPageHeader from "./AdminPageHeader";
import TagsInput from "./TagsInput";

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
  socials: { vk?: string; telegram?: string; dzen?: string; max?: string };
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
  legal_entity: {
    legal_name?: string;
    inn?: string;
    ogrn?: string;
    kpp?: string;
    legal_address?: string;
    actual_address?: string;
    ceo_name?: string;
    bank_account?: string;
    bank_name?: string;
    bik?: string;
  };
  organization: {
    name: string;
    short_name?: string;
    legal_name?: string;
    slogan?: string;
    description?: string;
    short_description?: string;
    locale?: string;
    language?: string;
    theme_color?: string;
    og_image?: string;
    founding_year?: number;
    price_range?: string;
    area_served?: string[];
    keywords_global?: string[];
  };
  navigation_header: {
    items: Array<{
      href: string;
      label: string;
      order: number;
      visible: boolean;
    }>;
  };
  navigation_footer: {
    columns: Array<{
      title: string;
      items: Array<{ href: string; label: string }>;
    }>;
  };
  homepage_trust_bar: {
    text?: string;
    clients: Array<{ name: string; logo: string }>;
  };
}

const TABS = [
  { key: "organization", label: "Организация", icon: Landmark },
  { key: "contacts", label: "Контакты", icon: Phone },
  { key: "hours", label: "Часы работы", icon: Clock3 },
  { key: "socials", label: "Соцсети", icon: Share2 },
  { key: "stats", label: "Статистика", icon: BarChart3 },
  { key: "seo", label: "SEO", icon: Search },
  { key: "legal", label: "Реквизиты", icon: Building2 },
  { key: "navigation", label: "Навигация", icon: MenuIcon },
  { key: "footer", label: "Футер", icon: LayoutGrid },
  { key: "trust_bar", label: "Клиенты", icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SiteSettingsPageClient({
  initial,
}: {
  initial: SiteSettingsBundle;
}) {
  const [tab, setTab] = useState<TabKey>("organization");

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Настройки сайта"
        description="Организация, контакты, навигация, SEO, реквизиты и другие глобальные параметры"
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
        {tab === "organization" && (
          <OrganizationForm defaults={initial.organization} />
        )}
        {tab === "contacts" && <ContactsForm defaults={initial.contacts} />}
        {tab === "hours" && <HoursForm defaults={initial.business_hours} />}
        {tab === "socials" && <SocialsForm defaults={initial.socials} />}
        {tab === "stats" && <StatsForm defaults={initial.stats} />}
        {tab === "seo" && <SeoForm defaults={initial.seo_defaults} />}
        {tab === "legal" && <LegalEntityForm defaults={initial.legal_entity} />}
        {tab === "navigation" && (
          <NavigationHeaderForm defaults={initial.navigation_header} />
        )}
        {tab === "footer" && (
          <NavigationFooterForm defaults={initial.navigation_footer} />
        )}
        {tab === "trust_bar" && (
          <TrustBarForm defaults={initial.homepage_trust_bar} />
        )}
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
      max: defaults.max ?? "",
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
        <Field
          label="MAX"
          hint="Российский мессенджер max.ru — ссылка на канал/профиль"
          error={errors.max?.message}
        >
          <input
            type="url"
            {...register("max")}
            className={inputCn}
            placeholder="https://max.ru/..."
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

// ── Реквизиты (юр. лицо) ──
function LegalEntityForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["legal_entity"];
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["legal_entity"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(legalEntitySettingSchema) as any,
    defaultValues: {
      legal_name: defaults.legal_name ?? "",
      inn: defaults.inn ?? "",
      ogrn: defaults.ogrn ?? "",
      kpp: defaults.kpp ?? "",
      legal_address: defaults.legal_address ?? "",
      actual_address: defaults.actual_address ?? "",
      ceo_name: defaults.ceo_name ?? "",
      bank_account: defaults.bank_account ?? "",
      bank_name: defaults.bank_name ?? "",
      bik: defaults.bik ?? "",
    },
  });

  async function onSubmit(data: SiteSettingsBundle["legal_entity"]) {
    const res = await updateSiteSettingAction("legal_entity", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Реквизиты сохранены");
  }

  return (
    <FormCard>
      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
        Юридические реквизиты используются на странице{" "}
        <span className="font-semibold">/privacy</span>, в футере сайта и в
        коммерческих документах. Все поля опциональные — пустые не будут
        отображаться. Для ИНН, ОГРН, КПП, БИК и расчётного счёта принимаются
        только цифры фиксированной длины.
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field
          label="Юридическое название"
          hint='Например: ООО «Рекламная компания 2х2» или ИП Иванов И.И.'
          error={errors.legal_name?.message}
        >
          <input
            {...register("legal_name")}
            maxLength={300}
            className={inputCn}
            placeholder='ООО «Рекламная компания 2х2»'
          />
        </Field>

        <Field
          label="ФИО директора"
          hint="Используется в договорах"
          error={errors.ceo_name?.message}
        >
          <input
            {...register("ceo_name")}
            maxLength={200}
            className={inputCn}
            placeholder="Иванов Иван Иванович"
          />
        </Field>

        <Field
          label="ИНН"
          hint="10 цифр для юрлиц, 12 цифр для ИП"
          error={errors.inn?.message}
        >
          <input
            {...register("inn")}
            inputMode="numeric"
            pattern="\d*"
            maxLength={12}
            className={inputCn}
            placeholder="1234567890"
          />
        </Field>

        <Field
          label="ОГРН / ОГРНИП"
          hint="13 цифр — ОГРН (ЮЛ), 15 цифр — ОГРНИП (ИП)"
          error={errors.ogrn?.message}
        >
          <input
            {...register("ogrn")}
            inputMode="numeric"
            pattern="\d*"
            maxLength={15}
            className={inputCn}
            placeholder="1234567890123"
          />
        </Field>

        <Field
          label="КПП"
          hint="9 цифр, только для юрлиц. У ИП — отсутствует"
          error={errors.kpp?.message}
        >
          <input
            {...register("kpp")}
            inputMode="numeric"
            pattern="\d*"
            maxLength={9}
            className={inputCn}
            placeholder="123456789"
          />
        </Field>

        <Field label="БИК банка" hint="9 цифр" error={errors.bik?.message}>
          <input
            {...register("bik")}
            inputMode="numeric"
            pattern="\d*"
            maxLength={9}
            className={inputCn}
            placeholder="044525225"
          />
        </Field>

        <Field
          label="Юридический адрес"
          hint="По свидетельству о регистрации"
          error={errors.legal_address?.message}
        >
          <input
            {...register("legal_address")}
            maxLength={500}
            className={inputCn}
            placeholder="628011, ХМАО-Югра, г. Ханты-Мансийск, ул. Парковая, д. 92 Б"
          />
        </Field>

        <Field
          label="Фактический адрес"
          hint="Если отличается от юридического"
          error={errors.actual_address?.message}
        >
          <input
            {...register("actual_address")}
            maxLength={500}
            className={inputCn}
            placeholder="628011, г. Ханты-Мансийск, ул. Парковая, д. 92 Б"
          />
        </Field>

        <Field
          label="Расчётный счёт"
          hint="20 цифр"
          error={errors.bank_account?.message}
        >
          <input
            {...register("bank_account")}
            inputMode="numeric"
            pattern="\d*"
            maxLength={20}
            className={inputCn}
            placeholder="40702810000000000000"
          />
        </Field>

        <Field
          label="Название банка"
          error={errors.bank_name?.message}
        >
          <input
            {...register("bank_name")}
            maxLength={200}
            className={inputCn}
            placeholder="ПАО Сбербанк"
          />
        </Field>

        <div className="sm:col-span-2">
          <SaveButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </FormCard>
  );
}

// ── Организация ──

function OrganizationForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["organization"];
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["organization"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(organizationSettingSchema) as any,
    defaultValues: {
      name: defaults.name ?? "",
      short_name: defaults.short_name ?? "",
      legal_name: defaults.legal_name ?? "",
      slogan: defaults.slogan ?? "",
      description: defaults.description ?? "",
      short_description: defaults.short_description ?? "",
      locale: defaults.locale ?? "ru_RU",
      language: defaults.language ?? "ru",
      theme_color: defaults.theme_color ?? "#FF6600",
      og_image: defaults.og_image ?? "",
      founding_year: defaults.founding_year ?? 2014,
      price_range: defaults.price_range ?? "",
      area_served: defaults.area_served ?? [],
      keywords_global: defaults.keywords_global ?? [],
    },
  });

  const ogImage = watch("og_image") ?? "";
  const themeColor = watch("theme_color") ?? "#FF6600";
  const [uploading, setUploading] = useState(false);

  async function onSubmit(data: SiteSettingsBundle["organization"]) {
    const res = await updateSiteSettingAction("organization", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Организация сохранена");
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
      setValue("og_image", url, { shouldValidate: true });
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  return (
    <FormCard>
      <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs leading-relaxed text-blue-900 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-100">
        Эти поля используются в JSON-LD (schema.org/Organization), meta-тегах
        по умолчанию и футере сайта. Ранее значения были захардкожены в коде
        — теперь ими можно управлять.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Название *" error={errors.name?.message}>
          <input
            {...register("name")}
            className={inputCn}
            placeholder="Рекламная компания 2×2"
            maxLength={300}
          />
        </Field>

        <Field label="Короткое название" hint="Для мобильного хедера и favicon">
          <input
            {...register("short_name")}
            className={inputCn}
            placeholder="2×2"
            maxLength={60}
          />
        </Field>

        <Field label="Слоган" hint='"С нами просто!"'>
          <input
            {...register("slogan")}
            className={inputCn}
            maxLength={300}
          />
        </Field>

        <Field label="Юр. название (если используется отдельно)">
          <input
            {...register("legal_name")}
            className={inputCn}
            placeholder='ООО «Рекламная компания 2×2»'
            maxLength={300}
          />
        </Field>

        <Field
          label="Короткое описание"
          hint="Для meta description по умолчанию (до 160 символов)"
        >
          <textarea
            {...register("short_description")}
            rows={2}
            className={clsx(inputCn, "h-auto py-2 leading-relaxed")}
            maxLength={300}
          />
        </Field>

        <Field label="Полное описание" hint="Для страниц «О компании», JSON-LD">
          <textarea
            {...register("description")}
            rows={3}
            className={clsx(inputCn, "h-auto py-2 leading-relaxed")}
            maxLength={1000}
          />
        </Field>

        <Field
          label="Цвет бренда (theme_color)"
          hint="HEX, используется в <meta name=theme-color>"
          error={errors.theme_color?.message}
        >
          <div className="flex items-center gap-2">
            <input
              {...register("theme_color")}
              className={clsx(inputCn, "flex-1 font-mono")}
              placeholder="#FF6600"
            />
            <div
              className="h-10 w-10 shrink-0 rounded-lg border border-neutral-200 dark:border-white/10"
              style={{ backgroundColor: themeColor }}
              aria-hidden
            />
          </div>
        </Field>

        <Field label="Ценовой диапазон (schema.org)" hint='Пример: "$$" или "от 1000 ₽"'>
          <input
            {...register("price_range")}
            className={inputCn}
            placeholder="$$"
            maxLength={20}
          />
        </Field>

        <Field label="Год основания" error={errors.founding_year?.message}>
          <input
            type="number"
            {...register("founding_year", { valueAsNumber: true })}
            min={1900}
            max={2100}
            className={inputCn}
          />
        </Field>

        <Field label="Locale">
          <input
            {...register("locale")}
            className={inputCn}
            placeholder="ru_RU"
            maxLength={20}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="География работы (area_served)"
            hint="Города и регионы, где работаете. Влияет на JSON-LD."
          >
            <Controller
              control={control}
              name="area_served"
              render={({ field }) => (
                <TagsInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Введите город и Enter"
                  max={50}
                />
              )}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="Ключевые слова по умолчанию"
            hint="Используются как fallback meta keywords"
          >
            <Controller
              control={control}
              name="keywords_global"
              render={({ field }) => (
                <TagsInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  max={30}
                />
              )}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="OG-изображение (fallback)">
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
                    setValue("og_image", "", { shouldValidate: true })
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
                  Загрузить OG-изображение (1200×630)
                </span>
              </label>
            )}
          </Field>
        </div>

        <div className="sm:col-span-2">
          <SaveButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </FormCard>
  );
}

// ── Навигация: header ──

function NavigationHeaderForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["navigation_header"];
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["navigation_header"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(navigationHeaderSettingSchema) as any,
    defaultValues: {
      items:
        defaults.items && defaults.items.length > 0
          ? defaults.items
          : [{ href: "/", label: "Главная", order: 0, visible: true }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "items",
  });

  async function onSubmit(data: SiteSettingsBundle["navigation_header"]) {
    // Нормализуем order по индексу
    const normalized = {
      items: data.items.map((item, idx) => ({
        ...item,
        order: idx * 10,
      })),
    };
    const res = await updateSiteSettingAction("navigation_header", normalized);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Меню сохранено");
  }

  return (
    <FormCard>
      <div className="mb-5 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300">
        Пункты верхнего меню (хедер). Порядок задаётся стрелками «вверх/вниз».
        Отключённые пункты не отображаются на сайте, но остаются в настройках.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {fields.map((field, idx) => {
          const itemErrors = errors.items?.[idx];
          return (
            <div
              key={field.id}
              className="relative flex items-start gap-2.5 rounded-xl border border-neutral-200 p-3 dark:border-white/10"
            >
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 dark:hover:bg-white/5"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === fields.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-30 dark:hover:bg-white/5"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr,2fr,auto]">
                <input
                  {...register(`items.${idx}.label` as const)}
                  placeholder="Подпись"
                  className={inputCn}
                  maxLength={100}
                />
                <input
                  {...register(`items.${idx}.href` as const)}
                  placeholder="/services или https://..."
                  className={clsx(inputCn, "font-mono text-xs")}
                />
                <label className="flex items-center gap-2 whitespace-nowrap px-2 text-xs text-neutral-600 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    {...register(`items.${idx}.visible` as const)}
                    className="h-4 w-4 rounded border-neutral-300 text-brand-orange focus:ring-brand-orange"
                  />
                  Виден
                </label>
              </div>

              <button
                type="button"
                onClick={() => remove(idx)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                aria-label="Удалить пункт"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {itemErrors && (
                <p className="absolute -bottom-5 left-12 text-xs text-red-500">
                  {itemErrors.label?.message || itemErrors.href?.message || ""}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() =>
            append({
              href: "",
              label: "",
              order: fields.length * 10,
              visible: true,
            })
          }
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange dark:border-white/15 dark:text-neutral-300"
        >
          <Plus className="h-4 w-4" />
          Добавить пункт
        </button>

        <SaveButton isSubmitting={isSubmitting} />
      </form>
    </FormCard>
  );
}

// ── Навигация: footer колонки ──

function NavigationFooterForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["navigation_footer"];
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<SiteSettingsBundle["navigation_footer"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(navigationFooterSettingSchema) as any,
    defaultValues: {
      columns:
        defaults.columns && defaults.columns.length > 0
          ? defaults.columns
          : [{ title: "Компания", items: [] }],
    },
  });

  const {
    fields: columnFields,
    append: appendColumn,
    remove: removeColumn,
  } = useFieldArray({ control, name: "columns" });

  async function onSubmit(data: SiteSettingsBundle["navigation_footer"]) {
    const res = await updateSiteSettingAction("navigation_footer", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Футер сохранён");
  }

  return (
    <FormCard>
      <div className="mb-5 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300">
        Колонки футера. До 6 колонок, в каждой до 20 ссылок. Рекомендуется
        4 колонки: «Компания», «Услуги», «Полезное», «Контакты».
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {columnFields.map((col, colIdx) => (
            <FooterColumnCard
              key={col.id}
              colIdx={colIdx}
              register={register}
              control={control}
              onRemove={() => removeColumn(colIdx)}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => appendColumn({ title: "", items: [] })}
            disabled={columnFields.length >= 6}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:text-neutral-300"
          >
            <Plus className="h-4 w-4" />
            Добавить колонку
          </button>
          <SaveButton isSubmitting={isSubmitting} />
        </div>
      </form>
    </FormCard>
  );
}

function FooterColumnCard({
  colIdx,
  register,
  control,
  onRemove,
}: {
  colIdx: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  onRemove: () => void;
}) {
  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
    move: moveItem,
  } = useFieldArray({ control, name: `columns.${colIdx}.items` as const });

  return (
    <div className="relative rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mb-3 flex items-center gap-2">
        <input
          {...register(`columns.${colIdx}.title` as const)}
          placeholder="Заголовок колонки"
          className={clsx(inputCn, "flex-1 font-semibold")}
          maxLength={100}
        />
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
          aria-label="Удалить колонку"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        {itemFields.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-1.5 rounded-lg bg-white p-1.5 dark:bg-white/5"
          >
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => moveItem(idx, idx - 1)}
                disabled={idx === 0}
                className="flex h-5 w-5 items-center justify-center rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => moveItem(idx, idx + 1)}
                disabled={idx === itemFields.length - 1}
                className="flex h-5 w-5 items-center justify-center rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <input
              {...register(
                `columns.${colIdx}.items.${idx}.label` as const,
              )}
              placeholder="Подпись"
              className="h-8 flex-1 rounded-md border border-neutral-200 bg-transparent px-2 text-xs focus:border-brand-orange focus:outline-none dark:border-white/10 dark:text-white"
              maxLength={100}
            />
            <input
              {...register(`columns.${colIdx}.items.${idx}.href` as const)}
              placeholder="/path"
              className="h-8 flex-1 rounded-md border border-neutral-200 bg-transparent px-2 font-mono text-xs focus:border-brand-orange focus:outline-none dark:border-white/10 dark:text-white"
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => appendItem({ href: "", label: "" })}
          disabled={itemFields.length >= 20}
          className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:border-brand-orange hover:text-brand-orange disabled:opacity-40 dark:border-white/10 dark:text-neutral-400"
        >
          <Plus className="h-3 w-3" />
          Добавить ссылку
        </button>
      </div>
    </div>
  );
}

// ── Trust bar (клиенты на главной) ──

function TrustBarForm({
  defaults,
}: {
  defaults: SiteSettingsBundle["homepage_trust_bar"];
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsBundle["homepage_trust_bar"]>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(homepageTrustBarSettingSchema) as any,
    defaultValues: {
      text: defaults.text ?? "",
      clients: defaults.clients ?? [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "clients",
  });

  async function onSubmit(data: SiteSettingsBundle["homepage_trust_bar"]) {
    const res = await updateSiteSettingAction("homepage_trust_bar", data);
    if (!res.ok) toast.error(res.error ?? "Ошибка сохранения");
    else toast.success("Блок клиентов сохранён");
  }

  return (
    <FormCard>
      <div className="mb-5 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5 text-xs leading-relaxed text-neutral-700 dark:border-white/10 dark:bg-white/[0.02] dark:text-neutral-300">
        Лента клиентов под hero-блоком на главной. Текст и список брендов/клиентов.
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label="Текст над лентой клиентов"
          hint='Например: "Нам доверяют"'
          error={errors.text?.message}
        >
          <input
            {...register("text")}
            className={inputCn}
            maxLength={500}
            placeholder="Нам доверяют"
          />
        </Field>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
            Клиенты
          </label>
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 p-2.5 dark:border-white/10"
              >
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(idx, idx - 1)}
                    disabled={idx === 0}
                    className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, idx + 1)}
                    disabled={idx === fields.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:text-neutral-700 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <input
                  {...register(`clients.${idx}.name` as const)}
                  placeholder="Название клиента (ВТБ, Брусника…)"
                  className={clsx(inputCn, "flex-1")}
                  maxLength={120}
                />
                <input
                  {...register(`clients.${idx}.logo` as const)}
                  placeholder="URL логотипа (опционально)"
                  className={clsx(inputCn, "flex-1 font-mono text-xs")}
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ name: "", logo: "" })}
              disabled={fields.length >= 20}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange disabled:opacity-40 dark:border-white/15 dark:text-neutral-300"
            >
              <Plus className="h-4 w-4" />
              Добавить клиента
            </button>
          </div>
        </div>

        <SaveButton isSubmitting={isSubmitting} />
      </form>
    </FormCard>
  );
}
