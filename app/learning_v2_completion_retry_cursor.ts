import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';
import { deriveLocalOfflineProgressAccountScopeHash } from
  '../modules/learning-v2/progress/progress_account_scope';

export const LEARNING_V2_COMPLETION_RETRY_CURSOR_PREFIX =
  'v2:required-session-completion-scheduler:v1:';
const SCHEMA = 'learning-v2-required-session-completion-retry-cursor.v1' as const;
const MAX_BYTES = 4 * 1024;
const MAX_FAILURE_ORDINAL = 8;
export const LEARNING_V2_COMPLETION_RETRY_MAX_REVISION = 1_000_000;
const MAX_FUTURE_MS = 10 * 60 * 1000;
const HASH = /^[a-f0-9]{64}$/;

export type LearningV2CompletionRetryCursor = Readonly<{
  schemaVersion: typeof SCHEMA;
  accountScopeHash: string;
  revision: number;
  failureOrdinal: number;
  nextAttemptAtMs: number;
  reason: 'attempt_reserved' | 'retryable_failure' | 'bounded_continuation';
  cursorFingerprint: string;
}>;

type CursorBody = Omit<LearningV2CompletionRetryCursor, 'cursorFingerprint'>;
type CursorStorage = Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>;

const BODY_KEYS = [
  'schemaVersion', 'accountScopeHash', 'revision', 'failureOrdinal',
  'nextAttemptAtMs', 'reason',
] as const;
const KEYS = [...BODY_KEYS, 'cursorFingerprint'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === 'string' && keys.includes(key));
};
const safeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;

export const learningV2CompletionRetryCursorKey = (accountScopeHash: string): string => {
  if (!HASH.test(accountScopeHash)) throw new Error('learning_v2_retry_cursor_scope_invalid');
  return `${LEARNING_V2_COMPLETION_RETRY_CURSOR_PREFIX}${accountScopeHash}`;
};

export const materializeLearningV2CompletionRetryCursor = (
  body: CursorBody,
): LearningV2CompletionRetryCursor => {
  if (!isRecord(body) || !exactKeys(body, BODY_KEYS) ||
    (Object.getPrototypeOf(body) !== Object.prototype && Object.getPrototypeOf(body) !== null)) {
    throw new Error('learning_v2_retry_cursor_invalid');
  }
  const detached = Object.create(null) as Record<string, unknown>;
  for (const key of BODY_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(body, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) {
      throw new Error('learning_v2_retry_cursor_invalid');
    }
    detached[key] = descriptor.value;
  }
  const value = detached as unknown as CursorBody;
  if (value.schemaVersion !== SCHEMA || !HASH.test(value.accountScopeHash) ||
    !safeInteger(value.revision) || value.revision < 1 ||
    value.revision > LEARNING_V2_COMPLETION_RETRY_MAX_REVISION ||
    !safeInteger(value.failureOrdinal) || value.failureOrdinal > MAX_FAILURE_ORDINAL ||
    !safeInteger(value.nextAttemptAtMs) ||
    (value.reason !== 'attempt_reserved' && value.reason !== 'retryable_failure' &&
      value.reason !== 'bounded_continuation')) throw new Error('learning_v2_retry_cursor_invalid');
  const cursor = Object.freeze({
    ...value,
    cursorFingerprint: hashCanonicalBody(value),
  });
  if (utf8ByteLengthV1(canonicalJsonV1(cursor)) > MAX_BYTES) {
    throw new Error('learning_v2_retry_cursor_overflow');
  }
  return cursor;
};

export const parseLearningV2CompletionRetryCursor = (
  raw: string,
  expectedAccountScopeHash: string,
  nowMs: number,
): LearningV2CompletionRetryCursor => {
  if (typeof raw !== 'string' || raw.length > MAX_BYTES ||
    utf8ByteLengthV1(raw) > MAX_BYTES || !HASH.test(expectedAccountScopeHash) ||
    !safeInteger(nowMs)) throw new Error('learning_v2_retry_cursor_invalid');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('learning_v2_retry_cursor_invalid'); }
  if (!isRecord(parsed) || !exactKeys(parsed, KEYS)) {
    throw new Error('learning_v2_retry_cursor_invalid');
  }
  const body = Object.fromEntries(BODY_KEYS.map((key) => [key, parsed[key]])) as CursorBody;
  const cursor = materializeLearningV2CompletionRetryCursor(body);
  if (parsed.cursorFingerprint !== cursor.cursorFingerprint ||
    cursor.accountScopeHash !== expectedAccountScopeHash ||
    cursor.nextAttemptAtMs > nowMs + MAX_FUTURE_MS ||
    raw !== canonicalJsonV1(cursor)) {
    throw new Error('learning_v2_retry_cursor_invalid');
  }
  return cursor;
};

export const activeLearningV2CompletionRetryScope = (): string | null => {
  const token = captureAccountGeneration();
  return token.phase === 'active' && token.stableId
    ? deriveLocalOfflineProgressAccountScopeHash(token.stableId)
    : null;
};

const withExactActiveScope = async <T>(
  expectedAccountScopeHash: string,
  work: (storage: CursorStorage) => Promise<T>,
): Promise<T> => withAccountTransitionLock(async () => {
  const token = captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId ||
    deriveLocalOfflineProgressAccountScopeHash(token.stableId) !== expectedAccountScopeHash) {
    throw new Error('learning_v2_retry_cursor_scope_stale');
  }
  const value = await work(AsyncStorage);
  if (!isCurrentAccountGeneration(token, token.stableId)) {
    throw new Error('learning_v2_retry_cursor_scope_stale');
  }
  return value;
});

export const loadLearningV2CompletionRetryCursor = (
  accountScopeHash: string,
  nowMs: number,
): Promise<LearningV2CompletionRetryCursor | null> => withExactActiveScope(
  accountScopeHash,
  async (storage) => {
    const key = learningV2CompletionRetryCursorKey(accountScopeHash);
    const raw = await storage.getItem(key);
    if (raw === null) return null;
    try {
      return parseLearningV2CompletionRetryCursor(raw, accountScopeHash, nowMs);
    } catch {
      // Corrupt advisory pacing may be removed, but the exact raw is re-read
      // under the account lock first so a newer replacement is never erased.
      if (await storage.getItem(key) !== raw) {
        throw new Error('learning_v2_retry_cursor_stale');
      }
      await storage.removeItem(key);
      if (await storage.getItem(key) !== null) {
        throw new Error('learning_v2_retry_cursor_indeterminate');
      }
      return null;
    }
  },
);

export const persistLearningV2CompletionRetryCursor = (
  cursor: LearningV2CompletionRetryCursor,
): Promise<void> => withExactActiveScope(cursor.accountScopeHash, async (storage) => {
  const key = learningV2CompletionRetryCursorKey(cursor.accountScopeHash);
  const encoded = canonicalJsonV1(cursor);
  parseLearningV2CompletionRetryCursor(encoded, cursor.accountScopeHash, Date.now());
  const previousRaw = await storage.getItem(key);
  if (previousRaw === null) {
    if (cursor.revision !== 1) throw new Error('learning_v2_retry_cursor_stale');
  } else {
    const previous = parseLearningV2CompletionRetryCursor(
      previousRaw,
      cursor.accountScopeHash,
      Date.now(),
    );
    if (previousRaw === encoded) return;
    const expectedRevision = previous.revision === LEARNING_V2_COMPLETION_RETRY_MAX_REVISION
      ? 1
      : previous.revision + 1;
    if (expectedRevision !== cursor.revision) {
      throw new Error('learning_v2_retry_cursor_stale');
    }
  }
  await storage.setItem(key, encoded);
  if (await storage.getItem(key) !== encoded) {
    throw new Error('learning_v2_retry_cursor_indeterminate');
  }
});

export const clearLearningV2CompletionRetryCursor = (
  accountScopeHash: string,
  expectedRevision?: number,
): Promise<void> => withExactActiveScope(accountScopeHash, async (storage) => {
  const key = learningV2CompletionRetryCursorKey(accountScopeHash);
  const previousRaw = await storage.getItem(key);
  if (previousRaw === null) return;
  const previous = parseLearningV2CompletionRetryCursor(previousRaw, accountScopeHash, Date.now());
  if (expectedRevision !== undefined && previous.revision !== expectedRevision) {
    throw new Error('learning_v2_retry_cursor_stale');
  }
  await storage.removeItem(key);
  if (await storage.getItem(key) !== null) {
    throw new Error('learning_v2_retry_cursor_indeterminate');
  }
});
