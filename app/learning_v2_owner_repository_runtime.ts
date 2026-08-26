import AsyncStorage from '@react-native-async-storage/async-storage';
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
  createLearningV2SessionRuneRewardCompositeAuthorityV1,
  parseLearningV2SessionRuneRewardCompositeV1,
  type LearningV2SessionRuneRewardCompositeV1,
  type LearningV2SessionRuneRewardPublicationTokenV1,
} from '../modules/learning-v2/progress/learning_session_rune_reward_composite_v1';

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

export async function commitLearningV2SessionRuneRewardCompositeV1(
  input: Readonly<{
    candidate: LearningV2SessionRuneRewardCompositeV1;
    publicationToken: LearningV2SessionRuneRewardPublicationTokenV1;
  }>,
  dependencies: LearningV2OwnerRepositoryRuntimeDependencies = {},
): Promise<OwnerRepositoryWalletCreditCommitResult> {
  const candidate = parseLearningV2SessionRuneRewardCompositeV1(input.candidate);
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
    sessionRuneRewardPublicationToken: input.publicationToken,
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
  publishLearningV2WalletBalanceState(result.snapshot.walletState, runtime.accountToken);
  return result;
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
