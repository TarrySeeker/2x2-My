"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, Search, ShieldCheck, MapIcon, FileCode2 } from "lucide-react";
import Link from "next/link";

/**
 * Универсальная плашка-помощь для SEO-страниц админки.
 * Объясняет клиенту, где какой кусок SEO живёт, и куда жать что
 * именно поправить. Сворачивается, чтобы не мешать.
 *
 * Используется в:
 *   - /admin/content/metadata
 *   - /admin/seo
 *
 * Полный гид: docs/SEO_GUIDE.md (раздаётся как /docs/SEO_GUIDE.md
 * через public/docs/, см. ниже).
 */
export default function SeoHelpBanner({
  defaultOpen = false,
}: {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-orange/30 bg-brand-orange/5 dark:border-brand-orange/20 dark:bg-brand-orange/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/20 text-brand-orange">
          <BookOpen className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-brand-dark dark:text-white">
            Не понимаете, что это и куда жать?
          </p>
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400">
            Краткая шпаргалка по SEO — где что редактируется. Полный гид в файле{" "}
            <code className="rounded bg-black/5 px-1 py-0.5 text-[11px] dark:bg-white/10">
              docs/SEO_GUIDE.md
            </code>
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-neutral-500" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-brand-orange/20 px-4 py-4 text-[13px] text-neutral-700 dark:text-neutral-300">
              <HelpRow
                icon={<ShieldCheck className="h-4 w-4" />}
                title="Мета-теги страниц"
                desc="Title и description, которые видят люди в Google и Яндексе."
                href="/admin/content/metadata"
                hrefLabel="Открыть мета-теги"
              />
              <HelpRow
                icon={<FileCode2 className="h-4 w-4" />}
                title="Шаблоны и редиректы"
                desc="Шаблоны для авто-генерации title/description у товаров и редиректы со старых URL."
                href="/admin/seo"
                hrefLabel="Открыть шаблоны"
              />
              <HelpRow
                icon={<MapIcon className="h-4 w-4" />}
                title="Sitemap.xml"
                desc="Карта сайта для поисковиков. Генерируется автоматически — править не нужно."
                href="/sitemap.xml"
                hrefLabel="Посмотреть sitemap"
                external
              />
              <HelpRow
                icon={<Search className="h-4 w-4" />}
                title="Robots.txt"
                desc="Инструкция для роботов поисковиков. Меняется только программистом."
                href="/robots.txt"
                hrefLabel="Посмотреть robots"
                external
              />

              <div className="!mt-4 rounded-lg border border-brand-orange/20 bg-white/50 p-3 text-[12px] dark:bg-black/20">
                <p className="font-semibold text-brand-dark dark:text-white">
                  Самое частое:
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-neutral-600 dark:text-neutral-400">
                  <li>Хочу поменять то, что показывается в поиске Google → «Мета-теги страниц»</li>
                  <li>Хочу поменять текст / заголовок на самой странице → «Контент сайта»</li>
                  <li>Добавил статью / товар, нужно ли что-то делать с sitemap → нет, всё автоматом</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpRow({
  icon,
  title,
  desc,
  href,
  hrefLabel,
  external = false,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  hrefLabel: string;
  external?: boolean;
}) {
  const linkClass =
    "inline-flex items-center gap-1 text-[12px] font-medium text-brand-orange hover:underline";

  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-brand-orange dark:bg-white/10">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-brand-dark dark:text-white">{title}</p>
        <p className="mt-0.5 text-neutral-600 dark:text-neutral-400">{desc}</p>
        {external ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {hrefLabel} →
          </a>
        ) : (
          <Link href={href} className={linkClass}>
            {hrefLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}
