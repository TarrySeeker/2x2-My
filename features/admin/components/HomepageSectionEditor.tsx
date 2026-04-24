"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useForm,
  useFieldArray,
  Controller,
  type Control,
  type UseFormRegister,
  type UseFormRegisterReturn,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock3,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";

import {
  getSectionSchema,
  type SectionKey,
} from "@/features/admin/schemas/cms";
import { updateSectionAction } from "@/features/admin/actions/cms";
import AdminPageHeader from "./AdminPageHeader";

interface Props {
  sectionKey: SectionKey;
  initialContent: unknown;
  lastUpdatedAt: string | null;
}

const SECTION_TITLES: Record<SectionKey, string> = {
  hero: "Hero (верхний экран)",
  about: "О компании",
  services: "Услуги",
  promotions: "Секция акций",
  portfolio: "Портфолио — заголовок",
  features: "Почему выбирают нас",
  faq: "Частые вопросы",
  cta: "Финальный CTA",
};

const SECTION_PREVIEW_URL = "/";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function HomepageSectionEditor({
  sectionKey,
  initialContent,
  lastUpdatedAt,
}: Props) {
  const router = useRouter();
  const schema = getSectionSchema(sectionKey);

  const form = useForm<Record<string, unknown>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as any,
    defaultValues: initialContent as Record<string, unknown>,
  });

  async function onSubmit(data: Record<string, unknown>) {
    const res = await updateSectionAction(sectionKey, data);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось сохранить");
      return;
    }
    toast.success("Секция сохранена");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={SECTION_TITLES[sectionKey]}
        description={
          lastUpdatedAt
            ? `Последнее изменение: ${formatDate(lastUpdatedAt)}`
            : "Используются дефолтные значения — сохранение запишет в БД"
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={SECTION_PREVIEW_URL}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-dark dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Открыть главную
            </Link>
            <Link
              href="/admin/content/homepage"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-dark dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Все секции
            </Link>
          </div>
        }
      />

      {lastUpdatedAt && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Clock3 className="h-3.5 w-3.5" />
          обновлено {formatDate(lastUpdatedAt)}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <SectionFields sectionKey={sectionKey} form={form} />

        <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 sm:-mx-6 lg:-mx-8 lg:px-8">
          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить секцию
          </button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing per section
// ─────────────────────────────────────────────────────────────────────────────

function SectionFields({
  sectionKey,
  form,
}: {
  sectionKey: SectionKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  switch (sectionKey) {
    case "hero":
      return <HeroFields form={form} />;
    case "about":
      return <AboutFields form={form} />;
    case "services":
      return <ServicesFields form={form} />;
    case "promotions":
      return <PromotionsHeaderFields form={form} />;
    case "portfolio":
      return <PortfolioHeaderFields form={form} />;
    case "features":
      return <FeaturesFields form={form} />;
    case "faq":
      return <FaqFields form={form} />;
    case "cta":
      return <CtaFields form={form} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks
// ─────────────────────────────────────────────────────────────────────────────

const inputCn =
  "h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";
const textareaCn =
  "w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 text-sm leading-relaxed transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";

function Card({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      {title && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-neutral-400">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
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

function TextInput({
  register,
  long,
  placeholder,
  type,
  className,
}: {
  register: UseFormRegisterReturn;
  long?: boolean;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  if (long) {
    return (
      <textarea
        {...register}
        rows={3}
        placeholder={placeholder}
        className={clsx(textareaCn, className)}
      />
    );
  }
  return (
    <input
      {...register}
      type={type ?? "text"}
      placeholder={placeholder}
      className={clsx(inputCn, className)}
    />
  );
}

interface RepeaterProps<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  name: string;
  label: string;
  emptyText?: string;
  addText?: string;
  newItem: () => T;
  renderItem: (idx: number, remove: () => void) => React.ReactNode;
  max?: number;
}

function Repeater<T>({
  control,
  name,
  label,
  emptyText,
  addText,
  newItem,
  renderItem,
  max,
}: RepeaterProps<T>) {
  const { fields, append, remove, move } = useFieldArray({ control, name });

  const canAdd = max === undefined || fields.length < max;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-brand-dark dark:text-neutral-200">
          {label}
        </p>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => append(newItem() as never)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-orange/10 px-2.5 py-1.5 text-xs font-semibold text-brand-orange transition-colors hover:bg-brand-orange/20 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {addText ?? "Добавить"}
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-200 py-6 text-center text-xs text-neutral-400 dark:border-white/10">
          {emptyText ?? "Нет элементов"}
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((f, idx) => (
            <div
              key={f.id}
              className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-semibold text-neutral-500 dark:bg-white/10">
                  {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, idx - 1)}
                    disabled={idx === 0}
                    className="rounded p-1 text-neutral-400 hover:bg-white hover:text-brand-dark disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Вверх"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, idx + 1)}
                    disabled={idx === fields.length - 1}
                    className="rounded p-1 text-neutral-400 hover:bg-white hover:text-brand-dark disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-white"
                    aria-label="Вниз"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                    aria-label="Удалить"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {renderItem(idx, () => remove(idx))}
            </div>
          ))}
        </div>
      )}
      {max !== undefined && (
        <p className="mt-2 text-xs text-neutral-400">
          Максимум {max}, сейчас {fields.length}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO
// ─────────────────────────────────────────────────────────────────────────────
function HeroFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register, control } = form;
  return (
    <>
      <Card title="Заголовок и подзаголовок">
        <Field label="Eyebrow (мини-заголовок над заголовком)">
          <TextInput register={register("eyebrow")} />
        </Field>

        <Field
          label="Чередующиеся заголовки (каждая строка — отдельный, показываются по очереди по 2 сек)"
        >
          <Controller
            control={control}
            name="titles"
            render={({ field }) => {
              const value: string[] = Array.isArray(field.value) ? field.value : [];
              return (
                <textarea
                  rows={4}
                  className={textareaCn}
                  placeholder={"Региональный оператор наружной рекламы ХМАО и ЯНАО\nМы создаём рекламу, которую замечают"}
                  value={value.join("\n")}
                  onChange={(e) => {
                    const parsed = e.target.value
                      .split(/\r?\n/)
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0);
                    field.onChange(parsed);
                  }}
                  onBlur={field.onBlur}
                />
              );
            }}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Если указано ≥ 2 строк — Hero чередует их по кругу. При 0–1 строках — используется классическая раскладка ниже (Строка 1 / Акцент / Строка 3).
          </p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Строка 1 (fallback)">
            <TextInput register={register("headline_line1")} placeholder="Мы создаём" />
          </Field>
          <Field label="Акцент (выделенное слово, fallback)">
            <TextInput register={register("headline_accent")} placeholder="рекламу," />
          </Field>
          <Field label="Строка 3 (fallback)">
            <TextInput
              register={register("headline_line3")}
              placeholder="которую замечают"
            />
          </Field>
        </div>
        <Field label="Typewriter (бегущая строка)">
          <TextInput register={register("typewriter")} />
        </Field>
        <Field label="Подзаголовок">
          <TextInput long register={register("subheadline")} />
        </Field>
      </Card>

      <Card title="Кнопки">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Текст основной кнопки">
            <TextInput register={register("cta_primary_text")} />
          </Field>
          <Field label="URL основной кнопки">
            <TextInput
              type="url"
              register={register("cta_primary_url")}
              placeholder="/calculator"
            />
          </Field>
          <Field label="Текст второй кнопки">
            <TextInput register={register("cta_secondary_text")} />
          </Field>
          <Field label="URL второй кнопки">
            <TextInput
              type="url"
              register={register("cta_secondary_url")}
              placeholder="/portfolio"
            />
          </Field>
        </div>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT
// ─────────────────────────────────────────────────────────────────────────────
function AboutFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register, control, watch, setValue } = form;
  const highlightCard = watch("highlight_card");

  return (
    <>
      <Card title="Заголовок">
        <Field label="Бейдж">
          <TextInput register={register("badge")} placeholder="О компании" />
        </Field>
        <Field label="Заголовок *">
          <TextInput register={register("headline")} />
        </Field>
      </Card>

      <Card
        title="Параграфы"
        description="Каждый параграф — отдельный абзац. Перемещайте порядок стрелками."
      >
        <Repeater
          control={control}
          name="paragraphs"
          label="Параграфы"
          emptyText="Параграфы не добавлены"
          addText="Добавить параграф"
          max={10}
          newItem={() => ""}
          renderItem={(idx) => (
            <textarea
              {...register(`paragraphs.${idx}` as const)}
              rows={3}
              className={textareaCn}
              placeholder="Текст абзаца..."
            />
          )}
        />
      </Card>

      <Card
        title="Карточка-выделение"
        description='Один блок "Мы вас понимаем" под параграфами. Можно скрыть.'
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!highlightCard}
            onChange={(e) =>
              setValue(
                "highlight_card",
                e.target.checked ? { text: "", icon: "" } : null,
              )
            }
            className="h-4 w-4 rounded accent-brand-orange"
          />
          Показывать карточку-выделение
        </label>

        {highlightCard && (
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <Field label="Текст">
              <TextInput
                register={register("highlight_card.text")}
                placeholder="Мы вас понимаем"
              />
            </Field>
            <Field label="Иконка (lucide-name)" hint="например: heart">
              <TextInput
                register={register("highlight_card.icon")}
                placeholder="heart"
              />
            </Field>
          </div>
        )}
      </Card>

      <Card title="Статистика">
        <Repeater
          control={control}
          name="stats"
          label="Цифры"
          max={8}
          addText="Добавить цифру"
          newItem={() => ({ icon: "", value: "", suffix: "", label: "" })}
          renderItem={(idx) => (
            <div className="grid gap-3 sm:grid-cols-[100px_1fr_80px_1.5fr]">
              <Field label="Иконка">
                <TextInput
                  register={register(`stats.${idx}.icon` as const)}
                  placeholder="map-pin"
                />
              </Field>
              <Field label="Значение">
                <TextInput
                  register={register(`stats.${idx}.value` as const)}
                  placeholder="17"
                />
              </Field>
              <Field label="Суффикс">
                <TextInput
                  register={register(`stats.${idx}.suffix` as const)}
                  placeholder="+"
                />
              </Field>
              <Field label="Подпись">
                <TextInput
                  register={register(`stats.${idx}.label` as const)}
                  placeholder="городов"
                />
              </Field>
            </div>
          )}
        />
      </Card>

      <Card title="Кнопка под секцией">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Текст кнопки">
            <TextInput register={register("cta_text")} />
          </Field>
          <Field label="URL кнопки">
            <TextInput type="url" register={register("cta_url")} />
          </Field>
        </div>
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────
function ServicesFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register, control } = form;
  return (
    <>
      <Card title="Заголовок">
        <Field label="Заголовок *">
          <TextInput register={register("headline")} />
        </Field>
        <Field label="Подзаголовок">
          <TextInput long register={register("subheadline")} />
        </Field>
      </Card>

      <Card title="Карточки услуг">
        <Repeater
          control={control}
          name="items"
          label="Услуги"
          max={8}
          addText="Добавить услугу"
          newItem={() => ({
            icon: "",
            title: "",
            description: "",
            badge: "",
            image: "",
            width: "",
            height: "",
            cta_text: "Заказать",
          })}
          renderItem={(idx) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Заголовок">
                <TextInput register={register(`items.${idx}.title` as const)} />
              </Field>
              <Field label="Иконка (lucide)">
                <TextInput
                  register={register(`items.${idx}.icon` as const)}
                  placeholder="printer"
                />
              </Field>
              <Field label="Описание" hint="Можно длинное">
                <TextInput
                  long
                  register={register(`items.${idx}.description` as const)}
                />
              </Field>
              <Field label="Бейдж" hint="например 'от 1,7 ₽/шт'">
                <TextInput register={register(`items.${idx}.badge` as const)} />
              </Field>
              <Field label="URL картинки">
                <TextInput
                  type="url"
                  register={register(`items.${idx}.image` as const)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ширина (опц.)">
                  <TextInput register={register(`items.${idx}.width` as const)} />
                </Field>
                <Field label="Высота (опц.)">
                  <TextInput register={register(`items.${idx}.height` as const)} />
                </Field>
              </div>
              <Field label="Текст кнопки">
                <TextInput
                  register={register(`items.${idx}.cta_text` as const)}
                  placeholder="Заказать"
                />
              </Field>
            </div>
          )}
        />
      </Card>

      <Card
        title='Блок "Также мы занимаемся"'
        description="Маленький блок под карточками с другими направлениями"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Заголовок блока">
            <TextInput
              register={register("also_we_do_text")}
              placeholder="Также мы занимаемся"
            />
          </Field>
          <Field label="Подзаголовок блока">
            <TextInput register={register("also_we_do_subtitle")} />
          </Field>
        </div>
        <Repeater
          control={control}
          name="also_we_do_items"
          label="Направления"
          max={8}
          addText="Добавить направление"
          newItem={() => ({ icon: "", title: "", bullets: [] })}
          renderItem={(idx) => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Заголовок">
                  <TextInput
                    register={register(`also_we_do_items.${idx}.title` as const)}
                  />
                </Field>
                <Field label="Иконка (lucide)">
                  <TextInput
                    register={register(`also_we_do_items.${idx}.icon` as const)}
                    placeholder="building"
                  />
                </Field>
              </div>
              <NestedStringList
                control={control}
                name={`also_we_do_items.${idx}.bullets`}
                label="Пункты"
                addText="Добавить пункт"
                register={register}
                max={10}
                placeholder="..."
              />
            </div>
          )}
        />
      </Card>
    </>
  );
}

function NestedStringList({
  control,
  name,
  label,
  addText,
  register,
  max,
  placeholder,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  name: string;
  label: string;
  addText: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  max?: number;
  placeholder?: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name });
  const canAdd = max === undefined || fields.length < max;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          {label}
        </p>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => append("" as never)}
          className="inline-flex items-center gap-1 rounded-md bg-brand-orange/10 px-2 py-1 text-[11px] font-semibold text-brand-orange transition-colors hover:bg-brand-orange/20 disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          {addText}
        </button>
      </div>
      <div className="space-y-2">
        {fields.map((f, idx) => (
          <div key={f.id} className="flex items-center gap-2">
            <input
              {...register(`${name}.${idx}` as const)}
              placeholder={placeholder}
              className={inputCn}
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              aria-label="Удалить"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMOTIONS HEADER
// ─────────────────────────────────────────────────────────────────────────────
function PromotionsHeaderFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register } = form;
  return (
    <Card
      title="Заголовок секции «Акции»"
      description="Сами акции редактируются в разделе «Акции»"
    >
      <Field label="Заголовок *">
        <TextInput register={register("headline")} />
      </Field>
      <Field label="Подзаголовок">
        <TextInput long register={register("subheadline")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Текст кнопки">
          <TextInput register={register("cta_text")} />
        </Field>
        <Field label="URL кнопки">
          <TextInput type="url" register={register("cta_url")} />
        </Field>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO HEADER
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioHeaderFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register } = form;
  return (
    <Card
      title="Заголовок секции «Портфолио»"
      description='Выбор «3 главных» работ — в разделе "Портфолио"'
    >
      <Field label="Заголовок *">
        <TextInput register={register("headline")} />
      </Field>
      <Field label="Подзаголовок">
        <TextInput long register={register("subheadline")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label='Текст кнопки "Все работы"'>
          <TextInput register={register("more_button_text")} />
        </Field>
        <Field label="URL кнопки">
          <TextInput type="url" register={register("more_button_url")} />
        </Field>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURES
// ─────────────────────────────────────────────────────────────────────────────
function FeaturesFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register, control } = form;
  return (
    <>
      <Card title="Заголовок">
        <Field label="Заголовок *">
          <TextInput register={register("headline")} />
        </Field>
        <Field label="Подзаголовок">
          <TextInput long register={register("subheadline")} />
        </Field>
      </Card>

      <Card title="Преимущества">
        <Repeater
          control={control}
          name="items"
          label="Преимущества"
          max={12}
          addText="Добавить преимущество"
          newItem={() => ({ icon: "", title: "", description: "", extra: "" })}
          renderItem={(idx) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Заголовок">
                <TextInput register={register(`items.${idx}.title` as const)} />
              </Field>
              <Field label="Иконка (lucide)">
                <TextInput register={register(`items.${idx}.icon` as const)} />
              </Field>
              <Field label="Описание">
                <TextInput
                  long
                  register={register(`items.${idx}.description` as const)}
                />
              </Field>
              <Field label="Доп. подпись">
                <TextInput register={register(`items.${idx}.extra` as const)} />
              </Field>
            </div>
          )}
        />
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────
function FaqFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register, control } = form;
  return (
    <>
      <Card title="Заголовок">
        <Field label="Заголовок *">
          <TextInput register={register("headline")} />
        </Field>
        <Field label="Подзаголовок">
          <TextInput long register={register("subheadline")} />
        </Field>
      </Card>

      <Card title="Вопросы">
        <Repeater
          control={control}
          name="items"
          label="Вопросы"
          max={30}
          addText="Добавить вопрос"
          newItem={() => ({ question: "", answer: "", emoji: "" })}
          renderItem={(idx) => (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_80px]">
                <Field label="Вопрос">
                  <TextInput
                    register={register(`items.${idx}.question` as const)}
                  />
                </Field>
                <Field label="Эмодзи">
                  <TextInput
                    register={register(`items.${idx}.emoji` as const)}
                    placeholder="❓"
                  />
                </Field>
              </div>
              <Field label="Ответ">
                <Controller
                  control={control}
                  name={`items.${idx}.answer` as const}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={4}
                      placeholder="Развернутый ответ"
                      className={textareaCn}
                    />
                  )}
                />
              </Field>
            </div>
          )}
        />
      </Card>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA
// ─────────────────────────────────────────────────────────────────────────────
function CtaFields({
  form,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}) {
  const { register } = form;
  return (
    <Card title="Финальный CTA">
      <Field label="Заголовок *">
        <TextInput register={register("headline")} />
      </Field>
      <Field label="Подзаголовок">
        <TextInput long register={register("subheadline")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Текст кнопки">
          <TextInput register={register("button_text")} />
        </Field>
        <Field label="URL кнопки">
          <TextInput type="url" register={register("button_url")} />
        </Field>
      </div>
      <Field label='Текст "позвоните нам"'>
        <TextInput
          register={register("phone_text")}
          placeholder="или позвоните +7-932-424-77-40"
        />
      </Field>
    </Card>
  );
}
