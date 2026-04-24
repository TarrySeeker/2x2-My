import { getAllUiStrings } from "@/lib/data/ui-strings";
import {
  UiStringsProvider,
  type UiStringsMap,
} from "./UiStringsProvider";

/**
 * Server-обёртка над `UiStringsProvider`.
 *
 * Делает один кешированный SQL-запрос ко всему словарю `ui_strings`
 * (тег `ui-strings`, revalidate 5 минут — см. `lib/data/ui-strings.ts`)
 * и прокидывает snapshot пропсами в client-провайдер. Все client-компоненты
 * под этим деревом могут читать строки через `useUiString(key, fallback)`
 * без async-фетчей.
 *
 * Подключается один раз в корневом `app/layout.tsx`. Дополнительные
 * провайдеры на под-деревьях не нужны (snapshot уже целиком в памяти
 * и стоит ~10–50 KB JSON).
 *
 * Fallback при недоступности БД — пустой объект; `useUiString` тогда
 * вернёт fallback из вызова. Витрина не падает.
 *
 * BUILD-TIME TIMEOUT: при `next build` с placeholder DATABASE_URL
 * (см. Dockerfile, ARG DATABASE_URL) реальное подключение никогда не
 * установится. `connect_timeout: 10` в lib/db/client уже ограничивает
 * postgres-js, но здесь добавляем второй layer race(5s) — чтобы 53
 * статические страницы не складывались в 530с ожидания.
 */
const PROVIDER_FETCH_TIMEOUT_MS = 5_000;

async function fetchStringsSafe(): Promise<UiStringsMap> {
  try {
    return await Promise.race<UiStringsMap>([
      getAllUiStrings(),
      new Promise<UiStringsMap>((resolve) =>
        setTimeout(() => resolve({}), PROVIDER_FETCH_TIMEOUT_MS),
      ),
    ]);
  } catch {
    return {};
  }
}

export default async function UiStringsProviderServer({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const strings = await fetchStringsSafe();
  return <UiStringsProvider strings={strings}>{children}</UiStringsProvider>;
}
