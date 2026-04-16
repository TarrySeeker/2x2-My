import { getSettings } from "@/features/admin/api/settings";
import SettingsPageClient from "@/features/admin/components/SettingsPageClient";

export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return <SettingsPageClient settings={settings} />;
}
