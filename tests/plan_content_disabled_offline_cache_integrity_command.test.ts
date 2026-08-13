import fs from 'fs';
import path from 'path';

import { buildCoursePackCacheKey, COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import { writePlanContentDisabledOfflineCacheIntegrity } from '../scripts/plan_content_disabled_offline_cache_integrity';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/disabled-offline-cache-integrity';
const MANIFEST_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/manifest.json`;
const REMOTE_VERIFY_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-remote-verify.json`;
const DUAL_READ_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const DISABLED_PREFLIGHT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-manifest-registry-preflight.json`;
const DISABLED_RUNTIME_CANDIDATE_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-runtime-manifest-candidate.json`;
const ACTIVATION_READINESS_RELATIVE = `${RUN_ROOT_RELATIVE}/activation-readiness-blocker-report.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-offline-cache-integrity.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.disabled.offline.cache.test';
const CONTENT_VERSION = 'staging.shadow.disabled.offline.cache.test';

type DisabledOfflineCacheIntegrityReport = {
  status: string;
  integrity: {
    status: string;
    cacheIntegrityEvidenceComplete: boolean;
    offlineCacheUsableByRuntime: boolean;
    cacheLookupAllowed: boolean;
    cacheReadAllowed: boolean;
    cacheWriteAllowed: boolean;
    cacheRepairAllowed: boolean;
    expectedObjectCount: number;
    foundObjectCount: number;
    hashCheckedCount: number;
    missingObjectCount: number;
    sizeMismatchCount: number;
    sha256MismatchCount: number;
    blockers: string[];
  };
  evidenceBlockers: string[];
  blockers: string[];
};

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: PACK_ID,
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: GENERATED_AT,
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

function writeInputs(overrides: {
  manifest?: CoursePackManifest;
  remoteVerify?: Record<string, unknown>;
  dualRead?: Record<string, unknown>;
  disabledPreflightEnvelope?: Record<string, unknown>;
  disabledPreflight?: Record<string, unknown>;
  disabledRuntimeCandidateEnvelope?: Record<string, unknown>;
  disabledRuntimeCandidate?: Record<string, unknown>;
  activationReadinessEnvelope?: Record<string, unknown>;
  activationReadiness?: Record<string, unknown>;
  startupNoFetchGuard?: Record<string, unknown>;
} = {}): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE, 'pack'), { recursive: true });
  const manifest = overrides.manifest ?? validManifest();
  const cacheKey = buildCoursePackCacheKey(manifest);
  fs.writeFileSync(path.join(ROOT, MANIFEST_RELATIVE), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const baseEvidence = {
    status: 'PASS',
    generatedAt: GENERATED_AT,
    packId: manifest.packId,
    studyTarget: manifest.studyTarget,
    sourceLocale: manifest.sourceLocale,
    surface: manifest.surface,
    contentVersion: manifest.contentVersion,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    storageMigrationRan: false,
    productionActivationApproved: false,
    blockers: [],
  };
  fs.writeFileSync(path.join(ROOT, REMOTE_VERIFY_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-server-staging-remote-verify-v1',
    expectedObjectCount: 551,
    foundObjectCount: 551,
    hashCheckedCount: 551,
    missingObjects: [],
    sizeMismatches: [],
    hashMismatches: [],
    ...overrides.remoteVerify,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DUAL_READ_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-server-shadow-dual-read-report-v1',
    parityReport: {
      verdict: 'shadow_parity_passed',
    },
    ...overrides.dualRead,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DISABLED_PREFLIGHT_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-manifest-registry-preflight-report-v1',
    preflight: {
      status: 'PASS',
      cacheKey,
      expectedCacheKey: cacheKey,
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      cacheRepairApproved: false,
      registryEntryAllowed: false,
      cacheMetadataReadableByRuntime: false,
      cacheMetadataWritableByRuntime: false,
      startupBlockingAllowed: false,
      blockers: [],
      ...overrides.disabledPreflight,
    },
    ...overrides.disabledPreflightEnvelope,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DISABLED_RUNTIME_CANDIDATE_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-runtime-manifest-candidate-report-v1',
    candidate: {
      status: 'PASS',
      evidenceBundleComplete: true,
      runtimeManifestRegistrable: false,
      runtimeManifestRegistered: false,
      runtimeLookupAllowed: false,
      cacheLookupAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      startupBlockingAllowed: false,
      blockers: [],
      ...overrides.disabledRuntimeCandidate,
    },
    ...overrides.disabledRuntimeCandidateEnvelope,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, ACTIVATION_READINESS_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-activation-readiness-blocker-report-v1',
    status: 'HOLD',
    activationReadiness: {
      status: 'HOLD',
      activationApproved: false,
      remoteLoadingEnabled: false,
      runtimeManifestRegistrable: false,
      bundledContentRemoved: false,
      ...overrides.activationReadiness,
    },
    startupNoFetchGuard: {
      status: 'PASS',
      ...overrides.startupNoFetchGuard,
    },
    blockers: [
      'offline_cache_integrity: Offline cache integrity gate is still missing.',
    ],
    ...overrides.activationReadinessEnvelope,
  }, null, 2)}\n`, 'utf8');
}

describe('plan content disabled offline cache integrity command', () => {
  it('writes PASS evidence while keeping runtime cache disabled', () => {
    writeInputs();

    const result = writePlanContentDisabledOfflineCacheIntegrity(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      activationReadinessPath: ACTIVATION_READINESS_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-disabled-offline-cache-integrity-report-v1',
      status: 'PASS',
      packId: PACK_ID,
      evidenceBlockers: [],
      blockers: [],
    });
    expect(result.report.integrity).toMatchObject({
      status: 'PASS',
      cacheIntegrityEvidenceComplete: true,
      offlineCacheUsableByRuntime: false,
      cacheLookupAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      cacheRepairAllowed: false,
      expectedObjectCount: 551,
      foundObjectCount: 551,
      hashCheckedCount: 551,
      missingObjectCount: 0,
      sizeMismatchCount: 0,
      sha256MismatchCount: 0,
      blockers: [],
    });
  });

  it('writes HOLD and throws when evidence or disabled cache permissions are unsafe', () => {
    writeInputs({
      remoteVerify: {
        foundObjectCount: 550,
        hashCheckedCount: 550,
        missingObjects: ['missing.json'],
        sizeMismatches: ['wrong-size.json'],
        hashMismatches: ['wrong-hash.json'],
      },
      disabledPreflight: {
        cacheReadApproved: true,
        cacheWriteApproved: true,
      },
      disabledRuntimeCandidate: {
        runtimeManifestRegistrable: true,
        cacheReadAllowed: true,
        cacheWriteAllowed: true,
      },
      activationReadiness: {
        remoteLoadingEnabled: true,
      },
    });

    expect(() => writePlanContentDisabledOfflineCacheIntegrity(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      activationReadinessPath: ACTIVATION_READINESS_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled offline cache integrity failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as DisabledOfflineCacheIntegrityReport;
    expect(report.status).toBe('HOLD');
    expect(report.integrity.offlineCacheUsableByRuntime).toBe(false);
    expect(report.integrity.cacheReadAllowed).toBe(false);
    expect(report.integrity.cacheWriteAllowed).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'foundObjectCount must match expectedObjectCount',
      'hashCheckedCount must match expectedObjectCount',
      'missingObjectCount must be zero',
      'sizeMismatchCount must be zero',
      'sha256MismatchCount must be zero',
      'disabled manifest preflight cacheReadApproved must remain false',
      'disabled manifest preflight cacheWriteApproved must remain false',
      'disabled runtime manifest candidate runtimeManifestRegistrable must remain false',
      'disabled runtime manifest candidate cacheReadAllowed must remain false',
      'disabled runtime manifest candidate cacheWriteAllowed must remain false',
      'activation readiness remoteLoadingEnabled must remain false',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeInputs();

    expect(() => writePlanContentDisabledOfflineCacheIntegrity(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      activationReadinessPath: ACTIVATION_READINESS_RELATIVE,
      outputPath: 'docs/specs/__plan_content_disabled_offline_cache_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled offline cache integrity output must stay under .codex-tmp');
  });

  it('keeps disabled cache integrity tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_disabled_offline_cache_integrity.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/cloud_sync|AsyncStorage|firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true|cacheReadAllowed: true|cacheWriteAllowed: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_disabled_offline_cache_integrity|course_pack_offline_cache_integrity|disabled-offline-cache-integrity/i);
    }
  });
});
