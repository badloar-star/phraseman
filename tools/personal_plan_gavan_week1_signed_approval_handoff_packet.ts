import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type { GavanWeek1LiveRouteImplementationPreflight } from './personal_plan_gavan_week1_live_route_implementation_preflight';
import type { GavanWeek1RouteApprovalGuard } from './personal_plan_gavan_week1_route_approval_guard';

export const GAVAN_WEEK1_SIGNED_APPROVAL_HANDOFF_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-signed-approval-handoff-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const MATERIAL_EXPORT_PACKET_PATHS = [
  '.codex-tmp/personal-plans/gavan-week1-day1-material-export-packet.json',
  '.codex-tmp/personal-plans/gavan-week1-day2-material-export-packet.json',
  '.codex-tmp/personal-plans/gavan-week1-day3-material-export-packet.json',
  '.codex-tmp/personal-plans/gavan-week1-day4-material-export-packet.json',
  '.codex-tmp/personal-plans/gavan-week1-day5-material-export-packet.json',
  '.codex-tmp/personal-plans/gavan-week1-day6-material-export-packet.json',
  '.codex-tmp/personal-plans/gavan-week1-day7-material-export-packet.json',
] as const;

const FINAL_QUIZ_CANDIDATE_PACKET_PATH =
  '.codex-tmp/personal-plans/gavan-week1-final-quiz-candidate-packet.json';

export type GavanWeek1SignedApprovalHandoffPacketStatus =
  'signed_approval_handoff_ready_for_human_review_unsigned';

export type GavanWeek1SignedApprovalHandoffIssueCode =
  | 'wrong_guard_kind'
  | 'wrong_preflight_kind'
  | 'wrong_plan_or_week'
  | 'guard_not_blocked'
  | 'guard_already_approved'
  | 'preflight_not_blocked'
  | 'preflight_already_approved'
  | 'material_export_evidence_incomplete'
  | 'final_quiz_candidate_evidence_incomplete'
  | 'target_path_not_allowed';

export type GavanWeek1SignedApprovalHandoffIssue = {
  code: GavanWeek1SignedApprovalHandoffIssueCode;
  detail: string;
};

export type GavanWeek1SignedApprovalHandoffPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1SignedApprovalHandoffPacketWriteOptions =
  GavanWeek1SignedApprovalHandoffPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1SignedApprovalReviewerChecklistItem = {
  id:
    | 'review_full_route_bundle_scope'
    | 'review_material_export_evidence'
    | 'review_final_quiz_candidate_evidence'
    | 'review_regression_scope'
    | 'confirm_no_live_edits_before_signature'
    | 'acknowledge_audio_pronunciation_blockers';
  status: 'ready_for_human_review';
  requiredDecision: string;
};

export type GavanWeek1SignedApprovalHandoffPacket = {
  kind: 'gavan_week1_signed_approval_handoff_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1SignedApprovalHandoffPacketStatus;
  sourceGuardStatus: GavanWeek1RouteApprovalGuard['status'];
  sourcePreflightStatus: GavanWeek1LiveRouteImplementationPreflight['status'];
  blockerStillOpen: 'missing_signature:product_copy';
  approvalStillMissing: true;
  signatureStatus: 'missing';
  approvalMayBeInferred: false;
  signedApprovalAcceptedInThisPass: false;
  readyForHumanReview: true;
  readyForLive: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  requiredSignedApprovalMetadata: GavanWeek1RouteApprovalGuard['requiredSignedApprovalMetadata'];
  requiredEvidencePaths: string[];
  materialExportEvidence: GavanWeek1LiveRouteImplementationPreflight['materialExportEvidence'];
  finalQuizCandidateEvidence: GavanWeek1LiveRouteImplementationPreflight['finalQuizCandidateEvidence'];
  reviewerChecklist: GavanWeek1SignedApprovalReviewerChecklistItem[];
  reviewerDecision: {
    required: true;
    status: 'not_reviewed';
    approved: false;
    approvedBy: null;
    approvedAt: null;
    signedApprovalArtifactRequired: true;
  };
  blockingReasons: ['missing_signature:product_copy'];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1SignedApprovalHandoffPacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1SignedApprovalHandoffIssue[];
  packet?: GavanWeek1SignedApprovalHandoffPacket;
};

export type GavanWeek1SignedApprovalHandoffPacketWriteResult =
  GavanWeek1SignedApprovalHandoffPacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1SignedApprovalHandoffIssueCode,
  detail: string,
): GavanWeek1SignedApprovalHandoffIssue {
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

export function isGavanWeek1SignedApprovalHandoffPacketTargetAllowed(
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

function validateGuard(
  guard: GavanWeek1RouteApprovalGuard,
): GavanWeek1SignedApprovalHandoffIssue[] {
  const issues: GavanWeek1SignedApprovalHandoffIssue[] = [];

  if (guard.kind !== 'gavan_week1_route_approval_guard') {
    issues.push(issue(
      'wrong_guard_kind',
      'Signed approval handoff requires a route approval guard.',
    ));
  }

  if (guard.planId !== 'gavan' || guard.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Signed approval handoff can only target Gavan week 1.',
    ));
  }

  if (
    guard.status !== 'route_approval_guard_blocked_unsigned' ||
    guard.readyForLive !== false ||
    guard.sourceWritesUsed !== false ||
    guard.phaseWriteTargets.length > 0 ||
    guard.liveEditsAllowed !== false ||
    guard.catalogRouteRegistrationAllowed !== false ||
    guard.quizRouteRegistrationAllowed !== false ||
    guard.uiRouteRegistrationAllowed !== false ||
    guard.blockerStillOpen !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'guard_not_blocked',
      'Signed approval handoff cannot start from a live-ready or unblocked guard.',
    ));
  }

  if (
    guard.approved !== false ||
    guard.signatureStatus !== 'missing' ||
    guard.approvalMayBeInferred !== false ||
    guard.signedApprovalAcceptedInThisPass !== false
  ) {
    issues.push(issue(
      'guard_already_approved',
      'Signed approval handoff cannot infer or reuse approval from this pass.',
    ));
  }

  return issues;
}

function validatePreflight(
  preflight: GavanWeek1LiveRouteImplementationPreflight,
): GavanWeek1SignedApprovalHandoffIssue[] {
  const issues: GavanWeek1SignedApprovalHandoffIssue[] = [];

  if (preflight.kind !== 'gavan_week1_live_route_implementation_preflight') {
    issues.push(issue(
      'wrong_preflight_kind',
      'Signed approval handoff requires a live-route implementation preflight.',
    ));
  }

  if (preflight.planId !== 'gavan' || preflight.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Signed approval handoff can only target Gavan week 1.',
    ));
  }

  if (
    preflight.status !== 'live_route_preflight_blocked_unsigned' ||
    preflight.readyForLive !== false ||
    preflight.sourceWritesUsed !== false ||
    preflight.phaseWriteTargets.length > 0 ||
    preflight.liveEditsAllowed !== false ||
    preflight.catalogRouteRegistrationAllowed !== false ||
    preflight.quizRouteRegistrationAllowed !== false ||
    preflight.uiRouteRegistrationAllowed !== false ||
    preflight.blockerStillOpen !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'preflight_not_blocked',
      'Signed approval handoff cannot start from a live-ready or unblocked preflight.',
    ));
  }

  if (preflight.approved !== false) {
    issues.push(issue(
      'preflight_already_approved',
      'Signed approval handoff cannot infer approval from the preflight.',
    ));
  }

  if (preflight.materialExportEvidence.readyForRouteReview !== true) {
    issues.push(issue(
      'material_export_evidence_incomplete',
      'Signed approval handoff requires all seven non-live material export packets for route review.',
    ));
  }

  if (preflight.finalQuizCandidateEvidence.readyForRouteReview !== true) {
    issues.push(issue(
      'final_quiz_candidate_evidence_incomplete',
      'Signed approval handoff requires all seven non-live final quiz candidates for route review.',
    ));
  }

  return issues;
}

function requiredEvidencePaths(
  guard: GavanWeek1RouteApprovalGuard,
): string[] {
  return [
    ...guard.requiredSignedApprovalMetadata.approvedEvidenceFilePaths,
    '.codex-tmp/personal-plans/gavan-week1-live-route-implementation-preflight.json',
    ...MATERIAL_EXPORT_PACKET_PATHS,
    FINAL_QUIZ_CANDIDATE_PACKET_PATH,
  ];
}

function reviewerChecklist(): GavanWeek1SignedApprovalReviewerChecklistItem[] {
  return [
    {
      id: 'review_full_route_bundle_scope',
      status: 'ready_for_human_review',
      requiredDecision: 'Approve or reject the full catalog, quiz, UI route, and regression bundle.',
    },
    {
      id: 'review_material_export_evidence',
      status: 'ready_for_human_review',
      requiredDecision: 'Confirm all seven material export packets are acceptable as non-live source evidence.',
    },
    {
      id: 'review_final_quiz_candidate_evidence',
      status: 'ready_for_human_review',
      requiredDecision: 'Confirm all seven final quiz candidates and 70 candidate questions are acceptable as non-live evidence.',
    },
    {
      id: 'review_regression_scope',
      status: 'ready_for_human_review',
      requiredDecision: 'Confirm the regression scope covers Home, onboarding, Premium, self-guided lessons, self-guided quizzes, carryover, and completed-day state.',
    },
    {
      id: 'confirm_no_live_edits_before_signature',
      status: 'ready_for_human_review',
      requiredDecision: 'Confirm no production route writes may happen before a separate signed approval artifact exists.',
    },
    {
      id: 'acknowledge_audio_pronunciation_blockers',
      status: 'ready_for_human_review',
      requiredDecision: 'Acknowledge audio approval and pronunciation scoring remain separate release blockers.',
    },
  ];
}

function reviewerDecision(): GavanWeek1SignedApprovalHandoffPacket['reviewerDecision'] {
  return {
    required: true,
    status: 'not_reviewed',
    approved: false,
    approvedBy: null,
    approvedAt: null,
    signedApprovalArtifactRequired: true,
  };
}

export function buildGavanWeek1SignedApprovalHandoffPacket(
  guard: GavanWeek1RouteApprovalGuard,
  preflight: GavanWeek1LiveRouteImplementationPreflight,
  options: GavanWeek1SignedApprovalHandoffPacketOptions,
): GavanWeek1SignedApprovalHandoffPacketBuildResult {
  const issues = [
    ...validateGuard(guard),
    ...validatePreflight(preflight),
  ];

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    packet: {
      kind: 'gavan_week1_signed_approval_handoff_packet',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'signed_approval_handoff_ready_for_human_review_unsigned',
      sourceGuardStatus: guard.status,
      sourcePreflightStatus: preflight.status,
      blockerStillOpen: 'missing_signature:product_copy',
      approvalStillMissing: true,
      signatureStatus: 'missing',
      approvalMayBeInferred: false,
      signedApprovalAcceptedInThisPass: false,
      readyForHumanReview: true,
      readyForLive: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      requiredSignedApprovalMetadata: guard.requiredSignedApprovalMetadata,
      requiredEvidencePaths: requiredEvidencePaths(guard),
      materialExportEvidence: preflight.materialExportEvidence,
      finalQuizCandidateEvidence: preflight.finalQuizCandidateEvidence,
      reviewerChecklist: reviewerChecklist(),
      reviewerDecision: reviewerDecision(),
      blockingReasons: ['missing_signature:product_copy'],
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1SignedApprovalHandoffPacket(
  packet: GavanWeek1SignedApprovalHandoffPacket,
): string {
  return `${JSON.stringify(packet, null, 2)}\n`;
}

export function writeGavanWeek1SignedApprovalHandoffPacket(
  guard: GavanWeek1RouteApprovalGuard,
  preflight: GavanWeek1LiveRouteImplementationPreflight,
  options: GavanWeek1SignedApprovalHandoffPacketWriteOptions,
): GavanWeek1SignedApprovalHandoffPacketWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1SignedApprovalHandoffPacketTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Signed approval handoff packet can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1SignedApprovalHandoffPacket(
    guard,
    preflight,
    options,
  );

  if (!buildResult.valid || !buildResult.packet) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1SignedApprovalHandoffPacket(buildResult.packet);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    packet: buildResult.packet,
  };
}
