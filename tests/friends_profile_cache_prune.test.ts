import { pruneFriendsProfileCache } from '../app/friends_tab_swr_warm';

function entry(uid: string, fetchedAt: number) {
  return {
    profile: {
      uid,
      name: uid,
      totalXp: 0,
      weeklyXp: 0,
      streak: 0,
      isPremium: false,
      avatar: 'avatar',
      frame: 'frame',
    },
    fetchedAt,
  };
}

describe('friends profile cache pruning', () => {
  it('drops expired profile entries but keeps explicitly retained uids', () => {
    const now = 100 * 24 * 60 * 60 * 1000;
    const old = now - 45 * 24 * 60 * 60 * 1000;
    const fresh = now - 2 * 24 * 60 * 60 * 1000;

    const pruned = pruneFriendsProfileCache({
      old_visible: entry('old_visible', old),
      old_hidden: entry('old_hidden', old),
      fresh_friend: entry('fresh_friend', fresh),
    }, now, ['old_visible']);

    expect(Object.keys(pruned).sort()).toEqual(['fresh_friend', 'old_visible']);
  });

  it('caps stale social history while keeping newest profiles', () => {
    const now = 200 * 24 * 60 * 60 * 1000;
    const cache = Object.fromEntries(
      Array.from({ length: 260 }, (_, index) => {
        const uid = `friend_${String(index).padStart(3, '0')}`;
        return [uid, entry(uid, now - index)];
      }),
    );

    const pruned = pruneFriendsProfileCache(cache, now);

    expect(Object.keys(pruned)).toHaveLength(240);
    expect(pruned.friend_000).toBeTruthy();
    expect(pruned.friend_239).toBeTruthy();
    expect(pruned.friend_240).toBeUndefined();
  });
});
