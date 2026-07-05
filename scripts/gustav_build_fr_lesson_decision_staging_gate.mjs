import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const REQUESTS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_requests_v1.jsonl');
const CANONICAL_DECISIONS_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const SCHEMA_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decision_schema_gate_audit_v1.json');
const IMPORT_SOURCE_GATE_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_import_source_gate_audit_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_staging_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_decision_staging_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;
const CANONICAL_REL = 'docs/gustav/generated/fr/reviewer/fr_lesson_llm_review_decisions_v1.jsonl';

function parseArgs(argv) {
  const args = { candidate: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--candidate') args.candidate = argv[++i] || '';
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function rel(filePath) {
  if (!filePath) return '';
  const resolved = path.resolve(filePath);
  const relative = path.relative(ROOT, resolved).replace(/\\/g, '/');
  return relative.startsWith('..') ? resolved.replace(/\\/g, '/') : relative;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJsonlIfPresent(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function sha256(filePath) {
  return filePath && fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function requestIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function decisionIdentity(row) {
  return `${row.requestId}:${row.sourceQueueIndex}:${row.lessonId}:${row.phraseId}`;
}

function classifyPath(filePath) {
  const normalized = rel(filePath).toLowerCase();
  if (!normalized) return 'missing';
  if (normalized === CANONICAL_REL.toLowerCase()) return 'canonical_reviewer_path';
  if (normalized.includes('/app/') || normalized.startsWith('app/')) return 'app_bundle';
  if (normalized.includes('/server/') || normalized.includes('course-packs/')) return 'server_payload';
  if (normalized.includes('/generated/en/') || normalized.includes('\\generated\\en\\')) return 'wrong_study_target';
  if (normalized.includes('/downloads/') || normalized.includes('\\downloads\\')) return 'downloads';
  if (normalized.includes('/.codex-tmp/') || normalized.startsWith('.codex-tmp/')) return 'temp_candidate';
  return 'external_candidate';
}

function inspectDecisionRows(decisions, requests) {
  const requestKeys = new Set(requests.map(requestIdentity));
  const seen = new Set();
  let duplicateRows = 0;
  let unknownIdentityRows = 0;
  let openedProductionRows = 0;
  let wrongTargetRows = 0;
  let acceptedRows = 0;
  for (const row of decisions) {
    const identity = decisionIdentity(row);
    if (seen.has(identity)) duplicateRows += 1;
    seen.add(identity);
    if (!requestKeys.has(identity)) unknownIdentityRows += 1;
    if (row.studyTarget !== 'fr') wrongTargetRows += 1;
    if (row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved) openedProductionRows += 1;
    if (row.reviewerDecision === 'accept_quality_gates') acceptedRows += 1;
  }
  const missingRows = Math.max(0, EXPECTED_ROWS - seen.size);
  return {
    decisionRows: decisions.length,
    uniqueDecisionIdentities: seen.size,
    duplicateRows,
    unknownIdentityRows,
    missingRows,
    wrongTargetRows,
    openedProductionRows,
    acceptedRows,
    structurallyMatchesRequestSet:
      decisions.length === EXPECTED_ROWS &&
      seen.size === EXPECTED_ROWS &&
      duplicateRows === 0 &&
      unknownIdentityRows === 0 &&
      missingRows === 0 &&
      wrongTargetRows === 0 &&
      openedProductionRows === 0,
  };
}

function renderMarkdown(report) {
  return [
    '# Gustav French Lesson Decision Staging Gate',
    '',
    `Status: \`${report.status}\``,
    '',
    `Candidate provided: ${report.summary.candidateProvided ? 'yes' : 'no'}`,
    `Candidate ready for canonical staging: ${report.summary.candidateReadyForCanonicalStaging ? 'yes' : 'no'}`,
    `Canonical source already ready: ${report.summary.canonicalSourceAlreadyReady ? 'yes' : 'no'}`,
    `Ready for canonical decision source: ${report.summary.readyForCanonicalDecisionSource ? 'yes' : 'no'}`,
    '',
    '## Safety',
    '',
    '- Dry-run only.',
    '- Does not copy candidate files.',
    '- Does not import decisions.',
    '- Does not enable runtime/server/apply/activation.',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const candidatePath = args.candidate ? path.resolve(ROOT, args.candidate) : '';
  const requests = parseJsonlIfPresent(REQUESTS_JSONL_PATH);
  const candidateRows = parseJsonlIfPresent(candidatePath);
  const schemaGate = readJson(SCHEMA_GATE_AUDIT_PATH);
  const importSourceGate = readJson(IMPORT_SOURCE_GATE_AUDIT_PATH);
  const canonicalSourceAlreadyReady =
    schemaGate.summary?.readyForDecisionImportDryRun === true &&
    importSourceGate.summary?.importSourceAccepted === true;
  const candidateInspection = inspectDecisionRows(candidateRows, requests);
  const candidateProvided = Boolean(candidatePath);
  const candidateExists = candidateProvided && fs.existsSync(candidatePath);
  const candidatePathClass = classifyPath(candidatePath);
  const candidateReadyForCanonicalStaging =
    candidateProvided &&
    candidateExists &&
    candidateInspection.structurallyMatchesRequestSet &&
    candidatePathClass !== 'app_bundle' &&
    candidatePathClass !== 'server_payload' &&
    candidatePathClass !== 'wrong_study_target' &&
    rel(candidatePath) !== CANONICAL_REL;
  const readyForCanonicalDecisionSource = canonicalSourceAlreadyReady || candidateReadyForCanonicalStaging;

  const productionBlockers = [];
  if (!canonicalSourceAlreadyReady && !candidateProvided) productionBlockers.push('NO_CANDIDATE_AND_CANONICAL_SOURCE_NOT_READY');
  if (candidateProvided && !candidateExists) productionBlockers.push('CANDIDATE_FILE_MISSING');
  if (candidateProvided && !candidateInspection.structurallyMatchesRequestSet) productionBlockers.push('CANDIDATE_DOES_NOT_MATCH_1600_REQUEST_IDENTITIES');
  if (candidateProvided && ['app_bundle', 'server_payload', 'wrong_study_target'].includes(candidatePathClass)) productionBlockers.push('CANDIDATE_PATH_CLASS_FORBIDDEN');
  if (!readyForCanonicalDecisionSource) productionBlockers.push('READY_FOR_CANONICAL_DECISION_SOURCE_FALSE');

  const report = {
    schemaVersion: 'gustav-fr-lesson-decision-staging-gate-audit-v1',
    generatedAt,
    status: 'HOLD',
    activationApproved: false,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    targetContentLang: 'fr',
    inputs: {
      requestsJsonl: rel(REQUESTS_JSONL_PATH),
      canonicalDecisionsJsonl: rel(CANONICAL_DECISIONS_PATH),
      schemaGateAudit: rel(SCHEMA_GATE_AUDIT_PATH),
      importSourceGateAudit: rel(IMPORT_SOURCE_GATE_AUDIT_PATH),
      candidate: rel(candidatePath),
    },
    hashes: {
      requestsJsonlSha256: sha256(REQUESTS_JSONL_PATH),
      canonicalDecisionsJsonlSha256: sha256(CANONICAL_DECISIONS_PATH),
      schemaGateAuditSha256: sha256(SCHEMA_GATE_AUDIT_PATH),
      importSourceGateAuditSha256: sha256(IMPORT_SOURCE_GATE_AUDIT_PATH),
      candidateSha256: sha256(candidatePath),
    },
    policy: {
      dryRunOnly: true,
      canonicalDecisionSource: CANONICAL_REL,
      candidateRule: 'A candidate may be inspected, but this gate never copies it. Canonical staging is allowed only after 1600 request identities match and production flags stay closed.',
      forbiddenCandidatePathClasses: ['app_bundle', 'server_payload', 'wrong_study_target'],
    },
    summary: {
      requestRows: requests.length,
      candidateProvided,
      candidateExists,
      candidatePath: rel(candidatePath),
      candidatePathClass,
      canonicalSourceAlreadyReady,
      candidateReadyForCanonicalStaging,
      readyForCanonicalDecisionSource,
      canonicalWritePerformedByThisScript: false,
      importPerformedByThisScript: false,
      productionBlockers: productionBlockers.length,
      ...candidateInspection,
      readyForApply: false,
    },
    productionBlockers,
    safety: {
      readOnly: true,
      candidateCopiedToCanonicalByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      appBundleModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApprovedWrittenByThisScript: false,
    },
    nextRequiredGates: [
      'stage_or_generate_canonical_decision_ledger',
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
  fs.writeFileSync(OUT_MD_PATH, `${renderMarkdown(report)}\n`, 'utf8');
  console.log(`Gustav French lesson decision staging gate: ${report.status}`);
  console.log(`Candidate provided: ${candidateProvided ? 'yes' : 'no'}`);
  console.log(`Candidate ready: ${candidateReadyForCanonicalStaging ? 'yes' : 'no'}`);
  console.log(`Ready for canonical decision source: ${readyForCanonicalDecisionSource ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
