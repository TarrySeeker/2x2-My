/**
 * @vitest-environment node
 *
 * Unit-тесты для `lib/storage/s3.ts`.
 *
 * Тестируем чистый wrapper-слой:
 *  - isS3Configured(): true только когда все env заданы.
 *  - uploadFile(): генерирует случайный ключ, ContentType из file.type
 *    (или явный), CacheControl immutable по умолчанию, возвращает
 *    `${publicUrl}/${key}`.
 *  - deleteFile(): шлёт DeleteObjectCommand с правильными Bucket+Key.
 *  - имя пользователя НЕ попадает в ключ (защита от XSS / PII утечки).
 *
 * `@aws-sdk/client-s3` мокаем целиком — реального HTTP не делаем.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ────────────────────────────────────────────────────────────
// Mock AWS SDK ДО импорта тестируемого модуля.
// ────────────────────────────────────────────────────────────
const mockSend = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn().mockImplementation((cfg) => ({
      send: mockSend,
      __config: cfg,
    })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({
      __type: "Put",
      input,
    })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({
      __type: "Delete",
      input,
    })),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed.example.com"),
}));

const TEST_ENV = {
  S3_ENDPOINT: "http://minio.test:9000",
  S3_REGION: "ru-1",
  S3_ACCESS_KEY: "access",
  S3_SECRET_KEY: "secret",
  S3_BUCKET: "2x2-media",
  S3_PUBLIC_URL: "https://cdn.example.com/2x2-media",
};

function setEnv(env: Partial<typeof TEST_ENV>): void {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
    else process.env[k] = v;
  }
}

function clearEnv(): void {
  for (const k of Object.keys(TEST_ENV)) {
    delete process.env[k as keyof typeof TEST_ENV];
  }
  delete process.env.S3_FORCE_PATH_STYLE;
}

beforeEach(() => {
  // Очищаем .mock.calls у всех vi.fn (S3Client/PutObjectCommand/DeleteObjectCommand,
  // mockSend) — иначе вызовы из предыдущих тестов утекают в текущий.
  vi.clearAllMocks();
  mockSend.mockResolvedValue({});
  clearEnv();
  setEnv(TEST_ENV);
  // Сбрасываем module-level cache (cachedClient) пересоздавая модуль.
  vi.resetModules();
});

describe("isS3Configured", () => {
  it("true когда все env заданы", async () => {
    const { isS3Configured } = await import("@/lib/storage/s3");
    expect(isS3Configured()).toBe(true);
  });

  it("false если нет S3_ENDPOINT", async () => {
    setEnv({ S3_ENDPOINT: undefined });
    const { isS3Configured } = await import("@/lib/storage/s3");
    expect(isS3Configured()).toBe(false);
  });

  it("false если нет S3_BUCKET", async () => {
    setEnv({ S3_BUCKET: undefined });
    const { isS3Configured } = await import("@/lib/storage/s3");
    expect(isS3Configured()).toBe(false);
  });

  it("false если нет S3_PUBLIC_URL", async () => {
    setEnv({ S3_PUBLIC_URL: undefined });
    const { isS3Configured } = await import("@/lib/storage/s3");
    expect(isS3Configured()).toBe(false);
  });
});

describe("uploadFile", () => {
  it("генерирует случайный ключ внутри указанной папки и нужного расширения", async () => {
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["hello"], "myphoto.JPG", { type: "image/jpeg" });

    const r = await uploadFile(file, { folder: "products" });
    expect(r.key).toMatch(/^products\/\d{10,}-[a-f0-9]{16}\.jpg$/);
    expect(r.bucket).toBe("2x2-media");
    expect(r.url).toBe(`https://cdn.example.com/2x2-media/${r.key}`);
  });

  it("содержимое имени файла НЕ попадает в ключ (защита от XSS/PII)", async () => {
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["x"], "<script>alert(1)</script>.png", {
      type: "image/png",
    });
    const r = await uploadFile(file, { folder: "uploads" });
    expect(r.key).not.toContain("script");
    expect(r.key).not.toContain("alert");
    // Ровно расширение .png:
    expect(r.key.endsWith(".png")).toBe(true);
  });

  it("санитизирует folder, отбрасывая опасные символы и лидирующие /", async () => {
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["x"], "f.webp", { type: "image/webp" });
    const r = await uploadFile(file, { folder: "../../etc/../uploads" });
    // sanitizeFolder пропускает буквы, цифры, _, /, -; "../" => ".." → ".."
    // отрезаются точки, остаётся "/etc//uploads" → trim(/) → "etc//uploads"
    // но точно НЕ начинается со слэша, и нет ".."
    expect(r.key.startsWith("/")).toBe(false);
    expect(r.key).not.toContain("..");
  });

  it("дефолтный folder='uploads' если не указан", async () => {
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["x"], "f.webp", { type: "image/webp" });
    const r = await uploadFile(file);
    expect(r.key.startsWith("uploads/")).toBe(true);
  });

  it("ContentType берётся из file.type если options.contentType не задан", async () => {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["x"], "f.webp", { type: "image/webp" });
    await uploadFile(file);
    const call = (PutObjectCommand as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(call.ContentType).toBe("image/webp");
    expect(call.Bucket).toBe("2x2-media");
    expect(call.CacheControl).toContain("immutable");
  });

  it("явный options.contentType переопределяет file.type", async () => {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["x"], "f.bin", { type: "" });
    await uploadFile(file, { contentType: "image/avif" });
    const call = (PutObjectCommand as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(call.ContentType).toBe("image/avif");
  });

  it("делает ровно один send() — единственный PutObjectCommand", async () => {
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["x"], "f.png", { type: "image/png" });
    await uploadFile(file);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("бросает понятную ошибку если S3 не сконфигурирован", async () => {
    setEnv({ S3_ENDPOINT: undefined });
    vi.resetModules();
    const { uploadFile } = await import("@/lib/storage/s3");
    const file = new File(["x"], "f.png", { type: "image/png" });
    await expect(uploadFile(file)).rejects.toThrow(/S3 is not configured/);
  });
});

describe("deleteFile", () => {
  it("вызывает DeleteObjectCommand с правильными Bucket+Key", async () => {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const { deleteFile } = await import("@/lib/storage/s3");
    await deleteFile("uploads/abc.jpg");
    const call = (DeleteObjectCommand as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0];
    expect(call.Bucket).toBe("2x2-media");
    expect(call.Key).toBe("uploads/abc.jpg");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
