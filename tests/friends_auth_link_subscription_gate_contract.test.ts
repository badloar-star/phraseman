import fs from 'fs';
import path from 'path';

const read = (...parts: string[]) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

test('Friends tab delegates its live friends listener and auth repair to the shared store', () => {
  const source = read('app', '(tabs)', 'friends.tsx');
  const store = read('app', 'friends_account_store.ts');
  const cachedFriendsIndex = source.indexOf('setFriends(w.friends)');
  const friendsSubscriptionIndex = source.indexOf('unsubFriends = friendsAccountStore.subscribe');
  const requestsSubscriptionIndex = source.indexOf('unsubRequests = subscribeToIncomingRequests');

  expect(cachedFriendsIndex).toBeGreaterThan(-1);
  expect(friendsSubscriptionIndex).toBeGreaterThan(cachedFriendsIndex);
  expect(requestsSubscriptionIndex).toBeGreaterThan(friendsSubscriptionIndex);
  expect(source).not.toContain('ensureFriendRequestViewerAuthLink(');
  expect(source).not.toContain('subscribeToFriends(');
  expect(store).toContain('repairAuthLink: () => ensureFriendRequestViewerAuthLink()');
});
