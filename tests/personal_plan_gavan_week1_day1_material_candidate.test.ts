import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ContentAuthoringSeed,
} from '../tools/personal_plan_gavan_week1_content_authoring_seed';
import {
  buildGavanWeek1Day1MaterialCandidate,
  GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH,
  validateGavanWeek1Day1MaterialCandidate,
  writeGavanWeek1Day1MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day1_material_candidate';

const GENERATED_AT = '2026-06-03T13:00:00.000Z';

function seed() {
  return buildGavanWeek1ContentAuthoringSeed({
    generatedAt: GENERATED_AT,
  });
}

describe('Gavan week 1 day 1 concrete material candidate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH)) {
      rmSync(GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH,
    });
  });

  it('builds a non-live day 1 material candidate from the reset seed', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day1_material_candidate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day1',
      dayIndex: 1,
      status: 'day1_material_candidate_not_live',
      sourceSeedStatus: 'content_authoring_seed_not_live',
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
    expect(candidate.sourceSeedDayTitle).toBe(seed().days[0].userFacingTitle);
  });

  it('includes concrete blocks for lesson bridge phrase build natural choice active recall and quiz intent', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
    });
    const blockTypes = candidate.exerciseBlocks.map((block) => block.exerciseType);

    expect(blockTypes).toEqual([
      'lesson_bridge',
      'phrase_build',
      'natural_choice',
      'active_recall',
      'day_quiz_intent',
    ]);
    expect(candidate.exerciseBlocks.every((block) => block.finalExerciseBuilt === false)).toBe(true);
  });

  it('builds phrase tiles with target word counts and safe distractors', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
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

  it('keeps plan recall free of correct-word highlighting and returns errors later', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.activeRecall.correctWordHighlighting).toBe(false);
    expect(candidate.activeRecall.hintsEnabled).toBe(false);
    expect(candidate.activeRecall.errorsReturnLater).toBe(true);
    expect(candidate.activeRecall.recallOrder).not.toEqual(
      candidate.phraseBuildItems.map((item) => item.phraseId),
    );
  });

  it('shows explanation cards after answer and covers every new word and construction', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
    });

    candidate.materialPhrases.forEach((phrase) => {
      const covered = new Set(phrase.afterAnswerExplanations.flatMap((card) => card.covers));
      [...phrase.newWords, ...phrase.firstSeenConstructions].forEach((target) => {
        expect(covered.has(target)).toBe(true);
      });
      expect(phrase.afterAnswerExplanations.every((card) => card.trigger === 'after_answer')).toBe(true);
      expect(phrase.afterAnswerExplanations.every((card) => card.mustNotMentionUnseenWrongOption)).toBe(true);
    });
  });

  it('plans exactly 10 quiz questions without writing or registering the quiz', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.dayQuizIntent.questionCount).toBe(10);
    expect(candidate.dayQuizIntent.questionBlueprints).toHaveLength(10);
    expect(candidate.dayQuizIntent.finalQuizWritten).toBe(false);
    expect(candidate.dayQuizIntent.quizRegistered).toBe(false);
  });

  it('keeps audio pronunciation and production writes honest', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.mediaClaims.audioAssetStatus).toBe('not_generated');
    expect(candidate.mediaClaims.pronunciationScoringStatus).toBe('not_built');
    expect(candidate.mediaClaims.finalAudioReady).toBe(false);
    expect(candidate.mediaClaims.finalPronunciationScoringReady).toBe(false);
    expect(candidate.writePolicy.liveFilesEdited).toBe(false);
  });

  it('passes its own quality gate and catches corrupted material candidates', () => {
    const candidate = buildGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
    });

    expect(validateGavanWeek1Day1MaterialCandidate(candidate, seed())).toEqual({
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
      mediaClaims: {
        ...candidate.mediaClaims,
        audioAssetStatus: 'generated',
      },
    };

    const result = validateGavanWeek1Day1MaterialCandidate(corrupted as any, seed());
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'word_tile_count_mismatch' }),
      expect.objectContaining({ code: 'unsafe_distractor_tile' }),
      expect.objectContaining({ code: 'recall_highlighting_enabled' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'missing_after_answer_explanation' }),
      expect.objectContaining({ code: 'wrong_quiz_question_count' }),
      expect.objectContaining({ code: 'fake_audio_claim' }),
    ]));
  });

  it('writes deterministic material JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day1-material-candidate.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day1_material_candidate');
    expect(parsed.dayId).toBe('gavan-week1-day1');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day1-material.json'),
    });
    const toolsResult = writeGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day1-material.json'),
    });
    const testsResult = writeGavanWeek1Day1MaterialCandidate(seed(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day1-material.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day1_material_candidate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
