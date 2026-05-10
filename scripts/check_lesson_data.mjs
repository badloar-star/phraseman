/**
 * Точная построчная проверка: english vs words[].correct
 * Парсит фразы по маркерам id/english/words
 */
import { readFileSync } from 'fs';

const stripPunct = (w) => w.replace(/[.!?,;:?!']+$/, '').replace(/^[.!?,;:?!']+/, '').toLowerCase().trim();

function parsePhrases(src) {
  const lines = src.split('\n');
  const phrases = [];

  let current = null;
  let inWords = false;
  let wordsBracketDepth = 0;
  let inPhrase = false; // между { ... } текущего phrase object

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Новая фраза начинается с id: 'lessonN_phrase_M'
    const idMatch = line.match(/id:\s*'(lesson\d+_phrase_\d+)'/);
    if (idMatch) {
      if (current && current.english) phrases.push(current);
      current = { id: idMatch[1], english: null, corrects: [] };
      inWords = false;
      wordsBracketDepth = 0;
      continue;
    }

    if (!current) continue;

    // english — только если ещё не нашли
    if (!current.english && !inWords) {
      const engMatch = line.match(/english:\s*'([^']*(?:\\'[^']*)*)'[,\s]*$/);
      if (engMatch) {
        current.english = engMatch[1].replace(/\\'/g, "'");
        continue;
      }
    }

    // Начало words: [
    if (!inWords && /words:\s*\[/.test(line)) {
      inWords = true;
      wordsBracketDepth = 1;
      continue;
    }

    if (inWords) {
      // Считаем глубину скобок [ ]
      for (const ch of line) {
        if (ch === '[') wordsBracketDepth++;
        else if (ch === ']') {
          wordsBracketDepth--;
          if (wordsBracketDepth === 0) {
            inWords = false;
            break;
          }
        }
      }

      if (wordsBracketDepth > 0) {
        // Извлекаем correct: только на верхнем уровне (не из distractors)
        const correctMatch = line.match(/correct:\s*'([^']+)'/);
        if (correctMatch) {
          current.corrects.push(stripPunct(correctMatch[1]));
        }
      }
    }
  }

  if (current && current.english) phrases.push(current);
  return phrases;
}

function checkPhrases(phrases) {
  const errors = [];
  for (const p of phrases) {
    if (!p.english || p.corrects.length === 0) continue;
    // Пропускаем vocab-заголовки (english из одного слова без пробелов)
    if (!p.english.includes(' ')) continue;

    const engWords = p.english.split(/\s+/).map(stripPunct).filter(w => w.length > 0);
    const missing = [];
    let ci = 0;

    for (const ew of engWords) {
      if (!ew || ew === '-') continue;
      let found = false;
      for (let j = ci; j < p.corrects.length; j++) {
        if (p.corrects[j] === ew) {
          ci = j + 1;
          found = true;
          break;
        }
      }
      if (!found) missing.push(ew);
    }

    if (missing.length > 0) {
      errors.push({ id: p.id, english: p.english, missing, wordsCount: p.corrects.length });
    }
  }
  return errors;
}

const files = [
  { path: 'c:/appsprojects/phraseman/app/lesson_data_1_8.ts', label: 'lessons 1-8' },
  { path: 'c:/appsprojects/phraseman/app/lesson_data_9_16.ts', label: 'lessons 9-16' },
  { path: 'c:/appsprojects/phraseman/app/lesson_data_17_24.ts', label: 'lessons 17-24' },
  { path: 'c:/appsprojects/phraseman/app/lesson_data_25_32.ts', label: 'lessons 25-32' },
];

let totalErrors = 0;
for (const { path, label } of files) {
  const src = readFileSync(path, 'utf8');
  const phrases = parsePhrases(src);
  const errors = checkPhrases(phrases);

  if (errors.length > 0) {
    console.log(`\n=== ${label} — ${errors.length} проблем ===`);
    for (const e of errors) {
      console.log(`  ${e.id}: пропущено [${e.missing.join(', ')}]`);
      console.log(`    "${e.english}"`);
    }
    totalErrors += errors.length;
  } else {
    console.log(`=== ${label} — OK ===`);
  }
}

console.log(`\nИтого: ${totalErrors} проблем`);
