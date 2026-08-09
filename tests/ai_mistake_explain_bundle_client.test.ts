import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  callExplainMistake,
  type ExplainMistakeRequest,
} from '../app/ai_mistake_explain_client';

const mockCallable = jest.fn();
let mockNetStatus: 'online' | 'offline' | 'unknown' = 'online';

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({ name: '[DEFAULT]' })),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: jest.fn(() => mockCallable),
}));

jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
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

const fullRequest: ExplainMistakeRequest = {
  lessonId: 18,
  phraseId: 'lesson18_phrase_31',
  studyTarget: 'en',
  interfaceLang: 'ru',
  prompt: 'Say: I have a reservation.',
  userAnswer: 'I has a reservation',
  targetAnswer: 'I have a reservation.',
  phraseMeaning: 'У меня есть бронь.',
  selectedWrongWord: 'has',
  expectedWord: 'have',
  diffPairs: [{ expected: 'have', picked: 'has' }],
  variant: 'full',
};

describe('mistake explanation bundle client cache', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockNetStatus = 'online';
    await AsyncStorage.clear();
  });

  it('does not call the remote function until connectivity is confirmed online', async () => {
    mockNetStatus = 'unknown';

    await expect(callExplainMistake(fullRequest)).rejects.toThrow('mistake_explain_offline');
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it('primes the ELI5 local cache from one full callable response', async () => {
    const fullText = 'После "I" здесь нужно "have".\n"I have a reservation."';
    const eli5Text = 'Почти! После "I" поставь "have".\n"I have a reservation."';
    mockCallable.mockResolvedValueOnce({
      data: {
        ok: true,
        text: fullText,
        fullText,
        eli5Text,
        remainingQuota: 999,
        model: 'gpt-4.1',
        fromCache: false,
        variant: 'full',
      },
    });

    const full = await callExplainMistake(fullRequest);
    mockNetStatus = 'unknown';
    const warmFull = await callExplainMistake(fullRequest);
    const simple = await callExplainMistake({ ...fullRequest, variant: 'eli5' });

    expect(full).toMatchObject({ text: fullText, fullText, eli5Text });
    expect(warmFull).toMatchObject({
      text: fullText,
      fullText,
      eli5Text,
      model: 'local-cache',
      fromCache: true,
      variant: 'full',
    });
    expect(simple).toMatchObject({
      text: eli5Text,
      model: 'local-cache',
      fromCache: true,
      variant: 'eli5',
    });
    expect(mockCallable).toHaveBeenCalledTimes(1);
  });

  it('treats omitted and explicit full variants as one local request identity', async () => {
    mockCallable.mockResolvedValueOnce({
      data: {
        ok: true,
        text: 'Full explanation',
        remainingQuota: 999,
        model: 'gpt-4.1',
        fromCache: false,
        variant: 'full',
      },
    });

    const omittedVariant = { ...fullRequest };
    delete omittedVariant.variant;

    await callExplainMistake(omittedVariant);
    const explicitFull = await callExplainMistake(fullRequest);

    expect(explicitFull).toMatchObject({
      text: 'Full explanation',
      model: 'local-cache',
      fromCache: true,
      variant: 'full',
    });
    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledWith(expect.objectContaining({ variant: 'full' }));
  });

  it('keeps the legacy lazy ELI5 request when the server returns only full text', async () => {
    mockCallable
      .mockResolvedValueOnce({
        data: {
          ok: true,
          text: 'Полный старый ответ.',
          remainingQuota: 999,
          model: 'gpt-4.1',
          fromCache: false,
          variant: 'full',
        },
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          text: 'Отдельный простой ответ.',
          remainingQuota: 999,
          model: 'gpt-4.1',
          fromCache: false,
          variant: 'eli5',
        },
      });

    await callExplainMistake(fullRequest);
    const simple = await callExplainMistake({ ...fullRequest, variant: 'eli5' });

    expect(simple.text).toBe('Отдельный простой ответ.');
    expect(mockCallable).toHaveBeenCalledTimes(2);
  });
});
