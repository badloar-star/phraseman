import {
  PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import {
  buildPlanDayOpenActions,
} from '../app/personal_plan_day_open_actions';

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

describe('buildPlanDayOpenActions', () => {
  it('turns linked lesson slices into normal lesson shell actions', () => {
    const result = buildPlanDayOpenActions(
      [
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
      ],
      'instance-1',
    );

    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'open_lesson_shell',
        blockId: 'block-linked_lesson_slice',
        type: 'linked_lesson_slice',
        params: expect.objectContaining({
          lessonShellMode: 'linked_lesson_slice',
          lessonId: 1,
          requiredPhrases: 2,
          completionMode: 'required_correct_phrases',
        }),
      }),
    ]);
    expect(result.counts).toEqual({
      total: 1,
      openLessonShell: 1,
      openPlanRenderer: 0,
      openPlanQuiz: 0,
      openPersonalPractice: 0,
      openPlanTrainer: 0,
      openPlanFlashcards: 0,
      blocked: 0,
    });
  });

  it('turns phrase-build blocks into lesson shell actions', () => {
    const result = buildPlanDayOpenActions(
      [makeBlock('plan_phrase_build')],
      'instance-1',
    );

    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'open_lesson_shell',
        blockId: 'block-plan_phrase_build',
        type: 'plan_phrase_build',
        title: 'Task plan_phrase_build',
        estimatedMinutes: 5,
        params: expect.objectContaining({
          lessonShellMode: 'plan_phrase_build',
          allowCorrectWordHighlighting: false,
        }),
      }),
    ]);
    expect(result.counts).toEqual({
      total: 1,
      openLessonShell: 1,
      openPlanRenderer: 0,
      openPlanQuiz: 0,
      openPersonalPractice: 0,
      openPlanTrainer: 0,
      openPlanFlashcards: 0,
      blocked: 0,
    });
  });

  it('turns missing-word, choice, listening, pronunciation, and recall blocks into plan renderer actions', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('plan_missing_word'),
        makeBlock('plan_choose_natural_phrase'),
        makeBlock('plan_listen_choose'),
        makeBlock('plan_listen_build', {
          recoveryPolicy: 'return_wrong_to_recall',
        }),
        makeBlock('plan_pronunciation_repeat', {
          progressPolicy: 'completion_only',
          recoveryPolicy: 'none',
        }),
        makeBlock('plan_phrase_recall', {
          recoveryPolicy: 'return_wrong_to_recall',
        }),
      ],
      'instance-1',
    );

    expect(result.actions.map((action) => action.kind)).toEqual([
      'open_plan_renderer',
      'open_plan_renderer',
      'open_plan_renderer',
      'open_plan_renderer',
      'open_plan_renderer',
      'open_plan_renderer',
    ]);
    expect(result.actions).toEqual([
      expect.objectContaining({
        blockId: 'block-plan_missing_word',
        params: expect.objectContaining({
          rendererType: 'plan_missing_word',
          allowCorrectWordHighlighting: false,
        }),
      }),
      expect.objectContaining({
        blockId: 'block-plan_choose_natural_phrase',
        params: expect.objectContaining({
          rendererType: 'plan_choose_natural_phrase',
          allowCorrectWordHighlighting: false,
        }),
      }),
      expect.objectContaining({
        blockId: 'block-plan_listen_choose',
        params: expect.objectContaining({
          rendererType: 'plan_listen_choose',
          answerKind: 'audio_single_choice',
          allowCorrectWordHighlighting: false,
        }),
      }),
      expect.objectContaining({
        blockId: 'block-plan_listen_build',
        params: expect.objectContaining({
          rendererType: 'plan_listen_build',
          answerKind: 'audio_word_bank',
          allowCorrectWordHighlighting: false,
        }),
      }),
      expect.objectContaining({
        blockId: 'block-plan_pronunciation_repeat',
        params: expect.objectContaining({
          rendererType: 'plan_pronunciation_repeat',
          answerKind: 'spoken_repeat_self_check',
          allowCorrectWordHighlighting: false,
        }),
      }),
      expect.objectContaining({
        blockId: 'block-plan_phrase_recall',
        params: expect.objectContaining({
          rendererType: 'plan_phrase_recall',
          answerKind: 'typed_phrase_recall',
          allowCorrectWordHighlighting: false,
        }),
      }),
    ]);
    expect(result.counts).toEqual({
      total: 6,
      openLessonShell: 0,
      openPlanRenderer: 6,
      openPlanQuiz: 0,
      openPersonalPractice: 0,
      openPlanTrainer: 0,
      openPlanFlashcards: 0,
      blocked: 0,
    });
  });

  it('turns plan quiz blocks into dedicated quiz route actions', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('plan_quiz', {
          id: 'gavan-d1-quiz',
          planId: 'gavan',
          dayIndex: 1,
          contentUnitIds: ['quiz:gavan_day1_short_replies_quiz'],
          destination: {
            type: 'quiz',
            quizId: 'gavan_day1_short_replies_quiz',
            questionCount: 10,
            level: 'easy',
          },
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(false);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'open_plan_quiz',
        blockId: 'gavan-d1-quiz',
        type: 'plan_quiz',
        params: {
          planQuizId: 'gavan_day1_short_replies_quiz',
          planTaskId: 'gavan-d1-quiz',
          planInstanceId: 'instance-1',
          planId: 'gavan',
          planDayIndex: '1',
          level: 'easy',
          questionCount: 10,
        },
      }),
    ]);
    expect(result.counts).toEqual({
      total: 1,
      openLessonShell: 0,
      openPlanRenderer: 0,
      openPlanQuiz: 1,
      openPersonalPractice: 0,
      openPlanTrainer: 0,
      openPlanFlashcards: 0,
      blocked: 0,
    });
  });

  it('blocks plan quiz blocks without a dedicated 10-question quiz destination', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('plan_quiz', {
          id: 'bad-quiz',
          destination: {
            type: 'quiz',
            quizId: 'gavan_day1_short_replies_quiz',
            questionCount: 8,
            level: 'easy',
          } as any,
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(true);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'blocked',
        blockId: 'bad-quiz',
        type: 'plan_quiz',
        issues: ['invalid_plan_quiz_question_count'],
      }),
    ]);
  });

  it('turns seeded personal practice blocks into dedicated review route actions', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('personal_practice_seeded', {
          id: 'practice-1',
          planId: 'gavan',
          dayIndex: 2,
          contentUnitIds: ['practice:gavan_due_review'],
          destination: {
            type: 'practice',
            trainingId: 'gavan_due_review',
            requiredPhrases: 3,
            requiredWords: 5,
          },
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(false);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'open_personal_practice',
        blockId: 'practice-1',
        type: 'personal_practice_seeded',
        params: {
          planPracticeTask: '1',
          trainingId: 'gavan_due_review',
          requiredPhrases: '3',
          requiredWords: '5',
          planTaskId: 'practice-1',
          planInstanceId: 'instance-1',
          planId: 'gavan',
          planDayIndex: '2',
        },
      }),
    ]);
    expect(result.counts).toEqual({
      total: 1,
      openLessonShell: 0,
      openPlanRenderer: 0,
      openPlanQuiz: 0,
      openPersonalPractice: 1,
      openPlanTrainer: 0,
      openPlanFlashcards: 0,
      blocked: 0,
    });
  });

  it('blocks seeded personal practice blocks without real review requirements', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('personal_practice_seeded', {
          id: 'bad-practice',
          destination: {
            type: 'practice',
            trainingId: '',
            requiredPhrases: 0,
            requiredWords: 0,
          },
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(true);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'blocked',
        blockId: 'bad-practice',
        type: 'personal_practice_seeded',
        issues: ['missing_practice_training_id', 'missing_practice_required_material'],
      }),
    ]);
  });

  it('turns trainer weak-spot blocks into dedicated smart trainer route actions', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('trainer_weak_spot', {
          id: 'trainer-1',
          planId: 'gavan',
          dayIndex: 3,
          contentUnitIds: ['trainer:weak'],
          destination: {
            type: 'trainer',
            mode: 'weak',
            requiredItems: 2,
            planScoped: true,
          },
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(false);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'open_plan_trainer',
        blockId: 'trainer-1',
        type: 'trainer_weak_spot',
        params: {
          mode: 'weak',
          planTrainerTask: '1',
          requiredItems: '2',
          planTaskId: 'trainer-1',
          planInstanceId: 'instance-1',
          planId: 'gavan',
          planDayIndex: '3',
        },
      }),
    ]);
    expect(result.counts).toEqual({
      total: 1,
      openLessonShell: 0,
      openPlanRenderer: 0,
      openPlanQuiz: 0,
      openPersonalPractice: 0,
      openPlanTrainer: 1,
      openPlanFlashcards: 0,
      blocked: 0,
    });
  });

  it('turns flashcard review blocks into dedicated swipe route actions', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('flashcards_plan_review', {
          id: 'cards-1',
          planId: 'gavan',
          dayIndex: 4,
          contentUnitIds: ['flashcards:saved:all'],
          destination: {
            type: 'flashcards',
            deckId: 'saved:all',
            requiredCards: 4,
          },
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(false);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'open_plan_flashcards',
        blockId: 'cards-1',
        type: 'flashcards_plan_review',
        params: {
          planFlashcardsTask: '1',
          source: 'saved:all',
          requiredCards: '4',
          planTaskId: 'cards-1',
          planInstanceId: 'instance-1',
          planId: 'gavan',
          planDayIndex: '4',
        },
      }),
    ]);
    expect(result.counts).toEqual({
      total: 1,
      openLessonShell: 0,
      openPlanRenderer: 0,
      openPlanQuiz: 0,
      openPersonalPractice: 0,
      openPlanTrainer: 0,
      openPlanFlashcards: 1,
      blocked: 0,
    });
  });

  it('blocks flashcard review blocks without real card requirements', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('flashcards_plan_review', {
          id: 'bad-cards',
          destination: {
            type: 'flashcards',
            deckId: '',
            requiredCards: 0,
          },
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(true);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'blocked',
        blockId: 'bad-cards',
        type: 'flashcards_plan_review',
        issues: ['missing_flashcards_source', 'invalid_flashcards_required_cards'],
      }),
    ]);
  });

  it('blocks trainer weak-spot blocks without plan-scoped trainer requirements', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('trainer_weak_spot', {
          id: 'bad-trainer',
          destination: {
            type: 'trainer',
            mode: 'weak',
            requiredItems: 0,
            planScoped: false,
          },
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(true);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'blocked',
        blockId: 'bad-trainer',
        type: 'trainer_weak_spot',
        issues: ['missing_plan_scoped_trainer_destination', 'invalid_trainer_required_items'],
      }),
    ]);
  });

  it('turns unsupported block types into blocked actions', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('active_recall', {
          id: 'speak-1',
        }),
      ],
      'instance-1',
    );

    expect(result.hasBlockedActions).toBe(true);
    expect(result.actions).toEqual([
      expect.objectContaining({
        kind: 'blocked',
        blockId: 'speak-1',
        type: 'active_recall',
        issues: ['missing_renderer_contract'],
      }),
    ]);
  });

  it('keeps the same order as the original day blocks', () => {
    const result = buildPlanDayOpenActions(
      [
        makeBlock('plan_missing_word', {
          id: 'first',
        }),
        makeBlock('plan_phrase_recall', {
          id: 'second',
          recoveryPolicy: 'return_wrong_to_recall',
        }),
        makeBlock('plan_phrase_build', {
          id: 'third',
        }),
        makeBlock('linked_lesson_slice', {
          id: 'third-b',
          contentUnitIds: ['lesson1-phrase-1'],
          progressPolicy: 'correct_only',
          destination: {
            type: 'lesson',
            lessonId: 1,
            requiredPhrases: 1,
            requiredPhraseIds: ['lesson1-phrase-1'],
          },
        }),
        makeBlock('plan_choose_natural_phrase', {
          id: 'fourth',
        }),
      ],
      'instance-1',
    );

    expect(result.actions.map((action) => action.blockId)).toEqual([
      'first',
      'second',
      'third',
      'third-b',
      'fourth',
    ]);
    expect(result.actions.map((action) => action.kind)).toEqual([
      'open_plan_renderer',
      'open_plan_renderer',
      'open_lesson_shell',
      'open_lesson_shell',
      'open_plan_renderer',
    ]);
  });
});
