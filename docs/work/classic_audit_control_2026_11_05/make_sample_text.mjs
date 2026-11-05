// make_sample_text.mjs — контрольная выборка 15% по ТЕКСТАМ курса: словарь (glossary.json), экраны intro, теории (theory.json), ×5 языков.
//
// зачем (координатор 05.11, расширение объёма владельца): к контролю фраз добавляются словарь, тексты разделов (intro) и теории.
// Теория выдаёт full3-чанки (полный проход); контрольные 15% берутся тем же seed-методом, что и выборка фраз (make_sample.mjs).
//
// Два режима:
//   1) По данным курса (по умолчанию): 15% лемм словаря, 15% экранов intro, 15% уроков теории на язык, из modules/classic-courses/<lang>/.
//      node docs/work/classic_audit_control_2026_11_05/make_sample_text.mjs [--seed=20261105] [--share=0.15] [--out=<папка>]
//   2) По чанкам full3 от Теории: --full3=<папка с chunk_*.json> --kind=glossary|intro|theory
//      Берёт 15% записей КАЖДОГО языка (язык — из имени chunk_<lang>_NN.json), детерминированно по seed.
// Исключаются записи, уже попавшие в results_*.json прежних аудитов, если у записи есть id вида «lang:...» (для словаря — по лемме не
// исключаем: правки словаря в results не логировались).
// Выход: text/chunk_<kind>_<lang>_<NN>.json (+ text/MANIFEST_TEXT.json). Размер чанка: словарь 100, intro 20, теории 5.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const arg = (name, def) => { const a = process.argv.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : def; };
const SEED = arg('seed', '20261105');
const SHARE = Number(arg('share', '0.15'));
const OUT = path.resolve(arg('out', path.join(HERE, 'text')));
const FULL3 = arg('full3', '');
const KIND = arg('kind', '');
const LANGS = ['en', 'es', 'fr', 'de', 'it'];
const CHUNK = { glossary: 100, intro: 20, theory: 5 };

function rng(context) {
  const h = crypto.createHash('sha256').update(`${SEED}|text|${context}`).digest();
  let a = h.readUInt32LE(0);
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(list, rand) { const a = [...list]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pick = (items, kind, lang) => {
  const n = Math.max(1, Math.round(items.length * SHARE));
  const order = shuffle(items.map((_, i) => i), rng(`${kind}|${lang}`)).slice(0, n).sort((a, b) => a - b);
  return order.map((i) => items[i]);
};

fs.mkdirSync(OUT, { recursive: true });
const manifest = { seed: SEED, share: SHARE, mode: FULL3 ? 'full3' : 'modules', counts: {} };
const write = (kind, lang, records) => {
  const size = CHUNK[kind];
  for (let i = 0; i < records.length; i += size) {
    fs.writeFileSync(path.join(OUT, `chunk_${kind}_${lang}_${String(i / size).padStart(2, '0')}.json`), `${JSON.stringify(records.slice(i, i + size), null, 0)}\n`);
  }
  manifest.counts[`${kind}:${lang}`] = records.length;
};

if (FULL3) {
  if (!CHUNK[KIND]) throw new Error('--kind=glossary|intro|theory обязателен вместе с --full3');
  const dir = path.resolve(FULL3);
  for (const lang of LANGS) {
    const files = fs.readdirSync(dir).filter((n) => new RegExp(`^chunk_${lang}_\\d+\\.json$`).test(n)).sort();
    const records = files.flatMap((f) => readJson(path.join(dir, f)));
    if (records.length) write(KIND, lang, pick(records, KIND, lang));
  }
} else {
  for (const lang of LANGS) {
    const base = path.join(ROOT, 'modules', 'classic-courses', lang);
    const lemmas = readJson(path.join(base, 'glossary.json')).lemmas ?? [];
    write('glossary', lang, pick(lemmas.map((l) => ({ id: `${lang}:gl:${l.lemma}`, lemma: l.lemma, meaning: { ru: l.meaning?.ru, uk: l.meaning?.uk, en: l.meaning?.en }, firstLesson: l.firstLesson, phraseIds: (l.phraseIds ?? []).slice(0, 3) })), 'glossary', lang));
    const intro = readJson(path.join(base, 'intro.json'));
    write('intro', lang, pick(Object.entries(intro).flatMap(([lesson, screens]) => screens.map((screen, i) => ({ id: `${lang}:intro:${lesson}.${i + 1}`, lesson: Number(lesson), ...screen }))), 'intro', lang));
    const theory = readJson(path.join(base, 'theory.json')).data ?? {};
    write('theory', lang, pick(Object.entries(theory).map(([lesson, value]) => ({ id: `${lang}:theory:${lesson}`, lesson: Number(lesson), ...value })), 'theory', lang));
  }
}
fs.writeFileSync(path.join(OUT, 'MANIFEST_TEXT.json'), `${JSON.stringify(manifest, null, 1)}\n`);
console.log(JSON.stringify(manifest));
