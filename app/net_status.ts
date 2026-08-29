import { runtimeAppStateStore } from './runtime_app_state_store';
import {
  isInteractiveNetworkDeferredError,
  registerInteractiveNetworkQuietParticipant,
  withBackgroundNetworkLease,
} from './interactive_network_quiet';
import { DebugLogger } from './debug-logger';

// Первым — Google captive-portal probe (быстрый), дальше фолбэки вне
// инфраструктуры Google: в некоторых регионах Google-хосты фильтруются или
// троттлятся, и единственный пробник давал ложный «офлайн» при живой сети.
// Offline ставим только когда недоступны ВСЕ хосты.
export const PROBE_URLS = [
  'https://clients3.google.com/generate_204',
  'https://one.one.one.one/cdn-cgi/trace',
  'http://captive.apple.com/hotspot-detect.html',
] as const;
const PROBE_TIMEOUT_MS = 5_000;
export const OFFLINE_BACKOFF_MS = [10_000, 30_000, 60_000, 120_000, 300_000] as const;
export const ONLINE_SAFETY_MS = 300_000;

export type NetStatus = 'online' | 'offline' | 'unknown';

type TimerId = unknown;
export type NetStatusCoordinatorDeps = {
  fetch(input: string, init: RequestInit): Promise<unknown>;
  withNetworkLease?<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T>;
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
  let pausedForInteractiveQuiet = false;
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
      try { listener(online); } catch (e) {
      // listeners cannot break delivery
      DebugLogger.error('net_status:online', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
    });
  };
  const delayForNextProbe = () => status === 'offline'
    ? OFFLINE_BACKOFF_MS[Math.min(offlineAttempt, OFFLINE_BACKOFF_MS.length - 1)]!
    : ONLINE_SAFETY_MS;

  const scheduleAt = (at: number) => {
    clearProbeTimer();
    nextProbeAt = at;
    if (disposed || pausedForInteractiveQuiet || listeners.size === 0 || !deps.isAppActive()) return;
    const delay = Math.max(0, at - deps.now());
    probeTimer = deps.setTimeout(() => {
      probeTimer = null;
      void runProbe('scheduled');
    }, delay);
  };
  const scheduleNext = () => scheduleAt(deps.now() + delayForNextProbe());

  const probeOnce = async (networkSignal?: AbortSignal): Promise<{
    online: boolean;
    measured: boolean;
  }> => {
    // Опрос хостов по очереди: online при первом отклике, offline — только
    // когда недоступны ВСЕ (иначе блокировка одного хоста = ложный офлайн).
    for (const url of PROBE_URLS) {
      const controller = new AbortController();
      abortController = controller;
      const abortForInteractiveSession = () => controller.abort(networkSignal?.reason);
      if (networkSignal?.aborted) abortForInteractiveSession();
      else networkSignal?.addEventListener('abort', abortForInteractiveSession, { once: true });
      let timedOut = false;
      timeoutTimer = deps.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, PROBE_TIMEOUT_MS);
      try {
        await deps.fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
        if (disposed || pausedForInteractiveQuiet || !deps.isAppActive()) {
          return { online: status === 'online', measured: false };
        }
        offlineAttempt = 0;
        setStatus('online');
        return { online: true, measured: true };
      } catch {
        // Таймаут или обычная сетевая ошибка — пробуем следующий хост.
        // Внешний abort (background/dispose) — прекращаем весь probe.
        if (!timedOut && controller.signal.aborted) {
          return { online: status === 'online', measured: false };
        }
      } finally {
        networkSignal?.removeEventListener('abort', abortForInteractiveSession);
        clearTimeoutTimer();
        if (abortController === controller) abortController = null;
      }
      if (disposed || pausedForInteractiveQuiet || !deps.isAppActive()) {
        return { online: status === 'online', measured: false };
      }
    }
    setStatus('offline');
    return { online: false, measured: true };
  };

  const runProbe = (origin: 'manual' | 'scheduled' | 'foreground' | 'subscriber'): Promise<boolean> => {
    if (probePromise) return probePromise;
    if (disposed || pausedForInteractiveQuiet || !deps.isAppActive()) {
      return Promise.resolve(status === 'online');
    }
    clearProbeTimer();
    const attempt = deps.withNetworkLease
      ? deps.withNetworkLease((signal) => probeOnce(signal))
      : probeOnce();
    probePromise = attempt.catch((error) => {
      // A protected learning session is not an offline signal. Keep the last
      // known state and retry only after the global quiet coordinator resumes.
      if (isInteractiveNetworkDeferredError(error)) {
        return { online: status === 'online', measured: false };
      }
      throw error;
    }).then((outcome) => {
      if (origin === 'scheduled' && outcome.measured && !outcome.online) {
        offlineAttempt = Math.min(offlineAttempt + 1, OFFLINE_BACKOFF_MS.length - 1);
      }
      return outcome.online;
    }).finally(() => {
      probePromise = null;
      if (pausedForInteractiveQuiet) return;
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
    if (!active || pausedForInteractiveQuiet) {
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
      const subscriptionListener = (online: boolean) => listener(online);
      listeners.add(subscriptionListener);
      if (wasEmpty && deps.isAppActive() && !pausedForInteractiveQuiet) {
        if (probePromise) foregroundProbePending = true;
        else if (nextProbeAt > deps.now()) scheduleAt(nextProbeAt);
        else void runProbe('subscriber');
      }
      return () => {
        listeners.delete(subscriptionListener);
        if (listeners.size === 0) {
          clearProbeTimer();
          foregroundProbePending = false;
          abortController?.abort();
        }
      };
    },
    checkOnlineNow: (): Promise<boolean> => runProbe('manual'),
    reportSuccess() {
      offlineAttempt = 0;
      setStatus('online');
      if (listeners.size > 0 && deps.isAppActive() && !pausedForInteractiveQuiet) scheduleNext();
      else clearProbeTimer();
    },
    reportFailure() {
      setStatus('offline');
      if (listeners.size > 0 && deps.isAppActive() && !pausedForInteractiveQuiet &&
        !probePromise && probeTimer === null) scheduleNext();
    },
    pauseForInteractiveQuiet() {
      pausedForInteractiveQuiet = true;
      foregroundProbePending = false;
      clearProbeTimer();
      abortController?.abort();
    },
    resumeAfterInteractiveQuiet() {
      pausedForInteractiveQuiet = false;
      if (disposed || !deps.isAppActive() || listeners.size === 0) return;
      clearProbeTimer();
      if (probePromise) foregroundProbePending = true;
      else void runProbe('foreground');
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
      pausedForInteractiveQuiet = false;
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
      pausedForInteractiveQuiet,
    }),
  };
}

const coordinator = createNetStatusCoordinator({
  fetch: (input, init) => fetch(input, init),
  withNetworkLease: (work) => withBackgroundNetworkLease(
    'net_status.probe',
    (lease) => work(lease.signal),
  ),
  now: Date.now,
  setTimeout: (listener, delayMs) => setTimeout(listener, delayMs),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  isAppActive: runtimeAppStateStore.getSnapshot,
  subscribeAppActive: (listener) => runtimeAppStateStore.subscribe(() => listener(runtimeAppStateStore.getSnapshot())),
});

registerInteractiveNetworkQuietParticipant('net_status.probe', {
  // Active probes are already abortable leases. The global coordinator waits
  // for their real fetch settlement before declaring the session quiet.
  quiesce: () => coordinator.pauseForInteractiveQuiet(),
  resume: () => coordinator.resumeAfterInteractiveQuiet(),
});

export function getNetStatus(): NetStatus { return coordinator.getStatus(); }
export function subscribeNetStatus(listener: (online: boolean) => void): () => void { return coordinator.subscribe(listener); }
export function checkOnlineNow(): Promise<boolean> { return coordinator.checkOnlineNow(); }
export function reportNetworkSuccess(): void { coordinator.reportSuccess(); }
export function reportNetworkFailure(): void { coordinator.reportFailure(); }

export default {};
