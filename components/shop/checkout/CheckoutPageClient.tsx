"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { orderSchema } from "@/lib/checkout/order-schema";
import type { CheckoutFormValues } from "./checkout-form-types";
import { useCartStore } from "@/store/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { trackEvent, EVENTS } from "@/lib/analytics";
import ContactSection from "./sections/ContactSection";
import DeliverySection from "./sections/DeliverySection";
import InstallationSection from "./sections/InstallationSection";
import PaymentSection from "./sections/PaymentSection";
import CommentSection from "./sections/CommentSection";
import OrderSummary from "./sections/OrderSummary";

interface OrderResponse {
  ok: true;
  orderId: number;
  orderNumber: string;
  requiresPayment: boolean;
}

interface PaymentResponse {
  ok: true;
  payment_url: string;
  order_number: string;
}

export default function CheckoutPageClient() {
  const router = useRouter();
  const hydrated = useHydrated();
  const trackedView = useRef(false);

  const items = useCartStore((s) => s.items);
  const promoCode = useCartStore((s) => s.promoCode);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const [cdekDeliveryCost, setCdekDeliveryCost] = useState<number | null>(null);

  const methods = useForm<CheckoutFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer: { name: "", phone: "", email: "", isB2B: false },
      delivery: { type: "pickup" },
      installation: { required: false, address: "", date: "", notes: "" },
      payment: { method: "cash_on_delivery" },
      promoCode: promoCode ?? "",
      customerComment: "",
      items: [],
    },
  });

  const { handleSubmit, setValue, watch, formState } = methods;

  const deliveryType = watch("delivery.type");

  useEffect(() => {
    setCdekDeliveryCost(null);
  }, [deliveryType]);

  const handleCdekDeliveryCost = useCallback((cost: number) => {
    setCdekDeliveryCost(cost);
  }, []);

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    setValue(
      "items",
      items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.name,
        sku: i.sku,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.imageUrl,
        attributes: i.attributes,
      })),
    );
  }, [hydrated, items, setValue]);

  useEffect(() => {
    if (!hydrated || trackedView.current || items.length === 0) return;
    trackedView.current = true;
    trackEvent(EVENTS.checkout_view, {
      items_count: items.length,
      subtotal: getSubtotal(),
      total: getTotal(),
    });
  }, [hydrated, items, getSubtotal, getTotal]);

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace("/cart");
    }
  }, [hydrated, items.length, router]);

  const onSubmit = async (data: CheckoutFormValues) => {
    trackEvent(EVENTS.checkout_submit, { items_count: data.items.length });

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = (await res.json()) as OrderResponse | { error: string };

      if (!res.ok || !("ok" in json)) {
        const msg = "error" in json ? json.error : "Ошибка оформления заказа";
        trackEvent(EVENTS.order_error, { reason: msg, status: res.status });
        toast.error(msg);
        return;
      }

      trackEvent(EVENTS.order_created, {
        orderNumber: json.orderNumber,
        total: getTotal(),
      });

      if (json.requiresPayment) {
        trackEvent(EVENTS.payment_create, { orderNumber: json.orderNumber });

        const payRes = await fetch("/api/payment/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orderId: json.orderId,
            email: data.customer.email || "",
          }),
        });

        const payData = (await payRes.json()) as PaymentResponse | { error: string };

        if ("payment_url" in payData && payData.payment_url) {
          trackEvent(EVENTS.payment_redirect, { orderNumber: json.orderNumber });
          window.location.href = payData.payment_url;
          return;
        }

        toast.error("Не удалось создать платёж. Попробуйте другой способ оплаты.");
        return;
      }

      clearCart();
      router.push(`/checkout/success?order=${json.orderNumber}`);
    } catch {
      trackEvent(EVENTS.order_error, { reason: "network" });
      toast.error("Не удалось отправить заказ. Проверьте соединение.");
    }
  };

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl bg-neutral-100"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]"
      >
        <div className="flex flex-col gap-6">
          <ContactSection />
          <DeliverySection onCdekSelect={handleCdekDeliveryCost} />
          <InstallationSection />
          <PaymentSection />
          <CommentSection />
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <OrderSummary
            items={items}
            subtotal={getSubtotal()}
            promoDiscount={promoDiscount}
            isSubmitting={formState.isSubmitting}
            deliveryType={deliveryType}
            deliveryCost={
              deliveryType === "cdek"
                ? cdekDeliveryCost
                : deliveryType === "courier"
                  ? 500
                  : 0
            }
          />
        </div>
      </form>
    </FormProvider>
  );
}
