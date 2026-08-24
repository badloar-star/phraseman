import type { ArenaNetworkDispatch } from './account_dispatch';
import type { ArenaKeyValueStore } from './match_store';
import {
  arenaOutboxList,
  arenaOutboxRemove,
  arenaOutboxSave,
} from './outbox_storage';
import {
  arenaOutboxAfterFailure,
  arenaOutboxClassify,
  arenaOutboxDue,
  type ArenaOutboxEntry,
  type ArenaOutboxOwnerScope,
} from './result_outbox';

const FINISH_RETRY_DELAYS_MS = [1_500, 4_500, 16_000] as const;

/** Three foreground attempts; later app activation starts a fresh bounded run. */
export function arenaFinishRetryDelay(attempt: number): number | null {
  return Number.isSafeInteger(attempt) && attempt >= 0
    ? FINISH_RETRY_DELAYS_MS[attempt] ?? null
    : null;
}

type TransitionLock = <T>(work: () => Promise<T>) => Promise<T>;

export type ArenaFinishRetryResult<Response> =
  | Readonly<{ status: 'sent'; response: Response }>
  | Readonly<{ status: 'kept' }>
  | Readonly<{ status: 'dropped' }>
  | Readonly<{ status: 'rejected' }>
  | Readonly<{ status: 'stale' }>;

/**
 * Replays exactly one queued finish while preserving its owner boundary.
 *
 * The generic outbox flush intentionally returns counts/ids because hub and
 * history do not consume the callable body. The still-mounted match screen
 * does: it needs the caller-only review, settle probe and coherent result in
 * the exact response that accepted this report.
 */
export async function arenaRetryQueuedFinishDelivery<Response>(input: Readonly<{
  store: ArenaKeyValueStore;
  scope: ArenaOutboxOwnerScope;
  matchId: string;
  wallNowMs: number;
  isAlive(): boolean;
  isScopeCurrent(scope: ArenaOutboxOwnerScope): boolean;
  withTransitionLock: TransitionLock;
  reserveDispatch(entry: ArenaOutboxEntry): Promise<ArenaNetworkDispatch<Response> | null>;
}>): Promise<ArenaFinishRetryResult<Response>> {
  const entry = await input.withTransitionLock(async () => {
    if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return null;
    return (await arenaOutboxList(input.store, input.scope))
      .find((candidate) => candidate.matchId === input.matchId) ?? null;
  });
  if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return { status: 'stale' };
  if (!entry) return { status: 'dropped' };
  if (!arenaOutboxDue(entry, input.wallNowMs)) return { status: 'kept' };

  const dispatch = await input.reserveDispatch(entry);
  if (!dispatch) return { status: 'stale' };

  let response: Response;
  try {
    response = await dispatch.networkPromise;
  } catch (error) {
    if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return { status: 'stale' };
    const failure = arenaOutboxClassify(error);
    const next = arenaOutboxAfterFailure(entry, failure, input.wallNowMs);
    const committed = await input.withTransitionLock(async () => {
      if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return false;
      if (next) await arenaOutboxSave(input.store, input.scope, next);
      else await arenaOutboxRemove(input.store, input.scope, input.matchId);
      return true;
    });
    if (!committed) return { status: 'stale' };
    if (failure === 'rejected') return { status: 'rejected' };
    return next ? { status: 'kept' } : { status: 'dropped' };
  }

  const committed = await input.withTransitionLock(async () => {
    if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return false;
    await arenaOutboxRemove(input.store, input.scope, input.matchId);
    return true;
  });
  return committed ? { status: 'sent', response } : { status: 'stale' };
}
