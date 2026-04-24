import { z } from "zod";

/**
 * Zod-схемы для таблицы `ui_strings` (миграция 011).
 *
 * Модель: плоская key/value. Key — точечная нотация
 * (namespace.block.element). Namespace синхронизируется с префиксом key.
 *
 * Валидация:
 *   - key: ^[a-z0-9_]+(\.[a-z0-9_]+)+$ — строгие точечные идентификаторы.
 *   - value: 1–2000 символов (микрокопирайтинг — короткий).
 *   - namespace: 1 из UI_STRING_NAMESPACES.
 */

export const UI_STRING_NAMESPACES = [
  "navigation",
  "cookie",
  "empty_states",
  "success",
  "errors",
  "validation",
  "placeholders",
  "agreements",
  "buttons",
  "forms",
  "modals",
] as const;

export type UiStringNamespace = (typeof UI_STRING_NAMESPACES)[number];

export function isValidUiStringNamespace(
  value: string,
): value is UiStringNamespace {
  return (UI_STRING_NAMESPACES as readonly string[]).includes(value);
}

const uiStringKeyRegex = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

export const uiStringInsertSchema = z.object({
  key: z
    .string()
    .min(3)
    .max(200)
    .regex(uiStringKeyRegex, {
      message:
        "Key должен быть в точечной нотации (namespace.block.element), только [a-z0-9_]",
    }),
  value:       z.string().min(1).max(2000),
  namespace:   z.enum(UI_STRING_NAMESPACES),
  description: z.string().max(500).nullable().optional(),
});

/**
 * Схема для bulk-update: массив {key, value} без namespace
 * (namespace не меняется — определяется однажды при seed'e).
 */
export const uiStringUpdateSchema = z.object({
  key:   z.string().min(3).max(200).regex(uiStringKeyRegex),
  value: z.string().min(1).max(2000),
});

export type UiStringUpdateInput = z.infer<typeof uiStringUpdateSchema>;

export const uiStringsBulkUpdateSchema = z
  .array(uiStringUpdateSchema)
  .max(500);

/**
 * Namespace → человеческая подпись для списков в админке.
 */
export const UI_STRING_NAMESPACE_LABELS: Record<UiStringNamespace, string> = {
  navigation:   "Навигация",
  cookie:       "Cookie-баннер",
  empty_states: "Пустые состояния",
  success:      "Сообщения об успехе",
  errors:       "Сообщения об ошибках",
  validation:   "Валидация форм",
  placeholders: "Плейсхолдеры",
  agreements:   "Согласия",
  buttons:      "Кнопки",
  forms:        "Формы",
  modals:       "Модальные окна",
};
