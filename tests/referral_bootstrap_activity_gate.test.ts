import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyManualReferralCode,
  tryApplyPendingReferral,
} from '../app/referral_bootstrap';
import { callReferralApply } from '../app/referral_cloud';
import { getCanonicalUserId } from '../app/user_id_policy';
import { hasLocalReferralExistingAccountActivity } from '../app/referral_account_activity';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-linking', () => ({
  parse: jest.fn(() => ({ queryParams: {} })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('../app/config', () => ({
  STORE_URL_ANDROID: 'https://play.google.com/store/apps/details?id=com.phraseman',
}));
jest.mock('../app/firebase', () => ({
  logEvent: jest.fn(),
}));
jest.mock('../app/referral_cloud', () => ({
  callReferralApply: jest.fn(),
  getReferralCallableErrorCode: jest.fn(() => null),
  isReferralCloudEnabled: jest.fn(() => true),
}));
jest.mock('../app/shards_system', () => ({
  loadShardsFromCloud: jest.fn(() => Promise.resolve()),
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(() => Promise.resolve('STABLE123')),
}));
jest.mock('../app/referral_account_activity', () => ({
  hasLocalReferralExistingAccountActivity: jest.fn(() => Promise.resolve(false)),
}));

const storage = AsyncStorage as unknown as {
  __reset: () => void;
  setItem: jest.Mock;
  getItem: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  storage.__reset();
  (getCanonicalUserId as jest.Mock).mockResolvedValue('STABLE123');
  (hasLocalReferralExistingAccountActivity as jest.Mock).mockResolvedValue(false);
  (callReferralApply as jest.Mock).mockResolvedValue({
    ok: true,
    already: false,
    referrerStableId: 'REFERRER456',
    refCode: 'CODE99',
  });
});

test('регрессия: ручной реферальный код не принимается на активном локальном аккаунте', async () => {
  (hasLocalReferralExistingAccountActivity as jest.Mock).mockResolvedValue(true);

  const status = await applyManualReferralCode('code99');

  expect(status).toBe('too_old');
  expect(callReferralApply).not.toHaveBeenCalled();
  expect(await storage.getItem('pending_referral_code')).toBeNull();
});

test('регрессия: pending-код на активном аккаунте снимается без сетевой apply-попытки', async () => {
  await storage.setItem('pending_referral_code', 'CODE99');
  (hasLocalReferralExistingAccountActivity as jest.Mock).mockResolvedValue(true);

  const status = await tryApplyPendingReferral();

  expect(status).toBe('too_old');
  expect(callReferralApply).not.toHaveBeenCalled();
  expect(await storage.getItem('pending_referral_code')).toBeNull();
});
