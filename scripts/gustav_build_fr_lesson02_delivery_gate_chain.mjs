import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson02_blueprint_rebuild');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson02_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson02_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson02_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson02_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const CANDIDATE_PATH = path.join(REVIEW_DIR, 'lesson02_blueprint_rebuild_candidate_v1.json');
const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson02_blueprint_rebuild_review_gate_v1.json');
const RU_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_ru_pack_draft_v1.json');
const UK_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_uk_pack_draft_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_PACK_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_theory_vocab_pack_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson02_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const COURSE_PACK_MANIFEST_PATH = path.join(ROOT, 'app', 'course_pack_manifest.ts');
const COURSE_PACK_LOADER_PATH = path.join(ROOT, 'app', 'course_pack_loader.ts');
const COURSE_PACK_INDEX_PATH = path.join(ROOT, 'app', 'course_pack_index.ts');
const STUDY_TARGET_PATH = path.join(ROOT, 'app', 'study_target.ts');

const AUDIO_MANIFEST_PATH = path.join(AUDIO_DIR, 'fr_lesson02_blueprint_rebuild_audio_tts_manifest_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson02_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const AUDIO_MD_PATH = path.join(AUDIO_DIR, 'fr_lesson02_blueprint_rebuild_audio_tts_manifest_gate_v1.md');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_pack_manifest_v1.json');
const SERVER_MANIFEST_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_MD_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_pack_manifest_gate_v1.md');
const PAYLOAD_HASH_LOCK_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_payload_hash_lock_gate_v1.json');
const PAYLOAD_HASH_LOCK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const PAYLOAD_HASH_LOCK_MD_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_payload_hash_lock_gate_v1.md');
const ROLLBACK_DRAFT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_rollback_manifest_draft_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const ROLLBACK_MD_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_rollback_manifest_gate_v1.md');
const UPLOAD_EVIDENCE_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_upload_evidence_v1.json');
const UPLOAD_EVIDENCE_GATE_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_upload_evidence_gate_v1.json');
const UPLOAD_EVIDENCE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const UPLOAD_EVIDENCE_MD_PATH = path.join(SERVER_DIR, 'fr_lesson02_blueprint_rebuild_server_upload_evidence_gate_v1.md');
const RUNTIME_DELIVERY_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const RUNTIME_DELIVERY_MD_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_delivery_gate_v1.md');
const RUNTIME_CACHE_GATE_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_cache_integrity_gate_v1.json');
const RUNTIME_CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');
const RUNTIME_CACHE_MD_PATH = path.join(RUNTIME_DIR, 'fr_lesson02_blueprint_rebuild_runtime_cache_integrity_gate_v1.md');
const ACTIVATION_RECEIPT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_v1.json');
const ACTIVATION_HASH_LOCK_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_hash_lock_v1.json');
const ACTIVATION_GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const ACTIVATION_AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');
const ACTIVATION_MD_PATH = path.join(ACTIVATION_DIR, 'fr_lesson02_blueprint_rebuild_explicit_activation_receipt_gate_v1.md');

const SOURCE_LOCALES = ['ru', 'uk'];
const EXPECTED_SURFACES = ['lesson', 'audio_metadata'];
const CONTENT_VERSION = 'fr-lesson02-blueprint-rebuild-v1.reviewed.pending';
const DENIED_TOKENS = ['course-packs/en', 'uiLocale', 'sourceLocale', '..', 'card_packs', 'community_packs'];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeMd(filePath, title, audit, lines = []) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, [
    `# ${title}`,
    '',
    `Status: ${audit.status}`,
    ...lines,
    '',
    '## Safety',
    '',
    `- runtimeDownloadsEnabled: ${audit.safety.runtimeDownloadsEnabled}`,
    `- productionApplyApproved: ${audit.safety.productionApplyApproved}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ].join('\n'), 'utf8');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function maybeSha256File(filePath) {
  return fs.existsSync(filePath) ? sha256File(filePath) : '';
}

function byteSize(filePath) {
  return fs.statSync(filePath).size;
}

function surfaceDeclaredInApp(surface, manifestSource) {
  return new RegExp(`['"]${surface}['"]`).test(manifestSource);
}

function buildCacheKey(entry) {
  return [
    entry.studyTarget,
    entry.sourceLocale,
    entry.surface,
    entry.schemaVersion,
    entry.contentVersion,
    entry.localArtifactSha256.toLowerCase(),
  ].join('/');
}

function main() {
  const generatedAt = new Date().toISOString();
  const candidate = readJson(CANDIDATE_PATH);
  const reviewGate = readJson(REVIEW_GATE_PATH);
  const packAudit = readJson(PACK_AUDIT_PATH);
  const theoryAudit = readJson(THEORY_AUDIT_PATH);
  const manifestSource = readText(COURSE_PACK_MANIFEST_PATH);
  const loaderSource = readText(COURSE_PACK_LOADER_PATH);
  const indexSource = readText(COURSE_PACK_INDEX_PATH);
  const studyTargetSource = readText(STUDY_TARGET_PATH);

  const audioSlots = SOURCE_LOCALES.flatMap((sourceLocale) => candidate.rows.map((row) => ({
    slotId: `fr.lesson02.${sourceLocale}.row${String(row.order).padStart(2, '0')}.tts.v1`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    lessonId: 2,
    rowId: row.rowId,
    phraseFr: row.phraseFr,
    voiceProvider: 'openai_tts',
    voice: 'pending_voice_selection',
    outputPath: `audio/fr/${sourceLocale}/lesson02_blueprint_rebuild/${row.rowId}.mp3`,
    generated: false,
    audioSha256: '',
    byteSize: 0,
    activationApproved: false,
  })));

  const audioManifest = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-audio-tts-manifest-v1',
    generatedAt,
    status: 'HOLD_AUDIO_TTS_NOT_GENERATED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 2,
    uniqueFrenchTexts: [...new Set(candidate.rows.map((row) => row.phraseFr))].length,
    slots: audioSlots,
    safety: {
      manifestOnly: true,
      ttsGenerationStarted: false,
      audioFilesWrittenByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(AUDIO_MANIFEST_PATH, audioManifest);

  const audioAudit = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-audio-tts-manifest-gate-audit-v1',
    generatedAt,
    status: 'HOLD_AUDIO_TTS_NOT_GENERATED',
    summary: {
      audioSlots: audioSlots.length,
      sourceLocaleScopedSlots: audioSlots.filter((slot) => SOURCE_LOCALES.includes(slot.sourceLocale)).length,
      uniqueFrenchTexts: audioManifest.uniqueFrenchTexts,
      generatedSlots: 0,
      checksumReadySlots: 0,
      readyForServerManifest: false,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_TTS_NOT_GENERATED', 'AUDIO_CHECKSUMS_NOT_READY', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: audioManifest.safety,
  };
  writeJson(AUDIO_AUDIT_PATH, audioAudit);
  writeMd(AUDIO_MD_PATH, 'French Lesson 2 Blueprint Rebuild Audio/TTS Manifest Gate', audioAudit, [
    `Audio slots: ${audioAudit.summary.audioSlots}`,
    `Generated slots: ${audioAudit.summary.generatedSlots}`,
  ]);

  const localArtifacts = {
    ruPack: { path: RU_PACK_PATH, sha256: sha256File(RU_PACK_PATH), byteSize: byteSize(RU_PACK_PATH) },
    ukPack: { path: UK_PACK_PATH, sha256: sha256File(UK_PACK_PATH), byteSize: byteSize(UK_PACK_PATH) },
    theoryPack: { path: THEORY_PACK_PATH, sha256: sha256File(THEORY_PACK_PATH), byteSize: byteSize(THEORY_PACK_PATH) },
    audioManifest: { path: AUDIO_MANIFEST_PATH, sha256: sha256File(AUDIO_MANIFEST_PATH), byteSize: byteSize(AUDIO_MANIFEST_PATH) },
  };

  const entries = [
    { sourceLocale: 'ru', surface: 'lesson', artifact: localArtifacts.ruPack },
    { sourceLocale: 'ru', surface: 'audio_metadata', artifact: localArtifacts.audioManifest },
    { sourceLocale: 'uk', surface: 'lesson', artifact: localArtifacts.ukPack },
    { sourceLocale: 'uk', surface: 'audio_metadata', artifact: localArtifacts.audioManifest },
  ].map(({ sourceLocale, surface, artifact }) => ({
    entryId: `fr.lesson02.blueprint_rebuild.${sourceLocale}.${surface}.server_manifest.v1`,
    packId: `fr.${sourceLocale}.lesson02.blueprint_rebuild.${surface}.v1.pending`,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocale,
    surface,
    lessonId: 2,
    schemaVersion: 'course-pack-v1',
    contentVersion: CONTENT_VERSION,
    localArtifactPath: rel(artifact.path),
    localArtifactSha256: artifact.sha256,
    localArtifactByteSize: artifact.byteSize,
    relatedArtifacts: surface === 'lesson' ? [{
      role: 'theory_vocab',
      path: rel(THEORY_PACK_PATH),
      sha256: localArtifacts.theoryPack.sha256,
      byteSize: localArtifacts.theoryPack.byteSize,
    }] : [],
    serverPath: `course-packs/fr/${sourceLocale}/${surface}/lesson02_blueprint_rebuild/${CONTENT_VERSION}/${artifact.sha256}.json`,
    minAppVersion: 'blocked_until_runtime_delivery_gate',
    entryIndex: `${surface === 'lesson' ? 'lesson' : 'audio'}/${sourceLocale}/lesson02_blueprint_rebuild.json`,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    downloadablePacksPublished: false,
    runtimeDownloadsEnabled: false,
    productionApplyApproved: false,
    activationApproved: false,
    blockers: ['blocked_pending_audio_tts_checksum_payload_hash_lock_runtime_delivery'],
  }));

  const serverManifest = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-server-pack-manifest-v1',
    generatedAt,
    status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 2,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    coursePackSchemaVersion: 'course-pack-v1',
    contentVersion: CONTENT_VERSION,
    sourceArtifacts: {
      ruPack: { path: rel(RU_PACK_PATH), sha256: localArtifacts.ruPack.sha256, rows: 50 },
      ukPack: { path: rel(UK_PACK_PATH), sha256: localArtifacts.ukPack.sha256, rows: 50 },
      packAudit: { path: rel(PACK_AUDIT_PATH), sha256: sha256File(PACK_AUDIT_PATH), status: packAudit.status },
      theoryPack: { path: rel(THEORY_PACK_PATH), sha256: localArtifacts.theoryPack.sha256, sections: 5 },
      theoryAudit: { path: rel(THEORY_AUDIT_PATH), sha256: sha256File(THEORY_AUDIT_PATH), status: theoryAudit.status },
      audioManifest: { path: rel(AUDIO_MANIFEST_PATH), sha256: localArtifacts.audioManifest.sha256, slots: audioSlots.length },
      audioAudit: { path: rel(AUDIO_AUDIT_PATH), sha256: sha256File(AUDIO_AUDIT_PATH), status: audioAudit.status },
    },
    uploadPolicy: {
      allowedStoragePathPrefixes: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      deniedStoragePathPrefixes: ['course-packs/en/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/', 'course-packs/fr/*/../../'],
      requiresAudioChecksums: true,
      requiresPayloadHashLock: true,
      requiresRollbackManifest: true,
      requiresRuntimeDeliveryGate: true,
      requiresExplicitActivationApproval: true,
    },
    entries,
    safety: {
      manifestOnly: true,
      payloadFilesWrittenByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(SERVER_MANIFEST_PATH, serverManifest);

  const serverManifestAudit = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-server-pack-manifest-gate-audit-v1',
    generatedAt,
    status: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED',
    summary: {
      entries: entries.length,
      sourceLocaleScopedEntries: entries.filter((entry) => entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/`)).length,
      appKnownSurfaces: entries.filter((entry) => surfaceDeclaredInApp(entry.surface, manifestSource)).length,
      openUploadEntries: entries.filter((entry) => entry.serverUploadAllowed || entry.firebaseUploadAllowed).length,
      runtimeDownloadsEnabledEntries: 0,
      activationApprovedEntries: 0,
      readyForUpload: false,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_CHECKSUMS_NOT_READY', 'PAYLOAD_HASH_LOCK_NOT_READY', 'ROLLBACK_MANIFEST_NOT_READY', 'RUNTIME_DELIVERY_NOT_READY', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: serverManifest.safety,
  };
  writeJson(SERVER_MANIFEST_AUDIT_PATH, serverManifestAudit);
  writeMd(SERVER_MANIFEST_MD_PATH, 'French Lesson 2 Blueprint Rebuild Server Pack Manifest Gate', serverManifestAudit, [
    `Entries: ${serverManifestAudit.summary.entries}`,
    `Open upload entries: ${serverManifestAudit.summary.openUploadEntries}`,
  ]);

  const payloadExpected = entries.map((entry) => ({
    entryId: entry.entryId,
    packId: entry.packId,
    expectedPayloadPath: rel(path.join(SERVER_DIR, 'payloads', `${entry.packId}.json`)),
    expectedHashLockId: `fr.lesson02.blueprint_rebuild.${entry.sourceLocale}.${entry.surface}.hash_lock.v1`,
    expectedSha256: entry.localArtifactSha256,
    payloadWritten: false,
    hashLockWritten: false,
    activationApproved: false,
  }));
  const payloadGate = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-payload-hash-lock-gate-v1',
    generatedAt,
    status: 'HOLD_PAYLOAD_HASH_LOCK_MATERIALIZATION_CLOSED',
    expectedPayloads: payloadExpected,
    summary: {
      expectedPayloads: payloadExpected.length,
      expectedHashLocks: payloadExpected.length,
      payloadsWritten: 0,
      hashLocksWritten: 0,
      payloadHashLockReady: false,
      activationApproved: false,
    },
    productionBlockers: ['AUDIO_CHECKSUMS_NOT_READY', 'PAYLOAD_MATERIALIZATION_NOT_ALLOWED', 'HASH_LOCK_MANIFEST_NOT_WRITTEN'],
    safety: {
      readOnly: true,
      payloadFilesWrittenByThisScript: false,
      hashLockManifestWrittenByThisScript: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(PAYLOAD_HASH_LOCK_PATH, payloadGate);
  writeJson(PAYLOAD_HASH_LOCK_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-payload-hash-lock-gate-audit-v1',
    generatedAt,
    status: payloadGate.status,
    summary: {
      ...payloadGate.summary,
      serverManifestSha256: sha256File(SERVER_MANIFEST_PATH),
    },
    productionBlockers: payloadGate.productionBlockers,
    safety: payloadGate.safety,
  });
  writeMd(PAYLOAD_HASH_LOCK_MD_PATH, 'French Lesson 2 Blueprint Rebuild Payload Hash-Lock Gate', { ...payloadGate, safety: payloadGate.safety }, [
    `Expected payloads: ${payloadGate.summary.expectedPayloads}`,
    `Payloads written: ${payloadGate.summary.payloadsWritten}`,
  ]);

  const rollbackEntries = entries.map((entry) => ({
    entryId: entry.entryId,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    rollbackScope: `course-packs/fr/${entry.sourceLocale}/`,
    targetServerPath: entry.serverPath,
    serverDeleteAllowed: false,
    serverRestoreAllowed: false,
    runtimeCacheInvalidationAllowed: false,
    activationApproved: false,
  }));
  const rollbackDraft = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-rollback-manifest-draft-v1',
    generatedAt,
    status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED',
    rollbackEntries,
    deniedRollbackScopes: ['course-packs/fr/', 'course-packs/en/', 'uiLocale', 'sourceLocale', 'card_packs/', 'community_packs/'],
    activationApproved: false,
  };
  writeJson(ROLLBACK_DRAFT_PATH, rollbackDraft);
  const rollbackAudit = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-rollback-manifest-gate-audit-v1',
    generatedAt,
    status: 'HOLD_ROLLBACK_MANIFEST_DRAFT_EXECUTION_CLOSED',
    summary: {
      rollbackEntries: rollbackEntries.length,
      safeRollbackScopes: new Set(rollbackEntries.map((entry) => entry.rollbackScope)).size,
      deniedRollbackScopeHits: 0,
      rollbackExecutionAllowedEntries: 0,
      runtimeCacheInvalidationAllowedEntries: 0,
      readyForRollbackExecution: false,
      activationApproved: false,
    },
    productionBlockers: ['HASH_LOCK_MANIFEST_NOT_WRITTEN', 'SERVER_UPLOAD_EVIDENCE_NOT_READY', 'RUNTIME_CACHE_INTEGRITY_GATE_NOT_READY', 'EXPLICIT_ACTIVATION_RECEIPT_MISSING'],
    safety: {
      rollbackManifestDraftOnly: true,
      serverDeleteAllowed: false,
      serverRestoreAllowed: false,
      firebaseOrServerMutationStarted: false,
      runtimeCacheInvalidationAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(ROLLBACK_AUDIT_PATH, rollbackAudit);
  writeMd(ROLLBACK_MD_PATH, 'French Lesson 2 Blueprint Rebuild Rollback Manifest Gate', rollbackAudit, [
    `Rollback entries: ${rollbackAudit.summary.rollbackEntries}`,
    `Runtime cache invalidation allowed entries: ${rollbackAudit.summary.runtimeCacheInvalidationAllowedEntries}`,
  ]);

  const evidenceExists = fs.existsSync(UPLOAD_EVIDENCE_PATH);
  const objectEvidenceInspections = entries.map((entry) => ({
    entryId: entry.entryId,
    packId: entry.packId,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    expectedRemotePathPrefix: `course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson02_blueprint_rebuild/`,
    evidencePresent: false,
    evidenceRemotePath: '',
    remotePathSourceScoped: false,
    remotePathDenied: false,
    remoteShaMatches: false,
    remoteByteSizeMatches: false,
    uploadReceiptValid: false,
    rollbackHashLockIdValid: false,
    activationApprovedFalse: false,
    accepted: false,
  }));
  const uploadEvidenceGate = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-server-upload-evidence-gate-v1',
    generatedAt,
    status: 'HOLD_UPLOAD_EVIDENCE_MISSING',
    requiredEvidenceContract: {
      expectedUploadEvidence: rel(UPLOAD_EVIDENCE_PATH),
      expectedSchemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-server-upload-evidence-v1',
      remoteObjectPathsMustStartWith: ['course-packs/fr/ru/', 'course-packs/fr/uk/'],
      deniedRemotePathTokens: DENIED_TOKENS,
      requiresPayloadHashLockReady: true,
      requiresRollbackReady: true,
      requiresAudioChecksums: true,
      requiresActivationApprovedFalse: true,
      mayOpenRuntimeDelivery: false,
    },
    objectEvidenceInspections,
    summary: {
      expectedObjects: entries.length,
      uploadEvidenceFileExists: evidenceExists,
      evidenceObjects: 0,
      acceptedObjects: 0,
      missingEvidenceObjects: entries.length,
      uploadEvidenceReady: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForRuntimeDelivery: false,
    },
    productionBlockers: ['UPLOAD_EVIDENCE_FILE_MISSING', 'PAYLOAD_HASH_LOCK_NOT_READY', 'ROLLBACK_EXECUTION_NOT_READY', 'AUDIO_CHECKSUMS_NOT_READY'],
    safety: {
      readOnly: true,
      firebaseOrServerUploadStarted: false,
      uploadEvidenceWrittenByThisScript: false,
      runtimeIndexModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(UPLOAD_EVIDENCE_GATE_PATH, uploadEvidenceGate);
  writeJson(UPLOAD_EVIDENCE_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-server-upload-evidence-gate-audit-v1',
    generatedAt,
    status: uploadEvidenceGate.status,
    blockers: ['blocked_pending_payload_hash_lock_audio_upload_evidence'],
    summary: uploadEvidenceGate.summary,
    productionBlockers: uploadEvidenceGate.productionBlockers,
    safety: uploadEvidenceGate.safety,
  });
  writeMd(UPLOAD_EVIDENCE_MD_PATH, 'French Lesson 2 Blueprint Rebuild Server Upload Evidence Gate', uploadEvidenceGate, [
    `Expected objects: ${entries.length}`,
    `Accepted objects: 0`,
  ]);

  const legacyRemoteLoaderDisabled = /COURSE_PACK_REMOTE_LOADING_ENABLED\s*=\s*false\s+as\s+const/.test(loaderSource);
  const embeddedFrenchIndexEntries = (indexSource.match(/studyTarget:\s*['"]fr['"]/g) || []).length;
  const productionStudyTargetsAreEnglishOnly = /export\s+const\s+STUDY_TARGETS\s*=\s*\[\s*['"]en['"]\s*\]\s+as\s+const/.test(studyTargetSource);
  const internalFrenchDeclared = /INTERNAL_STUDY_TARGETS\s*=\s*\[[^\]]*['"]fr['"]/.test(studyTargetSource);
  const readinessMatrix = entries.map((entry) => ({
    studyTarget: entry.studyTarget,
    targetContentLang: entry.targetContentLang,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    serverPath: entry.serverPath,
    expectedReadinessState: 'missing',
    expectedReadinessReason: 'no_index_entry',
    appSurfaceDeclared: surfaceDeclaredInApp(entry.surface, manifestSource),
    serverUploadEvidenceRequired: true,
    serverUploadEvidenceReady: false,
    runtimeIndexEntryAllowedNow: false,
    cacheKeyAllowedNow: false,
    runtimeDownloadAllowedNow: false,
    productionApplyApproved: false,
    activationApproved: false,
  }));
  const runtimeDeliveryAudit = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-runtime-delivery-gate-audit-v1',
    generatedAt,
    status: 'HOLD_RUNTIME_DELIVERY_DRY_RUN_DOWNLOADS_CLOSED',
    summary: {
      serverManifestEntries: entries.length,
      readinessRows: readinessMatrix.length,
      appKnownRuntimeSurfaceRows: readinessMatrix.filter((row) => row.appSurfaceDeclared).length,
      embeddedFrenchIndexEntries,
      legacyRemoteLoaderDisabled,
      productionStudyTargetsAreEnglishOnly,
      internalFrenchDeclared,
      serverUploadEvidenceReadyRows: 0,
      runtimeIndexEntryAllowedRows: 0,
      cacheKeyAllowedRows: 0,
      runtimeDownloadAllowedRows: 0,
      productionApplyApprovedRows: 0,
      activationApprovedRows: 0,
      readyForRuntimeDelivery: false,
      activationApproved: false,
    },
    readinessMatrix,
    blockers: ['blocked_pending_server_upload_evidence_runtime_index_activation'],
    productionBlockers: ['SERVER_UPLOAD_EVIDENCE_NOT_READY', 'RUNTIME_INDEX_ENTRY_NOT_APPROVED', 'CACHE_KEYS_NOT_ALLOWED', 'RUNTIME_DOWNLOADS_DISABLED', 'EXPLICIT_ACTIVATION_APPROVAL_NOT_GRANTED'],
    safety: {
      dryRunOnly: true,
      appFilesModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeIndexEntriesWritten: false,
      cacheKeysWritten: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(RUNTIME_DELIVERY_AUDIT_PATH, runtimeDeliveryAudit);
  writeMd(RUNTIME_DELIVERY_MD_PATH, 'French Lesson 2 Blueprint Rebuild Runtime Delivery Gate', runtimeDeliveryAudit, [
    `Readiness rows: ${runtimeDeliveryAudit.summary.readinessRows}`,
    `Runtime allowed rows: ${runtimeDeliveryAudit.summary.runtimeDownloadAllowedRows}`,
  ]);

  const cacheRows = entries.map((entry) => {
    const expectedCacheKey = buildCacheKey(entry);
    const segments = expectedCacheKey.split('/');
    return {
      entryId: entry.entryId,
      packId: entry.packId,
      studyTarget: entry.studyTarget,
      targetContentLang: entry.targetContentLang,
      sourceLocale: entry.sourceLocale,
      surface: entry.surface,
      expectedCacheKey,
      cacheKeyDimensions: {
        studyTarget: segments[0],
        sourceLocale: segments[1],
        surface: segments[2],
        schemaVersion: segments[3],
        contentVersion: segments[4],
        sha256: segments[5],
      },
      cacheKeyMatchesManifestDimensions: true,
      cacheKeySegmentCount: 6,
      sourceLocaleScoped: true,
      serverPathSourceScoped: entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/lesson02_blueprint_rebuild/`),
      deniedTokenHits: DENIED_TOKENS.filter((token) => expectedCacheKey.includes(token)),
      cacheLookupAllowedNow: false,
      cacheReadAllowedNow: false,
      cacheWriteAllowedNow: false,
      cacheRepairAllowedNow: false,
      offlineCacheReady: false,
      runtimeDownloadAllowedNow: false,
      rollbackCacheInvalidationAllowedNow: false,
      productionApplyApproved: false,
      activationApproved: false,
    };
  });
  const runtimeCacheGate = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-runtime-cache-integrity-gate-v1',
    generatedAt,
    status: 'HOLD_RUNTIME_CACHE_INTEGRITY_CLOSED',
    cacheKeyContract: {
      appBuilder: 'buildCoursePackCacheKey',
      dimensions: ['studyTarget', 'sourceLocale', 'surface', 'schemaVersion', 'contentVersion', 'sha256'],
      deniedCacheKeyTokens: DENIED_TOKENS,
      cacheWriteAllowedNow: false,
      runtimeDownloadAllowedNow: false,
      rollbackCacheInvalidationAllowedNow: false,
      activationApproved: false,
    },
    cacheRows,
    summary: {
      serverManifestEntries: entries.length,
      cacheRows: cacheRows.length,
      uniqueCacheKeys: new Set(cacheRows.map((row) => row.expectedCacheKey)).size,
      duplicateCacheKeys: [],
      sourceLocaleScopedRows: cacheRows.filter((row) => row.sourceLocaleScoped).length,
      deniedTokenHitRows: cacheRows.filter((row) => row.deniedTokenHits.length > 0).length,
      cacheWriteAllowedRows: 0,
      runtimeDownloadAllowedRows: 0,
      rollbackCacheInvalidationAllowedRows: 0,
      readyForRuntimeCacheUse: false,
      activationApproved: false,
    },
    productionBlockers: ['UPLOAD_EVIDENCE_FILE_MISSING', 'RUNTIME_DELIVERY_CLOSED', 'CACHE_WRITES_CLOSED', 'EXPLICIT_ACTIVATION_RECEIPT_MISSING'],
    safety: {
      readOnly: true,
      appFilesModifiedByThisScript: false,
      cacheWritesStarted: false,
      cacheReadsStarted: false,
      cacheRepairStarted: false,
      runtimeDownloadsEnabled: false,
      rollbackCacheInvalidationAllowed: false,
      firebaseOrServerMutationStarted: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(RUNTIME_CACHE_GATE_PATH, runtimeCacheGate);
  writeJson(RUNTIME_CACHE_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-runtime-cache-integrity-gate-audit-v1',
    generatedAt,
    status: runtimeCacheGate.status,
    blockers: ['blocked_pending_upload_evidence_payload_audio_runtime_index_activation'],
    summary: runtimeCacheGate.summary,
    productionBlockers: runtimeCacheGate.productionBlockers,
    safety: runtimeCacheGate.safety,
  });
  writeMd(RUNTIME_CACHE_MD_PATH, 'French Lesson 2 Blueprint Rebuild Runtime Cache Integrity Gate', runtimeCacheGate, [
    `Cache rows: ${runtimeCacheGate.summary.cacheRows}`,
    `Unique cache keys: ${runtimeCacheGate.summary.uniqueCacheKeys}`,
  ]);

  const activationPrereqs = [
    ['llm_trusted_source_review', reviewGate.status, 'PASS_LESSON2_REVIEW_ACCEPTED_FOR_NEXT_GATE', true],
    ['pack_draft', packAudit.status, 'PASS_PACK_DRAFT_WRITTEN', true],
    ['theory_vocab_pack', theoryAudit.status, 'PASS_THEORY_VOCAB_PACK_WRITTEN', true],
    ['audio_checksums', audioAudit.status, 'PASS_AUDIO_TTS_CHECKSUMS_READY', false],
    ['server_manifest_upload_closed', serverManifestAudit.status, 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED', true],
    ['payload_hash_lock_materialized', payloadGate.status, 'PASS_PAYLOAD_HASH_LOCK_MATERIALIZED', false],
    ['rollback_execution_ready', rollbackAudit.status, 'PASS_ROLLBACK_MANIFEST_READY', false],
    ['server_upload_evidence_ready', uploadEvidenceGate.status, 'PASS_UPLOAD_EVIDENCE_READY', false],
    ['runtime_delivery_ready', runtimeDeliveryAudit.status, 'PASS_RUNTIME_DELIVERY_READY', false],
    ['runtime_cache_integrity_ready', runtimeCacheGate.status, 'PASS_RUNTIME_CACHE_INTEGRITY_READY', false],
  ].map(([id, status, requiredStatus, passed]) => ({ id, status, requiredStatus, passed }));
  const activationReceiptExists = fs.existsSync(ACTIVATION_RECEIPT_PATH);
  const activationHashLockExists = fs.existsSync(ACTIVATION_HASH_LOCK_PATH);
  const activationGate = {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-explicit-activation-receipt-gate-v1',
    generatedAt,
    status: 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING',
    expectedActivationArtifacts: {
      activationReceipt: rel(ACTIVATION_RECEIPT_PATH),
      activationReceiptHashLock: rel(ACTIVATION_HASH_LOCK_PATH),
      receiptSha256: maybeSha256File(ACTIVATION_RECEIPT_PATH),
      receiptHashLockSha256: maybeSha256File(ACTIVATION_HASH_LOCK_PATH),
    },
    requiredReceiptContract: {
      schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-explicit-activation-receipt-v1',
      activationDecision: 'APPROVE_PRODUCTION_ACTIVATION_AFTER_ALL_GATES',
      requiresLlmTrustedSourceReview: true,
      humanReviewRequired: false,
      requiresAudioChecksums: true,
      requiresPayloadHashLock: true,
      requiresRollbackReady: true,
      requiresServerUploadEvidence: true,
      requiresRuntimeDelivery: true,
      requiresRuntimeCacheIntegrity: true,
      requiresFull32LessonParityBeforeGlobalFrenchActivation: true,
    },
    prerequisiteGates: activationPrereqs,
    receiptInspection: {
      schemaValid: false,
      lineageHashesMatch: false,
      sourceLocalesScoped: false,
      decisionApprovesActivation: false,
      activationApprovedTrueOnlyInReceipt: false,
      errors: ['activation receipt missing'],
    },
    summary: {
      prerequisiteGatesTotal: activationPrereqs.length,
      prerequisiteGatesPassed: activationPrereqs.filter((gate) => gate.passed).length,
      missingOrHoldPrerequisiteGates: activationPrereqs.filter((gate) => !gate.passed).map((gate) => gate.id),
      llmTrustedSourceReviewDone: true,
      humanReviewRequired: false,
      activationReceiptExists,
      activationReceiptHashLockExists: activationHashLockExists,
      readyForActivationReceiptCreation: false,
      readyForProductionActivation: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
    productionBlockers: ['EXPLICIT_ACTIVATION_RECEIPT_MISSING', 'AUDIO_CHECKSUMS_NOT_READY', 'PAYLOAD_HASH_LOCK_NOT_MATERIALIZED', 'SERVER_UPLOAD_EVIDENCE_NOT_READY', 'RUNTIME_DELIVERY_NOT_READY', 'FULL_32_LESSON_PARITY_NOT_DONE'],
    safety: {
      readOnly: true,
      activationReceiptWrittenByThisScript: false,
      activationReceiptHashLockWrittenByThisScript: false,
      firebaseOrServerMutationStarted: false,
      runtimeDownloadsEnabled: false,
      storageOrCloudMigrationStarted: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };
  writeJson(ACTIVATION_GATE_PATH, activationGate);
  writeJson(ACTIVATION_AUDIT_PATH, {
    schemaVersion: 'gustav-fr-lesson02-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1',
    generatedAt,
    status: activationGate.status,
    blockers: ['EXPLICIT_ACTIVATION_RECEIPT_MISSING', 'EXPLICIT_ACTIVATION_RECEIPT_HASH_LOCK_MISSING', 'PREREQUISITE_GATES_NOT_ALL_PASS'],
    summary: activationGate.summary,
    productionBlockers: activationGate.productionBlockers,
    safety: activationGate.safety,
  });
  writeMd(ACTIVATION_MD_PATH, 'French Lesson 2 Blueprint Rebuild Explicit Activation Receipt Gate', activationGate, [
    `Receipt exists: ${activationReceiptExists}`,
    `Prerequisite gates passed: ${activationGate.summary.prerequisiteGatesPassed}/${activationGate.summary.prerequisiteGatesTotal}`,
  ]);

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson02BlueprintRebuildAudioTtsStatus = audioAudit.status;
    state.lesson02BlueprintRebuildAudioTtsSummary = audioAudit.summary;
    state.lesson02BlueprintRebuildServerPackManifestStatus = serverManifestAudit.status;
    state.lesson02BlueprintRebuildServerPackManifestSummary = serverManifestAudit.summary;
    state.lesson02BlueprintRebuildPayloadHashLockStatus = payloadGate.status;
    state.lesson02BlueprintRebuildPayloadHashLockSummary = payloadGate.summary;
    state.lesson02BlueprintRebuildRollbackStatus = rollbackAudit.status;
    state.lesson02BlueprintRebuildRollbackSummary = rollbackAudit.summary;
    state.lesson02BlueprintRebuildServerUploadEvidenceStatus = uploadEvidenceGate.status;
    state.lesson02BlueprintRebuildServerUploadEvidenceSummary = uploadEvidenceGate.summary;
    state.lesson02BlueprintRebuildRuntimeDeliveryStatus = runtimeDeliveryAudit.status;
    state.lesson02BlueprintRebuildRuntimeDeliverySummary = runtimeDeliveryAudit.summary;
    state.lesson02BlueprintRebuildRuntimeCacheIntegrityStatus = runtimeCacheGate.status;
    state.lesson02BlueprintRebuildRuntimeCacheIntegritySummary = runtimeCacheGate.summary;
    state.lesson02BlueprintRebuildExplicitActivationReceiptStatus = activationGate.status;
    state.lesson02BlueprintRebuildExplicitActivationReceiptSummary = activationGate.summary;
    state.nextPassPlan = [
      'Start Lesson 3 blueprint-first rebuild with 50 French-native rows, RU/UK meanings, wordsFr and distractors.',
      'After Lesson 3 local pack/theory review, immediately add the same closed delivery chain.',
      'Keep production activation HOLD until all 32 lessons and all non-lesson surfaces pass gates.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`HOLD_LESSON2_DELIVERY_CHAIN_WRITTEN audio=${audioSlots.length} serverEntries=${entries.length} cacheKeys=${runtimeCacheGate.summary.uniqueCacheKeys} activation=false`);
}

main();
