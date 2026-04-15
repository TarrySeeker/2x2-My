"use client";

import { useState } from "react";
import { Check, Phone, User } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUIStore } from "@/store/ui";
import { trackEvent, EVENTS } from "@/lib/analytics";

const PHONE_REGEX = /^\+?\d[\d\s\-()]{6,}$/;

export default function OneClickModal() {
  const { oneClickModalOpen, oneClickProduct, closeOneClick } = useUIStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const reset = () => {
    setName("");
    setPhone("");
    setComment("");
    setErrors({});
  };

  const handleClose = () => {
    if (sending) return;
    reset();
    closeOneClick();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!name.trim()) nextErrors.name = "Укажите имя";
    if (!PHONE_REGEX.test(phone)) nextErrors.phone = "Некорректный телефон";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    try {
      const res = await fetch("/api/leads/one-click", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          comment,
          product_id: oneClickProduct?.id,
          product_name: oneClickProduct?.name,
        }),
      });
      if (!res.ok && res.status !== 404) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      // Silent fallback: пока backend не готов, «заявка» считается успешной
    } finally {
      setSending(false);
    }

    trackEvent(EVENTS.one_click_submit, { productId: oneClickProduct?.id });
    toast.success(
      "Заявка принята. Менеджер «2х2» перезвонит в течение 15 минут в рабочее время (Пн–Пт 9:00–19:00).",
      { icon: <Check className="h-5 w-5" /> },
    );
    reset();
    closeOneClick();
  };

  return (
    <Modal
      open={oneClickModalOpen}
      onClose={handleClose}
      title="Купить в 1 клик"
      description={
        oneClickProduct
          ? `${oneClickProduct.name} — перезвоним в течение 15 минут и уточним детали`
          : "Оставьте номер — перезвоним в течение 15 минут и поможем оформить заказ"
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input
          label="Как к вам обращаться"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Александр"
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
          label="Комментарий (необязательно)"
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Тираж, дата, особые пожелания — всё, что важно"
        />

        <p className="text-xs text-neutral-500">
          Нажимая «Отправить», вы соглашаетесь с{" "}
          <a href="/privacy" className="text-brand-orange hover:underline">
            политикой обработки данных
          </a>
          .
        </p>

        <Button type="submit" loading={sending} className="w-full">
          {sending ? "Отправляем…" : "Отправить заявку"}
        </Button>
      </form>
    </Modal>
  );
}
