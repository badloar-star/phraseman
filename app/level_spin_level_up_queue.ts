import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  withAccountTransitionLock,
  type AccountTransitionLockLease,
  type AccountGenerationToken,
} from './account_generation';
import { emitAppEvent } from './events';
import { PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY } from './level_up_storage_keys';
import { grantLocalLevelSpinsForAccount } from './local_level_spins';

export { PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY } from './level_up_storage_keys';
const MAX_LEVEL = 60;

function normalizeLevels(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw
    .map(Number)
    .filter((level) => Number.isInteger(level) && level >= 2 && level <= MAX_LEVEL))]
    .sort((a, b) => a - b);
}

function pendingLevelSpinQueueKey(owner: string): string {
  return `${PENDING_LEVEL_SPIN_LEVEL_UP_QUEUE_KEY}:${encodeURIComponent(owner)}`;
}

function tokenCurrent(token: AccountGenerationToken): boolean {
  return isCurrentAccountGeneration(token, token.stableId ?? undefined);
}

export function crossedSpinLevels(beforeLevel: number, afterLevel: number): number[] {
  const from = Math.max(2, Math.trunc(beforeLevel) + 1);
  const to = Math.min(MAX_LEVEL, Math.trunc(afterLevel));
  const levels: number[] = [];
  for (let level = from; level <= to; level += 1) levels.push(level);
  return levels;
}

export async function loadPendingLevelSpinLevelUps(): Promise<number[]> {
  const owner = captureAccountGeneration().stableId;
  if (!owner) return [];
  try {
    const raw = await AsyncStorage.getItem(pendingLevelSpinQueueKey(owner));
    return normalizeLevels(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

export async function enqueueLevelSpinLevelUps(
  beforeLevel: number,
  afterLevel: number,
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<number[]> {
  const crossed = crossedSpinLevels(beforeLevel, afterLevel);
  return enqueueAuthoritativeLevelSpinLevels(crossed, accountTransitionLockLease);
}

export async function enqueueAuthoritativeLevelSpinLevels(
  levels: readonly number[],
  accountTransitionLockLease?: AccountTransitionLockLease,
): Promise<number[]> {
  const crossed = normalizeLevels(levels);
  if (crossed.length === 0) return [];
  const token = captureAccountGeneration();
  // Credit first: a crash can at most postpone the plaque, never burn a Spin.
  // grantLocalLevelSpins is idempotent by issued level, so retry is safe.
  await grantLocalLevelSpinsForAccount(crossed, token, accountTransitionLockLease);
  const added = await withAccountTransitionLock(async () => {
    const owner = token.stableId;
    if (!owner || !tokenCurrent(token)) return [];
    const raw = await AsyncStorage.getItem(pendingLevelSpinQueueKey(owner));
    const existing = normalizeLevels(raw ? JSON.parse(raw) : []);
    const next = normalizeLevels([...existing, ...crossed]);
    const added = crossed.filter((level) => !existing.includes(level));
    if (added.length === 0) return [];
    await AsyncStorage.setItem(pendingLevelSpinQueueKey(owner), JSON.stringify(next));
    return tokenCurrent(token) ? added : [];
  }, accountTransitionLockLease);
  if (added.length === 0) return [];
  emitAppEvent('level_up_pending');
  return added;
}

export async function acknowledgePendingLevelSpinLevelUp(level: number): Promise<void> {
  if (!Number.isInteger(level) || level < 2 || level > MAX_LEVEL) return;
  const token = captureAccountGeneration();
  await withAccountTransitionLock(async () => {
    const owner = token.stableId;
    if (!owner || !tokenCurrent(token)) return;
    const raw = await AsyncStorage.getItem(pendingLevelSpinQueueKey(owner));
    const levels = normalizeLevels(raw ? JSON.parse(raw) : []);
    if (!tokenCurrent(token)) return;
    await AsyncStorage.setItem(
      pendingLevelSpinQueueKey(owner),
      JSON.stringify(levels.filter((candidate) => candidate !== level)),
    );
  });
}
