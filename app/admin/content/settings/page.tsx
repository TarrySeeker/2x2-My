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
  socials: { vk: "", telegram: "", dzen: "", max: "" },
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
  legal_entity: {
    legal_name: "",
    inn: "",
    ogrn: "",
    kpp: "",
    legal_address: "",
    actual_address: "",
    ceo_name: "",
    bank_account: "",
    bank_name: "",
    bik: "",
  },
  organization: {
    name: "Рекламная компания «2х2»",
    short_name: "2х2",
    legal_name: "",
    slogan: "",
    description: "",
    short_description: "",
    locale: "ru_RU",
    language: "ru",
    theme_color: "#FF6600",
    og_image: "",
    founding_year: 2014,
    price_range: "",
    area_served: [],
    keywords_global: [],
  },
  navigation_header: { items: [] },
  navigation_footer: { columns: [] },
  homepage_trust_bar: { text: "", clients: [] },
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
    legal_entity:
      (map.get("legal_entity") as SiteSettingsBundle["legal_entity"]) ??
      DEFAULTS.legal_entity,
    organization:
      (map.get("organization") as SiteSettingsBundle["organization"]) ??
      DEFAULTS.organization,
    navigation_header:
      (map.get("navigation_header") as SiteSettingsBundle["navigation_header"]) ??
      DEFAULTS.navigation_header,
    navigation_footer:
      (map.get("navigation_footer") as SiteSettingsBundle["navigation_footer"]) ??
      DEFAULTS.navigation_footer,
    homepage_trust_bar:
      (map.get("homepage_trust_bar") as SiteSettingsBundle["homepage_trust_bar"]) ??
      DEFAULTS.homepage_trust_bar,
  };

  return <SiteSettingsPageClient initial={bundle} />;
}
