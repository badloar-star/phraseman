// зачем (владелец 05.11: раздел «Неправильные глаголы» — настоящий, без заглушек; схема — docs/work/classic_irregular_verbs_SCHEMA.md, шаги B–C):
// из словаря scripts/data/irregular_verbs_<lang>.mjs и фраз курса собирает черновик irregular_verbs.json: глагол попадает в урок N, где ВПЕРВЫЕ
// встретилась любая его форма (точное совпадение слова во фразе), примеры — реальные фразы курса. Черновик пишется в docs/work/irregular_verbs/draft/<lang>/,
// а НЕ в modules/classic-courses: раздел должен оставаться скрытым, пока нет зелёной сверки Теории и аудита (шаги C–D).
// Запуск: node scripts/classic_irregular_verbs_build.mjs <fr|es|de|it> [--out-modules]   (второй флаг — только после аудита)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lang = process.argv[2];
const toModules = process.argv.includes('--out-modules');
if (!['fr', 'es', 'de', 'it'].includes(lang)) {
  console.error('[IRREG-BUILD] язык должен быть fr|es|de|it, получено:', lang);
  process.exit(2);
}

const dict = await import(pathToFileURL(path.join(ROOT, 'scripts', 'data', `irregular_verbs_${lang}.mjs`)).href);
const dir = path.join(ROOT, 'modules', 'classic-courses', lang);
const files = fs.readdirSync(dir).filter((f) => /^lessons-\d+\.json$/.test(f)).sort();

// слово → глаголы, у которых оно в match (одно слово может принадлежать нескольким — тогда оба кандидата, решает человек)
const byForm = new Map();
for (const verb of dict.VERBS) {
  for (const form of verb.match) {
    const key = form.toLowerCase();
    if (!byForm.has(key)) byForm.set(key, []);
    byForm.get(key).push(verb);
  }
}

// слова фразы: для немецкого существительные пишутся с большой буквы — внутри предложения заглавное слово не считаем глаголом (Laden, Essen)
function wordsOf(text) {
  const raw = String(text).split(/[^\p{L}]+/u).filter(Boolean);
  return raw
    .map((w, i) => ({ w, i }))
    .filter(({ w, i }) => !(lang === 'de' && i > 0 && w[0] !== w[0].toLowerCase()))
    .map(({ w }) => w.toLowerCase());
}

// лемма → { first: N, hits: [{ id, form, len, lesson }] }
const found = new Map();
for (const f of files) {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const phrase of lesson.phrases) {
    const seen = new Set();
    for (const word of wordsOf(phrase.target)) {
      for (const verb of byForm.get(word) ?? []) {
        const key = `${verb.lemma}|${word}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const o = found.get(verb.lemma) ?? { first: lesson.lesson, hits: [] };
        o.hits.push({ id: phrase.id, form: word, len: String(phrase.target).length, lesson: lesson.lesson });
        found.set(verb.lemma, o);
      }
    }
  }
}

function pickExamples(hits, first) {
  const inFirst = hits.filter((h) => h.lesson === first).sort((a, b) => a.len - b.len);
  const chosen = [];
  const usedForms = new Set();
  for (const h of inFirst) {
    if (chosen.length >= 3) break;
    if (usedForms.has(h.form)) continue;
    usedForms.add(h.form);
    chosen.push(h);
  }
  for (const h of hits.slice().sort((a, b) => a.len - b.len)) {
    if (chosen.length >= Math.min(2, 3)) break;
    if (chosen.some((c) => c.id === h.id) || usedForms.has(h.form)) continue;
    usedForms.add(h.form);
    chosen.push(h);
  }
  return chosen.map((h) => h.id);
}

const lessons = {};
const report = { lang, verbsInDict: dict.VERBS.length, matched: 0, absent: [], perLesson: {} };
for (const verb of dict.VERBS) {
  const o = found.get(verb.lemma);
  if (!o) { report.absent.push(verb.lemma); continue; }
  report.matched += 1;
  const entry = { lemma: verb.lemma, meaning: verb.meaning, forms: verb.forms, ...(verb.aux ? { aux: verb.aux } : {}), note: verb.note, examples: pickExamples(o.hits, o.first) };
  (lessons[o.first] ??= []).push(entry);
}
for (const key of Object.keys(lessons)) report.perLesson[key] = lessons[key].map((e) => e.lemma);

const out = { schema: 'phraseman.classic-irregular-verbs/1', lang, formsLayout: dict.FORMS_LAYOUT, lessons: Object.fromEntries(Object.entries(lessons).sort((a, b) => Number(a[0]) - Number(b[0]))) };
const outDir = toModules ? dir : path.join(ROOT, 'docs', 'work', 'irregular_verbs', 'draft', lang);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'irregular_verbs.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`[IRREG-BUILD] ${lang}: словарь ${report.verbsInDict}, нашлось во фразах ${report.matched}, нет во фразах ${report.absent.length} → ${path.relative(ROOT, outDir)}`);
console.log('[IRREG-BUILD] по урокам:', JSON.stringify(report.perLesson));
console.log('[IRREG-BUILD] нет во фразах:', report.absent.join(', ') || '—');
