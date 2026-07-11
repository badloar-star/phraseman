import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLevelFromXP } from '../constants/theme';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import {
  ensureLevelGiftEntitlement,
  type EnsureLevelGiftEntitlementOptions,
  type LevelGiftEntitlementResult,
} from './level_gift_inventory';
import type { RuntimeStudyTarget } from './target_storage_keys';
import { getCanonicalUserId } from './user_id_policy';
import {
  LEVEL_UP_REWARD_CONTEXT_KEY,
  LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY,
  LEVEL_UP_REWARD_FALLBACK_KEY,
  LEVEL_UP_REWARD_FALLBACK_QUARANTINE_KEY,
  LEVEL_UP_REWARD_OWNER_KEY,
  LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY,
  LEVEL_UP_REWARD_RETRY_KEY,
  LEVEL_UP_REWARD_RETRY_QUARANTINE_KEY,
  PENDING_LEVEL_UP_QUEUE_KEY,
} from './level_up_storage_keys';

export {
  LEVEL_UP_REWARD_CONTEXT_KEY,
  LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY,
  LEVEL_UP_REWARD_FALLBACK_KEY,
  LEVEL_UP_REWARD_FALLBACK_QUARANTINE_KEY,
  LEVEL_UP_REWARD_OWNER_KEY,
  LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY,
  LEVEL_UP_REWARD_RETRY_KEY,
  LEVEL_UP_REWARD_RETRY_QUARANTINE_KEY,
  PENDING_LEVEL_UP_QUEUE_KEY,
} from './level_up_storage_keys';

type RetryEntry = {
  level: number;
  owner: string | null;
  premium: boolean;
  studyTarget?: RuntimeStudyTarget;
};

type StoredArray<T> = {
  state: 'available' | 'unavailable';
  values: T[];
  wasCorrupt: boolean;
  wasMissing: boolean;
};

type LoadedState = {
  queue: StoredArray<number>;
  retry: StoredArray<number>;
  context: StoredArray<RetryEntry>;
  fallback: StoredArray<RetryEntry>;
};

type OwnerState = { owner: string; changed: boolean } | { owner: null; changed: false };
type DurabilitySource = 'primary' | 'fallback' | 'memory';
type AccountScope = AccountGenerationToken | null;

let operationLock: Promise<void> = Promise.resolve();
const inMemoryRetryEntries = new Map<number, RetryEntry>();
// If every durable write fails, crash recovery is impossible. This process-local map still preserves
// retryability for the lifetime of the current process.

const captureAccountScope = (): AccountScope => {
  const token = captureAccountGeneration();
  return token.phase === 'uninitialized' ? null : token;
};

const isAccountScopeCurrent = (scope: AccountScope, owner?: string): boolean =>
  !scope || isCurrentAccountGeneration(scope, owner);

const normalizeLevels = (values: unknown[]): number[] => [...new Set(values.filter(
  (value): value is number => typeof value === 'number' && Number.isInteger(value) && value > 0,
))].sort((a, b) => a - b);

const normalizeOwner = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const isStudyTarget = (value: unknown): value is RuntimeStudyTarget =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeRetryEntries = (values: unknown[]): RetryEntry[] => {
  const entries = new Map<number, RetryEntry>();
  values.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') return;
    const raw = candidate as Partial<RetryEntry>;
    if (!Number.isInteger(raw.level) || Number(raw.level) <= 0) return;
    const entry: RetryEntry = {
      level: Number(raw.level),
      owner: normalizeOwner(raw.owner),
      premium: raw.premium === true,
    };
    if (isStudyTarget(raw.studyTarget)) entry.studyTarget = raw.studyTarget;
    entries.set(entry.level, entry);
  });
  return [...entries.values()].sort((a, b) => a.level - b.level);
};

const readStoredArray = async <T>(
  key: string,
  quarantineKey: string,
  normalize: (values: unknown[]) => T[],
  scope: AccountScope,
): Promise<StoredArray<T>> => {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    return { state: 'unavailable', values: [], wasCorrupt: false, wasMissing: false };
  }
  if (raw === null) return { state: 'available', values: [], wasCorrupt: false, wasMissing: true };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    return { state: 'available', values: normalize(parsed), wasCorrupt: false, wasMissing: false };
  } catch {
    try {
      if (!isAccountScopeCurrent(scope)) {
        return { state: 'unavailable', values: [], wasCorrupt: true, wasMissing: false };
      }
      await AsyncStorage.multiSet([[quarantineKey, raw], [key, '[]']]);
      return { state: 'available', values: [], wasCorrupt: true, wasMissing: false };
    } catch {
      return { state: 'unavailable', values: [], wasCorrupt: true, wasMissing: false };
    }
  }
};

const loadState = async (scope: AccountScope): Promise<LoadedState> => {
  const [queue, retry, context, fallback] = await Promise.all([
    readStoredArray(PENDING_LEVEL_UP_QUEUE_KEY, LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY, normalizeLevels, scope),
    readStoredArray(LEVEL_UP_REWARD_RETRY_KEY, LEVEL_UP_REWARD_RETRY_QUARANTINE_KEY, normalizeLevels, scope),
    readStoredArray(LEVEL_UP_REWARD_CONTEXT_KEY, LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY, normalizeRetryEntries, scope),
    readStoredArray(LEVEL_UP_REWARD_FALLBACK_KEY, LEVEL_UP_REWARD_FALLBACK_QUARANTINE_KEY, normalizeRetryEntries, scope),
  ]);
  if (retry.values.length > 0 && context.values.length === 0 && !context.wasCorrupt) {
    try {
      context.wasCorrupt = (await AsyncStorage.getItem(LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY)) !== null;
    } catch {
      context.state = 'unavailable';
    }
  }
  return { queue, retry, context, fallback };
};

const serializeEntries = (entries: Iterable<RetryEntry>): string =>
  JSON.stringify([...entries].sort((a, b) => a.level - b.level));

const writeLevels = async (
  key: string,
  levels: Iterable<number>,
  scope: AccountScope,
): Promise<boolean> => {
  try {
    if (!isAccountScopeCurrent(scope)) return false;
    await AsyncStorage.setItem(key, JSON.stringify([...new Set(levels)].sort((a, b) => a - b)));
    return isAccountScopeCurrent(scope);
  } catch {
    return false;
  }
};

const withOperationLock = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = operationLock.then(operation, operation);
  operationLock = result.then(() => undefined, () => undefined);
  return result;
};

const clearForOwnerSwitch = async (owner: string, scope: AccountScope): Promise<boolean> => {
  try {
    if (!isAccountScopeCurrent(scope, owner)) return false;
    await AsyncStorage.multiSet([
      [PENDING_LEVEL_UP_QUEUE_KEY, '[]'],
      [LEVEL_UP_REWARD_RETRY_KEY, '[]'],
      [LEVEL_UP_REWARD_CONTEXT_KEY, '[]'],
      [LEVEL_UP_REWARD_FALLBACK_KEY, '[]'],
      [LEVEL_UP_REWARD_OWNER_KEY, owner],
    ]);
    if (!isAccountScopeCurrent(scope, owner)) return false;
    inMemoryRetryEntries.clear();
    return true;
  } catch {
    return false;
  }
};

const prepareOwnerUnlocked = async (scope: AccountScope): Promise<OwnerState> => {
  const owner = normalizeOwner(await getCanonicalUserId().catch(() => null));
  if (!owner) return { owner: null, changed: false };
  if (!isAccountScopeCurrent(scope, owner)) return { owner: null, changed: false };
  inMemoryRetryEntries.forEach((entry, level) => {
    if (entry.owner !== owner) inMemoryRetryEntries.delete(level);
  });
  let storedOwner: string | null;
  try {
    storedOwner = normalizeOwner(await AsyncStorage.getItem(LEVEL_UP_REWARD_OWNER_KEY));
  } catch {
    return { owner: null, changed: false };
  }
  if (storedOwner && storedOwner !== owner) {
    return await clearForOwnerSwitch(owner, scope)
      ? { owner, changed: true }
      : { owner: null, changed: false };
  }
  if (!storedOwner) {
    try {
      if (!isAccountScopeCurrent(scope, owner)) return { owner: null, changed: false };
      await AsyncStorage.setItem(LEVEL_UP_REWARD_OWNER_KEY, owner);
    } catch {
      // Every journal entry also carries its owner, so marker failure does not mix saved contexts.
    }
  }
  return { owner, changed: false };
};

const makeEntry = (
  level: number,
  owner: string,
  options: EnsureLevelGiftEntitlementOptions,
): RetryEntry => ({
  level,
  owner,
  premium: options.premium === true,
  ...(options.studyTarget ? { studyTarget: options.studyTarget } : {}),
});

const entryOptions = (entry: RetryEntry): EnsureLevelGiftEntitlementOptions => ({
  premium: entry.premium,
  ...(entry.studyTarget ? { studyTarget: entry.studyTarget } : {}),
});

const mergeEntries = (...groups: RetryEntry[][]): Map<number, RetryEntry> => {
  const merged = new Map<number, RetryEntry>();
  groups.flat().forEach((entry) => merged.set(entry.level, entry));
  return merged;
};

const hasExplicitRetryOptions = (options: EnsureLevelGiftEntitlementOptions): boolean =>
  Object.prototype.hasOwnProperty.call(options, 'premium')
  || Object.prototype.hasOwnProperty.call(options, 'studyTarget');

const resolveKnownEntries = (
  state: LoadedState,
  owner: string,
  legacyOptions: EnsureLevelGiftEntitlementOptions,
): { entries: Map<number, RetryEntry>; unresolvedLevels: number[] } => {
  const currentOwnerContexts = state.context.values.filter((entry) => entry.owner === owner);
  const contexts = new Map(currentOwnerContexts.map((entry) => [entry.level, entry]));
  const foreignOwnerLevels = new Set([
    ...state.context.values,
    ...state.fallback.values,
    ...inMemoryRetryEntries.values(),
  ].filter((entry) => entry.owner !== owner).map((entry) => entry.level));
  const entries = mergeEntries(
    currentOwnerContexts,
    state.fallback.values.filter((entry) => entry.owner === owner),
    [...inMemoryRetryEntries.values()].filter((entry) => entry.owner === owner),
  );
  const unresolvedLevels: number[] = [];
  state.retry.values.forEach((level) => {
    const saved = contexts.get(level);
    if (saved) {
      entries.set(level, saved);
    } else if (foreignOwnerLevels.has(level)) {
      unresolvedLevels.push(level);
    } else if (
      state.context.state === 'available'
      && (!state.context.wasCorrupt || hasExplicitRetryOptions(legacyOptions))
    ) {
      entries.set(level, makeEntry(level, owner, legacyOptions));
    } else {
      unresolvedLevels.push(level);
    }
  });
  return { entries, unresolvedLevels };
};

const persistFallback = async (
  entries: Map<number, RetryEntry>,
  scope: AccountScope,
): Promise<boolean> => {
  try {
    if (!isAccountScopeCurrent(scope)) return false;
    await AsyncStorage.setItem(LEVEL_UP_REWARD_FALLBACK_KEY, serializeEntries(entries.values()));
    if (!isAccountScopeCurrent(scope)) return false;
    entries.forEach((entry) => inMemoryRetryEntries.delete(entry.level));
    return true;
  } catch {
    if (isAccountScopeCurrent(scope)) {
      entries.forEach((entry) => inMemoryRetryEntries.set(entry.level, entry));
    }
    return false;
  }
};

const stageBeforeEntitlement = async (
  entries: Map<number, RetryEntry>,
  canUsePrimary: boolean,
  fallbackAvailable: boolean,
  scope: AccountScope,
): Promise<DurabilitySource> => {
  if (canUsePrimary) {
    try {
      if (!isAccountScopeCurrent(scope)) return 'memory';
      await AsyncStorage.multiSet([
        [LEVEL_UP_REWARD_RETRY_KEY, JSON.stringify([...entries.keys()].sort((a, b) => a - b))],
        [LEVEL_UP_REWARD_CONTEXT_KEY, serializeEntries(entries.values())],
      ]);
      if (!isAccountScopeCurrent(scope)) return 'memory';
      entries.forEach((entry) => inMemoryRetryEntries.delete(entry.level));
      return 'primary';
    } catch {
      // Use the independent journal below.
    }
  }
  if (fallbackAvailable && await persistFallback(entries, scope)) return 'fallback';
  if (isAccountScopeCurrent(scope)) entries.forEach((entry) => inMemoryRetryEntries.set(entry.level, entry));
  return 'memory';
};

const finalizeRetries = async (
  remaining: Map<number, RetryEntry>,
  canUsePrimary: boolean,
  fallbackAvailable: boolean,
  stagedWith: DurabilitySource,
  scope: AccountScope,
): Promise<void> => {
  if (!isAccountScopeCurrent(scope)) return;
  if (canUsePrimary) {
    try {
      await AsyncStorage.multiSet([
        [LEVEL_UP_REWARD_RETRY_KEY, JSON.stringify([...remaining.keys()].sort((a, b) => a - b))],
        [LEVEL_UP_REWARD_CONTEXT_KEY, serializeEntries(remaining.values())],
      ]);
      if (!isAccountScopeCurrent(scope)) return;
      remaining.forEach((entry) => inMemoryRetryEntries.delete(entry.level));
      if (fallbackAvailable) {
        try {
          if (!isAccountScopeCurrent(scope)) return;
          await AsyncStorage.setItem(LEVEL_UP_REWARD_FALLBACK_KEY, '[]');
        } catch {
          // A stale duplicate is safe: entitlement is idempotent, while deleting it without confirmation is not.
        }
      }
      return;
    } catch {
      // Preserve all remaining work in fallback rather than clearing the staging journal.
    }
  }
  if (fallbackAvailable && await persistFallback(remaining, scope)) return;
  if (stagedWith !== 'memory') {
    if (isAccountScopeCurrent(scope)) remaining.forEach((entry) => inMemoryRetryEntries.set(entry.level, entry));
  }
};

const safelyEnsure = async (
  entry: RetryEntry,
  scope: AccountScope,
): Promise<LevelGiftEntitlementResult> => {
  try {
    if (!isAccountScopeCurrent(scope, entry.owner ?? undefined)) return { status: 'failed', level: entry.level };
    return await ensureLevelGiftEntitlement(entry.level, {
      ...entryOptions(entry),
      ...(scope ? { accountToken: scope } : {}),
    });
  } catch {
    return { status: 'failed', level: entry.level };
  }
};

type ProcessResult = { results: LevelGiftEntitlementResult[]; showableLevels: number[] };

const processEntriesUnlocked = async (
  candidates: RetryEntry[],
  owner: string,
  legacyOptions: EnsureLevelGiftEntitlementOptions,
  scope: AccountScope,
  suppliedState?: LoadedState,
): Promise<ProcessResult> => {
  if (!isAccountScopeCurrent(scope, owner)) return { results: [], showableLevels: [] };
  const state = suppliedState ?? await loadState(scope);
  if (!isAccountScopeCurrent(scope, owner)) return { results: [], showableLevels: [] };
  const resolved = resolveKnownEntries(state, owner, legacyOptions);
  candidates.forEach((entry) => resolved.entries.set(entry.level, entry));
  const canUsePrimary = state.retry.state === 'available'
    && state.context.state === 'available'
    && resolved.unresolvedLevels.length === 0;
  const fallbackAvailable = state.fallback.state === 'available';
  const stagedWith = await stageBeforeEntitlement(resolved.entries, canUsePrimary, fallbackAvailable, scope);
  if (!isAccountScopeCurrent(scope, owner)) return { results: [], showableLevels: [] };

  const queue = new Set(state.queue.values);
  const results: LevelGiftEntitlementResult[] = [];
  const successful = new Set<number>();
  const claimed = new Set<number>();
  for (const entry of [...candidates].sort((a, b) => a.level - b.level)) {
    if (!isAccountScopeCurrent(scope, owner)) return { results: [], showableLevels: [] };
    const result = await safelyEnsure(entry, scope);
    if (!isAccountScopeCurrent(scope, owner)) return { results: [], showableLevels: [] };
    results.push(result);
    if (result.status === 'persisted' || result.status === 'already_pending') {
      queue.add(entry.level);
      successful.add(entry.level);
    } else if (result.status === 'already_claimed') {
      queue.delete(entry.level);
      claimed.add(entry.level);
    } else {
      queue.delete(entry.level);
    }
  }

  const queuePersisted = state.queue.state === 'available'
    ? await writeLevels(PENDING_LEVEL_UP_QUEUE_KEY, queue, scope)
    : false;
  if (!isAccountScopeCurrent(scope, owner)) return { results: [], showableLevels: [] };
  claimed.forEach((level) => {
    resolved.entries.delete(level);
    inMemoryRetryEntries.delete(level);
  });
  if (queuePersisted) {
    successful.forEach((level) => {
      resolved.entries.delete(level);
      inMemoryRetryEntries.delete(level);
    });
  }
  await finalizeRetries(resolved.entries, canUsePrimary, fallbackAvailable, stagedWith, scope);

  const showableLevels = queuePersisted
    ? [...successful].filter((level) => queue.has(level)).sort((a, b) => a - b)
    : [];
  if (showableLevels.length > 0 && isAccountScopeCurrent(scope, owner)) emitAppEvent('level_up_pending');
  return { results, showableLevels };
};

const reconcileUnlocked = async (
  previousXp: number,
  nextXp: number,
  options: EnsureLevelGiftEntitlementOptions,
  scope: AccountScope,
): Promise<LevelGiftEntitlementResult[]> => {
  if (!Number.isFinite(previousXp) || !Number.isFinite(nextXp) || nextXp <= previousXp) return [];
  const previousLevel = getLevelFromXP(Math.max(0, Math.floor(previousXp)));
  const nextLevel = getLevelFromXP(Math.max(0, Math.floor(nextXp)));
  if (nextLevel <= previousLevel) return [];
  const ownerState = await prepareOwnerUnlocked(scope);
  if (!ownerState.owner) return [];
  const candidates: RetryEntry[] = [];
  for (let level = previousLevel + 1; level <= nextLevel; level += 1) {
    candidates.push(makeEntry(level, ownerState.owner, options));
  }
  return (await processEntriesUnlocked(candidates, ownerState.owner, options, scope)).results;
};

export const reconcileLevelUpRewards = (
  previousXp: number,
  nextXp: number,
  options: EnsureLevelGiftEntitlementOptions = {},
): Promise<LevelGiftEntitlementResult[]> => {
  const scope = captureAccountScope();
  return withOperationLock(() => reconcileUnlocked(previousXp, nextXp, options, scope));
};

const repairUnlocked = async (
  options: EnsureLevelGiftEntitlementOptions,
  scope: AccountScope,
): Promise<number[]> => {
  const ownerState = await prepareOwnerUnlocked(scope);
  if (!ownerState.owner || ownerState.changed) return [];
  const state = await loadState(scope);
  if (state.queue.state === 'unavailable') return [];
  if (state.queue.values.length === 0) {
    await writeLevels(PENDING_LEVEL_UP_QUEUE_KEY, [], scope);
    return [];
  }
  const candidates = state.queue.values.map((level) => makeEntry(level, ownerState.owner, options));
  return (await processEntriesUnlocked(candidates, ownerState.owner, options, scope, state)).showableLevels;
};

export const repairPendingLevelUpRewards = (
  options: EnsureLevelGiftEntitlementOptions = {},
): Promise<number[]> => {
  const scope = captureAccountScope();
  return withOperationLock(() => repairUnlocked(options, scope));
};

const retryUnlocked = async (
  options: EnsureLevelGiftEntitlementOptions,
  scope: AccountScope,
): Promise<number[]> => {
  const ownerState = await prepareOwnerUnlocked(scope);
  if (!ownerState.owner || ownerState.changed) return [];
  const state = await loadState(scope);
  const resolved = resolveKnownEntries(state, ownerState.owner, options);
  const candidates = [...resolved.entries.values()].filter((entry) => entry.owner === ownerState.owner);
  if (candidates.length === 0) {
    if (resolved.unresolvedLevels.length === 0 && state.retry.state === 'available') {
      await writeLevels(LEVEL_UP_REWARD_RETRY_KEY, [], scope);
    }
    return [];
  }
  return (await processEntriesUnlocked(candidates, ownerState.owner, options, scope, state)).showableLevels;
};

export const retryPendingLevelUpRewards = (
  options: EnsureLevelGiftEntitlementOptions = {},
): Promise<number[]> => {
  const scope = captureAccountScope();
  return withOperationLock(() => retryUnlocked(options, scope));
};

const acknowledgeUnlocked = async (level: number, scope: AccountScope): Promise<void> => {
  if (!Number.isInteger(level) || level <= 0) return;
  const ownerState = await prepareOwnerUnlocked(scope);
  if (!ownerState.owner || ownerState.changed) return;
  const queue = await readStoredArray(
    PENDING_LEVEL_UP_QUEUE_KEY,
    LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY,
    normalizeLevels,
    scope,
  );
  if (queue.state === 'unavailable') return;
  await writeLevels(PENDING_LEVEL_UP_QUEUE_KEY, queue.values.filter((item) => item !== level), scope);
};

export const acknowledgePendingLevelUpShown = (level: number): Promise<void> => {
  const scope = captureAccountScope();
  return withOperationLock(() => acknowledgeUnlocked(level, scope));
};

export const __levelUpRewardReconcilerTestHooks = {
  reset: (): void => {
    operationLock = Promise.resolve();
    inMemoryRetryEntries.clear();
  },
};
