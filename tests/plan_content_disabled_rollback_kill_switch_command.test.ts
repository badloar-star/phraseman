import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import { writePlanContentDisabledRollbackKillSwitch } from '../scripts/plan_content_disabled_rollback_kill_switch';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/disabled-rollback-kill-switch';
const MANIFEST_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/manifest.json`;
const REMOTE_VERIFY_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-remote-verify.json`;
const DUAL_READ_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const DISABLED_PREFLIGHT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-manifest-registry-preflight.json`;
const DISABLED_RUNTIME_CANDIDATE_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-runtime-manifest-candidate.json`;
const DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-offline-cache-integrity.json`;
const ACTIVATION_READINESS_RELATIVE = `${RUN_ROOT_RELATIVE}/activation-readiness-blocker-report.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-rollback-kill-switch.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.rollback.command.test';
const CONTENT_VERSION = 'staging.shadow.rollback.command.test';

type DisabledRollbackReport = {
  status: string;
  rollback: {
    status: string;
    rollbackEvidenceComplete: boolean;
    rollbackMode: string;
    rollbackDeletesUserProgress: boolean;
    rollbackMutatesStorageOrCloud: boolean;
    rollbackDownloadsPack: boolean;
    rollbackReadsCache: boolean;
    rollbackWritesCache: boolean;
    rollbackRepairsCache: boolean;
    runtimeLookupAllowed: boolean;
    cacheReadAllowed: boolean;
    cacheWriteAllowed: boolean;
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
  disabledOfflineCacheIntegrityEnvelope?: Record<string, unknown>;
  disabledOfflineCacheIntegrity?: Record<string, unknown>;
  activationReadinessEnvelope?: Record<string, unknown>;
  activationReadiness?: Record<string, unknown>;
  startupNoFetchGuard?: Record<string, unknown>;
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
      status: 'PASS',
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
  fs.writeFileSync(path.join(ROOT, DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-offline-cache-integrity-report-v1',
    integrity: {
      status: 'PASS',
      cacheIntegrityEvidenceComplete: true,
      offlineCacheUsableByRuntime: false,
      activationApproved: false,
      remoteLoadingEnabled: false,
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheLookupApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      cacheRepairApproved: false,
      storageMigrationApproved: false,
      bundledContentRemovalApproved: false,
      productionActivationApproved: false,
      cacheLookupAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      cacheRepairAllowed: false,
      startupBlockingAllowed: false,
      blockers: [],
      ...overrides.disabledOfflineCacheIntegrity,
    },
    ...overrides.disabledOfflineCacheIntegrityEnvelope,
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
    ...overrides.activationReadinessEnvelope,
  }, null, 2)}\n`, 'utf8');
}

describe('plan content disabled rollback kill-switch command', () => {
  it('writes PASS rollback evidence while keeping runtime/cache/storage untouched', () => {
    writeInputs();

    const result = writePlanContentDisabledRollbackKillSwitch(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      activationReadinessPath: ACTIVATION_READINESS_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-disabled-rollback-kill-switch-report-v1',
      status: 'PASS',
      packId: PACK_ID,
      evidenceBlockers: [],
      blockers: [],
    });
    expect(result.report.rollback).toMatchObject({
      status: 'PASS',
      rollbackEvidenceComplete: true,
      rollbackMode: 'bundled_compatibility',
      rollbackDeletesUserProgress: false,
      rollbackMutatesStorageOrCloud: false,
      rollbackDownloadsPack: false,
      rollbackReadsCache: false,
      rollbackWritesCache: false,
      rollbackRepairsCache: false,
      runtimeLookupAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      blockers: [],
    });
  });

  it('writes HOLD and throws when rollback evidence would touch runtime, cache or storage', () => {
    writeInputs({
      disabledPreflight: {
        cacheRepairApproved: true,
        storageMigrationApproved: true,
      },
      disabledRuntimeCandidate: {
        runtimeManifestRegistrable: true,
        runtimeLookupAllowed: true,
      },
      disabledOfflineCacheIntegrity: {
        offlineCacheUsableByRuntime: true,
        cacheReadAllowed: true,
      },
      activationReadiness: {
        remoteLoadingEnabled: true,
      },
    });

    expect(() => writePlanContentDisabledRollbackKillSwitch(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      activationReadinessPath: ACTIVATION_READINESS_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled rollback kill-switch failed');

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as DisabledRollbackReport;
    expect(report.status).toBe('HOLD');
    expect(report.rollback.runtimeLookupAllowed).toBe(false);
    expect(report.rollback.cacheReadAllowed).toBe(false);
    expect(report.rollback.cacheWriteAllowed).toBe(false);
    expect(report.blockers).toEqual(expect.arrayContaining([
      'runtimeManifestRegistrable must remain false',
      'disabled manifest preflight cacheRepairApproved must remain false',
      'disabled manifest preflight storageMigrationApproved must remain false',
      'disabled runtime manifest candidate runtimeManifestRegistrable must remain false',
      'disabled runtime manifest candidate runtimeLookupAllowed must remain false',
      'disabled offline cache integrity offlineCacheUsableByRuntime must remain false',
      'disabled offline cache integrity cacheReadAllowed must remain false',
      'activation readiness remoteLoadingEnabled must remain false',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeInputs();

    expect(() => writePlanContentDisabledRollbackKillSwitch(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      activationReadinessPath: ACTIVATION_READINESS_RELATIVE,
      outputPath: 'docs/specs/__plan_content_disabled_rollback_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Disabled rollback kill-switch output must stay under .codex-tmp');
  });

  it('keeps disabled rollback tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_disabled_rollback_kill_switch.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/cloud_sync|AsyncStorage|firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true|cacheReadAllowed: true|cacheWriteAllowed: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_disabled_rollback_kill_switch|course_pack_rollback_kill_switch|disabled-rollback-kill-switch/i);
    }
  });
});
