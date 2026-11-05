// Сводка результатов аудита: язык × тип × число + процент фраз с ошибкой (ошибок/1600).
// Запуск: node scripts/classic_audit_summary.mjs [папка относительно docs/work, по умолчанию classic_audit_full2_2026_11_05]
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(ROOT, 'docs', 'work', process.argv[2] ?? 'classic_audit_full2_2026_11_05');
const langs = ['en', 'es', 'fr', 'de', 'it'];
const rows = {}; const phrases = {}; const missing = [];
for (const l of langs) { rows[l] = {}; phrases[l] = new Set(); }
for (const f of readdirSync(dir).filter((x) => /^chunk_[a-z]{2}_\d+\.json$/.test(x))) {
  const [, l, n] = /^chunk_([a-z]{2})_(\d+)\.json$/.exec(f);
  try {
    const arr = JSON.parse(readFileSync(join(dir, `results_${l}_${n}.json`), 'utf8'));
    for (const r of arr) {
      const t = `${r.type}/${r.field}`;
      rows[l][t] = (rows[l][t] ?? 0) + 1;
      phrases[l].add(r.id);
    }
  } catch { missing.push(`${l}_${n}`); }
}
console.log('язык | фраз с ошибкой | % от 1600 | типы/поля');
for (const l of langs) console.log(`${l} | ${phrases[l].size} | ${(phrases[l].size / 16).toFixed(2)}% | ${JSON.stringify(rows[l])}`);
console.log('нет результатов:', missing.length, missing.join(' '));
