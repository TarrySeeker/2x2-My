"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  getAdminReviews,
  approveReview,
  rejectReview,
  bulkApprove,
  replyToReview,
  deleteReview,
  getReviewsStats,
  getPendingReviewsCount,
} from "@/features/admin/api/reviews";
import { requireAdmin } from "@/features/auth/api";
import {
  reviewFilterSchema,
  reviewReplySchema,
  bulkApproveSchema,
  reviewIdSchema,
} from "@/features/admin/schemas/review";

export async function fetchAdminReviewsAction(filters: unknown) {
  await requireAdmin();
  const validated = reviewFilterSchema.parse(filters);
  return getAdminReviews(validated);
}

export async function approveReviewAction(id: number) {
  await requireAdmin();
  try {
    const validated = reviewIdSchema.parse({ id });
    await approveReview(validated.id);
    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка одобрения отзыва",
    };
  }
}

export async function rejectReviewAction(id: number) {
  await requireAdmin();
  try {
    const validated = reviewIdSchema.parse({ id });
    await rejectReview(validated.id);
    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка отклонения отзыва",
    };
  }
}

export async function bulkApproveAction(data: unknown) {
  await requireAdmin();
  try {
    const validated = bulkApproveSchema.parse(data);
    await bulkApprove(validated.ids);
    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message ?? "Ошибка валидации" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка массового одобрения",
    };
  }
}

export async function replyToReviewAction(data: unknown) {
  await requireAdmin();
  try {
    const validated = reviewReplySchema.parse(data);
    await replyToReview(validated.id, validated.reply);
    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message ?? "Ошибка валидации" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка отправки ответа",
    };
  }
}

export async function deleteReviewAction(id: number) {
  await requireAdmin();
  try {
    const validated = reviewIdSchema.parse({ id });
    await deleteReview(validated.id);
    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка удаления отзыва",
    };
  }
}

export async function fetchReviewsStatsAction() {
  await requireAdmin();
  return getReviewsStats();
}

export async function fetchPendingReviewsCountAction() {
  await requireAdmin();
  return getPendingReviewsCount();
}
