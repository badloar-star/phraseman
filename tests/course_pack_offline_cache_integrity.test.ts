import fs from 'fs';
import path from 'path';

import { buildCoursePackCacheKey, COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateDisabledCoursePackOfflineCacheIntegrity,
  type CoursePackDisabledOfflineCacheIntegrityInput,
} from '../app/course_pack_offline_cache_integrity';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.plan_content.staging.shadow.offline.cache.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: 'staging.shadow.offline.cache.test',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-27T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function validInput(overrides: Partial<CoursePackDisabledOfflineCacheIntegrityInput> = {}): CoursePackDisabledOfflineCacheIntegrityInput {
  const manifest = overrides.manifest ?? validManifest();
  return {
    manifest,
    cacheKey: buildCoursePackCacheKey(manifest),
    activationApproved: false,
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
      runtimeManifestRegistrable: false,
      expectedObjectCount: 551,
      foundObjectCount: 551,
      hashCheckedCount: 551,
      missingObjectCount: 0,
      sizeMismatchCount: 0,
      sha256MismatchCount: 0,
    },
    ...overrides,
  };
}

describe('course pack disabled offline cache integrity', () => {
  it('passes complete cache identity evidence while keeping runtime cache unusable', () => {
    const report = evaluateDisabledCoursePackOfflineCacheIntegrity(validInput());

    expect(report).toMatchObject({
      schemaVersion: 'course-pack-disabled-offline-cache-integrity-v1',
      status: 'PASS',
      cacheIntegrityEvidenceComplete: true,
      remoteLoadingEnabled: false,
      activationApproved: false,
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheLookupApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      cacheRepairApproved: false,
      storageMigrationApproved: false,
      bundledContentRemovalApproved: false,
      productionActivationApproved: false,
      offlineCacheUsableByRuntime: false,
      cacheLookupAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      cacheRepairAllowed: false,
      startupBlockingAllowed: false,
      expectedObjectCount: 551,
      foundObjectCount: 551,
      hashCheckedCount: 551,
      missingObjectCount: 0,
      sizeMismatchCount: 0,
      sha256MismatchCount: 0,
      blockers: [],
    });
    expect(report.expectedCacheKey).toBe(report.cacheKey);
  });

  it('fails closed when counts, upstream evidence or cache permissions are unsafe', () => {
    const report = evaluateDisabledCoursePackOfflineCacheIntegrity(validInput({
      cacheKey: 'wrong/cache/key',
      activationApproved: true,
      manifestFetchApproved: true,
      packDownloadApproved: true,
      cacheLookupApproved: true,
      cacheReadApproved: true,
      cacheWriteApproved: true,
      cacheRepairApproved: true,
      evidence: {
        remoteVerifyStatus: 'HOLD',
        serverShadowDualReadStatus: 'HOLD',
        serverShadowParityVerdict: 'hold',
        disabledManifestPreflightStatus: 'HOLD',
        disabledRuntimeCandidateStatus: 'HOLD',
        runtimeManifestRegistrable: true,
        expectedObjectCount: 551,
        foundObjectCount: 550,
        hashCheckedCount: 549,
        missingObjectCount: 1,
        sizeMismatchCount: 1,
        sha256MismatchCount: 1,
      },
    }));

    expect(report.status).toBe('HOLD');
    expect(report.cacheIntegrityEvidenceComplete).toBe(false);
    expect(report.offlineCacheUsableByRuntime).toBe(false);
    expect(report.cacheReadAllowed).toBe(false);
    expect(report.cacheWriteAllowed).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'cacheKey must match manifest-derived cache key',
      'activationApproved must remain false',
      'manifestFetchApproved must remain false',
      'packDownloadApproved must remain false',
      'cacheLookupApproved must remain false',
      'cacheReadApproved must remain false',
      'cacheWriteApproved must remain false',
      'cacheRepairApproved must remain false',
      'remote verification evidence must be PASS',
      'server-shadow dual-read evidence must be PASS',
      'server-shadow parity verdict must be shadow_parity_passed',
      'disabled manifest preflight evidence must be PASS',
      'disabled runtime manifest candidate evidence must be PASS',
      'runtimeManifestRegistrable must remain false',
      'foundObjectCount must match expectedObjectCount',
      'hashCheckedCount must match expectedObjectCount',
      'missingObjectCount must be zero',
      'sizeMismatchCount must be zero',
      'sha256MismatchCount must be zero',
    ]));
  });

  it('rejects non-plan-content manifests for this disabled cache slice', () => {
    const manifest = validManifest({ surface: 'quiz' });
    const report = evaluateDisabledCoursePackOfflineCacheIntegrity(validInput({
      manifest,
      cacheKey: buildCoursePackCacheKey(manifest),
    }));

    expect(report.status).toBe('HOLD');
    expect(report.blockers).toContain('disabled offline cache integrity is currently limited to plan_content');
  });

  it('does not connect cache integrity evaluation to startup, network, storage or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_offline_cache_integrity.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/writeFile|mkdir|Remove-Item|delete|unlink|rmdir/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_offline_cache_integrity|CoursePackOfflineCacheIntegrity|evaluateDisabledCoursePackOfflineCacheIntegrity/i);
    }
  });
});
