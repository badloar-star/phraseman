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
  GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH,
  validateGavanWeek1Day3MaterialCandidate,
  writeGavanWeek1Day3MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day3_material_candidate';

const GENERATED_AT = '2026-06-03T17:00:00.000Z';

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
  const day2Candidate = buildGavanWeek1Day2MaterialCandidate(sourceSeed, day1Export(), {
    generatedAt: GENERATED_AT,
  });

  return buildGavanWeek1Day2MaterialExportPacket(day2Candidate, sourceSeed, day1Export(), {
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 3 concrete material candidate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH)) {
      rmSync(GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH,
    });
  });

  it('builds a non-live day 3 material candidate from seed and day 2 export', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day3_material_candidate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day3',
      dayIndex: 3,
      status: 'day3_material_candidate_not_live',
      sourceSeedStatus: 'content_authoring_seed_not_live',
      sourceDay2ExportStatus: 'day2_material_export_not_live',
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('uses a different concrete rhythm from day 2', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.exerciseBlocks.map((block) => block.exerciseType)).toEqual([
      'lesson_bridge',
      'phrase_build',
      'missing_word',
      'active_recall',
      'day_quiz_intent',
    ]);
    expect(candidate.exerciseBlocks.every((block) => block.finalExerciseBuilt === false)).toBe(true);
  });

  it('builds phrase tiles with target word counts and safe distractors', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    candidate.phraseBuildItems.forEach((item) => {
      expect(item.wordTiles).toHaveLength(item.targetTokenCount);
      expect(item.wordTiles.join(' ')).toBe(item.normalizedTarget);
      expect(item.distractorTiles.length).toBeGreaterThanOrEqual(2);
      item.distractorTiles.forEach((tile) => {
        expect(item.wordTiles).not.toContain(tile);
      });
    });
  });

  it('builds missing-word slots with one blank and exact token counts', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.missingWordItems).toHaveLength(4);
    candidate.missingWordItems.forEach((item) => {
      expect(item.visibleSlots).toHaveLength(item.targetTokenCount);
      expect(item.visibleSlots.filter((slot) => slot === '__')).toHaveLength(1);
      expect(item.visibleSlots[item.blankIndex]).toBe('__');
      expect(item.answer).toBe(item.wordTiles[item.blankIndex]);
      expect(item.distractorTiles).not.toContain(item.answer);
    });
  });

  it('keeps plan recall free of highlighting hints and returns mistakes later', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.activeRecall.correctWordHighlighting).toBe(false);
    expect(candidate.activeRecall.hintsEnabled).toBe(false);
    expect(candidate.activeRecall.errorsReturnLater).toBe(true);
    expect(candidate.activeRecall.recallOrder).not.toEqual(
      candidate.phraseBuildItems.map((item) => item.phraseId),
    );
  });

  it('shows after-answer explanations without pretending to know a wrong option', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    candidate.materialPhrases.forEach((phrase) => {
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
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.dayQuizIntent.questionCount).toBe(10);
    expect(candidate.dayQuizIntent.questionBlueprints).toHaveLength(10);
    expect(candidate.dayQuizIntent.finalQuizWritten).toBe(false);
    expect(candidate.dayQuizIntent.quizRegistered).toBe(false);
  });

  it('keeps audio pronunciation and production writes honest', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.mediaClaims.audioAssetStatus).toBe('not_generated');
    expect(candidate.mediaClaims.pronunciationScoringStatus).toBe('not_built');
    expect(candidate.mediaClaims.finalAudioReady).toBe(false);
    expect(candidate.mediaClaims.finalPronunciationScoringReady).toBe(false);
    expect(candidate.writePolicy.liveFilesEdited).toBe(false);
  });

  it('passes its own quality gate and catches corrupted material candidates', () => {
    const candidate = buildGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(validateGavanWeek1Day3MaterialCandidate(candidate, seed(), day2Export())).toEqual({
      valid: true,
      issues: [],
    });

    const corrupted = {
      ...candidate,
      phraseBuildItems: [
        {
          ...candidate.phraseBuildItems[0],
          wordTiles: ['I'],
          distractorTiles: ['I'],
        },
      ],
      missingWordItems: [
        {
          ...candidate.missingWordItems[0],
          visibleSlots: ['__'],
          distractorTiles: [candidate.missingWordItems[0].answer],
        },
      ],
      activeRecall: {
        ...candidate.activeRecall,
        correctWordHighlighting: true,
      },
      materialPhrases: [
        {
          ...candidate.materialPhrases[0],
          english: 'My phone number is 0871234567.',
          afterAnswerExplanations: [],
        },
      ],
      dayQuizIntent: {
        ...candidate.dayQuizIntent,
        questionBlueprints: candidate.dayQuizIntent.questionBlueprints.slice(0, 9),
      },
    };

    const result = validateGavanWeek1Day3MaterialCandidate(corrupted as any, seed(), day2Export());
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'word_tile_count_mismatch' }),
      expect.objectContaining({ code: 'unsafe_distractor_tile' }),
      expect.objectContaining({ code: 'missing_word_slot_mismatch' }),
      expect.objectContaining({ code: 'unsafe_missing_word_distractor' }),
      expect.objectContaining({ code: 'recall_highlighting_enabled' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'missing_after_answer_explanation' }),
      expect.objectContaining({ code: 'wrong_quiz_question_count' }),
    ]));
  });

  it('writes deterministic material JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day3-material-candidate.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day3_material_candidate');
    expect(parsed.dayId).toBe('gavan-week1-day3');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day3-material.json'),
    });
    const toolsResult = writeGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day3-material.json'),
    });
    const testsResult = writeGavanWeek1Day3MaterialCandidate(seed(), day2Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day3-material.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day3_material_candidate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
