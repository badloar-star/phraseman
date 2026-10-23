/**
 * lesson_together_claim — «Урок вместе» (идея 2): принятое приглашение → занятие засчитано → +2 «вместе» начисляет телефон.
 * Сторож: подходит приглашение того же занятия (id занятия по номерам урока и занятия) и не истёкшее к моменту засчитывания;
 * принятые приглашения помним на телефоне своего аккаунта, не больше 10, истёкшие забываем.
 * Закон владельца 22.10 «сервер для сохранения, а не решений»: +2 ставится в очередь кошелька телефона сразу (ключ
 * lessontogether_, один на A→B и B→A), сервер получает только отметку «выполнено»; у пригласившего +2 — по уведомлению, один раз.
 */
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
}));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => Promise.resolve('me-1') }));
jest.mock('../app/events', () => ({ onAppEvent: jest.fn(() => ({ remove: jest.fn() })), emitAppEvent: jest.fn() }));
jest.mock('../app/friends_together/lesson_invite_client', () => ({ markLessonTogether: jest.fn() }));
jest.mock('../app/friends_together/together_config', () => ({ FRIENDS_TOGETHER_UI_ENABLED: true }));
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => ({ phase: 'active', stableId: 'me-1' }) }));
jest.mock('../app/level_spin_star_grants', () => ({
  enqueueLevelSpinStarGrant: jest.fn(() => Promise.resolve()),
  syncPendingLevelSpinStarGrants: jest.fn(() => Promise.resolve({ synced: 1, pending: 0 })),
}));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: (_alg: string, input: string) => Promise.resolve(require('crypto').createHash('sha256').update(input).digest('hex')),
}));
jest.mock('../modules/learning-v2/content/course_topology_v1', () => ({ learningV2CourseSessionIdV1: (l: number, s: number) => `lv2:l${l}:s${s}` }));

import { emitAppEvent, onAppEvent } from '../app/events';
import { markLessonTogether } from '../app/friends_together/lesson_invite_client';
import { enqueueLevelSpinStarGrant } from '../app/level_spin_star_grants';
import {
  creditLessonTogetherForInviter,
  lessonTogetherRequestId,
  matchAcceptedLessonInvite,
  readAcceptedLessonInvites,
  rememberAcceptedLessonInvite,
  startLessonTogetherClaimer,
  type AcceptedLessonInvite,
} from '../app/friends_together/lesson_together_claim';
import type { UserNotification } from '../app/user_notifications';

const NOW = 1_800_000_000_000;
const sessionIdOf = (lesson: number, session: number) => `lv2:l${lesson}:s${session}`;
const invite = (inviteId: string, lessonOrdinal: number, sessionOrdinal: number, expiresAtMs: number): AcceptedLessonInvite => ({
  inviteId, inviterUid: 'alex-9', lessonOrdinal, sessionOrdinal, expiresAtMs, inviterName: 'Алекс', acceptedAtMs: NOW - 1000,
});
const flush = async () => { for (let i = 0; i < 30; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  jest.clearAllMocks();
});

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

describe('+2 «вместе» начисляет телефон (закон владельца 22.10)', () => {
  const D = '2026-10-22';

  it('ключ кошелька: lessontogether_ и 40 hex; одинаковый, кто бы кого ни позвал; свой у каждого; другой день — другой', async () => {
    const mine = await lessonTogetherRequestId('me-1', 'alex-9', D);
    expect(mine).toMatch(/^lessontogether_[0-9a-f]{40}$/);
    expect(await lessonTogetherRequestId('me-1', 'alex-9', D)).toBe(mine);
    expect(await lessonTogetherRequestId('alex-9', 'me-1', D)).not.toBe(mine);
    expect(await lessonTogetherRequestId('me-1', 'alex-9', '2026-10-23')).not.toBe(mine);
    expect(await lessonTogetherRequestId('me-1', 'me-1', D)).toBeNull();
    expect(await lessonTogetherRequestId('me-1', 'alex-9', '22.10')).toBeNull();
  });

  it('у друга: засчитано по приглашению → +2 в очередь кошелька и тост сразу, отметка «выполнено» — с днём', async () => {
    (markLessonTogether as jest.Mock).mockResolvedValue({ ok: false, reason: 'network' });
    const fid = 'fli_' + 'b'.repeat(32);
    await rememberAcceptedLessonInvite({ ...invite(fid, 2, 3, NOW + 60_000) }, NOW);
    startLessonTogetherClaimer();
    const handler = (onAppEvent as jest.Mock).mock.calls.find(([name]) => name === 'learning_v2_session_credited')![1] as (e: unknown) => void;
    handler({ sessionId: 'lv2:l2:s3', mutationId: 'm1', awardedAtMs: NOW });
    await flush();
    expect(enqueueLevelSpinStarGrant).toHaveBeenCalledTimes(1);
    expect((enqueueLevelSpinStarGrant as jest.Mock).mock.calls[0][0]).toMatchObject({ lane: 'base', giftId: 'stars_2', promotionEligibility: 'gameplay' });
    expect((enqueueLevelSpinStarGrant as jest.Mock).mock.calls[0][0].requestId).toMatch(/^lessontogether_[0-9a-f]{40}$/);
    expect(emitAppEvent).toHaveBeenCalledWith('action_toast', expect.objectContaining({ type: 'success', messageRu: 'Алекс: занятие вместе · +2 каждому' }));
    expect(markLessonTogether).toHaveBeenCalledWith({ inviteId: fid, dayKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    // приглашение снято сразу — второй сигнал того же занятия не начислит; отметка не дошла (сеть) — ждёт повтора
    expect(await readAcceptedLessonInvites(NOW)).toEqual([]);
    expect(mockStorage['friends_lesson_marks_pending_v1::me-1']).toContain(fid);
    handler({ sessionId: 'lv2:l2:s3', mutationId: 'm1', awardedAtMs: NOW });
    await flush();
    expect(enqueueLevelSpinStarGrant).toHaveBeenCalledTimes(1);
  });

  it('у пригласившего: уведомление «друг прошёл» → +2 тем же способом один раз, повтор ничего не даёт', async () => {
    const row = {
      id: 'n1', type: 'friend_nudge', fromUid: 'alex-9', fromName: 'Алекс', text: '', read: false, createdAt: NOW,
      nav: { kind: 'friend_event', action: 'lesson_together', actorStableUid: 'alex-9', eventId: 'friend_lesson_together_x', inviteId: 'fli_x', dayKey: D },
    } as unknown as UserNotification;
    expect(await creditLessonTogetherForInviter([row])).toBe(1);
    expect((enqueueLevelSpinStarGrant as jest.Mock).mock.calls[0][0].requestId).toBe(await lessonTogetherRequestId('me-1', 'alex-9', D));
    expect(await creditLessonTogetherForInviter([row])).toBe(0);
    expect(enqueueLevelSpinStarGrant).toHaveBeenCalledTimes(1);
    expect(emitAppEvent).toHaveBeenCalledTimes(1);
  });
});
