import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio');
const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_manifest_v1.json');
const TTS_BATCH_PLAN_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_tts_batch_plan_audit_v1.json');
const OUT_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_checksum_gate_audit_v1.json');
const OUT_MD_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_checksum_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;
const MIN_MP3_BYTES = 128;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function absMaybeRelative(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
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

function hasMp3Signature(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 3) return false;
  const startsWithId3 = buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;
  const startsWithFrameSync = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  return startsWithId3 || startsWithFrameSync;
}

function inspectSlot(slot) {
  const localPath = absMaybeRelative(slot.localOutputPath);
  const exists = fs.existsSync(localPath);
  const sizeBytes = exists ? fs.statSync(localPath).size : 0;
  const actualSha256 = exists ? sha256(localPath) : '';
  const mp3SignatureValid = exists ? hasMp3Signature(localPath) : false;
  const expectedShaMatches = Boolean(slot.expectedSha256) && actualSha256 === slot.expectedSha256;
  const sizeValid = sizeBytes >= MIN_MP3_BYTES;
  return {
    audioSlotId: slot.audioSlotId,
    lessonId: slot.lessonId,
    phraseId: slot.phraseId,
    localOutputPath: slot.localOutputPath,
    storageObjectPath: slot.storageObjectPath,
    exists,
    sizeBytes,
    actualSha256,
    expectedSha256: slot.expectedSha256 || '',
    expectedShaMatches,
    mp3SignatureValid,
    sizeValid,
    checksumReady: exists && sizeValid && mp3SignatureValid && expectedShaMatches,
  };
}

function buildMarkdown(audit) {
  const lines = [
    '# Gustav French Lesson Audio Checksum Gate',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Audio slots: ${audit.summary.audioSlots}`,
    `- Existing files: ${audit.summary.existingAudioFiles}`,
    `- Missing files: ${audit.summary.missingAudioFiles}`,
    `- Valid mp3 signatures: ${audit.summary.validMp3Signatures}`,
    `- Sha256 matches: ${audit.summary.sha256Matches}`,
    `- Checksum-ready slots: ${audit.summary.checksumReadySlots}`,
    `- Ready for server upload: ${audit.summary.readyForServerUpload ? 'yes' : 'no'}`,
    `- Ready for runtime delivery: ${audit.summary.readyForRuntimeDelivery ? 'yes' : 'no'}`,
    `- Ready for apply: ${audit.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Blockers',
    '',
  ];
  if (audit.productionBlockers.length === 0) lines.push('- None.');
  else for (const blocker of audit.productionBlockers) lines.push(`- \`${blocker}\``);
  lines.push('', '## Safety', '');
  lines.push('- This gate reads local audio files only.');
  lines.push('- This gate does not generate audio.');
  lines.push('- This gate does not upload packs, enable runtime downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const manifest = readJson(AUDIO_MANIFEST_PATH);
  const ttsBatchPlanAudit = readJsonIfPresent(TTS_BATCH_PLAN_AUDIT_PATH);
  const slots = Array.isArray(manifest.slots) ? manifest.slots : [];
  const inspections = slots.map(inspectSlot);
  const existingAudioFiles = inspections.filter((slot) => slot.exists).length;
  const missingAudioFiles = inspections.length - existingAudioFiles;
  const validMp3Signatures = inspections.filter((slot) => slot.mp3SignatureValid).length;
  const sha256Matches = inspections.filter((slot) => slot.expectedShaMatches).length;
  const checksumReadySlots = inspections.filter((slot) => slot.checksumReady).length;
  const ttsExecutionReady = ttsBatchPlanAudit?.summary?.canExecuteLiveTtsNow === true;
  const allChecksumsReady = slots.length === EXPECTED_ROWS && checksumReadySlots === EXPECTED_ROWS;

  const productionBlockers = [];
  if (slots.length !== EXPECTED_ROWS) productionBlockers.push('AUDIO_SLOT_COUNT_NOT_1600');
  if (!ttsExecutionReady) productionBlockers.push('TTS_EXECUTION_NOT_READY_OR_NOT_COMPLETE');
  if (missingAudioFiles > 0) productionBlockers.push('AUDIO_FILES_MISSING');
  if (validMp3Signatures !== EXPECTED_ROWS) productionBlockers.push('MP3_SIGNATURES_INCOMPLETE');
  if (sha256Matches !== EXPECTED_ROWS) productionBlockers.push('SHA256_MATCHES_INCOMPLETE');
  if (!allChecksumsReady) productionBlockers.push('CHECKSUM_READY_SLOTS_INCOMPLETE');

  const audit = {
    schemaVersion: 'gustav-fr-lesson-audio-checksum-gate-audit-v1',
    generatedAt,
    status: productionBlockers.length === 0 ? 'PASS_AUDIO_CHECKSUMS_READY' : 'HOLD',
    activationApproved: false,
    inputs: {
      audioManifest: rel(AUDIO_MANIFEST_PATH),
      audioTtsBatchPlanAudit: rel(TTS_BATCH_PLAN_AUDIT_PATH),
    },
    hashes: {
      audioManifestSha256: sha256(AUDIO_MANIFEST_PATH),
      audioTtsBatchPlanAuditSha256: sha256(TTS_BATCH_PLAN_AUDIT_PATH),
    },
    summary: {
      audioSlots: slots.length,
      existingAudioFiles,
      missingAudioFiles,
      validMp3Signatures,
      sha256Matches,
      checksumReadySlots,
      ttsExecutionReady,
      allChecksumsReady,
      readyForServerUpload: productionBlockers.length === 0,
      readyForRuntimeDelivery: false,
      readyForApply: false,
      productionBlockers,
    },
    sampleInspections: [
      inspections[0],
      inspections[Math.floor(inspections.length / 2)],
      inspections[inspections.length - 1],
    ].filter(Boolean),
    productionBlockers,
    safety: {
      readOnly: true,
      audioFilesGeneratedByThisScript: false,
      audioManifestModifiedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    nextRequiredGates: productionBlockers.length === 0
      ? [
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'complete_llm_review_decisions',
          'audio_tts_execution_gate',
          'audio_checksum_gate',
        ],
  };

  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(audit), 'utf8');

  console.log(`Gustav French lesson audio checksum gate: ${audit.status}`);
  console.log(`Existing audio files: ${existingAudioFiles}/${EXPECTED_ROWS}`);
  console.log(`Checksum-ready slots: ${checksumReadySlots}/${EXPECTED_ROWS}`);
  console.log(`Ready for server upload: ${audit.summary.readyForServerUpload ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
