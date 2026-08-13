import {
  PlanAttemptEvent,
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanDayTaskSurfaceModel,
} from '../app/personal_plan_day_task_surface_model';

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

function makeAttempt(
  blockId: string,
  contentUnitId: string,
  isRight: boolean,
): PlanAttemptEvent {
  return {
    id: `${blockId}-${contentUnitId}-${isRight ? 'right' : 'wrong'}`,
    planId: 'harbor',
    planInstanceId: 'instance-1',
    dayIndex: 1,
    blockId,
    contentUnitId,
    exerciseType: 'plan_phrase_build',
    isRight,
    result: isRight ? 'correct' : 'wrong',
    progressEligible: isRight,
    selectedAnswerKnown: true,
    explanationShown: true,
    recoveryGenerated: !isRight,
    occurredAt: '2026-06-01T12:00:00.000Z',
    selectedAnswer: isRight ? 'right answer' : 'wrong answer',
    correctAnswer: 'right answer',
    answeredAt: '2026-06-01T12:00:00.000Z',
  } as unknown as PlanAttemptEvent;
}

describe('buildPlanDayTaskSurfaceModel', () => {
  it('marks an untouched openable block as available', () => {
    const result = buildPlanDayTaskSurfaceModel(
      [makeBlock('plan_missing_word')],
      'instance-1',
      [],
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        blockId: 'block-plan_missing_word',
        state: 'available',
        action: expect.objectContaining({
          kind: 'open_plan_renderer',
          params: expect.objectContaining({
            allowCorrectWordHighlighting: false,
          }),
        }),
      }),
    ]);
    expect(result.counts).toEqual({
      total: 1,
      available: 1,
      completed: 0,
      needsRetry: 0,
      blocked: 0,
    });
  });

  it('marks a fully completed block as completed', () => {
    const block = makeBlock('plan_phrase_build');
    const result = buildPlanDayTaskSurfaceModel(
      [block],
      'instance-1',
      [
        makeAttempt(block.id, 'unit-1', true),
        makeAttempt(block.id, 'unit-2', true),
      ],
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        state: 'completed',
        action: expect.objectContaining({
          kind: 'open_lesson_shell',
        }),
      }),
    );
    expect(result.counts.completed).toBe(1);
  });

  it('marks a block with wrong progress as needs_retry', () => {
    const block = makeBlock('plan_choose_natural_phrase');
    const result = buildPlanDayTaskSurfaceModel(
      [block],
      'instance-1',
      [
        makeAttempt(block.id, 'unit-1', false),
      ],
    );

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        state: 'needs_retry',
        action: expect.objectContaining({
          kind: 'open_plan_renderer',
        }),
      }),
    );
    expect(result.hasRetryItems).toBe(true);
  });

  it('marks listen choose blocks as available when the renderer contract is present', () => {
    const result = buildPlanDayTaskSurfaceModel(
      [
        makeBlock('plan_listen_choose', {
          id: 'listen-1',
        }),
      ],
      'instance-1',
      [],
    );

    expect(result.items).toEqual([
      expect.objectContaining({
        blockId: 'listen-1',
        state: 'available',
        action: expect.objectContaining({
          kind: 'open_plan_renderer',
          params: expect.objectContaining({
            rendererType: 'plan_listen_choose',
            allowCorrectWordHighlighting: false,
          }),
        }),
      }),
    ]);
    expect(result.hasBlockedItems).toBe(false);
  });

  it('keeps task order from the authored day', () => {
    const result = buildPlanDayTaskSurfaceModel(
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
      [],
    );

    expect(result.items.map((item) => item.blockId)).toEqual([
      'first',
      'second',
      'third',
    ]);
    expect(result.items.map((item) => item.state)).toEqual([
      'available',
      'available',
      'available',
    ]);
  });
});
