import { validateCoursePackManifest, type CoursePackManifest } from './course_pack_manifest';
import { COURSE_PACK_REMOTE_LOADING_ENABLED } from './course_pack_loader';

export const COURSE_PACK_STORAGE_CLOUD_ISOLATION_SCHEMA_VERSION = 'course-pack-storage-cloud-isolation-v1' as const;

export type CoursePackPersonalPlanScopeDecision =
  | 'global_current_en_until_target_pack_activation'
  | 'target_scoped_required_before_new_target_activation'
  | 'unknown';

export type CoursePackStorageCloudIsolationEvidence = {
  remoteVerifyStatus: 'PASS' | 'HOLD';
  serverShadowDualReadStatus: 'PASS' | 'HOLD';
  serverShadowParityVerdict: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  disabledManifestPreflightStatus: 'PASS' | 'HOLD';
  disabledRuntimeCandidateStatus: 'PASS' | 'HOLD';
  disabledOfflineCacheIntegrityStatus: 'PASS' | 'HOLD';
  disabledRollbackKillSwitchStatus: 'PASS' | 'HOLD';
  rollbackMutatesStorageOrCloud: boolean;
  legacyFlatCloudKeysTarget: 'en' | 'mixed' | 'unknown';
  legacyFlatCloudRestoreHydratesFrench: boolean;
  scopedFrenchCloudKeysPresent: boolean;
  scopedFrenchCloudKeysIndependent: boolean;
  appLanguageKeys: string[];
  appLanguageMutatesStudyTarget: boolean;
  studyTargetStorageKeyInSyncKeys: boolean;
  devStudyTargetKeyInSyncKeys: boolean;
  personalPracticeSourceScopesSeparate: boolean;
  personalPracticeKeysIncludeRuUk: boolean;
  lessonListeningProgressTargetAware: boolean;
  rawListeningProgressBlocked: boolean;
  productionStudyTargets: string[];
  internalStudyTargets: string[];
  unknownFutureTargetMapsToEnglish: boolean;
  futureTargetFallbackRemediationRequired: boolean;
  personalPlanScopeDecision: CoursePackPersonalPlanScopeDecision;
  personalPlanStateKeys: string[];
  sourceFilesChecked: string[];
};

export type CoursePackStorageCloudIsolationInput = {
  manifest: CoursePackManifest;
  activationApproved: boolean;
  runtimeManifestRegistrationApproved: boolean;
  runtimeLookupApproved: boolean;
  remoteLoadingApproved: boolean;
  manifestFetchApproved: boolean;
  packDownloadApproved: boolean;
  cacheLookupApproved: boolean;
  cacheReadApproved: boolean;
  cacheWriteApproved: boolean;
  cacheRepairApproved: boolean;
  storageMigrationApproved: boolean;
  cloudRestoreMigrationApproved: boolean;
  cloudRestoreRewriteApproved: boolean;
  cloudRestoreExecutionApproved: boolean;
  syncKeyMutationApproved: boolean;
  studyTargetMutationApproved: boolean;
  sourceLocaleMutationApproved: boolean;
  appLanguageMutationApproved: boolean;
  futureTargetActivationApproved: boolean;
  futureTargetFallbackApproved: boolean;
  bundledContentRemovalApproved: boolean;
  productionActivationApproved: boolean;
  evidence: CoursePackStorageCloudIsolationEvidence;
};

export type CoursePackStorageCloudIsolationReport = {
  schemaVersion: typeof COURSE_PACK_STORAGE_CLOUD_ISOLATION_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  remoteLoadingEnabled: false;
  activationApproved: false;
  runtimeManifestRegistrationApproved: false;
  runtimeLookupApproved: false;
  remoteLoadingApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheLookupApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  cloudRestoreMigrationApproved: false;
  cloudRestoreRewriteApproved: false;
  cloudRestoreExecutionApproved: false;
  syncKeyMutationApproved: false;
  studyTargetMutationApproved: false;
  sourceLocaleMutationApproved: false;
  appLanguageMutationApproved: false;
  futureTargetActivationApproved: false;
  futureTargetFallbackApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  storageCloudIsolationComplete: boolean;
  legacyFlatCloudKeysTarget: 'en' | 'mixed' | 'unknown';
  legacyFlatCloudRestoreHydratesFrench: false;
  scopedFrenchCloudKeysPresent: boolean;
  scopedFrenchCloudKeysIndependent: boolean;
  appLanguageKeys: string[];
  appLanguageMutatesStudyTarget: false;
  studyTargetStorageKeyInSyncKeys: false;
  devStudyTargetKeyInSyncKeys: false;
  personalPracticeSourceScopesSeparate: boolean;
  personalPracticeKeysIncludeRuUk: boolean;
  lessonListeningProgressTargetAware: boolean;
  rawListeningProgressBlocked: boolean;
  productionStudyTargets: string[];
  internalStudyTargets: string[];
  unknownFutureTargetMapsToEnglish: boolean;
  futureTargetActivationBlocked: true;
  futureTargetFallbackRemediationRequired: boolean;
  personalPlanScopeDecision: CoursePackPersonalPlanScopeDecision;
  personalPlanStateKeys: string[];
  sourceFilesChecked: string[];
  blockers: string[];
};

export function evaluateCoursePackStorageCloudIsolation(
  input: CoursePackStorageCloudIsolationInput,
): CoursePackStorageCloudIsolationReport {
  const blockers: string[] = [];
  const manifestValidation = validateCoursePackManifest(input.manifest);
  blockers.push(...manifestValidation.errors.map((error) => `manifest: ${error}`));

  if (COURSE_PACK_REMOTE_LOADING_ENABLED !== false) {
    blockers.push('COURSE_PACK_REMOTE_LOADING_ENABLED must remain false');
  }
  if (input.manifest.surface !== 'plan_content') {
    blockers.push('storage/cloud isolation is currently limited to plan_content');
  }

  const falseFlags: Array<[string, boolean]> = [
    ['activationApproved', input.activationApproved],
    ['runtimeManifestRegistrationApproved', input.runtimeManifestRegistrationApproved],
    ['runtimeLookupApproved', input.runtimeLookupApproved],
    ['remoteLoadingApproved', input.remoteLoadingApproved],
    ['manifestFetchApproved', input.manifestFetchApproved],
    ['packDownloadApproved', input.packDownloadApproved],
    ['cacheLookupApproved', input.cacheLookupApproved],
    ['cacheReadApproved', input.cacheReadApproved],
    ['cacheWriteApproved', input.cacheWriteApproved],
    ['cacheRepairApproved', input.cacheRepairApproved],
    ['storageMigrationApproved', input.storageMigrationApproved],
    ['cloudRestoreMigrationApproved', input.cloudRestoreMigrationApproved],
    ['cloudRestoreRewriteApproved', input.cloudRestoreRewriteApproved],
    ['cloudRestoreExecutionApproved', input.cloudRestoreExecutionApproved],
    ['syncKeyMutationApproved', input.syncKeyMutationApproved],
    ['studyTargetMutationApproved', input.studyTargetMutationApproved],
    ['sourceLocaleMutationApproved', input.sourceLocaleMutationApproved],
    ['appLanguageMutationApproved', input.appLanguageMutationApproved],
    ['futureTargetActivationApproved', input.futureTargetActivationApproved],
    ['futureTargetFallbackApproved', input.futureTargetFallbackApproved],
    ['bundledContentRemovalApproved', input.bundledContentRemovalApproved],
    ['productionActivationApproved', input.productionActivationApproved],
  ];
  for (const [label, value] of falseFlags) {
    if (value !== false) blockers.push(`${label} must remain false`);
  }

  if (input.evidence.remoteVerifyStatus !== 'PASS') {
    blockers.push('remote verification evidence must be PASS');
  }
  if (input.evidence.serverShadowDualReadStatus !== 'PASS') {
    blockers.push('server-shadow dual-read evidence must be PASS');
  }
  if (input.evidence.serverShadowParityVerdict !== 'shadow_parity_passed') {
    blockers.push('server-shadow parity verdict must be shadow_parity_passed');
  }
  if (input.evidence.disabledManifestPreflightStatus !== 'PASS') {
    blockers.push('disabled manifest preflight evidence must be PASS');
  }
  if (input.evidence.disabledRuntimeCandidateStatus !== 'PASS') {
    blockers.push('disabled runtime manifest candidate evidence must be PASS');
  }
  if (input.evidence.disabledOfflineCacheIntegrityStatus !== 'PASS') {
    blockers.push('disabled offline cache integrity evidence must be PASS');
  }
  if (input.evidence.disabledRollbackKillSwitchStatus !== 'PASS') {
    blockers.push('disabled rollback kill-switch evidence must be PASS');
  }
  if (input.evidence.rollbackMutatesStorageOrCloud !== false) {
    blockers.push('rollback must not mutate storage/cloud');
  }
  if (input.evidence.legacyFlatCloudKeysTarget !== 'en') {
    blockers.push('legacy flat cloud keys must be classified as English-only');
  }
  if (input.evidence.legacyFlatCloudRestoreHydratesFrench !== false) {
    blockers.push('legacy flat cloud restore must not hydrate French state');
  }
  if (input.evidence.scopedFrenchCloudKeysPresent !== true) {
    blockers.push('scoped French cloud keys must be present');
  }
  if (input.evidence.scopedFrenchCloudKeysIndependent !== true) {
    blockers.push('scoped French cloud keys must stay independent from English legacy keys');
  }
  if (input.evidence.appLanguageMutatesStudyTarget !== false) {
    blockers.push('app language keys must not mutate studyTarget');
  }
  if (input.evidence.studyTargetStorageKeyInSyncKeys !== false) {
    blockers.push('study_target_v1 must not be part of flat cloud SYNC_KEYS');
  }
  if (input.evidence.devStudyTargetKeyInSyncKeys !== false) {
    blockers.push('dev_study_target_lang must not be part of cloud SYNC_KEYS');
  }
  if (input.evidence.personalPracticeSourceScopesSeparate !== true) {
    blockers.push('personal practice sourceLocale scopes must remain separate');
  }
  if (input.evidence.personalPracticeKeysIncludeRuUk !== true) {
    blockers.push('personal practice keys must include both ru and uk source scopes');
  }
  if (input.evidence.lessonListeningProgressTargetAware !== true) {
    blockers.push('lesson listening progress must have target-aware key coverage');
  }
  if (input.evidence.rawListeningProgressBlocked !== true) {
    blockers.push('raw lesson listening progress keys must be blocked by target key guard');
  }
  if (input.evidence.productionStudyTargets.length !== 1 || input.evidence.productionStudyTargets[0] !== 'en') {
    blockers.push('production study targets must remain English-only for this disabled pack slice');
  }
  if (!input.evidence.internalStudyTargets.includes('fr')) {
    blockers.push('internal study targets must include fr for scoped evidence checks');
  }
  if (input.evidence.unknownFutureTargetMapsToEnglish && !input.evidence.futureTargetFallbackRemediationRequired) {
    blockers.push('unknown future target English fallback must be marked for remediation before future target activation');
  }
  if (input.evidence.personalPlanScopeDecision === 'unknown') {
    blockers.push('personal plan storage scope decision must be recorded');
  }
  if (input.evidence.personalPlanStateKeys.length === 0) {
    blockers.push('personal plan state keys must be listed in the storage/cloud decision');
  }
  if (input.evidence.sourceFilesChecked.length === 0) {
    blockers.push('storage/cloud source files must be checked');
  }

  return {
    schemaVersion: COURSE_PACK_STORAGE_CLOUD_ISOLATION_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    packId: input.manifest.packId,
    studyTarget: input.manifest.studyTarget,
    sourceLocale: input.manifest.sourceLocale,
    surface: input.manifest.surface,
    contentVersion: input.manifest.contentVersion,
    remoteLoadingEnabled: false,
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
    storageCloudIsolationComplete: blockers.length === 0,
    legacyFlatCloudKeysTarget: input.evidence.legacyFlatCloudKeysTarget,
    legacyFlatCloudRestoreHydratesFrench: false,
    scopedFrenchCloudKeysPresent: input.evidence.scopedFrenchCloudKeysPresent,
    scopedFrenchCloudKeysIndependent: input.evidence.scopedFrenchCloudKeysIndependent,
    appLanguageKeys: [...input.evidence.appLanguageKeys],
    appLanguageMutatesStudyTarget: false,
    studyTargetStorageKeyInSyncKeys: false,
    devStudyTargetKeyInSyncKeys: false,
    personalPracticeSourceScopesSeparate: input.evidence.personalPracticeSourceScopesSeparate,
    personalPracticeKeysIncludeRuUk: input.evidence.personalPracticeKeysIncludeRuUk,
    lessonListeningProgressTargetAware: input.evidence.lessonListeningProgressTargetAware,
    rawListeningProgressBlocked: input.evidence.rawListeningProgressBlocked,
    productionStudyTargets: [...input.evidence.productionStudyTargets],
    internalStudyTargets: [...input.evidence.internalStudyTargets],
    unknownFutureTargetMapsToEnglish: input.evidence.unknownFutureTargetMapsToEnglish,
    futureTargetActivationBlocked: true,
    futureTargetFallbackRemediationRequired: input.evidence.futureTargetFallbackRemediationRequired,
    personalPlanScopeDecision: input.evidence.personalPlanScopeDecision,
    personalPlanStateKeys: [...input.evidence.personalPlanStateKeys],
    sourceFilesChecked: [...input.evidence.sourceFilesChecked],
    blockers,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackStorageCloudIsolationRouteShim() {
  return null;
}
