import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const BATCH_PLAN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_v1.json');
const BATCH_PLAN_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_batch_plan_audit_v1.json');
const READINESS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_readiness_gate_audit_v1.json');
const EXECUTION_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_audit_v1.json');
const STAGING_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_staging_gate_audit_v1.json');
const OUT_CONTRACT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_launch_contract_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_launch_contract_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_launch_contract_v1.md');

const MAX_ROWS_PER_LIVE_LAUNCH = 25;
const MAX_COST_PER_LIVE_LAUNCH_USD = 0.0625;
const REQUIRED_TOTAL_ROWS = 1600;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function renderMarkdown(contract, audit) {
  const next = contract.nextLaunch || {};
  return [
    '# Gustav French Lesson LLM Review Launch Contract',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Can execute live now: ${audit.summary.canExecuteLiveNow ? 'yes' : 'no'}`,
    `Next rows: ${next.startIndex || '-'}-${next.endIndex || '-'}`,
    `Max rows per live launch: ${contract.policy.maxRowsPerLiveLaunch}`,
    `Max cost per live launch: $${contract.policy.maxCostPerLiveLaunchUsd}`,
    '',
    '## Commands',
    '',
    `Dry-run: \`${next.dryRunCommand || ''}\``,
    `Live: \`${audit.summary.canExecuteLiveNow ? next.executeCommand : 'HOLD: spend guard closed or readiness not pass'}\``,
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const batchPlan = readJson(BATCH_PLAN_PATH);
  const batchAudit = readJson(BATCH_PLAN_AUDIT_PATH);
  const readiness = readJson(READINESS_AUDIT_PATH);
  const execution = readJson(EXECUTION_AUDIT_PATH);
  const staging = readJson(STAGING_GATE_AUDIT_PATH);
  const nextBatch = batchPlan.batches?.[0] || null;

  const liveCredentialReady =
    readiness.summary?.liveCredentialState?.openaiApiKeyPresent === true &&
    readiness.summary?.liveCredentialState?.spendGuardOpen === true;
  const readinessCanExecute = readiness.summary?.canExecuteLiveBatchNow === true;
  const existingLedgerValid = execution.summary?.existingDecisionLedgerValid === true;
  const preAppendValidatorReady = execution.safety?.reviewerDecisionsPreAppendValidated === true;
  const noCanonicalSourceYet = staging.summary?.readyForCanonicalDecisionSource === false;
  const nextBatchWithinLimits =
    Boolean(nextBatch) &&
    nextBatch.limit <= MAX_ROWS_PER_LIVE_LAUNCH &&
    nextBatch.estimatedCostUsd <= MAX_COST_PER_LIVE_LAUNCH_USD;
  const canExecuteLiveNow =
    liveCredentialReady &&
    readinessCanExecute &&
    existingLedgerValid &&
    preAppendValidatorReady &&
    nextBatchWithinLimits;

  const blockers = [];
  if (batchAudit.summary?.requestRows !== REQUIRED_TOTAL_ROWS) blockers.push('REQUEST_ROWS_NOT_1600');
  if (!nextBatch) blockers.push('NO_PENDING_BATCH');
  if (!nextBatchWithinLimits) blockers.push('NEXT_BATCH_EXCEEDS_LAUNCH_LIMITS');
  if (!existingLedgerValid) blockers.push('EXISTING_LEDGER_NOT_VALID');
  if (!preAppendValidatorReady) blockers.push('PRE_APPEND_VALIDATOR_NOT_READY');
  if (!liveCredentialReady) blockers.push('LIVE_CREDENTIAL_OR_SPEND_GUARD_NOT_READY');
  if (!readinessCanExecute) blockers.push('READINESS_GATE_DOES_NOT_ALLOW_LIVE_BATCH');

  const contract = {
    schemaVersion: 'gustav-fr-lesson-llm-review-launch-contract-v1',
    generatedAt,
    status: 'HOLD',
    activationApproved: false,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    policy: {
      maxRowsPerLiveLaunch: MAX_ROWS_PER_LIVE_LAUNCH,
      maxCostPerLiveLaunchUsd: MAX_COST_PER_LIVE_LAUNCH_USD,
      bulkAllRowsLaunchAllowed: false,
      requireDryRunBeforeLive: true,
      requireValidateAfter: true,
      requireExistingLedgerValidation: true,
      requirePreAppendValidation: true,
      requireSpendGuardAtRuntime: true,
    },
    nextLaunch: nextBatch ? {
      batchNumber: nextBatch.batchNumber,
      startIndex: nextBatch.startIndex,
      endIndex: nextBatch.endIndex,
      limit: nextBatch.limit,
      estimatedCostUsd: nextBatch.estimatedCostUsd,
      reasoningLevels: nextBatch.reasoningLevels,
      dryRunCommand: nextBatch.dryRunCommand,
      executeCommand: nextBatch.executeCommand,
      postBatchGates: nextBatch.postBatchGates,
    } : null,
    forbiddenCommands: [
      'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --limit 1600 --execute',
      'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --execute',
      'any command without --validate-after',
      'any command with reviewerImportAllowed=true, productionApplyAllowed=true or activationApproved=true',
    ],
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    },
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson-llm-review-launch-contract-audit-v1',
    generatedAt,
    status: 'HOLD',
    activationApproved: false,
    inputs: {
      batchPlan: rel(BATCH_PLAN_PATH),
      batchPlanAudit: rel(BATCH_PLAN_AUDIT_PATH),
      readinessAudit: rel(READINESS_AUDIT_PATH),
      executionAudit: rel(EXECUTION_AUDIT_PATH),
      stagingGateAudit: rel(STAGING_GATE_AUDIT_PATH),
    },
    hashes: {
      batchPlanSha256: sha256(BATCH_PLAN_PATH),
      batchPlanAuditSha256: sha256(BATCH_PLAN_AUDIT_PATH),
      readinessAuditSha256: sha256(READINESS_AUDIT_PATH),
      executionAuditSha256: sha256(EXECUTION_AUDIT_PATH),
      stagingGateAuditSha256: sha256(STAGING_GATE_AUDIT_PATH),
      contractSha256: '',
    },
    summary: {
      requestRows: batchAudit.summary?.requestRows || 0,
      pendingRows: batchAudit.summary?.pendingRows || 0,
      nextBatchPresent: Boolean(nextBatch),
      nextBatchStartIndex: nextBatch?.startIndex || null,
      nextBatchLimit: nextBatch?.limit || 0,
      nextBatchEstimatedCostUsd: nextBatch?.estimatedCostUsd || 0,
      maxRowsPerLiveLaunch: MAX_ROWS_PER_LIVE_LAUNCH,
      maxCostPerLiveLaunchUsd: MAX_COST_PER_LIVE_LAUNCH_USD,
      nextBatchWithinLimits,
      liveCredentialReady,
      readinessCanExecute,
      existingLedgerValid,
      preAppendValidatorReady,
      noCanonicalSourceYet,
      canExecuteLiveNow,
      allowedLiveCommands: canExecuteLiveNow ? [nextBatch.executeCommand] : [],
      dryRunCommand: nextBatch?.dryRunCommand || '',
      readyForApply: false,
      blockers,
    },
    safety: contract.safety,
    nextRequiredGates: [
      'run_dry_run_command',
      'open_spend_guard_only_if_intentionally_spending',
      'run_single_live_launch_command',
      'llm_review_decision_schema_gate',
      'decision_staging_gate',
      'decision_import_source_gate',
      'review_decision_import_dry_run_gate',
    ],
  };

  writeJson(OUT_CONTRACT_PATH, contract);
  audit.hashes.contractSha256 = sha256(OUT_CONTRACT_PATH);
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, `${renderMarkdown(contract, audit)}\n`, 'utf8');

  console.log(`Gustav French LLM review launch contract: ${audit.status}`);
  console.log(`Next batch: ${audit.summary.nextBatchStartIndex || '-'} limit ${audit.summary.nextBatchLimit}`);
  console.log(`Can execute live now: ${canExecuteLiveNow ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
