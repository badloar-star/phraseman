#!/usr/bin/env node
// font_weight_usage.mjs — сколько мест в приложении просят каждый fontWeight и во что он превращается (координатор 14.10, типографика).
// Запуск: node scripts/font_weight_usage.mjs [--top=N]. Только чтение исходников; тест tests/font_weights_contract.test.ts держит правду о зарегистрированных весах.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const REGISTERED = [400, 600, 700, 900];
const top = Number((process.argv.find((a) => a.startsWith('--top=')) ?? '--top=8').split('=')[1]);
const resolveWeight = (w) => REGISTERED.reduce((best, r) => (Math.abs(r - w) < Math.abs(best - w) ? r : best), REGISTERED[0]);

const counts = new Map();
const perFile = new Map();
function walk(dir) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (!/node_modules|^\.|\.expo|graphify-out/.test(e.name)) walk(rel);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(/fontWeight:\s*['"]?(\d{3}|bold|normal)['"]?/g)) {
        const w = m[1] === 'bold' ? 700 : m[1] === 'normal' ? 400 : Number(m[1]);
        counts.set(w, (counts.get(w) ?? 0) + 1);
        const key = `${w}`;
        const byFile = perFile.get(key) ?? new Map();
        byFile.set(rel, (byFile.get(rel) ?? 0) + 1);
        perFile.set(key, byFile);
      }
    }
  }
}
for (const d of ['app', 'components', 'constants', 'modules', 'hooks']) walk(d);

const total = [...counts.values()].reduce((a, b) => a + b, 0);
console.log(`[FONT-WEIGHT-USAGE] зарегистрировано: ${REGISTERED.join(', ')}; всего объявлений fontWeight: ${total}`);
for (const [w, n] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
  const got = resolveWeight(w);
  console.log(`  ${w} → рисуется ${got}${got === w ? '' : '  ← РАСХОЖДЕНИЕ'}: ${n} мест (${((n / total) * 100).toFixed(1)} %)`);
}
for (const w of ['800', '500']) {
  const byFile = perFile.get(w);
  if (!byFile) continue;
  console.log(`  топ файлов с ${w}:`);
  for (const [f, n] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`    ${n}  ${f}`);
}
