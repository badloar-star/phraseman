import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';
import { submitMaxVoiceFeedback, type VoiceFeedbackInput } from '../app/max_voice_feedback_client';
import {
  enqueueVoiceFeedback,
  flushVoiceFeedbackOutbox,
} from '../app/max_voice_feedback_outbox';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));

let mockReleaseWarmup: (() => void) | null = null;
let mockWarmupObserved: Promise<void> = Promise.resolve();
let mockObserveWarmup: (() => void) | null = null;
const mockWarmupStarted = jest.fn();
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(() => {
    mockWarmupStarted();
    mockObserveWarmup?.();
    return new Promise<boolean>((resolve) => {
      mockReleaseWarmup = () => resolve(true);
    });
  }),
}));

const mockCallable = jest.fn(async () => ({ data: { ok: true, id: 'feedback-A-session-1' } }));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));
jest.mock('../app/callable_timeout', () => ({
  withCallableTimeout: <T>(promise: Promise<T>) => promise,
}));

const input: VoiceFeedbackInput = {
  sessionId: 'session-1',
  message: 'Спасибо за урок',
  rating: 5,
  lang: 'ru',
};

describe('MAX feedback callable account ownership', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    __resetAccountGenerationForTests();
    beginAccountGeneration('account-A');
    mockCallable.mockClear();
    mockWarmupStarted.mockClear();
    mockReleaseWarmup = null;
    mockWarmupObserved = new Promise<void>((resolve) => { mockObserveWarmup = resolve; });
  });

  it('keeps A expectedStableUid through App Check warmup and never dequeues into B', async () => {
    await enqueueVoiceFeedback('account-A', input);
    const flush = flushVoiceFeedbackOutbox('account-A', submitMaxVoiceFeedback);
    await mockWarmupObserved;
    expect(mockWarmupStarted).toHaveBeenCalledTimes(1);

    await withAccountTransitionLock(async () => {
      invalidateAccountGeneration();
      beginAccountGeneration('account-B');
    });
    mockReleaseWarmup?.();

    await expect(flush).resolves.toEqual({ sent: 0, left: 1 });
    expect(mockCallable).toHaveBeenCalledWith({
      payload: expect.objectContaining({
        sessionId: 'session-1',
        expectedStableUid: 'account-A',
      }),
    });
    expect(await AsyncStorage.getItem('max_voice_feedback_outbox_v1:account-B')).toBeNull();
    expect(await AsyncStorage.getItem('max_voice_feedback_outbox_v1:account-A')).not.toBeNull();
  });
});
