import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import {
  createOwnerRepository,
  type OwnerRepositoryActiveOwnerFence,
  type OwnerRepositoryCasStorage,
  type OwnerRepositoryScope,
  type OwnerRepositoryCourseUnlockCommitResult,
  type OwnerRepositoryWalletCreditCommitResult,
} from '../modules/learning-v2/progress/owner_repository';
import { createServerWalletRewardReceiptAuthority } from '../modules/learning-v2/progress/server_wallet_reward_receipt';
import type { ServerWalletRewardRequestV1 } from '../modules/learning-v2/progress/server_wallet_reward_receipt';
import {
  createServerCourseUnlockReceiptAuthority,
  parseServerCourseUnlockRequest,
  type ServerCourseUnlockRequestV1,
} from '../modules/learning-v2/progress/server_course_unlock_receipt';
import { detachBoundedWalletJson } from '../modules/learning-v2/contracts/wallet';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import { deriveProgressAccountScopeHash } from '../modules/learning-v2/progress/progress_account_scope';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import type { CoinExchangeWalletRewardRequest } from './coin_exchange_client';
import { publishLearningV2WalletBalanceState } from './learning_v2_wallet_balance_store';
import {
  createMistakeCorrectionCompositeAuthority,
  parseMistakeCorrectionWalletComposite,
  type MistakeCorrectionWalletCompositeV1,
} from '../modules/learning-v2/progress/mistake_correction_wallet_composite';
import {
  createLearningV2SessionRuneRewardPreparedIntentV1,
  createLearningV2SessionRuneRewardProtectedIntentReceiptV1,
  createLearningV2SessionRuneRewardCompositeAuthorityV1,
  deriveLearningV2SessionRuneRewardOperationIdV1,
  parseLearningV2SessionRuneRewardPreparedIntentV1,
  parseLearningV2SessionRuneRewardProtectedIntentReceiptV1,
  parseLearningV2SessionRuneRewardCompositeV1,
  restoreLearningV2SessionRuneRewardPublicationTokenV1,
  type LearningV2SessionRuneRewardPreparedIntentV1,
  type LearningV2SessionRuneRewardProtectedIntentReceiptV1,
  type LearningV2SessionRuneRewardCompositeV1,
  type LearningV2SessionRuneRewardPublicationTokenV1,
} from '../modules/learning-v2/progress/learning_session_rune_reward_composite_v1';
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from '../modules/learning-v2/policies/decision_registry';
import { admitCurrentLearningV2CourseSessionPublicationV3 } from './learning_v2_course_released_session_client_v3';

export interface LearningV2AccountBindingV1 {
  readonly schemaVersion: 'learning-v2-account-binding.v2';
  readonly stableUid: string;
  readonly accountGeneration: number;
  readonly economicAccountScopeHash: string;
  readonly progressAccountScopeHash: string;
}

type RuntimeStorage = OwnerRepositoryCasStorage & {
  removeItem?(key: string): Promise<void>;
};

export interface LearningV2OwnerRepositoryRuntimeDependencies {
  readonly storage?: RuntimeStorage;
  readonly resolveAccountBinding?: () => Promise<unknown>;
  readonly resolveRewardReceipt?: (input: {
    readonly accountScopeHash: string;
    readonly rewardId: string;
    readonly rewardFingerprint: string;
  }) => Promise<unknown>;
  readonly resolveCourseUnlockReceipt?: (input: {
    readonly accountScopeHash: string;
    readonly operationId: string;
    readonly courseId: string;
    readonly studyTarget: string;
    readonly unlockId: string;
    readonly unlockFingerprint: string;
  }) => Promise<unknown>;
  readonly accountToken?: AccountGenerationToken;
  readonly sessionRuneRewardPublicationToken?:
    LearningV2SessionRuneRewardPublicationTokenV1;
  readonly sessionRuneRewardIntentStorage?:
    LearningV2SessionRuneRewardIntentStorageV1;
  readonly sessionRuneRewardProtectedReceiptStorage?:
    LearningV2SessionRuneRewardProtectedReceiptStorageV1;
}

export interface LearningV2SessionRuneRewardIntentStorageV1 {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

export interface LearningV2SessionRuneRewardProtectedReceiptStorageV1 {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const SESSION_RUNE_REWARD_INTENT_PREFIX =
  'learning-v2:session-rune-reward-intent:v1:';

const defaultSessionRuneRewardIntentStorage =
  AsyncStorage as LearningV2SessionRuneRewardIntentStorageV1;

type SecureStoreModule = typeof import('expo-secure-store');
let secureStoreCache: SecureStoreModule | null | false = false;
const SESSION_RUNE_REWARD_SECURE_STORE_SERVICE =
  'phraseman.learning_v2.rune_reward_intent.v1';

function requireSessionRuneRewardSecureStore(): SecureStoreModule {
  if (secureStoreCache === false) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      secureStoreCache = require('expo-secure-store') as SecureStoreModule;
    } catch {
      secureStoreCache = null;
    }
  }
  if (!secureStoreCache) {
    throw new Error('learning_v2_session_rune_reward_secure_store_unavailable');
  }
  return secureStoreCache;
}

function sessionRuneRewardSecureStoreOptions(
  secureStore: SecureStoreModule,
): import('expo-secure-store').SecureStoreOptions {
  return {
    keychainService: SESSION_RUNE_REWARD_SECURE_STORE_SERVICE,
    keychainAccessible: secureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  };
}

const defaultSessionRuneRewardProtectedReceiptStorage:
LearningV2SessionRuneRewardProtectedReceiptStorageV1 = Object.freeze({
  async getItem(key: string) {
    const secureStore = requireSessionRuneRewardSecureStore();
    return secureStore.getItemAsync(
      key,
      sessionRuneRewardSecureStoreOptions(secureStore),
    );
  },
  async setItem(key: string, value: string) {
    const secureStore = requireSessionRuneRewardSecureStore();
    await secureStore.setItemAsync(
      key,
      value,
      sessionRuneRewardSecureStoreOptions(secureStore),
    );
  },
  async removeItem(key: string) {
    const secureStore = requireSessionRuneRewardSecureStore();
    await secureStore.deleteItemAsync(
      key,
      sessionRuneRewardSecureStoreOptions(secureStore),
    );
  },
});

const sessionRuneRewardIntentPrefix = (accountScopeHash: string): string =>
  `${SESSION_RUNE_REWARD_INTENT_PREFIX}${accountScopeHash}:`;

const sessionRuneRewardIntentKey = (
  intent: LearningV2SessionRuneRewardPreparedIntentV1,
): string => `${sessionRuneRewardIntentPrefix(intent.candidate.accountScopeHash)}${
  encodeURIComponent(deriveLearningV2SessionRuneRewardOperationIdV1(intent.candidate))
}`;

const sessionRuneRewardProtectedReceiptKey = (
  intent: LearningV2SessionRuneRewardPreparedIntentV1,
): string => `learning_v2_rune_reward_intent_v1_${hashCanonicalBody({
  accountScopeHash: intent.candidate.accountScopeHash,
  operationId: deriveLearningV2SessionRuneRewardOperationIdV1(intent.candidate),
})}`;

function assertProtectedReceiptMatchesIntent(
  receiptInput: LearningV2SessionRuneRewardProtectedIntentReceiptV1,
  intent: LearningV2SessionRuneRewardPreparedIntentV1,
): LearningV2SessionRuneRewardProtectedIntentReceiptV1 {
  const receipt =
    parseLearningV2SessionRuneRewardProtectedIntentReceiptV1(receiptInput);
  if (receipt.accountScopeHash !== intent.candidate.accountScopeHash ||
    receipt.operationId !==
      deriveLearningV2SessionRuneRewardOperationIdV1(intent.candidate) ||
    receipt.intentFingerprint !== intent.intentFingerprint) {
    throw new Error('learning_v2_session_rune_reward_protected_receipt_mismatch');
  }
  return receipt;
}

async function readLearningV2SessionRuneRewardProtectedIntentReceiptV1(
  intent: LearningV2SessionRuneRewardPreparedIntentV1,
  storage: LearningV2SessionRuneRewardProtectedReceiptStorageV1,
): Promise<LearningV2SessionRuneRewardProtectedIntentReceiptV1> {
  const raw = await storage.getItem(
    sessionRuneRewardProtectedReceiptKey(intent),
  );
  if (raw === null) {
    throw new Error('learning_v2_session_rune_reward_protected_receipt_missing');
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('learning_v2_session_rune_reward_protected_receipt_invalid');
  }
  const receipt = parseLearningV2SessionRuneRewardProtectedIntentReceiptV1(
    decoded,
  );
  if (canonicalJsonV1(receipt) !== raw) {
    throw new Error('learning_v2_session_rune_reward_protected_receipt_invalid');
  }
  return assertProtectedReceiptMatchesIntent(receipt, intent);
}

export async function persistLearningV2SessionRuneRewardPreparedIntentV1(
  intentInput: LearningV2SessionRuneRewardPreparedIntentV1,
  publicationToken: LearningV2SessionRuneRewardPublicationTokenV1,
  storage: LearningV2SessionRuneRewardIntentStorageV1 =
    defaultSessionRuneRewardIntentStorage,
  protectedReceiptStorage:
    LearningV2SessionRuneRewardProtectedReceiptStorageV1 =
      defaultSessionRuneRewardProtectedReceiptStorage,
): Promise<LearningV2SessionRuneRewardPreparedIntentV1> {
  const intent = parseLearningV2SessionRuneRewardPreparedIntentV1(intentInput);
  const protectedReceipt =
    createLearningV2SessionRuneRewardProtectedIntentReceiptV1(
      intent,
      publicationToken,
    );
  const key = sessionRuneRewardIntentKey(intent);
  const encoded = canonicalJsonV1(intent);
  const existing = await storage.getItem(key);
  if (existing !== null && existing !== encoded) {
    throw new Error('learning_v2_session_rune_reward_intent_collision');
  }
  if (existing === null) await storage.setItem(key, encoded);
  if (await storage.getItem(key) !== encoded) {
    throw new Error('learning_v2_session_rune_reward_intent_indeterminate');
  }
  const protectedKey = sessionRuneRewardProtectedReceiptKey(intent);
  const protectedEncoded = canonicalJsonV1(protectedReceipt);
  const existingProtected = await protectedReceiptStorage.getItem(
    protectedKey,
  );
  if (existingProtected !== null && existingProtected !== protectedEncoded) {
    throw new Error('learning_v2_session_rune_reward_protected_receipt_collision');
  }
  if (existingProtected === null) {
    await protectedReceiptStorage.setItem(protectedKey, protectedEncoded);
  }
  const readBack = await readLearningV2SessionRuneRewardProtectedIntentReceiptV1(
    intent,
    protectedReceiptStorage,
  );
  if (canonicalJsonV1(readBack) !== protectedEncoded) {
    throw new Error(
      'learning_v2_session_rune_reward_protected_receipt_indeterminate',
    );
  }
  return intent;
}

async function removeLearningV2SessionRuneRewardPreparedIntentV1(
  intent: LearningV2SessionRuneRewardPreparedIntentV1,
  storage: LearningV2SessionRuneRewardIntentStorageV1,
  protectedReceiptStorage:
    LearningV2SessionRuneRewardProtectedReceiptStorageV1,
): Promise<void> {
  const key = sessionRuneRewardIntentKey(intent);
  const encoded = canonicalJsonV1(intent);
  const existing = await storage.getItem(key);
  if (existing === null) return;
  if (existing !== encoded) {
    throw new Error('learning_v2_session_rune_reward_intent_collision');
  }
  await storage.removeItem(key);
  if (await storage.getItem(key) !== null) {
    throw new Error('learning_v2_session_rune_reward_intent_indeterminate');
  }
  const protectedKey = sessionRuneRewardProtectedReceiptKey(intent);
  const protectedRaw = await protectedReceiptStorage.getItem(protectedKey);
  if (protectedRaw !== null) {
    const protectedReceipt =
      await readLearningV2SessionRuneRewardProtectedIntentReceiptV1(
        intent,
        protectedReceiptStorage,
      );
    if (canonicalJsonV1(protectedReceipt) !== protectedRaw) {
      throw new Error(
        'learning_v2_session_rune_reward_protected_receipt_collision',
      );
    }
    await protectedReceiptStorage.removeItem(protectedKey);
    if (await protectedReceiptStorage.getItem(protectedKey) !== null) {
      throw new Error(
        'learning_v2_session_rune_reward_protected_receipt_indeterminate',
      );
    }
  }
}

async function listLearningV2SessionRuneRewardPreparedIntentsV1(
  accountScopeHash: string,
  storage: LearningV2SessionRuneRewardIntentStorageV1,
): Promise<readonly LearningV2SessionRuneRewardPreparedIntentV1[]> {
  const prefix = sessionRuneRewardIntentPrefix(accountScopeHash);
  const keys = (await storage.getAllKeys())
    .filter((key) => key.startsWith(prefix))
    .sort()
    .slice(0, 8);
  const intents: LearningV2SessionRuneRewardPreparedIntentV1[] = [];
  for (const key of keys) {
    const raw = await storage.getItem(key);
    if (raw === null) continue;
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw) as unknown;
    } catch {
      throw new Error('learning_v2_session_rune_reward_intent_invalid');
    }
    const intent = parseLearningV2SessionRuneRewardPreparedIntentV1(decoded);
    if (intent.candidate.accountScopeHash !== accountScopeHash ||
      sessionRuneRewardIntentKey(intent) !== key ||
      canonicalJsonV1(intent) !== raw) {
      throw new Error('learning_v2_session_rune_reward_intent_invalid');
    }
    intents.push(intent);
  }
  return Object.freeze(intents);
}

const HASH = /^[a-f0-9]{64}$/;
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Reflect.ownKeys(value).length === keys.length && Reflect.ownKeys(value).every(
    (key) => typeof key === 'string' && keys.includes(key),
  );
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseLearningV2AccountBinding(
  input: unknown,
): LearningV2AccountBindingV1 {
  let value: unknown;
  try { value = detachBoundedWalletJson(input, 'learning_v2_account_binding_invalid'); }
  catch { throw new Error('learning_v2_account_binding_invalid'); }
  if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype ||
    !exact(value, [
      'schemaVersion', 'stableUid', 'accountGeneration',
      'economicAccountScopeHash', 'progressAccountScopeHash',
    ]) || value.schemaVersion !== 'learning-v2-account-binding.v2' ||
    typeof value.stableUid !== 'string' ||
    !/^[A-Za-z0-9._-]{1,160}$/.test(value.stableUid) ||
    !Number.isSafeInteger(value.accountGeneration) || Number(value.accountGeneration) < 1 ||
    typeof value.economicAccountScopeHash !== 'string' ||
    !HASH.test(value.economicAccountScopeHash) ||
    typeof value.progressAccountScopeHash !== 'string' ||
    !HASH.test(value.progressAccountScopeHash)) {
    throw new Error('learning_v2_account_binding_invalid');
  }
  const accountGeneration = Number(value.accountGeneration);
  if (value.economicAccountScopeHash !==
      deriveLearningV2EconomicAccountScopeHash(value.stableUid) ||
    value.progressAccountScopeHash !==
      deriveProgressAccountScopeHash(value.stableUid, accountGeneration)) {
    throw new Error('learning_v2_account_binding_invalid');
  }
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    stableUid: value.stableUid,
    accountGeneration,
    economicAccountScopeHash: value.economicAccountScopeHash,
    progressAccountScopeHash: value.progressAccountScopeHash,
  });
}

const callable = <TRequest, TResponse>(name: string) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getApp } = require('@react-native-firebase/app');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
  return (httpsCallable as <A, B>(functions: unknown, callableName: string) =>
    (data: A) => Promise<{ data: B }>)(
    getFunctions(getApp(), 'us-central1'),
    name,
  ) as (data: TRequest) => Promise<{ data: TResponse }>;
};

const defaultResolveAccountBinding = async (): Promise<unknown> =>
  (await callable<Record<string, never>, unknown>('getLearningV2AccountBinding')({})).data;

const defaultResolveRewardReceipt = async (input: {
  readonly accountScopeHash: string;
  readonly rewardId: string;
  readonly rewardFingerprint: string;
}): Promise<unknown> => {
  const response = (await callable<typeof input, unknown>(
    'resolveLearningV2WalletRewardReceipt',
  )(input)).data;
  if (!isRecord(response) ||
    response.schemaVersion !== 'learning-v2-server-wallet-reward-resolution.v1' ||
    response.rewardId !== input.rewardId ||
    response.rewardFingerprint !== input.rewardFingerprint ||
    typeof response.encoded !== 'string') {
    throw new Error('learning_v2_wallet_reward_resolution_invalid');
  }
  return response.encoded;
};

const defaultResolveCourseUnlockReceipt = async (input: {
  readonly accountScopeHash: string;
  readonly operationId: string;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly unlockId: string;
  readonly unlockFingerprint: string;
}): Promise<unknown> => {
  const response = (await callable<typeof input, unknown>(
    'resolveLearningV2CourseUnlockReceipt',
  )(input)).data;
  if (!isRecord(response) ||
    response.schemaVersion !== 'learning-v2-server-course-unlock-resolution.v1' ||
    response.unlockId !== input.unlockId ||
    response.unlockFingerprint !== input.unlockFingerprint ||
    typeof response.encoded !== 'string') {
    throw new Error('learning_v2_course_unlock_resolution_invalid');
  }
  return response.encoded;
};

/**
 * AsyncStorage is serialized with the app's account-transition lock. Immutable
 * children may become harmless orphans, but a stale root CAS is rolled back
 * before the lock is released and can never be returned as committed.
 */
export function createLearningV2OwnerRepositoryAsyncStorage(
  binding: LearningV2AccountBindingV1,
  accountToken: AccountGenerationToken,
  storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'> = AsyncStorage,
): RuntimeStorage {
  const fence: OwnerRepositoryActiveOwnerFence = Object.freeze({
    accountScopeHash: binding.economicAccountScopeHash,
    generation: binding.accountGeneration,
  });
  const active = () => isCurrentAccountGeneration(accountToken, binding.stableUid);
  const assertActive = () => {
    if (!active()) throw new Error('owner_repository_generation_stale');
  };
  return Object.freeze({
    async getItem(key: string) {
      return withAccountTransitionLock(async () => {
        assertActive();
        const raw = await storage.getItem(key);
        assertActive();
        return raw;
      });
    },
    async setItem(key: string, value: string) {
      await withAccountTransitionLock(async () => {
        assertActive();
        const current = await storage.getItem(key);
        assertActive();
        if (current !== null && current !== value)
          throw new Error('owner_repository_immutable_collision');
        if (current === value) return;
        await storage.setItem(key, value);
        assertActive();
        if (await storage.getItem(key) !== value)
          throw new Error('owner_repository_indeterminate');
      });
    },
    async getCurrentOwnerFence() {
      return active() ? fence : null;
    },
    async compareAndSet(
      key: string,
      expected: string | null,
      next: string,
      requestedFence: OwnerRepositoryActiveOwnerFence,
    ) {
      return withAccountTransitionLock(async () => {
        if (!active() || requestedFence.accountScopeHash !== fence.accountScopeHash ||
          requestedFence.generation !== fence.generation) return 'stale_generation' as const;
        const current = await storage.getItem(key);
        if (!active()) return 'stale_generation' as const;
        if (current !== expected) return 'conflict' as const;
        await storage.setItem(key, next);
        if (!active()) {
          const observed = await storage.getItem(key);
          if (observed === next) {
            if (expected === null) await storage.removeItem(key);
            else await storage.setItem(key, expected);
          }
          return 'stale_generation' as const;
        }
        if (await storage.getItem(key) !== next)
          throw new Error('owner_repository_commit_indeterminate');
        return 'committed' as const;
      });
    },
    removeItem: (key: string) => storage.removeItem(key),
  });
}

export async function mountLearningV2OwnerRepository(
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
) {
  const accountToken = dependencies.accountToken ?? captureAccountGeneration();
  if (accountToken.phase !== 'active' || !accountToken.stableId ||
    !isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
    throw new Error('learning_v2_account_inactive');
  }
  const binding = parseLearningV2AccountBinding(await (
    dependencies.resolveAccountBinding ?? defaultResolveAccountBinding
  )());
  if (binding.stableUid !== accountToken.stableId ||
    !isCurrentAccountGeneration(accountToken, binding.stableUid)) {
    throw new Error('learning_v2_account_binding_stale');
  }
  const storage = dependencies.storage ?? createLearningV2OwnerRepositoryAsyncStorage(
    binding,
    accountToken,
  );
  const resolveRewardReceipt = dependencies.resolveRewardReceipt ??
    defaultResolveRewardReceipt;
  const resolveCourseUnlockReceipt = dependencies.resolveCourseUnlockReceipt ??
    defaultResolveCourseUnlockReceipt;
  const scope: OwnerRepositoryScope = Object.freeze({
    accountScopeHash: binding.economicAccountScopeHash,
    generation: binding.accountGeneration,
  });
  const repository = createOwnerRepository(
    storage,
    (candidateScope) => isCurrentAccountGeneration(accountToken, binding.stableUid) &&
      candidateScope.accountScopeHash === binding.economicAccountScopeHash &&
      candidateScope.generation === binding.accountGeneration,
    {
      materializeWalletCredit: (() => {
        const serverAuthority = createServerWalletRewardReceiptAuthority({
          resolveRewardReceipt,
        });
        const mistakeAuthority = createMistakeCorrectionCompositeAuthority();
        const sessionRuneRewardAuthority =
          createLearningV2SessionRuneRewardCompositeAuthorityV1(
            dependencies.sessionRuneRewardPublicationToken,
          );
        return (input) => (
          isRecord(input.candidate)
          && input.candidate.schemaVersion === 'mistake-correction-wallet-composite.v1'
            ? mistakeAuthority(input)
            : isRecord(input.candidate)
              && input.candidate.schemaVersion ===
                'learning-v2-session-rune-reward-composite.v1'
              ? sessionRuneRewardAuthority(input)
            : serverAuthority(input)
        );
      })(),
      materializeCourseUnlock: createServerCourseUnlockReceiptAuthority({
        resolveCourseUnlockReceipt,
      }),
    },
  );
  // The production wallet path starts from the strict V2 graph, while an
  // already adopted V3 root must stay V3 on every remount/restart.
  let existing;
  try {
    existing = await repository.load(scope);
  } catch (loadError) {
    // A stable economic account may already have a V3 root fenced by an older
    // server generation. Adopt the new fence before exposing the repository.
    try {
      existing = await repository.advanceV3Generation(scope);
    } catch (advanceError) {
      if (!(advanceError instanceof Error) ||
        advanceError.message !== 'owner_repository_v3_adoption_required') {
        throw loadError;
      }
      existing = await repository.ensureV2(scope);
    }
  }
  if (existing === undefined ||
    existing.root.schemaVersion === 'learning-v2-owner-repository-root.v1') {
    existing = await repository.ensureV2(scope);
  }
  if (!isCurrentAccountGeneration(accountToken, binding.stableUid))
    throw new Error('learning_v2_account_binding_stale');
  return Object.freeze({ binding, scope, repository, accountToken });
}

export async function commitLearningV2CoinExchangeReward(
  request: CoinExchangeWalletRewardRequest,
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<OwnerRepositoryWalletCreditCommitResult> {
  return commitLearningV2ServerWalletReward(request, dependencies);
}

export async function commitLearningV2ServerWalletReward(
  request: ServerWalletRewardRequestV1,
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<OwnerRepositoryWalletCreditCommitResult> {
  const runtime = await mountLearningV2OwnerRepository(dependencies);
  const result = await runtime.repository.commitWalletCreditV3(runtime.scope, request);
  publishLearningV2WalletBalanceState(result.snapshot.walletState, runtime.accountToken);
  return result;
}

export async function commitMistakeCorrectionWalletComposite(
  candidate: MistakeCorrectionWalletCompositeV1,
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<OwnerRepositoryWalletCreditCommitResult> {
  const parsed = parseMistakeCorrectionWalletComposite(candidate);
  const runtime = await mountLearningV2OwnerRepository(dependencies);
  if (parsed.accountScopeHash !== runtime.scope.accountScopeHash) {
    throw new Error('mistake_correction_wallet_composite_owner_mismatch');
  }
  const result = await runtime.repository.commitWalletCreditV3(runtime.scope, parsed);
  publishLearningV2WalletBalanceState(result.snapshot.walletState, runtime.accountToken);
  return result;
}

async function commitPreparedLearningV2SessionRuneRewardIntentV1(
  intent: LearningV2SessionRuneRewardPreparedIntentV1,
  publicationToken: LearningV2SessionRuneRewardPublicationTokenV1,
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<OwnerRepositoryWalletCreditCommitResult> {
  const candidate = parseLearningV2SessionRuneRewardCompositeV1(intent.candidate);
  const accountToken = dependencies.accountToken ?? captureAccountGeneration();
  if (accountToken.phase !== 'active' || !accountToken.stableId ||
    !isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
    throw new Error('learning_v2_account_inactive');
  }
  const localBinding = Object.freeze({
    schemaVersion: 'learning-v2-account-binding.v2' as const,
    stableUid: accountToken.stableId,
    accountGeneration: accountToken.generation,
    economicAccountScopeHash: deriveLearningV2EconomicAccountScopeHash(
      accountToken.stableId,
    ),
    progressAccountScopeHash: deriveProgressAccountScopeHash(
      accountToken.stableId,
      accountToken.generation,
    ),
  });
  const runtime = await mountLearningV2OwnerRepository({
    ...dependencies,
    accountToken,
    sessionRuneRewardPublicationToken: publicationToken,
    resolveAccountBinding: dependencies.resolveAccountBinding ??
      (async () => localBinding),
  });
  if (candidate.accountScopeHash !== runtime.scope.accountScopeHash) {
    throw new Error('learning_v2_session_rune_reward_composite_owner_mismatch');
  }
  const result = await runtime.repository.commitWalletCreditV3(
    runtime.scope,
    candidate,
  );
  if (result.status === 'alias_repair_required') {
    throw new Error('learning_v2_session_rune_reward_commit_unconfirmed');
  }
  try {
    publishLearningV2WalletBalanceState(
      result.snapshot.walletState,
      runtime.accountToken,
    );
  } catch (error) {
    // The immutable wallet receipt already exists. A presentation projection
    // failure must not turn a credited reward into a failed economic action.
    DebugLogger.error(
      'learning_v2_session_rune_reward_wallet_projection',
      error instanceof Error ? error : new Error(String(error)),
      'warning',
    );
  }
  if (result.status === 'applied' || result.status === 'replayed') {
    try {
      await removeLearningV2SessionRuneRewardPreparedIntentV1(
        intent,
        dependencies.sessionRuneRewardIntentStorage ??
          defaultSessionRuneRewardIntentStorage,
        dependencies.sessionRuneRewardProtectedReceiptStorage ??
          defaultSessionRuneRewardProtectedReceiptStorage,
      );
    } catch (error) {
      // Cleanup is retryable. Leaving the exact intent is safe because the
      // stable operation id can only replay the same canonical receipt.
      DebugLogger.error(
        'learning_v2_session_rune_reward_intent_cleanup',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    }
  }
  return result;
}

export async function commitLearningV2SessionRuneRewardCompositeV1(
  input: Readonly<{
    candidate: LearningV2SessionRuneRewardCompositeV1;
    publicationToken: LearningV2SessionRuneRewardPublicationTokenV1;
  }>,
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<OwnerRepositoryWalletCreditCommitResult> {
  const candidate = parseLearningV2SessionRuneRewardCompositeV1(input.candidate);
  const intent = createLearningV2SessionRuneRewardPreparedIntentV1(
    candidate,
    input.publicationToken,
  );
  await persistLearningV2SessionRuneRewardPreparedIntentV1(
    intent,
    input.publicationToken,
    dependencies.sessionRuneRewardIntentStorage ??
      defaultSessionRuneRewardIntentStorage,
    dependencies.sessionRuneRewardProtectedReceiptStorage ??
      defaultSessionRuneRewardProtectedReceiptStorage,
  );
  return commitPreparedLearningV2SessionRuneRewardIntentV1(
    intent,
    input.publicationToken,
    dependencies,
  );
}

export async function recoverPendingLearningV2SessionRuneRewardIntentsV1(
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<Readonly<{
  applied: number;
  replayed: number;
  remaining: number;
  failed: number;
}>> {
  const accountToken = dependencies.accountToken ?? captureAccountGeneration();
  if (accountToken.phase !== 'active' || !accountToken.stableId ||
    !isCurrentAccountGeneration(accountToken, accountToken.stableId)) {
    return Object.freeze({ applied: 0, replayed: 0, remaining: 0, failed: 0 });
  }
  const accountScopeHash = deriveLearningV2EconomicAccountScopeHash(
    accountToken.stableId,
  );
  const storage = dependencies.sessionRuneRewardIntentStorage ??
    defaultSessionRuneRewardIntentStorage;
  const protectedReceiptStorage =
    dependencies.sessionRuneRewardProtectedReceiptStorage ??
      defaultSessionRuneRewardProtectedReceiptStorage;
  const intents = await listLearningV2SessionRuneRewardPreparedIntentsV1(
    accountScopeHash,
    storage,
  );
  let applied = 0;
  let replayed = 0;
  let failed = 0;
  for (const intent of intents) {
    try {
      const protectedReceipt =
        await readLearningV2SessionRuneRewardProtectedIntentReceiptV1(
          intent,
          protectedReceiptStorage,
        );
      const admission = admitCurrentLearningV2CourseSessionPublicationV3({
        environment: intent.candidate.completion.environment,
        targetLanguage: intent.candidate.completion.targetLanguage,
        studyTarget: intent.candidate.completion.studyTarget,
        learnerSourceLocale:
          intent.candidate.completion.learnerSourceLocale,
        seasonId: intent.candidate.completion.seasonId,
        lessonOrdinal: intent.candidate.lessonOrdinal,
        sessionOrdinal: intent.candidate.sessionOrdinal,
      });
      const publicationToken =
        restoreLearningV2SessionRuneRewardPublicationTokenV1(
          intent,
          admission,
          protectedReceipt,
        );
      const result = await commitPreparedLearningV2SessionRuneRewardIntentV1(
        intent,
        publicationToken,
        {
          ...dependencies,
          accountToken,
          sessionRuneRewardIntentStorage: storage,
          sessionRuneRewardProtectedReceiptStorage: protectedReceiptStorage,
        },
      );
      if (result.status === 'applied') applied += 1;
      else if (result.status === 'replayed') replayed += 1;
      else failed += 1;
    } catch (error) {
      failed += 1;
      DebugLogger.error(
        'learning_v2_session_rune_reward_intent_recovery',
        error instanceof Error ? error : new Error(String(error)),
        'warning',
      );
    }
  }
  return Object.freeze({
    applied,
    replayed,
    remaining: Math.max(0, intents.length - applied - replayed),
    failed,
  });
}

export async function commitLearningV2AuthorizedCourseUnlock(
  request: ServerCourseUnlockRequestV1,
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<OwnerRepositoryCourseUnlockCommitResult> {
  const candidate = parseServerCourseUnlockRequest(request);
  const runtime = await mountLearningV2OwnerRepository(dependencies);
  const result = await runtime.repository.commitCourseUnlock(
    runtime.scope,
    candidate,
  );
  publishLearningV2WalletBalanceState(
    result.snapshot.walletState,
    runtime.accountToken,
  );
  return result;
}
