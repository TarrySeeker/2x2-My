import "server-only";

import { sql } from "@/lib/db/client";
import type { ReviewStatus } from "@/types/database";
import type { Row } from "@/lib/db/table-types";
import type { ReviewFilters } from "@/features/admin/schemas/review";

type ReviewRow = Row<"reviews">;

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
  try {
    const { status, page, per_page } = filters;
    const offset = (page - 1) * per_page;

    const totalRows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM reviews
      WHERE (${status ?? null}::text IS NULL OR status::text = ${status ?? null})
    `;
    const total = totalRows[0]?.count ?? 0;

    const reviews = await sql<ReviewRow[]>`
      SELECT *
      FROM reviews
      WHERE (${status ?? null}::text IS NULL OR status::text = ${status ?? null})
      ORDER BY created_at DESC
      LIMIT ${per_page}
      OFFSET ${offset}
    `;

    if (reviews.length === 0) return { data: [], total };

    const productIds = [
      ...new Set(
        reviews
          .map((r: ReviewRow) => r.product_id)
          .filter((id: number | null): id is number => id !== null),
      ),
    ];

    const productMap = new Map<
      number,
      { name: string; slug: string; image_url: string | null }
    >();

    if (productIds.length > 0) {
      const products = await sql<
        { id: number; name: string; slug: string }[]
      >`
        SELECT id, name, slug
        FROM products
        WHERE id IN ${sql(productIds)}
      `;

      const images = await sql<{ product_id: number; url: string }[]>`
        SELECT product_id, url
        FROM product_images
        WHERE product_id IN ${sql(productIds)}
          AND is_primary = true
      `;

      const imageMap = new Map<number, string>();
      for (const img of images) imageMap.set(img.product_id, img.url);

      for (const p of products) {
        productMap.set(p.id, {
          name: p.name,
          slug: p.slug,
          image_url: imageMap.get(p.id) ?? null,
        });
      }
    }

    const enriched: AdminReview[] = reviews.map((r: ReviewRow) => {
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

    return { data: enriched, total };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getAdminReviews] DB request failed:", err);
    }
    return { data: [], total: 0 };
  }
}

export async function approveReview(id: number): Promise<void> {
  await sql`
    UPDATE reviews
    SET status = 'approved', updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function rejectReview(id: number): Promise<void> {
  await sql`
    UPDATE reviews
    SET status = 'rejected', updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function bulkApprove(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE reviews
    SET status = 'approved', updated_at = NOW()
    WHERE id IN ${sql(ids)}
  `;
}

export async function replyToReview(id: number, reply: string): Promise<void> {
  await sql`
    UPDATE reviews
    SET
      admin_reply = ${reply},
      admin_reply_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deleteReview(id: number): Promise<void> {
  await sql`DELETE FROM reviews WHERE id = ${id}`;
}

export async function getReviewsStats(): Promise<ReviewsStats> {
  try {
    const rows = await sql<{ rating: number; status: string }[]>`
      SELECT rating, status::text AS status
      FROM reviews
    `;

    const totalCount = rows.length;

    type StatRow = { rating: number; status: string };
    const approved = rows.filter((r: StatRow) => r.status === "approved");
    const avgRating =
      approved.length > 0
        ? approved.reduce(
            (sum: number, r: StatRow) => sum + Number(r.rating),
            0,
          ) / approved.length
        : 0;

    const byRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of rows) {
      const rating = Number(r.rating);
      if (rating >= 1 && rating <= 5) byRating[rating]++;
    }

    const pending = rows.filter((r: StatRow) => r.status === "pending").length;

    return {
      total: totalCount,
      avgRating: Math.round(avgRating * 10) / 10,
      byRating,
      pending,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getReviewsStats] DB request failed:", err);
    }
    return {
      total: 0,
      avgRating: 0,
      byRating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      pending: 0,
    };
  }
}

export async function getPendingReviewsCount(): Promise<number> {
  try {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM reviews
      WHERE status = 'pending'
    `;
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}
