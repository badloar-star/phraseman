import {
  ensureFriendRequestViewerAuthLink,
  subscribeToFriends,
  type FriendEntry,
  type SubscribeFriendsSnapshotMeta,
} from './firestore_friend_requests';

type FriendsListener = (
  rows: FriendEntry[],
  meta?: SubscribeFriendsSnapshotMeta,
) => void;

type StoreDependencies = Readonly<{
  listen(
    callback: FriendsListener,
    onError?: (error: Error) => void,
  ): () => void;
  repairAuthLink?(): Promise<boolean>;
}>;

export type FriendsAccountStore = Readonly<{
  getSnapshot(): Readonly<{ rows: readonly FriendEntry[]; meta?: SubscribeFriendsSnapshotMeta }>;
  subscribe(listener: FriendsListener): () => void;
}>;

export function createFriendsAccountStore(dependencies: StoreDependencies): FriendsAccountStore {
  let rows: FriendEntry[] = [];
  let meta: SubscribeFriendsSnapshotMeta | undefined;
  let detach: (() => void) | null = null;
  let repairInFlight = false;
  const listeners = new Set<FriendsListener>();

  const start = (): void => {
    if (detach || listeners.size === 0) return;
    detach = dependencies.listen(
      (nextRows, nextMeta) => {
        rows = [...nextRows];
        meta = nextMeta;
        for (const listener of listeners) listener(rows, meta);
      },
      (error) => {
        if (
          repairInFlight
          || !dependencies.repairAuthLink
          || !String((error as { code?: string }).code ?? '').includes('permission-denied')
        ) return;
        detach?.();
        detach = null;
        repairInFlight = true;
        void dependencies.repairAuthLink()
          .then((repaired) => { if (repaired) start(); })
          .finally(() => { repairInFlight = false; });
      },
    );
  };

  return Object.freeze({
    getSnapshot: () => Object.freeze({ rows: Object.freeze([...rows]), ...(meta ? { meta } : {}) }),
    subscribe(listener: FriendsListener) {
      listeners.add(listener);
      if (rows.length > 0 || meta) listener([...rows], meta);
      start();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          detach?.();
          detach = null;
          rows = [];
          meta = undefined;
        }
      };
    },
  });
}

export const friendsAccountStore = createFriendsAccountStore({
  listen: subscribeToFriends,
  repairAuthLink: () => ensureFriendRequestViewerAuthLink(),
});
