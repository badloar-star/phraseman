import {
  canonicalJsonV1,
  sha256Utf8,
} from '../learning-v2/policies/decision_registry';
import { buildMistakeExercise, type MistakeExercise } from './exercise_builders';
import {
  chooseMistakeExerciseMode,
  MISTAKE_EXERCISE_MODE_REGISTRY,
  type MistakeExerciseCapabilities,
  type MistakeExerciseMode,
  type MistakeExerciseSupport,
} from './exercise_mode_registry';
import type { MistakeFacet } from './contracts';
import type { MistakeProjectionItem } from './projection';
import { planFailureRequeue, selectMistakesForSession, type FailureRequeuePlan } from './scheduler';

export type MistakePracticeLength = '5' | '10' | '15' | 'all';

export interface MistakePracticeLengthOption {
  readonly id: MistakePracticeLength;
  readonly count: number;
  readonly enabled: boolean;
}

export interface MistakePracticeSessionEntry {
  readonly mistakeId: string;
  readonly cycleId: string;
  readonly facet: MistakeFacet;
  readonly support: MistakeExerciseSupport;
  readonly exercise: MistakeExercise;
}

export interface MistakePracticeSession {
  readonly version: 1;
  readonly sessionId: string;
  readonly startedAtMs: number;
  readonly initialCount: number;
  readonly cursor: number;
  readonly queue: readonly MistakePracticeSessionEntry[];
  readonly failureCounts: Readonly<Record<string, number>>;
  readonly answeredAttemptIds: readonly string[];
}

export function mistakePracticeLengthOptions(
  rawAvailable: number,
): readonly MistakePracticeLengthOption[] {
  const available = Number.isFinite(rawAvailable)
    ? Math.max(0, Math.floor(rawAvailable))
    : 0;
  return Object.freeze([
    Object.freeze({ id: '5', count: 5, enabled: available >= 5 }),
    Object.freeze({ id: '10', count: 10, enabled: available >= 10 }),
    Object.freeze({ id: '15', count: 15, enabled: available >= 15 }),
    Object.freeze({ id: 'all', count: Math.min(30, available), enabled: available >= 5 }),
  ]);
}

const stageFor = (item: MistakeProjectionItem): MistakeExerciseSupport => {
  if ((item.supportPassCount ?? 0) === 0) return 'recognition';
  if ((item.supportPassCount ?? 0) === 1) return 'guided';
  return 'production';
};

const capabilitiesFor = (item: MistakeProjectionItem): MistakeExerciseCapabilities => ({
  hasMeaningDistractors: (item.distractors?.length ?? 0) > 0,
  hasTokenDistractors: (item.distractors?.length ?? 0) > 0,
  hasOddityCandidates: (item.distractors?.length ?? 0) > 0,
  supportsTyping: true,
  hasAudio: !!item.audioRef,
  supportsSpeech: item.facet === 'pronunciation' || !!item.audioRef,
  tokenCount: item.tokens?.length ?? item.canonicalTarget.split(/\s+/).length,
});

const countFor = (
  requested: MistakePracticeLength,
  available: number,
): number => requested === 'all' ? Math.min(30, available) : Number(requested);

export function buildMistakePracticeSession(input: {
  readonly items: readonly MistakeProjectionItem[];
  readonly requestedLength: MistakePracticeLength;
  readonly nowMs: number;
  /** Direct handoff from a correction card: practice exactly this mistake. */
  readonly focusMistakeId?: string;
}): MistakePracticeSession {
  const focusMistakeId = input.focusMistakeId?.trim() ?? '';
  const ready = selectMistakesForSession(
    focusMistakeId
      ? input.items.filter((item) => item.mistakeId === focusMistakeId)
      : input.items,
    {
      nowMs: input.nowMs,
      limit: focusMistakeId ? 1 : 30,
    },
  );
  if (focusMistakeId && ready.length !== 1) {
    throw new Error('mistake_practice_focus_unavailable');
  }
  if (!focusMistakeId && ready.length < 5) {
    throw new Error('mistake_practice_minimum_five_required');
  }
  const count = focusMistakeId ? 1 : countFor(input.requestedLength, ready.length);
  if (!focusMistakeId && (count > ready.length || count < 5)) {
    throw new Error('mistake_practice_length_unavailable');
  }

  const recentModes: MistakeExerciseMode[] = [];
  const queue = ready.slice(0, count).map((item) => {
    const mode: MistakeExerciseMode = chooseMistakeExerciseMode({
      facet: item.facet,
      capabilities: capabilitiesFor(item),
      stage: stageFor(item),
      recentModes,
    });
    recentModes.push(mode);
    return Object.freeze({
      mistakeId: item.mistakeId,
      cycleId: item.cycleId,
      facet: item.facet,
      support: MISTAKE_EXERCISE_MODE_REGISTRY[mode].support,
      exercise: buildMistakeExercise({
        mistakeId: item.mistakeId,
        mode,
        canonicalTarget: item.canonicalTarget,
        sourceMeaning: item.sourceMeaning ?? undefined,
        tokens: item.tokens,
        distractors: item.distractors,
        audioRef: item.audioRef ?? undefined,
        tokenIndex: item.tokenIndex ?? undefined,
        expected: item.expected ?? undefined,
      }),
    });
  });
  const sessionId = `mistake-session:v1:${sha256Utf8(canonicalJsonV1({
    mistakeIds: queue.map((entry) => entry.mistakeId),
    focusMistakeId: focusMistakeId || null,
    requestedLength: input.requestedLength,
    startedAtMs: input.nowMs,
  }))}`;
  return Object.freeze({
    version: 1,
    sessionId,
    startedAtMs: input.nowMs,
    initialCount: count,
    cursor: 0,
    queue: Object.freeze(queue),
    failureCounts: Object.freeze({}),
    answeredAttemptIds: Object.freeze([]),
  });
}

export type MistakeSessionAdvanceResult = Readonly<{
  kind: 'advanced' | 'duplicate' | 'complete';
  session: MistakePracticeSession;
  answeredEntry: MistakePracticeSessionEntry | null;
  requeue: FailureRequeuePlan | null;
}>;

export function advanceMistakePracticeSession(
  session: MistakePracticeSession,
  answer: Readonly<{ attemptId: string; correct: boolean }>,
): MistakeSessionAdvanceResult {
  const attemptId = answer.attemptId.trim();
  if (!attemptId) throw new Error('mistake_practice_attempt_id_required');
  if (session.answeredAttemptIds.includes(attemptId)) {
    return Object.freeze({ kind: 'duplicate', session, answeredEntry: null, requeue: null });
  }
  const entry = session.queue[session.cursor];
  if (!entry) {
    return Object.freeze({ kind: 'complete', session, answeredEntry: null, requeue: null });
  }

  const queue = [...session.queue];
  const failureCounts = { ...session.failureCounts };
  let requeue: FailureRequeuePlan | null = null;
  if (!answer.correct) {
    const failureCount = (failureCounts[entry.mistakeId] ?? 0) + 1;
    failureCounts[entry.mistakeId] = failureCount;
    requeue = planFailureRequeue({ mistakeId: entry.mistakeId, failureCount });
    if (requeue.kind === 'requeue') {
      const desiredInsertAt = session.cursor + 1 + requeue.afterTaskCount;
      if (desiredInsertAt > queue.length) {
        const used = new Set<string>([entry.mistakeId]);
        const spacers = queue.filter((candidate) => {
          if (used.has(candidate.mistakeId)) return false;
          used.add(candidate.mistakeId);
          return true;
        });
        queue.push(...spacers.slice(0, desiredInsertAt - queue.length), entry);
      } else {
        queue.splice(desiredInsertAt, 0, entry);
      }
    }
  }
  const nextCursor = session.cursor + 1;
  const next = Object.freeze({
    ...session,
    cursor: nextCursor,
    queue: Object.freeze(queue),
    failureCounts: Object.freeze(failureCounts),
    answeredAttemptIds: Object.freeze([...session.answeredAttemptIds, attemptId]),
  });
  return Object.freeze({
    kind: nextCursor >= queue.length ? 'complete' : 'advanced',
    session: next,
    answeredEntry: entry,
    requeue,
  });
}
