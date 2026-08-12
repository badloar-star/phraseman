import {
  beginInteractiveNetworkQuiet,
  isInteractiveNetworkQuietReady,
  releaseInteractiveNetworkQuiet,
  waitForInteractiveNetworkQuiet,
  type InteractiveNetworkQuietHandle,
} from './interactive_network_quiet';

const SESSION_ID = /^lesson-1-(understand|use|master)-[1-4]$/;

declare const LEARNING_V2_SESSION_NETWORK_INTENT: unique symbol;
export type LearningV2SessionNetworkIntent = Readonly<{
  intentId: number;
  sessionId: string;
  [LEARNING_V2_SESSION_NETWORK_INTENT]: true;
}>;

declare const LEARNING_V2_SESSION_FRAME_RELEASE_TARGET: unique symbol;
export type LearningV2SessionFrameReleaseTarget = Readonly<{
  intentId: number;
  owner: 'result' | 'exit';
  [LEARNING_V2_SESSION_FRAME_RELEASE_TARGET]: true;
}>;

type IntentOwner = 'map' | 'session' | 'result' | 'exit';
type IntentRecord = {
  readonly token: LearningV2SessionNetworkIntent;
  readonly handle: InteractiveNetworkQuietHandle;
  owner: IntentOwner;
  ownerRevision: number;
};

const records = new WeakMap<object, IntentRecord>();
const frameReleaseTargets = new WeakMap<object, Readonly<{
  record: IntentRecord;
  owner: 'result' | 'exit';
  ownerRevision: number;
}>>();
let active: IntentRecord | null = null;
let nextIntentId = 1;

const assertSessionId = (sessionId: string): void => {
  if (!SESSION_ID.test(sessionId)) throw new Error('learning_v2_session_intent_invalid');
};

const recordFor = (intent: LearningV2SessionNetworkIntent): IntentRecord => {
  if (!intent || typeof intent !== 'object') {
    throw new Error('learning_v2_session_intent_invalid');
  }
  const record = records.get(intent as object);
  if (!record || active !== record || record.token !== intent) {
    throw new Error('learning_v2_session_intent_stale');
  }
  return record;
};

const createIntent = (sessionId: string, owner: IntentOwner): IntentRecord => {
  assertSessionId(sessionId);
  const handle = beginInteractiveNetworkQuiet();
  const token = Object.freeze({
    intentId: nextIntentId++,
    sessionId,
  }) as LearningV2SessionNetworkIntent;
  const record: IntentRecord = { token, handle, owner, ownerRevision: 0 };
  records.set(token as object, record);
  active = record;
  return record;
};

const releaseRecord = (record: IntentRecord): void => {
  if (active !== record) return;
  active = null;
  records.delete(record.token as object);
  releaseInteractiveNetworkQuiet(record.handle);
};

/** Starts draining admitted background work while the runnable-node sheet opens. */
export const prepareLearningV2SessionNetworkIntent = (
  sessionId: string,
): LearningV2SessionNetworkIntent => {
  assertSessionId(sessionId);
  if (active) {
    if (active.owner === 'map' && active.token.sessionId === sessionId) return active.token;
    if (active.owner === 'session') throw new Error('learning_v2_session_intent_busy');
    // A tap on the already-rendered result map is itself later than the result
    // frame. Replace the result handle in the same tick; the coordinator's
    // microtask hand-off prevents a momentary admission gap.
    releaseRecord(active);
  }
  return createIntent(sessionId, 'map').token;
};

/** Claims the exact in-memory map intent, or creates a fenced deep-link intent. */
export const claimLearningV2SessionNetworkIntent = (
  sessionId: string,
): LearningV2SessionNetworkIntent => {
  assertSessionId(sessionId);
  if (active) {
    if (active.token.sessionId !== sessionId) {
      if (active.owner !== 'map' && active.owner !== 'exit') {
        throw new Error('learning_v2_session_intent_busy');
      }
      releaseRecord(active);
    } else {
      if (active.owner === 'result') throw new Error('learning_v2_session_intent_busy');
      active.owner = 'session';
      active.ownerRevision += 1;
      return active.token;
    }
  }
  return createIntent(sessionId, 'session').token;
};

export const waitForLearningV2SessionNetworkIntent = async (
  intent: LearningV2SessionNetworkIntent,
): Promise<void> => {
  const record = recordFor(intent);
  if (record.owner !== 'session') throw new Error('learning_v2_session_intent_unclaimed');
  await waitForInteractiveNetworkQuiet(record.handle);
  const current = recordFor(intent);
  if (current.owner !== 'session') throw new Error('learning_v2_session_intent_stale');
};

export const isLearningV2SessionNetworkIntentReady = (
  intent: LearningV2SessionNetworkIntent,
): boolean => {
  try {
    const record = recordFor(intent);
    return record.owner === 'session' && isInteractiveNetworkQuietReady(record.handle);
  } catch {
    return false;
  }
};

export const cancelPreparedLearningV2SessionNetworkIntent = (
  sessionId?: string,
): void => {
  if (!active || active.owner !== 'map') return;
  if (sessionId !== undefined && active.token.sessionId !== sessionId) return;
  releaseRecord(active);
};

export const releaseLearningV2SessionNetworkIntent = (
  intent: LearningV2SessionNetworkIntent,
): void => {
  const record = recordFor(intent);
  if (record.owner === 'result' || record.owner === 'exit') return;
  releaseRecord(record);
};

/** Transfers ownership across router.replace; session unmount must not reopen. */
export const markLearningV2SessionResultPending = (
  intent: LearningV2SessionNetworkIntent,
): void => {
  const record = recordFor(intent);
  if (record.owner !== 'session') throw new Error('learning_v2_session_intent_unclaimed');
  record.owner = 'result';
  record.ownerRevision += 1;
};

export const markLearningV2SessionExitPending = (
  intent: LearningV2SessionNetworkIntent,
): void => {
  const record = recordFor(intent);
  if (record.owner !== 'session') throw new Error('learning_v2_session_intent_unclaimed');
  record.owner = 'exit';
  record.ownerRevision += 1;
};

export const restoreLearningV2SessionNetworkIntentAfterNavigationFailure = (
  intent: LearningV2SessionNetworkIntent,
): void => {
  const record = recordFor(intent);
  if (record.owner !== 'result') throw new Error('learning_v2_session_result_not_pending');
  record.owner = 'session';
  record.ownerRevision += 1;
};

/** Captures the exact pending intent; stale destination callbacks become no-ops. */
export const captureLearningV2SessionNetworkIntentFrameReleaseTarget = (
  owner: 'result' | 'exit',
): LearningV2SessionFrameReleaseTarget | null => {
  if (!active || active.owner !== owner) return null;
  const record = active;
  const target = Object.freeze({
    intentId: record.token.intentId,
    owner,
  }) as LearningV2SessionFrameReleaseTarget;
  frameReleaseTargets.set(target as object, Object.freeze({
    record,
    owner,
    ownerRevision: record.ownerRevision,
  }));
  return target;
};

const releaseFrameTarget = (
  target: LearningV2SessionFrameReleaseTarget | null,
  owner: 'result' | 'exit',
): void => {
  if (!target || typeof target !== 'object') return;
  const binding = frameReleaseTargets.get(target as object);
  frameReleaseTargets.delete(target as object);
  if (!binding || binding.owner !== owner || target.owner !== owner ||
    binding.record.token.intentId !== target.intentId || active !== binding.record ||
    binding.record.owner !== owner ||
    binding.record.ownerRevision !== binding.ownerRevision) return;
  releaseRecord(binding.record);
};

/** Called only after the recovered map/result geometry has committed a frame. */
export const releaseLearningV2SessionNetworkIntentAfterResultFrame = (
  target: LearningV2SessionFrameReleaseTarget | null,
): void => releaseFrameTarget(target, 'result');

export const releaseLearningV2SessionNetworkIntentAfterExitFrame = (
  target: LearningV2SessionFrameReleaseTarget | null,
): void => releaseFrameTarget(target, 'exit');

export const learningV2SessionNetworkIntentSnapshot = (): Readonly<{
  active: boolean;
  owner: IntentOwner | null;
  sessionId: string | null;
  ready: boolean;
}> => Object.freeze({
  active: active !== null,
  owner: active?.owner ?? null,
  sessionId: active?.token.sessionId ?? null,
  ready: active ? isInteractiveNetworkQuietReady(active.handle) : false,
});

export const __resetLearningV2SessionNetworkIntentForTests = (): void => {
  if (active) releaseRecord(active);
  active = null;
  nextIntentId = 1;
};
