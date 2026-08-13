import { validateCoursePackManifest, type CoursePackManifest } from './course_pack_manifest';
import {
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT,
  COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
  validateDisabledCoursePackRuntimeContract,
  type CoursePackRollbackMode,
} from './course_pack_runtime_policy';
import { COURSE_PACK_REMOTE_LOADING_ENABLED } from './course_pack_loader';

export const COURSE_PACK_DISABLED_ROLLBACK_KILL_SWITCH_SCHEMA_VERSION = 'course-pack-disabled-rollback-kill-switch-v1' as const;

export type CoursePackDisabledRollbackKillSwitchEvidence = {
  remoteVerifyStatus: 'PASS' | 'HOLD';
  serverShadowDualReadStatus: 'PASS' | 'HOLD';
  serverShadowParityVerdict: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  disabledManifestPreflightStatus: 'PASS' | 'HOLD';
  disabledRuntimeCandidateStatus: 'PASS' | 'HOLD';
  disabledOfflineCacheIntegrityStatus: 'PASS' | 'HOLD';
  offlineCacheUsableByRuntime: boolean;
  runtimeManifestRegistrable: boolean;
  activationReadinessStatus: 'PASS' | 'HOLD';
};

export type CoursePackDisabledRollbackKillSwitchInput = {
  manifest: CoursePackManifest;
  rollbackMode: CoursePackRollbackMode;
  rollbackForcesBundledCompatibility: boolean;
  rollbackRequiresAppUpdate: boolean;
  rollbackDeletesUserProgress: boolean;
  rollbackMutatesStorageOrCloud: boolean;
  rollbackDownloadsPack: boolean;
  rollbackReadsCache: boolean;
  rollbackWritesCache: boolean;
  rollbackRepairsCache: boolean;
  activationApproved: boolean;
  runtimeManifestRegistrationApproved: boolean;
  runtimeLookupApproved: boolean;
  remoteLoadingApproved: boolean;
  manifestFetchApproved: boolean;
  packDownloadApproved: boolean;
  cacheLookupApproved: boolean;
  cacheReadApproved: boolean;
  cacheWriteApproved: boolean;
  cacheRepairApproved: boolean;
  storageMigrationApproved: boolean;
  bundledContentRemovalApproved: boolean;
  productionActivationApproved: boolean;
  evidence: CoursePackDisabledRollbackKillSwitchEvidence;
};

export type CoursePackDisabledRollbackKillSwitchReport = {
  schemaVersion: typeof COURSE_PACK_DISABLED_ROLLBACK_KILL_SWITCH_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  runtimeContractVersion: typeof COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION;
  remoteLoadingEnabled: false;
  activationApproved: false;
  runtimeManifestRegistrationApproved: false;
  runtimeLookupApproved: false;
  remoteLoadingApproved: false;
  manifestFetchApproved: false;
  packDownloadApproved: false;
  cacheLookupApproved: false;
  cacheReadApproved: false;
  cacheWriteApproved: false;
  cacheRepairApproved: false;
  storageMigrationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  rollbackEvidenceComplete: boolean;
  rollbackMode: CoursePackRollbackMode;
  rollbackForcesBundledCompatibility: boolean;
  rollbackRequiresAppUpdate: false;
  rollbackDeletesUserProgress: false;
  rollbackMutatesStorageOrCloud: false;
  rollbackDownloadsPack: false;
  rollbackReadsCache: false;
  rollbackWritesCache: false;
  rollbackRepairsCache: false;
  runtimeManifestRegistered: false;
  runtimeLookupAllowed: false;
  cacheLookupAllowed: false;
  cacheReadAllowed: false;
  cacheWriteAllowed: false;
  cacheRepairAllowed: false;
  startupBlockingAllowed: false;
  bundledCompatibilityRollbackAvailable: true;
  missingWithoutDownloadRollbackAvailable: true;
  blockers: string[];
};

export function evaluateDisabledCoursePackRollbackKillSwitch(
  input: CoursePackDisabledRollbackKillSwitchInput,
): CoursePackDisabledRollbackKillSwitchReport {
  const blockers: string[] = [];
  const manifestValidation = validateCoursePackManifest(input.manifest);
  blockers.push(...manifestValidation.errors.map((error) => `manifest: ${error}`));
  blockers.push(...validateDisabledCoursePackRuntimeContract(COURSE_PACK_DISABLED_RUNTIME_CONTRACT));

  if (COURSE_PACK_REMOTE_LOADING_ENABLED !== false) {
    blockers.push('COURSE_PACK_REMOTE_LOADING_ENABLED must remain false');
  }
  if (input.manifest.surface !== 'plan_content') {
    blockers.push('disabled rollback kill-switch is currently limited to plan_content');
  }
  if (!COURSE_PACK_DISABLED_RUNTIME_CONTRACT.rollbackModes.includes('bundled_compatibility')) {
    blockers.push('disabled runtime contract must include bundled_compatibility rollback');
  }
  if (!COURSE_PACK_DISABLED_RUNTIME_CONTRACT.rollbackModes.includes('missing_without_download')) {
    blockers.push('disabled runtime contract must include missing_without_download rollback');
  }
  if (input.rollbackMode !== 'bundled_compatibility') {
    blockers.push('rollbackMode must be bundled_compatibility for this staged pack');
  }
  if (input.rollbackForcesBundledCompatibility !== true) {
    blockers.push('rollbackForcesBundledCompatibility must be true');
  }
  if (input.rollbackRequiresAppUpdate !== false) {
    blockers.push('rollbackRequiresAppUpdate must remain false');
  }
  if (input.rollbackDeletesUserProgress !== false) {
    blockers.push('rollbackDeletesUserProgress must remain false');
  }
  if (input.rollbackMutatesStorageOrCloud !== false) {
    blockers.push('rollbackMutatesStorageOrCloud must remain false');
  }
  if (input.rollbackDownloadsPack !== false) {
    blockers.push('rollbackDownloadsPack must remain false');
  }
  if (input.rollbackReadsCache !== false) {
    blockers.push('rollbackReadsCache must remain false');
  }
  if (input.rollbackWritesCache !== false) {
    blockers.push('rollbackWritesCache must remain false');
  }
  if (input.rollbackRepairsCache !== false) {
    blockers.push('rollbackRepairsCache must remain false');
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
  if (input.remoteLoadingApproved !== false) {
    blockers.push('remoteLoadingApproved must remain false');
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
  if (input.evidence.disabledOfflineCacheIntegrityStatus !== 'PASS') {
    blockers.push('disabled offline cache integrity evidence must be PASS');
  }
  if (input.evidence.offlineCacheUsableByRuntime !== false) {
    blockers.push('offlineCacheUsableByRuntime must remain false');
  }
  if (input.evidence.runtimeManifestRegistrable !== false) {
    blockers.push('runtimeManifestRegistrable must remain false');
  }
  if (input.evidence.activationReadinessStatus !== 'HOLD' && input.evidence.activationReadinessStatus !== 'PASS') {
    blockers.push('activation readiness evidence must be HOLD or PASS');
  }

  return {
    schemaVersion: COURSE_PACK_DISABLED_ROLLBACK_KILL_SWITCH_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    packId: input.manifest.packId,
    studyTarget: input.manifest.studyTarget,
    sourceLocale: input.manifest.sourceLocale,
    surface: input.manifest.surface,
    contentVersion: input.manifest.contentVersion,
    runtimeContractVersion: COURSE_PACK_DISABLED_RUNTIME_CONTRACT_VERSION,
    remoteLoadingEnabled: false,
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
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    rollbackEvidenceComplete: blockers.length === 0,
    rollbackMode: input.rollbackMode,
    rollbackForcesBundledCompatibility: input.rollbackForcesBundledCompatibility,
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
    blockers,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackRollbackKillSwitchRouteShim() {
  return null;
}
