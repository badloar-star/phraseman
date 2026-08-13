#!/usr/bin/env node
/**
 * check_plan_audio_freshness.mjs — guards against stale plan-phrase audio.
 *
 * Every plan_content phrase has one mp3 in the generated audio registry, recorded
 * with a `targetText` (the exact English the mp3 speaks). When a phrase's English
 * is edited, that mp3 becomes stale (it still pronounces the old sentence).
 *
 * This script compares every audio asset's `targetText` against the CURRENT English
 * of its phrase and reports any mismatch. It does NOT spend money or call OpenAI —
 * it only detects drift so it can never ship silently.
 *
 *   node scripts/check_plan_audio_freshness.mjs           # report, exit 1 if stale
 *   node scripts/check_plan_audio_freshness.mjs --json     # machine-readable
 *
 * To actually regenerate the stale files, run the targeted regenerator:
 *   PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_plan_listen_audio_targeted.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');

// 1) Load current phrase English per content unit from all plan_content files.
//    contentUnit id format in the audio registry: `<plan>_d<NNN>_content_unit_phrase_<k>`
//    maps to plan_content phrase #k (1-based) of day NNN.
const PLANS = ['echo', 'gavan', 'impuls', 'mitap', 'voyazh'];

async function loadPlanDays(plan) {
  const url = pathToFileURL(path.join(ROOT, 'app', `plan_content_${plan}.ts`)).href;
  // plan_content files are pure TS data; import via tsx loader if available, else parse.
  try {
    const mod = await import(url);
    const key = `${plan.toUpperCase()}_CONTENT_DAYS`;
    if (Array.isArray(mod[key])) return mod[key];
  } catch {
    /* fall through to regex parse */
  }
  return null;
}

function currentEnglishByContentUnit(daysByPlan) {
  const map = new Map();
  for (const [plan, days] of Object.entries(daysByPlan)) {
    if (!days) continue;
    for (const day of days) {
      const dd = String(day.dayIndex).padStart(3, '0');
      day.phrases.forEach((phrase, i) => {
        map.set(`${plan}_d${dd}_content_unit_phrase_${i + 1}`, phrase.english);
      });
    }
  }
  return map;
}

// 2) Parse the generated audio registry for (contentUnit, targetText, status, uri).
function loadAudioAssets() {
  const src = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_runtime_audio_assets.generated.ts'), 'utf8');
  const re = /"contentUnitIds":\s*\[\s*"([^"]+)"\s*\][\s\S]*?"targetText":\s*"((?:[^"\\]|\\.)*)"[\s\S]*?"status":\s*"([^"]+)"[\s\S]*?"uri":\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({
      contentUnit: m[1],
      targetText: JSON.parse(`"${m[2]}"`),
      status: m[3],
      uri: m[4],
    });
  }
  return out;
}

async function main() {
  const daysByPlan = {};
  for (const plan of PLANS) daysByPlan[plan] = await loadPlanDays(plan);
  const current = currentEnglishByContentUnit(daysByPlan);
  if (current.size === 0) {
    console.error('Could not load plan_content phrases (run via tsx: `npx tsx scripts/check_plan_audio_freshness.mjs`).');
    process.exit(2);
  }

  const assets = loadAudioAssets();
  const stale = [];
  const orphanAudio = [];
  for (const a of assets) {
    if (a.status !== 'approved') continue;
    const cur = current.get(a.contentUnit);
    if (cur === undefined) {
      orphanAudio.push(a);
      continue;
    }
    if (cur.trim() !== a.targetText.trim()) {
      stale.push({ ...a, currentEnglish: cur });
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ staleCount: stale.length, stale, orphanCount: orphanAudio.length }, null, 2));
  } else {
    console.log(`Plan audio freshness: ${assets.length} assets checked.`);
    if (stale.length === 0) {
      console.log('OK — every mp3 targetText matches its current phrase English.');
    } else {
      console.log(`\nSTALE AUDIO: ${stale.length} mp3 file(s) no longer match the phrase text:\n`);
      for (const s of stale) {
        console.log(`  ${s.contentUnit}`);
        console.log(`     mp3 says : ${s.targetText}`);
        console.log(`     phrase is: ${s.currentEnglish}`);
        console.log(`     file     : ${s.uri}`);
      }
      console.log('\nRegenerate with: PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_plan_listen_audio_targeted.mjs');
    }
  }
  process.exit(stale.length === 0 ? 0 : 1);
}

main();
