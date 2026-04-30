// verify_cards.mjs — check that lesson_cards_data entries match lesson data phrases
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'app');

const lessonDataFiles = ['lesson_data_9_16.ts', 'lesson_data_17_24.ts'];
const allPhrases = new Map(); // key: 'lessonId_phraseIdx' → english

for (const f of lessonDataFiles) {
  const src = readFileSync(join(root, f), 'utf8');

  let m;

  // Format 1a: id: 'lessonN_phrase_N'
  const re1a = /id: 'lesson(\d+)_phrase_(\d+)',\s*\n\s+english: '((?:[^'\\]|\\.)*)'/g;
  while ((m = re1a.exec(src))) allPhrases.set(m[1]+'_'+m[2], m[3].replace(/\\'/g,"'"));

  // Format 1b: numeric id, lessons 13-15
  const srcLines = src.split('\n');
  let curLesson = 0;
  for (let i = 0; i < srcLines.length; i++) {
    const lm = srcLines[i].match(/^export const LESSON_(\d+)_PHRASES/);
    if (lm) { curLesson = parseInt(lm[1]); continue; }
    if (curLesson < 13 || curLesson > 15) continue;
    const idM = srcLines[i].match(/^\s+id: (\d+),\s*$/);
    if (idM) {
      for (let j = i+1; j < Math.min(i+5, srcLines.length); j++) {
        const eM = srcLines[j].match(/^\s+english: '((?:[^'\\]|\\.)*)'/);
        if (eM) { allPhrases.set(curLesson+'_'+idM[1], eM[1].replace(/\\'/g,"'")); break; }
      }
    }
  }

  // Format 1c: id: 'lNNpN' multiline
  const re1c = /id: 'l(\d+)p(\d+)',\s*\n\s+english: '((?:[^'\\]|\\.)*)'/g;
  while ((m = re1c.exec(src))) allPhrases.set(m[1]+'_'+m[2], m[3].replace(/\\'/g,"'"));

  // Format 2a: inline single quote
  const re2a = /id:\s*'l(\d+)p(\d+)',\s*english:\s*'((?:[^'\\]|\\.)*)'/g;
  while ((m = re2a.exec(src))) allPhrases.set(m[1]+'_'+m[2], m[3].replace(/\\'/g,"'"));

  // Format 2b: inline double quote
  const re2b = /id:\s*'l(\d+)p(\d+)',\s*english:\s*"((?:[^"\\]|\\.)*)"/g;
  while ((m = re2b.exec(src))) allPhrases.set(m[1]+'_'+m[2], m[3]);
}

console.log('Lesson data entries:', allPhrases.size);

// Parse lesson_cards_data.ts
const cardsFile = readFileSync(join(root, 'lesson_cards_data.ts'), 'utf8');

// Legacy source files can be absent in current repo state.
const legacy1 = join(root, 'карточки дальше.txt');
const legacy2 = join(root, 'карточки 14 - 15.txt');
const raw1 = existsSync(legacy1) ? readFileSync(legacy1, 'utf8').replace(/\r\n/g, '\n') : '';
const raw2 = existsSync(legacy2) ? readFileSync(legacy2, 'utf8').replace(/\r\n/g, '\n') : '';
const rawCards = (raw1 + '\n' + raw2).trim();

// Build english→{correctRu} from raw cards for spot-check
// We'll just verify index alignment: for each entry in lesson_cards_data,
// check the phrase at that lessonId+index in lesson data exists.

// Extract all lesson blocks from lesson_cards_data.ts
const lessonBlockRe = /  (\d+): \{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
let lm;
let errors = [];
let checked = 0;

while ((lm = lessonBlockRe.exec(cardsFile))) {
  const lessonId = parseInt(lm[1]);
  if (lessonId < 9) continue; // skip lessons 1-8 (no phrase lookup data)
  const body = lm[2];
  const phraseRe = /(\d+): \{ correctRu:/g;
  let pm;
  while ((pm = phraseRe.exec(body))) {
    const idx = pm[1];
    const key = lessonId+'_'+idx;
    if (!allPhrases.has(key)) {
      errors.push(`Lesson ${lessonId} phrase ${idx}: NOT FOUND in lesson data`);
    }
    checked++;
  }
}

console.log('Cards checked:', checked);
console.log('Errors:', errors.length);
if (errors.length > 0) {
  errors.slice(0, 20).forEach(e => console.log(' ', e));
} else {
  console.log('All cards match lesson data indices correctly!');
}

// Spot-check: print first phrase key found per lesson
console.log('\n--- Sample spot-check (first phrase per lesson) ---');
const seen = new Set();
const lessonKeyRe = /  (\d+): \{([\s\S]*?)  \},/g;
let sk;
while ((sk = lessonKeyRe.exec(cardsFile))) {
  const lessonId = parseInt(sk[1], 10);
  if (lessonId < 9) continue;
  if (seen.has(lessonId)) continue;
  const body = sk[2];
  const firstPhrase = body.match(/^\s+(\d+): \{ correctRu:/m);
  if (!firstPhrase) continue;
  const phraseIdx = firstPhrase[1];
  const key = lessonId + '_' + phraseIdx;
  const eng = allPhrases.get(key) || '???';
  console.log(`  L${lessonId} p${phraseIdx}: eng="${eng.slice(0, 50)}"`);
  seen.add(lessonId);
}
