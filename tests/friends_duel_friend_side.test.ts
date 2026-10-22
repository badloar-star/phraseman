/**
 * «Дуэль на 5 фраз» — сторона друга и итог у вызвавшего (идея 3; формат уведомлений согласован с 1 · ЯДРО 22.10).
 * Сторож: строки вызова и итога разбираются на границе (без полей — не берём); вызов — щит со сроком, итог — маркер без срока;
 * старые duel_invite Арены не трогаем; итог или отказ снимает «дуэль уже идёт»; адреса ответа и итога собираются из строки;
 * «Реванш» живёт 30 секунд; на маркере — «23 ч» / «45 мин».
 */
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; return Promise.resolve(); }),
    __store: store,
  };
});
jest.mock('@react-native-firebase/firestore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: true, CLOUD_SYNC_ENABLED: false }));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => 'auth-user'), ensureStableAuthLink: jest.fn(async () => true) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'me-1') }));

import { parseUserNotificationNav } from '../app/user_notifications';
import {
  duelClosuresFromNotifications,
  friendSocialEventsFromNotifications,
  remainingDuelChallengeMs,
  selectFriendMarker,
} from '../app/friend_social_events';
import { closeSentDuels, duelOpenWithFriend, duelSentToday, readSentDuels, recordSentDuel } from '../app/friends_together/duel_ledger';
import { duelAnswerParams, duelHoursLeft, duelResultParams } from '../app/friends_together/duel_routes';
import { parseDuelLaunch } from '../app/friends_together/duel_launch';
import { requestDuelRematch, takeDuelRematch } from '../app/friends_together/duel_intents';
import { duelTimeLeftShort } from '../app/friends_together/duel_play_copy';

const NOW = 1_800_000_000_000;
const ids = ['en:lesson-01:session-01:i02', 'en:lesson-01:session-01:i03', 'en:lesson-01:session-02:i01', 'en:lesson-01:session-02:i05', 'en:lesson-01:session-03:i04'];
const base = { kind: 'friend_event', actorStableUid: 'ira', eventId: 'e-1' };
const challengeNav = { ...base, action: 'duel_challenge', duelId: 'd-1', expiresAtMs: NOW + 23 * 3_600_000 + 5 * 60_000, phraseIds: ids };
const resultNav = {
  ...base,
  eventId: 'e-2',
  action: 'duel_result',
  duelId: 'd-1',
  outcome: 'win',
  mine: { correct: 4, elapsedMs: 48_000, results: [true, true, false, true, true] },
  theirs: { correct: 3, elapsedMs: 65_000, results: [true, false, true, true, false] },
  phraseIds: ids,
};

describe('строки уведомлений дуэли', () => {
  it('вызов: номер дуэли, срок и пять фраз', () => {
    expect(parseUserNotificationNav(challengeNav)).toEqual({
      kind: 'friend_event', actorStableUid: 'ira', eventId: 'e-1', action: 'duel_challenge',
      duelChallenge: { duelId: 'd-1', expiresAtMs: challengeNav.expiresAtMs, phraseIds: ids },
    });
  });

  it('вызов без срока, без номера или не с пятью разными фразами — не берём', () => {
    expect(parseUserNotificationNav({ ...challengeNav, expiresAtMs: undefined })).toBeNull();
    expect(parseUserNotificationNav({ ...challengeNav, duelId: '' })).toBeNull();
    expect(parseUserNotificationNav({ ...challengeNav, phraseIds: ids.slice(0, 4) })).toBeNull();
    expect(parseUserNotificationNav({ ...challengeNav, phraseIds: [...ids.slice(0, 4), ids[0]] })).toBeNull();
  });

  it('итог: исход, счёт и отметки обоих, фразы; без своих отметок и фраз — тоже берём', () => {
    expect(parseUserNotificationNav(resultNav)).toMatchObject({
      action: 'duel_result',
      duelResult: { duelId: 'd-1', outcome: 'win', mine: resultNav.mine, theirs: resultNav.theirs, phraseIds: ids },
    });
    const bare = parseUserNotificationNav({ ...resultNav, mine: { correct: 4, elapsedMs: 48_000 }, phraseIds: undefined });
    expect(bare).toMatchObject({ duelResult: { mine: { correct: 4, elapsedMs: 48_000, results: null }, phraseIds: null } });
  });

  it('итог без исхода, без счёта или без отметок друга — не берём', () => {
    expect(parseUserNotificationNav({ ...resultNav, outcome: 'maybe' })).toBeNull();
    expect(parseUserNotificationNav({ ...resultNav, mine: { correct: 9, elapsedMs: 1 } })).toBeNull();
    expect(parseUserNotificationNav({ ...resultNav, theirs: { correct: 3, elapsedMs: 1, results: [true] } })).toBeNull();
  });

  it('отказ — только с номером дуэли', () => {
    expect(parseUserNotificationNav({ ...base, action: 'duel_declined', duelId: 'd-1' })).toMatchObject({ action: 'duel_declined', duelId: 'd-1' });
    expect(parseUserNotificationNav({ ...base, action: 'duel_declined' })).toBeNull();
  });
});

describe('маркеры в строке друга', () => {
  const row = (id: string, nav: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
    id, type: 'friend_nudge', fromUid: 'ira', createdAt: NOW - 1000, nav: parseUserNotificationNav(nav), ...extra,
  });

  it('вызов — щит со сроком сервера; итог — без срока; вызов важнее итога', () => {
    const events = friendSocialEventsFromNotifications([row('n-1', challengeNav), row('n-2', resultNav)]);
    const challenge = events.find((e) => e.kind === 'duel_challenge');
    expect(challenge).toMatchObject({ expiresAtMs: challengeNav.expiresAtMs, duel: { duelId: 'd-1', phraseIds: ids }, notificationId: 'n-1' });
    expect(events.find((e) => e.kind === 'duel_result')?.expiresAtMs).toBeUndefined();
    expect(selectFriendMarker(events, NOW)?.kind).toBe('duel_challenge');
    expect(selectFriendMarker(events, challengeNav.expiresAtMs + 1)?.kind).toBe('duel_result');
  });

  it('прочитанные строки маркеров не дают, отказ — не маркер', () => {
    expect(friendSocialEventsFromNotifications([row('n-1', challengeNav, { read: true })])).toEqual([]);
    expect(friendSocialEventsFromNotifications([row('n-3', { ...base, action: 'duel_declined', duelId: 'd-1' })])).toEqual([]);
  });

  it('на маркере — часы, потом минуты', () => {
    const [event] = friendSocialEventsFromNotifications([row('n-1', challengeNav)]);
    expect(duelTimeLeftShort('ru', remainingDuelChallengeMs(event!, NOW))).toBe('23 ч');
    expect(duelTimeLeftShort('ru', 45 * 60_000 + 30_000)).toBe('45 мин');
    expect(duelTimeLeftShort('en', 20_000)).toBe('1 min');
    expect(duelHoursLeft(challengeNav.expiresAtMs, NOW)).toBe(23);
    expect(duelHoursLeft(NOW + 10 * 60_000, NOW)).toBe(1);
    expect(duelHoursLeft(NOW - 1, NOW)).toBe(0);
  });
});

describe('итог и отказ снимают «дуэль уже идёт»', () => {
  it('закрываем вызовы, отправленные до строки; счёт за день не меняется', async () => {
    await recordSentDuel('ira', NOW - 10_000, '2026-10-22');
    await recordSentDuel('mark', NOW - 5_000, '2026-10-22');
    const closures = duelClosuresFromNotifications([
      { id: 'n-2', type: 'friend_nudge', fromUid: 'ira', createdAt: NOW - 1_000, read: true, nav: { ...base, action: 'duel_result' } },
      { id: 'n-9', type: 'friend_nudge', fromUid: 'x', createdAt: NOW, nav: { ...base, actorStableUid: 'x', action: 'high_five' } },
    ]);
    expect(closures).toEqual([{ friendUid: 'ira', atMs: NOW - 1_000 }]);
    await closeSentDuels(closures);
    const list = await readSentDuels(NOW);
    expect(duelOpenWithFriend(list, 'ira', NOW)).toBe(false);
    expect(duelOpenWithFriend(list, 'mark', NOW)).toBe(true);
    expect(duelSentToday(list, '2026-10-22')).toBe(2);
  });
});

describe('адреса экрана из строки', () => {
  const friend = { uid: 'ira', name: 'Ирина', coinRank: 9, isPlus: true };

  it('ответ на вызов — те же фразы и строка, которую погасить после хода', () => {
    const parsed = parseDuelLaunch(duelAnswerParams(friend, { duelId: 'd-1', phraseIds: ids }, 'Алекс', 'n-1'), 'Я');
    expect(parsed).toMatchObject({ ok: true, launch: { mode: 'answer', duelId: 'd-1', phraseIds: ids, notificationId: 'n-1', friendCoinRank: 9 } });
  });

  it('итог — всё из строки «Итог дуэли»', () => {
    const info = parseUserNotificationNav(resultNav);
    const result = info && info.kind === 'friend_event' ? info.duelResult : undefined;
    expect(result).toBeDefined();
    const parsed = parseDuelLaunch(duelResultParams(friend, result!, ''), 'Я');
    expect(parsed).toMatchObject({ ok: true, launch: { mode: 'result', myName: 'Я', result: { outcome: 'win', mine: resultNav.mine, theirs: resultNav.theirs } } });
  });
});

describe('«Реванш»', () => {
  it('забираем один раз и только в течение 30 секунд', () => {
    requestDuelRematch('ira', NOW);
    expect(takeDuelRematch(NOW + 1_000)).toBe('ira');
    expect(takeDuelRematch(NOW + 2_000)).toBeNull();
    requestDuelRematch('mark', NOW);
    expect(takeDuelRematch(NOW + 31_000)).toBeNull();
  });
});
