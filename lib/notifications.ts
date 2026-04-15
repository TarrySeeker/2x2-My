import "server-only";

interface NotificationContext {
  order_id?: number;
  order_number?: string;
  total?: number;
  customer_name?: string;
  customer_phone?: string;
  request_number?: string;
  [key: string]: unknown;
}

type EventType =
  | "order_created"
  | "order_paid"
  | "order_status_changed"
  | "calc_request_created"
  | "one_click_lead"
  | "contact_form"
  | "review_submitted";

export async function sendNotification(
  event: EventType,
  ctx: NotificationContext,
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    promises.push(sendTelegram(event, ctx));
  }

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    promises.push(sendEmail(event, ctx));
  }

  await Promise.allSettled(promises);
}

function formatMessage(event: EventType, ctx: NotificationContext): string {
  switch (event) {
    case "order_created":
      return `Новый заказ #${ctx.order_number}\n${ctx.customer_name} (${ctx.customer_phone})\nСумма: ${ctx.total} ₽`;
    case "order_paid":
      return `Оплачен заказ #${ctx.order_number}\n${ctx.customer_name}\nСумма: ${ctx.total} ₽`;
    case "order_status_changed":
      return `Заказ #${ctx.order_number} — статус изменён`;
    case "calc_request_created":
      return `Новая заявка на расчёт #${ctx.request_number}\n${ctx.customer_name} (${ctx.customer_phone})`;
    case "one_click_lead":
      return `Купить в 1 клик\n${ctx.customer_name} (${ctx.customer_phone})`;
    case "contact_form":
      return `Обращение с сайта\n${ctx.customer_name}`;
    case "review_submitted":
      return `Новый отзыв от ${ctx.customer_name}`;
    default:
      return `Событие: ${event}`;
  }
}

async function sendTelegram(
  event: EventType,
  ctx: NotificationContext,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const chatId = process.env.TELEGRAM_CHAT_ID!;
  const text = formatMessage(event, ctx);

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("[telegram]", err);
  }
}

async function sendEmail(
  event: EventType,
  _ctx: NotificationContext,
): Promise<void> {
  const subject = formatMessage(event, _ctx).split("\n")[0] ?? "Notification";
  // Nodemailer не включён в deps. Когда SMTP настроен — поставьте nodemailer
  // и раскомментируйте отправку ниже.
  console.log(
    `[email-stub] Email would be sent (subject: ${subject.slice(0, 50)}). Configure SMTP to enable.`,
  );
}
