import { getAllUiStrings } from "@/lib/data/ui-strings";
import { getSettingValue } from "@/lib/data/settings";
import QuoteModalClient, { type QuoteModalStrings } from "./QuoteModalClient";
import type { PdConsentStrings } from "./PdConsentField";

interface ContactsValue {
  phone_primary?: string;
}

const FALLBACK_PHONE = "+7-932-424-77-40";

const FALLBACK: QuoteModalStrings = {
  title: "Заказать расчёт стоимости",
  description:
    "Опишите задачу — пришлём коммерческое предложение с вариантами и сроками в течение 1 часа",
  descriptionWithProductTemplate:
    "{product} — пришлём коммерческое предложение с вариантами и сроками в течение 1 часа",
  nameLabel: "Имя",
  phoneLabel: "Телефон",
  emailLabel: "Email (необязательно)",
  companyLabel: "Компания (если юрлицо)",
  commentLabel: "Опишите вашу задачу",
  namePlaceholder: "Иван Иванов",
  phonePlaceholder: "+7 (___) ___-__-__",
  commentPlaceholder:
    "Размеры, материал, тираж, адрес монтажа, сроки, референсы",
  calcHint:
    "К заявке приложим ваш предварительный расчёт из калькулятора — менеджер учтёт его при подготовке КП и предложит оптимальные материалы для ХМАО/ЯНАО.",
  submitLabel: "Отправить заявку на расчёт",
  sendingLabel: "Отправляем…",
  successMessage:
    "Заявка принята. Подготовим КП и пришлём в течение 1 часа в рабочее время (Пн–Пт 9:00–19:00).",
  errorMessage: "Не удалось отправить заявку. Позвоните нам напрямую.",
  nameRequired: "Укажите имя",
  phoneInvalid: "Некорректный телефон",
  emailInvalid: "Некорректный email",
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

/**
 * Парсинг markdown-строки согласия «…[политикой конфиденциальности](/privacy)…».
 * Возвращает объект PdConsentStrings с prefix/linkText/suffix/href.
 * При ошибке парсинга — возвращает null.
 */
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
 * Server-обёртка QuoteModal. Читает все микротексты из ui_strings
 * (namespaces: modals, validation, agreements). Клиентская логика —
 * в QuoteModalClient.
 */
export default async function QuoteModal() {
  const dict = await getAllUiStrings();
  const contacts = await getSettingValue<ContactsValue>("contacts", {
    phone_primary: FALLBACK_PHONE,
  });
  const phoneDisplay = contacts.phone_primary || FALLBACK_PHONE;

  const consentStrings =
    parseConsent(dict["agreement.privacy_markdown"] || "") ?? CONSENT_FALLBACK;

  const strings: QuoteModalStrings = {
    title: pick(dict, "modal.quote.title", FALLBACK.title),
    description: pick(dict, "modal.quote.description", FALLBACK.description),
    descriptionWithProductTemplate: pick(
      dict,
      "modal.quote.description_with_product",
      FALLBACK.descriptionWithProductTemplate,
    ),
    nameLabel: pick(dict, "modal.quote.name_label", FALLBACK.nameLabel),
    phoneLabel: pick(dict, "modal.quote.phone_label", FALLBACK.phoneLabel),
    emailLabel: pick(dict, "modal.quote.email_label", FALLBACK.emailLabel),
    companyLabel: pick(dict, "modal.quote.company_label", FALLBACK.companyLabel),
    commentLabel: pick(dict, "modal.quote.comment_label", FALLBACK.commentLabel),
    namePlaceholder: pick(
      dict,
      "modal.quote.name_placeholder",
      FALLBACK.namePlaceholder,
    ),
    phonePlaceholder: pick(
      dict,
      "modal.quote.phone_placeholder",
      FALLBACK.phonePlaceholder,
    ),
    commentPlaceholder: FALLBACK.commentPlaceholder,
    calcHint: FALLBACK.calcHint,
    submitLabel: pick(dict, "modal.quote.submit_label", FALLBACK.submitLabel),
    sendingLabel: pick(dict, "modal.quote.sending_label", FALLBACK.sendingLabel),
    successMessage: pick(
      dict,
      "modal.quote.success_message",
      FALLBACK.successMessage,
    ),
    errorMessage: pick(dict, "modal.quote.error_message", FALLBACK.errorMessage),
    nameRequired: pick(dict, "validation.name_required", FALLBACK.nameRequired),
    phoneInvalid: pick(dict, "validation.phone_invalid", FALLBACK.phoneInvalid),
    emailInvalid: pick(dict, "validation.email_invalid", FALLBACK.emailInvalid),
    consentRequired: pick(
      dict,
      "validation.agreement_required",
      FALLBACK.consentRequired,
    ),
  };

  return (
    <QuoteModalClient
      strings={strings}
      consentStrings={consentStrings}
      phoneDisplay={phoneDisplay}
    />
  );
}
