// parse_all_cards.mjs — универсальный парсер всех форматов в "карточки дальше.txt"
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', 'app');

const raw1 = readFileSync(join(root, 'карточки дальше.txt'), 'utf8').replace(/\r\n/g, '\n');
const raw2 = readFileSync(join(root, 'карточки 14 - 15.txt'), 'utf8').replace(/\r\n/g, '\n');
const raw = raw1 + '\n' + raw2;
const lines = raw.split('\n');

// ─── Step 1: Build English→{lessonId, phraseIndex} lookup ────────────────────
const lessonDataFiles = ['lesson_data_9_16.ts', 'lesson_data_17_24.ts'];
const englishToLesson = new Map();

const normalizeEng = (s) =>
  s.replace(/\\'/g, "'").replace(/\\/g, '')
   .replace(/«-»/g, '').replace(/«([^»]*)»/g, '$1')
   .replace(/\s+/g, ' ').trim().toLowerCase()
   .replace(/[.,!?]$/, '');

for (const fname of lessonDataFiles) {
  const src = readFileSync(join(root, fname), 'utf8');

  // Format 1a: id: 'lessonN_phrase_N', \n english: '...'
  const re1a = /id: 'lesson(\d+)_phrase_(\d+)',\s*\n\s+english: '((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = re1a.exec(src)) !== null) {
    englishToLesson.set(normalizeEng(m[3]), { lessonId: parseInt(m[1]), phraseIndex: parseInt(m[2]) });
  }

  // Format 1b: numeric id (lessons 13-15) — track lesson from LESSON_N_PHRASES
  {
    const srcLines = src.split('\n');
    let currentLesson = 0;
    for (let i = 0; i < srcLines.length; i++) {
      const lm = srcLines[i].match(/^export const LESSON_(\d+)_PHRASES/);
      if (lm) { currentLesson = parseInt(lm[1]); continue; }
      if (currentLesson < 13 || currentLesson > 15) continue;
      const idM = srcLines[i].match(/^\s+id: (\d+),\s*$/);
      if (idM) {
        for (let j = i+1; j < Math.min(i+5, srcLines.length); j++) {
          const eM = srcLines[j].match(/^\s+english: '((?:[^'\\]|\\.)*)'/);
          if (eM) { englishToLesson.set(normalizeEng(eM[1]), { lessonId: currentLesson, phraseIndex: parseInt(idM[1]) }); break; }
        }
      }
    }
  }

  // Format 1c: id: 'lNNpN', \n english: '...'
  const re1c = /id: 'l(\d+)p(\d+)',\s*\n\s+english: '((?:[^'\\]|\\.)*)'/g;
  while ((m = re1c.exec(src)) !== null) {
    englishToLesson.set(normalizeEng(m[3]), { lessonId: parseInt(m[1]), phraseIndex: parseInt(m[2]) });
  }

  // Format 2a: id:'lNNpNN',english:'...' (single quotes, inline)
  const re2a = /id:\s*'l(\d+)p(\d+)',\s*english:\s*'((?:[^'\\]|\\.)*)'/g;
  while ((m = re2a.exec(src)) !== null) {
    englishToLesson.set(normalizeEng(m[3]), { lessonId: parseInt(m[1]), phraseIndex: parseInt(m[2]) });
  }

  // Format 2b: id:'lNNpNN',english:"..." (double quotes, inline)
  const re2b = /id:\s*'l(\d+)p(\d+)',\s*english:\s*"((?:[^"\\]|\\.)*)"/g;
  while ((m = re2b.exec(src)) !== null) {
    englishToLesson.set(normalizeEng(m[3]), { lessonId: parseInt(m[1]), phraseIndex: parseInt(m[2]) });
  }
}
console.log('English lookup entries:', englishToLesson.size);

// ─── Step 2: Split file into phrase blocks ────────────────────────────────────
const blocks = [];
let currentBlock = [];
let inBlock = false;

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/^---+$/.test(l.trim())) {
    if (currentBlock.length > 0) { blocks.push(currentBlock.join('\n')); currentBlock = []; }
    inBlock = false; continue;
  }
  if (/^Продолжить/.test(l.trim()) || /^### /.test(l.trim())) {
    if (currentBlock.length > 0) { blocks.push(currentBlock.join('\n')); currentBlock = []; }
    inBlock = false; continue;
  }
  const isHeader =
    /^## \d+\. /.test(l) ||
    /^\d+\. \*\*/.test(l.trim()) ||
    (/^\d+\. [A-ZА-ЯІЇЄa-z"]/.test(l.trim()) && !l.startsWith(' ') && l.trim().length > 15);
  if (isHeader) {
    if (currentBlock.length > 0) blocks.push(currentBlock.join('\n'));
    currentBlock = [l]; inBlock = true;
  } else if (inBlock) {
    currentBlock.push(l);
  }
}
if (currentBlock.length > 0) blocks.push(currentBlock.join('\n'));
console.log('Total blocks found:', blocks.length);

// ─── Step 3: Parse each block ─────────────────────────────────────────────────
const extractRuUk = (blockText, label) => {
  // Handles **Label:** and **Label**: formats
  const re = new RegExp(`\\*\\*${label}[^\\n]*\\n((?:.|\\n)*?)(?=\\n\\*\\*|$)`);
  const m = blockText.match(re);
  if (!m) return { ru: '', uk: '' };
  const text = m[1].trim();
  const ruM = text.match(/^RU:\s*(.+?)(?=\nUK:|$)/ms);
  const ukM = text.match(/UK:\s*(.+?)$/ms);
  return {
    ru: (ruM?.[1] || '').trim().replace(/\n/g, ' '),
    uk: (ukM?.[1] || '').trim().replace(/\n/g, ' '),
  };
};

const extractEnglish = (blockText) => {
  const first = blockText.split('\n')[0];
  let eng = first
    .replace(/^## \d+\. /, '').replace(/^\d+\. \*\*/, '').replace(/^\d+\. /, '')
    .replace(/\*\*$/, '').trim();
  const parenMatch = eng.match(/^(.+?)\s*[(\[]/);
  if (parenMatch) eng = parenMatch[1].trim();
  return eng.replace(/\*+$/, '').replace(/\.$/, '').trim();
};

const results = {};
let matched = 0, unmatched = 0;
const unmatchedPhrases = [];

for (const block of blocks) {
  if (!block.includes('Правильно') && !block.includes('Неправильно')) continue;
  const eng = extractEnglish(block);
  const normalizedEng = eng.toLowerCase().replace(/[.,!?]$/, '').replace(/\u2019|'/g, "'").replace(/\s+/g, ' ').trim();
  const found = englishToLesson.get(normalizedEng);
  if (!found) { unmatched++; unmatchedPhrases.push(normalizedEng.slice(0, 60)); continue; }
  const { lessonId, phraseIndex } = found;
  if (lessonId <= 8) continue;
  const correct = extractRuUk(block, 'Правильно');
  const wrong   = extractRuUk(block, 'Неправильно');
  const secret  = extractRuUk(block, 'Секрет');
  if (!results[lessonId]) results[lessonId] = {};
  results[lessonId][phraseIndex] = {
    correctRu: correct.ru, correctUk: correct.uk,
    wrongRu: wrong.ru, wrongUk: wrong.uk,
    secretRu: secret.ru, secretUk: secret.uk,
  };
  matched++;
}

console.log('Matched:', matched, '| Unmatched:', unmatched);
if (unmatched > 0) console.log('Unmatched:', unmatchedPhrases.slice(0,5));
Object.entries(results).sort(([a],[b]) => parseInt(a)-parseInt(b)).forEach(([l, p]) =>
  console.log(`  Lesson ${l}: ${Object.keys(p).length} phrases`)
);

// ─── Step 4: Write to lesson_cards_data.ts ────────────────────────────────────
const existingPath = join(root, 'lesson_cards_data.ts');
let existing = readFileSync(existingPath, 'utf8');

const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// Clean old lessons >= 9
const lines_e = existing.split('\n');
let lesson8End = -1;
for (let i = 0; i < lines_e.length; i++) {
  if (/^  [9-9][0-9]*: \{/.test(lines_e[i]) || /^  [1-9][0-9]+: \{/.test(lines_e[i])) {
    lesson8End = i; break;
  }
}
let cleanExisting;
if (lesson8End !== -1) {
  let closeIdx = lesson8End - 1;
  while (closeIdx > 0 && !lines_e[closeIdx].trim()) closeIdx--;
  const before = lines_e.slice(0, closeIdx + 1).join('\n');
  cleanExisting = before + '\n};\n\nexport function getPhraseCard(lessonId: number, phraseIndex: number): PhraseCard | null {\n  return lessonCards[lessonId]?.[phraseIndex] ?? null;\n}\n';
} else {
  cleanExisting = existing;
}

const newEntries = Object.entries(results)
  .sort(([a], [b]) => parseInt(a) - parseInt(b))
  .map(([lessonId, phrases]) => {
    const phraseEntries = Object.entries(phrases)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([idx, c]) =>
        `    ${idx}: { correctRu: ``, correctUk: ``, wrongRu: ``, wrongUk: ``, secretRu: ``, secretUk: `` }`
      ).join(',\n');
    return `  ${lessonId}: {\n${phraseEntries}\n  }`;
  }).join(',\n');

const insertionPoint = cleanExisting.lastIndexOf('\n};');
const newContent = cleanExisting.slice(0, insertionPoint) + ',\n' + newEntries + '\n' + cleanExisting.slice(insertionPoint);
writeFileSync(existingPath, newContent, 'utf8');
console.log('Done! Written lessons:', Object.keys(results).sort((a,b)=>parseInt(a)-parseInt(b)).join(', '));
