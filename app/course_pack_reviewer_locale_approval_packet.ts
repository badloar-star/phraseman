import type {
  CoursePackReviewerLocaleIntakeReport,
  CoursePackReviewerLocaleRowRef,
} from './course_pack_reviewer_locale_intake';

export const COURSE_PACK_REVIEWER_LOCALE_APPROVAL_PACKET_SCHEMA_VERSION =
  'course-pack-reviewer-locale-approval-packet-v1' as const;
export const COURSE_PACK_REVIEWER_LOCALE_APPROVAL_ARTIFACT_SCHEMA_VERSION =
  'plan-content-reviewer-locale-approval-v1' as const;
export const COURSE_PACK_REVIEWER_LOCALE_FILLED_APPROVAL_VALIDATION_SCHEMA_VERSION =
  'course-pack-reviewer-locale-filled-approval-validation-v1' as const;

export type CoursePackReviewerLocaleApprovalPacketInput = {
  intake: CoursePackReviewerLocaleIntakeReport;
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
};

export type CoursePackReviewerLocaleApprovalPacketRow = CoursePackReviewerLocaleRowRef & {
  studyTarget: string;
  sourceLocale: string;
  reviewerStatus: 'unreviewed';
  localeGateStatus: 'unreviewed';
  reviewerEvidenceId: '';
  localeEvidenceId: '';
  requiredReviewerStatus: 'approved';
  requiredLocaleGateStatus: 'passed';
};

export type CoursePackReviewerLocaleApprovalPacketReport = {
  schemaVersion: typeof COURSE_PACK_REVIEWER_LOCALE_APPROVAL_PACKET_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  packetStatus: 'READY_FOR_REVIEW' | 'HOLD';
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
  sourceIntakeStatus: 'PASS' | 'HOLD';
  sourceIntakeSafetyStatus: 'PASS' | 'HOLD';
  sourceIntakeApprovalStatus: 'PASS' | 'HOLD';
  sourceReviewerApprovedRows: number;
  sourceLocalePassedRows: number;
  reviewerApprovedRows: 0;
  localePassedRows: 0;
  reviewerLocaleApprovalComplete: false;
  activationApprovalComplete: false;
  packetRows: CoursePackReviewerLocaleApprovalPacketRow[];
  blockers: string[];
};

export type CoursePackReviewerLocaleFilledApprovalDecision = {
  planId: string;
  dayIndex: number;
  path?: string;
  contentHash: string;
  studyTarget: string;
  sourceLocale: string;
  reviewerStatus: 'approved' | 'hold' | 'rejected';
  localeGateStatus: 'passed' | 'hold' | 'failed';
  reviewerEvidenceId: string;
  localeEvidenceId: string;
  reviewerNotes?: string;
  localeNotes?: string;
};

export type CoursePackReviewerLocaleFilledApprovalArtifact = {
  schemaVersion: typeof COURSE_PACK_REVIEWER_LOCALE_APPROVAL_ARTIFACT_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
  activationApproved: false;
  runtimeManifestRegistered: false;
  remoteLoadingEnabled: false;
  bundledContentRemoved: false;
  storageMigrationRan: false;
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
  blockers?: [];
  decisions: CoursePackReviewerLocaleFilledApprovalDecision[];
};

export type CoursePackReviewerLocaleFilledApprovalValidationReport = {
  schemaVersion: typeof COURSE_PACK_REVIEWER_LOCALE_FILLED_APPROVAL_VALIDATION_SCHEMA_VERSION;
  status: 'PASS' | 'HOLD';
  decisionsValidForIntake: boolean;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  contentVersion: string;
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
  decisionRows: number;
  reviewerApprovedRows: number;
  localePassedRows: number;
  reviewerLocaleApprovalComplete: boolean;
  activationApprovalComplete: false;
  duplicateDecisionRows: string[];
  missingDecisionRows: CoursePackReviewerLocaleApprovalPacketRow[];
  extraDecisionRows: CoursePackReviewerLocaleFilledApprovalDecision[];
  blockers: string[];
};

export function buildCoursePackReviewerLocaleApprovalPacket(
  input: CoursePackReviewerLocaleApprovalPacketInput,
): CoursePackReviewerLocaleApprovalPacketReport {
  const blockers: string[] = [];
  const intake = input.intake;

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
    if (value !== false) blockers.push(`${label} must remain false`);
  }

  if (intake.schemaVersion !== 'course-pack-reviewer-locale-intake-v1') {
    blockers.push('source reviewer/locale intake schemaVersion must be course-pack-reviewer-locale-intake-v1');
  }
  if (intake.safetyStatus !== 'PASS') {
    blockers.push('source reviewer/locale intake safetyStatus must be PASS');
  }
  if (intake.surface !== 'plan_content') {
    blockers.push('approval packet is currently limited to plan_content');
  }
  if (intake.remoteLoadingEnabled !== false) {
    blockers.push('source reviewer/locale intake remoteLoadingEnabled must remain false');
  }
  if (intake.totalRows <= 0) {
    blockers.push('source reviewer/locale intake must contain rows');
  }
  for (const [label, value] of intakeFalseFlags(intake)) {
    if (value !== false) blockers.push(`source reviewer/locale intake ${label} must remain false`);
  }

  const packetRows = buildPacketRows(intake);
  if (packetRows.length === 0) {
    blockers.push('reviewer/locale approval packet requires at least one queued row');
  }
  if (packetRows.length > intake.totalRows) {
    blockers.push('reviewer/locale approval packet queue cannot exceed source intake rows');
  }

  return {
    schemaVersion: COURSE_PACK_REVIEWER_LOCALE_APPROVAL_PACKET_SCHEMA_VERSION,
    status: blockers.length === 0 ? 'PASS' : 'HOLD',
    packetStatus: blockers.length === 0 ? 'READY_FOR_REVIEW' : 'HOLD',
    packId: intake.packId,
    studyTarget: intake.studyTarget,
    sourceLocale: intake.sourceLocale,
    surface: intake.surface,
    contentVersion: intake.contentVersion,
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
    totalRows: packetRows.length,
    sourceIntakeStatus: intake.status,
    sourceIntakeSafetyStatus: intake.safetyStatus,
    sourceIntakeApprovalStatus: intake.approvalStatus,
    sourceReviewerApprovedRows: intake.reviewerApprovedRows,
    sourceLocalePassedRows: intake.localePassedRows,
    reviewerApprovedRows: 0,
    localePassedRows: 0,
    reviewerLocaleApprovalComplete: false,
    activationApprovalComplete: false,
    packetRows,
    blockers,
  };
}

export function validateCoursePackFilledReviewerLocaleApprovalArtifact(
  packet: CoursePackReviewerLocaleApprovalPacketReport,
  artifact: Partial<CoursePackReviewerLocaleFilledApprovalArtifact> | null | undefined,
): CoursePackReviewerLocaleFilledApprovalValidationReport {
  const blockers: string[] = [];
  const duplicateDecisionRows: string[] = [];
  const extraDecisionRows: CoursePackReviewerLocaleFilledApprovalDecision[] = [];

  if (packet.status !== 'PASS') {
    blockers.push('approval packet must be PASS before filled artifact validation');
  }
  if (!artifact || typeof artifact !== 'object') {
    blockers.push('filled reviewer/locale approval artifact must be provided');
  }

  if (artifact?.schemaVersion !== COURSE_PACK_REVIEWER_LOCALE_APPROVAL_ARTIFACT_SCHEMA_VERSION) {
    blockers.push('filled reviewer/locale approval artifact schemaVersion must be plan-content-reviewer-locale-approval-v1');
  }
  if (artifact?.status !== 'PASS') {
    blockers.push('filled reviewer/locale approval artifact status must be PASS');
  }
  for (const [field, packetValue] of packetIdentityFields(packet)) {
    if (artifact?.[field] !== packetValue) {
      blockers.push(`filled reviewer/locale approval artifact ${field} must match approval packet`);
    }
  }
  for (const [label, value] of artifactFalseFlags(artifact)) {
    if (value !== false) blockers.push(`filled reviewer/locale approval artifact ${label} must remain false`);
  }

  const decisions = Array.isArray(artifact?.decisions)
    ? artifact.decisions
    : [];
  if (!Array.isArray(artifact?.decisions)) {
    blockers.push('filled reviewer/locale approval artifact decisions must be an array');
  }
  if (Array.isArray(artifact?.blockers) && artifact.blockers.length > 0) {
    blockers.push('filled reviewer/locale approval artifact blockers must be empty');
  }
  if (decisions.length !== packet.totalRows) {
    blockers.push(`filled reviewer/locale approval artifact decisions must cover every packet row: ${decisions.length}/${packet.totalRows}`);
  }

  const packetRowsByKey = new Map(packet.packetRows.map((row) => [decisionKey(row), row]));
  const decisionsByKey = new Map<string, CoursePackReviewerLocaleFilledApprovalDecision>();
  let reviewerApprovedRows = 0;
  let localePassedRows = 0;

  for (const decision of decisions) {
    const key = decisionKey(decision);
    if (decisionsByKey.has(key)) {
      duplicateDecisionRows.push(key);
      blockers.push(`duplicate filled reviewer/locale approval decision ${key}`);
    }
    decisionsByKey.set(key, decision);

    const packetRow = packetRowsByKey.get(key);
    if (!packetRow) {
      extraDecisionRows.push(decision);
      blockers.push(`filled reviewer/locale approval decision ${key} is not in packet`);
      continue;
    }
    if (decision.path !== undefined && decision.path !== packetRow.path) {
      blockers.push(`filled reviewer/locale approval decision ${key} path must match packet`);
    }
    if (!isReviewerDecisionStatus(decision.reviewerStatus)) {
      blockers.push(`filled reviewer/locale approval decision ${key} reviewerStatus must be approved, hold, or rejected`);
    }
    if (!isLocaleDecisionStatus(decision.localeGateStatus)) {
      blockers.push(`filled reviewer/locale approval decision ${key} localeGateStatus must be passed, hold, or failed`);
    }
    if (decision.reviewerStatus === 'approved') {
      reviewerApprovedRows += 1;
      if (!hasText(decision.reviewerEvidenceId)) {
        blockers.push(`filled reviewer/locale approval decision ${key} approved reviewerStatus requires reviewerEvidenceId`);
      }
    } else {
      blockers.push(`filled reviewer/locale approval decision ${key} reviewerStatus must be approved`);
    }
    if (decision.localeGateStatus === 'passed') {
      localePassedRows += 1;
      if (!hasText(decision.localeEvidenceId)) {
        blockers.push(`filled reviewer/locale approval decision ${key} passed localeGateStatus requires localeEvidenceId`);
      }
    } else {
      blockers.push(`filled reviewer/locale approval decision ${key} localeGateStatus must be passed`);
    }
  }

  const missingDecisionRows = packet.packetRows.filter((row) => !decisionsByKey.has(decisionKey(row)));
  for (const row of missingDecisionRows) {
    blockers.push(`filled reviewer/locale approval artifact is missing decision ${decisionKey(row)}`);
  }

  const decisionsValidForIntake = blockers.length === 0
    && reviewerApprovedRows === packet.totalRows
    && localePassedRows === packet.totalRows
    && packet.totalRows > 0;

  return {
    schemaVersion: COURSE_PACK_REVIEWER_LOCALE_FILLED_APPROVAL_VALIDATION_SCHEMA_VERSION,
    status: decisionsValidForIntake ? 'PASS' : 'HOLD',
    decisionsValidForIntake,
    packId: packet.packId,
    studyTarget: packet.studyTarget,
    sourceLocale: packet.sourceLocale,
    surface: packet.surface,
    contentVersion: packet.contentVersion,
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
    totalRows: packet.totalRows,
    decisionRows: decisions.length,
    reviewerApprovedRows,
    localePassedRows,
    reviewerLocaleApprovalComplete: decisionsValidForIntake,
    activationApprovalComplete: false,
    duplicateDecisionRows,
    missingDecisionRows,
    extraDecisionRows,
    blockers,
  };
}

function buildPacketRows(
  intake: CoursePackReviewerLocaleIntakeReport,
): CoursePackReviewerLocaleApprovalPacketRow[] {
  const rowsByKey = new Map<string, CoursePackReviewerLocaleApprovalPacketRow>();
  for (const row of [
    ...intake.missingReviewerApprovalRows,
    ...intake.missingLocaleGateRows,
  ]) {
    rowsByKey.set(rowRefKey(row), {
      ...row,
      studyTarget: intake.studyTarget,
      sourceLocale: intake.sourceLocale,
      reviewerStatus: 'unreviewed',
      localeGateStatus: 'unreviewed',
      reviewerEvidenceId: '',
      localeEvidenceId: '',
      requiredReviewerStatus: 'approved',
      requiredLocaleGateStatus: 'passed',
    });
  }
  return [...rowsByKey.values()].sort((left, right) => (
    left.planId.localeCompare(right.planId)
    || left.dayIndex - right.dayIndex
    || left.contentHash.localeCompare(right.contentHash)
  ));
}

function rowRefKey(row: CoursePackReviewerLocaleRowRef): string {
  return `${row.planId}:${row.dayIndex}:${row.contentHash}`;
}

function decisionKey(row: {
  planId: string;
  dayIndex: number;
  contentHash: string;
  studyTarget: string;
  sourceLocale: string;
}): string {
  return `${row.studyTarget}:${row.sourceLocale}:${row.planId}:${row.dayIndex}:${row.contentHash}`;
}

function intakeFalseFlags(
  intake: CoursePackReviewerLocaleIntakeReport,
): Array<[string, boolean]> {
  return [
    ['activationApproved', intake.activationApproved],
    ['runtimeManifestRegistrationApproved', intake.runtimeManifestRegistrationApproved],
    ['runtimeLookupApproved', intake.runtimeLookupApproved],
    ['remoteLoadingApproved', intake.remoteLoadingApproved],
    ['manifestFetchApproved', intake.manifestFetchApproved],
    ['packDownloadApproved', intake.packDownloadApproved],
    ['cacheLookupApproved', intake.cacheLookupApproved],
    ['cacheReadApproved', intake.cacheReadApproved],
    ['cacheWriteApproved', intake.cacheWriteApproved],
    ['cacheRepairApproved', intake.cacheRepairApproved],
    ['storageMigrationApproved', intake.storageMigrationApproved],
    ['cloudRestoreRewriteApproved', intake.cloudRestoreRewriteApproved],
    ['studyTargetMutationApproved', intake.studyTargetMutationApproved],
    ['sourceLocaleMutationApproved', intake.sourceLocaleMutationApproved],
    ['bundledContentRemovalApproved', intake.bundledContentRemovalApproved],
    ['productionActivationApproved', intake.productionActivationApproved],
  ];
}

function artifactFalseFlags(
  artifact: Partial<CoursePackReviewerLocaleFilledApprovalArtifact> | null | undefined,
): Array<[string, boolean | undefined]> {
  return [
    ['activationApproved', artifact?.activationApproved],
    ['runtimeManifestRegistered', artifact?.runtimeManifestRegistered],
    ['remoteLoadingEnabled', artifact?.remoteLoadingEnabled],
    ['bundledContentRemoved', artifact?.bundledContentRemoved],
    ['storageMigrationRan', artifact?.storageMigrationRan],
    ['runtimeManifestRegistrationApproved', artifact?.runtimeManifestRegistrationApproved],
    ['runtimeLookupApproved', artifact?.runtimeLookupApproved],
    ['remoteLoadingApproved', artifact?.remoteLoadingApproved],
    ['manifestFetchApproved', artifact?.manifestFetchApproved],
    ['packDownloadApproved', artifact?.packDownloadApproved],
    ['cacheLookupApproved', artifact?.cacheLookupApproved],
    ['cacheReadApproved', artifact?.cacheReadApproved],
    ['cacheWriteApproved', artifact?.cacheWriteApproved],
    ['cacheRepairApproved', artifact?.cacheRepairApproved],
    ['storageMigrationApproved', artifact?.storageMigrationApproved],
    ['cloudRestoreRewriteApproved', artifact?.cloudRestoreRewriteApproved],
    ['studyTargetMutationApproved', artifact?.studyTargetMutationApproved],
    ['sourceLocaleMutationApproved', artifact?.sourceLocaleMutationApproved],
    ['bundledContentRemovalApproved', artifact?.bundledContentRemovalApproved],
    ['productionActivationApproved', artifact?.productionActivationApproved],
  ];
}

function packetIdentityFields(
  packet: CoursePackReviewerLocaleApprovalPacketReport,
): Array<['packId' | 'studyTarget' | 'sourceLocale' | 'surface' | 'contentVersion', string]> {
  return [
    ['packId', packet.packId],
    ['studyTarget', packet.studyTarget],
    ['sourceLocale', packet.sourceLocale],
    ['surface', packet.surface],
    ['contentVersion', packet.contentVersion],
  ];
}

function isReviewerDecisionStatus(value: unknown): value is CoursePackReviewerLocaleFilledApprovalDecision['reviewerStatus'] {
  return value === 'approved' || value === 'hold' || value === 'rejected';
}

function isLocaleDecisionStatus(value: unknown): value is CoursePackReviewerLocaleFilledApprovalDecision['localeGateStatus'] {
  return value === 'passed' || value === 'hold' || value === 'failed';
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackReviewerLocaleApprovalPacketRouteShim() {
  return null;
}
