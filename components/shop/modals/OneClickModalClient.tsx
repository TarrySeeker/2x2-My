"use client";

import { useState } from "react";
import { Check, Phone, User, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUIStore } from "@/store/ui";
import { trackEvent, EVENTS } from "@/lib/analytics";
import PdConsentField, { type PdConsentStrings } from "./PdConsentField";

const PHONE_REGEX = /^\+?\d[\d\s\-()]{6,}$/;

interface LeadResponse {
  success?: boolean;
  duplicate?: boolean;
  lead_id?: number;
  error?: string;
}

export interface OneClickModalStrings {
  title: string;
  description: string;
  /** Шаблон описания: `{product}` → имя товара. */
  descriptionWithProductTemplate: string;
  nameLabel: string;
  phoneLabel: string;
  commentLabel: string;
  namePlaceholder: string;
  phonePlaceholder: string;
  commentPlaceholder: string;
  submitLabel: string;
  sendingLabel: string;
  successMessage: string;
  errorMessage: string;
  nameRequired: string;
  phoneInvalid: string;
  consentRequired: string;
}

function formatTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : m,
  );
}

export interface OneClickModalClientProps {
  strings: OneClickModalStrings;
  consentStrings: PdConsentStrings;
  phoneDisplay: string;
}

/**
 * Клиентская часть OneClickModal. Строки — из ui_strings через props.
 * Логика идентична исходному `OneClickModal.tsx`, но все тексты вынесены
 * в `strings` для редактирования клиентом через админку.
 */
export default function OneClickModalClient({
  strings,
  consentStrings,
  phoneDisplay,
}: OneClickModalClientProps) {
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
    if (!name.trim()) nextErrors.name = strings.nameRequired;
    if (!PHONE_REGEX.test(phone)) nextErrors.phone = strings.phoneInvalid;
    if (!consent) nextErrors.consent = strings.consentRequired;
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
      toast.success(strings.successMessage, {
        icon: <Check className="h-5 w-5" />,
      });
      reset();
      closeOneClick();
      return;
    }

    toast.error(
      serverMessage ??
        `${strings.errorMessage} ${phoneDisplay}`.trim(),
    );
  };

  const description = oneClickProduct?.name
    ? formatTemplate(strings.descriptionWithProductTemplate, {
        product: oneClickProduct.name,
      })
    : strings.description;

  return (
    <Modal
      open={oneClickModalOpen}
      onClose={handleClose}
      title={strings.title}
      description={description}
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <Input
          label={strings.nameLabel}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={strings.namePlaceholder}
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
          label={strings.commentLabel}
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={strings.commentPlaceholder}
          leftSlot={<MessageSquare className="h-4 w-4" />}
          aria-label={strings.commentLabel}
        />

        <PdConsentField
          checked={consent}
          onChange={setConsent}
          error={errors.consent}
          id="oneclick-consent"
          strings={consentStrings}
        />

        <Button
          type="submit"
          loading={sending}
          disabled={!consent || sending}
          // Safari/WebKit safety net: даже при disabled клик может
          // прорваться (force-click в тестах, race React state vs
          // native event). Жёстко глушим event на pre-condition; ту же
          // проверку дублируем в handleSubmit.
          onClick={(e) => {
            if (!consent || sending) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          className="w-full"
        >
          {sending ? strings.sendingLabel : strings.submitLabel}
        </Button>
      </form>
    </Modal>
  );
}
