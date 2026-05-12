/**
 * Раздел «Заявки» — счётчики + список последних записей из трёх таблиц
 * (calculation_requests, leads, contact_requests).
 *
 * 2026-04-26: расширен набор колонок (имя/телефон/email/услуга/комментарий/
 * промокод/источник/статус/время + фильтр по типу). Каждая строка
 * кликабельна и ведёт на детальную страницу `/admin/leads/<type>/<id|ref>`.
 */
import Link from "next/link";

import { sql } from "@/lib/db/client";
import { requireResource } from "@/features/auth/api";
import LeadsListClient, {
  type LeadsListItem,
} from "@/features/admin/components/LeadsListClient";

export const metadata = { title: "Заявки" };
export const dynamic = "force-dynamic";

interface CountRow {
  count: number;
}

async function getCounts() {
  try {
    const [calc, leads, contacts] = await Promise.all([
      sql<CountRow[]>`SELECT COUNT(*)::int AS count FROM calculation_requests WHERE status = 'new'`,
      sql<CountRow[]>`SELECT COUNT(*)::int AS count FROM leads WHERE status = 'new'`,
      sql<CountRow[]>`SELECT COUNT(*)::int AS count FROM contact_requests WHERE status = 'new'`,
    ]);
    return {
      newCalc: calc[0]?.count ?? 0,
      newLeads: leads[0]?.count ?? 0,
      newContacts: contacts[0]?.count ?? 0,
    };
  } catch {
    return { newCalc: 0, newLeads: 0, newContacts: 0 };
  }
}

interface RecentLeadRow {
  id: number;
  type: "quote" | "one-click" | "contact";
  name: string | null;
  phone: string | null;
  email: string | null;
  service: string | null;
  message: string | null;
  status: string;
  source: string | null;
  promo_code: string | null;
  created_at: string;
  /** request_number / lead_number. Не используем имя `ref` — зарезервировано в React 19 (eslint react-hooks/refs). */
  ref_number: string | null;
}

/**
 * Возвращает 30 последних заявок из трёх таблиц объединённо.
 * UNION ALL — таблицы не пересекаются, дедуп не нужен.
 *
 * service = первая попавшаяся колонка-кандидат (название продукта,
 * subject и т.д.). message = пользовательский комментарий (truncate
 * на стороне клиента). Имена type'ов в SELECT'е — те же, что в
 * URL'ах (`quote`/`one-click`/`contact`), чтобы клиент мог сразу
 * сформировать href без перевода.
 *
 * Падение SELECT'а возвращает [], не падаем — на пустой/неинициализиро-
 * ванной БД UI показывает «Заявок пока нет».
 */
async function getRecentLeads(): Promise<RecentLeadRow[]> {
  try {
    return await sql<RecentLeadRow[]>`
      (
        SELECT
          c.id,
          'quote'::text AS type,
          c.customer_name AS name,
          c.customer_phone AS phone,
          c.customer_email AS email,
          p.name AS service,
          c.comment AS message,
          c.status::text AS status,
          NULL::text AS source,
          c.promo_code,
          c.created_at,
          c.request_number AS ref_number
        FROM calculation_requests c
        LEFT JOIN products p ON p.id = c.product_id
        ORDER BY c.created_at DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          l.id,
          'one-click'::text AS type,
          l.customer_name AS name,
          l.customer_phone AS phone,
          l.customer_email AS email,
          COALESCE(p.name, l.context->>'product_name') AS service,
          l.context->>'comment' AS message,
          l.status::text AS status,
          l.source,
          l.promo_code,
          l.created_at,
          l.lead_number AS ref_number
        FROM leads l
        LEFT JOIN products p ON p.id = l.product_id
        ORDER BY l.created_at DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          id,
          'contact'::text AS type,
          name,
          phone,
          email,
          subject AS service,
          message,
          status::text AS status,
          NULL::text AS source,
          promo_code,
          created_at,
          NULL::text AS ref_number
        FROM contact_requests
        ORDER BY created_at DESC
        LIMIT 15
      )
      ORDER BY created_at DESC
      LIMIT 30
    `;
  } catch (err) {
    console.warn("[admin/leads] recent leads SELECT failed:", err);
    return [];
  }
}

export default async function LeadsPage() {
  // Доступ: owner + manager (по permissions matrix). Manager — основной
  // потребитель: его задача обрабатывать заявки клиентов.
  await requireResource("leads");

  const [counts, recent] = await Promise.all([getCounts(), getRecentLeads()]);

  // Конвертируем в форму, которую ждёт клиентский компонент.
  const items: LeadsListItem[] = recent.map((r) => ({
    type: r.type,
    id: r.id,
    refNumber: r.ref_number,
    name: r.name,
    phone: r.phone,
    email: r.email,
    service: r.service,
    message: r.message,
    promo_code: r.promo_code,
    source: r.source,
    status: r.status,
    created_at: r.created_at,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
        Заявки
      </h1>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Счётчики новых заявок и последние 30 записей из всех трёх форм.
        Кликните по строке, чтобы посмотреть подробности и (при необходимости)
        удалить заявку.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <div className="text-3xl font-bold text-brand-orange">
            {counts.newCalc}
          </div>
          <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            новых заявок на расчёт
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <div className="text-3xl font-bold text-brand-orange">
            {counts.newLeads}
          </div>
          <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            заявок «купить в 1 клик»
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <div className="text-3xl font-bold text-brand-orange">
            {counts.newContacts}
          </div>
          <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            обращений из формы контактов
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href="/admin/promos"
          className="text-xs text-brand-orange hover:underline underline-offset-2"
        >
          Управлять промокодами →
        </Link>
      </div>

      <LeadsListClient items={items} />
    </div>
  );
}
