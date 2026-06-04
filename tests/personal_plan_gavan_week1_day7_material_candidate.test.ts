import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
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
  type GavanWeek1Day6MaterialExportPacket,
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
  type GavanWeek1Day7ApprovedReviewerExport,
} from '../tools/personal_plan_gavan_week1_day7_reviewer_approval_gate';
import {
  buildGavanWeek1Day7MaterialCandidate,
  GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH,
  validateGavanWeek1Day7MaterialCandidate,
  writeGavanWeek1Day7MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day7_material_candidate';

const GENERATED_AT = '2026-06-03T23:30:00.000Z';
const REVIEWER_ID = 'content-reviewer-1';
const APPROVED_AT = '2026-06-03T23:35:00.000Z';

function seed() {
  return buildGavanWeek1ContentAuthoringSeed({
    generatedAt: GENERATED_AT,
  });
}

function day6Export(): GavanWeek1Day6MaterialExportPacket {
  const sourceSeed = seed();
  const day1 = buildGavanWeek1Day1MaterialCandidate(sourceSeed, { generatedAt: GENERATED_AT });
  const day1Export = buildGavanWeek1Day1MaterialExportPacket(day1, sourceSeed, { generatedAt: GENERATED_AT });
  const day2 = buildGavanWeek1Day2MaterialCandidate(sourceSeed, day1Export, { generatedAt: GENERATED_AT });
  const day2Export = buildGavanWeek1Day2MaterialExportPacket(day2, sourceSeed, day1Export, { generatedAt: GENERATED_AT });
  const day3 = buildGavanWeek1Day3MaterialCandidate(sourceSeed, day2Export, { generatedAt: GENERATED_AT });
  const day3Export = buildGavanWeek1Day3MaterialExportPacket(day3, sourceSeed, day2Export, { generatedAt: GENERATED_AT });
  const day4 = buildGavanWeek1Day4MaterialCandidate(sourceSeed, day3Export, { generatedAt: GENERATED_AT });
  const day4Export = buildGavanWeek1Day4MaterialExportPacket(day4, sourceSeed, day3Export, { generatedAt: GENERATED_AT });
  const day5 = buildGavanWeek1Day5MaterialCandidate(sourceSeed, day4Export, { generatedAt: GENERATED_AT });
  const day5Export = buildGavanWeek1Day5MaterialExportPacket(day5, sourceSeed, day4Export, { generatedAt: GENERATED_AT });
  const day6 = buildGavanWeek1Day6MaterialCandidate(sourceSeed, day5Export, { generatedAt: GENERATED_AT });

  return buildGavanWeek1Day6MaterialExportPacket(day6, sourceSeed, day5Export, {
    generatedAt: GENERATED_AT,
  });
}

function approvedExport(): GavanWeek1Day7ApprovedReviewerExport {
  const standards = buildGavanWeek1ExpansionStandards({ generatedAt: GENERATED_AT });
  const blueprint = buildGavanWeek1Day7BlueprintCandidate(standards, {
    generatedAt: GENERATED_AT,
  });
  const reviewerExport = buildGavanWeek1Day7ReviewerExport(blueprint, {
    generatedAt: GENERATED_AT,
  });
  const input = buildGavanWeek1Day7ReviewerApprovalInput(reviewerExport, {
    reviewerId: REVIEWER_ID,
    approvedAt: APPROVED_AT,
  });
  const result = approveGavanWeek1Day7ReviewerExport(reviewerExport, input, GENERATED_AT);

  if (!result.approvedExport) {
    throw new Error('Expected approved day 7 reviewer export.');
  }

  return result.approvedExport;
}

function candidate() {
  return buildGavanWeek1Day7MaterialCandidate(approvedExport(), day6Export(), {
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 7 concrete material candidate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH)) {
      rmSync(GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day7MaterialCandidate(approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH,
    });
  });

  it('builds a non-live day 7 material candidate from approved reviewer export and day 6 export', () => {
    const material = candidate();

    expect(material).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day7_material_candidate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day7',
      dayIndex: 7,
      status: 'day7_material_candidate_not_live',
      sourceApprovedReviewerExportKind: 'gavan_week1_day7_approved_reviewer_export',
      sourceDay6ExportStatus: 'day6_material_export_not_live',
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('uses only approved day 7 phrases', () => {
    const material = candidate();

    expect(material.materialPhrases.map((phrase) => phrase.english)).toEqual([
      'I need a moment.',
      'Could you say that again?',
      'What should I do next?',
      "I'll check and come back.",
    ]);
    expect(material.materialPhrases.every((phrase) => phrase.reviewStatus === 'approved')).toBe(true);
  });

  it('promotes day 7 exercise blueprints into concrete material blocks without final renderer claims', () => {
    const material = candidate();

    expect(material.exerciseBlocks.map((block) => block.exerciseType)).toEqual([
      'lesson_bridge',
      'active_recall',
      'listening_choice',
      'natural_choice',
      'micro_dialogue',
      'day_quiz_intent',
    ]);
    expect(material.exerciseBlocks.every((block) => block.finalExerciseBuilt === false)).toBe(true);
  });

  it('builds listening natural-choice and micro-dialogue items with safe option counts', () => {
    const material = candidate();

    expect(material.listeningChoiceItems).toHaveLength(4);
    material.listeningChoiceItems.forEach((item) => {
      expect(item.options).toContain(item.correctEnglish);
      expect(new Set(item.options).size).toBe(item.options.length);
      expect(item.options).toHaveLength(3);
      expect(item.audioAssetStatus).toBe('not_generated');
      expect(item.finalAudioReady).toBe(false);
    });

    expect(material.naturalChoiceItems).toHaveLength(4);
    material.naturalChoiceItems.forEach((item) => {
      expect(item.options).toContain(item.correctEnglish);
      expect(new Set(item.options).size).toBe(item.options.length);
      expect(item.options).toHaveLength(3);
    });

    expect(material.microDialogueItems).toHaveLength(4);
    material.microDialogueItems.forEach((item) => {
      expect(item.responseOptions).toContain(item.targetEnglish);
      expect(new Set(item.responseOptions).size).toBe(item.responseOptions.length);
      expect(item.responseOptions).toHaveLength(3);
    });
  });

  it('keeps plan recall free of highlighting hints and returns mistakes later', () => {
    const material = candidate();

    expect(material.activeRecall.correctWordHighlighting).toBe(false);
    expect(material.activeRecall.hintsEnabled).toBe(false);
    expect(material.activeRecall.errorsReturnLater).toBe(true);
    expect(material.activeRecall.recallOrder).not.toEqual(
      material.materialPhrases.map((phrase) => phrase.id),
    );
  });

  it('keeps approved after-answer explanations and does not invent unseen wrong option feedback', () => {
    const material = candidate();

    material.materialPhrases.forEach((phrase) => {
      const covered = new Set(phrase.afterAnswerExplanations.flatMap((card) => card.covers));
      [...phrase.newWords, ...phrase.firstSeenConstructions].forEach((target) => {
        expect(covered.has(target)).toBe(true);
      });
      expect(phrase.afterAnswerExplanations.every((card) => card.trigger === 'after_answer')).toBe(true);
      expect(phrase.afterAnswerExplanations.every((card) => card.mustNotMentionUnseenWrongOption)).toBe(true);
    });
  });

  it('plans exactly 10 quiz questions without writing or registering the quiz', () => {
    const material = candidate();

    expect(material.dayQuizIntent.questionCount).toBe(10);
    expect(material.dayQuizIntent.questionBlueprints).toHaveLength(10);
    expect(material.dayQuizIntent.finalQuizWritten).toBe(false);
    expect(material.dayQuizIntent.quizRegistered).toBe(false);
  });

  it('keeps audio pronunciation and production writes honest', () => {
    const material = candidate();

    expect(material.mediaClaims.audioAssetStatus).toBe('not_generated');
    expect(material.mediaClaims.pronunciationScoringStatus).toBe('not_built');
    expect(material.mediaClaims.finalAudioReady).toBe(false);
    expect(material.mediaClaims.finalPronunciationScoringReady).toBe(false);
    expect(material.writePolicy.liveFilesEdited).toBe(false);
  });

  it('passes its own quality gate and catches corrupted material candidates', () => {
    const material = candidate();

    expect(validateGavanWeek1Day7MaterialCandidate(material, approvedExport(), day6Export())).toEqual({
      valid: true,
      issues: [],
    });

    const corrupted = {
      ...material,
      dayId: 'gavan-week1-day6',
      listeningChoiceItems: [
        {
          ...material.listeningChoiceItems[0],
          options: [material.listeningChoiceItems[0].correctEnglish],
          finalAudioReady: true,
        },
      ],
      naturalChoiceItems: [
        {
          ...material.naturalChoiceItems[0],
          options: [material.naturalChoiceItems[0].correctEnglish],
        },
      ],
      microDialogueItems: [
        {
          ...material.microDialogueItems[0],
          responseOptions: [material.microDialogueItems[0].targetEnglish],
        },
      ],
      activeRecall: {
        ...material.activeRecall,
        correctWordHighlighting: true,
      },
      materialPhrases: [
        {
          ...material.materialPhrases[0],
          english: 'Email me when you need a moment.',
          afterAnswerExplanations: [],
        },
      ],
      dayQuizIntent: {
        ...material.dayQuizIntent,
        questionBlueprints: material.dayQuizIntent.questionBlueprints.slice(0, 9),
        quizRegistered: true,
      },
      mediaClaims: {
        ...material.mediaClaims,
        finalAudioReady: true,
        finalPronunciationScoringReady: true,
      },
    };

    const result = validateGavanWeek1Day7MaterialCandidate(corrupted as any, approvedExport(), day6Export());
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'wrong_day_id' }),
      expect.objectContaining({ code: 'listening_choice_option_count_mismatch' }),
      expect.objectContaining({ code: 'listening_choice_fake_audio_claim' }),
      expect.objectContaining({ code: 'natural_choice_option_count_mismatch' }),
      expect.objectContaining({ code: 'micro_dialogue_option_count_mismatch' }),
      expect.objectContaining({ code: 'recall_highlighting_enabled' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'missing_after_answer_explanation' }),
      expect.objectContaining({ code: 'wrong_quiz_question_count' }),
      expect.objectContaining({ code: 'quiz_registered' }),
      expect.objectContaining({ code: 'fake_audio_claim' }),
      expect.objectContaining({ code: 'fake_pronunciation_claim' }),
    ]));
  });

  it('writes deterministic material JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day7MaterialCandidate(approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day7-material-candidate.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day7_material_candidate');
    expect(parsed.dayId).toBe('gavan-week1-day7');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day7MaterialCandidate(approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day7-material.json'),
    });
    const toolsResult = writeGavanWeek1Day7MaterialCandidate(approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day7-material.json'),
    });
    const testsResult = writeGavanWeek1Day7MaterialCandidate(approvedExport(), day6Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day7-material.json'),
    });

    expect(appResult.valid).toBe(false);
    expect(toolsResult.valid).toBe(false);
    expect(testsResult.valid).toBe(false);
    expect(appResult.issues[0].code).toBe('target_path_not_allowed');
    expect(toolsResult.issues[0].code).toBe('target_path_not_allowed');
    expect(testsResult.issues[0].code).toBe('target_path_not_allowed');
  });

  it('does not import or mutate live app routes catalog quiz UI storage audio scoring or navigation', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day7_material_candidate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz|personal_plan_quizzes/);
  });
});
