"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/features/auth/api";
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  reorderTeamMembers,
  getTeamMember,
  TEAM_CACHE_TAG,
} from "@/lib/data/team";
import {
  teamMemberSchema,
  reorderTeamSchema,
} from "@/features/admin/schemas/team";
import { deleteFile, isS3Configured } from "@/lib/storage/s3";
import { sql } from "@/lib/db/client";

const idSchema = z.number().int().positive();

interface ActionResult {
  ok: boolean;
  error?: string;
}

function inputFromForm(data: z.infer<typeof teamMemberSchema>) {
  return {
    name: data.name.trim(),
    role: data.role.trim(),
    photoUrl: data.photo_url ?? null,
    bio: data.bio ?? null,
    sortOrder: data.sort_order,
    isActive: data.is_active,
  };
}

async function audit(
  userId: string,
  action: string,
  recordId: string | null,
  payload: unknown,
): Promise<void> {
  try {
    await sql`
      SELECT log_admin_action(
        ${userId},
        ${action},
        'team_members',
        ${recordId},
        NULL,
        ${sql.json(payload as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    console.warn("[team audit]", action, err);
  }
}

function invalidate() {
  updateTag(TEAM_CACHE_TAG);
  revalidatePath("/about");
  revalidatePath("/");
  revalidatePath("/admin/content/team");
}

export async function createTeamMemberAction(
  data: unknown,
): Promise<ActionResult & { id?: number }> {
  const profile = await requireAdmin();

  const parsed = teamMemberSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const created = await createTeamMember(inputFromForm(parsed.data));
    invalidate();
    await audit(profile.id, "team.create", String(created.id), parsed.data);
    return { ok: true, id: created.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось создать сотрудника";
    return { ok: false, error: message };
  }
}

export async function updateTeamMemberAction(
  rawId: number,
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  const parsed = teamMemberSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    // Если сменилось фото — старое удалим из S3 (best-effort).
    const before = await getTeamMember(idResult.data);
    const newPhoto = parsed.data.photo_url ?? null;
    const oldPhoto = before?.photo_url ?? null;

    await updateTeamMember(idResult.data, inputFromForm(parsed.data));

    if (oldPhoto && oldPhoto !== newPhoto) {
      await tryDeleteByPublicUrl(oldPhoto);
    }

    invalidate();
    await audit(
      profile.id,
      "team.update",
      String(idResult.data),
      parsed.data,
    );
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить сотрудника";
    return { ok: false, error: message };
  }
}

export async function deleteTeamMemberAction(
  rawId: number,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  try {
    const photoUrl = await deleteTeamMember(idResult.data);
    if (photoUrl) {
      await tryDeleteByPublicUrl(photoUrl);
    }

    invalidate();
    await audit(profile.id, "team.delete", String(idResult.data), null);
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось удалить сотрудника";
    return { ok: false, error: message };
  }
}

export async function reorderTeamMembersAction(
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const parsed = reorderTeamSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await reorderTeamMembers(parsed.data.ids);
    invalidate();
    await audit(profile.id, "team.reorder", null, parsed.data);
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сменить порядок";
    return { ok: false, error: message };
  }
}

/**
 * Best-effort удаление файла из S3 по публичному URL.
 * Молча возвращает, если S3 не настроен или URL не относится к нашему bucket'у.
 */
async function tryDeleteByPublicUrl(publicUrl: string): Promise<void> {
  if (!isS3Configured()) return;
  const base = process.env.S3_PUBLIC_URL;
  if (!base) return;
  const normalized = base.replace(/\/$/, "") + "/";
  if (!publicUrl.startsWith(normalized)) return;
  const key = publicUrl.slice(normalized.length);
  if (!key) return;
  try {
    await deleteFile(key);
  } catch (err) {
    console.warn("[team] deleteFile failed:", err);
  }
}
