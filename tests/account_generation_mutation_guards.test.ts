import AsyncStorage from '@react-native-async-storage/async-storage';

const mockCallableInvoker = jest.fn();
const mockEnsureAnonUser = jest.fn(async () => 'account-a');
const mockEnsureStableAuthLinkForStableIdDetailed = jest.fn(async (stableUid: string) => ({
  ok: true,
  requestedStableId: stableUid,
  stableUid,
  authUid: `auth-${stableUid}`,
  source: 'callable',
}));
const mockReplaceShardsBalanceLocal = jest.fn(async () => undefined);
const mockReplaceShardsBalanceForAccountGeneration = jest.fn(async () => 'applied');
const mockAddShards = jest.fn(async () => 25);
const mockBumpLifetimeShardsSpent = jest.fn(async () => undefined);
const mockCheckAchievements = jest.fn(async () => undefined);
const mockEmitAppEvent = jest.fn();
const mockRegisterXP = jest.fn();

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallableInvoker),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: mockEnsureAnonUser,
  ensureStableAuthLinkForStableIdDetailed: mockEnsureStableAuthLinkForStableIdDetailed,
}));
jest.mock('../app/app_check_init', () => ({ initFirebaseAppCheckIfAvailable: jest.fn(async () => undefined) }));
jest.mock('../app/shards_system', () => ({
  addShards: mockAddShards,
  replaceShardsBalanceLocal: mockReplaceShardsBalanceLocal,
  replaceShardsBalanceForAccountGeneration: mockReplaceShardsBalanceForAccountGeneration,
}));
jest.mock('../app/lifetime_profile_stats', () => ({ bumpLifetimeShardsSpent: mockBumpLifetimeShardsSpent }));
jest.mock('../app/achievements', () => ({ checkAchievements: mockCheckAchievements }));
jest.mock('../app/events', () => ({ emitAppEvent: mockEmitAppEvent }));
jest.mock('../app/remote_flags', () => ({ isCollectiblesEnabled: jest.fn(() => true) }));
jest.mock('../app/xp_manager', () => ({ registerXP: mockRegisterXP }));
jest.mock('../app/app_health', () => ({ logAppWarning: jest.fn() }));
jest.mock('../app/premium_guard', () => ({ getVerifiedPremiumStatus: jest.fn(async () => true) }));
jest.mock('../app/feature_gates', () => ({ isFeatureFreeForEveryone: jest.fn(() => false) }));

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import { sendFriendGiftWithShards } from '../app/friend_gifts';
import {
  COLLECTIBLES_OWNED_KEY,
  getCollectiblesOwnedMapSync,
  getCollectiblesSeenSet,
  markCollectiblesSeen,
  maybeRollCollectibleDrop,
} from '../app/collectibles/storage';
import {
  grantLessonFirstCompleteBonus,
  retryPendingLessonBonusGrants,
} from '../app/lesson_bonus_grant';
import {
  addFlashcard,
  __resetFlashcardCacheForTests,
  __getFlashcardPendingRegistrySizesForTests,
  loadFlashcards,
  peekFlashcardsCache,
} from '../hooks/use-flashcards';
import { peekCustomCardsCache, readCustomCards } from '../app/flashcards/storage';
import {
  clearMistakeLog,
  compactMistakeLog,
  __getMistakeLogPendingRegistrySizeForTests,
  flushMistakeLog,
  logMistake,
} from '../app/mistake_log';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

beforeEach(async () => {
  storage.__reset?.();
  await storage.clear();
  jest.clearAllMocks();
  mockCallableInvoker.mockReset();
  __resetAccountGenerationForTests();
  __resetFlashcardCacheForTests();
  mockEnsureAnonUser.mockResolvedValue('account-a');
  mockEnsureStableAuthLinkForStableIdDetailed.mockImplementation(async (stableUid: string) => ({
    ok: true,
    requestedStableId: stableUid,
    stableUid,
    authUid: `auth-${stableUid}`,
    source: 'callable',
  }));
  mockRegisterXP.mockResolvedValue({ finalDelta: 550, multiplier: 1, isBonus: false });
});

test('late committed friend-gift response from account A resolves authoritatively without mutating account B', async () => {
  beginAccountGeneration('account-a');
  const response = deferred<{ data: {
    ok: true;
    giftId: 'chain_shield_1';
    costShards: number;
    senderBalanceAfter: number;
    shardsUpdatedAtMs: number;
  } }>();
  mockCallableInvoker.mockReturnValueOnce(response.promise);

  const request = sendFriendGiftWithShards({ friendStableId: 'friend-1', giftId: 'chain_shield_1' });
  // Let the idempotency-key persistence and auth-link promise chain reach the
  // deferred callable before switching accounts. A fixed microtask count is
  // brittle whenever another guarded async step is added ahead of the request.
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
  beginAccountGeneration('account-b');
  response.resolve({ data: {
    ok: true,
    giftId: 'chain_shield_1',
    costShards: 5,
    senderBalanceAfter: 95,
    shardsUpdatedAtMs: 3_000,
  } });

  await expect(request).resolves.toMatchObject({
    ok: true,
    senderBalanceAfter: 95,
  });
  expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
  expect(mockReplaceShardsBalanceForAccountGeneration).not.toHaveBeenCalled();
  expect(mockReplaceShardsBalanceLocal).not.toHaveBeenCalled();
  expect(mockBumpLifetimeShardsSpent).not.toHaveBeenCalled();
  expect(mockCheckAchievements).not.toHaveBeenCalled();
});

test('uninitialized identity cannot hydrate or mutate account-owned stores', async () => {
  await expect(loadFlashcards('fr')).resolves.toEqual([]);
  await expect(addFlashcard({ en: 'boot secret', ru: 'boot secret', uk: 'boot secret', source: 'lesson' }, 'fr'))
    .resolves.toBe('stale');
  await expect(readCustomCards('fr')).resolves.toEqual([]);
  await expect(grantLessonFirstCompleteBonus({ lessonId: 99, studyTarget: 'fr', lang: 'ru' }))
    .resolves.toEqual({ status: 'failed' });
  await expect(sendFriendGiftWithShards({ friendStableId: 'friend-boot', giftId: 'chain_shield_1' }))
    .rejects.toThrow('friend_gift_identity_changed');
  logMistake('boot mistake', 1, 'lesson', 'wrong_pick', {}, 'fr');
  await flushMistakeLog();

  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
  expect(mockRegisterXP).not.toHaveBeenCalled();
  expect(mockCallableInvoker).not.toHaveBeenCalled();
  expect(peekFlashcardsCache('fr')).toBeNull();
  expect(peekCustomCardsCache('fr')).toBeNull();
});

test('pending lesson retry remains bound to the account that read the pending entry', async () => {
  beginAccountGeneration('account-a');
  const pendingRead = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(pendingRead.promise);

  const retry = retryPendingLessonBonusGrants();
  beginAccountGeneration('account-b');
  pendingRead.resolve(JSON.stringify([{
    lessonId: 77,
    studyTarget: 'fr',
    lang: 'ru',
    at: 1,
  }]));

  await expect(retry).resolves.toBe(0);
  expect(mockRegisterXP).not.toHaveBeenCalled();
  expect(mockAddShards).not.toHaveBeenCalled();
});

test('mistake compaction discards an account A snapshot resolved after account B activates', async () => {
  beginAccountGeneration('account-a');
  const readA = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(readA.promise);

  const compact = compactMistakeLog('fr');
  for (let i = 0; i < 12 && storage.getItem.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  expect(storage.getItem).toHaveBeenCalledTimes(1);
  beginAccountGeneration('account-b');
  readA.resolve(JSON.stringify([{
    phrase: 'from a', lessonId: 1, mode: 'lesson', what: 'wrong_pick', ts: Date.now(),
  }]));

  await compact;
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('mistake clear rechecks its account after waiting for the transition lock', async () => {
  beginAccountGeneration('account-a');
  const blocker = deferred<void>();
  const occupied = withAccountTransitionLock(async () => blocker.promise);
  await Promise.resolve();

  const clear = clearMistakeLog('fr');
  beginAccountGeneration('account-b');
  blocker.resolve();
  await occupied;
  await clear;

  expect(storage.removeItem).not.toHaveBeenCalled();
});

test('late collectible response from account A cannot write account B inventory, wallet, or events', async () => {
  beginAccountGeneration('account-a');
  const response = deferred<{ data: Record<string, unknown> }>();
  mockCallableInvoker.mockReturnValueOnce(response.promise);

  const request = maybeRollCollectibleDrop('lesson', 'account-race', { dailyScoped: false });
  beginAccountGeneration('account-b');
  response.resolve({ data: {
    ok: true,
    dropped: true,
    card: { id: 'aurora_01', setId: 'aurora', rarity: 'common' },
    bonusShards: 10,
    shardsBalance: 110,
  } });

  await expect(request).resolves.toBeNull();
  expect(storage.setItem).not.toHaveBeenCalledWith(COLLECTIBLES_OWNED_KEY, expect.any(String));
  expect(getCollectiblesOwnedMapSync()).not.toEqual(expect.objectContaining({ aurora_01: expect.any(Number) }));
  expect(mockReplaceShardsBalanceForAccountGeneration).not.toHaveBeenCalled();
  expect(mockReplaceShardsBalanceLocal).not.toHaveBeenCalled();
  expect(mockEmitAppEvent).not.toHaveBeenCalledWith('collectibles_changed');
});

test('collectibles seen read-modify-write cannot cross from account A into account B', async () => {
  beginAccountGeneration('account-a');
  const seenRead = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(seenRead.promise);

  const request = markCollectiblesSeen(['aurora_01']);
  for (let i = 0; i < 12 && storage.getItem.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  expect(storage.getItem).toHaveBeenCalledTimes(1);
  beginAccountGeneration('account-b');
  seenRead.resolve(JSON.stringify(['old_card']));

  await request;
  expect(storage.setItem).not.toHaveBeenCalledWith(
    'collectibles_seen_local_v1',
    expect.stringContaining('aurora_01'),
  );
});

test('uninitialized identity cannot read collectibles seen state', async () => {
  await expect(getCollectiblesSeenSet()).resolves.toEqual(new Set());
  expect(storage.getItem).not.toHaveBeenCalled();
});

test('late lesson bonus result from account A cannot grant account B shards or guard/pending state', async () => {
  beginAccountGeneration('account-a');
  const xp = deferred<{ finalDelta: number; multiplier: number; isBonus: boolean }>();
  storage.getItem.mockResolvedValue(null);
  mockRegisterXP.mockReturnValueOnce(xp.promise);

  const request = grantLessonFirstCompleteBonus({ lessonId: 41, studyTarget: 'fr', lang: 'ru' });
  for (let i = 0; i < 12 && mockRegisterXP.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  expect(mockRegisterXP).toHaveBeenCalledTimes(1);
  beginAccountGeneration('account-b');
  xp.resolve({ finalDelta: 550, multiplier: 1, isBonus: false });

  await expect(request).resolves.toEqual({ status: 'failed' });
  expect(mockAddShards).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalledWith(expect.stringContaining('lesson_bonus_granted'), '1');
  expect(storage.setItem).not.toHaveBeenCalledWith('lesson_bonus_pending_v1', expect.any(String));
});

test('late account A flashcard load cannot hydrate account B cache', async () => {
  beginAccountGeneration('account-a');
  const readA = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(readA.promise);
  const requestA = loadFlashcards('fr');

  beginAccountGeneration('account-b');
  readA.resolve(JSON.stringify([{
    id: 'a-card', en: 'from a', ru: 'a', uk: 'a', source: 'lesson', addedAt: 1,
  }]));

  await expect(requestA).resolves.toEqual([]);
  expect(peekFlashcardsCache('fr')).toBeNull();

  storage.getItem.mockResolvedValueOnce(JSON.stringify([{
    id: 'b-card', en: 'from b', ru: 'b', uk: 'b', source: 'lesson', addedAt: 2,
  }]));
  await expect(loadFlashcards('fr')).resolves.toEqual([
    expect.objectContaining({ id: 'b-card', en: 'from b' }),
  ]);
});

test('late account A custom-card read cannot hydrate account B instant cache', async () => {
  beginAccountGeneration('account-a');
  const readA = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(readA.promise);
  const requestA = readCustomCards('fr');

  beginAccountGeneration('account-b');
  readA.resolve(JSON.stringify([{ id: 'a-custom' }]));

  await expect(requestA).resolves.toEqual([]);
  expect(peekCustomCardsCache('fr')).toBeNull();
});

test('account-scoped mistake queues let B persist while a deferred A read is discarded', async () => {
  beginAccountGeneration('account-a');
  const readA = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(readA.promise).mockResolvedValueOnce(null);
  logMistake('from account a', 1, 'lesson', 'wrong_pick', {}, 'fr');
  await Promise.resolve();

  beginAccountGeneration('account-b');
  logMistake('from account b', 2, 'lesson', 'wrong_pick', {}, 'fr');
  await Promise.resolve();
  await Promise.resolve();

  readA.resolve(null);
  await flushMistakeLog();

  const payloads = storage.setItem.mock.calls
    .filter(([key]) => String(key).includes('mistake'))
    .map(([, raw]) => JSON.parse(String(raw)) as Array<{ phrase: string }>);
  expect(payloads).toHaveLength(1);
  expect(payloads[0].map((entry) => entry.phrase)).toEqual(['from account b']);
});

test('current-account mistake compaction does not await a stale generation hanging read', async () => {
  beginAccountGeneration('account-a');
  const readA = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(readA.promise);
  logMistake('from account a', 1, 'lesson', 'wrong_pick', {}, 'fr');
  for (let i = 0; i < 12 && storage.getItem.mock.calls.length === 0; i += 1) {
    await Promise.resolve();
  }
  expect(storage.getItem).toHaveBeenCalledTimes(1);

  beginAccountGeneration('account-b');
  storage.getItem.mockResolvedValue(null);
  let compactSettled = false;
  const compact = compactMistakeLog('fr').then(() => { compactSettled = true; });
  for (let i = 0; i < 12 && !compactSettled; i += 1) await Promise.resolve();

  expect(compactSettled).toBe(true);
  readA.resolve(null);
  await compact;
  await flushMistakeLog();
});

test('hanging flashcard and mistake registries stay bounded across account generations', async () => {
  const never = new Promise<string | null>(() => {});
  storage.getItem.mockImplementation(() => never);

  for (let i = 0; i < 20; i += 1) {
    beginAccountGeneration(`account-${i}`);
    void loadFlashcards('fr');
    logMistake(`mistake-${i}`, i, 'lesson', 'wrong_pick', {}, 'fr');
  }

  expect(__getFlashcardPendingRegistrySizesForTests().loads).toBeLessThanOrEqual(8);
  expect(__getFlashcardPendingRegistrySizesForTests().writes).toBeLessThanOrEqual(8);
  expect(__getMistakeLogPendingRegistrySizeForTests()).toBeLessThanOrEqual(8);
  storage.getItem.mockResolvedValue(null);
});

test('same active account still completes friend gift and lesson bonus mutations', async () => {
  beginAccountGeneration('account-a');
  mockCallableInvoker.mockResolvedValueOnce({ data: {
    ok: true,
    giftId: 'chain_shield_1',
    costShards: 5,
    senderBalanceAfter: 95,
    shardsUpdatedAtMs: 3_000,
  } });

  await sendFriendGiftWithShards({ friendStableId: 'friend-2', giftId: 'chain_shield_1' });
  const lesson = await grantLessonFirstCompleteBonus({ lessonId: 42, studyTarget: 'fr', lang: 'ru' });

  expect(mockReplaceShardsBalanceForAccountGeneration).toHaveBeenCalledWith(
    95,
    expect.objectContaining({ stableId: 'account-a' }),
    'account-a',
    expect.objectContaining({ reason: 'friend_gift' }),
  );
  expect(mockBumpLifetimeShardsSpent).toHaveBeenCalledWith(
    5,
    expect.objectContaining({ stableId: 'account-a', phase: 'active' }),
  );
  expect(mockCheckAchievements).toHaveBeenCalledWith(
    { type: 'gift_sent' },
    expect.objectContaining({ stableId: 'account-a', phase: 'active' }),
  );
  expect(mockAddShards).toHaveBeenCalledWith('lesson_first', { suppressEarnEvent: true });
  expect(lesson.status).toBe('granted');
});
