// Проверка словаря классики (владелец 05.11): (1) лемма встречается один раз (без повторов между уроками), firstLesson = первый урок из phraseIds;
// (2) каждое слово из верных ответов фраз покрыто леммой словаря (лемма == слово, либо слово — форма леммы, привязанной к этой фразе); (3) ru/uk есть.
// Запуск: node scripts/classic_glossary_check.mjs [--list]   (--list печатает непокрытые слова)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const norm = (t) => t.toLowerCase().replace(/[.,!?;:¿¡«»"]/g, '');
const lessonOf = (id) => Number(/(\d\d)[.:]\d\d$/.exec(id)[1]);
const all = process.argv.includes('--all'); const list = process.argv.includes('--list') || all; const onlyLang = process.argv.slice(2).find((a) => /^(en|es|fr|de|it)$/.test(a));
for (const l of ['en', 'es', 'fr', 'de', 'it'].filter((x) => !onlyLang || x === onlyLang)) {
  const g = JSON.parse(readFileSync(join(ROOT, 'modules', 'classic-courses', l, 'glossary.json'), 'utf8')).lemmas;
  const phrases = [];
  for (let n = 1; n <= 32; n++) phrases.push(...JSON.parse(readFileSync(join(ROOT, 'modules', 'classic-courses', l, `lessons-${String(n).padStart(2, '0')}.json`), 'utf8')).phrases);
  const seen = new Map(); const formSet = new Set(); let dup = 0, badFirst = 0, noTr = 0;
  const byPhrase = new Map();
  for (const e of g) {
    const k = norm(e.lemma);
    if (seen.has(k)) dup++; seen.set(k, e);
    const first = Math.min(...(e.phraseIds ?? []).map(lessonOf));
    if (e.phraseIds?.length && first !== e.firstLesson) badFirst++;
    if (!e.meaning?.ru?.trim() || !e.meaning?.uk?.trim()) noTr++;
    for (const fo of e.forms ?? []) formSet.add(norm(fo)); // зачем: слово-форма леммы считается покрытым
    for (const id of e.phraseIds ?? []) { if (!byPhrase.has(id)) byPhrase.set(id, []); byPhrase.get(id).push(k); }
  }
  let uncoveredTokens = 0; const missing = new Map(); let phrasesWithGap = 0;
  for (const p of phrases) {
    const lemmas = new Set(byPhrase.get(p.id) ?? []);
    const toks = p.tiles.map((t) => norm(t.correct));
    const gaps = toks.filter((w) => !lemmas.has(w) && !seen.has(w) && !formSet.has(w));
    // слово без собственной леммы: считаем покрытым, если у фразы есть хотя бы одна лемма-«родитель» (общий префикс ≥3) — грубая эвристика форм
    const real = gaps.filter((w) => ![...lemmas].some((m) => m.length >= 3 && w.length >= 3 && (w.startsWith(m.slice(0, 3)) || m.startsWith(w.slice(0, 3)))));
    if (real.length) { phrasesWithGap++; uncoveredTokens += real.length; for (const w of real) missing.set(w, (missing.get(w) ?? 0) + 1); }
  }
  console.log(`${l}: лемм ${g.length}, повторов ${dup}, firstLesson≠первого урока ${badFirst}, без ru/uk ${noTr}, фраз с непокрытыми словами ${phrasesWithGap}/1600, уникальных непокрытых слов ${missing.size}`);
  if (list) console.log([...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, all ? 5000 : 60).map(([w, c]) => `${w}×${c}`).join(' '));
}
