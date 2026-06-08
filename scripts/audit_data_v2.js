#!/usr/bin/env node
/**
 * Data Integrity Audit v2 for PhraseMan
 *
 * Three checks:
 * 1. TRUNCATED: English phrase > 4 words ending with article/preposition (not a known phrasal particle)
 * 2. WORD_COUNT_MISMATCH: answer word count vs options word count differ significantly
 * 3. CYRILLIC_LOOKALIKE: Latin-looking Cyrillic chars in English-keyed fields
 */

const fs = require('fs');
const path = require('path');

// Cyrillic homoglyphs (lowercase → latin equivalent)
const CYRILLIC_HOMOGLYPHS = 'аеорсхАВЕКМНОРСТХУіІї';
const CYRILLIC_HOMOGLYPH_RE = new RegExp(`[${CYRILLIC_HOMOGLYPHS}]`);

// Words that are OK at end of phrasal verbs (particles, not truncation)
const PHRASAL_PARTICLES = new Set(['up','down','out','off','on','in','over','back','away','around','through','by','along','apart','about','forward','together','ahead']);

// Articles/prepositions that indicate truncation when ending a longer phrase
const TRUNCATION_ENDINGS = /\b(a|an|the|in|on|at|to|for|of|with|by|from|into|about|through|between|among|without|within|against|toward|towards|upon|across|behind|before|after|during|except|past|since|than)\s*[.,!?]?\s*$/i;

const issues = [];

function lineOf(src, idx) {
  return src.substring(0, idx).split('\n').length;
}

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

function checkCyrillicLookalikes(key, value, file, line) {
  // Skip if value has significant Cyrillic (it's a Russian/Ukrainian field)
  const allCyrillic = (value.match(/[а-яёА-ЯЁіІї]/g) || []).length;
  const totalChars = value.replace(/[\s\d.,!?'"()\-]/g, '').length;
  if (totalChars === 0) return;
  if (allCyrillic / totalChars > 0.3) return; // mostly Cyrillic string, skip

  const found = [];
  for (let i = 0; i < value.length; i++) {
    if (CYRILLIC_HOMOGLYPH_RE.test(value[i])) {
      found.push(`'${value[i]}'@${i}`);
    }
  }
  if (found.length > 0) {
    issues.push({ file, line, type: 'CYRILLIC_LOOKALIKE', content: `${key}: "${value}"`, detail: found.join(', ') });
  }
}

function checkTruncation(key, value, file, line) {
  const wc = countWords(value);
  // Skip single/double word options (fill-in-the-blank)
  if (wc <= 2) return;

  const trimmed = value.trim().replace(/[.,!?]+$/, '');
  const lastWord = trimmed.split(/\s+/).pop().toLowerCase();

  // Allow phrasal particles (wrap up, carry out, etc.)
  if (PHRASAL_PARTICLES.has(lastWord) && wc <= 5) return;

  // Check for article/preposition ending (not a particle)
  if (TRUNCATION_ENDINGS.test(value)) {
    issues.push({ file, line, type: 'TRUNCATED_PHRASE', content: `${key}: "${value}"`, detail: `Ends with "${lastWord}" — possible truncation` });
  }
}

function auditFile(filepath) {
  const filename = path.relative(path.join(__dirname, '..'), filepath).replace(/\\/g, '/');
  const src = fs.readFileSync(filepath, 'utf8');

  // --- Check 1 & 3: string values for English-keyed fields ---
  const enKeyRe = /"?(en|english|phrase|answer|word|phrasal_verb|idiom|title|question|text|correctAnswer|correct_answer)"?\s*:\s*["'`]([^"'`\n]{2,300})["'`]/gi;
  let m;
  while ((m = enKeyRe.exec(src)) !== null) {
    const key = m[1];
    const value = m[2];
    const line = lineOf(src, m.index);

    // Skip Cyrillic-dominant values for truncation check
    const hasCyrillicMain = /[б-вг-джзийклмнптуфцчшщъыьэюяёБ-ВГ-ДЖЗИЙКЛМНПТУФЦЧШЩЪЫЬЭЮЯЁіІї]/i.test(value);

    if (!hasCyrillicMain && !CYRILLIC_HOMOGLYPH_RE.test(value)) {
      checkTruncation(key, value, filename, line);
    }

    checkCyrillicLookalikes(key, value, filename, line);
  }

  // --- Check 2: word count mismatches in quiz/lesson structures ---
  // Find: answer/en + options in same block
  // Use a sliding window approach on the source
  const answerRe = /"?(answer|en|correct_answer|correctAnswer)"?\s*:\s*["'`]([^"'`\n]{2,200})["'`]/gi;
  while ((m = answerRe.exec(src)) !== null) {
    const answerVal = m[2].trim();
    const answerLine = lineOf(src, m.index);

    // Look for options array within next 500 chars
    const window = src.substring(m.index, m.index + 600);
    const optMatch = window.match(/"?options"?\s*:\s*\[([^\]]{0,400})\]/i);
    if (!optMatch) continue;

    const answerWC = countWords(answerVal);
    const strRe = /["'`]([^"'`]{2,200})["'`]/g;
    let sm;
    while ((sm = strRe.exec(optMatch[1])) !== null) {
      const opt = sm[1].trim();
      // Skip if option is clearly Russian/Ukrainian
      if (/[а-яёА-ЯЁіІї]/i.test(opt)) continue;
      const optWC = countWords(opt);
      const diff = Math.abs(answerWC - optWC);
      // Flag if diff > 3 words AND neither is very short (not single-word options)
      if (diff > 3 && answerWC > 2 && optWC > 2) {
        issues.push({
          file: filename,
          line: answerLine,
          type: 'WORD_COUNT_MISMATCH',
          content: `answer="${answerVal}" (${answerWC}w) | option="${opt}" (${optWC}w)`,
          detail: `Word count diff: ${diff}`
        });
      }
    }
  }
}

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
];

console.log('=== PhraseMan Data Integrity Audit v2 ===\n');
for (const f of dataFiles) {
  const full = path.join(appDir, f);
  if (fs.existsSync(full)) {
    process.stdout.write(`Auditing ${f}... `);
    auditFile(full);
    console.log('done');
  } else {
    console.log(`SKIP (not found): ${f}`);
  }
}

// Deduplicate (same file+line+type+content)
const seen = new Set();
const deduped = issues.filter(i => {
  const k = `${i.file}:${i.line}:${i.type}:${i.content}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log('\n=== AUDIT RESULTS ===\n');

if (deduped.length === 0) {
  console.log('No issues found!');
} else {
  const byType = {};
  for (const issue of deduped) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  for (const [type, list] of Object.entries(byType)) {
    console.log(`\n--- ${type} (${list.length} issues) ---`);
    for (const issue of list) {
      console.log(`  ${issue.file}:${issue.line}`);
      console.log(`    ${issue.content}`);
      console.log(`    => ${issue.detail}`);
    }
  }

  console.log('\n=== SUMMARY ===');
  for (const [type, list] of Object.entries(byType)) {
    console.log(`  ${type}: ${list.length}`);
  }
  console.log(`  TOTAL: ${deduped.length} issues`);
}
