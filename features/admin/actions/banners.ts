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

const idSchema = z.number().int().positive();
const idsSchema = z.array(idSchema).min(1);

export async function createBannerAction(data: unknown) {
  await requireAdmin();
  const validated = bannerSchema.parse(data);
  const result = await createBanner(validated);
  revalidatePath("/admin/content/banners");
  return result;
}

export async function updateBannerAction(id: number, data: unknown) {
  await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = bannerSchema.parse(data);
  await updateBanner(validatedId, validated);
  revalidatePath("/admin/content/banners");
}

export async function deleteBannerAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteBanner(validated);
  revalidatePath("/admin/content/banners");
}

export async function reorderBannersAction(ids: unknown) {
  await requireAdmin();
  const validated = idsSchema.parse(ids);
  await reorderBanners(validated);
  revalidatePath("/admin/content/banners");
}
