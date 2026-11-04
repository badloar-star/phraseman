// зачем (Переводчик 04.11): применяет результаты полного прохода (docs/work/classic_audit_full_2026_11_04/results_*.json)
// в слой фиксов. Берёт ТОЛЬКО записи field=ru|uk; fix — полная фраза. Фрагменты и пустые пропускаются (как обрезанные
// поля, см. запись про «Зворотний» 04.11). target/tiles/alternatives сюда не пишем — это зона Теории.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const DIR = 'docs/work/classic_audit_full_2026_11_04';
const OUT = 'docs/work/classic_translation_fixes_2026_11_04.json';
const out = JSON.parse(readFileSync(OUT, 'utf8'));
const stats = { files: 0, records: 0, applied: 0, skippedField: 0, skippedFragment: 0, skippedEmpty: 0, badShape: 0 };
const isFragment = (s) => s.trim().split(/\s+/).length < 3 || s.trim().length < 12;
// зачем: по одному языку за прогон — каждый языковой коммит читаем отдельно (координатор: коммит по языкам)
const LANG = process.argv[2] ?? '';
const files = readdirSync(DIR).filter((f) => /^results_.*\.json$/.test(f) && (!LANG || f.startsWith(`results_${LANG}_`))).sort();
for (const f of files) {
  stats.files++;
  const arr = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  if (!Array.isArray(arr)) { stats.badShape++; continue; }
  for (const rec of arr) {
    stats.records++;
    if (!rec || typeof rec.id !== 'string' || typeof rec.field !== 'string') { stats.badShape++; continue; }
    if (rec.field !== 'ru' && rec.field !== 'uk') { stats.skippedField++; continue; }
    const fix = typeof rec.fix === 'string' ? rec.fix.trim() : '';
    if (!fix) { stats.skippedEmpty++; continue; }
    if (isFragment(fix)) { stats.skippedFragment++; continue; }
    const key = rec.id.replace(':', '.').replace(/^([a-z-]+):(\d{2})[.:](\d{2})$/, '$1:$2.$3');
    out[key] = { ...(out[key] ?? {}), [rec.field]: fix, reason: `полный проход ${f}: ${String(rec.problem ?? '').slice(0, 160)}` };
    stats.applied++;
  }
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(stats));
