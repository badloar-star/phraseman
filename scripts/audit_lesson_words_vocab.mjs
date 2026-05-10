/**
 * Аудит согласованности app/lesson_words.tsx:
 * — дубликаты en внутри урока;
 * — одинаковые ru+uk у разных en (глобально);
 * — отсутствие ES (inline es или LESSON_WORD_ES_BY_EN);
 * — pos: nouns при типичных формах 3 л. наст. (эвристика).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const LESSON_WORDS = path.join(ROOT, 'app', 'lesson_words.tsx');
const ES_BY_EN_FILE = path.join(ROOT, 'app', 'lesson_words_es_by_en.ts');

const LINE_RE =
  /^\s*\{ en: '((?:\\.|[^'\\])*)',\s*ru: '((?:\\.|[^'\\])*)',\s*uk: '((?:\\.|[^'\\])*)'(?:,\s*es: '((?:\\.|[^'\\])*)')?\s*,\s*pos:\s*'((?:\\.|[^'\\])*)'/;

function unquote(s) {
  return s.replace(/\\(.)/g, '$1');
}

function loadEsByEn() {
  const raw = fs.readFileSync(ES_BY_EN_FILE, 'utf8');
  const map = new Map();
  const re = /^\s*'((?:\\'|[^'])*)':\s*'((?:\\'|[^'])*)',?\s*$/gm;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const k = m[1].replace(/\\'/g, "'");
    const v = m[2].replace(/\\'/g, "'");
    map.set(k, v);
  }
  return map;
}

/** Типичные 3 л. ед./мн. в EN, которые в данных часто ошибочно помечены как nouns */
const SUSPECT_NOUN_POS_VERB_FORMS = new Set(
  `
finds fills brings pulls puts sits sets cuts runs goes comes takes
makes gives gets uses lives loves moves dies lies ties rises closes
opens starts stops tries shows knows grows draws blows flows throws
owns seems means appears works plays stays sounds becomes
`.trim().split(/\s+/),
);

function main() {
  const src = fs.readFileSync(LESSON_WORDS, 'utf8');
  const esByEn = loadEsByEn();
  const lines = src.split('\n');

  let lesson = null;
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lm = line.match(/^\s*(\d+):\s*\[\s*$/);
    if (lm) lesson = Number(lm[1]);

    const m = line.match(LINE_RE);
    if (!m || lesson === null) continue;
    const en = unquote(m[1]);
    const ru = unquote(m[2]);
    const uk = unquote(m[3]);
    const es = m[4] ? unquote(m[4]) : '';
    const pos = unquote(m[5]);
    rows.push({ line: i + 1, lesson, en, ru, uk, es, pos });
  }

  const dupWithinLesson = new Map();
  const byLessonEn = new Map();
  for (const r of rows) {
    const key = `${r.lesson}\t${r.en}`;
    byLessonEn.set(key, (byLessonEn.get(key) || 0) + 1);
  }
  for (const [key, cnt] of byLessonEn) {
    if (cnt > 1) dupWithinLesson.set(key, cnt);
  }

  const ruUkToEns = new Map();
  for (const r of rows) {
    const k = `${r.ru}\n${r.uk}`;
    if (!ruUkToEns.has(k)) ruUkToEns.set(k, []);
    ruUkToEns.get(k).push({ en: r.en, lesson: r.lesson, line: r.line });
  }
  const ruUkCollisions = [...ruUkToEns.entries()].filter(([, arr]) => {
    const uniq = new Set(arr.map((x) => x.en));
    return uniq.size > 1;
  });

  const missingEs = [];
  for (const r of rows) {
    if (r.es?.trim()) continue;
    if (esByEn.has(r.en) && esByEn.get(r.en)?.trim()) continue;
    missingEs.push(r);
  }

  const suspectPos = [];
  for (const r of rows) {
    const low = r.en.toLowerCase();
    if (r.pos !== 'nouns') continue;
    if (SUSPECT_NOUN_POS_VERB_FORMS.has(low)) suspectPos.push(r);
  }

  const enToLessons = new Map();
  const enToRows = new Map();
  for (const r of rows) {
    if (!enToLessons.has(r.en)) enToLessons.set(r.en, new Set());
    enToLessons.get(r.en).add(r.lesson);
    if (!enToRows.has(r.en)) enToRows.set(r.en, []);
    enToRows.get(r.en).push(r);
  }
  const multiLessonEn = [...enToLessons.entries()].filter(([, s]) => s.size > 1);

  /** Один и тот же en в разных уроках, но разные ru или uk — риск рассинхрона */
  const enMultiLessonRuUkMismatch = [];
  for (const [en, arr] of enToRows) {
    const lessons = new Set(arr.map((x) => x.lesson));
    if (lessons.size < 2) continue;
    const rus = new Set(arr.map((x) => x.ru));
    const uks = new Set(arr.map((x) => x.uk));
    if (rus.size > 1 || uks.size > 1) {
      enMultiLessonRuUkMismatch.push({
        en,
        variants: arr.map((x) => `L${x.lesson}: ru=${JSON.stringify(x.ru)} uk=${JSON.stringify(x.uk)}`),
      });
    }
  }

  console.log('=== lesson_words.tsx vocabulary audit ===\n');
  console.log(`Total rows: ${rows.length}`);
  console.log(`Unique en: ${enToLessons.size}`);

  console.log(`\n--- Duplicate en WITHIN same lesson (${dupWithinLesson.size}) ---`);
  if (dupWithinLesson.size === 0) console.log('(none)');
  else {
    for (const [key, cnt] of [...dupWithinLesson.entries()].sort()) {
      console.log(`  ${cnt}x  ${key.replace('\t', ' lesson ')}`);
    }
  }

  console.log(`\n--- Missing Spanish (no inline es, not in lesson_words_es_by_en) (${missingEs.length}) ---`);
  if (missingEs.length === 0) console.log('(none)');
  else {
    for (const r of missingEs) {
      console.log(`  L${r.lesson} L${r.line} en=${JSON.stringify(r.en)}`);
    }
  }

  console.log(`\n--- pos:nouns but en looks like verb 3sg (${suspectPos.length}) ---`);
  if (suspectPos.length === 0) console.log('(none)');
  else {
    for (const r of suspectPos) {
      console.log(`  L${r.lesson} L${r.line} ${r.en}  ru=${r.ru.slice(0, 40)}…`);
    }
  }

  console.log(`\n--- Same RU+UK pair, different EN (${ruUkCollisions.length}) ---`);
  const show = ruUkCollisions.slice(0, 80);
  if (show.length === 0) console.log('(none)');
  else {
    for (const [k, arr] of show) {
      const [ru, uk] = k.split('\n');
      const ens = [...new Set(arr.map((a) => a.en))].join(' | ');
      console.log(`  RU «${ru.slice(0, 50)}${ru.length > 50 ? '…' : ''}» / UK «${uk.slice(0, 50)}${uk.length > 50 ? '…' : ''}» → ${ens}`);
    }
    if (ruUkCollisions.length > show.length) console.log(`  … +${ruUkCollisions.length - show.length} more`);
  }

  console.log(`\n--- Same EN in multiple lessons (${multiLessonEn.length} keys) ---`);
  const interesting = multiLessonEn.filter(([, s]) => s.size > 1).sort((a, b) => b[1].size - a[1].size);
  for (const [en, s] of interesting.slice(0, 40)) {
    console.log(`  ${en} → lessons ${[...s].sort((a, b) => a - b).join(', ')}`);
  }
  if (interesting.length > 40) console.log(`  … +${interesting.length - 40} more`);

  console.log(
    `\n--- Same EN in multiple lessons with DIFFERENT ru or uk (${enMultiLessonRuUkMismatch.length}) ---`,
  );
  for (const x of enMultiLessonRuUkMismatch.slice(0, 35)) {
    console.log(`  ${x.en}:`);
    for (const v of x.variants) console.log(`    ${v}`);
  }
  if (enMultiLessonRuUkMismatch.length > 35)
    console.log(`  … +${enMultiLessonRuUkMismatch.length - 35} more`);

  const exit =
    dupWithinLesson.size > 0 || missingEs.length > 0 ? 1 : 0;
  if (exit) console.log('\nEXIT 1: fix duplicates or missing ES.');
  else console.log('\nOK: no duplicate en per lesson, no missing ES.');
  process.exit(exit);
}

main();
