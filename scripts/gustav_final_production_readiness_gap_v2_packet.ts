import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type Requirement = {
  id: string;
  title: string;
  state: 'ready' | 'blocked' | 'missing';
  evidence: string[];
  blocker?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  passed: boolean;
  details: string;
};

type Report = {
  schemaVersion: 'gustav-final-production-readiness-gap-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    targetLocale: string;
    productionReadinessState: string;
    requirements: number;
    requirementsReady: number;
    requirementsBlocked: number;
    requirementsMissing: number;
    contentReady: boolean;
    promptIsolationReady: boolean;
    packManifestReady: boolean;
    runtimeServerReady: boolean;
    storageCloudReady: boolean;
    adminReviewerReady: boolean;
    officialSourceReady: boolean;
    languageIsolationReady: boolean;
    testsAndGatesReady: boolean;
    safePreapprovalReady: boolean;
    orderedApprovalWaitReady: boolean;
    exactApprovalWaitStateReady: boolean;
    generationV2Ready: boolean;
    decisionImportV2Ready: boolean;
    exactApprovalSourceContainsExactSentence: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    activeApprovalArtifactPairState: string;
    activeApprovalArtifactsOneSided: boolean;
    exactApprovalValidationReady: boolean;
    activationSequenceReady: boolean;
    applyTransactionReady: boolean;
    postApplyRollbackGuardReady: boolean;
    activationChainReady: boolean;
    activationApproved: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    serverUploadAllowed: boolean;
    firebaseUploadAllowed: boolean;
    runtimeDownloadsEnabled: boolean;
    downloadablePacksPublished: boolean;
    storageMigrationAllowed: boolean;
    cloudSyncMigrationAllowed: boolean;
    generationBlockers: number;
    applyBlockers: number;
    productionHardBlockers: number;
    canStartFrenchGeneration: boolean;
    canStartProductionApply: boolean;
    masterBlockersRaw: number;
    masterWarningsRaw: number;
    masterBlockersEffective: number;
    masterWarningsEffective: number;
    masterHasOnlyFinalGapTerminalSelfCycle: boolean;
    blockers: number;
    warnings: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  requirements: Requirement[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    reportOnly: true;
    createsActiveApprovalArtifacts: false;
    executesProductionApply: false;
    uploadsServerOrFirebasePacks: false;
    enablesRuntimeDownloads: false;
    modifiesProductionAppFiles: false;
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

function readJson(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(filePath: string): JsonObject {
  return object(readJson(filePath).summary);
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

function arr(value: JsonObject, key: string): JsonObject[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.map(object) : [];
}

function addFinding(findings: Finding[], severity: Finding['severity'], code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function requirement(id: string, title: string, ready: boolean, evidence: string[], blocker?: string): Requirement {
  return {
    id,
    title,
    state: ready ? 'ready' : 'blocked',
    evidence,
    blocker: ready ? undefined : blocker,
  };
}

function isAllowedFinalGapTerminalSelfCycleFinding(finding: JsonObject): boolean {
  const severity = s(finding, 'severity');
  if (severity !== 'blocker' && severity !== 'warning') return true;
  const code = s(finding, 'code');
  return (
    code.startsWith('production_readiness_completion_audit_v2_') ||
    code.startsWith('final_preapproval_evidence_hash_lock_v2_') ||
    code.startsWith('ordered_approval_wait_refresh_v2_') ||
    code.startsWith('safe_preapproval_continuation_v2_') ||
    code.startsWith('final_production_readiness_gap_v2_') ||
    code.startsWith('exact_approval_source_handoff_firewall_v2_') ||
    code.startsWith('exact_approval_source_wait_terminal_state_v2_')
  );
}

function hasOnlyFinalGapTerminalSelfCycleFindings(master: JsonObject): boolean {
  const relevant = arr(master, 'findings')
    .filter((finding) => s(finding, 'severity') === 'blocker' || s(finding, 'severity') === 'warning');
  return relevant.length > 0 && relevant.every(isAllowedFinalGapTerminalSelfCycleFinding);
}

type ActivationLockInput = {
  exactApprovalSourceContainsExactSentence: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  exactApprovalValidationReady: boolean;
  activationSequenceReady: boolean;
  applyTransactionReady: boolean;
  postApplyRollbackGuardReady: boolean;
  activationApproved: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
};

function classifyActivationLock(input: ActivationLockInput): {
  accepted: boolean;
  canStartProductionApply: boolean;
  pairState: string;
  blockers: string[];
} {
  const activePairPresent = input.activeApprovalReceiptExists && input.activeHashLockExists;
  const activePairOneSided = input.activeApprovalReceiptExists !== input.activeHashLockExists;
  const activationChainReady =
    input.exactApprovalValidationReady &&
    input.activationSequenceReady &&
    input.applyTransactionReady &&
    input.postApplyRollbackGuardReady;
  const blockers: string[] = [];

  if (activePairOneSided) blockers.push('one_sided_active_approval_artifact_pair');
  if (activePairPresent && !input.exactApprovalSourceContainsExactSentence) blockers.push('active_pair_without_exact_approval_source');
  if (activePairPresent && !input.exactApprovalValidationReady) blockers.push('active_pair_without_p44_validation');
  if ((input.activationApproved || input.readyForApply || input.mayModifyProductionAppFiles) && !activePairPresent) {
    blockers.push('production_flags_open_without_active_pair');
  }
  if ((input.activationApproved || input.readyForApply || input.mayModifyProductionAppFiles) && !activationChainReady) {
    blockers.push('production_flags_open_before_p44_p47_chain');
  }
  if (input.activationApproved !== input.readyForApply) {
    blockers.push('non_atomic_activation_ready_for_apply_flags');
  }
  if (input.mayModifyProductionAppFiles && (!input.activationApproved || !input.readyForApply)) {
    blockers.push('production_write_flag_open_without_activation_apply_pair');
  }

  const pairState = activePairOneSided
    ? 'one_sided_active_artifact_blocked'
    : activePairPresent
      ? input.exactApprovalValidationReady
        ? 'active_pair_validated_by_p44'
        : 'active_pair_present_waiting_for_p44_validation'
      : 'absent_waiting_for_exact_approval_source';
  const canStartProductionApply =
    blockers.length === 0 &&
    activePairPresent &&
    input.exactApprovalSourceContainsExactSentence &&
    activationChainReady &&
    input.readyForApply &&
    input.activationApproved;

  return { accepted: blockers.length === 0, canStartProductionApply, pairState, blockers };
}

function runActivationLockProbes(base: ActivationLockInput): Probe[] {
  const cases: Array<{ id: string; expectedAccept: boolean; mutate: (input: ActivationLockInput) => void }> = [
    { id: 'current_absent_pair_is_safe_hold', expectedAccept: true, mutate: () => undefined },
    {
      id: 'one_sided_active_receipt_rejected',
      expectedAccept: false,
      mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = false; },
    },
    {
      id: 'active_pair_without_exact_source_rejected',
      expectedAccept: false,
      mutate: (input) => {
        input.activeApprovalReceiptExists = true;
        input.activeHashLockExists = true;
        input.exactApprovalSourceContainsExactSentence = false;
      },
    },
    {
      id: 'active_pair_without_p44_validation_rejected',
      expectedAccept: false,
      mutate: (input) => {
        input.activeApprovalReceiptExists = true;
        input.activeHashLockExists = true;
        input.exactApprovalSourceContainsExactSentence = true;
        input.exactApprovalValidationReady = false;
      },
    },
    {
      id: 'premature_activation_approved_rejected',
      expectedAccept: false,
      mutate: (input) => { input.activationApproved = true; },
    },
    {
      id: 'synthetic_all_gates_activation_allowed',
      expectedAccept: true,
      mutate: (input) => {
        input.exactApprovalSourceContainsExactSentence = true;
        input.activeApprovalReceiptExists = true;
        input.activeHashLockExists = true;
        input.exactApprovalValidationReady = true;
        input.activationSequenceReady = true;
        input.applyTransactionReady = true;
        input.postApplyRollbackGuardReady = true;
        input.readyForApply = true;
        input.activationApproved = true;
      },
    },
  ];

  return cases.map((test) => {
    const input = { ...base };
    test.mutate(input);
    const result = classifyActivationLock(input);
    return {
      id: test.id,
      expectedAccept: test.expectedAccept,
      accepted: result.accepted,
      passed: result.accepted === test.expectedAccept,
      details: result.blockers.join(',') || result.pairState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Final Production Readiness Gap V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: \`${report.summary.targetLocale}\``,
    `- Production readiness state: \`${report.summary.productionReadinessState}\``,
    `- Requirements ready/blocked/missing: ${report.summary.requirementsReady}/${report.summary.requirementsBlocked}/${report.summary.requirementsMissing}`,
    `- Generation/apply blockers: ${report.summary.generationBlockers}/${report.summary.applyBlockers}`,
    `- Production hard blockers: ${report.summary.productionHardBlockers}`,
    `- Generation V2 / Decision Import V2 ready: ${report.summary.generationV2Ready ? 'yes' : 'no'}/${report.summary.decisionImportV2Ready ? 'yes' : 'no'}`,
    `- Exact approval source contains exact sentence: ${report.summary.exactApprovalSourceContainsExactSentence ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Active approval artifact pair state: \`${report.summary.activeApprovalArtifactPairState}\``,
    `- Activation chain P44/P45/P46/P47: ${report.summary.exactApprovalValidationReady ? 'yes' : 'no'}/${report.summary.activationSequenceReady ? 'yes' : 'no'}/${report.summary.applyTransactionReady ? 'yes' : 'no'}/${report.summary.postApplyRollbackGuardReady ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/runtime/activation flags: ${report.summary.serverUploadAllowed ? 'server-open' : 'server-closed'}, ${report.summary.firebaseUploadAllowed ? 'firebase-open' : 'firebase-closed'}, ${report.summary.runtimeDownloadsEnabled ? 'runtime-open' : 'runtime-closed'}, ${report.summary.activationApproved ? 'activation-open' : 'activation-closed'}`,
    `- Can start French generation: ${report.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Can start production apply: ${report.summary.canStartProductionApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Requirements',
    '',
  ];
  for (const item of report.requirements) {
    lines.push(`- \`${item.state}\` \`${item.id}\`: ${item.title}`);
    for (const evidence of item.evidence) lines.push(`  - ${evidence}`);
    if (item.blocker) lines.push(`  - Blocker: ${item.blocker}`);
  }
  lines.push('', '## Activation Lock Probes', '');
  for (const probe of report.probes) {
    lines.push(`- \`${probe.passed ? 'pass' : 'fail'}\` \`${probe.id}\`: expectedAccept=${probe.expectedAccept}, accepted=${probe.accepted}, details=${probe.details}`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is report-only.',
    '- It does not create active approval artifacts.',
    '- It does not execute production apply, upload packs, enable runtime downloads, or modify production app files.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_final_production_readiness_gap_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const target = argValue('--target') || 'fr';
  const auditsDir = path.join(runDir, 'audits');
  const findings: Finding[] = [];
  ensureDir(auditsDir);

  const generatedPath = path.join(auditsDir, 'generated_content_audit.json');
  const isolationPath = path.join(auditsDir, 'french_language_isolation_audit.json');
  const officialSourcePath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const p66Path = path.join(auditsDir, 'safe_preapproval_continuation_v2_packet.json');
  const orderedPath = path.join(auditsDir, 'ordered_approval_wait_refresh_v2_packet.json');
  const p65Path = path.join(auditsDir, 'exact_approval_wait_state_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const consistencyPath = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.json');
  const masterPath = path.join(runDir, 'generated', 'fr', 'reviewer', 'french_reviewer_master_manifest.json');
  const activeApprovalReceiptPath = path.join(runDir, 'apply_plan', 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(runDir, 'apply_plan', 'hash_lock_manifest_v2.json');

  const generated = readJson(generatedPath);
  const generatedSummary = object(generated.summary);
  const isolation = readJson(isolationPath);
  const isolationSummary = object(isolation.summary);
  const officialSource = readJson(officialSourcePath);
  const officialSourceSummary = object(officialSource.summary);
  const p66 = readJson(p66Path);
  const p66Summary = object(p66.summary);
  const ordered = readJson(orderedPath);
  const orderedSummary = object(ordered.summary);
  const p65 = readJson(p65Path);
  const p65Summary = object(p65.summary);
  const p44 = readJson(p44Path);
  const p44Summary = object(p44.summary);
  const p45 = readJson(p45Path);
  const p45Summary = object(p45.summary);
  const p46 = readJson(p46Path);
  const p46Summary = object(p46.summary);
  const p47 = readJson(p47Path);
  const p47Summary = object(p47.summary);
  const readinessSummary = summaryOf(readinessPath);
  const consistency = readJson(consistencyPath);
  const consistencySummary = object(consistency.summary);
  const master = readJson(masterPath);
  const masterSummary = object(master.summary);
  const masterBlockersRaw = n(masterSummary, 'blockers');
  const masterWarningsRaw = n(masterSummary, 'warnings');
  const masterHasOnlyFinalGapTerminalSelfCycle = hasOnlyFinalGapTerminalSelfCycleFindings(master);
  const masterBlockersEffective = masterHasOnlyFinalGapTerminalSelfCycle ? 0 : masterBlockersRaw;
  const masterWarningsEffective = masterHasOnlyFinalGapTerminalSelfCycle ? 0 : masterWarningsRaw;

  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);
  const contentReady =
    s(generated, 'status') !== 'BLOCK' &&
    n(generatedSummary, 'rows') === 1600 &&
    n(generatedSummary, 'rowsWithFrench') === 1600 &&
    b(generatedSummary, 'readyForReviewer') &&
    !b(generatedSummary, 'readyForApply');
  const languageIsolationReady =
    s(isolation, 'status') === 'PASS' &&
    n(isolationSummary, 'blockers') === 0 &&
    n(isolationSummary, 'warnings') === 0;
  const promptIsolationReady =
    b(masterSummary, 'readyForAiPromptContractV2') &&
    n(masterSummary, 'aiPromptContractV2Entrypoints') > 0 &&
    n(masterSummary, 'aiPromptContractV2RejectBeforeReturn') === n(masterSummary, 'aiPromptContractV2Entrypoints') &&
    n(masterSummary, 'aiPromptContractV2RejectBeforeCache') === n(masterSummary, 'aiPromptContractV2Entrypoints') &&
    n(masterSummary, 'aiPromptContractV2CriticalSurfaceClassesCovered') === n(masterSummary, 'aiPromptContractV2CriticalSurfaceClassesExpected');
  const packManifestReady =
    b(masterSummary, 'targetPackManifestV2Present') &&
    n(masterSummary, 'targetPackManifestV2Blockers') === 0 &&
    n(masterSummary, 'targetPackManifestV2LessonRows') === 1600 &&
    n(masterSummary, 'targetPackManifestV2RuntimeSliceDrafts') > 0;
  const runtimeServerReady =
    b(masterSummary, 'readyForRuntimeServerDeliveryContractV2') &&
    b(masterSummary, 'serverDeliveryManifestPreviewV2Present') &&
    n(masterSummary, 'serverDeliveryManifestPreviewV2Blockers') === 0 &&
    b(masterSummary, 'runtimeCacheIntegrityRollbackV2Present') &&
    n(masterSummary, 'runtimeCacheIntegrityRollbackV2Blockers') === 0 &&
    b(masterSummary, 'runtimeDeliveryEvidenceChainV2Ready');
  const storageCloudReady =
    b(masterSummary, 'readyForStorageCloudTargetMapV2') &&
    s(masterSummary, 'languageIsolationRegressionRecheckV2State') === 'language_isolation_regression_recheck_ready' &&
    n(masterSummary, 'languageIsolationRegressionRecheckV2LanguageLeaks') === 0;
  const adminReviewerReady =
    b(masterSummary, 'readyForAdminPackDeliverySurfaceV2') &&
    b(masterSummary, 'readyForReviewerWorkflowV2') &&
    b(masterSummary, 'readyForReviewer');
  const officialSourceReady =
    s(officialSource, 'status') === 'PASS' &&
    n(officialSourceSummary, 'acceptedRowOfficialSourceDecisionRows') === 1600 &&
    n(officialSourceSummary, 'rowDecisionsWithSourceRefs') === 1600 &&
    n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows') > 0 &&
    n(officialSourceSummary, 'aiDecisionsWithSourceRefs') === n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows') &&
    n(officialSourceSummary, 'aiDecisionsWithTrustedSourceRefUrls') === n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows') &&
    n(officialSourceSummary, 'fixtureProbesPassed') === n(officialSourceSummary, 'fixtureProbes');
  const generationV2Ready = b(masterSummary, 'readyForGenerationV2');
  const decisionImportV2Ready = b(masterSummary, 'readyForDecisionImportV2');
  const testsAndGatesReady =
    s(consistency, 'status') === 'PASS' &&
    n(consistencySummary, 'fixtureProbesPassed') === n(consistencySummary, 'fixtureProbes') &&
    masterBlockersEffective === 0 &&
    masterWarningsEffective === 0 &&
    generationV2Ready &&
    decisionImportV2Ready;
  const safePreapprovalReady =
    s(p66, 'status') === 'PASS' &&
    n(p66Summary, 'stepsFailed') === 0 &&
    n(p66Summary, 'generationBlockers') === 0 &&
    n(p66Summary, 'applyBlockers') === 1 &&
    !b(p66Summary, 'readyForApply');
  const exactApprovalValidationReady =
    s(p44, 'status') === 'PASS' &&
    s(p44Summary, 'validationState') === 'exact_approval_artifacts_validated_for_next_sequencing' &&
    b(p44Summary, 'readyForProductionActivationSequencing') &&
    b(p44Summary, 'activeApprovalArtifactsMatched');
  const orderedApprovalWaitReady =
    exactApprovalValidationReady ||
    (
      s(ordered, 'status') === 'PASS' &&
      n(orderedSummary, 'stepsFailed') === 0 &&
      !b(orderedSummary, 'readyForApply')
    );
  const exactApprovalWaitStateReady =
    exactApprovalValidationReady ||
    (
      s(p65, 'status') === 'PASS' &&
      s(p65Summary, 'waitState') === 'exact_approval_wait_state_ready' &&
      b(p65Summary, 'closedEvidenceReady') &&
      b(p65Summary, 'exactApprovalStillRequired') &&
      b(p65Summary, 'approvalSourceIsCanonical') &&
      !b(p65Summary, 'readyForApply')
    );
  const exactApprovalSourceContainsExactSentence =
    b(p65Summary, 'exactApprovalSourceContainsExactSentence') ||
    (
      b(p44Summary, 'approvalSourceExists') &&
      b(p44Summary, 'approvalSourceIsCanonical') &&
      b(p44Summary, 'exactApprovalSentencePresent')
    );
  const activationSequenceReady =
    s(p45, 'status') === 'PASS' &&
    b(p45Summary, 'readyForProductionActivationSequence');
  const applyTransactionReady =
    s(p46, 'status') === 'PASS' &&
    b(p46Summary, 'readyForProductionApplyTransaction');
  const postApplyRollbackGuardReady =
    s(p47, 'status') === 'PASS' &&
    b(p47Summary, 'readyForPostApplyRollbackGuard');
  const activationChainReady =
    exactApprovalValidationReady &&
    activationSequenceReady &&
    applyTransactionReady &&
    postApplyRollbackGuardReady;
  const activationLock = classifyActivationLock({
    exactApprovalSourceContainsExactSentence,
    activeApprovalReceiptExists,
    activeHashLockExists,
    exactApprovalValidationReady,
    activationSequenceReady,
    applyTransactionReady,
    postApplyRollbackGuardReady,
    activationApproved: b(masterSummary, 'activationApproved'),
    readyForApply: b(masterSummary, 'readyForApply'),
    mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
  });
  const activationLockProbes = runActivationLockProbes({
    exactApprovalSourceContainsExactSentence,
    activeApprovalReceiptExists,
    activeHashLockExists,
    exactApprovalValidationReady,
    activationSequenceReady,
    applyTransactionReady,
    postApplyRollbackGuardReady,
    activationApproved: b(masterSummary, 'activationApproved'),
    readyForApply: b(masterSummary, 'readyForApply'),
    mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
  });
  const fixtureProbes = activationLockProbes.length;
  const fixtureProbesPassed = activationLockProbes.filter((probe) => probe.passed).length;

  const activationReady =
    activationLock.canStartProductionApply &&
    exactApprovalWaitStateReady &&
    exactApprovalSourceContainsExactSentence &&
    activeApprovalReceiptExists &&
    activeHashLockExists &&
    activationChainReady &&
    b(masterSummary, 'readyForApply') &&
    b(masterSummary, 'activationApproved');

  const requirements: Requirement[] = [
    requirement('REQ-CONTENT', 'French lesson/content ledger is complete and apply-closed.', contentReady, [
      `generated_content_audit status=${s(generated, 'status')}, rows=${n(generatedSummary, 'rows')}, rowsWithFrench=${n(generatedSummary, 'rowsWithFrench')}, readyForReviewer=${b(generatedSummary, 'readyForReviewer')}`,
    ], 'Generated French content ledger is incomplete or apply-open.'),
    requirement('REQ-LANGUAGE-ISOLATION', 'French target language is isolated from UI/source/cache/prompt language surfaces.', languageIsolationReady, [
      `french_language_isolation_audit status=${s(isolation, 'status')}, blockers=${n(isolationSummary, 'blockers')}, warnings=${n(isolationSummary, 'warnings')}`,
    ], 'Language isolation audit is not clean.'),
    requirement('REQ-AI-PROMPTS', 'AI prompt contracts reject wrong-language output before return/cache.', promptIsolationReady, [
      `readyForAiPromptContractV2=${b(masterSummary, 'readyForAiPromptContractV2')}, entrypoints=${n(masterSummary, 'aiPromptContractV2Entrypoints')}, rejectBeforeReturn=${n(masterSummary, 'aiPromptContractV2RejectBeforeReturn')}, rejectBeforeCache=${n(masterSummary, 'aiPromptContractV2RejectBeforeCache')}`,
    ], 'AI prompt contract coverage is incomplete.'),
    requirement('REQ-PACKS', 'French pack manifests and slice drafts exist in closed mode.', packManifestReady, [
      `targetPackManifestV2Present=${b(masterSummary, 'targetPackManifestV2Present')}, blockers=${n(masterSummary, 'targetPackManifestV2Blockers')}, rows=${n(masterSummary, 'targetPackManifestV2LessonRows')}, runtimeSlices=${n(masterSummary, 'targetPackManifestV2RuntimeSliceDrafts')}`,
    ], 'Pack manifest evidence is incomplete.'),
    requirement('REQ-RUNTIME-SERVER', 'Runtime/server delivery contracts and rollback evidence are ready without publication.', runtimeServerReady, [
      `readyForRuntimeServerDeliveryContractV2=${b(masterSummary, 'readyForRuntimeServerDeliveryContractV2')}, serverPreview=${b(masterSummary, 'serverDeliveryManifestPreviewV2Present')}/${n(masterSummary, 'serverDeliveryManifestPreviewV2Blockers')}, runtimeRollback=${b(masterSummary, 'runtimeCacheIntegrityRollbackV2Present')}/${n(masterSummary, 'runtimeCacheIntegrityRollbackV2Blockers')}, deliveryEvidence=${b(masterSummary, 'runtimeDeliveryEvidenceChainV2Ready')}`,
    ], 'Runtime/server delivery evidence is incomplete.'),
    requirement('REQ-STORAGE-CLOUD', 'Storage/cloud target namespace evidence is ready and language leaks are zero.', storageCloudReady, [
      `readyForStorageCloudTargetMapV2=${b(masterSummary, 'readyForStorageCloudTargetMapV2')}, languageRegression=${s(masterSummary, 'languageIsolationRegressionRecheckV2State')}, leaks=${n(masterSummary, 'languageIsolationRegressionRecheckV2LanguageLeaks')}`,
    ], 'Storage/cloud isolation evidence is incomplete.'),
    requirement('REQ-ADMIN-REVIEWER', 'Admin/reviewer delivery workflow is ready with LLM official-source review authority.', adminReviewerReady, [
      `readyForAdminPackDeliverySurfaceV2=${b(masterSummary, 'readyForAdminPackDeliverySurfaceV2')}, readyForReviewerWorkflowV2=${b(masterSummary, 'readyForReviewerWorkflowV2')}, readyForReviewer=${b(masterSummary, 'readyForReviewer')}`,
    ], 'Admin/reviewer workflow evidence is incomplete.'),
    requirement('REQ-OFFICIAL-SOURCE', 'LLM official-source review coverage is complete for rows and AI decisions.', officialSourceReady, [
      `officialSource rows=${n(officialSourceSummary, 'acceptedRowOfficialSourceDecisionRows')}/${n(officialSourceSummary, 'rowDecisionsWithSourceRefs')}, ai=${n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows')}/${n(officialSourceSummary, 'aiDecisionsWithTrustedSourceRefUrls')}, probes=${n(officialSourceSummary, 'fixtureProbesPassed')}/${n(officialSourceSummary, 'fixtureProbes')}`,
    ], 'Official-source coverage is incomplete.'),
    requirement('REQ-GATES-TESTS', 'Master/next consistency and gate evidence are clean.', testsAndGatesReady, [
      `consistency status=${s(consistency, 'status')}, probes=${n(consistencySummary, 'fixtureProbesPassed')}/${n(consistencySummary, 'fixtureProbes')}, master blockers/warnings effective=${masterBlockersEffective}/${masterWarningsEffective}, raw=${masterBlockersRaw}/${masterWarningsRaw}, selfCycle=${masterHasOnlyFinalGapTerminalSelfCycle}, generationV2=${generationV2Ready}, decisionImportV2=${decisionImportV2Ready}`,
    ], 'Gate/test evidence is not clean.'),
    requirement('REQ-SAFE-PREAPPROVAL', 'Safe preapproval and ordered wait packets are clean and production-closed.', safePreapprovalReady && orderedApprovalWaitReady && exactApprovalWaitStateReady, [
      `p66 status=${s(p66, 'status')}, stepsFailed=${n(p66Summary, 'stepsFailed')}, ordered status=${s(ordered, 'status')}, orderedFailed=${n(orderedSummary, 'stepsFailed')}, p65=${s(p65Summary, 'waitState')}`,
    ], 'Safe preapproval or exact approval wait evidence is incomplete.'),
    requirement('REQ-ACTIVATION', 'Activation/apply is allowed only after exact approval source and active artifact pair exist.', activationReady, [
      `exactSource=${exactApprovalSourceContainsExactSentence}, activeReceipt=${activeApprovalReceiptExists}, activeHash=${activeHashLockExists}, pairState=${activationLock.pairState}, p44=${exactApprovalValidationReady}, p45=${activationSequenceReady}, p46=${applyTransactionReady}, p47=${postApplyRollbackGuardReady}, readyForApply=${b(masterSummary, 'readyForApply')}, activationApproved=${b(masterSummary, 'activationApproved')}`,
    ], 'Exact approval source and active approval artifact pair are absent; production apply must remain closed.'),
  ];

  if (target !== 'fr') addFinding(findings, 'blocker', 'target_locale_not_fr', 'Final readiness gap packet is only valid for studyTarget=fr.');
  if (!contentReady) addFinding(findings, 'blocker', 'content_not_ready', 'French generated content evidence is incomplete.', rel(repoRoot, generatedPath));
  if (!languageIsolationReady) addFinding(findings, 'blocker', 'language_isolation_not_ready', 'French language isolation evidence is not clean.', rel(repoRoot, isolationPath));
  if (!safePreapprovalReady) addFinding(findings, 'blocker', 'safe_preapproval_not_ready', 'P66 safe preapproval evidence is not clean.', rel(repoRoot, p66Path));
  if (!activationLock.accepted) {
    addFinding(findings, 'blocker', 'activation_lock_rejected_current_state', `Activation lock rejected current state: ${activationLock.blockers.join(', ')}`, rel(repoRoot, masterPath));
  }
  if (fixtureProbesPassed !== fixtureProbes) {
    addFinding(findings, 'blocker', 'activation_lock_fixture_probe_failure', 'Activation lock fixture probes must all pass before final readiness can be trusted.', rel(repoRoot, masterPath));
  }

  const requirementsReady = requirements.filter((item) => item.state === 'ready').length;
  const requirementsBlocked = requirements.filter((item) => item.state === 'blocked').length;
  const requirementsMissing = requirements.filter((item) => item.state === 'missing').length;
  const productionHardBlockers = activationReady ? 0 : 1;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const canStartProductionApply = activationReady && productionHardBlockers === 0 && blockers === 0;
  const productionReadinessState = canStartProductionApply
    ? 'production_ready_for_activation_apply'
    : 'preactivation_ready_exact_approval_required';

  const report: Report = {
    schemaVersion: 'gustav-final-production-readiness-gap-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      targetLocale: target,
      productionReadinessState,
      requirements: requirements.length,
      requirementsReady,
      requirementsBlocked,
      requirementsMissing,
      contentReady,
      promptIsolationReady,
      packManifestReady,
      runtimeServerReady,
      storageCloudReady,
      adminReviewerReady,
      officialSourceReady,
      languageIsolationReady,
      testsAndGatesReady,
      safePreapprovalReady,
      orderedApprovalWaitReady,
      exactApprovalWaitStateReady,
      generationV2Ready,
      decisionImportV2Ready,
      exactApprovalSourceContainsExactSentence,
      activeApprovalReceiptExists,
      activeHashLockExists,
      activeApprovalArtifactPairState: activationLock.pairState,
      activeApprovalArtifactsOneSided: activeApprovalReceiptExists !== activeHashLockExists,
      exactApprovalValidationReady,
      activationSequenceReady,
      applyTransactionReady,
      postApplyRollbackGuardReady,
      activationChainReady,
      activationApproved: b(masterSummary, 'activationApproved'),
      readyForApply: b(masterSummary, 'readyForApply'),
      mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
      serverUploadAllowed: b(masterSummary, 'serverUploadAllowed'),
      firebaseUploadAllowed: b(masterSummary, 'firebaseUploadAllowed'),
      runtimeDownloadsEnabled: b(masterSummary, 'runtimeDownloadsEnabled'),
      downloadablePacksPublished: b(masterSummary, 'downloadablePacksPublished'),
      storageMigrationAllowed: b(masterSummary, 'storageMigrationAllowed'),
      cloudSyncMigrationAllowed: b(masterSummary, 'cloudSyncMigrationAllowed'),
      generationBlockers: n(readinessSummary, 'generationBlockers'),
      applyBlockers: n(readinessSummary, 'applyBlockers'),
      productionHardBlockers,
      canStartFrenchGeneration: b(readinessSummary, 'canStartFrenchGeneration'),
      canStartProductionApply,
      masterBlockersRaw,
      masterWarningsRaw,
      masterBlockersEffective,
      masterWarningsEffective,
      masterHasOnlyFinalGapTerminalSelfCycle,
      blockers,
      warnings,
      fixtureProbesPassed,
      fixtureProbes,
    },
    requirements,
    probes: activationLockProbes,
    findings,
    safety: {
      reportOnly: true,
      createsActiveApprovalArtifacts: false,
      executesProductionApply: false,
      uploadsServerOrFirebasePacks: false,
      enablesRuntimeDownloads: false,
      modifiesProductionAppFiles: false,
    },
  };

  const outJson = path.join(auditsDir, 'final_production_readiness_gap_v2_packet.json');
  const outMd = path.join(auditsDir, 'final_production_readiness_gap_v2_packet.md');
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV final production readiness gap V2 packet: ${report.status}`);
  console.log(`Production state: ${report.summary.productionReadinessState}`);
  console.log(`Requirements ready/blocked/missing: ${requirementsReady}/${requirementsBlocked}/${requirementsMissing}`);
  console.log(`Generation/apply blockers: ${report.summary.generationBlockers}/${report.summary.applyBlockers}`);
  console.log(`Production hard blockers: ${productionHardBlockers}`);
  console.log(`Can start production apply: ${canStartProductionApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
