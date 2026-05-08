/**
 * @vitest-environment node
 *
 * Unit-тесты для `app/api/upload/route.ts` (POST).
 *
 * Покрытие:
 *  - 401 без сессии (mock requireAdmin → 401 NextResponse).
 *  - 503 если S3 не настроен.
 *  - 400 если нет multipart, нет поля 'file', файл пустой.
 *  - 400 на > 10 MB.
 *  - 400 на запрещённый MIME (text/plain, image/svg+xml).
 *  - 200 на валидный jpeg/png/webp/avif (с моком uploadFile).
 *  - 429 на превышение rate-limit (>30 req/min).
 *
 * NB: ALLOWED_FOLDERS whitelist проверяется тем, что произвольный
 * folder подменяется на "uploads".
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ──────── Моки auth + s3 + rate-limit ────────
import { NextResponse } from "next/server";

const { mockRequireAdmin, mockUploadFile, mockIsS3Configured } = vi.hoisted(
  () => ({
    mockRequireAdmin: vi.fn(),
    mockUploadFile: vi.fn(),
    mockIsS3Configured: vi.fn(() => true),
  }),
);

vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: mockRequireAdmin,
  // isResponse — реальная проверка через instanceof NextResponse,
  // чтобы happy-path (плоский объект user) корректно НЕ проходил как response.
  isResponse: (val: unknown): val is Response => val instanceof NextResponse,
}));

vi.mock("@/lib/storage/s3", () => ({
  uploadFile: mockUploadFile,
  isS3Configured: mockIsS3Configured,
  deleteFile: vi.fn(),
}));

// rate-limit держим реальный, но обеспечиваем чистый стейт через unique IP.
import { NextRequest } from "next/server";
import { POST } from "@/app/api/upload/route";

let ipCounter = 0;
function uniqueIp(): string {
  ipCounter += 1;
  return `192.0.2.${(ipCounter % 250) + 1}`;
}

function makeRequest(formData: FormData, ip = uniqueIp()): NextRequest {
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: formData,
    headers: {
      "x-forwarded-for": ip,
    },
  });
}

/** Magic bytes для каждого формата (см. lib/upload/sniff-magic-bytes.ts). */
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
  // RIFF....WEBP
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  // ....ftypavif
  "image/avif": [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66],
};

/**
 * Создаёт File нужного MIME-типа с правильными magic bytes на старте,
 * чтобы пройти sniff-проверку. Если magic для типа не определён —
 * пишем чистый ASCII (нужно для негативных тестов).
 */
function makeFile(
  name: string,
  type: string,
  sizeBytes: number,
  content?: string,
): File {
  if (content !== undefined) {
    return new File([content], name, { type });
  }
  const magic = MAGIC_BYTES[type];
  if (!magic) {
    // Тип без сигнатуры (text/plain, image/svg+xml) — просто нули.
    return new File(["x".repeat(sizeBytes)], name, { type });
  }
  const buf = new Uint8Array(Math.max(sizeBytes, magic.length));
  buf.set(magic, 0);
  // Дополняем до нужного размера произвольными байтами.
  for (let i = magic.length; i < buf.length; i++) buf[i] = 0x41; // 'A'
  return new File([buf], name, { type });
}

/** Файл с поддельным заголовком (заявлен JPG, но байты — рандом). */
function makeSpoofedFile(name: string, type: string, sizeBytes: number): File {
  const buf = new Uint8Array(sizeBytes);
  // Намеренно НЕ ставим magic — заполняем 'X' (0x58).
  for (let i = 0; i < buf.length; i++) buf[i] = 0x58;
  return new File([buf], name, { type });
}

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockUploadFile.mockReset();
  mockIsS3Configured.mockReset();
  mockIsS3Configured.mockReturnValue(true);
  mockUploadFile.mockResolvedValue({
    url: "https://cdn.example.com/uploads/abc.jpg",
    key: "uploads/abc.jpg",
    bucket: "2x2-media",
  });

  // Default — авторизован.
  mockRequireAdmin.mockResolvedValue({
    id: "u1",
    username: "admin",
    email: null,
    full_name: null,
    role: "owner",
    avatar_url: null,
    is_active: true,
  });
});

describe("POST /api/upload — auth", () => {
  it("401 если requireAdmin вернул NextResponse (нет сессии)", async () => {
    mockRequireAdmin.mockResolvedValueOnce(
      NextResponse.json({ error: "Не авторизован" }, { status: 401 }),
    );
    const fd = new FormData();
    fd.set("file", makeFile("a.jpg", "image/jpeg", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
    // uploadFile НЕ дёргался.
    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload — конфиг S3", () => {
  it("503 если S3 не настроен", async () => {
    mockIsS3Configured.mockReturnValueOnce(false);
    const fd = new FormData();
    fd.set("file", makeFile("a.jpg", "image/jpeg", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(503);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });
});

describe("POST /api/upload — валидация файла", () => {
  it("400 если поля 'file' нет в multipart", async () => {
    const fd = new FormData();
    fd.set("notfile", "value");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it("400 если файл пустой (size === 0)", async () => {
    const fd = new FormData();
    fd.set("file", new File([], "empty.png", { type: "image/png" }));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/пуст/i);
  });

  it("400 если файл > 10 MB", async () => {
    const fd = new FormData();
    // 11 МБ
    fd.set("file", makeFile("big.jpg", "image/jpeg", 11 * 1024 * 1024));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/10 МБ/);
  });

  it("400 на запрещённый MIME (text/plain)", async () => {
    const fd = new FormData();
    fd.set("file", makeFile("a.txt", "text/plain", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Недопустимый тип/i);
  });

  it("400 на SVG (потенциальный XSS)", async () => {
    const fd = new FormData();
    fd.set("file", makeFile("a.svg", "image/svg+xml", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it("400 если magic bytes не совпадают с заявленным MIME", async () => {
    // Заявлен JPG, но в байтах нет FF D8 FF — это .exe переименованный в .jpg.
    const fd = new FormData();
    fd.set("file", makeSpoofedFile("a.jpg", "image/jpeg", 200));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/не соответствует|подмен/i);
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("400 если PNG-bytes но заявлен image/jpeg", async () => {
    // У файла реальная PNG-сигнатура, но клиент сказал image/jpeg.
    // Строгое sniffing'у это тоже mismatch — отбиваем.
    const fd = new FormData();
    fd.set("file", makeFile("a.jpg", "image/png", 200)); // PNG bytes, type=png
    // Подменяем тип на JPG, оставляя PNG-байты:
    const realFile = fd.get("file") as File;
    const spoofed = new File([await realFile.arrayBuffer()], "a.jpg", {
      type: "image/jpeg",
    });
    fd.set("file", spoofed);
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/upload — happy path", () => {
  it.each([
    ["a.jpg", "image/jpeg"],
    ["a.png", "image/png"],
    ["a.webp", "image/webp"],
    ["a.avif", "image/avif"],
  ])("200 для валидного %s (%s)", async (name, type) => {
    const fd = new FormData();
    fd.set("file", makeFile(name, type, 1024));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeTruthy();
    expect(body.key).toBe("uploads/abc.jpg");
    expect(body.bucket).toBe("2x2-media");
    expect(mockUploadFile).toHaveBeenCalledTimes(1);
  });

  it("использует whitelisted folder из form (portfolio)", async () => {
    // Раньше тест проверял folder=products, но папка удалена из
    // whitelist 2026-05-06 вместе с сущностью «Товары». Проверяем
    // на любой другой реально используемой папке (portfolio).
    const fd = new FormData();
    fd.set("file", makeFile("a.png", "image/png", 100));
    fd.set("folder", "portfolio");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ folder: "portfolio" }),
    );
  });

  it("игнорирует не-whitelisted folder и подставляет 'uploads'", async () => {
    const fd = new FormData();
    fd.set("file", makeFile("a.png", "image/png", 100));
    fd.set("folder", "../etc/passwd");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ folder: "uploads" }),
    );
  });

  it("500 если uploadFile бросил исключение, наружу — generic", async () => {
    mockUploadFile.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    const fd = new FormData();
    fd.set("file", makeFile("a.png", "image/png", 100));
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(500);
    const body = await res.json();
    // Внутреннее сообщение НЕ утекает наружу.
    expect(body.error).not.toContain("ECONNREFUSED");
  });
});

describe("POST /api/upload — rate-limit", () => {
  it("429 после 30 запросов в минуту с одного IP", async () => {
    const ip = "203.0.113.77";
    // 30 успешных:
    for (let i = 0; i < 30; i++) {
      const fd = new FormData();
      fd.set("file", makeFile("a.png", "image/png", 100));
      const res = await POST(makeRequest(fd, ip));
      expect(res.status).toBe(200);
    }
    // 31-й — 429.
    const fd = new FormData();
    fd.set("file", makeFile("a.png", "image/png", 100));
    const res = await POST(makeRequest(fd, ip));
    expect(res.status).toBe(429);
  });
});
