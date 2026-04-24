"use client";

import { useState } from "react";
import { Calculator, Phone, User, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUIStore } from "@/store/ui";
import { trackEvent, EVENTS } from "@/lib/analytics";
import PdConsentField, { type PdConsentStrings } from "./PdConsentField";

const PHONE_REGEX = /^\+?\d[\d\s\-()]{6,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface QuoteModalStrings {
  title: string;
  description: string;
  /**
   * Шаблон описания при наличии productName. Плейсхолдер `{product}`
   * заменяется на имя товара в клиенте.
   */
  descriptionWithProductTemplate: string;
  nameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  companyLabel: string;
  commentLabel: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  commentPlaceholder: string;
  calcHint: string;
  submitLabel: string;
  sendingLabel: string;
  successMessage: string;
  errorMessage: string;
  // Validation
  nameRequired: string;
  phoneInvalid: string;
  emailInvalid: string;
  consentRequired: string;
}

function formatTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : m,
  );
}

export interface QuoteModalClientProps {
  strings: QuoteModalStrings;
  consentStrings: PdConsentStrings;
  phoneDisplay: string;
}

/**
 * Клиентская часть QuoteModal. Строки — из ui_strings через props.
 */
export default function QuoteModalClient({
  strings,
  consentStrings,
  phoneDisplay,
}: QuoteModalClientProps) {
  const { calcRequestModalOpen, calcRequestProduct, closeQuote } = useUIStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const reset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setCompany("");
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
    closeQuote();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = strings.nameRequired;
    if (!PHONE_REGEX.test(phone)) next.phone = strings.phoneInvalid;
    if (email && !EMAIL_REGEX.test(email)) next.email = strings.emailInvalid;
    if (!consent) next.consent = strings.consentRequired;
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    let ok = false;
    let serverMessage: string | null = null;

    try {
      const res = await fetch("/api/leads/quote", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          customer_name: name,
          customer_phone: phone,
          customer_email: email || undefined,
          company_name: company || undefined,
          comment,
          product_id: calcRequestProduct?.id,
          category_id: calcRequestProduct?.categoryId ?? undefined,
          params: calcRequestProduct?.prefillParams ?? {},
          pdConsent: true,
        }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; success?: boolean; lead_id?: number; error?: string }
        | null;

      if (res.ok && json?.ok === false) {
        serverMessage = json?.error ?? null;
      } else if (res.ok) {
        ok = true;
      } else {
        serverMessage = json?.error ?? null;
        console.warn("[QuoteModal] /api/leads/quote not ok", res.status, json);
      }
    } catch (err) {
      console.warn("[QuoteModal] network error", err);
    } finally {
      setSending(false);
    }

    trackEvent(EVENTS.calc_request_submit, {
      productId: calcRequestProduct?.id,
      ok,
    });

    if (ok) {
      toast.success(strings.successMessage);
      reset();
      closeQuote();
      return;
    }

    toast.error(
      serverMessage ??
        `${strings.errorMessage} ${phoneDisplay}`.trim(),
    );
  };

  const description = calcRequestProduct?.name
    ? formatTemplate(strings.descriptionWithProductTemplate, {
        product: calcRequestProduct.name,
      })
    : strings.description;

  return (
    <Modal
      open={calcRequestModalOpen}
      onClose={handleClose}
      title={strings.title}
      description={description}
      size="lg"
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={strings.nameLabel}
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftSlot={<User className="h-4 w-4" />}
            error={errors.name}
            autoComplete="name"
            required
          />
          <Input
            label={strings.phoneLabel}
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={strings.phonePlaceholder}
            leftSlot={<Phone className="h-4 w-4" />}
            error={errors.phone}
            autoComplete="tel"
            required
          />
          <Input
            label={strings.emailLabel}
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftSlot={<Mail className="h-4 w-4" />}
            error={errors.email}
            autoComplete="email"
          />
          <Input
            label={strings.companyLabel}
            name="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            leftSlot={<Building2 className="h-4 w-4" />}
          />
        </div>

        <Input
          label={strings.commentLabel}
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={strings.commentPlaceholder}
          aria-label={strings.commentLabel}
        />

        {calcRequestProduct?.prefillParams && (
          <div className="flex items-start gap-2 rounded-xl bg-surface-cream p-3 text-xs text-neutral-600">
            <Calculator className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-orange" />
            <span>{strings.calcHint}</span>
          </div>
        )}

        <PdConsentField
          checked={consent}
          onChange={setConsent}
          error={errors.consent}
          strings={consentStrings}
        />

        <Button
          type="submit"
          loading={sending}
          disabled={!consent || sending}
          className="w-full"
        >
          {sending ? strings.sendingLabel : strings.submitLabel}
        </Button>
      </form>
    </Modal>
  );
}
