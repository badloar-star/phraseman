import type { CoursePackCacheState } from './course_pack_manifest';
import {
  COURSE_PACK_REMOTE_LOADING_ENABLED,
  type CoursePackReadiness,
} from './course_pack_loader';

export const COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION = 'course-pack-disabled-runtime-contract-v1' as const;

export type CoursePackRuntimeSource = 'bundled_compatibility' | 'missing';
export type CoursePackRollbackMode = 'bundled_compatibility' | 'missing_without_download';
export type CoursePackRuntimeReason =
  | 'remote_runtime_disabled'
  | 'bundled_compatibility_fallback'
  | 'selection_required'
  | 'no_safe_content_source'
  | 'unsafe_cache_state_ignored';

export type CoursePackDisabledRuntimeContract = {
  version: typeof COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION;
  remoteLoadingEnabled: false;
  startupBlockingAllowed: false;
  manifestFetchAllowed: false;
  packDownloadAllowed: false;
  cacheReadAllowed: false;
  cacheWriteAllowed: false;
  cacheRepairAllowed: false;
  storageMigrationAllowed: false;
  runtimeManifestRegistrationAllowed: false;
  productionActivationAllowed: false;
  bundledContentRemovalAllowed: false;
  bundledCompatibilityRequired: true;
  rollbackModes: readonly CoursePackRollbackMode[];
};

export type CoursePackRuntimeSourceDecision = {
  contractVersion: typeof COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION;
  state: CoursePackCacheState;
  source: CoursePackRuntimeSource;
  reason: CoursePackRuntimeReason;
  offlineFallbackAllowed: boolean;
  progressCreditAllowed: boolean;
  rollbackMode: CoursePackRollbackMode;
  remoteLoadingEnabled: false;
  startupBlockingAllowed: false;
  manifestFetchAllowed: false;
  packDownloadAllowed: false;
  cacheReadAllowed: false;
  cacheWriteAllowed: false;
  cacheRepairAllowed: false;
  storageMigrationAllowed: false;
  runtimeManifestRegistrationAllowed: false;
  productionActivationAllowed: false;
  bundledContentRemovalAllowed: false;
};

export const COURSE_PACK_DISABLED_RUNTIME_CONTRACT: CoursePackDisabledRuntimeContract = Object.freeze({
  version: COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
  remoteLoadingEnabled: COURSE_PACK_REMOTE_LOADING_ENABLED,
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
  rollbackModes: Object.freeze(['bundled_compatibility', 'missing_without_download'] as const),
});

export function validateDisabledCoursePackRuntimeContract(
  contract: CoursePackDisabledRuntimeContract = COURSE_PACK_DISABLED_RUNTIME_CONTRACT,
): string[] {
  const errors: string[] = [];
  if (contract.version !== COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION) {
    errors.push('contract version mismatch');
  }
  if (contract.remoteLoadingEnabled !== false) {
    errors.push('remoteLoadingEnabled must remain false');
  }
  if (contract.startupBlockingAllowed !== false) {
    errors.push('startupBlockingAllowed must remain false');
  }
  if (contract.manifestFetchAllowed !== false) {
    errors.push('manifestFetchAllowed must remain false');
  }
  if (contract.packDownloadAllowed !== false) {
    errors.push('packDownloadAllowed must remain false');
  }
  if (contract.cacheReadAllowed !== false) {
    errors.push('cacheReadAllowed must remain false');
  }
  if (contract.cacheWriteAllowed !== false) {
    errors.push('cacheWriteAllowed must remain false');
  }
  if (contract.cacheRepairAllowed !== false) {
    errors.push('cacheRepairAllowed must remain false');
  }
  if (contract.storageMigrationAllowed !== false) {
    errors.push('storageMigrationAllowed must remain false');
  }
  if (contract.runtimeManifestRegistrationAllowed !== false) {
    errors.push('runtimeManifestRegistrationAllowed must remain false');
  }
  if (contract.productionActivationAllowed !== false) {
    errors.push('productionActivationAllowed must remain false');
  }
  if (contract.bundledContentRemovalAllowed !== false) {
    errors.push('bundledContentRemovalAllowed must remain false');
  }
  if (contract.bundledCompatibilityRequired !== true) {
    errors.push('bundledCompatibilityRequired must remain true');
  }
  if (!contract.rollbackModes.includes('bundled_compatibility')) {
    errors.push('rollbackModes must include bundled_compatibility');
  }
  if (!contract.rollbackModes.includes('missing_without_download')) {
    errors.push('rollbackModes must include missing_without_download');
  }
  return errors;
}

export function resolveDisabledCoursePackRuntimeSource(
  readiness: CoursePackReadiness,
): CoursePackRuntimeSourceDecision {
  const base = disabledDecisionBase(readiness.state);

  if (readiness.reason === 'selection_required') {
    return {
      ...base,
      source: 'missing',
      reason: 'selection_required',
      offlineFallbackAllowed: false,
      progressCreditAllowed: false,
      rollbackMode: 'missing_without_download',
    };
  }

  if (readiness.state === 'offline_fallback' && readiness.delivery === 'bundled_compatibility') {
    return {
      ...base,
      source: 'bundled_compatibility',
      reason: 'bundled_compatibility_fallback',
      offlineFallbackAllowed: true,
      progressCreditAllowed: true,
      rollbackMode: 'bundled_compatibility',
    };
  }

  if (readiness.state === 'downloading' || readiness.state === 'ready' || readiness.state === 'corrupt' || readiness.state === 'stale') {
    return {
      ...base,
      source: 'missing',
      reason: 'unsafe_cache_state_ignored',
      offlineFallbackAllowed: false,
      progressCreditAllowed: false,
      rollbackMode: 'missing_without_download',
    };
  }

  return {
    ...base,
    source: 'missing',
    reason: readiness.reason === 'remote_loader_disabled' ? 'remote_runtime_disabled' : 'no_safe_content_source',
    offlineFallbackAllowed: false,
    progressCreditAllowed: false,
    rollbackMode: 'missing_without_download',
  };
}

function disabledDecisionBase(state: CoursePackCacheState): Omit<
  CoursePackRuntimeSourceDecision,
  'source' | 'reason' | 'offlineFallbackAllowed' | 'progressCreditAllowed' | 'rollbackMode'
> {
  return {
    contractVersion: COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
    state,
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
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackRuntimePolicyRouteShim() {
  return null;
}
