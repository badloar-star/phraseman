import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1AggregateRouteReadinessGate,
  GavanWeek1AggregateRouteBlocker,
} from './personal_plan_gavan_week1_aggregate_route_readiness_gate';

export const GAVAN_WEEK1_ROUTE_SIGNATURE_REQUEST_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-route-signature-request-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1RouteSignatureRequestStatus =
  'route_signature_request_blocked_not_signed';

export type GavanWeek1RouteSignatureRequestIssueCode =
  | 'wrong_gate_kind'
  | 'wrong_gate_status'
  | 'wrong_plan_or_week'
  | 'aggregate_gate_not_blocked'
  | 'target_path_not_allowed';

export type GavanWeek1RouteSignatureRequestIssue = {
  code: GavanWeek1RouteSignatureRequestIssueCode;
  detail: string;
};

export type GavanWeek1RouteSignatureRequestPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1RouteSignatureRequestPacketWriteOptions =
  GavanWeek1RouteSignatureRequestPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1RouteSignatureReviewerSummary = {
  catalogDayMappingCount: number;
  blockedCatalogMappings: number;
  quizRouteDesignCount: number;
  tenQuestionQuizCount: number;
  uiOpeningContractCount: number;
  coveredUiOpeningContractCount: number;
  regressionGateCount: number;
  routeBlockerCount: number;
  liveAcceptanceCriterionCount: number;
  readyForLive: false;
};

export type GavanWeek1RouteSignatureRequestPacket = {
  kind: 'gavan_week1_route_signature_request_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1RouteSignatureRequestStatus;
  sourceGateStatus: GavanWeek1AggregateRouteReadinessGate['status'];
  blockerStillOpen: 'missing_signature:product_copy';
  signatureStatus: 'missing';
  readyForLive: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  signatureMayBeInferred: false;
  reviewerSummary: GavanWeek1RouteSignatureReviewerSummary;
  routeBlockerIds: GavanWeek1AggregateRouteBlocker['id'][];
  liveAcceptanceCriterionIds: string[];
  evidenceFilePaths: {
    catalogAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json';
    quizAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json';
    uiRouteAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json';
    aggregateRouteReadinessGate: '.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json';
  };
  reviewerDecision: {
    required: true;
    status: 'not_reviewed';
    approved: false;
    approvedBy: null;
    approvedAt: null;
    signatureArtifactRequired: true;
  };
  approvalInstruction: string;
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1RouteSignatureRequestPacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1RouteSignatureRequestIssue[];
  request?: GavanWeek1RouteSignatureRequestPacket;
};

export type GavanWeek1RouteSignatureRequestPacketWriteResult =
  GavanWeek1RouteSignatureRequestPacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1RouteSignatureRequestIssueCode,
  detail: string,
): GavanWeek1RouteSignatureRequestIssue {
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

export function isGavanWeek1RouteSignatureRequestPacketTargetAllowed(
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

function validateGate(
  gate: GavanWeek1AggregateRouteReadinessGate,
): GavanWeek1RouteSignatureRequestIssue[] {
  const issues: GavanWeek1RouteSignatureRequestIssue[] = [];

  if (gate.kind !== 'gavan_week1_aggregate_route_readiness_gate') {
    issues.push(issue(
      'wrong_gate_kind',
      'Route signature request requires the P3.81 aggregate readiness gate.',
    ));
  }

  if (gate.status !== 'aggregate_route_readiness_blocked_not_applied') {
    issues.push(issue(
      'wrong_gate_status',
      'Route signature request requires a blocked aggregate readiness gate.',
    ));
  }

  if (gate.planId !== 'gavan' || gate.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Route signature request can only target Gavan week 1.',
    ));
  }

  if (
    gate.readyForLive !== false ||
    gate.sourceWritesUsed !== false ||
    gate.phaseWriteTargets.length > 0 ||
    gate.liveEditsAllowed !== false ||
    gate.catalogRouteRegistrationAllowed !== false ||
    gate.quizRouteRegistrationAllowed !== false ||
    gate.uiRouteRegistrationAllowed !== false ||
    gate.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'aggregate_gate_not_blocked',
      'Route signature request cannot infer approval from an unblocked or live-ready gate.',
    ));
  }

  return issues;
}

function reviewerSummary(
  gate: GavanWeek1AggregateRouteReadinessGate,
): GavanWeek1RouteSignatureReviewerSummary {
  return {
    catalogDayMappingCount: gate.readinessMatrix.catalog.dayMappingCount,
    blockedCatalogMappings: gate.readinessMatrix.catalog.blockedMappingCount,
    quizRouteDesignCount: gate.readinessMatrix.quiz.quizRouteDesignCount,
    tenQuestionQuizCount: gate.readinessMatrix.quiz.tenQuestionQuizCount,
    uiOpeningContractCount: gate.readinessMatrix.ui.openingContractCount,
    coveredUiOpeningContractCount: gate.readinessMatrix.ui.coveredOpeningContractCount,
    regressionGateCount: gate.readinessMatrix.ui.regressionGateCount,
    routeBlockerCount: gate.routeBlockers.length,
    liveAcceptanceCriterionCount: gate.futureLiveAcceptanceCriteria.length,
    readyForLive: false,
  };
}

function evidenceFilePaths(): GavanWeek1RouteSignatureRequestPacket['evidenceFilePaths'] {
  return {
    catalogAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json',
    quizAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json',
    uiRouteAdapterDesign: '.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json',
    aggregateRouteReadinessGate: '.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json',
  };
}

function reviewerDecision(): GavanWeek1RouteSignatureRequestPacket['reviewerDecision'] {
  return {
    required: true,
    status: 'not_reviewed',
    approved: false,
    approvedBy: null,
    approvedAt: null,
    signatureArtifactRequired: true,
  };
}

export function buildGavanWeek1RouteSignatureRequestPacket(
  gate: GavanWeek1AggregateRouteReadinessGate,
  options: GavanWeek1RouteSignatureRequestPacketOptions,
): GavanWeek1RouteSignatureRequestPacketBuildResult {
  const issues = validateGate(gate);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    request: {
      kind: 'gavan_week1_route_signature_request_packet',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'route_signature_request_blocked_not_signed',
      sourceGateStatus: gate.status,
      blockerStillOpen: 'missing_signature:product_copy',
      signatureStatus: 'missing',
      readyForLive: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      signatureMayBeInferred: false,
      reviewerSummary: reviewerSummary(gate),
      routeBlockerIds: gate.routeBlockers.map((blocker) => blocker.id),
      liveAcceptanceCriterionIds: gate.futureLiveAcceptanceCriteria.map((criterion) => criterion.id),
      evidenceFilePaths: evidenceFilePaths(),
      reviewerDecision: reviewerDecision(),
      approvalInstruction:
        'Do not mark this route request approved inside this packet. Create a separate signed route approval artifact if the full catalog, quiz, UI, and regression bundle is accepted.',
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1RouteSignatureRequestPacket(
  request: GavanWeek1RouteSignatureRequestPacket,
): string {
  return `${JSON.stringify(request, null, 2)}\n`;
}

export function writeGavanWeek1RouteSignatureRequestPacket(
  gate: GavanWeek1AggregateRouteReadinessGate,
  options: GavanWeek1RouteSignatureRequestPacketWriteOptions,
): GavanWeek1RouteSignatureRequestPacketWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1RouteSignatureRequestPacketTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Route signature request packet can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1RouteSignatureRequestPacket(gate, options);

  if (!buildResult.valid || !buildResult.request) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1RouteSignatureRequestPacket(buildResult.request);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    request: buildResult.request,
  };
}
