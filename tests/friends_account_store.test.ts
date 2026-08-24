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

  test('gift inbox projection is cached until a consumer takes it', () => {
    const store = createFriendsAccountStore({ listen: () => () => {} });
    const gift = { giftId: 'shield', fromUid: 'friend-1' } as any;

    store.publishIncomingGifts([gift]);

    expect(store.takeIncomingGifts()).toEqual([gift]);
    expect(store.takeIncomingGifts()).toEqual([]);
  });
});
