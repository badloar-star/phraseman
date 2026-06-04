import fs from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedApprovalHandoffPacket,
} from '../tools/personal_plan_gavan_week1_signed_approval_handoff_packet';
import {
  buildGavanWeek1FinalQuizCandidatePacket,
  GAVAN_WEEK1_FINAL_QUIZ_CANDIDATE_PACKET_PATH,
  type GavanWeek1MaterialExportQuizCandidateInput,
  writeGavanWeek1FinalQuizCandidatePacket,
} from '../tools/personal_plan_gavan_week1_final_quiz_candidate_packet';

const GENERATED_AT = '2026-06-04T00:25:00.000Z';
const BROKEN_ENCODING_RE = /[\u00d0\u00c2\u00e2\ufffd]/;

function handoff(): GavanWeek1SignedApprovalHandoffPacket {
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
    requiredEvidencePaths: [
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
    ],
    materialExportEvidence: {
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
    reviewerChecklist: [
      {
        id: 'review_full_route_bundle_scope',
        status: 'ready_for_human_review',
        requiredDecision: 'Approve or reject the full catalog, quiz, UI route, and regression bundle.',
      },
      {
        id: 'review_material_export_evidence',
        status: 'ready_for_human_review',
        requiredDecision: 'Confirm all seven material export packets are acceptable as non-live source evidence.',
      },
      {
        id: 'review_regression_scope',
        status: 'ready_for_human_review',
        requiredDecision: 'Confirm regression scope before approval.',
      },
      {
        id: 'confirm_no_live_edits_before_signature',
        status: 'ready_for_human_review',
        requiredDecision: 'Confirm no production route writes happen before signature.',
      },
      {
        id: 'acknowledge_audio_pronunciation_blockers',
        status: 'ready_for_human_review',
        requiredDecision: 'Acknowledge audio and pronunciation remain separate blockers.',
      },
    ],
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

function exportPacket(dayIndex: number): GavanWeek1MaterialExportQuizCandidateInput {
  const phrases = Array.from({ length: 5 }, (_, index) => ({
    english: `Day ${dayIndex} phrase ${index + 1}`,
    meaningRu: `Фраза дня ${dayIndex} номер ${index + 1}`,
  }));

  return {
    kind: `gavan_week1_day${dayIndex}_material_export_packet`,
    dayId: `gavan-week1-day${dayIndex}`,
    status: `day${dayIndex}_material_export_not_live`,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    reviewerSummary: {
      quizBlueprintCount: 10,
      phraseCount: 5,
    },
    preview: {
      titleRu: `День ${dayIndex}`,
      phrases,
      quizLine: '10 planned questions, not written or registered.',
    },
  };
}

function exportPackets() {
  return Array.from({ length: 7 }, (_, index) => exportPacket(index + 1));
}

describe('Gavan week 1 final quiz candidate packet', () => {
  afterAll(() => {
    writeGavanWeek1FinalQuizCandidatePacket(handoff(), exportPackets(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_FINAL_QUIZ_CANDIDATE_PACKET_PATH,
    });
  });

  it('builds seven non-live final quiz candidates from the signed-approval handoff and material exports', () => {
    const result = buildGavanWeek1FinalQuizCandidatePacket(handoff(), exportPackets(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(true);
    expect(result.packet).toEqual(expect.objectContaining({
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
    }));
    expect(result.packet?.quizCandidates).toHaveLength(7);
    expect(result.packet?.summary).toEqual({
      quizCandidateCount: 7,
      totalQuestionCount: 70,
      quizzesWithTenQuestions: 7,
      registeredQuizCount: 0,
      playableQuizCount: 0,
      materialExportPacketCount: 7,
      coverageReadyQuizCount: 7,
    });
  });

  it('creates ten choice and typing ready questions per day with material phrase coverage', () => {
    const result = buildGavanWeek1FinalQuizCandidatePacket(handoff(), exportPackets(), {
      generatedAt: GENERATED_AT,
    });
    const day1 = result.packet?.quizCandidates[0];

    expect(day1).toEqual(expect.objectContaining({
      quizId: 'gavan-week1-day1-quiz',
      dayId: 'gavan-week1-day1',
      dayIndex: 1,
      questionCount: 10,
      routeRegistered: false,
      playable: false,
      quizSourceEdited: false,
      inputModes: ['choice', 'typing'],
      taskCopyLocales: ['ru', 'uk', 'es'],
      coverageStatus: 'covers_material_export_phrases',
      candidateStatus: 'final_quiz_candidate_not_registered',
    }));
    expect(day1?.questions).toHaveLength(10);
    for (const question of day1?.questions ?? []) {
      expect(question.id).toMatch(/^gavan-week1-day1-quiz:item-/);
      expect(question.choices).toHaveLength(4);
      expect(question.choices[question.correctIndex]).toBe(question.answerEnglish);
      expect(question.source).toEqual(expect.objectContaining({
        type: 'material_export_phrase',
        dayId: 'gavan-week1-day1',
      }));
      expect(question.registeredInQuizSource).toBe(false);
    }
  });

  it('rejects partial material exports instead of making quiz registration look ready', () => {
    const result = buildGavanWeek1FinalQuizCandidatePacket(handoff(), exportPackets().slice(0, 6), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.packet).toBeUndefined();
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'material_export_packets_incomplete' }),
    ]));
  });

  it('rejects approved or live-ready handoff inputs instead of opening quiz routes', () => {
    const liveHandoff = {
      ...handoff(),
      readyForLive: true,
      liveEditsAllowed: true,
      quizRouteRegistrationAllowed: true,
      signatureStatus: 'signed',
      approvalStillMissing: false,
    } as unknown as GavanWeek1SignedApprovalHandoffPacket;

    const result = buildGavanWeek1FinalQuizCandidatePacket(liveHandoff, exportPackets(), {
      generatedAt: GENERATED_AT,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'handoff_not_blocked' }),
      expect.objectContaining({ code: 'handoff_already_approved' }),
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const result = writeGavanWeek1FinalQuizCandidatePacket(handoff(), exportPackets(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_FINAL_QUIZ_CANDIDATE_PACKET_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-final-quiz-candidate-packet.json',
    ));
    expect(result.bytesWritten).toBeGreaterThan(5000);

    const serialized = fs.readFileSync(GAVAN_WEEK1_FINAL_QUIZ_CANDIDATE_PACKET_PATH, 'utf8');
    expect(serialized).not.toMatch(BROKEN_ENCODING_RE);
    const parsed = JSON.parse(serialized);
    expect(parsed.kind).toBe('gavan_week1_final_quiz_candidate_packet');
    expect(parsed.summary.totalQuestionCount).toBe(70);
    expect(parsed.readyForLive).toBe(false);
  });

  it('rejects app tools tests and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'gavan-week1-final-quiz-candidate-packet.json'),
      path.join(process.cwd(), 'tools', 'gavan-week1-final-quiz-candidate-packet.json'),
      path.join(process.cwd(), 'tests', 'gavan-week1-final-quiz-candidate-packet.json'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writeGavanWeek1FinalQuizCandidatePacket(handoff(), exportPackets(), {
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_final_quiz_candidate_packet.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PLAN_QUIZZES|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
