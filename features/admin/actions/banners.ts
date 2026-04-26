"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
} from "@/features/admin/api/banners";
import { requireAdmin } from "@/features/auth/api";
import { bannerSchema } from "@/features/admin/schemas/banner";
import { logAdminAction } from "@/lib/audit";

const idSchema = z.number().int().positive();
const idsSchema = z.array(idSchema).min(1);

export async function createBannerAction(data: unknown) {
  const profile = await requireAdmin();
  const validated = bannerSchema.parse(data);
  const result = await createBanner(validated);
  revalidatePath("/admin/content/banners");
  await logAdminAction(
    profile.id,
    "banners.create",
    "banners",
    (result as { id?: number | string } | null)?.id ?? null,
    validated,
  );
  return result;
}

export async function updateBannerAction(id: number, data: unknown) {
  const profile = await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = bannerSchema.parse(data);
  await updateBanner(validatedId, validated);
  revalidatePath("/admin/content/banners");
  await logAdminAction(
    profile.id,
    "banners.update",
    "banners",
    validatedId,
    validated,
  );
}

export async function deleteBannerAction(id: number) {
  const profile = await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteBanner(validated);
  revalidatePath("/admin/content/banners");
  await logAdminAction(
    profile.id,
    "banners.delete",
    "banners",
    validated,
    null,
  );
}

export async function reorderBannersAction(ids: unknown) {
  const profile = await requireAdmin();
  const validated = idsSchema.parse(ids);
  await reorderBanners(validated);
  revalidatePath("/admin/content/banners");
  await logAdminAction(
    profile.id,
    "banners.reorder",
    "banners",
    null,
    { count: validated.length },
  );
}
