#!/usr/bin/env node
/**
 * regen_plan_listen_audio_targeted.mjs â€” regenerate ONLY the plan-phrase mp3s whose
 * text drifted (detected by check_plan_audio_freshness.mjs), instead of all 2730.
 *
 * For each stale asset it:
 *   1) calls OpenAI TTS (same model/voice/speed as the full generator) for the NEW text,
 *   2) overwrites the existing mp3 file in place (old audio removed = replaced),
 *   3) updates the asset's targetText + durationMs in personal_plan_runtime_audio_assets.generated.ts.
 *
 * Guarded against accidental spend:
 *   node scripts/regen_plan_listen_audio_targeted.mjs --dry      # no spend, shows plan
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_plan_listen_audio_targeted.mjs
 *
 * Reads OPENAI_TTS_API_KEY from env or .env.local. After running, re-run the freshness
 * checker â€” it must report 0 stale.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { writePlanRuntimeAudioCompact } from './write_plan_runtime_audio_compact.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

// Same TTS settings as scripts/regen_plan_listen_audio_full.mjs
const MODEL = 'gpt-4o-mini-tts';
const VOICE = 'alloy';
const SPEED = 0.95;
const BITRATE_BYTES_PER_MS = 128000 / 8 / 1000; // 128 kbps constant

if (!DRY && process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
  console.error('Refusing to spend on OpenAI TTS. Set PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 (or pass --dry).');
  process.exit(1);
}

let API_KEY = process.env.OPENAI_TTS_API_KEY;
if (!API_KEY) {
  const envPath = path.join(ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.trim().startsWith('OPENAI_TTS_API_KEY='));
    if (line) API_KEY = line.slice(line.indexOf('=') + 1).trim();
  }
}
if (!DRY && !API_KEY) {
  console.error('No OPENAI_TTS_API_KEY in env or .env.local');
  process.exit(1);
}

// 1) Get the stale list from the freshness checker (run it as a child via tsx).
//    The checker exits 1 when stale assets exist (by design), so capture stdout
//    regardless of exit code.
function staleList() {
  let out;
  try {
    out = execFileSync('npx', ['tsx', path.join('scripts', 'check_plan_audio_freshness.mjs'), '--json'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32',
    });
  } catch (err) {
    out = err.stdout; // exit 1 = stale found; JSON is still on stdout
    if (!out) throw err;
  }
  return JSON.parse(out).stale;
}

async function tts(text, outPath) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: 'mp3', speed: SPEED }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

function updateRegistryTargetText(stale, newDurationByUnit) {
  const regPath = path.join(ROOT, 'app', 'personal_plan_runtime_audio_assets.generated.ts');
  let src = fs.readFileSync(regPath, 'utf8');
  for (const s of stale) {
    // Replace targetText for the object containing this contentUnit. Anchor on the unique contentUnit id.
    const cuAnchor = `"${s.contentUnit}"`;
    const idx = src.indexOf(cuAnchor);
    if (idx === -1) { console.warn(`registry: contentUnit ${s.contentUnit} not found`); continue; }
    // Find the targetText after this anchor and replace its value.
    const ttKey = '"targetText":';
    const ttPos = src.indexOf(ttKey, idx);
    const q1 = src.indexOf('"', ttPos + ttKey.length);
    let q2 = q1 + 1;
    while (q2 < src.length && !(src[q2] === '"' && src[q2 - 1] !== '\\')) q2 += 1;
    const newVal = JSON.stringify(s.currentEnglish).slice(1, -1);
    src = src.slice(0, q1 + 1) + newVal + src.slice(q2);
    // Update durationMs if known.
    const dur = newDurationByUnit.get(s.contentUnit);
    if (dur) {
      const dKey = '"durationMs":';
      const dPos = src.indexOf(dKey, idx);
      if (dPos !== -1) {
        const numStart = dPos + dKey.length;
        const numEnd = src.indexOf(',', numStart);
        src = src.slice(0, numStart) + ` ${dur}` + src.slice(numEnd);
      }
    }
  }
  fs.writeFileSync(regPath, src);
}

async function main() {
  const stale = staleList();
  console.log(`Targeted audio regen: ${stale.length} stale mp3(s).`);
  if (stale.length === 0) { console.log('Nothing to do.'); return; }
  for (const s of stale) {
    console.log(`  ${s.contentUnit}: "${s.currentEnglish}" -> ${s.uri}`);
  }
  if (DRY) { console.log('\n[dry] no OpenAI spend, no files written.'); return; }

  const newDuration = new Map();
  for (const s of stale) {
    const abs = path.join(ROOT, s.uri);
    const bytes = await tts(s.currentEnglish, abs);
    newDuration.set(s.contentUnit, Math.round(bytes / BITRATE_BYTES_PER_MS));
    console.log(`  regenerated ${s.uri} (${bytes} bytes)`);
  }
  updateRegistryTargetText(stale, newDuration);
  writePlanRuntimeAudioCompact();
  console.log('Registry targetText/durationMs updated. Re-run check_plan_audio_freshness.mjs to confirm 0 stale.');
}

main().catch((e) => { console.error(e); process.exit(1); });
