import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanDayTaskSurfaceModel,
  PlanDayTaskSurfaceModel,
} from '../app/personal_plan_day_task_surface_model';
import {
  validatePlanDayTaskSurfaceModel,
} from '../app/personal_plan_day_task_surface_gate';

function makeBlock(
  type: string,
  overrides: Partial<PlanExerciseBlock> = {},
): PlanExerciseBlock {
  return {
    id: `block-${type}`,
    planId: 'harbor',
    dayIndex: 1,
    type,
    title: `Task ${type}`,
    subtitle: 'Readable product copy.',
    estimatedMinutes: 5,
    targetSkill: 'short_reply',
    source: 'personal_plan',
    contentUnitIds: ['unit-1', 'unit-2'],
    contentUnits: [
      {
        id: 'unit-1',
        prompt: 'Скажи коротко, что ты здесь.',
        answer: "I'm here.",
        correctAnswer: "I'm here.",
        acceptableAnswers: ["I'm here."],
        distractors: ['you', 'he', 'ready'],
        options: ["I'm here.", "You're here.", "He's here."],
        missingWord: "I'm",
        explanationCards: [
          {
            id: 'exp-unit-1',
            title: 'Почему так',
            body: "I'm - живой короткий вариант I am. Для спокойной фразы он звучит естественно.",
            trigger: 'first_seen',
            tone: 'supportive',
          },
        ],
      },
      {
        id: 'unit-2',
        prompt: 'Попроси повторить проще.',
        answer: 'Could you repeat that?',
        correctAnswer: 'Could you repeat that?',
        acceptableAnswers: ['Could you repeat that?'],
        distractors: ['answer', 'busy', 'their'],
        options: ['Could you repeat that?', 'Could you answer that?'],
        missingWord: 'repeat',
        explanationCards: [
          {
            id: 'exp-unit-2',
            title: 'Repeat',
            body: 'Repeat значит повторить. Вежливая просьба звучит спокойно и без давления.',
            trigger: 'first_seen',
            tone: 'supportive',
          },
        ],
      },
    ],
    requiredContentUnitCount: 2,
    recoveryPolicy: 'return_wrong_later',
    ...overrides,
  } as PlanExerciseBlock;
}

function makeValidSurface(): PlanDayTaskSurfaceModel {
  return buildPlanDayTaskSurfaceModel(
    [
      makeBlock('plan_missing_word'),
      makeBlock('plan_listen_choose', {
        id: 'listen-1',
      }),
    ],
    'instance-1',
    [] as PlanAttemptEvent[],
  );
}

describe('validatePlanDayTaskSurfaceModel', () => {
  it('passes a valid task surface model', () => {
    const result = validatePlanDayTaskSurfaceModel(makeValidSurface());

    expect(result).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('fails when a task title is missing', () => {
    const surface = makeValidSurface();
    surface.items[0] = {
      ...surface.items[0],
      title: '',
    };

    expect(validatePlanDayTaskSurfaceModel(surface).issues).toContainEqual(
      expect.objectContaining({
        code: 'missing_task_title',
        blockId: 'block-plan_missing_word',
        index: 0,
      }),
    );
  });

  it('fails when a blocked action has no issues', () => {
    const surface = makeValidSurface();
    surface.items[1] = {
      ...surface.items[1],
      action: {
        ...surface.items[1].action,
        kind: 'blocked',
        issues: [],
      },
    } as typeof surface.items[1];

    expect(validatePlanDayTaskSurfaceModel(surface).issues).toContainEqual(
      expect.objectContaining({
        code: 'blocked_action_missing_issues',
        blockId: 'listen-1',
        index: 1,
      }),
    );
  });

  it('fails when an open action has no params', () => {
    const surface = makeValidSurface();
    const action = surface.items[0].action;
    surface.items[0] = {
      ...surface.items[0],
      action: {
        ...action,
        kind: 'open_plan_renderer',
        params: undefined,
      },
    } as unknown as typeof surface.items[0];

    expect(validatePlanDayTaskSurfaceModel(surface).issues).toContainEqual(
      expect.objectContaining({
        code: 'open_action_missing_params',
        blockId: 'block-plan_missing_word',
        index: 0,
      }),
    );
  });

  it('fails on duplicate block ids', () => {
    const surface = makeValidSurface();
    surface.items[1] = {
      ...surface.items[1],
      blockId: surface.items[0].blockId,
    };

    expect(validatePlanDayTaskSurfaceModel(surface).issues).toContainEqual(
      expect.objectContaining({
        code: 'duplicate_block_id',
        blockId: 'block-plan_missing_word',
        index: 1,
      }),
    );
  });

  it('fails when counts do not match items', () => {
    const surface = makeValidSurface();
    surface.counts = {
      ...surface.counts,
      total: 99,
    };

    expect(validatePlanDayTaskSurfaceModel(surface).issues).toContainEqual({
      code: 'counts_mismatch',
    });
  });
});
