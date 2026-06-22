// Exports quizzes, vocabulary words, and intro examples to JSON for the
// full-content semantic audit. Read-only; uses bracket-balanced literal slicing.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = resolve(__dirname, '..', '..', 'app');

// --- generic: slice a `const NAME ... = [ ... ]` array literal and eval it ---
function sliceArrayLiteral(src, declRe) {
  const m = declRe.exec(src);
  if (!m) return null;
  const start = src.indexOf('[', m.index + m[0].length - 1);
  let depth = 0, i = start, inStr = null;
  for (; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
  }
  return src.slice(start, i);
}

// ---------- QUIZZES ----------
const quizSrc = readFileSync(resolve(APP, 'quiz_data.ts'), 'utf8');
const quizzes = [];
for (const pool of ['EASY', 'MEDIUM', 'HARD']) {
  const lit = sliceArrayLiteral(quizSrc, new RegExp('const ' + pool + '_POOL\\s*:\\s*QuizPoolEntry\\[\\]\\s*='));
  if (!lit) { console.error('quiz pool not found:', pool); continue; }
  const arr = eval('(' + lit + ')');
  arr.forEach((q, idx) => {
    const correctIdx = Array.isArray(q.correct) ? q.correct : [q.correct];
    quizzes.push({
      src: 'quiz', pool, idx,
      ru: q.ru, uk: q.uk, choices: q.choices,
      correct: q.correct,
      correctText: correctIdx.map(i => q.choices[i]),
      lessonNum: q.lessonNum, level: q.level,
      explanations: q.explanations,
    });
  });
}

// ---------- VOCAB WORDS ----------
// lesson_words.tsx: a big object literal `const X = { key: {en,ru,uk,...}, ... }`.
// We extract every `{ en: '...', ru: '...', uk: '...' ... }` record cheaply.
const wordsSrc = readFileSync(resolve(APP, 'lesson_words.tsx'), 'utf8');
const words = [];
const wordRe = /\{\s*en:\s*'((?:[^'\\]|\\.)*)'\s*,\s*ru:\s*'((?:[^'\\]|\\.)*)'\s*,\s*uk:\s*'((?:[^'\\]|\\.)*)'/g;
let wm;
while ((wm = wordRe.exec(wordsSrc)) !== null) {
  words.push({ src: 'word', en: wm[1], ru: wm[2], uk: wm[3] });
}

// ---------- INTRO EXAMPLES ----------
// Each *_v2.ts has examples with `en: [parts]` then `ru:` `uk:` OR `trRU:`/`trUK:`.
import { readdirSync } from 'node:fs';
const introFiles = readdirSync(APP).filter(f => /^lesson_intro_screens.*\.ts$/.test(f));
const intros = [];
for (const f of introFiles) {
  const s = readFileSync(resolve(APP, f), 'utf8');
  // Pattern A: en: [ ...parts... ], ru: '...', uk: '...'
  const reA = /en:\s*\[(.*?)\]\s*,\s*ru:\s*'((?:[^'\\]|\\.)*)'\s*,\s*uk:\s*'((?:[^'\\]|\\.)*)'/gs;
  let m;
  while ((m = reA.exec(s)) !== null) {
    const enText = [...m[1].matchAll(/text:\s*'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]).join('');
    intros.push({ src: 'intro', file: f, en: enText.trim(), ru: m[2], uk: m[3] });
  }
  // Pattern B: en: '...', trRU: '...', trUK: '...'
  const reB = /en:\s*'((?:[^'\\]|\\.)*)'\s*,\s*trRU:\s*'((?:[^'\\]|\\.)*)'\s*,\s*trUK:\s*'((?:[^'\\]|\\.)*)'/g;
  while ((m = reB.exec(s)) !== null) {
    intros.push({ src: 'intro', file: f, en: m[1], ru: m[2], uk: m[3] });
  }
}

writeFileSync(resolve(__dirname, 'CONTENT_QUIZZES.json'), JSON.stringify(quizzes), 'utf8');
writeFileSync(resolve(__dirname, 'CONTENT_WORDS.json'), JSON.stringify(words), 'utf8');
writeFileSync(resolve(__dirname, 'CONTENT_INTROS.json'), JSON.stringify(intros), 'utf8');
console.log('quizzes:', quizzes.length, '| words:', words.length, '| intro examples:', intros.length);
