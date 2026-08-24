import type { PhoneStateSyncEngine } from './sync_engine';

export const PHONE_STATE_RETRY_BACKOFF_MS = Object.freeze([
  5_000,
  30_000,
  120_000,
  600_000,
  3_600_000,
] as const);

const LEASE_DURATION_MS = 60_000;

export type SyncTriggerReason =
  | 'sealed_segment'
  | 'connectivity_online'
  | 'foreground'
  | 'hydrated'
  | 'background';

export type PhoneStateRetryState = Readonly<{
  attempts: number;
  nextRetryAt: number;
  leaseOwner: string | null;
  leaseExpiresAt: number | null;
  lastErrorClass: string | null;
}>;

export interface PhoneStateRetryStore {
  read(): Promise<PhoneStateRetryState | null>;
  write(state: PhoneStateRetryState): Promise<void>;
  clear(): Promise<void>;
}

export interface PhoneStateSyncCoordinator {
  restore(): Promise<void>;
  trigger(reason: SyncTriggerReason): void;
  dispose(): void;
}

export type CreatePhoneStateSyncCoordinatorOptions<TimerHandle> = Readonly<{
  engine: PhoneStateSyncEngine;
  retryStore: PhoneStateRetryStore;
  leaseOwner: string;
  now: () => number;
  random: () => number;
  setTimer: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimer: (timer: TimerHandle) => void;
  drainExternalIntents?: () => Promise<Readonly<{ hasMore: boolean }>>;
}>;

function validState(value: PhoneStateRetryState): boolean {
  return Number.isSafeInteger(value.attempts)
    && value.attempts >= 0
    && Number.isSafeInteger(value.nextRetryAt)
    && value.nextRetryAt >= 0
    && (
      (value.leaseOwner === null && value.leaseExpiresAt === null)
      || (
        typeof value.leaseOwner === 'string'
        && value.leaseOwner.length > 0
        && Number.isSafeInteger(value.leaseExpiresAt)
        && (value.leaseExpiresAt as number) >= 0
      )
    )
    && (value.lastErrorClass === null || typeof value.lastErrorClass === 'string');
}

function errorClass(error: unknown): string {
  const value = error instanceof Error
    ? `${String((error as Error & { code?: unknown }).code ?? '')} ${error.message}`
    : String(error ?? '');
  const normalized = value.toLowerCase();
  if (
    normalized.includes('offline')
    || normalized.includes('network')
    || normalized.includes('unavailable')
  ) {
    return 'offline';
  }
  if (normalized.includes('permission')) return 'permission';
  if (normalized.includes('conflict') || normalized.includes('already-exists')) return 'conflict';
  return 'unknown';
}

export function createPhoneStateSyncCoordinator<TimerHandle>(
  options: CreatePhoneStateSyncCoordinatorOptions<TimerHandle>,
): PhoneStateSyncCoordinator {
  if (typeof options.leaseOwner !== 'string' || options.leaseOwner.length === 0) {
    throw new Error('phone_state_sync_lease_owner_invalid');
  }

  let disposed = false;
  let running = false;
  let rerunRequested = false;
  let timer: TimerHandle | null = null;
  let retryState: PhoneStateRetryState | null = null;

  const cancelTimer = (): void => {
    if (timer !== null) {
      options.clearTimer(timer);
      timer = null;
    }
  };

  const scheduleAt = (atMs: number): void => {
    if (disposed) return;
    cancelTimer();
    const delayMs = Math.max(0, atMs - options.now());
    timer = options.setTimer(() => {
      timer = null;
      void runPass();
    }, delayMs);
  };

  const scheduleContinuation = (): void => {
    if (!disposed) scheduleAt(options.now());
  };

  const runPass = async (): Promise<void> => {
    if (disposed) return;
    if (running) {
      rerunRequested = true;
      return;
    }
    running = true;
    const previous = retryState ?? await options.retryStore.read();
    if (previous && !validState(previous)) {
      running = false;
      throw new Error('phone_state_sync_retry_state_invalid');
    }

    const now = options.now();
    const leased: PhoneStateRetryState = Object.freeze({
      attempts: previous?.attempts ?? 0,
      nextRetryAt: previous?.nextRetryAt ?? now,
      leaseOwner: options.leaseOwner,
      leaseExpiresAt: now + LEASE_DURATION_MS,
      lastErrorClass: previous?.lastErrorClass ?? null,
    });
    retryState = leased;
    try {
      await options.retryStore.write(leased);
      const result = await options.engine.syncOnce();
      const external = options.drainExternalIntents
        ? await options.drainExternalIntents()
        : Object.freeze({ hasMore: false });
      await options.retryStore.clear();
      retryState = null;
      const continueImmediately = result.hasMore || external.hasMore || rerunRequested;
      rerunRequested = false;
      running = false;
      if (continueImmediately) scheduleContinuation();
    } catch (error) {
      const attempts = (previous?.attempts ?? 0) + 1;
      const base = PHONE_STATE_RETRY_BACKOFF_MS[
        Math.min(attempts - 1, PHONE_STATE_RETRY_BACKOFF_MS.length - 1)
      ];
      const random = options.random();
      const boundedRandom = Number.isFinite(random)
        ? Math.min(1, Math.max(0, random))
        : 0.5;
      const delay = Math.round(base * (0.8 + boundedRandom * 0.4));
      const failed: PhoneStateRetryState = Object.freeze({
        attempts,
        nextRetryAt: options.now() + delay,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorClass: errorClass(error),
      });
      await options.retryStore.write(failed);
      retryState = failed;
      rerunRequested = false;
      running = false;
      scheduleAt(failed.nextRetryAt);
    }
  };

  const restore = async (): Promise<void> => {
    if (disposed) return;
    const persisted = await options.retryStore.read();
    if (!persisted) return;
    if (!validState(persisted)) {
      throw new Error('phone_state_sync_retry_state_invalid');
    }
    retryState = persisted;
    const resumeAt = persisted.leaseExpiresAt !== null
      ? Math.max(persisted.nextRetryAt, persisted.leaseExpiresAt)
      : persisted.nextRetryAt;
    scheduleAt(Math.max(options.now(), resumeAt));
  };

  const trigger = (_reason: SyncTriggerReason): void => {
    if (disposed) return;
    if (running) {
      rerunRequested = true;
      return;
    }
    scheduleAt(options.now());
  };

  const dispose = (): void => {
    disposed = true;
    rerunRequested = false;
    cancelTimer();
  };

  return Object.freeze({ restore, trigger, dispose });
}
