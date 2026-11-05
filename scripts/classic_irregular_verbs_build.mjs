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
// зачем (проверка 05.11): фраза с той же формой, но другим глаголом по смыслу (de «Du ziehst dich um» — переодеваться, а не переезжать;
// «Mir fällt auf» — auffallen) не должна ни ставить глагол в урок, ни быть его примером. Список — EXAMPLE_EXCLUDE в irregular_verbs_meaning_en.mjs.
const { EXAMPLE_EXCLUDE = {} } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'data', 'irregular_verbs_meaning_en.mjs')).href);
const excluded = (lemma, id) => (EXAMPLE_EXCLUDE[lang]?.[lemma] ?? []).includes(id);
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

// зачем (аудит 05.11: в de все «ich rufe dich an» засчитывались глаголу rufen, а это anrufen — урок «звонить» уезжал на урок позже):
// немецкая отделяемая приставка стоит в КОНЦЕ части предложения. Если форма базового глагола (rufe) и в конце той же части стоит приставка
// (an), а в словаре есть составной глагол (anrufen), форма засчитывается составному.
const SEP_PARTICLES = ['an', 'auf', 'ein', 'aus', 'mit', 'ab', 'zu', 'vor', 'nach', 'weg', 'zurück', 'los', 'fern', 'um'];
const lemmas = new Map(dict.VERBS.map((v) => [v.lemma, v]));
const sepByBase = new Map(); // базовая лемма → [{ particle, verb }]
if (lang === 'de') {
  for (const verb of dict.VERBS) {
    const p = SEP_PARTICLES.find((x) => verb.lemma.startsWith(x) && lemmas.has(verb.lemma.slice(x.length)));
    if (!p) continue;
    const base = verb.lemma.slice(p.length);
    if (!sepByBase.has(base)) sepByBase.set(base, []);
    sepByBase.get(base).push({ particle: p, verb });
  }
}
function clauseTail(text, word) {
  for (const clause of String(text).split(/[,.!?;:]+/u)) {
    const ws = clause.split(/[^\p{L}]+/u).filter(Boolean).map((w) => w.toLowerCase());
    if (ws.includes(word)) return ws[ws.length - 1];
  }
  return null;
}
function verbsForWord(word, text) {
  const out = [];
  for (const verb of byForm.get(word) ?? []) {
    const sep = sepByBase.get(verb.lemma);
    const tail = sep ? clauseTail(text, word) : null;
    const hit = sep?.find((s) => s.particle === tail);
    out.push(hit ? hit.verb : verb);
  }
  return out;
}

// лемма → { first: N, hits: [{ id, form, len, lesson }] }
const found = new Map();
for (const f of files) {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const phrase of lesson.phrases) {
    const seen = new Set();
    for (const word of wordsOf(phrase.target)) {
      for (const verb of verbsForWord(word, phrase.target)) {
        if (excluded(verb.lemma, phrase.id)) continue;
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

// зачем (владелец 05.11: глаголы es/fr/de/it «по образцу английского»): английский тренажёр спрашивает три формы base → past → pp.
// train — три формы курса для этих ячеек (см. TRAIN_OVERRIDES в irregular_verbs_meaning_en.mjs), meaning.en — перевод для 7 языков интерфейса.
const { MEANING_EN, TRAIN_OVERRIDES } = await import(pathToFileURL(path.join(ROOT, 'scripts', 'data', 'irregular_verbs_meaning_en.mjs')).href);
const I18N_PATH = path.join(ROOT, 'scripts', 'data', `irregular_verbs_i18n_${lang}.json`);
const I18N = fs.existsSync(I18N_PATH) ? JSON.parse(fs.readFileSync(I18N_PATH, 'utf8')) : {};
const I18N_LOCALES = ['es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const firstPart = (s) => String(s ?? '').split(' / ')[0].trim();
function trainOf(verb) {
  const f = verb.forms;
  let past;
  let pp;
  if (lang === 'fr') { past = firstPart(f.present).replace(/^(je |j[’']|il )/u, ''); pp = String(f.pc).trim().split(/\s+/u).pop(); }
  else if (lang === 'es') { past = firstPart(f.preterito); pp = f.participio; }
  else if (lang === 'de') { past = f.praet; pp = f.pp; }
  else { past = firstPart(f.presente).replace(/^io /u, ''); pp = f.pp; }
  return { base: f.inf, past, pp, ...(TRAIN_OVERRIDES[lang]?.[verb.lemma] ?? {}) };
}

const lessons = {};
const report = { lang, verbsInDict: dict.VERBS.length, matched: 0, absent: [], perLesson: {} };
for (const verb of dict.VERBS) {
  const o = found.get(verb.lemma);
  if (!o) { report.absent.push(verb.lemma); continue; }
  report.matched += 1;
  // зачем (владелец 05.11: «переводы на 9 языков интерфейса»): ru/uk — из словаря, en и 6 остальных — scripts/data/irregular_verbs_i18n_<lang>.json
  const tr = I18N[verb.lemma] ?? {};
  const en = tr.en ?? MEANING_EN[lang]?.[verb.lemma];
  if (!en) { console.error(`[IRREG-BUILD] нет английского перевода для ${lang}:${verb.lemma}`); process.exit(3); }
  const missing = I18N_LOCALES.filter((l) => !String(tr[l] ?? '').trim());
  if (toModules && missing.length) { console.error(`[IRREG-BUILD] ${lang}:${verb.lemma}: нет перевода на ${missing.join(', ')}`); process.exit(4); }
  const i18n = Object.fromEntries(I18N_LOCALES.filter((l) => tr[l]).map((l) => [l, tr[l]]));
  const entry = { lemma: verb.lemma, meaning: { ...verb.meaning, en, ...i18n }, forms: verb.forms, train: trainOf(verb), ...(verb.aux ? { aux: verb.aux } : {}), note: verb.note, examples: pickExamples(o.hits, o.first) };
  (lessons[o.first] ??= []).push(entry);
}
for (const key of Object.keys(lessons)) report.perLesson[key] = lessons[key].map((e) => e.lemma);

const out = { schema: 'phraseman.classic-irregular-verbs/1', lang, formsLayout: dict.FORMS_LAYOUT, lessons: Object.fromEntries(Object.entries(lessons).sort((a, b) => Number(a[0]) - Number(b[0]))) };
// зачем (05.11): НЕ в modules/classic-courses — там каждый файл обязан быть в manifest.json курса (сборщик курса его перезаписывает,
// manifest-тесты падали, файлы унесли на парковку). Свой каталог modules/classic-irregular-verbs/<lang>.json, приложение берёт его require'ом.
const outDir = toModules ? path.join(ROOT, 'modules', 'classic-irregular-verbs') : path.join(ROOT, 'docs', 'work', 'irregular_verbs', 'draft', lang);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, toModules ? `${lang}.json` : 'irregular_verbs.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`[IRREG-BUILD] ${lang}: словарь ${report.verbsInDict}, нашлось во фразах ${report.matched}, нет во фразах ${report.absent.length} → ${path.relative(ROOT, outDir)}`);
console.log('[IRREG-BUILD] по урокам:', JSON.stringify(report.perLesson));
console.log('[IRREG-BUILD] нет во фразах:', report.absent.join(', ') || '—');
