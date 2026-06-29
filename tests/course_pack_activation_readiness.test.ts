import fs from 'fs';
import path from 'path';

import { COURSE_PACK_SCHEMA_VERSION, type CoursePackManifest } from '../app/course_pack_manifest';
import {
  buildCurrentDisabledActivationInput,
  evaluateCoursePackActivationReadiness,
} from '../app/course_pack_activation_readiness';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.plan_content.staging.shadow.activation.readiness.test',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'plan_content',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: 'staging.shadow.activation.readiness.test',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-27T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'index.json',
    ...overrides,
  };
}

describe('course pack activation readiness blocker matrix', () => {
  it('reports HOLD with concrete activation blockers while preserving disabled runtime state', () => {
    const report = evaluateCoursePackActivationReadiness(buildCurrentDisabledActivationInput({
      manifest: validManifest(),
      remoteVerifyStatus: 'PASS',
      serverShadowDualReadStatus: 'PASS',
      serverShadowParityVerdict: 'shadow_parity_passed',
      disabledManifestPreflightStatus: 'PASS',
      disabledRuntimeCandidateStatus: 'PASS',
      runtimeManifestRegistrable: false,
      reviewerApprovedRows: 0,
      reviewedRows: 546,
      localePassedRows: 0,
      startupNoFetchGuardPassed: true,
      offlineCacheIntegrityPassed: false,
      rollbackKillSwitchPassed: false,
      storageCloudIsolationPassed: false,
      targetManifestSummaryInSync: false,
      productOwnerActivationApproved: false,
    }));

    expect(report).toMatchObject({
      schemaVersion: 'course-pack-activation-readiness-v1',
      status: 'HOLD',
      activationApproved: false,
      remoteLoadingEnabled: false,
      runtimeManifestRegistrable: false,
      bundledContentRemoved: false,
    });
    expect(report.gates.filter((gate) => gate.status === 'pass').map((gate) => gate.id)).toEqual(expect.arrayContaining([
      'remote_shadow_upload_verified',
      'server_shadow_dual_read_parity',
      'disabled_manifest_registry_preflight',
      'disabled_runtime_manifest_candidate',
      'startup_no_fetch_guard',
      'runtime_manifest_still_disabled',
      'remote_loading_still_disabled',
      'bundled_content_retained',
    ]));
    expect(report.blockers).toEqual(expect.arrayContaining([
      'reviewer_approval: Reviewer approval required for every row. Approved 0/546.',
      'locale_gate_approval: Locale gates must pass for every row. Passed 0/546.',
      'offline_cache_integrity: Offline cache integrity gate is still missing.',
      'rollback_kill_switch: Rollback kill-switch gate is still missing.',
      'storage_cloud_isolation: Storage/cloud isolation gate is still missing.',
      'target_manifest_summary_in_sync: Target pack manifest summary must be refreshed after payload/server/storage evidence changes.',
      'product_owner_activation_approval: Product-owner activation approval is still missing.',
    ]));
  });

  it('keeps activation on HOLD when payload/server evidence changed but the target summary was not refreshed', () => {
    const report = evaluateCoursePackActivationReadiness({
      manifest: validManifest({ packId: 'fr.ru.lesson.staging.shadow.activation.readiness.test', studyTarget: 'fr', surface: 'lesson' }),
      remoteVerifyStatus: 'PASS',
      serverShadowDualReadStatus: 'PASS',
      serverShadowParityVerdict: 'shadow_parity_passed',
      disabledManifestPreflightStatus: 'PASS',
      disabledRuntimeCandidateStatus: 'PASS',
      runtimeManifestRegistrable: false,
      remoteLoadingEnabled: false,
      activationApproved: false,
      bundledContentRemoved: false,
      reviewerApprovedRows: 1600,
      reviewedRows: 1600,
      localePassedRows: 1600,
      startupNoFetchGuardPassed: true,
      offlineCacheIntegrityPassed: true,
      rollbackKillSwitchPassed: true,
      storageCloudIsolationPassed: true,
      targetManifestSummaryInSync: false,
      productOwnerActivationApproved: true,
    });

    expect(report.status).toBe('HOLD');
    expect(report.blockers).toEqual([
      'target_manifest_summary_in_sync: Target pack manifest summary must be refreshed after payload/server/storage evidence changes.',
    ]);
    expect(report.activationApproved).toBe(false);
    expect(report.remoteLoadingEnabled).toBe(false);
    expect(report.runtimeManifestRegistrable).toBe(false);
  });

  it('reports PASS only when all activation gates are explicitly satisfied', () => {
    const report = evaluateCoursePackActivationReadiness({
      manifest: validManifest(),
      remoteVerifyStatus: 'PASS',
      serverShadowDualReadStatus: 'PASS',
      serverShadowParityVerdict: 'shadow_parity_passed',
      disabledManifestPreflightStatus: 'PASS',
      disabledRuntimeCandidateStatus: 'PASS',
      runtimeManifestRegistrable: false,
      remoteLoadingEnabled: false,
      activationApproved: false,
      bundledContentRemoved: false,
      reviewerApprovedRows: 546,
      reviewedRows: 546,
      localePassedRows: 546,
      startupNoFetchGuardPassed: true,
      offlineCacheIntegrityPassed: true,
      rollbackKillSwitchPassed: true,
      storageCloudIsolationPassed: true,
      targetManifestSummaryInSync: true,
      productOwnerActivationApproved: true,
    });

    expect(report.status).toBe('PASS');
    expect(report.blockers).toEqual([]);
  });

  it('does not connect activation readiness to startup, network, storage or source writes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_activation_readiness.ts'), 'utf8');
    expect(source).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(source).not.toMatch(/writeFile|mkdir|Remove-Item|delete|unlink|rmdir/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const startupSource of startupFiles) {
      expect(startupSource).not.toMatch(/course_pack_activation_readiness|CoursePackActivationReadiness|evaluateCoursePackActivationReadiness/i);
    }
  });
});
