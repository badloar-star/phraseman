// Token-count audit for lessons 1-32.
//
// Goal: make sure phrase.words.length exactly matches the token count in
// phrase.english (split by whitespace).
//
// This is the key invariant for the validation flow in lesson1.tsx:
//   - canonical token list = phrase.words.map(w => w.correct) (see getPhraseTokens)
//   - validation is triggered when phraseWordIdx === phrase.words.length
//   - displayed text = cleanPhraseForDisplay(english), which strips '-' markers
//
// If words.length != english token count, the user can either fill more slots
// than visible or trigger validation before the visible sentence is complete.

const fs = require('fs');
const path = require('path');

const FILES = [
  { path: 'app/lesson_data_1_8.ts', range: [1, 8] },
  { path: 'app/lesson_data_9_16.ts', range: [9, 16] },
  { path: 'app/lesson_data_17_24.ts', range: [17, 24] },
  { path: 'app/lesson_data_25_32.ts', range: [25, 32] },
];

// ---------- TS -> eval helper ----------
function loadAsJsModule(tsSource) {
  let s = tsSource;
  s = s.replace(/^\s*import[^;]*;\s*$/gm, '');
  s = s.replace(/(export\s+const\s+\w+)\s*:\s*[^=]+=/g, '$1 =');
  s = s.replace(/\bas\s+const\b/g, '');
  s = s.replace(/export\s+const\s+(\w+)\s*=/g, 'module.exports.$1 =');
  s = s.replace(/export\s+default\s+function[^{]*\{[^}]*\}/g, '');
  return s;
}

function requireLessonFile(filePath) {
  const abs = path.resolve(filePath);
  const tsSrc = fs.readFileSync(abs, 'utf8');
  const jsSrc = loadAsJsModule(tsSrc);
  const wrapped = `(function(module, exports){ ${jsSrc} })`;
  const fn = (0, eval)(wrapped);
  const moduleObj = { exports: {} };
  fn(moduleObj, moduleObj.exports);
  return moduleObj.exports;
}

// ---------- collect phrases ----------
const allPhrasesByLesson = new Map();
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
    if (!Array.isArray(arr)) continue;
    allPhrasesByLesson.set(id, arr);
  }
}

// ---------- helpers ----------
const stripTrailingPunct = (s) => s.replace(/[.!?,;:]+$/, '');
const tokenizeEnglish = (english) =>
  english.split(/\s+/).filter((t) => t.length > 0);

// ---------- audit ----------
// CRITICAL: words.length != english tokens count
const critCountMismatch = [];
// CRITICAL: english has double spaces / empty tokens with naive split
const critDoubleSpace = [];
// CRITICAL: empty/whitespace-only word.text or word.correct
const critEmptyWord = [];
// WARN: words[i].text does not match english tokens[i] after strip punctuation
const warnTextMismatch = [];
// INFO: punctuation only (trailing punctuation exists in english but not words[last].text)
const infoPunctOnly = [];
// INFO: zero-article positions ('-')
const infoZeroArticle = [];

const perLessonStats = new Map(); // lessonId -> { total, critical }

for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  let critical = 0;
  for (const p of phrases) {
    if (!p || typeof p.english !== 'string' || !Array.isArray(p.words)) continue;

    // Sanity: double spaces in english can confuse tokenization.
    if (/\s{2,}|^\s|\s$/.test(p.english)) {
      critDoubleSpace.push({ lessonId, id: p.id, english: p.english });
      critical++;
    }

    // Sanity: empty / whitespace-only words
    for (let wi = 0; wi < p.words.length; wi++) {
      const w = p.words[wi];
      const t = w && typeof w.text === 'string' ? w.text : '';
      const c = w && typeof w.correct === 'string' ? w.correct : '';
      if (t.trim() === '' || c.trim() === '') {
        critEmptyWord.push({ lessonId, id: p.id, wi, text: t, correct: c });
        critical++;
      }
    }

    const enTokens = tokenizeEnglish(p.english);
    const wTokens = p.words.map((w) => (w && typeof w.text === 'string' ? w.text : ''));

    // Track zero-article positions for information.
    const zeroIdx = wTokens
      .map((t, i) => (t === '-' ? i : -1))
      .filter((i) => i >= 0);
    if (zeroIdx.length > 0) {
      infoZeroArticle.push({
        lessonId,
        id: p.id,
        english: p.english,
        zeroIdx,
        zeroCount: zeroIdx.length,
      });
    }

    if (enTokens.length !== wTokens.length) {
      critCountMismatch.push({
        lessonId,
        id: p.id,
        english: p.english,
        enCount: enTokens.length,
        wCount: wTokens.length,
        diff: wTokens.length - enTokens.length,
        enTokens,
        wTokens,
      });
      critical++;
      continue;
    }

    // Same length: compare token-by-token.
    let punctOnly = true;
    const tokenMismatches = [];
    for (let i = 0; i < enTokens.length; i++) {
      const en = enTokens[i];
      const w = wTokens[i];
      if (en === w) continue;
      const enClean = stripTrailingPunct(en);
      const wClean = stripTrailingPunct(w);
      if (enClean === wClean) {
        tokenMismatches.push({ i, en, w, kind: 'punct' });
      } else {
        punctOnly = false;
        tokenMismatches.push({ i, en, w, kind: 'text' });
      }
    }
    if (tokenMismatches.length === 0) continue;
    if (punctOnly) {
      infoPunctOnly.push({ lessonId, id: p.id, english: p.english, mismatches: tokenMismatches });
    } else {
      warnTextMismatch.push({ lessonId, id: p.id, english: p.english, mismatches: tokenMismatches });
    }
  }
  perLessonStats.set(lessonId, { total: phrases.length, critical });
}

// ---------- output ----------
function pr(label, items, take = 25, fmt) {
  console.log(`\n=== ${label}: ${items.length} ===`);
  if (items.length === 0) return;
  for (const it of items.slice(0, take)) console.log('  ' + (fmt ? fmt(it) : JSON.stringify(it)));
  if (items.length > take) console.log(`  ... and ${items.length - take} more`);
}

console.log('===== TOKEN COUNT AUDIT (lessons 1-32) =====\n');

console.log('Per-lesson summary (CRITICAL count mismatches):');
const breakdown = [];
let totalPhrases = 0, totalCrit = 0;
for (let i = 1; i <= 32; i++) {
  const s = perLessonStats.get(i);
  if (!s) { breakdown.push(`L${i}=MISSING`); continue; }
  totalPhrases += s.total;
  totalCrit += s.critical;
  breakdown.push(`L${i}=${s.critical}/${s.total}`);
}
console.log('  ' + breakdown.join(', '));
console.log(`  TOTAL: ${totalCrit} CRITICAL / ${totalPhrases} phrases\n`);

pr(
  'CRITICAL words.length != english.split(" ").length',
  critCountMismatch,
  100,
  (it) =>
    `L${it.lessonId} id=${it.id} en=${it.enCount} words=${it.wCount} (diff ${it.diff > 0 ? '+' : ''}${it.diff})\n` +
    `     english="${it.english}"\n` +
    `     enTokens=[${it.enTokens.map((t) => `"${t}"`).join(', ')}]\n` +
    `     wTokens =[${it.wTokens.map((t) => `"${t}"`).join(', ')}]`
);

pr(
  'CRITICAL english has double spaces / leading-trailing whitespace',
  critDoubleSpace,
  30,
  (it) => `L${it.lessonId} id=${it.id} english="${it.english}"`
);

pr(
  'CRITICAL empty word.text or word.correct',
  critEmptyWord,
  30,
  (it) => `L${it.lessonId} id=${it.id} wi=${it.wi} text="${it.text}" correct="${it.correct}"`
);

pr(
  'WARN words.text != english token (real text mismatch)',
  warnTextMismatch,
  40,
  (it) =>
    `L${it.lessonId} id=${it.id}\n` +
    `     english="${it.english}"\n` +
    `     mismatches=${it.mismatches
      .map((m) => `[${m.i}] "${m.en}" != "${m.w}"`)
      .join(', ')}`
);

pr(
  'INFO punctuation-only mismatches (trailing ?/./, etc.)',
  infoPunctOnly,
  30,
  (it) =>
    `L${it.lessonId} id=${it.id} english="${it.english}" mm=${it.mismatches
      .map((m) => `[${m.i}] "${m.en}"<>"${m.w}"`)
      .join(', ')}`
);

pr(
  'INFO zero-article positions (text="-", auto-filled)',
  infoZeroArticle,
  20,
  (it) =>
    `L${it.lessonId} id=${it.id} zeroIdx=[${it.zeroIdx.join(', ')}] english="${it.english}"`
);
