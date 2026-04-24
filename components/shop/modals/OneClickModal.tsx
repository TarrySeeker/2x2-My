"use client";

import { useState } from "react";
import { Check, Phone, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUIStore } from "@/store/ui";
import { trackEvent, EVENTS } from "@/lib/analytics";
import PdConsentField from "./PdConsentField";

const PHONE_REGEX = /^\+?\d[\d\s\-()]{6,}$/;

interface LeadResponse {
  success?: boolean;
  duplicate?: boolean;
  lead_id?: number;
  error?: string;
}

/**
 * «Быстрый расчёт» — мини-форма для одного товара.
 *
 * После Этапа 4 (master-plan правка C.P1-9) бьёт в `/api/leads/one-click`
 * (а не в старый `/api/orders`, который теперь 410 Gone).
 * Все обязательные security-поля: pdConsent + Idempotency-Key.
 *
 * Имя «OneClickModal» сохранено для совместимости с существующими
 * импортами (ShopModals и т.п.) — внутри это уже расчётная заявка,
 * а не «купить в 1 клик».
 */
export default function OneClickModal() {
  const { oneClickModalOpen, oneClickProduct, closeOneClick } = useUIStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; consent?: string }>({});

  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const reset = () => {
    setName("");
    setPhone("");
    setComment("");
    setConsent(false);
    setErrors({});
    setIdempotencyKey(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
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
    if (!consent) nextErrors.consent = "Нужно согласие на обработку персональных данных";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSending(true);
    let success = false;
    let serverMessage: string | null = null;

    try {
      const res = await fetch("/api/leads/one-click", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim() || undefined,
          product_id: oneClickProduct?.id,
          product_name: oneClickProduct?.name ?? undefined,
          page_url: typeof window !== "undefined" ? window.location.href : undefined,
          pdConsent: true,
        }),
      });

      const json = (await res.json().catch(() => null)) as LeadResponse | null;
      success = res.ok && (json?.success === true || !!json?.lead_id || !!json?.duplicate);

      if (!success) {
        serverMessage = json?.error ?? null;
        console.warn("[OneClickModal] /api/leads/one-click not ok", res.status, json);
      }
    } catch (err) {
      console.warn("[OneClickModal] network error", err);
    } finally {
      setSending(false);
    }

    trackEvent(EVENTS.one_click_submit, {
      productId: oneClickProduct?.id,
      ok: success,
    });

    if (success) {
      toast.success(
        "Заявка принята. Менеджер «2х2» свяжется с вами в течение 15 минут в рабочее время (Пн–Пт 9:00–19:00).",
        { icon: <Check className="h-5 w-5" /> },
      );
      reset();
      closeOneClick();
      return;
    }

    toast.error(
      serverMessage ??
        "Не удалось отправить заявку. Позвоните: +7-932-424-77-40",
    );
    // Не сбрасываем форму и не закрываем модалку — даём пользователю
    // повторить отправку (с тем же Idempotency-Key, чтобы дубль на
    // сервере не создался).
  };

  return (
    <Modal
      open={oneClickModalOpen}
      onClose={handleClose}
      title="Быстрый расчёт"
      description={
        oneClickProduct
          ? `${oneClickProduct.name} — менеджер свяжется в течение 15 минут, уточнит параметры и пришлёт стоимость.`
          : "Оставьте номер — перезвоним в течение 15 минут и поможем оформить заявку."
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
          label="Опишите вашу задачу"
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Тираж, размеры, дата, особые пожелания"
          leftSlot={<MessageSquare className="h-4 w-4" />}
          aria-label="Опишите вашу задачу"
        />

        <PdConsentField
          checked={consent}
          onChange={setConsent}
          error={errors.consent}
          id="oneclick-consent"
        />

        <Button
          type="submit"
          loading={sending}
          disabled={!consent || sending}
          className="w-full"
        >
          {sending ? "Отправляем…" : "Отправить заявку"}
        </Button>
      </form>
    </Modal>
  );
}
