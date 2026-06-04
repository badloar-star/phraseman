import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type { GavanWeek1CatalogAdapterDesign } from './personal_plan_gavan_week1_catalog_adapter_design';
import type { GavanWeek1QuizAdapterDesign } from './personal_plan_gavan_week1_quiz_adapter_design';
import type { GavanWeek1UiRouteAdapterDesign } from './personal_plan_gavan_week1_ui_route_adapter_design';

export const GAVAN_WEEK1_AGGREGATE_ROUTE_READINESS_GATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-aggregate-route-readiness-gate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

type BlockedStatus = 'not_allowed_until_signature';

export type GavanWeek1AggregateRouteReadinessGateStatus =
  'aggregate_route_readiness_blocked_not_applied';

export type GavanWeek1AggregateRouteReadinessGateIssueCode =
  | 'wrong_plan_or_week'
  | 'catalog_design_not_blocked'
  | 'quiz_design_not_blocked'
  | 'ui_design_not_blocked'
  | 'target_path_not_allowed';

export type GavanWeek1AggregateRouteReadinessGateIssue = {
  code: GavanWeek1AggregateRouteReadinessGateIssueCode;
  detail: string;
};

export type GavanWeek1AggregateRouteReadinessGateOptions = {
  generatedAt: string;
};

export type GavanWeek1AggregateRouteReadinessGateWriteOptions =
  GavanWeek1AggregateRouteReadinessGateOptions & {
    targetPath: string;
  };

export type GavanWeek1AggregateReadinessMatrix = {
  catalog: {
    dayMappingCount: number;
    expectedDayMappingCount: 6;
    blockedMappingCount: number;
    registeredMappingCount: number;
    playableMappingCount: number;
    status: BlockedStatus;
    readyForLive: false;
  };
  quiz: {
    quizRouteDesignCount: number;
    expectedQuizRouteDesignCount: 6;
    blockedQuizCount: number;
    tenQuestionQuizCount: number;
    registeredQuizCount: number;
    playableQuizCount: number;
    status: BlockedStatus;
    readyForLive: false;
  };
  ui: {
    openingContractCount: number;
    expectedOpeningContractCount: 5;
    blockedOpeningContractCount: number;
    coveredOpeningContractCount: number;
    regressionGateCount: number;
    blockedRegressionGateCount: number;
    status: BlockedStatus;
    readyForLive: false;
  };
};

export type GavanWeek1AggregateRouteBlocker = {
  id:
    | 'missing_signature:product_copy'
    | 'catalog_routes_not_registered'
    | 'quiz_routes_not_registered'
    | 'ui_routes_not_registered'
    | 'live_regression_not_run';
  status: BlockedStatus;
  requiredEvidence: string;
};

export type GavanWeek1AggregateRouteReadinessGate = {
  kind: 'gavan_week1_aggregate_route_readiness_gate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1AggregateRouteReadinessGateStatus;
  sourceCatalogAdapterStatus: GavanWeek1CatalogAdapterDesign['status'];
  sourceQuizAdapterStatus: GavanWeek1QuizAdapterDesign['status'];
  sourceUiRouteAdapterStatus: GavanWeek1UiRouteAdapterDesign['status'];
  blockingDependency: 'missing_signature:product_copy';
  readyForLive: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  liveEditsAllowed: false;
  catalogRouteRegistrationAllowed: false;
  quizRouteRegistrationAllowed: false;
  uiRouteRegistrationAllowed: false;
  catalogDayIds: string[];
  quizIds: string[];
  uiOpeningFamilies: GavanWeek1UiRouteAdapterDesign['openingContracts'][number]['taskFamily'][];
  regressionGateIds: GavanWeek1UiRouteAdapterDesign['regressionGates'][number]['id'][];
  readinessMatrix: GavanWeek1AggregateReadinessMatrix;
  routeBlockers: GavanWeek1AggregateRouteBlocker[];
  futureLiveAcceptanceCriteria: {
    id:
      | 'product_copy_signature_present'
      | 'catalog_quiz_ui_contracts_agree'
      | 'route_regression_passes'
      | 'device_route_opening_verified';
    status: BlockedStatus;
    requiredEvidence: string;
  }[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1AggregateRouteReadinessGateBuildResult = {
  valid: boolean;
  issues: GavanWeek1AggregateRouteReadinessGateIssue[];
  gate?: GavanWeek1AggregateRouteReadinessGate;
};

export type GavanWeek1AggregateRouteReadinessGateWriteResult =
  GavanWeek1AggregateRouteReadinessGateBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1AggregateRouteReadinessGateIssueCode,
  detail: string,
): GavanWeek1AggregateRouteReadinessGateIssue {
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

export function isGavanWeek1AggregateRouteReadinessGateTargetAllowed(
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

function validateInputs(
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
  uiDesign: GavanWeek1UiRouteAdapterDesign,
): GavanWeek1AggregateRouteReadinessGateIssue[] {
  const issues: GavanWeek1AggregateRouteReadinessGateIssue[] = [];

  if (
    catalogDesign.planId !== 'gavan' ||
    catalogDesign.weekId !== 'gavan-week1' ||
    quizDesign.planId !== 'gavan' ||
    quizDesign.weekId !== 'gavan-week1' ||
    uiDesign.planId !== 'gavan' ||
    uiDesign.weekId !== 'gavan-week1'
  ) {
    issues.push(issue(
      'wrong_plan_or_week',
      'Aggregate route readiness can only combine Gavan week 1 designs.',
    ));
  }

  if (
    catalogDesign.status !== 'catalog_adapter_design_blocked_not_applied' ||
    catalogDesign.routeRegistrationAllowed !== false ||
    catalogDesign.liveEditsAllowed !== false ||
    catalogDesign.sourceWritesUsed !== false ||
    catalogDesign.phaseWriteTargets.length > 0 ||
    catalogDesign.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'catalog_design_not_blocked',
      'Catalog adapter design must remain blocked and non-live.',
    ));
  }

  if (
    quizDesign.status !== 'quiz_adapter_design_blocked_not_applied' ||
    quizDesign.routeRegistrationAllowed !== false ||
    quizDesign.quizRouteRegistrationAllowed !== false ||
    quizDesign.liveEditsAllowed !== false ||
    quizDesign.sourceWritesUsed !== false ||
    quizDesign.phaseWriteTargets.length > 0 ||
    quizDesign.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'quiz_design_not_blocked',
      'Quiz adapter design must remain blocked and non-live.',
    ));
  }

  if (
    uiDesign.status !== 'ui_route_adapter_design_blocked_not_applied' ||
    uiDesign.routeRegistrationAllowed !== false ||
    uiDesign.uiRouteRegistrationAllowed !== false ||
    uiDesign.liveEditsAllowed !== false ||
    uiDesign.sourceWritesUsed !== false ||
    uiDesign.phaseWriteTargets.length > 0 ||
    uiDesign.blockingDependency !== 'missing_signature:product_copy'
  ) {
    issues.push(issue(
      'ui_design_not_blocked',
      'UI route adapter design must remain blocked and non-live.',
    ));
  }

  return issues;
}

function readinessMatrix(
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
  uiDesign: GavanWeek1UiRouteAdapterDesign,
): GavanWeek1AggregateReadinessMatrix {
  return {
    catalog: {
      dayMappingCount: catalogDesign.proposedDayMappings.length,
      expectedDayMappingCount: 6,
      blockedMappingCount: catalogDesign.proposedDayMappings.filter((mapping) =>
        mapping.status === 'not_allowed_until_signature',
      ).length,
      registeredMappingCount: catalogDesign.proposedDayMappings.filter((mapping) =>
        mapping.productionRouteRegistered,
      ).length,
      playableMappingCount: catalogDesign.proposedDayMappings.filter((mapping) =>
        mapping.playable,
      ).length,
      status: 'not_allowed_until_signature',
      readyForLive: false,
    },
    quiz: {
      quizRouteDesignCount: quizDesign.perDayQuizRouteDesigns.length,
      expectedQuizRouteDesignCount: 6,
      blockedQuizCount: quizDesign.perDayQuizRouteDesigns.filter((quiz) =>
        quiz.status === 'not_allowed_until_signature',
      ).length,
      tenQuestionQuizCount: quizDesign.perDayQuizRouteDesigns.filter((quiz) =>
        quiz.requiredQuestionCount === 10,
      ).length,
      registeredQuizCount: quizDesign.perDayQuizRouteDesigns.filter((quiz) =>
        quiz.routeRegistered,
      ).length,
      playableQuizCount: quizDesign.perDayQuizRouteDesigns.filter((quiz) =>
        quiz.playable,
      ).length,
      status: 'not_allowed_until_signature',
      readyForLive: false,
    },
    ui: {
      openingContractCount: uiDesign.openingContracts.length,
      expectedOpeningContractCount: 5,
      blockedOpeningContractCount: uiDesign.openingContracts.filter((contract) =>
        contract.status === 'not_allowed_until_signature',
      ).length,
      coveredOpeningContractCount: uiDesign.openingContracts.filter((contract) =>
        contract.sourceSurfaceCoverage === 'all_required_surfaces_detected' &&
        contract.routeAbilityCoverage === 'all_required_abilities_detected',
      ).length,
      regressionGateCount: uiDesign.regressionGates.length,
      blockedRegressionGateCount: uiDesign.regressionGates.filter((gate) =>
        gate.status === 'not_allowed_until_signature',
      ).length,
      status: 'not_allowed_until_signature',
      readyForLive: false,
    },
  };
}

function routeBlockers(): GavanWeek1AggregateRouteBlocker[] {
  return [
    {
      id: 'missing_signature:product_copy',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Signed product-copy approval must exist before any live route source work.',
    },
    {
      id: 'catalog_routes_not_registered',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Catalog day routes must be registered only in a separate approved live task.',
    },
    {
      id: 'quiz_routes_not_registered',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Dedicated quiz routes must be registered only in a separate approved live task.',
    },
    {
      id: 'ui_routes_not_registered',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'UI task openings must be registered only in a separate approved live task.',
    },
    {
      id: 'live_regression_not_run',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Home, onboarding, Premium, self-guided, carryover, and completed-day regression checks must pass.',
    },
  ];
}

function futureLiveAcceptanceCriteria(): GavanWeek1AggregateRouteReadinessGate['futureLiveAcceptanceCriteria'] {
  return [
    {
      id: 'product_copy_signature_present',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'A signed product-copy approval artifact must exist.',
    },
    {
      id: 'catalog_quiz_ui_contracts_agree',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Catalog day ids, quiz ids, and UI opening contracts must be reviewed together.',
    },
    {
      id: 'route_regression_passes',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Protected user paths must pass regression checks after approved live source work.',
    },
    {
      id: 'device_route_opening_verified',
      status: 'not_allowed_until_signature',
      requiredEvidence: 'Approved live route openings must be verified on device or emulator.',
    },
  ];
}

export function buildGavanWeek1AggregateRouteReadinessGate(
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
  uiDesign: GavanWeek1UiRouteAdapterDesign,
  options: GavanWeek1AggregateRouteReadinessGateOptions,
): GavanWeek1AggregateRouteReadinessGateBuildResult {
  const issues = validateInputs(catalogDesign, quizDesign, uiDesign);

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    gate: {
      kind: 'gavan_week1_aggregate_route_readiness_gate',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'aggregate_route_readiness_blocked_not_applied',
      sourceCatalogAdapterStatus: catalogDesign.status,
      sourceQuizAdapterStatus: quizDesign.status,
      sourceUiRouteAdapterStatus: uiDesign.status,
      blockingDependency: 'missing_signature:product_copy',
      readyForLive: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
      catalogDayIds: catalogDesign.proposedDayMappings.map((mapping) => mapping.dayId),
      quizIds: quizDesign.perDayQuizRouteDesigns.map((quiz) => quiz.quizId),
      uiOpeningFamilies: uiDesign.openingContracts.map((contract) => contract.taskFamily),
      regressionGateIds: uiDesign.regressionGates.map((gate) => gate.id),
      readinessMatrix: readinessMatrix(catalogDesign, quizDesign, uiDesign),
      routeBlockers: routeBlockers(),
      futureLiveAcceptanceCriteria: futureLiveAcceptanceCriteria(),
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1AggregateRouteReadinessGate(
  gate: GavanWeek1AggregateRouteReadinessGate,
): string {
  return `${JSON.stringify(gate, null, 2)}\n`;
}

export function writeGavanWeek1AggregateRouteReadinessGate(
  catalogDesign: GavanWeek1CatalogAdapterDesign,
  quizDesign: GavanWeek1QuizAdapterDesign,
  uiDesign: GavanWeek1UiRouteAdapterDesign,
  options: GavanWeek1AggregateRouteReadinessGateWriteOptions,
): GavanWeek1AggregateRouteReadinessGateWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1AggregateRouteReadinessGateTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Aggregate route readiness gate can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1AggregateRouteReadinessGate(
    catalogDesign,
    quizDesign,
    uiDesign,
    options,
  );

  if (!buildResult.valid || !buildResult.gate) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1AggregateRouteReadinessGate(buildResult.gate);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    gate: buildResult.gate,
  };
}
