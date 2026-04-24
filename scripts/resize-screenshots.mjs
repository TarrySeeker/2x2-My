#!/usr/bin/env node
/**
 * Ресайз full-page скриншотов — максимум 1900px по любой стороне,
 * чтобы влезать в лимит 2000px Claude API для анализа.
 */
import sharp from 'sharp';
import { readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = resolve(ROOT, process.env.RESIZE_DIR || 'qa-screenshots');
const MAX = 1900;

const browsers = readdirSync(SRC);
let total = 0;

for (const browser of browsers) {
  const dir = join(SRC, browser);
  if (!statSync(dir).isDirectory()) continue;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.png')) continue;
    const path = join(dir, file);
    const img = sharp(path);
    const meta = await img.metadata();
    if (meta.width <= MAX && meta.height <= MAX) {
      console.log(`[skip] ${browser}/${file} (${meta.width}x${meta.height})`);
      continue;
    }
    const buf = await sharp(path)
      .resize(MAX, MAX, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    await sharp(buf).toFile(path);
    const newMeta = await sharp(path).metadata();
    console.log(`[done] ${browser}/${file}: ${meta.width}x${meta.height} → ${newMeta.width}x${newMeta.height}`);
    total++;
  }
}
console.log(`\nResized: ${total} files.`);
