import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type PassGoal = {
  id: string;
  title: string;
  whyNow: string;
  workItems: string[];
  expectedArtifacts: string[];
  verificationCommands: string[];
  doneWhen: string[];
};

type Report = {
  schemaVersion: 'gustav-next-pass-goal-contract-packet-v0';
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
  summary: {
    triggerPhrases: number;
    contractRules: number;
    nextPassLargeGoals: number;
    nextPassPrepared: boolean;
    currentPassMustBeLarge: true;
    mustRunVerificationBeforeFinal: true;
    mustPrepareNextPlanBeforeFinal: true;
    productionWritesAllowed: false;
    applyApprovalCreated: false;
    researchPackPresent: boolean;
    researchPackVerified: boolean;
    readyForPedagogyBlueprint: boolean;
    pedagogyBlueprintPresent: boolean;
    pedagogyBlueprintReady: boolean;
    readyForGenerationSchemaV2: boolean;
    generationSchemaV2Present: boolean;
    generationSchemaV2Ready: boolean;
    readyForAiPromptContractV2: boolean;
    aiPromptContractV2Present: boolean;
    aiPromptContractV2Ready: boolean;
    readyForContentQualityGatesV2: boolean;
    contentQualityGatesV2Present: boolean;
    contentQualityGatesV2Ready: boolean;
    readyForReviewerWorkflowV2: boolean;
    reviewerWorkflowV2Present: boolean;
    reviewerWorkflowV2Ready: boolean;
    readyForLlmOfficialSourceReviewV2: boolean;
    readyForBrainGateV2: boolean;
    targetPackManifestV2Present: boolean;
    targetPackManifestV2Ready: boolean;
    readyForRuntimeServerDeliveryContractV2: boolean;
    runtimeServerDeliveryContractV2Present: boolean;
    runtimeServerDeliveryContractV2Ready: boolean;
    readyForStorageCloudTargetMapV2: boolean;
    storageCloudTargetMapV2Present: boolean;
    storageCloudTargetMapV2Ready: boolean;
    readyForAdminPackDeliverySurfaceV2: boolean;
    adminReviewerDeliverySurfaceV2Present: boolean;
    adminReviewerDeliverySurfaceV2Ready: boolean;
    readyForReviewerDecisionImportV2DryRun: boolean;
    reviewerDecisionImportV2DryRunPresent: boolean;
    reviewerDecisionImportV2DryRunReady: boolean;
    officialSourceImportDryRunV2Present: boolean;
    officialSourceImportDryRunV2Ready: boolean;
    officialSourceImportDryRunV2Rows: number;
    officialSourceImportDryRunV2Ai: number;
    officialSourceImportDryRunV2AcceptedRows: number;
    officialSourceImportDryRunV2AcceptedAi: number;
    officialSourceImportDryRunV2PromotedRowFileUsed: boolean;
    officialSourceImportDryRunV2PromotedAiFileUsed: boolean;
    officialSourceImportDryRunV2ReadyForExecutionGateRefresh: boolean;
    officialSourceImportDryRunV2ReadyForApply: boolean;
    officialSourceImportDryRunV2MayModifyProductionAppFiles: boolean;
    officialSourceImportDryRunV2RowProbesPassed: number;
    officialSourceImportDryRunV2RowProbes: number;
    officialSourceImportDryRunV2AiProbesPassed: number;
    officialSourceImportDryRunV2AiProbes: number;
    readyForPayloadShardMaterializationGate: boolean;
    payloadShardMaterializationChecksumV2Present: boolean;
    payloadShardMaterializationChecksumV2Ready: boolean;
    readyForServerManifestPreviewGate: boolean;
    serverDeliveryManifestPreviewV2Present: boolean;
    serverDeliveryManifestPreviewV2Ready: boolean;
    readyForRuntimeCacheIntegrityGate: boolean;
    runtimeCacheIntegrityRollbackV2Present: boolean;
    runtimeCacheIntegrityRollbackV2Ready: boolean;
    readyForReviewerDecisionImportOpeningGate: boolean;
    reviewerDecisionImportOpeningPreflightV2Present: boolean;
    reviewerDecisionImportOpeningPreflightV2Ready: boolean;
    reviewerDecisionImportExecutionGateReady: boolean;
    readyForPayloadCreationApprovalPreflight: boolean;
    llmOfficialSourceReviewIntakeV2Present: boolean;
    llmOfficialSourceReviewIntakeV2Ready: boolean;
    llmOfficialSourceReviewIntakeV2State: string;
    llmOfficialSourceReviewIntakeV2RowCoveragePct: number;
    llmOfficialSourceReviewIntakeV2AiCoveragePct: number;
    readyForReviewerDecisionImportExecutionGate: boolean;
    reviewerDecisionImportExecutionGateV2Present: boolean;
    reviewerDecisionImportExecutionGateV2Ready: boolean;
    reviewerDecisionImportExecutionGateV2State: string;
    reviewerDecisionImportExecutionGateV2WouldRun: boolean;
    officialSourceImportExecutionGateV2Ready: boolean;
    officialSourceImportExecutionGateV2State: string;
    officialSourceImportExecutionGateV2WouldRun: boolean;
    officialSourceImportExecutionGateV2P13CoverageReady: boolean;
    officialSourceImportExecutionGateV2PromotedRowFileUsed: boolean;
    officialSourceImportExecutionGateV2PromotedAiFileUsed: boolean;
    officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight: boolean;
    officialSourceImportExecutionGateV2ReadyForApply: boolean;
    officialSourceImportExecutionGateV2MayModifyProductionAppFiles: boolean;
    officialSourceImportExecutionGateV2FixtureProbesPassed: number;
    officialSourceImportExecutionGateV2FixtureProbes: number;
    llmOfficialSourceDecisionMaterializationV2Present: boolean;
    llmOfficialSourceDecisionMaterializationV2Ready: boolean;
    llmOfficialSourceDecisionMaterializationV2State: string;
    llmOfficialSourceDecisionMaterializationV2ReadyForDryRun: boolean;
    llmOfficialSourceDecisionDryRunV2Present: boolean;
    llmOfficialSourceDecisionDryRunV2Ready: boolean;
    llmOfficialSourceDecisionDryRunV2State: string;
    llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2Present: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2Ready: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2State: string;
    llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration: boolean;
    llmOfficialSourcePromotedDecisionFileGenerationV2Present: boolean;
    llmOfficialSourcePromotedDecisionFileGenerationV2Ready: boolean;
    llmOfficialSourcePromotedDecisionFileGenerationV2State: string;
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRows: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAi: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh: boolean;
    readyForPayloadCreationApprovalPreflightV2: boolean;
    payloadCreationApprovalPreflightV2Present: boolean;
    payloadCreationApprovalPreflightV2Ready: boolean;
    payloadCreationApprovalPreflightV2State: string;
    payloadCreationApprovalPreflightV2HashChecksPassed: number;
    payloadCreationApprovalPreflightV2HashChecks: number;
    payloadCreationApprovalPreflightV2FixtureProbesPassed: number;
    payloadCreationApprovalPreflightV2FixtureProbes: number;
    readyForClosedPayloadMaterializationV2: boolean;
    closedLocalPayloadMaterializationV2Present: boolean;
    closedLocalPayloadMaterializationV2Ready: boolean;
    closedLocalPayloadMaterializationV2State: string;
    closedLocalPayloadMaterializationV2RuntimeSlices: number;
    closedLocalPayloadMaterializationV2PayloadEntries: number;
    closedLocalPayloadMaterializationV2PayloadBytes: number;
    closedLocalPayloadMaterializationV2ChecksumMismatches: number;
    closedLocalPayloadMaterializationV2FixtureProbesPassed: number;
    closedLocalPayloadMaterializationV2FixtureProbes: number;
    readyForServerDeliveryPublishPreflightV2: boolean;
    serverDeliveryPublishPreflightV2Present: boolean;
    serverDeliveryPublishPreflightV2Ready: boolean;
    serverDeliveryPublishPreflightV2State: string;
    serverDeliveryPublishPreflightV2ManifestEntries: number;
    serverDeliveryPublishPreflightV2ActualShaEntries: number;
    serverDeliveryPublishPreflightV2ActualByteSizeEntries: number;
    serverDeliveryPublishPreflightV2ChecksumMismatches: number;
    serverDeliveryPublishPreflightV2FixtureProbesPassed: number;
    serverDeliveryPublishPreflightV2FixtureProbes: number;
    readyForAdminServerDeliveryReviewV2: boolean;
    adminServerDeliveryRuntimePreflightV2Present: boolean;
    adminServerDeliveryRuntimePreflightV2Ready: boolean;
    adminServerDeliveryRuntimePreflightV2State: string;
    adminServerDeliveryRuntimePreflightV2ManifestEntries: number;
    adminServerDeliveryRuntimePreflightV2AdminReady: boolean;
    adminServerDeliveryRuntimePreflightV2RuntimeReady: boolean;
    adminServerDeliveryRuntimePreflightV2StorageReady: boolean;
    adminServerDeliveryRuntimePreflightV2FixtureProbesPassed: number;
    adminServerDeliveryRuntimePreflightV2FixtureProbes: number;
    readyForRuntimeActivationBlockerPlanningV2: boolean;
    runtimeActivationBlockerPlanV2Present: boolean;
    runtimeActivationBlockerPlanV2Ready: boolean;
    runtimeActivationBlockerPlanV2State: string;
    runtimeActivationBlockerPlanV2PlanItems: number;
    runtimeActivationBlockerPlanV2PlannedTouches: number;
    runtimeActivationBlockerPlanV2ReadinessApplyBlockers: number;
    runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps: number;
    runtimeActivationBlockerPlanV2FixtureProbesPassed: number;
    runtimeActivationBlockerPlanV2FixtureProbes: number;
    readyForExplicitApprovalReceiptGateV2: boolean;
    explicitApprovalReceiptHashLockGateV2Present: boolean;
    explicitApprovalReceiptHashLockGateV2Ready: boolean;
    explicitApprovalReceiptHashLockGateV2State: string;
    explicitApprovalReceiptHashLockGateV2CriticalHashLocks: number;
    explicitApprovalReceiptHashLockGateV2DirtyFiles: number;
    explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles: number;
    explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists: boolean;
    explicitApprovalReceiptHashLockGateV2ActiveHashLockExists: boolean;
    explicitApprovalReceiptHashLockGateV2FixtureProbesPassed: number;
    explicitApprovalReceiptHashLockGateV2FixtureProbes: number;
    readyForApprovalRequestPresentationV2: boolean;
    activationApprovalRequestPresentationV2Present: boolean;
    activationApprovalRequestPresentationV2Ready: boolean;
    activationApprovalRequestPresentationV2State: string;
    activationApprovalRequestPresentationV2CriticalHashLocks: number;
    activationApprovalRequestPresentationV2DirtyFiles: number;
    activationApprovalRequestPresentationV2ActiveApprovalReceiptExists: boolean;
    activationApprovalRequestPresentationV2ActiveHashLockExists: boolean;
    activationApprovalRequestPresentationV2FixtureProbesPassed: number;
    activationApprovalRequestPresentationV2FixtureProbes: number;
    readyForExplicitApprovalReceiptCreationGateV2: boolean;
    explicitApprovalReceiptCreationGateV2Present: boolean;
    explicitApprovalReceiptCreationGateV2SafeHoldReady: boolean;
    explicitApprovalReceiptCreationGateV2State: string;
    explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent: boolean;
    explicitApprovalReceiptCreationGateV2PlainContinueRejected: boolean;
    explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated: boolean;
    explicitApprovalReceiptCreationGateV2ActiveHashLockCreated: boolean;
    explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit: boolean;
    explicitApprovalReceiptCreationGateV2FixtureProbesPassed: number;
    explicitApprovalReceiptCreationGateV2FixtureProbes: number;
    readyForApprovalHoldContinuationV2: boolean;
    readyForProductionApplyAbsenceDenialGateV2: boolean;
    productionApplyAbsenceDenialGateV2Present: boolean;
    productionApplyAbsenceDenialGateV2SafeHoldReady: boolean;
    productionApplyAbsenceDenialGateV2State: string;
    productionApplyAbsenceDenialGateV2ApplyDenied: boolean;
    productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists: boolean;
    productionApplyAbsenceDenialGateV2ActiveHashLockExists: boolean;
    productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit: boolean;
    productionApplyAbsenceDenialGateV2FixtureProbesPassed: number;
    productionApplyAbsenceDenialGateV2FixtureProbes: number;
    readyForNonProductionContinuationAfterApplyDenialV2: boolean;
    nonproductionBlockerClosurePlanV2Present: boolean;
    nonproductionBlockerClosurePlanV2Ready: boolean;
    nonproductionBlockerClosurePlanV2State: string;
    nonproductionBlockerClosurePlanV2ChainReady: boolean;
    nonproductionBlockerClosurePlanV2SafeItems: number;
    nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems: number;
    nonproductionBlockerClosurePlanV2ProductionLockedItems: number;
    nonproductionBlockerClosurePlanV2RecommendedNextSafeItem: string;
    nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass: boolean;
    nonproductionBlockerClosurePlanV2ReadyForApply: boolean;
    nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles: boolean;
    nonproductionBlockerClosurePlanV2FixtureProbesPassed: number;
    nonproductionBlockerClosurePlanV2FixtureProbes: number;
    nonproductionEvidenceRefreshV2Present: boolean;
    nonproductionEvidenceRefreshV2Ready: boolean;
    nonproductionEvidenceRefreshV2State: string;
    nonproductionEvidenceRefreshV2LegacyReviewResidueMatches: number;
    nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck: boolean;
    nonproductionEvidenceRefreshV2ReadyForApply: boolean;
    nonproductionEvidenceRefreshV2MayModifyProductionAppFiles: boolean;
    nonproductionEvidenceRefreshV2FixtureProbesPassed: number;
    nonproductionEvidenceRefreshV2FixtureProbes: number;
    runtimeServerManifestConsistencyRecheckV2Present: boolean;
    runtimeServerManifestConsistencyRecheckV2Ready: boolean;
    runtimeServerManifestConsistencyRecheckV2State: string;
    runtimeServerManifestConsistencyRecheckV2ManifestEntries: number;
    runtimeServerManifestConsistencyRecheckV2GateRefsCurrent: number;
    runtimeServerManifestConsistencyRecheckV2GateRefs: number;
    runtimeServerManifestConsistencyRecheckV2InputHashesCurrent: number;
    runtimeServerManifestConsistencyRecheckV2InputHashes: number;
    runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen: number;
    runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries: number;
    runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries: number;
    runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck: boolean;
    runtimeServerManifestConsistencyRecheckV2ReadyForApply: boolean;
    runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles: boolean;
    runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed: number;
    runtimeServerManifestConsistencyRecheckV2FixtureProbes: number;
    languageIsolationRegressionRecheckV2Present: boolean;
    languageIsolationRegressionRecheckV2Ready: boolean;
    languageIsolationRegressionRecheckV2State: string;
    languageIsolationRegressionRecheckV2ScannedRows: number;
    languageIsolationRegressionRecheckV2ScannedTargetFields: number;
    languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale: number;
    languageIsolationRegressionRecheckV2PromptEntrypointsExpected: number;
    languageIsolationRegressionRecheckV2ManifestEntries: number;
    languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh: boolean;
    languageIsolationRegressionRecheckV2ReadyForApply: boolean;
    languageIsolationRegressionRecheckV2MayModifyProductionAppFiles: boolean;
    languageIsolationRegressionRecheckV2FixtureProbesPassed: number;
    languageIsolationRegressionRecheckV2FixtureProbes: number;
    readinessApplyBlockerMapRefreshV2Present: boolean;
    readinessApplyBlockerMapRefreshV2Ready: boolean;
    readinessApplyBlockerMapRefreshV2State: string;
    readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers: number;
    readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers: number;
    readinessApplyBlockerMapRefreshV2SafeClosed: number;
    readinessApplyBlockerMapRefreshV2SafeRemaining: number;
    readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh: boolean;
    readinessApplyBlockerMapRefreshV2ReadyForApply: boolean;
    readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles: boolean;
    readinessApplyBlockerMapRefreshV2FixtureProbesPassed: number;
    readinessApplyBlockerMapRefreshV2FixtureProbes: number;
    masterNextPassConsistencyRefreshV2Present: boolean;
    masterNextPassConsistencyRefreshV2Ready: boolean;
    masterNextPassConsistencyRefreshV2State: string;
    masterNextPassConsistencyRefreshV2NextGoalId: string;
    masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage: boolean;
    masterNextPassConsistencyRefreshV2ReadyForApply: boolean;
    masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles: boolean;
    masterNextPassConsistencyRefreshV2FixtureProbesPassed: number;
    masterNextPassConsistencyRefreshV2FixtureProbes: number;
    officialSourceContentCoverageV2Present: boolean;
    officialSourceContentCoverageV2Ready: boolean;
    officialSourceContentCoverageV2State: string;
    officialSourceContentCoverageV2LedgerRows: number;
    officialSourceContentCoverageV2AcceptedRows: number;
    officialSourceContentCoverageV2AcceptedAi: number;
    officialSourceContentCoverageV2RowsWithSourceRefs: number;
    officialSourceContentCoverageV2RowsWithGatesPassed: number;
    officialSourceContentCoverageV2QuizRowsOneCorrect: number;
    officialSourceContentCoverageV2TrustedSourceIds: number;
    officialSourceContentCoverageV2ResearchPackCheckedOnlineAt: string;
    officialSourceContentCoverageV2ReadyForImportDryRunRefresh: boolean;
    officialSourceContentCoverageV2ReadyForApply: boolean;
    officialSourceContentCoverageV2MayModifyProductionAppFiles: boolean;
    officialSourceContentCoverageV2FixtureProbesPassed: number;
    officialSourceContentCoverageV2FixtureProbes: number;
    officialSourcePayloadCreationApprovalPreflightV2Ready: boolean;
    officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate: boolean;
    officialSourceClosedLocalPayloadMaterializationV2Ready: boolean;
    officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight: boolean;
    generationHistoryReconciled: boolean;
    appAtlasFreshEnoughForP2: boolean;
    domainRegistryV2Ready: boolean;
    readyForNextLargePass: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  triggerPhrases: string[];
  contractRules: string[];
  currentPassCloseoutChecklist: string[];
  nextPassGoals: PassGoal[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

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

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
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

function fileMtimeMs(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
}

function summaryOf(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function triggerPhrases(): string[] {
  return [
    'dalshe',
    'dalee',
    'continue',
    'next',
    'go on',
    'keep going',
    'prodolzhay',
    'the user writes the Russian word for continue',
  ];
}

function contractRules(): string[] {
  return [
    'At the start of each pass, define one to three large pass goals before doing task work.',
    'A pass goal must close a meaningful pipeline slice, not a single micro-step, unless a hard blocker prevents more work.',
    'Every pass must include implementation or audit generation, then narrow verification, then regenerated status artifacts.',
    'Every pass must end by preparing the next large pass plan for the next continue prompt.',
    'If a pass is blocked, the blocker must be concrete, repeated in artifacts, and paired with the next unblock action.',
    'Do not modify production app files, reviewer decisions, activation flags, or apply approvals unless the exact approval gate exists.',
    'When new warnings or blockers appear, write them into the weakness/self-improvement loop or explain why they are accepted risk.',
    'The final response must report percent/progress in terms of the pass goal and the pipeline gate state, not vague activity.',
  ];
}

function closeoutChecklist(): string[] {
  return [
    'Large pass goal chosen and written into next_pass_goal_contract_packet.',
    'Relevant scripts/artifacts were created or refreshed.',
    'Narrow TypeScript check for edited scripts passed.',
    'New scripts were executed against the active run.',
    'Master manifest or equivalent run index was refreshed when its critical inputs changed.',
    'Brain/readiness gates were run when relevant to the edited slice.',
    'Next pass plan was written before final response.',
    'No production app write, reviewer decision, activation flag, or apply approval was created implicitly.',
  ];
}

function p3Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P3-RESEARCH-PACK',
      title: 'Build the trusted French research pack builder and verifier',
      whyNow: 'P0-P2 are now prepared: generation history is reconciled, the app atlas is fresh enough for V2, and Domain Registry V2 covers target-sensitive and AI prompt entrypoints.',
      workItems: [
        'Create gustav_target_research_pack_builder.ts as a file-based builder for research/fr_research_pack.json.',
        'Create gustav_target_research_pack_verify.ts with trusted-source, source-count, RU/UK comparison, anti-shortcut and no-French-output firewall checks.',
        'Use the existing French research contract source registry as the initial trusted-source catalog.',
        'Keep generated content blocked; the builder may write research artifacts only.',
      ],
      expectedArtifacts: [
        'research/fr_research_pack.json',
        'audits/target_research_pack_builder_packet.json',
        'audits/target_research_pack_verify_audit.json',
        'audits/pipeline_weakness_ledger.jsonl',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_target_research_pack_builder.ts scripts\\gustav_target_research_pack_verify.ts',
        'npx tsx scripts\\gustav_target_research_pack_builder.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_target_research_pack_verify.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'researchPackPresent becomes true in the verifier output.',
        'Every required grammar cluster has trusted source refs.',
        'The verifier reports blockers=0 for research-pack structure and shortcut firewalls.',
        'Generation V2 remains blocked until pedagogy blueprint and schema V2 exist.',
      ],
    },
    {
      id: 'NEXT-PASS-P10-INTEGRATE-RESEARCH-GATES',
      title: 'Wire research-pack status into master/brain gate V2 planning',
      whyNow: 'The next pass must not create research in isolation; master status must know whether research unlocks only P4, not generation/apply.',
      workItems: [
        'Add target research pack artifacts to the master manifest critical report list after they exist.',
        'Add summary fields for researchPackPresent, verifiedClusters and researchPackBlockers.',
        'Keep readyForGenerationV2=false until P4-P7 are also complete.',
      ],
      expectedArtifacts: [
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
        'audits/french_reviewer_master_manifest_packet.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Master manifest includes research pack status.',
        'Reviewer workflow remains available for legacy candidates.',
        'Decision import and apply remain false.',
      ],
    },
  ];
}

function p4Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P4-PEDAGOGY-BLUEPRINT',
      title: 'Build target-language pedagogy blueprint',
      whyNow: 'Research pack is present, so the next blocker is mapping the app source graph to French-specific pedagogy rather than direct translation.',
      workItems: [
        'Create gustav_target_pedagogy_blueprint.ts.',
        'Map every source lesson/phrase/quiz domain to grammar clusters and allowed transformation types.',
        'Mark resequence/split/merge decisions as candidates until reviewer gates approve.',
      ],
      expectedArtifacts: [
        'research/fr_pedagogy_blueprint.json',
        'audits/target_pedagogy_blueprint_packet.json',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_target_pedagogy_blueprint.ts',
        'npx tsx scripts\\gustav_target_pedagogy_blueprint.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Every generated/reviewer row can map to a blueprint node.',
        'No direct translation is allowed without blueprint decision.',
      ],
    },
  ];
}

function p5Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P5-GENERATION-SCHEMA-V2',
      title: 'Build Generation Schema V2 and evidence-backfill contract',
      whyNow: 'Research pack and pedagogy blueprint now exist; the next blocker is a row schema that requires evidence ids, blueprint ids, grammar clusters and transformation decisions before any new generation/import.',
      workItems: [
        'Create gustav_generation_schema_v2_packet.ts.',
        'Define the required row contract: targetLocale, sourceLocales, researchEvidenceIds, pedagogyBlueprintId, grammarClusterId, transformationType, antiCalqueDecision and language field declarations.',
        'Create a legacy evidence-backfill/regeneration plan for all 1600 rows without modifying generated ledgers.',
        'Keep Generation V2, reviewer import and apply blocked until schema coverage and later prompt/content gates pass.',
      ],
      expectedArtifacts: [
        'research/fr_generation_schema_v2.json',
        'audits/generation_schema_v2_packet.json',
        'audits/generation_schema_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_generation_schema_v2_packet.ts',
        'npx tsx scripts\\gustav_generation_schema_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Every one of the 1600 legacy rows has a schema V2 backfill/regeneration requirement.',
        'No row can become import/apply-ready without researchEvidenceIds and a pedagogyBlueprintId.',
        'Generation V2 remains blocked until AI prompt contract and content-quality gates are complete.',
      ],
    },
  ];
}

function p6Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P6-AI-PROMPT-CONTRACT-V2',
      title: 'Build AI Prompt Contract V2 for all prompt/cache entrypoints',
      whyNow: 'Generation Schema V2 exists; the next blocker is proving every AI prompt, explanation, cache and rejected-output path has strict target/source/ui language contracts.',
      workItems: [
        'Create gustav_ai_prompt_contract_v2_packet.ts.',
        'Map all 164 AI prompt entrypoints from Domain Registry V2 to targetLocale/sourceLocales/uiLocale/cache-key contracts.',
        'Add gates that reject fresh wrong-language AI text before return/cache, including explanation, weekly review, stats insights and premium/dialog features.',
        'Keep content generation and apply blocked until prompt and content quality gates both pass.',
      ],
      expectedArtifacts: [
        'research/fr_ai_prompt_contract_v2.json',
        'audits/ai_prompt_contract_v2_packet.json',
        'audits/ai_prompt_contract_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_ai_prompt_contract_v2_packet.ts',
        'npx tsx scripts\\gustav_ai_prompt_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'All AI prompt entrypoints have language and cache contracts.',
        'Rejected fresh AI output cannot be returned live or cached.',
        'Generation V2 remains blocked until content quality gates also exist.',
      ],
    },
  ];
}

function p7Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P7-CONTENT-QUALITY-GATES-V2',
      title: 'Build Content Quality Gates V2 for evidence-backed target content',
      whyNow: 'Research, pedagogy, row schema and AI prompt contracts now exist; the next blocker is quality gating for naturalness, anti-calque, grammar, quiz distractors and wrong-language output before any generated content can be reviewer-ready.',
      workItems: [
        'Create gustav_content_quality_gates_v2_packet.ts.',
        'Define anti-calque, grammar, naturalness, quiz one-correct-answer and source-locale leakage gates for generated target content.',
        'Attach gate requirements to all 1600 schema rows and high-risk AI output domains.',
        'Keep Generation V2, reviewer import and apply blocked until quality gates and reviewer workflow V2 are complete.',
      ],
      expectedArtifacts: [
        'research/fr_content_quality_gates_v2.json',
        'audits/content_quality_gates_v2_packet.json',
        'audits/content_quality_gates_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_content_quality_gates_v2_packet.ts',
        'npx tsx scripts\\gustav_content_quality_gates_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Every schema row has quality-gate requirements.',
        'All high-risk AI domains have wrong-language and anti-calque gates.',
        'Generation V2 remains blocked until reviewer workflow and activation gates are complete.',
      ],
    },
  ];
}

function p8Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P8-REVIEWER-WORKFLOW-V2',
      title: 'Build Reviewer Workflow V2 and decision import contract',
      whyNow: 'Content Quality Gates V2 now covers every schema row and AI prompt entrypoint; the next blocker is a reviewer workflow that records quality evidence and keeps generation/import/apply locked until decisions are explicit.',
      workItems: [
        'Create gustav_reviewer_workflow_v2_packet.ts.',
        'Define the reviewer decision schema for quality gates: language isolation, research evidence, anti-calque, grammar, naturalness, source meaning parity and quiz one-correct-answer.',
        'Prepare a V2 reviewer decision template for all 1600 schema rows without importing decisions or modifying generated ledgers.',
        'Require AI high-risk output decisions to bind contractId, gateIds, cache behavior and wrong-language rejection evidence.',
        'Keep Generation V2, reviewer decision import and apply blocked until brain gate and production activation gates are complete.',
      ],
      expectedArtifacts: [
        'generated/fr/reviewer/reviewer_workflow_v2_decision_schema.json',
        'generated/fr/reviewer/reviewer_decision_template_v2.jsonl',
        'audits/reviewer_workflow_v2_packet.json',
        'audits/reviewer_workflow_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_reviewer_workflow_v2_packet.ts',
        'npx tsx scripts\\gustav_reviewer_workflow_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Every one of the 1600 schema rows has a V2 reviewer decision slot tied to Content Quality Gates V2.',
        'Every high-risk AI output contract has a reviewer evidence requirement.',
        'Reviewer import, Generation V2 and apply remain blocked until later activation gates.',
      ],
    },
  ];
}

function p9Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P9-TARGET-PACK-MANIFEST-V2',
      title: 'Build Target Pack Manifest V2 and runtime/server blocker map',
      whyNow: 'Reviewer Workflow V2 exists, so the next production blocker is downloadable target-pack identity: manifest, hashes, item counts, loader/cache/server delivery status, storage/cloud impact and activationApproved=false until all runtime gates pass.',
      workItems: [
        'Create gustav_target_pack_manifest_v2_packet.ts.',
        'Draft an isolated French target pack manifest with studyTarget=fr, sourceLocales=ru,uk, source graph hash, research pack hash, pedagogy blueprint version, domain registry version and gate report refs.',
        'Bind manifest item counts to 1600 row decision slots and 164 AI prompt decision slots without uploading packs or enabling runtime downloads.',
        'Add runtime/server/storage/cloud/admin blocker map fields so activation cannot proceed while any delivery surface is unmapped.',
        'Keep activationApproved=false, serverUploadAllowed=false, runtimeDownloadsEnabled=false and readyForApply=false.',
      ],
      expectedArtifacts: [
        'pack_candidates/fr/target_pack_manifest_v2_draft.json',
        'audits/target_pack_manifest_v2_packet.json',
        'audits/target_pack_manifest_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_target_pack_manifest_v2_packet.ts',
        'npx tsx scripts\\gustav_target_pack_manifest_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'The draft manifest validates identity, hashes, item counts and gate refs.',
        'Runtime download, Firebase/server upload, storage/cloud migration and activation all remain explicitly blocked.',
        'Next pass can focus on runtime/server delivery contract or storage/cloud map depending on blocker priority.',
      ],
    },
  ];
}

function p10Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P10-RUNTIME-SERVER-DELIVERY-CONTRACT-V2',
      title: 'Build Runtime/Server Delivery Contract V2 for French target packs',
      whyNow: 'Target Pack Manifest V2 draft exists with hashes and blockers; the next blocker is mapping the app loader/cache/index/server/Firebase delivery path without enabling runtime downloads or uploading packs.',
      workItems: [
        'Create gustav_runtime_server_delivery_contract_v2_packet.ts.',
        'Map app/course_pack_manifest.ts, app/course_pack_index.ts and app/course_pack_loader.ts against the French target pack manifest draft.',
        'Define required per-source/per-surface runtime slices and cache keys for studyTarget=fr, sourceLocales=ru,uk.',
        'Record server/Firebase manifest requirements without uploading any files or enabling COURSE_PACK_REMOTE_LOADING_ENABLED.',
        'Keep runtimeDownloadsEnabled=false, serverUploadAllowed=false, activationApproved=false and readyForApply=false.',
      ],
      expectedArtifacts: [
        'audits/runtime_server_delivery_contract_v2_packet.json',
        'audits/runtime_server_delivery_contract_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_runtime_server_delivery_contract_v2_packet.ts',
        'npx tsx scripts\\gustav_runtime_server_delivery_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Runtime loader/cache/index/server delivery surfaces are mapped for French target packs.',
        'No runtime download, Firebase/server upload, production app write or activation approval is opened.',
        'Next pass can focus on storage/cloud target namespace mapping or admin delivery surfaces.',
      ],
    },
  ];
}

function p11Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P11-STORAGE-CLOUD-TARGET-NAMESPACE-MAP-V2',
      title: 'Build Storage/Cloud Target Namespace Map V2 for French isolation',
      whyNow: 'Runtime/Server Delivery Contract V2 maps the downloadable pack path while keeping downloads closed; the next blocker is proving every local storage and cloud sync namespace is target-scoped before any activation or migration.',
      workItems: [
        'Create gustav_storage_cloud_target_map_v2_packet.ts.',
        'Map app/target_storage_keys.ts, app/cloud_sync.ts, app/study_target.ts and account restore/wipe flows for studyTarget=fr.',
        'Verify French progress, flashcards, quizzes, lessons, daily tasks, personal practice and AI-derived state cannot share English/sourceLocale/UI-language keys.',
        'Record migration and cloud sync impact requirements without changing storage keys, cloud sync behavior or Firebase data.',
        'Keep storageMigrationAllowed=false, cloudSyncMigrationAllowed=false, activationApproved=false and readyForApply=false.',
      ],
      expectedArtifacts: [
        'audits/storage_cloud_target_map_v2_packet.json',
        'audits/storage_cloud_target_map_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_storage_cloud_target_map_v2_packet.ts',
        'npx tsx scripts\\gustav_storage_cloud_target_map_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'All French local/cloud state surfaces have a target-scoped namespace contract.',
        'No storage/cloud migration, Firebase write or runtime activation is opened.',
        'Next pass can focus on admin/reviewer delivery surfaces or payload materialization gates.',
      ],
    },
  ];
}

function p12Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P12-ADMIN-REVIEWER-DELIVERY-SURFACE-V2',
      title: 'Build Admin/Reviewer Delivery Surface V2 for French packs',
      whyNow: 'Storage/Cloud Target Namespace Map V2 proves French state is target-scoped; the next blocker is mapping admin preview/import/upload/reviewer controls without enabling server upload or activation.',
      workItems: [
        'Create gustav_admin_reviewer_delivery_surface_v2_packet.ts.',
        'Map admin/index.html, admin/v2, reviewer artifacts, pack manifest artifacts and import/dry-run scripts that can expose French packs.',
        'Define explicit admin approval fields for studyTarget=fr, sourceLocales=ru,uk, reviewer decision import, server manifest preview and rollback evidence.',
        'Add gates that reject UI/sourceLocale/studyTarget mixing in admin surfaces before any upload/apply path can open.',
        'Keep serverUploadAllowed=false, reviewerDecisionImportAllowed=false, activationApproved=false and readyForApply=false.',
      ],
      expectedArtifacts: [
        'audits/admin_pack_delivery_surface_v2_packet.json',
        'audits/admin_pack_delivery_surface_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_admin_reviewer_delivery_surface_v2_packet.ts',
        'npx tsx scripts\\gustav_admin_reviewer_delivery_surface_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'All French admin/reviewer delivery surfaces have explicit target/source/admin approval contracts.',
        'Reviewer import, server upload and activation remain closed.',
        'Next pass can focus on reviewer decision import dry-run or payload shard materialization gates.',
      ],
    },
  ];
}

function p13Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P13-REVIEWER-DECISION-IMPORT-V2-DRY-RUN',
      title: 'Build Reviewer Decision Import V2 dry-run for French row and AI decisions',
      whyNow: 'Admin/Reviewer Delivery Surface V2 now maps approval and delivery surfaces while keeping upload/import/activation closed; the next blocker is validating reviewer decision files against V2 row and AI templates without mutating generated ledgers.',
      workItems: [
        'Create gustav_reviewer_decision_import_v2_dry_run_packet.ts.',
        'Validate reviewer_decision_template_v2.jsonl and reviewer_ai_decision_template_v2.jsonl identity fields, targetLocale=fr, sourceLocales=ru,uk, gate ids and reviewer metadata rules.',
        'Add fixtures that reject wrong targetLocale, wrong sourceLocale, UI-locale leakage, context drift, corrections without notes, accept rows with corrections, duplicate decisions and activation attempts.',
        'Produce a dry-run report that can distinguish blank no-op templates from LLM official-source-reviewed import candidates.',
        'Keep reviewerDecisionImportAllowed=false, generated ledger writes=false, activationApproved=false and readyForApply=false.',
      ],
      expectedArtifacts: [
        'audits/reviewer_decision_import_v2_dry_run.json',
        'audits/reviewer_decision_import_v2_dry_run.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_reviewer_decision_import_v2_dry_run_packet.ts',
        'npx tsx scripts\\gustav_reviewer_decision_import_v2_dry_run_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'V2 row and AI decision dry-run accepts canonical blank templates as no-op and rejects all identity/language leakage fixtures.',
        'No generated ledger, reviewer decision, server upload or activation state is modified.',
        'Next pass can focus on payload shard materialization/checksum gates or server manifest preview.',
      ],
    },
  ];
}

function p14Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P14-PAYLOAD-SHARD-MATERIALIZATION-CHECKSUM-GATE-V2',
      title: 'Build payload shard materialization and checksum gate V2 for French packs',
      whyNow: 'Reviewer Decision Import V2 dry-run now validates row and AI decision files without mutating ledgers; the next blocker is proving how French downloadable payload shards will be materialized, checksummed and kept isolated before any server upload or runtime download can open.',
      workItems: [
        'Create gustav_payload_shard_materialization_checksum_v2_packet.ts.',
        'Map every required runtime slice from runtime_server_delivery_contract_v2.json to a future payload shard, manifest identity, checksum report and sourceLocale-specific path.',
        'Validate that each shard identity includes studyTarget=fr, sourceLocale=ru|uk, surface, schemaVersion, contentVersion and sha256 dimensions.',
        'Create checksum/materialization gates as dry-run metadata only unless a later explicit payload creation approval exists.',
        'Keep serverUploadAllowed=false, runtimeDownloadsEnabled=false, activationApproved=false and readyForApply=false.',
      ],
      expectedArtifacts: [
        'audits/payload_shard_materialization_checksum_v2_packet.json',
        'audits/payload_shard_materialization_checksum_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_payload_shard_materialization_checksum_v2_packet.ts',
        'npx tsx scripts\\gustav_payload_shard_materialization_checksum_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'All 12 French runtime slices have isolated materialization/checksum contracts.',
        'No server upload, runtime download, app bundle write or activation state is opened.',
        'Next pass can focus on server manifest preview or rollback/runtime cache integrity gates.',
      ],
    },
  ];
}

function p15Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P15-SERVER-DELIVERY-MANIFEST-PREVIEW-V2',
      title: 'Build server delivery manifest preview and rollback gate V2 for French packs',
      whyNow: 'Payload shard materialization/checksum contracts now prove the 12 French runtime slices, their sha256 dimensions and future paths without creating payloads. The next blocker is a dry-run server manifest preview that proves publish paths, rollback metadata and activation=false semantics before any upload or runtime download can open.',
      workItems: [
        'Create gustav_server_delivery_manifest_preview_v2_packet.ts.',
        'Use payload_shard_materialization_checksum_v2_packet.json as the source of truth for the 12 future server manifest entries.',
        'Validate each preview entry includes studyTarget=fr, sourceLocale=ru|uk, surface, schemaVersion, contentVersion, sha256 placeholder, byteSize placeholder, gateReportRefs, activationApproved:false and rollbackFromVersion.',
        'Reject UI locale dimensions, sourceLocale path drift, missing rollback metadata, missing checksum linkage, serverUploadAllowed=true, runtimeDownloadsEnabled=true and any production apply flag.',
        'Keep the preview dry-run only: no Firebase upload, no downloadable pack publication, no runtime index insertion and no app bundle changes.',
      ],
      expectedArtifacts: [
        'audits/server_delivery_manifest_preview_v2_packet.json',
        'audits/server_delivery_manifest_preview_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_server_delivery_manifest_preview_v2_packet.ts',
        'npx tsx scripts\\gustav_server_delivery_manifest_preview_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'All 12 French server manifest preview entries are target/source/surface/checksum scoped.',
        'Rollback metadata and gate report refs are present for every preview entry.',
        'No Firebase/server upload, runtime download, embedded index insertion, app bundle write or activation state is opened.',
        'Next pass can focus on runtime cache integrity and rollback simulation gates.',
      ],
    },
  ];
}

function p16Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P16-RUNTIME-CACHE-INTEGRITY-ROLLBACK-V2',
      title: 'Build runtime cache integrity and rollback simulation gate V2 for French packs',
      whyNow: 'Server delivery manifest preview now proves 12 dry-run French manifest entries, current gate refs and rollback metadata without publishing. The next blocker is proving how runtime cache states, checksum verification, corrupt/stale fallback and rollback recovery behave before runtime downloads can open.',
      workItems: [
        'Create gustav_runtime_cache_integrity_rollback_v2_packet.ts.',
        'Use server_delivery_manifest_preview_v2_packet.json as the source of truth for the 12 dry-run server entries.',
        'Validate cache identity dimensions studyTarget, sourceLocale, surface, schemaVersion, contentVersion and sha256 for ready/stale/corrupt/offline_fallback states.',
        'Simulate checksum mismatch, byteSize mismatch, sourceLocale mismatch, rollbackFromVersion usage and corrupt payload quarantine as dry-run fixtures only.',
        'Keep runtimeDownloadsEnabled=false, serverUploadAllowed=false, activationApproved=false, readyForApply=false and embedded index unchanged.',
      ],
      expectedArtifacts: [
        'audits/runtime_cache_integrity_rollback_v2_packet.json',
        'audits/runtime_cache_integrity_rollback_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_runtime_cache_integrity_rollback_v2_packet.ts',
        'npx tsx scripts\\gustav_runtime_cache_integrity_rollback_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'All 12 French preview entries have cache integrity and rollback simulation contracts.',
        'Checksum/byteSize/sourceLocale mismatch fixtures are rejected before cache state can become ready.',
        'Rollback simulation keeps runtime downloads and activation closed.',
        'Next pass can focus on reviewer decision import/opening workflow or payload creation approval preflight, depending on remaining gates.',
      ],
    },
  ];
}

function p17Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P17-REVIEWER-DECISION-IMPORT-OPENING-PREFLIGHT-V2',
      title: 'Build reviewer decision import opening preflight V2 for French packs',
      whyNow: 'Runtime cache integrity and rollback simulations now prove that downloadable French pack cache states stay closed and mismatch-safe. The next blocker is proving when reviewer decision import may open, and making that opening depend on real reviewed row/AI decisions without allowing payload creation, upload, activation or app apply.',
      workItems: [
        'Create gustav_reviewer_decision_import_opening_preflight_v2_packet.ts.',
        'Use reviewer_decision_template_v2.jsonl, reviewer_ai_decision_template_v2.jsonl and runtime_cache_integrity_rollback_v2_packet.json as inputs.',
        'Require LLM-reviewed row decisions and AI decisions before reviewerDecisionImportAllowed can become true; blank no-op templates must keep import closed.',
        'Reject accepted rows with missing gateReviewerDecisions, AI contracts with open rejected-fresh return/cache, wrong target/sourceLocale, duplicate decisions and activation attempts.',
        'Keep generated ledger writes, payload creation, server upload, runtime downloads, activationApproved and readyForApply false.',
      ],
      expectedArtifacts: [
        'audits/reviewer_decision_import_opening_preflight_v2_packet.json',
        'audits/reviewer_decision_import_opening_preflight_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_reviewer_decision_import_opening_preflight_v2_packet.ts',
        'npx tsx scripts\\gustav_reviewer_decision_import_opening_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Blank reviewer templates keep real import closed with explicit no-op evidence.',
        'The preflight can distinguish import-closed, import-ready and import-rejected states without mutating generated ledgers.',
        'No payload creation, upload, runtime download, activation or app apply state is opened.',
        'Next pass can either process real reviewer decisions when provided or build payload creation approval preflight if decisions are accepted.',
      ],
    },
  ];
}

function p18Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P18-LLM-OFFICIAL-SOURCE-REVIEW-INTAKE-V2',
      title: 'Build LLM official-source review intake V2 for French',
      whyNow: 'P17 proves reviewer decision import opening is safe, but the review function must now belong to an LLM official-source reviewer, not a person. The next blocker is a contract that requires Cambridge-style lexical evidence, French authority/grammar evidence, evidence ids and language isolation before any decision import can move forward.',
      workItems: [
        'Create gustav_llm_official_source_review_intake_v2_packet.ts.',
        'Read research/fr_research_pack.json, research/evidence_ledger.json, content_quality_gates_v2_packet.json, ai_prompt_contract_v2_packet.json, P13 dry-run and P17 opening preflight.',
        'Require LLM official-source review owner, trusted source families, Cambridge evidence presence, French authority/grammar evidence and evidence-id citation policy.',
        'Measure current LLM decision coverage without pretending that missing decisions are approved.',
        'Keep decision import, generated ledger writes, payload creation, runtime downloads, activationApproved and readyForApply closed.',
      ],
      expectedArtifacts: [
        'audits/llm_official_source_review_intake_v2_packet.json',
        'audits/llm_official_source_review_intake_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_llm_official_source_review_intake_v2_packet.ts',
        'npx tsx scripts\\gustav_llm_official_source_review_intake_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'The pipeline reports that people-based review is not required and LLM official-source review is required.',
        'Trusted source families include Cambridge plus French authority/grammar sources.',
        'Wrong target/sourceLocale, open activation/apply flags and rejected-fresh AI output leaks remain hard blockers.',
        'Next pass can run the execution gate, which must remain closed until real LLM official-source decisions exist.',
      ],
    },
  ];
}

function p19Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P19-REVIEWER-DECISION-IMPORT-EXECUTION-GATE-V2',
      title: 'Build reviewer decision import execution gate V2 in closed dry-run mode',
      whyNow: 'P18 now assigns the review function to the LLM official-source reviewer and proves trusted-source policy is present. The next safety layer is an execution gate that explicitly refuses reviewer import until real LLM official-source decisions are complete and P17/P13 remain clean.',
      workItems: [
        'Create gustav_reviewer_decision_import_execution_gate_v2_packet.ts.',
        'Read P18 coverage intake, P17 opening preflight, P13 decision import dry-run and V2 reviewer templates.',
        'Return closed_pending_llm_official_source_decisions, closed_partial_llm_official_source_review, eligible_llm_official_source_review or blocked_by_findings without importing decisions.',
        'Reject stale P13/P17/P18 counts, partial LLM official-source review, wrong target/sourceLocale, open import/apply/activation flags and rejected-fresh AI output leaks.',
        'Keep generated ledger writes, payload creation, server upload, runtime downloads, activationApproved and readyForApply false.',
      ],
      expectedArtifacts: [
        'audits/reviewer_decision_import_execution_gate_v2_packet.json',
        'audits/reviewer_decision_import_execution_gate_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_reviewer_decision_import_execution_gate_v2_packet.ts',
        'npx tsx scripts\\gustav_reviewer_decision_import_execution_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'The execution gate refuses import in the current pending_llm_official_source_decisions state.',
        'A synthetic full LLM official-source review fixture can become eligible without opening production writes.',
        'Partial LLM official-source review and stale upstream artifacts remain blockers or closed states.',
        'Next pass can focus on payload creation approval preflight or reviewer-file handoff rules only after real LLM review coverage exists.',
      ],
    },
  ];
}

function p20Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P20-LLM-OFFICIAL-SOURCE-DECISION-MATERIALIZATION-V2',
      title: 'Build LLM official-source decision materialization V2',
      whyNow: 'P19 is PASS but closed_pending_llm_official_source_decisions: the review function is assigned to LLM with trusted sources, yet no row/AI decisions have been materialized. Payload work must wait until the LLM produces evidence-cited decisions for the required gates.',
      workItems: [
        'Create gustav_llm_official_source_decision_materialization_v2_packet.ts.',
        'Read LLM official-source intake, reviewer_workflow_v2_decision_schema.json, row/AI decision templates, research pack and evidence ledger.',
        'Define the decision materialization contract: every accepted row/AI decision must cite researchEvidenceIds/source family evidence, gate ids, source meaning parity, language isolation and reject-before-return/cache evidence.',
        'Keep materialization in dry-run/packet mode first: do not overwrite reviewer templates, import decisions, write generated ledgers, create payloads, upload packs, enable downloads or approve apply.',
        'Add probes that reject uncited LLM decisions, unofficial sources, wrong target/sourceLocale, mixed UI/source/study language, and accepted decisions with unreviewed gates.',
      ],
      expectedArtifacts: [
        'audits/llm_official_source_decision_materialization_v2_packet.json',
        'audits/llm_official_source_decision_materialization_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_llm_official_source_decision_materialization_v2_packet.ts',
        'npx tsx scripts\\gustav_llm_official_source_decision_materialization_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'The packet proves people-based review is not required and LLM official-source decisions are the only review path.',
        'Every future accepted decision requires official/trusted evidence ids and language-isolation proof.',
        'Current state remains closed because no decisions have been applied/imported yet.',
        'Next pass can either run a controlled LLM decision dry-run or build payload preflight only after P19 reviewerDecisionImportWouldRun becomes true.',
      ],
    },
  ];
}

function p21Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P21-CONTROLLED-LLM-OFFICIAL-SOURCE-DECISION-DRY-RUN-V2',
      title: 'Build controlled LLM official-source decision dry-run V2',
      whyNow: 'P20 proves the materialization contract is ready and no decisions were written. The next blocker is a controlled dry-run that can produce candidate LLM review decisions with official-source evidence without overwriting reviewer templates or importing anything.',
      workItems: [
        'Create gustav_llm_official_source_decision_dry_run_v2_packet.ts.',
        'Read P20 materialization contract, row/AI templates, research pack, evidence ledger and source family map.',
        'Define a dry-run output location for candidate decisions separate from reviewer templates.',
        'Require every candidate accepted decision to cite evidence ids, source family ids, source meaning parity, language isolation, and row/AI gate outcomes.',
        'Keep candidate decision writes confined to audits or generated dry-run proposal files; do not import, overwrite templates, create payloads, upload, enable downloads or approve apply.',
      ],
      expectedArtifacts: [
        'audits/llm_official_source_decision_dry_run_v2_packet.json',
        'audits/llm_official_source_decision_dry_run_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_llm_official_source_decision_dry_run_v2_packet.ts',
        'npx tsx scripts\\gustav_llm_official_source_decision_dry_run_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'The dry-run can prove how LLM decisions will be produced without touching import templates.',
        'Uncited, unofficial-source, wrong-language, wrong-sourceLocale and incomplete-gate candidates are rejected.',
        'Reviewer decision import remains closed until candidate decisions are separately promoted through P13/P17/P19.',
        'Payload creation remains out of scope until P19 reviewerDecisionImportWouldRun becomes true.',
      ],
    },
  ];
}

function p22Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P22-LLM-OFFICIAL-SOURCE-DECISION-PROMOTION-PREFLIGHT-V2',
      title: 'Build LLM official-source decision promotion preflight V2',
      whyNow: 'P21 can now create pending row/AI proposal files with official-source requirements, but no reviewed decisions have been promoted. The next blocker is a closed preflight that proves candidate proposals can become separate reviewed decision files without overwriting templates, importing, creating payloads or opening apply.',
      workItems: [
        'Create gustav_llm_official_source_decision_promotion_preflight_v2_packet.ts.',
        'Read P20 materialization contract, P21 dry-run proposal files, reviewer templates and P19 execution gate.',
        'Validate promotion rules for row proposals: evidence ids, trusted source family ids, gate decisions, source meaning parity, language isolation, anti-calque, grammar naturalness and quiz correctness.',
        'Validate promotion rules for AI proposals: wrong-language gate, cache-language key gate, reject-before-return/cache, language-safe fallback and domain evidence.',
        'Write only a preflight packet and optional dry-run promotion manifest; do not overwrite templates, import decisions, create payloads, upload, enable downloads or approve apply.',
      ],
      expectedArtifacts: [
        'audits/llm_official_source_decision_promotion_preflight_v2_packet.json',
        'audits/llm_official_source_decision_promotion_preflight_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_llm_official_source_decision_promotion_preflight_v2_packet.ts',
        'npx tsx scripts\\gustav_llm_official_source_decision_promotion_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Pending proposal files cannot be treated as accepted reviewed decisions.',
        'Only evidence-complete LLM official-source decisions can be promoted into separate reviewed decision files.',
        'Reviewer templates, generated ledgers, payloads, server upload, runtime downloads, activation and apply remain closed.',
        'Next pass can refresh P13/P17/P18/P19 only after promoted decision files exist.',
      ],
    },
  ];
}

function p23Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P23-LLM-OFFICIAL-SOURCE-PROMOTED-DECISION-FILE-GENERATION-V2',
      title: 'Generate separate LLM official-source reviewed decision files V2',
      whyNow: 'P22 proved pending proposals can be promoted safely only into separate reviewed decision files. The next blocker is generating those files with evidence-cited LLM official-source decisions, then refreshing P13/P17/P18/P19 with explicit --row-decisions and --ai-decisions paths.',
      workItems: [
        'Create gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts.',
        'Read P22 promotion manifest, P21 proposal files, reviewer templates and trusted research evidence.',
        'Generate separate row_decisions_reviewed_v2.jsonl and ai_decisions_reviewed_v2.jsonl only in generated/fr/reviewer/llm_official_source_promoted_decisions_v2.',
        'For each accepted row, require evidence ids, source family ids, official source refs, source meaning parity, language isolation, anti-calque, grammar naturalness and quiz-one-correct proof.',
        'For each accepted AI contract, require wrong-language, cache-language and live-return gates plus reject-before-return/cache proof.',
        'Run P13/P17/P18/P19 against the separate reviewed decision files; keep payload/apply closed until P19 reviewerDecisionImportWouldRun=true.',
      ],
      expectedArtifacts: [
        'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/row_decisions_reviewed_v2.jsonl',
        'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/ai_decisions_reviewed_v2.jsonl',
        'audits/llm_official_source_promoted_decision_file_generation_v2_packet.json',
        'audits/llm_official_source_promoted_decision_file_generation_v2_packet.md',
        'audits/reviewer_decision_import_v2_dry_run.json',
        'audits/reviewer_decision_import_opening_preflight_v2_packet.json',
        'audits/llm_official_source_review_intake_v2_packet.json',
        'audits/reviewer_decision_import_execution_gate_v2_packet.json',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts',
        'npx tsx scripts\\gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_reviewer_decision_import_v2_dry_run_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr --row-decisions docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/reviewer/llm_official_source_promoted_decisions_v2/row_decisions_reviewed_v2.jsonl --ai-decisions docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/reviewer/llm_official_source_promoted_decisions_v2/ai_decisions_reviewed_v2.jsonl',
        'npx tsx scripts\\gustav_reviewer_decision_import_opening_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr --row-decisions docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/reviewer/llm_official_source_promoted_decisions_v2/row_decisions_reviewed_v2.jsonl --ai-decisions docs/gustav/runs/2026-05-19_fr_inventory_v0a1/generated/fr/reviewer/llm_official_source_promoted_decisions_v2/ai_decisions_reviewed_v2.jsonl',
        'npx tsx scripts\\gustav_llm_official_source_review_intake_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_reviewer_decision_import_execution_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Separate reviewed decision files exist and templates remain unchanged.',
        'P13/P17/P18/P19 read the promoted files and report full LLM official-source review coverage.',
        'Wrong-language, source-locale, cache and apply/upload/download flags remain closed.',
        'Payload work remains blocked until decision import execution gate genuinely would run.',
      ],
    },
  ];
}

function p24Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P24-PAYLOAD-CREATION-APPROVAL-PREFLIGHT-V2',
      title: 'Build payload creation approval preflight V2 in closed mode',
      whyNow: 'P19 now makes reviewer decision import execution explicit, and P23 produced LLM official-source promoted decision files. The next safety layer is proving payload creation cannot start unless all P14-P23 gates remain current.',
      workItems: [
        'Create gustav_payload_creation_approval_preflight_v2_packet.ts.',
        'Read P14 payload materialization, P15 server preview, P16 runtime cache, P19 execution gate and target pack manifest.',
        'Return closed_no_import, closed_partial_llm_official_source_review, eligible_after_import_execution or blocked_by_findings without creating payload shards.',
        'Reject stale hashes, missing checksum contracts, execution gate not eligible, server upload flags, runtime downloads, activationApproved and readyForApply.',
        'Keep payload creation, checksum report creation, server upload, runtime downloads, activationApproved and app apply false.',
      ],
      expectedArtifacts: [
        'audits/payload_creation_approval_preflight_v2_packet.json',
        'audits/payload_creation_approval_preflight_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_payload_creation_approval_preflight_v2_packet.ts',
        'npx tsx scripts\\gustav_payload_creation_approval_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Current inputs reach eligible_after_import_execution without writing payload files.',
        'Synthetic closed_no_import and closed_partial_llm_official_source_review states keep payload creation closed.',
        'Any open upload/download/apply/activation flag is a blocker.',
        'Next pass can focus on local closed payload materialization while server upload/runtime downloads/apply stay closed.',
      ],
    },
  ];
}

function p25Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P25-CLOSED-LOCAL-PAYLOAD-MATERIALIZATION-V2',
      title: 'Build closed local payload materialization V2',
      whyNow: 'P24 proves the promoted LLM official-source decisions, dry-run checksum contracts, server preview and runtime cache contracts are current. The next large pass can create local pack-candidate payload artifacts only inside the French run container, with upload/download/apply still closed.',
      workItems: [
        'Create gustav_closed_local_payload_materialization_v2_packet.ts.',
        'Read P24, P14-P16, target_pack_manifest_v2_draft and the promoted LLM official-source decision files.',
        'Materialize local runtime_slices under docs/gustav/runs/2026-05-19_fr_inventory_v0a1/pack_candidates/fr/runtime_slices only.',
        'Produce per-source/per-surface slice manifests, entry indexes, payload shards and checksum reports with studyTarget=fr and sourceLocale-scoped paths.',
        'Reject any UI-locale identity dimension, cross-language cache key, missing checksum, stale upstream hash, server upload, runtime download, activationApproved or readyForApply flag.',
      ],
      expectedArtifacts: [
        'pack_candidates/fr/runtime_slices/*/slice_manifest.json',
        'pack_candidates/fr/runtime_slices/*/entry_index.json',
        'pack_candidates/fr/runtime_slices/*/payload.json',
        'pack_candidates/fr/runtime_slices/*/checksum_report.json',
        'audits/closed_local_payload_materialization_v2_packet.json',
        'audits/closed_local_payload_materialization_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_closed_local_payload_materialization_v2_packet.ts',
        'npx tsx scripts\\gustav_closed_local_payload_materialization_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_language_isolation_audit.ts --target fr --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'All 12 local runtime slices exist only under pack_candidates/fr/runtime_slices.',
        'Every payload/checksum/manifest identity includes studyTarget=fr, sourceLocale and surface.',
        'No server manifest is published, no Firebase/server upload starts, runtime downloads remain disabled, activationApproved=false and readyForApply=false.',
        'Next pass can build a server-delivery publish preflight against the local payload artifacts.',
      ],
    },
  ];
}

function p26Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P26-SERVER-DELIVERY-PUBLISH-PREFLIGHT-V2',
      title: 'Build local server delivery publish preflight V2',
      whyNow: 'P25 materialized all 12 local French runtime slices with real payload hashes and byte sizes. The next safety layer is to create a local server delivery manifest draft/preflight that references those hashes without uploading, publishing, enabling downloads or approving activation.',
      workItems: [
        'Create gustav_server_delivery_publish_preflight_v2_packet.ts.',
        'Read P25, P15 server preview and all local runtime_slices manifests/checksum reports.',
        'Build a local pack_candidates/fr/server_delivery_manifest_v2_draft.json with actual sha256/byteSize values and rollback metadata.',
        'Reject missing slices, checksum mismatches, stale P25 hashes, sourceLocale path drift, UI locale dimensions, upload flags, runtimeDownloadsEnabled, activationApproved and readyForApply.',
        'Keep serverUploadAllowed=false, firebaseUploadAllowed=false, downloadablePacksPublished=false, runtimeDownloadsEnabled=false and activationApproved=false.',
      ],
      expectedArtifacts: [
        'pack_candidates/fr/server_delivery_manifest_v2_draft.json',
        'audits/server_delivery_publish_preflight_v2_packet.json',
        'audits/server_delivery_publish_preflight_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_server_delivery_publish_preflight_v2_packet.ts',
        'npx tsx scripts\\gustav_server_delivery_publish_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_language_isolation_audit.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'The local server manifest draft references all 12 runtime slices with real payload sha256 and byteSize values.',
        'No Firebase/server upload starts, no downloadable pack is published and runtime downloads remain disabled.',
        'ActivationApproved=false, readyForApply=false and mayModifyProductionAppFiles=false remain explicit in the packet.',
        'Next pass can focus on admin/server delivery review surfaces or runtime loader preflight, not production apply.',
      ],
    },
  ];
}

function p27Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P27-ADMIN-SERVER-DELIVERY-RUNTIME-PREFLIGHT-V2',
      title: 'Build admin/server delivery and runtime loader preflight V2',
      whyNow: 'P26 created a local server delivery manifest draft with real French pack hashes and byte sizes. The next pass must prove admin/server review surfaces and runtime loader contracts can consume the draft while uploads, runtime downloads and activation remain closed.',
      workItems: [
        'Create gustav_admin_server_delivery_runtime_preflight_v2_packet.ts.',
        'Read P26 server manifest draft, P12 admin delivery surface map, P16 runtime cache rollback contracts and storage/cloud target map.',
        'Verify admin-visible metadata is target/source scoped and cannot confuse studyTarget, sourceLocale, UI language or cache state.',
        'Verify runtime loader preflight rejects the draft while COURSE_PACK_REMOTE_LOADING_ENABLED=false and activationApproved=false.',
        'Keep admin import/upload, server upload, Firebase upload, runtimeDownloadsEnabled, activationApproved and readyForApply false.',
      ],
      expectedArtifacts: [
        'audits/admin_server_delivery_runtime_preflight_v2_packet.json',
        'audits/admin_server_delivery_runtime_preflight_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_admin_server_delivery_runtime_preflight_v2_packet.ts',
        'npx tsx scripts\\gustav_admin_server_delivery_runtime_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx jest --runInBand tests/gustav_admin_target_isolation.test.ts tests/course_pack_runtime_contract.test.ts',
      ],
      doneWhen: [
        'Admin/server delivery review sees all 12 manifest entries with studyTarget=fr and sourceLocale-scoped paths.',
        'Runtime loader preflight proves downloads remain disabled and no ready cache state is opened.',
        'No upload, runtime download, activationApproved, readyForApply or production app modification flag is opened.',
        'Next pass can focus on storage/cloud/admin apply planning or runtime activation blockers, still without production apply.',
      ],
    },
  ];
}

function p28Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P28-RUNTIME-ACTIVATION-BLOCKER-PLAN-V2',
      title: 'Build runtime activation blocker and apply-plan dry-run V2',
      whyNow: 'P27 proves admin/server/runtime can see the local French manifest draft while production stays closed. The next pass must enumerate the exact remaining activation blockers and produce a dry-run apply plan without modifying app files, remote config, Firebase, storage or cloud migration state.',
      workItems: [
        'Create gustav_runtime_activation_blocker_plan_v2_packet.ts.',
        'Read P27, readiness blocker reduction, target pack manifest, runtime/server/storage/admin contracts and server manifest draft.',
        'Produce an ordered blocker plan for runtime downloads, server upload, storage/cloud migration, admin approval, rollback and production apply gates.',
        'Map every planned app/admin/server/cloud file touch to an explicit future approval gate and rollback check.',
        'Keep activationApproved=false, readyForApply=false, mayModifyProductionAppFiles=false and all upload/download/migration flags false.',
      ],
      expectedArtifacts: [
        'audits/runtime_activation_blocker_plan_v2_packet.json',
        'audits/runtime_activation_blocker_plan_v2_packet.md',
        'apply_plan/fr_activation_apply_plan_dry_run.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_runtime_activation_blocker_plan_v2_packet.ts',
        'npx tsx scripts\\gustav_runtime_activation_blocker_plan_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_readiness_gate.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Every remaining production blocker is mapped to an explicit future gate and rollback requirement.',
        'No production app files, Firebase/server uploads, storage/cloud migrations or runtime downloads are modified.',
        'The apply plan remains dry-run only and activationApproved=false.',
        'Next pass can start implementing only the approved lowest-risk activation blockers, still behind explicit gates.',
      ],
    },
  ];
}

function p29Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P29-EXPLICIT-APPROVAL-RECEIPT-HASH-LOCK-GATE-V2',
      title: 'Build explicit approval receipt and hash-lock gate V2',
      whyNow: 'P28 produced the dry-run activation blocker plan. The next gate must prove production work cannot start without an explicit approval receipt, exact file/hash lock, dirty-worktree overlap audit and rollback packet.',
      workItems: [
        'Create gustav_explicit_approval_receipt_hash_lock_gate_v2_packet.ts.',
        'Read P28 apply-plan dry-run, readiness blocker reduction, current git dirty file list and critical Gustav run hashes.',
        'Produce a request-only approval receipt template and hash-lock manifest without approving or applying it.',
        'Reject missing rollback plan, dirty overlap ambiguity, unlisted production file touches, upload/download/activation flags and readyForApply=true.',
        'Keep productionWritesAllowed=false, activationApproved=false, readyForApply=false and mayModifyProductionAppFiles=false.',
      ],
      expectedArtifacts: [
        'audits/explicit_approval_receipt_hash_lock_gate_v2_packet.json',
        'audits/explicit_approval_receipt_hash_lock_gate_v2_packet.md',
        'apply_plan/explicit_approval_receipt_template_v2.md',
        'apply_plan/hash_lock_manifest_dry_run_v2.json',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_explicit_approval_receipt_hash_lock_gate_v2_packet.ts',
        'npx tsx scripts\\gustav_explicit_approval_receipt_hash_lock_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_readiness_blocker_reduction_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
      ],
      doneWhen: [
        'Approval receipt and hash-lock artifacts exist only as dry-run/request templates.',
        'Dirty-worktree overlap and exact future touch list are machine-readable.',
        'No production app file, Firebase/server upload, runtime download, storage/cloud migration or activation flag is opened.',
        'Next pass can decide whether to request explicit user approval or continue closing lower-risk non-production blockers.',
      ],
    },
  ];
}

function p30Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P30-ACTIVATION-APPROVAL-REQUEST-PRESENTATION-V2',
      title: 'Build activation approval request presentation V2',
      whyNow: 'P29 created the request-only approval template and dry-run hash lock. The next gate must package the exact decision evidence for the project owner while keeping production apply closed until an active receipt/hash lock exists.',
      workItems: [
        'Create gustav_activation_approval_request_presentation_v2_packet.ts.',
        'Read P28 blocker plan, P29 approval/hash-lock gate, readiness blockers, server manifest draft, target manifest and dirty-worktree hash evidence.',
        'Produce a single approval request packet that lists exact future touches, closed flags, rollback requirements, dirty-worktree ambiguity and hash-locked artifacts.',
        'Reject any active receipt/hash-lock mismatch, any open upload/download/activation/apply flag, and any request that omits rollback or dirty-worktree evidence.',
        'Keep activationApproved=false, readyForApply=false, mayModifyProductionAppFiles=false and productionWritesAllowed=false.',
      ],
      expectedArtifacts: [
        'audits/activation_approval_request_presentation_v2_packet.json',
        'audits/activation_approval_request_presentation_v2_packet.md',
        'apply_plan/activation_approval_request_v2.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_activation_approval_request_presentation_v2_packet.ts',
        'npx tsx scripts\\gustav_activation_approval_request_presentation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'A user-facing approval request packet exists and is hash-linked to P28/P29 artifacts.',
        'The packet says HOLD for production apply until an active approval receipt and active hash lock are explicitly created.',
        'No production app file, Firebase/server upload, runtime download, storage/cloud migration or activation flag is opened.',
        'Next pass can only create the active receipt/hash lock if the exact approval phrase is present.',
      ],
    },
  ];
}

function p31Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P31-EXPLICIT-APPROVAL-RECEIPT-CREATION-GATE-V2',
      title: 'Build explicit approval receipt creation gate V2',
      whyNow: 'P30 presented the exact activation approval request. The next gate must prove that a plain continue prompt is not approval and that active receipt/hash-lock creation can happen only with the exact approval sentence.',
      workItems: [
        'Create gustav_explicit_approval_receipt_creation_gate_v2_packet.ts.',
        'Read P30 approval request, P29 hash-lock dry run, P28 blocker plan, current dirty-worktree evidence and any future approval input source.',
        'Reject missing exact approval sentence, stale hash locks, dirty-worktree drift, open upload/download/activation/apply flags and unlisted production touches.',
        'When the exact approval sentence is absent, write a HOLD packet only and do not create active approval/hash-lock artifacts.',
        'Keep activationApproved=false, readyForApply=false, mayModifyProductionAppFiles=false and productionWritesAllowed=false unless a later explicit receipt creation request is valid.',
      ],
      expectedArtifacts: [
        'audits/explicit_approval_receipt_creation_gate_v2_packet.json',
        'audits/explicit_approval_receipt_creation_gate_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_explicit_approval_receipt_creation_gate_v2_packet.ts',
        'npx tsx scripts\\gustav_explicit_approval_receipt_creation_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'The gate reports HOLD when no exact approval sentence is present.',
        'The gate proves active approval/hash-lock artifacts were not created by a plain continue pass.',
        'All activation/upload/download/storage-cloud/apply flags remain closed.',
        'Next pass cannot proceed to production apply unless active receipt/hash-lock artifacts are valid and hash-current.',
      ],
    },
  ];
}

function p32Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P32-PRODUCTION-APPLY-ABSENCE-DENIAL-GATE-V2',
      title: 'Build production apply absence denial gate V2',
      whyNow: 'P31 proved that a plain continue prompt is not approval and no active receipt/hash-lock exists. The next safety layer must prove production apply cannot start while those active artifacts are absent.',
      workItems: [
        'Create gustav_production_apply_absence_denial_gate_v2_packet.ts.',
        'Read P31, P30, P29, P28, readiness, target manifest and server manifest draft.',
        'Reject any production apply path when active approval receipt or active hash lock is missing.',
        'Verify all upload/download/storage-cloud/apply flags remain closed and that dirty-worktree evidence is still captured.',
        'Keep activationApproved=false, readyForApply=false, mayModifyProductionAppFiles=false and productionWritesAllowed=false.',
      ],
      expectedArtifacts: [
        'audits/production_apply_absence_denial_gate_v2_packet.json',
        'audits/production_apply_absence_denial_gate_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_production_apply_absence_denial_gate_v2_packet.ts',
        'npx tsx scripts\\gustav_production_apply_absence_denial_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Production apply denial is machine-readable and tied to missing active receipt/hash-lock evidence.',
        'The packet reports HOLD, not PASS-for-apply.',
        'No production app file, Firebase/server upload, runtime download, storage/cloud migration or activation flag is opened.',
        'Next pass can continue non-production blocker/audit work or wait for exact approval input.',
      ],
    },
  ];
}

function p33Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P33-NONPRODUCTION-BLOCKER-CLOSURE-PLAN-V2',
      title: 'Build non-production blocker closure plan V2 after apply denial',
      whyNow: 'P32 should prove production apply is denied while active approval artifacts are absent. The next large pass must keep moving toward production by closing only non-production evidence gaps and preparing the exact future unblock list.',
      workItems: [
        'Create a non-production blocker closure packet that reads P18-P32, readiness, master, language isolation, brain gate and server manifest evidence.',
        'Separate remaining work into safe non-production audit/generation-review tasks versus exact-approval-only production/apply tasks.',
        'Re-rank blockers by production impact: LLM official-source evidence freshness, runtime/server manifest consistency, storage/cloud isolation proof and rollback completeness.',
        'Add fixture probes that reject any production app write, Firebase/server upload, runtime download, storage/cloud migration, active approval artifact creation or activationApproved=true.',
        'Keep activationApproved=false, readyForApply=false, mayModifyProductionAppFiles=false and productionWritesAllowed=false.',
      ],
      expectedArtifacts: [
        'audits/nonproduction_blocker_closure_plan_v2_packet.json',
        'audits/nonproduction_blocker_closure_plan_v2_packet.md',
      ],
      verificationCommands: [
        'npx tsc --noEmit --pretty false --skipLibCheck --target es2018 --module commonjs --moduleResolution node scripts\\gustav_nonproduction_blocker_closure_plan_v2_packet.ts',
        'npx tsx scripts\\gustav_nonproduction_blocker_closure_plan_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'All remaining non-production-safe work is explicitly ranked and paired with evidence/gates.',
        'All production-only work remains blocked behind exact approval receipt/hash-lock validation.',
        'The packet says which next safe closure task can run without touching app/server/storage/cloud runtime state.',
        'No production app file, Firebase/server upload, runtime download, storage/cloud migration or activation flag is opened.',
      ],
    },
  ];
}

function p34Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P34-NONPRODUCTION-EVIDENCE-REFRESH-V2',
      title: 'Refresh safe non-production evidence after P33 closure ranking',
      whyNow: 'P33 ranks the remaining safe work and keeps all production gates closed. The next large pass should execute the first safe closure item without creating approvals, uploads, runtime downloads, migrations or app writes.',
      workItems: [
        'Execute NP-01 from nonproduction_blocker_closure_plan_v2_packet: refresh LLM official-source evidence freshness only.',
        'Re-run LLM official-source intake, promoted-decision generation, language isolation, run validator, P33, next-pass and master manifest.',
        'Confirm the promoted decision artifacts stay confined to reviewer/run outputs and do not import into generated ledgers or runtime payloads.',
        'Keep activationApproved=false, readyForApply=false, mayModifyProductionAppFiles=false and productionWritesAllowed=false.',
      ],
      expectedArtifacts: [
        'audits/llm_official_source_review_intake_v2_packet.json',
        'audits/llm_official_source_promoted_decision_file_generation_v2_packet.json',
        'audits/nonproduction_blocker_closure_plan_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_llm_official_source_review_intake_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_nonproduction_blocker_closure_plan_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'NP-01 evidence freshness remains PASS with no non-LLM review dependency.',
        'Language isolation and run validator remain PASS.',
        'P33 remains ready and points to the next safe item or a concrete exact-approval-only stop.',
        'No production app file, Firebase/server upload, runtime download, storage/cloud migration or activation flag is opened.',
      ],
    },
  ];
}

function p35Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P35-RUNTIME-SERVER-MANIFEST-CONSISTENCY-RECHECK-V2',
      title: 'Recheck runtime/server manifest consistency while publication stays closed',
      whyNow: 'P34 refreshed the LLM official-source evidence and removed legacy review residue. The next safe blocker closure item is NP-02: prove local server/runtime manifests remain internally consistent without upload, runtime download or activation.',
      workItems: [
        'Execute NP-02 from nonproduction_blocker_closure_plan_v2_packet.',
        'Re-run server delivery publish preflight and admin/server/runtime preflight.',
        'Verify every local manifest entry still has actual sha256, byte size, gate refs and activationApproved=false.',
        'Keep serverUploadAllowed=false, firebaseUploadAllowed=false, runtimeDownloadsEnabled=false, downloadablePacksPublished=false and readyForApply=false.',
      ],
      expectedArtifacts: [
        'audits/server_delivery_manifest_preview_v2_packet.json',
        'audits/runtime_cache_integrity_rollback_v2_packet.json',
        'audits/server_delivery_publish_preflight_v2_packet.json',
        'audits/admin_server_delivery_runtime_preflight_v2_packet.json',
        'audits/nonproduction_evidence_refresh_v2_packet.json',
        'audits/runtime_server_manifest_consistency_recheck_v2_packet.json',
        'audits/nonproduction_blocker_closure_plan_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_server_delivery_manifest_preview_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_runtime_cache_integrity_rollback_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_server_delivery_publish_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_admin_server_delivery_runtime_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_nonproduction_evidence_refresh_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_runtime_server_manifest_consistency_recheck_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Server/runtime manifest evidence remains PASS.',
        'All publication/download/activation flags remain false.',
        'Next-pass and master manifest both include P35-ready evidence and keep readyForApply=false.',
      ],
    },
  ];
}

function p36Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P36-LANGUAGE-ISOLATION-REGRESSION-RECHECK-V2',
      title: 'Re-run language isolation regression after runtime/server manifest consistency',
      whyNow: 'P35 proves the local runtime/server manifest is internally consistent and still closed. The next safe blocker-closure item is NP-03: re-run isolation over the current French generated, reviewer, manifest and admin/runtime evidence so language boundaries stay clean after the new manifest layer.',
      workItems: [
        'Execute NP-03 from nonproduction_blocker_closure_plan_v2_packet.',
        'Re-run language isolation, run validator and Gustav brain gate over the refreshed P35 artifact set.',
        'Verify French study target remains separate from sourceLocale, UI language, cache keys, cloud/storage state, prompts and admin surfaces.',
        'Keep activationApproved=false, readyForApply=false, runtimeDownloadsEnabled=false and mayModifyProductionAppFiles=false.',
      ],
      expectedArtifacts: [
        'audits/runtime_server_manifest_consistency_recheck_v2_packet.json',
        'audits/french_language_isolation_audit.json',
        'audits/run_validator_report.json',
        'docs/gustav/GUSTAV_BRAIN_GATE_REPORT_*.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_french_language_isolation_audit.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
        'npx tsx scripts\\gustav_validate_run.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
        'node scripts\\gustav_brain_gate.mjs --study-target fr --source-locales ru,uk',
        'npx tsx scripts\\gustav_runtime_server_manifest_consistency_recheck_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Language isolation and run validator remain PASS with zero blockers. ',
        'P35 remains ready with no stale manifest refs or open activation/download/apply flags.',
        'Master and next-pass artifacts point to the next safe non-production blocker-closure step.',
      ],
    },
  ];
}

function p37Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P37-READINESS-APPLY-BLOCKER-MAP-REFRESH-V2',
      title: 'Refresh readiness and apply blocker map after isolation regression',
      whyNow: 'P36 proves the current French artifact set still keeps studyTarget, sourceLocale, UI locale, cache, cloud, prompts and admin surfaces separated. The next safe blocker-closure item is NP-04: refresh the exact readiness/apply blocker map without opening production apply.',
      workItems: [
        'Execute NP-04 from nonproduction_blocker_closure_plan_v2_packet.',
        'Re-run readiness/apply blocker evidence after P35 and P36 are both ready.',
        'Confirm which blockers are true production-only gates and which remain safe non-production audit work.',
        'Keep activationApproved=false, readyForApply=false, runtimeDownloadsEnabled=false and mayModifyProductionAppFiles=false.',
      ],
      expectedArtifacts: [
        'audits/language_isolation_regression_recheck_v2_packet.json',
        'audits/gustav_readiness_gate.json',
        'audits/runtime_activation_blocker_plan_v2_packet.json',
        'audits/production_apply_absence_denial_gate_v2_packet.json',
        'audits/readiness_apply_blocker_map_refresh_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'node scripts\\gustav_brain_gate.mjs --study-target fr --source-locales ru,uk',
        'npx tsx scripts\\gustav_language_isolation_regression_recheck_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_runtime_activation_blocker_plan_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_production_apply_absence_denial_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_readiness_apply_blocker_map_refresh_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Readiness/apply blocker map is refreshed from the current P36-ready artifact set.',
        'Production-only blockers remain explicit and closed.',
        'No active approval receipt, hash lock, server upload, runtime download or apply flag is created.',
      ],
    },
  ];
}

function p38Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P38-MASTER-NEXT-PASS-CONSISTENCY-REFRESH-V2',
      title: 'Refresh master and next-pass consistency after readiness/apply blocker map',
      whyNow: 'P37 proves the current French run has zero generation blockers, exactly two expected production/apply blockers, and no opened production switches. The next safe blocker-closure item is NP-05: refresh the master/next-pass consistency layer so every future pass is routed from the current evidence, not stale readiness assumptions.',
      workItems: [
        'Execute NP-05 from nonproduction_blocker_closure_plan_v2_packet.',
        'Re-run the master manifest and next-pass contract against the P37 artifact.',
        'Verify Gustav reports P37 as closed and prepares only the next safe non-production or exact-approval step.',
        'Keep activationApproved=false, readyForApply=false, runtimeDownloadsEnabled=false and mayModifyProductionAppFiles=false.',
      ],
      expectedArtifacts: [
        'audits/readiness_apply_blocker_map_refresh_v2_packet.json',
        'audits/master_next_pass_consistency_refresh_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'audits/next_large_pass_plan.md',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.md',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_readiness_apply_blocker_map_refresh_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_master_next_pass_consistency_refresh_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'P37 is represented in both next-pass and master manifest summaries.',
        'Next-pass no longer repeats P37 after its artifact is PASS.',
        'All production/apply/upload/download/storage-cloud flags remain closed.',
      ],
    },
  ];
}

function p39Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P39-OFFICIAL-SOURCE-CONTENT-COVERAGE-V2',
      title: 'Prove official-source coverage for every French content row and AI contract',
      whyNow: 'P38 proves Gustav master and next-pass state are consistent after the readiness/apply blocker map. The next safe step is to prove that every generated French row, quiz task and AI contract has LLM official-source evidence before any import or app apply can be considered.',
      workItems: [
        'Run the French official-source content coverage V2 gate over all 1600 row decisions and 164 AI decisions.',
        'Match promoted LLM decisions back to lesson ledgers and reviewer queue identities.',
        'Verify every row has RU/UK source-locale coverage, official source refs, trusted evidence ids, all required gates passed and a one-correct quiz.',
        'Keep reviewer import, generated ledger writes, app apply, uploads and runtime downloads closed.',
      ],
      expectedArtifacts: [
        'audits/master_next_pass_consistency_refresh_v2_packet.json',
        'audits/french_official_source_content_coverage_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_master_next_pass_consistency_refresh_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_official_source_content_coverage_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Official-source coverage is 1600/1600 rows and 164/164 AI contracts.',
        'Every row maps back to both ledgers and reviewer queue.',
        'No import/apply/upload/download flag opens.',
      ],
    },
  ];
}

function p40Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P40-REVIEWER-DECISION-IMPORT-DRY-RUN-REFRESH-V2',
      title: 'Refresh reviewer decision import dry-run after official-source coverage',
      whyNow: 'P39 proves all generated French content and AI contracts have accepted LLM official-source decisions in promoted no-import files. The next safe step is to refresh the reviewer decision import dry-run against those promoted files without writing generated ledgers or app bundle content.',
      workItems: [
        'Run the import dry-run refresh using the promoted official-source row and AI decision files.',
        'Verify corrections, rejects, identity mismatches and language-boundary drift remain zero before any execution gate.',
        'Keep generated ledger writes, app apply, uploads and runtime downloads closed.',
      ],
      expectedArtifacts: [
        'audits/french_official_source_content_coverage_v2_packet.json',
        'audits/reviewer_decision_import_v2_dry_run.json',
        'audits/reviewer_decision_import_execution_gate_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_french_official_source_content_coverage_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_reviewer_decision_import_v2_dry_run_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr --row-decisions docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1\\generated\\fr\\reviewer\\llm_official_source_promoted_decisions_v2\\row_decisions_reviewed_v2.jsonl --ai-decisions docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1\\generated\\fr\\reviewer\\llm_official_source_promoted_decisions_v2\\ai_decisions_reviewed_v2.jsonl',
        'npx tsx scripts\\gustav_reviewer_decision_import_execution_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Dry-run consumes the promoted official-source decisions and reports zero blockers.',
        'Execution gate remains closed unless it is explicitly safe and non-production.',
        'No production/apply/upload/download/storage-cloud transition opens.',
      ],
    },
  ];
}

function p41Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P41-PAYLOAD-CREATION-APPROVAL-PREFLIGHT-REFRESH-V2',
      title: 'Refresh payload creation approval preflight after official-source import gates',
      whyNow: 'P40 proves the reviewer import dry-run and execution gate are now bound to promoted official-source French decisions. The next safe step is to refresh payload creation approval preflight from that exact gate state, while keeping payload creation, app apply, uploads and runtime downloads closed.',
      workItems: [
        'Run payload creation approval preflight after the refreshed official-source import dry-run and execution gate.',
        'Verify the preflight depends on P40 official-source import state, promoted decision files and closed production flags.',
        'Confirm local payload creation remains disabled until the closed local materialization gate is explicitly reached.',
      ],
      expectedArtifacts: [
        'audits/reviewer_decision_import_v2_dry_run.json',
        'audits/reviewer_decision_import_execution_gate_v2_packet.json',
        'audits/payload_creation_approval_preflight_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_reviewer_decision_import_v2_dry_run_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr --row-decisions docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1\\generated\\fr\\reviewer\\llm_official_source_promoted_decisions_v2\\row_decisions_reviewed_v2.jsonl --ai-decisions docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1\\generated\\fr\\reviewer\\llm_official_source_promoted_decisions_v2\\ai_decisions_reviewed_v2.jsonl',
        'npx tsx scripts\\gustav_reviewer_decision_import_execution_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_payload_creation_approval_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Payload creation approval preflight is fresh after the P40 execution gate.',
        'The preflight keeps payload creation/apply/upload/download flags closed.',
        'Next pass can safely decide whether closed local payload materialization needs a refresh.',
      ],
    },
  ];
}

function p42Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P42-CLOSED-LOCAL-PAYLOAD-MATERIALIZATION-REFRESH-V2',
      title: 'Refresh closed local payload materialization after official-source preflight',
      whyNow: 'P41 refreshes the payload creation approval preflight after official-source import gates. The next safe non-production step is to refresh closed local payload materialization from that fresh preflight without publishing, uploading, enabling downloads or touching the app bundle.',
      workItems: [
        'Run closed local payload materialization after the refreshed payload creation approval preflight.',
        'Verify all local payload shards remain studyTarget=fr/sourceLocale-scoped and checksum-linked.',
        'Keep server upload, Firebase upload, runtime downloads, app apply and activation flags closed.',
      ],
      expectedArtifacts: [
        'audits/payload_creation_approval_preflight_v2_packet.json',
        'audits/closed_local_payload_materialization_v2_packet.json',
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_payload_creation_approval_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_closed_local_payload_materialization_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
      ],
      doneWhen: [
        'Closed local payload materialization is fresh after the P41 payload preflight.',
        'Local shard checksums and target/source locale identities are stable.',
        'No server/apply/upload/download/storage-cloud activation opens.',
      ],
    },
  ];
}

function p43Goals(): PassGoal[] {
  return [
    {
      id: 'NEXT-PASS-P43-PRODUCTION-ACTIVATION-HOLD-EXACT-APPROVAL-REQUIRED-V2',
      title: 'Hold production activation until exact approval receipt exists',
      whyNow: 'All closed-mode French content, official-source, payload, server/admin/runtime, language-isolation and apply-denial gates are fresh. The next step must not loop back to earlier preflights; it must preserve the HOLD state and require an exact approval receipt/hash lock before any production app write, upload, runtime download, storage/cloud migration or activation flag can open.',
      workItems: [
        'Do not run app apply, Firebase/server upload, runtime downloads, storage/cloud migration or activation.',
        'Keep the exact approval sentence requirement from P30/P31 as the only path toward active approval artifacts.',
        'Refresh final evidence only if an upstream artifact changes; otherwise report production activation HOLD.',
        'Make any future production pass depend on active approval receipt, active hash lock, dirty-worktree audit and rollback plan.',
      ],
      expectedArtifacts: [
        'audits/next_pass_goal_contract_packet.json',
        'generated/fr/reviewer/french_reviewer_master_manifest.json',
        'audits/production_apply_absence_denial_gate_v2_packet.json',
        'apply_plan/activation_approval_request_v2.md',
      ],
      verificationCommands: [
        'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
        'npx tsx scripts\\gustav_production_apply_absence_denial_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
        'npx jest --runInBand tests/gustav_admin_target_isolation.test.ts tests/course_pack_runtime_contract.test.ts tests/gustav_target_storage_keys.test.ts tests/cloud_sync_sync_keys_validity.test.ts tests/cloud_sync_daily_tasks_merge.test.ts',
      ],
      doneWhen: [
        'Next-pass planning no longer loops to P26 after all closed-mode gates are fresh.',
        'Master remains HOLD with readyForApply=false and mayModifyProductionAppFiles=false.',
        'Production activation remains blocked until an explicit active approval receipt and hash lock are created by a separate exact-approval pass.',
        'French study target remains isolated from English, sourceLocale, UI language, cloud state, cache, prompts and admin surfaces.',
      ],
    },
  ];
}

function selectNextPassGoals(
  researchPackVerified: boolean,
  pedagogyBlueprintReady: boolean,
  generationSchemaV2Ready: boolean,
  aiPromptContractV2Ready: boolean,
  contentQualityGatesV2Ready: boolean,
  reviewerWorkflowV2Ready: boolean,
  targetPackManifestV2Ready: boolean,
  runtimeServerDeliveryContractV2Ready: boolean,
  storageCloudTargetMapV2Ready: boolean,
  adminReviewerDeliverySurfaceV2Ready: boolean,
  reviewerDecisionImportV2DryRunReady: boolean,
  payloadShardMaterializationChecksumV2Ready: boolean,
  serverDeliveryManifestPreviewV2Ready: boolean,
  runtimeCacheIntegrityRollbackV2Ready: boolean,
  reviewerDecisionImportOpeningPreflightV2Ready: boolean,
  llmOfficialSourceReviewIntakeV2Ready: boolean,
  reviewerDecisionImportExecutionGateV2Ready: boolean,
  reviewerDecisionImportExecutionGateV2WouldRun: boolean,
  llmOfficialSourceDecisionMaterializationV2Ready: boolean,
  llmOfficialSourceDecisionDryRunV2Ready: boolean,
  llmOfficialSourceDecisionPromotionPreflightV2Ready: boolean,
  llmOfficialSourcePromotedDecisionFileGenerationV2Ready: boolean,
  payloadCreationApprovalPreflightV2Ready: boolean,
  closedLocalPayloadMaterializationV2Ready: boolean,
  serverDeliveryPublishPreflightV2Ready: boolean,
  adminServerDeliveryRuntimePreflightV2Ready: boolean,
  runtimeActivationBlockerPlanV2Ready: boolean,
  explicitApprovalReceiptHashLockGateV2Ready: boolean,
  activationApprovalRequestPresentationV2Ready: boolean,
  explicitApprovalReceiptCreationGateV2SafeHoldReady: boolean,
  productionApplyAbsenceDenialGateV2SafeHoldReady: boolean,
  nonproductionBlockerClosurePlanV2Ready: boolean,
  nonproductionEvidenceRefreshV2Ready: boolean,
  runtimeServerManifestConsistencyRecheckV2Ready: boolean,
  languageIsolationRegressionRecheckV2Ready: boolean,
  readinessApplyBlockerMapRefreshV2Ready: boolean,
  masterNextPassConsistencyRefreshV2Ready: boolean,
  officialSourceContentCoverageV2Ready: boolean,
  officialSourceImportDryRunV2Ready: boolean,
  officialSourceImportExecutionGateV2Ready: boolean,
  officialSourcePayloadCreationApprovalPreflightV2Ready: boolean,
  officialSourceClosedLocalPayloadMaterializationV2Ready: boolean,
  p0p2Ready: boolean,
): PassGoal[] {
  if (!p0p2Ready) {
    return [
      {
        id: 'NEXT-PASS-P0-P2-CLOSEOUT',
        title: 'Close P0-P2 prerequisites before research work',
        whyNow: 'The pipeline cannot safely enter research-pack construction until generation history, app atlas and Domain Registry V2 have zero blockers.',
        workItems: [
          'Re-run generation history reconciliation.',
          'Re-run app atlas refresh and classify any target-sensitive unknowns.',
          'Re-run Domain Registry V2 and cover every AI prompt entrypoint.',
          'Refresh the upgrade packet and next-pass contract.',
        ],
        expectedArtifacts: [
          'audits/generation_history_reconciliation_audit.json',
          'audits/app_atlas_refresh_audit.json',
          'audits/algorithm_domain_registry_v2_packet.json',
          'audits/self_improving_pipeline_upgrade_packet.json',
          'audits/next_pass_goal_contract_packet.json',
        ],
        verificationCommands: [
          'npx tsx scripts\\gustav_generation_history_reconciliation_audit.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
          'npx tsx scripts\\gustav_app_atlas_refresh_audit.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
          'npx tsx scripts\\gustav_algorithm_domain_registry_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
        ],
        doneWhen: [
          'P0-P2 blockers are zero.',
          'Next pass can start P3 research pack builder.',
        ],
      },
    ];
  }
  if (!researchPackVerified) return p3Goals();
  if (!pedagogyBlueprintReady) return p4Goals();
  if (!generationSchemaV2Ready) return p5Goals();
  if (!aiPromptContractV2Ready) return p6Goals();
  if (!contentQualityGatesV2Ready) return p7Goals();
  if (!reviewerWorkflowV2Ready) return p8Goals();
  if (!targetPackManifestV2Ready) return p9Goals();
  if (!runtimeServerDeliveryContractV2Ready) return p10Goals();
  if (!storageCloudTargetMapV2Ready) return p11Goals();
  if (!adminReviewerDeliverySurfaceV2Ready) return p12Goals();
  if (!reviewerDecisionImportV2DryRunReady) return p13Goals();
  if (!payloadShardMaterializationChecksumV2Ready) return p14Goals();
  if (!serverDeliveryManifestPreviewV2Ready) return p15Goals();
  if (!runtimeCacheIntegrityRollbackV2Ready) return p16Goals();
  if (!reviewerDecisionImportOpeningPreflightV2Ready) return p17Goals();
  if (!llmOfficialSourceReviewIntakeV2Ready) return p18Goals();
  if (!reviewerDecisionImportExecutionGateV2Ready) return p19Goals();
  if (!reviewerDecisionImportExecutionGateV2WouldRun && !llmOfficialSourceDecisionMaterializationV2Ready) return p20Goals();
  if (!reviewerDecisionImportExecutionGateV2WouldRun && !llmOfficialSourceDecisionDryRunV2Ready) return p21Goals();
  if (!reviewerDecisionImportExecutionGateV2WouldRun && !llmOfficialSourceDecisionPromotionPreflightV2Ready) return p22Goals();
  if (!reviewerDecisionImportExecutionGateV2WouldRun && !llmOfficialSourcePromotedDecisionFileGenerationV2Ready) return p23Goals();
  if (!reviewerDecisionImportExecutionGateV2WouldRun) return p19Goals();
  if (!payloadCreationApprovalPreflightV2Ready) return p24Goals();
  if (!closedLocalPayloadMaterializationV2Ready) return p25Goals();
  if (!serverDeliveryPublishPreflightV2Ready) return p26Goals();
  if (!adminServerDeliveryRuntimePreflightV2Ready) return p27Goals();
  if (!runtimeActivationBlockerPlanV2Ready) return p28Goals();
  if (!explicitApprovalReceiptHashLockGateV2Ready) return p29Goals();
  if (!activationApprovalRequestPresentationV2Ready) return p30Goals();
  if (!explicitApprovalReceiptCreationGateV2SafeHoldReady) return p31Goals();
  if (!productionApplyAbsenceDenialGateV2SafeHoldReady) return p32Goals();
  if (!nonproductionBlockerClosurePlanV2Ready) return p33Goals();
  if (!nonproductionEvidenceRefreshV2Ready) return p34Goals();
  if (!runtimeServerManifestConsistencyRecheckV2Ready) return p35Goals();
  if (!languageIsolationRegressionRecheckV2Ready) return p36Goals();
  if (!readinessApplyBlockerMapRefreshV2Ready) return p37Goals();
  if (!masterNextPassConsistencyRefreshV2Ready) return p38Goals();
  if (!officialSourceContentCoverageV2Ready) return p39Goals();
  if (!officialSourceImportDryRunV2Ready || !officialSourceImportExecutionGateV2Ready) return p40Goals();
  if (!officialSourcePayloadCreationApprovalPreflightV2Ready) return p41Goals();
  if (!officialSourceClosedLocalPayloadMaterializationV2Ready) return p42Goals();
  return p43Goals();
}

function renderPlanMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Next Large Pass Plan',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Rule',
    '',
    'When the next prompt says continue, the pass must close a large, named work packet and then prepare the following packet before final response.',
    '',
    '## Next Pass Goals',
    '',
  ];
  for (const goal of report.nextPassGoals) {
    lines.push(`### ${goal.id}`);
    lines.push('');
    lines.push(goal.title);
    lines.push('');
    lines.push(`Why now: ${goal.whyNow}`);
    lines.push('');
    lines.push('Work items:');
    goal.workItems.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
    lines.push('Expected artifacts:');
    goal.expectedArtifacts.forEach((item) => lines.push(`- \`${item}\``));
    lines.push('');
    lines.push('Verification commands:');
    goal.verificationCommands.forEach((item) => lines.push(`- \`${item}\``));
    lines.push('');
    lines.push('Done when:');
    goal.doneWhen.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Next Pass Goal Contract Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Trigger phrases: ${report.summary.triggerPhrases}`,
    `- Contract rules: ${report.summary.contractRules}`,
    `- Next pass large goals: ${report.summary.nextPassLargeGoals}`,
    `- Next pass prepared: ${report.summary.nextPassPrepared ? 'yes' : 'no'}`,
    `- Current pass must be large: ${report.summary.currentPassMustBeLarge ? 'yes' : 'no'}`,
    `- Must run verification before final: ${report.summary.mustRunVerificationBeforeFinal ? 'yes' : 'no'}`,
    `- Must prepare next plan before final: ${report.summary.mustPrepareNextPlanBeforeFinal ? 'yes' : 'no'}`,
    `- Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- Research pack verified: ${report.summary.researchPackVerified ? 'yes' : 'no'}`,
    `- Ready for pedagogy blueprint: ${report.summary.readyForPedagogyBlueprint ? 'yes' : 'no'}`,
    `- Pedagogy blueprint present: ${report.summary.pedagogyBlueprintPresent ? 'yes' : 'no'}`,
    `- Pedagogy blueprint ready: ${report.summary.pedagogyBlueprintReady ? 'yes' : 'no'}`,
    `- Ready for Generation Schema V2: ${report.summary.readyForGenerationSchemaV2 ? 'yes' : 'no'}`,
    `- Generation Schema V2 present: ${report.summary.generationSchemaV2Present ? 'yes' : 'no'}`,
    `- Generation Schema V2 ready: ${report.summary.generationSchemaV2Ready ? 'yes' : 'no'}`,
    `- Ready for AI Prompt Contract V2: ${report.summary.readyForAiPromptContractV2 ? 'yes' : 'no'}`,
    `- AI Prompt Contract V2 present: ${report.summary.aiPromptContractV2Present ? 'yes' : 'no'}`,
    `- AI Prompt Contract V2 ready: ${report.summary.aiPromptContractV2Ready ? 'yes' : 'no'}`,
    `- Ready for Content Quality Gates V2: ${report.summary.readyForContentQualityGatesV2 ? 'yes' : 'no'}`,
    `- Content Quality Gates V2 present: ${report.summary.contentQualityGatesV2Present ? 'yes' : 'no'}`,
    `- Content Quality Gates V2 ready: ${report.summary.contentQualityGatesV2Ready ? 'yes' : 'no'}`,
    `- Ready for Reviewer Workflow V2: ${report.summary.readyForReviewerWorkflowV2 ? 'yes' : 'no'}`,
    `- Reviewer Workflow V2 present: ${report.summary.reviewerWorkflowV2Present ? 'yes' : 'no'}`,
    `- Reviewer Workflow V2 ready: ${report.summary.reviewerWorkflowV2Ready ? 'yes' : 'no'}`,
    `- Ready for LLM official-source review V2: ${report.summary.readyForLlmOfficialSourceReviewV2 ? 'yes' : 'no'}`,
    `- Ready for Brain Gate V2: ${report.summary.readyForBrainGateV2 ? 'yes' : 'no'}`,
    `- Target Pack Manifest V2 present: ${report.summary.targetPackManifestV2Present ? 'yes' : 'no'}`,
    `- Target Pack Manifest V2 ready: ${report.summary.targetPackManifestV2Ready ? 'yes' : 'no'}`,
    `- Ready for Runtime/Server Delivery Contract V2: ${report.summary.readyForRuntimeServerDeliveryContractV2 ? 'yes' : 'no'}`,
    `- Runtime/Server Delivery Contract V2 present: ${report.summary.runtimeServerDeliveryContractV2Present ? 'yes' : 'no'}`,
    `- Runtime/Server Delivery Contract V2 ready: ${report.summary.runtimeServerDeliveryContractV2Ready ? 'yes' : 'no'}`,
    `- Ready for Storage/Cloud Target Map V2: ${report.summary.readyForStorageCloudTargetMapV2 ? 'yes' : 'no'}`,
    `- Storage/Cloud Target Map V2 present: ${report.summary.storageCloudTargetMapV2Present ? 'yes' : 'no'}`,
    `- Storage/Cloud Target Map V2 ready: ${report.summary.storageCloudTargetMapV2Ready ? 'yes' : 'no'}`,
    `- Ready for Admin Pack Delivery Surface V2: ${report.summary.readyForAdminPackDeliverySurfaceV2 ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 present: ${report.summary.adminReviewerDeliverySurfaceV2Present ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 ready: ${report.summary.adminReviewerDeliverySurfaceV2Ready ? 'yes' : 'no'}`,
    `- Ready for Reviewer Decision Import V2 dry-run: ${report.summary.readyForReviewerDecisionImportV2DryRun ? 'yes' : 'no'}`,
    `- Reviewer Decision Import V2 dry-run present: ${report.summary.reviewerDecisionImportV2DryRunPresent ? 'yes' : 'no'}`,
    `- Reviewer Decision Import V2 dry-run ready: ${report.summary.reviewerDecisionImportV2DryRunReady ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 present: ${report.summary.officialSourceImportDryRunV2Present ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 ready: ${report.summary.officialSourceImportDryRunV2Ready ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 rows/AI: ${report.summary.officialSourceImportDryRunV2Rows}/${report.summary.officialSourceImportDryRunV2Ai}`,
    `- Official-source import dry-run V2 accepted rows/AI: ${report.summary.officialSourceImportDryRunV2AcceptedRows}/${report.summary.officialSourceImportDryRunV2AcceptedAi}`,
    `- Official-source import dry-run V2 promoted row/AI files used: ${report.summary.officialSourceImportDryRunV2PromotedRowFileUsed ? 'yes' : 'no'}/${report.summary.officialSourceImportDryRunV2PromotedAiFileUsed ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 ready for execution gate refresh: ${report.summary.officialSourceImportDryRunV2ReadyForExecutionGateRefresh ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 ready for apply: ${report.summary.officialSourceImportDryRunV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 may modify production app files: ${report.summary.officialSourceImportDryRunV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 row probes: ${report.summary.officialSourceImportDryRunV2RowProbesPassed}/${report.summary.officialSourceImportDryRunV2RowProbes}`,
    `- Official-source import dry-run V2 AI probes: ${report.summary.officialSourceImportDryRunV2AiProbesPassed}/${report.summary.officialSourceImportDryRunV2AiProbes}`,
    `- Ready for payload shard materialization gate: ${report.summary.readyForPayloadShardMaterializationGate ? 'yes' : 'no'}`,
    `- Payload shard materialization/checksum V2 present: ${report.summary.payloadShardMaterializationChecksumV2Present ? 'yes' : 'no'}`,
    `- Payload shard materialization/checksum V2 ready: ${report.summary.payloadShardMaterializationChecksumV2Ready ? 'yes' : 'no'}`,
    `- Ready for server manifest preview gate: ${report.summary.readyForServerManifestPreviewGate ? 'yes' : 'no'}`,
    `- Server delivery manifest preview V2 present: ${report.summary.serverDeliveryManifestPreviewV2Present ? 'yes' : 'no'}`,
    `- Server delivery manifest preview V2 ready: ${report.summary.serverDeliveryManifestPreviewV2Ready ? 'yes' : 'no'}`,
    `- Ready for runtime cache integrity gate: ${report.summary.readyForRuntimeCacheIntegrityGate ? 'yes' : 'no'}`,
    `- Runtime cache integrity/rollback V2 present: ${report.summary.runtimeCacheIntegrityRollbackV2Present ? 'yes' : 'no'}`,
    `- Runtime cache integrity/rollback V2 ready: ${report.summary.runtimeCacheIntegrityRollbackV2Ready ? 'yes' : 'no'}`,
    `- Ready for reviewer decision import opening gate: ${report.summary.readyForReviewerDecisionImportOpeningGate ? 'yes' : 'no'}`,
    `- Reviewer decision import opening preflight V2 present: ${report.summary.reviewerDecisionImportOpeningPreflightV2Present ? 'yes' : 'no'}`,
    `- Reviewer decision import opening preflight V2 ready: ${report.summary.reviewerDecisionImportOpeningPreflightV2Ready ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate ready: ${report.summary.reviewerDecisionImportExecutionGateReady ? 'yes' : 'no'}`,
    `- Ready for payload creation approval preflight: ${report.summary.readyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- LLM official-source review intake V2 present: ${report.summary.llmOfficialSourceReviewIntakeV2Present ? 'yes' : 'no'}`,
    `- LLM official-source review intake V2 ready: ${report.summary.llmOfficialSourceReviewIntakeV2Ready ? 'yes' : 'no'}`,
    `- LLM official-source review intake V2 state: ${report.summary.llmOfficialSourceReviewIntakeV2State}`,
    `- LLM official-source review intake V2 row coverage: ${report.summary.llmOfficialSourceReviewIntakeV2RowCoveragePct}%`,
    `- LLM official-source review intake V2 AI coverage: ${report.summary.llmOfficialSourceReviewIntakeV2AiCoveragePct}%`,
    `- Ready for reviewer decision import execution gate: ${report.summary.readyForReviewerDecisionImportExecutionGate ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 present: ${report.summary.reviewerDecisionImportExecutionGateV2Present ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 ready: ${report.summary.reviewerDecisionImportExecutionGateV2Ready ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 state: ${report.summary.reviewerDecisionImportExecutionGateV2State}`,
    `- Reviewer decision import execution gate V2 would run: ${report.summary.reviewerDecisionImportExecutionGateV2WouldRun ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 ready: ${report.summary.officialSourceImportExecutionGateV2Ready ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 state: ${report.summary.officialSourceImportExecutionGateV2State}`,
    `- Official-source import execution gate V2 would run: ${report.summary.officialSourceImportExecutionGateV2WouldRun ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 P13 coverage ready: ${report.summary.officialSourceImportExecutionGateV2P13CoverageReady ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 promoted row/AI files used: ${report.summary.officialSourceImportExecutionGateV2PromotedRowFileUsed ? 'yes' : 'no'}/${report.summary.officialSourceImportExecutionGateV2PromotedAiFileUsed ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 ready for payload preflight: ${report.summary.officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 ready for apply: ${report.summary.officialSourceImportExecutionGateV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 may modify production app files: ${report.summary.officialSourceImportExecutionGateV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 fixture probes: ${report.summary.officialSourceImportExecutionGateV2FixtureProbesPassed}/${report.summary.officialSourceImportExecutionGateV2FixtureProbes}`,
    `- LLM official-source decision materialization V2 present: ${report.summary.llmOfficialSourceDecisionMaterializationV2Present ? 'yes' : 'no'}`,
    `- LLM official-source decision materialization V2 ready: ${report.summary.llmOfficialSourceDecisionMaterializationV2Ready ? 'yes' : 'no'}`,
    `- LLM official-source decision materialization V2 state: ${report.summary.llmOfficialSourceDecisionMaterializationV2State}`,
    `- LLM official-source decision materialization V2 ready for dry-run: ${report.summary.llmOfficialSourceDecisionMaterializationV2ReadyForDryRun ? 'yes' : 'no'}`,
    `- LLM official-source decision dry-run V2 present: ${report.summary.llmOfficialSourceDecisionDryRunV2Present ? 'yes' : 'no'}`,
    `- LLM official-source decision dry-run V2 ready: ${report.summary.llmOfficialSourceDecisionDryRunV2Ready ? 'yes' : 'no'}`,
    `- LLM official-source decision dry-run V2 state: ${report.summary.llmOfficialSourceDecisionDryRunV2State}`,
    `- LLM official-source decision dry-run V2 ready for promotion preflight: ${report.summary.llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight ? 'yes' : 'no'}`,
    `- LLM official-source decision promotion preflight V2 present: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2Present ? 'yes' : 'no'}`,
    `- LLM official-source decision promotion preflight V2 ready: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2Ready ? 'yes' : 'no'}`,
    `- LLM official-source decision promotion preflight V2 state: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2State}`,
    `- LLM official-source decision promotion preflight V2 ready for promoted file generation: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration ? 'yes' : 'no'}`,
    `- LLM official-source promoted decision file generation V2 present: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2Present ? 'yes' : 'no'}`,
    `- LLM official-source promoted decision file generation V2 ready: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2Ready ? 'yes' : 'no'}`,
    `- LLM official-source promoted decision file generation V2 state: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2State}`,
    `- LLM official-source promoted decision file generation V2 accepted rows/AI: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRows}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAi}`,
    `- LLM official-source promoted decision file generation V2 ready for import refresh: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh ? 'yes' : 'no'}`,
    `- Ready for payload creation approval preflight V2: ${report.summary.readyForPayloadCreationApprovalPreflightV2 ? 'yes' : 'no'}`,
    `- Payload creation approval preflight V2 present: ${report.summary.payloadCreationApprovalPreflightV2Present ? 'yes' : 'no'}`,
    `- Payload creation approval preflight V2 ready: ${report.summary.payloadCreationApprovalPreflightV2Ready ? 'yes' : 'no'}`,
    `- Payload creation approval preflight V2 state: ${report.summary.payloadCreationApprovalPreflightV2State}`,
    `- Payload creation approval preflight V2 hash checks: ${report.summary.payloadCreationApprovalPreflightV2HashChecksPassed}/${report.summary.payloadCreationApprovalPreflightV2HashChecks}`,
    `- Payload creation approval preflight V2 fixture probes: ${report.summary.payloadCreationApprovalPreflightV2FixtureProbesPassed}/${report.summary.payloadCreationApprovalPreflightV2FixtureProbes}`,
    `- Ready for closed payload materialization V2: ${report.summary.readyForClosedPayloadMaterializationV2 ? 'yes' : 'no'}`,
    `- Closed local payload materialization V2 present: ${report.summary.closedLocalPayloadMaterializationV2Present ? 'yes' : 'no'}`,
    `- Closed local payload materialization V2 ready: ${report.summary.closedLocalPayloadMaterializationV2Ready ? 'yes' : 'no'}`,
    `- Closed local payload materialization V2 state: ${report.summary.closedLocalPayloadMaterializationV2State}`,
    `- Closed local payload materialization V2 slices: ${report.summary.closedLocalPayloadMaterializationV2RuntimeSlices}`,
    `- Closed local payload materialization V2 entries/bytes: ${report.summary.closedLocalPayloadMaterializationV2PayloadEntries}/${report.summary.closedLocalPayloadMaterializationV2PayloadBytes}`,
    `- Closed local payload materialization V2 checksum mismatches: ${report.summary.closedLocalPayloadMaterializationV2ChecksumMismatches}`,
    `- Closed local payload materialization V2 fixture probes: ${report.summary.closedLocalPayloadMaterializationV2FixtureProbesPassed}/${report.summary.closedLocalPayloadMaterializationV2FixtureProbes}`,
    `- Ready for server delivery publish preflight V2: ${report.summary.readyForServerDeliveryPublishPreflightV2 ? 'yes' : 'no'}`,
    `- Server delivery publish preflight V2 present: ${report.summary.serverDeliveryPublishPreflightV2Present ? 'yes' : 'no'}`,
    `- Server delivery publish preflight V2 ready: ${report.summary.serverDeliveryPublishPreflightV2Ready ? 'yes' : 'no'}`,
    `- Server delivery publish preflight V2 state: ${report.summary.serverDeliveryPublishPreflightV2State}`,
    `- Server delivery publish preflight V2 manifest entries: ${report.summary.serverDeliveryPublishPreflightV2ManifestEntries}`,
    `- Server delivery publish preflight V2 actual sha/bytes: ${report.summary.serverDeliveryPublishPreflightV2ActualShaEntries}/${report.summary.serverDeliveryPublishPreflightV2ActualByteSizeEntries}`,
    `- Server delivery publish preflight V2 checksum mismatches: ${report.summary.serverDeliveryPublishPreflightV2ChecksumMismatches}`,
    `- Server delivery publish preflight V2 fixture probes: ${report.summary.serverDeliveryPublishPreflightV2FixtureProbesPassed}/${report.summary.serverDeliveryPublishPreflightV2FixtureProbes}`,
    `- Ready for admin/server delivery review V2: ${report.summary.readyForAdminServerDeliveryReviewV2 ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 present: ${report.summary.adminServerDeliveryRuntimePreflightV2Present ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 ready: ${report.summary.adminServerDeliveryRuntimePreflightV2Ready ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 state: ${report.summary.adminServerDeliveryRuntimePreflightV2State}`,
    `- Admin/server delivery runtime preflight V2 manifest entries: ${report.summary.adminServerDeliveryRuntimePreflightV2ManifestEntries}`,
    `- Admin/server delivery runtime preflight V2 admin/runtime/storage ready: ${report.summary.adminServerDeliveryRuntimePreflightV2AdminReady ? 'yes' : 'no'}/${report.summary.adminServerDeliveryRuntimePreflightV2RuntimeReady ? 'yes' : 'no'}/${report.summary.adminServerDeliveryRuntimePreflightV2StorageReady ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 fixture probes: ${report.summary.adminServerDeliveryRuntimePreflightV2FixtureProbesPassed}/${report.summary.adminServerDeliveryRuntimePreflightV2FixtureProbes}`,
    `- Ready for runtime activation blocker planning V2: ${report.summary.readyForRuntimeActivationBlockerPlanningV2 ? 'yes' : 'no'}`,
    `- Runtime activation blocker plan V2 present: ${report.summary.runtimeActivationBlockerPlanV2Present ? 'yes' : 'no'}`,
    `- Runtime activation blocker plan V2 ready: ${report.summary.runtimeActivationBlockerPlanV2Ready ? 'yes' : 'no'}`,
    `- Runtime activation blocker plan V2 state: ${report.summary.runtimeActivationBlockerPlanV2State}`,
    `- Runtime activation blocker plan V2 plan items/touches: ${report.summary.runtimeActivationBlockerPlanV2PlanItems}/${report.summary.runtimeActivationBlockerPlanV2PlannedTouches}`,
    `- Runtime activation blocker plan V2 apply blockers/dirty overlaps: ${report.summary.runtimeActivationBlockerPlanV2ReadinessApplyBlockers}/${report.summary.runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps}`,
    `- Runtime activation blocker plan V2 fixture probes: ${report.summary.runtimeActivationBlockerPlanV2FixtureProbesPassed}/${report.summary.runtimeActivationBlockerPlanV2FixtureProbes}`,
    `- Ready for explicit approval receipt gate V2: ${report.summary.readyForExplicitApprovalReceiptGateV2 ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 present: ${report.summary.explicitApprovalReceiptHashLockGateV2Present ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 ready: ${report.summary.explicitApprovalReceiptHashLockGateV2Ready ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 state: ${report.summary.explicitApprovalReceiptHashLockGateV2State}`,
    `- Explicit approval receipt/hash-lock gate V2 hashes/dirty files: ${report.summary.explicitApprovalReceiptHashLockGateV2CriticalHashLocks}/${report.summary.explicitApprovalReceiptHashLockGateV2DirtyFiles}`,
    `- Explicit approval receipt/hash-lock gate V2 dirty production candidates: ${report.summary.explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles}`,
    `- Explicit approval receipt/hash-lock gate V2 active receipt/hash lock: ${report.summary.explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.explicitApprovalReceiptHashLockGateV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 fixture probes: ${report.summary.explicitApprovalReceiptHashLockGateV2FixtureProbesPassed}/${report.summary.explicitApprovalReceiptHashLockGateV2FixtureProbes}`,
    `- Ready for approval request presentation V2: ${report.summary.readyForApprovalRequestPresentationV2 ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 present: ${report.summary.activationApprovalRequestPresentationV2Present ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 ready: ${report.summary.activationApprovalRequestPresentationV2Ready ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 state: ${report.summary.activationApprovalRequestPresentationV2State}`,
    `- Activation approval request presentation V2 hashes/dirty files: ${report.summary.activationApprovalRequestPresentationV2CriticalHashLocks}/${report.summary.activationApprovalRequestPresentationV2DirtyFiles}`,
    `- Activation approval request presentation V2 active receipt/hash lock: ${report.summary.activationApprovalRequestPresentationV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activationApprovalRequestPresentationV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 fixture probes: ${report.summary.activationApprovalRequestPresentationV2FixtureProbesPassed}/${report.summary.activationApprovalRequestPresentationV2FixtureProbes}`,
    `- Ready for explicit approval receipt creation gate V2: ${report.summary.readyForExplicitApprovalReceiptCreationGateV2 ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 present: ${report.summary.explicitApprovalReceiptCreationGateV2Present ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 safe HOLD ready: ${report.summary.explicitApprovalReceiptCreationGateV2SafeHoldReady ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 state: ${report.summary.explicitApprovalReceiptCreationGateV2State}`,
    `- Explicit approval receipt creation gate V2 exact sentence/plain continue rejected: ${report.summary.explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent ? 'yes' : 'no'}/${report.summary.explicitApprovalReceiptCreationGateV2PlainContinueRejected ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 active receipt/hash created: ${report.summary.explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated ? 'yes' : 'no'}/${report.summary.explicitApprovalReceiptCreationGateV2ActiveHashLockCreated ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 can continue non-production audit: ${report.summary.explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 fixture probes: ${report.summary.explicitApprovalReceiptCreationGateV2FixtureProbesPassed}/${report.summary.explicitApprovalReceiptCreationGateV2FixtureProbes}`,
    `- Ready for approval HOLD continuation V2: ${report.summary.readyForApprovalHoldContinuationV2 ? 'yes' : 'no'}`,
    `- Ready for production apply absence denial gate V2: ${report.summary.readyForProductionApplyAbsenceDenialGateV2 ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 present: ${report.summary.productionApplyAbsenceDenialGateV2Present ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 safe HOLD ready: ${report.summary.productionApplyAbsenceDenialGateV2SafeHoldReady ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 state: ${report.summary.productionApplyAbsenceDenialGateV2State}`,
    `- Production apply absence denial gate V2 apply denied: ${report.summary.productionApplyAbsenceDenialGateV2ApplyDenied ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 active receipt/hash lock: ${report.summary.productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.productionApplyAbsenceDenialGateV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 can continue non-production audit: ${report.summary.productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 fixture probes: ${report.summary.productionApplyAbsenceDenialGateV2FixtureProbesPassed}/${report.summary.productionApplyAbsenceDenialGateV2FixtureProbes}`,
    `- Ready for non-production continuation after apply denial V2: ${report.summary.readyForNonProductionContinuationAfterApplyDenialV2 ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 present: ${report.summary.nonproductionBlockerClosurePlanV2Present ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 ready: ${report.summary.nonproductionBlockerClosurePlanV2Ready ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 state: ${report.summary.nonproductionBlockerClosurePlanV2State}`,
    `- Non-production blocker closure plan V2 chain ready: ${report.summary.nonproductionBlockerClosurePlanV2ChainReady ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 safe/exact/locked items: ${report.summary.nonproductionBlockerClosurePlanV2SafeItems}/${report.summary.nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems}/${report.summary.nonproductionBlockerClosurePlanV2ProductionLockedItems}`,
    `- Non-production blocker closure plan V2 recommended next safe item: ${report.summary.nonproductionBlockerClosurePlanV2RecommendedNextSafeItem}`,
    `- Non-production blocker closure plan V2 ready for next non-production pass: ${report.summary.nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 ready for apply: ${report.summary.nonproductionBlockerClosurePlanV2ReadyForApply ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 may modify production app files: ${report.summary.nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 fixture probes: ${report.summary.nonproductionBlockerClosurePlanV2FixtureProbesPassed}/${report.summary.nonproductionBlockerClosurePlanV2FixtureProbes}`,
    `- Non-production evidence refresh V2 present: ${report.summary.nonproductionEvidenceRefreshV2Present ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 ready: ${report.summary.nonproductionEvidenceRefreshV2Ready ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 state: ${report.summary.nonproductionEvidenceRefreshV2State}`,
    `- Non-production evidence refresh V2 legacy review residue matches: ${report.summary.nonproductionEvidenceRefreshV2LegacyReviewResidueMatches}`,
    `- Non-production evidence refresh V2 ready for next manifest recheck: ${report.summary.nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 ready for apply: ${report.summary.nonproductionEvidenceRefreshV2ReadyForApply ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 may modify production app files: ${report.summary.nonproductionEvidenceRefreshV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 fixture probes: ${report.summary.nonproductionEvidenceRefreshV2FixtureProbesPassed}/${report.summary.nonproductionEvidenceRefreshV2FixtureProbes}`,
    `- Runtime/server manifest consistency recheck V2 present: ${report.summary.runtimeServerManifestConsistencyRecheckV2Present ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 ready: ${report.summary.runtimeServerManifestConsistencyRecheckV2Ready ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 state: ${report.summary.runtimeServerManifestConsistencyRecheckV2State}`,
    `- Runtime/server manifest consistency recheck V2 manifest entries: ${report.summary.runtimeServerManifestConsistencyRecheckV2ManifestEntries}`,
    `- Runtime/server manifest consistency recheck V2 gate refs current: ${report.summary.runtimeServerManifestConsistencyRecheckV2GateRefsCurrent}/${report.summary.runtimeServerManifestConsistencyRecheckV2GateRefs}`,
    `- Runtime/server manifest consistency recheck V2 input hashes current: ${report.summary.runtimeServerManifestConsistencyRecheckV2InputHashesCurrent}/${report.summary.runtimeServerManifestConsistencyRecheckV2InputHashes}`,
    `- Runtime/server manifest consistency recheck V2 top-level open flags: ${report.summary.runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen}`,
    `- Runtime/server manifest consistency recheck V2 activation/apply entry flags: ${report.summary.runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries}/${report.summary.runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries}`,
    `- Runtime/server manifest consistency recheck V2 ready for next language isolation recheck: ${report.summary.runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 ready for apply: ${report.summary.runtimeServerManifestConsistencyRecheckV2ReadyForApply ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 may modify production app files: ${report.summary.runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 fixture probes: ${report.summary.runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed}/${report.summary.runtimeServerManifestConsistencyRecheckV2FixtureProbes}`,
    `- Language isolation regression recheck V2 present: ${report.summary.languageIsolationRegressionRecheckV2Present ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 ready: ${report.summary.languageIsolationRegressionRecheckV2Ready ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 state: ${report.summary.languageIsolationRegressionRecheckV2State}`,
    `- Language isolation regression recheck V2 scanned rows/fields: ${report.summary.languageIsolationRegressionRecheckV2ScannedRows}/${report.summary.languageIsolationRegressionRecheckV2ScannedTargetFields}`,
    `- Language isolation regression recheck V2 prompt contracts: ${report.summary.languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale}/${report.summary.languageIsolationRegressionRecheckV2PromptEntrypointsExpected}`,
    `- Language isolation regression recheck V2 manifest entries: ${report.summary.languageIsolationRegressionRecheckV2ManifestEntries}`,
    `- Language isolation regression recheck V2 ready for next readiness/apply blocker map refresh: ${report.summary.languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 ready for apply: ${report.summary.languageIsolationRegressionRecheckV2ReadyForApply ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 may modify production app files: ${report.summary.languageIsolationRegressionRecheckV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 fixture probes: ${report.summary.languageIsolationRegressionRecheckV2FixtureProbesPassed}/${report.summary.languageIsolationRegressionRecheckV2FixtureProbes}`,
    `- Readiness/apply blocker map refresh V2 present: ${report.summary.readinessApplyBlockerMapRefreshV2Present ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 ready: ${report.summary.readinessApplyBlockerMapRefreshV2Ready ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 state: ${report.summary.readinessApplyBlockerMapRefreshV2State}`,
    `- Readiness/apply blocker map refresh V2 generation/apply blockers: ${report.summary.readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers}/${report.summary.readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers}`,
    `- Readiness/apply blocker map refresh V2 safe closed/remaining: ${report.summary.readinessApplyBlockerMapRefreshV2SafeClosed}/${report.summary.readinessApplyBlockerMapRefreshV2SafeRemaining}`,
    `- Readiness/apply blocker map refresh V2 ready for master refresh: ${report.summary.readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 ready for apply: ${report.summary.readinessApplyBlockerMapRefreshV2ReadyForApply ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 may modify production app files: ${report.summary.readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 fixture probes: ${report.summary.readinessApplyBlockerMapRefreshV2FixtureProbesPassed}/${report.summary.readinessApplyBlockerMapRefreshV2FixtureProbes}`,
    `- Master/next-pass consistency refresh V2 present: ${report.summary.masterNextPassConsistencyRefreshV2Present ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 ready: ${report.summary.masterNextPassConsistencyRefreshV2Ready ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 state: ${report.summary.masterNextPassConsistencyRefreshV2State}`,
    `- Master/next-pass consistency refresh V2 next goal id: ${report.summary.masterNextPassConsistencyRefreshV2NextGoalId}`,
    `- Master/next-pass consistency refresh V2 ready for official-source coverage: ${report.summary.masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 ready for apply: ${report.summary.masterNextPassConsistencyRefreshV2ReadyForApply ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 may modify production app files: ${report.summary.masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 fixture probes: ${report.summary.masterNextPassConsistencyRefreshV2FixtureProbesPassed}/${report.summary.masterNextPassConsistencyRefreshV2FixtureProbes}`,
    `- Official-source content coverage V2 present: ${report.summary.officialSourceContentCoverageV2Present ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 ready: ${report.summary.officialSourceContentCoverageV2Ready ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 state: ${report.summary.officialSourceContentCoverageV2State}`,
    `- Official-source content coverage V2 rows/accepted/AI: ${report.summary.officialSourceContentCoverageV2LedgerRows}/${report.summary.officialSourceContentCoverageV2AcceptedRows}/${report.summary.officialSourceContentCoverageV2AcceptedAi}`,
    `- Official-source content coverage V2 sourceRefs/gates/quiz: ${report.summary.officialSourceContentCoverageV2RowsWithSourceRefs}/${report.summary.officialSourceContentCoverageV2RowsWithGatesPassed}/${report.summary.officialSourceContentCoverageV2QuizRowsOneCorrect}`,
    `- Official-source content coverage V2 trusted source ids: ${report.summary.officialSourceContentCoverageV2TrustedSourceIds}`,
    `- Official-source content coverage V2 research checked online at: ${report.summary.officialSourceContentCoverageV2ResearchPackCheckedOnlineAt}`,
    `- Official-source content coverage V2 ready for import dry-run refresh: ${report.summary.officialSourceContentCoverageV2ReadyForImportDryRunRefresh ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 ready for apply: ${report.summary.officialSourceContentCoverageV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 may modify production app files: ${report.summary.officialSourceContentCoverageV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 fixture probes: ${report.summary.officialSourceContentCoverageV2FixtureProbesPassed}/${report.summary.officialSourceContentCoverageV2FixtureProbes}`,
    `- Official-source payload preflight V2 ready: ${report.summary.officialSourcePayloadCreationApprovalPreflightV2Ready ? 'yes' : 'no'}`,
    `- Official-source payload preflight V2 fresh after import gate: ${report.summary.officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate ? 'yes' : 'no'}`,
    `- Official-source closed local payload materialization V2 ready: ${report.summary.officialSourceClosedLocalPayloadMaterializationV2Ready ? 'yes' : 'no'}`,
    `- Official-source closed local payload materialization V2 fresh after payload preflight: ${report.summary.officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight ? 'yes' : 'no'}`,
    `- Generation history reconciled: ${report.summary.generationHistoryReconciled ? 'yes' : 'no'}`,
    `- App atlas fresh enough for P2: ${report.summary.appAtlasFreshEnoughForP2 ? 'yes' : 'no'}`,
    `- Domain Registry V2 ready: ${report.summary.domainRegistryV2Ready ? 'yes' : 'no'}`,
    `- Ready for next large pass: ${report.summary.readyForNextLargePass ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Contract Rules',
    '',
    ...report.contractRules.map((rule) => `- ${rule}`),
    '',
    '## Current Pass Closeout Checklist',
    '',
    ...report.currentPassCloseoutChecklist.map((item) => `- ${item}`),
    '',
    '## Next Pass Goals',
    '',
  ];

  for (const goal of report.nextPassGoals) {
    lines.push(`- \`${goal.id}\`: ${goal.title}`);
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
    '- This packet writes only Gustav run artifacts.',
    '- It does not modify production app files.',
    '- It does not modify generated French ledgers.',
    '- It does not write reviewer decisions.',
    '- It does not create apply approval.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_next_pass_goal_contract_packet.ts --run <run-dir>');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const upgradePath = path.join(auditsDir, 'self_improving_pipeline_upgrade_packet.json');
  const generationHistoryPath = path.join(auditsDir, 'generation_history_reconciliation_audit.json');
  const appAtlasPath = path.join(auditsDir, 'app_atlas_refresh_audit.json');
  const domainRegistryPath = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const researchPackPath = path.join(runDir, 'research', 'fr_research_pack.json');
  const targetResearchPackVerifyPath = path.join(auditsDir, 'target_research_pack_verify_audit.json');
  const pedagogyBlueprintPath = path.join(runDir, 'research', 'fr_pedagogy_blueprint.json');
  const targetPedagogyBlueprintPacketPath = path.join(auditsDir, 'target_pedagogy_blueprint_packet.json');
  const generationSchemaV2Path = path.join(runDir, 'research', 'fr_generation_schema_v2.json');
  const generationSchemaV2PacketPath = path.join(auditsDir, 'generation_schema_v2_packet.json');
  const aiPromptContractV2Path = path.join(runDir, 'research', 'fr_ai_prompt_contract_v2.json');
  const aiPromptContractV2PacketPath = path.join(auditsDir, 'ai_prompt_contract_v2_packet.json');
  const contentQualityGatesV2Path = path.join(runDir, 'research', 'fr_content_quality_gates_v2.json');
  const contentQualityGatesV2PacketPath = path.join(auditsDir, 'content_quality_gates_v2_packet.json');
  const reviewerWorkflowV2PacketPath = path.join(auditsDir, 'reviewer_workflow_v2_packet.json');
  const targetPackManifestV2Path = path.join(runDir, 'pack_candidates', 'fr', 'target_pack_manifest_v2_draft.json');
  const targetPackManifestV2PacketPath = path.join(auditsDir, 'target_pack_manifest_v2_packet.json');
  const runtimeServerDeliveryContractV2Path = path.join(runDir, 'pack_candidates', 'fr', 'runtime_server_delivery_contract_v2.json');
  const runtimeServerDeliveryContractV2PacketPath = path.join(auditsDir, 'runtime_server_delivery_contract_v2_packet.json');
  const storageCloudTargetMapV2Path = path.join(runDir, 'pack_candidates', 'fr', 'storage_cloud_target_map_v2.json');
  const storageCloudTargetMapV2PacketPath = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.json');
  const adminReviewerDeliverySurfaceV2Path = path.join(runDir, 'pack_candidates', 'fr', 'admin_reviewer_delivery_surface_v2.json');
  const adminReviewerDeliverySurfaceV2PacketPath = path.join(auditsDir, 'admin_pack_delivery_surface_v2_packet.json');
  const reviewerDecisionImportV2DryRunPath = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const payloadShardMaterializationChecksumV2Path = path.join(auditsDir, 'payload_shard_materialization_checksum_v2_packet.json');
  const serverDeliveryManifestPreviewV2Path = path.join(auditsDir, 'server_delivery_manifest_preview_v2_packet.json');
  const runtimeCacheIntegrityRollbackV2Path = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const reviewerDecisionImportOpeningPreflightV2Path = path.join(auditsDir, 'reviewer_decision_import_opening_preflight_v2_packet.json');
  const llmOfficialSourceReviewIntakeV2Path = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.json');
  const reviewerDecisionImportExecutionGateV2Path = path.join(auditsDir, 'reviewer_decision_import_execution_gate_v2_packet.json');
  const officialSourcePromotedRowDecisionsV2Path = path.join(runDir, 'generated', 'fr', 'reviewer', 'llm_official_source_promoted_decisions_v2', 'row_decisions_reviewed_v2.jsonl');
  const officialSourcePromotedAiDecisionsV2Path = path.join(runDir, 'generated', 'fr', 'reviewer', 'llm_official_source_promoted_decisions_v2', 'ai_decisions_reviewed_v2.jsonl');
  const llmOfficialSourceDecisionMaterializationV2Path = path.join(auditsDir, 'llm_official_source_decision_materialization_v2_packet.json');
  const llmOfficialSourceDecisionDryRunV2Path = path.join(auditsDir, 'llm_official_source_decision_dry_run_v2_packet.json');
  const llmOfficialSourceDecisionPromotionPreflightV2Path = path.join(auditsDir, 'llm_official_source_decision_promotion_preflight_v2_packet.json');
  const llmOfficialSourcePromotedDecisionFileGenerationV2Path = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.json');
  const payloadCreationApprovalPreflightV2Path = path.join(auditsDir, 'payload_creation_approval_preflight_v2_packet.json');
  const closedLocalPayloadMaterializationV2Path = path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json');
  const serverDeliveryPublishPreflightV2Path = path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.json');
  const adminServerDeliveryRuntimePreflightV2Path = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const runtimeActivationBlockerPlanV2Path = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const explicitApprovalReceiptHashLockGateV2Path = path.join(auditsDir, 'explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const activationApprovalRequestPresentationV2Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const explicitApprovalReceiptCreationGateV2Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const productionApplyAbsenceDenialGateV2Path = path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json');
  const nonproductionBlockerClosurePlanV2Path = path.join(auditsDir, 'nonproduction_blocker_closure_plan_v2_packet.json');
  const nonproductionEvidenceRefreshV2Path = path.join(auditsDir, 'nonproduction_evidence_refresh_v2_packet.json');
  const runtimeServerManifestConsistencyRecheckV2Path = path.join(auditsDir, 'runtime_server_manifest_consistency_recheck_v2_packet.json');
  const languageIsolationRegressionRecheckV2Path = path.join(auditsDir, 'language_isolation_regression_recheck_v2_packet.json');
  const readinessApplyBlockerMapRefreshV2Path = path.join(auditsDir, 'readiness_apply_blocker_map_refresh_v2_packet.json');
  const masterNextPassConsistencyRefreshV2Path = path.join(auditsDir, 'master_next_pass_consistency_refresh_v2_packet.json');
  const officialSourceContentCoverageV2Path = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const outJson = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const outMd = path.join(auditsDir, 'next_pass_goal_contract_packet.md');
  const nextPlanMd = path.join(auditsDir, 'next_large_pass_plan.md');

  const findings: Finding[] = [];
  for (const filePath of [upgradePath, generationHistoryPath, appAtlasPath, domainRegistryPath]) {
    if (!fs.existsSync(filePath)) {
      addFinding(findings, 'blocker', 'required_input_missing', 'Next pass contract requires current P0-P2/upgrade artifacts.', rel(repoRoot, filePath));
    }
  }

  const upgradeSummary = summaryOf(upgradePath);
  const generationHistorySummary = summaryOf(generationHistoryPath);
  const appAtlasSummary = summaryOf(appAtlasPath);
  const domainRegistrySummary = summaryOf(domainRegistryPath);
  const targetResearchPackVerifySummary = summaryOf(targetResearchPackVerifyPath);
  const targetPedagogyBlueprintSummary = summaryOf(targetPedagogyBlueprintPacketPath);
  const generationSchemaV2Summary = summaryOf(generationSchemaV2PacketPath);
  const aiPromptContractV2Summary = summaryOf(aiPromptContractV2PacketPath);
  const contentQualityGatesV2Summary = summaryOf(contentQualityGatesV2PacketPath);
  const reviewerWorkflowV2Summary = summaryOf(reviewerWorkflowV2PacketPath);
  const targetPackManifestV2Summary = summaryOf(targetPackManifestV2PacketPath);
  const runtimeServerDeliveryContractV2Summary = summaryOf(runtimeServerDeliveryContractV2PacketPath);
  const storageCloudTargetMapV2Summary = summaryOf(storageCloudTargetMapV2PacketPath);
  const adminReviewerDeliverySurfaceV2Summary = summaryOf(adminReviewerDeliverySurfaceV2PacketPath);
  const reviewerDecisionImportV2DryRunSummary = summaryOf(reviewerDecisionImportV2DryRunPath);
  const payloadShardMaterializationChecksumV2Summary = summaryOf(payloadShardMaterializationChecksumV2Path);
  const serverDeliveryManifestPreviewV2Summary = summaryOf(serverDeliveryManifestPreviewV2Path);
  const runtimeCacheIntegrityRollbackV2Summary = summaryOf(runtimeCacheIntegrityRollbackV2Path);
  const reviewerDecisionImportOpeningPreflightV2Summary = summaryOf(reviewerDecisionImportOpeningPreflightV2Path);
  const llmOfficialSourceReviewIntakeV2Summary = summaryOf(llmOfficialSourceReviewIntakeV2Path);
  const reviewerDecisionImportExecutionGateV2Summary = summaryOf(reviewerDecisionImportExecutionGateV2Path);
  const llmOfficialSourceDecisionMaterializationV2Summary = summaryOf(llmOfficialSourceDecisionMaterializationV2Path);
  const llmOfficialSourceDecisionDryRunV2Summary = summaryOf(llmOfficialSourceDecisionDryRunV2Path);
  const llmOfficialSourceDecisionPromotionPreflightV2Summary = summaryOf(llmOfficialSourceDecisionPromotionPreflightV2Path);
  const llmOfficialSourcePromotedDecisionFileGenerationV2Summary = summaryOf(llmOfficialSourcePromotedDecisionFileGenerationV2Path);
  const payloadCreationApprovalPreflightV2Summary = summaryOf(payloadCreationApprovalPreflightV2Path);
  const closedLocalPayloadMaterializationV2Summary = summaryOf(closedLocalPayloadMaterializationV2Path);
  const serverDeliveryPublishPreflightV2Summary = summaryOf(serverDeliveryPublishPreflightV2Path);
  const adminServerDeliveryRuntimePreflightV2Summary = summaryOf(adminServerDeliveryRuntimePreflightV2Path);
  const runtimeActivationBlockerPlanV2Summary = summaryOf(runtimeActivationBlockerPlanV2Path);
  const explicitApprovalReceiptHashLockGateV2Summary = summaryOf(explicitApprovalReceiptHashLockGateV2Path);
  const activationApprovalRequestPresentationV2Summary = summaryOf(activationApprovalRequestPresentationV2Path);
  const explicitApprovalReceiptCreationGateV2Summary = summaryOf(explicitApprovalReceiptCreationGateV2Path);
  const productionApplyAbsenceDenialGateV2Summary = summaryOf(productionApplyAbsenceDenialGateV2Path);
  const nonproductionBlockerClosurePlanV2Summary = summaryOf(nonproductionBlockerClosurePlanV2Path);
  const nonproductionEvidenceRefreshV2Summary = summaryOf(nonproductionEvidenceRefreshV2Path);
  const runtimeServerManifestConsistencyRecheckV2Summary = summaryOf(runtimeServerManifestConsistencyRecheckV2Path);
  const languageIsolationRegressionRecheckV2Summary = summaryOf(languageIsolationRegressionRecheckV2Path);
  const readinessApplyBlockerMapRefreshV2Summary = summaryOf(readinessApplyBlockerMapRefreshV2Path);
  const masterNextPassConsistencyRefreshV2Summary = summaryOf(masterNextPassConsistencyRefreshV2Path);
  const officialSourceContentCoverageV2Summary = summaryOf(officialSourceContentCoverageV2Path);
  const researchPackPresent = fs.existsSync(researchPackPath);
  const researchPackVerified =
    fs.existsSync(targetResearchPackVerifyPath) &&
    n(targetResearchPackVerifySummary, 'blockers') === 0 &&
    b(targetResearchPackVerifySummary, 'readyForPedagogyBlueprint');
  const readyForPedagogyBlueprint = researchPackVerified;
  const pedagogyBlueprintPresent = fs.existsSync(pedagogyBlueprintPath);
  const pedagogyBlueprintReady =
    fs.existsSync(targetPedagogyBlueprintPacketPath) &&
    n(targetPedagogyBlueprintSummary, 'blockers') === 0 &&
    b(targetPedagogyBlueprintSummary, 'readyForGenerationSchemaV2');
  const readyForGenerationSchemaV2 = pedagogyBlueprintReady;
  const generationSchemaV2Present = fs.existsSync(generationSchemaV2Path);
  const generationSchemaV2Ready =
    fs.existsSync(generationSchemaV2PacketPath) &&
    n(generationSchemaV2Summary, 'blockers') === 0 &&
    b(generationSchemaV2Summary, 'readyForAiPromptContractV2');
  const readyForAiPromptContractV2 = generationSchemaV2Ready;
  const aiPromptContractV2Present = fs.existsSync(aiPromptContractV2Path);
  const aiPromptContractV2Ready =
    fs.existsSync(aiPromptContractV2PacketPath) &&
    n(aiPromptContractV2Summary, 'blockers') === 0 &&
    b(aiPromptContractV2Summary, 'readyForContentQualityGatesV2');
  const readyForContentQualityGatesV2 = aiPromptContractV2Ready;
  const contentQualityGatesV2Present = fs.existsSync(contentQualityGatesV2Path);
  const contentQualityGatesV2Ready =
    fs.existsSync(contentQualityGatesV2PacketPath) &&
    n(contentQualityGatesV2Summary, 'blockers') === 0 &&
    b(contentQualityGatesV2Summary, 'readyForReviewerWorkflowV2');
  const readyForReviewerWorkflowV2 = contentQualityGatesV2Ready;
  const reviewerWorkflowV2Present = fs.existsSync(reviewerWorkflowV2PacketPath);
  const reviewerWorkflowV2Ready =
    fs.existsSync(reviewerWorkflowV2PacketPath) &&
    n(reviewerWorkflowV2Summary, 'blockers') === 0 &&
    b(reviewerWorkflowV2Summary, 'readyForLlmOfficialSourceReviewV2');
  const readyForLlmOfficialSourceReviewV2 = reviewerWorkflowV2Ready;
  const readyForBrainGateV2 = reviewerWorkflowV2Ready && b(reviewerWorkflowV2Summary, 'readyForBrainGateV2');
  const targetPackManifestV2Present = fs.existsSync(targetPackManifestV2Path);
  const targetPackManifestV2Ready =
    fs.existsSync(targetPackManifestV2PacketPath) &&
    n(targetPackManifestV2Summary, 'blockers') === 0 &&
    b(targetPackManifestV2Summary, 'readyForRuntimeServerDeliveryContractV2');
  const readyForRuntimeServerDeliveryContractV2 = targetPackManifestV2Ready;
  const runtimeServerDeliveryContractV2Present =
    fs.existsSync(runtimeServerDeliveryContractV2Path) ||
    fs.existsSync(runtimeServerDeliveryContractV2PacketPath);
  const runtimeServerDeliveryContractV2Ready =
    fs.existsSync(runtimeServerDeliveryContractV2PacketPath) &&
    n(runtimeServerDeliveryContractV2Summary, 'blockers') === 0 &&
    b(runtimeServerDeliveryContractV2Summary, 'readyForStorageCloudTargetMapV2');
  const readyForStorageCloudTargetMapV2 = runtimeServerDeliveryContractV2Ready;
  const storageCloudTargetMapV2Present =
    fs.existsSync(storageCloudTargetMapV2Path) ||
    fs.existsSync(storageCloudTargetMapV2PacketPath);
  const storageCloudTargetMapV2Ready =
    fs.existsSync(storageCloudTargetMapV2PacketPath) &&
    n(storageCloudTargetMapV2Summary, 'blockers') === 0 &&
    b(storageCloudTargetMapV2Summary, 'readyForAdminPackDeliverySurfaceV2');
  const readyForAdminPackDeliverySurfaceV2 = storageCloudTargetMapV2Ready;
  const adminReviewerDeliverySurfaceV2Present =
    fs.existsSync(adminReviewerDeliverySurfaceV2Path) ||
    fs.existsSync(adminReviewerDeliverySurfaceV2PacketPath);
  const adminReviewerDeliverySurfaceV2Ready =
    fs.existsSync(adminReviewerDeliverySurfaceV2PacketPath) &&
    n(adminReviewerDeliverySurfaceV2Summary, 'blockers') === 0 &&
    b(adminReviewerDeliverySurfaceV2Summary, 'readyForReviewerDecisionImportV2DryRun');
  const readyForReviewerDecisionImportV2DryRun = adminReviewerDeliverySurfaceV2Ready;
  const reviewerDecisionImportV2DryRunPresent = fs.existsSync(reviewerDecisionImportV2DryRunPath);
  const reviewerDecisionImportV2DryRunReady =
    reviewerDecisionImportV2DryRunPresent &&
    n(reviewerDecisionImportV2DryRunSummary, 'blockers') === 0 &&
    b(reviewerDecisionImportV2DryRunSummary, 'readyForReviewerDecisionImportV2DryRun');
  const readyForPayloadShardMaterializationGate =
    reviewerDecisionImportV2DryRunReady &&
    b(reviewerDecisionImportV2DryRunSummary, 'readyForPayloadShardMaterializationGate');
  const payloadShardMaterializationChecksumV2Present = fs.existsSync(payloadShardMaterializationChecksumV2Path);
  const payloadShardMaterializationChecksumV2Ready =
    payloadShardMaterializationChecksumV2Present &&
    n(payloadShardMaterializationChecksumV2Summary, 'blockers') === 0 &&
    b(payloadShardMaterializationChecksumV2Summary, 'readyForServerManifestPreviewGate');
  const readyForServerManifestPreviewGate = payloadShardMaterializationChecksumV2Ready;
  const serverDeliveryManifestPreviewV2Present = fs.existsSync(serverDeliveryManifestPreviewV2Path);
  const serverDeliveryManifestPreviewV2Ready =
    serverDeliveryManifestPreviewV2Present &&
    n(serverDeliveryManifestPreviewV2Summary, 'blockers') === 0 &&
    b(serverDeliveryManifestPreviewV2Summary, 'readyForRuntimeCacheIntegrityGate');
  const readyForRuntimeCacheIntegrityGate = serverDeliveryManifestPreviewV2Ready;
  const runtimeCacheIntegrityRollbackV2Present = fs.existsSync(runtimeCacheIntegrityRollbackV2Path);
  const runtimeCacheIntegrityRollbackV2Ready =
    runtimeCacheIntegrityRollbackV2Present &&
    n(runtimeCacheIntegrityRollbackV2Summary, 'blockers') === 0 &&
    b(runtimeCacheIntegrityRollbackV2Summary, 'readyForReviewerDecisionImportOpeningGate');
  const readyForReviewerDecisionImportOpeningGate = runtimeCacheIntegrityRollbackV2Ready;
  const reviewerDecisionImportOpeningPreflightV2Present = fs.existsSync(reviewerDecisionImportOpeningPreflightV2Path);
  const reviewerDecisionImportOpeningPreflightV2Ready =
    reviewerDecisionImportOpeningPreflightV2Present &&
    n(reviewerDecisionImportOpeningPreflightV2Summary, 'blockers') === 0 &&
    b(reviewerDecisionImportOpeningPreflightV2Summary, 'readyForReviewerDecisionImportOpeningPreflight');
  const reviewerDecisionImportExecutionGateReady =
    reviewerDecisionImportOpeningPreflightV2Ready &&
    b(reviewerDecisionImportOpeningPreflightV2Summary, 'readyForReviewerDecisionImportExecutionGate');
  const readyForPayloadCreationApprovalPreflight =
    reviewerDecisionImportOpeningPreflightV2Ready &&
    b(reviewerDecisionImportOpeningPreflightV2Summary, 'readyForPayloadCreationApprovalPreflight');
  const llmOfficialSourceReviewIntakeV2Present = fs.existsSync(llmOfficialSourceReviewIntakeV2Path);
  const llmOfficialSourceReviewIntakeV2Ready =
    llmOfficialSourceReviewIntakeV2Present &&
    n(llmOfficialSourceReviewIntakeV2Summary, 'blockers') === 0 &&
    s(llmOfficialSourceReviewIntakeV2Summary, 'intakeState') !== 'blocked_by_language_or_activation_leak';
  const llmOfficialSourceReviewIntakeV2State = s(llmOfficialSourceReviewIntakeV2Summary, 'intakeState');
  const llmOfficialSourceReviewIntakeV2RowCoveragePct = n(llmOfficialSourceReviewIntakeV2Summary, 'rowLlmReviewCoveragePct');
  const llmOfficialSourceReviewIntakeV2AiCoveragePct = n(llmOfficialSourceReviewIntakeV2Summary, 'aiLlmReviewCoveragePct');
  const readyForReviewerDecisionImportExecutionGate =
    llmOfficialSourceReviewIntakeV2Ready &&
    b(llmOfficialSourceReviewIntakeV2Summary, 'readyForDecisionImportExecutionGate');
  const reviewerDecisionImportExecutionGateV2Present = fs.existsSync(reviewerDecisionImportExecutionGateV2Path);
  const reviewerDecisionImportExecutionGateV2Ready =
    reviewerDecisionImportExecutionGateV2Present &&
    n(reviewerDecisionImportExecutionGateV2Summary, 'blockers') === 0 &&
    s(reviewerDecisionImportExecutionGateV2Summary, 'executionState') !== 'blocked_by_findings';
  const reviewerDecisionImportExecutionGateV2State = s(reviewerDecisionImportExecutionGateV2Summary, 'executionState');
  const reviewerDecisionImportExecutionGateV2WouldRun = b(reviewerDecisionImportExecutionGateV2Summary, 'reviewerDecisionImportWouldRun');
  const llmOfficialSourceDecisionMaterializationV2Present = fs.existsSync(llmOfficialSourceDecisionMaterializationV2Path);
  const llmOfficialSourceDecisionMaterializationV2Ready =
    llmOfficialSourceDecisionMaterializationV2Present &&
    n(llmOfficialSourceDecisionMaterializationV2Summary, 'blockers') === 0 &&
    b(llmOfficialSourceDecisionMaterializationV2Summary, 'readyForLlmOfficialSourceDecisionDryRun');
  const llmOfficialSourceDecisionMaterializationV2State = s(llmOfficialSourceDecisionMaterializationV2Summary, 'materializationState');
  const llmOfficialSourceDecisionMaterializationV2ReadyForDryRun = b(llmOfficialSourceDecisionMaterializationV2Summary, 'readyForLlmOfficialSourceDecisionDryRun');
  const llmOfficialSourceDecisionDryRunV2Present = fs.existsSync(llmOfficialSourceDecisionDryRunV2Path);
  const llmOfficialSourceDecisionDryRunV2Ready =
    llmOfficialSourceDecisionDryRunV2Present &&
    n(llmOfficialSourceDecisionDryRunV2Summary, 'blockers') === 0 &&
    b(llmOfficialSourceDecisionDryRunV2Summary, 'readyForLlmOfficialSourceDecisionPromotionPreflight');
  const llmOfficialSourceDecisionDryRunV2State = s(llmOfficialSourceDecisionDryRunV2Summary, 'dryRunState');
  const llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight = b(llmOfficialSourceDecisionDryRunV2Summary, 'readyForLlmOfficialSourceDecisionPromotionPreflight');
  const llmOfficialSourceDecisionPromotionPreflightV2Present = fs.existsSync(llmOfficialSourceDecisionPromotionPreflightV2Path);
  const llmOfficialSourceDecisionPromotionPreflightV2Ready =
    llmOfficialSourceDecisionPromotionPreflightV2Present &&
    n(llmOfficialSourceDecisionPromotionPreflightV2Summary, 'blockers') === 0 &&
    b(llmOfficialSourceDecisionPromotionPreflightV2Summary, 'readyForPromotedDecisionFileGeneration');
  const llmOfficialSourceDecisionPromotionPreflightV2State = s(llmOfficialSourceDecisionPromotionPreflightV2Summary, 'promotionState');
  const llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration = b(llmOfficialSourceDecisionPromotionPreflightV2Summary, 'readyForPromotedDecisionFileGeneration');
  const llmOfficialSourcePromotedDecisionFileGenerationV2Present = fs.existsSync(llmOfficialSourcePromotedDecisionFileGenerationV2Path);
  const llmOfficialSourcePromotedDecisionFileGenerationV2Ready =
    llmOfficialSourcePromotedDecisionFileGenerationV2Present &&
    n(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'blockers') === 0 &&
    s(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'generationState') === 'promoted_decision_files_ready_no_import' &&
    n(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'acceptedRowDecisionRows') === 1600 &&
    n(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'acceptedAiDecisionRows') === 164 &&
    b(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'readyForReviewerDecisionImportV2DryRunRefresh');
  const llmOfficialSourcePromotedDecisionFileGenerationV2State = s(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'generationState');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRows = n(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'acceptedRowDecisionRows');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAi = n(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'acceptedAiDecisionRows');
  const llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh = b(llmOfficialSourcePromotedDecisionFileGenerationV2Summary, 'readyForReviewerDecisionImportV2DryRunRefresh');
  const readyForPayloadCreationApprovalPreflightV2 =
    reviewerDecisionImportExecutionGateV2Ready &&
    b(reviewerDecisionImportExecutionGateV2Summary, 'readyForPayloadCreationApprovalPreflight');
  const payloadCreationApprovalPreflightV2Present = fs.existsSync(payloadCreationApprovalPreflightV2Path);
  const payloadCreationApprovalPreflightV2Ready =
    payloadCreationApprovalPreflightV2Present &&
    n(payloadCreationApprovalPreflightV2Summary, 'blockers') === 0 &&
    b(payloadCreationApprovalPreflightV2Summary, 'readyForClosedPayloadMaterializationV2') &&
    s(payloadCreationApprovalPreflightV2Summary, 'preflightState') === 'eligible_after_import_execution';
  const payloadCreationApprovalPreflightV2State = s(payloadCreationApprovalPreflightV2Summary, 'preflightState');
  const payloadCreationApprovalPreflightV2HashChecksPassed = n(payloadCreationApprovalPreflightV2Summary, 'hashChecksPassed');
  const payloadCreationApprovalPreflightV2HashChecks = n(payloadCreationApprovalPreflightV2Summary, 'hashChecks');
  const payloadCreationApprovalPreflightV2FixtureProbesPassed = n(payloadCreationApprovalPreflightV2Summary, 'fixtureProbesPassed');
  const payloadCreationApprovalPreflightV2FixtureProbes = n(payloadCreationApprovalPreflightV2Summary, 'fixtureProbes');
  const readyForClosedPayloadMaterializationV2 = payloadCreationApprovalPreflightV2Ready;
  const closedLocalPayloadMaterializationV2Present = fs.existsSync(closedLocalPayloadMaterializationV2Path);
  const closedLocalPayloadMaterializationV2Ready =
    closedLocalPayloadMaterializationV2Present &&
    n(closedLocalPayloadMaterializationV2Summary, 'blockers') === 0 &&
    b(closedLocalPayloadMaterializationV2Summary, 'readyForServerDeliveryPublishPreflightV2') &&
    s(closedLocalPayloadMaterializationV2Summary, 'materializationState') === 'local_payload_artifacts_materialized';
  const closedLocalPayloadMaterializationV2State = s(closedLocalPayloadMaterializationV2Summary, 'materializationState');
  const closedLocalPayloadMaterializationV2RuntimeSlices = n(closedLocalPayloadMaterializationV2Summary, 'localSlicePayloadsCreated');
  const closedLocalPayloadMaterializationV2PayloadEntries = n(closedLocalPayloadMaterializationV2Summary, 'payloadEntriesTotal');
  const closedLocalPayloadMaterializationV2PayloadBytes = n(closedLocalPayloadMaterializationV2Summary, 'payloadBytesTotal');
  const closedLocalPayloadMaterializationV2ChecksumMismatches = n(closedLocalPayloadMaterializationV2Summary, 'checksumMismatches');
  const closedLocalPayloadMaterializationV2FixtureProbesPassed = n(closedLocalPayloadMaterializationV2Summary, 'fixtureProbesPassed');
  const closedLocalPayloadMaterializationV2FixtureProbes = n(closedLocalPayloadMaterializationV2Summary, 'fixtureProbes');
  const readyForServerDeliveryPublishPreflightV2 = closedLocalPayloadMaterializationV2Ready;
  const serverDeliveryPublishPreflightV2Present = fs.existsSync(serverDeliveryPublishPreflightV2Path);
  const serverDeliveryPublishPreflightV2FreshAfterClosedPayload =
    fileMtimeMs(serverDeliveryPublishPreflightV2Path) >= fileMtimeMs(closedLocalPayloadMaterializationV2Path) &&
    fileMtimeMs(closedLocalPayloadMaterializationV2Path) > 0;
  const serverDeliveryPublishPreflightV2Ready =
    serverDeliveryPublishPreflightV2Present &&
    serverDeliveryPublishPreflightV2FreshAfterClosedPayload &&
    n(serverDeliveryPublishPreflightV2Summary, 'blockers') === 0 &&
    b(serverDeliveryPublishPreflightV2Summary, 'readyForAdminServerDeliveryReviewV2') &&
    s(serverDeliveryPublishPreflightV2Summary, 'publishPreflightState') === 'local_server_manifest_draft_ready';
  const serverDeliveryPublishPreflightV2State = s(serverDeliveryPublishPreflightV2Summary, 'publishPreflightState');
  const serverDeliveryPublishPreflightV2ManifestEntries = n(serverDeliveryPublishPreflightV2Summary, 'manifestEntries');
  const serverDeliveryPublishPreflightV2ActualShaEntries = n(serverDeliveryPublishPreflightV2Summary, 'manifestEntriesWithActualSha256');
  const serverDeliveryPublishPreflightV2ActualByteSizeEntries = n(serverDeliveryPublishPreflightV2Summary, 'manifestEntriesWithActualByteSize');
  const serverDeliveryPublishPreflightV2ChecksumMismatches = n(serverDeliveryPublishPreflightV2Summary, 'checksumMismatches');
  const serverDeliveryPublishPreflightV2FixtureProbesPassed = n(serverDeliveryPublishPreflightV2Summary, 'fixtureProbesPassed');
  const serverDeliveryPublishPreflightV2FixtureProbes = n(serverDeliveryPublishPreflightV2Summary, 'fixtureProbes');
  const readyForAdminServerDeliveryReviewV2 = serverDeliveryPublishPreflightV2Ready;
  const adminServerDeliveryRuntimePreflightV2Present = fs.existsSync(adminServerDeliveryRuntimePreflightV2Path);
  const adminServerDeliveryRuntimePreflightV2FreshAfterServerPreflight =
    fileMtimeMs(adminServerDeliveryRuntimePreflightV2Path) >= fileMtimeMs(serverDeliveryPublishPreflightV2Path) &&
    fileMtimeMs(serverDeliveryPublishPreflightV2Path) > 0;
  const adminServerDeliveryRuntimePreflightV2Ready =
    adminServerDeliveryRuntimePreflightV2Present &&
    adminServerDeliveryRuntimePreflightV2FreshAfterServerPreflight &&
    n(adminServerDeliveryRuntimePreflightV2Summary, 'blockers') === 0 &&
    b(adminServerDeliveryRuntimePreflightV2Summary, 'readyForRuntimeActivationBlockerPlanningV2') &&
    s(adminServerDeliveryRuntimePreflightV2Summary, 'preflightState') === 'admin_server_runtime_preflight_ready';
  const adminServerDeliveryRuntimePreflightV2State = s(adminServerDeliveryRuntimePreflightV2Summary, 'preflightState');
  const adminServerDeliveryRuntimePreflightV2ManifestEntries = n(adminServerDeliveryRuntimePreflightV2Summary, 'manifestEntries');
  const adminServerDeliveryRuntimePreflightV2AdminReady = b(adminServerDeliveryRuntimePreflightV2Summary, 'adminReady');
  const adminServerDeliveryRuntimePreflightV2RuntimeReady = b(adminServerDeliveryRuntimePreflightV2Summary, 'runtimeReady');
  const adminServerDeliveryRuntimePreflightV2StorageReady = b(adminServerDeliveryRuntimePreflightV2Summary, 'storageReady');
  const adminServerDeliveryRuntimePreflightV2FixtureProbesPassed = n(adminServerDeliveryRuntimePreflightV2Summary, 'fixtureProbesPassed');
  const adminServerDeliveryRuntimePreflightV2FixtureProbes = n(adminServerDeliveryRuntimePreflightV2Summary, 'fixtureProbes');
  const readyForRuntimeActivationBlockerPlanningV2 = adminServerDeliveryRuntimePreflightV2Ready;
  const runtimeActivationBlockerPlanV2Present = fs.existsSync(runtimeActivationBlockerPlanV2Path);
  const runtimeActivationBlockerPlanV2FreshAfterAdminPreflight =
    fileMtimeMs(runtimeActivationBlockerPlanV2Path) >= fileMtimeMs(adminServerDeliveryRuntimePreflightV2Path) &&
    fileMtimeMs(adminServerDeliveryRuntimePreflightV2Path) > 0;
  const runtimeActivationBlockerPlanV2Ready =
    runtimeActivationBlockerPlanV2Present &&
    runtimeActivationBlockerPlanV2FreshAfterAdminPreflight &&
    n(runtimeActivationBlockerPlanV2Summary, 'blockers') === 0 &&
    b(runtimeActivationBlockerPlanV2Summary, 'readyForExplicitApprovalReceiptGateV2') &&
    s(runtimeActivationBlockerPlanV2Summary, 'planState') === 'runtime_activation_blocker_plan_ready';
  const runtimeActivationBlockerPlanV2State = s(runtimeActivationBlockerPlanV2Summary, 'planState');
  const runtimeActivationBlockerPlanV2PlanItems = n(runtimeActivationBlockerPlanV2Summary, 'planItems');
  const runtimeActivationBlockerPlanV2PlannedTouches = n(runtimeActivationBlockerPlanV2Summary, 'plannedTouches');
  const runtimeActivationBlockerPlanV2ReadinessApplyBlockers = n(runtimeActivationBlockerPlanV2Summary, 'readinessApplyBlockers');
  const runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps = n(runtimeActivationBlockerPlanV2Summary, 'readinessDirtyWorktreeOverlaps');
  const runtimeActivationBlockerPlanV2FixtureProbesPassed = n(runtimeActivationBlockerPlanV2Summary, 'fixtureProbesPassed');
  const runtimeActivationBlockerPlanV2FixtureProbes = n(runtimeActivationBlockerPlanV2Summary, 'fixtureProbes');
  const readyForExplicitApprovalReceiptGateV2 = runtimeActivationBlockerPlanV2Ready;
  const explicitApprovalReceiptHashLockGateV2Present = fs.existsSync(explicitApprovalReceiptHashLockGateV2Path);
  const explicitApprovalReceiptHashLockGateV2FreshAfterRuntimePlan =
    fileMtimeMs(explicitApprovalReceiptHashLockGateV2Path) >= fileMtimeMs(runtimeActivationBlockerPlanV2Path) &&
    fileMtimeMs(runtimeActivationBlockerPlanV2Path) > 0;
  const explicitApprovalReceiptHashLockGateV2Ready =
    explicitApprovalReceiptHashLockGateV2Present &&
    explicitApprovalReceiptHashLockGateV2FreshAfterRuntimePlan &&
    n(explicitApprovalReceiptHashLockGateV2Summary, 'blockers') === 0 &&
    b(explicitApprovalReceiptHashLockGateV2Summary, 'readyForApprovalRequestPresentationV2') &&
    !b(explicitApprovalReceiptHashLockGateV2Summary, 'readyForApply') &&
    !b(explicitApprovalReceiptHashLockGateV2Summary, 'activeApprovalReceiptExists') &&
    !b(explicitApprovalReceiptHashLockGateV2Summary, 'activeHashLockExists') &&
    s(explicitApprovalReceiptHashLockGateV2Summary, 'gateState') === 'approval_request_package_ready';
  const explicitApprovalReceiptHashLockGateV2State = s(explicitApprovalReceiptHashLockGateV2Summary, 'gateState');
  const explicitApprovalReceiptHashLockGateV2CriticalHashLocks = n(explicitApprovalReceiptHashLockGateV2Summary, 'criticalHashLocks');
  const explicitApprovalReceiptHashLockGateV2DirtyFiles = n(explicitApprovalReceiptHashLockGateV2Summary, 'dirtyFiles');
  const explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles = n(explicitApprovalReceiptHashLockGateV2Summary, 'dirtyProductionCandidateFiles');
  const explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists = b(explicitApprovalReceiptHashLockGateV2Summary, 'activeApprovalReceiptExists');
  const explicitApprovalReceiptHashLockGateV2ActiveHashLockExists = b(explicitApprovalReceiptHashLockGateV2Summary, 'activeHashLockExists');
  const explicitApprovalReceiptHashLockGateV2FixtureProbesPassed = n(explicitApprovalReceiptHashLockGateV2Summary, 'fixtureProbesPassed');
  const explicitApprovalReceiptHashLockGateV2FixtureProbes = n(explicitApprovalReceiptHashLockGateV2Summary, 'fixtureProbes');
  const readyForApprovalRequestPresentationV2 = explicitApprovalReceiptHashLockGateV2Ready;
  const activationApprovalRequestPresentationV2Present = fs.existsSync(activationApprovalRequestPresentationV2Path);
  const activationApprovalRequestPresentationV2FreshAfterHashLockGate =
    fileMtimeMs(activationApprovalRequestPresentationV2Path) >= fileMtimeMs(explicitApprovalReceiptHashLockGateV2Path) &&
    fileMtimeMs(explicitApprovalReceiptHashLockGateV2Path) > 0;
  const activationApprovalRequestPresentationV2Ready =
    activationApprovalRequestPresentationV2Present &&
    activationApprovalRequestPresentationV2FreshAfterHashLockGate &&
    n(activationApprovalRequestPresentationV2Summary, 'blockers') === 0 &&
    b(activationApprovalRequestPresentationV2Summary, 'readyForExplicitApprovalReceiptCreationGateV2') &&
    !b(activationApprovalRequestPresentationV2Summary, 'readyForApply') &&
    !b(activationApprovalRequestPresentationV2Summary, 'activeApprovalReceiptExists') &&
    !b(activationApprovalRequestPresentationV2Summary, 'activeHashLockExists') &&
    s(activationApprovalRequestPresentationV2Summary, 'requestState') === 'approval_request_presented';
  const activationApprovalRequestPresentationV2State = s(activationApprovalRequestPresentationV2Summary, 'requestState');
  const activationApprovalRequestPresentationV2CriticalHashLocks = n(activationApprovalRequestPresentationV2Summary, 'criticalHashLocks');
  const activationApprovalRequestPresentationV2DirtyFiles = n(activationApprovalRequestPresentationV2Summary, 'dirtyFiles');
  const activationApprovalRequestPresentationV2ActiveApprovalReceiptExists = b(activationApprovalRequestPresentationV2Summary, 'activeApprovalReceiptExists');
  const activationApprovalRequestPresentationV2ActiveHashLockExists = b(activationApprovalRequestPresentationV2Summary, 'activeHashLockExists');
  const activationApprovalRequestPresentationV2FixtureProbesPassed = n(activationApprovalRequestPresentationV2Summary, 'fixtureProbesPassed');
  const activationApprovalRequestPresentationV2FixtureProbes = n(activationApprovalRequestPresentationV2Summary, 'fixtureProbes');
  const readyForExplicitApprovalReceiptCreationGateV2 = activationApprovalRequestPresentationV2Ready;
  const explicitApprovalReceiptCreationGateV2Present = fs.existsSync(explicitApprovalReceiptCreationGateV2Path);
  const explicitApprovalReceiptCreationGateV2State = s(explicitApprovalReceiptCreationGateV2Summary, 'receiptCreationState');
  const explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent = b(explicitApprovalReceiptCreationGateV2Summary, 'exactApprovalSentencePresent');
  const explicitApprovalReceiptCreationGateV2PlainContinueRejected = b(explicitApprovalReceiptCreationGateV2Summary, 'plainContinueRejected');
  const explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated = b(explicitApprovalReceiptCreationGateV2Summary, 'activeApprovalReceiptCreated');
  const explicitApprovalReceiptCreationGateV2ActiveHashLockCreated = b(explicitApprovalReceiptCreationGateV2Summary, 'activeHashLockCreated');
  const explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit = b(explicitApprovalReceiptCreationGateV2Summary, 'canContinueNonProductionAudit');
  const explicitApprovalReceiptCreationGateV2FixtureProbesPassed = n(explicitApprovalReceiptCreationGateV2Summary, 'fixtureProbesPassed');
  const explicitApprovalReceiptCreationGateV2FixtureProbes = n(explicitApprovalReceiptCreationGateV2Summary, 'fixtureProbes');
  const explicitApprovalReceiptCreationGateV2FreshAfterApprovalRequest =
    fileMtimeMs(explicitApprovalReceiptCreationGateV2Path) >= fileMtimeMs(activationApprovalRequestPresentationV2Path) &&
    fileMtimeMs(activationApprovalRequestPresentationV2Path) > 0;
  const explicitApprovalReceiptCreationGateV2SafeHoldReady =
    explicitApprovalReceiptCreationGateV2Present &&
    explicitApprovalReceiptCreationGateV2FreshAfterApprovalRequest &&
    n(explicitApprovalReceiptCreationGateV2Summary, 'blockers') === 0 &&
    explicitApprovalReceiptCreationGateV2PlainContinueRejected &&
    !explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent &&
    !explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated &&
    !explicitApprovalReceiptCreationGateV2ActiveHashLockCreated &&
    !b(explicitApprovalReceiptCreationGateV2Summary, 'readyForApply') &&
    explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit &&
    explicitApprovalReceiptCreationGateV2State === 'approval_receipt_creation_waiting_for_exact_sentence';
  const readyForApprovalHoldContinuationV2 = explicitApprovalReceiptCreationGateV2SafeHoldReady;
  const readyForProductionApplyAbsenceDenialGateV2 = explicitApprovalReceiptCreationGateV2SafeHoldReady;
  const productionApplyAbsenceDenialGateV2Present = fs.existsSync(productionApplyAbsenceDenialGateV2Path);
  const productionApplyAbsenceDenialGateV2State = s(productionApplyAbsenceDenialGateV2Summary, 'denialState');
  const productionApplyAbsenceDenialGateV2ApplyDenied = b(productionApplyAbsenceDenialGateV2Summary, 'productionApplyDenied');
  const productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists = b(productionApplyAbsenceDenialGateV2Summary, 'activeApprovalReceiptExists');
  const productionApplyAbsenceDenialGateV2ActiveHashLockExists = b(productionApplyAbsenceDenialGateV2Summary, 'activeHashLockExists');
  const productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit = b(productionApplyAbsenceDenialGateV2Summary, 'canContinueNonProductionAudit');
  const productionApplyAbsenceDenialGateV2FixtureProbesPassed = n(productionApplyAbsenceDenialGateV2Summary, 'fixtureProbesPassed');
  const productionApplyAbsenceDenialGateV2FixtureProbes = n(productionApplyAbsenceDenialGateV2Summary, 'fixtureProbes');
  const productionApplyAbsenceDenialGateV2FreshAfterReceiptCreation =
    fileMtimeMs(productionApplyAbsenceDenialGateV2Path) >= fileMtimeMs(explicitApprovalReceiptCreationGateV2Path) &&
    fileMtimeMs(explicitApprovalReceiptCreationGateV2Path) > 0;
  const productionApplyAbsenceDenialGateV2SafeHoldReady =
    productionApplyAbsenceDenialGateV2Present &&
    productionApplyAbsenceDenialGateV2FreshAfterReceiptCreation &&
    n(productionApplyAbsenceDenialGateV2Summary, 'blockers') === 0 &&
    productionApplyAbsenceDenialGateV2ApplyDenied &&
    !b(productionApplyAbsenceDenialGateV2Summary, 'readyForApply') &&
    !b(productionApplyAbsenceDenialGateV2Summary, 'mayModifyProductionAppFiles') &&
    !productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists &&
    !productionApplyAbsenceDenialGateV2ActiveHashLockExists &&
    productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit &&
    productionApplyAbsenceDenialGateV2State === 'production_apply_denied_missing_active_approval_artifacts';
  const readyForNonProductionContinuationAfterApplyDenialV2 = productionApplyAbsenceDenialGateV2SafeHoldReady;
  const nonproductionBlockerClosurePlanV2Present = fs.existsSync(nonproductionBlockerClosurePlanV2Path);
  const nonproductionBlockerClosurePlanV2State = s(nonproductionBlockerClosurePlanV2Summary, 'planState');
  const nonproductionBlockerClosurePlanV2ChainReady = b(nonproductionBlockerClosurePlanV2Summary, 'p18p32ChainReady');
  const nonproductionBlockerClosurePlanV2SafeItems = n(nonproductionBlockerClosurePlanV2Summary, 'safeNonProductionItems');
  const nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems = n(nonproductionBlockerClosurePlanV2Summary, 'exactApprovalOnlyItems');
  const nonproductionBlockerClosurePlanV2ProductionLockedItems = n(nonproductionBlockerClosurePlanV2Summary, 'productionLockedItems');
  const nonproductionBlockerClosurePlanV2RecommendedNextSafeItem = s(nonproductionBlockerClosurePlanV2Summary, 'recommendedNextSafeItem');
  const nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass = b(nonproductionBlockerClosurePlanV2Summary, 'readyForNextNonProductionPass');
  const nonproductionBlockerClosurePlanV2ReadyForApply = b(nonproductionBlockerClosurePlanV2Summary, 'readyForApply');
  const nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles = b(nonproductionBlockerClosurePlanV2Summary, 'mayModifyProductionAppFiles');
  const nonproductionBlockerClosurePlanV2FixtureProbesPassed = n(nonproductionBlockerClosurePlanV2Summary, 'fixtureProbesPassed');
  const nonproductionBlockerClosurePlanV2FixtureProbes = n(nonproductionBlockerClosurePlanV2Summary, 'fixtureProbes');
  const nonproductionBlockerClosurePlanV2FreshAfterApplyDenial =
    fileMtimeMs(nonproductionBlockerClosurePlanV2Path) >= fileMtimeMs(productionApplyAbsenceDenialGateV2Path) &&
    fileMtimeMs(productionApplyAbsenceDenialGateV2Path) > 0;
  const nonproductionBlockerClosurePlanV2Ready =
    nonproductionBlockerClosurePlanV2Present &&
    nonproductionBlockerClosurePlanV2FreshAfterApplyDenial &&
    n(nonproductionBlockerClosurePlanV2Summary, 'blockers') === 0 &&
    nonproductionBlockerClosurePlanV2State === 'nonproduction_closure_plan_ready' &&
    nonproductionBlockerClosurePlanV2ChainReady &&
    nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass &&
    nonproductionBlockerClosurePlanV2SafeItems > 0 &&
    nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems > 0 &&
    nonproductionBlockerClosurePlanV2ProductionLockedItems > 0 &&
    nonproductionBlockerClosurePlanV2RecommendedNextSafeItem !== '' &&
    !nonproductionBlockerClosurePlanV2ReadyForApply &&
    !nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles &&
    nonproductionBlockerClosurePlanV2FixtureProbes > 0 &&
    nonproductionBlockerClosurePlanV2FixtureProbesPassed === nonproductionBlockerClosurePlanV2FixtureProbes;
  const nonproductionEvidenceRefreshV2Present = fs.existsSync(nonproductionEvidenceRefreshV2Path);
  const nonproductionEvidenceRefreshV2State = s(nonproductionEvidenceRefreshV2Summary, 'refreshState');
  const nonproductionEvidenceRefreshV2LegacyReviewResidueMatches = n(nonproductionEvidenceRefreshV2Summary, 'legacyReviewResidueMatches');
  const nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck = b(nonproductionEvidenceRefreshV2Summary, 'readyForNextNonProductionManifestRecheck');
  const nonproductionEvidenceRefreshV2ReadyForApply = b(nonproductionEvidenceRefreshV2Summary, 'readyForApply');
  const nonproductionEvidenceRefreshV2MayModifyProductionAppFiles = b(nonproductionEvidenceRefreshV2Summary, 'mayModifyProductionAppFiles');
  const nonproductionEvidenceRefreshV2FixtureProbesPassed = n(nonproductionEvidenceRefreshV2Summary, 'fixtureProbesPassed');
  const nonproductionEvidenceRefreshV2FixtureProbes = n(nonproductionEvidenceRefreshV2Summary, 'fixtureProbes');
  const nonproductionEvidenceRefreshV2FreshAfterClosurePlan =
    fileMtimeMs(nonproductionEvidenceRefreshV2Path) >= fileMtimeMs(nonproductionBlockerClosurePlanV2Path) &&
    fileMtimeMs(nonproductionBlockerClosurePlanV2Path) > 0;
  const nonproductionEvidenceRefreshV2Ready =
    nonproductionEvidenceRefreshV2Present &&
    nonproductionEvidenceRefreshV2FreshAfterClosurePlan &&
    n(nonproductionEvidenceRefreshV2Summary, 'blockers') === 0 &&
    nonproductionEvidenceRefreshV2State === 'llm_official_source_evidence_fresh' &&
    nonproductionEvidenceRefreshV2LegacyReviewResidueMatches === 0 &&
    nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck &&
    !nonproductionEvidenceRefreshV2ReadyForApply &&
    !nonproductionEvidenceRefreshV2MayModifyProductionAppFiles &&
    nonproductionEvidenceRefreshV2FixtureProbes > 0 &&
    nonproductionEvidenceRefreshV2FixtureProbesPassed === nonproductionEvidenceRefreshV2FixtureProbes;
  const runtimeServerManifestConsistencyRecheckV2Present = fs.existsSync(runtimeServerManifestConsistencyRecheckV2Path);
  const runtimeServerManifestConsistencyRecheckV2State = s(runtimeServerManifestConsistencyRecheckV2Summary, 'manifestConsistencyState');
  const runtimeServerManifestConsistencyRecheckV2ManifestEntries = n(runtimeServerManifestConsistencyRecheckV2Summary, 'manifestEntries');
  const runtimeServerManifestConsistencyRecheckV2GateRefsCurrent = n(runtimeServerManifestConsistencyRecheckV2Summary, 'gateReportRefsCurrentSha');
  const runtimeServerManifestConsistencyRecheckV2GateRefs = n(runtimeServerManifestConsistencyRecheckV2Summary, 'gateReportRefs');
  const runtimeServerManifestConsistencyRecheckV2InputHashesCurrent = n(runtimeServerManifestConsistencyRecheckV2Summary, 'manifestInputHashesCurrent');
  const runtimeServerManifestConsistencyRecheckV2InputHashes = n(runtimeServerManifestConsistencyRecheckV2Summary, 'manifestInputHashes');
  const runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen = n(runtimeServerManifestConsistencyRecheckV2Summary, 'topLevelUploadFlagsOpen');
  const runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries = n(runtimeServerManifestConsistencyRecheckV2Summary, 'activationApprovedEntries');
  const runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries = n(runtimeServerManifestConsistencyRecheckV2Summary, 'readyForApplyEntries');
  const runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck = b(runtimeServerManifestConsistencyRecheckV2Summary, 'readyForNextNonProductionLanguageIsolationRegressionRecheck');
  const runtimeServerManifestConsistencyRecheckV2ReadyForApply = b(runtimeServerManifestConsistencyRecheckV2Summary, 'readyForApply');
  const runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles = b(runtimeServerManifestConsistencyRecheckV2Summary, 'mayModifyProductionAppFiles');
  const runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed = n(runtimeServerManifestConsistencyRecheckV2Summary, 'fixtureProbesPassed');
  const runtimeServerManifestConsistencyRecheckV2FixtureProbes = n(runtimeServerManifestConsistencyRecheckV2Summary, 'fixtureProbes');
  const runtimeServerManifestConsistencyRecheckV2FreshAfterEvidenceRefresh =
    fileMtimeMs(runtimeServerManifestConsistencyRecheckV2Path) >= fileMtimeMs(nonproductionEvidenceRefreshV2Path) &&
    fileMtimeMs(nonproductionEvidenceRefreshV2Path) > 0;
  const runtimeServerManifestConsistencyRecheckV2Ready =
    runtimeServerManifestConsistencyRecheckV2Present &&
    runtimeServerManifestConsistencyRecheckV2FreshAfterEvidenceRefresh &&
    n(runtimeServerManifestConsistencyRecheckV2Summary, 'blockers') === 0 &&
    runtimeServerManifestConsistencyRecheckV2State === 'runtime_server_manifest_consistency_recheck_ready' &&
    runtimeServerManifestConsistencyRecheckV2ManifestEntries === 12 &&
    runtimeServerManifestConsistencyRecheckV2GateRefs > 0 &&
    runtimeServerManifestConsistencyRecheckV2GateRefsCurrent === runtimeServerManifestConsistencyRecheckV2GateRefs &&
    runtimeServerManifestConsistencyRecheckV2InputHashes === 3 &&
    runtimeServerManifestConsistencyRecheckV2InputHashesCurrent === runtimeServerManifestConsistencyRecheckV2InputHashes &&
    runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen === 0 &&
    runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries === 0 &&
    runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries === 0 &&
    runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck &&
    !runtimeServerManifestConsistencyRecheckV2ReadyForApply &&
    !runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles &&
    runtimeServerManifestConsistencyRecheckV2FixtureProbes > 0 &&
    runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed === runtimeServerManifestConsistencyRecheckV2FixtureProbes;
  const languageIsolationRegressionRecheckV2Present = fs.existsSync(languageIsolationRegressionRecheckV2Path);
  const languageIsolationRegressionRecheckV2State = s(languageIsolationRegressionRecheckV2Summary, 'languageIsolationRegressionRecheckState');
  const languageIsolationRegressionRecheckV2ScannedRows = n(languageIsolationRegressionRecheckV2Summary, 'scannedRows');
  const languageIsolationRegressionRecheckV2ScannedTargetFields = n(languageIsolationRegressionRecheckV2Summary, 'scannedTargetFields');
  const languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale = n(languageIsolationRegressionRecheckV2Summary, 'promptContractsWithTargetLocale');
  const languageIsolationRegressionRecheckV2PromptEntrypointsExpected = n(languageIsolationRegressionRecheckV2Summary, 'promptEntrypointsExpected');
  const languageIsolationRegressionRecheckV2ManifestEntries = n(languageIsolationRegressionRecheckV2Summary, 'manifestEntries');
  const languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh = b(languageIsolationRegressionRecheckV2Summary, 'readyForNextNonProductionReadinessApplyBlockerMapRefresh');
  const languageIsolationRegressionRecheckV2ReadyForApply = b(languageIsolationRegressionRecheckV2Summary, 'readyForApply');
  const languageIsolationRegressionRecheckV2MayModifyProductionAppFiles = b(languageIsolationRegressionRecheckV2Summary, 'mayModifyProductionAppFiles');
  const languageIsolationRegressionRecheckV2FixtureProbesPassed = n(languageIsolationRegressionRecheckV2Summary, 'fixtureProbesPassed');
  const languageIsolationRegressionRecheckV2FixtureProbes = n(languageIsolationRegressionRecheckV2Summary, 'fixtureProbes');
  const languageIsolationRegressionRecheckV2FreshAfterManifestConsistency =
    fileMtimeMs(languageIsolationRegressionRecheckV2Path) >= fileMtimeMs(runtimeServerManifestConsistencyRecheckV2Path) &&
    fileMtimeMs(runtimeServerManifestConsistencyRecheckV2Path) > 0;
  const languageIsolationRegressionRecheckV2Ready =
    languageIsolationRegressionRecheckV2Present &&
    languageIsolationRegressionRecheckV2FreshAfterManifestConsistency &&
    n(languageIsolationRegressionRecheckV2Summary, 'blockers') === 0 &&
    languageIsolationRegressionRecheckV2State === 'language_isolation_regression_recheck_ready' &&
    languageIsolationRegressionRecheckV2ScannedRows > 0 &&
    languageIsolationRegressionRecheckV2ScannedTargetFields > 0 &&
    languageIsolationRegressionRecheckV2PromptEntrypointsExpected > 0 &&
    languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale === languageIsolationRegressionRecheckV2PromptEntrypointsExpected &&
    languageIsolationRegressionRecheckV2ManifestEntries === 12 &&
    languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh &&
    !languageIsolationRegressionRecheckV2ReadyForApply &&
    !languageIsolationRegressionRecheckV2MayModifyProductionAppFiles &&
    languageIsolationRegressionRecheckV2FixtureProbes > 0 &&
    languageIsolationRegressionRecheckV2FixtureProbesPassed === languageIsolationRegressionRecheckV2FixtureProbes;
  const readinessApplyBlockerMapRefreshV2Present = fs.existsSync(readinessApplyBlockerMapRefreshV2Path);
  const readinessApplyBlockerMapRefreshV2State = s(readinessApplyBlockerMapRefreshV2Summary, 'blockerMapState');
  const readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers = n(readinessApplyBlockerMapRefreshV2Summary, 'readinessApplyBlockers');
  const readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers = n(readinessApplyBlockerMapRefreshV2Summary, 'readinessGenerationBlockers');
  const readinessApplyBlockerMapRefreshV2SafeClosed = n(readinessApplyBlockerMapRefreshV2Summary, 'safeNonProductionItemsClosed');
  const readinessApplyBlockerMapRefreshV2SafeRemaining = n(readinessApplyBlockerMapRefreshV2Summary, 'safeNonProductionItemsRemaining');
  const readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh = b(readinessApplyBlockerMapRefreshV2Summary, 'readyForNextNonProductionMasterNextPassConsistencyRefresh');
  const readinessApplyBlockerMapRefreshV2ReadyForApply = b(readinessApplyBlockerMapRefreshV2Summary, 'readyForApply');
  const readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles = b(readinessApplyBlockerMapRefreshV2Summary, 'mayModifyProductionAppFiles');
  const readinessApplyBlockerMapRefreshV2FixtureProbesPassed = n(readinessApplyBlockerMapRefreshV2Summary, 'fixtureProbesPassed');
  const readinessApplyBlockerMapRefreshV2FixtureProbes = n(readinessApplyBlockerMapRefreshV2Summary, 'fixtureProbes');
  const readinessApplyBlockerMapRefreshV2FreshAfterLanguageIsolation =
    fileMtimeMs(readinessApplyBlockerMapRefreshV2Path) >= fileMtimeMs(languageIsolationRegressionRecheckV2Path) &&
    fileMtimeMs(languageIsolationRegressionRecheckV2Path) > 0;
  const readinessApplyBlockerMapRefreshV2Ready =
    readinessApplyBlockerMapRefreshV2Present &&
    readinessApplyBlockerMapRefreshV2FreshAfterLanguageIsolation &&
    n(readinessApplyBlockerMapRefreshV2Summary, 'blockers') === 0 &&
    readinessApplyBlockerMapRefreshV2State === 'readiness_apply_blocker_map_refreshed' &&
    readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers === 0 &&
    readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers === 2 &&
    readinessApplyBlockerMapRefreshV2SafeClosed === 4 &&
    readinessApplyBlockerMapRefreshV2SafeRemaining === 1 &&
    readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh &&
    !readinessApplyBlockerMapRefreshV2ReadyForApply &&
    !readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles &&
    readinessApplyBlockerMapRefreshV2FixtureProbes > 0 &&
    readinessApplyBlockerMapRefreshV2FixtureProbesPassed === readinessApplyBlockerMapRefreshV2FixtureProbes;
  const masterNextPassConsistencyRefreshV2Present = fs.existsSync(masterNextPassConsistencyRefreshV2Path);
  const masterNextPassConsistencyRefreshV2State = s(masterNextPassConsistencyRefreshV2Summary, 'consistencyState');
  const masterNextPassConsistencyRefreshV2NextGoalId = s(masterNextPassConsistencyRefreshV2Summary, 'nextPassGoalId');
  const masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage = b(masterNextPassConsistencyRefreshV2Summary, 'readyForOfficialSourceContentCoverageGateV2');
  const masterNextPassConsistencyRefreshV2ReadyForApply = b(masterNextPassConsistencyRefreshV2Summary, 'readyForApply');
  const masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles = b(masterNextPassConsistencyRefreshV2Summary, 'mayModifyProductionAppFiles');
  const masterNextPassConsistencyRefreshV2FixtureProbesPassed = n(masterNextPassConsistencyRefreshV2Summary, 'fixtureProbesPassed');
  const masterNextPassConsistencyRefreshV2FixtureProbes = n(masterNextPassConsistencyRefreshV2Summary, 'fixtureProbes');
  const masterNextPassConsistencyRefreshV2FreshAfterReadinessMap =
    fileMtimeMs(masterNextPassConsistencyRefreshV2Path) >= fileMtimeMs(readinessApplyBlockerMapRefreshV2Path) &&
    fileMtimeMs(readinessApplyBlockerMapRefreshV2Path) > 0;
  const masterNextPassConsistencyRefreshV2Ready =
    masterNextPassConsistencyRefreshV2Present &&
    masterNextPassConsistencyRefreshV2FreshAfterReadinessMap &&
    n(masterNextPassConsistencyRefreshV2Summary, 'blockers') === 0 &&
    masterNextPassConsistencyRefreshV2State === 'master_next_pass_consistency_refreshed' &&
    masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage &&
    !masterNextPassConsistencyRefreshV2ReadyForApply &&
    !masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles &&
    masterNextPassConsistencyRefreshV2FixtureProbes > 0 &&
    masterNextPassConsistencyRefreshV2FixtureProbesPassed === masterNextPassConsistencyRefreshV2FixtureProbes;
  const officialSourceContentCoverageV2Present = fs.existsSync(officialSourceContentCoverageV2Path);
  const officialSourceContentCoverageV2State = s(officialSourceContentCoverageV2Summary, 'coverageState');
  const officialSourceContentCoverageV2LedgerRows = n(officialSourceContentCoverageV2Summary, 'ledgerRows');
  const officialSourceContentCoverageV2AcceptedRows = n(officialSourceContentCoverageV2Summary, 'acceptedRowOfficialSourceDecisionRows');
  const officialSourceContentCoverageV2AcceptedAi = n(officialSourceContentCoverageV2Summary, 'acceptedAiOfficialSourceDecisionRows');
  const officialSourceContentCoverageV2RowsWithSourceRefs = n(officialSourceContentCoverageV2Summary, 'rowDecisionsWithSourceRefs');
  const officialSourceContentCoverageV2RowsWithGatesPassed = n(officialSourceContentCoverageV2Summary, 'rowDecisionsWithAllRequiredGatesPassed');
  const officialSourceContentCoverageV2QuizRowsOneCorrect = n(officialSourceContentCoverageV2Summary, 'rowDecisionQuizRowsWithOneCorrectAnswer');
  const officialSourceContentCoverageV2TrustedSourceIds = n(officialSourceContentCoverageV2Summary, 'trustedSourceIds');
  const officialSourceContentCoverageV2ResearchPackCheckedOnlineAt = s(officialSourceContentCoverageV2Summary, 'researchPackCheckedOnlineAt');
  const officialSourceContentCoverageV2ReadyForImportDryRunRefresh = b(officialSourceContentCoverageV2Summary, 'readyForReviewerDecisionImportDryRunRefresh');
  const officialSourceContentCoverageV2ReadyForApply = b(officialSourceContentCoverageV2Summary, 'readyForApply');
  const officialSourceContentCoverageV2MayModifyProductionAppFiles = b(officialSourceContentCoverageV2Summary, 'mayModifyProductionAppFiles');
  const officialSourceContentCoverageV2FixtureProbesPassed = n(officialSourceContentCoverageV2Summary, 'fixtureProbesPassed');
  const officialSourceContentCoverageV2FixtureProbes = n(officialSourceContentCoverageV2Summary, 'fixtureProbes');
  const officialSourceContentCoverageV2FreshAfterMasterRefresh =
    fileMtimeMs(officialSourceContentCoverageV2Path) >= fileMtimeMs(masterNextPassConsistencyRefreshV2Path) &&
    fileMtimeMs(masterNextPassConsistencyRefreshV2Path) > 0;
  const officialSourceContentCoverageV2Ready =
    officialSourceContentCoverageV2Present &&
    officialSourceContentCoverageV2FreshAfterMasterRefresh &&
    n(officialSourceContentCoverageV2Summary, 'blockers') === 0 &&
    officialSourceContentCoverageV2State === 'official_source_content_coverage_complete_no_import' &&
    officialSourceContentCoverageV2LedgerRows === 1600 &&
    officialSourceContentCoverageV2AcceptedRows === 1600 &&
    officialSourceContentCoverageV2AcceptedAi === 164 &&
    officialSourceContentCoverageV2RowsWithSourceRefs === 1600 &&
    officialSourceContentCoverageV2RowsWithGatesPassed === 1600 &&
    officialSourceContentCoverageV2QuizRowsOneCorrect === 1600 &&
    officialSourceContentCoverageV2TrustedSourceIds > 0 &&
    officialSourceContentCoverageV2ResearchPackCheckedOnlineAt !== '' &&
    officialSourceContentCoverageV2ReadyForImportDryRunRefresh &&
    !officialSourceContentCoverageV2ReadyForApply &&
    !officialSourceContentCoverageV2MayModifyProductionAppFiles &&
    officialSourceContentCoverageV2FixtureProbes > 0 &&
    officialSourceContentCoverageV2FixtureProbesPassed === officialSourceContentCoverageV2FixtureProbes;
  const officialSourceImportDryRunV2Present = reviewerDecisionImportV2DryRunPresent;
  const officialSourceImportDryRunV2Rows = n(reviewerDecisionImportV2DryRunSummary, 'rowDecisionRows');
  const officialSourceImportDryRunV2Ai = n(reviewerDecisionImportV2DryRunSummary, 'aiDecisionRows');
  const officialSourceImportDryRunV2AcceptedRows = n(reviewerDecisionImportV2DryRunSummary, 'acceptedRowDecisionRows');
  const officialSourceImportDryRunV2AcceptedAi = n(reviewerDecisionImportV2DryRunSummary, 'acceptedAiDecisionRows');
  const officialSourceImportDryRunV2PromotedRowFileUsed = b(reviewerDecisionImportV2DryRunSummary, 'rowDecisionFilePromotedOfficialSourceUsed');
  const officialSourceImportDryRunV2PromotedAiFileUsed = b(reviewerDecisionImportV2DryRunSummary, 'aiDecisionFilePromotedOfficialSourceUsed');
  const officialSourceImportDryRunV2ReadyForExecutionGateRefresh = b(reviewerDecisionImportV2DryRunSummary, 'readyForOfficialSourceImportExecutionGateRefresh');
  const officialSourceImportDryRunV2ReadyForApply = b(reviewerDecisionImportV2DryRunSummary, 'readyForApply');
  const officialSourceImportDryRunV2MayModifyProductionAppFiles = b(reviewerDecisionImportV2DryRunSummary, 'mayModifyProductionAppFiles');
  const officialSourceImportDryRunV2RowProbesPassed = n(reviewerDecisionImportV2DryRunSummary, 'rowFixtureProbesPassed');
  const officialSourceImportDryRunV2RowProbes = n(reviewerDecisionImportV2DryRunSummary, 'rowFixtureProbes');
  const officialSourceImportDryRunV2AiProbesPassed = n(reviewerDecisionImportV2DryRunSummary, 'aiFixtureProbesPassed');
  const officialSourceImportDryRunV2AiProbes = n(reviewerDecisionImportV2DryRunSummary, 'aiFixtureProbes');
  const officialSourceImportDryRunV2Ready =
    officialSourceImportDryRunV2Present &&
    n(reviewerDecisionImportV2DryRunSummary, 'blockers') === 0 &&
    officialSourceImportDryRunV2Rows === 1600 &&
    officialSourceImportDryRunV2Ai === 164 &&
    officialSourceImportDryRunV2AcceptedRows === 1600 &&
    officialSourceImportDryRunV2AcceptedAi === 164 &&
    fs.existsSync(officialSourcePromotedRowDecisionsV2Path) &&
    fs.existsSync(officialSourcePromotedAiDecisionsV2Path) &&
    b(reviewerDecisionImportV2DryRunSummary, 'officialSourceContentCoverageV2Ready') &&
    officialSourceImportDryRunV2PromotedRowFileUsed &&
    officialSourceImportDryRunV2PromotedAiFileUsed &&
    officialSourceImportDryRunV2ReadyForExecutionGateRefresh &&
    !officialSourceImportDryRunV2ReadyForApply &&
    !officialSourceImportDryRunV2MayModifyProductionAppFiles &&
    officialSourceImportDryRunV2RowProbes > 0 &&
    officialSourceImportDryRunV2RowProbesPassed === officialSourceImportDryRunV2RowProbes &&
    officialSourceImportDryRunV2AiProbes > 0 &&
    officialSourceImportDryRunV2AiProbesPassed === officialSourceImportDryRunV2AiProbes;
  const officialSourceImportExecutionGateV2State = reviewerDecisionImportExecutionGateV2State;
  const officialSourceImportExecutionGateV2WouldRun = reviewerDecisionImportExecutionGateV2WouldRun;
  const officialSourceImportExecutionGateV2P13CoverageReady = b(reviewerDecisionImportExecutionGateV2Summary, 'p13OfficialSourceCoverageReady');
  const officialSourceImportExecutionGateV2PromotedRowFileUsed = b(reviewerDecisionImportExecutionGateV2Summary, 'p13PromotedOfficialSourceRowFileUsed');
  const officialSourceImportExecutionGateV2PromotedAiFileUsed = b(reviewerDecisionImportExecutionGateV2Summary, 'p13PromotedOfficialSourceAiFileUsed');
  const officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight = b(reviewerDecisionImportExecutionGateV2Summary, 'readyForPayloadCreationApprovalPreflight');
  const officialSourceImportExecutionGateV2ReadyForApply = b(reviewerDecisionImportExecutionGateV2Summary, 'readyForApply');
  const officialSourceImportExecutionGateV2MayModifyProductionAppFiles = b(reviewerDecisionImportExecutionGateV2Summary, 'mayModifyProductionAppFiles');
  const officialSourceImportExecutionGateV2FixtureProbesPassed = n(reviewerDecisionImportExecutionGateV2Summary, 'fixtureProbesPassed');
  const officialSourceImportExecutionGateV2FixtureProbes = n(reviewerDecisionImportExecutionGateV2Summary, 'fixtureProbes');
  const officialSourceImportExecutionGateV2Ready =
    reviewerDecisionImportExecutionGateV2Present &&
    n(reviewerDecisionImportExecutionGateV2Summary, 'blockers') === 0 &&
    officialSourceImportExecutionGateV2State === 'eligible_llm_official_source_review' &&
    officialSourceImportExecutionGateV2WouldRun &&
    officialSourceImportExecutionGateV2P13CoverageReady &&
    officialSourceImportExecutionGateV2PromotedRowFileUsed &&
    officialSourceImportExecutionGateV2PromotedAiFileUsed &&
    b(reviewerDecisionImportExecutionGateV2Summary, 'p13ReadyForOfficialSourceImportExecutionGateRefresh') &&
    officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight &&
    !officialSourceImportExecutionGateV2ReadyForApply &&
    !officialSourceImportExecutionGateV2MayModifyProductionAppFiles &&
    officialSourceImportExecutionGateV2FixtureProbes > 0 &&
    officialSourceImportExecutionGateV2FixtureProbesPassed === officialSourceImportExecutionGateV2FixtureProbes;
  const officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate =
    fileMtimeMs(payloadCreationApprovalPreflightV2Path) >= fileMtimeMs(reviewerDecisionImportExecutionGateV2Path) &&
    fileMtimeMs(reviewerDecisionImportExecutionGateV2Path) > 0;
  const officialSourcePayloadCreationApprovalPreflightV2Ready =
    payloadCreationApprovalPreflightV2Ready &&
    officialSourceImportExecutionGateV2Ready &&
    officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate &&
    !b(payloadCreationApprovalPreflightV2Summary, 'readyForApply') &&
    !b(payloadCreationApprovalPreflightV2Summary, 'mayModifyProductionAppFiles');
  const officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight =
    fileMtimeMs(closedLocalPayloadMaterializationV2Path) >= fileMtimeMs(payloadCreationApprovalPreflightV2Path) &&
    fileMtimeMs(payloadCreationApprovalPreflightV2Path) > 0;
  const officialSourceClosedLocalPayloadMaterializationV2Ready =
    closedLocalPayloadMaterializationV2Ready &&
    officialSourcePayloadCreationApprovalPreflightV2Ready &&
    officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight &&
    !b(closedLocalPayloadMaterializationV2Summary, 'readyForApply') &&
    !b(closedLocalPayloadMaterializationV2Summary, 'mayModifyProductionAppFiles');
  const generationHistoryReconciled = fs.existsSync(generationHistoryPath) && n(generationHistorySummary, 'blockers') === 0;
  const appAtlasFreshEnoughForP2 =
    fs.existsSync(appAtlasPath) &&
    n(appAtlasSummary, 'blockers') === 0 &&
    n(appAtlasSummary, 'unclassifiedTargetSensitiveFiles') === 0;
  const domainRegistryV2Ready =
    fs.existsSync(domainRegistryPath) &&
    n(domainRegistrySummary, 'blockers') === 0 &&
    n(domainRegistrySummary, 'aiPromptEntrypoints') === n(domainRegistrySummary, 'aiPromptEntrypointsCovered');
  const p0p2Ready = generationHistoryReconciled && appAtlasFreshEnoughForP2 && domainRegistryV2Ready && b(upgradeSummary, 'readyForP0P2');
  if (researchPackPresent && !researchPackVerified) {
    addFinding(findings, 'warning', 'research_pack_not_verified', 'Research pack exists, but P4 must wait until target_research_pack_verify_audit passes.', rel(repoRoot, targetResearchPackVerifyPath));
  }
  if (researchPackVerified && pedagogyBlueprintPresent && !pedagogyBlueprintReady) {
    addFinding(findings, 'warning', 'pedagogy_blueprint_not_ready', 'Pedagogy blueprint exists, but P5 must wait until target_pedagogy_blueprint_packet reports readyForGenerationSchemaV2.', rel(repoRoot, targetPedagogyBlueprintPacketPath));
  }
  if (pedagogyBlueprintReady && generationSchemaV2Present && !generationSchemaV2Ready) {
    addFinding(findings, 'warning', 'generation_schema_v2_not_ready', 'Generation Schema V2 exists, but P6 must wait until generation_schema_v2_packet reports readyForAiPromptContractV2.', rel(repoRoot, generationSchemaV2PacketPath));
  }
  if (generationSchemaV2Ready && aiPromptContractV2Present && !aiPromptContractV2Ready) {
    addFinding(findings, 'warning', 'ai_prompt_contract_v2_not_ready', 'AI Prompt Contract V2 exists, but P7 must wait until ai_prompt_contract_v2_packet reports readyForContentQualityGatesV2.', rel(repoRoot, aiPromptContractV2PacketPath));
  }
  if (aiPromptContractV2Ready && contentQualityGatesV2Present && !contentQualityGatesV2Ready) {
    addFinding(findings, 'warning', 'content_quality_gates_v2_not_ready', 'Content Quality Gates V2 exists, but P8 must wait until content_quality_gates_v2_packet reports readyForReviewerWorkflowV2.', rel(repoRoot, contentQualityGatesV2PacketPath));
  }
  if (contentQualityGatesV2Ready && reviewerWorkflowV2Present && !reviewerWorkflowV2Ready) {
    addFinding(findings, 'warning', 'reviewer_workflow_v2_not_ready', 'Reviewer Workflow V2 exists, but P9 must wait until reviewer_workflow_v2_packet reports readyForLlmOfficialSourceReviewV2.', rel(repoRoot, reviewerWorkflowV2PacketPath));
  }
  if (reviewerWorkflowV2Ready && targetPackManifestV2Present && !targetPackManifestV2Ready) {
    addFinding(findings, 'warning', 'target_pack_manifest_v2_not_ready', 'Target Pack Manifest V2 exists, but P10 must wait until target_pack_manifest_v2_packet reports readyForRuntimeServerDeliveryContractV2.', rel(repoRoot, targetPackManifestV2PacketPath));
  }
  if (targetPackManifestV2Ready && runtimeServerDeliveryContractV2Present && !runtimeServerDeliveryContractV2Ready) {
    addFinding(findings, 'warning', 'runtime_server_delivery_contract_v2_not_ready', 'Runtime/Server Delivery Contract V2 exists, but P11 must wait until it reports readyForStorageCloudTargetMapV2.', rel(repoRoot, runtimeServerDeliveryContractV2PacketPath));
  }
  if (runtimeServerDeliveryContractV2Ready && storageCloudTargetMapV2Present && !storageCloudTargetMapV2Ready) {
    addFinding(findings, 'warning', 'storage_cloud_target_map_v2_not_ready', 'Storage/Cloud Target Namespace Map V2 exists, but P12 must wait until it reports readyForAdminPackDeliverySurfaceV2.', rel(repoRoot, storageCloudTargetMapV2PacketPath));
  }
  if (storageCloudTargetMapV2Ready && adminReviewerDeliverySurfaceV2Present && !adminReviewerDeliverySurfaceV2Ready) {
    addFinding(findings, 'warning', 'admin_reviewer_delivery_surface_v2_not_ready', 'Admin/Reviewer Delivery Surface V2 exists, but P13 must wait until it reports readyForReviewerDecisionImportV2DryRun.', rel(repoRoot, adminReviewerDeliverySurfaceV2PacketPath));
  }
  if (adminReviewerDeliverySurfaceV2Ready && reviewerDecisionImportV2DryRunPresent && !reviewerDecisionImportV2DryRunReady) {
    addFinding(findings, 'warning', 'reviewer_decision_import_v2_dry_run_not_ready', 'Reviewer Decision Import V2 dry-run exists, but P14 must wait until it reports readyForPayloadShardMaterializationGate.', rel(repoRoot, reviewerDecisionImportV2DryRunPath));
  }
  if (readyForPayloadShardMaterializationGate && payloadShardMaterializationChecksumV2Present && !payloadShardMaterializationChecksumV2Ready) {
    addFinding(findings, 'warning', 'payload_shard_materialization_checksum_v2_not_ready', 'Payload shard materialization/checksum V2 exists, but P15 must wait until it reports readyForServerManifestPreviewGate.', rel(repoRoot, payloadShardMaterializationChecksumV2Path));
  }
  if (readyForServerManifestPreviewGate && serverDeliveryManifestPreviewV2Present && !serverDeliveryManifestPreviewV2Ready) {
    addFinding(findings, 'warning', 'server_delivery_manifest_preview_v2_not_ready', 'Server delivery manifest preview V2 exists, but P16 must wait until it reports readyForRuntimeCacheIntegrityGate.', rel(repoRoot, serverDeliveryManifestPreviewV2Path));
  }
  if (readyForRuntimeCacheIntegrityGate && runtimeCacheIntegrityRollbackV2Present && !runtimeCacheIntegrityRollbackV2Ready) {
    addFinding(findings, 'warning', 'runtime_cache_integrity_rollback_v2_not_ready', 'Runtime cache integrity/rollback V2 exists, but P17 must wait until it reports readyForReviewerDecisionImportOpeningGate.', rel(repoRoot, runtimeCacheIntegrityRollbackV2Path));
  }
  if (readyForReviewerDecisionImportOpeningGate && reviewerDecisionImportOpeningPreflightV2Present && !reviewerDecisionImportOpeningPreflightV2Ready) {
    addFinding(findings, 'warning', 'reviewer_decision_import_opening_preflight_v2_not_ready', 'Reviewer decision import opening preflight V2 exists, but P18 must wait until it reports readyForReviewerDecisionImportOpeningPreflight.', rel(repoRoot, reviewerDecisionImportOpeningPreflightV2Path));
  }
  if (reviewerDecisionImportOpeningPreflightV2Ready && llmOfficialSourceReviewIntakeV2Present && !llmOfficialSourceReviewIntakeV2Ready) {
    addFinding(findings, 'warning', 'llm_official_source_review_intake_v2_not_ready', 'LLM official-source review intake V2 exists, but P19 must wait until it reports a non-blocked intake state.', rel(repoRoot, llmOfficialSourceReviewIntakeV2Path));
  }
  if (llmOfficialSourceReviewIntakeV2Ready && reviewerDecisionImportExecutionGateV2Present && !reviewerDecisionImportExecutionGateV2Ready) {
    addFinding(findings, 'warning', 'reviewer_decision_import_execution_gate_v2_not_ready', 'Reviewer decision import execution gate V2 exists, but P20 must wait until it reports a non-blocked execution state.', rel(repoRoot, reviewerDecisionImportExecutionGateV2Path));
  }
  if (reviewerDecisionImportExecutionGateV2Ready && llmOfficialSourceDecisionMaterializationV2Present && !llmOfficialSourceDecisionMaterializationV2Ready) {
    addFinding(findings, 'warning', 'llm_official_source_decision_materialization_v2_not_ready', 'LLM official-source decision materialization V2 exists, but P21 must wait until it reports readyForLlmOfficialSourceDecisionDryRun.', rel(repoRoot, llmOfficialSourceDecisionMaterializationV2Path));
  }
  if (llmOfficialSourceDecisionMaterializationV2Ready && llmOfficialSourceDecisionDryRunV2Present && !llmOfficialSourceDecisionDryRunV2Ready) {
    addFinding(findings, 'warning', 'llm_official_source_decision_dry_run_v2_not_ready', 'LLM official-source decision dry-run V2 exists, but P22 must wait until it reports readyForLlmOfficialSourceDecisionPromotionPreflight.', rel(repoRoot, llmOfficialSourceDecisionDryRunV2Path));
  }
  if (llmOfficialSourceDecisionDryRunV2Ready && llmOfficialSourceDecisionPromotionPreflightV2Present && !llmOfficialSourceDecisionPromotionPreflightV2Ready) {
    addFinding(findings, 'warning', 'llm_official_source_decision_promotion_preflight_v2_not_ready', 'LLM official-source decision promotion preflight V2 exists, but P23 must wait until it reports readyForPromotedDecisionFileGeneration.', rel(repoRoot, llmOfficialSourceDecisionPromotionPreflightV2Path));
  }
  if (llmOfficialSourceDecisionPromotionPreflightV2Ready && llmOfficialSourcePromotedDecisionFileGenerationV2Present && !llmOfficialSourcePromotedDecisionFileGenerationV2Ready) {
    addFinding(findings, 'warning', 'llm_official_source_promoted_decision_file_generation_v2_not_ready', 'Promoted decision file generation V2 exists, but P24 must wait until it reports full accepted decisions and import-refresh readiness.', rel(repoRoot, llmOfficialSourcePromotedDecisionFileGenerationV2Path));
  }
  if (readyForPayloadCreationApprovalPreflightV2 && payloadCreationApprovalPreflightV2Present && !payloadCreationApprovalPreflightV2Ready) {
    addFinding(findings, 'warning', 'payload_creation_approval_preflight_v2_not_ready', 'Payload creation approval preflight V2 exists, but P25 must wait until it reports readyForClosedPayloadMaterializationV2.', rel(repoRoot, payloadCreationApprovalPreflightV2Path));
  }
  if (readyForClosedPayloadMaterializationV2 && closedLocalPayloadMaterializationV2Present && !closedLocalPayloadMaterializationV2Ready) {
    addFinding(findings, 'warning', 'closed_local_payload_materialization_v2_not_ready', 'Closed local payload materialization V2 exists, but P26 must wait until it reports readyForServerDeliveryPublishPreflightV2.', rel(repoRoot, closedLocalPayloadMaterializationV2Path));
  }
  if (readyForServerDeliveryPublishPreflightV2 && serverDeliveryPublishPreflightV2Present && !serverDeliveryPublishPreflightV2Ready) {
    addFinding(findings, 'warning', 'server_delivery_publish_preflight_v2_not_ready', 'Server delivery publish preflight V2 exists, but P27 must wait until it reports readyForAdminServerDeliveryReviewV2.', rel(repoRoot, serverDeliveryPublishPreflightV2Path));
  }
  if (readyForAdminServerDeliveryReviewV2 && adminServerDeliveryRuntimePreflightV2Present && !adminServerDeliveryRuntimePreflightV2Ready) {
    addFinding(findings, 'warning', 'admin_server_delivery_runtime_preflight_v2_not_ready', 'Admin/server delivery runtime preflight V2 exists, but P28 must wait until it reports readyForRuntimeActivationBlockerPlanningV2.', rel(repoRoot, adminServerDeliveryRuntimePreflightV2Path));
  }
  if (readyForRuntimeActivationBlockerPlanningV2 && runtimeActivationBlockerPlanV2Present && !runtimeActivationBlockerPlanV2Ready) {
    addFinding(findings, 'warning', 'runtime_activation_blocker_plan_v2_not_ready', 'Runtime activation blocker plan V2 exists, but P29 must wait until it reports readyForExplicitApprovalReceiptGateV2.', rel(repoRoot, runtimeActivationBlockerPlanV2Path));
  }
  if (readyForExplicitApprovalReceiptGateV2 && explicitApprovalReceiptHashLockGateV2Present && !explicitApprovalReceiptHashLockGateV2Ready) {
    addFinding(findings, 'warning', 'explicit_approval_receipt_hash_lock_gate_v2_not_ready', 'Explicit approval receipt/hash-lock gate V2 exists, but P30 must wait until it reports readyForApprovalRequestPresentationV2 with no active receipt/hash lock.', rel(repoRoot, explicitApprovalReceiptHashLockGateV2Path));
  }
  if (readyForApprovalRequestPresentationV2 && activationApprovalRequestPresentationV2Present && !activationApprovalRequestPresentationV2Ready) {
    addFinding(findings, 'warning', 'activation_approval_request_presentation_v2_not_ready', 'Activation approval request presentation V2 exists, but P31 must wait until it reports readyForExplicitApprovalReceiptCreationGateV2 with no active receipt/hash lock.', rel(repoRoot, activationApprovalRequestPresentationV2Path));
  }
  if (readyForExplicitApprovalReceiptCreationGateV2 && explicitApprovalReceiptCreationGateV2Present && !explicitApprovalReceiptCreationGateV2SafeHoldReady) {
    addFinding(findings, 'warning', 'explicit_approval_receipt_creation_gate_v2_not_safe_hold_ready', 'Explicit approval receipt creation gate V2 exists, but P32 must wait until it proves plain continue is rejected and no active receipt/hash lock is created.', rel(repoRoot, explicitApprovalReceiptCreationGateV2Path));
  }
  if (readyForProductionApplyAbsenceDenialGateV2 && productionApplyAbsenceDenialGateV2Present && !productionApplyAbsenceDenialGateV2SafeHoldReady) {
    addFinding(findings, 'warning', 'production_apply_absence_denial_gate_v2_not_safe_hold_ready', 'Production apply absence denial gate V2 exists, but P33 must wait until it denies apply with no active receipt/hash lock and keeps non-production audit open.', rel(repoRoot, productionApplyAbsenceDenialGateV2Path));
  }
  if (readyForNonProductionContinuationAfterApplyDenialV2 && nonproductionBlockerClosurePlanV2Present && !nonproductionBlockerClosurePlanV2Ready) {
    addFinding(findings, 'warning', 'nonproduction_blocker_closure_plan_v2_not_ready', 'Non-production blocker closure plan V2 exists, but P34 must wait until it ranks safe work, keeps apply closed and passes fixture probes.', rel(repoRoot, nonproductionBlockerClosurePlanV2Path));
  }
  if (nonproductionBlockerClosurePlanV2Ready && nonproductionEvidenceRefreshV2Present && !nonproductionEvidenceRefreshV2Ready) {
    addFinding(findings, 'warning', 'nonproduction_evidence_refresh_v2_not_ready', 'Non-production evidence refresh V2 exists, but P35 must wait until LLM official-source freshness is clean and all production/import flags stay closed.', rel(repoRoot, nonproductionEvidenceRefreshV2Path));
  }
  if (nonproductionEvidenceRefreshV2Ready && runtimeServerManifestConsistencyRecheckV2Present && !runtimeServerManifestConsistencyRecheckV2Ready) {
    addFinding(findings, 'warning', 'runtime_server_manifest_consistency_recheck_v2_not_ready', 'Runtime/server manifest consistency recheck V2 exists, but P36 must wait until manifest refs, hashes, path scopes and closed flags are clean.', rel(repoRoot, runtimeServerManifestConsistencyRecheckV2Path));
  }
  if (runtimeServerManifestConsistencyRecheckV2Ready && languageIsolationRegressionRecheckV2Present && !languageIsolationRegressionRecheckV2Ready) {
    addFinding(findings, 'warning', 'language_isolation_regression_recheck_v2_not_ready', 'Language isolation regression recheck V2 exists, but P37 must wait until isolation, prompt, storage/cloud, admin/runtime and manifest dimensions are clean.', rel(repoRoot, languageIsolationRegressionRecheckV2Path));
  }
  if (languageIsolationRegressionRecheckV2Ready && readinessApplyBlockerMapRefreshV2Present && !readinessApplyBlockerMapRefreshV2Ready) {
    addFinding(findings, 'warning', 'readiness_apply_blocker_map_refresh_v2_not_ready', 'Readiness/apply blocker map refresh V2 exists, but P38 must wait until it proves zero generation blockers, exactly two expected apply blockers, closed production flags and passing probes.', rel(repoRoot, readinessApplyBlockerMapRefreshV2Path));
  }
  if (readinessApplyBlockerMapRefreshV2Ready && masterNextPassConsistencyRefreshV2Present && !masterNextPassConsistencyRefreshV2Ready) {
    addFinding(findings, 'warning', 'master_next_pass_consistency_refresh_v2_not_ready', 'Master/next-pass consistency refresh V2 exists, but P39 must wait until P37 is represented in master and next-pass with production flags closed.', rel(repoRoot, masterNextPassConsistencyRefreshV2Path));
  }
  if (masterNextPassConsistencyRefreshV2Ready && officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2Ready) {
    addFinding(findings, 'warning', 'official_source_content_coverage_v2_not_ready', 'Official-source content coverage V2 exists, but P40 must wait until all 1600 rows and 164 AI decisions have accepted official-source evidence and gates.', rel(repoRoot, officialSourceContentCoverageV2Path));
  }
  if (officialSourceContentCoverageV2Ready && officialSourceImportDryRunV2Present && !officialSourceImportDryRunV2Ready) {
    addFinding(findings, 'warning', 'official_source_import_dry_run_v2_not_ready', 'Reviewer import dry-run exists, but P41 must wait until it uses promoted official-source files and keeps apply/app writes closed.', rel(repoRoot, reviewerDecisionImportV2DryRunPath));
  }
  if (officialSourceImportDryRunV2Ready && reviewerDecisionImportExecutionGateV2Present && !officialSourceImportExecutionGateV2Ready) {
    addFinding(findings, 'warning', 'official_source_import_execution_gate_v2_not_ready', 'Reviewer import execution gate exists, but P41 must wait until it depends on the promoted official-source dry-run and reports a closed-production eligible state.', rel(repoRoot, reviewerDecisionImportExecutionGateV2Path));
  }
  if (officialSourceImportExecutionGateV2Ready && payloadCreationApprovalPreflightV2Present && !officialSourcePayloadCreationApprovalPreflightV2Ready) {
    addFinding(findings, 'warning', 'official_source_payload_preflight_v2_not_fresh', 'Payload creation approval preflight exists, but the next pass must refresh it after the official-source import execution gate.', rel(repoRoot, payloadCreationApprovalPreflightV2Path));
  }
  const goals = selectNextPassGoals(researchPackVerified, pedagogyBlueprintReady, generationSchemaV2Ready, aiPromptContractV2Ready, contentQualityGatesV2Ready, reviewerWorkflowV2Ready, targetPackManifestV2Ready, runtimeServerDeliveryContractV2Ready, storageCloudTargetMapV2Ready, adminReviewerDeliverySurfaceV2Ready, reviewerDecisionImportV2DryRunReady, payloadShardMaterializationChecksumV2Ready, serverDeliveryManifestPreviewV2Ready, runtimeCacheIntegrityRollbackV2Ready, reviewerDecisionImportOpeningPreflightV2Ready, llmOfficialSourceReviewIntakeV2Ready, reviewerDecisionImportExecutionGateV2Ready, reviewerDecisionImportExecutionGateV2WouldRun, llmOfficialSourceDecisionMaterializationV2Ready, llmOfficialSourceDecisionDryRunV2Ready, llmOfficialSourceDecisionPromotionPreflightV2Ready, llmOfficialSourcePromotedDecisionFileGenerationV2Ready, payloadCreationApprovalPreflightV2Ready, closedLocalPayloadMaterializationV2Ready, serverDeliveryPublishPreflightV2Ready, adminServerDeliveryRuntimePreflightV2Ready, runtimeActivationBlockerPlanV2Ready, explicitApprovalReceiptHashLockGateV2Ready, activationApprovalRequestPresentationV2Ready, explicitApprovalReceiptCreationGateV2SafeHoldReady, productionApplyAbsenceDenialGateV2SafeHoldReady, nonproductionBlockerClosurePlanV2Ready, nonproductionEvidenceRefreshV2Ready, runtimeServerManifestConsistencyRecheckV2Ready, languageIsolationRegressionRecheckV2Ready, readinessApplyBlockerMapRefreshV2Ready, masterNextPassConsistencyRefreshV2Ready, officialSourceContentCoverageV2Ready, officialSourceImportDryRunV2Ready, officialSourceImportExecutionGateV2Ready, officialSourcePayloadCreationApprovalPreflightV2Ready, officialSourceClosedLocalPayloadMaterializationV2Ready, p0p2Ready);

  if (goals.length === 0) {
    addFinding(findings, 'blocker', 'next_pass_goals_missing', 'No next pass goals were selected.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rules = contractRules();
  const triggers = triggerPhrases();
  const checklist = closeoutChecklist();

  const report: Report = {
    schemaVersion: 'gustav-next-pass-goal-contract-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      selfImprovingUpgradePacket: rel(repoRoot, upgradePath),
      generationHistoryReconciliationAudit: rel(repoRoot, generationHistoryPath),
      appAtlasRefreshAudit: rel(repoRoot, appAtlasPath),
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
      researchPack: rel(repoRoot, researchPackPath),
      targetResearchPackVerifyAudit: rel(repoRoot, targetResearchPackVerifyPath),
      pedagogyBlueprint: rel(repoRoot, pedagogyBlueprintPath),
      targetPedagogyBlueprintPacket: rel(repoRoot, targetPedagogyBlueprintPacketPath),
      generationSchemaV2: rel(repoRoot, generationSchemaV2Path),
      generationSchemaV2Packet: rel(repoRoot, generationSchemaV2PacketPath),
      aiPromptContractV2: rel(repoRoot, aiPromptContractV2Path),
      aiPromptContractV2Packet: rel(repoRoot, aiPromptContractV2PacketPath),
      contentQualityGatesV2: rel(repoRoot, contentQualityGatesV2Path),
      contentQualityGatesV2Packet: rel(repoRoot, contentQualityGatesV2PacketPath),
      reviewerWorkflowV2Packet: rel(repoRoot, reviewerWorkflowV2PacketPath),
      targetPackManifestV2: rel(repoRoot, targetPackManifestV2Path),
      targetPackManifestV2Packet: rel(repoRoot, targetPackManifestV2PacketPath),
      runtimeServerDeliveryContractV2: rel(repoRoot, runtimeServerDeliveryContractV2Path),
      runtimeServerDeliveryContractV2Packet: rel(repoRoot, runtimeServerDeliveryContractV2PacketPath),
      storageCloudTargetMapV2: rel(repoRoot, storageCloudTargetMapV2Path),
      storageCloudTargetMapV2Packet: rel(repoRoot, storageCloudTargetMapV2PacketPath),
      adminReviewerDeliverySurfaceV2: rel(repoRoot, adminReviewerDeliverySurfaceV2Path),
      adminReviewerDeliverySurfaceV2Packet: rel(repoRoot, adminReviewerDeliverySurfaceV2PacketPath),
      reviewerDecisionImportV2DryRun: rel(repoRoot, reviewerDecisionImportV2DryRunPath),
      payloadShardMaterializationChecksumV2Packet: rel(repoRoot, payloadShardMaterializationChecksumV2Path),
      serverDeliveryManifestPreviewV2Packet: rel(repoRoot, serverDeliveryManifestPreviewV2Path),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, runtimeCacheIntegrityRollbackV2Path),
      reviewerDecisionImportOpeningPreflightV2Packet: rel(repoRoot, reviewerDecisionImportOpeningPreflightV2Path),
      llmOfficialSourceReviewIntakeV2Packet: rel(repoRoot, llmOfficialSourceReviewIntakeV2Path),
      reviewerDecisionImportExecutionGateV2Packet: rel(repoRoot, reviewerDecisionImportExecutionGateV2Path),
      officialSourcePromotedRowDecisionsV2: rel(repoRoot, officialSourcePromotedRowDecisionsV2Path),
      officialSourcePromotedAiDecisionsV2: rel(repoRoot, officialSourcePromotedAiDecisionsV2Path),
      llmOfficialSourceDecisionMaterializationV2Packet: rel(repoRoot, llmOfficialSourceDecisionMaterializationV2Path),
      llmOfficialSourceDecisionDryRunV2Packet: rel(repoRoot, llmOfficialSourceDecisionDryRunV2Path),
      llmOfficialSourceDecisionPromotionPreflightV2Packet: rel(repoRoot, llmOfficialSourceDecisionPromotionPreflightV2Path),
      llmOfficialSourcePromotedDecisionFileGenerationV2Packet: rel(repoRoot, llmOfficialSourcePromotedDecisionFileGenerationV2Path),
      payloadCreationApprovalPreflightV2Packet: rel(repoRoot, payloadCreationApprovalPreflightV2Path),
      closedLocalPayloadMaterializationV2Packet: rel(repoRoot, closedLocalPayloadMaterializationV2Path),
      serverDeliveryPublishPreflightV2Packet: rel(repoRoot, serverDeliveryPublishPreflightV2Path),
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, adminServerDeliveryRuntimePreflightV2Path),
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, runtimeActivationBlockerPlanV2Path),
      explicitApprovalReceiptHashLockGateV2Packet: rel(repoRoot, explicitApprovalReceiptHashLockGateV2Path),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, activationApprovalRequestPresentationV2Path),
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, explicitApprovalReceiptCreationGateV2Path),
      productionApplyAbsenceDenialGateV2Packet: rel(repoRoot, productionApplyAbsenceDenialGateV2Path),
      nonproductionBlockerClosurePlanV2Packet: rel(repoRoot, nonproductionBlockerClosurePlanV2Path),
      nonproductionEvidenceRefreshV2Packet: rel(repoRoot, nonproductionEvidenceRefreshV2Path),
      runtimeServerManifestConsistencyRecheckV2Packet: rel(repoRoot, runtimeServerManifestConsistencyRecheckV2Path),
      languageIsolationRegressionRecheckV2Packet: rel(repoRoot, languageIsolationRegressionRecheckV2Path),
      readinessApplyBlockerMapRefreshV2Packet: rel(repoRoot, readinessApplyBlockerMapRefreshV2Path),
      masterNextPassConsistencyRefreshV2Packet: rel(repoRoot, masterNextPassConsistencyRefreshV2Path),
      officialSourceContentCoverageV2Packet: rel(repoRoot, officialSourceContentCoverageV2Path),
    },
    outputs: {
      nextPassGoalContractJson: rel(repoRoot, outJson),
      nextPassGoalContractMd: rel(repoRoot, outMd),
      nextLargePassPlanMd: rel(repoRoot, nextPlanMd),
    },
    summary: {
      triggerPhrases: triggers.length,
      contractRules: rules.length,
      nextPassLargeGoals: goals.length,
      nextPassPrepared: goals.length > 0 && blockers === 0,
      currentPassMustBeLarge: true,
      mustRunVerificationBeforeFinal: true,
      mustPrepareNextPlanBeforeFinal: true,
      productionWritesAllowed: false,
      applyApprovalCreated: false,
      researchPackPresent,
      researchPackVerified,
      readyForPedagogyBlueprint,
      pedagogyBlueprintPresent,
      pedagogyBlueprintReady,
      readyForGenerationSchemaV2,
      generationSchemaV2Present,
      generationSchemaV2Ready,
      readyForAiPromptContractV2,
      aiPromptContractV2Present,
      aiPromptContractV2Ready,
      readyForContentQualityGatesV2,
      contentQualityGatesV2Present,
      contentQualityGatesV2Ready,
      readyForReviewerWorkflowV2,
      reviewerWorkflowV2Present,
      reviewerWorkflowV2Ready,
      readyForLlmOfficialSourceReviewV2,
      readyForBrainGateV2,
      targetPackManifestV2Present,
      targetPackManifestV2Ready,
      readyForRuntimeServerDeliveryContractV2,
      runtimeServerDeliveryContractV2Present,
      runtimeServerDeliveryContractV2Ready,
      readyForStorageCloudTargetMapV2,
      storageCloudTargetMapV2Present,
      storageCloudTargetMapV2Ready,
      readyForAdminPackDeliverySurfaceV2,
      adminReviewerDeliverySurfaceV2Present,
      adminReviewerDeliverySurfaceV2Ready,
      readyForReviewerDecisionImportV2DryRun,
      reviewerDecisionImportV2DryRunPresent,
      reviewerDecisionImportV2DryRunReady,
      officialSourceImportDryRunV2Present,
      officialSourceImportDryRunV2Ready,
      officialSourceImportDryRunV2Rows,
      officialSourceImportDryRunV2Ai,
      officialSourceImportDryRunV2AcceptedRows,
      officialSourceImportDryRunV2AcceptedAi,
      officialSourceImportDryRunV2PromotedRowFileUsed,
      officialSourceImportDryRunV2PromotedAiFileUsed,
      officialSourceImportDryRunV2ReadyForExecutionGateRefresh,
      officialSourceImportDryRunV2ReadyForApply,
      officialSourceImportDryRunV2MayModifyProductionAppFiles,
      officialSourceImportDryRunV2RowProbesPassed,
      officialSourceImportDryRunV2RowProbes,
      officialSourceImportDryRunV2AiProbesPassed,
      officialSourceImportDryRunV2AiProbes,
      readyForPayloadShardMaterializationGate,
      payloadShardMaterializationChecksumV2Present,
      payloadShardMaterializationChecksumV2Ready,
      readyForServerManifestPreviewGate,
      serverDeliveryManifestPreviewV2Present,
      serverDeliveryManifestPreviewV2Ready,
      readyForRuntimeCacheIntegrityGate,
      runtimeCacheIntegrityRollbackV2Present,
      runtimeCacheIntegrityRollbackV2Ready,
      readyForReviewerDecisionImportOpeningGate,
      reviewerDecisionImportOpeningPreflightV2Present,
      reviewerDecisionImportOpeningPreflightV2Ready,
      reviewerDecisionImportExecutionGateReady,
      readyForPayloadCreationApprovalPreflight,
      llmOfficialSourceReviewIntakeV2Present,
      llmOfficialSourceReviewIntakeV2Ready,
      llmOfficialSourceReviewIntakeV2State,
      llmOfficialSourceReviewIntakeV2RowCoveragePct,
      llmOfficialSourceReviewIntakeV2AiCoveragePct,
      readyForReviewerDecisionImportExecutionGate,
      reviewerDecisionImportExecutionGateV2Present,
      reviewerDecisionImportExecutionGateV2Ready,
      reviewerDecisionImportExecutionGateV2State,
      reviewerDecisionImportExecutionGateV2WouldRun,
      officialSourceImportExecutionGateV2Ready,
      officialSourceImportExecutionGateV2State,
      officialSourceImportExecutionGateV2WouldRun,
      officialSourceImportExecutionGateV2P13CoverageReady,
      officialSourceImportExecutionGateV2PromotedRowFileUsed,
      officialSourceImportExecutionGateV2PromotedAiFileUsed,
      officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight,
      officialSourceImportExecutionGateV2ReadyForApply,
      officialSourceImportExecutionGateV2MayModifyProductionAppFiles,
      officialSourceImportExecutionGateV2FixtureProbesPassed,
      officialSourceImportExecutionGateV2FixtureProbes,
      llmOfficialSourceDecisionMaterializationV2Present,
      llmOfficialSourceDecisionMaterializationV2Ready,
      llmOfficialSourceDecisionMaterializationV2State,
      llmOfficialSourceDecisionMaterializationV2ReadyForDryRun,
      llmOfficialSourceDecisionDryRunV2Present,
      llmOfficialSourceDecisionDryRunV2Ready,
      llmOfficialSourceDecisionDryRunV2State,
      llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight,
      llmOfficialSourceDecisionPromotionPreflightV2Present,
      llmOfficialSourceDecisionPromotionPreflightV2Ready,
      llmOfficialSourceDecisionPromotionPreflightV2State,
      llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration,
      llmOfficialSourcePromotedDecisionFileGenerationV2Present,
      llmOfficialSourcePromotedDecisionFileGenerationV2Ready,
      llmOfficialSourcePromotedDecisionFileGenerationV2State,
      llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRows,
      llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAi,
      llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh,
      readyForPayloadCreationApprovalPreflightV2,
      payloadCreationApprovalPreflightV2Present,
      payloadCreationApprovalPreflightV2Ready,
      payloadCreationApprovalPreflightV2State,
      payloadCreationApprovalPreflightV2HashChecksPassed,
      payloadCreationApprovalPreflightV2HashChecks,
      payloadCreationApprovalPreflightV2FixtureProbesPassed,
      payloadCreationApprovalPreflightV2FixtureProbes,
      readyForClosedPayloadMaterializationV2,
      closedLocalPayloadMaterializationV2Present,
      closedLocalPayloadMaterializationV2Ready,
      closedLocalPayloadMaterializationV2State,
      closedLocalPayloadMaterializationV2RuntimeSlices,
      closedLocalPayloadMaterializationV2PayloadEntries,
      closedLocalPayloadMaterializationV2PayloadBytes,
      closedLocalPayloadMaterializationV2ChecksumMismatches,
      closedLocalPayloadMaterializationV2FixtureProbesPassed,
      closedLocalPayloadMaterializationV2FixtureProbes,
      readyForServerDeliveryPublishPreflightV2,
      serverDeliveryPublishPreflightV2Present,
      serverDeliveryPublishPreflightV2Ready,
      serverDeliveryPublishPreflightV2State,
      serverDeliveryPublishPreflightV2ManifestEntries,
      serverDeliveryPublishPreflightV2ActualShaEntries,
      serverDeliveryPublishPreflightV2ActualByteSizeEntries,
      serverDeliveryPublishPreflightV2ChecksumMismatches,
      serverDeliveryPublishPreflightV2FixtureProbesPassed,
      serverDeliveryPublishPreflightV2FixtureProbes,
      readyForAdminServerDeliveryReviewV2,
      adminServerDeliveryRuntimePreflightV2Present,
      adminServerDeliveryRuntimePreflightV2Ready,
      adminServerDeliveryRuntimePreflightV2State,
      adminServerDeliveryRuntimePreflightV2ManifestEntries,
      adminServerDeliveryRuntimePreflightV2AdminReady,
      adminServerDeliveryRuntimePreflightV2RuntimeReady,
      adminServerDeliveryRuntimePreflightV2StorageReady,
      adminServerDeliveryRuntimePreflightV2FixtureProbesPassed,
      adminServerDeliveryRuntimePreflightV2FixtureProbes,
      readyForRuntimeActivationBlockerPlanningV2,
      runtimeActivationBlockerPlanV2Present,
      runtimeActivationBlockerPlanV2Ready,
      runtimeActivationBlockerPlanV2State,
      runtimeActivationBlockerPlanV2PlanItems,
      runtimeActivationBlockerPlanV2PlannedTouches,
      runtimeActivationBlockerPlanV2ReadinessApplyBlockers,
      runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps,
      runtimeActivationBlockerPlanV2FixtureProbesPassed,
      runtimeActivationBlockerPlanV2FixtureProbes,
      readyForExplicitApprovalReceiptGateV2,
      explicitApprovalReceiptHashLockGateV2Present,
      explicitApprovalReceiptHashLockGateV2Ready,
      explicitApprovalReceiptHashLockGateV2State,
      explicitApprovalReceiptHashLockGateV2CriticalHashLocks,
      explicitApprovalReceiptHashLockGateV2DirtyFiles,
      explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles,
      explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists,
      explicitApprovalReceiptHashLockGateV2ActiveHashLockExists,
      explicitApprovalReceiptHashLockGateV2FixtureProbesPassed,
      explicitApprovalReceiptHashLockGateV2FixtureProbes,
      readyForApprovalRequestPresentationV2,
      activationApprovalRequestPresentationV2Present,
      activationApprovalRequestPresentationV2Ready,
      activationApprovalRequestPresentationV2State,
      activationApprovalRequestPresentationV2CriticalHashLocks,
      activationApprovalRequestPresentationV2DirtyFiles,
      activationApprovalRequestPresentationV2ActiveApprovalReceiptExists,
      activationApprovalRequestPresentationV2ActiveHashLockExists,
      activationApprovalRequestPresentationV2FixtureProbesPassed,
      activationApprovalRequestPresentationV2FixtureProbes,
      readyForExplicitApprovalReceiptCreationGateV2,
      explicitApprovalReceiptCreationGateV2Present,
      explicitApprovalReceiptCreationGateV2SafeHoldReady,
      explicitApprovalReceiptCreationGateV2State,
      explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent,
      explicitApprovalReceiptCreationGateV2PlainContinueRejected,
      explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated,
      explicitApprovalReceiptCreationGateV2ActiveHashLockCreated,
      explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit,
      explicitApprovalReceiptCreationGateV2FixtureProbesPassed,
      explicitApprovalReceiptCreationGateV2FixtureProbes,
      readyForApprovalHoldContinuationV2,
      readyForProductionApplyAbsenceDenialGateV2,
      productionApplyAbsenceDenialGateV2Present,
      productionApplyAbsenceDenialGateV2SafeHoldReady,
      productionApplyAbsenceDenialGateV2State,
      productionApplyAbsenceDenialGateV2ApplyDenied,
      productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists,
      productionApplyAbsenceDenialGateV2ActiveHashLockExists,
      productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit,
      productionApplyAbsenceDenialGateV2FixtureProbesPassed,
      productionApplyAbsenceDenialGateV2FixtureProbes,
      readyForNonProductionContinuationAfterApplyDenialV2,
      nonproductionBlockerClosurePlanV2Present,
      nonproductionBlockerClosurePlanV2Ready,
      nonproductionBlockerClosurePlanV2State,
      nonproductionBlockerClosurePlanV2ChainReady,
      nonproductionBlockerClosurePlanV2SafeItems,
      nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems,
      nonproductionBlockerClosurePlanV2ProductionLockedItems,
      nonproductionBlockerClosurePlanV2RecommendedNextSafeItem,
      nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass,
      nonproductionBlockerClosurePlanV2ReadyForApply,
      nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles,
      nonproductionBlockerClosurePlanV2FixtureProbesPassed,
      nonproductionBlockerClosurePlanV2FixtureProbes,
      nonproductionEvidenceRefreshV2Present,
      nonproductionEvidenceRefreshV2Ready,
      nonproductionEvidenceRefreshV2State,
      nonproductionEvidenceRefreshV2LegacyReviewResidueMatches,
      nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck,
      nonproductionEvidenceRefreshV2ReadyForApply,
      nonproductionEvidenceRefreshV2MayModifyProductionAppFiles,
      nonproductionEvidenceRefreshV2FixtureProbesPassed,
      nonproductionEvidenceRefreshV2FixtureProbes,
      runtimeServerManifestConsistencyRecheckV2Present,
      runtimeServerManifestConsistencyRecheckV2Ready,
      runtimeServerManifestConsistencyRecheckV2State,
      runtimeServerManifestConsistencyRecheckV2ManifestEntries,
      runtimeServerManifestConsistencyRecheckV2GateRefsCurrent,
      runtimeServerManifestConsistencyRecheckV2GateRefs,
      runtimeServerManifestConsistencyRecheckV2InputHashesCurrent,
      runtimeServerManifestConsistencyRecheckV2InputHashes,
      runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen,
      runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries,
      runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries,
      runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck,
      runtimeServerManifestConsistencyRecheckV2ReadyForApply,
      runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles,
      runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed,
      runtimeServerManifestConsistencyRecheckV2FixtureProbes,
      languageIsolationRegressionRecheckV2Present,
      languageIsolationRegressionRecheckV2Ready,
      languageIsolationRegressionRecheckV2State,
      languageIsolationRegressionRecheckV2ScannedRows,
      languageIsolationRegressionRecheckV2ScannedTargetFields,
      languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale,
      languageIsolationRegressionRecheckV2PromptEntrypointsExpected,
      languageIsolationRegressionRecheckV2ManifestEntries,
      languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh,
      languageIsolationRegressionRecheckV2ReadyForApply,
      languageIsolationRegressionRecheckV2MayModifyProductionAppFiles,
      languageIsolationRegressionRecheckV2FixtureProbesPassed,
      languageIsolationRegressionRecheckV2FixtureProbes,
      readinessApplyBlockerMapRefreshV2Present,
      readinessApplyBlockerMapRefreshV2Ready,
      readinessApplyBlockerMapRefreshV2State,
      readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers,
      readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers,
      readinessApplyBlockerMapRefreshV2SafeClosed,
      readinessApplyBlockerMapRefreshV2SafeRemaining,
      readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh,
      readinessApplyBlockerMapRefreshV2ReadyForApply,
      readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles,
      readinessApplyBlockerMapRefreshV2FixtureProbesPassed,
      readinessApplyBlockerMapRefreshV2FixtureProbes,
      masterNextPassConsistencyRefreshV2Present,
      masterNextPassConsistencyRefreshV2Ready,
      masterNextPassConsistencyRefreshV2State,
      masterNextPassConsistencyRefreshV2NextGoalId,
      masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage,
      masterNextPassConsistencyRefreshV2ReadyForApply,
      masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles,
      masterNextPassConsistencyRefreshV2FixtureProbesPassed,
      masterNextPassConsistencyRefreshV2FixtureProbes,
      officialSourceContentCoverageV2Present,
      officialSourceContentCoverageV2Ready,
      officialSourceContentCoverageV2State,
      officialSourceContentCoverageV2LedgerRows,
      officialSourceContentCoverageV2AcceptedRows,
      officialSourceContentCoverageV2AcceptedAi,
      officialSourceContentCoverageV2RowsWithSourceRefs,
      officialSourceContentCoverageV2RowsWithGatesPassed,
      officialSourceContentCoverageV2QuizRowsOneCorrect,
      officialSourceContentCoverageV2TrustedSourceIds,
      officialSourceContentCoverageV2ResearchPackCheckedOnlineAt,
      officialSourceContentCoverageV2ReadyForImportDryRunRefresh,
      officialSourceContentCoverageV2ReadyForApply,
      officialSourceContentCoverageV2MayModifyProductionAppFiles,
      officialSourceContentCoverageV2FixtureProbesPassed,
      officialSourceContentCoverageV2FixtureProbes,
      officialSourcePayloadCreationApprovalPreflightV2Ready,
      officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate,
      officialSourceClosedLocalPayloadMaterializationV2Ready,
      officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight,
      generationHistoryReconciled,
      appAtlasFreshEnoughForP2,
      domainRegistryV2Ready,
      readyForNextLargePass: goals.length > 0 && blockers === 0,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    triggerPhrases: triggers,
    contractRules: rules,
    currentPassCloseoutChecklist: checklist,
    nextPassGoals: goals,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');
  fs.writeFileSync(nextPlanMd, renderPlanMarkdown(report), 'utf8');

  console.log(`GUSTAV next pass goal contract packet: ${report.status}`);
  console.log(`Next pass large goals: ${report.summary.nextPassLargeGoals}`);
  console.log(`Next pass prepared: ${report.summary.nextPassPrepared ? 'yes' : 'no'}`);
  console.log(`Ready for next large pass: ${report.summary.readyForNextLargePass ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
