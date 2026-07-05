import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const REQUESTS_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_audit_v1.json');
const DECISIONS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const SCHEMA_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_schema_gate_audit_v1.json');
const IMPORT_DRY_RUN_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_decision_import_dry_run_audit_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_import_source_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_import_source_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;
const CANONICAL_REL = 'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decisions_v1.jsonl';

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
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

function isCanonicalDecisionPath(filePath) {
  return rel(path.resolve(filePath)) === CANONICAL_REL;
}

function sourceProbe(id, candidateRelPath, expectedAccept, reason) {
  const candidate = path.resolve(ROOT, candidateRelPath);
  const accepted = isCanonicalDecisionPath(candidate);
  return {
    id,
    candidatePath: candidateRelPath.replace(/\\/g, '/'),
    expectedAccept,
    accepted,
    passed: accepted === expectedAccept,
    reason,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav French Lesson Decision Import Source Gate',
    '',
    `Status: \`${report.status}\``,
    '',
    `Canonical source exists: ${report.summary.canonicalDecisionSourceExists ? 'yes' : 'no'}`,
    `Import source accepted: ${report.summary.importSourceAccepted ? 'yes' : 'no'}`,
    `Import execution allowed: ${report.summary.importExecutionAllowed ? 'yes' : 'no'}`,
    '',
    '## Policy',
    '',
    `- Canonical decision source: \`${report.policy.canonicalDecisionSource}\``,
    '- External files must be copied/staged into the canonical reviewer path and pass the schema gate before any import dry-run may treat them as source.',
    '- App bundle, server payloads, Firebase exports, Downloads and wrong-target folders are never import sources.',
    '',
    '## Probes',
    '',
    ...report.probes.map((probe) => `- ${probe.passed ? 'PASS' : 'FAIL'}: \`${probe.id}\` -> \`${probe.candidatePath}\``),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH);
  const requestsAudit = readJson(REQUESTS_AUDIT_PATH);
  const schemaGate = readJson(SCHEMA_GATE_AUDIT_PATH);
  const importDryRun = readJson(IMPORT_DRY_RUN_AUDIT_PATH);

  const canonicalDecisionSourceExists = fs.existsSync(DECISIONS_JSONL_PATH);
  const requestAuditReady = requestsAudit.readyForLlmOfficialSourceExecution === true;
  const schemaGateReady = schemaGate.summary?.readyForDecisionImportDryRun === true;
  const importDryRunReady = importDryRun.summary?.wouldImportReviewedStatuses === true;
  const allRowsAccepted = importDryRun.summary?.allRowsAccepted === true;
  const importSourceAccepted =
    canonicalDecisionSourceExists &&
    isCanonicalDecisionPath(DECISIONS_JSONL_PATH) &&
    requests.length === EXPECTED_ROWS &&
    decisions.length === EXPECTED_ROWS &&
    requestAuditReady &&
    schemaGateReady;

  const probes = [
    sourceProbe('canonical_fr_reviewer_decisions_source_allowed', CANONICAL_REL, true, 'Only the canonical French reviewer decisions JSONL may become the import source.'),
    sourceProbe('downloads_decision_file_rejected', 'C:/Users/badlo/Downloads/fr_lesson_llm_review_decisions_v1.jsonl', false, 'Downloads files are not trusted import sources.'),
    sourceProbe('app_bundle_decision_file_rejected', 'app/fr_lesson_llm_review_decisions_v1.jsonl', false, 'App bundle files are not reviewer import sources.'),
    sourceProbe('english_target_decision_file_rejected', 'docs/gustav/generated/en/reviewer/fr_lesson_llm_review_decisions_v1.jsonl', false, 'Wrong studyTarget folders are rejected.'),
    sourceProbe('server_payload_decision_file_rejected', 'docs/gustav/generated/fr/server/fr_lesson_llm_review_decisions_v1.jsonl', false, 'Server payload areas cannot feed reviewer import.'),
    sourceProbe('temp_candidate_without_canonical_stage_rejected', '.codex-tmp/gustav/fr/reviewer/fr_lesson_llm_review_decisions_v1.jsonl', false, 'Temp candidates must be staged into the canonical path and schema-validated first.'),
  ];

  const structuralBlockers = [];
  if (!probes.every((probe) => probe.passed)) structuralBlockers.push('IMPORT_SOURCE_PATH_PROBES_FAILED');
  if (requests.length !== EXPECTED_ROWS) structuralBlockers.push('REQUEST_ROWS_NOT_1600');
  if (!requestAuditReady) structuralBlockers.push('REQUEST_AUDIT_NOT_READY');

  const productionBlockers = [];
  if (!canonicalDecisionSourceExists) productionBlockers.push('CANONICAL_DECISION_SOURCE_MISSING');
  if (decisions.length !== EXPECTED_ROWS) productionBlockers.push('DECISION_ROWS_NOT_1600');
  if (!schemaGateReady) productionBlockers.push('SCHEMA_GATE_NOT_READY');
  if (!importDryRunReady) productionBlockers.push('IMPORT_DRY_RUN_NOT_READY');
  if (!allRowsAccepted) productionBlockers.push('ALL_ROWS_ACCEPTED_NOT_PROVEN');
  if (!importSourceAccepted) productionBlockers.push('IMPORT_SOURCE_NOT_ACCEPTED');

  const report = {
    schemaVersion: 'gustav-fr-lesson-decision-import-source-gate-audit-v1',
    generatedAt,
    status: structuralBlockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      requestsAudit: rel(REQUESTS_AUDIT_PATH),
      canonicalDecisionsJsonl: rel(DECISIONS_JSONL_PATH),
      schemaGateAudit: rel(SCHEMA_GATE_AUDIT_PATH),
      importDryRunAudit: rel(IMPORT_DRY_RUN_AUDIT_PATH),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      requestsAuditSha256: sha256(REQUESTS_AUDIT_PATH),
      canonicalDecisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
      schemaGateAuditSha256: sha256(SCHEMA_GATE_AUDIT_PATH),
      importDryRunAuditSha256: sha256(IMPORT_DRY_RUN_AUDIT_PATH),
    },
    policy: {
      canonicalDecisionSource: CANONICAL_REL,
      acceptedSourceRule: 'Only docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decisions_v1.jsonl may feed reviewer import, and only after schema gate PASS for 1600 rows.',
      rejectedSourceExamples: [
        'Downloads',
        'app bundle',
        'server payload directories',
        'wrong studyTarget directories',
        'temp candidates not staged to canonical path',
      ],
      externalDecisionImportRule: 'External decisions must be staged to the canonical French reviewer path, then schema/import gates must be rerun. This gate never imports directly from arbitrary external paths.',
    },
    summary: {
      requestRows: requests.length,
      requestAuditReady,
      canonicalDecisionSourceExists,
      canonicalDecisionSourcePath: CANONICAL_REL,
      decisionRows: decisions.length,
      schemaGateReady,
      importDryRunReady,
      allRowsAccepted,
      importSourceAccepted,
      importExecutionAllowed: false,
      acceptedLedgerMaterializationAllowed: false,
      readyForAudioManifestGate: false,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      structuralBlockers: structuralBlockers.length,
      productionBlockers: productionBlockers.length,
      probesPassed: probes.filter((probe) => probe.passed).length,
      probes: probes.length,
    },
    probes,
    structuralBlockers,
    productionBlockers,
    safety: {
      readOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      acceptedLedgersMaterializedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    },
    nextRequiredGates: [
      'execute_or_import_llm_official_source_review_decisions_to_canonical_path',
      'llm_review_decision_schema_gate',
      'decision_import_source_gate',
      'review_decision_import_dry_run_gate',
      'audio_manifest_gate',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'explicit_activation_approval_gate',
    ],
  };

  writeJson(OUT_AUDIT_PATH, report);
  fs.writeFileSync(OUT_MD_PATH, renderMarkdown(report), 'utf8');

  console.log(`Gustav French lesson decision import source gate: ${report.status}`);
  console.log(`Canonical source exists: ${canonicalDecisionSourceExists ? 'yes' : 'no'}`);
  console.log(`Decision rows: ${decisions.length}/${EXPECTED_ROWS}`);
  console.log(`Import source accepted: ${importSourceAccepted ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
