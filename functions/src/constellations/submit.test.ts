// ════════════════════════════════════════════════════════════════════════════
// submit.test.ts — анти-чит и идемпотентность callable-хода (ЭТАП 7.2).
//
// Единственный путь записи хода — handleConstellationSubmit. Тут ДЕНЬГИ/РЕЙТИНГ
// не начисляются, но именно здесь ловится читерство: слишком быстрый ответ,
// повтор actionId, нелегальная цель, ход не в свою фазу/не живым. Fake-firestore
// по образцу arena_bot_match.test.ts, расширенный под update/getAll/Promise.all.
// Переход фазы (advanceToAnswer/resolveCurrentRound) замокан в no-op — тут
// проверяется ТОЛЬКО решение транзакции (accept/reject), не резолв раунда.
// ════════════════════════════════════════════════════════════════════════════

export {};

type DocData = Record<string, unknown>;

const docs = new Map<string, DocData>();

function snapFor(path: string) {
  const data = docs.get(path);
  return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
}

type FakeRef = { path: string };
function makeRef(path: string): FakeRef {
  return { path };
}

function applyUpdate(path: string, patch: DocData): void {
  const existing = docs.get(path) ?? {};
  docs.set(path, { ...existing, ...patch });
}

function buildDb() {
  return {
    collection: (name: string) => ({
      doc: (id: string) => makeRef(`${name}/${id}`),
    }),
    getAll: async (...refs: FakeRef[]) => refs.map((r) => snapFor(r.path)),
    runTransaction: async <T>(fn: (tx: {
      get: (ref: FakeRef) => Promise<ReturnType<typeof snapFor>>;
      update: (ref: FakeRef, data: DocData) => void;
      set: (ref: FakeRef, data: DocData) => void;
    }) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = [];
      const tx = {
        get: async (ref: FakeRef) => snapFor(ref.path),
        update: (ref: FakeRef, data: DocData) => { writes.push(() => applyUpdate(ref.path, data)); },
        set: (ref: FakeRef, data: DocData) => { writes.push(() => docs.set(ref.path, { ...data })); },
      };
      const result = await fn(tx);
      writes.forEach((w) => w());
      return result;
    },
  };
}

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (_opts: unknown, handler: unknown) => handler,
}));

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => buildDb()),
}));

// Переход фазы не должен трогать реальную БД в этих тестах — no-op.
jest.mock('./match_service', () => ({
  advanceToAnswer: jest.fn(async () => {}),
  resolveCurrentRound: jest.fn(async () => {}),
  allHumansDoneForPhase: jest.fn(() => false),
}));

// Конфиг — дефолты (minAnswerMs и пр.), без чтения БД.
jest.mock('./config', () => {
  const actual = jest.requireActual('./config');
  return {
    ...actual,
    resolveConstellationConfig: jest.fn(async () => actual.constellationConfigFromData({})),
  };
});

const MATCH_ID = 'm1';
const UID = 'u1';

function seedActiveMatch(opts: {
  phase?: 'choose' | 'answer';
  status?: 'alive' | 'falling' | 'out';
  processedActionIds?: string[];
  questions?: Array<{ qid: string; options: string[] }>;
  answers?: unknown[];
  lastAnswerAt?: number;
  dealtAt?: number;
  correctByQid?: Record<string, { correctIndex: number }>;
} = {}) {
  const {
    phase = 'answer', status = 'alive', processedActionIds = [],
    questions = [{ qid: 'q1', options: ['a', 'b', 'c', 'd'] }],
    answers = [], lastAnswerAt, dealtAt = 0,
    correctByQid = { q1: { correctIndex: 1 } },
  } = opts;

  docs.set(`constellation_matches/${MATCH_ID}`, {
    id: MATCH_ID, stage: 'active', phase, round: 1,
    players: [{ slot: 0, uid: UID, roundDone: false }],
    emotes: [],
  });
  docs.set(`constellation_server/${MATCH_ID}`, {
    matchId: MATCH_ID,
    state: { players: { 0: { slot: 0, status, shieldUsed: false } }, stars: {} },
    correctByQid,
    humanUids: [UID],
  });
  docs.set(`constellation_players/${MATCH_ID}_${UID}`, {
    matchId: MATCH_ID, uid: UID, slot: 0, round: 1,
    status, questions, answers, processedActionIds,
    lastAnswerAt, dealtAt,
  });
}

function callSubmit(data: Record<string, unknown>) {
  const { handleConstellationSubmit } = require('./submit');
  return handleConstellationSubmit(UID, { matchId: MATCH_ID, ...data });
}

describe('handleConstellationSubmit — анти-чит и идемпотентность (7.2)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-14T10:00:00.000Z'));
    jest.resetModules();
    docs.clear();
  });

  test('ответ слишком быстро (< minAnswerMs) отклоняется, ответ не записан', async () => {
    // dealtAt = now → sinceMs = 0 < minAnswerMs(800) → reject.
    seedActiveMatch({ dealtAt: Date.now() });
    await expect(callSubmit({
      actionId: 'a1', type: 'answer', qIndex: 0, answerIndex: 1,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'too fast' });
    const player = docs.get(`constellation_players/${MATCH_ID}_${UID}`) as DocData;
    expect((player.answers as unknown[]).length).toBe(0);
  });

  test('дубль actionId → {duplicate:true}, answers НЕ растёт', async () => {
    seedActiveMatch({ processedActionIds: ['dup'], dealtAt: 0 });
    const res = await callSubmit({ actionId: 'dup', type: 'answer', qIndex: 0, answerIndex: 1 });
    expect(res).toMatchObject({ ok: true, duplicate: true });
    const player = docs.get(`constellation_players/${MATCH_ID}_${UID}`) as DocData;
    expect((player.answers as unknown[]).length).toBe(0);
  });

  test('верный ответ (по серверному correctByQid) записывается с correct:true', async () => {
    seedActiveMatch({ dealtAt: 0 }); // now=10:00, dealtAt=0 → sinceMs огромный > 800
    const res = await callSubmit({ actionId: 'a1', type: 'answer', qIndex: 0, answerIndex: 1 });
    expect(res).toMatchObject({ ok: true, correct: true, correctIndex: 1 });
    const player = docs.get(`constellation_players/${MATCH_ID}_${UID}`) as DocData;
    expect((player.answers as unknown[]).length).toBe(1);
  });

  test(' answerIndex вне диапазона отклоняется', async () => {
    seedActiveMatch({ dealtAt: 0 });
    await expect(callSubmit({
      actionId: 'a1', type: 'answer', qIndex: 0, answerIndex: 99,
    })).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  test('ответ не по порядку (qIndex != answers.length) отклоняется', async () => {
    seedActiveMatch({ dealtAt: 0 });
    await expect(callSubmit({
      actionId: 'a1', type: 'answer', qIndex: 5, answerIndex: 1,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'answer out of order' });
  });

  test('ответ в фазе choose (не answer) отклоняется', async () => {
    seedActiveMatch({ phase: 'choose', dealtAt: 0 });
    await expect(callSubmit({
      actionId: 'a1', type: 'answer', qIndex: 0, answerIndex: 1,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'not answer phase' });
  });

  test('нелегальная цель атаки отклоняется', async () => {
    seedActiveMatch({ phase: 'choose' });
    // legalTargets пуст (нет своих звёзд) → любая цель нелегальна.
    await expect(callSubmit({
      actionId: 'a1', type: 'choose_target', target: '1,0',
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'illegal target' });
  });

  test('ход выбитого игрока (not alive) отклоняется', async () => {
    seedActiveMatch({ phase: 'choose', status: 'out' });
    await expect(callSubmit({
      actionId: 'a1', type: 'choose_target', target: null,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'player not alive' });
  });

  test('ход в чужой/несуществующий матч (нет player-дока) отклоняется', async () => {
    // Матч и server есть, а player-дока нет → not a participant.
    docs.set(`constellation_matches/${MATCH_ID}`, { id: MATCH_ID, stage: 'active', phase: 'answer', round: 1, players: [], emotes: [] });
    docs.set(`constellation_server/${MATCH_ID}`, { matchId: MATCH_ID, state: { players: {}, stars: {} }, correctByQid: {}, humanUids: [] });
    await expect(callSubmit({
      actionId: 'a1', type: 'answer', qIndex: 0, answerIndex: 1,
    })).rejects.toMatchObject({ code: 'permission-denied' });
  });

  test('ход в завершённый матч отклоняется', async () => {
    seedActiveMatch({ dealtAt: 0 });
    applyUpdate(`constellation_matches/${MATCH_ID}`, { stage: 'finished' });
    await expect(callSubmit({
      actionId: 'a1', type: 'answer', qIndex: 0, answerIndex: 1,
    })).rejects.toMatchObject({ code: 'failed-precondition', message: 'match finished' });
  });
});
