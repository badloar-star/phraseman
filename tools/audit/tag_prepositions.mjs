// Tags `category: 'preposition'` on every word object inside LESSON_X_PHRASES
// across all four lesson_data_*.ts files, when the word value is a real
// English preposition. Idempotent: words already carrying any `category:` are
// left untouched.
//
// Usage: node tools/audit/tag_prepositions.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');

const FILES = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

// Conservative single-word English preposition set. Mirrors what is already
// hand-tagged in lesson_data_1_8.ts ("at", "on", "in", "to", "by", "of", "for",
// "into", "inside") and extends it with the common prepositions that appear in
// later lessons.
const PREPOSITIONS = new Set([
  'to', 'in', 'on', 'at', 'by', 'of', 'for', 'with', 'from',
  'into', 'onto', 'off', 'up', 'down', 'out',
  'over', 'under', 'about', 'above', 'below', 'near',
  'behind', 'between', 'among', 'against',
  'around', 'across', 'through', 'along',
  'before', 'after', 'during', 'since', 'until',
  'throughout', 'within', 'without', 'despite',
  'inside', 'outside', 'opposite', 'beside', 'beyond', 'upon',
  'toward', 'towards',
]);

// Matches a single word object on one line:
//   { text: 'X', correct: 'X', distractors: [...] }
// or with extra fields (e.g. category) anywhere in the body.
const WORD_OBJ_RE = /\{\s*text:\s*'([^']*)'[^}]*\}/g;

let totalAdded = 0;
const perFile = [];

for (const rel of FILES) {
  const abs = path.join(projectRoot, rel);
  const original = fs.readFileSync(abs, 'utf8');

  let added = 0;
  const updated = original.replace(WORD_OBJ_RE, (match, textValue) => {
    // already classified — leave untouched
    if (/category\s*:/.test(match)) return match;

    // pick the answer value: prefer `correct: '...'`, fall back to text
    const correctMatch = /correct:\s*'([^']*)'/.exec(match);
    const value = (correctMatch ? correctMatch[1] : textValue).trim().toLowerCase();
    if (!PREPOSITIONS.has(value)) return match;

    added += 1;
    // append `, category: 'preposition'` before the closing `}`
    return match.replace(/\s*\}\s*$/, ", category: 'preposition' }");
  });

  if (updated !== original) {
    fs.writeFileSync(abs, updated, 'utf8');
  }
  perFile.push({ file: rel, added });
  totalAdded += added;
}

console.log('--- preposition tagger ---');
for (const r of perFile) {
  console.log(`  ${r.file}: +${r.added} prepositions tagged`);
}
console.log(`Total tagged: ${totalAdded}`);
