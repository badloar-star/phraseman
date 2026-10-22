/**
 * lesson_invite_client — «Урок вместе» (идея 2): формат вызовов согласован с 1 · ЯДРО 22.10.
 * Сторож: до трёх друзей; повтор при сбое сети — тем же requestId; лимит/не друзья — без повтора; числа телефона — только
 * целые в пределах; отправленные приглашения помним на телефоне; claim — один повтор на not_completed, потом тихо.
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

import { claimLessonTogether, readSentLessonInvites, sendLessonInvites } from '../app/friends_together/lesson_invite_client';

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
    const res = await sendLessonInvites({ friendUids: ['ira', 'oleg', 'ira', 'mark', 'den'], lessonKey: 'lv2_en_2_3', minutes: 6, stars: 2.5 });
    expect(res).toMatchObject({ ok: true, inviteIds: { ira: 'inv-ira', oleg: 'inv-oleg' } });
    expect(mockCalls).toHaveLength(1);
    const payload = mockCalls[0]!.payload;
    expect(payload).toMatchObject({ stableId: 'me-1', senderDisplayName: 'Алекс', friendUids: ['ira', 'oleg', 'mark'], lessonKey: 'lv2_en_2_3', minutes: 6 });
    expect(payload).not.toHaveProperty('stars');
    expect(String(payload.requestId)).toMatch(/^flt_/);
    const sent = await readSentLessonInvites();
    expect(sent.map((v) => v.inviteId)).toEqual(['inv-ira', 'inv-oleg']);
  });

  it('сбой сети — один повтор тем же requestId', async () => {
    mockResponses.friendsLessonInvite = [fail('unavailable'), ok({ ok: true, inviteIds: { ira: 'inv-ira' }, expiresAtMs: { ira: NOW + 1000 } })];
    const res = await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3' });
    expect(res.ok).toBe(true);
    expect(mockCalls).toHaveLength(2);
    expect(mockCalls[0]!.payload.requestId).toBe(mockCalls[1]!.payload.requestId);
  });

  it('предел или не друзья — без повтора, причина наружу', async () => {
    mockResponses.friendsLessonInvite = [fail('resource-exhausted daily_limit')];
    expect(await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3' })).toEqual({ ok: false, reason: 'limit' });
    mockResponses.friendsLessonInvite = [fail('failed-precondition not_friends')];
    expect(await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3' })).toEqual({ ok: false, reason: 'not_friends' });
    expect(mockCalls).toHaveLength(2);
  });

  it('нет личности отправителя или пустой выбор — сервер не зовём', async () => {
    mockSender.current = null;
    expect(await sendLessonInvites({ friendUids: ['ira'], lessonKey: 'lv2_en_2_3' })).toEqual({ ok: false, reason: 'no_sender' });
    mockSender.current = { stableId: 'me-1' };
    expect((await sendLessonInvites({ friendUids: [], lessonKey: 'lv2_en_2_3' })).ok).toBe(false);
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

describe('награда «вместе»', () => {
  it('засчитано — монеты и имя пригласившего', async () => {
    mockResponses.friendsLessonTogetherClaim = [ok({ ok: true, coins: 2, inviterName: 'Алекс' })];
    expect(await claimLessonTogether({ inviteId: 'inv', mutationId: 'm1' }, 0)).toEqual({ ok: true, coins: 2, inviterName: 'Алекс' });
    expect(mockCalls[0]!.payload).toEqual({ inviteId: 'inv', mutationId: 'm1' });
  });

  it('засчитывание ещё не дошло до сервера — один повтор, потом тихо', async () => {
    mockResponses.friendsLessonTogetherClaim = [fail('failed-precondition not_completed'), ok({ ok: true, coins: 2, inviterName: 'Алекс' })];
    expect((await claimLessonTogether({ inviteId: 'inv', mutationId: 'm1' }, 0)).ok).toBe(true);
    mockResponses.friendsLessonTogetherClaim = [fail('failed-precondition not_completed'), fail('failed-precondition not_completed')];
    expect(await claimLessonTogether({ inviteId: 'inv', mutationId: 'm1' }, 0)).toEqual({ ok: false, reason: 'not_completed' });
    expect(mockCalls).toHaveLength(4);
  });

  it('истекло / уже забрано / не приглашён — без повтора', async () => {
    for (const reason of ['expired', 'already_claimed', 'not_invited'] as const) {
      mockResponses.friendsLessonTogetherClaim = [fail(`failed-precondition ${reason}`)];
      expect(await claimLessonTogether({ inviteId: 'inv', mutationId: 'm1' }, 0)).toEqual({ ok: false, reason });
    }
    expect(mockCalls).toHaveLength(3);
  });
});
