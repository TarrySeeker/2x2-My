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
  createPresignedUploadUrl: vi.fn(),
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

function makeFile(
  name: string,
  type: string,
  sizeBytes: number,
  content?: string,
): File {
  const data = content ?? "x".repeat(sizeBytes);
  return new File([data], name, { type });
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

  it("использует whitelisted folder из form (products)", async () => {
    const fd = new FormData();
    fd.set("file", makeFile("a.png", "image/png", 100));
    fd.set("folder", "products");
    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(200);
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ folder: "products" }),
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
