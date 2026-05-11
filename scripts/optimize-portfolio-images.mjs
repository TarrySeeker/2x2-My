#!/usr/bin/env node
/**
 * optimize-portfolio-images.mjs
 *
 * Конвертирует тяжёлые исходники портфолио (PNG/JPG в `public/port/`)
 * в `.webp` (quality 82, max 1920px по широкой стороне).
 *
 * Зачем. До оптимизации /public/port/ весит ~50 MB (отдельные PNG —
 * до 11 MB), на мобильном 4G главная и /portfolio грузятся 5–10 секунд,
 * пользователи отваливаются. WebP с q=82 даёт визуально неотличимое
 * качество при размере в 8–15 раз меньше.
 *
 * Поведение:
 *   1. Рекурсивно НЕ ходит — только верхний уровень `public/port/`.
 *   2. Игнорирует `_archive/` (туда мы складываем оригиналы).
 *   3. Для каждого .png/.jpg/.jpeg создаёт `<имя>.webp` рядом.
 *   4. Resize до 1920px по широкой стороне (без апскейла).
 *   5. Оригиналы перемещает в `public/port/_archive/` (на случай отката).
 *      Папка _archive в .gitignore — на VPS оригиналы не попадут.
 *   6. Идемпотентно: если .webp уже есть и новее исходника — пропуск.
 *
 * Запуск:
 *   node scripts/optimize-portfolio-images.mjs
 *   node scripts/optimize-portfolio-images.mjs --dry-run
 */

import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync, renameSync, existsSync } from 'node:fs';
import { resolve, join, parse } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC_DIR = resolve(ROOT, 'public', 'port');
const ARCHIVE_DIR = resolve(SRC_DIR, '_archive');

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

const DRY_RUN = process.argv.includes('--dry-run');

const SUPPORTED_EXTS = new Set(['.png', '.jpg', '.jpeg']);

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

if (!existsSync(SRC_DIR)) {
  console.error(`[err] not found: ${SRC_DIR}`);
  process.exit(1);
}

if (!DRY_RUN && !existsSync(ARCHIVE_DIR)) {
  mkdirSync(ARCHIVE_DIR, { recursive: true });
}

const entries = readdirSync(SRC_DIR);
let converted = 0;
let skipped = 0;
let bytesIn = 0;
let bytesOut = 0;

for (const name of entries) {
  const fullPath = join(SRC_DIR, name);
  const st = statSync(fullPath);
  if (st.isDirectory()) continue; // _archive и прочее

  const { ext, name: base } = parse(name);
  if (!SUPPORTED_EXTS.has(ext.toLowerCase())) {
    console.log(`[skip] ${name} — неподдерживаемое расширение`);
    skipped++;
    continue;
  }

  const outPath = join(SRC_DIR, `${base}.webp`);

  // Идемпотентность: если .webp существует и новее исходника — пропуск.
  if (existsSync(outPath)) {
    const outSt = statSync(outPath);
    if (outSt.mtimeMs >= st.mtimeMs) {
      console.log(`[skip] ${name} — уже есть актуальный ${base}.webp (${fmtBytes(outSt.size)})`);
      skipped++;
      continue;
    }
  }

  try {
    const meta = await sharp(fullPath).metadata();
    const needsResize = (meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION;

    let pipeline = sharp(fullPath);
    if (needsResize) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (DRY_RUN) {
      console.log(`[dry] ${name} (${meta.width}x${meta.height}, ${fmtBytes(st.size)}) → ${base}.webp${needsResize ? ' [resize]' : ''}`);
      continue;
    }

    await pipeline.webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(outPath);

    const newSt = statSync(outPath);
    const newMeta = await sharp(outPath).metadata();
    const ratio = ((st.size - newSt.size) / st.size * 100).toFixed(1);

    console.log(
      `[ok]  ${name} ${meta.width}x${meta.height} ${fmtBytes(st.size)} → ` +
      `${base}.webp ${newMeta.width}x${newMeta.height} ${fmtBytes(newSt.size)} (-${ratio}%)`
    );

    bytesIn += st.size;
    bytesOut += newSt.size;
    converted++;

    // Оригинал → в _archive/
    const archivedPath = join(ARCHIVE_DIR, name);
    renameSync(fullPath, archivedPath);
  } catch (err) {
    console.error(`[err] ${name}:`, err.message);
  }
}

console.log('\n=== Итог ===');
console.log(`Конвертировано: ${converted}`);
console.log(`Пропущено:      ${skipped}`);
if (converted > 0) {
  console.log(`Было:           ${fmtBytes(bytesIn)}`);
  console.log(`Стало:          ${fmtBytes(bytesOut)}`);
  console.log(`Экономия:       ${fmtBytes(bytesIn - bytesOut)} (${((bytesIn - bytesOut) / bytesIn * 100).toFixed(1)}%)`);
}
if (DRY_RUN) console.log('\n(dry-run, файлы не изменены)');
