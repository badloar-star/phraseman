import { validateCoursePackManifest, type CoursePackManifest } from './course_pack_manifest';
import { COURSE_PACK_REMOTE_LOADING_ENABLED } from './course_pack_loader';
import {
  PLAN_CONTENT_LOCALE_GATE_STATUSES,
  PLAN_CONTENT_REVIEW_STATUSES,
  type PlanContentLocaleGateStatus,
  type PlanContentPackIndexEntry,
  type PlanContentReviewStatus,
} from './plan_content_pack_index';

export const COURSE_PACK_REVIEWER_LOCALE_INTAKE_SCHEMA_VERSION = 'course-pack-reviewer-locale-intake-v1' as const;

export type CoursePackReviewerLocaleRowRef = {
  planId: string;
  dayIndex: number;
  contentHash: string;
  path: string;
};

export type CoursePackReviewerLocaleDecision = {
  planId: string;
  dayIndex: number;
  contentHash: string;
  studyTarget: string;
  sourceLocale: string;
  reviewerStatus: PlanContentReviewStatus;
  localeGateStatus: PlanContentLocaleGateStatus;
  reviewerEvidenceId?: string;
  localeEvidenceId?: string;
};

export type CoursePackReviewerLocaleIntakeEvidence = {
  serverShadowDualReadStatus: 'PASS' | 'HOLD';
  serverShadowParityVerdict: 'shadow_parity_passed' | 'hold' | 'activation_candidate';
  serverShadowRowsRead: number;
  serverShadowReviewerApprovedRows: number;
  serverShadowLocalePassedRows: number;
  storageCloudIsolationStatus: 'PASS' | 'HOLD';
  storageCloudIsolationComplete: boolean;
  indexRows: CoursePackReviewerLocaleRow[];
  explicitApprovalArtifactPresent: boolean;
  explicitDecisions: CoursePackReviewerLocaleDecision[];
};

export type CoursePackReviewerLocaleRow = Pick<
  PlanContentPackIndexEntry,
  | 'planId'
  | 'dayIndex'
  | 'path'
  | 'contentHash'
  | 'sourceLocale'
  | 'studyTarget'
  | 'reviewStatus'
  | 'localeGateStatus'
  | 'schemaVersion'
>;

export type CoursePackReviewerLocaleIntakeInput = {
  manifest: CoursePackManifest;
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
  cloudRestoreRewriteApproved: boolean;
  studyTargetMutationApproved: boolean;
  sourceLocaleMutationApproved: boolean;
  bundledContentRemovalApproved: boolean;
  productionActivationApproved: boolean;
  evidence: CoursePackReviewerLocaleIntakeEvidence;
};

export type CoursePackReviewerLocaleIntakeReport = {
  schemaVersion: typeof COURSE_PACK_REVIEWER_LOCALE_INTAKE_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  safetyStatus: 'PASS' | 'HOLD';
  approvalStatus: 'PASS' | 'HOLD';
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
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
  cloudRestoreRewriteApproved: false;
  studyTargetMutationApproved: false;
  sourceLocaleMutationApproved: false;
  bundledContentRemovalApproved: false;
  productionActivationApproved: false;
  totalRows: number;
  serverShadowRowsRead: number;
  explicitApprovalArtifactPresent: boolean;
  explicitDecisionRows: number;
  reviewerApprovedRows: number;
  localePassedRows: number;
  shadowReviewStatusCounts: Record<PlanContentReviewStatus, number>;
  shadowLocaleGateStatusCounts: Record<PlanContentLocaleGateStatus, number>;
  shadowReviewerApprovedRows: number;
  shadowLocalePassedRows: number;
  shadowAutoApprovalDetected: boolean;
  reviewerLocaleApprovalComplete: boolean;
  missingReviewerApprovalRows: CoursePackReviewerLocaleRowRef[];
  missingLocaleGateRows: CoursePackReviewerLocaleRowRef[];
  safetyBlockers: string[];
  approvalBlockers: string[];
  blockers: string[];
};

export function evaluateCoursePackReviewerLocaleIntake(
  input: CoursePackReviewerLocaleIntakeInput,
): CoursePackReviewerLocaleIntakeReport {
  const safetyBlockers: string[] = [];
  const approvalBlockers: string[] = [];
  const manifestValidation = validateCoursePackManifest(input.manifest);
  safetyBlockers.push(...manifestValidation.errors.map((error) => `manifest: ${error}`));

  if (COURSE_PACK_REMOTE_LOADING_ENABLED !== false) {
    safetyBlockers.push('COURSE_PACK_REMOTE_LOADING_ENABLED must remain false');
  }
  if (input.manifest.surface !== 'plan_content') {
    safetyBlockers.push('reviewer/locale intake is currently limited to plan_content');
  }

  const falseFlags: Array<[string, boolean]> = [
    ['activationApproved', input.activationApproved],
    ['runtimeManifestRegistrationApproved', input.runtimeManifestRegistrationApproved],
    ['runtimeLookupApproved', input.runtimeLookupApproved],
    ['remoteLoadingApproved', input.remoteLoadingApproved],
    ['manifestFetchApproved', input.manifestFetchApproved],
    ['packDownloadApproved', input.packDownloadApproved],
    ['cacheLookupApproved', input.cacheLookupApproved],
    ['cacheReadApproved', input.cacheReadApproved],
    ['cacheWriteApproved', input.cacheWriteApproved],
    ['cacheRepairApproved', input.cacheRepairApproved],
    ['storageMigrationApproved', input.storageMigrationApproved],
    ['cloudRestoreRewriteApproved', input.cloudRestoreRewriteApproved],
    ['studyTargetMutationApproved', input.studyTargetMutationApproved],
    ['sourceLocaleMutationApproved', input.sourceLocaleMutationApproved],
    ['bundledContentRemovalApproved', input.bundledContentRemovalApproved],
    ['productionActivationApproved', input.productionActivationApproved],
  ];
  for (const [label, value] of falseFlags) {
    if (value !== false) safetyBlockers.push(`${label} must remain false`);
  }

  if (input.evidence.serverShadowDualReadStatus !== 'PASS') {
    safetyBlockers.push('server-shadow dual-read evidence must be PASS');
  }
  if (input.evidence.serverShadowParityVerdict !== 'shadow_parity_passed') {
    safetyBlockers.push('server-shadow parity verdict must be shadow_parity_passed');
  }
  if (input.evidence.storageCloudIsolationStatus !== 'PASS') {
    safetyBlockers.push('disabled storage/cloud isolation evidence must be PASS');
  }
  if (input.evidence.storageCloudIsolationComplete !== true) {
    safetyBlockers.push('disabled storage/cloud isolation must be complete before reviewer/locale intake');
  }

  const rows = input.evidence.indexRows;
  if (rows.length === 0) {
    safetyBlockers.push('plan-content index rows must be present');
  }
  if (input.evidence.serverShadowRowsRead !== rows.length) {
    safetyBlockers.push('server-shadow rows read must match index row count');
  }
  if (input.evidence.serverShadowReviewerApprovedRows > 0) {
    safetyBlockers.push('server-shadow reviewer summary must not be used as explicit reviewer approval');
  }
  if (input.evidence.serverShadowLocalePassedRows > 0) {
    safetyBlockers.push('server-shadow locale summary must not be used as explicit locale approval');
  }

  const rowsByKey = new Map<string, CoursePackReviewerLocaleRow>();
  const shadowReviewStatusCounts = emptyReviewCounts();
  const shadowLocaleGateStatusCounts = emptyLocaleCounts();
  for (const row of rows) {
    const key = rowKey(row.planId, row.dayIndex);
    if (rowsByKey.has(key)) {
      safetyBlockers.push(`duplicate plan-content row ${key}`);
    }
    rowsByKey.set(key, row);
    if (row.studyTarget !== input.manifest.studyTarget) {
      safetyBlockers.push(`${key} studyTarget must match manifest`);
    }
    if (row.sourceLocale !== input.manifest.sourceLocale) {
      safetyBlockers.push(`${key} sourceLocale must match manifest`);
    }
    if (isPlanContentReviewStatus(row.reviewStatus)) {
      shadowReviewStatusCounts[row.reviewStatus] += 1;
    } else {
      safetyBlockers.push(`${key} reviewStatus must be known`);
    }
    if (isPlanContentLocaleGateStatus(row.localeGateStatus)) {
      shadowLocaleGateStatusCounts[row.localeGateStatus] += 1;
    } else {
      safetyBlockers.push(`${key} localeGateStatus must be known`);
    }
  }

  const decisionsByKey = new Map<string, CoursePackReviewerLocaleDecision>();
  for (const decision of input.evidence.explicitDecisions) {
    const key = rowKey(decision.planId, decision.dayIndex);
    const row = rowsByKey.get(key);
    if (decisionsByKey.has(key)) {
      safetyBlockers.push(`duplicate explicit reviewer/locale decision ${key}`);
    }
    decisionsByKey.set(key, decision);
    if (!row) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} is not in index`);
      continue;
    }
    if (decision.contentHash !== row.contentHash) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} contentHash must match index`);
    }
    if (decision.studyTarget !== input.manifest.studyTarget) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} studyTarget must match manifest`);
    }
    if (decision.sourceLocale !== input.manifest.sourceLocale) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} sourceLocale must match manifest`);
    }
    if (!isPlanContentReviewStatus(decision.reviewerStatus)) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} reviewerStatus must be known`);
    } else if (decision.reviewerStatus === 'shadow') {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} reviewerStatus cannot be shadow`);
    }
    if (!isPlanContentLocaleGateStatus(decision.localeGateStatus)) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} localeGateStatus must be known`);
    }
    if (decision.reviewerStatus === 'approved' && !hasText(decision.reviewerEvidenceId)) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} approved reviewerStatus requires reviewerEvidenceId`);
    }
    if (decision.localeGateStatus === 'passed' && !hasText(decision.localeEvidenceId)) {
      safetyBlockers.push(`explicit reviewer/locale decision ${key} passed localeGateStatus requires localeEvidenceId`);
    }
  }

  const missingReviewerApprovalRows: CoursePackReviewerLocaleRowRef[] = [];
  const missingLocaleGateRows: CoursePackReviewerLocaleRowRef[] = [];
  let reviewerApprovedRows = 0;
  let localePassedRows = 0;
  let shadowAutoApprovalDetected = false;

  for (const row of rows) {
    const key = rowKey(row.planId, row.dayIndex);
    const decision = decisionsByKey.get(key);
    const reviewerApproved = decision?.reviewerStatus === 'approved';
    const localePassed = decision?.localeGateStatus === 'passed';

    if (row.reviewStatus === 'approved') {
      shadowAutoApprovalDetected = true;
      safetyBlockers.push(`${key} has approved shadow review status; approvals must come from explicit reviewer artifact`);
    }
    if (row.localeGateStatus === 'passed') {
      shadowAutoApprovalDetected = true;
      safetyBlockers.push(`${key} has passed shadow locale status; locale passes must come from explicit locale artifact`);
    }

    if (reviewerApproved) {
      reviewerApprovedRows += 1;
    } else {
      missingReviewerApprovalRows.push(rowRef(row));
    }
    if (localePassed) {
      localePassedRows += 1;
    } else {
      missingLocaleGateRows.push(rowRef(row));
    }
  }

  if (reviewerApprovedRows !== rows.length) {
    approvalBlockers.push(`reviewer approval required for every row: approved ${reviewerApprovedRows}/${rows.length}`);
  }
  if (localePassedRows !== rows.length) {
    approvalBlockers.push(`locale gate required for every row: passed ${localePassedRows}/${rows.length}`);
  }

  const reviewerLocaleApprovalComplete = safetyBlockers.length === 0
    && approvalBlockers.length === 0
    && rows.length > 0;
  const blockers = [...safetyBlockers, ...approvalBlockers];

  return {
    schemaVersion: COURSE_PACK_REVIEWER_LOCALE_INTAKE_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    safetyStatus: safetyBlockers.length === 0 ? 'PASS' : 'HOLD',
    approvalStatus: approvalBlockers.length === 0 && rows.length > 0 ? 'PASS' : 'HOLD',
    packId: input.manifest.packId,
    studyTarget: input.manifest.studyTarget,
    sourceLocale: input.manifest.sourceLocale,
    surface: input.manifest.surface,
    contentVersion: input.manifest.contentVersion,
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
    cloudRestoreRewriteApproved: false,
    studyTargetMutationApproved: false,
    sourceLocaleMutationApproved: false,
    bundledContentRemovalApproved: false,
    productionActivationApproved: false,
    totalRows: rows.length,
    serverShadowRowsRead: input.evidence.serverShadowRowsRead,
    explicitApprovalArtifactPresent: input.evidence.explicitApprovalArtifactPresent,
    explicitDecisionRows: input.evidence.explicitDecisions.length,
    reviewerApprovedRows,
    localePassedRows,
    shadowReviewStatusCounts,
    shadowLocaleGateStatusCounts,
    shadowReviewerApprovedRows: input.evidence.serverShadowReviewerApprovedRows,
    shadowLocalePassedRows: input.evidence.serverShadowLocalePassedRows,
    shadowAutoApprovalDetected,
    reviewerLocaleApprovalComplete,
    missingReviewerApprovalRows,
    missingLocaleGateRows,
    safetyBlockers,
    approvalBlockers,
    blockers,
  };
}

function rowKey(planId: string, dayIndex: number): string {
  return `${planId}:${dayIndex}`;
}

function rowRef(row: CoursePackReviewerLocaleRow): CoursePackReviewerLocaleRowRef {
  return {
    planId: row.planId,
    dayIndex: row.dayIndex,
    contentHash: row.contentHash,
    path: row.path,
  };
}

function emptyReviewCounts(): Record<PlanContentReviewStatus, number> {
  return {
    approved: 0,
    shadow: 0,
    hold: 0,
    rejected: 0,
  };
}

function emptyLocaleCounts(): Record<PlanContentLocaleGateStatus, number> {
  return {
    passed: 0,
    hold: 0,
    failed: 0,
  };
}

function isPlanContentReviewStatus(value: unknown): value is PlanContentReviewStatus {
  return typeof value === 'string' && PLAN_CONTENT_REVIEW_STATUSES.includes(value as PlanContentReviewStatus);
}

function isPlanContentLocaleGateStatus(value: unknown): value is PlanContentLocaleGateStatus {
  return typeof value === 'string' && PLAN_CONTENT_LOCALE_GATE_STATUSES.includes(value as PlanContentLocaleGateStatus);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackReviewerLocaleIntakeRouteShim() {
  return null;
}
