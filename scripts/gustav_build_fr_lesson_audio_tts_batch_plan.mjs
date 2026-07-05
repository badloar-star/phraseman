import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_v1.json');
const AUDIO_MANIFEST_GATE_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_gate_audit_v1.json');
const NON_ACCEPTED_GATE_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_non_accepted_rows_gate_audit_v1.json');
const OUT_PLAN_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_tts_batch_plan_v1.json');
const OUT_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_tts_batch_plan_audit_v1.json');
const OUT_MD_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_tts_batch_plan_v1.md');

const EXPECTED_ROWS = 1600;
const DEFAULT_BATCH_SIZE = 50;
const ESTIMATED_COST_PER_SLOT_USD = 0.0006;

function parseArgs(argv) {
  const args = { batchSize: DEFAULT_BATCH_SIZE };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--batch-size') args.batchSize = Number(argv[++i] || DEFAULT_BATCH_SIZE);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > 200) {
    throw new Error('--batch-size must be an integer from 1 to 200');
  }
  return args;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function readEnvValue(name) {
  const direct = String(process.env[name] || '').trim();
  if (direct) return direct;
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, envFile);
    if (!fs.existsSync(envPath)) continue;
    const line = fs.readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .find((candidate) => candidate.trim().startsWith(`${name}=`));
    if (!line) continue;
    return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function buildBatches(slots, batchSize) {
  const batches = [];
  for (let offset = 0; offset < slots.length; offset += batchSize) {
    const batchSlots = slots.slice(offset, offset + batchSize);
    const first = batchSlots[0];
    const last = batchSlots[batchSlots.length - 1];
    batches.push({
      batchNumber: batches.length + 1,
      startSlotIndex: offset + 1,
      endSlotIndex: offset + batchSlots.length,
      limit: batchSlots.length,
      lessonRange: {
        firstLessonId: first.lessonId,
        lastLessonId: last.lessonId,
      },
      phraseRange: {
        firstPhraseId: first.phraseId,
        lastPhraseId: last.phraseId,
      },
      estimatedCostUsd: Number((batchSlots.length * ESTIMATED_COST_PER_SLOT_USD).toFixed(4)),
      dryRunCommand: `node scripts/gustav_execute_fr_lesson_audio_tts_batch.mjs --start-slot ${offset + 1} --limit ${batchSlots.length} --validate-after`,
      executeCommand: `node scripts/gustav_execute_fr_lesson_audio_tts_batch.mjs --start-slot ${offset + 1} --limit ${batchSlots.length} --execute --validate-after`,
      postBatchGates: [
        'node scripts/gustav_build_fr_lesson_audio_tts_batch_plan.mjs',
        'node scripts/gustav_build_fr_lesson_audio_checksum_gate.mjs',
        'node scripts/gustav_build_fr_lesson_server_pack_manifest_gate.mjs',
      ],
    });
  }
  return batches;
}

function buildMarkdown(audit, plan) {
  const lines = [
    '# Gustav French Lesson Audio TTS Batch Plan',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Audio slots: ${audit.summary.audioSlots}`,
    `- TTS allowed slots: ${audit.summary.ttsGenerationAllowedSlots}`,
    `- Planned batches: ${audit.summary.plannedBatches}`,
    `- Estimated pending cost: $${audit.summary.estimatedPendingCostUsd}`,
    `- OpenAI TTS key present: ${audit.summary.openaiTtsApiKeyPresent ? 'yes' : 'no'}`,
    `- Spend guard open: ${audit.summary.spendGuardOpen ? 'yes' : 'no'}`,
    `- Can execute live TTS now: ${audit.summary.canExecuteLiveTtsNow ? 'yes' : 'no'}`,
    `- Ready for apply: ${audit.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## First Batches',
    '',
  ];
  for (const batch of plan.batches.slice(0, 6)) {
    lines.push(`- Batch ${batch.batchNumber}: slots ${batch.startSlotIndex}-${batch.endSlotIndex}, lessons ${batch.lessonRange.firstLessonId}-${batch.lessonRange.lastLessonId}, cost $${batch.estimatedCostUsd}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This script does not call OpenAI.');
  lines.push('- This script does not generate audio files.');
  lines.push('- Live TTS execution still requires all 1600 accepted rows plus PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1.');
  lines.push('- Audio files do not unlock server/runtime/apply without checksum, server pack, runtime and activation gates.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const manifest = readJson(AUDIO_MANIFEST_PATH);
  const manifestGate = readJson(AUDIO_MANIFEST_GATE_PATH);
  const nonAcceptedGate = readJsonIfPresent(NON_ACCEPTED_GATE_PATH);
  const slots = Array.isArray(manifest.slots) ? manifest.slots : [];
  const allowedSlots = slots.filter((slot) => slot.ttsGenerationAllowed === true);
  const blockedSlots = slots.length - allowedSlots.length;
  const batches = buildBatches(slots, args.batchSize);
  const openaiTtsApiKeyPresent = Boolean(readEnvValue('OPENAI_TTS_API_KEY'));
  const spendGuardOpen = process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND === '1';
  const allRowsAcceptedForAudio = nonAcceptedGate?.summary?.readyForAudioManifestGate === true;
  const manifestReadyForTts = manifestGate?.summary?.readyForTtsGeneration === true;
  const canExecuteLiveTtsNow = openaiTtsApiKeyPresent && spendGuardOpen && allRowsAcceptedForAudio && manifestReadyForTts && allowedSlots.length === EXPECTED_ROWS;

  const blockers = [];
  if (slots.length !== EXPECTED_ROWS) blockers.push('AUDIO_SLOT_COUNT_NOT_1600');
  if (!openaiTtsApiKeyPresent) blockers.push('OPENAI_TTS_API_KEY_MISSING');
  if (!spendGuardOpen) blockers.push('PHRASEMAN_ALLOW_OPENAI_DEV_SPEND_NOT_SET');
  if (!allRowsAcceptedForAudio) blockers.push('ALL_1600_ACCEPTED_ROWS_NOT_PROVEN');
  if (!manifestReadyForTts) blockers.push('AUDIO_MANIFEST_NOT_READY_FOR_TTS');
  if (allowedSlots.length !== EXPECTED_ROWS) blockers.push('TTS_GENERATION_NOT_ALLOWED_FOR_ALL_SLOTS');

  const plan = {
    schemaVersion: 'gustav-fr-lesson-audio-tts-batch-plan-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    activationApproved: false,
    batchSize: args.batchSize,
    estimatedCostPerSlotUsd: ESTIMATED_COST_PER_SLOT_USD,
    ttsProvider: manifest.ttsProvider,
    ttsModel: manifest.ttsModel,
    voiceId: manifest.voiceId,
    responseFormat: manifest.responseFormat,
    audioManifest: rel(AUDIO_MANIFEST_PATH),
    outputRule: 'TTS audio may be generated only after reviewer/import/non-accepted gates prove all 1600 rows are accepted. Generated audio remains local/checksum-gated before server upload.',
    batches,
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson-audio-tts-batch-plan-audit-v1',
    generatedAt,
    status: canExecuteLiveTtsNow ? 'PASS_READY_FOR_TTS_EXECUTION' : 'HOLD',
    activationApproved: false,
    inputs: {
      audioManifest: rel(AUDIO_MANIFEST_PATH),
      audioManifestGate: rel(AUDIO_MANIFEST_GATE_PATH),
      nonAcceptedRowsGate: rel(NON_ACCEPTED_GATE_PATH),
    },
    hashes: {
      audioManifestSha256: sha256(AUDIO_MANIFEST_PATH),
      audioManifestGateSha256: sha256(AUDIO_MANIFEST_GATE_PATH),
      nonAcceptedRowsGateSha256: sha256(NON_ACCEPTED_GATE_PATH),
    },
    summary: {
      audioSlots: slots.length,
      ttsGenerationAllowedSlots: allowedSlots.length,
      ttsGenerationBlockedSlots: blockedSlots,
      batchSize: args.batchSize,
      plannedBatches: batches.length,
      firstBatchStartSlot: batches[0]?.startSlotIndex || null,
      firstBatchLimit: batches[0]?.limit || 0,
      estimatedPendingCostUsd: Number((slots.length * ESTIMATED_COST_PER_SLOT_USD).toFixed(4)),
      openaiTtsApiKeyPresent,
      spendGuardOpen,
      allRowsAcceptedForAudio,
      manifestReadyForTts,
      canExecuteLiveTtsNow,
      readyForAudioChecksumGate: false,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      blockers,
    },
    safety: {
      openAiCallsMadeByThisScript: false,
      audioFilesGeneratedByThisScript: false,
      audioManifestModifiedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      firebaseOrServerUploadStarted: false,
      productionApplyApproved: false,
    },
    nextRequiredGates: canExecuteLiveTtsNow
      ? [
          'audio_tts_execution_gate',
          'audio_checksum_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'complete_llm_review_decisions',
          'review_decision_import_dry_run_gate',
          'non_accepted_rows_gate',
          'audio_manifest_gate',
          'audio_tts_batch_plan',
        ],
  };

  writeJson(OUT_PLAN_PATH, plan);
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(audit, plan), 'utf8');

  console.log(`Gustav French lesson audio TTS batch plan: ${audit.status}`);
  console.log(`Audio slots: ${slots.length}/${EXPECTED_ROWS}`);
  console.log(`Planned batches: ${batches.length}`);
  console.log(`Estimated pending cost: $${audit.summary.estimatedPendingCostUsd}`);
  console.log(`Can execute live TTS now: ${canExecuteLiveTtsNow ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
