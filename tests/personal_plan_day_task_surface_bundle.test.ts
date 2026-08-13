import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanDayTaskSurfaceBundle,
} from '../app/personal_plan_day_task_surface_bundle';

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

describe('buildPlanDayTaskSurfaceBundle', () => {
  it('returns canRender true for valid task surface input', () => {
    const bundle = buildPlanDayTaskSurfaceBundle(
      [makeBlock('plan_missing_word')],
      'instance-1',
      [] as PlanAttemptEvent[],
    );

    expect(bundle.canRender).toBe(true);
    expect(bundle.readiness).toEqual({
      valid: true,
      issues: [],
    });
    expect(bundle.model.items).toEqual([
      expect.objectContaining({
        state: 'available',
        action: expect.objectContaining({
          kind: 'open_plan_renderer',
        }),
      }),
    ]);
  });

  it('allows a correctly described listen choose task to render as openable', () => {
    const bundle = buildPlanDayTaskSurfaceBundle(
      [
        makeBlock('plan_listen_choose', {
          id: 'listen-1',
        }),
      ],
      'instance-1',
      [] as PlanAttemptEvent[],
    );

    expect(bundle.canRender).toBe(true);
    expect(bundle.model.items).toEqual([
      expect.objectContaining({
        blockId: 'listen-1',
        state: 'available',
        action: expect.objectContaining({
          kind: 'open_plan_renderer',
          params: expect.objectContaining({
            rendererType: 'plan_listen_choose',
          }),
        }),
      }),
    ]);
  });

  it('returns canRender false when the injected validator rejects the model', () => {
    const bundle = buildPlanDayTaskSurfaceBundle(
      [makeBlock('plan_missing_word')],
      'instance-1',
      [] as PlanAttemptEvent[],
      {
        validateSurfaceModel: () => ({
          valid: false,
          issues: [
            {
              code: 'counts_mismatch',
            },
          ],
        }),
      },
    );

    expect(bundle.canRender).toBe(false);
    expect(bundle.readiness).toEqual({
      valid: false,
      issues: [
        {
          code: 'counts_mismatch',
        },
      ],
    });
  });

  it('preserves authored task order in the bundled model', () => {
    const bundle = buildPlanDayTaskSurfaceBundle(
      [
        makeBlock('plan_missing_word', {
          id: 'first',
        }),
        makeBlock('plan_listen_choose', {
          id: 'second',
        }),
        makeBlock('plan_phrase_build', {
          id: 'third',
        }),
      ],
      'instance-1',
      [] as PlanAttemptEvent[],
    );

    expect(bundle.model.items.map((item) => item.blockId)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('keeps no correct-word highlighting in bundled action params', () => {
    const bundle = buildPlanDayTaskSurfaceBundle(
      [
        makeBlock('plan_missing_word'),
        makeBlock('plan_phrase_build'),
      ],
      'instance-1',
      [] as PlanAttemptEvent[],
    );

    expect(bundle.model.items[0].action).toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          allowCorrectWordHighlighting: false,
        }),
      }),
    );
    expect(bundle.model.items[1].action).toEqual(
      expect.objectContaining({
        params: expect.objectContaining({
          allowCorrectWordHighlighting: false,
        }),
      }),
    );
  });
});
