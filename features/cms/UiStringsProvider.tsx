"use client";

import * as React from "react";

/**
 * Client-side UI-strings Context Provider.
 *
 * Получает заранее подготовленный snapshot строк из БД (`ui_strings`)
 * со server-обёртки `UiStringsProviderServer.tsx`. Все client-компоненты
 * под этим провайдером могут забирать строки через хук `useUiString(key)`.
 *
 * Зачем нужен:
 *  - В файлах `app/*\/error.tsx` нельзя использовать async `getUiString()`
 *    напрямую (они «use client» error-boundaries).
 *  - Любой client-компонент, которому нужен микротекст, может прочитать
 *    его через хук без пропсов от родителя.
 *
 * Контракт:
 *  - Если ключа нет в snapshot — возвращается `fallback` (по умолчанию '').
 *  - Если провайдер не подключён — хук возвращает `fallback` без ошибки.
 *    Это страхует error-boundaries: даже если корневой Layout не успел
 *    смонтироваться, error-boundary всё равно покажет hardcoded fallback.
 *
 * Не путать с другими CMS-провайдерами:
 *  - PromoPopupBanner / CookieBanner / ContactForm уже принимают свой
 *    snapshot пропсами через server-обёртки. Они НЕ используют этот
 *    провайдер и не должны на него полагаться.
 */

export type UiStringsMap = Readonly<Record<string, string>>;

const EMPTY_STRINGS: UiStringsMap = Object.freeze({});

const UiStringsContext = React.createContext<UiStringsMap>(EMPTY_STRINGS);

export interface UiStringsProviderProps {
  strings: UiStringsMap;
  children: React.ReactNode;
}

export function UiStringsProvider({
  strings,
  children,
}: UiStringsProviderProps): React.JSX.Element {
  // Memoize так, чтобы Context не пересчитывался при ре-рендере дерева.
  // strings приходит из server-компонента и стабилен между рендерами.
  const value = React.useMemo<UiStringsMap>(
    () => strings,
    // На сервере snapshot строк всегда заново формируется в getAllUiStrings();
    // дешевле зависеть от identity объекта, а не сериализовать.
    [strings],
  );

  return (
    <UiStringsContext.Provider value={value}>
      {children}
    </UiStringsContext.Provider>
  );
}

/**
 * Хук для чтения одной строки из snapshot'а.
 *
 * @param key      — точечный ключ (например, `error.catalog.title`).
 * @param fallback — что вернуть, если ключа нет или провайдер не подключён.
 *                   По умолчанию пустая строка.
 */
export function useUiString(key: string, fallback: string = ""): string {
  const dict = React.useContext(UiStringsContext);
  const value = dict[key];
  return value && value.length > 0 ? value : fallback;
}

/**
 * Хук для batch-чтения нескольких строк. Удобно, когда компонент
 * использует 5–10 ключей и не хочется писать `useUiString` подряд.
 */
export function useUiStrings<TKeys extends readonly string[]>(
  keys: TKeys,
  fallbacks?: Partial<Record<TKeys[number], string>>,
): Record<TKeys[number], string> {
  const dict = React.useContext(UiStringsContext);
  const out = {} as Record<TKeys[number], string>;
  for (const k of keys) {
    const key = k as TKeys[number];
    const value = dict[key];
    out[key] =
      value && value.length > 0 ? value : (fallbacks?.[key] ?? "");
  }
  return out;
}

/**
 * Низкоуровневый доступ к полному snapshot'у. Использовать только если
 * без него не обойтись (например, динамические ключи). Для обычных
 * случаев — `useUiString` / `useUiStrings`.
 */
export function useUiStringsSnapshot(): UiStringsMap {
  return React.useContext(UiStringsContext);
}
