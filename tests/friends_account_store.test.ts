import type { FriendEntry, SubscribeFriendsSnapshotMeta } from '../app/firestore_friend_requests';
import { createFriendsAccountStore } from '../app/friends_account_store';

jest.mock('../app/firestore_friend_requests', () => ({
  subscribeToFriends: jest.fn(() => () => {}),
  ensureFriendRequestViewerAuthLink: jest.fn(async () => true),
}));

describe('friends account store', () => {
  test('multiple UI subscribers share one underlying listener', () => {
    type Listener = (rows: FriendEntry[], meta?: SubscribeFriendsSnapshotMeta) => void;
    let emit: Listener | null = null;
    const detach = jest.fn();
    const listen = jest.fn((callback: Listener) => {
      emit = callback;
      return detach;
    });
    const store = createFriendsAccountStore({ listen });
    const first = jest.fn();
    const second = jest.fn();

    const offFirst = store.subscribe(first);
    const offSecond = store.subscribe(second);
    expect(listen).toHaveBeenCalledTimes(1);

    (emit as unknown as Listener)([{ uid: 'friend-1', createdAt: 1 }], { fromCache: false });
    expect(first).toHaveBeenLastCalledWith([{ uid: 'friend-1', createdAt: 1 }], { fromCache: false });
    expect(second).toHaveBeenLastCalledWith([{ uid: 'friend-1', createdAt: 1 }], { fromCache: false });

    offFirst();
    expect(detach).not.toHaveBeenCalled();
    offSecond();
    expect(detach).toHaveBeenCalledTimes(1);
  });

  // COM-04-OFFLINE (2026-09-30): ошибка подписки не глохнет — экран узнаёт о ней,
  // а «Повторить» заново поднимает слушатель.
  test('non-permission errors reach the screen and retry re-attaches the listener', () => {
    type Listener = (rows: FriendEntry[], meta?: SubscribeFriendsSnapshotMeta) => void;
    let fail: ((error: Error) => void) | null = null;
    const listen = jest.fn((_callback: Listener, onError?: (error: Error) => void) => {
      fail = onError ?? null;
      return jest.fn();
    });
    const store = createFriendsAccountStore({ listen, repairAuthLink: jest.fn(async () => true) });
    const onError = jest.fn();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    store.subscribe(jest.fn(), onError);
    expect(listen).toHaveBeenCalledTimes(1);

    (fail as unknown as (error: Error) => void)(Object.assign(new Error('offline'), { code: 'unavailable' }));
    expect(onError).toHaveBeenCalledTimes(1);

    store.retry();
    expect(listen).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
