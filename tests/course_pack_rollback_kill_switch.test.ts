import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateDisabledCoursePackRollbackKillSwitch,
  type CoursePackDisabledRollbackKillSwitchInput,
} from '../app/course_pack_rollback_kill_switch';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.plan_content.staging.shadow.rollback.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: 'staging.shadow.rollback.test',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-27T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function validInput(overrides: Partial<CoursePackDisabledRollbackKillSwitchInput> = {}): CoursePackDisabledRollbackKillSwitchInput {
  return {
    manifest: overrides.manifest ?? validManifest(),
    rollbackMode: 'bundled_compatibility',
    rollbackForcesBundledCompatibility: true,
    rollbackRequiresAppUpdate: false,
    rollbackDeletesUserProgress: false,
    rollbackMutatesStorageOrCloud: false,
    rollbackDownloadsPack: false,
    rollbackReadsCache: false,
    rollbackWritesCache: false,
    rollbackRepairsCache: false,
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
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    evidence: {
      remoteVerifyStatus: 'PASS',
      serverShadowDualReadStatus: 'PASS',
      serverShadowParityVerdict: 'shadow_parity_passed',
      disabledManifestPreflightStatus: 'PASS',
      disabledRuntimeCandidateStatus: 'PASS',
      disabledOfflineCacheIntegrityStatus: 'PASS',
      offlineCacheUsableByRuntime: false,
      runtimeManifestRegistrable: false,
      activationReadinessStatus: 'HOLD',
    },
    ...overrides,
  };
}

describe('course pack disabled rollback kill-switch', () => {
  it('passes rollback evidence while keeping runtime, cache and storage untouched', () => {
    const report = evaluateDisabledCoursePackRollbackKillSwitch(validInput());

    expect(report).toMatchObject({
      schemaVersion: 'course-pack-disabled-rollback-kill-switch-v1',
      status: 'PASS',
      rollbackEvidenceComplete: true,
      rollbackMode: 'bundled_compatibility',
      rollbackForcesBundledCompatibility: true,
      rollbackRequiresAppUpdate: false,
      rollbackDeletesUserProgress: false,
      rollbackMutatesStorageOrCloud: false,
      rollbackDownloadsPack: false,
      rollbackReadsCache: false,
      rollbackWritesCache: false,
      rollbackRepairsCache: false,
      runtimeManifestRegistered: false,
      runtimeLookupAllowed: false,
      cacheLookupAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      cacheRepairAllowed: false,
      startupBlockingAllowed: false,
      bundledCompatibilityRollbackAvailable: true,
      missingWithoutDownloadRollbackAvailable: true,
      blockers: [],
    });
  });

  it('fails closed when rollback would mutate progress, cache, storage or runtime activation', () => {
    const report = evaluateDisabledCoursePackRollbackKillSwitch(validInput({
      rollbackMode: 'missing_without_download',
      rollbackForcesBundledCompatibility: false,
      rollbackRequiresAppUpdate: true,
      rollbackDeletesUserProgress: true,
      rollbackMutatesStorageOrCloud: true,
      rollbackDownloadsPack: true,
      rollbackReadsCache: true,
      rollbackWritesCache: true,
      rollbackRepairsCache: true,
      activationApproved: true,
      runtimeManifestRegistrationApproved: true,
      runtimeLookupApproved: true,
      remoteLoadingApproved: true,
      manifestFetchApproved: true,
      packDownloadApproved: true,
      cacheLookupApproved: true,
      cacheReadApproved: true,
      cacheWriteApproved: true,
      cacheRepairApproved: true,
      storageMigrationApproved: true,
      bundledContentRemovalApproved: true,
      productionActivationApproved: true,
      evidence: {
        remoteVerifyStatus: 'HOLD',
        serverShadowDualReadStatus: 'HOLD',
        serverShadowParityVerdict: 'hold',
        disabledManifestPreflightStatus: 'HOLD',
        disabledRuntimeCandidateStatus: 'HOLD',
        disabledOfflineCacheIntegrityStatus: 'HOLD',
        offlineCacheUsableByRuntime: true,
        runtimeManifestRegistrable: true,
        activationReadinessStatus: 'HOLD',
      },
    }));

    expect(report.status).toBe('HOLD');
    expect(report.rollbackEvidenceComplete).toBe(false);
    expect(report.runtimeLookupAllowed).toBe(false);
    expect(report.cacheReadAllowed).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'rollbackMode must be bundled_compatibility for this staged pack',
      'rollbackForcesBundledCompatibility must be true',
      'rollbackRequiresAppUpdate must remain false',
      'rollbackDeletesUserProgress must remain false',
      'rollbackMutatesStorageOrCloud must remain false',
      'rollbackDownloadsPack must remain false',
      'rollbackReadsCache must remain false',
      'rollbackWritesCache must remain false',
      'rollbackRepairsCache must remain false',
      'activationApproved must remain false',
      'runtimeManifestRegistrationApproved must remain false',
      'runtimeLookupApproved must remain false',
      'remoteLoadingApproved must remain false',
      'manifestFetchApproved must remain false',
      'packDownloadApproved must remain false',
      'cacheLookupApproved must remain false',
      'cacheReadApproved must remain false',
      'cacheWriteApproved must remain false',
      'cacheRepairApproved must remain false',
      'storageMigrationApproved must remain false',
      'bundledContentRemovalApproved must remain false',
      'productionActivationApproved must remain false',
      'remote verification evidence must be PASS',
      'server-shadow dual-read evidence must be PASS',
      'server-shadow parity verdict must be shadow_parity_passed',
      'disabled manifest preflight evidence must be PASS',
      'disabled runtime manifest candidate evidence must be PASS',
      'disabled offline cache integrity evidence must be PASS',
      'offlineCacheUsableByRuntime must remain false',
      'runtimeManifestRegistrable must remain false',
    ]));
  });

  it('rejects non-plan-content manifests for this disabled rollback slice', () => {
    const report = evaluateDisabledCoursePackRollbackKillSwitch(validInput({
      manifest: validManifest({ surface: 'quiz' }),
    }));

    expect(report.status).toBe('HOLD');
    expect(report.blockers).toContain('disabled rollback kill-switch is currently limited to plan_content');
  });

  it('does not connect rollback evidence to startup, network, storage or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_rollback_kill_switch.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/\b(writeFile|mkdir|Remove-Item|unlink|rmdir)\b|fs\.rm|delete\s*\(/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_rollback_kill_switch|CoursePackRollbackKillSwitch|evaluateDisabledCoursePackRollbackKillSwitch/i);
    }
  });
});
