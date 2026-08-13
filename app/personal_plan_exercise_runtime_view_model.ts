import type { PlanRuntimeChoice, PlanRuntimeItem } from './personal_plan_exercise_runtime';
import type { PlanRuntimeExerciseSession } from './personal_plan_exercise_runtime_session';
import { PERSONAL_PLAN_CATALOG } from './personal_plan_catalog';

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
  targetEs: string;
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
  lang?: string;
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

function isSpanishLang(lang: string | undefined): boolean {
  return lang === 'es';
}

function eyebrowFor(session: PlanRuntimeExerciseSession, lang?: string): string {
  // Display name comes from the catalog so a plan rename never leaves a stale
  // hardcoded label here; unknown ids fall back to the raw id.
  const planName = PERSONAL_PLAN_CATALOG.find((plan) => plan.id === session.block.planId)?.name
    ?? session.block.planId;
  if (isSpanishLang(lang)) return `${planName} · día ${session.block.dayIndex}`;
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
    targetEs: item.targetEs,
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

function feedbackFor(
  session: PlanRuntimeExerciseSession,
  lang?: string,
): PlanRuntimeExerciseFeedbackViewModel | undefined {
  if (session.openMissedPhraseIds.length === 0 || session.progress.completedAll) return undefined;

  if (isSpanishLang(lang)) {
    return {
      tone: 'recovery',
      title: 'La frase volverá una vez más',
      text: 'Seguimos. Al final de la ronda reforzaremos con calma lo que no salió a la primera.',
    };
  }

  return {
    tone: 'recovery',
    title: 'Фраза вернётся ещё раз',
    text: 'Идём дальше. В конце круга спокойно закрепим то, что не получилось с первого раза.',
  };
}

function completionFor(
  session: PlanRuntimeExerciseSession,
  lang?: string,
): PlanRuntimeExerciseCompletionViewModel | undefined {
  if (!session.progress.completedAll) return undefined;

  if (isSpanishLang(lang)) {
    return {
      title: 'Listo por hoy',
      text: 'Las frases del día están cerradas. Puedes volver a las tareas o practicar un poco más si quieres reforzarlas.',
      primaryActionLabel: 'A las tareas',
      secondaryActionLabel: 'Practicar más',
    };
  }

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
    viewModel.current?.targetEs,
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
  const spanish = isSpanishLang(options.lang);

  return {
    sessionId: session.id,
    blockId: session.block.id,
    title: spanish ? session.block.titleEs ?? session.block.title : session.block.title,
    eyebrow: eyebrowFor(session, options.lang),
    instruction: spanish
      ? session.currentItem?.promptEs ?? 'Ejercicio completado.'
      : session.currentItem?.promptRu ?? 'Задание выполнено.',
    selectedAnswer,
    canSubmit: Boolean(session.currentItem && selectedAnswer && !completed),
    completed,
    primaryActionLabel: completed
      ? (spanish ? 'Listo' : 'Готово')
      : (spanish ? 'Comprobar' : 'Проверить'),
    progress: {
      completed: session.progress.completed,
      total: session.progress.total,
      wrong: session.progress.wrong,
      percent: session.progress.percent,
      label: spanish
        ? `${session.progress.completed} de ${session.progress.total}`
        : `${session.progress.completed} из ${session.progress.total}`,
    },
    current,
    feedback: feedbackFor(session, options.lang),
    completion: completionFor(session, options.lang),
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
