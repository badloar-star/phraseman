import {
  createArenaMatchmakingControlClock,
  type AuthoritativeSearchState,
} from '../app/arena_matchmaking_control_clock';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function createHarness(initialNow = 1_000) {
  let now = initialNow;
  let nextTimerId = 0;
  const timers = new Map<number, { listener: () => void; delayMs: number }>();
  const reads: Array<Promise<AuthoritativeSearchState> | AuthoritativeSearchState> = [];
  const onMatch = jest.fn(async (_sessionId: string) => {});
  const onExpand = jest.fn(async () => {});
  const onBotFallback = jest.fn(async (): Promise<number | null> => null);
  const onTimeout = jest.fn(async () => {});
  const onStop = jest.fn(async () => {});

  const clock = createArenaMatchmakingControlClock({
    now: () => now,
    setTimeout: (listener, delayMs) => {
      nextTimerId += 1;
      timers.set(nextTimerId, { listener, delayMs });
      return nextTimerId;
    },
    clearTimeout: (id) => { timers.delete(id as number); },
    readAuthoritativeState: async () => {
      const next = reads.shift();
      if (!next) return { kind: 'queued', queueId: 'queue-1' };
      return await next;
    },
    onMatch,
    onExpand,
    onBotFallback,
    onTimeout,
    onStop,
  });

  return {
    clock,
    reads,
    onMatch,
    onExpand,
    onBotFallback,
    onTimeout,
    onStop,
    setNow(value: number) { now = value; },
    timers,
  };
}

const search = (generation = 1) => ({
  generation,
  userId: `user-${generation}`,
  originalStartedAt: 1_000,
  rangeDeadlineAt: 31_000,
  botFallbackDeadlineAt: 46_000,
  timeoutDeadlineAt: 76_000,
  rangeExpanded: false,
});

describe('Arena matchmaking control clock', () => {
  it('does not schedule control timers in background and reconciles before resuming', async () => {
    const h = createHarness();
    h.clock.setAppActive(false);
    await h.clock.start(search());
    expect(h.timers.size).toBe(0);

    h.reads.push({ kind: 'matched', sessionId: 'real-match' });
    await h.clock.setAppActive(true);
    expect(h.onMatch).toHaveBeenCalledWith('real-match', 1);
    expect(h.timers.size).toBe(0);
  });

  it('reruns reconciliation when another trigger arrives during an in-flight read', async () => {
    const h = createHarness();
    h.clock.setAppActive(false);
    await h.clock.start(search());
    const firstRead = deferred<AuthoritativeSearchState>();
    h.reads.push(firstRead.promise, { kind: 'queued', queueId: 'queue-1' });

    const foreground = h.clock.setAppActive(true);
    const listener = h.clock.requestReconcile('listener');
    firstRead.resolve({ kind: 'queued', queueId: 'queue-1' });
    await Promise.all([foreground, listener]);

    expect(h.clock.debug().authoritativeReads).toBe(2);
  });

  it('defers an in-flight authoritative result when the app backgrounds', async () => {
    const h = createHarness();
    h.clock.setAppActive(false);
    await h.clock.start(search());
    const read = deferred<AuthoritativeSearchState>();
    h.reads.push(read.promise);

    const foregroundRead = h.clock.setAppActive(true);
    await h.clock.setAppActive(false);
    read.resolve({ kind: 'matched', sessionId: 'background-match' });
    await foregroundRead;

    expect(h.onMatch).not.toHaveBeenCalled();
    expect(h.onStop).not.toHaveBeenCalled();
    expect(h.onExpand).not.toHaveBeenCalled();
    expect(h.onBotFallback).not.toHaveBeenCalled();
    expect(h.onTimeout).not.toHaveBeenCalled();
    expect(h.timers.size).toBe(0);

    await h.clock.setAppActive(true);
    expect(h.onMatch).toHaveBeenCalledWith('background-match', 1);
  });

  it('lets an explicit match event override an in-flight queued read', async () => {
    const h = createHarness();
    h.clock.setAppActive(false);
    await h.clock.start(search());
    const firstRead = deferred<AuthoritativeSearchState>();
    h.reads.push(firstRead.promise);

    const foreground = h.clock.setAppActive(true);
    const listener = h.clock.notifyMatch('listener-match');
    firstRead.resolve({ kind: 'queued', queueId: 'queue-1' });
    await Promise.all([foreground, listener]);

    expect(h.onMatch).toHaveBeenCalledWith('listener-match', 1);
    expect(h.onTimeout).not.toHaveBeenCalled();
  });

  it('discards a stale async result from the previous search generation', async () => {
    const h = createHarness();
    h.clock.setAppActive(false);
    await h.clock.start(search(1));
    const oldRead = deferred<AuthoritativeSearchState>();
    h.reads.push(oldRead.promise, { kind: 'matched', sessionId: 'new-match' });
    const first = h.clock.setAppActive(true);
    await h.clock.start(search(2));
    oldRead.resolve({ kind: 'matched', sessionId: 'old-match' });
    await first;

    expect(h.onMatch).toHaveBeenCalledTimes(1);
    expect(h.onMatch).toHaveBeenCalledWith('new-match', 2);
  });

  it('stops locally when the authoritative queue is absent', async () => {
    const h = createHarness();
    h.clock.setAppActive(false);
    await h.clock.start(search());
    h.reads.push({ kind: 'absent' });
    await h.clock.setAppActive(true);
    expect(h.onStop).toHaveBeenCalledWith(1);
    expect(h.onBotFallback).not.toHaveBeenCalled();
  });

  it('revalidates immediately before an overdue terminal transition', async () => {
    const h = createHarness(80_000);
    h.clock.setAppActive(false);
    await h.clock.start(search());
    h.reads.push(
      { kind: 'queued', queueId: 'queue-1' },
      { kind: 'matched', sessionId: 'last-moment-match' },
    );
    await h.clock.setAppActive(true);

    expect(h.onMatch).toHaveBeenCalledWith('last-moment-match', 1);
    expect(h.onBotFallback).not.toHaveBeenCalled();
    expect(h.onTimeout).not.toHaveBeenCalled();
  });

  it('keeps absolute deadlines independent from mutable queue joinedAt', async () => {
    const h = createHarness(32_000);
    h.clock.setAppActive(false);
    await h.clock.start(search());
    h.reads.push(
      { kind: 'queued', queueId: 'queue-1' },
      { kind: 'queued', queueId: 'queue-1' },
    );
    await h.clock.setAppActive(true);

    expect(h.onExpand).toHaveBeenCalledWith(1);
    expect(h.clock.debug().originalStartedAt).toBe(1_000);
    expect(h.clock.debug().timeoutDeadlineAt).toBe(76_000);
  });

  it('retries a rejected range transition without losing the search', async () => {
    const h = createHarness(32_000);
    h.clock.setAppActive(false);
    h.onExpand.mockRejectedValueOnce(new Error('temporary write failure'));
    await h.clock.start(search());
    h.reads.push(
      { kind: 'queued', queueId: 'queue-1' },
      { kind: 'queued', queueId: 'queue-1' },
    );

    await expect(h.clock.setAppActive(true)).resolves.toBeUndefined();
    expect(h.clock.debug().generation).toBe(1);
    expect(h.onExpand).toHaveBeenCalledTimes(1);
    const retry = [...h.timers.values()].find((timer) => timer.delayMs === 1_000);
    expect(retry).toBeDefined();

    h.reads.push(
      { kind: 'queued', queueId: 'queue-1' },
      { kind: 'queued', queueId: 'queue-1' },
    );
    retry!.listener();
    await h.clock.requestReconcile('test_flush');
    expect(h.onExpand).toHaveBeenCalledTimes(2);
  });

  it('can defer bot fallback for a live-player recheck without losing the search', async () => {
    const h = createHarness(50_000);
    h.clock.setAppActive(false);
    h.onBotFallback.mockResolvedValueOnce(55_000);
    await h.clock.start({ ...search(), rangeExpanded: true });
    h.reads.push(
      { kind: 'queued', queueId: 'queue-1' },
      { kind: 'queued', queueId: 'queue-1' },
    );
    await h.clock.setAppActive(true);

    expect(h.clock.debug().generation).toBe(1);
    expect(h.clock.debug().botFallbackDeadlineAt).toBe(55_000);
    expect([...h.timers.values()].some((timer) => timer.delayMs === 5_000)).toBe(true);
  });
});
