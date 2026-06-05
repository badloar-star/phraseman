import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedRouteApprovalIntakeReport,
} from './personal_plan_gavan_week1_signed_route_approval_intake_report';

export const GAVAN_WEEK1_SIGNED_ROUTE_APPROVAL_ARTIFACT_GATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-signed-route-approval-artifact-gate.json',
);

type GateStatus =
  | 'blocked_before_signed_payload_acceptance'
  | 'blocked_invalid_intake_report'
  | 'signed_approval_artifact_candidate_ready_non_live';

type IssueCode =
  | 'wrong_intake_kind'
  | 'wrong_plan_or_week'
  | 'intake_already_approved'
  | 'intake_not_non_live'
  | 'target_path_not_allowed';

export type GavanWeek1SignedRouteApprovalArtifactGateIssue = {
  code: IssueCode;
  detail: string;
};

export type GavanWeek1SignedRouteApprovalArtifactGateBlocker = {
  code: string;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1SignedRouteApprovalArtifactGate = {
  kind: 'gavan_week1_signed_route_approval_artifact_gate';
  generatedAt: string;
  artifactOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceIntakeStatus: GavanWeek1SignedRouteApprovalIntakeReport['status'];
  status: GateStatus;
  releaseDecision: 'hold';
  signedApprovalArtifactReady: boolean;
  signedApprovalArtifactCreated: false;
  routeApprovalAccepted: false;
  approved: false;
  readyForLive: false;
  routeRegistrationAllowed: false;
  liveRegressionAllowed: false;
  deviceVerificationAllowed: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  summary: {
    intakeRequiredFieldCount: number;
    intakeValidFieldCount: number;
    intakeAcceptedEvidencePathCount: number;
    intakeMissingEvidencePathCount: number;
    carriedBlockerCount: number;
    artifactBlockerCount: number;
  };
  blockers: GavanWeek1SignedRouteApprovalArtifactGateBlocker[];
  requiredNextActions: string[];
  writePolicy: {
    allowedTargetRoots: ['.codex-tmp', 'docs/reports'];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type BuildOptions = {
  generatedAt: string;
  artifactOwnerId: string;
};

export type WriteOptions = BuildOptions & {
  targetPath: string;
};

export type BuildResult = {
  valid: boolean;
  issues: GavanWeek1SignedRouteApprovalArtifactGateIssue[];
  gate: GavanWeek1SignedRouteApprovalArtifactGate;
};

export type WriteResult = {
  valid: boolean;
  issues: GavanWeek1SignedRouteApprovalArtifactGateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  gate?: GavanWeek1SignedRouteApprovalArtifactGate;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Signed route approval artifact gate can only write under .codex-tmp or docs/reports.';

function issue(code: IssueCode, detail: string): GavanWeek1SignedRouteApprovalArtifactGateIssue {
  return { code, detail };
}

function isAllowedTargetPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const roots = [
    path.resolve(process.cwd(), '.codex-tmp'),
    path.resolve(process.cwd(), 'docs', 'reports'),
  ];

  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function validateIntake(
  intake: GavanWeek1SignedRouteApprovalIntakeReport,
): GavanWeek1SignedRouteApprovalArtifactGateIssue[] {
  const issues: GavanWeek1SignedRouteApprovalArtifactGateIssue[] = [];

  if (intake.kind !== 'gavan_week1_signed_route_approval_intake_report') {
    issues.push(issue('wrong_intake_kind', 'Signed route approval artifact gate requires the signed route approval intake report.'));
  }
  if (intake.planId !== 'gavan' || intake.weekId !== 'gavan-week1') {
    issues.push(issue('wrong_plan_or_week', 'Signed route approval artifact gate can only target Gavan week 1.'));
  }
  if (
    intake.approved !== false ||
    intake.signedApprovalArtifactCreated !== false ||
    intake.routeApprovalAccepted !== false
  ) {
    issues.push(issue('intake_already_approved', 'Signed route approval artifact gate cannot start from an already-approved intake report.'));
  }
  if (
    intake.readyForLive !== false ||
    intake.routeRegistrationAllowed !== false ||
    intake.liveRegressionAllowed !== false ||
    intake.deviceVerificationAllowed !== false ||
    intake.sourceWritesUsed !== false ||
    intake.liveEditsAllowed !== false
  ) {
    issues.push(issue('intake_not_non_live', 'Signed route approval artifact gate cannot start from a live-ready intake report.'));
  }

  return issues;
}

function statusFor(
  intake: GavanWeek1SignedRouteApprovalIntakeReport,
  issues: GavanWeek1SignedRouteApprovalArtifactGateIssue[],
): GateStatus {
  if (issues.length > 0) return 'blocked_invalid_intake_report';
  if (intake.status === 'signed_payload_ready_for_separate_route_approval_review') {
    return 'signed_approval_artifact_candidate_ready_non_live';
  }
  return 'blocked_before_signed_payload_acceptance';
}

function blockersFor(status: GateStatus): GavanWeek1SignedRouteApprovalArtifactGateBlocker[] {
  const shared = [
    {
      code: 'signed_approval_artifact_not_created',
      blocksProduction: true as const,
      detail: 'A separate signed approval artifact has not been created.',
    },
    {
      code: 'route_registration_pass_required',
      blocksProduction: true as const,
      detail: 'Catalog, quiz, and UI route registration require a separate source-editing pass.',
    },
    {
      code: 'live_regression_required',
      blocksProduction: true as const,
      detail: 'Live route regression evidence is still required.',
    },
    {
      code: 'device_verification_required',
      blocksProduction: true as const,
      detail: 'Device route opening verification is still required.',
    },
    {
      code: 'audio_pronunciation_master_blockers_still_open',
      blocksProduction: true as const,
      detail: 'Audio and pronunciation blockers remain open in the master readiness matrix.',
    },
  ];

  if (status === 'signed_approval_artifact_candidate_ready_non_live') {
    return shared;
  }

  return [
    {
      code: 'signed_payload_not_accepted',
      blocksProduction: true,
      detail: 'Signed route approval payload has not been accepted by the intake report.',
    },
    ...shared,
  ];
}

function requiredNextActions(status: GateStatus): string[] {
  if (status === 'signed_approval_artifact_candidate_ready_non_live') {
    return [
      'Create the separate signed route approval artifact from the accepted intake payload.',
      'Run a separate route registration implementation pass only after that artifact exists.',
      'Run live route regression and device route opening verification after registration.',
    ];
  }

  return [
    'Supply and accept a complete signed route approval payload in the intake report.',
    'Keep catalog, quiz, and UI route registration blocked until a separate signed approval artifact exists.',
  ];
}

export function buildGavanWeek1SignedRouteApprovalArtifactGate(
  intake: GavanWeek1SignedRouteApprovalIntakeReport,
  options: BuildOptions,
): BuildResult {
  const issues = validateIntake(intake);
  const status = statusFor(intake, issues);
  const blockers = blockersFor(status);

  return {
    valid: issues.length === 0,
    issues,
    gate: {
      kind: 'gavan_week1_signed_route_approval_artifact_gate',
      generatedAt: options.generatedAt,
      artifactOwnerId: options.artifactOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceIntakeStatus: intake.status,
      status,
      releaseDecision: 'hold',
      signedApprovalArtifactReady: status === 'signed_approval_artifact_candidate_ready_non_live',
      signedApprovalArtifactCreated: false,
      routeApprovalAccepted: false,
      approved: false,
      readyForLive: false,
      routeRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      summary: {
        intakeRequiredFieldCount: intake.summary.requiredFieldCount,
        intakeValidFieldCount: intake.summary.validFieldCount,
        intakeAcceptedEvidencePathCount: intake.summary.acceptedEvidencePathCount,
        intakeMissingEvidencePathCount: intake.summary.missingEvidencePathCount,
        carriedBlockerCount: intake.summary.blockerCount,
        artifactBlockerCount: blockers.length,
      },
      blockers,
      requiredNextActions: requiredNextActions(status),
      writePolicy: {
        allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
        sourceWritesAllowed: false,
        liveWritesAllowed: false,
      },
    },
  };
}

export function writeGavanWeek1SignedRouteApprovalArtifactGate(
  intake: GavanWeek1SignedRouteApprovalIntakeReport,
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

  const result = buildGavanWeek1SignedRouteApprovalArtifactGate(intake, options);
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  const json = `${JSON.stringify(result.gate, null, 2)}\n`;
  writeFileSync(options.targetPath, json, 'utf8');

  return {
    valid: result.valid,
    issues: result.issues,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(json, 'utf8'),
    gate: result.gate,
  };
}
