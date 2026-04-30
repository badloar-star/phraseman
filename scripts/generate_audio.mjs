/**
 * generate_audio.mjs
 * Generates MP3 files for all English phrases in PhraseMan using OpenAI TTS.
 * Run: OPENAI_API_KEY=sk-... node scripts/generate_audio.mjs
 *
 * Output: assets/audio/en/<hash>.mp3
 * Index:  assets/audio/en/index.json  { "text": "filename.mp3" }
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: Set OPENAI_API_KEY env variable');
  process.exit(1);
}

const VOICE = 'nova';
const MODEL = 'tts-1-hd';
const OUTPUT_DIR = path.resolve('assets/audio/en');
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.json');

// Ensure output directory exists
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Load existing index
let index = {};
if (fs.existsSync(INDEX_FILE)) {
  index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
}

// ── Collect all English texts ──────────────────────────────────────────────

function extractFromLessonFile(filePath) {
  const texts = new Set();
  const content = fs.readFileSync(filePath, 'utf8');

  // Match english: 'text' or english: "text"
  const phraseMatches = content.matchAll(/english:\s*['"`]([^'"`\n]+)['"`]/g);
  for (const m of phraseMatches) {
    texts.add(m[1].trim());
  }

  // Match word text: 'word' (individual words for click-to-hear)
  const wordMatches = content.matchAll(/text:\s*['"`]([^'"`\n]+)['"`]/g);
  for (const m of wordMatches) {
    const w = m[1].trim();
    if (w.length > 0 && w.length < 40) texts.add(w);
  }

  return texts;
}

function extractFromQuizFile(filePath) {
  const texts = new Set();
  const content = fs.readFileSync(filePath, 'utf8');

  // Match answer: 'text' — only correct answers
  const answerMatches = content.matchAll(/answer:\s*['"`]([^'"`\n]+)['"`]/g);
  for (const m of answerMatches) {
    texts.add(m[1].trim());
  }

  // Also grab choices[0] as correct (where correct: 0)
  // Already covered by answer field above

  return texts;
}

function extractFromIdiomsFile(filePath) {
  const texts = new Set();
  const content = fs.readFileSync(filePath, 'utf8');

  const matches = content.matchAll(/english:\s*['"`]([^'"`\n]+)['"`]/g);
  for (const m of matches) {
    texts.add(m[1].trim());
  }

  return texts;
}

const allTexts = new Set();

const lessonFiles = [
  'app/lesson_data_1_8.ts',
  'app/lesson_data_9_16.ts',
  'app/lesson_data_17_24.ts',
  'app/lesson_data_25_32.ts',
];

for (const f of lessonFiles) {
  if (fs.existsSync(f)) {
    const t = extractFromLessonFile(f);
    t.forEach(x => allTexts.add(x));
    console.log(`${f}: ${t.size} texts`);
  }
}

if (fs.existsSync('app/quiz_data.ts')) {
  const t = extractFromQuizFile('app/quiz_data.ts');
  t.forEach(x => allTexts.add(x));
  console.log(`quiz_data.ts: ${t.size} texts`);
}

if (fs.existsSync('app/idioms_data.ts')) {
  const t = extractFromIdiomsFile('app/idioms_data.ts');
  t.forEach(x => allTexts.add(x));
  console.log(`idioms_data.ts: ${t.size} texts`);
}

// Remove texts already in index
const toGenerate = [...allTexts].filter(t => !index[t]);

console.log(`\nTotal unique texts: ${allTexts.size}`);
console.log(`Already generated:  ${allTexts.size - toGenerate.length}`);
console.log(`To generate:        ${toGenerate.length}`);

if (toGenerate.length === 0) {
  console.log('\nAll audio already generated!');
  process.exit(0);
}

// Estimate cost: tts-1-hd = $0.030 per 1000 chars
const totalChars = toGenerate.reduce((s, t) => s + t.length, 0);
const estimatedCost = (totalChars / 1000) * 0.030;
console.log(`\nEstimated cost: $${estimatedCost.toFixed(2)} (${totalChars} chars at $0.030/1k)`);
console.log('Starting in 3 seconds... Ctrl+C to cancel\n');
await new Promise(r => setTimeout(r, 3000));

// ── Generate audio ─────────────────────────────────────────────────────────

async function generateOne(text) {
  const hash = crypto.createHash('md5').update(text).digest('hex');
  const filename = `${hash}.mp3`;
  const filepath = path.join(OUTPUT_DIR, filename);

  if (fs.existsSync(filepath)) {
    index[text] = filename;
    return { text, filename, skipped: true };
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      voice: VOICE,
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filepath, Buffer.from(buffer));
  index[text] = filename;
  return { text, filename, skipped: false };
}

// Process with concurrency limit to avoid rate limits
const CONCURRENCY = 2;
let done = 0;
let errors = 0;

async function processQueue(items) {
  const queue = [...items];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const text = queue.shift();
      try {
        const result = await generateOne(text);
        done++;
        const pct = ((done / toGenerate.length) * 100).toFixed(1);
        const action = result.skipped ? 'skip' : ' gen';
        process.stdout.write(`\r[${pct}%] ${done}/${toGenerate.length} ${action}: ${text.slice(0, 50).padEnd(50)}`);
      } catch (err) {
        errors++;
        console.error(`\nERROR for "${text}": ${err.message}`);
      }
      // Save index after every 50 items
      if (done % 50 === 0) {
        fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
      }
    }
  });
  await Promise.all(workers);
}

await processQueue(toGenerate);

// Final save of index
fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

console.log(`\n\nDone! Generated: ${done - errors}, Errors: ${errors}`);
console.log(`Index saved to: ${INDEX_FILE}`);
console.log(`Audio files in: ${OUTPUT_DIR}`);
console.log(`\nTotal files: ${Object.keys(index).length}`);
