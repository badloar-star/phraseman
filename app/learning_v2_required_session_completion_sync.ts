import AsyncStorage from '@react-native-async-storage/async-storage';
import { detachBoundedWalletJson } from '../modules/learning-v2/contracts/wallet';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
} from './account_generation';
import {
  commitLearningV2ServerWalletReward,
  parseLearningV2AccountBinding,
} from './learning_v2_owner_repository_runtime';
import {
  isInteractiveNetworkDeferredError,
  withBackgroundNetworkLease,
} from './interactive_network_quiet';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getStableId } from './stable_id';
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from '../modules/learning-v2/policies/decision_registry';
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from '../modules/learning-v2/progress/progress_account_scope';
import {
  createProgressOutbox,
  progressOutboxPayloadFingerprint,
  type ProgressOutboxIdentity,
  type ProgressOutboxItem,
} from '../modules/learning-v2/progress/progress_outbox';
import {
  createProgressOutboxFlusher,
  type ProgressOutboxServerReceipt,
} from '../modules/learning-v2/progress/progress_outbox_flush';
import {
  parseRequiredSessionCompletionEnvelope,
  rebindRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
} from '../modules/learning-v2/progress/required_session_completion_envelope';
import { createRequiredSessionLocalCommitCoordinator } from '../modules/learning-v2/progress/required_session_local_commit';
import type { ProgressAccountScope } from '../modules/learning-v2/progress/progress_store';
import {
  clearLearningV2CompletionCredentialHandleIfCurrent,
  peekLearningV2CompletionCredentialHandle,
} from './learning_v2_completion_credential_cache';
import {
  callLearningV2CompletionFunctionViaFetch,
  CompletionCallableProtocolError,
  materializeLearningV2CompletionCallableBody,
  materializeLearningV2CompletionCallableRequest,
} from './learning_v2_completion_callable_fetch';
import {
  parseServerWalletRewardRequest,
  type ServerWalletRewardRequestV1,
} from '../modules/learning-v2/progress/server_wallet_reward_receipt';
const SESSION_IDS = ['understand', 'use', 'master'].flatMap((zone) =>
  [1, 2, 3, 4].map((index) => `lesson-1-${zone}-${index}`));
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9._:-]{8,160}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const RECEIPT_KEY = (scope: ProgressAccountScope, mutationId: string): string =>
  `v2:required-session-completion-receipt:v1:${scope.accountScopeHash}:g${scope.generation}:${encodeURIComponent(mutationId)}`;

interface CompletionTransportBridgeV1 {
  readonly schemaVersion: 'learning-v2-required-session-completion-transport-bridge.v1' |
    'learning-v2-required-session-completion-transport-bridge.v2';
  readonly localMutationId: string;
  readonly localPayloadFingerprint: string;
  readonly serverBinding: ReturnType<typeof parseLearningV2AccountBinding>;
  readonly serverMutationId: string;
  readonly serverPayloadFingerprint: string;
  readonly receipt: ProgressOutboxServerReceipt;
  readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
  readonly bridgeFingerprint: string;
}

interface CompletionProtocolRejectionV1 {
  readonly schemaVersion: 'learning-v2-required-session-completion-protocol-rejection-local.v1';
  readonly localMutationId: string;
  readonly localPayloadFingerprint: string;
  readonly serverBinding: ReturnType<typeof parseLearningV2AccountBinding>;
  readonly serverMutationId: string;
  readonly serverPayloadFingerprint: string;
  readonly reason: 'publication_mismatch' | 'projection_invalid' | 'stored_conflict';
  readonly receipt: ProgressOutboxServerReceipt;
  readonly rejectionFingerprint: string;
}

const exact = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === 'string' && keys.includes(key));
};

const parseServerReceipt = (input: unknown): ProgressOutboxServerReceipt => {
  let value: unknown;
  try {
    value = detachBoundedWalletJson(input, 'required_session_completion_bridge_corrupt');
  } catch {
    throw new Error('required_session_completion_bridge_corrupt');
  }
  if (!isRecord(value) || !exact(value, [
    'schemaVersion', 'receiptId', 'receiptFingerprint',
  ]) || value.schemaVersion !== 'v2-progress-outbox-server-receipt.v1' ||
    typeof value.receiptId !== 'string' || !ID.test(value.receiptId) ||
    typeof value.receiptFingerprint !== 'string' || !HASH.test(value.receiptFingerprint)) {
    throw new Error('required_session_completion_bridge_corrupt');
  }
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    receiptId: value.receiptId,
    receiptFingerprint: value.receiptFingerprint,
  });
};

const parseProtocolRejectionDetails = (
  error: unknown,
  expectedServerIdentity: ProgressOutboxIdentity,
): Readonly<{
  reason: CompletionProtocolRejectionV1['reason'];
  receipt: ProgressOutboxServerReceipt;
}> | null => {
  if (!(error instanceof CompletionCallableProtocolError) ||
    error.status !== 'FAILED_PRECONDITION') return null;
  const descriptor = Object.getOwnPropertyDescriptor(error, 'details');
  if (!descriptor || !('value' in descriptor)) return null;
  let details: unknown;
  try {
    details = detachBoundedWalletJson(
      descriptor.value,
      'required_session_completion_rejection_invalid',
    );
  } catch {
    return null;
  }
  if (!isRecord(details) || !exact(details, [
    'schemaVersion', 'mutationId', 'payloadFingerprint', 'reason', 'receipt',
  ]) || details.schemaVersion !==
      'learning-v2-required-session-completion-protocol-rejection.v1' ||
    details.mutationId !== expectedServerIdentity.mutationId ||
    details.payloadFingerprint !== expectedServerIdentity.payloadFingerprint ||
    (details.reason !== 'publication_mismatch' &&
      details.reason !== 'projection_invalid' && details.reason !== 'stored_conflict')) {
    return null;
  }
  try {
    return Object.freeze({
      reason: details.reason,
      receipt: parseServerReceipt(details.receipt),
    });
  } catch {
    return null;
  }
};

const parseTransportBridge = (raw: string): CompletionTransportBridgeV1 => {
  if (raw.length > 16 * 1024) throw new Error('required_session_completion_bridge_corrupt');
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch {
    throw new Error('required_session_completion_bridge_corrupt');
  }
  if (!isRecord(value) ||
    (value.schemaVersion !== 'learning-v2-required-session-completion-transport-bridge.v1' &&
      value.schemaVersion !== 'learning-v2-required-session-completion-transport-bridge.v2') ||
    !exact(value, value.schemaVersion.endsWith('.v2') ? [
      'schemaVersion', 'localMutationId', 'localPayloadFingerprint', 'serverBinding',
      'serverMutationId', 'serverPayloadFingerprint', 'receipt', 'walletRewardRequest',
      'bridgeFingerprint',
    ] : [
      'schemaVersion', 'localMutationId', 'localPayloadFingerprint', 'serverBinding',
      'serverMutationId', 'serverPayloadFingerprint', 'receipt', 'bridgeFingerprint',
    ]) ||
    typeof value.localMutationId !== 'string' || !ID.test(value.localMutationId) ||
    typeof value.localPayloadFingerprint !== 'string' || !HASH.test(value.localPayloadFingerprint) ||
    typeof value.serverMutationId !== 'string' || !ID.test(value.serverMutationId) ||
    typeof value.serverPayloadFingerprint !== 'string' || !HASH.test(value.serverPayloadFingerprint) ||
    typeof value.bridgeFingerprint !== 'string' || !HASH.test(value.bridgeFingerprint)) {
    throw new Error('required_session_completion_bridge_corrupt');
  }
  const body = {
    schemaVersion: value.schemaVersion,
    localMutationId: value.localMutationId,
    localPayloadFingerprint: value.localPayloadFingerprint,
    serverBinding: parseLearningV2AccountBinding(value.serverBinding),
    serverMutationId: value.serverMutationId,
    serverPayloadFingerprint: value.serverPayloadFingerprint,
    receipt: parseServerReceipt(value.receipt),
    walletRewardRequest: value.schemaVersion.endsWith('.v1')
      ? null
      : value.walletRewardRequest === null
      ? null
      : parseServerWalletRewardRequest(value.walletRewardRequest),
  } as const;
  const hashedBody = value.schemaVersion.endsWith('.v1')
    ? Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'walletRewardRequest'))
    : body;
  if (hashCanonicalBody(hashedBody) !== value.bridgeFingerprint ||
    canonicalJsonV1({ ...hashedBody, bridgeFingerprint: value.bridgeFingerprint }) !== raw) {
    throw new Error('required_session_completion_bridge_corrupt');
  }
  return Object.freeze({ ...body, bridgeFingerprint: value.bridgeFingerprint });
};

const parseStoredProtocolRejection = (raw: string): CompletionProtocolRejectionV1 => {
  if (raw.length > 16 * 1024) throw new Error('required_session_completion_rejection_corrupt');
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch {
    throw new Error('required_session_completion_rejection_corrupt');
  }
  if (!isRecord(value) || !exact(value, [
    'schemaVersion', 'localMutationId', 'localPayloadFingerprint', 'serverBinding',
    'serverMutationId', 'serverPayloadFingerprint', 'reason', 'receipt',
    'rejectionFingerprint',
  ]) || value.schemaVersion !==
      'learning-v2-required-session-completion-protocol-rejection-local.v1' ||
    typeof value.localMutationId !== 'string' || !ID.test(value.localMutationId) ||
    typeof value.localPayloadFingerprint !== 'string' ||
      !HASH.test(value.localPayloadFingerprint) ||
    typeof value.serverMutationId !== 'string' || !ID.test(value.serverMutationId) ||
    typeof value.serverPayloadFingerprint !== 'string' ||
      !HASH.test(value.serverPayloadFingerprint) ||
    (value.reason !== 'publication_mismatch' && value.reason !== 'projection_invalid' &&
      value.reason !== 'stored_conflict') ||
    typeof value.rejectionFingerprint !== 'string' ||
      !HASH.test(value.rejectionFingerprint)) {
    throw new Error('required_session_completion_rejection_corrupt');
  }
  const body = {
    schemaVersion: value.schemaVersion,
    localMutationId: value.localMutationId,
    localPayloadFingerprint: value.localPayloadFingerprint,
    serverBinding: parseLearningV2AccountBinding(value.serverBinding),
    serverMutationId: value.serverMutationId,
    serverPayloadFingerprint: value.serverPayloadFingerprint,
    reason: value.reason,
    receipt: parseServerReceipt(value.receipt),
  } as const;
  if (hashCanonicalBody(body) !== value.rejectionFingerprint ||
    canonicalJsonV1({ ...body, rejectionFingerprint: value.rejectionFingerprint }) !== raw) {
    throw new Error('required_session_completion_rejection_corrupt');
  }
  return Object.freeze({ ...body, rejectionFingerprint: value.rejectionFingerprint });
};

const parseStoredTransportOutcome = (raw: string): Readonly<
  { kind: 'accepted'; bridge: CompletionTransportBridgeV1 } |
  { kind: 'protocol_rejected'; rejection: CompletionProtocolRejectionV1 }
> => {
  try {
    // Fast code-unit cap prevents the exact UTF-8 counter from allocating for
    // an arbitrarily large corrupt AsyncStorage value. The second check keeps
    // the true byte boundary for multibyte text.
    if (raw.length > 16 * 1024 || utf8ByteLengthV1(raw) > 16 * 1024) {
      throw new Error('required_session_completion_receipt_corrupt');
    }
  } catch {
    throw new Error('required_session_completion_receipt_corrupt');
  }
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch {
    throw new Error('required_session_completion_receipt_corrupt');
  }
  if (!isRecord(value) || typeof value.schemaVersion !== 'string') {
    throw new Error('required_session_completion_receipt_corrupt');
  }
  if (value.schemaVersion === 'learning-v2-required-session-completion-transport-bridge.v1' ||
    value.schemaVersion === 'learning-v2-required-session-completion-transport-bridge.v2') {
    return Object.freeze({ kind: 'accepted', bridge: parseTransportBridge(raw) });
  }
  if (value.schemaVersion ===
      'learning-v2-required-session-completion-protocol-rejection-local.v1') {
    return Object.freeze({
      kind: 'protocol_rejected',
      rejection: parseStoredProtocolRejection(raw),
    });
  }
  throw new Error('required_session_completion_receipt_corrupt');
};

const isRequiredSessionCompletion = (item: ProgressOutboxItem): boolean => {
  try {
    parseRequiredSessionCompletionEnvelope(item.payload);
    return true;
  } catch {
    return false;
  }
};

const persistTransportBridge = async (
  storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem'>,
  scope: ProgressAccountScope,
  identity: ProgressOutboxIdentity,
  bridge: Omit<CompletionTransportBridgeV1, 'bridgeFingerprint'>,
): Promise<void> => {
  if (bridge.localMutationId !== identity.mutationId ||
    bridge.localPayloadFingerprint !== identity.payloadFingerprint) {
    throw new Error('required_session_completion_bridge_identity_mismatch');
  }
  const encoded = canonicalJsonV1({ ...bridge, bridgeFingerprint: hashCanonicalBody(bridge) });
  const key = RECEIPT_KEY(scope, identity.mutationId);
  const existing = await storage.getItem(key);
  if (existing !== null && existing !== encoded) {
    throw new Error('required_session_completion_receipt_conflict');
  }
  if (existing === null) {
    await storage.setItem(key, encoded);
    if (await storage.getItem(key) !== encoded) {
      throw new Error('required_session_completion_receipt_indeterminate');
    }
  }
};

const persistProtocolRejection = async (
  storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem'>,
  scope: ProgressAccountScope,
  identity: ProgressOutboxIdentity,
  rejection: Omit<CompletionProtocolRejectionV1, 'rejectionFingerprint'>,
): Promise<void> => {
  if (rejection.localMutationId !== identity.mutationId ||
    rejection.localPayloadFingerprint !== identity.payloadFingerprint) {
    throw new Error('required_session_completion_rejection_identity_mismatch');
  }
  const encoded = canonicalJsonV1({
    ...rejection,
    rejectionFingerprint: hashCanonicalBody(rejection),
  });
  const key = RECEIPT_KEY(scope, identity.mutationId);
  const existing = await storage.getItem(key);
  if (existing !== null && existing !== encoded) {
    throw new Error('required_session_completion_receipt_conflict');
  }
  if (existing === null) {
    await storage.setItem(key, encoded);
    if (await storage.getItem(key) !== encoded) {
      throw new Error('required_session_completion_receipt_indeterminate');
    }
  }
};

const consumeStoredTransportOutcomeExactly = async (
  storage: Pick<typeof AsyncStorage, 'getItem' | 'removeItem'>,
  scope: ProgressAccountScope,
  identity: ProgressOutboxIdentity,
): Promise<void> => {
  const key = RECEIPT_KEY(scope, identity.mutationId);
  const raw = await storage.getItem(key);
  if (raw === null) throw new Error('required_session_completion_receipt_missing');
  const outcome = parseStoredTransportOutcome(raw);
  const stored = outcome.kind === 'accepted' ? outcome.bridge : outcome.rejection;
  if (stored.localMutationId !== identity.mutationId ||
    stored.localPayloadFingerprint !== identity.payloadFingerprint) {
    throw new Error('required_session_completion_bridge_identity_mismatch');
  }
  await storage.removeItem(key);
  if (await storage.getItem(key) !== null) {
    throw new Error('required_session_completion_receipt_indeterminate');
  }
};

/**
 * Uploads completed sessions after the learner has left the active session.
 * The session route never imports or calls this module.
 */
export type RequiredSessionCompletionSyncAttempt = Readonly<{
  processed: number;
  disposition: 'drained' | 'bounded_continuation' | 'retryable_failure' |
    'credentials_required' | 'deferred';
}>;

const syncAttempt = (
  processed: number,
  disposition: RequiredSessionCompletionSyncAttempt['disposition'],
): RequiredSessionCompletionSyncAttempt => Object.freeze({ processed, disposition });

export const attemptPendingRequiredSessionCompletions = async ():
Promise<RequiredSessionCompletionSyncAttempt> => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return syncAttempt(0, 'drained');
  const captured = await withAccountTransitionLock(async () => {
    const token = captureAccountGeneration();
    if (token.phase !== 'active' || !token.stableId) return null;
    const stableId = await getStableId();
    return isCurrentAccountGeneration(token, stableId)
      ? Object.freeze({ stableId, token })
      : null;
  });
  // Background work may observe an active account, but it must never activate
  // or resurrect one while sign-out/account-switch is transitioning.
  if (!captured) return syncAttempt(0, 'deferred');
  const { stableId, token } = captured;
  const scope: ProgressAccountScope = {
    stableId,
    generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
    accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(stableId),
    seasonId: 'learning-v2',
    studyTarget: 'en',
    learnerSourceLocale: 'ru',
  };
  const isCurrent = (candidate: ProgressAccountScope): boolean =>
    isCurrentAccountGeneration(token, candidate.stableId);
  const withLocalAccountLock = <T>(work: () => Promise<T>): Promise<T> =>
    withAccountTransitionLock(async () => {
      if (!isCurrent(scope)) throw new Error('progress_generation_stale');
      const value = await work();
      if (!isCurrent(scope)) throw new Error('progress_generation_stale');
      return value;
    });
  const transportStorage = Object.freeze({
    getItem: AsyncStorage.getItem.bind(AsyncStorage),
    setItem: AsyncStorage.setItem.bind(AsyncStorage),
    removeItem: AsyncStorage.removeItem.bind(AsyncStorage),
    getAllKeys: AsyncStorage.getAllKeys.bind(AsyncStorage),
    operationTimeoutMs: null,
  });
  const outbox = createProgressOutbox(transportStorage, isCurrent);
  const localCommit = createRequiredSessionLocalCommitCoordinator(
    transportStorage,
    isCurrent,
    SESSION_IDS,
  );
  let redeemWalletReward: ((request: ServerWalletRewardRequestV1) => Promise<void>) | null = null;
  const repository = {
    list: (candidate: ProgressAccountScope) => withLocalAccountLock(async () =>
      (await outbox.list(candidate)).filter(isRequiredSessionCompletion)),
    acknowledge: (
      candidate: ProgressAccountScope,
      identity: ProgressOutboxIdentity,
      terminalStatus: 'protocol_rejected',
    ) => withLocalAccountLock(async () => {
      // Consume the transport-only receipt before changing the outbox. A cut
      // here leaves the exact pending payload, which safely retries against
      // the idempotent server inbox; no per-session receipt survives forever.
      await consumeStoredTransportOutcomeExactly(AsyncStorage, candidate, identity);
      const result = await outbox.acknowledge(candidate, identity, terminalStatus);
      const observed = (await outbox.list(candidate)).find((item) =>
        item.mutationId === identity.mutationId);
      if (!observed || observed.payloadFingerprint !== identity.payloadFingerprint ||
        observed.status !== 'terminal' || observed.terminalStatus !== terminalStatus) {
        throw new Error('required_session_completion_outbox_indeterminate');
      }
      return result;
    }),
    completeAccepted: async (
      candidate: ProgressAccountScope,
      identity: ProgressOutboxIdentity,
    ) => {
      const raw = await withLocalAccountLock(() =>
        AsyncStorage.getItem(RECEIPT_KEY(candidate, identity.mutationId)));
      if (raw === null) throw new Error('required_session_completion_receipt_missing');
      const outcome = parseStoredTransportOutcome(raw);
      if (outcome.kind !== 'accepted') {
        throw new Error('required_session_completion_bridge_identity_mismatch');
      }
      if (outcome.bridge.walletRewardRequest !== null) {
        if (!redeemWalletReward) {
          throw new Error('required_session_completion_wallet_redemption_required');
        }
        await redeemWalletReward(outcome.bridge.walletRewardRequest);
      }
      return withLocalAccountLock(async () => {
        await consumeStoredTransportOutcomeExactly(AsyncStorage, candidate, identity);
        const result = await outbox.completeAccepted(candidate, identity);
        const observed = (await outbox.list(candidate)).find((item) =>
          item.mutationId === identity.mutationId);
        if (observed) throw new Error('required_session_completion_outbox_indeterminate');
        return result;
      });
    },
  };
  let compacted = 0;
  for (const item of await repository.list(scope)) {
    if (item.status !== 'pending') continue;
    const raw = await withLocalAccountLock(() =>
      AsyncStorage.getItem(RECEIPT_KEY(scope, item.mutationId)));
    if (raw === null) continue;
    const outcome = parseStoredTransportOutcome(raw);
    const stored = outcome.kind === 'accepted' ? outcome.bridge : outcome.rejection;
    if (stored.localMutationId !== item.mutationId ||
      stored.localPayloadFingerprint !== item.payloadFingerprint) {
      throw new Error('required_session_completion_bridge_identity_mismatch');
    }
    const rebound = rebindRequiredSessionCompletionEnvelope(item.payload, {
      accountScopeHash: stored.serverBinding.progressAccountScopeHash,
      accountGeneration: stored.serverBinding.accountGeneration,
    });
    if (requiredSessionCompletionMutationId(rebound) !== stored.serverMutationId ||
      progressOutboxPayloadFingerprint(rebound) !== stored.serverPayloadFingerprint) {
      throw new Error('required_session_completion_bridge_identity_mismatch');
    }
    if (outcome.kind === 'accepted') {
      // A wallet-bearing bridge needs the authenticated protected-receipt
      // resolver below. Keep both bridge and outbox bytes until that credit is
      // durably committed; a restart may safely resume the same request.
      if (outcome.bridge.walletRewardRequest !== null) continue;
      await repository.completeAccepted(scope, item);
    } else await repository.acknowledge(scope, item, 'protocol_rejected');
    compacted += 1;
  }
  // Move as many crash-safe spool entries as the bounded transport outbox can
  // currently hold. Overflow stays as one durable entry per completed run.
  await withLocalAccountLock(() => localCommit.recover(scope));
  const pendingBeforeNetwork = (await repository.list(scope)).some((item) =>
    item.status === 'pending');
  if (!pendingBeforeNetwork) return syncAttempt(compacted, 'drained');
  const credentialHandle = peekLearningV2CompletionCredentialHandle(token);
  if (!credentialHandle) return syncAttempt(compacted, 'credentials_required');
  try {
    return await withBackgroundNetworkLease('completion.sync', async (networkLease) => {
      try {
      if (peekLearningV2CompletionCredentialHandle(token) !== credentialHandle ||
        !isCurrent(scope)) {
        return syncAttempt(compacted, 'retryable_failure');
      }
      networkLease.assertCurrent();
      const bindingResponse = await callLearningV2CompletionFunctionViaFetch(
        materializeLearningV2CompletionCallableRequest(
          'getLearningV2AccountBinding',
          credentialHandle,
          materializeLearningV2CompletionCallableBody(
            'getLearningV2AccountBinding',
            '{}',
          ),
          networkLease,
        ),
      );
      networkLease.assertCurrent();
      const binding = parseLearningV2AccountBinding(bindingResponse);
      if (binding.stableUid !== stableId || !isCurrent(scope)) {
        return syncAttempt(compacted, 'retryable_failure');
      }
      redeemWalletReward = async (request) => {
        networkLease.assertCurrent();
        if (!isCurrent(scope)) throw new Error('progress_generation_stale');
        const result = await commitLearningV2ServerWalletReward(request, {
          accountToken: token,
          resolveAccountBinding: async () => binding,
          resolveRewardReceipt: async (resolutionRequest) => {
            networkLease.assertCurrent();
            const response = await callLearningV2CompletionFunctionViaFetch(
              materializeLearningV2CompletionCallableRequest(
                'resolveLearningV2WalletRewardReceipt',
                credentialHandle,
                materializeLearningV2CompletionCallableBody(
                  'resolveLearningV2WalletRewardReceipt',
                  canonicalJsonV1(resolutionRequest),
                ),
                networkLease,
              ),
            );
            networkLease.assertCurrent();
            let detached: unknown;
            try {
              detached = detachBoundedWalletJson(
                response,
                'learning_v2_wallet_reward_resolution_invalid',
              );
            } catch {
              throw new Error('learning_v2_wallet_reward_resolution_invalid');
            }
            if (!isRecord(detached) || !exact(detached, [
              'schemaVersion', 'rewardId', 'rewardFingerprint', 'encoded',
            ]) || detached.schemaVersion !==
                'learning-v2-server-wallet-reward-resolution.v1' ||
              detached.rewardId !== resolutionRequest.rewardId ||
              detached.rewardFingerprint !== resolutionRequest.rewardFingerprint ||
              typeof detached.encoded !== 'string') {
              throw new Error('learning_v2_wallet_reward_resolution_invalid');
            }
            return detached.encoded;
          },
        });
        networkLease.assertCurrent();
        if (!isCurrent(scope)) throw new Error('progress_generation_stale');
        if (result.snapshot.walletState.accountScopeHash !==
          binding.economicAccountScopeHash) {
          throw new Error('learning_v2_wallet_reward_resolution_invalid');
        }
      };
      const submitCallableName =
        'submitLearningV2RequiredSessionCompletion' as const;
      const bridges = new Map<string, Omit<CompletionTransportBridgeV1, 'bridgeFingerprint'>>();
      const rejections = new Map<string, Omit<CompletionProtocolRejectionV1,
        'rejectionFingerprint'>>();
      const pendingServerCoordinates = new Map<string, ProgressOutboxIdentity>();
      const flusher = createProgressOutboxFlusher({
        scope,
        repository,
        isCurrentGeneration: isCurrent,
        submit: async (item) => {
          networkLease.assertCurrent();
          const payload = rebindRequiredSessionCompletionEnvelope(item.payload, {
            accountScopeHash: binding.progressAccountScopeHash,
            accountGeneration: binding.accountGeneration,
          });
          const mutationId = requiredSessionCompletionMutationId(payload);
          const payloadFingerprint = progressOutboxPayloadFingerprint(payload);
          pendingServerCoordinates.set(item.mutationId, Object.freeze({
            mutationId,
            payloadFingerprint,
          }));
          networkLease.assertCurrent();
          const serverResponse = await callLearningV2CompletionFunctionViaFetch(
            materializeLearningV2CompletionCallableRequest(
              submitCallableName,
              credentialHandle,
              materializeLearningV2CompletionCallableBody(
                submitCallableName,
                canonicalJsonV1({ mutationId, payloadFingerprint, payload }),
              ),
              networkLease,
            ),
          );
          networkLease.assertCurrent();
          let server: unknown;
          try {
            server = detachBoundedWalletJson(
              serverResponse,
              'required_session_completion_server_ack_invalid',
            );
          } catch {
            throw new Error('required_session_completion_server_ack_invalid');
          }
          if (!isRecord(server) || !exact(server, [
            'kind', 'mutationId', 'payloadFingerprint', 'duplicate', 'receipt',
            'walletRewardRequest',
          ]) || server.kind !== 'accepted' ||
            server.mutationId !== mutationId ||
            server.payloadFingerprint !== payloadFingerprint ||
            typeof server.duplicate !== 'boolean') {
            throw new Error('required_session_completion_server_ack_invalid');
          }
          const receipt = parseServerReceipt(server.receipt);
          const walletRewardRequest = server.walletRewardRequest === null
            ? null
            : parseServerWalletRewardRequest(server.walletRewardRequest);
          bridges.set(item.mutationId, Object.freeze({
            schemaVersion: 'learning-v2-required-session-completion-transport-bridge.v2',
            localMutationId: item.mutationId,
            localPayloadFingerprint: item.payloadFingerprint,
            serverBinding: binding,
            serverMutationId: mutationId,
            serverPayloadFingerprint: payloadFingerprint,
            receipt,
            walletRewardRequest,
          }));
          return Object.freeze({
            kind: 'accepted' as const,
            mutationId: item.mutationId,
            payloadFingerprint: item.payloadFingerprint,
            duplicate: server.duplicate,
            receipt,
          });
        },
    classifyError: (error, item) => {
      if (error instanceof CompletionCallableProtocolError &&
        error.status === 'UNAUTHENTICATED') {
        clearLearningV2CompletionCredentialHandleIfCurrent(credentialHandle);
      }
      const expectedServerIdentity = pendingServerCoordinates.get(item.mutationId);
      if (!expectedServerIdentity) return { kind: 'retryable' as const };
      const details = parseProtocolRejectionDetails(error, expectedServerIdentity);
      if (!details) return { kind: 'retryable' as const };
      const rejection = Object.freeze({
        schemaVersion: 'learning-v2-required-session-completion-protocol-rejection-local.v1' as const,
        localMutationId: item.mutationId,
        localPayloadFingerprint: item.payloadFingerprint,
        serverBinding: binding,
        serverMutationId: expectedServerIdentity.mutationId,
        serverPayloadFingerprint: expectedServerIdentity.payloadFingerprint,
        reason: details.reason,
        receipt: details.receipt,
      });
      rejections.set(item.mutationId, rejection);
      return {
        kind: 'mutation_local_protocol_rejected' as const,
        acknowledgement: Object.freeze({
          kind: 'protocol_rejected' as const,
          mutationId: item.mutationId,
          payloadFingerprint: item.payloadFingerprint,
          receipt: details.receipt,
        }),
      };
    },
    persistAcknowledgementIdempotently: (identity, acknowledgement) => {
      if (acknowledgement.kind === 'protocol_rejected') {
        const rejection = rejections.get(identity.mutationId);
        if (!rejection || rejection.receipt.receiptFingerprint !==
          acknowledgement.receipt.receiptFingerprint) {
          throw new Error('required_session_completion_rejection_missing');
        }
        return withLocalAccountLock(() => persistProtocolRejection(
          AsyncStorage,
          scope,
          identity,
          rejection,
        ));
      }
      const bridge = bridges.get(identity.mutationId);
      if (!bridge || bridge.receipt.receiptFingerprint !==
        acknowledgement.receipt.receiptFingerprint) {
        throw new Error('required_session_completion_bridge_missing');
      }
      return withLocalAccountLock(() => persistTransportBridge(
        AsyncStorage,
        scope,
        identity,
        bridge,
      ));
    },
    maxItems: 8,
    // The surrounding lease must not detach a still-live native callable on a
    // Promise.race timeout. This proves honest settlement for the scheduler;
    // the separate session-entry overlap remains an explicit release boundary.
    operationTimeoutMs: null,
  });
      let processed = 0;
      let retryable = false;
      let continuationNeeded = false;
  // One scheduler wake drains every currently reachable page in bounded
  // eight-item transport batches. A retryable network failure stops without a
  // busy loop; the next foreground/connectivity wake resumes from exact bytes.
      for (let batch = 0; batch < 16; batch += 1) {
        networkLease.assertCurrent();
        const result = await flusher.flush();
        networkLease.assertCurrent();
        // Scheduler continuation is about bounded terminal work, not only
        // successful submissions. A permanent rejection also consumes one of
        // the 128 slots and must not hide a still-valid suffix.
        processed += result.accepted + result.terminalRejected;
        if (result.stoppedBy === 'retryable_failure' ||
          result.stoppedBy === 'receipt_required') {
          retryable = true;
          break;
        }
        const repaired = await withLocalAccountLock(() => localCommit.recover(scope));
        networkLease.assertCurrent();
        continuationNeeded = result.remainingPending > 0 || repaired > 0;
        if (!continuationNeeded) break;
      }
      if (retryable) return syncAttempt(compacted + processed, 'retryable_failure');
      return syncAttempt(
        compacted + processed,
        processed >= 16 * 8 && continuationNeeded ? 'bounded_continuation' : 'drained',
      );
      } catch (error) {
        if (error instanceof CompletionCallableProtocolError &&
          error.status === 'UNAUTHENTICATED') {
          clearLearningV2CompletionCredentialHandleIfCurrent(credentialHandle);
        }
        // A direct fetch may report its own abort after the native stream has
        // actually settled. Re-assert the owning lease so interactive quiet is
        // classified as deferred rather than as a retryable transport defect.
        networkLease.assertCurrent();
        throw error;
      }
    });
  } catch (error) {
    if (isInteractiveNetworkDeferredError(error)) return syncAttempt(compacted, 'deferred');
    throw error;
  }
};

/** Backwards-compatible numeric result for existing maintenance callers/tests. */
export const flushPendingRequiredSessionCompletions = async (): Promise<number> =>
  (await attemptPendingRequiredSessionCompletions()).processed;
