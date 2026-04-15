import type { ReactNode } from "react";

/**
 * Sanity Studio удалён на Этапе 1.
 * Layout оставлен как no-op (физически файл лучше удалить при следующем
 * cleanup'е), роут /studio отдаёт 404 через page.tsx.
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return children;
}
