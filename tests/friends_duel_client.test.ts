/**
 * duel_client — «Дуэль на 5 фраз» (идея 3; контракт docs/work/tasks/friends-duel-2026-10-22.md, поправки 1 · ЯДРО 22.10).
 * Сторож: ход ложится на телефон ДО запроса и уходит тем же requestId; нет сети или вход не готов — ход остаётся и досылается;
 * сервер отказал (лимит, уже идёт дуэль, срок вышел) — ход убираем; кривой ход или кривой ответ сервера не принимаем.
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

import { flushPendingDuels, readPendingDuels, submitDuelChallenge, submitDuelDecline, submitDuelMove } from '../app/friends_together/duel_client';

const ok = (data: unknown) => () => Promise.resolve({ data });
const fail = (code: string) => () => Promise.reject(Object.assign(new Error(code), { code: `functions/${code}` }));
const ids = ['en:lesson-01:session-01:i02', 'en:lesson-01:session-01:i03', 'en:lesson-01:session-02:i01', 'en:lesson-01:session-02:i05', 'en:lesson-01:session-03:i04'];
const move = { results: [true, true, false, true, true], elapsedMs: 48_000 };

beforeEach(() => {
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockCalls.length = 0;
  for (const key of Object.keys(mockResponses)) delete mockResponses[key];
  mockSender.current = { stableId: 'me-1', displayName: 'Алекс' };
});

describe('вызов со своим ходом', () => {
  it('уходит с пятью фразами, ходом и именем; после ответа на телефоне ничего не висит', async () => {
    mockResponses.friendsDuelChallenge = [ok({ duelId: 'd-1', expiresAtMs: 123 })];
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move })).resolves.toEqual({ ok: true, duelId: 'd-1', expiresAtMs: 123 });
    expect(mockCalls).toHaveLength(1);
    expect(mockCalls[0]?.payload).toMatchObject({ stableId: 'me-1', senderDisplayName: 'Алекс', friendUid: 'f-1', phraseIds: ids, move });
    expect(await readPendingDuels()).toEqual([]);
  });

  it('нет сети — ход остаётся на телефоне и досылается тем же requestId', async () => {
    mockResponses.friendsDuelChallenge = [fail('unavailable')];
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move })).resolves.toEqual({ ok: false, reason: 'network' });
    const [pending] = await readPendingDuels();
    expect(pending).toMatchObject({ kind: 'challenge', friendUid: 'f-1', move });
    mockResponses.friendsDuelChallenge = [ok({ duelId: 'd-2', expiresAtMs: 5 })];
    await expect(flushPendingDuels()).resolves.toEqual({ sent: 1, dropped: 0, left: 0 });
    expect(mockCalls[1]?.payload.requestId).toBe(mockCalls[0]?.payload.requestId);
    expect(await readPendingDuels()).toEqual([]);
  });

  it('вход ещё не готов (без сети) — тоже досылаем позже, ход не теряем', async () => {
    mockSender.current = null;
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move })).resolves.toEqual({ ok: false, reason: 'no_sender' });
    expect(mockCalls).toHaveLength(0);
    expect(await readPendingDuels()).toHaveLength(1);
  });

  it('лимит и уже идущая дуэль — окончательный ответ: ход убираем', async () => {
    mockResponses.friendsDuelChallenge = [fail('resource-exhausted limit'), fail('failed-precondition open_duel')];
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move })).resolves.toEqual({ ok: false, reason: 'limit' });
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move })).resolves.toEqual({ ok: false, reason: 'open_duel' });
    expect(await readPendingDuels()).toEqual([]);
  });

  it('кривой ход и кривые фразы — не отправляем вовсе', async () => {
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids.slice(0, 4), move })).resolves.toEqual({ ok: false, reason: 'invalid' });
    await expect(submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move: { results: [true], elapsedMs: 5 } })).resolves.toEqual({ ok: false, reason: 'invalid' });
    await expect(submitDuelChallenge({ friendUid: '', phraseIds: ids, move })).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(mockCalls).toHaveLength(0);
  });
});

describe('ход в ответ на вызов', () => {
  const theirs = { correct: 3, elapsedMs: 65_000, results: [true, false, true, true, false] };

  it('итог сервера разбираем целиком', async () => {
    mockResponses.friendsDuelMove = [ok({ outcome: 'win', mine: { correct: 4, elapsedMs: 48_000 }, theirs })];
    await expect(submitDuelMove({ duelId: 'd-1', move })).resolves.toEqual({ ok: true, outcome: 'win', mine: { correct: 4, elapsedMs: 48_000 }, theirs });
    expect(mockCalls[0]?.payload).toMatchObject({ stableId: 'me-1', duelId: 'd-1', move });
  });

  it('кривой итог сервера — invalid, ход не досылаем по кругу', async () => {
    mockResponses.friendsDuelMove = [ok({ outcome: 'win', mine: { correct: 4, elapsedMs: 1 }, theirs: { ...theirs, results: [true] } })];
    await expect(submitDuelMove({ duelId: 'd-1', move })).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(await readPendingDuels()).toEqual([]);
  });

  it('срок вышел и ход уже был — окончательно; нет сети — остаётся', async () => {
    mockResponses.friendsDuelMove = [fail('deadline-exceeded expired'), fail('already-exists already_moved'), fail('unavailable')];
    await expect(submitDuelMove({ duelId: 'd-1', move })).resolves.toEqual({ ok: false, reason: 'expired' });
    await expect(submitDuelMove({ duelId: 'd-1', move })).resolves.toEqual({ ok: false, reason: 'already_moved' });
    await expect(submitDuelMove({ duelId: 'd-1', move })).resolves.toEqual({ ok: false, reason: 'network' });
    expect((await readPendingDuels()).map((p) => p.kind)).toEqual(['move']);
  });
});

describe('отказ от вызова', () => {
  it('один запрос с номером дуэли, без повторов; ошибки сервера — подстрокой', async () => {
    mockResponses.friendsDuelDecline = [ok({ ok: true }), fail('deadline-exceeded expired'), fail('unavailable')];
    await expect(submitDuelDecline('d-1')).resolves.toEqual({ ok: true });
    expect(mockCalls[0]).toEqual({ name: 'friendsDuelDecline', payload: { duelId: 'd-1' } });
    await expect(submitDuelDecline('d-1')).resolves.toEqual({ ok: false, reason: 'expired' });
    await expect(submitDuelDecline('d-1')).resolves.toEqual({ ok: false, reason: 'network' });
    expect(mockCalls).toHaveLength(3);
    expect(await readPendingDuels()).toEqual([]);
  });

  it('без номера дуэли — не отправляем', async () => {
    await expect(submitDuelDecline('')).resolves.toEqual({ ok: false, reason: 'invalid' });
    expect(mockCalls).toHaveLength(0);
  });
});

describe('досылка', () => {
  it('без сети ничего не теряет; отказ сервера убирает только свой ход', async () => {
    mockResponses.friendsDuelChallenge = [fail('unavailable')];
    mockResponses.friendsDuelMove = [fail('unavailable')];
    await submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move });
    await submitDuelMove({ duelId: 'd-9', move });
    mockResponses.friendsDuelChallenge = [fail('unavailable')];
    mockResponses.friendsDuelMove = [fail('expired')];
    await expect(flushPendingDuels()).resolves.toEqual({ sent: 0, dropped: 1, left: 1 });
    expect((await readPendingDuels()).map((p) => p.kind)).toEqual(['challenge']);
  });

  it('ход старше суток не досылаем', async () => {
    mockResponses.friendsDuelChallenge = [fail('unavailable')];
    await submitDuelChallenge({ friendUid: 'f-1', phraseIds: ids, move });
    expect(await readPendingDuels(Date.now() + 25 * 60 * 60 * 1000)).toEqual([]);
  });
});
