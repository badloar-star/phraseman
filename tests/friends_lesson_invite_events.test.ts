/**
 * «Урок вместе» (идея 2) у друга: уведомление-приглашение → маркер «книга» на строке друга → окно приглашения.
 * Формат nav согласован с 1 · ЯДРО 22.10: action 'lesson_invite', inviteId, lessonOrdinal, sessionOrdinal (друзья учат разные
 * языки — «это занятие» = те же номера в своём курсе), lessonKey (для журнала), expiresAtMs (полночь друга), minutes?, stars?.
 * Сторож: без номеров урока и занятия приглашение бесполезно — строку не берём; числа телефона — только целые в пределах;
 * истёкшее приглашение маркер не показывает.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => 'auth-user'), ensureStableAuthLink: jest.fn(async () => true) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'me-1') }));
jest.mock('@react-native-firebase/firestore', () => ({ __esModule: true, default: jest.fn(() => ({})) }));

import { parseUserNotificationNav } from '../app/user_notifications';
import { friendSocialEventsFromNotifications, selectFriendMarker } from '../app/friend_social_events';

const NOW = 1_800_000_000_000;
const nav = (extra: Record<string, unknown> = {}) => ({
  kind: 'friend_event', actorStableUid: 'alex', eventId: 'e1', action: 'lesson_invite', inviteId: 'inv-1',
  lessonOrdinal: 2, sessionOrdinal: 3, lessonKey: 'en_l2_s3', expiresAtMs: NOW + 3_600_000, minutes: 6, stars: 3, ...extra,
});

describe('разбор уведомления-приглашения на занятие', () => {
  it('сохраняет номера урока и занятия, срок и факты отправителя', () => {
    expect(parseUserNotificationNav(nav())).toEqual({
      kind: 'friend_event', actorStableUid: 'alex', eventId: 'e1', action: 'lesson_invite', inviteId: 'inv-1',
      lesson: { lessonOrdinal: 2, sessionOrdinal: 3, lessonKey: 'en_l2_s3', expiresAtMs: NOW + 3_600_000, minutes: 6, stars: 3 },
    });
  });

  it('без номеров урока или занятия — строку не берём', () => {
    expect(parseUserNotificationNav(nav({ lessonOrdinal: undefined }))).toBeNull();
    expect(parseUserNotificationNav(nav({ sessionOrdinal: 0 }))).toBeNull();
    expect(parseUserNotificationNav(nav({ lessonOrdinal: 'x' }))).toBeNull();
  });

  it('числа отправителя — только целые в пределах, иначе поле не кладём', () => {
    const parsed = parseUserNotificationNav(nav({ minutes: 500, stars: 2.5 }));
    expect(parsed).toMatchObject({ lesson: { lessonOrdinal: 2, sessionOrdinal: 3 } });
    expect((parsed as { lesson: Record<string, unknown> }).lesson).not.toHaveProperty('minutes');
    expect((parsed as { lesson: Record<string, unknown> }).lesson).not.toHaveProperty('stars');
  });

  it('прежние действия друзей разбираются как раньше', () => {
    expect(parseUserNotificationNav({ kind: 'friend_event', actorStableUid: 'alex', eventId: 'e2', action: 'study_invite' }))
      .toEqual({ kind: 'friend_event', actorStableUid: 'alex', eventId: 'e2', action: 'study_invite' });
  });
});

describe('маркер приглашения на строке друга', () => {
  const row = (lesson: Record<string, unknown>) => ({ id: 'n1', type: 'friend_lesson_invite', fromUid: 'alex', createdAt: NOW - 1000, nav: { kind: 'friend_event', actorStableUid: 'alex', eventId: 'e1', action: 'lesson_invite', inviteId: 'inv-1', lesson } });

  it('приглашение → маркер lesson_invite с занятием и сроком', () => {
    const [event] = friendSocialEventsFromNotifications([row({ lessonOrdinal: 2, sessionOrdinal: 3, expiresAtMs: NOW + 60_000, minutes: 6 })]);
    expect(event).toMatchObject({ id: 'e1', kind: 'lesson_invite', inviteId: 'inv-1', expiresAtMs: NOW + 60_000, lesson: { lessonOrdinal: 2, sessionOrdinal: 3, minutes: 6 } });
  });

  it('после полуночи друга маркера нет', () => {
    const events = friendSocialEventsFromNotifications([row({ lessonOrdinal: 2, sessionOrdinal: 3, expiresAtMs: NOW - 1 })]);
    expect(selectFriendMarker(events, NOW)).toBeNull();
  });

  it('без номеров занятия маркер не создаём', () => {
    expect(friendSocialEventsFromNotifications([row({ expiresAtMs: NOW + 60_000 })])).toEqual([]);
  });
});
