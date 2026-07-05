/**
 * Фикс воронки 2026-07-04: локальный activity-гейт УДАЛЁН из referral_bootstrap.
 * Раньше «любая учебная активность» (в т.ч. пройденный урок 1 — ровно то, что просит
 * текст приглашения) навсегда стирала pending-код БЕЗ сетевой попытки. Теперь вердикт
 * «слишком старый аккаунт» выносит только сервер (по неподделываемому createTime),
 * а клиент чистит pending только по терминальным серверным статусам.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyManualReferralCode,
  tryApplyPendingReferral,
} from '../app/referral_bootstrap';
import { callReferralApply } from '../app/referral_cloud';
import { getCanonicalUserId } from '../app/user_id_policy';

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
jest.mock('../app/firestore_friend_requests', () => ({
  sendFriendRequest: jest.fn(() => Promise.resolve('sent')),
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
  (callReferralApply as jest.Mock).mockResolvedValue({
    ok: true,
    already: false,
    referrerStableId: 'REFERRER456',
    refCode: 'CODE99',
  });
});

test('фикс воронки: ручной код ПРИМЕНЯЕТСЯ даже при локальной учебной активности (решает сервер)', async () => {
  // Локально уже есть XP/прогресс урока — раньше это давало мгновенный too_old без сети.
  await storage.setItem('user_total_xp', '120');
  await storage.setItem('lesson1_pass_count', '1');

  const status = await applyManualReferralCode('code99');

  expect(status).toBe('applied');
  expect(callReferralApply).toHaveBeenCalledWith({ refereeStableId: 'STABLE123', refCode: 'CODE99' });
});

test('фикс воронки: pending-код с локальной активностью уходит на сервер, а не стирается молча', async () => {
  // Свой stableId на тест: ключ referral_applied_ref::<stableId> из соседнего теста не мешает.
  (getCanonicalUserId as jest.Mock).mockResolvedValue('STABLE_PENDING');
  await storage.setItem('pending_referral_code', 'CODE22');
  await storage.setItem('user_total_xp', '120');

  const status = await tryApplyPendingReferral();

  expect(status).toBe('applied');
  expect(callReferralApply).toHaveBeenCalledTimes(1);
  // Успешный apply — pending снимается.
  expect(await storage.getItem('pending_referral_code')).toBeNull();
});

test('серверный вердикт TOO_OLD терминален: pending снимается, статус too_old', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue('STABLE_TOOOLD');
  await storage.setItem('pending_referral_code', 'CODE33');
  (callReferralApply as jest.Mock).mockRejectedValue(new Error('REFERRAL_REFEREE_ACCOUNT_TOO_OLD'));

  const status = await tryApplyPendingReferral();

  expect(status).toBe('too_old');
  expect(await storage.getItem('pending_referral_code')).toBeNull();
});

test('needs_link НЕ терминален: pending-код сохраняется для ретрая на следующем старте/флаше', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue('STABLE_NOLINK');
  await storage.setItem('pending_referral_code', 'CODE44');
  (callReferralApply as jest.Mock).mockRejectedValue(new Error('LINK_ACCOUNT_REQUIRED'));

  const status = await tryApplyPendingReferral();

  expect(status).toBe('needs_link');
  expect(await storage.getItem('pending_referral_code')).toBe('CODE44');
});
