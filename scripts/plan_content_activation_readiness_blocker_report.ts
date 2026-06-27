import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackManifest } from '../app/course_pack_manifest';
import {
  buildCurrentDisabledActivationInput,
  evaluateCoursePackActivationReadiness,
  type CoursePackActivationReadinessReport,
} from '../app/course_pack_activation_readiness';

type CliOptions = {
  manifestPath?: string;
  remoteVerifyReportPath?: string;
  serverShadowDualReadReportPath?: string;
  disabledManifestPreflightPath?: string;
  disabledRuntimeCandidatePath?: string;
  disabledOfflineCacheIntegrityPath?: string;
  disabledRollbackKillSwitchPath?: string;
  disabledStorageCloudIsolationPath?: string;
  disabledReviewerLocaleIntakePath?: string;
  outputPath?: string;
  generatedAt?: string;
};

type EvidenceEnvelope = {
  status?: 'PASS' | 'HOLD';
  packId?: string;
  studyTarget?: string;
  sourceLocale?: string;
  surface?: string;
  contentVersion?: string;
  activationApproved?: boolean;
  runtimeManifestRegistered?: boolean;
  remoteLoadingEnabled?: boolean;
  bundledContentRemoved?: boolean;
  storageMigrationRan?: boolean;
  productionActivationApproved?: boolean;
  blockers?: unknown[];
};

type RemoteVerifyReport = EvidenceEnvelope;

type ServerShadowDualReadReport = EvidenceEnvelope & {
  parityReport?: {
    verdict?: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
    reviewerSummary?: {
      reviewedRowCount?: number;
      reviewStatusCounts?: {
        approved?: number;
      };
      localeGateStatusCounts?: {
        passed?: number;
      };
    };
  };
};

type DisabledManifestRegistryPreflightEnvelope = EvidenceEnvelope & {
  preflight?: {
    status?: 'PASS' | 'HOLD';
    registryEntryAllowed?: boolean;
    cacheMetadataReadableByRuntime?: boolean;
    cacheMetadataWritableByRuntime?: boolean;
    manifestFetchApproved?: boolean;
    packDownloadApproved?: boolean;
    cacheReadApproved?: boolean;
    cacheWriteApproved?: boolean;
    startupBlockingAllowed?: boolean;
  };
};

type DisabledRuntimeManifestCandidateEnvelope = EvidenceEnvelope & {
  candidate?: {
    status?: 'PASS' | 'HOLD';
    evidenceBundleComplete?: boolean;
    runtimeManifestRegistrable?: boolean;
    runtimeManifestRegistered?: boolean;
    runtimeLookupAllowed?: boolean;
    cacheLookupAllowed?: boolean;
    cacheReadAllowed?: boolean;
    cacheWriteAllowed?: boolean;
    startupBlockingAllowed?: boolean;
    blockers?: unknown[];
  };
};

type DisabledOfflineCacheIntegrityEnvelope = EvidenceEnvelope & {
  integrity?: {
    status?: 'PASS' | 'HOLD';
    cacheIntegrityEvidenceComplete?: boolean;
    activationApproved?: boolean;
    remoteLoadingEnabled?: boolean;
    manifestFetchApproved?: boolean;
    packDownloadApproved?: boolean;
    cacheLookupApproved?: boolean;
    cacheReadApproved?: boolean;
    cacheWriteApproved?: boolean;
    cacheRepairApproved?: boolean;
    storageMigrationApproved?: boolean;
    bundledContentRemovalApproved?: boolean;
    productionActivationApproved?: boolean;
    offlineCacheUsableByRuntime?: boolean;
    cacheLookupAllowed?: boolean;
    cacheReadAllowed?: boolean;
    cacheWriteAllowed?: boolean;
    cacheRepairAllowed?: boolean;
    startupBlockingAllowed?: boolean;
    blockers?: unknown[];
  };
};

type DisabledRollbackKillSwitchEnvelope = EvidenceEnvelope & {
  rollback?: {
    status?: 'PASS' | 'HOLD';
    rollbackEvidenceComplete?: boolean;
    rollbackMode?: 'bundled_compatibility' | 'missing_without_download';
    rollbackForcesBundledCompatibility?: boolean;
    rollbackRequiresAppUpdate?: boolean;
    rollbackDeletesUserProgress?: boolean;
    rollbackMutatesStorageOrCloud?: boolean;
    rollbackDownloadsPack?: boolean;
    rollbackReadsCache?: boolean;
    rollbackWritesCache?: boolean;
    rollbackRepairsCache?: boolean;
    runtimeManifestRegistered?: boolean;
    runtimeLookupAllowed?: boolean;
    cacheLookupAllowed?: boolean;
    cacheReadAllowed?: boolean;
    cacheWriteAllowed?: boolean;
    cacheRepairAllowed?: boolean;
    startupBlockingAllowed?: boolean;
    bundledCompatibilityRollbackAvailable?: boolean;
    missingWithoutDownloadRollbackAvailable?: boolean;
    blockers?: unknown[];
  };
};

type DisabledStorageCloudIsolationEnvelope = EvidenceEnvelope & {
  storageCloud?: {
    status?: 'PASS' | 'HOLD';
    storageCloudIsolationComplete?: boolean;
    activationApproved?: boolean;
    runtimeManifestRegistrationApproved?: boolean;
    runtimeLookupApproved?: boolean;
    remoteLoadingApproved?: boolean;
    manifestFetchApproved?: boolean;
    packDownloadApproved?: boolean;
    cacheLookupApproved?: boolean;
    cacheReadApproved?: boolean;
    cacheWriteApproved?: boolean;
    cacheRepairApproved?: boolean;
    storageMigrationApproved?: boolean;
    cloudRestoreMigrationApproved?: boolean;
    cloudRestoreRewriteApproved?: boolean;
    cloudRestoreExecutionApproved?: boolean;
    syncKeyMutationApproved?: boolean;
    studyTargetMutationApproved?: boolean;
    sourceLocaleMutationApproved?: boolean;
    appLanguageMutationApproved?: boolean;
    futureTargetActivationApproved?: boolean;
    futureTargetFallbackApproved?: boolean;
    bundledContentRemovalApproved?: boolean;
    productionActivationApproved?: boolean;
    legacyFlatCloudKeysTarget?: 'en' | 'mixed' | 'unknown';
    legacyFlatCloudRestoreHydratesFrench?: boolean;
    scopedFrenchCloudKeysPresent?: boolean;
    scopedFrenchCloudKeysIndependent?: boolean;
    appLanguageMutatesStudyTarget?: boolean;
    studyTargetStorageKeyInSyncKeys?: boolean;
    devStudyTargetKeyInSyncKeys?: boolean;
    personalPracticeSourceScopesSeparate?: boolean;
    personalPracticeKeysIncludeRuUk?: boolean;
    lessonListeningProgressTargetAware?: boolean;
    rawListeningProgressBlocked?: boolean;
    futureTargetActivationBlocked?: boolean;
    futureTargetFallbackRemediationRequired?: boolean;
    personalPlanScopeDecision?: string;
    blockers?: unknown[];
  };
};

type DisabledReviewerLocaleIntakeEnvelope = EvidenceEnvelope & {
  safetyStatus?: 'PASS' | 'HOLD';
  approvalStatus?: 'PASS' | 'HOLD';
  reviewerLocale?: {
    status?: 'PASS' | 'HOLD';
    safetyStatus?: 'PASS' | 'HOLD';
    approvalStatus?: 'PASS' | 'HOLD';
    totalRows?: number;
    serverShadowRowsRead?: number;
    explicitApprovalArtifactPresent?: boolean;
    explicitDecisionRows?: number;
    reviewerApprovedRows?: number;
    localePassedRows?: number;
    shadowReviewerApprovedRows?: number;
    shadowLocalePassedRows?: number;
    shadowAutoApprovalDetected?: boolean;
    reviewerLocaleApprovalComplete?: boolean;
    missingReviewerApprovalRows?: unknown[];
    missingLocaleGateRows?: unknown[];
    safetyBlockers?: unknown[];
    approvalBlockers?: unknown[];
    blockers?: unknown[];
  };
  evidenceBlockers?: unknown[];
};

type StartupNoFetchGuardReport = {
  status: 'PASS' | 'HOLD';
  checkedFiles: string[];
  forbiddenPatterns: string[];
  matches: string[];
};

type ActivationReadinessBlockerReport = {
  schemaVersion: 'plan-content-activation-readiness-blocker-report-v1';
  status: 'PASS' | 'HOLD';
  generatedAt: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: 'plan_content';
  contentVersion: string;
  manifestPath: string;
  remoteVerifyReportPath: string;
  serverShadowDualReadReportPath: string;
  disabledManifestPreflightPath: string;
  disabledRuntimeCandidatePath: string;
  disabledOfflineCacheIntegrityPath?: string;
  disabledRollbackKillSwitchPath?: string;
  disabledStorageCloudIsolationPath?: string;
  disabledReviewerLocaleIntakePath?: string;
  activationReadiness: CoursePackActivationReadinessReport;
  startupNoFetchGuard: StartupNoFetchGuardReport;
  offlineCacheIntegrityEvidence: {
    status: 'missing' | 'PASS' | 'HOLD';
    cacheIntegrityEvidenceComplete: boolean;
    offlineCacheUsableByRuntime: boolean | null;
  };
  rollbackKillSwitchEvidence: {
    status: 'missing' | 'PASS' | 'HOLD';
    rollbackEvidenceComplete: boolean;
    rollbackMode: string | null;
    rollbackDeletesUserProgress: boolean | null;
    rollbackMutatesStorageOrCloud: boolean | null;
  };
  storageCloudIsolationEvidence: {
    status: 'missing' | 'PASS' | 'HOLD';
    storageCloudIsolationComplete: boolean;
    legacyFlatCloudKeysTarget: string | null;
    appLanguageMutatesStudyTarget: boolean | null;
    personalPracticeSourceScopesSeparate: boolean | null;
    lessonListeningProgressTargetAware: boolean | null;
    futureTargetActivationBlocked: boolean | null;
    personalPlanScopeDecision: string | null;
  };
  reviewerLocaleIntakeEvidence: {
    status: 'missing' | 'PASS' | 'HOLD';
    safetyStatus: 'missing' | 'PASS' | 'HOLD';
    approvalStatus: 'missing' | 'PASS' | 'HOLD';
    totalRows: number | null;
    explicitApprovalArtifactPresent: boolean | null;
    explicitDecisionRows: number | null;
    reviewerApprovedRows: number | null;
    localePassedRows: number | null;
    missingReviewerApprovalRows: number | null;
    missingLocaleGateRows: number | null;
    shadowAutoApprovalDetected: boolean | null;
    reviewerLocaleApprovalComplete: boolean | null;
  };
  evidenceBlockers: string[];
  blockers: string[];
};

type ActivationReadinessBlockerResult = {
  outputPath: string;
  report: ActivationReadinessBlockerReport;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_RUN_ROOT, 'pack', 'manifest.json');
const DEFAULT_REMOTE_VERIFY_PATH = path.join(DEFAULT_RUN_ROOT, 'server-staging-remote-verify.json');
const DEFAULT_DUAL_READ_PATH = path.join(DEFAULT_RUN_ROOT, 'server-shadow-dual-read-report.json');
const DEFAULT_DISABLED_PREFLIGHT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-manifest-registry-preflight.json');
const DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-runtime-manifest-candidate.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'activation-readiness-blocker-report.json');

const STARTUP_GUARD_FILES = [
  path.join('app', '_layout.tsx'),
  path.join('components', 'onboarding.tsx'),
  path.join('components', 'LangContext.tsx'),
] as const;

const STARTUP_FORBIDDEN_PATTERNS = [
  'course_pack_activation_readiness',
  'course_pack_runtime_manifest_candidate',
  'course_pack_manifest_registry_preflight',
  'course_pack_reviewer_locale_intake',
  'plan_content_activation_readiness_blocker_report',
  'plan_content_disabled_reviewer_locale_intake',
  'activation-readiness-blocker-report',
  'disabled-reviewer-locale-intake',
] as const;

export function resolvePlanContentActivationReadinessTempPath(
  repoRoot: string,
  requestedPath: string | undefined,
  fallbackPath: string,
  label: string,
): string {
  const reportRoot = path.resolve(repoRoot, PLAN_CONTENT_TEMP_ROOT);
  const requested = requestedPath
    ? path.resolve(repoRoot, requestedPath)
    : path.resolve(repoRoot, fallbackPath);

  if (requested !== reportRoot && !requested.startsWith(`${reportRoot}${path.sep}`)) {
    throw new Error(`${label} must stay under ${path.relative(repoRoot, reportRoot)}`);
  }

  return requested;
}

export function writePlanContentActivationReadinessBlockerReport(
  repoRoot: string,
  options: CliOptions = {},
): ActivationReadinessBlockerResult {
  const manifestPath = resolvePlanContentActivationReadinessTempPath(
    repoRoot,
    options.manifestPath,
    DEFAULT_MANIFEST_PATH,
    'Manifest input',
  );
  const remoteVerifyReportPath = resolvePlanContentActivationReadinessTempPath(
    repoRoot,
    options.remoteVerifyReportPath,
    DEFAULT_REMOTE_VERIFY_PATH,
    'Remote verify report input',
  );
  const serverShadowDualReadReportPath = resolvePlanContentActivationReadinessTempPath(
    repoRoot,
    options.serverShadowDualReadReportPath,
    DEFAULT_DUAL_READ_PATH,
    'Server-shadow dual-read report input',
  );
  const disabledManifestPreflightPath = resolvePlanContentActivationReadinessTempPath(
    repoRoot,
    options.disabledManifestPreflightPath,
    DEFAULT_DISABLED_PREFLIGHT_PATH,
    'Disabled manifest preflight input',
  );
  const disabledRuntimeCandidatePath = resolvePlanContentActivationReadinessTempPath(
    repoRoot,
    options.disabledRuntimeCandidatePath,
    DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH,
    'Disabled runtime manifest candidate input',
  );
  const disabledOfflineCacheIntegrityPath = options.disabledOfflineCacheIntegrityPath
    ? resolvePlanContentActivationReadinessTempPath(
      repoRoot,
      options.disabledOfflineCacheIntegrityPath,
      options.disabledOfflineCacheIntegrityPath,
      'Disabled offline cache integrity input',
    )
    : null;
  const disabledRollbackKillSwitchPath = options.disabledRollbackKillSwitchPath
    ? resolvePlanContentActivationReadinessTempPath(
      repoRoot,
      options.disabledRollbackKillSwitchPath,
      options.disabledRollbackKillSwitchPath,
      'Disabled rollback kill-switch input',
    )
    : null;
  const disabledStorageCloudIsolationPath = options.disabledStorageCloudIsolationPath
    ? resolvePlanContentActivationReadinessTempPath(
      repoRoot,
      options.disabledStorageCloudIsolationPath,
      options.disabledStorageCloudIsolationPath,
      'Disabled storage/cloud isolation input',
    )
    : null;
  const disabledReviewerLocaleIntakePath = options.disabledReviewerLocaleIntakePath
    ? resolvePlanContentActivationReadinessTempPath(
      repoRoot,
      options.disabledReviewerLocaleIntakePath,
      options.disabledReviewerLocaleIntakePath,
      'Disabled reviewer/locale intake input',
    )
    : null;
  const outputPath = resolvePlanContentActivationReadinessTempPath(
    repoRoot,
    options.outputPath,
    DEFAULT_OUTPUT_PATH,
    'Activation readiness blocker output',
  );

  const manifest = readJsonFile<CoursePackManifest>(manifestPath);
  const remoteVerify = readJsonFile<RemoteVerifyReport>(remoteVerifyReportPath);
  const serverShadowDualRead = readJsonFile<ServerShadowDualReadReport>(serverShadowDualReadReportPath);
  const disabledPreflight = readJsonFile<DisabledManifestRegistryPreflightEnvelope>(disabledManifestPreflightPath);
  const disabledRuntimeCandidate = readJsonFile<DisabledRuntimeManifestCandidateEnvelope>(disabledRuntimeCandidatePath);
  const disabledOfflineCacheIntegrity = disabledOfflineCacheIntegrityPath
    ? readJsonFile<DisabledOfflineCacheIntegrityEnvelope>(disabledOfflineCacheIntegrityPath)
    : null;
  const disabledRollbackKillSwitch = disabledRollbackKillSwitchPath
    ? readJsonFile<DisabledRollbackKillSwitchEnvelope>(disabledRollbackKillSwitchPath)
    : null;
  const disabledStorageCloudIsolation = disabledStorageCloudIsolationPath
    ? readJsonFile<DisabledStorageCloudIsolationEnvelope>(disabledStorageCloudIsolationPath)
    : null;
  const disabledReviewerLocaleIntake = disabledReviewerLocaleIntakePath
    ? readJsonFile<DisabledReviewerLocaleIntakeEnvelope>(disabledReviewerLocaleIntakePath)
    : null;
  const startupNoFetchGuard = scanStartupNoFetchGuard(repoRoot);
  const reviewerSummary = serverShadowDualRead.parityReport?.reviewerSummary;
  const offlineCacheIntegrityBlockers = disabledOfflineCacheIntegrity
    ? [
      ...validateEvidenceIdentity(manifest, disabledOfflineCacheIntegrity, 'disabled offline cache integrity'),
      ...validateDisabledOfflineCacheIntegrityEnvelope(disabledOfflineCacheIntegrity),
    ]
    : [];
  const offlineCacheIntegrityPassed = disabledOfflineCacheIntegrity
    ? offlineCacheIntegrityBlockers.length === 0
      && disabledOfflineCacheIntegrity.status === 'PASS'
      && disabledOfflineCacheIntegrity.integrity?.cacheIntegrityEvidenceComplete === true
      && disabledOfflineCacheIntegrity.integrity?.offlineCacheUsableByRuntime === false
    : false;
  const rollbackKillSwitchBlockers = disabledRollbackKillSwitch
    ? [
      ...validateEvidenceIdentity(manifest, disabledRollbackKillSwitch, 'disabled rollback kill-switch'),
      ...validateDisabledRollbackKillSwitchEnvelope(disabledRollbackKillSwitch),
    ]
    : [];
  const rollbackKillSwitchPassed = disabledRollbackKillSwitch
    ? rollbackKillSwitchBlockers.length === 0
      && disabledRollbackKillSwitch.status === 'PASS'
      && disabledRollbackKillSwitch.rollback?.rollbackEvidenceComplete === true
      && disabledRollbackKillSwitch.rollback?.rollbackDeletesUserProgress === false
      && disabledRollbackKillSwitch.rollback?.rollbackMutatesStorageOrCloud === false
    : false;
  const storageCloudIsolationBlockers = disabledStorageCloudIsolation
    ? [
      ...validateEvidenceIdentity(manifest, disabledStorageCloudIsolation, 'disabled storage/cloud isolation'),
      ...validateDisabledStorageCloudIsolationEnvelope(disabledStorageCloudIsolation),
    ]
    : [];
  const storageCloudIsolationPassed = disabledStorageCloudIsolation
    ? storageCloudIsolationBlockers.length === 0
      && disabledStorageCloudIsolation.status === 'PASS'
      && disabledStorageCloudIsolation.storageCloud?.storageCloudIsolationComplete === true
      && disabledStorageCloudIsolation.storageCloud?.legacyFlatCloudKeysTarget === 'en'
      && disabledStorageCloudIsolation.storageCloud?.legacyFlatCloudRestoreHydratesFrench === false
      && disabledStorageCloudIsolation.storageCloud?.appLanguageMutatesStudyTarget === false
      && disabledStorageCloudIsolation.storageCloud?.studyTargetStorageKeyInSyncKeys === false
      && disabledStorageCloudIsolation.storageCloud?.devStudyTargetKeyInSyncKeys === false
      && disabledStorageCloudIsolation.storageCloud?.personalPracticeSourceScopesSeparate === true
      && disabledStorageCloudIsolation.storageCloud?.lessonListeningProgressTargetAware === true
      && disabledStorageCloudIsolation.storageCloud?.rawListeningProgressBlocked === true
      && disabledStorageCloudIsolation.storageCloud?.futureTargetActivationBlocked === true
    : false;
  const reviewerLocaleIntakeBlockers = disabledReviewerLocaleIntake
    ? [
      ...validateEvidenceIdentity(manifest, disabledReviewerLocaleIntake, 'disabled reviewer/locale intake'),
      ...validateDisabledReviewerLocaleIntakeEnvelope(disabledReviewerLocaleIntake),
    ]
    : [];
  const reviewerLocaleIntakePassedSafety = disabledReviewerLocaleIntake
    ? reviewerLocaleIntakeBlockers.length === 0
      && disabledReviewerLocaleIntake.safetyStatus === 'PASS'
      && disabledReviewerLocaleIntake.reviewerLocale?.safetyStatus === 'PASS'
    : false;
  const reviewerApprovedRows = reviewerLocaleIntakePassedSafety
    ? disabledReviewerLocaleIntake?.reviewerLocale?.reviewerApprovedRows ?? 0
    : reviewerSummary?.reviewStatusCounts?.approved ?? 0;
  const reviewedRows = reviewerLocaleIntakePassedSafety
    ? disabledReviewerLocaleIntake?.reviewerLocale?.totalRows ?? 0
    : reviewerSummary?.reviewedRowCount ?? 0;
  const localePassedRows = reviewerLocaleIntakePassedSafety
    ? disabledReviewerLocaleIntake?.reviewerLocale?.localePassedRows ?? 0
    : reviewerSummary?.localeGateStatusCounts?.passed ?? 0;

  const activationReadiness = evaluateCoursePackActivationReadiness(buildCurrentDisabledActivationInput({
    manifest,
    remoteVerifyStatus: remoteVerify.status === 'PASS' ? 'PASS' : 'HOLD',
    serverShadowDualReadStatus: serverShadowDualRead.status === 'PASS' ? 'PASS' : 'HOLD',
    serverShadowParityVerdict: serverShadowDualRead.parityReport?.verdict ?? 'hold',
    disabledManifestPreflightStatus: disabledPreflight.status === 'PASS' ? 'PASS' : 'HOLD',
    disabledRuntimeCandidateStatus: disabledRuntimeCandidate.status === 'PASS' ? 'PASS' : 'HOLD',
    runtimeManifestRegistrable: disabledRuntimeCandidate.candidate?.runtimeManifestRegistrable === true,
    reviewerApprovedRows,
    reviewedRows,
    localePassedRows,
    startupNoFetchGuardPassed: startupNoFetchGuard.status === 'PASS',
    offlineCacheIntegrityPassed,
    rollbackKillSwitchPassed,
    storageCloudIsolationPassed,
    productOwnerActivationApproved: false,
  }));
  const evidenceBlockers = [
    ...validateEvidenceIdentity(manifest, remoteVerify, 'remote verify'),
    ...validateEvidenceIdentity(manifest, serverShadowDualRead, 'server-shadow dual-read'),
    ...validateEvidenceIdentity(manifest, disabledPreflight, 'disabled manifest preflight'),
    ...validateEvidenceIdentity(manifest, disabledRuntimeCandidate, 'disabled runtime manifest candidate'),
    ...validateEvidenceGuards(remoteVerify, 'remote verify'),
    ...validateEvidenceGuards(serverShadowDualRead, 'server-shadow dual-read'),
    ...validateDisabledPreflightEnvelope(disabledPreflight),
    ...validateDisabledRuntimeCandidateEnvelope(disabledRuntimeCandidate),
    ...offlineCacheIntegrityBlockers,
    ...rollbackKillSwitchBlockers,
    ...storageCloudIsolationBlockers,
    ...reviewerLocaleIntakeBlockers,
    ...startupNoFetchGuard.matches.map((match) => `startup no-fetch guard violation: ${match}`),
  ];
  const blockers = [
    ...activationReadiness.blockers,
    ...evidenceBlockers,
  ];
  const report: ActivationReadinessBlockerReport = {
    schemaVersion: 'plan-content-activation-readiness-blocker-report-v1',
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: 'plan_content',
    contentVersion: manifest.contentVersion,
    manifestPath: relativePath(repoRoot, manifestPath),
    remoteVerifyReportPath: relativePath(repoRoot, remoteVerifyReportPath),
    serverShadowDualReadReportPath: relativePath(repoRoot, serverShadowDualReadReportPath),
    disabledManifestPreflightPath: relativePath(repoRoot, disabledManifestPreflightPath),
    disabledRuntimeCandidatePath: relativePath(repoRoot, disabledRuntimeCandidatePath),
    ...(disabledOfflineCacheIntegrityPath ? {
      disabledOfflineCacheIntegrityPath: relativePath(repoRoot, disabledOfflineCacheIntegrityPath),
    } : {}),
    ...(disabledRollbackKillSwitchPath ? {
      disabledRollbackKillSwitchPath: relativePath(repoRoot, disabledRollbackKillSwitchPath),
    } : {}),
    ...(disabledStorageCloudIsolationPath ? {
      disabledStorageCloudIsolationPath: relativePath(repoRoot, disabledStorageCloudIsolationPath),
    } : {}),
    ...(disabledReviewerLocaleIntakePath ? {
      disabledReviewerLocaleIntakePath: relativePath(repoRoot, disabledReviewerLocaleIntakePath),
    } : {}),
    activationReadiness,
    startupNoFetchGuard,
    offlineCacheIntegrityEvidence: {
      status: disabledOfflineCacheIntegrity?.status ?? 'missing',
      cacheIntegrityEvidenceComplete: disabledOfflineCacheIntegrity?.integrity?.cacheIntegrityEvidenceComplete === true,
      offlineCacheUsableByRuntime: disabledOfflineCacheIntegrity?.integrity?.offlineCacheUsableByRuntime ?? null,
    },
    rollbackKillSwitchEvidence: {
      status: disabledRollbackKillSwitch?.status ?? 'missing',
      rollbackEvidenceComplete: disabledRollbackKillSwitch?.rollback?.rollbackEvidenceComplete === true,
      rollbackMode: disabledRollbackKillSwitch?.rollback?.rollbackMode ?? null,
      rollbackDeletesUserProgress: disabledRollbackKillSwitch?.rollback?.rollbackDeletesUserProgress ?? null,
      rollbackMutatesStorageOrCloud: disabledRollbackKillSwitch?.rollback?.rollbackMutatesStorageOrCloud ?? null,
    },
    storageCloudIsolationEvidence: {
      status: disabledStorageCloudIsolation?.status ?? 'missing',
      storageCloudIsolationComplete: disabledStorageCloudIsolation?.storageCloud?.storageCloudIsolationComplete === true,
      legacyFlatCloudKeysTarget: disabledStorageCloudIsolation?.storageCloud?.legacyFlatCloudKeysTarget ?? null,
      appLanguageMutatesStudyTarget: disabledStorageCloudIsolation?.storageCloud?.appLanguageMutatesStudyTarget ?? null,
      personalPracticeSourceScopesSeparate: disabledStorageCloudIsolation?.storageCloud?.personalPracticeSourceScopesSeparate ?? null,
      lessonListeningProgressTargetAware: disabledStorageCloudIsolation?.storageCloud?.lessonListeningProgressTargetAware ?? null,
      futureTargetActivationBlocked: disabledStorageCloudIsolation?.storageCloud?.futureTargetActivationBlocked ?? null,
      personalPlanScopeDecision: disabledStorageCloudIsolation?.storageCloud?.personalPlanScopeDecision ?? null,
    },
    reviewerLocaleIntakeEvidence: {
      status: disabledReviewerLocaleIntake?.status ?? 'missing',
      safetyStatus: disabledReviewerLocaleIntake?.safetyStatus ?? 'missing',
      approvalStatus: disabledReviewerLocaleIntake?.approvalStatus ?? 'missing',
      totalRows: disabledReviewerLocaleIntake?.reviewerLocale?.totalRows ?? null,
      explicitApprovalArtifactPresent: disabledReviewerLocaleIntake?.reviewerLocale?.explicitApprovalArtifactPresent ?? null,
      explicitDecisionRows: disabledReviewerLocaleIntake?.reviewerLocale?.explicitDecisionRows ?? null,
      reviewerApprovedRows: disabledReviewerLocaleIntake?.reviewerLocale?.reviewerApprovedRows ?? null,
      localePassedRows: disabledReviewerLocaleIntake?.reviewerLocale?.localePassedRows ?? null,
      missingReviewerApprovalRows: Array.isArray(disabledReviewerLocaleIntake?.reviewerLocale?.missingReviewerApprovalRows)
        ? disabledReviewerLocaleIntake.reviewerLocale.missingReviewerApprovalRows.length
        : null,
      missingLocaleGateRows: Array.isArray(disabledReviewerLocaleIntake?.reviewerLocale?.missingLocaleGateRows)
        ? disabledReviewerLocaleIntake.reviewerLocale.missingLocaleGateRows.length
        : null,
      shadowAutoApprovalDetected: disabledReviewerLocaleIntake?.reviewerLocale?.shadowAutoApprovalDetected ?? null,
      reviewerLocaleApprovalComplete: disabledReviewerLocaleIntake?.reviewerLocale?.reviewerLocaleApprovalComplete ?? null,
    },
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return {
    outputPath,
    report,
  };
}

function scanStartupNoFetchGuard(repoRoot: string): StartupNoFetchGuardReport {
  const matches: string[] = [];
  const checkedFiles = STARTUP_GUARD_FILES.map((file) => file.replace(/\\/g, '/'));

  for (const relativeFile of STARTUP_GUARD_FILES) {
    const filePath = path.join(repoRoot, relativeFile);
    const source = fs.readFileSync(filePath, 'utf8');
    for (const pattern of STARTUP_FORBIDDEN_PATTERNS) {
      if (source.includes(pattern)) {
        matches.push(`${relativeFile.replace(/\\/g, '/')}: ${pattern}`);
      }
    }
  }

  return {
    status: matches.length === 0 ? 'PASS' : 'HOLD',
    checkedFiles,
    forbiddenPatterns: [...STARTUP_FORBIDDEN_PATTERNS],
    matches,
  };
}

function validateEvidenceIdentity(
  manifest: CoursePackManifest,
  evidence: EvidenceEnvelope,
  label: string,
): string[] {
  const errors: string[] = [];
  if (evidence.packId !== manifest.packId) {
    errors.push(`${label} packId must match manifest`);
  }
  if (evidence.studyTarget !== manifest.studyTarget) {
    errors.push(`${label} studyTarget must match manifest`);
  }
  if (evidence.sourceLocale !== manifest.sourceLocale) {
    errors.push(`${label} sourceLocale must match manifest`);
  }
  if (evidence.surface !== manifest.surface) {
    errors.push(`${label} surface must match manifest`);
  }
  if (evidence.contentVersion !== manifest.contentVersion) {
    errors.push(`${label} contentVersion must match manifest`);
  }
  return errors;
}

function validateEvidenceGuards(evidence: EvidenceEnvelope, label: string): string[] {
  const errors: string[] = [];
  if (evidence.status !== 'PASS') {
    errors.push(`${label} status must be PASS`);
  }
  if (evidence.activationApproved !== false) {
    errors.push(`${label} activationApproved must remain false`);
  }
  if (evidence.runtimeManifestRegistered !== false) {
    errors.push(`${label} runtimeManifestRegistered must remain false`);
  }
  if (evidence.remoteLoadingEnabled !== false) {
    errors.push(`${label} remoteLoadingEnabled must remain false`);
  }
  if (evidence.bundledContentRemoved !== false) {
    errors.push(`${label} bundledContentRemoved must remain false`);
  }
  if (evidence.storageMigrationRan !== false) {
    errors.push(`${label} storageMigrationRan must remain false`);
  }
  if (evidence.productionActivationApproved !== false) {
    errors.push(`${label} productionActivationApproved must remain false`);
  }
  if (Array.isArray(evidence.blockers) && evidence.blockers.length > 0) {
    errors.push(`${label} blockers must be empty`);
  }
  return errors;
}

function validateDisabledPreflightEnvelope(envelope: DisabledManifestRegistryPreflightEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled manifest preflight envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled manifest preflight envelope blockers must be empty');
  }
  if (!envelope.preflight) {
    errors.push('disabled manifest preflight envelope must contain preflight payload');
    return errors;
  }
  if (envelope.preflight.status !== 'PASS') {
    errors.push('disabled manifest preflight payload status must be PASS');
  }
  if (envelope.preflight.registryEntryAllowed !== false) {
    errors.push('disabled manifest preflight registryEntryAllowed must remain false');
  }
  if (envelope.preflight.cacheMetadataReadableByRuntime !== false) {
    errors.push('disabled manifest preflight cacheMetadataReadableByRuntime must remain false');
  }
  if (envelope.preflight.cacheMetadataWritableByRuntime !== false) {
    errors.push('disabled manifest preflight cacheMetadataWritableByRuntime must remain false');
  }
  if (envelope.preflight.manifestFetchApproved !== false) {
    errors.push('disabled manifest preflight manifestFetchApproved must remain false');
  }
  if (envelope.preflight.packDownloadApproved !== false) {
    errors.push('disabled manifest preflight packDownloadApproved must remain false');
  }
  if (envelope.preflight.cacheReadApproved !== false) {
    errors.push('disabled manifest preflight cacheReadApproved must remain false');
  }
  if (envelope.preflight.cacheWriteApproved !== false) {
    errors.push('disabled manifest preflight cacheWriteApproved must remain false');
  }
  if (envelope.preflight.startupBlockingAllowed !== false) {
    errors.push('disabled manifest preflight startupBlockingAllowed must remain false');
  }
  return errors;
}

function validateDisabledRuntimeCandidateEnvelope(envelope: DisabledRuntimeManifestCandidateEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled runtime manifest candidate envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled runtime manifest candidate envelope blockers must be empty');
  }
  if (!envelope.candidate) {
    errors.push('disabled runtime manifest candidate envelope must contain candidate payload');
    return errors;
  }
  if (envelope.candidate.status !== 'PASS') {
    errors.push('disabled runtime manifest candidate payload status must be PASS');
  }
  if (envelope.candidate.evidenceBundleComplete !== true) {
    errors.push('disabled runtime manifest candidate evidenceBundleComplete must be true');
  }
  if (envelope.candidate.runtimeManifestRegistrable !== false) {
    errors.push('disabled runtime manifest candidate runtimeManifestRegistrable must remain false');
  }
  if (envelope.candidate.runtimeManifestRegistered !== false) {
    errors.push('disabled runtime manifest candidate runtimeManifestRegistered must remain false');
  }
  if (envelope.candidate.runtimeLookupAllowed !== false) {
    errors.push('disabled runtime manifest candidate runtimeLookupAllowed must remain false');
  }
  if (envelope.candidate.cacheLookupAllowed !== false) {
    errors.push('disabled runtime manifest candidate cacheLookupAllowed must remain false');
  }
  if (envelope.candidate.cacheReadAllowed !== false) {
    errors.push('disabled runtime manifest candidate cacheReadAllowed must remain false');
  }
  if (envelope.candidate.cacheWriteAllowed !== false) {
    errors.push('disabled runtime manifest candidate cacheWriteAllowed must remain false');
  }
  if (envelope.candidate.startupBlockingAllowed !== false) {
    errors.push('disabled runtime manifest candidate startupBlockingAllowed must remain false');
  }
  if (Array.isArray(envelope.candidate.blockers) && envelope.candidate.blockers.length > 0) {
    errors.push('disabled runtime manifest candidate blockers must be empty');
  }
  return errors;
}

function validateDisabledOfflineCacheIntegrityEnvelope(envelope: DisabledOfflineCacheIntegrityEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled offline cache integrity envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled offline cache integrity envelope blockers must be empty');
  }
  if (!envelope.integrity) {
    errors.push('disabled offline cache integrity envelope must contain integrity payload');
    return errors;
  }
  if (envelope.integrity.status !== 'PASS') {
    errors.push('disabled offline cache integrity payload status must be PASS');
  }
  if (envelope.integrity.cacheIntegrityEvidenceComplete !== true) {
    errors.push('disabled offline cache integrity evidence must be complete');
  }
  if (envelope.integrity.activationApproved !== false) {
    errors.push('disabled offline cache integrity activationApproved must remain false');
  }
  if (envelope.integrity.remoteLoadingEnabled !== false) {
    errors.push('disabled offline cache integrity remoteLoadingEnabled must remain false');
  }
  if (envelope.integrity.manifestFetchApproved !== false) {
    errors.push('disabled offline cache integrity manifestFetchApproved must remain false');
  }
  if (envelope.integrity.packDownloadApproved !== false) {
    errors.push('disabled offline cache integrity packDownloadApproved must remain false');
  }
  if (envelope.integrity.cacheLookupApproved !== false) {
    errors.push('disabled offline cache integrity cacheLookupApproved must remain false');
  }
  if (envelope.integrity.cacheReadApproved !== false) {
    errors.push('disabled offline cache integrity cacheReadApproved must remain false');
  }
  if (envelope.integrity.cacheWriteApproved !== false) {
    errors.push('disabled offline cache integrity cacheWriteApproved must remain false');
  }
  if (envelope.integrity.cacheRepairApproved !== false) {
    errors.push('disabled offline cache integrity cacheRepairApproved must remain false');
  }
  if (envelope.integrity.storageMigrationApproved !== false) {
    errors.push('disabled offline cache integrity storageMigrationApproved must remain false');
  }
  if (envelope.integrity.bundledContentRemovalApproved !== false) {
    errors.push('disabled offline cache integrity bundledContentRemovalApproved must remain false');
  }
  if (envelope.integrity.productionActivationApproved !== false) {
    errors.push('disabled offline cache integrity productionActivationApproved must remain false');
  }
  if (envelope.integrity.offlineCacheUsableByRuntime !== false) {
    errors.push('disabled offline cache integrity offlineCacheUsableByRuntime must remain false');
  }
  if (envelope.integrity.cacheLookupAllowed !== false) {
    errors.push('disabled offline cache integrity cacheLookupAllowed must remain false');
  }
  if (envelope.integrity.cacheReadAllowed !== false) {
    errors.push('disabled offline cache integrity cacheReadAllowed must remain false');
  }
  if (envelope.integrity.cacheWriteAllowed !== false) {
    errors.push('disabled offline cache integrity cacheWriteAllowed must remain false');
  }
  if (envelope.integrity.cacheRepairAllowed !== false) {
    errors.push('disabled offline cache integrity cacheRepairAllowed must remain false');
  }
  if (envelope.integrity.startupBlockingAllowed !== false) {
    errors.push('disabled offline cache integrity startupBlockingAllowed must remain false');
  }
  if (Array.isArray(envelope.integrity.blockers) && envelope.integrity.blockers.length > 0) {
    errors.push('disabled offline cache integrity blockers must be empty');
  }
  return errors;
}

function validateDisabledRollbackKillSwitchEnvelope(envelope: DisabledRollbackKillSwitchEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled rollback kill-switch envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled rollback kill-switch envelope blockers must be empty');
  }
  if (!envelope.rollback) {
    errors.push('disabled rollback kill-switch envelope must contain rollback payload');
    return errors;
  }
  if (envelope.rollback.status !== 'PASS') {
    errors.push('disabled rollback kill-switch payload status must be PASS');
  }
  if (envelope.rollback.rollbackEvidenceComplete !== true) {
    errors.push('disabled rollback kill-switch evidence must be complete');
  }
  if (envelope.rollback.rollbackMode !== 'bundled_compatibility') {
    errors.push('disabled rollback kill-switch rollbackMode must be bundled_compatibility');
  }
  if (envelope.rollback.rollbackForcesBundledCompatibility !== true) {
    errors.push('disabled rollback kill-switch rollbackForcesBundledCompatibility must be true');
  }
  if (envelope.rollback.rollbackRequiresAppUpdate !== false) {
    errors.push('disabled rollback kill-switch rollbackRequiresAppUpdate must remain false');
  }
  if (envelope.rollback.rollbackDeletesUserProgress !== false) {
    errors.push('disabled rollback kill-switch rollbackDeletesUserProgress must remain false');
  }
  if (envelope.rollback.rollbackMutatesStorageOrCloud !== false) {
    errors.push('disabled rollback kill-switch rollbackMutatesStorageOrCloud must remain false');
  }
  if (envelope.rollback.rollbackDownloadsPack !== false) {
    errors.push('disabled rollback kill-switch rollbackDownloadsPack must remain false');
  }
  if (envelope.rollback.rollbackReadsCache !== false) {
    errors.push('disabled rollback kill-switch rollbackReadsCache must remain false');
  }
  if (envelope.rollback.rollbackWritesCache !== false) {
    errors.push('disabled rollback kill-switch rollbackWritesCache must remain false');
  }
  if (envelope.rollback.rollbackRepairsCache !== false) {
    errors.push('disabled rollback kill-switch rollbackRepairsCache must remain false');
  }
  if (envelope.rollback.runtimeManifestRegistered !== false) {
    errors.push('disabled rollback kill-switch runtimeManifestRegistered must remain false');
  }
  if (envelope.rollback.runtimeLookupAllowed !== false) {
    errors.push('disabled rollback kill-switch runtimeLookupAllowed must remain false');
  }
  if (envelope.rollback.cacheLookupAllowed !== false) {
    errors.push('disabled rollback kill-switch cacheLookupAllowed must remain false');
  }
  if (envelope.rollback.cacheReadAllowed !== false) {
    errors.push('disabled rollback kill-switch cacheReadAllowed must remain false');
  }
  if (envelope.rollback.cacheWriteAllowed !== false) {
    errors.push('disabled rollback kill-switch cacheWriteAllowed must remain false');
  }
  if (envelope.rollback.cacheRepairAllowed !== false) {
    errors.push('disabled rollback kill-switch cacheRepairAllowed must remain false');
  }
  if (envelope.rollback.startupBlockingAllowed !== false) {
    errors.push('disabled rollback kill-switch startupBlockingAllowed must remain false');
  }
  if (envelope.rollback.bundledCompatibilityRollbackAvailable !== true) {
    errors.push('disabled rollback kill-switch bundledCompatibilityRollbackAvailable must be true');
  }
  if (envelope.rollback.missingWithoutDownloadRollbackAvailable !== true) {
    errors.push('disabled rollback kill-switch missingWithoutDownloadRollbackAvailable must be true');
  }
  if (Array.isArray(envelope.rollback.blockers) && envelope.rollback.blockers.length > 0) {
    errors.push('disabled rollback kill-switch blockers must be empty');
  }
  return errors;
}

function validateDisabledStorageCloudIsolationEnvelope(envelope: DisabledStorageCloudIsolationEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS') {
    errors.push('disabled storage/cloud isolation envelope status must be PASS');
  }
  if (Array.isArray(envelope.blockers) && envelope.blockers.length > 0) {
    errors.push('disabled storage/cloud isolation envelope blockers must be empty');
  }
  if (!envelope.storageCloud) {
    errors.push('disabled storage/cloud isolation envelope must contain storageCloud payload');
    return errors;
  }
  if (envelope.storageCloud.status !== 'PASS') {
    errors.push('disabled storage/cloud isolation payload status must be PASS');
  }
  if (envelope.storageCloud.storageCloudIsolationComplete !== true) {
    errors.push('disabled storage/cloud isolation evidence must be complete');
  }
  const falseFields: Array<[string, boolean | undefined]> = [
    ['activationApproved', envelope.storageCloud.activationApproved],
    ['runtimeManifestRegistrationApproved', envelope.storageCloud.runtimeManifestRegistrationApproved],
    ['runtimeLookupApproved', envelope.storageCloud.runtimeLookupApproved],
    ['remoteLoadingApproved', envelope.storageCloud.remoteLoadingApproved],
    ['manifestFetchApproved', envelope.storageCloud.manifestFetchApproved],
    ['packDownloadApproved', envelope.storageCloud.packDownloadApproved],
    ['cacheLookupApproved', envelope.storageCloud.cacheLookupApproved],
    ['cacheReadApproved', envelope.storageCloud.cacheReadApproved],
    ['cacheWriteApproved', envelope.storageCloud.cacheWriteApproved],
    ['cacheRepairApproved', envelope.storageCloud.cacheRepairApproved],
    ['storageMigrationApproved', envelope.storageCloud.storageMigrationApproved],
    ['cloudRestoreMigrationApproved', envelope.storageCloud.cloudRestoreMigrationApproved],
    ['cloudRestoreRewriteApproved', envelope.storageCloud.cloudRestoreRewriteApproved],
    ['cloudRestoreExecutionApproved', envelope.storageCloud.cloudRestoreExecutionApproved],
    ['syncKeyMutationApproved', envelope.storageCloud.syncKeyMutationApproved],
    ['studyTargetMutationApproved', envelope.storageCloud.studyTargetMutationApproved],
    ['sourceLocaleMutationApproved', envelope.storageCloud.sourceLocaleMutationApproved],
    ['appLanguageMutationApproved', envelope.storageCloud.appLanguageMutationApproved],
    ['futureTargetActivationApproved', envelope.storageCloud.futureTargetActivationApproved],
    ['futureTargetFallbackApproved', envelope.storageCloud.futureTargetFallbackApproved],
    ['bundledContentRemovalApproved', envelope.storageCloud.bundledContentRemovalApproved],
    ['productionActivationApproved', envelope.storageCloud.productionActivationApproved],
    ['legacyFlatCloudRestoreHydratesFrench', envelope.storageCloud.legacyFlatCloudRestoreHydratesFrench],
    ['appLanguageMutatesStudyTarget', envelope.storageCloud.appLanguageMutatesStudyTarget],
    ['studyTargetStorageKeyInSyncKeys', envelope.storageCloud.studyTargetStorageKeyInSyncKeys],
    ['devStudyTargetKeyInSyncKeys', envelope.storageCloud.devStudyTargetKeyInSyncKeys],
  ];
  for (const [field, value] of falseFields) {
    if (value !== false) errors.push(`disabled storage/cloud isolation ${field} must remain false`);
  }
  if (envelope.storageCloud.legacyFlatCloudKeysTarget !== 'en') {
    errors.push('disabled storage/cloud isolation legacyFlatCloudKeysTarget must be en');
  }
  if (envelope.storageCloud.scopedFrenchCloudKeysPresent !== true) {
    errors.push('disabled storage/cloud isolation scopedFrenchCloudKeysPresent must be true');
  }
  if (envelope.storageCloud.scopedFrenchCloudKeysIndependent !== true) {
    errors.push('disabled storage/cloud isolation scopedFrenchCloudKeysIndependent must be true');
  }
  if (envelope.storageCloud.personalPracticeSourceScopesSeparate !== true) {
    errors.push('disabled storage/cloud isolation personalPracticeSourceScopesSeparate must be true');
  }
  if (envelope.storageCloud.personalPracticeKeysIncludeRuUk !== true) {
    errors.push('disabled storage/cloud isolation personalPracticeKeysIncludeRuUk must be true');
  }
  if (envelope.storageCloud.lessonListeningProgressTargetAware !== true) {
    errors.push('disabled storage/cloud isolation lessonListeningProgressTargetAware must be true');
  }
  if (envelope.storageCloud.rawListeningProgressBlocked !== true) {
    errors.push('disabled storage/cloud isolation rawListeningProgressBlocked must be true');
  }
  if (envelope.storageCloud.futureTargetActivationBlocked !== true) {
    errors.push('disabled storage/cloud isolation futureTargetActivationBlocked must be true');
  }
  if (envelope.storageCloud.futureTargetFallbackRemediationRequired !== true) {
    errors.push('disabled storage/cloud isolation futureTargetFallbackRemediationRequired must be true');
  }
  if (!envelope.storageCloud.personalPlanScopeDecision || envelope.storageCloud.personalPlanScopeDecision === 'unknown') {
    errors.push('disabled storage/cloud isolation personalPlanScopeDecision must be recorded');
  }
  if (Array.isArray(envelope.storageCloud.blockers) && envelope.storageCloud.blockers.length > 0) {
    errors.push('disabled storage/cloud isolation blockers must be empty');
  }
  return errors;
}

function validateDisabledReviewerLocaleIntakeEnvelope(envelope: DisabledReviewerLocaleIntakeEnvelope): string[] {
  const errors: string[] = [];
  if (envelope.status !== 'PASS' && envelope.status !== 'HOLD') {
    errors.push('disabled reviewer/locale intake envelope status must be PASS or HOLD');
  }
  if (envelope.safetyStatus !== 'PASS') {
    errors.push('disabled reviewer/locale intake safetyStatus must be PASS');
  }
  if (envelope.approvalStatus !== 'PASS' && envelope.approvalStatus !== 'HOLD') {
    errors.push('disabled reviewer/locale intake approvalStatus must be PASS or HOLD');
  }
  if (Array.isArray(envelope.evidenceBlockers) && envelope.evidenceBlockers.length > 0) {
    errors.push('disabled reviewer/locale intake evidenceBlockers must be empty');
  }
  if (!envelope.reviewerLocale) {
    errors.push('disabled reviewer/locale intake envelope must contain reviewerLocale payload');
    return errors;
  }
  if (envelope.reviewerLocale.safetyStatus !== 'PASS') {
    errors.push('disabled reviewer/locale intake payload safetyStatus must be PASS');
  }
  if (envelope.reviewerLocale.totalRows === undefined || envelope.reviewerLocale.totalRows <= 0) {
    errors.push('disabled reviewer/locale intake totalRows must be positive');
  }
  if (envelope.reviewerLocale.serverShadowRowsRead !== envelope.reviewerLocale.totalRows) {
    errors.push('disabled reviewer/locale intake serverShadowRowsRead must match totalRows');
  }
  if ((envelope.reviewerLocale.reviewerApprovedRows ?? 0) > (envelope.reviewerLocale.totalRows ?? 0)) {
    errors.push('disabled reviewer/locale intake reviewerApprovedRows cannot exceed totalRows');
  }
  if ((envelope.reviewerLocale.localePassedRows ?? 0) > (envelope.reviewerLocale.totalRows ?? 0)) {
    errors.push('disabled reviewer/locale intake localePassedRows cannot exceed totalRows');
  }
  if ((envelope.reviewerLocale.explicitDecisionRows ?? 0) > (envelope.reviewerLocale.totalRows ?? 0)) {
    errors.push('disabled reviewer/locale intake explicitDecisionRows cannot exceed totalRows');
  }
  if (envelope.reviewerLocale.shadowReviewerApprovedRows !== 0) {
    errors.push('disabled reviewer/locale intake shadowReviewerApprovedRows must remain 0');
  }
  if (envelope.reviewerLocale.shadowLocalePassedRows !== 0) {
    errors.push('disabled reviewer/locale intake shadowLocalePassedRows must remain 0');
  }
  if (envelope.reviewerLocale.shadowAutoApprovalDetected !== false) {
    errors.push('disabled reviewer/locale intake shadowAutoApprovalDetected must remain false');
  }
  if (Array.isArray(envelope.reviewerLocale.safetyBlockers) && envelope.reviewerLocale.safetyBlockers.length > 0) {
    errors.push('disabled reviewer/locale intake safetyBlockers must be empty');
  }
  return errors;
}

function readJsonFile<T>(filePath: string): T {
  const source = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(source) as T;
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') {
      options.manifestPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--remote-verify-report') {
      options.remoteVerifyReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--server-shadow-dual-read-report') {
      options.serverShadowDualReadReportPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-manifest-preflight') {
      options.disabledManifestPreflightPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-runtime-candidate') {
      options.disabledRuntimeCandidatePath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-offline-cache-integrity') {
      options.disabledOfflineCacheIntegrityPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-rollback-kill-switch') {
      options.disabledRollbackKillSwitchPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-storage-cloud-isolation') {
      options.disabledStorageCloudIsolationPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--disabled-reviewer-locale-intake') {
      options.disabledReviewerLocaleIntakePath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function main(): void {
  const repoRoot = process.cwd();
  const result = writePlanContentActivationReadinessBlockerReport(repoRoot, parseCli(process.argv.slice(2)));
  console.log(`Plan content activation readiness: ${result.report.status}`);
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Completed gates: ${result.report.activationReadiness.completedGateCount}`);
  console.log(`Blocked gates: ${result.report.activationReadiness.blockedGateCount}`);
  console.log(`Blockers: ${result.report.blockers.length}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
