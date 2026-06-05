import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedRouteApprovalArtifactGate,
} from './personal_plan_gavan_week1_signed_route_approval_artifact_gate';

export const GAVAN_WEEK1_ROUTE_REGISTRATION_IMPLEMENTATION_PREFLIGHT_V2_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-route-registration-implementation-preflight-v2.json',
);

type PreflightStatus =
  | 'blocked_before_signed_approval_artifact_candidate'
  | 'blocked_invalid_signed_approval_artifact_gate'
  | 'source_registration_plan_ready_non_live';

type IssueCode =
  | 'wrong_artifact_gate_kind'
  | 'wrong_plan_or_week'
  | 'artifact_gate_already_approved'
  | 'artifact_gate_not_non_live'
  | 'target_path_not_allowed';

type RegistrationPlanId =
  | 'catalog_route_registration'
  | 'quiz_route_registration'
  | 'ui_route_registration';

export type GavanWeek1RouteRegistrationImplementationPreflightV2Issue = {
  code: IssueCode;
  detail: string;
};

export type GavanWeek1RouteRegistrationImplementationPreflightV2Blocker = {
  code: string;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1RouteRegistrationPlanItem = {
  id: RegistrationPlanId;
  status: 'blocked_waiting_for_source_registration_pass';
  plannedRouteCount: number;
  sourceWritesAllowed: false;
  liveRegistrationAllowed: false;
  requiredApprovalState: string;
};

export type GavanWeek1RouteRegistrationImplementationPreflightV2 = {
  kind: 'gavan_week1_route_registration_implementation_preflight_v2';
  generatedAt: string;
  registrationOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceArtifactGateStatus: GavanWeek1SignedRouteApprovalArtifactGate['status'];
  status: PreflightStatus;
  releaseDecision: 'hold';
  signedApprovalArtifactReady: boolean;
  sourceRegistrationPlanReady: boolean;
  routeRegistrationAllowed: false;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  liveRegressionAllowed: false;
  deviceVerificationAllowed: false;
  readyForLive: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  registrationPlan: GavanWeek1RouteRegistrationPlanItem[];
  summary: {
    routeFamilyCount: number;
    blockedRouteFamilyCount: number;
    plannedCatalogRouteCount: number;
    plannedQuizRouteCount: number;
    plannedUiOpeningContractCount: number;
    signedApprovalArtifactReady: boolean;
    sourceRegistrationPlanReady: boolean;
    inheritedArtifactBlockerCount: number;
    implementationBlockerCount: number;
  };
  blockers: GavanWeek1RouteRegistrationImplementationPreflightV2Blocker[];
  requiredNextActions: string[];
  writePolicy: {
    allowedTargetRoots: ['.codex-tmp', 'docs/reports'];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type BuildOptions = {
  generatedAt: string;
  registrationOwnerId: string;
};

export type WriteOptions = BuildOptions & {
  targetPath: string;
};

export type BuildResult = {
  valid: boolean;
  issues: GavanWeek1RouteRegistrationImplementationPreflightV2Issue[];
  preflight: GavanWeek1RouteRegistrationImplementationPreflightV2;
};

export type WriteResult = {
  valid: boolean;
  issues: GavanWeek1RouteRegistrationImplementationPreflightV2Issue[];
  targetPath?: string;
  bytesWritten?: number;
  preflight?: GavanWeek1RouteRegistrationImplementationPreflightV2;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Route registration implementation preflight v2 can only write under .codex-tmp or docs/reports.';

const CATALOG_ROUTE_COUNT = 7;
const QUIZ_ROUTE_COUNT = 7;
const UI_OPENING_CONTRACT_COUNT = 5;

function issue(
  code: IssueCode,
  detail: string,
): GavanWeek1RouteRegistrationImplementationPreflightV2Issue {
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

function validateArtifactGate(
  gate: GavanWeek1SignedRouteApprovalArtifactGate,
): GavanWeek1RouteRegistrationImplementationPreflightV2Issue[] {
  const issues: GavanWeek1RouteRegistrationImplementationPreflightV2Issue[] = [];

  if (gate.kind !== 'gavan_week1_signed_route_approval_artifact_gate') {
    issues.push(issue(
      'wrong_artifact_gate_kind',
      'Route registration implementation preflight v2 requires the signed route approval artifact gate.',
    ));
  }
  if (gate.planId !== 'gavan' || gate.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Route registration implementation preflight v2 can only target Gavan week 1.',
    ));
  }
  if (
    gate.approved !== false ||
    gate.signedApprovalArtifactCreated !== false ||
    gate.routeApprovalAccepted !== false
  ) {
    issues.push(issue(
      'artifact_gate_already_approved',
      'Route registration implementation preflight v2 cannot start from an already-approved artifact gate.',
    ));
  }
  if (
    gate.readyForLive !== false ||
    gate.routeRegistrationAllowed !== false ||
    gate.liveRegressionAllowed !== false ||
    gate.deviceVerificationAllowed !== false ||
    gate.sourceWritesUsed !== false ||
    gate.liveEditsAllowed !== false
  ) {
    issues.push(issue(
      'artifact_gate_not_non_live',
      'Route registration implementation preflight v2 cannot start from a live-ready artifact gate.',
    ));
  }

  return issues;
}

function registrationPlan(): GavanWeek1RouteRegistrationPlanItem[] {
  return [
    {
      id: 'catalog_route_registration',
      status: 'blocked_waiting_for_source_registration_pass',
      plannedRouteCount: CATALOG_ROUTE_COUNT,
      sourceWritesAllowed: false,
      liveRegistrationAllowed: false,
      requiredApprovalState: 'separate_signed_approval_artifact_created',
    },
    {
      id: 'quiz_route_registration',
      status: 'blocked_waiting_for_source_registration_pass',
      plannedRouteCount: QUIZ_ROUTE_COUNT,
      sourceWritesAllowed: false,
      liveRegistrationAllowed: false,
      requiredApprovalState: 'separate_signed_approval_artifact_created',
    },
    {
      id: 'ui_route_registration',
      status: 'blocked_waiting_for_source_registration_pass',
      plannedRouteCount: UI_OPENING_CONTRACT_COUNT,
      sourceWritesAllowed: false,
      liveRegistrationAllowed: false,
      requiredApprovalState: 'separate_signed_approval_artifact_created',
    },
  ];
}

function statusFor(
  gate: GavanWeek1SignedRouteApprovalArtifactGate,
  issues: GavanWeek1RouteRegistrationImplementationPreflightV2Issue[],
): PreflightStatus {
  if (issues.length > 0) return 'blocked_invalid_signed_approval_artifact_gate';
  if (gate.status === 'signed_approval_artifact_candidate_ready_non_live') {
    return 'source_registration_plan_ready_non_live';
  }
  return 'blocked_before_signed_approval_artifact_candidate';
}

function blockersFor(status: PreflightStatus): GavanWeek1RouteRegistrationImplementationPreflightV2Blocker[] {
  const shared = [
    {
      code: 'source_registration_pass_not_started',
      blocksProduction: true as const,
      detail: 'The separate source-registration implementation pass has not started.',
    },
    {
      code: 'catalog_route_registration_blocked',
      blocksProduction: true as const,
      detail: 'Catalog route registration remains blocked.',
    },
    {
      code: 'quiz_route_registration_blocked',
      blocksProduction: true as const,
      detail: 'Quiz route registration remains blocked.',
    },
    {
      code: 'ui_route_registration_blocked',
      blocksProduction: true as const,
      detail: 'UI route registration remains blocked.',
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
  ];

  if (status === 'source_registration_plan_ready_non_live') {
    return shared;
  }

  return [
    {
      code: 'signed_approval_artifact_not_ready',
      blocksProduction: true,
      detail: 'Signed approval artifact candidate is not ready.',
    },
    ...shared,
  ];
}

function requiredNextActions(status: PreflightStatus): string[] {
  if (status === 'source_registration_plan_ready_non_live') {
    return [
      'Create the separate signed approval artifact before editing route source.',
      'Run a dedicated source-registration pass for catalog, quiz, and UI route families.',
      'Run live route regression and device opening verification after source registration.',
    ];
  }

  return [
    'Accept a complete signed route approval payload and prepare a non-live signed approval artifact candidate first.',
    'Keep route source registration blocked until a separate source-registration pass exists.',
  ];
}

export function buildGavanWeek1RouteRegistrationImplementationPreflightV2(
  gate: GavanWeek1SignedRouteApprovalArtifactGate,
  options: BuildOptions,
): BuildResult {
  const issues = validateArtifactGate(gate);
  const status = statusFor(gate, issues);
  const plan = registrationPlan();
  const blockers = blockersFor(status);
  const planReady = status === 'source_registration_plan_ready_non_live';

  return {
    valid: issues.length === 0,
    issues,
    preflight: {
      kind: 'gavan_week1_route_registration_implementation_preflight_v2',
      generatedAt: options.generatedAt,
      registrationOwnerId: options.registrationOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceArtifactGateStatus: gate.status,
      status,
      releaseDecision: 'hold',
      signedApprovalArtifactReady: gate.signedApprovalArtifactReady,
      sourceRegistrationPlanReady: planReady,
      routeRegistrationAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      readyForLive: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      registrationPlan: plan,
      summary: {
        routeFamilyCount: plan.length,
        blockedRouteFamilyCount: plan.length,
        plannedCatalogRouteCount: CATALOG_ROUTE_COUNT,
        plannedQuizRouteCount: QUIZ_ROUTE_COUNT,
        plannedUiOpeningContractCount: UI_OPENING_CONTRACT_COUNT,
        signedApprovalArtifactReady: gate.signedApprovalArtifactReady,
        sourceRegistrationPlanReady: planReady,
        inheritedArtifactBlockerCount: gate.summary.artifactBlockerCount,
        implementationBlockerCount: blockers.length,
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

export function writeGavanWeek1RouteRegistrationImplementationPreflightV2(
  gate: GavanWeek1SignedRouteApprovalArtifactGate,
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

  const result = buildGavanWeek1RouteRegistrationImplementationPreflightV2(gate, options);
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  const json = `${JSON.stringify(result.preflight, null, 2)}\n`;
  writeFileSync(options.targetPath, json, 'utf8');

  return {
    valid: result.valid,
    issues: result.issues,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(json, 'utf8'),
    preflight: result.preflight,
  };
}
