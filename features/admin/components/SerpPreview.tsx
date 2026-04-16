"use client";

interface SerpPreviewProps {
  title: string;
  description: string;
  slug: string;
  baseUrl?: string;
}

export default function SerpPreview({
  title,
  description,
  slug,
  baseUrl = "2x2hm.ru",
}: SerpPreviewProps) {
  const displayTitle = title || "Заголовок страницы";
  const displayDesc = description || "Описание страницы для поисковых систем...";
  const displayUrl = `${baseUrl} › product › ${slug || "slug"}`;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
        Предпросмотр в Google
      </p>
      <div className="space-y-0.5">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {displayUrl}
        </p>
        <p className="text-lg leading-tight text-blue-600 dark:text-blue-400">
          {displayTitle.slice(0, 60)}
          {displayTitle.length > 60 && "..."}
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {displayDesc.slice(0, 160)}
          {displayDesc.length > 160 && "..."}
        </p>
      </div>
    </div>
  );
}
