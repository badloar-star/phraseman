// Регрессия на баг content-репорта: покупка карточек за осколки виснет навсегда,
// когда Firebase недоступен (заблокированный регион без VPN). spendShards ходит в
// Firestore-транзакцию БЕЗ таймаута → состояние «Подождите…» держится вечно.
//
// Фикс: applyShardDeltaToCloud оборачивает cloud read/write в таймаут. При зависшем облаке
// списание уходит в локальную ветку — покупка завершается, а синк догоняет в фоне.
import AsyncStorage from '@react-native-async-storage/async-storage';

// В RN-рантайме __DEV__ всегда определён; в jest — нет. Задаём явно (как релизный
// билд), иначе `if (__DEV__) console.warn` внутри catch-блоков бросает ReferenceError.
(global as { __DEV__?: boolean }).__DEV__ = false;

// Никогда не резолвящийся промис = заблокированный Firebase: запрос ушёл, ответа нет.
const hangingGet = jest.fn(() => new Promise(() => {}));
const forbiddenTransaction = jest.fn(() => Promise.reject(new Error('runTransaction must not be used for shard timeout fallback')));

// Полный chainable-мок Firestore: любой .collection()/.doc() возвращает объект с теми же
// методами, а .add()/.set()/.get() резолвятся пусто. Так тест проверяет ИМЕННО таймаут
// транзакции, а не спотыкается о неполный мок (например на фоновом логе shard_log).
function makeChainableRef(path = ''): any {
  const ref: any = {
    __path: path,
    collection: jest.fn((name: string) => makeChainableRef(path ? `${path}/${name}` : name)),
    doc: jest.fn((id: string) => makeChainableRef(path ? `${path}/${id}` : id)),
    add: jest.fn(async () => ({ id: 'log1' })),
    set: jest.fn(async () => undefined),
    get: jest.fn(() => (/^users\/[^/]+$/.test(path) ? hangingGet() : Promise.resolve({ exists: false, data: () => ({}) }))),
  };
  return ref;
}

const mockFirestore = Object.assign(
  jest.fn(() => ({
    collection: jest.fn((name: string) => makeChainableRef(name)),
    runTransaction: forbiddenTransaction,
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
// withStorageLock просто исполняет переданную функцию (без реального мьютекса в тесте).
jest.mock('../app/storage_mutex', () => ({
  withStorageLock: jest.fn(async (fn: () => Promise<unknown>) => fn()),
}));
// Динамический import('./achievements') после списания — мокаем, чтобы не тянуть реальный модуль.
jest.mock('../app/achievements', () => ({ checkAchievements: jest.fn() }));

import { getShardsBalance, spendShards } from '../app/shards_system';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
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

afterEach(() => {
  jest.useRealTimers();
});

describe('spendShards when Firebase is unreachable (blocked region)', () => {
  it('does not hang forever — falls back to local spend after the cloud timeout', async () => {
    mockStorage.shards_balance = '50';

    const spendPromise = spendShards(30, 'card_pack');

    // Прокручиваем таймеры за оба порога: сначала зависшая транзакция списания (6с),
    // затем зависший фоновый синк локального баланса (ещё 6с) — оба теперь с таймаутом.
    await jest.advanceTimersByTimeAsync(7000);
    await jest.advanceTimersByTimeAsync(7000);

    await expect(spendPromise).resolves.toBe(true);
    // Списание прошло локально: 50 − 30 = 20.
    await expect(getShardsBalance()).resolves.toBe(20);
    // Cloud read действительно запускался (а не был пропущен), завис и ушёл в timeout fallback.
    expect(hangingGet).toHaveBeenCalled();
    expect(forbiddenTransaction).not.toHaveBeenCalled();
  }, 30000);
});
