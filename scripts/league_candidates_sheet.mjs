#!/usr/bin/env node
// зачем (координатор 12.10): склейка кандидатов значка лиги для выбора владельцем/координатором: читаемость на 64 и 96 px, тёмное/светлое, 3 темы.
// Основа и слой .accent берутся из ART_STYLE_FOR_CODEX/trials/S2_clay/{dark,light}/league_option_NN_<имя>[.accent].webp; цвета — настоящие токены тем (league_tokens.json),
// слой .accent красится как в ThemedArtLayers (artAccentTint). Без параметров — все 20 в одну таблицу (для первичного отбора).
//   node scripts/league_candidates_sheet.mjs <папка вывода> [--pick 07,08,10] [--themes graphite,rose,grad_magma] [--name league_candidates]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
if (!outDir) { console.error('Использование: node scripts/league_candidates_sheet.mjs <папка вывода> [--pick 07,08] [--themes a,b,c] [--name имя]'); process.exit(2); }
const opt = (n, f) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const trials = path.join(root, 'ART_STYLE_FOR_CODEX', 'trials', 'S2_clay');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'ART_STYLE_FOR_CODEX', 'league_tokens.json'), 'utf8'));
const files = fs.readdirSync(path.join(trials, 'dark')).filter((f) => /^league_option_\d+_[a-z0-9]+\.webp$/.test(f)).sort();
const pick = opt('--pick', null)?.split(',');
const variants = files.map((f) => ({ n: f.match(/_(\d+)_/)[1], name: f.match(/_\d+_([a-z0-9]+)\.webp/)[1], base: f.replace('.webp', '') })).filter((v) => !pick || pick.includes(v.n));
const themes = opt('--themes', 'graphite,rose,grad_magma').split(',');
const level = '1';
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
fs.mkdirSync(outDir, { recursive: true });

async function icon(variant, mode, size, tint) {
  const base = await sharp(path.join(trials, mode, `${variant.base}.webp`)).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().png().toBuffer();
  const { data, info } = await sharp(path.join(trials, mode, `${variant.base}.accent.webp`)).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [r, g, b] = hex(tint);
  const o = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i += 1) { o[i * 4] = r; o[i * 4 + 1] = g; o[i * 4 + 2] = b; o[i * 4 + 3] = data[i * 4 + 3]; }
  const acc = await sharp(o, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  return sharp(base).composite([{ input: acc }]).png().toBuffer();
}

const PAD = 12;
const SIZES = [96, 64];
const CELL_W = SIZES[0] + SIZES[1] + PAD * 3;
const CELL_H = SIZES[0] + PAD * 2 + 20;
const rows = [];
for (const theme of themes) {
  for (const mode of ['dark', 'light']) {
    const t = tokens[theme]?.[mode]?.[level];
    if (!t) { console.warn(`[LEAGUE-SHEET] нет токенов ${theme}/${mode}/${level}`); continue; }
    const cells = [];
    for (const v of variants) {
      const [r, g, b] = hex(t.card);
      const tile = sharp({ create: { width: CELL_W, height: CELL_H, channels: 4, background: { r, g, b, alpha: 1 } } });
      const big = await icon(v, mode, SIZES[0], t.tint);
      const small = await icon(v, mode, SIZES[1], t.tint);
      const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_W}" height="20"><text x="${PAD}" y="15" font-family="Arial" font-size="13" fill="${t.text}" opacity="0.8">${v.n} ${v.name}</text></svg>`);
      cells.push(await tile.composite([{ input: big, left: PAD, top: PAD }, { input: small, left: PAD * 2 + SIZES[0], top: PAD + (SIZES[0] - SIZES[1]) }, { input: label, left: 0, top: PAD + SIZES[0] + 4 }]).png().toBuffer());
    }
    const [br, bg, bb] = hex(t.bgBottom);
    const perRow = Math.min(variants.length, 5);
    const lines = Math.ceil(variants.length / perRow);
    const W = perRow * CELL_W + (perRow + 1) * PAD;
    const H = lines * CELL_H + (lines + 1) * PAD;
    rows.push({ W, H, buf: await sharp({ create: { width: W, height: H, channels: 4, background: { r: br, g: bg, b: bb, alpha: 1 } } })
      .composite(cells.map((input, i) => ({ input, left: PAD + (i % perRow) * (CELL_W + PAD), top: PAD + Math.floor(i / perRow) * (CELL_H + PAD) }))).png().toBuffer() });
  }
}
const W = Math.max(...rows.map((r) => r.W));
const H = rows.reduce((a, r) => a + r.H, 0);
let y = 0;
const sheet = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 20, g: 20, b: 24, alpha: 1 } } }).composite(rows.map((r) => { const item = { input: r.buf, left: 0, top: y }; y += r.H; return item; })).png().toBuffer();
const target = path.join(outDir, `${opt('--name', 'league_candidates')}.png`);
fs.writeFileSync(target, sheet);
console.log(`[LEAGUE-SHEET] ${target}: ${variants.length} вариантов × ${themes.length} темы × тёмное/светлое (96 и 64 px)`);
