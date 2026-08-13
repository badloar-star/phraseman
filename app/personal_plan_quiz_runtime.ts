import type { PersonalPlanQuiz, PersonalPlanQuizQuestion } from './personal_plan_quiz_types';

export type PersonalPlanQuizAnswer = {
  correct: boolean;
  complete: false;
  explanation: string;
  questionIndex: number;
  choiceId: string;
  attemptNumber: number;
};

/** Holds a correct answer on its prompt until the user explicitly continues. */
export function createPersonalPlanQuizRun(quiz: PersonalPlanQuiz, initialIndex = 0, initialAttemptSequence = 0) {
  let index = Math.max(0, Math.min(quiz.questions.length - 1, initialIndex));
  let complete = false;
  let pendingCorrect = false;
  let attempts = Math.max(0, Math.floor(initialAttemptSequence));

  return {
    currentQuestion: (): PersonalPlanQuizQuestion => quiz.questions[index],
    isComplete: () => complete,
    attemptSequence: () => attempts,
    answer: (choiceId: string): PersonalPlanQuizAnswer | null => {
      if (complete || pendingCorrect) return null;
      const choice = quiz.questions[index].choices.find((item) => item.id === choiceId);
      if (!choice) return null;
      attempts += 1;
      pendingCorrect = choice.isCorrect;
      return {
        correct: choice.isCorrect,
        complete: false,
        explanation: choice.explanation,
        questionIndex: index,
        choiceId,
        attemptNumber: attempts,
      };
    },
    continueAfterFeedback: (): { complete: boolean; questionIndex: number } | null => {
      if (!pendingCorrect || complete) return null;
      pendingCorrect = false;
      if (index + 1 === quiz.questions.length) {
        complete = true;
        return { complete: true, questionIndex: index };
      }
      index += 1;
      return { complete: false, questionIndex: index };
    },
  };
}
