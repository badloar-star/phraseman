export type ArenaNetworkDispatch<T> = Readonly<{
  networkPromise: Promise<T>;
}>;

type TransitionLock = <T>(work: () => Promise<T>) => Promise<T>;

/**
 * Reserves the credential boundary for one captured Arena owner.
 *
 * Preflight may await identity/App Check/module loading, so it belongs inside
 * the account-transition lock. The prepared callback must synchronously create
 * the Firebase callable promise. Only that creation is protected; the network
 * response is deliberately awaited by the caller after this function releases
 * the lock.
 */
export function arenaReserveAccountDispatch<T>(input: Readonly<{
  isOwnerCurrent(): boolean;
  withTransitionLock: TransitionLock;
  prepareDispatch(): Promise<() => Promise<T>>;
}>): Promise<ArenaNetworkDispatch<T> | null> {
  return input.withTransitionLock(async () => {
    if (!input.isOwnerCurrent()) return null;
    const dispatch = await input.prepareDispatch();
    if (!input.isOwnerCurrent()) return null;
    return { networkPromise: dispatch() };
  });
}
