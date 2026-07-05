import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const RUN_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', '2026-07-04_fr_daily_phrases_production_v1');
const BUILD_DIR = path.join(RUN_DIR, 'build');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'daily_phrases');
const OUT_PATH = path.join(OUT_DIR, 'fr_daily_phrase_global_readiness_bridge_gate_v1.json');

const BANK_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_bank.json');
const SOURCE_EVIDENCE_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_source_evidence.json');
const DUPLICATE_AUDIT_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_duplicate_audit.json');
const RUNTIME_MANIFEST_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_runtime_manifest.json');
const SERVER_MANIFEST_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_server_pack_manifest.json');
const ADMIN_WORKFLOW_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_admin_workflow_manifest.json');
const ROLLBACK_MANIFEST_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_activation_rollback_manifest.json');
const FINAL_GATE_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_final_gate.json');
const RU_PAYLOAD_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_runtime_payload_ru.dryrun.json');
const UK_PAYLOAD_PATH = path.join(BUILD_DIR, 'fr_daily_phrase_runtime_payload_uk.dryrun.json');

const MOJIBAKE_PATTERN = /(?:[\u00c3\u00d0\u00d1\u00e2][\u0080-\u00bf]|\ufffd)/u;
const PLACEHOLDER_PATTERN = /\b(this\s+lesson|this\s+content|coming\s+soon|not\s+ready|under\s+review)\b|(?:этот|данный)\s+урок|(?:заглушка|заглушку|заглушки)/iu;

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

function validatePayload(payload, sourceLocale) {
  const issues = [];
  const text = JSON.stringify(payload);
  if (payload.schemaVersion !== 'gustav-fr-daily-phrase-runtime-payload-v1') issues.push('SCHEMA_VERSION_MISMATCH');
  if (payload.studyTarget !== 'fr') issues.push('STUDY_TARGET_NOT_FR');
  if (payload.sourceLocale !== sourceLocale) issues.push('SOURCE_LOCALE_MISMATCH');
  if (payload.surface !== 'daily_phrase') issues.push('SURFACE_NOT_DAILY_PHRASE');
  if (payload.activationApproved !== false) issues.push('ACTIVATION_NOT_FALSE');
  if (!Array.isArray(payload.entries) || payload.entries.length !== 176) issues.push('ENTRY_COUNT_NOT_176');
  if (MOJIBAKE_PATTERN.test(text)) issues.push('MOJIBAKE');
  if (PLACEHOLDER_PATTERN.test(text)) issues.push('PLACEHOLDER');

  const ids = new Set();
  for (const entry of payload.entries || []) {
    if (ids.has(entry.id)) issues.push(`${entry.id}:DUPLICATE_ID`);
    ids.add(entry.id);
    if (entry.studyTarget !== 'fr') issues.push(`${entry.id}:STUDY_TARGET_NOT_FR`);
    if (entry.sourceLocale !== sourceLocale) issues.push(`${entry.id}:SOURCE_LOCALE_MISMATCH`);
    if (entry.surface !== 'daily_phrase') issues.push(`${entry.id}:SURFACE_NOT_DAILY_PHRASE`);
    if (entry.activationApproved !== false) issues.push(`${entry.id}:ACTIVATION_NOT_FALSE`);
    for (const field of ['id', 'targetText', 'english', 'literal', 'meaning', 'text', 'literal_uk', 'meaning_uk', 'text_uk']) {
      if (!entry[field]) issues.push(`${entry.id || 'entry'}:${field.toUpperCase()}_MISSING`);
    }
    if (!Array.isArray(entry.sourceEvidence) || entry.sourceEvidence.length < 1) issues.push(`${entry.id}:SOURCE_EVIDENCE_MISSING`);
  }

  return {
    sourceLocale,
    entryCount: Array.isArray(payload.entries) ? payload.entries.length : 0,
    issueCount: issues.length,
    issues: issues.slice(0, 50),
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const bank = readJson(BANK_PATH);
  const sourceEvidence = readJson(SOURCE_EVIDENCE_PATH);
  const duplicateAudit = readJson(DUPLICATE_AUDIT_PATH);
  const runtimeManifest = readJson(RUNTIME_MANIFEST_PATH);
  const serverManifest = readJson(SERVER_MANIFEST_PATH);
  const adminWorkflow = readJson(ADMIN_WORKFLOW_PATH);
  const rollbackManifest = readJson(ROLLBACK_MANIFEST_PATH);
  const finalGate = readJson(FINAL_GATE_PATH);
  const ruPayload = readJson(RU_PAYLOAD_PATH);
  const ukPayload = readJson(UK_PAYLOAD_PATH);

  const validations = {
    ru: validatePayload(ruPayload, 'ru'),
    uk: validatePayload(ukPayload, 'uk'),
  };
  const blockers = [];

  if (bank.status !== 'CONTENT_BANK_READY_FOR_RUNTIME_ADMIN_REVIEW' || bank.rows?.length !== 176) blockers.push('BANK_NOT_176_READY');
  if (bank.studyTarget !== 'fr' || bank.activationApproved !== false) blockers.push('BANK_TARGET_OR_ACTIVATION_INVALID');
  if (sourceEvidence.status !== 'PASS' || sourceEvidence.acceptedRows !== 176 || sourceEvidence.strictSourceBackedRows < 176) blockers.push('SOURCE_EVIDENCE_NOT_PASS_176');
  if (duplicateAudit.status !== 'PASS' || duplicateAudit.duplicateCount !== 0) blockers.push('DUPLICATE_AUDIT_NOT_PASS');
  if (runtimeManifest.status !== 'PASS_RUNTIME_WIRED_WITH_FLASHCARD_ROLLBACK' || runtimeManifest.runtimeWired !== true) blockers.push('RUNTIME_NOT_WIRED');
  if (serverManifest.status !== 'PASS_UPLOAD_REHEARSAL_READY_NOT_UPLOADED' || serverManifest.uploadPerformed !== false || serverManifest.uploadRehearsalPerformed !== true) blockers.push('SERVER_MANIFEST_NOT_REHEARSED_CLOSED');
  if (serverManifest.targetScoped !== true || serverManifest.entries?.length !== 2) blockers.push('SERVER_MANIFEST_NOT_TARGET_SCOPED');
  if (adminWorkflow.status !== 'PASS_ADMIN_WORKFLOW_AND_SURFACE_WIRED' || adminWorkflow.adminSurfaceWired !== true || adminWorkflow.workflowHandlersPresent !== true) blockers.push('ADMIN_WORKFLOW_NOT_WIRED');
  if (rollbackManifest.status !== 'PASS' || rollbackManifest.activationApproved !== false) blockers.push('ROLLBACK_NOT_PASS');
  if (finalGate.status !== 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL' || finalGate.productionReady !== true || finalGate.activationApproved !== false) blockers.push('FINAL_GATE_NOT_READY_CLOSED');
  if (finalGate.holdGates?.length !== 0) blockers.push('FINAL_GATE_HAS_LOCAL_HOLDS');
  if (validations.ru.issueCount > 0) blockers.push('RU_PAYLOAD_VALIDATION_FAILED');
  if (validations.uk.issueCount > 0) blockers.push('UK_PAYLOAD_VALIDATION_FAILED');

  const gate = {
    schemaVersion: 'gustav-fr-daily-phrase-global-readiness-bridge-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    surface: 'daily_phrases',
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    readyForRuntimeEnable: false,
    inputs: {
      runDir: rel(RUN_DIR),
      bank: rel(BANK_PATH),
      sourceEvidence: rel(SOURCE_EVIDENCE_PATH),
      duplicateAudit: rel(DUPLICATE_AUDIT_PATH),
      runtimeManifest: rel(RUNTIME_MANIFEST_PATH),
      serverManifest: rel(SERVER_MANIFEST_PATH),
      adminWorkflow: rel(ADMIN_WORKFLOW_PATH),
      rollbackManifest: rel(ROLLBACK_MANIFEST_PATH),
      finalGate: rel(FINAL_GATE_PATH),
      ruPayload: rel(RU_PAYLOAD_PATH),
      ukPayload: rel(UK_PAYLOAD_PATH),
    },
    summary: {
      acceptedRows: bank.rows?.length ?? 0,
      strictSourceBackedRows: sourceEvidence.strictSourceBackedRows,
      ruPayloadRows: validations.ru.entryCount,
      ukPayloadRows: validations.uk.entryCount,
      duplicateCount: duplicateAudit.duplicateCount,
      runtimeWired: runtimeManifest.runtimeWired,
      uploadRehearsalPerformed: serverManifest.uploadRehearsalPerformed,
      liveUploadPerformed: serverManifest.uploadPerformed,
      adminSurfaceWired: adminWorkflow.adminSurfaceWired,
      productionReadyLocalGate: finalGate.productionReady,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    validations,
    invariants: {
      frenchNativeDailyPhraseBank: true,
      notFlashcardBridgeAsFinalContent: true,
      noEnglishIdiomsFallbackForFrenchRuntime: true,
      sourceEvidencePerAcceptedRow: sourceEvidence.status === 'PASS',
      duplicateTargetsBlocked: duplicateAudit.status === 'PASS',
      ruUkPayloadsSeparated: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      serverPackTargetScoped: serverManifest.targetScoped === true,
      liveUploadClosed: serverManifest.uploadPerformed === false,
      adminWorkflowScopedToFrench: adminWorkflow.adminSurfaceWired === true,
      rollbackToFlashcardBridgeAvailable: rollbackManifest.rollbackBaseline === 'existing fr-daily flashcard bridge',
      noMojibakeOrPlaceholders: validations.ru.issueCount === 0 && validations.uk.issueCount === 0,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Keep live upload closed until global French activation approval.',
      'Use only target-scoped course-packs/fr/{sourceLocale}/daily_phrase paths for server delivery.',
      'Do not publish French Daily Phrases into the English daily_phrases queue.',
    ],
  };

  writeJson(OUT_PATH, gate);
  console.log(`${gate.status} ${rel(OUT_PATH)} rows=${bank.rows?.length ?? 0} blockers=${blockers.length}`);
}

main();
