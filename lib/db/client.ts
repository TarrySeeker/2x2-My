import "server-only";
import postgres, { type TransactionSql } from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in environment");
}

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
  connect_timeout: 10,
  prepare: false,
  transform: { undefined: null },
});

export type Sql = typeof sql;
export type Tx = TransactionSql<Record<string, never>>;
