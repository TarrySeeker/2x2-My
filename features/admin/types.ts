import type { Row } from "@/lib/supabase/table-types";
import type { ProductStatus, OrderStatus, OrderType, PostStatus, Json } from "@/types/database";

// ── Dashboard ──

export interface DashboardStats {
  revenue: { today: number; yesterday: number };
  orders: { today: number; yesterday: number };
  avgCheck: { today: number; yesterday: number };
  newOrders: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
}

export interface TopProduct {
  id: number;
  name: string;
  image_url: string | null;
  sold: number;
  revenue: number;
}

// ── Products ──

export interface AdminProductFilters {
  search?: string;
  status?: ProductStatus;
  categoryId?: number;
  page: number;
  perPage: number;
}

export interface ProductWithImage extends Row<"products"> {
  primary_image_url: string | null;
  category_name: string | null;
}

export interface ProductFull extends Row<"products"> {
  images: Row<"product_images">[];
  variants: Row<"product_variants">[];
  category: Row<"categories"> | null;
}

// ── Categories ──

export interface CategoryTreeNode extends Row<"categories"> {
  children: CategoryTreeNode[];
}

// ── Orders ──

export interface AdminOrderFilters {
  search?: string;
  status?: OrderStatus;
  type?: OrderType;
  date_from?: string;
  date_to?: string;
  payment_status?: string;
  page: number;
  perPage: number;
}

export type OrderRow = Row<"orders">;

export interface OrderItemWithProduct extends Row<"order_items"> {
  product_name: string | null;
  product_image: string | null;
}

export interface OrderFull extends Row<"orders"> {
  items: OrderItemWithProduct[];
  status_history: Row<"order_status_history">[];
  assigned_profile: { id: string; full_name: string | null; email: string } | null;
}

// ── Customers ──

export interface CustomerFilters {
  search?: string;
  page: number;
  perPage: number;
}

export interface CustomerSummary {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  orders_count: number;
  total_spent: number;
  last_order_date: string;
}

// ── Blog ──

export interface BlogPostFilters {
  search?: string;
  status?: PostStatus;
  category_id?: number;
  page: number;
  perPage: number;
}

export type BlogPostRow = Row<"blog_posts">;

export interface BlogPostFull extends Row<"blog_posts"> {
  category_name: string | null;
  author_full_name: string | null;
}

export interface BlogPostInput {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category_id: number | null;
  status: PostStatus;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  reading_time: number | null;
  tags: string[];
}

export interface BlogCategoryInput {
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

// ── Banners ──

export interface BannerInput {
  title: string | null;
  subtitle: string | null;
  description: string | null;
  image_url: string;
  mobile_image_url: string | null;
  link: string | null;
  button_text: string | null;
  badge: string | null;
  position: string;
  is_active: boolean;
  active_from: string | null;
  active_to: string | null;
}

// ── Pages ──

export interface PageInput {
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  is_active: boolean;
  show_in_footer: boolean;
  sort_order: number;
}

// ── Menu ──

export interface MenuItemInput {
  parent_id: number | null;
  position: string;
  title: string;
  url: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

// ── SEO ──

export interface SeoEntity {
  id: number;
  name: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  filled: boolean;
}

export interface RedirectInput {
  from_path: string;
  to_path: string;
  type: number;
  is_active: boolean;
}

export interface SeoTemplates {
  seo_title_template: string;
  seo_description_template: string;
}

// ── Settings ──

export interface SettingsUpdate {
  key: string;
  value: Json;
}

// ── Form data (Zod-inferred, re-exported for convenience) ──

export type { ProductFormData } from "@/features/admin/schemas/product";
export type { CategoryFormData } from "@/features/admin/schemas/category";
