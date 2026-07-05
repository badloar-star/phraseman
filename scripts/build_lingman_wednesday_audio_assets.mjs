#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env.local');
const MODEL = 'gpt-4o-mini-tts';
const FORMAT = 'mp3';
const RU_VOICE = 'marin';
const EN_VOICE = 'coral';

const rawArgs = process.argv.slice(2);

function argValue(name, fallback = '') {
  const eq = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const index = rawArgs.indexOf(name);
  return index >= 0 ? rawArgs[index + 1] || fallback : fallback;
}

const PHRASES_PATH = path.resolve(argValue('--phrases'));
const OUT_DIR = path.resolve(argValue('--out-dir', path.join(ROOT, '.codex-tmp', 'lingman-wednesday-audio-assets')));
const MANIFEST_PATH = path.resolve(argValue('--manifest', path.join(OUT_DIR, 'manifest.json')));
const FORCE = rawArgs.includes('--force');

const RU_INSTRUCTIONS =
  'Speak in Russian with a warm, calm language-teacher tone. Use clear native pronunciation and a confident short-video pace. Say only the phrase exactly as written, then stop cleanly.';
const EN_INSTRUCTIONS =
  'Speak English with a warm, calm language-teacher tone. Use clear pronunciation for learners and a confident short-video pace. Say only the phrase exactly as written, then stop cleanly.';

function die(message) {
  console.error(message);
  process.exit(1);
}

function readEnvValue(name) {
  const direct = (process.env[name] || '').trim();
  if (direct) return direct;
  if (!fs.existsSync(ENV_PATH)) return '';
  for (const raw of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const [key, ...rest] = line.split('=');
    if (key.trim() === name) return rest.join('=').trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function parseRows(filePath) {
  if (!filePath || !fs.existsSync(filePath)) die(`Missing --phrases file: ${filePath}`);
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter((line) => line.trim());
  const header = lines.shift()?.split('|') || [];
  const idx = Object.fromEntries(header.map((name, index) => [name, index]));
  for (const required of ['video', 'slot', 'role', 'phrase_en', 'translation_ru', 'note']) {
    if (!(required in idx)) die(`Missing PSV column: ${required}`);
  }
  const rows = lines.map((line, index) => {
    const parts = line.split('|');
    return {
      index: index + 1,
      video: Number(parts[idx.video]),
      slot: Number(parts[idx.slot]),
      role: parts[idx.role],
      phraseEn: parts[idx.phrase_en],
      translationRu: parts[idx.translation_ru],
      note: parts[idx.note] || '',
    };
  });
  if (rows.length !== 300) die(`Expected 300 rows, got ${rows.length}`);
  return rows;
}

async function openaiTts(apiKey, { text, voice, instructions, outPath }) {
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, voice, input: text, instructions, response_format: FORMAT }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 1024) throw new Error(`small audio (${buffer.length} bytes)`);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(`${outPath}.tmp`, buffer);
      fs.renameSync(`${outPath}.tmp`, outPath);
      return buffer.length;
    } catch (error) {
      last = error?.message || String(error);
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw new Error(`TTS failed for "${text}": ${last}`);
}

function durationUs(filePath) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
    { encoding: 'utf8' },
  ).trim();
  const seconds = Number(out);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`Bad duration: ${filePath}`);
  return Math.round(seconds * 1_000_000);
}

async function main() {
  if (process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
    die('Set PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 to generate OpenAI TTS.');
  }
  const apiKey = readEnvValue('OPENAI_TTS_API_KEY');
  if (!apiKey) die('OPENAI_TTS_API_KEY missing');
  const rows = parseRows(PHRASES_PATH);
  const ruDir = path.join(OUT_DIR, 'ru');
  const enDir = path.join(OUT_DIR, 'en');
  fs.mkdirSync(ruDir, { recursive: true });
  fs.mkdirSync(enDir, { recursive: true });
  const manifestRows = [];
  let generated = 0;
  let skipped = 0;
  for (const row of rows) {
    const number = String(row.index).padStart(3, '0');
    const ruPath = path.join(ruDir, `${number}.mp3`);
    const enPath = path.join(enDir, `${number}.mp3`);
    if (FORCE || !fs.existsSync(ruPath) || fs.statSync(ruPath).size < 1024) {
      console.log(`[tts-ru] ${number}/300 ${row.translationRu}`);
      await openaiTts(apiKey, { text: row.translationRu, voice: RU_VOICE, instructions: RU_INSTRUCTIONS, outPath: ruPath });
      generated += 1;
    } else skipped += 1;
    if (FORCE || !fs.existsSync(enPath) || fs.statSync(enPath).size < 1024) {
      console.log(`[tts-en] ${number}/300 ${row.phraseEn}`);
      await openaiTts(apiKey, { text: row.phraseEn, voice: EN_VOICE, instructions: EN_INSTRUCTIONS, outPath: enPath });
      generated += 1;
    } else skipped += 1;
    manifestRows.push({
      ...row,
      ruPath,
      enPath,
      ruDurationUs: durationUs(ruPath),
      enDurationUs: durationUs(enPath),
      ruSize: fs.statSync(ruPath).size,
      enSize: fs.statSync(enPath).size,
    });
  }
  const manifest = {
    status: manifestRows.length === 300 ? 'ready' : 'partial',
    generatedAt: new Date().toISOString(),
    phrasesPath: PHRASES_PATH,
    outDir: OUT_DIR,
    model: MODEL,
    format: FORMAT,
    ruVoice: RU_VOICE,
    enVoice: EN_VOICE,
    generated,
    skipped,
    rows: manifestRows,
  };
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ status: manifest.status, generated, skipped, manifest: MANIFEST_PATH, outDir: OUT_DIR }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
