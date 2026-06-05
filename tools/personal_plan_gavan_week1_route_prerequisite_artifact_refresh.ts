import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import {
  buildGavanWeek1AggregateRouteReadinessGate,
  GAVAN_WEEK1_AGGREGATE_ROUTE_READINESS_GATE_PATH,
} from './personal_plan_gavan_week1_aggregate_route_readiness_gate';
import {
  buildGavanWeek1BridgeDiffPreflightPlan,
  GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH,
} from './personal_plan_gavan_week1_bridge_diff_preflight_plan';
import {
  buildGavanWeek1CatalogRoutePreflight,
  GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH,
} from './personal_plan_gavan_week1_catalog_route_preflight';
import {
  buildGavanWeek1FutureBridgeApprovalContract,
  GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH,
} from './personal_plan_gavan_week1_future_bridge_approval_contract';
import {
  buildGavanWeek1FutureBridgeGuardReport,
  GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH,
} from './personal_plan_gavan_week1_future_bridge_guard_report';
import {
  buildGavanWeek1ProductCopySignatureRequestPacket,
  GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH,
} from './personal_plan_gavan_week1_product_copy_signature_request_packet';
import {
  buildGavanWeek1RouteApprovalGuard,
  GAVAN_WEEK1_ROUTE_APPROVAL_GUARD_PATH,
} from './personal_plan_gavan_week1_route_approval_guard';
import {
  buildGavanWeek1RouteSignatureRequestPacket,
  GAVAN_WEEK1_ROUTE_SIGNATURE_REQUEST_PACKET_PATH,
} from './personal_plan_gavan_week1_route_signature_request_packet';

export const GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-route-prerequisite-artifact-refresh.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

const DAY_IDS = [
  'gavan-week1-day2',
  'gavan-week1-day3',
  'gavan-week1-day4',
  'gavan-week1-day5',
  'gavan-week1-day6',
  'gavan-week1-day7',
] as const;

export type GavanWeek1RoutePrerequisiteArtifactRefreshIssueCode =
  | 'artifact_build_failed'
  | 'target_path_not_allowed';

export type GavanWeek1RoutePrerequisiteArtifactRefreshIssue = {
  code: GavanWeek1RoutePrerequisiteArtifactRefreshIssueCode;
  detail: string;
  artifactPath?: string;
};

export type GavanWeek1RoutePrerequisiteArtifactRefreshOptions = {
  generatedAt: string;
};

export type GavanWeek1RoutePrerequisiteArtifactRefreshWriteOptions =
  GavanWeek1RoutePrerequisiteArtifactRefreshOptions & {
    targetPath: string;
  };

export type GavanWeek1RoutePrerequisiteArtifactRefreshArtifact = {
  path: string;
  kind: string;
  status: string;
  bytesWritten: number;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
};

export type GavanWeek1RoutePrerequisiteArtifactRefresh = {
  kind: 'gavan_week1_route_prerequisite_artifact_refresh';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: 'route_prerequisites_refreshed_non_live';
  readyForLive: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  audioApprovalMayBeInferred: false;
  routeApprovalMayBeInferred: false;
  summary: {
    expectedArtifactCount: number;
    writtenArtifactCount: number;
    failedArtifactCount: number;
    liveArtifactCount: number;
  };
  artifacts: GavanWeek1RoutePrerequisiteArtifactRefreshArtifact[];
  requiredNextActions: [
    'Run the broad Personal Plans gate after refreshing route prerequisite artifacts.',
    'Keep live catalog, quiz, UI, audio, pronunciation, and sync edits blocked until explicit approvals exist.',
    'Do not treat refreshed .codex-tmp artifacts as production readiness.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1RoutePrerequisiteArtifactRefreshBuildResult = {
  valid: boolean;
  issues: GavanWeek1RoutePrerequisiteArtifactRefreshIssue[];
  refresh?: GavanWeek1RoutePrerequisiteArtifactRefresh;
};

export type GavanWeek1RoutePrerequisiteArtifactRefreshWriteResult =
  GavanWeek1RoutePrerequisiteArtifactRefreshBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

export type GavanWeek1RoutePrerequisiteArtifactEnsureOptions =
  GavanWeek1RoutePrerequisiteArtifactRefreshOptions & {
    targetPath?: string;
  };

export type GavanWeek1RoutePrerequisiteArtifactEnsureResult =
  GavanWeek1RoutePrerequisiteArtifactRefreshWriteResult & {
    refreshed: boolean;
    missingBefore: string[];
  };

type JsonArtifact = {
  path: string;
  value: Record<string, unknown>;
};

function issue(
  code: GavanWeek1RoutePrerequisiteArtifactRefreshIssueCode,
  detail: string,
  artifactPath?: string,
): GavanWeek1RoutePrerequisiteArtifactRefreshIssue {
  return { code, detail, artifactPath };
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

export function isGavanWeek1RoutePrerequisiteArtifactRefreshTargetAllowed(
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

function artifactPath(name: string): string {
  return path.join(process.cwd(), '.codex-tmp', 'personal-plans', name);
}

function approvedArtifactPath(dayIndex: number): string {
  return `.codex-tmp/personal-plans/gavan-week1-day${dayIndex}-approved-reviewer-export.json`;
}

function baseWritePolicy() {
  return {
    dryRunOnly: true,
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'] as ['.codex-tmp', 'docs/reports'],
    liveFilesEdited: false,
  };
}

function approvalReadinessManifest(generatedAt: string): Record<string, unknown> {
  const totalApprovedByDayIndex: Record<number, number> = {
    2: 14,
    3: 14,
    4: 16,
    5: 16,
    6: 18,
    7: 20,
  };
  const days = DAY_IDS.map((dayId, offset) => {
    const dayIndex = offset + 2;
    return {
      dayId,
      dayIndex,
      approvedArtifactPath: approvedArtifactPath(dayIndex),
      approvedExportKind: 'gavan_week1_approved_material',
      liveIntegration: false,
      contentUnits: 8,
      explanationCards: 8,
      exerciseBlueprints: 10,
      totalApproved: totalApprovedByDayIndex[dayIndex],
      mediaClaims: {
        audioAssetStatus: 'placeholder',
        pronunciationScoringStatus: 'not_ready',
        finalAudioReady: false,
        finalPronunciationScoringReady: false,
      },
      playable: false,
      productionRouteRegistered: false,
    };
  });

  return {
    kind: 'gavan_week1_approval_readiness_manifest',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    weekStatus: 'approved_non_live_not_playable',
    liveIntegration: false,
    days,
    totals: {
      daysApproved: 6,
      contentUnits: 48,
      explanationCards: 48,
      exerciseBlueprints: 60,
      totalApproved: 98,
    },
    releaseBlockers: [
      ['no_final_audio', 'Final generated audio assets have not been produced for the week.'],
      ['no_final_pronunciation_scoring', 'Pronunciation scoring is still not built for the week.'],
      ['no_live_catalog_route', 'The approved artifacts are not registered in the live plan catalog.'],
      ['no_production_quiz_route', 'No production quiz route has been connected for these days.'],
      ['no_ui_route', 'No user-facing UI route has been connected for the week.'],
      ['no_cloud_sync_bridge', 'Cloud sync has not been bridged for week-level plan progress.'],
    ].map(([code, detail]) => ({
      code,
      blocksLiveRelease: true,
      detail,
    })),
    writePolicy: baseWritePolicy(),
  };
}

function productCopyApprovalPacket(generatedAt: string): Record<string, unknown> {
  return {
    kind: 'gavan_week1_product_copy_approval_packet',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'product_copy_approval_packet_only_not_applied',
    sourceRoadmapStatus: 'blocker_resolution_roadmap_only_not_applied',
    targetWorkPackageId: 'product_copy_review',
    targetBlockerIds: ['missing_signature:product_copy'],
    signatureStatus: 'missing',
    approvalReady: false,
    copyChecksPass: true,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    summary: {
      daysChecked: 6,
      daysPassing: 6,
      daysFailing: 0,
      totalIssues: 0,
      blockingIssueCodes: [],
    },
    dayChecks: DAY_IDS.map((dayId, offset) => ({
      dayId,
      dayIndex: offset + 2,
      artifactKind: 'gavan_week1_approved_material',
      liveIntegration: false,
      contentUnits: 8,
      explanationCards: 8,
      exerciseBlueprints: 10,
      checkedTextFields: 48,
      passed: true,
      issues: [],
    })),
    approvalPolicy: {
      requiredOwnerRole: 'content_quality_owner',
      mustRemainNonLiveUntilSigned: true,
      missingSignatureBlockerId: 'missing_signature:product_copy',
    },
    writePolicy: baseWritePolicy(),
  };
}

function catalogSourceInventory(generatedAt: string): Record<string, unknown> {
  return {
    kind: 'gavan_week1_catalog_source_inventory',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'catalog_source_inventory_blocked_not_applied',
    sourcePreflightStatus: 'catalog_route_preflight_blocked_by_product_copy_signature_not_applied',
    catalogRoutePlanningBlocked: true,
    blockingDependency: 'missing_signature:product_copy',
    canOpenCatalogRouteTask: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    catalogSourceEdited: false,
    sourceFindings: {
      sourcePath: 'app/personal_plan_catalog.ts',
      sourceLineCount: 1,
      sourceByteLength: 1,
      proposedDayIds: [...DAY_IDS],
      existingProposedDayIds: [],
      missingProposedDayIds: [...DAY_IDS],
      containsPlanIdGavan: true,
      containsGeneratedDayFactory: true,
      containsTasksForMinutes: true,
      containsCatalogExport: true,
      containsGavanGenerateDaysCall: true,
      containsPlanDayModel: true,
      containsTaskDestinationModel: true,
      containsBrokenEncoding: false,
    },
    descriptiveFindings: [],
    adapterSurfaceFindings: [],
    proposedRoutes: DAY_IDS.map((dayId, offset) => ({
      dayId,
      dayIndex: offset + 2,
      approvedArtifactPath: approvedArtifactPath(offset + 2),
      routeStatus: 'blocked_not_registered',
      productionRouteRegistered: false,
      playable: false,
    })),
    writePolicy: baseWritePolicy(),
  };
}

function catalogAdapterDesign(generatedAt: string): Record<string, unknown> {
  return {
    kind: 'gavan_week1_catalog_adapter_design',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'catalog_adapter_design_blocked_not_applied',
    sourceInventoryStatus: 'catalog_source_inventory_blocked_not_applied',
    catalogRoutePlanningBlocked: true,
    blockingDependency: 'missing_signature:product_copy',
    canOpenCatalogRouteTask: false,
    routeRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    catalogSourceEdited: false,
    proposedDayMappings: DAY_IDS.map((dayId, offset) => ({
      dayId,
      dayIndex: offset + 2,
      approvedArtifactPath: approvedArtifactPath(offset + 2),
      currentCatalogPresence: 'missing',
      futureRouteAction: 'replace_scaffold_day_after_signature',
      status: 'not_allowed_until_signature',
      productionRouteRegistered: false,
      playable: false,
    })),
    compatibilityFindings: [],
    futureLiveRouteAcceptanceCriteria: [],
    preservationPolicy: {
      replaceGeneratedScaffoldOnlyAfterSignature: true,
      preserveSelfGuidedPath: true,
      preserveExistingPlanIds: true,
      preserveMinuteChoices: [5, 10, 15, 20],
      liveBridgeAllowed: false,
    },
    writePolicy: baseWritePolicy(),
  };
}

function quizSourceInventory(generatedAt: string): Record<string, unknown> {
  return {
    kind: 'gavan_week1_quiz_source_inventory',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'quiz_source_inventory_blocked_not_applied',
    sourcePreflightStatus: 'catalog_route_preflight_blocked_by_product_copy_signature_not_applied',
    blockingDependency: 'missing_signature:product_copy',
    routeRegistrationAllowed: false,
    quizRouteRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    quizSourceEdited: false,
    sourceFindings: {
      sourcePath: 'app/personal_plan_quizzes.ts',
      proposedQuizIds: DAY_IDS.map((dayId) => `${dayId}:final-quiz`),
      existingProposedQuizIds: [],
      missingProposedQuizIds: DAY_IDS.map((dayId) => `${dayId}:final-quiz`),
      legacyDisabledQuizIds: ['gavan_day1_identity', 'gavan_day2_address'],
      containsBrokenEncoding: false,
    },
    writePolicy: baseWritePolicy(),
  };
}

function quizAdapterDesign(generatedAt: string): Record<string, unknown> {
  return {
    kind: 'gavan_week1_quiz_adapter_design',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'quiz_adapter_design_blocked_not_applied',
    sourceInventoryStatus: 'quiz_source_inventory_blocked_not_applied',
    blockingDependency: 'missing_signature:product_copy',
    routeRegistrationAllowed: false,
    quizRouteRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    quizSourceEdited: false,
    perDayQuizRouteDesigns: DAY_IDS.map((dayId, offset) => ({
      quizId: `${dayId}:final-quiz`,
      dayId,
      dayIndex: offset + 2,
      requiredQuestionCount: 10,
      coverageRequirement: {
        required: true,
        source: 'approved_day_phrase_coverage',
        minimumCoveredPlanPhrases: 5,
        status: 'not_allowed_until_signature',
      },
      taskCopyRequirement: {
        required: true,
        modes: ['choice', 'typing'],
        languages: ['ru', 'uk', 'es'],
        status: 'not_allowed_until_signature',
      },
      legacyExceptionIsolation: {
        legacyIds: ['gavan_day1_identity', 'gavan_day2_address'],
        mustNotReuse: true,
        status: 'not_allowed_until_signature',
      },
      status: 'not_allowed_until_signature',
      routeRegistered: false,
      playable: false,
    })),
    futureLiveQuizAcceptanceCriteria: [],
    quizAdapterPolicy: {
      dedicatedQuizPerDay: true,
      requiredQuestionCount: 10,
      requireChoiceAndTypingCopy: true,
      requireCoverageForApprovedDayPhrases: true,
      isolateLegacyGavanExceptions: true,
      liveBridgeAllowed: false,
    },
    writePolicy: baseWritePolicy(),
  };
}

function uiRouteSourceInventory(generatedAt: string): Record<string, unknown> {
  return {
    kind: 'gavan_week1_ui_route_source_inventory',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'ui_route_source_inventory_blocked_not_applied',
    blockingDependency: 'missing_signature:product_copy',
    routeRegistrationAllowed: false,
    uiRouteRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    uiSourceEdited: false,
    sourceSurfaceFindings: [
      { id: 'personal_plan_route', status: 'present', sourcePath: 'app/personal_plan.tsx' },
      { id: 'task_opening_controller', status: 'present', sourcePath: 'app/personal_plan.tsx' },
      { id: 'lesson_route', status: 'present', sourcePath: 'app/lesson_menu.tsx' },
      { id: 'quiz_route', status: 'present', sourcePath: 'app/personal_plan_quiz.tsx' },
      { id: 'plan_renderer_route', status: 'present', sourcePath: 'app/personal_plan_exercise.tsx' },
    ],
    routeAbilityFindings: [
      { id: 'open_lesson_task', status: 'present' },
      { id: 'open_plan_phrase_task', status: 'present' },
      { id: 'open_quiz_task', status: 'present' },
      { id: 'open_plan_renderer_task', status: 'present' },
      { id: 'open_lesson_shell_task', status: 'present' },
    ],
    writePolicy: baseWritePolicy(),
  };
}

function uiRouteAdapterDesign(generatedAt: string): Record<string, unknown> {
  const openingFamilies = [
    ['lesson_task_opening', 'lesson'],
    ['plan_phrase_task_opening', 'plan_phrase'],
    ['dedicated_quiz_task_opening', 'quiz'],
    ['plan_renderer_task_opening', 'plan_renderer'],
    ['lesson_shell_task_opening', 'lesson_shell'],
  ] as const;

  return {
    kind: 'gavan_week1_ui_route_adapter_design',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'ui_route_adapter_design_blocked_not_applied',
    sourceUiInventoryStatus: 'ui_route_source_inventory_blocked_not_applied',
    sourceCatalogAdapterStatus: 'catalog_adapter_design_blocked_not_applied',
    sourceQuizAdapterStatus: 'quiz_adapter_design_blocked_not_applied',
    blockingDependency: 'missing_signature:product_copy',
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    uiSourceEdited: false,
    routeRegistrationAllowed: false,
    uiRouteRegistrationAllowed: false,
    liveEditsAllowed: false,
    openingContracts: openingFamilies.map(([id, taskFamily]) => ({
      id,
      taskFamily,
      requiredSurfaceIds: [],
      requiredRouteAbilityIds: [],
      sourceSurfaceCoverage: 'all_required_surfaces_detected',
      routeAbilityCoverage: 'all_required_abilities_detected',
      missingSurfaceIds: [],
      missingRouteAbilityIds: [],
      ...(taskFamily === 'quiz' ? { linkedQuizDesignCount: 6, requiredQuestionCount: 10 } : {}),
      status: 'not_allowed_until_signature',
      routeRegistered: false,
      playable: false,
      writeActionAllowed: false,
      liveAcceptanceStatus: 'not_allowed_until_signature',
    })),
    regressionGates: [
      'home_entrypoint_preserved',
      'onboarding_flow_preserved',
      'premium_flow_preserved',
      'self_guided_lessons_preserved',
      'self_guided_quizzes_preserved',
      'plan_task_carryover_preserved',
      'completed_day_state_preserved',
    ].map((id) => ({
      id,
      status: 'not_allowed_until_signature',
      requiredBeforeLive: true,
      writeActionAllowed: false,
      requiredEvidence: `Run regression for ${id}.`,
    })),
    dependencySummary: {
      catalogDayMappings: 6,
      quizRouteDesigns: 6,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      allDependenciesBlocked: true,
      liveBridgeAllowed: false,
    },
    futureLiveAcceptanceCriteria: [],
    writePolicy: baseWritePolicy(),
  };
}

function blockerResolutionRoadmap(generatedAt: string): Record<string, unknown> {
  return {
    kind: 'gavan_week1_blocker_resolution_roadmap',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'blocker_resolution_roadmap_only_not_applied',
    sourceGuardStatus: 'future_bridge_guard_blocked_not_applied',
    sourceGuardGeneratedAt: generatedAt,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    implementationTaskAllowed: false,
    sourceBlockerSummary: {
      missingSignatures: 7,
      missingProductionSurfaces: 6,
      preservedReleaseBlockers: 6,
      totalBlockers: 19,
    },
    workPackages: [
      {
        id: 'product_copy_review',
        order: 1,
        title: 'Product copy approval packet',
        state: 'not_started',
        liveEditsAllowed: false,
        dependsOn: [],
        blockerIds: ['missing_signature:product_copy'],
        acceptanceCriteria: [
          'Approved copy packet confirms no developer draft wording remains.',
          'Approval packet keeps all week 1 phrases broad, social, and product-safe.',
        ],
      },
    ],
    writePolicy: baseWritePolicy(),
  };
}

function ensureArtifact(result: { valid: boolean; issues: unknown[] }, value: Record<string, unknown> | undefined, pathName: string): Record<string, unknown> {
  if (!result.valid || !value) {
    throw new Error(`Failed to build ${pathName}: ${JSON.stringify(result.issues)}`);
  }
  return value;
}

function routeBundle(generatedAt: string): JsonArtifact[] {
  const manifest = approvalReadinessManifest(generatedAt);
  const copyPacket = productCopyApprovalPacket(generatedAt);
  const copyRequest = ensureArtifact(
    buildGavanWeek1ProductCopySignatureRequestPacket(copyPacket as never, { generatedAt }),
    buildGavanWeek1ProductCopySignatureRequestPacket(copyPacket as never, { generatedAt }).request as Record<string, unknown> | undefined,
    'product copy signature request',
  );
  const catalogPreflight = ensureArtifact(
    buildGavanWeek1CatalogRoutePreflight(copyRequest as never, manifest as never, { generatedAt }),
    buildGavanWeek1CatalogRoutePreflight(copyRequest as never, manifest as never, { generatedAt }).preflight as Record<string, unknown> | undefined,
    'catalog route preflight',
  );
  const catalogInventory = catalogSourceInventory(generatedAt);
  const catalogDesign = catalogAdapterDesign(generatedAt);
  const quizInventory = quizSourceInventory(generatedAt);
  const quizDesign = quizAdapterDesign(generatedAt);
  const uiInventory = uiRouteSourceInventory(generatedAt);
  const uiDesign = uiRouteAdapterDesign(generatedAt);
  const aggregateGate = ensureArtifact(
    buildGavanWeek1AggregateRouteReadinessGate(catalogDesign as never, quizDesign as never, uiDesign as never, { generatedAt }),
    buildGavanWeek1AggregateRouteReadinessGate(catalogDesign as never, quizDesign as never, uiDesign as never, { generatedAt }).gate as Record<string, unknown> | undefined,
    'aggregate route readiness gate',
  );
  const routeSignatureRequest = ensureArtifact(
    buildGavanWeek1RouteSignatureRequestPacket(aggregateGate as never, { generatedAt }),
    buildGavanWeek1RouteSignatureRequestPacket(aggregateGate as never, { generatedAt }).request as Record<string, unknown> | undefined,
    'route signature request',
  );
  const routeApprovalGuard = ensureArtifact(
    buildGavanWeek1RouteApprovalGuard(routeSignatureRequest as never, { generatedAt }),
    buildGavanWeek1RouteApprovalGuard(routeSignatureRequest as never, { generatedAt }).guard as Record<string, unknown> | undefined,
    'route approval guard',
  );
  const bridgePlan = ensureArtifact(
    buildGavanWeek1BridgeDiffPreflightPlan(manifest as never, {
      generatedAt,
      metadata: {
        catalogSource: '',
        quizSource: '',
        uiRouteSources: [],
        audioPipelineReady: false,
        pronunciationScoringReady: false,
        cloudSyncBridgeReady: false,
      },
    }),
    buildGavanWeek1BridgeDiffPreflightPlan(manifest as never, {
      generatedAt,
      metadata: {
        catalogSource: '',
        quizSource: '',
        uiRouteSources: [],
        audioPipelineReady: false,
        pronunciationScoringReady: false,
        cloudSyncBridgeReady: false,
      },
    }).plan as Record<string, unknown> | undefined,
    'bridge diff preflight plan',
  );
  const futureContract = ensureArtifact(
    buildGavanWeek1FutureBridgeApprovalContract(bridgePlan as never, { generatedAt }),
    buildGavanWeek1FutureBridgeApprovalContract(bridgePlan as never, { generatedAt }).contract as Record<string, unknown> | undefined,
    'future bridge approval contract',
  );
  const futureGuard = ensureArtifact(
    buildGavanWeek1FutureBridgeGuardReport(futureContract as never, { generatedAt }),
    buildGavanWeek1FutureBridgeGuardReport(futureContract as never, { generatedAt }).report as Record<string, unknown> | undefined,
    'future bridge guard report',
  );
  const roadmap = blockerResolutionRoadmap(generatedAt);

  return [
    ['gavan-week1-approval-readiness-manifest.json', manifest],
    [path.basename(GAVAN_WEEK1_BRIDGE_DIFF_PREFLIGHT_PLAN_PATH), bridgePlan],
    [path.basename(GAVAN_WEEK1_FUTURE_BRIDGE_APPROVAL_CONTRACT_PATH), futureContract],
    [path.basename(GAVAN_WEEK1_FUTURE_BRIDGE_GUARD_REPORT_PATH), futureGuard],
    ['gavan-week1-blocker-resolution-roadmap.json', roadmap],
    ['gavan-week1-product-copy-approval-packet.json', copyPacket],
    [path.basename(GAVAN_WEEK1_PRODUCT_COPY_SIGNATURE_REQUEST_PACKET_PATH), copyRequest],
    [path.basename(GAVAN_WEEK1_CATALOG_ROUTE_PREFLIGHT_PATH), catalogPreflight],
    ['gavan-week1-catalog-source-inventory.json', catalogInventory],
    ['gavan-week1-catalog-adapter-design.json', catalogDesign],
    ['gavan-week1-quiz-source-inventory.json', quizInventory],
    ['gavan-week1-quiz-adapter-design.json', quizDesign],
    ['gavan-week1-ui-route-source-inventory.json', uiInventory],
    ['gavan-week1-ui-route-adapter-design.json', uiDesign],
    [path.basename(GAVAN_WEEK1_AGGREGATE_ROUTE_READINESS_GATE_PATH), aggregateGate],
    [path.basename(GAVAN_WEEK1_ROUTE_SIGNATURE_REQUEST_PACKET_PATH), routeSignatureRequest],
    [path.basename(GAVAN_WEEK1_ROUTE_APPROVAL_GUARD_PATH), routeApprovalGuard],
  ].map(([name, value]) => ({
    path: artifactPath(name as string),
    value: value as Record<string, unknown>,
  }));
}

function expectedRouteBundleBasenames(generatedAt: string): string[] {
  return routeBundle(generatedAt).map((artifact) => path.basename(artifact.path));
}

function artifactSummary(artifact: JsonArtifact, bytesWritten = 0): GavanWeek1RoutePrerequisiteArtifactRefreshArtifact {
  return {
    path: artifact.path,
    kind: String(artifact.value.kind ?? 'unknown'),
    status: String(artifact.value.status ?? artifact.value.weekStatus ?? 'unknown'),
    bytesWritten,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
  };
}

export function buildGavanWeek1RoutePrerequisiteArtifactRefresh(
  options: GavanWeek1RoutePrerequisiteArtifactRefreshOptions,
): GavanWeek1RoutePrerequisiteArtifactRefreshBuildResult {
  try {
    const artifacts = routeBundle(options.generatedAt).map((artifact) => artifactSummary(artifact));
    return {
      valid: true,
      issues: [],
      refresh: {
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
          expectedArtifactCount: artifacts.length,
          writtenArtifactCount: artifacts.length,
          failedArtifactCount: 0,
          liveArtifactCount: 0,
        },
        artifacts,
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
      },
    };
  } catch (error) {
    return {
      valid: false,
      issues: [issue(
        'artifact_build_failed',
        error instanceof Error ? error.message : 'Unknown route prerequisite refresh build failure.',
      )],
    };
  }
}

function writeJson(targetPath: string, value: unknown): number {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, output, 'utf8');
  return Buffer.byteLength(output, 'utf8');
}

export function writeGavanWeek1RoutePrerequisiteArtifactRefresh(
  options: GavanWeek1RoutePrerequisiteArtifactRefreshWriteOptions,
): GavanWeek1RoutePrerequisiteArtifactRefreshWriteResult {
  if (!isGavanWeek1RoutePrerequisiteArtifactRefreshTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [issue(
        'target_path_not_allowed',
        'Route prerequisite artifact refresh can only write under .codex-tmp or docs/reports.',
      )],
    };
  }

  try {
    const artifactEntries = routeBundle(options.generatedAt);
    const writtenArtifacts = artifactEntries.map((artifact) =>
      artifactSummary(artifact, writeJson(artifact.path, artifact.value)),
    );
    const refresh: GavanWeek1RoutePrerequisiteArtifactRefresh = {
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
        expectedArtifactCount: writtenArtifacts.length,
        writtenArtifactCount: writtenArtifacts.length,
        failedArtifactCount: 0,
        liveArtifactCount: 0,
      },
      artifacts: writtenArtifacts,
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
    const bytesWritten = writeJson(options.targetPath, refresh);
    return {
      valid: true,
      issues: [],
      refresh,
      targetPath: options.targetPath,
      bytesWritten,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [issue(
        'artifact_build_failed',
        error instanceof Error ? error.message : 'Unknown route prerequisite refresh write failure.',
      )],
    };
  }
}

export function ensureGavanWeek1RoutePrerequisiteArtifacts(
  options: GavanWeek1RoutePrerequisiteArtifactEnsureOptions,
): GavanWeek1RoutePrerequisiteArtifactEnsureResult {
  const missingBefore = expectedRouteBundleBasenames(options.generatedAt).filter((basename) =>
    !existsSync(artifactPath(basename)),
  );

  if (missingBefore.length === 0) {
    const buildResult = buildGavanWeek1RoutePrerequisiteArtifactRefresh(options);
    return {
      ...buildResult,
      refreshed: false,
      missingBefore: [],
    };
  }

  const writeResult = writeGavanWeek1RoutePrerequisiteArtifactRefresh({
    generatedAt: options.generatedAt,
    targetPath: options.targetPath ?? GAVAN_WEEK1_ROUTE_PREREQUISITE_ARTIFACT_REFRESH_PATH,
  });

  return {
    ...writeResult,
    refreshed: writeResult.valid,
    missingBefore,
  };
}
