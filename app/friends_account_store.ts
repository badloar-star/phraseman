import {
  ensureFriendRequestViewerAuthLink,
  subscribeToFriends,
  type FriendEntry,
  type SubscribeFriendsSnapshotMeta,
} from './firestore_friend_requests';
import type { IncomingFriendGift } from './friend_gift_inbox';

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
  publishIncomingGifts(gifts: readonly IncomingFriendGift[]): void;
  takeIncomingGifts(): readonly IncomingFriendGift[];
  subscribeIncomingGifts(listener: () => void): () => void;
}>;

export function createFriendsAccountStore(dependencies: StoreDependencies): FriendsAccountStore {
  let rows: FriendEntry[] = [];
  let meta: SubscribeFriendsSnapshotMeta | undefined;
  let detach: (() => void) | null = null;
  let repairInFlight = false;
  let incomingGifts: readonly IncomingFriendGift[] = [];
  const listeners = new Set<FriendsListener>();
  const giftListeners = new Set<() => void>();

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
    publishIncomingGifts(gifts: readonly IncomingFriendGift[]) {
      if (gifts.length === 0) return;
      incomingGifts = Object.freeze([...incomingGifts, ...gifts]);
      for (const listener of giftListeners) listener();
    },
    takeIncomingGifts() {
      const current = incomingGifts;
      incomingGifts = [];
      return current;
    },
    subscribeIncomingGifts(listener: () => void) {
      giftListeners.add(listener);
      if (incomingGifts.length > 0) listener();
      return () => giftListeners.delete(listener);
    },
  });
}

export const friendsAccountStore = createFriendsAccountStore({
  listen: subscribeToFriends,
  repairAuthLink: () => ensureFriendRequestViewerAuthLink(),
});
