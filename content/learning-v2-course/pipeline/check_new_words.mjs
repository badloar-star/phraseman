#!/usr/bin/env node
// зачем: владелец заметил 2026-09-05, что слово `early` заявлено новым в
// четырёх сессиях. Причина — никто не сверял, встречалось ли слово раньше:
// ни автор, ни судьи, ни сборщик. Этот сторож проверяет ровно одно —
// слово, заявленное новым, не должно быть заявлено новым где-то ещё.
// Знакомое слово в уроке само по себе законно (новая грамматика на старой
// лексике — верный приём); ложь — только подпись «Новые слова».
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const DIR = path.join(ROOT, 'sessions', 'en', 'l01');

const norm = w => w.replace(/[`*]/g, '').replace(/\(.*?\)/g, '').trim().toLowerCase();

function readList(text, label) {
  const line = text.split('\n').slice(0, 20).find(l => l.startsWith(`**${label}:**`));
  if (!line) return null;                       // ранний выход: строки нет вовсе
  const body = line.slice(`**${label}:**`.length).trim();
  if (!body || body === '—') return [];
  return body.split(',').map(norm).filter(w => /^[a-z' ]+$/.test(w) && w.length > 1);
}

const seen = new Map();     // слово -> сессия, где оно впервые заявлено новым
const problems = [];
const missing = [];

const sessions = fs.existsSync(DIR)
  ? fs.readdirSync(DIR).filter(s => /^s\d+$/.test(s)).sort((a, b) => +a.slice(1) - +b.slice(1))
  : [];

for (const s of sessions) {
  const file = path.join(DIR, s, 'final.ru.md');
  if (!fs.existsSync(file)) continue;           // ранний выход: сессия ещё не дописана
  const text = fs.readFileSync(file, 'utf8');
  const words = readList(text, 'Новые слова');
  if (words === null) { missing.push(`${s}: нет строки «Новые слова»`); continue; }
  for (const w of words) {
    if (seen.has(w)) problems.push(`${s}: «${w}» уже заявлено новым в ${seen.get(w)}`);
    else seen.set(w, s);
  }
}

console.log(`[NEW-WORDS] сессий проверено: ${sessions.length}, уникальных новых слов: ${seen.size}`);
for (const m of missing) console.log(`[NEW-WORDS] предупреждение — ${m}`);

if (problems.length) {
  console.error(`[NEW-WORDS] ПОВТОРЫ (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  console.error('[NEW-WORDS] Слово в уроке оставить можно — но тогда оно принадлежит строке');
  console.error('[NEW-WORDS] «Возвращаются», а не «Новые слова». Правьте подпись, а не сторожа.');
  process.exit(1);
}
console.log('[NEW-WORDS] повторов нет');
