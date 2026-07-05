import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson01_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const RUNTIME_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');

const CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const MD_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_v1.md');
const EXPECTED_HASH_LOCK_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_manifest_hash_lock_v1.json');

const SOURCE_LOCALES = ['ru', 'uk'];
const RUNTIME_SURFACES = ['lesson', 'audio_metadata'];
const ALLOWED_LOCAL_OUTPUT_ROOT = '.codex-tmp/gustav/fr/lesson01_blueprint_rebuild/server-payloads';

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function maybeSha256File(filePath) {
  return fs.existsSync(filePath) ? sha256File(filePath) : '';
}

function expectedPayloadPathFor(entry) {
  return path.join(
    ROOT,
    ALLOWED_LOCAL_OUTPUT_ROOT,
    entry.sourceLocale,
    entry.surface,
    entry.contentVersion,
    `${entry.packId}.${entry.localArtifactSha256}.json`,
  );
}

function inspectExpectedPayload(entry) {
  const localPath = expectedPayloadPathFor(entry);
  const localOutputPath = rel(localPath);
  const exists = fs.existsSync(localPath);
  const actualSha256 = exists ? sha256File(localPath) : '';
  const byteSize = exists ? fs.statSync(localPath).size : 0;
  const sourceLocaleScoped = entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`);
  const localOutputAllowed =
    localOutputPath.startsWith(`${ALLOWED_LOCAL_OUTPUT_ROOT}/${entry.sourceLocale}/${entry.surface}/`) &&
    !localOutputPath.includes('..') &&
    !localOutputPath.includes('/app/') &&
    !localOutputPath.includes('/assets/') &&
    !localOutputPath.includes('/functions/');
  const manifestArtifactHashReal = /^[a-f0-9]{64}$/.test(entry.localArtifactSha256 || '') && entry.localArtifactByteSize > 0;
  const payloadShaMatchesManifestArtifact = exists && actualSha256 === entry.localArtifactSha256;
  const payloadByteSizeMatchesManifestArtifact = exists && byteSize === entry.localArtifactByteSize;

  return {
    entryId: entry.entryId,
    packId: entry.packId,
    studyTarget: entry.studyTarget,
    targetContentLang: entry.targetContentLang,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    serverPath: entry.serverPath,
    localArtifactPath: entry.localArtifactPath,
    localArtifactSha256: entry.localArtifactSha256,
    localArtifactByteSize: entry.localArtifactByteSize,
    localOutputPath,
    exists,
    byteSize,
    actualSha256,
    sourceLocaleScoped,
    localOutputAllowed,
    manifestArtifactHashReal,
    payloadShaMatchesManifestArtifact,
    payloadByteSizeMatchesManifestArtifact,
    payloadReadyForHashLock: (
      exists &&
      localOutputAllowed &&
      sourceLocaleScoped &&
      manifestArtifactHashReal &&
      payloadShaMatchesManifestArtifact &&
      payloadByteSizeMatchesManifestArtifact
    ),
  };
}

function buildHashLockExpectation(entry) {
  return {
    lockId: `fr.lesson01.blueprint_rebuild.${entry.sourceLocale}.${entry.surface}.hash_lock.v1`,
    packId: entry.packId,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    lessonId: 1,
    contentVersion: entry.contentVersion,
    requiredPayloadSha256: entry.localArtifactSha256,
    requiredPayloadByteSize: entry.localArtifactByteSize,
    requiredServerPath: entry.serverPath,
    requiredServerPathPrefix: `course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson01_blueprint_rebuild/`,
    requiredRollbackScope: `course-packs/fr/${entry.sourceLocale}/`,
    requiredFields: [
      'packId',
      'studyTarget:fr',
      'targetContentLang:fr',
      'sourceLocale',
      'surface',
      'lessonId',
      'contentVersion',
      'payloadSha256',
      'payloadByteSize',
      'serverPath',
      'serverManifestSha256BeforeUpload',
      'payloadHashLockGateAuditSha256',
      'runtimeDeliveryGateAuditSha256',
      'activationApproved:false',
    ],
  };
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Payload / Hash-Lock Gate',
    '',
    `Status: ${audit.status}`,
    `Expected payloads: ${audit.summary.expectedPayloads}`,
    `Existing payload files: ${audit.summary.existingPayloadFiles}`,
    `Hash-lock-ready payloads: ${audit.summary.payloadsReadyForHashLock}`,
    `Hash-lock manifest exists: ${audit.summary.hashLockManifestExists}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- payloadFilesWrittenByThisScript: ${audit.safety.payloadFilesWrittenByThisScript}`,
    `- hashLockManifestWrittenByThisScript: ${audit.safety.hashLockManifestWrittenByThisScript}`,
    `- serverUploadAllowed: ${audit.safety.serverUploadAllowed}`,
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const serverGate = readJson(SERVER_GATE_AUDIT_PATH);
  const audioAudit = readJson(AUDIO_AUDIT_PATH);
  const runtimeAudit = readJson(RUNTIME_AUDIT_PATH);
  const blockers = [];

  if (serverManifest.schemaVersion !== 'gustav-fr-lesson01-blueprint-rebuild-server-pack-manifest-v1') blockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  if (serverGate.status !== 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED') blockers.push('SERVER_GATE_NOT_UPLOAD_CLOSED_HOLD');
  if (audioAudit.status !== 'HOLD_AUDIO_TTS_NOT_GENERATED') blockers.push('AUDIO_TTS_GATE_NOT_HOLD');
  if (runtimeAudit.status !== 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED') blockers.push('RUNTIME_GATE_NOT_DOWNLOADS_CLOSED_HOLD');
  if ((audioAudit.summary?.checksumReadySlots ?? -1) !== 0) blockers.push('AUDIO_CHECKSUM_STATE_UNEXPECTEDLY_OPEN');

  const entries = Array.isArray(serverManifest.entries) ? serverManifest.entries : [];
  if (entries.length !== 4) blockers.push('EXPECTED_4_SERVER_ENTRIES');
  for (const locale of SOURCE_LOCALES) {
    for (const surface of RUNTIME_SURFACES) {
      if (!entries.some((entry) => entry.sourceLocale === locale && entry.surface === surface)) {
        blockers.push(`MISSING_ENTRY_${locale}_${surface}`);
      }
    }
  }

  const openEntries = entries.filter((entry) =>
    entry.serverUploadAllowed ||
    entry.firebaseUploadAllowed ||
    entry.downloadablePacksPublished ||
    entry.runtimeDownloadsEnabled ||
    entry.productionApplyApproved ||
    entry.activationApproved,
  );
  if (openEntries.length > 0) blockers.push(`SERVER_ENTRIES_OPENED_${openEntries.length}`);

  const expectedPayloads = entries.map(inspectExpectedPayload);
  const expectedHashLocks = entries.map(buildHashLockExpectation);
  const hashLockManifestExists = fs.existsSync(EXPECTED_HASH_LOCK_PATH);
  const checksumReadySlots = Number(audioAudit.summary?.checksumReadySlots || 0);
  const audioChecksumReady = checksumReadySlots === Number(audioAudit.summary?.audioSlots || 100) && checksumReadySlots > 0;
  const allPayloadsReadyForHashLock = expectedPayloads.length > 0 && expectedPayloads.every((payload) => payload.payloadReadyForHashLock);
  const materializationAllowedNow = false;
  const hashLockMaterializationAllowedNow = false;

  const productionBlockers = [
    'AUDIO_TTS_NOT_GENERATED',
    'AUDIO_SHA256_CHECKSUMS_MISSING',
    'PAYLOAD_MATERIALIZATION_CLOSED',
    'PAYLOAD_FILES_NOT_WRITTEN',
    'HASH_LOCK_MANIFEST_NOT_WRITTEN',
    'SERVER_UPLOAD_NOT_ALLOWED',
    'RUNTIME_DELIVERY_NOT_APPROVED',
    'FULL_32_LESSON_PARITY_NOT_DONE',
  ];

  const summary = {
    serverManifestEntries: entries.length,
    expectedPayloads: expectedPayloads.length,
    sourceLocaleScopedPayloads: expectedPayloads.filter((payload) => payload.sourceLocaleScoped).length,
    localOutputAllowlistedPayloads: expectedPayloads.filter((payload) => payload.localOutputAllowed).length,
    manifestArtifactHashRealEntries: expectedPayloads.filter((payload) => payload.manifestArtifactHashReal).length,
    existingPayloadFiles: expectedPayloads.filter((payload) => payload.exists).length,
    payloadShaMatchesManifestArtifact: expectedPayloads.filter((payload) => payload.payloadShaMatchesManifestArtifact).length,
    payloadByteSizeMatchesManifestArtifact: expectedPayloads.filter((payload) => payload.payloadByteSizeMatchesManifestArtifact).length,
    payloadsReadyForHashLock: expectedPayloads.filter((payload) => payload.payloadReadyForHashLock).length,
    expectedHashLocks: expectedHashLocks.length,
    hashLockManifestExists,
    hashLockManifestReady: false,
    checksumReadySlots,
    audioChecksumReady,
    materializationAllowedNow,
    hashLockMaterializationAllowedNow,
    readyForServerUpload: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    activationApproved: false,
  };

  const contract = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-payload-hash-lock-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED' : 'BLOCK_PAYLOAD_HASH_LOCK_GATE_INVALID',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    sourceArtifacts: {
      serverManifest: rel(SERVER_MANIFEST_PATH),
      serverManifestGate: rel(SERVER_GATE_AUDIT_PATH),
      audioTtsManifestGate: rel(AUDIO_AUDIT_PATH),
      runtimeDeliveryGate: rel(RUNTIME_AUDIT_PATH),
      expectedHashLockManifest: rel(EXPECTED_HASH_LOCK_PATH),
    },
    materializationRules: {
      localOutputRoot: ALLOWED_LOCAL_OUTPUT_ROOT,
      materializationAllowedNow,
      hashLockMaterializationAllowedNow,
      requiresGeneratedAudio: true,
      requiresAudioChecksums: true,
      requiresSourceLocaleScopedServerPaths: true,
      requiresAllowlistedLocalOutput: true,
      requiresRuntimeDeliveryDryRun: true,
      requiresRollbackManifest: true,
      serverManifestRewriteAllowed: false,
      appBundleWritesAllowed: false,
      firebaseUploadAllowed: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
    expectedPayloads,
    expectedHashLocks,
    summary,
    productionBlockers,
    safety: {
      dryRunOnly: true,
      payloadFilesWrittenByThisScript: false,
      hashLockManifestWrittenByThisScript: false,
      serverManifestModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(CONTRACT_PATH, contract);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-payload-hash-lock-gate-audit-v1',
    generatedAt,
    status: contract.status,
    blockers: blockers.length === 0 ? ['blocked_pending_audio_checksums_payload_materialization_hash_lock'] : blockers,
    sourceArtifacts: contract.sourceArtifacts,
    hashes: {
      serverManifestSha256: sha256File(SERVER_MANIFEST_PATH),
      serverManifestGateSha256: sha256File(SERVER_GATE_AUDIT_PATH),
      audioTtsManifestGateSha256: sha256File(AUDIO_AUDIT_PATH),
      runtimeDeliveryGateSha256: sha256File(RUNTIME_AUDIT_PATH),
      expectedHashLockManifestSha256: maybeSha256File(EXPECTED_HASH_LOCK_PATH),
      payloadHashLockContractSha256: sha256File(CONTRACT_PATH),
    },
    summary,
    productionBlockers,
    safety: contract.safety,
    nextRequiredGates: [
      'open_audio_tts_generation_with_explicit_spend_guard',
      'audio_checksum_gate',
      'payload_materialization_execution_gate',
      'hash_lock_manifest_materialization_gate',
      'rollback_manifest_draft_gate',
      'server_upload_evidence_gate',
      'runtime_delivery_apply_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildPayloadHashLockGate = rel(CONTRACT_PATH);
    state.lesson01BlueprintRebuildPayloadHashLockGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildPayloadHashLockStatus = audit.status;
    state.lesson01BlueprintRebuildPayloadHashLockSummary = audit.summary;
    state.nextPassPlan = [
      'Create Lesson 1 rollback manifest draft gate tied to expected hash-lock ids.',
      'Create Lesson 1 server upload evidence gate that remains closed until payload/hash-lock/audio pass.',
      'Then start Lesson 2 blueprint-first rebuild using Lesson 1 gates as template.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} payloads=${expectedPayloads.length} hashLocks=${expectedHashLocks.length} ready=0 activation=false blockers=${blockers.length}`);
  if (audit.status === 'BLOCK_PAYLOAD_HASH_LOCK_GATE_INVALID') process.exitCode = 1;
}

main();
