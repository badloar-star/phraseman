import type { PhoneStateSyncEngine } from '../modules/phone-state/sync_engine';
import {
  createPhoneStateSyncCoordinator,
  type PhoneStateRetryState,
  type PhoneStateRetryStore,
  type SyncTriggerReason,
} from '../modules/phone-state/sync_coordinator';
import {
  installPhoneStateSyncLifecycleSubscriptions,
  resolvePhoneStateLifecycleNetInfo,
} from '../app/phone_state_sync_lifecycle';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
}));

function createCoordinatorHarness(options: Readonly<{
  fail?: boolean;
  now?: number;
  persisted?: PhoneStateRetryState | null;
  hasMorePasses?: number;
  drainExternalIntents?: () => Promise<Readonly<{ hasMore: boolean }>>;
}> = {}) {
  let now = options.now ?? 1_000;
  let persisted = options.persisted ?? null;
  let fail = options.fail === true;
  let remainingMore = options.hasMorePasses ?? 0;
  let syncCalls = 0;
  let nextTimerId = 1;
  const timers = new Map<number, Readonly<{ at: number; callback: () => void }>>();

  const retryStore: PhoneStateRetryStore = {
    read: async () => persisted,
    write: async (value) => { persisted = value; },
    clear: async () => { persisted = null; },
  };
  const engine: PhoneStateSyncEngine = {
    flushOnce: async () => ({
      uploaded: 0, duplicates: 0, downloaded: 0, quarantined: 0, hasMore: false,
    }),
    pullOnce: async () => ({
      uploaded: 0, duplicates: 0, downloaded: 0, quarantined: 0, hasMore: false,
    }),
    syncOnce: async () => {
      syncCalls += 1;
      if (fail) throw new Error('offline');
      const hasMore = remainingMore > 0;
      if (hasMore) remainingMore -= 1;
      return {
        uploaded: 0,
        duplicates: 0,
        downloaded: 0,
        quarantined: 0,
        hasMore,
      };
    },
  };
  const coordinator = createPhoneStateSyncCoordinator({
    engine,
    retryStore,
    leaseOwner: 'test-process',
    now: () => now,
    random: () => 0.5,
    setTimer: (callback, delayMs) => {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, { at: now + delayMs, callback });
      return id;
    },
    clearTimer: (id) => { timers.delete(id); },
    drainExternalIntents: options.drainExternalIntents,
  });

  const drain = async (): Promise<void> => {
    for (let guard = 0; guard < 20; guard += 1) {
      await Promise.resolve();
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= now)
        .sort((left, right) => left[1].at - right[1].at)[0];
      if (!due) {
        for (let settle = 0; settle < 6; settle += 1) await Promise.resolve();
        const scheduledAfterSettle = [...timers.values()].some((timer) => timer.at <= now);
        if (!scheduledAfterSettle) return;
        continue;
      }
      timers.delete(due[0]);
      due[1].callback();
    }
    throw new Error('coordinator_drain_guard');
  };

  return {
    coordinator,
    drain,
    trigger: (reason: SyncTriggerReason) => coordinator.trigger(reason),
    triggerAndDrain: async (reason: SyncTriggerReason) => {
      coordinator.trigger(reason);
      await drain();
    },
    restore: () => coordinator.restore(),
    retryRow: () => persisted,
    scheduledAt: () => (
      [...timers.values()].sort((left, right) => left.at - right.at)[0]?.at ?? null
    ),
    timerCount: () => timers.size,
    syncCalls: () => syncCalls,
    setNow: (value: number) => { now = value; },
    setFail: (value: boolean) => { fail = value; },
  };
}

test.each([
  'sealed_segment',
  'connectivity_online',
  'foreground',
  'hydrated',
  'background',
] as const)('%s schedules one coalesced pass', async (reason) => {
  const harness = createCoordinatorHarness();

  harness.trigger(reason);
  harness.trigger(reason);
  await harness.drain();

  expect(harness.syncCalls()).toBe(1);
  expect(harness.timerCount()).toBe(0);
});

test('process restart restores retry deadline', async () => {
  const first = createCoordinatorHarness({ fail: true, now: 1_000 });
  await first.triggerAndDrain('sealed_segment');
  const persisted = first.retryRow();

  expect(persisted).toMatchObject({
    attempts: 1,
    nextRetryAt: 6_000,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastErrorClass: 'offline',
  });

  const restarted = createCoordinatorHarness({ persisted, now: 1_001 });
  await restarted.restore();
  expect(restarted.scheduledAt()).toBe(6_000);
});

test('successful pass clears persisted retry state', async () => {
  const persisted: PhoneStateRetryState = {
    attempts: 2,
    nextRetryAt: 5_000,
    leaseOwner: null,
    leaseExpiresAt: null,
    lastErrorClass: 'offline',
  };
  const harness = createCoordinatorHarness({ persisted, now: 5_000 });

  await harness.restore();
  await harness.drain();

  expect(harness.syncCalls()).toBe(1);
  expect(harness.retryRow()).toBeNull();
  expect(harness.timerCount()).toBe(0);
});

test('hasMore coalesces bounded continuation passes and dispose clears timers', async () => {
  const harness = createCoordinatorHarness({ hasMorePasses: 2 });

  harness.trigger('hydrated');
  await harness.drain();

  expect(harness.syncCalls()).toBe(3);
  harness.coordinator.trigger('sealed_segment');
  expect(harness.timerCount()).toBe(1);
  harness.coordinator.dispose();
  expect(harness.timerCount()).toBe(0);
});

test('external intent streams drain inside the same coalesced pass', async () => {
  const drainExternalIntents = jest.fn(async () => ({ hasMore: false }));
  const harness = createCoordinatorHarness({ drainExternalIntents });

  await harness.triggerAndDrain('connectivity_online');

  expect(harness.syncCalls()).toBe(1);
  expect(drainExternalIntents).toHaveBeenCalledTimes(1);
});

test('lifecycle installs one subscription each and background triggers immediately', () => {
  const triggers: SyncTriggerReason[] = [];
  let netListener: ((state: Readonly<{
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
  }>) => void) | null = null;
  let appListener: ((state: string) => void) | null = null;
  let removed = 0;
  const cleanup = installPhoneStateSyncLifecycleSubscriptions({
    coordinator: {
      restore: async () => undefined,
      trigger: (reason) => { triggers.push(reason); },
      dispose: () => undefined,
    },
    netInfo: {
      addEventListener: (listener) => {
        netListener = listener;
        return () => { removed += 1; };
      },
    },
    appState: {
      addEventListener: (_event, listener) => {
        appListener = listener;
        return { remove: () => { removed += 1; } };
      },
    },
  });

  expect(netListener).not.toBeNull();
  expect(appListener).not.toBeNull();
  (netListener as unknown as (state: { isConnected: boolean; isInternetReachable: boolean }) => void)({
    isConnected: true,
    isInternetReachable: true,
  });
  (appListener as unknown as (state: string) => void)('background');
  expect(triggers).toEqual(['connectivity_online', 'background']);

  cleanup();
  expect(removed).toBe(2);
});

test('missing native NetInfo degrades to app-state lifecycle without crashing boot', () => {
  const triggers: SyncTriggerReason[] = [];
  let appListener: ((state: string) => void) | null = null;
  let removed = 0;
  const netInfo = resolvePhoneStateLifecycleNetInfo(() => {
    throw new Error('NativeModule.RNCNetInfo is null');
  });

  const cleanup = installPhoneStateSyncLifecycleSubscriptions({
    coordinator: {
      restore: async () => undefined,
      trigger: (reason) => { triggers.push(reason); },
      dispose: () => undefined,
    },
    netInfo,
    appState: {
      addEventListener: (_event, listener) => {
        appListener = listener;
        return { remove: () => { removed += 1; } };
      },
    },
  });

  expect(netInfo).toBeNull();
  expect(appListener).not.toBeNull();
  (appListener as unknown as (state: string) => void)('active');
  expect(triggers).toEqual(['foreground']);

  cleanup();
  expect(removed).toBe(1);
});
