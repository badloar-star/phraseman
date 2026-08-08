import AsyncStorage from '@react-native-async-storage/async-storage';

const mockCallable = jest.fn();

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

import {
  callExplainMistake,
  type ExplainMistakeRequest,
} from '../app/ai_mistake_explain_client';

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
    await AsyncStorage.clear();
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
    const simple = await callExplainMistake({ ...fullRequest, variant: 'eli5' });

    expect(full).toMatchObject({ text: fullText, fullText, eli5Text });
    expect(simple).toMatchObject({
      text: eli5Text,
      model: 'local-cache',
      fromCache: true,
      variant: 'eli5',
    });
    expect(mockCallable).toHaveBeenCalledTimes(1);
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
