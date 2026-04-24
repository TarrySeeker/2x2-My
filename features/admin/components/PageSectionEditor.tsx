"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, X, Plus, Trash2 } from "lucide-react";
import clsx from "clsx";

import {
  PAGE_SECTION_SCHEMAS,
  type PageSectionContentType,
} from "@/features/admin/schemas/page-sections";
import { upsertPageSectionAction } from "@/features/admin/actions/page-sections";
import type { SectionRow } from "./PageSectionsClient";

const CONTENT_TYPE_LABELS: Record<PageSectionContentType, string> = {
  hero:         "Hero",
  text_block:   "Текстовый блок",
  values:       "Ценности",
  cards_grid:   "Сетка карточек",
  faq:          "FAQ",
  cta:          "CTA",
  contact_info: "Контактная информация",
  stats_grid:   "Статистика",
};

export default function PageSectionEditor({
  section,
  onClose,
  onSaved,
}: {
  section: SectionRow;
  onClose: () => void;
  onSaved: (next: SectionRow) => void;
}) {
  const [content, setContent] = useState<Record<string, unknown>>(
    section.content && typeof section.content === "object"
      ? (section.content as Record<string, unknown>)
      : {},
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  function handleSave(nextEnabled?: boolean) {
    setError(null);
    const schema = PAGE_SECTION_SCHEMAS[section.contentType];
    const parsed = schema.safeParse(content);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Невалидные данные";
      setError(msg);
      toast.error(msg);
      return;
    }
    startSubmit(async () => {
      const res = await upsertPageSectionAction(
        section.pagePath,
        section.sectionKey,
        {
          content: parsed.data,
          enabled: nextEnabled ?? section.enabled,
          display_order: section.displayOrder,
        },
      );
      if (!res.ok) {
        setError(res.error ?? "Ошибка сохранения");
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Секция сохранена");
      onSaved({
        ...section,
        content: parsed.data as Record<string, unknown>,
        enabled: nextEnabled ?? section.enabled,
        updatedAt: new Date().toISOString(),
        exists: true,
      });
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl dark:bg-neutral-900"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-white/10">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              {section.pagePath} · {CONTENT_TYPE_LABELS[section.contentType]}
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-brand-dark dark:text-white">
              Секция «{section.sectionKey}»
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <ContentForm
            contentType={section.contentType}
            content={content}
            onChange={setContent}
          />

          {error && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5"
          >
            Отмена
          </button>
          <div className="flex gap-2">
            {!section.enabled && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Сохранить и включить
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить
            </button>
          </div>
        </footer>
      </motion.aside>
    </motion.div>
  );
}

// ============================================================
// Content forms по content_type
// ============================================================

const inputCn =
  "h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";
const textareaCn = clsx(inputCn, "h-auto py-2 leading-relaxed");

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function ContentForm({
  contentType,
  content,
  onChange,
}: {
  contentType: PageSectionContentType;
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  switch (contentType) {
    case "hero":
      return <HeroForm content={content} onChange={onChange} />;
    case "text_block":
      return <TextBlockForm content={content} onChange={onChange} />;
    case "values":
      return <ValuesForm content={content} onChange={onChange} />;
    case "cards_grid":
      return <CardsGridForm content={content} onChange={onChange} />;
    case "faq":
      return <FaqForm content={content} onChange={onChange} />;
    case "cta":
      return <CtaForm content={content} onChange={onChange} />;
    case "contact_info":
      return <ContactInfoForm content={content} onChange={onChange} />;
    case "stats_grid":
      return <StatsGridForm content={content} onChange={onChange} />;
    default:
      return <GenericJsonForm content={content} onChange={onChange} />;
  }
}

// ── helpers ──

function get<T>(obj: Record<string, unknown>, key: string, fallback: T): T {
  const v = obj[key];
  return (v ?? fallback) as T;
}

function set(
  obj: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  return { ...obj, [key]: value };
}

function ArrayItemControls({ onRemove }: { onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10"
      aria-label="Удалить элемент"
      title="Удалить элемент"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function ItemRow({
  index,
  onRemove,
  children,
}: {
  index: number;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs font-semibold text-neutral-500 dark:bg-white/5">
        {index + 1}
      </div>
      <div className="flex-1 space-y-2.5">{children}</div>
      <ArrayItemControls onRemove={onRemove} />
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3.5 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange dark:border-white/15 dark:text-neutral-300 dark:hover:border-brand-orange"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  );
}

// ── hero ──

function HeroForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Бейдж" hint='Маленькая надпись над заголовком, напр. "Реклама в ХМАО"'>
        <input
          value={get(content, "badge", "") as string}
          onChange={(e) => onChange(set(content, "badge", e.target.value))}
          maxLength={120}
          className={inputCn}
        />
      </Field>
      <Field label="Заголовок *">
        <input
          value={get(content, "title", "") as string}
          onChange={(e) => onChange(set(content, "title", e.target.value))}
          maxLength={300}
          className={inputCn}
          placeholder="О компании «2×2»"
        />
      </Field>
      <Field label="Описание">
        <textarea
          value={get(content, "description", "") as string}
          onChange={(e) => onChange(set(content, "description", e.target.value))}
          maxLength={500}
          rows={3}
          className={textareaCn}
        />
      </Field>
    </div>
  );
}

// ── text_block ──

function TextBlockForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const paragraphs = get<string[]>(content, "paragraphs", []);
  const stats = get<Array<{ value: string | number; label: string }>>(
    content,
    "stats",
    [],
  );
  const mission = get<{ title: string; text: string } | null>(
    content,
    "mission",
    null,
  );

  return (
    <div className="space-y-5">
      <Field label="Заголовок">
        <input
          value={get(content, "headline", "") as string}
          onChange={(e) => onChange(set(content, "headline", e.target.value))}
          maxLength={300}
          className={inputCn}
        />
      </Field>

      <Field label="Параграфы" hint="Каждый параграф — отдельный блок текста">
        <div className="space-y-2">
          {paragraphs.map((p, idx) => (
            <ItemRow
              key={idx}
              index={idx}
              onRemove={() =>
                onChange(
                  set(
                    content,
                    "paragraphs",
                    paragraphs.filter((_, i) => i !== idx),
                  ),
                )
              }
            >
              <textarea
                value={p}
                onChange={(e) => {
                  const next = [...paragraphs];
                  next[idx] = e.target.value;
                  onChange(set(content, "paragraphs", next));
                }}
                rows={3}
                className={textareaCn}
                maxLength={3000}
              />
            </ItemRow>
          ))}
          <AddButton
            label="Добавить параграф"
            onClick={() =>
              onChange(set(content, "paragraphs", [...paragraphs, ""]))
            }
          />
        </div>
      </Field>

      <div>
        <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-brand-dark dark:text-neutral-200">
          <span>Миссия (опционально)</span>
          {mission && (
            <button
              type="button"
              onClick={() => onChange(set(content, "mission", null))}
              className="text-xs text-red-500 hover:underline"
            >
              Удалить
            </button>
          )}
        </label>
        {mission ? (
          <div className="space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-white/10">
            <input
              value={mission.title ?? ""}
              onChange={(e) =>
                onChange(
                  set(content, "mission", { ...mission, title: e.target.value }),
                )
              }
              maxLength={200}
              className={inputCn}
              placeholder="Заголовок миссии"
            />
            <textarea
              value={mission.text ?? ""}
              onChange={(e) =>
                onChange(
                  set(content, "mission", { ...mission, text: e.target.value }),
                )
              }
              rows={3}
              maxLength={1000}
              className={textareaCn}
              placeholder="Текст миссии"
            />
          </div>
        ) : (
          <AddButton
            label="Добавить блок миссии"
            onClick={() =>
              onChange(set(content, "mission", { title: "", text: "" }))
            }
          />
        )}
      </div>

      <Field label="Статистика" hint="Числа внутри блока">
        <div className="space-y-2">
          {stats.map((item, idx) => (
            <ItemRow
              key={idx}
              index={idx}
              onRemove={() =>
                onChange(
                  set(content, "stats", stats.filter((_, i) => i !== idx)),
                )
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={String(item.value ?? "")}
                  onChange={(e) => {
                    const next = [...stats];
                    next[idx] = { ...item, value: e.target.value };
                    onChange(set(content, "stats", next));
                  }}
                  className={inputCn}
                  placeholder="500+"
                />
                <input
                  value={item.label ?? ""}
                  onChange={(e) => {
                    const next = [...stats];
                    next[idx] = { ...item, label: e.target.value };
                    onChange(set(content, "stats", next));
                  }}
                  className={inputCn}
                  placeholder="проектов реализовано"
                />
              </div>
            </ItemRow>
          ))}
          <AddButton
            label="Добавить показатель"
            onClick={() =>
              onChange(
                set(content, "stats", [...stats, { value: "", label: "" }]),
              )
            }
          />
        </div>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Изображение (URL)">
          <input
            value={get(content, "image", "") as string}
            onChange={(e) => onChange(set(content, "image", e.target.value))}
            className={inputCn}
            placeholder="/images/about.jpg"
          />
        </Field>
        <Field label="Alt-текст">
          <input
            value={get(content, "image_alt", "") as string}
            onChange={(e) => onChange(set(content, "image_alt", e.target.value))}
            className={inputCn}
          />
        </Field>
      </div>
    </div>
  );
}

// ── values ──

function ValuesForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const items = get<
    Array<{ icon: string; title: string; description: string }>
  >(content, "items", []);
  return (
    <div className="space-y-4">
      <Field label="Заголовок">
        <input
          value={get(content, "headline", "") as string}
          onChange={(e) => onChange(set(content, "headline", e.target.value))}
          className={inputCn}
        />
      </Field>
      <Field label="Подзаголовок">
        <input
          value={get(content, "subheadline", "") as string}
          onChange={(e) => onChange(set(content, "subheadline", e.target.value))}
          className={inputCn}
        />
      </Field>
      <Field label="Ценности" hint="До 8 элементов">
        <div className="space-y-2">
          {items.map((it, idx) => (
            <ItemRow
              key={idx}
              index={idx}
              onRemove={() =>
                onChange(
                  set(content, "items", items.filter((_, i) => i !== idx)),
                )
              }
            >
              <input
                value={it.icon}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, icon: e.target.value };
                  onChange(set(content, "items", next));
                }}
                className={inputCn}
                placeholder="shield (Lucide icon name)"
              />
              <input
                value={it.title}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, title: e.target.value };
                  onChange(set(content, "items", next));
                }}
                className={inputCn}
                placeholder="Заголовок"
              />
              <textarea
                value={it.description}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, description: e.target.value };
                  onChange(set(content, "items", next));
                }}
                rows={2}
                className={textareaCn}
                placeholder="Описание"
              />
            </ItemRow>
          ))}
          <AddButton
            label="Добавить ценность"
            onClick={() =>
              onChange(
                set(content, "items", [
                  ...items,
                  { icon: "", title: "", description: "" },
                ]),
              )
            }
          />
        </div>
      </Field>
    </div>
  );
}

// ── cards_grid ──

function CardsGridForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const items = get<
    Array<{
      icon: string;
      title: string;
      description: string;
      href: string;
      badge: string;
    }>
  >(content, "items", []);
  return (
    <div className="space-y-4">
      <Field label="Заголовок">
        <input
          value={get(content, "headline", "") as string}
          onChange={(e) => onChange(set(content, "headline", e.target.value))}
          className={inputCn}
        />
      </Field>
      <Field label="Подзаголовок">
        <input
          value={get(content, "subheadline", "") as string}
          onChange={(e) => onChange(set(content, "subheadline", e.target.value))}
          className={inputCn}
        />
      </Field>
      <Field label="Надпись на кнопке карточки" hint='Пример: "Рассчитать →"'>
        <input
          value={get(content, "cta_text_on_card", "") as string}
          onChange={(e) =>
            onChange(set(content, "cta_text_on_card", e.target.value))
          }
          className={inputCn}
        />
      </Field>

      <Field label="Карточки" hint="До 24 элементов">
        <div className="space-y-2">
          {items.map((it, idx) => (
            <ItemRow
              key={idx}
              index={idx}
              onRemove={() =>
                onChange(
                  set(content, "items", items.filter((_, i) => i !== idx)),
                )
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={it.icon ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, icon: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="icon name"
                />
                <input
                  value={it.badge ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, badge: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="Badge (опционально)"
                />
              </div>
              <input
                value={it.title}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, title: e.target.value };
                  onChange(set(content, "items", next));
                }}
                className={inputCn}
                placeholder="Название карточки"
              />
              <textarea
                value={it.description ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, description: e.target.value };
                  onChange(set(content, "items", next));
                }}
                rows={2}
                className={textareaCn}
                placeholder="Описание"
              />
              <input
                value={it.href ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, href: e.target.value };
                  onChange(set(content, "items", next));
                }}
                className={inputCn}
                placeholder="/calculator/category или https://..."
              />
            </ItemRow>
          ))}
          <AddButton
            label="Добавить карточку"
            onClick={() =>
              onChange(
                set(content, "items", [
                  ...items,
                  {
                    icon: "",
                    title: "",
                    description: "",
                    href: "",
                    badge: "",
                  },
                ]),
              )
            }
          />
        </div>
      </Field>
    </div>
  );
}

// ── faq ──

function FaqForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const items = get<
    Array<{ question: string; answer: string; emoji: string }>
  >(content, "items", []);
  return (
    <div className="space-y-4">
      <Field label="Заголовок">
        <input
          value={get(content, "headline", "") as string}
          onChange={(e) => onChange(set(content, "headline", e.target.value))}
          className={inputCn}
        />
      </Field>
      <Field label="Подзаголовок">
        <input
          value={get(content, "subheadline", "") as string}
          onChange={(e) =>
            onChange(set(content, "subheadline", e.target.value))
          }
          className={inputCn}
        />
      </Field>
      <Field label="Вопросы">
        <div className="space-y-2">
          {items.map((it, idx) => (
            <ItemRow
              key={idx}
              index={idx}
              onRemove={() =>
                onChange(
                  set(content, "items", items.filter((_, i) => i !== idx)),
                )
              }
            >
              <div className="flex gap-2">
                <input
                  value={it.emoji ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, emoji: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={clsx(inputCn, "w-16 text-center")}
                  maxLength={8}
                  placeholder="❓"
                />
                <input
                  value={it.question}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, question: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={clsx(inputCn, "flex-1")}
                  placeholder="Вопрос"
                />
              </div>
              <textarea
                value={it.answer}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, answer: e.target.value };
                  onChange(set(content, "items", next));
                }}
                rows={3}
                className={textareaCn}
                placeholder="Ответ"
              />
            </ItemRow>
          ))}
          <AddButton
            label="Добавить вопрос"
            onClick={() =>
              onChange(
                set(content, "items", [
                  ...items,
                  { question: "", answer: "", emoji: "" },
                ]),
              )
            }
          />
        </div>
      </Field>
    </div>
  );
}

// ── cta ──

function CtaForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Заголовок *">
        <input
          value={get(content, "headline", "") as string}
          onChange={(e) => onChange(set(content, "headline", e.target.value))}
          className={inputCn}
          placeholder="Готовы обсудить проект?"
        />
      </Field>
      <Field label="Подзаголовок">
        <textarea
          value={get(content, "subheadline", "") as string}
          onChange={(e) =>
            onChange(set(content, "subheadline", e.target.value))
          }
          rows={2}
          className={textareaCn}
          maxLength={1000}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Текст кнопки">
          <input
            value={get(content, "button_text", "") as string}
            onChange={(e) =>
              onChange(set(content, "button_text", e.target.value))
            }
            className={inputCn}
            placeholder="Связаться с нами"
          />
        </Field>
        <Field label="Ссылка кнопки">
          <input
            value={get(content, "button_url", "") as string}
            onChange={(e) =>
              onChange(set(content, "button_url", e.target.value))
            }
            className={inputCn}
            placeholder="/contacts или quote_modal"
          />
        </Field>
      </div>
    </div>
  );
}

// ── contact_info ──

function ContactInfoForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const items = get<
    Array<{
      icon: string;
      label: string;
      binding: string | null;
      value: string | null;
      link: string;
      external: boolean;
    }>
  >(content, "items", []);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Заголовок формы">
          <input
            value={get(content, "form_title", "") as string}
            onChange={(e) =>
              onChange(set(content, "form_title", e.target.value))
            }
            className={inputCn}
          />
        </Field>
        <Field label="Заголовок информационного блока">
          <input
            value={get(content, "info_title", "") as string}
            onChange={(e) =>
              onChange(set(content, "info_title", e.target.value))
            }
            className={inputCn}
          />
        </Field>
      </div>
      <Field label="URL карты (iframe)">
        <input
          value={get(content, "map_embed_url", "") as string}
          onChange={(e) =>
            onChange(set(content, "map_embed_url", e.target.value))
          }
          className={inputCn}
          placeholder="https://yandex.ru/map-widget/..."
        />
      </Field>
      <Field label="Заголовок iframe карты (для screen-reader)">
        <input
          value={get(content, "map_iframe_title", "") as string}
          onChange={(e) =>
            onChange(set(content, "map_iframe_title", e.target.value))
          }
          className={inputCn}
          placeholder="Карта проезда"
        />
      </Field>

      <Field
        label="Способы связи"
        hint='Binding связывает со settings (например, "contacts.phone_primary"). Если заполнен value — используется прямое значение.'
      >
        <div className="space-y-2">
          {items.map((it, idx) => (
            <ItemRow
              key={idx}
              index={idx}
              onRemove={() =>
                onChange(
                  set(content, "items", items.filter((_, i) => i !== idx)),
                )
              }
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={it.icon ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, icon: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="Lucide icon"
                />
                <input
                  value={it.label ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, label: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="Label (Телефон, Email, ...)"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={it.binding ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, binding: e.target.value || null };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="contacts.phone_primary"
                />
                <input
                  value={it.value ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, value: e.target.value || null };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="Прямое значение"
                />
              </div>
              <input
                value={it.link ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...it, link: e.target.value };
                  onChange(set(content, "items", next));
                }}
                className={inputCn}
                placeholder="tel:..., mailto:..., https://..."
              />
              <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                <input
                  type="checkbox"
                  checked={!!it.external}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, external: e.target.checked };
                    onChange(set(content, "items", next));
                  }}
                  className="h-3.5 w-3.5 rounded border-neutral-300 text-brand-orange focus:ring-brand-orange"
                />
                Открывать в новой вкладке
              </label>
            </ItemRow>
          ))}
          <AddButton
            label="Добавить способ связи"
            onClick={() =>
              onChange(
                set(content, "items", [
                  ...items,
                  {
                    icon: "",
                    label: "",
                    binding: "",
                    value: "",
                    link: "",
                    external: false,
                  },
                ]),
              )
            }
          />
        </div>
      </Field>
    </div>
  );
}

// ── stats_grid ──

function StatsGridForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const items = get<
    Array<{ value: string | number; label: string; icon: string }>
  >(content, "items", []);

  return (
    <div className="space-y-3">
      <Field label="Показатели" hint="До 12 элементов">
        <div className="space-y-2">
          {items.map((it, idx) => (
            <ItemRow
              key={idx}
              index={idx}
              onRemove={() =>
                onChange(
                  set(content, "items", items.filter((_, i) => i !== idx)),
                )
              }
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  value={String(it.value ?? "")}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, value: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="500+"
                />
                <input
                  value={it.label ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, label: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="проектов"
                />
                <input
                  value={it.icon ?? ""}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...it, icon: e.target.value };
                    onChange(set(content, "items", next));
                  }}
                  className={inputCn}
                  placeholder="icon"
                />
              </div>
            </ItemRow>
          ))}
          <AddButton
            label="Добавить показатель"
            onClick={() =>
              onChange(
                set(content, "items", [
                  ...items,
                  { value: "", label: "", icon: "" },
                ]),
              )
            }
          />
        </div>
      </Field>
    </div>
  );
}

// ── generic JSON ──

function GenericJsonForm({
  content,
  onChange,
}: {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [raw, setRaw] = useState(() => JSON.stringify(content, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  function handleChange(text: string) {
    setRaw(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        onChange(parsed as Record<string, unknown>);
        setParseError(null);
      } else {
        setParseError("JSON должен быть объектом");
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Ошибка парсинга");
    }
  }

  return (
    <div>
      <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/5 dark:text-amber-200">
        Для этого типа секции нет визуального редактора — редактируйте JSON
        напрямую. Обратитесь к разработчику, если нужна форма.
      </div>
      <textarea
        value={raw}
        onChange={(e) => handleChange(e.target.value)}
        rows={20}
        className={clsx(
          "w-full resize-y rounded-lg border bg-neutral-50 px-3 py-2.5 font-mono text-xs dark:bg-white/5",
          parseError ? "border-red-400" : "border-neutral-200 dark:border-white/10",
        )}
      />
      {parseError && (
        <p className="mt-1 text-xs text-red-500">Ошибка: {parseError}</p>
      )}
    </div>
  );
}
