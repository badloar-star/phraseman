import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from '../app/events';
import { ensureLevelGiftEntitlement, type LevelGiftEntitlementResult } from '../app/level_gift_inventory';
import type { GiftDef } from '../app/level_gift_system';
import { getCanonicalUserId } from '../app/user_id_policy';
import {
  __levelUpRewardReconcilerTestHooks,
  acknowledgePendingLevelUpShown,
  LEVEL_UP_REWARD_FALLBACK_KEY,
  LEVEL_UP_REWARD_FALLBACK_QUARANTINE_KEY,
  LEVEL_UP_REWARD_CONTEXT_KEY,
  LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY,
  LEVEL_UP_REWARD_OWNER_KEY,
  LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY,
  LEVEL_UP_REWARD_RETRY_QUARANTINE_KEY,
  LEVEL_UP_REWARD_RETRY_KEY,
  PENDING_LEVEL_UP_QUEUE_KEY,
  reconcileLevelUpRewards,
  repairPendingLevelUpRewards,
  retryPendingLevelUpRewards,
} from '../app/level_up_reward_reconciler';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/level_gift_inventory', () => ({ ensureLevelGiftEntitlement: jest.fn() }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn() }));
jest.mock('../constants/theme', () => ({
  getLevelFromXP: (xp: number) => Math.floor(Math.max(0, xp) / 100) + 1,
}));

const storage: Record<string, string> = {};
const entitlement = ensureLevelGiftEntitlement as jest.MockedFunction<typeof ensureLevelGiftEntitlement>;
const canonicalUserId = getCanonicalUserId as jest.MockedFunction<typeof getCanonicalUserId>;

const fakeGift = (level: number): GiftDef => ({
  id: `gift-${level}`,
  rarity: 'common',
  icon: 'gift',
  titleRU: `gift-${level}`,
  titleUK: `gift-${level}`,
  titleES: `gift-${level}`,
  descRU: `gift-${level}`,
  descUK: `gift-${level}`,
  descES: `gift-${level}`,
  weight: 1,
});

const result = (
  status: 'persisted' | 'already_pending' | 'already_claimed' | 'failed',
  level: number,
): LevelGiftEntitlementResult => {
  if (status === 'persisted' || status === 'already_pending') {
    return { status, level, kind: 'single', gift: fakeGift(level) };
  }
  if (status === 'already_claimed') return { status, level };
  return { status: 'failed', level };
};

const readLevels = (key: string): number[] => JSON.parse(storage[key] ?? '[]');

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(storage).forEach((key) => delete storage[key]);
  __levelUpRewardReconcilerTestHooks.reset();
  canonicalUserId.mockResolvedValue('stable-A');
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
});

test('reconciles every crossed level sequentially and remains idempotent', async () => {
  const active = new Set<number>();
  let concurrent = false;
  entitlement.mockImplementation(async (level) => {
    if (active.size) concurrent = true;
    active.add(level);
    await Promise.resolve();
    active.delete(level);
    return result('persisted', level);
  });

  await expect(reconcileLevelUpRewards(50, 350, { premium: true })).resolves.toEqual([
    result('persisted', 2), result('persisted', 3), result('persisted', 4),
  ]);
  entitlement.mockImplementation(async (level) => result('already_pending', level));
  await reconcileLevelUpRewards(50, 350, { premium: true });

  expect(concurrent).toBe(false);
  expect(entitlement.mock.calls.map(([level]) => level)).toEqual([2, 3, 4, 2, 3, 4]);
  expect(entitlement.mock.calls.every(([, options]) => options?.premium === true)).toBe(true);
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2, 3, 4]);
});

test('serializes overlapping reconciliations and deduplicates the show queue', async () => {
  entitlement.mockImplementation(async (level) => result('already_pending', level));

  await Promise.all([
    reconcileLevelUpRewards(50, 250),
    reconcileLevelUpRewards(150, 350),
  ]);

  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2, 3, 4]);
});

test('moves failed entitlement to durable retry and later makes it showable', async () => {
  entitlement.mockResolvedValueOnce(result('failed', 2)).mockResolvedValueOnce(result('persisted', 2));

  await reconcileLevelUpRewards(50, 150);
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([2]);

  await expect(retryPendingLevelUpRewards()).resolves.toEqual([2]);
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
});

test('keeps a retry in memory when its marker write fails and retries in the same process', async () => {
  entitlement.mockResolvedValueOnce(result('failed', 2)).mockResolvedValueOnce(result('persisted', 2));
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValue(new Error('disk full'));
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === LEVEL_UP_REWARD_OWNER_KEY) {
      storage[key] = value;
      return;
    }
    throw new Error('disk full');
  });

  await reconcileLevelUpRewards(50, 150);
  expect(storage[LEVEL_UP_REWARD_RETRY_KEY]).toBeUndefined();

  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  await expect(retryPendingLevelUpRewards()).resolves.toEqual([2]);
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
});

test('repairs a legacy queue, removes claimed levels, and retries failures', async () => {
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = JSON.stringify([5, 3, 5]);
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([3]);
  entitlement.mockImplementation(async (level) => (
    level === 3 ? result('already_claimed', level) : result('failed', level)
  ));

  await expect(repairPendingLevelUpRewards({ premium: true })).resolves.toEqual([]);

  expect(entitlement.mock.calls.map(([level]) => level)).toEqual([3, 5]);
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([5]);
});

test('filters corrupt queue entries into sorted unique positive integers', async () => {
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = JSON.stringify([5, -1, 3, 5, 2.5, '4', null, 0]);
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([9, 7, 9, '8', -2]);
  entitlement.mockImplementation(async (level) => result('already_pending', level));

  await expect(repairPendingLevelUpRewards()).resolves.toEqual([3, 5]);
  await expect(retryPendingLevelUpRewards()).resolves.toEqual([7, 9]);

  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([3, 5, 7, 9]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
});

test('quarantines a corrupt pending queue and restores future queue liveness', async () => {
  const corruptRaw = '{not-json';
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = corruptRaw;
  entitlement.mockResolvedValue(result('already_pending', 2));

  await reconcileLevelUpRewards(50, 150);

  expect(storage[LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY]).toBe(corruptRaw);
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
  expect(emitAppEvent).toHaveBeenCalledWith('level_up_pending');
});

test('quarantines a corrupt retry array before resetting it', async () => {
  const corruptRaw = '{broken-retry';
  storage[LEVEL_UP_REWARD_RETRY_KEY] = corruptRaw;

  await retryPendingLevelUpRewards();

  expect(storage[LEVEL_UP_REWARD_RETRY_QUARANTINE_KEY]).toBe(corruptRaw);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
  expect(entitlement).not.toHaveBeenCalled();
});

test('does not clear persisted state when reading its queue fails', async () => {
  entitlement.mockResolvedValue(result('already_pending', 2));
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === PENDING_LEVEL_UP_QUEUE_KEY) throw new Error('storage unavailable');
    return storage[key] ?? null;
  });

  await reconcileLevelUpRewards(50, 150);

  expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(PENDING_LEVEL_UP_QUEUE_KEY, expect.any(String));
  expect(emitAppEvent).not.toHaveBeenCalled();
});

test('repairs an available pending array containing only invalid entries to an empty array', async () => {
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = JSON.stringify([-1, 0, 2.5, '3', null]);

  await expect(repairPendingLevelUpRewards()).resolves.toEqual([]);

  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([]);
  expect(entitlement).not.toHaveBeenCalled();
  expect(emitAppEvent).not.toHaveBeenCalled();
});

test('repairs an available retry array containing only invalid entries to an empty array', async () => {
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([-1, 0, 2.5, '3', null]);

  await expect(retryPendingLevelUpRewards()).resolves.toEqual([]);

  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
  expect(entitlement).not.toHaveBeenCalled();
  expect(emitAppEvent).not.toHaveBeenCalled();
});

test('acknowledge and reconcile share one lock without losing or resurrecting levels', async () => {
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = JSON.stringify([5]);
  entitlement.mockResolvedValue(result('persisted', 6));

  await Promise.all([
    acknowledgePendingLevelUpShown(5),
    reconcileLevelUpRewards(450, 550),
  ]);

  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([6]);
});

test('does nothing when XP does not cross a level or moves backwards', async () => {
  await expect(reconcileLevelUpRewards(110, 199)).resolves.toEqual([]);
  await expect(reconcileLevelUpRewards(250, 150)).resolves.toEqual([]);
  expect(entitlement).not.toHaveBeenCalled();
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
});

test('emits level_up_pending only after the show queue is durably persisted', async () => {
  entitlement.mockResolvedValue(result('persisted', 2));
  let queuePersisted = false;
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === PENDING_LEVEL_UP_QUEUE_KEY) queuePersisted = true;
    storage[key] = value;
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => {
      if (key === PENDING_LEVEL_UP_QUEUE_KEY) queuePersisted = true;
      storage[key] = value;
    });
  });
  (emitAppEvent as jest.Mock).mockImplementation(() => {
    expect(queuePersisted).toBe(true);
    expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
  });

  await reconcileLevelUpRewards(50, 150);

  expect(emitAppEvent).toHaveBeenCalledWith('level_up_pending');
});

test('durably stages retry before entitlement and survives a module-memory restart', async () => {
  entitlement.mockResolvedValueOnce(result('failed', 2)).mockResolvedValueOnce(result('persisted', 2));

  await reconcileLevelUpRewards(50, 150, { premium: true, studyTarget: 'fr' });
  __levelUpRewardReconcilerTestHooks.reset();
  await retryPendingLevelUpRewards();

  expect(entitlement).toHaveBeenNthCalledWith(2, 2, { premium: true, studyTarget: 'fr' });
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
});

test('uses a durable fallback journal when primary staging fails', async () => {
  entitlement.mockResolvedValueOnce(result('failed', 2)).mockResolvedValueOnce(result('persisted', 2));
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValue(new Error('primary unavailable'));

  await reconcileLevelUpRewards(50, 150, { premium: true, studyTarget: 'fr' });
  expect(JSON.parse(storage[LEVEL_UP_REWARD_FALLBACK_KEY])).toEqual([
    { level: 2, owner: 'stable-A', premium: true, studyTarget: 'fr' },
  ]);

  __levelUpRewardReconcilerTestHooks.reset();
  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  await retryPendingLevelUpRewards();

  expect(entitlement).toHaveBeenNthCalledWith(2, 2, { premium: true, studyTarget: 'fr' });
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
});

test('clears old reward state and does not process it after a confirmed account switch', async () => {
  storage[LEVEL_UP_REWARD_OWNER_KEY] = 'stable-A';
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = JSON.stringify([5]);
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([6]);
  canonicalUserId.mockResolvedValue('stable-B');

  await retryPendingLevelUpRewards();

  expect(storage[LEVEL_UP_REWARD_OWNER_KEY]).toBe('stable-B');
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
  expect(entitlement).not.toHaveBeenCalled();
});

test('does not clear or process saved reward state when canonical owner is unavailable', async () => {
  storage[LEVEL_UP_REWARD_OWNER_KEY] = 'stable-A';
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = JSON.stringify([5]);
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([6]);
  canonicalUserId.mockResolvedValue(null);

  await retryPendingLevelUpRewards();

  expect(storage[LEVEL_UP_REWARD_OWNER_KEY]).toBe('stable-A');
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([5]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([6]);
  expect(entitlement).not.toHaveBeenCalled();
});

test('keeps a successful entitlement retryable across restart when the show queue is unavailable', async () => {
  entitlement.mockResolvedValueOnce(result('persisted', 2)).mockResolvedValueOnce(result('already_pending', 2));
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === PENDING_LEVEL_UP_QUEUE_KEY) throw new Error('queue unavailable');
    return storage[key] ?? null;
  });

  await reconcileLevelUpRewards(50, 150, { premium: true, studyTarget: 'fr' });
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([2]);

  __levelUpRewardReconcilerTestHooks.reset();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  await retryPendingLevelUpRewards();

  expect(entitlement).toHaveBeenNthCalledWith(2, 2, { premium: true, studyTarget: 'fr' });
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
});

test('preserves failed work in fallback when primary retry storage cannot be read', async () => {
  entitlement.mockResolvedValueOnce(result('failed', 2)).mockResolvedValueOnce(result('persisted', 2));
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === LEVEL_UP_REWARD_RETRY_KEY) throw new Error('primary retry unavailable');
    return storage[key] ?? null;
  });

  await reconcileLevelUpRewards(50, 150, { premium: true, studyTarget: 'fr' });
  expect(JSON.parse(storage[LEVEL_UP_REWARD_FALLBACK_KEY])).toEqual([
    { level: 2, owner: 'stable-A', premium: true, studyTarget: 'fr' },
  ]);

  __levelUpRewardReconcilerTestHooks.reset();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => storage[key] ?? null);
  await retryPendingLevelUpRewards();

  expect(entitlement).toHaveBeenNthCalledWith(2, 2, { premium: true, studyTarget: 'fr' });
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
});

test('continues the current reconcile after clearing state for a confirmed owner switch', async () => {
  storage[LEVEL_UP_REWARD_OWNER_KEY] = 'stable-A';
  storage[PENDING_LEVEL_UP_QUEUE_KEY] = JSON.stringify([5]);
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([6]);
  canonicalUserId.mockResolvedValue('stable-B');
  entitlement.mockResolvedValue(result('persisted', 2));

  await reconcileLevelUpRewards(50, 150);

  expect(entitlement).toHaveBeenCalledWith(2, { premium: false });
  expect(storage[LEVEL_UP_REWARD_OWNER_KEY]).toBe('stable-B');
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([]);
});

test('quarantines corrupt retry context without downgrading saved options', async () => {
  const corruptRaw = '{broken-context';
  storage[LEVEL_UP_REWARD_OWNER_KEY] = 'stable-A';
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([2]);
  storage[LEVEL_UP_REWARD_CONTEXT_KEY] = corruptRaw;

  await retryPendingLevelUpRewards();

  expect(storage[LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY]).toBe(corruptRaw);
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([2]);
  expect(entitlement).not.toHaveBeenCalled();

  __levelUpRewardReconcilerTestHooks.reset();
  await retryPendingLevelUpRewards();
  expect(entitlement).not.toHaveBeenCalled();

  entitlement.mockResolvedValue(result('persisted', 2));
  await retryPendingLevelUpRewards({ premium: true, studyTarget: 'fr' });
  expect(entitlement).toHaveBeenCalledWith(2, { premium: true, studyTarget: 'fr' });
});

test('quarantines a corrupt fallback journal and never processes invented context', async () => {
  const corruptRaw = '{broken-fallback';
  storage[LEVEL_UP_REWARD_OWNER_KEY] = 'stable-A';
  storage[LEVEL_UP_REWARD_FALLBACK_KEY] = corruptRaw;

  await retryPendingLevelUpRewards();

  expect(storage[LEVEL_UP_REWARD_FALLBACK_QUARANTINE_KEY]).toBe(corruptRaw);
  expect(storage[LEVEL_UP_REWARD_FALLBACK_KEY]).toBe('[]');
  expect(entitlement).not.toHaveBeenCalled();
});

test('does not invent retry context when the primary context store cannot be read', async () => {
  storage[LEVEL_UP_REWARD_OWNER_KEY] = 'stable-A';
  storage[LEVEL_UP_REWARD_RETRY_KEY] = JSON.stringify([2]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
    if (key === LEVEL_UP_REWARD_CONTEXT_KEY) throw new Error('context unavailable');
    return storage[key] ?? null;
  });

  await retryPendingLevelUpRewards({ premium: true, studyTarget: 'fr' });

  expect(entitlement).not.toHaveBeenCalled();
  expect(readLevels(LEVEL_UP_REWARD_RETRY_KEY)).toEqual([2]);
});

test('clears successful and claimed memory-only staging after the show queue persists', async () => {
  entitlement
    .mockResolvedValueOnce(result('persisted', 2))
    .mockResolvedValueOnce(result('already_claimed', 3));
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValue(new Error('primary unavailable'));
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === LEVEL_UP_REWARD_FALLBACK_KEY) throw new Error('fallback unavailable');
    storage[key] = value;
  });

  await reconcileLevelUpRewards(50, 250);
  expect(readLevels(PENDING_LEVEL_UP_QUEUE_KEY)).toEqual([2]);

  (AsyncStorage.multiSet as jest.Mock).mockImplementation(async (pairs: [string, string][]) => {
    pairs.forEach(([key, value]) => { storage[key] = value; });
  });
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  await expect(retryPendingLevelUpRewards()).resolves.toEqual([]);

  expect(entitlement).toHaveBeenCalledTimes(2);
});
