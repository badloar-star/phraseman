/**
 * Generate the exact 30x20 EN→RU balanced pack from its supplied CSV manifest.
 *
 * Russian: FR-4, eleven_multilingual_v2, speed 0.80 → folder 1/0001..0600.mp3
 * English: NOAH, eleven_multilingual_v2, speed 0.70 → folder 2/0001..0600.mp3
 *
 * The run is resumable. A valid existing numbered MP3 is never regenerated.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE = path.resolve(process.argv[2] || '');
const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const REPAIR_MODE = process.argv.includes('--repair-mode');
const SKIP_RU = process.argv.includes('--skip-ru');
const SKIP_EN = process.argv.includes('--skip-en');
const MODEL_ID = 'eleven_multilingual_v2';
const COUNT = 600;
const CONCURRENCY = 4;
const VOICES = Object.freeze({
  ru: Object.freeze({
    folder: '1', column: 'russian', name: 'FR-4 Русская женщина (для французского курса)', voiceId: '3xiRNk1F6htZIe71aSoL', speed: 0.8,
    settings: Object.freeze({ stability: 0.42, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true, speed: 0.8 }),
  }),
  en: Object.freeze({
    folder: '2', column: 'english', name: 'NOAH', voiceId: 'Opeqo5AyrxslHq7KyAj5', speed: 0.7,
    settings: Object.freeze({ stability: 0.42, similarity_boost: 0.8, style: 0.12, use_speaker_boost: true, speed: 0.7 }),
  }),
});

function fail(message) { throw new Error(message); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function valid(file) { return fs.existsSync(file) && fs.statSync(file).size >= 1024; }

function selectedIndexes(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return null;
  const raw = (process.argv[index + 1] || '').trim();
  if (!raw) fail(`${flag} requires a comma-separated list of indexes.`);
  const result = new Set(raw.split(',').map((part) => Number(part.trim())));
  if (!result.size || [...result].some((value) => !Number.isInteger(value) || value < 1 || value > COUNT)) {
    fail(`${flag} contains an invalid index; expected 1..${COUNT}.`);
  }
  return result;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

function readManifest() {
  if (!TEMPLATE || !fs.existsSync(TEMPLATE)) fail('Pass the CAPCUT_TEMPLATE folder as the first argument.');
  const csv = path.join(TEMPLATE, 'ELEVENLABS_BATCH_MANIFEST.csv');
  const rows = parseCsv(fs.readFileSync(csv, 'utf8'));
  const header = rows.shift();
  const positions = Object.fromEntries(header.map((value, index) => [value.replace(/^\uFEFF/, ''), index]));
  for (const required of ['index', 'folder_1_ru', 'folder_2_en', 'russian', 'english']) {
    if (positions[required] === undefined) fail(`Manifest missing ${required}.`);
  }
  if (rows.length !== COUNT) fail(`Manifest has ${rows.length} entries; expected ${COUNT}.`);
  return rows.map((row, offset) => {
    const expected = offset + 1;
    if (Number(row[positions.index]) !== expected) fail(`Manifest index ${offset + 2} is not ${expected}.`);
    const ruFile = row[positions.folder_1_ru];
    const enFile = row[positions.folder_2_en];
    if (ruFile !== `${String(expected).padStart(4, '0')}.mp3` || enFile !== ruFile) fail(`Manifest audio filename mismatch at ${expected}.`);
    const russian = row[positions.russian].trim();
    const english = row[positions.english].trim();
    if (!russian || !english || /Ð|Ñ|�|\?\?\?\?/.test(`${russian}\n${english}`)) fail(`Invalid text at manifest entry ${expected}.`);
    return Object.freeze({ index: expected, file: ruFile, russian, english });
  });
}

async function tts(apiKey, text, voice, destination) {
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: REPAIR_MODE
            ? { ...voice.settings, stability: 0.72, style: 0.0 }
            : voice.settings,
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 1024) throw new Error(`Audio is too small (${bytes.length} bytes).`);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const temporary = `${destination}.partial`;
      fs.writeFileSync(temporary, bytes);
      fs.renameSync(temporary, destination);
      return;
    } catch (error) {
      last = error?.message || String(error);
      if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
    } finally { clearTimeout(timeout); }
  }
  fail(`TTS failed for ${path.basename(destination)}: ${last}`);
}

async function generate(apiKey, entries, language, voice, indexes) {
  const selected = indexes ? entries.filter((entry) => indexes.has(entry.index)) : entries;
  const jobs = selected.map((entry) => ({
    file: path.join(TEMPLATE, voice.folder, entry.file),
    text: entry[voice.column],
  })).filter((job) => FORCE || !valid(job.file));
  let complete = selected.length - jobs.length;
  console.log(`[${language}] selected=${selected.length} existing=${complete} pending=${jobs.length} voice=${voice.name} speed=${voice.speed} repair=${REPAIR_MODE}`);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      await tts(apiKey, job.text, voice, job.file);
      complete += 1;
      if (complete % 25 === 0 || complete === selected.length) console.log(`[${language}] ${complete}/${selected.length}`);
    }
  }));
  const invalid = selected.map((entry) => path.join(TEMPLATE, voice.folder, entry.file)).filter((file) => !valid(file));
  if (invalid.length) fail(`${language} missing output: ${invalid.slice(0, 4).join(', ')}`);
}

function writeReceipt(entries) {
  const receipt = {
    generatedAt: new Date().toISOString(), modelId: MODEL_ID,
    russian: { voice: VOICES.ru.name, voiceId: VOICES.ru.voiceId, speed: VOICES.ru.speed, textSha256: sha256(entries.map((entry) => entry.russian).join('\n')) },
    english: { voice: VOICES.en.name, voiceId: VOICES.en.voiceId, speed: VOICES.en.speed, textSha256: sha256(entries.map((entry) => entry.english).join('\n')) },
    filesPerFolder: COUNT,
  };
  fs.writeFileSync(path.join(TEMPLATE, 'ELEVENLABS_NOAH_FR4_GENERATION_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

async function main() {
  const entries = readManifest();
  const enIndexes = selectedIndexes('--en-indexes');
  const ruIndexes = selectedIndexes('--ru-indexes');
  if (DRY_RUN) {
    console.log(`[dry-run] template=${TEMPLATE} force=${FORCE} ru=${ruIndexes ? ruIndexes.size : entries.length} en=${enIndexes ? enIndexes.size : entries.length}; model=${MODEL_ID}; ru_speed=${VOICES.ru.speed}; en_speed=${VOICES.en.speed}`);
    return;
  }
  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) fail('ELEVENLABS_API_KEY is absent from the current process.');
  if (!SKIP_RU) await generate(apiKey, entries, 'ru', VOICES.ru, ruIndexes);
  if (!SKIP_EN) await generate(apiKey, entries, 'en', VOICES.en, enIndexes);
  writeReceipt(entries);
  console.log(`[complete] ${COUNT} Russian + ${COUNT} English files generated.`);
}

main().catch((error) => { console.error(`[failed] ${error?.message || error}`); process.exitCode = 1; });
