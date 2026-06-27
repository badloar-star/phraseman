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
    llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed: number;
    llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes: number;
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
    officialSourceContentCoverageV2RowsWithGatesPassed: number;
    officialSourceContentCoverageV2QuizRowsOneCorrect: number;
    officialSourceContentCoverageV2TrustedSourceIds: number;
    officialSourceContentCoverageV2ReadyForImportDryRunRefresh: boolean;
    officialSourceContentCoverageV2FixtureProbesPassed: number;
    officialSourceContentCoverageV2FixtureProbes: number;
    officialSourceContentCoverageV2ReadyForApply: boolean;
    officialSourceContentCoverageV2MayModifyProductionAppFiles: boolean;
    officialSourcePayloadCreationApprovalPreflightV2Ready: boolean;
    officialSourcePayloadCreationApprovalPreflightV2FreshAfterImportGate: boolean;
    officialSourceClosedLocalPayloadMaterializationV2Ready: boolean;
    officialSourceClosedLocalPayloadMaterializationV2FreshAfterPayloadPreflight: boolean;
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
    blockers: number;
    warnings: number;
    readyForReviewer: boolean;
    readyForDecisionImport: boolean;
    readyForResearchPackBuilder: boolean;
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
  'audits/payload_creation_approval_preflight_v2_packet.json',
  'audits/closed_local_payload_materialization_v2_packet.json',
  'audits/server_delivery_publish_preflight_v2_packet.json',
  'audits/admin_server_delivery_runtime_preflight_v2_packet.json',
  'audits/runtime_activation_blocker_plan_v2_packet.json',
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
  'audits/french_research_json_firewall_audit.json',
  'audits/next_pass_goal_contract_packet.json',
  'audits/french_language_isolation_audit.json',
  'audits/french_translation_qa_audit.json',
  'audits/generated_content_audit.json',
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
    `- LLM official-source decision materialization V2 non-LLM review dependency required: ${report.summary.llmOfficialSourceDecisionMaterializationV2NonLlmReviewDependencyRequired ? 'yes' : 'no'}`,
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
    `- LLM official-source promoted decision file generation V2 fixture probes: ${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed}/${report.summary.llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes}`,
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
    `- Official-source content coverage V2 trusted source ids: ${report.summary.officialSourceContentCoverageV2TrustedSourceIds}`,
    `- Official-source content coverage V2 ready for import dry-run refresh: ${report.summary.officialSourceContentCoverageV2ReadyForImportDryRunRefresh ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 fixture probes: ${report.summary.officialSourceContentCoverageV2FixtureProbesPassed}/${report.summary.officialSourceContentCoverageV2FixtureProbes}`,
    `- Official-source content coverage V2 ready for apply: ${report.summary.officialSourceContentCoverageV2ReadyForApply ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 may modify production app files: ${report.summary.officialSourceContentCoverageV2MayModifyProductionAppFiles ? 'yes' : 'no'}`,
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
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Ready for reviewer: ${report.summary.readyForReviewer ? 'yes' : 'no'}`,
    `- Ready for decision import: ${report.summary.readyForDecisionImport ? 'yes' : 'no'}`,
    `- Ready for research pack builder: ${report.summary.readyForResearchPackBuilder ? 'yes' : 'no'}`,
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
  const payloadCreationApprovalPreflightV2 = reportSummary(sourceReports, 'payload_creation_approval_preflight_v2_packet.json');
  const closedLocalPayloadMaterializationV2 = reportSummary(sourceReports, 'closed_local_payload_materialization_v2_packet.json');
  const serverDeliveryPublishPreflightV2 = reportSummary(sourceReports, 'server_delivery_publish_preflight_v2_packet.json');
  const adminServerDeliveryRuntimePreflightV2 = reportSummary(sourceReports, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const runtimeActivationBlockerPlanV2 = reportSummary(sourceReports, 'runtime_activation_blocker_plan_v2_packet.json');
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
  const researchJsonFirewall = reportSummary(sourceReports, 'french_research_json_firewall_audit.json');
  const nextPassContract = reportSummary(sourceReports, 'next_pass_goal_contract_packet.json');
  const readinessBlockers = reportSummary(sourceReports, 'readiness_blocker_reduction_packet.json');
  const runValidator = reportSummary(sourceReports, 'run_validator_report.json');

  const languageIsolationBlockers = n(languageIsolation, 'blockers');
  const languageIsolationWarnings = n(languageIsolation, 'warnings');
  const rowsMissingTargetLocale = n(languageIsolation, 'rowsMissingTargetLocale');
  const translationQaBlockers = n(translationQa, 'blockers');
  const generatedContentBlockers = n(generatedContent, 'blockers');
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
  const adminServerDeliveryRuntimePreflightV2Path = runPath(runDir, 'audits/admin_server_delivery_runtime_preflight_v2_packet.json');
  const runtimeActivationBlockerPlanV2Path = runPath(runDir, 'audits/runtime_activation_blocker_plan_v2_packet.json');
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
    officialSourceImportDryRunV2Ai === 164 &&
    officialSourceImportDryRunV2AcceptedRows === 1600 &&
    officialSourceImportDryRunV2AcceptedAi === 164 &&
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
  const llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'fixtureProbesPassed');
  const llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes = n(llmOfficialSourcePromotedDecisionFileGenerationV2, 'fixtureProbes');
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
  const productionApplyAbsenceDenialGateV2ReadyForNonProductionContinuation =
    b(productionApplyAbsenceDenialGateV2, 'readyForNonProductionContinuationAfterApplyDenialV2') &&
    productionApplyAbsenceDenialGateV2FreshAfterReceiptCreation;
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
  const officialSourceContentCoverageV2RowsWithGatesPassed = n(officialSourceContentCoverageV2, 'rowDecisionsWithAllRequiredGatesPassed');
  const officialSourceContentCoverageV2QuizRowsOneCorrect = n(officialSourceContentCoverageV2, 'rowDecisionQuizRowsWithOneCorrectAnswer');
  const officialSourceContentCoverageV2TrustedSourceIds = n(officialSourceContentCoverageV2, 'trustedSourceIds');
  const officialSourceContentCoverageV2FreshAfterMasterRefresh =
    fileMtimeMs(officialSourceContentCoverageV2Path) >= fileMtimeMs(masterNextPassConsistencyRefreshV2Path) &&
    fileMtimeMs(masterNextPassConsistencyRefreshV2Path) > 0;
  const officialSourceContentCoverageV2ReadyForImportDryRunRefresh =
    b(officialSourceContentCoverageV2, 'readyForReviewerDecisionImportDryRunRefresh') &&
    officialSourceContentCoverageV2FreshAfterMasterRefresh;
  const officialSourceContentCoverageV2FixtureProbesPassed = n(officialSourceContentCoverageV2, 'fixtureProbesPassed');
  const officialSourceContentCoverageV2FixtureProbes = n(officialSourceContentCoverageV2, 'fixtureProbes');
  const officialSourceContentCoverageV2ReadyForApply = b(officialSourceContentCoverageV2, 'readyForApply');
  const officialSourceContentCoverageV2MayModifyProductionAppFiles = b(officialSourceContentCoverageV2, 'mayModifyProductionAppFiles');
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

  const gateBlockers: Array<[string, number]> = [
    ['language_isolation_blockers', languageIsolationBlockers],
    ['language_isolation_missing_target_locale', rowsMissingTargetLocale],
    ['translation_qa_blockers', translationQaBlockers],
    ['generated_content_blockers', generatedContentBlockers],
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
    ['official_source_import_dry_run_v2_missing_accepted_ai', officialSourceImportDryRunV2Present ? Math.max(0, 164 - officialSourceImportDryRunV2AcceptedAi) : 0],
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
    ['llm_official_source_promoted_decision_file_generation_v2_missing_probe_passes', Math.max(0, llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes - llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed)],
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
    ['server_delivery_publish_preflight_v2_blockers', serverDeliveryPublishPreflightV2Blockers],
    ['server_delivery_publish_preflight_v2_missing_entries', Math.max(0, 12 - serverDeliveryPublishPreflightV2ManifestEntries)],
    ['server_delivery_publish_preflight_v2_missing_actual_sha', Math.max(0, 12 - serverDeliveryPublishPreflightV2ActualShaEntries)],
    ['server_delivery_publish_preflight_v2_missing_actual_byte_size', Math.max(0, 12 - serverDeliveryPublishPreflightV2ActualByteSizeEntries)],
    ['server_delivery_publish_preflight_v2_checksum_mismatches', serverDeliveryPublishPreflightV2ChecksumMismatches],
    ['server_delivery_publish_preflight_v2_not_ready_for_admin_review', serverDeliveryPublishPreflightV2Present && !serverDeliveryPublishPreflightV2ReadyForAdminServerDeliveryReview ? 1 : 0],
    ['server_delivery_publish_preflight_v2_missing_probe_passes', Math.max(0, serverDeliveryPublishPreflightV2FixtureProbes - serverDeliveryPublishPreflightV2FixtureProbesPassed)],
    ['server_delivery_publish_preflight_v2_ready_for_apply_open', serverDeliveryPublishPreflightV2ReadyForApply ? 1 : 0],
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
    ['readiness_apply_blocker_map_refresh_v2_apply_blockers_count_drift', readinessApplyBlockerMapRefreshV2Present && readinessApplyBlockerMapRefreshV2ReadinessApplyBlockers !== 2 ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_safe_remaining_drift', readinessApplyBlockerMapRefreshV2Present && readinessApplyBlockerMapRefreshV2SafeRemaining !== 1 ? 1 : 0],
    ['readiness_apply_blocker_map_refresh_v2_not_ready_for_next_master_refresh', readinessApplyBlockerMapRefreshV2Present && !readinessApplyBlockerMapRefreshV2ReadyForNextMasterRefresh ? 1 : 0],
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
    ['official_source_content_coverage_v2_missing_gate_passes', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2RowsWithGatesPassed) : 0],
    ['official_source_content_coverage_v2_missing_one_correct_quizzes', officialSourceContentCoverageV2Present ? Math.max(0, 1600 - officialSourceContentCoverageV2QuizRowsOneCorrect) : 0],
    ['official_source_content_coverage_v2_missing_trusted_source_ids', officialSourceContentCoverageV2Present && officialSourceContentCoverageV2TrustedSourceIds <= 0 ? 1 : 0],
    ['official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh', officialSourceContentCoverageV2Present && !officialSourceContentCoverageV2ReadyForImportDryRunRefresh ? 1 : 0],
    ['official_source_content_coverage_v2_missing_probe_passes', Math.max(0, officialSourceContentCoverageV2FixtureProbes - officialSourceContentCoverageV2FixtureProbesPassed)],
    ['official_source_content_coverage_v2_ready_for_apply_open', officialSourceContentCoverageV2ReadyForApply ? 1 : 0],
    ['official_source_content_coverage_v2_may_modify_production_app_files_open', officialSourceContentCoverageV2MayModifyProductionAppFiles ? 1 : 0],
    ['research_json_firewall_blockers', researchJsonFirewallBlockers],
    ['next_pass_contract_blockers', nextPassContractBlockers],
    ['run_validator_blockers', runValidatorBlockers],
    ['generation_blockers', generationBlockers],
  ];

  for (const [code, count] of gateBlockers) {
    if (count > 0) {
      addBlocker(findings, String(code), `Critical source report contains ${count} blocker(s).`);
    }
  }

  const criticalArtifactsMissing = findings.filter((finding) => finding.code === 'critical_artifact_missing').length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
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
    productionApplyAbsenceDenialGateV2Warnings,
    nonproductionBlockerClosurePlanV2Warnings,
    nonproductionEvidenceRefreshV2Warnings,
    runtimeServerManifestConsistencyRecheckV2Warnings,
    languageIsolationRegressionRecheckV2Warnings,
    readinessApplyBlockerMapRefreshV2Warnings,
    masterNextPassConsistencyRefreshV2Warnings,
    officialSourceContentCoverageV2Warnings,
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
  const readyForDecisionImportV2 = false;
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
  const readyForGenerationV2 =
    readyForPayloadCreationApprovalPreflightV2 &&
    b(selfImprovingUpgrade, 'readyForGenerationV2') &&
    b(domainRegistryV2, 'readyForGenerationV2') &&
    legacyGeneratedWithoutResearchPackRows === 0 &&
    generatedRowsMissingResearchEvidenceIds === 0;

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
      llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbesPassed,
      llmOfficialSourcePromotedDecisionFileGenerationV2FixtureProbes,
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
      officialSourceContentCoverageV2RowsWithGatesPassed,
      officialSourceContentCoverageV2QuizRowsOneCorrect,
      officialSourceContentCoverageV2TrustedSourceIds,
      officialSourceContentCoverageV2ReadyForImportDryRunRefresh,
      officialSourceContentCoverageV2FixtureProbesPassed,
      officialSourceContentCoverageV2FixtureProbes,
      officialSourceContentCoverageV2ReadyForApply,
      officialSourceContentCoverageV2MayModifyProductionAppFiles,
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
      blockers,
      warnings,
      readyForReviewer,
      readyForDecisionImport,
      readyForResearchPackBuilder,
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
  console.log(`Ready for decision import: ${manifest.summary.readyForDecisionImport ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${manifest.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${manifest.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Manifest: ${artifactPath(repoRoot, manifestJson)}`);

  if (blockers > 0) process.exit(1);
}

void main();
