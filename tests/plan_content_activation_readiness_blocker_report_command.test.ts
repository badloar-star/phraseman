import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import { writePlanContentActivationReadinessBlockerReport } from '../scripts/plan_content_activation_readiness_blocker_report';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/plan-content/tests/activation-readiness';
const MANIFEST_RELATIVE = `${RUN_ROOT_RELATIVE}/pack/manifest.json`;
const REMOTE_VERIFY_RELATIVE = `${RUN_ROOT_RELATIVE}/server-staging-remote-verify.json`;
const DUAL_READ_RELATIVE = `${RUN_ROOT_RELATIVE}/server-shadow-dual-read-report.json`;
const DISABLED_PREFLIGHT_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-manifest-registry-preflight.json`;
const DISABLED_RUNTIME_CANDIDATE_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-runtime-manifest-candidate.json`;
const DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-offline-cache-integrity.json`;
const DISABLED_ROLLBACK_KILL_SWITCH_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-rollback-kill-switch.json`;
const DISABLED_STORAGE_CLOUD_ISOLATION_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-storage-cloud-isolation.json`;
const DISABLED_REVIEWER_LOCALE_INTAKE_RELATIVE = `${RUN_ROOT_RELATIVE}/disabled-reviewer-locale-intake.json`;
const REPORT_RELATIVE = `${RUN_ROOT_RELATIVE}/activation-readiness-blocker-report.json`;
const GENERATED_AT = '2026-06-27T00:00:00.000Z';
const HASH_A = 'a'.repeat(64);
const PACK_ID = 'en.ru.plan_content.staging.shadow.activation.blocker.test';
const CONTENT_VERSION = 'staging.shadow.activation.blocker.test';

type ActivationReadinessReport = {
  status: string;
  activationReadiness: {
    status: string;
    completedGateCount: number;
    blockedGateCount: number;
    activationApproved: boolean;
    remoteLoadingEnabled: boolean;
    runtimeManifestRegistrable: boolean;
    bundledContentRemoved: boolean;
    blockers: string[];
  };
  startupNoFetchGuard: {
    status: string;
    matches: string[];
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
  disabledRollbackKillSwitchEnvelope?: Record<string, unknown>;
  disabledRollbackKillSwitch?: Record<string, unknown>;
  disabledStorageCloudIsolationEnvelope?: Record<string, unknown>;
  disabledStorageCloudIsolation?: Record<string, unknown>;
  disabledReviewerLocaleIntakeEnvelope?: Record<string, unknown>;
  disabledReviewerLocaleIntake?: Record<string, unknown>;
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
      reviewerSummary: {
        reviewedRowCount: 546,
        reviewStatusCounts: {
          approved: 0,
        },
        localeGateStatusCounts: {
          passed: 0,
        },
      },
    },
    ...overrides.dualRead,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DISABLED_PREFLIGHT_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-manifest-registry-preflight-report-v1',
    preflight: {
      status: 'PASS',
      registryEntryAllowed: false,
      cacheMetadataReadableByRuntime: false,
      cacheMetadataWritableByRuntime: false,
      manifestFetchApproved: false,
      packDownloadApproved: false,
      cacheReadApproved: false,
      cacheWriteApproved: false,
      startupBlockingAllowed: false,
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
      offlineCacheUsableByRuntime: false,
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
  fs.writeFileSync(path.join(ROOT, DISABLED_ROLLBACK_KILL_SWITCH_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-rollback-kill-switch-report-v1',
    rollback: {
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
      ...overrides.disabledRollbackKillSwitch,
    },
    ...overrides.disabledRollbackKillSwitchEnvelope,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DISABLED_STORAGE_CLOUD_ISOLATION_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-storage-cloud-isolation-report-v1',
    storageCloud: {
      status: 'PASS',
      storageCloudIsolationComplete: true,
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
      futureTargetActivationBlocked: true,
      futureTargetFallbackRemediationRequired: true,
      personalPlanScopeDecision: 'global_current_en_until_target_pack_activation',
      blockers: [],
      ...overrides.disabledStorageCloudIsolation,
    },
    ...overrides.disabledStorageCloudIsolationEnvelope,
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(ROOT, DISABLED_REVIEWER_LOCALE_INTAKE_RELATIVE), `${JSON.stringify({
    ...baseEvidence,
    schemaVersion: 'plan-content-disabled-reviewer-locale-intake-report-v1',
    status: 'HOLD',
    safetyStatus: 'PASS',
    approvalStatus: 'HOLD',
    reviewerLocale: {
      status: 'HOLD',
      safetyStatus: 'PASS',
      approvalStatus: 'HOLD',
      totalRows: 546,
      serverShadowRowsRead: 546,
      explicitApprovalArtifactPresent: false,
      explicitDecisionRows: 0,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      shadowReviewerApprovedRows: 0,
      shadowLocalePassedRows: 0,
      shadowAutoApprovalDetected: false,
      reviewerLocaleApprovalComplete: false,
      missingReviewerApprovalRows: Array.from({ length: 546 }, (_, index) => ({
        planId: 'echo',
        dayIndex: index + 1,
        contentHash: HASH_A,
        path: `plans/echo/day-${String(index + 1).padStart(3, '0')}.json`,
      })),
      missingLocaleGateRows: Array.from({ length: 546 }, (_, index) => ({
        planId: 'echo',
        dayIndex: index + 1,
        contentHash: HASH_A,
        path: `plans/echo/day-${String(index + 1).padStart(3, '0')}.json`,
      })),
      safetyBlockers: [],
      approvalBlockers: [
        'reviewer approval required for every row: approved 0/546',
        'locale gate required for every row: passed 0/546',
      ],
      blockers: [
        'reviewer approval required for every row: approved 0/546',
        'locale gate required for every row: passed 0/546',
      ],
      ...overrides.disabledReviewerLocaleIntake,
    },
    evidenceBlockers: [],
    blockers: [
      'reviewer approval required for every row: approved 0/546',
      'locale gate required for every row: passed 0/546',
    ],
    ...overrides.disabledReviewerLocaleIntakeEnvelope,
  }, null, 2)}\n`, 'utf8');
}

describe('plan content activation readiness blocker report command', () => {
  it('writes the expected HOLD report without enabling runtime loading', () => {
    writeInputs();

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report).toMatchObject({
      schemaVersion: 'plan-content-activation-readiness-blocker-report-v1',
      status: 'HOLD',
      packId: PACK_ID,
      evidenceBlockers: [],
    });
    expect(result.report.activationReadiness).toMatchObject({
      status: 'HOLD',
      activationApproved: false,
      remoteLoadingEnabled: false,
      runtimeManifestRegistrable: false,
      bundledContentRemoved: false,
      completedGateCount: 8,
      blockedGateCount: 6,
    });
    expect(result.report.startupNoFetchGuard).toEqual({
      status: 'PASS',
      checkedFiles: [
        'app/_layout.tsx',
        'components/onboarding.tsx',
        'components/LangContext.tsx',
      ],
      forbiddenPatterns: [
        'course_pack_activation_readiness',
        'course_pack_runtime_manifest_candidate',
        'course_pack_manifest_registry_preflight',
        'course_pack_reviewer_locale_intake',
        'plan_content_activation_readiness_blocker_report',
        'plan_content_disabled_reviewer_locale_intake',
        'activation-readiness-blocker-report',
        'disabled-reviewer-locale-intake',
      ],
      matches: [],
    });
    expect(result.report.blockers).toEqual(expect.arrayContaining([
      'reviewer_approval: Reviewer approval required for every row. Approved 0/546.',
      'locale_gate_approval: Locale gates must pass for every row. Passed 0/546.',
      'offline_cache_integrity: Offline cache integrity gate is still missing.',
      'rollback_kill_switch: Rollback kill-switch gate is still missing.',
      'storage_cloud_isolation: Storage/cloud isolation gate is still missing.',
      'product_owner_activation_approval: Product-owner activation approval is still missing.',
    ]));
  });

  it('adds evidence blockers but still writes a HOLD report for unsafe inputs', () => {
    writeInputs({
      remoteVerify: {
        status: 'HOLD',
        packId: 'wrong-pack',
        remoteLoadingEnabled: true,
        blockers: ['remote mismatch'],
      },
      disabledRuntimeCandidate: {
        runtimeManifestRegistrable: true,
        runtimeLookupAllowed: true,
      },
    });

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.activationReadiness.runtimeManifestRegistrable).toBe(false);
    expect(result.report.evidenceBlockers).toEqual(expect.arrayContaining([
      'remote verify packId must match manifest',
      'remote verify status must be PASS',
      'remote verify remoteLoadingEnabled must remain false',
      'remote verify blockers must be empty',
      'disabled runtime manifest candidate runtimeManifestRegistrable must remain false',
      'disabled runtime manifest candidate runtimeLookupAllowed must remain false',
    ]));
  });

  it('uses a clean disabled offline cache integrity report to clear the offline cache blocker', () => {
    writeInputs();

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.activationReadiness).toMatchObject({
      completedGateCount: 9,
      blockedGateCount: 5,
    });
    expect(result.report.offlineCacheIntegrityEvidence).toEqual({
      status: 'PASS',
      cacheIntegrityEvidenceComplete: true,
      offlineCacheUsableByRuntime: false,
    });
    expect(result.report.activationReadiness.blockers).not.toContain('offline_cache_integrity: Offline cache integrity gate is still missing.');
    expect(result.report.activationReadiness.blockers).toEqual(expect.arrayContaining([
      'reviewer_approval: Reviewer approval required for every row. Approved 0/546.',
      'locale_gate_approval: Locale gates must pass for every row. Passed 0/546.',
      'rollback_kill_switch: Rollback kill-switch gate is still missing.',
      'storage_cloud_isolation: Storage/cloud isolation gate is still missing.',
      'product_owner_activation_approval: Product-owner activation approval is still missing.',
    ]));
  });

  it('uses a clean disabled rollback kill-switch report to clear the rollback blocker', () => {
    writeInputs();

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      disabledRollbackKillSwitchPath: DISABLED_ROLLBACK_KILL_SWITCH_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.activationReadiness).toMatchObject({
      completedGateCount: 10,
      blockedGateCount: 4,
    });
    expect(result.report.rollbackKillSwitchEvidence).toEqual({
      status: 'PASS',
      rollbackEvidenceComplete: true,
      rollbackMode: 'bundled_compatibility',
      rollbackDeletesUserProgress: false,
      rollbackMutatesStorageOrCloud: false,
    });
    expect(result.report.activationReadiness.blockers).not.toContain('offline_cache_integrity: Offline cache integrity gate is still missing.');
    expect(result.report.activationReadiness.blockers).not.toContain('rollback_kill_switch: Rollback kill-switch gate is still missing.');
    expect(result.report.activationReadiness.blockers).toEqual(expect.arrayContaining([
      'reviewer_approval: Reviewer approval required for every row. Approved 0/546.',
      'locale_gate_approval: Locale gates must pass for every row. Passed 0/546.',
      'storage_cloud_isolation: Storage/cloud isolation gate is still missing.',
      'product_owner_activation_approval: Product-owner activation approval is still missing.',
    ]));
  });

  it('uses a clean disabled storage/cloud isolation report to clear the storage/cloud blocker', () => {
    writeInputs();

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      disabledRollbackKillSwitchPath: DISABLED_ROLLBACK_KILL_SWITCH_RELATIVE,
      disabledStorageCloudIsolationPath: DISABLED_STORAGE_CLOUD_ISOLATION_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.activationReadiness).toMatchObject({
      completedGateCount: 11,
      blockedGateCount: 3,
    });
    expect(result.report.storageCloudIsolationEvidence).toEqual({
      status: 'PASS',
      storageCloudIsolationComplete: true,
      legacyFlatCloudKeysTarget: 'en',
      appLanguageMutatesStudyTarget: false,
      personalPracticeSourceScopesSeparate: true,
      lessonListeningProgressTargetAware: true,
      futureTargetActivationBlocked: true,
      personalPlanScopeDecision: 'global_current_en_until_target_pack_activation',
    });
    expect(result.report.activationReadiness.blockers).not.toContain('offline_cache_integrity: Offline cache integrity gate is still missing.');
    expect(result.report.activationReadiness.blockers).not.toContain('rollback_kill_switch: Rollback kill-switch gate is still missing.');
    expect(result.report.activationReadiness.blockers).not.toContain('storage_cloud_isolation: Storage/cloud isolation gate is still missing.');
    expect(result.report.activationReadiness.blockers).toEqual(expect.arrayContaining([
      'reviewer_approval: Reviewer approval required for every row. Approved 0/546.',
      'locale_gate_approval: Locale gates must pass for every row. Passed 0/546.',
      'product_owner_activation_approval: Product-owner activation approval is still missing.',
    ]));
  });

  it('uses safe reviewer/locale intake evidence without auto-clearing missing approvals', () => {
    writeInputs();

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      disabledRollbackKillSwitchPath: DISABLED_ROLLBACK_KILL_SWITCH_RELATIVE,
      disabledStorageCloudIsolationPath: DISABLED_STORAGE_CLOUD_ISOLATION_RELATIVE,
      disabledReviewerLocaleIntakePath: DISABLED_REVIEWER_LOCALE_INTAKE_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.activationReadiness).toMatchObject({
      completedGateCount: 11,
      blockedGateCount: 3,
    });
    expect(result.report.reviewerLocaleIntakeEvidence).toEqual({
      status: 'HOLD',
      safetyStatus: 'PASS',
      approvalStatus: 'HOLD',
      totalRows: 546,
      explicitApprovalArtifactPresent: false,
      explicitDecisionRows: 0,
      reviewerApprovedRows: 0,
      localePassedRows: 0,
      missingReviewerApprovalRows: 546,
      missingLocaleGateRows: 546,
      shadowAutoApprovalDetected: false,
      reviewerLocaleApprovalComplete: false,
    });
    expect(result.report.evidenceBlockers).toEqual([]);
    expect(result.report.activationReadiness.blockers).toEqual(expect.arrayContaining([
      'reviewer_approval: Reviewer approval required for every row. Approved 0/546.',
      'locale_gate_approval: Locale gates must pass for every row. Passed 0/546.',
      'product_owner_activation_approval: Product-owner activation approval is still missing.',
    ]));
  });

  it('clears reviewer and locale blockers only when intake has explicit full approval', () => {
    writeInputs({
      disabledReviewerLocaleIntakeEnvelope: {
        status: 'PASS',
        approvalStatus: 'PASS',
        blockers: [],
      },
      disabledReviewerLocaleIntake: {
        status: 'PASS',
        approvalStatus: 'PASS',
        explicitApprovalArtifactPresent: true,
        explicitDecisionRows: 546,
        reviewerApprovedRows: 546,
        localePassedRows: 546,
        reviewerLocaleApprovalComplete: true,
        missingReviewerApprovalRows: [],
        missingLocaleGateRows: [],
        approvalBlockers: [],
        blockers: [],
      },
    });

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      disabledRollbackKillSwitchPath: DISABLED_ROLLBACK_KILL_SWITCH_RELATIVE,
      disabledStorageCloudIsolationPath: DISABLED_STORAGE_CLOUD_ISOLATION_RELATIVE,
      disabledReviewerLocaleIntakePath: DISABLED_REVIEWER_LOCALE_INTAKE_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.activationReadiness).toMatchObject({
      completedGateCount: 13,
      blockedGateCount: 1,
    });
    expect(result.report.activationReadiness.blockers).toEqual([
      'product_owner_activation_approval: Product-owner activation approval is still missing.',
    ]);
  });

  it('adds evidence blockers for unsafe reviewer/locale intake evidence', () => {
    writeInputs({
      disabledReviewerLocaleIntakeEnvelope: {
        safetyStatus: 'HOLD',
        evidenceBlockers: ['unsafe reviewer evidence'],
      },
      disabledReviewerLocaleIntake: {
        safetyStatus: 'HOLD',
        serverShadowRowsRead: 545,
        shadowReviewerApprovedRows: 1,
        shadowAutoApprovalDetected: true,
        safetyBlockers: ['shadow auto approval'],
      },
    });

    const result = writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      disabledOfflineCacheIntegrityPath: DISABLED_OFFLINE_CACHE_INTEGRITY_RELATIVE,
      disabledRollbackKillSwitchPath: DISABLED_ROLLBACK_KILL_SWITCH_RELATIVE,
      disabledStorageCloudIsolationPath: DISABLED_STORAGE_CLOUD_ISOLATION_RELATIVE,
      disabledReviewerLocaleIntakePath: DISABLED_REVIEWER_LOCALE_INTAKE_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    expect(result.report.status).toBe('HOLD');
    expect(result.report.evidenceBlockers).toEqual(expect.arrayContaining([
      'disabled reviewer/locale intake safetyStatus must be PASS',
      'disabled reviewer/locale intake evidenceBlockers must be empty',
      'disabled reviewer/locale intake payload safetyStatus must be PASS',
      'disabled reviewer/locale intake serverShadowRowsRead must match totalRows',
      'disabled reviewer/locale intake shadowReviewerApprovedRows must remain 0',
      'disabled reviewer/locale intake shadowAutoApprovalDetected must remain false',
      'disabled reviewer/locale intake safetyBlockers must be empty',
    ]));
  });

  it('rejects output outside the ignored plan-content temp directory', () => {
    writeInputs();

    expect(() => writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      outputPath: 'docs/specs/__plan_content_activation_readiness_should_not_write.json',
      generatedAt: GENERATED_AT,
    })).toThrow('Activation readiness blocker output must stay under .codex-tmp');
  });

  it('keeps activation blocker tooling disconnected from startup and runtime side effects', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_activation_readiness_blocker_report.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/cloud_sync|AsyncStorage|firebase|firestore|fetch\(|XMLHttpRequest|runtimeManifestRegistered: true|activationApproved: true|remoteLoadingEnabled: true/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_activation_readiness_blocker_report|activation-readiness-blocker-report|course_pack_activation_readiness/i);
    }
  });

  it('writes the same HOLD payload to disk', () => {
    writeInputs();

    writePlanContentActivationReadinessBlockerReport(ROOT, {
      manifestPath: MANIFEST_RELATIVE,
      remoteVerifyReportPath: REMOTE_VERIFY_RELATIVE,
      serverShadowDualReadReportPath: DUAL_READ_RELATIVE,
      disabledManifestPreflightPath: DISABLED_PREFLIGHT_RELATIVE,
      disabledRuntimeCandidatePath: DISABLED_RUNTIME_CANDIDATE_RELATIVE,
      outputPath: REPORT_RELATIVE,
      generatedAt: GENERATED_AT,
    });

    const report = JSON.parse(fs.readFileSync(path.join(ROOT, REPORT_RELATIVE), 'utf8')) as ActivationReadinessReport;
    expect(report.status).toBe('HOLD');
    expect(report.activationReadiness.completedGateCount).toBe(8);
    expect(report.activationReadiness.blockedGateCount).toBe(6);
    expect(report.startupNoFetchGuard.status).toBe('PASS');
    expect(report.evidenceBlockers).toEqual([]);
  });
});
