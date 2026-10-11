// зачем (владелец 11.10, журнал 16; §CORE-0165): восстановление уже читает users/{uid} — подарок засевается из этого
// документа: проверка доступа не читает его второй раз, а активный подарок лояльности сохраняет проверенную копию срока.
const mockGetDoc = jest.fn();
const mockRemember = jest.fn(async () => undefined);
const asyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
  removeItem: jest.fn(async (k: string) => { delete asyncStore[k]; }),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'uid_a') }));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  reportSwallowed: jest.fn(),
}));
jest.mock('../app/gift_access_local_copy', () => ({ rememberVerifiedLoyaltyGift: mockRemember }));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  getFirestore: () => ({ db: true }),
  doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  getDoc: (ref: unknown) => mockGetDoc(ref),
}));

import { invalidateGiftAccessCache, readGiftAccessFromCloud, seedGiftAccessCacheFromProgress } from '../app/gift_access_cloud';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  invalidateGiftAccessCache('test_reset');
  mockGetDoc.mockReset();
  mockRemember.mockClear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('засев подарков из восстановления', () => {
  it('после засева проверка доступа не читает users/{uid} второй раз', async () => {
    seedGiftAccessCacheFromProgress('uid_a', { loyalty_gift_until_ms: 0 });
    await expect(readGiftAccessFromCloud('loyalty')).resolves.toEqual({ grantedAtMs: null, endsAtMs: null });
    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('активный подарок лояльности сохраняет проверенную копию срока', async () => {
    const until = Date.now() + 60 * 60 * 1000;
    seedGiftAccessCacheFromProgress('uid_a', { loyalty_gift_until_ms: until, loyalty_gift_granted_at_ms: 1 });
    await flush(); await flush();
    expect(mockRemember).toHaveBeenCalledWith('uid_a', until);
  });

  it('истёкший подарок копию не пишет', async () => {
    seedGiftAccessCacheFromProgress('uid_a', { loyalty_gift_until_ms: Date.now() - 1000 });
    await flush(); await flush();
    expect(mockRemember).not.toHaveBeenCalled();
  });

  it('засев для другого аккаунта не подменяет чтение текущего', async () => {
    seedGiftAccessCacheFromProgress('uid_b', { loyalty_gift_until_ms: Date.now() + 60_000 });
    mockGetDoc.mockResolvedValue({ data: () => ({ progress: {} }) });
    await expect(readGiftAccessFromCloud('loyalty')).resolves.toEqual({ grantedAtMs: null, endsAtMs: null });
    expect(mockGetDoc).toHaveBeenCalledWith('users/uid_a');
  });

  it('без документа — ничего не засевает', async () => {
    seedGiftAccessCacheFromProgress('uid_a', undefined);
    mockGetDoc.mockResolvedValue({ data: () => ({ progress: {} }) });
    await readGiftAccessFromCloud('loyalty');
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });
});
