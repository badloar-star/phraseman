import {
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanExerciseRendererParams,
} from '../app/personal_plan_exercise_renderer_params_builder';

function makeBlock(type: string, overrides: Partial<PlanExerciseBlock> = {}): PlanExerciseBlock {
  return {
    id: `block-${type}`,
    planId: 'harbor',
    dayIndex: 1,
    type,
    title: 'Test block',
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

describe('buildPlanExerciseRendererParams', () => {
  it('routes linked_lesson_slice blocks to the normal lesson-slice shell contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('linked_lesson_slice', {
        contentUnitIds: ['lesson1-phrase-1', 'lesson1-phrase-2'],
        progressPolicy: 'correct_only',
        destination: {
          type: 'lesson',
          lessonId: 1,
          requiredPhrases: 2,
          requiredPhraseIds: ['lesson1-phrase-1', 'lesson1-phrase-2'],
        },
      }),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        lessonShellMode: 'linked_lesson_slice',
        planPracticeMode: 'linked_lesson',
        planInstanceId: 'instance-1',
        blockId: 'block-linked_lesson_slice',
        lessonId: 1,
        requiredPhrases: 2,
        progressPolicy: 'correct_only',
        completionMode: 'required_correct_phrases',
      }),
    );
  });

  it('routes plan_phrase_build blocks to the lesson-shell contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_phrase_build'),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        lessonShellMode: 'plan_phrase_build',
        planInstanceId: 'instance-1',
        blockId: 'block-plan_phrase_build',
        allowCorrectWordHighlighting: false,
      }),
    );
  });

  it('routes plan_missing_word blocks to the missing-word contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_missing_word'),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        rendererType: 'plan_missing_word',
        answerKind: 'single_missing_word',
        planInstanceId: 'instance-1',
        blockId: 'block-plan_missing_word',
        allowCorrectWordHighlighting: false,
      }),
    );
  });

  it('routes plan_choose_natural_phrase blocks to the choice contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_choose_natural_phrase'),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        rendererType: 'plan_choose_natural_phrase',
        answerKind: 'single_choice',
        planInstanceId: 'instance-1',
        blockId: 'block-plan_choose_natural_phrase',
        allowCorrectWordHighlighting: false,
      }),
    );
  });

  it('routes plan_listen_choose blocks to the listening choice contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_listen_choose'),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        rendererType: 'plan_listen_choose',
        answerKind: 'audio_single_choice',
        planInstanceId: 'instance-1',
        blockId: 'block-plan_listen_choose',
        allowCorrectWordHighlighting: false,
      }),
    );
  });

  it('routes plan_listen_build blocks to the listening word-bank contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_listen_build'),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        rendererType: 'plan_listen_build',
        answerKind: 'audio_word_bank',
        planInstanceId: 'instance-1',
        blockId: 'block-plan_listen_build',
        allowCorrectWordHighlighting: false,
      }),
    );
  });

  it('routes plan_pronunciation_repeat blocks to the self-check pronunciation contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_pronunciation_repeat', {
        progressPolicy: 'completion_only',
        recoveryPolicy: 'none',
      }),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        rendererType: 'plan_pronunciation_repeat',
        answerKind: 'spoken_repeat_self_check',
        planInstanceId: 'instance-1',
        blockId: 'block-plan_pronunciation_repeat',
        allowCorrectWordHighlighting: false,
      }),
    );
  });

  it('routes plan_phrase_recall blocks to the typed recall contract', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_phrase_recall', {
        recoveryPolicy: 'return_wrong_to_recall',
      }),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        source: 'personal_plan',
        rendererType: 'plan_phrase_recall',
        answerKind: 'typed_phrase_recall',
        planInstanceId: 'instance-1',
        blockId: 'block-plan_phrase_recall',
        allowCorrectWordHighlighting: false,
      }),
    );
  });

  it('rejects exercise types that do not have a renderer contract yet', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_quiz'),
      'instance-1',
    );

    expect(result.params).toBeUndefined();
    expect(result.issues).toEqual(['missing_renderer_contract']);
  });

  it('preserves recovery and no-highlight rules from routed contracts', () => {
    const result = buildPlanExerciseRendererParams(
      makeBlock('plan_missing_word', {
        recoveryPolicy: 'none',
      }),
      'instance-1',
    );

    expect(result.issues).toEqual([]);
    expect(result.params).toEqual(
      expect.objectContaining({
        recoveryEnabled: false,
        allowCorrectWordHighlighting: false,
      }),
    );
  });
});
