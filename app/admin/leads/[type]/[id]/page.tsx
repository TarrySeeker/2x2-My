/**
 * Детальная страница заявки.
 *
 * URL: /admin/leads/<type>/<id-or-ref>
 *   type ∈ {quote, one-click, contact}
 *   id   — числовой `id` или (для quote) `request_number` ("CR-000001").
 *
 * Серверный компонент: грузит заявку через `getLeadDetail()`, показывает
 * ВСЕ имеющиеся в БД поля (контакты, услуга, текст задачи, промокод,
 * attachments, технические — IP/UA/idempotency_key, согласие 152-ФЗ).
 *
 * Кнопки:
 *   - «Удалить» — клиентский компонент с ConfirmDialog. Доступно
 *     только owner/manager (server-action валидирует).
 *   - «Скопировать данные» — копирует подготовленный на сервере текст
 *     (имя, телефон, email, услуга, комментарий) в буфер обмена.
 *
 * Если заявки с такими параметрами нет → notFound() (404).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireResource } from "@/features/auth/api";
import {
  getLeadDetail,
  isLeadType,
  type LeadDetail,
  type LeadType,
} from "@/features/admin/api/leads";
import LeadDeleteButton from "@/features/admin/components/LeadDeleteButton";
import LeadCopyButton from "@/features/admin/components/LeadCopyButton";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<LeadType, string> = {
  quote: "Заявка на расчёт",
  "one-click": "Заявка «купить в 1 клик»",
  contact: "Обращение из формы контактов",
};

interface PageProps {
  // Next.js 15: params — Promise.
  params: Promise<{ type: string; id: string }>;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return value;
  }
}

function buildClipboardText(lead: LeadDetail): string {
  const parts: string[] = [];
  parts.push(
    `${TYPE_LABEL[lead.type]}${lead.refNumber ? ` ${lead.refNumber}` : ""}`,
  );
  if (lead.name) parts.push(`Имя: ${lead.name}`);
  if (lead.phone) parts.push(`Телефон: ${lead.phone}`);
  if (lead.email) parts.push(`Email: ${lead.email}`);
  if (lead.service) parts.push(`Услуга/товар: ${lead.service}`);
  if (lead.subject) parts.push(`Тема: ${lead.subject}`);
  if (lead.company_name) parts.push(`Компания: ${lead.company_name}`);
  if (lead.message) parts.push(`Комментарий: ${lead.message}`);
  if (lead.promo_code) parts.push(`Промокод: ${lead.promo_code}`);
  if (lead.attachments.length > 0) {
    parts.push(`Файлы: ${lead.attachments.join(", ")}`);
  }
  parts.push(`Когда: ${formatDateTime(lead.created_at)}`);
  return parts.join("\n");
}

export default async function LeadDetailPage({ params }: PageProps) {
  // Просмотр доступен всем ролям админки — content тоже может смотреть
  // Доступ: owner + manager (manager обрабатывает заявки клиентов).
  // Удаление защищено отдельно в server-action.
  await requireResource("leads");

  const { type, id } = await params;

  if (!isLeadType(type)) {
    notFound();
  }

  const lead = await getLeadDetail(type, id);
  if (!lead) {
    notFound();
  }

  const title = `${TYPE_LABEL[lead.type]}${lead.refNumber ? ` ${lead.refNumber}` : ` #${lead.id}`}`;

  return (
    <div className="space-y-6">
      {/* Шапка */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-brand-orange"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Назад к списку
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
            {title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Создана: {formatDateTime(lead.created_at)} · Статус:{" "}
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {lead.status}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LeadCopyButton text={buildClipboardText(lead)} />
          <LeadDeleteButton
            type={lead.type}
            id={lead.id}
            refNumber={lead.refNumber}
          />
        </div>
      </div>

      {/* Контакты */}
      <Section title="Контакты клиента">
        <Field label="Имя" value={lead.name} />
        <Field
          label="Телефон"
          value={
            lead.phone ? (
              <a
                href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`}
                className="font-mono text-brand-orange hover:underline underline-offset-2"
              >
                {lead.phone}
              </a>
            ) : null
          }
        />
        <Field
          label="Email"
          value={
            lead.email ? (
              <a
                href={`mailto:${lead.email}`}
                className="text-brand-orange hover:underline underline-offset-2"
              >
                {lead.email}
              </a>
            ) : null
          }
        />
        {lead.company_name && (
          <Field label="Компания" value={lead.company_name} />
        )}
      </Section>

      {/* Содержание */}
      <Section title="Содержание">
        {lead.service && <Field label="Услуга / товар" value={lead.service} />}
        {lead.subject && <Field label="Тема" value={lead.subject} />}
        {lead.message ? (
          <div className="grid grid-cols-[180px_1fr] items-start gap-x-4 gap-y-1">
            <div className="pt-1 text-xs uppercase tracking-wider text-neutral-500">
              Комментарий
            </div>
            <div className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-sm text-brand-dark dark:bg-white/5 dark:text-white">
              {lead.message}
            </div>
          </div>
        ) : (
          <Field label="Комментарий" value={null} />
        )}

        {lead.promo_code && (
          <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              Промокод
            </div>
            <div>
              <span className="inline-flex items-center rounded-md bg-brand-orange/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/30">
                {lead.promo_code}
              </span>
            </div>
          </div>
        )}

        {/* Attachments только у quote, но рисуем универсально. */}
        {lead.attachments.length > 0 && (
          <div className="grid grid-cols-[180px_1fr] items-start gap-x-4 gap-y-1">
            <div className="pt-1 text-xs uppercase tracking-wider text-neutral-500">
              Файлы ({lead.attachments.length})
            </div>
            <ul className="space-y-1 text-sm">
              {lead.attachments.map((url, i) => (
                <li key={`${url}-${i}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-brand-orange hover:underline underline-offset-2"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* params (JSONB) — только quote. */}
        {lead.params && Object.keys(lead.params).length > 0 && (
          <div className="grid grid-cols-[180px_1fr] items-start gap-x-4 gap-y-1">
            <div className="pt-1 text-xs uppercase tracking-wider text-neutral-500">
              Параметры расчёта
            </div>
            <pre className="overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-brand-dark dark:bg-white/5 dark:text-white">
              {JSON.stringify(lead.params, null, 2)}
            </pre>
          </div>
        )}
      </Section>

      {/* Менеджерские поля (если есть) */}
      {(lead.manager_comment || lead.assigned_to) && (
        <Section title="Менеджер">
          {lead.assigned_to && (
            <Field label="Ответственный" value={lead.assigned_to} />
          )}
          {lead.manager_comment && (
            <Field label="Заметки" value={lead.manager_comment} />
          )}
        </Section>
      )}

      {/* Технические + 152-ФЗ */}
      <Section title="Технические данные">
        <Field
          label="Согласие 152-ФЗ"
          value={
            lead.pd_consent_at ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Получено: {formatDateTime(lead.pd_consent_at)}
                {lead.pd_consent_version && (
                  <span className="text-neutral-500">
                    (версия {lead.pd_consent_version})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                Не зафиксировано
              </span>
            )
          }
        />
        <Field label="Источник (тип формы)" value={lead.source} />
        <Field label="URL источника" value={lead.source_url ?? lead.page_url} />
        {lead.referer && <Field label="Referer" value={lead.referer} />}
        {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
          <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              UTM
            </div>
            <div className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
              {[
                lead.utm_source && `source=${lead.utm_source}`,
                lead.utm_medium && `medium=${lead.utm_medium}`,
                lead.utm_campaign && `campaign=${lead.utm_campaign}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
        )}
        <Field label="IP клиента" value={lead.pd_consent_ip} mono />
        {lead.user_agent && (
          <div className="grid grid-cols-[180px_1fr] items-start gap-x-4 gap-y-1">
            <div className="pt-1 text-xs uppercase tracking-wider text-neutral-500">
              User-Agent
            </div>
            <div className="break-all rounded bg-neutral-50 p-2 font-mono text-[11px] text-neutral-700 dark:bg-white/5 dark:text-neutral-300">
              {lead.user_agent}
            </div>
          </div>
        )}
        <Field
          label="Idempotency-Key"
          value={lead.idempotency_key}
          mono
        />
        <Field label="ID в базе" value={`${lead.id}`} mono />
        {lead.refNumber && <Field label="Номер заявки" value={lead.refNumber} mono />}
      </Section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Маленькие верстальные хелперы
// ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
      <header className="border-b border-neutral-200 px-5 py-3 dark:border-white/10">
        <h2 className="text-base font-semibold text-brand-dark dark:text-white">
          {title}
        </h2>
      </header>
      <div className="space-y-3 px-5 py-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-x-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div
        className={
          mono
            ? "font-mono text-xs text-neutral-700 dark:text-neutral-300"
            : "text-sm text-brand-dark dark:text-white"
        }
      >
        {value ?? <span className="text-neutral-400">—</span>}
      </div>
    </div>
  );
}
