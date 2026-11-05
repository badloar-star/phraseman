// зачем (владелец 05.11: раздел «Неправильные глаголы» должен быть настоящим): вспомогательный просмотр — частотный список токенов фраз классического курса языка,
// чтобы составить словарь форм неправильных глаголов без пропусков. Только чтение; пишет в stdout.
// Запуск: node scripts/classic_irregular_verbs_tokens.mjs <fr|es|de|it> [минимум_вхождений]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lang = process.argv[2];
const min = Number(process.argv[3] ?? 1);
if (!['fr', 'es', 'de', 'it'].includes(lang)) {
  console.error('[IRREG-TOKENS] язык должен быть fr|es|de|it, получено:', lang);
  process.exit(2);
}
const dir = path.join(ROOT, 'modules', 'classic-courses', lang);
const files = fs.readdirSync(dir).filter((f) => /^lessons-\d+\.json$/.test(f)).sort();
const freq = new Map();
for (const f of files) {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const p of lesson.phrases) {
    const words = String(p.target).toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
    for (const w of new Set(words)) {
      const o = freq.get(w) ?? { n: 0, first: lesson.lesson };
      o.n += 1;
      freq.set(w, o);
    }
  }
}
const rows = [...freq.entries()].filter(([, o]) => o.n >= min).sort((a, b) => b[1].n - a[1].n);
console.error(`[IRREG-TOKENS] ${lang}: ${files.length} файлов, ${rows.length} слов (>=${min})`);
console.log(rows.map(([w, o]) => `${w}:${o.n}@${o.first}`).join(' '));
