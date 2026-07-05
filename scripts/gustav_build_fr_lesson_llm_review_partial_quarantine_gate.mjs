import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const PROGRESS_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_progress_gate_audit_v1.json');
const SCHEMA_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_schema_gate_audit_v1.json');
const STAGING_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_staging_gate_audit_v1.json');
const IMPORT_SOURCE_GATE_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_import_source_gate_audit_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_partial_quarantine_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_partial_quarantine_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function renderMarkdown(audit) {
  const lines = [
    '# Gustav French LLM Review Partial Quarantine Gate',
    '',
    `Status: \`${audit.status}\``,
    '',
    '## Summary',
    '',
    `- Valid decisions: ${audit.summary.validDecisionRows}/${EXPECTED_ROWS}`,
    `- Partial quarantined rows: ${audit.summary.partialQuarantinedRows}`,
    `- Invalid decisions: ${audit.summary.invalidDecisionRows}`,
    `- Open import/apply/activation rows: ${audit.summary.openedImportApplyActivationRows}`,
    `- Can resume next batch: ${audit.summary.canResumeNextBatch ? 'yes' : 'no'}`,
    `- Full import allowed now: ${audit.summary.fullImportAllowedNow ? 'yes' : 'no'}`,
    `- Ready for audio/server/runtime/apply: no`,
    '',
    '## Findings',
    '',
  ];
  if (audit.findings.length === 0) lines.push('- None.');
  else for (const finding of audit.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  lines.push('', '## Safety', '');
  lines.push('- This gate does not call OpenAI.');
  lines.push('- This gate does not write or import reviewer decisions.');
  lines.push('- Partial decisions can only move the resume pointer.');
  lines.push('- Audio, server, runtime, admin, apply and activation stay closed until all 1600 rows are valid and downstream gates pass.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const progress = readJson(PROGRESS_GATE_PATH);
  const schema = readJsonIfPresent(SCHEMA_GATE_PATH);
  const staging = readJsonIfPresent(STAGING_GATE_PATH);
  const importSource = readJsonIfPresent(IMPORT_SOURCE_GATE_PATH);

  const validDecisionRows = progress.summary?.validDecisionRows || 0;
  const decisionRows = progress.summary?.decisionRows || 0;
  const invalidDecisionRows = progress.summary?.invalidDecisionRows || 0;
  const duplicateDecisionRows = progress.summary?.duplicateDecisionRows || 0;
  const extraDecisionRows = progress.summary?.extraDecisionRows || 0;
  const openedImportApplyActivationRows = progress.summary?.openedImportApplyActivationRows || 0;
  const progressBlockers = progress.summary?.blockers || 0;
  const readyForFullSchemaGate = progress.summary?.readyForFullSchemaGate === true;
  const fullDecisionSetPresent = validDecisionRows === EXPECTED_ROWS && readyForFullSchemaGate;
  const partialQuarantinedRows = validDecisionRows > 0 && validDecisionRows < EXPECTED_ROWS ? validDecisionRows : 0;
  const hasInvalidOrUnsafeRows =
    invalidDecisionRows > 0 ||
    duplicateDecisionRows > 0 ||
    extraDecisionRows > 0 ||
    openedImportApplyActivationRows > 0 ||
    progressBlockers > 0;

  const findings = [];
  if (hasInvalidOrUnsafeRows) {
    findings.push({
      severity: 'blocker',
      code: 'partial_decisions_invalid_or_unsafe',
      message: 'Partial reviewer decisions contain invalid, duplicate, extra or import/apply/activation-opening rows.',
    });
  }
  if (validDecisionRows === 0) {
    findings.push({
      severity: 'info',
      code: 'no_valid_decisions_yet',
      message: 'No valid LLM official-source decisions exist yet; first batch can still start at row 1.',
    });
  }
  if (partialQuarantinedRows > 0) {
    findings.push({
      severity: 'info',
      code: 'partial_decisions_quarantined',
      message: `${partialQuarantinedRows} valid decisions are tracked for resume only; full import/audio/server remain closed.`,
    });
  }

  const fullImportAllowedNow =
    fullDecisionSetPresent &&
    schema?.summary?.readyForDecisionImportDryRun === true &&
    staging?.summary?.readyForCanonicalDecisionSource === true &&
    importSource?.summary?.importSourceAccepted === true;

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const status = blockers > 0
    ? 'BLOCK'
    : fullImportAllowedNow
      ? 'PASS_READY_FOR_DECISION_IMPORT'
      : partialQuarantinedRows > 0
        ? 'HOLD_PARTIAL_QUARANTINED'
        : 'HOLD_EMPTY';

  const audit = {
    schemaVersion: 'gustav-fr-lesson-llm-review-partial-quarantine-gate-audit-v1',
    generatedAt,
    status,
    activationApproved: false,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    inputs: {
      progressGate: rel(PROGRESS_GATE_PATH),
      schemaGate: rel(SCHEMA_GATE_PATH),
      stagingGate: rel(STAGING_GATE_PATH),
      importSourceGate: rel(IMPORT_SOURCE_GATE_PATH),
    },
    hashes: {
      progressGateSha256: sha256(PROGRESS_GATE_PATH),
      schemaGateSha256: sha256(SCHEMA_GATE_PATH),
      stagingGateSha256: sha256(STAGING_GATE_PATH),
      importSourceGateSha256: sha256(IMPORT_SOURCE_GATE_PATH),
    },
    summary: {
      expectedRows: EXPECTED_ROWS,
      decisionRows,
      validDecisionRows,
      partialQuarantinedRows,
      invalidDecisionRows,
      duplicateDecisionRows,
      extraDecisionRows,
      openedImportApplyActivationRows,
      missingDecisionRows: progress.summary?.missingDecisionRows || EXPECTED_ROWS,
      nextResumeStartIndex: progress.summary?.nextResumeStartIndex || 1,
      nextBatchDryRunCommand: progress.summary?.nextBatchDryRunCommand || '',
      nextBatchExecuteCommand: progress.summary?.nextBatchExecuteCommand || '',
      canResumeNextBatch: !hasInvalidOrUnsafeRows && validDecisionRows < EXPECTED_ROWS,
      readyForFullSchemaGate,
      fullDecisionSetPresent,
      fullImportAllowedNow,
      readyForAudioManifestGate: false,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      blockers,
    },
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      audioGenerationStarted: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    },
    findings,
    nextRequiredGates: fullImportAllowedNow
      ? [
          'review_decision_import_dry_run_gate',
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'resume_llm_official_source_review_batches',
          'decision_progress_gate',
          'partial_quarantine_gate',
          'llm_review_decision_schema_gate_after_1600_valid_rows',
          'decision_staging_gate_after_1600_valid_rows',
          'decision_import_source_gate_after_1600_valid_rows',
        ],
  };

  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, renderMarkdown(audit), 'utf8');
  console.log(`Gustav French LLM partial quarantine gate: ${audit.status}`);
  console.log(`Valid decisions: ${validDecisionRows}/${EXPECTED_ROWS}`);
  console.log(`Full import allowed now: ${fullImportAllowedNow ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
