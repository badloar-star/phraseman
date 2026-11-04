// зачем (Переводчик 04.11): применяет строки «ru → …» / «uk → …» из блокеров аудита №5 в слой фиксов.
// Числа и порядок фраз не меняются; target/плитки не трогаются (это зона Теории).
import { readFileSync, writeFileSync } from 'node:fs';
const SRC = 'docs/work/classic_audit5_sample3_blockers_2026_11_04.md';
const OUT = 'docs/work/classic_translation_fixes_2026_11_04.json';
const out = JSON.parse(readFileSync(OUT, 'utf8'));
let lang = null;
let n = 0;
for (const raw of readFileSync(SRC, 'utf8').split('\n')) {
  const h = /^## (\w+)/.exec(raw);
  if (h) { lang = h[1].toLowerCase(); continue; }
  const m = /^- (\d{2}[:.]\d{2})/.exec(raw);
  if (!m || !lang) continue;
  const id = `${lang}:${m[1].replace(':', '.')}`;
  const entry = {};
  for (const part of raw.split(/;\s*|\|\s*/)) {
    const k = /^(ru|uk)\s*→\s*«(.+)»\s*$/.exec(part.trim());
    if (k) entry[k[1]] = k[2];
  }
  if (!entry.ru && !entry.uk) continue;
  out[id] = { ...(out[id] ?? {}), ...entry, reason: 'аудит №5 выборка 3 (04.11): блокер ru/uk' };
  n++;
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log('applied', n);
