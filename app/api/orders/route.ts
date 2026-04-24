import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/orders отключён — бизнес-модель «только индивидуальный расчёт».
 * Заявки идут через /api/leads/quote и /api/leads/one-click.
 *
 * Endpoint оставлен как stub: возвращает 410 Gone, чтобы не молчал
 * 404 у ботов / старых клиентов. Удалить весь файл можно после
 * перезагрузки прода и подтверждения, что никто не зовёт legacy URL.
 */
export function POST() {
  return NextResponse.json(
    {
      error:
        "Корзинные заказы отключены. Используйте форму расчёта или «купить в 1 клик».",
    },
    { status: 410 },
  );
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
