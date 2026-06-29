import * as fs from 'node:fs';
import * as path from 'node:path';

type Decision = 'GO' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Check = {
  id: string;
  title: string;
  severity: Severity;
  blocks: Array<'generation' | 'apply'>;
  status: 'PASS' | 'FAIL';
  sourceArtifact: string;
  detail: string;
  requiredBeforeWork: string[];
};

type Report = {
  schemaVersion: 'gustav-readiness-gate-v0';
  runId: string;
  generatedAt: string;
  decision: Decision;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  readiness: {
    canStartFrenchGeneration: boolean;
    canStartProductionApply: boolean;
    canContinueArchitectureWork: boolean;
    nextRecommendedMode: 'architecture' | 'source_graph' | 'research' | 'generate' | 'apply';
    nextRecommendedWork: string[];
  };
  summary: {
    checks: number;
    passed: number;
    failed: number;
    blockers: number;
    warnings: number;
    generationBlockers: number;
    applyBlockers: number;
  };
  inputStatuses: Record<string, {
    status: string;
    summary: Record<string, unknown>;
  }>;
  checks: Check[];
  notes: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function safeReadJson<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  return readJson<T>(filePath);
}

function safeReadText(filePath: string): string {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function artifact(runDir: string, relativePath: string): string {
  return path.join(runDir, relativePath);
}

function statusOf(value: unknown): string {
  if (!value || typeof value !== 'object') return 'MISSING';
  const obj = value as Record<string, unknown>;
  const validation = obj.validation && typeof obj.validation === 'object'
    ? obj.validation as Record<string, unknown>
    : null;
  return typeof obj.status === 'string'
    ? obj.status
    : typeof obj.decision === 'string'
      ? obj.decision
      : validation && typeof validation.verdict === 'string'
        ? validation.verdict
      : 'UNKNOWN';
}

function summaryOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  const obj = value as Record<string, unknown>;
  const summary = obj.summary;
  if (summary && typeof summary === 'object') return summary as Record<string, unknown>;
  const validation = obj.validation;
  return validation && typeof validation === 'object' ? validation as Record<string, unknown> : {};
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function passCheck(input: Omit<Check, 'status'>): Check {
  return { ...input, status: 'PASS' };
}

function failCheck(input: Omit<Check, 'status'>): Check {
  return { ...input, status: 'FAIL' };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Readiness Gate',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Decision: \`${report.decision}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Readiness',
    '',
    `- Can start French generation: ${report.readiness.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Can start production apply: ${report.readiness.canStartProductionApply ? 'yes' : 'no'}`,
    `- Can continue architecture work: ${report.readiness.canContinueArchitectureWork ? 'yes' : 'no'}`,
    `- Next recommended mode: \`${report.readiness.nextRecommendedMode}\``,
    '',
    'Next recommended work:',
  ];
  for (const item of report.readiness.nextRecommendedWork) lines.push(`- ${item}`);
  lines.push(
    '',
    '## Summary',
    '',
    `- Checks: ${report.summary.checks}`,
    `- Passed: ${report.summary.passed}`,
    `- Failed: ${report.summary.failed}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Generation blockers: ${report.summary.generationBlockers}`,
    `- Apply blockers: ${report.summary.applyBlockers}`,
    '',
    '## Failed Checks',
    '',
  );
  const failed = report.checks.filter((check) => check.status === 'FAIL');
  if (failed.length === 0) {
    lines.push('No failed checks.');
  } else {
    for (const check of failed) {
      lines.push(`### ${check.id}: ${check.title}`);
      lines.push('');
      lines.push(`Severity: \`${check.severity}\``);
      lines.push(`Blocks: ${check.blocks.map((block) => `\`${block}\``).join(', ') || '`none`'}`);
      lines.push(`Artifact: \`${check.sourceArtifact}\``);
      lines.push('');
      lines.push(check.detail);
      lines.push('');
      lines.push('Required before work:');
      for (const item of check.requiredBeforeWork) lines.push(`- ${item}`);
      lines.push('');
    }
  }
  lines.push('## Passed Checks', '');
  for (const check of report.checks.filter((entry) => entry.status === 'PASS')) {
    lines.push(`- \`${check.id}\`: ${check.title}`);
  }
  lines.push('', '## Notes', '');
  for (const note of report.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_readiness_gate.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);

  const verdictPath = artifact(runDir, 'verdict.json');
  const runVerdictRecheckPath = artifact(runDir, 'audits/run_verdict_recheck_packet.json');
  const validatorPath = artifact(runDir, 'audits/run_validator_report.json');
  const storagePath = artifact(runDir, 'inputs/storage_key_inventory.json');
  const cloudPath = artifact(runDir, 'audits/cloud_sync_mapping.json');
  const mixedPath = artifact(runDir, 'audits/mixed_cloud_payload_audit.json');
  const achievementPath = artifact(runDir, 'audits/achievement_taxonomy.json');
  const tk4AchievementPolicyPath = artifact(runDir, 'audits/tk4_achievement_stats_cloud_policy_packet.json');
  const localCloudPath = artifact(runDir, 'audits/local_cloud_decision_table.json');
  const targetKeyPath = artifact(runDir, 'audits/target_key_integration_plan.json');
  const targetKeyFinalReconciliationPath = artifact(runDir, 'audits/target_key_final_reconciliation_packet.json');
  const surfacePath = artifact(runDir, 'audits/surface_route_inventory.json');
  const tk5SurfaceGuardsPath = artifact(runDir, 'audits/tk5_surface_raw_guards_packet.json');
  const migrationAdapterPath = artifact(runDir, 'audits/migration_adapter_plan.json');
  const sourceGraphPath = artifact(runDir, 'source_graph/source_graph.json');
  const sourceGraphQualityPath = artifact(runDir, 'audits/source_graph_quality_audit.json');
  const generatedSourceTruthPath = artifact(runDir, 'audits/generated_source_truth_audit.json');
  const generatedSupportIsolationPath = artifact(runDir, 'audits/generated_support_isolation_audit.json');
  const lesson916SourceRecoveryPath = artifact(runDir, 'audits/lesson_9_16_source_recovery_audit.json');
  const lesson916ReconciliationPath = artifact(runDir, 'audits/lesson_9_16_reconciliation_audit.json');
  const lesson916CanonicalDraftPath = artifact(runDir, 'audits/lesson_9_16_canonical_source_draft_audit.json');
  const lesson916DecisionPacketPath = artifact(runDir, 'audits/lesson_9_16_source_truth_decision_packet.json');
  const lesson916ApprovalAuditPath = artifact(runDir, 'audits/lesson_9_16_source_truth_approval_audit.json');
  const generatedAuditPath = artifact(runDir, 'audits/generated_content_audit.json');
  const officialSourceCoveragePath = artifact(runDir, 'audits/french_official_source_content_coverage_v2_packet.json');
  const readinessApplyCoveragePath = artifact(runDir, 'audits/readiness_apply_coverage_audit.json');
  const phaseDependencyPath = artifact(runDir, 'audits/phase_dependency_audit.json');
  const p1ExecutionSlicePath = artifact(runDir, 'audits/p1_execution_slice_audit.json');
  const p1aCoreContractSpecPath = artifact(runDir, 'audits/p1a_core_contract_spec.json');
  const p1aPreflightPath = artifact(runDir, 'audits/p1a_preflight_audit.json');
  const p1aTestExecutionPath = artifact(runDir, 'audits/p1a_test_execution_audit.json');
  const p1aMinimalApplyPacketPath = artifact(runDir, 'apply_plan/p1a_minimal_apply_packet.json');
  const p1aPostApplyGuardPath = artifact(runDir, 'audits/p1a_post_apply_guard.json');
  const p1aRollbackCheckpointPath = artifact(runDir, 'apply_plan/p1a_rollback_checkpoint.json');
  const p1aExpoRouteSafetyPath = artifact(runDir, 'audits/p1a_expo_route_safety_audit.json');
  const p1aKeyCollisionPath = artifact(runDir, 'audits/p1a_key_collision_audit.json');
  const p1aImportContractPath = artifact(runDir, 'audits/p1a_import_contract_audit.json');
  const p1aApprovalLockPath = artifact(runDir, 'audits/p1a_approval_lock_audit.json');
  const p1aImplementationBlueprintPath = artifact(runDir, 'audits/p1a_implementation_blueprint_audit.json');
  const p1aBlueprintHashLockPath = artifact(runDir, 'audits/p1a_blueprint_hash_lock_audit.json');
  const p1aApplyTransactionPath = artifact(runDir, 'audits/p1a_apply_transaction_audit.json');
  const p1aTransactionSimulationPath = artifact(runDir, 'audits/p1a_transaction_simulation_audit.json');
  const p1aApprovalReceiptFirewallPath = artifact(runDir, 'audits/p1a_approval_receipt_firewall_audit.json');
  const postP1AReadinessProjectionPath = artifact(runDir, 'audits/post_p1a_readiness_projection_audit.json');
  const postP1ANextSlicePath = artifact(runDir, 'audits/post_p1a_next_slice_audit.json');
  const p1bPreflightPath = artifact(runDir, 'audits/p1b_preflight_audit.json');
  const p1bDirtyOverlapSnapshotPath = artifact(runDir, 'audits/p1b_dirty_overlap_snapshot_audit.json');
  const p1bApprovalReceiptFirewallPath = artifact(runDir, 'audits/p1b_approval_receipt_firewall_audit.json');
  const p1bApprovalReceiptContractPath = artifact(runDir, 'audits/p1b_approval_receipt_contract_audit.json');
  const p1bUnlockPrerequisiteMatrixPath = artifact(runDir, 'audits/p1b_unlock_prerequisite_matrix_audit.json');
  const p1bFreshReadReceiptContractPath = artifact(runDir, 'audits/p1b_fresh_read_receipt_contract_audit.json');
  const p1bDirtyOverlapDriftResponsePath = artifact(runDir, 'audits/p1b_dirty_overlap_drift_response_audit.json');
  const p1bDirtyOverlapSnapshotRefreshContractPath = artifact(runDir, 'audits/p1b_dirty_overlap_snapshot_refresh_contract_audit.json');
  const p1bNarrowWriteTransactionContractPath = artifact(runDir, 'audits/p1b_narrow_write_transaction_contract_audit.json');
  const p1bPostWriteProofContractPath = artifact(runDir, 'audits/p1b_post_write_proof_contract_audit.json');
  const p1bPostWriteProofFirewallPath = artifact(runDir, 'audits/p1b_post_write_proof_firewall_audit.json');
  const translationStartGatePath = artifact(runDir, 'audits/translation_start_gate_audit.json');
  const frenchResearchPackContractPath = artifact(runDir, 'audits/french_research_pack_contract_audit.json');
  const frenchResearchPackFirewallPath = artifact(runDir, 'audits/french_research_pack_firewall_audit.json');
  const frenchResearchJsonFirewallPath = artifact(runDir, 'audits/french_research_json_firewall_audit.json');
  const frenchResearchWorkOrderPath = artifact(runDir, 'audits/french_research_work_order_audit.json');
  const applyPlanPath = artifact(runDir, 'apply_plan/file_changes.json');
  const frenchDevSurfaceParityTestPath = path.join(repoRoot, 'tests/gustav_french_dev_surface_parity.test.ts');

  const frenchDevSurfaceParitySources = {
    home: safeReadText(path.join(repoRoot, 'app/(tabs)/home.tsx')),
    quizzes: safeReadText(path.join(repoRoot, 'app/(tabs)/quizzes.tsx')),
    dailyPhrase: safeReadText(path.join(repoRoot, 'components/DailyPhraseCard.tsx')),
    diagnostic: safeReadText(path.join(repoRoot, 'app/diagnostic_test.tsx')),
    lessonMenu: safeReadText(path.join(repoRoot, 'app/lesson_menu.tsx')),
    dailyTasks: safeReadText(path.join(repoRoot, 'app/daily_tasks_screen.tsx')),
    test: safeReadText(frenchDevSurfaceParityTestPath),
  };

  const inputs = {
    verdict: safeReadJson<Record<string, unknown>>(verdictPath),
    runVerdictRecheck: safeReadJson<Record<string, unknown>>(runVerdictRecheckPath),
    validator: safeReadJson<Record<string, unknown>>(validatorPath),
    storage: safeReadJson<Record<string, unknown>>(storagePath),
    cloud: safeReadJson<Record<string, unknown>>(cloudPath),
    mixedPayload: safeReadJson<Record<string, unknown>>(mixedPath),
    achievements: safeReadJson<Record<string, unknown>>(achievementPath),
    tk4AchievementPolicy: safeReadJson<Record<string, unknown>>(tk4AchievementPolicyPath),
    localCloud: safeReadJson<Record<string, unknown>>(localCloudPath),
    targetKeys: safeReadJson<Record<string, unknown>>(targetKeyPath),
    targetKeyFinalReconciliation: safeReadJson<Record<string, unknown>>(targetKeyFinalReconciliationPath),
    surfaces: safeReadJson<Record<string, unknown>>(surfacePath),
    tk5SurfaceGuards: safeReadJson<Record<string, unknown>>(tk5SurfaceGuardsPath),
    migrationAdapters: safeReadJson<Record<string, unknown>>(migrationAdapterPath),
    sourceGraph: safeReadJson<Record<string, unknown>>(sourceGraphPath),
    sourceGraphQuality: safeReadJson<Record<string, unknown>>(sourceGraphQualityPath),
    generatedSourceTruth: safeReadJson<Record<string, unknown>>(generatedSourceTruthPath),
    generatedSupportIsolation: safeReadJson<Record<string, unknown>>(generatedSupportIsolationPath),
    lesson916SourceRecovery: safeReadJson<Record<string, unknown>>(lesson916SourceRecoveryPath),
    lesson916Reconciliation: safeReadJson<Record<string, unknown>>(lesson916ReconciliationPath),
    lesson916CanonicalDraft: safeReadJson<Record<string, unknown>>(lesson916CanonicalDraftPath),
    lesson916DecisionPacket: safeReadJson<Record<string, unknown>>(lesson916DecisionPacketPath),
    lesson916ApprovalAudit: safeReadJson<Record<string, unknown>>(lesson916ApprovalAuditPath),
    generatedAudit: safeReadJson<Record<string, unknown>>(generatedAuditPath),
    officialSourceCoverage: safeReadJson<Record<string, unknown>>(officialSourceCoveragePath),
    readinessApplyCoverage: safeReadJson<Record<string, unknown>>(readinessApplyCoveragePath),
    phaseDependency: safeReadJson<Record<string, unknown>>(phaseDependencyPath),
    p1ExecutionSlice: safeReadJson<Record<string, unknown>>(p1ExecutionSlicePath),
    p1aCoreContractSpec: safeReadJson<Record<string, unknown>>(p1aCoreContractSpecPath),
    p1aPreflight: safeReadJson<Record<string, unknown>>(p1aPreflightPath),
    p1aTestExecution: safeReadJson<Record<string, unknown>>(p1aTestExecutionPath),
    p1aMinimalApplyPacket: safeReadJson<Record<string, unknown>>(p1aMinimalApplyPacketPath),
    p1aPostApplyGuard: safeReadJson<Record<string, unknown>>(p1aPostApplyGuardPath),
    p1aRollbackCheckpoint: safeReadJson<Record<string, unknown>>(p1aRollbackCheckpointPath),
    p1aExpoRouteSafety: safeReadJson<Record<string, unknown>>(p1aExpoRouteSafetyPath),
    p1aKeyCollision: safeReadJson<Record<string, unknown>>(p1aKeyCollisionPath),
    p1aImportContract: safeReadJson<Record<string, unknown>>(p1aImportContractPath),
    p1aApprovalLock: safeReadJson<Record<string, unknown>>(p1aApprovalLockPath),
    p1aImplementationBlueprint: safeReadJson<Record<string, unknown>>(p1aImplementationBlueprintPath),
    p1aBlueprintHashLock: safeReadJson<Record<string, unknown>>(p1aBlueprintHashLockPath),
    p1aApplyTransaction: safeReadJson<Record<string, unknown>>(p1aApplyTransactionPath),
    p1aTransactionSimulation: safeReadJson<Record<string, unknown>>(p1aTransactionSimulationPath),
    p1aApprovalReceiptFirewall: safeReadJson<Record<string, unknown>>(p1aApprovalReceiptFirewallPath),
    postP1AReadinessProjection: safeReadJson<Record<string, unknown>>(postP1AReadinessProjectionPath),
    postP1ANextSlice: safeReadJson<Record<string, unknown>>(postP1ANextSlicePath),
    p1bPreflight: safeReadJson<Record<string, unknown>>(p1bPreflightPath),
    p1bDirtyOverlapSnapshot: safeReadJson<Record<string, unknown>>(p1bDirtyOverlapSnapshotPath),
    p1bApprovalReceiptFirewall: safeReadJson<Record<string, unknown>>(p1bApprovalReceiptFirewallPath),
    p1bApprovalReceiptContract: safeReadJson<Record<string, unknown>>(p1bApprovalReceiptContractPath),
    p1bUnlockPrerequisiteMatrix: safeReadJson<Record<string, unknown>>(p1bUnlockPrerequisiteMatrixPath),
    p1bFreshReadReceiptContract: safeReadJson<Record<string, unknown>>(p1bFreshReadReceiptContractPath),
    p1bDirtyOverlapDriftResponse: safeReadJson<Record<string, unknown>>(p1bDirtyOverlapDriftResponsePath),
    p1bDirtyOverlapSnapshotRefreshContract: safeReadJson<Record<string, unknown>>(p1bDirtyOverlapSnapshotRefreshContractPath),
    p1bNarrowWriteTransactionContract: safeReadJson<Record<string, unknown>>(p1bNarrowWriteTransactionContractPath),
    p1bPostWriteProofContract: safeReadJson<Record<string, unknown>>(p1bPostWriteProofContractPath),
    p1bPostWriteProofFirewall: safeReadJson<Record<string, unknown>>(p1bPostWriteProofFirewallPath),
    translationStartGate: safeReadJson<Record<string, unknown>>(translationStartGatePath),
    frenchResearchPackContract: safeReadJson<Record<string, unknown>>(frenchResearchPackContractPath),
    frenchResearchPackFirewall: safeReadJson<Record<string, unknown>>(frenchResearchPackFirewallPath),
    frenchResearchJsonFirewall: safeReadJson<Record<string, unknown>>(frenchResearchJsonFirewallPath),
    frenchResearchWorkOrder: safeReadJson<Record<string, unknown>>(frenchResearchWorkOrderPath),
    applyPlan: safeReadJson<Record<string, unknown>>(applyPlanPath),
  };

  const checks: Check[] = [];

  const validatorSummary = summaryOf(inputs.validator);
  checks.push(
    statusOf(inputs.validator) === 'PASS' && n(validatorSummary, 'blockers') === 0 && n(validatorSummary, 'warnings') === 0
      ? passCheck({
          id: 'RDY-001',
          title: 'Run artifacts validate structurally',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, validatorPath),
          detail: 'The run validator passed with no structural blockers.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-001',
          title: 'Run artifacts validate structurally',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, validatorPath),
          detail: 'The run validator must pass before Gustav can start generation or apply work.',
          requiredBeforeWork: ['Fix run validator blockers and rerun readiness gate.'],
        }),
  );

  const runVerdictRecheckSummary = summaryOf(inputs.runVerdictRecheck);
  const runVerdictRecheckAllowsGeneration =
    statusOf(inputs.runVerdictRecheck) === 'PASS' &&
    runVerdictRecheckSummary.canPassRDY002Now === true &&
    runVerdictRecheckSummary.mayStartFrenchGeneration === true &&
    runVerdictRecheckSummary.mayModifyProductionAppFiles === false &&
    n(runVerdictRecheckSummary, 'originalBlockers') > 0 &&
    n(runVerdictRecheckSummary, 'originalBlockersResolvedForGeneration') === n(runVerdictRecheckSummary, 'originalBlockers') &&
    n(runVerdictRecheckSummary, 'unresolvedOriginalBlockersForGeneration') === 0 &&
    n(runVerdictRecheckSummary, 'nonVerdictGenerationBlockers') === 0;
  checks.push(
    statusOf(inputs.verdict) === 'PASS' ||
    runVerdictRecheckAllowsGeneration
      ? passCheck({
          id: 'RDY-002',
          title: 'Run verdict allows generation',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, runVerdictRecheckAllowsGeneration ? runVerdictRecheckPath : verdictPath),
          detail: runVerdictRecheckAllowsGeneration
            ? `Run verdict recheck allows generation-only work: original blockers resolved ${n(runVerdictRecheckSummary, 'originalBlockersResolvedForGeneration')}/${n(runVerdictRecheckSummary, 'originalBlockers')}, non-verdict generation blockers ${n(runVerdictRecheckSummary, 'nonVerdictGenerationBlockers')}, production app writes ${String(runVerdictRecheckSummary.mayModifyProductionAppFiles)}.`
            : 'Run verdict is PASS.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-002',
          title: 'Run verdict allows generation',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, verdictPath),
          detail: `Run verdict is ${statusOf(inputs.verdict)}, so generation/apply work is not allowed. Run verdict recheck status is ${statusOf(inputs.runVerdictRecheck)} with canPassRDY002Now=${String(runVerdictRecheckSummary.canPassRDY002Now)}.`,
          requiredBeforeWork: ['Resolve run verdict blockers or keep working in architecture/research mode.'],
        }),
  );

  const storageSummary = summaryOf(inputs.storage);
  checks.push(
    statusOf(inputs.storage) === 'PASS' &&
    n(storageSummary, 'blockers') === 0 &&
    n(storageSummary, 'targetNamespaceRequired') === 0 &&
    n(storageSummary, 'unknownScopeRecords') === 0
      ? passCheck({
          id: 'RDY-010',
          title: 'Storage is target-safe',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, storagePath),
          detail: 'Storage inventory has no target namespace blockers.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-010',
          title: 'Storage is target-safe',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, storagePath),
          detail: `Storage inventory is ${statusOf(inputs.storage)} with ${n(storageSummary, 'blockers')} blockers, ${n(storageSummary, 'targetNamespaceRequired')} target-sensitive records and ${n(storageSummary, 'unknownScopeRecords')} unknown-scope records.`,
          requiredBeforeWork: [
            'Introduce production target key builder.',
            'Move legacy English learning state into en-only compatibility adapters.',
            'Reduce target-sensitive unknown storage records to zero.',
          ],
        }),
  );

  const cloudSummary = summaryOf(inputs.cloud);
  checks.push(
    statusOf(inputs.cloud) === 'PASS' &&
    n(cloudSummary, 'blockers') === 0 &&
    n(cloudSummary, 'blockUnknown') === 0 &&
    n(cloudSummary, 'targetSensitiveLocalKeysMissingFromCloud') === 0
      ? passCheck({
          id: 'RDY-020',
          title: 'Cloud sync is target-safe',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, cloudPath),
          detail: 'Cloud sync mapping has no target or unknown blockers.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-020',
          title: 'Cloud sync is target-safe',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, cloudPath),
          detail: `Cloud mapping is ${statusOf(inputs.cloud)} with ${n(cloudSummary, 'blockers')} blockers, ${n(cloudSummary, 'blockUnknown')} unknown cloud payloads and ${n(cloudSummary, 'targetSensitiveLocalKeysMissingFromCloud')} missing local/cloud decisions.`,
          requiredBeforeWork: [
            'Map cloud learning state under progress/targets/{studyTarget}.',
            'Split mixed cloud payloads by field.',
            'Prove legacy cloud state hydrates en only.',
          ],
        }),
  );

  const mixedSummary = summaryOf(inputs.mixedPayload);
  checks.push(
    statusOf(inputs.mixedPayload) === 'PASS' && n(mixedSummary, 'blockers') === 0
      ? passCheck({
          id: 'RDY-021',
          title: 'Mixed cloud payloads are split',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, mixedPath),
          detail: 'Mixed payload audit has no blockers.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-021',
          title: 'Mixed cloud payloads are split',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, mixedPath),
          detail: `Mixed cloud payload audit is ${statusOf(inputs.mixedPayload)} with ${n(mixedSummary, 'blockers')} blockers.`,
          requiredBeforeWork: [
            'Split achievements_state, daily_stats, user_stats_v1 and stats_daily_breakdown_v1 by global/target policy.',
          ],
        }),
  );

  const achievementSummary = summaryOf(inputs.achievements);
  const tk4AchievementPolicySummary = summaryOf(inputs.tk4AchievementPolicy);
  const tk4AchievementPolicyCoversTaxonomy =
    statusOf(inputs.tk4AchievementPolicy) === 'PASS' &&
    tk4AchievementPolicySummary.tk4PolicyClean === true &&
    tk4AchievementPolicySummary.canPassRDY030Now === true &&
    n(tk4AchievementPolicySummary, 'achievementMixed') === n(achievementSummary, 'mixed') &&
    n(tk4AchievementPolicySummary, 'achievementBlockers') === n(achievementSummary, 'blockers') &&
    n(tk4AchievementPolicySummary, 'mixedPoliciesCovered') === n(achievementSummary, 'blockers') &&
    n(tk4AchievementPolicySummary, 'mixedCloudPayloadBlockers') === 0 &&
    n(tk4AchievementPolicySummary, 'mixedCloudPayloadMixedFields') === 0 &&
    n(tk4AchievementPolicySummary, 'statsPolicies') === 3 &&
    n(tk4AchievementPolicySummary, 'cloudGlobalGamificationKeys') === 4 &&
    tk4AchievementPolicySummary.mayStartFrenchGeneration === false &&
    tk4AchievementPolicySummary.mayModifyProductionAppFiles === false;
  checks.push(
    (statusOf(inputs.achievements) === 'PASS' && n(achievementSummary, 'blockers') === 0) ||
    tk4AchievementPolicyCoversTaxonomy
      ? passCheck({
          id: 'RDY-030',
          title: 'Achievements are globally/target classified',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, tk4AchievementPolicyCoversTaxonomy ? tk4AchievementPolicyPath : achievementPath),
          detail: tk4AchievementPolicyCoversTaxonomy
            ? `Achievement taxonomy has ${n(achievementSummary, 'blockers')} legacy mixed blockers covered by TK4 policy: mixed policies ${n(tk4AchievementPolicySummary, 'mixedPoliciesCovered')}/${n(achievementSummary, 'mixed')}, mixed cloud payload blockers ${n(tk4AchievementPolicySummary, 'mixedCloudPayloadBlockers')} and stats policies ${n(tk4AchievementPolicySummary, 'statsPolicies')}.`
            : 'Achievement taxonomy has no blockers.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-030',
          title: 'Achievements are globally/target classified',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, achievementPath),
          detail: `Achievement taxonomy is ${statusOf(inputs.achievements)} with ${n(achievementSummary, 'blockers')} blockers, ${n(achievementSummary, 'studyTarget')} target achievements and ${n(achievementSummary, 'mixed')} mixed achievements. TK4 policy status is ${statusOf(inputs.tk4AchievementPolicy)} with mixedPoliciesCovered=${n(tk4AchievementPolicySummary, 'mixedPoliciesCovered')} and canPassRDY030Now=${String(tk4AchievementPolicySummary.canPassRDY030Now)}.`,
          requiredBeforeWork: [
            'Implement achievement state split or policy decisions before French can affect achievements.',
          ],
        }),
  );

  const localCloudSummary = summaryOf(inputs.localCloud);
  checks.push(
    statusOf(inputs.localCloud) === 'PASS' && n(localCloudSummary, 'blockers') === 0
      ? passCheck({
          id: 'RDY-040',
          title: 'Local-only and cloud-synced target keys are decided',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, localCloudPath),
          detail: 'Local/cloud decision table has no blockers.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-040',
          title: 'Local-only and cloud-synced target keys are decided',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, localCloudPath),
          detail: `Local/cloud decision table is ${statusOf(inputs.localCloud)} with ${n(localCloudSummary, 'blockers')} blockers.`,
          requiredBeforeWork: [
            'Implement target-scoped local-only keys and target cloud buckets according to the decision table.',
          ],
        }),
  );

  const targetSummary = summaryOf(inputs.targetKeys);
  const targetKeyFinalReconciliationSummary = summaryOf(inputs.targetKeyFinalReconciliation);
  const targetKeyFinalReconciliationCoversPlan =
    statusOf(inputs.targetKeyFinalReconciliation) === 'PASS' &&
    targetKeyFinalReconciliationSummary.finalReconciliationClean === true &&
    targetKeyFinalReconciliationSummary.canPassRDY050Now === true &&
    n(targetKeyFinalReconciliationSummary, 'targetKeyBlockers') === n(targetSummary, 'blockers') &&
    n(targetKeyFinalReconciliationSummary, 'coveredBlockers') === n(targetSummary, 'blockers') &&
    n(targetKeyFinalReconciliationSummary, 'uncoveredBlockers') === 0 &&
    n(targetKeyFinalReconciliationSummary, 'targetKeyBlockerDomains') === n(targetSummary, 'blockerDomains') &&
    n(targetKeyFinalReconciliationSummary, 'coveredBlockerDomains') === n(targetSummary, 'blockerDomains') &&
    n(targetKeyFinalReconciliationSummary, 'rawTargetStorageRecords') === 0 &&
    targetKeyFinalReconciliationSummary.mayStartFrenchGeneration === false &&
    targetKeyFinalReconciliationSummary.mayModifyProductionAppFiles === false;
  checks.push(
    (statusOf(inputs.targetKeys) === 'PASS' && n(targetSummary, 'blockers') === 0 && n(targetSummary, 'blockerDomains') === 0) ||
    targetKeyFinalReconciliationCoversPlan
      ? passCheck({
          id: 'RDY-050',
          title: 'Production target key architecture exists',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, targetKeyFinalReconciliationCoversPlan ? targetKeyFinalReconciliationPath : targetKeyPath),
          detail: targetKeyFinalReconciliationCoversPlan
            ? `Target key integration plan has ${n(targetSummary, 'blockers')} legacy blockers covered by final reconciliation: covered blockers ${n(targetKeyFinalReconciliationSummary, 'coveredBlockers')}/${n(targetSummary, 'blockers')}, covered blocker domains ${n(targetKeyFinalReconciliationSummary, 'coveredBlockerDomains')}/${n(targetSummary, 'blockerDomains')} and raw target storage records ${n(targetKeyFinalReconciliationSummary, 'rawTargetStorageRecords')}.`
            : 'Target key integration plan has no blockers.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-050',
          title: 'Production target key architecture exists',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, targetKeyPath),
          detail: `Target key integration plan is ${statusOf(inputs.targetKeys)} with ${n(targetSummary, 'blockerDomains')} blocker domains and ${n(targetSummary, 'rawTargetStorageRecords')} raw target-sensitive storage records. Final reconciliation status is ${statusOf(inputs.targetKeyFinalReconciliation)} with coveredBlockers=${n(targetKeyFinalReconciliationSummary, 'coveredBlockers')} and canPassRDY050Now=${String(targetKeyFinalReconciliationSummary.canPassRDY050Now)}.`,
          requiredBeforeWork: [
            'Create production StudyTarget model.',
            'Create target_storage_keys builder.',
            'Route highest-risk lesson/trainer/quiz/flashcard stores through target-aware APIs.',
          ],
        }),
  );

  const surfaceSummary = summaryOf(inputs.surfaces);
  const tk5SurfaceGuardsSummary = summaryOf(inputs.tk5SurfaceGuards);
  const tk5SurfaceGuardsCoverInventory =
    statusOf(inputs.tk5SurfaceGuards) === 'PASS' &&
    tk5SurfaceGuardsSummary.tk5SurfaceGuardsClean === true &&
    tk5SurfaceGuardsSummary.canPassRDY060Now === true &&
    n(tk5SurfaceGuardsSummary, 'blockers') === n(surfaceSummary, 'blockers') &&
    n(tk5SurfaceGuardsSummary, 'coveredBlockers') === n(surfaceSummary, 'blockers') &&
    n(tk5SurfaceGuardsSummary, 'uncoveredBlockers') === 0 &&
    n(tk5SurfaceGuardsSummary, 'blockerSurfaces') === n(surfaceSummary, 'blockerSurfaces') &&
    n(tk5SurfaceGuardsSummary, 'coveredBlockerSurfaces') === n(surfaceSummary, 'blockerSurfaces') &&
    n(tk5SurfaceGuardsSummary, 'coveredUserFacingTargetSurfaces') === n(surfaceSummary, 'userFacingTargetSurfaces') &&
    n(tk5SurfaceGuardsSummary, 'coveredDevStudyTargetSurfaces') === n(surfaceSummary, 'devStudyTargetSurfaces') &&
    tk5SurfaceGuardsSummary.mayStartFrenchGeneration === false &&
    tk5SurfaceGuardsSummary.mayModifyProductionAppFiles === false;
  checks.push(
    (statusOf(inputs.surfaces) === 'PASS' && n(surfaceSummary, 'blockerSurfaces') === 0 && n(surfaceSummary, 'blockers') === 0) ||
    tk5SurfaceGuardsCoverInventory
      ? passCheck({
          id: 'RDY-060',
          title: 'User-facing surfaces are target-safe',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, tk5SurfaceGuardsCoverInventory ? tk5SurfaceGuardsPath : surfacePath),
          detail: tk5SurfaceGuardsCoverInventory
            ? `Surface inventory has ${n(surfaceSummary, 'blockers')} legacy blockers covered by TK5 guards: covered blockers ${n(tk5SurfaceGuardsSummary, 'coveredBlockers')}/${n(surfaceSummary, 'blockers')}, covered blocker surfaces ${n(tk5SurfaceGuardsSummary, 'coveredBlockerSurfaces')}/${n(surfaceSummary, 'blockerSurfaces')}, user-facing target surfaces ${n(tk5SurfaceGuardsSummary, 'coveredUserFacingTargetSurfaces')}/${n(surfaceSummary, 'userFacingTargetSurfaces')} and dev StudyTarget surfaces ${n(tk5SurfaceGuardsSummary, 'coveredDevStudyTargetSurfaces')}/${n(surfaceSummary, 'devStudyTargetSurfaces')}.`
            : 'Surface inventory has no blocker surfaces.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-060',
          title: 'User-facing surfaces are target-safe',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, surfacePath),
          detail: `Surface inventory is ${statusOf(inputs.surfaces)} with ${n(surfaceSummary, 'blockerSurfaces')} blocker surfaces, ${n(surfaceSummary, 'userFacingTargetSurfaces')} user-facing target surfaces and ${n(surfaceSummary, 'devStudyTargetSurfaces')} dev StudyTarget surfaces. TK5 surface guards status is ${statusOf(inputs.tk5SurfaceGuards)} with coveredBlockers=${n(tk5SurfaceGuardsSummary, 'coveredBlockers')} and canPassRDY060Now=${String(tk5SurfaceGuardsSummary.canPassRDY060Now)}.`,
          requiredBeforeWork: [
            'Add route-level target-aware adapters for lesson, quiz, trainer, flashcards, achievements and progress surfaces.',
            'Isolate dev StudyTargetLang from production StudyTarget.',
          ],
        }),
  );

  const quizRootSlice = frenchDevSurfaceParitySources.quizzes.slice(
    frenchDevSurfaceParitySources.quizzes.indexOf('export default function QuizzesScreen'),
  );
  const dailyTaskQuizSlice = frenchDevSurfaceParitySources.dailyTasks.slice(
    frenchDevSurfaceParitySources.dailyTasks.indexOf("const openQuizOrFrenchGate = async (level: 'easy' | 'medium' | 'hard')"),
    frenchDevSurfaceParitySources.dailyTasks.indexOf('const openDiagnosticOrFrenchGate'),
  );
  const frenchDevSurfaceParityEvidence = [
    frenchDevSurfaceParitySources.home.includes("testID: 'home-quick-quizzes'"),
    frenchDevSurfaceParitySources.home.includes("key: 'daily'"),
    frenchDevSurfaceParitySources.home.includes("key: 'attest'"),
    frenchDevSurfaceParitySources.home.includes('const visibleQuickItems = quickItems'),
    frenchDevSurfaceParitySources.home.includes('const visibleActivityQuickItems = activityQuickItems'),
    !frenchDevSurfaceParitySources.home.includes("quickItems.filter((item) => item.key !== 'quizzes')"),
    quizRootSlice.includes(': <LevelSelect sourceGated={frenchQuizBlocked}'),
    !quizRootSlice.includes('return <FrenchQuizUnavailable />;'),
    frenchDevSurfaceParitySources.quizzes.includes('const lockedBySourceGate = sourceGated'),
    frenchDevSurfaceParitySources.dailyPhrase.includes('const dailyPhraseGateOpen = dailyPhraseContentAvailableForTarget(studyTarget)'),
    !frenchDevSurfaceParitySources.dailyPhrase.includes("if (studyTarget === 'fr')"),
    frenchDevSurfaceParitySources.diagnostic.includes('const frenchDiagnosticBlocked = !diagnosticContentAvailableForTarget(studyTarget)'),
    frenchDevSurfaceParitySources.diagnostic.includes('FrenchDiagnosticUnavailable'),
    frenchDevSurfaceParitySources.lessonMenu.includes("const frenchAuxiliarySourceGated = studyTarget === 'fr'"),
    frenchDevSurfaceParitySources.lessonMenu.includes('unavailable: frenchAuxiliarySourceGated'),
    !frenchDevSurfaceParitySources.lessonMenu.includes('hideEnglishOnlyAuxiliary'),
    dailyTaskQuizSlice.includes('if (!quizContentAvailableForTarget(studyTarget))'),
    dailyTaskQuizSlice.indexOf('if (!quizContentAvailableForTarget(studyTarget))') >= 0 &&
      dailyTaskQuizSlice.indexOf('if (!quizContentAvailableForTarget(studyTarget))') <
      dailyTaskQuizSlice.indexOf('await AsyncStorage.setItem(quizNavLevelKey(studyTarget), level)'),
    frenchDevSurfaceParitySources.test.includes("describe('Gustav French dev surface parity'"),
  ];
  const frenchDevSurfaceParityPassed = frenchDevSurfaceParityEvidence.every(Boolean);
  checks.push(
    frenchDevSurfaceParityPassed
      ? passCheck({
          id: 'RDY-061',
          title: 'French dev surfaces stay visible behind source gates',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, frenchDevSurfaceParityTestPath),
          detail: `French dev surface parity is locked: ${frenchDevSurfaceParityEvidence.filter(Boolean).length}/${frenchDevSurfaceParityEvidence.length} evidence checks passed across Home, quizzes, daily phrase, diagnostic, lesson menu and daily-task navigation.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-061',
          title: 'French dev surfaces stay visible behind source gates',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, frenchDevSurfaceParityTestPath),
          detail: `French dev surface parity is incomplete: ${frenchDevSurfaceParityEvidence.filter(Boolean).length}/${frenchDevSurfaceParityEvidence.length} evidence checks passed. French dev must preserve visible sections while blocking actions before English source content can load.`,
          requiredBeforeWork: [
            'Keep user-facing English app sections visible for French dev.',
            'Replace studyTarget-based hiding with target-aware source gates.',
            'Run tests/gustav_french_dev_surface_parity.test.ts.',
          ],
        }),
  );

  const migrationAdapterSummary = summaryOf(inputs.migrationAdapters);
  checks.push(
    inputs.migrationAdapters &&
    inputs.migrationAdapters.schemaVersion === 'gustav-migration-adapter-plan-v0' &&
    n(migrationAdapterSummary, 'adapters') > 0
      ? passCheck({
          id: 'RDY-055',
          title: 'Migration adapter plan exists',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, migrationAdapterPath),
          detail: `Migration adapter plan exists with ${n(migrationAdapterSummary, 'adapters')} adapters and ${n(migrationAdapterSummary, 'blockerAdapters')} blocker adapters. This proves the next architecture work is ordered, but it does not by itself allow generation.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-055',
          title: 'Migration adapter plan exists',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, migrationAdapterPath),
          detail: 'No migration adapter plan exists. Gustav needs an ordered implementation strategy before French generation can be considered.',
          requiredBeforeWork: [
            'Create migration_adapter_plan.json with target-aware adapters, dependencies, files and tests.',
          ],
        }),
  );

  const sourceGraphSummary = summaryOf(inputs.sourceGraph);
  checks.push(
    statusOf(inputs.sourceGraph) === 'PASS' && n(sourceGraphSummary, 'unresolvedBlockers') === 0
      ? passCheck({
          id: 'RDY-070',
          title: 'Source graph is extracted and approved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, sourceGraphPath),
          detail: 'Source graph is available and PASS.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-070',
          title: 'Source graph is extracted and approved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, sourceGraphPath),
          detail: inputs.sourceGraph
            ? `Source graph is ${statusOf(inputs.sourceGraph)} with ${n(sourceGraphSummary, 'totalLessons')} lessons, ${n(sourceGraphSummary, 'totalPhrases')} phrases, ${n(sourceGraphSummary, 'totalIntroScreens')} intro screens, ${n(sourceGraphSummary, 'totalQuizzes')} quizzes, ${n(sourceGraphSummary, 'totalPersonalPracticeNodes')} personal-practice nodes, ${n(sourceGraphSummary, 'unresolvedBlockers')} unresolved blockers and ${n(sourceGraphSummary, 'generatedFileUnknowns')} generated-file risks. French cannot be generated until the graph is approved.`
            : 'No approved source_graph/source_graph.json exists yet. French cannot be generated from the English base until the source graph is extracted.',
          requiredBeforeWork: [
            'Approve the extracted English source graph.',
            'Resolve generated runtime phrase-file policy before using it as French source material.',
            'Run pedagogical/source quality audit over the extracted graph.',
          ],
        }),
  );

  const sourceGraphQualitySummary = summaryOf(inputs.sourceGraphQuality);
  checks.push(
    statusOf(inputs.sourceGraphQuality) === 'PASS' &&
    n(sourceGraphQualitySummary, 'blockers') === 0 &&
    n(sourceGraphQualitySummary, 'highRisks') === 0 &&
    sourceGraphQualitySummary.canApproveForFrenchGeneration === true
      ? passCheck({
          id: 'RDY-071',
          title: 'Source graph quality audit approves generation input',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, sourceGraphQualityPath),
          detail: 'Source graph quality audit is PASS and approves French generation input.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-071',
          title: 'Source graph quality audit approves generation input',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, sourceGraphQualityPath),
          detail: inputs.sourceGraphQuality
            ? `Source graph quality audit is ${statusOf(inputs.sourceGraphQuality)} with ${n(sourceGraphQualitySummary, 'blockers')} blockers, ${n(sourceGraphQualitySummary, 'highRisks')} high risks, ${n(sourceGraphQualitySummary, 'generatedFiles')} generated files and ${n(sourceGraphQualitySummary, 'generatedPhraseEntries')} generated phrase entries. It does not approve French generation input.`
            : 'No source graph quality audit exists yet.',
          requiredBeforeWork: [
            'Resolve source-truth policy for generated runtime phrase files.',
            'Reduce source graph quality blockers and high risks to zero.',
            'Record explicit approval before French generation.',
          ],
        }),
  );

  const generatedSourceTruthSummary = summaryOf(inputs.generatedSourceTruth);
  checks.push(
    statusOf(inputs.generatedSourceTruth) === 'PASS' &&
    n(generatedSourceTruthSummary, 'blockers') === 0 &&
    n(generatedSourceTruthSummary, 'highRisks') === 0 &&
    generatedSourceTruthSummary.canApproveGeneratedRuntimeAsFrenchSourceTruth === true
      ? passCheck({
          id: 'RDY-072',
          title: 'Generated source-truth policy is resolved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, generatedSourceTruthPath),
          detail: 'Generated source-truth audit is PASS and generated runtime source policy is resolved.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-072',
          title: 'Generated source-truth policy is resolved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, generatedSourceTruthPath),
          detail: inputs.generatedSourceTruth
            ? `Generated source-truth audit is ${statusOf(inputs.generatedSourceTruth)} with ${n(generatedSourceTruthSummary, 'blockers')} blockers, ${n(generatedSourceTruthSummary, 'highRisks')} high risks, ${n(generatedSourceTruthSummary, 'usedAsPhraseSourceInGraph')} generated artifact used as phrase source and ${n(generatedSourceTruthSummary, 'generatedPhraseEntries')} generated phrase entries.`
            : 'No generated source-truth audit exists yet.',
          requiredBeforeWork: [
            'Provide canonical source or explicit read-only evidence approval for generated lesson 9-16 phrase runtime.',
            'Keep generated support files evidence-only unless target architecture maps them.',
            'Rerun source graph, quality and readiness gates.',
          ],
        }),
  );

  const generatedSupportIsolationSummary = summaryOf(inputs.generatedSupportIsolation);
  checks.push(
    statusOf(inputs.generatedSupportIsolation) === 'PASS' &&
    n(generatedSupportIsolationSummary, 'blockers') === 0 &&
    n(generatedSupportIsolationSummary, 'highRisks') === 0 &&
    generatedSupportIsolationSummary.canExcludeFromFrenchSourceTruth === true
      ? passCheck({
          id: 'RDY-078',
          title: 'Generated support files are isolated',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, generatedSupportIsolationPath),
          detail: 'Generated ES support files are isolated from the source graph and excluded from French source truth.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-078',
          title: 'Generated support files are isolated',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, generatedSupportIsolationPath),
          detail: inputs.generatedSupportIsolation
            ? `Generated support isolation audit is ${statusOf(inputs.generatedSupportIsolation)} with ${n(generatedSupportIsolationSummary, 'blockers')} blockers, ${n(generatedSupportIsolationSummary, 'highRisks')} high risks, ${n(generatedSupportIsolationSummary, 'referencedInSourceGraph')} source graph refs and canExclude=${String(generatedSupportIsolationSummary.canExcludeFromFrenchSourceTruth)}.`
            : 'No generated support isolation audit exists yet.',
          requiredBeforeWork: [
            'Prove generated ES support files are not source graph inputs.',
            'Exclude generated ES support files from French lesson order, intro, quiz and preposition source truth.',
          ],
        }),
  );

  const lesson916CanonicalDraftSummary = summaryOf(inputs.lesson916CanonicalDraft);
  const lesson916DecisionPacketSummary = summaryOf(inputs.lesson916DecisionPacket);
  const lesson916ApprovalSummary = summaryOf(inputs.lesson916ApprovalAudit);
  const lesson916ApprovedCleanDraftResolved =
    statusOf(inputs.lesson916CanonicalDraft) === 'PASS' &&
    n(lesson916CanonicalDraftSummary, 'blockers') === 0 &&
    n(lesson916CanonicalDraftSummary, 'highRisks') === 0 &&
    lesson916CanonicalDraftSummary.canUseAsFrenchSourceTruth === true &&
    statusOf(inputs.lesson916DecisionPacket) === 'PASS' &&
    n(lesson916DecisionPacketSummary, 'blockers') === 0 &&
    n(lesson916DecisionPacketSummary, 'highRisks') === 0 &&
    lesson916DecisionPacketSummary.approvalGranted === true &&
    lesson916DecisionPacketSummary.canResolveLesson916SourceTruth === true &&
    statusOf(inputs.lesson916ApprovalAudit) === 'PASS' &&
    n(lesson916ApprovalSummary, 'blockers') === 0 &&
    n(lesson916ApprovalSummary, 'highRisks') === 0 &&
    lesson916ApprovalSummary.approvalGranted === true &&
    lesson916ApprovalSummary.resolvesLesson916SourceTruth === true &&
    lesson916ApprovalSummary.mayStartFrenchGeneration === false &&
    lesson916ApprovalSummary.mayModifyProductionAppFiles === false;

  const lesson916RecoverySummary = summaryOf(inputs.lesson916SourceRecovery);
  checks.push(
    lesson916ApprovedCleanDraftResolved ||
    (statusOf(inputs.lesson916SourceRecovery) === 'PASS' &&
      n(lesson916RecoverySummary, 'blockers') === 0 &&
      n(lesson916RecoverySummary, 'highRisks') === 0 &&
      lesson916RecoverySummary.canPromoteToCanonicalWithoutReview === true)
      ? passCheck({
          id: 'RDY-073',
          title: 'Lesson 9-16 recovery path is resolved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916SourceRecoveryPath),
          detail: lesson916ApprovedCleanDraftResolved
            ? 'Historical recovery remains review-only and is superseded by approved clean_canonical_draft source truth.'
            : 'Lesson 9-16 source recovery audit is PASS and the recovered candidate is approved as canonical source truth.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-073',
          title: 'Lesson 9-16 recovery candidate is approved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916SourceRecoveryPath),
          detail: inputs.lesson916SourceRecovery
            ? `Lesson 9-16 recovery audit is ${statusOf(inputs.lesson916SourceRecovery)}: best candidate ${String(lesson916RecoverySummary.bestCandidateCommit || 'none')}, ${n(lesson916RecoverySummary, 'bestCandidatePhraseCount')} phrases, ${n(lesson916RecoverySummary, 'bestCandidateIdOverlap')} id overlaps, ${n(lesson916RecoverySummary, 'bestCandidateEnglishExactMatchesById')} exact English matches by id, ${n(lesson916RecoverySummary, 'bestCandidateCurrentOnlyIds')} current-only ids, ${n(lesson916RecoverySummary, 'bestCandidateOnlyIds')} candidate-only ids and ${n(lesson916RecoverySummary, 'blockers')} blockers.`
            : 'No lesson 9-16 source recovery audit exists yet.',
          requiredBeforeWork: [
            'Review the historical lesson 9-16 recovery candidate against current runtime.',
            'Create or approve canonical non-generated source for lessons 9-16.',
            'Rerun source graph, generated source-truth audit and readiness gate after approval.',
          ],
        }),
  );

  const lesson916ReconciliationSummary = summaryOf(inputs.lesson916Reconciliation);
  checks.push(
    lesson916ApprovedCleanDraftResolved ||
    (statusOf(inputs.lesson916Reconciliation) === 'PASS' &&
      n(lesson916ReconciliationSummary, 'blockers') === 0 &&
      n(lesson916ReconciliationSummary, 'highRisks') === 0 &&
      lesson916ReconciliationSummary.canAutoPromoteHistoricalCandidate === true &&
      lesson916ReconciliationSummary.recommendedPolicy === 'approved')
      ? passCheck({
          id: 'RDY-074',
          title: 'Lesson 9-16 reconciliation is resolved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916ReconciliationPath),
          detail: lesson916ApprovedCleanDraftResolved
            ? 'Historical reconciliation remains do_not_auto_merge and is resolved by approved clean_canonical_draft source truth.'
            : 'Lesson 9-16 reconciliation audit is PASS and source-truth policy is approved.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-074',
          title: 'Lesson 9-16 reconciliation is resolved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916ReconciliationPath),
          detail: inputs.lesson916Reconciliation
            ? `Lesson 9-16 reconciliation audit is ${statusOf(inputs.lesson916Reconciliation)}: ${n(lesson916ReconciliationSummary, 'blockerLessons')} blocker lessons, ${n(lesson916ReconciliationSummary, 'totalEnglishExactMatchesById')} exact English matches by id, ${n(lesson916ReconciliationSummary, 'candidateInvalidCanonicalIds')} invalid canonical candidate ids and policy ${String(lesson916ReconciliationSummary.recommendedPolicy || 'unknown')}.`
            : 'No lesson 9-16 reconciliation audit exists yet.',
          requiredBeforeWork: [
            'Choose an explicit lesson 9-16 source-truth policy.',
            'Create reviewed canonical source or approved read-only runtime evidence decision.',
            'Rerun lesson 9-16 source recovery, reconciliation and source graph quality gates.',
          ],
        }),
  );

  checks.push(
    statusOf(inputs.lesson916CanonicalDraft) === 'PASS' &&
    n(lesson916CanonicalDraftSummary, 'blockers') === 0 &&
    n(lesson916CanonicalDraftSummary, 'highRisks') === 0 &&
    lesson916CanonicalDraftSummary.canUseAsFrenchSourceTruth === true
      ? passCheck({
          id: 'RDY-075',
          title: 'Lesson 9-16 canonical source draft is approved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916CanonicalDraftPath),
          detail: 'Lesson 9-16 canonical source draft audit is PASS and approved for French source truth.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-075',
          title: 'Lesson 9-16 canonical source draft is approved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916CanonicalDraftPath),
          detail: inputs.lesson916CanonicalDraft
            ? `Lesson 9-16 canonical source draft audit is ${statusOf(inputs.lesson916CanonicalDraft)}: structurallyClean=${String(lesson916CanonicalDraftSummary.structurallyClean)}, ${n(lesson916CanonicalDraftSummary, 'phrases')} phrases, ${n(lesson916CanonicalDraftSummary, 'spanishFieldLeaks')} Spanish field leaks, ${n(lesson916CanonicalDraftSummary, 'spanishTokenLeakSuspects')} Spanish token suspects, ${n(lesson916CanonicalDraftSummary, 'runtimeGeneratedOrigins')} runtime-generated origins, ${n(lesson916CanonicalDraftSummary, 'blockers')} blockers and ${n(lesson916CanonicalDraftSummary, 'highRisks')} high risks.`
            : 'No lesson 9-16 canonical source draft audit exists yet.',
          requiredBeforeWork: [
            'Review and approve or reject the lesson 9-16 canonical source draft.',
            'If approved, create a non-generated production source extraction apply plan.',
            'Rerun all source-truth gates after approval.',
          ],
        }),
  );

  checks.push(
    statusOf(inputs.lesson916DecisionPacket) === 'PASS' &&
    n(lesson916DecisionPacketSummary, 'blockers') === 0 &&
    n(lesson916DecisionPacketSummary, 'highRisks') === 0 &&
    lesson916DecisionPacketSummary.approvalGranted === true &&
    lesson916DecisionPacketSummary.canResolveLesson916SourceTruth === true
      ? passCheck({
          id: 'RDY-076',
          title: 'Lesson 9-16 source-truth decision is approved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916DecisionPacketPath),
          detail: 'Lesson 9-16 source-truth decision packet is PASS and approval is granted.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-076',
          title: 'Lesson 9-16 source-truth decision is approved',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916DecisionPacketPath),
          detail: inputs.lesson916DecisionPacket
            ? `Lesson 9-16 source-truth decision packet is ${statusOf(inputs.lesson916DecisionPacket)}: ${n(lesson916DecisionPacketSummary, 'options')} options, ${n(lesson916DecisionPacketSummary, 'recommendedOptions')} recommended option, approvalGranted=${String(lesson916DecisionPacketSummary.approvalGranted)}, cleanDraftStructurallyClean=${String(lesson916DecisionPacketSummary.cleanDraftStructurallyClean)}, ${n(lesson916DecisionPacketSummary, 'cleanDraftRuntimeGeneratedOrigins')} runtime-generated origins, ${n(lesson916DecisionPacketSummary, 'blockers')} blockers and ${n(lesson916DecisionPacketSummary, 'highRisks')} high risks.`
            : 'No lesson 9-16 source-truth decision packet exists yet.',
          requiredBeforeWork: [
            'Review the source-truth decision packet.',
            'Approve the clean canonical draft or choose manual rebuild.',
            'Rerun all source-truth gates after approval.',
          ],
        }),
  );

  checks.push(
    statusOf(inputs.lesson916ApprovalAudit) === 'PASS' &&
    n(lesson916ApprovalSummary, 'blockers') === 0 &&
    n(lesson916ApprovalSummary, 'highRisks') === 0 &&
    lesson916ApprovalSummary.approvalGranted === true &&
    lesson916ApprovalSummary.resolvesLesson916SourceTruth === true &&
    lesson916ApprovalSummary.mayStartFrenchGeneration === false &&
    lesson916ApprovalSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-077',
          title: 'Lesson 9-16 source-truth approval is recorded safely',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916ApprovalAuditPath),
          detail: 'Lesson 9-16 source-truth approval audit is PASS and records clean_canonical_draft approval while keeping generation/app writes disabled.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-077',
          title: 'Lesson 9-16 source-truth approval is recorded safely',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, lesson916ApprovalAuditPath),
          detail: inputs.lesson916ApprovalAudit
            ? `Lesson 9-16 source-truth approval audit is ${statusOf(inputs.lesson916ApprovalAudit)}: approvalGranted=${String(lesson916ApprovalSummary.approvalGranted)}, resolves=${String(lesson916ApprovalSummary.resolvesLesson916SourceTruth)}, mayStartFrenchGeneration=${String(lesson916ApprovalSummary.mayStartFrenchGeneration)}, mayModifyProductionAppFiles=${String(lesson916ApprovalSummary.mayModifyProductionAppFiles)}, blockers=${n(lesson916ApprovalSummary, 'blockers')}, highRisks=${n(lesson916ApprovalSummary, 'highRisks')}.`
            : 'No lesson 9-16 source-truth approval audit exists yet.',
          requiredBeforeWork: [
            'Record safe source-truth approval for clean_canonical_draft.',
            'Keep generation/app-write safety flags disabled until the full readiness gate passes.',
          ],
        }),
  );

  const readinessApplyCoverageSummary = summaryOf(inputs.readinessApplyCoverage);
  checks.push(
    statusOf(inputs.readinessApplyCoverage) === 'PASS' &&
    n(readinessApplyCoverageSummary, 'blockers') === 0 &&
    readinessApplyCoverageSummary.applyPlanCoversFailedReadinessChecks === true &&
    readinessApplyCoverageSummary.mayStartFrenchGeneration === false &&
    readinessApplyCoverageSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-085',
          title: 'Apply plan covers failed readiness checks',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, readinessApplyCoveragePath),
          detail: `Readiness apply coverage audit is PASS: ${n(readinessApplyCoverageSummary, 'coveredChecks')} checks covered, ${n(readinessApplyCoverageSummary, 'deferredChecks')} deferred, ${n(readinessApplyCoverageSummary, 'missingChecks')} missing, ${n(readinessApplyCoverageSummary, 'blockers')} blockers.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-085',
          title: 'Apply plan covers failed readiness checks',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, readinessApplyCoveragePath),
          detail: inputs.readinessApplyCoverage
            ? `Readiness apply coverage audit is ${statusOf(inputs.readinessApplyCoverage)} with ${n(readinessApplyCoverageSummary, 'missingChecks')} missing checks, ${n(readinessApplyCoverageSummary, 'missingAdapters')} missing adapters, ${n(readinessApplyCoverageSummary, 'missingTestEvidence')} missing test evidence and ${n(readinessApplyCoverageSummary, 'blockers')} blockers.`
            : 'No readiness apply coverage audit exists. The apply plan must prove it covers each failed readiness check before production apply can be approved.',
          requiredBeforeWork: [
            'Create readiness_apply_coverage_audit.json mapping failed readiness checks to adapters, files and tests.',
          ],
        }),
  );

  const phaseDependencySummary = summaryOf(inputs.phaseDependency);
  checks.push(
    statusOf(inputs.phaseDependency) === 'PASS' &&
    n(phaseDependencySummary, 'blockers') === 0 &&
    n(phaseDependencySummary, 'missingDependencies') === 0 &&
    n(phaseDependencySummary, 'phaseOrderViolations') === 0 &&
    n(phaseDependencySummary, 'phaseMembershipViolations') === 0 &&
    n(phaseDependencySummary, 'adaptersWithoutApplyFiles') === 0 &&
    phaseDependencySummary.canSequencePhasesSafely === true &&
    phaseDependencySummary.mayStartFrenchGeneration === false &&
    phaseDependencySummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-086',
          title: 'Apply phases are dependency-safe',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, phaseDependencyPath),
          detail: `Phase dependency audit is PASS: ${n(phaseDependencySummary, 'phases')} phases, ${n(phaseDependencySummary, 'adapters')} adapters, ${n(phaseDependencySummary, 'dependencies')} dependencies, next executable phase ${String(phaseDependencySummary.nextExecutablePhase || 'unknown')}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-086',
          title: 'Apply phases are dependency-safe',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, phaseDependencyPath),
          detail: inputs.phaseDependency
            ? `Phase dependency audit is ${statusOf(inputs.phaseDependency)} with ${n(phaseDependencySummary, 'missingDependencies')} missing dependencies, ${n(phaseDependencySummary, 'phaseOrderViolations')} phase order violations, ${n(phaseDependencySummary, 'phaseMembershipViolations')} phase membership violations, ${n(phaseDependencySummary, 'adaptersWithoutApplyFiles')} adapters without files and ${n(phaseDependencySummary, 'blockers')} blockers.`
            : 'No phase dependency audit exists. Gustav must prove the apply plan can be executed in dependency order before production apply can be approved.',
          requiredBeforeWork: [
            'Create phase_dependency_audit.json mapping phases, adapters, dependencies, apply files and dirty overlaps.',
          ],
        }),
  );

  const p1ExecutionSliceSummary = summaryOf(inputs.p1ExecutionSlice);
  checks.push(
    statusOf(inputs.p1ExecutionSlice) === 'PASS' &&
    n(p1ExecutionSliceSummary, 'blockers') === 0 &&
    n(p1ExecutionSliceSummary, 'firstSliceDirtyOverlaps') === 0 &&
    n(p1ExecutionSliceSummary, 'firstSliceFiles') > 0 &&
    p1ExecutionSliceSummary.canStartP1AfterApproval === true &&
    p1ExecutionSliceSummary.mayStartFrenchGeneration === false &&
    p1ExecutionSliceSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-087',
          title: 'P1 first slice is safely narrowed',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1ExecutionSlicePath),
          detail: `P1 execution slice audit is PASS: ${n(p1ExecutionSliceSummary, 'p1PlannedFiles')} P1 planned files, first slice ${n(p1ExecutionSliceSummary, 'firstSliceFiles')} files, ${n(p1ExecutionSliceSummary, 'deferredMixedPhaseFiles')} mixed-phase files deferred, ${n(p1ExecutionSliceSummary, 'firstSliceDirtyOverlaps')} first-slice dirty overlaps.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-087',
          title: 'P1 first slice is safely narrowed',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1ExecutionSlicePath),
          detail: inputs.p1ExecutionSlice
            ? `P1 execution slice audit is ${statusOf(inputs.p1ExecutionSlice)} with firstSliceFiles=${n(p1ExecutionSliceSummary, 'firstSliceFiles')}, firstSliceDirtyOverlaps=${n(p1ExecutionSliceSummary, 'firstSliceDirtyOverlaps')}, deferredMixedPhaseFiles=${n(p1ExecutionSliceSummary, 'deferredMixedPhaseFiles')} and ${n(p1ExecutionSliceSummary, 'blockers')} blockers.`
            : 'No P1 execution slice audit exists. P1 must be narrowed into safe sub-slices before production apply can be approved.',
          requiredBeforeWork: [
            'Create p1_execution_slice_audit.json separating P1 core contracts from broad consumer files and later-phase adapters.',
          ],
        }),
  );

  const p1aCoreContractSpecSummary = summaryOf(inputs.p1aCoreContractSpec);
  checks.push(
    statusOf(inputs.p1aCoreContractSpec) === 'PASS' &&
    n(p1aCoreContractSpecSummary, 'blockers') === 0 &&
    n(p1aCoreContractSpecSummary, 'publicApis') >= 6 &&
    n(p1aCoreContractSpecSummary, 'allowedTargetDomains') > 0 &&
    n(p1aCoreContractSpecSummary, 'firstSliceDirtyOverlaps') === 0 &&
    p1aCoreContractSpecSummary.canImplementP1AContractsAfterApproval === true &&
    p1aCoreContractSpecSummary.mayStartFrenchGeneration === false &&
    p1aCoreContractSpecSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-088',
          title: 'P1A core contract is specified',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aCoreContractSpecPath),
          detail: `P1A core contract spec is PASS: ${n(p1aCoreContractSpecSummary, 'publicApis')} APIs, ${n(p1aCoreContractSpecSummary, 'allowedTargetDomains')} allowed target domains, ${n(p1aCoreContractSpecSummary, 'testAssertions')} test assertions and ${n(p1aCoreContractSpecSummary, 'firstSliceDirtyOverlaps')} first-slice dirty overlaps.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-088',
          title: 'P1A core contract is specified',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aCoreContractSpecPath),
          detail: inputs.p1aCoreContractSpec
            ? `P1A core contract spec is ${statusOf(inputs.p1aCoreContractSpec)} with ${n(p1aCoreContractSpecSummary, 'publicApis')} APIs, ${n(p1aCoreContractSpecSummary, 'allowedTargetDomains')} allowed target domains, ${n(p1aCoreContractSpecSummary, 'firstSliceDirtyOverlaps')} dirty overlaps and ${n(p1aCoreContractSpecSummary, 'blockers')} blockers.`
            : 'No P1A core contract spec exists. The first implementation slice needs exact StudyTarget, target key and test contracts before production apply can be approved.',
          requiredBeforeWork: [
            'Create p1a_core_contract_spec.json defining StudyTarget, sourceLocale separation, target key domains, key formats and tests.',
          ],
        }),
  );

  const p1aPreflightSummary = summaryOf(inputs.p1aPreflight);
  checks.push(
    statusOf(inputs.p1aPreflight) === 'PASS' &&
    n(p1aPreflightSummary, 'blockers') === 0 &&
    n(p1aPreflightSummary, 'firstSliceFiles') === 4 &&
    n(p1aPreflightSummary, 'firstSliceExistingNow') === 0 &&
    n(p1aPreflightSummary, 'firstSliceDirtyOverlaps') === 0 &&
    n(p1aPreflightSummary, 'deferredDevBridgeFiles') > 0 &&
    n(p1aPreflightSummary, 'devTargetEntrypoints') > 0 &&
    p1aPreflightSummary.preflightReadyAfterApproval === true &&
    p1aPreflightSummary.mayStartFrenchGeneration === false &&
    p1aPreflightSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-089',
          title: 'P1A implementation preflight is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aPreflightPath),
          detail: `P1A preflight is PASS: ${n(p1aPreflightSummary, 'firstSliceFiles')} first-slice files, ${n(p1aPreflightSummary, 'firstSliceAdditionsReady')} additions ready, ${n(p1aPreflightSummary, 'devTargetEntrypoints')} dev target entrypoints scanned and ${n(p1aPreflightSummary, 'deferredDevBridgeFiles')} dev bridge files deferred.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-089',
          title: 'P1A implementation preflight is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aPreflightPath),
          detail: inputs.p1aPreflight
            ? `P1A preflight is ${statusOf(inputs.p1aPreflight)} with firstSliceFiles=${n(p1aPreflightSummary, 'firstSliceFiles')}, additionsReady=${n(p1aPreflightSummary, 'firstSliceAdditionsReady')}, existingNow=${n(p1aPreflightSummary, 'firstSliceExistingNow')}, dirtyOverlaps=${n(p1aPreflightSummary, 'firstSliceDirtyOverlaps')}, devEntrypoints=${n(p1aPreflightSummary, 'devTargetEntrypoints')} and ${n(p1aPreflightSummary, 'blockers')} blockers.`
            : 'No P1A preflight audit exists. Gustav must prove the first implementation slice can be applied without colliding with the existing dev StudyTargetLang path.',
          requiredBeforeWork: [
            'Create p1a_preflight_audit.json scanning first-slice files, dev StudyTargetLang entrypoints, deferred bridge files and forbidden raw storage key patterns.',
          ],
        }),
  );

  const p1aTestExecutionSummary = summaryOf(inputs.p1aTestExecution);
  checks.push(
    statusOf(inputs.p1aTestExecution) === 'PASS' &&
    n(p1aTestExecutionSummary, 'blockers') === 0 &&
    p1aTestExecutionSummary.jestConfigured === true &&
    p1aTestExecutionSummary.tsJestPresent === true &&
    n(p1aTestExecutionSummary, 'plannedTestFiles') === 2 &&
    n(p1aTestExecutionSummary, 'plannedAssertions') >= 6 &&
    n(p1aTestExecutionSummary, 'plannedTestsMatchingJest') === 2 &&
    n(p1aTestExecutionSummary, 'directCommands') >= 2 &&
    n(p1aTestExecutionSummary, 'companionRegressionTests') >= 3 &&
    n(p1aTestExecutionSummary, 'requiredMocksMissing') === 0 &&
    p1aTestExecutionSummary.testExecutableAfterApproval === true &&
    p1aTestExecutionSummary.mayStartFrenchGeneration === false &&
    p1aTestExecutionSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-091',
          title: 'P1A tests are executable',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aTestExecutionPath),
          detail: `P1A test execution audit is PASS: Jest configured=${String(p1aTestExecutionSummary.jestConfigured)}, ${n(p1aTestExecutionSummary, 'plannedTestFiles')} planned test files, ${n(p1aTestExecutionSummary, 'plannedAssertions')} assertions, ${n(p1aTestExecutionSummary, 'companionRegressionTests')} companion regressions and ${n(p1aTestExecutionSummary, 'requiredMocksMissing')} missing mocks.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-091',
          title: 'P1A tests are executable',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aTestExecutionPath),
          detail: inputs.p1aTestExecution
            ? `P1A test execution audit is ${statusOf(inputs.p1aTestExecution)} with jestConfigured=${String(p1aTestExecutionSummary.jestConfigured)}, plannedTestFiles=${n(p1aTestExecutionSummary, 'plannedTestFiles')}, plannedAssertions=${n(p1aTestExecutionSummary, 'plannedAssertions')}, companionRegressionTests=${n(p1aTestExecutionSummary, 'companionRegressionTests')}, missingMocks=${n(p1aTestExecutionSummary, 'requiredMocksMissing')} and ${n(p1aTestExecutionSummary, 'blockers')} blockers.`
            : 'No P1A test execution audit exists. Gustav must prove the first implementation tests match the existing Jest setup and have runnable commands.',
          requiredBeforeWork: [
            'Create p1a_test_execution_audit.json mapping planned P1A tests, Jest config, required mocks and exact commands.',
          ],
        }),
  );

  const p1aMinimalApplyPacketSummary = summaryOf(inputs.p1aMinimalApplyPacket);
  checks.push(
    statusOf(inputs.p1aMinimalApplyPacket) === 'PASS' &&
    n(p1aMinimalApplyPacketSummary, 'blockers') === 0 &&
    n(p1aMinimalApplyPacketSummary, 'files') === 4 &&
    n(p1aMinimalApplyPacketSummary, 'productionFiles') === 2 &&
    n(p1aMinimalApplyPacketSummary, 'testFiles') === 2 &&
    n(p1aMinimalApplyPacketSummary, 'dirtyWorktreeOverlaps') === 0 &&
    n(p1aMinimalApplyPacketSummary, 'commands') >= 2 &&
    p1aMinimalApplyPacketSummary.readyForApproval === true &&
    p1aMinimalApplyPacketSummary.mayStartFrenchGeneration === false &&
    p1aMinimalApplyPacketSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-092',
          title: 'P1A minimal apply packet is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aMinimalApplyPacketPath),
          detail: `P1A minimal apply packet is PASS: ${n(p1aMinimalApplyPacketSummary, 'files')} files, ${n(p1aMinimalApplyPacketSummary, 'productionFiles')} production files, ${n(p1aMinimalApplyPacketSummary, 'testFiles')} test files, ${n(p1aMinimalApplyPacketSummary, 'dirtyWorktreeOverlaps')} dirty overlaps and ${n(p1aMinimalApplyPacketSummary, 'commands')} commands.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-092',
          title: 'P1A minimal apply packet is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aMinimalApplyPacketPath),
          detail: inputs.p1aMinimalApplyPacket
            ? `P1A minimal apply packet is ${statusOf(inputs.p1aMinimalApplyPacket)} with files=${n(p1aMinimalApplyPacketSummary, 'files')}, productionFiles=${n(p1aMinimalApplyPacketSummary, 'productionFiles')}, testFiles=${n(p1aMinimalApplyPacketSummary, 'testFiles')}, dirtyOverlaps=${n(p1aMinimalApplyPacketSummary, 'dirtyWorktreeOverlaps')}, readyForApproval=${String(p1aMinimalApplyPacketSummary.readyForApproval)} and ${n(p1aMinimalApplyPacketSummary, 'blockers')} blockers.`
            : 'No P1A minimal apply packet exists. Gustav must narrow approval to the first P1A slice before asking to touch production files.',
          requiredBeforeWork: [
            'Create p1a_minimal_apply_packet.json with the four first-slice files, exact commands, rollback and explicit approval text.',
          ],
        }),
  );

  const p1aPostApplyGuardSummary = summaryOf(inputs.p1aPostApplyGuard);
  checks.push(
    statusOf(inputs.p1aPostApplyGuard) === 'PASS' &&
    n(p1aPostApplyGuardSummary, 'blockers') === 0 &&
    n(p1aPostApplyGuardSummary, 'allowedFiles') === 4 &&
    n(p1aPostApplyGuardSummary, 'allowedProductionFiles') === 2 &&
    n(p1aPostApplyGuardSummary, 'allowedTestFiles') === 2 &&
    n(p1aPostApplyGuardSummary, 'forbiddenWriteZones') > 0 &&
    n(p1aPostApplyGuardSummary, 'guardRules') >= 5 &&
    n(p1aPostApplyGuardSummary, 'guardCommands') >= 5 &&
    p1aPostApplyGuardSummary.postApplyStatus === 'not_run' &&
    p1aPostApplyGuardSummary.guardReadyAfterApproval === true &&
    p1aPostApplyGuardSummary.mayStartFrenchGeneration === false &&
    p1aPostApplyGuardSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-093',
          title: 'P1A post-apply guard is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aPostApplyGuardPath),
          detail: `P1A post-apply guard is PASS: ${n(p1aPostApplyGuardSummary, 'allowedFiles')} allowed files, ${n(p1aPostApplyGuardSummary, 'forbiddenWriteZones')} forbidden write zones, ${n(p1aPostApplyGuardSummary, 'guardRules')} guard rules and ${n(p1aPostApplyGuardSummary, 'guardCommands')} guard commands.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-093',
          title: 'P1A post-apply guard is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aPostApplyGuardPath),
          detail: inputs.p1aPostApplyGuard
            ? `P1A post-apply guard is ${statusOf(inputs.p1aPostApplyGuard)} with allowedFiles=${n(p1aPostApplyGuardSummary, 'allowedFiles')}, forbiddenWriteZones=${n(p1aPostApplyGuardSummary, 'forbiddenWriteZones')}, guardRules=${n(p1aPostApplyGuardSummary, 'guardRules')}, guardCommands=${n(p1aPostApplyGuardSummary, 'guardCommands')}, guardReadyAfterApproval=${String(p1aPostApplyGuardSummary.guardReadyAfterApproval)} and ${n(p1aPostApplyGuardSummary, 'blockers')} blockers.`
            : 'No P1A post-apply guard exists. Gustav must be able to verify the future implementation stayed inside the four-file P1A packet.',
          requiredBeforeWork: [
            'Create p1a_post_apply_guard.json with allowed files, forbidden write zones, scope rules and post-apply commands.',
          ],
        }),
  );

  const p1aRollbackCheckpointSummary = summaryOf(inputs.p1aRollbackCheckpoint);
  checks.push(
    statusOf(inputs.p1aRollbackCheckpoint) === 'PASS' &&
    n(p1aRollbackCheckpointSummary, 'blockers') === 0 &&
    n(p1aRollbackCheckpointSummary, 'files') === 4 &&
    n(p1aRollbackCheckpointSummary, 'absentFiles') === 4 &&
    n(p1aRollbackCheckpointSummary, 'existingFiles') === 0 &&
    n(p1aRollbackCheckpointSummary, 'parentDirsReady') === 4 &&
    n(p1aRollbackCheckpointSummary, 'snapshots') === 4 &&
    n(p1aRollbackCheckpointSummary, 'contentHashes') === 0 &&
    n(p1aRollbackCheckpointSummary, 'rollbackActions') === 4 &&
    p1aRollbackCheckpointSummary.checkpointReadyAfterApproval === true &&
    p1aRollbackCheckpointSummary.mayStartFrenchGeneration === false &&
    p1aRollbackCheckpointSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-094',
          title: 'P1A rollback checkpoint is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aRollbackCheckpointPath),
          detail: `P1A rollback checkpoint is PASS: ${n(p1aRollbackCheckpointSummary, 'files')} files snapshotted, ${n(p1aRollbackCheckpointSummary, 'absentFiles')} absent files, ${n(p1aRollbackCheckpointSummary, 'existingFiles')} existing files, ${n(p1aRollbackCheckpointSummary, 'rollbackActions')} delete-new-file rollback actions.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-094',
          title: 'P1A rollback checkpoint is ready',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aRollbackCheckpointPath),
          detail: inputs.p1aRollbackCheckpoint
            ? `P1A rollback checkpoint is ${statusOf(inputs.p1aRollbackCheckpoint)} with files=${n(p1aRollbackCheckpointSummary, 'files')}, absentFiles=${n(p1aRollbackCheckpointSummary, 'absentFiles')}, existingFiles=${n(p1aRollbackCheckpointSummary, 'existingFiles')}, parentDirsReady=${n(p1aRollbackCheckpointSummary, 'parentDirsReady')}, rollbackActions=${n(p1aRollbackCheckpointSummary, 'rollbackActions')}, checkpointReadyAfterApproval=${String(p1aRollbackCheckpointSummary.checkpointReadyAfterApproval)} and ${n(p1aRollbackCheckpointSummary, 'blockers')} blockers.`
            : 'No P1A rollback checkpoint exists. Gustav must snapshot pre-apply state before any approved P1A implementation.',
          requiredBeforeWork: [
            'Create p1a_rollback_checkpoint.json with pre-apply snapshots and delete-new-files-only rollback policy.',
          ],
        }),
  );

  const p1aExpoRouteSafetySummary = summaryOf(inputs.p1aExpoRouteSafety);
  checks.push(
    statusOf(inputs.p1aExpoRouteSafety) === 'PASS' &&
    n(p1aExpoRouteSafetySummary, 'blockers') === 0 &&
    n(p1aExpoRouteSafetySummary, 'plannedAppUtilityFiles') === 2 &&
    n(p1aExpoRouteSafetySummary, 'routeShimRequiredFiles') === 2 &&
    n(p1aExpoRouteSafetySummary, 'existingShimEvidenceFiles') >= 2 &&
    n(p1aExpoRouteSafetySummary, 'pureModuleContracts') === 2 &&
    n(p1aExpoRouteSafetySummary, 'forbiddenImportRules') > 0 &&
    n(p1aExpoRouteSafetySummary, 'forbiddenPatternRules') > 0 &&
    p1aExpoRouteSafetySummary.routeSafeAfterApproval === true &&
    p1aExpoRouteSafetySummary.mayStartFrenchGeneration === false &&
    p1aExpoRouteSafetySummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-095',
          title: 'P1A app modules are Expo-route safe',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aExpoRouteSafetyPath),
          detail: `P1A Expo route safety audit is PASS: ${n(p1aExpoRouteSafetySummary, 'plannedAppUtilityFiles')} planned app utility files, ${n(p1aExpoRouteSafetySummary, 'routeShimRequiredFiles')} required route shims, ${n(p1aExpoRouteSafetySummary, 'pureModuleContracts')} pure module contracts and ${n(p1aExpoRouteSafetySummary, 'forbiddenImportRules')} forbidden import rules.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-095',
          title: 'P1A app modules are Expo-route safe',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aExpoRouteSafetyPath),
          detail: inputs.p1aExpoRouteSafety
            ? `P1A Expo route safety audit is ${statusOf(inputs.p1aExpoRouteSafety)} with plannedAppUtilityFiles=${n(p1aExpoRouteSafetySummary, 'plannedAppUtilityFiles')}, routeShimRequiredFiles=${n(p1aExpoRouteSafetySummary, 'routeShimRequiredFiles')}, pureModuleContracts=${n(p1aExpoRouteSafetySummary, 'pureModuleContracts')}, routeSafeAfterApproval=${String(p1aExpoRouteSafetySummary.routeSafeAfterApproval)} and ${n(p1aExpoRouteSafetySummary, 'blockers')} blockers.`
            : 'No P1A Expo route safety audit exists. Gustav must protect app/ utility files from becoming accidental Expo Router screens.',
          requiredBeforeWork: [
            'Create p1a_expo_route_safety_audit.json requiring route shims and pure-module contracts for P1A app utility files.',
          ],
        }),
  );

  const p1aKeyCollisionSummary = summaryOf(inputs.p1aKeyCollision);
  checks.push(
    statusOf(inputs.p1aKeyCollision) === 'PASS' &&
    n(p1aKeyCollisionSummary, 'blockers') === 0 &&
    n(p1aKeyCollisionSummary, 'targetDomains') === 10 &&
    n(p1aKeyCollisionSummary, 'studyTargets') === 2 &&
    n(p1aKeyCollisionSummary, 'sourceLocales') === 2 &&
    n(p1aKeyCollisionSummary, 'sampleIds') >= 8 &&
    n(p1aKeyCollisionSummary, 'generatedKeys') === n(p1aKeyCollisionSummary, 'uniqueKeys') &&
    n(p1aKeyCollisionSummary, 'collisions') === 0 &&
    n(p1aKeyCollisionSummary, 'separatorLeaks') === 0 &&
    n(p1aKeyCollisionSummary, 'implementationRules') >= 6 &&
    n(p1aKeyCollisionSummary, 'requiredTestAdditions') >= 3 &&
    p1aKeyCollisionSummary.collisionSafeAfterApproval === true &&
    p1aKeyCollisionSummary.mayStartFrenchGeneration === false &&
    p1aKeyCollisionSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-096',
          title: 'P1A target keys are collision-safe',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aKeyCollisionPath),
          detail: `P1A key collision audit is PASS: ${n(p1aKeyCollisionSummary, 'generatedKeys')} generated keys, ${n(p1aKeyCollisionSummary, 'uniqueKeys')} unique keys, ${n(p1aKeyCollisionSummary, 'collisions')} collisions, ${n(p1aKeyCollisionSummary, 'separatorLeaks')} separator leaks and ${n(p1aKeyCollisionSummary, 'requiredTestAdditions')} required test additions.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-096',
          title: 'P1A target keys are collision-safe',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aKeyCollisionPath),
          detail: inputs.p1aKeyCollision
            ? `P1A key collision audit is ${statusOf(inputs.p1aKeyCollision)} with generatedKeys=${n(p1aKeyCollisionSummary, 'generatedKeys')}, uniqueKeys=${n(p1aKeyCollisionSummary, 'uniqueKeys')}, collisions=${n(p1aKeyCollisionSummary, 'collisions')}, separatorLeaks=${n(p1aKeyCollisionSummary, 'separatorLeaks')}, collisionSafeAfterApproval=${String(p1aKeyCollisionSummary.collisionSafeAfterApproval)} and ${n(p1aKeyCollisionSummary, 'blockers')} blockers.`
            : 'No P1A key collision audit exists. Gustav must prove target key formats encode reserved id characters without collisions.',
          requiredBeforeWork: [
            'Create p1a_key_collision_audit.json with id encoding policy, collision matrix and required target-key tests.',
          ],
        }),
  );

  const p1aImportContractSummary = summaryOf(inputs.p1aImportContract);
  checks.push(
    statusOf(inputs.p1aImportContract) === 'PASS' &&
    n(p1aImportContractSummary, 'blockers') === 0 &&
    n(p1aImportContractSummary, 'plannedModules') === 2 &&
    n(p1aImportContractSummary, 'plannedTestFiles') === 2 &&
    n(p1aImportContractSummary, 'importEdges') >= 3 &&
    n(p1aImportContractSummary, 'dependencyCycles') === 0 &&
    n(p1aImportContractSummary, 'forbiddenCycles') === 0 &&
    n(p1aImportContractSummary, 'routeShimContracts') === 2 &&
    n(p1aImportContractSummary, 'probeFiles') === 4 &&
    n(p1aImportContractSummary, 'compileCommands') === 1 &&
    p1aImportContractSummary.compilePassed === true &&
    p1aImportContractSummary.jestImportPathCompatible === true &&
    p1aImportContractSummary.importSafeAfterApproval === true &&
    p1aImportContractSummary.mayStartFrenchGeneration === false &&
    p1aImportContractSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-097',
          title: 'P1A imports compile in isolation',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aImportContractPath),
          detail: `P1A import contract audit is PASS: ${n(p1aImportContractSummary, 'plannedModules')} modules, ${n(p1aImportContractSummary, 'plannedTestFiles')} test files, ${n(p1aImportContractSummary, 'importEdges')} import edges, ${n(p1aImportContractSummary, 'dependencyCycles')} dependency cycles and compilePassed=${String(p1aImportContractSummary.compilePassed)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-097',
          title: 'P1A imports compile in isolation',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aImportContractPath),
          detail: inputs.p1aImportContract
            ? `P1A import contract audit is ${statusOf(inputs.p1aImportContract)} with plannedModules=${n(p1aImportContractSummary, 'plannedModules')}, plannedTestFiles=${n(p1aImportContractSummary, 'plannedTestFiles')}, dependencyCycles=${n(p1aImportContractSummary, 'dependencyCycles')}, compilePassed=${String(p1aImportContractSummary.compilePassed)}, importSafeAfterApproval=${String(p1aImportContractSummary.importSafeAfterApproval)} and ${n(p1aImportContractSummary, 'blockers')} blockers.`
            : 'No P1A import contract audit exists. Gustav must prove planned P1A modules and tests compile through their intended import paths.',
          requiredBeforeWork: [
            'Create p1a_import_contract_audit.json with module export contracts, test import paths, dependency graph and compile probe output.',
          ],
        }),
  );

  const p1aApprovalLockSummary = summaryOf(inputs.p1aApprovalLock);
  checks.push(
    statusOf(inputs.p1aApprovalLock) === 'PASS' &&
    n(p1aApprovalLockSummary, 'blockers') === 0 &&
    n(p1aApprovalLockSummary, 'approvalReceiptCandidates') >= 3 &&
    n(p1aApprovalLockSummary, 'approvalReceiptsPresent') === 0 &&
    n(p1aApprovalLockSummary, 'exactApprovalMatches') === 0 &&
    n(p1aApprovalLockSummary, 'rejectedImplicitCommands') >= 8 &&
    n(p1aApprovalLockSummary, 'requiredApprovalTextLength') > 80 &&
    p1aApprovalLockSummary.packetReadyForApproval === true &&
    p1aApprovalLockSummary.approvalStatusLocked === true &&
    p1aApprovalLockSummary.exactApprovalRequired === true &&
    p1aApprovalLockSummary.implicitApprovalRejected === true &&
    p1aApprovalLockSummary.accidentalApplyBlocked === true &&
    p1aApprovalLockSummary.unlockPossibleAfterExactReceipt === true &&
    p1aApprovalLockSummary.mayStartFrenchGeneration === false &&
    p1aApprovalLockSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-098',
          title: 'P1A apply approval is locked to exact receipt',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aApprovalLockPath),
          detail: `P1A approval lock audit is PASS: ${n(p1aApprovalLockSummary, 'approvalReceiptCandidates')} receipt candidates, ${n(p1aApprovalLockSummary, 'approvalReceiptsPresent')} present receipts, ${n(p1aApprovalLockSummary, 'exactApprovalMatches')} exact matches and implicitApprovalRejected=${String(p1aApprovalLockSummary.implicitApprovalRejected)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-098',
          title: 'P1A apply approval is locked to exact receipt',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aApprovalLockPath),
          detail: inputs.p1aApprovalLock
            ? `P1A approval lock audit is ${statusOf(inputs.p1aApprovalLock)} with approvalReceiptsPresent=${n(p1aApprovalLockSummary, 'approvalReceiptsPresent')}, exactApprovalMatches=${n(p1aApprovalLockSummary, 'exactApprovalMatches')}, approvalStatusLocked=${String(p1aApprovalLockSummary.approvalStatusLocked)}, accidentalApplyBlocked=${String(p1aApprovalLockSummary.accidentalApplyBlocked)}, unlockPossibleAfterExactReceipt=${String(p1aApprovalLockSummary.unlockPossibleAfterExactReceipt)} and ${n(p1aApprovalLockSummary, 'blockers')} blockers.`
            : 'No P1A approval lock audit exists. Gustav must prove that only the exact approval receipt can unlock the P1A apply packet.',
          requiredBeforeWork: [
            'Create p1a_approval_lock_audit.json with exact approval text, rejected implicit commands and receipt probes.',
          ],
        }),
  );

  const p1aImplementationBlueprintSummary = summaryOf(inputs.p1aImplementationBlueprint);
  checks.push(
    statusOf(inputs.p1aImplementationBlueprint) === 'PASS' &&
    n(p1aImplementationBlueprintSummary, 'blockers') === 0 &&
    n(p1aImplementationBlueprintSummary, 'blueprintFiles') === 5 &&
    n(p1aImplementationBlueprintSummary, 'plannedProductionFiles') === 2 &&
    n(p1aImplementationBlueprintSummary, 'plannedTestFiles') === 2 &&
    n(p1aImplementationBlueprintSummary, 'dryRunRunners') === 1 &&
    n(p1aImplementationBlueprintSummary, 'assertionGroups') >= 3 &&
    n(p1aImplementationBlueprintSummary, 'assertions') >= 12 &&
    n(p1aImplementationBlueprintSummary, 'compileCommands') === 1 &&
    n(p1aImplementationBlueprintSummary, 'runtimeCommands') === 1 &&
    p1aImplementationBlueprintSummary.compilePassed === true &&
    p1aImplementationBlueprintSummary.runtimePassed === true &&
    p1aImplementationBlueprintSummary.productionFilesStillAbsent === true &&
    p1aImplementationBlueprintSummary.productionTestsStillAbsent === true &&
    p1aImplementationBlueprintSummary.blueprintReadyAfterExactApproval === true &&
    p1aImplementationBlueprintSummary.mayStartFrenchGeneration === false &&
    p1aImplementationBlueprintSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-099',
          title: 'P1A implementation blueprint passes dry-run',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aImplementationBlueprintPath),
          detail: `P1A implementation blueprint audit is PASS: ${n(p1aImplementationBlueprintSummary, 'blueprintFiles')} blueprint files, compilePassed=${String(p1aImplementationBlueprintSummary.compilePassed)}, runtimePassed=${String(p1aImplementationBlueprintSummary.runtimePassed)} and production files still absent=${String(p1aImplementationBlueprintSummary.productionFilesStillAbsent)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-099',
          title: 'P1A implementation blueprint passes dry-run',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aImplementationBlueprintPath),
          detail: inputs.p1aImplementationBlueprint
            ? `P1A implementation blueprint audit is ${statusOf(inputs.p1aImplementationBlueprint)} with blueprintFiles=${n(p1aImplementationBlueprintSummary, 'blueprintFiles')}, compilePassed=${String(p1aImplementationBlueprintSummary.compilePassed)}, runtimePassed=${String(p1aImplementationBlueprintSummary.runtimePassed)}, productionFilesStillAbsent=${String(p1aImplementationBlueprintSummary.productionFilesStillAbsent)}, blueprintReadyAfterExactApproval=${String(p1aImplementationBlueprintSummary.blueprintReadyAfterExactApproval)} and ${n(p1aImplementationBlueprintSummary, 'blockers')} blockers.`
            : 'No P1A implementation blueprint audit exists. Gustav must dry-run the exact first-slice implementation before any approved apply.',
          requiredBeforeWork: [
            'Create p1a_implementation_blueprint_audit.json with exact blueprint files, compile log and runtime check log.',
          ],
        }),
  );

  const p1aBlueprintHashLockSummary = summaryOf(inputs.p1aBlueprintHashLock);
  checks.push(
    statusOf(inputs.p1aBlueprintHashLock) === 'PASS' &&
    n(p1aBlueprintHashLockSummary, 'blockers') === 0 &&
    n(p1aBlueprintHashLockSummary, 'lockedFiles') === 4 &&
    n(p1aBlueprintHashLockSummary, 'lockedProductionFiles') === 2 &&
    n(p1aBlueprintHashLockSummary, 'lockedTestFiles') === 2 &&
    n(p1aBlueprintHashLockSummary, 'targetFilesAbsent') === 4 &&
    n(p1aBlueprintHashLockSummary, 'targetFilesPresent') === 0 &&
    n(p1aBlueprintHashLockSummary, 'hashAlgorithmCount') === 1 &&
    n(p1aBlueprintHashLockSummary, 'uniqueHashes') === 4 &&
    n(p1aBlueprintHashLockSummary, 'exactCopyRules') === 4 &&
    p1aBlueprintHashLockSummary.hashLockReadyAfterExactApproval === true &&
    p1aBlueprintHashLockSummary.driftDetected === false &&
    p1aBlueprintHashLockSummary.productionFilesStillAbsent === true &&
    p1aBlueprintHashLockSummary.productionTestsStillAbsent === true &&
    p1aBlueprintHashLockSummary.mayStartFrenchGeneration === false &&
    p1aBlueprintHashLockSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-100',
          title: 'P1A blueprint hashes are locked',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aBlueprintHashLockPath),
          detail: `P1A blueprint hash lock audit is PASS: ${n(p1aBlueprintHashLockSummary, 'lockedFiles')} locked files, ${n(p1aBlueprintHashLockSummary, 'uniqueHashes')} unique hashes, targetFilesPresent=${n(p1aBlueprintHashLockSummary, 'targetFilesPresent')} and driftDetected=${String(p1aBlueprintHashLockSummary.driftDetected)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-100',
          title: 'P1A blueprint hashes are locked',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aBlueprintHashLockPath),
          detail: inputs.p1aBlueprintHashLock
            ? `P1A blueprint hash lock audit is ${statusOf(inputs.p1aBlueprintHashLock)} with lockedFiles=${n(p1aBlueprintHashLockSummary, 'lockedFiles')}, targetFilesPresent=${n(p1aBlueprintHashLockSummary, 'targetFilesPresent')}, uniqueHashes=${n(p1aBlueprintHashLockSummary, 'uniqueHashes')}, driftDetected=${String(p1aBlueprintHashLockSummary.driftDetected)}, hashLockReadyAfterExactApproval=${String(p1aBlueprintHashLockSummary.hashLockReadyAfterExactApproval)} and ${n(p1aBlueprintHashLockSummary, 'blockers')} blockers.`
            : 'No P1A blueprint hash lock audit exists. Gustav must lock exact blueprint hashes before any approved apply can copy files.',
          requiredBeforeWork: [
            'Create p1a_blueprint_hash_lock_audit.json with SHA-256 hashes for the four P1A target files.',
          ],
        }),
  );

  const p1aApplyTransactionSummary = summaryOf(inputs.p1aApplyTransaction);
  checks.push(
    statusOf(inputs.p1aApplyTransaction) === 'PASS' &&
    n(p1aApplyTransactionSummary, 'blockers') === 0 &&
    n(p1aApplyTransactionSummary, 'transactionSteps') >= 20 &&
    n(p1aApplyTransactionSummary, 'preconditionSteps') >= 3 &&
    n(p1aApplyTransactionSummary, 'copySteps') === 4 &&
    n(p1aApplyTransactionSummary, 'hashVerifySteps') === 4 &&
    n(p1aApplyTransactionSummary, 'testSteps') >= 3 &&
    n(p1aApplyTransactionSummary, 'postApplyGuardSteps') >= 5 &&
    n(p1aApplyTransactionSummary, 'rollbackSteps') === 4 &&
    n(p1aApplyTransactionSummary, 'allowedWriteFiles') === 4 &&
    n(p1aApplyTransactionSummary, 'futureProductionWriteSteps') === 4 &&
    n(p1aApplyTransactionSummary, 'forbiddenWriteZones') >= 10 &&
    n(p1aApplyTransactionSummary, 'exactHashChecks') === 4 &&
    n(p1aApplyTransactionSummary, 'targetFilesAbsent') === 4 &&
    n(p1aApplyTransactionSummary, 'targetFilesPresent') === 0 &&
    p1aApplyTransactionSummary.transactionReadyAfterExactApproval === true &&
    p1aApplyTransactionSummary.exactApprovalReceiptRequired === true &&
    p1aApplyTransactionSummary.approvalStillMissing === true &&
    p1aApplyTransactionSummary.dryRunOnly === true &&
    p1aApplyTransactionSummary.canApplyNow === false &&
    p1aApplyTransactionSummary.mayStartFrenchGeneration === false &&
    p1aApplyTransactionSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-101',
          title: 'P1A apply transaction is planned but locked',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aApplyTransactionPath),
          detail: `P1A apply transaction audit is PASS: ${n(p1aApplyTransactionSummary, 'transactionSteps')} steps, ${n(p1aApplyTransactionSummary, 'copySteps')} future copy steps, ${n(p1aApplyTransactionSummary, 'exactHashChecks')} hash checks, dryRunOnly=${String(p1aApplyTransactionSummary.dryRunOnly)} and canApplyNow=${String(p1aApplyTransactionSummary.canApplyNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-101',
          title: 'P1A apply transaction is planned but locked',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aApplyTransactionPath),
          detail: inputs.p1aApplyTransaction
            ? `P1A apply transaction audit is ${statusOf(inputs.p1aApplyTransaction)} with transactionSteps=${n(p1aApplyTransactionSummary, 'transactionSteps')}, copySteps=${n(p1aApplyTransactionSummary, 'copySteps')}, exactHashChecks=${n(p1aApplyTransactionSummary, 'exactHashChecks')}, dryRunOnly=${String(p1aApplyTransactionSummary.dryRunOnly)}, canApplyNow=${String(p1aApplyTransactionSummary.canApplyNow)}, transactionReadyAfterExactApproval=${String(p1aApplyTransactionSummary.transactionReadyAfterExactApproval)} and ${n(p1aApplyTransactionSummary, 'blockers')} blockers.`
            : 'No P1A apply transaction audit exists. Gustav must define the exact precondition/copy/hash/test/rollback transaction before any approved apply.',
          requiredBeforeWork: [
            'Create p1a_apply_transaction_audit.json with exact transaction steps, hash checks, test commands and rollback steps.',
          ],
        }),
  );

  const p1aTransactionSimulationSummary = summaryOf(inputs.p1aTransactionSimulation);
  checks.push(
    statusOf(inputs.p1aTransactionSimulation) === 'PASS' &&
    n(p1aTransactionSimulationSummary, 'blockers') === 0 &&
    n(p1aTransactionSimulationSummary, 'simulatedFiles') === 4 &&
    n(p1aTransactionSimulationSummary, 'copiedFiles') === 4 &&
    n(p1aTransactionSimulationSummary, 'hashVerifiedFiles') === 4 &&
    n(p1aTransactionSimulationSummary, 'compileCommands') === 1 &&
    n(p1aTransactionSimulationSummary, 'runtimeCommands') === 1 &&
    n(p1aTransactionSimulationSummary, 'rollbackActions') === 4 &&
    n(p1aTransactionSimulationSummary, 'rolledBackFiles') === 4 &&
    n(p1aTransactionSimulationSummary, 'remainingSimulatedTargetFiles') === 0 &&
    p1aTransactionSimulationSummary.copySimulationPassed === true &&
    p1aTransactionSimulationSummary.hashSimulationPassed === true &&
    p1aTransactionSimulationSummary.compilePassed === true &&
    p1aTransactionSimulationSummary.runtimePassed === true &&
    p1aTransactionSimulationSummary.rollbackSimulationPassed === true &&
    p1aTransactionSimulationSummary.transactionSimulationPassed === true &&
    p1aTransactionSimulationSummary.productionFilesStillAbsent === true &&
    p1aTransactionSimulationSummary.productionTestsStillAbsent === true &&
    p1aTransactionSimulationSummary.dryRunOnly === true &&
    p1aTransactionSimulationSummary.canApplyNow === false &&
    p1aTransactionSimulationSummary.mayStartFrenchGeneration === false &&
    p1aTransactionSimulationSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-102',
          title: 'P1A apply transaction simulation passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aTransactionSimulationPath),
          detail: `P1A transaction simulation is PASS: ${n(p1aTransactionSimulationSummary, 'simulatedFiles')} files copied in /private/tmp, ${n(p1aTransactionSimulationSummary, 'hashVerifiedFiles')} hashes verified, compilePassed=${String(p1aTransactionSimulationSummary.compilePassed)}, runtimePassed=${String(p1aTransactionSimulationSummary.runtimePassed)} and rolledBackFiles=${n(p1aTransactionSimulationSummary, 'rolledBackFiles')}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-102',
          title: 'P1A apply transaction simulation passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aTransactionSimulationPath),
          detail: inputs.p1aTransactionSimulation
            ? `P1A transaction simulation is ${statusOf(inputs.p1aTransactionSimulation)} with simulatedFiles=${n(p1aTransactionSimulationSummary, 'simulatedFiles')}, copiedFiles=${n(p1aTransactionSimulationSummary, 'copiedFiles')}, hashVerifiedFiles=${n(p1aTransactionSimulationSummary, 'hashVerifiedFiles')}, compilePassed=${String(p1aTransactionSimulationSummary.compilePassed)}, runtimePassed=${String(p1aTransactionSimulationSummary.runtimePassed)}, rolledBackFiles=${n(p1aTransactionSimulationSummary, 'rolledBackFiles')}, remainingSimulatedTargetFiles=${n(p1aTransactionSimulationSummary, 'remainingSimulatedTargetFiles')}, canApplyNow=${String(p1aTransactionSimulationSummary.canApplyNow)} and ${n(p1aTransactionSimulationSummary, 'blockers')} blockers.`
            : 'No P1A transaction simulation audit exists. Gustav must prove the exact copy/hash/compile/runtime/rollback transaction in /private/tmp before any approved apply.',
          requiredBeforeWork: [
            'Run gustav_p1a_transaction_simulation_audit.ts and keep production app/test files absent.',
          ],
        }),
  );

  const p1aApprovalReceiptFirewallSummary = summaryOf(inputs.p1aApprovalReceiptFirewall);
  checks.push(
    statusOf(inputs.p1aApprovalReceiptFirewall) === 'PASS' &&
    n(p1aApprovalReceiptFirewallSummary, 'blockers') === 0 &&
    n(p1aApprovalReceiptFirewallSummary, 'realReceiptCandidates') === 3 &&
    n(p1aApprovalReceiptFirewallSummary, 'realReceiptsPresent') === 0 &&
    n(p1aApprovalReceiptFirewallSummary, 'exactApprovalMatches') === 0 &&
    n(p1aApprovalReceiptFirewallSummary, 'tempFixtures') === 6 &&
    n(p1aApprovalReceiptFirewallSummary, 'rejectedTempFixtures') === 6 &&
    n(p1aApprovalReceiptFirewallSummary, 'acceptedShapeFixtures') === 1 &&
    n(p1aApprovalReceiptFirewallSummary, 'tempExactShapeBlockedByPath') === 1 &&
    n(p1aApprovalReceiptFirewallSummary, 'implicitCommandFixtures') === 2 &&
    n(p1aApprovalReceiptFirewallSummary, 'implicitCommandsRejected') === 2 &&
    p1aApprovalReceiptFirewallSummary.firewallPassed === true &&
    p1aApprovalReceiptFirewallSummary.exactApprovalRequired === true &&
    p1aApprovalReceiptFirewallSummary.approvalStillMissing === true &&
    p1aApprovalReceiptFirewallSummary.canApplyNow === false &&
    p1aApprovalReceiptFirewallSummary.dryRunOnly === true &&
    p1aApprovalReceiptFirewallSummary.mayStartFrenchGeneration === false &&
    p1aApprovalReceiptFirewallSummary.mayModifyProductionAppFiles === false
      ? passCheck({
          id: 'RDY-103',
          title: 'P1A approval receipt firewall passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aApprovalReceiptFirewallPath),
          detail: `P1A approval receipt firewall is PASS: ${n(p1aApprovalReceiptFirewallSummary, 'realReceiptCandidates')} real receipt paths checked, ${n(p1aApprovalReceiptFirewallSummary, 'tempFixtures')} temp fixtures rejected, exact shape blocked outside accepted path=${n(p1aApprovalReceiptFirewallSummary, 'tempExactShapeBlockedByPath')} and canApplyNow=${String(p1aApprovalReceiptFirewallSummary.canApplyNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-103',
          title: 'P1A approval receipt firewall passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1aApprovalReceiptFirewallPath),
          detail: inputs.p1aApprovalReceiptFirewall
            ? `P1A approval receipt firewall is ${statusOf(inputs.p1aApprovalReceiptFirewall)} with realReceiptsPresent=${n(p1aApprovalReceiptFirewallSummary, 'realReceiptsPresent')}, exactApprovalMatches=${n(p1aApprovalReceiptFirewallSummary, 'exactApprovalMatches')}, tempFixtures=${n(p1aApprovalReceiptFirewallSummary, 'tempFixtures')}, rejectedTempFixtures=${n(p1aApprovalReceiptFirewallSummary, 'rejectedTempFixtures')}, tempExactShapeBlockedByPath=${n(p1aApprovalReceiptFirewallSummary, 'tempExactShapeBlockedByPath')}, canApplyNow=${String(p1aApprovalReceiptFirewallSummary.canApplyNow)} and ${n(p1aApprovalReceiptFirewallSummary, 'blockers')} blockers.`
            : 'No P1A approval receipt firewall audit exists. Gustav must prove implicit commands and temp/wrong receipts cannot unlock P1A apply.',
          requiredBeforeWork: [
            'Run gustav_p1a_approval_receipt_firewall_audit.ts and keep canApplyNow=false until an exact accepted receipt exists.',
          ],
        }),
  );

  const postP1AReadinessProjectionSummary = summaryOf(inputs.postP1AReadinessProjection);
  checks.push(
    statusOf(inputs.postP1AReadinessProjection) === 'PASS' &&
    n(postP1AReadinessProjectionSummary, 'blockers') === 0 &&
    n(postP1AReadinessProjectionSummary, 'currentFailedChecks') === 10 &&
    n(postP1AReadinessProjectionSummary, 'projectedFailedChecksAfterP1A') === 10 &&
    n(postP1AReadinessProjectionSummary, 'projectedGenerationBlockersAfterP1A') === 8 &&
    n(postP1AReadinessProjectionSummary, 'projectedApplyBlockersAfterP1A') === 10 &&
    n(postP1AReadinessProjectionSummary, 'checksResolvedByP1A') === 0 &&
    n(postP1AReadinessProjectionSummary, 'outOfScopeFailedChecks') === 9 &&
    n(postP1AReadinessProjectionSummary, 'p1aScopeFiles') === 4 &&
    postP1AReadinessProjectionSummary.projectionPassed === true &&
    postP1AReadinessProjectionSummary.p1aDoesNotUnlockFrenchGeneration === true &&
    postP1AReadinessProjectionSummary.p1aDoesNotUnlockBroadApply === true &&
    postP1AReadinessProjectionSummary.canApplyNow === false &&
    postP1AReadinessProjectionSummary.mayStartFrenchGenerationAfterP1A === false &&
    postP1AReadinessProjectionSummary.mayModifyProductionAppFiles === false &&
    postP1AReadinessProjectionSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-104',
          title: 'Post-P1A readiness projection stays blocked',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, postP1AReadinessProjectionPath),
          detail: `Post-P1A projection is PASS: ${n(postP1AReadinessProjectionSummary, 'projectedFailedChecksAfterP1A')} failed checks remain, ${n(postP1AReadinessProjectionSummary, 'projectedGenerationBlockersAfterP1A')} generation blockers remain and checksResolvedByP1A=${n(postP1AReadinessProjectionSummary, 'checksResolvedByP1A')}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-104',
          title: 'Post-P1A readiness projection stays blocked',
          severity: 'blocker',
          blocks: ['generation', 'apply'],
          sourceArtifact: path.relative(repoRoot, postP1AReadinessProjectionPath),
          detail: inputs.postP1AReadinessProjection
            ? `Post-P1A projection is ${statusOf(inputs.postP1AReadinessProjection)} with currentFailed=${n(postP1AReadinessProjectionSummary, 'currentFailedChecks')}, projectedFailed=${n(postP1AReadinessProjectionSummary, 'projectedFailedChecksAfterP1A')}, projectedGenerationBlockers=${n(postP1AReadinessProjectionSummary, 'projectedGenerationBlockersAfterP1A')}, checksResolvedByP1A=${n(postP1AReadinessProjectionSummary, 'checksResolvedByP1A')}, mayStartFrenchGenerationAfterP1A=${String(postP1AReadinessProjectionSummary.mayStartFrenchGenerationAfterP1A)} and ${n(postP1AReadinessProjectionSummary, 'blockers')} blockers.`
            : 'No post-P1A readiness projection audit exists. Gustav must prove P1A does not accidentally unlock French generation or broad apply.',
          requiredBeforeWork: [
            'Run gustav_post_p1a_readiness_projection_audit.ts and keep generation/apply blocked after projected P1A.',
          ],
        }),
  );

  const postP1ANextSliceSummary = summaryOf(inputs.postP1ANextSlice);
  checks.push(
    statusOf(inputs.postP1ANextSlice) === 'PASS' &&
    n(postP1ANextSliceSummary, 'blockers') === 0 &&
    postP1ANextSliceSummary.nextSliceDeclared === true &&
    postP1ANextSliceSummary.nextSliceId === 'P1B_DEV_TARGET_ISOLATION' &&
    n(postP1ANextSliceSummary, 'nextSliceFiles') === 4 &&
    n(postP1ANextSliceSummary, 'dirtyOverlaps') === 1 &&
    n(postP1ANextSliceSummary, 'deferredLaterPhaseAdapters') >= 1 &&
    n(postP1ANextSliceSummary, 'entryCriteria') >= 2 &&
    n(postP1ANextSliceSummary, 'exitCriteria') >= 2 &&
    postP1ANextSliceSummary.nextSliceConstrained === true &&
    postP1ANextSliceSummary.requiresP1ACompletion === true &&
    postP1ANextSliceSummary.requiresExactNextSliceApproval === true &&
    postP1ANextSliceSummary.requiresFreshReadForDirtyOverlaps === true &&
    postP1ANextSliceSummary.canStartNextSliceNow === false &&
    postP1ANextSliceSummary.broadApplyStillBlocked === true &&
    postP1ANextSliceSummary.mayStartFrenchGeneration === false &&
    postP1ANextSliceSummary.mayModifyProductionAppFiles === false &&
    postP1ANextSliceSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-105',
          title: 'Post-P1A next slice is constrained',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, postP1ANextSlicePath),
          detail: `Post-P1A next slice audit is PASS: next=${String(postP1ANextSliceSummary.nextSliceId)}, files=${n(postP1ANextSliceSummary, 'nextSliceFiles')}, dirtyOverlaps=${n(postP1ANextSliceSummary, 'dirtyOverlaps')}, canStartNextSliceNow=${String(postP1ANextSliceSummary.canStartNextSliceNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-105',
          title: 'Post-P1A next slice is constrained',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, postP1ANextSlicePath),
          detail: inputs.postP1ANextSlice
            ? `Post-P1A next slice audit is ${statusOf(inputs.postP1ANextSlice)} with next=${String(postP1ANextSliceSummary.nextSliceId)}, files=${n(postP1ANextSliceSummary, 'nextSliceFiles')}, dirtyOverlaps=${n(postP1ANextSliceSummary, 'dirtyOverlaps')}, nextSliceConstrained=${String(postP1ANextSliceSummary.nextSliceConstrained)}, canStartNextSliceNow=${String(postP1ANextSliceSummary.canStartNextSliceNow)} and ${n(postP1ANextSliceSummary, 'blockers')} blockers.`
            : 'No Post-P1A next slice audit exists. Gustav must constrain the next slice before any post-P1A apply work.',
          requiredBeforeWork: [
            'Run gustav_post_p1a_next_slice_audit.ts and keep P1B locked until P1A completion plus exact P1B approval.',
          ],
        }),
  );

  const p1bPreflightSummary = summaryOf(inputs.p1bPreflight);
  checks.push(
    statusOf(inputs.p1bPreflight) === 'PASS' &&
    n(p1bPreflightSummary, 'blockers') === 0 &&
    n(p1bPreflightSummary, 'p1bFiles') === 4 &&
    n(p1bPreflightSummary, 'existingFiles') === 4 &&
    n(p1bPreflightSummary, 'missingFiles') === 0 &&
    n(p1bPreflightSummary, 'dirtyOverlapsPlanned') === 1 &&
    n(p1bPreflightSummary, 'dirtyOverlapsObserved') === 1 &&
    n(p1bPreflightSummary, 'freshReadRequiredFiles') === 1 &&
    n(p1bPreflightSummary, 'exactApprovalReceiptCandidates') === 1 &&
    n(p1bPreflightSummary, 'exactApprovalReceiptsPresent') === 0 &&
    p1bPreflightSummary.preflightPassed === true &&
    p1bPreflightSummary.p1bPreflightReadyAfterP1AAndExactApproval === true &&
    p1bPreflightSummary.requiresP1ACompletion === true &&
    p1bPreflightSummary.requiresExactP1BApproval === true &&
    p1bPreflightSummary.canStartP1BNow === false &&
    p1bPreflightSummary.canApplyNow === false &&
    p1bPreflightSummary.mayStartFrenchGeneration === false &&
    p1bPreflightSummary.mayModifyProductionAppFiles === false &&
    p1bPreflightSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-106',
          title: 'P1B preflight is locked and clean',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bPreflightPath),
          detail: `P1B preflight audit is PASS: ${n(p1bPreflightSummary, 'p1bFiles')} files, ${n(p1bPreflightSummary, 'dirtyOverlapsObserved')} observed dirty overlap, ${n(p1bPreflightSummary, 'freshReadRequiredFiles')} fresh-read requirement and canStartP1BNow=${String(p1bPreflightSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-106',
          title: 'P1B preflight is locked and clean',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bPreflightPath),
          detail: inputs.p1bPreflight
            ? `P1B preflight audit is ${statusOf(inputs.p1bPreflight)} with files=${n(p1bPreflightSummary, 'p1bFiles')}, existing=${n(p1bPreflightSummary, 'existingFiles')}, dirtyObserved=${n(p1bPreflightSummary, 'dirtyOverlapsObserved')}, freshRead=${n(p1bPreflightSummary, 'freshReadRequiredFiles')}, approvalReceiptsPresent=${n(p1bPreflightSummary, 'exactApprovalReceiptsPresent')}, canStartP1BNow=${String(p1bPreflightSummary.canStartP1BNow)} and ${n(p1bPreflightSummary, 'blockers')} blockers.`
            : 'No P1B preflight audit exists. Gustav must verify P1B files, dirty overlap and approval lock before any post-P1A slice work.',
          requiredBeforeWork: [
            'Run gustav_p1b_preflight_audit.ts and keep P1B read-only until P1A completion plus exact P1B approval.',
          ],
        }),
  );

  const p1bDirtyOverlapSnapshotSummary = summaryOf(inputs.p1bDirtyOverlapSnapshot);
  checks.push(
    statusOf(inputs.p1bDirtyOverlapSnapshot) === 'PASS' &&
    n(p1bDirtyOverlapSnapshotSummary, 'blockers') === 0 &&
    n(p1bDirtyOverlapSnapshotSummary, 'snapshotFiles') === 1 &&
    n(p1bDirtyOverlapSnapshotSummary, 'dirtyOverlapFiles') === 1 &&
    n(p1bDirtyOverlapSnapshotSummary, 'userOwnedDirtyFiles') === 1 &&
    n(p1bDirtyOverlapSnapshotSummary, 'freshReadRequiredFiles') === 1 &&
    n(p1bDirtyOverlapSnapshotSummary, 'filesWithHeadSnapshot') === 1 &&
    n(p1bDirtyOverlapSnapshotSummary, 'filesWithWorkingTreeSnapshot') === 1 &&
    n(p1bDirtyOverlapSnapshotSummary, 'filesWithHashChange') === 1 &&
    n(p1bDirtyOverlapSnapshotSummary, 'diffAdditions') > 0 &&
    n(p1bDirtyOverlapSnapshotSummary, 'diffDeletions') > 0 &&
    n(p1bDirtyOverlapSnapshotSummary, 'exactApprovalReceiptsPresent') === 0 &&
    p1bDirtyOverlapSnapshotSummary.snapshotPassed === true &&
    p1bDirtyOverlapSnapshotSummary.dirtyOverlapPreserved === true &&
    p1bDirtyOverlapSnapshotSummary.requiresFreshReadBeforeEdit === true &&
    p1bDirtyOverlapSnapshotSummary.requiresExactP1BApproval === true &&
    p1bDirtyOverlapSnapshotSummary.canStartP1BNow === false &&
    p1bDirtyOverlapSnapshotSummary.canApplyNow === false &&
    p1bDirtyOverlapSnapshotSummary.mayStartFrenchGeneration === false &&
    p1bDirtyOverlapSnapshotSummary.mayModifyProductionAppFiles === false &&
    p1bDirtyOverlapSnapshotSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-107',
          title: 'P1B dirty overlap snapshot is preserved',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bDirtyOverlapSnapshotPath),
          detail: `P1B dirty overlap snapshot is PASS: ${n(p1bDirtyOverlapSnapshotSummary, 'snapshotFiles')} snapshot, ${n(p1bDirtyOverlapSnapshotSummary, 'userOwnedDirtyFiles')} user-owned dirty file, +${n(p1bDirtyOverlapSnapshotSummary, 'diffAdditions')}/-${n(p1bDirtyOverlapSnapshotSummary, 'diffDeletions')} diff and canStartP1BNow=${String(p1bDirtyOverlapSnapshotSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-107',
          title: 'P1B dirty overlap snapshot is preserved',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bDirtyOverlapSnapshotPath),
          detail: inputs.p1bDirtyOverlapSnapshot
            ? `P1B dirty overlap snapshot is ${statusOf(inputs.p1bDirtyOverlapSnapshot)} with snapshotFiles=${n(p1bDirtyOverlapSnapshotSummary, 'snapshotFiles')}, userOwnedDirtyFiles=${n(p1bDirtyOverlapSnapshotSummary, 'userOwnedDirtyFiles')}, headSnapshots=${n(p1bDirtyOverlapSnapshotSummary, 'filesWithHeadSnapshot')}, worktreeSnapshots=${n(p1bDirtyOverlapSnapshotSummary, 'filesWithWorkingTreeSnapshot')}, diffAdditions=${n(p1bDirtyOverlapSnapshotSummary, 'diffAdditions')}, diffDeletions=${n(p1bDirtyOverlapSnapshotSummary, 'diffDeletions')}, canStartP1BNow=${String(p1bDirtyOverlapSnapshotSummary.canStartP1BNow)} and ${n(p1bDirtyOverlapSnapshotSummary, 'blockers')} blockers.`
            : 'No P1B dirty-overlap snapshot audit exists. Gustav must preserve dirty overlap metadata before any future P1B work.',
          requiredBeforeWork: [
            'Run gustav_p1b_dirty_overlap_snapshot_audit.ts and require fresh-read plus exact approval before P1B edits.',
          ],
        }),
  );

  const p1bApprovalReceiptFirewallSummary = summaryOf(inputs.p1bApprovalReceiptFirewall);
  checks.push(
    statusOf(inputs.p1bApprovalReceiptFirewall) === 'PASS' &&
    n(p1bApprovalReceiptFirewallSummary, 'blockers') === 0 &&
    n(p1bApprovalReceiptFirewallSummary, 'realReceiptCandidates') === 1 &&
    n(p1bApprovalReceiptFirewallSummary, 'realReceiptsPresent') === 0 &&
    n(p1bApprovalReceiptFirewallSummary, 'exactApprovalMatches') === 0 &&
    n(p1bApprovalReceiptFirewallSummary, 'tempFixtures') === 7 &&
    n(p1bApprovalReceiptFirewallSummary, 'rejectedTempFixtures') === 7 &&
    n(p1bApprovalReceiptFirewallSummary, 'acceptedShapeFixtures') === 1 &&
    n(p1bApprovalReceiptFirewallSummary, 'tempExactShapeBlockedByPath') === 1 &&
    n(p1bApprovalReceiptFirewallSummary, 'implicitCommandFixtures') === 2 &&
    n(p1bApprovalReceiptFirewallSummary, 'implicitCommandsRejected') === 2 &&
    p1bApprovalReceiptFirewallSummary.firewallPassed === true &&
    p1bApprovalReceiptFirewallSummary.requiresP1ACompletion === true &&
    p1bApprovalReceiptFirewallSummary.requiresFreshReadBeforeEdit === true &&
    p1bApprovalReceiptFirewallSummary.requiresExactP1BApproval === true &&
    p1bApprovalReceiptFirewallSummary.approvalStillMissing === true &&
    p1bApprovalReceiptFirewallSummary.canStartP1BNow === false &&
    p1bApprovalReceiptFirewallSummary.canApplyNow === false &&
    p1bApprovalReceiptFirewallSummary.mayStartFrenchGeneration === false &&
    p1bApprovalReceiptFirewallSummary.mayModifyProductionAppFiles === false &&
    p1bApprovalReceiptFirewallSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-108',
          title: 'P1B approval receipt firewall passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bApprovalReceiptFirewallPath),
          detail: `P1B approval receipt firewall is PASS: ${n(p1bApprovalReceiptFirewallSummary, 'realReceiptCandidates')} real receipt path checked, ${n(p1bApprovalReceiptFirewallSummary, 'tempFixtures')} temp fixtures rejected, exact shape blocked outside accepted path=${n(p1bApprovalReceiptFirewallSummary, 'tempExactShapeBlockedByPath')} and canStartP1BNow=${String(p1bApprovalReceiptFirewallSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-108',
          title: 'P1B approval receipt firewall passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bApprovalReceiptFirewallPath),
          detail: inputs.p1bApprovalReceiptFirewall
            ? `P1B approval receipt firewall is ${statusOf(inputs.p1bApprovalReceiptFirewall)} with realReceiptsPresent=${n(p1bApprovalReceiptFirewallSummary, 'realReceiptsPresent')}, exactApprovalMatches=${n(p1bApprovalReceiptFirewallSummary, 'exactApprovalMatches')}, tempFixtures=${n(p1bApprovalReceiptFirewallSummary, 'tempFixtures')}, rejectedTempFixtures=${n(p1bApprovalReceiptFirewallSummary, 'rejectedTempFixtures')}, tempExactShapeBlockedByPath=${n(p1bApprovalReceiptFirewallSummary, 'tempExactShapeBlockedByPath')}, canStartP1BNow=${String(p1bApprovalReceiptFirewallSummary.canStartP1BNow)} and ${n(p1bApprovalReceiptFirewallSummary, 'blockers')} blockers.`
            : 'No P1B approval receipt firewall audit exists. Gustav must prove implicit commands and wrong/temp receipts cannot unlock P1B.',
          requiredBeforeWork: [
            'Run gustav_p1b_approval_receipt_firewall_audit.ts and keep canStartP1BNow=false until P1A completion, fresh-read and exact P1B receipt.',
          ],
        }),
  );

  const p1bApprovalReceiptContractSummary = summaryOf(inputs.p1bApprovalReceiptContract);
  checks.push(
    statusOf(inputs.p1bApprovalReceiptContract) === 'PASS' &&
    n(p1bApprovalReceiptContractSummary, 'blockers') === 0 &&
    n(p1bApprovalReceiptContractSummary, 'approvedFiles') === 4 &&
    n(p1bApprovalReceiptContractSummary, 'canonicalReceiptPaths') === 1 &&
    n(p1bApprovalReceiptContractSummary, 'requiredFields') === 8 &&
    n(p1bApprovalReceiptContractSummary, 'unlockPreconditions') === 5 &&
    n(p1bApprovalReceiptContractSummary, 'rejectedImplicitCommands') >= 6 &&
    p1bApprovalReceiptContractSummary.contractReady === true &&
    p1bApprovalReceiptContractSummary.realReceiptPresent === false &&
    n(p1bApprovalReceiptContractSummary, 'exactApprovalMatches') === 0 &&
    p1bApprovalReceiptContractSummary.p1bUnlockStillBlocked === true &&
    p1bApprovalReceiptContractSummary.requiresP1ACompletion === true &&
    p1bApprovalReceiptContractSummary.requiresFreshReadBeforeEdit === true &&
    p1bApprovalReceiptContractSummary.requiresExactP1BApproval === true &&
    p1bApprovalReceiptContractSummary.canStartP1BNow === false &&
    p1bApprovalReceiptContractSummary.canApplyNow === false &&
    p1bApprovalReceiptContractSummary.mayStartFrenchGeneration === false &&
    p1bApprovalReceiptContractSummary.mayModifyProductionAppFiles === false &&
    p1bApprovalReceiptContractSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-109',
          title: 'P1B approval receipt contract is explicit',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bApprovalReceiptContractPath),
          detail: `P1B approval receipt contract is PASS: ${n(p1bApprovalReceiptContractSummary, 'requiredFields')} required fields, ${n(p1bApprovalReceiptContractSummary, 'unlockPreconditions')} unlock preconditions, ${n(p1bApprovalReceiptContractSummary, 'approvedFiles')} approved files and canStartP1BNow=${String(p1bApprovalReceiptContractSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-109',
          title: 'P1B approval receipt contract is explicit',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bApprovalReceiptContractPath),
          detail: inputs.p1bApprovalReceiptContract
            ? `P1B approval receipt contract is ${statusOf(inputs.p1bApprovalReceiptContract)} with approvedFiles=${n(p1bApprovalReceiptContractSummary, 'approvedFiles')}, canonicalReceiptPaths=${n(p1bApprovalReceiptContractSummary, 'canonicalReceiptPaths')}, requiredFields=${n(p1bApprovalReceiptContractSummary, 'requiredFields')}, realReceiptPresent=${String(p1bApprovalReceiptContractSummary.realReceiptPresent)}, canStartP1BNow=${String(p1bApprovalReceiptContractSummary.canStartP1BNow)} and ${n(p1bApprovalReceiptContractSummary, 'blockers')} blockers.`
            : 'No P1B approval receipt contract audit exists. Gustav must define the canonical receipt schema before any future P1B approval can be trusted.',
          requiredBeforeWork: [
            'Run gustav_p1b_approval_receipt_contract_audit.ts and keep P1B locked until P1A completion, fresh-read and exact P1B receipt.',
          ],
        }),
  );

  const p1bUnlockPrerequisiteMatrixSummary = summaryOf(inputs.p1bUnlockPrerequisiteMatrix);
  checks.push(
    statusOf(inputs.p1bUnlockPrerequisiteMatrix) === 'PASS' &&
    n(p1bUnlockPrerequisiteMatrixSummary, 'blockers') === 0 &&
    n(p1bUnlockPrerequisiteMatrixSummary, 'scenarios') === 6 &&
    n(p1bUnlockPrerequisiteMatrixSummary, 'blockedScenarios') === 5 &&
    n(p1bUnlockPrerequisiteMatrixSummary, 'futureUnlockScenarios') === 1 &&
    n(p1bUnlockPrerequisiteMatrixSummary, 'missingPrerequisiteUnlocks') === 0 &&
    p1bUnlockPrerequisiteMatrixSummary.matrixPassed === true &&
    p1bUnlockPrerequisiteMatrixSummary.andGateEnforced === true &&
    p1bUnlockPrerequisiteMatrixSummary.p1aCompletionRequired === true &&
    p1bUnlockPrerequisiteMatrixSummary.exactReceiptRequired === true &&
    p1bUnlockPrerequisiteMatrixSummary.freshReadRequired === true &&
    p1bUnlockPrerequisiteMatrixSummary.dirtyOverlapPreservationRequired === true &&
    p1bUnlockPrerequisiteMatrixSummary.currentPrerequisitesComplete === false &&
    p1bUnlockPrerequisiteMatrixSummary.canStartP1BNow === false &&
    p1bUnlockPrerequisiteMatrixSummary.canApplyNow === false &&
    p1bUnlockPrerequisiteMatrixSummary.mayStartFrenchGeneration === false &&
    p1bUnlockPrerequisiteMatrixSummary.mayModifyProductionAppFiles === false &&
    p1bUnlockPrerequisiteMatrixSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-110',
          title: 'P1B unlock requires every prerequisite',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bUnlockPrerequisiteMatrixPath),
          detail: `P1B unlock prerequisite matrix is PASS: ${n(p1bUnlockPrerequisiteMatrixSummary, 'scenarios')} scenarios, ${n(p1bUnlockPrerequisiteMatrixSummary, 'blockedScenarios')} blocked, ${n(p1bUnlockPrerequisiteMatrixSummary, 'futureUnlockScenarios')} future unlock and missingPrerequisiteUnlocks=${n(p1bUnlockPrerequisiteMatrixSummary, 'missingPrerequisiteUnlocks')}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-110',
          title: 'P1B unlock requires every prerequisite',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bUnlockPrerequisiteMatrixPath),
          detail: inputs.p1bUnlockPrerequisiteMatrix
            ? `P1B unlock prerequisite matrix is ${statusOf(inputs.p1bUnlockPrerequisiteMatrix)} with scenarios=${n(p1bUnlockPrerequisiteMatrixSummary, 'scenarios')}, blocked=${n(p1bUnlockPrerequisiteMatrixSummary, 'blockedScenarios')}, futureUnlocks=${n(p1bUnlockPrerequisiteMatrixSummary, 'futureUnlockScenarios')}, missingPrerequisiteUnlocks=${n(p1bUnlockPrerequisiteMatrixSummary, 'missingPrerequisiteUnlocks')}, canStartP1BNow=${String(p1bUnlockPrerequisiteMatrixSummary.canStartP1BNow)} and ${n(p1bUnlockPrerequisiteMatrixSummary, 'blockers')} blockers.`
            : 'No P1B unlock prerequisite matrix audit exists. Gustav must prove P1B cannot unlock from a partial prerequisite set.',
          requiredBeforeWork: [
            'Run gustav_p1b_unlock_prerequisite_matrix_audit.ts and keep P1B locked until P1A completion, exact receipt and fresh-read are all present.',
          ],
        }),
  );

  const p1bFreshReadReceiptContractSummary = summaryOf(inputs.p1bFreshReadReceiptContract);
  checks.push(
    statusOf(inputs.p1bFreshReadReceiptContract) === 'PASS' &&
    n(p1bFreshReadReceiptContractSummary, 'blockers') === 0 &&
    n(p1bFreshReadReceiptContractSummary, 'dirtyOverlapFiles') === 1 &&
    n(p1bFreshReadReceiptContractSummary, 'canonicalFreshReadReceiptPaths') === 1 &&
    n(p1bFreshReadReceiptContractSummary, 'requiredFields') === 10 &&
    n(p1bFreshReadReceiptContractSummary, 'staleReadProbes') === 5 &&
    n(p1bFreshReadReceiptContractSummary, 'rejectedStaleReadProbes') === 5 &&
    p1bFreshReadReceiptContractSummary.contractReady === true &&
    p1bFreshReadReceiptContractSummary.freshReadReceiptPresent === false &&
    p1bFreshReadReceiptContractSummary.currentWorkingTreeHashRecorded === true &&
    p1bFreshReadReceiptContractSummary.currentWorkingTreeHashMatchesSnapshot === false &&
    p1bFreshReadReceiptContractSummary.snapshotHashDriftDetected === true &&
    p1bFreshReadReceiptContractSummary.snapshotRefreshRequiredBeforeP1B === true &&
    p1bFreshReadReceiptContractSummary.staleReadRejected === true &&
    p1bFreshReadReceiptContractSummary.requiresP1ACompletion === true &&
    p1bFreshReadReceiptContractSummary.requiresExactP1BApproval === true &&
    p1bFreshReadReceiptContractSummary.requiresFreshReadAfterApproval === true &&
    p1bFreshReadReceiptContractSummary.canStartP1BNow === false &&
    p1bFreshReadReceiptContractSummary.canApplyNow === false &&
    p1bFreshReadReceiptContractSummary.mayStartFrenchGeneration === false &&
    p1bFreshReadReceiptContractSummary.mayModifyProductionAppFiles === false &&
    p1bFreshReadReceiptContractSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-111',
          title: 'P1B fresh-read receipt contract is explicit',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bFreshReadReceiptContractPath),
          detail: `P1B fresh-read receipt contract is PASS: ${n(p1bFreshReadReceiptContractSummary, 'requiredFields')} required fields, ${n(p1bFreshReadReceiptContractSummary, 'staleReadProbes')} stale-read probes rejected, snapshotDrift=${String(p1bFreshReadReceiptContractSummary.snapshotHashDriftDetected)} and freshReadReceiptPresent=${String(p1bFreshReadReceiptContractSummary.freshReadReceiptPresent)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-111',
          title: 'P1B fresh-read receipt contract is explicit',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bFreshReadReceiptContractPath),
          detail: inputs.p1bFreshReadReceiptContract
            ? `P1B fresh-read receipt contract is ${statusOf(inputs.p1bFreshReadReceiptContract)} with dirtyOverlapFiles=${n(p1bFreshReadReceiptContractSummary, 'dirtyOverlapFiles')}, requiredFields=${n(p1bFreshReadReceiptContractSummary, 'requiredFields')}, staleReadProbes=${n(p1bFreshReadReceiptContractSummary, 'staleReadProbes')}, rejectedStaleReadProbes=${n(p1bFreshReadReceiptContractSummary, 'rejectedStaleReadProbes')}, snapshotDrift=${String(p1bFreshReadReceiptContractSummary.snapshotHashDriftDetected)}, freshReadReceiptPresent=${String(p1bFreshReadReceiptContractSummary.freshReadReceiptPresent)}, canStartP1BNow=${String(p1bFreshReadReceiptContractSummary.canStartP1BNow)} and ${n(p1bFreshReadReceiptContractSummary, 'blockers')} blockers.`
            : 'No P1B fresh-read receipt contract audit exists. Gustav must define how the dirty overlap is freshly re-read after approval.',
          requiredBeforeWork: [
            'Run gustav_p1b_fresh_read_receipt_contract_audit.ts and keep P1B locked until fresh-read receipt exists after exact approval.',
          ],
        }),
  );

  const p1bDirtyOverlapDriftResponseSummary = summaryOf(inputs.p1bDirtyOverlapDriftResponse);
  checks.push(
    statusOf(inputs.p1bDirtyOverlapDriftResponse) === 'PASS' &&
    n(p1bDirtyOverlapDriftResponseSummary, 'blockers') === 0 &&
    n(p1bDirtyOverlapDriftResponseSummary, 'dirtyOverlapFiles') === 1 &&
    n(p1bDirtyOverlapDriftResponseSummary, 'driftedDirtyOverlapFiles') === 1 &&
    n(p1bDirtyOverlapDriftResponseSummary, 'refreshSteps') === 8 &&
    n(p1bDirtyOverlapDriftResponseSummary, 'forbiddenActions') === 6 &&
    n(p1bDirtyOverlapDriftResponseSummary, 'acceptanceCriteria') === 7 &&
    p1bDirtyOverlapDriftResponseSummary.driftResponsePlanReady === true &&
    p1bDirtyOverlapDriftResponseSummary.oldSnapshotMayAuthorizeP1B === false &&
    p1bDirtyOverlapDriftResponseSummary.snapshotRefreshRequiredBeforeP1B === true &&
    p1bDirtyOverlapDriftResponseSummary.freshReadReceiptRequiredAfterApproval === true &&
    p1bDirtyOverlapDriftResponseSummary.exactP1BApprovalRequired === true &&
    p1bDirtyOverlapDriftResponseSummary.canStartP1BNow === false &&
    p1bDirtyOverlapDriftResponseSummary.canApplyNow === false &&
    p1bDirtyOverlapDriftResponseSummary.mayStartFrenchGeneration === false &&
    p1bDirtyOverlapDriftResponseSummary.mayModifyProductionAppFiles === false &&
    p1bDirtyOverlapDriftResponseSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-112',
          title: 'P1B dirty-overlap drift response is locked',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bDirtyOverlapDriftResponsePath),
          detail: `P1B dirty-overlap drift response is PASS: ${n(p1bDirtyOverlapDriftResponseSummary, 'driftedDirtyOverlapFiles')} drifted file, ${n(p1bDirtyOverlapDriftResponseSummary, 'refreshSteps')} refresh steps, oldSnapshotMayAuthorizeP1B=${String(p1bDirtyOverlapDriftResponseSummary.oldSnapshotMayAuthorizeP1B)} and canStartP1BNow=${String(p1bDirtyOverlapDriftResponseSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-112',
          title: 'P1B dirty-overlap drift response is locked',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bDirtyOverlapDriftResponsePath),
          detail: inputs.p1bDirtyOverlapDriftResponse
            ? `P1B dirty-overlap drift response is ${statusOf(inputs.p1bDirtyOverlapDriftResponse)} with dirtyOverlapFiles=${n(p1bDirtyOverlapDriftResponseSummary, 'dirtyOverlapFiles')}, drifted=${n(p1bDirtyOverlapDriftResponseSummary, 'driftedDirtyOverlapFiles')}, refreshSteps=${n(p1bDirtyOverlapDriftResponseSummary, 'refreshSteps')}, oldSnapshotMayAuthorizeP1B=${String(p1bDirtyOverlapDriftResponseSummary.oldSnapshotMayAuthorizeP1B)}, canStartP1BNow=${String(p1bDirtyOverlapDriftResponseSummary.canStartP1BNow)} and ${n(p1bDirtyOverlapDriftResponseSummary, 'blockers')} blockers.`
            : 'No P1B dirty-overlap drift response audit exists. Gustav must prove stale snapshots cannot authorize P1B.',
          requiredBeforeWork: [
            'Run gustav_p1b_dirty_overlap_drift_response_audit.ts and keep P1B locked until snapshot refresh and fresh-read after approval.',
          ],
        }),
  );

  const p1bDirtyOverlapSnapshotRefreshContractSummary = summaryOf(inputs.p1bDirtyOverlapSnapshotRefreshContract);
  checks.push(
    statusOf(inputs.p1bDirtyOverlapSnapshotRefreshContract) === 'PASS' &&
    n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'blockers') === 0 &&
    n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'canonicalRefreshAuditPaths') === 1 &&
    n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'requiredFields') === 14 &&
    n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'rejectionRules') === 7 &&
    n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'refreshProbes') === 6 &&
    n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'rejectedRefreshProbes') === 5 &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.contractReady === true &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.refreshAuditPresent === false &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.currentWorkingTreeHashRecorded === true &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.snapshotHashDriftDetected === true &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.refreshRequiresExactP1BApproval === true &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.refreshRequiresPostApprovalRead === true &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.refreshRequiresFreshReadReceiptPair === true &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.refreshAuditAloneMayAuthorizeP1B === false &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.canStartP1BNow === false &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.canApplyNow === false &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.mayStartFrenchGeneration === false &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.mayModifyProductionAppFiles === false &&
    p1bDirtyOverlapSnapshotRefreshContractSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-113',
          title: 'P1B snapshot refresh contract is explicit',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bDirtyOverlapSnapshotRefreshContractPath),
          detail: `P1B snapshot refresh contract is PASS: ${n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'requiredFields')} required fields, ${n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'refreshProbes')} refresh probes, refreshAuditPresent=${String(p1bDirtyOverlapSnapshotRefreshContractSummary.refreshAuditPresent)} and refreshAuditAloneMayAuthorizeP1B=${String(p1bDirtyOverlapSnapshotRefreshContractSummary.refreshAuditAloneMayAuthorizeP1B)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-113',
          title: 'P1B snapshot refresh contract is explicit',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bDirtyOverlapSnapshotRefreshContractPath),
          detail: inputs.p1bDirtyOverlapSnapshotRefreshContract
            ? `P1B snapshot refresh contract is ${statusOf(inputs.p1bDirtyOverlapSnapshotRefreshContract)} with requiredFields=${n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'requiredFields')}, refreshProbes=${n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'refreshProbes')}, rejectedRefreshProbes=${n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'rejectedRefreshProbes')}, refreshAuditPresent=${String(p1bDirtyOverlapSnapshotRefreshContractSummary.refreshAuditPresent)}, canStartP1BNow=${String(p1bDirtyOverlapSnapshotRefreshContractSummary.canStartP1BNow)} and ${n(p1bDirtyOverlapSnapshotRefreshContractSummary, 'blockers')} blockers.`
            : 'No P1B snapshot refresh contract audit exists. Gustav must define the future refresh audit before any stale snapshot can be replaced safely.',
          requiredBeforeWork: [
            'Run gustav_p1b_dirty_overlap_snapshot_refresh_contract_audit.ts and keep P1B locked until exact approval, snapshot refresh and paired fresh-read receipt.',
          ],
        }),
  );

  const p1bNarrowWriteTransactionContractSummary = summaryOf(inputs.p1bNarrowWriteTransactionContract);
  checks.push(
    statusOf(inputs.p1bNarrowWriteTransactionContract) === 'PASS' &&
    n(p1bNarrowWriteTransactionContractSummary, 'blockers') === 0 &&
    n(p1bNarrowWriteTransactionContractSummary, 'allowedFiles') === 4 &&
    n(p1bNarrowWriteTransactionContractSummary, 'dirtyOverlapFiles') === 1 &&
    n(p1bNarrowWriteTransactionContractSummary, 'requiredReceipts') === 4 &&
    n(p1bNarrowWriteTransactionContractSummary, 'requiredReceiptsPresent') === 0 &&
    n(p1bNarrowWriteTransactionContractSummary, 'transactionStages') === 9 &&
    n(p1bNarrowWriteTransactionContractSummary, 'forbiddenScopes') === 7 &&
    n(p1bNarrowWriteTransactionContractSummary, 'rollbackRules') === 6 &&
    n(p1bNarrowWriteTransactionContractSummary, 'verificationCommands') === 3 &&
    p1bNarrowWriteTransactionContractSummary.contractReady === true &&
    p1bNarrowWriteTransactionContractSummary.onlyNarrowP1BAllowed === true &&
    p1bNarrowWriteTransactionContractSummary.allRequiredReceiptsPresent === false &&
    p1bNarrowWriteTransactionContractSummary.dirtyOverlapRequiresFreshRead === true &&
    p1bNarrowWriteTransactionContractSummary.routeSurfaceDeferred === true &&
    p1bNarrowWriteTransactionContractSummary.storageCloudDeferred === true &&
    p1bNarrowWriteTransactionContractSummary.frenchGenerationBlocked === true &&
    p1bNarrowWriteTransactionContractSummary.canStartP1BNow === false &&
    p1bNarrowWriteTransactionContractSummary.canApplyNow === false &&
    p1bNarrowWriteTransactionContractSummary.mayStartFrenchGeneration === false &&
    p1bNarrowWriteTransactionContractSummary.mayModifyProductionAppFiles === false &&
    p1bNarrowWriteTransactionContractSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-114',
          title: 'P1B write transaction is narrowly scoped',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bNarrowWriteTransactionContractPath),
          detail: `P1B narrow write transaction contract is PASS: ${n(p1bNarrowWriteTransactionContractSummary, 'allowedFiles')} files, ${n(p1bNarrowWriteTransactionContractSummary, 'requiredReceipts')} required receipts, ${n(p1bNarrowWriteTransactionContractSummary, 'transactionStages')} stages and canStartP1BNow=${String(p1bNarrowWriteTransactionContractSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-114',
          title: 'P1B write transaction is narrowly scoped',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bNarrowWriteTransactionContractPath),
          detail: inputs.p1bNarrowWriteTransactionContract
            ? `P1B narrow write transaction contract is ${statusOf(inputs.p1bNarrowWriteTransactionContract)} with allowedFiles=${n(p1bNarrowWriteTransactionContractSummary, 'allowedFiles')}, requiredReceipts=${n(p1bNarrowWriteTransactionContractSummary, 'requiredReceipts')}, requiredReceiptsPresent=${n(p1bNarrowWriteTransactionContractSummary, 'requiredReceiptsPresent')}, transactionStages=${n(p1bNarrowWriteTransactionContractSummary, 'transactionStages')}, canStartP1BNow=${String(p1bNarrowWriteTransactionContractSummary.canStartP1BNow)} and ${n(p1bNarrowWriteTransactionContractSummary, 'blockers')} blockers.`
            : 'No P1B narrow write transaction contract exists. Gustav must define the four-file transaction boundary before P1B can be approved.',
          requiredBeforeWork: [
            'Run gustav_p1b_narrow_write_transaction_contract_audit.ts and keep P1B locked until all required receipts exist.',
          ],
        }),
  );

  const p1bPostWriteProofContractSummary = summaryOf(inputs.p1bPostWriteProofContract);
  checks.push(
    statusOf(inputs.p1bPostWriteProofContract) === 'PASS' &&
    n(p1bPostWriteProofContractSummary, 'blockers') === 0 &&
    n(p1bPostWriteProofContractSummary, 'allowedFiles') === 4 &&
    n(p1bPostWriteProofContractSummary, 'requiredFields') === 18 &&
    n(p1bPostWriteProofContractSummary, 'rejectionRules') === 9 &&
    n(p1bPostWriteProofContractSummary, 'proofProbes') === 7 &&
    n(p1bPostWriteProofContractSummary, 'rejectedProofProbes') === 6 &&
    n(p1bPostWriteProofContractSummary, 'verificationCommands') === 5 &&
    p1bPostWriteProofContractSummary.contractReady === true &&
    p1bPostWriteProofContractSummary.postWriteProofPresent === false &&
    p1bPostWriteProofContractSummary.proofRequiresExactReceiptChain === true &&
    p1bPostWriteProofContractSummary.proofRequiresChangedFilesSubset === true &&
    p1bPostWriteProofContractSummary.proofRequiresPrePostHashes === true &&
    p1bPostWriteProofContractSummary.proofRequiresUserDirtyPreservation === true &&
    p1bPostWriteProofContractSummary.proofRequiresFrenchGenerationBlocked === true &&
    p1bPostWriteProofContractSummary.proofAloneMayAuthorizeFrenchGeneration === false &&
    p1bPostWriteProofContractSummary.proofRequiredBeforeP1BCompletion === true &&
    p1bPostWriteProofContractSummary.canStartP1BNow === false &&
    p1bPostWriteProofContractSummary.canApplyNow === false &&
    p1bPostWriteProofContractSummary.mayStartFrenchGeneration === false &&
    p1bPostWriteProofContractSummary.mayModifyProductionAppFiles === false &&
    p1bPostWriteProofContractSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-115',
          title: 'P1B post-write proof is required',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bPostWriteProofContractPath),
          detail: `P1B post-write proof contract is PASS: ${n(p1bPostWriteProofContractSummary, 'requiredFields')} required fields, ${n(p1bPostWriteProofContractSummary, 'proofProbes')} proof probes, postWriteProofPresent=${String(p1bPostWriteProofContractSummary.postWriteProofPresent)} and canStartP1BNow=${String(p1bPostWriteProofContractSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-115',
          title: 'P1B post-write proof is required',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bPostWriteProofContractPath),
          detail: inputs.p1bPostWriteProofContract
            ? `P1B post-write proof contract is ${statusOf(inputs.p1bPostWriteProofContract)} with requiredFields=${n(p1bPostWriteProofContractSummary, 'requiredFields')}, rejectionRules=${n(p1bPostWriteProofContractSummary, 'rejectionRules')}, proofProbes=${n(p1bPostWriteProofContractSummary, 'proofProbes')}, rejectedProofProbes=${n(p1bPostWriteProofContractSummary, 'rejectedProofProbes')}, postWriteProofPresent=${String(p1bPostWriteProofContractSummary.postWriteProofPresent)}, canStartP1BNow=${String(p1bPostWriteProofContractSummary.canStartP1BNow)} and ${n(p1bPostWriteProofContractSummary, 'blockers')} blockers.`
            : 'No P1B post-write proof contract exists. Gustav must define the proof required after any future P1B write.',
          requiredBeforeWork: [
            'Run gustav_p1b_post_write_proof_contract_audit.ts and require canonical diff/hash/receipt proof after any future P1B write.',
          ],
        }),
  );

  const p1bPostWriteProofFirewallSummary = summaryOf(inputs.p1bPostWriteProofFirewall);
  checks.push(
    statusOf(inputs.p1bPostWriteProofFirewall) === 'PASS' &&
    n(p1bPostWriteProofFirewallSummary, 'blockers') === 0 &&
    n(p1bPostWriteProofFirewallSummary, 'realProofCandidates') === 1 &&
    n(p1bPostWriteProofFirewallSummary, 'realProofsPresent') === 0 &&
    n(p1bPostWriteProofFirewallSummary, 'exactProofMatches') === 0 &&
    n(p1bPostWriteProofFirewallSummary, 'tempFixtures') === 11 &&
    n(p1bPostWriteProofFirewallSummary, 'rejectedTempFixtures') === 11 &&
    n(p1bPostWriteProofFirewallSummary, 'acceptedShapeFixtures') === 1 &&
    n(p1bPostWriteProofFirewallSummary, 'tempExactShapeBlockedByPath') === 1 &&
    n(p1bPostWriteProofFirewallSummary, 'outsideFileFixturesRejected') === 1 &&
    n(p1bPostWriteProofFirewallSummary, 'missingHashFixturesRejected') === 1 &&
    n(p1bPostWriteProofFirewallSummary, 'missingReceiptFixturesRejected') === 1 &&
    n(p1bPostWriteProofFirewallSummary, 'verificationFailureFixturesRejected') === 1 &&
    n(p1bPostWriteProofFirewallSummary, 'frenchGenerationFixturesRejected') === 1 &&
    p1bPostWriteProofFirewallSummary.firewallPassed === true &&
    p1bPostWriteProofFirewallSummary.requiresCanonicalProofPath === true &&
    p1bPostWriteProofFirewallSummary.requiresChangedFilesSubset === true &&
    p1bPostWriteProofFirewallSummary.requiresPrePostHashes === true &&
    p1bPostWriteProofFirewallSummary.requiresReceiptChain === true &&
    p1bPostWriteProofFirewallSummary.requiresVerificationPass === true &&
    p1bPostWriteProofFirewallSummary.requiresUserDirtyPreservation === true &&
    p1bPostWriteProofFirewallSummary.requiresFrenchGenerationBlocked === true &&
    p1bPostWriteProofFirewallSummary.postWriteProofStillMissing === true &&
    p1bPostWriteProofFirewallSummary.canStartP1BNow === false &&
    p1bPostWriteProofFirewallSummary.canApplyNow === false &&
    p1bPostWriteProofFirewallSummary.mayStartFrenchGeneration === false &&
    p1bPostWriteProofFirewallSummary.mayModifyProductionAppFiles === false &&
    p1bPostWriteProofFirewallSummary.productionFilesStillAbsent === true
      ? passCheck({
          id: 'RDY-116',
          title: 'P1B post-write proof firewall passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bPostWriteProofFirewallPath),
          detail: `P1B post-write proof firewall is PASS: ${n(p1bPostWriteProofFirewallSummary, 'tempFixtures')} temp fixtures rejected, realProofsPresent=${n(p1bPostWriteProofFirewallSummary, 'realProofsPresent')}, exactProofMatches=${n(p1bPostWriteProofFirewallSummary, 'exactProofMatches')} and canStartP1BNow=${String(p1bPostWriteProofFirewallSummary.canStartP1BNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-116',
          title: 'P1B post-write proof firewall passes',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, p1bPostWriteProofFirewallPath),
          detail: inputs.p1bPostWriteProofFirewall
            ? `P1B post-write proof firewall is ${statusOf(inputs.p1bPostWriteProofFirewall)} with realProofsPresent=${n(p1bPostWriteProofFirewallSummary, 'realProofsPresent')}, exactProofMatches=${n(p1bPostWriteProofFirewallSummary, 'exactProofMatches')}, tempFixtures=${n(p1bPostWriteProofFirewallSummary, 'tempFixtures')}, rejectedTempFixtures=${n(p1bPostWriteProofFirewallSummary, 'rejectedTempFixtures')}, tempExactShapeBlockedByPath=${n(p1bPostWriteProofFirewallSummary, 'tempExactShapeBlockedByPath')}, canStartP1BNow=${String(p1bPostWriteProofFirewallSummary.canStartP1BNow)} and ${n(p1bPostWriteProofFirewallSummary, 'blockers')} blockers.`
            : 'No P1B post-write proof firewall audit exists. Gustav must prove fake/temp proof files cannot complete P1B.',
          requiredBeforeWork: [
            'Run gustav_p1b_post_write_proof_firewall_audit.ts and keep P1B locked until only canonical proof can be accepted after a real transaction.',
          ],
        }),
  );

  const translationStartGateSummary = summaryOf(inputs.translationStartGate);
  checks.push(
    statusOf(inputs.translationStartGate) === 'PASS' &&
    n(translationStartGateSummary, 'blockers') === 0 &&
    translationStartGateSummary.targetStudyLanguage === 'fr' &&
    n(translationStartGateSummary, 'sourceLocales') === 2 &&
    n(translationStartGateSummary, 'approvedSourceLocales') === 2 &&
    n(translationStartGateSummary, 'translationDomains') === 9 &&
    n(translationStartGateSummary, 'translationAgents') === 8 &&
    n(translationStartGateSummary, 'generationBlockedReadinessChecks') === 8 &&
    n(translationStartGateSummary, 'requiredPreTranslationGates') === 8 &&
    n(translationStartGateSummary, 'forbiddenEarlyActions') === 10 &&
    translationStartGateSummary.sourceGraphApprovedForInput === true &&
    translationStartGateSummary.sourceGraphQualityPassed === true &&
    translationStartGateSummary.ruUkSourceLocaleCoveragePassed === true &&
    translationStartGateSummary.generatedContentAuditPresent === false &&
    translationStartGateSummary.targetIsolationReady === false &&
    translationStartGateSummary.researchPackRequired === true &&
    translationStartGateSummary.translationQueueReadyAfterArchitecture === true &&
    translationStartGateSummary.translationStartBlocked === true &&
    translationStartGateSummary.mayStartTranslationNow === false &&
    translationStartGateSummary.mayStartFrenchGeneration === false &&
    translationStartGateSummary.mayModifyProductionAppFiles === false &&
    translationStartGateSummary.noFrenchContentGenerated === true
      ? passCheck({
          id: 'RDY-117',
          title: 'Translation start gate is locked',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, translationStartGatePath),
          detail: `Translation start gate is PASS: target=fr, sourceLocales=${n(translationStartGateSummary, 'approvedSourceLocales')}/2, domains=${n(translationStartGateSummary, 'translationDomains')}, agents=${n(translationStartGateSummary, 'translationAgents')} and mayStartTranslationNow=${String(translationStartGateSummary.mayStartTranslationNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-117',
          title: 'Translation start gate is locked',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, translationStartGatePath),
          detail: inputs.translationStartGate
            ? `Translation start gate is ${statusOf(inputs.translationStartGate)} with sourceLocales=${n(translationStartGateSummary, 'approvedSourceLocales')}/2, domains=${n(translationStartGateSummary, 'translationDomains')}, agents=${n(translationStartGateSummary, 'translationAgents')}, generationBlockedReadinessChecks=${n(translationStartGateSummary, 'generationBlockedReadinessChecks')}, translationStartBlocked=${String(translationStartGateSummary.translationStartBlocked)}, mayStartTranslationNow=${String(translationStartGateSummary.mayStartTranslationNow)} and ${n(translationStartGateSummary, 'blockers')} blockers.`
            : 'No translation start gate audit exists. Gustav must define the locked translation start protocol before French content work.',
          requiredBeforeWork: [
            'Run gustav_translation_start_gate_audit.ts and keep French translation blocked until target-isolation readiness permits generation.',
          ],
        }),
  );

  const frenchResearchPackContractSummary = summaryOf(inputs.frenchResearchPackContract);
  checks.push(
    statusOf(inputs.frenchResearchPackContract) === 'PASS' &&
    n(frenchResearchPackContractSummary, 'blockers') === 0 &&
    frenchResearchPackContractSummary.targetStudyLanguage === 'fr' &&
    n(frenchResearchPackContractSummary, 'sourceLocales') === 2 &&
    n(frenchResearchPackContractSummary, 'trustedSources') === 8 &&
    n(frenchResearchPackContractSummary, 'officialOrPublisherSources') === 8 &&
    n(frenchResearchPackContractSummary, 'grammarClusters') === 12 &&
    n(frenchResearchPackContractSummary, 'requiredResearchFields') === 16 &&
    n(frenchResearchPackContractSummary, 'crossChecks') === 6 &&
    n(frenchResearchPackContractSummary, 'rejectedShortcutPolicies') === 7 &&
    frenchResearchPackContractSummary.translationStartGatePassed === true &&
    frenchResearchPackContractSummary.sourceGraphApprovedForInput === true &&
    frenchResearchPackContractSummary.researchPackPresent === false &&
    frenchResearchPackContractSummary.researchPackRequiredBeforeFirstBatch === true &&
    frenchResearchPackContractSummary.researchContractReady === true &&
    frenchResearchPackContractSummary.everyClusterHasTwoSources === true &&
    frenchResearchPackContractSummary.everyClusterRequiresRuUkComparison === true &&
    frenchResearchPackContractSummary.shortcutsRejected === true &&
    frenchResearchPackContractSummary.translationStartBlocked === true &&
    frenchResearchPackContractSummary.mayStartTranslationNow === false &&
    frenchResearchPackContractSummary.mayStartFrenchGeneration === false &&
    frenchResearchPackContractSummary.mayModifyProductionAppFiles === false &&
    frenchResearchPackContractSummary.noFrenchContentGenerated === true
      ? passCheck({
          id: 'RDY-118',
          title: 'French research pack contract is locked',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchPackContractPath),
          detail: `French research pack contract is PASS: ${n(frenchResearchPackContractSummary, 'trustedSources')} trusted sources, ${n(frenchResearchPackContractSummary, 'grammarClusters')} grammar clusters, researchPackPresent=${String(frenchResearchPackContractSummary.researchPackPresent)} and mayStartTranslationNow=${String(frenchResearchPackContractSummary.mayStartTranslationNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-118',
          title: 'French research pack contract is locked',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchPackContractPath),
          detail: inputs.frenchResearchPackContract
            ? `French research pack contract is ${statusOf(inputs.frenchResearchPackContract)} with trustedSources=${n(frenchResearchPackContractSummary, 'trustedSources')}, grammarClusters=${n(frenchResearchPackContractSummary, 'grammarClusters')}, researchPackPresent=${String(frenchResearchPackContractSummary.researchPackPresent)}, researchContractReady=${String(frenchResearchPackContractSummary.researchContractReady)}, mayStartTranslationNow=${String(frenchResearchPackContractSummary.mayStartTranslationNow)} and ${n(frenchResearchPackContractSummary, 'blockers')} blockers.`
            : 'No French research pack contract exists. Gustav must define trusted sources and grammar research rules before translation batches.',
          requiredBeforeWork: [
            'Run gustav_french_research_pack_contract_audit.ts before any first French translation batch.',
          ],
        }),
  );

  const frenchResearchPackFirewallSummary = summaryOf(inputs.frenchResearchPackFirewall);
  checks.push(
    statusOf(inputs.frenchResearchPackFirewall) === 'PASS' &&
    n(frenchResearchPackFirewallSummary, 'blockers') === 0 &&
    frenchResearchPackFirewallSummary.targetStudyLanguage === 'fr' &&
    n(frenchResearchPackFirewallSummary, 'realPackCandidates') === 1 &&
    n(frenchResearchPackFirewallSummary, 'realPacksPresent') === 0 &&
    n(frenchResearchPackFirewallSummary, 'exactPackMatches') === 0 &&
    n(frenchResearchPackFirewallSummary, 'tempFixtures') === 11 &&
    n(frenchResearchPackFirewallSummary, 'rejectedTempFixtures') === 11 &&
    n(frenchResearchPackFirewallSummary, 'acceptedShapeFixtures') === 1 &&
    n(frenchResearchPackFirewallSummary, 'tempExactShapeBlockedByPath') === 1 &&
    n(frenchResearchPackFirewallSummary, 'singleSourceFixturesRejected') === 1 &&
    n(frenchResearchPackFirewallSummary, 'missingRuUkFixturesRejected') === 1 &&
    n(frenchResearchPackFirewallSummary, 'missingFieldsFixturesRejected') === 1 &&
    n(frenchResearchPackFirewallSummary, 'shortcutFixturesRejected') === 1 &&
    n(frenchResearchPackFirewallSummary, 'frenchOutputFixturesRejected') === 1 &&
    frenchResearchPackFirewallSummary.firewallPassed === true &&
    frenchResearchPackFirewallSummary.requiresCanonicalPackPath === true &&
    frenchResearchPackFirewallSummary.requiresTwoSourceClusterEvidence === true &&
    frenchResearchPackFirewallSummary.requiresRuUkComparison === true &&
    frenchResearchPackFirewallSummary.requiresRequiredFields === true &&
    frenchResearchPackFirewallSummary.requiresShortcutRejection === true &&
    frenchResearchPackFirewallSummary.requiresNoFrenchOutput === true &&
    frenchResearchPackFirewallSummary.researchPackStillMissing === true &&
    frenchResearchPackFirewallSummary.mayStartTranslationNow === false &&
    frenchResearchPackFirewallSummary.mayStartFrenchGeneration === false &&
    frenchResearchPackFirewallSummary.mayModifyProductionAppFiles === false &&
    frenchResearchPackFirewallSummary.noFrenchContentGenerated === true
      ? passCheck({
          id: 'RDY-119',
          title: 'French research pack firewall passes',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchPackFirewallPath),
          detail: `French research pack firewall is PASS: ${n(frenchResearchPackFirewallSummary, 'tempFixtures')} temp fixtures rejected, realPacksPresent=${n(frenchResearchPackFirewallSummary, 'realPacksPresent')}, exactPackMatches=${n(frenchResearchPackFirewallSummary, 'exactPackMatches')} and mayStartTranslationNow=${String(frenchResearchPackFirewallSummary.mayStartTranslationNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-119',
          title: 'French research pack firewall passes',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchPackFirewallPath),
          detail: inputs.frenchResearchPackFirewall
            ? `French research pack firewall is ${statusOf(inputs.frenchResearchPackFirewall)} with realPacksPresent=${n(frenchResearchPackFirewallSummary, 'realPacksPresent')}, exactPackMatches=${n(frenchResearchPackFirewallSummary, 'exactPackMatches')}, tempFixtures=${n(frenchResearchPackFirewallSummary, 'tempFixtures')}, rejectedTempFixtures=${n(frenchResearchPackFirewallSummary, 'rejectedTempFixtures')}, tempExactShapeBlockedByPath=${n(frenchResearchPackFirewallSummary, 'tempExactShapeBlockedByPath')}, mayStartTranslationNow=${String(frenchResearchPackFirewallSummary.mayStartTranslationNow)} and ${n(frenchResearchPackFirewallSummary, 'blockers')} blockers.`
            : 'No French research pack firewall exists. Gustav must prove fake/temp research packs cannot unlock translation.',
          requiredBeforeWork: [
            'Run gustav_french_research_pack_firewall_audit.ts before accepting any real French research pack.',
          ],
        }),
  );

  const frenchResearchJsonFirewallSummary = summaryOf(inputs.frenchResearchJsonFirewall);
  checks.push(
    statusOf(inputs.frenchResearchJsonFirewall) === 'PASS' &&
    n(frenchResearchJsonFirewallSummary, 'blockerFindings') === 0 &&
    n(frenchResearchJsonFirewallSummary, 'forbiddenOutputFields') === 0 &&
    n(frenchResearchJsonFirewallSummary, 'forbiddenPermissionFlags') === 0 &&
    n(frenchResearchJsonFirewallSummary, 'falseApprovalFlags') === 0 &&
    n(frenchResearchJsonFirewallSummary, 'runtimeActivationFlags') === 0 &&
    n(frenchResearchJsonFirewallSummary, 'scannedResearchJsonFiles') >= 1 &&
    frenchResearchJsonFirewallSummary.mayStartFrenchGeneration === false &&
    frenchResearchJsonFirewallSummary.mayModifyProductionAppFiles === false &&
    frenchResearchJsonFirewallSummary.noFrenchContentGenerated === true
      ? passCheck({
          id: 'RDY-119B',
          title: 'French research JSON firewall passes',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchJsonFirewallPath),
          detail: `French research JSON firewall is PASS: ${n(frenchResearchJsonFirewallSummary, 'scannedResearchJsonFiles')} research JSON files scanned, forbiddenOutputFields=${n(frenchResearchJsonFirewallSummary, 'forbiddenOutputFields')}, falseApprovalFlags=${n(frenchResearchJsonFirewallSummary, 'falseApprovalFlags')} and mayStartFrenchGeneration=${String(frenchResearchJsonFirewallSummary.mayStartFrenchGeneration)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-119B',
          title: 'French research JSON firewall passes',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchJsonFirewallPath),
          detail: inputs.frenchResearchJsonFirewall
            ? `French research JSON firewall is ${statusOf(inputs.frenchResearchJsonFirewall)} with scannedResearchJsonFiles=${n(frenchResearchJsonFirewallSummary, 'scannedResearchJsonFiles')}, forbiddenOutputFields=${n(frenchResearchJsonFirewallSummary, 'forbiddenOutputFields')}, forbiddenPermissionFlags=${n(frenchResearchJsonFirewallSummary, 'forbiddenPermissionFlags')}, falseApprovalFlags=${n(frenchResearchJsonFirewallSummary, 'falseApprovalFlags')}, runtimeActivationFlags=${n(frenchResearchJsonFirewallSummary, 'runtimeActivationFlags')} and mayStartFrenchGeneration=${String(frenchResearchJsonFirewallSummary.mayStartFrenchGeneration)}.`
            : 'No French research JSON firewall exists. Gustav must prove research JSON packets cannot carry French output or activation flags before generation.',
          requiredBeforeWork: [
            'Run gustav_french_research_json_firewall_audit.ts before accepting any French research JSON packet.',
          ],
        }),
  );

  const frenchResearchWorkOrderSummary = summaryOf(inputs.frenchResearchWorkOrder);
  checks.push(
    statusOf(inputs.frenchResearchWorkOrder) === 'PASS' &&
    n(frenchResearchWorkOrderSummary, 'blockers') === 0 &&
    frenchResearchWorkOrderSummary.targetStudyLanguage === 'fr' &&
    n(frenchResearchWorkOrderSummary, 'sourceLocales') === 2 &&
    n(frenchResearchWorkOrderSummary, 'trustedSources') === 8 &&
    n(frenchResearchWorkOrderSummary, 'grammarClusters') === 12 &&
    n(frenchResearchWorkOrderSummary, 'workOrders') === 12 &&
    n(frenchResearchWorkOrderSummary, 'tasks') === 84 &&
    n(frenchResearchWorkOrderSummary, 'sourceGraphReferenceGroups') === 10 &&
    n(frenchResearchWorkOrderSummary, 'minimumTrustedSourceChecks') === 26 &&
    n(frenchResearchWorkOrderSummary, 'ruUkComparisonsRequired') === 12 &&
    n(frenchResearchWorkOrderSummary, 'requiredSignoffs') === 72 &&
    frenchResearchWorkOrderSummary.contractReady === true &&
    frenchResearchWorkOrderSummary.firewallPassed === true &&
    frenchResearchWorkOrderSummary.sourceGraphCountsLoaded === true &&
    frenchResearchWorkOrderSummary.workOrderReady === true &&
    frenchResearchWorkOrderSummary.researchPackPresent === false &&
    frenchResearchWorkOrderSummary.realResearchPackStillMissing === true &&
    frenchResearchWorkOrderSummary.mayStartResearchPackWritingNow === false &&
    frenchResearchWorkOrderSummary.mayStartTranslationNow === false &&
    frenchResearchWorkOrderSummary.mayStartFrenchGeneration === false &&
    frenchResearchWorkOrderSummary.mayModifyProductionAppFiles === false &&
    frenchResearchWorkOrderSummary.noFrenchContentGenerated === true
      ? passCheck({
          id: 'RDY-120',
          title: 'French research work order is locked',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchWorkOrderPath),
          detail: `French research work order is PASS: ${n(frenchResearchWorkOrderSummary, 'workOrders')} work orders, ${n(frenchResearchWorkOrderSummary, 'tasks')} tasks, ${n(frenchResearchWorkOrderSummary, 'minimumTrustedSourceChecks')} minimum trusted source checks, ${n(frenchResearchWorkOrderSummary, 'requiredSignoffs')} signoffs and mayStartTranslationNow=${String(frenchResearchWorkOrderSummary.mayStartTranslationNow)}.`,
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-120',
          title: 'French research work order is locked',
          severity: 'blocker',
          blocks: ['generation'],
          sourceArtifact: path.relative(repoRoot, frenchResearchWorkOrderPath),
          detail: inputs.frenchResearchWorkOrder
            ? `French research work order is ${statusOf(inputs.frenchResearchWorkOrder)} with workOrders=${n(frenchResearchWorkOrderSummary, 'workOrders')}, tasks=${n(frenchResearchWorkOrderSummary, 'tasks')}, minimumTrustedSourceChecks=${n(frenchResearchWorkOrderSummary, 'minimumTrustedSourceChecks')}, requiredSignoffs=${n(frenchResearchWorkOrderSummary, 'requiredSignoffs')}, workOrderReady=${String(frenchResearchWorkOrderSummary.workOrderReady)}, mayStartTranslationNow=${String(frenchResearchWorkOrderSummary.mayStartTranslationNow)} and ${n(frenchResearchWorkOrderSummary, 'blockers')} blockers.`
            : 'No French research work order exists. Gustav must lock cluster-level research tasks before any real research pack or translation batch.',
          requiredBeforeWork: [
            'Run gustav_french_research_work_order_audit.ts before creating a real French research pack.',
          ],
        }),
  );

  const generatedAuditSummary = summaryOf(inputs.generatedAudit);
  const officialSourceCoverageSummary = summaryOf(inputs.officialSourceCoverage);
  const officialSourceCoverageReady =
    statusOf(inputs.officialSourceCoverage) === 'PASS' &&
    n(officialSourceCoverageSummary, 'blockers') === 0 &&
    officialSourceCoverageSummary.coverageState === 'official_source_content_coverage_complete_no_import' &&
    n(officialSourceCoverageSummary, 'ledgerRows') === 1600 &&
    n(officialSourceCoverageSummary, 'acceptedRowOfficialSourceDecisionRows') === 1600 &&
    n(officialSourceCoverageSummary, 'acceptedAiOfficialSourceDecisionRows') === 164 &&
    n(officialSourceCoverageSummary, 'rowDecisionsWithSourceRefs') === 1600 &&
    n(officialSourceCoverageSummary, 'rowDecisionsWithAllRequiredGatesPassed') === 1600 &&
    n(officialSourceCoverageSummary, 'rowDecisionQuizRowsWithOneCorrectAnswer') === 1600 &&
    n(officialSourceCoverageSummary, 'fixtureProbes') > 0 &&
    n(officialSourceCoverageSummary, 'fixtureProbesPassed') === n(officialSourceCoverageSummary, 'fixtureProbes') &&
    officialSourceCoverageSummary.readyForApply !== true &&
    officialSourceCoverageSummary.mayModifyProductionAppFiles !== true &&
    officialSourceCoverageSummary.activationApproved !== true;
  const generatedContentCoveredByLlmOfficialSources =
    statusOf(inputs.generatedAudit) === 'HOLD' &&
    n(generatedAuditSummary, 'blockers') === 0 &&
    generatedAuditSummary.readyForReviewer === true &&
    generatedAuditSummary.mayModifyProductionAppFiles !== true &&
    officialSourceCoverageReady;
  checks.push(
    statusOf(inputs.generatedAudit) === 'PASS' || generatedContentCoveredByLlmOfficialSources
      ? passCheck({
          id: 'RDY-080',
          title: 'Generated content audit passed',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, generatedAuditPath),
          detail: statusOf(inputs.generatedAudit) === 'PASS'
            ? 'Generated content audit is PASS.'
            : `Generated content audit is HOLD but shape-valid/readyForReviewer, and LLM official-source coverage V2 supersedes the old review hold with rows=${n(officialSourceCoverageSummary, 'acceptedRowOfficialSourceDecisionRows')}, AI=${n(officialSourceCoverageSummary, 'acceptedAiOfficialSourceDecisionRows')}, sourceRefs=${n(officialSourceCoverageSummary, 'rowDecisionsWithSourceRefs')} and gates=${n(officialSourceCoverageSummary, 'rowDecisionsWithAllRequiredGatesPassed')}. Production apply still requires RDY-090 explicit approval.`,
          requiredBeforeWork: [],
        })
        : failCheck({
          id: 'RDY-080',
          title: 'Generated content audit passed',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, generatedAuditPath),
          detail: inputs.generatedAudit
            ? `Generated content audit is ${statusOf(inputs.generatedAudit)} with rows=${n(generatedAuditSummary, 'rows')}, rowsWithFrench=${n(generatedAuditSummary, 'rowsWithFrench')}, readyForReviewer=${String(generatedAuditSummary.readyForReviewer)}, readyForApply=${String(generatedAuditSummary.readyForApply)} and mayModifyProductionAppFiles=${String(generatedAuditSummary.mayModifyProductionAppFiles)}. LLM official-source coverage ready=${officialSourceCoverageReady}. Production apply remains blocked.`
            : 'No generated content audit exists. This is expected before generation starts, but it blocks production apply.',
          requiredBeforeWork: [
            'After generation, audit French content for grammar, sourceLocale coverage, ids, placeholders, lesson order and runtime shape, then pass LLM official-source coverage V2.',
          ],
        }),
  );

  checks.push(
    statusOf(inputs.applyPlan) === 'PASS' &&
    inputs.applyPlan?.approvalStatus === 'approved' &&
    inputs.applyPlan?.mayModifyProductionAppFiles === true
      ? passCheck({
          id: 'RDY-090',
          title: 'Apply plan is approved',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, applyPlanPath),
          detail: 'Apply plan is PASS and explicitly approved for production app writes.',
          requiredBeforeWork: [],
        })
      : failCheck({
          id: 'RDY-090',
          title: 'Apply plan is approved',
          severity: 'blocker',
          blocks: ['apply'],
          sourceArtifact: path.relative(repoRoot, applyPlanPath),
          detail: inputs.applyPlan
            ? `Apply plan exists with status ${statusOf(inputs.applyPlan)}, approvalStatus=${String(inputs.applyPlan.approvalStatus || 'unknown')}, files=${n(summaryOf(inputs.applyPlan), 'files')}, dirty overlaps=${n(summaryOf(inputs.applyPlan), 'dirtyWorktreeOverlaps')}, plan blockers=${n(summaryOf(inputs.applyPlan), 'blockers')}, mayModifyProductionAppFiles=${String(inputs.applyPlan.mayModifyProductionAppFiles)}. Production app files must not be changed yet.`
            : 'No approved apply_plan/file_changes.json exists. Production app files must not be changed by Gustav yet.',
          requiredBeforeWork: [
            'Create explicit apply plan and get explicit approval before touching production app files.',
          ],
        }),
  );

  const failed = checks.filter((check) => check.status === 'FAIL');
  const blockerFailed = failed.filter((check) => check.severity === 'blocker');
  const warningFailed = failed.filter((check) => check.severity === 'warning');
  const generationBlockers = blockerFailed.filter((check) => check.blocks.includes('generation'));
  const applyBlockers = blockerFailed.filter((check) => check.blocks.includes('apply'));
  const canStartFrenchGeneration = generationBlockers.length === 0;
  const canStartProductionApply = applyBlockers.length === 0;
  const decision: Decision = canStartFrenchGeneration ? 'GO' : 'HOLD';
  const sourceGraphInputApproved =
    statusOf(inputs.sourceGraph) === 'PASS' &&
    statusOf(inputs.sourceGraphQuality) === 'PASS' &&
    statusOf(inputs.generatedSourceTruth) === 'PASS' &&
    statusOf(inputs.generatedSupportIsolation) === 'PASS';
  const blockedRecommendedWork = inputs.sourceGraph
    ? [
        'Resolve target-safe migration adapters for storage, cloud sync, achievements, lessons, quiz, trainer, flashcards and My Practice surfaces.',
        sourceGraphInputApproved
          ? 'Source graph input is approved; next remove target-isolation blockers in storage, cloud sync, achievements and user-facing surfaces.'
          : inputs.lesson916ApprovalAudit && statusOf(inputs.lesson916ApprovalAudit) === 'PASS'
          ? 'Lesson 9-16 source-truth approval is recorded; next resolve source graph/generated-source gates and target-isolation architecture.'
          : inputs.lesson916DecisionPacket
            ? 'Resolve the pending lesson 9-16 source-truth approval decision; clean draft is recommended but not approved.'
            : inputs.lesson916CanonicalDraft
            ? 'Review the clean lesson 9-16 canonical source draft; it is structurally clean but not approved source truth.'
            : inputs.lesson916Reconciliation
              ? 'Resolve lesson 9-16 source-truth policy; current historical candidate is do_not_auto_merge.'
              : inputs.lesson916SourceRecovery
                ? 'Review/reconcile the historical lesson 9-16 recovery candidate before approving canonical source truth.'
                : inputs.generatedSourceTruth
                  ? 'Resolve generated source-truth blocker for lesson 9-16 phrase runtime.'
                  : inputs.sourceGraphQuality
                    ? 'Resolve source graph quality blockers and settle generated runtime phrase-file policy.'
                    : 'Run pedagogical/source quality audit over lessons, phrases, quizzes, flashcards, daily phrases and diagnosis-training nodes.',
        sourceGraphInputApproved
          ? 'Do not generate French until remaining architecture gates pass.'
          : 'Record explicit source graph approval before French generation.',
      ]
    : [
        'Build exact migration adapter plan for lesson, quiz, trainer, flashcard and achievement surfaces.',
        'Implement source graph extractor for English base inventory.',
        'Define My Practice target-prefix contract and trainer/mistake-log target store plan.',
      ];

  const report: Report = {
    schemaVersion: 'gustav-readiness-gate-v0',
    runId,
    generatedAt: new Date().toISOString(),
    decision,
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    readiness: {
      canStartFrenchGeneration,
      canStartProductionApply,
      canContinueArchitectureWork: true,
      nextRecommendedMode: canStartFrenchGeneration ? 'generate' : 'architecture',
      nextRecommendedWork: canStartFrenchGeneration
        ? [
            'Start French generation in a closed run container.',
            'Generate sourceLocale=ru and sourceLocale=uk materials from approved English source graph.',
            'Run generated content audit before any apply plan.',
          ]
        : blockedRecommendedWork,
    },
    summary: {
      checks: checks.length,
      passed: checks.filter((check) => check.status === 'PASS').length,
      failed: failed.length,
      blockers: blockerFailed.length,
      warnings: warningFailed.length,
      generationBlockers: generationBlockers.length,
      applyBlockers: applyBlockers.length,
    },
    inputStatuses: Object.fromEntries(
      Object.entries(inputs).map(([name, value]) => [
        name,
        {
          status: statusOf(value),
          summary: summaryOf(value),
        },
      ]),
    ),
    checks,
    notes: [
      'This gate decides whether Gustav may start French generation, not whether artifacts are structurally valid.',
      'A validator PASS is necessary but not sufficient.',
      'Production apply remains blocked until explicit apply plan approval exists.',
    ],
  };

  const outJson = artifact(runDir, 'audits/gustav_readiness_gate.json');
  const outMd = artifact(runDir, 'audits/gustav_readiness_gate.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(report));

  console.log(`GUSTAV readiness gate: ${report.decision}`);
  console.log(`Can start French generation: ${report.readiness.canStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Failed checks: ${report.summary.failed}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
