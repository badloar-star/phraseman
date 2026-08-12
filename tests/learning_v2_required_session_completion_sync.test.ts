import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetch as expoFetch } from 'expo/fetch';
import fs from 'node:fs';
import path from 'node:path';

const submitCalls = jest.fn();
let bindingCallGate: Promise<void> | null = null;
let bindingCallStarted: (() => void) | null = null;
let submitCallGate: Promise<void> | null = null;
let submitCallStarted: (() => void) | null = null;
const mockAuthState: { currentUser: { uid: string } | null } = { currentUser: null };
const mockGetIdTokenResult = jest.fn();
const mockGetAppCheckToken = jest.fn();
const mockCommitServerWalletReward = jest.fn();
let walletRewardRequestForSubmit: Readonly<{
  schemaVersion: 'learning-v2-server-wallet-reward-request.v1';
  rewardId: string;
  rewardFingerprint: string;
}> | null = null;
let walletRewardEncoded = '';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuthState,
  getIdTokenResult: (...args: unknown[]) => mockGetIdTokenResult(...args),
}));
jest.mock('@react-native-firebase/app-check', () => ({
  __esModule: true,
  default: () => ({ getToken: (...args: unknown[]) => mockGetAppCheckToken(...args) }),
}));
jest.mock('@react-native-firebase/app', () => ({
  getApp: () => ({ options: { projectId: 'phraseman-ea0b3' } }),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-user-1') }));
jest.mock('../app/app_check_init', () => ({
  isFirebaseAppCheckReady: jest.fn(() => true),
}));
jest.mock('../app/learning_v2_owner_repository_runtime', () => {
  const actual = jest.requireActual('../app/learning_v2_owner_repository_runtime');
  return {
    ...actual,
    commitLearningV2ServerWalletReward: (...args: unknown[]) =>
      mockCommitServerWalletReward(...args),
  };
});

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';
import {
  attemptPendingRequiredSessionCompletions,
  flushPendingRequiredSessionCompletions,
} from '../app/learning_v2_required_session_completion_sync';
import {
  attemptWarmLearningV2CompletionCredentialsCachePreferred,
  clearLearningV2CompletionCredentialCache,
  learningV2CompletionCredentialCacheState,
} from '../app/learning_v2_completion_credential_cache';
import {
  __resetInteractiveNetworkQuietForTests,
  beginInteractiveNetworkQuiet,
  releaseInteractiveNetworkQuiet,
  waitForInteractiveNetworkQuiet,
  withBackgroundNetworkLease,
} from '../app/interactive_network_quiet';
import { getStableId } from '../app/stable_id';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import {
  deriveLocalOfflineProgressAccountScopeHash,
  deriveProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from '../modules/learning-v2/progress/progress_account_scope';
import {
  materializeRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
} from '../modules/learning-v2/progress/required_session_completion_envelope';
import { createProgressOutbox } from '../modules/learning-v2/progress/progress_outbox';
import { materializeServerWalletRewardReceiptCandidate } from '../modules/learning-v2/progress/server_wallet_reward_receipt';
import { getLesson1SessionRuntime } from '../modules/learning-v2/runtime/lesson1_session_runtime';

const stableUid = 'stable-user-1';
const NOW = 1_000_000;
const EXP_MS = NOW + 600_000;
const jwt = (payload: Record<string, unknown>) => [
  Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'signature',
].join('.');
const expoFetchMock = expoFetch as jest.MockedFunction<typeof expoFetch>;

const fetchResponse = (raw: string, ok = true): Response => ({
  ok,
  headers: { get: (name: string) => {
    if (name.toLowerCase() === 'content-type') return 'application/json; charset=utf-8';
    if (name.toLowerCase() === 'content-length') {
      return String(new TextEncoder().encode(raw).byteLength);
    }
    return null;
  } },
  body: { getReader: () => {
    let emitted = false;
    return {
      read: async () => {
        if (emitted) return { done: true, value: undefined };
        emitted = true;
        return { done: false, value: new TextEncoder().encode(raw) };
      },
      releaseLock: jest.fn(),
    };
  } },
}) as unknown as Response;

const serverBinding = {
  schemaVersion: 'learning-v2-account-binding.v2' as const,
  stableUid,
  accountGeneration: 7,
  economicAccountScopeHash: deriveLearningV2EconomicAccountScopeHash(stableUid),
  progressAccountScopeHash: deriveProgressAccountScopeHash(stableUid, 7),
};
const localScope = {
  stableId: stableUid,
  accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(stableUid),
  seasonId: 'learning-v2',
  studyTarget: 'en',
  learnerSourceLocale: 'ru',
  generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
};

beforeEach(async () => {
  __resetInteractiveNetworkQuietForTests();
  __resetAccountGenerationForTests();
  const account = beginAccountGeneration(stableUid);
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  submitCalls.mockClear();
  expoFetchMock.mockReset();
  mockGetIdTokenResult.mockReset();
  mockGetAppCheckToken.mockReset();
  bindingCallGate = null;
  bindingCallStarted = null;
  submitCallGate = null;
  submitCallStarted = null;
  walletRewardRequestForSubmit = null;
  walletRewardEncoded = '';
  mockCommitServerWalletReward.mockReset();
  mockCommitServerWalletReward.mockImplementation(async (_request, dependencies) => {
    const resolver = (dependencies as { resolveRewardReceipt: (input: {
      accountScopeHash: string;
      rewardId: string;
      rewardFingerprint: string;
    }) => Promise<string> }).resolveRewardReceipt;
    if (!walletRewardRequestForSubmit) throw new Error('wallet_reward_fixture_missing');
    await resolver({
      accountScopeHash: serverBinding.economicAccountScopeHash,
      rewardId: walletRewardRequestForSubmit.rewardId,
      rewardFingerprint: walletRewardRequestForSubmit.rewardFingerprint,
    });
    return {
      snapshot: {
        walletState: { accountScopeHash: serverBinding.economicAccountScopeHash },
      },
    };
  });
  (getStableId as jest.MockedFunction<typeof getStableId>).mockClear();
  await AsyncStorage.clear();
  const authUid = 'firebase-auth-sync';
  const authToken = jwt({
    aud: 'phraseman-ea0b3',
    iss: 'https://securetoken.google.com/phraseman-ea0b3',
    sub: authUid,
    exp: EXP_MS / 1_000,
  });
  const appCheckToken = jwt({ exp: EXP_MS / 1_000 });
  mockAuthState.currentUser = { uid: authUid };
  mockGetIdTokenResult.mockResolvedValue({
    token: authToken,
    expirationTime: new Date(EXP_MS).toISOString(),
  });
  mockGetAppCheckToken.mockResolvedValue({ token: appCheckToken });
  expoFetchMock.mockImplementation(async (url, init) => {
    if (String(url).endsWith('/getLearningV2AccountBinding')) {
      bindingCallStarted?.();
      if (bindingCallGate) await bindingCallGate;
      return fetchResponse(JSON.stringify({ result: serverBinding })) as never;
    }
    if (String(url).endsWith('/submitLearningV2RequiredSessionCompletion')) {
      const wire = JSON.parse(String(init?.body)) as { data: {
        mutationId: string;
        payloadFingerprint: string;
        payload: { sessionRunId?: unknown };
      } };
      const request = wire.data;
      submitCalls(request);
      submitCallStarted?.();
      if (submitCallGate) await submitCallGate;
      if (request.payload.sessionRunId === 'sync-permanent-rejection' ||
        request.payload.sessionRunId === 'sync-wrong-status-rejection' ||
        request.payload.sessionRunId === 'sync-unauthenticated') {
        const status = request.payload.sessionRunId === 'sync-permanent-rejection'
          ? 'FAILED_PRECONDITION'
          : request.payload.sessionRunId === 'sync-unauthenticated'
            ? 'UNAUTHENTICATED'
            : 'UNAVAILABLE';
        return fetchResponse(JSON.stringify({
          error: {
            status,
            message: 'required_session_completion_publication_mismatch',
            details: {
              schemaVersion: 'learning-v2-required-session-completion-protocol-rejection.v1',
              mutationId: request.mutationId,
              payloadFingerprint: request.payloadFingerprint,
              reason: 'publication_mismatch',
              receipt: {
                schemaVersion: 'v2-progress-outbox-server-receipt.v1',
                receiptId: 'rejection_receipt_1',
                receiptFingerprint: 'b'.repeat(64),
              },
            },
          },
        }), false) as never;
      }
      return fetchResponse(JSON.stringify({
        result: {
          kind: 'accepted',
          mutationId: request.mutationId,
          payloadFingerprint: request.payloadFingerprint,
          duplicate: false,
          receipt: {
            schemaVersion: 'v2-progress-outbox-server-receipt.v1',
            receiptId: 'completion_receipt_1',
            receiptFingerprint: 'a'.repeat(64),
          },
          walletRewardRequest: null,
          ...(walletRewardRequestForSubmit
            ? { walletRewardRequest: walletRewardRequestForSubmit }
            : {}),
        },
      })) as never;
    }
    if (String(url).endsWith('/resolveLearningV2WalletRewardReceipt')) {
      if (!walletRewardRequestForSubmit || !walletRewardEncoded) {
        throw new Error('wallet_reward_fixture_missing');
      }
      return fetchResponse(JSON.stringify({
        result: {
          schemaVersion: 'learning-v2-server-wallet-reward-resolution.v1',
          rewardId: walletRewardRequestForSubmit.rewardId,
          rewardFingerprint: walletRewardRequestForSubmit.rewardFingerprint,
          encoded: walletRewardEncoded,
        },
      })) as never;
    }
    throw new Error(`unexpected_completion_url:${String(url)}`);
  });
  await expect(withBackgroundNetworkLease('completion.credentials_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(account, lease),
  )).resolves.toBe('published');
});

afterEach(() => jest.restoreAllMocks());

test('empty cold-start recovery performs no completion HTTP', async () => {
  clearLearningV2CompletionCredentialCache();
  mockGetIdTokenResult.mockClear();
  mockGetAppCheckToken.mockClear();
  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(0);
  expect(expoFetchMock).not.toHaveBeenCalled();
  expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
  expect(submitCalls).not.toHaveBeenCalled();
});

test('production sync has no RN Functions, token warmer, or auth initializer fallback', () => {
  const source = fs.readFileSync(path.join(
    process.cwd(),
    'app/learning_v2_required_session_completion_sync.ts',
  ), 'utf8');
  expect(source).not.toContain('@react-native-firebase/functions');
  expect(source).not.toContain('httpsCallable');
  expect(source).not.toContain('ensureAnonUser');
  expect(source).not.toContain('attemptWarmLearningV2CompletionCredentialsCachePreferred');
  expect(source).toContain('callLearningV2CompletionFunctionViaFetch');
});

test('pending work without a memory credential stays exact and requests external admission', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-credentials-required',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);
  clearLearningV2CompletionCredentialCache();
  expoFetchMock.mockClear();
  mockGetIdTokenResult.mockClear();
  mockGetAppCheckToken.mockClear();

  await expect(attemptPendingRequiredSessionCompletions()).resolves.toEqual({
    processed: 0,
    disposition: 'credentials_required',
  });
  expect(expoFetchMock).not.toHaveBeenCalled();
  expect(mockGetIdTokenResult).not.toHaveBeenCalled();
  expect(mockGetAppCheckToken).not.toHaveBeenCalled();
  expect((await outbox.list(localScope)).find((item) => item.mutationId === mutationId))
    .toMatchObject({ status: 'pending', payloadFingerprint: expect.any(String) });
});

test('a pair below the safety TTL requests a fresh admission without starting HTTP', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-expired-credentials',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);
  jest.spyOn(Date, 'now').mockReturnValue(EXP_MS - 119_999);
  expoFetchMock.mockClear();

  await expect(attemptPendingRequiredSessionCompletions()).resolves.toEqual({
    processed: 0,
    disposition: 'credentials_required',
  });
  expect(expoFetchMock).not.toHaveBeenCalled();
  expect((await outbox.list(localScope)).find((item) => item.mutationId === mutationId))
    .toMatchObject({ status: 'pending' });
});

test('consumes the transport receipt after exact compaction and safely replays the same mutation', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-bridge-restart-run',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(1);
  expect(submitCalls).toHaveBeenCalledTimes(1);
  expect(expoFetchMock.mock.calls.map(([url]) => String(url))).toEqual([
    'https://us-central1-phraseman-ea0b3.cloudfunctions.net/getLearningV2AccountBinding',
    'https://us-central1-phraseman-ea0b3.cloudfunctions.net/submitLearningV2RequiredSessionCompletion',
  ]);
  expect(expoFetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: 'POST',
    body: '{"data":{}}',
    headers: {
      'Content-Type': 'application/json',
      Authorization: expect.stringMatching(/^Bearer /),
      'X-Firebase-AppCheck': expect.any(String),
    },
  });
  expect(JSON.parse(String(expoFetchMock.mock.calls[1]?.[1]?.body))).toMatchObject({
    data: {
      mutationId: expect.any(String),
      payloadFingerprint: expect.any(String),
      payload: { sessionRunId: 'sync-bridge-restart-run' },
    },
  });
  expect(await outbox.list(localScope)).toEqual([]);
  const bridgeKey = (await AsyncStorage.getAllKeys()).find((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'));
  expect(bridgeKey).toBeUndefined();

  await outbox.enqueue(localScope, mutationId, envelope);
  submitCalls.mockClear();
  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(1);
  expect(submitCalls).toHaveBeenCalledTimes(1);
  expect(await outbox.list(localScope)).toEqual([]);
  expect((await AsyncStorage.getAllKeys()).some((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'))).toBe(false);
});

test('redeems an exact fractional repeat-star receipt before removing the accepted completion', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const reward = materializeServerWalletRewardReceiptCandidate({
    rewardId: 'required-session-repeat-test-reward',
    operationId: 'wallet-required-session-repeat-test-reward',
    accountScopeHash: serverBinding.economicAccountScopeHash,
    accountGeneration: serverBinding.accountGeneration,
    amountSubunits: 54_000,
    operationReason: 'repeat_session',
    origin: {
      kind: 'course',
      courseId: 'english-core',
      studyTarget: 'en',
      requiredSessionOrdinal: 1,
    },
  });
  walletRewardRequestForSubmit = Object.freeze({
    schemaVersion: 'learning-v2-server-wallet-reward-request.v1',
    rewardId: reward.receipt.rewardId,
    rewardFingerprint: reward.receipt.rewardFingerprint,
  });
  walletRewardEncoded = reward.encoded;
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-wallet-reward-run',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(1);
  expect(mockCommitServerWalletReward).toHaveBeenCalledTimes(1);
  expect(mockCommitServerWalletReward.mock.calls[0]?.[0]).toEqual(
    walletRewardRequestForSubmit,
  );
  expect(expoFetchMock.mock.calls.map(([url]) => String(url))).toEqual([
    'https://us-central1-phraseman-ea0b3.cloudfunctions.net/getLearningV2AccountBinding',
    'https://us-central1-phraseman-ea0b3.cloudfunctions.net/submitLearningV2RequiredSessionCompletion',
    'https://us-central1-phraseman-ea0b3.cloudfunctions.net/resolveLearningV2WalletRewardReceipt',
  ]);
  expect(await outbox.list(localScope)).toEqual([]);
  expect((await AsyncStorage.getAllKeys()).some((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'))).toBe(false);
});

test('a wallet commit failure keeps the accepted bridge and retries the exact reward safely', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const reward = materializeServerWalletRewardReceiptCandidate({
    rewardId: 'required-session-performance-retry-reward',
    operationId: 'wallet-required-session-performance-retry-reward',
    accountScopeHash: serverBinding.economicAccountScopeHash,
    accountGeneration: serverBinding.accountGeneration,
    amountSubunits: 330_000,
    operationReason: 'initial_required_session',
    origin: {
      kind: 'course',
      courseId: 'english-core',
      studyTarget: 'en',
      requiredSessionOrdinal: 1,
    },
  });
  walletRewardRequestForSubmit = Object.freeze({
    schemaVersion: 'learning-v2-server-wallet-reward-request.v1',
    rewardId: reward.receipt.rewardId,
    rewardFingerprint: reward.receipt.rewardFingerprint,
  });
  walletRewardEncoded = reward.encoded;
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-wallet-reward-retry-run',
    session,
    taskResults: session.cards.map((card, index) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: index === 1 ? 2 : 1,
      hintUsed: index === 2,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);
  const successfulCommit = mockCommitServerWalletReward.getMockImplementation();
  if (!successfulCommit) throw new Error('wallet_commit_mock_missing');
  let failOnce = true;
  mockCommitServerWalletReward.mockImplementation(async (...args) => {
    if (failOnce) {
      failOnce = false;
      throw new Error('simulated_wallet_commit_failure');
    }
    return successfulCommit(...args);
  });

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(0);
  expect((await outbox.list(localScope)).find((item) => item.mutationId === mutationId)?.status)
    .toBe('pending');
  expect((await AsyncStorage.getAllKeys()).some((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'))).toBe(true);

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(1);
  expect(mockCommitServerWalletReward).toHaveBeenCalledTimes(2);
  expect(mockCommitServerWalletReward.mock.calls[0]?.[0]).toEqual(
    mockCommitServerWalletReward.mock.calls[1]?.[0],
  );
  expect(await outbox.list(localScope)).toEqual([]);
  expect((await AsyncStorage.getAllKeys()).some((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'))).toBe(false);
});

test('a cut after receipt consumption leaves the exact pending packet for idempotent retry', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-receipt-consume-cut',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);
  let cut = true;
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    await AsyncStorage.multiRemove([key]);
    if (cut && key.startsWith('v2:required-session-completion-receipt:v1:')) {
      cut = false;
      throw new Error('simulated_process_cut_after_receipt_remove');
    }
  });

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(0);
  expect((await outbox.list(localScope)).find((item) => item.mutationId === mutationId)?.status)
    .toBe('pending');
  expect((await AsyncStorage.getAllKeys()).some((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'))).toBe(false);

  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    await AsyncStorage.multiRemove([key]);
  });
  submitCalls.mockClear();
  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(1);
  expect(submitCalls).toHaveBeenCalledTimes(1);
  expect(await outbox.list(localScope)).toEqual([]);
});

test('one scheduler wake drains more than one eight-item transport batch', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  for (let index = 0; index < 9; index += 1) {
    const envelope = materializeRequiredSessionCompletionEnvelope({
      scope: localScope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: 'lesson-1-understand-1',
      sessionRunId: `sync-multi-batch-${index}`,
      session,
      taskResults: session.cards.map((card) => ({
        taskId: card.cardId,
        disposition: 'completed' as const,
        learnerAttempts: 1,
        hintUsed: false,
      })),
    });
    await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  }
  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(9);
  expect(submitCalls).toHaveBeenCalledTimes(9);
  expect(await outbox.list(localScope)).toEqual([]);
});

test('scheduler work count includes permanent rejections so a valid suffix is continued', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const runIds = [
    'sync-permanent-rejection',
    ...Array.from({ length: 7 }, (_, index) => `sync-after-rejection-${index}`),
  ];
  for (const sessionRunId of runIds) {
    const envelope = materializeRequiredSessionCompletionEnvelope({
      scope: localScope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: 'lesson-1-understand-1',
      sessionRunId,
      session,
      taskResults: session.cards.map((card) => ({
        taskId: card.cardId,
        disposition: 'completed' as const,
        learnerAttempts: 1,
        hintUsed: false,
      })),
    });
    await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  }

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(8);
  expect(submitCalls).toHaveBeenCalledTimes(8);
  const remaining = await outbox.list(localScope);
  expect(remaining).toHaveLength(1);
  expect(remaining[0]).toMatchObject({
    status: 'terminal',
    terminalStatus: 'protocol_rejected',
  });
});

test('one exact permanent rejection terminalizes only its mutation and does not block the tail', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const setItemMock = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
  const originalSetItem = setItemMock.getMockImplementation();
  if (!originalSetItem) throw new Error('async_storage_set_item_mock_missing');
  let droppedTerminalWrite = false;
  setItemMock.mockImplementation(async (key, value) => {
    if (!droppedTerminalWrite && key.startsWith('v2:outbox:v2:') &&
      value.includes('"terminalStatus":"protocol_rejected"')) {
      droppedTerminalWrite = true;
      return;
    }
    await originalSetItem(key, value);
  });
  for (const sessionRunId of ['sync-permanent-rejection', 'sync-valid-after-rejection']) {
    const envelope = materializeRequiredSessionCompletionEnvelope({
      scope: localScope,
      episodeId: runtime.payload.episodeId,
      sessionSetId: runtime.sessionSetId,
      sessionSetHash: runtime.sessionSetHash,
      localSessionId: 'lesson-1-understand-1',
      sessionRunId,
      session,
      taskResults: session.cards.map((card) => ({
        taskId: card.cardId,
        disposition: 'completed' as const,
        learnerAttempts: 1,
        hintUsed: false,
      })),
    });
    await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  }
  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(0);
  expect(droppedTerminalWrite).toBe(true);
  let remaining = await outbox.list(localScope);
  expect(remaining).toHaveLength(2);
  expect(remaining.every((item) => item.status === 'pending')).toBe(true);
  expect(submitCalls).toHaveBeenCalledTimes(1);

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(2);
  remaining = await outbox.list(localScope);
  expect(remaining).toHaveLength(1);
  expect(remaining[0]).toMatchObject({
    status: 'terminal',
    terminalStatus: 'protocol_rejected',
  });
  expect(submitCalls).toHaveBeenCalledTimes(3);
  const stored = await Promise.all((await AsyncStorage.getAllKeys()).map(async (key) => ({
    key,
    raw: await AsyncStorage.getItem(key),
  })));
  expect(stored.some(({ raw }) => raw?.includes(
    'learning-v2-required-session-completion-protocol-rejection-local.v1',
  ))).toBe(false);
  setItemMock.mockImplementation(originalSetItem);
});

test('identical rejection details under a retryable status never terminalize the mutation', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-wrong-status-rejection',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);

  await expect(attemptPendingRequiredSessionCompletions()).resolves.toMatchObject({
    processed: 0,
    disposition: 'retryable_failure',
  });
  expect((await outbox.list(localScope)).find((item) => item.mutationId === mutationId))
    .toMatchObject({ status: 'pending' });
  expect((await AsyncStorage.getAllKeys()).some((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'))).toBe(false);
});

test('an unauthenticated submit clears only its used pair and preserves the pending mutation', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-unauthenticated',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);

  await expect(attemptPendingRequiredSessionCompletions()).resolves.toMatchObject({
    processed: 0,
    disposition: 'retryable_failure',
  });
  expect((await outbox.list(localScope)).find((item) => item.mutationId === mutationId))
    .toMatchObject({ status: 'pending' });
  expoFetchMock.mockClear();
  await expect(attemptPendingRequiredSessionCompletions()).resolves.toEqual({
    processed: 0,
    disposition: 'credentials_required',
  });
  expect(expoFetchMock).not.toHaveBeenCalled();
});

test('a late unauthenticated response cannot erase a pair refreshed during the request', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-unauthenticated',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  let releaseSubmit!: () => void;
  submitCallGate = new Promise<void>((resolve) => { releaseSubmit = resolve; });
  const started = new Promise<void>((resolve) => { submitCallStarted = resolve; });
  const flushing = attemptPendingRequiredSessionCompletions();
  await started;

  await expect(withBackgroundNetworkLease('completion.credentials_refresh_test', (lease) =>
    attemptWarmLearningV2CompletionCredentialsCachePreferred(
      captureAccountGeneration(),
      lease,
    ),
  )).resolves.toBe('published');
  releaseSubmit();
  await expect(flushing).resolves.toMatchObject({
    processed: 0,
    disposition: 'retryable_failure',
  });
  expect(learningV2CompletionCredentialCacheState()).toMatchObject({
    hasCredentialPair: true,
  });
  expect((await outbox.list(localScope)).filter((item) => item.status === 'pending'))
    .toHaveLength(1);
});

test('a transitioning account cannot be reactivated by the background flusher', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-account-transition-run',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  invalidateAccountGeneration();

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(0);
  expect(submitCalls).not.toHaveBeenCalled();
  expect((await outbox.list(localScope)).filter((item) => item.status === 'pending'))
    .toHaveLength(1);
  expect((await AsyncStorage.getAllKeys()).some((key) =>
    key.startsWith('v2:required-session-completion-receipt:v1:'))).toBe(false);
});

test('an uninitialized account is never activated by the background flusher', async () => {
  __resetAccountGenerationForTests();

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(0);

  expect(getStableId).not.toHaveBeenCalled();
  expect(captureAccountGeneration()).toMatchObject({
    generation: 0,
    stableId: null,
    phase: 'uninitialized',
  });
  expect(submitCalls).not.toHaveBeenCalled();
});

test('rejects an oversized stored transport outcome before JSON parsing it', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-oversized-outcome-run',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  const mutationId = requiredSessionCompletionMutationId(envelope);
  await outbox.enqueue(localScope, mutationId, envelope);
  const oversized = JSON.stringify({
    schemaVersion: `oversized-${'x'.repeat(17 * 1024)}`,
  });
  await AsyncStorage.setItem(
    `v2:required-session-completion-receipt:v1:${localScope.accountScopeHash}:g${localScope.generation}:${encodeURIComponent(mutationId)}`,
    oversized,
  );
  const parseSpy = jest.spyOn(JSON, 'parse');
  try {
    await expect(flushPendingRequiredSessionCompletions())
      .rejects.toThrow('required_session_completion_receipt_corrupt');
    expect(parseSpy.mock.calls.some(([raw]) => raw === oversized)).toBe(false);
    expect(submitCalls).not.toHaveBeenCalled();
  } finally {
    parseSpy.mockRestore();
  }
});

test('an interactive quiet lease defers every token and callable operation until release', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-interactive-quiet-run',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  const quiet = beginInteractiveNetworkQuiet();
  await waitForInteractiveNetworkQuiet(quiet);

  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(0);
  expect(expoFetchMock).not.toHaveBeenCalled();
  expect(submitCalls).not.toHaveBeenCalled();
  expect((await outbox.list(localScope)).filter((item) => item.status === 'pending'))
    .toHaveLength(1);

  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
  await expect(flushPendingRequiredSessionCompletions()).resolves.toBe(1);
  expect(submitCalls).toHaveBeenCalledTimes(1);
});

test('SESSION_READY fencing waits for a non-cancellable callable to really settle', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-noncancellable-fence-run',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  let releaseBinding!: () => void;
  bindingCallGate = new Promise<void>((resolve) => { releaseBinding = resolve; });
  const started = new Promise<void>((resolve) => { bindingCallStarted = resolve; });
  const flushing = flushPendingRequiredSessionCompletions();
  await started;

  const quiet = beginInteractiveNetworkQuiet();
  let ready = false;
  const fencing = waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });
  await Promise.resolve();
  expect(ready).toBe(false);
  expect(submitCalls).not.toHaveBeenCalled();

  releaseBinding();
  await expect(flushing).resolves.toBe(0);
  await fencing;
  expect(ready).toBe(true);
  expect(submitCalls).not.toHaveBeenCalled();
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
});

test('a submit timeout can never detach native network from the quiet fence', async () => {
  const runtime = getLesson1SessionRuntime();
  const session = runtime.compiled.sessions[0];
  const envelope = materializeRequiredSessionCompletionEnvelope({
    scope: localScope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: 'lesson-1-understand-1',
    sessionRunId: 'sync-submit-fence-run',
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: 'completed' as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
  const outbox = createProgressOutbox(AsyncStorage, () => true);
  await outbox.enqueue(localScope, requiredSessionCompletionMutationId(envelope), envelope);
  let releaseSubmit!: () => void;
  submitCallGate = new Promise<void>((resolve) => { releaseSubmit = resolve; });
  const started = new Promise<void>((resolve) => { submitCallStarted = resolve; });
  const flushing = flushPendingRequiredSessionCompletions();
  await started;

  const quiet = beginInteractiveNetworkQuiet();
  let ready = false;
  const fencing = waitForInteractiveNetworkQuiet(quiet).then(() => { ready = true; });
  await Promise.resolve();
  expect(ready).toBe(false);

  releaseSubmit();
  await expect(flushing).resolves.toBe(0);
  await fencing;
  expect(ready).toBe(true);
  expect((await outbox.list(localScope)).filter((item) => item.status === 'pending'))
    .toHaveLength(1);
  releaseInteractiveNetworkQuiet(quiet);
  await Promise.resolve();
});
