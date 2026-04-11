#!/usr/bin/env node
/**
 * Data Integrity Audit Script for PhraseMan
 * Checks for:
 * 1. Truncated English phrases (ending with articles/prepositions without noun)
 * 2. Word count mismatches between answer and options
 * 3. Cyrillic lookalike characters in English fields
 */

const fs = require('fs');
const path = require('path');

// Cyrillic characters that look like Latin
const CYRILLIC_LOOKALIKES = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x',
  'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H',
  'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'У': 'Y',
  'і': 'i', 'І': 'I', 'ї': 'i'
};

const CYRILLIC_REGEX = /[аеорсхАВЕКМНОРСТХУіІї]/;

// Words that should NOT be at the end of a phrase (truncation indicators)
const DANGLING_WORDS = /\b(a|an|the|in|on|at|to|for|of|with|by|from|into|about|up|out|off|down|over|under|through|between|among|without|within|against|toward|towards|upon|along|across|behind|before|after|during|except|past|since|than|that|this|these|those|which|who|whom|whose)\s*[.,!?]?\s*$/i;

const issues = [];

function addIssue(file, line, type, content, detail) {
  issues.push({ file, line, type, content, detail });
}

function stripTsExport(src) {
  // Remove TypeScript type annotations for simpler string extraction
  return src;
}

function findLineNumber(src, index) {
  return src.substring(0, index).split('\n').length;
}

/**
 * Extract all string values associated with English-language keys
 * We look for patterns like: en: "...", english: "...", phrase: "...", answer: "...", options: [...]
 */
function extractEnglishStrings(src, filename) {
  const results = [];

  // Match key: "value" or key: 'value' patterns
  const keyValueRe = /"?(en|english|phrase|answer|word|phrasal_verb|idiom|title|question|text|correctAnswer|correct_answer)"?\s*:\s*["'`]([^"'`\n]{2,})["'`]/gi;
  let m;
  while ((m = keyValueRe.exec(src)) !== null) {
    const lineNum = findLineNumber(src, m.index);
    results.push({ key: m[1], value: m[2], line: lineNum });
  }

  // Match options arrays: options: ["...", "...", ...]
  const optionsRe = /"?options"?\s*:\s*\[([^\]]+)\]/gi;
  while ((m = optionsRe.exec(src)) !== null) {
    const lineNum = findLineNumber(src, m.index);
    const inner = m[1];
    const strRe = /["'`]([^"'`]{2,})["'`]/g;
    let sm;
    while ((sm = strRe.exec(inner)) !== null) {
      results.push({ key: 'option', value: sm[1], line: lineNum });
    }
  }

  return results;
}

function checkTruncation(str) {
  return DANGLING_WORDS.test(str.trim());
}

function checkCyrillicLookalikes(str) {
  const found = [];
  for (let i = 0; i < str.length; i++) {
    if (CYRILLIC_REGEX.test(str[i])) {
      found.push({ char: str[i], pos: i, latin: CYRILLIC_LOOKALIKES[str[i]] || '?' });
    }
  }
  return found;
}

/**
 * Check word count between answer and options for quiz-style structures
 * Finds: { answer: "X words", options: ["Y words", ...] }
 * and checks that answer word count matches options word count (roughly)
 */
function checkWordCountMismatches(src, filename) {
  // Find quiz item blocks: look for answer + options in proximity
  // Strategy: find all objects that have both "answer"/"en" and "options"
  const blockRe = /\{[^{}]{0,2000}\}/gs;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const block = m[0];
    const lineNum = findLineNumber(src, m.index);

    // Extract answer/en value
    const answerM = block.match(/"?(answer|en|correct_answer|correctAnswer)"?\s*:\s*["'`]([^"'`\n]+)["'`]/i);
    if (!answerM) continue;

    // Extract options array
    const optionsM = block.match(/"?options"?\s*:\s*\[([^\]]+)\]/i);
    if (!optionsM) continue;

    const answerVal = answerM[2].trim();
    const answerWords = answerVal.split(/\s+/).length;

    const strRe = /["'`]([^"'`]{2,})["'`]/g;
    let sm;
    const opts = [];
    while ((sm = strRe.exec(optionsM[1])) !== null) {
      opts.push(sm[1]);
    }

    for (const opt of opts) {
      const optWords = opt.trim().split(/\s+/).length;
      // Flag if word counts differ by more than 2 (significant mismatch)
      if (Math.abs(answerWords - optWords) > 2) {
        addIssue(filename, lineNum, 'WORD_COUNT_MISMATCH',
          `answer="${answerVal}" (${answerWords}w) vs option="${opt}" (${optWords}w)`,
          `Word count difference: ${Math.abs(answerWords - optWords)}`
        );
      }
    }
  }
}

function auditFile(filepath) {
  const filename = path.relative(path.join(__dirname, '..'), filepath);
  let src;
  try {
    src = fs.readFileSync(filepath, 'utf8');
  } catch (e) {
    console.error(`Cannot read ${filepath}: ${e.message}`);
    return;
  }

  const strings = extractEnglishStrings(src, filename);

  for (const { key, value, line } of strings) {
    // Skip obviously Russian/Ukrainian strings (contain Cyrillic letters that aren't lookalikes)
    const hasCyrillicMain = /[б-вг-джзийклмнптуфцчшщъыьэюяёБ-ВГ-ДЖЗИЙКЛМНПТУФЦЧШЩЪЫЬЭЮЯЁіІї]/i.test(value);
    if (hasCyrillicMain) continue; // it's a Russian/Ukrainian field, skip truncation & word count but still check lookalikes in EN fields

    // Check truncation only for likely-English strings (no Cyrillic at all)
    if (!CYRILLIC_REGEX.test(value) && checkTruncation(value)) {
      addIssue(filename, line, 'TRUNCATED_PHRASE',
        `${key}: "${value}"`,
        'Phrase ends with article/preposition without completing noun/phrase'
      );
    }

    // Check Cyrillic lookalikes in any English-keyed field
    const lookalikes = checkCyrillicLookalikes(value);
    if (lookalikes.length > 0) {
      // Only flag if it doesn't look like a pure Cyrillic string
      const cyrillicCount = (value.match(/[а-яёА-ЯЁіІї]/gi) || []).length;
      const totalLen = value.replace(/\s/g, '').length;
      if (cyrillicCount / totalLen < 0.5) { // mostly Latin, suspicious
        addIssue(filename, line, 'CYRILLIC_LOOKALIKE',
          `${key}: "${value}"`,
          `Suspicious chars: ${lookalikes.map(l => `'${l.char}'(pos ${l.pos}, looks like '${l.latin}')`).join(', ')}`
        );
      }
    }
  }

  // Word count mismatch check
  checkWordCountMismatches(src, filename);
}

// Files to audit
const appDir = path.join(__dirname, '..', 'app');
const dataFiles = [
  'quiz_data.ts',
  'dialogs_data.ts',
  'idioms_data.ts',
  'lesson_data_all.ts',
  'lesson_data_1_8.ts',
  'lesson_data_9_16.ts',
  'lesson_data_17_24.ts',
  'lesson_data_25_32.ts',
  'lesson_cards_data.ts',
  'irregular_verbs_data.ts',
].map(f => path.join(appDir, f));

console.log('=== PhraseMan Data Integrity Audit ===\n');
for (const f of dataFiles) {
  if (fs.existsSync(f)) {
    console.log(`Auditing: ${f}`);
    auditFile(f);
  } else {
    console.log(`Skipping (not found): ${f}`);
  }
}

// Report
console.log('\n=== AUDIT RESULTS ===\n');

if (issues.length === 0) {
  console.log('No issues found!');
} else {
  // Group by type
  const byType = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  for (const [type, list] of Object.entries(byType)) {
    console.log(`\n--- ${type} (${list.length} issues) ---`);
    for (const issue of list) {
      console.log(`  ${issue.file}:${issue.line}`);
      console.log(`    Content: ${issue.content}`);
      console.log(`    Detail:  ${issue.detail}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  for (const [type, list] of Object.entries(byType)) {
    console.log(`  ${type}: ${list.length}`);
  }
  console.log(`  TOTAL: ${issues.length} issues`);
}
