const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, '../app/Урок 1 карточки.txt');
const outPath = path.join(__dirname, '../app/lesson_cards_data.ts');

const raw = fs.readFileSync(txtPath, 'utf8');

// Fix embedded headers (not preceded by newline) before splitting
const fixed = raw.replace(/((?<!\n))(### \d+\.)/g, '\n$2');

// Split on ### N. heading
const blocks = fixed.split(/\n(?=### \d+\.)/).filter(b => b.trim().startsWith('###'));
console.log(`Total blocks: ${blocks.length}`);

function extract(block, label) {
  const regex = new RegExp(`\\*\\*${label}:\\*\\*([\\s\\S]*?)(?=\\*\\*|$)`);
  const match = block.match(regex);
  if (!match) return { ru: '', uk: '' };
  const section = match[1];
  const ruMatch = section.match(/RU:\s*(.+)/);
  const ukMatch = section.match(/UK:\s*(.+)/);
  return {
    ru: ruMatch ? ruMatch[1].trim() : '',
    uk: ukMatch ? ukMatch[1].trim() : '',
  };
}

function makeCard(block) {
  const correct = extract(block, 'Правильно');
  const wrong = extract(block, 'Неправильно');
  const secret = extract(block, 'Секрет');
  return {
    correctRu: correct.ru,
    correctUk: correct.uk,
    wrongRu: wrong.ru,
    wrongUk: wrong.uk,
    secretRu: secret.ru,
    secretUk: secret.uk,
  };
}

// Explicit lesson boundaries in the txt file
// Lesson 6 has only 40 blocks (phrases 1-30 then 41-50; missing 31-40)
const LESSON_BOUNDARIES = [
  { lesson: 1, start: 0,   end: 49,  phraseMap: null }, // phrases 1-50
  { lesson: 2, start: 50,  end: 99,  phraseMap: null },
  { lesson: 3, start: 100, end: 149, phraseMap: null },
  { lesson: 4, start: 150, end: 199, phraseMap: null },
  { lesson: 5, start: 200, end: 249, phraseMap: null },
  // Lesson 6: 40 blocks - cards 1-30 = phrases 1-30, cards 31-40 = phrases 41-50
  { lesson: 6, start: 250, end: 289, phraseMap: (cardIdx) => cardIdx <= 30 ? cardIdx : cardIdx + 10 },
  { lesson: 7, start: 290, end: 339, phraseMap: null },
  { lesson: 8, start: 340, end: 389, phraseMap: null },
];

const lessons = {};

LESSON_BOUNDARIES.forEach(({ lesson, start, end, phraseMap }) => {
  lessons[lesson] = {};
  for (let i = start; i <= end; i++) {
    const cardIdx = i - start + 1; // 1-based card index within lesson
    const phraseNum = phraseMap ? phraseMap(cardIdx) : cardIdx;
    const block = blocks[i];
    if (!block) { console.warn(`Missing block at index ${i}`); continue; }
    lessons[lesson][phraseNum] = makeCard(block);
  }
  console.log(`Lesson ${lesson}: ${Object.keys(lessons[lesson]).length} cards from txt`);
});

// Missing lesson 6 phrases 31-40 (WH-questions middle section)
const lesson6Missing = {
  31: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  32: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  33: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  34: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  35: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  36: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  37: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  38: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  39: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
  40: {
    correctRu: ``,
    correctUk: ``,
    wrongRu: ``,
    wrongUk: ``,
    secretRu: ``,
    secretUk: ``,
  },
};

// Inject missing lesson 6 phrases 31-40
Object.keys(lesson6Missing).forEach(k => {
  lessons[6][+k] = lesson6Missing[k];
});
console.log(`Lesson 6 after injection: ${Object.keys(lessons[6]).length} cards`);

// Verify all lessons have 50 cards
Object.keys(lessons).forEach(l => {
  const count = Object.keys(lessons[l]).length;
  if (count !== 50) console.warn(`WARNING: Lesson ${l} has ${count} cards (expected 50)`);
  else console.log(`Lesson ${l}: 50 cards ✓`);
});

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

let ts = `// Auto-generated from Урок 1 карточки.txt
// DO NOT EDIT MANUALLY

export interface PhraseCard {
  correctRu: string;
  correctUk: string;
  wrongRu: string;
  wrongUk: string;
  secretRu: string;
  secretUk: string;
}

// lessonCards[lessonId][phraseIndex_1based]
export const lessonCards: Record<number, Record<number, PhraseCard>> = {\n`;

Object.keys(lessons).sort((a,b) => +a - +b).forEach(lessonKey => {
  ts += `  ${lessonKey}: {\n`;
  const lesson = lessons[lessonKey];
  Object.keys(lesson).sort((a,b) => +a - +b).forEach(phraseKey => {
    const c = lesson[phraseKey];
    ts += `    ${phraseKey}: {\n`;
    ts += `      correctRu: ``,\n`;
    ts += `      correctUk: ``,\n`;
    ts += `      wrongRu: ``,\n`;
    ts += `      wrongUk: ``,\n`;
    ts += `      secretRu: ``,\n`;
    ts += `      secretUk: ``\n`;
    ts += `    },\n`;
  });
  ts += `  },\n`;
});

ts += `};\n\nexport function getPhraseCard(lessonId: number, phraseIndex: number): PhraseCard | null {\n  return lessonCards[lessonId]?.[phraseIndex] ?? null;\n}\n`;

fs.writeFileSync(outPath, ts, 'utf8');
console.log(`\nWritten to ${outPath}`);
