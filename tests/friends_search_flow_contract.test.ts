import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'friends.tsx'), 'utf8');
const friendRequestsSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'firestore_friend_requests.ts'), 'utf8');

test('Friends search uses the code-to-nickname resolver and renders callable profile without legacy reads', () => {
  expect(source).toContain("import { resolveFriendSearch } from '../friend_search_resolver'");
  expect(source).toContain('const resolution = await resolveFriendSearch(query, myCode);');
  expect(source).toContain('const lookupProfile = friendProfileFromLookup(result.uid, result.profile);');
  expect(source).toContain('const fetched = lookupProfile ? null : await fetchFriendProfileFromFirestore(result.uid);');
  expect(source.indexOf('const lookupProfile = friendProfileFromLookup(result.uid, result.profile);')).toBeLessThan(
    source.indexOf('const fetched = lookupProfile ? null : await fetchFriendProfileFromFirestore(result.uid);'),
  );
});

test('Friends profile warming stops issuing reads after the tab becomes hidden', () => {
  expect(source).toContain('shouldAbort: () => boolean');
  expect(source).toMatch(/mapWithConcurrency\(\s*toFetch,\s*3,/);
  expect(source).toContain('if (shouldStop?.()) return;');
  expect(source).toMatch(/fetchFriendProfileFromFirestore\(\s*uid: string,\s*shouldAbort\?: \(\) => boolean,/);
  expect(source).toContain('(uid) => fetchFriendProfileFromFirestore(uid, shouldAbort)');
  expect(source.match(/if \(shouldAbort\?\.\(\)\) return profile;/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  expect(source).toContain('fetchActiveLeagueCrowns(fetchedProfiles.map((p) => p.uid), { shouldAbort })');
  expect(source).toContain('() => cancelled');
  expect(source).toContain('const profileWarmTask = InteractionManager.runAfterInteractions');
  expect(source).toContain('profileWarmTask.cancel();');
});

test('Best-effort stale-friend cleanup is cancelled on blur and rate-limited per account', () => {
  expect(source).toContain('cleanupStaleFriendData(() => cancelled)');
  expect(friendRequestsSource).toContain('FRIEND_CLEANUP_TTL_MS = 6 * 60 * 60_000');
  expect(friendRequestsSource).toContain('if (shouldAbort?.()) return;');
  expect(friendRequestsSource).toMatch(/collection\('friend_requests'\)[\s\S]*?where\('status', '==', 'accepted'\)[\s\S]*?limit\(50\)/);
  expect(friendRequestsSource).toContain('const friendCleanupCursorByUid = new Map<string, unknown>();');
  expect(friendRequestsSource).toContain('friendsRef.startAfter(previousCursor).limit(20)');
  expect(friendRequestsSource).toContain('rememberFriendCleanupCursor(');
});
