import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01_blueprint_rebuild');
const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const AUDIO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'lesson01_blueprint_rebuild');
const SERVER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'lesson01_blueprint_rebuild');
const RUNTIME_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'lesson01_blueprint_rebuild');
const ACTIVATION_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'activation', 'lesson01_blueprint_rebuild');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

const REVIEW_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson01_blueprint_rebuild_review_gate_v1.json');
const PACK_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_blueprint_rebuild_pack_draft_audit_v1.json');
const THEORY_AUDIT_PATH = path.join(MATERIALIZED_DIR, 'fr_lesson01_blueprint_rebuild_theory_vocab_pack_audit_v1.json');
const AUDIO_AUDIT_PATH = path.join(AUDIO_DIR, 'fr_lesson01_blueprint_rebuild_audio_tts_manifest_gate_audit_v1.json');
const SERVER_MANIFEST_GATE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_pack_manifest_gate_audit_v1.json');
const PAYLOAD_HASH_LOCK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_payload_hash_lock_gate_audit_v1.json');
const ROLLBACK_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_rollback_manifest_gate_audit_v1.json');
const UPLOAD_EVIDENCE_AUDIT_PATH = path.join(SERVER_DIR, 'fr_lesson01_blueprint_rebuild_server_upload_evidence_gate_audit_v1.json');
const RUNTIME_DELIVERY_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_delivery_gate_audit_v1.json');
const RUNTIME_CACHE_AUDIT_PATH = path.join(RUNTIME_DIR, 'fr_lesson01_blueprint_rebuild_runtime_cache_integrity_gate_audit_v1.json');

const EXPECTED_RECEIPT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_v1.json');
const EXPECTED_RECEIPT_HASH_LOCK_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_hash_lock_v1.json');
const GATE_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate_v1.json');
const AUDIT_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate_audit_v1.json');
const MD_PATH = path.join(ACTIVATION_DIR, 'fr_lesson01_blueprint_rebuild_explicit_activation_receipt_gate_v1.md');

const SOURCE_LOCALES = ['ru', 'uk'];
const REQUIRED_RECEIPT_FIELDS = [
  'schemaVersion',
  'studyTarget',
  'targetContentLang',
  'sourceLocales',
  'lessonId',
  'contentVersion',
  'reviewGateSha256',
  'packAuditSha256',
  'theoryAuditSha256',
  'audioAuditSha256',
  'serverManifestGateAuditSha256',
  'payloadHashLockGateAuditSha256',
  'rollbackGateAuditSha256',
  'uploadEvidenceGateAuditSha256',
  'runtimeDeliveryGateAuditSha256',
  'runtimeCacheIntegrityGateAuditSha256',
  'activationDecision',
  'activationApproved',
  'createdBy',
  'createdAt',
];

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

function statusOf(filePath) {
  return readJson(filePath).status;
}

function markdownFor(audit) {
  const lines = [
    '# French Lesson 1 Blueprint Rebuild Explicit Activation Receipt Gate',
    '',
    `Status: ${audit.status}`,
    `Receipt exists: ${audit.summary.activationReceiptExists}`,
    `Receipt hash-lock exists: ${audit.summary.activationReceiptHashLockExists}`,
    `Prerequisite gates passed: ${audit.summary.prerequisiteGatesPassed}/${audit.summary.prerequisiteGatesTotal}`,
    `Activation approved: ${audit.summary.activationApproved}`,
    '',
    '## Current Hold',
    '',
    ...audit.blockers.map((blocker) => `- ${blocker}`),
    '',
    '## Safety',
    '',
    `- activationReceiptWrittenByThisScript: ${audit.safety.activationReceiptWrittenByThisScript}`,
    `- activationReceiptHashLockWrittenByThisScript: ${audit.safety.activationReceiptHashLockWrittenByThisScript}`,
    `- productionApplyApproved: ${audit.safety.productionApplyApproved}`,
    `- activationApproved: ${audit.safety.activationApproved}`,
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const reviewGate = readJson(REVIEW_GATE_PATH);
  const packAudit = readJson(PACK_AUDIT_PATH);
  const theoryAudit = readJson(THEORY_AUDIT_PATH);
  const audioAudit = readJson(AUDIO_AUDIT_PATH);
  const serverManifestGateAudit = readJson(SERVER_MANIFEST_GATE_AUDIT_PATH);
  const payloadHashLockAudit = readJson(PAYLOAD_HASH_LOCK_AUDIT_PATH);
  const rollbackAudit = readJson(ROLLBACK_AUDIT_PATH);
  const uploadEvidenceAudit = readJson(UPLOAD_EVIDENCE_AUDIT_PATH);
  const runtimeDeliveryAudit = readJson(RUNTIME_DELIVERY_AUDIT_PATH);
  const runtimeCacheAudit = readJson(RUNTIME_CACHE_AUDIT_PATH);
  const blockers = [];

  const prerequisiteGates = [
    {
      id: 'llm_trusted_source_review',
      path: REVIEW_GATE_PATH,
      status: reviewGate.status,
      requiredStatus: 'PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE',
      passed: reviewGate.status === 'PASS_LESSON1_REVIEW_ACCEPTED_FOR_NEXT_GATE' &&
        reviewGate.reviewer?.kind === 'codex_llm_trusted_source_review' &&
        reviewGate.reviewer?.humanReviewRequired === false &&
        reviewGate.summary?.llmTrustedSourceReviewDone === true &&
        reviewGate.summary?.acceptedRows === 50,
    },
    {
      id: 'pack_draft',
      path: PACK_AUDIT_PATH,
      status: packAudit.status,
      requiredStatus: 'PASS_PACK_DRAFT_WRITTEN',
      passed: packAudit.status === 'PASS_PACK_DRAFT_WRITTEN',
    },
    {
      id: 'theory_vocab_pack',
      path: THEORY_AUDIT_PATH,
      status: theoryAudit.status,
      requiredStatus: 'PASS_THEORY_VOCAB_PACK_WRITTEN',
      passed: theoryAudit.status === 'PASS_THEORY_VOCAB_PACK_WRITTEN',
    },
    {
      id: 'audio_checksums',
      path: AUDIO_AUDIT_PATH,
      status: audioAudit.status,
      requiredStatus: 'PASS_AUDIO_TTS_CHECKSUMS_READY',
      passed: audioAudit.status === 'PASS_AUDIO_TTS_CHECKSUMS_READY',
    },
    {
      id: 'server_manifest_upload_closed',
      path: SERVER_MANIFEST_GATE_AUDIT_PATH,
      status: serverManifestGateAudit.status,
      requiredStatus: 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED',
      passed: serverManifestGateAudit.status === 'HOLD_SERVER_PACK_MANIFEST_DRAFT_UPLOAD_CLOSED',
    },
    {
      id: 'payload_hash_lock_materialized',
      path: PAYLOAD_HASH_LOCK_AUDIT_PATH,
      status: payloadHashLockAudit.status,
      requiredStatus: 'PASS_PAYLOAD_HASH_LOCK_MATERIALIZED',
      passed: payloadHashLockAudit.status === 'PASS_PAYLOAD_HASH_LOCK_MATERIALIZED',
    },
    {
      id: 'rollback_execution_ready',
      path: ROLLBACK_AUDIT_PATH,
      status: rollbackAudit.status,
      requiredStatus: 'PASS_ROLLBACK_MANIFEST_READY',
      passed: rollbackAudit.status === 'PASS_ROLLBACK_MANIFEST_READY',
    },
    {
      id: 'server_upload_evidence_ready',
      path: UPLOAD_EVIDENCE_AUDIT_PATH,
      status: uploadEvidenceAudit.status,
      requiredStatus: 'PASS_UPLOAD_EVIDENCE_READY',
      passed: uploadEvidenceAudit.status === 'PASS_UPLOAD_EVIDENCE_READY',
    },
    {
      id: 'runtime_delivery_ready',
      path: RUNTIME_DELIVERY_AUDIT_PATH,
      status: runtimeDeliveryAudit.status,
      requiredStatus: 'PASS_RUNTIME_DELIVERY_READY',
      passed: runtimeDeliveryAudit.status === 'PASS_RUNTIME_DELIVERY_READY',
    },
    {
      id: 'runtime_cache_integrity_ready',
      path: RUNTIME_CACHE_AUDIT_PATH,
      status: runtimeCacheAudit.status,
      requiredStatus: 'PASS_RUNTIME_CACHE_INTEGRITY_READY',
      passed: runtimeCacheAudit.status === 'PASS_RUNTIME_CACHE_INTEGRITY_READY',
    },
  ].map((gate) => ({
    ...gate,
    path: rel(gate.path),
    sha256: sha256File(gate.path),
  }));

  const activationReceiptExists = fs.existsSync(EXPECTED_RECEIPT_PATH);
  const activationReceiptHashLockExists = fs.existsSync(EXPECTED_RECEIPT_HASH_LOCK_PATH);
  let receiptInspection = {
    schemaValid: false,
    requiredFieldsPresent: false,
    lineageHashesMatch: false,
    sourceLocalesScoped: false,
    decisionApprovesActivation: false,
    activationApprovedTrueOnlyInReceipt: false,
    errors: ['activation receipt missing'],
  };

  if (activationReceiptExists) {
    const receipt = readJson(EXPECTED_RECEIPT_PATH);
    const missingFields = REQUIRED_RECEIPT_FIELDS.filter((field) => !(field in receipt));
    receiptInspection = {
      schemaValid: receipt.schemaVersion === 'gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-v1',
      requiredFieldsPresent: missingFields.length === 0,
      lineageHashesMatch:
        receipt.reviewGateSha256 === sha256File(REVIEW_GATE_PATH) &&
        receipt.runtimeCacheIntegrityGateAuditSha256 === sha256File(RUNTIME_CACHE_AUDIT_PATH) &&
        receipt.uploadEvidenceGateAuditSha256 === sha256File(UPLOAD_EVIDENCE_AUDIT_PATH),
      sourceLocalesScoped: JSON.stringify(receipt.sourceLocales) === JSON.stringify(SOURCE_LOCALES),
      decisionApprovesActivation: receipt.activationDecision === 'APPROVE_PRODUCTION_ACTIVATION_AFTER_ALL_GATES',
      activationApprovedTrueOnlyInReceipt: receipt.activationApproved === true,
      errors: [
        ...(missingFields.length === 0 ? [] : [`missing receipt fields: ${missingFields.join(', ')}`]),
        ...(receipt.schemaVersion === 'gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-v1' ? [] : ['receipt schema mismatch']),
        ...(JSON.stringify(receipt.sourceLocales) === JSON.stringify(SOURCE_LOCALES) ? [] : ['receipt sourceLocales mismatch']),
      ],
    };
  }

  const prerequisiteGatesPassed = prerequisiteGates.filter((gate) => gate.passed).length;
  const allPrerequisitesPassed = prerequisiteGatesPassed === prerequisiteGates.length;
  if (!activationReceiptExists) blockers.push('EXPLICIT_ACTIVATION_RECEIPT_MISSING');
  if (!activationReceiptHashLockExists) blockers.push('EXPLICIT_ACTIVATION_RECEIPT_HASH_LOCK_MISSING');
  if (!allPrerequisitesPassed) blockers.push('PREREQUISITE_GATES_NOT_ALL_PASS');
  if (activationReceiptExists && !receiptInspection.schemaValid) blockers.push('ACTIVATION_RECEIPT_SCHEMA_INVALID');

  const summary = {
    prerequisiteGatesTotal: prerequisiteGates.length,
    prerequisiteGatesPassed,
    missingOrHoldPrerequisiteGates: prerequisiteGates.filter((gate) => !gate.passed).map((gate) => gate.id),
    llmTrustedSourceReviewDone: reviewGate.summary?.llmTrustedSourceReviewDone === true,
    humanReviewRequired: reviewGate.reviewer?.humanReviewRequired === true,
    activationReceiptExists,
    activationReceiptHashLockExists,
    activationReceiptSchemaValid: receiptInspection.schemaValid,
    activationReceiptLineageHashesMatch: receiptInspection.lineageHashesMatch,
    activationReceiptSourceLocalesScoped: receiptInspection.sourceLocalesScoped,
    activationReceiptDecisionApprovesActivation: receiptInspection.decisionApprovesActivation,
    readyForActivationReceiptCreation: allPrerequisitesPassed && !activationReceiptExists && !activationReceiptHashLockExists,
    readyForProductionActivation: false,
    productionApplyApproved: false,
    activationApproved: false,
  };

  const gate = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_EXPLICIT_ACTIVATION_RECEIPT_READY' : 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING',
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: SOURCE_LOCALES,
    lessonId: 1,
    expectedActivationArtifacts: {
      activationReceipt: rel(EXPECTED_RECEIPT_PATH),
      activationReceiptHashLock: rel(EXPECTED_RECEIPT_HASH_LOCK_PATH),
      receiptSha256: maybeSha256File(EXPECTED_RECEIPT_PATH),
      receiptHashLockSha256: maybeSha256File(EXPECTED_RECEIPT_HASH_LOCK_PATH),
    },
    requiredReceiptContract: {
      schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-v1',
      requiredFields: REQUIRED_RECEIPT_FIELDS,
      activationDecision: 'APPROVE_PRODUCTION_ACTIVATION_AFTER_ALL_GATES',
      activationApprovedMayBecomeTrueOnlyInsideValidatedReceipt: true,
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
    prerequisiteGates,
    receiptInspection,
    summary,
    productionBlockers: [
      'EXPLICIT_ACTIVATION_RECEIPT_MISSING',
      'EXPLICIT_ACTIVATION_RECEIPT_HASH_LOCK_MISSING',
      'AUDIO_CHECKSUMS_NOT_READY',
      'PAYLOAD_HASH_LOCK_NOT_MATERIALIZED',
      'ROLLBACK_NOT_EXECUTION_READY',
      'SERVER_UPLOAD_EVIDENCE_NOT_READY',
      'RUNTIME_DELIVERY_NOT_READY',
      'RUNTIME_CACHE_INTEGRITY_NOT_READY_FOR_USE',
      'FULL_32_LESSON_PARITY_NOT_DONE',
    ],
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
  writeJson(GATE_PATH, gate);

  const audit = {
    schemaVersion: 'gustav-fr-lesson01-blueprint-rebuild-explicit-activation-receipt-gate-audit-v1',
    generatedAt,
    status: gate.status,
    blockers,
    sourceArtifacts: {
      reviewGate: rel(REVIEW_GATE_PATH),
      packAudit: rel(PACK_AUDIT_PATH),
      theoryAudit: rel(THEORY_AUDIT_PATH),
      audioAudit: rel(AUDIO_AUDIT_PATH),
      serverManifestGateAudit: rel(SERVER_MANIFEST_GATE_AUDIT_PATH),
      payloadHashLockGateAudit: rel(PAYLOAD_HASH_LOCK_AUDIT_PATH),
      rollbackManifestGateAudit: rel(ROLLBACK_AUDIT_PATH),
      serverUploadEvidenceGateAudit: rel(UPLOAD_EVIDENCE_AUDIT_PATH),
      runtimeDeliveryGateAudit: rel(RUNTIME_DELIVERY_AUDIT_PATH),
      runtimeCacheIntegrityGateAudit: rel(RUNTIME_CACHE_AUDIT_PATH),
    },
    hashes: {
      reviewGateSha256: sha256File(REVIEW_GATE_PATH),
      packAuditSha256: sha256File(PACK_AUDIT_PATH),
      theoryAuditSha256: sha256File(THEORY_AUDIT_PATH),
      audioAuditSha256: sha256File(AUDIO_AUDIT_PATH),
      serverManifestGateAuditSha256: sha256File(SERVER_MANIFEST_GATE_AUDIT_PATH),
      payloadHashLockGateAuditSha256: sha256File(PAYLOAD_HASH_LOCK_AUDIT_PATH),
      rollbackManifestGateAuditSha256: sha256File(ROLLBACK_AUDIT_PATH),
      serverUploadEvidenceGateAuditSha256: sha256File(UPLOAD_EVIDENCE_AUDIT_PATH),
      runtimeDeliveryGateAuditSha256: sha256File(RUNTIME_DELIVERY_AUDIT_PATH),
      runtimeCacheIntegrityGateAuditSha256: sha256File(RUNTIME_CACHE_AUDIT_PATH),
      expectedActivationReceiptSha256: maybeSha256File(EXPECTED_RECEIPT_PATH),
      expectedActivationReceiptHashLockSha256: maybeSha256File(EXPECTED_RECEIPT_HASH_LOCK_PATH),
      gateSha256: sha256File(GATE_PATH),
    },
    summary,
    productionBlockers: gate.productionBlockers,
    safety: gate.safety,
    nextRequiredGates: [
      'audio_checksum_generation_gate',
      'payload_hash_lock_materialization_gate',
      'server_upload_evidence_import_gate',
      'runtime_delivery_apply_gate',
      'runtime_cache_enablement_gate',
      'global_french_32_lesson_activation_gate',
    ],
  };
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, markdownFor(audit), 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson01BlueprintRebuildExplicitActivationReceiptGate = rel(GATE_PATH);
    state.lesson01BlueprintRebuildExplicitActivationReceiptGateAudit = rel(AUDIT_PATH);
    state.lesson01BlueprintRebuildExplicitActivationReceiptStatus = audit.status;
    state.lesson01BlueprintRebuildExplicitActivationReceiptSummary = audit.summary;
    state.nextPassPlan = [
      'Start Lesson 2 blueprint-first rebuild with 50 French-native rows, RU/UK meanings, wordsFr and distractors.',
      'Reuse Lesson 1 review, pack, audio manifest, server manifest, runtime/cache and activation receipt gates as templates.',
      'Keep production activation HOLD until all 32 lessons and all non-lesson surfaces pass the same isolation chain.',
    ];
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${audit.status} prereqs=${summary.prerequisiteGatesPassed}/${summary.prerequisiteGatesTotal} receipt=${summary.activationReceiptExists} activation=false blockers=${blockers.length}`);
  if (audit.status !== 'HOLD_EXPLICIT_ACTIVATION_RECEIPT_MISSING' && audit.status !== 'PASS_EXPLICIT_ACTIVATION_RECEIPT_READY') {
    process.exitCode = 1;
  }
}

main();
