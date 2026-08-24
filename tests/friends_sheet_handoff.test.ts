import {
  createFriendSheetSession,
  completeFriendSheetSession,
  hideFriendSheetSession,
  isCurrentFriendSheetMember,
  queueFirstFriendSheetAction,
  resolveFriendSheetProfile,
} from '../components/friends_together/friend_sheet_session';

type Profile = { uid: string; name: string };

describe('friend sheet handoff session', () => {
  const placeholder: Profile = { uid: 'friend-1', name: 'Unknown friend' };

  it('opens from the exact visible placeholder and upgrades to the live profile after hydration', () => {
    const session = createFriendSheetSession(placeholder);

    expect(resolveFriendSheetProfile(session, [])).toEqual(placeholder);
    expect(resolveFriendSheetProfile(session, [{ uid: 'friend-1', name: 'Ada' }])).toEqual({ uid: 'friend-1', name: 'Ada' });
  });

  it('uses current friend membership rather than a cached profile to retain the session', () => {
    expect(isCurrentFriendSheetMember('friend-1', [], [])).toBe(false);
    expect(isCurrentFriendSheetMember('friend-1', [{ uid: 'friend-1' }], [])).toBe(true);
    expect(isCurrentFriendSheetMember('dev-1', [], [{ uid: 'dev-1' }])).toBe(true);
  });

  it('keeps the first queued native handoff action during repeated taps', () => {
    const gift = { kind: 'gift' as const, profile: placeholder };
    const duel = { kind: 'duel' as const, profile: placeholder };

    expect(queueFirstFriendSheetAction(null, gift)).toEqual(gift);
    expect(queueFirstFriendSheetAction(gift, duel)).toEqual(gift);
  });

  it('hides only the visible matching session and preserves referential identity otherwise', () => {
    const session = createFriendSheetSession(placeholder);
    const hidden = hideFriendSheetSession(session, 'friend-1');
    expect(hidden).toEqual({ ...session, visible: false });
    expect(hideFriendSheetSession(null, 'friend-1')).toBeNull();
    expect(hideFriendSheetSession(session, 'other')).toBe(session);
    expect(hideFriendSheetSession(hidden, 'friend-1')).toBe(hidden);
  });

  it('completes only the matching hidden session so stale dismissals cannot clear a reopened one', () => {
    const hidden = hideFriendSheetSession(createFriendSheetSession(placeholder), 'friend-1');
    expect(completeFriendSheetSession(hidden, 'friend-1')).toBeNull();
    const reopened = createFriendSheetSession(placeholder);
    expect(completeFriendSheetSession(reopened, 'friend-1')).toBe(reopened);
    expect(completeFriendSheetSession(hidden, 'other')).toBe(hidden);
  });
});
