import {
  acknowledgeMarker,
  dedupeFriendEvents,
  friendSocialEventsFromNotifications,
  remainingDuelSeconds,
  nextFriendMarkerExpiryMs,
  selectFriendMarker,
  type FriendSocialEvent,
} from '../app/friend_social_events';

const now = 1_000_000;
const highFive: FriendSocialEvent = {
  id: 'high-five-1',
  actorStableUid: 'friend-1',
  kind: 'high_five',
  createdAtMs: now - 3_000,
};
const study: FriendSocialEvent = {
  id: 'study-1',
  actorStableUid: 'friend-1',
  kind: 'study_invite',
  createdAtMs: now - 2_000,
};
const duel: FriendSocialEvent = {
  id: 'duel-1',
  actorStableUid: 'friend-1',
  kind: 'duel_invite',
  createdAtMs: now - 1_000,
  expiresAtMs: now + 10_000,
};

describe('friend social event markers', () => {
  it('derives card markers from the same durable bell rows', () => {
    const rows = [{ id: 'n1', type: 'friend_nudge', fromUid: 'alice', createdAt: 100, nav: { kind: 'friend_event', actorStableUid: 'alice', eventId: 'e1', action: 'study_invite' } }];
    expect(friendSocialEventsFromNotifications(rows)).toEqual([{ id: 'e1', actorStableUid: 'alice', kind: 'study_invite', createdAtMs: 100, notificationId: 'n1' }]);
  });

  it('does not recreate a card marker from an already-read bell row', () => {
    const rows = [{ id: 'n1', type: 'friend_nudge', fromUid: 'alice', createdAt: 100, read: true, nav: { kind: 'friend_event', actorStableUid: 'alice', eventId: 'e1', action: 'high_five' } }];
    expect(friendSocialEventsFromNotifications(rows)).toEqual([]);
  });
  it('selects active duel, then study invite, then high-five', () => {
    expect(selectFriendMarker([highFive, study, duel], now)?.kind).toBe('duel_invite');
    expect(selectFriendMarker([highFive, study], now)?.kind).toBe('study_invite');
    expect(selectFriendMarker([highFive], now)?.kind).toBe('high_five');
  });

  it('keeps bell history independent when one card marker is acknowledged', () => {
    expect(acknowledgeMarker([highFive, study], study.id)).toEqual([highFive]);
  });

  it('deduplicates replayed event ids using the newest payload', () => {
    expect(dedupeFriendEvents([
      duel,
      { ...duel, createdAtMs: now, expiresAtMs: now + 20_000 },
    ])).toEqual([{ ...duel, createdAtMs: now, expiresAtMs: now + 20_000 }]);
  });

  it('ignores expired duels and clamps their countdown to zero', () => {
    const expired = { ...duel, expiresAtMs: now - 1 };
    expect(selectFriendMarker([expired, highFive], now)?.kind).toBe('high_five');
    expect(remainingDuelSeconds(expired, now)).toBe(0);
    expect(remainingDuelSeconds(duel, now)).toBe(10);
  });

  it('schedules the nearest active duel expiry only', () => {
    expect(nextFriendMarkerExpiryMs([highFive, duel, { ...duel, id: 'later', expiresAtMs: now + 20_000 }], now)).toBe(now + 10_000);
    expect(nextFriendMarkerExpiryMs([{ ...duel, expiresAtMs: now }], now)).toBeNull();
  });
});
