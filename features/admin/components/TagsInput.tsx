"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Максимум тегов (опционально). */
  max?: number;
  /** Максимум символов в теге. */
  maxLength?: number;
  /** id для связки с <label htmlFor>. */
  id?: string;
  /** Отключить ввод (только просмотр). */
  disabled?: boolean;
}

/**
 * Chip-style input: вводишь текст, жмёшь Enter или запятую — тег добавляется.
 * Backspace в пустом поле удаляет последний тег.
 *
 * Используется в SEO-мета (keywords), organization (area_served),
 * trust-bar (clients без логотипов) и т.п.
 */
export default function TagsInput({
  value,
  onChange,
  placeholder,
  max,
  maxLength = 100,
  id,
  disabled,
}: TagsInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (tag.length > maxLength) return;
    if (value.includes(tag)) {
      setInput("");
      return;
    }
    if (max !== undefined && value.length >= max) return;
    onChange([...value, tag]);
    setInput("");
  }

  function removeTag(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      return;
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      e.preventDefault();
      removeTag(value.length - 1);
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",")) return;
    e.preventDefault();
    const parts = text
      .split(/[,\n\t]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const seen = new Set(value);
    const next = [...value];
    for (const p of parts) {
      if (seen.has(p)) continue;
      if (max !== undefined && next.length >= max) break;
      if (p.length > maxLength) continue;
      next.push(p);
      seen.add(p);
    }
    onChange(next);
  }

  return (
    <div
      className={clsx(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm transition-colors",
        "border-neutral-200 bg-transparent focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20",
        "dark:border-white/10",
        disabled && "cursor-not-allowed opacity-60",
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 rounded-md bg-brand-orange/10 px-2 py-0.5 text-xs font-medium text-brand-orange dark:bg-brand-orange/20"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="rounded-full p-0.5 text-brand-orange/70 hover:bg-brand-orange/20 hover:text-brand-orange"
              aria-label={`Удалить тег ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-neutral-400 dark:text-white"
      />
    </div>
  );
}
