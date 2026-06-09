// One-shot data fix: lesson 32 has English tokens in `words` and `wordsEn: []`.
// Every other lesson keeps English tokens in `wordsEn`. This copies each
// lesson-32 entry's `words` array into its empty `wordsEn` so the data model
// is consistent (and the speaking/canonical-answer path reads the right field).
//
// Idempotent: only fills entries whose wordsEn is currently `[]`.
// Run from repo root:  node scripts/fix_lesson32_wordsen.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('../app/lesson_data_25_32.ts', import.meta.url);
const src = readFileSync(FILE, 'utf8');

const START = src.indexOf('export const LESSON_32_PHRASES');
if (START < 0) throw new Error('LESSON_32_PHRASES not found');

// Walk the lesson-32 region, entry by entry. Each entry is an object literal
// `{ ... }`. We find `words: [ ... ]` and the following `wordsEn: []` and
// replace the empty array with a clone of the words array.
const region = src.slice(START);

// Match a balanced `words: [ ... ]` block followed (later in same entry) by `wordsEn: []`.
// We do this per entry by scanning for `wordsEn: []` and grabbing the nearest
// preceding `words: [ ... ]` within the same object.
let filled = 0;
let out = region;

// Find all `wordsEn: []` positions.
const emptyRe = /wordsEn:\s*\[\]/g;
const edits = [];
let m;
while ((m = emptyRe.exec(region)) !== null) {
  const emptyAt = m.index;
  // Find the `words: [` that precedes this wordsEn within the same entry.
  // Search backwards for the last `words: [` before emptyAt.
  const before = region.slice(0, emptyAt);
  const wordsKeyAt = before.lastIndexOf('words: [');
  if (wordsKeyAt < 0) continue;
  // Extract the balanced bracket content of that words array.
  const arrStart = region.indexOf('[', wordsKeyAt);
  let depth = 0;
  let arrEnd = -1;
  for (let i = arrStart; i < region.length; i += 1) {
    const ch = region[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) { arrEnd = i; break; }
    }
  }
  if (arrEnd < 0) continue;
  const wordsArray = region.slice(arrStart, arrEnd + 1); // includes [ ... ]
  edits.push({ emptyAt, emptyLen: m[0].length, wordsArray });
}

// Apply edits from the end so indices stay valid.
edits.sort((a, b) => b.emptyAt - a.emptyAt);
for (const e of edits) {
  const replacement = `wordsEn: ${e.wordsArray}`;
  out = out.slice(0, e.emptyAt) + replacement + out.slice(e.emptyAt + e.emptyLen);
  filled += 1;
}

const final = src.slice(0, START) + out;
writeFileSync(FILE, final, 'utf8');
console.log(`Filled ${filled} lesson-32 wordsEn arrays.`);
