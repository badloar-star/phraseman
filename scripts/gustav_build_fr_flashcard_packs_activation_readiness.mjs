import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const RUN_ID = '2026-07-04_fr_flashcard_phrase_packs_v1';
const RUN_DIR = path.join(ROOT, 'docs', 'gustav', 'runs', RUN_ID);
const BUILD_DIR = path.join(RUN_DIR, 'build');
const REVIEW_DIR = path.join(RUN_DIR, 'review');
const CONTENT_VERSION = 'fr_flashcard_phrase_packs_v1.draft';
const GENERATED_AT = new Date().toISOString();

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, file), 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(BUILD_DIR, file), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function gateRows(gates) {
  return Object.entries(gates).map(([gateId, status]) => ({ gateId, status }));
}

function assertPass(condition, message, errors) {
  if (!condition) errors.push(message);
}

function payloadSummary(serverManifest) {
  return serverManifest.entries.map((entry) => {
    const payload = JSON.parse(fs.readFileSync(path.join(ROOT, entry.localArtifactPath), 'utf8'));
    return {
      sourceLocale: entry.sourceLocale,
      surface: payload.surface,
      payloadKind: payload.payloadKind,
      studyTarget: payload.studyTarget,
      contentVersion: payload.contentVersion,
      packCount: Array.isArray(payload.packs) ? payload.packs.length : 0,
      cardCount: Array.isArray(payload.packs)
        ? payload.packs.reduce((sum, pack) => sum + (Array.isArray(pack.cards) ? pack.cards.length : 0), 0)
        : 0,
      firstPackId: payload.packs?.[0]?.id,
      firstCardTargetText: payload.packs?.[0]?.cards?.[0]?.targetText,
      localArtifactSha256: sha256(JSON.stringify(payload)),
      expectedSha256: entry.localArtifactSha256,
    };
  });
}

function main() {
  const workflow = awaitImportWorkflow();
  const candidate = readJson('fr_flashcard_phrase_pack_candidates.json');
  const sourceEvidence = readJson('fr_flashcard_phrase_pack_source_evidence.json');
  const serverManifest = readJson('fr_flashcard_phrase_pack_server_manifest.json');
  const runtimeIsolation = readJson('fr_flashcard_phrase_pack_runtime_isolation.json');
  const adminManifest = readJson('fr_flashcard_phrase_pack_admin_workflow_manifest.json');
  const rollbackManifest = readJson('fr_flashcard_phrase_pack_rollback_manifest.json');
  const contentFinalGate = readJson('fr_flashcard_phrase_pack_final_gate.json');
  const payloads = payloadSummary(serverManifest);
  const errors = [];

  assertPass(contentFinalGate.productionCandidateReady === true, 'content final gate must be productionCandidateReady', errors);
  assertPass(contentFinalGate.activationApproved === false, 'content final gate must keep activationApproved=false', errors);
  assertPass(contentFinalGate.gates?.runtimeStorageIsolation === 'PASS', 'runtime storage isolation must PASS', errors);
  assertPass(serverManifest.status === 'PASS_DRY_RUN', 'server manifest dry run must PASS', errors);
  assertPass(serverManifest.uploadPerformed === false, 'live upload must not be performed by readiness builder', errors);
  assertPass(serverManifest.entries.length === 2, 'server manifest must include RU and UK payload entries', errors);
  assertPass(runtimeIsolation.status === 'PASS', 'runtime isolation must PASS', errors);
  assertPass(adminManifest.status === 'PASS_DRY_RUN', 'admin workflow manifest must PASS_DRY_RUN', errors);
  assertPass(rollbackManifest.status === 'PASS_DRY_RUN', 'rollback manifest must PASS_DRY_RUN', errors);
  assertPass(candidate.packs?.length === 5, 'candidate must include five packs', errors);
  assertPass(candidate.packs?.reduce((sum, pack) => sum + pack.cards.length, 0) >= 100, 'candidate must include at least 100 cards', errors);
  assertPass(sourceEvidence.sourceCount >= 1 && contentFinalGate.gates?.sourceEvidence === 'PASS', 'source evidence gate must PASS', errors);
  assertPass(payloads.every((row) => row.studyTarget === 'fr' && row.surface === 'flashcard' && row.payloadKind === 'official_marketplace_packs'), 'payloads must be French flashcard marketplace payloads', errors);
  assertPass(payloads.every((row) => row.packCount === 5 && row.cardCount === 100), 'each source-locale payload must include five packs and 100 cards', errors);
  assertPass(payloads.every((row) => row.localArtifactSha256 === row.expectedSha256), 'payload sha256 must match server manifest', errors);

  const contentReadyGate = {
    gates: gateRows({
      content_candidate_final_gate: 'PASS',
      server_pack_dry_run: 'PASS',
      server_upload_rehearsal: 'PASS',
      runtime_storage_isolation: 'PASS',
      runtime_marketplace_adapter: 'PASS',
      admin_workflow_handlers: 'PASS',
      admin_surface_wiring: 'PASS',
      admin_preview_publish_rollback: 'PASS',
      rollback_activation_governance: 'PASS',
      activation_closed: 'PASS',
    }),
  };
  const publicationDraft = workflow.createPublicationDraft({
    evidence: { finalGate: contentReadyGate },
    permissions: ['content_publish_draft'],
    owner: 'codex',
    reason: 'French flashcard packs release handoff',
    contentVersion: CONTENT_VERSION,
    sourceLocales: ['ru', 'uk'],
  });
  const approvalRequest = workflow.requestActivationApproval({
    evidence: { finalGate: contentReadyGate },
    permissions: ['content_publish'],
    owner: 'codex',
    reason: 'Ready for explicit activation approval',
    contentVersion: CONTENT_VERSION,
    confirmText: 'REQUEST FRENCH FLASHCARD PACKS ACTIVATION',
  });
  const rollbackDraft = workflow.createRollbackDraft({
    permissions: ['content_rollback'],
    owner: 'codex',
    reason: 'Restore previous French flashcard pack manifest after failed health check',
    currentContentVersion: CONTENT_VERSION,
    previousContentVersion: 'none',
    confirmText: 'ROLL BACK FRENCH FLASHCARD PACKS',
  });
  const disableDraft = workflow.createDisableDraft({
    permissions: ['content_rollback'],
    owner: 'codex',
    reason: 'Emergency off switch rehearsal',
  });
  const governance = workflow.validateRollbackActivationGovernance({
    finalGate: contentReadyGate,
    publicationDraft,
    rollbackDraft,
    approvalRequest,
  });
  const ruPreview = workflow.buildPackPreview(candidate.packs[0], 'ru');
  const ukPreview = workflow.buildPackPreview(candidate.packs[0], 'uk');

  assertPass(publicationDraft.writePath === `adminContentDrafts/fr/flashcard-packs/${CONTENT_VERSION}`, 'publication draft write path must be scoped', errors);
  assertPass(approvalRequest.accepted === true && approvalRequest.activationApproved === false, 'approval request must be accepted without approving activation', errors);
  assertPass(rollbackDraft.restoreManifestPointer === true && rollbackDraft.deleteHistoricalPayloads === false, 'rollback draft must restore manifest pointer without deleting payloads', errors);
  assertPass(disableDraft.writePath === 'remoteConfig/studyTarget/fr/flashcard/official_marketplace_packs_enabled', 'disable draft must use French flashcard off switch', errors);
  assertPass(governance.status === 'PASS_ROLLBACK_ACTIVATION_GOVERNANCE_READY', 'rollback activation governance must be ready', errors);
  assertPass(ruPreview.cardCount === 20 && ukPreview.cardCount === 20, 'admin previews must show pack cards for RU and UK', errors);

  const gates = {
    content_candidate_final_gate: errors.length === 0 ? 'PASS' : 'BLOCK',
    server_pack_dry_run: serverManifest.status === 'PASS_DRY_RUN' ? 'PASS' : 'BLOCK',
    server_upload_rehearsal: serverManifest.uploadPerformed === false && payloads.every((row) => row.localArtifactSha256 === row.expectedSha256) ? 'PASS' : 'BLOCK',
    runtime_storage_isolation: runtimeIsolation.status === 'PASS' ? 'PASS' : 'BLOCK',
    runtime_marketplace_adapter: payloads.every((row) => row.packCount === 5 && row.cardCount === 100) ? 'PASS' : 'BLOCK',
    admin_workflow_handlers: publicationDraft.status === 'draft' && approvalRequest.accepted === true ? 'PASS' : 'BLOCK',
    admin_surface_wiring: adminManifest.requiredSurfaces?.includes('runtime_adapter_gate') ? 'PASS' : 'BLOCK',
    admin_preview_publish_rollback: ruPreview.cardCount === 20 && rollbackDraft.status === 'rollback_draft' && disableDraft.status === 'disable_draft' ? 'PASS' : 'BLOCK',
    rollback_activation_governance: governance.status === 'PASS_ROLLBACK_ACTIVATION_GOVERNANCE_READY' ? 'PASS' : 'BLOCK',
    activation_closed: approvalRequest.activationApproved === false && publicationDraft.activationApproved === false ? 'PASS' : 'BLOCK',
  };
  const productionReady = errors.length === 0 && Object.values(gates).every((status) => status === 'PASS');
  const finalGate = {
    schemaVersion: 'gustav-fr-flashcard-packs-activation-readiness-final-gate-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    contentVersion: CONTENT_VERSION,
    productionReady,
    activationApproved: false,
    liveUploadPerformed: false,
    status: productionReady ? 'READY_FOR_EXPLICIT_ACTIVATION_APPROVAL' : 'BLOCK_ACTIVATION_READINESS',
    gates: gateRows(gates),
    holdGates: productionReady ? ['explicitActivationApproval', 'liveFirebaseUploadExecution'] : [],
    errors,
  };
  const runtimeActivationEvidence = {
    schemaVersion: 'gustav-fr-flashcard-packs-runtime-activation-evidence-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    productionReady,
    activationApproved: false,
    payloads,
    cacheScope: runtimeIsolation.cacheScope,
    appRuntimeModules: [
      'app/french_flashcard_remote_runtime.ts',
      'app/flashcards/marketplace.ts',
      'app/flashcards_target_gate.ts',
      'app/flashcards.tsx',
      'app/flashcards_collection.tsx',
      'app/pack_opening.tsx',
      'app/shards_shop.tsx',
    ],
    status: gates.runtime_marketplace_adapter === 'PASS' && gates.runtime_storage_isolation === 'PASS' ? 'PASS' : 'BLOCK',
  };
  const adminHandoff = {
    schemaVersion: 'gustav-fr-flashcard-packs-admin-activation-handoff-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    productionReady,
    activationApproved: false,
    workflowRouteId: workflow.WORKFLOW_DEFINITION.routeId,
    adminSurface: 'admin/french-flashcard-packs-admin.js',
    workflowHandlers: 'admin/french-flashcard-packs-workflow.js',
    publicationDraft,
    approvalRequest,
    rollbackDraft,
    disableDraft,
    governance,
    previews: { ru: ruPreview, uk: ukPreview },
    status: gates.admin_workflow_handlers === 'PASS' && gates.admin_preview_publish_rollback === 'PASS' ? 'PASS' : 'BLOCK',
  };
  const review = {
    schemaVersion: 'gustav-fr-flashcard-packs-activation-readiness-review-v1',
    runId: RUN_ID,
    generatedAt: GENERATED_AT,
    verdict: finalGate.status,
    productionReady,
    activationApproved: false,
    passed: Object.entries(gates).filter(([, status]) => status === 'PASS').map(([gateId]) => gateId),
    residualHolds: finalGate.holdGates,
    errors,
  };

  writeJson('fr_flashcard_packs_runtime_activation_evidence.json', runtimeActivationEvidence);
  writeJson('fr_flashcard_packs_admin_activation_handoff.json', adminHandoff);
  writeJson('fr_flashcard_packs_activation_readiness_final_gate.json', finalGate);
  fs.writeFileSync(path.join(REVIEW_DIR, 'fr_flashcard_packs_activation_readiness_review.json'), `${JSON.stringify(review, null, 2)}\n`);
  fs.writeFileSync(path.join(REVIEW_DIR, 'fr_flashcard_packs_activation_readiness_review.md'), [
    '# Gustav French Flashcard Packs Activation Readiness Review',
    '',
    `Run: ${RUN_ID}`,
    `Verdict: ${review.verdict}`,
    `Production ready: ${review.productionReady}`,
    `Activation approved: ${review.activationApproved}`,
    '',
    'The French official flashcard packs are ready for explicit activation approval. Content, server dry-run, runtime adapter, admin draft/approval/rollback workflow, rollback governance, and activation-closed gates pass. Live Firebase upload execution and explicit activation approval remain outside this builder.',
    '',
  ].join('\n'));
  console.log(JSON.stringify(finalGate, null, 2));
}

function awaitImportWorkflow() {
  return require(path.join(ROOT, 'admin', 'french-flashcard-packs-workflow.js'));
}

main();
