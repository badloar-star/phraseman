import fs from 'fs';
import path from 'path';

import {
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT,
  resolveDisabledCoursePackRuntimeSource,
  validateDisabledCoursePackRuntimeContract,
} from '../app/course_pack_runtime_policy';
import type { CoursePackReadiness } from '../app/course_pack_loader';

const ROOT = path.resolve(__dirname, '..');

describe('course pack disabled runtime policy contract', () => {
  it('keeps every remote/cache/activation capability disabled', () => {
    expect(validateDisabledCoursePackRuntimeContract()).toEqual([]);
    expect(COURSE_PACK_DISABLED_RUNTIME_CONTRACT).toMatchObject({
      remoteLoadingEnabled: false,
      startupBlockingAllowed: false,
      manifestFetchAllowed: false,
      packDownloadAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
      cacheRepairAllowed: false,
      storageMigrationAllowed: false,
      runtimeManifestRegistrationAllowed: false,
      productionActivationAllowed: false,
      bundledContentRemovalAllowed: false,
      bundledCompatibilityRequired: true,
    });
    expect(COURSE_PACK_DISABLED_RUNTIME_CONTRACT.rollbackModes).toEqual([
      'bundled_compatibility',
      'missing_without_download',
    ]);
  });

  it('allows only the current bundled compatibility fallback to provide content', () => {
    const decision = resolveDisabledCoursePackRuntimeSource({
      state: 'offline_fallback',
      delivery: 'bundled_compatibility',
      reason: 'bundled_compatibility_until_pack_extraction',
    });

    expect(decision).toMatchObject({
      source: 'bundled_compatibility',
      reason: 'bundled_compatibility_fallback',
      offlineFallbackAllowed: true,
      progressCreditAllowed: true,
      rollbackMode: 'bundled_compatibility',
      remoteLoadingEnabled: false,
      manifestFetchAllowed: false,
      packDownloadAllowed: false,
      cacheReadAllowed: false,
      cacheWriteAllowed: false,
    });
  });

  it('blocks selection-required and missing states without downloading', () => {
    const decisions = [
      resolveDisabledCoursePackRuntimeSource({ state: 'missing', reason: 'selection_required' }),
      resolveDisabledCoursePackRuntimeSource({ state: 'missing', reason: 'no_index_entry' }),
      resolveDisabledCoursePackRuntimeSource({ state: 'missing', delivery: 'downloadable', reason: 'remote_loader_disabled' }),
    ];

    for (const decision of decisions) {
      expect(decision).toMatchObject({
        source: 'missing',
        offlineFallbackAllowed: false,
        progressCreditAllowed: false,
        rollbackMode: 'missing_without_download',
        manifestFetchAllowed: false,
        packDownloadAllowed: false,
        cacheReadAllowed: false,
        cacheWriteAllowed: false,
      });
    }
  });

  it('ignores future cache states while remote runtime is disabled', () => {
    const unsafeReadinessStates: CoursePackReadiness[] = [
      { state: 'downloading', delivery: 'downloadable', reason: 'remote_loader_disabled' },
      { state: 'ready', delivery: 'downloadable', cacheKey: 'en/ru/plan_content/course-pack-v1/test/hash', reason: 'remote_loader_disabled' },
      { state: 'corrupt', delivery: 'downloadable', cacheKey: 'en/ru/plan_content/course-pack-v1/test/hash', reason: 'remote_loader_disabled' },
      { state: 'stale', delivery: 'downloadable', cacheKey: 'en/ru/plan_content/course-pack-v1/test/hash', reason: 'remote_loader_disabled' },
    ];

    for (const readiness of unsafeReadinessStates) {
      expect(resolveDisabledCoursePackRuntimeSource(readiness)).toMatchObject({
        source: 'missing',
        reason: 'unsafe_cache_state_ignored',
        offlineFallbackAllowed: false,
        progressCreditAllowed: false,
        cacheReadAllowed: false,
        cacheWriteAllowed: false,
        cacheRepairAllowed: false,
        rollbackMode: 'missing_without_download',
      });
    }
  });

  it('does not connect the disabled contract to startup, network, storage or source writes', () => {
    const policySource = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_runtime_policy.ts'), 'utf8');
    expect(policySource).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage|FileSystem/i);
    expect(policySource).not.toMatch(/writeFile|mkdir|Remove-Item|delete|unlink|rmdir/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/course_pack_runtime_policy|CoursePackRuntimePolicy|resolveDisabledCoursePackRuntimeSource/i);
    }
  });
});
