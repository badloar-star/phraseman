import type {
  DailyJourneyGiftInput,
  DailyJourneyGiftOccurrenceV1,
} from './daily_journey_gift_inbox';
import { dailyJourneyRewardPayloadForDay } from './daily_journey_rewards';

export type DailyJourneyHomeTargetRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type DailyJourneyHomeDelivery = Readonly<{
  occurrence: DailyJourneyGiftOccurrenceV1;
  targetRect: DailyJourneyHomeTargetRect | null;
}>;

export type DailyJourneyHomeGrantErrorScope = 'commit' | 'measure' | 'modal' | 'account_stale';

export type DailyJourneyHomeGrantController = Readonly<{
  press: () => Promise<'opened' | 'deferred' | 'failed' | 'stale'>;
  resetForAccount: () => void;
}>;

export function createDailyJourneyHomeGrantController<Token>(dependencies: Readonly<{
  createOperationId: () => string;
  captureToken: () => Token;
  isTokenCurrent: (token: Token) => boolean;
  captureRuntimeEpoch?: () => number;
  isRuntimeActive?: (epoch: number) => boolean;
  commit: (
    input: DailyJourneyGiftInput,
    token: Token,
  ) => Promise<Readonly<{
    status: 'committed' | 'already_committed';
    occurrence: DailyJourneyGiftOccurrenceV1;
  }>>;
  measureTarget: (runtimeEpoch: number) => Promise<DailyJourneyHomeTargetRect | null>;
  enqueueModal: (delivery: DailyJourneyHomeDelivery, token: Token) => void;
  deferModal?: (delivery: DailyJourneyHomeDelivery, token: Token) => void;
  reportError: (scope: DailyJourneyHomeGrantErrorScope, error: unknown) => void;
}>): DailyJourneyHomeGrantController {
  let pressOrdinal = 0;
  const retryQueue: DailyJourneyGiftInput[] = [];

  const report = (scope: DailyJourneyHomeGrantErrorScope, error: unknown): void => {
    try {
      dependencies.reportError(scope, error);
    } catch {
      // Diagnostics and recoverable feedback must never leak a rejected press.
    }
  };

  const press = async (): Promise<'opened' | 'deferred' | 'failed' | 'stale'> => {
    // A failed commit is ambiguous: storage may have accepted it and lost only
    // the response. Retry that exact immutable input. Concurrent taps still
    // reserve fresh ordinals because failures enter the queue only on settle.
    const retryInput = retryQueue.shift();
    const ordinal = retryInput ? null : pressOrdinal++;
    const day = retryInput?.day ?? ((ordinal as number) % 50) + 1;
    const cycle = retryInput?.cycle ?? Math.floor((ordinal as number) / 50) + 1;
    const operationId = retryInput?.operationId
      ?? `daily_journey_dev:${dependencies.createOperationId()}`;
    const input: DailyJourneyGiftInput = retryInput ?? Object.freeze({
      operationId,
      source: 'daily_journey_dev',
      cycle,
      day,
      reward: dailyJourneyRewardPayloadForDay(day),
    });
    const token = dependencies.captureToken();
    const runtimeEpoch = dependencies.captureRuntimeEpoch?.() ?? 0;
    const isRuntimeActive = (): boolean => dependencies.isRuntimeActive?.(runtimeEpoch) ?? true;

    if (!dependencies.isTokenCurrent(token)) {
      report('account_stale', new Error('daily_journey_home_account_stale'));
      return 'stale';
    }

    let committed: Awaited<ReturnType<typeof dependencies.commit>>;
    try {
      committed = await dependencies.commit(input, token);
    } catch (error) {
      retryQueue.unshift(input);
      report('commit', error);
      return 'failed';
    }

    if (!dependencies.isTokenCurrent(token)) {
      report('account_stale', new Error('daily_journey_home_account_stale'));
      return 'stale';
    }

    const present = (delivery: DailyJourneyHomeDelivery, deferred: boolean): 'opened' | 'deferred' | 'failed' => {
      try {
        if (deferred && dependencies.deferModal) {
          dependencies.deferModal(delivery, token);
          return 'deferred';
        }
        dependencies.enqueueModal(delivery, token);
        return deferred ? 'deferred' : 'opened';
      } catch (error) {
        report('modal', error);
        return 'failed';
      }
    };

    if (!isRuntimeActive()) {
      return present(Object.freeze({ occurrence: committed.occurrence, targetRect: null }), true);
    }

    let targetRect: DailyJourneyHomeTargetRect | null = null;
    try {
      targetRect = await dependencies.measureTarget(runtimeEpoch);
    } catch (error) {
      // Measurement is presentation-only. The verified occurrence stays real
      // and the modal uses its stable top-center fallback.
      report('measure', error);
    }

    if (!dependencies.isTokenCurrent(token)) {
      report('account_stale', new Error('daily_journey_home_account_stale'));
      return 'stale';
    }

    if (!isRuntimeActive()) {
      return present(Object.freeze({ occurrence: committed.occurrence, targetRect: null }), true);
    }
    return present(Object.freeze({ occurrence: committed.occurrence, targetRect }), false);
  };

  const resetForAccount = (): void => {
    retryQueue.length = 0;
    pressOrdinal = 0;
  };

  return Object.freeze({ press, resetForAccount });
}

export type DailyJourneyProductionPresentationErrorScope = 'measure' | 'offer' | 'release';

/**
 * Presentation is deliberately downstream of the durable gift commit. A
 * missing target only selects the scene's top-center fallback; it can never
 * suppress or undo the committed occurrence.
 */
export async function offerDailyJourneyProductionDelivery<Token>(dependencies: Readonly<{
  occurrence: DailyJourneyGiftOccurrenceV1;
  token: Token;
  runtimeEpoch: number;
  measureTarget: (runtimeEpoch: number) => Promise<DailyJourneyHomeTargetRect | null>;
  isTokenCurrent: (token: Token) => boolean;
  rememberToken: (operationId: string, token: Token) => void;
  forgetToken: (operationId: string) => void;
  offer: (delivery: DailyJourneyHomeDelivery, token: Token) => 'shown' | 'deferred' | 'stale';
  releasePresentation: (operationId: string) => void;
  reportError: (scope: DailyJourneyProductionPresentationErrorScope, error: unknown) => void;
}>): Promise<'shown' | 'deferred' | 'stale' | 'failed'> {
  const operationId = dependencies.occurrence.operationId;
  const report = (scope: DailyJourneyProductionPresentationErrorScope, error: unknown): void => {
    try {
      dependencies.reportError(scope, error);
    } catch {
      // Diagnostics are never allowed to turn delivery into an unhandled task.
    }
  };
  const forget = (): void => {
    try {
      dependencies.forgetToken(operationId);
    } catch (error) {
      report('release', error);
    }
  };
  const release = (): void => {
    try {
      dependencies.releasePresentation(operationId);
    } catch (error) {
      report('release', error);
    }
  };

  let targetRect: DailyJourneyHomeTargetRect | null = null;
  try {
    targetRect = await dependencies.measureTarget(dependencies.runtimeEpoch);
  } catch (error) {
    report('measure', error);
  }

  if (!dependencies.isTokenCurrent(dependencies.token)) {
    release();
    return 'stale';
  }

  try {
    dependencies.rememberToken(operationId, dependencies.token);
    const offered = dependencies.offer(
      Object.freeze({ occurrence: dependencies.occurrence, targetRect }),
      dependencies.token,
    );
    if (offered === 'stale') {
      forget();
      release();
    }
    return offered;
  } catch (error) {
    forget();
    release();
    report('offer', error);
    return 'failed';
  }
}

export type DailyJourneyHomeProjectionController = Readonly<{
  activate: () => Promise<void>;
  deactivate: () => void;
  reload: () => Promise<void>;
  markInventoryOpened: () => void;
  resetForAccount: () => Promise<void>;
  dispose: () => void;
}>;

/**
 * Owns the Home unread read boundary. Every public async method settles so UI
 * events can safely fire-and-forget; late account/focus/request responses are
 * ignored and a source failure preserves the last valid visible count.
 */
export function createDailyJourneyHomeProjectionController<Token>(dependencies: Readonly<{
  captureToken: () => Token;
  isTokenCurrent: (token: Token) => boolean;
  readProjection: (token: Token) => Promise<Readonly<{ unreadCount: number }>>;
  displayUnreadCount: (count: number) => void;
  reportError: (scope: 'projection', error: unknown) => void;
}>): DailyJourneyHomeProjectionController {
  let active = false;
  let disposed = false;
  let lifecycleEpoch = 0;
  let requestId = 0;

  const report = (error: unknown): void => {
    try {
      dependencies.reportError('projection', error);
    } catch {
      // Diagnostics cannot turn an inbox event into an unhandled rejection.
    }
  };

  const reload = async (): Promise<void> => {
    if (!active || disposed) return;
    const epoch = lifecycleEpoch;
    const currentRequest = ++requestId;
    let token: Token;
    try {
      token = dependencies.captureToken();
      if (!dependencies.isTokenCurrent(token)) return;
      const projection = await dependencies.readProjection(token);
      if (disposed
        || !active
        || epoch !== lifecycleEpoch
        || currentRequest !== requestId
        || !dependencies.isTokenCurrent(token)) return;
      dependencies.displayUnreadCount(Math.max(0, Math.trunc(projection.unreadCount)));
    } catch (error) {
      if (!disposed && active && epoch === lifecycleEpoch && currentRequest === requestId) {
        report(error);
      }
    }
  };

  const activate = async (): Promise<void> => {
    if (disposed) return;
    active = true;
    lifecycleEpoch += 1;
    requestId += 1;
    await reload();
  };

  const deactivate = (): void => {
    active = false;
    lifecycleEpoch += 1;
    requestId += 1;
  };

  const markInventoryOpened = (): void => {
    if (disposed) return;
    // The destination screen performs the durable seen write after it has
    // rendered the inventory. Home only clears its projection immediately and
    // invalidates a stale read, preventing the last gift button from flashing
    // again while Back restores this screen.
    requestId += 1;
    try {
      dependencies.displayUnreadCount(0);
    } catch (error) {
      report(error);
    }
  };

  const resetForAccount = async (): Promise<void> => {
    if (disposed) return;
    lifecycleEpoch += 1;
    requestId += 1;
    try {
      dependencies.displayUnreadCount(0);
    } catch (error) {
      report(error);
    }
    if (active) await reload();
  };

  const dispose = (): void => {
    disposed = true;
    active = false;
    lifecycleEpoch += 1;
    requestId += 1;
  };

  return Object.freeze({ activate, deactivate, reload, markInventoryOpened, resetForAccount, dispose });
}

export type DailyJourneyHomeLandingGate = Readonly<{
  shouldPulse: (occurrenceId: string | null, reduceMotion: boolean) => boolean;
}>;

export function createDailyJourneyHomeLandingGate(): DailyJourneyHomeLandingGate {
  const delivered = new Set<string>();
  const deliveredOrder: string[] = [];
  return Object.freeze({
    shouldPulse(occurrenceId: string | null, reduceMotion: boolean): boolean {
      if (occurrenceId) {
        if (delivered.has(occurrenceId)) return false;
        delivered.add(occurrenceId);
        deliveredOrder.push(occurrenceId);
        if (deliveredOrder.length > 128) {
          delivered.delete(deliveredOrder.shift() as string);
        }
      }
      return !reduceMotion;
    },
  });
}

export type DailyJourneyHomePresentedDelivery = DailyJourneyHomeDelivery & Readonly<{ run: number }>;

export type DailyJourneyHomeDeliveryController<Token> = Readonly<{
  setActive: (active: boolean) => void;
  offer: (delivery: DailyJourneyHomeDelivery, token: Token) => 'shown' | 'deferred' | 'stale';
  complete: () => void;
  landed: (occurrenceId: string | null) => 'pulsed' | 'ignored';
  resetForAccount: () => void;
  dispose: () => void;
}>;

/**
 * Owns delivery UI independently from the durable journal. Blur hides and
 * defers the exact committed occurrence; focus shows it once if its account
 * generation is still current. Duplicate/stale landing callbacks are no-ops.
 */
export function createDailyJourneyHomeDeliveryController<Token>(dependencies: Readonly<{
  isTokenCurrent: (token: Token) => boolean;
  displayDelivery: (delivery: DailyJourneyHomePresentedDelivery | null) => void;
  startPulse: () => void;
  stopPulse: () => void;
  shouldReduceMotion: () => boolean;
}>): DailyJourneyHomeDeliveryController<Token> {
  type Entry = Readonly<{ delivery: DailyJourneyHomeDelivery; token: Token }>;

  let active = false;
  let disposed = false;
  let visible: (Entry & Readonly<{ presented: DailyJourneyHomePresentedDelivery }>) | null = null;
  let pending: Entry[] = [];
  let run = 0;
  const landingGate = createDailyJourneyHomeLandingGate();

  const showNext = (): void => {
    if (!active || disposed || visible) return;
    while (pending.length > 0) {
      const entry = pending.shift() as Entry;
      if (!dependencies.isTokenCurrent(entry.token)) continue;
      const presented = Object.freeze({ ...entry.delivery, run: ++run });
      visible = Object.freeze({ ...entry, presented });
      dependencies.displayDelivery(presented);
      return;
    }
    dependencies.displayDelivery(null);
  };

  const setActive = (nextActive: boolean): void => {
    if (disposed || active === nextActive) return;
    active = nextActive;
    if (!active) {
      if (visible) {
        pending.unshift(Object.freeze({
          delivery: Object.freeze({ ...visible.delivery, targetRect: null }),
          token: visible.token,
        }));
        visible = null;
        dependencies.displayDelivery(null);
      }
      dependencies.stopPulse();
      return;
    }
    showNext();
  };

  const offer = (delivery: DailyJourneyHomeDelivery, token: Token): 'shown' | 'deferred' | 'stale' => {
    if (disposed || !dependencies.isTokenCurrent(token)) return 'stale';
    const entry = Object.freeze({ delivery, token });
    if (!active || visible) {
      pending.push(entry);
      return 'deferred';
    }
    pending.push(entry);
    showNext();
    return 'shown';
  };

  const complete = (): void => {
    if (disposed || !visible) return;
    visible = null;
    if (!active) {
      dependencies.displayDelivery(null);
      return;
    }
    if (pending.length > 0) dependencies.stopPulse();
    showNext();
  };

  const landed = (occurrenceId: string | null): 'pulsed' | 'ignored' => {
    if (disposed || !active || !visible || occurrenceId !== visible.delivery.occurrence.operationId) {
      return 'ignored';
    }
    if (!landingGate.shouldPulse(occurrenceId, dependencies.shouldReduceMotion())) return 'ignored';
    dependencies.startPulse();
    return 'pulsed';
  };

  const resetForAccount = (): void => {
    pending = [];
    visible = null;
    dependencies.displayDelivery(null);
    dependencies.stopPulse();
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    active = false;
    pending = [];
    visible = null;
    dependencies.stopPulse();
  };

  return Object.freeze({ setActive, offer, complete, landed, resetForAccount, dispose });
}

const DAILY_JOURNEY_HOME_MEASURE_TIMEOUT_MS = 300;

/** Bounded native measurement. Epoch/focus cancellation and late callbacks resolve to the stable fallback. */
export function measureDailyJourneyHomeTarget(dependencies: Readonly<{
  measure: (callback: (x: number, y: number, width: number, height: number) => void) => void;
  isCurrent: () => boolean;
  windowHeight: number;
  timeoutMs?: number;
}>): Promise<DailyJourneyHomeTargetRect | null> {
  return new Promise((resolve) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const finish = (rect: DailyJourneyHomeTargetRect | null): void => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(rect);
    };

    timeout = setTimeout(() => finish(null), dependencies.timeoutMs ?? DAILY_JOURNEY_HOME_MEASURE_TIMEOUT_MS);
    if (!dependencies.isCurrent()) {
      finish(null);
      return;
    }

    try {
      dependencies.measure((x, y, width, height) => {
        if (settled || !dependencies.isCurrent()) {
          finish(null);
          return;
        }
        if (!Number.isFinite(x)
          || !Number.isFinite(y)
          || !Number.isFinite(width)
          || !Number.isFinite(height)
          || width <= 0
          || height <= 0
          || y + height <= 0
          || y >= dependencies.windowHeight) {
          finish(null);
          return;
        }
        finish(Object.freeze({ x, y, width, height }));
      });
    } catch {
      finish(null);
    }
  });
}
