import type {
  DailyJourneyGiftInput,
  DailyJourneyGiftOccurrenceV1,
} from './daily_journey_gift_inbox';
import { dailyJourneyRewardPayloadForDay } from '../components/dev/dailyJourneyRewardPreviewModel';

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
  press: () => Promise<'opened' | 'failed' | 'stale'>;
}>;

export function createDailyJourneyHomeGrantController<Token>(dependencies: Readonly<{
  createOperationId: () => string;
  captureToken: () => Token;
  isTokenCurrent: (token: Token) => boolean;
  commit: (
    input: DailyJourneyGiftInput,
    token: Token,
  ) => Promise<Readonly<{
    status: 'committed' | 'already_committed';
    occurrence: DailyJourneyGiftOccurrenceV1;
  }>>;
  measureTarget: () => Promise<DailyJourneyHomeTargetRect | null>;
  enqueueModal: (delivery: DailyJourneyHomeDelivery) => void;
  reportError: (scope: DailyJourneyHomeGrantErrorScope, error: unknown) => void;
}>): DailyJourneyHomeGrantController {
  let pressOrdinal = 0;

  const report = (scope: DailyJourneyHomeGrantErrorScope, error: unknown): void => {
    try {
      dependencies.reportError(scope, error);
    } catch {
      // Diagnostics and recoverable feedback must never leak a rejected press.
    }
  };

  const press = async (): Promise<'opened' | 'failed' | 'stale'> => {
    // Reserve every logical grant synchronously. Rapid taps therefore cannot
    // share a day or id while either durable commit is still pending.
    const ordinal = pressOrdinal;
    pressOrdinal += 1;
    const day = (ordinal % 50) + 1;
    const cycle = Math.floor(ordinal / 50) + 1;
    const operationId = `daily_journey_dev:${dependencies.createOperationId()}`;
    const token = dependencies.captureToken();

    if (!dependencies.isTokenCurrent(token)) {
      report('account_stale', new Error('daily_journey_home_account_stale'));
      return 'stale';
    }

    let committed: Awaited<ReturnType<typeof dependencies.commit>>;
    try {
      committed = await dependencies.commit(Object.freeze({
        operationId,
        source: 'daily_journey_dev',
        cycle,
        day,
        reward: dailyJourneyRewardPayloadForDay(day),
      }), token);
    } catch (error) {
      report('commit', error);
      return 'failed';
    }

    if (!dependencies.isTokenCurrent(token)) {
      report('account_stale', new Error('daily_journey_home_account_stale'));
      return 'stale';
    }

    let targetRect: DailyJourneyHomeTargetRect | null = null;
    try {
      targetRect = await dependencies.measureTarget();
    } catch (error) {
      // Measurement is presentation-only. The verified occurrence stays real
      // and the modal uses its stable top-center fallback.
      report('measure', error);
    }

    if (!dependencies.isTokenCurrent(token)) {
      report('account_stale', new Error('daily_journey_home_account_stale'));
      return 'stale';
    }

    try {
      dependencies.enqueueModal(Object.freeze({
        occurrence: committed.occurrence,
        targetRect,
      }));
    } catch (error) {
      report('modal', error);
      return 'failed';
    }
    return 'opened';
  };

  return Object.freeze({ press });
}

export type DailyJourneyHomeProjectionController = Readonly<{
  activate: () => Promise<void>;
  deactivate: () => void;
  reload: () => Promise<void>;
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

  return Object.freeze({ activate, deactivate, reload, resetForAccount, dispose });
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
