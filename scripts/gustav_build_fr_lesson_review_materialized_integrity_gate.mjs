import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const MATERIALIZATION_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_route_materialization_gate_audit_v1.json');
const OUTCOME_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_outcome_routing_gate_audit_v1.json');
const DECISIONS_JSONL_PATH = path.join(REVIEWER_DIR, 'fr_lesson_llm_review_decisions_v1.jsonl');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_materialized_integrity_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_materialized_integrity_gate_audit_v1.md');

const EXPECTED_ROWS = 1600;
const MATERIALIZED_ROOTS = [
  {
    bucketId: 'accepted',
    root: 'docs/gustav/generated/fr/reviewer/materialized/fr_lesson_accepted_reviewed_ledgers_v1/',
    expectedFilesWhenAllowed: ['manifest.json'],
  },
  {
    bucketId: 'regeneration',
    root: 'docs/gustav/generated/fr/reviewer/regeneration/',
    expectedFilesWhenAllowed: ['fr_lesson_regeneration_queue_v1.jsonl'],
  },
  {
    bucketId: 'rejected',
    root: 'docs/gustav/generated/fr/reviewer/rejected/',
    expectedFilesWhenAllowed: ['fr_lesson_rejected_rows_v1.jsonl'],
  },
  {
    bucketId: 'skipped',
    root: 'docs/gustav/generated/fr/reviewer/skipped/',
    expectedFilesWhenAllowed: ['fr_lesson_skipped_rows_v1.jsonl'],
  },
];

const FORBIDDEN_PREFIXES = [
  'app/',
  'components/',
  'constants/',
  'hooks/',
  'functions/',
  'admin/',
  'assets/',
  'docs/gustav/generated/fr/server/',
  'docs/gustav/generated/fr/runtime/',
  'docs/gustav/generated/fr/audio/',
  'course-packs/',
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function abs(repoRelativePath) {
  return path.join(ROOT, repoRelativePath);
}

function sha256(filePath) {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseJsonlIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function listFilesIfPresent(repoRelativeRoot) {
  const root = abs(repoRelativeRoot);
  if (!fs.existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(rel(full));
    }
  };
  walk(root);
  return out.sort();
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hasForbiddenPrefix(repoRelativePath) {
  return FORBIDDEN_PREFIXES.some((prefix) => repoRelativePath.startsWith(prefix));
}

function countDecisionOutcomes(decisions) {
  return {
    accepted: decisions.filter((row) => row.reviewerDecision === 'accept_quality_gates').length,
    regeneration: decisions.filter((row) => row.reviewerDecision === 'needs_regeneration' || row.reviewerDecision === 'needs_llm_regeneration_review').length,
    rejected: decisions.filter((row) => row.reviewerDecision === 'reject_candidate').length,
    skipped: decisions.filter((row) => row.reviewerDecision === 'skip_for_later').length,
  };
}

function buildMarkdown(report) {
  const lines = [
    '# Gustav French Lesson Review Materialized Integrity Gate',
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Materialization allowed: ${report.summary.materializationAllowedNow ? 'yes' : 'no'}`,
    `- Materialized files: ${report.summary.materializedFiles}`,
    `- Unexpected files: ${report.summary.unexpectedMaterializedFiles}`,
    `- Missing required files: ${report.summary.missingRequiredFiles}`,
    `- Forbidden path hits: ${report.summary.forbiddenPathHits}`,
    `- Decision rows: ${report.summary.decisionRows}`,
    `- Ready for audio manifest gate: ${report.summary.readyForAudioManifestGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Blockers',
    '',
  ];
  if (report.productionBlockers.length === 0) lines.push('- None.');
  else for (const blocker of report.productionBlockers) lines.push(`- \`${blocker}\``);
  lines.push('', '## Safety', '');
  lines.push('- This gate does not write materialized artifacts.');
  lines.push('- This gate does not write app/admin/functions/server/runtime/audio paths.');
  lines.push('- This gate does not upload packs, enable downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const materializationAudit = readJsonIfPresent(MATERIALIZATION_AUDIT_PATH);
  const outcomeAudit = readJsonIfPresent(OUTCOME_AUDIT_PATH);
  const decisions = parseJsonlIfPresent(DECISIONS_JSONL_PATH);
  const outcomes = countDecisionOutcomes(decisions);
  const materializationAllowedNow = materializationAudit?.summary?.materializationAllowedNow === true;
  const acceptedOnly = decisions.length === EXPECTED_ROWS && outcomes.accepted === EXPECTED_ROWS;

  const bucketReports = MATERIALIZED_ROOTS.map((bucket) => {
    const files = listFilesIfPresent(bucket.root);
    const requiredFiles = materializationAllowedNow
      ? bucket.expectedFilesWhenAllowed.map((fileName) => `${bucket.root}${fileName}`)
      : [];
    const missingRequiredFiles = requiredFiles.filter((filePath) => !files.includes(filePath));
    const forbiddenFiles = files.filter(hasForbiddenPrefix);
    return {
      bucketId: bucket.bucketId,
      root: bucket.root,
      rootExists: fs.existsSync(abs(bucket.root)),
      files,
      fileCount: files.length,
      expectedFilesWhenAllowed: bucket.expectedFilesWhenAllowed,
      missingRequiredFiles,
      forbiddenFiles,
    };
  });

  const allFiles = bucketReports.flatMap((bucket) => bucket.files);
  const unexpectedMaterializedFiles = materializationAllowedNow
    ? []
    : allFiles;
  const missingRequiredFiles = bucketReports.flatMap((bucket) => bucket.missingRequiredFiles);
  const forbiddenPathHits = bucketReports.flatMap((bucket) => bucket.forbiddenFiles);

  const productionBlockers = [];
  if (!materializationAudit) productionBlockers.push('ROUTE_MATERIALIZATION_AUDIT_MISSING');
  if (!outcomeAudit) productionBlockers.push('OUTCOME_ROUTING_AUDIT_MISSING');
  if (!materializationAllowedNow) productionBlockers.push('MATERIALIZATION_NOT_ALLOWED_NOW');
  if (unexpectedMaterializedFiles.length > 0) productionBlockers.push('UNEXPECTED_MATERIALIZED_FILES_WHILE_CLOSED');
  if (missingRequiredFiles.length > 0) productionBlockers.push('MISSING_REQUIRED_MATERIALIZED_FILES');
  if (forbiddenPathHits.length > 0) productionBlockers.push('FORBIDDEN_MATERIALIZED_PATH_HIT');
  if (materializationAllowedNow && decisions.length !== EXPECTED_ROWS) productionBlockers.push('DECISIONS_NOT_COMPLETE_FOR_INTEGRITY');

  const integrityReady =
    productionBlockers.length === 0 &&
    materializationAllowedNow &&
    missingRequiredFiles.length === 0 &&
    forbiddenPathHits.length === 0;

  const report = {
    schemaVersion: 'gustav-fr-lesson-review-materialized-integrity-gate-audit-v1',
    generatedAt,
    status: integrityReady ? 'PASS_MATERIALIZED_INTEGRITY_READY' : 'HOLD',
    activationApproved: false,
    inputs: {
      routeMaterializationAudit: rel(MATERIALIZATION_AUDIT_PATH),
      outcomeRoutingAudit: rel(OUTCOME_AUDIT_PATH),
      decisionsJsonl: rel(DECISIONS_JSONL_PATH),
    },
    hashes: {
      routeMaterializationAuditSha256: sha256(MATERIALIZATION_AUDIT_PATH),
      outcomeRoutingAuditSha256: sha256(OUTCOME_AUDIT_PATH),
      decisionsJsonlSha256: sha256(DECISIONS_JSONL_PATH),
    },
    summary: {
      materializationAllowedNow,
      outcomeRoutingStatus: outcomeAudit?.status || 'missing',
      decisionRows: decisions.length,
      outcomes,
      materializedFiles: allFiles.length,
      unexpectedMaterializedFiles: unexpectedMaterializedFiles.length,
      missingRequiredFiles: missingRequiredFiles.length,
      forbiddenPathHits: forbiddenPathHits.length,
      bucketCount: bucketReports.length,
      acceptedOnly,
      readyForAudioManifestGate: integrityReady && acceptedOnly,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      productionBlockers,
    },
    buckets: bucketReports,
    unexpectedMaterializedFiles,
    missingRequiredFiles,
    forbiddenPathHits,
    productionBlockers,
    safety: {
      dryRunOnly: true,
      materializedArtifactsWrittenByThisScript: false,
      acceptedLedgersWrittenByThisScript: false,
      regenerationQueueWrittenByThisScript: false,
      rejectedRowsWrittenByThisScript: false,
      skippedRowsWrittenByThisScript: false,
      appBundleModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      functionsModifiedByThisScript: false,
      serverPackManifestModifiedByThisScript: false,
      runtimeDownloadsEnabled: false,
      audioGeneratedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      productionApplyApproved: false,
    },
    nextRequiredGates: integrityReady
      ? [
          'regeneration_or_reject_non_accepted_rows_gate',
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'complete_llm_review_decisions',
          'outcome_routing_gate',
          'route_materialization_gate',
          'route_materialization_integrity_gate',
        ],
  };

  writeJson(OUT_AUDIT_PATH, report);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(report), 'utf8');

  console.log(`Gustav French lesson review materialized integrity gate: ${report.status}`);
  console.log(`Materialized files: ${report.summary.materializedFiles}`);
  console.log(`Unexpected files: ${report.summary.unexpectedMaterializedFiles}`);
  console.log(`Missing required files: ${report.summary.missingRequiredFiles}`);
  console.log(`Ready for audio manifest gate: ${report.summary.readyForAudioManifestGate ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
