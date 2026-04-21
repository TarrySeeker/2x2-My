/**
 * Reusable mock for `lib/storage/s3.ts`.
 *
 * Реальные S3-вызовы заменяем на vi.fn(), чтобы тесты не лезли
 * в MinIO/Timeweb. Дефолтное поведение — успех, тесты могут
 * переопределить (`.mockRejectedValueOnce(new Error(...))`).
 */
import { vi } from "vitest";

export const mockUploadFile = vi.fn();
export const mockDeleteFile = vi.fn();
export const mockIsS3Configured = vi.fn(() => true);
export const mockCreatePresignedUploadUrl = vi.fn();

vi.mock("@/lib/storage/s3", () => ({
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile,
  isS3Configured: mockIsS3Configured,
  createPresignedUploadUrl: mockCreatePresignedUploadUrl,
}));

/** Стандартный успешный ответ uploadFile. */
export function setS3Success(url = "https://cdn.example.com/uploads/abc.jpg"): void {
  mockUploadFile.mockResolvedValue({
    url,
    key: "uploads/abc.jpg",
    bucket: "2x2-media",
  });
  mockDeleteFile.mockResolvedValue(undefined);
  mockIsS3Configured.mockReturnValue(true);
}

export function setS3NotConfigured(): void {
  mockIsS3Configured.mockReturnValue(false);
}

export function resetS3Mocks(): void {
  mockUploadFile.mockReset();
  mockDeleteFile.mockReset();
  mockIsS3Configured.mockReset();
  mockIsS3Configured.mockReturnValue(true);
  mockCreatePresignedUploadUrl.mockReset();
}
