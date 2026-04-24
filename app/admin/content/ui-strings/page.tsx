import { listAllUiStrings } from "@/lib/data/ui-strings";
import UiStringsClient from "@/features/admin/components/UiStringsClient";

export const metadata = { title: "Микротексты UI" };

/**
 * Админ-страница /admin/content/ui-strings — редактор микротекстов
 * интерфейса. Подтаблицы: navigation, forms, modals, errors, validation,
 * cookie, empty_states, success, placeholders, buttons, agreements.
 *
 * Строки создаются только через seed (миграция 011). В админке можно
 * править value — любой ключ из seed'а. Создавать новые запрещено.
 */
export default async function UiStringsPage() {
  const strings = await listAllUiStrings();
  return <UiStringsClient initial={strings} />;
}
