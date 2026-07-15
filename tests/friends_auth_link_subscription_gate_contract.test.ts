import fs from 'fs';
import path from 'path';

const readFriendsTab = () => fs.readFileSync(
  path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'),
  'utf8',
);

test('Friends tab retries transient listener preflight failures with bounded backoff and lifecycle signals', () => {
  const source = readFriendsTab();

  expect(source).toContain("import { subscribeNetStatus } from '../net_status'");
  expect(source).toContain('subscribeAccountGeneration');
  expect(source).toContain('auth().onAuthStateChanged');
  expect(source).toContain('let attachInProgress = false;');
  expect(source).toContain('let pendingRetrySignal = false;');
  expect(source).toContain('const FRIENDS_LISTENER_RETRY_DELAYS_MS = [1500, 4000, 10_000] as const;');
  expect(source).toContain('let retryTimer: ReturnType<typeof setTimeout> | null = null;');
  expect(source).toContain('let retryAttempt = 0;');
  expect(source).toContain('const scheduleRetry = () => {');
  expect(source).toContain('FRIENDS_LISTENER_RETRY_DELAYS_MS[Math.min(retryAttempt, FRIENDS_LISTENER_RETRY_DELAYS_MS.length - 1)]');
  expect(source).toContain('retryTimer = setTimeout(() => {');
  expect(source).toContain('if (attachInProgress) {');
  expect(source).toContain('pendingRetrySignal = true;');
  expect(source).toContain('if (online) requestAttach();');
  expect(source).toContain('requestAttach(true);');
  expect(source).not.toContain('if (online && retryEligible) void attach();');
  expect(source).toContain('unsubFriends();');
  expect(source).toContain('unsubRequests();');
  expect(source).toContain('if (retryTimer) clearTimeout(retryTimer);');
  expect(source).toContain('friendsTabVisible, focusTick, accountToken.generation');
  expect(source).not.toContain('const authLinkReady = await ensureFriendRequestViewerAuthLink(uid);');
  expect(source).not.toMatch(/setInterval\s*\(/);
});
