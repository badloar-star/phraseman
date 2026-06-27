import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, buildCoursePackCacheKey, type CoursePackManifest } from '../app/course_pack_manifest';
import type { CoursePackDisabledManifestPreflightReport } from '../app/course_pack_manifest_registry_preflight';
import { writePlanContentDisabledRuntimeManifestCandidate } from '../scripts/plan_content_disabled_runtime_manifest_candidate';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/disabled-runtime-candidate';
const MANIFEST_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/manifest.json`;
const REMOTE_VERIFY_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-remote-verify.json`;
const DUAL_READ_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const DISABLED_PREFLIGHT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-manifest-registry-preflight.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-runtime-manifest-candidate.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.runtime.candidate.test';
const CONTENT_VERSION = 'staging.shadow.runtime.candidate.test';

type DisabledRuntimeCandidateReport = {
  status: string;
  packId: string;
  candidate: {
    status: string;
    evidenceBundleComplete: boolean;
    runtimeManifestRegistrable: boolean;
    runtimeManifestRegistered: boolean;
    runtimeLookupAllowed: boolean;
    cacheLookupAllowed: boolean;
    cacheReadAllowed: boolean;
    cacheWriteAllowed: boolean;
    startupBlockingAllowed: boolean;
    blockers: string[];
  };
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

function validDisabledPreflight(manifest: CoursePackManifest): CoursePackDisabledManifestPreflightReport {
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

function writeInputs(overrides: {
  manifest?: CoursePackManifest;
  remoteVerify?: Record<string, unknown>;
  dualRead?: Record<string, unknown>;
  disabledPreflightEnvelope?: Record<string, unknown>;
  disabledPreflight?: Partial<CoursePackDisabledManifestPreflightReport>;
} = {}): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE, 'pack'), { recursive: true });
  const manifest = overrides.manifest ?? validManifest();
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
      ...validDisabledPreflight(manifest),
      ...overrides.disabledPreflight,
    },
    ...overrides.disabledPreflightEnvelope,
  }, null, 2)}\n`, 'utf8');
}

describe('plan content disabled runtime manifest candidate command', () => {
  it('writes PASS while keeping runtime manifest non-registrable', () => {
    writeInputs();

    const result = writePlanContentDisabledRuntimeManifestCandidate(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-disabled-runtime-manifest-candidate-report-v1',
      status: 'PASS',
      packId: PACK_ID,
      blockers: [],
    });
    expect(result.report.candidate).toMatchObject({
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
    });
  });

  it('writes HOLD when upstream evidence or disabled preflight is unsafe', () => {
    writeInputs({
      remoteVerify: {
        status: 'HOLD',
        blockers: ['remote mismatch'],
      },
      dualRead: {
        parityReport: {
          verdict: 'hold',
        },
      },
      disabledPreflightEnvelope: {
        status: 'HOLD',
        blockers: ['preflight mismatch'],
      },
      disabledPreflight: {
        cacheMetadataReadableByRuntime: true,
      } as unknown as Partial<CoursePackDisabledManifestPreflightReport>,
    });

    expect(() => writePlanContentDisabledRuntimeManifestCandidate(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled runtime manifest candidate failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as DisabledRuntimeCandidateReport;
    expect(report.status).toBe('HOLD');
    expect(report.candidate.runtimeManifestRegistrable).toBe(false);
    expect(report.candidate.runtimeLookupAllowed).toBe(false);
    expect(report.candidate.cacheLookupAllowed).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'remote verification evidence must be PASS',
      'server-shadow parity verdict must be shadow_parity_passed',
      'disabled manifest preflight evidence must be PASS',
      'disabled preflight cacheMetadataReadableByRuntime must remain false',
      'remote verify status must be PASS',
      'remote verify blockers must be empty',
      'disabled manifest preflight envelope status must be PASS',
      'disabled manifest preflight envelope blockers must be empty',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeInputs();

    expect(() => writePlanContentDisabledRuntimeManifestCandidate(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      outputPath: 'docs/specs/__plan_content_disabled_runtime_candidate_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled runtime manifest candidate output must stay under .codex-tmp');
  });

  it('keeps disabled runtime candidate tooling disconnected from startup and activation', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_disabled_runtime_manifest_candidate.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/course_pack_loader|cloud_sync|AsyncStorage|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_disabled_runtime_manifest_candidate|PlanContentDisabledRuntimeManifestCandidate/i);
    }
  });
});
