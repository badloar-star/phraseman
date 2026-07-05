import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'admin');
const CONTRACT_PATH = path.join(OUT_DIR, 'fr_admin_activation_rollback_gate_v1.json');
const AUDIT_PATH = path.join(OUT_DIR, 'fr_admin_activation_rollback_gate_audit_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_admin_activation_rollback_gate_v1.md');

const INPUTS = {
  adminSourceLocaleWriteContract: path.join(OUT_DIR, 'admin_source_locale_write_contract_v1.json'),
  adminSourceLocaleWriteContractAudit: path.join(OUT_DIR, 'admin_source_locale_write_contract_audit_v1.json'),
  adminWritePathIsolationGate: path.join(OUT_DIR, 'fr_admin_write_path_isolation_gate_audit_v1.json'),
  adminEquivalenceMatrix: path.join(OUT_DIR, 'admin_french_target_equivalence_matrix_v1.json'),
  serverPackManifest: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_v1.json'),
  serverPackManifestGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_pack_manifest_gate_audit_v1.json'),
  serverUploadEvidenceGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'server', 'fr_lesson_server_upload_evidence_gate_audit_v1.json'),
  runtimeDeliveryGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'runtime', 'fr_lesson_runtime_delivery_gate_audit_v1.json'),
  storageCloudIsolationGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'storage', 'fr_storage_cloud_isolation_gate_audit_v1.json'),
  reviewerImportDryRun: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'reviewer', 'fr_lesson_review_decision_import_dry_run_audit_v1.json'),
  audioManifestGate: path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'audio', 'fr_lesson_audio_manifest_gate_audit_v1.json'),
};

const SOURCE_LOCALES = ['ru', 'uk'];
const SURFACES = ['lesson', 'audio_metadata'];
const REQUIRED_APPROVAL_FIELDS = [
  'approvalRequestId',
  'reviewedAt',
  'reviewerName',
  'studyTarget',
  'sourceLocales',
  'serverManifestSha256',
  'reviewerImportDryRunSha256',
  'audioManifestGateSha256',
  'serverUploadEvidenceGateSha256',
  'runtimeDeliveryGateSha256',
  'storageCloudIsolationGateSha256',
  'adminSourceLocaleWriteContractSha256',
  'rollbackScope',
  'activationApproved',
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rollbackScopesFor(entries) {
  return [...new Set(entries.map((entry) => `course-packs/fr/${entry.sourceLocale}/`))].sort();
}

function validateApprovalCandidate(candidate, context) {
  const errors = [];
  if (!candidate || typeof candidate !== 'object') return { accepted: false, errors: ['approval candidate must be an object'] };
  for (const field of REQUIRED_APPROVAL_FIELDS) {
    if (!(field in candidate)) errors.push(`missing required approval field: ${field}`);
  }
  if (candidate.studyTarget !== 'fr') errors.push('studyTarget must be fr');
  if (JSON.stringify(candidate.sourceLocales) !== JSON.stringify(SOURCE_LOCALES)) errors.push('sourceLocales must be ru,uk');
  if (candidate.activationApproved !== false) errors.push('activationApproved must remain false in gate candidate');
  if (!context.allUpstreamReady) errors.push('all upstream gates must be PASS before approval can activate');
  if (!context.activeApprovalReceiptExists) errors.push('active explicit approval receipt is missing');
  if (!context.activeHashLockManifestExists) errors.push('active hash lock manifest is missing');
  if (!Array.isArray(candidate.rollbackScope)) errors.push('rollbackScope must be an array');
  else {
    const expected = context.rollbackScopes;
    if (JSON.stringify([...candidate.rollbackScope].sort()) !== JSON.stringify(expected)) {
      errors.push(`rollbackScope must equal ${expected.join(',')}`);
    }
    for (const scope of candidate.rollbackScope) {
      if (!/^course-packs\/fr\/(?:ru|uk)\/$/.test(scope)) errors.push(`rollbackScope contains unsafe scope: ${scope}`);
    }
  }
  for (const [field, expectedSha] of Object.entries(context.expectedHashes)) {
    if (candidate[field] && candidate[field] !== expectedSha) errors.push(`${field} hash mismatch`);
  }
  return { accepted: errors.length === 0, errors };
}

function makeProbes(context) {
  const base = {
    approvalRequestId: 'fr-admin-activation-dry-run',
    reviewedAt: '2026-07-03T00:00:00.000Z',
    reviewerName: 'llm_official_source_reviewer',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    serverManifestSha256: context.expectedHashes.serverManifestSha256,
    reviewerImportDryRunSha256: context.expectedHashes.reviewerImportDryRunSha256,
    audioManifestGateSha256: context.expectedHashes.audioManifestGateSha256,
    serverUploadEvidenceGateSha256: context.expectedHashes.serverUploadEvidenceGateSha256,
    runtimeDeliveryGateSha256: context.expectedHashes.runtimeDeliveryGateSha256,
    storageCloudIsolationGateSha256: context.expectedHashes.storageCloudIsolationGateSha256,
    adminSourceLocaleWriteContractSha256: context.expectedHashes.adminSourceLocaleWriteContractSha256,
    rollbackScope: context.rollbackScopes,
    activationApproved: false,
  };
  const fixtures = [
    { id: 'current_hold_candidate_rejected_without_receipt_hashlocks_and_upstream_pass', expectedAccept: false },
    { id: 'wrong_target_rejected', expectedAccept: false, mutate: (draft) => { draft.studyTarget = 'en'; } },
    { id: 'missing_source_locales_rejected', expectedAccept: false, mutate: (draft) => { delete draft.sourceLocales; } },
    { id: 'ui_locale_rollback_scope_rejected', expectedAccept: false, mutate: (draft) => { draft.rollbackScope = ['course-packs/fr/uiLocale/']; } },
    { id: 'broad_fr_rollback_scope_rejected', expectedAccept: false, mutate: (draft) => { draft.rollbackScope = ['course-packs/fr/']; } },
    { id: 'english_rollback_scope_rejected', expectedAccept: false, mutate: (draft) => { draft.rollbackScope = ['course-packs/en/']; } },
    { id: 'activation_true_rejected', expectedAccept: false, mutate: (draft) => { draft.activationApproved = true; } },
    { id: 'hash_mismatch_rejected', expectedAccept: false, mutate: (draft) => { draft.serverManifestSha256 = '0'.repeat(64); } },
  ];
  return fixtures.map((fixture) => {
    const draft = JSON.parse(JSON.stringify(base));
    fixture.mutate?.(draft);
    const result = validateApprovalCandidate(draft, context);
    return {
      id: fixture.id,
      expectedAccept: fixture.expectedAccept,
      accepted: result.accepted,
      passed: result.accepted === fixture.expectedAccept,
      errors: result.errors,
    };
  });
}

function renderMarkdown(contract, audit) {
  return [
    '# French Admin Activation/Rollback Gate',
    '',
    `Status: \`${audit.status}\``,
    '',
    `Activation approved: \`${contract.disallowedTransitionsNow.activationApproved}\``,
    '',
    '## Rollback Scopes',
    '',
    ...contract.rollbackPolicy.rollbackScopes.map((scope) => `- \`${scope}\``),
    '',
    '## Required Approval Fields',
    '',
    ...contract.requiredApprovalFields.map((field) => `- \`${field}\``),
    '',
    '## Upstream',
    '',
    ...Object.entries(contract.upstreamGateReadiness).map(([key, value]) => `- \`${key}\`: \`${value}\``),
    '',
    `Probes: ${audit.summary.fixtureProbesPassed}/${audit.summary.fixtureProbes}`,
    '',
  ].join('\n');
}

function main() {
  const generatedAt = new Date().toISOString();
  const sourceLocaleContract = readJson(INPUTS.adminSourceLocaleWriteContract);
  const sourceLocaleAudit = readJson(INPUTS.adminSourceLocaleWriteContractAudit);
  const writeGate = readJson(INPUTS.adminWritePathIsolationGate);
  const matrix = readJson(INPUTS.adminEquivalenceMatrix);
  const manifest = readJson(INPUTS.serverPackManifest);
  const serverGate = readJson(INPUTS.serverPackManifestGate);
  const serverUploadEvidenceGate = readJson(INPUTS.serverUploadEvidenceGate);
  const runtimeGate = readJson(INPUTS.runtimeDeliveryGate);
  const storageGate = readJson(INPUTS.storageCloudIsolationGate);
  const reviewerGate = readJson(INPUTS.reviewerImportDryRun);
  const audioGate = readJson(INPUTS.audioManifestGate);
  const rollbackScopes = rollbackScopesFor(manifest.entries || []);
  const expectedHashes = {
    serverManifestSha256: sha256(INPUTS.serverPackManifest),
    reviewerImportDryRunSha256: sha256(INPUTS.reviewerImportDryRun),
    audioManifestGateSha256: sha256(INPUTS.audioManifestGate),
    serverUploadEvidenceGateSha256: sha256(INPUTS.serverUploadEvidenceGate),
    runtimeDeliveryGateSha256: sha256(INPUTS.runtimeDeliveryGate),
    storageCloudIsolationGateSha256: sha256(INPUTS.storageCloudIsolationGate),
    adminSourceLocaleWriteContractSha256: sha256(INPUTS.adminSourceLocaleWriteContract),
  };
  const upstreamGateReadiness = {
    reviewerImportDryRunReady: reviewerGate.summary?.readyForApply === true,
    audioReady: audioGate.summary?.readyForServerUpload === true,
    serverUploadReady: serverGate.summary?.readyForServerUpload === true,
    serverUploadEvidenceReady: serverUploadEvidenceGate.summary?.uploadEvidenceReady === true,
    runtimeDeliveryReady: runtimeGate.summary?.readyForRuntimeDelivery === true,
    runtimeUploadEvidenceReady: runtimeGate.summary?.uploadEvidenceReady === true,
    storageCloudReady: storageGate.summary?.readyForApply === true,
    adminSourceLocaleContractReady: sourceLocaleAudit.summary?.blockers === 0,
    adminWritePathReady: writeGate.summary?.blockers === 0,
    adminEquivalenceReady: matrix.summary?.blockedRows === 0,
  };
  const allUpstreamReady = Object.values(upstreamGateReadiness).every(Boolean);
  const context = {
    rollbackScopes,
    expectedHashes,
    allUpstreamReady,
    activeApprovalReceiptExists: false,
    activeHashLockManifestExists: false,
  };
  const probes = makeProbes(context);
  const contract = {
    schemaVersion: 'gustav-fr-admin-activation-rollback-gate-v1',
    generatedAt,
    studyTarget: 'fr',
    targetLocale: 'fr',
    sourceLocales: SOURCE_LOCALES,
    activationMode: 'blocked_until_all_gates_pass_and_explicit_receipt_exists',
    requiredApprovalFields: REQUIRED_APPROVAL_FIELDS,
    expectedHashes,
    upstreamGateReadiness,
    rollbackPolicy: {
      rollbackScopes,
      rollbackScopeRule: 'Rollback may touch only course-packs/fr/<sourceLocale>/ scoped artifacts for this content version.',
      deniedRollbackScopes: ['course-packs/fr/', 'course-packs/fr/uiLocale/', 'course-packs/fr/sourceLocale/', 'course-packs/en/', 'card_packs', 'community_packs'],
      cardPacksAreMarketplaceOnly: true,
      communityPacksAreUgcOnly: true,
    },
    disallowedTransitionsNow: {
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      reviewerDecisionImportAllowed: false,
      runtimeDownloadsEnabled: false,
      adminOfficialWriteAllowed: false,
    },
  };
  const checks = {
    sourceLocaleContractClosed: sourceLocaleAudit.status === 'HOLD' && sourceLocaleAudit.summary?.adminOfficialWriteAllowed === false,
    writeGateClosed: writeGate.status === 'HOLD' && writeGate.summary?.officialFrenchWritesOpened === false,
    matrixEquivalenceReadyAndClosed: matrix.status === 'HOLD' && matrix.summary?.blockedRows === 0,
    reviewerStillIncompleteAndClosed: reviewerGate.status === 'HOLD' &&
      (reviewerGate.summary?.decisionRows ?? 0) < (reviewerGate.summary?.requestRows ?? 1600),
    audioNotReady: audioGate.status === 'HOLD' && audioGate.summary?.ttsGenerationAllowedSlots === 0,
    serverClosed: serverGate.status === 'HOLD' && serverGate.summary?.activationApprovedEntries === 0,
    serverUploadEvidenceClosed: serverUploadEvidenceGate.status === 'HOLD' && serverUploadEvidenceGate.summary?.uploadEvidenceReady === false,
    runtimeClosed: runtimeGate.status === 'HOLD' && runtimeGate.summary?.activationApprovedRows === 0,
    runtimeRequiresUploadEvidence: runtimeGate.summary?.uploadEvidenceBlocksRuntimeDelivery === true &&
      runtimeGate.summary?.readinessRowsRequiringUploadEvidence === runtimeGate.summary?.readinessRows,
    storageClosed: storageGate.status === 'HOLD' && storageGate.summary?.storageMigrationAllowed === false,
    rollbackScopesSourceScoped: JSON.stringify(rollbackScopes) === JSON.stringify(['course-packs/fr/ru/', 'course-packs/fr/uk/']),
    deniedRollbackScopesPresent: contract.rollbackPolicy.deniedRollbackScopes.includes('card_packs') &&
      contract.rollbackPolicy.deniedRollbackScopes.includes('community_packs') &&
      contract.rollbackPolicy.deniedRollbackScopes.includes('course-packs/fr/'),
    allTransitionsClosed: Object.values(contract.disallowedTransitionsNow).every((value) => value === false),
    probesPass: probes.every((probe) => probe.passed),
  };
  const blockers = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  const audit = {
    schemaVersion: 'gustav-fr-admin-activation-rollback-gate-audit-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    activationApproved: false,
    sourceArtifacts: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [key, rel(filePath)])),
    hashes: Object.fromEntries(Object.entries(INPUTS).map(([key, filePath]) => [`${key}Sha256`, sha256(filePath)])),
    summary: {
      rollbackScopes: rollbackScopes.length,
      requiredApprovalFields: REQUIRED_APPROVAL_FIELDS.length,
      activeApprovalReceiptExists: false,
      activeHashLockManifestExists: false,
      allUpstreamReady,
      upstreamReadyCount: Object.values(upstreamGateReadiness).filter(Boolean).length,
      upstreamGateCount: Object.keys(upstreamGateReadiness).length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      adminOfficialWriteAllowed: false,
      checksPassed: Object.values(checks).filter(Boolean).length,
      checksTotal: Object.keys(checks).length,
      blockers: blockers.length,
      warnings: 0,
    },
    checks,
    probes,
    blockers,
    productionBlockers: [
      'active_explicit_approval_receipt_missing',
      'active_hash_lock_manifest_missing',
      'llm_review_decisions_not_imported',
      'audio_tts_and_checksum_not_ready',
      'server_upload_not_ready',
      'server_upload_evidence_not_ready',
      'runtime_delivery_not_ready',
      ...(matrix.summary?.blockedRows === 0 ? [] : ['admin_equivalence_blocked_rows_remain']),
    ],
    safety: {
      productionAppFilesModifiedByThisScript: false,
      adminUiModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(CONTRACT_PATH, contract);
  writeJson(AUDIT_PATH, audit);
  fs.writeFileSync(MD_PATH, renderMarkdown(contract, audit), 'utf8');
  console.log(`Gustav French admin activation/rollback gate: ${audit.status}`);
  console.log(`Rollback scopes: ${rollbackScopes.join(', ')}`);
  console.log(`Upstream ready: ${audit.summary.upstreamReadyCount}/${audit.summary.upstreamGateCount}`);
  console.log(`Probes: ${audit.summary.fixtureProbesPassed}/${audit.summary.fixtureProbes}`);
  console.log(rel(CONTRACT_PATH));
  if (blockers.length > 0) process.exitCode = 1;
}

main();
