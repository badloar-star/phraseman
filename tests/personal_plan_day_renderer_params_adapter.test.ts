import {
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanDayRendererParams,
} from '../app/personal_plan_day_renderer_params_adapter';

function makeBlock(type: string, overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: `block-${type}`,
    planId: 'harbor',
    dayIndex: 1,
    type,
    title: 'Readable task',
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

describe('buildPlanDayRendererParams', () => {
  it('marks supported exercise renderer types as openable', () => {
    const result = buildPlanDayRendererParams(
      [
        makeBlock('plan_phrase_build'),
        makeBlock('plan_missing_word'),
        makeBlock('plan_choose_natural_phrase'),
        makeBlock('plan_listen_choose'),
      ],
      'instance-1',
    );

    expect(result.hasBlockingIssues).toBe(false);
    expect(result.counts).toEqual({
      totalBlocks: 4,
      openableBlocks: 4,
      blockedBlocks: 0,
    });
    expect(result.openableBlocks.map((item) => item.type)).toEqual([
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
    ]);
  });

  it('keeps unsupported future renderers blocked with block diagnostics while listen choose is openable', () => {
    const result = buildPlanDayRendererParams(
      [
        makeBlock('plan_phrase_build'),
        makeBlock('plan_listen_choose', {
          id: 'listen-1',
        }),
        makeBlock('plan_pronunciation', {
          id: 'pronunciation-1',
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockingIssues).toBe(true);
    expect(result.counts).toEqual({
      totalBlocks: 3,
      openableBlocks: 2,
      blockedBlocks: 1,
    });
    expect(result.blockedBlocks).toEqual([
      expect.objectContaining({
        blockId: 'pronunciation-1',
        type: 'plan_pronunciation',
        issues: ['missing_renderer_contract'],
      }),
    ]);
    expect(result.openableBlocks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        blockId: 'listen-1',
        type: 'plan_listen_choose',
      }),
    ]));
  });

  it('returns an empty stable result for an empty day', () => {
    const result = buildPlanDayRendererParams([], 'instance-1');

    expect(result).toEqual({
      openableBlocks: [],
      blockedBlocks: [],
      hasBlockingIssues: false,
      counts: {
        totalBlocks: 0,
        openableBlocks: 0,
        blockedBlocks: 0,
      },
    });
  });

  it('preserves no correct-word highlighting inside openable params', () => {
    const result = buildPlanDayRendererParams(
      [
        makeBlock('plan_phrase_build'),
        makeBlock('plan_missing_word'),
        makeBlock('plan_choose_natural_phrase'),
        makeBlock('plan_listen_choose'),
      ],
      'instance-1',
    );

    expect(result.openableBlocks).toHaveLength(4);
    for (const openableBlock of result.openableBlocks) {
      expect(openableBlock.params).toEqual(
        expect.objectContaining({
          allowCorrectWordHighlighting: false,
        }),
      );
    }
  });
});
