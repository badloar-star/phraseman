import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type { GavanWeek1RouteSignatureRequestPacket } from './personal_plan_gavan_week1_route_signature_request_packet';

export const GAVAN_WEEK1_ROUTE_APPROVAL_GUARD_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-route-approval-guard.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_EVIDENCE_PATHS = [
  '.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json',
  '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json',
  '.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json',
  '.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json',
] as const;

export type GavanWeek1RouteApprovalGuardStatus =
  'route_approval_guard_blocked_unsigned';

export type GavanWeek1RouteApprovalGuardIssueCode =
  | 'wrong_request_kind'
  | 'wrong_request_status'
  | 'wrong_plan_or_week'
  | 'request_not_blocked'
  | 'request_already_approved'
  | 'reviewer_name_missing'
  | 'approval_timestamp_missing'
  | 'approved_evidence_paths_incomplete'
  | 'partial_route_approval_not_allowed'
  | 'decision_text_missing'
  | 'target_path_not_allowed';

export type GavanWeek1RouteApprovalGuardIssue = {
  code: GavanWeek1RouteApprovalGuardIssueCode;
  detail: string;
};

export type GavanWeek1SignedRouteApprovalMetadata = {
  reviewerName?: string;
  reviewerRole?: string;
  approvedAtIso?: string;
  approvalScope?: string;
  approvedEvidenceFilePaths?: string[];
  regressionScope?: string;
  decisionText?: string;
};

export type GavanWeek1RouteApprovalGuardOptions = {
  generatedAt: string;
  signedApprovalMetadata?: GavanWeek1SignedRouteApprovalMetadata;
};

export type GavanWeek1RouteApprovalGuardWriteOptions =
  GavanWeek1RouteApprovalGuardOptions & {
    targetPath: string;
  };

export type GavanWeek1RouteApprovalGuard = {
  kind: 'gavan_week1_route_approval_guard';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1RouteApprovalGuardStatus;
  sourceRequestStatus: GavanWeek1RouteSignatureRequestPacket['status'];
  blockerStillOpen: 'missing_signature:product_copy';
  approved: false;
  readyForLive: false;
  signatureStatus: 'missing';
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  approvalMayBeInferred: false;
  signedApprovalAcceptedInThisPass: false;
  requiredSignedApprovalMetadata: {
    reviewerName: 'required_non_empty_string';
    reviewerRole: 'route_quality_owner';
    approvedAtIso: 'required_iso_datetime';
    approvalScope: 'full_route_bundle';
    approvedEvidenceFilePaths: typeof REQUIRED_EVIDENCE_PATHS[number][];
    regressionScope: 'home_onboarding_premium_self_guided_carryover_completed_day';
    decisionText: 'required_non_empty_string';
  };
  unsignedRequestSummary: GavanWeek1RouteSignatureRequestPacket['reviewerSummary'];
  routeBlockerIds: GavanWeek1RouteSignatureRequestPacket['routeBlockerIds'];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1RouteApprovalGuardBuildResult = {
  valid: boolean;
  issues: GavanWeek1RouteApprovalGuardIssue[];
  guard?: GavanWeek1RouteApprovalGuard;
};

export type GavanWeek1RouteApprovalGuardWriteResult =
  GavanWeek1RouteApprovalGuardBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1RouteApprovalGuardIssueCode,
  detail: string,
): GavanWeek1RouteApprovalGuardIssue {
  return { code, detail };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1RouteApprovalGuardTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function validateRequest(
  request: GavanWeek1RouteSignatureRequestPacket,
): GavanWeek1RouteApprovalGuardIssue[] {
  const issues: GavanWeek1RouteApprovalGuardIssue[] = [];

  if (request.kind !== 'gavan_week1_route_signature_request_packet') {
    issues.push(issue(
      'wrong_request_kind',
      'Route approval guard requires a route signature request packet.',
    ));
  }

  if (request.status !== 'route_signature_request_blocked_not_signed') {
    issues.push(issue(
      'wrong_request_status',
      'Route approval guard requires an unsigned blocked route request.',
    ));
  }

  if (request.planId !== 'gavan' || request.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Route approval guard can only target Gavan week 1.',
    ));
  }

  if (
    request.readyForLive !== false ||
    request.sourceWritesUsed !== false ||
    request.phaseWriteTargets.length > 0 ||
    request.liveEditsAllowed !== false ||
    request.catalogRouteRegistrationAllowed !== false ||
    request.quizRouteRegistrationAllowed !== false ||
    request.uiRouteRegistrationAllowed !== false ||
    request.blockerStillOpen !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'request_not_blocked',
      'Route approval guard cannot start from a live-ready or unblocked request.',
    ));
  }

  if (
    request.signatureStatus !== 'missing' ||
    request.reviewerDecision.approved !== false ||
    request.reviewerDecision.status !== 'not_reviewed'
  ) {
    issues.push(issue(
      'request_already_approved',
      'Route approval guard cannot infer or reuse an approval from the unsigned request.',
    ));
  }

  return issues;
}

function hasIsoDate(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const time = Date.parse(value);
  return Number.isFinite(time) && value.includes('T');
}

function validateSignedMetadata(
  metadata: GavanWeek1SignedRouteApprovalMetadata | undefined,
): GavanWeek1RouteApprovalGuardIssue[] {
  if (!metadata) {
    return [];
  }

  const issues: GavanWeek1RouteApprovalGuardIssue[] = [];
  const evidencePaths = metadata.approvedEvidenceFilePaths ?? [];

  if (!metadata.reviewerName?.trim()) {
    issues.push(issue(
      'reviewer_name_missing',
      'Signed route approval metadata requires a reviewer name.',
    ));
  }

  if (!hasIsoDate(metadata.approvedAtIso)) {
    issues.push(issue(
      'approval_timestamp_missing',
      'Signed route approval metadata requires an ISO approval timestamp.',
    ));
  }

  if (!REQUIRED_EVIDENCE_PATHS.every((requiredPath) => evidencePaths.includes(requiredPath))) {
    issues.push(issue(
      'approved_evidence_paths_incomplete',
      'Signed route approval metadata must include every required evidence path.',
    ));
  }

  if (
    metadata.approvalScope !== 'full_route_bundle' ||
    metadata.regressionScope !== 'home_onboarding_premium_self_guided_carryover_completed_day'
  ) {
    issues.push(issue(
      'partial_route_approval_not_allowed',
      'Signed route approval metadata must cover the full route bundle and full regression scope.',
    ));
  }

  if (!metadata.decisionText?.trim()) {
    issues.push(issue(
      'decision_text_missing',
      'Signed route approval metadata requires non-empty decision text.',
    ));
  }

  return issues;
}

function requiredSignedApprovalMetadata(): GavanWeek1RouteApprovalGuard['requiredSignedApprovalMetadata'] {
  return {
    reviewerName: 'required_non_empty_string',
    reviewerRole: 'route_quality_owner',
    approvedAtIso: 'required_iso_datetime',
    approvalScope: 'full_route_bundle',
    approvedEvidenceFilePaths: [...REQUIRED_EVIDENCE_PATHS],
    regressionScope: 'home_onboarding_premium_self_guided_carryover_completed_day',
    decisionText: 'required_non_empty_string',
  };
}

export function buildGavanWeek1RouteApprovalGuard(
  request: GavanWeek1RouteSignatureRequestPacket,
  options: GavanWeek1RouteApprovalGuardOptions,
): GavanWeek1RouteApprovalGuardBuildResult {
  const issues = [
    ...validateRequest(request),
    ...validateSignedMetadata(options.signedApprovalMetadata),
  ];

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    guard: {
      kind: 'gavan_week1_route_approval_guard',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'route_approval_guard_blocked_unsigned',
      sourceRequestStatus: request.status,
      blockerStillOpen: 'missing_signature:product_copy',
      approved: false,
      readyForLive: false,
      signatureStatus: 'missing',
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      approvalMayBeInferred: false,
      signedApprovalAcceptedInThisPass: false,
      requiredSignedApprovalMetadata: requiredSignedApprovalMetadata(),
      unsignedRequestSummary: request.reviewerSummary,
      routeBlockerIds: request.routeBlockerIds,
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1RouteApprovalGuard(
  guard: GavanWeek1RouteApprovalGuard,
): string {
  return `${JSON.stringify(guard, null, 2)}\n`;
}

export function writeGavanWeek1RouteApprovalGuard(
  request: GavanWeek1RouteSignatureRequestPacket,
  options: GavanWeek1RouteApprovalGuardWriteOptions,
): GavanWeek1RouteApprovalGuardWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1RouteApprovalGuardTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Route approval guard can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1RouteApprovalGuard(request, options);

  if (!buildResult.valid || !buildResult.guard) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1RouteApprovalGuard(buildResult.guard);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    guard: buildResult.guard,
  };
}
