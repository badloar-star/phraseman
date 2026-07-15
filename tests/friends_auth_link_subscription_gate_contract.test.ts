import fs from 'fs';
import path from 'path';

const readFriendsTab = () => fs.readFileSync(
  path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'),
  'utf8',
);

test('Friends tab prepares its live-subscription auth link once and gates both listeners', () => {
  const source = readFriendsTab();
  const calls = source.match(/ensureFriendRequestViewerAuthLink\s*\(/g) ?? [];
  const cachedFriendsIndex = source.indexOf('setFriends(w.friends)');
  const authLinkIndex = source.indexOf('const authLinkReady = await ensureFriendRequestViewerAuthLink(uid);');
  const friendsSubscriptionIndex = source.indexOf('unsubFriends = subscribeToFriends');
  const requestsSubscriptionIndex = source.indexOf('unsubRequests = subscribeToIncomingRequests');

  expect(calls).toHaveLength(1);
  expect(cachedFriendsIndex).toBeGreaterThan(-1);
  expect(authLinkIndex).toBeGreaterThan(cachedFriendsIndex);
  expect(friendsSubscriptionIndex).toBeGreaterThan(authLinkIndex);
  expect(requestsSubscriptionIndex).toBeGreaterThan(authLinkIndex);
  expect(source.slice(authLinkIndex, friendsSubscriptionIndex)).toContain(
    'if (!authLinkReady || cancelled) return;',
  );
});
