/**
 * Эвристика: pos nouns + es похоже на инфинитив; pos verbs + es одно слово с типичным суффиксом существительного.
 * Ложные срабатывания возможны — вывод для ручного просмотра.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSON_WORDS = path.join(__dirname, '..', 'app', 'lesson_words.tsx');

const LINE_RE =
  /^\s*\{ en: '((?:\\.|[^'\\])*)',\s*ru: '((?:\\.|[^'\\])*)',\s*uk: '((?:\\.|[^'\\])*)'(?:,\s*es: '((?:\\.|[^'\\])*)')?\s*,\s*pos:\s*'((?:\\.|[^'\\])*)'/;

function unquote(s) {
  return s.replace(/\\(.)/g, '$1');
}

/** Первый сегмент испанской глоссы до ; или / (без скобок в начале). */
function firstSpanishToken(es) {
  if (!es?.trim()) return '';
  const t = es.split(/[;/]/)[0].trim().replace(/^\(/, '');
  return t;
}

/** Типичный инфинитив одним токеном (без пробелов, без clitic). */
const LOOKS_INF = /^[a-záéíóúüñ]{2,}(ar|er|ir)$/i;

/** Нормальные существительные, которые внешне заканчиваются как инфинитив. */
const NOUN_INF_LOOKALIKE_ALLOWLIST = new Set(['alquiler', 'azúcar', 'lugar', 'mujer']);

/** Одно слово похоже на отглаголное / абстрактное существительное. */
const LOOKS_NOUN_SUF = /(ción|dad|tad|mente|aje|ncia|ismo)$/i;

function main() {
  const src = fs.readFileSync(LESSON_WORDS, 'utf8');
  const lines = src.split('\n');
  let lesson = null;
  const nounVerbEs = [];
  const verbNounEs = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lm = line.match(/^\s*(\d+):\s*\[\s*$/);
    if (lm) lesson = Number(lm[1]);

    const m = line.match(LINE_RE);
    if (!m || lesson === null) continue;

    const en = unquote(m[1]);
    const es = m[4] ? unquote(m[4]) : '';
    const pos = unquote(m[5]);
    const first = firstSpanishToken(es);
    if (!first || first.includes(' ') || first.includes('(')) continue;

    if (pos === 'nouns' && LOOKS_INF.test(first) && !NOUN_INF_LOOKALIKE_ALLOWLIST.has(first.toLowerCase())) {
      nounVerbEs.push({ line: i + 1, lesson, en, es, first });
    }
    if ((pos === 'verbs' || pos === 'irregular_verbs') && LOOKS_NOUN_SUF.test(first)) {
      verbNounEs.push({ line: i + 1, lesson, en, es, first });
    }
  }

  console.log(`pos nouns + es first token looks like infinitive (${nounVerbEs.length})`);
  for (const r of nounVerbEs) {
    console.log(`  L${r.lesson} line ${r.line} ${r.en} → es=${JSON.stringify(r.es)} (first=${r.first})`);
  }

  console.log(`\npos verbs|irregular_verbs + es first token noun-like suffix (${verbNounEs.length})`);
  for (const r of verbNounEs) {
    console.log(`  L${r.lesson} line ${r.line} ${r.en} → es=${JSON.stringify(r.es)} (first=${r.first})`);
  }
}

main();
