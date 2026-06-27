import fs from 'fs';
import path from 'path';

import { buildCoursePackCacheKey, COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import {
  evaluateDisabledCoursePackManifestPreflight,
  type CoursePackDisabledManifestPreflightInput,
} from '../app/course_pack_manifest_registry_preflight';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.plan_content.staging.shadow.preflight.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: 'staging.shadow.preflight.test',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-27T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function validInput(overrides: Partial<CoursePackDisabledManifestPreflightInput> = {}): CoursePackDisabledManifestPreflightInput {
  const manifest = overrides.manifest ?? validManifest();
  return {
    manifest,
    cacheKey: buildCoursePackCacheKey(manifest),
    serverShadowOnly: true,
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    manifestFetchApproved: false,
    packDownloadApproved: false,
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
    },
    ...overrides,
  };
}

describe('course pack disabled manifest registry/cache preflight', () => {
  it('passes shadow manifest metadata while keeping runtime and cache access disabled', () => {
    const report = evaluateDisabledCoursePackManifestPreflight(validInput());

    expect(report).toMatchObject({
      schemaVersion: 'course-pack-disabled-manifest-preflight-v1',
      status: 'PASS',
      surface: 'plan_content',
      remoteLoadingEnabled: false,
      serverShadowOnly: true,
      activationApproved: false,
      runtimeManifestRegistrationApproved: false,
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      cacheRepairApproved: false,
      storageMigrationApproved: false,
      bundledContentRemovalApproved: false,
      productionActivationApproved: false,
      registryEntryAllowed: false,
      cacheMetadataReadableByRuntime: false,
      cacheMetadataWritableByRuntime: false,
      startupBlockingAllowed: false,
      offlineFallbackRequired: true,
      blockers: [],
    });
    expect(report.expectedCacheKey).toBe(report.cacheKey);
  });

  it('fails closed when cache key, evidence or runtime permissions are unsafe', () => {
    const report = evaluateDisabledCoursePackManifestPreflight(validInput({
      cacheKey: 'wrong/cache/key',
      activationApproved: true,
      runtimeManifestRegistrationApproved: true,
      manifestFetchApproved: true,
      packDownloadApproved: true,
      cacheReadApproved: true,
      cacheWriteApproved: true,
      cacheRepairApproved: true,
      evidence: {
        remoteVerifyStatus: 'HOLD',
        serverShadowDualReadStatus: 'HOLD',
        serverShadowParityVerdict: 'hold',
      },
    }));

    expect(report.status).toBe('HOLD');
    expect(report.activationApproved).toBe(false);
    expect(report.runtimeManifestRegistrationApproved).toBe(false);
    expect(report.cacheReadApproved).toBe(false);
    expect(report.cacheWriteApproved).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'cacheKey must match manifest-derived cache key',
      'activationApproved must remain false',
      'runtimeManifestRegistrationApproved must remain false',
      'manifestFetchApproved must remain false',
      'packDownloadApproved must remain false',
      'cacheReadApproved must remain false',
      'cacheWriteApproved must remain false',
      'cacheRepairApproved must remain false',
      'remote verification evidence must be PASS',
      'server-shadow dual-read evidence must be PASS',
      'server-shadow parity verdict must be shadow_parity_passed',
    ]));
  });

  it('rejects non-plan-content manifests for this preflight slice', () => {
    const report = evaluateDisabledCoursePackManifestPreflight(validInput({
      manifest: validManifest({ surface: 'quiz' }),
      cacheKey: buildCoursePackCacheKey(validManifest({ surface: 'quiz' })),
    }));

    expect(report.status).toBe('HOLD');
    expect(report.blockers).toContain('disabled manifest preflight is currently limited to plan_content');
  });

  it('does not connect the preflight contract to startup, network, storage or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_manifest_registry_preflight.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/writeFile|mkdir|Remove-Item|delete|unlink|rmdir/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_manifest_registry_preflight|CoursePackManifestRegistryPreflight|evaluateDisabledCoursePackManifestPreflight/i);
    }
  });
});
