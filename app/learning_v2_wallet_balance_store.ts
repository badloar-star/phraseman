import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { deriveLearningV2EconomicAccountScopeHash } from '../modules/learning-v2/progress/economic_account_scope';
import { ownerRepositoryRootKey } from '../modules/learning-v2/progress/owner_repository';
import { parseOwnerRepositoryRootV2Raw } from '../modules/learning-v2/progress/owner_repository_root_v2';
import { parseOwnerRepositoryRootV3Raw } from '../modules/learning-v2/progress/owner_repository_root_v3';
import { parseOwnerRepositoryWalletStateBlob } from '../modules/learning-v2/progress/owner_repository_wallet_blob';
import { parseWalletState, type WalletStateV1 } from '../modules/learning-v2/progress/wallet_reducer';

export interface LearningV2WalletBalanceSnapshot {
  readonly accountScopeHash: string;
  readonly balanceSubunits: number;
  readonly walletRevision: number;
  readonly walletStateFingerprint: string;
}

const MAX_MEMORY_SCOPES = 4;
const MAX_OWNER_RECORD_CHARS = 512 * 1024;
type MemoryEntry = Readonly<{
  runtimeAccountGeneration: number;
  snapshot: LearningV2WalletBalanceSnapshot;
}>;
const snapshots = new Map<string, MemoryEntry>();
const listeners = new Set<() => void>();

const currentAccount = (): Readonly<{
  token: AccountGenerationToken;
  stableId: string;
  accountScopeHash: string;
}> | null => {
  const token = captureAccountGeneration();
  if (token.phase !== 'active' || !token.stableId ||
    !isCurrentAccountGeneration(token, token.stableId)) return null;
  return Object.freeze({
    token,
    stableId: token.stableId,
    accountScopeHash: deriveLearningV2EconomicAccountScopeHash(token.stableId),
  });
};

const remember = (
  state: WalletStateV1,
  token: AccountGenerationToken,
): LearningV2WalletBalanceSnapshot => {
  const snapshot = Object.freeze({
    accountScopeHash: state.accountScopeHash,
    balanceSubunits: state.balanceSubunits,
    walletRevision: state.revision,
    walletStateFingerprint: state.stateFingerprint,
  });
  const priorEntry = snapshots.get(snapshot.accountScopeHash);
  const prior = priorEntry?.runtimeAccountGeneration === token.generation
    ? priorEntry.snapshot
    : null;
  if (prior && prior.walletRevision > snapshot.walletRevision) return prior;
  if (prior?.walletRevision === snapshot.walletRevision &&
    prior.walletStateFingerprint !== snapshot.walletStateFingerprint) {
    throw new Error('learning_v2_wallet_balance_indeterminate');
  }
  if (prior?.walletRevision === snapshot.walletRevision &&
    prior.walletStateFingerprint === snapshot.walletStateFingerprint) return prior;
  snapshots.delete(snapshot.accountScopeHash);
  snapshots.set(snapshot.accountScopeHash, Object.freeze({
    runtimeAccountGeneration: token.generation,
    snapshot,
  }));
  while (snapshots.size > MAX_MEMORY_SCOPES) {
    const oldest = snapshots.keys().next().value as string | undefined;
    if (!oldest) break;
    snapshots.delete(oldest);
  }
  for (const listener of listeners) listener();
  return snapshot;
};

/**
 * Presentation-only projection of the exact Owner Repository wallet state.
 * It never authorizes earning, spending, access, or server settlement.
 */
export function publishLearningV2WalletBalanceState(
  input: unknown,
  token: AccountGenerationToken = captureAccountGeneration(),
): LearningV2WalletBalanceSnapshot {
  const state = parseWalletState(input);
  if (token.phase !== 'active' || !token.stableId ||
    !isCurrentAccountGeneration(token, token.stableId) ||
    state.accountScopeHash !== deriveLearningV2EconomicAccountScopeHash(token.stableId)) {
    throw new Error('learning_v2_wallet_balance_scope_stale');
  }
  return remember(state, token);
}

export function peekCurrentLearningV2WalletBalance(): LearningV2WalletBalanceSnapshot | null {
  const current = currentAccount();
  if (!current) return null;
  const entry = snapshots.get(current.accountScopeHash);
  return entry?.runtimeAccountGeneration === current.token.generation
    ? entry.snapshot
    : null;
}

export function subscribeLearningV2WalletBalance(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Loads the authoritative local wallet blob directly. There is no second
 * persisted balance and no network request; corrupt or torn graphs fail closed.
 */
export async function hydrateCurrentLearningV2WalletBalance(): Promise<LearningV2WalletBalanceSnapshot | null> {
  const current = currentAccount();
  if (!current) return null;
  const state = await withAccountTransitionLock(async () => {
    if (!isCurrentAccountGeneration(current.token, current.stableId)) {
      throw new Error('learning_v2_wallet_balance_scope_stale');
    }
    const rootRaw = await AsyncStorage.getItem(ownerRepositoryRootKey(current.accountScopeHash));
    if (rootRaw === null) return null;
    if (rootRaw.length > MAX_OWNER_RECORD_CHARS) {
      throw new Error('learning_v2_wallet_balance_indeterminate');
    }
    let walletStateRef;
    try {
      walletStateRef = parseOwnerRepositoryRootV3Raw(rootRaw, current.accountScopeHash).root.walletStateRef;
    } catch {
      walletStateRef = parseOwnerRepositoryRootV2Raw(rootRaw, current.accountScopeHash).root.walletStateRef;
    }
    const walletRaw = await AsyncStorage.getItem(walletStateRef.blobKey);
    if (walletRaw === null) throw new Error('learning_v2_wallet_balance_indeterminate');
    if (walletRaw.length > MAX_OWNER_RECORD_CHARS) {
      throw new Error('learning_v2_wallet_balance_indeterminate');
    }
    const wallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: current.accountScopeHash,
      ref: walletStateRef,
      raw: walletRaw,
    }).state;
    if (!isCurrentAccountGeneration(current.token, current.stableId)) {
      throw new Error('learning_v2_wallet_balance_scope_stale');
    }
    return wallet;
  });
  if (state === null) return null;
  if (!isCurrentAccountGeneration(current.token, current.stableId)) {
    throw new Error('learning_v2_wallet_balance_scope_stale');
  }
  return remember(state, current.token);
}

export function __resetLearningV2WalletBalanceMemoryForTests(): void {
  snapshots.clear();
  for (const listener of listeners) listener();
}
