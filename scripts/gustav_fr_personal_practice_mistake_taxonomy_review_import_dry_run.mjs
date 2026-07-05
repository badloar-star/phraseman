import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'personal_practice');
const TAXONOMY_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_candidate_v1.json');
const REQUESTS_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_requests_v1.jsonl');
const DECISIONS_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_decisions_v1.jsonl');
const SCHEMA_GATE_PATH = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_decision_schema_gate_v1.json');
const OUT_AUDIT = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_import_dry_run_v1.json');
const OUT_MD = path.join(OUT_DIR, 'fr_personal_practice_mistake_taxonomy_review_import_dry_run_v1.md');
const EXPECTED_ROWS = 56;

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : [];
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

function main() {
  const generatedAt = new Date().toISOString();
  const taxonomy = readJson(TAXONOMY_PATH);
  const schemaGate = readJson(SCHEMA_GATE_PATH);
  const requests = readJsonl(REQUESTS_PATH);
  const decisions = readJsonl(DECISIONS_PATH);
  const findings = [];
  const schemaGateReady = schemaGate.summary?.readyForImportDryRun === true;
  if (!schemaGateReady) findings.push({ severity: 'info', code: 'schema_gate_not_ready', message: 'Mistake-taxonomy review decisions are not schema-valid and complete yet.' });
  if (taxonomy.rows?.length !== EXPECTED_ROWS) findings.push({ severity: 'blocker', code: 'taxonomy_row_count_invalid', message: `Expected ${EXPECTED_ROWS} taxonomy rows.` });
  if (requests.length !== EXPECTED_ROWS) findings.push({ severity: 'blocker', code: 'request_row_count_invalid', message: `Expected ${EXPECTED_ROWS} request rows.` });
  if (schemaGateReady && decisions.length !== EXPECTED_ROWS) findings.push({ severity: 'blocker', code: 'decision_row_count_invalid', message: `Expected ${EXPECTED_ROWS} decision rows.` });
  const acceptedRows = decisions.filter((row) => row.reviewerDecision === 'accept_quality_gates').length;
  const nonAcceptedRows = decisions.filter((row) => row.reviewerDecision && row.reviewerDecision !== 'accept_quality_gates').length;
  const openedFlagsRows = decisions.filter((row) => row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved).length;
  if (openedFlagsRows > 0) findings.push({ severity: 'blocker', code: 'opened_production_flags', message: `${openedFlagsRows} rows opened flags.` });
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const wouldStageAcceptedTaxonomy = schemaGateReady && blockers === 0 && acceptedRows > 0;
  const allRowsAccepted = schemaGateReady && blockers === 0 && acceptedRows === EXPECTED_ROWS;
  const report = {
    schemaVersion: 'gustav-fr-personal-practice-mistake-taxonomy-review-import-dry-run-v1',
    generatedAt,
    status: blockers > 0 ? 'BLOCK' : schemaGateReady ? 'PASS' : 'HOLD',
    activationApproved: false,
    inputs: {
      mistakeTaxonomyCandidate: rel(TAXONOMY_PATH),
      requestsJsonl: rel(REQUESTS_PATH),
      decisionsJsonl: rel(DECISIONS_PATH),
      schemaGate: rel(SCHEMA_GATE_PATH),
    },
    hashes: {
      mistakeTaxonomyCandidateSha256: sha256(TAXONOMY_PATH),
      requestsJsonlSha256: sha256(REQUESTS_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_PATH),
      schemaGateSha256: sha256(SCHEMA_GATE_PATH),
    },
    summary: {
      schemaGateReady,
      taxonomyRows: taxonomy.rows?.length ?? 0,
      requestRows: requests.length,
      decisionRows: decisions.length,
      acceptedRows,
      nonAcceptedRows,
      openedFlagsRows,
      wouldStageAcceptedTaxonomy,
      wouldOpenProblemCoach: false,
      allRowsAccepted,
      readyForProblemCoachPromptReview: allRowsAccepted,
      readyForRuntimeEnable: false,
      readyForApply: false,
      blockers,
    },
    safety: {
      dryRunOnly: true,
      reviewerDecisionsImportedByThisScript: false,
      mistakeTaxonomyStagedByThisScript: false,
      problemCoachOpenedByThisScript: false,
      appBundleModifiedByThisScript: false,
      serverUploadStarted: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
    },
    findings,
    nextRequiredGates: schemaGateReady
      ? ['problem_coach_prompt_ru_uk_contract_review', 'server_pack_runtime_admin_activation_gates']
      : ['execute_personal_practice_mistake_taxonomy_llm_review', 'personal_practice_mistake_taxonomy_decision_schema_gate', 'personal_practice_mistake_taxonomy_import_dry_run'],
  };
  writeJson(OUT_AUDIT, report);
  fs.writeFileSync(OUT_MD, `# French Personal Practice Mistake Taxonomy Import Dry Run\n\nStatus: ${report.status}\n\nAccepted taxonomy rows: ${acceptedRows}/${EXPECTED_ROWS}\n\nActivation approved: false\n`, 'utf8');
  console.log(`Gustav French personal-practice mistake-taxonomy import dry-run: ${report.status}`);
  console.log(`Accepted taxonomy rows: ${acceptedRows}/${EXPECTED_ROWS}`);
  console.log(rel(OUT_AUDIT));
  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();

