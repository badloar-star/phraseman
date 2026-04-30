// Audits preposition coverage for lessons 1-32.
//
// For each lesson:
//   - lists all unique prepositions (words tagged `category: 'preposition'`)
//     extracted from LESSON_X_PHRASES
//   - counts how many drill items the trainer can build from those phrases
//
// Writes a markdown report to tools/audit/AUDIT_PREPOSITIONS_1_32.md

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

const FILES = [
  { rel: 'app/lesson_data_1_8.ts',   range: [1, 8] },
  { rel: 'app/lesson_data_9_16.ts',  range: [9, 16] },
  { rel: 'app/lesson_data_17_24.ts', range: [17, 24] },
  { rel: 'app/lesson_data_25_32.ts', range: [25, 32] },
];

function readFile(rel) {
  return fs.readFileSync(path.join(projectRoot, rel), 'utf8');
}

// Extracts the body text of `export const LESSON_<N>_PHRASES: ... = [ ... ];`
function extractPhraseBlock(source, lessonId) {
  const startMarker = `export const LESSON_${lessonId}_PHRASES`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx < 0) return null;
  // skip past the `=` so we don't grab the `[]` of the type annotation
  const eqIdx = source.indexOf('=', startIdx);
  if (eqIdx < 0) return null;
  const arrStart = source.indexOf('[', eqIdx);
  if (arrStart < 0) return null;
  const arrEnd = findWordsArrayEnd(source, arrStart);
  if (arrEnd < 0) return null;
  // return inner body without surrounding brackets so parsePhrases() can walk
  // top-level `{ ... }` items directly.
  return source.slice(arrStart + 1, arrEnd);
}

const STR_RE = "'(?:\\\\.|[^'\\\\])*'"; // single-quoted string with escapes
const ID_RE = new RegExp(`id:\\s*(${STR_RE})`, 'g');

function parseQuotedAt(source, idx, quote) {
  // assumes source[idx] === quote
  let s = '';
  let i = idx + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      s += source[i + 1] ?? '';
      i += 2;
      continue;
    }
    if (ch === quote) return { value: s, end: i + 1 };
    s += ch;
    i += 1;
  }
  return { value: s, end: source.length };
}

function parseSingleQuotedAt(source, idx) {
  return parseQuotedAt(source, idx, "'");
}

function findWordsArrayEnd(source, startBracket) {
  let depth = 0;
  let i = startBracket;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return i;
    } else if (ch === "'" || ch === '"') {
      const r = parseQuotedAt(source, i, ch);
      i = r.end;
      continue;
    }
    i += 1;
  }
  return -1;
}

function parseWordObjects(wordsBlock) {
  // splits the array body by top-level `}` boundaries; each entry begins at `{`
  const out = [];
  let i = 0;
  while (i < wordsBlock.length) {
    const open = wordsBlock.indexOf('{', i);
    if (open < 0) break;
    let depth = 0;
    let j = open;
    while (j < wordsBlock.length) {
      const ch = wordsBlock[j];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) { j += 1; break; }
      } else if (ch === "'" || ch === '"') {
        const r = parseQuotedAt(wordsBlock, j, ch);
        j = r.end;
        continue;
      } else if (ch === '[') {
        const closeIdx = findWordsArrayEnd(wordsBlock, j);
        if (closeIdx < 0) break;
        j = closeIdx + 1;
        continue;
      }
      j += 1;
    }
    const segment = wordsBlock.slice(open, j);

    const textMatch = new RegExp(`text:\\s*(${STR_RE})`).exec(segment);
    const correctMatch = new RegExp(`correct:\\s*(${STR_RE})`).exec(segment);
    const categoryMatch = new RegExp(`category:\\s*(${STR_RE})`).exec(segment);
    const distractorsMatch = /distractors:\s*\[([\s\S]*?)\]/.exec(segment);

    const unquote = quoted => parseSingleQuotedAt(quoted, 0).value;
    const text = textMatch ? unquote(textMatch[1]) : '';
    const correct = correctMatch ? unquote(correctMatch[1]) : text;
    const category = categoryMatch ? unquote(categoryMatch[1]) : null;
    const distractors = distractorsMatch
      ? Array.from(distractorsMatch[1].matchAll(new RegExp(STR_RE, 'g')))
          .map(m => unquote(m[0]))
      : [];

    out.push({ text, correct, category, distractors });
    i = j;
  }
  return out;
}

function parsePhrases(blockText) {
  // walk top-level objects in the array body, then for each, extract english + words
  const out = [];
  let i = 0;
  while (i < blockText.length) {
    const open = blockText.indexOf('{', i);
    if (open < 0) break;
    let depth = 0;
    let j = open;
    while (j < blockText.length) {
      const ch = blockText[j];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) { j += 1; break; }
      } else if (ch === "'" || ch === '"') {
        const r = parseQuotedAt(blockText, j, ch);
        j = r.end;
        continue;
      } else if (ch === '[') {
        const closeIdx = findWordsArrayEnd(blockText, j);
        if (closeIdx < 0) break;
        j = closeIdx + 1;
        continue;
      }
      j += 1;
    }
    const segment = blockText.slice(open, j);
    i = j;

    const idMatch = new RegExp(`id:\\s*(${STR_RE})`).exec(segment);
    const englishMatch = new RegExp(`english:\\s*(${STR_RE})`).exec(segment);
    const wordsArrIdx = segment.indexOf('words');
    if (wordsArrIdx < 0) continue;
    const arrStart = segment.indexOf('[', wordsArrIdx);
    if (arrStart < 0) continue;
    const arrEnd = findWordsArrayEnd(segment, arrStart);
    if (arrEnd < 0) continue;
    const wordsBlock = segment.slice(arrStart + 1, arrEnd);

    const unquote = quoted => parseSingleQuotedAt(quoted, 0).value;
    const id = idMatch ? unquote(idMatch[1]) : '';
    const english = englishMatch ? unquote(englishMatch[1]) : '';
    const words = parseWordObjects(wordsBlock);

    out.push({ id, english, words });
  }
  return out;
}

function buildLessonReport(lessonId, phrases, priorSet) {
  const uniquePreps = [];
  const seen = new Set();
  let skippedTemplate = 0;
  let skippedFewOptions = 0;

  for (const p of phrases) {
    for (const w of p.words) {
      if ((w.category || '').toLowerCase() !== 'preposition') continue;
      const value = (w.correct || w.text).trim().toLowerCase();
      if (!value) continue;
      if (!seen.has(value)) {
        seen.add(value);
        uniquePreps.push(value);
      }
    }
  }

  // Build all candidate items (no cap), then mirror lesson_prepositions.ts sort:
  // NEW prepositions first, then repeated ones — and cap at 12 after sorting.
  const lessonSet = new Set(uniquePreps);
  const allItems = [];
  for (const p of phrases) {
    for (const w of p.words) {
      if ((w.category || '').toLowerCase() !== 'preposition') continue;
      const value = (w.correct || w.text).trim().toLowerCase();
      if (!lessonSet.has(value)) continue;
      const template = p.english.replace(new RegExp(`\\b${value}\\b`, 'i'), '__');
      const options = [value, ...w.distractors.map(s => s.trim().toLowerCase())]
        .filter(Boolean)
        .slice(0, 4);
      if (!template.includes('__')) { skippedTemplate += 1; continue; }
      if (options.length < 2) { skippedFewOptions += 1; continue; }
      allItems.push({ correct: value, isNew: !priorSet.has(value) });
    }
  }
  allItems.sort((a, b) => (a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1));
  const queued = allItems.slice(0, 12);

  const newPreps = uniquePreps.filter(p => !priorSet.has(p));
  const repeatPreps = uniquePreps.filter(p => priorSet.has(p));

  return {
    lessonId,
    uniquePreps,
    newPreps,
    repeatPreps,
    drillItems: queued.length,
    drillNewCount: queued.filter(x => x.isNew).length,
    drillRepeatCount: queued.filter(x => !x.isNew).length,
    skippedTemplate,
    skippedFewOptions,
    phraseCount: phrases.length,
  };
}

// First pass: parse all lessons' phrases so we can compute the cumulative
// prior-prepositions set for every lesson before building reports.
const phrasesByLesson = new Map();
for (const f of FILES) {
  const src = readFile(f.rel);
  for (let id = f.range[0]; id <= f.range[1]; id++) {
    const block = extractPhraseBlock(src, id);
    phrasesByLesson.set(id, block ? parsePhrases(block) : []);
  }
}

function uniquePrepsOf(phrases) {
  const seen = new Set();
  const out = [];
  for (const p of phrases) {
    for (const w of p.words) {
      if ((w.category || '').toLowerCase() !== 'preposition') continue;
      const v = (w.correct || w.text).trim().toLowerCase();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

const reports = [];
const lessonIds = [...phrasesByLesson.keys()].sort((a, b) => a - b);
for (const id of lessonIds) {
  const priorSet = new Set();
  for (const prevId of lessonIds) {
    if (prevId >= id) break;
    for (const p of uniquePrepsOf(phrasesByLesson.get(prevId))) priorSet.add(p);
  }
  reports.push(buildLessonReport(id, phrasesByLesson.get(id), priorSet));
}

const lines = [];
const push = (s = '') => lines.push(s);

push('# Аудит предлогов: уроки 1–32');
push('');
push('Источник данных: `category: "preposition"` во фразах `LESSON_X_PHRASES`.');
push('Тренажёр строится `getLessonPrepositionPack()` из `app/lesson_prepositions.ts`.');
push('Предлоги внутри одного урока не дублируются (для списка), но между уроками — повторяются.');
push('Тренажёр отдаёт максимум 12 заданий на урок.');
push('');

const lessonsWithDrill = reports.filter(r => r.drillItems > 0);
const lessonsWithoutDrill = reports.filter(r => r.drillItems === 0);
push('## Сводка');
push('');
push(`- Уроков всего: **${reports.length}**`);
push(`- Уроков с тренажёром предлогов: **${lessonsWithDrill.length}**`);
push(`- Уроков без предлогов (тренажёр скрыт): **${lessonsWithoutDrill.length}**`);
if (lessonsWithoutDrill.length) {
  push(`- Без тренажёра: ${lessonsWithoutDrill.map(r => r.lessonId).join(', ')}`);
}
const totalItems = reports.reduce((acc, r) => acc + r.drillItems, 0);
const totalUnique = reports.reduce((acc, r) => acc + r.uniquePreps.length, 0);
push(`- Всего заданий в тренажёрах: **${totalItems}**`);
push(`- Сумма уникальных предлогов по урокам: **${totalUnique}**`);
push('');

push('## По урокам');
push('');
push('Колонка «Заданий» = `новых / повторных` в очереди тренажёра (новые всегда идут первыми, лимит 12).');
push('');
push('| Урок | Новых | Повторных | Заданий (н/п) | Новые предлоги | Повторные |');
push('|------|-------|-----------|---------------|----------------|-----------|');
for (const r of reports) {
  const newList = r.newPreps.length ? r.newPreps.join(', ') : '—';
  const repList = r.repeatPreps.length ? r.repeatPreps.join(', ') : '—';
  push(`| ${r.lessonId} | ${r.newPreps.length} | ${r.repeatPreps.length} | ${r.drillItems} (${r.drillNewCount}/${r.drillRepeatCount}) | ${newList} | ${repList} |`);
}
push('');

push('## Замечания по построению заданий');
push('');
const warnings = reports.filter(r => r.skippedTemplate > 0 || r.skippedFewOptions > 0);
if (!warnings.length) {
  push('- Все предлоги преобразовались в задания без потерь.');
} else {
  for (const r of warnings) {
    push(`- Урок ${r.lessonId}: пропущено ${r.skippedTemplate} (нет места для пропуска в шаблоне) + ${r.skippedFewOptions} (мало вариантов).`);
  }
}
push('');

const outPath = path.join(projectRoot, 'tools', 'audit', 'AUDIT_PREPOSITIONS_1_32.md');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote report → ${path.relative(projectRoot, outPath)}`);
console.log(`Total drill items: ${totalItems} | Lessons with drill: ${lessonsWithDrill.length}/${reports.length}`);
if (lessonsWithoutDrill.length) {
  console.log('Lessons without drill:', lessonsWithoutDrill.map(r => r.lessonId).join(', '));
}
