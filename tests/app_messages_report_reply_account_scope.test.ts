import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
} from '../app/account_generation';

const callable = jest.fn();
const httpsCallable = jest.fn(() => callable);
const keepShardsBalanceLocalAtLeast = jest.fn(async () => 0);
const addShardsLocalOnlyForPendingServerClaim = jest.fn(async () => 0);
let currentUid = 'account-a';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' }, nativeAppVersion: '1.0.0' },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
jest.mock('../app/events', () => ({
  emitAppEvent: jest.fn(),
  onAppEvent: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => currentUid),
}));
jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({})) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable,
}));
jest.mock('../app/shards_system', () => ({
  keepShardsBalanceLocalAtLeast,
  addShardsLocalOnlyForPendingServerClaim,
}));

import { resumePendingReportReplyShardClaims } from '../app/app_messages';

const storage: Record<string, string> = {};
const pendingKey = (owner: string) =>
  `app_messages_report_reply_pending_claims_v2:${encodeURIComponent(owner)}`;
const claim = { messageId: 'report-reply-1', amount: 5, creditedAtMs: 1 };

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('account-a');
  currentUid = 'account-a';
  Object.keys(storage).forEach((key) => delete storage[key]);
  storage[pendingKey('account-a')] = JSON.stringify([claim]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key: string) =>
    storage[key] ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    storage[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    delete storage[key];
  });
  (AsyncStorage.multiRemove as jest.Mock).mockImplementation(async (keys: string[]) => {
    keys.forEach((key) => delete storage[key]);
  });
});

it('does not send an account A pending claim as B after switching immediately after the read', async () => {
  (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(async (key: string) => {
    const value = storage[key] ?? null;
    invalidateAccountGeneration();
    currentUid = 'account-b';
    beginAccountGeneration('account-b');
    return value;
  });

  await expect(resumePendingReportReplyShardClaims())
    .resolves.toEqual({ resolved: 0, pending: 1 });

  expect(callable).not.toHaveBeenCalled();
  expect(keepShardsBalanceLocalAtLeast).not.toHaveBeenCalled();
  expect(addShardsLocalOnlyForPendingServerClaim).not.toHaveBeenCalled();
  expect(JSON.parse(storage[pendingKey('account-a')])).toEqual([claim]);
});

it('does not merge or remove account A claim when its callable resolves after switching to B', async () => {
  let resolveCallable!: (value: { data: unknown }) => void;
  callable.mockImplementationOnce(() => new Promise((resolve) => {
    resolveCallable = resolve;
  }));

  const replay = resumePendingReportReplyShardClaims();
  for (let index = 0; index < 20 && callable.mock.calls.length === 0; index += 1) {
    await Promise.resolve();
  }
  expect(callable).toHaveBeenCalledWith({ messageId: claim.messageId });

  invalidateAccountGeneration();
  currentUid = 'account-b';
  beginAccountGeneration('account-b');
  resolveCallable({ data: { amount: 5, balance: 105 } });

  await expect(replay).resolves.toEqual({ resolved: 0, pending: 1 });
  expect(keepShardsBalanceLocalAtLeast).not.toHaveBeenCalled();
  expect(addShardsLocalOnlyForPendingServerClaim).not.toHaveBeenCalled();
  expect(JSON.parse(storage[pendingKey('account-a')])).toEqual([claim]);
  expect(storage[pendingKey('account-b')]).toBeUndefined();
});
