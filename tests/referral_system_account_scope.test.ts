const mockStorage = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, mockStorage.get(key) ?? null])),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((key) => mockStorage.delete(key)); }),
  },
}));
jest.mock('expo-crypto', () => ({
  getRandomValues: (bytes: Uint8Array) => { bytes.fill(7); return bytes; },
}));
jest.mock('../app/stable_id', () => ({
  getStableId: async () => require('../app/account_generation').captureAccountGeneration().stableId,
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: async () => require('../app/account_generation').captureAccountGeneration().stableId,
}));
jest.mock('../app/cloud_sync', () => ({ ensureStableAuthLinkForStableId: async () => true }));
jest.mock('../app/referral_cloud', () => ({
  isReferralCloudEnabled: () => false,
  callReferralEnsureMyCode: jest.fn(),
}));

import {
  __resetAccountGenerationForTests,
  ensureAccountGeneration,
} from '../app/account_generation';
import {
  getReferralCode,
  referralCodeStorageKey,
} from '../app/referral_system';

describe('referral code persistent account scope', () => {
  beforeEach(() => {
    mockStorage.clear();
    __resetAccountGenerationForTests();
  });

  test('an unowned legacy code is discarded and never returned to another account', async () => {
    mockStorage.set('user_referral_code', 'ALICE1');
    ensureAccountGeneration('alice');
    await expect(getReferralCode()).resolves.toBeNull();
    expect(mockStorage.has('user_referral_code')).toBe(false);

    mockStorage.set(referralCodeStorageKey('alice'), 'ALICE2');
    await expect(getReferralCode()).resolves.toBe('ALICE2');

    ensureAccountGeneration('bob');
    await expect(getReferralCode()).resolves.toBeNull();
    expect(mockStorage.get(referralCodeStorageKey('alice'))).toBe('ALICE2');
    expect(mockStorage.has(referralCodeStorageKey('bob'))).toBe(false);
  });
});
