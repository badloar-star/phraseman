/**
 * regen_phrase_audio.mjs
 * Regenerates audio for specific English phrases (e.g. after text correction).
 *
 * Usage:
 *   OPENAI_TTS_API_KEY=sk-... node scripts/regen_phrase_audio.mjs "They watch the news in the evening"
 *   OPENAI_TTS_API_KEY=sk-... node scripts/regen_phrase_audio.mjs "phrase1" "phrase2" ...
 *
 * What it does:
 *   1. Generates new MP3 via OpenAI TTS (voice: nova, model: tts-1-hd)
 *   2. Saves file as assets/audio/en/<md5hash>.mp3
 *   3. Updates assets/audio/en/index.json with new key
 *   4. Deletes old MP3 file if it was replaced (old key removed)
 *   5. Prints full report
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireOpenAiDevSpendGuard } from './openai-dev-guard.mjs';
import { requireOpenAiTtsKey } from './openai-tts-key.mjs';

// Requires PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 before any OpenAI batch spend.
const API_KEY = requireOpenAiTtsKey(process.cwd());

const phrases = process.argv.slice(2);
if (phrases.length === 0) {
  console.error('ERROR: Provide at least one phrase as argument');
  console.error('Usage: OPENAI_TTS_API_KEY=sk-... PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_phrase_audio.mjs "Your phrase here"');
  process.exit(1);
}

const estimatedChars = phrases.reduce((sum, phrase) => sum + phrase.length, 0);
requireOpenAiDevSpendGuard({
  action: 'OpenAI TTS regeneration for selected phrases',
  estimatedCostUsd: (estimatedChars / 1000) * 0.030,
  units: phrases.length,
});

const VOICE = 'nova';
const MODEL = 'tts-1-hd';
const OUTPUT_DIR = path.resolve('assets/audio/en');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');

const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

async function generateAudio(text) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI TTS error ${response.status}: ${err}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

console.log('\nâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('  AUDIO REGENERATION REPORT');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');

for (const phrase of phrases) {
  console.log(`â–¶ Phrase: "${phrase}"`);

  const oldFile = index[phrase];
  if (oldFile) {
    console.log(`  Old file: ${oldFile} (will be replaced)`);
  } else {
    console.log(`  No existing audio â€” generating new.`);
  }

  try {
    const audioBuffer = await generateAudio(phrase);
    const hash = md5(phrase);
    const filename = `${hash}.mp3`;
    const filepath = path.join(OUTPUT_DIR, filename);

    fs.writeFileSync(filepath, audioBuffer);
    console.log(`  âœ“ New file: ${filename}`);

    // Delete old file if different
    if (oldFile && oldFile !== filename) {
      const oldPath = path.join(OUTPUT_DIR, oldFile);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
        console.log(`  âœ“ Deleted old file: ${oldFile}`);
      }
    }

    index[phrase] = filename;
    console.log(`  âœ“ index.json updated`);
    console.log(`  STATUS: SUCCESS\n`);
  } catch (err) {
    console.error(`  âœ— FAILED: ${err.message}\n`);
  }
}

// Save updated index
fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('  DONE. index.json saved.');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
