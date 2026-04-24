/**
 * Типы БД проекта «2х2» — рукописные.
 *
 * Источник истины — SQL-миграции в `db/migrations/`:
 *   001_extensions_and_enums.sql   — ENUM-типы
 *   002_schema.sql                 — все доменные таблицы
 *   003_triggers_and_functions.sql — RPC-функции (Functions ниже)
 *   004_lucia_auth.sql             — users + sessions (Lucia v3)
 *
 * Миграция chain 1 перевела проект с Supabase на чистый PostgreSQL:
 *  - Удалена таблица `profiles` (было `id UUID → auth.users`).
 *  - Появились `users` (TEXT id, username, password_hash, role …)
 *    и `sessions` (id = sha256(token)) — см. `lib/auth/lucia.ts`.
 *  - Колонки, ссылающиеся на пользователей (orders.customer_id,
 *    blog_posts.author_id, audit_log.user_id и т. д.), имеют тип TEXT.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================
// ENUM-типы (001_extensions_and_enums.sql)
// ============================================================
export type UserRole = "owner" | "manager" | "content";
export type ProductStatus = "active" | "draft" | "archived";
export type ProductPricingMode = "fixed" | "calculator" | "quote";
/**
 * @deprecated В текущей бизнес-модели заказы не оформляются онлайн —
 * используются `leads` и `calculation_requests`. Тип оставлен для
 * совместимости с историческим кодом (миграция 006 удалила сами таблицы
 * `orders`/`order_items`/`order_status_history`/`cart_items`). Можно
 * удалить после полной зачистки кода в этапах 3-4.
 */
export type OrderStatus =
  | "new"
  | "confirmed"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned";
/** @deprecated см. OrderStatus. */
export type OrderType = "cart" | "one_click";
export type ReviewStatus = "pending" | "approved" | "rejected";
export type PromoType = "fixed" | "percent";
export type PostStatus = "draft" | "published" | "archived";
export type CalculationStatus =
  | "new"
  | "in_progress"
  | "quoted"
  | "approved"
  | "rejected";
export type LeadStatus = "new" | "in_progress" | "done" | "spam";
export type ContactStatus = "new" | "answered" | "closed";

// ============================================================
// JSONB-форматы
// ============================================================
export interface ProductDimensions {
  length?: number;
  width?: number;
  height?: number;
}

export interface WorkingHours {
  mon_fri?: string;
  sat?: string;
  sun?: string;
}

export interface MapCoords {
  lat: number;
  lng: number;
}

export interface CalculatorFormulaPerUnit {
  type: "per_unit";
  unit_price: number;
  min_price?: number;
}

export interface CalculatorFormulaPerArea {
  type: "per_area";
  unit_price: number;
  min_price?: number;
}

export interface CalculatorFormulaPerLength {
  type: "per_length";
  unit_price: number;
  min_price?: number;
}

export interface CalculatorFormulaPerTirajTier {
  type: "per_tiraj_tier";
  unit_price: number;
  min_price?: number;
  tiers?: { from: number; to?: number; price: number }[];
}

export type CalculatorFormula =
  | CalculatorFormulaPerUnit
  | CalculatorFormulaPerArea
  | CalculatorFormulaPerLength
  | CalculatorFormulaPerTirajTier;

export interface ParameterOption {
  value: string | number;
  label: string;
  price_modifier?: number;
  price?: number;
}

export interface DeliveryAddress {
  city?: string;
  city_code?: number;
  street?: string;
  house?: string;
  apartment?: string;
  postal_code?: string;
  comment?: string;
}

// ============================================================
// Database schema
// ============================================================
export interface Database {
  public: {
    Tables: {
      // ────────────────────────────────────────────────────
      // LUCIA AUTH (004_lucia_auth.sql)
      // ────────────────────────────────────────────────────
      users: {
        Row: {
          id: string;
          username: string;
          email: string | null;
          full_name: string | null;
          password_hash: string;
          role: UserRole;
          avatar_url: string | null;
          is_active: boolean;
          // Миграция 006: force-change + lockout по аккаунту.
          must_change_password: boolean;
          failed_login_attempts: number;
          locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email?: string | null;
          full_name?: string | null;
          password_hash: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
          must_change_password?: boolean;
          failed_login_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };

      sessions: {
        Row: {
          id: string;
          user_id: string;
          expires_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          expires_at: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };

      // ────────────────────────────────────────────────────
      // CATALOG (002_schema.sql)
      // ────────────────────────────────────────────────────
      categories: {
        Row: {
          id: number;
          parent_id: number | null;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          image_url: string | null;
          cover_url: string | null;
          is_active: boolean;
          is_featured: boolean;
          sort_order: number;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["categories"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };

      products: {
        Row: {
          id: number;
          category_id: number | null;
          name: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          sku: string | null;
          barcode: string | null;
          pricing_mode: ProductPricingMode;
          price: number;
          old_price: number | null;
          cost_price: number | null;
          price_to: number | null;
          unit: string | null;
          stock: number;
          track_stock: boolean;
          weight: number | null;
          dimensions: ProductDimensions | null;
          brand: string | null;
          status: ProductStatus;
          is_featured: boolean;
          is_new: boolean;
          is_on_sale: boolean;
          has_installation: boolean;
          lead_time_days: number | null;
          attributes: Json;
          tags: string[];
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string | null;
          sort_order: number;
          views_count: number;
          rating_avg: number;
          reviews_count: number;
          search_vector: unknown | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Omit<
          Database["public"]["Tables"]["products"]["Row"],
          | "id"
          | "created_at"
          | "updated_at"
          | "search_vector"
          | "views_count"
          | "rating_avg"
          | "reviews_count"
        > & {
          id?: number;
          created_at?: string;
          updated_at?: string;
          views_count?: number;
          rating_avg?: number;
          reviews_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };

      product_images: {
        Row: {
          id: number;
          product_id: number;
          url: string;
          alt_text: string | null;
          sort_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["product_images"]["Row"],
          "id" | "created_at"
        > & { id?: number; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["product_images"]["Insert"]
        >;
        Relationships: [];
      };

      product_variants: {
        Row: {
          id: number;
          product_id: number;
          name: string;
          sku: string | null;
          price: number | null;
          old_price: number | null;
          stock: number;
          attributes: Json;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["product_variants"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["product_variants"]["Insert"]
        >;
        Relationships: [];
      };

      product_parameters: {
        Row: {
          id: number;
          product_id: number;
          key: string;
          label: string;
          type: string;
          options: ParameterOption[] | null;
          unit: string | null;
          default_value: string | null;
          min_value: number | null;
          max_value: number | null;
          step: number | null;
          required: boolean;
          affects_price: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["product_parameters"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["product_parameters"]["Insert"]
        >;
        Relationships: [];
      };

      calculator_configs: {
        Row: {
          id: number;
          product_id: number;
          formula: CalculatorFormula;
          fields: Json;
          min_price: number | null;
          max_price: number | null;
          currency: string;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["calculator_configs"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["calculator_configs"]["Insert"]
        >;
        Relationships: [];
      };

      calculation_requests: {
        Row: {
          id: number;
          request_number: string | null;
          product_id: number | null;
          category_id: number | null;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          company_name: string | null;
          params: Json;
          attachments: string[];
          comment: string | null;
          source_url: string | null;
          status: CalculationStatus;
          manager_comment: string | null;
          quoted_amount: number | null;
          quoted_at: string | null;
          assigned_to: string | null;
          // Миграция 006: ПД-согласие 152-ФЗ + idempotency.
          pd_consent_at: string | null;
          pd_consent_version: string | null;
          pd_consent_ip: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["calculation_requests"]["Row"],
          "id" | "request_number" | "created_at" | "updated_at"
        > & {
          id?: number;
          request_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["calculation_requests"]["Insert"]
        >;
        Relationships: [];
      };

      // Таблицы orders / order_items / order_status_history / cart_items
      // удалены миграцией 006 — бизнес-модель «только индивидуальный
      // расчёт». Заявки лежат в `leads` и `calculation_requests`.

      portfolio_items: {
        Row: {
          id: number;
          title: string;
          slug: string;
          description: string | null;
          short_description: string | null;
          category_id: number | null;
          related_product_id: number | null;
          client_name: string | null;
          industry: string | null;
          location: string | null;
          year: number | null;
          project_date: string | null;
          cover_url: string;
          images: string[];
          video_url: string | null;
          is_featured: boolean;
          // Миграция 006: 1..3 для блока «3 главные работы» на главной.
          featured_order: number | null;
          is_published: boolean;
          sort_order: number;
          seo_title: string | null;
          seo_description: string | null;
          views_count: number;
          search_vector: unknown | null;
          published_at: string | null;
          category_label: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["portfolio_items"]["Row"],
          | "id"
          | "created_at"
          | "updated_at"
          | "search_vector"
          | "views_count"
        > & {
          id?: number;
          created_at?: string;
          updated_at?: string;
          views_count?: number;
        };
        Update: Partial<
          Database["public"]["Tables"]["portfolio_items"]["Insert"]
        >;
        Relationships: [];
      };

      leads: {
        Row: {
          id: number;
          lead_number: string | null;
          source: string;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          product_id: number | null;
          context: Json | null;
          page_url: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_term: string | null;
          referer: string | null;
          user_agent: string | null;
          status: LeadStatus;
          manager_comment: string | null;
          assigned_to: string | null;
          // Миграция 006: ПД-согласие 152-ФЗ + idempotency.
          pd_consent_at: string | null;
          pd_consent_version: string | null;
          pd_consent_ip: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["leads"]["Row"],
          "id" | "lead_number" | "created_at" | "updated_at"
        > & {
          id?: number;
          lead_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };

      contact_requests: {
        Row: {
          id: number;
          name: string;
          email: string | null;
          phone: string | null;
          subject: string | null;
          message: string;
          admin_reply: string | null;
          admin_reply_at: string | null;
          status: ContactStatus;
          // Миграция 006: ПД-согласие 152-ФЗ + idempotency.
          pd_consent_at: string | null;
          pd_consent_version: string | null;
          pd_consent_ip: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["contact_requests"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["contact_requests"]["Insert"]
        >;
        Relationships: [];
      };

      reviews: {
        Row: {
          id: number;
          product_id: number | null;
          order_id: number | null;
          portfolio_id: number | null;
          author_name: string;
          author_email: string | null;
          author_company: string | null;
          author_position: string | null;
          rating: number;
          title: string | null;
          text: string | null;
          pros: string | null;
          cons: string | null;
          images: string[];
          status: ReviewStatus;
          is_featured: boolean;
          admin_reply: string | null;
          admin_reply_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["reviews"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };

      promo_codes: {
        Row: {
          id: number;
          code: string;
          description: string | null;
          type: PromoType;
          value: number;
          min_order_amount: number | null;
          max_discount_amount: number | null;
          max_uses: number | null;
          max_uses_per_user: number | null;
          used_count: number;
          applies_to_category_ids: number[];
          applies_to_product_ids: number[];
          is_active: boolean;
          valid_from: string | null;
          valid_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["promo_codes"]["Row"],
          "id" | "used_count" | "created_at" | "updated_at"
        > & {
          id?: number;
          used_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["promo_codes"]["Insert"]>;
        Relationships: [];
      };

      // cart_items удалена миграцией 006 (бизнес-модель «только индивидуальный расчёт»).

      // ────────────────────────────────────────────────────
      // CMS (006_cms_and_security.sql)
      // ────────────────────────────────────────────────────
      homepage_sections: {
        Row: {
          key: string;
          content: Json;
          is_published: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          content?: Json;
          is_published?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["homepage_sections"]["Insert"]
        >;
        Relationships: [];
      };

      site_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["site_settings"]["Insert"]
        >;
        Relationships: [];
      };

      team_members: {
        Row: {
          id: number;
          name: string;
          role: string;
          photo_url: string | null;
          bio: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["team_members"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["team_members"]["Insert"]
        >;
        Relationships: [];
      };

      promotions: {
        Row: {
          id: number;
          title: string;
          body: string;
          image_url: string | null;
          link_url: string | null;
          link_text: string | null;
          valid_from: string | null;
          valid_to: string | null;
          is_active: boolean;
          show_as_popup: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["promotions"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["promotions"]["Insert"]
        >;
        Relationships: [];
      };

      wishlist_items: {
        Row: {
          id: number;
          user_id: string;
          product_id: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["wishlist_items"]["Row"],
          "id" | "created_at"
        > & { id?: number; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["wishlist_items"]["Insert"]
        >;
        Relationships: [];
      };

      blog_categories: {
        Row: {
          id: number;
          name: string;
          slug: string;
          description: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["blog_categories"]["Row"],
          "id" | "created_at"
        > & { id?: number; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["blog_categories"]["Insert"]
        >;
        Relationships: [];
      };

      blog_posts: {
        Row: {
          id: number;
          category_id: number | null;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string;
          cover_image_url: string | null;
          author_id: string | null;
          author_name: string | null;
          status: PostStatus;
          published_at: string | null;
          seo_title: string | null;
          seo_description: string | null;
          seo_keywords: string | null;
          reading_time: number | null;
          views_count: number;
          tags: string[];
          search_vector: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["blog_posts"]["Row"],
          | "id"
          | "created_at"
          | "updated_at"
          | "search_vector"
          | "views_count"
        > & {
          id?: number;
          created_at?: string;
          updated_at?: string;
          views_count?: number;
        };
        Update: Partial<Database["public"]["Tables"]["blog_posts"]["Insert"]>;
        Relationships: [];
      };

      banners: {
        Row: {
          id: number;
          title: string | null;
          subtitle: string | null;
          description: string | null;
          image_url: string;
          mobile_image_url: string | null;
          link: string | null;
          button_text: string | null;
          badge: string | null;
          position: string;
          sort_order: number;
          is_active: boolean;
          active_from: string | null;
          active_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["banners"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["banners"]["Insert"]>;
        Relationships: [];
      };

      pages: {
        Row: {
          id: number;
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
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["pages"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["pages"]["Insert"]>;
        Relationships: [];
      };

      menu_items: {
        Row: {
          id: number;
          parent_id: number | null;
          position: string;
          title: string;
          url: string;
          icon: string | null;
          sort_order: number;
          is_active: boolean;
          open_in_new_tab: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["menu_items"]["Row"],
          "id" | "created_at"
        > & { id?: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["menu_items"]["Insert"]>;
        Relationships: [];
      };

      settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          is_public: boolean;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["settings"]["Row"],
          "updated_at"
        > & { updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };

      redirects: {
        Row: {
          id: number;
          from_path: string;
          to_path: string;
          type: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["redirects"]["Row"],
          "id" | "created_at"
        > & { id?: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["redirects"]["Insert"]>;
        Relationships: [];
      };

      seo_meta: {
        Row: {
          id: number;
          path: string;
          title: string | null;
          description: string | null;
          keywords: string | null;
          og_title: string | null;
          og_description: string | null;
          og_image: string | null;
          noindex: boolean;
          canonical: string | null;
          schema_jsonld: Json | null;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["seo_meta"]["Row"],
          "id" | "updated_at"
        > & { id?: number; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["seo_meta"]["Insert"]>;
        Relationships: [];
      };

      audit_log: {
        Row: {
          id: number;
          user_id: string | null;
          action: string;
          table_name: string | null;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["audit_log"]["Row"],
          "id" | "created_at"
        > & { id?: number; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: {
      search_products: {
        Args: {
          q: string;
          p_category_slug?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Database["public"]["Tables"]["products"]["Row"][];
      };
      get_category_tree: {
        Args: Record<string, never>;
        Returns: {
          id: number;
          parent_id: number | null;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          image_url: string | null;
          is_featured: boolean;
          sort_order: number;
          products_count: number;
          depth: number;
        }[];
      };
      get_product_facets: {
        Args: {
          p_category_id?: number | null;
          p_search?: string | null;
        };
        Returns: Json;
      };
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      calculate_product_price: {
        Args: {
          p_product_id: number;
          p_params?: Json;
        };
        Returns: Json;
      };
      list_products: {
        Args: {
          p_category_slug?: string | null;
          p_pricing_mode?: string | null;
          p_price_min?: number | null;
          p_price_max?: number | null;
          p_search?: string | null;
          p_sort?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: number;
          category_id: number | null;
          name: string;
          slug: string;
          short_description: string | null;
          pricing_mode: ProductPricingMode;
          price: number;
          price_to: number | null;
          unit: string | null;
          is_featured: boolean;
          is_new: boolean;
          has_installation: boolean;
          rating_avg: number;
          reviews_count: number;
          image_url: string | null;
          category_slug: string | null;
          category_name: string | null;
          total_count: number;
        }[];
      };
      get_related_products: {
        Args: {
          p_product_id: number;
          p_limit?: number;
        };
        Returns: Database["public"]["Tables"]["products"]["Row"][];
      };
      log_admin_action: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_table_name?: string | null;
          p_record_id?: string | null;
          p_old_data?: Json | null;
          p_new_data?: Json | null;
          p_ip?: string | null;
          p_ua?: string | null;
        };
        Returns: undefined;
      };
    };

    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      product_pricing_mode: ProductPricingMode;
      order_status: OrderStatus;
      order_type: OrderType;
      review_status: ReviewStatus;
      promo_type: PromoType;
      post_status: PostStatus;
      calculation_status: CalculationStatus;
      lead_status: LeadStatus;
      contact_status: ContactStatus;
    };

    CompositeTypes: Record<string, never>;
  };
}
