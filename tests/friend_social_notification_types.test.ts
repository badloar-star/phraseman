jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'auth-user'),
  ensureStableAuthLink: jest.fn(async () => true),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'stable-user') }));

import {
  VISIBLE_USER_NOTIFICATION_TYPES,
  parseUserNotificationNav,
} from '../app/user_notifications';

describe('friend social notification contract', () => {
  it.each([
    'friend_nudge',
    'arena_friend_invite',
    'arena_friend_accepted',
    'arena_friend_declined',
    'arena_friend_cancelled',
    'arena_friend_expired',
  ] as const)('shows %s in the notification center', (type) => {
    expect(VISIBLE_USER_NOTIFICATION_TYPES.has(type)).toBe(true);
  });

  it('parses a validated friend-event navigation payload', () => {
    expect(parseUserNotificationNav({
      kind: 'friend_event',
      actorStableUid: 'friend-1',
      eventId: 'event-1',
      action: 'duel_invite',
      inviteId: 'invite-1',
    })).toEqual({
      kind: 'friend_event',
      actorStableUid: 'friend-1',
      eventId: 'event-1',
      action: 'duel_invite',
      inviteId: 'invite-1',
    });
  });

  it('fails closed for incomplete or unknown friend-event navigation', () => {
    expect(parseUserNotificationNav({
      kind: 'friend_event',
      actorStableUid: 'friend-1',
      action: 'study_invite',
    })).toBeNull();
    expect(parseUserNotificationNav({
      kind: 'friend_event',
      actorStableUid: 'friend-1',
      eventId: 'event-1',
      action: 'unknown',
    })).toBeNull();
  });
});
