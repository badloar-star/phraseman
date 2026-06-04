import fs from 'fs';
import path from 'path';

import type {
  GavanWeek1RouteApprovalGuard,
} from '../tools/personal_plan_gavan_week1_route_approval_guard';
import {
  buildGavanWeek1LiveRouteImplementationPreflight,
  type GavanWeek1LiveRouteImplementationPreflight,
} from '../tools/personal_plan_gavan_week1_live_route_implementation_preflight';
import type {
  GavanWeek1FinalQuizCandidatePacket,
} from '../tools/personal_plan_gavan_week1_final_quiz_candidate_packet';
import {
  buildGavanWeek1SignedApprovalHandoffPacket,
  GAVAN_WEEK1_SIGNED_APPROVAL_HANDOFF_PACKET_PATH,
  writeGavanWeek1SignedApprovalHandoffPacket,
} from '../tools/personal_plan_gavan_week1_signed_approval_handoff_packet';

const GENERATED_AT = '2026-06-03T23:59:30.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

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

function materialExportPackets() {
  return Array.from({ length: 7 }, (_, index) => {
    const dayNumber = index + 1;

    return {
      dayId: `gavan-week1-day${dayNumber}`,
      status: `day${dayNumber}_material_export_not_live`,
    };
  });
}

function finalQuizCandidatePacket(): GavanWeek1FinalQuizCandidatePacket {
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
  };
}

function fullPreflight() {
  const result = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
    generatedAt: GENERATED_AT,
    materialExportPackets: materialExportPackets(),
    finalQuizCandidatePacket: finalQuizCandidatePacket(),
  });

  if (!result.preflight) {
    throw new Error('Expected a valid live-route preflight fixture.');
  }

  return result.preflight;
}

describe('Gavan week 1 signed approval handoff packet', () => {
  afterAll(() => {
    writeGavanWeek1SignedApprovalHandoffPacket(approvalGuard(), fullPreflight(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_SIGNED_APPROVAL_HANDOFF_PACKET_PATH,
    });
  });

  it('builds a human-review handoff from the unsigned guard and full material route evidence', () => {
    const result = buildGavanWeek1SignedApprovalHandoffPacket(approvalGuard(), fullPreflight(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.packet).toEqual(expect.objectContaining({
      kind: 'gavan_week1_signed_approval_handoff_packet',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'signed_approval_handoff_ready_for_human_review_unsigned',
      blockerStillOpen: 'missing_signature:product_copy',
      approvalStillMissing: true,
      signatureStatus: 'missing',
      approvalMayBeInferred: false,
      signedApprovalAcceptedInThisPass: false,
      readyForHumanReview: true,
      readyForLive: false,
      liveEditsAllowed: false,
      catalogRouteRegistrationAllowed: false,
      quizRouteRegistrationAllowed: false,
      uiRouteRegistrationAllowed: false,
    }));
    expect(result.packet?.materialExportEvidence.readyForRouteReview).toBe(true);
    expect(result.packet?.materialExportEvidence.providedExportPacketCount).toBe(7);
    expect(result.packet?.finalQuizCandidateEvidence.readyForRouteReview).toBe(true);
    expect(result.packet?.finalQuizCandidateEvidence.totalQuestionCount).toBe(70);
  });

  it('lists every required evidence path for a reviewer without accepting approval', () => {
    const result = buildGavanWeek1SignedApprovalHandoffPacket(approvalGuard(), fullPreflight(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.packet?.requiredSignedApprovalMetadata).toEqual(
      approvalGuard().requiredSignedApprovalMetadata,
    );
    expect(result.packet?.requiredEvidencePaths).toEqual([
      '.codex-tmp/personal-plans/gavan-week1-catalog-adapter-design.json',
      '.codex-tmp/personal-plans/gavan-week1-quiz-adapter-design.json',
      '.codex-tmp/personal-plans/gavan-week1-ui-route-adapter-design.json',
      '.codex-tmp/personal-plans/gavan-week1-aggregate-route-readiness-gate.json',
      '.codex-tmp/personal-plans/gavan-week1-live-route-implementation-preflight.json',
      '.codex-tmp/personal-plans/gavan-week1-day1-material-export-packet.json',
      '.codex-tmp/personal-plans/gavan-week1-day2-material-export-packet.json',
      '.codex-tmp/personal-plans/gavan-week1-day3-material-export-packet.json',
      '.codex-tmp/personal-plans/gavan-week1-day4-material-export-packet.json',
      '.codex-tmp/personal-plans/gavan-week1-day5-material-export-packet.json',
      '.codex-tmp/personal-plans/gavan-week1-day6-material-export-packet.json',
      '.codex-tmp/personal-plans/gavan-week1-day7-material-export-packet.json',
      '.codex-tmp/personal-plans/gavan-week1-final-quiz-candidate-packet.json',
    ]);
    expect(result.packet?.reviewerChecklist).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'review_full_route_bundle_scope',
        status: 'ready_for_human_review',
      }),
      expect.objectContaining({
        id: 'confirm_no_live_edits_before_signature',
        status: 'ready_for_human_review',
      }),
      expect.objectContaining({
        id: 'review_final_quiz_candidate_evidence',
        status: 'ready_for_human_review',
      }),
      expect.objectContaining({
        id: 'acknowledge_audio_pronunciation_blockers',
        status: 'ready_for_human_review',
      }),
    ]));
    expect(result.packet?.reviewerDecision).toEqual({
      required: true,
      status: 'not_reviewed',
      approved: false,
      approvedBy: null,
      approvedAt: null,
      signedApprovalArtifactRequired: true,
    });
  });

  it('blocks handoff readiness when material route evidence is incomplete', () => {
    const partialPreflightResult = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      materialExportPackets: materialExportPackets().slice(0, 6),
    });

    if (!partialPreflightResult.preflight) {
      throw new Error('Expected a partial preflight fixture.');
    }

    const result = buildGavanWeek1SignedApprovalHandoffPacket(
      approvalGuard(),
      partialPreflightResult.preflight,
      { generatedAt: GENERATED_AT },
    );

    expect(result.valid).toBe(false);
    expect(result.packet).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'material_export_evidence_incomplete' }),
    ]));
  });

  it('blocks handoff readiness when final quiz candidate evidence is incomplete', () => {
    const preflightResult = buildGavanWeek1LiveRouteImplementationPreflight(approvalGuard(), {
      generatedAt: GENERATED_AT,
      materialExportPackets: materialExportPackets(),
    });

    if (!preflightResult.preflight) {
      throw new Error('Expected a preflight fixture.');
    }

    const result = buildGavanWeek1SignedApprovalHandoffPacket(
      approvalGuard(),
      preflightResult.preflight,
      { generatedAt: GENERATED_AT },
    );

    expect(result.valid).toBe(false);
    expect(result.packet).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'final_quiz_candidate_evidence_incomplete' }),
    ]));
  });

  it('rejects approved or live-ready inputs instead of opening routes', () => {
    const liveGuard = {
      ...approvalGuard(),
      approved: true,
      signatureStatus: 'signed',
      readyForLive: true,
      signedApprovalAcceptedInThisPass: true,
    } as unknown as GavanWeek1RouteApprovalGuard;
    const livePreflight = {
      ...fullPreflight(),
      readyForLive: true,
      liveEditsAllowed: true,
      catalogRouteRegistrationAllowed: true,
    } as unknown as GavanWeek1LiveRouteImplementationPreflight;

    expect(buildGavanWeek1SignedApprovalHandoffPacket(liveGuard, fullPreflight(), {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'guard_not_blocked' }),
      expect.objectContaining({ code: 'guard_already_approved' }),
    ]));
    expect(buildGavanWeek1SignedApprovalHandoffPacket(approvalGuard(), livePreflight, {
      generatedAt: GENERATED_AT,
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'preflight_not_blocked' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1SignedApprovalHandoffPacket(approvalGuard(), fullPreflight(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_SIGNED_APPROVAL_HANDOFF_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-signed-approval-handoff-packet.json',
    ));
    expect(result.bytesWritten).toBeGreaterThan(2000);

    const serialized = fs.readFileSync(GAVAN_WEEK1_SIGNED_APPROVAL_HANDOFF_PACKET_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);
    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_signed_approval_handoff_packet');
    expect(parsed.readyForHumanReview).toBe(true);
    expect(parsed.readyForLive).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'signed-approval-handoff.json'),
      path.join(process.cwd(), 'components', 'signed-approval-handoff.json'),
      path.join(process.cwd(), 'tools', 'signed-approval-handoff.json'),
      path.join(process.cwd(), 'tests', 'signed-approval-handoff.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1SignedApprovalHandoffPacket(approvalGuard(), fullPreflight(), {
        generatedAt: GENERATED_AT,
        targetPath,
      });

      expect(result.valid).toBe(false);
      expect(result.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'target_path_not_allowed' }),
      ]));
    }
  });

  it('does not import or mutate live catalog quiz UI storage audio scoring or navigation', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_signed_approval_handoff_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
