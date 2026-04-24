import { notFound } from "next/navigation";

import { getPromotion } from "@/lib/data/promotions";
import PromotionFormClient from "@/features/admin/components/PromotionFormClient";

export const metadata = { title: "Редактирование акции" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPromotionPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  const item = await getPromotion(numericId);
  if (!item) notFound();

  return <PromotionFormClient initial={item} />;
}
