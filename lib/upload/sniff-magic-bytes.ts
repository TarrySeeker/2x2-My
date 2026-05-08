/**
 * Magic-byte sniff для загружаемых файлов.
 *
 * MIME-тип, который браузер пишет в `file.type`, выставляется по
 * расширению и легко подделывается через переименование (`.exe → .jpg`).
 * Чтобы реально знать, что в байтах — лежит ли картинка ожидаемого
 * формата — мы сверяем первые байты с известными сигнатурами
 * (грабля #17 в LESSONS_LEARNED.md).
 *
 * Поддерживаемые форматы:
 *  - JPEG: FF D8 FF
 *  - PNG:  89 50 4E 47 0D 0A 1A 0A
 *  - WebP: RIFF....WEBP   (offset 0..3 = "RIFF", offset 8..11 = "WEBP")
 *  - AVIF: ....ftypavif   (offset 4..7 = "ftyp", offset 8..11 = "avif"
 *                          либо один из совместимых major brands)
 *
 * Не поддерживаем:
 *  - SVG — это XML, лежит в текстовом виде, проверка bytes тут
 *    бесполезна; SVG в принципе запрещён в whitelist (см. route.ts).
 *  - GIF — нам не нужен.
 */

export type SniffedFormat = "jpeg" | "png" | "webp" | "avif" | "unknown";

export type SniffResult = {
  format: SniffedFormat;
  mime: "image/jpeg" | "image/png" | "image/webp" | "image/avif" | null;
};

const TEXT_DECODER = new TextDecoder("ascii");

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return TEXT_DECODER.decode(bytes.subarray(start, end));
}

/**
 * Сверяет первые байты буфера с известными сигнатурами картинок.
 *
 * Минимальный нужный размер: 12 байт (самый «дальний» оффсет — у WebP
 * и AVIF проверяем байты 8..11). Если буфер короче — возвращаем
 * unknown, не падаем.
 */
export function sniffMagicBytes(bytes: Uint8Array): SniffResult {
  if (bytes.length < 12) {
    return { format: "unknown", mime: null };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { format: "jpeg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { format: "png", mime: "image/png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") {
    return { format: "webp", mime: "image/webp" };
  }

  // AVIF: offset 4..7 = "ftyp", offset 8..11 = "avif" (или совместимый
  // major brand: avis, mif1, msf1, heic, heix). Допускаем только avif/avis,
  // остальные брэнды — это HEIC и т.п., их мы НЕ принимаем.
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (brand === "avif" || brand === "avis") {
      return { format: "avif", mime: "image/avif" };
    }
  }

  return { format: "unknown", mime: null };
}

/**
 * Проверяет, что заявленный браузером MIME (file.type) совпадает с
 * реальным форматом по байтам.
 *
 * Возвращает true, если файл реально является картинкой одного из
 * поддерживаемых форматов И этот формат соответствует claimedMime.
 */
export function isClaimedMimeMatchingBytes(
  bytes: Uint8Array,
  claimedMime: string,
): boolean {
  const sniff = sniffMagicBytes(bytes);
  if (sniff.mime === null) return false;
  return sniff.mime === claimedMime;
}
