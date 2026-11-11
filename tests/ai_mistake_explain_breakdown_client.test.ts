import AsyncStorage from '@react-native-async-storage/async-storage';
import { callExplainMistake, type ExplainMistakeRequest } from '../app/ai_mistake_explain_client';

const mockCallable = jest.fn();
let mockNetStatus: 'online' | 'offline' | 'unknown' = 'online';

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: jest.fn(() => mockCallable),
}));

jest.mock('../app/ai_kill_switch_copy', () => ({
  aiOffline: jest.fn(() => false),
  AiOfflineError: class AiOfflineError extends Error {},
}));

jest.mock('../app/explain_callable_timeout', () => ({
  EXPLAIN_CALLABLE_TIMEOUT_MS: 35_000,
  withExplainCallableTimeout: <T>(promise: Promise<T>) => promise,
}));

jest.mock('../app/ai_callable_resilience', () => ({
  warmAiFunction: jest.fn(async () => undefined),
  withAiCallableRetry: <T>(call: (attempt: 1 | 2) => Promise<T>) => call(1),
  aiAttemptTimeoutMs: (baseMs: number) => baseMs,
}));

jest.mock('../app/net_status', () => ({
  getNetStatus: () => mockNetStatus,
}));

const request: ExplainMistakeRequest = {
  lessonId: 18,
  phraseId: 'lesson18_phrase_31',
  studyTarget: 'en',
  interfaceLang: 'ru',
  prompt: 'Say: I have a reservation.',
  userAnswer: 'I has a reservation',
  targetAnswer: 'I have a reservation.',
  variant: 'full',
};

const breakdown = {
  verdict: 'one',
  wrong: 'has',
  right: 'have',
  rule: 'С "I" всегда "have"',
  why: 'Почти! "has" говорят про него или неё.',
  youSaid: '',
  pair: ['I have a reservation', 'He has a reservation'],
  also: [],
  simple: 'С "I" говорим "have".',
};

function serverResponse(extra: Record<string, unknown> = {}) {
  return {
    data: {
      ok: true,
      text: 'С "I" всегда "have". Почти! "has" говорят про него или неё.',
      remainingQuota: 999,
      model: 'gpt-4.1',
      fromCache: false,
      variant: 'full',
      ...extra,
    },
  };
}

describe('mistake explanation client: structured breakdown', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockNetStatus = 'online';
    await AsyncStorage.clear();
  });

  it('returns the fields from the server and replays them from the local cache without network', async () => {
    mockCallable.mockResolvedValueOnce(serverResponse({ breakdown }));

    const fresh = await callExplainMistake(request);
    mockNetStatus = 'offline';
    const replay = await callExplainMistake(request);

    expect(fresh.breakdown).toEqual(breakdown);
    expect(replay.breakdown).toEqual(breakdown);
    expect(replay.text).toBe(fresh.text);
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('stays on plain text when an older server sends no fields', async () => {
    mockCallable.mockResolvedValueOnce(serverResponse());

    const fresh = await callExplainMistake(request);
    mockNetStatus = 'offline';
    const replay = await callExplainMistake(request);

    expect(fresh.breakdown).toBeUndefined();
    expect(replay.breakdown).toBeUndefined();
    expect(replay.text).toBe(fresh.text);
  });

  it('never passes malformed fields to the screen', async () => {
    mockCallable.mockResolvedValueOnce(serverResponse({ breakdown: { verdict: 'one', why: '' } }));

    const fresh = await callExplainMistake(request);

    expect(fresh.breakdown).toBeUndefined();
    expect(fresh.text).toContain('have');
  });
});
