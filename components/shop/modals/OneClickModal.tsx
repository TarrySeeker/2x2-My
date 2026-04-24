import { getAllUiStrings } from "@/lib/data/ui-strings";
import { getSettingValue } from "@/lib/data/settings";
import OneClickModalClient, {
  type OneClickModalStrings,
} from "./OneClickModalClient";
import type { PdConsentStrings } from "./PdConsentField";

interface ContactsValue {
  phone_primary?: string;
}

const FALLBACK_PHONE = "+7-932-424-77-40";

const FALLBACK: OneClickModalStrings = {
  title: "Быстрый расчёт",
  description:
    "Оставьте номер — перезвоним в течение 15 минут и поможем оформить заявку.",
  descriptionWithProduct: (productName) =>
    `${productName} — менеджер свяжется в течение 15 минут, уточнит параметры и пришлёт стоимость.`,
  nameLabel: "Как к вам обращаться",
  phoneLabel: "Телефон",
  commentLabel: "Опишите вашу задачу",
  namePlaceholder: "Александр",
  phonePlaceholder: "+7 932 424 77 40",
  commentPlaceholder: "Тираж, размеры, дата, особые пожелания",
  submitLabel: "Отправить заявку",
  sendingLabel: "Отправляем…",
  successMessage:
    "Заявка принята. Менеджер «2х2» свяжется с вами в течение 15 минут в рабочее время (Пн–Пт 9:00–19:00).",
  errorMessage: "Не удалось отправить заявку. Позвоните нам напрямую.",
  errorMessageWithPhone: (phone) =>
    `Не удалось отправить заявку. Позвоните: ${phone}`,
  nameRequired: "Укажите имя",
  phoneInvalid: "Некорректный телефон",
  consentRequired: "Нужно согласие на обработку персональных данных",
};

const CONSENT_FALLBACK: PdConsentStrings = {
  prefix: "Нажимая кнопку, я соглашаюсь с",
  linkText: "политикой конфиденциальности",
  suffix: "и даю согласие на обработку персональных данных.",
  href: "/privacy",
};

function pick(dict: Record<string, string>, key: string, fallback: string): string {
  const v = dict[key];
  return v && v.length > 0 ? v : fallback;
}

function parseConsent(markdown: string): PdConsentStrings | null {
  const m = /^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)([\s\S]*)$/.exec(markdown);
  if (!m) return null;
  return {
    prefix: m[1]!.trim(),
    linkText: m[2]!.trim(),
    href: m[3]!.trim(),
    suffix: m[4]!.trim(),
  };
}

/**
 * Server-обёртка OneClickModal. Читает все микротексты из ui_strings
 * (namespaces: modals, validation, agreements). Клиентская логика —
 * в OneClickModalClient.
 */
export default async function OneClickModal() {
  const dict = await getAllUiStrings();
  const contacts = await getSettingValue<ContactsValue>("contacts", {
    phone_primary: FALLBACK_PHONE,
  });
  const phoneDisplay = contacts.phone_primary || FALLBACK_PHONE;

  const consentStrings =
    parseConsent(dict["agreement.privacy_markdown"] || "") ?? CONSENT_FALLBACK;

  const strings: OneClickModalStrings = {
    title: pick(dict, "modal.oneclick.title", FALLBACK.title),
    description: pick(dict, "modal.oneclick.description", FALLBACK.description),
    descriptionWithProduct: FALLBACK.descriptionWithProduct,
    nameLabel: pick(dict, "modal.oneclick.name_label", FALLBACK.nameLabel),
    phoneLabel: pick(dict, "modal.oneclick.phone_label", FALLBACK.phoneLabel),
    commentLabel: FALLBACK.commentLabel,
    namePlaceholder: pick(
      dict,
      "modal.oneclick.name_placeholder",
      FALLBACK.namePlaceholder,
    ),
    phonePlaceholder: pick(
      dict,
      "modal.oneclick.phone_placeholder",
      FALLBACK.phonePlaceholder,
    ),
    commentPlaceholder: FALLBACK.commentPlaceholder,
    submitLabel: pick(dict, "modal.oneclick.submit_label", FALLBACK.submitLabel),
    sendingLabel: FALLBACK.sendingLabel,
    successMessage: pick(
      dict,
      "modal.oneclick.success_message",
      FALLBACK.successMessage,
    ),
    errorMessage: pick(
      dict,
      "modal.oneclick.error_message",
      FALLBACK.errorMessage,
    ),
    errorMessageWithPhone: (phone) =>
      `${pick(dict, "modal.oneclick.error_message", FALLBACK.errorMessage)} ${phone}`,
    nameRequired: pick(dict, "validation.name_required", FALLBACK.nameRequired),
    phoneInvalid: pick(dict, "validation.phone_invalid", FALLBACK.phoneInvalid),
    consentRequired: pick(
      dict,
      "validation.agreement_required",
      FALLBACK.consentRequired,
    ),
  };

  return (
    <OneClickModalClient
      strings={strings}
      consentStrings={consentStrings}
      phoneDisplay={phoneDisplay}
    />
  );
}
