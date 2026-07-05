import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const REQUESTS_MANIFEST_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_manifest_v1.json');
const REQUESTS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_audit_v1.json');
const EXECUTION_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_audit_v1.json');
const DECISIONS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const SCHEMA_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_schema_gate_audit_v1.json');
const IMPORT_DRY_RUN_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_readiness_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_execution_readiness_gate_audit_v1.md');

const REQUIRED_TOTAL_ROWS = 1600;

function parseArgs(argv) {
  const args = {
    allowLive: false,
  };
  for (const arg of argv) {
    if (arg === '--allow-live') args.allowLive = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
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

function parseJsonlIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
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

function addBlocker(blockers, id, message) {
  blockers.push({ id, message });
}

function countReasoningLevels(requests) {
  return requests.reduce((acc, request) => {
    const level = request.instructions?.reasoningLevel || request.reasoningLevel || 'missing';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});
}

function buildMarkdown(report) {
  const lines = [
    '# Gustav French Lesson LLM Review Execution Readiness Gate',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Request rows: ${report.summary.requestRows}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Missing decision rows: ${report.summary.missingDecisionRows}`,
    `- High reasoning requests: ${report.summary.reasoningLevels.high || 0}`,
    `- Deep reasoning requests: ${report.summary.reasoningLevels.deep || 0}`,
    `- API key present: ${report.summary.liveCredentialState.openaiApiKeyPresent ? 'yes' : 'no'}`,
    `- Spend guard open: ${report.summary.liveCredentialState.spendGuardOpen ? 'yes' : 'no'}`,
    `- Codex session active: ${report.summary.liveExecutionEnvironment.codexSessionActive ? 'yes' : 'no'}`,
    `- Current process may call OpenAI Responses: ${report.summary.liveExecutionEnvironment.currentProcessMayCallOpenAiResponses ? 'yes' : 'no'}`,
    `- External terminal execution required: ${report.summary.liveExecutionEnvironment.externalTerminalExecutionRequired ? 'yes' : 'no'}`,
    `- Live execution explicitly requested: ${report.summary.liveExecutionExplicitlyRequested ? 'yes' : 'no'}`,
    `- Can execute live batch now: ${report.summary.canExecuteLiveBatchNow ? 'yes' : 'no'}`,
    `- Can import decisions now: ${report.summary.canImportDecisionsNow ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Blockers',
    '',
  ];
  if (report.productionBlockers.length === 0) lines.push('- None.');
  else for (const blocker of report.productionBlockers) lines.push(`- \`${blocker.id}\`: ${blocker.message}`);
  lines.push('', '## Safety', '');
  lines.push('- This gate does not call OpenAI.');
  lines.push('- This gate does not write reviewer decisions.');
  lines.push('- This gate does not import decisions, upload packs, enable runtime downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH);
  const requestsManifest = readJsonIfPresent(REQUESTS_MANIFEST_PATH);
  const requestsAudit = readJsonIfPresent(REQUESTS_AUDIT_PATH);
  const executionAudit = readJsonIfPresent(EXECUTION_AUDIT_PATH);
  const schemaGateAudit = readJsonIfPresent(SCHEMA_GATE_AUDIT_PATH);
  const importDryRunAudit = readJsonIfPresent(IMPORT_DRY_RUN_AUDIT_PATH);

  const liveCredentialState = {
    openaiApiKeyPresent: Boolean(readEnvValue('OPENAI_API_KEY')),
    spendGuardOpen: process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND === '1',
  };
  const liveExecutionEnvironment = {
    codexSessionActive: Boolean(process.env.CODEX_THREAD_ID),
    responsesApiAllowedInCurrentProcess: !process.env.CODEX_THREAD_ID,
    currentProcessMayCallOpenAiResponses: !process.env.CODEX_THREAD_ID,
    externalTerminalExecutionRequired: Boolean(process.env.CODEX_THREAD_ID),
    codexAllowedOpenAiEndpoint: process.env.CODEX_THREAD_ID ? 'audio/speech only' : 'not_restricted_by_codex_firewall',
  };

  const reasoningLevels = countReasoningLevels(requests);
  const productionBlockers = [];
  const decisionsFilePresent = fs.existsSync(DECISIONS_JSONL_PATH);
  const requestAuditReady = requestsAudit?.readyForLlmOfficialSourceExecution === true;
  const requestCountReady = requests.length === REQUIRED_TOTAL_ROWS;
  const schemaGateReady = schemaGateAudit?.summary?.readyForDecisionImportDryRun === true;
  const importDryRunReady = importDryRunAudit?.summary?.readyForAudioManifestGate === true;
  const decisionsComplete = decisions.length === REQUIRED_TOTAL_ROWS;

  if (!requestCountReady) addBlocker(productionBlockers, 'REQUEST_COUNT_NOT_1600', `Expected ${REQUIRED_TOTAL_ROWS} review requests, found ${requests.length}.`);
  if (!requestAuditReady) addBlocker(productionBlockers, 'REQUEST_AUDIT_NOT_READY', 'Review request audit is not ready for LLM official-source execution.');
  if (!liveCredentialState.openaiApiKeyPresent) addBlocker(productionBlockers, 'OPENAI_API_KEY_MISSING', 'OPENAI_API_KEY is not present in the current environment.');
  if (!liveCredentialState.spendGuardOpen) addBlocker(productionBlockers, 'PHRASEMAN_ALLOW_OPENAI_DEV_SPEND_NOT_SET', 'PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 is not set, so paid LLM review cannot run.');
  if (!liveExecutionEnvironment.responsesApiAllowedInCurrentProcess) {
    addBlocker(
      productionBlockers,
      'CODEX_RESPONSES_API_FIREWALL_ACTIVE',
      'This Codex session may not call OpenAI /v1/responses. Execute the review batch from a normal project terminal, then let Codex validate the resulting decisions JSONL.',
    );
  }
  if (!decisionsFilePresent) addBlocker(productionBlockers, 'DECISIONS_FILE_MISSING', 'fr_lesson_llm_review_decisions_v1.jsonl does not exist.');
  if (decisionsFilePresent && !decisionsComplete) addBlocker(productionBlockers, 'DECISIONS_FILE_INCOMPLETE', `Expected ${REQUIRED_TOTAL_ROWS} decisions, found ${decisions.length}.`);
  if (!schemaGateReady) addBlocker(productionBlockers, 'SCHEMA_GATE_NOT_READY', 'LLM decision schema gate is not PASS.');
  if (!importDryRunReady) addBlocker(productionBlockers, 'IMPORT_DRY_RUN_NOT_READY', 'Reviewer decision import dry-run is not ready for audio/server/runtime gates.');

  const canExecuteLiveBatchNow = args.allowLive
    && requestCountReady
    && requestAuditReady
    && liveCredentialState.openaiApiKeyPresent
    && liveCredentialState.spendGuardOpen
    && liveExecutionEnvironment.responsesApiAllowedInCurrentProcess
    && decisions.length < REQUIRED_TOTAL_ROWS;

  const canImportDecisionsNow = decisionsComplete && schemaGateReady;

  const report = {
    schemaVersion: 'gustav-fr-lesson-llm-review-execution-readiness-gate-audit-v1',
    generatedAt,
    status: canImportDecisionsNow ? 'PASS_READY_FOR_IMPORT_DRY_RUN' : 'HOLD',
    activationApproved: false,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    aiOutputLang: 'fr',
    reasoningLevelRequired: 'maximum_extended_reasoning',
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      requestsManifest: rel(REQUESTS_MANIFEST_PATH),
      requestsAudit: rel(REQUESTS_AUDIT_PATH),
      executionAudit: rel(EXECUTION_AUDIT_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
      schemaGateAudit: rel(SCHEMA_GATE_AUDIT_PATH),
      importDryRunAudit: rel(IMPORT_DRY_RUN_AUDIT_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      requestsManifestSha256: sha256(REQUESTS_MANIFEST_PATH),
      requestsAuditSha256: sha256(REQUESTS_AUDIT_PATH),
      executionAuditSha256: sha256(EXECUTION_AUDIT_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      schemaGateAuditSha256: sha256(SCHEMA_GATE_AUDIT_PATH),
      importDryRunAuditSha256: sha256(IMPORT_DRY_RUN_AUDIT_PATH),
    },
    summary: {
      requestRows: requests.length,
      requestManifestPresent: Boolean(requestsManifest),
      requestAuditReady,
      executionAuditStatus: executionAudit?.status || 'missing',
      decisionsFilePresent,
      decisionRows: decisions.length,
      missingDecisionRows: Math.max(0, REQUIRED_TOTAL_ROWS - decisions.length),
      reasoningLevels,
      liveCredentialState,
      liveExecutionEnvironment,
      liveExecutionExplicitlyRequested: args.allowLive,
      canExecuteLiveBatchNow,
      canImportDecisionsNow,
      schemaGateReady,
      importDryRunReady,
      readyForAudioManifestGate: importDryRunAudit?.summary?.readyForAudioManifestGate === true,
      readyForServerPackManifestGate: importDryRunAudit?.summary?.readyForServerPackManifestGate === true,
      readyForRuntimeDeliveryGate: importDryRunAudit?.summary?.readyForRuntimeDeliveryGate === true,
      readyForApply: false,
      productionBlockers: productionBlockers.length,
    },
    productionBlockers,
    safety: {
      openAiCallsMadeByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      storageCloudMigrationStarted: false,
      productionApplyApproved: false,
    },
    nextAllowedCommands: canExecuteLiveBatchNow
      ? [
        'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --limit 25 --execute --validate-after',
      ]
      : liveExecutionEnvironment.externalTerminalExecutionRequired
        ? [
          'Open a normal project terminal outside Codex at C:\\appsprojects\\phraseman.',
          '$env:OPENAI_API_KEY="<your key>"; $env:PHRASEMAN_ALLOW_OPENAI_DEV_SPEND="1"',
          'node scripts/gustav_execute_fr_lesson_llm_review_batch.mjs --start-index 1264 --limit 25 --execute --validate-after',
          'Return to Codex and run node scripts/gustav_build_fr_lesson_llm_review_execution_readiness_gate.mjs to validate the appended decisions.',
        ]
        : [
          'Provide OPENAI_API_KEY and PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1, then rerun this readiness gate with --allow-live.',
          'Or place a complete externally generated docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decisions_v1.jsonl and rerun schema/import gates.',
        ],
    nextRequiredGates: [
      'execute_or_import_llm_official_source_review_decisions',
      'llm_review_decision_schema_gate',
      'review_decision_import_dry_run_gate',
      'audio_manifest_gate',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'admin_activation_rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };

  writeJson(OUT_AUDIT_PATH, report);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(report), 'utf8');

  console.log(`Gustav French lesson LLM review execution readiness: ${report.status}`);
  console.log(`Requests: ${report.summary.requestRows}/${REQUIRED_TOTAL_ROWS}`);
  console.log(`Decisions: ${report.summary.decisionRows}/${REQUIRED_TOTAL_ROWS}`);
  console.log(`API key present: ${report.summary.liveCredentialState.openaiApiKeyPresent ? 'yes' : 'no'}`);
  console.log(`Spend guard open: ${report.summary.liveCredentialState.spendGuardOpen ? 'yes' : 'no'}`);
  console.log(`Can execute live batch now: ${report.summary.canExecuteLiveBatchNow ? 'yes' : 'no'}`);
  console.log(`Can import decisions now: ${report.summary.canImportDecisionsNow ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
