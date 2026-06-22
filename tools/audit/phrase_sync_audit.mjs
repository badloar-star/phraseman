// Deterministic auditor for lesson phrase data: finds mechanical cross-language
// and word-bank desyncs that confuse users. Run: node tools/audit/phrase_sync_audit.mjs
// Pure read-only: parses the 4 live gen files via regex-free TS-strip + dynamic import.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP = resolve(__dirname, '..', '..', 'app');

// The 4 live files and their lesson ranges.
const FILES = [
  { path: resolve(APP, 'lesson_data_1_8_phrases_es.gen.ts'), lessons: [1, 2, 3, 4, 5, 6, 7, 8] },
  { path: resolve(APP, 'lesson_data_9_16_phrases_es.gen.ts'), lessons: [9, 10, 11, 12, 13, 14, 15, 16] },
  { path: resolve(APP, 'lesson_data_17_24.ts'), lessons: [17, 18, 19, 20, 21, 22, 23, 24] },
  { path: resolve(APP, 'lesson_data_25_32.ts'), lessons: [25, 26, 27, 28, 29, 30, 31, 32] },
];

// --- Extract phrase object literals without executing TS (the files import types). ---
// We slice each `LESSON_N_PHRASES` array literal and eval it as plain JS.
function extractArrays(src) {
  const out = {};
  const re = /export const (LESSON_\d+_PHRASES)\s*:\s*LessonPhrase\[\]\s*=\s*\[/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const start = re.lastIndex - 1; // at the '['
    // balance brackets to find the matching ']'
    let depth = 0, i = start, inStr = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
      if (c === '[') depth++;
      else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
    }
    const literal = src.slice(start, i);
    // eslint-disable-next-line no-eval
    out[name] = eval('(' + literal + ')');
  }
  return out;
}

const phrasesByLesson = {};
for (const f of FILES) {
  const src = readFileSync(f.path, 'utf8');
  const arrays = extractArrays(src);
  for (const [name, arr] of Object.entries(arrays)) {
    const n = Number(name.match(/LESSON_(\d+)_PHRASES/)[1]);
    phrasesByLesson[n] = { file: f.path.split(/[\\/]/).pop(), phrases: arr };
  }
}

// --- Helpers mirroring phrase_target_utils.ts ---
function stripMarkers(word) {
  const stripped = String(word)
    .replace(/^\/|\/$/g, '')
    .replace(/«-»/g, '')
    .replace(/[«»]/g, '')
    .replace(/[.!?,;]+$/, '')
    .trim();
  return stripped === '-' ? '' : stripped;
}
function cleanPhrase(s) {
  return String(s).split(' ').map(stripMarkers).filter(w => w.length > 0).join(' ');
}
function canonicalFromRows(rows) {
  return rows
    .map(w => stripMarkers(w.correct !== undefined && w.correct !== null ? w.correct : w.text))
    .filter(w => w.length > 0)
    .join(' ');
}
const norm = s => cleanPhrase(s).toLowerCase().replace(/\s+/g, ' ').trim();

const findings = [];
function add(sev, lesson, id, type, detail) {
  findings.push({ sev, lesson, id, type, detail });
}

let totalPhrases = 0;
for (const lesson of Object.keys(phrasesByLesson).map(Number).sort((a, b) => a - b)) {
  const { file, phrases } = phrasesByLesson[lesson];
  phrases.forEach((p, idx) => {
    totalPhrases++;
    const id = p.id || `${lesson}#${idx}`;
    const rowsEn = (p.wordsEn && p.wordsEn.length) ? p.wordsEn : p.words;

    // (A) english string vs join(wordsEn) — the validated truth differs from the shown english.
    if (rowsEn && rowsEn.length) {
      const canon = canonicalFromRows(rowsEn);
      const eng = cleanPhrase(p.english);
      if (norm(canon) !== norm(eng)) {
        add('HIGH', lesson, id, 'EN_VS_WORDSEN',
          `english="${p.english}" but wordsEn builds "${canon}"`);
      }
    } else {
      add('MED', lesson, id, 'NO_WORDS', 'no wordsEn and no words rows');
    }

    // (D) correct token duplicated in its own distractors.
    for (const row of (rowsEn || [])) {
      const c = String(row.correct ?? row.text);
      if ((row.distractors || []).some(d => String(d) === c)) {
        add('MED', lesson, id, 'CORRECT_IN_DISTRACTORS',
          `EN token "${c}" appears in its own distractors`);
      }
      if (new Set((row.distractors || []).map(String)).size !== (row.distractors || []).length) {
        add('LOW', lesson, id, 'DUP_DISTRACTORS', `EN token "${c}" has duplicate distractors`);
      }
    }
    // same for ru words
    for (const row of (p.words || [])) {
      const c = String(row.correct ?? row.text);
      if ((row.distractors || []).some(d => String(d) === c)) {
        add('MED', lesson, id, 'CORRECT_IN_DISTRACTORS_RU',
          `RU token "${c}" appears in its own distractors`);
      }
    }

    // (E) a correct token equals ANOTHER slot's correct token but that other slot lists
    //     THIS token as a distractor — produces two visually identical chips, one "wrong".
    if (rowsEn && rowsEn.length) {
      const corrects = rowsEn.map(r => String(r.correct ?? r.text));
      rowsEn.forEach((row, ri) => {
        (row.distractors || []).forEach(d => {
          const ds = String(d);
          // distractor collides with a DIFFERENT slot's correct answer (same surface twice on board)
          const collidesAt = corrects.findIndex((c, ci) => ci !== ri && c === ds);
          if (collidesAt !== -1) {
            add('LOW', lesson, id, 'DISTRACTOR_EQ_OTHER_CORRECT',
              `slot ${ri} distractor "${ds}" equals correct token of slot ${collidesAt}`);
          }
        });
      });
    }

    // (F) russian/ukrainian present but empty or identical to english (untranslated leak).
    if (p.russian && norm(p.russian) === norm(p.english) && /[a-z]/i.test(p.russian) && !/[а-я]/i.test(p.russian)) {
      add('MED', lesson, id, 'RU_LOOKS_ENGLISH', `russian="${p.russian}" looks untranslated`);
    }

    // (G) wordsEn / words length sanity: a slot with empty correct.
    for (const row of (rowsEn || [])) {
      if (!String(row.correct ?? row.text).trim()) {
        add('MED', lesson, id, 'EMPTY_SLOT', 'a wordsEn slot has empty correct/text');
      }
    }
  });
}

// --- Report ---
findings.sort((a, b) => {
  const order = { HIGH: 0, MED: 1, LOW: 2 };
  return order[a.sev] - order[b.sev] || a.lesson - b.lesson || String(a.id).localeCompare(String(b.id));
});

const byType = {};
for (const f of findings) byType[f.type] = (byType[f.type] || 0) + 1;

let report = `# Deterministic Phrase-Sync Audit\n\n`;
report += `Phrases scanned: **${totalPhrases}** across lessons 1–32 (4 live files).\n\n`;
report += `## Summary by type\n\n`;
for (const [t, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  report += `- \`${t}\`: ${n}\n`;
}
report += `\nTotal findings: **${findings.length}**\n\n`;
report += `## All findings\n\n`;
let curSev = null;
for (const f of findings) {
  if (f.sev !== curSev) { report += `\n### ${f.sev}\n\n`; curSev = f.sev; }
  report += `- **L${f.lesson}** \`${f.id}\` [${f.type}] — ${f.detail}\n`;
}

const outPath = resolve(__dirname, 'PHRASE_SYNC_AUDIT_RESULT.md');
writeFileSync(outPath, report, 'utf8');
console.log(`scanned ${totalPhrases} phrases, ${findings.length} findings`);
console.log('by type:', JSON.stringify(byType, null, 0));
console.log('written:', outPath);
// also dump machine-readable for the semantic pass
writeFileSync(resolve(__dirname, 'PHRASE_SYNC_AUDIT_RESULT.json'), JSON.stringify(findings, null, 2), 'utf8');
