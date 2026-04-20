import "server-only";

import { NextRequest, NextResponse } from "next/server";

import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isResponse, requireAdmin } from "@/lib/auth/admin";
import { isS3Configured, uploadFile } from "@/lib/storage/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whitelist MIME-типов. НЕ добавлять SVG — в нём можно спрятать
 * JavaScript, что превратит бакет в XSS-платформу. Если нужен SVG,
 * рендерить через отдельный санитайзер (dompurify на сервере) перед
 * аплоадом.
 */
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const ALLOWED_FOLDERS = new Set([
  "uploads",
  "products",
  "portfolio",
  "blog",
  "banners",
  "avatars",
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth first — никаких внешних проверок без валидной сессии.
  const auth = await requireAdmin();
  if (isResponse(auth)) return auth;

  // 2. Rate-limit по IP — чтобы даже админ не положил бакет.
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`upload:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов, попробуйте позже" },
      { status: 429 },
    );
  }

  // 3. S3 должен быть настроен.
  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Хранилище файлов не настроено" },
      { status: 503 },
    );
  }

  // 4. Парсим multipart.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Файл не найден в запросе (поле 'file')" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Файл пустой" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Размер файла превышает 10 МБ" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Недопустимый тип файла: ${file.type || "неизвестен"}. Разрешены: JPG, PNG, WebP, AVIF`,
      },
      { status: 400 },
    );
  }

  // 5. Папка — только из whitelist.
  const folderRaw = formData.get("folder");
  const folder =
    typeof folderRaw === "string" && ALLOWED_FOLDERS.has(folderRaw)
      ? folderRaw
      : "uploads";

  // 6. Uploader.
  try {
    const result = await uploadFile(file, {
      folder,
      contentType: file.type,
    });

    return NextResponse.json({
      url: result.url,
      key: result.key,
      bucket: result.bucket,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Логируем на сервере, наружу отдаём generic.
    console.error("[upload] S3 upload failed:", message);
    return NextResponse.json(
      { error: "Не удалось загрузить файл. Повторите позже." },
      { status: 500 },
    );
  }
}
