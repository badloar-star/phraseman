import fs from 'fs';
import path from 'path';

import { buildCoursePackCacheKey, COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import type { CoursePackDisabledManifestPreflightReport } from '../app/course_pack_manifest_registry_preflight';
import {
  evaluateDisabledCoursePackRuntimeManifestCandidate,
  type CoursePackDisabledRuntimeManifestCandidateInput,
} from '../app/course_pack_runtime_manifest_candidate';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.plan_content.staging.shadow.runtime.candidate.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: 'staging.shadow.runtime.candidate.test',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-27T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function validPreflight(manifest = validManifest()): CoursePackDisabledManifestPreflightReport {
  const cacheKey = buildCoursePackCacheKey(manifest);
  return {
    schemaVersion: 'course-pack-disabled-manifest-preflight-v1',
    status: 'PASS',
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: manifest.surface,
    contentVersion: manifest.contentVersion,
    cacheKey,
    expectedCacheKey: cacheKey,
    runtimeContractVersion: 'course-pack-disabled-runtime-contract-v1',
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
  };
}

function validInput(overrides: Partial<CoursePackDisabledRuntimeManifestCandidateInput> = {}): CoursePackDisabledRuntimeManifestCandidateInput {
  const manifest = overrides.manifest ?? validManifest();
  return {
    manifest,
    disabledManifestPreflight: validPreflight(manifest),
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    runtimeLookupApproved: false,
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
    },
    ...overrides,
  };
}

describe('course pack disabled runtime manifest candidate', () => {
  it('accepts a complete evidence bundle while keeping the candidate non-registrable', () => {
    const report = evaluateDisabledCoursePackRuntimeManifestCandidate(validInput());

    expect(report).toMatchObject({
      schemaVersion: 'course-pack-disabled-runtime-manifest-candidate-v1',
      status: 'PASS',
      evidenceBundleComplete: true,
      activationApproved: false,
      runtimeManifestRegistrationApproved: false,
      runtimeLookupApproved: false,
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheLookupApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      runtimeManifestRegistrable: false,
      runtimeManifestRegistered: false,
      runtimeLookupAllowed: false,
      cacheLookupAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      startupBlockingAllowed: false,
      bundledCompatibilityRollbackRequired: true,
      explicitActivationGateRequired: true,
      blockers: [],
    });
  });

  it('fails closed when registration, runtime lookup or cache permissions are requested', () => {
    const report = evaluateDisabledCoursePackRuntimeManifestCandidate(validInput({
      runtimeManifestRegistrationApproved: true,
      runtimeLookupApproved: true,
      manifestFetchApproved: true,
      packDownloadApproved: true,
      cacheLookupApproved: true,
      cacheReadApproved: true,
      cacheWriteApproved: true,
      evidence: {
        remoteVerifyStatus: 'PASS',
        serverShadowDualReadStatus: 'PASS',
        serverShadowParityVerdict: 'hold',
        disabledManifestPreflightStatus: 'HOLD',
      },
    }));

    expect(report.status).toBe('HOLD');
    expect(report.evidenceBundleComplete).toBe(false);
    expect(report.runtimeManifestRegistrable).toBe(false);
    expect(report.runtimeLookupAllowed).toBe(false);
    expect(report.cacheLookupAllowed).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'runtimeManifestRegistrationApproved must remain false',
      'runtimeLookupApproved must remain false',
      'manifestFetchApproved must remain false',
      'packDownloadApproved must remain false',
      'cacheLookupApproved must remain false',
      'cacheReadApproved must remain false',
      'cacheWriteApproved must remain false',
      'server-shadow parity verdict must be shadow_parity_passed',
      'disabled manifest preflight evidence must be PASS',
    ]));
  });

  it('fails closed if disabled preflight itself becomes runtime-readable', () => {
    const manifest = validManifest();
    const preflight = {
      ...validPreflight(manifest),
      cacheMetadataReadableByRuntime: true,
    } as unknown as CoursePackDisabledManifestPreflightReport;

    const report = evaluateDisabledCoursePackRuntimeManifestCandidate(validInput({
      manifest,
      disabledManifestPreflight: preflight,
    }));

    expect(report.status).toBe('HOLD');
    expect(report.blockers).toContain('disabled preflight cacheMetadataReadableByRuntime must remain false');
  });

  it('does not connect candidate evaluation to startup, network, storage or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_runtime_manifest_candidate.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/writeFile|mkdir|Remove-Item|delete|unlink|rmdir/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_runtime_manifest_candidate|CoursePackRuntimeManifestCandidate|evaluateDisabledCoursePackRuntimeManifestCandidate/i);
    }
  });
});
