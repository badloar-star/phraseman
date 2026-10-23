/**
 * lesson_invite_client — «Урок вместе» (идея 2): формат вызовов согласован с 1 · ЯДРО 22.10.
 * Сторож: до трёх друзей; повтор при сбое сети — тем же requestId; лимит/не друзья — без повтора; числа телефона — только
 * целые в пределах; отправленные приглашения помним на телефоне; отметка «выполнено» (закон владельца 22.10: сервер только
 * хранит, +2 начисляет телефон) — один повтор на сеть, окончательные отказы без повтора, битая запись — без вызова.
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
const mockCalls: Array<{ name: string; payload: Record<string, unknown> }> = [];
const mockResponses: Record<string, Array<() => Promise<unknown>>> = {};
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_fns: unknown, name: string) => (payload: Record<string, unknown>) => {
    mockCalls.push({ name, payload });
    const next = mockResponses[name]?.shift();
    return next ? next() : Promise.reject(new Error('no response'));
  },
}));
const mockSender: { current: { stableId: string; displayName?: string } | null } = { current: { stableId: 'me-1', displayName: 'Алекс' } };
jest.mock('../app/friends_together/sender_identity', () => ({ prepareTogetherSender: () => Promise.resolve(mockSender.current) }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve('me-1') }));

import { markLessonTogether, readSentLessonInvites, sendLessonInvites } from '../app/friends_together/lesson_invite_client';

const ok = (data: unknown) => () => Promise.resolve({ data });
const fail = (code: string) => () => Promise.reject(Object.assign(new Error(code), { code: `functions/${code}` }));
const NOW = Date.now();

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockCalls.length = 0;
  for (const key of Object.keys(mockResponses)) delete mockResponses[key];
  mockSender.current = { stableId: 'me-1', displayName: 'Алекс' };
});

describe('позвать на занятие', () => {
  it('до трёх друзей без повторов; числа — только целые в пределах; приглашения помним', async () => {
    mockResponses.friendsLessonInvite = [ok({ ok: true, inviteIds: { ira: 'inv-ira', oleg: 'inv-oleg' }, expiresAtMs: { ira: NOW + 3_600_000, oleg: NOW + 7_200_000 } })];
    const res = await sendLessonInvites({ friendUids: ['ira', 'oleg', 'ira', 'mark', 'den'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 3, minutes: 6, stars: 2.5 });
    expect(res).toMatchObject({ ok: true, inviteIds: { ira: 'inv-ira', oleg: 'inv-oleg' } });
    expect(mockCalls).toHaveLength(1);
    const payload = mockCalls[0]!.payload;
    expect(payload).toMatchObject({ stableId: 'me-1', senderDisplayName: 'Алекс', friendUids: ['ira', 'oleg', 'mark'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 3, minutes: 6 });
    expect(payload).not.toHaveProperty('stars');
    expect(String(payload.requestId)).toMatch(/^flt_/);
    const sent = await readSentLessonInvites();
    expect(sent.map((v) => v.inviteId)).toEqual(['inv-ira', 'inv-oleg']);
  });

  it('сбой сети — один повтор тем же requestId', async () => {
    mockResponses.friendsLessonInvite = [fail('unavailable'), ok({ ok: true, inviteIds: { ira: 'inv-ira' }, expiresAtMs: { ira: NOW + 1000 } })];
    const res = await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 3 });
    expect(res.ok).toBe(true);
    expect(mockCalls).toHaveLength(2);
    expect(mockCalls[0]!.payload.requestId).toBe(mockCalls[1]!.payload.requestId);
  });

  it('предел или не друзья — без повтора, причина наружу', async () => {
    mockResponses.friendsLessonInvite = [fail('resource-exhausted daily_limit')];
    expect(await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 3 })).toEqual({ ok: false, reason: 'limit' });
    mockResponses.friendsLessonInvite = [fail('failed-precondition not_friends')];
    expect(await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 3 })).toEqual({ ok: false, reason: 'not_friends' });
    expect(mockCalls).toHaveLength(2);
  });

  it('нет личности отправителя или пустой выбор — сервер не зовём', async () => {
    mockSender.current = null;
    expect(await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 3 })).toEqual({ ok: false, reason: 'no_sender' });
    mockSender.current = { stableId: 'me-1' };
    expect((await sendLessonInvites({ friendUids: [], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 3 })).ok).toBe(false);
    expect(mockCalls).toHaveLength(0);
  });

  it('без номеров урока и занятия не зовём — у друга другой язык, открыть «это занятие» не по чему (D188)', async () => {
    expect((await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 0, sessionOrdinal: 3 })).ok).toBe(false);
    expect((await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3', lessonOrdinal: 2, sessionOrdinal: 2.5 })).ok).toBe(false);
    expect(mockCalls).toHaveLength(0);
  });

  it('истёкшие больше полутора суток назад — забываем', async () => {
    mockStorage['friends_lesson_invites_sent_v1::me-1'] = JSON.stringify([
      { inviteId: 'old', friendUid: 'ira', lessonKey: 'k', sentAtMs: NOW - 3 * 86_400_000, expiresAtMs: NOW - 2 * 86_400_000 },
      { inviteId: 'fresh', friendUid: 'oleg', lessonKey: 'k', sentAtMs: NOW - 3_600_000, expiresAtMs: NOW - 60_000 },
      { broken: true },
    ]);
    expect((await readSentLessonInvites(NOW)).map((v) => v.inviteId)).toEqual(['fresh']);
  });
});

describe('отметка «выполнено» (сервер хранит, +2 начисляет телефон)', () => {
  const FID = 'fli_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  it('сервер хранит отметку: день друга и имя пригласившего; повтор — replay', async () => {
    mockResponses.friendsLessonTogetherMark = [ok({ ok: true, replay: false, coins: 2, inviterName: 'Алекс', dayKey: '2026-10-22' })];
    expect(await markLessonTogether({ inviteId: FID, dayKey: '2026-10-22' }, 0)).toEqual({ ok: true, replay: false, inviterName: 'Алекс', dayKey: '2026-10-22' });
    expect(mockCalls[0]).toEqual({ name: 'friendsLessonTogetherMark', payload: { inviteId: FID, dayKey: '2026-10-22' } });
    mockResponses.friendsLessonTogetherMark = [ok({ ok: true, replay: true, inviterName: 'Алекс', dayKey: '2026-10-22' })];
    expect((await markLessonTogether({ inviteId: FID, dayKey: '2026-10-22' }, 0)).ok).toBe(true);
  });

  it('сеть — один повтор, потом тихо (вызывающий повторит при следующем запуске)', async () => {
    mockResponses.friendsLessonTogetherMark = [fail('unavailable'), fail('unavailable')];
    expect(await markLessonTogether({ inviteId: FID, dayKey: '2026-10-22' }, 0)).toEqual({ ok: false, reason: 'network' });
    expect(mockCalls).toHaveLength(2);
  });

  it('не наше приглашение / выключено — без повтора; битая запись — без вызова', async () => {
    mockResponses.friendsLessonTogetherMark = [fail('permission-denied not_invited')];
    expect(await markLessonTogether({ inviteId: FID, dayKey: '2026-10-22' }, 0)).toEqual({ ok: false, reason: 'not_invited' });
    mockResponses.friendsLessonTogetherMark = [fail('failed-precondition disabled')];
    expect(await markLessonTogether({ inviteId: FID, dayKey: '2026-10-22' }, 0)).toEqual({ ok: false, reason: 'disabled' });
    expect(mockCalls).toHaveLength(2);
    expect(await markLessonTogether({ inviteId: 'inv', dayKey: '2026-10-22' }, 0)).toEqual({ ok: false, reason: 'invalid' });
    expect(await markLessonTogether({ inviteId: FID, dayKey: '22.10' }, 0)).toEqual({ ok: false, reason: 'invalid' });
    expect(mockCalls).toHaveLength(2);
  });
});
