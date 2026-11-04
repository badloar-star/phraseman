// Автоприменение результатов полного прохода (docs/work/classic_audit_full_2026_11_04/results_*.json) для зоны Теории: tiles / alternatives / target.
// ru/uk забирает Переводчик (docs/work/classic_audit_apply_results.mjs). Записи складываются в СЛОЙ scripts/classic_audit_layer.json; генератор
// scripts/classic_course_pack.mjs читает слой и применяет правки при каждой пересборке (идемпотентно: правка соблазна делается, только если
// старый соблазн реально стоит в плитке; новый соблазн проверяется — не должен собирать вторую верную фразу ни у этой фразы, ни в словаре целевых фраз курса).
// Запуск: node scripts/classic_audit_apply.mjs   →  затем node scripts/classic_course_pack.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// зачем: результаты полного прохода + контрольного аудита (sample4) — один формат, одни проверки
const DIRS = ['classic_audit_full_2026_11_04', 'classic_audit_sample4_2026_11_04'].map((d) => join(ROOT, 'docs', 'work', d));
const LAYER = join(ROOT, 'scripts', 'classic_audit_layer.json');
const layer = existsSync(LAYER) ? JSON.parse(readFileSync(LAYER, 'utf8')) : { tiles: {}, alt: {}, target: {} };
const stats = { files: 0, records: 0, tiles: 0, altAdd: 0, altRemove: 0, target: 0, skippedField: 0, badShape: 0 };
// id в слое: "<lang>:<LL>:<PP>" независимо от формата ("en-classic-r1:01.03", "en:01:03", "es:11:49")
const keyOf = (id) => { const m = /^([a-z]{2})(?:-classic-r1)?[:.](\d\d)[:.](\d\d)$/.exec(id); return m ? `${m[1]}:${m[2]}:${m[3]}` : null; };
const files = DIRS.flatMap((d) => existsSync(d) ? readdirSync(d).filter((f) => /^results_.*\.json$/.test(f)).sort().map((f) => join(d, f)) : []);
for (const f of files) {
  stats.files++;
  let arr;
  try { arr = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.error(`не читается ${f}: ${e.message}`); stats.badShape++; continue; }
  if (!Array.isArray(arr)) { stats.badShape++; continue; }
  for (const rec of arr) {
    stats.records++;
    const key = rec && typeof rec.id === 'string' ? keyOf(rec.id) : null;
    if (!key || typeof rec.field !== 'string') { stats.badShape++; continue; }
    if (rec.field === 'tiles' && rec.fix && typeof rec.fix === 'object' && Number.isInteger(rec.fix.position) && rec.fix.replace_distractor && rec.fix.with) {
      (layer.tiles[key] ??= []);
      if (!layer.tiles[key].some((t) => t.position === rec.fix.position && t.from === rec.fix.replace_distractor && t.with === rec.fix.with)) layer.tiles[key].push({ position: rec.fix.position, from: String(rec.fix.replace_distractor), with: String(rec.fix.with) });
      stats.tiles++;
    } else if (rec.field === 'alternatives' && rec.fix && typeof rec.fix === 'object') {
      const e = (layer.alt[key] ??= { add: [], remove: [] });
      for (const a of rec.fix.add ?? []) if (typeof a === 'string' && a.trim() && !e.add.includes(a)) { e.add.push(a); stats.altAdd++; }
      for (const r of rec.fix.remove ?? []) if (typeof r === 'string' && r.trim() && !e.remove.includes(r)) { e.remove.push(r); stats.altRemove++; }
    } else if (rec.field === 'target' && typeof rec.fix === 'string' && rec.fix.trim()) {
      layer.target[key] = rec.fix.trim();
      stats.target++;
    } else if (rec.field !== 'ru' && rec.field !== 'uk') {
      stats.skippedField++;
    }
  }
}
writeFileSync(LAYER, JSON.stringify(layer, null, 1) + '\n');
console.log(JSON.stringify(stats));
