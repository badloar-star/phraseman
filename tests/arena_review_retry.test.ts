import { arenaReadReviewWithRetry } from '../modules/arena/review_retry';
import * as reviewRuntime from '../modules/arena/review_retry';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

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
        scope: { stableUid: string; accountGeneration: number };
        matchId: string; rows: readonly unknown[]; wallNowMs: number; store?: {
          getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>;
          removeItem(key: string): Promise<void>;
        };
      }): void;
      arenaPeekScopedReview(scope: { stableUid: string; accountGeneration: number }, matchId: string, wallNowMs: number): readonly unknown[] | null;
      arenaLoadScopedReview(store: unknown, scope: { stableUid: string; accountGeneration: number }, matchId: string, wallNowMs: number): Promise<readonly unknown[] | null>;
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
    const scopeA = { stableUid: 'stable-a', accountGeneration: 1 };
    const scopeB = { stableUid: 'stable-b', accountGeneration: 2 };
    cache.arenaResetScopedReviews();
    cache.arenaRememberScopedReview({
      scope: scopeA, matchId: 'same-match', rows: [{ taskId: 'private-a' }], wallNowMs: 1_000, store,
    });
    expect(cache.arenaPeekScopedReview(scopeA, 'same-match', 1_001)).toEqual([{ taskId: 'private-a' }]);
    expect(cache.arenaPeekScopedReview(scopeB, 'same-match', 1_001)).toBeNull();
    cache.arenaResetScopedReviews();
    await expect(cache.arenaLoadScopedReview(store, scopeA, 'same-match', 1_002))
      .resolves.toEqual([{ taskId: 'private-a' }]);
    await expect(cache.arenaLoadScopedReview(store, scopeB, 'same-match', 1_002)).resolves.toBeNull();
  });

  it('discards a deferred account A response after switching to B and never caches it under B', async () => {
    const runtime = reviewRuntime as unknown as {
      arenaAwaitScopedReview(input: {
        scope: { stableUid: string; accountGeneration: number };
        request: () => Promise<readonly unknown[] | null>;
        isCurrent: (scope: { stableUid: string; accountGeneration: number }) => boolean;
        isAlive: () => boolean;
        accept: (rows: readonly unknown[]) => void;
      }): Promise<'accepted' | 'empty' | 'stale'>;
      arenaPeekScopedReview(scope: { stableUid: string; accountGeneration: number }, matchId: string, wallNowMs: number): readonly unknown[] | null;
      arenaRememberScopedReview(input: {
        scope: { stableUid: string; accountGeneration: number };
        matchId: string; rows: readonly unknown[]; wallNowMs: number;
      }): void;
      arenaResetScopedReviews(): void;
    };
    const scopeA = { stableUid: 'stable-a', accountGeneration: 7 };
    const scopeB = { stableUid: 'stable-b', accountGeneration: 8 };
    let current = scopeA;
    const pending = deferred<readonly unknown[] | null>();
    const accepted: (readonly unknown[])[] = [];
    runtime.arenaResetScopedReviews();

    const completion = runtime.arenaAwaitScopedReview({
      scope: scopeA,
      request: () => pending.promise,
      isCurrent: (scope) => scope === current,
      isAlive: () => true,
      accept: (rows) => {
        accepted.push(rows);
        runtime.arenaRememberScopedReview({ scope: scopeA, matchId: 'match-1', rows, wallNowMs: 1_000 });
      },
    });
    current = scopeB;
    pending.resolve([{ taskId: 'private-a' }]);

    await expect(completion).resolves.toBe('stale');
    expect(accepted).toEqual([]);
    expect(runtime.arenaPeekScopedReview(scopeA, 'match-1', 1_001)).toBeNull();
    expect(runtime.arenaPeekScopedReview(scopeB, 'match-1', 1_001)).toBeNull();
  });

  it('drops an unmounted completion but commits a current B completion only to B scope', async () => {
    const runtime = reviewRuntime as unknown as {
      arenaAwaitScopedReview(input: {
        scope: { stableUid: string; accountGeneration: number };
        request: () => Promise<readonly unknown[] | null>;
        isCurrent: (scope: { stableUid: string; accountGeneration: number }) => boolean;
        isAlive: () => boolean;
        accept: (rows: readonly unknown[]) => void;
      }): Promise<'accepted' | 'empty' | 'stale'>;
      arenaPeekScopedReview(scope: { stableUid: string; accountGeneration: number }, matchId: string, wallNowMs: number): readonly unknown[] | null;
      arenaRememberScopedReview(input: {
        scope: { stableUid: string; accountGeneration: number };
        matchId: string; rows: readonly unknown[]; wallNowMs: number;
      }): void;
      arenaResetScopedReviews(): void;
    };
    const scopeA = { stableUid: 'stable-a', accountGeneration: 1 };
    const scopeB = { stableUid: 'stable-b', accountGeneration: 2 };
    runtime.arenaResetScopedReviews();
    let alive = true;
    const stale = deferred<readonly unknown[] | null>();
    const staleCompletion = runtime.arenaAwaitScopedReview({
      scope: scopeA,
      request: () => stale.promise,
      isCurrent: (scope) => scope === scopeA,
      isAlive: () => alive,
      accept: () => { throw new Error('unmounted completion must not commit'); },
    });
    alive = false;
    stale.resolve([{ taskId: 'late-a' }]);
    await expect(staleCompletion).resolves.toBe('stale');

    const rowsB = [{ taskId: 'private-b' }];
    await expect(runtime.arenaAwaitScopedReview({
      scope: scopeB,
      request: async () => rowsB,
      isCurrent: (scope) => scope === scopeB,
      isAlive: () => true,
      accept: (rows) => runtime.arenaRememberScopedReview({
        scope: scopeB, matchId: 'match-1', rows, wallNowMs: 2_000,
      }),
    })).resolves.toBe('accepted');
    expect(runtime.arenaPeekScopedReview(scopeA, 'match-1', 2_001)).toBeNull();
    expect(runtime.arenaPeekScopedReview(scopeB, 'match-1', 2_001)).toEqual(rowsB);
  });
});
