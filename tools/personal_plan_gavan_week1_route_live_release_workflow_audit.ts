import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH,
  buildGavanWeek1RoutePrerequisiteArtifactRefresh,
  writeGavanWeek1RoutePrerequisiteArtifactRefresh,
  type GavanWeek1RoutePrerequisiteArtifactRefresh,
} from './personal_plan_gavan_week1_route_prerequisite_artifact_refresh';

export const GAVAN_WEEK1_ROUTE_LIVE_RELEASE_WORKFLOW_AUDIT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-route-live-release-workflow-audit.json',
);

export type GavanWeek1RouteLiveReleaseWorkflowAuditStatus =
  | 'blocked_before_product_copy_signature'
  | 'blocked_before_route_signature'
  | 'blocked_before_route_approval_guard'
  | 'blocked_before_route_registration'
  | 'blocked_before_live_regression'
  | 'blocked_before_device_verification'
  | 'ready_for_live_route_release_review';

export type GavanWeek1RouteLiveReleaseWorkflowAuditIssueCode =
  | 'route_prerequisite_refresh_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1RouteLiveReleaseWorkflowAuditIssue = {
  code: GavanWeek1RouteLiveReleaseWorkflowAuditIssueCode;
  detail: string;
};

export type GavanWeek1RouteLiveReleaseWorkflowAuditBlockerCode =
  | 'missing_product_copy_signature'
  | 'route_signature_not_signed'
  | 'route_approval_guard_unsigned'
  | 'catalog_routes_not_registered'
  | 'quiz_routes_not_registered'
  | 'ui_routes_not_registered'
  | 'live_route_regression_not_run'
  | 'device_route_opening_not_verified';

export type GavanWeek1RouteLiveReleaseWorkflowAuditBlocker = {
  code: GavanWeek1RouteLiveReleaseWorkflowAuditBlockerCode;
  blocksProduction: true;
  detail: string;
};

export type GavanWeek1RouteLiveReleaseWorkflowStageId =
  | 'product_copy_signature'
  | 'route_signature_request'
  | 'route_approval_guard'
  | 'catalog_route_registration'
  | 'quiz_route_registration'
  | 'ui_route_registration'
  | 'live_route_regression'
  | 'device_route_opening_verification';

export type GavanWeek1RouteLiveReleaseWorkflowStage = {
  id: GavanWeek1RouteLiveReleaseWorkflowStageId;
  status: 'blocked';
  productionReady: false;
  liveWriteAllowed: false;
  requiredEvidence: string;
};

export type GavanWeek1RouteLiveReleaseWorkflowAudit = {
  kind: 'gavan_week1_route_live_release_workflow_audit';
  generatedAt: string;
  workflowOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceRefreshStatus: GavanWeek1RoutePrerequisiteArtifactRefresh['status'];
  status: GavanWeek1RouteLiveReleaseWorkflowAuditStatus;
  releaseDecision: 'hold' | 'ready_for_review';
  productionReady: false;
  readyForLive: false;
  routeLiveReleaseReady: false;
  productCopySignatureReady: false;
  routeSignatureReady: false;
  routeApprovalReady: false;
  liveImplementationAllowed: false;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  liveRegressionReady: false;
  deviceVerificationReady: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  phaseWriteTargets: [];
  summary: {
    prerequisiteArtifactCount: number;
    nonLiveArtifactCount: number;
    liveArtifactCount: number;
    routeBlockerCount: number;
    liveAcceptanceCriterionCount: number;
    workflowStageCount: number;
    blockedWorkflowStageCount: number;
    blockerCount: number;
  };
  blockers: GavanWeek1RouteLiveReleaseWorkflowAuditBlocker[];
  workflowStages: GavanWeek1RouteLiveReleaseWorkflowStage[];
  artifactPaths: {
    routePrerequisiteRefresh: string;
    routeLiveReleaseWorkflowAudit: string;
  };
  requiredNextActions: [
    'Create a signed product-copy approval artifact before route release review can begin.',
    'Review and sign the route signature request as a separate explicit approval artifact.',
    'Run the route approval guard with complete signed metadata and evidence paths.',
    'Apply route source changes only in a separate approved live implementation pass.',
    'Run route regression and device opening verification after approved live source work.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    routeFilesEdited: false;
  };
};

type BuildOptions = {
  generatedAt: string;
  workflowOwnerId: string;
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  issues: GavanWeek1RouteLiveReleaseWorkflowAuditIssue[];
  audit: GavanWeek1RouteLiveReleaseWorkflowAudit;
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Route live-release workflow audit can only write under .codex-tmp or docs/reports.';

const ALLOWED_TARGET_ROOTS = [
  path.resolve(process.cwd(), '.codex-tmp'),
  path.resolve(process.cwd(), 'docs', 'reports'),
];

function isAllowedTargetPath(targetPath: string): boolean {
  const resolvedTargetPath = path.resolve(targetPath);

  return ALLOWED_TARGET_ROOTS.some((allowedRoot) => {
    const relativePath = path.relative(allowedRoot, resolvedTargetPath);

    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  });
}

function relativeArtifactPath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}

function workflowStages(): GavanWeek1RouteLiveReleaseWorkflowStage[] {
  return [
    {
      id: 'product_copy_signature',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Signed product-copy approval artifact with full route bundle scope.',
    },
    {
      id: 'route_signature_request',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Route signature request reviewed and signed outside this audit.',
    },
    {
      id: 'route_approval_guard',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Route approval guard accepts complete signed metadata and evidence paths.',
    },
    {
      id: 'catalog_route_registration',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Approved catalog day mappings registered in a separate live pass.',
    },
    {
      id: 'quiz_route_registration',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Approved dedicated quiz routes registered in a separate live pass.',
    },
    {
      id: 'ui_route_registration',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Approved task opening routes connected in a separate live pass.',
    },
    {
      id: 'live_route_regression',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Home, onboarding, Premium, self-guided, carryover, and completed-day checks pass.',
    },
    {
      id: 'device_route_opening_verification',
      status: 'blocked',
      productionReady: false,
      liveWriteAllowed: false,
      requiredEvidence: 'Approved route openings verified on device or emulator after live source work.',
    },
  ];
}

function blockers(): GavanWeek1RouteLiveReleaseWorkflowAuditBlocker[] {
  return [
    {
      code: 'missing_product_copy_signature',
      blocksProduction: true,
      detail: 'Product-copy signature is missing, so route release review cannot begin.',
    },
    {
      code: 'route_signature_not_signed',
      blocksProduction: true,
      detail: 'Route signature request remains unsigned.',
    },
    {
      code: 'route_approval_guard_unsigned',
      blocksProduction: true,
      detail: 'Route approval guard remains blocked without signed approval metadata.',
    },
    {
      code: 'catalog_routes_not_registered',
      blocksProduction: true,
      detail: 'Catalog routes are not registered for live release.',
    },
    {
      code: 'quiz_routes_not_registered',
      blocksProduction: true,
      detail: 'Dedicated quiz routes are not registered for live release.',
    },
    {
      code: 'ui_routes_not_registered',
      blocksProduction: true,
      detail: 'Task opening routes are not registered for live release.',
    },
    {
      code: 'live_route_regression_not_run',
      blocksProduction: true,
      detail: 'Live route regression evidence has not been produced.',
    },
    {
      code: 'device_route_opening_not_verified',
      blocksProduction: true,
      detail: 'Device or emulator route opening verification has not been produced.',
    },
  ];
}

function statusForStages(
  stages: GavanWeek1RouteLiveReleaseWorkflowStage[],
): GavanWeek1RouteLiveReleaseWorkflowAuditStatus {
  if (stages.some((stage) => stage.id === 'product_copy_signature' && stage.status === 'blocked')) {
    return 'blocked_before_product_copy_signature';
  }

  if (stages.some((stage) => stage.id === 'route_signature_request' && stage.status === 'blocked')) {
    return 'blocked_before_route_signature';
  }

  if (stages.some((stage) => stage.id === 'route_approval_guard' && stage.status === 'blocked')) {
    return 'blocked_before_route_approval_guard';
  }

  if (stages.some((stage) =>
    (
      stage.id === 'catalog_route_registration' ||
      stage.id === 'quiz_route_registration' ||
      stage.id === 'ui_route_registration'
    ) && stage.status === 'blocked',
  )) {
    return 'blocked_before_route_registration';
  }

  if (stages.some((stage) => stage.id === 'live_route_regression' && stage.status === 'blocked')) {
    return 'blocked_before_live_regression';
  }

  if (stages.some((stage) => stage.id === 'device_route_opening_verification' && stage.status === 'blocked')) {
    return 'blocked_before_device_verification';
  }

  return 'ready_for_live_route_release_review';
}

function writeJson(targetPath: string, value: unknown): number {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(targetPath, content, 'utf8');

  return Buffer.byteLength(content, 'utf8');
}

function auditFromRefresh(
  options: BuildOptions,
  refresh: GavanWeek1RoutePrerequisiteArtifactRefresh,
): GavanWeek1RouteLiveReleaseWorkflowAudit {
  const stages = workflowStages();
  const blockerRows = blockers();
  const routeBlockerIds = new Set([
    'missing_signature:product_copy',
    'catalog_routes_not_registered',
    'quiz_routes_not_registered',
    'ui_routes_not_registered',
    'live_regression_not_run',
  ]);
  const liveAcceptanceCriterionIds = new Set([
    'product_copy_signature_present',
    'catalog_quiz_ui_contracts_agree',
    'route_regression_passes',
    'device_route_opening_verified',
  ]);

  return {
    kind: 'gavan_week1_route_live_release_workflow_audit',
    generatedAt: options.generatedAt,
    workflowOwnerId: options.workflowOwnerId,
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceRefreshStatus: refresh.status,
    status: statusForStages(stages),
    releaseDecision: 'hold',
    productionReady: false,
    readyForLive: false,
    routeLiveReleaseReady: false,
    productCopySignatureReady: false,
    routeSignatureReady: false,
    routeApprovalReady: false,
    liveImplementationAllowed: false,
    catalogRouteRegistrationAllowed: false,
    quizRouteRegistrationAllowed: false,
    uiRouteRegistrationAllowed: false,
    liveRegressionReady: false,
    deviceVerificationReady: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    phaseWriteTargets: [],
    summary: {
      prerequisiteArtifactCount: refresh.summary.expectedArtifactCount,
      nonLiveArtifactCount: refresh.summary.writtenArtifactCount - refresh.summary.liveArtifactCount,
      liveArtifactCount: refresh.summary.liveArtifactCount,
      routeBlockerCount: routeBlockerIds.size,
      liveAcceptanceCriterionCount: liveAcceptanceCriterionIds.size,
      workflowStageCount: stages.length,
      blockedWorkflowStageCount: stages.filter((stage) => stage.status === 'blocked').length,
      blockerCount: blockerRows.length,
    },
    blockers: blockerRows,
    workflowStages: stages,
    artifactPaths: {
      routePrerequisiteRefresh: relativeArtifactPath(GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH),
      routeLiveReleaseWorkflowAudit: relativeArtifactPath(GAVAN_WEEK1_ROUTE_LIVE_RELEASE_WORKFLOW_AUDIT_PATH),
    },
    requiredNextActions: [
      'Create a signed product-copy approval artifact before route release review can begin.',
      'Review and sign the route signature request as a separate explicit approval artifact.',
      'Run the route approval guard with complete signed metadata and evidence paths.',
      'Apply route source changes only in a separate approved live implementation pass.',
      'Run route regression and device opening verification after approved live source work.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
      routeFilesEdited: false,
    },
  };
}

function failureAudit(
  options: BuildOptions,
  issues: GavanWeek1RouteLiveReleaseWorkflowAuditIssue[],
): GavanWeek1RouteLiveReleaseWorkflowAudit {
  const fallbackRefresh: GavanWeek1RoutePrerequisiteArtifactRefresh = {
    kind: 'gavan_week1_route_prerequisite_artifact_refresh',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'route_prerequisites_refreshed_non_live',
    readyForLive: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    audioApprovalMayBeInferred: false,
    routeApprovalMayBeInferred: false,
    summary: {
      expectedArtifactCount: 0,
      writtenArtifactCount: 0,
      failedArtifactCount: issues.length,
      liveArtifactCount: 0,
    },
    artifacts: [],
    requiredNextActions: [
      'Run the broad Personal Plans gate after refreshing route prerequisite artifacts.',
      'Keep live catalog, quiz, UI, audio, pronunciation, and sync edits blocked until explicit approvals exist.',
      'Do not treat refreshed .codex-tmp artifacts as production readiness.',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
  const audit = auditFromRefresh(options, fallbackRefresh);

  return {
    ...audit,
    summary: {
      ...audit.summary,
      blockerCount: issues.length,
    },
  };
}

export function buildGavanWeek1RouteLiveReleaseWorkflowAudit(
  options: BuildOptions,
): BuildResult {
  const refreshResult = buildGavanWeek1RoutePrerequisiteArtifactRefresh({
    generatedAt: options.generatedAt,
  });

  if (!refreshResult.valid || !refreshResult.refresh) {
    const issues: GavanWeek1RouteLiveReleaseWorkflowAuditIssue[] = refreshResult.issues.map((item) => ({
      code: 'route_prerequisite_refresh_invalid',
      detail: `${item.code}: ${item.detail}`,
    }));

    return {
      valid: false,
      issues,
      audit: failureAudit(options, issues),
    };
  }

  return {
    valid: true,
    issues: [],
    audit: auditFromRefresh(options, refreshResult.refresh),
  };
}

export function writeGavanWeek1RouteLiveReleaseWorkflowAudit(
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1RouteLiveReleaseWorkflowAuditIssue[] = [{
      code: 'target_path_not_allowed',
      detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
    }];

    return {
      valid: false,
      issues,
      audit: failureAudit(options, issues),
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  writeGavanWeek1RoutePrerequisiteArtifactRefresh({
    generatedAt: options.generatedAt,
    targetPath: GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH,
  });
  const result = buildGavanWeek1RouteLiveReleaseWorkflowAudit(options);
  const bytesWritten = writeJson(options.targetPath, result.audit);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
