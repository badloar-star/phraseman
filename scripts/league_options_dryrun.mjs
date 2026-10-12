#!/usr/bin/env node
// зачем (координатор 12.10): сухой прогон сторожа [THEMED-ART-GUARD] по 20 вариантам значка лиги «Глина» (ART_STYLE_FOR_CODEX/trials/S2_clay/{dark,light}/league_option_NN_*.webp
// и .accent.webp). В assets НИЧЕГО не импортируется: только отчёт — размер, сжимаемость до лимита, альфа в углах, доля белого в слое accent.
//   node scripts/league_options_dryrun.mjs [--json путь]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ART_MAX_BYTES, checkArtFile } from './gen_themed_art_assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'ART_STYLE_FOR_CODEX', 'trials', 'S2_clay');
const QUALITIES = [85, 80, 74, 68, 62, 56, 50, 44];
const LOG = '[LEAGUE-DRYRUN]';
const jsonOut = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

async function fitQuality(file) {
  const bytes = fs.statSync(file).size;
  if (bytes <= ART_MAX_BYTES) return { fits: true, quality: null };
  const original = fs.readFileSync(file);
  for (const quality of QUALITIES) {
    const buf = await sharp(original).webp({ quality, alphaQuality: 100, effort: 5 }).toBuffer();
    if (buf.length <= ART_MAX_BYTES) return { fits: true, quality, bytesAfter: buf.length };
  }
  return { fits: false, quality: null };
}

async function accentStats(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const total = info.width * info.height;
  let visible = 0;
  let white = 0;
  for (let i = 0; i < total; i += 1) {
    if (data[i * 4 + 3] > 24) { visible += 1; if (data[i * 4] > 235 && data[i * 4 + 1] > 235 && data[i * 4 + 2] > 235) white += 1; }
  }
  return { visiblePct: +((visible / total) * 100).toFixed(1), whitePct: visible ? +((white / visible) * 100).toFixed(1) : 0 };
}

const rows = [];
let failed = 0;
for (const brightness of ['dark', 'light']) {
  const dir = path.join(base, brightness);
  const names = fs.readdirSync(dir).filter((f) => /^league_option_\d+_[a-z0-9]+\.webp$/.test(f)).sort();
  for (const file of names) {
    const full = path.join(dir, file);
    const accentFile = full.replace(/\.webp$/, '.accent.webp');
    const verdict = await checkArtFile(full);
    const accentVerdict = fs.existsSync(accentFile) ? await checkArtFile(accentFile) : { ok: false, reason: 'нет слоя .accent' };
    const meta = await sharp(full).metadata();
    const fit = verdict.ok ? { fits: true, quality: null } : await fitQuality(full);
    const acc = fs.existsSync(accentFile) ? await accentStats(accentFile) : null;
    const accentUsable = !!acc && acc.visiblePct > 0.5;
    const ok = (verdict.ok || fit.fits) && accentVerdict.ok && accentUsable;
    if (!ok) failed += 1;
    const row = {
      brightness, file, bytes: fs.statSync(full).size, width: meta.width, height: meta.height, guard: verdict.reason, guardOk: verdict.ok,
      compressTo400: fit, accent: { guard: accentVerdict.reason, guardOk: accentVerdict.ok, ...acc }, ok,
    };
    rows.push(row);
    console.log(`${LOG} ${brightness}/${file} ${Math.round(row.bytes / 1024)} КБ ${meta.width}x${meta.height} | сторож: ${verdict.ok ? 'ок' : 'ОТКАЗ ' + verdict.reason}${!verdict.ok && fit.fits ? ` (сжимается до ≤400 КБ при q=${fit.quality})` : ''} | accent: ${accentVerdict.ok ? 'ок' : 'ОТКАЗ ' + accentVerdict.reason}, видимо ${acc?.visiblePct}%, белого ${acc?.whitePct}%`);
  }
}
console.log(`${LOG} итого ${rows.length} файлов основы, не прошло: ${failed}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
process.exitCode = 0;
