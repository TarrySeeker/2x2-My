import Link from "next/link";

import { listSections } from "@/lib/data/cms";
import { SECTION_KEYS } from "@/features/admin/schemas/cms";
import AdminPageHeader from "@/features/admin/components/AdminPageHeader";
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from "lucide-react";

export const metadata = { title: "Главная страница" };

const SECTION_LABELS: Record<string, { title: string; description: string }> = {
  hero: {
    title: "Hero",
    description: "Заголовок, подзаголовок и кнопки в верхнем экране",
  },
  about: {
    title: "О компании",
    description: "Краткое описание + статистика + «Мы вас понимаем»",
  },
  services: {
    title: "Услуги",
    description: "Карточки услуг + блок «Также мы занимаемся»",
  },
  promotions: {
    title: "Акции",
    description: "Заголовок и подзаголовок секции акций",
  },
  portfolio: {
    title: "Портфолио",
    description: "Заголовок и кнопка «Все работы» (выбор 3-х — отдельно)",
  },
  features: {
    title: "Почему выбирают нас",
    description: "Список преимуществ компании",
  },
  faq: {
    title: "Частые вопросы",
    description: "Список вопросов и ответов",
  },
  cta: {
    title: "Финальный CTA",
    description: "Финальный блок с заголовком и кнопкой",
  },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function countFields(content: unknown): number {
  if (!content || typeof content !== "object") return 0;
  let count = 0;
  for (const value of Object.values(content as Record<string, unknown>)) {
    if (Array.isArray(value)) count += value.length;
    else if (value !== null && value !== undefined && value !== "") count += 1;
  }
  return count;
}

export default async function HomepageSectionsPage() {
  const stored = await listSections();
  const storedMap = new Map(stored.map((s) => [s.key, s]));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Главная страница"
        description="Редактируемые секции главной — заголовки, подзаголовки, списки"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SECTION_KEYS.map((key) => {
          const meta = SECTION_LABELS[key] ?? {
            title: key,
            description: "",
          };
          const stored = storedMap.get(key);
          const hasContent = !!stored;
          const fieldsCount = stored ? countFields(stored.content) : 0;

          return (
            <Link
              key={key}
              href={`/admin/content/homepage/${key}`}
              className="group flex items-start gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:border-brand-orange/40 hover:shadow-md dark:border-white/10 dark:bg-neutral-900 dark:hover:border-brand-orange/40"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
                {hasContent ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-dark dark:text-white">
                  {meta.title}
                </p>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {meta.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                  <span>{fieldsCount} полей</span>
                  {stored && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        {formatDate(stored.updatedAt)}
                      </span>
                    </>
                  )}
                  {!hasContent && (
                    <>
                      <span>·</span>
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        Используются дефолтные значения
                      </span>
                    </>
                  )}
                </div>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 self-center text-neutral-300 transition-colors group-hover:text-brand-orange" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
