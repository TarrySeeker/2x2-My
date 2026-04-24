import { listSettings } from "@/lib/data/settings";
import SiteSettingsPageClient, {
  type SiteSettingsBundle,
} from "@/features/admin/components/SiteSettingsPageClient";

export const metadata = { title: "Настройки сайта" };

const DEFAULTS: SiteSettingsBundle = {
  contacts: {
    phone_primary: "+7-932-424-77-40",
    phone_secondary: "",
    email: "",
    address: "",
    address_geo: { lat: null, lng: null },
  },
  business_hours: {
    weekdays: "",
    weekend: "",
    weekdays_short: "",
    weekend_short: "",
  },
  socials: { vk: "", telegram: "", dzen: "" },
  stats: {
    years_in_business: 0,
    projects_done: 0,
    clients_count: 0,
    cities_count: 0,
    regions: "",
  },
  seo_defaults: {
    title_template: "",
    default_description: "",
    default_og_image: "",
  },
};

export default async function SiteSettingsPage() {
  const all = await listSettings();
  const map = new Map(all.map((s) => [s.key, s.value]));

  const bundle: SiteSettingsBundle = {
    contacts:
      (map.get("contacts") as SiteSettingsBundle["contacts"]) ??
      DEFAULTS.contacts,
    business_hours:
      (map.get("business_hours") as SiteSettingsBundle["business_hours"]) ??
      DEFAULTS.business_hours,
    socials:
      (map.get("socials") as SiteSettingsBundle["socials"]) ??
      DEFAULTS.socials,
    stats:
      (map.get("stats") as SiteSettingsBundle["stats"]) ?? DEFAULTS.stats,
    seo_defaults:
      (map.get("seo_defaults") as SiteSettingsBundle["seo_defaults"]) ??
      DEFAULTS.seo_defaults,
  };

  return <SiteSettingsPageClient initial={bundle} />;
}
