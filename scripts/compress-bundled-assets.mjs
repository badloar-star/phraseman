#!/usr/bin/env node
// Compress images that are ACTUALLY bundled into the app binary.
//
// зачем: вес бандла определяется не папкой assets/ (669 MB, большая часть — исходники
// DALL-E, исключённые через .easignore), а списком expo.assetPatternsToBeBundled в
// app.json. Этот скрипт разрешает те же glob-паттерны и жмёт только то, что реально
// уезжает в стор — остальное трогать нельзя, это регенерационные источники.
//
// Два независимых рычага экономии:
//   1) resize — исходники нарисованы в ~1300px, а рендерятся максимум в 128pt
//      (=384px на 3x). Всё, что длинной стороной больше MAX_LONG_SIDE, ужимается.
//   2) re-encode — перекодирование webp с единым качеством.
// Файл перезаписывается ТОЛЬКО если стал меньше: пережатие уже-оптимального webp
// иногда даёт больший файл, и молча раздувать бандл нельзя.
//
// Usage:
//   node scripts/compress-bundled-assets.mjs           # dry-run, только отчёт
//   node scripts/compress-bundled-assets.mjs --write   # применить

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

// Иконочная графика: 512px хватает с запасом для 3x-экранов при рендере до ~170pt.
const MAX_LONG_SIDE = 512;
const QUALITY = 82;
const ALPHA_QUALITY = 90;
// Не трогаем файлы, где выигрыш заведомо в пределах шума.
const MIN_SAVING_BYTES = 1024;

// зачем: часть ассетов защищена контрактными тестами, которые требуют ТОЧНЫХ
// размеров (атласы, спрайты, иконки под фиксированную сетку). Ресайз таких файлов
// валит тесты и ломает вёрстку, поэтому здесь они пережимаются только по качеству,
// без изменения геометрии. Список сверен с tests/*.test.ts, где есть width).toBe(N):
//   league-v6-icons — tests/league_icon_assets.test.ts (384x384)
//   weekly_boon_icons                 — tests/boon_icon_assets.test.ts (256x256)
//   weekly_compass_icons              — tests/weekly_bonus_theme_assets.test.ts
const FIXED_GEOMETRY_DIRS = [
  'assets/images/levels/league-v6-icons/',
  'assets/images/weekly_boon_icons/',
  'assets/images/weekly_compass_icons/',
];
const hasFixedGeometry = (rel) => FIXED_GEOMETRY_DIRS.some((d) => rel.startsWith(d));

function findPatterns(o) {
  if (!o || typeof o !== 'object') return null;
  if (Array.isArray(o.assetPatternsToBeBundled)) return o.assetPatternsToBeBundled;
  for (const k of Object.keys(o)) {
    const r = findPatterns(o[k]);
    if (r) return r;
  }
  return null;
}

function globToRegExp(pattern) {
  let s = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*') {
      if (pattern[i + 1] === '*') {
        if (pattern[i + 2] === '/') { s += '(?:[^/]+/)*'; i += 2; }
        else { s += '.*'; i += 1; }
      } else s += '[^/]*';
    } else if ('.+^${}()|[]\\?'.includes(c)) s += '\\' + c;
    else s += c;
  }
  return new RegExp('^' + s + '$');
}

function walk(rel, acc) {
  const abs = path.join(ROOT, rel);
  let entries;
  try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const child = rel + '/' + e.name;
    if (e.isDirectory()) walk(child, acc);
    else acc.push(child);
  }
  return acc;
}

const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const patterns = (findPatterns(appJson) || []).filter((p) => !p.startsWith('node_modules'));
if (!patterns.length) {
  console.error('assetPatternsToBeBundled not found in app.json — aborting.');
  process.exit(1);
}

const regexes = patterns.map(globToRegExp);
const bundled = walk('assets', []).filter((f) => regexes.some((r) => r.test(f)));
const images = bundled.filter((f) => /\.(webp|png|jpe?g)$/i.test(f));

const MB = (v) => (v / 1048576).toFixed(2);
const KB = (v) => (v / 1024).toFixed(0);

let before = 0;
let after = 0;
const changes = [];
const locked = [];

for (const rel of images) {
  const abs = path.join(ROOT, rel);
  const original = fs.statSync(abs).size;
  before += original;

  // зачем: читаем файл в буфер и работаем с ним, а не с путём. sharp при работе
  // по пути держит дескриптор открытым (lazy-load), и на Windows последующая
  // запись в тот же файл падает с UNKNOWN/EBUSY.
  const input = fs.readFileSync(abs);

  let meta;
  try { meta = await sharp(input).metadata(); } catch { after += original; continue; }

  const longSide = Math.max(meta.width || 0, meta.height || 0);
  const needsResize = longSide > MAX_LONG_SIDE && !hasFixedGeometry(rel);

  let pipeline = sharp(input);
  if (needsResize) {
    pipeline = pipeline.resize({
      width: (meta.width || 0) >= (meta.height || 0) ? MAX_LONG_SIDE : null,
      height: (meta.height || 0) > (meta.width || 0) ? MAX_LONG_SIDE : null,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let buf;
  try {
    buf = await pipeline
      .webp({ quality: QUALITY, alphaQuality: ALPHA_QUALITY, effort: 6 })
      .toBuffer();
  } catch {
    after += original;
    continue;
  }

  // Никогда не увеличиваем файл и не переписываем ради пары байт.
  if (buf.length >= original - MIN_SAVING_BYTES) {
    after += original;
    continue;
  }

  const isWebp = /\.webp$/i.test(rel);

  if (WRITE && isWebp) {
    // зачем: на Windows файл может быть заблокирован параллельным процессом
    // (другая сессия, антивирус, Metro). Пропускаем такой файл, но НЕ роняем весь
    // прогон — иначе часть ассетов остаётся несжатой без явного отчёта.
    try {
      fs.writeFileSync(abs, buf);
    } catch (e) {
      locked.push({ rel, reason: e.code || 'unknown' });
      after += original;
      continue;
    }
  }

  after += buf.length;
  changes.push({ rel, original, next: buf.length, needsResize, isWebp });
}

changes.sort((a, b) => (b.original - b.next) - (a.original - a.next));

console.log(`bundled images: ${images.length}`);
console.log(`${WRITE ? 'compressed' : 'candidates with real saving'}: ${changes.length}`);
console.log(`before ${MB(before)} MB -> after ${MB(after)} MB  (saved ${MB(before - after)} MB, ${((1 - after / before) * 100).toFixed(1)}%)`);
console.log('--- top savings ---');
for (const c of changes.slice(0, 30)) {
  console.log(`-${KB(c.original - c.next)} KB  ${KB(c.original)}→${KB(c.next)}${c.needsResize ? ' [resize]' : ''}  ${c.rel}`);
}

const nonWebp = changes.filter((c) => !c.isWebp);
if (nonWebp.length) {
  console.log(`\nNOTE: ${nonWebp.length} non-webp file(s) skipped on write (format change needs a code-side require() update):`);
  nonWebp.forEach((c) => console.log('  ' + c.rel));
}
if (locked.length) {
  console.log(`\nWARNING: ${locked.length} file(s) locked by another process and left UNCOMPRESSED:`);
  locked.forEach((l) => console.log(`  ${l.rel} (${l.reason})`));
  console.log('Close other processes touching assets/ and re-run to finish them.');
}
if (!WRITE) console.log('\nDRY RUN — re-run with --write to apply.');
