/**
 * lesson_together_claim — «Урок вместе» (идея 2) у друга: принятое приглашение → занятие засчитано → награда «вместе».
 * Сторож: подходит приглашение того же занятия (id занятия по номерам урока и занятия) и не истёкшее к моменту засчитывания;
 * принятые приглашения помним на телефоне своего аккаунта, не больше 10, истёкшие забываем.
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve('me-1') }));
jest.mock('../app/events', () => ({ onAppEvent: jest.fn(() => ({ remove: jest.fn() })), emitAppEvent: jest.fn() }));
jest.mock('../app/friends_together/lesson_invite_client', () => ({ claimLessonTogether: jest.fn() }));
jest.mock('../app/friends_together/together_config', () => ({ FRIENDS_TOGETHER_UI_ENABLED: false }));

import { matchAcceptedLessonInvite, readAcceptedLessonInvites, rememberAcceptedLessonInvite, type AcceptedLessonInvite } from '../app/friends_together/lesson_together_claim';

const NOW = 1_800_000_000_000;
const sessionIdOf = (lesson: number, session: number) => `lv2:l${lesson}:s${session}`;
const invite = (inviteId: string, lessonOrdinal: number, sessionOrdinal: number, expiresAtMs: number): AcceptedLessonInvite => ({
  inviteId, lessonOrdinal, sessionOrdinal, expiresAtMs, inviterName: 'Алекс', acceptedAtMs: NOW - 1000,
});

beforeEach(() => { for (const key of Object.keys(mockStorage)) delete mockStorage[key]; });

describe('какое приглашение подходит засчитанному занятию', () => {
  it('то же занятие и не истекло', () => {
    const list = [invite('a', 2, 3, NOW + 60_000), invite('b', 2, 4, NOW + 60_000)];
    expect(matchAcceptedLessonInvite(list, 'lv2:l2:s4', NOW, sessionIdOf)?.inviteId).toBe('b');
  });

  it('засчитано после полуночи друга — не подходит', () => {
    expect(matchAcceptedLessonInvite([invite('a', 2, 3, NOW - 1)], 'lv2:l2:s3', NOW, sessionIdOf)).toBeNull();
  });

  it('другое занятие — не подходит', () => {
    expect(matchAcceptedLessonInvite([invite('a', 2, 3, NOW + 60_000)], 'lv2:l5:s1', NOW, sessionIdOf)).toBeNull();
  });

  it('номера, по которым id не строится, — пропускаем, не падаем', () => {
    const throwing = (l: number) => { if (l === 9) throw new Error('bad'); return `lv2:l${l}`; };
    expect(matchAcceptedLessonInvite([invite('x', 9, 1, NOW + 1), invite('y', 1, 1, NOW + 1)], 'lv2:l1', NOW, throwing)?.inviteId).toBe('y');
  });
});

describe('принятые приглашения на телефоне', () => {
  it('помним своего аккаунта; повтор того же приглашения не дублируется', async () => {
    await rememberAcceptedLessonInvite(invite('a', 2, 3, NOW + 60_000), NOW);
    await rememberAcceptedLessonInvite(invite('a', 2, 3, NOW + 60_000), NOW);
    expect((await readAcceptedLessonInvites(NOW)).map((v) => v.inviteId)).toEqual(['a']);
  });

  it('истёкшие забываем, храним не больше 10 свежих', async () => {
    for (let i = 0; i < 12; i += 1) await rememberAcceptedLessonInvite(invite(`i${i}`, 1, i + 1, NOW + 60_000), NOW);
    await rememberAcceptedLessonInvite(invite('old', 1, 1, NOW - 1), NOW);
    const ids = (await readAcceptedLessonInvites(NOW)).map((v) => v.inviteId);
    expect(ids).toHaveLength(10);
    expect(ids).not.toContain('old');
    expect(ids).toContain('i11');
  });
});
