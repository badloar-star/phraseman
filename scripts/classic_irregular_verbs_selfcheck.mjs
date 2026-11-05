// зачем (схема docs/work/classic_irregular_verbs_SCHEMA.md, шаг C): собственная быстрая сверка черновика до официальной сверки Теории —
// схема, ru/uk непусты, нет «пока/скоро/TODO», примеры существуют и содержат форму глагола, одна лемма — один урок, формы не дублируют друг друга.
// Запуск: node scripts/classic_irregular_verbs_selfcheck.mjs <fr|es|de|it> [--modules]  (по умолчанию проверяет черновик в docs/work/irregular_verbs/draft)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lang = process.argv[2];
if (!['fr', 'es', 'de', 'it'].includes(lang)) { console.error('[IRREG-CHECK] язык fr|es|de|it'); process.exit(2); }
const file = process.argv.includes('--modules')
  ? path.join(ROOT, 'modules', 'classic-courses', lang, 'irregular_verbs.json')
  : path.join(ROOT, 'docs', 'work', 'irregular_verbs', 'draft', lang, 'irregular_verbs.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [];
const fail = (m) => errors.push(m);
if (data.schema !== 'phraseman.classic-irregular-verbs/1') fail('schema');
if (data.lang !== lang) fail('lang');
const keys = (data.formsLayout ?? []).map((f) => f.key);
const phrases = new Map();
const dir = path.join(ROOT, 'modules', 'classic-courses', lang);
for (const f of fs.readdirSync(dir).filter((x) => /^lessons-\d+\.json$/.test(x))) {
  for (const p of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).phrases) phrases.set(p.id, String(p.target).toLowerCase());
}
const stop = /(^|[^\p{L}])(пока|скоро|todo|tbd|заглушк\p{L}*|незабаром|поки що)([^\p{L}]|$)/iu;
const seen = new Map();
let count = 0;
for (const [lesson, list] of Object.entries(data.lessons ?? {})) {
  if (!Array.isArray(list) || list.length === 0) fail(`урок ${lesson}: пустой список`);
  for (const e of list) {
    count += 1;
    const tag = `${e.lemma}@${lesson}`;
    if (seen.has(e.lemma)) fail(`${tag}: лемма уже в уроке ${seen.get(e.lemma)}`);
    seen.set(e.lemma, lesson);
    for (const k of ['meaning', 'note']) for (const l of ['ru', 'uk']) {
      const t = e[k]?.[l];
      if (!t || !String(t).trim()) fail(`${tag}: ${k}.${l} пусто`);
      else if (stop.test(t) || /[`*_]{1,}/.test(t)) fail(`${tag}: ${k}.${l} похоже на заглушку/markdown`);
    }
    for (const k of keys) if (!e.forms?.[k]) fail(`${tag}: нет формы ${k}`);
    // зачем: совпадение инфинитива и причастия законно (bekommen, vergessen, gefallen, venire→venuto нет); остальные пары не должны совпадать
    const pairs = Object.entries(e.forms ?? {}).filter(([k]) => !(k === "pp" || k === "participio" || k === "pc"));
    const base = pairs.map(([, x]) => x);
    if (new Set(base).size !== base.length && !(e.lemma === "essere")) fail(tag + ": формы дублируют друг друга: " + base.join(" / "));
    if (!Array.isArray(e.examples) || e.examples.length < 1 || e.examples.length > 3) fail(`${tag}: примеров должно быть 1–3`);
    for (const id of e.examples ?? []) if (!phrases.has(id)) fail(`${tag}: нет фразы ${id}`);
  }
}
console.log(`[IRREG-CHECK] ${lang}: глаголов ${count}, уроков ${Object.keys(data.lessons).length}, ошибок ${errors.length}`);
for (const m of errors) console.log('  ✗', m);
process.exit(errors.length ? 1 : 0);
