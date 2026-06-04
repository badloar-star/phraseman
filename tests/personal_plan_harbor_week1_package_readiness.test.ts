import {
  buildGavanWeek1DraftExerciseBlocks,
  type GavanWeek1DraftExerciseBlockBuildResult,
} from '../app/personal_plan_harbor_week1_draft_blocks';
import {
  buildGavanWeek1DraftPackageReadinessInput,
  validateGavanWeek1DraftPackageReadiness,
  type GavanWeek1DraftPackageReadinessInput,
} from '../app/personal_plan_harbor_week1_package_readiness';
import { buildBlockedPlanPronunciationScoringRequirement } from '../app/personal_plan_pronunciation_readiness';

function draftBlocks(): GavanWeek1DraftExerciseBlockBuildResult {
  return buildGavanWeek1DraftExerciseBlocks();
}

function validInput(): GavanWeek1DraftPackageReadinessInput {
  return buildGavanWeek1DraftPackageReadinessInput(draftBlocks());
}

describe('Gavan week 1 package readiness gate', () => {
  it('accepts explicit placeholder audio and blocked pronunciation requirements', () => {
    const input = validInput();
    const result = validateGavanWeek1DraftPackageReadiness(validInput());
    const listenBlockId = input.draft.blocks.find((block) => block.type === 'plan_listen_choose')?.id;

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(input.audioRequirementsByBlockId[listenBlockId!]).toMatchObject({
      blockId: listenBlockId,
      status: 'placeholder',
      finalAssetReady: false,
      locale: 'en',
      contentUnitIds: expect.arrayContaining(['gavan-w1-d2-p1']),
      targetText: expect.stringContaining('Could you repeat that?'),
    });
    expect(result.summary).toEqual({
      days: 7,
      blocks: 26,
      quizRequirements: 4,
      audioRequirements: 5,
      audioProductionReady: 0,
      audioProductionBlocked: 5,
      blockedPronunciationRequirements: 2,
      rendererReadinessItems: 26,
    });
  });

  it('fails quiz blocks without a 10-question draft requirement', () => {
    const input = validInput();
    const quizBlockId = input.draft.blocks.find((block) => block.type === 'plan_quiz')?.id;
    delete input.quizRequirementsByBlockId[quizBlockId!];

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).toContainEqual(
      expect.objectContaining({
        code: 'missing_quiz_requirement',
        blockId: quizBlockId,
      }),
    );

    input.quizRequirementsByBlockId[quizBlockId!] = {
      questionCount: 8,
      status: 'draft',
    };

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).toContainEqual(
      expect.objectContaining({
        code: 'quiz_must_have_10_questions',
        blockId: quizBlockId,
      }),
    );
  });

  it('fails listening blocks without audio requirements', () => {
    const input = validInput();
    const listenBlockId = input.draft.blocks.find((block) => block.type === 'plan_listen_choose')?.id;
    delete input.audioRequirementsByBlockId[listenBlockId!];

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).toContainEqual(
      expect.objectContaining({
        code: 'missing_audio_requirement',
        blockId: listenBlockId,
      }),
    );
  });

  it('fails missing renderer readiness metadata', () => {
    const input = validInput();
    const firstBlockId = input.draft.blocks[0].id;
    delete input.rendererReadinessByBlockId[firstBlockId];

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).toContainEqual(
      expect.objectContaining({
        code: 'missing_renderer_readiness',
        blockId: firstBlockId,
      }),
    );
  });

  it('fails generated empty days', () => {
    const input = validInput();
    input.draft.blocksByDayId['gavan-week1-day1'] = [];
    input.draft.blocks = Object.values(input.draft.blocksByDayId).flat();
    input.draft.allBlocks = input.draft.blocks;

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).toContainEqual(
      expect.objectContaining({
        code: 'empty_generated_day',
        dayId: 'gavan-week1-day1',
      }),
    );
  });

  it('accepts approved audio metadata when every final asset field is present', () => {
    const input = validInput();
    const listenBlockId = input.draft.blocks.find((block) => block.type === 'plan_listen_choose')?.id;

    input.audioRequirementsByBlockId[listenBlockId!] = {
      id: 'audio:approved-final',
      blockId: listenBlockId!,
      contentUnitIds: ['gavan-w1-d2-p1'],
      targetText: 'Could you repeat that?',
      locale: 'en',
      status: 'approved',
      assetId: 'openai-audio-001',
      uri: 'assets/audio/personal-plans/gavan/d2/repeat-that.mp3',
      durationMs: 1800,
      voiceId: 'openai:alloy',
      provider: 'openai',
      finalAssetReady: true,
    };

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).not.toContainEqual(
      expect.objectContaining({
        code: 'fake_final_audio_claim',
        blockId: listenBlockId,
      }),
    );
  });

  it('fails fake final audio and pronunciation readiness claims', () => {
    const input = validInput();
    const listenBlockId = input.draft.blocks.find((block) => block.type === 'plan_listen_choose')?.id;
    const pronunciationId = input.draft.excludedPlaceholders[0].exerciseId;

    input.audioRequirementsByBlockId[listenBlockId!] = {
      ...input.audioRequirementsByBlockId[listenBlockId!],
      finalAssetReady: true,
    };
    input.pronunciationRequirementsByExerciseId[pronunciationId] =
      buildBlockedPlanPronunciationScoringRequirement({
        exerciseId: pronunciationId,
        blockId: 'gavan-week1-day2:block-pronunciation',
        contentUnitIds: ['gavan-w1-d2-p1'],
        targetText: 'Could you repeat that?',
      });
    input.pronunciationRequirementsByExerciseId[pronunciationId] = {
      ...input.pronunciationRequirementsByExerciseId[pronunciationId],
      finalScoringReady: true,
    };

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'fake_final_audio_claim',
        blockId: listenBlockId,
      }),
      expect.objectContaining({
        code: 'fake_final_pronunciation_claim',
        exerciseId: pronunciationId,
      }),
    ]));
  });

  it('accepts ready pronunciation scoring metadata when every scoring field is present', () => {
    const input = validInput();
    const pronunciationId = input.draft.excludedPlaceholders[0].exerciseId;

    input.pronunciationRequirementsByExerciseId[pronunciationId] = {
      id: 'pronunciation:approved-final',
      exerciseId: pronunciationId,
      blockId: 'gavan-week1-day2:block-pronunciation',
      contentUnitIds: ['gavan-w1-d2-p1'],
      targetText: 'Could you repeat that?',
      status: 'ready',
      scorerId: 'pronunciation-scorer-openai-v1',
      scoringProvider: 'openai',
      scoringVersion: 'pronunciation-v1',
      resultFields: ['score', 'pronunciationScore', 'fluencyScore'],
      minimumConfidence: 0.75,
      finalScoringReady: true,
    };

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).not.toContainEqual(
      expect.objectContaining({
        code: 'fake_final_pronunciation_claim',
        exerciseId: pronunciationId,
      }),
    );
  });

  it('fails listening audio requirements without target text or content units', () => {
    const input = validInput();
    const listenBlockId = input.draft.blocks.find((block) => block.type === 'plan_listen_choose')?.id;

    input.audioRequirementsByBlockId[listenBlockId!] = {
      ...input.audioRequirementsByBlockId[listenBlockId!],
      targetText: '',
      contentUnitIds: [],
    };

    expect(validateGavanWeek1DraftPackageReadiness(input).issues).toContainEqual(
      expect.objectContaining({
        code: 'invalid_audio_requirement',
        blockId: listenBlockId,
        detail: expect.stringContaining('missing_audio_content_units'),
      }),
    );
  });
});
