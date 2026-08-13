import {
  buildCoursePackCacheKey,
  validateCoursePackManifest,
  type CoursePackManifest,
} from './course_pack_manifest';
import {
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT,
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
  validateDisabledCoursePackRuntimeContract,
} from './course_pack_runtime_policy';
import { COURSE_PACK_REMOTE_LOADING_ENABLED } from './course_pack_loader';

export const COURSE_PACK_DISABLED_MANIFEST_PREFLIGHT_SCHEMA_VERSION = 'course-pack-disabled-manifest-preflight-v1' as const;

export type CoursePackDisabledManifestPreflightEvidence = {
  remoteVerifyStatus: 'PASS' | 'HOLD';
  serverShadowDualReadStatus: 'PASS' | 'HOLD';
  serverShadowParityVerdict: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
};

export type CoursePackDisabledManifestPreflightInput = {
  manifest: CoursePackManifest;
  cacheKey: string;
  serverShadowOnly: boolean;
  activationApproved: boolean;
  runtimeManifestRegistrationApproved: boolean;
  manifestFetchApproved: boolean;
  packDownloadApproved: boolean;
  cacheReadApproved: boolean;
  cacheWriteApproved: boolean;
  cacheRepairApproved: boolean;
  storageMigrationApproved: boolean;
  bundledContentRemovalApproved: boolean;
  productionActivationApproved: boolean;
  evidence: CoursePackDisabledManifestPreflightEvidence;
};

export type CoursePackDisabledManifestPreflightReport = {
  schemaVersion: typeof COURSE_PACK_DISABLED_MANIFEST_PREFLIGHT_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  cacheKey: string;
  expectedCacheKey: string | null;
  runtimeContractVersion: typeof COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION;
  remoteLoadingEnabled: false;
  serverShadowOnly: boolean;
  activationApproved: false;
  runtimeManifestRegistrationApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  registryEntryAllowed: false;
  cacheMetadataReadableByRuntime: false;
  cacheMetadataWritableByRuntime: false;
  startupBlockingAllowed: false;
  offlineFallbackRequired: true;
  blockers: string[];
};

export function evaluateDisabledCoursePackManifestPreflight(
  input: CoursePackDisabledManifestPreflightInput,
): CoursePackDisabledManifestPreflightReport {
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
    blockers.push('disabled manifest preflight is currently limited to plan_content');
  }
  if (input.serverShadowOnly !== true) {
    blockers.push('serverShadowOnly must be true');
  }
  if (input.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (input.runtimeManifestRegistrationApproved !== false) {
    blockers.push('runtimeManifestRegistrationApproved must remain false');
  }
  if (input.manifestFetchApproved !== false) {
    blockers.push('manifestFetchApproved must remain false');
  }
  if (input.packDownloadApproved !== false) {
    blockers.push('packDownloadApproved must remain false');
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

  return {
    schemaVersion: COURSE_PACK_DISABLED_MANIFEST_PREFLIGHT_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    packId: input.manifest.packId,
    studyTarget: input.manifest.studyTarget,
    sourceLocale: input.manifest.sourceLocale,
    surface: input.manifest.surface,
    contentVersion: input.manifest.contentVersion,
    cacheKey: input.cacheKey,
    expectedCacheKey,
    runtimeContractVersion: COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
    remoteLoadingEnabled: false,
    serverShadowOnly: input.serverShadowOnly,
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
    blockers,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackManifestRegistryPreflightRouteShim() {
  return null;
}
