// Audit script for lessons 1-32
// Checks WORDS_BY_LESSON (the in-app "Vocabulary" screen, lesson_words.tsx)
//        IRREGULAR_VERBS_BY_LESSON (the in-app "Irregular verbs" screen, irregular_verbs_data.ts)
//
// Reports:
//   1) HARD duplicates of vocab across lessons (same exact en-text appears in earlier vocab)
//   2) HARD duplicates of irregular verbs across lessons
//   3) SOFT duplicates: inflected forms in vocab (-s, -es, -ed, -ing, -er, -est) whose base
//      already appears in an earlier lesson's vocabulary
//   4) JUNK in vocabulary (prepositions / articles / conjunctions)
//   5) MISSING from vocab: "main" words used in phrases but not present in any vocab up to this lesson
//   6) Per-lesson summary (counts of vocab, irregular)
//   7) Lessons that are completely missing irregular verbs (data file gap)
//
// Run: node tools/audit/audit_lessons_1_32.mjs

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const APP = path.join(ROOT, 'app');

const FILES = {
  words: path.join(APP, 'lesson_words.tsx'),
  irregular: path.join(APP, 'irregular_verbs_data.ts'),
  d1_8: path.join(APP, 'lesson_data_1_8.ts'),
  d9_16: path.join(APP, 'lesson_data_9_16.ts'),
  d17_24: path.join(APP, 'lesson_data_17_24.ts'),
  d25_32: path.join(APP, 'lesson_data_25_32.ts'),
};

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[.,!?;:"'`()\[\]{}]/g, '') // strip punctuation
    .trim();

// ---------- Parse WORDS_BY_LESSON from lesson_words.tsx ----------
function parseWordsByLesson() {
  const src = fs.readFileSync(FILES.words, 'utf8');
  const start = src.indexOf('const WORDS_BY_LESSON');
  if (start < 0) throw new Error('WORDS_BY_LESSON not found');
  const obj = src.slice(start);
  const result = new Map();

  const headerRe = /^\s{0,4}(\d+):\s*\[\s*$/gm;
  const headers = [];
  let m;
  while ((m = headerRe.exec(obj))) headers.push({ id: Number(m[1]), idx: m.index, after: headerRe.lastIndex });

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const next = i + 1 < headers.length ? headers[i + 1].idx : obj.length;
    const block = obj.slice(h.after, next);
    const endIdx = block.indexOf('\n  ],');
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const items = [];
    const itemRe = /\{\s*en:\s*(['"])((?:\\.|(?!\1).)*?)\1\s*,[^}]*?pos:\s*(['"])([a-z_]+)\3[^}]*?\}/g;
    let im;
    while ((im = itemRe.exec(body))) {
      items.push({ en: im[2], pos: im[4] });
    }
    result.set(h.id, items);
  }
  return result;
}

// ---------- Parse IRREGULAR_VERBS_BY_LESSON ----------
function parseIrregularByLesson() {
  const src = fs.readFileSync(FILES.irregular, 'utf8');
  const result = new Map();
  const headerRe = /^\s{0,4}(\d+):\s*\[\s*$/gm;
  const headers = [];
  let m;
  while ((m = headerRe.exec(src))) headers.push({ id: Number(m[1]), after: headerRe.lastIndex, idx: m.index });
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const next = i + 1 < headers.length ? headers[i + 1].idx : src.length;
    const body = src.slice(h.after, next);
    const items = [];
    const itemRe = /\{\s*base:\s*(['"])((?:\\.|(?!\1).)*?)\1[^}]*?past:\s*(['"])((?:\\.|(?!\3).)*?)\3[^}]*?\}/g;
    let im;
    while ((im = itemRe.exec(body))) items.push({ base: im[2], past: im[4] });
    result.set(h.id, items);
  }
  return result;
}

// ---------- Parse LESSON_X_PHRASES from lesson_data_*.ts files ----------
function parsePhrasesByLesson() {
  const sources = [
    fs.readFileSync(FILES.d1_8, 'utf8'),
    fs.readFileSync(FILES.d9_16, 'utf8'),
    fs.readFileSync(FILES.d17_24, 'utf8'),
    fs.readFileSync(FILES.d25_32, 'utf8'),
  ];

  const result = new Map();
  const blockRe = /export\s+const\s+LESSON_(\d+)_PHRASES[\s\S]*?\=\s*\[/g;

  for (const src of sources) {
    let m;
    while ((m = blockRe.exec(src))) {
      const id = Number(m[1]);
      let i = blockRe.lastIndex;
      let depth = 1;
      while (i < src.length && depth > 0) {
        const ch = src[i];
        if (ch === '[') depth++;
        else if (ch === ']') depth--;
        i++;
      }
      const body = src.slice(blockRe.lastIndex, i - 1);
      const phrases = [];
      const idRe = /(?:^|\s)id:\s*['"`]/g;
      const idIdx = [];
      let im;
      while ((im = idRe.exec(body))) idIdx.push(im.index);
      idIdx.push(body.length);
      for (let p = 0; p < idIdx.length - 1; p++) {
        const seg = body.slice(idIdx[p], idIdx[p + 1]);
        let em = /english:\s*(['"`])((?:\\.|(?!\1).)*?)\1/.exec(seg);
        if (!em) continue;
        const english = em[2];
        let wm = /words:\s*\[([\s\S]*?)\]\s*,?\s*\}\s*,?$/.exec(seg) || /words:\s*\[([\s\S]*?)\]/.exec(seg);
        const words = [];
        if (wm) {
          const wbody = wm[1];
          const wre = /\{\s*text:\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;
          let xm;
          while ((xm = wre.exec(wbody))) words.push(xm[2]);
        }
        phrases.push({ english, words });
      }
      result.set(id, phrases);
    }
  }
  return result;
}

// ---------- Main ----------
const wordsByLesson = parseWordsByLesson();
const irregularByLesson = parseIrregularByLesson();
const phrasesByLesson = parsePhrasesByLesson();

const LESSONS = Array.from({ length: 32 }, (_, i) => i + 1);

function vocabSet(id) {
  return new Set((wordsByLesson.get(id) || []).map((w) => norm(w.en)));
}
function irregularSet(id) {
  return new Set((irregularByLesson.get(id) || []).map((v) => norm(v.base)));
}

const PREPOSITIONS = new Set([
  'a', 'an', 'the',
  'in', 'on', 'at', 'to', 'of', 'for', 'with', 'by', 'from', 'into',
  'onto', 'about', 'over', 'under', 'after', 'before', 'around', 'across',
  'through', 'between', 'among', 'along', 'above', 'below', 'behind',
  'via', 'off', 'out', 'down', 'up', 'because', 'during', 'without',
  'and', 'or', 'but', 'so', 'if', 'as', 'than', 'not', 'against',
]);

const STRUCTURAL = new Set([
  ...PREPOSITIONS,
  'i', 'you', 'he', 'she', 'we', 'they', 'it', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'our', 'their', 'its', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'this', 'that', 'these', 'those',
  'who', 'whom', 'whose', 'which', 'what', 'when', 'where', 'why', 'how',
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'done', 'doing',
  'have', 'has', 'had', 'having',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'please',
]);

// ---------- HARD duplicates ----------
function hardDup(getSet) {
  const seen = new Map();
  const dups = [];
  for (const id of LESSONS) {
    for (const w of getSet(id)) {
      if (seen.has(w)) dups.push({ lesson: id, word: w, firstLesson: seen.get(w) });
      else seen.set(w, id);
    }
  }
  return dups;
}

const vocabDups = hardDup(vocabSet);
const irrDups = hardDup(irregularSet);

// ---------- SOFT (inflected) duplicates of vocab ----------
function inflectedBaseCandidates(w) {
  // returns possible base forms for an inflected English word
  const out = new Set();
  const lw = w.toLowerCase();
  // -s / -es plural / 3rd-sing
  if (lw.endsWith('ies') && lw.length > 3) out.add(lw.slice(0, -3) + 'y');
  if (lw.endsWith('es') && lw.length > 2) out.add(lw.slice(0, -2));
  if (lw.endsWith('s') && lw.length > 1 && !lw.endsWith('ss')) out.add(lw.slice(0, -1));
  // -ed past
  if (lw.endsWith('ied') && lw.length > 3) out.add(lw.slice(0, -3) + 'y');
  if (lw.endsWith('ed') && lw.length > 2) {
    out.add(lw.slice(0, -2));
    out.add(lw.slice(0, -1));
    if (lw.length > 3 && lw[lw.length - 3] === lw[lw.length - 4]) out.add(lw.slice(0, -3));
  }
  // -ing
  if (lw.endsWith('ing') && lw.length > 3) {
    out.add(lw.slice(0, -3));
    out.add(lw.slice(0, -3) + 'e');
    if (lw.length > 4 && lw[lw.length - 4] === lw[lw.length - 5]) out.add(lw.slice(0, -4));
  }
  // -er / -est comparative
  if (lw.endsWith('ier') && lw.length > 3) out.add(lw.slice(0, -3) + 'y');
  if (lw.endsWith('iest') && lw.length > 4) out.add(lw.slice(0, -4) + 'y');
  if (lw.endsWith('er') && lw.length > 2) out.add(lw.slice(0, -2));
  if (lw.endsWith('est') && lw.length > 3) out.add(lw.slice(0, -3));
  return out;
}

const softDups = [];
{
  const seenBefore = new Set(); // running union of all earlier-lesson vocab
  for (const id of LESSONS) {
    const cur = wordsByLesson.get(id) || [];
    for (const w of cur) {
      const en = norm(w.en);
      if (!en) continue;
      // skip if it itself was already a hard duplicate (already reported)
      if (seenBefore.has(en)) continue;
      const candidates = inflectedBaseCandidates(en);
      for (const c of candidates) {
        // skip implausible bases (structural words like 'for', 'she', 'off' shouldn't be the lemma
        // of 'forest', 'shed', 'offer')
        if (STRUCTURAL.has(c)) continue;
        if (c.length < 3) continue;
        if (seenBefore.has(c)) {
          softDups.push({ lesson: id, word: w.en, base: c });
          break;
        }
      }
    }
    for (const w of cur) seenBefore.add(norm(w.en));
  }
}

// ---------- JUNK in vocab ----------
const junkInVocab = [];
for (const id of LESSONS) {
  for (const w of wordsByLesson.get(id) || []) {
    const en = norm(w.en);
    if (PREPOSITIONS.has(en)) junkInVocab.push({ lesson: id, word: w.en, pos: w.pos });
  }
}

// ---------- MISSING content words from phrases ----------
const missingFromVocab = [];
for (const id of LESSONS) {
  const phrases = phrasesByLesson.get(id) || [];
  const globalSeen = new Set();
  for (let prev = 1; prev <= id; prev++) for (const w of vocabSet(prev)) globalSeen.add(w);
  // also count irregular bases as 'seen'
  for (let prev = 1; prev <= id; prev++) for (const w of irregularSet(prev)) globalSeen.add(w);
  const seenInLesson = new Set();
  phrases.forEach((p, pi) => {
    for (const w of p.words) {
      const en = norm(w);
      if (!en) continue;
      if (STRUCTURAL.has(en)) continue;
      if (globalSeen.has(en)) continue;
      // also accept if a base form is seen
      const cands = inflectedBaseCandidates(en);
      let baseSeen = false;
      for (const c of cands) if (globalSeen.has(c)) { baseSeen = true; break; }
      if (baseSeen) continue;
      if (seenInLesson.has(en)) continue;
      seenInLesson.add(en);
      missingFromVocab.push({ lesson: id, word: w, phraseIdx: pi + 1 });
    }
  });
}

// ---------- Lessons missing irregular section in data file ----------
const lessonsWithoutIrregularData = LESSONS.filter((id) => !irregularByLesson.has(id));
// Also: vocab marks word with pos='irregular_verbs' but the data file lacks a verb entry for it
const irregularGapsByLesson = new Map();
{
  // build set of irregular bases already covered up to lesson id
  const cumulative = new Map(); // id -> Set
  let acc = new Set();
  for (const id of LESSONS) {
    acc = new Set([...acc, ...irregularSet(id)]);
    cumulative.set(id, acc);
  }
  for (const id of LESSONS) {
    const list = wordsByLesson.get(id) || [];
    const cov = cumulative.get(id) || new Set();
    for (const w of list) {
      if (w.pos === 'irregular_verbs') {
        const en = norm(w.en);
        if (!cov.has(en)) {
          if (!irregularGapsByLesson.has(id)) irregularGapsByLesson.set(id, []);
          irregularGapsByLesson.get(id).push(w.en);
        }
      }
    }
  }
}

// ---------- Build markdown report ----------
const out = [];
const push = (s = '') => out.push(s);

push('# AUDIT: Уроки 1–32 — словарь и неправильные глаголы');
push('Сгенерировано: ' + new Date().toISOString());
push('');
push('Источники данных:');
push('- `app/lesson_words.tsx` — `WORDS_BY_LESSON` (раздел «Словарь» в уроке)');
push('- `app/irregular_verbs_data.ts` — `IRREGULAR_VERBS_BY_LESSON` (раздел «Неправильные глаголы»)');
push('- `app/lesson_data_*.ts` — `LESSON_*_PHRASES` (фразы для проверки покрытия)');
push('');

push('## Сводка по урокам');
push('| Урок | Слов в словаре | Неправ. глаголов |');
push('|------|----------------|------------------|');
for (const id of LESSONS) {
  const v = (wordsByLesson.get(id) || []).length;
  const ir = (irregularByLesson.get(id) || []).length;
  push(`| ${id} | ${v} | ${ir} |`);
}
push('');

push('================================================================');
push('## 1) ДУБЛИКАТЫ в словаре между уроками');
push('Слово в уроке N, которое уже встречалось в словаре урока M < N.');
push('================================================================');
if (!vocabDups.length) push('OK: точных дубликатов в словаре между уроками нет.');
else {
  const byL = new Map();
  for (const d of vocabDups) {
    if (!byL.has(d.lesson)) byL.set(d.lesson, []);
    byL.get(d.lesson).push(d);
  }
  for (const [lesson, arr] of [...byL].sort((a, b) => a[0] - b[0])) {
    push(`### Урок ${lesson} — ${arr.length} дубл.`);
    for (const d of arr.sort((a, b) => a.word.localeCompare(b.word))) {
      push(`  - \`${d.word}\` (был в уроке ${d.firstLesson})`);
    }
  }
}
push('');

push('================================================================');
push('## 2) ДУБЛИКАТЫ в разделе «Неправильные глаголы»');
push('Глагол в уроке N, базовая форма которого уже встречалась в неправ. глаголах урока M < N.');
push('================================================================');
if (!irrDups.length) push('OK: точных дубликатов в неправильных глаголах между уроками нет.');
else {
  const byL = new Map();
  for (const d of irrDups) {
    if (!byL.has(d.lesson)) byL.set(d.lesson, []);
    byL.get(d.lesson).push(d);
  }
  for (const [lesson, arr] of [...byL].sort((a, b) => a[0] - b[0])) {
    push(`### Урок ${lesson} — ${arr.length} дубл.`);
    for (const d of arr.sort((a, b) => a.word.localeCompare(b.word))) {
      push(`  - \`${d.word}\` (был в уроке ${d.firstLesson})`);
    }
  }
}
push('');

push('================================================================');
push('## 3) МЯГКИЕ дубликаты словаря: словоформы базовой леммы из предыдущего урока');
push('Например: «called» в уроке 11, когда «call» уже был в уроке 3.');
push('Это технически НОВЫЕ строки, но базовая лемма уже преподавалась.');
push('================================================================');
if (!softDups.length) push('OK: мягких дубликатов нет.');
else {
  const byL = new Map();
  for (const d of softDups) {
    if (!byL.has(d.lesson)) byL.set(d.lesson, []);
    byL.get(d.lesson).push(d);
  }
  push(`Всего мягких дубликатов: **${softDups.length}**.`);
  push('');
  for (const [lesson, arr] of [...byL].sort((a, b) => a[0] - b[0])) {
    push(`### Урок ${lesson} — ${arr.length} словоформ`);
    for (const d of arr.sort((a, b) => a.word.localeCompare(b.word))) {
      push(`  - \`${d.word}\` ← базовая «${d.base}» уже была раньше`);
    }
  }
}
push('');

push('================================================================');
push('## 4) Мусор в словаре (предлоги / артикли / союзы)');
push('Эти слова не должны быть в разделе «Словарь» (это служебные слова).');
push('================================================================');
if (!junkInVocab.length) push('OK: служебных слов в словаре нет.');
else {
  const byL = new Map();
  for (const d of junkInVocab) {
    if (!byL.has(d.lesson)) byL.set(d.lesson, []);
    byL.get(d.lesson).push(d);
  }
  push(`Всего мусорных позиций: **${junkInVocab.length}**.`);
  push('');
  for (const [lesson, arr] of [...byL].sort((a, b) => a[0] - b[0])) {
    push(`### Урок ${lesson} — ${arr.length}`);
    for (const d of arr) push(`  - \`${d.word}\` (pos=\`${d.pos}\`)`);
  }
}
push('');

push('================================================================');
push('## 5) Слова из фраз урока, отсутствующие в словарях (накопительно)');
push('«Содержательные» слова (без местоимений, to-be, артиклей, предлогов, демонстративов, please)');
push('которые употреблены в фразах урока, но не встречаются ни в одном словаре до этого урока включительно.');
push('================================================================');
if (!missingFromVocab.length) push('OK: всё покрыто.');
else {
  const byL = new Map();
  for (const d of missingFromVocab) {
    if (!byL.has(d.lesson)) byL.set(d.lesson, []);
    byL.get(d.lesson).push(d);
  }
  push(`Всего пропусков: **${missingFromVocab.length}**.`);
  push('');
  for (const [lesson, arr] of [...byL].sort((a, b) => a[0] - b[0])) {
    push(`### Урок ${lesson} — ${arr.length}`);
    for (const d of arr.sort((a, b) => a.word.localeCompare(b.word))) {
      push(`  - \`${d.word}\` (фраза #${d.phraseIdx})`);
    }
  }
}
push('');

push('================================================================');
push('## 6) Уроки, у которых нет данных в `IRREGULAR_VERBS_BY_LESSON`');
push('================================================================');
if (lessonsWithoutIrregularData.length === 0) push('OK: все 32 урока имеют запись (даже если пустую).');
else {
  push('Урок(и) без записи в файле `irregular_verbs_data.ts`: **' + lessonsWithoutIrregularData.join(', ') + '**');
}
push('');
const lessonsWithEmptyIrregular = LESSONS.filter((id) => irregularByLesson.has(id) && (irregularByLesson.get(id) || []).length === 0);
if (lessonsWithEmptyIrregular.length) {
  push(`Урок(и) с пустым списком неправильных глаголов: **${lessonsWithEmptyIrregular.join(', ')}**`);
  push('');
}

push('================================================================');
push('## 7) В словаре стоит pos=irregular_verbs, но глагола нет в данных неправильных глаголов до этого урока включительно');
push('Здесь словарь маркирует слово как неправильный глагол, но в `IRREGULAR_VERBS_BY_LESSON` его нет.');
push('================================================================');
if (irregularGapsByLesson.size === 0) push('OK: все неправильные глаголы покрыты.');
else {
  for (const [lesson, list] of [...irregularGapsByLesson].sort((a, b) => a[0] - b[0])) {
    push(`### Урок ${lesson} — ${list.length}`);
    for (const w of list) push(`  - \`${w}\``);
  }
}
push('');

const REPORT = path.join(ROOT, 'tools', 'audit', 'AUDIT_LESSONS_1_32.md');
fs.writeFileSync(REPORT, out.join('\n'), 'utf8');
console.log('Report:', REPORT);
console.log('Hard vocab dups:', vocabDups.length);
console.log('Hard irregular dups:', irrDups.length);
console.log('Soft vocab dups (inflected):', softDups.length);
console.log('Junk in vocab:', junkInVocab.length);
console.log('Missing from vocab:', missingFromVocab.length);
console.log('Lessons without irregular data:', lessonsWithoutIrregularData);
console.log('Lessons with empty irregular list:', lessonsWithEmptyIrregular);
console.log('Irregular pos-gaps:', [...irregularGapsByLesson.entries()].map(([k, v]) => `L${k}=${v.length}`).join(' '));
