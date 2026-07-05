import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireCodexOpenAiTtsOnly, requireOpenAiDevSpendGuard } from './openai-dev-guard.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const REQUESTS_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_requests_v1.jsonl');
const REQUESTS_AUDIT_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_requests_audit_v1.json');
const DECISIONS_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_decisions_v1.jsonl');
const EXECUTION_AUDIT_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_execution_audit_v1.json');
const EXECUTION_MD_PATH = path.join(OUT_DIR, 'fr_personal_practice_native_bank_review_execution_audit_v1.md');

const REQUIRED_ROWS = 56;
const DEFAULT_MODEL = 'gpt-5-mini';
const MAX_ROWS_PER_LIVE_LAUNCH = 25;
const ESTIMATED_COST_PER_ROW_USD = 0.0025;
const MAX_COST_PER_LIVE_LAUNCH_USD = 0.0625;
const ALLOWED_DECISIONS = new Set(['accept_quality_gates', 'needs_regeneration', 'needs_llm_regeneration_review', 'reject_candidate', 'skip_for_later']);
const NON_ACCEPT_DECISIONS = new Set(['needs_regeneration', 'needs_llm_regeneration_review', 'reject_candidate', 'skip_for_later']);
const ALLOWED_GATE_DECISIONS = new Set(['pass', 'fail', 'needs_source_check']);

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function parseArgs(argv) {
  const args = {
    execute: false,
    validateAfter: false,
    model: process.env.GUSTAV_LLM_REVIEW_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
    startIndex: 1,
    limit: 0,
    out: DECISIONS_PATH,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--execute') args.execute = true;
    else if (arg === '--validate-after') args.validateAfter = true;
    else if (arg === '--model') args.model = argv[++i] || args.model;
    else if (arg === '--start-index') args.startIndex = Number(argv[++i] || 1);
    else if (arg === '--limit') args.limit = Number(argv[++i] || 0);
    else if (arg === '--out') args.out = path.resolve(ROOT, argv[++i] || DECISIONS_PATH);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(args.startIndex) || args.startIndex < 1) throw new Error('--start-index must be a positive integer');
  if (!Number.isInteger(args.limit) || args.limit < 0) throw new Error('--limit must be a non-negative integer');
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
    const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((candidate) => candidate.trim().startsWith(`${name}=`));
    if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
  }
  return '';
}

function parseJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [];
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function rowIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.frenchTrainingId}`;
}

function sameKeySet(object, keys) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return false;
  return JSON.stringify(Object.keys(object).sort()) === JSON.stringify([...keys].sort());
}

function hasCorrectionPayload(row) {
  return Boolean(
    String(row.correctedFrenchSkillName || '').trim() ||
    String(row.correctedContrastSet || '').trim() ||
    (Array.isArray(row.correctedMistakeTaxonomyIds) && row.correctedMistakeTaxonomyIds.length > 0),
  );
}

function validateDecision(decision, request) {
  const errors = [];
  const fail = (code, message) => errors.push({ code, message });
  const expectedKeys = Object.keys(request.blankResponseTemplate);
  const expectedGates = Object.keys(request.blankResponseTemplate.gateReviewerDecisions);
  if (!sameKeySet(decision, expectedKeys)) fail('decision_key_set_invalid', 'Decision keys must exactly match blankResponseTemplate.');
  for (const key of ['schemaVersion', 'requestId', 'reviewScope', 'sourceQueueIndex', 'frenchTrainingId', 'studyTarget']) {
    if (decision[key] !== request.blankResponseTemplate[key]) fail('decision_identity_mismatch', `${key} does not match request.`);
  }
  if (JSON.stringify(decision.sourceLocaleCoverage) !== JSON.stringify(['ru', 'uk'])) fail('source_locale_coverage_invalid', 'sourceLocaleCoverage must be ru,uk.');
  if (decision.reviewerName !== 'llm_official_source_judge') fail('reviewer_name_invalid', 'reviewerName must be llm_official_source_judge.');
  if (!String(decision.reviewedAt || '').trim()) fail('reviewed_at_missing', 'reviewedAt is required.');
  if (!String(decision.reviewerNotes || '').trim()) fail('reviewer_notes_missing', 'reviewerNotes is required.');
  if (!ALLOWED_DECISIONS.has(decision.reviewerDecision)) fail('reviewer_decision_invalid', 'reviewerDecision is invalid.');
  if (!sameKeySet(decision.gateReviewerDecisions, expectedGates)) fail('gate_decision_key_set_invalid', 'Gate decision keys mismatch.');
  if (!sameKeySet(decision.gateEvidenceNotes, expectedGates)) fail('gate_evidence_key_set_invalid', 'Gate evidence keys mismatch.');
  const gateValues = expectedGates.map((gateId) => decision.gateReviewerDecisions?.[gateId]);
  for (const gateId of expectedGates) {
    if (!ALLOWED_GATE_DECISIONS.has(decision.gateReviewerDecisions?.[gateId])) fail('gate_decision_invalid', `${gateId} is invalid.`);
    if (!String(decision.gateEvidenceNotes?.[gateId] || '').trim()) fail('gate_evidence_note_missing', `${gateId} needs evidence.`);
  }
  if (decision.reviewerImportAllowed || decision.productionApplyAllowed || decision.activationApproved) {
    fail('decision_opened_import_apply_or_activation', 'Import/apply/activation must remain false.');
  }
  const correctionPayload = hasCorrectionPayload(decision);
  if (decision.reviewerDecision === 'accept_quality_gates') {
    if (!gateValues.every((value) => value === 'pass')) fail('accept_with_non_pass_gate', 'Accept requires all gates pass.');
    if (correctionPayload) fail('accept_with_correction_payload', 'Accept cannot include corrections.');
  }
  if (NON_ACCEPT_DECISIONS.has(decision.reviewerDecision) && gateValues.every((value) => value === 'pass')) {
    fail('non_accept_with_all_gates_passed', 'Non-accept requires at least one non-pass gate.');
  }
  if (decision.reviewerDecision === 'needs_llm_regeneration_review' && !correctionPayload) {
    fail('needs_review_without_correction_payload', 'needs_llm_regeneration_review requires correction payload.');
  }
  if (decision.reviewerDecision !== 'needs_llm_regeneration_review' && correctionPayload) {
    fail('correction_payload_for_wrong_decision', 'Correction payload allowed only for needs_llm_regeneration_review.');
  }
  return errors;
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const text = data.output?.flatMap((item) => item.content || []).map((content) => content.text || '').join('\n').trim();
  if (text) return text;
  throw new Error('OpenAI response did not include output text');
}

async function callOpenAi({ apiKey, model, request }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      instructions: [request.instructions.role, request.instructions.task, ...request.instructions.hardRules].join('\n'),
      input: JSON.stringify(request, null, 2),
      text: {
        format: {
          type: 'json_schema',
          name: 'gustav_fr_personal_practice_native_bank_review_decision',
          strict: true,
          schema: request.outputJsonSchema,
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI responses API returned ${response.status}: ${await response.text()}`);
  const text = extractOutputText(await response.json()).replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(text);
}

function renderMarkdown(report) {
  return [
    '# French Personal Practice Native Bank Review Execution',
    '',
    `Status: \`${report.status}\``,
    '',
    `- Mode: ${report.summary.mode}`,
    `- Selected rows: ${report.summary.selectedRows}`,
    `- Executed rows: ${report.summary.executedRows}`,
    `- Decision rows after run: ${report.summary.decisionRowsAfterRun}/${report.summary.requestRows}`,
    `- Ready for apply: no`,
    '',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const apiKey = readEnvValue('OPENAI_API_KEY');
  const spendGuardOpen = process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND === '1';
  const requestAudit = readJson(REQUESTS_AUDIT_PATH);
  const requests = parseJsonl(REQUESTS_PATH);
  const existingDecisions = parseJsonl(args.out);
  const existingIdentities = new Set(existingDecisions.map(rowIdentity));
  const findings = [];

  if (requestAudit.summary?.readyForExternalReview !== true) findings.push({ severity: 'blocker', code: 'request_audit_not_ready', message: 'Review requests audit is not ready.' });
  if (requests.length !== REQUIRED_ROWS) findings.push({ severity: 'blocker', code: 'request_count_invalid', message: `Expected ${REQUIRED_ROWS}, found ${requests.length}.` });
  for (const decision of existingDecisions) {
    const request = requests.find((item) => rowIdentity(item) === rowIdentity(decision));
    if (!request) findings.push({ severity: 'blocker', code: 'existing_decision_unknown_identity', message: `${rowIdentity(decision)} has no request.` });
    else for (const error of validateDecision(decision, request)) findings.push({ severity: 'blocker', code: `existing_${error.code}`, message: error.message });
  }

  const pending = requests.filter((request) => !existingIdentities.has(rowIdentity(request)));
  const selected = pending.filter((request) => request.sourceQueueIndex >= args.startIndex).slice(0, args.limit || 0);
  const estimatedSelectedCostUsd = Number((selected.length * ESTIMATED_COST_PER_ROW_USD).toFixed(4));
  if (!args.execute) findings.push({ severity: 'info', code: 'dry_run_only', message: 'No LLM calls were made.' });
  if (args.execute && !apiKey) findings.push({ severity: 'blocker', code: 'openai_api_key_missing', message: 'OPENAI_API_KEY is required.' });
  if (args.execute && !args.validateAfter) findings.push({ severity: 'blocker', code: 'validate_after_required', message: '--validate-after required for live execution.' });
  if (args.execute && selected.length > MAX_ROWS_PER_LIVE_LAUNCH) findings.push({ severity: 'blocker', code: 'row_limit_exceeded', message: `Selected ${selected.length}; max ${MAX_ROWS_PER_LIVE_LAUNCH}.` });
  if (args.execute && estimatedSelectedCostUsd > MAX_COST_PER_LIVE_LAUNCH_USD) findings.push({ severity: 'blocker', code: 'cost_limit_exceeded', message: `Estimated $${estimatedSelectedCostUsd}.` });

  let executedRows = 0;
  let preAppendRejectedRows = 0;
  const appendIdentities = new Set(existingIdentities);
  const failures = [];
  if (args.execute && apiKey && selected.length > 0 && findings.every((finding) => finding.severity !== 'blocker')) {
    requireCodexOpenAiTtsOnly({ action: 'Gustav French personal-practice native-bank LLM review', endpoint: 'responses' });
    requireOpenAiDevSpendGuard({ action: 'Gustav French personal-practice native-bank LLM review', estimatedCostUsd: estimatedSelectedCostUsd, units: selected.length });
    for (const request of selected) {
      try {
        const decision = await callOpenAi({ apiKey, model: args.model, request });
        const errors = validateDecision(decision, request);
        if (errors.length > 0) {
          preAppendRejectedRows += 1;
          failures.push({ requestId: request.requestId, code: 'decision_rejected_before_append', message: errors.map((error) => error.code).join(', ') });
          break;
        }
        if (appendIdentities.has(rowIdentity(decision))) {
          preAppendRejectedRows += 1;
          failures.push({ requestId: request.requestId, code: 'duplicate_decision_before_append', message: rowIdentity(decision) });
          break;
        }
        appendJsonl(args.out, decision);
        appendIdentities.add(rowIdentity(decision));
        executedRows += 1;
      } catch (error) {
        failures.push({ requestId: request.requestId, code: 'llm_call_failed', message: error instanceof Error ? error.message : String(error) });
        break;
      }
    }
  }
  for (const failure of failures) findings.push({ severity: 'blocker', code: failure.code, message: `${failure.requestId}: ${failure.message}` });

  const decisionsAfter = parseJsonl(args.out);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const report = {
    schemaVersion: 'gustav-fr-personal-practice-native-bank-review-execution-audit-v1',
    generatedAt,
    status: blockers > 0 ? 'BLOCK' : args.execute && executedRows > 0 ? 'HOLD_EXECUTED_BATCH' : 'HOLD_DRY_RUN',
    activationApproved: false,
    inputs: {
      requestsJsonl: rel(REQUESTS_PATH),
      requestsAudit: rel(REQUESTS_AUDIT_PATH),
      decisionsJsonl: rel(args.out),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_PATH),
      decisionsJsonlSha256: sha256(args.out),
    },
    summary: {
      mode: args.execute ? 'execute' : 'dry-run',
      apiKeyPresent: Boolean(apiKey),
      spendGuardOpen,
      model: args.model,
      requestRows: requests.length,
      existingDecisionRows: existingDecisions.length,
      decisionRowsAfterRun: decisionsAfter.length,
      pendingRows: pending.length,
      startIndex: args.startIndex,
      limit: args.limit,
      selectedRows: selected.length,
      maxRowsPerLiveLaunch: MAX_ROWS_PER_LIVE_LAUNCH,
      estimatedSelectedCostUsd,
      executedRows,
      preAppendRejectedRows,
      failedRows: failures.length,
      readyForDecisionSchemaGate: executedRows > 0 || decisionsAfter.length > 0,
      readyForApply: false,
    },
    safety: {
      dryRunDefault: true,
      requiresExecuteFlagForLlmCalls: true,
      requiresOpenAiApiKeyForLlmCalls: true,
      requiresSpendGuardForLlmCalls: true,
      reviewerDecisionsPreAppendValidated: true,
      reviewerDecisionsImportedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
    failures,
    findings,
  };
  writeJson(EXECUTION_AUDIT_PATH, report);
  fs.writeFileSync(EXECUTION_MD_PATH, `${renderMarkdown(report)}\n`, 'utf8');
  console.log(`Gustav French personal-practice native-bank review execution: ${report.status}`);
  console.log(`Selected rows: ${selected.length}`);
  console.log(`Executed rows: ${executedRows}`);
  console.log(`Decision rows after run: ${decisionsAfter.length}/${requests.length}`);
  console.log(rel(EXECUTION_AUDIT_PATH));
  if (blockers > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});
