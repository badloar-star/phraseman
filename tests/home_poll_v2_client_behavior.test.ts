import AsyncStorage from '@react-native-async-storage/async-storage';

const mockVoteCallable = jest.fn();
let mockCurrentOwner = 'owner-a';
let mockGeneration = 1;

jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockVoteCallable),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => mockCurrentOwner),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => Object.freeze({
    generation: mockGeneration,
    stableId: mockCurrentOwner,
    phase: 'active',
  })),
  isCurrentAccountGeneration: jest.fn((token: { generation: number; stableId: string }, expectedOwner?: string) =>
    token.generation === mockGeneration
      && token.stableId === mockCurrentOwner
      && (expectedOwner === undefined || expectedOwner === mockCurrentOwner)),
}));

import {
  __resetHomePollV2ForTests,
  flushHomePollV2Queue,
  loadTodayHomePollV2,
  submitHomePollV2Vote,
} from '../app/home_polls/home_polls_v2_client';

const queueKey = (owner: string) => `home_polls_v2_queue_v1::${owner}`;
const answersKey = (owner: string, setId: string) =>
  `home_polls_v2_answers_v1::${owner}::${setId}`;

const readJson = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw) as T;
};

const switchOwner = (owner: string): void => {
  mockGeneration += 1;
  mockCurrentOwner = owner;
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockVoteCallable.mockReset();
  mockCurrentOwner = 'owner-a';
  mockGeneration = 1;
  __resetHomePollV2ForTests();
  await AsyncStorage.clear();
});

describe('home polls v2 client persistence boundaries', () => {
  it('keeps an optimistic answer and one durable retry row after a network failure', async () => {
    mockVoteCallable.mockRejectedValueOnce(Object.assign(new Error('network unavailable'), { code: 'functions/unavailable' }));
    const snapshot = await loadTodayHomePollV2('2026-10-21');

    await expect(submitHomePollV2Vote(snapshot, 'q1', 'o2')).resolves.toEqual({
      ok: false,
      reason: 'offline',
      queued: true,
    });

    expect(await readJson(answersKey('owner-a', 'p2-001'))).toEqual({
      q1: { optionId: 'o2', counts: { o1: 0, o2: 0, o3: 0, o4: 0 } },
    });
    expect(await readJson<Array<Record<string, unknown>>>(queueKey('owner-a'))).toEqual([
      expect.objectContaining({ setId: 'p2-001', questionId: 'q1', optionId: 'o2' }),
    ]);
  });

  it('keeps every optimistic answer and retry row when two questions are submitted concurrently', async () => {
    mockVoteCallable.mockRejectedValue(Object.assign(new Error('network unavailable'), { code: 'functions/unavailable' }));
    const snapshot = await loadTodayHomePollV2('2026-10-21');

    await Promise.all([
      submitHomePollV2Vote(snapshot, 'q1', 'o1'),
      submitHomePollV2Vote(snapshot, 'q2', 'o2'),
    ]);

    expect(await readJson(answersKey('owner-a', 'p2-001'))).toEqual({
      q1: { optionId: 'o1', counts: { o1: 0, o2: 0, o3: 0, o4: 0 } },
      q2: { optionId: 'o2', counts: { o1: 0, o2: 0, o3: 0, o4: 0 } },
    });
    expect(await readJson<Array<Record<string, unknown>>>(queueKey('owner-a'))).toEqual([
      expect.objectContaining({ setId: 'p2-001', questionId: 'q1', optionId: 'o1' }),
      expect.objectContaining({ setId: 'p2-001', questionId: 'q2', optionId: 'o2' }),
    ]);
  });

  it('does not erase an answer queued while an earlier queue row is flushing', async () => {
    await AsyncStorage.setItem(queueKey('owner-a'), JSON.stringify([{
      setId: 'p2-001',
      questionId: 'q1',
      optionId: 'o1',
      dateKey: '2026-10-21',
      queuedAtMs: 1,
    }]));
    let resolveFlush!: (value: { data: unknown }) => void;
    mockVoteCallable
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFlush = resolve; }))
      .mockRejectedValueOnce(Object.assign(new Error('network unavailable'), { code: 'functions/unavailable' }));
    const snapshot = await loadTodayHomePollV2('2026-10-21');

    const flushing = flushHomePollV2Queue(snapshot);
    for (let attempt = 0; attempt < 20 && mockVoteCallable.mock.calls.length === 0; attempt += 1) {
      await Promise.resolve();
    }
    await submitHomePollV2Vote(snapshot, 'q2', 'o2');
    resolveFlush({
      data: { status: 'accepted', counts: { o1: 7, o2: 2, o3: 0, o4: 0 }, voteCount: 9 },
    });
    const flushed = await flushing;

    expect(flushed.answers).toEqual({
      q1: { optionId: 'o1', counts: { o1: 7, o2: 2, o3: 0, o4: 0 } },
      q2: { optionId: 'o2', counts: { o1: 0, o2: 0, o3: 0, o4: 0 } },
    });
    expect(await readJson<Array<Record<string, unknown>>>(queueKey('owner-a'))).toEqual([
      expect.objectContaining({ setId: 'p2-001', questionId: 'q2', optionId: 'o2' }),
    ]);
  });

  it('does not let owner A in-flight state block owner B from answering the same question', async () => {
    let resolveOwnerA!: (value: { data: unknown }) => void;
    mockVoteCallable
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOwnerA = resolve; }))
      .mockResolvedValueOnce({
        data: { status: 'accepted', counts: { o1: 0, o2: 3, o3: 0, o4: 0 }, voteCount: 3 },
      });
    const snapshotA = await loadTodayHomePollV2('2026-10-21');
    const pendingA = submitHomePollV2Vote(snapshotA, 'q1', 'o1');
    for (let attempt = 0; attempt < 20 && mockVoteCallable.mock.calls.length === 0; attempt += 1) {
      await Promise.resolve();
    }

    switchOwner('owner-b');
    const snapshotB = await loadTodayHomePollV2('2026-10-21');
    await expect(submitHomePollV2Vote(snapshotB, 'q1', 'o2')).resolves.toMatchObject({ ok: true });
    expect(mockVoteCallable).toHaveBeenCalledTimes(2);

    resolveOwnerA({
      data: { status: 'accepted', counts: { o1: 1, o2: 0, o3: 0, o4: 0 }, voteCount: 1 },
    });
    await expect(pendingA).resolves.toMatchObject({ ok: false, queued: true });
  });

  it('does not delete a queued vote when a transport not-found error mentions a missing set', async () => {
    mockVoteCallable.mockRejectedValueOnce(Object.assign(new Error('set_not_found'), { code: 'functions/not-found' }));
    const snapshot = await loadTodayHomePollV2('2026-10-21');

    await expect(submitHomePollV2Vote(snapshot, 'q1', 'o3')).resolves.toMatchObject({ ok: false, queued: true });

    expect(await readJson<Array<Record<string, unknown>>>(queueKey('owner-a'))).toEqual([
      expect.objectContaining({ setId: 'p2-001', questionId: 'q1', optionId: 'o3' }),
    ]);
  });

  it('flushes a vote queued on day D after day D+1 selects a different set', async () => {
    mockVoteCallable
      .mockRejectedValueOnce(Object.assign(new Error('network unavailable'), { code: 'functions/unavailable' }))
      .mockResolvedValueOnce({
        data: { status: 'accepted', counts: { o1: 4, o2: 2, o3: 1, o4: 0 }, voteCount: 7 },
      });

    const dayD = await loadTodayHomePollV2('2026-10-21');
    expect(dayD.set?.id).toBe('p2-001');
    await expect(submitHomePollV2Vote(dayD, 'q1', 'o1')).resolves.toEqual({
      ok: false,
      reason: 'offline',
      queued: true,
    });

    const dayDPlusOne = await loadTodayHomePollV2('2026-10-22');
    expect(dayDPlusOne.set?.id).toBe('p2-002');
    const flushed = await flushHomePollV2Queue(dayDPlusOne);

    expect(flushed.set?.id).toBe('p2-002');
    expect(flushed.answers).toEqual({});
    expect(mockVoteCallable).toHaveBeenLastCalledWith({
      setId: 'p2-001',
      questionId: 'q1',
      optionId: 'o1',
      dateKey: '2026-10-21',
      stableId: 'owner-a',
    });
    expect(await readJson(answersKey('owner-a', 'p2-001'))).toEqual({
      q1: { optionId: 'o1', counts: { o1: 4, o2: 2, o3: 1, o4: 0 } },
    });
    expect(mockVoteCallable).toHaveBeenCalledTimes(2);
    expect(await AsyncStorage.getItem(queueKey('owner-a'))).toBeNull();
  });

  it('does not persist owner A callable response after the account generation changes to B', async () => {
    let resolveVote!: (value: { data: unknown }) => void;
    mockVoteCallable.mockImplementationOnce(() => new Promise((resolve) => {
      resolveVote = resolve;
    }));

    const snapshotA = await loadTodayHomePollV2('2026-10-21');
    const pending = submitHomePollV2Vote(snapshotA, 'q1', 'o2');
    for (let attempt = 0; attempt < 20 && mockVoteCallable.mock.calls.length === 0; attempt += 1) {
      await Promise.resolve();
    }
    expect(mockVoteCallable).toHaveBeenCalledTimes(1);

    switchOwner('owner-b');
    resolveVote({
      data: { status: 'accepted', counts: { o1: 1, o2: 5, o3: 0, o4: 0 }, voteCount: 6 },
    });

    await expect(pending).resolves.toEqual({ ok: false, reason: 'unknown', queued: true });
    expect(await readJson(answersKey('owner-a', 'p2-001'))).toEqual({
      q1: { optionId: 'o2', counts: { o1: 0, o2: 0, o3: 0, o4: 0 } },
    });
    expect(await AsyncStorage.getItem(answersKey('owner-b', 'p2-001'))).toBeNull();
    expect(await readJson<Array<Record<string, unknown>>>(queueKey('owner-a'))).toEqual([
      expect.objectContaining({
        setId: 'p2-001',
        questionId: 'q1',
        optionId: 'o2',
        dateKey: '2026-10-21',
      }),
    ]);
    expect(await AsyncStorage.getItem(queueKey('owner-b'))).toBeNull();
  });

  it('stores counts with a null local selection when the server says already_answered', async () => {
    mockVoteCallable.mockResolvedValueOnce({
      data: { status: 'already_answered', counts: { o1: 2, o2: 3, o3: 4, o4: 5 }, voteCount: 14 },
    });
    const snapshot = await loadTodayHomePollV2('2026-10-21');

    await expect(submitHomePollV2Vote(snapshot, 'q1', 'o4')).resolves.toEqual({
      ok: true,
      answer: { optionId: null, counts: { o1: 2, o2: 3, o3: 4, o4: 5 } },
      alreadyAnswered: true,
    });
    expect(await readJson(answersKey('owner-a', 'p2-001'))).toEqual({
      q1: { optionId: null, counts: { o1: 2, o2: 3, o3: 4, o4: 5 } },
    });
    expect(await AsyncStorage.getItem(queueKey('owner-a'))).toBeNull();
  });

  it('flushes a valid queued vote after the finite schedule returns a null set', async () => {
    await AsyncStorage.setItem(queueKey('owner-a'), JSON.stringify([{
      setId: 'p2-001',
      questionId: 'q1',
      optionId: 'o3',
      dateKey: '2026-10-21',
      queuedAtMs: 1,
    }]));
    mockVoteCallable.mockResolvedValueOnce({
      data: { status: 'accepted', counts: { o1: 0, o2: 1, o3: 9, o4: 2 }, voteCount: 12 },
    });

    const afterSchedule = await loadTodayHomePollV2('2027-10-04');
    expect(afterSchedule.set).toBeNull();
    expect(afterSchedule.questionIndex).toBeNull();
    const flushed = await flushHomePollV2Queue(afterSchedule);

    expect(flushed).toBe(afterSchedule);
    expect(mockVoteCallable).toHaveBeenCalledWith({
      setId: 'p2-001',
      questionId: 'q1',
      optionId: 'o3',
      dateKey: '2026-10-21',
      stableId: 'owner-a',
    });
    expect(await readJson(answersKey('owner-a', 'p2-001'))).toEqual({
      q1: { optionId: 'o3', counts: { o1: 0, o2: 1, o3: 9, o4: 2 } },
    });
    expect(await AsyncStorage.getItem(queueKey('owner-a'))).toBeNull();
  });
});
