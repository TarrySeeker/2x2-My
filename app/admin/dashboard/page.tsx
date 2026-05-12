/**
 * /admin/dashboard — обновлено 2026-05-12.
 *
 * Бизнес-модель «2х2» — только индивидуальные расчёты, онлайн-оплаты
 * и заказов нет. Поэтому виджеты «Выручка», «Средний чек», «Заказы»,
 * «Новые заказы» + график выручки + последние заказы + топ товаров
 * убраны (cleanup 2026-04-25).
 *
 * 2026-05-06: удалена сущность «Товары» целиком — 2х2 продаёт услуги,
 * не товары. Убраны виджеты «Активных товаров» и «Мало на складе»,
 * освободившееся место заняли счётчики «Услуг в каталоге».
 *
 * 2026-05-12: удалён раздел «Отзывы» целиком (нет отзывов у клиента).
 * Виджет «Отзывов на модерации» и список PendingReviews убраны.
 * Освободившийся слот в Row 2 закрыт счётчиком «Работ в портфолио».
 */

import Link from "next/link";
import {
  Calculator,
  PhoneCall,
  Mail,
  TicketPercent,
  Briefcase,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  getDashboardStatsV2,
  getLeadsBySource30d,
  getLeadsWithPromoMonth,
  getServicesCount,
} from "@/features/admin/api/dashboard";
import StatTile from "@/features/admin/components/StatTile";
import LeadsBySourceCard from "@/features/admin/components/LeadsBySourceCard";

export const metadata = { title: "Дашборд" };

const numberFormatter = new Intl.NumberFormat("ru-RU");

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export default async function DashboardPage() {
  const [stats, sources, promoMonth, servicesCount] =
    await Promise.all([
      getDashboardStatsV2(),
      getLeadsBySource30d(5),
      getLeadsWithPromoMonth(),
      getServicesCount(),
    ]);

  const newRequestsTotal =
    stats.new_calc_requests + stats.new_leads + stats.new_contacts;
  const weekTotal = stats.calc_requests_week + stats.leads_week;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
            Дашборд
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Заявки, источники, акции. Полный список —{" "}
            <Link
              href="/admin/leads"
              className="text-brand-orange underline-offset-2 hover:underline"
            >
              в разделе «Заявки»
            </Link>
            .
          </p>
        </div>
        {newRequestsTotal > 0 && (
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-2 rounded-full bg-brand-orange px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-orange/90"
          >
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px]">
              {newRequestsTotal}
            </span>
            Новых заявок ждут ответа
          </Link>
        )}
      </header>

      {/* Row 1: четыре основных счётчика заявок */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          title="Заявок за неделю"
          value={formatNumber(weekTotal)}
          caption={`из них на расчёт: ${formatNumber(stats.calc_requests_week)} • в 1 клик: ${formatNumber(stats.leads_week)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          href="/admin/leads"
        />
        <StatTile
          title="Новых на расчёт"
          value={formatNumber(stats.new_calc_requests)}
          caption={`за месяц: ${formatNumber(stats.calc_requests_month)}`}
          icon={<Calculator className="h-5 w-5" />}
          href="/admin/leads"
          highlight={stats.new_calc_requests > 0}
        />
        <StatTile
          title="Новых «в 1 клик»"
          value={formatNumber(stats.new_leads)}
          caption="заявки по кнопке быстрого заказа"
          icon={<PhoneCall className="h-5 w-5" />}
          href="/admin/leads"
          highlight={stats.new_leads > 0}
        />
        <StatTile
          title="Новых обращений"
          value={formatNumber(stats.new_contacts)}
          caption="форма «Контакты»"
          icon={<Mail className="h-5 w-5" />}
          href="/admin/leads"
          highlight={stats.new_contacts > 0}
        />
      </div>

      {/* Row 2: вспомогательные счётчики каталога/контента.
          «Активных товаров» / «Мало на складе» удалены вместе с
          сущностью «Товары» (2026-05-06). Виджет «Отзывов на модерации»
          удалён вместе с разделом «Отзывы» (2026-05-12). Сетка
          уплотнена с 4 до 3 колонок. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          title="Заявок с промокодом"
          value={formatNumber(promoMonth)}
          caption="за текущий месяц"
          icon={<TicketPercent className="h-5 w-5" />}
          href="/admin/promos"
        />
        <StatTile
          title="Услуг в каталоге"
          value={formatNumber(servicesCount.enabled)}
          caption={`черновиков: ${formatNumber(servicesCount.disabled)}`}
          icon={<Wrench className="h-5 w-5" />}
          href="/admin/content/services"
        />
        <StatTile
          title="Работ в портфолио"
          value={formatNumber(stats.portfolio_count)}
          caption="опубликовано"
          icon={<Briefcase className="h-5 w-5" />}
          href="/admin/content/portfolio"
        />
      </div>

      {/* Row 3: источники лидов. Раньше рядом был блок «Отзывы на
          модерации» — удалён вместе с разделом 2026-05-12. */}
      <div className="grid grid-cols-1 gap-6">
        <LeadsBySourceCard sources={sources} />
      </div>
    </div>
  );
}
