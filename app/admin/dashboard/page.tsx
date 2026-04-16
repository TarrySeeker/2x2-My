import { DollarSign, ShoppingCart, TrendingUp, Bell } from "lucide-react";
import {
  getDashboardStats,
  getRevenueChart,
  getLatestOrders,
  getTopProducts,
  getLowStockProducts,
  getPendingReviews,
} from "@/features/admin/api/dashboard";
import StatCard from "@/features/admin/components/StatCard";
import RevenueChart from "@/features/admin/components/RevenueChart";
import LatestOrdersTable from "@/features/admin/components/LatestOrdersTable";
import TopProductsList from "@/features/admin/components/TopProductsList";
import LowStockList from "@/features/admin/components/LowStockList";
import PendingReviewsList from "@/features/admin/components/PendingReviewsList";

export const metadata = { title: "Дашборд" };

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const [stats, chart7d, chart30d, latestOrders, topProducts, lowStock, pendingReviews] =
    await Promise.all([
      getDashboardStats(),
      getRevenueChart(7),
      getRevenueChart(30),
      getLatestOrders(5),
      getTopProducts(5),
      getLowStockProducts(),
      getPendingReviews(5),
    ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
        Дашборд
      </h1>

      {/* Row 1: Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Выручка"
          value={formatRub(stats.revenue.today)}
          icon={<DollarSign className="h-5 w-5" />}
          today={stats.revenue.today}
          yesterday={stats.revenue.yesterday}
          format="currency"
        />
        <StatCard
          title="Заказы"
          value={stats.orders.today}
          icon={<ShoppingCart className="h-5 w-5" />}
          today={stats.orders.today}
          yesterday={stats.orders.yesterday}
        />
        <StatCard
          title="Средний чек"
          value={formatRub(stats.avgCheck.today)}
          icon={<TrendingUp className="h-5 w-5" />}
          today={stats.avgCheck.today}
          yesterday={stats.avgCheck.yesterday}
          format="currency"
        />
        <StatCard
          title="Новые заказы"
          value={stats.newOrders}
          icon={<Bell className="h-5 w-5" />}
          today={stats.newOrders}
          yesterday={0}
        />
      </div>

      {/* Row 2: Chart + Latest Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart data7d={chart7d} data30d={chart30d} />
        <LatestOrdersTable orders={latestOrders} />
      </div>

      {/* Row 3: Top Products + Low Stock */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProductsList products={topProducts} />
        <LowStockList products={lowStock} />
      </div>

      {/* Row 4: Pending Reviews */}
      <PendingReviewsList reviews={pendingReviews} />
    </div>
  );
}
