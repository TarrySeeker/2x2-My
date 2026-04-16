import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  // Rate limit: 20 requests per 60 seconds
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`upload:${ip}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов, попробуйте позже" },
      { status: 429 },
    );
  }

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Не авторизован" },
      { status: 401 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Хранилище не настроено" },
      { status: 503 },
    );
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

  // Validate file type
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Недопустимый тип файла: ${file.type}. Разрешены: JPG, PNG, WebP, SVG`,
      },
      { status: 400 },
    );
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Размер файла превышает 5 МБ" },
      { status: 400 },
    );
  }

  const bucket = (formData.get("bucket") as string) || "images";
  const pathPrefix = (formData.get("path") as string) || "uploads";

  // Generate unique filename
  const ext = file.name.split(".").pop() ?? "jpg";
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `${pathPrefix}/${uniqueName}`;

  try {
    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[api/upload] storage error:", uploadError.message);
      return NextResponse.json(
        { error: "Не удалось загрузить файл" },
        { status: 500 },
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from(bucket).getPublicUrl(storagePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("[api/upload] unexpected error:", err);
    return NextResponse.json(
      { error: "Ошибка при загрузке файла" },
      { status: 500 },
    );
  }
}
