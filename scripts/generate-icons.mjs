#!/usr/bin/env node
/**
 * Одноразовый генератор favicon/apple-icon из app/icon.svg.
 * Запуск: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const svg = readFileSync(resolve(root, 'app/icon.svg'));

async function makePng(size, outRelPath) {
  await sharp(svg)
    .resize(size, size)
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(resolve(root, outRelPath));
  console.log(`✓ ${outRelPath} (${size}x${size})`);
}

// Apple touch icon (iOS home screen) — 180x180
await makePng(180, 'app/apple-icon.png');

// ICO-fallback: sharp сам ICO не умеет, но можно отдать 32x32 PNG как favicon.ico —
// большинство браузеров принимают. Для pixel-perfect multi-size ico нужен png-to-ico.
const ico32 = await sharp(svg).resize(32, 32).png().toBuffer();
writeFileSync(resolve(root, 'app/favicon.ico'), ico32);
console.log('✓ app/favicon.ico (32x32 PNG-in-ICO)');

// Android / OpenGraph
await makePng(192, 'public/android-chrome-192x192.png');
await makePng(512, 'public/android-chrome-512x512.png');

console.log('Done.');
