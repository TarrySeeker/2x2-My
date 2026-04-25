/**
 * Раздел «Заявки» — счётчики + последние записи из трёх таблиц
 * (calculation_requests, leads, contact_requests).
 *
 * Полноценный list с фильтрами/сменой статуса появится позже —
 * пока менеджеру важно видеть факт поступления и (с 2026-04-25)
 * введённый клиентом промокод-маркер: он подсказывает, по какой
 * акции пришла заявка, и помогает в подготовке КП.
 */
import Link from "next/link";
import { sql } from "@/lib/db/client";

export const metadata = { title: "Заявки" };

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
  type: "calc" | "one_click" | "contact";
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  promo_code: string | null;
  created_at: string;
  ref: string | null;
}

/**
 * Возвращает 30 последних заявок из трёх таблиц объединённо.
 * UNION + DISTINCT по полям не нужен — таблицы не пересекаются.
 * Даты сортируем убыванием. SELECT защищён try/catch — на пустой/
 * неинициализированной БД возвращаем пустой список (не падаем).
 */
async function getRecentLeads(): Promise<RecentLeadRow[]> {
  try {
    return await sql<RecentLeadRow[]>`
      (
        SELECT
          id,
          'calc'::text AS type,
          customer_name,
          customer_phone,
          status::text,
          promo_code,
          created_at,
          request_number AS ref
        FROM calculation_requests
        ORDER BY created_at DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          id,
          'one_click'::text AS type,
          customer_name,
          customer_phone,
          status::text,
          promo_code,
          created_at,
          lead_number AS ref
        FROM leads
        ORDER BY created_at DESC
        LIMIT 15
      )
      UNION ALL
      (
        SELECT
          id,
          'contact'::text AS type,
          name AS customer_name,
          phone AS customer_phone,
          status::text,
          promo_code,
          created_at,
          NULL::text AS ref
        FROM contact_requests
        ORDER BY created_at DESC
        LIMIT 15
      )
      ORDER BY created_at DESC
      LIMIT 30
    `;
  } catch {
    return [];
  }
}

const TYPE_LABEL: Record<RecentLeadRow["type"], string> = {
  calc: "Расчёт",
  one_click: "В 1 клик",
  contact: "Контакты",
};

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default async function LeadsPage() {
  const [counts, recent] = await Promise.all([getCounts(), getRecentLeads()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
        Заявки
      </h1>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Полноценный список и фильтры будут готовы в ближайшем релизе.
        Пока — счётчики новых заявок и последние 30 записей из всех трёх форм.
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

      <section className="rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-white/10">
          <h2 className="text-base font-semibold text-brand-dark dark:text-white">
            Последние заявки
          </h2>
          <Link
            href="/admin/promos"
            className="text-xs text-brand-orange hover:underline underline-offset-2"
          >
            Управлять промокодами →
          </Link>
        </header>

        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-neutral-500">
            Заявок пока нет.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Тип</th>
                  <th className="px-4 py-2 text-left font-medium">Имя</th>
                  <th className="px-4 py-2 text-left font-medium">Телефон</th>
                  <th className="px-4 py-2 text-left font-medium">Статус</th>
                  <th className="px-4 py-2 text-left font-medium">Промокод</th>
                  <th className="px-4 py-2 text-left font-medium">Когда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
                {recent.map((row) => (
                  <tr
                    key={`${row.type}-${row.id}`}
                    className="text-brand-dark dark:text-white"
                  >
                    <td className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400">
                      {TYPE_LABEL[row.type]}
                      {row.ref && (
                        <span className="ml-1 text-neutral-400">{row.ref}</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{row.customer_name ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {row.customer_phone ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {row.promo_code ? (
                        // Заметный badge с brand-цветом — менеджер сразу
                        // видит, что заявка пришла «по акции».
                        <span className="inline-flex items-center rounded-md bg-brand-orange/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/30">
                          {row.promo_code}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-neutral-500">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
