import "server-only";

import { sql } from "@/lib/db/client";

/**
 * Чтение и удаление заявок из трёх таблиц.
 *
 * Заявки приходят в три разные таблицы (исторически сложилось),
 * каждая со своими наборами полей:
 *
 *   - `calculation_requests` (LeadType="quote") — модальная форма
 *     «Заказать расчёт». Поля: customer_name/phone/email,
 *     comment, params(JSONB), attachments(text[]), source_url,
 *     promo_code, request_number, и pd_consent_*.
 *
 *   - `leads` (LeadType="one-click") — кнопка «Купить в 1 клик»
 *     на странице товара. Поля: customer_name/phone/email,
 *     product_id, context(JSONB={product_name, comment}),
 *     UTM-набор, page_url, referer, user_agent, promo_code,
 *     pd_consent_*.
 *
 *   - `contact_requests` (LeadType="contact") — форма /contacts.
 *     Поля: name/email/phone, subject, message, promo_code,
 *     pd_consent_*.
 *
 * Чтобы UI был единообразным, мы нормализуем эти источники в один
 * `LeadDetail`. Поля, которых в конкретной таблице нет, остаются `null`.
 *
 * Type-параметр в URL — whitelist {quote, one-click, contact},
 * это критично: значение прокидывается в SQL `FROM` через
 * `LEAD_TABLES[type]`, никакой возможности SQL-инъекции нет.
 */

export const LEAD_TYPES = ["quote", "one-click", "contact"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export function isLeadType(value: unknown): value is LeadType {
  return (
    typeof value === "string" && (LEAD_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Whitelist допустимых таблиц. Используется в DELETE — принципиально
 * НЕ позволяем подставлять имя таблицы динамически из user-input.
 * Любое изменение здесь требует ревью на безопасность.
 */
export const LEAD_TABLES: Record<LeadType, string> = {
  quote: "calculation_requests",
  "one-click": "leads",
  contact: "contact_requests",
};

/**
 * Унифицированный объект заявки для админ-UI. Все поля nullable —
 * каждая таблица заполняет только то, что у неё есть.
 */
export interface LeadDetail {
  type: LeadType;
  id: number;
  /**
   * Человеко-читаемый номер заявки (CR-000001) — только у quote.
   * Намеренно НЕ называем `ref`: это зарезервированное имя в React 19,
   * eslint-plugin-react-hooks/refs ругается даже на доступ к свойству.
   */
  refNumber: string | null;
  status: string;
  source: string | null;
  created_at: string;

  // Контакты.
  name: string | null;
  phone: string | null;
  email: string | null;

  // Содержание.
  /** Пользовательский комментарий / задача. */
  message: string | null;
  /** Тема (только в contact_requests). */
  subject: string | null;
  /** Краткое описание услуги/товара (отображается в таблице). */
  service: string | null;

  // Доп. данные.
  promo_code: string | null;
  attachments: string[];
  /** Параметры расчёта (JSONB). Только у quote. */
  params: Record<string, unknown> | null;

  // Технические.
  source_url: string | null;
  page_url: string | null;
  referer: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;

  // 152-ФЗ.
  pd_consent_at: string | null;
  pd_consent_version: string | null;
  pd_consent_ip: string | null;
  idempotency_key: string | null;

  // Менеджерские поля.
  manager_comment: string | null;
  assigned_to: string | null;

  // company_name (только quote).
  company_name: string | null;
}

interface CalcRow {
  id: number;
  request_number: string | null;
  status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  company_name: string | null;
  comment: string | null;
  params: Record<string, unknown> | null;
  attachments: string[] | null;
  source_url: string | null;
  promo_code: string | null;
  pd_consent_at: string | null;
  pd_consent_version: string | null;
  pd_consent_ip: string | null;
  idempotency_key: string | null;
  manager_comment: string | null;
  assigned_to: string | null;
  created_at: string;
  product_name: string | null;
}

interface OneClickRow {
  id: number;
  status: string;
  source: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  context: Record<string, unknown> | null;
  page_url: string | null;
  referer: string | null;
  user_agent: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  promo_code: string | null;
  pd_consent_at: string | null;
  pd_consent_version: string | null;
  pd_consent_ip: string | null;
  idempotency_key: string | null;
  manager_comment: string | null;
  assigned_to: string | null;
  created_at: string;
  product_name: string | null;
}

interface ContactRow {
  id: number;
  status: string;
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  promo_code: string | null;
  pd_consent_at: string | null;
  pd_consent_version: string | null;
  pd_consent_ip: string | null;
  idempotency_key: string | null;
  created_at: string;
}

/**
 * Достаёт заявку по id или request_number (для quote — оба варианта).
 * Возвращает null, если не найдена.
 */
export async function getLeadDetail(
  type: LeadType,
  id: string,
): Promise<LeadDetail | null> {
  if (type === "quote") {
    return getCalcRequest(id);
  }
  if (type === "one-click") {
    return getOneClickLead(id);
  }
  return getContactRequest(id);
}

async function getCalcRequest(idOrRef: string): Promise<LeadDetail | null> {
  // Принимаем либо число (id), либо request_number ("CR-000001").
  const numericId = Number.parseInt(idOrRef, 10);
  const isNumeric = !Number.isNaN(numericId) && /^\d+$/.test(idOrRef);

  // Две отдельных SELECT-ветки вместо nested sql-template (`WHERE ${sql`...`}`) —
  // эта форма ломает наш test-мок (mockSql не поддерживает вложенные tagged
  // templates) и в целом менее читаема.
  // Поле product_name раньше тянули JOIN'ом с products (legacy-таблица
  // от шаблонной CMS). Сущность «Товары» удалена 2026-05-06, JOIN
  // заменён на NULL — у заявок на расчёт сегодня вместо «товара»
  // фигурирует свободный комментарий клиента (`comment`) и
  // одноимённое поле в params. UI заявки и так использует comment как
  // основной носитель смысла.
  const rows = isNumeric
    ? await sql<CalcRow[]>`
        SELECT
          c.id,
          c.request_number,
          c.status::text AS status,
          c.customer_name,
          c.customer_phone,
          c.customer_email,
          c.company_name,
          c.comment,
          c.params,
          c.attachments,
          c.source_url,
          c.promo_code,
          c.pd_consent_at,
          c.pd_consent_version,
          c.pd_consent_ip::text AS pd_consent_ip,
          c.idempotency_key,
          c.manager_comment,
          c.assigned_to,
          c.created_at,
          NULL::text AS product_name
        FROM calculation_requests c
        WHERE c.id = ${numericId}
        LIMIT 1
      `
    : await sql<CalcRow[]>`
        SELECT
          c.id,
          c.request_number,
          c.status::text AS status,
          c.customer_name,
          c.customer_phone,
          c.customer_email,
          c.company_name,
          c.comment,
          c.params,
          c.attachments,
          c.source_url,
          c.promo_code,
          c.pd_consent_at,
          c.pd_consent_version,
          c.pd_consent_ip::text AS pd_consent_ip,
          c.idempotency_key,
          c.manager_comment,
          c.assigned_to,
          c.created_at,
          NULL::text AS product_name
        FROM calculation_requests c
        WHERE c.request_number = ${idOrRef}
        LIMIT 1
      `;

  const row = rows[0];
  if (!row) return null;

  return {
    type: "quote",
    id: row.id,
    refNumber: row.request_number,
    status: row.status,
    source: null,
    created_at: row.created_at,
    name: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email,
    message: row.comment,
    subject: null,
    service: row.product_name,
    promo_code: row.promo_code,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    params: row.params ?? null,
    source_url: row.source_url,
    page_url: null,
    referer: null,
    user_agent: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    pd_consent_at: row.pd_consent_at,
    pd_consent_version: row.pd_consent_version,
    pd_consent_ip: row.pd_consent_ip,
    idempotency_key: row.idempotency_key,
    manager_comment: row.manager_comment,
    assigned_to: row.assigned_to,
    company_name: row.company_name,
  };
}

async function getOneClickLead(idOrRef: string): Promise<LeadDetail | null> {
  const numericId = Number.parseInt(idOrRef, 10);
  const isNumeric = !Number.isNaN(numericId) && /^\d+$/.test(idOrRef);

  // См. комментарий в getCalcRequest — две отдельные ветки вместо nested sql.
  // См. комментарий выше про NULL вместо JOIN с products. Для one-click
  // имя услуги по-прежнему есть в `context.product_name` (туда его
  // кладёт OneClickModal — это «продаваемая позиция» из категорий
  // /services), и оно используется как fallback ниже.
  const rows = isNumeric
    ? await sql<OneClickRow[]>`
        SELECT
          l.id,
          l.status::text AS status,
          l.source,
          l.customer_name,
          l.customer_phone,
          l.customer_email,
          l.context,
          l.page_url,
          l.referer,
          l.user_agent,
          l.utm_source,
          l.utm_medium,
          l.utm_campaign,
          l.promo_code,
          l.pd_consent_at,
          l.pd_consent_version,
          l.pd_consent_ip::text AS pd_consent_ip,
          l.idempotency_key,
          l.manager_comment,
          l.assigned_to,
          l.created_at,
          NULL::text AS product_name
        FROM leads l
        WHERE l.id = ${numericId}
        LIMIT 1
      `
    : await sql<OneClickRow[]>`
        SELECT
          l.id,
          l.status::text AS status,
          l.source,
          l.customer_name,
          l.customer_phone,
          l.customer_email,
          l.context,
          l.page_url,
          l.referer,
          l.user_agent,
          l.utm_source,
          l.utm_medium,
          l.utm_campaign,
          l.promo_code,
          l.pd_consent_at,
          l.pd_consent_version,
          l.pd_consent_ip::text AS pd_consent_ip,
          l.idempotency_key,
          l.manager_comment,
          l.assigned_to,
          l.created_at,
          NULL::text AS product_name
        FROM leads l
        WHERE l.lead_number = ${idOrRef}
        LIMIT 1
      `;

  const row = rows[0];
  if (!row) return null;

  // context = { product_name, comment } (см. /api/leads/one-click).
  const ctxComment =
    row.context && typeof row.context === "object" && "comment" in row.context
      ? ((row.context as { comment?: unknown }).comment as string | null)
      : null;
  const ctxProductName =
    row.context && typeof row.context === "object" && "product_name" in row.context
      ? ((row.context as { product_name?: unknown }).product_name as string | null)
      : null;

  return {
    type: "one-click",
    id: row.id,
    refNumber: null,
    status: row.status,
    source: row.source,
    created_at: row.created_at,
    name: row.customer_name,
    phone: row.customer_phone,
    email: row.customer_email,
    message: ctxComment,
    subject: null,
    service: row.product_name ?? ctxProductName,
    promo_code: row.promo_code,
    attachments: [],
    params: null,
    source_url: null,
    page_url: row.page_url,
    referer: row.referer,
    user_agent: row.user_agent,
    utm_source: row.utm_source,
    utm_medium: row.utm_medium,
    utm_campaign: row.utm_campaign,
    pd_consent_at: row.pd_consent_at,
    pd_consent_version: row.pd_consent_version,
    pd_consent_ip: row.pd_consent_ip,
    idempotency_key: row.idempotency_key,
    manager_comment: row.manager_comment,
    assigned_to: row.assigned_to,
    company_name: null,
  };
}

async function getContactRequest(idOrRef: string): Promise<LeadDetail | null> {
  const numericId = Number.parseInt(idOrRef, 10);
  if (Number.isNaN(numericId) || !/^\d+$/.test(idOrRef)) return null;

  const rows = await sql<ContactRow[]>`
    SELECT
      id,
      status::text AS status,
      name,
      phone,
      email,
      subject,
      message,
      promo_code,
      pd_consent_at,
      pd_consent_version,
      pd_consent_ip::text AS pd_consent_ip,
      idempotency_key,
      created_at
    FROM contact_requests
    WHERE id = ${numericId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    type: "contact",
    id: row.id,
    refNumber: null,
    status: row.status,
    source: null,
    created_at: row.created_at,
    name: row.name,
    phone: row.phone,
    email: row.email,
    message: row.message,
    subject: row.subject,
    service: row.subject,
    promo_code: row.promo_code,
    attachments: [],
    params: null,
    source_url: null,
    page_url: null,
    referer: null,
    user_agent: null,
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    pd_consent_at: row.pd_consent_at,
    pd_consent_version: row.pd_consent_version,
    pd_consent_ip: row.pd_consent_ip,
    idempotency_key: row.idempotency_key,
    manager_comment: null,
    assigned_to: null,
    company_name: null,
  };
}

/**
 * Удаляет заявку. Возвращает количество удалённых строк (0 = не было).
 *
 * SQL-инъекция невозможна:
 *   - `type` валидируется через `isLeadType()` ДО вызова;
 *   - имя таблицы берётся из whitelist `LEAD_TABLES`;
 *   - `id` — параметризованный INTEGER.
 *
 * postgres-js НЕ поддерживает `${sql.unsafe(table)}` в DELETE с tagged
 * template без явной маркировки — поэтому формируем строку вручную и
 * вызываем `sql.unsafe(query, [id])`. Это безопасно ровно потому, что
 * имя таблицы — известная константа из whitelist.
 */
export async function deleteLead(type: LeadType, id: number): Promise<number> {
  if (!isLeadType(type)) {
    throw new Error(`Invalid lead type: ${type}`);
  }
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid lead id: ${id}`);
  }
  const table = LEAD_TABLES[type];
  // sql.unsafe здесь — безопасно: имя таблицы из whitelist, id —
  // позиционный параметр ($1) с явным типом INTEGER.
  const result = await sql.unsafe(
    `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
    [id],
  );
  // postgres-js возвращает массив RETURNING-строк.
  return Array.isArray(result) ? result.length : 0;
}
