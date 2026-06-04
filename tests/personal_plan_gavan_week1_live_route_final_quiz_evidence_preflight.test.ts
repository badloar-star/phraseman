import type {
  GavanWeek1RouteApprovalGuard,
} from '../tools/personal_plan_gavan_week1_route_approval_guard';
import {
  buildGavanWeek1LiveRouteImplementationPreflight,
} from '../tools/personal_plan_gavan_week1_live_route_implementation_preflight';
import type {
  GavanWeek1FinalQuizCandidatePacket,
} from '../tools/personal_plan_gavan_week1_final_quiz_candidate_packet';

const GENERATED_AT = '2026-06-04T00:45:00.000Z';

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

function finalQuizCandidatePacket(overrides: Partial<GavanWeek1FinalQuizCandidatePacket> = {}): GavanWeek1FinalQuizCandidatePacket {
  return {
    kind: 'gavan_week1_final_quiz_candidate_packet',
    generatedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'final_quiz_candidates_not_live_not_registered',
    sourceHandoffStatus: 'signed_approval_handoff_ready_for_human_review_unsigned',
    blockerStillOpen: 'missing_signature:product_copy',
    readyForLive: false,
    liveEditsAllowed: false,
    quizSourceEdited: false,
    quizRouteRegistrationAllowed: false,
    routeRegistrationAllowed: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    quizCandidates: [],
    summary: {
      quizCandidateCount: 7,
      totalQuestionCount: 70,
      quizzesWithTenQuestions: 7,
      registeredQuizCount: 0,
      playableQuizCount: 0,
      materialExportPacketCount: 7,
      coverageReadyQuizCount: 7,
    },
    registrationPolicy: {
      candidateOnly: true,
      requiresSignedApproval: true,
      requiresQuizSourceRegistrationTask: true,
      requiresRegressionAfterRegistration: true,
      liveBridgeAllowedInThisPass: false,
    },
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
    ...overrides,
  };
}

describe('Gavan week 1 live route preflight final quiz evidence', () => {
  it('records full 7 quiz candidate evidence while keeping quiz source registration blocked', () => {
    const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      finalQuizCandidatePacket: finalQuizCandidatePacket(),
    });

    expect(result.valid).toBe(true);
    expect(result.preflight?.finalQuizCandidateEvidence).toEqual({
      expectedQuizCandidateCount: 7,
      providedQuizCandidateCount: 7,
      totalQuestionCount: 70,
      tenQuestionQuizCount: 7,
      registeredQuizCount: 0,
      playableQuizCount: 0,
      coverageReadyQuizCount: 7,
      readyForRouteReview: true,
    });
    expect(result.preflight?.readyForLive).toBe(false);
    expect(result.preflight?.quizRouteRegistrationAllowed).toBe(false);
  });

  it('does not treat partial or registered final quiz evidence as route-review ready', () => {
    const partial = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      finalQuizCandidatePacket: finalQuizCandidatePacket({
        summary: {
          quizCandidateCount: 6,
          totalQuestionCount: 60,
          quizzesWithTenQuestions: 6,
          registeredQuizCount: 0,
          playableQuizCount: 0,
          materialExportPacketCount: 6,
          coverageReadyQuizCount: 6,
        },
      }),
    });
    const registered = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      finalQuizCandidatePacket: finalQuizCandidatePacket({
        summary: {
          quizCandidateCount: 7,
          totalQuestionCount: 70,
          quizzesWithTenQuestions: 7,
          registeredQuizCount: 1,
          playableQuizCount: 0,
          materialExportPacketCount: 7,
          coverageReadyQuizCount: 7,
        },
      }),
    });

    expect(partial.preflight?.finalQuizCandidateEvidence.readyForRouteReview).toBe(false);
    expect(registered.preflight?.finalQuizCandidateEvidence.readyForRouteReview).toBe(false);
    expect(registered.preflight?.readyForLive).toBe(false);
  });
});
