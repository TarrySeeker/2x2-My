/**
 * Раздел «Заявки» — заглушка под этап 3.
 *
 * Здесь будут отображаться записи из:
 *  - calculation_requests (заявки на расчёт)
 *  - leads (быстрые заявки и one-click)
 *  - contact_requests (формы обратной связи)
 *
 * Полноценный UI с фильтрами, табом «Тип», переходом в детальный
 * вид и сменой статуса — задача frontend-developer (этап 3).
 */
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

export default async function LeadsPage() {
  const counts = await getCounts();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
        Заявки
      </h1>

      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Полноценный список и фильтры будут готовы в ближайшем релизе.
        Пока — счётчики новых заявок.
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
    </div>
  );
}
