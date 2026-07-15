import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';

const mockCallable = jest.fn();
const mockEmitAppEvent = jest.fn();
const mockSyncPublicProfileSnapshot = jest.fn(async () => {});
const mockMarkVipCelebrationPending = jest.fn(async () => {});

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));
jest.mock('@react-native-firebase/auth', () => {
  const auth = () => ({
    currentUser: { uid: 'firebase-auth-a', getIdToken: jest.fn(async () => 'token') },
  });
  return { __esModule: true, default: auth };
});
jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  ENABLE_DEV_TOOLS: false,
  IS_EXPO_GO: false,
}));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => 'stable-a'),
  ensureStableAuthLinkForStableId: jest.fn(async () => true),
  resetAnonAuthCacheForSignOut: jest.fn(),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumAccessStatus: jest.fn(async () => false),
  invalidatePremiumCache: jest.fn(),
}));
jest.mock('../app/events', () => ({ emitAppEvent: mockEmitAppEvent }));
jest.mock('../app/public_profile_snapshot', () => ({
  syncPublicProfileSnapshot: mockSyncPublicProfileSnapshot,
}));
jest.mock('../app/vip_celebration_state', () => ({
  markVipCelebrationPending: mockMarkVipCelebrationPending,
}));
jest.mock('../app/vip_survey_dev_auth', () => ({
  readSavedDevCredential: jest.fn(async () => null),
  signInWithDevEmailCredential: jest.fn(async () => 'dev-auth'),
}));

import { submitVipSurveyFromApp, type SubmitVipSurveyResponse } from '../app/vip_survey';

const response: SubmitVipSurveyResponse = {
  ok: true,
  alreadyGranted: false,
  uid: 'stable-a',
  grantAt: '1700000000000',
  vipFrom: '1700000000000',
  vipUntil: '4700000000000',
  vipPlan: 'survey_vip',
  rewardDays: 30,
};

const params = {
  messageId: 'message-a',
  answers: {},
  reviewIntent: 'not_now' as const,
  storeOpened: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

describe('VIP survey account scoping', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    beginAccountGeneration('stable-a');
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
    jest.clearAllMocks();
    mockSyncPublicProfileSnapshot.mockResolvedValue(undefined);
    mockMarkVipCelebrationPending.mockResolvedValue(undefined);
  });

  afterEach(() => {
    __resetAccountGenerationForTests();
  });

  it('preserves the current-account success flow', async () => {
    mockCallable.mockResolvedValue({ data: response });

    await expect(submitVipSurveyFromApp(params)).resolves.toEqual(response);

    expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
    expect(mockMarkVipCelebrationPending).toHaveBeenCalledWith(response.grantAt);
    expect(mockEmitAppEvent).toHaveBeenCalledWith('vip_activated');
    expect(mockEmitAppEvent).toHaveBeenCalledWith(
      'premium_access_changed',
      { active: true, source: 'vip' },
    );
    expect(mockSyncPublicProfileSnapshot).toHaveBeenCalledWith({
      reason: 'entitlement_change',
      isVip: true,
      isPremium: true,
    });
  });

  it('rejects a callable result belonging to the account that was switched away', async () => {
    const callable = deferred<{ data: SubmitVipSurveyResponse }>();
    mockCallable.mockReturnValue(callable.promise);
    const pending = submitVipSurveyFromApp(params);
    const rejection = expect(pending).rejects.toThrow('vip_survey_account_changed');
    await flushAsync();

    invalidateAccountGeneration();
    beginAccountGeneration('stable-b');
    callable.resolve({ data: response });

    await rejection;
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(mockMarkVipCelebrationPending).not.toHaveBeenCalled();
    expect(mockEmitAppEvent).not.toHaveBeenCalled();
    expect(mockSyncPublicProfileSnapshot).not.toHaveBeenCalled();
  });

  it('does not emit or celebrate when the account changes during persistence', async () => {
    mockCallable.mockResolvedValue({ data: response });
    const write = deferred<void>();
    (AsyncStorage.multiSet as jest.Mock).mockReturnValueOnce(write.promise);
    const pending = submitVipSurveyFromApp(params);
    const rejection = expect(pending).rejects.toThrow('vip_survey_account_changed');
    await flushAsync();

    expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
    invalidateAccountGeneration();
    beginAccountGeneration('stable-b');
    write.resolve();

    await rejection;
    expect(mockMarkVipCelebrationPending).not.toHaveBeenCalled();
    expect(mockEmitAppEvent).not.toHaveBeenCalled();
    expect(mockSyncPublicProfileSnapshot).not.toHaveBeenCalled();
  });

  it('stops before events and profile sync when the account changes during celebration', async () => {
    mockCallable.mockResolvedValue({ data: response });
    const celebration = deferred<void>();
    mockMarkVipCelebrationPending.mockReturnValueOnce(celebration.promise);
    const pending = submitVipSurveyFromApp(params);
    const rejection = expect(pending).rejects.toThrow('vip_survey_account_changed');
    await flushAsync();

    expect(mockMarkVipCelebrationPending).toHaveBeenCalledTimes(1);
    invalidateAccountGeneration();
    beginAccountGeneration('stable-b');
    celebration.resolve();

    await rejection;
    expect(mockEmitAppEvent).not.toHaveBeenCalled();
    expect(mockSyncPublicProfileSnapshot).not.toHaveBeenCalled();
  });
});
