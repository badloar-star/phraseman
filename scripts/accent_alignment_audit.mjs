#!/usr/bin/env node
// зачем (координатор 12.10): аудит совпадения .accent с основой по ВСЕМ парам папки (по умолчанию assets/images/v2art).
//   node scripts/accent_alignment_audit.mjs [папка с dark/ и light/] [--only имя,имя]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accentAlignment } from './accent_alignment.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--only');
const base = path.resolve(args[0] ?? path.join(root, 'assets', 'images', 'v2art'));
const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx >= 0 ? process.argv[onlyIdx + 1].split(',') : null;
let bad = 0;
let total = 0;
for (const mode of ['dark', 'light']) {
  const dir = path.join(base, mode);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    const m = f.match(/^([a-z0-9_]+)\.accent\.webp$/);
    if (!m || (only && !only.includes(m[1]))) continue;
    const basePath = path.join(dir, `${m[1]}.webp`);
    if (!fs.existsSync(basePath)) { console.log(`[ACCENT-ALIGN] ${mode}/${m[1]}: нет основы`); bad += 1; continue; }
    total += 1;
    const v = await accentAlignment(basePath, path.join(dir, f));
    if (!v.ok) bad += 1;
    console.log(`[ACCENT-ALIGN] ${v.ok ? 'ок   ' : 'ОТКАЗ'} ${mode}/${m[1]}: на основе ${v.onOpaquePct} %, контур по краю ${v.edgeAlignedPct} %, перепадов внутри ${v.interiorEdgePct} % (точек контура ${v.outlinePts})`);
  }
}
console.log(`[ACCENT-ALIGN] итого пар: ${total}, не прошло: ${bad}`);
