import {
  submitPlanRuntimeAnswer,
  validatePlanRuntimeItem,
  type PlanRuntimeItem,
  type PlanRuntimeSubmissionResult,
} from './personal_plan_exercise_runtime';
import type { PlanExerciseBlock } from './personal_plan_engine_contracts';

export type PlanRuntimeExerciseSessionProgress = {
  total: number;
  completed: number;
  wrong: number;
  percent: number;
  completedAll: boolean;
};

export type PlanRuntimeExerciseSession = {
  id: string;
  planInstanceId: string;
  block: PlanExerciseBlock;
  items: PlanRuntimeItem[];
  cursor: number;
  currentItem?: PlanRuntimeItem;
  startedAt: string;
  attempts: PlanRuntimeSubmissionResult[];
  completedPhraseIds: string[];
  missedPhraseIds: string[];
  recoveredPhraseIds: string[];
  openMissedPhraseIds: string[];
  progress: PlanRuntimeExerciseSessionProgress;
};

export type StartPlanRuntimeExerciseSessionInput = {
  block: PlanExerciseBlock;
  items: PlanRuntimeItem[];
  planInstanceId: string;
  sessionId?: string;
  startedAt?: string;
};

export type SubmitPlanRuntimeSessionAnswerInput = {
  selectedAnswer?: string | null;
  occurredAt?: string;
};

export type PlanRuntimeExerciseSessionIssueCode =
  | 'missing_plan_instance_id'
  | 'empty_items'
  | 'invalid_item'
  | 'session_finished';

export type PlanRuntimeExerciseSessionIssue = {
  code: PlanRuntimeExerciseSessionIssueCode;
  detail: string;
};

export type StartPlanRuntimeExerciseSessionResult =
  | {
    status: 'ready';
    session: PlanRuntimeExerciseSession;
  }
  | {
    status: 'blocked';
    issue: PlanRuntimeExerciseSessionIssue;
  };

export type SubmitPlanRuntimeSessionAnswerResult =
  | {
    status: 'ready';
    submission: Extract<PlanRuntimeSubmissionResult, { status: 'ready' }>;
    session: PlanRuntimeExerciseSession;
  }
  | {
    status: 'blocked';
    issue: PlanRuntimeExerciseSessionIssue;
  };

function blocked(
  code: PlanRuntimeExerciseSessionIssueCode,
  detail: string,
): StartPlanRuntimeExerciseSessionResult {
  return {
    status: 'blocked',
    issue: { code, detail },
  };
}

function blockedSubmit(
  code: PlanRuntimeExerciseSessionIssueCode,
  detail: string,
): SubmitPlanRuntimeSessionAnswerResult {
  return {
    status: 'blocked',
    issue: { code, detail },
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function percent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function requiredPhraseIds(items: PlanRuntimeItem[]): string[] {
  return unique(items.map((item) => item.phraseId));
}

function progressFor(
  requiredIds: string[],
  completedPhraseIds: string[],
  wrong: number,
): PlanRuntimeExerciseSessionProgress {
  const completed = requiredIds.filter((id) => completedPhraseIds.includes(id)).length;

  return {
    total: requiredIds.length,
    completed,
    wrong,
    percent: percent(completed, requiredIds.length),
    completedAll: requiredIds.length > 0 && completed >= requiredIds.length,
  };
}

function currentItem(items: PlanRuntimeItem[], cursor: number): PlanRuntimeItem | undefined {
  return cursor >= 0 && cursor < items.length ? items[cursor] : undefined;
}

function rebuildSession(
  session: Omit<PlanRuntimeExerciseSession, 'currentItem' | 'progress'>,
): PlanRuntimeExerciseSession {
  const requiredIds = requiredPhraseIds(session.items);
  const wrong = session.attempts.filter((attempt) =>
    attempt.status === 'ready' && !attempt.isCorrect,
  ).length;

  return {
    ...session,
    currentItem: currentItem(session.items, session.cursor),
    progress: progressFor(requiredIds, session.completedPhraseIds, wrong),
  };
}

export function startPlanRuntimeExerciseSession(
  input: StartPlanRuntimeExerciseSessionInput,
): StartPlanRuntimeExerciseSessionResult {
  const planInstanceId = input.planInstanceId.trim();

  if (!planInstanceId) {
    return blocked('missing_plan_instance_id', 'Runtime session needs a planInstanceId.');
  }
  if (input.items.length === 0) {
    return blocked('empty_items', 'Runtime session needs at least one item.');
  }
  if (input.items.some((item) => validatePlanRuntimeItem(item, input.block).length > 0)) {
    return blocked('invalid_item', 'Runtime item failed validation before session start.');
  }

  return {
    status: 'ready',
    session: rebuildSession({
      id: input.sessionId || `${planInstanceId}:${input.block.id}`,
      planInstanceId,
      block: input.block,
      items: [...input.items],
      cursor: 0,
      startedAt: input.startedAt || new Date().toISOString(),
      attempts: [],
      completedPhraseIds: [],
      missedPhraseIds: [],
      recoveredPhraseIds: [],
      openMissedPhraseIds: [],
    }),
  };
}

export function submitPlanRuntimeSessionAnswer(
  session: PlanRuntimeExerciseSession,
  input: SubmitPlanRuntimeSessionAnswerInput,
): SubmitPlanRuntimeSessionAnswerResult {
  const item = session.currentItem;
  if (!item) {
    return blockedSubmit('session_finished', 'Runtime session has no current item.');
  }

  const submission = submitPlanRuntimeAnswer({
    block: session.block,
    item,
    selectedAnswer: input.selectedAnswer,
    planInstanceId: session.planInstanceId,
    occurredAt: input.occurredAt,
  });

  if (submission.status !== 'ready') {
    return {
      status: 'blocked',
      issue: {
        code: 'invalid_item',
        detail: submission.issue.detail,
      },
    };
  }

  const completedPhraseIds = submission.isCorrect
    ? unique([...session.completedPhraseIds, item.phraseId])
    : [...session.completedPhraseIds];
  const missedPhraseIds = submission.isCorrect
    ? [...session.missedPhraseIds]
    : unique([...session.missedPhraseIds, item.phraseId]);
  const recoveredPhraseIds = submission.isCorrect && session.missedPhraseIds.includes(item.phraseId)
    ? unique([...session.recoveredPhraseIds, item.phraseId])
    : [...session.recoveredPhraseIds];
  const openMissedPhraseIds = missedPhraseIds.filter((id) => !recoveredPhraseIds.includes(id));
  const items = submission.isCorrect || !item.errorsReturnLater
    ? [...session.items]
    : [...session.items, item];

  const nextSession = rebuildSession({
    ...session,
    items,
    cursor: session.cursor + 1,
    attempts: [...session.attempts, submission],
    completedPhraseIds,
    missedPhraseIds,
    recoveredPhraseIds,
    openMissedPhraseIds,
  });

  return {
    status: 'ready',
    submission,
    session: nextSession,
  };
}
