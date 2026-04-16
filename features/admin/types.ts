import type { Row } from "@/lib/supabase/table-types";
import type { ProductStatus } from "@/types/database";

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

// ── Form data (Zod-inferred, re-exported for convenience) ──

export type { ProductFormData } from "@/features/admin/schemas/product";
export type { CategoryFormData } from "@/features/admin/schemas/category";
