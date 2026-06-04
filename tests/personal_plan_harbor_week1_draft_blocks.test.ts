import { GAVAN_WEEK1_AUTHORING_PASSPORT } from '../app/personal_plan_harbor_week1_authoring_passport';
import { GAVAN_WEEK1_BLUEPRINT_DRAFT } from '../app/personal_plan_harbor_week1_blueprint_draft';
import {
  buildGavanWeek1DraftExerciseBlocks,
  validateGavanWeek1DraftExerciseBlocks,
  type GavanWeek1DraftExerciseBlockBuildInput,
} from '../app/personal_plan_harbor_week1_draft_blocks';
import {
  validatePlanEngineQuality,
  validatePlanExerciseBlockContract,
} from '../app/personal_plan_engine_contracts';

function cloneInput(): GavanWeek1DraftExerciseBlockBuildInput {
  return {
    blueprint: JSON.parse(JSON.stringify(GAVAN_WEEK1_BLUEPRINT_DRAFT)),
    passport: JSON.parse(JSON.stringify(GAVAN_WEEK1_AUTHORING_PASSPORT)),
  };
}

describe('Gavan week 1 draft exercise blocks', () => {
  it('builds deterministic draft blocks for every day and passes engine quality', () => {
    const result = buildGavanWeek1DraftExerciseBlocks(cloneInput());
    const allBlocks = Object.values(result.blocksByDayId).flat();

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(Object.keys(result.blocksByDayId)).toEqual([
      'gavan-week1-day1',
      'gavan-week1-day2',
      'gavan-week1-day3',
      'gavan-week1-day4',
      'gavan-week1-day5',
      'gavan-week1-day6',
      'gavan-week1-day7',
    ]);
    expect(result.blocksByDayId['gavan-week1-day1'].map((block) => block.id)).toEqual([
      'gavan-week1-day1:gavan-week1-day1:block-1',
      'gavan-week1-day1:gavan-week1-day1:block-2',
      'gavan-week1-day1:gavan-week1-day1:block-3',
      'gavan-week1-day1:gavan-week1-day1:block-4',
    ]);
    expect(allBlocks.every((block) => validatePlanExerciseBlockContract(block).length === 0))
      .toBe(true);
    expect(validatePlanEngineQuality({ blocks: allBlocks })).toEqual([]);
  });

  it('maps requiredFor from the 5/10/15/20 minute passport load', () => {
    const result = buildGavanWeek1DraftExerciseBlocks(cloneInput());
    const dayOneBlocks = result.blocksByDayId['gavan-week1-day1'];

    expect(dayOneBlocks.map((block) => [block.id, block.requiredFor])).toEqual([
      ['gavan-week1-day1:gavan-week1-day1:block-1', [5, 10, 15, 20]],
      ['gavan-week1-day1:gavan-week1-day1:block-2', [10, 15, 20]],
      ['gavan-week1-day1:gavan-week1-day1:block-3', [15, 20]],
      ['gavan-week1-day1:gavan-week1-day1:block-4', [20]],
    ]);
  });

  it('fails when load references an unknown exercise id', () => {
    const input = cloneInput();
    input.passport.days[0].loadByMinutes[20].push('not-in-day');

    const result = buildGavanWeek1DraftExerciseBlocks(input);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'unknown_exercise_id_in_load',
        dayId: 'gavan-week1-day1',
        exerciseId: 'not-in-day',
      }),
    );
  });

  it('excludes pronunciation placeholders instead of creating fake production blocks', () => {
    const result = buildGavanWeek1DraftExerciseBlocks(cloneInput());

    expect(result.blocksByDayId['gavan-week1-day4'].map((block) => block.id)).not.toContain(
      'gavan-week1-day4:gavan-week1-day4:block-4',
    );
    expect(result.excludedPlaceholders).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dayId: 'gavan-week1-day4',
        exerciseId: 'gavan-week1-day4:block-4',
        reason: 'pronunciation_placeholder',
      }),
    ]));
  });

  it('fails fake final pronunciation placeholders without generating ready blocks', () => {
    const input = cloneInput();
    input.passport.days[3].exerciseMix[3].pronunciationStatus = 'final';

    const result = buildGavanWeek1DraftExerciseBlocks(input);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'unsupported_placeholder_conversion',
        dayId: 'gavan-week1-day4',
        exerciseId: 'gavan-week1-day4:block-4',
      }),
    );
    expect(result.blocksByDayId['gavan-week1-day4'].map((block) => block.id)).not.toContain(
      'gavan-week1-day4:gavan-week1-day4:block-4',
    );
  });

  it('reports validator issues for manually corrupted generated blocks', () => {
    const result = buildGavanWeek1DraftExerciseBlocks(cloneInput());
    result.blocksByDayId['gavan-week1-day1'][0].contentUnitIds = [];

    expect(validateGavanWeek1DraftExerciseBlocks(result)).toContainEqual(
      expect.objectContaining({
        code: 'block_contract_failed',
        dayId: 'gavan-week1-day1',
        exerciseId: 'gavan-week1-day1:block-1',
      }),
    );
  });
});
