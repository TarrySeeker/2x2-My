import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { getSession } from "@/features/auth/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const ALLOWED_BUCKETS = new Set(["images", "blog"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * STUB Storage (TODO S3 — цепочка 3).
 *
 * Раньше файлы уходили в Supabase Storage. После миграции на чистый PostgreSQL
 * Storage недоступен. Временно возвращаем placeholder-URL, оставляя валидацию
 * на месте — чтобы тесты проходили и UI корректно обрабатывал результат.
 *
 * В цепочке 3 здесь будет:
 *   - S3-совместимый клиент (Timeweb Cloud Storage / minio)
 *   - подпись presigned URL или прямая загрузка
 *   - возврат реального public URL
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`upload:${ip}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов, попробуйте позже" },
      { status: 429 },
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

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
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "Файл не найден в запросе" },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Недопустимый тип файла: ${file.type}. Разрешены: JPG, PNG, WebP, SVG`,
      },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Размер файла превышает 5 МБ" },
      { status: 400 },
    );
  }

  const bucket = (formData.get("bucket") as string) || "images";
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json(
      { error: "Недопустимый bucket" },
      { status: 400 },
    );
  }

  const pathPrefix = (formData.get("path") as string) || "uploads";
  const ext = file.name.split(".").pop() ?? "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `${bucket}/${pathPrefix}/${uniqueName}`;

  // TODO S3 (цепочка 3): реальная загрузка в Timeweb Cloud Storage / minio.
  const placeholderUrl = `/uploads/placeholder.png?path=${encodeURIComponent(storagePath)}`;

  return NextResponse.json({
    url: placeholderUrl,
    path: storagePath,
    stub: true,
  });
}
