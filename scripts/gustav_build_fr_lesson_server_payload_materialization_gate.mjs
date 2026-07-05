import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server');

const IMPORT_DRY_RUN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const AUDIO_CHECKSUM_GATE_PATH = path.join(AUDIO_DIR, 'fr_lesson_audio_checksum_gate_audit_v1.json');
const SERVER_MANIFEST_PATH = path.join(SERVER_DIR, 'fr_lesson_server_pack_manifest_v1.json');
const UPLOAD_POLICY_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_upload_policy_gate_audit_v1.json');
const CONTRACT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_v1.json');
const AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson_server_payload_materialization_gate_audit_v1.json');

const EXPECTED_ROWS = 1600;
const EXPECTED_AUDIO_SLOTS = 1600;
const SOURCE_LOCALES = ['ru', 'uk'];
const ALLOWED_LOCAL_OUTPUT_ROOT = '.codex-tmp/gustav/fr/server-payloads';
const ZERO_SHA = '0'.repeat(64);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function localPayloadPathFor(entry) {
  return path.join(
    ROOT,
    ALLOWED_LOCAL_OUTPUT_ROOT,
    entry.sourceLocale,
    entry.surface,
    entry.contentVersion,
    `${entry.packId}.json`
  );
}

function inspectExpectedPayload(entry) {
  const localOutputPath = localPayloadPathFor(entry);
  const exists = fs.existsSync(localOutputPath);
  const actualSha256 = exists ? sha256(localOutputPath) : '';
  const sizeBytes = exists ? fs.statSync(localOutputPath).size : 0;
  const expectedPrefix = `course-packs/fr/${entry.sourceLocale}/${entry.surface}/`;
  const sourceLocaleScoped = SOURCE_LOCALES.includes(entry.sourceLocale) && entry.serverPath.startsWith(expectedPrefix);
  const localOutputRel = rel(localOutputPath);
  const localOutputAllowed =
    localOutputRel.startsWith(`${ALLOWED_LOCAL_OUTPUT_ROOT}/${entry.sourceLocale}/${entry.surface}/`) &&
    !localOutputRel.includes('..') &&
    !localOutputRel.includes('/app/') &&
    !localOutputRel.includes('/assets/') &&
    !localOutputRel.includes('/functions/');
  const manifestShaPlaceholder = entry.sha256 === ZERO_SHA;
  const manifestShaMatchesPayload = exists && entry.sha256 === actualSha256 && !manifestShaPlaceholder;
  const manifestByteSizeMatchesPayload = exists && entry.byteSize === sizeBytes && sizeBytes > 1;

  return {
    packId: entry.packId,
    studyTarget: entry.studyTarget,
    sourceLocale: entry.sourceLocale,
    surface: entry.surface,
    entryIndex: entry.entryIndex,
    serverPath: entry.serverPath,
    localOutputPath: localOutputRel,
    exists,
    sizeBytes,
    actualSha256,
    manifestSha256: entry.sha256,
    manifestByteSize: entry.byteSize,
    sourceLocaleScoped,
    localOutputAllowed,
    manifestShaPlaceholder,
    manifestShaMatchesPayload,
    manifestByteSizeMatchesPayload,
    payloadReadyForManifest: exists && localOutputAllowed && sourceLocaleScoped && manifestShaMatchesPayload && manifestByteSizeMatchesPayload,
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const importDryRun = readJson(IMPORT_DRY_RUN_PATH);
  const audioChecksumGate = readJson(AUDIO_CHECKSUM_GATE_PATH);
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const uploadPolicyAudit = readJson(UPLOAD_POLICY_AUDIT_PATH);

  const structuralBlockers = [];
  if (importDryRun.schemaVersion !== 'gustav-fr-lesson-review-decision-import-dry-run-audit-v1') {
    structuralBlockers.push('IMPORT_DRY_RUN_SCHEMA_MISMATCH');
  }
  if (audioChecksumGate.schemaVersion !== 'gustav-fr-lesson-audio-checksum-gate-audit-v1') {
    structuralBlockers.push('AUDIO_CHECKSUM_GATE_SCHEMA_MISMATCH');
  }
  if (serverManifest.schemaVersion !== 'gustav-fr-lesson-server-pack-manifest-v1') {
    structuralBlockers.push('SERVER_MANIFEST_SCHEMA_MISMATCH');
  }
  if (uploadPolicyAudit.schemaVersion !== 'gustav-fr-lesson-server-upload-policy-gate-audit-v1') {
    structuralBlockers.push('UPLOAD_POLICY_AUDIT_SCHEMA_MISMATCH');
  }

  const entries = Array.isArray(serverManifest.entries) ? serverManifest.entries : [];
  const expectedPayloads = entries.map(inspectExpectedPayload);
  for (const payload of expectedPayloads) {
    if (payload.studyTarget !== 'fr') structuralBlockers.push(`PAYLOAD_TARGET_INVALID:${payload.packId}`);
    if (!SOURCE_LOCALES.includes(payload.sourceLocale)) structuralBlockers.push(`PAYLOAD_SOURCE_LOCALE_INVALID:${payload.packId}`);
    if (!payload.sourceLocaleScoped) structuralBlockers.push(`PAYLOAD_SERVER_PATH_NOT_SOURCE_SCOPED:${payload.packId}`);
    if (!payload.localOutputAllowed) structuralBlockers.push(`PAYLOAD_LOCAL_OUTPUT_NOT_ALLOWLISTED:${payload.packId}`);
  }

  const allRowsAccepted = importDryRun.summary?.allRowsAccepted === true;
  const importedRows = Number(importDryRun.summary?.acceptedRows || 0);
  const checksumReadySlots = Number(audioChecksumGate.summary?.checksumReadySlots || 0);
  const audioChecksumReady = audioChecksumGate.summary?.readyForServerUpload === true && checksumReadySlots === EXPECTED_AUDIO_SLOTS;
  const uploadPolicyReady = uploadPolicyAudit.summary?.uploadExecutionAllowed === true;
  const payloadsPresent = expectedPayloads.length > 0 && expectedPayloads.every((payload) => payload.exists);
  const payloadShaReady = expectedPayloads.length > 0 && expectedPayloads.every((payload) => payload.manifestShaMatchesPayload);
  const payloadBytesReady = expectedPayloads.length > 0 && expectedPayloads.every((payload) => payload.manifestByteSizeMatchesPayload);
  const materializationAllowedNow = allRowsAccepted && audioChecksumReady && false;

  const productionBlockers = [];
  if (!allRowsAccepted || importedRows !== EXPECTED_ROWS) productionBlockers.push('REVIEW_IMPORT_NOT_ACCEPTED_FOR_ALL_1600_ROWS');
  if (!audioChecksumReady) productionBlockers.push('AUDIO_CHECKSUM_GATE_NOT_READY');
  if (!payloadsPresent) productionBlockers.push('PAYLOAD_FILES_MISSING');
  if (!payloadShaReady) productionBlockers.push('PAYLOAD_SHA_NOT_LOCKED_IN_MANIFEST');
  if (!payloadBytesReady) productionBlockers.push('PAYLOAD_BYTES_NOT_LOCKED_IN_MANIFEST');
  if (!uploadPolicyReady) productionBlockers.push('UPLOAD_POLICY_NOT_READY_FOR_EXECUTION');
  productionBlockers.push('MATERIALIZATION_CLOSED_UNTIL_REVIEW_AUDIO_AND_POLICY_PASS');

  const summary = {
    expectedPayloads: expectedPayloads.length,
    expectedSourceLocales: SOURCE_LOCALES,
    importedAcceptedRows: importedRows,
    expectedRows: EXPECTED_ROWS,
    allRowsAccepted,
    checksumReadySlots,
    expectedAudioSlots: EXPECTED_AUDIO_SLOTS,
    audioChecksumReady,
    uploadPolicyReady,
    materializationAllowedNow,
    existingPayloadFiles: expectedPayloads.filter((payload) => payload.exists).length,
    sourceLocaleScopedPayloads: expectedPayloads.filter((payload) => payload.sourceLocaleScoped).length,
    localOutputAllowlistedPayloads: expectedPayloads.filter((payload) => payload.localOutputAllowed).length,
    manifestShaPlaceholderEntries: expectedPayloads.filter((payload) => payload.manifestShaPlaceholder).length,
    manifestShaMatchesPayload: expectedPayloads.filter((payload) => payload.manifestShaMatchesPayload).length,
    manifestByteSizeMatchesPayload: expectedPayloads.filter((payload) => payload.manifestByteSizeMatchesPayload).length,
    payloadsReadyForManifest: expectedPayloads.filter((payload) => payload.payloadReadyForManifest).length,
    readyForServerUpload: false,
    readyForRuntimeDelivery: false,
    readyForApply: false,
    activationApproved: false,
    structuralBlockers: structuralBlockers.length,
    productionBlockers: productionBlockers.length,
  };

  const contract = {
    schemaVersion: 'gustav-fr-lesson-server-payload-materialization-gate-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD_MATERIALIZATION_CLOSED',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    activationApproved: false,
    sourceArtifacts: {
      reviewDecisionImportDryRun: rel(IMPORT_DRY_RUN_PATH),
      audioChecksumGate: rel(AUDIO_CHECKSUM_GATE_PATH),
      serverManifest: rel(SERVER_MANIFEST_PATH),
      uploadPolicyAudit: rel(UPLOAD_POLICY_AUDIT_PATH),
    },
    materializationRules: {
      localOutputRoot: ALLOWED_LOCAL_OUTPUT_ROOT,
      appBundleWritesAllowed: false,
      firebaseUploadAllowed: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      requiresAcceptedRows: EXPECTED_ROWS,
      requiresChecksumReadySlots: EXPECTED_AUDIO_SLOTS,
      requiresSourceLocaleScopedServerPaths: true,
      requiresRealPayloadSha256: true,
      requiresPayloadByteSize: true,
      requiresUploadPolicyGate: true,
    },
    expectedPayloads,
    summary,
    productionBlockers,
    safety: {
      readOnly: true,
      payloadFilesWrittenByThisScript: false,
      serverManifestModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(CONTRACT_PATH, contract);

  const audit = {
    schemaVersion: 'gustav-fr-lesson-server-payload-materialization-gate-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: contract.sourceArtifacts,
    hashes: {
      reviewDecisionImportDryRunSha256: sha256(IMPORT_DRY_RUN_PATH),
      audioChecksumGateSha256: sha256(AUDIO_CHECKSUM_GATE_PATH),
      serverManifestSha256: sha256(SERVER_MANIFEST_PATH),
      uploadPolicyAuditSha256: sha256(UPLOAD_POLICY_AUDIT_PATH),
      materializationContractSha256: sha256(CONTRACT_PATH),
    },
    summary,
    structuralBlockers,
    productionBlockers,
    safety: contract.safety,
    nextRequiredGates: [
      'complete_llm_official_source_review_decisions',
      'review_decision_import_dry_run_gate',
      'audio_tts_generation_gate',
      'audio_checksum_gate',
      'materialize_server_payloads_after_review_audio_pass',
      'rewrite_server_manifest_with_real_payload_sha_and_bytes',
      'server_upload_policy_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);

  console.log(`Gustav French lesson server payload materialization gate: ${audit.status}`);
  console.log(`Expected payloads: ${summary.expectedPayloads}`);
  console.log(`Existing payload files: ${summary.existingPayloadFiles}/${summary.expectedPayloads}`);
  console.log(`Payloads ready for manifest: ${summary.payloadsReadyForManifest}/${summary.expectedPayloads}`);
  console.log(`Ready for server upload: ${summary.readyForServerUpload}`);
  console.log(rel(AUDIT_PATH));

  if (structuralBlockers.length > 0) process.exitCode = 1;
}

main();
