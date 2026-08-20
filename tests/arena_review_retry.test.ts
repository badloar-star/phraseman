import { arenaReadReviewWithRetry } from '../modules/arena/review_retry';
import * as reviewRuntime from '../modules/arena/review_retry';

describe('разбор матча доступен сразу после результата', () => {
  it('один раз перечитывает документ, если транзакция расчёта ещё не успела его создать', async () => {
    const tasks = [{ taskId: 'task-1' }];
    let readCount = 0;
    const read = async (): Promise<readonly unknown[] | null> => {
      readCount += 1;
      return readCount === 1 ? null : tasks;
    };
    let waitCount = 0;
    const wait = async (): Promise<void> => {
      waitCount += 1;
    };

    expect(await arenaReadReviewWithRetry(read, wait)).toBe(tasks);
    expect(readCount).toBe(2);
    expect(waitCount).toBe(1);
  });

  it('изолирует один и тот же matchId по stable account в памяти и на диске', async () => {
    const cache = reviewRuntime as unknown as {
      arenaRememberScopedReview(input: {
        stableUid: string; matchId: string; rows: readonly unknown[]; wallNowMs: number; store?: {
          getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>;
          removeItem(key: string): Promise<void>;
        };
      }): void;
      arenaPeekScopedReview(stableUid: string, matchId: string, wallNowMs: number): readonly unknown[] | null;
      arenaLoadScopedReview(store: unknown, stableUid: string, matchId: string, wallNowMs: number): Promise<readonly unknown[] | null>;
      arenaResetScopedReviews(): void;
    };
    expect(typeof cache.arenaRememberScopedReview).toBe('function');
    expect(typeof cache.arenaPeekScopedReview).toBe('function');

    const data = new Map<string, string>();
    const store = {
      getItem: async (key: string) => data.get(key) ?? null,
      setItem: async (key: string, value: string) => { data.set(key, value); },
      removeItem: async (key: string) => { data.delete(key); },
    };
    cache.arenaResetScopedReviews();
    cache.arenaRememberScopedReview({
      stableUid: 'stable-a', matchId: 'same-match', rows: [{ taskId: 'private-a' }], wallNowMs: 1_000, store,
    });
    expect(cache.arenaPeekScopedReview('stable-a', 'same-match', 1_001)).toEqual([{ taskId: 'private-a' }]);
    expect(cache.arenaPeekScopedReview('stable-b', 'same-match', 1_001)).toBeNull();
    cache.arenaResetScopedReviews();
    await expect(cache.arenaLoadScopedReview(store, 'stable-a', 'same-match', 1_002))
      .resolves.toEqual([{ taskId: 'private-a' }]);
    await expect(cache.arenaLoadScopedReview(store, 'stable-b', 'same-match', 1_002)).resolves.toBeNull();
  });
});
