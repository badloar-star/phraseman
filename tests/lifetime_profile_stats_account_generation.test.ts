import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';

jest.mock('../app/flashcards/storage', () => ({ readCustomCards: jest.fn(async () => []) }));
jest.mock('../app/foreground_usage_ms', () => ({ getForegroundDailyMsMap: jest.fn(async () => ({})) }));
jest.mock('../app/cloud_sync', () => ({ syncToCloud: jest.fn(async () => undefined) }));

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

beforeEach(() => {
  storage.__reset?.();
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
});

test('token-bound lifetime shard increment cannot commit after account switch', async () => {
  beginAccountGeneration('account-a');
  const token = captureAccountGeneration();
  const readA = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(readA.promise);
  const { bumpLifetimeShardsSpent } = await import('../app/lifetime_profile_stats');

  const bump = (bumpLifetimeShardsSpent as unknown as (
    amount: number,
    accountToken: ReturnType<typeof captureAccountGeneration>,
  ) => Promise<void>)(5, token);
  beginAccountGeneration('account-b');
  readA.resolve('10');

  await bump;
  expect(storage.setItem).not.toHaveBeenCalledWith('shards_lifetime_spent_v1', '15');
});

test('token-bound lifetime shard increment cannot write its real daily breakdown after account switch', async () => {
  beginAccountGeneration('account-a');
  const token = captureAccountGeneration();
  const dailyRead = deferred<string | null>();
  storage.getItem.mockImplementation((key) => (
    key === 'stats_daily_breakdown_v1' ? dailyRead.promise : Promise.resolve('0')
  ));
  const { bumpLifetimeShardsSpent } = await import('../app/lifetime_profile_stats');

  const bump = bumpLifetimeShardsSpent(5, token);
  for (let i = 0; i < 12 && !storage.getItem.mock.calls.some(([key]) => key === 'stats_daily_breakdown_v1'); i += 1) {
    await Promise.resolve();
  }
  expect(storage.getItem).toHaveBeenCalledWith('stats_daily_breakdown_v1');
  beginAccountGeneration('account-b');
  dailyRead.resolve(null);

  await bump;
  expect(storage.setItem).not.toHaveBeenCalledWith('stats_daily_breakdown_v1', expect.any(String));
});

test('omitted-token lifetime shard increment captures account A and cannot commit under B', async () => {
  beginAccountGeneration('account-a');
  const readA = deferred<string | null>();
  storage.getItem.mockReturnValueOnce(readA.promise);
  const { bumpLifetimeShardsEarned } = await import('../app/lifetime_profile_stats');

  const bump = bumpLifetimeShardsEarned(7);
  for (let i = 0; i < 12 && storage.getItem.mock.calls.length === 0; i += 1) await Promise.resolve();
  beginAccountGeneration('account-b');
  readA.resolve('3');

  await bump;
  expect(storage.setItem).not.toHaveBeenCalledWith('shards_lifetime_earned_v1', '10');
});

test('uninitialized identity cannot enter lifetime or daily-stat mutation boundaries', async () => {
  const {
    bumpLifetimeShardsEarned,
    bumpLifetimeShardsSpent,
  } = await import('../app/lifetime_profile_stats');
  const { bumpStatsDaily } = await import('../app/stats_daily_breakdown');

  await bumpLifetimeShardsEarned(3);
  await bumpLifetimeShardsSpent(2);
  await bumpStatsDaily('shards_earned', 3);

  expect(storage.getItem).not.toHaveBeenCalled();
  expect(storage.setItem).not.toHaveBeenCalled();
});
