import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'app');

const src9_16 = readFileSync(join(root, 'lesson_data_9_16.ts'), 'utf8');
const src17_24 = readFileSync(join(root, 'lesson_data_17_24.ts'), 'utf8');
const cards = readFileSync(join(root, 'lesson_cards_data.ts'), 'utf8');

// Build phrase lookup: 'lessonId_phraseIdx' -> english
const phrases = new Map();

function addPhrases(src) {
  let m;
  // Format 1a
  const re1a = /id: 'lesson(\d+)_phrase_(\d+)',\s*\n\s+english: '((?:[^'\\]|\\.)*)'/g;
  while ((m = re1a.exec(src))) phrases.set(m[1]+'_'+m[2], m[3].replace(/\\'/g,"'"));

  // Format 1b numeric (lessons 13-15)
  const lines = src.split('\n');
  let curLesson = 0;
  for (let i = 0; i < lines.length; i++) {
    const lm = lines[i].match(/^export const LESSON_(\d+)_PHRASES/);
    if (lm) { curLesson = parseInt(lm[1]); continue; }
    if (curLesson < 13 || curLesson > 15) continue;
    const idM = lines[i].match(/^\s+id: (\d+),\s*$/);
    if (idM) {
      for (let j=i+1; j<Math.min(i+5,lines.length); j++) {
        const eM = lines[j].match(/^\s+english: '((?:[^'\\]|\\.)*)'/);
        if (eM) { phrases.set(curLesson+'_'+idM[1], eM[1].replace(/\\'/g,"'")); break; }
      }
    }
  }

  // Format 1c
  const re1c = /id: 'l(\d+)p(\d+)',\s*\n\s+english: '((?:[^'\\]|\\.)*)'/g;
  while ((m = re1c.exec(src))) phrases.set(m[1]+'_'+m[2], m[3].replace(/\\'/g,"'"));

  // Format 2a single quote inline
  const re2a = /id:\s*'l(\d+)p(\d+)',\s*english:\s*'((?:[^'\\]|\\.)*)'/g;
  while ((m = re2a.exec(src))) phrases.set(m[1]+'_'+m[2], m[3].replace(/\\'/g,"'"));

  // Format 2b double quote inline
  const re2b = /id:\s*'l(\d+)p(\d+)',\s*english:\s*"((?:[^"\\]|\\.)*)"/g;
  while ((m = re2b.exec(src))) phrases.set(m[1]+'_'+m[2], m[3]);
}

addPhrases(src9_16);
addPhrases(src17_24);
console.log('Phrase entries in lesson data:', phrases.size);

// Parse lesson_cards_data.ts: extract lessons 9-23 with phrase indices and correctRu
// Format: "  9: {\n    1: { correctRu: ``, ..."
const lines = cards.split('\n');
let currentLesson = 0;
let errors = 0;
let checked = 0;
let sampleShown = new Set();

for (let i = 0; i < lines.length; i++) {
  const lessonM = lines[i].match(/^  (\d+): \{$/);
  if (lessonM) { currentLesson = parseInt(lessonM[1]); continue; }
  if (currentLesson < 9 || currentLesson > 23) continue;

  const phraseM = lines[i].match(/^\s{4}(\d+): \{ correctRu: ``]*)", correctUk: ``]*)"/);
  if (!phraseM) continue;

  const phraseIdx = phraseM[1];
  const correctRu = phraseM[2];
  const key = currentLesson+'_'+phraseIdx;
  const eng = phrases.get(key);

  checked++;
  const showSample = !sampleShown.has(currentLesson) || parseInt(phraseIdx) <= 3;
  if (showSample) {
    sampleShown.add(currentLesson);
    const status = eng ? 'OK' : 'NO_MATCH';
    console.log(`L${currentLesson} p${phraseIdx} [${status}]: eng="${(eng||'???').slice(0,45)}" | ru="${correctRu.slice(0,40)}"`);
  }

  if (!eng) {
    errors++;
    if (errors <= 10) console.log(`  ERROR: key ${key} not in lesson data`);
  }
}

console.log('\nTotal checked:', checked, '| Errors:', errors);
if (errors === 0) console.log('All entries have matching lesson data indices.');
