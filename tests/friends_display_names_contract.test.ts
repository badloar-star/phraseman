import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('friends display names contract', () => {
  const friendsTabSource = readFileSync(join(ROOT, 'app', '(tabs)', 'friends.tsx'), 'utf8');

  it('does not use an ellipsis as a visible fallback friend name', () => {
    expect(friendsTabSource).toContain('function placeholderFriendProfile(uid: string, fallbackName?: string)');
    expect(friendsTabSource).toContain("name: sanitizedName || 'Phraseman'");
    expect(friendsTabSource).not.toContain("name: '…'");
  });

  it('shows incoming request names from the request payload before profile hydration', () => {
    expect(friendsTabSource).toContain('profileWithLookupDisplayName(req.fromUid, profiles[req.fromUid] ?? null, req.fromName)');
  });

  it('keeps name-index search results visible even when the public profile is not hydrated yet', () => {
    expect(friendsTabSource).toContain('const displayProfile = profileWithLookupDisplayName(result.uid, merged, result.name || result.profile?.name)');
    expect(friendsTabSource).toContain('setFoundUser(displayProfile)');
  });

  it('uses friendship/request display names as an immediate local search source', () => {
    expect(friendsTabSource).toContain('function findLocalFriendProfileByName');
    expect(friendsTabSource).toContain('const localProfile = findLocalFriendProfileByName(query, profiles, friends, requests)');
    expect(friendsTabSource).toContain("source: 'local_cache'");
  });

  it('preserves accepted friend display names in the friends list before profile hydration', () => {
    const requestsSource = readFileSync(join(ROOT, 'app', 'firestore_friend_requests.ts'), 'utf8');

    expect(requestsSource).toContain('displayName?: string');
    expect(requestsSource).toContain('displayName: cleanFriendRequestDisplayName(doc.data().displayName) || undefined');
    expect(friendsTabSource).toContain('profileWithLookupDisplayName(fr.uid, profiles[fr.uid] ?? null, fr.displayName)');
  });
});
