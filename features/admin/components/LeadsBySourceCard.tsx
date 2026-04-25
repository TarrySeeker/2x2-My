import clsx from "clsx";
import { Compass } from "lucide-react";
import type { LeadSourceRow } from "@/features/admin/api/dashboard";

interface LeadsBySourceCardProps {
  sources: LeadSourceRow[];
}

const SOURCE_LABEL: Record<string, string> = {
  direct: "Прямые заходы",
  google: "Google",
  yandex: "Яндекс",
  vk: "VK",
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  ya: "Яндекс",
  organic: "Поиск",
  cpc: "Реклама (CPC)",
};

function labelFor(source: string): string {
  const key = source.trim().toLowerCase();
  return SOURCE_LABEL[key] ?? source;
}

export default function LeadsBySourceCard({ sources }: LeadsBySourceCardProps) {
  const total = sources.reduce((acc, s) => acc + s.count, 0);

  return (
    <div
      className={clsx(
        "rounded-2xl border",
        "bg-white/80 border-black/5 backdrop-blur-xl",
        "dark:bg-white/[0.04] dark:border-white/10",
      )}
    >
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-brand-orange" />
          <h3 className="text-sm font-semibold text-brand-dark dark:text-white">
            Источники лидов
          </h3>
        </div>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          за 30 дней
        </span>
      </header>

      {sources.length === 0 ? (
        <div className="px-6 pb-6 text-sm text-neutral-400">
          Лидов за период нет
        </div>
      ) : (
        <ul className="space-y-3 px-6 pb-6">
          {sources.map((s) => {
            const percent = total > 0 ? Math.round((s.count / total) * 100) : 0;
            return (
              <li key={s.source} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-brand-dark dark:text-neutral-200">
                    {labelFor(s.source)}
                  </p>
                  <p className="shrink-0 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {s.count}
                    <span className="ml-1.5 text-neutral-400 dark:text-neutral-500">
                      {percent}%
                    </span>
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-white/5">
                  <div
                    className="h-full rounded-full bg-brand-orange/80"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
