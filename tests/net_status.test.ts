import { createNetStatusCoordinator, OFFLINE_BACKOFF_MS, ONLINE_SAFETY_MS, PROBE_URLS } from '../app/net_status';
import {
  __resetInteractiveNetworkQuietForTests,
  beginInteractiveNetworkQuiet,
  releaseInteractiveNetworkQuiet,
  waitForInteractiveNetworkQuiet,
  withBackgroundNetworkLease,
} from '../app/interactive_network_quiet';

function harness() {
  let now = 0;
  let active = true;
  let nextTimerId = 1;
  const timers = new Map<number, { listener: () => void; at: number }>();
  const activeListeners = new Set<(active: boolean) => void>();
  const fetches: { resolve: () => void; reject: () => void; signal?: AbortSignal }[] = [];
  let settledCount = 0;
  const deps = {
    fetch: jest.fn((_input: string, init: RequestInit) => new Promise<void>((resolve, reject) => {
      fetches.push({ resolve, reject: () => reject(new Error('offline')), signal: init.signal ?? undefined });
    })),
    now: () => now,
    setTimeout: (listener: () => void, delay: number) => {
      const id = nextTimerId++;
      timers.set(id, { listener, at: now + delay });
      return id;
    },
    clearTimeout: (id: unknown) => { timers.delete(id as number); },
    isAppActive: () => active,
    subscribeAppActive: (listener: (next: boolean) => void) => {
      activeListeners.add(listener);
      return () => activeListeners.delete(listener);
    },
  };
  const net = createNetStatusCoordinator(deps);
  const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
  return {
    net,
    deps,
    fetches,
    timers,
    setActive(next: boolean) { active = next; activeListeners.forEach((listener) => listener(next)); },
    async finishFetch(online: boolean) {
      const request = fetches.at(-1)!;
      if (online) request.resolve();
      else request.reject();
      await settle();
    },
    // Multi-host probe: «offline» наступает только когда упали ВСЕ хосты,
    // поэтому тест должен осадить каждый всплывающий fetch, пока они появляются.
    async finishAllFetches(online: boolean) {
      for (;;) {
        if (fetches.length === settledCount) break;
        const request = fetches[settledCount++];
        if (online) request.resolve();
        else request.reject();
        await settle();
      }
    },
    async fireProbeTimer() {
      const scheduled = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)
        .find(([, timer]) => timer.at - now > 5_000);
      if (!scheduled) throw new Error('no probe timer');
      timers.delete(scheduled[0]);
      now = scheduled[1].at;
      scheduled[1].listener();
      await settle();
    },
  };
}

describe('net status coordinator', () => {
  it('shares one in-flight manual probe and notifies transitions', async () => {
    const h = harness();
    const events: boolean[] = [];
    const off = h.net.subscribe((online) => events.push(online));
    const first = h.net.checkOnlineNow();
    const second = h.net.checkOnlineNow();
    expect(h.deps.fetch).toHaveBeenCalledTimes(1);
    await h.finishFetch(true);
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(h.net.getStatus()).toBe('online');
    expect(events).toEqual([true]);
    off();
  });

  it('uses capped offline backoff and resets to online safety polling', async () => {
    const h = harness();
    h.net.subscribe(() => {});
    await h.finishAllFetches(false);
    expect(h.net.debug().nextDelayMs).toBe(OFFLINE_BACKOFF_MS[0]);
    for (let index = 1; index < OFFLINE_BACKOFF_MS.length; index += 1) {
      await h.fireProbeTimer();
      await h.finishAllFetches(false);
      expect(h.net.debug().nextDelayMs).toBe(OFFLINE_BACKOFF_MS[index]);
    }
    await h.fireProbeTimer();
    await h.finishAllFetches(true);
    expect(h.net.debug().nextDelayMs).toBe(ONLINE_SAFETY_MS);
    expect(h.net.debug().offlineAttempt).toBe(0);
  });

  it('coalesces passive failures and keeps cooldown over unsubscribe/resubscribe', async () => {
    const h = harness();
    const off = h.net.subscribe(() => {});
    await h.finishAllFetches(false);
    h.net.reportFailure();
    h.net.reportFailure();
    expect(h.net.debug().hasProbeTimer).toBe(true);
    expect(h.deps.fetch).toHaveBeenCalledTimes(PROBE_URLS.length);
    const nextProbeAt = h.net.debug().nextProbeAt;
    off();
    expect(h.net.debug().hasProbeTimer).toBe(false);
    h.net.subscribe(() => {});
    expect(h.net.debug().nextProbeAt).toBe(nextProbeAt);
    expect(h.deps.fetch).toHaveBeenCalledTimes(PROBE_URLS.length);
  });

  it('keeps duplicate callback subscriptions independently removable', async () => {
    const h = harness();
    const listener = jest.fn();
    const first = h.net.subscribe(listener);
    const second = h.net.subscribe(listener);
    await h.finishFetch(true);
    expect(listener).toHaveBeenCalledTimes(2);

    first();
    h.net.reportFailure();
    expect(listener).toHaveBeenCalledTimes(3);
    second();
    expect(h.net.debug().subscriberCount).toBe(0);
  });

  it('stops timers and aborts fetches in background; zero subscribers stay idle', async () => {
    const h = harness();
    const off = h.net.subscribe(() => {});
    expect(h.net.debug().hasInFlightProbe).toBe(true);
    h.setActive(false);
    expect(h.fetches[0]?.signal?.aborted).toBe(true);
    expect(h.net.debug().hasProbeTimer).toBe(false);
    expect(h.net.debug().hasTimeoutTimer).toBe(false);
    off();
    h.setActive(true);
    expect(h.deps.fetch).toHaveBeenCalledTimes(1);
    await h.finishFetch(false);
    expect(h.deps.fetch).toHaveBeenCalledTimes(1);
    expect(h.net.debug().hasAbortController).toBe(false);
  });

  it('runs one fresh authoritative probe after foregrounding during an abort', async () => {
    const h = harness();
    h.net.subscribe(() => {});
    h.setActive(false);
    h.setActive(true);
    expect(h.net.debug().foregroundProbePending).toBe(true);
    await h.finishFetch(false);
    expect(h.deps.fetch).toHaveBeenCalledTimes(2);
    await h.finishFetch(true);
    expect(h.net.getStatus()).toBe('online');
    expect(h.net.debug().foregroundProbePending).toBe(false);
  });

  it('runs one fresh probe after last-unsubscribe abort and immediate resubscribe', async () => {
    const h = harness();
    const first = h.net.subscribe(() => {});
    expect(h.deps.fetch).toHaveBeenCalledTimes(1);
    first();
    expect(h.fetches[0]?.signal?.aborted).toBe(true);

    h.net.subscribe(() => {});
    expect(h.net.debug().foregroundProbePending).toBe(true);
    await h.finishFetch(false);
    expect(h.deps.fetch).toHaveBeenCalledTimes(2);
    await h.finishFetch(true);
    expect(h.net.getStatus()).toBe('online');
  });

  it('manual retry does not fetch while backgrounded', async () => {
    const h = harness();
    h.setActive(false);
    await expect(h.net.checkOnlineNow()).resolves.toBe(false);
    expect(h.deps.fetch).not.toHaveBeenCalled();
  });

  it('does not count an interactive-session abort as another offline failure', async () => {
    const h = harness();
    h.net.subscribe(() => undefined);
    await h.finishAllFetches(false);
    expect(h.net.getStatus()).toBe('offline');
    expect(h.net.debug().offlineAttempt).toBe(0);
    expect(h.net.debug().nextDelayMs).toBe(OFFLINE_BACKOFF_MS[0]);

    await h.fireProbeTimer();
    expect(h.deps.fetch).toHaveBeenCalledTimes(PROBE_URLS.length + 1);
    h.net.pauseForInteractiveQuiet();
    await h.finishFetch(false);

    expect(h.net.getStatus()).toBe('offline');
    expect(h.net.debug().offlineAttempt).toBe(0);
    expect(h.net.debug().nextDelayMs).toBe(OFFLINE_BACKOFF_MS[0]);
    expect(h.net.debug().hasProbeTimer).toBe(false);

    h.net.resumeAfterInteractiveQuiet();
    await Promise.resolve();
    expect(h.deps.fetch).toHaveBeenCalledTimes(PROBE_URLS.length + 2);
  });

  it('does not start a connectivity probe while an interactive session is quiet', async () => {
    __resetInteractiveNetworkQuietForTests();
    const quiet = beginInteractiveNetworkQuiet();
    await waitForInteractiveNetworkQuiet(quiet);
    const fetchProbe = jest.fn(async () => undefined);
    const net = createNetStatusCoordinator({
      fetch: fetchProbe,
      withNetworkLease: (work) => withBackgroundNetworkLease(
        'net_status.test_probe',
        (lease) => work(lease.signal),
      ),
      now: () => 0,
      setTimeout: () => 1,
      clearTimeout: () => undefined,
      isAppActive: () => true,
      subscribeAppActive: () => () => undefined,
    });

    net.subscribe(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchProbe).not.toHaveBeenCalled();

    releaseInteractiveNetworkQuiet(quiet);
    await Promise.resolve();
    net.resumeAfterInteractiveQuiet();
    await Promise.resolve();
    expect(fetchProbe).toHaveBeenCalledTimes(1);
    net.dispose();
  });

  it('aborts and settles an active connectivity probe before quiet becomes ready', async () => {
    __resetInteractiveNetworkQuietForTests();
    const observed: { signal?: AbortSignal } = {};
    const fetchProbe = jest.fn((_input: string, init: RequestInit) =>
      new Promise<void>((_resolve, reject) => {
        if (init.signal) observed.signal = init.signal;
        init.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      }));
    const net = createNetStatusCoordinator({
      fetch: fetchProbe,
      withNetworkLease: (work) => withBackgroundNetworkLease(
        'net_status.test_probe',
        (lease) => work(lease.signal),
      ),
      now: () => 0,
      setTimeout: () => 1,
      clearTimeout: () => undefined,
      isAppActive: () => true,
      subscribeAppActive: () => () => undefined,
    });
    net.subscribe(() => undefined);
    await Promise.resolve();
    expect(fetchProbe).toHaveBeenCalledTimes(1);

    const quiet = beginInteractiveNetworkQuiet();
    expect(observed.signal?.aborted).toBe(true);
    await waitForInteractiveNetworkQuiet(quiet);
    expect(fetchProbe).toHaveBeenCalledTimes(1);
    net.dispose();
    releaseInteractiveNetworkQuiet(quiet);
    await Promise.resolve();
  });
});
