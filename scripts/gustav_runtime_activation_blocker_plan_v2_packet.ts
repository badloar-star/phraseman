import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PlanState =
  | 'blocked_by_findings'
  | 'closed_missing_admin_runtime_preflight'
  | 'runtime_activation_blocker_plan_ready';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: PlanState;
  accepted: boolean;
  planState: PlanState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type PlannedTouch = {
  path: string;
  touchType: 'future_code_change' | 'future_config_change' | 'future_upload' | 'future_admin_action' | 'future_test_only';
  futureGate: string;
  rollbackCheck: string;
  productionWriteAllowedNow: false;
};

type ActivationBlocker = {
  blockerId: string;
  area: 'runtime_loader' | 'server_delivery' | 'storage_cloud' | 'admin' | 'reviewer_import' | 'rollback' | 'apply_approval';
  currentState: 'blocked';
  evidence: string;
  requiredFutureGate: string;
  rollbackRequirement: string;
  plannedTouches: PlannedTouch[];
};

type EvaluationInput = {
  p27Ready: boolean;
  p27State: string;
  p27Blockers: number;
  readinessApplyBlockers: number;
  readinessDirtyWorktreeOverlaps: number;
  p1aApprovalReceiptExists: boolean;
  p1aActiveHashLockExists: boolean;
  targetManifestActivationApproved: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
  runtimeRemoteLoadingEnabled: boolean;
  runtimeProductionStudyTargetHasFrench: boolean;
  runtimeEmbeddedIndexHasFrench: boolean;
  runtimeReadyForApply: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  adminServerUploadAllowed: boolean;
  adminRuntimeDownloadsEnabled: boolean;
  serverManifestDraftEntries: number;
  productionServerManifestExists: boolean;
  productionManifestSafelyPromoted: boolean;
  planItems: ActivationBlocker[];
  applyPlanDryRunWritten: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  planItems: number;
  plannedTouches: number;
  plannedTouchesWithFutureGate: number;
  plannedTouchesWithRollbackCheck: number;
  runtimeBlockers: number;
  serverBlockers: number;
  storageCloudBlockers: number;
  adminBlockers: number;
  reviewerImportBlockers: number;
  rollbackBlockers: number;
  applyApprovalBlockers: number;
  readinessApplyBlockers: number;
  readinessDirtyWorktreeOverlaps: number;
  p1aApprovalReceiptExists: boolean;
  p1aActiveHashLockExists: boolean;
  serverManifestDraftEntries: number;
  productionServerManifestExists: boolean;
  productionManifestSafelyPromoted: boolean;
  applyPlanDryRunWritten: boolean;
  activationApproved: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  storageMigrationAllowed: false;
  cloudSyncMigrationAllowed: false;
  readyForExplicitApprovalReceiptGateV2: boolean;
  planState: PlanState;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-runtime-activation-blocker-plan-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: Evaluation & {
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  blockerPlan: ActivationBlocker[];
  artifactHashes: Record<string, string>;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    adminStateModifiedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function touch(
  filePath: string,
  touchType: PlannedTouch['touchType'],
  futureGate: string,
  rollbackCheck: string,
): PlannedTouch {
  return {
    path: filePath,
    touchType,
    futureGate,
    rollbackCheck,
    productionWriteAllowedNow: false,
  };
}

function buildPlan(): ActivationBlocker[] {
  return [
    {
      blockerId: 'P28-RUNTIME-001-production-study-target-fr-disabled',
      area: 'runtime_loader',
      currentState: 'blocked',
      evidence: 'ProductionStudyTarget is still limited to the currently enabled production target; French is not activated for production selection.',
      requiredFutureGate: 'production_study_target_activation_gate_v2',
      rollbackRequirement: 'Rollback must restore the previous ProductionStudyTarget set and prove existing English runtime flows still resolve.',
      plannedTouches: [
        touch('app/study_target.ts', 'future_code_change', 'production_study_target_activation_gate_v2', 'tests/course_pack_runtime_contract.test.ts'),
        touch('tests/gustav_french_trainer_target_gate.test.ts', 'future_test_only', 'production_study_target_activation_gate_v2', 'npx jest --runInBand tests/gustav_french_trainer_target_gate.test.ts'),
      ],
    },
    {
      blockerId: 'P28-RUNTIME-002-remote-course-pack-loading-disabled',
      area: 'runtime_loader',
      currentState: 'blocked',
      evidence: 'COURSE_PACK_REMOTE_LOADING_ENABLED remains false and runtime loader preflight proves downloads are closed.',
      requiredFutureGate: 'course_pack_remote_loading_activation_gate_v2',
      rollbackRequirement: 'Rollback must flip remote loading off, clear only French ready-cache state and keep bundled English fallback intact.',
      plannedTouches: [
        touch('app/course_pack_loader.ts', 'future_code_change', 'course_pack_remote_loading_activation_gate_v2', 'tests/course_pack_runtime_contract.test.ts'),
        touch('app/course_pack_index.ts', 'future_code_change', 'course_pack_remote_loading_activation_gate_v2', 'tests/course_pack_runtime_contract.test.ts'),
      ],
    },
    {
      blockerId: 'P28-RUNTIME-003-french-downloadable-index-entry-not-production',
      area: 'runtime_loader',
      currentState: 'blocked',
      evidence: 'P26 has a local draft with 12 entries, but no production embedded/downloadable index entry is approved.',
      requiredFutureGate: 'course_pack_index_fr_entry_gate_v2',
      rollbackRequirement: 'Rollback must remove only studyTarget=fr/sourceLocale-scoped index entries and leave English entries unchanged.',
      plannedTouches: [
        touch('app/course_pack_index.ts', 'future_code_change', 'course_pack_index_fr_entry_gate_v2', 'tests/course_pack_runtime_contract.test.ts'),
        touch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/pack_candidates/fr/server_delivery_manifest_v2_draft.json', 'future_config_change', 'course_pack_index_fr_entry_gate_v2', 'audits/server_delivery_publish_preflight_v2_packet.json'),
      ],
    },
    {
      blockerId: 'P28-SERVER-001-server-manifest-not-published',
      area: 'server_delivery',
      currentState: 'blocked',
      evidence: 'server_delivery_manifest_v2_draft.json exists, but server_delivery_manifest_v2.json is not created/published and Firebase/server upload is closed.',
      requiredFutureGate: 'server_delivery_manifest_publish_gate_v2',
      rollbackRequirement: 'Rollback must remove only the French server manifest version and leave any prior published packs intact.',
      plannedTouches: [
        touch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/pack_candidates/fr/server_delivery_manifest_v2.json', 'future_config_change', 'server_delivery_manifest_publish_gate_v2', 'audits/server_delivery_publish_preflight_v2_packet.json'),
        touch('Firebase Storage course-packs/fr/**', 'future_upload', 'server_delivery_manifest_publish_gate_v2', 'Firebase list/delete dry-run for course-packs/fr/{version}'),
      ],
    },
    {
      blockerId: 'P28-STORAGE-001-storage-cloud-migration-not-approved',
      area: 'storage_cloud',
      currentState: 'blocked',
      evidence: 'Storage/cloud map is ready, but storageMigrationAllowed and cloudSyncMigrationAllowed remain false.',
      requiredFutureGate: 'storage_cloud_fr_namespace_migration_gate_v2',
      rollbackRequirement: 'Rollback must delete only newly created French target/source scoped keys and preserve English/current user state.',
      plannedTouches: [
        touch('app/cloud_sync.ts', 'future_code_change', 'storage_cloud_fr_namespace_migration_gate_v2', 'tests/cloud_sync_sync_keys_validity.test.ts'),
        touch('tests/cloud_sync_daily_tasks_merge.test.ts', 'future_test_only', 'storage_cloud_fr_namespace_migration_gate_v2', 'npx jest --runInBand tests/cloud_sync_daily_tasks_merge.test.ts'),
      ],
    },
    {
      blockerId: 'P28-ADMIN-001-admin-upload-import-activation-actions-closed',
      area: 'admin',
      currentState: 'blocked',
      evidence: 'Admin surface maps target/source identity and approval fields, but admin import/upload/activation actions remain closed.',
      requiredFutureGate: 'admin_fr_pack_delivery_approval_gate_v2',
      rollbackRequirement: 'Rollback must remove only French admin approval state and preserve existing admin controls.',
      plannedTouches: [
        touch('admin/index.html', 'future_code_change', 'admin_fr_pack_delivery_approval_gate_v2', 'docs/design/ADMIN_UI_BIBLE.md + admin target isolation tests'),
        touch('tests/gustav_admin_target_isolation.test.ts', 'future_test_only', 'admin_fr_pack_delivery_approval_gate_v2', 'npx jest --runInBand tests/gustav_admin_target_isolation.test.ts'),
      ],
    },
    {
      blockerId: 'P28-REVIEWER-001-generated-ledger-import-not-committed',
      area: 'reviewer_import',
      currentState: 'blocked',
      evidence: 'LLM official-source promoted decisions are used for local pack materialization, but generated ledger writes/import remain closed.',
      requiredFutureGate: 'llm_official_source_decision_import_commit_gate_v2',
      rollbackRequirement: 'Rollback must restore pre-import generated French ledgers and decision state from hash-locked artifacts.',
      plannedTouches: [
        touch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/lessons/*.json', 'future_config_change', 'llm_official_source_decision_import_commit_gate_v2', 'audits/reviewer_decision_import_execution_gate_v2_packet.json'),
        touch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/reviewer/**', 'future_config_change', 'llm_official_source_decision_import_commit_gate_v2', 'audits/llm_official_source_promoted_decision_file_generation_v2_packet.json'),
      ],
    },
    {
      blockerId: 'P28-ROLLBACK-001-first-fr-pack-rollback-not-locked',
      area: 'rollback',
      currentState: 'blocked',
      evidence: 'This is the first French pack version; rollback policy must be explicit before activation because no prior published French version exists.',
      requiredFutureGate: 'first_fr_pack_rollback_gate_v2',
      rollbackRequirement: 'Rollback must disable French runtime downloads, remove French server manifest references and quarantine local ready-cache entries.',
      plannedTouches: [
        touch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/ROLLBACK_PLAN.md', 'future_config_change', 'first_fr_pack_rollback_gate_v2', 'audits/runtime_cache_integrity_rollback_v2_packet.json'),
        touch('app/course_pack_loader.ts', 'future_code_change', 'first_fr_pack_rollback_gate_v2', 'tests/course_pack_runtime_contract.test.ts'),
      ],
    },
    {
      blockerId: 'P28-APPLY-001-explicit-approval-receipt-and-hash-lock-missing',
      area: 'apply_approval',
      currentState: 'blocked',
      evidence: 'Readiness reports apply blockers and no P1A approval receipt/hash lock; production app modifications are forbidden now.',
      requiredFutureGate: 'explicit_apply_approval_receipt_hash_lock_gate_v2',
      rollbackRequirement: 'Rollback must verify dirty-worktree overlap, exact changed-file list, approved hash lock and post-apply revert recipe.',
      plannedTouches: [
        touch('docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/APPLY_PLAN.md', 'future_config_change', 'explicit_apply_approval_receipt_hash_lock_gate_v2', 'audits/readiness_blocker_reduction_packet.json'),
        touch('git working tree production files', 'future_admin_action', 'explicit_apply_approval_receipt_hash_lock_gate_v2', 'git diff --name-only + dirty overlap audit'),
      ],
    },
  ];
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p27Ready) addFinding(findings, 'blocker', 'P27_NOT_READY', `P27 must be ready before P28, got state=${input.p27State}.`);
  if (input.p27Blockers > 0) addFinding(findings, 'blocker', 'P27_BLOCKERS', `P27 has ${input.p27Blockers} blocker(s).`);
  if (input.serverManifestDraftEntries !== 12) addFinding(findings, 'blocker', 'SERVER_DRAFT_ENTRY_COUNT_INVALID', `Expected 12 draft entries, got ${input.serverManifestDraftEntries}.`);
  if (input.planItems.length < 9) addFinding(findings, 'blocker', 'PLAN_ITEMS_INSUFFICIENT', `Expected at least 9 activation blocker plan items, got ${input.planItems.length}.`);
  if (!input.applyPlanDryRunWritten) addFinding(findings, 'blocker', 'APPLY_PLAN_DRY_RUN_MISSING', 'Dry-run apply plan markdown was not written.');

  const plannedTouches = input.planItems.flatMap((item) => item.plannedTouches);
  const plannedTouchesWithFutureGate = plannedTouches.filter((item) => item.futureGate.trim() !== '').length;
  const plannedTouchesWithRollbackCheck = plannedTouches.filter((item) => item.rollbackCheck.trim() !== '').length;
  if (plannedTouchesWithFutureGate !== plannedTouches.length) addFinding(findings, 'blocker', 'PLANNED_TOUCH_MISSING_GATE', 'Every planned touch must have a future gate.');
  if (plannedTouchesWithRollbackCheck !== plannedTouches.length) addFinding(findings, 'blocker', 'PLANNED_TOUCH_MISSING_ROLLBACK', 'Every planned touch must have a rollback check.');
  if (plannedTouches.some((item) => item.productionWriteAllowedNow)) addFinding(findings, 'blocker', 'PRODUCTION_WRITE_ALLOWED_NOW', 'No planned touch may allow production writes now.');

  const forbiddenOpen =
    input.targetManifestActivationApproved ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.runtimeRemoteLoadingEnabled ||
    input.runtimeProductionStudyTargetHasFrench ||
    input.runtimeEmbeddedIndexHasFrench ||
    input.runtimeReadyForApply ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed ||
    input.adminServerUploadAllowed ||
    input.adminRuntimeDownloadsEnabled ||
    (input.productionServerManifestExists && !input.productionManifestSafelyPromoted);
  if (forbiddenOpen) addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'At least one production activation/upload/download/migration flag is open.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const countArea = (area: ActivationBlocker['area']) => input.planItems.filter((item) => item.area === area).length;
  const accepted = blockers === 0;
  return {
    findings,
    evaluation: {
      targetLocale: 'fr',
      planItems: input.planItems.length,
      plannedTouches: plannedTouches.length,
      plannedTouchesWithFutureGate,
      plannedTouchesWithRollbackCheck,
      runtimeBlockers: countArea('runtime_loader'),
      serverBlockers: countArea('server_delivery'),
      storageCloudBlockers: countArea('storage_cloud'),
      adminBlockers: countArea('admin'),
      reviewerImportBlockers: countArea('reviewer_import'),
      rollbackBlockers: countArea('rollback'),
      applyApprovalBlockers: countArea('apply_approval'),
      readinessApplyBlockers: input.readinessApplyBlockers,
      readinessDirtyWorktreeOverlaps: input.readinessDirtyWorktreeOverlaps,
      p1aApprovalReceiptExists: input.p1aApprovalReceiptExists,
      p1aActiveHashLockExists: input.p1aActiveHashLockExists,
      serverManifestDraftEntries: input.serverManifestDraftEntries,
      productionServerManifestExists: input.productionServerManifestExists,
      productionManifestSafelyPromoted: input.productionManifestSafelyPromoted,
      applyPlanDryRunWritten: input.applyPlanDryRunWritten,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      readyForExplicitApprovalReceiptGateV2: accepted,
      planState: blockers > 0 ? 'blocked_by_findings' : input.p27Ready ? 'runtime_activation_blocker_plan_ready' : 'closed_missing_admin_runtime_preflight',
      blockers,
      warnings,
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{
    id: string;
    expectedAccept: boolean;
    expectedState: PlanState;
    mutate: (input: EvaluationInput) => void;
  }> = [
    { id: 'canonical_blocker_plan_is_accepted', expectedAccept: true, expectedState: 'runtime_activation_blocker_plan_ready', mutate: () => undefined },
    { id: 'missing_p27_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.p27Ready = false; input.p27State = 'blocked_by_findings'; } },
    { id: 'missing_server_entries_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.serverManifestDraftEntries = 11; } },
    { id: 'missing_future_gate_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.planItems[0].plannedTouches[0].futureGate = ''; } },
    { id: 'activation_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.targetManifestActivationApproved = true; } },
    { id: 'production_write_now_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.planItems[0].plannedTouches[0].productionWriteAllowedNow = true as false; } },
    { id: 'unsafe_production_manifest_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.productionServerManifestExists = true; input.productionManifestSafelyPromoted = false; } },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    const accepted = result.readyForExplicitApprovalReceiptGateV2;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      planState: result.planState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.planState === testCase.expectedState,
    };
  });
}

function renderApplyPlan(runId: string, plan: ActivationBlocker[]): string {
  const lines = [
    '# French Activation Apply Plan Dry Run',
    '',
    `Run: ${runId}`,
    '',
    'Status: DRY RUN ONLY. No production app files, Firebase/server uploads, runtime downloads, storage/cloud migrations, activation approval or apply approval are created by this plan.',
    '',
    '## Ordered Blockers',
    '',
  ];
  for (const [index, item] of plan.entries()) {
    lines.push(`${index + 1}. ${item.blockerId}`);
    lines.push('');
    lines.push(`Area: ${item.area}`);
    lines.push(`Evidence: ${item.evidence}`);
    lines.push(`Required future gate: ${item.requiredFutureGate}`);
    lines.push(`Rollback requirement: ${item.rollbackRequirement}`);
    lines.push('');
    lines.push('Planned future touches:');
    for (const touchItem of item.plannedTouches) {
      lines.push(`- ${touchItem.path} | ${touchItem.touchType} | gate=${touchItem.futureGate} | rollback=${touchItem.rollbackCheck} | productionWriteAllowedNow=false`);
    }
    lines.push('');
  }
  lines.push('## Closed Flags');
  lines.push('');
  lines.push('- activationApproved=false');
  lines.push('- readyForApply=false');
  lines.push('- mayModifyProductionAppFiles=false');
  lines.push('- serverUploadAllowed=false');
  lines.push('- firebaseUploadAllowed=false');
  lines.push('- runtimeDownloadsEnabled=false');
  lines.push('- storageMigrationAllowed=false');
  lines.push('- cloudSyncMigrationAllowed=false');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Runtime Activation Blocker Plan V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Plan state: ${report.summary.planState}`,
    `- Plan items: ${report.summary.planItems}`,
    `- Planned touches: ${report.summary.plannedTouches}`,
    `- Planned touches with future gate: ${report.summary.plannedTouchesWithFutureGate}`,
    `- Planned touches with rollback check: ${report.summary.plannedTouchesWithRollbackCheck}`,
    `- Readiness apply blockers: ${report.summary.readinessApplyBlockers}`,
    `- Dirty worktree overlaps: ${report.summary.readinessDirtyWorktreeOverlaps}`,
    `- P1A approval receipt exists: ${report.summary.p1aApprovalReceiptExists ? 'yes' : 'no'}`,
    `- P1A active hash lock exists: ${report.summary.p1aActiveHashLockExists ? 'yes' : 'no'}`,
    `- Ready for explicit approval receipt gate V2: ${report.summary.readyForExplicitApprovalReceiptGateV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const applyPlanDir = path.join(runDir, 'apply_plan');
  const p27Path = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const runtimePath = path.join(auditsDir, 'runtime_server_delivery_contract_v2_packet.json');
  const storagePath = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.json');
  const adminPath = path.join(auditsDir, 'admin_pack_delivery_surface_v2_packet.json');
  const serverManifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const productionServerManifestPath = path.join(packDir, 'server_delivery_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.md');
  const applyPlanPath = path.join(applyPlanDir, 'fr_activation_apply_plan_dry_run.md');

  const p27 = readJson<JsonObject>(p27Path);
  const readiness = readJson<JsonObject>(readinessPath);
  const targetManifest = readJson<JsonObject>(targetManifestPath);
  const runtime = readJson<JsonObject>(runtimePath);
  const storage = readJson<JsonObject>(storagePath);
  const admin = readJson<JsonObject>(adminPath);
  const serverManifestDraft = readJson<JsonObject>(serverManifestDraftPath);

  const p27Summary = summaryOf(p27);
  const readinessSummary = summaryOf(readiness);
  const runtimeSummary = summaryOf(runtime);
  const storageSummary = summaryOf(storage);
  const adminSummary = summaryOf(admin);
  const activation = object(targetManifest.activation);
  const entriesRaw = serverManifestDraft.entries;
  const serverManifestDraftEntries = Array.isArray(entriesRaw) ? entriesRaw.length : 0;

  const plan = buildPlan();
  fs.mkdirSync(applyPlanDir, { recursive: true });
  fs.writeFileSync(applyPlanPath, renderApplyPlan(path.basename(runDir), plan), 'utf8');

  const input: EvaluationInput = {
    p27Ready:
      n(p27Summary, 'blockers') === 0 &&
      b(p27Summary, 'readyForRuntimeActivationBlockerPlanningV2') &&
      s(p27Summary, 'preflightState') === 'admin_server_runtime_preflight_ready',
    p27State: s(p27Summary, 'preflightState'),
    p27Blockers: n(p27Summary, 'blockers'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
    readinessDirtyWorktreeOverlaps: n(readinessSummary, 'dirtyWorktreeOverlaps'),
    p1aApprovalReceiptExists: b(readinessSummary, 'p1aApprovalReceiptExists'),
    p1aActiveHashLockExists: b(readinessSummary, 'p1aActiveHashLockExists'),
    targetManifestActivationApproved: b(activation, 'activationApproved'),
    targetManifestReadyForApply: b(activation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(activation, 'mayModifyProductionAppFiles'),
    runtimeRemoteLoadingEnabled: b(runtimeSummary, 'coursePackRemoteLoadingEnabled'),
    runtimeProductionStudyTargetHasFrench: b(runtimeSummary, 'productionStudyTargetHasFrench'),
    runtimeEmbeddedIndexHasFrench: b(runtimeSummary, 'embeddedIndexHasFrenchEntries'),
    runtimeReadyForApply: b(runtimeSummary, 'readyForApply'),
    storageMigrationAllowed: b(storageSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(storageSummary, 'cloudSyncMigrationAllowed'),
    adminServerUploadAllowed: b(adminSummary, 'serverUploadAllowed'),
    adminRuntimeDownloadsEnabled: b(adminSummary, 'runtimeDownloadsEnabled'),
    serverManifestDraftEntries,
    productionServerManifestExists: fs.existsSync(productionServerManifestPath),
    productionManifestSafelyPromoted: b(p27Summary, 'productionManifestSafelyPromoted'),
    planItems: plan,
    applyPlanDryRunWritten: fs.existsSync(applyPlanPath),
  };
  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.planState = 'blocked_by_findings';
    evaluation.readyForExplicitApprovalReceiptGateV2 = false;
  }
  const status: Status = evaluation.blockers > 0 ? 'BLOCK' : evaluation.readyForExplicitApprovalReceiptGateV2 ? 'PASS' : 'HOLD';
  const report: Report = {
    schemaVersion: 'gustav-runtime-activation-blocker-plan-v2-packet-v0',
    runId: path.basename(runDir),
    generatedAt: new Date().toISOString(),
    status,
    command: { argv: process.argv.slice(2), cwd: repoRoot, nodeVersion: process.version },
    inputs: {
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, p27Path),
      readinessBlockerReductionPacket: rel(repoRoot, readinessPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, runtimePath),
      storageCloudTargetMapV2Packet: rel(repoRoot, storagePath),
      adminPackDeliverySurfaceV2Packet: rel(repoRoot, adminPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestDraftPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      applyPlanDryRun: rel(repoRoot, applyPlanPath),
    },
    summary: {
      ...evaluation,
      blockers: findings.filter((finding) => finding.severity === 'blocker').length,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    blockerPlan: plan,
    artifactHashes: {
      adminServerDeliveryRuntimePreflightV2Packet: sha256(p27Path),
      readinessBlockerReductionPacket: sha256(readinessPath),
      targetPackManifestV2Draft: sha256(targetManifestPath),
      runtimeServerDeliveryContractV2Packet: sha256(runtimePath),
      storageCloudTargetMapV2Packet: sha256(storagePath),
      adminPackDeliverySurfaceV2Packet: sha256(adminPath),
      serverDeliveryManifestV2Draft: sha256(serverManifestDraftPath),
      applyPlanDryRun: sha256(applyPlanPath),
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV runtime activation blocker plan V2 packet: ${report.status}`);
  console.log(`Plan state: ${report.summary.planState}`);
  console.log(`Plan items: ${report.summary.planItems}`);
  console.log(`Ready for explicit approval receipt gate V2: ${report.summary.readyForExplicitApprovalReceiptGateV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
