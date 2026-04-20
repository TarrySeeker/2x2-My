import "server-only";

import { randomBytes } from "node:crypto";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-совместимое хранилище. Поддерживается:
 *  - MinIO локально (docker-compose, цепочка 3) — `forcePathStyle: true`
 *  - Timeweb Cloud Object Storage в проде — путь-стиль тоже работает
 *
 * Конфиг через env (см. .env.local.example):
 *   S3_ENDPOINT       — http://localhost:9000 или https://s3.timeweb.cloud
 *   S3_REGION         — ru-1 (дефолт, для Timeweb)
 *   S3_ACCESS_KEY     — ключ доступа
 *   S3_SECRET_KEY     — секретный ключ
 *   S3_BUCKET         — имя бакета (например "2x2-media")
 *   S3_PUBLIC_URL     — публичный base URL (https://2x2-media.s3.timeweb.cloud
 *                        или http://localhost:9000/2x2-media)
 *
 * Почему `forcePathStyle: true`:
 *   MinIO не поддерживает virtual-hosted-style (bucket.host.com) —
 *   только path-style (host/bucket/key). Timeweb поддерживает оба,
 *   но path-style работает везде одинаково. Если понадобится
 *   virtual-hosted — можно переключить через S3_FORCE_PATH_STYLE env.
 */

export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
  forcePathStyle: boolean;
}

function readConfig(): S3Config | null {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  const publicUrl = process.env.S3_PUBLIC_URL;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }

  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "false"
    ? false
    : true;

  return {
    endpoint,
    region: process.env.S3_REGION ?? "ru-1",
    accessKeyId,
    secretAccessKey,
    bucket,
    publicUrl,
    forcePathStyle,
  };
}

let cachedClient: { client: S3Client; config: S3Config } | null = null;

function getClient(): { client: S3Client; config: S3Config } {
  if (cachedClient) return cachedClient;

  const config = readConfig();
  if (!config) {
    throw new Error(
      "S3 is not configured: set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_PUBLIC_URL",
    );
  }

  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: config.forcePathStyle,
  });

  cachedClient = { client, config };
  return cachedClient;
}

/** Возвращает `true`, если S3 настроен в env (можно использовать в /api/upload). */
export function isS3Configured(): boolean {
  return readConfig() !== null;
}

export interface UploadOptions {
  /** Папка-префикс в бакете. По умолчанию "uploads". */
  folder?: string;
  /** Content-Type. Если не указан — берётся из File. */
  contentType?: string;
  /** Cache-Control. По умолчанию immutable на год (ключи рандомные). */
  cacheControl?: string;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

function sanitizeFolder(folder: string): string {
  // Разрешаем только ASCII-буквы, цифры, дефисы и слэши.
  return folder.replace(/[^a-zA-Z0-9_/-]/g, "").replace(/^\/+|\/+$/g, "");
}

function safeExtension(filename: string): string {
  const raw = filename.split(".").pop() ?? "bin";
  // ext — только ASCII, max 8 символов.
  const ext = raw.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return ext.length > 0 ? ext : "bin";
}

/**
 * Загружает файл в S3 и возвращает публичный URL.
 * Ключ формируется рандомно: `${folder}/${timestamp}-${16 hex}.${ext}`.
 * Имя пользователя в ключ НЕ попадает (защита от XSS через имя файла
 * и от утечки чужого PII в URL).
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {},
): Promise<UploadResult> {
  const { client, config } = getClient();

  const folder = sanitizeFolder(options.folder ?? "uploads") || "uploads";
  const ext = safeExtension(file.name);
  const key = `${folder}/${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: options.contentType ?? file.type ?? "application/octet-stream",
      CacheControl:
        options.cacheControl ?? "public, max-age=31536000, immutable",
    }),
  );

  return {
    url: `${config.publicUrl.replace(/\/$/, "")}/${key}`,
    key,
    bucket: config.bucket,
  };
}

export async function deleteFile(key: string): Promise<void> {
  const { client, config } = getClient();
  await client.send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

/**
 * Presigned URL для PUT — на случай, если фронт хочет заливать
 * сразу в S3 минуя наш сервер (большие файлы). Пока не используется,
 * но готов к подключению.
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 60,
): Promise<string> {
  const { client, config } = getClient();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn },
  );
}
