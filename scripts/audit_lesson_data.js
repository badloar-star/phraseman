#!/usr/bin/env node
/**
 * Audit lesson data files for mismatches between `english` phrase word count
 * and the number of entries in the `words` array.
 *
 * Strategy: find all phrase objects by locating `words: [` arrays,
 * then look backwards for the `english:` field within the same object.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

const TRAILING_PUNCT = /[?!.,]+$/;
const ARTICLES_PREPS = /^(a|an|the|for|in|on|at|to|with)$/i;

function countEnglishWords(english) {
  return english
    .split(/\s+/)
    .map(w => w.replace(TRAILING_PUNCT, ''))
    .filter(w => w.length > 0).length;
}

function getLineNumber(text, index) {
  return text.substring(0, index).split('\n').length;
}

/** Extract a string value after a key like `english:` */
function extractStringAt(text, pos) {
  // Skip whitespace and colon
  let i = pos;
  while (i < text.length && (text[i] === ':' || text[i] === ' ' || text[i] === '\t')) i++;
  const quote = text[i];
  if (quote !== '`' && quote !== "'" && quote !== '"') return null;
  i++;
  let result = '';
  while (i < text.length && text[i] !== quote) {
    if (text[i] === '\\') { i++; result += text[i]; }
    else result += text[i];
    i++;
  }
  return result;
}

function auditFile(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  const text = fs.readFileSync(fullPath, 'utf8');

  const mismatches = [];
  const truncated = [];
  const emptyFields = [];

  // Find each phrase object by locating `words: [` arrays
  // A phrase object has: id, english, russian, ukrainian, words: [...]
  // We detect phrase objects by finding `words: [` and then extracting the enclosing object

  const wordsKeyRegex = /\bwords:\s*\[/g;
  let wMatch;

  while ((wMatch = wordsKeyRegex.exec(text)) !== null) {
    const wordsKeyPos = wMatch.index;
    const wordsArrayStart = wMatch.index + wMatch[0].length - 1; // position of '['

    // Find matching closing bracket for words array
    let depth = 0;
    let wordsArrayEnd = -1;
    for (let i = wordsArrayStart; i < text.length; i++) {
      if (text[i] === '[' || text[i] === '{') depth++;
      else if (text[i] === ']' || text[i] === '}') {
        depth--;
        if (depth === 0) {
          wordsArrayEnd = i;
          break;
        }
      }
    }
    if (wordsArrayEnd === -1) continue;

    const wordsArrayText = text.substring(wordsArrayStart, wordsArrayEnd + 1);

    // Now find the enclosing object's opening brace by searching backwards from wordsKeyPos
    // Find the opening { of this phrase object
    let braceDepth = 0;
    let objStart = -1;
    for (let i = wordsKeyPos; i >= 0; i--) {
      if (text[i] === '}' || text[i] === ']') braceDepth++;
      else if (text[i] === '{' || text[i] === '[') {
        if (braceDepth === 0) {
          objStart = i;
          break;
        }
        braceDepth--;
      }
    }
    if (objStart === -1) continue;

    const objText = text.substring(objStart, wordsKeyPos);

    // Extract english field from this object's text
    const englishMatch = objText.match(/\benglish:\s*(?:`([^`]*)`|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/);
    if (!englishMatch) continue;
    const englishValue = englishMatch[1] !== undefined ? englishMatch[1]
      : englishMatch[2] !== undefined ? englishMatch[2].replace(/\\'/g, "'")
      : englishMatch[3] !== undefined ? englishMatch[3].replace(/\\"/g, '"')
      : '';

    // Extract id field from this object's text
    const idMatch = objText.match(/\bid:\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/);
    const phraseId = idMatch
      ? (idMatch[1] !== undefined ? idMatch[1] : idMatch[2] !== undefined ? idMatch[2] : idMatch[3])
      : `unknown_line_${getLineNumber(text, objStart)}`;

    const englishPos = objStart + objText.indexOf('english:');
    const lineNum = getLineNumber(text, englishPos);

    // Count word entries: count `{ text:` occurrences in words array
    const wordEntries = [...wordsArrayText.matchAll(/\{\s*text:/g)].length;

    // Check for empty text: '' or correct: ''
    const emptyTextMatches = [...wordsArrayText.matchAll(/\btext:\s*(?:''|""|``)/g)];
    const emptyCorrectMatches = [...wordsArrayText.matchAll(/\bcorrect:\s*(?:''|""|``)/g)];

    for (const em of emptyTextMatches) {
      emptyFields.push({
        file: filePath,
        line: getLineNumber(text, wordsArrayStart + em.index),
        phraseId,
        field: 'text',
        english: englishValue,
      });
    }
    for (const em of emptyCorrectMatches) {
      emptyFields.push({
        file: filePath,
        line: getLineNumber(text, wordsArrayStart + em.index),
        phraseId,
        field: 'correct',
        english: englishValue,
      });
    }

    const englishWordCount = countEnglishWords(englishValue);

    if (englishWordCount !== wordEntries) {
      // Extract word texts from array
      const wordTexts = [...wordsArrayText.matchAll(/\btext:\s*(?:`([^`]*)`|'([^']*)'|"([^"]*)")/g)]
        .map(wm => wm[1] !== undefined ? wm[1] : wm[2] !== undefined ? wm[2] : wm[3]);

      mismatches.push({
        file: filePath,
        line: lineNum,
        phraseId,
        english: englishValue,
        expectedCount: englishWordCount,
        actualCount: wordEntries,
        wordTexts,
      });
    }

    // Check for truncated endings (ends with article or preposition)
    const trimmed = englishValue.replace(TRAILING_PUNCT, '').trim();
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    if (ARTICLES_PREPS.test(lastWord)) {
      truncated.push({
        file: filePath,
        line: lineNum,
        phraseId,
        english: englishValue,
        lastWord,
      });
    }
  }

  return { mismatches, truncated, emptyFields };
}

// Run audit
let totalMismatches = 0;
let totalTruncated = 0;
let totalEmpty = 0;

for (const file of FILES) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Auditing: ${file}`);
  console.log('='.repeat(70));

  const { mismatches, truncated, emptyFields } = auditFile(file);

  if (mismatches.length === 0) {
    console.log('  No word count mismatches found.');
  } else {
    console.log(`  MISMATCHES (${mismatches.length}):`);
    for (const m of mismatches) {
      const diff = m.actualCount - m.expectedCount;
      console.log(`    Line ${m.line} | id: ${m.phraseId}`);
      console.log(`      english: "${m.english}"`);
      console.log(`      English words: ${m.expectedCount}, words[] entries: ${m.actualCount}  (diff: ${diff > 0 ? '+' : ''}${diff})`);
      console.log(`      words[].text: [${m.wordTexts.map(w => `"${w}"`).join(', ')}]`);
    }
    totalMismatches += mismatches.length;
  }

  if (truncated.length > 0) {
    console.log(`\n  LIKELY TRUNCATED (ends with article/preposition) (${truncated.length}):`);
    for (const t of truncated) {
      console.log(`    Line ${t.line} | id: ${t.phraseId} | ends with: "${t.lastWord}"`);
      console.log(`      english: "${t.english}"`);
    }
    totalTruncated += truncated.length;
  }

  if (emptyFields.length > 0) {
    console.log(`\n  EMPTY FIELDS (${emptyFields.length}):`);
    for (const e of emptyFields) {
      console.log(`    Line ${e.line} | id: ${e.phraseId} | field: ${e.field}`);
      console.log(`      in phrase: "${e.english}"`);
    }
    totalEmpty += emptyFields.length;
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log(`SUMMARY`);
console.log('='.repeat(70));
console.log(`Total word count mismatches: ${totalMismatches}`);
console.log(`Total likely truncated:      ${totalTruncated}`);
console.log(`Total empty fields:          ${totalEmpty}`);
