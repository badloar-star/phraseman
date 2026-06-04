import type { PlanRuntimeChoice, PlanRuntimeItem } from './personal_plan_exercise_runtime';
import type { PlanRuntimeExerciseSession } from './personal_plan_exercise_runtime_session';

export type PlanRuntimeExerciseViewModelIssue =
  | 'technical_copy'
  | 'corrupted_copy'
  | 'missing_title'
  | 'missing_instruction'
  | 'missing_current_item';

export type PlanRuntimeChoiceViewModel = {
  id: string;
  text: string;
  selected: boolean;
  disabled: boolean;
};

export type PlanRuntimeCurrentItemViewModel = {
  itemId: string;
  exerciseType: PlanRuntimeItem['exerciseType'];
  targetRu: string;
  displayEnglish: string;
  choices: PlanRuntimeChoiceViewModel[];
  freeInputExpected: boolean;
  tileInputExpected: boolean;
  wordTiles: string[];
  distractorTiles: string[];
  targetTokenCount: number;
  hintsEnabled: false;
  correctWordHighlighting: false;
};

export type PlanRuntimeExerciseProgressViewModel = {
  completed: number;
  total: number;
  wrong: number;
  percent: number;
  label: string;
};

export type PlanRuntimeExerciseFeedbackViewModel = {
  tone: 'recovery';
  title: string;
  text: string;
};

export type PlanRuntimeExerciseCompletionViewModel = {
  title: string;
  text: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

export type BuildPlanRuntimeExerciseViewModelOptions = {
  selectedAnswer?: string | null;
};

export type PlanRuntimeExerciseViewModel = {
  sessionId: string;
  blockId: string;
  title: string;
  eyebrow: string;
  instruction: string;
  selectedAnswer?: string;
  canSubmit: boolean;
  completed: boolean;
  primaryActionLabel: string;
  progress: PlanRuntimeExerciseProgressViewModel;
  current?: PlanRuntimeCurrentItemViewModel;
  feedback?: PlanRuntimeExerciseFeedbackViewModel;
  completion?: PlanRuntimeExerciseCompletionViewModel;
};

const TECHNICAL_COPY_RE = /\b(?:dev|debug|draft|placeholder|renderer|route|sourcePhraseId|contentUnit)\b/i;
const CORRUPTED_COPY_RE = /[ÃÂÐÑâ]/;

function cleanSelectedAnswer(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function eyebrowFor(session: PlanRuntimeExerciseSession): string {
  const planName = session.block.planId === 'gavan' ? 'Гавань' : session.block.planId;
  return `${planName} · день ${session.block.dayIndex}`;
}

function choiceViewModel(
  choice: PlanRuntimeChoice,
  selectedAnswer: string | undefined,
  disabled: boolean,
): PlanRuntimeChoiceViewModel {
  return {
    id: choice.id,
    text: choice.text,
    selected: selectedAnswer === choice.text,
    disabled,
  };
}

function currentItemViewModel(
  item: PlanRuntimeItem | undefined,
  selectedAnswer: string | undefined,
  completed: boolean,
): PlanRuntimeCurrentItemViewModel | undefined {
  if (!item) return undefined;

  return {
    itemId: item.id,
    exerciseType: item.exerciseType,
    targetRu: item.targetRu,
    displayEnglish: item.displayEnglish,
    choices: item.choices.map((choice) => choiceViewModel(choice, selectedAnswer, completed)),
    freeInputExpected: item.exerciseType === 'plan_phrase_recall',
    tileInputExpected: item.exerciseType === 'plan_phrase_build',
    wordTiles: item.wordTiles ?? [],
    distractorTiles: item.distractorTiles ?? [],
    targetTokenCount: item.targetTokenCount ?? 0,
    hintsEnabled: item.hintsEnabled,
    correctWordHighlighting: item.correctWordHighlighting,
  };
}

function feedbackFor(session: PlanRuntimeExerciseSession): PlanRuntimeExerciseFeedbackViewModel | undefined {
  if (session.openMissedPhraseIds.length === 0 || session.progress.completedAll) return undefined;

  return {
    tone: 'recovery',
    title: 'Фраза вернётся ещё раз',
    text: 'Идём дальше. В конце круга спокойно закрепим то, что не получилось с первого раза.',
  };
}

function completionFor(session: PlanRuntimeExerciseSession): PlanRuntimeExerciseCompletionViewModel | undefined {
  if (!session.progress.completedAll) return undefined;

  return {
    title: 'Готово на сегодня',
    text: 'Фразы дня закрыты. Можно вернуться к заданиям или потренироваться ещё, если хочется закрепить.',
    primaryActionLabel: 'К заданиям',
    secondaryActionLabel: 'Ещё потренироваться',
  };
}

function viewModelCopy(viewModel: PlanRuntimeExerciseViewModel): string {
  return [
    viewModel.title,
    viewModel.eyebrow,
    viewModel.instruction,
    viewModel.primaryActionLabel,
    viewModel.selectedAnswer,
    viewModel.progress.label,
    viewModel.current?.targetRu,
    viewModel.current?.displayEnglish,
    ...(viewModel.current?.choices.map((choice) => choice.text) ?? []),
    ...(viewModel.current?.wordTiles ?? []),
    ...(viewModel.current?.distractorTiles ?? []),
    viewModel.feedback?.title,
    viewModel.feedback?.text,
    viewModel.completion?.title,
    viewModel.completion?.text,
    viewModel.completion?.primaryActionLabel,
    viewModel.completion?.secondaryActionLabel,
  ].filter(Boolean).join(' ');
}

export function buildPlanRuntimeExerciseViewModel(
  session: PlanRuntimeExerciseSession,
  options: BuildPlanRuntimeExerciseViewModelOptions = {},
): PlanRuntimeExerciseViewModel {
  const selectedAnswer = cleanSelectedAnswer(options.selectedAnswer);
  const completed = session.progress.completedAll;
  const current = currentItemViewModel(session.currentItem, selectedAnswer, completed);

  return {
    sessionId: session.id,
    blockId: session.block.id,
    title: session.block.title,
    eyebrow: eyebrowFor(session),
    instruction: session.currentItem?.promptRu ?? 'Задание выполнено.',
    selectedAnswer,
    canSubmit: Boolean(session.currentItem && selectedAnswer && !completed),
    completed,
    primaryActionLabel: completed ? 'Готово' : 'Проверить',
    progress: {
      completed: session.progress.completed,
      total: session.progress.total,
      wrong: session.progress.wrong,
      percent: session.progress.percent,
      label: `${session.progress.completed} из ${session.progress.total}`,
    },
    current,
    feedback: feedbackFor(session),
    completion: completionFor(session),
  };
}

export function validatePlanRuntimeExerciseViewModel(
  viewModel: PlanRuntimeExerciseViewModel,
): PlanRuntimeExerciseViewModelIssue[] {
  const issues: PlanRuntimeExerciseViewModelIssue[] = [];

  if (!viewModel.title.trim()) issues.push('missing_title');
  if (!viewModel.instruction.trim()) issues.push('missing_instruction');
  if (!viewModel.completed && !viewModel.current) issues.push('missing_current_item');

  const copy = viewModelCopy(viewModel);
  if (TECHNICAL_COPY_RE.test(copy)) issues.push('technical_copy');
  if (CORRUPTED_COPY_RE.test(copy)) issues.push('corrupted_copy');

  return [...new Set(issues)];
}
