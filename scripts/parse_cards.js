#!/usr/bin/env node
// Parses lesson card txt files (lessons 2-29) and outputs TypeScript entries
// Output: scripts/lesson_cards_generated.ts (for review before integration)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(__dirname, 'lesson_cards_generated.ts');

const FILES = {
  2:  'УРОК 2 карточка.txt',
  3:  'УРОК 3 карточка .txt',
  4:  'УРОК 4 КАРТОЧКА.txt',
  5:  'УРОК 5 КАРТОЧКА.txt',
  6:  'УРОК 6 КАРТОЧКА.txt',
  7:  'УРОК 7 КАРТОЧКА.txt',
  8:  'УРОК 8 КАРТОЧКА.txt',
  9:  'УРОК 9 КАРТОЧКА.txt',
  10: 'УРОК 10 КАРТОЧКА.txt',
  11: 'УРОК 11 КАРТОЧКА.txt',
  12: 'УРОК 12 КАРТОЧКА.txt',
  13: 'УРОК 13 КАРТОЧКА.txt',
  14: 'УРОК 14 КАРТОЧКА.txt',
  15: 'УРОКА 15 КАРТОЧКА.txt',
  16: 'УРОК 16 КАРТОЧКИ.txt',
  17: 'УРОК 17 КАРТОЧКИ.txt',
  18: 'УРОК 18 КАРТОЧКИ.txt',
  19: 'УРОК 19 КАРТОЧКИ.txt',
  20: 'УРОК 20 КАРТОЧКИ.txt',
  21: 'УРОК 21 КАРТОЧКИ.txt',
  22: 'УРОК 22 КАРТОЧКИ.txt',
  23: 'УРОК 23 КАРТОЧКИ.txt',
  24: 'УРОК 24 КАРТОЧКИ.txt',
  25: 'УРОК 25 КАРТОЧКИ.txt',
  26: 'УРОК 26 КАРТОЧКИ.txt',
  27: 'УРОК 27 КАРТОЧКИ.txt',
  28: 'УРОК 28 КАРТОЧКИ.txt',
  29: 'УРОК 29 КАРТОЧКИ.txt',
};

function escapeTs(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function cleanLine(s) {
  return s.replace(/\*\*/g, '').trim();
}

// Regex to detect card header lines (with or without markdown ###, period optional)
const CARD_HEADER = /^(?:#{1,3}\s*)?(\d+)\.?\s+\S/;

function fixEmbeddedHeaders(raw) {
  // Insert newline before "NUMBER. UpperCase" when preceded by non-newline non-digit
  // Use a lookahead approach: split on pattern where non-digit char precedes NN.
  return raw.replace(/([^\n\d])(\d{1,2}\.? [А-ЯA-ZІ])/g, '$1\n$2');
}

function parseFile(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  raw = fixEmbeddedHeaders(raw);
  const allLines = raw.split(/\r?\n/).map(cleanLine);

  // Pass 1: find all card header line indices and their card numbers
  const headers = [];
  for (let i = 0; i < allLines.length; i++) {
    const m = allLines[i].match(CARD_HEADER);
    if (m) headers.push({ idx: i, num: parseInt(m[1]) });
  }

  // Filter to only sequential card headers (1,2,3,...,50)
  const validHeaders = [];
  let expected = 1;
  for (const h of headers) {
    if (h.num === expected) {
      validHeaders.push(h);
      expected++;
    }
  }

  // Pass 2: for each card, extract content between header and next header
  const cards = [];
  for (let ci = 0; ci < validHeaders.length; ci++) {
    const startLine = validHeaders[ci].idx + 1;
    const endLine = ci + 1 < validHeaders.length ? validHeaders[ci + 1].idx : allLines.length;
    const block = allLines.slice(startLine, endLine);

    const card = { correctRu:'', correctUk:'', wrongRu:'', wrongUk:'', secretRu:'', secretUk:'' };
    let section = null;
    let j = 0;

    while (j < block.length) {
      const l = block[j];

      if (/^Правильно\s*:?$/.test(l)) { section = 'correct'; j++; continue; }
      if (/^Неправильно\s*:?$/.test(l)) { section = 'wrong'; j++; continue; }
      if (/^Секрет\s*:?$/.test(l)) { section = 'secret'; j++; continue; }

      if (section && l.startsWith('RU:')) {
        let text = l.replace(/^RU:\s*/, '');
        j++;
        while (j < block.length) {
          const nx = block[j];
          if (/^(RU:|UK:|Правильно|Неправильно|Секрет)/.test(nx) || nx === '---') break;
          if (nx) text += ' ' + nx;
          j++;
        }
        if (section === 'correct') card.correctRu = text.trim();
        else if (section === 'wrong') card.wrongRu = text.trim();
        else card.secretRu = text.trim();
        continue;
      }

      if (section && l.startsWith('UK:')) {
        let text = l.replace(/^UK:\s*/, '');
        j++;
        while (j < block.length) {
          const nx = block[j];
          if (/^(RU:|UK:|Правильно|Неправильно|Секрет)/.test(nx) || nx === '---') break;
          if (nx) text += ' ' + nx;
          j++;
        }
        if (section === 'correct') card.correctUk = text.trim();
        else if (section === 'wrong') card.wrongUk = text.trim();
        else card.secretUk = text.trim();
        continue;
      }

      j++;
    }

    if (card.correctRu && card.correctUk) cards.push(card);
  }

  return cards;
}

let output = `// Auto-generated from lesson card txt files (lessons 2-29)
// DO NOT EDIT MANUALLY - regenerate with: node scripts/parse_cards.js
// Review this file before integrating into app/lesson_cards_data.ts

export const generatedLessonCards: Record<number, Record<number, any>> = {
`;

let totalCards = 0;
const errors = [];

for (const [lessonNum, filename] of Object.entries(FILES)) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) { errors.push('Missing: ' + filename); continue; }

  let cards;
  try { cards = parseFile(filePath); }
  catch (e) { errors.push('Error ' + filename + ': ' + e.message); continue; }

  if (cards.length === 0) { errors.push('No cards: ' + filename); continue; }

  console.log(`Lesson ${lessonNum}: ${cards.length} cards`);
  totalCards += cards.length;

  output += `  ${lessonNum}: {\n`;
  cards.forEach((card, idx) => {
    output += `    ${idx+1}: {\n`;
    output += `      "correctRu": "${escapeTs(card.correctRu)}",\n`;
    output += `      "correctUk": "${escapeTs(card.correctUk)}",\n`;
    output += `      "wrongRu": "${escapeTs(card.wrongRu)}",\n`;
    output += `      "wrongUk": "${escapeTs(card.wrongUk)}",\n`;
    output += `      "secretRu": "${escapeTs(card.secretRu)}",\n`;
    output += `      "secretUk": "${escapeTs(card.secretUk)}"\n`;
    output += `    },\n`;
  });
  output += `  },\n`;
}

output += `};\n`;

fs.writeFileSync(OUTPUT, output, 'utf8');
console.log(`\nTotal: ${totalCards} cards`);
console.log(`Output: ${OUTPUT}`);
if (errors.length) { console.log('\nWARNINGS:'); errors.forEach(e => console.log(' -', e)); }
