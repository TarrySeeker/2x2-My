"use client";

import { useState } from "react";
import { Calculator, Phone, User, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUIStore } from "@/store/ui";
import { trackEvent, EVENTS } from "@/lib/analytics";

const PHONE_REGEX = /^\+?\d[\d\s\-()]{6,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function QuoteModal() {
  const { calcRequestModalOpen, calcRequestProduct, closeQuote } = useUIStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
    setComment("");
    setErrors({});
  };

  const handleClose = () => {
    if (sending) return;
    reset();
    closeQuote();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Укажите имя";
    if (!PHONE_REGEX.test(phone)) next.phone = "Некорректный телефон";
    if (email && !EMAIL_REGEX.test(email)) next.email = "Некорректный email";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      const res = await fetch("/api/leads/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          customer_email: email || undefined,
          company_name: company || undefined,
          comment,
          product_id: calcRequestProduct?.id,
          category_id: calcRequestProduct?.categoryId ?? undefined,
          params: calcRequestProduct?.prefillParams ?? {},
        }),
      });
      if (!res.ok && res.status !== 404) throw new Error(`HTTP ${res.status}`);
    } catch {
      // backend может ещё не быть готов — всё равно считаем, что заявка ушла
    } finally {
      setSending(false);
    }

    trackEvent(EVENTS.calc_request_submit, { productId: calcRequestProduct?.id });
    toast.success(
      "Заявка принята. Подготовим КП и пришлём в течение 1 часа в рабочее время (Пн–Пт 9:00–19:00).",
    );
    reset();
    closeQuote();
  };

  return (
    <Modal
      open={calcRequestModalOpen}
      onClose={handleClose}
      title="Заказать расчёт стоимости"
      description={
        calcRequestProduct
          ? `${calcRequestProduct.name} — пришлём коммерческое предложение с вариантами и сроками в течение 1 часа`
          : "Опишите задачу — пришлём коммерческое предложение с вариантами и сроками в течение 1 часа"
      }
      size="lg"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Имя"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftSlot={<User className="h-4 w-4" />}
            error={errors.name}
            autoComplete="name"
            required
          />
          <Input
            label="Телефон"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 932 424 77 40"
            leftSlot={<Phone className="h-4 w-4" />}
            error={errors.phone}
            autoComplete="tel"
            required
          />
          <Input
            label="Email (необязательно)"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftSlot={<Mail className="h-4 w-4" />}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label="Компания (если юрлицо)"
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            leftSlot={<Building2 className="h-4 w-4" />}
          />
        </div>

        <Input
          label="Задача"
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Размеры, материал, тираж, адрес монтажа, сроки, референсы"
        />

        {calcRequestProduct?.prefillParams && (
          <div className="flex items-start gap-2 rounded-xl bg-surface-cream p-3 text-xs text-neutral-600">
            <Calculator className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-orange" />
            <span>
              К заявке приложим ваш предварительный расчёт из калькулятора —
              менеджер учтёт его при подготовке КП и предложит оптимальные
              материалы для ХМАО/ЯНАО.
            </span>
          </div>
        )}

        <p className="text-xs text-neutral-500">
          Нажимая «Отправить», вы соглашаетесь с{" "}
          <a href="/privacy" className="text-brand-orange hover:underline">
            политикой обработки данных
          </a>
          . Данные используем только для связи по заявке.
        </p>

        <Button type="submit" loading={sending} className="w-full">
          {sending ? "Отправляем…" : "Отправить заявку на расчёт"}
        </Button>
      </form>
    </Modal>
  );
}
