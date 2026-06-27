import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateCoursePackStorageCloudIsolation,
  type CoursePackStorageCloudIsolationInput,
} from '../app/course_pack_storage_cloud_isolation';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.plan_content.staging.shadow.storage-cloud.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: 'staging.shadow.storage-cloud.test',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-27T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function validInput(overrides: Partial<CoursePackStorageCloudIsolationInput> = {}): CoursePackStorageCloudIsolationInput {
  return {
    manifest: overrides.manifest ?? validManifest(),
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
      remoteVerifyStatus: 'PASS',
      serverShadowDualReadStatus: 'PASS',
      serverShadowParityVerdict: 'shadow_parity_passed',
      disabledManifestPreflightStatus: 'PASS',
      disabledRuntimeCandidateStatus: 'PASS',
      disabledOfflineCacheIntegrityStatus: 'PASS',
      disabledRollbackKillSwitchStatus: 'PASS',
      rollbackMutatesStorageOrCloud: false,
      legacyFlatCloudKeysTarget: 'en',
      legacyFlatCloudRestoreHydratesFrench: false,
      scopedFrenchCloudKeysPresent: true,
      scopedFrenchCloudKeysIndependent: true,
      appLanguageKeys: ['lang', 'app_lang', 'user_lang'],
      appLanguageMutatesStudyTarget: false,
      studyTargetStorageKeyInSyncKeys: false,
      devStudyTargetKeyInSyncKeys: false,
      personalPracticeSourceScopesSeparate: true,
      personalPracticeKeysIncludeRuUk: true,
      lessonListeningProgressTargetAware: true,
      rawListeningProgressBlocked: true,
      productionStudyTargets: ['en'],
      internalStudyTargets: ['en', 'fr'],
      unknownFutureTargetMapsToEnglish: true,
      futureTargetFallbackRemediationRequired: true,
      personalPlanScopeDecision: 'global_current_en_until_target_pack_activation',
      personalPlanStateKeys: [
        'personal_plan_state_v1',
        'personal_plan_completed_tasks_v1',
      ],
      sourceFilesChecked: [
        'app/cloud_sync.ts',
        'app/target_storage_keys.ts',
        'app/study_target.ts',
      ],
    },
    ...overrides,
  };
}

describe('course pack storage/cloud isolation', () => {
  it('passes when storage/cloud state is classified and all migration/mutation paths stay disabled', () => {
    const report = evaluateCoursePackStorageCloudIsolation(validInput());

    expect(report).toMatchObject({
      schemaVersion: 'course-pack-storage-cloud-isolation-v1',
      status: 'PASS',
      storageCloudIsolationComplete: true,
      legacyFlatCloudKeysTarget: 'en',
      legacyFlatCloudRestoreHydratesFrench: false,
      scopedFrenchCloudKeysPresent: true,
      scopedFrenchCloudKeysIndependent: true,
      appLanguageMutatesStudyTarget: false,
      studyTargetStorageKeyInSyncKeys: false,
      devStudyTargetKeyInSyncKeys: false,
      personalPracticeSourceScopesSeparate: true,
      personalPracticeKeysIncludeRuUk: true,
      lessonListeningProgressTargetAware: true,
      rawListeningProgressBlocked: true,
      futureTargetActivationApproved: false,
      futureTargetFallbackApproved: false,
      futureTargetActivationBlocked: true,
      futureTargetFallbackRemediationRequired: true,
      blockers: [],
    });
  });

  it('fails closed for mixed legacy restore, language-target mutation, storage migration, and unsafe future target fallback', () => {
    const report = evaluateCoursePackStorageCloudIsolation(validInput({
      activationApproved: true,
      storageMigrationApproved: true,
      cloudRestoreMigrationApproved: true,
      cloudRestoreRewriteApproved: true,
      cloudRestoreExecutionApproved: true,
      syncKeyMutationApproved: true,
      studyTargetMutationApproved: true,
      sourceLocaleMutationApproved: true,
      appLanguageMutationApproved: true,
      futureTargetActivationApproved: true,
      futureTargetFallbackApproved: true,
      productionActivationApproved: true,
      evidence: {
        ...validInput().evidence,
        remoteVerifyStatus: 'HOLD',
        serverShadowDualReadStatus: 'HOLD',
        serverShadowParityVerdict: 'hold',
        disabledManifestPreflightStatus: 'HOLD',
        disabledRuntimeCandidateStatus: 'HOLD',
        disabledOfflineCacheIntegrityStatus: 'HOLD',
        disabledRollbackKillSwitchStatus: 'HOLD',
        rollbackMutatesStorageOrCloud: true,
        legacyFlatCloudKeysTarget: 'mixed',
        legacyFlatCloudRestoreHydratesFrench: true,
        scopedFrenchCloudKeysPresent: false,
        scopedFrenchCloudKeysIndependent: false,
        appLanguageMutatesStudyTarget: true,
        studyTargetStorageKeyInSyncKeys: true,
        devStudyTargetKeyInSyncKeys: true,
        personalPracticeSourceScopesSeparate: false,
        personalPracticeKeysIncludeRuUk: false,
        lessonListeningProgressTargetAware: false,
        rawListeningProgressBlocked: false,
        productionStudyTargets: ['en', 'fr'],
        internalStudyTargets: ['en'],
        futureTargetFallbackRemediationRequired: false,
        personalPlanScopeDecision: 'unknown',
        personalPlanStateKeys: [],
        sourceFilesChecked: [],
      },
    }));

    expect(report.status).toBe('HOLD');
    expect(report.storageCloudIsolationComplete).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'activationApproved must remain false',
      'storageMigrationApproved must remain false',
      'cloudRestoreMigrationApproved must remain false',
      'cloudRestoreRewriteApproved must remain false',
      'cloudRestoreExecutionApproved must remain false',
      'syncKeyMutationApproved must remain false',
      'studyTargetMutationApproved must remain false',
      'sourceLocaleMutationApproved must remain false',
      'appLanguageMutationApproved must remain false',
      'futureTargetActivationApproved must remain false',
      'futureTargetFallbackApproved must remain false',
      'productionActivationApproved must remain false',
      'remote verification evidence must be PASS',
      'server-shadow dual-read evidence must be PASS',
      'server-shadow parity verdict must be shadow_parity_passed',
      'disabled manifest preflight evidence must be PASS',
      'disabled runtime manifest candidate evidence must be PASS',
      'disabled offline cache integrity evidence must be PASS',
      'disabled rollback kill-switch evidence must be PASS',
      'rollback must not mutate storage/cloud',
      'legacy flat cloud keys must be classified as English-only',
      'legacy flat cloud restore must not hydrate French state',
      'scoped French cloud keys must be present',
      'scoped French cloud keys must stay independent from English legacy keys',
      'app language keys must not mutate studyTarget',
      'study_target_v1 must not be part of flat cloud SYNC_KEYS',
      'dev_study_target_lang must not be part of cloud SYNC_KEYS',
      'personal practice sourceLocale scopes must remain separate',
      'personal practice keys must include both ru and uk source scopes',
      'lesson listening progress must have target-aware key coverage',
      'raw lesson listening progress keys must be blocked by target key guard',
      'production study targets must remain English-only for this disabled pack slice',
      'internal study targets must include fr for scoped evidence checks',
      'unknown future target English fallback must be marked for remediation before future target activation',
      'personal plan storage scope decision must be recorded',
      'personal plan state keys must be listed in the storage/cloud decision',
      'storage/cloud source files must be checked',
    ]));
  });

  it('does not connect isolation evidence to startup, network, storage, or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_storage_cloud_isolation.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/\b(writeFile|mkdir|Remove-Item|unlink|rmdir)\b|fs\.rm|delete\s*\(/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_storage_cloud_isolation|CoursePackStorageCloudIsolation|evaluateCoursePackStorageCloudIsolation/i);
    }
  });
});
