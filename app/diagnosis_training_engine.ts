import type {
  DiagnosisTraining,
  DiagnosisTrainingRuntimeState,
  DiagnosisTrainingStep,
  TriText,
} from './diagnosis_training_types';

export function createDiagnosisTrainingState(): DiagnosisTrainingRuntimeState {
  return {
    stepIndex: 0,
    correctCount: 0,
    correctStreak: 0,
    hadWrong: false,
    correctAfterWrong: false,
    mixedReviewPassed: false,
    depthByStep: {},
    failedItems: [],
    recoveredItems: [],
    attempts: [],
  };
}

export function getStepDepth(state: DiagnosisTrainingRuntimeState, step: DiagnosisTrainingStep): number {
  return Math.min(4, Math.max(1, state.depthByStep[step.id] ?? 1));
}

export function feedbackForAnswer(
  step: DiagnosisTrainingStep,
  optionId: string,
  depth: number,
): { correct: boolean; feedback: TriText; retryHint?: TriText } {
  const correct = optionId === step.correctAnswerId;
  if (correct) return { correct, feedback: step.correctFeedback };
  const retryHint = step.retryFeedback[Math.min(3, Math.max(0, depth - 1))] ?? step.fallbackExplanation;
  return {
    correct,
    feedback: step.wrongFeedbackByOption[optionId] ?? step.fallbackExplanation,
    retryHint,
  };
}

export function applyDiagnosisAnswer(
  training: DiagnosisTraining,
  state: DiagnosisTrainingRuntimeState,
  optionId: string,
): DiagnosisTrainingRuntimeState {
  const step = training.steps[state.stepIndex];
  if (!step) return state;
  const depth = getStepDepth(state, step);
  const correct = optionId === step.correctAnswerId;
  const failedItems = new Set(state.failedItems);
  const recoveredItems = new Set(state.recoveredItems);
  const nextDepthByStep = { ...state.depthByStep };

  if (correct) {
    if ((nextDepthByStep[step.id] ?? 1) > 1 || failedItems.has(step.id)) {
      recoveredItems.add(step.id);
    }
    nextDepthByStep[step.id] = 1;
  } else {
    failedItems.add(step.id);
    nextDepthByStep[step.id] = Math.min(4, depth + 1);
  }

  return {
    ...state,
    correctCount: state.correctCount + (correct ? 1 : 0),
    correctStreak: correct ? state.correctStreak + 1 : 0,
    hadWrong: state.hadWrong || !correct,
    correctAfterWrong: state.correctAfterWrong || (correct && (state.hadWrong || failedItems.has(step.id))),
    mixedReviewPassed: state.mixedReviewPassed || (correct && (step.difficulty === 'mixed' || step.difficulty === 'mixed_review')),
    depthByStep: nextDepthByStep,
    failedItems: [...failedItems],
    recoveredItems: [...recoveredItems],
    attempts: [
      ...state.attempts,
      { stepId: step.id, selectedOptionId: optionId, correct, depth },
    ],
  };
}

export function shouldAdvanceDiagnosisStep(
  training: DiagnosisTraining,
  state: DiagnosisTrainingRuntimeState,
  optionId: string,
): boolean {
  const step = training.steps[state.stepIndex];
  if (!step) return false;
  return optionId === step.correctAnswerId;
}

export function nextDiagnosisStepIndex(
  training: DiagnosisTraining,
  state: DiagnosisTrainingRuntimeState,
  optionId: string,
): number {
  if (!shouldAdvanceDiagnosisStep(training, state, optionId)) return state.stepIndex;
  return Math.min(training.steps.length - 1, state.stepIndex + 1);
}

export function isDiagnosisTrainingMastered(
  training: DiagnosisTraining,
  state: DiagnosisTrainingRuntimeState,
): boolean {
  const rules = training.masteryRules;
  if (state.correctCount < rules.minCorrect) return false;
  if (state.correctStreak < rules.minCorrectStreak) return false;
  if (rules.requireCorrectAfterWrong && !state.correctAfterWrong) return false;
  if (rules.requireMixedReview && !state.mixedReviewPassed) return false;
  return true;
}


