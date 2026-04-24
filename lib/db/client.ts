import "server-only";
import postgres, { type TransactionSql } from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in environment");
}

/**
 * Build-time defence-in-depth.
 *
 * Когда `next build` запускается в Docker (Stage builder), DATABASE_URL
 * указывает на placeholder (см. Dockerfile ARG DATABASE_URL=…placeholder…),
 * а реальный Postgres в build-стэйдже недоступен (контейнер не в той же
 * сети). Без короткого timeout postgres-js будет ждать 10 секунд на каждый
 * connect-attempt, и SSG страниц с CMS-fetch'ами зависает на 1-2 минуты.
 *
 * Все CMS-страницы переведены на `force-dynamic`, но на случай нового
 * SSG-роута, который случайно дёрнет sql при build — глобально выставляем
 * connect_timeout = 1s в build-фазе (NEXT_PHASE='phase-production-build').
 * При normal-runtime — 10s, как раньше.
 */
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Глобальный postgres-js клиент.
 *
 * Используем tagged template literals: `sql`SELECT * FROM products WHERE id = ${id}``.
 * Параметры подставляются через подготовленные плейсхолдеры — SQL injection невозможен.
 *
 * НЕ используем `transform: postgres.camel` — типы из `types/database.ts`
 * описаны в snake_case, как в БД.
 */
export const sql = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: isBuildPhase ? 1 : 10,
  prepare: false,
  transform: { undefined: null },
});

export type Sql = typeof sql;
export type Tx = TransactionSql<Record<string, never>>;
