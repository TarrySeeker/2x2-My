import "server-only";

import { unstable_cache } from "next/cache";

import { sql, type Tx } from "@/lib/db/client";
import type { TeamMember } from "@/types";

/**
 * Команда (team_members) для раздела /about и блока «Наша команда»
 * на главной.
 *
 * Публичные функции `listActiveTeamMembers` идут через `unstable_cache`
 * (тег `team`). Админские (`listAll`, `create`, `update`, `delete`,
 * `reorder`) сразу пишут в БД и возвращают свежие данные — server
 * action'ы должны вызывать `revalidateTag('team')`.
 */

export const TEAM_CACHE_TAG = "team";

interface TeamMemberRow {
  id: number;
  name: string;
  role: string;
  photo_url: string | null;
  bio: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const listActiveCached = unstable_cache(
  async (): Promise<TeamMember[]> => {
    try {
      const rows = await sql<TeamMemberRow[]>`
        SELECT id, name, role, photo_url, bio, sort_order, is_active,
               created_at, updated_at
        FROM team_members
        WHERE is_active = true
        ORDER BY sort_order ASC, id ASC
      `;
      return rows;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[team.listActive] DB read failed:", err);
      }
      return [];
    }
  },
  ["team-members-active"],
  { revalidate: 60, tags: [TEAM_CACHE_TAG] },
);

export async function listActiveTeamMembers(): Promise<TeamMember[]> {
  return listActiveCached();
}

export async function listAllTeamMembers(): Promise<TeamMember[]> {
  try {
    const rows = await sql<TeamMemberRow[]>`
      SELECT id, name, role, photo_url, bio, sort_order, is_active,
             created_at, updated_at
      FROM team_members
      ORDER BY sort_order ASC, id ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[team.listAll] DB read failed:", err);
    }
    return [];
  }
}

export async function getTeamMember(id: number): Promise<TeamMember | null> {
  const rows = await sql<TeamMemberRow[]>`
    SELECT id, name, role, photo_url, bio, sort_order, is_active,
           created_at, updated_at
    FROM team_members
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface TeamMemberInput {
  name: string;
  role: string;
  photoUrl: string | null;
  bio: string | null;
  sortOrder: number;
  isActive: boolean;
}

export async function createTeamMember(
  input: TeamMemberInput,
): Promise<TeamMember> {
  const rows = await sql<TeamMemberRow[]>`
    INSERT INTO team_members (name, role, photo_url, bio, sort_order, is_active)
    VALUES (
      ${input.name},
      ${input.role},
      ${input.photoUrl},
      ${input.bio},
      ${input.sortOrder},
      ${input.isActive}
    )
    RETURNING id, name, role, photo_url, bio, sort_order, is_active,
              created_at, updated_at
  `;
  const row = rows[0];
  if (!row) throw new Error("Failed to insert team_members");
  return row;
}

export async function updateTeamMember(
  id: number,
  input: TeamMemberInput,
): Promise<void> {
  await sql`
    UPDATE team_members
    SET name       = ${input.name},
        role       = ${input.role},
        photo_url  = ${input.photoUrl},
        bio        = ${input.bio},
        sort_order = ${input.sortOrder},
        is_active  = ${input.isActive},
        updated_at = NOW()
    WHERE id = ${id}
  `;
}

/**
 * Удаляет запись и возвращает старый photo_url (если был) — чтобы
 * server action мог удалить файл из MinIO.
 */
export async function deleteTeamMember(id: number): Promise<string | null> {
  const rows = await sql<{ photo_url: string | null }[]>`
    DELETE FROM team_members
    WHERE id = ${id}
    RETURNING photo_url
  `;
  return rows[0]?.photo_url ?? null;
}

/**
 * Массовое обновление sort_order. Принимает упорядоченный список id.
 * Внутри транзакции — атомарно.
 */
export async function reorderTeamMembers(orderedIds: number[]): Promise<void> {
  if (orderedIds.length === 0) return;
  await sql.begin(async (tx: Tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]!;
      await tx`
        UPDATE team_members
        SET sort_order = ${i},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    }
  });
}
