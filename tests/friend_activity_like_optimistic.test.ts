import {
  bumpActivityLikeCount,
  normalizeActivityLikeCount,
  rollbackActivityLikeCount,
  setActivityLikeCount,
} from '../app/friend_activity_like_optimistic';
import type { FriendEvent } from '../app/firestore_friend_activity';

const baseEvents: FriendEvent[] = [
  {
    id: 'level_up_3',
    uid: 'friend-a',
    type: 'level_up',
    ts: 1_700_000_000_000,
    activityLikeCount: 2,
    payload: { level: 3 },
  },
  {
    id: 'streak_5',
    uid: 'friend-b',
    type: 'streak_milestone',
    ts: 1_700_000_000_001,
    activityLikeCount: 0,
    payload: { streak: 5 },
  },
];

describe('friend activity optimistic likes', () => {
  it('normalizes invalid like counts to zero', () => {
    expect(normalizeActivityLikeCount(undefined)).toBe(0);
    expect(normalizeActivityLikeCount(-4)).toBe(0);
    expect(normalizeActivityLikeCount('3.9')).toBe(3);
  });

  it('bumps only the tapped event immediately', () => {
    const next = bumpActivityLikeCount(baseEvents, 'friend-a', 'level_up_3');

    expect(next[0]).toMatchObject({ uid: 'friend-a', id: 'level_up_3', activityLikeCount: 3 });
    expect(next[1]).toBe(baseEvents[1]);
  });

  it('reconciles the tapped event with the server count', () => {
    const next = setActivityLikeCount(baseEvents, 'friend-a', 'level_up_3', 9);

    expect(next[0]).toMatchObject({ activityLikeCount: 9 });
    expect(next[1]).toBe(baseEvents[1]);
  });

  it('rolls back an optimistic bump without going below zero', () => {
    const bumped = bumpActivityLikeCount(baseEvents, 'friend-b', 'streak_5');
    const rolledBack = rollbackActivityLikeCount(bumped, 'friend-b', 'streak_5');

    expect(rolledBack[1]).toMatchObject({ activityLikeCount: 0 });
    expect(rollbackActivityLikeCount(baseEvents, 'friend-b', 'streak_5')[1]).toMatchObject({ activityLikeCount: 0 });
  });
});
