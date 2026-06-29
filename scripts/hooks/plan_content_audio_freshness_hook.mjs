#!/usr/bin/env node
/**
 * PostToolUse hook: when ANY audio-bearing content file is edited (plan content,
 * lessons, idioms — words/flashcards/daily phrases all source from these), check
 * that no mp3 has gone stale and no content text is left without audio. Surfaces a
 * warning via systemMessage + additionalContext so audio drift is never silent.
 *
 * Wired from .claude/settings.json PostToolUse (matcher Write|Edit). Reads the hook
 * payload JSON from stdin. Does NOT spend money — only detects drift.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || '{}');
} catch {
  payload = {};
}

const filePath = payload?.tool_input?.file_path
  || payload?.tool_response?.filePath
  || payload?.tool_input?.path
  || '';

const base = path.basename(String(filePath));

// Files whose edits can change spoken English (and therefore audio):
//  - plan content days (plan audio, keyed by content unit)
//  - lessons, idioms (phrase audio, keyed by English text; words/flashcards/daily
//    phrases resolve through the same phrase-audio map)
const AUDIO_BEARING = /^(plan_content_(echo|gavan|impuls|mitap|voyazh)|lesson_data_\d+_\d+|idioms_data|quiz_data)\.ts$/;

if (!AUDIO_BEARING.test(base)) process.exit(0);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const res = spawnSync('node', [path.join('scripts', 'check_all_audio_freshness.mjs'), '--json'], {
  cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32',
});

let report = {};
try {
  report = JSON.parse(res.stdout || '{}');
} catch {
  process.exit(0); // checker couldn't run — don't block
}

const planDrift = report.planDrift || [];
const phraseMissing = report.phraseMissing || [];
if (planDrift.length === 0 && phraseMissing.length === 0) process.exit(0);

const parts = [];
if (planDrift.length) {
  parts.push(`STALE PLAN AUDIO: ${planDrift.length} mp3(s) speak OLD text:`);
  for (const s of planDrift.slice(0, 25)) parts.push(`  • ${s.contentUnit}: mp3 says "${s.targetText}" but phrase is "${s.currentEnglish}"`);
  parts.push('  Fix: PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_plan_listen_audio_targeted.mjs');
}
if (phraseMissing.length) {
  parts.push(`MISSING PHRASE AUDIO: ${phraseMissing.length} English text(s) have NO audio (new/changed phrase not yet generated):`);
  for (const m of phraseMissing.slice(0, 25)) parts.push(`  • [${m.sourceFile}] "${m.text}"`);
  parts.push('  Fix: PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_phrase_audio.mjs "<text>"  (then upload + patch the phrase-audio url map)');
}
const msg = `AUDIO OUT OF SYNC after this edit. The mp3 must be regenerated + re-uploaded (and the old one replaced) so the spoken audio matches the text.\n\n${parts.join('\n')}`;

process.stdout.write(JSON.stringify({
  systemMessage: msg,
  hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg },
}));
process.exit(0);
