#!/usr/bin/env node
/**
 * check_all_audio_freshness.mjs — universal audio freshness guard.
 *
 * Phraseman phrase audio is keyed by normalized English text in
 * app/phrase_audio_url_map.generated.ts.
 * PHRASE audio is keyed by the normalized
 *      English TEXT itself (getPhraseAudioUrl). Covers lessons, words, quiz, idioms,
 *      flashcards, collectibles. Stale = a current content text has NO map entry
 *      (its mp3 was never generated, or the text changed and the old key is orphaned).
 *
 * This reports phrase-audio texts that have no audio. It does NOT spend money.
 *
 *   node scripts/check_all_audio_freshness.mjs            # human report, exit 1 if any gap
 *   node scripts/check_all_audio_freshness.mjs --json     # machine-readable
 *
 * Regenerate:
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_phrase_audio.mjs "<new text>"
 *           (then upload + patch the url map)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPhraseAudioMapFile } from './lib/phrase_audio_map_source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');

// ── normalize the way the phrase-audio map does ──────────────────────────────
function normalizePhraseKey(text) {
  return String(text).trim().toLowerCase().replace(/\s+/g, ' ');
}

// ── 1) PHRASE audio: collect current content texts that should have audio ────
// Only fields that hold the ENGLISH spoken phrase. We deliberately do NOT scan
// generic `text:` fields — those are word-builder tiles in mixed languages
// (Spanish translations, punctuation tokens) that are not English audio and would
// be false positives. The english:/answer: fields are the reliable audio source.
const PHRASE_TEXT_SOURCES = [
  { file: 'app/lesson_data_1_8.ts', fields: ['english'] },
  { file: 'app/lesson_data_9_16.ts', fields: ['english'] },
  { file: 'app/lesson_data_17_24.ts', fields: ['english'] },
  { file: 'app/lesson_data_25_32.ts', fields: ['english'] },
  { file: 'app/idioms_data.ts', fields: ['english'] },
];

// Only treat a token as an English phrase worth auditing if it's ASCII-Latin
// (no Cyrillic / accented Spanish), to avoid flagging translation fragments.
function looksEnglish(t) {
  return /[a-zA-Z]/.test(t) && !/[À-ÿА-я]/.test(t);
}

function extractTexts(absFile, fields) {
  const texts = new Set();
  if (!fs.existsSync(absFile)) return texts;
  const content = fs.readFileSync(absFile, 'utf8');
  for (const field of fields) {
    // Match the quote char and allow escaped quotes inside, so phrases with
    // apostrophes ("It's a piece of cake") are captured whole, not truncated.
    const re = new RegExp(`${field}:\\s*(['"\`])((?:\\\\.|(?!\\1)[^\\\\\\n])*)\\1`, 'g');
    for (const m of content.matchAll(re)) {
      const t = m[2].replace(/\\(['"`\\])/g, '$1').trim();
      if (t.length > 0 && looksEnglish(t)) texts.add(t);
    }
  }
  return texts;
}

function loadPhraseMapKeys() {
  const f = path.join(ROOT, 'app', 'phrase_audio_url_map.generated.ts');
  if (!fs.existsSync(f)) return new Set();
  return new Set(Array.from(readPhraseAudioMapFile(f).keys(), normalizePhraseKey));
}

const phraseMapKeys = loadPhraseMapKeys();
const phraseMissing = [];
for (const src of PHRASE_TEXT_SOURCES) {
  const abs = path.join(ROOT, src.file);
  for (const text of extractTexts(abs, src.fields)) {
    if (!phraseMapKeys.has(normalizePhraseKey(text))) {
      phraseMissing.push({ system: 'phrase', sourceFile: src.file, text });
    }
  }
}

// ── report ───────────────────────────────────────────────────────────────────
const totalGaps = phraseMissing.length;

if (JSON_OUT) {
  console.log(JSON.stringify({
    totalGaps,
    phraseMissingCount: phraseMissing.length,
    phraseMissing: phraseMissing.slice(0, 200),
  }, null, 2));
} else {
  console.log(`Universal audio freshness: ${phraseMapKeys.size} phrase keys checked.`);
  if (totalGaps === 0) {
    console.log('OK — every content text has phrase audio.');
  } else {
    if (phraseMissing.length) {
      console.log(`\nPHRASE AUDIO MISSING: ${phraseMissing.length} content text(s) have NO audio (new/changed text not yet generated):`);
      for (const m of phraseMissing.slice(0, 40)) console.log(`  [${m.sourceFile}] "${m.text}"`);
      if (phraseMissing.length > 40) console.log(`  …and ${phraseMissing.length - 40} more.`);
    }
    console.log('\nRegenerate phrase audio: PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_phrase_audio.mjs "<text>"  (then upload + patch map)');
  }
}
process.exit(totalGaps === 0 ? 0 : 1);
