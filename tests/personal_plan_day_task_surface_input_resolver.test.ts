import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  resolvePlanDayTaskSurfaceInput,
} from '../app/personal_plan_day_task_surface_input_resolver';

function makeBlock(
  id: string,
  overrides: Partial<PlanExerciseBlock> = {},
): PlanExerciseBlock {
  return {
    id,
    planId: 'harbor',
    dayIndex: 1,
    type: 'plan_missing_word',
    title: `Task ${id}`,
    subtitle: 'Readable product copy.',
    estimatedMinutes: 5,
    targetSkill: 'short_reply',
    source: 'personal_plan',
    contentUnitIds: ['unit-1'],
    contentUnits: [],
    requiredContentUnitCount: 1,
    recoveryPolicy: 'return_wrong_later',
    ...overrides,
  } as PlanExerciseBlock;
}

function makeAttempt(
  id: string,
  blockId: string,
  planInstanceId = 'instance-1',
): PlanAttemptEvent {
  return {
    id,
    planId: 'harbor',
    planInstanceId,
    dayIndex: 1,
    blockId,
    contentUnitId: 'unit-1',
    exerciseType: 'plan_missing_word',
    isRight: true,
    result: 'correct',
    progressEligible: true,
    selectedAnswerKnown: true,
    explanationShown: true,
    recoveryGenerated: false,
    occurredAt: '2026-06-01T12:00:00.000Z',
    selectedAnswer: 'right answer',
    correctAnswer: 'right answer',
    answeredAt: '2026-06-01T12:00:00.000Z',
  } as unknown as PlanAttemptEvent;
}

describe('resolvePlanDayTaskSurfaceInput', () => {
  it('returns ready input when blocks, planInstanceId, and attempts are valid', () => {
    const block = makeBlock('block-1');
    const result = resolvePlanDayTaskSurfaceInput({
      blocks: [block],
      planInstanceId: 'instance-1',
      attemptEvents: [makeAttempt('attempt-1', block.id)],
    });

    expect(result).toEqual({
      ready: true,
      input: {
        blocks: [block],
        planInstanceId: 'instance-1',
        attemptEvents: [makeAttempt('attempt-1', block.id)],
      },
      issues: [],
    });
  });

  it('requires the three integration inputs', () => {
    const result = resolvePlanDayTaskSurfaceInput({});

    expect(result.ready).toBe(false);
    expect(result.issues).toEqual([
      {
        code: 'missing_plan_instance_id',
      },
      {
        code: 'missing_blocks',
      },
      {
        code: 'missing_attempt_events',
      },
    ]);
  });

  it('rejects duplicate block ids', () => {
    const result = resolvePlanDayTaskSurfaceInput({
      blocks: [
        makeBlock('block-1'),
        makeBlock('block-1'),
      ],
      planInstanceId: 'instance-1',
      attemptEvents: [],
    });

    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'duplicate_block_id',
      blockId: 'block-1',
    });
  });

  it('rejects attempts from another plan instance', () => {
    const result = resolvePlanDayTaskSurfaceInput({
      blocks: [makeBlock('block-1')],
      planInstanceId: 'instance-1',
      attemptEvents: [
        makeAttempt('attempt-1', 'block-1', 'other-instance'),
      ],
    });

    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'attempt_wrong_plan_instance',
      attemptId: 'attempt-1',
      blockId: 'block-1',
    });
  });

  it('rejects attempts for blocks that are not in the day input', () => {
    const result = resolvePlanDayTaskSurfaceInput({
      blocks: [makeBlock('block-1')],
      planInstanceId: 'instance-1',
      attemptEvents: [
        makeAttempt('attempt-1', 'missing-block'),
      ],
    });

    expect(result.ready).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'attempt_without_block',
      attemptId: 'attempt-1',
      blockId: 'missing-block',
    });
  });
});
