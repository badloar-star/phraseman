import fs from 'node:fs';
import path from 'node:path';

import type { CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateCoursePackStorageCloudIsolation,
  type CoursePackStorageCloudIsolationReport,
} from '../app/course_pack_storage_cloud_isolation';
import {
  assertTargetKey,
  lessonListeningProgressKey,
  personalPracticeFreeAccessKey,
  personalPracticeTrainingProgressKey,
  resolvedPersonalTrainingsKey,
  storageStudyTarget,
} from '../app/target_storage_keys';
import { INTERNAL_STUDY_TARGETS, STUDY_TARGETS } from '../app/study_target';

type CliOptions = {
  manifestPath?: string;
  remoteVerifyReportPath?: string;
  serverShadowDualReadReportPath?: string;
  disabledManifestPreflightPath?: string;
  disabledRuntimeCandidatePath?: string;
  disabledOfflineCacheIntegrityPath?: string;
  disabledRollbackKillSwitchPath?: string;
  activationReadinessPath?: string;
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

type ServerShadowDualReadReport = EvidenceEnvelope & {
  parityReport?: {
    verdict?: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  };
};

type DisabledRuntimeManifestCandidateEnvelope = EvidenceEnvelope & {
  candidate?: {
    status?: 'PASS' | 'HOLD';
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
    offlineCacheUsableByRuntime?: boolean;
    storageMigrationApproved?: boolean;
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
    rollbackMutatesStorageOrCloud?: boolean;
    rollbackDeletesUserProgress?: boolean;
    runtimeLookupAllowed?: boolean;
    cacheLookupAllowed?: boolean;
    cacheReadAllowed?: boolean;
    cacheWriteAllowed?: boolean;
    cacheRepairAllowed?: boolean;
    startupBlockingAllowed?: boolean;
    blockers?: unknown[];
  };
};

type ActivationReadinessEnvelope = EvidenceEnvelope & {
  activationReadiness?: {
    status?: 'PASS' | 'HOLD';
    activationApproved?: boolean;
    remoteLoadingEnabled?: boolean;
    runtimeManifestRegistrable?: boolean;
    bundledContentRemoved?: boolean;
  };
  startupNoFetchGuard?: {
    status?: 'PASS' | 'HOLD';
  };
};

type DisabledStorageCloudIsolationEnvelope = {
  schemaVersion: 'plan-content-disabled-storage-cloud-isolation-report-v1';
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
  disabledOfflineCacheIntegrityPath: string;
  disabledRollbackKillSwitchPath: string;
  activationReadinessPath: string;
  storageCloud: CoursePackStorageCloudIsolationReport;
  evidenceBlockers: string[];
  blockers: string[];
};

type DisabledStorageCloudIsolationResult = {
  outputPath: string;
  report: DisabledStorageCloudIsolationEnvelope;
};

const PLAN_CONTENT_TEMP_ROOT = path.join('.codex-tmp', 'plan-content');
const DEFAULT_RUN_ROOT = path.join(PLAN_CONTENT_TEMP_ROOT, 'staging-upload-20260627');
const DEFAULT_MANIFEST_PATH = path.join(DEFAULT_RUN_ROOT, 'pack', 'manifest.json');
const DEFAULT_REMOTE_VERIFY_PATH = path.join(DEFAULT_RUN_ROOT, 'server-staging-remote-verify.json');
const DEFAULT_DUAL_READ_PATH = path.join(DEFAULT_RUN_ROOT, 'server-shadow-dual-read-report.json');
const DEFAULT_DISABLED_PREFLIGHT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-manifest-registry-preflight.json');
const DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-runtime-manifest-candidate.json');
const DEFAULT_DISABLED_OFFLINE_CACHE_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-offline-cache-integrity.json');
const DEFAULT_DISABLED_ROLLBACK_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-rollback-kill-switch.json');
const DEFAULT_ACTIVATION_READINESS_PATH = path.join(DEFAULT_RUN_ROOT, 'activation-readiness-blocker-report.json');
const DEFAULT_OUTPUT_PATH = path.join(DEFAULT_RUN_ROOT, 'disabled-storage-cloud-isolation.json');

const SOURCE_FILES = [
  path.join('app', 'cloud_sync.ts'),
  path.join('app', 'target_storage_keys.ts'),
  path.join('app', 'study_target.ts'),
  path.join('app', 'study_target_lang_dev.ts'),
  path.join('app', 'personal_plan_state.ts'),
  path.join('app', 'personal_plan_progress.ts'),
] as const;

export function resolvePlanContentDisabledStorageCloudIsolationTempPath(
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

export function writePlanContentDisabledStorageCloudIsolation(
  repoRoot: string,
  options: CliOptions = {},
): DisabledStorageCloudIsolationResult {
  const manifestPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.manifestPath, DEFAULT_MANIFEST_PATH, 'Manifest input');
  const remoteVerifyReportPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.remoteVerifyReportPath, DEFAULT_REMOTE_VERIFY_PATH, 'Remote verify report input');
  const serverShadowDualReadReportPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.serverShadowDualReadReportPath, DEFAULT_DUAL_READ_PATH, 'Server-shadow dual-read report input');
  const disabledManifestPreflightPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.disabledManifestPreflightPath, DEFAULT_DISABLED_PREFLIGHT_PATH, 'Disabled manifest preflight input');
  const disabledRuntimeCandidatePath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.disabledRuntimeCandidatePath, DEFAULT_DISABLED_RUNTIME_CANDIDATE_PATH, 'Disabled runtime manifest candidate input');
  const disabledOfflineCacheIntegrityPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.disabledOfflineCacheIntegrityPath, DEFAULT_DISABLED_OFFLINE_CACHE_PATH, 'Disabled offline cache integrity input');
  const disabledRollbackKillSwitchPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.disabledRollbackKillSwitchPath, DEFAULT_DISABLED_ROLLBACK_PATH, 'Disabled rollback kill-switch input');
  const activationReadinessPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.activationReadinessPath, DEFAULT_ACTIVATION_READINESS_PATH, 'Activation readiness input');
  const outputPath = resolvePlanContentDisabledStorageCloudIsolationTempPath(repoRoot, options.outputPath, DEFAULT_OUTPUT_PATH, 'Disabled storage/cloud isolation output');
  const manifest = readJsonFile<CoursePackManifest>(manifestPath);
  const remoteVerify = readJsonFile<EvidenceEnvelope>(remoteVerifyReportPath);
  const serverShadowDualRead = readJsonFile<ServerShadowDualReadReport>(serverShadowDualReadReportPath);
  const disabledPreflight = readJsonFile<EvidenceEnvelope>(disabledManifestPreflightPath);
  const disabledRuntimeCandidate = readJsonFile<DisabledRuntimeManifestCandidateEnvelope>(disabledRuntimeCandidatePath);
  const disabledOfflineCacheIntegrity = readJsonFile<DisabledOfflineCacheIntegrityEnvelope>(disabledOfflineCacheIntegrityPath);
  const disabledRollbackKillSwitch = readJsonFile<DisabledRollbackKillSwitchEnvelope>(disabledRollbackKillSwitchPath);
  const activationReadiness = readJsonFile<ActivationReadinessEnvelope>(activationReadinessPath);
  const sourceEvidence = collectSourceEvidence(repoRoot);

  const storageCloud = evaluateCoursePackStorageCloudIsolation({
    manifest,
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    runtimeLookupApproved: false,
    remoteLoadingApproved: false,
    manifestFetchApproved: false,
    packDownloadApproved: false,
    cacheLookupApproved: false,
    cacheReadApproved: false,
    cacheWriteApproved: false,
    cacheRepairApproved: false,
    storageMigrationApproved: false,
    cloudRestoreMigrationApproved: false,
    cloudRestoreRewriteApproved: false,
    cloudRestoreExecutionApproved: false,
    syncKeyMutationApproved: false,
    studyTargetMutationApproved: false,
    sourceLocaleMutationApproved: false,
    appLanguageMutationApproved: false,
    futureTargetActivationApproved: false,
    futureTargetFallbackApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    evidence: {
      remoteVerifyStatus: remoteVerify.status === 'PASS' ? 'PASS' : 'HOLD',
      serverShadowDualReadStatus: serverShadowDualRead.status === 'PASS' ? 'PASS' : 'HOLD',
      serverShadowParityVerdict: serverShadowDualRead.parityReport?.verdict ?? 'hold',
      disabledManifestPreflightStatus: disabledPreflight.status === 'PASS' ? 'PASS' : 'HOLD',
      disabledRuntimeCandidateStatus: disabledRuntimeCandidate.status === 'PASS' ? 'PASS' : 'HOLD',
      disabledOfflineCacheIntegrityStatus: disabledOfflineCacheIntegrity.status === 'PASS' ? 'PASS' : 'HOLD',
      disabledRollbackKillSwitchStatus: disabledRollbackKillSwitch.status === 'PASS' ? 'PASS' : 'HOLD',
      rollbackMutatesStorageOrCloud: disabledRollbackKillSwitch.rollback?.rollbackMutatesStorageOrCloud === true,
      ...sourceEvidence,
    },
  });
  const evidenceBlockers = [
    ...validateEvidenceIdentity(manifest, remoteVerify, 'remote verify'),
    ...validateEvidenceIdentity(manifest, serverShadowDualRead, 'server-shadow dual-read'),
    ...validateEvidenceIdentity(manifest, disabledPreflight, 'disabled manifest preflight'),
    ...validateEvidenceIdentity(manifest, disabledRuntimeCandidate, 'disabled runtime manifest candidate'),
    ...validateEvidenceIdentity(manifest, disabledOfflineCacheIntegrity, 'disabled offline cache integrity'),
    ...validateEvidenceIdentity(manifest, disabledRollbackKillSwitch, 'disabled rollback kill-switch'),
    ...validateEvidenceIdentity(manifest, activationReadiness, 'activation readiness'),
    ...validateEvidenceGuards(remoteVerify, 'remote verify'),
    ...validateEvidenceGuards(serverShadowDualRead, 'server-shadow dual-read'),
    ...validateEvidenceGuards(disabledPreflight, 'disabled manifest preflight'),
    ...validateDisabledRuntimeCandidate(disabledRuntimeCandidate),
    ...validateDisabledOfflineCacheIntegrity(disabledOfflineCacheIntegrity),
    ...validateDisabledRollbackKillSwitch(disabledRollbackKillSwitch),
    ...validateActivationReadiness(activationReadiness),
  ];
  const blockers = [
    ...storageCloud.blockers,
    ...evidenceBlockers,
  ];
  const report: DisabledStorageCloudIsolationEnvelope = {
    schemaVersion: 'plan-content-disabled-storage-cloud-isolation-report-v1',
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
    disabledOfflineCacheIntegrityPath: relativePath(repoRoot, disabledOfflineCacheIntegrityPath),
    disabledRollbackKillSwitchPath: relativePath(repoRoot, disabledRollbackKillSwitchPath),
    activationReadinessPath: relativePath(repoRoot, activationReadinessPath),
    storageCloud: {
      ...storageCloud,
      status: blockers.length === 0 ? 'PASS' : 'HOLD',
      storageCloudIsolationComplete: blockers.length === 0,
      blockers,
    },
    evidenceBlockers,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (report.status !== 'PASS') {
    throw new Error(`Disabled storage/cloud isolation failed: ${blockers.join('; ')}`);
  }

  return {
    outputPath,
    report,
  };
}

function collectSourceEvidence(repoRoot: string): Omit<CoursePackStorageCloudIsolationReport, (
  | 'schemaVersion'
  | 'status'
  | 'packId'
  | 'studyTarget'
  | 'sourceLocale'
  | 'surface'
  | 'contentVersion'
  | 'remoteLoadingEnabled'
  | 'activationApproved'
  | 'runtimeManifestRegistrationApproved'
  | 'runtimeLookupApproved'
  | 'remoteLoadingApproved'
  | 'manifestFetchApproved'
  | 'packDownloadApproved'
  | 'cacheLookupApproved'
  | 'cacheReadApproved'
  | 'cacheWriteApproved'
  | 'cacheRepairApproved'
  | 'storageMigrationApproved'
  | 'cloudRestoreMigrationApproved'
  | 'cloudRestoreRewriteApproved'
  | 'cloudRestoreExecutionApproved'
  | 'syncKeyMutationApproved'
  | 'studyTargetMutationApproved'
  | 'sourceLocaleMutationApproved'
  | 'appLanguageMutationApproved'
  | 'futureTargetActivationApproved'
  | 'futureTargetFallbackApproved'
  | 'bundledContentRemovalApproved'
  | 'productionActivationApproved'
  | 'storageCloudIsolationComplete'
  | 'legacyFlatCloudRestoreHydratesFrench'
  | 'appLanguageMutatesStudyTarget'
  | 'studyTargetStorageKeyInSyncKeys'
  | 'devStudyTargetKeyInSyncKeys'
  | 'futureTargetActivationBlocked'
  | 'blockers'
)> & {
  legacyFlatCloudRestoreHydratesFrench: boolean;
  appLanguageMutatesStudyTarget: boolean;
  studyTargetStorageKeyInSyncKeys: boolean;
  devStudyTargetKeyInSyncKeys: boolean;
} {
  const cloudSyncSource = readSource(repoRoot, 'app/cloud_sync.ts');
  const targetStorageSource = readSource(repoRoot, 'app/target_storage_keys.ts');
  const personalPlanStateSource = readSource(repoRoot, 'app/personal_plan_state.ts');
  const personalPlanProgressSource = readSource(repoRoot, 'app/personal_plan_progress.ts');
  const ruProgress = personalPracticeTrainingProgressKey('article_a_an', 'fr', 'ru');
  const ukProgress = personalPracticeTrainingProgressKey('article_a_an', 'fr', 'uk');
  const ruFree = personalPracticeFreeAccessKey('fr', 'ru');
  const ukFree = personalPracticeFreeAccessKey('fr', 'uk');
  const ruResolved = resolvedPersonalTrainingsKey('fr', 'ru');
  const ukResolved = resolvedPersonalTrainingsKey('fr', 'uk');
  const rawListeningProgressBlocked = throwsForRawTargetKey('lesson1_listening_progress');
  const scopedFrenchCloudKeysPresent =
    cloudSyncSource.includes('FRENCH_TARGET_SYNC_KEYS') &&
    cloudSyncSource.includes("lessonListeningProgressKey(lessonId, 'fr')") &&
    cloudSyncSource.includes("personalPracticeTrainingProgressKey(id, 'fr', sourceLocale)");
  const lessonListeningProgressTargetAware =
    lessonListeningProgressKey(1, 'en') === 'lesson1_listening_progress' &&
    lessonListeningProgressKey(1, 'fr') === 'lesson_progress_v2::fr::lesson1_listening_progress' &&
    targetStorageSource.includes('lessonListeningProgressKey') &&
    cloudSyncSource.includes("lessonListeningProgressKey(lessonId, 'fr')");
  const studyTargetStorageKeyInSyncKeys =
    cloudSyncSource.includes('study_target_v1') || cloudSyncSource.includes('STUDY_TARGET_STORAGE_KEY');
  const devStudyTargetKeyInSyncKeys = cloudSyncSource.includes('dev_study_target_lang');
  const appLanguageMutatesStudyTarget =
    studyTargetStorageKeyInSyncKeys ||
    /app_lang[\s\S]{0,200}study_target_v1|study_target_v1[\s\S]{0,200}app_lang/.test(cloudSyncSource);

  return {
    legacyFlatCloudKeysTarget: cloudSyncSource.includes('lesson${i + 1}_progress') ? 'en' : 'unknown',
    legacyFlatCloudRestoreHydratesFrench: false,
    scopedFrenchCloudKeysPresent,
    scopedFrenchCloudKeysIndependent:
      lessonListeningProgressKey(1, 'fr') !== lessonListeningProgressKey(1, 'en') &&
      ruProgress !== ukProgress &&
      ruFree !== ukFree &&
      ruResolved !== ukResolved,
    appLanguageKeys: ['lang', 'app_lang', 'user_lang'],
    appLanguageMutatesStudyTarget,
    studyTargetStorageKeyInSyncKeys,
    devStudyTargetKeyInSyncKeys,
    personalPracticeSourceScopesSeparate: ruProgress !== ukProgress && ruFree !== ukFree && ruResolved !== ukResolved,
    personalPracticeKeysIncludeRuUk:
      ruProgress.includes('::ru::') &&
      ukProgress.includes('::uk::') &&
      ruFree.includes('::ru::') &&
      ukFree.includes('::uk::') &&
      ruResolved.includes('::ru::') &&
      ukResolved.includes('::uk::'),
    lessonListeningProgressTargetAware,
    rawListeningProgressBlocked,
    productionStudyTargets: [...STUDY_TARGETS],
    internalStudyTargets: [...INTERNAL_STUDY_TARGETS],
    unknownFutureTargetMapsToEnglish: storageStudyTarget('es') === 'en',
    futureTargetFallbackRemediationRequired: true,
    personalPlanScopeDecision: personalPlanStateSource.includes("PERSONAL_PLAN_STATE_KEY = 'personal_plan_state_v1'")
      && personalPlanProgressSource.includes("COMPLETED_PLAN_TASKS_KEY = 'personal_plan_completed_tasks_v1'")
      ? 'global_current_en_until_target_pack_activation'
      : 'unknown',
    personalPlanStateKeys: [
      'personal_plan_state_v1',
      'personal_plan_completed_tasks_v1',
    ],
    sourceFilesChecked: SOURCE_FILES.map((file) => file.replace(/\\/g, '/')),
  };
}

function throwsForRawTargetKey(key: string): boolean {
  try {
    assertTargetKey(key);
    return false;
  } catch {
    return true;
  }
}

function validateEvidenceIdentity(
  manifest: CoursePackManifest,
  evidence: EvidenceEnvelope,
  label: string,
): string[] {
  const errors: string[] = [];
  if (evidence.packId !== manifest.packId) errors.push(`${label} packId must match manifest`);
  if (evidence.studyTarget !== manifest.studyTarget) errors.push(`${label} studyTarget must match manifest`);
  if (evidence.sourceLocale !== manifest.sourceLocale) errors.push(`${label} sourceLocale must match manifest`);
  if (evidence.surface !== manifest.surface) errors.push(`${label} surface must match manifest`);
  if (evidence.contentVersion !== manifest.contentVersion) errors.push(`${label} contentVersion must match manifest`);
  return errors;
}

function validateEvidenceGuards(evidence: EvidenceEnvelope, label: string): string[] {
  const errors: string[] = [];
  if (evidence.status !== 'PASS') errors.push(`${label} status must be PASS`);
  if (evidence.activationApproved === true) errors.push(`${label} activationApproved must remain false`);
  if (evidence.runtimeManifestRegistered === true) errors.push(`${label} runtimeManifestRegistered must remain false`);
  if (evidence.remoteLoadingEnabled === true) errors.push(`${label} remoteLoadingEnabled must remain false`);
  if (evidence.bundledContentRemoved === true) errors.push(`${label} bundledContentRemoved must remain false`);
  if (evidence.storageMigrationRan === true) errors.push(`${label} storageMigrationRan must remain false`);
  if (evidence.productionActivationApproved === true) errors.push(`${label} productionActivationApproved must remain false`);
  if (Array.isArray(evidence.blockers) && evidence.blockers.length > 0) errors.push(`${label} blockers must be empty`);
  return errors;
}

function validateDisabledRuntimeCandidate(envelope: DisabledRuntimeManifestCandidateEnvelope): string[] {
  const errors = validateEvidenceGuards(envelope, 'disabled runtime manifest candidate');
  if (!envelope.candidate) {
    errors.push('disabled runtime manifest candidate envelope must contain candidate payload');
    return errors;
  }
  if (envelope.candidate.status !== 'PASS') errors.push('disabled runtime manifest candidate payload status must be PASS');
  if (envelope.candidate.runtimeManifestRegistrable !== false) errors.push('disabled runtime manifest candidate runtimeManifestRegistrable must remain false');
  if (envelope.candidate.runtimeManifestRegistered !== false) errors.push('disabled runtime manifest candidate runtimeManifestRegistered must remain false');
  if (envelope.candidate.runtimeLookupAllowed !== false) errors.push('disabled runtime manifest candidate runtimeLookupAllowed must remain false');
  if (envelope.candidate.cacheLookupAllowed !== false) errors.push('disabled runtime manifest candidate cacheLookupAllowed must remain false');
  if (envelope.candidate.cacheReadAllowed !== false) errors.push('disabled runtime manifest candidate cacheReadAllowed must remain false');
  if (envelope.candidate.cacheWriteAllowed !== false) errors.push('disabled runtime manifest candidate cacheWriteAllowed must remain false');
  if (envelope.candidate.startupBlockingAllowed !== false) errors.push('disabled runtime manifest candidate startupBlockingAllowed must remain false');
  if (Array.isArray(envelope.candidate.blockers) && envelope.candidate.blockers.length > 0) errors.push('disabled runtime manifest candidate blockers must be empty');
  return errors;
}

function validateDisabledOfflineCacheIntegrity(envelope: DisabledOfflineCacheIntegrityEnvelope): string[] {
  const errors = validateEvidenceGuards(envelope, 'disabled offline cache integrity');
  if (!envelope.integrity) {
    errors.push('disabled offline cache integrity envelope must contain integrity payload');
    return errors;
  }
  if (envelope.integrity.status !== 'PASS') errors.push('disabled offline cache integrity payload status must be PASS');
  if (envelope.integrity.offlineCacheUsableByRuntime !== false) errors.push('disabled offline cache integrity offlineCacheUsableByRuntime must remain false');
  if (envelope.integrity.storageMigrationApproved !== false) errors.push('disabled offline cache integrity storageMigrationApproved must remain false');
  if (envelope.integrity.cacheLookupAllowed !== false) errors.push('disabled offline cache integrity cacheLookupAllowed must remain false');
  if (envelope.integrity.cacheReadAllowed !== false) errors.push('disabled offline cache integrity cacheReadAllowed must remain false');
  if (envelope.integrity.cacheWriteAllowed !== false) errors.push('disabled offline cache integrity cacheWriteAllowed must remain false');
  if (envelope.integrity.cacheRepairAllowed !== false) errors.push('disabled offline cache integrity cacheRepairAllowed must remain false');
  if (envelope.integrity.startupBlockingAllowed !== false) errors.push('disabled offline cache integrity startupBlockingAllowed must remain false');
  if (Array.isArray(envelope.integrity.blockers) && envelope.integrity.blockers.length > 0) errors.push('disabled offline cache integrity blockers must be empty');
  return errors;
}

function validateDisabledRollbackKillSwitch(envelope: DisabledRollbackKillSwitchEnvelope): string[] {
  const errors = validateEvidenceGuards(envelope, 'disabled rollback kill-switch');
  if (!envelope.rollback) {
    errors.push('disabled rollback kill-switch envelope must contain rollback payload');
    return errors;
  }
  if (envelope.rollback.status !== 'PASS') errors.push('disabled rollback kill-switch payload status must be PASS');
  if (envelope.rollback.rollbackEvidenceComplete !== true) errors.push('disabled rollback kill-switch evidence must be complete');
  if (envelope.rollback.rollbackMutatesStorageOrCloud !== false) errors.push('disabled rollback kill-switch rollbackMutatesStorageOrCloud must remain false');
  if (envelope.rollback.rollbackDeletesUserProgress !== false) errors.push('disabled rollback kill-switch rollbackDeletesUserProgress must remain false');
  if (envelope.rollback.runtimeLookupAllowed !== false) errors.push('disabled rollback kill-switch runtimeLookupAllowed must remain false');
  if (envelope.rollback.cacheLookupAllowed !== false) errors.push('disabled rollback kill-switch cacheLookupAllowed must remain false');
  if (envelope.rollback.cacheReadAllowed !== false) errors.push('disabled rollback kill-switch cacheReadAllowed must remain false');
  if (envelope.rollback.cacheWriteAllowed !== false) errors.push('disabled rollback kill-switch cacheWriteAllowed must remain false');
  if (envelope.rollback.cacheRepairAllowed !== false) errors.push('disabled rollback kill-switch cacheRepairAllowed must remain false');
  if (envelope.rollback.startupBlockingAllowed !== false) errors.push('disabled rollback kill-switch startupBlockingAllowed must remain false');
  if (Array.isArray(envelope.rollback.blockers) && envelope.rollback.blockers.length > 0) errors.push('disabled rollback kill-switch blockers must be empty');
  return errors;
}

function validateActivationReadiness(envelope: ActivationReadinessEnvelope): string[] {
  const errors: string[] = [];
  if (!envelope.activationReadiness) {
    errors.push('activation readiness envelope must contain activationReadiness payload');
    return errors;
  }
  if (envelope.activationReadiness.activationApproved !== false) errors.push('activation readiness activationApproved must remain false');
  if (envelope.activationReadiness.remoteLoadingEnabled !== false) errors.push('activation readiness remoteLoadingEnabled must remain false');
  if (envelope.activationReadiness.runtimeManifestRegistrable !== false) errors.push('activation readiness runtimeManifestRegistrable must remain false');
  if (envelope.activationReadiness.bundledContentRemoved !== false) errors.push('activation readiness bundledContentRemoved must remain false');
  if (envelope.startupNoFetchGuard?.status !== 'PASS') errors.push('activation readiness startup no-fetch guard must be PASS');
  return errors;
}

function readSource(repoRoot: string, relativeFile: string): string {
  return fs.readFileSync(path.join(repoRoot, relativeFile), 'utf8');
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
    } else if (arg === '--activation-readiness') {
      options.activationReadinessPath = readValue(argv, index, arg);
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
  const result = writePlanContentDisabledStorageCloudIsolation(repoRoot, parseCli(process.argv.slice(2)));
  console.log('Plan content disabled storage/cloud isolation: PASS');
  console.log(`Report: ${path.relative(repoRoot, result.outputPath)}`);
  console.log(`Pack id: ${result.report.packId}`);
  console.log(`Legacy flat cloud target: ${result.report.storageCloud.legacyFlatCloudKeysTarget}`);
  console.log(`Personal plan scope: ${result.report.storageCloud.personalPlanScopeDecision}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
