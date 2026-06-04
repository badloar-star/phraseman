import type {
  GavanWeek1BlockerResolutionRoadmap,
} from '../tools/personal_plan_gavan_week1_blocker_resolution_roadmap';
import type {
  GavanWeek1FutureBridgeGuardReport,
} from '../tools/personal_plan_gavan_week1_future_bridge_guard_report';
import type {
  GavanWeek1CatalogAdapterDesign,
} from '../tools/personal_plan_gavan_week1_catalog_adapter_design';
import type {
  GavanWeek1CatalogRoutePreflight,
} from '../tools/personal_plan_gavan_week1_catalog_route_preflight';
import type {
  GavanWeek1CatalogSourceInventory,
} from '../tools/personal_plan_gavan_week1_catalog_source_inventory';
import type {
  GavanWeek1ProductCopyApprovalPacket,
} from '../tools/personal_plan_gavan_week1_product_copy_approval_packet';

const DAY_IDS = [
  'gavan-week1-day2',
  'gavan-week1-day3',
  'gavan-week1-day4',
  'gavan-week1-day5',
  'gavan-week1-day6',
  'gavan-week1-day7',
] as const;

function approvedArtifactPath(dayIndex: number): string {
  return `.codex-tmp/personal-plans/gavan-week1-day${dayIndex}-approved-material.json`;
}

export function blockedCatalogRoutePreflight(
  generatedAt = '2026-06-03T06:00:00.000Z',
): GavanWeek1CatalogRoutePreflight {
  return {
    kind: 'gavan_week1_catalog_route_preflight',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'catalog_route_preflight_blocked_by_product_copy_signature_not_applied',
    sourceSignatureStatus: 'missing',
    catalogRoutePlanningBlocked: true,
    blockingDependency: 'missing_signature:product_copy',
    canOpenCatalogRouteTask: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    proposedRoutes: DAY_IDS.map((dayId, offset) => {
      const dayIndex = offset + 2;
      return {
        dayId,
        dayIndex,
        approvedArtifactPath: approvedArtifactPath(dayIndex),
        routeStatus: 'blocked_not_registered',
        productionRouteRegistered: false,
        playable: false,
      };
    }),
  } as unknown as GavanWeek1CatalogRoutePreflight;
}

export function blockedCatalogSourceInventory(
  generatedAt = '2026-06-03T06:05:00.000Z',
): GavanWeek1CatalogSourceInventory {
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
    proposedRoutes: DAY_IDS.map((dayId, offset) => {
      const dayIndex = offset + 2;
      return {
        dayId,
        dayIndex,
        approvedArtifactPath: approvedArtifactPath(dayIndex),
        routeStatus: 'blocked_not_registered',
        productionRouteRegistered: false,
        playable: false,
      };
    }),
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

export function blockedCatalogAdapterDesign(
  generatedAt = '2026-06-03T06:35:00.000Z',
): GavanWeek1CatalogAdapterDesign {
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
    proposedDayMappings: DAY_IDS.map((dayId, offset) => {
      const dayIndex = offset + 2;
      return {
        dayId,
        dayIndex,
        approvedArtifactPath: approvedArtifactPath(dayIndex),
        currentCatalogPresence: 'missing',
        futureRouteAction: 'replace_scaffold_day_after_signature',
        status: 'not_allowed_until_signature',
        productionRouteRegistered: false,
        playable: false,
      };
    }),
    compatibilityFindings: [],
    futureLiveRouteAcceptanceCriteria: [],
    preservationPolicy: {
      replaceGeneratedScaffoldOnlyAfterSignature: true,
      preserveSelfGuidedPath: true,
      preserveExistingPlanIds: true,
      preserveMinuteChoices: [5, 10, 15, 20],
      liveBridgeAllowed: false,
    },
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

export function blockedProductCopyApprovalPacket(
  generatedAt = '2026-06-03T05:00:00.000Z',
): GavanWeek1ProductCopyApprovalPacket {
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
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

export function blockedFutureBridgeGuardReport(
  generatedAt = '2026-06-03T04:00:00.000Z',
): GavanWeek1FutureBridgeGuardReport {
  const signatureBlockers = [
    'product_copy',
    'catalog_route',
    'quiz_route',
    'ui_route',
    'audio_pipeline',
    'pronunciation_scoring',
    'cloud_sync_bridge',
  ].map((areaId) => ({
    id: `missing_signature:${areaId}`,
    category: 'missing_signature',
    blocksLiveBridge: true,
    areaId,
    detail: `Missing approval for ${areaId}.`,
  }));
  const surfaceBlockers = [
    'catalog_route',
    'quiz_route',
    'ui_route',
    'audio_pipeline',
    'pronunciation_scoring',
    'cloud_sync_bridge',
  ].map((surfaceCode) => ({
    id: `missing_surface:${surfaceCode}`,
    category: 'missing_production_surface',
    blocksLiveBridge: true,
    surfaceCode,
    detail: `Missing production surface for ${surfaceCode}.`,
  }));
  const releaseBlockers = [
    'no_final_audio',
    'no_final_pronunciation_scoring',
    'no_live_catalog_route',
    'no_production_quiz_route',
    'no_ui_route',
    'no_cloud_sync_bridge',
  ].map((releaseBlockerCode) => ({
    id: `release_blocker:${releaseBlockerCode}`,
    category: 'preserved_release_blocker',
    blocksLiveBridge: true,
    releaseBlockerCode,
    detail: `Release blocker remains open: ${releaseBlockerCode}.`,
  }));

  return {
    kind: 'gavan_week1_future_bridge_guard_report',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'future_bridge_guard_blocked_not_applied',
    sourceContractStatus: 'future_bridge_contract_only_not_applied',
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    implementationTaskAllowed: false,
    sourceContractGeneratedAt: '2026-06-03T03:55:00.000Z',
    inputSummary: {},
    blockerSummary: {
      missingSignatures: 7,
      missingProductionSurfaces: 6,
      preservedReleaseBlockers: 6,
      totalBlockers: 19,
    },
    blockers: [
      ...signatureBlockers,
      ...surfaceBlockers,
      ...releaseBlockers,
    ],
    preservedMissingSurfaces: [],
    preservedReleaseBlockers: [],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  } as unknown as GavanWeek1FutureBridgeGuardReport;
}

export function blockedBlockerResolutionRoadmap(
  generatedAt = '2026-06-03T04:10:00.000Z',
): GavanWeek1BlockerResolutionRoadmap {
  return {
    kind: 'gavan_week1_blocker_resolution_roadmap',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'blocker_resolution_roadmap_only_not_applied',
    sourceGuardStatus: 'future_bridge_guard_blocked_not_applied',
    sourceGuardGeneratedAt: '2026-06-03T04:00:00.000Z',
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
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

export function approvedProductCopyArtifacts(): unknown[] {
  return DAY_IDS.map((dayId, offset) => {
    const dayIndex = offset + 2;
    return {
      kind: 'gavan_week1_approved_material',
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId,
      dayIndex,
      liveIntegration: false,
      contentUnitRows: [
        {
          id: `${dayId}-unit-1`,
          reviewStatus: 'approved',
          approval: { reviewer: 'fixture' },
          english: `Useful phrase ${dayIndex}`,
          meaningRu: `Полезная фраза ${dayIndex}`,
          newWords: [`word-${dayIndex}`],
          firstSeenConstructions: [`pattern-${dayIndex}`],
        },
      ],
      explanationRows: [
        {
          id: `${dayId}-explain-1`,
          reviewStatus: 'approved',
          approval: { reviewer: 'fixture' },
          body: `This card explains phrase ${dayIndex} in a reusable everyday context.`,
          wrongAnswerSafe: true,
          covers: [`word-${dayIndex}`, `pattern-${dayIndex}`],
        },
      ],
      exerciseRows: [
        {
          id: `${dayId}-exercise-1`,
          reviewStatus: 'approved',
          approval: { reviewer: 'fixture' },
          purpose: `Practice phrase ${dayIndex} in a simple social exchange.`,
        },
      ],
    };
  });
}
