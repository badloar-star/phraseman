import {
  clearLearningV2CompletionRetryCursor,
  learningV2CompletionRetryCursorKey,
  loadLearningV2CompletionRetryCursor,
  materializeLearningV2CompletionRetryCursor,
  parseLearningV2CompletionRetryCursor,
  persistLearningV2CompletionRetryCursor,
} from '../app/learning_v2_completion_retry_cursor';
import { canonicalJsonV1 } from '../modules/learning-v2/policies/decision_registry';
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';

const SCOPE = 'a'.repeat(64);

beforeEach(async () => {
  __resetAccountGenerationForTests();
  beginAccountGeneration('stable-user-1');
  await AsyncStorage.clear();
});

test('retry cursor round-trips exact canonical owner-bound bytes', () => {
  const cursor = materializeLearningV2CompletionRetryCursor({
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: SCOPE,
    revision: 1,
    failureOrdinal: 1,
    nextAttemptAtMs: 11_000,
    reason: 'retryable_failure',
  });
  expect(parseLearningV2CompletionRetryCursor(canonicalJsonV1(cursor), SCOPE, 1_000))
    .toEqual(cursor);
});

test('cursor rejects foreign owner, tamper, noncanonical and excessive future lockout', () => {
  const cursor = materializeLearningV2CompletionRetryCursor({
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: SCOPE,
    revision: 1,
    failureOrdinal: 1,
    nextAttemptAtMs: 11_000,
    reason: 'retryable_failure',
  });
  const raw = canonicalJsonV1(cursor);
  expect(() => parseLearningV2CompletionRetryCursor(raw, 'b'.repeat(64), 1_000)).toThrow();
  expect(() => parseLearningV2CompletionRetryCursor(raw.replace('11000', '12000'), SCOPE, 1_000)).toThrow();
  expect(() => parseLearningV2CompletionRetryCursor(` ${raw}`, SCOPE, 1_000)).toThrow();
  const future = materializeLearningV2CompletionRetryCursor({
    schemaVersion: cursor.schemaVersion,
    accountScopeHash: cursor.accountScopeHash,
    revision: 2,
    failureOrdinal: cursor.failureOrdinal,
    nextAttemptAtMs: 700_001,
    reason: cursor.reason,
  });
  expect(() => parseLearningV2CompletionRetryCursor(canonicalJsonV1(future), SCOPE, 1_000)).toThrow();
});

test('oversized cursor rejects before JSON parse', () => {
  const spy = jest.spyOn(JSON, 'parse');
  expect(() => parseLearningV2CompletionRetryCursor('x'.repeat(4_097), SCOPE, 1_000)).toThrow();
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test('materializer rejects extras and accessors without executing them', () => {
  let getterCalled = false;
  const hostile = {
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: SCOPE,
    revision: 1,
    failureOrdinal: 1,
    nextAttemptAtMs: 11_000,
    reason: 'retryable_failure',
    extra: true,
  };
  Object.defineProperty(hostile, 'revision', {
    enumerable: true,
    get: () => { getterCalled = true; return 1; },
  });
  expect(() => materializeLearningV2CompletionRetryCursor(hostile as never)).toThrow();
  expect(getterCalled).toBe(false);
});

test('account wipe and emergency backup include the owner retry cursor', () => {
  const cloud = fs.readFileSync(path.join(process.cwd(), 'app/cloud_sync.ts'), 'utf8');
  const restore = fs.readFileSync(
    path.join(process.cwd(), 'app/account_switch_backup_restore.ts'),
    'utf8',
  );
  expect(cloud).toContain("'v2:required-session-completion-scheduler:v1:'");
  expect(restore).toContain("key.startsWith('v2:required-session-completion-scheduler:')");
});

test('stale clear cannot delete a newer cursor revision', async () => {
  const scope = (await import('../modules/learning-v2/progress/progress_account_scope'))
    .deriveLocalOfflineProgressAccountScopeHash('stable-user-1');
  const revision3 = materializeLearningV2CompletionRetryCursor({
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: scope,
    revision: 3,
    failureOrdinal: 1,
    nextAttemptAtMs: Date.now() + 10_000,
    reason: 'retryable_failure',
  });
  const revision4 = materializeLearningV2CompletionRetryCursor({
    schemaVersion: revision3.schemaVersion,
    accountScopeHash: revision3.accountScopeHash,
    revision: 4,
    failureOrdinal: revision3.failureOrdinal,
    nextAttemptAtMs: Date.now() + 20_000,
    reason: revision3.reason,
  });
  await AsyncStorage.setItem(
    learningV2CompletionRetryCursorKey(scope),
    canonicalJsonV1(revision3),
  );
  await persistLearningV2CompletionRetryCursor(revision4);
  await expect(clearLearningV2CompletionRetryCursor(scope, 3)).rejects.toThrow(
    'learning_v2_retry_cursor_stale',
  );
  expect(await AsyncStorage.getItem(learningV2CompletionRetryCursorKey(scope)))
    .toBe(canonicalJsonV1(revision4));
});

test('transient cursor read failure never removes valid persisted pacing', async () => {
  const scope = (await import('../modules/learning-v2/progress/progress_account_scope'))
    .deriveLocalOfflineProgressAccountScopeHash('stable-user-1');
  const cursor = materializeLearningV2CompletionRetryCursor({
    schemaVersion: 'learning-v2-required-session-completion-retry-cursor.v1',
    accountScopeHash: scope,
    revision: 1,
    failureOrdinal: 1,
    nextAttemptAtMs: Date.now() + 10_000,
    reason: 'retryable_failure',
  });
  await AsyncStorage.setItem(learningV2CompletionRetryCursorKey(scope), canonicalJsonV1(cursor));
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('transient_read'));
  await expect(loadLearningV2CompletionRetryCursor(scope, Date.now())).rejects.toThrow('transient_read');
  expect(await AsyncStorage.getItem(learningV2CompletionRetryCursorKey(scope)))
    .toBe(canonicalJsonV1(cursor));
});
