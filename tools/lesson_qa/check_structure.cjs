// Structural and integrity QA for lessons 1-32.
// Reads lesson files via TypeScript-aware extraction (regex-based, since the
// data is plain JS literals).
//
// Sections covered: A2-A7, B1-B3, C1-C7.

const fs = require('fs');
const path = require('path');

const FILES = [
  { path: 'app/lesson_data_1_8.ts', range: [1, 8] },
  { path: 'app/lesson_data_9_16.ts', range: [9, 16] },
  { path: 'app/lesson_data_17_24.ts', range: [17, 24] },
  { path: 'app/lesson_data_25_32.ts', range: [25, 32] },
];

// ---------- helpers ----------
function loadAsJsModule(tsSource) {
  // Strip TypeScript-only constructs from the source to require() it.
  // We need only the LESSON_N_PHRASES exports.
  let s = tsSource;
  // Remove import statements
  s = s.replace(/^\s*import[^;]*;\s*$/gm, '');
  // Strip type annotations on top-level export const NAME: TYPE = -> export const NAME =
  s = s.replace(/(export\s+const\s+\w+)\s*:\s*[^=]+=/g, '$1 =');
  // Strip "as const" suffixes (rare here but safe)
  s = s.replace(/\bas\s+const\b/g, '');
  // Convert `export const X =` to `module.exports.X =`
  s = s.replace(/export\s+const\s+(\w+)\s*=/g, 'module.exports.$1 =');
  // Convert `export default function` (route shim) to a no-op to avoid syntax issues
  s = s.replace(/export\s+default\s+function[^{]*\{[^}]*\}/g, '');
  return s;
}

function requireLessonFile(filePath) {
  const abs = path.resolve(filePath);
  const tsSrc = fs.readFileSync(abs, 'utf8');
  const jsSrc = loadAsJsModule(tsSrc);
  const wrapped = `(function(module, exports){ ${jsSrc} })`;
  // eslint-disable-next-line no-new-func
  const fn = (0, eval)(wrapped);
  const moduleObj = { exports: {} };
  fn(moduleObj, moduleObj.exports);
  return moduleObj.exports;
}

// ---------- collect ----------
const allPhrasesByLesson = new Map(); // lessonId -> array of phrase objects
const lessonsWithErrors = [];

for (const f of FILES) {
  let mod;
  try {
    mod = requireLessonFile(f.path);
  } catch (e) {
    console.log(`!! Failed to load ${f.path}: ${e.message}`);
    continue;
  }
  for (let id = f.range[0]; id <= f.range[1]; id++) {
    const arr = mod[`LESSON_${id}_PHRASES`];
    if (!Array.isArray(arr)) {
      lessonsWithErrors.push({ id, why: 'LESSON_X_PHRASES not exported as array' });
      continue;
    }
    allPhrasesByLesson.set(id, arr);
  }
}

// ---------- A2: lessons 1..32 present ----------
const missing = [];
for (let i = 1; i <= 32; i++) if (!allPhrasesByLesson.has(i)) missing.push(i);

// ---------- A3, A4, A5: ID uniqueness and naming ----------
const dupWithinLesson = []; // {lessonId, id, occurrences}
const dupAcrossLessons = []; // {id, lessons:[]}
const idMismatchLesson = []; // {lessonId, id} — pattern doesn't match
const globalIdMap = new Map(); // id -> [lessonId,...]

for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  const seen = new Map();
  for (let idx = 0; idx < phrases.length; idx++) {
    const p = phrases[idx];
    const id = p && p.id != null ? String(p.id) : null;
    if (!id) continue;
    seen.set(id, (seen.get(id) || 0) + 1);

    const inGlobal = globalIdMap.get(id) || [];
    if (!inGlobal.includes(lessonId)) inGlobal.push(lessonId);
    globalIdMap.set(id, inGlobal);

    // A5: id should reference its lesson number
    // Patterns observed: 'lesson1_phrase_1', 'l21p45'
    const patterns = [
      new RegExp(`^lesson${lessonId}_phrase_\\d+$`),
      new RegExp(`^l${lessonId}p\\d+$`, 'i'),
      new RegExp(`^lesson${lessonId}_p\\d+$`),
    ];
    const matches = patterns.some((re) => re.test(id));
    if (!matches) idMismatchLesson.push({ lessonId, id });
  }
  for (const [id, n] of seen) {
    if (n > 1) dupWithinLesson.push({ lessonId, id, occurrences: n });
  }
}
for (const [id, lessons] of globalIdMap) {
  if (lessons.length > 1) dupAcrossLessons.push({ id, lessons });
}

// ---------- A6: required fields ----------
const missingFields = [];
for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const idLabel = (p && p.id) || `[idx ${i}]`;
    const lacks = [];
    if (!p || typeof p.english !== 'string' || !p.english.trim()) lacks.push('english');
    if (!p || typeof p.russian !== 'string' || !p.russian.trim()) lacks.push('russian');
    if (!p || typeof p.ukrainian !== 'string' || !p.ukrainian.trim()) lacks.push('ukrainian');
    if (!p || !Array.isArray(p.words) || p.words.length === 0) lacks.push('words[]');
    if (lacks.length) missingFields.push({ lessonId, id: idLabel, lacks });
  }
}

// ---------- A7: phrase counts per lesson ----------
const counts = [];
for (let i = 1; i <= 32; i++) {
  counts.push({ id: i, count: allPhrasesByLesson.get(i)?.length ?? 0 });
}

// ---------- B1: words.text joined === english ----------
const puzzleMismatch = [];
for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  for (const p of phrases) {
    if (!p || !Array.isArray(p.words)) continue;
    const joined = p.words.map((w) => (w && typeof w.text === 'string' ? w.text : '')).join(' ');
    if (joined !== p.english) {
      puzzleMismatch.push({
        lessonId,
        id: p.id,
        english: p.english,
        joined,
      });
    }
  }
}

// ---------- B2: text === correct, B3: empty fields ----------
const textCorrectMismatch = [];
const emptyWordFields = [];
for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  for (const p of phrases) {
    if (!p || !Array.isArray(p.words)) continue;
    for (let wi = 0; wi < p.words.length; wi++) {
      const w = p.words[wi];
      if (!w) continue;
      if (typeof w.text !== 'string' || w.text.length === 0) emptyWordFields.push({ lessonId, id: p.id, wi, missing: 'text' });
      if (typeof w.correct !== 'string' || w.correct.length === 0) emptyWordFields.push({ lessonId, id: p.id, wi, missing: 'correct' });
      if (typeof w.text === 'string' && typeof w.correct === 'string' && w.text !== w.correct) {
        textCorrectMismatch.push({ lessonId, id: p.id, wi, text: w.text, correct: w.correct });
      }
    }
  }
}

// ---------- C1: count, C2: dup within word, C3: vs correct, C4: vs other word.text, C5/C6/C7 ----------
const cIssues = {
  countNot5: [],
  dupWithinWord: [],
  equalsCorrect: [],
  collidesWithOtherWord: [],
  lengthFar: [],
  capMismatch: [],
  punctMismatch: [],
};

const trailingPunct = (s) => {
  const m = s.match(/[\.\!\?\,\;\:]+$/);
  return m ? m[0] : '';
};
const stripPunct = (s) => s.replace(/[\.\!\?\,\;\:]+$/, '');

for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  for (const p of phrases) {
    if (!p || !Array.isArray(p.words)) continue;
    const phraseTextSet = new Set(p.words.map((w) => (w?.text || '').toLowerCase()));
    for (let wi = 0; wi < p.words.length; wi++) {
      const w = p.words[wi];
      if (!w || !Array.isArray(w.distractors)) continue;
      const correct = w.correct || w.text || '';
      const dists = w.distractors;

      if (dists.length !== 5) cIssues.countNot5.push({ lessonId, id: p.id, wi, correct, count: dists.length });

      const lower = dists.map((d) => String(d).toLowerCase());
      const seen = new Map();
      for (const d of lower) seen.set(d, (seen.get(d) || 0) + 1);
      for (const [d, n] of seen) if (n > 1) cIssues.dupWithinWord.push({ lessonId, id: p.id, wi, correct, dup: d });

      const correctLower = correct.toLowerCase();
      for (const d of lower) {
        if (d === correctLower) cIssues.equalsCorrect.push({ lessonId, id: p.id, wi, correct, distractor: d });
      }

      for (const d of lower) {
        if (phraseTextSet.has(d) && d !== correctLower) {
          cIssues.collidesWithOtherWord.push({ lessonId, id: p.id, wi, correct, distractor: d });
        }
      }

      // length check vs correct
      for (const d of dists) {
        const dl = String(d).length;
        const cl = correct.length;
        if (Math.abs(dl - cl) > 2) cIssues.lengthFar.push({ lessonId, id: p.id, wi, correct, distractor: d, dl, cl });
      }

      // capitalization (initial char)
      const capCorrect = correct.charAt(0);
      const correctIsUpper = capCorrect === capCorrect.toUpperCase() && capCorrect !== capCorrect.toLowerCase();
      for (const d of dists) {
        const dc = String(d).charAt(0);
        const dIsUpper = dc === dc.toUpperCase() && dc !== dc.toLowerCase();
        if (dc && capCorrect && correctIsUpper !== dIsUpper) {
          cIssues.capMismatch.push({ lessonId, id: p.id, wi, correct, distractor: d });
        }
      }

      // trailing punct
      const cPunct = trailingPunct(correct);
      for (const d of dists) {
        const dPunct = trailingPunct(String(d));
        if (cPunct !== dPunct) cIssues.punctMismatch.push({ lessonId, id: p.id, wi, correct, distractor: d, cPunct, dPunct });
      }
    }
  }
}

// ---------- output ----------
function pr(label, items, take = 15, fmt) {
  console.log(`\n=== ${label}: ${items.length} ===`);
  if (items.length === 0) return;
  for (const it of items.slice(0, take)) console.log('  ' + (fmt ? fmt(it) : JSON.stringify(it)));
  if (items.length > take) console.log(`  … and ${items.length - take} more`);
}

console.log('===== A. STRUCTURE =====');
pr('A2 missing lesson IDs (1..32)', missing.map((id) => ({ id })));
pr('A3 duplicate IDs WITHIN a lesson', dupWithinLesson);
pr('A4 duplicate IDs ACROSS lessons', dupAcrossLessons, 30);
pr('A5 phrase id does not reference its lesson number', idMismatchLesson, 30, (it) => `lesson ${it.lessonId}: id="${it.id}"`);
pr('A6 phrases missing required fields', missingFields, 30);
console.log('\n=== A7 phrase count per lesson ===');
let minC = Infinity, maxC = -Infinity;
for (const c of counts) { if (c.count < minC) minC = c.count; if (c.count > maxC) maxC = c.count; }
console.log('  min=' + minC + '  max=' + maxC);
console.log('  ' + counts.map((c) => `L${c.id}=${c.count}`).join(', '));

console.log('\n===== B. WORDS ↔ PHRASE =====');
pr('B1 words.join(" ") != english', puzzleMismatch, 25, (it) => `lesson ${it.lessonId} id=${it.id}\n     english="${it.english}"\n     joined ="${it.joined}"`);
pr('B2 word.text != word.correct', textCorrectMismatch, 25, (it) => `lesson ${it.lessonId} id=${it.id} wi=${it.wi} text="${it.text}" correct="${it.correct}"`);
pr('B3 empty word.text or word.correct', emptyWordFields, 20);

console.log('\n===== C. DISTRACTORS =====');
pr('C1 distractor count != 5', cIssues.countNot5, 25, (it) => `lesson ${it.lessonId} id=${it.id} wi=${it.wi} correct="${it.correct}" count=${it.count}`);
pr('C2 duplicate distractors within word', cIssues.dupWithinWord, 25);
pr('C3 distractor == correct', cIssues.equalsCorrect, 25, (it) => `lesson ${it.lessonId} id=${it.id} wi=${it.wi} correct="${it.correct}" distractor="${it.distractor}"`);
pr('C4 distractor collides with another word.text in same phrase', cIssues.collidesWithOtherWord, 25, (it) => `lesson ${it.lessonId} id=${it.id} wi=${it.wi} correct="${it.correct}" distractor="${it.distractor}"`);
pr('C5 distractor length |Δ|>2 vs correct (warning)', cIssues.lengthFar, 30, (it) => `lesson ${it.lessonId} id=${it.id} wi=${it.wi} correct="${it.correct}"(${it.cl}) distractor="${it.distractor}"(${it.dl})`);
pr('C6 capitalization mismatch distractor vs correct', cIssues.capMismatch, 30, (it) => `lesson ${it.lessonId} id=${it.id} wi=${it.wi} correct="${it.correct}" distractor="${it.distractor}"`);
pr('C7 trailing punctuation mismatch distractor vs correct', cIssues.punctMismatch, 30, (it) => `lesson ${it.lessonId} id=${it.id} wi=${it.wi} correct="${it.correct}"(${it.cPunct||'∅'}) distractor="${it.distractor}"(${it.dPunct||'∅'})`);
