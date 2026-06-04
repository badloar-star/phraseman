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
  GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH,
  validateGavanWeek1Day2MaterialCandidate,
  writeGavanWeek1Day2MaterialCandidate,
} from '../tools/personal_plan_gavan_week1_day2_material_candidate';

const GENERATED_AT = '2026-06-03T15:00:00.000Z';

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

describe('Gavan week 1 day 2 concrete material candidate', () => {
  beforeEach(() => {
    if (existsSync(GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH)) {
      rmSync(GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH, { force: true });
    }
  });

  afterAll(() => {
    writeGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH,
    });
  });

  it('builds a non-live day 2 material candidate from seed and day 1 export', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate).toEqual(expect.objectContaining({
      kind: 'gavan_week1_day2_material_candidate',
      generatedAt: GENERATED_AT,
      planId: 'gavan',
      weekId: 'gavan-week1',
      dayId: 'gavan-week1-day2',
      dayIndex: 2,
      status: 'day2_material_candidate_not_live',
      sourceSeedStatus: 'content_authoring_seed_not_live',
      sourceDay1ExportStatus: 'day1_material_export_not_live',
      liveIntegration: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
    }));
  });

  it('includes lesson bridge listening active recall phrase build and day quiz intent blocks', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.exerciseBlocks.map((block) => block.exerciseType)).toEqual([
      'lesson_bridge',
      'listening_choice',
      'active_recall',
      'phrase_build',
      'day_quiz_intent',
    ]);
    expect(candidate.exerciseBlocks.every((block) => block.finalExerciseBuilt === false)).toBe(true);
  });

  it('uses universal day 2 phrases without narrow relocation anchors or personal data', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.sourceSeedDayTitle).toBe('Повторить и замедлить');
    expect(candidate.materialPhrases.map((phrase) => [phrase.english, phrase.meaningRu])).toEqual([
      ['Could you say that again?', 'Можете сказать это еще раз?'],
      ['Could you say it slower?', 'Можете сказать медленнее?'],
      ["I didn't catch that.", 'Я не расслышал.'],
      ['One more time, please.', 'Еще раз, пожалуйста.'],
    ]);

    const userFacingText = [
      candidate.sourceSeedDayTitle,
      ...candidate.exerciseBlocks.flatMap((block) => [block.userFacingLabelRu, block.purposeRu]),
      ...candidate.materialPhrases.flatMap((phrase) => [
        phrase.english,
        phrase.meaningRu,
        ...phrase.afterAnswerExplanations.flatMap((card) => [
          card.correctFeedbackRu,
          card.wrongFeedbackRu,
        ]),
      ]),
    ].join(' ');
    expect(userFacingText).not.toMatch(/квартир|аренд|номер телефона|email|почт|анкет|Alex|Beta|087|@/i);
    expect(userFacingText).not.toMatch(/Я не уловил/i);
  });

  it('keeps day 2 exercise copy clear and user-facing', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.exerciseBlocks.map((block) => block.userFacingLabelRu)).toEqual([
      'Мягко переспросить',
      'Узнать на слух',
      'Вспомнить самому',
      'Собрать просьбу',
      'Проверить себя',
    ]);
    expect(candidate.exerciseBlocks.map((block) => block.purposeRu).join(' ')).not.toMatch(
      /черновик|dev|developer|зарегистрировать|регистрация/i,
    );
  });

  it('builds phrase tiles with target word counts and safe distractors', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
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

  it('creates listening placeholders only and never claims generated audio', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.listeningPlaceholders).toHaveLength(4);
    candidate.listeningPlaceholders.forEach((placeholder) => {
      expect(placeholder.assetStatus).toBe('not_generated');
      expect(placeholder.provider).toBe('openai_audio_later');
      expect(placeholder.finalAudioReady).toBe(false);
      expect(placeholder.sourcePhraseId).toMatch(/^gavan-week1-day2:phrase-/);
      expect(placeholder.audioPromptRu.length).toBeGreaterThan(20);
    });
  });

  it('keeps plan recall free of highlighting hints and returns mistakes later', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
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
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
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
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.dayQuizIntent.questionCount).toBe(10);
    expect(candidate.dayQuizIntent.questionBlueprints).toHaveLength(10);
    expect(candidate.dayQuizIntent.finalQuizWritten).toBe(false);
    expect(candidate.dayQuizIntent.quizRegistered).toBe(false);
  });

  it('keeps audio pronunciation and production writes honest', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(candidate.mediaClaims.audioAssetStatus).toBe('not_generated');
    expect(candidate.mediaClaims.pronunciationScoringStatus).toBe('not_built');
    expect(candidate.mediaClaims.finalAudioReady).toBe(false);
    expect(candidate.mediaClaims.finalPronunciationScoringReady).toBe(false);
    expect(candidate.writePolicy.liveFilesEdited).toBe(false);
  });

  it('passes its own quality gate and catches corrupted material candidates', () => {
    const candidate = buildGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
    });

    expect(validateGavanWeek1Day2MaterialCandidate(candidate, seed(), day1Export())).toEqual({
      valid: true,
      issues: [],
    });

    const corrupted = {
      ...candidate,
      phraseBuildItems: [
        {
          ...candidate.phraseBuildItems[0],
          wordTiles: ['Could'],
          distractorTiles: ['Could'],
        },
      ],
      listeningPlaceholders: [
        {
          ...candidate.listeningPlaceholders[0],
          assetStatus: 'generated',
          finalAudioReady: true,
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

    const result = validateGavanWeek1Day2MaterialCandidate(corrupted as any, seed(), day1Export());
    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'word_tile_count_mismatch' }),
      expect.objectContaining({ code: 'unsafe_distractor_tile' }),
      expect.objectContaining({ code: 'fake_listening_audio_claim' }),
      expect.objectContaining({ code: 'recall_highlighting_enabled' }),
      expect.objectContaining({ code: 'forbidden_anchor_present' }),
      expect.objectContaining({ code: 'missing_after_answer_explanation' }),
      expect.objectContaining({ code: 'wrong_quiz_question_count' }),
    ]));
  });

  it('writes deterministic material JSON only under temp or report roots', () => {
    const result = writeGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
      targetPath: GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(path.resolve(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-day2-material-candidate.json',
    ));
    expect(existsSync(GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH)).toBe(true);

    const parsed = JSON.parse(readFileSync(GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH, 'utf8'));
    expect(parsed.kind).toBe('gavan_week1_day2_material_candidate');
    expect(parsed.dayId).toBe('gavan-week1-day2');
  });

  it('rejects app tools tests and root config write targets', () => {
    const appResult = writeGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'app', 'gavan-week1-day2-material.json'),
    });
    const toolsResult = writeGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tools', 'gavan-week1-day2-material.json'),
    });
    const testsResult = writeGavanWeek1Day2MaterialCandidate(seed(), day1Export(), {
      generatedAt: GENERATED_AT,
      targetPath: path.join(process.cwd(), 'tests', 'gavan-week1-day2-material.json'),
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
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_day2_material_candidate.ts'),
      'utf8',
    );

    expect(source).not.toMatch(/from '..\/app\//);
    expect(source).not.toMatch(/react-native|AsyncStorage|expo-av|expo-audio|navigation/);
    expect(source).not.toMatch(/PERSONAL_PLAN_CATALOG|getPersonalPlanQuiz/);
  });
});
