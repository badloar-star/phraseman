import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import { writePlanContentDisabledManifestRegistryPreflight } from '../scripts/plan_content_disabled_manifest_registry_preflight';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/disabled-manifest-preflight';
const MANIFEST_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/manifest.json`;
const REMOTE_VERIFY_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-remote-verify.json`;
const DUAL_READ_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-manifest-registry-preflight.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.disabled.preflight.test';
const CONTENT_VERSION = 'staging.shadow.disabled.preflight.test';

type DisabledManifestPreflightReport = {
  status: string;
  packId: string;
  preflight: {
    status: string;
    registryEntryAllowed: boolean;
    cacheMetadataReadableByRuntime: boolean;
    cacheMetadataWritableByRuntime: boolean;
    manifestFetchApproved: boolean;
    packDownloadApproved: boolean;
    cacheReadApproved: boolean;
    cacheWriteApproved: boolean;
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

function writeInputs(overrides: {
  remoteVerify?: Record<string, unknown>;
  dualRead?: Record<string, unknown>;
  manifest?: CoursePackManifest;
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
    expectedObjectCount: 551,
    foundObjectCount: 551,
    hashCheckedCount: 551,
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
}

describe('plan content disabled manifest registry preflight command', () => {
  it('writes a PASS report while keeping manifest registry and cache disabled', () => {
    writeInputs();

    const result = writePlanContentDisabledManifestRegistryPreflight(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-disabled-manifest-registry-preflight-report-v1',
      status: 'PASS',
      packId: PACK_ID,
      surface: 'plan_content',
      blockers: [],
    });
    expect(result.report.preflight).toMatchObject({
      status: 'PASS',
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      registryEntryAllowed: false,
      cacheMetadataReadableByRuntime: false,
      cacheMetadataWritableByRuntime: false,
      blockers: [],
    });
  });

  it('writes HOLD when evidence is unsafe', () => {
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
    });

    expect(() => writePlanContentDisabledManifestRegistryPreflight(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled manifest registry preflight failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as DisabledManifestPreflightReport;
    expect(report.status).toBe('HOLD');
    expect(report.preflight.registryEntryAllowed).toBe(false);
    expect(report.preflight.cacheMetadataReadableByRuntime).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'remote verification evidence must be PASS',
      'server-shadow parity verdict must be shadow_parity_passed',
      'remote verify status must be PASS',
      'remote verify blockers must be empty',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeInputs();

    expect(() => writePlanContentDisabledManifestRegistryPreflight(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      outputPath: 'docs/specs/__plan_content_disabled_manifest_preflight_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled manifest registry preflight output must stay under .codex-tmp');
  });

  it('keeps disabled manifest preflight disconnected from startup and runtime activation', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_disabled_manifest_registry_preflight.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/course_pack_loader|cloud_sync|AsyncStorage|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_disabled_manifest_registry_preflight|PlanContentDisabledManifestRegistryPreflight/i);
    }
  });
});
