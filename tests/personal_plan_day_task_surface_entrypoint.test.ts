import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanDayTaskSurfaceFromInput,
} from '../app/personal_plan_day_task_surface_entrypoint';

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

describe('buildPlanDayTaskSurfaceFromInput', () => {
  it('builds a renderable bundle from valid unresolved input', () => {
    const block = makeBlock('block-1');
    const result = buildPlanDayTaskSurfaceFromInput({
      blocks: [block],
      planInstanceId: 'instance-1',
      attemptEvents: [makeAttempt('attempt-1', block.id)],
    });

    expect(result.canRender).toBe(true);
    expect(result.inputReadiness.ready).toBe(true);
    expect(result.bundle?.canRender).toBe(true);
    expect(result.bundle?.model.items).toEqual([
      expect.objectContaining({
        blockId: 'block-1',
        action: expect.objectContaining({
          kind: 'open_plan_renderer',
        }),
      }),
    ]);
  });

  it('does not build a bundle when required inputs are missing', () => {
    const result = buildPlanDayTaskSurfaceFromInput({});

    expect(result.canRender).toBe(false);
    expect(result.bundle).toBeUndefined();
    expect(result.inputReadiness.ready).toBe(false);
    expect(result.inputReadiness.issues.map((issue) => issue.code)).toEqual([
      'missing_plan_instance_id',
      'missing_blocks',
      'missing_attempt_events',
    ]);
  });

  it('does not build a bundle when input has duplicate blocks', () => {
    const result = buildPlanDayTaskSurfaceFromInput({
      blocks: [
        makeBlock('block-1'),
        makeBlock('block-1'),
      ],
      planInstanceId: 'instance-1',
      attemptEvents: [],
    });

    expect(result.canRender).toBe(false);
    expect(result.bundle).toBeUndefined();
    expect(result.inputReadiness.issues).toContainEqual({
      code: 'duplicate_block_id',
      blockId: 'block-1',
    });
  });

  it('allows correctly described listen choose tasks to render as openable', () => {
    const result = buildPlanDayTaskSurfaceFromInput({
      blocks: [
        makeBlock('listen-1', 'plan_listen_choose'),
      ],
      planInstanceId: 'instance-1',
      attemptEvents: [],
    });

    expect(result.canRender).toBe(true);
    expect(result.bundle?.model.items).toEqual([
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

  it('preserves no correct-word highlighting in the bundled model', () => {
    const result = buildPlanDayTaskSurfaceFromInput({
      blocks: [
        makeBlock('block-1'),
      ],
      planInstanceId: 'instance-1',
      attemptEvents: [],
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
