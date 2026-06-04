import {
  buildGavanWeek1ContentAuthoringSeed,
} from '../tools/personal_plan_gavan_week1_content_authoring_seed';
import {
  buildGavanWeek1Day1MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day1_material_candidate';
import {
  buildGavanWeek1Day1MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day1_material_export_packet';
import {
  buildGavanWeek1Day2MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day2_material_candidate';
import {
  buildGavanWeek1Day2MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day2_material_export_packet';
import {
  buildGavanWeek1Day3MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day3_material_candidate';
import {
  buildGavanWeek1Day3MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day3_material_export_packet';
import {
  buildGavanWeek1Day4MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day4_material_candidate';
import {
  buildGavanWeek1Day4MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day4_material_export_packet';
import {
  buildGavanWeek1Day5MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day5_material_candidate';
import {
  buildGavanWeek1Day5MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day5_material_export_packet';
import {
  buildGavanWeek1Day6MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day6_material_candidate';
import {
  buildGavanWeek1Day6MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day6_material_export_packet';
import {
  buildGavanWeek1ExpansionStandards,
} from '../tools/personal_plan_gavan_week1_expansion_standards';
import {
  buildGavanWeek1Day7BlueprintCandidate,
} from '../tools/personal_plan_gavan_week1_day7_blueprint_candidate';
import {
  buildGavanWeek1Day7ReviewerExport,
} from '../tools/personal_plan_gavan_week1_day7_reviewer_export';
import {
  approveGavanWeek1Day7ReviewerExport,
  buildGavanWeek1Day7ReviewerApprovalInput,
} from '../tools/personal_plan_gavan_week1_day7_reviewer_approval_gate';
import {
  buildGavanWeek1Day7MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day7_material_candidate';
import {
  buildGavanWeek1Day7MaterialExportPacket,
} from '../tools/personal_plan_gavan_week1_day7_material_export_packet';
import type {
  GavanWeek1RouteApprovalGuard,
} from '../tools/personal_plan_gavan_week1_route_approval_guard';
import {
  buildGavanWeek1LiveRouteImplementationPreflight,
  GAVAN_WEEK1_LIVE_ROUTE_IMPLEMENTATION_PREFLIGHT_PATH,
  writeGavanWeek1LiveRouteImplementationPreflight,
} from '../tools/personal_plan_gavan_week1_live_route_implementation_preflight';

const GENERATED_AT = '2026-06-03T23:58:00.000Z';

function approvalGuard(): GavanWeek1RouteApprovalGuard {
  return {
    kind: 'gavan_week1_route_approval_guard',
    generatedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'route_approval_guard_blocked_unsigned',
    sourceRequestStatus: 'route_signature_request_blocked_not_signed',
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
    requiredSignedApprovalMetadata: {
      reviewerName: 'required_non_empty_string',
      reviewerRole: 'route_quality_owner',
      approvedAtIso: 'required_iso_datetime',
      approvalScope: 'full_route_bundle',
      approvedEvidenceFilePaths: [
        '.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json',
        '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json',
        '.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json',
        '.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json',
      ],
      regressionScope: 'home_onboarding_premium_self_guided_carryover_completed_day',
      decisionText: 'required_non_empty_string',
    },
    unsignedRequestSummary: {
      catalogDayMappingCount: 7,
      blockedCatalogMappings: 7,
      quizRouteDesignCount: 7,
      tenQuestionQuizCount: 7,
      uiOpeningContractCount: 5,
      coveredUiOpeningContractCount: 5,
      regressionGateCount: 7,
      routeBlockerCount: 5,
      liveAcceptanceCriterionCount: 4,
      readyForLive: false,
    },
    routeBlockerIds: [
      'missing_signature:product_copy',
      'catalog_routes_not_registered',
      'quiz_routes_not_registered',
      'ui_routes_not_registered',
      'live_regression_not_run',
    ],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

function materialExports() {
  const seed = buildGavanWeek1ContentAuthoringSeed({ generatedAt: GENERATED_AT });
  const day1 = buildGavanWeek1Day1MaterialCandidate(seed, { generatedAt: GENERATED_AT });
  const day1Export = buildGavanWeek1Day1MaterialExportPacket(day1, seed, { generatedAt: GENERATED_AT });
  const day2 = buildGavanWeek1Day2MaterialCandidate(seed, day1Export, { generatedAt: GENERATED_AT });
  const day2Export = buildGavanWeek1Day2MaterialExportPacket(day2, seed, day1Export, { generatedAt: GENERATED_AT });
  const day3 = buildGavanWeek1Day3MaterialCandidate(seed, day2Export, { generatedAt: GENERATED_AT });
  const day3Export = buildGavanWeek1Day3MaterialExportPacket(day3, seed, day2Export, { generatedAt: GENERATED_AT });
  const day4 = buildGavanWeek1Day4MaterialCandidate(seed, day3Export, { generatedAt: GENERATED_AT });
  const day4Export = buildGavanWeek1Day4MaterialExportPacket(day4, seed, day3Export, { generatedAt: GENERATED_AT });
  const day5 = buildGavanWeek1Day5MaterialCandidate(seed, day4Export, { generatedAt: GENERATED_AT });
  const day5Export = buildGavanWeek1Day5MaterialExportPacket(day5, seed, day4Export, { generatedAt: GENERATED_AT });
  const day6 = buildGavanWeek1Day6MaterialCandidate(seed, day5Export, { generatedAt: GENERATED_AT });
  const day6Export = buildGavanWeek1Day6MaterialExportPacket(day6, seed, day5Export, { generatedAt: GENERATED_AT });
  const standards = buildGavanWeek1ExpansionStandards({ generatedAt: GENERATED_AT });
  const day7Blueprint = buildGavanWeek1Day7BlueprintCandidate(standards, { generatedAt: GENERATED_AT });
  const day7ReviewerExport = buildGavanWeek1Day7ReviewerExport(day7Blueprint, { generatedAt: GENERATED_AT });
  const day7ApprovalInput = buildGavanWeek1Day7ReviewerApprovalInput(day7ReviewerExport, {
    reviewerId: 'content-reviewer-1',
    approvedAt: GENERATED_AT,
  });
  const day7Approved = approveGavanWeek1Day7ReviewerExport(
    day7ReviewerExport,
    day7ApprovalInput,
    GENERATED_AT,
  ).approvedExport;

  if (!day7Approved) {
    throw new Error('Expected approved day 7 reviewer export.');
  }

  const day7 = buildGavanWeek1Day7MaterialCandidate(day7Approved, day6Export, { generatedAt: GENERATED_AT });
  const day7Export = buildGavanWeek1Day7MaterialExportPacket(day7, day7Approved, day6Export, {
    generatedAt: GENERATED_AT,
  });

  return [day1Export, day2Export, day3Export, day4Export, day5Export, day6Export, day7Export];
}

describe('Gavan week 1 live route preflight material evidence', () => {
  afterAll(() => {
    writeGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      materialExportPackets: materialExports(),
      targetPath: GAVAN_WEEK1_LIVE_ROUTE_IMPLEMENTATION_PREFLIGHT_PATH,
    });
  });

  it('records full 7 day material export evidence while keeping live route blocked by missing signature', () => {
    const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      materialExportPackets: materialExports(),
    });

    expect(result.valid).toBe(true);
    expect(result.preflight?.materialExportEvidence).toEqual({
      expectedExportPacketCount: 7,
      providedExportPacketCount: 7,
      notLiveExportPacketCount: 7,
      blockedExportPacketCount: 0,
      missingDayIds: [],
      dayIds: [
        'gavan-week1-day1',
        'gavan-week1-day2',
        'gavan-week1-day3',
        'gavan-week1-day4',
        'gavan-week1-day5',
        'gavan-week1-day6',
        'gavan-week1-day7',
      ],
      readyForRouteReview: true,
    });
    expect(result.preflight?.readyForLive).toBe(false);
    expect(result.preflight?.blockerStillOpen).toBe('missing_signature:product_copy');
    expect(result.preflight?.liveEditsAllowed).toBe(false);
  });

  it('does not treat partial material evidence as route-review ready', () => {
    const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      materialExportPackets: materialExports().slice(0, 6),
    });

    expect(result.valid).toBe(true);
    expect(result.preflight?.materialExportEvidence.readyForRouteReview).toBe(false);
    expect(result.preflight?.materialExportEvidence.missingDayIds).toEqual(['gavan-week1-day7']);
    expect(result.preflight?.readyForLive).toBe(false);
  });
});
