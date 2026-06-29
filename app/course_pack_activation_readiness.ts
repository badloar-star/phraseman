import type { CoursePackManifest } from './course_pack_manifest';
import { COURSE_PACK_REMOTE_LOADING_ENABLED } from './course_pack_loader';

export const COURSE_PACK_ACTIVATION_READINESS_SCHEMA_VERSION = 'course-pack-activation-readiness-v1' as const;

export type CoursePackActivationGateStatus = 'pass' | 'blocked';

export type CoursePackActivationGateId =
  | 'remote_shadow_upload_verified'
  | 'server_shadow_dual_read_parity'
  | 'disabled_manifest_registry_preflight'
  | 'disabled_runtime_manifest_candidate'
  | 'reviewer_approval'
  | 'locale_gate_approval'
  | 'offline_cache_integrity'
  | 'rollback_kill_switch'
  | 'startup_no_fetch_guard'
  | 'storage_cloud_isolation'
  | 'target_manifest_summary_in_sync'
  | 'runtime_manifest_still_disabled'
  | 'remote_loading_still_disabled'
  | 'bundled_content_retained'
  | 'product_owner_activation_approval';

export type CoursePackActivationGate = {
  id: CoursePackActivationGateId;
  status: CoursePackActivationGateStatus;
  detail: string;
};

export type CoursePackActivationReadinessInput = {
  manifest: CoursePackManifest;
  remoteVerifyStatus: 'PASS' | 'HOLD';
  serverShadowDualReadStatus: 'PASS' | 'HOLD';
  serverShadowParityVerdict: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  disabledManifestPreflightStatus: 'PASS' | 'HOLD';
  disabledRuntimeCandidateStatus: 'PASS' | 'HOLD';
  runtimeManifestRegistrable: boolean;
  remoteLoadingEnabled: boolean;
  activationApproved: boolean;
  bundledContentRemoved: boolean;
  reviewerApprovedRows: number;
  reviewedRows: number;
  localePassedRows: number;
  startupNoFetchGuardPassed: boolean;
  offlineCacheIntegrityPassed: boolean;
  rollbackKillSwitchPassed: boolean;
  storageCloudIsolationPassed: boolean;
  targetManifestSummaryInSync?: boolean;
  productOwnerActivationApproved: boolean;
};

export type CoursePackActivationReadinessReport = {
  schemaVersion: typeof COURSE_PACK_ACTIVATION_READINESS_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  activationApproved: false;
  remoteLoadingEnabled: false;
  runtimeManifestRegistrable: false;
  bundledContentRemoved: false;
  completedGateCount: number;
  blockedGateCount: number;
  gates: CoursePackActivationGate[];
  blockers: string[];
};

export function evaluateCoursePackActivationReadiness(
  input: CoursePackActivationReadinessInput,
): CoursePackActivationReadinessReport {
  const gates: CoursePackActivationGate[] = [
    gate(
      'remote_shadow_upload_verified',
      input.remoteVerifyStatus === 'PASS',
      input.remoteVerifyStatus === 'PASS'
        ? 'Remote staging/shadow upload has been verified by object count, byte size and sha256 evidence.'
        : 'Remote staging/shadow verification must pass.',
    ),
    gate(
      'server_shadow_dual_read_parity',
      input.serverShadowDualReadStatus === 'PASS' && input.serverShadowParityVerdict === 'shadow_parity_passed',
      input.serverShadowDualReadStatus === 'PASS' && input.serverShadowParityVerdict === 'shadow_parity_passed'
        ? 'Server-shadow content matches bundled compatibility and adapter output.'
        : 'Server-shadow dual-read parity must pass.',
    ),
    gate(
      'disabled_manifest_registry_preflight',
      input.disabledManifestPreflightStatus === 'PASS',
      input.disabledManifestPreflightStatus === 'PASS'
        ? 'Manifest registry/cache metadata preflight passed while runtime/cache permissions remain disabled.'
        : 'Disabled manifest registry/cache preflight must pass.',
    ),
    gate(
      'disabled_runtime_manifest_candidate',
      input.disabledRuntimeCandidateStatus === 'PASS' && input.runtimeManifestRegistrable === false,
      input.disabledRuntimeCandidateStatus === 'PASS' && input.runtimeManifestRegistrable === false
        ? 'Runtime manifest candidate evidence is complete but remains non-registrable.'
        : 'Runtime manifest candidate must pass while remaining non-registrable.',
    ),
    gate(
      'reviewer_approval',
      input.reviewedRows > 0 && input.reviewerApprovedRows === input.reviewedRows,
      `Reviewer approval required for every row. Approved ${input.reviewerApprovedRows}/${input.reviewedRows}.`,
    ),
    gate(
      'locale_gate_approval',
      input.reviewedRows > 0 && input.localePassedRows === input.reviewedRows,
      `Locale gates must pass for every row. Passed ${input.localePassedRows}/${input.reviewedRows}.`,
    ),
    gate(
      'offline_cache_integrity',
      input.offlineCacheIntegrityPassed,
      input.offlineCacheIntegrityPassed
        ? 'Offline cache integrity evidence exists.'
        : 'Offline cache integrity gate is still missing.',
    ),
    gate(
      'rollback_kill_switch',
      input.rollbackKillSwitchPassed,
      input.rollbackKillSwitchPassed
        ? 'Rollback kill-switch evidence exists.'
        : 'Rollback kill-switch gate is still missing.',
    ),
    gate(
      'startup_no_fetch_guard',
      input.startupNoFetchGuardPassed,
      input.startupNoFetchGuardPassed
        ? 'Startup/onboarding no-fetch guard passed.'
        : 'Startup/onboarding no-fetch guard must pass.',
    ),
    gate(
      'storage_cloud_isolation',
      input.storageCloudIsolationPassed,
      input.storageCloudIsolationPassed
        ? 'Storage/cloud isolation evidence exists.'
        : 'Storage/cloud isolation gate is still missing.',
    ),
    gate(
      'target_manifest_summary_in_sync',
      input.targetManifestSummaryInSync !== false,
      input.targetManifestSummaryInSync !== false
        ? 'Target pack manifest summary matches the current runtime slices, server manifest draft and activation blockers.'
        : 'Target pack manifest summary must be refreshed after payload/server/storage evidence changes.',
    ),
    gate(
      'runtime_manifest_still_disabled',
      input.runtimeManifestRegistrable === false && input.activationApproved === false,
      'Runtime manifest remains non-registrable until explicit activation approval exists.',
    ),
    gate(
      'remote_loading_still_disabled',
      input.remoteLoadingEnabled === false,
      'Remote loading flag remains false until all activation gates pass.',
    ),
    gate(
      'bundled_content_retained',
      input.bundledContentRemoved === false,
      'Bundled content remains in the app until a later explicit removal pass.',
    ),
    gate(
      'product_owner_activation_approval',
      input.productOwnerActivationApproved,
      input.productOwnerActivationApproved
        ? 'Product-owner activation approval is present.'
        : 'Product-owner activation approval is still missing.',
    ),
  ];
  const blockers = gates
    .filter((entry) => entry.status === 'blocked')
    .map((entry) => `${entry.id}: ${entry.detail}`);
  const completedGateCount = gates.length - blockers.length;

  return {
    schemaVersion: COURSE_PACK_ACTIVATION_READINESS_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    packId: input.manifest.packId,
    studyTarget: input.manifest.studyTarget,
    sourceLocale: input.manifest.sourceLocale,
    surface: input.manifest.surface,
    contentVersion: input.manifest.contentVersion,
    activationApproved: false,
    remoteLoadingEnabled: false,
    runtimeManifestRegistrable: false,
    bundledContentRemoved: false,
    completedGateCount,
    blockedGateCount: blockers.length,
    gates,
    blockers,
  };
}

export function buildCurrentDisabledActivationInput(
  input: Omit<
    CoursePackActivationReadinessInput,
    'remoteLoadingEnabled' | 'activationApproved' | 'bundledContentRemoved'
  >,
): CoursePackActivationReadinessInput {
  return {
    ...input,
    remoteLoadingEnabled: COURSE_PACK_REMOTE_LOADING_ENABLED,
    activationApproved: false,
    bundledContentRemoved: false,
  };
}

function gate(id: CoursePackActivationGateId, passed: boolean, detail: string): CoursePackActivationGate {
  return {
    id,
    status: passed ? 'pass' : 'blocked',
    detail,
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackActivationReadinessRouteShim() {
  return null;
}
