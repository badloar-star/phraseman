import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanDayTaskSurfaceFromInput,
} from '../app/personal_plan_task_surface_api';

function makeBlock(
  id: string,
  type = 'plan_missing_word',
  overrides: Partial<PlanExerciseBlock> = {},
): PlanExerciseBlock {
  return {
    id,
    planId: 'harbor',
    dayIndex: 1,
    type,
    title: `Task ${id}`,
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

describe('personal_plan_task_surface_api', () => {
  it('exposes the public build function', () => {
    expect(typeof buildPlanDayTaskSurfaceFromInput).toBe('function');
  });

  it('builds a renderable bundle from valid input through the public API', () => {
    const result = buildPlanDayTaskSurfaceFromInput({
      blocks: [makeBlock('block-1')],
      planInstanceId: 'instance-1',
      attemptEvents: [] as PlanAttemptEvent[],
    });

    expect(result.canRender).toBe(true);
    expect(result.bundle?.model.items).toEqual([
      expect.objectContaining({
        blockId: 'block-1',
        state: 'available',
      }),
    ]);
  });

  it('returns canRender false for invalid input through the public API', () => {
    const result = buildPlanDayTaskSurfaceFromInput({});

    expect(result.canRender).toBe(false);
    expect(result.bundle).toBeUndefined();
    expect(result.inputReadiness.ready).toBe(false);
  });

  it('preserves no correct-word highlighting through the public API', () => {
    const result = buildPlanDayTaskSurfaceFromInput({
      blocks: [makeBlock('block-1')],
      planInstanceId: 'instance-1',
      attemptEvents: [] as PlanAttemptEvent[],
    });

    expect(result.bundle?.model.items[0].action).toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          allowCorrectWordHighlighting: false,
        }),
      }),
    );
  });
});
