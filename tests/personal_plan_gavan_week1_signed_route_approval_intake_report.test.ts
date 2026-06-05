import { readFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedApprovalHandoffPacket,
} from '../tools/personal_plan_gavan_week1_signed_approval_handoff_packet';
import {
  GAVAN_WEEK1_SIGNED_ROUTE_APPROVAL_INTAKE_REPORT_PATH,
  buildGavanWeek1SignedRouteApprovalIntakeReport,
  writeGavanWeek1SignedRouteApprovalIntakeReport,
} from '../tools/personal_plan_gavan_week1_signed_route_approval_intake_report';

const GENERATED_AT = '2026-06-04T20:05:00.000Z';

const REQUIRED_EVIDENCE_PATHS = [
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
];

function handoffPacket(): GavanWeek1SignedApprovalHandoffPacket {
  return {
    kind: 'gavan_week1_signed_approval_handoff_packet',
    generatedAt: GENERATED_AT,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status: 'signed_approval_handoff_ready_for_human_review_unsigned',
    sourceGuardStatus: 'route_approval_guard_blocked_unsigned',
    sourcePreflightStatus: 'live_route_preflight_blocked_unsigned',
    blockerStillOpen: 'missing_signature:product_copy',
    approvalStillMissing: true,
    signatureStatus: 'missing',
    approvalMayBeInferred: false,
    signedApprovalAcceptedInThisPass: false,
    readyForHumanReview: true,
    readyForLive: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    liveEditsAllowed: false,
    catalogRouteRegistrationAllowed: false,
    quizRouteRegistrationAllowed: false,
    uiRouteRegistrationAllowed: false,
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
    requiredEvidencePaths: REQUIRED_EVIDENCE_PATHS,
    materialExportEvidence: {
      expectedExportPacketCount: 7,
      providedExportPacketCount: 7,
      notLiveExportPacketCount: 7,
      blockedExportPacketCount: 0,
      readyForRouteReview: true,
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
    },
    finalQuizCandidateEvidence: {
      expectedQuizCandidateCount: 7,
      providedQuizCandidateCount: 7,
      totalQuestionCount: 70,
      tenQuestionQuizCount: 7,
      registeredQuizCount: 0,
      playableQuizCount: 0,
      coverageReadyQuizCount: 7,
      readyForRouteReview: true,
    },
    reviewerChecklist: [],
    reviewerDecision: {
      required: true,
      status: 'not_reviewed',
      approved: false,
      approvedBy: null,
      approvedAt: null,
      signedApprovalArtifactRequired: true,
    },
    blockingReasons: ['missing_signature:product_copy'],
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

function completeSignedPayload() {
  return {
    reviewerName: 'Route Reviewer',
    reviewerRole: 'route_quality_owner',
    approvedAtIso: '2026-06-04T20:00:00.000Z',
    approvalScope: 'full_route_bundle',
    approvedEvidenceFilePaths: REQUIRED_EVIDENCE_PATHS,
    regressionScope: 'home_onboarding_premium_self_guided_carryover_completed_day',
    decisionText: 'Approved for separate route approval artifact creation after regression owner review.',
  };
}

describe('Gavan week 1 signed route approval intake report', () => {
  it('blocks route approval when no signed payload has been supplied', () => {
    const result = buildGavanWeek1SignedRouteApprovalIntakeReport(handoffPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'route-signed-approval-intake-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      kind: 'gavan_week1_signed_route_approval_intake_report',
      status: 'blocked_missing_signed_payload',
      releaseDecision: 'hold',
      approved: false,
      readyForLive: false,
      signedApprovalPayloadAccepted: false,
      signedApprovalArtifactCreated: false,
      routeApprovalAccepted: false,
      routeRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.report.summary).toEqual({
      requiredFieldCount: 7,
      validFieldCount: 0,
      missingFieldCount: 7,
      invalidFieldCount: 0,
      requiredEvidencePathCount: 13,
      suppliedEvidencePathCount: 0,
      acceptedEvidencePathCount: 0,
      missingEvidencePathCount: 13,
      blockerCount: 8,
    });
    expect(result.report.fieldChecklist.every((item) => item.status === 'missing')).toBe(true);
  });

  it('rejects partial signed payloads without creating route approval', () => {
    const result = buildGavanWeek1SignedRouteApprovalIntakeReport(handoffPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'route-signed-approval-intake-owner',
      signedApprovalPayload: {
        ...completeSignedPayload(),
        reviewerName: '',
        approvedEvidenceFilePaths: REQUIRED_EVIDENCE_PATHS.slice(0, 3),
        approvalScope: 'quiz_only',
        decisionText: '',
      },
    });

    expect(result.valid).toBe(false);
    expect(result.report.status).toBe('blocked_invalid_signed_payload');
    expect(result.report.approved).toBe(false);
    expect(result.report.routeRegistrationAllowed).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'reviewer_name_missing',
      'approved_evidence_paths_incomplete',
      'partial_route_approval_not_allowed',
      'decision_text_missing',
    ]));
  });

  it('accepts a complete signed payload only for separate approval artifact review, not live routes', () => {
    const result = buildGavanWeek1SignedRouteApprovalIntakeReport(handoffPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'route-signed-approval-intake-owner',
      signedApprovalPayload: completeSignedPayload(),
    });

    expect(result.valid).toBe(true);
    expect(result.report).toMatchObject({
      status: 'signed_payload_ready_for_separate_route_approval_review',
      releaseDecision: 'hold',
      approved: false,
      readyForLive: false,
      signedApprovalPayloadAccepted: true,
      signedApprovalArtifactCreated: false,
      routeApprovalAccepted: false,
      routeRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.report.summary).toEqual({
      requiredFieldCount: 7,
      validFieldCount: 7,
      missingFieldCount: 0,
      invalidFieldCount: 0,
      requiredEvidencePathCount: 13,
      suppliedEvidencePathCount: 13,
      acceptedEvidencePathCount: 13,
      missingEvidencePathCount: 0,
      blockerCount: 5,
    });
    expect(result.report.blockers.map((blocker) => blocker.code)).toEqual([
      'separate_signed_approval_artifact_required',
      'route_registration_pass_required',
      'live_regression_required',
      'device_verification_required',
      'audio_pronunciation_master_blockers_still_open',
    ]);
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-signed-route-approval-intake-report.test.json',
    );

    const result = writeGavanWeek1SignedRouteApprovalIntakeReport(handoffPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'route-signed-approval-intake-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.report);
    expect(stored.status).toBe('blocked_missing_signed_payload');
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'app/personal_plan_day_open_actions.ts',
    'app/personal_plan_navigation.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1SignedRouteApprovalIntakeReport(handoffPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'route-signed-approval-intake-owner',
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Signed route approval intake report can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_signed_route_approval_intake_report.ts'),
      'utf8',
    );

    for (const forbidden of [
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'personal_plan_catalog',
      'personal_plan_day_open_actions',
      'personal_plan_audio_openai_worker',
      'approvePlanAudioAssets',
      'registerPlanAudioAssetsForRuntime',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('uses the canonical report path', () => {
    expect(GAVAN_WEEK1_SIGNED_ROUTE_APPROVAL_INTAKE_REPORT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-signed-route-approval-intake-report.json',
    ));
  });
});
