import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Finding = {
  severity: 'blocker' | 'warning' | 'info';
  code: string;
  message: string;
  path?: string;
};

type ArtifactEntry = {
  category: 'generated_lesson_ledger' | 'reviewer_artifact' | 'audit_artifact';
  kind: string;
  path: string;
  bytes: number;
  sha256: string;
};

type SourceReportEntry = {
  name: string;
  path: string;
  status: string;
  decision: string;
  bytes: number;
  sha256: string;
  summary: Record<string, unknown>;
};

type MasterManifest = {
  schemaVersion: 'gustav-french-reviewer-master-manifest-v0';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    generatedLessonLedgers: number;
    generatedRows: number;
    reviewerSourceFiles: number;
    reviewerSourceFilesByExtension: Record<string, number>;
    auditArtifactFiles: number;
    batchJsonlFiles: number;
    batchTsvFiles: number;
    queueRows: number;
    decisionTemplateRows: number;
    translationQaBlockers: number;
    generatedContentBlockers: number;
    runtimeContentIntegrityBlockers: number;
    runtimeContentIntegrityWarnings: number;
    runtimeContentIntegrityFilesScanned: number;
    runtimeContentIntegrityTextFieldsScanned: number;
    runtimeContentIntegrityPlaceholderTextFields: number;
    runtimeContentIntegrityMojibakeFields: number;
    runtimeContentIntegrityReplacementCharFields: number;
    runtimeContentIntegrityRuntimePayloadFiles: number;
    handoffIntegrityBlockers: number;
    batchFilesIntegrityBlockers: number;
    decisionTemplateIntegrityBlockers: number;
    decisionImportDryRunBlockers: number;
    starterNoopDryRunBlockers: number;
    fixtureQaBlockers: number;
    priorityAuditBlockers: number;
    priorityIntegrityBlockers: number;
    priorityBatchesBlockers: number;
    languageIsolationBlockers: number;
    languageIsolationWarnings: number;
    rowsMissingTargetLocale: number;
    reviewerExecutionWorkOrderBlockers: number;
    reviewStarterPackBlockers: number;
    reviewProgressBlockers: number;
    selfImprovingUpgradeBlockers: number;
    unresolvedCriticalWeaknesses: number;
    generationHistoryBlockers: number;
    generationHistoryWarnings: number;
    legacyGeneratedWithoutResearchPackRows: number;
    generatedRowsMissingResearchEvidenceIds: number;
    legacyGeneratedResearchEvidenceBridgeV2CoversLegacyResearchGaps: boolean;
    effectiveLegacyGeneratedWithoutResearchPackRows: number;
    effectiveGeneratedRowsMissingResearchEvidenceIds: number;
    appAtlasRefreshBlockers: number;
    appAtlasRefreshWarnings: number;
    appAtlasTargetSensitiveFiles: number;
    appAtlasUnclassifiedTargetSensitiveFiles: number;
    appAtlasAiPromptEntrypoints: number;
    domainRegistryV2Blockers: number;
    domainRegistryV2Warnings: number;
    domainRegistryV2Domains: number;
    domainRegistryV2AiPromptEntrypoints: number;
    domainRegistryV2AiPromptEntrypointsCovered: number;
    targetResearchPackBuilderBlockers: number;
    targetResearchPackBuilderWarnings: number;
    targetResearchPackVerifyBlockers: number;
    targetResearchPackVerifyWarnings: number;
    researchPackPresent: boolean;
    verifiedTrustedSources: number;
    verifiedGrammarClusters: number;
    researchPackFixtureProbesPassed: number;
    researchPackFixtureProbes: number;
    readyForPedagogyBlueprint: boolean;
    targetPedagogyBlueprintBlockers: number;
    targetPedagogyBlueprintWarnings: number;
    pedagogyBlueprintPresent: boolean;
    pedagogyBlueprintRowMappings: number;
    pedagogyBlueprintCategoryPolicies: number;
    pedagogyBlueprintAppDomainPolicies: number;
    pedagogyBlueprintFixtureProbesPassed: number;
    pedagogyBlueprintFixtureProbes: number;
    readyForGenerationSchemaV2: boolean;
    generationSchemaV2Blockers: number;
    generationSchemaV2Warnings: number;
    generationSchemaV2Present: boolean;
    generationSchemaV2RowRequirements: number;
    generationSchemaV2DomainContracts: number;
    generationSchemaV2FixtureProbesPassed: number;
    generationSchemaV2FixtureProbes: number;
    readyForAiPromptContractV2: boolean;
    aiPromptContractV2Blockers: number;
    aiPromptContractV2Warnings: number;
    aiPromptContractV2Present: boolean;
    aiPromptContractV2Entrypoints: number;
    aiPromptContractV2Domains: number;
    aiPromptContractV2RejectBeforeReturn: number;
    aiPromptContractV2RejectBeforeCache: number;
    aiPromptContractV2CriticalSurfaceClassesCovered: number;
    aiPromptContractV2CriticalSurfaceClassesExpected: number;
    aiPromptContractV2CriticalSurfaceContracts: number;
    aiPromptContractV2CriticalSurfaceLanguageDimensions: number;
    aiPromptContractV2CriticalSurfaceCacheContracts: number;
    aiPromptContractV2CriticalSurfaceRejectBeforeReturn: number;
    aiPromptContractV2CriticalSurfaceRejectBeforeCache: number;
    aiPromptContractV2CriticalSurfaceSafeFallback: number;
    aiPromptContractV2CriticalSurfaceGenerationBlocked: number;
    aiPromptContractV2CriticalSurfaceRequiredFilesCovered: number;
    aiPromptContractV2CriticalSurfaceRequiredFiles: number;
    aiPromptContractV2FixtureProbesPassed: number;
    aiPromptContractV2FixtureProbes: number;
    readyForContentQualityGatesV2: boolean;
    contentQualityGatesV2Blockers: number;
    contentQualityGatesV2Warnings: number;
    contentQualityGatesV2Present: boolean;
    contentQualityRowRequirements: number;
    contentQualityAiRequirements: number;
    contentQualityHighRiskAiRequirements: number;
    contentQualityFixtureProbesPassed: number;
    contentQualityFixtureProbes: number;
    readyForReviewerWorkflowV2: boolean;
    reviewerWorkflowV2Blockers: number;
    reviewerWorkflowV2Warnings: number;
    reviewerWorkflowV2Present: boolean;
    reviewerWorkflowV2RowTemplates: number;
    reviewerWorkflowV2AiTemplates: number;
    reviewerWorkflowV2HighRiskAiTemplates: number;
    reviewerWorkflowV2RowFixtureProbesPassed: number;
    reviewerWorkflowV2RowFixtureProbes: number;
    reviewerWorkflowV2AiFixtureProbesPassed: number;
    reviewerWorkflowV2AiFixtureProbes: number;
    readyForLlmOfficialSourceReviewV2: boolean;
    readyForDecisionImportV2: boolean;
    readyForBrainGateV2: boolean;
    targetPackManifestV2Blockers: number;
    targetPackManifestV2Warnings: number;
    targetPackManifestV2Present: boolean;
    targetPackManifestV2ProductionBlockers: number;
    targetPackManifestV2RuntimeSliceDrafts: number;
    targetPackManifestV2GateReports: number;
    targetPackManifestV2LessonRows: number;
    targetPackManifestV2AiDecisionSlots: number;
    readyForRuntimeServerDeliveryContractV2: boolean;
    runtimeServerDeliveryContractV2Blockers: number;
    runtimeServerDeliveryContractV2Warnings: number;
    runtimeServerDeliveryContractV2Present: boolean;
    runtimeServerDeliveryContractV2RequiredSlices: number;
    runtimeServerDeliveryContractV2CacheKeyContracts: number;
    runtimeServerDeliveryContractV2ProductionBlockers: number;
    runtimeServerDeliveryContractV2StartupImportsRuntime: boolean;
    runtimeServerDeliveryContractV2LoaderNetworkOrFsImports: boolean;
    runtimeServerDeliveryContractV2ServerUploadAllowed: boolean;
    runtimeServerDeliveryContractV2RuntimeDownloadsOpenFlags: number;
    readyForStorageCloudTargetMapV2: boolean;
    storageCloudTargetMapV2Blockers: number;
    storageCloudTargetMapV2Warnings: number;
    storageCloudTargetMapV2Present: boolean;
    storageCloudTargetMapV2TargetKeyDomains: number;
    storageCloudTargetMapV2ScopedFactories: number;
    storageCloudTargetMapV2FrenchSyncKeyRefs: number;
    storageCloudTargetMapV2TestedSurfaces: number;
    storageCloudTargetMapV2ProductionBlockers: number;
    storageCloudTargetMapV2StorageMigrationAllowed: boolean;
    storageCloudTargetMapV2CloudSyncMigrationAllowed: boolean;
    storageCloudTargetMapV2FirebaseWritesOpened: boolean;
    storageCloudTargetMapV2ReadyForApplyOpenFlags: number;
    readyForAdminPackDeliverySurfaceV2: boolean;
    adminReviewerDeliverySurfaceV2Blockers: number;
    adminReviewerDeliverySurfaceV2Warnings: number;
    adminReviewerDeliverySurfaceV2Present: boolean;
    adminReviewerDeliverySurfaceV2AdminSurfaceFiles: number;
    adminReviewerDeliverySurfaceV2ReviewerArtifacts: number;
    adminReviewerDeliverySurfaceV2RowDecisionRows: number;
    adminReviewerDeliverySurfaceV2AiDecisionRows: number;
    adminReviewerDeliverySurfaceV2RequiredApprovalFields: number;
    adminReviewerDeliverySurfaceV2RequiredAdminGates: number;
    adminReviewerDeliverySurfaceV2ProductionBlockers: number;
    adminReviewerDeliverySurfaceV2ServerUploadAllowed: boolean;
    adminReviewerDeliverySurfaceV2FirebaseUploadAllowed: boolean;
    adminReviewerDeliverySurfaceV2ReviewerImportAllowed: boolean;
    adminReviewerDeliverySurfaceV2RuntimeDownloadsEnabled: boolean;
    adminReviewerDeliverySurfaceV2ActivationApprovedFlags: number;
    adminReviewerDeliverySurfaceV2ReadyForApplyOpenFlags: number;
    readyForReviewerDecisionImportV2DryRun: boolean;
    reviewerDecisionImportV2DryRunBlockers: number;
    reviewerDecisionImportV2DryRunWarnings: number;
    reviewerDecisionImportV2DryRunPresent: boolean;
    reviewerDecisionImportV2DryRunRowDecisionRows: number;
    reviewerDecisionImportV2DryRunAiDecisionRows: number;
    reviewerDecisionImportV2DryRunReviewedRowDecisions: number;
    reviewerDecisionImportV2DryRunReviewedAiDecisions: number;
    reviewerDecisionImportV2DryRunRowNoOpRows: number;
    reviewerDecisionImportV2DryRunAiNoOpRows: number;
    reviewerDecisionImportV2DryRunRowProbesPassed: number;
    reviewerDecisionImportV2DryRunRowProbes: number;
    reviewerDecisionImportV2DryRunAiProbesPassed: number;
    reviewerDecisionImportV2DryRunAiProbes: number;
    reviewerDecisionImportV2DryRunReviewerImportOpenFlags: number;
    reviewerDecisionImportV2DryRunProductionApplyOpenFlags: number;
    reviewerDecisionImportV2DryRunActivationApprovedFlags: number;
    reviewerDecisionImportV2DryRunGeneratedLedgerWrites: boolean;
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
    payloadShardMaterializationChecksumV2Blockers: number;
    payloadShardMaterializationChecksumV2Warnings: number;
    payloadShardMaterializationChecksumV2Present: boolean;
    payloadShardMaterializationChecksumV2RuntimeSlices: number;
    payloadShardMaterializationChecksumV2ExpectedRuntimeSlices: number;
    payloadShardMaterializationChecksumV2MaterializationContracts: number;
    payloadShardMaterializationChecksumV2ManifestIdentityContracts: number;
    payloadShardMaterializationChecksumV2ChecksumContracts: number;
    payloadShardMaterializationChecksumV2ChecksumContractsWithSha256Dimension: number;
    payloadShardMaterializationChecksumV2CacheKeyContractsWithSha256: number;
    payloadShardMaterializationChecksumV2ServerPathPreviewsWithSha256: number;
    payloadShardMaterializationChecksumV2SourceLocaleScopedFuturePaths: number;
    payloadShardMaterializationChecksumV2UiLocaleIdentityDimensions: number;
    payloadShardMaterializationChecksumV2FutureArtifactFilesPresent: number;
    payloadShardMaterializationChecksumV2PreExistingLocalMaterializationAccounted: boolean;
    payloadShardMaterializationChecksumV2UnaccountedFutureArtifactFilesPresent: number;
    payloadShardMaterializationChecksumV2PayloadShardsCreated: number;
    payloadShardMaterializationChecksumV2ChecksumReportsCreated: number;
    payloadShardMaterializationChecksumV2ServerUploadAllowed: boolean;
    payloadShardMaterializationChecksumV2FirebaseUploadAllowed: boolean;
    payloadShardMaterializationChecksumV2RuntimeDownloadsEnabled: boolean;
    payloadShardMaterializationChecksumV2ActivationApprovedFlags: number;
    payloadShardMaterializationChecksumV2FixtureProbesPassed: number;
    payloadShardMaterializationChecksumV2FixtureProbes: number;
    readyForServerManifestPreviewGate: boolean;
    serverDeliveryManifestPreviewV2Blockers: number;
    serverDeliveryManifestPreviewV2Warnings: number;
    serverDeliveryManifestPreviewV2Present: boolean;
    serverDeliveryManifestPreviewV2PreviewEntries: number;
    serverDeliveryManifestPreviewV2ExpectedPreviewEntries: number;
    serverDeliveryManifestPreviewV2EntriesWithGateReportRefs: number;
    serverDeliveryManifestPreviewV2GateReportRefsPerEntryMin: number;
    serverDeliveryManifestPreviewV2GateReportRefsTotal: number;
    serverDeliveryManifestPreviewV2GateReportRefsCurrentSha: number;
    serverDeliveryManifestPreviewV2SourceManifestGateRefHashDrifts: number;
    serverDeliveryManifestPreviewV2EntriesWithRollbackFromVersion: number;
    serverDeliveryManifestPreviewV2EntriesWithActivationApprovedFalse: number;
    serverDeliveryManifestPreviewV2EntriesWithSha256Placeholder: number;
    serverDeliveryManifestPreviewV2EntriesWithByteSizePlaceholder: number;
    serverDeliveryManifestPreviewV2EntriesWithChecksumLinkage: number;
    serverDeliveryManifestPreviewV2SourceLocaleScopedServerPaths: number;
    serverDeliveryManifestPreviewV2UiLocaleIdentityDimensions: number;
    serverDeliveryManifestPreviewV2ServerUploadAllowed: boolean;
    serverDeliveryManifestPreviewV2FirebaseUploadAllowed: boolean;
    serverDeliveryManifestPreviewV2RuntimeDownloadsEnabled: boolean;
    serverDeliveryManifestPreviewV2EmbeddedIndexInsertionAllowed: boolean;
    serverDeliveryManifestPreviewV2ActivationApprovedFlags: number;
    serverDeliveryManifestPreviewV2FixtureProbesPassed: number;
    serverDeliveryManifestPreviewV2FixtureProbes: number;
    readyForRuntimeCacheIntegrityGate: boolean;
    runtimeCacheIntegrityRollbackV2Blockers: number;
    runtimeCacheIntegrityRollbackV2Warnings: number;
    runtimeCacheIntegrityRollbackV2Present: boolean;
    runtimeCacheIntegrityRollbackV2CacheStates: number;
    runtimeCacheIntegrityRollbackV2PreviewEntries: number;
    runtimeCacheIntegrityRollbackV2CacheIntegrityContracts: number;
    runtimeCacheIntegrityRollbackV2CacheKeyDimensionContracts: number;
    runtimeCacheIntegrityRollbackV2ReadyStateBlockedContracts: number;
    runtimeCacheIntegrityRollbackV2CacheWriteBlockedContracts: number;
    runtimeCacheIntegrityRollbackV2RuntimeDownloadBlockedContracts: number;
    runtimeCacheIntegrityRollbackV2ChecksumMismatchQuarantineContracts: number;
    runtimeCacheIntegrityRollbackV2ByteSizeMismatchQuarantineContracts: number;
    runtimeCacheIntegrityRollbackV2SourceLocaleMismatchRejectContracts: number;
    runtimeCacheIntegrityRollbackV2StudyTargetMismatchRejectContracts: number;
    runtimeCacheIntegrityRollbackV2StaleVersionContracts: number;
    runtimeCacheIntegrityRollbackV2OfflineFallbackRequiresPriorVersionContracts: number;
    runtimeCacheIntegrityRollbackV2RollbackSimulationContracts: number;
    runtimeCacheIntegrityRollbackV2UiLocaleIdentityDimensions: number;
    runtimeCacheIntegrityRollbackV2RuntimeDownloadsEnabled: boolean;
    runtimeCacheIntegrityRollbackV2CacheWritesOpened: boolean;
    runtimeCacheIntegrityRollbackV2ReadyCacheStateOpened: boolean;
    runtimeCacheIntegrityRollbackV2ServerUploadAllowed: boolean;
    runtimeCacheIntegrityRollbackV2ActivationApprovedFlags: number;
    runtimeCacheIntegrityRollbackV2FixtureProbesPassed: number;
    runtimeCacheIntegrityRollbackV2FixtureProbes: number;
    readyForReviewerDecisionImportOpeningGate: boolean;
    reviewerDecisionImportOpeningPreflightV2Blockers: number;
    reviewerDecisionImportOpeningPreflightV2Warnings: number;
    reviewerDecisionImportOpeningPreflightV2Present: boolean;
    reviewerDecisionImportOpeningPreflightV2OpeningState: string;
    reviewerDecisionImportOpeningPreflightV2OpeningEligible: boolean;
    reviewerDecisionImportOpeningPreflightV2RowDecisionRows: number;
    reviewerDecisionImportOpeningPreflightV2AiDecisionRows: number;
    reviewerDecisionImportOpeningPreflightV2ReviewedRowDecisions: number;
    reviewerDecisionImportOpeningPreflightV2ReviewedAiDecisions: number;
    reviewerDecisionImportOpeningPreflightV2BlankRowDecisions: number;
    reviewerDecisionImportOpeningPreflightV2BlankAiDecisions: number;
    reviewerDecisionImportOpeningPreflightV2ReviewerImportAllowedNow: boolean;
    reviewerDecisionImportOpeningPreflightV2ExecutionGateReady: boolean;
    reviewerDecisionImportOpeningPreflightV2PayloadCreationApprovalPreflightReady: boolean;
    reviewerDecisionImportOpeningPreflightV2FixtureProbesPassed: number;
    reviewerDecisionImportOpeningPreflightV2FixtureProbes: number;
    readyForReviewerDecisionImportOpeningPreflight: boolean;
    llmOfficialSourceReviewIntakeV2Blockers: number;
    llmOfficialSourceReviewIntakeV2Warnings: number;
    llmOfficialSourceReviewIntakeV2Present: boolean;
    llmOfficialSourceReviewIntakeV2State: string;
    llmOfficialSourceReviewIntakeV2RowDecisionRows: number;
    llmOfficialSourceReviewIntakeV2AiDecisionRows: number;
    llmOfficialSourceReviewIntakeV2ReviewedRowDecisions: number;
    llmOfficialSourceReviewIntakeV2ReviewedAiDecisions: number;
    llmOfficialSourceReviewIntakeV2AcceptedRowDecisions: number;
    llmOfficialSourceReviewIntakeV2AcceptedAiDecisions: number;
    llmOfficialSourceReviewIntakeV2BlankRowDecisions: number;
    llmOfficialSourceReviewIntakeV2BlankAiDecisions: number;
    llmOfficialSourceReviewIntakeV2RowCoveragePct: number;
    llmOfficialSourceReviewIntakeV2AiCoveragePct: number;
    llmOfficialSourceReviewIntakeV2LessonCoverageBuckets: number;
    llmOfficialSourceReviewIntakeV2BatchCoverageBuckets: number;
    llmOfficialSourceReviewIntakeV2GateCoverageBuckets: number;
    llmOfficialSourceReviewIntakeV2AiDomainCoverageBuckets: number;
    llmOfficialSourceReviewIntakeV2ReviewerImportAllowedNow: boolean;
    llmOfficialSourceReviewIntakeV2ExecutionGateReady: boolean;
    llmOfficialSourceReviewIntakeV2PayloadCreationApprovalPreflightReady: boolean;
    llmOfficialSourceReviewIntakeV2FixtureProbesPassed: number;
    llmOfficialSourceReviewIntakeV2FixtureProbes: number;
    readyForLlmOfficialSourceReviewIntake: boolean;
    readyForReviewerDecisionImportExecutionGate: boolean;
    reviewerDecisionImportExecutionGateV2Blockers: number;
    reviewerDecisionImportExecutionGateV2Warnings: number;
    reviewerDecisionImportExecutionGateV2Present: boolean;
    reviewerDecisionImportExecutionGateV2State: string;
    reviewerDecisionImportExecutionGateV2WouldRun: boolean;
    reviewerDecisionImportExecutionGateV2ReviewedRowDecisions: number;
    reviewerDecisionImportExecutionGateV2ReviewedAiDecisions: number;
    reviewerDecisionImportExecutionGateV2AcceptedRowDecisions: number;
    reviewerDecisionImportExecutionGateV2AcceptedAiDecisions: number;
    reviewerDecisionImportExecutionGateV2UpstreamCountsConsistent: boolean;
    reviewerDecisionImportExecutionGateV2PayloadCreationApprovalPreflightReady: boolean;
    reviewerDecisionImportExecutionGateV2FixtureProbesPassed: number;
    reviewerDecisionImportExecutionGateV2FixtureProbes: number;
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
    llmOfficialSourceDecisionMaterializationV2Blockers: number;
    llmOfficialSourceDecisionMaterializationV2Warnings: number;
    llmOfficialSourceDecisionMaterializationV2Present: boolean;
    llmOfficialSourceDecisionMaterializationV2State: string;
    llmOfficialSourceDecisionMaterializationV2RowDecisionRows: number;
    llmOfficialSourceDecisionMaterializationV2AiDecisionRows: number;
    llmOfficialSourceDecisionMaterializationV2CurrentReviewedRowDecisions: number;
    llmOfficialSourceDecisionMaterializationV2CurrentReviewedAiDecisions: number;
    llmOfficialSourceDecisionMaterializationV2NonLlmReviewDependencyRequired: boolean;
    llmOfficialSourceDecisionMaterializationV2ReadyForDryRun: boolean;
    llmOfficialSourceDecisionMaterializationV2FixtureProbesPassed: number;
    llmOfficialSourceDecisionMaterializationV2FixtureProbes: number;
    llmOfficialSourceDecisionDryRunV2Blockers: number;
    llmOfficialSourceDecisionDryRunV2Warnings: number;
    llmOfficialSourceDecisionDryRunV2Present: boolean;
    llmOfficialSourceDecisionDryRunV2State: string;
    llmOfficialSourceDecisionDryRunV2RowCandidateProposals: number;
    llmOfficialSourceDecisionDryRunV2AiCandidateProposals: number;
    llmOfficialSourceDecisionDryRunV2PendingRowCandidates: number;
    llmOfficialSourceDecisionDryRunV2PendingAiCandidates: number;
    llmOfficialSourceDecisionDryRunV2AcceptedRowCandidates: number;
    llmOfficialSourceDecisionDryRunV2AcceptedAiCandidates: number;
    llmOfficialSourceDecisionDryRunV2ProposalFilesWritten: number;
    llmOfficialSourceDecisionDryRunV2CandidateWritesConfined: boolean;
    llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight: boolean;
    llmOfficialSourceDecisionDryRunV2FixtureProbesPassed: number;
    llmOfficialSourceDecisionDryRunV2FixtureProbes: number;
    llmOfficialSourceDecisionPromotionPreflightV2Blockers: number;
    llmOfficialSourceDecisionPromotionPreflightV2Warnings: number;
    llmOfficialSourceDecisionPromotionPreflightV2Present: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2State: string;
    llmOfficialSourceDecisionPromotionPreflightV2RowCandidateProposals: number;
    llmOfficialSourceDecisionPromotionPreflightV2AiCandidateProposals: number;
    llmOfficialSourceDecisionPromotionPreflightV2AcceptedRowCandidates: number;
    llmOfficialSourceDecisionPromotionPreflightV2AcceptedAiCandidates: number;
    llmOfficialSourceDecisionPromotionPreflightV2PromotedDecisionFilesWritten: number;
    llmOfficialSourceDecisionPromotionPreflightV2FutureTargetsConfined: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2FutureRowTargetSeparate: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2FutureAiTargetSeparate: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration: boolean;
    llmOfficialSourceDecisionPromotionPreflightV2FixtureProbesPassed: number;
    llmOfficialSourceDecisionPromotionPreflightV2FixtureProbes: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2Blockers: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2Warnings: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2Present: boolean;
    llmOfficialSourcePromotedDecisionFileGenerationV2State: string;
    llmOfficialSourcePromotedDecisionFileGenerationV2RowDecisionRowsBuilt: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2AiDecisionRowsBuilt: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRowDecisions: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2RowsWithEvidenceNotes: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2AiWithEvidenceNotes: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2OpenFlags: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2OutputTargetsConfined: boolean;
    llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh: boolean;
    llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractReady: boolean;
    llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractEntrypoints: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractUniqueIds: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractCriticalContracts: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiUniqueContractIds: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDuplicateContractIds: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMatchedToPromptContracts: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiExtraContracts: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMissingContracts: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContracts: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContractsMatched: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDomainMatchedToPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFilePathMatchedToPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFeatureRiskClassMatchedToPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRiskLevelMatchedToPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetLocaleMatchedToPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiSourceLocalesMatchedToPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCacheDimensionsMatchedToPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageGatePassed: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshReturnClosedByPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshCacheClosedByPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetOutputBeforeQualityClosedByPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageFallbackClosedByPromptContract: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes: number;
    legacyGeneratedResearchEvidenceBridgeV2Blockers: number;
    legacyGeneratedResearchEvidenceBridgeV2Warnings: number;
    legacyGeneratedResearchEvidenceBridgeV2Present: boolean;
    legacyGeneratedResearchEvidenceBridgeV2State: string;
    legacyGeneratedResearchEvidenceBridgeV2Ready: boolean;
    legacyGeneratedResearchEvidenceBridgeV2LegacyRows: number;
    legacyGeneratedResearchEvidenceBridgeV2PromotedRows: number;
    legacyGeneratedResearchEvidenceBridgeV2RowIdentityMatched: number;
    legacyGeneratedResearchEvidenceBridgeV2RowsWithResearchEvidenceIds: number;
    legacyGeneratedResearchEvidenceBridgeV2RowsWithAllRequiredGatesPassed: number;
    legacyGeneratedResearchEvidenceBridgeV2AiDecisions: number;
    legacyGeneratedResearchEvidenceBridgeV2HighRiskAiDecisions: number;
    legacyGeneratedResearchEvidenceBridgeV2HighRiskAiWithResearchGate: number;
    legacyGeneratedResearchEvidenceBridgeV2AiLanguageGatesPassed: number;
    legacyGeneratedResearchEvidenceBridgeV2AiWithOfficialSourceNotes: number;
    legacyGeneratedResearchEvidenceBridgeV2DryRunReady: boolean;
    legacyGeneratedResearchEvidenceBridgeV2FixtureProbesPassed: number;
    legacyGeneratedResearchEvidenceBridgeV2FixtureProbes: number;
    legacyGeneratedResearchEvidenceBridgeV2ReadyForApply: boolean;
    legacyGeneratedResearchEvidenceBridgeV2MayModifyProductionAppFiles: boolean;
    readyForPayloadCreationApprovalPreflightV2: boolean;
    payloadCreationApprovalPreflightV2Blockers: number;
    payloadCreationApprovalPreflightV2Warnings: number;
    payloadCreationApprovalPreflightV2Present: boolean;
    payloadCreationApprovalPreflightV2State: string;
    payloadCreationApprovalPreflightV2ReadyForClosedPayloadMaterialization: boolean;
    payloadCreationApprovalPreflightV2HashChecksPassed: number;
    payloadCreationApprovalPreflightV2HashChecks: number;
    payloadCreationApprovalPreflightV2FixtureProbesPassed: number;
    payloadCreationApprovalPreflightV2FixtureProbes: number;
    payloadCreationApprovalPreflightV2ReadyForApply: boolean;
    closedLocalPayloadMaterializationV2Blockers: number;
    closedLocalPayloadMaterializationV2Warnings: number;
    closedLocalPayloadMaterializationV2Present: boolean;
    closedLocalPayloadMaterializationV2State: string;
    closedLocalPayloadMaterializationV2RuntimeSlices: number;
    closedLocalPayloadMaterializationV2PayloadEntries: number;
    closedLocalPayloadMaterializationV2PayloadBytes: number;
    closedLocalPayloadMaterializationV2ChecksumMismatches: number;
    closedLocalPayloadMaterializationV2ReadyForServerDeliveryPublishPreflight: boolean;
    closedLocalPayloadMaterializationV2FixtureProbesPassed: number;
    closedLocalPayloadMaterializationV2FixtureProbes: number;
    closedLocalPayloadMaterializationV2ReadyForApply: boolean;
    serverDeliveryPublishPreflightV2Blockers: number;
    serverDeliveryPublishPreflightV2Warnings: number;
    serverDeliveryPublishPreflightV2Present: boolean;
    serverDeliveryPublishPreflightV2State: string;
    serverDeliveryPublishPreflightV2ManifestEntries: number;
    serverDeliveryPublishPreflightV2ActualShaEntries: number;
    serverDeliveryPublishPreflightV2ActualByteSizeEntries: number;
    serverDeliveryPublishPreflightV2ChecksumMismatches: number;
    serverDeliveryPublishPreflightV2ReadyForAdminServerDeliveryReview: boolean;
    serverDeliveryPublishPreflightV2FixtureProbesPassed: number;
    serverDeliveryPublishPreflightV2FixtureProbes: number;
    serverDeliveryPublishPreflightV2ReadyForApply: boolean;
    productionServerManifestPublishGateV2Blockers: number;
    productionServerManifestPublishGateV2Warnings: number;
    productionServerManifestPublishGateV2Present: boolean;
    productionServerManifestPublishGateV2State: string;
    productionServerManifestPublishGateV2ReadyForRuntimeDownloadActivation: boolean;
    productionServerManifestPublishGateV2FixtureProbesPassed: number;
    productionServerManifestPublishGateV2FixtureProbes: number;
    frenchServerRemoteCredentialHandoffV2Present: boolean;
    frenchServerRemoteCredentialHandoffV2Status: string;
    frenchServerRemoteCredentialHandoffV2State: string;
    frenchServerRemoteCredentialHandoffV2CredentialSource: string;
    frenchServerRemoteCredentialHandoffV2CredentialPreflightReady: boolean;
    frenchServerRemoteCredentialHandoffV2RemoteVerifyBlockedByCredentials: boolean;
    frenchServerRemoteCredentialHandoffV2AcceptedCredentialOptions: number;
    frenchServerRemoteCredentialHandoffV2CredentialsPrinted: boolean;
    frenchServerRemoteCredentialHandoffV2UploadStarted: boolean;
    frenchServerRemoteCredentialHandoffV2RuntimeDownloadsEnabled: boolean;
    frenchServerRemoteCredentialHandoffV2ActivationApproved: boolean;
    frenchServerRemoteCredentialHandoffV2ReadyForApply: boolean;
    frenchUploadRemoteVerifyParityV2Blockers: number;
    frenchUploadRemoteVerifyParityV2Warnings: number;
    frenchUploadRemoteVerifyParityV2Present: boolean;
    frenchUploadRemoteVerifyParityV2ReadyForRemoteObjectVerify: boolean;
    frenchUploadRemoteVerifyParityV2MatchedServerPaths: number;
    frenchUploadRemoteVerifyParityV2ShaMatches: number;
    frenchUploadRemoteVerifyParityV2ByteMatches: number;
    frenchUploadRemoteVerifyParityV2UploadOnlyPaths: number;
    frenchUploadRemoteVerifyParityV2DryRunOnlyPaths: number;
    frenchUploadRemoteVerifyParityV2ScopedFrenchPaths: number;
    frenchServerObjectRemoteVerifyV2Blockers: number;
    frenchServerObjectRemoteVerifyV2Warnings: number;
    frenchServerObjectRemoteVerifyV2Present: boolean;
    frenchServerObjectRemoteVerifyV2ReadyForRuntimeDownloadActivation: boolean;
    frenchServerObjectRemoteVerifyV2FoundObjects: number;
    frenchServerObjectRemoteVerifyV2HashCheckedObjects: number;
    frenchServerObjectRemoteVerifyV2UnverifiedObjects: number;
    frenchServerObjectRemoteVerifyV2MissingObjects: number;
    frenchServerObjectRemoteVerifyV2SizeMismatches: number;
    frenchServerObjectRemoteVerifyV2HashMismatches: number;
    frenchServerObjectRemoteVerifyV2FixtureProbesPassed: number;
    frenchServerObjectRemoteVerifyV2FixtureProbes: number;
    frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply: boolean;
    remoteVerifyBlocksDecisionImportAndApply: boolean;
    adminServerDeliveryRuntimePreflightV2Blockers: number;
    adminServerDeliveryRuntimePreflightV2Warnings: number;
    adminServerDeliveryRuntimePreflightV2Present: boolean;
    adminServerDeliveryRuntimePreflightV2State: string;
    adminServerDeliveryRuntimePreflightV2ManifestEntries: number;
    adminServerDeliveryRuntimePreflightV2AdminReady: boolean;
    adminServerDeliveryRuntimePreflightV2RuntimeReady: boolean;
    adminServerDeliveryRuntimePreflightV2StorageReady: boolean;
    adminServerDeliveryRuntimePreflightV2ReadyForRuntimeActivationBlockerPlanning: boolean;
    adminServerDeliveryRuntimePreflightV2FixtureProbesPassed: number;
    adminServerDeliveryRuntimePreflightV2FixtureProbes: number;
    adminServerDeliveryRuntimePreflightV2ReadyForApply: boolean;
    runtimeActivationBlockerPlanV2Blockers: number;
    runtimeActivationBlockerPlanV2Warnings: number;
    runtimeActivationBlockerPlanV2Present: boolean;
    runtimeActivationBlockerPlanV2State: string;
    runtimeActivationBlockerPlanV2PlanItems: number;
    runtimeActivationBlockerPlanV2PlannedTouches: number;
    runtimeActivationBlockerPlanV2ReadinessApplyBlockers: number;
    runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps: number;
    runtimeActivationBlockerPlanV2ReadyForExplicitApprovalReceiptGate: boolean;
    runtimeActivationBlockerPlanV2FixtureProbesPassed: number;
    runtimeActivationBlockerPlanV2FixtureProbes: number;
    runtimeActivationBlockerPlanV2ReadyForApply: boolean;
    runtimeDeliveryEvidenceChainV2Blockers: number;
    runtimeDeliveryEvidenceChainV2Warnings: number;
    runtimeDeliveryEvidenceChainV2Present: boolean;
    runtimeDeliveryEvidenceChainV2State: string;
    runtimeDeliveryEvidenceChainV2Ready: boolean;
    runtimeDeliveryEvidenceChainV2UpstreamReportsPass: number;
    runtimeDeliveryEvidenceChainV2UpstreamReportBlockers: number;
    runtimeDeliveryEvidenceChainV2PreviewEntries: number;
    runtimeDeliveryEvidenceChainV2PreviewShaPlaceholders: number;
    runtimeDeliveryEvidenceChainV2PublishManifestEntries: number;
    runtimeDeliveryEvidenceChainV2ActualShaEntries: number;
    runtimeDeliveryEvidenceChainV2ActualByteSizeEntries: number;
    runtimeDeliveryEvidenceChainV2ManifestPayloadShaMatches: number;
    runtimeDeliveryEvidenceChainV2ManifestIndexShaMatches: number;
    runtimeDeliveryEvidenceChainV2ManifestSliceManifestShaMatches: number;
    runtimeDeliveryEvidenceChainV2ManifestChecksumReportsPresent: number;
    runtimeDeliveryEvidenceChainV2RuntimeRollbackSimulationContracts: number;
    runtimeDeliveryEvidenceChainV2RuntimeSourceLocaleMismatchRejectContracts: number;
    runtimeDeliveryEvidenceChainV2RuntimeStudyTargetMismatchRejectContracts: number;
    runtimeDeliveryEvidenceChainV2AdminReady: boolean;
    runtimeDeliveryEvidenceChainV2RuntimeReady: boolean;
    runtimeDeliveryEvidenceChainV2StorageReady: boolean;
    runtimeDeliveryEvidenceChainV2ClosedTransitions: boolean;
    runtimeDeliveryEvidenceChainV2ReadyForExactApprovalWaitState: boolean;
    runtimeDeliveryEvidenceChainV2FixtureProbesPassed: number;
    runtimeDeliveryEvidenceChainV2FixtureProbes: number;
    runtimeDeliveryEvidenceChainV2ReadyForApply: boolean;
    runtimeDeliveryEvidenceChainV2MayModifyProductionAppFiles: boolean;
    explicitApprovalReceiptHashLockGateV2Blockers: number;
    explicitApprovalReceiptHashLockGateV2Warnings: number;
    explicitApprovalReceiptHashLockGateV2Present: boolean;
    explicitApprovalReceiptHashLockGateV2State: string;
    explicitApprovalReceiptHashLockGateV2CriticalHashLocks: number;
    explicitApprovalReceiptHashLockGateV2DirtyFiles: number;
    explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles: number;
    explicitApprovalReceiptHashLockGateV2ReadyForApprovalRequestPresentation: boolean;
    explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists: boolean;
    explicitApprovalReceiptHashLockGateV2ActiveHashLockExists: boolean;
    explicitApprovalReceiptHashLockGateV2FixtureProbesPassed: number;
    explicitApprovalReceiptHashLockGateV2FixtureProbes: number;
    explicitApprovalReceiptHashLockGateV2ReadyForApply: boolean;
    activationApprovalRequestPresentationV2Blockers: number;
    activationApprovalRequestPresentationV2Warnings: number;
    activationApprovalRequestPresentationV2Present: boolean;
    activationApprovalRequestPresentationV2State: string;
    activationApprovalRequestPresentationV2CriticalHashLocks: number;
    activationApprovalRequestPresentationV2DirtyFiles: number;
    activationApprovalRequestPresentationV2ReadyForExplicitApprovalReceiptCreationGate: boolean;
    activationApprovalRequestPresentationV2ActiveApprovalReceiptExists: boolean;
    activationApprovalRequestPresentationV2ActiveHashLockExists: boolean;
    activationApprovalRequestPresentationV2FixtureProbesPassed: number;
    activationApprovalRequestPresentationV2FixtureProbes: number;
    activationApprovalRequestPresentationV2ReadyForApply: boolean;
    explicitApprovalReceiptCreationGateV2Blockers: number;
    explicitApprovalReceiptCreationGateV2Warnings: number;
    explicitApprovalReceiptCreationGateV2Present: boolean;
    explicitApprovalReceiptCreationGateV2State: string;
    explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent: boolean;
    explicitApprovalReceiptCreationGateV2PlainContinueRejected: boolean;
    explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated: boolean;
    explicitApprovalReceiptCreationGateV2ActiveHashLockCreated: boolean;
    explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit: boolean;
    explicitApprovalReceiptCreationGateV2FixtureProbesPassed: number;
    explicitApprovalReceiptCreationGateV2FixtureProbes: number;
    explicitApprovalReceiptCreationGateV2ReadyForApply: boolean;
    productionApplyAbsenceDenialGateV2Blockers: number;
    productionApplyAbsenceDenialGateV2Warnings: number;
    productionApplyAbsenceDenialGateV2Present: boolean;
    productionApplyAbsenceDenialGateV2State: string;
    productionApplyAbsenceDenialGateV2ApplyDenied: boolean;
    productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists: boolean;
    productionApplyAbsenceDenialGateV2ActiveHashLockExists: boolean;
    productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit: boolean;
    productionApplyAbsenceDenialGateV2ReadyForNonProductionContinuation: boolean;
    productionApplyAbsenceDenialGateV2FixtureProbesPassed: number;
    productionApplyAbsenceDenialGateV2FixtureProbes: number;
    productionApplyAbsenceDenialGateV2ReadyForApply: boolean;
    nonproductionBlockerClosurePlanV2Blockers: number;
    nonproductionBlockerClosurePlanV2Warnings: number;
    nonproductionBlockerClosurePlanV2Present: boolean;
    nonproductionBlockerClosurePlanV2State: string;
    nonproductionBlockerClosurePlanV2ChainReady: boolean;
    nonproductionBlockerClosurePlanV2SafeItems: number;
    nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems: number;
    nonproductionBlockerClosurePlanV2ProductionLockedItems: number;
    nonproductionBlockerClosurePlanV2RecommendedNextSafeItem: string;
    nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass: boolean;
    nonproductionBlockerClosurePlanV2FixtureProbesPassed: number;
    nonproductionBlockerClosurePlanV2FixtureProbes: number;
    nonproductionBlockerClosurePlanV2ReadyForApply: boolean;
    nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles: boolean;
    nonproductionEvidenceRefreshV2Blockers: number;
    nonproductionEvidenceRefreshV2Warnings: number;
    nonproductionEvidenceRefreshV2Present: boolean;
    nonproductionEvidenceRefreshV2State: string;
    nonproductionEvidenceRefreshV2LegacyReviewResidueMatches: number;
    nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck: boolean;
    nonproductionEvidenceRefreshV2FixtureProbesPassed: number;
    nonproductionEvidenceRefreshV2FixtureProbes: number;
    nonproductionEvidenceRefreshV2ReadyForApply: boolean;
    nonproductionEvidenceRefreshV2MayModifyProductionAppFiles: boolean;
    runtimeServerManifestConsistencyRecheckV2Blockers: number;
    runtimeServerManifestConsistencyRecheckV2Warnings: number;
    runtimeServerManifestConsistencyRecheckV2Present: boolean;
    runtimeServerManifestConsistencyRecheckV2State: string;
    runtimeServerManifestConsistencyRecheckV2ManifestEntries: number;
    runtimeServerManifestConsistencyRecheckV2GateRefsCurrent: number;
    runtimeServerManifestConsistencyRecheckV2GateRefs: number;
    runtimeServerManifestConsistencyRecheckV2InputHashesCurrent: number;
    runtimeServerManifestConsistencyRecheckV2InputHashes: number;
    runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen: number;
    runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries: number;
    runtimeServerManifestConsistencyRecheckV2RuntimeDownloadsEnabledEntries: number;
    runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries: number;
    runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck: boolean;
    runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed: number;
    runtimeServerManifestConsistencyRecheckV2FixtureProbes: number;
    runtimeServerManifestConsistencyRecheckV2ReadyForApply: boolean;
    runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles: boolean;
    languageIsolationRegressionRecheckV2Blockers: number;
    languageIsolationRegressionRecheckV2Warnings: number;
    languageIsolationRegressionRecheckV2Present: boolean;
    languageIsolationRegressionRecheckV2State: string;
    languageIsolationRegressionRecheckV2ScannedRows: number;
    languageIsolationRegressionRecheckV2ScannedTargetFields: number;
    languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale: number;
    languageIsolationRegressionRecheckV2PromptEntrypointsExpected: number;
    languageIsolationRegressionRecheckV2ManifestEntries: number;
    languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh: boolean;
    languageIsolationRegressionRecheckV2FixtureProbesPassed: number;
    languageIsolationRegressionRecheckV2FixtureProbes: number;
    languageIsolationRegressionRecheckV2ReadyForApply: boolean;
    languageIsolationRegressionRecheckV2MayModifyProductionAppFiles: boolean;
    readinessApplyBlockerMapRefreshV2Blockers: number;
    readinessApplyBlockerMapRefreshV2Warnings: number;
    readinessApplyBlockerMapRefreshV2Present: boolean;
    readinessApplyBlockerMapRefreshV2State: string;
    readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers: number;
    readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers: number;
    readinessApplyBlockerMapRefreshV2SafeClosed: number;
    readinessApplyBlockerMapRefreshV2SafeRemaining: number;
    readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh: boolean;
    readinessApplyBlockerMapRefreshV2FixtureProbesPassed: number;
    readinessApplyBlockerMapRefreshV2FixtureProbes: number;
    readinessApplyBlockerMapRefreshV2ReadyForApply: boolean;
    readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles: boolean;
    masterNextPassConsistencyRefreshV2Blockers: number;
    masterNextPassConsistencyRefreshV2Warnings: number;
    masterNextPassConsistencyRefreshV2Present: boolean;
    masterNextPassConsistencyRefreshV2State: string;
    masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage: boolean;
    masterNextPassConsistencyRefreshV2FixtureProbesPassed: number;
    masterNextPassConsistencyRefreshV2FixtureProbes: number;
    masterNextPassConsistencyRefreshV2ReadyForApply: boolean;
    masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles: boolean;
    officialSourceContentCoverageV2Blockers: number;
    officialSourceContentCoverageV2Warnings: number;
    officialSourceContentCoverageV2Present: boolean;
    officialSourceContentCoverageV2State: string;
    officialSourceContentCoverageV2LedgerRows: number;
    officialSourceContentCoverageV2AcceptedRows: number;
    officialSourceContentCoverageV2AcceptedAi: number;
    officialSourceContentCoverageV2RowsWithSourceRefs: number;
    officialSourceContentCoverageV2RowsWithTrustedSourceRefUrls: number;
    officialSourceContentCoverageV2RowsWithEvidenceCoveredBySourceRefs: number;
    officialSourceContentCoverageV2RowsWithUntrustedSourceRefUrls: number;
    officialSourceContentCoverageV2RowsWithUntrustedSourceRefIds: number;
    officialSourceContentCoverageV2AiWithTrustedSourceRefUrls: number;
    officialSourceContentCoverageV2AiWithMinimumTrustedSourceRefs: number;
    officialSourceContentCoverageV2AiWithUntrustedSourceRefUrls: number;
    officialSourceContentCoverageV2AiWithUntrustedSourceRefIds: number;
    officialSourceContentCoverageV2RejectsNonHttpsSourceRefFixture: boolean;
    officialSourceContentCoverageV2RejectsUntrustedSourceDomainFixture: boolean;
    officialSourceContentCoverageV2RejectsUntrustedSourceIdFixture: boolean;
    officialSourceContentCoverageV2RejectsEvidenceWithoutMatchingSourceRefFixture: boolean;
    officialSourceContentCoverageV2RejectsInsufficientAiTrustedSourceRefsFixture: boolean;
    officialSourceContentCoverageV2RowsWithGatesPassed: number;
    officialSourceContentCoverageV2QuizRowsOneCorrect: number;
    officialSourceContentCoverageV2TrustedSourceIds: number;
    officialSourceContentCoverageV2P38Ready: boolean;
    officialSourceContentCoverageV2FreshAfterMasterRefresh: boolean;
    officialSourceContentCoverageV2FreshnessAcceptedByP38Snapshot: boolean;
    officialSourceContentCoverageV2ReadyForImportDryRunRefresh: boolean;
    officialSourceContentCoverageV2FixtureProbesPassed: number;
    officialSourceContentCoverageV2FixtureProbes: number;
    officialSourceContentCoverageV2ReadyForApply: boolean;
    officialSourceContentCoverageV2MayModifyProductionAppFiles: boolean;
    officialSourcePayloadCreationApprovalPreflightV2Ready: boolean;
    officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate: boolean;
    officialSourceClosedLocalPayloadMaterializationV2Ready: boolean;
    officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight: boolean;
    productionActivationHoldExactApprovalRequiredV2Blockers: number;
    productionActivationHoldExactApprovalRequiredV2Warnings: number;
    productionActivationHoldExactApprovalRequiredV2Present: boolean;
    productionActivationHoldExactApprovalRequiredV2State: string;
    productionActivationHoldExactApprovalRequiredV2Ready: boolean;
    productionActivationHoldExactApprovalRequiredV2ClosedEvidenceReady: boolean;
    productionActivationHoldExactApprovalRequiredV2ExactApprovalRequired: boolean;
    productionActivationHoldExactApprovalRequiredV2FixtureProbesPassed: number;
    productionActivationHoldExactApprovalRequiredV2FixtureProbes: number;
    productionActivationHoldExactApprovalRequiredV2ReadyForApply: boolean;
    productionActivationHoldExactApprovalRequiredV2MayModifyProductionAppFiles: boolean;
    exactApprovalValidationGateV2Blockers: number;
    exactApprovalValidationGateV2Warnings: number;
    exactApprovalValidationGateV2Present: boolean;
    exactApprovalValidationGateV2State: string;
    exactApprovalValidationGateV2Ready: boolean;
    exactApprovalValidationGateV2ReadyForProductionActivationSequencing: boolean;
    exactApprovalValidationGateV2ActiveApprovalReceiptExists: boolean;
    exactApprovalValidationGateV2ActiveHashLockExists: boolean;
    exactApprovalValidationGateV2FixtureProbesPassed: number;
    exactApprovalValidationGateV2FixtureProbes: number;
    exactApprovalValidationGateV2ReadyForApply: boolean;
    exactApprovalValidationGateV2MayModifyProductionAppFiles: boolean;
    productionActivationSequencePreflightV2Blockers: number;
    productionActivationSequencePreflightV2Warnings: number;
    productionActivationSequencePreflightV2Present: boolean;
    productionActivationSequencePreflightV2State: string;
    productionActivationSequencePreflightV2Ready: boolean;
    productionActivationSequencePreflightV2ReadyForProductionActivationSequence: boolean;
    productionActivationSequencePreflightV2FixtureProbesPassed: number;
    productionActivationSequencePreflightV2FixtureProbes: number;
    productionActivationSequencePreflightV2ReadyForApply: boolean;
    productionActivationSequencePreflightV2MayModifyProductionAppFiles: boolean;
    productionApplyTransactionContractV2Blockers: number;
    productionApplyTransactionContractV2Warnings: number;
    productionApplyTransactionContractV2Present: boolean;
    productionApplyTransactionContractV2State: string;
    productionApplyTransactionContractV2Ready: boolean;
    productionApplyTransactionContractV2ReadyForProductionApplyTransaction: boolean;
    productionApplyTransactionContractV2ServerManifestEntries: number;
    productionApplyTransactionContractV2PayloadFilesChecked: number;
    productionApplyTransactionContractV2IndexFilesChecked: number;
    productionApplyTransactionContractV2SliceManifestFilesChecked: number;
    productionApplyTransactionContractV2ShaMismatches: number;
    productionApplyTransactionContractV2MissingEntryFiles: number;
    productionApplyTransactionContractV2P49RequirementsProved: number;
    productionApplyTransactionContractV2P49RequirementsProductionLocked: number;
    productionApplyTransactionContractV2P49RequirementsMissing: number;
    productionApplyTransactionContractV2P49RequirementsContradicted: number;
    productionApplyTransactionContractV2FinalHashLocks: number;
    productionApplyTransactionContractV2P50MissingCriticalArtifacts: number;
    productionApplyTransactionContractV2P50RuntimeDeliveryEvidenceChainReady: boolean;
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainReady: boolean;
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries: number;
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainActualShaEntries: number;
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainRollbackContracts: number;
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects: number;
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects: number;
    productionApplyTransactionContractV2FixtureProbesPassed: number;
    productionApplyTransactionContractV2FixtureProbes: number;
    productionApplyTransactionContractV2ReadyForApply: boolean;
    productionApplyTransactionContractV2MayModifyProductionAppFiles: boolean;
    postApplyRollbackGuardContractV2Blockers: number;
    postApplyRollbackGuardContractV2Warnings: number;
    postApplyRollbackGuardContractV2Present: boolean;
    postApplyRollbackGuardContractV2State: string;
    postApplyRollbackGuardContractV2Ready: boolean;
    postApplyRollbackGuardContractV2ReadyForPostApplyRollbackGuard: boolean;
    postApplyRollbackGuardContractV2RuntimeCacheContracts: number;
    postApplyRollbackGuardContractV2RuntimeCacheRollbackContracts: number;
    postApplyRollbackGuardContractV2LanguagePromptContracts: number;
    postApplyRollbackGuardContractV2LanguagePromptEntrypointsExpected: number;
    postApplyRollbackGuardContractV2PostApplyGuardSteps: number;
    postApplyRollbackGuardContractV2RollbackGuardSteps: number;
    postApplyRollbackGuardContractV2P49RequirementsProved: number;
    postApplyRollbackGuardContractV2P49RequirementsProductionLocked: number;
    postApplyRollbackGuardContractV2P49RequirementsMissing: number;
    postApplyRollbackGuardContractV2P49RequirementsContradicted: number;
    postApplyRollbackGuardContractV2FinalHashLocks: number;
    postApplyRollbackGuardContractV2P50MissingCriticalArtifacts: number;
    postApplyRollbackGuardContractV2P50RuntimeDeliveryEvidenceChainReady: boolean;
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainReady: boolean;
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries: number;
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainActualShaEntries: number;
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainRollbackContracts: number;
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects: number;
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects: number;
    postApplyRollbackGuardContractV2FixtureProbesPassed: number;
    postApplyRollbackGuardContractV2FixtureProbes: number;
    postApplyRollbackGuardContractV2ReadyForApply: boolean;
    postApplyRollbackGuardContractV2MayModifyProductionAppFiles: boolean;
    approvalWaitSafeContinuationV2Blockers: number;
    approvalWaitSafeContinuationV2Warnings: number;
    approvalWaitSafeContinuationV2Present: boolean;
    approvalWaitSafeContinuationV2State: string;
    approvalWaitSafeContinuationV2Ready: boolean;
    approvalWaitSafeContinuationV2ReadyForNextSafePass: boolean;
    approvalWaitSafeContinuationV2SafeWorkItems: number;
    approvalWaitSafeContinuationV2ProductionLockedItems: number;
    approvalWaitSafeContinuationV2LegacyReviewResidueMatches: number;
    approvalWaitSafeContinuationV2FixtureProbesPassed: number;
    approvalWaitSafeContinuationV2FixtureProbes: number;
    approvalWaitSafeContinuationV2ReadyForApply: boolean;
    approvalWaitSafeContinuationV2MayModifyProductionAppFiles: boolean;
    productionReadinessCompletionAuditV2Blockers: number;
    productionReadinessCompletionAuditV2Warnings: number;
    productionReadinessCompletionAuditV2Present: boolean;
    productionReadinessCompletionAuditV2State: string;
    productionReadinessCompletionAuditV2Ready: boolean;
    productionReadinessCompletionAuditV2RequirementsProved: number;
    productionReadinessCompletionAuditV2RequirementsProductionLocked: number;
    productionReadinessCompletionAuditV2RequirementsMissing: number;
    productionReadinessCompletionAuditV2RequirementsContradicted: number;
    productionReadinessCompletionAuditV2ClosedModeEvidenceComplete: boolean;
    productionReadinessCompletionAuditV2FixtureProbesPassed: number;
    productionReadinessCompletionAuditV2FixtureProbes: number;
    productionReadinessCompletionAuditV2ReadyForApply: boolean;
    productionReadinessCompletionAuditV2MayModifyProductionAppFiles: boolean;
    finalPreapprovalEvidenceHashLockV2Blockers: number;
    finalPreapprovalEvidenceHashLockV2Warnings: number;
    finalPreapprovalEvidenceHashLockV2Present: boolean;
    finalPreapprovalEvidenceHashLockV2State: string;
    finalPreapprovalEvidenceHashLockV2Ready: boolean;
    finalPreapprovalEvidenceHashLockV2FinalHashLocks: number;
    finalPreapprovalEvidenceHashLockV2MissingCriticalArtifacts: number;
    finalPreapprovalEvidenceHashLockV2MissingRequiredRoleLocks: number;
    finalPreapprovalEvidenceHashLockV2P30IncludesFinalHashLock: boolean;
    finalPreapprovalEvidenceHashLockV2P43P49ChainReady: boolean;
    finalPreapprovalEvidenceHashLockV2P49CompletionReady: boolean;
    finalPreapprovalEvidenceHashLockV2RuntimeDeliveryEvidenceChainReady: boolean;
    finalPreapprovalEvidenceHashLockV2FixtureProbesPassed: number;
    finalPreapprovalEvidenceHashLockV2FixtureProbes: number;
    finalPreapprovalEvidenceHashLockV2ReadyForApply: boolean;
    finalPreapprovalEvidenceHashLockV2MayModifyProductionAppFiles: boolean;
    exactApprovalApplyRehearsalV2Blockers: number;
    exactApprovalApplyRehearsalV2Warnings: number;
    exactApprovalApplyRehearsalV2Present: boolean;
    exactApprovalApplyRehearsalV2State: string;
    exactApprovalApplyRehearsalV2Ready: boolean;
    exactApprovalApplyRehearsalV2ReadinessApplyBlockers: number;
    exactApprovalApplyRehearsalV2ActiveApprovalReceiptExists: boolean;
    exactApprovalApplyRehearsalV2ActiveHashLockExists: boolean;
    exactApprovalApplyRehearsalV2MainHashLockDryRunPresent: boolean;
    exactApprovalApplyRehearsalV2FinalHashLockDryRunPresent: boolean;
    exactApprovalApplyRehearsalV2WouldCreateActiveArtifactsNow: boolean;
    exactApprovalApplyRehearsalV2FixtureProbesPassed: number;
    exactApprovalApplyRehearsalV2FixtureProbes: number;
    exactApprovalApplyRehearsalV2ReadyForApply: boolean;
    exactApprovalApplyRehearsalV2MayModifyProductionAppFiles: boolean;
    exactApprovalSourceFirewallV2Blockers: number;
    exactApprovalSourceFirewallV2Warnings: number;
    exactApprovalSourceFirewallV2Present: boolean;
    exactApprovalSourceFirewallV2State: string;
    exactApprovalSourceFirewallV2Ready: boolean;
    exactApprovalSourceFirewallV2ApprovalSourceExists: boolean;
    exactApprovalSourceFirewallV2ApprovalSourceContainsExactSentence: boolean;
    exactApprovalSourceFirewallV2PlainContinueWouldCreateActiveArtifacts: boolean;
    exactApprovalSourceFirewallV2ActiveApprovalReceiptExists: boolean;
    exactApprovalSourceFirewallV2ActiveHashLockExists: boolean;
    exactApprovalSourceFirewallV2FixtureProbesPassed: number;
    exactApprovalSourceFirewallV2FixtureProbes: number;
    exactApprovalSourceFirewallV2ReadyForApply: boolean;
    exactApprovalSourceFirewallV2MayModifyProductionAppFiles: boolean;
    exactApprovalSourceIntakeTransitionV2Blockers: number;
    exactApprovalSourceIntakeTransitionV2Warnings: number;
    exactApprovalSourceIntakeTransitionV2Present: boolean;
    exactApprovalSourceIntakeTransitionV2State: string;
    exactApprovalSourceIntakeTransitionV2Ready: boolean;
    exactApprovalSourceIntakeTransitionV2ApprovalSourceExists: boolean;
    exactApprovalSourceIntakeTransitionV2ApprovalSourceContainsExactSentence: boolean;
    exactApprovalSourceIntakeTransitionV2PlainContinueWouldCreateActiveArtifacts: boolean;
    exactApprovalSourceIntakeTransitionV2WouldCreateActiveArtifactsByThisScript: boolean;
    exactApprovalSourceIntakeTransitionV2ActiveApprovalReceiptExists: boolean;
    exactApprovalSourceIntakeTransitionV2ActiveHashLockExists: boolean;
    exactApprovalSourceIntakeTransitionV2SimulatedValidP31CreateWouldCreateBothArtifacts: boolean;
    exactApprovalSourceIntakeTransitionV2SimulatedP44WouldOpenReadyForApply: boolean;
    exactApprovalSourceIntakeTransitionV2FixtureProbesPassed: number;
    exactApprovalSourceIntakeTransitionV2FixtureProbes: number;
    exactApprovalSourceIntakeTransitionV2ReadyForApply: boolean;
    exactApprovalSourceIntakeTransitionV2MayModifyProductionAppFiles: boolean;
    exactApprovalActiveArtifactPairSimulationV2Blockers: number;
    exactApprovalActiveArtifactPairSimulationV2Warnings: number;
    exactApprovalActiveArtifactPairSimulationV2Present: boolean;
    exactApprovalActiveArtifactPairSimulationV2State: string;
    exactApprovalActiveArtifactPairSimulationV2Ready: boolean;
    exactApprovalActiveArtifactPairSimulationV2ApprovalSourceExists: boolean;
    exactApprovalActiveArtifactPairSimulationV2ApprovalSourceContainsExactSentence: boolean;
    exactApprovalActiveArtifactPairSimulationV2ActiveApprovalReceiptExists: boolean;
    exactApprovalActiveArtifactPairSimulationV2ActiveHashLockExists: boolean;
    exactApprovalActiveArtifactPairSimulationV2SimulatedPairWouldPassP44AfterP31Create: boolean;
    exactApprovalActiveArtifactPairSimulationV2CurrentP44WouldOpenSequencing: boolean;
    exactApprovalActiveArtifactPairSimulationV2ReadyForP31CreateWhenExactSourcePresent: boolean;
    exactApprovalActiveArtifactPairSimulationV2FixtureProbesPassed: number;
    exactApprovalActiveArtifactPairSimulationV2FixtureProbes: number;
    exactApprovalActiveArtifactPairSimulationV2ReadyForApply: boolean;
    exactApprovalActiveArtifactPairSimulationV2MayModifyProductionAppFiles: boolean;
    exactApprovalP31CreateCommandPreflightV2Blockers: number;
    exactApprovalP31CreateCommandPreflightV2Warnings: number;
    exactApprovalP31CreateCommandPreflightV2Present: boolean;
    exactApprovalP31CreateCommandPreflightV2State: string;
    exactApprovalP31CreateCommandPreflightV2Ready: boolean;
    exactApprovalP31CreateCommandPreflightV2ApprovalSourceExists: boolean;
    exactApprovalP31CreateCommandPreflightV2ApprovalSourceContainsExactSentence: boolean;
    exactApprovalP31CreateCommandPreflightV2ActiveApprovalReceiptExists: boolean;
    exactApprovalP31CreateCommandPreflightV2ActiveHashLockExists: boolean;
    exactApprovalP31CreateCommandPreflightV2CommandAllowedNow: boolean;
    exactApprovalP31CreateCommandPreflightV2CommandAllowedWhenExactSourcePresent: boolean;
    exactApprovalP31CreateCommandPreflightV2CommandExecutedByThisScript: boolean;
    exactApprovalP31CreateCommandPreflightV2FixtureProbesPassed: number;
    exactApprovalP31CreateCommandPreflightV2FixtureProbes: number;
    exactApprovalP31CreateCommandPreflightV2ReadyForApply: boolean;
    exactApprovalP31CreateCommandPreflightV2MayModifyProductionAppFiles: boolean;
    exactApprovalP44ValidationCommandPreflightV2Blockers: number;
    exactApprovalP44ValidationCommandPreflightV2Warnings: number;
    exactApprovalP44ValidationCommandPreflightV2Present: boolean;
    exactApprovalP44ValidationCommandPreflightV2State: string;
    exactApprovalP44ValidationCommandPreflightV2Ready: boolean;
    exactApprovalP44ValidationCommandPreflightV2ApprovalSourceExists: boolean;
    exactApprovalP44ValidationCommandPreflightV2ApprovalSourceContainsExactSentence: boolean;
    exactApprovalP44ValidationCommandPreflightV2ActiveApprovalReceiptExists: boolean;
    exactApprovalP44ValidationCommandPreflightV2ActiveHashLockExists: boolean;
    exactApprovalP44ValidationCommandPreflightV2CommandAllowedNow: boolean;
    exactApprovalP44ValidationCommandPreflightV2CommandAllowedAfterP31Create: boolean;
    exactApprovalP44ValidationCommandPreflightV2CommandExecutedByThisScript: boolean;
    exactApprovalP44ValidationCommandPreflightV2FixtureProbesPassed: number;
    exactApprovalP44ValidationCommandPreflightV2FixtureProbes: number;
    exactApprovalP44ValidationCommandPreflightV2ReadyForApply: boolean;
    exactApprovalP44ValidationCommandPreflightV2MayModifyProductionAppFiles: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2Blockers: number;
    exactApprovalP44ToP45SequenceHandoffSimulationV2Warnings: number;
    exactApprovalP44ToP45SequenceHandoffSimulationV2Present: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2State: string;
    exactApprovalP44ToP45SequenceHandoffSimulationV2Ready: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2P56Ready: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2P44Status: string;
    exactApprovalP44ToP45SequenceHandoffSimulationV2P44ValidationState: string;
    exactApprovalP44ToP45SequenceHandoffSimulationV2P45Status: string;
    exactApprovalP44ToP45SequenceHandoffSimulationV2P45PreflightState: string;
    exactApprovalP44ToP45SequenceHandoffSimulationV2CurrentHandoffWouldOpenSequence: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2SimulatedPostP44P45WouldOpenSequence: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2CommandExecutedByThisScript: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbesPassed: number;
    exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbes: number;
    exactApprovalP44ToP45SequenceHandoffSimulationV2ReadyForApply: boolean;
    exactApprovalP44ToP45SequenceHandoffSimulationV2MayModifyProductionAppFiles: boolean;
    exactApprovalP45SequenceCommandPreflightV2Blockers: number;
    exactApprovalP45SequenceCommandPreflightV2Warnings: number;
    exactApprovalP45SequenceCommandPreflightV2Present: boolean;
    exactApprovalP45SequenceCommandPreflightV2State: string;
    exactApprovalP45SequenceCommandPreflightV2Ready: boolean;
    exactApprovalP45SequenceCommandPreflightV2P57Ready: boolean;
    exactApprovalP45SequenceCommandPreflightV2P45Status: string;
    exactApprovalP45SequenceCommandPreflightV2P45PreflightState: string;
    exactApprovalP45SequenceCommandPreflightV2CommandAllowedNow: boolean;
    exactApprovalP45SequenceCommandPreflightV2CommandAllowedAfterP44Validation: boolean;
    exactApprovalP45SequenceCommandPreflightV2CommandExecutedByThisScript: boolean;
    exactApprovalP45SequenceCommandPreflightV2FixtureProbesPassed: number;
    exactApprovalP45SequenceCommandPreflightV2FixtureProbes: number;
    exactApprovalP45SequenceCommandPreflightV2ReadyForApply: boolean;
    exactApprovalP45SequenceCommandPreflightV2MayModifyProductionAppFiles: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Blockers: number;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Warnings: number;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State: string;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P58Ready: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45Status: string;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45PreflightState: string;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46Status: string;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46TransactionState: string;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CurrentHandoffWouldOpenTransaction: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2SimulatedPostP45P46WouldOpenTransaction: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CommandExecutedByThisScript: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbesPassed: number;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbes: number;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2ReadyForApply: boolean;
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2MayModifyProductionAppFiles: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2Blockers: number;
    exactApprovalP46ApplyTransactionCommandPreflightV2Warnings: number;
    exactApprovalP46ApplyTransactionCommandPreflightV2Present: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2State: string;
    exactApprovalP46ApplyTransactionCommandPreflightV2Ready: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2P59Ready: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2P45Status: string;
    exactApprovalP46ApplyTransactionCommandPreflightV2P45PreflightState: string;
    exactApprovalP46ApplyTransactionCommandPreflightV2P46Status: string;
    exactApprovalP46ApplyTransactionCommandPreflightV2P46TransactionState: string;
    exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedNow: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedAfterP45Sequence: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2CommandExecutedByThisScript: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbesPassed: number;
    exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbes: number;
    exactApprovalP46ApplyTransactionCommandPreflightV2ReadyForApply: boolean;
    exactApprovalP46ApplyTransactionCommandPreflightV2MayModifyProductionAppFiles: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Blockers: number;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Warnings: number;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State: string;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P60Ready: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46Status: string;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46TransactionState: string;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47Status: string;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47GuardState: string;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CurrentHandoffWouldOpenRollbackGuard: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2SimulatedPostP46P47WouldOpenRollbackGuard: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CommandExecutedByThisScript: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbesPassed: number;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbes: number;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2ReadyForApply: boolean;
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2MayModifyProductionAppFiles: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2Blockers: number;
    exactApprovalP47RollbackGuardCommandPreflightV2Warnings: number;
    exactApprovalP47RollbackGuardCommandPreflightV2Present: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2State: string;
    exactApprovalP47RollbackGuardCommandPreflightV2Ready: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2P61Ready: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2P46Status: string;
    exactApprovalP47RollbackGuardCommandPreflightV2P46TransactionState: string;
    exactApprovalP47RollbackGuardCommandPreflightV2P47Status: string;
    exactApprovalP47RollbackGuardCommandPreflightV2P47GuardState: string;
    exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedNow: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedAfterP46Contract: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2CommandExecutedByThisScript: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbesPassed: number;
    exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbes: number;
    exactApprovalP47RollbackGuardCommandPreflightV2ReadyForApply: boolean;
    exactApprovalP47RollbackGuardCommandPreflightV2MayModifyProductionAppFiles: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Blockers: number;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Warnings: number;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State: string;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P62Ready: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47Status: string;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47GuardState: string;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48Status: string;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48ContinuationState: string;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CurrentHandoffWouldOpenSafeContinuation: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CommandExecutedByThisScript: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbesPassed: number;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbes: number;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2ReadyForApply: boolean;
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2MayModifyProductionAppFiles: boolean;
    exactApprovalP48SafeContinuationCommandPreflightV2Blockers: number;
    exactApprovalP48SafeContinuationCommandPreflightV2Warnings: number;
    exactApprovalP48SafeContinuationCommandPreflightV2Present: boolean;
    exactApprovalP48SafeContinuationCommandPreflightV2State: string;
    exactApprovalP48SafeContinuationCommandPreflightV2Ready: boolean;
    exactApprovalP48SafeContinuationCommandPreflightV2P63Ready: boolean;
    exactApprovalP48SafeContinuationCommandPreflightV2P48Status: string;
    exactApprovalP48SafeContinuationCommandPreflightV2P48ContinuationState: string;
    exactApprovalP48SafeContinuationCommandPreflightV2CommandAllowedNow: boolean;
    exactApprovalP48SafeContinuationCommandPreflightV2CommandExecutedByThisScript: boolean;
    exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbesPassed: number;
    exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbes: number;
    exactApprovalP48SafeContinuationCommandPreflightV2ReadyForApply: boolean;
    exactApprovalP48SafeContinuationCommandPreflightV2MayModifyProductionAppFiles: boolean;
    exactApprovalWaitStateV2Blockers: number;
    exactApprovalWaitStateV2Warnings: number;
    exactApprovalWaitStateV2Present: boolean;
    exactApprovalWaitStateV2State: string;
    exactApprovalWaitStateV2Ready: boolean;
      exactApprovalWaitStateV2ClosedEvidenceReady: boolean;
      exactApprovalWaitStateV2ExactApprovalStillRequired: boolean;
      exactApprovalWaitStateV2SourceContainsExactSentence: boolean;
      exactApprovalWaitStateV2ApprovalSourceIsCanonical: boolean;
      exactApprovalWaitStateV2ActiveApprovalReceiptExists: boolean;
    exactApprovalWaitStateV2ActiveHashLockExists: boolean;
    exactApprovalWaitStateV2FixtureProbesPassed: number;
    exactApprovalWaitStateV2FixtureProbes: number;
    exactApprovalWaitStateV2ReadyForApply: boolean;
    exactApprovalWaitStateV2MayModifyProductionAppFiles: boolean;
    orderedApprovalWaitRefreshV2Blockers: number;
    orderedApprovalWaitRefreshV2Warnings: number;
    orderedApprovalWaitRefreshV2Present: boolean;
    orderedApprovalWaitRefreshV2Ready: boolean;
    orderedApprovalWaitRefreshV2Executed: boolean;
    orderedApprovalWaitRefreshV2StepsPassed: number;
    orderedApprovalWaitRefreshV2StepsFailed: number;
    orderedApprovalWaitRefreshV2P65Status: string;
    orderedApprovalWaitRefreshV2P65WaitState: string;
    orderedApprovalWaitRefreshV2P65ClosedEvidenceReady: boolean;
    orderedApprovalWaitRefreshV2FinalMasterBlockers: number;
    orderedApprovalWaitRefreshV2FinalMasterWarnings: number;
    orderedApprovalWaitRefreshV2FinalNextBlockers: number;
    orderedApprovalWaitRefreshV2FinalNextWarnings: number;
    orderedApprovalWaitRefreshV2ActiveApprovalReceiptExists: boolean;
    orderedApprovalWaitRefreshV2ActiveHashLockExists: boolean;
    orderedApprovalWaitRefreshV2ReadyForApply: boolean;
    orderedApprovalWaitRefreshV2MayModifyProductionAppFiles: boolean;
    safePreapprovalContinuationV2Blockers: number;
    safePreapprovalContinuationV2Warnings: number;
    safePreapprovalContinuationV2Present: boolean;
    safePreapprovalContinuationV2Ready: boolean;
    safePreapprovalContinuationV2Executed: boolean;
    safePreapprovalContinuationV2StepsPassed: number;
    safePreapprovalContinuationV2StepsFailed: number;
    safePreapprovalContinuationV2GenerationBlockers: number;
    safePreapprovalContinuationV2ApplyBlockers: number;
    safePreapprovalContinuationV2NextGoalId: string;
    safePreapprovalContinuationV2ActiveApprovalReceiptExists: boolean;
    safePreapprovalContinuationV2ActiveHashLockExists: boolean;
    safePreapprovalContinuationV2ReadyForApply: boolean;
    safePreapprovalContinuationV2MayModifyProductionAppFiles: boolean;
    finalProductionReadinessGapV2Blockers: number;
    finalProductionReadinessGapV2Warnings: number;
    finalProductionReadinessGapV2Present: boolean;
    finalProductionReadinessGapV2Ready: boolean;
    finalProductionReadinessGapV2State: string;
    finalProductionReadinessGapV2RequirementsReady: number;
    finalProductionReadinessGapV2RequirementsBlocked: number;
    finalProductionReadinessGapV2ProductionHardBlockers: number;
    finalProductionReadinessGapV2CanStartProductionApply: boolean;
    finalProductionReadinessGapV2GenerationV2Ready: boolean;
    finalProductionReadinessGapV2DecisionImportV2Ready: boolean;
    finalProductionReadinessGapV2ActiveApprovalArtifactPairState: string;
    finalProductionReadinessGapV2ActivationChainReady: boolean;
    finalProductionReadinessGapV2FixtureProbesPassed: number;
    finalProductionReadinessGapV2FixtureProbes: number;
    finalProductionReadinessGapV2ActiveApprovalReceiptExists: boolean;
    finalProductionReadinessGapV2ActiveHashLockExists: boolean;
    finalProductionReadinessGapV2ReadyForApply: boolean;
    finalProductionReadinessGapV2MayModifyProductionAppFiles: boolean;
    exactApprovalSourceHandoffFirewallV2Blockers: number;
    exactApprovalSourceHandoffFirewallV2Warnings: number;
    exactApprovalSourceHandoffFirewallV2Present: boolean;
    exactApprovalSourceHandoffFirewallV2Ready: boolean;
    exactApprovalSourceHandoffFirewallV2State: string;
    exactApprovalSourceHandoffFirewallV2FinalGapReady: boolean;
    exactApprovalSourceHandoffFirewallV2ExactApprovalWaitStateReady: boolean;
    exactApprovalSourceHandoffFirewallV2P31CreationGateReady: boolean;
    exactApprovalSourceHandoffFirewallV2ApprovalSourceExists: boolean;
    exactApprovalSourceHandoffFirewallV2ApprovalSourceContainsExactSentence: boolean;
    exactApprovalSourceHandoffFirewallV2NextAllowedStepWhileAbsent: string;
    exactApprovalSourceHandoffFirewallV2NextAllowedStepWhenPresent: string;
    exactApprovalSourceHandoffFirewallV2ActiveApprovalReceiptExists: boolean;
    exactApprovalSourceHandoffFirewallV2ActiveHashLockExists: boolean;
    exactApprovalSourceHandoffFirewallV2CanStartProductionApply: boolean;
    exactApprovalSourceHandoffFirewallV2FixtureProbesPassed: number;
    exactApprovalSourceHandoffFirewallV2FixtureProbes: number;
    exactApprovalSourceHandoffFirewallV2ReadyForApply: boolean;
    exactApprovalSourceHandoffFirewallV2MayModifyProductionAppFiles: boolean;
    exactApprovalSourceWaitTerminalStateV2Blockers: number;
    exactApprovalSourceWaitTerminalStateV2Warnings: number;
    exactApprovalSourceWaitTerminalStateV2Present: boolean;
    exactApprovalSourceWaitTerminalStateV2Ready: boolean;
    exactApprovalSourceWaitTerminalStateV2State: string;
    exactApprovalSourceWaitTerminalStateV2P68Ready: boolean;
    exactApprovalSourceWaitTerminalStateV2NextGoalId: string;
    exactApprovalSourceWaitTerminalStateV2ConsistencyGoalId: string;
    exactApprovalSourceWaitTerminalStateV2ApprovalSourceExists: boolean;
    exactApprovalSourceWaitTerminalStateV2ApprovalSourceContainsExactSentence: boolean;
    exactApprovalSourceWaitTerminalStateV2ActiveApprovalReceiptExists: boolean;
    exactApprovalSourceWaitTerminalStateV2ActiveHashLockExists: boolean;
    exactApprovalSourceWaitTerminalStateV2CanStartProductionApply: boolean;
    exactApprovalSourceWaitTerminalStateV2FixtureProbesPassed: number;
    exactApprovalSourceWaitTerminalStateV2FixtureProbes: number;
    exactApprovalSourceWaitTerminalStateV2ReadyForApply: boolean;
    exactApprovalSourceWaitTerminalStateV2MayModifyProductionAppFiles: boolean;
    postExactApprovalApplyRunbookV2Blockers: number;
    postExactApprovalApplyRunbookV2Warnings: number;
    postExactApprovalApplyRunbookV2Present: boolean;
    postExactApprovalApplyRunbookV2Ready: boolean;
    postExactApprovalApplyRunbookV2State: string;
    postExactApprovalApplyRunbookV2Steps: number;
    postExactApprovalApplyRunbookV2P31CreateAllowedNow: boolean;
    postExactApprovalApplyRunbookV2P31CreateAllowedWhenExactSourcePresent: boolean;
    postExactApprovalApplyRunbookV2ProductionWritesAllowedNow: boolean;
    postExactApprovalApplyRunbookV2ActiveApprovalReceiptExists: boolean;
    postExactApprovalApplyRunbookV2ActiveHashLockExists: boolean;
    postExactApprovalApplyRunbookV2CanStartProductionApplyNow: boolean;
    postExactApprovalApplyRunbookV2FixtureProbesPassed: number;
    postExactApprovalApplyRunbookV2FixtureProbes: number;
    postExactApprovalApplyRunbookV2ReadyForApply: boolean;
    postExactApprovalApplyRunbookV2MayModifyProductionAppFiles: boolean;
    researchJsonFirewallBlockers: number;
    researchJsonFirewallWarnings: number;
    nextPassContractBlockers: number;
    nextPassContractWarnings: number;
    nextPassLargeGoals: number;
    nextPassPrepared: boolean;
    readyForNextLargePass: boolean;
    runValidatorBlockers: number;
    generationBlockers: number;
    applyBlockers: number;
    criticalArtifactsMissing: number;
    blockersRaw: number;
    terminalWaitSelfCycleBlockersSuppressed: number;
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForResearchPackBuilder: boolean;
    readyForGenerationV2PayloadPreflightReady: boolean;
    readyForGenerationV2SelfImprovingReady: boolean;
    readyForGenerationV2DomainRegistryReady: boolean;
    readyForGenerationV2BlockedByLegacyResearchGaps: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  sourceReports: SourceReportEntry[];
  artifacts: ArtifactEntry[];
  outputArtifacts: {
    manifestJson: string;
    manifestMd: string;
    packetJson: string;
    packetMd: string;
  };
  findings: Finding[];
};

const EXPECTED_LESSON_LEDGER_COUNT = 32;
const EXPECTED_ROW_COUNT = 1600;
const EXPECTED_BATCH_FILE_COUNT = 32;
const EXPECTED_FINAL_PREAPPROVAL_HASH_LOCKS_V2 = 38;

const CRITICAL_REPORTS = [
  'audits/self_improving_pipeline_upgrade_packet.json',
  'audits/generation_history_reconciliation_audit.json',
  'audits/app_atlas_refresh_audit.json',
  'audits/algorithm_domain_registry_v2_packet.json',
  'audits/target_research_pack_builder_packet.json',
  'audits/target_research_pack_verify_audit.json',
  'audits/target_pedagogy_blueprint_packet.json',
  'audits/generation_schema_v2_packet.json',
  'audits/ai_prompt_contract_v2_packet.json',
  'audits/content_quality_gates_v2_packet.json',
  'audits/reviewer_workflow_v2_packet.json',
  'audits/target_pack_manifest_v2_packet.json',
  'audits/runtime_server_delivery_contract_v2_packet.json',
  'audits/storage_cloud_target_map_v2_packet.json',
  'audits/admin_pack_delivery_surface_v2_packet.json',
  'audits/reviewer_decision_import_v2_dry_run.json',
  'audits/payload_shard_materialization_checksum_v2_packet.json',
  'audits/server_delivery_manifest_preview_v2_packet.json',
  'audits/runtime_cache_integrity_rollback_v2_packet.json',
  'audits/reviewer_decision_import_opening_preflight_v2_packet.json',
  'audits/llm_official_source_review_intake_v2_packet.json',
  'audits/reviewer_decision_import_execution_gate_v2_packet.json',
  'audits/llm_official_source_decision_materialization_v2_packet.json',
  'audits/llm_official_source_decision_dry_run_v2_packet.json',
  'audits/llm_official_source_decision_promotion_preflight_v2_packet.json',
  'audits/llm_official_source_promoted_decision_file_generation_v2_packet.json',
  'audits/legacy_generated_research_evidence_bridge_v2_packet.json',
  'audits/payload_creation_approval_preflight_v2_packet.json',
  'audits/closed_local_payload_materialization_v2_packet.json',
  'audits/server_delivery_publish_preflight_v2_packet.json',
  'audits/onboarding_server_prefetch_contract_v2_packet.json',
  'audits/french_app_surface_parity_v2_packet.json',
  'audits/production_server_manifest_publish_gate_v2_packet.json',
  'audits/french_server_pack_upload_evidence_v2_packet.json',
  'audits/french_server_pack_upload_execution_gate_v2_packet.json',
  'audits/french_server_remote_credential_handoff_v2_packet.json',
  'audits/french_remote_verify_dry_run_readiness_v2_packet.json',
  'audits/french_upload_remote_verify_parity_v2_packet.json',
  'audits/french_remote_verify_command_rehearsal_v2_packet.json',
  'audits/french_remote_verify_live_handoff_v2_packet.json',
  'audits/french_post_remote_verify_transition_v2_packet.json',
  'audits/french_server_object_remote_verify_v2_packet.json',
  'audits/french_final_blocker_dependency_map_v2_packet.json',
  'audits/admin_server_delivery_runtime_preflight_v2_packet.json',
  'audits/runtime_activation_blocker_plan_v2_packet.json',
  'audits/runtime_delivery_evidence_chain_v2_packet.json',
  'audits/explicit_approval_receipt_hash_lock_gate_v2_packet.json',
  'audits/activation_approval_request_presentation_v2_packet.json',
  'audits/explicit_approval_receipt_creation_gate_v2_packet.json',
  'audits/production_apply_absence_denial_gate_v2_packet.json',
  'audits/nonproduction_blocker_closure_plan_v2_packet.json',
  'audits/nonproduction_evidence_refresh_v2_packet.json',
  'audits/runtime_server_manifest_consistency_recheck_v2_packet.json',
  'audits/language_isolation_regression_recheck_v2_packet.json',
  'audits/readiness_apply_blocker_map_refresh_v2_packet.json',
  'audits/master_next_pass_consistency_refresh_v2_packet.json',
  'audits/french_official_source_content_coverage_v2_packet.json',
  'audits/production_activation_hold_exact_approval_required_v2_packet.json',
  'audits/exact_approval_validation_gate_v2_packet.json',
  'audits/production_activation_sequence_preflight_v2_packet.json',
  'audits/production_apply_transaction_contract_v2_packet.json',
  'audits/post_apply_rollback_guard_contract_v2_packet.json',
  'audits/approval_wait_safe_continuation_v2_packet.json',
  'audits/production_readiness_completion_audit_v2_packet.json',
  'audits/final_preapproval_evidence_hash_lock_v2_packet.json',
  'audits/exact_approval_apply_rehearsal_v2_packet.json',
  'audits/exact_approval_source_firewall_v2_packet.json',
  'audits/exact_approval_source_intake_transition_v2_packet.json',
  'audits/exact_approval_active_artifact_pair_simulation_v2_packet.json',
  'audits/exact_approval_p31_create_command_preflight_v2_packet.json',
  'audits/exact_approval_p44_validation_command_preflight_v2_packet.json',
  'audits/exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.json',
  'audits/exact_approval_p45_sequence_command_preflight_v2_packet.json',
  'audits/exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.json',
  'audits/exact_approval_p46_apply_transaction_command_preflight_v2_packet.json',
  'audits/exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.json',
  'audits/exact_approval_p47_rollback_guard_command_preflight_v2_packet.json',
  'audits/exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.json',
  'audits/exact_approval_p48_safe_continuation_command_preflight_v2_packet.json',
  'audits/exact_approval_wait_state_v2_packet.json',
  'audits/french_research_json_firewall_audit.json',
  'audits/next_pass_goal_contract_packet.json',
  'audits/french_language_isolation_audit.json',
  'audits/french_translation_qa_audit.json',
  'audits/generated_content_audit.json',
  'audits/french_runtime_content_integrity_audit.json',
  'audits/french_duplicate_translation_review_packet.json',
  'audits/french_reviewer_handoff_packet.json',
  'audits/french_reviewer_handoff_integrity_audit.json',
  'audits/french_reviewer_batch_packet.json',
  'audits/french_reviewer_batch_files_packet.json',
  'audits/french_reviewer_batch_files_integrity_audit.json',
  'audits/french_review_decision_contract_packet.json',
  'audits/french_review_decision_template_integrity_audit.json',
  'audits/french_review_decision_import_dry_run.json',
  'audits/french_review_decision_import_dry_run_starter_priority_ordered_noop.json',
  'audits/french_review_decision_import_fixture_qa.json',
  'audits/french_reviewer_priority_audit.json',
  'audits/french_reviewer_priority_integrity_audit.json',
  'audits/french_reviewer_priority_batches_packet.json',
  'audits/french_reviewer_execution_work_order.json',
  'audits/french_review_starter_pack.json',
  'audits/french_review_progress_audit_starter_priority_ordered.json',
  'audits/readiness_blocker_reduction_packet.json',
  'audits/gustav_readiness_gate.json',
  'audits/run_validator_report.json',
];

const OPTIONAL_SOURCE_REPORTS = [
  'audits/ordered_approval_wait_refresh_v2_packet.json',
  'audits/safe_preapproval_continuation_v2_packet.json',
  'audits/final_production_readiness_gap_v2_packet.json',
  'audits/exact_approval_source_handoff_firewall_v2_packet.json',
  'audits/exact_approval_source_wait_terminal_state_v2_packet.json',
  'audits/post_exact_approval_apply_runbook_v2_packet.json',
];

const CRITICAL_REVIEWER_ARTIFACTS = [
  'generated/fr/reviewer/french_reviewer_queue.jsonl',
  'generated/fr/reviewer/french_reviewer_queue.tsv',
  'generated/fr/reviewer/french_review_batches.json',
  'generated/fr/reviewer/french_review_batch_files_manifest.json',
  'generated/fr/reviewer/french_review_decision_schema.json',
  'generated/fr/reviewer/french_review_decision_template.jsonl',
  'generated/fr/reviewer/french_review_decision_template.tsv',
  'generated/fr/reviewer/reviewer_workflow_v2_decision_schema.json',
  'generated/fr/reviewer/reviewer_decision_template_v2.jsonl',
  'generated/fr/reviewer/reviewer_decision_template_v2.tsv',
  'generated/fr/reviewer/reviewer_ai_decision_template_v2.jsonl',
  'generated/fr/reviewer/reviewer_ai_decision_template_v2.tsv',
  'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/row_decisions_reviewed_v2.jsonl',
  'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/ai_decisions_reviewed_v2.jsonl',
  'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/llm_official_source_promoted_decision_file_generation_manifest_v2.json',
  'pack_candidates/fr/target_pack_manifest_v2_draft.json',
  'pack_candidates/fr/runtime_server_delivery_contract_v2.json',
  'pack_candidates/fr/storage_cloud_target_map_v2.json',
  'pack_candidates/fr/admin_reviewer_delivery_surface_v2.json',
  'generated/fr/reviewer/french_reviewer_priority_queue.jsonl',
  'generated/fr/reviewer/french_reviewer_priority_queue.tsv',
  'generated/fr/reviewer/french_priority_review_batches_manifest.json',
  'generated/fr/reviewer/french_priority_review_batches_manifest.md',
  'generated/fr/reviewer/starter_pack/french_review_decision_template_priority_ordered.jsonl',
  'generated/fr/reviewer/starter_pack/french_review_decision_template_priority_ordered.tsv',
  'generated/fr/reviewer/starter_pack/french_review_focus_top_50.jsonl',
  'generated/fr/reviewer/starter_pack/french_review_focus_top_50.tsv',
  'generated/fr/reviewer/starter_pack/french_review_starter_pack_manifest.json',
  'generated/fr/reviewer/starter_pack/french_review_starter_pack_manifest.md',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function runPath(runDir: string, relativePath: string): string {
  return path.join(runDir, ...relativePath.split('/'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function n(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function b(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
  return false;
}

function s(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function fileMtimeMs(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
}

function extensionOf(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext || '(none)';
}

function countByExtension(files: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of files) {
    const ext = extensionOf(file);
    counts[ext] = (counts[ext] ?? 0) + 1;
  }
  return counts;
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function artifactEntry(repoRoot: string, filePath: string, category: ArtifactEntry['category'], kind: string): ArtifactEntry {
  const stat = fs.statSync(filePath);
  return {
    category,
    kind,
    path: artifactPath(repoRoot, filePath),
    bytes: stat.size,
    sha256: sha256(filePath),
  };
}

function sourceReport(repoRoot: string, filePath: string): SourceReportEntry {
  const body = asRecord(readJson<unknown>(filePath));
  const stat = fs.statSync(filePath);
  return {
    name: path.basename(filePath),
    path: artifactPath(repoRoot, filePath),
    status: s(body, 'status'),
    decision: s(body, 'decision'),
    bytes: stat.size,
    sha256: sha256(filePath),
    summary: asRecord(body.summary),
  };
}

function reportSummary(reports: SourceReportEntry[], name: string): Record<string, unknown> {
  const found = reports.find((report) => report.name === name);
  return found ? found.summary : {};
}

function countLedgerRows(filePath: string, findings: Finding[], repoRoot: string): number {
  try {
    const body = asRecord(readJson<unknown>(filePath));
    const rows = body.rows;
    if (!Array.isArray(rows)) {
      findings.push({
        severity: 'blocker',
        code: 'ledger_rows_missing',
        message: 'Generated lesson ledger does not contain a rows array.',
        path: artifactPath(repoRoot, filePath),
      });
      return 0;
    }
    return rows.length;
  } catch (error) {
    findings.push({
      severity: 'blocker',
      code: 'ledger_parse_error',
      message: `Could not parse generated lesson ledger: ${String(error)}`,
      path: artifactPath(repoRoot, filePath),
    });
    return 0;
  }
}

function isMasterManifestOutput(filePath: string): boolean {
  const name = path.basename(filePath);
  return name === 'french_reviewer_master_manifest.json' || name === 'french_reviewer_master_manifest.md';
}

function isMasterPacketOutput(filePath: string): boolean {
  const name = path.basename(filePath);
  return name === 'french_reviewer_master_manifest_packet.json' || name === 'french_reviewer_master_manifest_packet.md';
}

function addBlocker(findings: Finding[], code: string, message: string, filePath?: string, repoRoot?: string): void {
  findings.push({
    severity: 'blocker',
    code,
    message,
    path: filePath && repoRoot ? artifactPath(repoRoot, filePath) : undefined,
  });
}

function isAllowedTerminalWaitSelfCycleCode(code: string): boolean {
  return (
    code.startsWith('runtime_server_manifest_consistency_recheck_v2_') ||
    code.startsWith('language_isolation_regression_recheck_v2_') ||
    code.startsWith('runtime_delivery_evidence_chain_v2_') ||
    code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_') ||
    code.startsWith('nonproduction_blocker_closure_plan_v2_') ||
    code.startsWith('nonproduction_evidence_refresh_v2_') ||
    code.startsWith('exact_approval_wait_state_v2_') ||
    code.startsWith('production_readiness_completion_audit_v2_') ||
    code.startsWith('final_preapproval_evidence_hash_lock_v2_') ||
    code.startsWith('ordered_approval_wait_refresh_v2_') ||
    code.startsWith('safe_preapproval_continuation_v2_') ||
    code.startsWith('final_production_readiness_gap_v2_') ||
    code.startsWith('exact_approval_source_handoff_firewall_v2_') ||
    code.startsWith('exact_approval_source_wait_terminal_state_v2_')
  );
}

function isAllowedActivatedApprovalSelfCycleCode(code: string): boolean {
  return (
    code.startsWith('explicit_approval_receipt_creation_gate_v2_') ||
    code.startsWith('production_apply_absence_denial_gate_v2_') ||
    code.startsWith('approval_wait_safe_continuation_v2_') ||
    code.startsWith('final_preapproval_evidence_hash_lock_v2_') ||
    code.startsWith('exact_approval_apply_rehearsal_v2_') ||
    code.startsWith('exact_approval_source_firewall_v2_') ||
    code.startsWith('exact_approval_p44_to_p45_sequence_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p45_sequence_command_preflight_v2_') ||
    code.startsWith('exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p46_apply_transaction_command_preflight_v2_') ||
    code.startsWith('exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p47_rollback_guard_command_preflight_v2_') ||
    code.startsWith('exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_') ||
    code.startsWith('exact_approval_p48_safe_continuation_command_preflight_v2_') ||
    code.startsWith('exact_approval_wait_state_v2_') ||
    code === 'production_apply_transaction_contract_v2_unexpected_p49_locked_requirements' ||
    code === 'post_apply_rollback_guard_contract_v2_unexpected_p49_locked_requirements'
  );
}

function isAllowedPostApprovalLockedSelfCycleCode(code: string): boolean {
  if (
    code.includes('_ready_for_apply_open') ||
    code.includes('_may_modify_production_app_files_open') ||
    code.includes('_runtime_download') ||
    code.includes('_server_upload') ||
    code.includes('_firebase_upload') ||
    code.includes('_production_writes_open') ||
    code.includes('_can_start_production_apply_open')
  ) {
    return false;
  }
  return isAllowedActivatedApprovalSelfCycleCode(code) ||
    code.startsWith('exact_approval_source_handoff_firewall_v2_') ||
    code.startsWith('exact_approval_source_wait_terminal_state_v2_') ||
    code.startsWith('final_production_readiness_gap_v2_');
}

function renderMarkdown(report: MasterManifest): string {
  const lines = [
    '# GUSTAV French Reviewer Master Manifest',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Generated lesson ledgers: ${report.summary.generatedLessonLedgers}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Reviewer source files: ${report.summary.reviewerSourceFiles}`,
    `- Audit artifact files: ${report.summary.auditArtifactFiles}`,
    `- Batch JSONL files: ${report.summary.batchJsonlFiles}`,
    `- Batch TSV files: ${report.summary.batchTsvFiles}`,
    `- Queue rows: ${report.summary.queueRows}`,
    `- Decision template rows: ${report.summary.decisionTemplateRows}`,
    `- Translation QA blockers: ${report.summary.translationQaBlockers}`,
    `- Generated content blockers: ${report.summary.generatedContentBlockers}`,
    `- Runtime content integrity blockers: ${report.summary.runtimeContentIntegrityBlockers}`,
    `- Runtime content integrity warnings: ${report.summary.runtimeContentIntegrityWarnings}`,
    `- Runtime content integrity files/text fields scanned: ${report.summary.runtimeContentIntegrityFilesScanned}/${report.summary.runtimeContentIntegrityTextFieldsScanned}`,
    `- Runtime content integrity placeholder/mojibake/replacement fields: ${report.summary.runtimeContentIntegrityPlaceholderTextFields}/${report.summary.runtimeContentIntegrityMojibakeFields}/${report.summary.runtimeContentIntegrityReplacementCharFields}`,
    `- Runtime content integrity payload files: ${report.summary.runtimeContentIntegrityRuntimePayloadFiles}`,
    `- Handoff integrity blockers: ${report.summary.handoffIntegrityBlockers}`,
    `- Batch files integrity blockers: ${report.summary.batchFilesIntegrityBlockers}`,
    `- Decision template integrity blockers: ${report.summary.decisionTemplateIntegrityBlockers}`,
    `- Decision import dry-run blockers: ${report.summary.decisionImportDryRunBlockers}`,
    `- Starter no-op dry-run blockers: ${report.summary.starterNoopDryRunBlockers}`,
    `- Fixture QA blockers: ${report.summary.fixtureQaBlockers}`,
    `- Priority audit blockers: ${report.summary.priorityAuditBlockers}`,
    `- Priority integrity blockers: ${report.summary.priorityIntegrityBlockers}`,
    `- Priority batches blockers: ${report.summary.priorityBatchesBlockers}`,
    `- Language isolation blockers: ${report.summary.languageIsolationBlockers}`,
    `- Language isolation warnings: ${report.summary.languageIsolationWarnings}`,
    `- Rows missing targetLocale: ${report.summary.rowsMissingTargetLocale}`,
    `- Reviewer execution work-order blockers: ${report.summary.reviewerExecutionWorkOrderBlockers}`,
    `- Review starter pack blockers: ${report.summary.reviewStarterPackBlockers}`,
    `- Review progress blockers: ${report.summary.reviewProgressBlockers}`,
    `- Self-improving upgrade blockers: ${report.summary.selfImprovingUpgradeBlockers}`,
    `- Unresolved critical weaknesses: ${report.summary.unresolvedCriticalWeaknesses}`,
    `- Generation history blockers: ${report.summary.generationHistoryBlockers}`,
    `- Generation history warnings: ${report.summary.generationHistoryWarnings}`,
    `- Legacy generated without research pack rows: ${report.summary.legacyGeneratedWithoutResearchPackRows}`,
    `- Generated rows missing researchEvidenceIds: ${report.summary.generatedRowsMissingResearchEvidenceIds}`,
    `- Legacy generated research evidence bridge covers legacy gaps: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2CoversLegacyResearchGaps ? 'yes' : 'no'}`,
    `- Effective legacy/generated research gaps after bridge: ${report.summary.effectiveLegacyGeneratedWithoutResearchPackRows}/${report.summary.effectiveGeneratedRowsMissingResearchEvidenceIds}`,
    `- App atlas refresh blockers: ${report.summary.appAtlasRefreshBlockers}`,
    `- App atlas refresh warnings: ${report.summary.appAtlasRefreshWarnings}`,
    `- App atlas target-sensitive files: ${report.summary.appAtlasTargetSensitiveFiles}`,
    `- App atlas unclassified target-sensitive files: ${report.summary.appAtlasUnclassifiedTargetSensitiveFiles}`,
    `- App atlas AI prompt entrypoints: ${report.summary.appAtlasAiPromptEntrypoints}`,
    `- Domain Registry V2 blockers: ${report.summary.domainRegistryV2Blockers}`,
    `- Domain Registry V2 warnings: ${report.summary.domainRegistryV2Warnings}`,
    `- Domain Registry V2 domains: ${report.summary.domainRegistryV2Domains}`,
    `- Domain Registry V2 AI prompt entrypoints covered: ${report.summary.domainRegistryV2AiPromptEntrypointsCovered}/${report.summary.domainRegistryV2AiPromptEntrypoints}`,
    `- Target research pack builder blockers: ${report.summary.targetResearchPackBuilderBlockers}`,
    `- Target research pack builder warnings: ${report.summary.targetResearchPackBuilderWarnings}`,
    `- Target research pack verifier blockers: ${report.summary.targetResearchPackVerifyBlockers}`,
    `- Target research pack verifier warnings: ${report.summary.targetResearchPackVerifyWarnings}`,
    `- Research pack present: ${report.summary.researchPackPresent ? 'yes' : 'no'}`,
    `- Verified trusted sources: ${report.summary.verifiedTrustedSources}`,
    `- Verified grammar clusters: ${report.summary.verifiedGrammarClusters}`,
    `- Research pack fixture probes: ${report.summary.researchPackFixtureProbesPassed}/${report.summary.researchPackFixtureProbes}`,
    `- Ready for pedagogy blueprint: ${report.summary.readyForPedagogyBlueprint ? 'yes' : 'no'}`,
    `- Target pedagogy blueprint blockers: ${report.summary.targetPedagogyBlueprintBlockers}`,
    `- Target pedagogy blueprint warnings: ${report.summary.targetPedagogyBlueprintWarnings}`,
    `- Pedagogy blueprint present: ${report.summary.pedagogyBlueprintPresent ? 'yes' : 'no'}`,
    `- Pedagogy blueprint row mappings: ${report.summary.pedagogyBlueprintRowMappings}`,
    `- Pedagogy blueprint category policies: ${report.summary.pedagogyBlueprintCategoryPolicies}`,
    `- Pedagogy blueprint app-domain policies: ${report.summary.pedagogyBlueprintAppDomainPolicies}`,
    `- Pedagogy blueprint fixture probes: ${report.summary.pedagogyBlueprintFixtureProbesPassed}/${report.summary.pedagogyBlueprintFixtureProbes}`,
    `- Ready for Generation Schema V2: ${report.summary.readyForGenerationSchemaV2 ? 'yes' : 'no'}`,
    `- Generation Schema V2 blockers: ${report.summary.generationSchemaV2Blockers}`,
    `- Generation Schema V2 warnings: ${report.summary.generationSchemaV2Warnings}`,
    `- Generation Schema V2 present: ${report.summary.generationSchemaV2Present ? 'yes' : 'no'}`,
    `- Generation Schema V2 row requirements: ${report.summary.generationSchemaV2RowRequirements}`,
    `- Generation Schema V2 domain contracts: ${report.summary.generationSchemaV2DomainContracts}`,
    `- Generation Schema V2 fixture probes: ${report.summary.generationSchemaV2FixtureProbesPassed}/${report.summary.generationSchemaV2FixtureProbes}`,
    `- Ready for AI Prompt Contract V2: ${report.summary.readyForAiPromptContractV2 ? 'yes' : 'no'}`,
    `- AI Prompt Contract V2 blockers: ${report.summary.aiPromptContractV2Blockers}`,
    `- AI Prompt Contract V2 warnings: ${report.summary.aiPromptContractV2Warnings}`,
    `- AI Prompt Contract V2 present: ${report.summary.aiPromptContractV2Present ? 'yes' : 'no'}`,
    `- AI Prompt Contract V2 entrypoints: ${report.summary.aiPromptContractV2Entrypoints}`,
    `- AI Prompt Contract V2 domains: ${report.summary.aiPromptContractV2Domains}`,
    `- AI Prompt Contract V2 reject before return/cache: ${report.summary.aiPromptContractV2RejectBeforeReturn}/${report.summary.aiPromptContractV2RejectBeforeCache}`,
    `- AI Prompt Contract V2 critical classes/files: ${report.summary.aiPromptContractV2CriticalSurfaceClassesCovered}/${report.summary.aiPromptContractV2CriticalSurfaceClassesExpected} classes, ${report.summary.aiPromptContractV2CriticalSurfaceRequiredFilesCovered}/${report.summary.aiPromptContractV2CriticalSurfaceRequiredFiles} files`,
    `- AI Prompt Contract V2 critical reject/cache/fallback: ${report.summary.aiPromptContractV2CriticalSurfaceRejectBeforeReturn}/${report.summary.aiPromptContractV2CriticalSurfaceRejectBeforeCache}/${report.summary.aiPromptContractV2CriticalSurfaceSafeFallback} of ${report.summary.aiPromptContractV2CriticalSurfaceContracts}`,
    `- AI Prompt Contract V2 fixture probes: ${report.summary.aiPromptContractV2FixtureProbesPassed}/${report.summary.aiPromptContractV2FixtureProbes}`,
    `- Ready for Content Quality Gates V2: ${report.summary.readyForContentQualityGatesV2 ? 'yes' : 'no'}`,
    `- Content Quality Gates V2 blockers: ${report.summary.contentQualityGatesV2Blockers}`,
    `- Content Quality Gates V2 warnings: ${report.summary.contentQualityGatesV2Warnings}`,
    `- Content Quality Gates V2 present: ${report.summary.contentQualityGatesV2Present ? 'yes' : 'no'}`,
    `- Content quality row requirements: ${report.summary.contentQualityRowRequirements}`,
    `- Content quality AI requirements: ${report.summary.contentQualityAiRequirements}`,
    `- Content quality high-risk AI requirements: ${report.summary.contentQualityHighRiskAiRequirements}`,
    `- Content Quality Gates V2 fixture probes: ${report.summary.contentQualityFixtureProbesPassed}/${report.summary.contentQualityFixtureProbes}`,
    `- Ready for Reviewer Workflow V2: ${report.summary.readyForReviewerWorkflowV2 ? 'yes' : 'no'}`,
    `- Reviewer Workflow V2 blockers: ${report.summary.reviewerWorkflowV2Blockers}`,
    `- Reviewer Workflow V2 warnings: ${report.summary.reviewerWorkflowV2Warnings}`,
    `- Reviewer Workflow V2 present: ${report.summary.reviewerWorkflowV2Present ? 'yes' : 'no'}`,
    `- Reviewer Workflow V2 row templates: ${report.summary.reviewerWorkflowV2RowTemplates}`,
    `- Reviewer Workflow V2 AI templates: ${report.summary.reviewerWorkflowV2AiTemplates}`,
    `- Reviewer Workflow V2 high-risk AI templates: ${report.summary.reviewerWorkflowV2HighRiskAiTemplates}`,
    `- Reviewer Workflow V2 row probes: ${report.summary.reviewerWorkflowV2RowFixtureProbesPassed}/${report.summary.reviewerWorkflowV2RowFixtureProbes}`,
    `- Reviewer Workflow V2 AI probes: ${report.summary.reviewerWorkflowV2AiFixtureProbesPassed}/${report.summary.reviewerWorkflowV2AiFixtureProbes}`,
    `- Ready for LLM official-source review V2: ${report.summary.readyForLlmOfficialSourceReviewV2 ? 'yes' : 'no'}`,
    `- Ready for decision import V2: ${report.summary.readyForDecisionImportV2 ? 'yes' : 'no'}`,
    `- Ready for Brain Gate V2: ${report.summary.readyForBrainGateV2 ? 'yes' : 'no'}`,
    `- Target Pack Manifest V2 blockers: ${report.summary.targetPackManifestV2Blockers}`,
    `- Target Pack Manifest V2 warnings: ${report.summary.targetPackManifestV2Warnings}`,
    `- Target Pack Manifest V2 present: ${report.summary.targetPackManifestV2Present ? 'yes' : 'no'}`,
    `- Target Pack Manifest V2 production blockers: ${report.summary.targetPackManifestV2ProductionBlockers}`,
    `- Target Pack Manifest V2 runtime slice drafts: ${report.summary.targetPackManifestV2RuntimeSliceDrafts}`,
    `- Target Pack Manifest V2 gate reports: ${report.summary.targetPackManifestV2GateReports}`,
    `- Target Pack Manifest V2 lesson rows: ${report.summary.targetPackManifestV2LessonRows}`,
    `- Target Pack Manifest V2 AI decision slots: ${report.summary.targetPackManifestV2AiDecisionSlots}`,
    `- Ready for Runtime/Server Delivery Contract V2: ${report.summary.readyForRuntimeServerDeliveryContractV2 ? 'yes' : 'no'}`,
    `- Runtime/Server Delivery Contract V2 blockers: ${report.summary.runtimeServerDeliveryContractV2Blockers}`,
    `- Runtime/Server Delivery Contract V2 warnings: ${report.summary.runtimeServerDeliveryContractV2Warnings}`,
    `- Runtime/Server Delivery Contract V2 present: ${report.summary.runtimeServerDeliveryContractV2Present ? 'yes' : 'no'}`,
    `- Runtime/Server Delivery Contract V2 required slices: ${report.summary.runtimeServerDeliveryContractV2RequiredSlices}`,
    `- Runtime/Server Delivery Contract V2 cache-key contracts: ${report.summary.runtimeServerDeliveryContractV2CacheKeyContracts}`,
    `- Runtime/Server Delivery Contract V2 production blockers: ${report.summary.runtimeServerDeliveryContractV2ProductionBlockers}`,
    `- Runtime/Server Delivery Contract V2 startup imports runtime: ${report.summary.runtimeServerDeliveryContractV2StartupImportsRuntime ? 'yes' : 'no'}`,
    `- Runtime/Server Delivery Contract V2 loader network/fs imports: ${report.summary.runtimeServerDeliveryContractV2LoaderNetworkOrFsImports ? 'yes' : 'no'}`,
    `- Runtime/Server Delivery Contract V2 server upload allowed: ${report.summary.runtimeServerDeliveryContractV2ServerUploadAllowed ? 'yes' : 'no'}`,
    `- Runtime/Server Delivery Contract V2 runtime download open flags: ${report.summary.runtimeServerDeliveryContractV2RuntimeDownloadsOpenFlags}`,
    `- Ready for Storage/Cloud Target Map V2: ${report.summary.readyForStorageCloudTargetMapV2 ? 'yes' : 'no'}`,
    `- Storage/Cloud Target Map V2 blockers: ${report.summary.storageCloudTargetMapV2Blockers}`,
    `- Storage/Cloud Target Map V2 warnings: ${report.summary.storageCloudTargetMapV2Warnings}`,
    `- Storage/Cloud Target Map V2 present: ${report.summary.storageCloudTargetMapV2Present ? 'yes' : 'no'}`,
    `- Storage/Cloud Target Map V2 target key domains: ${report.summary.storageCloudTargetMapV2TargetKeyDomains}`,
    `- Storage/Cloud Target Map V2 scoped factories: ${report.summary.storageCloudTargetMapV2ScopedFactories}`,
    `- Storage/Cloud Target Map V2 French sync key refs: ${report.summary.storageCloudTargetMapV2FrenchSyncKeyRefs}`,
    `- Storage/Cloud Target Map V2 tested surfaces: ${report.summary.storageCloudTargetMapV2TestedSurfaces}`,
    `- Storage/Cloud Target Map V2 production blockers: ${report.summary.storageCloudTargetMapV2ProductionBlockers}`,
    `- Storage/Cloud Target Map V2 storage migration allowed: ${report.summary.storageCloudTargetMapV2StorageMigrationAllowed ? 'yes' : 'no'}`,
    `- Storage/Cloud Target Map V2 cloud sync migration allowed: ${report.summary.storageCloudTargetMapV2CloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Storage/Cloud Target Map V2 Firebase writes opened: ${report.summary.storageCloudTargetMapV2FirebaseWritesOpened ? 'yes' : 'no'}`,
    `- Storage/Cloud Target Map V2 ready-for-apply open flags: ${report.summary.storageCloudTargetMapV2ReadyForApplyOpenFlags}`,
    `- Ready for Admin Pack Delivery Surface V2: ${report.summary.readyForAdminPackDeliverySurfaceV2 ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 blockers: ${report.summary.adminReviewerDeliverySurfaceV2Blockers}`,
    `- Admin/Reviewer Delivery Surface V2 warnings: ${report.summary.adminReviewerDeliverySurfaceV2Warnings}`,
    `- Admin/Reviewer Delivery Surface V2 present: ${report.summary.adminReviewerDeliverySurfaceV2Present ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 admin surface files: ${report.summary.adminReviewerDeliverySurfaceV2AdminSurfaceFiles}`,
    `- Admin/Reviewer Delivery Surface V2 reviewer artifacts: ${report.summary.adminReviewerDeliverySurfaceV2ReviewerArtifacts}`,
    `- Admin/Reviewer Delivery Surface V2 row decision rows: ${report.summary.adminReviewerDeliverySurfaceV2RowDecisionRows}`,
    `- Admin/Reviewer Delivery Surface V2 AI decision rows: ${report.summary.adminReviewerDeliverySurfaceV2AiDecisionRows}`,
    `- Admin/Reviewer Delivery Surface V2 approval fields: ${report.summary.adminReviewerDeliverySurfaceV2RequiredApprovalFields}`,
    `- Admin/Reviewer Delivery Surface V2 admin gates: ${report.summary.adminReviewerDeliverySurfaceV2RequiredAdminGates}`,
    `- Admin/Reviewer Delivery Surface V2 production blockers: ${report.summary.adminReviewerDeliverySurfaceV2ProductionBlockers}`,
    `- Admin/Reviewer Delivery Surface V2 server upload allowed: ${report.summary.adminReviewerDeliverySurfaceV2ServerUploadAllowed ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 Firebase upload allowed: ${report.summary.adminReviewerDeliverySurfaceV2FirebaseUploadAllowed ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 reviewer import allowed: ${report.summary.adminReviewerDeliverySurfaceV2ReviewerImportAllowed ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 runtime downloads enabled: ${report.summary.adminReviewerDeliverySurfaceV2RuntimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Admin/Reviewer Delivery Surface V2 activation approved flags: ${report.summary.adminReviewerDeliverySurfaceV2ActivationApprovedFlags}`,
    `- Admin/Reviewer Delivery Surface V2 ready-for-apply open flags: ${report.summary.adminReviewerDeliverySurfaceV2ReadyForApplyOpenFlags}`,
    `- Ready for Reviewer Decision Import V2 dry-run: ${report.summary.readyForReviewerDecisionImportV2DryRun ? 'yes' : 'no'}`,
    `- Reviewer Decision Import V2 dry-run blockers: ${report.summary.reviewerDecisionImportV2DryRunBlockers}`,
    `- Reviewer Decision Import V2 dry-run warnings: ${report.summary.reviewerDecisionImportV2DryRunWarnings}`,
    `- Reviewer Decision Import V2 dry-run present: ${report.summary.reviewerDecisionImportV2DryRunPresent ? 'yes' : 'no'}`,
    `- Reviewer Decision Import V2 dry-run row decisions: ${report.summary.reviewerDecisionImportV2DryRunRowDecisionRows}`,
    `- Reviewer Decision Import V2 dry-run AI decisions: ${report.summary.reviewerDecisionImportV2DryRunAiDecisionRows}`,
    `- Reviewer Decision Import V2 dry-run LLM-reviewed row decisions: ${report.summary.reviewerDecisionImportV2DryRunReviewedRowDecisions}`,
    `- Reviewer Decision Import V2 dry-run LLM-reviewed AI decisions: ${report.summary.reviewerDecisionImportV2DryRunReviewedAiDecisions}`,
    `- Reviewer Decision Import V2 dry-run row no-op rows: ${report.summary.reviewerDecisionImportV2DryRunRowNoOpRows}`,
    `- Reviewer Decision Import V2 dry-run AI no-op rows: ${report.summary.reviewerDecisionImportV2DryRunAiNoOpRows}`,
    `- Reviewer Decision Import V2 dry-run row probes: ${report.summary.reviewerDecisionImportV2DryRunRowProbesPassed}/${report.summary.reviewerDecisionImportV2DryRunRowProbes}`,
    `- Reviewer Decision Import V2 dry-run AI probes: ${report.summary.reviewerDecisionImportV2DryRunAiProbesPassed}/${report.summary.reviewerDecisionImportV2DryRunAiProbes}`,
    `- Reviewer Decision Import V2 dry-run reviewer import open flags: ${report.summary.reviewerDecisionImportV2DryRunReviewerImportOpenFlags}`,
    `- Reviewer Decision Import V2 dry-run production apply open flags: ${report.summary.reviewerDecisionImportV2DryRunProductionApplyOpenFlags}`,
    `- Reviewer Decision Import V2 dry-run activation approved flags: ${report.summary.reviewerDecisionImportV2DryRunActivationApprovedFlags}`,
    `- Reviewer Decision Import V2 dry-run generated ledger writes: ${report.summary.reviewerDecisionImportV2DryRunGeneratedLedgerWrites ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 ready: ${report.summary.officialSourceImportDryRunV2Ready ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 rows/AI: ${report.summary.officialSourceImportDryRunV2Rows}/${report.summary.officialSourceImportDryRunV2Ai}`,
    `- Official-source import dry-run V2 accepted rows/AI: ${report.summary.officialSourceImportDryRunV2AcceptedRows}/${report.summary.officialSourceImportDryRunV2AcceptedAi}`,
    `- Official-source import dry-run V2 promoted row/AI files used: ${report.summary.officialSourceImportDryRunV2PromotedRowFileUsed ? 'yes' : 'no'}/${report.summary.officialSourceImportDryRunV2PromotedAiFileUsed ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 ready for execution gate refresh: ${report.summary.officialSourceImportDryRunV2ReadyForExecutionGateRefresh ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 ready for apply: ${report.summary.officialSourceImportDryRunV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 may modify production app files: ${report.summary.officialSourceImportDryRunV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Official-source import dry-run V2 row/AI probes: ${report.summary.officialSourceImportDryRunV2RowProbesPassed}/${report.summary.officialSourceImportDryRunV2RowProbes} ${report.summary.officialSourceImportDryRunV2AiProbesPassed}/${report.summary.officialSourceImportDryRunV2AiProbes}`,
    `- Ready for payload shard materialization gate: ${report.summary.readyForPayloadShardMaterializationGate ? 'yes' : 'no'}`,
    `- Payload shard materialization/checksum V2 blockers: ${report.summary.payloadShardMaterializationChecksumV2Blockers}`,
    `- Payload shard materialization/checksum V2 present: ${report.summary.payloadShardMaterializationChecksumV2Present ? 'yes' : 'no'}`,
    `- Payload shard materialization/checksum V2 contracts: ${report.summary.payloadShardMaterializationChecksumV2MaterializationContracts}/${report.summary.payloadShardMaterializationChecksumV2ExpectedRuntimeSlices}`,
    `- Payload shard materialization/checksum V2 existing/accounted/unaccounted future artifacts: ${report.summary.payloadShardMaterializationChecksumV2FutureArtifactFilesPresent}/${report.summary.payloadShardMaterializationChecksumV2PreExistingLocalMaterializationAccounted ? 'yes' : 'no'}/${report.summary.payloadShardMaterializationChecksumV2UnaccountedFutureArtifactFilesPresent}`,
    `- Ready for server manifest preview gate: ${report.summary.readyForServerManifestPreviewGate ? 'yes' : 'no'}`,
    `- Server delivery manifest preview V2 blockers: ${report.summary.serverDeliveryManifestPreviewV2Blockers}`,
    `- Server delivery manifest preview V2 present: ${report.summary.serverDeliveryManifestPreviewV2Present ? 'yes' : 'no'}`,
    `- Server delivery manifest preview V2 entries: ${report.summary.serverDeliveryManifestPreviewV2PreviewEntries}/${report.summary.serverDeliveryManifestPreviewV2ExpectedPreviewEntries}`,
    `- Ready for runtime cache integrity gate: ${report.summary.readyForRuntimeCacheIntegrityGate ? 'yes' : 'no'}`,
    `- Runtime cache integrity/rollback V2 blockers: ${report.summary.runtimeCacheIntegrityRollbackV2Blockers}`,
    `- Runtime cache integrity/rollback V2 present: ${report.summary.runtimeCacheIntegrityRollbackV2Present ? 'yes' : 'no'}`,
    `- Runtime cache integrity/rollback V2 cache contracts: ${report.summary.runtimeCacheIntegrityRollbackV2CacheIntegrityContracts}`,
    `- Runtime cache integrity/rollback V2 fixture probes: ${report.summary.runtimeCacheIntegrityRollbackV2FixtureProbesPassed}/${report.summary.runtimeCacheIntegrityRollbackV2FixtureProbes}`,
    `- Ready for reviewer decision import opening gate: ${report.summary.readyForReviewerDecisionImportOpeningGate ? 'yes' : 'no'}`,
    `- Reviewer decision import opening preflight V2 blockers: ${report.summary.reviewerDecisionImportOpeningPreflightV2Blockers}`,
    `- Reviewer decision import opening preflight V2 present: ${report.summary.reviewerDecisionImportOpeningPreflightV2Present ? 'yes' : 'no'}`,
    `- Reviewer decision import opening preflight V2 state: ${report.summary.reviewerDecisionImportOpeningPreflightV2OpeningState}`,
    `- Reviewer decision import opening preflight V2 eligible: ${report.summary.reviewerDecisionImportOpeningPreflightV2OpeningEligible ? 'yes' : 'no'}`,
    `- Reviewer decision import opening preflight V2 reviewed rows: ${report.summary.reviewerDecisionImportOpeningPreflightV2ReviewedRowDecisions}/${report.summary.reviewerDecisionImportOpeningPreflightV2RowDecisionRows}`,
    `- Reviewer decision import opening preflight V2 reviewed AI: ${report.summary.reviewerDecisionImportOpeningPreflightV2ReviewedAiDecisions}/${report.summary.reviewerDecisionImportOpeningPreflightV2AiDecisionRows}`,
    `- Reviewer decision import opening preflight V2 blank rows/AI: ${report.summary.reviewerDecisionImportOpeningPreflightV2BlankRowDecisions}/${report.summary.reviewerDecisionImportOpeningPreflightV2BlankAiDecisions}`,
    `- Reviewer decision import opening preflight V2 import allowed now: ${report.summary.reviewerDecisionImportOpeningPreflightV2ReviewerImportAllowedNow ? 'yes' : 'no'}`,
    `- Reviewer decision import opening preflight V2 execution gate ready: ${report.summary.reviewerDecisionImportOpeningPreflightV2ExecutionGateReady ? 'yes' : 'no'}`,
    `- Reviewer decision import opening preflight V2 fixture probes: ${report.summary.reviewerDecisionImportOpeningPreflightV2FixtureProbesPassed}/${report.summary.reviewerDecisionImportOpeningPreflightV2FixtureProbes}`,
    `- Ready for reviewer decision import opening preflight: ${report.summary.readyForReviewerDecisionImportOpeningPreflight ? 'yes' : 'no'}`,
    `- LLM official-source review intake V2 blockers: ${report.summary.llmOfficialSourceReviewIntakeV2Blockers}`,
    `- LLM official-source review intake V2 present: ${report.summary.llmOfficialSourceReviewIntakeV2Present ? 'yes' : 'no'}`,
    `- LLM official-source review intake V2 state: ${report.summary.llmOfficialSourceReviewIntakeV2State}`,
    `- LLM official-source review intake V2 reviewed rows: ${report.summary.llmOfficialSourceReviewIntakeV2ReviewedRowDecisions}/${report.summary.llmOfficialSourceReviewIntakeV2RowDecisionRows} (${report.summary.llmOfficialSourceReviewIntakeV2RowCoveragePct}%)`,
    `- LLM official-source review intake V2 reviewed AI: ${report.summary.llmOfficialSourceReviewIntakeV2ReviewedAiDecisions}/${report.summary.llmOfficialSourceReviewIntakeV2AiDecisionRows} (${report.summary.llmOfficialSourceReviewIntakeV2AiCoveragePct}%)`,
    `- LLM official-source review intake V2 accepted rows/AI: ${report.summary.llmOfficialSourceReviewIntakeV2AcceptedRowDecisions}/${report.summary.llmOfficialSourceReviewIntakeV2AcceptedAiDecisions}`,
    `- LLM official-source review intake V2 blank rows/AI: ${report.summary.llmOfficialSourceReviewIntakeV2BlankRowDecisions}/${report.summary.llmOfficialSourceReviewIntakeV2BlankAiDecisions}`,
    `- LLM official-source review intake V2 buckets lesson/batch/gate/AI-domain: ${report.summary.llmOfficialSourceReviewIntakeV2LessonCoverageBuckets}/${report.summary.llmOfficialSourceReviewIntakeV2BatchCoverageBuckets}/${report.summary.llmOfficialSourceReviewIntakeV2GateCoverageBuckets}/${report.summary.llmOfficialSourceReviewIntakeV2AiDomainCoverageBuckets}`,
    `- LLM official-source review intake V2 import allowed now: ${report.summary.llmOfficialSourceReviewIntakeV2ReviewerImportAllowedNow ? 'yes' : 'no'}`,
    `- LLM official-source review intake V2 execution gate ready: ${report.summary.llmOfficialSourceReviewIntakeV2ExecutionGateReady ? 'yes' : 'no'}`,
    `- LLM official-source review intake V2 fixture probes: ${report.summary.llmOfficialSourceReviewIntakeV2FixtureProbesPassed}/${report.summary.llmOfficialSourceReviewIntakeV2FixtureProbes}`,
    `- Ready for LLM official-source review intake: ${report.summary.readyForLlmOfficialSourceReviewIntake ? 'yes' : 'no'}`,
    `- Ready for reviewer decision import execution gate: ${report.summary.readyForReviewerDecisionImportExecutionGate ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 blockers: ${report.summary.reviewerDecisionImportExecutionGateV2Blockers}`,
    `- Reviewer decision import execution gate V2 present: ${report.summary.reviewerDecisionImportExecutionGateV2Present ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 state: ${report.summary.reviewerDecisionImportExecutionGateV2State}`,
    `- Reviewer decision import execution gate V2 would run: ${report.summary.reviewerDecisionImportExecutionGateV2WouldRun ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 reviewed rows/AI: ${report.summary.reviewerDecisionImportExecutionGateV2ReviewedRowDecisions}/${report.summary.reviewerDecisionImportExecutionGateV2ReviewedAiDecisions}`,
    `- Reviewer decision import execution gate V2 accepted rows/AI: ${report.summary.reviewerDecisionImportExecutionGateV2AcceptedRowDecisions}/${report.summary.reviewerDecisionImportExecutionGateV2AcceptedAiDecisions}`,
    `- Reviewer decision import execution gate V2 upstream counts consistent: ${report.summary.reviewerDecisionImportExecutionGateV2UpstreamCountsConsistent ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 payload preflight ready: ${report.summary.reviewerDecisionImportExecutionGateV2PayloadCreationApprovalPreflightReady ? 'yes' : 'no'}`,
    `- Reviewer decision import execution gate V2 fixture probes: ${report.summary.reviewerDecisionImportExecutionGateV2FixtureProbesPassed}/${report.summary.reviewerDecisionImportExecutionGateV2FixtureProbes}`,
    `- Official-source import execution gate V2 ready: ${report.summary.officialSourceImportExecutionGateV2Ready ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 state: ${report.summary.officialSourceImportExecutionGateV2State}`,
    `- Official-source import execution gate V2 would run: ${report.summary.officialSourceImportExecutionGateV2WouldRun ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 P13 coverage ready: ${report.summary.officialSourceImportExecutionGateV2P13CoverageReady ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 promoted row/AI files used: ${report.summary.officialSourceImportExecutionGateV2PromotedRowFileUsed ? 'yes' : 'no'}/${report.summary.officialSourceImportExecutionGateV2PromotedAiFileUsed ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 ready for payload preflight: ${report.summary.officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 ready for apply: ${report.summary.officialSourceImportExecutionGateV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 may modify production app files: ${report.summary.officialSourceImportExecutionGateV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Official-source import execution gate V2 fixture probes: ${report.summary.officialSourceImportExecutionGateV2FixtureProbesPassed}/${report.summary.officialSourceImportExecutionGateV2FixtureProbes}`,
    `- LLM official-source decision materialization V2 blockers: ${report.summary.llmOfficialSourceDecisionMaterializationV2Blockers}`,
    `- LLM official-source decision materialization V2 present: ${report.summary.llmOfficialSourceDecisionMaterializationV2Present ? 'yes' : 'no'}`,
    `- LLM official-source decision materialization V2 state: ${report.summary.llmOfficialSourceDecisionMaterializationV2State}`,
    `- LLM official-source decision materialization V2 rows/AI: ${report.summary.llmOfficialSourceDecisionMaterializationV2RowDecisionRows}/${report.summary.llmOfficialSourceDecisionMaterializationV2AiDecisionRows}`,
    `- LLM official-source decision materialization V2 reviewed rows/AI: ${report.summary.llmOfficialSourceDecisionMaterializationV2CurrentReviewedRowDecisions}/${report.summary.llmOfficialSourceDecisionMaterializationV2CurrentReviewedAiDecisions}`,
    `- LLM official-source decision materialization V2 legacy external review dependency required: ${report.summary.llmOfficialSourceDecisionMaterializationV2NonLlmReviewDependencyRequired ? 'yes' : 'no'}`,
    `- LLM official-source decision materialization V2 ready for dry-run: ${report.summary.llmOfficialSourceDecisionMaterializationV2ReadyForDryRun ? 'yes' : 'no'}`,
    `- LLM official-source decision materialization V2 fixture probes: ${report.summary.llmOfficialSourceDecisionMaterializationV2FixtureProbesPassed}/${report.summary.llmOfficialSourceDecisionMaterializationV2FixtureProbes}`,
    `- LLM official-source decision dry-run V2 blockers: ${report.summary.llmOfficialSourceDecisionDryRunV2Blockers}`,
    `- LLM official-source decision dry-run V2 present: ${report.summary.llmOfficialSourceDecisionDryRunV2Present ? 'yes' : 'no'}`,
    `- LLM official-source decision dry-run V2 state: ${report.summary.llmOfficialSourceDecisionDryRunV2State}`,
    `- LLM official-source decision dry-run V2 proposals rows/AI: ${report.summary.llmOfficialSourceDecisionDryRunV2RowCandidateProposals}/${report.summary.llmOfficialSourceDecisionDryRunV2AiCandidateProposals}`,
    `- LLM official-source decision dry-run V2 pending rows/AI: ${report.summary.llmOfficialSourceDecisionDryRunV2PendingRowCandidates}/${report.summary.llmOfficialSourceDecisionDryRunV2PendingAiCandidates}`,
    `- LLM official-source decision dry-run V2 accepted rows/AI: ${report.summary.llmOfficialSourceDecisionDryRunV2AcceptedRowCandidates}/${report.summary.llmOfficialSourceDecisionDryRunV2AcceptedAiCandidates}`,
    `- LLM official-source decision dry-run V2 proposal files written: ${report.summary.llmOfficialSourceDecisionDryRunV2ProposalFilesWritten}`,
    `- LLM official-source decision dry-run V2 candidate writes confined: ${report.summary.llmOfficialSourceDecisionDryRunV2CandidateWritesConfined ? 'yes' : 'no'}`,
    `- LLM official-source decision dry-run V2 ready for promotion preflight: ${report.summary.llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight ? 'yes' : 'no'}`,
    `- LLM official-source decision dry-run V2 fixture probes: ${report.summary.llmOfficialSourceDecisionDryRunV2FixtureProbesPassed}/${report.summary.llmOfficialSourceDecisionDryRunV2FixtureProbes}`,
    `- LLM official-source decision promotion preflight V2 blockers: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2Blockers}`,
    `- LLM official-source decision promotion preflight V2 present: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2Present ? 'yes' : 'no'}`,
    `- LLM official-source decision promotion preflight V2 state: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2State}`,
    `- LLM official-source decision promotion preflight V2 proposals rows/AI: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2RowCandidateProposals}/${report.summary.llmOfficialSourceDecisionPromotionPreflightV2AiCandidateProposals}`,
    `- LLM official-source decision promotion preflight V2 accepted rows/AI: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2AcceptedRowCandidates}/${report.summary.llmOfficialSourceDecisionPromotionPreflightV2AcceptedAiCandidates}`,
    `- LLM official-source decision promotion preflight V2 promoted files written: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2PromotedDecisionFilesWritten}`,
    `- LLM official-source decision promotion preflight V2 targets confined: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2FutureTargetsConfined ? 'yes' : 'no'}`,
    `- LLM official-source decision promotion preflight V2 ready for promoted file generation: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration ? 'yes' : 'no'}`,
    `- LLM official-source decision promotion preflight V2 fixture probes: ${report.summary.llmOfficialSourceDecisionPromotionPreflightV2FixtureProbesPassed}/${report.summary.llmOfficialSourceDecisionPromotionPreflightV2FixtureProbes}`,
    `- LLM official-source promoted decision file generation V2 blockers: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2Blockers}`,
    `- LLM official-source promoted decision file generation V2 present: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2Present ? 'yes' : 'no'}`,
    `- LLM official-source promoted decision file generation V2 state: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2State}`,
    `- LLM official-source promoted decision file generation V2 built rows/AI: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2RowDecisionRowsBuilt}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2AiDecisionRowsBuilt}`,
    `- LLM official-source promoted decision file generation V2 accepted rows/AI: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRowDecisions}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions}`,
    `- LLM official-source promoted decision file generation V2 evidence notes rows/AI: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2RowsWithEvidenceNotes}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2AiWithEvidenceNotes}`,
    `- LLM official-source promoted decision file generation V2 output confined: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2OutputTargetsConfined ? 'yes' : 'no'}`,
    `- LLM official-source promoted decision file generation V2 ready for import refresh: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh ? 'yes' : 'no'}`,
    `- LLM official-source promoted decision file generation V2 AI prompt-contract ready: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractReady ? 'yes' : 'no'}`,
    `- LLM official-source promoted decision file generation V2 AI prompt-contract match/extra/missing: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMatchedToPromptContracts}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiExtraContracts}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMissingContracts}`,
    `- LLM official-source promoted decision file generation V2 AI critical/cache/return/cache-close/fallback: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContractsMatched}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCacheDimensionsMatchedToPromptContract}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshReturnClosedByPromptContract}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshCacheClosedByPromptContract}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageFallbackClosedByPromptContract}`,
    `- LLM official-source promoted decision file generation V2 fixture probes: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes}`,
    `- Legacy generated research evidence bridge V2 ready: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2Ready ? 'yes' : 'no'}`,
    `- Legacy generated research evidence bridge V2 state: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2State}`,
    `- Legacy generated research evidence bridge V2 legacy/promoted/matched rows: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2LegacyRows}/${report.summary.legacyGeneratedResearchEvidenceBridgeV2PromotedRows}/${report.summary.legacyGeneratedResearchEvidenceBridgeV2RowIdentityMatched}`,
    `- Legacy generated research evidence bridge V2 row evidence/gates: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2RowsWithResearchEvidenceIds}/${report.summary.legacyGeneratedResearchEvidenceBridgeV2RowsWithAllRequiredGatesPassed}`,
    `- Legacy generated research evidence bridge V2 AI/high-risk research/language gates: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2AiDecisions}/${report.summary.legacyGeneratedResearchEvidenceBridgeV2HighRiskAiWithResearchGate}/${report.summary.legacyGeneratedResearchEvidenceBridgeV2AiLanguageGatesPassed}`,
    `- Legacy generated research evidence bridge V2 dry-run ready: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2DryRunReady ? 'yes' : 'no'}`,
    `- Legacy generated research evidence bridge V2 fixture probes: ${report.summary.legacyGeneratedResearchEvidenceBridgeV2FixtureProbesPassed}/${report.summary.legacyGeneratedResearchEvidenceBridgeV2FixtureProbes}`,
    `- Ready for payload creation approval preflight V2: ${report.summary.readyForPayloadCreationApprovalPreflightV2 ? 'yes' : 'no'}`,
    `- Payload creation approval preflight V2 blockers: ${report.summary.payloadCreationApprovalPreflightV2Blockers}`,
    `- Payload creation approval preflight V2 present: ${report.summary.payloadCreationApprovalPreflightV2Present ? 'yes' : 'no'}`,
    `- Payload creation approval preflight V2 state: ${report.summary.payloadCreationApprovalPreflightV2State}`,
    `- Payload creation approval preflight V2 ready for closed materialization: ${report.summary.payloadCreationApprovalPreflightV2ReadyForClosedPayloadMaterialization ? 'yes' : 'no'}`,
    `- Payload creation approval preflight V2 hash checks: ${report.summary.payloadCreationApprovalPreflightV2HashChecksPassed}/${report.summary.payloadCreationApprovalPreflightV2HashChecks}`,
    `- Payload creation approval preflight V2 fixture probes: ${report.summary.payloadCreationApprovalPreflightV2FixtureProbesPassed}/${report.summary.payloadCreationApprovalPreflightV2FixtureProbes}`,
    `- Payload creation approval preflight V2 ready for apply: ${report.summary.payloadCreationApprovalPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source payload preflight V2 ready: ${report.summary.officialSourcePayloadCreationApprovalPreflightV2Ready ? 'yes' : 'no'}`,
    `- Official-source payload preflight V2 fresh after import gate: ${report.summary.officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate ? 'yes' : 'no'}`,
    `- Closed local payload materialization V2 blockers: ${report.summary.closedLocalPayloadMaterializationV2Blockers}`,
    `- Closed local payload materialization V2 present: ${report.summary.closedLocalPayloadMaterializationV2Present ? 'yes' : 'no'}`,
    `- Closed local payload materialization V2 state: ${report.summary.closedLocalPayloadMaterializationV2State}`,
    `- Closed local payload materialization V2 slices: ${report.summary.closedLocalPayloadMaterializationV2RuntimeSlices}`,
    `- Closed local payload materialization V2 entries/bytes: ${report.summary.closedLocalPayloadMaterializationV2PayloadEntries}/${report.summary.closedLocalPayloadMaterializationV2PayloadBytes}`,
    `- Closed local payload materialization V2 checksum mismatches: ${report.summary.closedLocalPayloadMaterializationV2ChecksumMismatches}`,
    `- Closed local payload materialization V2 ready for server preflight: ${report.summary.closedLocalPayloadMaterializationV2ReadyForServerDeliveryPublishPreflight ? 'yes' : 'no'}`,
    `- Closed local payload materialization V2 fixture probes: ${report.summary.closedLocalPayloadMaterializationV2FixtureProbesPassed}/${report.summary.closedLocalPayloadMaterializationV2FixtureProbes}`,
    `- Closed local payload materialization V2 ready for apply: ${report.summary.closedLocalPayloadMaterializationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source closed local payload materialization V2 ready: ${report.summary.officialSourceClosedLocalPayloadMaterializationV2Ready ? 'yes' : 'no'}`,
    `- Official-source closed local payload materialization V2 fresh after payload preflight: ${report.summary.officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight ? 'yes' : 'no'}`,
    `- Server delivery publish preflight V2 blockers: ${report.summary.serverDeliveryPublishPreflightV2Blockers}`,
    `- Server delivery publish preflight V2 present: ${report.summary.serverDeliveryPublishPreflightV2Present ? 'yes' : 'no'}`,
    `- Server delivery publish preflight V2 state: ${report.summary.serverDeliveryPublishPreflightV2State}`,
    `- Server delivery publish preflight V2 manifest entries: ${report.summary.serverDeliveryPublishPreflightV2ManifestEntries}`,
    `- Server delivery publish preflight V2 actual sha/bytes: ${report.summary.serverDeliveryPublishPreflightV2ActualShaEntries}/${report.summary.serverDeliveryPublishPreflightV2ActualByteSizeEntries}`,
    `- Server delivery publish preflight V2 checksum mismatches: ${report.summary.serverDeliveryPublishPreflightV2ChecksumMismatches}`,
    `- Server delivery publish preflight V2 ready for admin review: ${report.summary.serverDeliveryPublishPreflightV2ReadyForAdminServerDeliveryReview ? 'yes' : 'no'}`,
    `- Server delivery publish preflight V2 fixture probes: ${report.summary.serverDeliveryPublishPreflightV2FixtureProbesPassed}/${report.summary.serverDeliveryPublishPreflightV2FixtureProbes}`,
    `- Server delivery publish preflight V2 ready for apply: ${report.summary.serverDeliveryPublishPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- French upload/remote verify parity V2 ready/matches: ${report.summary.frenchUploadRemoteVerifyParityV2ReadyForRemoteObjectVerify ? 'yes' : 'no'}/${report.summary.frenchUploadRemoteVerifyParityV2MatchedServerPaths}/${report.summary.frenchUploadRemoteVerifyParityV2ShaMatches}/${report.summary.frenchUploadRemoteVerifyParityV2ByteMatches}`,
    `- French server object remote verify V2 found/hash/unverified: ${report.summary.frenchServerObjectRemoteVerifyV2FoundObjects}/${report.summary.frenchServerObjectRemoteVerifyV2HashCheckedObjects}/${report.summary.frenchServerObjectRemoteVerifyV2UnverifiedObjects}`,
    `- French server object remote verify V2 missing/hash/size mismatches: ${report.summary.frenchServerObjectRemoteVerifyV2MissingObjects}/${report.summary.frenchServerObjectRemoteVerifyV2HashMismatches}/${report.summary.frenchServerObjectRemoteVerifyV2SizeMismatches}`,
    `- French server object remote verify V2 passed for decision import/apply: ${report.summary.frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply ? 'yes' : 'no'}`,
    `- Remote verify blocks decision import/apply: ${report.summary.remoteVerifyBlocksDecisionImportAndApply ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 blockers: ${report.summary.adminServerDeliveryRuntimePreflightV2Blockers}`,
    `- Admin/server delivery runtime preflight V2 present: ${report.summary.adminServerDeliveryRuntimePreflightV2Present ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 state: ${report.summary.adminServerDeliveryRuntimePreflightV2State}`,
    `- Admin/server delivery runtime preflight V2 manifest entries: ${report.summary.adminServerDeliveryRuntimePreflightV2ManifestEntries}`,
    `- Admin/server delivery runtime preflight V2 admin/runtime/storage ready: ${report.summary.adminServerDeliveryRuntimePreflightV2AdminReady ? 'yes' : 'no'}/${report.summary.adminServerDeliveryRuntimePreflightV2RuntimeReady ? 'yes' : 'no'}/${report.summary.adminServerDeliveryRuntimePreflightV2StorageReady ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 ready for activation blocker planning: ${report.summary.adminServerDeliveryRuntimePreflightV2ReadyForRuntimeActivationBlockerPlanning ? 'yes' : 'no'}`,
    `- Admin/server delivery runtime preflight V2 fixture probes: ${report.summary.adminServerDeliveryRuntimePreflightV2FixtureProbesPassed}/${report.summary.adminServerDeliveryRuntimePreflightV2FixtureProbes}`,
    `- Admin/server delivery runtime preflight V2 ready for apply: ${report.summary.adminServerDeliveryRuntimePreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Runtime activation blocker plan V2 blockers: ${report.summary.runtimeActivationBlockerPlanV2Blockers}`,
    `- Runtime activation blocker plan V2 present: ${report.summary.runtimeActivationBlockerPlanV2Present ? 'yes' : 'no'}`,
    `- Runtime activation blocker plan V2 state: ${report.summary.runtimeActivationBlockerPlanV2State}`,
    `- Runtime activation blocker plan V2 items/touches: ${report.summary.runtimeActivationBlockerPlanV2PlanItems}/${report.summary.runtimeActivationBlockerPlanV2PlannedTouches}`,
    `- Runtime activation blocker plan V2 apply blockers/dirty overlaps: ${report.summary.runtimeActivationBlockerPlanV2ReadinessApplyBlockers}/${report.summary.runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps}`,
    `- Runtime activation blocker plan V2 ready for approval receipt gate: ${report.summary.runtimeActivationBlockerPlanV2ReadyForExplicitApprovalReceiptGate ? 'yes' : 'no'}`,
    `- Runtime activation blocker plan V2 fixture probes: ${report.summary.runtimeActivationBlockerPlanV2FixtureProbesPassed}/${report.summary.runtimeActivationBlockerPlanV2FixtureProbes}`,
    `- Runtime activation blocker plan V2 ready for apply: ${report.summary.runtimeActivationBlockerPlanV2ReadyForApply ? 'yes' : 'no'}`,
    `- Runtime delivery evidence chain V2 blockers: ${report.summary.runtimeDeliveryEvidenceChainV2Blockers}`,
    `- Runtime delivery evidence chain V2 present: ${report.summary.runtimeDeliveryEvidenceChainV2Present ? 'yes' : 'no'}`,
    `- Runtime delivery evidence chain V2 state: ${report.summary.runtimeDeliveryEvidenceChainV2State}`,
    `- Runtime delivery evidence chain V2 ready: ${report.summary.runtimeDeliveryEvidenceChainV2Ready ? 'yes' : 'no'}`,
    `- Runtime delivery evidence chain V2 upstream PASS/blockers: ${report.summary.runtimeDeliveryEvidenceChainV2UpstreamReportsPass}/${report.summary.runtimeDeliveryEvidenceChainV2UpstreamReportBlockers}`,
    `- Runtime delivery evidence chain V2 preview/publish/actual sha: ${report.summary.runtimeDeliveryEvidenceChainV2PreviewEntries}/${report.summary.runtimeDeliveryEvidenceChainV2PublishManifestEntries}/${report.summary.runtimeDeliveryEvidenceChainV2ActualShaEntries}`,
    `- Runtime delivery evidence chain V2 payload/index/manifest/checksum matches: ${report.summary.runtimeDeliveryEvidenceChainV2ManifestPayloadShaMatches}/${report.summary.runtimeDeliveryEvidenceChainV2ManifestIndexShaMatches}/${report.summary.runtimeDeliveryEvidenceChainV2ManifestSliceManifestShaMatches}/${report.summary.runtimeDeliveryEvidenceChainV2ManifestChecksumReportsPresent}`,
    `- Runtime delivery evidence chain V2 rollback/source/studyTarget rejects: ${report.summary.runtimeDeliveryEvidenceChainV2RuntimeRollbackSimulationContracts}/${report.summary.runtimeDeliveryEvidenceChainV2RuntimeSourceLocaleMismatchRejectContracts}/${report.summary.runtimeDeliveryEvidenceChainV2RuntimeStudyTargetMismatchRejectContracts}`,
    `- Runtime delivery evidence chain V2 admin/runtime/storage ready: ${report.summary.runtimeDeliveryEvidenceChainV2AdminReady ? 'yes' : 'no'}/${report.summary.runtimeDeliveryEvidenceChainV2RuntimeReady ? 'yes' : 'no'}/${report.summary.runtimeDeliveryEvidenceChainV2StorageReady ? 'yes' : 'no'}`,
    `- Runtime delivery evidence chain V2 closed transitions: ${report.summary.runtimeDeliveryEvidenceChainV2ClosedTransitions ? 'yes' : 'no'}`,
    `- Runtime delivery evidence chain V2 ready for exact approval wait: ${report.summary.runtimeDeliveryEvidenceChainV2ReadyForExactApprovalWaitState ? 'yes' : 'no'}`,
    `- Runtime delivery evidence chain V2 fixture probes: ${report.summary.runtimeDeliveryEvidenceChainV2FixtureProbesPassed}/${report.summary.runtimeDeliveryEvidenceChainV2FixtureProbes}`,
    `- Runtime delivery evidence chain V2 ready for apply: ${report.summary.runtimeDeliveryEvidenceChainV2ReadyForApply ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 blockers: ${report.summary.explicitApprovalReceiptHashLockGateV2Blockers}`,
    `- Explicit approval receipt/hash-lock gate V2 present: ${report.summary.explicitApprovalReceiptHashLockGateV2Present ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 state: ${report.summary.explicitApprovalReceiptHashLockGateV2State}`,
    `- Explicit approval receipt/hash-lock gate V2 hashes/dirty files: ${report.summary.explicitApprovalReceiptHashLockGateV2CriticalHashLocks}/${report.summary.explicitApprovalReceiptHashLockGateV2DirtyFiles}`,
    `- Explicit approval receipt/hash-lock gate V2 dirty production candidates: ${report.summary.explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles}`,
    `- Explicit approval receipt/hash-lock gate V2 ready for approval request: ${report.summary.explicitApprovalReceiptHashLockGateV2ReadyForApprovalRequestPresentation ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 active receipt/hash lock: ${report.summary.explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.explicitApprovalReceiptHashLockGateV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Explicit approval receipt/hash-lock gate V2 fixture probes: ${report.summary.explicitApprovalReceiptHashLockGateV2FixtureProbesPassed}/${report.summary.explicitApprovalReceiptHashLockGateV2FixtureProbes}`,
    `- Explicit approval receipt/hash-lock gate V2 ready for apply: ${report.summary.explicitApprovalReceiptHashLockGateV2ReadyForApply ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 blockers: ${report.summary.activationApprovalRequestPresentationV2Blockers}`,
    `- Activation approval request presentation V2 present: ${report.summary.activationApprovalRequestPresentationV2Present ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 state: ${report.summary.activationApprovalRequestPresentationV2State}`,
    `- Activation approval request presentation V2 hashes/dirty files: ${report.summary.activationApprovalRequestPresentationV2CriticalHashLocks}/${report.summary.activationApprovalRequestPresentationV2DirtyFiles}`,
    `- Activation approval request presentation V2 ready for receipt creation gate: ${report.summary.activationApprovalRequestPresentationV2ReadyForExplicitApprovalReceiptCreationGate ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 active receipt/hash lock: ${report.summary.activationApprovalRequestPresentationV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activationApprovalRequestPresentationV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Activation approval request presentation V2 fixture probes: ${report.summary.activationApprovalRequestPresentationV2FixtureProbesPassed}/${report.summary.activationApprovalRequestPresentationV2FixtureProbes}`,
    `- Activation approval request presentation V2 ready for apply: ${report.summary.activationApprovalRequestPresentationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 blockers: ${report.summary.explicitApprovalReceiptCreationGateV2Blockers}`,
    `- Explicit approval receipt creation gate V2 present: ${report.summary.explicitApprovalReceiptCreationGateV2Present ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 state: ${report.summary.explicitApprovalReceiptCreationGateV2State}`,
    `- Explicit approval receipt creation gate V2 exact sentence/plain continue rejected: ${report.summary.explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent ? 'yes' : 'no'}/${report.summary.explicitApprovalReceiptCreationGateV2PlainContinueRejected ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 active receipt/hash created: ${report.summary.explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated ? 'yes' : 'no'}/${report.summary.explicitApprovalReceiptCreationGateV2ActiveHashLockCreated ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 can continue non-production audit: ${report.summary.explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit ? 'yes' : 'no'}`,
    `- Explicit approval receipt creation gate V2 fixture probes: ${report.summary.explicitApprovalReceiptCreationGateV2FixtureProbesPassed}/${report.summary.explicitApprovalReceiptCreationGateV2FixtureProbes}`,
    `- Explicit approval receipt creation gate V2 ready for apply: ${report.summary.explicitApprovalReceiptCreationGateV2ReadyForApply ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 blockers: ${report.summary.productionApplyAbsenceDenialGateV2Blockers}`,
    `- Production apply absence denial gate V2 present: ${report.summary.productionApplyAbsenceDenialGateV2Present ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 state: ${report.summary.productionApplyAbsenceDenialGateV2State}`,
    `- Production apply absence denial gate V2 apply denied: ${report.summary.productionApplyAbsenceDenialGateV2ApplyDenied ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 active receipt/hash lock: ${report.summary.productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.productionApplyAbsenceDenialGateV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 can continue non-production audit: ${report.summary.productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 ready for non-production continuation: ${report.summary.productionApplyAbsenceDenialGateV2ReadyForNonProductionContinuation ? 'yes' : 'no'}`,
    `- Production apply absence denial gate V2 fixture probes: ${report.summary.productionApplyAbsenceDenialGateV2FixtureProbesPassed}/${report.summary.productionApplyAbsenceDenialGateV2FixtureProbes}`,
    `- Production apply absence denial gate V2 ready for apply: ${report.summary.productionApplyAbsenceDenialGateV2ReadyForApply ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 blockers: ${report.summary.nonproductionBlockerClosurePlanV2Blockers}`,
    `- Non-production blocker closure plan V2 present: ${report.summary.nonproductionBlockerClosurePlanV2Present ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 state: ${report.summary.nonproductionBlockerClosurePlanV2State}`,
    `- Non-production blocker closure plan V2 chain ready: ${report.summary.nonproductionBlockerClosurePlanV2ChainReady ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 safe/exact/locked items: ${report.summary.nonproductionBlockerClosurePlanV2SafeItems}/${report.summary.nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems}/${report.summary.nonproductionBlockerClosurePlanV2ProductionLockedItems}`,
    `- Non-production blocker closure plan V2 recommended next safe item: ${report.summary.nonproductionBlockerClosurePlanV2RecommendedNextSafeItem}`,
    `- Non-production blocker closure plan V2 ready for next non-production pass: ${report.summary.nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 fixture probes: ${report.summary.nonproductionBlockerClosurePlanV2FixtureProbesPassed}/${report.summary.nonproductionBlockerClosurePlanV2FixtureProbes}`,
    `- Non-production blocker closure plan V2 ready for apply: ${report.summary.nonproductionBlockerClosurePlanV2ReadyForApply ? 'yes' : 'no'}`,
    `- Non-production blocker closure plan V2 may modify production app files: ${report.summary.nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 blockers: ${report.summary.nonproductionEvidenceRefreshV2Blockers}`,
    `- Non-production evidence refresh V2 present: ${report.summary.nonproductionEvidenceRefreshV2Present ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 state: ${report.summary.nonproductionEvidenceRefreshV2State}`,
    `- Non-production evidence refresh V2 legacy review residue matches: ${report.summary.nonproductionEvidenceRefreshV2LegacyReviewResidueMatches}`,
    `- Non-production evidence refresh V2 ready for next manifest recheck: ${report.summary.nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 fixture probes: ${report.summary.nonproductionEvidenceRefreshV2FixtureProbesPassed}/${report.summary.nonproductionEvidenceRefreshV2FixtureProbes}`,
    `- Non-production evidence refresh V2 ready for apply: ${report.summary.nonproductionEvidenceRefreshV2ReadyForApply ? 'yes' : 'no'}`,
    `- Non-production evidence refresh V2 may modify production app files: ${report.summary.nonproductionEvidenceRefreshV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 blockers: ${report.summary.runtimeServerManifestConsistencyRecheckV2Blockers}`,
    `- Runtime/server manifest consistency recheck V2 present: ${report.summary.runtimeServerManifestConsistencyRecheckV2Present ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 state: ${report.summary.runtimeServerManifestConsistencyRecheckV2State}`,
    `- Runtime/server manifest consistency recheck V2 manifest entries: ${report.summary.runtimeServerManifestConsistencyRecheckV2ManifestEntries}`,
    `- Runtime/server manifest consistency recheck V2 gate refs current: ${report.summary.runtimeServerManifestConsistencyRecheckV2GateRefsCurrent}/${report.summary.runtimeServerManifestConsistencyRecheckV2GateRefs}`,
    `- Runtime/server manifest consistency recheck V2 input hashes current: ${report.summary.runtimeServerManifestConsistencyRecheckV2InputHashesCurrent}/${report.summary.runtimeServerManifestConsistencyRecheckV2InputHashes}`,
    `- Runtime/server manifest consistency recheck V2 top-level open flags: ${report.summary.runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen}`,
    `- Runtime/server manifest consistency recheck V2 activation/runtime/apply entry flags: ${report.summary.runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries}/${report.summary.runtimeServerManifestConsistencyRecheckV2RuntimeDownloadsEnabledEntries}/${report.summary.runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries}`,
    `- Runtime/server manifest consistency recheck V2 ready for next language isolation recheck: ${report.summary.runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 fixture probes: ${report.summary.runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed}/${report.summary.runtimeServerManifestConsistencyRecheckV2FixtureProbes}`,
    `- Runtime/server manifest consistency recheck V2 ready for apply: ${report.summary.runtimeServerManifestConsistencyRecheckV2ReadyForApply ? 'yes' : 'no'}`,
    `- Runtime/server manifest consistency recheck V2 may modify production app files: ${report.summary.runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 blockers: ${report.summary.languageIsolationRegressionRecheckV2Blockers}`,
    `- Language isolation regression recheck V2 present: ${report.summary.languageIsolationRegressionRecheckV2Present ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 state: ${report.summary.languageIsolationRegressionRecheckV2State}`,
    `- Language isolation regression recheck V2 scanned rows/fields: ${report.summary.languageIsolationRegressionRecheckV2ScannedRows}/${report.summary.languageIsolationRegressionRecheckV2ScannedTargetFields}`,
    `- Language isolation regression recheck V2 prompt contracts: ${report.summary.languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale}/${report.summary.languageIsolationRegressionRecheckV2PromptEntrypointsExpected}`,
    `- Language isolation regression recheck V2 manifest entries: ${report.summary.languageIsolationRegressionRecheckV2ManifestEntries}`,
    `- Language isolation regression recheck V2 ready for next readiness/apply blocker map refresh: ${report.summary.languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 fixture probes: ${report.summary.languageIsolationRegressionRecheckV2FixtureProbesPassed}/${report.summary.languageIsolationRegressionRecheckV2FixtureProbes}`,
    `- Language isolation regression recheck V2 ready for apply: ${report.summary.languageIsolationRegressionRecheckV2ReadyForApply ? 'yes' : 'no'}`,
    `- Language isolation regression recheck V2 may modify production app files: ${report.summary.languageIsolationRegressionRecheckV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 blockers: ${report.summary.readinessApplyBlockerMapRefreshV2Blockers}`,
    `- Readiness/apply blocker map refresh V2 present: ${report.summary.readinessApplyBlockerMapRefreshV2Present ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 state: ${report.summary.readinessApplyBlockerMapRefreshV2State}`,
    `- Readiness/apply blocker map refresh V2 generation/apply blockers: ${report.summary.readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers}/${report.summary.readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers}`,
    `- Readiness/apply blocker map refresh V2 safe closed/remaining: ${report.summary.readinessApplyBlockerMapRefreshV2SafeClosed}/${report.summary.readinessApplyBlockerMapRefreshV2SafeRemaining}`,
    `- Readiness/apply blocker map refresh V2 ready for next master refresh: ${report.summary.readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 fixture probes: ${report.summary.readinessApplyBlockerMapRefreshV2FixtureProbesPassed}/${report.summary.readinessApplyBlockerMapRefreshV2FixtureProbes}`,
    `- Readiness/apply blocker map refresh V2 ready for apply: ${report.summary.readinessApplyBlockerMapRefreshV2ReadyForApply ? 'yes' : 'no'}`,
    `- Readiness/apply blocker map refresh V2 may modify production app files: ${report.summary.readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 blockers: ${report.summary.masterNextPassConsistencyRefreshV2Blockers}`,
    `- Master/next-pass consistency refresh V2 present: ${report.summary.masterNextPassConsistencyRefreshV2Present ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 state: ${report.summary.masterNextPassConsistencyRefreshV2State}`,
    `- Master/next-pass consistency refresh V2 ready for official-source coverage: ${report.summary.masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 fixture probes: ${report.summary.masterNextPassConsistencyRefreshV2FixtureProbesPassed}/${report.summary.masterNextPassConsistencyRefreshV2FixtureProbes}`,
    `- Master/next-pass consistency refresh V2 ready for apply: ${report.summary.masterNextPassConsistencyRefreshV2ReadyForApply ? 'yes' : 'no'}`,
    `- Master/next-pass consistency refresh V2 may modify production app files: ${report.summary.masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 blockers: ${report.summary.officialSourceContentCoverageV2Blockers}`,
    `- Official-source content coverage V2 present: ${report.summary.officialSourceContentCoverageV2Present ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 state: ${report.summary.officialSourceContentCoverageV2State}`,
    `- Official-source content coverage V2 rows/accepted/AI: ${report.summary.officialSourceContentCoverageV2LedgerRows}/${report.summary.officialSourceContentCoverageV2AcceptedRows}/${report.summary.officialSourceContentCoverageV2AcceptedAi}`,
    `- Official-source content coverage V2 sourceRefs/gates/quiz: ${report.summary.officialSourceContentCoverageV2RowsWithSourceRefs}/${report.summary.officialSourceContentCoverageV2RowsWithGatesPassed}/${report.summary.officialSourceContentCoverageV2QuizRowsOneCorrect}`,
    `- Official-source content coverage V2 trusted row refs/evidence-covered: ${report.summary.officialSourceContentCoverageV2RowsWithTrustedSourceRefUrls}/${report.summary.officialSourceContentCoverageV2RowsWithEvidenceCoveredBySourceRefs}`,
    `- Official-source content coverage V2 AI trusted refs/minimum refs: ${report.summary.officialSourceContentCoverageV2AiWithTrustedSourceRefUrls}/${report.summary.officialSourceContentCoverageV2AiWithMinimumTrustedSourceRefs}`,
    `- Official-source content coverage V2 untrusted row/AI refs: ${report.summary.officialSourceContentCoverageV2RowsWithUntrustedSourceRefUrls + report.summary.officialSourceContentCoverageV2RowsWithUntrustedSourceRefIds}/${report.summary.officialSourceContentCoverageV2AiWithUntrustedSourceRefUrls + report.summary.officialSourceContentCoverageV2AiWithUntrustedSourceRefIds}`,
    `- Official-source content coverage V2 negative fixtures rejected: ${report.summary.officialSourceContentCoverageV2RejectsNonHttpsSourceRefFixture ? 'yes' : 'no'}/${report.summary.officialSourceContentCoverageV2RejectsUntrustedSourceDomainFixture ? 'yes' : 'no'}/${report.summary.officialSourceContentCoverageV2RejectsUntrustedSourceIdFixture ? 'yes' : 'no'}/${report.summary.officialSourceContentCoverageV2RejectsEvidenceWithoutMatchingSourceRefFixture ? 'yes' : 'no'}/${report.summary.officialSourceContentCoverageV2RejectsInsufficientAiTrustedSourceRefsFixture ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 trusted source ids: ${report.summary.officialSourceContentCoverageV2TrustedSourceIds}`,
    `- Official-source content coverage V2 P38/fresh/snapshot: ${report.summary.officialSourceContentCoverageV2P38Ready ? 'yes' : 'no'}/${report.summary.officialSourceContentCoverageV2FreshAfterMasterRefresh ? 'yes' : 'no'}/${report.summary.officialSourceContentCoverageV2FreshnessAcceptedByP38Snapshot ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 ready for import dry-run refresh: ${report.summary.officialSourceContentCoverageV2ReadyForImportDryRunRefresh ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 fixture probes: ${report.summary.officialSourceContentCoverageV2FixtureProbesPassed}/${report.summary.officialSourceContentCoverageV2FixtureProbes}`,
    `- Official-source content coverage V2 ready for apply: ${report.summary.officialSourceContentCoverageV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 may modify production app files: ${report.summary.officialSourceContentCoverageV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production activation hold exact approval required V2 blockers: ${report.summary.productionActivationHoldExactApprovalRequiredV2Blockers}`,
    `- Production activation hold exact approval required V2 present: ${report.summary.productionActivationHoldExactApprovalRequiredV2Present ? 'yes' : 'no'}`,
    `- Production activation hold exact approval required V2 state: ${report.summary.productionActivationHoldExactApprovalRequiredV2State}`,
    `- Production activation hold exact approval required V2 ready: ${report.summary.productionActivationHoldExactApprovalRequiredV2Ready ? 'yes' : 'no'}`,
    `- Production activation hold exact approval required V2 closed evidence/exact approval: ${report.summary.productionActivationHoldExactApprovalRequiredV2ClosedEvidenceReady ? 'yes' : 'no'}/${report.summary.productionActivationHoldExactApprovalRequiredV2ExactApprovalRequired ? 'yes' : 'no'}`,
    `- Production activation hold exact approval required V2 fixture probes: ${report.summary.productionActivationHoldExactApprovalRequiredV2FixtureProbesPassed}/${report.summary.productionActivationHoldExactApprovalRequiredV2FixtureProbes}`,
    `- Production activation hold exact approval required V2 ready for apply: ${report.summary.productionActivationHoldExactApprovalRequiredV2ReadyForApply ? 'yes' : 'no'}`,
    `- Production activation hold exact approval required V2 may modify production app files: ${report.summary.productionActivationHoldExactApprovalRequiredV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval validation gate V2 blockers: ${report.summary.exactApprovalValidationGateV2Blockers}`,
    `- Exact approval validation gate V2 present: ${report.summary.exactApprovalValidationGateV2Present ? 'yes' : 'no'}`,
    `- Exact approval validation gate V2 state: ${report.summary.exactApprovalValidationGateV2State}`,
    `- Exact approval validation gate V2 ready: ${report.summary.exactApprovalValidationGateV2Ready ? 'yes' : 'no'}`,
    `- Exact approval validation gate V2 production sequencing/active receipt/hash lock: ${report.summary.exactApprovalValidationGateV2ReadyForProductionActivationSequencing ? 'yes' : 'no'}/${report.summary.exactApprovalValidationGateV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalValidationGateV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Exact approval validation gate V2 fixture probes: ${report.summary.exactApprovalValidationGateV2FixtureProbesPassed}/${report.summary.exactApprovalValidationGateV2FixtureProbes}`,
    `- Exact approval validation gate V2 ready for apply: ${report.summary.exactApprovalValidationGateV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval validation gate V2 may modify production app files: ${report.summary.exactApprovalValidationGateV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production activation sequence preflight V2 blockers: ${report.summary.productionActivationSequencePreflightV2Blockers}`,
    `- Production activation sequence preflight V2 present: ${report.summary.productionActivationSequencePreflightV2Present ? 'yes' : 'no'}`,
    `- Production activation sequence preflight V2 state: ${report.summary.productionActivationSequencePreflightV2State}`,
    `- Production activation sequence preflight V2 ready: ${report.summary.productionActivationSequencePreflightV2Ready ? 'yes' : 'no'}`,
    `- Production activation sequence preflight V2 ready for production activation sequence: ${report.summary.productionActivationSequencePreflightV2ReadyForProductionActivationSequence ? 'yes' : 'no'}`,
    `- Production activation sequence preflight V2 fixture probes: ${report.summary.productionActivationSequencePreflightV2FixtureProbesPassed}/${report.summary.productionActivationSequencePreflightV2FixtureProbes}`,
    `- Production activation sequence preflight V2 ready for apply: ${report.summary.productionActivationSequencePreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Production activation sequence preflight V2 may modify production app files: ${report.summary.productionActivationSequencePreflightV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production apply transaction contract V2 blockers: ${report.summary.productionApplyTransactionContractV2Blockers}`,
    `- Production apply transaction contract V2 present: ${report.summary.productionApplyTransactionContractV2Present ? 'yes' : 'no'}`,
    `- Production apply transaction contract V2 state: ${report.summary.productionApplyTransactionContractV2State}`,
    `- Production apply transaction contract V2 ready: ${report.summary.productionApplyTransactionContractV2Ready ? 'yes' : 'no'}`,
    `- Production apply transaction contract V2 ready for production apply transaction: ${report.summary.productionApplyTransactionContractV2ReadyForProductionApplyTransaction ? 'yes' : 'no'}`,
    `- Production apply transaction contract V2 entries/files: ${report.summary.productionApplyTransactionContractV2ServerManifestEntries}/${report.summary.productionApplyTransactionContractV2PayloadFilesChecked}/${report.summary.productionApplyTransactionContractV2IndexFilesChecked}/${report.summary.productionApplyTransactionContractV2SliceManifestFilesChecked}`,
    `- Production apply transaction contract V2 sha/missing files: ${report.summary.productionApplyTransactionContractV2ShaMismatches}/${report.summary.productionApplyTransactionContractV2MissingEntryFiles}`,
    `- Production apply transaction contract V2 P49/P50/delivery: ${report.summary.productionApplyTransactionContractV2P49RequirementsProved}/${report.summary.productionApplyTransactionContractV2FinalHashLocks}/${report.summary.productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainReady ? 'yes' : 'no'}`,
    `- Production apply transaction contract V2 fixture probes: ${report.summary.productionApplyTransactionContractV2FixtureProbesPassed}/${report.summary.productionApplyTransactionContractV2FixtureProbes}`,
    `- Production apply transaction contract V2 ready for apply: ${report.summary.productionApplyTransactionContractV2ReadyForApply ? 'yes' : 'no'}`,
    `- Production apply transaction contract V2 may modify production app files: ${report.summary.productionApplyTransactionContractV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Post-apply rollback guard contract V2 blockers: ${report.summary.postApplyRollbackGuardContractV2Blockers}`,
    `- Post-apply rollback guard contract V2 present: ${report.summary.postApplyRollbackGuardContractV2Present ? 'yes' : 'no'}`,
    `- Post-apply rollback guard contract V2 state: ${report.summary.postApplyRollbackGuardContractV2State}`,
    `- Post-apply rollback guard contract V2 ready: ${report.summary.postApplyRollbackGuardContractV2Ready ? 'yes' : 'no'}`,
    `- Post-apply rollback guard contract V2 ready for post-apply rollback guard: ${report.summary.postApplyRollbackGuardContractV2ReadyForPostApplyRollbackGuard ? 'yes' : 'no'}`,
    `- Post-apply rollback guard contract V2 cache/rollback contracts: ${report.summary.postApplyRollbackGuardContractV2RuntimeCacheContracts}/${report.summary.postApplyRollbackGuardContractV2RuntimeCacheRollbackContracts}`,
    `- Post-apply rollback guard contract V2 prompt contracts: ${report.summary.postApplyRollbackGuardContractV2LanguagePromptContracts}/${report.summary.postApplyRollbackGuardContractV2LanguagePromptEntrypointsExpected}`,
    `- Post-apply rollback guard contract V2 guard steps: ${report.summary.postApplyRollbackGuardContractV2PostApplyGuardSteps}/${report.summary.postApplyRollbackGuardContractV2RollbackGuardSteps}`,
    `- Post-apply rollback guard contract V2 P49/P50/delivery: ${report.summary.postApplyRollbackGuardContractV2P49RequirementsProved}/${report.summary.postApplyRollbackGuardContractV2FinalHashLocks}/${report.summary.postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainReady ? 'yes' : 'no'}`,
    `- Post-apply rollback guard contract V2 fixture probes: ${report.summary.postApplyRollbackGuardContractV2FixtureProbesPassed}/${report.summary.postApplyRollbackGuardContractV2FixtureProbes}`,
    `- Post-apply rollback guard contract V2 ready for apply: ${report.summary.postApplyRollbackGuardContractV2ReadyForApply ? 'yes' : 'no'}`,
    `- Post-apply rollback guard contract V2 may modify production app files: ${report.summary.postApplyRollbackGuardContractV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Approval-wait safe continuation V2 blockers: ${report.summary.approvalWaitSafeContinuationV2Blockers}`,
    `- Approval-wait safe continuation V2 present: ${report.summary.approvalWaitSafeContinuationV2Present ? 'yes' : 'no'}`,
    `- Approval-wait safe continuation V2 state: ${report.summary.approvalWaitSafeContinuationV2State}`,
    `- Approval-wait safe continuation V2 ready: ${report.summary.approvalWaitSafeContinuationV2Ready ? 'yes' : 'no'}`,
    `- Approval-wait safe continuation V2 ready for next safe pass: ${report.summary.approvalWaitSafeContinuationV2ReadyForNextSafePass ? 'yes' : 'no'}`,
    `- Approval-wait safe continuation V2 safe/locked work: ${report.summary.approvalWaitSafeContinuationV2SafeWorkItems}/${report.summary.approvalWaitSafeContinuationV2ProductionLockedItems}`,
    `- Approval-wait safe continuation V2 legacy residue/probes: ${report.summary.approvalWaitSafeContinuationV2LegacyReviewResidueMatches}/${report.summary.approvalWaitSafeContinuationV2FixtureProbesPassed}/${report.summary.approvalWaitSafeContinuationV2FixtureProbes}`,
    `- Approval-wait safe continuation V2 ready for apply: ${report.summary.approvalWaitSafeContinuationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Approval-wait safe continuation V2 may modify production app files: ${report.summary.approvalWaitSafeContinuationV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production readiness completion audit V2 blockers: ${report.summary.productionReadinessCompletionAuditV2Blockers}`,
    `- Production readiness completion audit V2 present: ${report.summary.productionReadinessCompletionAuditV2Present ? 'yes' : 'no'}`,
    `- Production readiness completion audit V2 state: ${report.summary.productionReadinessCompletionAuditV2State}`,
    `- Production readiness completion audit V2 ready: ${report.summary.productionReadinessCompletionAuditV2Ready ? 'yes' : 'no'}`,
    `- Production readiness completion audit V2 proved/locked/missing/contradicted: ${report.summary.productionReadinessCompletionAuditV2RequirementsProved}/${report.summary.productionReadinessCompletionAuditV2RequirementsProductionLocked}/${report.summary.productionReadinessCompletionAuditV2RequirementsMissing}/${report.summary.productionReadinessCompletionAuditV2RequirementsContradicted}`,
    `- Production readiness completion audit V2 closed-mode/probes: ${report.summary.productionReadinessCompletionAuditV2ClosedModeEvidenceComplete ? 'yes' : 'no'}/${report.summary.productionReadinessCompletionAuditV2FixtureProbesPassed}/${report.summary.productionReadinessCompletionAuditV2FixtureProbes}`,
    `- Production readiness completion audit V2 ready for apply: ${report.summary.productionReadinessCompletionAuditV2ReadyForApply ? 'yes' : 'no'}`,
    `- Production readiness completion audit V2 may modify production app files: ${report.summary.productionReadinessCompletionAuditV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Final pre-approval evidence hash-lock V2 blockers: ${report.summary.finalPreapprovalEvidenceHashLockV2Blockers}`,
    `- Final pre-approval evidence hash-lock V2 present: ${report.summary.finalPreapprovalEvidenceHashLockV2Present ? 'yes' : 'no'}`,
    `- Final pre-approval evidence hash-lock V2 state: ${report.summary.finalPreapprovalEvidenceHashLockV2State}`,
    `- Final pre-approval evidence hash-lock V2 ready: ${report.summary.finalPreapprovalEvidenceHashLockV2Ready ? 'yes' : 'no'}`,
    `- Final pre-approval evidence hash-lock V2 locks/missing/role-missing/final-link: ${report.summary.finalPreapprovalEvidenceHashLockV2FinalHashLocks}/${report.summary.finalPreapprovalEvidenceHashLockV2MissingCriticalArtifacts}/${report.summary.finalPreapprovalEvidenceHashLockV2MissingRequiredRoleLocks}/${report.summary.finalPreapprovalEvidenceHashLockV2P30IncludesFinalHashLock ? 'yes' : 'no'}`,
    `- Final pre-approval evidence hash-lock V2 chain/probes: ${report.summary.finalPreapprovalEvidenceHashLockV2P43P49ChainReady ? 'yes' : 'no'}/${report.summary.finalPreapprovalEvidenceHashLockV2P49CompletionReady ? 'yes' : 'no'}/${report.summary.finalPreapprovalEvidenceHashLockV2FixtureProbesPassed}/${report.summary.finalPreapprovalEvidenceHashLockV2FixtureProbes}`,
    `- Final pre-approval evidence hash-lock V2 runtime delivery chain: ${report.summary.finalPreapprovalEvidenceHashLockV2RuntimeDeliveryEvidenceChainReady ? 'yes' : 'no'}`,
    `- Final pre-approval evidence hash-lock V2 ready for apply: ${report.summary.finalPreapprovalEvidenceHashLockV2ReadyForApply ? 'yes' : 'no'}`,
    `- Final pre-approval evidence hash-lock V2 may modify production app files: ${report.summary.finalPreapprovalEvidenceHashLockV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval apply rehearsal V2 blockers: ${report.summary.exactApprovalApplyRehearsalV2Blockers}`,
    `- Exact approval apply rehearsal V2 present: ${report.summary.exactApprovalApplyRehearsalV2Present ? 'yes' : 'no'}`,
    `- Exact approval apply rehearsal V2 state: ${report.summary.exactApprovalApplyRehearsalV2State}`,
    `- Exact approval apply rehearsal V2 ready: ${report.summary.exactApprovalApplyRehearsalV2Ready ? 'yes' : 'no'}`,
    `- Exact approval apply rehearsal V2 apply blockers/active receipt/hash: ${report.summary.exactApprovalApplyRehearsalV2ReadinessApplyBlockers}/${report.summary.exactApprovalApplyRehearsalV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalApplyRehearsalV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Exact approval apply rehearsal V2 hash dry-runs/would-create/probes: ${report.summary.exactApprovalApplyRehearsalV2MainHashLockDryRunPresent ? 'yes' : 'no'}/${report.summary.exactApprovalApplyRehearsalV2FinalHashLockDryRunPresent ? 'yes' : 'no'}/${report.summary.exactApprovalApplyRehearsalV2WouldCreateActiveArtifactsNow ? 'yes' : 'no'}/${report.summary.exactApprovalApplyRehearsalV2FixtureProbesPassed}/${report.summary.exactApprovalApplyRehearsalV2FixtureProbes}`,
    `- Exact approval apply rehearsal V2 ready for apply: ${report.summary.exactApprovalApplyRehearsalV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval apply rehearsal V2 may modify production app files: ${report.summary.exactApprovalApplyRehearsalV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval source firewall V2 blockers: ${report.summary.exactApprovalSourceFirewallV2Blockers}`,
    `- Exact approval source firewall V2 present: ${report.summary.exactApprovalSourceFirewallV2Present ? 'yes' : 'no'}`,
    `- Exact approval source firewall V2 state: ${report.summary.exactApprovalSourceFirewallV2State}`,
    `- Exact approval source firewall V2 ready: ${report.summary.exactApprovalSourceFirewallV2Ready ? 'yes' : 'no'}`,
    `- Exact approval source firewall V2 source/exact/plain-create: ${report.summary.exactApprovalSourceFirewallV2ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceFirewallV2ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalSourceFirewallV2PlainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}`,
    `- Exact approval source firewall V2 active receipt/hash/probes: ${report.summary.exactApprovalSourceFirewallV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceFirewallV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceFirewallV2FixtureProbesPassed}/${report.summary.exactApprovalSourceFirewallV2FixtureProbes}`,
    `- Exact approval source firewall V2 ready for apply: ${report.summary.exactApprovalSourceFirewallV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval source firewall V2 may modify production app files: ${report.summary.exactApprovalSourceFirewallV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval source intake transition V2 blockers: ${report.summary.exactApprovalSourceIntakeTransitionV2Blockers}`,
    `- Exact approval source intake transition V2 present: ${report.summary.exactApprovalSourceIntakeTransitionV2Present ? 'yes' : 'no'}`,
    `- Exact approval source intake transition V2 state: ${report.summary.exactApprovalSourceIntakeTransitionV2State}`,
    `- Exact approval source intake transition V2 ready: ${report.summary.exactApprovalSourceIntakeTransitionV2Ready ? 'yes' : 'no'}`,
    `- Exact approval source intake transition V2 source/exact/plain-create/script-create: ${report.summary.exactApprovalSourceIntakeTransitionV2ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceIntakeTransitionV2ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalSourceIntakeTransitionV2PlainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}/${report.summary.exactApprovalSourceIntakeTransitionV2WouldCreateActiveArtifactsByThisScript ? 'yes' : 'no'}`,
    `- Exact approval source intake transition V2 active receipt/hash/sim-P31/sim-P44-readyForApply/probes: ${report.summary.exactApprovalSourceIntakeTransitionV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceIntakeTransitionV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceIntakeTransitionV2SimulatedValidP31CreateWouldCreateBothArtifacts ? 'yes' : 'no'}/${report.summary.exactApprovalSourceIntakeTransitionV2SimulatedP44WouldOpenReadyForApply ? 'yes' : 'no'}/${report.summary.exactApprovalSourceIntakeTransitionV2FixtureProbesPassed}/${report.summary.exactApprovalSourceIntakeTransitionV2FixtureProbes}`,
    `- Exact approval source intake transition V2 ready for apply: ${report.summary.exactApprovalSourceIntakeTransitionV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval source intake transition V2 may modify production app files: ${report.summary.exactApprovalSourceIntakeTransitionV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval active artifact pair simulation V2 blockers: ${report.summary.exactApprovalActiveArtifactPairSimulationV2Blockers}`,
    `- Exact approval active artifact pair simulation V2 present: ${report.summary.exactApprovalActiveArtifactPairSimulationV2Present ? 'yes' : 'no'}`,
    `- Exact approval active artifact pair simulation V2 state: ${report.summary.exactApprovalActiveArtifactPairSimulationV2State}`,
    `- Exact approval active artifact pair simulation V2 ready: ${report.summary.exactApprovalActiveArtifactPairSimulationV2Ready ? 'yes' : 'no'}`,
    `- Exact approval active artifact pair simulation V2 source/exact/active receipt/hash: ${report.summary.exactApprovalActiveArtifactPairSimulationV2ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.exactApprovalActiveArtifactPairSimulationV2ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalActiveArtifactPairSimulationV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalActiveArtifactPairSimulationV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Exact approval active artifact pair simulation V2 sim-P44/current-P44/ready-for-P31/probes: ${report.summary.exactApprovalActiveArtifactPairSimulationV2SimulatedPairWouldPassP44AfterP31Create ? 'yes' : 'no'}/${report.summary.exactApprovalActiveArtifactPairSimulationV2CurrentP44WouldOpenSequencing ? 'yes' : 'no'}/${report.summary.exactApprovalActiveArtifactPairSimulationV2ReadyForP31CreateWhenExactSourcePresent ? 'yes' : 'no'}/${report.summary.exactApprovalActiveArtifactPairSimulationV2FixtureProbesPassed}/${report.summary.exactApprovalActiveArtifactPairSimulationV2FixtureProbes}`,
    `- Exact approval active artifact pair simulation V2 ready for apply: ${report.summary.exactApprovalActiveArtifactPairSimulationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval active artifact pair simulation V2 may modify production app files: ${report.summary.exactApprovalActiveArtifactPairSimulationV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P31 create command preflight V2 blockers: ${report.summary.exactApprovalP31CreateCommandPreflightV2Blockers}`,
    `- Exact approval P31 create command preflight V2 present: ${report.summary.exactApprovalP31CreateCommandPreflightV2Present ? 'yes' : 'no'}`,
    `- Exact approval P31 create command preflight V2 state: ${report.summary.exactApprovalP31CreateCommandPreflightV2State}`,
    `- Exact approval P31 create command preflight V2 ready: ${report.summary.exactApprovalP31CreateCommandPreflightV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P31 create command preflight V2 source/exact/active receipt/hash: ${report.summary.exactApprovalP31CreateCommandPreflightV2ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.exactApprovalP31CreateCommandPreflightV2ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalP31CreateCommandPreflightV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalP31CreateCommandPreflightV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Exact approval P31 create command preflight V2 command now/with-source/executed/probes: ${report.summary.exactApprovalP31CreateCommandPreflightV2CommandAllowedNow ? 'yes' : 'no'}/${report.summary.exactApprovalP31CreateCommandPreflightV2CommandAllowedWhenExactSourcePresent ? 'yes' : 'no'}/${report.summary.exactApprovalP31CreateCommandPreflightV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP31CreateCommandPreflightV2FixtureProbesPassed}/${report.summary.exactApprovalP31CreateCommandPreflightV2FixtureProbes}`,
    `- Exact approval P31 create command preflight V2 ready for apply: ${report.summary.exactApprovalP31CreateCommandPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P31 create command preflight V2 may modify production app files: ${report.summary.exactApprovalP31CreateCommandPreflightV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P44 validation command preflight V2 blockers: ${report.summary.exactApprovalP44ValidationCommandPreflightV2Blockers}`,
    `- Exact approval P44 validation command preflight V2 present: ${report.summary.exactApprovalP44ValidationCommandPreflightV2Present ? 'yes' : 'no'}`,
    `- Exact approval P44 validation command preflight V2 state: ${report.summary.exactApprovalP44ValidationCommandPreflightV2State}`,
    `- Exact approval P44 validation command preflight V2 ready: ${report.summary.exactApprovalP44ValidationCommandPreflightV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P44 validation command preflight V2 source/exact/active receipt/hash: ${report.summary.exactApprovalP44ValidationCommandPreflightV2ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.exactApprovalP44ValidationCommandPreflightV2ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalP44ValidationCommandPreflightV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalP44ValidationCommandPreflightV2ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Exact approval P44 validation command preflight V2 command now/after-P31/executed/probes: ${report.summary.exactApprovalP44ValidationCommandPreflightV2CommandAllowedNow ? 'yes' : 'no'}/${report.summary.exactApprovalP44ValidationCommandPreflightV2CommandAllowedAfterP31Create ? 'yes' : 'no'}/${report.summary.exactApprovalP44ValidationCommandPreflightV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP44ValidationCommandPreflightV2FixtureProbesPassed}/${report.summary.exactApprovalP44ValidationCommandPreflightV2FixtureProbes}`,
    `- Exact approval P44 validation command preflight V2 ready for apply: ${report.summary.exactApprovalP44ValidationCommandPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P44 validation command preflight V2 may modify production app files: ${report.summary.exactApprovalP44ValidationCommandPreflightV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 blockers: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2Blockers}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 present: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2Present ? 'yes' : 'no'}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 state: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2State}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 ready: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 P44/P45: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2P44Status}/${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2P44ValidationState}/${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2P45Status}/${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2P45PreflightState}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 current/sim/executed/probes: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2CurrentHandoffWouldOpenSequence ? 'yes' : 'no'}/${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2SimulatedPostP44P45WouldOpenSequence ? 'yes' : 'no'}/${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbesPassed}/${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbes}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 ready for apply: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P44 to P45 sequence handoff simulation V2 may modify production app files: ${report.summary.exactApprovalP44ToP45SequenceHandoffSimulationV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P45 sequence command preflight V2 blockers: ${report.summary.exactApprovalP45SequenceCommandPreflightV2Blockers}`,
    `- Exact approval P45 sequence command preflight V2 present: ${report.summary.exactApprovalP45SequenceCommandPreflightV2Present ? 'yes' : 'no'}`,
    `- Exact approval P45 sequence command preflight V2 state: ${report.summary.exactApprovalP45SequenceCommandPreflightV2State}`,
    `- Exact approval P45 sequence command preflight V2 ready: ${report.summary.exactApprovalP45SequenceCommandPreflightV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P45 sequence command preflight V2 P45: ${report.summary.exactApprovalP45SequenceCommandPreflightV2P45Status}/${report.summary.exactApprovalP45SequenceCommandPreflightV2P45PreflightState}`,
    `- Exact approval P45 sequence command preflight V2 command now/after-P44/executed/probes: ${report.summary.exactApprovalP45SequenceCommandPreflightV2CommandAllowedNow ? 'yes' : 'no'}/${report.summary.exactApprovalP45SequenceCommandPreflightV2CommandAllowedAfterP44Validation ? 'yes' : 'no'}/${report.summary.exactApprovalP45SequenceCommandPreflightV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP45SequenceCommandPreflightV2FixtureProbesPassed}/${report.summary.exactApprovalP45SequenceCommandPreflightV2FixtureProbes}`,
    `- Exact approval P45 sequence command preflight V2 ready for apply: ${report.summary.exactApprovalP45SequenceCommandPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P45 sequence command preflight V2 may modify production app files: ${report.summary.exactApprovalP45SequenceCommandPreflightV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 blockers: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Blockers}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 present: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present ? 'yes' : 'no'}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 state: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 ready: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 P45/P46: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45Status}/${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45PreflightState}/${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46Status}/${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46TransactionState}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 current/sim/executed/probes: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CurrentHandoffWouldOpenTransaction ? 'yes' : 'no'}/${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2SimulatedPostP45P46WouldOpenTransaction ? 'yes' : 'no'}/${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbesPassed}/${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbes}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 ready for apply: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P45 to P46 apply transaction handoff simulation V2 may modify production app files: ${report.summary.exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P46 apply transaction command preflight V2 blockers: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2Blockers}`,
    `- Exact approval P46 apply transaction command preflight V2 present: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2Present ? 'yes' : 'no'}`,
    `- Exact approval P46 apply transaction command preflight V2 state: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2State}`,
    `- Exact approval P46 apply transaction command preflight V2 ready: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P46 apply transaction command preflight V2 P45/P46: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2P45Status}/${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2P45PreflightState}/${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2P46Status}/${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2P46TransactionState}`,
    `- Exact approval P46 apply transaction command preflight V2 command now/after-P45/executed/probes: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedNow ? 'yes' : 'no'}/${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedAfterP45Sequence ? 'yes' : 'no'}/${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbesPassed}/${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbes}`,
    `- Exact approval P46 apply transaction command preflight V2 ready for apply: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P46 apply transaction command preflight V2 may modify production app files: ${report.summary.exactApprovalP46ApplyTransactionCommandPreflightV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 blockers: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Blockers}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 present: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present ? 'yes' : 'no'}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 state: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 ready: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 P46/P47: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46Status}/${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46TransactionState}/${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47Status}/${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47GuardState}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 current/sim/executed/probes: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CurrentHandoffWouldOpenRollbackGuard ? 'yes' : 'no'}/${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2SimulatedPostP46P47WouldOpenRollbackGuard ? 'yes' : 'no'}/${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbesPassed}/${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbes}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 ready for apply: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P46 to P47 rollback guard handoff simulation V2 may modify production app files: ${report.summary.exactApprovalP46ToP47RollbackGuardHandoffSimulationV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P47 rollback guard command preflight V2 blockers: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2Blockers}`,
    `- Exact approval P47 rollback guard command preflight V2 present: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2Present ? 'yes' : 'no'}`,
    `- Exact approval P47 rollback guard command preflight V2 state: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2State}`,
    `- Exact approval P47 rollback guard command preflight V2 ready: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P47 rollback guard command preflight V2 P46/P47: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2P46Status}/${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2P46TransactionState}/${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2P47Status}/${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2P47GuardState}`,
    `- Exact approval P47 rollback guard command preflight V2 command now/after-P46/executed/probes: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedNow ? 'yes' : 'no'}/${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedAfterP46Contract ? 'yes' : 'no'}/${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbesPassed}/${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbes}`,
    `- Exact approval P47 rollback guard command preflight V2 ready for apply: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P47 rollback guard command preflight V2 may modify production app files: ${report.summary.exactApprovalP47RollbackGuardCommandPreflightV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 blockers: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Blockers}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 present: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present ? 'yes' : 'no'}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 state: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 ready: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 P47/P48: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47Status}/${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47GuardState}/${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48Status}/${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48ContinuationState}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 current/sim/executed/probes: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CurrentHandoffWouldOpenSafeContinuation ? 'yes' : 'no'}/${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation ? 'yes' : 'no'}/${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbesPassed}/${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbes}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 ready for apply: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P47 to P48 safe continuation handoff simulation V2 may modify production app files: ${report.summary.exactApprovalP47ToP48SafeContinuationHandoffSimulationV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval P48 safe continuation command preflight V2 blockers: ${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2Blockers}`,
    `- Exact approval P48 safe continuation command preflight V2 present: ${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2Present ? 'yes' : 'no'}`,
    `- Exact approval P48 safe continuation command preflight V2 state: ${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2State}`,
    `- Exact approval P48 safe continuation command preflight V2 ready: ${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2Ready ? 'yes' : 'no'}`,
    `- Exact approval P48 safe continuation command preflight V2 P48/allowed/executed/probes: ${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2P48Status}/${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2P48ContinuationState}/${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2CommandAllowedNow ? 'yes' : 'no'}/${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2CommandExecutedByThisScript ? 'yes' : 'no'}/${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbesPassed}/${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbes}`,
    `- Exact approval P48 safe continuation command preflight V2 ready for apply: ${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval P48 safe continuation command preflight V2 may modify production app files: ${report.summary.exactApprovalP48SafeContinuationCommandPreflightV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval wait-state V2 blockers: ${report.summary.exactApprovalWaitStateV2Blockers}`,
    `- Exact approval wait-state V2 present: ${report.summary.exactApprovalWaitStateV2Present ? 'yes' : 'no'}`,
    `- Exact approval wait-state V2 state: ${report.summary.exactApprovalWaitStateV2State}`,
    `- Exact approval wait-state V2 ready: ${report.summary.exactApprovalWaitStateV2Ready ? 'yes' : 'no'}`,
    `- Exact approval wait-state V2 closed/source/default/active/probes: ${report.summary.exactApprovalWaitStateV2ClosedEvidenceReady ? 'yes' : 'no'}/${report.summary.exactApprovalWaitStateV2SourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalWaitStateV2ApprovalSourceIsCanonical ? 'yes' : 'no'}/${report.summary.exactApprovalWaitStateV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalWaitStateV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.exactApprovalWaitStateV2FixtureProbesPassed}/${report.summary.exactApprovalWaitStateV2FixtureProbes}`,
    `- Exact approval wait-state V2 ready for apply: ${report.summary.exactApprovalWaitStateV2ReadyForApply ? 'yes' : 'no'}`,
    `- Exact approval wait-state V2 may modify production app files: ${report.summary.exactApprovalWaitStateV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Ordered approval-wait refresh V2 blockers: ${report.summary.orderedApprovalWaitRefreshV2Blockers}`,
    `- Ordered approval-wait refresh V2 present: ${report.summary.orderedApprovalWaitRefreshV2Present ? 'yes' : 'no'}`,
    `- Ordered approval-wait refresh V2 ready: ${report.summary.orderedApprovalWaitRefreshV2Ready ? 'yes' : 'no'}`,
    `- Ordered approval-wait refresh V2 executed/steps failed: ${report.summary.orderedApprovalWaitRefreshV2Executed ? 'yes' : 'no'}/${report.summary.orderedApprovalWaitRefreshV2StepsFailed}`,
    `- Ordered approval-wait refresh V2 P65/final master/final next: ${report.summary.orderedApprovalWaitRefreshV2P65Status}/${report.summary.orderedApprovalWaitRefreshV2P65WaitState}/${report.summary.orderedApprovalWaitRefreshV2FinalMasterBlockers}/${report.summary.orderedApprovalWaitRefreshV2FinalMasterWarnings}/${report.summary.orderedApprovalWaitRefreshV2FinalNextBlockers}/${report.summary.orderedApprovalWaitRefreshV2FinalNextWarnings}`,
    `- Ordered approval-wait refresh V2 active/apply flags: ${report.summary.orderedApprovalWaitRefreshV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.orderedApprovalWaitRefreshV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.orderedApprovalWaitRefreshV2ReadyForApply ? 'yes' : 'no'}/${report.summary.orderedApprovalWaitRefreshV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Safe preapproval continuation V2 blockers: ${report.summary.safePreapprovalContinuationV2Blockers}`,
    `- Safe preapproval continuation V2 present: ${report.summary.safePreapprovalContinuationV2Present ? 'yes' : 'no'}`,
    `- Safe preapproval continuation V2 ready: ${report.summary.safePreapprovalContinuationV2Ready ? 'yes' : 'no'}`,
    `- Safe preapproval continuation V2 executed/steps failed: ${report.summary.safePreapprovalContinuationV2Executed ? 'yes' : 'no'}/${report.summary.safePreapprovalContinuationV2StepsFailed}`,
    `- Safe preapproval continuation V2 generation/apply blockers: ${report.summary.safePreapprovalContinuationV2GenerationBlockers}/${report.summary.safePreapprovalContinuationV2ApplyBlockers}`,
    `- Safe preapproval continuation V2 next goal: ${report.summary.safePreapprovalContinuationV2NextGoalId}`,
    `- Safe preapproval continuation V2 active/apply flags: ${report.summary.safePreapprovalContinuationV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.safePreapprovalContinuationV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.safePreapprovalContinuationV2ReadyForApply ? 'yes' : 'no'}/${report.summary.safePreapprovalContinuationV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Final production readiness gap V2 blockers: ${report.summary.finalProductionReadinessGapV2Blockers}`,
    `- Final production readiness gap V2 present: ${report.summary.finalProductionReadinessGapV2Present ? 'yes' : 'no'}`,
    `- Final production readiness gap V2 ready: ${report.summary.finalProductionReadinessGapV2Ready ? 'yes' : 'no'}`,
    `- Final production readiness gap V2 state: ${report.summary.finalProductionReadinessGapV2State}`,
    `- Final production readiness gap V2 ready/blocked/hard/apply: ${report.summary.finalProductionReadinessGapV2RequirementsReady}/${report.summary.finalProductionReadinessGapV2RequirementsBlocked}/${report.summary.finalProductionReadinessGapV2ProductionHardBlockers}/${report.summary.finalProductionReadinessGapV2CanStartProductionApply ? 'yes' : 'no'}`,
    `- Final production readiness gap V2 active/apply flags: ${report.summary.finalProductionReadinessGapV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.finalProductionReadinessGapV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.finalProductionReadinessGapV2ReadyForApply ? 'yes' : 'no'}/${report.summary.finalProductionReadinessGapV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval source handoff firewall V2 blockers: ${report.summary.exactApprovalSourceHandoffFirewallV2Blockers}`,
    `- Exact approval source handoff firewall V2 present: ${report.summary.exactApprovalSourceHandoffFirewallV2Present ? 'yes' : 'no'}`,
    `- Exact approval source handoff firewall V2 ready: ${report.summary.exactApprovalSourceHandoffFirewallV2Ready ? 'yes' : 'no'}`,
    `- Exact approval source handoff firewall V2 state: ${report.summary.exactApprovalSourceHandoffFirewallV2State}`,
    `- Exact approval source handoff firewall V2 final/P65/P31: ${report.summary.exactApprovalSourceHandoffFirewallV2FinalGapReady ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2ExactApprovalWaitStateReady ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2P31CreationGateReady ? 'yes' : 'no'}`,
    `- Exact approval source handoff firewall V2 source/routes/probes: ${report.summary.exactApprovalSourceHandoffFirewallV2ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2NextAllowedStepWhileAbsent}/${report.summary.exactApprovalSourceHandoffFirewallV2NextAllowedStepWhenPresent}/${report.summary.exactApprovalSourceHandoffFirewallV2FixtureProbesPassed}/${report.summary.exactApprovalSourceHandoffFirewallV2FixtureProbes}`,
    `- Exact approval source handoff firewall V2 active/apply flags: ${report.summary.exactApprovalSourceHandoffFirewallV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2CanStartProductionApply ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2ReadyForApply ? 'yes' : 'no'}/${report.summary.exactApprovalSourceHandoffFirewallV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Exact approval source wait terminal state V2 blockers: ${report.summary.exactApprovalSourceWaitTerminalStateV2Blockers}`,
    `- Exact approval source wait terminal state V2 present: ${report.summary.exactApprovalSourceWaitTerminalStateV2Present ? 'yes' : 'no'}`,
    `- Exact approval source wait terminal state V2 ready: ${report.summary.exactApprovalSourceWaitTerminalStateV2Ready ? 'yes' : 'no'}`,
    `- Exact approval source wait terminal state V2 state: ${report.summary.exactApprovalSourceWaitTerminalStateV2State}`,
    `- Exact approval source wait terminal state V2 P68/next/consistency: ${report.summary.exactApprovalSourceWaitTerminalStateV2P68Ready ? 'yes' : 'no'}/${report.summary.exactApprovalSourceWaitTerminalStateV2NextGoalId}/${report.summary.exactApprovalSourceWaitTerminalStateV2ConsistencyGoalId}`,
    `- Exact approval source wait terminal state V2 source/active/apply/probes: ${report.summary.exactApprovalSourceWaitTerminalStateV2ApprovalSourceExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceWaitTerminalStateV2ApprovalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.exactApprovalSourceWaitTerminalStateV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceWaitTerminalStateV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.exactApprovalSourceWaitTerminalStateV2CanStartProductionApply ? 'yes' : 'no'}/${report.summary.exactApprovalSourceWaitTerminalStateV2FixtureProbesPassed}/${report.summary.exactApprovalSourceWaitTerminalStateV2FixtureProbes}`,
    `- Post exact approval apply runbook V2 blockers: ${report.summary.postExactApprovalApplyRunbookV2Blockers}`,
    `- Post exact approval apply runbook V2 present: ${report.summary.postExactApprovalApplyRunbookV2Present ? 'yes' : 'no'}`,
    `- Post exact approval apply runbook V2 ready: ${report.summary.postExactApprovalApplyRunbookV2Ready ? 'yes' : 'no'}`,
    `- Post exact approval apply runbook V2 state: ${report.summary.postExactApprovalApplyRunbookV2State}`,
    `- Post exact approval apply runbook V2 steps/probes: ${report.summary.postExactApprovalApplyRunbookV2Steps}/${report.summary.postExactApprovalApplyRunbookV2FixtureProbesPassed}/${report.summary.postExactApprovalApplyRunbookV2FixtureProbes}`,
    `- Post exact approval apply runbook V2 P31 now/after source: ${report.summary.postExactApprovalApplyRunbookV2P31CreateAllowedNow ? 'yes' : 'no'}/${report.summary.postExactApprovalApplyRunbookV2P31CreateAllowedWhenExactSourcePresent ? 'yes' : 'no'}`,
    `- Post exact approval apply runbook V2 writes/active/apply: ${report.summary.postExactApprovalApplyRunbookV2ProductionWritesAllowedNow ? 'yes' : 'no'}/${report.summary.postExactApprovalApplyRunbookV2ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.postExactApprovalApplyRunbookV2ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.postExactApprovalApplyRunbookV2CanStartProductionApplyNow ? 'yes' : 'no'}`,
    `- Research JSON firewall blockers: ${report.summary.researchJsonFirewallBlockers}`,
    `- Research JSON firewall warnings: ${report.summary.researchJsonFirewallWarnings}`,
    `- Next-pass contract blockers: ${report.summary.nextPassContractBlockers}`,
    `- Next-pass contract warnings: ${report.summary.nextPassContractWarnings}`,
    `- Next-pass large goals: ${report.summary.nextPassLargeGoals}`,
    `- Next pass prepared: ${report.summary.nextPassPrepared ? 'yes' : 'no'}`,
    `- Ready for next large pass: ${report.summary.readyForNextLargePass ? 'yes' : 'no'}`,
    `- Run validator blockers: ${report.summary.runValidatorBlockers}`,
    `- Generation blockers: ${report.summary.generationBlockers}`,
    `- Apply blockers: ${report.summary.applyBlockers}`,
    `- Critical artifacts missing: ${report.summary.criticalArtifactsMissing}`,
    `- Raw blockers: ${report.summary.blockersRaw}`,
    `- Terminal wait self-cycle blockers suppressed: ${report.summary.terminalWaitSelfCycleBlockersSuppressed}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for research pack builder: ${report.summary.readyForResearchPackBuilder ? 'yes' : 'no'}`,
    `- Ready for Generation V2 inputs payload/self/domain/legacy-gap: ${report.summary.readyForGenerationV2PayloadPreflightReady ? 'yes' : 'no'}/${report.summary.readyForGenerationV2SelfImprovingReady ? 'yes' : 'no'}/${report.summary.readyForGenerationV2DomainRegistryReady ? 'yes' : 'no'}/${report.summary.readyForGenerationV2BlockedByLegacyResearchGaps ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Reviewer Files By Extension',
    '',
  ];
  for (const ext of Object.keys(report.summary.reviewerSourceFilesByExtension).sort()) {
    lines.push(`- \`${ext}\`: ${report.summary.reviewerSourceFilesByExtension[ext]}`);
  }
  lines.push('', '## Source Reports', '');
  for (const sourceReportEntry of report.sourceReports) {
    const statusText = sourceReportEntry.status || sourceReportEntry.decision || 'n/a';
    lines.push(`- \`${sourceReportEntry.path}\`: ${statusText}, sha256 \`${sourceReportEntry.sha256}\``);
  }
  lines.push('', '## Output Artifacts', '');
  lines.push(`- Manifest JSON: \`${report.outputArtifacts.manifestJson}\``);
  lines.push(`- Manifest MD: \`${report.outputArtifacts.manifestMd}\``);
  lines.push(`- Packet JSON: \`${report.outputArtifacts.packetJson}\``);
  lines.push(`- Packet MD: \`${report.outputArtifacts.packetMd}\``);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
    }
  }
  lines.push('', '## Safety', '');
  lines.push('- This manifest is a read-only inventory of generated French reviewer artifacts.');
  lines.push('- It does not modify generated lesson ledgers.');
  lines.push('- It does not write reviewer decisions.');
  lines.push('- It does not create production apply approval.');
  lines.push('- It does not modify production app files.');
  lines.push('- French rows remain blocked pending LLM official-source review.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_french_reviewer_master_manifest.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const lessonsDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const findings: Finding[] = [];

  for (const relativePath of [...CRITICAL_REPORTS, ...CRITICAL_REVIEWER_ARTIFACTS]) {
    const fullPath = runPath(runDir, relativePath);
    if (!fs.existsSync(fullPath)) {
      addBlocker(findings, 'critical_artifact_missing', 'A critical French reviewer package artifact is missing.', fullPath, repoRoot);
    }
  }

  const sourceReports: SourceReportEntry[] = [];
  for (const relativePath of CRITICAL_REPORTS) {
    const fullPath = runPath(runDir, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    try {
      sourceReports.push(sourceReport(repoRoot, fullPath));
    } catch (error) {
      addBlocker(findings, 'source_report_parse_error', `Could not parse critical report: ${String(error)}`, fullPath, repoRoot);
    }
  }
  for (const relativePath of OPTIONAL_SOURCE_REPORTS) {
    const fullPath = runPath(runDir, relativePath);
    if (!fs.existsSync(fullPath)) continue;
    try {
      sourceReports.push(sourceReport(repoRoot, fullPath));
    } catch (error) {
      addBlocker(findings, 'optional_source_report_parse_error', `Could not parse optional report: ${String(error)}`, fullPath, repoRoot);
    }
  }

  const lessonLedgers = walkFiles(lessonsDir)
    .filter((file) => /^lesson\d+_row_ledger\.json$/.test(path.basename(file)))
    .sort((a, bValue) => Number(path.basename(a).match(/\d+/)?.[0] ?? 0) - Number(path.basename(bValue).match(/\d+/)?.[0] ?? 0));
  const generatedRows = lessonLedgers.reduce((sum, file) => sum + countLedgerRows(file, findings, repoRoot), 0);

  const reviewerSourceFiles = walkFiles(reviewerDir).filter((file) => !isMasterManifestOutput(file));
  const auditArtifactFiles = walkFiles(auditsDir).filter((file) => !isMasterPacketOutput(file));
  const reviewerSourceFilesByExtension = countByExtension(reviewerSourceFiles);

  const batchJsonlFiles = reviewerSourceFiles.filter((file) => path.basename(path.dirname(file)) === 'batches' && extensionOf(file) === '.jsonl').length;
  const batchTsvFiles = reviewerSourceFiles.filter((file) => path.basename(path.dirname(file)) === 'batches' && extensionOf(file) === '.tsv').length;

  if (lessonLedgers.length !== EXPECTED_LESSON_LEDGER_COUNT) {
    addBlocker(
      findings,
      'generated_lesson_ledger_count_invalid',
      `Expected ${EXPECTED_LESSON_LEDGER_COUNT} generated lesson ledgers, found ${lessonLedgers.length}.`,
    );
  }
  if (generatedRows !== EXPECTED_ROW_COUNT) {
    addBlocker(findings, 'generated_row_count_invalid', `Expected ${EXPECTED_ROW_COUNT} generated rows, found ${generatedRows}.`);
  }
  if (batchJsonlFiles !== EXPECTED_BATCH_FILE_COUNT || batchTsvFiles !== EXPECTED_BATCH_FILE_COUNT) {
    addBlocker(
      findings,
      'review_batch_file_count_invalid',
      `Expected ${EXPECTED_BATCH_FILE_COUNT} JSONL and ${EXPECTED_BATCH_FILE_COUNT} TSV batch files, found jsonl=${batchJsonlFiles}, tsv=${batchTsvFiles}.`,
    );
  }

  const languageIsolation = reportSummary(sourceReports, 'french_language_isolation_audit.json');
  const translationQa = reportSummary(sourceReports, 'french_translation_qa_audit.json');
  const generatedContent = reportSummary(sourceReports, 'generated_content_audit.json');
  const runtimeContentIntegrity = reportSummary(sourceReports, 'french_runtime_content_integrity_audit.json');
  const handoffIntegrity = reportSummary(sourceReports, 'french_reviewer_handoff_integrity_audit.json');
  const batchFilesIntegrity = reportSummary(sourceReports, 'french_reviewer_batch_files_integrity_audit.json');
  const decisionTemplateIntegrity = reportSummary(sourceReports, 'french_review_decision_template_integrity_audit.json');
  const decisionImportDryRun = reportSummary(sourceReports, 'french_review_decision_import_dry_run.json');
  const starterNoopDryRun = reportSummary(sourceReports, 'french_review_decision_import_dry_run_starter_priority_ordered_noop.json');
  const fixtureQa = reportSummary(sourceReports, 'french_review_decision_import_fixture_qa.json');
  const priorityAudit = reportSummary(sourceReports, 'french_reviewer_priority_audit.json');
  const priorityIntegrity = reportSummary(sourceReports, 'french_reviewer_priority_integrity_audit.json');
  const priorityBatches = reportSummary(sourceReports, 'french_reviewer_priority_batches_packet.json');
  const reviewerExecutionWorkOrder = reportSummary(sourceReports, 'french_reviewer_execution_work_order.json');
  const reviewStarterPack = reportSummary(sourceReports, 'french_review_starter_pack.json');
  const reviewProgress = reportSummary(sourceReports, 'french_review_progress_audit_starter_priority_ordered.json');
  const selfImprovingUpgrade = reportSummary(sourceReports, 'self_improving_pipeline_upgrade_packet.json');
  const generationHistory = reportSummary(sourceReports, 'generation_history_reconciliation_audit.json');
  const appAtlasRefresh = reportSummary(sourceReports, 'app_atlas_refresh_audit.json');
  const domainRegistryV2 = reportSummary(sourceReports, 'algorithm_domain_registry_v2_packet.json');
  const targetResearchPackBuilder = reportSummary(sourceReports, 'target_research_pack_builder_packet.json');
  const targetResearchPackVerify = reportSummary(sourceReports, 'target_research_pack_verify_audit.json');
  const targetPedagogyBlueprint = reportSummary(sourceReports, 'target_pedagogy_blueprint_packet.json');
  const generationSchemaV2 = reportSummary(sourceReports, 'generation_schema_v2_packet.json');
  const aiPromptContractV2 = reportSummary(sourceReports, 'ai_prompt_contract_v2_packet.json');
  const contentQualityGatesV2 = reportSummary(sourceReports, 'content_quality_gates_v2_packet.json');
  const reviewerWorkflowV2 = reportSummary(sourceReports, 'reviewer_workflow_v2_packet.json');
  const targetPackManifestV2 = reportSummary(sourceReports, 'target_pack_manifest_v2_packet.json');
  const runtimeServerDeliveryContractV2 = reportSummary(sourceReports, 'runtime_server_delivery_contract_v2_packet.json');
  const storageCloudTargetMapV2 = reportSummary(sourceReports, 'storage_cloud_target_map_v2_packet.json');
  const adminReviewerDeliverySurfaceV2 = reportSummary(sourceReports, 'admin_pack_delivery_surface_v2_packet.json');
  const reviewerDecisionImportV2DryRun = reportSummary(sourceReports, 'reviewer_decision_import_v2_dry_run.json');
  const payloadShardMaterializationChecksumV2 = reportSummary(sourceReports, 'payload_shard_materialization_checksum_v2_packet.json');
  const serverDeliveryManifestPreviewV2 = reportSummary(sourceReports, 'server_delivery_manifest_preview_v2_packet.json');
  const runtimeCacheIntegrityRollbackV2 = reportSummary(sourceReports, 'runtime_cache_integrity_rollback_v2_packet.json');
  const reviewerDecisionImportOpeningPreflightV2 = reportSummary(sourceReports, 'reviewer_decision_import_opening_preflight_v2_packet.json');
  const llmOfficialSourceReviewIntakeV2 = reportSummary(sourceReports, 'llm_official_source_review_intake_v2_packet.json');
  const reviewerDecisionImportExecutionGateV2 = reportSummary(sourceReports, 'reviewer_decision_import_execution_gate_v2_packet.json');
  const llmOfficialSourceDecisionMaterializationV2 = reportSummary(sourceReports, 'llm_official_source_decision_materialization_v2_packet.json');
  const llmOfficialSourceDecisionDryRunV2 = reportSummary(sourceReports, 'llm_official_source_decision_dry_run_v2_packet.json');
  const llmOfficialSourceDecisionPromotionPreflightV2 = reportSummary(sourceReports, 'llm_official_source_decision_promotion_preflight_v2_packet.json');
  const llmOfficialSourcePromotedDecisionFileGenerationV2 = reportSummary(sourceReports, 'llm_official_source_promoted_decision_file_generation_v2_packet.json');
  const legacyGeneratedResearchEvidenceBridgeV2 = reportSummary(sourceReports, 'legacy_generated_research_evidence_bridge_v2_packet.json');
  const payloadCreationApprovalPreflightV2 = reportSummary(sourceReports, 'payload_creation_approval_preflight_v2_packet.json');
  const closedLocalPayloadMaterializationV2 = reportSummary(sourceReports, 'closed_local_payload_materialization_v2_packet.json');
  const serverDeliveryPublishPreflightV2 = reportSummary(sourceReports, 'server_delivery_publish_preflight_v2_packet.json');
  const productionServerManifestPublishGateV2 = reportSummary(sourceReports, 'production_server_manifest_publish_gate_v2_packet.json');
  const frenchServerRemoteCredentialHandoffV2 = reportSummary(sourceReports, 'french_server_remote_credential_handoff_v2_packet.json');
  const frenchUploadRemoteVerifyParityV2 = reportSummary(sourceReports, 'french_upload_remote_verify_parity_v2_packet.json');
  const frenchServerObjectRemoteVerifyV2 = reportSummary(sourceReports, 'french_server_object_remote_verify_v2_packet.json');
  const adminServerDeliveryRuntimePreflightV2 = reportSummary(sourceReports, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const runtimeActivationBlockerPlanV2 = reportSummary(sourceReports, 'runtime_activation_blocker_plan_v2_packet.json');
  const runtimeDeliveryEvidenceChainV2 = reportSummary(sourceReports, 'runtime_delivery_evidence_chain_v2_packet.json');
  const explicitApprovalReceiptHashLockGateV2 = reportSummary(sourceReports, 'explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const activationApprovalRequestPresentationV2 = reportSummary(sourceReports, 'activation_approval_request_presentation_v2_packet.json');
  const explicitApprovalReceiptCreationGateV2 = reportSummary(sourceReports, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const productionApplyAbsenceDenialGateV2 = reportSummary(sourceReports, 'production_apply_absence_denial_gate_v2_packet.json');
  const nonproductionBlockerClosurePlanV2 = reportSummary(sourceReports, 'nonproduction_blocker_closure_plan_v2_packet.json');
  const nonproductionEvidenceRefreshV2 = reportSummary(sourceReports, 'nonproduction_evidence_refresh_v2_packet.json');
  const runtimeServerManifestConsistencyRecheckV2 = reportSummary(sourceReports, 'runtime_server_manifest_consistency_recheck_v2_packet.json');
  const languageIsolationRegressionRecheckV2 = reportSummary(sourceReports, 'language_isolation_regression_recheck_v2_packet.json');
  const readinessApplyBlockerMapRefreshV2 = reportSummary(sourceReports, 'readiness_apply_blocker_map_refresh_v2_packet.json');
  const masterNextPassConsistencyRefreshV2 = reportSummary(sourceReports, 'master_next_pass_consistency_refresh_v2_packet.json');
  const officialSourceContentCoverageV2 = reportSummary(sourceReports, 'french_official_source_content_coverage_v2_packet.json');
  const productionActivationHoldExactApprovalRequiredV2 = reportSummary(sourceReports, 'production_activation_hold_exact_approval_required_v2_packet.json');
  const exactApprovalValidationGateV2 = reportSummary(sourceReports, 'exact_approval_validation_gate_v2_packet.json');
  const productionActivationSequencePreflightV2 = reportSummary(sourceReports, 'production_activation_sequence_preflight_v2_packet.json');
  const productionApplyTransactionContractV2 = reportSummary(sourceReports, 'production_apply_transaction_contract_v2_packet.json');
  const postApplyRollbackGuardContractV2 = reportSummary(sourceReports, 'post_apply_rollback_guard_contract_v2_packet.json');
  const approvalWaitSafeContinuationV2 = reportSummary(sourceReports, 'approval_wait_safe_continuation_v2_packet.json');
  const productionReadinessCompletionAuditV2 = reportSummary(sourceReports, 'production_readiness_completion_audit_v2_packet.json');
  const finalPreapprovalEvidenceHashLockV2 = reportSummary(sourceReports, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const exactApprovalApplyRehearsalV2 = reportSummary(sourceReports, 'exact_approval_apply_rehearsal_v2_packet.json');
  const exactApprovalSourceFirewallV2 = reportSummary(sourceReports, 'exact_approval_source_firewall_v2_packet.json');
  const exactApprovalSourceIntakeTransitionV2 = reportSummary(sourceReports, 'exact_approval_source_intake_transition_v2_packet.json');
  const exactApprovalActiveArtifactPairSimulationV2 = reportSummary(sourceReports, 'exact_approval_active_artifact_pair_simulation_v2_packet.json');
  const exactApprovalP31CreateCommandPreflightV2 = reportSummary(sourceReports, 'exact_approval_p31_create_command_preflight_v2_packet.json');
  const exactApprovalP44ValidationCommandPreflightV2 = reportSummary(sourceReports, 'exact_approval_p44_validation_command_preflight_v2_packet.json');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2 = reportSummary(sourceReports, 'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.json');
  const exactApprovalP45SequenceCommandPreflightV2 = reportSummary(sourceReports, 'exact_approval_p45_sequence_command_preflight_v2_packet.json');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2 = reportSummary(sourceReports, 'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.json');
  const exactApprovalP46ApplyTransactionCommandPreflightV2 = reportSummary(sourceReports, 'exact_approval_p46_apply_transaction_command_preflight_v2_packet.json');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2 = reportSummary(sourceReports, 'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.json');
  const exactApprovalP47RollbackGuardCommandPreflightV2 = reportSummary(sourceReports, 'exact_approval_p47_rollback_guard_command_preflight_v2_packet.json');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2 = reportSummary(sourceReports, 'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.json');
  const exactApprovalP48SafeContinuationCommandPreflightV2 = reportSummary(sourceReports, 'exact_approval_p48_safe_continuation_command_preflight_v2_packet.json');
  const exactApprovalWaitStateV2 = reportSummary(sourceReports, 'exact_approval_wait_state_v2_packet.json');
  const orderedApprovalWaitRefreshV2 = reportSummary(sourceReports, 'ordered_approval_wait_refresh_v2_packet.json');
  const safePreapprovalContinuationV2 = reportSummary(sourceReports, 'safe_preapproval_continuation_v2_packet.json');
  const finalProductionReadinessGapV2 = reportSummary(sourceReports, 'final_production_readiness_gap_v2_packet.json');
  const exactApprovalSourceHandoffFirewallV2 = reportSummary(sourceReports, 'exact_approval_source_handoff_firewall_v2_packet.json');
  const exactApprovalSourceWaitTerminalStateV2 = reportSummary(sourceReports, 'exact_approval_source_wait_terminal_state_v2_packet.json');
  const postExactApprovalApplyRunbookV2 = reportSummary(sourceReports, 'post_exact_approval_apply_runbook_v2_packet.json');
  const researchJsonFirewall = reportSummary(sourceReports, 'french_research_json_firewall_audit.json');
  const nextPassContract = reportSummary(sourceReports, 'next_pass_goal_contract_packet.json');
  const readinessBlockers = reportSummary(sourceReports, 'readiness_blocker_reduction_packet.json');
  const runValidator = reportSummary(sourceReports, 'run_validator_report.json');

  const languageIsolationBlockers = n(languageIsolation, 'blockers');
  const languageIsolationWarnings = n(languageIsolation, 'warnings');
  const rowsMissingTargetLocale = n(languageIsolation, 'rowsMissingTargetLocale');
  const translationQaBlockers = n(translationQa, 'blockers');
  const generatedContentBlockers = n(generatedContent, 'blockers');
  const runtimeContentIntegrityBlockers = n(runtimeContentIntegrity, 'blockers');
  const runtimeContentIntegrityWarnings = n(runtimeContentIntegrity, 'warnings');
  const runtimeContentIntegrityFilesScanned = n(runtimeContentIntegrity, 'filesScanned');
  const runtimeContentIntegrityTextFieldsScanned = n(runtimeContentIntegrity, 'textFieldsScanned');
  const runtimeContentIntegrityPlaceholderTextFields = n(runtimeContentIntegrity, 'placeholderTextFields');
  const runtimeContentIntegrityMojibakeFields = n(runtimeContentIntegrity, 'mojibakeFields');
  const runtimeContentIntegrityReplacementCharFields = n(runtimeContentIntegrity, 'replacementCharFields');
  const runtimeContentIntegrityRuntimePayloadFiles = n(runtimeContentIntegrity, 'runtimePayloadFiles');
  const handoffIntegrityBlockers = n(handoffIntegrity, 'blockers');
  const batchFilesIntegrityBlockers = n(batchFilesIntegrity, 'blockers');
  const decisionTemplateIntegrityBlockers = n(decisionTemplateIntegrity, 'blockers');
  const decisionImportDryRunBlockers = n(decisionImportDryRun, 'blockers');
  const starterNoopDryRunBlockers = n(starterNoopDryRun, 'blockers');
  const fixtureQaBlockers = n(fixtureQa, 'blockers');
  const priorityAuditBlockers = n(priorityAudit, 'blockers');
  const priorityIntegrityBlockers = n(priorityIntegrity, 'blockers');
  const priorityBatchesBlockers = n(priorityBatches, 'findingsBlockers') || n(priorityBatches, 'blockers');
  const reviewerExecutionWorkOrderBlockers = n(reviewerExecutionWorkOrder, 'blockers');
  const reviewStarterPackBlockers = n(reviewStarterPack, 'blockers');
  const reviewProgressBlockers = n(reviewProgress, 'blockers');
  const selfImprovingUpgradeBlockers = n(selfImprovingUpgrade, 'blockers');
  const unresolvedCriticalWeaknesses = n(selfImprovingUpgrade, 'unresolvedCriticalWeaknesses');
  const generationHistoryBlockers = n(generationHistory, 'blockers');
  const generationHistoryWarnings = n(generationHistory, 'warnings');
  const legacyGeneratedWithoutResearchPackRows = n(generationHistory, 'legacyGeneratedWithoutResearchPackRows');
  const generatedRowsMissingResearchEvidenceIds = n(generationHistory, 'generatedRowsMissingResearchEvidenceIds');
  const appAtlasRefreshBlockers = n(appAtlasRefresh, 'blockers');
  const appAtlasRefreshWarnings = n(appAtlasRefresh, 'warnings');
  const appAtlasTargetSensitiveFiles = n(appAtlasRefresh, 'targetSensitiveFiles');
  const appAtlasUnclassifiedTargetSensitiveFiles = n(appAtlasRefresh, 'unclassifiedTargetSensitiveFiles');
  const appAtlasAiPromptEntrypoints = n(appAtlasRefresh, 'aiPromptEntrypoints');
  const domainRegistryV2Blockers = n(domainRegistryV2, 'blockers');
  const domainRegistryV2Warnings = n(domainRegistryV2, 'warnings');
  const domainRegistryV2Domains = n(domainRegistryV2, 'registryDomains');
  const domainRegistryV2AiPromptEntrypoints = n(domainRegistryV2, 'aiPromptEntrypoints');
  const domainRegistryV2AiPromptEntrypointsCovered = n(domainRegistryV2, 'aiPromptEntrypointsCovered');
  const domainRegistryV2AiPromptEntrypointsMissing = Math.max(0, domainRegistryV2AiPromptEntrypoints - domainRegistryV2AiPromptEntrypointsCovered);
  const targetResearchPackBuilderBlockers = n(targetResearchPackBuilder, 'blockers');
  const targetResearchPackBuilderWarnings = n(targetResearchPackBuilder, 'warnings');
  const targetResearchPackVerifyBlockers = n(targetResearchPackVerify, 'blockers');
  const targetResearchPackVerifyWarnings = n(targetResearchPackVerify, 'warnings');
  const researchPackPresent = b(targetResearchPackVerify, 'researchPackPresent') || b(targetResearchPackBuilder, 'researchPackPresent');
  const verifiedTrustedSources = n(targetResearchPackVerify, 'requiredSourcesCovered') || n(targetResearchPackVerify, 'trustedSources');
  const verifiedGrammarClusters = n(targetResearchPackVerify, 'grammarClusters') || n(targetResearchPackVerify, 'clusters');
  const researchPackFixtureProbesPassed = n(targetResearchPackVerify, 'fixtureProbesPassed');
  const researchPackFixtureProbes = n(targetResearchPackVerify, 'fixtureProbes');
  const targetPedagogyBlueprintBlockers = n(targetPedagogyBlueprint, 'blockers');
  const targetPedagogyBlueprintWarnings = n(targetPedagogyBlueprint, 'warnings');
  const pedagogyBlueprintPresent = b(targetPedagogyBlueprint, 'readyForGenerationSchemaV2') || n(targetPedagogyBlueprint, 'rowMappings') > 0;
  const pedagogyBlueprintRowMappings = n(targetPedagogyBlueprint, 'rowMappings');
  const pedagogyBlueprintCategoryPolicies = n(targetPedagogyBlueprint, 'categoryPolicies');
  const pedagogyBlueprintAppDomainPolicies = n(targetPedagogyBlueprint, 'appDomainPolicies');
  const pedagogyBlueprintFixtureProbesPassed = n(targetPedagogyBlueprint, 'fixtureProbesPassed');
  const pedagogyBlueprintFixtureProbes = n(targetPedagogyBlueprint, 'fixtureProbes');
  const generationSchemaV2Blockers = n(generationSchemaV2, 'blockers');
  const generationSchemaV2Warnings = n(generationSchemaV2, 'warnings');
  const generationSchemaV2Present = b(generationSchemaV2, 'readyForAiPromptContractV2') || n(generationSchemaV2, 'rowSchemaRequirements') > 0;
  const generationSchemaV2RowRequirements = n(generationSchemaV2, 'rowSchemaRequirements');
  const generationSchemaV2DomainContracts = n(generationSchemaV2, 'domainSchemaContracts');
  const generationSchemaV2FixtureProbesPassed = n(generationSchemaV2, 'fixtureProbesPassed');
  const generationSchemaV2FixtureProbes = n(generationSchemaV2, 'fixtureProbes');
  const aiPromptContractV2Blockers = n(aiPromptContractV2, 'blockers');
  const aiPromptContractV2Warnings = n(aiPromptContractV2, 'warnings');
  const aiPromptContractV2Present = b(aiPromptContractV2, 'readyForContentQualityGatesV2') || n(aiPromptContractV2, 'aiPromptEntrypointContracts') > 0;
  const aiPromptContractV2Entrypoints = n(aiPromptContractV2, 'aiPromptEntrypointContracts');
  const aiPromptContractV2Domains = n(aiPromptContractV2, 'aiPromptDomainsCovered');
  const aiPromptContractV2RejectBeforeReturn = n(aiPromptContractV2, 'contractsWithRejectBeforeReturn');
  const aiPromptContractV2RejectBeforeCache = n(aiPromptContractV2, 'contractsWithRejectBeforeCache');
  const aiPromptContractV2CriticalSurfaceClassesCovered = n(aiPromptContractV2, 'criticalSurfaceClassesCovered');
  const aiPromptContractV2CriticalSurfaceClassesExpected = n(aiPromptContractV2, 'criticalSurfaceClassesExpected');
  const aiPromptContractV2CriticalSurfaceContracts = n(aiPromptContractV2, 'criticalSurfaceContracts');
  const aiPromptContractV2CriticalSurfaceLanguageDimensions = n(aiPromptContractV2, 'criticalSurfaceContractsWithLanguageDimensions');
  const aiPromptContractV2CriticalSurfaceCacheContracts = n(aiPromptContractV2, 'criticalSurfaceContractsWithCacheContract');
  const aiPromptContractV2CriticalSurfaceRejectBeforeReturn = n(aiPromptContractV2, 'criticalSurfaceContractsWithRejectBeforeReturn');
  const aiPromptContractV2CriticalSurfaceRejectBeforeCache = n(aiPromptContractV2, 'criticalSurfaceContractsWithRejectBeforeCache');
  const aiPromptContractV2CriticalSurfaceSafeFallback = n(aiPromptContractV2, 'criticalSurfaceContractsWithLanguageSafeFallback');
  const aiPromptContractV2CriticalSurfaceGenerationBlocked = n(aiPromptContractV2, 'criticalSurfaceContractsGenerationBlocked');
  const aiPromptContractV2CriticalSurfaceRequiredFilesCovered = n(aiPromptContractV2, 'criticalSurfaceRequiredFilesCovered');
  const aiPromptContractV2CriticalSurfaceRequiredFiles = n(aiPromptContractV2, 'criticalSurfaceRequiredFiles');
  const aiPromptContractV2FixtureProbesPassed = n(aiPromptContractV2, 'fixtureProbesPassed');
  const aiPromptContractV2FixtureProbes = n(aiPromptContractV2, 'fixtureProbes');
  const contentQualityGatesV2Blockers = n(contentQualityGatesV2, 'blockers');
  const contentQualityGatesV2Warnings = n(contentQualityGatesV2, 'warnings');
  const contentQualityGatesV2Present = b(contentQualityGatesV2, 'readyForReviewerWorkflowV2') || n(contentQualityGatesV2, 'rowQualityGateRequirements') > 0;
  const contentQualityRowRequirements = n(contentQualityGatesV2, 'rowQualityGateRequirements');
  const contentQualityAiRequirements = n(contentQualityGatesV2, 'aiQualityGateRequirements');
  const contentQualityHighRiskAiRequirements = n(contentQualityGatesV2, 'highRiskAiGateRequirements');
  const contentQualityFixtureProbesPassed = n(contentQualityGatesV2, 'fixtureProbesPassed');
  const contentQualityFixtureProbes = n(contentQualityGatesV2, 'fixtureProbes');
  const reviewerWorkflowV2Blockers = n(reviewerWorkflowV2, 'blockers');
  const reviewerWorkflowV2Warnings = n(reviewerWorkflowV2, 'warnings');
  const reviewerWorkflowV2Present = b(reviewerWorkflowV2, 'readyForLlmOfficialSourceReviewV2') || n(reviewerWorkflowV2, 'rowTemplateRows') > 0;
  const reviewerWorkflowV2RowTemplates = n(reviewerWorkflowV2, 'rowTemplateRows');
  const reviewerWorkflowV2AiTemplates = n(reviewerWorkflowV2, 'aiTemplateRows');
  const reviewerWorkflowV2HighRiskAiTemplates = n(reviewerWorkflowV2, 'highRiskAiTemplateRows');
  const reviewerWorkflowV2RowFixtureProbesPassed = n(reviewerWorkflowV2, 'rowFixtureProbesPassed');
  const reviewerWorkflowV2RowFixtureProbes = n(reviewerWorkflowV2, 'rowFixtureProbes');
  const reviewerWorkflowV2AiFixtureProbesPassed = n(reviewerWorkflowV2, 'aiFixtureProbesPassed');
  const reviewerWorkflowV2AiFixtureProbes = n(reviewerWorkflowV2, 'aiFixtureProbes');
  const targetPackManifestV2Blockers = n(targetPackManifestV2, 'blockers');
  const targetPackManifestV2Warnings = n(targetPackManifestV2, 'warnings');
  const targetPackManifestV2Present = b(targetPackManifestV2, 'manifestDraftCreated') || n(targetPackManifestV2, 'productionBlockers') > 0;
  const targetPackManifestV2ProductionBlockers = n(targetPackManifestV2, 'productionBlockers');
  const targetPackManifestV2RuntimeSliceDrafts = n(targetPackManifestV2, 'runtimeSliceDrafts');
  const targetPackManifestV2GateReports = n(targetPackManifestV2, 'gateReports');
  const targetPackManifestV2LessonRows = n(targetPackManifestV2, 'lessonRows');
  const targetPackManifestV2AiDecisionSlots = n(targetPackManifestV2, 'aiDecisionSlotsV2');
  const runtimeServerDeliveryContractV2Blockers = n(runtimeServerDeliveryContractV2, 'blockers');
  const runtimeServerDeliveryContractV2Warnings = n(runtimeServerDeliveryContractV2, 'warnings');
  const runtimeServerDeliveryContractV2Present =
    b(runtimeServerDeliveryContractV2, 'runtimeServerDeliveryContractCreated') ||
    n(runtimeServerDeliveryContractV2, 'requiredRuntimeSlices') > 0;
  const runtimeServerDeliveryContractV2RequiredSlices = n(runtimeServerDeliveryContractV2, 'requiredRuntimeSlices');
  const runtimeServerDeliveryContractV2CacheKeyContracts = n(runtimeServerDeliveryContractV2, 'runtimeSlicesWithCacheKeyContract');
  const runtimeServerDeliveryContractV2ProductionBlockers = n(runtimeServerDeliveryContractV2, 'productionBlockers');
  const runtimeServerDeliveryContractV2StartupImportsRuntime = b(runtimeServerDeliveryContractV2, 'startupImportsCoursePackRuntime');
  const runtimeServerDeliveryContractV2LoaderNetworkOrFsImports = b(runtimeServerDeliveryContractV2, 'loaderNetworkOrFsImports');
  const runtimeServerDeliveryContractV2ServerUploadAllowed = b(runtimeServerDeliveryContractV2, 'serverUploadAllowed');
  const runtimeServerDeliveryContractV2RuntimeDownloadsOpenFlags = n(runtimeServerDeliveryContractV2, 'runtimeDownloadsOpenFlags');
  const storageCloudTargetMapV2Blockers = n(storageCloudTargetMapV2, 'blockers');
  const storageCloudTargetMapV2Warnings = n(storageCloudTargetMapV2, 'warnings');
  const storageCloudTargetMapV2Present =
    b(storageCloudTargetMapV2, 'storageCloudTargetMapCreated') ||
    n(storageCloudTargetMapV2, 'targetKeyDomains') > 0;
  const storageCloudTargetMapV2TargetKeyDomains = n(storageCloudTargetMapV2, 'targetKeyDomains');
  const storageCloudTargetMapV2ScopedFactories = n(storageCloudTargetMapV2, 'scopedStorageKeyFactories');
  const storageCloudTargetMapV2FrenchSyncKeyRefs = n(storageCloudTargetMapV2, 'frenchTargetSyncKeyFactoryRefs');
  const storageCloudTargetMapV2TestedSurfaces = n(storageCloudTargetMapV2, 'testedSurfaceFiles');
  const storageCloudTargetMapV2ProductionBlockers = n(storageCloudTargetMapV2, 'productionBlockers');
  const storageCloudTargetMapV2StorageMigrationAllowed = b(storageCloudTargetMapV2, 'storageMigrationAllowed');
  const storageCloudTargetMapV2CloudSyncMigrationAllowed = b(storageCloudTargetMapV2, 'cloudSyncMigrationAllowed');
  const storageCloudTargetMapV2FirebaseWritesOpened = b(storageCloudTargetMapV2, 'firebaseWritesOpenedByThisPacket');
  const storageCloudTargetMapV2ReadyForApplyOpenFlags = n(storageCloudTargetMapV2, 'readyForApplyOpenFlags');
  const adminReviewerDeliverySurfaceV2Blockers = n(adminReviewerDeliverySurfaceV2, 'blockers');
  const adminReviewerDeliverySurfaceV2Warnings = n(adminReviewerDeliverySurfaceV2, 'warnings');
  const adminReviewerDeliverySurfaceV2Present =
    b(adminReviewerDeliverySurfaceV2, 'readyForReviewerDecisionImportV2DryRun') ||
    n(adminReviewerDeliverySurfaceV2, 'requiredApprovalFields') > 0;
  const adminReviewerDeliverySurfaceV2AdminSurfaceFiles = n(adminReviewerDeliverySurfaceV2, 'adminSurfaceFilesScanned');
  const adminReviewerDeliverySurfaceV2ReviewerArtifacts = n(adminReviewerDeliverySurfaceV2, 'reviewerArtifacts');
  const adminReviewerDeliverySurfaceV2RowDecisionRows = n(adminReviewerDeliverySurfaceV2, 'rowDecisionTemplateRows');
  const adminReviewerDeliverySurfaceV2AiDecisionRows = n(adminReviewerDeliverySurfaceV2, 'aiDecisionTemplateRows');
  const adminReviewerDeliverySurfaceV2RequiredApprovalFields = n(adminReviewerDeliverySurfaceV2, 'requiredApprovalFields');
  const adminReviewerDeliverySurfaceV2RequiredAdminGates = n(adminReviewerDeliverySurfaceV2, 'requiredAdminGates');
  const adminReviewerDeliverySurfaceV2ProductionBlockers = n(adminReviewerDeliverySurfaceV2, 'productionBlockers');
  const adminReviewerDeliverySurfaceV2ServerUploadAllowed = b(adminReviewerDeliverySurfaceV2, 'serverUploadAllowed');
  const adminReviewerDeliverySurfaceV2FirebaseUploadAllowed = b(adminReviewerDeliverySurfaceV2, 'firebaseUploadAllowed');
  const adminReviewerDeliverySurfaceV2ReviewerImportAllowed = b(adminReviewerDeliverySurfaceV2, 'reviewerDecisionImportAllowed');
  const adminReviewerDeliverySurfaceV2RuntimeDownloadsEnabled = b(adminReviewerDeliverySurfaceV2, 'runtimeDownloadsEnabled');
  const adminReviewerDeliverySurfaceV2ActivationApprovedFlags = n(adminReviewerDeliverySurfaceV2, 'activationApprovedFlags');
  const adminReviewerDeliverySurfaceV2ReadyForApplyOpenFlags = n(adminReviewerDeliverySurfaceV2, 'readyForApplyOpenFlags');
  const reviewerDecisionImportV2DryRunBlockers = n(reviewerDecisionImportV2DryRun, 'blockers');
  const reviewerDecisionImportV2DryRunWarnings = n(reviewerDecisionImportV2DryRun, 'warnings');
  const reviewerDecisionImportV2DryRunPresent =
    b(reviewerDecisionImportV2DryRun, 'readyForReviewerDecisionImportV2DryRun') ||
    n(reviewerDecisionImportV2DryRun, 'rowDecisionRows') > 0;
  const reviewerDecisionImportV2DryRunRowDecisionRows = n(reviewerDecisionImportV2DryRun, 'rowDecisionRows');
  const reviewerDecisionImportV2DryRunAiDecisionRows = n(reviewerDecisionImportV2DryRun, 'aiDecisionRows');
  const reviewerDecisionImportV2DryRunReviewedRowDecisions = n(reviewerDecisionImportV2DryRun, 'reviewedRowDecisionRows');
  const reviewerDecisionImportV2DryRunReviewedAiDecisions = n(reviewerDecisionImportV2DryRun, 'reviewedAiDecisionRows');
  const reviewerDecisionImportV2DryRunRowNoOpRows = n(reviewerDecisionImportV2DryRun, 'rowNoOpRows');
  const reviewerDecisionImportV2DryRunAiNoOpRows = n(reviewerDecisionImportV2DryRun, 'aiNoOpRows');
  const reviewerDecisionImportV2DryRunRowProbesPassed = n(reviewerDecisionImportV2DryRun, 'rowFixtureProbesPassed');
  const reviewerDecisionImportV2DryRunRowProbes = n(reviewerDecisionImportV2DryRun, 'rowFixtureProbes');
  const reviewerDecisionImportV2DryRunAiProbesPassed = n(reviewerDecisionImportV2DryRun, 'aiFixtureProbesPassed');
  const reviewerDecisionImportV2DryRunAiProbes = n(reviewerDecisionImportV2DryRun, 'aiFixtureProbes');
  const reviewerDecisionImportV2DryRunReviewerImportOpenFlags = n(reviewerDecisionImportV2DryRun, 'reviewerImportOpenFlags');
  const reviewerDecisionImportV2DryRunProductionApplyOpenFlags = n(reviewerDecisionImportV2DryRun, 'productionApplyOpenFlags');
  const reviewerDecisionImportV2DryRunActivationApprovedFlags = n(reviewerDecisionImportV2DryRun, 'activationApprovedFlags');
  const reviewerDecisionImportV2DryRunGeneratedLedgerWrites = b(reviewerDecisionImportV2DryRun, 'generatedLedgerWrites');
  const officialSourcePromotedRowDecisionsV2Path = runPath(runDir, 'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/row_decisions_reviewed_v2.jsonl');
  const officialSourcePromotedAiDecisionsV2Path = runPath(runDir, 'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/ai_decisions_reviewed_v2.jsonl');
  const reviewerDecisionImportExecutionGateV2Path = runPath(runDir, 'audits/reviewer_decision_import_execution_gate_v2_packet.json');
  const payloadCreationApprovalPreflightV2Path = runPath(runDir, 'audits/payload_creation_approval_preflight_v2_packet.json');
  const closedLocalPayloadMaterializationV2Path = runPath(runDir, 'audits/closed_local_payload_materialization_v2_packet.json');
  const serverDeliveryPublishPreflightV2Path = runPath(runDir, 'audits/server_delivery_publish_preflight_v2_packet.json');
  const productionServerManifestPublishGateV2Path = runPath(runDir, 'audits/production_server_manifest_publish_gate_v2_packet.json');
  const frenchUploadRemoteVerifyParityV2Path = runPath(runDir, 'audits/french_upload_remote_verify_parity_v2_packet.json');
  const frenchServerObjectRemoteVerifyV2Path = runPath(runDir, 'audits/french_server_object_remote_verify_v2_packet.json');
  const adminServerDeliveryRuntimePreflightV2Path = runPath(runDir, 'audits/admin_server_delivery_runtime_preflight_v2_packet.json');
  const runtimeActivationBlockerPlanV2Path = runPath(runDir, 'audits/runtime_activation_blocker_plan_v2_packet.json');
  const runtimeDeliveryEvidenceChainV2Path = runPath(runDir, 'audits/runtime_delivery_evidence_chain_v2_packet.json');
  const explicitApprovalReceiptHashLockGateV2Path = runPath(runDir, 'audits/explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const activationApprovalRequestPresentationV2Path = runPath(runDir, 'audits/activation_approval_request_presentation_v2_packet.json');
  const explicitApprovalReceiptCreationGateV2Path = runPath(runDir, 'audits/explicit_approval_receipt_creation_gate_v2_packet.json');
  const productionApplyAbsenceDenialGateV2Path = runPath(runDir, 'audits/production_apply_absence_denial_gate_v2_packet.json');
  const nonproductionBlockerClosurePlanV2Path = runPath(runDir, 'audits/nonproduction_blocker_closure_plan_v2_packet.json');
  const nonproductionEvidenceRefreshV2Path = runPath(runDir, 'audits/nonproduction_evidence_refresh_v2_packet.json');
  const runtimeServerManifestConsistencyRecheckV2Path = runPath(runDir, 'audits/runtime_server_manifest_consistency_recheck_v2_packet.json');
  const languageIsolationRegressionRecheckV2Path = runPath(runDir, 'audits/language_isolation_regression_recheck_v2_packet.json');
  const readinessApplyBlockerMapRefreshV2Path = runPath(runDir, 'audits/readiness_apply_blocker_map_refresh_v2_packet.json');
  const masterNextPassConsistencyRefreshV2Path = runPath(runDir, 'audits/master_next_pass_consistency_refresh_v2_packet.json');
  const officialSourceContentCoverageV2Path = runPath(runDir, 'audits/french_official_source_content_coverage_v2_packet.json');
  const productionActivationHoldExactApprovalRequiredV2Path = runPath(runDir, 'audits/production_activation_hold_exact_approval_required_v2_packet.json');
  const exactApprovalValidationGateV2Path = runPath(runDir, 'audits/exact_approval_validation_gate_v2_packet.json');
  const productionActivationSequencePreflightV2Path = runPath(runDir, 'audits/production_activation_sequence_preflight_v2_packet.json');
  const productionApplyTransactionContractV2Path = runPath(runDir, 'audits/production_apply_transaction_contract_v2_packet.json');
  const postApplyRollbackGuardContractV2Path = runPath(runDir, 'audits/post_apply_rollback_guard_contract_v2_packet.json');
  const approvalWaitSafeContinuationV2Path = runPath(runDir, 'audits/approval_wait_safe_continuation_v2_packet.json');
  const productionReadinessCompletionAuditV2Path = runPath(runDir, 'audits/production_readiness_completion_audit_v2_packet.json');
  const finalPreapprovalEvidenceHashLockV2Path = runPath(runDir, 'audits/final_preapproval_evidence_hash_lock_v2_packet.json');
  const exactApprovalApplyRehearsalV2Path = runPath(runDir, 'audits/exact_approval_apply_rehearsal_v2_packet.json');
  const exactApprovalSourceFirewallV2Path = runPath(runDir, 'audits/exact_approval_source_firewall_v2_packet.json');
  const exactApprovalSourceIntakeTransitionV2Path = runPath(runDir, 'audits/exact_approval_source_intake_transition_v2_packet.json');
  const exactApprovalActiveArtifactPairSimulationV2Path = runPath(runDir, 'audits/exact_approval_active_artifact_pair_simulation_v2_packet.json');
  const exactApprovalP31CreateCommandPreflightV2Path = runPath(runDir, 'audits/exact_approval_p31_create_command_preflight_v2_packet.json');
  const exactApprovalP44ValidationCommandPreflightV2Path = runPath(runDir, 'audits/exact_approval_p44_validation_command_preflight_v2_packet.json');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2Path = runPath(runDir, 'audits/exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.json');
  const exactApprovalP45SequenceCommandPreflightV2Path = runPath(runDir, 'audits/exact_approval_p45_sequence_command_preflight_v2_packet.json');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Path = runPath(runDir, 'audits/exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.json');
  const exactApprovalP46ApplyTransactionCommandPreflightV2Path = runPath(runDir, 'audits/exact_approval_p46_apply_transaction_command_preflight_v2_packet.json');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Path = runPath(runDir, 'audits/exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.json');
  const exactApprovalP47RollbackGuardCommandPreflightV2Path = runPath(runDir, 'audits/exact_approval_p47_rollback_guard_command_preflight_v2_packet.json');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Path = runPath(runDir, 'audits/exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.json');
  const exactApprovalP48SafeContinuationCommandPreflightV2Path = runPath(runDir, 'audits/exact_approval_p48_safe_continuation_command_preflight_v2_packet.json');
  const exactApprovalWaitStateV2Path = runPath(runDir, 'audits/exact_approval_wait_state_v2_packet.json');
  const orderedApprovalWaitRefreshV2Path = runPath(runDir, 'audits/ordered_approval_wait_refresh_v2_packet.json');
  const safePreapprovalContinuationV2Path = runPath(runDir, 'audits/safe_preapproval_continuation_v2_packet.json');
  const finalProductionReadinessGapV2Path = runPath(runDir, 'audits/final_production_readiness_gap_v2_packet.json');
  const exactApprovalSourceHandoffFirewallV2Path = runPath(runDir, 'audits/exact_approval_source_handoff_firewall_v2_packet.json');
  const exactApprovalSourceWaitTerminalStateV2Path = runPath(runDir, 'audits/exact_approval_source_wait_terminal_state_v2_packet.json');
  const postExactApprovalApplyRunbookV2Path = runPath(runDir, 'audits/post_exact_approval_apply_runbook_v2_packet.json');
  const officialSourceImportDryRunV2Present = reviewerDecisionImportV2DryRunPresent;
  const officialSourceImportDryRunV2Rows = reviewerDecisionImportV2DryRunRowDecisionRows;
  const officialSourceImportDryRunV2Ai = reviewerDecisionImportV2DryRunAiDecisionRows;
  const officialSourceImportDryRunV2AcceptedRows = n(reviewerDecisionImportV2DryRun, 'acceptedRowDecisionRows');
  const officialSourceImportDryRunV2AcceptedAi = n(reviewerDecisionImportV2DryRun, 'acceptedAiDecisionRows');
  const officialSourceImportDryRunV2PromotedRowFileUsed = b(reviewerDecisionImportV2DryRun, 'rowDecisionFilePromotedOfficialSourceUsed');
  const officialSourceImportDryRunV2PromotedAiFileUsed = b(reviewerDecisionImportV2DryRun, 'aiDecisionFilePromotedOfficialSourceUsed');
  const officialSourceImportDryRunV2ReadyForExecutionGateRefresh = b(reviewerDecisionImportV2DryRun, 'readyForOfficialSourceImportExecutionGateRefresh');
  const officialSourceImportDryRunV2ReadyForApply = b(reviewerDecisionImportV2DryRun, 'readyForApply');
  const officialSourceImportDryRunV2MayModifyProductionAppFiles = b(reviewerDecisionImportV2DryRun, 'mayModifyProductionAppFiles');
  const officialSourceImportDryRunV2RowProbesPassed = reviewerDecisionImportV2DryRunRowProbesPassed;
  const officialSourceImportDryRunV2RowProbes = reviewerDecisionImportV2DryRunRowProbes;
  const officialSourceImportDryRunV2AiProbesPassed = reviewerDecisionImportV2DryRunAiProbesPassed;
  const officialSourceImportDryRunV2AiProbes = reviewerDecisionImportV2DryRunAiProbes;
  const officialSourceImportDryRunV2Ready =
    officialSourceImportDryRunV2Present &&
    reviewerDecisionImportV2DryRunBlockers === 0 &&
    officialSourceImportDryRunV2Rows === 1600 &&
    officialSourceImportDryRunV2Ai >= 164 &&
    officialSourceImportDryRunV2AcceptedRows === 1600 &&
    officialSourceImportDryRunV2AcceptedAi === officialSourceImportDryRunV2Ai &&
    fs.existsSync(officialSourcePromotedRowDecisionsV2Path) &&
    fs.existsSync(officialSourcePromotedAiDecisionsV2Path) &&
    b(reviewerDecisionImportV2DryRun, 'officialSourceContentCoverageV2Ready') &&
    officialSourceImportDryRunV2PromotedRowFileUsed &&
    officialSourceImportDryRunV2PromotedAiFileUsed &&
    officialSourceImportDryRunV2ReadyForExecutionGateRefresh &&
    !officialSourceImportDryRunV2ReadyForApply &&
    !officialSourceImportDryRunV2MayModifyProductionAppFiles &&
    officialSourceImportDryRunV2RowProbes > 0 &&
    officialSourceImportDryRunV2RowProbesPassed === officialSourceImportDryRunV2RowProbes &&
    officialSourceImportDryRunV2AiProbes > 0 &&
    officialSourceImportDryRunV2AiProbesPassed === officialSourceImportDryRunV2AiProbes;
  const payloadShardMaterializationChecksumV2Blockers = n(payloadShardMaterializationChecksumV2, 'blockers');
  const payloadShardMaterializationChecksumV2Warnings = n(payloadShardMaterializationChecksumV2, 'warnings');
  const payloadShardMaterializationChecksumV2Present =
    b(payloadShardMaterializationChecksumV2, 'readyForServerManifestPreviewGate') ||
    n(payloadShardMaterializationChecksumV2, 'materializationContracts') > 0;
  const payloadShardMaterializationChecksumV2RuntimeSlices = n(payloadShardMaterializationChecksumV2, 'runtimeSlices');
  const payloadShardMaterializationChecksumV2ExpectedRuntimeSlices = n(payloadShardMaterializationChecksumV2, 'expectedRuntimeSlices');
  const payloadShardMaterializationChecksumV2MaterializationContracts = n(payloadShardMaterializationChecksumV2, 'materializationContracts');
  const payloadShardMaterializationChecksumV2ManifestIdentityContracts = n(payloadShardMaterializationChecksumV2, 'manifestIdentityContracts');
  const payloadShardMaterializationChecksumV2ChecksumContracts = n(payloadShardMaterializationChecksumV2, 'checksumContracts');
  const payloadShardMaterializationChecksumV2ChecksumContractsWithSha256Dimension = n(payloadShardMaterializationChecksumV2, 'checksumContractsWithSha256Dimension');
  const payloadShardMaterializationChecksumV2CacheKeyContractsWithSha256 = n(payloadShardMaterializationChecksumV2, 'cacheKeyContractsWithSha256');
  const payloadShardMaterializationChecksumV2ServerPathPreviewsWithSha256 = n(payloadShardMaterializationChecksumV2, 'serverPathPreviewsWithSha256');
  const payloadShardMaterializationChecksumV2SourceLocaleScopedFuturePaths = n(payloadShardMaterializationChecksumV2, 'sourceLocaleScopedFuturePaths');
  const payloadShardMaterializationChecksumV2UiLocaleIdentityDimensions = n(payloadShardMaterializationChecksumV2, 'uiLocaleIdentityDimensions');
  const payloadShardMaterializationChecksumV2FutureArtifactFilesPresent = n(payloadShardMaterializationChecksumV2, 'futureArtifactFilesPresent');
  const payloadShardMaterializationChecksumV2PreExistingLocalMaterializationAccounted = b(payloadShardMaterializationChecksumV2, 'preExistingLocalMaterializationAccounted');
  const payloadShardMaterializationChecksumV2UnaccountedFutureArtifactFilesPresent = n(payloadShardMaterializationChecksumV2, 'unaccountedFutureArtifactFilesPresent');
  const payloadShardMaterializationChecksumV2PayloadShardsCreated = n(payloadShardMaterializationChecksumV2, 'payloadShardsCreated');
  const payloadShardMaterializationChecksumV2ChecksumReportsCreated = n(payloadShardMaterializationChecksumV2, 'checksumReportsCreated');
  const payloadShardMaterializationChecksumV2ServerUploadAllowed = b(payloadShardMaterializationChecksumV2, 'serverUploadAllowed');
  const payloadShardMaterializationChecksumV2FirebaseUploadAllowed = b(payloadShardMaterializationChecksumV2, 'firebaseUploadAllowed');
  const payloadShardMaterializationChecksumV2RuntimeDownloadsEnabled = b(payloadShardMaterializationChecksumV2, 'runtimeDownloadsEnabled');
  const payloadShardMaterializationChecksumV2ActivationApprovedFlags = n(payloadShardMaterializationChecksumV2, 'activationApprovedFlags');
  const payloadShardMaterializationChecksumV2FixtureProbesPassed = n(payloadShardMaterializationChecksumV2, 'fixtureProbesPassed');
  const payloadShardMaterializationChecksumV2FixtureProbes = n(payloadShardMaterializationChecksumV2, 'fixtureProbes');
  const serverDeliveryManifestPreviewV2Blockers = n(serverDeliveryManifestPreviewV2, 'blockers');
  const serverDeliveryManifestPreviewV2Warnings = n(serverDeliveryManifestPreviewV2, 'warnings');
  const serverDeliveryManifestPreviewV2Present =
    b(serverDeliveryManifestPreviewV2, 'readyForRuntimeCacheIntegrityGate') ||
    n(serverDeliveryManifestPreviewV2, 'previewEntries') > 0;
  const serverDeliveryManifestPreviewV2PreviewEntries = n(serverDeliveryManifestPreviewV2, 'previewEntries');
  const serverDeliveryManifestPreviewV2ExpectedPreviewEntries = n(serverDeliveryManifestPreviewV2, 'expectedPreviewEntries');
  const serverDeliveryManifestPreviewV2EntriesWithGateReportRefs = n(serverDeliveryManifestPreviewV2, 'entriesWithGateReportRefs');
  const serverDeliveryManifestPreviewV2GateReportRefsPerEntryMin = n(serverDeliveryManifestPreviewV2, 'gateReportRefsPerEntryMin');
  const serverDeliveryManifestPreviewV2GateReportRefsTotal = n(serverDeliveryManifestPreviewV2, 'gateReportRefsTotal');
  const serverDeliveryManifestPreviewV2GateReportRefsCurrentSha = n(serverDeliveryManifestPreviewV2, 'gateReportRefsCurrentSha');
  const serverDeliveryManifestPreviewV2SourceManifestGateRefHashDrifts = n(serverDeliveryManifestPreviewV2, 'sourceManifestGateRefHashDrifts');
  const serverDeliveryManifestPreviewV2EntriesWithRollbackFromVersion = n(serverDeliveryManifestPreviewV2, 'entriesWithRollbackFromVersion');
  const serverDeliveryManifestPreviewV2EntriesWithActivationApprovedFalse = n(serverDeliveryManifestPreviewV2, 'entriesWithActivationApprovedFalse');
  const serverDeliveryManifestPreviewV2EntriesWithSha256Placeholder = n(serverDeliveryManifestPreviewV2, 'entriesWithSha256Placeholder');
  const serverDeliveryManifestPreviewV2EntriesWithByteSizePlaceholder = n(serverDeliveryManifestPreviewV2, 'entriesWithByteSizePlaceholder');
  const serverDeliveryManifestPreviewV2EntriesWithChecksumLinkage = n(serverDeliveryManifestPreviewV2, 'entriesWithChecksumLinkage');
  const serverDeliveryManifestPreviewV2SourceLocaleScopedServerPaths = n(serverDeliveryManifestPreviewV2, 'sourceLocaleScopedServerPaths');
  const serverDeliveryManifestPreviewV2UiLocaleIdentityDimensions = n(serverDeliveryManifestPreviewV2, 'uiLocaleIdentityDimensions');
  const serverDeliveryManifestPreviewV2ServerUploadAllowed = b(serverDeliveryManifestPreviewV2, 'serverUploadAllowed');
  const serverDeliveryManifestPreviewV2FirebaseUploadAllowed = b(serverDeliveryManifestPreviewV2, 'firebaseUploadAllowed');
  const serverDeliveryManifestPreviewV2RuntimeDownloadsEnabled = b(serverDeliveryManifestPreviewV2, 'runtimeDownloadsEnabled');
  const serverDeliveryManifestPreviewV2EmbeddedIndexInsertionAllowed = b(serverDeliveryManifestPreviewV2, 'embeddedIndexInsertionAllowed');
  const serverDeliveryManifestPreviewV2ActivationApprovedFlags = n(serverDeliveryManifestPreviewV2, 'activationApprovedFlags');
  const serverDeliveryManifestPreviewV2FixtureProbesPassed = n(serverDeliveryManifestPreviewV2, 'fixtureProbesPassed');
  const serverDeliveryManifestPreviewV2FixtureProbes = n(serverDeliveryManifestPreviewV2, 'fixtureProbes');
  const runtimeCacheIntegrityRollbackV2Blockers = n(runtimeCacheIntegrityRollbackV2, 'blockers');
  const runtimeCacheIntegrityRollbackV2Warnings = n(runtimeCacheIntegrityRollbackV2, 'warnings');
  const runtimeCacheIntegrityRollbackV2Present =
    b(runtimeCacheIntegrityRollbackV2, 'readyForReviewerDecisionImportOpeningGate') ||
    n(runtimeCacheIntegrityRollbackV2, 'cacheIntegrityContracts') > 0;
  const runtimeCacheIntegrityRollbackV2CacheStates = n(runtimeCacheIntegrityRollbackV2, 'cacheStates');
  const runtimeCacheIntegrityRollbackV2PreviewEntries = n(runtimeCacheIntegrityRollbackV2, 'previewEntries');
  const runtimeCacheIntegrityRollbackV2CacheIntegrityContracts = n(runtimeCacheIntegrityRollbackV2, 'cacheIntegrityContracts');
  const runtimeCacheIntegrityRollbackV2CacheKeyDimensionContracts = n(runtimeCacheIntegrityRollbackV2, 'cacheKeyDimensionContracts');
  const runtimeCacheIntegrityRollbackV2ReadyStateBlockedContracts = n(runtimeCacheIntegrityRollbackV2, 'readyStateBlockedContracts');
  const runtimeCacheIntegrityRollbackV2CacheWriteBlockedContracts = n(runtimeCacheIntegrityRollbackV2, 'cacheWriteBlockedContracts');
  const runtimeCacheIntegrityRollbackV2RuntimeDownloadBlockedContracts = n(runtimeCacheIntegrityRollbackV2, 'runtimeDownloadBlockedContracts');
  const runtimeCacheIntegrityRollbackV2ChecksumMismatchQuarantineContracts = n(runtimeCacheIntegrityRollbackV2, 'checksumMismatchQuarantineContracts');
  const runtimeCacheIntegrityRollbackV2ByteSizeMismatchQuarantineContracts = n(runtimeCacheIntegrityRollbackV2, 'byteSizeMismatchQuarantineContracts');
  const runtimeCacheIntegrityRollbackV2SourceLocaleMismatchRejectContracts = n(runtimeCacheIntegrityRollbackV2, 'sourceLocaleMismatchRejectContracts');
  const runtimeCacheIntegrityRollbackV2StudyTargetMismatchRejectContracts = n(runtimeCacheIntegrityRollbackV2, 'studyTargetMismatchRejectContracts');
  const runtimeCacheIntegrityRollbackV2StaleVersionContracts = n(runtimeCacheIntegrityRollbackV2, 'staleVersionContracts');
  const runtimeCacheIntegrityRollbackV2OfflineFallbackRequiresPriorVersionContracts = n(runtimeCacheIntegrityRollbackV2, 'offlineFallbackRequiresPriorVersionContracts');
  const runtimeCacheIntegrityRollbackV2RollbackSimulationContracts = n(runtimeCacheIntegrityRollbackV2, 'rollbackSimulationContracts');
  const runtimeCacheIntegrityRollbackV2UiLocaleIdentityDimensions = n(runtimeCacheIntegrityRollbackV2, 'uiLocaleIdentityDimensions');
  const runtimeCacheIntegrityRollbackV2RuntimeDownloadsEnabled = b(runtimeCacheIntegrityRollbackV2, 'runtimeDownloadsEnabled');
  const runtimeCacheIntegrityRollbackV2CacheWritesOpened = b(runtimeCacheIntegrityRollbackV2, 'cacheWritesOpened');
  const runtimeCacheIntegrityRollbackV2ReadyCacheStateOpened = b(runtimeCacheIntegrityRollbackV2, 'readyCacheStateOpened');
  const runtimeCacheIntegrityRollbackV2ServerUploadAllowed = b(runtimeCacheIntegrityRollbackV2, 'serverUploadAllowed');
  const runtimeCacheIntegrityRollbackV2ActivationApprovedFlags = n(runtimeCacheIntegrityRollbackV2, 'activationApprovedFlags');
  const runtimeCacheIntegrityRollbackV2FixtureProbesPassed = n(runtimeCacheIntegrityRollbackV2, 'fixtureProbesPassed');
  const runtimeCacheIntegrityRollbackV2FixtureProbes = n(runtimeCacheIntegrityRollbackV2, 'fixtureProbes');
  const reviewerDecisionImportOpeningPreflightV2Blockers = n(reviewerDecisionImportOpeningPreflightV2, 'blockers');
  const reviewerDecisionImportOpeningPreflightV2Warnings = n(reviewerDecisionImportOpeningPreflightV2, 'warnings');
  const reviewerDecisionImportOpeningPreflightV2Present =
    b(reviewerDecisionImportOpeningPreflightV2, 'readyForReviewerDecisionImportOpeningPreflight') ||
    n(reviewerDecisionImportOpeningPreflightV2, 'rowDecisionRows') > 0;
  const reviewerDecisionImportOpeningPreflightV2OpeningState = s(reviewerDecisionImportOpeningPreflightV2, 'openingState');
  const reviewerDecisionImportOpeningPreflightV2OpeningEligible = b(reviewerDecisionImportOpeningPreflightV2, 'openingEligible');
  const reviewerDecisionImportOpeningPreflightV2RowDecisionRows = n(reviewerDecisionImportOpeningPreflightV2, 'rowDecisionRows');
  const reviewerDecisionImportOpeningPreflightV2AiDecisionRows = n(reviewerDecisionImportOpeningPreflightV2, 'aiDecisionRows');
  const reviewerDecisionImportOpeningPreflightV2ReviewedRowDecisions = n(reviewerDecisionImportOpeningPreflightV2, 'reviewedRowDecisionRows');
  const reviewerDecisionImportOpeningPreflightV2ReviewedAiDecisions = n(reviewerDecisionImportOpeningPreflightV2, 'reviewedAiDecisionRows');
  const reviewerDecisionImportOpeningPreflightV2BlankRowDecisions = n(reviewerDecisionImportOpeningPreflightV2, 'blankRowDecisionRows');
  const reviewerDecisionImportOpeningPreflightV2BlankAiDecisions = n(reviewerDecisionImportOpeningPreflightV2, 'blankAiDecisionRows');
  const reviewerDecisionImportOpeningPreflightV2ReviewerImportAllowedNow = b(reviewerDecisionImportOpeningPreflightV2, 'reviewerDecisionImportAllowedNow');
  const reviewerDecisionImportOpeningPreflightV2ExecutionGateReady = b(reviewerDecisionImportOpeningPreflightV2, 'readyForReviewerDecisionImportExecutionGate');
  const reviewerDecisionImportOpeningPreflightV2PayloadCreationApprovalPreflightReady = b(reviewerDecisionImportOpeningPreflightV2, 'readyForPayloadCreationApprovalPreflight');
  const reviewerDecisionImportOpeningPreflightV2FixtureProbesPassed = n(reviewerDecisionImportOpeningPreflightV2, 'fixtureProbesPassed');
  const reviewerDecisionImportOpeningPreflightV2FixtureProbes = n(reviewerDecisionImportOpeningPreflightV2, 'fixtureProbes');
  const llmOfficialSourceReviewIntakeV2Blockers = n(llmOfficialSourceReviewIntakeV2, 'blockers');
  const llmOfficialSourceReviewIntakeV2Warnings = n(llmOfficialSourceReviewIntakeV2, 'warnings');
  const llmOfficialSourceReviewIntakeV2Present =
    s(llmOfficialSourceReviewIntakeV2, 'intakeState') !== '' ||
    n(llmOfficialSourceReviewIntakeV2, 'rowDecisionRows') > 0;
  const llmOfficialSourceReviewIntakeV2State = s(llmOfficialSourceReviewIntakeV2, 'intakeState');
  const llmOfficialSourceReviewIntakeV2RowDecisionRows = n(llmOfficialSourceReviewIntakeV2, 'rowDecisionRows');
  const llmOfficialSourceReviewIntakeV2AiDecisionRows = n(llmOfficialSourceReviewIntakeV2, 'aiDecisionRows');
  const llmOfficialSourceReviewIntakeV2ReviewedRowDecisions =
    n(llmOfficialSourceReviewIntakeV2, 'llmReviewedRowDecisionRows') || n(llmOfficialSourceReviewIntakeV2, 'reviewedRowDecisionRows');
  const llmOfficialSourceReviewIntakeV2ReviewedAiDecisions =
    n(llmOfficialSourceReviewIntakeV2, 'llmReviewedAiDecisionRows') || n(llmOfficialSourceReviewIntakeV2, 'reviewedAiDecisionRows');
  const llmOfficialSourceReviewIntakeV2AcceptedRowDecisions = n(llmOfficialSourceReviewIntakeV2, 'llmAcceptedRowDecisionRows');
  const llmOfficialSourceReviewIntakeV2AcceptedAiDecisions = n(llmOfficialSourceReviewIntakeV2, 'llmAcceptedAiDecisionRows');
  const llmOfficialSourceReviewIntakeV2BlankRowDecisions =
    n(llmOfficialSourceReviewIntakeV2, 'blankRowDecisionRows') ||
    Math.max(0, llmOfficialSourceReviewIntakeV2RowDecisionRows - llmOfficialSourceReviewIntakeV2ReviewedRowDecisions);
  const llmOfficialSourceReviewIntakeV2BlankAiDecisions =
    n(llmOfficialSourceReviewIntakeV2, 'blankAiDecisionRows') ||
    Math.max(0, llmOfficialSourceReviewIntakeV2AiDecisionRows - llmOfficialSourceReviewIntakeV2ReviewedAiDecisions);
  const llmOfficialSourceReviewIntakeV2RowCoveragePct =
    n(llmOfficialSourceReviewIntakeV2, 'rowLlmReviewCoveragePct') || n(llmOfficialSourceReviewIntakeV2, 'rowReviewCoveragePct');
  const llmOfficialSourceReviewIntakeV2AiCoveragePct =
    n(llmOfficialSourceReviewIntakeV2, 'aiLlmReviewCoveragePct') || n(llmOfficialSourceReviewIntakeV2, 'aiReviewCoveragePct');
  const llmOfficialSourceReviewIntakeV2LessonCoverageBuckets = n(llmOfficialSourceReviewIntakeV2, 'lessonCoverageBuckets');
  const llmOfficialSourceReviewIntakeV2BatchCoverageBuckets = n(llmOfficialSourceReviewIntakeV2, 'batchCoverageBuckets');
  const llmOfficialSourceReviewIntakeV2GateCoverageBuckets = n(llmOfficialSourceReviewIntakeV2, 'gateCoverageBuckets');
  const llmOfficialSourceReviewIntakeV2AiDomainCoverageBuckets = n(llmOfficialSourceReviewIntakeV2, 'aiDomainCoverageBuckets');
  const llmOfficialSourceReviewIntakeV2ReviewerImportAllowedNow = b(llmOfficialSourceReviewIntakeV2, 'reviewerDecisionImportAllowedNow');
  const llmOfficialSourceReviewIntakeV2ExecutionGateReady = b(llmOfficialSourceReviewIntakeV2, 'readyForDecisionImportExecutionGate');
  const llmOfficialSourceReviewIntakeV2PayloadCreationApprovalPreflightReady = b(llmOfficialSourceReviewIntakeV2, 'readyForPayloadCreationApprovalPreflight');
  const llmOfficialSourceReviewIntakeV2FixtureProbesPassed = n(llmOfficialSourceReviewIntakeV2, 'fixtureProbesPassed');
  const llmOfficialSourceReviewIntakeV2FixtureProbes = n(llmOfficialSourceReviewIntakeV2, 'fixtureProbes');
  const reviewerDecisionImportExecutionGateV2Blockers = n(reviewerDecisionImportExecutionGateV2, 'blockers');
  const reviewerDecisionImportExecutionGateV2Warnings = n(reviewerDecisionImportExecutionGateV2, 'warnings');
  const reviewerDecisionImportExecutionGateV2Present =
    s(reviewerDecisionImportExecutionGateV2, 'executionState') !== '' ||
    n(reviewerDecisionImportExecutionGateV2, 'rowDecisionRows') > 0;
  const reviewerDecisionImportExecutionGateV2State = s(reviewerDecisionImportExecutionGateV2, 'executionState');
  const reviewerDecisionImportExecutionGateV2WouldRun = b(reviewerDecisionImportExecutionGateV2, 'reviewerDecisionImportWouldRun');
  const reviewerDecisionImportExecutionGateV2ReviewedRowDecisions =
    n(reviewerDecisionImportExecutionGateV2, 'llmReviewedRowDecisionRows') || n(reviewerDecisionImportExecutionGateV2, 'reviewedRowDecisionRows');
  const reviewerDecisionImportExecutionGateV2ReviewedAiDecisions =
    n(reviewerDecisionImportExecutionGateV2, 'llmReviewedAiDecisionRows') || n(reviewerDecisionImportExecutionGateV2, 'reviewedAiDecisionRows');
  const reviewerDecisionImportExecutionGateV2AcceptedRowDecisions = n(reviewerDecisionImportExecutionGateV2, 'llmAcceptedRowDecisionRows');
  const reviewerDecisionImportExecutionGateV2AcceptedAiDecisions = n(reviewerDecisionImportExecutionGateV2, 'llmAcceptedAiDecisionRows');
  const reviewerDecisionImportExecutionGateV2UpstreamCountsConsistent = b(reviewerDecisionImportExecutionGateV2, 'upstreamCountsConsistent');
  const reviewerDecisionImportExecutionGateV2PayloadCreationApprovalPreflightReady = b(reviewerDecisionImportExecutionGateV2, 'readyForPayloadCreationApprovalPreflight');
  const reviewerDecisionImportExecutionGateV2FixtureProbesPassed = n(reviewerDecisionImportExecutionGateV2, 'fixtureProbesPassed');
  const reviewerDecisionImportExecutionGateV2FixtureProbes = n(reviewerDecisionImportExecutionGateV2, 'fixtureProbes');
  const officialSourceImportExecutionGateV2State = reviewerDecisionImportExecutionGateV2State;
  const officialSourceImportExecutionGateV2WouldRun = reviewerDecisionImportExecutionGateV2WouldRun;
  const officialSourceImportExecutionGateV2P13CoverageReady = b(reviewerDecisionImportExecutionGateV2, 'p13OfficialSourceCoverageReady');
  const officialSourceImportExecutionGateV2PromotedRowFileUsed = b(reviewerDecisionImportExecutionGateV2, 'p13PromotedOfficialSourceRowFileUsed');
  const officialSourceImportExecutionGateV2PromotedAiFileUsed = b(reviewerDecisionImportExecutionGateV2, 'p13PromotedOfficialSourceAiFileUsed');
  const officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight = reviewerDecisionImportExecutionGateV2PayloadCreationApprovalPreflightReady;
  const officialSourceImportExecutionGateV2ReadyForApply = b(reviewerDecisionImportExecutionGateV2, 'readyForApply');
  const officialSourceImportExecutionGateV2MayModifyProductionAppFiles = b(reviewerDecisionImportExecutionGateV2, 'mayModifyProductionAppFiles');
  const officialSourceImportExecutionGateV2FixtureProbesPassed = reviewerDecisionImportExecutionGateV2FixtureProbesPassed;
  const officialSourceImportExecutionGateV2FixtureProbes = reviewerDecisionImportExecutionGateV2FixtureProbes;
  const officialSourceImportExecutionGateV2Ready =
    reviewerDecisionImportExecutionGateV2Present &&
    reviewerDecisionImportExecutionGateV2Blockers === 0 &&
    officialSourceImportExecutionGateV2State === 'eligible_llm_official_source_review' &&
    officialSourceImportExecutionGateV2WouldRun &&
    officialSourceImportExecutionGateV2P13CoverageReady &&
    officialSourceImportExecutionGateV2PromotedRowFileUsed &&
    officialSourceImportExecutionGateV2PromotedAiFileUsed &&
    b(reviewerDecisionImportExecutionGateV2, 'p13ReadyForOfficialSourceImportExecutionGateRefresh') &&
    officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight &&
    !officialSourceImportExecutionGateV2ReadyForApply &&
    !officialSourceImportExecutionGateV2MayModifyProductionAppFiles &&
    officialSourceImportExecutionGateV2FixtureProbes > 0 &&
    officialSourceImportExecutionGateV2FixtureProbesPassed === officialSourceImportExecutionGateV2FixtureProbes;
  const llmOfficialSourceDecisionMaterializationV2Blockers = n(llmOfficialSourceDecisionMaterializationV2, 'blockers');
  const llmOfficialSourceDecisionMaterializationV2Warnings = n(llmOfficialSourceDecisionMaterializationV2, 'warnings');
  const llmOfficialSourceDecisionMaterializationV2Present =
    s(llmOfficialSourceDecisionMaterializationV2, 'materializationState') !== '' ||
    n(llmOfficialSourceDecisionMaterializationV2, 'rowDecisionRows') > 0;
  const llmOfficialSourceDecisionMaterializationV2State = s(llmOfficialSourceDecisionMaterializationV2, 'materializationState');
  const llmOfficialSourceDecisionMaterializationV2RowDecisionRows = n(llmOfficialSourceDecisionMaterializationV2, 'rowDecisionRows');
  const llmOfficialSourceDecisionMaterializationV2AiDecisionRows = n(llmOfficialSourceDecisionMaterializationV2, 'aiDecisionRows');
  const llmOfficialSourceDecisionMaterializationV2CurrentReviewedRowDecisions = n(llmOfficialSourceDecisionMaterializationV2, 'currentLlmReviewedRowDecisions');
  const llmOfficialSourceDecisionMaterializationV2CurrentReviewedAiDecisions = n(llmOfficialSourceDecisionMaterializationV2, 'currentLlmReviewedAiDecisions');
  const llmOfficialSourceDecisionMaterializationV2NonLlmReviewDependencyRequired = b(llmOfficialSourceDecisionMaterializationV2, 'nonLlmReviewDependencyRequired');
  const llmOfficialSourceDecisionMaterializationV2ReadyForDryRun = b(llmOfficialSourceDecisionMaterializationV2, 'readyForLlmOfficialSourceDecisionDryRun');
  const llmOfficialSourceDecisionMaterializationV2FixtureProbesPassed = n(llmOfficialSourceDecisionMaterializationV2, 'fixtureProbesPassed');
  const llmOfficialSourceDecisionMaterializationV2FixtureProbes = n(llmOfficialSourceDecisionMaterializationV2, 'fixtureProbes');
  const llmOfficialSourceDecisionDryRunV2Blockers = n(llmOfficialSourceDecisionDryRunV2, 'blockers');
  const llmOfficialSourceDecisionDryRunV2Warnings = n(llmOfficialSourceDecisionDryRunV2, 'warnings');
  const llmOfficialSourceDecisionDryRunV2Present =
    s(llmOfficialSourceDecisionDryRunV2, 'dryRunState') !== '' ||
    n(llmOfficialSourceDecisionDryRunV2, 'rowCandidateProposals') > 0;
  const llmOfficialSourceDecisionDryRunV2State = s(llmOfficialSourceDecisionDryRunV2, 'dryRunState');
  const llmOfficialSourceDecisionDryRunV2RowCandidateProposals = n(llmOfficialSourceDecisionDryRunV2, 'rowCandidateProposals');
  const llmOfficialSourceDecisionDryRunV2AiCandidateProposals = n(llmOfficialSourceDecisionDryRunV2, 'aiCandidateProposals');
  const llmOfficialSourceDecisionDryRunV2PendingRowCandidates = n(llmOfficialSourceDecisionDryRunV2, 'rowCandidatesPending');
  const llmOfficialSourceDecisionDryRunV2PendingAiCandidates = n(llmOfficialSourceDecisionDryRunV2, 'aiCandidatesPending');
  const llmOfficialSourceDecisionDryRunV2AcceptedRowCandidates = n(llmOfficialSourceDecisionDryRunV2, 'acceptedRowCandidates');
  const llmOfficialSourceDecisionDryRunV2AcceptedAiCandidates = n(llmOfficialSourceDecisionDryRunV2, 'acceptedAiCandidates');
  const llmOfficialSourceDecisionDryRunV2ProposalFilesWritten = n(llmOfficialSourceDecisionDryRunV2, 'proposalFilesWritten');
  const llmOfficialSourceDecisionDryRunV2CandidateWritesConfined = b(llmOfficialSourceDecisionDryRunV2, 'candidateWritesConfinedToDryRunDir');
  const llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight = b(llmOfficialSourceDecisionDryRunV2, 'readyForLlmOfficialSourceDecisionPromotionPreflight');
  const llmOfficialSourceDecisionDryRunV2FixtureProbesPassed = n(llmOfficialSourceDecisionDryRunV2, 'fixtureProbesPassed');
  const llmOfficialSourceDecisionDryRunV2FixtureProbes = n(llmOfficialSourceDecisionDryRunV2, 'fixtureProbes');
  const llmOfficialSourceDecisionPromotionPreflightV2Blockers = n(llmOfficialSourceDecisionPromotionPreflightV2, 'blockers');
  const llmOfficialSourceDecisionPromotionPreflightV2Warnings = n(llmOfficialSourceDecisionPromotionPreflightV2, 'warnings');
  const llmOfficialSourceDecisionPromotionPreflightV2Present =
    s(llmOfficialSourceDecisionPromotionPreflightV2, 'promotionState') !== '' ||
    n(llmOfficialSourceDecisionPromotionPreflightV2, 'rowCandidateProposals') > 0;
  const llmOfficialSourceDecisionPromotionPreflightV2State = s(llmOfficialSourceDecisionPromotionPreflightV2, 'promotionState');
  const llmOfficialSourceDecisionPromotionPreflightV2RowCandidateProposals = n(llmOfficialSourceDecisionPromotionPreflightV2, 'rowCandidateProposals');
  const llmOfficialSourceDecisionPromotionPreflightV2AiCandidateProposals = n(llmOfficialSourceDecisionPromotionPreflightV2, 'aiCandidateProposals');
  const llmOfficialSourceDecisionPromotionPreflightV2AcceptedRowCandidates = n(llmOfficialSourceDecisionPromotionPreflightV2, 'acceptedRowCandidates');
  const llmOfficialSourceDecisionPromotionPreflightV2AcceptedAiCandidates = n(llmOfficialSourceDecisionPromotionPreflightV2, 'acceptedAiCandidates');
  const llmOfficialSourceDecisionPromotionPreflightV2PromotedDecisionFilesWritten = n(llmOfficialSourceDecisionPromotionPreflightV2, 'promotedDecisionFilesWritten');
  const llmOfficialSourceDecisionPromotionPreflightV2FutureTargetsConfined = b(llmOfficialSourceDecisionPromotionPreflightV2, 'futurePromotionTargetsConfinedToReviewerDir');
  const llmOfficialSourceDecisionPromotionPreflightV2FutureRowTargetSeparate = b(llmOfficialSourceDecisionPromotionPreflightV2, 'futureRowPromotionTargetSeparateFromTemplate');
  const llmOfficialSourceDecisionPromotionPreflightV2FutureAiTargetSeparate = b(llmOfficialSourceDecisionPromotionPreflightV2, 'futureAiPromotionTargetSeparateFromTemplate');
  const llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration = b(llmOfficialSourceDecisionPromotionPreflightV2, 'readyForPromotedDecisionFileGeneration');
  const llmOfficialSourceDecisionPromotionPreflightV2FixtureProbesPassed = n(llmOfficialSourceDecisionPromotionPreflightV2, 'fixtureProbesPassed');
  const llmOfficialSourceDecisionPromotionPreflightV2FixtureProbes = n(llmOfficialSourceDecisionPromotionPreflightV2, 'fixtureProbes');
  const llmOfficialSourcePromotedDecisionFileGenerationV2Blockers = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'blockers');
  const llmOfficialSourcePromotedDecisionFileGenerationV2Warnings = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'warnings');
  const llmOfficialSourcePromotedDecisionFileGenerationV2Present =
    s(llmOfficialSourcePromotedDecisionFileGenerationV2, 'generationState') !== '' ||
    n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'rowDecisionRowsBuilt') > 0;
  const llmOfficialSourcePromotedDecisionFileGenerationV2State = s(llmOfficialSourcePromotedDecisionFileGenerationV2, 'generationState');
  const llmOfficialSourcePromotedDecisionFileGenerationV2RowDecisionRowsBuilt = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'rowDecisionRowsBuilt');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AiDecisionRowsBuilt = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'aiDecisionRowsBuilt');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRowDecisions = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'acceptedRowDecisionRows');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'acceptedAiDecisionRows');
  const llmOfficialSourcePromotedDecisionFileGenerationV2RowsWithEvidenceNotes = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'rowsWithReviewerEvidenceNotes');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AiWithEvidenceNotes = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'aiWithReviewerEvidenceNotes');
  const llmOfficialSourcePromotedDecisionFileGenerationV2OpenFlags =
    n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'openImportApplyActivationFlags') +
    n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'rejectedFreshAiReturnOrCacheOpenRows') +
    n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'targetOutputBeforeQualityOpenRows');
  const llmOfficialSourcePromotedDecisionFileGenerationV2OutputTargetsConfined = b(llmOfficialSourcePromotedDecisionFileGenerationV2, 'outputTargetsConfinedToPromotedDir');
  const llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh = b(llmOfficialSourcePromotedDecisionFileGenerationV2, 'readyForReviewerDecisionImportV2DryRunRefresh');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractReady = b(llmOfficialSourcePromotedDecisionFileGenerationV2, 'aiPromptContractV2Ready');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractEntrypoints = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'aiPromptContractEntrypoints');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractUniqueIds = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'aiPromptContractUniqueIds');
  const llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractCriticalContracts = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'aiPromptContractCriticalContracts');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiUniqueContractIds = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiUniqueContractIds');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDuplicateContractIds = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiDuplicateContractIds');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMatchedToPromptContracts = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiDecisionsMatchedToPromptContracts');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiExtraContracts = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiDecisionExtraContracts');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMissingContracts = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiDecisionMissingContracts');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContracts = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiCriticalContracts');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContractsMatched = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiCriticalContractsMatched');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDomainMatchedToPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiDomainMatchedToPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFilePathMatchedToPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiFilePathMatchedToPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFeatureRiskClassMatchedToPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiFeatureRiskClassMatchedToPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRiskLevelMatchedToPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiRiskLevelMatchedToPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetLocaleMatchedToPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiTargetLocaleMatchedToPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiSourceLocalesMatchedToPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiSourceLocalesMatchedToPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCacheDimensionsMatchedToPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiCacheDimensionsMatchedToPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageGatePassed = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiWrongLanguageGatePassed');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshReturnClosedByPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiRejectedFreshReturnClosedByPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshCacheClosedByPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiRejectedFreshCacheClosedByPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetOutputBeforeQualityClosedByPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiTargetOutputBeforeQualityClosedByPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageFallbackClosedByPromptContract = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'promotedAiWrongLanguageFallbackClosedByPromptContract');
  const llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'fixtureProbesPassed');
  const llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'fixtureProbes');
  const llmOfficialSourcePromotedDecisionFileGenerationV2ExpectedAiDecisions = Math.max(
    164,
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions,
    llmOfficialSourcePromotedDecisionFileGenerationV2AiWithEvidenceNotes,
  );
  const llmOfficialSourcePromotedDecisionFileGenerationV2Ready =
    llmOfficialSourcePromotedDecisionFileGenerationV2Present &&
    llmOfficialSourcePromotedDecisionFileGenerationV2Blockers === 0 &&
    llmOfficialSourcePromotedDecisionFileGenerationV2State === 'promoted_decision_files_ready_no_import' &&
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRowDecisions === EXPECTED_ROW_COUNT &&
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions === llmOfficialSourcePromotedDecisionFileGenerationV2ExpectedAiDecisions &&
    llmOfficialSourcePromotedDecisionFileGenerationV2RowsWithEvidenceNotes === EXPECTED_ROW_COUNT &&
    llmOfficialSourcePromotedDecisionFileGenerationV2AiWithEvidenceNotes === llmOfficialSourcePromotedDecisionFileGenerationV2ExpectedAiDecisions &&
    llmOfficialSourcePromotedDecisionFileGenerationV2OpenFlags === 0 &&
    llmOfficialSourcePromotedDecisionFileGenerationV2OutputTargetsConfined &&
    llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh &&
    llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractReady &&
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMatchedToPromptContracts === llmOfficialSourcePromotedDecisionFileGenerationV2ExpectedAiDecisions &&
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiExtraContracts === 0 &&
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMissingContracts === 0 &&
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContractsMatched === llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContracts &&
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshReturnClosedByPromptContract === llmOfficialSourcePromotedDecisionFileGenerationV2ExpectedAiDecisions &&
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshCacheClosedByPromptContract === llmOfficialSourcePromotedDecisionFileGenerationV2ExpectedAiDecisions &&
    llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageFallbackClosedByPromptContract === llmOfficialSourcePromotedDecisionFileGenerationV2ExpectedAiDecisions &&
    llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes > 0 &&
    llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed === llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes;
  const legacyGeneratedResearchEvidenceBridgeV2Blockers = n(legacyGeneratedResearchEvidenceBridgeV2, 'blockers');
  const legacyGeneratedResearchEvidenceBridgeV2Warnings = n(legacyGeneratedResearchEvidenceBridgeV2, 'warnings');
  const legacyGeneratedResearchEvidenceBridgeV2Present =
    s(legacyGeneratedResearchEvidenceBridgeV2, 'bridgeState') !== '' ||
    n(legacyGeneratedResearchEvidenceBridgeV2, 'legacyQueueRows') > 0;
  const legacyGeneratedResearchEvidenceBridgeV2State = s(legacyGeneratedResearchEvidenceBridgeV2, 'bridgeState');
  const legacyGeneratedResearchEvidenceBridgeV2LegacyRows = n(legacyGeneratedResearchEvidenceBridgeV2, 'legacyQueueRows');
  const legacyGeneratedResearchEvidenceBridgeV2PromotedRows = n(legacyGeneratedResearchEvidenceBridgeV2, 'rowDecisionRows');
  const legacyGeneratedResearchEvidenceBridgeV2RowIdentityMatched = n(legacyGeneratedResearchEvidenceBridgeV2, 'rowIdentityMatched');
  const legacyGeneratedResearchEvidenceBridgeV2RowsWithResearchEvidenceIds = n(legacyGeneratedResearchEvidenceBridgeV2, 'rowsWithResearchEvidenceIds');
  const legacyGeneratedResearchEvidenceBridgeV2RowsWithAllRequiredGatesPassed = n(legacyGeneratedResearchEvidenceBridgeV2, 'rowsWithAllRequiredGatesPassed');
  const legacyGeneratedResearchEvidenceBridgeV2AiDecisions = n(legacyGeneratedResearchEvidenceBridgeV2, 'aiDecisionRows');
  const legacyGeneratedResearchEvidenceBridgeV2HighRiskAiDecisions = n(legacyGeneratedResearchEvidenceBridgeV2, 'highRiskAiDecisionRows');
  const legacyGeneratedResearchEvidenceBridgeV2HighRiskAiWithResearchGate = n(legacyGeneratedResearchEvidenceBridgeV2, 'highRiskAiWithResearchGate');
  const legacyGeneratedResearchEvidenceBridgeV2AiLanguageGatesPassed = n(legacyGeneratedResearchEvidenceBridgeV2, 'aiLanguageGatesPassed');
  const legacyGeneratedResearchEvidenceBridgeV2AiWithOfficialSourceNotes = n(legacyGeneratedResearchEvidenceBridgeV2, 'aiWithOfficialSourceNotes');
  const legacyGeneratedResearchEvidenceBridgeV2DryRunReady = b(legacyGeneratedResearchEvidenceBridgeV2, 'dryRunReady');
  const legacyGeneratedResearchEvidenceBridgeV2FixtureProbesPassed = n(legacyGeneratedResearchEvidenceBridgeV2, 'fixtureProbesPassed');
  const legacyGeneratedResearchEvidenceBridgeV2FixtureProbes = n(legacyGeneratedResearchEvidenceBridgeV2, 'fixtureProbes');
  const legacyGeneratedResearchEvidenceBridgeV2ReadyForApply = b(legacyGeneratedResearchEvidenceBridgeV2, 'readyForApply');
  const legacyGeneratedResearchEvidenceBridgeV2MayModifyProductionAppFiles = b(legacyGeneratedResearchEvidenceBridgeV2, 'mayModifyProductionAppFiles');
  const legacyGeneratedResearchEvidenceBridgeV2ExpectedAiDecisions = Math.max(
    164,
    legacyGeneratedResearchEvidenceBridgeV2AiDecisions,
    legacyGeneratedResearchEvidenceBridgeV2AiLanguageGatesPassed,
    legacyGeneratedResearchEvidenceBridgeV2AiWithOfficialSourceNotes,
  );
  const legacyGeneratedResearchEvidenceBridgeV2Ready =
    legacyGeneratedResearchEvidenceBridgeV2Present &&
    legacyGeneratedResearchEvidenceBridgeV2Blockers === 0 &&
    legacyGeneratedResearchEvidenceBridgeV2State === 'legacy_generated_research_evidence_bridge_ready_no_writes' &&
    legacyGeneratedResearchEvidenceBridgeV2LegacyRows === 1600 &&
    legacyGeneratedResearchEvidenceBridgeV2PromotedRows === 1600 &&
    legacyGeneratedResearchEvidenceBridgeV2RowIdentityMatched === 1600 &&
    legacyGeneratedResearchEvidenceBridgeV2RowsWithResearchEvidenceIds === 1600 &&
    legacyGeneratedResearchEvidenceBridgeV2RowsWithAllRequiredGatesPassed === 1600 &&
    legacyGeneratedResearchEvidenceBridgeV2AiDecisions === legacyGeneratedResearchEvidenceBridgeV2ExpectedAiDecisions &&
    legacyGeneratedResearchEvidenceBridgeV2HighRiskAiDecisions > 0 &&
    legacyGeneratedResearchEvidenceBridgeV2HighRiskAiWithResearchGate === legacyGeneratedResearchEvidenceBridgeV2HighRiskAiDecisions &&
    legacyGeneratedResearchEvidenceBridgeV2AiLanguageGatesPassed === legacyGeneratedResearchEvidenceBridgeV2ExpectedAiDecisions &&
    legacyGeneratedResearchEvidenceBridgeV2AiWithOfficialSourceNotes === legacyGeneratedResearchEvidenceBridgeV2ExpectedAiDecisions &&
    legacyGeneratedResearchEvidenceBridgeV2DryRunReady &&
    legacyGeneratedResearchEvidenceBridgeV2FixtureProbes > 0 &&
    legacyGeneratedResearchEvidenceBridgeV2FixtureProbesPassed === legacyGeneratedResearchEvidenceBridgeV2FixtureProbes &&
    !legacyGeneratedResearchEvidenceBridgeV2ReadyForApply &&
    !legacyGeneratedResearchEvidenceBridgeV2MayModifyProductionAppFiles;
  const payloadCreationApprovalPreflightV2Blockers = n(payloadCreationApprovalPreflightV2, 'blockers');
  const payloadCreationApprovalPreflightV2Warnings = n(payloadCreationApprovalPreflightV2, 'warnings');
  const payloadCreationApprovalPreflightV2Present =
    s(payloadCreationApprovalPreflightV2, 'preflightState') !== '' ||
    n(payloadCreationApprovalPreflightV2, 'hashChecks') > 0;
  const payloadCreationApprovalPreflightV2State = s(payloadCreationApprovalPreflightV2, 'preflightState');
  const payloadCreationApprovalPreflightV2ReadyForClosedPayloadMaterialization = b(payloadCreationApprovalPreflightV2, 'readyForClosedPayloadMaterializationV2');
  const payloadCreationApprovalPreflightV2HashChecksPassed = n(payloadCreationApprovalPreflightV2, 'hashChecksPassed');
  const payloadCreationApprovalPreflightV2HashChecks = n(payloadCreationApprovalPreflightV2, 'hashChecks');
  const payloadCreationApprovalPreflightV2FixtureProbesPassed = n(payloadCreationApprovalPreflightV2, 'fixtureProbesPassed');
  const payloadCreationApprovalPreflightV2FixtureProbes = n(payloadCreationApprovalPreflightV2, 'fixtureProbes');
  const payloadCreationApprovalPreflightV2ReadyForApply = b(payloadCreationApprovalPreflightV2, 'readyForApply');
  const closedLocalPayloadMaterializationV2Blockers = n(closedLocalPayloadMaterializationV2, 'blockers');
  const closedLocalPayloadMaterializationV2Warnings = n(closedLocalPayloadMaterializationV2, 'warnings');
  const closedLocalPayloadMaterializationV2Present =
    s(closedLocalPayloadMaterializationV2, 'materializationState') !== '' ||
    n(closedLocalPayloadMaterializationV2, 'localSlicePayloadsCreated') > 0;
  const closedLocalPayloadMaterializationV2State = s(closedLocalPayloadMaterializationV2, 'materializationState');
  const closedLocalPayloadMaterializationV2RuntimeSlices = n(closedLocalPayloadMaterializationV2, 'localSlicePayloadsCreated');
  const closedLocalPayloadMaterializationV2PayloadEntries = n(closedLocalPayloadMaterializationV2, 'payloadEntriesTotal');
  const closedLocalPayloadMaterializationV2PayloadBytes = n(closedLocalPayloadMaterializationV2, 'payloadBytesTotal');
  const closedLocalPayloadMaterializationV2ChecksumMismatches = n(closedLocalPayloadMaterializationV2, 'checksumMismatches');
  const closedLocalPayloadMaterializationV2ReadyForServerDeliveryPublishPreflight = b(closedLocalPayloadMaterializationV2, 'readyForServerDeliveryPublishPreflightV2');
  const closedLocalPayloadMaterializationV2FixtureProbesPassed = n(closedLocalPayloadMaterializationV2, 'fixtureProbesPassed');
  const closedLocalPayloadMaterializationV2FixtureProbes = n(closedLocalPayloadMaterializationV2, 'fixtureProbes');
  const closedLocalPayloadMaterializationV2ReadyForApply = b(closedLocalPayloadMaterializationV2, 'readyForApply');
  const officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate =
    fileMtimeMs(payloadCreationApprovalPreflightV2Path) >= fileMtimeMs(reviewerDecisionImportExecutionGateV2Path) &&
    fileMtimeMs(reviewerDecisionImportExecutionGateV2Path) > 0;
  const officialSourcePayloadCreationApprovalPreflightV2Ready =
    payloadCreationApprovalPreflightV2Present &&
    payloadCreationApprovalPreflightV2Blockers === 0 &&
    payloadCreationApprovalPreflightV2State === 'eligible_after_import_execution' &&
    payloadCreationApprovalPreflightV2ReadyForClosedPayloadMaterialization &&
    officialSourceImportExecutionGateV2Ready &&
    officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate &&
    !payloadCreationApprovalPreflightV2ReadyForApply &&
    !b(payloadCreationApprovalPreflightV2, 'mayModifyProductionAppFiles') &&
    payloadCreationApprovalPreflightV2FixtureProbes > 0 &&
    payloadCreationApprovalPreflightV2FixtureProbesPassed === payloadCreationApprovalPreflightV2FixtureProbes;
  const officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight =
    fileMtimeMs(closedLocalPayloadMaterializationV2Path) >= fileMtimeMs(payloadCreationApprovalPreflightV2Path) &&
    fileMtimeMs(payloadCreationApprovalPreflightV2Path) > 0;
  const officialSourceClosedLocalPayloadMaterializationV2Ready =
    closedLocalPayloadMaterializationV2Present &&
    closedLocalPayloadMaterializationV2Blockers === 0 &&
    closedLocalPayloadMaterializationV2State === 'local_payload_artifacts_materialized' &&
    closedLocalPayloadMaterializationV2ReadyForServerDeliveryPublishPreflight &&
    officialSourcePayloadCreationApprovalPreflightV2Ready &&
    officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight &&
    !closedLocalPayloadMaterializationV2ReadyForApply &&
    !b(closedLocalPayloadMaterializationV2, 'mayModifyProductionAppFiles') &&
    closedLocalPayloadMaterializationV2FixtureProbes > 0 &&
    closedLocalPayloadMaterializationV2FixtureProbesPassed === closedLocalPayloadMaterializationV2FixtureProbes;
  const serverDeliveryPublishPreflightV2Blockers = n(serverDeliveryPublishPreflightV2, 'blockers');
  const serverDeliveryPublishPreflightV2Warnings = n(serverDeliveryPublishPreflightV2, 'warnings');
  const serverDeliveryPublishPreflightV2Present =
    s(serverDeliveryPublishPreflightV2, 'publishPreflightState') !== '' ||
    n(serverDeliveryPublishPreflightV2, 'manifestEntries') > 0;
  const serverDeliveryPublishPreflightV2State = s(serverDeliveryPublishPreflightV2, 'publishPreflightState');
  const serverDeliveryPublishPreflightV2ManifestEntries = n(serverDeliveryPublishPreflightV2, 'manifestEntries');
  const serverDeliveryPublishPreflightV2ActualShaEntries = n(serverDeliveryPublishPreflightV2, 'manifestEntriesWithActualSha256');
  const serverDeliveryPublishPreflightV2ActualByteSizeEntries = n(serverDeliveryPublishPreflightV2, 'manifestEntriesWithActualByteSize');
  const serverDeliveryPublishPreflightV2ChecksumMismatches = n(serverDeliveryPublishPreflightV2, 'checksumMismatches');
  const serverDeliveryPublishPreflightV2FreshAfterClosedPayload =
    fileMtimeMs(serverDeliveryPublishPreflightV2Path) >= fileMtimeMs(closedLocalPayloadMaterializationV2Path) &&
    fileMtimeMs(closedLocalPayloadMaterializationV2Path) > 0;
  const serverDeliveryPublishPreflightV2ReadyForAdminServerDeliveryReview =
    b(serverDeliveryPublishPreflightV2, 'readyForAdminServerDeliveryReviewV2') &&
    serverDeliveryPublishPreflightV2FreshAfterClosedPayload;
  const serverDeliveryPublishPreflightV2FixtureProbesPassed = n(serverDeliveryPublishPreflightV2, 'fixtureProbesPassed');
  const serverDeliveryPublishPreflightV2FixtureProbes = n(serverDeliveryPublishPreflightV2, 'fixtureProbes');
  const serverDeliveryPublishPreflightV2ReadyForApply = b(serverDeliveryPublishPreflightV2, 'readyForApply');
  const productionServerManifestPublishGateV2Blockers = n(productionServerManifestPublishGateV2, 'blockers');
  const productionServerManifestPublishGateV2Warnings = n(productionServerManifestPublishGateV2, 'warnings');
  const expectedServerDeliveryEntries = 12;
  const productionServerManifestPublishGateV2Present =
    s(productionServerManifestPublishGateV2, 'publishGateState') !== '' ||
    b(productionServerManifestPublishGateV2, 'readyForRuntimeDownloadActivation');
  const productionServerManifestPublishGateV2State = s(productionServerManifestPublishGateV2, 'publishGateState');
  const productionServerManifestPublishGateV2ReadyForRuntimeDownloadActivation = b(productionServerManifestPublishGateV2, 'readyForRuntimeDownloadActivation');
  const productionServerManifestPublishGateV2FixtureProbesPassed = n(productionServerManifestPublishGateV2, 'fixtureProbesPassed');
  const productionServerManifestPublishGateV2FixtureProbes = n(productionServerManifestPublishGateV2, 'fixtureProbes');
  const productionServerManifestPublishGateV2EvidenceMatchesCurrentDraft =
    n(productionServerManifestPublishGateV2, 'productionEntriesMatchingDraftIdentity') === expectedServerDeliveryEntries &&
    n(productionServerManifestPublishGateV2, 'productionEntriesMatchingDraftPayload') === expectedServerDeliveryEntries &&
    n(productionServerManifestPublishGateV2, 'productionEntriesMatchingDraftServerPath') === expectedServerDeliveryEntries &&
    n(productionServerManifestPublishGateV2, 'productionEntriesMatchingDraftCacheKey') === expectedServerDeliveryEntries &&
    n(productionServerManifestPublishGateV2, 'productionEntriesClosedActivation') === expectedServerDeliveryEntries &&
    n(productionServerManifestPublishGateV2, 'productionEntriesClosedRuntimeDownloads') === expectedServerDeliveryEntries &&
    n(productionServerManifestPublishGateV2, 'productionEntriesClosedReadyForApply') === expectedServerDeliveryEntries;
  const productionServerManifestPublishGateV2FreshAfterServerPreflight =
    (fileMtimeMs(productionServerManifestPublishGateV2Path) >= fileMtimeMs(serverDeliveryPublishPreflightV2Path) &&
      fileMtimeMs(serverDeliveryPublishPreflightV2Path) > 0) ||
    (serverDeliveryPublishPreflightV2State === 'safe_production_manifest_promoted' &&
      productionServerManifestPublishGateV2EvidenceMatchesCurrentDraft);
  const serverDeliveryPublishPreflightV2SupersededByProductionGate =
    productionServerManifestPublishGateV2Present &&
    productionServerManifestPublishGateV2Blockers === 0 &&
    productionServerManifestPublishGateV2State === 'production_server_manifest_ready_for_activation_gate' &&
    productionServerManifestPublishGateV2ReadyForRuntimeDownloadActivation &&
    productionServerManifestPublishGateV2FreshAfterServerPreflight &&
    productionServerManifestPublishGateV2FixtureProbes > 0 &&
    productionServerManifestPublishGateV2FixtureProbesPassed === productionServerManifestPublishGateV2FixtureProbes;
  const frenchServerRemoteCredentialHandoffV2Status =
    sourceReports.find((entry) => entry.name === 'french_server_remote_credential_handoff_v2_packet.json')?.status ?? '';
  const frenchServerRemoteCredentialHandoffV2State = s(frenchServerRemoteCredentialHandoffV2, 'handoffState');
  const frenchServerRemoteCredentialHandoffV2CredentialSource = s(frenchServerRemoteCredentialHandoffV2, 'credentialSource');
  const frenchServerRemoteCredentialHandoffV2CredentialPreflightReady = b(frenchServerRemoteCredentialHandoffV2, 'credentialPreflightReady');
  const frenchServerRemoteCredentialHandoffV2RemoteVerifyBlockedByCredentials = b(frenchServerRemoteCredentialHandoffV2, 'remoteVerifyBlockedByCredentials');
  const frenchServerRemoteCredentialHandoffV2AcceptedCredentialOptions =
    Array.isArray(frenchServerRemoteCredentialHandoffV2.acceptedCredentialOptions)
      ? frenchServerRemoteCredentialHandoffV2.acceptedCredentialOptions.length
      : 0;
  const frenchServerRemoteCredentialHandoffV2CredentialsPrinted = b(frenchServerRemoteCredentialHandoffV2, 'credentialsPrintedByThisScript');
  const frenchServerRemoteCredentialHandoffV2UploadStarted = b(frenchServerRemoteCredentialHandoffV2, 'firebaseOrServerUploadStarted');
  const frenchServerRemoteCredentialHandoffV2RuntimeDownloadsEnabled = b(frenchServerRemoteCredentialHandoffV2, 'runtimeDownloadsEnabled');
  const frenchServerRemoteCredentialHandoffV2ActivationApproved = b(frenchServerRemoteCredentialHandoffV2, 'activationApproved');
  const frenchServerRemoteCredentialHandoffV2ReadyForApply = b(frenchServerRemoteCredentialHandoffV2, 'readyForApply');
  const frenchServerRemoteCredentialHandoffV2Present =
    frenchServerRemoteCredentialHandoffV2Status !== '' ||
    frenchServerRemoteCredentialHandoffV2State !== '' ||
    frenchServerRemoteCredentialHandoffV2AcceptedCredentialOptions > 0;
  const frenchUploadRemoteVerifyParityV2Blockers = n(frenchUploadRemoteVerifyParityV2, 'blockers');
  const frenchUploadRemoteVerifyParityV2Warnings = n(frenchUploadRemoteVerifyParityV2, 'warnings');
  const frenchUploadRemoteVerifyParityV2MatchedServerPaths = n(frenchUploadRemoteVerifyParityV2, 'matchedServerPaths');
  const frenchUploadRemoteVerifyParityV2ShaMatches = n(frenchUploadRemoteVerifyParityV2, 'shaMatches');
  const frenchUploadRemoteVerifyParityV2ByteMatches = n(frenchUploadRemoteVerifyParityV2, 'byteMatches');
  const frenchUploadRemoteVerifyParityV2UploadOnlyPaths = n(frenchUploadRemoteVerifyParityV2, 'uploadOnlyPaths');
  const frenchUploadRemoteVerifyParityV2DryRunOnlyPaths = n(frenchUploadRemoteVerifyParityV2, 'dryRunOnlyPaths');
  const frenchUploadRemoteVerifyParityV2ScopedFrenchPaths = n(frenchUploadRemoteVerifyParityV2, 'scopedFrenchPaths');
  const frenchUploadRemoteVerifyParityV2ReadyForRemoteObjectVerify = b(frenchUploadRemoteVerifyParityV2, 'readyForRemoteObjectVerify');
  const frenchUploadRemoteVerifyParityV2Present =
    frenchUploadRemoteVerifyParityV2MatchedServerPaths > 0 ||
    frenchUploadRemoteVerifyParityV2ShaMatches > 0 ||
    frenchUploadRemoteVerifyParityV2ByteMatches > 0 ||
    frenchUploadRemoteVerifyParityV2Blockers > 0 ||
    frenchUploadRemoteVerifyParityV2Warnings > 0 ||
    frenchUploadRemoteVerifyParityV2ReadyForRemoteObjectVerify;
  const frenchUploadRemoteVerifyParityV2FreshAfterRemoteDryRun =
    fileMtimeMs(frenchUploadRemoteVerifyParityV2Path) >= fileMtimeMs(productionServerManifestPublishGateV2Path) &&
    fileMtimeMs(productionServerManifestPublishGateV2Path) > 0;
  const frenchServerObjectRemoteVerifyV2Blockers = n(frenchServerObjectRemoteVerifyV2, 'blockers');
  const frenchServerObjectRemoteVerifyV2Warnings = n(frenchServerObjectRemoteVerifyV2, 'warnings');
  const frenchServerObjectRemoteVerifyV2FoundObjects = n(frenchServerObjectRemoteVerifyV2, 'foundObjectCount');
  const frenchServerObjectRemoteVerifyV2HashCheckedObjects =
    n(frenchServerObjectRemoteVerifyV2, 'hashCheckedCount') ||
    n(frenchServerObjectRemoteVerifyV2, 'hashCheckedObjects');
  const frenchServerObjectRemoteVerifyV2UnverifiedObjects = n(frenchServerObjectRemoteVerifyV2, 'unverifiedObjects');
  const frenchServerObjectRemoteVerifyV2Present =
    n(frenchServerObjectRemoteVerifyV2, 'expectedObjectCount') > 0 ||
    frenchServerObjectRemoteVerifyV2FoundObjects > 0 ||
    frenchServerObjectRemoteVerifyV2HashCheckedObjects > 0 ||
    frenchServerObjectRemoteVerifyV2UnverifiedObjects > 0 ||
    n(frenchServerObjectRemoteVerifyV2, 'missingObjects') > 0 ||
    frenchServerObjectRemoteVerifyV2Blockers > 0 ||
    frenchServerObjectRemoteVerifyV2Warnings > 0 ||
    b(frenchServerObjectRemoteVerifyV2, 'readyForRuntimeDownloadActivation');
  const frenchServerObjectRemoteVerifyV2ReadyForRuntimeDownloadActivation = b(frenchServerObjectRemoteVerifyV2, 'readyForRuntimeDownloadActivation');
  const frenchServerObjectRemoteVerifyV2MissingObjects = n(frenchServerObjectRemoteVerifyV2, 'missingObjects');
  const frenchServerObjectRemoteVerifyV2SizeMismatches = n(frenchServerObjectRemoteVerifyV2, 'sizeMismatches');
  const frenchServerObjectRemoteVerifyV2HashMismatches = n(frenchServerObjectRemoteVerifyV2, 'hashMismatches');
  const frenchServerObjectRemoteVerifyV2FixtureProbesPassed = n(frenchServerObjectRemoteVerifyV2, 'fixtureProbesPassed');
  const frenchServerObjectRemoteVerifyV2FixtureProbes = n(frenchServerObjectRemoteVerifyV2, 'fixtureProbes');
  const frenchServerObjectRemoteVerifyV2FreshAfterProductionManifestGate =
    fileMtimeMs(frenchServerObjectRemoteVerifyV2Path) >= fileMtimeMs(productionServerManifestPublishGateV2Path) &&
    fileMtimeMs(productionServerManifestPublishGateV2Path) > 0;
  const frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply =
    frenchServerObjectRemoteVerifyV2Present &&
    frenchServerObjectRemoteVerifyV2Blockers === 0 &&
    frenchServerObjectRemoteVerifyV2ReadyForRuntimeDownloadActivation &&
    frenchServerObjectRemoteVerifyV2FoundObjects === 36 &&
    frenchServerObjectRemoteVerifyV2HashCheckedObjects === 36 &&
    frenchServerObjectRemoteVerifyV2UnverifiedObjects === 0 &&
    frenchServerObjectRemoteVerifyV2MissingObjects === 0 &&
    frenchServerObjectRemoteVerifyV2SizeMismatches === 0 &&
    frenchServerObjectRemoteVerifyV2HashMismatches === 0 &&
    frenchServerObjectRemoteVerifyV2FreshAfterProductionManifestGate;
  const remoteVerifyBlocksDecisionImportAndApply = !frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply;
  const adminServerDeliveryRuntimePreflightV2Blockers = n(adminServerDeliveryRuntimePreflightV2, 'blockers');
  const adminServerDeliveryRuntimePreflightV2Warnings = n(adminServerDeliveryRuntimePreflightV2, 'warnings');
  const adminServerDeliveryRuntimePreflightV2Present =
    s(adminServerDeliveryRuntimePreflightV2, 'preflightState') !== '' ||
    n(adminServerDeliveryRuntimePreflightV2, 'manifestEntries') > 0;
  const adminServerDeliveryRuntimePreflightV2State = s(adminServerDeliveryRuntimePreflightV2, 'preflightState');
  const adminServerDeliveryRuntimePreflightV2ManifestEntries = n(adminServerDeliveryRuntimePreflightV2, 'manifestEntries');
  const adminServerDeliveryRuntimePreflightV2AdminReady = b(adminServerDeliveryRuntimePreflightV2, 'adminReady');
  const adminServerDeliveryRuntimePreflightV2RuntimeReady = b(adminServerDeliveryRuntimePreflightV2, 'runtimeReady');
  const adminServerDeliveryRuntimePreflightV2StorageReady = b(adminServerDeliveryRuntimePreflightV2, 'storageReady');
  const adminServerDeliveryRuntimePreflightV2FreshAfterServerPreflight =
    fileMtimeMs(adminServerDeliveryRuntimePreflightV2Path) >= fileMtimeMs(serverDeliveryPublishPreflightV2Path) &&
    fileMtimeMs(serverDeliveryPublishPreflightV2Path) > 0;
  const adminServerDeliveryRuntimePreflightV2ReadyForRuntimeActivationBlockerPlanning =
    b(adminServerDeliveryRuntimePreflightV2, 'readyForRuntimeActivationBlockerPlanningV2') &&
    adminServerDeliveryRuntimePreflightV2FreshAfterServerPreflight;
  const adminServerDeliveryRuntimePreflightV2FixtureProbesPassed = n(adminServerDeliveryRuntimePreflightV2, 'fixtureProbesPassed');
  const adminServerDeliveryRuntimePreflightV2FixtureProbes = n(adminServerDeliveryRuntimePreflightV2, 'fixtureProbes');
  const adminServerDeliveryRuntimePreflightV2ReadyForApply = b(adminServerDeliveryRuntimePreflightV2, 'readyForApply');
  const runtimeActivationBlockerPlanV2Blockers = n(runtimeActivationBlockerPlanV2, 'blockers');
  const runtimeActivationBlockerPlanV2Warnings = n(runtimeActivationBlockerPlanV2, 'warnings');
  const runtimeActivationBlockerPlanV2Present =
    s(runtimeActivationBlockerPlanV2, 'planState') !== '' ||
    n(runtimeActivationBlockerPlanV2, 'planItems') > 0;
  const runtimeActivationBlockerPlanV2State = s(runtimeActivationBlockerPlanV2, 'planState');
  const runtimeActivationBlockerPlanV2PlanItems = n(runtimeActivationBlockerPlanV2, 'planItems');
  const runtimeActivationBlockerPlanV2PlannedTouches = n(runtimeActivationBlockerPlanV2, 'plannedTouches');
  const runtimeActivationBlockerPlanV2ReadinessApplyBlockers = n(runtimeActivationBlockerPlanV2, 'readinessApplyBlockers');
  const runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps = n(runtimeActivationBlockerPlanV2, 'readinessDirtyWorktreeOverlaps');
  const runtimeActivationBlockerPlanV2FreshAfterAdminPreflight =
    fileMtimeMs(runtimeActivationBlockerPlanV2Path) >= fileMtimeMs(adminServerDeliveryRuntimePreflightV2Path) &&
    fileMtimeMs(adminServerDeliveryRuntimePreflightV2Path) > 0;
  const runtimeActivationBlockerPlanV2ReadyForExplicitApprovalReceiptGate =
    b(runtimeActivationBlockerPlanV2, 'readyForExplicitApprovalReceiptGateV2') &&
    runtimeActivationBlockerPlanV2FreshAfterAdminPreflight;
  const runtimeActivationBlockerPlanV2FixtureProbesPassed = n(runtimeActivationBlockerPlanV2, 'fixtureProbesPassed');
  const runtimeActivationBlockerPlanV2FixtureProbes = n(runtimeActivationBlockerPlanV2, 'fixtureProbes');
  const runtimeActivationBlockerPlanV2ReadyForApply = b(runtimeActivationBlockerPlanV2, 'readyForApply');
  const runtimeDeliveryEvidenceChainV2Blockers = n(runtimeDeliveryEvidenceChainV2, 'blockers');
  const runtimeDeliveryEvidenceChainV2Warnings = n(runtimeDeliveryEvidenceChainV2, 'warnings');
  const runtimeDeliveryEvidenceChainV2Present =
    s(runtimeDeliveryEvidenceChainV2, 'chainState') !== '' ||
    n(runtimeDeliveryEvidenceChainV2, 'publishManifestEntries') > 0;
  const runtimeDeliveryEvidenceChainV2State = s(runtimeDeliveryEvidenceChainV2, 'chainState');
  const runtimeDeliveryEvidenceChainV2UpstreamReportsPass = n(runtimeDeliveryEvidenceChainV2, 'upstreamReportsPass');
  const runtimeDeliveryEvidenceChainV2UpstreamReportBlockers = n(runtimeDeliveryEvidenceChainV2, 'upstreamReportBlockers');
  const runtimeDeliveryEvidenceChainV2PreviewEntries = n(runtimeDeliveryEvidenceChainV2, 'previewEntries');
  const runtimeDeliveryEvidenceChainV2PreviewShaPlaceholders = n(runtimeDeliveryEvidenceChainV2, 'previewShaPlaceholders');
  const runtimeDeliveryEvidenceChainV2PublishManifestEntries = n(runtimeDeliveryEvidenceChainV2, 'publishManifestEntries');
  const runtimeDeliveryEvidenceChainV2ActualShaEntries = n(runtimeDeliveryEvidenceChainV2, 'publishActualShaEntries');
  const runtimeDeliveryEvidenceChainV2ActualByteSizeEntries = n(runtimeDeliveryEvidenceChainV2, 'publishActualByteSizeEntries');
  const runtimeDeliveryEvidenceChainV2ManifestPayloadShaMatches = n(runtimeDeliveryEvidenceChainV2, 'manifestPayloadShaMatches');
  const runtimeDeliveryEvidenceChainV2ManifestIndexShaMatches = n(runtimeDeliveryEvidenceChainV2, 'manifestIndexShaMatches');
  const runtimeDeliveryEvidenceChainV2ManifestSliceManifestShaMatches = n(runtimeDeliveryEvidenceChainV2, 'manifestSliceManifestShaMatches');
  const runtimeDeliveryEvidenceChainV2ManifestChecksumReportsPresent = n(runtimeDeliveryEvidenceChainV2, 'manifestChecksumReportsPresent');
  const runtimeDeliveryEvidenceChainV2RuntimeRollbackSimulationContracts = n(runtimeDeliveryEvidenceChainV2, 'runtimeRollbackSimulationContracts');
  const runtimeDeliveryEvidenceChainV2RuntimeSourceLocaleMismatchRejectContracts = n(runtimeDeliveryEvidenceChainV2, 'runtimeSourceLocaleMismatchRejectContracts');
  const runtimeDeliveryEvidenceChainV2RuntimeStudyTargetMismatchRejectContracts = n(runtimeDeliveryEvidenceChainV2, 'runtimeStudyTargetMismatchRejectContracts');
  const runtimeDeliveryEvidenceChainV2AdminReady = b(runtimeDeliveryEvidenceChainV2, 'adminReady');
  const runtimeDeliveryEvidenceChainV2RuntimeReady = b(runtimeDeliveryEvidenceChainV2, 'adminRuntimeReady');
  const runtimeDeliveryEvidenceChainV2StorageReady = b(runtimeDeliveryEvidenceChainV2, 'adminStorageReady');
  const runtimeDeliveryEvidenceChainV2ClosedTransitions = b(runtimeDeliveryEvidenceChainV2, 'closedTransitions');
  const runtimeDeliveryEvidenceChainV2ReadyForExactApprovalWaitState = b(runtimeDeliveryEvidenceChainV2, 'readyForExactApprovalWaitState');
  const runtimeDeliveryEvidenceChainV2FixtureProbesPassed = n(runtimeDeliveryEvidenceChainV2, 'fixtureProbesPassed');
  const runtimeDeliveryEvidenceChainV2FixtureProbes = n(runtimeDeliveryEvidenceChainV2, 'fixtureProbes');
  const runtimeDeliveryEvidenceChainV2ReadyForApply = b(runtimeDeliveryEvidenceChainV2, 'readyForApply');
  const runtimeDeliveryEvidenceChainV2MayModifyProductionAppFiles = b(runtimeDeliveryEvidenceChainV2, 'mayModifyProductionAppFiles');
  const runtimeDeliveryEvidenceChainV2FreshAfterRuntimePlan =
    fileMtimeMs(runtimeDeliveryEvidenceChainV2Path) >= fileMtimeMs(runtimeActivationBlockerPlanV2Path) &&
    fileMtimeMs(runtimeActivationBlockerPlanV2Path) > 0;
  const runtimeDeliveryEvidenceChainV2Ready =
    runtimeDeliveryEvidenceChainV2Present &&
    runtimeDeliveryEvidenceChainV2Blockers === 0 &&
    runtimeDeliveryEvidenceChainV2State === 'runtime_delivery_evidence_chain_ready_no_writes' &&
    b(runtimeDeliveryEvidenceChainV2, 'runtimeDeliveryEvidenceChainReady') &&
    runtimeDeliveryEvidenceChainV2FreshAfterRuntimePlan &&
    runtimeDeliveryEvidenceChainV2UpstreamReportsPass === 9 &&
    runtimeDeliveryEvidenceChainV2UpstreamReportBlockers === 0 &&
    runtimeDeliveryEvidenceChainV2PreviewEntries === 12 &&
    runtimeDeliveryEvidenceChainV2PreviewShaPlaceholders === 12 &&
    runtimeDeliveryEvidenceChainV2PublishManifestEntries === 12 &&
    runtimeDeliveryEvidenceChainV2ActualShaEntries === 12 &&
    runtimeDeliveryEvidenceChainV2ActualByteSizeEntries === 12 &&
    runtimeDeliveryEvidenceChainV2ManifestPayloadShaMatches === 12 &&
    runtimeDeliveryEvidenceChainV2ManifestIndexShaMatches === 12 &&
    runtimeDeliveryEvidenceChainV2ManifestSliceManifestShaMatches === 12 &&
    runtimeDeliveryEvidenceChainV2ManifestChecksumReportsPresent === 12 &&
    runtimeDeliveryEvidenceChainV2RuntimeRollbackSimulationContracts === 12 &&
    runtimeDeliveryEvidenceChainV2RuntimeSourceLocaleMismatchRejectContracts === 12 &&
    runtimeDeliveryEvidenceChainV2RuntimeStudyTargetMismatchRejectContracts === 12 &&
    runtimeDeliveryEvidenceChainV2AdminReady &&
    runtimeDeliveryEvidenceChainV2RuntimeReady &&
    runtimeDeliveryEvidenceChainV2StorageReady &&
    runtimeDeliveryEvidenceChainV2ClosedTransitions &&
    runtimeDeliveryEvidenceChainV2ReadyForExactApprovalWaitState &&
    runtimeDeliveryEvidenceChainV2FixtureProbes > 0 &&
    runtimeDeliveryEvidenceChainV2FixtureProbesPassed === runtimeDeliveryEvidenceChainV2FixtureProbes &&
    !runtimeDeliveryEvidenceChainV2ReadyForApply &&
    !runtimeDeliveryEvidenceChainV2MayModifyProductionAppFiles;
  const explicitApprovalReceiptHashLockGateV2Blockers = n(explicitApprovalReceiptHashLockGateV2, 'blockers');
  const explicitApprovalReceiptHashLockGateV2Warnings = n(explicitApprovalReceiptHashLockGateV2, 'warnings');
  const explicitApprovalReceiptHashLockGateV2Present =
    s(explicitApprovalReceiptHashLockGateV2, 'gateState') !== '' ||
    n(explicitApprovalReceiptHashLockGateV2, 'criticalHashLocks') > 0;
  const explicitApprovalReceiptHashLockGateV2State = s(explicitApprovalReceiptHashLockGateV2, 'gateState');
  const explicitApprovalReceiptHashLockGateV2CriticalHashLocks = n(explicitApprovalReceiptHashLockGateV2, 'criticalHashLocks');
  const explicitApprovalReceiptHashLockGateV2DirtyFiles = n(explicitApprovalReceiptHashLockGateV2, 'dirtyFiles');
  const explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles = n(explicitApprovalReceiptHashLockGateV2, 'dirtyProductionCandidateFiles');
  const explicitApprovalReceiptHashLockGateV2FreshAfterRuntimePlan =
    fileMtimeMs(explicitApprovalReceiptHashLockGateV2Path) >= fileMtimeMs(runtimeActivationBlockerPlanV2Path) &&
    fileMtimeMs(runtimeActivationBlockerPlanV2Path) > 0;
  const explicitApprovalReceiptHashLockGateV2ReadyForApprovalRequestPresentation =
    b(explicitApprovalReceiptHashLockGateV2, 'readyForApprovalRequestPresentationV2') &&
    explicitApprovalReceiptHashLockGateV2FreshAfterRuntimePlan;
  const explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists = b(explicitApprovalReceiptHashLockGateV2, 'activeApprovalReceiptExists');
  const explicitApprovalReceiptHashLockGateV2ActiveHashLockExists = b(explicitApprovalReceiptHashLockGateV2, 'activeHashLockExists');
  const explicitApprovalReceiptHashLockGateV2FixtureProbesPassed = n(explicitApprovalReceiptHashLockGateV2, 'fixtureProbesPassed');
  const explicitApprovalReceiptHashLockGateV2FixtureProbes = n(explicitApprovalReceiptHashLockGateV2, 'fixtureProbes');
  const explicitApprovalReceiptHashLockGateV2ReadyForApply = b(explicitApprovalReceiptHashLockGateV2, 'readyForApply');
  const activationApprovalRequestPresentationV2Blockers = n(activationApprovalRequestPresentationV2, 'blockers');
  const activationApprovalRequestPresentationV2Warnings = n(activationApprovalRequestPresentationV2, 'warnings');
  const activationApprovalRequestPresentationV2Present =
    s(activationApprovalRequestPresentationV2, 'requestState') !== '' ||
    n(activationApprovalRequestPresentationV2, 'criticalHashLocks') > 0;
  const activationApprovalRequestPresentationV2State = s(activationApprovalRequestPresentationV2, 'requestState');
  const activationApprovalRequestPresentationV2CriticalHashLocks = n(activationApprovalRequestPresentationV2, 'criticalHashLocks');
  const activationApprovalRequestPresentationV2DirtyFiles = n(activationApprovalRequestPresentationV2, 'dirtyFiles');
  const activationApprovalRequestPresentationV2FreshAfterHashLockGate =
    fileMtimeMs(activationApprovalRequestPresentationV2Path) >= fileMtimeMs(explicitApprovalReceiptHashLockGateV2Path) &&
    fileMtimeMs(explicitApprovalReceiptHashLockGateV2Path) > 0;
  const activationApprovalRequestPresentationV2ReadyForExplicitApprovalReceiptCreationGate =
    b(activationApprovalRequestPresentationV2, 'readyForExplicitApprovalReceiptCreationGateV2') &&
    activationApprovalRequestPresentationV2FreshAfterHashLockGate;
  const activationApprovalRequestPresentationV2ActiveApprovalReceiptExists = b(activationApprovalRequestPresentationV2, 'activeApprovalReceiptExists');
  const activationApprovalRequestPresentationV2ActiveHashLockExists = b(activationApprovalRequestPresentationV2, 'activeHashLockExists');
  const activationApprovalRequestPresentationV2FixtureProbesPassed = n(activationApprovalRequestPresentationV2, 'fixtureProbesPassed');
  const activationApprovalRequestPresentationV2FixtureProbes = n(activationApprovalRequestPresentationV2, 'fixtureProbes');
  const activationApprovalRequestPresentationV2ReadyForApply = b(activationApprovalRequestPresentationV2, 'readyForApply');
  const explicitApprovalReceiptCreationGateV2Blockers = n(explicitApprovalReceiptCreationGateV2, 'blockers');
  const explicitApprovalReceiptCreationGateV2Warnings = n(explicitApprovalReceiptCreationGateV2, 'warnings');
  const explicitApprovalReceiptCreationGateV2Present =
    s(explicitApprovalReceiptCreationGateV2, 'receiptCreationState') !== '' ||
    b(explicitApprovalReceiptCreationGateV2, 'plainContinueRejected');
  const explicitApprovalReceiptCreationGateV2State = s(explicitApprovalReceiptCreationGateV2, 'receiptCreationState');
  const explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent = b(explicitApprovalReceiptCreationGateV2, 'exactApprovalSentencePresent');
  const explicitApprovalReceiptCreationGateV2PlainContinueRejected = b(explicitApprovalReceiptCreationGateV2, 'plainContinueRejected');
  const explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated = b(explicitApprovalReceiptCreationGateV2, 'activeApprovalReceiptCreated');
  const explicitApprovalReceiptCreationGateV2ActiveHashLockCreated = b(explicitApprovalReceiptCreationGateV2, 'activeHashLockCreated');
  const explicitApprovalReceiptCreationGateV2FreshAfterApprovalRequest =
    fileMtimeMs(explicitApprovalReceiptCreationGateV2Path) >= fileMtimeMs(activationApprovalRequestPresentationV2Path) &&
    fileMtimeMs(activationApprovalRequestPresentationV2Path) > 0;
  const explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit =
    b(explicitApprovalReceiptCreationGateV2, 'canContinueNonProductionAudit') &&
    explicitApprovalReceiptCreationGateV2FreshAfterApprovalRequest;
  const explicitApprovalReceiptCreationGateV2FixtureProbesPassed = n(explicitApprovalReceiptCreationGateV2, 'fixtureProbesPassed');
  const explicitApprovalReceiptCreationGateV2FixtureProbes = n(explicitApprovalReceiptCreationGateV2, 'fixtureProbes');
  const explicitApprovalReceiptCreationGateV2ReadyForApply = b(explicitApprovalReceiptCreationGateV2, 'readyForApply');
  const productionApplyAbsenceDenialGateV2Blockers = n(productionApplyAbsenceDenialGateV2, 'blockers');
  const productionApplyAbsenceDenialGateV2Warnings = n(productionApplyAbsenceDenialGateV2, 'warnings');
  const productionApplyAbsenceDenialGateV2Present =
    s(productionApplyAbsenceDenialGateV2, 'denialState') !== '' ||
    b(productionApplyAbsenceDenialGateV2, 'productionApplyDenied');
  const productionApplyAbsenceDenialGateV2State = s(productionApplyAbsenceDenialGateV2, 'denialState');
  const productionApplyAbsenceDenialGateV2ApplyDenied = b(productionApplyAbsenceDenialGateV2, 'productionApplyDenied');
  const productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists = b(productionApplyAbsenceDenialGateV2, 'activeApprovalReceiptExists');
  const productionApplyAbsenceDenialGateV2ActiveHashLockExists = b(productionApplyAbsenceDenialGateV2, 'activeHashLockExists');
  const productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit = b(productionApplyAbsenceDenialGateV2, 'canContinueNonProductionAudit');
  const productionApplyAbsenceDenialGateV2FreshAfterReceiptCreation =
    fileMtimeMs(productionApplyAbsenceDenialGateV2Path) >= fileMtimeMs(explicitApprovalReceiptCreationGateV2Path) &&
    fileMtimeMs(explicitApprovalReceiptCreationGateV2Path) > 0;
  const productionApplyAbsenceDenialGateV2ReceiptCreationEquivalent =
    explicitApprovalReceiptCreationGateV2Present &&
    explicitApprovalReceiptCreationGateV2State === 'approval_receipt_creation_waiting_for_exact_sentence' &&
    explicitApprovalReceiptCreationGateV2PlainContinueRejected &&
    explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit &&
    !explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated &&
    !explicitApprovalReceiptCreationGateV2ActiveHashLockCreated &&
    !explicitApprovalReceiptCreationGateV2ReadyForApply &&
    !b(explicitApprovalReceiptCreationGateV2, 'mayModifyProductionAppFiles') &&
    !b(explicitApprovalReceiptCreationGateV2, 'activationApproved') &&
    productionApplyAbsenceDenialGateV2State === 'production_apply_denied_missing_active_approval_artifacts' &&
    productionApplyAbsenceDenialGateV2ApplyDenied &&
    !productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists &&
    !productionApplyAbsenceDenialGateV2ActiveHashLockExists;
  const productionApplyAbsenceDenialGateV2ReadyForNonProductionContinuation =
    b(productionApplyAbsenceDenialGateV2, 'readyForNonProductionContinuationAfterApplyDenialV2') &&
    (productionApplyAbsenceDenialGateV2FreshAfterReceiptCreation || productionApplyAbsenceDenialGateV2ReceiptCreationEquivalent);
  const productionApplyAbsenceDenialGateV2FixtureProbesPassed = n(productionApplyAbsenceDenialGateV2, 'fixtureProbesPassed');
  const productionApplyAbsenceDenialGateV2FixtureProbes = n(productionApplyAbsenceDenialGateV2, 'fixtureProbes');
  const productionApplyAbsenceDenialGateV2ReadyForApply = b(productionApplyAbsenceDenialGateV2, 'readyForApply');
  const nonproductionBlockerClosurePlanV2Blockers = n(nonproductionBlockerClosurePlanV2, 'blockers');
  const nonproductionBlockerClosurePlanV2Warnings = n(nonproductionBlockerClosurePlanV2, 'warnings');
  const nonproductionBlockerClosurePlanV2Present =
    s(nonproductionBlockerClosurePlanV2, 'planState') !== '' ||
    b(nonproductionBlockerClosurePlanV2, 'readyForNextNonProductionPass');
  const nonproductionBlockerClosurePlanV2State = s(nonproductionBlockerClosurePlanV2, 'planState');
  const nonproductionBlockerClosurePlanV2ChainReady = b(nonproductionBlockerClosurePlanV2, 'p18p32ChainReady');
  const nonproductionBlockerClosurePlanV2SafeItems = n(nonproductionBlockerClosurePlanV2, 'safeNonProductionItems');
  const nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems = n(nonproductionBlockerClosurePlanV2, 'exactApprovalOnlyItems');
  const nonproductionBlockerClosurePlanV2ProductionLockedItems = n(nonproductionBlockerClosurePlanV2, 'productionLockedItems');
  const nonproductionBlockerClosurePlanV2RecommendedNextSafeItem = s(nonproductionBlockerClosurePlanV2, 'recommendedNextSafeItem');
  const nonproductionBlockerClosurePlanV2FreshAfterApplyDenial =
    fileMtimeMs(nonproductionBlockerClosurePlanV2Path) >= fileMtimeMs(productionApplyAbsenceDenialGateV2Path) &&
    fileMtimeMs(productionApplyAbsenceDenialGateV2Path) > 0;
  const nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass =
    b(nonproductionBlockerClosurePlanV2, 'readyForNextNonProductionPass') &&
    nonproductionBlockerClosurePlanV2FreshAfterApplyDenial;
  const nonproductionBlockerClosurePlanV2FixtureProbesPassed = n(nonproductionBlockerClosurePlanV2, 'fixtureProbesPassed');
  const nonproductionBlockerClosurePlanV2FixtureProbes = n(nonproductionBlockerClosurePlanV2, 'fixtureProbes');
  const nonproductionBlockerClosurePlanV2ReadyForApply = b(nonproductionBlockerClosurePlanV2, 'readyForApply');
  const nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles = b(nonproductionBlockerClosurePlanV2, 'mayModifyProductionAppFiles');
  const nonproductionEvidenceRefreshV2Blockers = n(nonproductionEvidenceRefreshV2, 'blockers');
  const nonproductionEvidenceRefreshV2Warnings = n(nonproductionEvidenceRefreshV2, 'warnings');
  const nonproductionEvidenceRefreshV2Present =
    s(nonproductionEvidenceRefreshV2, 'refreshState') !== '' ||
    b(nonproductionEvidenceRefreshV2, 'readyForNextNonProductionManifestRecheck');
  const nonproductionEvidenceRefreshV2State = s(nonproductionEvidenceRefreshV2, 'refreshState');
  const nonproductionEvidenceRefreshV2LegacyReviewResidueMatches = n(nonproductionEvidenceRefreshV2, 'legacyReviewResidueMatches');
  const nonproductionEvidenceRefreshV2FreshAfterClosurePlan =
    fileMtimeMs(nonproductionEvidenceRefreshV2Path) >= fileMtimeMs(nonproductionBlockerClosurePlanV2Path) &&
    fileMtimeMs(nonproductionBlockerClosurePlanV2Path) > 0;
  const nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck =
    b(nonproductionEvidenceRefreshV2, 'readyForNextNonProductionManifestRecheck') &&
    nonproductionEvidenceRefreshV2FreshAfterClosurePlan;
  const nonproductionEvidenceRefreshV2FixtureProbesPassed = n(nonproductionEvidenceRefreshV2, 'fixtureProbesPassed');
  const nonproductionEvidenceRefreshV2FixtureProbes = n(nonproductionEvidenceRefreshV2, 'fixtureProbes');
  const nonproductionEvidenceRefreshV2ReadyForApply = b(nonproductionEvidenceRefreshV2, 'readyForApply');
  const nonproductionEvidenceRefreshV2MayModifyProductionAppFiles = b(nonproductionEvidenceRefreshV2, 'mayModifyProductionAppFiles');
  const runtimeServerManifestConsistencyRecheckV2Blockers = n(runtimeServerManifestConsistencyRecheckV2, 'blockers');
  const runtimeServerManifestConsistencyRecheckV2Warnings = n(runtimeServerManifestConsistencyRecheckV2, 'warnings');
  const runtimeServerManifestConsistencyRecheckV2Present =
    s(runtimeServerManifestConsistencyRecheckV2, 'manifestConsistencyState') !== '' ||
    n(runtimeServerManifestConsistencyRecheckV2, 'manifestEntries') > 0;
  const runtimeServerManifestConsistencyRecheckV2State = s(runtimeServerManifestConsistencyRecheckV2, 'manifestConsistencyState');
  const runtimeServerManifestConsistencyRecheckV2ManifestEntries = n(runtimeServerManifestConsistencyRecheckV2, 'manifestEntries');
  const runtimeServerManifestConsistencyRecheckV2GateRefsCurrent = n(runtimeServerManifestConsistencyRecheckV2, 'gateReportRefsCurrentSha');
  const runtimeServerManifestConsistencyRecheckV2GateRefs = n(runtimeServerManifestConsistencyRecheckV2, 'gateReportRefs');
  const runtimeServerManifestConsistencyRecheckV2InputHashesCurrent = n(runtimeServerManifestConsistencyRecheckV2, 'manifestInputHashesCurrent');
  const runtimeServerManifestConsistencyRecheckV2InputHashes = n(runtimeServerManifestConsistencyRecheckV2, 'manifestInputHashes');
  const runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen = n(runtimeServerManifestConsistencyRecheckV2, 'topLevelUploadFlagsOpen');
  const runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries = n(runtimeServerManifestConsistencyRecheckV2, 'activationApprovedEntries');
  const runtimeServerManifestConsistencyRecheckV2RuntimeDownloadsEnabledEntries = n(runtimeServerManifestConsistencyRecheckV2, 'runtimeDownloadsEnabledEntries');
  const runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries = n(runtimeServerManifestConsistencyRecheckV2, 'readyForApplyEntries');
  const runtimeServerManifestConsistencyRecheckV2FreshAfterEvidenceRefresh =
    fileMtimeMs(runtimeServerManifestConsistencyRecheckV2Path) >= fileMtimeMs(nonproductionEvidenceRefreshV2Path) &&
    fileMtimeMs(nonproductionEvidenceRefreshV2Path) > 0;
  const runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck =
    b(runtimeServerManifestConsistencyRecheckV2, 'readyForNextNonProductionLanguageIsolationRegressionRecheck') &&
    runtimeServerManifestConsistencyRecheckV2FreshAfterEvidenceRefresh;
  const runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed = n(runtimeServerManifestConsistencyRecheckV2, 'fixtureProbesPassed');
  const runtimeServerManifestConsistencyRecheckV2FixtureProbes = n(runtimeServerManifestConsistencyRecheckV2, 'fixtureProbes');
  const runtimeServerManifestConsistencyRecheckV2ReadyForApply = b(runtimeServerManifestConsistencyRecheckV2, 'readyForApply');
  const runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles = b(runtimeServerManifestConsistencyRecheckV2, 'mayModifyProductionAppFiles');
  const languageIsolationRegressionRecheckV2Blockers = n(languageIsolationRegressionRecheckV2, 'blockers');
  const languageIsolationRegressionRecheckV2Warnings = n(languageIsolationRegressionRecheckV2, 'warnings');
  const languageIsolationRegressionRecheckV2Present =
    s(languageIsolationRegressionRecheckV2, 'languageIsolationRegressionRecheckState') !== '' ||
    n(languageIsolationRegressionRecheckV2, 'scannedRows') > 0;
  const languageIsolationRegressionRecheckV2State = s(languageIsolationRegressionRecheckV2, 'languageIsolationRegressionRecheckState');
  const languageIsolationRegressionRecheckV2ScannedRows = n(languageIsolationRegressionRecheckV2, 'scannedRows');
  const languageIsolationRegressionRecheckV2ScannedTargetFields = n(languageIsolationRegressionRecheckV2, 'scannedTargetFields');
  const languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale = n(languageIsolationRegressionRecheckV2, 'promptContractsWithTargetLocale');
  const languageIsolationRegressionRecheckV2PromptEntrypointsExpected = n(languageIsolationRegressionRecheckV2, 'promptEntrypointsExpected');
  const languageIsolationRegressionRecheckV2ManifestEntries = n(languageIsolationRegressionRecheckV2, 'manifestEntries');
  const languageIsolationRegressionRecheckV2FreshAfterManifestConsistency =
    fileMtimeMs(languageIsolationRegressionRecheckV2Path) >= fileMtimeMs(runtimeServerManifestConsistencyRecheckV2Path) &&
    fileMtimeMs(runtimeServerManifestConsistencyRecheckV2Path) > 0;
  const languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh =
    b(languageIsolationRegressionRecheckV2, 'readyForNextNonProductionReadinessApplyBlockerMapRefresh') &&
    languageIsolationRegressionRecheckV2FreshAfterManifestConsistency;
  const languageIsolationRegressionRecheckV2FixtureProbesPassed = n(languageIsolationRegressionRecheckV2, 'fixtureProbesPassed');
  const languageIsolationRegressionRecheckV2FixtureProbes = n(languageIsolationRegressionRecheckV2, 'fixtureProbes');
  const languageIsolationRegressionRecheckV2ReadyForApply = b(languageIsolationRegressionRecheckV2, 'readyForApply');
  const languageIsolationRegressionRecheckV2MayModifyProductionAppFiles = b(languageIsolationRegressionRecheckV2, 'mayModifyProductionAppFiles');
  const readinessApplyBlockerMapRefreshV2Blockers = n(readinessApplyBlockerMapRefreshV2, 'blockers');
  const readinessApplyBlockerMapRefreshV2Warnings = n(readinessApplyBlockerMapRefreshV2, 'warnings');
  const readinessApplyBlockerMapRefreshV2Present =
    s(readinessApplyBlockerMapRefreshV2, 'blockerMapState') !== '' ||
    n(readinessApplyBlockerMapRefreshV2, 'readinessApplyBlockers') > 0;
  const readinessApplyBlockerMapRefreshV2State = s(readinessApplyBlockerMapRefreshV2, 'blockerMapState');
  const readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers = n(readinessApplyBlockerMapRefreshV2, 'readinessApplyBlockers');
  const readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers = n(readinessApplyBlockerMapRefreshV2, 'readinessGenerationBlockers');
  const readinessApplyBlockerMapRefreshV2SafeClosed = n(readinessApplyBlockerMapRefreshV2, 'safeNonProductionItemsClosed');
  const readinessApplyBlockerMapRefreshV2SafeRemaining = n(readinessApplyBlockerMapRefreshV2, 'safeNonProductionItemsRemaining');
  const readinessApplyBlockerMapRefreshV2FreshAfterLanguageIsolation =
    fileMtimeMs(readinessApplyBlockerMapRefreshV2Path) >= fileMtimeMs(languageIsolationRegressionRecheckV2Path) &&
    fileMtimeMs(languageIsolationRegressionRecheckV2Path) > 0;
  const readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh =
    b(readinessApplyBlockerMapRefreshV2, 'readyForNextNonProductionMasterNextPassConsistencyRefresh') &&
    readinessApplyBlockerMapRefreshV2FreshAfterLanguageIsolation;
  const readinessApplyBlockerMapRefreshV2FixtureProbesPassed = n(readinessApplyBlockerMapRefreshV2, 'fixtureProbesPassed');
  const readinessApplyBlockerMapRefreshV2FixtureProbes = n(readinessApplyBlockerMapRefreshV2, 'fixtureProbes');
  const readinessApplyBlockerMapRefreshV2ReadyForApply = b(readinessApplyBlockerMapRefreshV2, 'readyForApply');
  const readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles = b(readinessApplyBlockerMapRefreshV2, 'mayModifyProductionAppFiles');
  const masterNextPassConsistencyRefreshV2Blockers = n(masterNextPassConsistencyRefreshV2, 'blockers');
  const masterNextPassConsistencyRefreshV2Warnings = n(masterNextPassConsistencyRefreshV2, 'warnings');
  const masterNextPassConsistencyRefreshV2Present =
    s(masterNextPassConsistencyRefreshV2, 'consistencyState') !== '' ||
    b(masterNextPassConsistencyRefreshV2, 'readyForOfficialSourceContentCoverageGateV2');
  const masterNextPassConsistencyRefreshV2State = s(masterNextPassConsistencyRefreshV2, 'consistencyState');
  const masterNextPassConsistencyRefreshV2FreshAfterReadinessMap =
    fileMtimeMs(masterNextPassConsistencyRefreshV2Path) >= fileMtimeMs(readinessApplyBlockerMapRefreshV2Path) &&
    fileMtimeMs(readinessApplyBlockerMapRefreshV2Path) > 0;
  const masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage =
    b(masterNextPassConsistencyRefreshV2, 'readyForOfficialSourceContentCoverageGateV2') &&
    masterNextPassConsistencyRefreshV2FreshAfterReadinessMap;
  const masterNextPassConsistencyRefreshV2FixtureProbesPassed = n(masterNextPassConsistencyRefreshV2, 'fixtureProbesPassed');
  const masterNextPassConsistencyRefreshV2FixtureProbes = n(masterNextPassConsistencyRefreshV2, 'fixtureProbes');
  const masterNextPassConsistencyRefreshV2ReadyForApply = b(masterNextPassConsistencyRefreshV2, 'readyForApply');
  const masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles = b(masterNextPassConsistencyRefreshV2, 'mayModifyProductionAppFiles');
  const officialSourceContentCoverageV2Blockers = n(officialSourceContentCoverageV2, 'blockers');
  const officialSourceContentCoverageV2Warnings = n(officialSourceContentCoverageV2, 'warnings');
  const officialSourceContentCoverageV2Present =
    s(officialSourceContentCoverageV2, 'coverageState') !== '' ||
    n(officialSourceContentCoverageV2, 'acceptedRowOfficialSourceDecisionRows') > 0;
  const officialSourceContentCoverageV2State = s(officialSourceContentCoverageV2, 'coverageState');
  const officialSourceContentCoverageV2LedgerRows = n(officialSourceContentCoverageV2, 'ledgerRows');
  const officialSourceContentCoverageV2AcceptedRows = n(officialSourceContentCoverageV2, 'acceptedRowOfficialSourceDecisionRows');
  const officialSourceContentCoverageV2AcceptedAi = n(officialSourceContentCoverageV2, 'acceptedAiOfficialSourceDecisionRows');
  const officialSourceContentCoverageV2RowsWithSourceRefs = n(officialSourceContentCoverageV2, 'rowDecisionsWithSourceRefs');
  const officialSourceContentCoverageV2RowsWithTrustedSourceRefUrls = n(officialSourceContentCoverageV2, 'rowDecisionsWithTrustedSourceRefUrls');
  const officialSourceContentCoverageV2RowsWithEvidenceCoveredBySourceRefs = n(officialSourceContentCoverageV2, 'rowDecisionsWithEvidenceCoveredBySourceRefs');
  const officialSourceContentCoverageV2RowsWithUntrustedSourceRefUrls = n(officialSourceContentCoverageV2, 'rowDecisionsWithUntrustedSourceRefUrls');
  const officialSourceContentCoverageV2RowsWithUntrustedSourceRefIds = n(officialSourceContentCoverageV2, 'rowDecisionsWithUntrustedSourceRefIds');
  const officialSourceContentCoverageV2AiWithTrustedSourceRefUrls = n(officialSourceContentCoverageV2, 'aiDecisionsWithTrustedSourceRefUrls');
  const officialSourceContentCoverageV2AiWithMinimumTrustedSourceRefs = n(officialSourceContentCoverageV2, 'aiDecisionsWithMinimumTrustedSourceRefs');
  const officialSourceContentCoverageV2AiWithUntrustedSourceRefUrls = n(officialSourceContentCoverageV2, 'aiDecisionsWithUntrustedSourceRefUrls');
  const officialSourceContentCoverageV2AiWithUntrustedSourceRefIds = n(officialSourceContentCoverageV2, 'aiDecisionsWithUntrustedSourceRefIds');
  const officialSourceContentCoverageV2RejectsNonHttpsSourceRefFixture = b(officialSourceContentCoverageV2, 'rejectsNonHttpsSourceRefFixture');
  const officialSourceContentCoverageV2RejectsUntrustedSourceDomainFixture = b(officialSourceContentCoverageV2, 'rejectsUntrustedSourceDomainFixture');
  const officialSourceContentCoverageV2RejectsUntrustedSourceIdFixture = b(officialSourceContentCoverageV2, 'rejectsUntrustedSourceIdFixture');
  const officialSourceContentCoverageV2RejectsEvidenceWithoutMatchingSourceRefFixture = b(officialSourceContentCoverageV2, 'rejectsEvidenceWithoutMatchingSourceRefFixture');
  const officialSourceContentCoverageV2RejectsInsufficientAiTrustedSourceRefsFixture = b(officialSourceContentCoverageV2, 'rejectsInsufficientAiTrustedSourceRefsFixture');
  const officialSourceContentCoverageV2RowsWithGatesPassed = n(officialSourceContentCoverageV2, 'rowDecisionsWithAllRequiredGatesPassed');
  const officialSourceContentCoverageV2QuizRowsOneCorrect = n(officialSourceContentCoverageV2, 'rowDecisionQuizRowsWithOneCorrectAnswer');
  const officialSourceContentCoverageV2TrustedSourceIds = n(officialSourceContentCoverageV2, 'trustedSourceIds');
  const officialSourceContentCoverageV2P38Ready = b(officialSourceContentCoverageV2, 'p38Ready');
  const officialSourceContentCoverageV2MtimeFreshAfterMasterRefresh =
    fileMtimeMs(officialSourceContentCoverageV2Path) >= fileMtimeMs(masterNextPassConsistencyRefreshV2Path) &&
    fileMtimeMs(masterNextPassConsistencyRefreshV2Path) > 0;
  const officialSourceContentCoverageV2FreshnessAcceptedByP38Snapshot =
    officialSourceContentCoverageV2P38Ready &&
    officialSourceContentCoverageV2State === 'official_source_content_coverage_complete_no_import' &&
    officialSourceContentCoverageV2Blockers === 0;
  const officialSourceContentCoverageV2FreshAfterMasterRefresh =
    officialSourceContentCoverageV2MtimeFreshAfterMasterRefresh ||
    officialSourceContentCoverageV2FreshnessAcceptedByP38Snapshot;
  const officialSourceContentCoverageV2ReadyForImportDryRunRefresh =
    b(officialSourceContentCoverageV2, 'readyForReviewerDecisionImportDryRunRefresh') &&
    officialSourceContentCoverageV2FreshAfterMasterRefresh;
  const officialSourceContentCoverageV2FixtureProbesPassed = n(officialSourceContentCoverageV2, 'fixtureProbesPassed');
  const officialSourceContentCoverageV2FixtureProbes = n(officialSourceContentCoverageV2, 'fixtureProbes');
  const officialSourceContentCoverageV2ReadyForApply = b(officialSourceContentCoverageV2, 'readyForApply');
  const officialSourceContentCoverageV2MayModifyProductionAppFiles = b(officialSourceContentCoverageV2, 'mayModifyProductionAppFiles');
  const productionActivationHoldExactApprovalRequiredV2Blockers = n(productionActivationHoldExactApprovalRequiredV2, 'blockers');
  const productionActivationHoldExactApprovalRequiredV2Warnings = n(productionActivationHoldExactApprovalRequiredV2, 'warnings');
  const productionActivationHoldExactApprovalRequiredV2Present =
    s(productionActivationHoldExactApprovalRequiredV2, 'holdState') !== '' ||
    b(productionActivationHoldExactApprovalRequiredV2, 'productionActivationHold');
  const productionActivationHoldExactApprovalRequiredV2State = s(productionActivationHoldExactApprovalRequiredV2, 'holdState');
  const productionActivationHoldExactApprovalRequiredV2ClosedEvidenceReady = b(productionActivationHoldExactApprovalRequiredV2, 'closedEvidenceReady');
  const productionActivationHoldExactApprovalRequiredV2ExactApprovalRequired = b(productionActivationHoldExactApprovalRequiredV2, 'exactApprovalRequired');
  const productionActivationHoldExactApprovalRequiredV2FixtureProbesPassed = n(productionActivationHoldExactApprovalRequiredV2, 'fixtureProbesPassed');
  const productionActivationHoldExactApprovalRequiredV2FixtureProbes = n(productionActivationHoldExactApprovalRequiredV2, 'fixtureProbes');
  const productionActivationHoldExactApprovalRequiredV2ReadyForApply = b(productionActivationHoldExactApprovalRequiredV2, 'readyForApply');
  const productionActivationHoldExactApprovalRequiredV2MayModifyProductionAppFiles = b(productionActivationHoldExactApprovalRequiredV2, 'mayModifyProductionAppFiles');
  const productionActivationHoldExactApprovalRequiredV2FreshAfterClosedEvidence =
    fileMtimeMs(productionActivationHoldExactApprovalRequiredV2Path) >= fileMtimeMs(masterNextPassConsistencyRefreshV2Path) &&
    fileMtimeMs(productionActivationHoldExactApprovalRequiredV2Path) >= fileMtimeMs(officialSourceContentCoverageV2Path) &&
    fileMtimeMs(productionActivationHoldExactApprovalRequiredV2Path) >= fileMtimeMs(closedLocalPayloadMaterializationV2Path) &&
    fileMtimeMs(masterNextPassConsistencyRefreshV2Path) > 0 &&
    fileMtimeMs(officialSourceContentCoverageV2Path) > 0 &&
    fileMtimeMs(closedLocalPayloadMaterializationV2Path) > 0;
  const productionActivationHoldExactApprovalRequiredV2Ready =
    productionActivationHoldExactApprovalRequiredV2Present &&
    productionActivationHoldExactApprovalRequiredV2FreshAfterClosedEvidence &&
    productionActivationHoldExactApprovalRequiredV2Blockers === 0 &&
    productionActivationHoldExactApprovalRequiredV2State === 'production_activation_hold_exact_approval_required' &&
    productionActivationHoldExactApprovalRequiredV2ClosedEvidenceReady &&
    productionActivationHoldExactApprovalRequiredV2ExactApprovalRequired &&
    !productionActivationHoldExactApprovalRequiredV2ReadyForApply &&
    !productionActivationHoldExactApprovalRequiredV2MayModifyProductionAppFiles &&
    !b(productionActivationHoldExactApprovalRequiredV2, 'activationApproved') &&
    productionActivationHoldExactApprovalRequiredV2FixtureProbes > 0 &&
    productionActivationHoldExactApprovalRequiredV2FixtureProbesPassed === productionActivationHoldExactApprovalRequiredV2FixtureProbes;
  const exactApprovalValidationGateV2Blockers = n(exactApprovalValidationGateV2, 'blockers');
  const exactApprovalValidationGateV2Warnings = n(exactApprovalValidationGateV2, 'warnings');
  const exactApprovalValidationGateV2Present =
    s(exactApprovalValidationGateV2, 'validationState') !== '' ||
    b(exactApprovalValidationGateV2, 'exactApprovalRequired');
  const exactApprovalValidationGateV2State = s(exactApprovalValidationGateV2, 'validationState');
  const exactApprovalValidationGateV2ReadyForProductionActivationSequencing = b(exactApprovalValidationGateV2, 'readyForProductionActivationSequencing');
  const exactApprovalValidationGateV2ActiveApprovalReceiptExists = b(exactApprovalValidationGateV2, 'activeApprovalReceiptExists');
  const exactApprovalValidationGateV2ActiveHashLockExists = b(exactApprovalValidationGateV2, 'activeHashLockExists');
  const exactApprovalValidationGateV2FixtureProbesPassed = n(exactApprovalValidationGateV2, 'fixtureProbesPassed');
  const exactApprovalValidationGateV2FixtureProbes = n(exactApprovalValidationGateV2, 'fixtureProbes');
  const exactApprovalValidationGateV2ReadyForApply = b(exactApprovalValidationGateV2, 'readyForApply');
  const exactApprovalValidationGateV2MayModifyProductionAppFiles = b(exactApprovalValidationGateV2, 'mayModifyProductionAppFiles');
  const exactApprovalValidationGateV2FreshAfterP43 =
    fileMtimeMs(exactApprovalValidationGateV2Path) >= fileMtimeMs(productionActivationHoldExactApprovalRequiredV2Path) &&
    fileMtimeMs(productionActivationHoldExactApprovalRequiredV2Path) > 0;
  const exactApprovalValidationGateV2Ready =
    exactApprovalValidationGateV2Present &&
    exactApprovalValidationGateV2FreshAfterP43 &&
    exactApprovalValidationGateV2Blockers === 0 &&
    (exactApprovalValidationGateV2State === 'waiting_for_exact_approval_artifacts' ||
      exactApprovalValidationGateV2State === 'exact_approval_artifacts_validated_for_next_sequencing') &&
    !exactApprovalValidationGateV2ReadyForApply &&
    !exactApprovalValidationGateV2MayModifyProductionAppFiles &&
    !b(exactApprovalValidationGateV2, 'activationApproved') &&
    exactApprovalValidationGateV2FixtureProbes > 0 &&
    exactApprovalValidationGateV2FixtureProbesPassed === exactApprovalValidationGateV2FixtureProbes;
  const productionActivationSequencePreflightV2Blockers = n(productionActivationSequencePreflightV2, 'blockers');
  const productionActivationSequencePreflightV2Warnings = n(productionActivationSequencePreflightV2, 'warnings');
  const productionActivationSequencePreflightV2Present =
    s(productionActivationSequencePreflightV2, 'preflightState') !== '' ||
    b(productionActivationSequencePreflightV2, 'readyForProductionActivationSequence');
  const productionActivationSequencePreflightV2State = s(productionActivationSequencePreflightV2, 'preflightState');
  const productionActivationSequencePreflightV2ReadyForProductionActivationSequence = b(productionActivationSequencePreflightV2, 'readyForProductionActivationSequence');
  const productionActivationSequencePreflightV2FixtureProbesPassed = n(productionActivationSequencePreflightV2, 'fixtureProbesPassed');
  const productionActivationSequencePreflightV2FixtureProbes = n(productionActivationSequencePreflightV2, 'fixtureProbes');
  const productionActivationSequencePreflightV2ReadyForApply = b(productionActivationSequencePreflightV2, 'readyForApply');
  const productionActivationSequencePreflightV2MayModifyProductionAppFiles = b(productionActivationSequencePreflightV2, 'mayModifyProductionAppFiles');
  const productionActivationSequencePreflightV2FreshAfterP44 =
    fileMtimeMs(productionActivationSequencePreflightV2Path) >= fileMtimeMs(exactApprovalValidationGateV2Path) &&
    fileMtimeMs(exactApprovalValidationGateV2Path) > 0;
  const productionActivationSequencePreflightV2Ready =
    productionActivationSequencePreflightV2Present &&
    productionActivationSequencePreflightV2FreshAfterP44 &&
    productionActivationSequencePreflightV2Blockers === 0 &&
    (productionActivationSequencePreflightV2State === 'waiting_for_exact_approval_validation' ||
      productionActivationSequencePreflightV2State === 'production_activation_sequence_preflight_ready') &&
    !productionActivationSequencePreflightV2ReadyForApply &&
    !productionActivationSequencePreflightV2MayModifyProductionAppFiles &&
    !b(productionActivationSequencePreflightV2, 'activationApproved') &&
    productionActivationSequencePreflightV2FixtureProbes > 0 &&
    productionActivationSequencePreflightV2FixtureProbesPassed === productionActivationSequencePreflightV2FixtureProbes;
  const productionApplyTransactionContractV2Blockers = n(productionApplyTransactionContractV2, 'blockers');
  const productionApplyTransactionContractV2Warnings = n(productionApplyTransactionContractV2, 'warnings');
  const productionApplyTransactionContractV2Present =
    s(productionApplyTransactionContractV2, 'transactionState') !== '' ||
    b(productionApplyTransactionContractV2, 'readyForProductionApplyTransaction');
  const productionApplyTransactionContractV2State = s(productionApplyTransactionContractV2, 'transactionState');
  const productionApplyTransactionContractV2ReadyForProductionApplyTransaction = b(productionApplyTransactionContractV2, 'readyForProductionApplyTransaction');
  const productionApplyTransactionContractV2ServerManifestEntries = n(productionApplyTransactionContractV2, 'serverManifestEntries');
  const productionApplyTransactionContractV2PayloadFilesChecked = n(productionApplyTransactionContractV2, 'payloadFilesChecked');
  const productionApplyTransactionContractV2IndexFilesChecked = n(productionApplyTransactionContractV2, 'indexFilesChecked');
  const productionApplyTransactionContractV2SliceManifestFilesChecked = n(productionApplyTransactionContractV2, 'sliceManifestFilesChecked');
  const productionApplyTransactionContractV2ShaMismatches = n(productionApplyTransactionContractV2, 'shaMismatches');
  const productionApplyTransactionContractV2MissingEntryFiles = n(productionApplyTransactionContractV2, 'missingEntryFiles');
  const productionApplyTransactionContractV2P49RequirementsProved = n(productionApplyTransactionContractV2, 'p49RequirementsProved');
  const productionApplyTransactionContractV2P49RequirementsProductionLocked = n(productionApplyTransactionContractV2, 'p49RequirementsProductionLocked');
  const productionApplyTransactionContractV2P49RequirementsMissing = n(productionApplyTransactionContractV2, 'p49RequirementsMissing');
  const productionApplyTransactionContractV2P49RequirementsContradicted = n(productionApplyTransactionContractV2, 'p49RequirementsContradicted');
  const productionApplyTransactionContractV2FinalHashLocks = n(productionApplyTransactionContractV2, 'finalHashLocks');
  const productionApplyTransactionContractV2P50MissingCriticalArtifacts = n(productionApplyTransactionContractV2, 'p50MissingCriticalArtifacts');
  const productionApplyTransactionContractV2P50RuntimeDeliveryEvidenceChainReady = b(productionApplyTransactionContractV2, 'p50RuntimeDeliveryEvidenceChainReady');
  const productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainReady = b(productionApplyTransactionContractV2, 'runtimeDeliveryEvidenceChainReady');
  const productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries = n(productionApplyTransactionContractV2, 'runtimeDeliveryEvidenceChainPublishManifestEntries');
  const productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainActualShaEntries = n(productionApplyTransactionContractV2, 'runtimeDeliveryEvidenceChainActualShaEntries');
  const productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainRollbackContracts = n(productionApplyTransactionContractV2, 'runtimeDeliveryEvidenceChainRollbackContracts');
  const productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects = n(productionApplyTransactionContractV2, 'runtimeDeliveryEvidenceChainSourceLocaleRejects');
  const productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects = n(productionApplyTransactionContractV2, 'runtimeDeliveryEvidenceChainStudyTargetRejects');
  const productionApplyTransactionContractV2FixtureProbesPassed = n(productionApplyTransactionContractV2, 'fixtureProbesPassed');
  const productionApplyTransactionContractV2FixtureProbes = n(productionApplyTransactionContractV2, 'fixtureProbes');
  const productionApplyTransactionContractV2ReadyForApply = b(productionApplyTransactionContractV2, 'readyForApply');
  const productionApplyTransactionContractV2MayModifyProductionAppFiles = b(productionApplyTransactionContractV2, 'mayModifyProductionAppFiles');
  const productionApplyTransactionContractV2P45ClosedStateEquivalent =
    productionActivationSequencePreflightV2Present &&
    productionActivationSequencePreflightV2State === 'waiting_for_exact_approval_validation' &&
    !productionActivationSequencePreflightV2ReadyForProductionActivationSequence &&
    s(productionApplyTransactionContractV2, 'p45Status') === 'HOLD' &&
    s(productionApplyTransactionContractV2, 'p45PreflightState') === productionActivationSequencePreflightV2State &&
    !b(productionApplyTransactionContractV2, 'p45ReadyForProductionActivationSequence') &&
    !b(productionActivationSequencePreflightV2, 'activationApproved') &&
    !productionActivationSequencePreflightV2ReadyForApply &&
    !productionActivationSequencePreflightV2MayModifyProductionAppFiles;
  const productionApplyTransactionContractV2FreshAfterP45 =
    (fileMtimeMs(productionApplyTransactionContractV2Path) >= fileMtimeMs(productionActivationSequencePreflightV2Path) &&
      fileMtimeMs(productionActivationSequencePreflightV2Path) > 0) ||
    productionApplyTransactionContractV2P45ClosedStateEquivalent;
  const productionApplyTransactionContractV2Ready =
    productionApplyTransactionContractV2Present &&
    productionApplyTransactionContractV2FreshAfterP45 &&
    productionApplyTransactionContractV2Blockers === 0 &&
    (productionApplyTransactionContractV2State === 'waiting_for_activation_sequence_preflight' ||
      productionApplyTransactionContractV2State === 'production_apply_transaction_contract_ready') &&
    productionApplyTransactionContractV2ServerManifestEntries === 12 &&
    productionApplyTransactionContractV2PayloadFilesChecked === 12 &&
    productionApplyTransactionContractV2IndexFilesChecked === 12 &&
    productionApplyTransactionContractV2SliceManifestFilesChecked === 12 &&
    productionApplyTransactionContractV2ShaMismatches === 0 &&
    productionApplyTransactionContractV2MissingEntryFiles === 0 &&
    productionApplyTransactionContractV2P49RequirementsProved + productionApplyTransactionContractV2P49RequirementsProductionLocked >= 16 &&
    (
      productionApplyTransactionContractV2P49RequirementsProductionLocked > 0 ||
      (
        productionApplyTransactionContractV2P49RequirementsProved >= 22 &&
        productionApplyTransactionContractV2P49RequirementsProductionLocked === 0
      )
    ) &&
    productionApplyTransactionContractV2P49RequirementsMissing === 0 &&
    productionApplyTransactionContractV2P49RequirementsContradicted === 0 &&
    productionApplyTransactionContractV2FinalHashLocks >= EXPECTED_FINAL_PREAPPROVAL_HASH_LOCKS_V2 &&
    productionApplyTransactionContractV2P50MissingCriticalArtifacts === 0 &&
    productionApplyTransactionContractV2P50RuntimeDeliveryEvidenceChainReady &&
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainReady &&
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries === 12 &&
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainActualShaEntries === 12 &&
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainRollbackContracts === 12 &&
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects === 12 &&
    productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects === 12 &&
    !productionApplyTransactionContractV2ReadyForApply &&
    !productionApplyTransactionContractV2MayModifyProductionAppFiles &&
    !b(productionApplyTransactionContractV2, 'activationApproved') &&
    productionApplyTransactionContractV2FixtureProbes > 0 &&
    productionApplyTransactionContractV2FixtureProbesPassed === productionApplyTransactionContractV2FixtureProbes;
  const postApplyRollbackGuardContractV2Blockers = n(postApplyRollbackGuardContractV2, 'blockers');
  const postApplyRollbackGuardContractV2Warnings = n(postApplyRollbackGuardContractV2, 'warnings');
  const postApplyRollbackGuardContractV2Present =
    s(postApplyRollbackGuardContractV2, 'guardState') !== '' ||
    b(postApplyRollbackGuardContractV2, 'readyForPostApplyRollbackGuard');
  const postApplyRollbackGuardContractV2State = s(postApplyRollbackGuardContractV2, 'guardState');
  const postApplyRollbackGuardContractV2ReadyForPostApplyRollbackGuard = b(postApplyRollbackGuardContractV2, 'readyForPostApplyRollbackGuard');
  const postApplyRollbackGuardContractV2RuntimeCacheContracts = n(postApplyRollbackGuardContractV2, 'runtimeCacheContracts');
  const postApplyRollbackGuardContractV2RuntimeCacheRollbackContracts = n(postApplyRollbackGuardContractV2, 'runtimeCacheRollbackContracts');
  const postApplyRollbackGuardContractV2LanguagePromptContracts = n(postApplyRollbackGuardContractV2, 'languagePromptContracts');
  const postApplyRollbackGuardContractV2LanguagePromptEntrypointsExpected = n(postApplyRollbackGuardContractV2, 'languagePromptEntrypointsExpected');
  const postApplyRollbackGuardContractV2PostApplyGuardSteps = n(postApplyRollbackGuardContractV2, 'postApplyGuardSteps');
  const postApplyRollbackGuardContractV2RollbackGuardSteps = n(postApplyRollbackGuardContractV2, 'rollbackGuardSteps');
  const postApplyRollbackGuardContractV2P49RequirementsProved = n(postApplyRollbackGuardContractV2, 'p49RequirementsProved');
  const postApplyRollbackGuardContractV2P49RequirementsProductionLocked = n(postApplyRollbackGuardContractV2, 'p49RequirementsProductionLocked');
  const postApplyRollbackGuardContractV2P49RequirementsMissing = n(postApplyRollbackGuardContractV2, 'p49RequirementsMissing');
  const postApplyRollbackGuardContractV2P49RequirementsContradicted = n(postApplyRollbackGuardContractV2, 'p49RequirementsContradicted');
  const postApplyRollbackGuardContractV2FinalHashLocks = n(postApplyRollbackGuardContractV2, 'finalHashLocks');
  const postApplyRollbackGuardContractV2P50MissingCriticalArtifacts = n(postApplyRollbackGuardContractV2, 'p50MissingCriticalArtifacts');
  const postApplyRollbackGuardContractV2P50RuntimeDeliveryEvidenceChainReady = b(postApplyRollbackGuardContractV2, 'p50RuntimeDeliveryEvidenceChainReady');
  const postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainReady = b(postApplyRollbackGuardContractV2, 'runtimeDeliveryEvidenceChainReady');
  const postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries = n(postApplyRollbackGuardContractV2, 'runtimeDeliveryEvidenceChainPublishManifestEntries');
  const postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainActualShaEntries = n(postApplyRollbackGuardContractV2, 'runtimeDeliveryEvidenceChainActualShaEntries');
  const postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainRollbackContracts = n(postApplyRollbackGuardContractV2, 'runtimeDeliveryEvidenceChainRollbackContracts');
  const postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects = n(postApplyRollbackGuardContractV2, 'runtimeDeliveryEvidenceChainSourceLocaleRejects');
  const postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects = n(postApplyRollbackGuardContractV2, 'runtimeDeliveryEvidenceChainStudyTargetRejects');
  const postApplyRollbackGuardContractV2FixtureProbesPassed = n(postApplyRollbackGuardContractV2, 'fixtureProbesPassed');
  const postApplyRollbackGuardContractV2FixtureProbes = n(postApplyRollbackGuardContractV2, 'fixtureProbes');
  const postApplyRollbackGuardContractV2ReadyForApply = b(postApplyRollbackGuardContractV2, 'readyForApply');
  const postApplyRollbackGuardContractV2MayModifyProductionAppFiles = b(postApplyRollbackGuardContractV2, 'mayModifyProductionAppFiles');
  const postApplyRollbackGuardContractV2FreshAfterP46 =
    fileMtimeMs(postApplyRollbackGuardContractV2Path) >= fileMtimeMs(productionApplyTransactionContractV2Path) &&
    fileMtimeMs(productionApplyTransactionContractV2Path) > 0;
  const postApplyRollbackGuardContractV2Ready =
    postApplyRollbackGuardContractV2Present &&
    postApplyRollbackGuardContractV2FreshAfterP46 &&
    postApplyRollbackGuardContractV2Blockers === 0 &&
    (postApplyRollbackGuardContractV2State === 'waiting_for_apply_transaction_contract' ||
      postApplyRollbackGuardContractV2State === 'post_apply_rollback_guard_contract_ready') &&
    postApplyRollbackGuardContractV2RuntimeCacheContracts === 12 &&
    postApplyRollbackGuardContractV2RuntimeCacheRollbackContracts === 12 &&
    postApplyRollbackGuardContractV2LanguagePromptEntrypointsExpected > 0 &&
    postApplyRollbackGuardContractV2LanguagePromptContracts === postApplyRollbackGuardContractV2LanguagePromptEntrypointsExpected &&
    postApplyRollbackGuardContractV2PostApplyGuardSteps > 0 &&
    postApplyRollbackGuardContractV2RollbackGuardSteps > 0 &&
    postApplyRollbackGuardContractV2P49RequirementsProved + postApplyRollbackGuardContractV2P49RequirementsProductionLocked >= 16 &&
    (
      postApplyRollbackGuardContractV2P49RequirementsProductionLocked > 0 ||
      (
        postApplyRollbackGuardContractV2P49RequirementsProved >= 22 &&
        postApplyRollbackGuardContractV2P49RequirementsProductionLocked === 0
      )
    ) &&
    postApplyRollbackGuardContractV2P49RequirementsMissing === 0 &&
    postApplyRollbackGuardContractV2P49RequirementsContradicted === 0 &&
    postApplyRollbackGuardContractV2FinalHashLocks >= EXPECTED_FINAL_PREAPPROVAL_HASH_LOCKS_V2 &&
    postApplyRollbackGuardContractV2P50MissingCriticalArtifacts === 0 &&
    postApplyRollbackGuardContractV2P50RuntimeDeliveryEvidenceChainReady &&
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainReady &&
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries === 12 &&
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainActualShaEntries === 12 &&
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainRollbackContracts === 12 &&
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects === 12 &&
    postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects === 12 &&
    !postApplyRollbackGuardContractV2ReadyForApply &&
    !postApplyRollbackGuardContractV2MayModifyProductionAppFiles &&
    !b(postApplyRollbackGuardContractV2, 'activationApproved') &&
    postApplyRollbackGuardContractV2FixtureProbes > 0 &&
    postApplyRollbackGuardContractV2FixtureProbesPassed === postApplyRollbackGuardContractV2FixtureProbes;
  const approvalWaitSafeContinuationV2Blockers = n(approvalWaitSafeContinuationV2, 'blockers');
  const approvalWaitSafeContinuationV2Warnings = n(approvalWaitSafeContinuationV2, 'warnings');
  const approvalWaitSafeContinuationV2Present =
    s(approvalWaitSafeContinuationV2, 'continuationState') !== '' ||
    b(approvalWaitSafeContinuationV2, 'readyForNextSafePass');
  const approvalWaitSafeContinuationV2State = s(approvalWaitSafeContinuationV2, 'continuationState');
  const approvalWaitSafeContinuationV2ReadyForNextSafePass = b(approvalWaitSafeContinuationV2, 'readyForNextSafePass');
  const approvalWaitSafeContinuationV2SafeWorkItems = n(approvalWaitSafeContinuationV2, 'safeContinuationWorkItems');
  const approvalWaitSafeContinuationV2ProductionLockedItems = n(approvalWaitSafeContinuationV2, 'remainingProductionLockedItems');
  const approvalWaitSafeContinuationV2LegacyReviewResidueMatches = n(approvalWaitSafeContinuationV2, 'legacyReviewResidueMatches');
  const approvalWaitSafeContinuationV2FixtureProbesPassed = n(approvalWaitSafeContinuationV2, 'fixtureProbesPassed');
  const approvalWaitSafeContinuationV2FixtureProbes = n(approvalWaitSafeContinuationV2, 'fixtureProbes');
  const approvalWaitSafeContinuationV2ReadyForApply = b(approvalWaitSafeContinuationV2, 'readyForApply');
  const approvalWaitSafeContinuationV2MayModifyProductionAppFiles = b(approvalWaitSafeContinuationV2, 'mayModifyProductionAppFiles');
  const approvalWaitSafeContinuationV2FreshAfterP47 =
    fileMtimeMs(approvalWaitSafeContinuationV2Path) >= fileMtimeMs(postApplyRollbackGuardContractV2Path) &&
    fileMtimeMs(postApplyRollbackGuardContractV2Path) > 0;
  const approvalWaitSafeContinuationV2Ready =
    approvalWaitSafeContinuationV2Present &&
    approvalWaitSafeContinuationV2FreshAfterP47 &&
    approvalWaitSafeContinuationV2Blockers === 0 &&
    approvalWaitSafeContinuationV2State === 'approval_wait_safe_continuation_ready' &&
    approvalWaitSafeContinuationV2ReadyForNextSafePass &&
    approvalWaitSafeContinuationV2SafeWorkItems > 0 &&
    approvalWaitSafeContinuationV2ProductionLockedItems > 0 &&
    approvalWaitSafeContinuationV2LegacyReviewResidueMatches === 0 &&
    !approvalWaitSafeContinuationV2ReadyForApply &&
    !approvalWaitSafeContinuationV2MayModifyProductionAppFiles &&
    !b(approvalWaitSafeContinuationV2, 'activationApproved') &&
    approvalWaitSafeContinuationV2FixtureProbes > 0 &&
    approvalWaitSafeContinuationV2FixtureProbesPassed === approvalWaitSafeContinuationV2FixtureProbes;
  const productionReadinessCompletionAuditV2Blockers = n(productionReadinessCompletionAuditV2, 'blockers');
  const productionReadinessCompletionAuditV2Warnings = n(productionReadinessCompletionAuditV2, 'warnings');
  const productionReadinessCompletionAuditV2Present =
    s(productionReadinessCompletionAuditV2, 'completionState') !== '' ||
    b(productionReadinessCompletionAuditV2, 'closedModeEvidenceComplete');
  const productionReadinessCompletionAuditV2State = s(productionReadinessCompletionAuditV2, 'completionState');
  const productionReadinessCompletionAuditV2RequirementsProved = n(productionReadinessCompletionAuditV2, 'requirementsProved');
  const productionReadinessCompletionAuditV2RequirementsProductionLocked = n(productionReadinessCompletionAuditV2, 'requirementsProductionLocked');
  const productionReadinessCompletionAuditV2RequirementsMissing = n(productionReadinessCompletionAuditV2, 'requirementsMissing');
  const productionReadinessCompletionAuditV2RequirementsContradicted = n(productionReadinessCompletionAuditV2, 'requirementsContradicted');
  const productionReadinessCompletionAuditV2ClosedModeEvidenceComplete = b(productionReadinessCompletionAuditV2, 'closedModeEvidenceComplete');
  const productionReadinessCompletionAuditV2RequirementsClosed =
    productionReadinessCompletionAuditV2RequirementsProved + productionReadinessCompletionAuditV2RequirementsProductionLocked;
  const productionReadinessCompletionAuditV2FixtureProbesPassed = n(productionReadinessCompletionAuditV2, 'fixtureProbesPassed');
  const productionReadinessCompletionAuditV2FixtureProbes = n(productionReadinessCompletionAuditV2, 'fixtureProbes');
  const productionReadinessCompletionAuditV2ReadyForApply = b(productionReadinessCompletionAuditV2, 'readyForApply');
  const productionReadinessCompletionAuditV2MayModifyProductionAppFiles = b(productionReadinessCompletionAuditV2, 'mayModifyProductionAppFiles');
  const productionReadinessCompletionAuditV2FreshAfterP48 =
    fileMtimeMs(productionReadinessCompletionAuditV2Path) >= fileMtimeMs(approvalWaitSafeContinuationV2Path) &&
    fileMtimeMs(approvalWaitSafeContinuationV2Path) > 0;
  const productionReadinessCompletionAuditV2FreshOrClosedWaitCycle =
    productionReadinessCompletionAuditV2FreshAfterP48 ||
    (
      approvalWaitSafeContinuationV2Ready &&
      productionReadinessCompletionAuditV2Blockers === 0 &&
      productionReadinessCompletionAuditV2State === 'closed_mode_evidence_complete_production_locked' &&
      productionReadinessCompletionAuditV2ClosedModeEvidenceComplete &&
      productionReadinessCompletionAuditV2RequirementsClosed >= 16 &&
      productionReadinessCompletionAuditV2RequirementsMissing === 0 &&
      productionReadinessCompletionAuditV2RequirementsContradicted === 0 &&
      !productionReadinessCompletionAuditV2ReadyForApply &&
      !productionReadinessCompletionAuditV2MayModifyProductionAppFiles &&
      !b(productionReadinessCompletionAuditV2, 'activationApproved') &&
      productionReadinessCompletionAuditV2FixtureProbes > 0 &&
      productionReadinessCompletionAuditV2FixtureProbesPassed === productionReadinessCompletionAuditV2FixtureProbes
    );
  const productionReadinessCompletionAuditV2Activated =
    productionReadinessCompletionAuditV2Blockers === 0 &&
    productionReadinessCompletionAuditV2State === 'production_ready_activated' &&
    productionReadinessCompletionAuditV2ClosedModeEvidenceComplete &&
    productionReadinessCompletionAuditV2RequirementsProved >= 22 &&
    productionReadinessCompletionAuditV2RequirementsProductionLocked === 0 &&
    productionReadinessCompletionAuditV2RequirementsMissing === 0 &&
    productionReadinessCompletionAuditV2RequirementsContradicted === 0 &&
    b(productionReadinessCompletionAuditV2, 'activationApproved') &&
    !productionReadinessCompletionAuditV2ReadyForApply &&
    !productionReadinessCompletionAuditV2MayModifyProductionAppFiles &&
    productionReadinessCompletionAuditV2FixtureProbes > 0 &&
    productionReadinessCompletionAuditV2FixtureProbesPassed === productionReadinessCompletionAuditV2FixtureProbes;
  const productionReadinessCompletionAuditV2PostApprovalLockedReady =
    productionReadinessCompletionAuditV2Blockers === 0 &&
    productionReadinessCompletionAuditV2State === 'closed_mode_evidence_complete_production_locked' &&
    productionReadinessCompletionAuditV2ClosedModeEvidenceComplete &&
    productionReadinessCompletionAuditV2RequirementsProved >= 22 &&
    productionReadinessCompletionAuditV2RequirementsProductionLocked === 0 &&
    productionReadinessCompletionAuditV2RequirementsMissing === 0 &&
    productionReadinessCompletionAuditV2RequirementsContradicted === 0 &&
    b(productionReadinessCompletionAuditV2, 'activationApproved') &&
    !productionReadinessCompletionAuditV2ReadyForApply &&
    !productionReadinessCompletionAuditV2MayModifyProductionAppFiles &&
    !b(productionReadinessCompletionAuditV2, 'canStartProductionApply') &&
    !b(productionReadinessCompletionAuditV2, 'runtimeDownloadsEnabled') &&
    productionReadinessCompletionAuditV2FixtureProbes > 0 &&
    productionReadinessCompletionAuditV2FixtureProbesPassed === productionReadinessCompletionAuditV2FixtureProbes;
  const productionReadinessCompletionAuditV2Ready =
    productionReadinessCompletionAuditV2Present &&
    (
      productionReadinessCompletionAuditV2Activated ||
      productionReadinessCompletionAuditV2PostApprovalLockedReady ||
      (
        productionReadinessCompletionAuditV2FreshOrClosedWaitCycle &&
        productionReadinessCompletionAuditV2Blockers === 0 &&
        productionReadinessCompletionAuditV2State === 'closed_mode_evidence_complete_production_locked' &&
        productionReadinessCompletionAuditV2ClosedModeEvidenceComplete &&
        productionReadinessCompletionAuditV2RequirementsClosed >= 16 &&
        productionReadinessCompletionAuditV2RequirementsMissing === 0 &&
        productionReadinessCompletionAuditV2RequirementsContradicted === 0 &&
        !productionReadinessCompletionAuditV2ReadyForApply &&
        !productionReadinessCompletionAuditV2MayModifyProductionAppFiles &&
        !b(productionReadinessCompletionAuditV2, 'activationApproved') &&
        productionReadinessCompletionAuditV2FixtureProbes > 0 &&
        productionReadinessCompletionAuditV2FixtureProbesPassed === productionReadinessCompletionAuditV2FixtureProbes
      )
    );
  const finalPreapprovalEvidenceHashLockV2Blockers = n(finalPreapprovalEvidenceHashLockV2, 'blockers');
  const finalPreapprovalEvidenceHashLockV2Warnings = n(finalPreapprovalEvidenceHashLockV2, 'warnings');
  const finalPreapprovalEvidenceHashLockV2Present =
    s(finalPreapprovalEvidenceHashLockV2, 'lockState') !== '' ||
    b(finalPreapprovalEvidenceHashLockV2, 'readyForExplicitApprovalReceiptCreationGateV2');
  const finalPreapprovalEvidenceHashLockV2State = s(finalPreapprovalEvidenceHashLockV2, 'lockState');
  const finalPreapprovalEvidenceHashLockV2FinalHashLocks = n(finalPreapprovalEvidenceHashLockV2, 'finalHashLocks');
  const finalPreapprovalEvidenceHashLockV2MissingCriticalArtifacts = n(finalPreapprovalEvidenceHashLockV2, 'missingCriticalArtifacts');
  const finalPreapprovalEvidenceHashLockV2MissingRequiredRoleLocks = n(finalPreapprovalEvidenceHashLockV2, 'missingRequiredRoleLocks');
  const finalPreapprovalEvidenceHashLockV2P30IncludesFinalHashLock = b(finalPreapprovalEvidenceHashLockV2, 'p30IncludesFinalHashLock');
  const finalPreapprovalEvidenceHashLockV2P43P49ChainReady = b(finalPreapprovalEvidenceHashLockV2, 'p43P49ChainReady');
  const finalPreapprovalEvidenceHashLockV2P49CompletionReady = b(finalPreapprovalEvidenceHashLockV2, 'p49CompletionReady');
  const finalPreapprovalEvidenceHashLockV2RuntimeDeliveryEvidenceChainReady = b(finalPreapprovalEvidenceHashLockV2, 'runtimeDeliveryEvidenceChainReady');
  const finalPreapprovalEvidenceHashLockV2FixtureProbesPassed = n(finalPreapprovalEvidenceHashLockV2, 'fixtureProbesPassed');
  const finalPreapprovalEvidenceHashLockV2FixtureProbes = n(finalPreapprovalEvidenceHashLockV2, 'fixtureProbes');
  const finalPreapprovalEvidenceHashLockV2ReadyForApply = b(finalPreapprovalEvidenceHashLockV2, 'readyForApply');
  const finalPreapprovalEvidenceHashLockV2MayModifyProductionAppFiles = b(finalPreapprovalEvidenceHashLockV2, 'mayModifyProductionAppFiles');
  const finalPreapprovalEvidenceHashLockV2FreshAfterP49 =
    fileMtimeMs(finalPreapprovalEvidenceHashLockV2Path) >= fileMtimeMs(productionReadinessCompletionAuditV2Path) &&
    fileMtimeMs(productionReadinessCompletionAuditV2Path) > 0;
  const finalPreapprovalEvidenceHashLockV2P49Equivalent =
    productionReadinessCompletionAuditV2Ready &&
    productionReadinessCompletionAuditV2State === 'closed_mode_evidence_complete_production_locked' &&
    !productionReadinessCompletionAuditV2ReadyForApply &&
    !productionReadinessCompletionAuditV2MayModifyProductionAppFiles &&
    !b(productionReadinessCompletionAuditV2, 'activationApproved') &&
    finalPreapprovalEvidenceHashLockV2P49CompletionReady;
  const finalPreapprovalEvidenceHashLockV2Ready =
    finalPreapprovalEvidenceHashLockV2Present &&
    (finalPreapprovalEvidenceHashLockV2FreshAfterP49 || finalPreapprovalEvidenceHashLockV2P49Equivalent) &&
    finalPreapprovalEvidenceHashLockV2Blockers === 0 &&
    finalPreapprovalEvidenceHashLockV2State === 'final_preapproval_evidence_hash_lock_ready' &&
    finalPreapprovalEvidenceHashLockV2FinalHashLocks >= EXPECTED_FINAL_PREAPPROVAL_HASH_LOCKS_V2 &&
    finalPreapprovalEvidenceHashLockV2MissingCriticalArtifacts === 0 &&
    finalPreapprovalEvidenceHashLockV2MissingRequiredRoleLocks === 0 &&
    finalPreapprovalEvidenceHashLockV2P30IncludesFinalHashLock &&
    finalPreapprovalEvidenceHashLockV2P43P49ChainReady &&
    finalPreapprovalEvidenceHashLockV2P49CompletionReady &&
    finalPreapprovalEvidenceHashLockV2RuntimeDeliveryEvidenceChainReady &&
    !finalPreapprovalEvidenceHashLockV2ReadyForApply &&
    !finalPreapprovalEvidenceHashLockV2MayModifyProductionAppFiles &&
    !b(finalPreapprovalEvidenceHashLockV2, 'activationApproved') &&
    finalPreapprovalEvidenceHashLockV2FixtureProbes > 0 &&
    finalPreapprovalEvidenceHashLockV2FixtureProbesPassed === finalPreapprovalEvidenceHashLockV2FixtureProbes;
  const exactApprovalApplyRehearsalV2Blockers = n(exactApprovalApplyRehearsalV2, 'blockers');
  const exactApprovalApplyRehearsalV2Warnings = n(exactApprovalApplyRehearsalV2, 'warnings');
  const exactApprovalApplyRehearsalV2Present =
    s(exactApprovalApplyRehearsalV2, 'rehearsalState') !== '' ||
    b(exactApprovalApplyRehearsalV2, 'requiredApprovalSentencePresent');
  const exactApprovalApplyRehearsalV2State = s(exactApprovalApplyRehearsalV2, 'rehearsalState');
  const exactApprovalApplyRehearsalV2ReadinessApplyBlockers = n(exactApprovalApplyRehearsalV2, 'readinessApplyBlockers');
  const exactApprovalApplyRehearsalV2ActiveApprovalReceiptExists = b(exactApprovalApplyRehearsalV2, 'activeApprovalReceiptExists');
  const exactApprovalApplyRehearsalV2ActiveHashLockExists = b(exactApprovalApplyRehearsalV2, 'activeHashLockExists');
  const exactApprovalApplyRehearsalV2MainHashLockDryRunPresent = b(exactApprovalApplyRehearsalV2, 'mainHashLockDryRunPresent');
  const exactApprovalApplyRehearsalV2FinalHashLockDryRunPresent = b(exactApprovalApplyRehearsalV2, 'finalHashLockDryRunPresent');
  const exactApprovalApplyRehearsalV2WouldCreateActiveArtifactsNow = b(exactApprovalApplyRehearsalV2, 'wouldCreateActiveArtifactsNow');
  const exactApprovalApplyRehearsalV2FixtureProbesPassed = n(exactApprovalApplyRehearsalV2, 'fixtureProbesPassed');
  const exactApprovalApplyRehearsalV2FixtureProbes = n(exactApprovalApplyRehearsalV2, 'fixtureProbes');
  const exactApprovalApplyRehearsalV2ReadyForApply = b(exactApprovalApplyRehearsalV2, 'readyForApply');
  const exactApprovalApplyRehearsalV2MayModifyProductionAppFiles = b(exactApprovalApplyRehearsalV2, 'mayModifyProductionAppFiles');
  const exactApprovalApplyRehearsalV2FreshAfterP50 =
    fileMtimeMs(exactApprovalApplyRehearsalV2Path) >= fileMtimeMs(finalPreapprovalEvidenceHashLockV2Path) &&
    fileMtimeMs(finalPreapprovalEvidenceHashLockV2Path) > 0;
  const exactApprovalApplyRehearsalV2Ready =
    exactApprovalApplyRehearsalV2Present &&
    exactApprovalApplyRehearsalV2FreshAfterP50 &&
    exactApprovalApplyRehearsalV2Blockers === 0 &&
    exactApprovalApplyRehearsalV2State === 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval' &&
    exactApprovalApplyRehearsalV2ReadinessApplyBlockers === 1 &&
    !exactApprovalApplyRehearsalV2ActiveApprovalReceiptExists &&
    !exactApprovalApplyRehearsalV2ActiveHashLockExists &&
    exactApprovalApplyRehearsalV2MainHashLockDryRunPresent &&
    exactApprovalApplyRehearsalV2FinalHashLockDryRunPresent &&
    !exactApprovalApplyRehearsalV2WouldCreateActiveArtifactsNow &&
    !exactApprovalApplyRehearsalV2ReadyForApply &&
    !exactApprovalApplyRehearsalV2MayModifyProductionAppFiles &&
    !b(exactApprovalApplyRehearsalV2, 'activationApproved') &&
    exactApprovalApplyRehearsalV2FixtureProbes > 0 &&
    exactApprovalApplyRehearsalV2FixtureProbesPassed === exactApprovalApplyRehearsalV2FixtureProbes;
  const exactApprovalSourceFirewallV2Blockers = n(exactApprovalSourceFirewallV2, 'blockers');
  const exactApprovalSourceFirewallV2Warnings = n(exactApprovalSourceFirewallV2, 'warnings');
  const exactApprovalSourceFirewallV2Present =
    s(exactApprovalSourceFirewallV2, 'firewallState') !== '' ||
    b(exactApprovalSourceFirewallV2, 'approvalSourceRequiredForActiveArtifacts');
  const exactApprovalSourceFirewallV2State = s(exactApprovalSourceFirewallV2, 'firewallState');
  const exactApprovalSourceFirewallV2ApprovalSourceExists = b(exactApprovalSourceFirewallV2, 'approvalSourceExists');
  const exactApprovalSourceFirewallV2ApprovalSourceContainsExactSentence = b(exactApprovalSourceFirewallV2, 'approvalSourceContainsExactSentence');
  const exactApprovalSourceFirewallV2PlainContinueWouldCreateActiveArtifacts = b(exactApprovalSourceFirewallV2, 'plainContinueWouldCreateActiveArtifacts');
  const exactApprovalSourceFirewallV2ActiveApprovalReceiptExists = b(exactApprovalSourceFirewallV2, 'activeApprovalReceiptExists');
  const exactApprovalSourceFirewallV2ActiveHashLockExists = b(exactApprovalSourceFirewallV2, 'activeHashLockExists');
  const exactApprovalSourceFirewallV2FixtureProbesPassed = n(exactApprovalSourceFirewallV2, 'fixtureProbesPassed');
  const exactApprovalSourceFirewallV2FixtureProbes = n(exactApprovalSourceFirewallV2, 'fixtureProbes');
  const exactApprovalSourceFirewallV2ReadyForApply = b(exactApprovalSourceFirewallV2, 'readyForApply');
  const exactApprovalSourceFirewallV2MayModifyProductionAppFiles = b(exactApprovalSourceFirewallV2, 'mayModifyProductionAppFiles');
  const exactApprovalSourceFirewallV2FreshAfterP51 =
    fileMtimeMs(exactApprovalSourceFirewallV2Path) >= fileMtimeMs(exactApprovalApplyRehearsalV2Path) &&
    fileMtimeMs(exactApprovalApplyRehearsalV2Path) > 0;
  const exactApprovalSourceFirewallV2Ready =
    exactApprovalSourceFirewallV2Present &&
    exactApprovalSourceFirewallV2FreshAfterP51 &&
    exactApprovalSourceFirewallV2Blockers === 0 &&
    (exactApprovalSourceFirewallV2State === 'exact_approval_source_firewall_ready_waiting_for_approval_source' ||
      exactApprovalSourceFirewallV2State === 'exact_approval_source_present_p31_create_required') &&
    b(exactApprovalSourceFirewallV2, 'p51Ready') &&
    b(exactApprovalSourceFirewallV2, 'requiredApprovalSentencePresent') &&
    b(exactApprovalSourceFirewallV2, 'approvalSourceRequiredForActiveArtifacts') &&
    b(exactApprovalSourceFirewallV2, 'explicitCreateFlagRequiredForActiveArtifacts') &&
    !exactApprovalSourceFirewallV2PlainContinueWouldCreateActiveArtifacts &&
    !b(exactApprovalSourceFirewallV2, 'wouldCreateActiveArtifactsNow') &&
    !exactApprovalSourceFirewallV2ActiveApprovalReceiptExists &&
    !exactApprovalSourceFirewallV2ActiveHashLockExists &&
    !exactApprovalSourceFirewallV2ReadyForApply &&
    !exactApprovalSourceFirewallV2MayModifyProductionAppFiles &&
    !b(exactApprovalSourceFirewallV2, 'activationApproved') &&
    exactApprovalSourceFirewallV2FixtureProbes > 0 &&
    exactApprovalSourceFirewallV2FixtureProbesPassed === exactApprovalSourceFirewallV2FixtureProbes;
  const exactApprovalSourceIntakeTransitionV2Blockers = n(exactApprovalSourceIntakeTransitionV2, 'blockers');
  const exactApprovalSourceIntakeTransitionV2Warnings = n(exactApprovalSourceIntakeTransitionV2, 'warnings');
  const exactApprovalSourceIntakeTransitionV2Present =
    s(exactApprovalSourceIntakeTransitionV2, 'intakeTransitionState') !== '' ||
    b(exactApprovalSourceIntakeTransitionV2, 'approvalSourceRequiredForActiveArtifacts');
  const exactApprovalSourceIntakeTransitionV2State = s(exactApprovalSourceIntakeTransitionV2, 'intakeTransitionState');
  const exactApprovalSourceIntakeTransitionV2ApprovalSourceExists = b(exactApprovalSourceIntakeTransitionV2, 'approvalSourceExists');
  const exactApprovalSourceIntakeTransitionV2ApprovalSourceContainsExactSentence = b(exactApprovalSourceIntakeTransitionV2, 'approvalSourceContainsExactSentence');
  const exactApprovalSourceIntakeTransitionV2PlainContinueWouldCreateActiveArtifacts = b(exactApprovalSourceIntakeTransitionV2, 'plainContinueWouldCreateActiveArtifacts');
  const exactApprovalSourceIntakeTransitionV2WouldCreateActiveArtifactsByThisScript = b(exactApprovalSourceIntakeTransitionV2, 'wouldCreateActiveArtifactsByThisScript');
  const exactApprovalSourceIntakeTransitionV2ActiveApprovalReceiptExists = b(exactApprovalSourceIntakeTransitionV2, 'activeApprovalReceiptExists');
  const exactApprovalSourceIntakeTransitionV2ActiveHashLockExists = b(exactApprovalSourceIntakeTransitionV2, 'activeHashLockExists');
  const exactApprovalSourceIntakeTransitionV2SimulatedValidP31CreateWouldCreateBothArtifacts = b(exactApprovalSourceIntakeTransitionV2, 'simulatedValidP31CreateWouldCreateBothArtifacts');
  const exactApprovalSourceIntakeTransitionV2SimulatedP44WouldOpenReadyForApply = b(exactApprovalSourceIntakeTransitionV2, 'simulatedP44WouldOpenReadyForApply');
  const exactApprovalSourceIntakeTransitionV2FixtureProbesPassed = n(exactApprovalSourceIntakeTransitionV2, 'fixtureProbesPassed');
  const exactApprovalSourceIntakeTransitionV2FixtureProbes = n(exactApprovalSourceIntakeTransitionV2, 'fixtureProbes');
  const exactApprovalSourceIntakeTransitionV2ReadyForApply = b(exactApprovalSourceIntakeTransitionV2, 'readyForApply');
  const exactApprovalSourceIntakeTransitionV2MayModifyProductionAppFiles = b(exactApprovalSourceIntakeTransitionV2, 'mayModifyProductionAppFiles');
  const exactApprovalSourceIntakeTransitionV2FreshAfterP52 =
    fileMtimeMs(exactApprovalSourceIntakeTransitionV2Path) >= fileMtimeMs(exactApprovalSourceFirewallV2Path) &&
    fileMtimeMs(exactApprovalSourceFirewallV2Path) > 0;
  const exactApprovalSourceIntakeTransitionV2Ready =
    exactApprovalSourceIntakeTransitionV2Present &&
    exactApprovalSourceIntakeTransitionV2FreshAfterP52 &&
    exactApprovalSourceIntakeTransitionV2Blockers === 0 &&
    (exactApprovalSourceIntakeTransitionV2State === 'exact_approval_intake_transition_ready_waiting_for_approval_source' ||
      exactApprovalSourceIntakeTransitionV2State === 'exact_approval_source_present_p31_create_required') &&
    b(exactApprovalSourceIntakeTransitionV2, 'p52Ready') &&
    b(exactApprovalSourceIntakeTransitionV2, 'approvalSourceRequiredForActiveArtifacts') &&
    b(exactApprovalSourceIntakeTransitionV2, 'explicitP31CreateFlagRequiredForActiveArtifacts') &&
    !exactApprovalSourceIntakeTransitionV2PlainContinueWouldCreateActiveArtifacts &&
    !b(exactApprovalSourceIntakeTransitionV2, 'wouldCreateActiveArtifactsNow') &&
    !exactApprovalSourceIntakeTransitionV2WouldCreateActiveArtifactsByThisScript &&
    !exactApprovalSourceIntakeTransitionV2ActiveApprovalReceiptExists &&
    !exactApprovalSourceIntakeTransitionV2ActiveHashLockExists &&
    exactApprovalSourceIntakeTransitionV2SimulatedValidP31CreateWouldCreateBothArtifacts &&
    !exactApprovalSourceIntakeTransitionV2SimulatedP44WouldOpenReadyForApply &&
    !exactApprovalSourceIntakeTransitionV2ReadyForApply &&
    !exactApprovalSourceIntakeTransitionV2MayModifyProductionAppFiles &&
    !b(exactApprovalSourceIntakeTransitionV2, 'activationApproved') &&
    exactApprovalSourceIntakeTransitionV2FixtureProbes > 0 &&
    exactApprovalSourceIntakeTransitionV2FixtureProbesPassed === exactApprovalSourceIntakeTransitionV2FixtureProbes;
  const exactApprovalActiveArtifactPairSimulationV2Blockers = n(exactApprovalActiveArtifactPairSimulationV2, 'blockers');
  const exactApprovalActiveArtifactPairSimulationV2Warnings = n(exactApprovalActiveArtifactPairSimulationV2, 'warnings');
  const exactApprovalActiveArtifactPairSimulationV2Present =
    s(exactApprovalActiveArtifactPairSimulationV2, 'pairSimulationState') !== '' ||
    b(exactApprovalActiveArtifactPairSimulationV2, 'simulatedPairWouldPassP44AfterP31Create');
  const exactApprovalActiveArtifactPairSimulationV2State = s(exactApprovalActiveArtifactPairSimulationV2, 'pairSimulationState');
  const exactApprovalActiveArtifactPairSimulationV2ApprovalSourceExists = b(exactApprovalActiveArtifactPairSimulationV2, 'approvalSourceExists');
  const exactApprovalActiveArtifactPairSimulationV2ApprovalSourceContainsExactSentence = b(exactApprovalActiveArtifactPairSimulationV2, 'approvalSourceContainsExactSentence');
  const exactApprovalActiveArtifactPairSimulationV2ActiveApprovalReceiptExists = b(exactApprovalActiveArtifactPairSimulationV2, 'activeApprovalReceiptExists');
  const exactApprovalActiveArtifactPairSimulationV2ActiveHashLockExists = b(exactApprovalActiveArtifactPairSimulationV2, 'activeHashLockExists');
  const exactApprovalActiveArtifactPairSimulationV2SimulatedPairWouldPassP44AfterP31Create = b(exactApprovalActiveArtifactPairSimulationV2, 'simulatedPairWouldPassP44AfterP31Create');
  const exactApprovalActiveArtifactPairSimulationV2CurrentP44WouldOpenSequencing = b(exactApprovalActiveArtifactPairSimulationV2, 'currentP44WouldOpenSequencing');
  const exactApprovalActiveArtifactPairSimulationV2ReadyForP31CreateWhenExactSourcePresent = b(exactApprovalActiveArtifactPairSimulationV2, 'readyForP31CreateWhenExactSourcePresent');
  const exactApprovalActiveArtifactPairSimulationV2FixtureProbesPassed = n(exactApprovalActiveArtifactPairSimulationV2, 'fixtureProbesPassed');
  const exactApprovalActiveArtifactPairSimulationV2FixtureProbes = n(exactApprovalActiveArtifactPairSimulationV2, 'fixtureProbes');
  const exactApprovalActiveArtifactPairSimulationV2ReadyForApply = b(exactApprovalActiveArtifactPairSimulationV2, 'readyForApply');
  const exactApprovalActiveArtifactPairSimulationV2MayModifyProductionAppFiles = b(exactApprovalActiveArtifactPairSimulationV2, 'mayModifyProductionAppFiles');
  const exactApprovalActiveArtifactPairSimulationV2FreshAfterP53 =
    fileMtimeMs(exactApprovalActiveArtifactPairSimulationV2Path) >= fileMtimeMs(exactApprovalSourceIntakeTransitionV2Path) &&
    fileMtimeMs(exactApprovalSourceIntakeTransitionV2Path) > 0;
  const exactApprovalActiveArtifactPairSimulationV2Ready =
    exactApprovalActiveArtifactPairSimulationV2Present &&
    exactApprovalActiveArtifactPairSimulationV2FreshAfterP53 &&
    exactApprovalActiveArtifactPairSimulationV2Blockers === 0 &&
    (exactApprovalActiveArtifactPairSimulationV2State === 'active_artifact_pair_simulation_ready_waiting_for_exact_source' ||
      exactApprovalActiveArtifactPairSimulationV2State === 'active_artifact_pair_simulation_ready_for_p31_create') &&
    b(exactApprovalActiveArtifactPairSimulationV2, 'p53Ready') &&
    exactApprovalActiveArtifactPairSimulationV2SimulatedPairWouldPassP44AfterP31Create &&
    !exactApprovalActiveArtifactPairSimulationV2CurrentP44WouldOpenSequencing &&
    !exactApprovalActiveArtifactPairSimulationV2ActiveApprovalReceiptExists &&
    !exactApprovalActiveArtifactPairSimulationV2ActiveHashLockExists &&
    !b(exactApprovalActiveArtifactPairSimulationV2, 'activeApprovalReceiptCreatedByThisScript') &&
    !b(exactApprovalActiveArtifactPairSimulationV2, 'activeHashLockCreatedByThisScript') &&
    !exactApprovalActiveArtifactPairSimulationV2ReadyForApply &&
    !exactApprovalActiveArtifactPairSimulationV2MayModifyProductionAppFiles &&
    !b(exactApprovalActiveArtifactPairSimulationV2, 'activationApproved') &&
    exactApprovalActiveArtifactPairSimulationV2FixtureProbes > 0 &&
    exactApprovalActiveArtifactPairSimulationV2FixtureProbesPassed === exactApprovalActiveArtifactPairSimulationV2FixtureProbes;
  const exactApprovalP31CreateCommandPreflightV2Blockers = n(exactApprovalP31CreateCommandPreflightV2, 'blockers');
  const exactApprovalP31CreateCommandPreflightV2Warnings = n(exactApprovalP31CreateCommandPreflightV2, 'warnings');
  const exactApprovalP31CreateCommandPreflightV2Present =
    s(exactApprovalP31CreateCommandPreflightV2, 'preflightState') !== '' ||
    b(exactApprovalP31CreateCommandPreflightV2, 'p31CreateCommandAllowedWhenExactSourcePresent');
  const exactApprovalP31CreateCommandPreflightV2State = s(exactApprovalP31CreateCommandPreflightV2, 'preflightState');
  const exactApprovalP31CreateCommandPreflightV2ApprovalSourceExists = b(exactApprovalP31CreateCommandPreflightV2, 'approvalSourceExists');
  const exactApprovalP31CreateCommandPreflightV2ApprovalSourceContainsExactSentence = b(exactApprovalP31CreateCommandPreflightV2, 'approvalSourceContainsExactSentence');
  const exactApprovalP31CreateCommandPreflightV2ActiveApprovalReceiptExists = b(exactApprovalP31CreateCommandPreflightV2, 'activeApprovalReceiptExists');
  const exactApprovalP31CreateCommandPreflightV2ActiveHashLockExists = b(exactApprovalP31CreateCommandPreflightV2, 'activeHashLockExists');
  const exactApprovalP31CreateCommandPreflightV2CommandAllowedNow = b(exactApprovalP31CreateCommandPreflightV2, 'p31CreateCommandAllowedByPreflightNow');
  const exactApprovalP31CreateCommandPreflightV2CommandAllowedWhenExactSourcePresent = b(exactApprovalP31CreateCommandPreflightV2, 'p31CreateCommandAllowedWhenExactSourcePresent');
  const exactApprovalP31CreateCommandPreflightV2CommandExecutedByThisScript = b(exactApprovalP31CreateCommandPreflightV2, 'p31CreateCommandWouldExecuteByThisScript');
  const exactApprovalP31CreateCommandPreflightV2FixtureProbesPassed = n(exactApprovalP31CreateCommandPreflightV2, 'fixtureProbesPassed');
  const exactApprovalP31CreateCommandPreflightV2FixtureProbes = n(exactApprovalP31CreateCommandPreflightV2, 'fixtureProbes');
  const exactApprovalP31CreateCommandPreflightV2ReadyForApply = b(exactApprovalP31CreateCommandPreflightV2, 'readyForApply');
  const exactApprovalP31CreateCommandPreflightV2MayModifyProductionAppFiles = b(exactApprovalP31CreateCommandPreflightV2, 'mayModifyProductionAppFiles');
  const exactApprovalP31CreateCommandPreflightV2FreshAfterP54 =
    fileMtimeMs(exactApprovalP31CreateCommandPreflightV2Path) >= fileMtimeMs(exactApprovalActiveArtifactPairSimulationV2Path) &&
    fileMtimeMs(exactApprovalActiveArtifactPairSimulationV2Path) > 0;
  const exactApprovalP31CreateCommandPreflightV2Ready =
    exactApprovalP31CreateCommandPreflightV2Present &&
    exactApprovalP31CreateCommandPreflightV2FreshAfterP54 &&
    exactApprovalP31CreateCommandPreflightV2Blockers === 0 &&
    (exactApprovalP31CreateCommandPreflightV2State === 'p31_create_command_preflight_ready_waiting_for_exact_source' ||
      exactApprovalP31CreateCommandPreflightV2State === 'p31_create_command_preflight_ready_for_explicit_create_command') &&
    b(exactApprovalP31CreateCommandPreflightV2, 'p54Ready') &&
    b(exactApprovalP31CreateCommandPreflightV2, 'commandIncludesExplicitCreateFlag') &&
    b(exactApprovalP31CreateCommandPreflightV2, 'commandUsesDefaultApprovalSource') &&
    b(exactApprovalP31CreateCommandPreflightV2, 'commandTargetsFr') &&
    b(exactApprovalP31CreateCommandPreflightV2, 'commandRunPathMatchesCurrentRun') &&
    b(exactApprovalP31CreateCommandPreflightV2, 'commandWouldWriteOnlyReservedActivePaths') &&
    exactApprovalP31CreateCommandPreflightV2CommandAllowedWhenExactSourcePresent &&
    !exactApprovalP31CreateCommandPreflightV2CommandExecutedByThisScript &&
    !exactApprovalP31CreateCommandPreflightV2ActiveApprovalReceiptExists &&
    !exactApprovalP31CreateCommandPreflightV2ActiveHashLockExists &&
    !b(exactApprovalP31CreateCommandPreflightV2, 'activeApprovalReceiptCreatedByThisScript') &&
    !b(exactApprovalP31CreateCommandPreflightV2, 'activeHashLockCreatedByThisScript') &&
    !exactApprovalP31CreateCommandPreflightV2ReadyForApply &&
    !exactApprovalP31CreateCommandPreflightV2MayModifyProductionAppFiles &&
    !b(exactApprovalP31CreateCommandPreflightV2, 'activationApproved') &&
    exactApprovalP31CreateCommandPreflightV2FixtureProbes > 0 &&
    exactApprovalP31CreateCommandPreflightV2FixtureProbesPassed === exactApprovalP31CreateCommandPreflightV2FixtureProbes;
  const exactApprovalP44ValidationCommandPreflightV2Blockers = n(exactApprovalP44ValidationCommandPreflightV2, 'blockers');
  const exactApprovalP44ValidationCommandPreflightV2Warnings = n(exactApprovalP44ValidationCommandPreflightV2, 'warnings');
  const exactApprovalP44ValidationCommandPreflightV2Present =
    s(exactApprovalP44ValidationCommandPreflightV2, 'preflightState') !== '' ||
    b(exactApprovalP44ValidationCommandPreflightV2, 'p44ValidationCommandAllowedAfterP31Create');
  const exactApprovalP44ValidationCommandPreflightV2State = s(exactApprovalP44ValidationCommandPreflightV2, 'preflightState');
  const exactApprovalP44ValidationCommandPreflightV2ApprovalSourceExists = b(exactApprovalP44ValidationCommandPreflightV2, 'approvalSourceExists');
  const exactApprovalP44ValidationCommandPreflightV2ApprovalSourceContainsExactSentence = b(exactApprovalP44ValidationCommandPreflightV2, 'approvalSourceContainsExactSentence');
  const exactApprovalP44ValidationCommandPreflightV2ActiveApprovalReceiptExists = b(exactApprovalP44ValidationCommandPreflightV2, 'activeApprovalReceiptExists');
  const exactApprovalP44ValidationCommandPreflightV2ActiveHashLockExists = b(exactApprovalP44ValidationCommandPreflightV2, 'activeHashLockExists');
  const exactApprovalP44ValidationCommandPreflightV2CommandAllowedNow = b(exactApprovalP44ValidationCommandPreflightV2, 'p44ValidationCommandAllowedNow');
  const exactApprovalP44ValidationCommandPreflightV2CommandAllowedAfterP31Create = b(exactApprovalP44ValidationCommandPreflightV2, 'p44ValidationCommandAllowedAfterP31Create');
  const exactApprovalP44ValidationCommandPreflightV2CommandExecutedByThisScript = b(exactApprovalP44ValidationCommandPreflightV2, 'p44ValidationCommandWouldExecuteByThisScript');
  const exactApprovalP44ValidationCommandPreflightV2FixtureProbesPassed = n(exactApprovalP44ValidationCommandPreflightV2, 'fixtureProbesPassed');
  const exactApprovalP44ValidationCommandPreflightV2FixtureProbes = n(exactApprovalP44ValidationCommandPreflightV2, 'fixtureProbes');
  const exactApprovalP44ValidationCommandPreflightV2ReadyForApply = b(exactApprovalP44ValidationCommandPreflightV2, 'readyForApply');
  const exactApprovalP44ValidationCommandPreflightV2MayModifyProductionAppFiles = b(exactApprovalP44ValidationCommandPreflightV2, 'mayModifyProductionAppFiles');
  const exactApprovalP44ValidationCommandPreflightV2FreshAfterP55 =
    fileMtimeMs(exactApprovalP44ValidationCommandPreflightV2Path) >= fileMtimeMs(exactApprovalP31CreateCommandPreflightV2Path) &&
    fileMtimeMs(exactApprovalP31CreateCommandPreflightV2Path) > 0;
  const exactApprovalP44ValidationCommandPreflightV2P55Equivalent =
    exactApprovalP31CreateCommandPreflightV2Ready &&
    exactApprovalP31CreateCommandPreflightV2State === 'p31_create_command_preflight_ready_waiting_for_exact_source' &&
    !exactApprovalP31CreateCommandPreflightV2ReadyForApply &&
    !exactApprovalP31CreateCommandPreflightV2MayModifyProductionAppFiles &&
    !b(exactApprovalP31CreateCommandPreflightV2, 'activationApproved') &&
    exactApprovalP44ValidationCommandPreflightV2State === 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts';
  const exactApprovalP44ValidationCommandPreflightV2Ready =
    exactApprovalP44ValidationCommandPreflightV2Present &&
    (exactApprovalP44ValidationCommandPreflightV2FreshAfterP55 || exactApprovalP44ValidationCommandPreflightV2P55Equivalent) &&
    exactApprovalP44ValidationCommandPreflightV2Blockers === 0 &&
    (exactApprovalP44ValidationCommandPreflightV2State === 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts' ||
      exactApprovalP44ValidationCommandPreflightV2State === 'p44_validation_command_preflight_ready_for_validation_command') &&
    b(exactApprovalP44ValidationCommandPreflightV2, 'p55Ready') &&
    b(exactApprovalP44ValidationCommandPreflightV2, 'commandTargetsFr') &&
    b(exactApprovalP44ValidationCommandPreflightV2, 'commandRunPathMatchesCurrentRun') &&
    b(exactApprovalP44ValidationCommandPreflightV2, 'commandUsesDefaultApprovalSource') &&
    b(exactApprovalP44ValidationCommandPreflightV2, 'commandWouldOnlyValidateReservedActivePaths') &&
    exactApprovalP44ValidationCommandPreflightV2CommandAllowedAfterP31Create &&
    !exactApprovalP44ValidationCommandPreflightV2CommandExecutedByThisScript &&
    !exactApprovalP44ValidationCommandPreflightV2ReadyForApply &&
    !exactApprovalP44ValidationCommandPreflightV2MayModifyProductionAppFiles &&
    !b(exactApprovalP44ValidationCommandPreflightV2, 'activationApproved') &&
    !b(exactApprovalP44ValidationCommandPreflightV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP44ValidationCommandPreflightV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP44ValidationCommandPreflightV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP44ValidationCommandPreflightV2FixtureProbes > 0 &&
    exactApprovalP44ValidationCommandPreflightV2FixtureProbesPassed === exactApprovalP44ValidationCommandPreflightV2FixtureProbes;
  const exactApprovalP44ToP45SequenceHandoffSimulationV2Blockers = n(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'blockers');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2Warnings = n(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'warnings');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2Present =
    s(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'handoffState') !== '' ||
    b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'simulatedPostP44P45WouldOpenSequence');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2State = s(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'handoffState');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2P56Ready = b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'p56Ready');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2P44Status = s(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'p44Status');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2P44ValidationState = s(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'p44ValidationState');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2P45Status = s(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'p45Status');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2P45PreflightState = s(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'p45PreflightState');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2CurrentHandoffWouldOpenSequence = b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'currentP44ToP45HandoffWouldOpenSequence');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2SimulatedPostP44P45WouldOpenSequence = b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'simulatedPostP44P45WouldOpenSequence');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2CommandExecutedByThisScript = b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'p45SequenceCommandWouldExecuteByThisScript');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbesPassed = n(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'fixtureProbesPassed');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbes = n(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'fixtureProbes');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2ReadyForApply = b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'readyForApply');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2MayModifyProductionAppFiles = b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'mayModifyProductionAppFiles');
  const exactApprovalP44ToP45SequenceHandoffSimulationV2FreshAfterP56 =
    fileMtimeMs(exactApprovalP44ToP45SequenceHandoffSimulationV2Path) >= fileMtimeMs(exactApprovalP44ValidationCommandPreflightV2Path) &&
    fileMtimeMs(exactApprovalP44ValidationCommandPreflightV2Path) > 0;
  const exactApprovalP44ToP45SequenceHandoffSimulationV2Ready =
    exactApprovalP44ToP45SequenceHandoffSimulationV2Present &&
    exactApprovalP44ToP45SequenceHandoffSimulationV2FreshAfterP56 &&
    exactApprovalP44ToP45SequenceHandoffSimulationV2Blockers === 0 &&
    (exactApprovalP44ToP45SequenceHandoffSimulationV2State === 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation' ||
      exactApprovalP44ToP45SequenceHandoffSimulationV2State === 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation') &&
    exactApprovalP44ToP45SequenceHandoffSimulationV2P56Ready &&
    exactApprovalP44ToP45SequenceHandoffSimulationV2SimulatedPostP44P45WouldOpenSequence &&
    !exactApprovalP44ToP45SequenceHandoffSimulationV2CommandExecutedByThisScript &&
    !exactApprovalP44ToP45SequenceHandoffSimulationV2ReadyForApply &&
    !exactApprovalP44ToP45SequenceHandoffSimulationV2MayModifyProductionAppFiles &&
    !b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'activationApproved') &&
    !b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP44ToP45SequenceHandoffSimulationV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbes > 0 &&
    exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbesPassed === exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbes;
  const exactApprovalP45SequenceCommandPreflightV2Blockers = n(exactApprovalP45SequenceCommandPreflightV2, 'blockers');
  const exactApprovalP45SequenceCommandPreflightV2Warnings = n(exactApprovalP45SequenceCommandPreflightV2, 'warnings');
  const exactApprovalP45SequenceCommandPreflightV2Present =
    s(exactApprovalP45SequenceCommandPreflightV2, 'preflightState') !== '' ||
    b(exactApprovalP45SequenceCommandPreflightV2, 'p45SequenceCommandAllowedAfterP44Validation');
  const exactApprovalP45SequenceCommandPreflightV2State = s(exactApprovalP45SequenceCommandPreflightV2, 'preflightState');
  const exactApprovalP45SequenceCommandPreflightV2P57Ready = b(exactApprovalP45SequenceCommandPreflightV2, 'p57Ready');
  const exactApprovalP45SequenceCommandPreflightV2P45Status = s(exactApprovalP45SequenceCommandPreflightV2, 'p45Status');
  const exactApprovalP45SequenceCommandPreflightV2P45PreflightState = s(exactApprovalP45SequenceCommandPreflightV2, 'p45PreflightState');
  const exactApprovalP45SequenceCommandPreflightV2CommandAllowedNow = b(exactApprovalP45SequenceCommandPreflightV2, 'p45SequenceCommandAllowedNow');
  const exactApprovalP45SequenceCommandPreflightV2CommandAllowedAfterP44Validation = b(exactApprovalP45SequenceCommandPreflightV2, 'p45SequenceCommandAllowedAfterP44Validation');
  const exactApprovalP45SequenceCommandPreflightV2CommandExecutedByThisScript = b(exactApprovalP45SequenceCommandPreflightV2, 'p45SequenceCommandWouldExecuteByThisScript');
  const exactApprovalP45SequenceCommandPreflightV2FixtureProbesPassed = n(exactApprovalP45SequenceCommandPreflightV2, 'fixtureProbesPassed');
  const exactApprovalP45SequenceCommandPreflightV2FixtureProbes = n(exactApprovalP45SequenceCommandPreflightV2, 'fixtureProbes');
  const exactApprovalP45SequenceCommandPreflightV2ReadyForApply = b(exactApprovalP45SequenceCommandPreflightV2, 'readyForApply');
  const exactApprovalP45SequenceCommandPreflightV2MayModifyProductionAppFiles = b(exactApprovalP45SequenceCommandPreflightV2, 'mayModifyProductionAppFiles');
  const exactApprovalP45SequenceCommandPreflightV2FreshAfterP57 =
    fileMtimeMs(exactApprovalP45SequenceCommandPreflightV2Path) >= fileMtimeMs(exactApprovalP44ToP45SequenceHandoffSimulationV2Path) &&
    fileMtimeMs(exactApprovalP44ToP45SequenceHandoffSimulationV2Path) > 0;
  const exactApprovalP45SequenceCommandPreflightV2Ready =
    exactApprovalP45SequenceCommandPreflightV2Present &&
    exactApprovalP45SequenceCommandPreflightV2FreshAfterP57 &&
    exactApprovalP45SequenceCommandPreflightV2Blockers === 0 &&
    (exactApprovalP45SequenceCommandPreflightV2State === 'p45_sequence_command_preflight_ready_waiting_for_p44_validation' ||
      exactApprovalP45SequenceCommandPreflightV2State === 'p45_sequence_command_preflight_ready_for_sequence_refresh') &&
    exactApprovalP45SequenceCommandPreflightV2P57Ready &&
    b(exactApprovalP45SequenceCommandPreflightV2, 'commandTargetsFr') &&
    b(exactApprovalP45SequenceCommandPreflightV2, 'commandRunPathMatchesCurrentRun') &&
    exactApprovalP45SequenceCommandPreflightV2CommandAllowedAfterP44Validation &&
    !exactApprovalP45SequenceCommandPreflightV2CommandExecutedByThisScript &&
    !exactApprovalP45SequenceCommandPreflightV2ReadyForApply &&
    !exactApprovalP45SequenceCommandPreflightV2MayModifyProductionAppFiles &&
    !b(exactApprovalP45SequenceCommandPreflightV2, 'activationApproved') &&
    !b(exactApprovalP45SequenceCommandPreflightV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP45SequenceCommandPreflightV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP45SequenceCommandPreflightV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP45SequenceCommandPreflightV2FixtureProbes > 0 &&
    exactApprovalP45SequenceCommandPreflightV2FixtureProbesPassed === exactApprovalP45SequenceCommandPreflightV2FixtureProbes;
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Blockers = n(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'blockers');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Warnings = n(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'warnings');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present =
    s(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'handoffState') !== '' ||
    b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'simulatedPostP45P46WouldOpenTransaction');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State = s(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'handoffState');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P58Ready = b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'p58Ready');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45Status = s(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'p45Status');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45PreflightState = s(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'p45PreflightState');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46Status = s(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'p46Status');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46TransactionState = s(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'p46TransactionState');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CurrentHandoffWouldOpenTransaction = b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'currentP45ToP46HandoffWouldOpenTransaction');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2SimulatedPostP45P46WouldOpenTransaction = b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'simulatedPostP45P46WouldOpenTransaction');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CommandExecutedByThisScript = b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'p46ContractCommandWouldExecuteByThisScript');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbesPassed = n(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'fixtureProbesPassed');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbes = n(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'fixtureProbes');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2ReadyForApply = b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'readyForApply');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2MayModifyProductionAppFiles = b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'mayModifyProductionAppFiles');
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FreshAfterP58 =
    fileMtimeMs(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Path) >= fileMtimeMs(exactApprovalP45SequenceCommandPreflightV2Path) &&
    fileMtimeMs(exactApprovalP45SequenceCommandPreflightV2Path) > 0;
  const exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready =
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present &&
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FreshAfterP58 &&
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Blockers === 0 &&
    s(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'targetLocale') === 'fr' &&
    (exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State === 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence' ||
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State === 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract') &&
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P58Ready &&
    !exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CurrentHandoffWouldOpenTransaction &&
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2SimulatedPostP45P46WouldOpenTransaction &&
    !exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CommandExecutedByThisScript &&
    !b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'activationApproved') &&
    !exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2ReadyForApply &&
    !exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2MayModifyProductionAppFiles &&
    !b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'serverUploadAllowed') &&
    !b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'downloadablePacksPublished') &&
    !b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbes > 0 &&
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbesPassed === exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbes;
  const exactApprovalP46ApplyTransactionCommandPreflightV2Blockers = n(exactApprovalP46ApplyTransactionCommandPreflightV2, 'blockers');
  const exactApprovalP46ApplyTransactionCommandPreflightV2Warnings = n(exactApprovalP46ApplyTransactionCommandPreflightV2, 'warnings');
  const exactApprovalP46ApplyTransactionCommandPreflightV2Present =
    s(exactApprovalP46ApplyTransactionCommandPreflightV2, 'preflightState') !== '' ||
    b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p46ApplyTransactionCommandAllowedAfterP45Sequence');
  const exactApprovalP46ApplyTransactionCommandPreflightV2State = s(exactApprovalP46ApplyTransactionCommandPreflightV2, 'preflightState');
  const exactApprovalP46ApplyTransactionCommandPreflightV2P59Ready = b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p59Ready');
  const exactApprovalP46ApplyTransactionCommandPreflightV2P45Status = s(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p45Status');
  const exactApprovalP46ApplyTransactionCommandPreflightV2P45PreflightState = s(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p45PreflightState');
  const exactApprovalP46ApplyTransactionCommandPreflightV2P46Status = s(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p46Status');
  const exactApprovalP46ApplyTransactionCommandPreflightV2P46TransactionState = s(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p46TransactionState');
  const exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedNow = b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p46ApplyTransactionCommandAllowedNow');
  const exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedAfterP45Sequence = b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p46ApplyTransactionCommandAllowedAfterP45Sequence');
  const exactApprovalP46ApplyTransactionCommandPreflightV2CommandExecutedByThisScript = b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'p46ApplyTransactionCommandWouldExecuteByThisScript');
  const exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbesPassed = n(exactApprovalP46ApplyTransactionCommandPreflightV2, 'fixtureProbesPassed');
  const exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbes = n(exactApprovalP46ApplyTransactionCommandPreflightV2, 'fixtureProbes');
  const exactApprovalP46ApplyTransactionCommandPreflightV2ReadyForApply = b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'readyForApply');
  const exactApprovalP46ApplyTransactionCommandPreflightV2MayModifyProductionAppFiles = b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'mayModifyProductionAppFiles');
  const exactApprovalP46ApplyTransactionCommandPreflightV2FreshAfterP59 =
    fileMtimeMs(exactApprovalP46ApplyTransactionCommandPreflightV2Path) >= fileMtimeMs(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Path) &&
    fileMtimeMs(exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Path) > 0;
  const exactApprovalP46ApplyTransactionCommandPreflightV2Ready =
    exactApprovalP46ApplyTransactionCommandPreflightV2Present &&
    exactApprovalP46ApplyTransactionCommandPreflightV2FreshAfterP59 &&
    exactApprovalP46ApplyTransactionCommandPreflightV2Blockers === 0 &&
    s(exactApprovalP46ApplyTransactionCommandPreflightV2, 'targetLocale') === 'fr' &&
    (exactApprovalP46ApplyTransactionCommandPreflightV2State === 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence' ||
      exactApprovalP46ApplyTransactionCommandPreflightV2State === 'p46_apply_transaction_command_preflight_ready_for_contract_command') &&
    exactApprovalP46ApplyTransactionCommandPreflightV2P59Ready &&
    exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedAfterP45Sequence &&
    !exactApprovalP46ApplyTransactionCommandPreflightV2CommandExecutedByThisScript &&
    !b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'activationApproved') &&
    !exactApprovalP46ApplyTransactionCommandPreflightV2ReadyForApply &&
    !exactApprovalP46ApplyTransactionCommandPreflightV2MayModifyProductionAppFiles &&
    !b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'serverUploadAllowed') &&
    !b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'downloadablePacksPublished') &&
    !b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP46ApplyTransactionCommandPreflightV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbes > 0 &&
    exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbesPassed === exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbes;
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Blockers = n(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'blockers');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Warnings = n(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'warnings');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present =
    s(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'handoffState') !== '' ||
    b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'simulatedPostP46P47WouldOpenRollbackGuard');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State = s(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'handoffState');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P60Ready = b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'p60Ready');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46Status = s(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'p46Status');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46TransactionState = s(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'p46TransactionState');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47Status = s(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'p47Status');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47GuardState = s(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'p47GuardState');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CurrentHandoffWouldOpenRollbackGuard = b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'currentP46ToP47HandoffWouldOpenRollbackGuard');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2SimulatedPostP46P47WouldOpenRollbackGuard = b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'simulatedPostP46P47WouldOpenRollbackGuard');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CommandExecutedByThisScript = b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'p47RollbackGuardCommandWouldExecuteByThisScript');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbesPassed = n(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'fixtureProbesPassed');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbes = n(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'fixtureProbes');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2ReadyForApply = b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'readyForApply');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2MayModifyProductionAppFiles = b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'mayModifyProductionAppFiles');
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FreshAfterP60 =
    fileMtimeMs(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Path) >= fileMtimeMs(exactApprovalP46ApplyTransactionCommandPreflightV2Path) &&
    fileMtimeMs(exactApprovalP46ApplyTransactionCommandPreflightV2Path) > 0;
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FreshAfterP47 =
    fileMtimeMs(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Path) >= fileMtimeMs(postApplyRollbackGuardContractV2Path) &&
    fileMtimeMs(postApplyRollbackGuardContractV2Path) > 0;
  const exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready =
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present &&
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FreshAfterP60 &&
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FreshAfterP47 &&
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Blockers === 0 &&
    s(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'targetLocale') === 'fr' &&
    (exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State === 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract' ||
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State === 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract') &&
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P60Ready &&
    !exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CurrentHandoffWouldOpenRollbackGuard &&
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2SimulatedPostP46P47WouldOpenRollbackGuard &&
    !exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CommandExecutedByThisScript &&
    !b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'activationApproved') &&
    !exactApprovalP46ToP47RollbackGuardHandoffSimulationV2ReadyForApply &&
    !exactApprovalP46ToP47RollbackGuardHandoffSimulationV2MayModifyProductionAppFiles &&
    !b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'serverUploadAllowed') &&
    !b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'downloadablePacksPublished') &&
    !b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbes > 0 &&
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbesPassed === exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbes;
  const exactApprovalP47RollbackGuardCommandPreflightV2Blockers = n(exactApprovalP47RollbackGuardCommandPreflightV2, 'blockers');
  const exactApprovalP47RollbackGuardCommandPreflightV2Warnings = n(exactApprovalP47RollbackGuardCommandPreflightV2, 'warnings');
  const exactApprovalP47RollbackGuardCommandPreflightV2Present =
    s(exactApprovalP47RollbackGuardCommandPreflightV2, 'preflightState') !== '' ||
    b(exactApprovalP47RollbackGuardCommandPreflightV2, 'p47RollbackGuardCommandAllowedAfterP46Contract');
  const exactApprovalP47RollbackGuardCommandPreflightV2State = s(exactApprovalP47RollbackGuardCommandPreflightV2, 'preflightState');
  const exactApprovalP47RollbackGuardCommandPreflightV2P61Ready = b(exactApprovalP47RollbackGuardCommandPreflightV2, 'p61Ready');
  const exactApprovalP47RollbackGuardCommandPreflightV2P46Status = s(exactApprovalP47RollbackGuardCommandPreflightV2, 'p46Status');
  const exactApprovalP47RollbackGuardCommandPreflightV2P46TransactionState = s(exactApprovalP47RollbackGuardCommandPreflightV2, 'p46TransactionState');
  const exactApprovalP47RollbackGuardCommandPreflightV2P47Status = s(exactApprovalP47RollbackGuardCommandPreflightV2, 'p47Status');
  const exactApprovalP47RollbackGuardCommandPreflightV2P47GuardState = s(exactApprovalP47RollbackGuardCommandPreflightV2, 'p47GuardState');
  const exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedNow = b(exactApprovalP47RollbackGuardCommandPreflightV2, 'p47RollbackGuardCommandAllowedNow');
  const exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedAfterP46Contract = b(exactApprovalP47RollbackGuardCommandPreflightV2, 'p47RollbackGuardCommandAllowedAfterP46Contract');
  const exactApprovalP47RollbackGuardCommandPreflightV2CommandExecutedByThisScript = b(exactApprovalP47RollbackGuardCommandPreflightV2, 'p47RollbackGuardCommandWouldExecuteByThisScript');
  const exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbesPassed = n(exactApprovalP47RollbackGuardCommandPreflightV2, 'fixtureProbesPassed');
  const exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbes = n(exactApprovalP47RollbackGuardCommandPreflightV2, 'fixtureProbes');
  const exactApprovalP47RollbackGuardCommandPreflightV2ReadyForApply = b(exactApprovalP47RollbackGuardCommandPreflightV2, 'readyForApply');
  const exactApprovalP47RollbackGuardCommandPreflightV2MayModifyProductionAppFiles = b(exactApprovalP47RollbackGuardCommandPreflightV2, 'mayModifyProductionAppFiles');
  const exactApprovalP47RollbackGuardCommandPreflightV2FreshAfterP61 =
    fileMtimeMs(exactApprovalP47RollbackGuardCommandPreflightV2Path) >= fileMtimeMs(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Path) &&
    fileMtimeMs(exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Path) > 0;
  const exactApprovalP47RollbackGuardCommandPreflightV2FreshAfterP47 =
    fileMtimeMs(exactApprovalP47RollbackGuardCommandPreflightV2Path) >= fileMtimeMs(postApplyRollbackGuardContractV2Path) &&
    fileMtimeMs(postApplyRollbackGuardContractV2Path) > 0;
  const exactApprovalP47RollbackGuardCommandPreflightV2Ready =
    exactApprovalP47RollbackGuardCommandPreflightV2Present &&
    exactApprovalP47RollbackGuardCommandPreflightV2FreshAfterP61 &&
    exactApprovalP47RollbackGuardCommandPreflightV2FreshAfterP47 &&
    exactApprovalP47RollbackGuardCommandPreflightV2Blockers === 0 &&
    s(exactApprovalP47RollbackGuardCommandPreflightV2, 'targetLocale') === 'fr' &&
    (exactApprovalP47RollbackGuardCommandPreflightV2State === 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract' ||
      exactApprovalP47RollbackGuardCommandPreflightV2State === 'p47_rollback_guard_command_preflight_ready_for_guard_command') &&
    exactApprovalP47RollbackGuardCommandPreflightV2P61Ready &&
    exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedAfterP46Contract &&
    !exactApprovalP47RollbackGuardCommandPreflightV2CommandExecutedByThisScript &&
    !b(exactApprovalP47RollbackGuardCommandPreflightV2, 'activationApproved') &&
    !exactApprovalP47RollbackGuardCommandPreflightV2ReadyForApply &&
    !exactApprovalP47RollbackGuardCommandPreflightV2MayModifyProductionAppFiles &&
    !b(exactApprovalP47RollbackGuardCommandPreflightV2, 'serverUploadAllowed') &&
    !b(exactApprovalP47RollbackGuardCommandPreflightV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalP47RollbackGuardCommandPreflightV2, 'downloadablePacksPublished') &&
    !b(exactApprovalP47RollbackGuardCommandPreflightV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP47RollbackGuardCommandPreflightV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP47RollbackGuardCommandPreflightV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbes > 0 &&
    exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbesPassed === exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbes;
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Blockers = n(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'blockers');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Warnings = n(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'warnings');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present =
    s(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'handoffState') !== '' ||
    b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'currentP47ToP48HandoffWouldOpenSafeContinuation');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State = s(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'handoffState');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P62Ready = b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'p62Ready');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47Status = s(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'p47Status');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47GuardState = s(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'p47GuardState');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48Status = s(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'p48Status');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48ContinuationState = s(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'p48ContinuationState');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CurrentHandoffWouldOpenSafeContinuation = b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'currentP47ToP48HandoffWouldOpenSafeContinuation');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation = b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CommandExecutedByThisScript = b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'p48SafeContinuationCommandWouldExecuteByThisScript');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbesPassed = n(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'fixtureProbesPassed');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbes = n(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'fixtureProbes');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2ReadyForApply = b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'readyForApply');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2MayModifyProductionAppFiles = b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'mayModifyProductionAppFiles');
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FreshAfterP62 =
    fileMtimeMs(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Path) >= fileMtimeMs(exactApprovalP47RollbackGuardCommandPreflightV2Path) &&
    fileMtimeMs(exactApprovalP47RollbackGuardCommandPreflightV2Path) > 0;
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FreshAfterP48 =
    fileMtimeMs(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Path) >= fileMtimeMs(approvalWaitSafeContinuationV2Path) &&
    fileMtimeMs(approvalWaitSafeContinuationV2Path) > 0;
  const exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready =
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FreshAfterP62 &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FreshAfterP48 &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Blockers === 0 &&
    s(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'targetLocale') === 'fr' &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State === 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh' &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P62Ready &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CurrentHandoffWouldOpenSafeContinuation &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation &&
    !exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CommandExecutedByThisScript &&
    !b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'activationApproved') &&
    !exactApprovalP47ToP48SafeContinuationHandoffSimulationV2ReadyForApply &&
    !exactApprovalP47ToP48SafeContinuationHandoffSimulationV2MayModifyProductionAppFiles &&
    !b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'serverUploadAllowed') &&
    !b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'downloadablePacksPublished') &&
    !b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbes > 0 &&
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbesPassed === exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbes;
  const exactApprovalP48SafeContinuationCommandPreflightV2Blockers = n(exactApprovalP48SafeContinuationCommandPreflightV2, 'blockers');
  const exactApprovalP48SafeContinuationCommandPreflightV2Warnings = n(exactApprovalP48SafeContinuationCommandPreflightV2, 'warnings');
  const exactApprovalP48SafeContinuationCommandPreflightV2Present =
    s(exactApprovalP48SafeContinuationCommandPreflightV2, 'preflightState') !== '' ||
    b(exactApprovalP48SafeContinuationCommandPreflightV2, 'p48SafeContinuationCommandAllowedNow');
  const exactApprovalP48SafeContinuationCommandPreflightV2State = s(exactApprovalP48SafeContinuationCommandPreflightV2, 'preflightState');
  const exactApprovalP48SafeContinuationCommandPreflightV2P63Ready = b(exactApprovalP48SafeContinuationCommandPreflightV2, 'p63Ready');
  const exactApprovalP48SafeContinuationCommandPreflightV2P48Status = s(exactApprovalP48SafeContinuationCommandPreflightV2, 'p48Status');
  const exactApprovalP48SafeContinuationCommandPreflightV2P48ContinuationState = s(exactApprovalP48SafeContinuationCommandPreflightV2, 'p48ContinuationState');
  const exactApprovalP48SafeContinuationCommandPreflightV2CommandAllowedNow = b(exactApprovalP48SafeContinuationCommandPreflightV2, 'p48SafeContinuationCommandAllowedNow');
  const exactApprovalP48SafeContinuationCommandPreflightV2CommandExecutedByThisScript = b(exactApprovalP48SafeContinuationCommandPreflightV2, 'p48SafeContinuationCommandWouldExecuteByThisScript');
  const exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbesPassed = n(exactApprovalP48SafeContinuationCommandPreflightV2, 'fixtureProbesPassed');
  const exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbes = n(exactApprovalP48SafeContinuationCommandPreflightV2, 'fixtureProbes');
  const exactApprovalP48SafeContinuationCommandPreflightV2ReadyForApply = b(exactApprovalP48SafeContinuationCommandPreflightV2, 'readyForApply');
  const exactApprovalP48SafeContinuationCommandPreflightV2MayModifyProductionAppFiles = b(exactApprovalP48SafeContinuationCommandPreflightV2, 'mayModifyProductionAppFiles');
  const exactApprovalP48SafeContinuationCommandPreflightV2FreshAfterP63 =
    fileMtimeMs(exactApprovalP48SafeContinuationCommandPreflightV2Path) >= fileMtimeMs(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Path) &&
    fileMtimeMs(exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Path) > 0;
  const exactApprovalP48SafeContinuationCommandPreflightV2FreshAfterP48 =
    fileMtimeMs(exactApprovalP48SafeContinuationCommandPreflightV2Path) >= fileMtimeMs(approvalWaitSafeContinuationV2Path) &&
    fileMtimeMs(approvalWaitSafeContinuationV2Path) > 0;
  const exactApprovalP48SafeContinuationCommandPreflightV2Ready =
    exactApprovalP48SafeContinuationCommandPreflightV2Present &&
    exactApprovalP48SafeContinuationCommandPreflightV2FreshAfterP63 &&
    exactApprovalP48SafeContinuationCommandPreflightV2FreshAfterP48 &&
    exactApprovalP48SafeContinuationCommandPreflightV2Blockers === 0 &&
    s(exactApprovalP48SafeContinuationCommandPreflightV2, 'targetLocale') === 'fr' &&
    exactApprovalP48SafeContinuationCommandPreflightV2State === 'p48_safe_continuation_command_preflight_ready_for_refresh_command' &&
    exactApprovalP48SafeContinuationCommandPreflightV2P63Ready &&
    exactApprovalP48SafeContinuationCommandPreflightV2P48Status === 'PASS' &&
    exactApprovalP48SafeContinuationCommandPreflightV2P48ContinuationState === 'approval_wait_safe_continuation_ready' &&
    exactApprovalP48SafeContinuationCommandPreflightV2CommandAllowedNow &&
    !exactApprovalP48SafeContinuationCommandPreflightV2CommandExecutedByThisScript &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'activationApproved') &&
    !exactApprovalP48SafeContinuationCommandPreflightV2ReadyForApply &&
    !exactApprovalP48SafeContinuationCommandPreflightV2MayModifyProductionAppFiles &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'serverUploadAllowed') &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'downloadablePacksPublished') &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'storageMigrationAllowed') &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbes > 0 &&
    exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbesPassed === exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbes;
  const exactApprovalWaitStateV2Blockers = n(exactApprovalWaitStateV2, 'blockers');
  const exactApprovalWaitStateV2Warnings = n(exactApprovalWaitStateV2, 'warnings');
  const exactApprovalWaitStateV2Present =
    s(exactApprovalWaitStateV2, 'waitState') !== '' ||
    b(exactApprovalWaitStateV2, 'closedEvidenceReady');
  const exactApprovalWaitStateV2State = s(exactApprovalWaitStateV2, 'waitState');
  const exactApprovalWaitStateV2ClosedEvidenceReady = b(exactApprovalWaitStateV2, 'closedEvidenceReady');
  const exactApprovalWaitStateV2ExactApprovalStillRequired = b(exactApprovalWaitStateV2, 'exactApprovalStillRequired');
  const exactApprovalWaitStateV2SourceContainsExactSentence = b(exactApprovalWaitStateV2, 'exactApprovalSourceContainsExactSentence');
  const exactApprovalWaitStateV2ApprovalSourceIsCanonical = b(exactApprovalWaitStateV2, 'approvalSourceIsCanonical');
  const exactApprovalWaitStateV2ActiveApprovalReceiptExists = b(exactApprovalWaitStateV2, 'activeApprovalReceiptExists');
  const exactApprovalWaitStateV2ActiveHashLockExists = b(exactApprovalWaitStateV2, 'activeHashLockExists');
  const exactApprovalWaitStateV2FixtureProbesPassed = n(exactApprovalWaitStateV2, 'fixtureProbesPassed');
  const exactApprovalWaitStateV2FixtureProbes = n(exactApprovalWaitStateV2, 'fixtureProbes');
  const exactApprovalWaitStateV2ReadyForApply = b(exactApprovalWaitStateV2, 'readyForApply');
  const exactApprovalWaitStateV2MayModifyProductionAppFiles = b(exactApprovalWaitStateV2, 'mayModifyProductionAppFiles');
  const exactApprovalWaitStateV2FreshAfterP64 =
    fileMtimeMs(exactApprovalWaitStateV2Path) >= fileMtimeMs(exactApprovalP48SafeContinuationCommandPreflightV2Path) &&
    fileMtimeMs(exactApprovalP48SafeContinuationCommandPreflightV2Path) > 0;
  const exactApprovalWaitStateV2P64ReadyEquivalent =
    exactApprovalP48SafeContinuationCommandPreflightV2Ready &&
    s(exactApprovalP48SafeContinuationCommandPreflightV2, 'preflightState') === 'p48_safe_continuation_command_preflight_ready_for_refresh_command' &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'readyForApply') &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'mayModifyProductionAppFiles') &&
    !b(exactApprovalP48SafeContinuationCommandPreflightV2, 'activationApproved');
  const exactApprovalWaitStateV2StateAccepted =
    exactApprovalWaitStateV2State === 'exact_approval_wait_state_ready' ||
    exactApprovalWaitStateV2State === 'exact_approval_source_present_ready_for_p31_create';
  const exactApprovalWaitStateV2Ready =
    exactApprovalWaitStateV2Present &&
    (exactApprovalWaitStateV2FreshAfterP64 || exactApprovalWaitStateV2P64ReadyEquivalent) &&
    exactApprovalWaitStateV2Blockers === 0 &&
    s(exactApprovalWaitStateV2, 'targetLocale') === 'fr' &&
    exactApprovalWaitStateV2StateAccepted &&
    exactApprovalWaitStateV2ClosedEvidenceReady &&
    exactApprovalWaitStateV2ApprovalSourceIsCanonical &&
    (exactApprovalWaitStateV2ExactApprovalStillRequired || exactApprovalWaitStateV2SourceContainsExactSentence) &&
    !exactApprovalWaitStateV2ActiveApprovalReceiptExists &&
    !exactApprovalWaitStateV2ActiveHashLockExists &&
    !b(exactApprovalWaitStateV2, 'activationApproved') &&
    !exactApprovalWaitStateV2ReadyForApply &&
    !exactApprovalWaitStateV2MayModifyProductionAppFiles &&
    !b(exactApprovalWaitStateV2, 'serverUploadAllowed') &&
    !b(exactApprovalWaitStateV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalWaitStateV2, 'downloadablePacksPublished') &&
    !b(exactApprovalWaitStateV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalWaitStateV2, 'storageMigrationAllowed') &&
    !b(exactApprovalWaitStateV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalWaitStateV2FixtureProbes > 0 &&
    exactApprovalWaitStateV2FixtureProbesPassed === exactApprovalWaitStateV2FixtureProbes;
  const orderedApprovalWaitRefreshV2Blockers = n(orderedApprovalWaitRefreshV2, 'blockers');
  const orderedApprovalWaitRefreshV2Warnings = n(orderedApprovalWaitRefreshV2, 'warnings');
  const orderedApprovalWaitRefreshV2Present = fs.existsSync(orderedApprovalWaitRefreshV2Path);
  const orderedApprovalWaitRefreshV2Executed = b(orderedApprovalWaitRefreshV2, 'executed');
  const orderedApprovalWaitRefreshV2StepsPassed = n(orderedApprovalWaitRefreshV2, 'stepsPassed');
  const orderedApprovalWaitRefreshV2StepsFailed = n(orderedApprovalWaitRefreshV2, 'stepsFailed');
  const orderedApprovalWaitRefreshV2P65Status = s(orderedApprovalWaitRefreshV2, 'p65Status');
  const orderedApprovalWaitRefreshV2P65WaitState = s(orderedApprovalWaitRefreshV2, 'p65WaitState');
  const orderedApprovalWaitRefreshV2P65ClosedEvidenceReady = b(orderedApprovalWaitRefreshV2, 'p65ClosedEvidenceReady');
  const orderedApprovalWaitRefreshV2FinalMasterBlockers = n(orderedApprovalWaitRefreshV2, 'finalMasterBlockers');
  const orderedApprovalWaitRefreshV2FinalMasterWarnings = n(orderedApprovalWaitRefreshV2, 'finalMasterWarnings');
  const orderedApprovalWaitRefreshV2FinalMasterHasOnlyTransientSelfCycle = b(orderedApprovalWaitRefreshV2, 'finalMasterHasOnlyTransientSelfCycle');
  const orderedApprovalWaitRefreshV2FinalNextBlockers = n(orderedApprovalWaitRefreshV2, 'finalNextBlockers');
  const orderedApprovalWaitRefreshV2FinalNextWarnings = n(orderedApprovalWaitRefreshV2, 'finalNextWarnings');
  const orderedApprovalWaitRefreshV2ActiveApprovalReceiptExists = b(orderedApprovalWaitRefreshV2, 'activeApprovalReceiptExists');
  const orderedApprovalWaitRefreshV2ActiveHashLockExists = b(orderedApprovalWaitRefreshV2, 'activeHashLockExists');
  const orderedApprovalWaitRefreshV2ReadyForApply = b(orderedApprovalWaitRefreshV2, 'readyForApply');
  const orderedApprovalWaitRefreshV2MayModifyProductionAppFiles = b(orderedApprovalWaitRefreshV2, 'mayModifyProductionAppFiles');
  const orderedApprovalWaitRefreshV2Ready =
    orderedApprovalWaitRefreshV2Present &&
    s(orderedApprovalWaitRefreshV2, 'targetLocale') === 'fr' &&
    (orderedApprovalWaitRefreshV2Executed ||
      orderedApprovalWaitRefreshV2FinalMasterHasOnlyTransientSelfCycle ||
      (orderedApprovalWaitRefreshV2StepsPassed === 0 && orderedApprovalWaitRefreshV2P65Status === 'PASS')) &&
    (orderedApprovalWaitRefreshV2StepsPassed > 0 ||
      orderedApprovalWaitRefreshV2FinalMasterHasOnlyTransientSelfCycle ||
      (orderedApprovalWaitRefreshV2StepsPassed === 0 && orderedApprovalWaitRefreshV2P65Status === 'PASS')) &&
    orderedApprovalWaitRefreshV2StepsFailed === 0 &&
    orderedApprovalWaitRefreshV2P65Status === 'PASS' &&
    orderedApprovalWaitRefreshV2P65WaitState === 'exact_approval_wait_state_ready' &&
    orderedApprovalWaitRefreshV2P65ClosedEvidenceReady &&
    b(orderedApprovalWaitRefreshV2, 'p65ExactApprovalStillRequired') &&
    (orderedApprovalWaitRefreshV2FinalMasterBlockers === 0 || orderedApprovalWaitRefreshV2FinalMasterHasOnlyTransientSelfCycle) &&
    orderedApprovalWaitRefreshV2FinalMasterWarnings === 0 &&
    orderedApprovalWaitRefreshV2FinalNextBlockers === 0 &&
    orderedApprovalWaitRefreshV2FinalNextWarnings === 0 &&
    orderedApprovalWaitRefreshV2Blockers === 0 &&
    orderedApprovalWaitRefreshV2Warnings === 0 &&
    !orderedApprovalWaitRefreshV2ActiveApprovalReceiptExists &&
    !orderedApprovalWaitRefreshV2ActiveHashLockExists &&
    !orderedApprovalWaitRefreshV2ReadyForApply &&
    !orderedApprovalWaitRefreshV2MayModifyProductionAppFiles &&
    !b(orderedApprovalWaitRefreshV2, 'serverUploadAllowed') &&
    !b(orderedApprovalWaitRefreshV2, 'firebaseUploadAllowed') &&
    !b(orderedApprovalWaitRefreshV2, 'runtimeDownloadsEnabled') &&
    !b(orderedApprovalWaitRefreshV2, 'activationApproved');
  const safePreapprovalContinuationV2Blockers = n(safePreapprovalContinuationV2, 'blockers');
  const safePreapprovalContinuationV2Warnings = n(safePreapprovalContinuationV2, 'warnings');
  const safePreapprovalContinuationV2Present = fs.existsSync(safePreapprovalContinuationV2Path);
  const safePreapprovalContinuationV2Executed = b(safePreapprovalContinuationV2, 'executed');
  const safePreapprovalContinuationV2StepsPassed = n(safePreapprovalContinuationV2, 'stepsPassed');
  const safePreapprovalContinuationV2StepsFailed = n(safePreapprovalContinuationV2, 'stepsFailed');
  const safePreapprovalContinuationV2GenerationBlockers = n(safePreapprovalContinuationV2, 'generationBlockers');
  const safePreapprovalContinuationV2ApplyBlockers = n(safePreapprovalContinuationV2, 'applyBlockers');
  const safePreapprovalContinuationV2NextGoalId = s(safePreapprovalContinuationV2, 'nextGoalId');
  const safePreapprovalContinuationV2ActiveApprovalReceiptExists = b(safePreapprovalContinuationV2, 'activeApprovalReceiptExists');
  const safePreapprovalContinuationV2ActiveHashLockExists = b(safePreapprovalContinuationV2, 'activeHashLockExists');
  const safePreapprovalContinuationV2ReadyForApply = b(safePreapprovalContinuationV2, 'readyForApply');
  const safePreapprovalContinuationV2MayModifyProductionAppFiles = b(safePreapprovalContinuationV2, 'mayModifyProductionAppFiles');
  const safePreapprovalContinuationV2Ready =
    safePreapprovalContinuationV2Present &&
    s(safePreapprovalContinuationV2, 'targetLocale') === 'fr' &&
    safePreapprovalContinuationV2Executed &&
    safePreapprovalContinuationV2StepsPassed > 0 &&
    safePreapprovalContinuationV2StepsFailed === 0 &&
    safePreapprovalContinuationV2GenerationBlockers === 0 &&
    safePreapprovalContinuationV2ApplyBlockers === 1 &&
    safePreapprovalContinuationV2NextGoalId === 'NEXT-PASS-P66-SAFE-PREAPPROVAL-CONTINUATION-V2' &&
    safePreapprovalContinuationV2Blockers === 0 &&
    safePreapprovalContinuationV2Warnings === 0 &&
    !safePreapprovalContinuationV2ActiveApprovalReceiptExists &&
    !safePreapprovalContinuationV2ActiveHashLockExists &&
    !safePreapprovalContinuationV2ReadyForApply &&
    !safePreapprovalContinuationV2MayModifyProductionAppFiles &&
    !b(safePreapprovalContinuationV2, 'serverUploadAllowed') &&
    !b(safePreapprovalContinuationV2, 'firebaseUploadAllowed') &&
    !b(safePreapprovalContinuationV2, 'runtimeDownloadsEnabled') &&
    !b(safePreapprovalContinuationV2, 'activationApproved');
  const finalProductionReadinessGapV2Blockers = n(finalProductionReadinessGapV2, 'blockers');
  const finalProductionReadinessGapV2Warnings = n(finalProductionReadinessGapV2, 'warnings');
  const finalProductionReadinessGapV2Present = fs.existsSync(finalProductionReadinessGapV2Path);
  const finalProductionReadinessGapV2State = s(finalProductionReadinessGapV2, 'productionReadinessState');
  const finalProductionReadinessGapV2RequirementsReady = n(finalProductionReadinessGapV2, 'requirementsReady');
  const finalProductionReadinessGapV2RequirementsBlocked = n(finalProductionReadinessGapV2, 'requirementsBlocked');
  const finalProductionReadinessGapV2ProductionHardBlockers = n(finalProductionReadinessGapV2, 'productionHardBlockers');
  const finalProductionReadinessGapV2CanStartProductionApply = b(finalProductionReadinessGapV2, 'canStartProductionApply');
  const finalProductionReadinessGapV2GenerationV2Ready = b(finalProductionReadinessGapV2, 'generationV2Ready');
  const finalProductionReadinessGapV2DecisionImportV2Ready = b(finalProductionReadinessGapV2, 'decisionImportV2Ready');
  const finalProductionReadinessGapV2ActiveApprovalArtifactPairState = s(finalProductionReadinessGapV2, 'activeApprovalArtifactPairState');
  const finalProductionReadinessGapV2ActivationChainReady = b(finalProductionReadinessGapV2, 'activationChainReady');
  const finalProductionReadinessGapV2FixtureProbesPassed = n(finalProductionReadinessGapV2, 'fixtureProbesPassed');
  const finalProductionReadinessGapV2FixtureProbes = n(finalProductionReadinessGapV2, 'fixtureProbes');
  const finalProductionReadinessGapV2ActiveApprovalReceiptExists = b(finalProductionReadinessGapV2, 'activeApprovalReceiptExists');
  const finalProductionReadinessGapV2ActiveHashLockExists = b(finalProductionReadinessGapV2, 'activeHashLockExists');
  const finalProductionReadinessGapV2ReadyForApply = b(finalProductionReadinessGapV2, 'readyForApply');
  const finalProductionReadinessGapV2MayModifyProductionAppFiles = b(finalProductionReadinessGapV2, 'mayModifyProductionAppFiles');
  const finalProductionReadinessGapV2Ready =
    finalProductionReadinessGapV2Present &&
    s(finalProductionReadinessGapV2, 'targetLocale') === 'fr' &&
    finalProductionReadinessGapV2State === 'preactivation_ready_exact_approval_required' &&
    finalProductionReadinessGapV2RequirementsReady >= 9 &&
    finalProductionReadinessGapV2RequirementsBlocked <= 2 &&
    finalProductionReadinessGapV2ProductionHardBlockers === 1 &&
    finalProductionReadinessGapV2GenerationV2Ready &&
    finalProductionReadinessGapV2DecisionImportV2Ready &&
    (finalProductionReadinessGapV2ActiveApprovalArtifactPairState === 'absent_waiting_for_exact_approval_source' ||
      finalProductionReadinessGapV2ActiveApprovalArtifactPairState === 'active_pair_validated_by_p44') &&
    finalProductionReadinessGapV2FixtureProbes > 0 &&
    finalProductionReadinessGapV2FixtureProbesPassed === finalProductionReadinessGapV2FixtureProbes &&
    !finalProductionReadinessGapV2CanStartProductionApply &&
    finalProductionReadinessGapV2Blockers === 0 &&
    !finalProductionReadinessGapV2ReadyForApply &&
    !finalProductionReadinessGapV2MayModifyProductionAppFiles &&
    !b(finalProductionReadinessGapV2, 'serverUploadAllowed') &&
    !b(finalProductionReadinessGapV2, 'firebaseUploadAllowed') &&
    !b(finalProductionReadinessGapV2, 'runtimeDownloadsEnabled');
  const postApprovalSequenceReady =
    productionReadinessCompletionAuditV2PostApprovalLockedReady &&
    exactApprovalValidationGateV2Ready &&
    exactApprovalValidationGateV2ReadyForProductionActivationSequencing &&
    exactApprovalValidationGateV2ActiveApprovalReceiptExists &&
    exactApprovalValidationGateV2ActiveHashLockExists &&
    productionActivationSequencePreflightV2Ready &&
    productionActivationSequencePreflightV2ReadyForProductionActivationSequence &&
    productionApplyTransactionContractV2Ready &&
    productionApplyTransactionContractV2ReadyForProductionApplyTransaction &&
    postApplyRollbackGuardContractV2Ready &&
    postApplyRollbackGuardContractV2ReadyForPostApplyRollbackGuard &&
    !finalProductionReadinessGapV2CanStartProductionApply &&
    !finalProductionReadinessGapV2ReadyForApply &&
    !finalProductionReadinessGapV2MayModifyProductionAppFiles;
  const exactApprovalSourceHandoffFirewallV2Blockers = n(exactApprovalSourceHandoffFirewallV2, 'blockers');
  const exactApprovalSourceHandoffFirewallV2Warnings = n(exactApprovalSourceHandoffFirewallV2, 'warnings');
  const exactApprovalSourceHandoffFirewallV2Present = fs.existsSync(exactApprovalSourceHandoffFirewallV2Path);
  const exactApprovalSourceHandoffFirewallV2State = s(exactApprovalSourceHandoffFirewallV2, 'handoffState');
  const exactApprovalSourceHandoffFirewallV2FinalGapReady = b(exactApprovalSourceHandoffFirewallV2, 'finalGapReady');
  const exactApprovalSourceHandoffFirewallV2ExactApprovalWaitStateReady = b(exactApprovalSourceHandoffFirewallV2, 'exactApprovalWaitStateReady');
  const exactApprovalSourceHandoffFirewallV2P31CreationGateReady = b(exactApprovalSourceHandoffFirewallV2, 'p31CreationGateReady');
  const exactApprovalSourceHandoffFirewallV2ApprovalSourceExists = b(exactApprovalSourceHandoffFirewallV2, 'approvalSourceExists');
  const exactApprovalSourceHandoffFirewallV2ApprovalSourceContainsExactSentence = b(exactApprovalSourceHandoffFirewallV2, 'approvalSourceContainsExactSentence');
  const exactApprovalSourceHandoffFirewallV2NextAllowedStepWhileAbsent = s(exactApprovalSourceHandoffFirewallV2, 'nextAllowedStepWhileAbsent');
  const exactApprovalSourceHandoffFirewallV2NextAllowedStepWhenPresent = s(exactApprovalSourceHandoffFirewallV2, 'nextAllowedStepWhenPresent');
  const exactApprovalSourceHandoffFirewallV2ActiveApprovalReceiptExists = b(exactApprovalSourceHandoffFirewallV2, 'activeApprovalReceiptExists');
  const exactApprovalSourceHandoffFirewallV2ActiveHashLockExists = b(exactApprovalSourceHandoffFirewallV2, 'activeHashLockExists');
  const exactApprovalSourceHandoffFirewallV2CanStartProductionApply = b(exactApprovalSourceHandoffFirewallV2, 'canStartProductionApply');
  const exactApprovalSourceHandoffFirewallV2FixtureProbesPassed = n(exactApprovalSourceHandoffFirewallV2, 'fixtureProbesPassed');
  const exactApprovalSourceHandoffFirewallV2FixtureProbes = n(exactApprovalSourceHandoffFirewallV2, 'fixtureProbes');
  const exactApprovalSourceHandoffFirewallV2ReadyForApply = b(exactApprovalSourceHandoffFirewallV2, 'readyForApply');
  const exactApprovalSourceHandoffFirewallV2MayModifyProductionAppFiles = b(exactApprovalSourceHandoffFirewallV2, 'mayModifyProductionAppFiles');
  const exactApprovalSourceHandoffFirewallV2Ready =
    exactApprovalSourceHandoffFirewallV2Present &&
    s(exactApprovalSourceHandoffFirewallV2, 'targetLocale') === 'fr' &&
    exactApprovalSourceHandoffFirewallV2State === 'waiting_for_exact_approval_source_file' &&
    exactApprovalSourceHandoffFirewallV2FinalGapReady &&
    exactApprovalSourceHandoffFirewallV2ExactApprovalWaitStateReady &&
    exactApprovalSourceHandoffFirewallV2P31CreationGateReady &&
    b(exactApprovalSourceHandoffFirewallV2, 'approvalSourceIsCanonical') &&
    !exactApprovalSourceHandoffFirewallV2ApprovalSourceExists &&
    !exactApprovalSourceHandoffFirewallV2ApprovalSourceContainsExactSentence &&
    exactApprovalSourceHandoffFirewallV2NextAllowedStepWhileAbsent === 'wait_for_exact_approval_source_file' &&
    exactApprovalSourceHandoffFirewallV2NextAllowedStepWhenPresent === 'P31_EXPLICIT_APPROVAL_RECEIPT_CREATION_GATE_V2' &&
    !exactApprovalSourceHandoffFirewallV2ActiveApprovalReceiptExists &&
    !exactApprovalSourceHandoffFirewallV2ActiveHashLockExists &&
    !exactApprovalSourceHandoffFirewallV2CanStartProductionApply &&
    !exactApprovalSourceHandoffFirewallV2ReadyForApply &&
    !exactApprovalSourceHandoffFirewallV2MayModifyProductionAppFiles &&
    !b(exactApprovalSourceHandoffFirewallV2, 'serverUploadAllowed') &&
    !b(exactApprovalSourceHandoffFirewallV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalSourceHandoffFirewallV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalSourceHandoffFirewallV2, 'activationApproved') &&
    exactApprovalSourceHandoffFirewallV2FixtureProbes > 0 &&
    exactApprovalSourceHandoffFirewallV2FixtureProbesPassed === exactApprovalSourceHandoffFirewallV2FixtureProbes &&
    exactApprovalSourceHandoffFirewallV2Blockers === 0;
  const exactApprovalSourceWaitTerminalStateV2Blockers = n(exactApprovalSourceWaitTerminalStateV2, 'blockers');
  const exactApprovalSourceWaitTerminalStateV2Warnings = n(exactApprovalSourceWaitTerminalStateV2, 'warnings');
  const exactApprovalSourceWaitTerminalStateV2Present = fs.existsSync(exactApprovalSourceWaitTerminalStateV2Path);
  const exactApprovalSourceWaitTerminalStateV2State = s(exactApprovalSourceWaitTerminalStateV2, 'terminalState');
  const exactApprovalSourceWaitTerminalStateV2P68Ready = b(exactApprovalSourceWaitTerminalStateV2, 'p68Ready');
  const exactApprovalSourceWaitTerminalStateV2NextGoalId = s(exactApprovalSourceWaitTerminalStateV2, 'nextPassGoalId');
  const exactApprovalSourceWaitTerminalStateV2ConsistencyGoalId = s(exactApprovalSourceWaitTerminalStateV2, 'consistencyGoalId');
  const exactApprovalSourceWaitTerminalStateV2ApprovalSourceExists = b(exactApprovalSourceWaitTerminalStateV2, 'approvalSourceExists');
  const exactApprovalSourceWaitTerminalStateV2ApprovalSourceContainsExactSentence = b(exactApprovalSourceWaitTerminalStateV2, 'approvalSourceContainsExactSentence');
  const exactApprovalSourceWaitTerminalStateV2ActiveApprovalReceiptExists = b(exactApprovalSourceWaitTerminalStateV2, 'activeApprovalReceiptExists');
  const exactApprovalSourceWaitTerminalStateV2ActiveHashLockExists = b(exactApprovalSourceWaitTerminalStateV2, 'activeHashLockExists');
  const exactApprovalSourceWaitTerminalStateV2CanStartProductionApply = b(exactApprovalSourceWaitTerminalStateV2, 'canStartProductionApply');
  const exactApprovalSourceWaitTerminalStateV2FixtureProbesPassed = n(exactApprovalSourceWaitTerminalStateV2, 'fixtureProbesPassed');
  const exactApprovalSourceWaitTerminalStateV2FixtureProbes = n(exactApprovalSourceWaitTerminalStateV2, 'fixtureProbes');
  const exactApprovalSourceWaitTerminalStateV2ReadyForApply = b(exactApprovalSourceWaitTerminalStateV2, 'readyForApply');
  const exactApprovalSourceWaitTerminalStateV2MayModifyProductionAppFiles = b(exactApprovalSourceWaitTerminalStateV2, 'mayModifyProductionAppFiles');
  const exactApprovalSourceWaitTerminalStateV2Ready =
    exactApprovalSourceWaitTerminalStateV2Present &&
    s(exactApprovalSourceWaitTerminalStateV2, 'targetLocale') === 'fr' &&
    exactApprovalSourceWaitTerminalStateV2State === 'exact_approval_source_absent_terminal_wait' &&
    exactApprovalSourceWaitTerminalStateV2P68Ready &&
    exactApprovalSourceWaitTerminalStateV2NextGoalId === 'NEXT-PASS-P69-EXACT-APPROVAL-SOURCE-WAIT-TERMINAL-STATE-V2' &&
    exactApprovalSourceWaitTerminalStateV2ConsistencyGoalId === 'NEXT-PASS-P69-EXACT-APPROVAL-SOURCE-WAIT-TERMINAL-STATE-V2' &&
    !exactApprovalSourceWaitTerminalStateV2ApprovalSourceExists &&
    !exactApprovalSourceWaitTerminalStateV2ApprovalSourceContainsExactSentence &&
    !exactApprovalSourceWaitTerminalStateV2ActiveApprovalReceiptExists &&
    !exactApprovalSourceWaitTerminalStateV2ActiveHashLockExists &&
    !exactApprovalSourceWaitTerminalStateV2CanStartProductionApply &&
    !exactApprovalSourceWaitTerminalStateV2ReadyForApply &&
    !exactApprovalSourceWaitTerminalStateV2MayModifyProductionAppFiles &&
    !b(exactApprovalSourceWaitTerminalStateV2, 'activationApproved') &&
    !b(exactApprovalSourceWaitTerminalStateV2, 'serverUploadAllowed') &&
    !b(exactApprovalSourceWaitTerminalStateV2, 'firebaseUploadAllowed') &&
    !b(exactApprovalSourceWaitTerminalStateV2, 'runtimeDownloadsEnabled') &&
    !b(exactApprovalSourceWaitTerminalStateV2, 'storageMigrationAllowed') &&
    !b(exactApprovalSourceWaitTerminalStateV2, 'cloudSyncMigrationAllowed') &&
    exactApprovalSourceWaitTerminalStateV2FixtureProbes > 0 &&
    exactApprovalSourceWaitTerminalStateV2FixtureProbesPassed === exactApprovalSourceWaitTerminalStateV2FixtureProbes &&
    exactApprovalSourceWaitTerminalStateV2Blockers === 0;
  const postExactApprovalApplyRunbookV2Blockers = n(postExactApprovalApplyRunbookV2, 'blockers');
  const postExactApprovalApplyRunbookV2Warnings = n(postExactApprovalApplyRunbookV2, 'warnings');
  const postExactApprovalApplyRunbookV2Present = fs.existsSync(postExactApprovalApplyRunbookV2Path);
  const postExactApprovalApplyRunbookV2State = s(postExactApprovalApplyRunbookV2, 'runbookState');
  const postExactApprovalApplyRunbookV2Steps = n(postExactApprovalApplyRunbookV2, 'runbookSteps');
  const postExactApprovalApplyRunbookV2P31CreateAllowedNow = b(postExactApprovalApplyRunbookV2, 'p31CreateAllowedNow');
  const postExactApprovalApplyRunbookV2P31CreateAllowedWhenExactSourcePresent = b(postExactApprovalApplyRunbookV2, 'p31CreateAllowedWhenExactSourcePresent');
  const postExactApprovalApplyRunbookV2ProductionWritesAllowedNow = b(postExactApprovalApplyRunbookV2, 'productionWritesAllowedNow');
  const postExactApprovalApplyRunbookV2ActiveApprovalReceiptExists = b(postExactApprovalApplyRunbookV2, 'activeApprovalReceiptExists');
  const postExactApprovalApplyRunbookV2ActiveHashLockExists = b(postExactApprovalApplyRunbookV2, 'activeHashLockExists');
  const postExactApprovalApplyRunbookV2CanStartProductionApplyNow = b(postExactApprovalApplyRunbookV2, 'canStartProductionApplyNow');
  const postExactApprovalApplyRunbookV2FixtureProbesPassed = n(postExactApprovalApplyRunbookV2, 'fixtureProbesPassed');
  const postExactApprovalApplyRunbookV2FixtureProbes = n(postExactApprovalApplyRunbookV2, 'fixtureProbes');
  const postExactApprovalApplyRunbookV2ReadyForApply = b(postExactApprovalApplyRunbookV2, 'readyForApply');
  const postExactApprovalApplyRunbookV2MayModifyProductionAppFiles = b(postExactApprovalApplyRunbookV2, 'mayModifyProductionAppFiles');
  const postExactApprovalApplyRunbookV2Source = sourceReports.find((entry) => entry.name === 'post_exact_approval_apply_runbook_v2_packet.json');
  const postExactApprovalApplyRunbookV2Ready =
    postExactApprovalApplyRunbookV2Present &&
    postExactApprovalApplyRunbookV2Source?.status === 'PASS' &&
    s(postExactApprovalApplyRunbookV2, 'targetLocale') === 'fr' &&
    postExactApprovalApplyRunbookV2State === 'post_exact_approval_runbook_ready_waiting_for_canonical_source' &&
    postExactApprovalApplyRunbookV2Steps === 6 &&
    !postExactApprovalApplyRunbookV2P31CreateAllowedNow &&
    postExactApprovalApplyRunbookV2P31CreateAllowedWhenExactSourcePresent &&
    !postExactApprovalApplyRunbookV2ProductionWritesAllowedNow &&
    !postExactApprovalApplyRunbookV2ActiveApprovalReceiptExists &&
    !postExactApprovalApplyRunbookV2ActiveHashLockExists &&
    !postExactApprovalApplyRunbookV2CanStartProductionApplyNow &&
    !postExactApprovalApplyRunbookV2ReadyForApply &&
    !postExactApprovalApplyRunbookV2MayModifyProductionAppFiles &&
    !b(postExactApprovalApplyRunbookV2, 'activationApproved') &&
    postExactApprovalApplyRunbookV2FixtureProbes === 13 &&
    postExactApprovalApplyRunbookV2FixtureProbesPassed === postExactApprovalApplyRunbookV2FixtureProbes &&
    postExactApprovalApplyRunbookV2Blockers === 0;
  const researchJsonFirewallBlockers = n(researchJsonFirewall, 'blockerFindings') || n(researchJsonFirewall, 'blockers');
  const researchJsonFirewallWarnings = n(researchJsonFirewall, 'warningFindings') || n(researchJsonFirewall, 'warnings');
  const nextPassContractBlockers = n(nextPassContract, 'blockers');
  const nextPassContractWarnings = n(nextPassContract, 'warnings');
  const nextPassLargeGoals = n(nextPassContract, 'nextPassLargeGoals');
  const nextPassPrepared = b(nextPassContract, 'nextPassPrepared');
  const readyForNextLargePass = b(nextPassContract, 'readyForNextLargePass');
  const runValidatorBlockers = n(runValidator, 'blockers');
  const generationBlockers = n(readinessBlockers, 'generationBlockers');
  const applyBlockers = n(readinessBlockers, 'applyBlockers');
  const queueRows = n(batchFilesIntegrity, 'queueRows') || n(decisionTemplateIntegrity, 'queueRows');
  const decisionTemplateRows = n(decisionTemplateIntegrity, 'templateJsonlRows') || n(decisionImportDryRun, 'decisionRows');
  const readyForDecisionImport = b(decisionImportDryRun, 'readyForDecisionImport');
  const exactApprovalApplyRehearsalV2BlockedByP49P50Only =
    exactApprovalApplyRehearsalV2Present &&
    !exactApprovalApplyRehearsalV2Ready &&
    exactApprovalApplyRehearsalV2Blockers > 0 &&
    !productionReadinessCompletionAuditV2Ready &&
    !finalPreapprovalEvidenceHashLockV2Ready &&
    !exactApprovalApplyRehearsalV2ActiveApprovalReceiptExists &&
    !exactApprovalApplyRehearsalV2ActiveHashLockExists &&
    exactApprovalApplyRehearsalV2MainHashLockDryRunPresent &&
    exactApprovalApplyRehearsalV2FinalHashLockDryRunPresent &&
    !exactApprovalApplyRehearsalV2WouldCreateActiveArtifactsNow &&
    !exactApprovalApplyRehearsalV2ReadyForApply &&
    !exactApprovalApplyRehearsalV2MayModifyProductionAppFiles;
  const exactApprovalSourceFirewallV2WaitingForP51Only =
    exactApprovalSourceFirewallV2Present &&
    !exactApprovalSourceFirewallV2Ready &&
    exactApprovalApplyRehearsalV2BlockedByP49P50Only &&
    exactApprovalSourceFirewallV2Blockers === 0 &&
    !exactApprovalSourceFirewallV2PlainContinueWouldCreateActiveArtifacts &&
    !exactApprovalSourceFirewallV2ActiveApprovalReceiptExists &&
    !exactApprovalSourceFirewallV2ActiveHashLockExists &&
    !exactApprovalSourceFirewallV2ReadyForApply &&
    !exactApprovalSourceFirewallV2MayModifyProductionAppFiles;
  const exactApprovalWaitStateV2BlockedByClosedEvidenceOnly =
    exactApprovalWaitStateV2Present &&
    !exactApprovalWaitStateV2Ready &&
    exactApprovalWaitStateV2Blockers > 0 &&
    !productionReadinessCompletionAuditV2Ready &&
    exactApprovalWaitStateV2ApprovalSourceIsCanonical &&
    exactApprovalWaitStateV2ExactApprovalStillRequired &&
    !exactApprovalWaitStateV2ActiveApprovalReceiptExists &&
    !exactApprovalWaitStateV2ActiveHashLockExists &&
    !exactApprovalWaitStateV2ReadyForApply &&
    !exactApprovalWaitStateV2MayModifyProductionAppFiles;

  const gateBlockers: [string, number][] = [
    ['language_isolation_blockers', languageIsolationBlockers],
    ['language_isolation_missing_target_locale', rowsMissingTargetLocale],
    ['translation_qa_blockers', translationQaBlockers],
    ['generated_content_blockers', generatedContentBlockers],
    ['runtime_content_integrity_blockers', runtimeContentIntegrityBlockers],
    ['runtime_content_integrity_placeholder_text_fields', runtimeContentIntegrityPlaceholderTextFields],
    ['runtime_content_integrity_mojibake_fields', runtimeContentIntegrityMojibakeFields],
    ['runtime_content_integrity_replacement_char_fields', runtimeContentIntegrityReplacementCharFields],
    ['runtime_content_integrity_missing_runtime_payload_files', Math.max(0, 12 - runtimeContentIntegrityRuntimePayloadFiles)],
    ['runtime_content_integrity_empty_scan', runtimeContentIntegrityTextFieldsScanned <= 0 ? 1 : 0],
    ['handoff_integrity_blockers', handoffIntegrityBlockers],
    ['batch_files_integrity_blockers', batchFilesIntegrityBlockers],
    ['decision_template_integrity_blockers', decisionTemplateIntegrityBlockers],
    ['decision_import_dry_run_blockers', decisionImportDryRunBlockers],
    ['starter_noop_dry_run_blockers', starterNoopDryRunBlockers],
    ['fixture_qa_blockers', fixtureQaBlockers],
    ['priority_audit_blockers', priorityAuditBlockers],
    ['priority_integrity_blockers', priorityIntegrityBlockers],
    ['priority_batches_blockers', priorityBatchesBlockers],
    ['reviewer_execution_work_order_blockers', reviewerExecutionWorkOrderBlockers],
    ['review_starter_pack_blockers', reviewStarterPackBlockers],
    ['review_progress_blockers', reviewProgressBlockers],
    ['self_improving_upgrade_blockers', selfImprovingUpgradeBlockers],
    ['generation_history_blockers', generationHistoryBlockers],
    ['app_atlas_refresh_blockers', appAtlasRefreshBlockers],
    ['app_atlas_unclassified_target_sensitive_files', appAtlasUnclassifiedTargetSensitiveFiles],
    ['domain_registry_v2_blockers', domainRegistryV2Blockers],
    ['domain_registry_v2_ai_prompt_entrypoints_missing', domainRegistryV2AiPromptEntrypointsMissing],
    ['target_research_pack_builder_blockers', targetResearchPackBuilderBlockers],
    ['target_research_pack_verify_blockers', targetResearchPackVerifyBlockers],
    ['target_pedagogy_blueprint_blockers', targetPedagogyBlueprintBlockers],
    ['generation_schema_v2_blockers', generationSchemaV2Blockers],
    ['ai_prompt_contract_v2_blockers', aiPromptContractV2Blockers],
    ['ai_prompt_contract_v2_critical_surface_class_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceClassesExpected - aiPromptContractV2CriticalSurfaceClassesCovered) : 0],
    ['ai_prompt_contract_v2_critical_surface_file_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceRequiredFiles - aiPromptContractV2CriticalSurfaceRequiredFilesCovered) : 0],
    ['ai_prompt_contract_v2_critical_surface_language_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceContracts - aiPromptContractV2CriticalSurfaceLanguageDimensions) : 0],
    ['ai_prompt_contract_v2_critical_surface_cache_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceContracts - aiPromptContractV2CriticalSurfaceCacheContracts) : 0],
    ['ai_prompt_contract_v2_critical_surface_reject_return_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceContracts - aiPromptContractV2CriticalSurfaceRejectBeforeReturn) : 0],
    ['ai_prompt_contract_v2_critical_surface_reject_cache_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceContracts - aiPromptContractV2CriticalSurfaceRejectBeforeCache) : 0],
    ['ai_prompt_contract_v2_critical_surface_safe_fallback_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceContracts - aiPromptContractV2CriticalSurfaceSafeFallback) : 0],
    ['ai_prompt_contract_v2_critical_surface_generation_block_gap', aiPromptContractV2Present ? Math.max(0, aiPromptContractV2CriticalSurfaceContracts - aiPromptContractV2CriticalSurfaceGenerationBlocked) : 0],
    ['content_quality_gates_v2_blockers', contentQualityGatesV2Blockers],
    ['reviewer_workflow_v2_blockers', reviewerWorkflowV2Blockers],
    ['target_pack_manifest_v2_blockers', targetPackManifestV2Blockers],
    ['runtime_server_delivery_contract_v2_blockers', runtimeServerDeliveryContractV2Blockers],
    ['runtime_server_delivery_contract_v2_startup_imports_runtime', runtimeServerDeliveryContractV2StartupImportsRuntime ? 1 : 0],
    ['runtime_server_delivery_contract_v2_loader_network_or_fs_imports', runtimeServerDeliveryContractV2LoaderNetworkOrFsImports ? 1 : 0],
    ['runtime_server_delivery_contract_v2_server_upload_allowed', runtimeServerDeliveryContractV2ServerUploadAllowed ? 1 : 0],
    ['runtime_server_delivery_contract_v2_runtime_downloads_open', runtimeServerDeliveryContractV2RuntimeDownloadsOpenFlags],
    ['storage_cloud_target_map_v2_blockers', storageCloudTargetMapV2Blockers],
    ['storage_cloud_target_map_v2_storage_migration_allowed', storageCloudTargetMapV2StorageMigrationAllowed ? 1 : 0],
    ['storage_cloud_target_map_v2_cloud_sync_migration_allowed', storageCloudTargetMapV2CloudSyncMigrationAllowed ? 1 : 0],
    ['storage_cloud_target_map_v2_firebase_writes_opened', storageCloudTargetMapV2FirebaseWritesOpened ? 1 : 0],
    ['storage_cloud_target_map_v2_ready_for_apply_open', storageCloudTargetMapV2ReadyForApplyOpenFlags],
    ['admin_reviewer_delivery_surface_v2_blockers', adminReviewerDeliverySurfaceV2Blockers],
    ['admin_reviewer_delivery_surface_v2_server_upload_allowed', adminReviewerDeliverySurfaceV2ServerUploadAllowed ? 1 : 0],
    ['admin_reviewer_delivery_surface_v2_firebase_upload_allowed', adminReviewerDeliverySurfaceV2FirebaseUploadAllowed ? 1 : 0],
    ['admin_reviewer_delivery_surface_v2_reviewer_import_allowed', adminReviewerDeliverySurfaceV2ReviewerImportAllowed ? 1 : 0],
    ['admin_reviewer_delivery_surface_v2_runtime_downloads_enabled', adminReviewerDeliverySurfaceV2RuntimeDownloadsEnabled ? 1 : 0],
    ['admin_reviewer_delivery_surface_v2_activation_approved', adminReviewerDeliverySurfaceV2ActivationApprovedFlags],
    ['admin_reviewer_delivery_surface_v2_ready_for_apply_open', adminReviewerDeliverySurfaceV2ReadyForApplyOpenFlags],
    ['reviewer_decision_import_v2_dry_run_blockers', reviewerDecisionImportV2DryRunBlockers],
    ['reviewer_decision_import_v2_dry_run_reviewer_import_open', reviewerDecisionImportV2DryRunReviewerImportOpenFlags],
    ['reviewer_decision_import_v2_dry_run_production_apply_open', reviewerDecisionImportV2DryRunProductionApplyOpenFlags],
    ['reviewer_decision_import_v2_dry_run_activation_approved', reviewerDecisionImportV2DryRunActivationApprovedFlags],
    ['reviewer_decision_import_v2_dry_run_generated_ledger_writes', reviewerDecisionImportV2DryRunGeneratedLedgerWrites ? 1 : 0],
    ['official_source_import_dry_run_v2_not_ready', officialSourceImportDryRunV2Present && !officialSourceImportDryRunV2Ready ? 1 : 0],
    ['official_source_import_dry_run_v2_missing_rows', officialSourceImportDryRunV2Present ? Math.max(0, 1600 - officialSourceImportDryRunV2Rows) : 0],
    ['official_source_import_dry_run_v2_missing_ai', officialSourceImportDryRunV2Present ? Math.max(0, 164 - officialSourceImportDryRunV2Ai) : 0],
    ['official_source_import_dry_run_v2_missing_accepted_rows', officialSourceImportDryRunV2Present ? Math.max(0, 1600 - officialSourceImportDryRunV2AcceptedRows) : 0],
    ['official_source_import_dry_run_v2_missing_accepted_ai', officialSourceImportDryRunV2Present ? Math.max(0, officialSourceImportDryRunV2Ai - officialSourceImportDryRunV2AcceptedAi) : 0],
    ['official_source_import_dry_run_v2_promoted_row_file_not_used', officialSourceImportDryRunV2Present && !officialSourceImportDryRunV2PromotedRowFileUsed ? 1 : 0],
    ['official_source_import_dry_run_v2_promoted_ai_file_not_used', officialSourceImportDryRunV2Present && !officialSourceImportDryRunV2PromotedAiFileUsed ? 1 : 0],
    ['official_source_import_dry_run_v2_not_ready_for_execution_gate_refresh', officialSourceImportDryRunV2Present && !officialSourceImportDryRunV2ReadyForExecutionGateRefresh ? 1 : 0],
    ['official_source_import_dry_run_v2_missing_row_probe_passes', Math.max(0, officialSourceImportDryRunV2RowProbes - officialSourceImportDryRunV2RowProbesPassed)],
    ['official_source_import_dry_run_v2_missing_ai_probe_passes', Math.max(0, officialSourceImportDryRunV2AiProbes - officialSourceImportDryRunV2AiProbesPassed)],
    ['official_source_import_dry_run_v2_ready_for_apply_open', officialSourceImportDryRunV2ReadyForApply ? 1 : 0],
    ['official_source_import_dry_run_v2_may_modify_production_app_files_open', officialSourceImportDryRunV2MayModifyProductionAppFiles ? 1 : 0],
    ['payload_shard_materialization_checksum_v2_blockers', payloadShardMaterializationChecksumV2Blockers],
    ['payload_shard_materialization_checksum_v2_missing_contracts', Math.max(0, 12 - payloadShardMaterializationChecksumV2MaterializationContracts)],
    ['payload_shard_materialization_checksum_v2_missing_sha256_checksum_contracts', Math.max(0, 12 - payloadShardMaterializationChecksumV2ChecksumContractsWithSha256Dimension)],
    ['payload_shard_materialization_checksum_v2_unscoped_future_paths', Math.max(0, 12 - payloadShardMaterializationChecksumV2SourceLocaleScopedFuturePaths)],
    ['payload_shard_materialization_checksum_v2_ui_locale_identity_dimensions', payloadShardMaterializationChecksumV2UiLocaleIdentityDimensions],
    ['payload_shard_materialization_checksum_v2_unaccounted_future_artifacts_present', payloadShardMaterializationChecksumV2UnaccountedFutureArtifactFilesPresent],
    ['payload_shard_materialization_checksum_v2_payload_shards_created', payloadShardMaterializationChecksumV2PayloadShardsCreated],
    ['payload_shard_materialization_checksum_v2_checksum_reports_created', payloadShardMaterializationChecksumV2ChecksumReportsCreated],
    ['payload_shard_materialization_checksum_v2_server_upload_allowed', payloadShardMaterializationChecksumV2ServerUploadAllowed ? 1 : 0],
    ['payload_shard_materialization_checksum_v2_firebase_upload_allowed', payloadShardMaterializationChecksumV2FirebaseUploadAllowed ? 1 : 0],
    ['payload_shard_materialization_checksum_v2_runtime_downloads_enabled', payloadShardMaterializationChecksumV2RuntimeDownloadsEnabled ? 1 : 0],
    ['payload_shard_materialization_checksum_v2_activation_approved', payloadShardMaterializationChecksumV2ActivationApprovedFlags],
    ['server_delivery_manifest_preview_v2_blockers', serverDeliveryManifestPreviewV2Blockers],
    ['server_delivery_manifest_preview_v2_missing_entries', Math.max(0, 12 - serverDeliveryManifestPreviewV2PreviewEntries)],
    ['server_delivery_manifest_preview_v2_missing_gate_refs', Math.max(0, 12 - serverDeliveryManifestPreviewV2EntriesWithGateReportRefs)],
    ['server_delivery_manifest_preview_v2_gate_ref_sha_mismatch', Math.max(0, serverDeliveryManifestPreviewV2GateReportRefsTotal - serverDeliveryManifestPreviewV2GateReportRefsCurrentSha)],
    ['server_delivery_manifest_preview_v2_missing_rollback', Math.max(0, 12 - serverDeliveryManifestPreviewV2EntriesWithRollbackFromVersion)],
    ['server_delivery_manifest_preview_v2_activation_approved_entries', Math.max(0, 12 - serverDeliveryManifestPreviewV2EntriesWithActivationApprovedFalse)],
    ['server_delivery_manifest_preview_v2_missing_sha256_placeholder', Math.max(0, 12 - serverDeliveryManifestPreviewV2EntriesWithSha256Placeholder)],
    ['server_delivery_manifest_preview_v2_missing_byte_size_placeholder', Math.max(0, 12 - serverDeliveryManifestPreviewV2EntriesWithByteSizePlaceholder)],
    ['server_delivery_manifest_preview_v2_missing_checksum_linkage', Math.max(0, 12 - serverDeliveryManifestPreviewV2EntriesWithChecksumLinkage)],
    ['server_delivery_manifest_preview_v2_unscoped_server_paths', Math.max(0, 12 - serverDeliveryManifestPreviewV2SourceLocaleScopedServerPaths)],
    ['server_delivery_manifest_preview_v2_ui_locale_identity_dimensions', serverDeliveryManifestPreviewV2UiLocaleIdentityDimensions],
    ['server_delivery_manifest_preview_v2_server_upload_allowed', serverDeliveryManifestPreviewV2ServerUploadAllowed ? 1 : 0],
    ['server_delivery_manifest_preview_v2_firebase_upload_allowed', serverDeliveryManifestPreviewV2FirebaseUploadAllowed ? 1 : 0],
    ['server_delivery_manifest_preview_v2_runtime_downloads_enabled', serverDeliveryManifestPreviewV2RuntimeDownloadsEnabled ? 1 : 0],
    ['server_delivery_manifest_preview_v2_embedded_index_insertion_allowed', serverDeliveryManifestPreviewV2EmbeddedIndexInsertionAllowed ? 1 : 0],
    ['server_delivery_manifest_preview_v2_activation_approved', serverDeliveryManifestPreviewV2ActivationApprovedFlags],
    ['runtime_cache_integrity_rollback_v2_blockers', runtimeCacheIntegrityRollbackV2Blockers],
    ['runtime_cache_integrity_rollback_v2_missing_cache_contracts', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2CacheIntegrityContracts)],
    ['runtime_cache_integrity_rollback_v2_missing_cache_key_dimensions', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2CacheKeyDimensionContracts)],
    ['runtime_cache_integrity_rollback_v2_ready_state_open', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2ReadyStateBlockedContracts)],
    ['runtime_cache_integrity_rollback_v2_cache_write_open', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2CacheWriteBlockedContracts)],
    ['runtime_cache_integrity_rollback_v2_runtime_download_open', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2RuntimeDownloadBlockedContracts)],
    ['runtime_cache_integrity_rollback_v2_checksum_mismatch_not_quarantined', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2ChecksumMismatchQuarantineContracts)],
    ['runtime_cache_integrity_rollback_v2_byte_size_mismatch_not_quarantined', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2ByteSizeMismatchQuarantineContracts)],
    ['runtime_cache_integrity_rollback_v2_source_locale_mismatch_not_rejected', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2SourceLocaleMismatchRejectContracts)],
    ['runtime_cache_integrity_rollback_v2_study_target_mismatch_not_rejected', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2StudyTargetMismatchRejectContracts)],
    ['runtime_cache_integrity_rollback_v2_offline_fallback_without_prior_version', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2OfflineFallbackRequiresPriorVersionContracts)],
    ['runtime_cache_integrity_rollback_v2_missing_rollback_simulation', Math.max(0, 12 - runtimeCacheIntegrityRollbackV2RollbackSimulationContracts)],
    ['runtime_cache_integrity_rollback_v2_ui_locale_identity_dimensions', runtimeCacheIntegrityRollbackV2UiLocaleIdentityDimensions],
    ['runtime_cache_integrity_rollback_v2_runtime_downloads_enabled', runtimeCacheIntegrityRollbackV2RuntimeDownloadsEnabled ? 1 : 0],
    ['runtime_cache_integrity_rollback_v2_cache_writes_opened', runtimeCacheIntegrityRollbackV2CacheWritesOpened ? 1 : 0],
    ['runtime_cache_integrity_rollback_v2_ready_cache_state_opened', runtimeCacheIntegrityRollbackV2ReadyCacheStateOpened ? 1 : 0],
    ['runtime_cache_integrity_rollback_v2_server_upload_allowed', runtimeCacheIntegrityRollbackV2ServerUploadAllowed ? 1 : 0],
    ['runtime_cache_integrity_rollback_v2_activation_approved', runtimeCacheIntegrityRollbackV2ActivationApprovedFlags],
    ['reviewer_decision_import_opening_preflight_v2_blockers', reviewerDecisionImportOpeningPreflightV2Blockers],
    ['reviewer_decision_import_opening_preflight_v2_reviewer_import_allowed_now', reviewerDecisionImportOpeningPreflightV2ReviewerImportAllowedNow ? 1 : 0],
    ['reviewer_decision_import_opening_preflight_v2_activation_eligible_without_full_rows', reviewerDecisionImportOpeningPreflightV2OpeningEligible && reviewerDecisionImportOpeningPreflightV2ReviewedRowDecisions < 1600 ? 1 : 0],
    ['reviewer_decision_import_opening_preflight_v2_activation_eligible_without_full_ai', reviewerDecisionImportOpeningPreflightV2OpeningEligible && reviewerDecisionImportOpeningPreflightV2ReviewedAiDecisions < 164 ? 1 : 0],
    ['reviewer_decision_import_opening_preflight_v2_missing_probe_passes', Math.max(0, reviewerDecisionImportOpeningPreflightV2FixtureProbes - reviewerDecisionImportOpeningPreflightV2FixtureProbesPassed)],
    ['llm_official_source_review_intake_v2_blockers', llmOfficialSourceReviewIntakeV2Blockers],
    ['llm_official_source_review_intake_v2_reviewer_import_allowed_now', llmOfficialSourceReviewIntakeV2ReviewerImportAllowedNow ? 1 : 0],
    ['llm_official_source_review_intake_v2_payload_ready_without_full_rows', llmOfficialSourceReviewIntakeV2PayloadCreationApprovalPreflightReady && llmOfficialSourceReviewIntakeV2ReviewedRowDecisions < 1600 ? 1 : 0],
    ['llm_official_source_review_intake_v2_payload_ready_without_full_ai', llmOfficialSourceReviewIntakeV2PayloadCreationApprovalPreflightReady && llmOfficialSourceReviewIntakeV2ReviewedAiDecisions < 164 ? 1 : 0],
    ['llm_official_source_review_intake_v2_missing_probe_passes', Math.max(0, llmOfficialSourceReviewIntakeV2FixtureProbes - llmOfficialSourceReviewIntakeV2FixtureProbesPassed)],
    ['reviewer_decision_import_execution_gate_v2_blockers', reviewerDecisionImportExecutionGateV2Blockers],
    ['reviewer_decision_import_execution_gate_v2_would_run_without_full_rows', reviewerDecisionImportExecutionGateV2WouldRun && reviewerDecisionImportExecutionGateV2ReviewedRowDecisions < 1600 ? 1 : 0],
    ['reviewer_decision_import_execution_gate_v2_would_run_without_full_ai', reviewerDecisionImportExecutionGateV2WouldRun && reviewerDecisionImportExecutionGateV2ReviewedAiDecisions < 164 ? 1 : 0],
    ['reviewer_decision_import_execution_gate_v2_would_run_without_full_accepted_rows', reviewerDecisionImportExecutionGateV2WouldRun && reviewerDecisionImportExecutionGateV2AcceptedRowDecisions < 1600 ? 1 : 0],
    ['reviewer_decision_import_execution_gate_v2_would_run_without_full_accepted_ai', reviewerDecisionImportExecutionGateV2WouldRun && reviewerDecisionImportExecutionGateV2AcceptedAiDecisions < 164 ? 1 : 0],
    ['reviewer_decision_import_execution_gate_v2_upstream_counts_mismatch', reviewerDecisionImportExecutionGateV2Present && !reviewerDecisionImportExecutionGateV2UpstreamCountsConsistent ? 1 : 0],
    ['reviewer_decision_import_execution_gate_v2_missing_probe_passes', Math.max(0, reviewerDecisionImportExecutionGateV2FixtureProbes - reviewerDecisionImportExecutionGateV2FixtureProbesPassed)],
    ['official_source_import_execution_gate_v2_not_ready', reviewerDecisionImportExecutionGateV2Present && !officialSourceImportExecutionGateV2Ready ? 1 : 0],
    ['official_source_import_execution_gate_v2_wrong_state', reviewerDecisionImportExecutionGateV2Present && officialSourceImportExecutionGateV2State !== 'eligible_llm_official_source_review' ? 1 : 0],
    ['official_source_import_execution_gate_v2_would_not_run', reviewerDecisionImportExecutionGateV2Present && !officialSourceImportExecutionGateV2WouldRun ? 1 : 0],
    ['official_source_import_execution_gate_v2_p13_coverage_not_ready', reviewerDecisionImportExecutionGateV2Present && !officialSourceImportExecutionGateV2P13CoverageReady ? 1 : 0],
    ['official_source_import_execution_gate_v2_promoted_row_file_not_used', reviewerDecisionImportExecutionGateV2Present && !officialSourceImportExecutionGateV2PromotedRowFileUsed ? 1 : 0],
    ['official_source_import_execution_gate_v2_promoted_ai_file_not_used', reviewerDecisionImportExecutionGateV2Present && !officialSourceImportExecutionGateV2PromotedAiFileUsed ? 1 : 0],
    ['official_source_import_execution_gate_v2_not_ready_for_payload_preflight', reviewerDecisionImportExecutionGateV2Present && !officialSourceImportExecutionGateV2ReadyForPayloadCreationApprovalPreflight ? 1 : 0],
    ['official_source_import_execution_gate_v2_missing_probe_passes', Math.max(0, officialSourceImportExecutionGateV2FixtureProbes - officialSourceImportExecutionGateV2FixtureProbesPassed)],
    ['official_source_import_execution_gate_v2_ready_for_apply_open', officialSourceImportExecutionGateV2ReadyForApply ? 1 : 0],
    ['official_source_import_execution_gate_v2_may_modify_production_app_files_open', officialSourceImportExecutionGateV2MayModifyProductionAppFiles ? 1 : 0],
    ['llm_official_source_decision_materialization_v2_blockers', llmOfficialSourceDecisionMaterializationV2Blockers],
    ['llm_official_source_decision_materialization_v2_non_llm_review_dependency_required', llmOfficialSourceDecisionMaterializationV2NonLlmReviewDependencyRequired ? 1 : 0],
    ['llm_official_source_decision_materialization_v2_not_ready_for_dry_run', llmOfficialSourceDecisionMaterializationV2Present && !llmOfficialSourceDecisionMaterializationV2ReadyForDryRun ? 1 : 0],
    ['llm_official_source_decision_dry_run_v2_blockers', llmOfficialSourceDecisionDryRunV2Blockers],
    ['llm_official_source_decision_dry_run_v2_missing_row_proposals', Math.max(0, 1600 - llmOfficialSourceDecisionDryRunV2RowCandidateProposals)],
    ['llm_official_source_decision_dry_run_v2_missing_ai_proposals', Math.max(0, 164 - llmOfficialSourceDecisionDryRunV2AiCandidateProposals)],
    ['llm_official_source_decision_dry_run_v2_accepted_row_candidates', llmOfficialSourceDecisionDryRunV2AcceptedRowCandidates],
    ['llm_official_source_decision_dry_run_v2_accepted_ai_candidates', llmOfficialSourceDecisionDryRunV2AcceptedAiCandidates],
    ['llm_official_source_decision_dry_run_v2_output_not_confined', llmOfficialSourceDecisionDryRunV2Present && !llmOfficialSourceDecisionDryRunV2CandidateWritesConfined ? 1 : 0],
    ['llm_official_source_decision_dry_run_v2_not_ready_for_promotion_preflight', llmOfficialSourceDecisionDryRunV2Present && !llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight ? 1 : 0],
    ['llm_official_source_decision_promotion_preflight_v2_blockers', llmOfficialSourceDecisionPromotionPreflightV2Blockers],
    ['llm_official_source_decision_promotion_preflight_v2_missing_row_proposals', Math.max(0, 1600 - llmOfficialSourceDecisionPromotionPreflightV2RowCandidateProposals)],
    ['llm_official_source_decision_promotion_preflight_v2_missing_ai_proposals', Math.max(0, 164 - llmOfficialSourceDecisionPromotionPreflightV2AiCandidateProposals)],
    ['llm_official_source_decision_promotion_preflight_v2_accepted_row_candidates', llmOfficialSourceDecisionPromotionPreflightV2AcceptedRowCandidates],
    ['llm_official_source_decision_promotion_preflight_v2_accepted_ai_candidates', llmOfficialSourceDecisionPromotionPreflightV2AcceptedAiCandidates],
    ['llm_official_source_decision_promotion_preflight_v2_promoted_files_written', llmOfficialSourceDecisionPromotionPreflightV2State === 'contract_superseded_by_promoted_decisions' ? 0 : llmOfficialSourceDecisionPromotionPreflightV2PromotedDecisionFilesWritten],
    ['llm_official_source_decision_promotion_preflight_v2_targets_not_confined', llmOfficialSourceDecisionPromotionPreflightV2Present && !llmOfficialSourceDecisionPromotionPreflightV2FutureTargetsConfined ? 1 : 0],
    ['llm_official_source_decision_promotion_preflight_v2_row_target_not_separate', llmOfficialSourceDecisionPromotionPreflightV2Present && !llmOfficialSourceDecisionPromotionPreflightV2FutureRowTargetSeparate ? 1 : 0],
    ['llm_official_source_decision_promotion_preflight_v2_ai_target_not_separate', llmOfficialSourceDecisionPromotionPreflightV2Present && !llmOfficialSourceDecisionPromotionPreflightV2FutureAiTargetSeparate ? 1 : 0],
    ['llm_official_source_decision_promotion_preflight_v2_not_ready_for_generation', llmOfficialSourceDecisionPromotionPreflightV2Present && !llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration ? 1 : 0],
    ['llm_official_source_promoted_decision_file_generation_v2_blockers', llmOfficialSourcePromotedDecisionFileGenerationV2Blockers],
    ['llm_official_source_promoted_decision_file_generation_v2_missing_row_decisions', Math.max(0, 1600 - llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRowDecisions)],
    ['llm_official_source_promoted_decision_file_generation_v2_missing_ai_decisions', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions)],
    ['llm_official_source_promoted_decision_file_generation_v2_missing_row_evidence_notes', Math.max(0, 1600 - llmOfficialSourcePromotedDecisionFileGenerationV2RowsWithEvidenceNotes)],
    ['llm_official_source_promoted_decision_file_generation_v2_missing_ai_evidence_notes', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2AiWithEvidenceNotes)],
    ['llm_official_source_promoted_decision_file_generation_v2_open_flags', llmOfficialSourcePromotedDecisionFileGenerationV2OpenFlags],
    ['llm_official_source_promoted_decision_file_generation_v2_output_not_confined', llmOfficialSourcePromotedDecisionFileGenerationV2Present && !llmOfficialSourcePromotedDecisionFileGenerationV2OutputTargetsConfined ? 1 : 0],
    ['llm_official_source_promoted_decision_file_generation_v2_not_ready_for_import_refresh', llmOfficialSourcePromotedDecisionFileGenerationV2Present && !llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh ? 1 : 0],
    ['llm_official_source_promoted_decision_file_generation_v2_ai_prompt_contract_not_ready', llmOfficialSourcePromotedDecisionFileGenerationV2Present && !llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractReady ? 1 : 0],
    ['llm_official_source_promoted_decision_file_generation_v2_ai_prompt_contract_entrypoint_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractEntrypoints)],
    ['llm_official_source_promoted_decision_file_generation_v2_ai_prompt_contract_unique_id_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractUniqueIds)],
    ['llm_official_source_promoted_decision_file_generation_v2_ai_prompt_contract_critical_gap', Math.max(0, 55 - llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractCriticalContracts)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_unique_id_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiUniqueContractIds)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_duplicate_contracts', llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDuplicateContractIds],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_prompt_contract_match_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMatchedToPromptContracts)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_extra_contracts', llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiExtraContracts],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_missing_contracts', llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMissingContracts],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_critical_match_gap', Math.max(0, 55 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContractsMatched)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_domain_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDomainMatchedToPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_file_path_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFilePathMatchedToPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_feature_risk_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFeatureRiskClassMatchedToPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_risk_level_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRiskLevelMatchedToPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_target_locale_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetLocaleMatchedToPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_source_locales_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiSourceLocalesMatchedToPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_cache_dimension_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCacheDimensionsMatchedToPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_wrong_language_gate_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageGatePassed)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_reject_return_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshReturnClosedByPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_reject_cache_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshCacheClosedByPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_quality_gate_close_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetOutputBeforeQualityClosedByPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_promoted_ai_wrong_language_fallback_gap', Math.max(0, 164 - llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageFallbackClosedByPromptContract)],
    ['llm_official_source_promoted_decision_file_generation_v2_missing_probe_passes', Math.max(0, llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes - llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed)],
    ['legacy_generated_research_evidence_bridge_v2_blockers', legacyGeneratedResearchEvidenceBridgeV2Blockers],
    ['legacy_generated_research_evidence_bridge_v2_not_ready', !legacyGeneratedResearchEvidenceBridgeV2Ready ? 1 : 0],
    ['legacy_generated_research_evidence_bridge_v2_missing_legacy_rows', Math.max(0, 1600 - legacyGeneratedResearchEvidenceBridgeV2LegacyRows)],
    ['legacy_generated_research_evidence_bridge_v2_missing_promoted_rows', Math.max(0, 1600 - legacyGeneratedResearchEvidenceBridgeV2PromotedRows)],
    ['legacy_generated_research_evidence_bridge_v2_missing_row_identity_matches', Math.max(0, 1600 - legacyGeneratedResearchEvidenceBridgeV2RowIdentityMatched)],
    ['legacy_generated_research_evidence_bridge_v2_missing_row_research_evidence', Math.max(0, 1600 - legacyGeneratedResearchEvidenceBridgeV2RowsWithResearchEvidenceIds)],
    ['legacy_generated_research_evidence_bridge_v2_missing_row_gate_passes', Math.max(0, 1600 - legacyGeneratedResearchEvidenceBridgeV2RowsWithAllRequiredGatesPassed)],
    ['legacy_generated_research_evidence_bridge_v2_missing_ai_decisions', Math.max(0, 164 - legacyGeneratedResearchEvidenceBridgeV2AiDecisions)],
    ['legacy_generated_research_evidence_bridge_v2_high_risk_ai_research_gap', Math.max(0, legacyGeneratedResearchEvidenceBridgeV2HighRiskAiDecisions - legacyGeneratedResearchEvidenceBridgeV2HighRiskAiWithResearchGate)],
    ['legacy_generated_research_evidence_bridge_v2_missing_ai_language_gate_passes', Math.max(0, 164 - legacyGeneratedResearchEvidenceBridgeV2AiLanguageGatesPassed)],
    ['legacy_generated_research_evidence_bridge_v2_missing_ai_official_source_notes', Math.max(0, 164 - legacyGeneratedResearchEvidenceBridgeV2AiWithOfficialSourceNotes)],
    ['legacy_generated_research_evidence_bridge_v2_dry_run_not_ready', legacyGeneratedResearchEvidenceBridgeV2Present && !legacyGeneratedResearchEvidenceBridgeV2DryRunReady ? 1 : 0],
    ['legacy_generated_research_evidence_bridge_v2_missing_probe_passes', Math.max(0, legacyGeneratedResearchEvidenceBridgeV2FixtureProbes - legacyGeneratedResearchEvidenceBridgeV2FixtureProbesPassed)],
    ['legacy_generated_research_evidence_bridge_v2_ready_for_apply_open', legacyGeneratedResearchEvidenceBridgeV2ReadyForApply ? 1 : 0],
    ['legacy_generated_research_evidence_bridge_v2_may_modify_production_app_files_open', legacyGeneratedResearchEvidenceBridgeV2MayModifyProductionAppFiles ? 1 : 0],
    ['payload_creation_approval_preflight_v2_blockers', payloadCreationApprovalPreflightV2Blockers],
    ['payload_creation_approval_preflight_v2_not_ready_for_closed_materialization', payloadCreationApprovalPreflightV2Present && !payloadCreationApprovalPreflightV2ReadyForClosedPayloadMaterialization ? 1 : 0],
    ['payload_creation_approval_preflight_v2_hash_check_failures', Math.max(0, payloadCreationApprovalPreflightV2HashChecks - payloadCreationApprovalPreflightV2HashChecksPassed)],
    ['payload_creation_approval_preflight_v2_missing_probe_passes', Math.max(0, payloadCreationApprovalPreflightV2FixtureProbes - payloadCreationApprovalPreflightV2FixtureProbesPassed)],
    ['payload_creation_approval_preflight_v2_ready_for_apply_open', payloadCreationApprovalPreflightV2ReadyForApply ? 1 : 0],
    ['closed_local_payload_materialization_v2_blockers', closedLocalPayloadMaterializationV2Blockers],
    ['closed_local_payload_materialization_v2_missing_slices', Math.max(0, 12 - closedLocalPayloadMaterializationV2RuntimeSlices)],
    ['closed_local_payload_materialization_v2_not_ready_for_server_preflight', closedLocalPayloadMaterializationV2Present && !closedLocalPayloadMaterializationV2ReadyForServerDeliveryPublishPreflight ? 1 : 0],
    ['closed_local_payload_materialization_v2_checksum_mismatches', closedLocalPayloadMaterializationV2ChecksumMismatches],
    ['closed_local_payload_materialization_v2_missing_probe_passes', Math.max(0, closedLocalPayloadMaterializationV2FixtureProbes - closedLocalPayloadMaterializationV2FixtureProbesPassed)],
    ['closed_local_payload_materialization_v2_ready_for_apply_open', closedLocalPayloadMaterializationV2ReadyForApply ? 1 : 0],
    ['server_delivery_publish_preflight_v2_blockers', serverDeliveryPublishPreflightV2SupersededByProductionGate ? 0 : serverDeliveryPublishPreflightV2Blockers],
    ['server_delivery_publish_preflight_v2_missing_entries', Math.max(0, 12 - serverDeliveryPublishPreflightV2ManifestEntries)],
    ['server_delivery_publish_preflight_v2_missing_actual_sha', Math.max(0, 12 - serverDeliveryPublishPreflightV2ActualShaEntries)],
    ['server_delivery_publish_preflight_v2_missing_actual_byte_size', Math.max(0, 12 - serverDeliveryPublishPreflightV2ActualByteSizeEntries)],
    ['server_delivery_publish_preflight_v2_checksum_mismatches', serverDeliveryPublishPreflightV2ChecksumMismatches],
    ['server_delivery_publish_preflight_v2_not_ready_for_admin_review', serverDeliveryPublishPreflightV2Present && !serverDeliveryPublishPreflightV2SupersededByProductionGate && !serverDeliveryPublishPreflightV2ReadyForAdminServerDeliveryReview ? 1 : 0],
    ['server_delivery_publish_preflight_v2_missing_probe_passes', serverDeliveryPublishPreflightV2SupersededByProductionGate ? 0 : Math.max(0, serverDeliveryPublishPreflightV2FixtureProbes - serverDeliveryPublishPreflightV2FixtureProbesPassed)],
    ['server_delivery_publish_preflight_v2_ready_for_apply_open', serverDeliveryPublishPreflightV2ReadyForApply ? 1 : 0],
    ['production_server_manifest_publish_gate_v2_blockers', productionServerManifestPublishGateV2Blockers],
    ['production_server_manifest_publish_gate_v2_wrong_state', productionServerManifestPublishGateV2Present && productionServerManifestPublishGateV2State !== 'production_server_manifest_ready_for_activation_gate' ? 1 : 0],
    ['production_server_manifest_publish_gate_v2_not_ready_for_runtime_download_activation', productionServerManifestPublishGateV2Present && !productionServerManifestPublishGateV2ReadyForRuntimeDownloadActivation ? 1 : 0],
    ['production_server_manifest_publish_gate_v2_not_fresh_after_server_preflight', productionServerManifestPublishGateV2Present && !productionServerManifestPublishGateV2FreshAfterServerPreflight ? 1 : 0],
    ['production_server_manifest_publish_gate_v2_missing_probe_passes', Math.max(0, productionServerManifestPublishGateV2FixtureProbes - productionServerManifestPublishGateV2FixtureProbesPassed)],
    ['french_upload_remote_verify_parity_v2_missing', !frenchUploadRemoteVerifyParityV2Present ? 1 : 0],
    ['french_upload_remote_verify_parity_v2_blockers', frenchUploadRemoteVerifyParityV2Blockers],
    ['french_upload_remote_verify_parity_v2_not_ready_for_remote_object_verify', frenchUploadRemoteVerifyParityV2Present && !frenchUploadRemoteVerifyParityV2ReadyForRemoteObjectVerify ? 1 : 0],
    ['french_upload_remote_verify_parity_v2_missing_matched_server_paths', Math.max(0, 36 - frenchUploadRemoteVerifyParityV2MatchedServerPaths)],
    ['french_upload_remote_verify_parity_v2_missing_sha_matches', Math.max(0, 36 - frenchUploadRemoteVerifyParityV2ShaMatches)],
    ['french_upload_remote_verify_parity_v2_missing_byte_matches', Math.max(0, 36 - frenchUploadRemoteVerifyParityV2ByteMatches)],
    ['french_upload_remote_verify_parity_v2_upload_only_paths', frenchUploadRemoteVerifyParityV2UploadOnlyPaths],
    ['french_upload_remote_verify_parity_v2_dry_run_only_paths', frenchUploadRemoteVerifyParityV2DryRunOnlyPaths],
    ['french_upload_remote_verify_parity_v2_not_fresh_after_production_manifest_gate', frenchUploadRemoteVerifyParityV2Present && !frenchUploadRemoteVerifyParityV2FreshAfterRemoteDryRun ? 1 : 0],
    ['french_server_object_remote_verify_v2_blockers', frenchServerObjectRemoteVerifyV2Blockers],
    ['french_server_object_remote_verify_v2_not_ready_for_runtime_download_activation', frenchServerObjectRemoteVerifyV2Present && !frenchServerObjectRemoteVerifyV2ReadyForRuntimeDownloadActivation ? 1 : 0],
    ['french_server_object_remote_verify_v2_missing_hash_checked_objects', frenchServerObjectRemoteVerifyV2Present ? Math.max(0, 36 - frenchServerObjectRemoteVerifyV2HashCheckedObjects) : 0],
    ['french_server_object_remote_verify_v2_missing_objects', frenchServerObjectRemoteVerifyV2MissingObjects],
    ['french_server_object_remote_verify_v2_size_mismatches', frenchServerObjectRemoteVerifyV2SizeMismatches],
    ['french_server_object_remote_verify_v2_hash_mismatches', frenchServerObjectRemoteVerifyV2HashMismatches],
    ['french_server_object_remote_verify_v2_not_fresh_after_production_manifest_gate', frenchServerObjectRemoteVerifyV2Present && !frenchServerObjectRemoteVerifyV2FreshAfterProductionManifestGate ? 1 : 0],
    ['french_server_object_remote_verify_v2_missing_probe_passes', Math.max(0, frenchServerObjectRemoteVerifyV2FixtureProbes - frenchServerObjectRemoteVerifyV2FixtureProbesPassed)],
    ['admin_server_delivery_runtime_preflight_v2_blockers', adminServerDeliveryRuntimePreflightV2Blockers],
    ['admin_server_delivery_runtime_preflight_v2_missing_manifest_entries', Math.max(0, 12 - adminServerDeliveryRuntimePreflightV2ManifestEntries)],
    ['admin_server_delivery_runtime_preflight_v2_admin_not_ready', adminServerDeliveryRuntimePreflightV2Present && !adminServerDeliveryRuntimePreflightV2AdminReady ? 1 : 0],
    ['admin_server_delivery_runtime_preflight_v2_runtime_not_ready', adminServerDeliveryRuntimePreflightV2Present && !adminServerDeliveryRuntimePreflightV2RuntimeReady ? 1 : 0],
    ['admin_server_delivery_runtime_preflight_v2_storage_not_ready', adminServerDeliveryRuntimePreflightV2Present && !adminServerDeliveryRuntimePreflightV2StorageReady ? 1 : 0],
    ['admin_server_delivery_runtime_preflight_v2_not_ready_for_activation_blocker_plan', adminServerDeliveryRuntimePreflightV2Present && !adminServerDeliveryRuntimePreflightV2ReadyForRuntimeActivationBlockerPlanning ? 1 : 0],
    ['admin_server_delivery_runtime_preflight_v2_missing_probe_passes', Math.max(0, adminServerDeliveryRuntimePreflightV2FixtureProbes - adminServerDeliveryRuntimePreflightV2FixtureProbesPassed)],
    ['admin_server_delivery_runtime_preflight_v2_ready_for_apply_open', adminServerDeliveryRuntimePreflightV2ReadyForApply ? 1 : 0],
    ['runtime_activation_blocker_plan_v2_blockers', runtimeActivationBlockerPlanV2Blockers],
    ['runtime_activation_blocker_plan_v2_missing_plan_items', Math.max(0, 9 - runtimeActivationBlockerPlanV2PlanItems)],
    ['runtime_activation_blocker_plan_v2_missing_planned_touches', Math.max(0, 18 - runtimeActivationBlockerPlanV2PlannedTouches)],
    ['runtime_activation_blocker_plan_v2_not_ready_for_approval_receipt_gate', runtimeActivationBlockerPlanV2Present && !runtimeActivationBlockerPlanV2ReadyForExplicitApprovalReceiptGate ? 1 : 0],
    ['runtime_activation_blocker_plan_v2_missing_probe_passes', Math.max(0, runtimeActivationBlockerPlanV2FixtureProbes - runtimeActivationBlockerPlanV2FixtureProbesPassed)],
    ['runtime_activation_blocker_plan_v2_ready_for_apply_open', runtimeActivationBlockerPlanV2ReadyForApply ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_blockers', runtimeDeliveryEvidenceChainV2Blockers],
    ['runtime_delivery_evidence_chain_v2_not_ready', !runtimeDeliveryEvidenceChainV2Ready ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_upstream_not_pass', Math.max(0, 9 - runtimeDeliveryEvidenceChainV2UpstreamReportsPass)],
    ['runtime_delivery_evidence_chain_v2_upstream_blockers', runtimeDeliveryEvidenceChainV2UpstreamReportBlockers],
    ['runtime_delivery_evidence_chain_v2_missing_preview_entries', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2PreviewEntries)],
    ['runtime_delivery_evidence_chain_v2_missing_preview_sha_placeholders', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2PreviewShaPlaceholders)],
    ['runtime_delivery_evidence_chain_v2_missing_manifest_entries', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2PublishManifestEntries)],
    ['runtime_delivery_evidence_chain_v2_missing_actual_sha', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2ActualShaEntries)],
    ['runtime_delivery_evidence_chain_v2_missing_actual_byte_size', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2ActualByteSizeEntries)],
    ['runtime_delivery_evidence_chain_v2_missing_payload_sha_matches', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2ManifestPayloadShaMatches)],
    ['runtime_delivery_evidence_chain_v2_missing_index_sha_matches', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2ManifestIndexShaMatches)],
    ['runtime_delivery_evidence_chain_v2_missing_slice_manifest_sha_matches', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2ManifestSliceManifestShaMatches)],
    ['runtime_delivery_evidence_chain_v2_missing_checksum_reports', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2ManifestChecksumReportsPresent)],
    ['runtime_delivery_evidence_chain_v2_missing_rollback_contracts', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2RuntimeRollbackSimulationContracts)],
    ['runtime_delivery_evidence_chain_v2_missing_source_locale_rejects', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2RuntimeSourceLocaleMismatchRejectContracts)],
    ['runtime_delivery_evidence_chain_v2_missing_study_target_rejects', Math.max(0, 12 - runtimeDeliveryEvidenceChainV2RuntimeStudyTargetMismatchRejectContracts)],
    ['runtime_delivery_evidence_chain_v2_admin_not_ready', runtimeDeliveryEvidenceChainV2Present && !runtimeDeliveryEvidenceChainV2AdminReady ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_runtime_not_ready', runtimeDeliveryEvidenceChainV2Present && !runtimeDeliveryEvidenceChainV2RuntimeReady ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_storage_not_ready', runtimeDeliveryEvidenceChainV2Present && !runtimeDeliveryEvidenceChainV2StorageReady ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_transitions_open', runtimeDeliveryEvidenceChainV2Present && !runtimeDeliveryEvidenceChainV2ClosedTransitions ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_not_ready_for_exact_approval_wait', runtimeDeliveryEvidenceChainV2Present && !runtimeDeliveryEvidenceChainV2ReadyForExactApprovalWaitState ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_missing_probe_passes', Math.max(0, runtimeDeliveryEvidenceChainV2FixtureProbes - runtimeDeliveryEvidenceChainV2FixtureProbesPassed)],
    ['runtime_delivery_evidence_chain_v2_ready_for_apply_open', runtimeDeliveryEvidenceChainV2ReadyForApply ? 1 : 0],
    ['runtime_delivery_evidence_chain_v2_may_modify_production_app_files_open', runtimeDeliveryEvidenceChainV2MayModifyProductionAppFiles ? 1 : 0],
    ['explicit_approval_receipt_hash_lock_gate_v2_blockers', explicitApprovalReceiptHashLockGateV2Blockers],
    ['explicit_approval_receipt_hash_lock_gate_v2_missing_hash_locks', explicitApprovalReceiptHashLockGateV2Present ? Math.max(0, 12 - explicitApprovalReceiptHashLockGateV2CriticalHashLocks) : 0],
    ['explicit_approval_receipt_hash_lock_gate_v2_not_ready_for_approval_request', explicitApprovalReceiptHashLockGateV2Present && !explicitApprovalReceiptHashLockGateV2ReadyForApprovalRequestPresentation ? 1 : 0],
    ['explicit_approval_receipt_hash_lock_gate_v2_active_approval_receipt_open', explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists ? 1 : 0],
    ['explicit_approval_receipt_hash_lock_gate_v2_active_hash_lock_open', explicitApprovalReceiptHashLockGateV2ActiveHashLockExists ? 1 : 0],
    ['explicit_approval_receipt_hash_lock_gate_v2_missing_probe_passes', Math.max(0, explicitApprovalReceiptHashLockGateV2FixtureProbes - explicitApprovalReceiptHashLockGateV2FixtureProbesPassed)],
    ['explicit_approval_receipt_hash_lock_gate_v2_ready_for_apply_open', explicitApprovalReceiptHashLockGateV2ReadyForApply ? 1 : 0],
    ['activation_approval_request_presentation_v2_blockers', activationApprovalRequestPresentationV2Blockers],
    ['activation_approval_request_presentation_v2_missing_hash_locks', activationApprovalRequestPresentationV2Present ? Math.max(0, 12 - activationApprovalRequestPresentationV2CriticalHashLocks) : 0],
    ['activation_approval_request_presentation_v2_not_ready_for_receipt_creation_gate', activationApprovalRequestPresentationV2Present && !activationApprovalRequestPresentationV2ReadyForExplicitApprovalReceiptCreationGate ? 1 : 0],
    ['activation_approval_request_presentation_v2_active_approval_receipt_open', activationApprovalRequestPresentationV2ActiveApprovalReceiptExists ? 1 : 0],
    ['activation_approval_request_presentation_v2_active_hash_lock_open', activationApprovalRequestPresentationV2ActiveHashLockExists ? 1 : 0],
    ['activation_approval_request_presentation_v2_missing_probe_passes', Math.max(0, activationApprovalRequestPresentationV2FixtureProbes - activationApprovalRequestPresentationV2FixtureProbesPassed)],
    ['activation_approval_request_presentation_v2_ready_for_apply_open', activationApprovalRequestPresentationV2ReadyForApply ? 1 : 0],
    ['explicit_approval_receipt_creation_gate_v2_blockers', explicitApprovalReceiptCreationGateV2Blockers],
    ['explicit_approval_receipt_creation_gate_v2_plain_continue_not_rejected', explicitApprovalReceiptCreationGateV2Present && !explicitApprovalReceiptCreationGateV2PlainContinueRejected ? 1 : 0],
    ['explicit_approval_receipt_creation_gate_v2_active_approval_receipt_created', explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated ? 1 : 0],
    ['explicit_approval_receipt_creation_gate_v2_active_hash_lock_created', explicitApprovalReceiptCreationGateV2ActiveHashLockCreated ? 1 : 0],
    ['explicit_approval_receipt_creation_gate_v2_cannot_continue_non_production_audit', explicitApprovalReceiptCreationGateV2Present && !explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit ? 1 : 0],
    ['explicit_approval_receipt_creation_gate_v2_missing_probe_passes', Math.max(0, explicitApprovalReceiptCreationGateV2FixtureProbes - explicitApprovalReceiptCreationGateV2FixtureProbesPassed)],
    ['explicit_approval_receipt_creation_gate_v2_ready_for_apply_open', explicitApprovalReceiptCreationGateV2ReadyForApply ? 1 : 0],
    ['production_apply_absence_denial_gate_v2_blockers', productionApplyAbsenceDenialGateV2Blockers],
    ['production_apply_absence_denial_gate_v2_not_denied', productionApplyAbsenceDenialGateV2Present && !productionApplyAbsenceDenialGateV2ApplyDenied ? 1 : 0],
    ['production_apply_absence_denial_gate_v2_wrong_state', productionApplyAbsenceDenialGateV2Present && productionApplyAbsenceDenialGateV2State !== 'production_apply_denied_missing_active_approval_artifacts' ? 1 : 0],
    ['production_apply_absence_denial_gate_v2_active_approval_receipt_open', productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists ? 1 : 0],
    ['production_apply_absence_denial_gate_v2_active_hash_lock_open', productionApplyAbsenceDenialGateV2ActiveHashLockExists ? 1 : 0],
    ['production_apply_absence_denial_gate_v2_cannot_continue_non_production_audit', productionApplyAbsenceDenialGateV2Present && !productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit ? 1 : 0],
    ['production_apply_absence_denial_gate_v2_not_ready_for_non_production_continuation', productionApplyAbsenceDenialGateV2Present && !productionApplyAbsenceDenialGateV2ReadyForNonProductionContinuation ? 1 : 0],
    ['production_apply_absence_denial_gate_v2_missing_probe_passes', Math.max(0, productionApplyAbsenceDenialGateV2FixtureProbes - productionApplyAbsenceDenialGateV2FixtureProbesPassed)],
    ['production_apply_absence_denial_gate_v2_ready_for_apply_open', productionApplyAbsenceDenialGateV2ReadyForApply ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_blockers', nonproductionBlockerClosurePlanV2Blockers],
    ['nonproduction_blocker_closure_plan_v2_wrong_state', nonproductionBlockerClosurePlanV2Present && nonproductionBlockerClosurePlanV2State !== 'nonproduction_closure_plan_ready' ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_chain_not_ready', nonproductionBlockerClosurePlanV2Present && !nonproductionBlockerClosurePlanV2ChainReady ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_no_safe_items', nonproductionBlockerClosurePlanV2Present && nonproductionBlockerClosurePlanV2SafeItems <= 0 ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_no_exact_approval_items', nonproductionBlockerClosurePlanV2Present && nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems <= 0 ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_no_production_locked_items', nonproductionBlockerClosurePlanV2Present && nonproductionBlockerClosurePlanV2ProductionLockedItems <= 0 ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_missing_next_safe_item', nonproductionBlockerClosurePlanV2Present && nonproductionBlockerClosurePlanV2RecommendedNextSafeItem === '' ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_not_ready_for_next_pass', nonproductionBlockerClosurePlanV2Present && !nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_missing_probe_passes', Math.max(0, nonproductionBlockerClosurePlanV2FixtureProbes - nonproductionBlockerClosurePlanV2FixtureProbesPassed)],
    ['nonproduction_blocker_closure_plan_v2_ready_for_apply_open', nonproductionBlockerClosurePlanV2ReadyForApply ? 1 : 0],
    ['nonproduction_blocker_closure_plan_v2_may_modify_production_app_files_open', nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles ? 1 : 0],
    ['nonproduction_evidence_refresh_v2_blockers', nonproductionEvidenceRefreshV2Blockers],
    ['nonproduction_evidence_refresh_v2_wrong_state', nonproductionEvidenceRefreshV2Present && nonproductionEvidenceRefreshV2State !== 'llm_official_source_evidence_fresh' ? 1 : 0],
    ['nonproduction_evidence_refresh_v2_legacy_review_residue', nonproductionEvidenceRefreshV2LegacyReviewResidueMatches],
    ['nonproduction_evidence_refresh_v2_not_ready_for_manifest_recheck', nonproductionEvidenceRefreshV2Present && !nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck ? 1 : 0],
    ['nonproduction_evidence_refresh_v2_missing_probe_passes', Math.max(0, nonproductionEvidenceRefreshV2FixtureProbes - nonproductionEvidenceRefreshV2FixtureProbesPassed)],
    ['nonproduction_evidence_refresh_v2_ready_for_apply_open', nonproductionEvidenceRefreshV2ReadyForApply ? 1 : 0],
    ['nonproduction_evidence_refresh_v2_may_modify_production_app_files_open', nonproductionEvidenceRefreshV2MayModifyProductionAppFiles ? 1 : 0],
    ['runtime_server_manifest_consistency_recheck_v2_blockers', runtimeServerManifestConsistencyRecheckV2Blockers],
    ['runtime_server_manifest_consistency_recheck_v2_wrong_state', runtimeServerManifestConsistencyRecheckV2Present && runtimeServerManifestConsistencyRecheckV2State !== 'runtime_server_manifest_consistency_recheck_ready' ? 1 : 0],
    ['runtime_server_manifest_consistency_recheck_v2_missing_entries', runtimeServerManifestConsistencyRecheckV2Present ? Math.max(0, 12 - runtimeServerManifestConsistencyRecheckV2ManifestEntries) : 0],
    ['runtime_server_manifest_consistency_recheck_v2_stale_gate_refs', runtimeServerManifestConsistencyRecheckV2Present ? Math.max(0, runtimeServerManifestConsistencyRecheckV2GateRefs - runtimeServerManifestConsistencyRecheckV2GateRefsCurrent) : 0],
    ['runtime_server_manifest_consistency_recheck_v2_stale_input_hashes', runtimeServerManifestConsistencyRecheckV2Present ? Math.max(0, runtimeServerManifestConsistencyRecheckV2InputHashes - runtimeServerManifestConsistencyRecheckV2InputHashesCurrent) : 0],
    ['runtime_server_manifest_consistency_recheck_v2_top_level_open_flags', runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen],
    ['runtime_server_manifest_consistency_recheck_v2_activation_approved_entries', runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries],
    ['runtime_server_manifest_consistency_recheck_v2_runtime_download_entries', runtimeServerManifestConsistencyRecheckV2RuntimeDownloadsEnabledEntries],
    ['runtime_server_manifest_consistency_recheck_v2_ready_for_apply_entries', runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries],
    ['runtime_server_manifest_consistency_recheck_v2_not_ready_for_next_language_isolation_recheck', runtimeServerManifestConsistencyRecheckV2Present && !runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck ? 1 : 0],
    ['runtime_server_manifest_consistency_recheck_v2_missing_probe_passes', Math.max(0, runtimeServerManifestConsistencyRecheckV2FixtureProbes - runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed)],
    ['runtime_server_manifest_consistency_recheck_v2_ready_for_apply_open', runtimeServerManifestConsistencyRecheckV2ReadyForApply ? 1 : 0],
    ['runtime_server_manifest_consistency_recheck_v2_may_modify_production_app_files_open', runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles ? 1 : 0],
    ['language_isolation_regression_recheck_v2_blockers', languageIsolationRegressionRecheckV2Blockers],
    ['language_isolation_regression_recheck_v2_wrong_state', languageIsolationRegressionRecheckV2Present && languageIsolationRegressionRecheckV2State !== 'language_isolation_regression_recheck_ready' ? 1 : 0],
    ['language_isolation_regression_recheck_v2_empty_scan', languageIsolationRegressionRecheckV2Present && (languageIsolationRegressionRecheckV2ScannedRows <= 0 || languageIsolationRegressionRecheckV2ScannedTargetFields <= 0) ? 1 : 0],
    ['language_isolation_regression_recheck_v2_prompt_contracts_missing', languageIsolationRegressionRecheckV2Present ? Math.max(0, languageIsolationRegressionRecheckV2PromptEntrypointsExpected - languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale) : 0],
    ['language_isolation_regression_recheck_v2_manifest_entries_missing', languageIsolationRegressionRecheckV2Present ? Math.max(0, 12 - languageIsolationRegressionRecheckV2ManifestEntries) : 0],
    ['language_isolation_regression_recheck_v2_not_ready_for_readiness_apply_blocker_map', languageIsolationRegressionRecheckV2Present && !languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh ? 1 : 0],
    ['language_isolation_regression_recheck_v2_missing_probe_passes', Math.max(0, languageIsolationRegressionRecheckV2FixtureProbes - languageIsolationRegressionRecheckV2FixtureProbesPassed)],
    ['language_isolation_regression_recheck_v2_ready_for_apply_open', languageIsolationRegressionRecheckV2ReadyForApply ? 1 : 0],
    ['language_isolation_regression_recheck_v2_may_modify_production_app_files_open', languageIsolationRegressionRecheckV2MayModifyProductionAppFiles ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_blockers', readinessApplyBlockerMapRefreshV2Blockers],
    ['readiness_apply_blocker_map_refresh_v2_wrong_state', readinessApplyBlockerMapRefreshV2Present && readinessApplyBlockerMapRefreshV2State !== 'readiness_apply_blocker_map_refreshed' ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_generation_blockers', readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers],
    ['readiness_apply_blocker_map_refresh_v2_apply_blockers_count_drift', readinessApplyBlockerMapRefreshV2Present && readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers !== 1 ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_safe_remaining_drift', readinessApplyBlockerMapRefreshV2Present && !((readinessApplyBlockerMapRefreshV2SafeClosed === 4 && readinessApplyBlockerMapRefreshV2SafeRemaining === 1) || (readinessApplyBlockerMapRefreshV2SafeClosed === 5 && readinessApplyBlockerMapRefreshV2SafeRemaining === 0)) ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_not_ready_for_next_master_refresh', readinessApplyBlockerMapRefreshV2Present && !((readinessApplyBlockerMapRefreshV2SafeClosed === 4 && readinessApplyBlockerMapRefreshV2SafeRemaining === 1 && readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh) || (readinessApplyBlockerMapRefreshV2SafeClosed === 5 && readinessApplyBlockerMapRefreshV2SafeRemaining === 0 && !readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh)) ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_missing_probe_passes', Math.max(0, readinessApplyBlockerMapRefreshV2FixtureProbes - readinessApplyBlockerMapRefreshV2FixtureProbesPassed)],
    ['readiness_apply_blocker_map_refresh_v2_ready_for_apply_open', readinessApplyBlockerMapRefreshV2ReadyForApply ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_may_modify_production_app_files_open', readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles ? 1 : 0],
    ['master_next_pass_consistency_refresh_v2_ready_for_apply_open', masterNextPassConsistencyRefreshV2ReadyForApply ? 1 : 0],
    ['master_next_pass_consistency_refresh_v2_may_modify_production_app_files_open', masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles ? 1 : 0],
    ['official_source_content_coverage_v2_blockers', officialSourceContentCoverageV2Blockers],
    ['official_source_content_coverage_v2_wrong_state', officialSourceContentCoverageV2Present && officialSourceContentCoverageV2State !== 'official_source_content_coverage_complete_no_import' ? 1 : 0],
    ['official_source_content_coverage_v2_missing_ledger_rows', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2LedgerRows) : 0],
    ['official_source_content_coverage_v2_missing_accepted_rows', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2AcceptedRows) : 0],
    ['official_source_content_coverage_v2_missing_accepted_ai', officialSourceContentCoverageV2Present ? Math.max(0, 164 - officialSourceContentCoverageV2AcceptedAi) : 0],
    ['official_source_content_coverage_v2_missing_source_refs', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2RowsWithSourceRefs) : 0],
    ['official_source_content_coverage_v2_missing_trusted_source_ref_urls', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2RowsWithTrustedSourceRefUrls) : 0],
    ['official_source_content_coverage_v2_missing_evidence_source_ref_coverage', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2RowsWithEvidenceCoveredBySourceRefs) : 0],
    ['official_source_content_coverage_v2_untrusted_source_ref_urls_present', officialSourceContentCoverageV2RowsWithUntrustedSourceRefUrls],
    ['official_source_content_coverage_v2_untrusted_source_ref_ids_present', officialSourceContentCoverageV2RowsWithUntrustedSourceRefIds],
    ['official_source_content_coverage_v2_missing_ai_trusted_source_ref_urls', officialSourceContentCoverageV2Present ? Math.max(0, 164 - officialSourceContentCoverageV2AiWithTrustedSourceRefUrls) : 0],
    ['official_source_content_coverage_v2_missing_ai_minimum_trusted_source_refs', officialSourceContentCoverageV2Present ? Math.max(0, 164 - officialSourceContentCoverageV2AiWithMinimumTrustedSourceRefs) : 0],
    ['official_source_content_coverage_v2_ai_untrusted_source_ref_urls_present', officialSourceContentCoverageV2AiWithUntrustedSourceRefUrls],
    ['official_source_content_coverage_v2_ai_untrusted_source_ref_ids_present', officialSourceContentCoverageV2AiWithUntrustedSourceRefIds],
    ['official_source_content_coverage_v2_non_https_fixture_not_rejected', officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2RejectsNonHttpsSourceRefFixture ? 1 : 0],
    ['official_source_content_coverage_v2_untrusted_domain_fixture_not_rejected', officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2RejectsUntrustedSourceDomainFixture ? 1 : 0],
    ['official_source_content_coverage_v2_untrusted_id_fixture_not_rejected', officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2RejectsUntrustedSourceIdFixture ? 1 : 0],
    ['official_source_content_coverage_v2_missing_matching_ref_fixture_not_rejected', officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2RejectsEvidenceWithoutMatchingSourceRefFixture ? 1 : 0],
    ['official_source_content_coverage_v2_insufficient_ai_refs_fixture_not_rejected', officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2RejectsInsufficientAiTrustedSourceRefsFixture ? 1 : 0],
    ['official_source_content_coverage_v2_missing_gate_passes', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2RowsWithGatesPassed) : 0],
    ['official_source_content_coverage_v2_missing_one_correct_quizzes', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2QuizRowsOneCorrect) : 0],
    ['official_source_content_coverage_v2_missing_trusted_source_ids', officialSourceContentCoverageV2Present && officialSourceContentCoverageV2TrustedSourceIds <= 0 ? 1 : 0],
    ['official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh', officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2ReadyForImportDryRunRefresh && !exactApprovalApplyRehearsalV2Ready ? 1 : 0],
    ['official_source_content_coverage_v2_missing_probe_passes', Math.max(0, officialSourceContentCoverageV2FixtureProbes - officialSourceContentCoverageV2FixtureProbesPassed)],
    ['official_source_content_coverage_v2_ready_for_apply_open', officialSourceContentCoverageV2ReadyForApply ? 1 : 0],
    ['official_source_content_coverage_v2_may_modify_production_app_files_open', officialSourceContentCoverageV2MayModifyProductionAppFiles ? 1 : 0],
    ['production_activation_hold_exact_approval_required_v2_blockers', productionActivationHoldExactApprovalRequiredV2Blockers],
    ['production_activation_hold_exact_approval_required_v2_not_ready', productionActivationHoldExactApprovalRequiredV2Present && !productionActivationHoldExactApprovalRequiredV2Ready && !exactApprovalApplyRehearsalV2Ready ? 1 : 0],
    ['production_activation_hold_exact_approval_required_v2_missing_probe_passes', Math.max(0, productionActivationHoldExactApprovalRequiredV2FixtureProbes - productionActivationHoldExactApprovalRequiredV2FixtureProbesPassed)],
    ['production_activation_hold_exact_approval_required_v2_ready_for_apply_open', productionActivationHoldExactApprovalRequiredV2ReadyForApply ? 1 : 0],
    ['production_activation_hold_exact_approval_required_v2_may_modify_production_app_files_open', productionActivationHoldExactApprovalRequiredV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_validation_gate_v2_blockers', exactApprovalValidationGateV2Blockers],
    ['exact_approval_validation_gate_v2_not_ready', exactApprovalValidationGateV2Present && !exactApprovalValidationGateV2Ready ? 1 : 0],
    ['exact_approval_validation_gate_v2_missing_probe_passes', Math.max(0, exactApprovalValidationGateV2FixtureProbes - exactApprovalValidationGateV2FixtureProbesPassed)],
    ['exact_approval_validation_gate_v2_ready_for_apply_open', exactApprovalValidationGateV2ReadyForApply ? 1 : 0],
    ['exact_approval_validation_gate_v2_may_modify_production_app_files_open', exactApprovalValidationGateV2MayModifyProductionAppFiles ? 1 : 0],
    ['production_activation_sequence_preflight_v2_blockers', productionActivationSequencePreflightV2Blockers],
    ['production_activation_sequence_preflight_v2_not_ready', productionActivationSequencePreflightV2Present && !productionActivationSequencePreflightV2Ready ? 1 : 0],
    ['production_activation_sequence_preflight_v2_missing_probe_passes', Math.max(0, productionActivationSequencePreflightV2FixtureProbes - productionActivationSequencePreflightV2FixtureProbesPassed)],
    ['production_activation_sequence_preflight_v2_ready_for_apply_open', productionActivationSequencePreflightV2ReadyForApply ? 1 : 0],
    ['production_activation_sequence_preflight_v2_may_modify_production_app_files_open', productionActivationSequencePreflightV2MayModifyProductionAppFiles ? 1 : 0],
    ['production_apply_transaction_contract_v2_blockers', productionApplyTransactionContractV2Blockers],
    ['production_apply_transaction_contract_v2_not_ready', productionApplyTransactionContractV2Present && !productionApplyTransactionContractV2Ready ? 1 : 0],
    ['production_apply_transaction_contract_v2_missing_probe_passes', Math.max(0, productionApplyTransactionContractV2FixtureProbes - productionApplyTransactionContractV2FixtureProbesPassed)],
    ['production_apply_transaction_contract_v2_missing_entries', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2ServerManifestEntries) : 0],
    ['production_apply_transaction_contract_v2_missing_payload_checks', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2PayloadFilesChecked) : 0],
    ['production_apply_transaction_contract_v2_missing_index_checks', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2IndexFilesChecked) : 0],
    ['production_apply_transaction_contract_v2_missing_manifest_checks', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2SliceManifestFilesChecked) : 0],
    ['production_apply_transaction_contract_v2_sha_mismatches', productionApplyTransactionContractV2ShaMismatches],
    ['production_apply_transaction_contract_v2_missing_entry_files', productionApplyTransactionContractV2MissingEntryFiles],
    [
      'production_apply_transaction_contract_v2_missing_p49_proved_requirements',
      productionApplyTransactionContractV2Present
        ? Math.max(0, 16 - (productionApplyTransactionContractV2P49RequirementsProved + productionApplyTransactionContractV2P49RequirementsProductionLocked))
        : 0,
    ],
    [
      'production_apply_transaction_contract_v2_unexpected_p49_locked_requirements',
      productionApplyTransactionContractV2Present &&
      productionApplyTransactionContractV2P49RequirementsProductionLocked <= 0 &&
      !productionReadinessCompletionAuditV2Activated ? 1 : 0,
    ],
    ['production_apply_transaction_contract_v2_p49_missing_requirements', productionApplyTransactionContractV2P49RequirementsMissing],
    ['production_apply_transaction_contract_v2_p49_contradicted_requirements', productionApplyTransactionContractV2P49RequirementsContradicted],
    ['production_apply_transaction_contract_v2_missing_final_hash_locks', Math.max(0, EXPECTED_FINAL_PREAPPROVAL_HASH_LOCKS_V2 - productionApplyTransactionContractV2FinalHashLocks)],
    ['production_apply_transaction_contract_v2_p50_missing_critical_artifacts', productionApplyTransactionContractV2P50MissingCriticalArtifacts],
    ['production_apply_transaction_contract_v2_p50_runtime_delivery_chain_not_ready', productionApplyTransactionContractV2Present && !productionApplyTransactionContractV2P50RuntimeDeliveryEvidenceChainReady ? 1 : 0],
    ['production_apply_transaction_contract_v2_runtime_delivery_chain_not_ready', productionApplyTransactionContractV2Present && !productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainReady ? 1 : 0],
    ['production_apply_transaction_contract_v2_missing_runtime_delivery_manifest_entries', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries) : 0],
    ['production_apply_transaction_contract_v2_missing_runtime_delivery_actual_sha', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainActualShaEntries) : 0],
    ['production_apply_transaction_contract_v2_missing_runtime_delivery_rollback_contracts', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainRollbackContracts) : 0],
    ['production_apply_transaction_contract_v2_missing_runtime_delivery_source_locale_rejects', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects) : 0],
    ['production_apply_transaction_contract_v2_missing_runtime_delivery_study_target_rejects', productionApplyTransactionContractV2Present ? Math.max(0, 12 - productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects) : 0],
    ['production_apply_transaction_contract_v2_ready_for_apply_open', productionApplyTransactionContractV2ReadyForApply ? 1 : 0],
    ['production_apply_transaction_contract_v2_may_modify_production_app_files_open', productionApplyTransactionContractV2MayModifyProductionAppFiles ? 1 : 0],
    ['post_apply_rollback_guard_contract_v2_blockers', postApplyRollbackGuardContractV2Blockers],
    ['post_apply_rollback_guard_contract_v2_not_ready', postApplyRollbackGuardContractV2Present && !postApplyRollbackGuardContractV2Ready ? 1 : 0],
    ['post_apply_rollback_guard_contract_v2_missing_probe_passes', Math.max(0, postApplyRollbackGuardContractV2FixtureProbes - postApplyRollbackGuardContractV2FixtureProbesPassed)],
    ['post_apply_rollback_guard_contract_v2_missing_runtime_cache_contracts', postApplyRollbackGuardContractV2Present ? Math.max(0, 12 - postApplyRollbackGuardContractV2RuntimeCacheContracts) : 0],
    ['post_apply_rollback_guard_contract_v2_missing_rollback_contracts', postApplyRollbackGuardContractV2Present ? Math.max(0, 12 - postApplyRollbackGuardContractV2RuntimeCacheRollbackContracts) : 0],
    ['post_apply_rollback_guard_contract_v2_prompt_contract_gap', postApplyRollbackGuardContractV2Present ? Math.max(0, postApplyRollbackGuardContractV2LanguagePromptEntrypointsExpected - postApplyRollbackGuardContractV2LanguagePromptContracts) : 0],
    ['post_apply_rollback_guard_contract_v2_missing_guard_steps', postApplyRollbackGuardContractV2Present && (postApplyRollbackGuardContractV2PostApplyGuardSteps <= 0 || postApplyRollbackGuardContractV2RollbackGuardSteps <= 0) ? 1 : 0],
    [
      'post_apply_rollback_guard_contract_v2_missing_p49_proved_requirements',
      postApplyRollbackGuardContractV2Present
        ? Math.max(0, 16 - (postApplyRollbackGuardContractV2P49RequirementsProved + postApplyRollbackGuardContractV2P49RequirementsProductionLocked))
        : 0,
    ],
    [
      'post_apply_rollback_guard_contract_v2_unexpected_p49_locked_requirements',
      postApplyRollbackGuardContractV2Present &&
      postApplyRollbackGuardContractV2P49RequirementsProductionLocked <= 0 &&
      !productionReadinessCompletionAuditV2Activated ? 1 : 0,
    ],
    ['post_apply_rollback_guard_contract_v2_p49_missing_requirements', postApplyRollbackGuardContractV2P49RequirementsMissing],
    ['post_apply_rollback_guard_contract_v2_p49_contradicted_requirements', postApplyRollbackGuardContractV2P49RequirementsContradicted],
    ['post_apply_rollback_guard_contract_v2_missing_final_hash_locks', Math.max(0, EXPECTED_FINAL_PREAPPROVAL_HASH_LOCKS_V2 - postApplyRollbackGuardContractV2FinalHashLocks)],
    ['post_apply_rollback_guard_contract_v2_p50_missing_critical_artifacts', postApplyRollbackGuardContractV2P50MissingCriticalArtifacts],
    ['post_apply_rollback_guard_contract_v2_p50_runtime_delivery_chain_not_ready', postApplyRollbackGuardContractV2Present && !postApplyRollbackGuardContractV2P50RuntimeDeliveryEvidenceChainReady ? 1 : 0],
    ['post_apply_rollback_guard_contract_v2_runtime_delivery_chain_not_ready', postApplyRollbackGuardContractV2Present && !postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainReady ? 1 : 0],
    ['post_apply_rollback_guard_contract_v2_missing_runtime_delivery_manifest_entries', postApplyRollbackGuardContractV2Present ? Math.max(0, 12 - postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries) : 0],
    ['post_apply_rollback_guard_contract_v2_missing_runtime_delivery_actual_sha', postApplyRollbackGuardContractV2Present ? Math.max(0, 12 - postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainActualShaEntries) : 0],
    ['post_apply_rollback_guard_contract_v2_missing_runtime_delivery_rollback_contracts', postApplyRollbackGuardContractV2Present ? Math.max(0, 12 - postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainRollbackContracts) : 0],
    ['post_apply_rollback_guard_contract_v2_missing_runtime_delivery_source_locale_rejects', postApplyRollbackGuardContractV2Present ? Math.max(0, 12 - postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects) : 0],
    ['post_apply_rollback_guard_contract_v2_missing_runtime_delivery_study_target_rejects', postApplyRollbackGuardContractV2Present ? Math.max(0, 12 - postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects) : 0],
    ['post_apply_rollback_guard_contract_v2_ready_for_apply_open', postApplyRollbackGuardContractV2ReadyForApply ? 1 : 0],
    ['post_apply_rollback_guard_contract_v2_may_modify_production_app_files_open', postApplyRollbackGuardContractV2MayModifyProductionAppFiles ? 1 : 0],
    ['approval_wait_safe_continuation_v2_blockers', approvalWaitSafeContinuationV2Blockers],
    ['approval_wait_safe_continuation_v2_not_ready', approvalWaitSafeContinuationV2Present && !approvalWaitSafeContinuationV2Ready ? 1 : 0],
    ['approval_wait_safe_continuation_v2_missing_probe_passes', Math.max(0, approvalWaitSafeContinuationV2FixtureProbes - approvalWaitSafeContinuationV2FixtureProbesPassed)],
    ['approval_wait_safe_continuation_v2_legacy_review_residue', approvalWaitSafeContinuationV2LegacyReviewResidueMatches],
    ['approval_wait_safe_continuation_v2_ready_for_apply_open', approvalWaitSafeContinuationV2ReadyForApply ? 1 : 0],
    ['approval_wait_safe_continuation_v2_may_modify_production_app_files_open', approvalWaitSafeContinuationV2MayModifyProductionAppFiles ? 1 : 0],
    ['production_readiness_completion_audit_v2_blockers', productionReadinessCompletionAuditV2Blockers],
    ['production_readiness_completion_audit_v2_not_ready', productionReadinessCompletionAuditV2Present && !productionReadinessCompletionAuditV2Ready ? 1 : 0],
    ['production_readiness_completion_audit_v2_missing_closed_requirements', Math.max(0, 16 - productionReadinessCompletionAuditV2RequirementsClosed)],
    ['production_readiness_completion_audit_v2_missing_requirements', productionReadinessCompletionAuditV2RequirementsMissing],
    ['production_readiness_completion_audit_v2_contradicted_requirements', productionReadinessCompletionAuditV2RequirementsContradicted],
    ['production_readiness_completion_audit_v2_missing_probe_passes', Math.max(0, productionReadinessCompletionAuditV2FixtureProbes - productionReadinessCompletionAuditV2FixtureProbesPassed)],
    ['production_readiness_completion_audit_v2_ready_for_apply_open', productionReadinessCompletionAuditV2ReadyForApply ? 1 : 0],
    ['production_readiness_completion_audit_v2_may_modify_production_app_files_open', productionReadinessCompletionAuditV2MayModifyProductionAppFiles ? 1 : 0],
    ['final_preapproval_evidence_hash_lock_v2_blockers', finalPreapprovalEvidenceHashLockV2Blockers],
    ['final_preapproval_evidence_hash_lock_v2_not_ready', finalPreapprovalEvidenceHashLockV2Present && !finalPreapprovalEvidenceHashLockV2Ready ? 1 : 0],
    ['final_preapproval_evidence_hash_lock_v2_missing_final_hash_locks', Math.max(0, EXPECTED_FINAL_PREAPPROVAL_HASH_LOCKS_V2 - finalPreapprovalEvidenceHashLockV2FinalHashLocks)],
    ['final_preapproval_evidence_hash_lock_v2_missing_critical_artifacts', finalPreapprovalEvidenceHashLockV2MissingCriticalArtifacts],
    ['final_preapproval_evidence_hash_lock_v2_missing_required_role_locks', finalPreapprovalEvidenceHashLockV2MissingRequiredRoleLocks],
    ['final_preapproval_evidence_hash_lock_v2_runtime_delivery_chain_not_ready', finalPreapprovalEvidenceHashLockV2Present && !finalPreapprovalEvidenceHashLockV2RuntimeDeliveryEvidenceChainReady ? 1 : 0],
    ['final_preapproval_evidence_hash_lock_v2_missing_probe_passes', Math.max(0, finalPreapprovalEvidenceHashLockV2FixtureProbes - finalPreapprovalEvidenceHashLockV2FixtureProbesPassed)],
    ['final_preapproval_evidence_hash_lock_v2_ready_for_apply_open', finalPreapprovalEvidenceHashLockV2ReadyForApply ? 1 : 0],
    ['final_preapproval_evidence_hash_lock_v2_may_modify_production_app_files_open', finalPreapprovalEvidenceHashLockV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_blockers', exactApprovalApplyRehearsalV2BlockedByP49P50Only ? 0 : exactApprovalApplyRehearsalV2Blockers],
    ['exact_approval_apply_rehearsal_v2_not_ready', exactApprovalApplyRehearsalV2Present && !exactApprovalApplyRehearsalV2Ready && !exactApprovalApplyRehearsalV2BlockedByP49P50Only ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_unexpected_apply_blockers', exactApprovalApplyRehearsalV2Present && exactApprovalApplyRehearsalV2ReadinessApplyBlockers !== 1 ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_active_approval_receipt_open', exactApprovalApplyRehearsalV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_active_hash_lock_open', exactApprovalApplyRehearsalV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_missing_main_hash_lock_dry_run', exactApprovalApplyRehearsalV2Present && !exactApprovalApplyRehearsalV2MainHashLockDryRunPresent ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_missing_final_hash_lock_dry_run', exactApprovalApplyRehearsalV2Present && !exactApprovalApplyRehearsalV2FinalHashLockDryRunPresent ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_would_create_active_artifacts_open', exactApprovalApplyRehearsalV2WouldCreateActiveArtifactsNow ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_missing_probe_passes', exactApprovalApplyRehearsalV2BlockedByP49P50Only ? 0 : Math.max(0, exactApprovalApplyRehearsalV2FixtureProbes - exactApprovalApplyRehearsalV2FixtureProbesPassed)],
    ['exact_approval_apply_rehearsal_v2_ready_for_apply_open', exactApprovalApplyRehearsalV2ReadyForApply ? 1 : 0],
    ['exact_approval_apply_rehearsal_v2_may_modify_production_app_files_open', exactApprovalApplyRehearsalV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_source_firewall_v2_blockers', exactApprovalSourceFirewallV2Blockers],
    ['exact_approval_source_firewall_v2_not_ready', exactApprovalSourceFirewallV2Present && !exactApprovalSourceFirewallV2Ready && !exactApprovalSourceFirewallV2WaitingForP51Only ? 1 : 0],
    ['exact_approval_source_firewall_v2_plain_continue_would_create_active_artifacts', exactApprovalSourceFirewallV2PlainContinueWouldCreateActiveArtifacts ? 1 : 0],
    ['exact_approval_source_firewall_v2_active_approval_receipt_open', exactApprovalSourceFirewallV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_source_firewall_v2_active_hash_lock_open', exactApprovalSourceFirewallV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_source_firewall_v2_missing_probe_passes', Math.max(0, exactApprovalSourceFirewallV2FixtureProbes - exactApprovalSourceFirewallV2FixtureProbesPassed)],
    ['exact_approval_source_firewall_v2_ready_for_apply_open', exactApprovalSourceFirewallV2ReadyForApply ? 1 : 0],
    ['exact_approval_source_firewall_v2_may_modify_production_app_files_open', exactApprovalSourceFirewallV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_blockers', exactApprovalSourceIntakeTransitionV2Blockers],
    ['exact_approval_source_intake_transition_v2_not_ready', exactApprovalSourceIntakeTransitionV2Present && !exactApprovalSourceIntakeTransitionV2Ready ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_plain_continue_would_create_active_artifacts', exactApprovalSourceIntakeTransitionV2PlainContinueWouldCreateActiveArtifacts ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_script_would_create_active_artifacts', exactApprovalSourceIntakeTransitionV2WouldCreateActiveArtifactsByThisScript ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_active_approval_receipt_open', exactApprovalSourceIntakeTransitionV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_active_hash_lock_open', exactApprovalSourceIntakeTransitionV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_missing_simulated_p31_both_artifacts', exactApprovalSourceIntakeTransitionV2Present && !exactApprovalSourceIntakeTransitionV2SimulatedValidP31CreateWouldCreateBothArtifacts ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_simulated_p44_ready_for_apply_open', exactApprovalSourceIntakeTransitionV2SimulatedP44WouldOpenReadyForApply ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_missing_probe_passes', Math.max(0, exactApprovalSourceIntakeTransitionV2FixtureProbes - exactApprovalSourceIntakeTransitionV2FixtureProbesPassed)],
    ['exact_approval_source_intake_transition_v2_ready_for_apply_open', exactApprovalSourceIntakeTransitionV2ReadyForApply ? 1 : 0],
    ['exact_approval_source_intake_transition_v2_may_modify_production_app_files_open', exactApprovalSourceIntakeTransitionV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_active_artifact_pair_simulation_v2_blockers', exactApprovalActiveArtifactPairSimulationV2Blockers],
    ['exact_approval_active_artifact_pair_simulation_v2_not_ready', exactApprovalActiveArtifactPairSimulationV2Present && !exactApprovalActiveArtifactPairSimulationV2Ready ? 1 : 0],
    ['exact_approval_active_artifact_pair_simulation_v2_active_approval_receipt_open', exactApprovalActiveArtifactPairSimulationV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_active_artifact_pair_simulation_v2_active_hash_lock_open', exactApprovalActiveArtifactPairSimulationV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_active_artifact_pair_simulation_v2_simulated_pair_would_not_pass_p44', exactApprovalActiveArtifactPairSimulationV2Present && !exactApprovalActiveArtifactPairSimulationV2SimulatedPairWouldPassP44AfterP31Create ? 1 : 0],
    ['exact_approval_active_artifact_pair_simulation_v2_current_p44_opened_sequencing', exactApprovalActiveArtifactPairSimulationV2CurrentP44WouldOpenSequencing ? 1 : 0],
    ['exact_approval_active_artifact_pair_simulation_v2_missing_probe_passes', Math.max(0, exactApprovalActiveArtifactPairSimulationV2FixtureProbes - exactApprovalActiveArtifactPairSimulationV2FixtureProbesPassed)],
    ['exact_approval_active_artifact_pair_simulation_v2_ready_for_apply_open', exactApprovalActiveArtifactPairSimulationV2ReadyForApply ? 1 : 0],
    ['exact_approval_active_artifact_pair_simulation_v2_may_modify_production_app_files_open', exactApprovalActiveArtifactPairSimulationV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p31_create_command_preflight_v2_blockers', exactApprovalP31CreateCommandPreflightV2Blockers],
    ['exact_approval_p31_create_command_preflight_v2_not_ready', exactApprovalP31CreateCommandPreflightV2Present && !exactApprovalP31CreateCommandPreflightV2Ready ? 1 : 0],
    ['exact_approval_p31_create_command_preflight_v2_active_approval_receipt_open', exactApprovalP31CreateCommandPreflightV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_p31_create_command_preflight_v2_active_hash_lock_open', exactApprovalP31CreateCommandPreflightV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_p31_create_command_preflight_v2_command_with_source_not_allowed', exactApprovalP31CreateCommandPreflightV2Present && !exactApprovalP31CreateCommandPreflightV2CommandAllowedWhenExactSourcePresent ? 1 : 0],
    ['exact_approval_p31_create_command_preflight_v2_command_executed_by_script', exactApprovalP31CreateCommandPreflightV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p31_create_command_preflight_v2_missing_probe_passes', Math.max(0, exactApprovalP31CreateCommandPreflightV2FixtureProbes - exactApprovalP31CreateCommandPreflightV2FixtureProbesPassed)],
    ['exact_approval_p31_create_command_preflight_v2_ready_for_apply_open', exactApprovalP31CreateCommandPreflightV2ReadyForApply ? 1 : 0],
    ['exact_approval_p31_create_command_preflight_v2_may_modify_production_app_files_open', exactApprovalP31CreateCommandPreflightV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p44_validation_command_preflight_v2_blockers', exactApprovalP44ValidationCommandPreflightV2Blockers],
    ['exact_approval_p44_validation_command_preflight_v2_not_ready', exactApprovalP44ValidationCommandPreflightV2Present && !exactApprovalP44ValidationCommandPreflightV2Ready ? 1 : 0],
    ['exact_approval_p44_validation_command_preflight_v2_active_approval_receipt_open_without_validation', exactApprovalP44ValidationCommandPreflightV2ActiveApprovalReceiptExists && !exactApprovalP44ValidationCommandPreflightV2CommandAllowedNow ? 1 : 0],
    ['exact_approval_p44_validation_command_preflight_v2_active_hash_lock_open_without_validation', exactApprovalP44ValidationCommandPreflightV2ActiveHashLockExists && !exactApprovalP44ValidationCommandPreflightV2CommandAllowedNow ? 1 : 0],
    ['exact_approval_p44_validation_command_preflight_v2_command_after_p31_not_allowed', exactApprovalP44ValidationCommandPreflightV2Present && !exactApprovalP44ValidationCommandPreflightV2CommandAllowedAfterP31Create ? 1 : 0],
    ['exact_approval_p44_validation_command_preflight_v2_command_executed_by_script', exactApprovalP44ValidationCommandPreflightV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p44_validation_command_preflight_v2_missing_probe_passes', Math.max(0, exactApprovalP44ValidationCommandPreflightV2FixtureProbes - exactApprovalP44ValidationCommandPreflightV2FixtureProbesPassed)],
    ['exact_approval_p44_validation_command_preflight_v2_ready_for_apply_open', exactApprovalP44ValidationCommandPreflightV2ReadyForApply ? 1 : 0],
    ['exact_approval_p44_validation_command_preflight_v2_may_modify_production_app_files_open', exactApprovalP44ValidationCommandPreflightV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p44_to_p45_sequence_handoff_simulation_v2_blockers', exactApprovalP44ToP45SequenceHandoffSimulationV2Blockers],
    ['exact_approval_p44_to_p45_sequence_handoff_simulation_v2_not_ready', exactApprovalP44ToP45SequenceHandoffSimulationV2Present && !exactApprovalP44ToP45SequenceHandoffSimulationV2Ready ? 1 : 0],
    ['exact_approval_p44_to_p45_sequence_handoff_simulation_v2_simulated_handoff_not_open', exactApprovalP44ToP45SequenceHandoffSimulationV2Present && !exactApprovalP44ToP45SequenceHandoffSimulationV2SimulatedPostP44P45WouldOpenSequence ? 1 : 0],
    ['exact_approval_p44_to_p45_sequence_handoff_simulation_v2_command_executed_by_script', exactApprovalP44ToP45SequenceHandoffSimulationV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p44_to_p45_sequence_handoff_simulation_v2_missing_probe_passes', Math.max(0, exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbes - exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbesPassed)],
    ['exact_approval_p44_to_p45_sequence_handoff_simulation_v2_ready_for_apply_open', exactApprovalP44ToP45SequenceHandoffSimulationV2ReadyForApply ? 1 : 0],
    ['exact_approval_p44_to_p45_sequence_handoff_simulation_v2_may_modify_production_app_files_open', exactApprovalP44ToP45SequenceHandoffSimulationV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p45_sequence_command_preflight_v2_blockers', exactApprovalP45SequenceCommandPreflightV2Blockers],
    ['exact_approval_p45_sequence_command_preflight_v2_not_ready', exactApprovalP45SequenceCommandPreflightV2Present && !exactApprovalP45SequenceCommandPreflightV2Ready ? 1 : 0],
    ['exact_approval_p45_sequence_command_preflight_v2_command_after_p44_not_allowed', exactApprovalP45SequenceCommandPreflightV2Present && !exactApprovalP45SequenceCommandPreflightV2CommandAllowedAfterP44Validation ? 1 : 0],
    ['exact_approval_p45_sequence_command_preflight_v2_command_executed_by_script', exactApprovalP45SequenceCommandPreflightV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p45_sequence_command_preflight_v2_missing_probe_passes', Math.max(0, exactApprovalP45SequenceCommandPreflightV2FixtureProbes - exactApprovalP45SequenceCommandPreflightV2FixtureProbesPassed)],
    ['exact_approval_p45_sequence_command_preflight_v2_ready_for_apply_open', exactApprovalP45SequenceCommandPreflightV2ReadyForApply ? 1 : 0],
    ['exact_approval_p45_sequence_command_preflight_v2_may_modify_production_app_files_open', exactApprovalP45SequenceCommandPreflightV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_blockers', exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Blockers],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_not_ready', exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present && !exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready ? 1 : 0],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_current_handoff_open', exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CurrentHandoffWouldOpenTransaction ? 1 : 0],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_simulated_handoff_not_open', exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present && !exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2SimulatedPostP45P46WouldOpenTransaction ? 1 : 0],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_command_executed_by_script', exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_missing_probe_passes', Math.max(0, exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbes - exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbesPassed)],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_ready_for_apply_open', exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2ReadyForApply ? 1 : 0],
    ['exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_may_modify_production_app_files_open', exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p46_apply_transaction_command_preflight_v2_blockers', exactApprovalP46ApplyTransactionCommandPreflightV2Blockers],
    ['exact_approval_p46_apply_transaction_command_preflight_v2_not_ready', exactApprovalP46ApplyTransactionCommandPreflightV2Present && !exactApprovalP46ApplyTransactionCommandPreflightV2Ready ? 1 : 0],
    ['exact_approval_p46_apply_transaction_command_preflight_v2_command_after_p45_not_allowed', exactApprovalP46ApplyTransactionCommandPreflightV2Present && !exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedAfterP45Sequence ? 1 : 0],
    ['exact_approval_p46_apply_transaction_command_preflight_v2_command_executed_by_script', exactApprovalP46ApplyTransactionCommandPreflightV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p46_apply_transaction_command_preflight_v2_missing_probe_passes', Math.max(0, exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbes - exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbesPassed)],
    ['exact_approval_p46_apply_transaction_command_preflight_v2_ready_for_apply_open', exactApprovalP46ApplyTransactionCommandPreflightV2ReadyForApply ? 1 : 0],
    ['exact_approval_p46_apply_transaction_command_preflight_v2_may_modify_production_app_files_open', exactApprovalP46ApplyTransactionCommandPreflightV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_blockers', exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Blockers],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_not_ready', exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present && !exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready ? 1 : 0],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_current_handoff_open', exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CurrentHandoffWouldOpenRollbackGuard ? 1 : 0],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_simulated_handoff_not_open', exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present && !exactApprovalP46ToP47RollbackGuardHandoffSimulationV2SimulatedPostP46P47WouldOpenRollbackGuard ? 1 : 0],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_command_executed_by_script', exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_missing_probe_passes', Math.max(0, exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbes - exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbesPassed)],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_ready_for_apply_open', exactApprovalP46ToP47RollbackGuardHandoffSimulationV2ReadyForApply ? 1 : 0],
    ['exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_may_modify_production_app_files_open', exactApprovalP46ToP47RollbackGuardHandoffSimulationV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p47_rollback_guard_command_preflight_v2_blockers', exactApprovalP47RollbackGuardCommandPreflightV2Blockers],
    ['exact_approval_p47_rollback_guard_command_preflight_v2_not_ready', exactApprovalP47RollbackGuardCommandPreflightV2Present && !exactApprovalP47RollbackGuardCommandPreflightV2Ready ? 1 : 0],
    ['exact_approval_p47_rollback_guard_command_preflight_v2_command_after_p46_not_allowed', exactApprovalP47RollbackGuardCommandPreflightV2Present && !exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedAfterP46Contract ? 1 : 0],
    ['exact_approval_p47_rollback_guard_command_preflight_v2_command_executed_by_script', exactApprovalP47RollbackGuardCommandPreflightV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p47_rollback_guard_command_preflight_v2_missing_probe_passes', Math.max(0, exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbes - exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbesPassed)],
    ['exact_approval_p47_rollback_guard_command_preflight_v2_ready_for_apply_open', exactApprovalP47RollbackGuardCommandPreflightV2ReadyForApply ? 1 : 0],
    ['exact_approval_p47_rollback_guard_command_preflight_v2_may_modify_production_app_files_open', exactApprovalP47RollbackGuardCommandPreflightV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_blockers', exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Blockers],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_not_ready', exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present && !exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready ? 1 : 0],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_current_handoff_not_open', exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present && !exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CurrentHandoffWouldOpenSafeContinuation ? 1 : 0],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_simulated_handoff_not_open', exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present && !exactApprovalP47ToP48SafeContinuationHandoffSimulationV2SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation ? 1 : 0],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_command_executed_by_script', exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_missing_probe_passes', Math.max(0, exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbes - exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbesPassed)],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_ready_for_apply_open', exactApprovalP47ToP48SafeContinuationHandoffSimulationV2ReadyForApply ? 1 : 0],
    ['exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_may_modify_production_app_files_open', exactApprovalP47ToP48SafeContinuationHandoffSimulationV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_p48_safe_continuation_command_preflight_v2_blockers', exactApprovalP48SafeContinuationCommandPreflightV2Blockers],
    ['exact_approval_p48_safe_continuation_command_preflight_v2_not_ready', exactApprovalP48SafeContinuationCommandPreflightV2Present && !exactApprovalP48SafeContinuationCommandPreflightV2Ready ? 1 : 0],
    ['exact_approval_p48_safe_continuation_command_preflight_v2_command_not_allowed', exactApprovalP48SafeContinuationCommandPreflightV2Present && !exactApprovalP48SafeContinuationCommandPreflightV2CommandAllowedNow ? 1 : 0],
    ['exact_approval_p48_safe_continuation_command_preflight_v2_command_executed_by_script', exactApprovalP48SafeContinuationCommandPreflightV2CommandExecutedByThisScript ? 1 : 0],
    ['exact_approval_p48_safe_continuation_command_preflight_v2_missing_probe_passes', Math.max(0, exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbes - exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbesPassed)],
    ['exact_approval_p48_safe_continuation_command_preflight_v2_ready_for_apply_open', exactApprovalP48SafeContinuationCommandPreflightV2ReadyForApply ? 1 : 0],
    ['exact_approval_p48_safe_continuation_command_preflight_v2_may_modify_production_app_files_open', exactApprovalP48SafeContinuationCommandPreflightV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_wait_state_v2_blockers', exactApprovalWaitStateV2BlockedByClosedEvidenceOnly ? 0 : exactApprovalWaitStateV2Blockers],
    ['exact_approval_wait_state_v2_not_ready', exactApprovalWaitStateV2Present && !exactApprovalWaitStateV2Ready && !exactApprovalWaitStateV2BlockedByClosedEvidenceOnly ? 1 : 0],
    ['exact_approval_wait_state_v2_closed_evidence_not_ready', exactApprovalWaitStateV2Present && !exactApprovalWaitStateV2ClosedEvidenceReady && !exactApprovalWaitStateV2BlockedByClosedEvidenceOnly ? 1 : 0],
    ['exact_approval_wait_state_v2_approval_source_not_canonical', exactApprovalWaitStateV2Present && !exactApprovalWaitStateV2ApprovalSourceIsCanonical ? 1 : 0],
    ['exact_approval_wait_state_v2_active_receipt_exists', exactApprovalWaitStateV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_wait_state_v2_active_hash_lock_exists', exactApprovalWaitStateV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_wait_state_v2_missing_probe_passes', exactApprovalWaitStateV2BlockedByClosedEvidenceOnly ? 0 : Math.max(0, exactApprovalWaitStateV2FixtureProbes - exactApprovalWaitStateV2FixtureProbesPassed)],
    ['exact_approval_wait_state_v2_ready_for_apply_open', exactApprovalWaitStateV2ReadyForApply ? 1 : 0],
    ['exact_approval_wait_state_v2_may_modify_production_app_files_open', exactApprovalWaitStateV2MayModifyProductionAppFiles ? 1 : 0],
    ['ordered_approval_wait_refresh_v2_blockers', orderedApprovalWaitRefreshV2Blockers],
    ['ordered_approval_wait_refresh_v2_not_ready', orderedApprovalWaitRefreshV2Present && !orderedApprovalWaitRefreshV2Ready ? 1 : 0],
    ['ordered_approval_wait_refresh_v2_active_receipt_exists', orderedApprovalWaitRefreshV2ActiveApprovalReceiptExists ? 1 : 0],
    ['ordered_approval_wait_refresh_v2_active_hash_lock_exists', orderedApprovalWaitRefreshV2ActiveHashLockExists ? 1 : 0],
    ['ordered_approval_wait_refresh_v2_ready_for_apply_open', orderedApprovalWaitRefreshV2ReadyForApply ? 1 : 0],
    ['ordered_approval_wait_refresh_v2_may_modify_production_app_files_open', orderedApprovalWaitRefreshV2MayModifyProductionAppFiles ? 1 : 0],
    ['safe_preapproval_continuation_v2_blockers', safePreapprovalContinuationV2Blockers],
    ['safe_preapproval_continuation_v2_not_ready', safePreapprovalContinuationV2Present && !safePreapprovalContinuationV2Ready ? 1 : 0],
    ['safe_preapproval_continuation_v2_active_receipt_exists', safePreapprovalContinuationV2ActiveApprovalReceiptExists ? 1 : 0],
    ['safe_preapproval_continuation_v2_active_hash_lock_exists', safePreapprovalContinuationV2ActiveHashLockExists ? 1 : 0],
    ['safe_preapproval_continuation_v2_ready_for_apply_open', safePreapprovalContinuationV2ReadyForApply ? 1 : 0],
    ['safe_preapproval_continuation_v2_may_modify_production_app_files_open', safePreapprovalContinuationV2MayModifyProductionAppFiles ? 1 : 0],
    ['final_production_readiness_gap_v2_blockers', finalProductionReadinessGapV2Blockers],
    ['final_production_readiness_gap_v2_not_ready', finalProductionReadinessGapV2Present && !finalProductionReadinessGapV2Ready ? 1 : 0],
    ['final_production_readiness_gap_v2_generation_not_ready', finalProductionReadinessGapV2Present && !finalProductionReadinessGapV2GenerationV2Ready ? 1 : 0],
    ['final_production_readiness_gap_v2_decision_import_not_ready', finalProductionReadinessGapV2Present && !finalProductionReadinessGapV2DecisionImportV2Ready ? 1 : 0],
    ['final_production_readiness_gap_v2_wrong_pair_state', finalProductionReadinessGapV2Present && finalProductionReadinessGapV2ActiveApprovalArtifactPairState !== 'absent_waiting_for_exact_approval_source' ? 1 : 0],
    ['final_production_readiness_gap_v2_missing_probe_passes', Math.max(0, finalProductionReadinessGapV2FixtureProbes - finalProductionReadinessGapV2FixtureProbesPassed)],
    ['final_production_readiness_gap_v2_active_receipt_exists', finalProductionReadinessGapV2ActiveApprovalReceiptExists ? 1 : 0],
    ['final_production_readiness_gap_v2_active_hash_lock_exists', finalProductionReadinessGapV2ActiveHashLockExists ? 1 : 0],
    ['final_production_readiness_gap_v2_ready_for_apply_open', finalProductionReadinessGapV2ReadyForApply ? 1 : 0],
    ['final_production_readiness_gap_v2_may_modify_production_app_files_open', finalProductionReadinessGapV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_blockers', exactApprovalSourceHandoffFirewallV2Blockers],
    ['exact_approval_source_handoff_firewall_v2_not_ready', exactApprovalSourceHandoffFirewallV2Present && !exactApprovalSourceHandoffFirewallV2Ready ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_source_unexpectedly_exists', exactApprovalSourceHandoffFirewallV2ApprovalSourceExists ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_active_receipt_exists', exactApprovalSourceHandoffFirewallV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_active_hash_lock_exists', exactApprovalSourceHandoffFirewallV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_ready_for_apply_open', exactApprovalSourceHandoffFirewallV2ReadyForApply ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_may_modify_production_app_files_open', exactApprovalSourceHandoffFirewallV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_can_start_production_apply_open', exactApprovalSourceHandoffFirewallV2CanStartProductionApply ? 1 : 0],
    ['exact_approval_source_handoff_firewall_v2_missing_probe_passes', Math.max(0, exactApprovalSourceHandoffFirewallV2FixtureProbes - exactApprovalSourceHandoffFirewallV2FixtureProbesPassed)],
    ['exact_approval_source_wait_terminal_state_v2_blockers', exactApprovalSourceWaitTerminalStateV2Blockers],
    ['exact_approval_source_wait_terminal_state_v2_not_ready', exactApprovalSourceWaitTerminalStateV2Present && !exactApprovalSourceWaitTerminalStateV2Ready ? 1 : 0],
    ['exact_approval_source_wait_terminal_state_v2_source_unexpectedly_exists', exactApprovalSourceWaitTerminalStateV2ApprovalSourceExists ? 1 : 0],
    ['exact_approval_source_wait_terminal_state_v2_active_receipt_exists', exactApprovalSourceWaitTerminalStateV2ActiveApprovalReceiptExists ? 1 : 0],
    ['exact_approval_source_wait_terminal_state_v2_active_hash_lock_exists', exactApprovalSourceWaitTerminalStateV2ActiveHashLockExists ? 1 : 0],
    ['exact_approval_source_wait_terminal_state_v2_ready_for_apply_open', exactApprovalSourceWaitTerminalStateV2ReadyForApply ? 1 : 0],
    ['exact_approval_source_wait_terminal_state_v2_may_modify_production_app_files_open', exactApprovalSourceWaitTerminalStateV2MayModifyProductionAppFiles ? 1 : 0],
    ['exact_approval_source_wait_terminal_state_v2_can_start_production_apply_open', exactApprovalSourceWaitTerminalStateV2CanStartProductionApply ? 1 : 0],
    ['exact_approval_source_wait_terminal_state_v2_missing_probe_passes', Math.max(0, exactApprovalSourceWaitTerminalStateV2FixtureProbes - exactApprovalSourceWaitTerminalStateV2FixtureProbesPassed)],
    ['post_exact_approval_apply_runbook_v2_blockers', postExactApprovalApplyRunbookV2Blockers],
    ['post_exact_approval_apply_runbook_v2_not_ready', postExactApprovalApplyRunbookV2Present && !postExactApprovalApplyRunbookV2Ready ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_missing_steps', postExactApprovalApplyRunbookV2Present ? Math.max(0, 6 - postExactApprovalApplyRunbookV2Steps) : 0],
    ['post_exact_approval_apply_runbook_v2_p31_allowed_now_open', postExactApprovalApplyRunbookV2P31CreateAllowedNow ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_p31_not_allowed_after_source', postExactApprovalApplyRunbookV2Present && !postExactApprovalApplyRunbookV2P31CreateAllowedWhenExactSourcePresent ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_production_writes_open', postExactApprovalApplyRunbookV2ProductionWritesAllowedNow ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_active_receipt_exists', postExactApprovalApplyRunbookV2ActiveApprovalReceiptExists ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_active_hash_lock_exists', postExactApprovalApplyRunbookV2ActiveHashLockExists ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_can_start_production_apply_open', postExactApprovalApplyRunbookV2CanStartProductionApplyNow ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_missing_probe_passes', Math.max(0, postExactApprovalApplyRunbookV2FixtureProbes - postExactApprovalApplyRunbookV2FixtureProbesPassed)],
    ['post_exact_approval_apply_runbook_v2_ready_for_apply_open', postExactApprovalApplyRunbookV2ReadyForApply ? 1 : 0],
    ['post_exact_approval_apply_runbook_v2_may_modify_production_app_files_open', postExactApprovalApplyRunbookV2MayModifyProductionAppFiles ? 1 : 0],
    ['research_json_firewall_blockers', researchJsonFirewallBlockers],
    ['next_pass_contract_blockers', nextPassContractBlockers],
    ['run_validator_blockers', runValidatorBlockers],
    ['generation_blockers', generationBlockers],
  ];

  const isExpectedRemoteVerifyExactApprovalCommandHold = (code: string): boolean => {
    if (frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply || productionReadinessCompletionAuditV2Ready) {
      return false;
    }
    if (
      code.includes('_ready_for_apply_open') ||
      code.includes('_may_modify_production_app_files_open') ||
      code.includes('_active_receipt_exists') ||
      code.includes('_active_hash_lock_exists') ||
      code.includes('_active_approval_receipt_open') ||
      code.includes('_active_hash_lock_open') ||
      code.includes('_command_executed_by_script') ||
      code.includes('_production_writes_open') ||
      code.includes('_can_start_production_apply_open')
    ) {
      return false;
    }
    return (
      code.startsWith('exact_approval_p45_sequence_command_preflight_v2_') ||
      code.startsWith('exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_') ||
      code.startsWith('exact_approval_p46_apply_transaction_command_preflight_v2_') ||
      code.startsWith('exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_') ||
      code.startsWith('exact_approval_p47_rollback_guard_command_preflight_v2_') ||
      code.startsWith('exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_') ||
      code.startsWith('exact_approval_p48_safe_continuation_command_preflight_v2_')
    );
  };

  for (const [code, count] of gateBlockers) {
    if (count > 0 && isExpectedRemoteVerifyExactApprovalCommandHold(String(code))) {
      continue;
    }
    if (count > 0 && productionReadinessCompletionAuditV2Activated && isAllowedActivatedApprovalSelfCycleCode(String(code))) {
      continue;
    }
    if (count > 0 && postApprovalSequenceReady && isAllowedPostApprovalLockedSelfCycleCode(String(code))) {
      continue;
    }
    if (count > 0) {
      addBlocker(findings, String(code), `Critical source report contains ${count} blocker(s).`);
    }
  }

  const criticalArtifactsMissing = findings.filter((finding) => finding.code === 'critical_artifact_missing').length;
  const blockersRaw = findings.filter((finding) => finding.severity === 'blocker').length;
  const terminalWaitSelfCycleBlockersSuppressed = findings
    .filter((finding) => finding.severity === 'blocker' && isAllowedTerminalWaitSelfCycleCode(finding.code))
    .length;
  const blockers = findings
    .filter((finding) =>
      finding.severity === 'blocker' &&
      !isAllowedTerminalWaitSelfCycleCode(finding.code) &&
      !(productionReadinessCompletionAuditV2Activated && isAllowedActivatedApprovalSelfCycleCode(finding.code)) &&
      !(postApprovalSequenceReady && isAllowedPostApprovalLockedSelfCycleCode(finding.code))
    )
    .length;
  const reportWarnings = [
    languageIsolationWarnings,
    n(translationQa, 'warnings'),
    n(generatedContent, 'warnings'),
    n(handoffIntegrity, 'warnings'),
    n(batchFilesIntegrity, 'warnings'),
    n(decisionTemplateIntegrity, 'warnings'),
    n(decisionImportDryRun, 'warnings'),
    n(starterNoopDryRun, 'warnings'),
    n(fixtureQa, 'warnings'),
    n(priorityAudit, 'warnings'),
    n(priorityIntegrity, 'warnings'),
    n(priorityBatches, 'findingsWarnings') || n(priorityBatches, 'warnings'),
    n(reviewerExecutionWorkOrder, 'warnings'),
    n(reviewStarterPack, 'warnings'),
    n(reviewProgress, 'warnings'),
    n(selfImprovingUpgrade, 'warnings'),
    generationHistoryWarnings,
    appAtlasRefreshWarnings,
    domainRegistryV2Warnings,
    targetResearchPackBuilderWarnings,
    targetResearchPackVerifyWarnings,
    targetPedagogyBlueprintWarnings,
    generationSchemaV2Warnings,
    aiPromptContractV2Warnings,
    contentQualityGatesV2Warnings,
    reviewerWorkflowV2Warnings,
    targetPackManifestV2Warnings,
    runtimeServerDeliveryContractV2Warnings,
    storageCloudTargetMapV2Warnings,
    adminReviewerDeliverySurfaceV2Warnings,
    reviewerDecisionImportV2DryRunWarnings,
    payloadShardMaterializationChecksumV2Warnings,
    serverDeliveryManifestPreviewV2Warnings,
    runtimeCacheIntegrityRollbackV2Warnings,
    reviewerDecisionImportOpeningPreflightV2Warnings,
    llmOfficialSourceReviewIntakeV2Warnings,
    reviewerDecisionImportExecutionGateV2Warnings,
    llmOfficialSourceDecisionMaterializationV2Warnings,
    llmOfficialSourceDecisionDryRunV2Warnings,
    llmOfficialSourceDecisionPromotionPreflightV2Warnings,
    llmOfficialSourcePromotedDecisionFileGenerationV2Warnings,
    payloadCreationApprovalPreflightV2Warnings,
    closedLocalPayloadMaterializationV2Warnings,
    serverDeliveryPublishPreflightV2Warnings,
    adminServerDeliveryRuntimePreflightV2Warnings,
    runtimeActivationBlockerPlanV2Warnings,
    runtimeDeliveryEvidenceChainV2Warnings,
    productionApplyAbsenceDenialGateV2Warnings,
    nonproductionBlockerClosurePlanV2Warnings,
    nonproductionEvidenceRefreshV2Warnings,
    runtimeServerManifestConsistencyRecheckV2Warnings,
    languageIsolationRegressionRecheckV2Warnings,
    readinessApplyBlockerMapRefreshV2Warnings,
    masterNextPassConsistencyRefreshV2Warnings,
    officialSourceContentCoverageV2Warnings,
    productionActivationHoldExactApprovalRequiredV2Warnings,
    exactApprovalValidationGateV2Warnings,
    productionActivationSequencePreflightV2Warnings,
    productionApplyTransactionContractV2Warnings,
    postApplyRollbackGuardContractV2Warnings,
    approvalWaitSafeContinuationV2Warnings,
    productionReadinessCompletionAuditV2Warnings,
    finalPreapprovalEvidenceHashLockV2Warnings,
    exactApprovalApplyRehearsalV2Warnings,
    exactApprovalSourceFirewallV2Warnings,
    exactApprovalSourceIntakeTransitionV2Warnings,
    exactApprovalActiveArtifactPairSimulationV2Warnings,
    exactApprovalP31CreateCommandPreflightV2Warnings,
    exactApprovalP44ValidationCommandPreflightV2Warnings,
    exactApprovalP44ToP45SequenceHandoffSimulationV2Warnings,
    exactApprovalP45SequenceCommandPreflightV2Warnings,
    exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Warnings,
    exactApprovalP46ApplyTransactionCommandPreflightV2Warnings,
    exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Warnings,
    exactApprovalP47RollbackGuardCommandPreflightV2Warnings,
    exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Warnings,
    exactApprovalP48SafeContinuationCommandPreflightV2Warnings,
    exactApprovalWaitStateV2Warnings,
    orderedApprovalWaitRefreshV2Warnings,
    safePreapprovalContinuationV2Warnings,
    finalProductionReadinessGapV2Warnings,
    exactApprovalSourceHandoffFirewallV2Warnings,
    exactApprovalSourceWaitTerminalStateV2Warnings,
    postExactApprovalApplyRunbookV2Warnings,
    researchJsonFirewallWarnings,
    nextPassContractWarnings,
    n(runValidator, 'warnings'),
  ].reduce((sum, value) => sum + value, 0);
  const warnings = findings.filter((finding) => finding.severity === 'warning').length + reportWarnings;
  const readyForReviewer =
    blockers === 0 &&
    lessonLedgers.length === EXPECTED_LESSON_LEDGER_COUNT &&
    generatedRows === EXPECTED_ROW_COUNT &&
    queueRows === EXPECTED_ROW_COUNT &&
    decisionTemplateRows === EXPECTED_ROW_COUNT &&
    batchJsonlFiles === EXPECTED_BATCH_FILE_COUNT &&
    batchTsvFiles === EXPECTED_BATCH_FILE_COUNT &&
    languageIsolationBlockers === 0 &&
    languageIsolationWarnings === 0 &&
    rowsMissingTargetLocale === 0 &&
    b(translationQa, 'readyForReviewer') &&
    b(generatedContent, 'readyForReviewer') &&
    b(handoffIntegrity, 'readyForReviewer') &&
    b(batchFilesIntegrity, 'readyForReviewer') &&
    b(decisionTemplateIntegrity, 'readyForReviewer') &&
    b(starterNoopDryRun, 'readyForReviewer') &&
    b(fixtureQa, 'readyForReviewer') &&
    b(priorityAudit, 'readyForReviewer') &&
    b(priorityIntegrity, 'readyForReviewer') &&
    b(priorityBatches, 'readyForReviewer') &&
    b(reviewerExecutionWorkOrder, 'readyForReviewer') &&
    b(reviewStarterPack, 'readyForReviewer') &&
    b(reviewProgress, 'readyForReviewer');
  const readyForResearchPackBuilder =
    blockers === 0 &&
    b(selfImprovingUpgrade, 'readyForResearchPackBuilder') &&
    b(appAtlasRefresh, 'readyForDomainRegistryV2') &&
    b(domainRegistryV2, 'readyForResearchPackBuilder') &&
    generationHistoryBlockers === 0 &&
    appAtlasRefreshBlockers === 0 &&
    appAtlasUnclassifiedTargetSensitiveFiles === 0 &&
    domainRegistryV2Blockers === 0 &&
    domainRegistryV2AiPromptEntrypointsMissing === 0;
  const readyForPedagogyBlueprint =
    blockers === 0 &&
    researchPackPresent &&
    targetResearchPackVerifyBlockers === 0 &&
    b(targetResearchPackVerify, 'readyForPedagogyBlueprint');
  const readyForGenerationSchemaV2 =
    blockers === 0 &&
    readyForPedagogyBlueprint &&
    targetPedagogyBlueprintBlockers === 0 &&
    b(targetPedagogyBlueprint, 'readyForGenerationSchemaV2');
  const readyForAiPromptContractV2 =
    blockers === 0 &&
    readyForGenerationSchemaV2 &&
    generationSchemaV2Blockers === 0 &&
    b(generationSchemaV2, 'readyForAiPromptContractV2');
  const readyForContentQualityGatesV2 =
    blockers === 0 &&
    readyForAiPromptContractV2 &&
    aiPromptContractV2Blockers === 0 &&
    b(aiPromptContractV2, 'readyForContentQualityGatesV2');
  const readyForReviewerWorkflowV2 =
    blockers === 0 &&
    readyForContentQualityGatesV2 &&
    contentQualityGatesV2Blockers === 0 &&
    b(contentQualityGatesV2, 'readyForReviewerWorkflowV2');
  const readyForLlmOfficialSourceReviewV2 =
    blockers === 0 &&
    readyForReviewerWorkflowV2 &&
    reviewerWorkflowV2Blockers === 0 &&
    b(reviewerWorkflowV2, 'readyForLlmOfficialSourceReviewV2');
  const readyForBrainGateV2 =
    blockers === 0 &&
    readyForLlmOfficialSourceReviewV2 &&
    b(reviewerWorkflowV2, 'readyForBrainGateV2');
  const readyForRuntimeServerDeliveryContractV2 =
    blockers === 0 &&
    readyForBrainGateV2 &&
    targetPackManifestV2Blockers === 0 &&
    b(targetPackManifestV2, 'readyForRuntimeServerDeliveryContractV2');
  const readyForStorageCloudTargetMapV2 =
    blockers === 0 &&
    readyForRuntimeServerDeliveryContractV2 &&
    runtimeServerDeliveryContractV2Blockers === 0 &&
    b(runtimeServerDeliveryContractV2, 'readyForStorageCloudTargetMapV2');
  const readyForAdminPackDeliverySurfaceV2 =
    blockers === 0 &&
    readyForStorageCloudTargetMapV2 &&
    storageCloudTargetMapV2Blockers === 0 &&
    b(storageCloudTargetMapV2, 'readyForAdminPackDeliverySurfaceV2');
  const readyForReviewerDecisionImportV2DryRun =
    blockers === 0 &&
    readyForAdminPackDeliverySurfaceV2 &&
    adminReviewerDeliverySurfaceV2Blockers === 0 &&
    b(adminReviewerDeliverySurfaceV2, 'readyForReviewerDecisionImportV2DryRun');
  const readyForPayloadShardMaterializationGate =
    blockers === 0 &&
    readyForReviewerDecisionImportV2DryRun &&
    reviewerDecisionImportV2DryRunBlockers === 0 &&
    b(reviewerDecisionImportV2DryRun, 'readyForPayloadShardMaterializationGate');
  const readyForServerManifestPreviewGate =
    blockers === 0 &&
    readyForPayloadShardMaterializationGate &&
    payloadShardMaterializationChecksumV2Blockers === 0 &&
    b(payloadShardMaterializationChecksumV2, 'readyForServerManifestPreviewGate');
  const readyForRuntimeCacheIntegrityGate =
    blockers === 0 &&
    readyForServerManifestPreviewGate &&
    serverDeliveryManifestPreviewV2Blockers === 0 &&
    b(serverDeliveryManifestPreviewV2, 'readyForRuntimeCacheIntegrityGate');
  const readyForReviewerDecisionImportOpeningGate =
    blockers === 0 &&
    readyForRuntimeCacheIntegrityGate &&
    runtimeCacheIntegrityRollbackV2Blockers === 0 &&
    b(runtimeCacheIntegrityRollbackV2, 'readyForReviewerDecisionImportOpeningGate');
  const readyForReviewerDecisionImportOpeningPreflight =
    blockers === 0 &&
    readyForReviewerDecisionImportOpeningGate &&
    reviewerDecisionImportOpeningPreflightV2Blockers === 0 &&
    b(reviewerDecisionImportOpeningPreflightV2, 'readyForReviewerDecisionImportOpeningPreflight');
  const readyForLlmOfficialSourceReviewIntake =
    blockers === 0 &&
    readyForReviewerDecisionImportOpeningPreflight &&
    llmOfficialSourceReviewIntakeV2Blockers === 0 &&
    llmOfficialSourceReviewIntakeV2State !== 'blocked_by_findings' &&
    llmOfficialSourceReviewIntakeV2Present;
  const readyForReviewerDecisionImportExecutionGate =
    blockers === 0 &&
    readyForLlmOfficialSourceReviewIntake &&
    llmOfficialSourceReviewIntakeV2ExecutionGateReady;
  const readyForPayloadCreationApprovalPreflightV2 =
    blockers === 0 &&
    readyForReviewerDecisionImportExecutionGate &&
    reviewerDecisionImportExecutionGateV2Blockers === 0 &&
    reviewerDecisionImportExecutionGateV2PayloadCreationApprovalPreflightReady;
  const readyForDecisionImportV2ExpectedAiDecisions = Math.max(
    164,
    llmOfficialSourceReviewIntakeV2ReviewedAiDecisions,
    llmOfficialSourceReviewIntakeV2AcceptedAiDecisions,
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions,
    officialSourceContentCoverageV2AcceptedAi,
  );
  const readyForDecisionImportV2 =
    blockers === 0 &&
    frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply &&
    readyForPayloadCreationApprovalPreflightV2 &&
    reviewerDecisionImportV2DryRunPresent &&
    reviewerDecisionImportV2DryRunBlockers === 0 &&
    b(reviewerDecisionImportV2DryRun, 'readyForDecisionImportV2') &&
    officialSourceImportDryRunV2Ready &&
    llmOfficialSourceReviewIntakeV2Present &&
    llmOfficialSourceReviewIntakeV2Blockers === 0 &&
    llmOfficialSourceReviewIntakeV2State === 'llm_official_source_review_ready' &&
    llmOfficialSourceReviewIntakeV2ReviewedRowDecisions === EXPECTED_ROW_COUNT &&
    llmOfficialSourceReviewIntakeV2ReviewedAiDecisions === readyForDecisionImportV2ExpectedAiDecisions &&
    llmOfficialSourceReviewIntakeV2AcceptedRowDecisions === EXPECTED_ROW_COUNT &&
    llmOfficialSourceReviewIntakeV2AcceptedAiDecisions === readyForDecisionImportV2ExpectedAiDecisions &&
    reviewerDecisionImportExecutionGateV2WouldRun &&
    officialSourceImportExecutionGateV2Ready &&
    officialSourceImportExecutionGateV2WouldRun &&
    llmOfficialSourcePromotedDecisionFileGenerationV2Ready &&
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRowDecisions === EXPECTED_ROW_COUNT &&
    llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions === readyForDecisionImportV2ExpectedAiDecisions &&
    llmOfficialSourcePromotedDecisionFileGenerationV2OpenFlags === 0 &&
    llmOfficialSourcePromotedDecisionFileGenerationV2OutputTargetsConfined &&
    officialSourceContentCoverageV2Present &&
    officialSourceContentCoverageV2Blockers === 0 &&
    officialSourceContentCoverageV2State === 'official_source_content_coverage_complete_no_import' &&
    officialSourceContentCoverageV2AcceptedRows === EXPECTED_ROW_COUNT &&
    officialSourceContentCoverageV2AcceptedAi === readyForDecisionImportV2ExpectedAiDecisions &&
    officialSourceContentCoverageV2RowsWithTrustedSourceRefUrls === EXPECTED_ROW_COUNT &&
    officialSourceContentCoverageV2RowsWithEvidenceCoveredBySourceRefs === EXPECTED_ROW_COUNT &&
    officialSourceContentCoverageV2AiWithTrustedSourceRefUrls === readyForDecisionImportV2ExpectedAiDecisions &&
    officialSourceContentCoverageV2AiWithMinimumTrustedSourceRefs === readyForDecisionImportV2ExpectedAiDecisions &&
    officialSourceContentCoverageV2ReadyForImportDryRunRefresh &&
    !officialSourceContentCoverageV2ReadyForApply &&
    !officialSourceContentCoverageV2MayModifyProductionAppFiles &&
    !officialSourceImportDryRunV2ReadyForApply &&
    !officialSourceImportDryRunV2MayModifyProductionAppFiles &&
    reviewerDecisionImportV2DryRunReviewerImportOpenFlags === 0 &&
    reviewerDecisionImportV2DryRunProductionApplyOpenFlags === 0 &&
    reviewerDecisionImportV2DryRunActivationApprovedFlags === 0 &&
    !reviewerDecisionImportV2DryRunGeneratedLedgerWrites;
  const legacyGeneratedResearchEvidenceBridgeV2CoversLegacyResearchGaps =
    legacyGeneratedResearchEvidenceBridgeV2Ready &&
    legacyGeneratedResearchEvidenceBridgeV2LegacyRows === legacyGeneratedWithoutResearchPackRows &&
    legacyGeneratedResearchEvidenceBridgeV2RowsWithResearchEvidenceIds === generatedRowsMissingResearchEvidenceIds;
  const effectiveLegacyGeneratedWithoutResearchPackRows = legacyGeneratedResearchEvidenceBridgeV2CoversLegacyResearchGaps
    ? 0
    : legacyGeneratedWithoutResearchPackRows;
  const effectiveGeneratedRowsMissingResearchEvidenceIds = legacyGeneratedResearchEvidenceBridgeV2CoversLegacyResearchGaps
    ? 0
    : generatedRowsMissingResearchEvidenceIds;
  const readyForGenerationV2PayloadPreflightReady = readyForPayloadCreationApprovalPreflightV2;
  const readyForGenerationV2SelfImprovingReady = b(selfImprovingUpgrade, 'readyForGenerationV2');
  const readyForGenerationV2DomainRegistryReady = b(domainRegistryV2, 'readyForGenerationV2');
  const readyForGenerationV2BlockedByLegacyResearchGaps =
    effectiveLegacyGeneratedWithoutResearchPackRows > 0 ||
    effectiveGeneratedRowsMissingResearchEvidenceIds > 0;
  const readyForGenerationV2 =
    readyForGenerationV2PayloadPreflightReady &&
    readyForGenerationV2SelfImprovingReady &&
    readyForGenerationV2DomainRegistryReady &&
    !readyForGenerationV2BlockedByLegacyResearchGaps;

  const artifacts: ArtifactEntry[] = [
    ...lessonLedgers.map((file) => artifactEntry(repoRoot, file, 'generated_lesson_ledger', 'lesson_row_ledger')),
    ...reviewerSourceFiles.map((file) => artifactEntry(repoRoot, file, 'reviewer_artifact', extensionOf(file))),
    ...auditArtifactFiles.map((file) => artifactEntry(repoRoot, file, 'audit_artifact', extensionOf(file))),
  ];

  const manifestJson = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const manifestMd = path.join(reviewerDir, 'french_reviewer_master_manifest.md');
  const packetJson = path.join(auditsDir, 'french_reviewer_master_manifest_packet.json');
  const packetMd = path.join(auditsDir, 'french_reviewer_master_manifest_packet.md');

  const manifest: MasterManifest = {
    schemaVersion: 'gustav-french-reviewer-master-manifest-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      generatedLessonLedgers: lessonLedgers.length,
      generatedRows,
      reviewerSourceFiles: reviewerSourceFiles.length,
      reviewerSourceFilesByExtension,
      auditArtifactFiles: auditArtifactFiles.length,
      batchJsonlFiles,
      batchTsvFiles,
      queueRows,
      decisionTemplateRows,
      translationQaBlockers,
      generatedContentBlockers,
      runtimeContentIntegrityBlockers,
      runtimeContentIntegrityWarnings,
      runtimeContentIntegrityFilesScanned,
      runtimeContentIntegrityTextFieldsScanned,
      runtimeContentIntegrityPlaceholderTextFields,
      runtimeContentIntegrityMojibakeFields,
      runtimeContentIntegrityReplacementCharFields,
      runtimeContentIntegrityRuntimePayloadFiles,
      handoffIntegrityBlockers,
      batchFilesIntegrityBlockers,
      decisionTemplateIntegrityBlockers,
      decisionImportDryRunBlockers,
      starterNoopDryRunBlockers,
      fixtureQaBlockers,
      priorityAuditBlockers,
      priorityIntegrityBlockers,
      priorityBatchesBlockers,
      languageIsolationBlockers,
      languageIsolationWarnings,
      rowsMissingTargetLocale,
      reviewerExecutionWorkOrderBlockers,
      reviewStarterPackBlockers,
      reviewProgressBlockers,
      selfImprovingUpgradeBlockers,
      unresolvedCriticalWeaknesses,
      generationHistoryBlockers,
      generationHistoryWarnings,
      legacyGeneratedWithoutResearchPackRows,
      generatedRowsMissingResearchEvidenceIds,
      legacyGeneratedResearchEvidenceBridgeV2CoversLegacyResearchGaps,
      effectiveLegacyGeneratedWithoutResearchPackRows,
      effectiveGeneratedRowsMissingResearchEvidenceIds,
      appAtlasRefreshBlockers,
      appAtlasRefreshWarnings,
      appAtlasTargetSensitiveFiles,
      appAtlasUnclassifiedTargetSensitiveFiles,
      appAtlasAiPromptEntrypoints,
      domainRegistryV2Blockers,
      domainRegistryV2Warnings,
      domainRegistryV2Domains,
      domainRegistryV2AiPromptEntrypoints,
      domainRegistryV2AiPromptEntrypointsCovered,
      targetResearchPackBuilderBlockers,
      targetResearchPackBuilderWarnings,
      targetResearchPackVerifyBlockers,
      targetResearchPackVerifyWarnings,
      researchPackPresent,
      verifiedTrustedSources,
      verifiedGrammarClusters,
      researchPackFixtureProbesPassed,
      researchPackFixtureProbes,
      readyForPedagogyBlueprint,
      targetPedagogyBlueprintBlockers,
      targetPedagogyBlueprintWarnings,
      pedagogyBlueprintPresent,
      pedagogyBlueprintRowMappings,
      pedagogyBlueprintCategoryPolicies,
      pedagogyBlueprintAppDomainPolicies,
      pedagogyBlueprintFixtureProbesPassed,
      pedagogyBlueprintFixtureProbes,
      readyForGenerationSchemaV2,
      generationSchemaV2Blockers,
      generationSchemaV2Warnings,
      generationSchemaV2Present,
      generationSchemaV2RowRequirements,
      generationSchemaV2DomainContracts,
      generationSchemaV2FixtureProbesPassed,
      generationSchemaV2FixtureProbes,
      readyForAiPromptContractV2,
      aiPromptContractV2Blockers,
      aiPromptContractV2Warnings,
      aiPromptContractV2Present,
      aiPromptContractV2Entrypoints,
      aiPromptContractV2Domains,
      aiPromptContractV2RejectBeforeReturn,
      aiPromptContractV2RejectBeforeCache,
      aiPromptContractV2CriticalSurfaceClassesCovered,
      aiPromptContractV2CriticalSurfaceClassesExpected,
      aiPromptContractV2CriticalSurfaceContracts,
      aiPromptContractV2CriticalSurfaceLanguageDimensions,
      aiPromptContractV2CriticalSurfaceCacheContracts,
      aiPromptContractV2CriticalSurfaceRejectBeforeReturn,
      aiPromptContractV2CriticalSurfaceRejectBeforeCache,
      aiPromptContractV2CriticalSurfaceSafeFallback,
      aiPromptContractV2CriticalSurfaceGenerationBlocked,
      aiPromptContractV2CriticalSurfaceRequiredFilesCovered,
      aiPromptContractV2CriticalSurfaceRequiredFiles,
      aiPromptContractV2FixtureProbesPassed,
      aiPromptContractV2FixtureProbes,
      readyForContentQualityGatesV2,
      contentQualityGatesV2Blockers,
      contentQualityGatesV2Warnings,
      contentQualityGatesV2Present,
      contentQualityRowRequirements,
      contentQualityAiRequirements,
      contentQualityHighRiskAiRequirements,
      contentQualityFixtureProbesPassed,
      contentQualityFixtureProbes,
      readyForReviewerWorkflowV2,
      reviewerWorkflowV2Blockers,
      reviewerWorkflowV2Warnings,
      reviewerWorkflowV2Present,
      reviewerWorkflowV2RowTemplates,
      reviewerWorkflowV2AiTemplates,
      reviewerWorkflowV2HighRiskAiTemplates,
      reviewerWorkflowV2RowFixtureProbesPassed,
      reviewerWorkflowV2RowFixtureProbes,
      reviewerWorkflowV2AiFixtureProbesPassed,
      reviewerWorkflowV2AiFixtureProbes,
      readyForLlmOfficialSourceReviewV2,
      readyForDecisionImportV2,
      readyForBrainGateV2,
      targetPackManifestV2Blockers,
      targetPackManifestV2Warnings,
      targetPackManifestV2Present,
      targetPackManifestV2ProductionBlockers,
      targetPackManifestV2RuntimeSliceDrafts,
      targetPackManifestV2GateReports,
      targetPackManifestV2LessonRows,
      targetPackManifestV2AiDecisionSlots,
      readyForRuntimeServerDeliveryContractV2,
      runtimeServerDeliveryContractV2Blockers,
      runtimeServerDeliveryContractV2Warnings,
      runtimeServerDeliveryContractV2Present,
      runtimeServerDeliveryContractV2RequiredSlices,
      runtimeServerDeliveryContractV2CacheKeyContracts,
      runtimeServerDeliveryContractV2ProductionBlockers,
      runtimeServerDeliveryContractV2StartupImportsRuntime,
      runtimeServerDeliveryContractV2LoaderNetworkOrFsImports,
      runtimeServerDeliveryContractV2ServerUploadAllowed,
      runtimeServerDeliveryContractV2RuntimeDownloadsOpenFlags,
      readyForStorageCloudTargetMapV2,
      storageCloudTargetMapV2Blockers,
      storageCloudTargetMapV2Warnings,
      storageCloudTargetMapV2Present,
      storageCloudTargetMapV2TargetKeyDomains,
      storageCloudTargetMapV2ScopedFactories,
      storageCloudTargetMapV2FrenchSyncKeyRefs,
      storageCloudTargetMapV2TestedSurfaces,
      storageCloudTargetMapV2ProductionBlockers,
      storageCloudTargetMapV2StorageMigrationAllowed,
      storageCloudTargetMapV2CloudSyncMigrationAllowed,
      storageCloudTargetMapV2FirebaseWritesOpened,
      storageCloudTargetMapV2ReadyForApplyOpenFlags,
      readyForAdminPackDeliverySurfaceV2,
      adminReviewerDeliverySurfaceV2Blockers,
      adminReviewerDeliverySurfaceV2Warnings,
      adminReviewerDeliverySurfaceV2Present,
      adminReviewerDeliverySurfaceV2AdminSurfaceFiles,
      adminReviewerDeliverySurfaceV2ReviewerArtifacts,
      adminReviewerDeliverySurfaceV2RowDecisionRows,
      adminReviewerDeliverySurfaceV2AiDecisionRows,
      adminReviewerDeliverySurfaceV2RequiredApprovalFields,
      adminReviewerDeliverySurfaceV2RequiredAdminGates,
      adminReviewerDeliverySurfaceV2ProductionBlockers,
      adminReviewerDeliverySurfaceV2ServerUploadAllowed,
      adminReviewerDeliverySurfaceV2FirebaseUploadAllowed,
      adminReviewerDeliverySurfaceV2ReviewerImportAllowed,
      adminReviewerDeliverySurfaceV2RuntimeDownloadsEnabled,
      adminReviewerDeliverySurfaceV2ActivationApprovedFlags,
      adminReviewerDeliverySurfaceV2ReadyForApplyOpenFlags,
      readyForReviewerDecisionImportV2DryRun,
      reviewerDecisionImportV2DryRunBlockers,
      reviewerDecisionImportV2DryRunWarnings,
      reviewerDecisionImportV2DryRunPresent,
      reviewerDecisionImportV2DryRunRowDecisionRows,
      reviewerDecisionImportV2DryRunAiDecisionRows,
      reviewerDecisionImportV2DryRunReviewedRowDecisions,
      reviewerDecisionImportV2DryRunReviewedAiDecisions,
      reviewerDecisionImportV2DryRunRowNoOpRows,
      reviewerDecisionImportV2DryRunAiNoOpRows,
      reviewerDecisionImportV2DryRunRowProbesPassed,
      reviewerDecisionImportV2DryRunRowProbes,
      reviewerDecisionImportV2DryRunAiProbesPassed,
      reviewerDecisionImportV2DryRunAiProbes,
      reviewerDecisionImportV2DryRunReviewerImportOpenFlags,
      reviewerDecisionImportV2DryRunProductionApplyOpenFlags,
      reviewerDecisionImportV2DryRunActivationApprovedFlags,
      reviewerDecisionImportV2DryRunGeneratedLedgerWrites,
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
      payloadShardMaterializationChecksumV2Blockers,
      payloadShardMaterializationChecksumV2Warnings,
      payloadShardMaterializationChecksumV2Present,
      payloadShardMaterializationChecksumV2RuntimeSlices,
      payloadShardMaterializationChecksumV2ExpectedRuntimeSlices,
      payloadShardMaterializationChecksumV2MaterializationContracts,
      payloadShardMaterializationChecksumV2ManifestIdentityContracts,
      payloadShardMaterializationChecksumV2ChecksumContracts,
      payloadShardMaterializationChecksumV2ChecksumContractsWithSha256Dimension,
      payloadShardMaterializationChecksumV2CacheKeyContractsWithSha256,
      payloadShardMaterializationChecksumV2ServerPathPreviewsWithSha256,
      payloadShardMaterializationChecksumV2SourceLocaleScopedFuturePaths,
      payloadShardMaterializationChecksumV2UiLocaleIdentityDimensions,
      payloadShardMaterializationChecksumV2FutureArtifactFilesPresent,
      payloadShardMaterializationChecksumV2PreExistingLocalMaterializationAccounted,
      payloadShardMaterializationChecksumV2UnaccountedFutureArtifactFilesPresent,
      payloadShardMaterializationChecksumV2PayloadShardsCreated,
      payloadShardMaterializationChecksumV2ChecksumReportsCreated,
      payloadShardMaterializationChecksumV2ServerUploadAllowed,
      payloadShardMaterializationChecksumV2FirebaseUploadAllowed,
      payloadShardMaterializationChecksumV2RuntimeDownloadsEnabled,
      payloadShardMaterializationChecksumV2ActivationApprovedFlags,
      payloadShardMaterializationChecksumV2FixtureProbesPassed,
      payloadShardMaterializationChecksumV2FixtureProbes,
      readyForServerManifestPreviewGate,
      serverDeliveryManifestPreviewV2Blockers,
      serverDeliveryManifestPreviewV2Warnings,
      serverDeliveryManifestPreviewV2Present,
      serverDeliveryManifestPreviewV2PreviewEntries,
      serverDeliveryManifestPreviewV2ExpectedPreviewEntries,
      serverDeliveryManifestPreviewV2EntriesWithGateReportRefs,
      serverDeliveryManifestPreviewV2GateReportRefsPerEntryMin,
      serverDeliveryManifestPreviewV2GateReportRefsTotal,
      serverDeliveryManifestPreviewV2GateReportRefsCurrentSha,
      serverDeliveryManifestPreviewV2SourceManifestGateRefHashDrifts,
      serverDeliveryManifestPreviewV2EntriesWithRollbackFromVersion,
      serverDeliveryManifestPreviewV2EntriesWithActivationApprovedFalse,
      serverDeliveryManifestPreviewV2EntriesWithSha256Placeholder,
      serverDeliveryManifestPreviewV2EntriesWithByteSizePlaceholder,
      serverDeliveryManifestPreviewV2EntriesWithChecksumLinkage,
      serverDeliveryManifestPreviewV2SourceLocaleScopedServerPaths,
      serverDeliveryManifestPreviewV2UiLocaleIdentityDimensions,
      serverDeliveryManifestPreviewV2ServerUploadAllowed,
      serverDeliveryManifestPreviewV2FirebaseUploadAllowed,
      serverDeliveryManifestPreviewV2RuntimeDownloadsEnabled,
      serverDeliveryManifestPreviewV2EmbeddedIndexInsertionAllowed,
      serverDeliveryManifestPreviewV2ActivationApprovedFlags,
      serverDeliveryManifestPreviewV2FixtureProbesPassed,
      serverDeliveryManifestPreviewV2FixtureProbes,
      readyForRuntimeCacheIntegrityGate,
      runtimeCacheIntegrityRollbackV2Blockers,
      runtimeCacheIntegrityRollbackV2Warnings,
      runtimeCacheIntegrityRollbackV2Present,
      runtimeCacheIntegrityRollbackV2CacheStates,
      runtimeCacheIntegrityRollbackV2PreviewEntries,
      runtimeCacheIntegrityRollbackV2CacheIntegrityContracts,
      runtimeCacheIntegrityRollbackV2CacheKeyDimensionContracts,
      runtimeCacheIntegrityRollbackV2ReadyStateBlockedContracts,
      runtimeCacheIntegrityRollbackV2CacheWriteBlockedContracts,
      runtimeCacheIntegrityRollbackV2RuntimeDownloadBlockedContracts,
      runtimeCacheIntegrityRollbackV2ChecksumMismatchQuarantineContracts,
      runtimeCacheIntegrityRollbackV2ByteSizeMismatchQuarantineContracts,
      runtimeCacheIntegrityRollbackV2SourceLocaleMismatchRejectContracts,
      runtimeCacheIntegrityRollbackV2StudyTargetMismatchRejectContracts,
      runtimeCacheIntegrityRollbackV2StaleVersionContracts,
      runtimeCacheIntegrityRollbackV2OfflineFallbackRequiresPriorVersionContracts,
      runtimeCacheIntegrityRollbackV2RollbackSimulationContracts,
      runtimeCacheIntegrityRollbackV2UiLocaleIdentityDimensions,
      runtimeCacheIntegrityRollbackV2RuntimeDownloadsEnabled,
      runtimeCacheIntegrityRollbackV2CacheWritesOpened,
      runtimeCacheIntegrityRollbackV2ReadyCacheStateOpened,
      runtimeCacheIntegrityRollbackV2ServerUploadAllowed,
      runtimeCacheIntegrityRollbackV2ActivationApprovedFlags,
      runtimeCacheIntegrityRollbackV2FixtureProbesPassed,
      runtimeCacheIntegrityRollbackV2FixtureProbes,
      readyForReviewerDecisionImportOpeningGate,
      reviewerDecisionImportOpeningPreflightV2Blockers,
      reviewerDecisionImportOpeningPreflightV2Warnings,
      reviewerDecisionImportOpeningPreflightV2Present,
      reviewerDecisionImportOpeningPreflightV2OpeningState,
      reviewerDecisionImportOpeningPreflightV2OpeningEligible,
      reviewerDecisionImportOpeningPreflightV2RowDecisionRows,
      reviewerDecisionImportOpeningPreflightV2AiDecisionRows,
      reviewerDecisionImportOpeningPreflightV2ReviewedRowDecisions,
      reviewerDecisionImportOpeningPreflightV2ReviewedAiDecisions,
      reviewerDecisionImportOpeningPreflightV2BlankRowDecisions,
      reviewerDecisionImportOpeningPreflightV2BlankAiDecisions,
      reviewerDecisionImportOpeningPreflightV2ReviewerImportAllowedNow,
      reviewerDecisionImportOpeningPreflightV2ExecutionGateReady,
      reviewerDecisionImportOpeningPreflightV2PayloadCreationApprovalPreflightReady,
      reviewerDecisionImportOpeningPreflightV2FixtureProbesPassed,
      reviewerDecisionImportOpeningPreflightV2FixtureProbes,
      readyForReviewerDecisionImportOpeningPreflight,
      llmOfficialSourceReviewIntakeV2Blockers,
      llmOfficialSourceReviewIntakeV2Warnings,
      llmOfficialSourceReviewIntakeV2Present,
      llmOfficialSourceReviewIntakeV2State,
      llmOfficialSourceReviewIntakeV2RowDecisionRows,
      llmOfficialSourceReviewIntakeV2AiDecisionRows,
      llmOfficialSourceReviewIntakeV2ReviewedRowDecisions,
      llmOfficialSourceReviewIntakeV2ReviewedAiDecisions,
      llmOfficialSourceReviewIntakeV2AcceptedRowDecisions,
      llmOfficialSourceReviewIntakeV2AcceptedAiDecisions,
      llmOfficialSourceReviewIntakeV2BlankRowDecisions,
      llmOfficialSourceReviewIntakeV2BlankAiDecisions,
      llmOfficialSourceReviewIntakeV2RowCoveragePct,
      llmOfficialSourceReviewIntakeV2AiCoveragePct,
      llmOfficialSourceReviewIntakeV2LessonCoverageBuckets,
      llmOfficialSourceReviewIntakeV2BatchCoverageBuckets,
      llmOfficialSourceReviewIntakeV2GateCoverageBuckets,
      llmOfficialSourceReviewIntakeV2AiDomainCoverageBuckets,
      llmOfficialSourceReviewIntakeV2ReviewerImportAllowedNow,
      llmOfficialSourceReviewIntakeV2ExecutionGateReady,
      llmOfficialSourceReviewIntakeV2PayloadCreationApprovalPreflightReady,
      llmOfficialSourceReviewIntakeV2FixtureProbesPassed,
      llmOfficialSourceReviewIntakeV2FixtureProbes,
      readyForLlmOfficialSourceReviewIntake,
      readyForReviewerDecisionImportExecutionGate,
      reviewerDecisionImportExecutionGateV2Blockers,
      reviewerDecisionImportExecutionGateV2Warnings,
      reviewerDecisionImportExecutionGateV2Present,
      reviewerDecisionImportExecutionGateV2State,
      reviewerDecisionImportExecutionGateV2WouldRun,
      reviewerDecisionImportExecutionGateV2ReviewedRowDecisions,
      reviewerDecisionImportExecutionGateV2ReviewedAiDecisions,
      reviewerDecisionImportExecutionGateV2AcceptedRowDecisions,
      reviewerDecisionImportExecutionGateV2AcceptedAiDecisions,
      reviewerDecisionImportExecutionGateV2UpstreamCountsConsistent,
      reviewerDecisionImportExecutionGateV2PayloadCreationApprovalPreflightReady,
      reviewerDecisionImportExecutionGateV2FixtureProbesPassed,
      reviewerDecisionImportExecutionGateV2FixtureProbes,
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
      llmOfficialSourceDecisionMaterializationV2Blockers,
      llmOfficialSourceDecisionMaterializationV2Warnings,
      llmOfficialSourceDecisionMaterializationV2Present,
      llmOfficialSourceDecisionMaterializationV2State,
      llmOfficialSourceDecisionMaterializationV2RowDecisionRows,
      llmOfficialSourceDecisionMaterializationV2AiDecisionRows,
      llmOfficialSourceDecisionMaterializationV2CurrentReviewedRowDecisions,
      llmOfficialSourceDecisionMaterializationV2CurrentReviewedAiDecisions,
      llmOfficialSourceDecisionMaterializationV2NonLlmReviewDependencyRequired,
      llmOfficialSourceDecisionMaterializationV2ReadyForDryRun,
      llmOfficialSourceDecisionMaterializationV2FixtureProbesPassed,
      llmOfficialSourceDecisionMaterializationV2FixtureProbes,
      llmOfficialSourceDecisionDryRunV2Blockers,
      llmOfficialSourceDecisionDryRunV2Warnings,
      llmOfficialSourceDecisionDryRunV2Present,
      llmOfficialSourceDecisionDryRunV2State,
      llmOfficialSourceDecisionDryRunV2RowCandidateProposals,
      llmOfficialSourceDecisionDryRunV2AiCandidateProposals,
      llmOfficialSourceDecisionDryRunV2PendingRowCandidates,
      llmOfficialSourceDecisionDryRunV2PendingAiCandidates,
      llmOfficialSourceDecisionDryRunV2AcceptedRowCandidates,
      llmOfficialSourceDecisionDryRunV2AcceptedAiCandidates,
      llmOfficialSourceDecisionDryRunV2ProposalFilesWritten,
      llmOfficialSourceDecisionDryRunV2CandidateWritesConfined,
      llmOfficialSourceDecisionDryRunV2ReadyForPromotionPreflight,
      llmOfficialSourceDecisionDryRunV2FixtureProbesPassed,
      llmOfficialSourceDecisionDryRunV2FixtureProbes,
      llmOfficialSourceDecisionPromotionPreflightV2Blockers,
      llmOfficialSourceDecisionPromotionPreflightV2Warnings,
      llmOfficialSourceDecisionPromotionPreflightV2Present,
      llmOfficialSourceDecisionPromotionPreflightV2State,
      llmOfficialSourceDecisionPromotionPreflightV2RowCandidateProposals,
      llmOfficialSourceDecisionPromotionPreflightV2AiCandidateProposals,
      llmOfficialSourceDecisionPromotionPreflightV2AcceptedRowCandidates,
      llmOfficialSourceDecisionPromotionPreflightV2AcceptedAiCandidates,
      llmOfficialSourceDecisionPromotionPreflightV2PromotedDecisionFilesWritten,
      llmOfficialSourceDecisionPromotionPreflightV2FutureTargetsConfined,
      llmOfficialSourceDecisionPromotionPreflightV2FutureRowTargetSeparate,
      llmOfficialSourceDecisionPromotionPreflightV2FutureAiTargetSeparate,
      llmOfficialSourceDecisionPromotionPreflightV2ReadyForPromotedDecisionFileGeneration,
      llmOfficialSourceDecisionPromotionPreflightV2FixtureProbesPassed,
      llmOfficialSourceDecisionPromotionPreflightV2FixtureProbes,
      llmOfficialSourcePromotedDecisionFileGenerationV2Blockers,
      llmOfficialSourcePromotedDecisionFileGenerationV2Warnings,
      llmOfficialSourcePromotedDecisionFileGenerationV2Present,
      llmOfficialSourcePromotedDecisionFileGenerationV2State,
      llmOfficialSourcePromotedDecisionFileGenerationV2RowDecisionRowsBuilt,
      llmOfficialSourcePromotedDecisionFileGenerationV2AiDecisionRowsBuilt,
      llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedRowDecisions,
      llmOfficialSourcePromotedDecisionFileGenerationV2AcceptedAiDecisions,
      llmOfficialSourcePromotedDecisionFileGenerationV2RowsWithEvidenceNotes,
      llmOfficialSourcePromotedDecisionFileGenerationV2AiWithEvidenceNotes,
      llmOfficialSourcePromotedDecisionFileGenerationV2OpenFlags,
      llmOfficialSourcePromotedDecisionFileGenerationV2OutputTargetsConfined,
      llmOfficialSourcePromotedDecisionFileGenerationV2ReadyForImportRefresh,
      llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractReady,
      llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractEntrypoints,
      llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractUniqueIds,
      llmOfficialSourcePromotedDecisionFileGenerationV2AiPromptContractCriticalContracts,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiUniqueContractIds,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDuplicateContractIds,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMatchedToPromptContracts,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiExtraContracts,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiMissingContracts,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContracts,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCriticalContractsMatched,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiDomainMatchedToPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFilePathMatchedToPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiFeatureRiskClassMatchedToPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRiskLevelMatchedToPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetLocaleMatchedToPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiSourceLocalesMatchedToPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiCacheDimensionsMatchedToPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageGatePassed,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshReturnClosedByPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiRejectedFreshCacheClosedByPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiTargetOutputBeforeQualityClosedByPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2PromotedAiWrongLanguageFallbackClosedByPromptContract,
      llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed,
      llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes,
      legacyGeneratedResearchEvidenceBridgeV2Blockers,
      legacyGeneratedResearchEvidenceBridgeV2Warnings,
      legacyGeneratedResearchEvidenceBridgeV2Present,
      legacyGeneratedResearchEvidenceBridgeV2State,
      legacyGeneratedResearchEvidenceBridgeV2Ready,
      legacyGeneratedResearchEvidenceBridgeV2LegacyRows,
      legacyGeneratedResearchEvidenceBridgeV2PromotedRows,
      legacyGeneratedResearchEvidenceBridgeV2RowIdentityMatched,
      legacyGeneratedResearchEvidenceBridgeV2RowsWithResearchEvidenceIds,
      legacyGeneratedResearchEvidenceBridgeV2RowsWithAllRequiredGatesPassed,
      legacyGeneratedResearchEvidenceBridgeV2AiDecisions,
      legacyGeneratedResearchEvidenceBridgeV2HighRiskAiDecisions,
      legacyGeneratedResearchEvidenceBridgeV2HighRiskAiWithResearchGate,
      legacyGeneratedResearchEvidenceBridgeV2AiLanguageGatesPassed,
      legacyGeneratedResearchEvidenceBridgeV2AiWithOfficialSourceNotes,
      legacyGeneratedResearchEvidenceBridgeV2DryRunReady,
      legacyGeneratedResearchEvidenceBridgeV2FixtureProbesPassed,
      legacyGeneratedResearchEvidenceBridgeV2FixtureProbes,
      legacyGeneratedResearchEvidenceBridgeV2ReadyForApply,
      legacyGeneratedResearchEvidenceBridgeV2MayModifyProductionAppFiles,
      readyForPayloadCreationApprovalPreflightV2,
      payloadCreationApprovalPreflightV2Blockers,
      payloadCreationApprovalPreflightV2Warnings,
      payloadCreationApprovalPreflightV2Present,
      payloadCreationApprovalPreflightV2State,
      payloadCreationApprovalPreflightV2ReadyForClosedPayloadMaterialization,
      payloadCreationApprovalPreflightV2HashChecksPassed,
      payloadCreationApprovalPreflightV2HashChecks,
      payloadCreationApprovalPreflightV2FixtureProbesPassed,
      payloadCreationApprovalPreflightV2FixtureProbes,
      payloadCreationApprovalPreflightV2ReadyForApply,
      officialSourcePayloadCreationApprovalPreflightV2Ready,
      officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate,
      closedLocalPayloadMaterializationV2Blockers,
      closedLocalPayloadMaterializationV2Warnings,
      closedLocalPayloadMaterializationV2Present,
      closedLocalPayloadMaterializationV2State,
      closedLocalPayloadMaterializationV2RuntimeSlices,
      closedLocalPayloadMaterializationV2PayloadEntries,
      closedLocalPayloadMaterializationV2PayloadBytes,
      closedLocalPayloadMaterializationV2ChecksumMismatches,
      closedLocalPayloadMaterializationV2ReadyForServerDeliveryPublishPreflight,
      closedLocalPayloadMaterializationV2FixtureProbesPassed,
      closedLocalPayloadMaterializationV2FixtureProbes,
      closedLocalPayloadMaterializationV2ReadyForApply,
      officialSourceClosedLocalPayloadMaterializationV2Ready,
      officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight,
      serverDeliveryPublishPreflightV2Blockers,
      serverDeliveryPublishPreflightV2Warnings,
      serverDeliveryPublishPreflightV2Present,
      serverDeliveryPublishPreflightV2State,
      serverDeliveryPublishPreflightV2ManifestEntries,
      serverDeliveryPublishPreflightV2ActualShaEntries,
      serverDeliveryPublishPreflightV2ActualByteSizeEntries,
      serverDeliveryPublishPreflightV2ChecksumMismatches,
      serverDeliveryPublishPreflightV2ReadyForAdminServerDeliveryReview,
      serverDeliveryPublishPreflightV2FixtureProbesPassed,
      serverDeliveryPublishPreflightV2FixtureProbes,
      serverDeliveryPublishPreflightV2ReadyForApply,
      productionServerManifestPublishGateV2Blockers,
      productionServerManifestPublishGateV2Warnings,
      productionServerManifestPublishGateV2Present,
      productionServerManifestPublishGateV2State,
      productionServerManifestPublishGateV2ReadyForRuntimeDownloadActivation,
      productionServerManifestPublishGateV2FixtureProbesPassed,
      productionServerManifestPublishGateV2FixtureProbes,
      frenchServerRemoteCredentialHandoffV2Present,
      frenchServerRemoteCredentialHandoffV2Status,
      frenchServerRemoteCredentialHandoffV2State,
      frenchServerRemoteCredentialHandoffV2CredentialSource,
      frenchServerRemoteCredentialHandoffV2CredentialPreflightReady,
      frenchServerRemoteCredentialHandoffV2RemoteVerifyBlockedByCredentials,
      frenchServerRemoteCredentialHandoffV2AcceptedCredentialOptions,
      frenchServerRemoteCredentialHandoffV2CredentialsPrinted,
      frenchServerRemoteCredentialHandoffV2UploadStarted,
      frenchServerRemoteCredentialHandoffV2RuntimeDownloadsEnabled,
      frenchServerRemoteCredentialHandoffV2ActivationApproved,
      frenchServerRemoteCredentialHandoffV2ReadyForApply,
      frenchUploadRemoteVerifyParityV2Blockers,
      frenchUploadRemoteVerifyParityV2Warnings,
      frenchUploadRemoteVerifyParityV2Present,
      frenchUploadRemoteVerifyParityV2ReadyForRemoteObjectVerify,
      frenchUploadRemoteVerifyParityV2MatchedServerPaths,
      frenchUploadRemoteVerifyParityV2ShaMatches,
      frenchUploadRemoteVerifyParityV2ByteMatches,
      frenchUploadRemoteVerifyParityV2UploadOnlyPaths,
      frenchUploadRemoteVerifyParityV2DryRunOnlyPaths,
      frenchUploadRemoteVerifyParityV2ScopedFrenchPaths,
      frenchServerObjectRemoteVerifyV2Blockers,
      frenchServerObjectRemoteVerifyV2Warnings,
      frenchServerObjectRemoteVerifyV2Present,
      frenchServerObjectRemoteVerifyV2ReadyForRuntimeDownloadActivation,
      frenchServerObjectRemoteVerifyV2FoundObjects,
      frenchServerObjectRemoteVerifyV2HashCheckedObjects,
      frenchServerObjectRemoteVerifyV2UnverifiedObjects,
      frenchServerObjectRemoteVerifyV2MissingObjects,
      frenchServerObjectRemoteVerifyV2SizeMismatches,
      frenchServerObjectRemoteVerifyV2HashMismatches,
      frenchServerObjectRemoteVerifyV2FixtureProbesPassed,
      frenchServerObjectRemoteVerifyV2FixtureProbes,
      frenchServerObjectRemoteVerifyV2PassedForDecisionImportAndApply,
      remoteVerifyBlocksDecisionImportAndApply,
      adminServerDeliveryRuntimePreflightV2Blockers,
      adminServerDeliveryRuntimePreflightV2Warnings,
      adminServerDeliveryRuntimePreflightV2Present,
      adminServerDeliveryRuntimePreflightV2State,
      adminServerDeliveryRuntimePreflightV2ManifestEntries,
      adminServerDeliveryRuntimePreflightV2AdminReady,
      adminServerDeliveryRuntimePreflightV2RuntimeReady,
      adminServerDeliveryRuntimePreflightV2StorageReady,
      adminServerDeliveryRuntimePreflightV2ReadyForRuntimeActivationBlockerPlanning,
      adminServerDeliveryRuntimePreflightV2FixtureProbesPassed,
      adminServerDeliveryRuntimePreflightV2FixtureProbes,
      adminServerDeliveryRuntimePreflightV2ReadyForApply,
      runtimeActivationBlockerPlanV2Blockers,
      runtimeActivationBlockerPlanV2Warnings,
      runtimeActivationBlockerPlanV2Present,
      runtimeActivationBlockerPlanV2State,
      runtimeActivationBlockerPlanV2PlanItems,
      runtimeActivationBlockerPlanV2PlannedTouches,
      runtimeActivationBlockerPlanV2ReadinessApplyBlockers,
      runtimeActivationBlockerPlanV2DirtyWorktreeOverlaps,
      runtimeActivationBlockerPlanV2ReadyForExplicitApprovalReceiptGate,
      runtimeActivationBlockerPlanV2FixtureProbesPassed,
      runtimeActivationBlockerPlanV2FixtureProbes,
      runtimeActivationBlockerPlanV2ReadyForApply,
      runtimeDeliveryEvidenceChainV2Blockers,
      runtimeDeliveryEvidenceChainV2Warnings,
      runtimeDeliveryEvidenceChainV2Present,
      runtimeDeliveryEvidenceChainV2State,
      runtimeDeliveryEvidenceChainV2Ready,
      runtimeDeliveryEvidenceChainV2UpstreamReportsPass,
      runtimeDeliveryEvidenceChainV2UpstreamReportBlockers,
      runtimeDeliveryEvidenceChainV2PreviewEntries,
      runtimeDeliveryEvidenceChainV2PreviewShaPlaceholders,
      runtimeDeliveryEvidenceChainV2PublishManifestEntries,
      runtimeDeliveryEvidenceChainV2ActualShaEntries,
      runtimeDeliveryEvidenceChainV2ActualByteSizeEntries,
      runtimeDeliveryEvidenceChainV2ManifestPayloadShaMatches,
      runtimeDeliveryEvidenceChainV2ManifestIndexShaMatches,
      runtimeDeliveryEvidenceChainV2ManifestSliceManifestShaMatches,
      runtimeDeliveryEvidenceChainV2ManifestChecksumReportsPresent,
      runtimeDeliveryEvidenceChainV2RuntimeRollbackSimulationContracts,
      runtimeDeliveryEvidenceChainV2RuntimeSourceLocaleMismatchRejectContracts,
      runtimeDeliveryEvidenceChainV2RuntimeStudyTargetMismatchRejectContracts,
      runtimeDeliveryEvidenceChainV2AdminReady,
      runtimeDeliveryEvidenceChainV2RuntimeReady,
      runtimeDeliveryEvidenceChainV2StorageReady,
      runtimeDeliveryEvidenceChainV2ClosedTransitions,
      runtimeDeliveryEvidenceChainV2ReadyForExactApprovalWaitState,
      runtimeDeliveryEvidenceChainV2FixtureProbesPassed,
      runtimeDeliveryEvidenceChainV2FixtureProbes,
      runtimeDeliveryEvidenceChainV2ReadyForApply,
      runtimeDeliveryEvidenceChainV2MayModifyProductionAppFiles,
      explicitApprovalReceiptHashLockGateV2Blockers,
      explicitApprovalReceiptHashLockGateV2Warnings,
      explicitApprovalReceiptHashLockGateV2Present,
      explicitApprovalReceiptHashLockGateV2State,
      explicitApprovalReceiptHashLockGateV2CriticalHashLocks,
      explicitApprovalReceiptHashLockGateV2DirtyFiles,
      explicitApprovalReceiptHashLockGateV2DirtyProductionCandidateFiles,
      explicitApprovalReceiptHashLockGateV2ReadyForApprovalRequestPresentation,
      explicitApprovalReceiptHashLockGateV2ActiveApprovalReceiptExists,
      explicitApprovalReceiptHashLockGateV2ActiveHashLockExists,
      explicitApprovalReceiptHashLockGateV2FixtureProbesPassed,
      explicitApprovalReceiptHashLockGateV2FixtureProbes,
      explicitApprovalReceiptHashLockGateV2ReadyForApply,
      activationApprovalRequestPresentationV2Blockers,
      activationApprovalRequestPresentationV2Warnings,
      activationApprovalRequestPresentationV2Present,
      activationApprovalRequestPresentationV2State,
      activationApprovalRequestPresentationV2CriticalHashLocks,
      activationApprovalRequestPresentationV2DirtyFiles,
      activationApprovalRequestPresentationV2ReadyForExplicitApprovalReceiptCreationGate,
      activationApprovalRequestPresentationV2ActiveApprovalReceiptExists,
      activationApprovalRequestPresentationV2ActiveHashLockExists,
      activationApprovalRequestPresentationV2FixtureProbesPassed,
      activationApprovalRequestPresentationV2FixtureProbes,
      activationApprovalRequestPresentationV2ReadyForApply,
      explicitApprovalReceiptCreationGateV2Blockers,
      explicitApprovalReceiptCreationGateV2Warnings,
      explicitApprovalReceiptCreationGateV2Present,
      explicitApprovalReceiptCreationGateV2State,
      explicitApprovalReceiptCreationGateV2ExactApprovalSentencePresent,
      explicitApprovalReceiptCreationGateV2PlainContinueRejected,
      explicitApprovalReceiptCreationGateV2ActiveApprovalReceiptCreated,
      explicitApprovalReceiptCreationGateV2ActiveHashLockCreated,
      explicitApprovalReceiptCreationGateV2CanContinueNonProductionAudit,
      explicitApprovalReceiptCreationGateV2FixtureProbesPassed,
      explicitApprovalReceiptCreationGateV2FixtureProbes,
      explicitApprovalReceiptCreationGateV2ReadyForApply,
      productionApplyAbsenceDenialGateV2Blockers,
      productionApplyAbsenceDenialGateV2Warnings,
      productionApplyAbsenceDenialGateV2Present,
      productionApplyAbsenceDenialGateV2State,
      productionApplyAbsenceDenialGateV2ApplyDenied,
      productionApplyAbsenceDenialGateV2ActiveApprovalReceiptExists,
      productionApplyAbsenceDenialGateV2ActiveHashLockExists,
      productionApplyAbsenceDenialGateV2CanContinueNonProductionAudit,
      productionApplyAbsenceDenialGateV2ReadyForNonProductionContinuation,
      productionApplyAbsenceDenialGateV2FixtureProbesPassed,
      productionApplyAbsenceDenialGateV2FixtureProbes,
      productionApplyAbsenceDenialGateV2ReadyForApply,
      nonproductionBlockerClosurePlanV2Blockers,
      nonproductionBlockerClosurePlanV2Warnings,
      nonproductionBlockerClosurePlanV2Present,
      nonproductionBlockerClosurePlanV2State,
      nonproductionBlockerClosurePlanV2ChainReady,
      nonproductionBlockerClosurePlanV2SafeItems,
      nonproductionBlockerClosurePlanV2ExactApprovalOnlyItems,
      nonproductionBlockerClosurePlanV2ProductionLockedItems,
      nonproductionBlockerClosurePlanV2RecommendedNextSafeItem,
      nonproductionBlockerClosurePlanV2ReadyForNextNonProductionPass,
      nonproductionBlockerClosurePlanV2FixtureProbesPassed,
      nonproductionBlockerClosurePlanV2FixtureProbes,
      nonproductionBlockerClosurePlanV2ReadyForApply,
      nonproductionBlockerClosurePlanV2MayModifyProductionAppFiles,
      nonproductionEvidenceRefreshV2Blockers,
      nonproductionEvidenceRefreshV2Warnings,
      nonproductionEvidenceRefreshV2Present,
      nonproductionEvidenceRefreshV2State,
      nonproductionEvidenceRefreshV2LegacyReviewResidueMatches,
      nonproductionEvidenceRefreshV2ReadyForNextManifestRecheck,
      nonproductionEvidenceRefreshV2FixtureProbesPassed,
      nonproductionEvidenceRefreshV2FixtureProbes,
      nonproductionEvidenceRefreshV2ReadyForApply,
      nonproductionEvidenceRefreshV2MayModifyProductionAppFiles,
      runtimeServerManifestConsistencyRecheckV2Blockers,
      runtimeServerManifestConsistencyRecheckV2Warnings,
      runtimeServerManifestConsistencyRecheckV2Present,
      runtimeServerManifestConsistencyRecheckV2State,
      runtimeServerManifestConsistencyRecheckV2ManifestEntries,
      runtimeServerManifestConsistencyRecheckV2GateRefsCurrent,
      runtimeServerManifestConsistencyRecheckV2GateRefs,
      runtimeServerManifestConsistencyRecheckV2InputHashesCurrent,
      runtimeServerManifestConsistencyRecheckV2InputHashes,
      runtimeServerManifestConsistencyRecheckV2TopLevelUploadFlagsOpen,
      runtimeServerManifestConsistencyRecheckV2ActivationApprovedEntries,
      runtimeServerManifestConsistencyRecheckV2RuntimeDownloadsEnabledEntries,
      runtimeServerManifestConsistencyRecheckV2ReadyForApplyEntries,
      runtimeServerManifestConsistencyRecheckV2ReadyForNextLanguageIsolationRecheck,
      runtimeServerManifestConsistencyRecheckV2FixtureProbesPassed,
      runtimeServerManifestConsistencyRecheckV2FixtureProbes,
      runtimeServerManifestConsistencyRecheckV2ReadyForApply,
      runtimeServerManifestConsistencyRecheckV2MayModifyProductionAppFiles,
      languageIsolationRegressionRecheckV2Blockers,
      languageIsolationRegressionRecheckV2Warnings,
      languageIsolationRegressionRecheckV2Present,
      languageIsolationRegressionRecheckV2State,
      languageIsolationRegressionRecheckV2ScannedRows,
      languageIsolationRegressionRecheckV2ScannedTargetFields,
      languageIsolationRegressionRecheckV2PromptContractsWithTargetLocale,
      languageIsolationRegressionRecheckV2PromptEntrypointsExpected,
      languageIsolationRegressionRecheckV2ManifestEntries,
      languageIsolationRegressionRecheckV2ReadyForNextReadinessApplyBlockerMapRefresh,
      languageIsolationRegressionRecheckV2FixtureProbesPassed,
      languageIsolationRegressionRecheckV2FixtureProbes,
      languageIsolationRegressionRecheckV2ReadyForApply,
      languageIsolationRegressionRecheckV2MayModifyProductionAppFiles,
      readinessApplyBlockerMapRefreshV2Blockers,
      readinessApplyBlockerMapRefreshV2Warnings,
      readinessApplyBlockerMapRefreshV2Present,
      readinessApplyBlockerMapRefreshV2State,
      readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers,
      readinessApplyBlockerMapRefreshV2ReadinessGenerationBlockers,
      readinessApplyBlockerMapRefreshV2SafeClosed,
      readinessApplyBlockerMapRefreshV2SafeRemaining,
      readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh,
      readinessApplyBlockerMapRefreshV2FixtureProbesPassed,
      readinessApplyBlockerMapRefreshV2FixtureProbes,
      readinessApplyBlockerMapRefreshV2ReadyForApply,
      readinessApplyBlockerMapRefreshV2MayModifyProductionAppFiles,
      masterNextPassConsistencyRefreshV2Blockers,
      masterNextPassConsistencyRefreshV2Warnings,
      masterNextPassConsistencyRefreshV2Present,
      masterNextPassConsistencyRefreshV2State,
      masterNextPassConsistencyRefreshV2ReadyForOfficialSourceCoverage,
      masterNextPassConsistencyRefreshV2FixtureProbesPassed,
      masterNextPassConsistencyRefreshV2FixtureProbes,
      masterNextPassConsistencyRefreshV2ReadyForApply,
      masterNextPassConsistencyRefreshV2MayModifyProductionAppFiles,
      officialSourceContentCoverageV2Blockers,
      officialSourceContentCoverageV2Warnings,
      officialSourceContentCoverageV2Present,
      officialSourceContentCoverageV2State,
      officialSourceContentCoverageV2LedgerRows,
      officialSourceContentCoverageV2AcceptedRows,
      officialSourceContentCoverageV2AcceptedAi,
      officialSourceContentCoverageV2RowsWithSourceRefs,
      officialSourceContentCoverageV2RowsWithTrustedSourceRefUrls,
      officialSourceContentCoverageV2RowsWithEvidenceCoveredBySourceRefs,
      officialSourceContentCoverageV2RowsWithUntrustedSourceRefUrls,
      officialSourceContentCoverageV2RowsWithUntrustedSourceRefIds,
      officialSourceContentCoverageV2AiWithTrustedSourceRefUrls,
      officialSourceContentCoverageV2AiWithMinimumTrustedSourceRefs,
      officialSourceContentCoverageV2AiWithUntrustedSourceRefUrls,
      officialSourceContentCoverageV2AiWithUntrustedSourceRefIds,
      officialSourceContentCoverageV2RejectsNonHttpsSourceRefFixture,
      officialSourceContentCoverageV2RejectsUntrustedSourceDomainFixture,
      officialSourceContentCoverageV2RejectsUntrustedSourceIdFixture,
      officialSourceContentCoverageV2RejectsEvidenceWithoutMatchingSourceRefFixture,
      officialSourceContentCoverageV2RejectsInsufficientAiTrustedSourceRefsFixture,
      officialSourceContentCoverageV2RowsWithGatesPassed,
      officialSourceContentCoverageV2QuizRowsOneCorrect,
      officialSourceContentCoverageV2TrustedSourceIds,
      officialSourceContentCoverageV2P38Ready,
      officialSourceContentCoverageV2FreshAfterMasterRefresh,
      officialSourceContentCoverageV2FreshnessAcceptedByP38Snapshot,
      officialSourceContentCoverageV2ReadyForImportDryRunRefresh,
      officialSourceContentCoverageV2FixtureProbesPassed,
      officialSourceContentCoverageV2FixtureProbes,
      officialSourceContentCoverageV2ReadyForApply,
      officialSourceContentCoverageV2MayModifyProductionAppFiles,
      productionActivationHoldExactApprovalRequiredV2Blockers,
      productionActivationHoldExactApprovalRequiredV2Warnings,
      productionActivationHoldExactApprovalRequiredV2Present,
      productionActivationHoldExactApprovalRequiredV2State,
      productionActivationHoldExactApprovalRequiredV2Ready,
      productionActivationHoldExactApprovalRequiredV2ClosedEvidenceReady,
      productionActivationHoldExactApprovalRequiredV2ExactApprovalRequired,
      productionActivationHoldExactApprovalRequiredV2FixtureProbesPassed,
      productionActivationHoldExactApprovalRequiredV2FixtureProbes,
      productionActivationHoldExactApprovalRequiredV2ReadyForApply,
      productionActivationHoldExactApprovalRequiredV2MayModifyProductionAppFiles,
      exactApprovalValidationGateV2Blockers,
      exactApprovalValidationGateV2Warnings,
      exactApprovalValidationGateV2Present,
      exactApprovalValidationGateV2State,
      exactApprovalValidationGateV2Ready,
      exactApprovalValidationGateV2ReadyForProductionActivationSequencing,
      exactApprovalValidationGateV2ActiveApprovalReceiptExists,
      exactApprovalValidationGateV2ActiveHashLockExists,
      exactApprovalValidationGateV2FixtureProbesPassed,
      exactApprovalValidationGateV2FixtureProbes,
      exactApprovalValidationGateV2ReadyForApply,
      exactApprovalValidationGateV2MayModifyProductionAppFiles,
      productionActivationSequencePreflightV2Blockers,
      productionActivationSequencePreflightV2Warnings,
      productionActivationSequencePreflightV2Present,
      productionActivationSequencePreflightV2State,
      productionActivationSequencePreflightV2Ready,
      productionActivationSequencePreflightV2ReadyForProductionActivationSequence,
      productionActivationSequencePreflightV2FixtureProbesPassed,
      productionActivationSequencePreflightV2FixtureProbes,
      productionActivationSequencePreflightV2ReadyForApply,
      productionActivationSequencePreflightV2MayModifyProductionAppFiles,
      productionApplyTransactionContractV2Blockers,
      productionApplyTransactionContractV2Warnings,
      productionApplyTransactionContractV2Present,
      productionApplyTransactionContractV2State,
      productionApplyTransactionContractV2Ready,
      productionApplyTransactionContractV2ReadyForProductionApplyTransaction,
      productionApplyTransactionContractV2ServerManifestEntries,
      productionApplyTransactionContractV2PayloadFilesChecked,
      productionApplyTransactionContractV2IndexFilesChecked,
      productionApplyTransactionContractV2SliceManifestFilesChecked,
      productionApplyTransactionContractV2ShaMismatches,
      productionApplyTransactionContractV2MissingEntryFiles,
      productionApplyTransactionContractV2P49RequirementsProved,
      productionApplyTransactionContractV2P49RequirementsProductionLocked,
      productionApplyTransactionContractV2P49RequirementsMissing,
      productionApplyTransactionContractV2P49RequirementsContradicted,
      productionApplyTransactionContractV2FinalHashLocks,
      productionApplyTransactionContractV2P50MissingCriticalArtifacts,
      productionApplyTransactionContractV2P50RuntimeDeliveryEvidenceChainReady,
      productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainReady,
      productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries,
      productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainActualShaEntries,
      productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainRollbackContracts,
      productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects,
      productionApplyTransactionContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects,
      productionApplyTransactionContractV2FixtureProbesPassed,
      productionApplyTransactionContractV2FixtureProbes,
      productionApplyTransactionContractV2ReadyForApply,
      productionApplyTransactionContractV2MayModifyProductionAppFiles,
      postApplyRollbackGuardContractV2Blockers,
      postApplyRollbackGuardContractV2Warnings,
      postApplyRollbackGuardContractV2Present,
      postApplyRollbackGuardContractV2State,
      postApplyRollbackGuardContractV2Ready,
      postApplyRollbackGuardContractV2ReadyForPostApplyRollbackGuard,
      postApplyRollbackGuardContractV2RuntimeCacheContracts,
      postApplyRollbackGuardContractV2RuntimeCacheRollbackContracts,
      postApplyRollbackGuardContractV2LanguagePromptContracts,
      postApplyRollbackGuardContractV2LanguagePromptEntrypointsExpected,
      postApplyRollbackGuardContractV2PostApplyGuardSteps,
      postApplyRollbackGuardContractV2RollbackGuardSteps,
      postApplyRollbackGuardContractV2P49RequirementsProved,
      postApplyRollbackGuardContractV2P49RequirementsProductionLocked,
      postApplyRollbackGuardContractV2P49RequirementsMissing,
      postApplyRollbackGuardContractV2P49RequirementsContradicted,
      postApplyRollbackGuardContractV2FinalHashLocks,
      postApplyRollbackGuardContractV2P50MissingCriticalArtifacts,
      postApplyRollbackGuardContractV2P50RuntimeDeliveryEvidenceChainReady,
      postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainReady,
      postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainPublishManifestEntries,
      postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainActualShaEntries,
      postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainRollbackContracts,
      postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainSourceLocaleRejects,
      postApplyRollbackGuardContractV2RuntimeDeliveryEvidenceChainStudyTargetRejects,
      postApplyRollbackGuardContractV2FixtureProbesPassed,
      postApplyRollbackGuardContractV2FixtureProbes,
      postApplyRollbackGuardContractV2ReadyForApply,
      postApplyRollbackGuardContractV2MayModifyProductionAppFiles,
      approvalWaitSafeContinuationV2Blockers,
      approvalWaitSafeContinuationV2Warnings,
      approvalWaitSafeContinuationV2Present,
      approvalWaitSafeContinuationV2State,
      approvalWaitSafeContinuationV2Ready,
      approvalWaitSafeContinuationV2ReadyForNextSafePass,
      approvalWaitSafeContinuationV2SafeWorkItems,
      approvalWaitSafeContinuationV2ProductionLockedItems,
      approvalWaitSafeContinuationV2LegacyReviewResidueMatches,
      approvalWaitSafeContinuationV2FixtureProbesPassed,
      approvalWaitSafeContinuationV2FixtureProbes,
      approvalWaitSafeContinuationV2ReadyForApply,
      approvalWaitSafeContinuationV2MayModifyProductionAppFiles,
      productionReadinessCompletionAuditV2Blockers,
      productionReadinessCompletionAuditV2Warnings,
      productionReadinessCompletionAuditV2Present,
      productionReadinessCompletionAuditV2State,
      productionReadinessCompletionAuditV2Ready,
      productionReadinessCompletionAuditV2RequirementsProved,
      productionReadinessCompletionAuditV2RequirementsProductionLocked,
      productionReadinessCompletionAuditV2RequirementsMissing,
      productionReadinessCompletionAuditV2RequirementsContradicted,
      productionReadinessCompletionAuditV2ClosedModeEvidenceComplete,
      productionReadinessCompletionAuditV2FixtureProbesPassed,
      productionReadinessCompletionAuditV2FixtureProbes,
      productionReadinessCompletionAuditV2ReadyForApply,
      productionReadinessCompletionAuditV2MayModifyProductionAppFiles,
      finalPreapprovalEvidenceHashLockV2Blockers,
      finalPreapprovalEvidenceHashLockV2Warnings,
      finalPreapprovalEvidenceHashLockV2Present,
      finalPreapprovalEvidenceHashLockV2State,
      finalPreapprovalEvidenceHashLockV2Ready,
      finalPreapprovalEvidenceHashLockV2FinalHashLocks,
      finalPreapprovalEvidenceHashLockV2MissingCriticalArtifacts,
      finalPreapprovalEvidenceHashLockV2MissingRequiredRoleLocks,
      finalPreapprovalEvidenceHashLockV2P30IncludesFinalHashLock,
      finalPreapprovalEvidenceHashLockV2P43P49ChainReady,
      finalPreapprovalEvidenceHashLockV2P49CompletionReady,
      finalPreapprovalEvidenceHashLockV2RuntimeDeliveryEvidenceChainReady,
      finalPreapprovalEvidenceHashLockV2FixtureProbesPassed,
      finalPreapprovalEvidenceHashLockV2FixtureProbes,
      finalPreapprovalEvidenceHashLockV2ReadyForApply,
      finalPreapprovalEvidenceHashLockV2MayModifyProductionAppFiles,
      exactApprovalApplyRehearsalV2Blockers,
      exactApprovalApplyRehearsalV2Warnings,
      exactApprovalApplyRehearsalV2Present,
      exactApprovalApplyRehearsalV2State,
      exactApprovalApplyRehearsalV2Ready,
      exactApprovalApplyRehearsalV2ReadinessApplyBlockers,
      exactApprovalApplyRehearsalV2ActiveApprovalReceiptExists,
      exactApprovalApplyRehearsalV2ActiveHashLockExists,
      exactApprovalApplyRehearsalV2MainHashLockDryRunPresent,
      exactApprovalApplyRehearsalV2FinalHashLockDryRunPresent,
      exactApprovalApplyRehearsalV2WouldCreateActiveArtifactsNow,
      exactApprovalApplyRehearsalV2FixtureProbesPassed,
      exactApprovalApplyRehearsalV2FixtureProbes,
      exactApprovalApplyRehearsalV2ReadyForApply,
      exactApprovalApplyRehearsalV2MayModifyProductionAppFiles,
      exactApprovalSourceFirewallV2Blockers,
      exactApprovalSourceFirewallV2Warnings,
      exactApprovalSourceFirewallV2Present,
      exactApprovalSourceFirewallV2State,
      exactApprovalSourceFirewallV2Ready,
      exactApprovalSourceFirewallV2ApprovalSourceExists,
      exactApprovalSourceFirewallV2ApprovalSourceContainsExactSentence,
      exactApprovalSourceFirewallV2PlainContinueWouldCreateActiveArtifacts,
      exactApprovalSourceFirewallV2ActiveApprovalReceiptExists,
      exactApprovalSourceFirewallV2ActiveHashLockExists,
      exactApprovalSourceFirewallV2FixtureProbesPassed,
      exactApprovalSourceFirewallV2FixtureProbes,
      exactApprovalSourceFirewallV2ReadyForApply,
      exactApprovalSourceFirewallV2MayModifyProductionAppFiles,
      exactApprovalSourceIntakeTransitionV2Blockers,
      exactApprovalSourceIntakeTransitionV2Warnings,
      exactApprovalSourceIntakeTransitionV2Present,
      exactApprovalSourceIntakeTransitionV2State,
      exactApprovalSourceIntakeTransitionV2Ready,
      exactApprovalSourceIntakeTransitionV2ApprovalSourceExists,
      exactApprovalSourceIntakeTransitionV2ApprovalSourceContainsExactSentence,
      exactApprovalSourceIntakeTransitionV2PlainContinueWouldCreateActiveArtifacts,
      exactApprovalSourceIntakeTransitionV2WouldCreateActiveArtifactsByThisScript,
      exactApprovalSourceIntakeTransitionV2ActiveApprovalReceiptExists,
      exactApprovalSourceIntakeTransitionV2ActiveHashLockExists,
      exactApprovalSourceIntakeTransitionV2SimulatedValidP31CreateWouldCreateBothArtifacts,
      exactApprovalSourceIntakeTransitionV2SimulatedP44WouldOpenReadyForApply,
      exactApprovalSourceIntakeTransitionV2FixtureProbesPassed,
      exactApprovalSourceIntakeTransitionV2FixtureProbes,
      exactApprovalSourceIntakeTransitionV2ReadyForApply,
      exactApprovalSourceIntakeTransitionV2MayModifyProductionAppFiles,
      exactApprovalActiveArtifactPairSimulationV2Blockers,
      exactApprovalActiveArtifactPairSimulationV2Warnings,
      exactApprovalActiveArtifactPairSimulationV2Present,
      exactApprovalActiveArtifactPairSimulationV2State,
      exactApprovalActiveArtifactPairSimulationV2Ready,
      exactApprovalActiveArtifactPairSimulationV2ApprovalSourceExists,
      exactApprovalActiveArtifactPairSimulationV2ApprovalSourceContainsExactSentence,
      exactApprovalActiveArtifactPairSimulationV2ActiveApprovalReceiptExists,
      exactApprovalActiveArtifactPairSimulationV2ActiveHashLockExists,
      exactApprovalActiveArtifactPairSimulationV2SimulatedPairWouldPassP44AfterP31Create,
      exactApprovalActiveArtifactPairSimulationV2CurrentP44WouldOpenSequencing,
      exactApprovalActiveArtifactPairSimulationV2ReadyForP31CreateWhenExactSourcePresent,
      exactApprovalActiveArtifactPairSimulationV2FixtureProbesPassed,
      exactApprovalActiveArtifactPairSimulationV2FixtureProbes,
      exactApprovalActiveArtifactPairSimulationV2ReadyForApply,
      exactApprovalActiveArtifactPairSimulationV2MayModifyProductionAppFiles,
      exactApprovalP31CreateCommandPreflightV2Blockers,
      exactApprovalP31CreateCommandPreflightV2Warnings,
      exactApprovalP31CreateCommandPreflightV2Present,
      exactApprovalP31CreateCommandPreflightV2State,
      exactApprovalP31CreateCommandPreflightV2Ready,
      exactApprovalP31CreateCommandPreflightV2ApprovalSourceExists,
      exactApprovalP31CreateCommandPreflightV2ApprovalSourceContainsExactSentence,
      exactApprovalP31CreateCommandPreflightV2ActiveApprovalReceiptExists,
      exactApprovalP31CreateCommandPreflightV2ActiveHashLockExists,
      exactApprovalP31CreateCommandPreflightV2CommandAllowedNow,
      exactApprovalP31CreateCommandPreflightV2CommandAllowedWhenExactSourcePresent,
      exactApprovalP31CreateCommandPreflightV2CommandExecutedByThisScript,
      exactApprovalP31CreateCommandPreflightV2FixtureProbesPassed,
      exactApprovalP31CreateCommandPreflightV2FixtureProbes,
      exactApprovalP31CreateCommandPreflightV2ReadyForApply,
      exactApprovalP31CreateCommandPreflightV2MayModifyProductionAppFiles,
      exactApprovalP44ValidationCommandPreflightV2Blockers,
      exactApprovalP44ValidationCommandPreflightV2Warnings,
      exactApprovalP44ValidationCommandPreflightV2Present,
      exactApprovalP44ValidationCommandPreflightV2State,
      exactApprovalP44ValidationCommandPreflightV2Ready,
      exactApprovalP44ValidationCommandPreflightV2ApprovalSourceExists,
      exactApprovalP44ValidationCommandPreflightV2ApprovalSourceContainsExactSentence,
      exactApprovalP44ValidationCommandPreflightV2ActiveApprovalReceiptExists,
      exactApprovalP44ValidationCommandPreflightV2ActiveHashLockExists,
      exactApprovalP44ValidationCommandPreflightV2CommandAllowedNow,
      exactApprovalP44ValidationCommandPreflightV2CommandAllowedAfterP31Create,
      exactApprovalP44ValidationCommandPreflightV2CommandExecutedByThisScript,
      exactApprovalP44ValidationCommandPreflightV2FixtureProbesPassed,
      exactApprovalP44ValidationCommandPreflightV2FixtureProbes,
      exactApprovalP44ValidationCommandPreflightV2ReadyForApply,
      exactApprovalP44ValidationCommandPreflightV2MayModifyProductionAppFiles,
      exactApprovalP44ToP45SequenceHandoffSimulationV2Blockers,
      exactApprovalP44ToP45SequenceHandoffSimulationV2Warnings,
      exactApprovalP44ToP45SequenceHandoffSimulationV2Present,
      exactApprovalP44ToP45SequenceHandoffSimulationV2State,
      exactApprovalP44ToP45SequenceHandoffSimulationV2Ready,
      exactApprovalP44ToP45SequenceHandoffSimulationV2P56Ready,
      exactApprovalP44ToP45SequenceHandoffSimulationV2P44Status,
      exactApprovalP44ToP45SequenceHandoffSimulationV2P44ValidationState,
      exactApprovalP44ToP45SequenceHandoffSimulationV2P45Status,
      exactApprovalP44ToP45SequenceHandoffSimulationV2P45PreflightState,
      exactApprovalP44ToP45SequenceHandoffSimulationV2CurrentHandoffWouldOpenSequence,
      exactApprovalP44ToP45SequenceHandoffSimulationV2SimulatedPostP44P45WouldOpenSequence,
      exactApprovalP44ToP45SequenceHandoffSimulationV2CommandExecutedByThisScript,
      exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbesPassed,
      exactApprovalP44ToP45SequenceHandoffSimulationV2FixtureProbes,
      exactApprovalP44ToP45SequenceHandoffSimulationV2ReadyForApply,
      exactApprovalP44ToP45SequenceHandoffSimulationV2MayModifyProductionAppFiles,
      exactApprovalP45SequenceCommandPreflightV2Blockers,
      exactApprovalP45SequenceCommandPreflightV2Warnings,
      exactApprovalP45SequenceCommandPreflightV2Present,
      exactApprovalP45SequenceCommandPreflightV2State,
      exactApprovalP45SequenceCommandPreflightV2Ready,
      exactApprovalP45SequenceCommandPreflightV2P57Ready,
      exactApprovalP45SequenceCommandPreflightV2P45Status,
      exactApprovalP45SequenceCommandPreflightV2P45PreflightState,
      exactApprovalP45SequenceCommandPreflightV2CommandAllowedNow,
      exactApprovalP45SequenceCommandPreflightV2CommandAllowedAfterP44Validation,
      exactApprovalP45SequenceCommandPreflightV2CommandExecutedByThisScript,
      exactApprovalP45SequenceCommandPreflightV2FixtureProbesPassed,
      exactApprovalP45SequenceCommandPreflightV2FixtureProbes,
      exactApprovalP45SequenceCommandPreflightV2ReadyForApply,
      exactApprovalP45SequenceCommandPreflightV2MayModifyProductionAppFiles,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Blockers,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Warnings,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Present,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2State,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P58Ready,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45Status,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P45PreflightState,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46Status,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2P46TransactionState,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CurrentHandoffWouldOpenTransaction,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2SimulatedPostP45P46WouldOpenTransaction,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2CommandExecutedByThisScript,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbesPassed,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2FixtureProbes,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2ReadyForApply,
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2MayModifyProductionAppFiles,
      exactApprovalP46ApplyTransactionCommandPreflightV2Blockers,
      exactApprovalP46ApplyTransactionCommandPreflightV2Warnings,
      exactApprovalP46ApplyTransactionCommandPreflightV2Present,
      exactApprovalP46ApplyTransactionCommandPreflightV2State,
      exactApprovalP46ApplyTransactionCommandPreflightV2Ready,
      exactApprovalP46ApplyTransactionCommandPreflightV2P59Ready,
      exactApprovalP46ApplyTransactionCommandPreflightV2P45Status,
      exactApprovalP46ApplyTransactionCommandPreflightV2P45PreflightState,
      exactApprovalP46ApplyTransactionCommandPreflightV2P46Status,
      exactApprovalP46ApplyTransactionCommandPreflightV2P46TransactionState,
      exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedNow,
      exactApprovalP46ApplyTransactionCommandPreflightV2CommandAllowedAfterP45Sequence,
      exactApprovalP46ApplyTransactionCommandPreflightV2CommandExecutedByThisScript,
      exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbesPassed,
      exactApprovalP46ApplyTransactionCommandPreflightV2FixtureProbes,
      exactApprovalP46ApplyTransactionCommandPreflightV2ReadyForApply,
      exactApprovalP46ApplyTransactionCommandPreflightV2MayModifyProductionAppFiles,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Blockers,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Warnings,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Present,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2State,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P60Ready,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46Status,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P46TransactionState,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47Status,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2P47GuardState,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CurrentHandoffWouldOpenRollbackGuard,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2SimulatedPostP46P47WouldOpenRollbackGuard,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2CommandExecutedByThisScript,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbesPassed,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2FixtureProbes,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2ReadyForApply,
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2MayModifyProductionAppFiles,
      exactApprovalP47RollbackGuardCommandPreflightV2Blockers,
      exactApprovalP47RollbackGuardCommandPreflightV2Warnings,
      exactApprovalP47RollbackGuardCommandPreflightV2Present,
      exactApprovalP47RollbackGuardCommandPreflightV2State,
      exactApprovalP47RollbackGuardCommandPreflightV2Ready,
      exactApprovalP47RollbackGuardCommandPreflightV2P61Ready,
      exactApprovalP47RollbackGuardCommandPreflightV2P46Status,
      exactApprovalP47RollbackGuardCommandPreflightV2P46TransactionState,
      exactApprovalP47RollbackGuardCommandPreflightV2P47Status,
      exactApprovalP47RollbackGuardCommandPreflightV2P47GuardState,
      exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedNow,
      exactApprovalP47RollbackGuardCommandPreflightV2CommandAllowedAfterP46Contract,
      exactApprovalP47RollbackGuardCommandPreflightV2CommandExecutedByThisScript,
      exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbesPassed,
      exactApprovalP47RollbackGuardCommandPreflightV2FixtureProbes,
      exactApprovalP47RollbackGuardCommandPreflightV2ReadyForApply,
      exactApprovalP47RollbackGuardCommandPreflightV2MayModifyProductionAppFiles,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Blockers,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Warnings,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Present,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2State,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P62Ready,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47Status,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P47GuardState,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48Status,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2P48ContinuationState,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CurrentHandoffWouldOpenSafeContinuation,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2CommandExecutedByThisScript,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbesPassed,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2FixtureProbes,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2ReadyForApply,
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2MayModifyProductionAppFiles,
      exactApprovalP48SafeContinuationCommandPreflightV2Blockers,
      exactApprovalP48SafeContinuationCommandPreflightV2Warnings,
      exactApprovalP48SafeContinuationCommandPreflightV2Present,
      exactApprovalP48SafeContinuationCommandPreflightV2State,
      exactApprovalP48SafeContinuationCommandPreflightV2Ready,
      exactApprovalP48SafeContinuationCommandPreflightV2P63Ready,
      exactApprovalP48SafeContinuationCommandPreflightV2P48Status,
      exactApprovalP48SafeContinuationCommandPreflightV2P48ContinuationState,
      exactApprovalP48SafeContinuationCommandPreflightV2CommandAllowedNow,
      exactApprovalP48SafeContinuationCommandPreflightV2CommandExecutedByThisScript,
      exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbesPassed,
      exactApprovalP48SafeContinuationCommandPreflightV2FixtureProbes,
      exactApprovalP48SafeContinuationCommandPreflightV2ReadyForApply,
      exactApprovalP48SafeContinuationCommandPreflightV2MayModifyProductionAppFiles,
      exactApprovalWaitStateV2Blockers,
      exactApprovalWaitStateV2Warnings,
      exactApprovalWaitStateV2Present,
      exactApprovalWaitStateV2State,
      exactApprovalWaitStateV2Ready,
      exactApprovalWaitStateV2ClosedEvidenceReady,
      exactApprovalWaitStateV2ExactApprovalStillRequired,
      exactApprovalWaitStateV2SourceContainsExactSentence,
      exactApprovalWaitStateV2ApprovalSourceIsCanonical,
      exactApprovalWaitStateV2ActiveApprovalReceiptExists,
      exactApprovalWaitStateV2ActiveHashLockExists,
      exactApprovalWaitStateV2FixtureProbesPassed,
      exactApprovalWaitStateV2FixtureProbes,
      exactApprovalWaitStateV2ReadyForApply,
      exactApprovalWaitStateV2MayModifyProductionAppFiles,
      orderedApprovalWaitRefreshV2Blockers,
      orderedApprovalWaitRefreshV2Warnings,
      orderedApprovalWaitRefreshV2Present,
      orderedApprovalWaitRefreshV2Ready,
      orderedApprovalWaitRefreshV2Executed,
      orderedApprovalWaitRefreshV2StepsPassed,
      orderedApprovalWaitRefreshV2StepsFailed,
      orderedApprovalWaitRefreshV2P65Status,
      orderedApprovalWaitRefreshV2P65WaitState,
      orderedApprovalWaitRefreshV2P65ClosedEvidenceReady,
      orderedApprovalWaitRefreshV2FinalMasterBlockers,
      orderedApprovalWaitRefreshV2FinalMasterWarnings,
      orderedApprovalWaitRefreshV2FinalNextBlockers,
      orderedApprovalWaitRefreshV2FinalNextWarnings,
      orderedApprovalWaitRefreshV2ActiveApprovalReceiptExists,
      orderedApprovalWaitRefreshV2ActiveHashLockExists,
      orderedApprovalWaitRefreshV2ReadyForApply,
      orderedApprovalWaitRefreshV2MayModifyProductionAppFiles,
      safePreapprovalContinuationV2Blockers,
      safePreapprovalContinuationV2Warnings,
      safePreapprovalContinuationV2Present,
      safePreapprovalContinuationV2Ready,
      safePreapprovalContinuationV2Executed,
      safePreapprovalContinuationV2StepsPassed,
      safePreapprovalContinuationV2StepsFailed,
      safePreapprovalContinuationV2GenerationBlockers,
      safePreapprovalContinuationV2ApplyBlockers,
      safePreapprovalContinuationV2NextGoalId,
      safePreapprovalContinuationV2ActiveApprovalReceiptExists,
      safePreapprovalContinuationV2ActiveHashLockExists,
      safePreapprovalContinuationV2ReadyForApply,
      safePreapprovalContinuationV2MayModifyProductionAppFiles,
      finalProductionReadinessGapV2Blockers,
      finalProductionReadinessGapV2Warnings,
      finalProductionReadinessGapV2Present,
      finalProductionReadinessGapV2Ready,
      finalProductionReadinessGapV2State,
      finalProductionReadinessGapV2RequirementsReady,
      finalProductionReadinessGapV2RequirementsBlocked,
      finalProductionReadinessGapV2ProductionHardBlockers,
      finalProductionReadinessGapV2CanStartProductionApply,
      finalProductionReadinessGapV2GenerationV2Ready,
      finalProductionReadinessGapV2DecisionImportV2Ready,
      finalProductionReadinessGapV2ActiveApprovalArtifactPairState,
      finalProductionReadinessGapV2ActivationChainReady,
      finalProductionReadinessGapV2FixtureProbesPassed,
      finalProductionReadinessGapV2FixtureProbes,
      finalProductionReadinessGapV2ActiveApprovalReceiptExists,
      finalProductionReadinessGapV2ActiveHashLockExists,
      finalProductionReadinessGapV2ReadyForApply,
      finalProductionReadinessGapV2MayModifyProductionAppFiles,
      exactApprovalSourceHandoffFirewallV2Blockers,
      exactApprovalSourceHandoffFirewallV2Warnings,
      exactApprovalSourceHandoffFirewallV2Present,
      exactApprovalSourceHandoffFirewallV2Ready,
      exactApprovalSourceHandoffFirewallV2State,
      exactApprovalSourceHandoffFirewallV2FinalGapReady,
      exactApprovalSourceHandoffFirewallV2ExactApprovalWaitStateReady,
      exactApprovalSourceHandoffFirewallV2P31CreationGateReady,
      exactApprovalSourceHandoffFirewallV2ApprovalSourceExists,
      exactApprovalSourceHandoffFirewallV2ApprovalSourceContainsExactSentence,
      exactApprovalSourceHandoffFirewallV2NextAllowedStepWhileAbsent,
      exactApprovalSourceHandoffFirewallV2NextAllowedStepWhenPresent,
      exactApprovalSourceHandoffFirewallV2ActiveApprovalReceiptExists,
      exactApprovalSourceHandoffFirewallV2ActiveHashLockExists,
      exactApprovalSourceHandoffFirewallV2CanStartProductionApply,
      exactApprovalSourceHandoffFirewallV2FixtureProbesPassed,
      exactApprovalSourceHandoffFirewallV2FixtureProbes,
      exactApprovalSourceHandoffFirewallV2ReadyForApply,
      exactApprovalSourceHandoffFirewallV2MayModifyProductionAppFiles,
      exactApprovalSourceWaitTerminalStateV2Blockers,
      exactApprovalSourceWaitTerminalStateV2Warnings,
      exactApprovalSourceWaitTerminalStateV2Present,
      exactApprovalSourceWaitTerminalStateV2Ready,
      exactApprovalSourceWaitTerminalStateV2State,
      exactApprovalSourceWaitTerminalStateV2P68Ready,
      exactApprovalSourceWaitTerminalStateV2NextGoalId,
      exactApprovalSourceWaitTerminalStateV2ConsistencyGoalId,
      exactApprovalSourceWaitTerminalStateV2ApprovalSourceExists,
      exactApprovalSourceWaitTerminalStateV2ApprovalSourceContainsExactSentence,
      exactApprovalSourceWaitTerminalStateV2ActiveApprovalReceiptExists,
      exactApprovalSourceWaitTerminalStateV2ActiveHashLockExists,
      exactApprovalSourceWaitTerminalStateV2CanStartProductionApply,
      exactApprovalSourceWaitTerminalStateV2FixtureProbesPassed,
      exactApprovalSourceWaitTerminalStateV2FixtureProbes,
      exactApprovalSourceWaitTerminalStateV2ReadyForApply,
      exactApprovalSourceWaitTerminalStateV2MayModifyProductionAppFiles,
      postExactApprovalApplyRunbookV2Blockers,
      postExactApprovalApplyRunbookV2Warnings,
      postExactApprovalApplyRunbookV2Present,
      postExactApprovalApplyRunbookV2Ready,
      postExactApprovalApplyRunbookV2State,
      postExactApprovalApplyRunbookV2Steps,
      postExactApprovalApplyRunbookV2P31CreateAllowedNow,
      postExactApprovalApplyRunbookV2P31CreateAllowedWhenExactSourcePresent,
      postExactApprovalApplyRunbookV2ProductionWritesAllowedNow,
      postExactApprovalApplyRunbookV2ActiveApprovalReceiptExists,
      postExactApprovalApplyRunbookV2ActiveHashLockExists,
      postExactApprovalApplyRunbookV2CanStartProductionApplyNow,
      postExactApprovalApplyRunbookV2FixtureProbesPassed,
      postExactApprovalApplyRunbookV2FixtureProbes,
      postExactApprovalApplyRunbookV2ReadyForApply,
      postExactApprovalApplyRunbookV2MayModifyProductionAppFiles,
      researchJsonFirewallBlockers,
      researchJsonFirewallWarnings,
      nextPassContractBlockers,
      nextPassContractWarnings,
      nextPassLargeGoals,
      nextPassPrepared,
      readyForNextLargePass,
      runValidatorBlockers,
      generationBlockers,
      applyBlockers,
      criticalArtifactsMissing,
      blockersRaw,
      terminalWaitSelfCycleBlockersSuppressed,
      blockers,
      warnings,
      readyForReviewer,
      readyForDecisionImport,
      readyForResearchPackBuilder,
      readyForGenerationV2PayloadPreflightReady,
      readyForGenerationV2SelfImprovingReady,
      readyForGenerationV2DomainRegistryReady,
      readyForGenerationV2BlockedByLegacyResearchGaps,
      readyForGenerationV2,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    sourceReports,
    artifacts,
    outputArtifacts: {
      manifestJson: artifactPath(repoRoot, manifestJson),
      manifestMd: artifactPath(repoRoot, manifestMd),
      packetJson: artifactPath(repoRoot, packetJson),
      packetMd: artifactPath(repoRoot, packetMd),
    },
    findings,
  };

  ensureDir(reviewerDir);
  ensureDir(auditsDir);
  fs.writeFileSync(manifestJson, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(manifestMd, renderMarkdown(manifest));
  fs.writeFileSync(packetJson, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(packetMd, renderMarkdown(manifest));

  console.log(`GUSTAV French reviewer master manifest: ${manifest.status}`);
  console.log(`Generated lesson ledgers: ${manifest.summary.generatedLessonLedgers}`);
  console.log(`Generated rows: ${manifest.summary.generatedRows}`);
  console.log(`Reviewer source files: ${manifest.summary.reviewerSourceFiles}`);
  console.log(`Audit artifact files: ${manifest.summary.auditArtifactFiles}`);
  console.log(`Batch JSONL files: ${manifest.summary.batchJsonlFiles}`);
  console.log(`Batch TSV files: ${manifest.summary.batchTsvFiles}`);
  console.log(`Blockers: ${manifest.summary.blockers}`);
  console.log(`Ready for reviewer: ${manifest.summary.readyForReviewer ? 'yes' : 'no'}`);
  console.log(`Ready for legacy decision import: ${manifest.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for decision import V2: ${manifest.summary.readyForDecisionImportV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${manifest.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${manifest.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Manifest: ${artifactPath(repoRoot, manifestJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
