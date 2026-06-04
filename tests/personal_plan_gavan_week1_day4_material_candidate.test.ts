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
  GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH,
  validateGavanWeek1Day4MaterialCandidate,
  writeGavanWeek1Day4MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day4_material_candidate';

const GENERATED_AT = '2026-06-03T19:00:00.000Z';

function seed() {
  return buildGavanWeek1ContentAuthoringSeed({
    generatedAt: GENERATED_AT,
  });
}

function day1Export() {
  const sourceSeed = seed();
  const day1Candidate = buildGavanWeek1Day1MaterialCandidate(sourceSeed, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day1MaterialExportPacket(day1Candidate, sourceSeed, {
    generatedAt: GENERATED_AT,
  });
}

function day2Export() {
  const sourceSeed = seed();
  const sourceDay1Export = day1Export();
  const day2Candidate = buildGavanWeek1Day2MaterialCandidate(sourceSeed, sourceDay1Export, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day2MaterialExportPacket(day2Candidate, sourceSeed, sourceDay1Export, {
    generatedAt: GENERATED_AT,
  });
}

function day3Export() {
  const sourceSeed = seed();
  const sourceDay2Export = day2Export();
  const day3Candidate = buildGavanWeek1Day3MaterialCandidate(sourceSeed, sourceDay2Export, {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day3MaterialExportPacket(day3Candidate, sourceSeed, sourceDay2Export, {
    generatedAt: GENERATED_AT,
  });
}

function candidate() {
  return buildGavanWeek1Day4MaterialCandidate(seed(), day3Export(), {
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 4 concrete material candidate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH)) {
      rmSync(GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day4MaterialCandidate(seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH,
    });
  });

  it('builds a non-live day 4 material candidate from seed and day 3 export', () => {
    const material = candidate();

    expect(material).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day4_material_candidate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day4',
      dayIndex: 4,
      status: 'day4_material_candidate_not_live',
      sourceSeedStatus: 'content_authoring_seed_not_live',
      sourceDay3ExportStatus: 'day3_material_export_not_live',
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('uses only the reset day 4 seed phrases', () => {
    const material = candidate();

    expect(material.materialPhrases.map((phrase) => phrase.english)).toEqual([
      'Is this right?',
      'Is it here?',
      'Is that okay?',
      'Do I need anything else?',
    ]);
  });

  it('uses a different concrete rhythm from day 3', () => {
    const material = candidate();

    expect(material.exerciseBlocks.map((block) => block.exerciseType)).toEqual([
      'lesson_bridge',
      'natural_choice',
      'mistake_repair',
      'quick_reply',
      'active_recall',
      'day_quiz_intent',
    ]);
    expect(material.exerciseBlocks.every((block) => block.finalExerciseBuilt === false)).toBe(true);
  });

  it('builds natural choice and quick reply items with safe alternatives', () => {
    const material = candidate();

    expect(material.naturalChoiceItems).toHaveLength(4);
    expect(material.quickReplyItems).toHaveLength(4);
    material.naturalChoiceItems.forEach((item) => {
      expect(item.options).toContain(item.correctEnglish);
      expect(new Set(item.options).size).toBe(item.options.length);
      expect(item.options).toHaveLength(4);
    });
    material.quickReplyItems.forEach((item) => {
      expect(item.options).toContain(item.correctEnglish);
      expect(new Set(item.options).size).toBe(item.options.length);
      expect(item.options).toHaveLength(3);
    });
  });

  it('builds repair items with exact target token counts and safe distractors', () => {
    const material = candidate();

    expect(material.repairItems).toHaveLength(4);
    material.repairItems.forEach((item) => {
      expect(item.wordTiles).toHaveLength(item.targetTokenCount);
      expect(item.wordTiles.join(' ')).toBe(item.normalizedTarget);
      expect(item.scrambledTiles).toHaveLength(item.targetTokenCount);
      expect(item.distractorTiles.length).toBeGreaterThanOrEqual(2);
      item.distractorTiles.forEach((tile) => {
        expect(item.wordTiles).not.toContain(tile);
      });
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

  it('shows after-answer explanations without pretending to know a wrong option', () => {
    const material = candidate();

    material.materialPhrases.forEach((phrase) => {
      const covered = new Set(phrase.afterAnswerExplanations.flatMap((card) => card.covers));
      [...phrase.newWords, ...phrase.firstSeenConstructions].forEach((target) => {
        expect(covered.has(target)).toBe(true);
      });
      expect(phrase.afterAnswerExplanations.every((card) => card.trigger === 'after_answer')).toBe(true);
      expect(phrase.afterAnswerExplanations.every((card) => card.mustNotMentionUnseenWrongOption)).toBe(true);
      expect(phrase.afterAnswerExplanations.every((card) => !/ты выбрал|выбранный вариант|этого варианта/i.test(
        `${card.correctFeedbackRu} ${card.wrongFeedbackRu}`,
      ))).toBe(true);
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

    expect(validateGavanWeek1Day4MaterialCandidate(material, seed(), day3Export())).toEqual({
      valid: true,
      issues: [],
    });

    const corrupted = {
      ...material,
      dayId: 'gavan-week1-day3',
      exerciseBlocks: material.exerciseBlocks.filter((block) => block.exerciseType !== 'quick_reply'),
      repairItems: [
        {
          ...material.repairItems[0],
          wordTiles: ['Is'],
          distractorTiles: ['Is'],
        },
      ],
      naturalChoiceItems: [
        {
          ...material.naturalChoiceItems[0],
          options: [material.naturalChoiceItems[0].correctEnglish],
        },
      ],
      activeRecall: {
        ...material.activeRecall,
        hintsEnabled: true,
      },
      materialPhrases: [
        {
          ...material.materialPhrases[0],
          english: 'My phone number is 0871234567.',
          afterAnswerExplanations: [],
        },
      ],
      dayQuizIntent: {
        ...material.dayQuizIntent,
        questionBlueprints: material.dayQuizIntent.questionBlueprints.slice(0, 9),
      },
    };

    const result = validateGavanWeek1Day4MaterialCandidate(corrupted as any, seed(), day3Export());
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'wrong_day_id' }),
      expect.objectContaining({ code: 'missing_required_block_type' }),
      expect.objectContaining({ code: 'repair_tile_count_mismatch' }),
      expect.objectContaining({ code: 'unsafe_distractor_tile' }),
      expect.objectContaining({ code: 'choice_option_count_mismatch' }),
      expect.objectContaining({ code: 'recall_highlighting_enabled' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'missing_after_answer_explanation' }),
      expect.objectContaining({ code: 'wrong_quiz_question_count' }),
    ]));
  });

  it('writes deterministic material JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day4MaterialCandidate(seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day4-material-candidate.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day4_material_candidate');
    expect(parsed.dayId).toBe('gavan-week1-day4');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day4MaterialCandidate(seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day4-material.json'),
    });
    const toolsResult = writeGavanWeek1Day4MaterialCandidate(seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day4-material.json'),
    });
    const testsResult = writeGavanWeek1Day4MaterialCandidate(seed(), day3Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day4-material.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day4_material_candidate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
