import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedApprovalHandoffPacket,
} from './personal_plan_gavan_week1_signed_approval_handoff_packet';

export const GAVAN_WEEK1_SIGNED_ROUTE_APPROVAL_INTAKE_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-signed-route-approval-intake-report.json',
);

type IntakeStatus =
  | 'blocked_missing_signed_payload'
  | 'blocked_invalid_signed_payload'
  | 'signed_payload_ready_for_separate_route_approval_review';

type IssueCode =
  | 'wrong_handoff_kind'
  | 'handoff_not_unsigned'
  | 'reviewer_name_missing'
  | 'reviewer_role_invalid'
  | 'approval_timestamp_missing'
  | 'approval_scope_invalid'
  | 'approved_evidence_paths_incomplete'
  | 'partial_route_approval_not_allowed'
  | 'regression_scope_invalid'
  | 'decision_text_missing'
  | 'target_path_not_allowed';

type FieldId =
  | 'reviewerName'
  | 'reviewerRole'
  | 'approvedAtIso'
  | 'approvalScope'
  | 'approvedEvidenceFilePaths'
  | 'regressionScope'
  | 'decisionText';

export type GavanWeek1SignedRouteApprovalPayload = {
  reviewerName?: string;
  reviewerRole?: string;
  approvedAtIso?: string;
  approvalScope?: string;
  approvedEvidenceFilePaths?: string[];
  regressionScope?: string;
  decisionText?: string;
};

export type GavanWeek1SignedRouteApprovalIntakeIssue = {
  code: IssueCode;
  detail: string;
};

export type GavanWeek1SignedRouteApprovalFieldChecklistItem = {
  id: FieldId;
  status: 'missing' | 'invalid' | 'valid';
  required: true;
  detail: string;
};

export type GavanWeek1SignedRouteApprovalIntakeBlocker = {
  code: string;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1SignedRouteApprovalIntakeReport = {
  kind: 'gavan_week1_signed_route_approval_intake_report';
  generatedAt: string;
  intakeOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceHandoffStatus: GavanWeek1SignedApprovalHandoffPacket['status'];
  status: IntakeStatus;
  releaseDecision: 'hold';
  approved: false;
  readyForLive: false;
  signedApprovalPayloadAccepted: boolean;
  signedApprovalArtifactCreated: false;
  routeApprovalAccepted: false;
  routeRegistrationAllowed: false;
  liveRegressionAllowed: false;
  deviceVerificationAllowed: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  suppliedPayloadPresent: boolean;
  fieldChecklist: GavanWeek1SignedRouteApprovalFieldChecklistItem[];
  blockers: GavanWeek1SignedRouteApprovalIntakeBlocker[];
  summary: {
    requiredFieldCount: number;
    validFieldCount: number;
    missingFieldCount: number;
    invalidFieldCount: number;
    requiredEvidencePathCount: number;
    suppliedEvidencePathCount: number;
    acceptedEvidencePathCount: number;
    missingEvidencePathCount: number;
    blockerCount: number;
  };
  requiredNextActions: string[];
  writePolicy: {
    allowedTargetRoots: ['.codex-tmp', 'docs/reports'];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type BuildOptions = {
  generatedAt: string;
  intakeOwnerId: string;
  signedApprovalPayload?: GavanWeek1SignedRouteApprovalPayload;
};

export type WriteOptions = BuildOptions & {
  targetPath: string;
};

export type BuildResult = {
  valid: boolean;
  issues: GavanWeek1SignedRouteApprovalIntakeIssue[];
  report: GavanWeek1SignedRouteApprovalIntakeReport;
};

export type WriteResult = {
  valid: boolean;
  issues: GavanWeek1SignedRouteApprovalIntakeIssue[];
  targetPath?: string;
  bytesWritten?: number;
  report?: GavanWeek1SignedRouteApprovalIntakeReport;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Signed route approval intake report can only write under .codex-tmp or docs/reports.';

const REQUIRED_FIELDS: FieldId[] = [
  'reviewerName',
  'reviewerRole',
  'approvedAtIso',
  'approvalScope',
  'approvedEvidenceFilePaths',
  'regressionScope',
  'decisionText',
];

function issue(code: IssueCode, detail: string): GavanWeek1SignedRouteApprovalIntakeIssue {
  return { code, detail };
}

function isAllowedTargetPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const workspace = path.resolve(process.cwd());
  const allowedRoots = [
    path.resolve(workspace, '.codex-tmp'),
    path.resolve(workspace, 'docs', 'reports'),
  ];

  return allowedRoots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function hasIsoDate(value: string | undefined): boolean {
  if (!value) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && value.includes('T');
}

function missingOrEmpty(value: string | undefined): boolean {
  return !value?.trim();
}

function evidencePathsFor(handoff: GavanWeek1SignedApprovalHandoffPacket): string[] {
  return [...handoff.requiredEvidencePaths];
}

function suppliedEvidencePaths(payload: GavanWeek1SignedRouteApprovalPayload | undefined): string[] {
  return payload?.approvedEvidenceFilePaths ?? [];
}

function missingEvidencePaths(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
  payload: GavanWeek1SignedRouteApprovalPayload | undefined,
): string[] {
  const supplied = suppliedEvidencePaths(payload);
  return evidencePathsFor(handoff).filter((requiredPath) => !supplied.includes(requiredPath));
}

function fieldChecklist(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
  payload: GavanWeek1SignedRouteApprovalPayload | undefined,
): GavanWeek1SignedRouteApprovalFieldChecklistItem[] {
  const missingEvidence = missingEvidencePaths(handoff, payload);

  return REQUIRED_FIELDS.map((id) => {
    if (!payload) {
      return {
        id,
        status: 'missing',
        required: true,
        detail: 'Signed route approval payload has not been supplied.',
      };
    }

    if (id === 'reviewerName') {
      return {
        id,
        status: missingOrEmpty(payload.reviewerName) ? 'missing' : 'valid',
        required: true,
        detail: 'Reviewer name must be present.',
      };
    }
    if (id === 'reviewerRole') {
      return {
        id,
        status: payload.reviewerRole === 'route_quality_owner' ? 'valid' : 'invalid',
        required: true,
        detail: 'Reviewer role must be route_quality_owner.',
      };
    }
    if (id === 'approvedAtIso') {
      return {
        id,
        status: hasIsoDate(payload.approvedAtIso) ? 'valid' : 'missing',
        required: true,
        detail: 'Approval timestamp must be an ISO datetime.',
      };
    }
    if (id === 'approvalScope') {
      return {
        id,
        status: payload.approvalScope === 'full_route_bundle' ? 'valid' : 'invalid',
        required: true,
        detail: 'Approval scope must cover the full route bundle.',
      };
    }
    if (id === 'approvedEvidenceFilePaths') {
      return {
        id,
        status: missingEvidence.length === 0 ? 'valid' : 'invalid',
        required: true,
        detail: 'Approved evidence paths must include every handoff-required path.',
      };
    }
    if (id === 'regressionScope') {
      return {
        id,
        status: payload.regressionScope === 'home_onboarding_premium_self_guided_carryover_completed_day'
          ? 'valid'
          : 'invalid',
        required: true,
        detail: 'Regression scope must cover the full route regression bundle.',
      };
    }

    return {
      id,
      status: missingOrEmpty(payload.decisionText) ? 'missing' : 'valid',
      required: true,
      detail: 'Decision text must be present.',
    };
  });
}

function payloadIssues(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
  payload: GavanWeek1SignedRouteApprovalPayload | undefined,
): GavanWeek1SignedRouteApprovalIntakeIssue[] {
  if (!payload) return [];

  const issues: GavanWeek1SignedRouteApprovalIntakeIssue[] = [];

  if (missingOrEmpty(payload.reviewerName)) {
    issues.push(issue('reviewer_name_missing', 'Signed route approval payload requires a reviewer name.'));
  }
  if (payload.reviewerRole !== 'route_quality_owner') {
    issues.push(issue('reviewer_role_invalid', 'Signed route approval payload requires reviewerRole route_quality_owner.'));
  }
  if (!hasIsoDate(payload.approvedAtIso)) {
    issues.push(issue('approval_timestamp_missing', 'Signed route approval payload requires an ISO approval timestamp.'));
  }
  if (payload.approvalScope !== 'full_route_bundle') {
    issues.push(issue('approval_scope_invalid', 'Signed route approval payload must cover the full route bundle.'));
    issues.push(issue('partial_route_approval_not_allowed', 'Partial route approval cannot unlock route work.'));
  }
  if (missingEvidencePaths(handoff, payload).length > 0) {
    issues.push(issue('approved_evidence_paths_incomplete', 'Signed route approval payload must include every required evidence path.'));
  }
  if (payload.regressionScope !== 'home_onboarding_premium_self_guided_carryover_completed_day') {
    issues.push(issue('regression_scope_invalid', 'Signed route approval payload must cover the full regression scope.'));
  }
  if (missingOrEmpty(payload.decisionText)) {
    issues.push(issue('decision_text_missing', 'Signed route approval payload requires non-empty decision text.'));
  }

  return issues;
}

function validateHandoff(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
): GavanWeek1SignedRouteApprovalIntakeIssue[] {
  const issues: GavanWeek1SignedRouteApprovalIntakeIssue[] = [];

  if (handoff.kind !== 'gavan_week1_signed_approval_handoff_packet') {
    issues.push(issue('wrong_handoff_kind', 'Signed route approval intake requires the signed approval handoff packet.'));
  }
  if (
    handoff.status !== 'signed_approval_handoff_ready_for_human_review_unsigned' ||
    handoff.approvalStillMissing !== true ||
    handoff.signatureStatus !== 'missing' ||
    handoff.signedApprovalAcceptedInThisPass !== false ||
    handoff.readyForLive !== false ||
    handoff.liveEditsAllowed !== false
  ) {
    issues.push(issue('handoff_not_unsigned', 'Signed route approval intake cannot start from an approved or live-ready handoff.'));
  }

  return issues;
}

function blockersFor(
  status: IntakeStatus,
  checklist: GavanWeek1SignedRouteApprovalFieldChecklistItem[],
): GavanWeek1SignedRouteApprovalIntakeBlocker[] {
  if (status === 'signed_payload_ready_for_separate_route_approval_review') {
    return [
      {
        code: 'separate_signed_approval_artifact_required',
        blocksProduction: true,
        detail: 'A separate signed route approval artifact must be created before routes can be registered.',
      },
      {
        code: 'route_registration_pass_required',
        blocksProduction: true,
        detail: 'Catalog, quiz, and UI route registration require a separate source-editing pass.',
      },
      {
        code: 'live_regression_required',
        blocksProduction: true,
        detail: 'Live route regression evidence is still required.',
      },
      {
        code: 'device_verification_required',
        blocksProduction: true,
        detail: 'Device route opening verification is still required.',
      },
      {
        code: 'audio_pronunciation_master_blockers_still_open',
        blocksProduction: true,
        detail: 'Audio and pronunciation blockers remain open in the master readiness matrix.',
      },
    ];
  }

  return [
    {
      code: 'signed_payload_missing_or_invalid',
      blocksProduction: true,
      detail: 'A complete signed route approval payload is required.',
    },
    ...checklist.map((item) => ({
      code: `field_${item.id}_${item.status}`,
      blocksProduction: true as const,
      detail: item.detail,
    })),
  ];
}

function requiredNextActions(status: IntakeStatus): string[] {
  if (status === 'signed_payload_ready_for_separate_route_approval_review') {
    return [
      'Create a separate signed route approval artifact from this accepted payload.',
      'Run a separate route registration implementation pass after signed approval exists.',
      'Run live route regression and device opening verification after registration.',
    ];
  }

  return [
    'Supply a complete signed route approval payload with reviewer, timestamp, full scope, all evidence paths, regression scope, and decision text.',
    'Do not register catalog, quiz, or UI routes until a separate approval artifact exists.',
  ];
}

function statusFor(
  payload: GavanWeek1SignedRouteApprovalPayload | undefined,
  issues: GavanWeek1SignedRouteApprovalIntakeIssue[],
): IntakeStatus {
  if (!payload) return 'blocked_missing_signed_payload';
  return issues.length === 0
    ? 'signed_payload_ready_for_separate_route_approval_review'
    : 'blocked_invalid_signed_payload';
}

export function buildGavanWeek1SignedRouteApprovalIntakeReport(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
  options: BuildOptions,
): BuildResult {
  const handoffIssues = validateHandoff(handoff);
  const payloadValidationIssues = payloadIssues(handoff, options.signedApprovalPayload);
  const issues = [...handoffIssues, ...payloadValidationIssues];
  const checklist = fieldChecklist(handoff, options.signedApprovalPayload);
  const status = handoffIssues.length > 0
    ? 'blocked_invalid_signed_payload'
    : statusFor(options.signedApprovalPayload, payloadValidationIssues);
  const blockers = blockersFor(status, checklist);
  const suppliedEvidence = suppliedEvidencePaths(options.signedApprovalPayload);
  const missingEvidence = missingEvidencePaths(handoff, options.signedApprovalPayload);
  const validFieldCount = checklist.filter((item) => item.status === 'valid').length;
  const missingFieldCount = checklist.filter((item) => item.status === 'missing').length;
  const invalidFieldCount = checklist.filter((item) => item.status === 'invalid').length;

  return {
    valid: issues.length === 0,
    issues,
    report: {
      kind: 'gavan_week1_signed_route_approval_intake_report',
      generatedAt: options.generatedAt,
      intakeOwnerId: options.intakeOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceHandoffStatus: handoff.status,
      status,
      releaseDecision: 'hold',
      approved: false,
      readyForLive: false,
      signedApprovalPayloadAccepted: status === 'signed_payload_ready_for_separate_route_approval_review',
      signedApprovalArtifactCreated: false,
      routeApprovalAccepted: false,
      routeRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      suppliedPayloadPresent: Boolean(options.signedApprovalPayload),
      fieldChecklist: checklist,
      blockers,
      summary: {
        requiredFieldCount: REQUIRED_FIELDS.length,
        validFieldCount,
        missingFieldCount,
        invalidFieldCount,
        requiredEvidencePathCount: handoff.requiredEvidencePaths.length,
        suppliedEvidencePathCount: suppliedEvidence.length,
        acceptedEvidencePathCount: handoff.requiredEvidencePaths.length - missingEvidence.length,
        missingEvidencePathCount: missingEvidence.length,
        blockerCount: blockers.length,
      },
      requiredNextActions: requiredNextActions(status),
      writePolicy: {
        allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
        sourceWritesAllowed: false,
        liveWritesAllowed: false,
      },
    },
  };
}

export function writeGavanWeek1SignedRouteApprovalIntakeReport(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    return {
      valid: false,
      issues: [{
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      }],
    };
  }

  const result = buildGavanWeek1SignedRouteApprovalIntakeReport(handoff, options);
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  const json = `${JSON.stringify(result.report, null, 2)}\n`;
  writeFileSync(options.targetPath, json, 'utf8');

  return {
    valid: result.valid,
    issues: result.issues,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(json, 'utf8'),
    report: result.report,
  };
}
