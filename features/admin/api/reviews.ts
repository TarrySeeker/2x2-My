import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { ReviewStatus } from "@/types/database";
import type { ReviewFilters } from "@/features/admin/schemas/review";

// ── Types ──

export interface AdminReview {
  id: number;
  product_id: number | null;
  order_id: number | null;
  author_name: string;
  author_email: string | null;
  author_company: string | null;
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
  product_name: string | null;
  product_slug: string | null;
  product_image: string | null;
}

export interface ReviewsStats {
  total: number;
  avgRating: number;
  byRating: Record<number, number>;
  pending: number;
}

// ── List with filters ──

export async function getAdminReviews(
  filters: ReviewFilters,
): Promise<{ data: AdminReview[]; total: number }> {
  if (!isSupabaseConfigured()) return { data: [], total: 0 };

  const supabase = createAdminClient();
  const { status, page, per_page } = filters;

  let query = supabase
    .from("reviews")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * per_page, page * per_page - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: reviews, count } = await query;

  if (!reviews || reviews.length === 0) {
    return { data: [], total: count ?? 0 };
  }

  // Enrich with product info
  const productIds = reviews
    .map((r) => r.product_id)
    .filter((id): id is number => id !== null);

  const productMap = new Map<
    number,
    { name: string; slug: string; image_url: string | null }
  >();

  if (productIds.length > 0) {
    const uniqueProductIds = [...new Set(productIds)];

    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug")
      .in("id", uniqueProductIds);

    const { data: images } = await supabase
      .from("product_images")
      .select("product_id, url")
      .in("product_id", uniqueProductIds)
      .eq("is_primary", true);

    const imageMap = new Map<number, string>();
    for (const img of images ?? []) {
      imageMap.set(img.product_id, img.url);
    }

    for (const p of products ?? []) {
      productMap.set(p.id, {
        name: p.name,
        slug: p.slug,
        image_url: imageMap.get(p.id) ?? null,
      });
    }
  }

  const enriched: AdminReview[] = reviews.map((r) => {
    const product = r.product_id ? productMap.get(r.product_id) : null;
    return {
      id: r.id,
      product_id: r.product_id,
      order_id: r.order_id,
      author_name: r.author_name,
      author_email: r.author_email,
      author_company: r.author_company,
      rating: r.rating,
      title: r.title,
      text: r.text,
      pros: r.pros,
      cons: r.cons,
      images: r.images,
      status: r.status,
      is_featured: r.is_featured,
      admin_reply: r.admin_reply,
      admin_reply_at: r.admin_reply_at,
      created_at: r.created_at,
      product_name: product?.name ?? null,
      product_slug: product?.slug ?? null,
      product_image: product?.image_url ?? null,
    };
  });

  return { data: enriched, total: count ?? 0 };
}

// ── Approve ──

export async function approveReview(id: number) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reviews")
    .update({ status: "approved" as ReviewStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Reject ──

export async function rejectReview(id: number) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reviews")
    .update({ status: "rejected" as ReviewStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Bulk approve ──

export async function bulkApprove(ids: number[]) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reviews")
    .update({ status: "approved" as ReviewStatus, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw new Error(error.message);
}

// ── Reply to review ──

export async function replyToReview(id: number, reply: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("reviews")
    .update({
      admin_reply: reply,
      admin_reply_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Delete ──

export async function deleteReview(id: number) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Stats ──

export async function getReviewsStats(): Promise<ReviewsStats> {
  if (!isSupabaseConfigured()) {
    return { total: 0, avgRating: 0, byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, pending: 0 };
  }

  const supabase = createAdminClient();

  // Total + average rating
  const { data: allReviews, count: total } = await supabase
    .from("reviews")
    .select("rating, status", { count: "exact" });

  const reviews = allReviews ?? [];
  const totalCount = total ?? 0;

  // Calculate average rating from approved reviews
  const approved = reviews.filter((r) => r.status === "approved");
  const avgRating =
    approved.length > 0
      ? approved.reduce((sum, r) => sum + r.rating, 0) / approved.length
      : 0;

  // Distribution by rating (all reviews, not just approved)
  const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      byRating[r.rating]++;
    }
  }

  // Pending count
  const pending = reviews.filter((r) => r.status === "pending").length;

  return { total: totalCount, avgRating: Math.round(avgRating * 10) / 10, byRating, pending };
}

// ── Pending count (for sidebar badge) ──

export async function getPendingReviewsCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  return count ?? 0;
}
