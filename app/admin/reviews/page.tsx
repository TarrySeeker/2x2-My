import { getReviewsStats } from "@/features/admin/api/reviews";
import ReviewsPageClient from "@/features/admin/components/ReviewsPageClient";

export const metadata = { title: "Отзывы" };

export default async function ReviewsPage() {
  const stats = await getReviewsStats();

  return <ReviewsPageClient initialStats={stats} />;
}
