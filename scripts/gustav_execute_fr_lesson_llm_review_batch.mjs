import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireCodexOpenAiTtsOnly, requireOpenAiDevSpendGuard } from './openai-dev-guard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const REQUESTS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_audit_v1.json');
const DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const EXECUTION_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_audit_v1.json');
const EXECUTION_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_audit_v1.md');

const DEFAULT_MODEL = 'gpt-5-mini';
const DEFAULT_LIMIT = 0;
const DEFAULT_START_INDEX = 1;
const ESTIMATED_COST_PER_ROW_USD = 0.0025;
const REQUIRED_TOTAL_ROWS = 1600;
const MAX_ROWS_PER_LIVE_LAUNCH = 25;
const MAX_COST_PER_LIVE_LAUNCH_USD = 0.0625;
const OPENAI_MAX_ATTEMPTS = 3;
const OPENAI_RETRY_BASE_DELAY_MS = 1500;
const DECISION_KEYS = [
  'schemaVersion',
  'requestId',
  'reviewScope',
  'sourceQueueIndex',
  'batchId',
  'lessonId',
  'phraseId',
  'studyTarget',
  'sourceLocaleCoverage',
  'reviewerDecision',
  'gateReviewerDecisions',
  'gateEvidenceNotes',
  'reviewerNotes',
  'reviewerName',
  'reviewedAt',
  'correctedTargetText',
  'correctedQuizBlank',
  'correctedQuizCorrect',
  'correctedQuizDistractors',
  'reviewerImportAllowed',
  'productionApplyAllowed',
  'activationApproved',
];
const ALLOWED_DECISIONS = new Set([
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
]);
const NON_ACCEPT_DECISIONS = new Set([
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
]);
const ALLOWED_GATE_DECISIONS = new Set(['pass', 'fail', 'needs_source_check']);
const CORRECTABLE_DECISIONS = new Set(['needs_llm_regeneration_review']);

function parseArgs(argv) {
  const args = {
    execute: false,
    validateAfter: false,
    model: process.env.GUSTAV_LLM_REVIEW_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
    limit: DEFAULT_LIMIT,
    startIndex: DEFAULT_START_INDEX,
    requestsJsonl: REQUESTS_JSONL_PATH,
    requestsAudit: REQUESTS_AUDIT_PATH,
    out: DECISIONS_PATH,
    executionAudit: EXECUTION_AUDIT_PATH,
    executionMarkdown: EXECUTION_MD_PATH,
    requiredTotalRows: REQUIRED_TOTAL_ROWS,
    postGateMode: 'standard',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--execute') args.execute = true;
    else if (arg === '--validate-after') args.validateAfter = true;
    else if (arg === '--model') args.model = argv[++i] || args.model;
    else if (arg === '--limit') args.limit = Number(argv[++i] || DEFAULT_LIMIT);
    else if (arg === '--start-index') args.startIndex = Number(argv[++i] || DEFAULT_START_INDEX);
    else if (arg === '--requests-jsonl') args.requestsJsonl = path.resolve(ROOT, argv[++i] || REQUESTS_JSONL_PATH);
    else if (arg === '--requests-audit') args.requestsAudit = path.resolve(ROOT, argv[++i] || REQUESTS_AUDIT_PATH);
    else if (arg === '--out') args.out = path.resolve(ROOT, argv[++i] || DECISIONS_PATH);
    else if (arg === '--execution-audit') args.executionAudit = path.resolve(ROOT, argv[++i] || EXECUTION_AUDIT_PATH);
    else if (arg === '--execution-md') args.executionMarkdown = path.resolve(ROOT, argv[++i] || EXECUTION_MD_PATH);
    else if (arg === '--required-total-rows') args.requiredTotalRows = Number(argv[++i] || REQUIRED_TOTAL_ROWS);
    else if (arg === '--post-gate-mode') args.postGateMode = argv[++i] || 'standard';
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.limit) || args.limit < 0) throw new Error('--limit must be a non-negative integer');
  if (!Number.isInteger(args.startIndex) || args.startIndex < 1) throw new Error('--start-index must be a positive integer');
  if (!Number.isInteger(args.requiredTotalRows) || args.requiredTotalRows < 1) throw new Error('--required-total-rows must be a positive integer');
  if (!['standard', 'none'].includes(args.postGateMode)) throw new Error('--post-gate-mode must be standard or none');
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function parseJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
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

function requestIdentity(request) {
  return `${request.requestId}:${request.sourceQueueIndex}:${request.lessonId}:${request.phraseId}`;
}

function decisionIdentity(decision) {
  return `${decision.requestId}:${decision.sourceQueueIndex}:${decision.lessonId}:${decision.phraseId}`;
}

function sameArray(left, right) {
  return Array.isArray(left) && JSON.stringify(left) === JSON.stringify(right);
}

function sameKeySet(object, expectedKeys) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  return JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...expectedKeys].sort());
}

function hasCorrectionPayload(row) {
  return Boolean(
    String(row.correctedTargetText || '').trim() ||
    String(row.correctedQuizBlank || '').trim() ||
    String(row.correctedQuizCorrect || '').trim() ||
    (Array.isArray(row.correctedQuizDistractors) && row.correctedQuizDistractors.length > 0),
  );
}

function validateDecisionBeforeAppend(decision, request) {
  const errors = [];
  const fail = (code, message) => errors.push({ code, message });
  const expectedGateIds = Object.keys(request.blankResponseTemplate?.gateReviewerDecisions || {});

  if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
    return [{ code: 'decision_not_object', message: 'OpenAI decision must be a JSON object.' }];
  }
  if (!sameKeySet(decision, DECISION_KEYS)) fail('decision_key_set_invalid', 'Decision key set does not exactly match the V1 schema.');
  if (decision.schemaVersion !== 'gustav-fr-lesson-llm-official-source-review-decision-v1') fail('schema_version_invalid', 'Decision schemaVersion is invalid.');
  if (decision.reviewScope !== 'lesson_row') fail('review_scope_invalid', 'Decision reviewScope must be lesson_row.');
  if (decision.studyTarget !== 'fr') fail('study_target_invalid', 'Decision studyTarget must be fr.');
  if (!sameArray(decision.sourceLocaleCoverage, ['ru', 'uk'])) fail('source_locale_coverage_invalid', 'Decision sourceLocaleCoverage must be exactly ru,uk.');
  if (decision.reviewerName !== 'llm_official_source_judge') fail('reviewer_name_invalid', 'Decision reviewerName must be llm_official_source_judge.');
  if (!String(decision.reviewedAt || '').trim()) fail('reviewed_at_missing', 'Decision reviewedAt is required.');
  if (!String(decision.reviewerNotes || '').trim()) fail('reviewer_notes_missing', 'Decision reviewerNotes is required.');

  for (const key of ['requestId', 'sourceQueueIndex', 'batchId', 'lessonId', 'phraseId']) {
    if (decision[key] !== request[key]) fail('decision_identity_mismatch', `Decision ${key} does not match the selected request.`);
  }
  if (!ALLOWED_DECISIONS.has(decision.reviewerDecision)) fail('reviewer_decision_invalid', 'Decision reviewerDecision is not allowed.');
  if (!sameKeySet(decision.gateReviewerDecisions, expectedGateIds)) fail('gate_decision_key_set_invalid', 'Gate decision keys do not match the selected request.');
  if (!sameKeySet(decision.gateEvidenceNotes, expectedGateIds)) fail('gate_evidence_key_set_invalid', 'Gate evidence keys do not match the selected request.');

  const gateValues = expectedGateIds.map((gateId) => decision.gateReviewerDecisions?.[gateId]);
  for (const gateId of expectedGateIds) {
    const gateDecision = decision.gateReviewerDecisions?.[gateId];
    const gateNote = decision.gateEvidenceNotes?.[gateId];
    if (!ALLOWED_GATE_DECISIONS.has(gateDecision)) fail('gate_decision_invalid', `Gate ${gateId} has an invalid decision.`);
    if (!String(gateNote || '').trim()) fail('gate_evidence_note_missing', `Gate ${gateId} evidence note is required.`);
  }

  if (decision.reviewerImportAllowed !== false || decision.productionApplyAllowed !== false || decision.activationApproved !== false) {
    fail('decision_opened_import_apply_or_activation', 'Decision attempted to open import, apply or activation flags.');
  }

  const correctionPayload = hasCorrectionPayload(decision);
  if (decision.reviewerDecision === 'accept_quality_gates') {
    if (!gateValues.every((value) => value === 'pass')) fail('accept_with_non_pass_gate', 'accept_quality_gates requires every gate to pass.');
    if (correctionPayload) fail('accept_with_correction_payload', 'accept_quality_gates cannot include corrected fields.');
  }
  if (NON_ACCEPT_DECISIONS.has(decision.reviewerDecision) && gateValues.every((value) => value === 'pass')) {
    fail('non_accept_with_all_gates_passed', 'Non-accept decisions require at least one fail or needs_source_check gate.');
  }
  if (!CORRECTABLE_DECISIONS.has(decision.reviewerDecision) && correctionPayload) {
    fail('correction_payload_for_wrong_decision', 'Corrected fields are only allowed with needs_llm_regeneration_review.');
  }
  if (decision.reviewerDecision === 'needs_llm_regeneration_review' && !correctionPayload) {
    fail('needs_llm_regeneration_review_without_correction', 'needs_llm_regeneration_review requires at least one corrected field.');
  }
  if (decision.reviewerDecision === 'skip_for_later' && !gateValues.includes('needs_source_check')) {
    fail('skip_without_source_check_gate', 'skip_for_later requires at least one needs_source_check gate.');
  }

  return errors;
}

function validateExistingDecisionLedgerBeforeExecution(existingDecisions, requests) {
  const requestByIdentity = new Map(requests.map((request) => [requestIdentity(request), request]));
  const seen = new Set();
  const errors = [];
  for (const [index, decision] of existingDecisions.entries()) {
    const identity = decisionIdentity(decision);
    if (seen.has(identity)) {
      errors.push({
        code: 'existing_decision_duplicate_identity',
        message: `Existing decision row ${index + 1} duplicates ${identity}.`,
      });
      continue;
    }
    seen.add(identity);
    const request = requestByIdentity.get(identity);
    if (!request) {
      errors.push({
        code: 'existing_decision_unknown_identity',
        message: `Existing decision row ${index + 1} has no matching request: ${identity}.`,
      });
      continue;
    }
    for (const error of validateDecisionBeforeAppend(decision, request)) {
      errors.push({
        code: `existing_${error.code}`,
        message: `Existing decision row ${index + 1}: ${error.message}`,
      });
    }
  }
  return {
    valid: errors.length === 0,
    checkedRows: existingDecisions.length,
    uniqueIdentities: seen.size,
    errors,
  };
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const text = data.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text || '')
    ?.join('\n')
    ?.trim();
  if (text) return text;
  throw new Error('OpenAI response did not include output text');
}

function parseModelJson(text) {
  const normalized = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(normalized);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableOpenAiError(error) {
  const message = String(error?.message || '');
  return (
    message.includes('fetch failed') ||
    message.includes('OpenAI responses API returned 408') ||
    message.includes('OpenAI responses API returned 409') ||
    message.includes('OpenAI responses API returned 429') ||
    /^OpenAI responses API returned 5\d\d/.test(message)
  );
}

function buildInput(request) {
  return [
    'Review this single PhraseMan French lesson row.',
    'Return only JSON matching the supplied outputJsonSchema.',
    'Do not include markdown.',
    'Do not set reviewerImportAllowed, productionApplyAllowed or activationApproved to true.',
    'Decision consistency checklist before final JSON:',
    '- accept_quality_gates => all 11 gateReviewerDecisions must be pass; all corrected* strings must be empty; correctedQuizDistractors must be empty.',
    '- non-accept reviewerDecision => at least one gateReviewerDecisions value must be fail or needs_source_check.',
    '- needs_llm_regeneration_review => include at least one corrected* value and mark the relevant gate fail.',
    '- skip_for_later => at least one gateReviewerDecisions value must be needs_source_check.',
    '- Any answer that violates this checklist is invalid and will be discarded before append.',
    '',
    JSON.stringify(request, null, 2),
  ].join('\n');
}

async function callOpenAiOnce({ apiKey, model, request }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: [
        request.instructions.role,
        `Required reasoning level: ${request.instructions.reasoningLevel}.`,
        request.instructions.task,
        ...request.instructions.hardRules,
      ].join('\n'),
      input: buildInput(request),
      text: {
        format: {
          type: 'json_schema',
          name: 'gustav_fr_lesson_llm_review_decision',
          strict: true,
          schema: request.outputJsonSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI responses API returned ${response.status}: ${body}`);
  }
  const data = await response.json();
  return parseModelJson(extractOutputText(data));
}

async function callOpenAi({ apiKey, model, request }) {
  let lastError;
  for (let attempt = 1; attempt <= OPENAI_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await callOpenAiOnce({ apiKey, model, request });
    } catch (error) {
      lastError = error;
      if (!isRetryableOpenAiError(error) || attempt === OPENAI_MAX_ATTEMPTS) break;
      await sleep(OPENAI_RETRY_BASE_DELAY_MS * attempt);
    }
  }
  throw lastError;
}

function runGateScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  return {
    script: rel(scriptPath),
    exitCode: result.status,
    stdout: String(result.stdout || '').trim().split(/\r?\n/).slice(-8),
    stderr: String(result.stderr || '').trim().split(/\r?\n/).filter(Boolean).slice(-8),
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav French Lesson LLM Review Execution Audit',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Mode: ${report.summary.mode}`,
    `- API key present: ${report.summary.apiKeyPresent ? 'yes' : 'no'}`,
    `- Model: ${report.summary.model}`,
    `- Existing decisions: ${report.summary.existingDecisionRows}`,
    `- Existing decision ledger valid: ${report.summary.existingDecisionLedgerValid ? 'yes' : 'no'}`,
    `- Pending rows: ${report.summary.pendingRows}`,
    `- Selected rows this run: ${report.summary.selectedRows}`,
    `- Executed rows this run: ${report.summary.executedRows}`,
    `- Rejected before append: ${report.summary.preAppendRejectedRows}`,
    `- Failed rows this run: ${report.summary.failedRows}`,
    `- Estimated selected cost: $${report.summary.estimatedSelectedCostUsd}`,
    `- Ready for schema gate rerun: ${report.summary.readyForSchemaGateRerun ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- None.');
  else for (const finding of report.findings) lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
  lines.push('', '## Safety', '');
  lines.push('- Dry-run is the default.');
  lines.push('- Real calls require --execute, OPENAI_API_KEY and PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1.');
  lines.push('- Existing reviewer decisions are validated before any new append.');
  lines.push('- This script validates each model decision against the selected request before appending it to reviewer decision JSONL.');
  lines.push('- This script writes only reviewer decision JSONL and audit files.');
  lines.push('- It does not modify app bundle content, server packs, Firebase, runtime downloads or activation.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const apiKey = readEnvValue('OPENAI_API_KEY');
  const spendGuardOpen = process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND === '1';
  const requestAudit = readJson(args.requestsAudit);
  const requests = parseJsonl(args.requestsJsonl);
  const existingDecisions = parseJsonl(args.out);
  const existingLedgerValidation = validateExistingDecisionLedgerBeforeExecution(existingDecisions, requests);
  const existingIdentities = new Set(existingDecisions.map(decisionIdentity));
  const findings = [];

  const requestAuditReady =
    requestAudit.readyForLlmOfficialSourceExecution === true ||
    requestAudit.summary?.readyForExternalReview === true;
  if (!requestAuditReady) {
    findings.push({
      severity: 'blocker',
      code: 'request_audit_not_ready',
      message: 'LLM review requests audit is not ready for execution.',
    });
  }
  if (requests.length !== args.requiredTotalRows) {
    findings.push({
      severity: 'blocker',
      code: 'request_count_invalid',
      message: `Expected ${args.requiredTotalRows} requests, found ${requests.length}.`,
    });
  }
  if (!existingLedgerValidation.valid) {
    findings.push({
      severity: 'blocker',
      code: 'existing_decision_ledger_invalid',
      message: `Existing decision ledger is not safe to append to: ${existingLedgerValidation.errors.slice(0, 5).map((error) => error.code).join(', ')}.`,
    });
  }

  const pending = requests.filter((request) => !existingIdentities.has(requestIdentity(request)));
  const selected = pending
    .filter((request) => request.sourceQueueIndex >= args.startIndex)
    .slice(0, args.limit || 0);
  const estimatedSelectedCostUsd = Number((selected.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4));
  const selectedRowsWithinLiveLimit = selected.length <= MAX_ROWS_PER_LIVE_LAUNCH;
  const selectedCostWithinLiveLimit = estimatedSelectedCostUsd <= MAX_COST_PER_LIVE_LAUNCH_USD;

  if (!args.execute) {
    findings.push({
      severity: 'info',
      code: 'dry_run_only',
      message: 'No LLM calls were made. Pass --execute after checking estimate and setting the spend guard.',
    });
  }
  if (args.execute && !apiKey) {
    findings.push({
      severity: 'blocker',
      code: 'openai_api_key_missing',
      message: 'OPENAI_API_KEY is required to execute LLM review calls.',
    });
  }
  if (args.execute && !args.validateAfter) {
    findings.push({
      severity: 'blocker',
      code: 'validate_after_required_for_live_execution',
      message: 'Live LLM review execution must include --validate-after.',
    });
  }
  if (args.execute && !selectedRowsWithinLiveLimit) {
    findings.push({
      severity: 'blocker',
      code: 'live_launch_row_limit_exceeded',
      message: `Live LLM review execution is limited to ${MAX_ROWS_PER_LIVE_LAUNCH} rows per launch; selected ${selected.length}.`,
    });
  }
  if (args.execute && !selectedCostWithinLiveLimit) {
    findings.push({
      severity: 'blocker',
      code: 'live_launch_cost_limit_exceeded',
      message: `Live LLM review execution is limited to $${MAX_COST_PER_LIVE_LAUNCH_USD.toFixed(4)} per launch; selected estimate is $${estimatedSelectedCostUsd.toFixed(4)}.`,
    });
  }
  if (args.execute && selected.length === 0) {
    findings.push({
      severity: 'warning',
      code: 'no_rows_selected',
      message: 'No pending rows were selected for execution. Increase --limit or change --start-index.',
    });
  }

  let executedRows = 0;
  let preAppendRejectedRows = 0;
  const appendIdentities = new Set(existingIdentities);
  const failures = [];
  if (args.execute && apiKey && selected.length > 0 && findings.every((finding) => finding.severity !== 'blocker')) {
    requireCodexOpenAiTtsOnly({
      action: 'Gustav French LLM official-source review execution',
      endpoint: 'responses',
    });
    requireOpenAiDevSpendGuard({
      action: 'Gustav French LLM official-source review execution',
      estimatedCostUsd: estimatedSelectedCostUsd,
      units: selected.length,
    });

    for (const request of selected) {
      try {
        const decision = await callOpenAi({ apiKey, model: args.model, request });
        const preAppendErrors = validateDecisionBeforeAppend(decision, request);
        if (preAppendErrors.length > 0) {
          preAppendRejectedRows += 1;
          failures.push({
            requestId: request.requestId,
            sourceQueueIndex: request.sourceQueueIndex,
            code: 'llm_decision_rejected_before_append',
            message: preAppendErrors.map((error) => `${error.code}: ${error.message}`).join('; '),
          });
          break;
        }
        const identity = decisionIdentity(decision);
        if (appendIdentities.has(identity)) {
          preAppendRejectedRows += 1;
          failures.push({
            requestId: request.requestId,
            sourceQueueIndex: request.sourceQueueIndex,
            code: 'llm_decision_duplicate_identity_before_append',
            message: `Decision identity ${identity} already exists in the current ledger or live batch.`,
          });
          break;
        }
        appendJsonl(args.out, decision);
        appendIdentities.add(identity);
        executedRows += 1;
      } catch (error) {
        failures.push({
          requestId: request.requestId,
          sourceQueueIndex: request.sourceQueueIndex,
          code: 'llm_call_failed',
          message: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }
  }

  for (const failure of failures) {
    findings.push({
      severity: 'blocker',
      code: failure.code || 'llm_call_failed',
      message: `${failure.requestId}: ${failure.message}`,
    });
  }

  const gateResults = [];
  if (args.validateAfter && args.postGateMode === 'standard' && (executedRows > 0 || !args.execute)) {
    gateResults.push(runGateScript(path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_batch_plan.mjs')));
    gateResults.push(runGateScript(path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_decision_progress_gate.mjs')));
    gateResults.push(runGateScript(path.join(ROOT, 'scripts', 'gustav_build_fr_lesson_llm_review_partial_quarantine_gate.mjs')));
    gateResults.push(runGateScript(path.join(ROOT, 'scripts', 'gustav_validate_fr_lesson_llm_review_decisions.mjs')));
    gateResults.push(runGateScript(path.join(ROOT, 'scripts', 'gustav_fr_lesson_review_decision_import_dry_run.mjs')));
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status = blockers > 0 ? 'BLOCK' : args.execute && executedRows > 0 ? 'HOLD_EXECUTED_BATCH' : 'HOLD_DRY_RUN';
  const decisionsAfter = parseJsonl(args.out);
  const report = {
    schemaVersion: 'gustav-fr-lesson-llm-review-execution-audit-v1',
    generatedAt,
    status,
    activationApproved: false,
    command: {
      argv: process.argv.slice(2),
      cwd: ROOT,
      nodeVersion: process.version,
    },
    inputs: {
      requestsJsonl: rel(args.requestsJsonl),
      requestsAudit: rel(args.requestsAudit),
      decisionsJsonl: rel(args.out),
    },
    hashes: {
      requestsJsonlSha256: sha256(args.requestsJsonl),
      requestsAuditSha256: sha256(args.requestsAudit),
      decisionsJsonlSha256: sha256(args.out),
    },
    summary: {
      mode: args.execute ? 'execute' : 'dry-run',
      apiKeyPresent: Boolean(apiKey),
      spendGuardOpen,
      model: args.model,
      startIndex: args.startIndex,
      limit: args.limit,
      requestRows: requests.length,
      requiredTotalRows: args.requiredTotalRows,
      existingDecisionRows: existingDecisions.length,
      existingDecisionLedgerValid: existingLedgerValidation.valid,
      existingDecisionLedgerErrors: existingLedgerValidation.errors.length,
      existingDecisionLedgerUniqueIdentities: existingLedgerValidation.uniqueIdentities,
      decisionRowsAfterRun: decisionsAfter.length,
      pendingRows: pending.length,
      selectedRows: selected.length,
      maxRowsPerLiveLaunch: MAX_ROWS_PER_LIVE_LAUNCH,
      maxCostPerLiveLaunchUsd: MAX_COST_PER_LIVE_LAUNCH_USD,
      selectedRowsWithinLiveLimit,
      selectedCostWithinLiveLimit,
      validateAfterRequiredForLive: true,
      validateAfterPresent: args.validateAfter,
      postGateMode: args.postGateMode,
      executedRows,
      preAppendRejectedRows,
      failedRows: failures.length,
      estimatedSelectedCostUsd,
      readyForSchemaGateRerun: executedRows > 0 || decisionsAfter.length > 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    safety: {
      dryRunDefault: true,
      requiresExecuteFlagForLlmCalls: true,
      requiresOpenAiApiKeyForLlmCalls: true,
      requiresSpendGuardForLlmCalls: true,
      requiresValidateAfterForLiveExecution: true,
      enforcesMaxRowsPerLiveLaunch: true,
      enforcesMaxCostPerLiveLaunch: true,
      reviewerDecisionsWrittenOnlyWhenExecute: true,
      reviewerDecisionsPreAppendValidated: true,
      existingReviewerDecisionLedgerValidatedBeforeAppend: true,
      supportsSeparateRequestAndDecisionLedgers: true,
      validateAfterRunsProgressAndPartialQuarantineGates: args.postGateMode === 'standard',
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
    gateResults,
    failures,
    existingLedgerValidation,
    findings,
    nextRequiredGates: [
      'execute_llm_official_source_review_requests',
      'llm_review_decision_schema_gate',
      'review_decision_import_dry_run_gate',
      'regenerate_or_reject_non_accepted_rows_gate',
      'audio_manifest_gate',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'admin_parity_gate',
      'storage_cloud_isolation_gate',
      'rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };

  writeJson(args.executionAudit, report);
  fs.writeFileSync(args.executionMarkdown, renderMarkdown(report), 'utf8');

  console.log(`Gustav French lesson LLM review execution: ${status}`);
  console.log(`Mode: ${report.summary.mode}`);
  console.log(`API key present: ${report.summary.apiKeyPresent ? 'yes' : 'no'}`);
  console.log(`Selected rows: ${report.summary.selectedRows}`);
  console.log(`Executed rows: ${report.summary.executedRows}`);
  console.log(`Decision rows after run: ${report.summary.decisionRowsAfterRun}/${args.requiredTotalRows}`);
  console.log(`Estimated selected cost: $${report.summary.estimatedSelectedCostUsd}`);
  console.log(`Ready for apply: no`);
  console.log(rel(args.executionAudit));

  if (blockers > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
