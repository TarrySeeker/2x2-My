import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook СДЭК.
 *
 * История: ранее обновлял `orders.status` по статусам трекинга. После
 * миграции 006 таблица `orders` удалена (бизнес-модель «только
 * индивидуальный расчёт»), накладные больше не создаются автоматически
 * с сайта. Endpoint оставлен:
 *  - чтобы СДЭК не получал 404 при доставке вебхуков по подписке,
 *    которая могла остаться в кабинете;
 *  - чтобы добавить корректную HMAC-проверку как требование security-аудита (P1-4);
 *  - на случай возврата интеграции в будущем.
 *
 * Сейчас: принимаем JSON, проверяем HMAC, логируем тип события и
 * возвращаем `{ ok: true, ignored: true }`. БД не трогаем.
 *
 * Безопасность:
 *  1. CDEK_WEBHOOK_SECRET — env, обязателен. Без него возвращаем 503.
 *  2. Подпись считается HMAC-SHA256 от raw body, ожидаем в заголовке
 *     `X-Service-Sign` (имя из доков СДЭК; альтернативно `X-Cdek-Sign`).
 *  3. Сравнение через `timingSafeEqual` — защита от timing-attack.
 *  4. Дополнительный whitelist по IP остался — `CDEK_WEBHOOK_ALLOWED_IPS`.
 */

const CDEK_ALLOWED_IPS = (process.env.CDEK_WEBHOOK_ALLOWED_IPS ?? "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

function verifyHmac(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.CDEK_WEBHOOK_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;

  const computed = createHmac("sha256", secret).update(rawBody).digest("hex");
  // Подпись может прийти как hex (64 символа) или base64. Сначала
  // сравним hex — самый частый формат.
  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(signatureHeader.trim(), "hex");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  } catch {
    /* fallthrough */
  }
  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(signatureHeader.trim(), "base64");
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  } catch {
    /* nope */
  }
  return false;
}

export async function POST(request: NextRequest) {
  // 1. IP whitelist (если задан).
  if (CDEK_ALLOWED_IPS.length > 0) {
    const fwd = request.headers.get("x-forwarded-for");
    const real = request.headers.get("x-real-ip");
    const clientIp = fwd?.split(",")[0]?.trim() || real || "";
    if (!CDEK_ALLOWED_IPS.includes(clientIp)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // 2. Секрет должен быть настроен.
  if (!process.env.CDEK_WEBHOOK_SECRET) {
    console.error(
      "[cdek/webhook] CDEK_WEBHOOK_SECRET is not configured — rejecting webhook",
    );
    return NextResponse.json(
      { error: "Webhook secret is not configured" },
      { status: 503 },
    );
  }

  // 3. Читаем raw body для HMAC.
  let raw: string;
  try {
    raw = await request.text();
  } catch (err) {
    console.error("[cdek/webhook] failed to read body:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // 4. Подпись.
  const signature =
    request.headers.get("x-service-sign") ??
    request.headers.get("x-cdek-sign") ??
    request.headers.get("x-signature");

  if (!verifyHmac(raw, signature)) {
    console.warn("[cdek/webhook] HMAC verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 5. Парсим тело (best-effort) и логируем.
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  const eventType =
    payload && typeof payload === "object" && "type" in payload
      ? String((payload as { type?: unknown }).type ?? "unknown")
      : "unknown";

  console.info(
    `[cdek/webhook] received ${eventType} event (orders table is gone — ignored)`,
  );

  // 6. Бизнес-логика отсутствует — orders таблица дропнута. Возвращаем
  //    200, чтобы СДЭК не делал retry бесконечно.
  return NextResponse.json({ ok: true, ignored: true });
}
