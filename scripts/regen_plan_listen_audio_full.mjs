/**
 * regen_plan_listen_audio_full.mjs
 *
 * FULL fix for the "На слух" (listen-choose) audio desync.
 *
 * Problem this fixes:
 *   The runtime audio registry only ever contained ~48 real mp3 files (plan days
 *   1-2). Through a bloated `contentUnitIds` mapping, a single day-2 mp3 was
 *   assigned to phrase_1 of EVERY later day, so the listening exercise played the
 *   wrong sentence on ~2682 of 2730 phrases (98%) — the spoken audio never matched
 *   any answer card. See CONTENT_QUALITY_AUDIT.
 *
 * What this script does:
 *   1. Generates ONE dedicated mp3 per (plan, day, phrase 1-5) — 2730 files total —
 *      voicing the CURRENT authored English text via OpenAI TTS.
 *   2. Rebuilds `app/personal_plan_runtime_audio_assets.generated.ts` so every asset
 *      maps to EXACTLY ONE contentUnitId (1 mp3 = 1 phrase), with its own targetText
 *      and uri. The bloated many-days-to-one-mp3 mapping is removed.
 *   3. Rebuilds `app/personal_plan_runtime_audio_asset_modules.ts` (the static Metro
 *      require() map) so every new mp3 resolves at runtime.
 *
 * contentUnitId / uri format (matches runtime, see catalog padStart(3)):
 *   id : {plan}_d{NNN}_content_unit_phrase_{K}              (K = 1..5)
 *   uri: assets/audio/personal-plans-runtime/{plan}/runtime/
 *        {plan}-d{NNN}-listen-audio/{plan}-d{NNN}-content-unit-phrase-{K}.mp3
 *
 * Run (DRY first, no spend):  node scripts/regen_plan_listen_audio_full.mjs --dry
 * Run (real spend):           PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 node scripts/regen_plan_listen_audio_full.mjs
 *   --only=voyazh,echo   restrict to certain plans
 *   --force              re-render even if the mp3 already exists on disk (resumable by default)
 *   --concurrency=4      parallel TTS requests (default 4)
 * Reads OPENAI_API_KEY from env or .env.local.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PLANS = ['voyazh', 'echo', 'gavan', 'impuls', 'mitap'];
const PHRASES_PER_DAY = 5; // listen-choose uses phrases 1..5 (catalog.ts:729)
const VOICE = 'alloy';
const MODEL = 'gpt-4o-mini-tts';
const SPEED = 0.95;

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean) : null;
const concArg = process.argv.find((a) => a.startsWith('--concurrency='));
const CONCURRENCY = Math.max(1, Number(concArg ? concArg.split('=')[1] : 4) || 4);

const activePlans = ONLY ? PLANS.filter((p) => ONLY.includes(p)) : PLANS;

// ── dev-spend guard (skipped in --dry) ──────────────────────────────────────
if (!DRY && process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND !== '1') {
  console.error('Refusing to spend on OpenAI TTS. Set PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 (or pass --dry).');
  process.exit(2);
}

// ── load OPENAI_API_KEY ─────────────────────────────────────────────────────
let API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    const line = env.split(/\r?\n/).find((l) => l.trim().startsWith('OPENAI_API_KEY='));
    if (line) API_KEY = line.split('=', 2)[1].trim().replace(/^["']|["']$/g, '');
  } catch {}
}
if (!DRY && !API_KEY) {
  console.error('No OPENAI_API_KEY in env or .env.local');
  process.exit(1);
}

// ── load current authored content ───────────────────────────────────────────
const DATA_DIR = path.join(ROOT, '.codex-tmp', 'audit', 'data');
const content = {}; // plan -> day -> [english...]
for (const plan of activePlans) {
  const days = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${plan}.json`), 'utf8'));
  content[plan] = {};
  for (const d of days) content[plan][d.dayIndex] = d.phrases.map((p) => (p.english || '').trim());
}

const pad3 = (n) => String(n).padStart(3, '0');

function buildTargets() {
  // returns [{ plan, day, k, text, contentUnitId, uri, blockId, id }]
  const out = [];
  for (const plan of activePlans) {
    const days = Object.keys(content[plan]).map(Number).sort((a, b) => a - b);
    for (const day of days) {
      const list = content[plan][day];
      for (let k = 1; k <= PHRASES_PER_DAY; k++) {
        const text = list[k - 1];
        if (!text) { console.warn(`WARN missing text ${plan} d${day} p${k}`); continue; }
        const dd = pad3(day);
        const contentUnitId = `${plan}_d${dd}_content_unit_phrase_${k}`;
        const dir = `assets/audio/personal-plans-runtime/${plan}/runtime/${plan}-d${dd}-listen-audio`;
        const uri = `${dir}/${plan}-d${dd}-content-unit-phrase-${k}.mp3`;
        const blockId = `${plan}_d${dd}:listen-audio`;
        const id = `audio:${plan}:runtime:${plan}-d${dd}-listen-audio:${plan}-d${dd}-content-unit-phrase-${k}`;
        out.push({ plan, day, k, text, contentUnitId, uri, blockId, id });
      }
    }
  }
  return out;
}

async function tts(text, outPath) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: 'mp3', speed: SPEED }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buf);
  return buf.length;
}

// ── simple bounded-concurrency runner ───────────────────────────────────────
async function runPool(items, worker, concurrency) {
  let i = 0, ok = 0, failed = 0;
  const errors = [];
  async function next() {
    while (i < items.length) {
      const idx = i++;
      try { await worker(items[idx], idx); ok++; }
      catch (e) { failed++; errors.push({ item: items[idx], error: String(e) }); console.error(`FAIL ${items[idx].contentUnitId}: ${e}`); }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, next));
  return { ok, failed, errors };
}

function esc(s) { return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

// OpenAI gpt-4o-mini-tts mp3 output is constant 128 kbps, so duration in ms is
// bytes * 8 / 128 = bytes / 16 (verified against ffprobe: 36096b -> 2256ms).
// durationMs > 0 is REQUIRED by validatePlanAudioAsset for productionReady — without
// it every asset is rejected and the listening exercise stays blocked.
function durationMsForFile(uri) {
  const p = path.join(ROOT, uri);
  const bytes = fs.statSync(p).size;
  return Math.max(1, Math.round(bytes / 16));
}

function writeRegistry(targets) {
  const assets = targets.map((t) => ({
    id: t.id,
    blockId: t.blockId,
    contentUnitIds: [t.contentUnitId],
    targetText: t.text,
    locale: 'en',
    status: 'approved',
    assetId: t.id,
    uri: t.uri,
    durationMs: durationMsForFile(t.uri),
    voiceId: `openai:${VOICE}`,
    provider: 'openai',
    finalAssetReady: true,
  }));
  const header = `import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';\n\n` +
    `// AUTO-GENERATED by scripts/regen_plan_listen_audio_full.mjs — do not edit by hand.\n` +
    `// One asset per content unit (1 mp3 = 1 phrase). ${assets.length} assets.\n\n` +
    `export const GENERATED_RUNTIME_AUDIO_ASSETS: PlanAudioAsset[] = `;
  const body = JSON.stringify(assets, null, 2);
  fs.writeFileSync(
    path.join(ROOT, 'app', 'personal_plan_runtime_audio_assets.generated.ts'),
    `${header}${body};\n`,
  );
  return assets.length;
}

function writeModules(targets) {
  // Preserve the EXISTING contract exactly: a const map + the named getter
  // getPersonalPlanRuntimeAudioAssetModule(uri) used by
  // personal_plan_listening_playback_contract.ts. Do NOT switch to default export.
  const lines = targets.map((t) =>
    `  '${t.uri}': require('../${t.uri}'),`);
  const out =
    `// AUTO-GENERATED by scripts/regen_plan_listen_audio_full.mjs — do not edit by hand.\n` +
    `// Static require() map so Metro bundles every runtime listen-audio mp3.\n` +
    `const RUNTIME_AUDIO_ASSET_MODULES: Record<string, number> = {\n` +
    `${lines.join('\n')}\n};\n\n` +
    `export function getPersonalPlanRuntimeAudioAssetModule(uri: string): number | undefined {\n` +
    `  return RUNTIME_AUDIO_ASSET_MODULES[uri.trim().replace(/\\\\/g, '/')];\n` +
    `}\n`;
  fs.writeFileSync(path.join(ROOT, 'app', 'personal_plan_runtime_audio_asset_modules.ts'), out);
  return lines.length;
}

// ── verify modules file shape before overwriting (keep existing export style) ─
function detectModulesExport() {
  const p = path.join(ROOT, 'app', 'personal_plan_runtime_audio_asset_modules.ts');
  const txt = fs.readFileSync(p, 'utf8');
  return {
    hasGetter: /export function getPersonalPlanRuntimeAudioAssetModule/.test(txt),
    firstLines: txt.split(/\r?\n/).slice(0, 3),
  };
}

(async () => {
  const targets = buildTargets();
  console.log(`Plans: ${activePlans.join(', ')}`);
  console.log(`Targets (phrases): ${targets.length}  | mode: ${DRY ? 'DRY (no spend)' : 'LIVE'}  | concurrency: ${CONCURRENCY}`);

  const modulesInfo = detectModulesExport();
  console.log(`Existing modules getter present: ${modulesInfo.hasGetter}`);
  if (!modulesInfo.hasGetter) {
    console.error('Existing modules file does not have the expected getter export — aborting to avoid breaking the import contract.');
    process.exit(5);
  }

  // resumability: skip files already present unless --force
  const pending = targets.filter((t) => FORCE || !fs.existsSync(path.join(ROOT, t.uri)));
  console.log(`Already on disk: ${targets.length - pending.length} | to generate: ${pending.length}`);

  if (DRY) {
    console.log('\n[dry] sample of 5 targets:');
    for (const t of targets.slice(0, 5)) console.log(`  ${t.contentUnitId} -> "${t.text}"  (${t.uri})`);
    console.log('\n[dry] NOT writing files. Re-run without --dry (and with spend flag) to generate.');
    // still show what the registry/modules counts WOULD be
    console.log(`[dry] registry assets would be: ${targets.length}`);
    console.log(`[dry] modules entries would be: ${targets.length}`);
    return;
  }

  // 1) generate audio
  const t0 = Date.now();
  const { ok, failed, errors } = await runPool(pending, async (t) => {
    const outPath = path.join(ROOT, t.uri);
    await tts(t.text, outPath);
    process.stdout.write(`.`);
  }, CONCURRENCY);
  console.log(`\nAudio: ${ok} generated, ${failed} failed in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (failed > 0) {
    console.error(`\n${failed} TTS calls failed (likely rate limit). Re-run the SAME command to resume (existing files are skipped).`);
    fs.writeFileSync(path.join(ROOT, '.codex-tmp', 'audit', 'tts_failures.json'), JSON.stringify(errors, null, 2));
    process.exit(3);
  }

  // 2) verify every target file now exists before rewriting registries
  const stillMissing = targets.filter((t) => !fs.existsSync(path.join(ROOT, t.uri)));
  if (stillMissing.length > 0) {
    console.error(`Refusing to rewrite registries: ${stillMissing.length} mp3 still missing. Re-run to finish generation.`);
    process.exit(4);
  }

  // 3) rewrite registries
  const nAssets = writeRegistry(targets);
  const nModules = writeModules(targets);
  console.log(`Registry assets written: ${nAssets}`);
  console.log(`Modules entries written: ${nModules}`);
  console.log('Done. Run the listening tests next.');
})();
