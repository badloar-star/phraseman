import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const REVIEWER_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer');
const OUTCOME_PLAN_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_outcome_routing_plan_v1.json');
const OUTCOME_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_outcome_routing_gate_audit_v1.json');
const OUT_CONTRACT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_route_materialization_gate_v1.json');
const OUT_AUDIT_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_route_materialization_gate_audit_v1.json');
const OUT_MD_PATH = path.join(REVIEWER_DIR, 'fr_lesson_review_route_materialization_gate_audit_v1.md');

const ALLOWED_OUTPUT_PREFIXES = [
  'docs/gustav/generated/fr/reviewer/materialized/',
  'docs/gustav/generated/fr/reviewer/regeneration/',
  'docs/gustav/generated/fr/reviewer/rejected/',
  'docs/gustav/generated/fr/reviewer/skipped/',
];

const FORBIDDEN_OUTPUT_PREFIXES = [
  'app/',
  'components/',
  'constants/',
  'hooks/',
  'functions/',
  'admin/',
  'assets/',
  'course-packs/',
  'docs/gustav/runs/',
  'docs/gustav/generated/fr/server/',
  'docs/gustav/generated/fr/runtime/',
  'docs/gustav/generated/fr/audio/',
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
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

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeOutputPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function isAllowedOutput(outputPath) {
  const normalized = normalizeOutputPath(outputPath);
  return ALLOWED_OUTPUT_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function hitsForbiddenOutput(outputPath) {
  const normalized = normalizeOutputPath(outputPath);
  return FORBIDDEN_OUTPUT_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function buildMarkdown(audit) {
  const lines = [
    '# Gustav French Lesson Review Route Materialization Gate',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Route outputs checked: ${audit.summary.routeOutputsChecked}`,
    `- Allowed outputs: ${audit.summary.allowedOutputs}`,
    `- Forbidden output hits: ${audit.summary.forbiddenOutputHits}`,
    `- Outcome routing ready: ${audit.summary.outcomeRoutingReady ? 'yes' : 'no'}`,
    `- Materialization allowed now: ${audit.summary.materializationAllowedNow ? 'yes' : 'no'}`,
    `- Ready for audio manifest gate: ${audit.summary.readyForAudioManifestGate ? 'yes' : 'no'}`,
    `- Ready for apply: ${audit.summary.readyForApply ? 'yes' : 'no'}`,
    '',
    '## Blockers',
    '',
  ];
  if (audit.productionBlockers.length === 0) lines.push('- None.');
  else for (const blocker of audit.productionBlockers) lines.push(`- \`${blocker}\``);
  lines.push('', '## Safety', '');
  lines.push('- This gate does not write materialized ledgers or queues.');
  lines.push('- This gate does not write app/admin/functions/server/runtime/audio paths.');
  lines.push('- This gate does not upload packs, enable downloads or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const outcomePlan = readJsonIfPresent(OUTCOME_PLAN_PATH);
  const outcomeAudit = readJsonIfPresent(OUTCOME_AUDIT_PATH);
  const routes = outcomePlan?.routes || {};
  const routeEntries = Object.entries(routes).map(([routeId, route]) => ({
    routeId,
    allowedByOutcomeRouting: route.allowed === true,
    rowCount: Number(route.rowCount || 0),
    plannedOutput: normalizeOutputPath(route.plannedOutput),
    outputAllowedByPrefix: isAllowedOutput(route.plannedOutput),
    outputHitsForbiddenPrefix: hitsForbiddenOutput(route.plannedOutput),
    blocker: route.blocker || '',
  }));

  const forbiddenOutputHits = routeEntries.filter((entry) => entry.outputHitsForbiddenPrefix);
  const disallowedOutputPrefixes = routeEntries.filter((entry) => !entry.outputAllowedByPrefix);
  const outcomeRoutingReady = outcomeAudit?.status === 'PASS_READY_FOR_ROUTE_MATERIALIZATION_PLAN';
  const materializationAllowedNow =
    outcomeRoutingReady &&
    routeEntries.length > 0 &&
    forbiddenOutputHits.length === 0 &&
    disallowedOutputPrefixes.length === 0 &&
    routeEntries.some((entry) => entry.allowedByOutcomeRouting);

  const productionBlockers = [];
  if (!outcomePlan) productionBlockers.push('OUTCOME_ROUTING_PLAN_MISSING');
  if (!outcomeAudit) productionBlockers.push('OUTCOME_ROUTING_AUDIT_MISSING');
  if (!outcomeRoutingReady) productionBlockers.push('OUTCOME_ROUTING_NOT_READY');
  if (forbiddenOutputHits.length > 0) productionBlockers.push('FORBIDDEN_OUTPUT_PREFIX_HIT');
  if (disallowedOutputPrefixes.length > 0) productionBlockers.push('OUTPUT_PREFIX_NOT_ALLOWLISTED');
  if (!materializationAllowedNow) productionBlockers.push('MATERIALIZATION_NOT_ALLOWED_NOW');

  const contract = {
    schemaVersion: 'gustav-fr-lesson-review-route-materialization-gate-v1',
    generatedAt,
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    rule: 'Review route materialization may write only isolated reviewer artifacts after outcome routing, schema and import dry-run gates pass. It may not write app bundle, admin, functions, server pack, runtime loader, audio or activation files.',
    allowedOutputPrefixes: ALLOWED_OUTPUT_PREFIXES,
    forbiddenOutputPrefixes: FORBIDDEN_OUTPUT_PREFIXES,
    routeOutputs: routeEntries,
    materializationAllowedNow,
    postMaterializationGates: [
      'route_materialization_integrity_gate',
      'regeneration_or_reject_non_accepted_rows_gate',
      'audio_manifest_gate_only_if_all_1600_accepted',
      'server_pack_manifest_gate',
      'runtime_delivery_gate',
      'admin_activation_rollback_gate',
      'explicit_activation_approval_gate',
    ],
  };

  const audit = {
    schemaVersion: 'gustav-fr-lesson-review-route-materialization-gate-audit-v1',
    generatedAt,
    status: materializationAllowedNow ? 'PASS_MATERIALIZATION_PATHS_READY' : 'HOLD',
    activationApproved: false,
    inputs: {
      outcomeRoutingPlan: rel(OUTCOME_PLAN_PATH),
      outcomeRoutingAudit: rel(OUTCOME_AUDIT_PATH),
    },
    hashes: {
      outcomeRoutingPlanSha256: sha256(OUTCOME_PLAN_PATH),
      outcomeRoutingAuditSha256: sha256(OUTCOME_AUDIT_PATH),
    },
    summary: {
      routeOutputsChecked: routeEntries.length,
      allowedOutputs: routeEntries.filter((entry) => entry.outputAllowedByPrefix).length,
      forbiddenOutputHits: forbiddenOutputHits.length,
      notAllowlistedOutputs: disallowedOutputPrefixes.length,
      outcomeRoutingReady,
      materializationAllowedNow,
      acceptedLedgerMaterializationAllowed: routes.acceptedLedgerMaterialization?.allowed === true,
      regenerationQueueAllowed: routes.regenerationQueue?.allowed === true,
      rejectedRowsLedgerAllowed: routes.rejectedRowsLedger?.allowed === true,
      skippedRowsLedgerAllowed: routes.skippedRowsLedger?.allowed === true,
      readyForAudioManifestGate: materializationAllowedNow && routes.acceptedLedgerMaterialization?.allowed === true,
      readyForServerPackManifestGate: false,
      readyForRuntimeDeliveryGate: false,
      readyForApply: false,
      productionBlockers,
    },
    routeOutputs: routeEntries,
    productionBlockers,
    safety: {
      dryRunOnly: true,
      materializedLedgersWrittenByThisScript: false,
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
    nextRequiredGates: materializationAllowedNow
      ? [
          'route_materialization_integrity_gate',
          'regeneration_or_reject_non_accepted_rows_gate',
          'audio_manifest_gate',
          'server_pack_manifest_gate',
          'runtime_delivery_gate',
          'admin_activation_rollback_gate',
          'explicit_activation_approval_gate',
        ]
      : [
          'complete_llm_review_decisions',
          'decision_progress_gate',
          'llm_review_decision_schema_gate',
          'review_decision_import_dry_run_gate',
          'outcome_routing_gate',
        ],
  };

  writeJson(OUT_CONTRACT_PATH, contract);
  writeJson(OUT_AUDIT_PATH, audit);
  fs.writeFileSync(OUT_MD_PATH, buildMarkdown(audit), 'utf8');

  console.log(`Gustav French lesson review route materialization gate: ${audit.status}`);
  console.log(`Route outputs checked: ${audit.summary.routeOutputsChecked}`);
  console.log(`Forbidden output hits: ${audit.summary.forbiddenOutputHits}`);
  console.log(`Materialization allowed now: ${audit.summary.materializationAllowedNow ? 'yes' : 'no'}`);
  console.log(rel(OUT_AUDIT_PATH));
}

main();
