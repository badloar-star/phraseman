import {
  canonicalJsonV1,
  sha256Utf8,
} from '../modules/learning-v2/policies/decision_registry';
import type {
  MistakeContentRef,
  MistakeFacetRef,
  MistakeStudyTarget,
} from '../modules/mistake-practice/contracts';
import { buildMistakeIdentity } from '../modules/mistake-practice/identity';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  appendMistakeEvent,
  loadMistakeEventJournal,
  type MistakePracticeStorage,
} from './mistake_practice_store';
import { getStableId } from './stable_id';

export type ObjectiveAttemptVerdict =
  | 'correct'
  | 'wrong'
  | 'technical'
  | 'cancelled'
  | 'uncertain';

export interface ObjectiveMistakeAttempt {
  readonly accountScope: string;
  readonly attemptId: string;
  readonly studyTarget: MistakeStudyTarget;
  readonly verdict: ObjectiveAttemptVerdict;
  readonly objective: boolean;
  readonly content: MistakeContentRef;
  readonly facet: MistakeFacetRef;
}

export type CaptureResult =
  | Readonly<{
      kind: 'captured';
      mistakeId: string;
      cycleId: string;
      eventId: string;
      appended: boolean;
    }>
  | Readonly<{
      kind: 'ignored';
      reason: 'correct' | 'subjective' | 'technical' | 'cancelled' | 'unsupported';
    }>;

export interface CaptureDependencies {
  readonly storage?: MistakePracticeStorage;
  readonly forceNewCycle?: boolean;
}

const stableId = (prefix: string, body: unknown): string =>
  `${prefix}:v1:${sha256Utf8(canonicalJsonV1(body))}`;

export async function captureObjectiveAttempt(
  attempt: ObjectiveMistakeAttempt,
  dependencies: CaptureDependencies = {},
): Promise<CaptureResult> {
  if (!attempt.objective) {
    return Object.freeze({ kind: 'ignored', reason: 'subjective' });
  }
  if (attempt.verdict === 'correct') {
    return Object.freeze({ kind: 'ignored', reason: 'correct' });
  }
  if (attempt.verdict === 'cancelled') {
    return Object.freeze({ kind: 'ignored', reason: 'cancelled' });
  }
  if (attempt.verdict === 'technical' || attempt.verdict === 'uncertain') {
    return Object.freeze({ kind: 'ignored', reason: 'technical' });
  }

  const identity = buildMistakeIdentity({
    studyTarget: attempt.studyTarget,
    content: attempt.content,
    facet: attempt.facet,
  });
  if (identity.kind !== 'capturable') {
    return Object.freeze({ kind: 'ignored', reason: 'unsupported' });
  }

  const currentJournal = await loadMistakeEventJournal({
    accountScope: attempt.accountScope,
    studyTarget: attempt.studyTarget,
    storage: dependencies.storage,
  });
  const current = projectMistakes(currentJournal.events).items.get(identity.mistakeId);
  const shouldCreateCycle = dependencies.forceNewCycle
    || !current
    || current.status === 'corrected'
    || current.status === 'hidden';
  const cycleId = shouldCreateCycle
    ? stableId('mistake-cycle', {
        attemptId: attempt.attemptId,
        mistakeId: identity.mistakeId,
      })
    : current.cycleId;
  const eventId = stableId('mistake-event', {
    attemptId: attempt.attemptId,
    cycleId,
    mistakeId: identity.mistakeId,
    type: 'captured',
  });
  if (currentJournal.events.some((event) => event.eventId === eventId)) {
    return Object.freeze({
      kind: 'captured',
      mistakeId: identity.mistakeId,
      cycleId,
      eventId,
      appended: false,
    });
  }
  const write = await appendMistakeEvent({
    accountScope: attempt.accountScope,
    studyTarget: attempt.studyTarget,
    storage: dependencies.storage,
    event: {
      eventId,
      mistakeId: identity.mistakeId,
      cycleId,
      type: 'captured',
      occurredAtMs: Date.now(),
      studyTarget: attempt.studyTarget,
      payload: {
        canonicalTarget: attempt.content.canonicalTarget,
        contentFingerprint: identity.contentFingerprint,
        facet: attempt.facet.kind,
        lessonId: attempt.content.lessonId ?? null,
        sourceId: attempt.content.sourceId,
        sourceKind: attempt.content.sourceKind,
        sourceMeaning: attempt.content.sourceMeaning ?? null,
        audioRef: attempt.content.audioRef ?? null,
        tokens: attempt.content.tokens ?? null,
        distractors: attempt.content.distractors ?? null,
        tokenIndex: attempt.facet.tokenIndex ?? null,
        expected: attempt.facet.expected ?? null,
      },
    },
  });

  return Object.freeze({
    kind: 'captured',
    mistakeId: identity.mistakeId,
    cycleId,
    eventId,
    appended: write.appended,
  });
}

export async function captureCurrentAccountObjectiveAttempt(
  attempt: Omit<ObjectiveMistakeAttempt, 'accountScope'>,
  dependencies: CaptureDependencies = {},
): Promise<CaptureResult> {
  const accountScope = await getStableId();
  return captureObjectiveAttempt({ ...attempt, accountScope }, dependencies);
}
