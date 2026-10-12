#!/usr/bin/env node
// зачем (координатор 12.10, п.3): склейка «основа + тинт акцентом» для показа владельцу ДО импорта в assets: для 3 тем × тёмное/светлое строки
// «было (слой Codex из assets) | стало (вырезано из основы)» у lessons и dialogs. Цвета — настоящие токены тем (ART_STYLE_FOR_CODEX/league_tokens.json:
// плитка = card, тинт = artAccentTint: accent в тёмном, accentBright в светлом — как ThemedArtLayers).
//   node scripts/accent_tint_sheet.mjs <папка вывода> [--themes graphite,ocean,grad_magma] [--level 1]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
if (!outDir) { console.error('Использование: node scripts/accent_tint_sheet.mjs <папка вывода> [--themes a,b,c] [--level 1]'); process.exit(2); }
const opt = (n, f) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const themes = opt('--themes', 'graphite,ocean,grad_magma').split(',');
const level = opt('--level', '1');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'ART_STYLE_FOR_CODEX', 'league_tokens.json'), 'utf8'));
const CELL = 300;
const PAD = 14;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const OLD = path.join(root, 'assets', 'images', 'v2art');
const NEW = path.join(root, 'ART_STYLE_FOR_CODEX', 'trials', 'S2_clay_accentfix');
fs.mkdirSync(outDir, { recursive: true });

async function layer(file, mode) {
  return sharp(file).resize(CELL - PAD * 2, CELL - PAD * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().toBuffer();
}
async function tinted(accentFile, tint) {
  const { data, info } = await sharp(accentFile).resize(CELL - PAD * 2, CELL - PAD * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = hex(tint);
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i += 1) { out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = data[i * 4 + 3]; }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
async function cell(mode, name, accentDir, t) {
  const tile = sharp({ create: { width: CELL, height: CELL, channels: 4, background: (() => { const [r, g, b] = hex(t.card); return { r, g, b, alpha: 1 }; })() } });
  const base = await layer(path.join(OLD, mode, `${name}.webp`), mode);
  const acc = await tinted(path.join(accentDir, mode, `${name}.accent.webp`), t.tint);
  return tile.composite([{ input: base, left: PAD, top: PAD }, { input: acc, left: PAD, top: PAD }]).png().toBuffer();
}

const rows = [];
for (const theme of themes) {
  for (const mode of ['dark', 'light']) {
    const t = tokens[theme]?.[mode]?.[level];
    if (!t) { console.warn(`[ACCENT-SHEET] нет токенов ${theme}/${mode}/${level}`); continue; }
    const cells = [];
    for (const name of ['lessons', 'dialogs']) {
      cells.push(await cell(mode, name, OLD, t)); // было
      cells.push(await cell(mode, name, NEW, t)); // стало
    }
    const [r, g, b] = hex(t.bgBottom);
    const row = await sharp({ create: { width: CELL * 4 + PAD * 5, height: CELL + PAD * 2, channels: 4, background: { r, g, b, alpha: 1 } } })
      .composite(cells.map((input, i) => ({ input, left: PAD + i * (CELL + PAD), top: PAD }))).png().toBuffer();
    rows.push(row);
  }
}
const W = CELL * 4 + PAD * 5;
const H = rows.length * (CELL + PAD * 2);
const sheet = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 20, g: 20, b: 24, alpha: 1 } } })
  .composite(rows.map((input, i) => ({ input, left: 0, top: i * (CELL + PAD * 2) }))).png().toBuffer();
const target = path.join(outDir, 'accent_tint_sheet.png');
fs.writeFileSync(target, sheet);
console.log(`[ACCENT-SHEET] ${target} (${themes.length} темы × тёмное/светлое; колонки: lessons было | стало, dialogs было | стало)`);
