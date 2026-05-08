/**
 * @vitest-environment node
 *
 * Unit-тесты для `lib/upload/sniff-magic-bytes.ts`.
 *
 * Покрытие:
 *  - JPEG / PNG / WebP / AVIF — каждый формат опознаётся по сигнатуре.
 *  - Нет ложноположительных: рандомные байты → unknown.
 *  - HEIC (ftypheic) тоже unknown — мы НЕ принимаем его как AVIF.
 *  - Слишком короткий буфер (<12 байт) → unknown без падения.
 *  - isClaimedMimeMatchingBytes — отбивает mismatch.
 */
import { describe, it, expect } from "vitest";

import {
  sniffMagicBytes,
  isClaimedMimeMatchingBytes,
} from "@/lib/upload/sniff-magic-bytes";

function bytes(...vals: number[]): Uint8Array {
  // Дополняем до 16 байт нулями — типичный размер «головы» файла.
  const out = new Uint8Array(Math.max(16, vals.length));
  out.set(vals, 0);
  return out;
}

describe("sniffMagicBytes — позитивные случаи", () => {
  it("JPEG: FF D8 FF", () => {
    const r = sniffMagicBytes(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10));
    expect(r.format).toBe("jpeg");
    expect(r.mime).toBe("image/jpeg");
  });

  it("PNG: 89 50 4E 47 0D 0A 1A 0A", () => {
    const r = sniffMagicBytes(
      bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    );
    expect(r.format).toBe("png");
    expect(r.mime).toBe("image/png");
  });

  it("WebP: RIFF....WEBP", () => {
    // R I F F (size) (size) (size) (size) W E B P
    const r = sniffMagicBytes(
      bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50),
    );
    expect(r.format).toBe("webp");
    expect(r.mime).toBe("image/webp");
  });

  it("AVIF: ....ftypavif", () => {
    const r = sniffMagicBytes(
      bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66),
    );
    expect(r.format).toBe("avif");
    expect(r.mime).toBe("image/avif");
  });

  it("AVIF: avis (image sequence) тоже считается AVIF", () => {
    const r = sniffMagicBytes(
      bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x73),
    );
    expect(r.format).toBe("avif");
  });
});

describe("sniffMagicBytes — негативные случаи", () => {
  it("HEIC (ftypheic) НЕ считается AVIF", () => {
    const r = sniffMagicBytes(
      bytes(0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63),
    );
    expect(r.format).toBe("unknown");
    expect(r.mime).toBeNull();
  });

  it("Произвольные ASCII-байты → unknown", () => {
    const r = sniffMagicBytes(bytes(0x41, 0x41, 0x41, 0x41, 0x41, 0x41));
    expect(r.format).toBe("unknown");
  });

  it("Буфер короче 12 байт → unknown (без падения)", () => {
    // bytes(...) дополняет до 16 — тут используем явно короткий.
    const short = new Uint8Array([0xff, 0xd8, 0xff]);
    const r = sniffMagicBytes(short);
    expect(r.format).toBe("unknown");
  });

  it("PDF (%PDF) → unknown", () => {
    const r = sniffMagicBytes(bytes(0x25, 0x50, 0x44, 0x46, 0x2d));
    expect(r.format).toBe("unknown");
  });
});

describe("isClaimedMimeMatchingBytes", () => {
  it("PNG bytes + claimed image/png → true", () => {
    const ok = isClaimedMimeMatchingBytes(
      bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
      "image/png",
    );
    expect(ok).toBe(true);
  });

  it("PNG bytes + claimed image/jpeg → false (mismatch)", () => {
    const ok = isClaimedMimeMatchingBytes(
      bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
      "image/jpeg",
    );
    expect(ok).toBe(false);
  });

  it("Произвольные байты + любой claimed → false", () => {
    const ok = isClaimedMimeMatchingBytes(
      bytes(0x58, 0x58, 0x58, 0x58),
      "image/jpeg",
    );
    expect(ok).toBe(false);
  });
});
