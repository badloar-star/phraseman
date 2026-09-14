import { createArenaHomeRead, preloadArenaHome } from '../modules/arena/home_preload';
import { arenaLoadHomeWarm, arenaPeekHomeWarm, arenaRememberHomeWarm, arenaResetHomeWarm } from '../modules/arena/home_cache';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

it('starts every resource before navigation and publishes home while disk and expansion are pending', async () => {
  const disk = deferred<unknown>();
  const expansion = deferred<unknown>();
  const remember = jest.fn();
  const fetchExpansion = jest.fn(() => expansion.promise);
  const done = preloadArenaHome({
    loadDisk: () => disk.promise, fetchHome: async () => ({ rank: 2 }), fetchExpansion,
    isCurrent: () => true, remember,
  });
  await Promise.resolve();
  expect(fetchExpansion).toHaveBeenCalledTimes(1);
  expect(remember).toHaveBeenCalledWith({ home: { rank: 2 } });
  disk.resolve(null);
  expansion.reject(new Error('offline'));
  await expect(done).resolves.toBeUndefined();
});

it('shares a pending startup read with the screen, but refreshes after completion', async () => {
  const shared = createArenaHomeRead<number>();
  const result = deferred<number>();
  const fetch = jest.fn(() => result.promise);
  const boot = shared('account1', fetch);
  expect(shared('account1', fetch)).toBe(boot);
  expect(fetch).toHaveBeenCalledTimes(1);
  result.resolve(2);
  await boot;
  await shared('account1', fetch);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('does not share another account read or evict its pending read on old completion', async () => {
  const shared = createArenaHomeRead<number>();
  const old = deferred<number>();
  const next = deferred<number>();
  const oldRead = shared('old', () => old.promise);
  const nextRead = shared('new', () => next.promise);
  old.resolve(1);
  await oldRead;
  expect(shared('new', () => Promise.resolve(3))).toBe(nextRead);
  next.resolve(2);
  await nextRead;
});

it('retries a rejected read', async () => {
  const shared = createArenaHomeRead<number>();
  await expect(shared('a', async () => { throw new Error('offline'); })).rejects.toThrow('offline');
  await expect(shared('a', async () => 2)).resolves.toBe(2);
});

it('discards network results when the launching account is no longer current', async () => {
  let current = true;
  const response = deferred<unknown>();
  const remember = jest.fn();
  const done = preloadArenaHome({ loadDisk: async () => null, fetchHome: () => response.promise,
    fetchExpansion: () => response.promise, isCurrent: () => current, remember });
  current = false;
  response.resolve({ stars: 100 });
  await done;
  expect(remember).not.toHaveBeenCalled();
});

it('does not let slow disk hydration overwrite fresh network data', async () => {
  arenaResetHomeWarm();
  const disk = deferred<string | null>();
  const store = { getItem: () => disk.promise, setItem: async () => {}, removeItem: async () => {} };
  const loading = arenaLoadHomeWarm(store, 1_000);
  const fresh = arenaRememberHomeWarm({ home: { stars: 10 }, wallNowMs: 1_000 });
  disk.resolve(JSON.stringify({ ...fresh, home: { stars: 1 } }));
  expect((await loading)?.home).toEqual({ stars: 10 });
  expect(arenaPeekHomeWarm(1_000)?.home).toEqual({ stars: 10 });
});

it('discards disk hydration after account transition', async () => {
  arenaResetHomeWarm();
  const raw = JSON.stringify(arenaRememberHomeWarm({ home: { stars: 10 }, wallNowMs: 1_000 }));
  arenaResetHomeWarm();
  const disk = deferred<string | null>();
  let current = true;
  const loading = arenaLoadHomeWarm({ getItem: () => disk.promise, setItem: async () => {}, removeItem: async () => {} }, 1_000, () => current);
  current = false;
  disk.resolve(raw);
  expect(await loading).toBeNull();
  expect(arenaPeekHomeWarm(1_000)).toBeNull();
});
