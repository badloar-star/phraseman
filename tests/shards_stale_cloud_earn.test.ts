// Регрессия на баг-репорт 2026-07-04 (Анастасия): «поиграла в Арене, потом сделала
// урок — 200 осколков куда-то сдуло». Корень: applyShardDeltaToCloud при онлайне
// строил дельту от ОБЛАЧНОГО баланса, игнорируя локальный. Если фоновая синхронизация
// награды за победу в Арене ещё не доехала до облака (таймаут 6с / оффлайн / гонка),
// облако отставало. Первое же начисление за урок (+1..+2) читало отставшее облако
// (напр. 50) и возвращало 50+2 = 52 → mirrorServerShardBalanceLocal обваливал локаль
// с 250 до 52. Потеря ~200 осколков.
//
// Фикс: last-write-guard в applyShardDeltaToCloud. Если локальная метка НОВЕЕ облачной,
// базой для дельты берём max(cloudShards, localBase) — облако не занижает свежую локаль.
import AsyncStorage from '@react-native-async-storage/async-storage';

(global as { __DEV__?: boolean }).__DEV__ = false;

// Облако отстало: shards=50 со СТАРОЙ меткой. Локаль будет 250 со СВЕЖЕЙ меткой.
const STALE_CLOUD_UPDATED_AT = 1_000;
const cloudUserGet = jest.fn(async () => ({
  exists: true,
  data: () => ({ shards: 50, shards_updated_at_ms: STALE_CLOUD_UPDATED_AT }),
}));
// Ловим последнюю запись в облако, чтобы проверить, что туда ушёл ПРАВИЛЬНЫЙ баланс.
const cloudUserSet = jest.fn(async (_data?: { shards?: number }) => undefined);

function makeChainableRef(path = ''): any {
  const isUserDoc = /^users\/[^/]+$/.test(path);
  const ref: any = {
    __path: path,
    collection: jest.fn((name: string) => makeChainableRef(path ? `${path}/${name}` : name)),
    doc: jest.fn((id: string) => makeChainableRef(path ? `${path}/${id}` : id)),
    add: jest.fn(async () => ({ id: 'log1' })),
    set: jest.fn((data?: { shards?: number }) => (isUserDoc ? cloudUserSet(data) : Promise.resolve(undefined))),
    get: jest.fn(() => (isUserDoc ? cloudUserGet() : Promise.resolve({ exists: false, data: () => ({}) }))),
  };
  return ref;
}

const mockFirestore = Object.assign(
  jest.fn(() => ({
    collection: jest.fn((name: string) => makeChainableRef(name)),
    runTransaction: jest.fn(() => Promise.reject(new Error('runTransaction not used here'))),
  })),
  { FieldValue: { serverTimestamp: jest.fn(() => 'ts') } },
);

jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/firestore', () => ({ __esModule: true, default: mockFirestore }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'u1') }));
jest.mock('../app/lifetime_profile_stats', () => ({
  bumpLifetimeShardsEarned: jest.fn(),
  bumpLifetimeShardsSpent: jest.fn(),
}));
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));
jest.mock('../app/achievements', () => ({ checkAchievements: jest.fn() }));

import { addShards, getShardsBalance } from '../app/shards_system';

const STORAGE_KEY = 'shards_balance';
const BALANCE_META_KEY = 'shards_balance_meta_v1';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.multiSet as jest.Mock).mockImplementation((pairs: Array<[string, string]>) => {
    for (const [k, v] of pairs) mockStorage[k] = v;
    return Promise.resolve();
  });
});

describe('earn does not collapse a fresher local balance to a stale cloud one', () => {
  beforeEach(() => {
    // Локаль: 250 осколков (награда за победу в Арене уже начислена), метка СВЕЖАЯ —
    // сильно новее облачной STALE_CLOUD_UPDATED_AT.
    mockStorage[STORAGE_KEY] = '250';
    mockStorage[BALANCE_META_KEY] = JSON.stringify({
      updatedAtMs: STALE_CLOUD_UPDATED_AT + 5_000_000,
      op: 'earn',
      reason: 'arena_win',
    });
  });

  it('lesson_perfect (+2) → 252, NOT 52 (stale cloud=50 ignored because local meta is newer)', async () => {
    const gained = await addShards('lesson_perfect', { suppressEarnEvent: true });
    expect(gained).toBe(2);
    // Главная проверка: баланс НЕ обвалился до 52. Он = локаль(250) + награда(2).
    await expect(getShardsBalance()).resolves.toBe(252);
    expect(cloudUserGet).toHaveBeenCalled();
    // В облако ушёл корректный (не отставший) баланс.
    const setCalls = cloudUserSet.mock.calls;
    const lastSetArg = setCalls.length > 0 ? setCalls[setCalls.length - 1][0] : undefined;
    expect(lastSetArg?.shards).toBe(252);
  });

  it('still trusts cloud when the cloud meta is NEWER than local (legit server credit)', async () => {
    // Облако свежее: метка новее локальной → облако авторитетно, дельта от 50.
    cloudUserGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ shards: 50, shards_updated_at_ms: STALE_CLOUD_UPDATED_AT + 9_000_000 }),
    });
    const gained = await addShards('lesson_perfect', { suppressEarnEvent: true });
    expect(gained).toBe(2);
    await expect(getShardsBalance()).resolves.toBe(52);
  });
});
