/**
 * Решение «показать ли приглашённому приветствие про 7 дней» (app/referral_welcome_state.ts).
 * Проверяем все гейты: фича выключена / онбординг не пройден / нет stableId / уже показывали /
 * награда уже получена / есть pending- или applied-код. И одноразовые маркеры.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  decideReferralWelcome,
  markReferralWelcomeSeen,
  markRefereeWelcomeRewarded,
} from '../app/referral_welcome_state';
import { isReferralCloudEnabled } from '../app/referral_flags';
import { getCanonicalUserId } from '../app/user_id_policy';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/referral_flags', () => ({
  isReferralCloudEnabled: jest.fn(() => true),
  __esModule: true,
  default: () => null,
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(() => Promise.resolve('STABLE123')),
  __esModule: true,
  default: () => null,
}));

const mockStorage: Record<string, string> = {};
const SID = 'STABLE123';

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStorage[key] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  });
  (isReferralCloudEnabled as jest.Mock).mockReturnValue(true);
  (getCanonicalUserId as jest.Mock).mockResolvedValue(SID);
  // Базовый «счастливый» сетап: онбординг пройден + пришёл по приглашению (pending-код).
  mockStorage['onboarding_done'] = '1';
  mockStorage['pending_referral_code'] = 'ABCD12';
});

test('показывает приветствие приглашённому: онбординг пройден + есть pending-код', async () => {
  const d = await decideReferralWelcome();
  expect(d.show).toBe(true);
  expect(d.code).toBe('ABCD12');
});

test('показывает по applied-коду, даже если pending уже снят', async () => {
  delete mockStorage['pending_referral_code'];
  mockStorage[`referral_applied_ref::${SID}`] = 'WXYZ99';
  const d = await decideReferralWelcome();
  expect(d.show).toBe(true);
  expect(d.code).toBe('WXYZ99');
});

test('НЕ показывает, если реферал выключен', async () => {
  (isReferralCloudEnabled as jest.Mock).mockReturnValue(false);
  expect((await decideReferralWelcome()).show).toBe(false);
});

test('НЕ показывает до завершения онбординга (защита от наложения на онбординг)', async () => {
  delete mockStorage['onboarding_done'];
  expect((await decideReferralWelcome()).show).toBe(false);
});

test('НЕ показывает без stableId', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue(null);
  expect((await decideReferralWelcome()).show).toBe(false);
});

test('НЕ показывает, если нет ни pending, ни applied кода (человек НЕ по приглашению)', async () => {
  delete mockStorage['pending_referral_code'];
  expect((await decideReferralWelcome()).show).toBe(false);
});

test('НЕ показывает повторно после markReferralWelcomeSeen (одноразовость)', async () => {
  expect((await decideReferralWelcome()).show).toBe(true);
  await markReferralWelcomeSeen();
  expect(mockStorage[`referral_welcome_seen::${SID}`]).toBe('1');
  expect((await decideReferralWelcome()).show).toBe(false);
});

test('НЕ показывает, если приглашённый уже получил свои дни (markRefereeWelcomeRewarded)', async () => {
  await markRefereeWelcomeRewarded();
  expect(mockStorage[`referral_referee_rewarded::${SID}`]).toBe('1');
  expect((await decideReferralWelcome()).show).toBe(false);
});

test('маркеры идемпотентны и не падают без stableId', async () => {
  (getCanonicalUserId as jest.Mock).mockResolvedValue(null);
  await expect(markReferralWelcomeSeen()).resolves.toBeUndefined();
  await expect(markRefereeWelcomeRewarded()).resolves.toBeUndefined();
});
