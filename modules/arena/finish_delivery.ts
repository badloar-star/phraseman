import type { ArenaMatchReport } from './match_machine';
import type { ArenaKeyValueStore } from './match_store';
import { arenaClearMatchIfCurrent } from './match_store';
import {
  arenaOutboxEnqueue,
  arenaOutboxRemove,
} from './outbox_storage';
import {
  arenaOutboxClassify,
  type ArenaOutboxOwnerScope,
} from './result_outbox';
import type { ArenaNetworkDispatch } from './account_dispatch';

type TransitionLock = <T>(work: () => Promise<T>) => Promise<T>;

export type ArenaFinishDeliveryResult<Response> =
  | Readonly<{ status: 'sent'; response: Response }>
  | Readonly<{ status: 'queued' }>
  | Readonly<{ status: 'rejected' }>
  | Readonly<{ status: 'stale' }>;

/**
 * Durable finish handoff with one immutable owner scope.
 *
 * Network stays outside the account-transition lock: sign-out must not wait on
 * an unbounded native callable. Both local commit phases re-enter the lock and
 * fail closed if identity or the screen lifetime changed meanwhile.
 */
export async function arenaDeliverFinishedMatch<Response>(input: Readonly<{
  store: ArenaKeyValueStore;
  scope: ArenaOutboxOwnerScope;
  report: ArenaMatchReport;
  rulesVersion: string;
  wallNowMs: number;
  isAlive(): boolean;
  isScopeCurrent(scope: ArenaOutboxOwnerScope): boolean;
  withTransitionLock: TransitionLock;
  reserveDispatch(): Promise<ArenaNetworkDispatch<Response> | null>;
}>): Promise<ArenaFinishDeliveryResult<Response>> {
  await input.withTransitionLock(async () => {
    if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return false;
    const durable = await arenaOutboxEnqueue(
      input.store,
      input.scope,
      input.report,
      input.wallNowMs,
      input.rulesVersion,
    );
    if (durable && input.isAlive() && input.isScopeCurrent(input.scope)) {
      await arenaClearMatchIfCurrent(
        input.store,
        input.scope,
        input.report.matchId,
        input.isScopeCurrent,
      );
    }
    return durable;
  });

  if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return { status: 'stale' };

  const dispatch = await input.reserveDispatch();
  if (!dispatch) return { status: 'stale' };

  let response: Response;
  try {
    response = await dispatch.networkPromise;
  } catch (error) {
    if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return { status: 'stale' };
    if (arenaOutboxClassify(error) !== 'rejected') return { status: 'queued' };
    const removed = await input.withTransitionLock(async () => {
      if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return false;
      await arenaOutboxRemove(input.store, input.scope, input.report.matchId);
      await arenaClearMatchIfCurrent(
        input.store,
        input.scope,
        input.report.matchId,
        input.isScopeCurrent,
      );
      return true;
    });
    return removed ? { status: 'rejected' } : { status: 'stale' };
  }

  const committed = await input.withTransitionLock(async () => {
    if (!input.isAlive() || !input.isScopeCurrent(input.scope)) return false;
    await arenaOutboxRemove(input.store, input.scope, input.report.matchId);
    await arenaClearMatchIfCurrent(
      input.store,
      input.scope,
      input.report.matchId,
      input.isScopeCurrent,
    );
    return true;
  });
  return committed ? { status: 'sent', response } : { status: 'stale' };
}
