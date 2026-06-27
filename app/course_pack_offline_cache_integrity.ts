import { buildCoursePackCacheKey, validateCoursePackManifest, type CoursePackManifest } from './course_pack_manifest';
import {
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT,
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
  validateDisabledCoursePackRuntimeContract,
} from './course_pack_runtime_policy';
import { COURSE_PACK_REMOTE_LOADING_ENABLED } from './course_pack_loader';

export const COURSE_PACK_DISABLED_OFFLINE_CACHE_INTEGRITY_SCHEMA_VERSION = 'course-pack-disabled-offline-cache-integrity-v1' as const;

export type CoursePackDisabledOfflineCacheIntegrityEvidence = {
  remoteVerifyStatus: 'PASS' | 'HOLD';
  serverShadowDualReadStatus: 'PASS' | 'HOLD';
  serverShadowParityVerdict: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  disabledManifestPreflightStatus: 'PASS' | 'HOLD';
  disabledRuntimeCandidateStatus: 'PASS' | 'HOLD';
  runtimeManifestRegistrable: boolean;
  expectedObjectCount: number;
  foundObjectCount: number;
  hashCheckedCount: number;
  missingObjectCount: number;
  sizeMismatchCount: number;
  sha256MismatchCount: number;
};

export type CoursePackDisabledOfflineCacheIntegrityInput = {
  manifest: CoursePackManifest;
  cacheKey: string;
  activationApproved: boolean;
  manifestFetchApproved: boolean;
  packDownloadApproved: boolean;
  cacheLookupApproved: boolean;
  cacheReadApproved: boolean;
  cacheWriteApproved: boolean;
  cacheRepairApproved: boolean;
  storageMigrationApproved: boolean;
  bundledContentRemovalApproved: boolean;
  productionActivationApproved: boolean;
  evidence: CoursePackDisabledOfflineCacheIntegrityEvidence;
};

export type CoursePackDisabledOfflineCacheIntegrityReport = {
  schemaVersion: typeof COURSE_PACK_DISABLED_OFFLINE_CACHE_INTEGRITY_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  cacheKey: string;
  expectedCacheKey: string | null;
  manifestSha256: string;
  manifestByteSize: number;
  runtimeContractVersion: typeof COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION;
  remoteLoadingEnabled: false;
  activationApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheLookupApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  expectedObjectCount: number;
  foundObjectCount: number;
  hashCheckedCount: number;
  missingObjectCount: number;
  sizeMismatchCount: number;
  sha256MismatchCount: number;
  cacheIntegrityEvidenceComplete: boolean;
  offlineCacheUsableByRuntime: false;
  cacheLookupAllowed: false;
  cacheReadAllowed: false;
  cacheWriteAllowed: false;
  cacheRepairAllowed: false;
  startupBlockingAllowed: false;
  blockers: string[];
};

export function evaluateDisabledCoursePackOfflineCacheIntegrity(
  input: CoursePackDisabledOfflineCacheIntegrityInput,
): CoursePackDisabledOfflineCacheIntegrityReport {
  const blockers: string[] = [];
  const manifestValidation = validateCoursePackManifest(input.manifest);
  blockers.push(...manifestValidation.errors.map((error) => `manifest: ${error}`));
  blockers.push(...validateDisabledCoursePackRuntimeContract(COURSE_PACK_DISABLED_RUNTIME_CONTRACT));

  let expectedCacheKey: string | null = null;
  if (manifestValidation.ok) {
    try {
      expectedCacheKey = buildCoursePackCacheKey(input.manifest);
      if (input.cacheKey !== expectedCacheKey) {
        blockers.push('cacheKey must match manifest-derived cache key');
      }
    } catch (error) {
      blockers.push(`cache key build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (COURSE_PACK_REMOTE_LOADING_ENABLED !== false) {
    blockers.push('COURSE_PACK_REMOTE_LOADING_ENABLED must remain false');
  }
  if (input.manifest.surface !== 'plan_content') {
    blockers.push('disabled offline cache integrity is currently limited to plan_content');
  }
  if (input.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (input.manifestFetchApproved !== false) {
    blockers.push('manifestFetchApproved must remain false');
  }
  if (input.packDownloadApproved !== false) {
    blockers.push('packDownloadApproved must remain false');
  }
  if (input.cacheLookupApproved !== false) {
    blockers.push('cacheLookupApproved must remain false');
  }
  if (input.cacheReadApproved !== false) {
    blockers.push('cacheReadApproved must remain false');
  }
  if (input.cacheWriteApproved !== false) {
    blockers.push('cacheWriteApproved must remain false');
  }
  if (input.cacheRepairApproved !== false) {
    blockers.push('cacheRepairApproved must remain false');
  }
  if (input.storageMigrationApproved !== false) {
    blockers.push('storageMigrationApproved must remain false');
  }
  if (input.bundledContentRemovalApproved !== false) {
    blockers.push('bundledContentRemovalApproved must remain false');
  }
  if (input.productionActivationApproved !== false) {
    blockers.push('productionActivationApproved must remain false');
  }
  if (input.evidence.remoteVerifyStatus !== 'PASS') {
    blockers.push('remote verification evidence must be PASS');
  }
  if (input.evidence.serverShadowDualReadStatus !== 'PASS') {
    blockers.push('server-shadow dual-read evidence must be PASS');
  }
  if (input.evidence.serverShadowParityVerdict !== 'shadow_parity_passed') {
    blockers.push('server-shadow parity verdict must be shadow_parity_passed');
  }
  if (input.evidence.disabledManifestPreflightStatus !== 'PASS') {
    blockers.push('disabled manifest preflight evidence must be PASS');
  }
  if (input.evidence.disabledRuntimeCandidateStatus !== 'PASS') {
    blockers.push('disabled runtime manifest candidate evidence must be PASS');
  }
  if (input.evidence.runtimeManifestRegistrable !== false) {
    blockers.push('runtimeManifestRegistrable must remain false');
  }
  if (!isPositiveSafeInteger(input.evidence.expectedObjectCount)) {
    blockers.push('expectedObjectCount must be a positive safe integer');
  }
  if (input.evidence.foundObjectCount !== input.evidence.expectedObjectCount) {
    blockers.push('foundObjectCount must match expectedObjectCount');
  }
  if (input.evidence.hashCheckedCount !== input.evidence.expectedObjectCount) {
    blockers.push('hashCheckedCount must match expectedObjectCount');
  }
  if (input.evidence.missingObjectCount !== 0) {
    blockers.push('missingObjectCount must be zero');
  }
  if (input.evidence.sizeMismatchCount !== 0) {
    blockers.push('sizeMismatchCount must be zero');
  }
  if (input.evidence.sha256MismatchCount !== 0) {
    blockers.push('sha256MismatchCount must be zero');
  }

  return {
    schemaVersion: COURSE_PACK_DISABLED_OFFLINE_CACHE_INTEGRITY_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    packId: input.manifest.packId,
    studyTarget: input.manifest.studyTarget,
    sourceLocale: input.manifest.sourceLocale,
    surface: input.manifest.surface,
    contentVersion: input.manifest.contentVersion,
    cacheKey: input.cacheKey,
    expectedCacheKey,
    manifestSha256: input.manifest.sha256,
    manifestByteSize: input.manifest.byteSize,
    runtimeContractVersion: COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
    remoteLoadingEnabled: false,
    activationApproved: false,
    manifestFetchApproved: false,
    packDownloadApproved: false,
    cacheLookupApproved: false,
    cacheReadApproved: false,
    cacheWriteApproved: false,
    cacheRepairApproved: false,
    storageMigrationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    expectedObjectCount: input.evidence.expectedObjectCount,
    foundObjectCount: input.evidence.foundObjectCount,
    hashCheckedCount: input.evidence.hashCheckedCount,
    missingObjectCount: input.evidence.missingObjectCount,
    sizeMismatchCount: input.evidence.sizeMismatchCount,
    sha256MismatchCount: input.evidence.sha256MismatchCount,
    cacheIntegrityEvidenceComplete: blockers.length === 0,
    offlineCacheUsableByRuntime: false,
    cacheLookupAllowed: false,
    cacheReadAllowed: false,
    cacheWriteAllowed: false,
    cacheRepairAllowed: false,
    startupBlockingAllowed: false,
    blockers,
  };
}

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackOfflineCacheIntegrityRouteShim() {
  return null;
}
