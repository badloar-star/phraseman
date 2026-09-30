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
  subscribe(listener: FriendsListener, onError?: FriendsErrorListener): () => void;
  /** Перезапускает подписку после ошибки (кнопка «Повторить» на экране друзей). */
  retry(): void;
}>;

type FriendsErrorListener = (error: Error) => void;

export function createFriendsAccountStore(dependencies: StoreDependencies): FriendsAccountStore {
  let rows: FriendEntry[] = [];
  let meta: SubscribeFriendsSnapshotMeta | undefined;
  let detach: (() => void) | null = null;
  let repairInFlight = false;
  const listeners = new Set<FriendsListener>();
  const errorListeners = new Set<FriendsErrorListener>();

  const start = (): void => {
    if (detach || listeners.size === 0) return;
    detach = dependencies.listen(
      (nextRows, nextMeta) => {
        rows = [...nextRows];
        meta = nextMeta;
        for (const listener of listeners) listener(rows, meta);
      },
      (error) => {
        const code = String((error as { code?: string }).code ?? '');
        if (
          repairInFlight
          || !dependencies.repairAuthLink
          || !code.includes('permission-denied')
        ) {
          // зачем (макет community.html COM-04-OFFLINE): раньше ошибка подписки
          // глохла молча и экран не знал, что список не обновился. Теперь пишем
          // причину и отдаём её экрану — он покажет «Связь пропала · Повторить».
          console.warn('[FRIENDS-LIST] subscription error', { code, repairInFlight, message: error?.message });
          detach?.();
          detach = null;
          for (const onError of errorListeners) onError(error);
          return;
        }
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
    retry() {
      console.warn('[FRIENDS-LIST] retry', { listeners: listeners.size, attached: detach != null });
      detach?.();
      detach = null;
      start();
    },
    subscribe(listener: FriendsListener, onError?: FriendsErrorListener) {
      listeners.add(listener);
      if (onError) errorListeners.add(onError);
      if (rows.length > 0 || meta) listener([...rows], meta);
      start();
      return () => {
        listeners.delete(listener);
        if (onError) errorListeners.delete(onError);
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
