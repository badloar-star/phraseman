import {
  PlanExerciseBlock,
} from './personal_plan_engine_contracts';
import {
  buildPlanExerciseRendererParams,
  PlanExerciseRendererParamsIssue,
  PlanExerciseRendererUnifiedParams,
} from './personal_plan_exercise_renderer_params_builder';

export type PlanDayOpenActionKind =
  | 'open_lesson_shell'
  | 'open_plan_renderer'
  | 'open_plan_quiz'
  | 'open_personal_practice'
  | 'open_plan_trainer'
  | 'open_plan_flashcards'
  | 'blocked';

export type PlanDayOpenActionBase = {
  kind: PlanDayOpenActionKind;
  blockId: string;
  type: PlanExerciseBlock['type'];
  title: string;
  estimatedMinutes: number;
};

export type PlanDayOpenLessonShellAction = PlanDayOpenActionBase & {
  kind: 'open_lesson_shell';
  params: PlanExerciseRendererUnifiedParams;
};

export type PlanDayOpenPlanRendererAction = PlanDayOpenActionBase & {
  kind: 'open_plan_renderer';
  params: PlanExerciseRendererUnifiedParams;
};

export type PlanDayOpenPlanQuizParams = {
  planQuizId: string;
  planTaskId: string;
  planInstanceId: string;
  planId: PlanExerciseBlock['planId'];
  planDayIndex: string;
  level: 'easy' | 'medium' | 'hard';
  questionCount: 10;
};

export type PlanDayOpenPlanQuizAction = PlanDayOpenActionBase & {
  kind: 'open_plan_quiz';
  params: PlanDayOpenPlanQuizParams;
};

export type PlanDayOpenPersonalPracticeParams = {
  planPracticeTask: '1';
  trainingId: string;
  requiredPhrases: string;
  requiredWords: string;
  planTaskId: string;
  planInstanceId: string;
  planId: PlanExerciseBlock['planId'];
  planDayIndex: string;
};

export type PlanDayOpenPersonalPracticeAction = PlanDayOpenActionBase & {
  kind: 'open_personal_practice';
  params: PlanDayOpenPersonalPracticeParams;
};

export type PlanDayOpenPlanTrainerParams = {
  mode: 'weak' | 'smart_mix' | 'hard';
  planTrainerTask: '1';
  requiredItems: string;
  planTaskId: string;
  planInstanceId: string;
  planId: PlanExerciseBlock['planId'];
  planDayIndex: string;
};

export type PlanDayOpenPlanTrainerAction = PlanDayOpenActionBase & {
  kind: 'open_plan_trainer';
  params: PlanDayOpenPlanTrainerParams;
};

export type PlanDayOpenPlanFlashcardsParams = {
  planFlashcardsTask: '1';
  source: string;
  requiredCards: string;
  planTaskId: string;
  planInstanceId: string;
  planId: PlanExerciseBlock['planId'];
  planDayIndex: string;
};

export type PlanDayOpenPlanFlashcardsAction = PlanDayOpenActionBase & {
  kind: 'open_plan_flashcards';
  params: PlanDayOpenPlanFlashcardsParams;
};

export type PlanDayBlockedAction = PlanDayOpenActionBase & {
  kind: 'blocked';
  issues: PlanDayOpenActionIssue[];
};

export type PlanDayOpenActionIssue =
  | PlanExerciseRendererParamsIssue
  | 'missing_plan_instance_id'
  | 'missing_plan_quiz_destination'
  | 'missing_plan_quiz_id'
  | 'invalid_plan_quiz_question_count'
  | 'missing_practice_destination'
  | 'missing_practice_training_id'
  | 'missing_practice_required_material'
  | 'missing_trainer_destination'
  | 'missing_plan_scoped_trainer_destination'
  | 'invalid_trainer_required_items'
  | 'missing_flashcards_destination'
  | 'missing_flashcards_source'
  | 'invalid_flashcards_required_cards';

export type PlanDayOpenAction =
  | PlanDayOpenLessonShellAction
  | PlanDayOpenPlanRendererAction
  | PlanDayOpenPlanQuizAction
  | PlanDayOpenPersonalPracticeAction
  | PlanDayOpenPlanTrainerAction
  | PlanDayOpenPlanFlashcardsAction
  | PlanDayBlockedAction;

export type PlanDayOpenActionsResult = {
  actions: PlanDayOpenAction[];
  hasBlockedActions: boolean;
  counts: {
    total: number;
    openLessonShell: number;
    openPlanRenderer: number;
    openPlanQuiz: number;
    openPersonalPractice: number;
    openPlanTrainer: number;
    openPlanFlashcards: number;
    blocked: number;
  };
};

function actionKindForBlock(
  block: PlanExerciseBlock,
): 'open_lesson_shell' | 'open_plan_renderer' | undefined {
  if (block.type === 'linked_lesson_slice' || block.type === 'plan_phrase_build') {
    return 'open_lesson_shell';
  }

  if (
    block.type === 'plan_missing_word'
    || block.type === 'plan_choose_natural_phrase'
    || block.type === 'plan_listen_choose'
    || block.type === 'plan_listen_build'
    || block.type === 'plan_pronunciation_repeat'
    || block.type === 'plan_phrase_recall'
  ) {
    return 'open_plan_renderer';
  }

  return undefined;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function safePositiveCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function buildPlanQuizAction(
  block: PlanExerciseBlock,
  planInstanceId: string,
): PlanDayOpenPlanQuizAction | PlanDayBlockedAction {
  const baseAction = {
    blockId: block.id,
    type: block.type,
    title: block.title,
    estimatedMinutes: block.estimatedMinutes,
  };
  const destination = block.destination;
  const issues: PlanDayOpenActionIssue[] = [];
  if (!hasText(planInstanceId)) issues.push('missing_plan_instance_id');
  if (destination?.type !== 'quiz') issues.push('missing_plan_quiz_destination');
  if (destination?.type === 'quiz' && !hasText(destination.quizId)) issues.push('missing_plan_quiz_id');
  if (destination?.type === 'quiz' && destination.questionCount !== 10) {
    issues.push('invalid_plan_quiz_question_count');
  }
  if (issues.length > 0 || destination?.type !== 'quiz') {
    return { ...baseAction, kind: 'blocked', issues };
  }
  return {
    ...baseAction,
    kind: 'open_plan_quiz',
    params: {
      planQuizId: destination.quizId.trim(),
      planTaskId: block.id,
      planInstanceId: planInstanceId.trim(),
      planId: block.planId,
      planDayIndex: String(block.dayIndex),
      level: destination.level,
      questionCount: 10,
    },
  };
}

function buildPersonalPracticeAction(
  block: PlanExerciseBlock,
  planInstanceId: string,
): PlanDayOpenPersonalPracticeAction | PlanDayBlockedAction {
  const baseAction = {
    blockId: block.id,
    type: block.type,
    title: block.title,
    estimatedMinutes: block.estimatedMinutes,
  };
  const destination = block.destination;
  const issues: PlanDayOpenActionIssue[] = [];

  if (!hasText(planInstanceId)) {
    issues.push('missing_plan_instance_id');
  }
  if (destination?.type !== 'practice') {
    issues.push('missing_practice_destination');
  }
  if (destination?.type === 'practice' && !hasText(destination.trainingId)) {
    issues.push('missing_practice_training_id');
  }

  const requiredPhrases = destination?.type === 'practice'
    ? safePositiveCount(destination.requiredPhrases)
    : 0;
  const requiredWords = destination?.type === 'practice'
    ? safePositiveCount(destination.requiredWords)
    : 0;
  if (requiredPhrases <= 0 && requiredWords <= 0) {
    issues.push('missing_practice_required_material');
  }

  if (issues.length > 0 || destination?.type !== 'practice') {
    return {
      ...baseAction,
      kind: 'blocked',
      issues,
    };
  }

  return {
    ...baseAction,
    kind: 'open_personal_practice',
    params: {
      planPracticeTask: '1',
      trainingId: destination.trainingId.trim(),
      requiredPhrases: String(requiredPhrases || 3),
      requiredWords: String(requiredWords || 5),
      planTaskId: block.id,
      planInstanceId: planInstanceId.trim(),
      planId: block.planId,
      planDayIndex: String(block.dayIndex),
    },
  };
}

function buildPlanTrainerAction(
  block: PlanExerciseBlock,
  planInstanceId: string,
): PlanDayOpenPlanTrainerAction | PlanDayBlockedAction {
  const baseAction = {
    blockId: block.id,
    type: block.type,
    title: block.title,
    estimatedMinutes: block.estimatedMinutes,
  };
  const destination = block.destination;
  const issues: PlanDayOpenActionIssue[] = [];

  if (!hasText(planInstanceId)) {
    issues.push('missing_plan_instance_id');
  }
  if (destination?.type !== 'trainer') {
    issues.push('missing_trainer_destination');
  }
  if (destination?.type === 'trainer' && !destination.planScoped) {
    issues.push('missing_plan_scoped_trainer_destination');
  }

  const requiredItems = destination?.type === 'trainer'
    ? safePositiveCount(destination.requiredItems)
    : 0;
  if (requiredItems <= 0) {
    issues.push('invalid_trainer_required_items');
  }

  if (issues.length > 0 || destination?.type !== 'trainer') {
    return {
      ...baseAction,
      kind: 'blocked',
      issues,
    };
  }

  return {
    ...baseAction,
    kind: 'open_plan_trainer',
    params: {
      mode: destination.mode,
      planTrainerTask: '1',
      requiredItems: String(requiredItems),
      planTaskId: block.id,
      planInstanceId: planInstanceId.trim(),
      planId: block.planId,
      planDayIndex: String(block.dayIndex),
    },
  };
}

function buildPlanFlashcardsAction(
  block: PlanExerciseBlock,
  planInstanceId: string,
): PlanDayOpenPlanFlashcardsAction | PlanDayBlockedAction {
  const baseAction = {
    blockId: block.id,
    type: block.type,
    title: block.title,
    estimatedMinutes: block.estimatedMinutes,
  };
  const destination = block.destination;
  const issues: PlanDayOpenActionIssue[] = [];

  if (!hasText(planInstanceId)) {
    issues.push('missing_plan_instance_id');
  }
  if (destination?.type !== 'flashcards') {
    issues.push('missing_flashcards_destination');
  }
  if (destination?.type === 'flashcards' && !hasText(destination.deckId)) {
    issues.push('missing_flashcards_source');
  }

  const requiredCards = destination?.type === 'flashcards'
    ? safePositiveCount(destination.requiredCards)
    : 0;
  if (requiredCards <= 0) {
    issues.push('invalid_flashcards_required_cards');
  }

  if (issues.length > 0 || destination?.type !== 'flashcards') {
    return {
      ...baseAction,
      kind: 'blocked',
      issues,
    };
  }

  return {
    ...baseAction,
    kind: 'open_plan_flashcards',
    params: {
      planFlashcardsTask: '1',
      source: destination.deckId.trim(),
      requiredCards: String(requiredCards),
      planTaskId: block.id,
      planInstanceId: planInstanceId.trim(),
      planId: block.planId,
      planDayIndex: String(block.dayIndex),
    },
  };
}

export function buildPlanDayOpenActions(
  blocks: PlanExerciseBlock[],
  planInstanceId: string,
): PlanDayOpenActionsResult {
  const actions: PlanDayOpenAction[] = blocks.map((block) => {
    if (block.type === 'plan_quiz') {
      return buildPlanQuizAction(block, planInstanceId);
    }
    if (block.type === 'personal_practice_seeded') {
      return buildPersonalPracticeAction(block, planInstanceId);
    }
    if (block.type === 'trainer_weak_spot') {
      return buildPlanTrainerAction(block, planInstanceId);
    }
    if (block.type === 'flashcards_plan_review') {
      return buildPlanFlashcardsAction(block, planInstanceId);
    }

    const rendererParamsResult = buildPlanExerciseRendererParams(
      block,
      planInstanceId,
    );
    const actionKind = actionKindForBlock(block);
    const baseAction = {
      blockId: block.id,
      type: block.type,
      title: block.title,
      estimatedMinutes: block.estimatedMinutes,
    };

    if (
      actionKind
      && rendererParamsResult.params
      && rendererParamsResult.issues.length === 0
    ) {
      return {
        ...baseAction,
        kind: actionKind,
        params: rendererParamsResult.params,
      };
    }

    return {
      ...baseAction,
      kind: 'blocked',
      issues: rendererParamsResult.issues,
    };
  });

  const openLessonShell = actions.filter(
    (action) => action.kind === 'open_lesson_shell',
  ).length;
  const openPlanRenderer = actions.filter(
    (action) => action.kind === 'open_plan_renderer',
  ).length;
  const openPlanQuiz = actions.filter(
    (action) => action.kind === 'open_plan_quiz',
  ).length;
  const openPersonalPractice = actions.filter(
    (action) => action.kind === 'open_personal_practice',
  ).length;
  const openPlanTrainer = actions.filter(
    (action) => action.kind === 'open_plan_trainer',
  ).length;
  const openPlanFlashcards = actions.filter(
    (action) => action.kind === 'open_plan_flashcards',
  ).length;
  const blocked = actions.filter((action) => action.kind === 'blocked').length;

  return {
    actions,
    hasBlockedActions: blocked > 0,
    counts: {
      total: actions.length,
      openLessonShell,
      openPlanRenderer,
      openPlanQuiz,
      openPersonalPractice,
      openPlanTrainer,
      openPlanFlashcards,
      blocked,
    },
  };
}
