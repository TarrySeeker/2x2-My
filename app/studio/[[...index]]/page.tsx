import { notFound } from "next/navigation";

/**
 * Sanity Studio удалён на Этапе 1. Роут /studio возвращает 404.
 * Админка магазина будет в /admin/* (Этап 6).
 */
export default function StudioPage() {
  notFound();
}
