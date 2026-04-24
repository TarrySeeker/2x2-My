import "server-only";

import { z } from "zod";

/**
 * Утилиты для согласия на обработку ПД (152-ФЗ) и идемпотентности
 * формы. Используются всеми публичными приёмниками заявок:
 *  - /api/leads/quote
 *  - /api/leads/one-click
 *  - /api/contact
 *
 * Контракт:
 *  - В body должна быть `pdConsent: true` (любое другое значение → 400).
 *  - В headers может быть `Idempotency-Key` (UUID v4 от клиента).
 *    Если ключ есть и запись с таким ключом уже создана — возвращаем
 *    сохранённый ID (без повторной вставки).
 *  - На сервере фиксируем `pd_consent_at = NOW()`,
 *    `pd_consent_version = из site_settings.pd_consent.current_version`
 *    (fallback константа), `pd_consent_ip = inet`.
 */

/**
 * Текущая версия согласия на обработку ПД. Должна совпадать с
 * `site_settings.pd_consent.current_version` в `db/seed_cms.sql`.
 * Дублируется здесь, чтобы не делать запрос в БД на каждый POST.
 *
 * Если клиент в админке поменяет версию — не страшно: это просто
 * метка, по которой потом можно отделить старые согласия от новых.
 */
export const PD_CONSENT_VERSION = "2026-04-23";

// В Zod 3.x `z.literal(true, { message })` игнорируется и в issue
// попадает дефолтное «Invalid literal value, expected true». Чтобы
// клиент/тесты получали локализованное сообщение, перехватываем через
// errorMap (он в 3.x — единственный надёжный способ).
export const pdConsentField = z.literal(true, {
  errorMap: () => ({
    message: "Необходимо согласие на обработку персональных данных",
  }),
});

export interface PdConsentMeta {
  pd_consent_at: Date;
  pd_consent_version: string;
  pd_consent_ip: string | null;
}

export function makeConsentMeta(ip: string | null): PdConsentMeta {
  return {
    pd_consent_at: new Date(),
    pd_consent_version: PD_CONSENT_VERSION,
    pd_consent_ip: ip,
  };
}

/**
 * Извлекает IP клиента в формате, пригодном для INET-колонки postgres.
 * Возвращает null если не получилось определить — INET допускает NULL.
 */
export function clientIpForInet(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  const real = headers.get("x-real-ip");
  const raw = fwd?.split(",")[0]?.trim() || real || "";
  if (!raw || raw === "unknown") return null;
  // Простая нормализация: вырезаем порт у IPv4 (1.2.3.4:5678) и
  // квадратные скобки у IPv6 ([::1]). Полная валидация — на стороне БД.
  let ip = raw;
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end > 0) ip = ip.slice(1, end);
  } else if (ip.includes(":") && !ip.includes("::")) {
    // IPv4 с портом.
    const parts = ip.split(":");
    if (parts.length === 2) ip = parts[0]!;
  }
  return ip || null;
}

/**
 * Возвращает Idempotency-Key из заголовков, если он есть и валидный.
 * Принимаем любую строку 8..200 символов, чтобы не ломаться о формат
 * клиента (UUID v4 — рекомендация, не требование).
 */
export function readIdempotencyKey(headers: Headers): string | null {
  const raw = headers.get("idempotency-key") ?? headers.get("x-idempotency-key");
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 200) return null;
  // Только safe символы.
  if (!/^[A-Za-z0-9._\-:]+$/.test(trimmed)) return null;
  return trimmed;
}
