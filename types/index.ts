/**
 * Удобные shorthand-типы для домена «2х2».
 * Построены поверх Database из ./database.
 */
import type { Database } from "./database";

export type Tables = Database["public"]["Tables"];

// ============================================================
// Строчные типы (Row)
// ============================================================
export type User = Tables["users"]["Row"];
export type Session = Tables["sessions"]["Row"];
/**
 * Legacy alias — ранее таблица называлась `profiles` (Supabase).
 * После миграции chain 1 таблица называется `users` (Lucia v3).
 * Алиас оставлен для совместимости с существующим кодом
 * (BlogPostWithRelations.author: Profile и т. п.).
 */
export type Profile = User;
export type Category = Tables["categories"]["Row"];
export type Product = Tables["products"]["Row"];
export type ProductImage = Tables["product_images"]["Row"];
export type ProductVariant = Tables["product_variants"]["Row"];
export type ProductParameter = Tables["product_parameters"]["Row"];
export type CalculatorConfig = Tables["calculator_configs"]["Row"];
export type CalculationRequest = Tables["calculation_requests"]["Row"];
export type PortfolioItem = Tables["portfolio_items"]["Row"];
export type Lead = Tables["leads"]["Row"];
export type ContactRequest = Tables["contact_requests"]["Row"];
export type Review = Tables["reviews"]["Row"];
export type PromoCode = Tables["promo_codes"]["Row"];
export type WishlistItem = Tables["wishlist_items"]["Row"];
export type BlogCategory = Tables["blog_categories"]["Row"];
export type BlogPost = Tables["blog_posts"]["Row"];
export type Banner = Tables["banners"]["Row"];
export type Page = Tables["pages"]["Row"];
export type MenuItem = Tables["menu_items"]["Row"];
export type Setting = Tables["settings"]["Row"];
export type SeoMeta = Tables["seo_meta"]["Row"];

// CMS (миграция 006)
export type HomepageSection = Tables["homepage_sections"]["Row"];
export type SiteSetting = Tables["site_settings"]["Row"];
export type TeamMember = Tables["team_members"]["Row"];
export type Promotion = Tables["promotions"]["Row"];

// ============================================================
// Insert-типы (для форм / API)
// ============================================================
export type LeadInsert = Tables["leads"]["Insert"];
export type CalculationRequestInsert = Tables["calculation_requests"]["Insert"];
export type ContactRequestInsert = Tables["contact_requests"]["Insert"];
export type ReviewInsert = Tables["reviews"]["Insert"];
export type TeamMemberInsert = Tables["team_members"]["Insert"];
export type PromotionInsert = Tables["promotions"]["Insert"];

// ============================================================
// Расширенные типы (с join-ами)
// ============================================================
export interface ProductWithRelations extends Product {
  category: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
  parameters: ProductParameter[];
  calculator: CalculatorConfig | null;
}

export interface CategoryWithChildren extends Category {
  children?: Category[];
  products_count?: number;
}

export interface PortfolioItemWithRelations extends PortfolioItem {
  category: Category | null;
  related_product: Product | null;
}

export interface BlogPostWithRelations extends BlogPost {
  category: BlogCategory | null;
  author: Profile | null;
}

// ============================================================
// Фильтры и параметры запросов
// ============================================================
export type ProductSort =
  | "popular"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating"
  | "featured";

export interface ProductFilters {
  category_slug?: string;
  category_id?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  brands?: string[];
  tags?: string[];
  is_new?: boolean;
  is_featured?: boolean;
  is_on_sale?: boolean;
  pricing_mode?: Database["public"]["Enums"]["product_pricing_mode"];
  has_installation?: boolean;
  sort?: ProductSort;
  page?: number;
  per_page?: number;
}

export interface PortfolioFilters {
  category_slug?: string;
  category_id?: number;
  industry?: string;
  location?: string;
  year?: number;
  client?: string;
  search?: string;
  is_featured?: boolean;
  page?: number;
  per_page?: number;
  sort?: "newest" | "featured" | "popular";
}

export interface BlogFilters {
  category_slug?: string;
  tag?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

// ============================================================
// Калькулятор: входные и выходные типы
// ============================================================
export interface CalculationInput {
  product_id: number;
  params: Record<string, string | number | boolean>;
}

export interface CalculationResult {
  product_id: number;
  base_price: number;
  modifiers_total: number;
  subtotal: number;
  total: number;
  currency: string;
  breakdown: Array<{
    label: string;
    value: number | string;
    price_delta: number;
  }>;
  notes?: string;
}

// ============================================================
// Формы витрины
// ============================================================
export interface OneClickFormData {
  name: string;
  phone: string;
  product_id?: number;
  product_name?: string;
  comment?: string;
}

export interface CallbackFormData {
  name: string;
  phone: string;
  context?: string;
}

export interface CalculationRequestFormData {
  product_id?: number;
  category_id?: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  company_name?: string;
  params?: Record<string, unknown>;
  attachments?: string[];
  comment?: string;
}

export interface ContactFormData {
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  message: string;
}

// ============================================================
// Константы
// ============================================================
/**
 * @deprecated Заказы упразднены (бизнес-модель «только индивидуальный
 * расчёт»). Оставлено как dead-code для совместимости — будет удалено
 * после полной зачистки UI в этапах 3-4.
 */
export const ORDER_STATUS_LABELS: Record<
  Database["public"]["Enums"]["order_status"],
  string
> = {
  new: "Новый",
  confirmed: "Подтверждён",
  in_production: "В производстве",
  ready: "Готов",
  shipped: "Отправлен",
  delivered: "Доставлен",
  completed: "Завершён",
  cancelled: "Отменён",
  returned: "Возврат",
};

export const CALCULATION_STATUS_LABELS: Record<
  Database["public"]["Enums"]["calculation_status"],
  string
> = {
  new: "Новая",
  in_progress: "В работе",
  quoted: "Отправлено КП",
  approved: "Согласовано",
  rejected: "Отклонено",
};

export const LEAD_STATUS_LABELS: Record<
  Database["public"]["Enums"]["lead_status"],
  string
> = {
  new: "Новый",
  in_progress: "В работе",
  done: "Закрыт",
  spam: "Спам",
};

// ============================================================
// RPC response types
// ============================================================
export type CategoryTreeItem =
  Database["public"]["Functions"]["get_category_tree"]["Returns"][number];

export interface ProductFacets {
  price_range: { min: number; max: number };
  pricing_modes: { value: string; count: number }[];
  brands: { value: string; count: number }[];
  tags: { value: string; count: number }[];
  has_installation: number;
  is_new: number;
  is_on_sale: number;
  total_count: number;
}

/**
 * Структура `get_dashboard_stats()` после миграции 006 — в JSON,
 * orders/revenue убраны, добавлены счётчики заявок.
 *
 * Используется в server-component'ах админки. Любой `as DashboardStats`
 * — заглушка совместимости со старым UI; полный переход на новые поля
 * запланирован на этапе 3.
 */
export interface DashboardStats {
  new_calc_requests: number;
  calc_requests_week: number;
  calc_requests_month: number;
  new_leads: number;
  leads_week: number;
  new_contacts: number;
  pending_reviews: number;
  products_active: number;
  products_draft: number;
  portfolio_count: number;
  recent_calc_requests: {
    id: number;
    request_number: string | null;
    customer_name: string;
    customer_phone: string;
    status: string;
    created_at: string;
  }[];
  recent_leads: {
    id: number;
    lead_number: string | null;
    customer_name: string;
    customer_phone: string;
    source: string;
    status: string;
    created_at: string;
  }[];
}

export type { Database } from "./database";
export type {
  CalculatorFormula,
  CalculatorFormulaPerUnit,
  CalculatorFormulaPerArea,
  CalculatorFormulaPerLength,
  CalculatorFormulaPerTirajTier,
} from "./database";
