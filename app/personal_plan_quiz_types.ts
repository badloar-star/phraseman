/**
 * Runtime quiz draft types for personal-plan exercises.
 *
 * These were originally defined inside the (now removed) gavan-day1 authoring scaffold.
 * The live attempt-event and explanation-card adapters only need these shapes, so they
 * live here as a small runtime-owned type module independent of any authoring pipeline.
 */

export type PlanQuizSkill =
  | 'meaning'
  | 'natural_choice'
  | 'missing_word'
  | 'micro_context';

export type PlanQuizExplanationRequirement = {
  id: string;
  trigger: 'correct' | 'wrong';
  target: string;
  requiresSelectedAnswerKnown: boolean;
  note: string;
};

export type PlanQuizChoiceDraft = {
  id: string;
  text: string;
  isCorrect: boolean;
  explanationRequirement?: PlanQuizExplanationRequirement;
};

export type PlanQuizItemDraft = {
  id: string;
  sourcePhraseId: string;
  skill: PlanQuizSkill;
  prompt: string;
  choices: PlanQuizChoiceDraft[];
};

export type PlanQuizDraft = {
  id: string;
  items: PlanQuizItemDraft[];
};

/**
 * A minimal, well-formed quiz draft for tests and as a runtime reference shape.
 * Each item has one correct and one wrong choice, both with explanation requirements.
 */
export function buildSampleQuizDraft(): PlanQuizDraft {
  return {
    id: 'sample-quiz-draft',
    items: [
      {
        id: 'sample-quiz-item-1',
        sourcePhraseId: 'sample-phrase-1',
        skill: 'meaning',
        prompt: "What does \"I'm here\" mean?",
        choices: [
          {
            id: 'sample-quiz-item-1-correct',
            text: 'Я здесь',
            isCorrect: true,
            explanationRequirement: {
              id: 'sample-quiz-item-1-correct-note',
              trigger: 'correct',
              target: "I'm here",
              requiresSelectedAnswerKnown: false,
              note: 'Коротко подтверждаешь, что ты на месте.',
            },
          },
          {
            id: 'sample-quiz-item-1-wrong',
            text: 'Я готов',
            isCorrect: false,
            explanationRequirement: {
              id: 'sample-quiz-item-1-wrong-note',
              trigger: 'wrong',
              target: "I'm here",
              requiresSelectedAnswerKnown: true,
              note: '«Я готов» — это I\'m ready, другая фраза.',
            },
          },
        ],
      },
    ],
  };
}
