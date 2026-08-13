import { buildCoursePackCacheKey, validateCoursePackManifest, type CoursePackManifest } from './course_pack_manifest';
import {
  COURSE_PACK_DISABLED_MANIFEST_PREFLIGHT_SCHEMA_VERSION,
  type CoursePackDisabledManifestPreflightReport,
} from './course_pack_manifest_registry_preflight';
import {
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT,
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
  validateDisabledCoursePackRuntimeContract,
} from './course_pack_runtime_policy';
import { COURSE_PACK_REMOTE_LOADING_ENABLED } from './course_pack_loader';

export const COURSE_PACK_DISABLED_RUNTIME_MANIFEST_CANDIDATE_SCHEMA_VERSION = 'course-pack-disabled-runtime-manifest-candidate-v1' as const;

export type CoursePackDisabledRuntimeManifestEvidence = {
  remoteVerifyStatus: 'PASS' | 'HOLD';
  serverShadowDualReadStatus: 'PASS' | 'HOLD';
  serverShadowParityVerdict: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  disabledManifestPreflightStatus: 'PASS' | 'HOLD';
};

export type CoursePackDisabledRuntimeManifestCandidateInput = {
  manifest: CoursePackManifest;
  disabledManifestPreflight: CoursePackDisabledManifestPreflightReport;
  activationApproved: boolean;
  runtimeManifestRegistrationApproved: boolean;
  runtimeLookupApproved: boolean;
  manifestFetchApproved: boolean;
  packDownloadApproved: boolean;
  cacheLookupApproved: boolean;
  cacheReadApproved: boolean;
  cacheWriteApproved: boolean;
  cacheRepairApproved: boolean;
  storageMigrationApproved: boolean;
  bundledContentRemovalApproved: boolean;
  productionActivationApproved: boolean;
  evidence: CoursePackDisabledRuntimeManifestEvidence;
};

export type CoursePackDisabledRuntimeManifestCandidateReport = {
  schemaVersion: typeof COURSE_PACK_DISABLED_RUNTIME_MANIFEST_CANDIDATE_SCHEMA_VERSION;
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
  evidenceBundleComplete: boolean;
  activationApproved: false;
  runtimeManifestRegistrationApproved: false;
  runtimeLookupApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheLookupApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  runtimeManifestRegistrable: false;
  runtimeManifestRegistered: false;
  runtimeLookupAllowed: false;
  cacheLookupAllowed: false;
  cacheReadAllowed: false;
  cacheWriteAllowed: false;
  startupBlockingAllowed: false;
  bundledCompatibilityRollbackRequired: true;
  explicitActivationGateRequired: true;
  blockers: string[];
};

export function evaluateDisabledCoursePackRuntimeManifestCandidate(
  input: CoursePackDisabledRuntimeManifestCandidateInput,
): CoursePackDisabledRuntimeManifestCandidateReport {
  const blockers: string[] = [];
  const manifestValidation = validateCoursePackManifest(input.manifest);
  blockers.push(...manifestValidation.errors.map((error) => `manifest: ${error}`));
  blockers.push(...validateDisabledCoursePackRuntimeContract(COURSE_PACK_DISABLED_RUNTIME_CONTRACT));
  blockers.push(...validateDisabledPreflight(input.manifest, input.disabledManifestPreflight));

  let expectedCacheKey: string | null = null;
  if (manifestValidation.ok) {
    try {
      expectedCacheKey = buildCoursePackCacheKey(input.manifest);
      if (input.disabledManifestPreflight.cacheKey !== expectedCacheKey) {
        blockers.push('disabled preflight cacheKey must match manifest-derived cache key');
      }
    } catch (error) {
      blockers.push(`cache key build failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (COURSE_PACK_REMOTE_LOADING_ENABLED !== false) {
    blockers.push('COURSE_PACK_REMOTE_LOADING_ENABLED must remain false');
  }
  if (input.manifest.surface !== 'plan_content') {
    blockers.push('disabled runtime manifest candidate is currently limited to plan_content');
  }
  if (input.activationApproved !== false) {
    blockers.push('activationApproved must remain false');
  }
  if (input.runtimeManifestRegistrationApproved !== false) {
    blockers.push('runtimeManifestRegistrationApproved must remain false');
  }
  if (input.runtimeLookupApproved !== false) {
    blockers.push('runtimeLookupApproved must remain false');
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

  return {
    schemaVersion: COURSE_PACK_DISABLED_RUNTIME_MANIFEST_CANDIDATE_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    packId: input.manifest.packId,
    studyTarget: input.manifest.studyTarget,
    sourceLocale: input.manifest.sourceLocale,
    surface: input.manifest.surface,
    contentVersion: input.manifest.contentVersion,
    cacheKey: input.disabledManifestPreflight.cacheKey,
    expectedCacheKey,
    runtimeContractVersion: COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
    remoteLoadingEnabled: false,
    evidenceBundleComplete: blockers.length === 0,
    activationApproved: false,
    runtimeManifestRegistrationApproved: false,
    runtimeLookupApproved: false,
    manifestFetchApproved: false,
    packDownloadApproved: false,
    cacheLookupApproved: false,
    cacheReadApproved: false,
    cacheWriteApproved: false,
    cacheRepairApproved: false,
    storageMigrationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    runtimeManifestRegistrable: false,
    runtimeManifestRegistered: false,
    runtimeLookupAllowed: false,
    cacheLookupAllowed: false,
    cacheReadAllowed: false,
    cacheWriteAllowed: false,
    startupBlockingAllowed: false,
    bundledCompatibilityRollbackRequired: true,
    explicitActivationGateRequired: true,
    blockers,
  };
}

function validateDisabledPreflight(
  manifest: CoursePackManifest,
  preflight: CoursePackDisabledManifestPreflightReport,
): string[] {
  const errors: string[] = [];
  if (preflight.schemaVersion !== COURSE_PACK_DISABLED_MANIFEST_PREFLIGHT_SCHEMA_VERSION) {
    errors.push('disabled preflight schemaVersion mismatch');
  }
  if (preflight.status !== 'PASS') {
    errors.push('disabled preflight status must be PASS');
  }
  if (preflight.packId !== manifest.packId) {
    errors.push('disabled preflight packId must match manifest');
  }
  if (preflight.studyTarget !== manifest.studyTarget) {
    errors.push('disabled preflight studyTarget must match manifest');
  }
  if (preflight.sourceLocale !== manifest.sourceLocale) {
    errors.push('disabled preflight sourceLocale must match manifest');
  }
  if (preflight.surface !== manifest.surface) {
    errors.push('disabled preflight surface must match manifest');
  }
  if (preflight.contentVersion !== manifest.contentVersion) {
    errors.push('disabled preflight contentVersion must match manifest');
  }
  if (preflight.remoteLoadingEnabled !== false) {
    errors.push('disabled preflight remoteLoadingEnabled must remain false');
  }
  if (preflight.runtimeManifestRegistrationApproved !== false) {
    errors.push('disabled preflight runtimeManifestRegistrationApproved must remain false');
  }
  if (preflight.manifestFetchApproved !== false) {
    errors.push('disabled preflight manifestFetchApproved must remain false');
  }
  if (preflight.packDownloadApproved !== false) {
    errors.push('disabled preflight packDownloadApproved must remain false');
  }
  if (preflight.cacheReadApproved !== false) {
    errors.push('disabled preflight cacheReadApproved must remain false');
  }
  if (preflight.cacheWriteApproved !== false) {
    errors.push('disabled preflight cacheWriteApproved must remain false');
  }
  if (preflight.registryEntryAllowed !== false) {
    errors.push('disabled preflight registryEntryAllowed must remain false');
  }
  if (preflight.cacheMetadataReadableByRuntime !== false) {
    errors.push('disabled preflight cacheMetadataReadableByRuntime must remain false');
  }
  if (preflight.cacheMetadataWritableByRuntime !== false) {
    errors.push('disabled preflight cacheMetadataWritableByRuntime must remain false');
  }
  if (preflight.startupBlockingAllowed !== false) {
    errors.push('disabled preflight startupBlockingAllowed must remain false');
  }
  if (preflight.offlineFallbackRequired !== true) {
    errors.push('disabled preflight offlineFallbackRequired must remain true');
  }
  if (preflight.blockers.length > 0) {
    errors.push('disabled preflight blockers must be empty');
  }
  return errors;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackRuntimeManifestCandidateRouteShim() {
  return null;
}
