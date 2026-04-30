// Translation, typography and encoding QA for lessons 1-32 (sections D, E, F, G).
const fs = require('fs');
const path = require('path');

const FILES = [
  { path: 'app/lesson_data_1_8.ts', range: [1, 8] },
  { path: 'app/lesson_data_9_16.ts', range: [9, 16] },
  { path: 'app/lesson_data_17_24.ts', range: [17, 24] },
  { path: 'app/lesson_data_25_32.ts', range: [25, 32] },
];

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
  const tsSrc = fs.readFileSync(path.resolve(filePath), 'utf8');
  const jsSrc = loadAsJsModule(tsSrc);
  const fn = (0, eval)(`(function(module, exports){ ${jsSrc} })`);
  const m = { exports: {} };
  fn(m, m.exports);
  return m.exports;
}

const allPhrasesByLesson = new Map();
for (const f of FILES) {
  let mod;
  try { mod = requireLessonFile(f.path); } catch (e) { console.log('!! '+f.path+' '+e.message); continue; }
  for (let id = f.range[0]; id <= f.range[1]; id++) {
    const arr = mod[`LESSON_${id}_PHRASES`];
    if (Array.isArray(arr)) allPhrasesByLesson.set(id, arr);
  }
}

// ---------- D. Translations ----------
const dRuEqEng = [];
const dUkEqEng = [];
const dRuEqUk = [];   // long phrases only — warning
const dAlt = [];

for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  for (const p of phrases) {
    if (!p) continue;
    const en = String(p.english || '').trim();
    const ru = String(p.russian || '').trim();
    const uk = String(p.ukrainian || '').trim();
    if (en && ru && en.toLowerCase() === ru.toLowerCase()) dRuEqEng.push({ lessonId, id: p.id, en });
    if (en && uk && en.toLowerCase() === uk.toLowerCase()) dUkEqEng.push({ lessonId, id: p.id, en });
    if (ru && uk && ru === uk && ru.length > 12) dRuEqUk.push({ lessonId, id: p.id, ru });

    if (Array.isArray(p.alternatives)) {
      const seen = new Set();
      for (const a of p.alternatives) {
        const v = String(a || '').trim();
        if (!v) dAlt.push({ lessonId, id: p.id, kind: 'empty alternative' });
        else if (seen.has(v.toLowerCase())) dAlt.push({ lessonId, id: p.id, kind: 'duplicate alternative: ' + v });
        seen.add(v.toLowerCase());
      }
    }
  }
}

// ---------- E. Typography ----------
const eDoubleSpace = [];
const eEdgeSpace = [];
const eSpaceBeforePunct = [];
const eDashHits = { hyphen: 0, en: 0, em: 0 };
const eEllipsisDots = [];
const eEllipsisChar = [];
const eInvisible = [];
const eUkApostrUnicode = [];

const checkText = (lessonId, id, field, text) => {
  if (typeof text !== 'string') return;
  if (/  /.test(text)) eDoubleSpace.push({ lessonId, id, field, text });
  if (/^\s|\s$/.test(text)) eEdgeSpace.push({ lessonId, id, field, text });
  if (/ [,.;:?!]/.test(text)) eSpaceBeforePunct.push({ lessonId, id, field, text });
  if ((text.match(/-/g) || []).length) eDashHits.hyphen += (text.match(/-/g) || []).length;
  if ((text.match(/–/g) || []).length) eDashHits.en += (text.match(/–/g) || []).length;
  if ((text.match(/—/g) || []).length) eDashHits.em += (text.match(/—/g) || []).length;
  if (/\.\.\./.test(text)) eEllipsisDots.push({ lessonId, id, field, text });
  if (/…/.test(text)) eEllipsisChar.push({ lessonId, id, field, text });
  if (/[\u00A0\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060\uFEFF]/.test(text)) eInvisible.push({ lessonId, id, field, text });
  // Ukrainian apostrophe via U+2019 inside a Cyrillic word
  if (/[\u0400-\u04FF]\u2019[\u0400-\u04FF]/.test(text)) eUkApostrUnicode.push({ lessonId, id, field, text });
};

for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  for (const p of phrases) {
    checkText(lessonId, p.id, 'english', p.english);
    checkText(lessonId, p.id, 'russian', p.russian);
    checkText(lessonId, p.id, 'ukrainian', p.ukrainian);
    if (Array.isArray(p.words)) for (let wi = 0; wi < p.words.length; wi++) {
      const w = p.words[wi];
      if (!w) continue;
      checkText(lessonId, p.id, `words[${wi}].text`, w.text);
      if (Array.isArray(w.distractors)) for (let di = 0; di < w.distractors.length; di++) {
        checkText(lessonId, p.id, `words[${wi}].distractors[${di}]`, w.distractors[di]);
      }
    }
  }
}

// ---------- F. Encoding (file-level) ----------
const fIssues = [];
for (const f of FILES) {
  const buf = fs.readFileSync(path.resolve(f.path));
  const bom = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  if (bom) fIssues.push({ file: f.path, kind: 'BOM at file start' });
  // mojibake heuristics
  const text = buf.toString('utf8');
  const mojibakeMatches = text.match(/[ÐÑÃÂ][\u0080-\u00FF]/g);
  if (mojibakeMatches && mojibakeMatches.length) fIssues.push({ file: f.path, kind: 'mojibake hits: ' + mojibakeMatches.length });
  if (/\uFFFD/.test(text)) fIssues.push({ file: f.path, kind: 'replacement char U+FFFD found' });
  if (/&[a-z]+;|&#\d+;|&#x[0-9a-fA-F]+;/.test(text)) fIssues.push({ file: f.path, kind: 'HTML entity found' });
  // raw invalid UTF-8 already validated by readFileSync('utf8') silently — do explicit pass:
  let invalid = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b < 0x80) continue;
    if (b >= 0xC2 && b <= 0xDF) { if (i+1 >= buf.length || (buf[i+1]&0xC0)!==0x80) invalid++; i++; }
    else if (b >= 0xE0 && b <= 0xEF) { if (i+2 >= buf.length || (buf[i+1]&0xC0)!==0x80 || (buf[i+2]&0xC0)!==0x80) invalid++; i+=2; }
    else if (b >= 0xF0 && b <= 0xF4) { if (i+3 >= buf.length || (buf[i+1]&0xC0)!==0x80 || (buf[i+2]&0xC0)!==0x80 || (buf[i+3]&0xC0)!==0x80) invalid++; i+=3; }
    else invalid++;
  }
  if (invalid) fIssues.push({ file: f.path, kind: 'invalid UTF-8 bytes: ' + invalid });
}

// ---------- G. Capitalization & sentence punctuation ----------
const gFirstNotUpper = [];
const gPunctMismatch = [];
const gAllCaps = [];

const firstChar = (s) => { const c = (s || '').trim().charAt(0); return c; };
const isUpper = (c) => c && c === c.toUpperCase() && c !== c.toLowerCase();
const tail = (s) => { const m = (s || '').trim().match(/[\.\!\?]+$/); return m ? m[0] : ''; };

for (const [lessonId, phrases] of allPhrasesByLesson.entries()) {
  for (const p of phrases) {
    if (!p) continue;
    for (const field of ['english', 'russian', 'ukrainian']) {
      const t = String(p[field] || '');
      const c = firstChar(t);
      if (c && /\p{L}/u.test(c) && !isUpper(c)) gFirstNotUpper.push({ lessonId, id: p.id, field, text: t });
      // ALL CAPS detection: long, has letters, all-uppercase
      const letters = (t.match(/\p{L}/gu) || []);
      const upperLetters = letters.filter((ch) => ch === ch.toUpperCase() && ch !== ch.toLowerCase());
      if (letters.length >= 5 && upperLetters.length === letters.length) gAllCaps.push({ lessonId, id: p.id, field, text: t });
    }
    const tEn = tail(p.english);
    const tRu = tail(p.russian);
    const tUk = tail(p.ukrainian);
    if (tEn !== tRu || tEn !== tUk) gPunctMismatch.push({ lessonId, id: p.id, en: tEn || '∅', ru: tRu || '∅', uk: tUk || '∅', english: p.english, russian: p.russian, ukrainian: p.ukrainian });
  }
}

// ---------- output ----------
function pr(label, items, take = 20, fmt) {
  console.log(`\n=== ${label}: ${items.length} ===`);
  if (!items.length) return;
  for (const it of items.slice(0, take)) console.log('  ' + (fmt ? fmt(it) : JSON.stringify(it)));
  if (items.length > take) console.log(`  ... and ${items.length - take} more`);
}

console.log('===== D. TRANSLATIONS =====');
pr('D1 russian == english', dRuEqEng, 25, (it) => `lesson ${it.lessonId} id=${it.id}  en="${it.en}"`);
pr('D2 ukrainian == english', dUkEqEng, 25, (it) => `lesson ${it.lessonId} id=${it.id}  en="${it.en}"`);
pr('D3 russian == ukrainian (long phrase >12 chars)', dRuEqUk, 25, (it) => `lesson ${it.lessonId} id=${it.id}  text="${it.ru}"`);
pr('D4 alternatives issues', dAlt, 25);

console.log('\n===== E. TYPOGRAPHY =====');
pr('E1a double space', eDoubleSpace, 25);
pr('E1b leading/trailing whitespace', eEdgeSpace, 25);
pr('E1c space before punctuation', eSpaceBeforePunct, 25);
console.log('\n=== E2 dash usage ===');
console.log(`  hyphen "-": ${eDashHits.hyphen}, en-dash "–": ${eDashHits.en}, em-dash "—": ${eDashHits.em}`);
pr('E3a "..." (3 dots)', eEllipsisDots, 25);
pr('E3b "…" (single char)', eEllipsisChar, 25);
pr('E4 invisible characters in text/distractors', eInvisible, 25);
pr('E5 Ukrainian apostrophe via U+2019 in word', eUkApostrUnicode, 25);

console.log('\n===== F. ENCODING =====');
pr('F.* file-level encoding issues', fIssues, 25);

console.log('\n===== G. CAPITALIZATION & SENTENCE PUNCTUATION =====');
pr('G1 first letter not uppercase', gFirstNotUpper, 25, (it) => `lesson ${it.lessonId} id=${it.id} [${it.field}] "${it.text}"`);
pr('G2 trailing punctuation differs across en/ru/uk', gPunctMismatch, 30, (it) => `lesson ${it.lessonId} id=${it.id}  en=${it.en}  ru=${it.ru}  uk=${it.uk}\n     en="${it.english}"\n     ru="${it.russian}"\n     uk="${it.ukrainian}"`);
pr('G3 ALL CAPS detected', gAllCaps, 25, (it) => `lesson ${it.lessonId} id=${it.id} [${it.field}] "${it.text}"`);
