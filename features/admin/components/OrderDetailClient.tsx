"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Phone,
  Mail,
  Truck,
  CreditCard,
  Clock,
  User,
  MessageSquare,
  ExternalLink,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import type { OrderStatus } from "@/types/database";
import type { OrderFull } from "@/features/admin/types";
import {
  updateOrderStatusAction,
  assignOrderAction,
  addCommentAction,
} from "@/features/admin/actions/orders";
import OrderStatusStepper from "./OrderStatusStepper";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";

/** Client-side transitions map */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["ready", "cancelled"],
  ready: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["completed", "returned"],
  completed: [],
  cancelled: [],
  returned: [],
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  in_production: "В производстве",
  ready: "Готов",
  shipped: "Отправлен",
  delivered: "Доставлен",
  completed: "Завершён",
  cancelled: "Отменён",
  returned: "Возврат",
};

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Самовывоз",
  cdek_pvz: "СДЭК ПВЗ",
  cdek_courier: "СДЭК Курьер",
  delivery: "Доставка",
  install: "Монтаж",
};

interface OrderDetailClientProps {
  order: OrderFull;
  managers: { id: string; full_name: string | null; email: string }[];
}

export default function OrderDetailClient({
  order: initialOrder,
  managers,
}: OrderDetailClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [comment, setComment] = useState(order.manager_comment ?? "");
  const [saving, setSaving] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const currentStatus = order.status as OrderStatus;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? [];

  async function handleStatusChange(newStatus: OrderStatus) {
    setStatusChanging(true);
    try {
      await updateOrderStatusAction(order.id, { status: newStatus });
      setOrder((o) => ({ ...o, status: newStatus }));
      toast.success(`Статус изменён на «${STATUS_LABELS[newStatus]}»`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка смены статуса");
    } finally {
      setStatusChanging(false);
    }
  }

  async function handleAssign(profileId: string) {
    try {
      await assignOrderAction(order.id, { profile_id: profileId });
      const manager = managers.find((m) => m.id === profileId);
      setOrder((o) => ({
        ...o,
        assigned_to: profileId,
        assigned_profile: manager ?? null,
      }));
      toast.success("Менеджер назначен");
    } catch {
      toast.error("Ошибка назначения");
    }
  }

  async function handleSaveComment() {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await addCommentAction(order.id, { comment: comment.trim() });
      setOrder((o) => ({ ...o, manager_comment: comment.trim() }));
      toast.success("Комментарий сохранён");
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/orders"
            className="mb-2 inline-block text-sm text-neutral-500 hover:text-brand-orange dark:text-neutral-400"
          >
            ← Все заказы
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
            Заказ {order.order_number ?? `#${order.id}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {new Date(order.created_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <StatusBadge status={currentStatus} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Order Items */}
          <section className="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
            <div className="border-b border-neutral-100 px-5 py-3 dark:border-white/5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
                <Package className="h-4 w-4 text-neutral-400" />
                Состав заказа
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50 dark:border-white/5 dark:bg-white/[0.02]">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Товар
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Цена
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Кол-во
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      Сумма
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-neutral-100 last:border-b-0 dark:border-white/5"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/10">
                            {item.product_image ? (
                              <Image
                                src={item.product_image}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-4 w-4 text-neutral-300" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-brand-dark dark:text-neutral-200">
                              {item.product_name ?? item.name}
                            </p>
                            {item.sku && (
                              <p className="font-mono text-xs text-neutral-400">
                                {item.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                        {new Intl.NumberFormat("ru-RU").format(item.price)} ₽
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600 dark:text-neutral-300">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-brand-dark dark:text-white">
                        {new Intl.NumberFormat("ru-RU").format(
                          item.price * item.quantity,
                        )}{" "}
                        ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 border-t border-neutral-100 px-5 py-3 dark:border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-500">Подытог</span>
                <span className="text-neutral-700 dark:text-neutral-300">
                  {new Intl.NumberFormat("ru-RU").format(subtotal)} ₽
                </span>
              </div>
              {order.delivery_cost != null && order.delivery_cost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Доставка</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {new Intl.NumberFormat("ru-RU").format(order.delivery_cost)} ₽
                  </span>
                </div>
              )}
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Скидка</span>
                  <span className="text-green-600 dark:text-green-400">
                    -{new Intl.NumberFormat("ru-RU").format(order.discount_amount)} ₽
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-100 pt-2 dark:border-white/5">
                <span className="font-semibold text-brand-dark dark:text-white">
                  Итого
                </span>
                <span className="text-lg font-bold text-brand-orange">
                  {new Intl.NumberFormat("ru-RU").format(order.total)} ₽
                </span>
              </div>
            </div>
          </section>

          {/* Customer */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
              <User className="h-4 w-4 text-neutral-400" />
              Клиент
            </h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-brand-dark dark:text-neutral-200">
                {order.customer_name}
              </p>
              <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <Phone className="h-3.5 w-3.5" />
                <a
                  href={`tel:${order.customer_phone}`}
                  className="hover:text-brand-orange"
                >
                  {order.customer_phone}
                </a>
              </p>
              {order.customer_email && (
                <p className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                  <Mail className="h-3.5 w-3.5" />
                  <a
                    href={`mailto:${order.customer_email}`}
                    className="hover:text-brand-orange"
                  >
                    {order.customer_email}
                  </a>
                </p>
              )}
            </div>
          </section>

          {/* Delivery */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
              <Truck className="h-4 w-4 text-neutral-400" />
              Доставка
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Способ</span>
                <span className="font-medium text-brand-dark dark:text-neutral-200">
                  {DELIVERY_LABELS[order.delivery_type ?? ""] ?? order.delivery_type ?? "—"}
                </span>
              </div>
              {order.delivery_address && (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0 text-neutral-500">Адрес</span>
                  <span className="text-right text-brand-dark dark:text-neutral-200">
                    {[
                      order.delivery_address.postal_code,
                      order.delivery_address.city,
                      order.delivery_address.street,
                      order.delivery_address.house && `д. ${order.delivery_address.house}`,
                      order.delivery_address.apartment && `кв. ${order.delivery_address.apartment}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
              {order.delivery_tariff_name && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Тариф</span>
                  <span className="text-brand-dark dark:text-neutral-200">
                    {order.delivery_tariff_name}
                  </span>
                </div>
              )}
              {order.delivery_cost != null && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Стоимость</span>
                  <span className="font-medium text-brand-dark dark:text-neutral-200">
                    {new Intl.NumberFormat("ru-RU").format(order.delivery_cost)} ₽
                  </span>
                </div>
              )}
              {order.cdek_tracking_url && (
                <a
                  href={order.cdek_tracking_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-orange hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Трекинг СДЭК
                </a>
              )}
              {order.cdek_order_number && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">СДЭК заказ</span>
                  <span className="font-mono text-xs text-brand-dark dark:text-neutral-200">
                    {order.cdek_order_number}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
              <CreditCard className="h-4 w-4 text-neutral-400" />
              Оплата
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">Статус</span>
                <StatusBadge status={order.payment_status} />
              </div>
              {order.payment_method && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Метод</span>
                  <span className="text-brand-dark dark:text-neutral-200">
                    {order.payment_method}
                  </span>
                </div>
              )}
              {order.paid_at && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Оплачен</span>
                  <span className="text-brand-dark dark:text-neutral-200">
                    {new Date(order.paid_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-500">Сумма</span>
                <span className="font-semibold text-brand-dark dark:text-white">
                  {new Intl.NumberFormat("ru-RU").format(order.total)} ₽
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Status stepper + actions */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
            <h2 className="mb-4 text-sm font-semibold text-brand-dark dark:text-white">
              Статус заказа
            </h2>
            <OrderStatusStepper currentStatus={currentStatus} />

            {allowedTransitions.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-neutral-500">
                  Сменить статус:
                </p>
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions
                    .filter((s) => s !== "cancelled")
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={statusChanging}
                        onClick={() => handleStatusChange(s)}
                        className="rounded-lg bg-brand-orange/10 px-3 py-1.5 text-xs font-medium text-brand-orange transition-colors hover:bg-brand-orange/20 disabled:opacity-50"
                      >
                        → {STATUS_LABELS[s]}
                      </button>
                    ))}
                </div>
                {allowedTransitions.includes("cancelled") && (
                  <button
                    type="button"
                    disabled={statusChanging}
                    onClick={() => setCancelOpen(true)}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
                  >
                    Отменить заказ
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Status History */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
              <Clock className="h-4 w-4 text-neutral-400" />
              История статусов
            </h2>
            {order.status_history.length > 0 ? (
              <div className="space-y-3">
                {order.status_history.map((entry) => (
                  <div key={entry.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-brand-orange" />
                      <div className="w-px flex-1 bg-neutral-200 dark:bg-white/10" />
                    </div>
                    <div className="pb-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={entry.status} />
                        <span className="text-xs text-neutral-400">
                          {new Date(entry.created_at).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {entry.comment && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {entry.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">История пуста</p>
            )}
          </section>

          {/* Manager Comment */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
              <MessageSquare className="h-4 w-4 text-neutral-400" />
              Комментарий менеджера
            </h2>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Внутренний комментарий..."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent p-3 text-sm outline-none transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white dark:placeholder:text-neutral-500"
            />
            <button
              type="button"
              onClick={handleSaveComment}
              disabled={saving || !comment.trim()}
              className="mt-2 flex items-center gap-2 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </section>

          {/* Assign Manager */}
          <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
            <h2 className="mb-3 text-sm font-semibold text-brand-dark dark:text-white">
              Менеджер
            </h2>
            <select
              value={order.assigned_to ?? ""}
              onChange={(e) => {
                if (e.target.value) handleAssign(e.target.value);
              }}
              className="w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-white/10 dark:text-white"
            >
              <option value="">Не назначен</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name ?? m.email}
                </option>
              ))}
            </select>
          </section>
        </div>
      </div>

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          setCancelOpen(false);
          handleStatusChange("cancelled");
        }}
        title="Отменить заказ?"
        description="Заказ будет отменён. Это действие нельзя отменить."
        confirmText="Отменить заказ"
        variant="danger"
        loading={statusChanging}
      />
    </div>
  );
}
