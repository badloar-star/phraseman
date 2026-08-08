/**
 * regen_plan_listen_audio.mjs
 * Re-generates the "ÐÐ° ÑÐ»ÑƒÑ…" (listen-choose) audio for plan days 1-2 to MATCH the
 * current authored content (the Ð¤4 rewrite left the audio voicing the OLD phrases,
 * so the listening exercise had NO correct answer among the options).
 *
 * For each runtime audio asset:
 *   - resolves the current English phrase from the content unit id (positional),
 *   - re-renders the mp3 with OpenAI TTS to the SAME uri,
 *   - rewrites targetText in personal_plan_runtime_audio_assets.generated.ts.
 *
 * Run: PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_plan_listen_audio.mjs
 * Reads OPENAI_TTS_API_KEY from env or .env.local.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { writePlanRuntimeAudioCompact } from './write_plan_runtime_audio_compact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// â”€â”€ dev-spend guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
  console.error('Refusing to spend on OpenAI TTS. Set PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 to proceed.');
  process.exit(2);
}

// â”€â”€ load OPENAI_TTS_API_KEY from env or .env.local â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let API_KEY = process.env.OPENAI_TTS_API_KEY;
if (!API_KEY) {
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    const line = env.split(/\r?\n/).find((l) => l.trim().startsWith('OPENAI_TTS_API_KEY='));
    if (line) API_KEY = line.split('=', 2)[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
}
if (!API_KEY) {
  console.error('No OPENAI_TTS_API_KEY in env or .env.local');
  process.exit(1);
}

const VOICE = 'alloy'; // matches existing asset voiceId openai:alloy
const MODEL = 'gpt-4o-mini-tts';
const DRY = process.argv.includes('--dry');

// â”€â”€ load current content (extracted JSON) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DATA_DIR = path.join(ROOT, '.codex-tmp', 'audit', 'data');
const content = {}; // plan -> day -> [english...]
for (const plan of ['mitap', 'gavan', 'impuls', 'echo', 'voyazh']) {
  const days = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${plan}.json`), 'utf8'));
  content[plan] = {};
  for (const d of days) content[plan][d.dayIndex] = d.phrases.map((p) => p.english);
}

// â”€â”€ load asset list (dumped) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const assets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.codex-tmp', 'audit', 'audio_assets.json'), 'utf8'));

function resolvePhrase(contentUnitId) {
  // <plan>_d00N_content_unit_phrase_K  OR  <plan>_dN_phrase_K
  let m = contentUnitId.match(/^(\w+?)_d0*(\d+)_content_unit_phrase_(\d+)$/)
       || contentUnitId.match(/^(\w+?)_d0*(\d+)_phrase_(\d+)$/);
  if (!m) return null;
  const [, plan, day, k] = m;
  const list = content[plan]?.[Number(day)];
  if (!list) return null;
  return list[Number(k) - 1] || null;
}

async function tts(text, outPath) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: 'mp3', speed: 0.95 }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

const updates = []; // { oldTarget, newTarget }
let done = 0, skipped = 0;
for (const a of assets) {
  const cu = a.contentUnitIds[0];
  const phrase = resolvePhrase(cu);
  if (!phrase) { console.warn(`SKIP ${cu}: no current phrase`); skipped++; continue; }
  const same = phrase.trim() === (a.targetText || '').trim();
  updates.push({ id: a.id, contentUnitId: cu, oldTarget: a.targetText, newTarget: phrase, uri: a.uri, same });
  if (same) { skipped++; continue; }
  if (DRY) { console.log(`[dry] ${cu}: "${a.targetText}" -> "${phrase}"`); done++; continue; }
  const outPath = path.join(ROOT, a.uri);
  const bytes = await tts(phrase, outPath);
  console.log(`OK ${cu}: "${phrase}" (${bytes}b)`);
  done++;
}

// â”€â”€ rewrite targetText in the generated registry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const regPath = path.join(ROOT, 'app', 'personal_plan_runtime_audio_assets.generated.ts');
let reg = fs.readFileSync(regPath, 'utf8');
let rewrites = 0;
for (const u of updates) {
  if (u.same) continue;
  // replace targetText within the asset object identified by its unique id
  const idEsc = u.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`("id":\\s*"${idEsc}"[\\s\\S]*?"targetText":\\s*")([^"]*)(")`);
  const before = reg;
  reg = reg.replace(re, (_m, p1, _old, p3) => p1 + u.newTarget.replace(/"/g, '\\"') + p3);
  if (reg !== before) rewrites++;
  else console.warn(`registry: could not rewrite targetText for ${u.id}`);
}
if (!DRY) {
  fs.writeFileSync(regPath, reg);
  writePlanRuntimeAudioCompact();
}

console.log(`\nDone: ${done} generated, ${skipped} skipped (already matching). Registry rewrites: ${rewrites}${DRY ? ' (dry)' : ''}`);
