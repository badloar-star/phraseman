/**
 * hook_audio_check.cjs
 * PostToolUse hook: auto-regenerates audio when lesson/quiz data files are edited.
 * Receives JSON on stdin from Claude Code hook system.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const API_KEY = process.env.OPENAI_API_KEY;
const ROOT = path.resolve(__dirname, '..');
const INDEX_FILE = path.join(ROOT, 'assets/audio/en/index.json');
const OUTPUT_DIR = path.join(ROOT, 'assets/audio/en');

const WATCHED_PATTERNS = [
  /lesson_data_.*\.ts$/,
  /quiz_data\.ts$/,
  /idioms_data\.ts$/,
];

function md5(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function extractEnglishPhrases(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const phrases = new Set();
  for (const m of content.matchAll(/english:\s*['"`]([^'"`\n]+)['"`]/g)) {
    phrases.add(m[1].trim());
  }
  return phrases;
}

function fetchTTS(text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'tts-1-hd', voice: 'nova', input: text });
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/audio/speech',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`OpenAI TTS error ${res.statusCode}: ${Buffer.concat(chunks).toString()}`));
        } else {
          resolve(Buffer.concat(chunks));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  let data;
  try { data = JSON.parse(input); } catch { process.exit(0); }

  const filePath = data?.tool_input?.file_path || data?.tool_response?.filePath || '';
  const normalizedPath = filePath.replace(/\\/g, '/');

  const isWatched = WATCHED_PATTERNS.some(p => p.test(normalizedPath));
  if (!isWatched) process.exit(0);

  if (!API_KEY) {
    console.error('[audio-hook] OPENAI_API_KEY not set — skipping audio regeneration');
    process.exit(0);
  }

  if (!fs.existsSync(filePath)) process.exit(0);

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
  const phrases = extractEnglishPhrases(filePath);
  const missing = [...phrases].filter(p => !index[p]);

  if (missing.length === 0) {
    console.log('[audio-hook] No new phrases detected — audio up to date.');
    process.exit(0);
  }

  console.log(`\n[audio-hook] Detected ${missing.length} new/changed phrase(s) in ${path.basename(filePath)}`);
  console.log('═══════════════════════════════════════════');

  let success = 0, failed = 0;
  for (const phrase of missing) {
    process.stdout.write(`  ▶ "${phrase}" ... `);
    try {
      const audio = await fetchTTS(phrase);
      const filename = `${md5(phrase)}.mp3`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), audio);
      index[phrase] = filename;
      console.log(`✓ ${filename}`);
      success++;
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      failed++;
    }
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

  console.log('═══════════════════════════════════════════');
  console.log(`[audio-hook] Done: ${success} generated, ${failed} failed. index.json saved.\n`);
}

main().catch(err => {
  console.error('[audio-hook] Fatal error:', err.message);
  process.exit(0);
});
