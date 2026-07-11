import { runtimeAppStateStore } from './runtime_app_state_store';

const PROBE_URL = 'https://clients3.google.com/generate_204';
const PROBE_TIMEOUT_MS = 5_000;
export const OFFLINE_BACKOFF_MS = [10_000, 30_000, 60_000, 120_000, 300_000] as const;
export const ONLINE_SAFETY_MS = 300_000;

export type NetStatus = 'online' | 'offline' | 'unknown';

type TimerId = unknown;
export type NetStatusCoordinatorDeps = {
  fetch(input: string, init: RequestInit): Promise<unknown>;
  now(): number;
  setTimeout(listener: () => void, delayMs: number): TimerId;
  clearTimeout(id: TimerId): void;
  isAppActive(): boolean;
  subscribeAppActive(listener: (active: boolean) => void): () => void;
};

export function createNetStatusCoordinator(deps: NetStatusCoordinatorDeps) {
  let status: NetStatus = 'unknown';
  const listeners = new Set<(online: boolean) => void>();
  let probeTimer: TimerId | null = null;
  let timeoutTimer: TimerId | null = null;
  let abortController: AbortController | null = null;
  let probePromise: Promise<boolean> | null = null;
  let offlineAttempt = 0;
  let nextProbeAt = 0;
  let foregroundProbePending = false;
  let disposed = false;

  const clearProbeTimer = () => {
    if (probeTimer !== null) deps.clearTimeout(probeTimer);
    probeTimer = null;
  };
  const clearTimeoutTimer = () => {
    if (timeoutTimer !== null) deps.clearTimeout(timeoutTimer);
    timeoutTimer = null;
  };
  const setStatus = (next: Exclude<NetStatus, 'unknown'>) => {
    if (status === next) return;
    status = next;
    const online = next === 'online';
    listeners.forEach((listener) => {
      try { listener(online); } catch { /* listeners cannot break delivery */ }
    });
  };
  const delayForNextProbe = () => status === 'offline'
    ? OFFLINE_BACKOFF_MS[Math.min(offlineAttempt, OFFLINE_BACKOFF_MS.length - 1)]!
    : ONLINE_SAFETY_MS;

  const scheduleAt = (at: number) => {
    clearProbeTimer();
    nextProbeAt = at;
    if (disposed || listeners.size === 0 || !deps.isAppActive()) return;
    const delay = Math.max(0, at - deps.now());
    probeTimer = deps.setTimeout(() => {
      probeTimer = null;
      void runProbe('scheduled');
    }, delay);
  };
  const scheduleNext = () => scheduleAt(deps.now() + delayForNextProbe());

  const probeOnce = async (): Promise<boolean> => {
    const controller = new AbortController();
    abortController = controller;
    timeoutTimer = deps.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
      await deps.fetch(PROBE_URL, { method: 'GET', cache: 'no-store', signal: controller.signal });
      if (disposed || !deps.isAppActive()) return status === 'online';
      offlineAttempt = 0;
      setStatus('online');
      return true;
    } catch {
      if (disposed || !deps.isAppActive()) return status === 'online';
      setStatus('offline');
      return false;
    } finally {
      clearTimeoutTimer();
      if (abortController === controller) abortController = null;
    }
  };

  const runProbe = (origin: 'manual' | 'scheduled' | 'foreground' | 'subscriber'): Promise<boolean> => {
    if (probePromise) return probePromise;
    if (disposed || !deps.isAppActive()) return Promise.resolve(status === 'online');
    clearProbeTimer();
    probePromise = probeOnce().then((online) => {
      if (origin === 'scheduled' && !online) {
        offlineAttempt = Math.min(offlineAttempt + 1, OFFLINE_BACKOFF_MS.length - 1);
      }
      return online;
    }).finally(() => {
      probePromise = null;
      if (foregroundProbePending && !disposed && deps.isAppActive() && listeners.size > 0) {
        foregroundProbePending = false;
        void runProbe('foreground');
      } else if (!disposed && deps.isAppActive() && listeners.size > 0) {
        scheduleNext();
      }
    });
    return probePromise;
  };

  const appStateOff = deps.subscribeAppActive((active) => {
    if (!active) {
      clearProbeTimer();
      clearTimeoutTimer();
      abortController?.abort();
      abortController = null;
      return;
    }
    if (listeners.size > 0) {
      if (probePromise) foregroundProbePending = true;
      else void runProbe('foreground');
    }
  });

  return {
    getStatus: () => status,
    subscribe(listener: (online: boolean) => void) {
      if (disposed) return () => {};
      const wasEmpty = listeners.size === 0;
      listeners.add(listener);
      if (wasEmpty && deps.isAppActive()) {
        if (nextProbeAt > deps.now()) scheduleAt(nextProbeAt);
        else void runProbe('subscriber');
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) clearProbeTimer();
      };
    },
    checkOnlineNow: () => runProbe('manual'),
    reportSuccess() {
      offlineAttempt = 0;
      setStatus('online');
      if (listeners.size > 0 && deps.isAppActive()) scheduleNext();
      else clearProbeTimer();
    },
    reportFailure() {
      setStatus('offline');
      if (listeners.size > 0 && deps.isAppActive() && !probePromise && probeTimer === null) scheduleNext();
    },
    reset() {
      clearProbeTimer();
      clearTimeoutTimer();
      abortController?.abort();
      abortController = null;
      status = 'unknown';
      offlineAttempt = 0;
      nextProbeAt = 0;
      foregroundProbePending = false;
    },
    dispose() {
      disposed = true;
      clearProbeTimer();
      clearTimeoutTimer();
      abortController?.abort();
      abortController = null;
      listeners.clear();
      appStateOff();
    },
    debug: () => ({
      status,
      subscriberCount: listeners.size,
      offlineAttempt,
      nextDelayMs: delayForNextProbe(),
      nextProbeAt,
      hasProbeTimer: probeTimer !== null,
      hasTimeoutTimer: timeoutTimer !== null,
      hasInFlightProbe: probePromise !== null,
      hasAbortController: abortController !== null,
      foregroundProbePending,
    }),
  };
}

const coordinator = createNetStatusCoordinator({
  fetch: (input, init) => fetch(input, init),
  now: Date.now,
  setTimeout: (listener, delayMs) => setTimeout(listener, delayMs),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  isAppActive: runtimeAppStateStore.getSnapshot,
  subscribeAppActive: (listener) => runtimeAppStateStore.subscribe(() => listener(runtimeAppStateStore.getSnapshot())),
});

export function getNetStatus(): NetStatus { return coordinator.getStatus(); }
export function subscribeNetStatus(listener: (online: boolean) => void): () => void { return coordinator.subscribe(listener); }
export function checkOnlineNow(): Promise<boolean> { return coordinator.checkOnlineNow(); }
export function reportNetworkSuccess(): void { coordinator.reportSuccess(); }
export function reportNetworkFailure(): void { coordinator.reportFailure(); }

export default {};
