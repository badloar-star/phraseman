/**
 * Кэш чтения подарков на сессию + слияние одновременных запросов (координатор §70).
 *
 * Трасса [GIFT-ACCESS-READ] 2026-10-02: на одном холодном старте документ users/{uid}
 * читался ~5 раз — три одновременные проверки доступа и ещё по одной после каждого
 * сброса кэша Premium. Сторож держит правило «одно чтение на вход».
 */
const mockGetCanonicalUserId = jest.fn<Promise<string | null>, []>(async () => 'uid_a');
const mockGetDoc = jest.fn();

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: () => mockGetCanonicalUserId() }));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  reportSwallowed: jest.fn(),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  getFirestore: () => ({ db: true }),
  doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  getDoc: (ref: unknown) => mockGetDoc(ref),
}));

import { invalidateGiftAccessCache, readGiftAccessFromCloud } from '../app/gift_access_cloud';

function snapshot(progress: Record<string, unknown>) {
  return { data: () => ({ progress }) };
}

const LOYALTY = { loyalty_gift_granted_at_ms: 1000, loyalty_gift_until_ms: 5000 };

beforeEach(() => {
  invalidateGiftAccessCache('test_reset');
  mockGetDoc.mockReset();
  mockGetCanonicalUserId.mockReset();
  mockGetCanonicalUserId.mockResolvedValue('uid_a');
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  (console.log as jest.Mock).mockRestore?.();
});

describe('gift access read: one network read per session', () => {
  it('merges concurrent calls into one document read', async () => {
    let release: (value: unknown) => void = () => undefined;
    mockGetDoc.mockImplementation(() => new Promise((resolve) => { release = resolve; }));

    const pending = [
      readGiftAccessFromCloud('loyalty'),
      readGiftAccessFromCloud('loyalty'),
      readGiftAccessFromCloud('intro'),
    ];
    await new Promise((resolve) => setImmediate(resolve));
    release(snapshot(LOYALTY));
    const [a, b, c] = await Promise.all(pending);

    expect(mockGetDoc).toHaveBeenCalledTimes(1);
    expect(mockGetDoc).toHaveBeenCalledWith('users/uid_a');
    expect(a).toEqual({ grantedAtMs: 1000, endsAtMs: 5000 });
    expect(b).toEqual({ grantedAtMs: 1000, endsAtMs: 5000 });
    expect(c).toEqual({ grantedAtMs: null, endsAtMs: null });
  });

  it('serves later calls of both kinds from the session cache', async () => {
    mockGetDoc.mockResolvedValue(snapshot({ ...LOYALTY, intro_access_granted_at_ms: 7 }));
    await readGiftAccessFromCloud('loyalty');
    const loyalty = await readGiftAccessFromCloud('loyalty');
    const intro = await readGiftAccessFromCloud('intro');

    expect(mockGetDoc).toHaveBeenCalledTimes(1);
    expect(loyalty?.endsAtMs).toBe(5000);
    expect(intro?.grantedAtMs).toBe(7);
  });

  it('does not cache a failed read: the next call goes to the network again', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('unavailable'));
    expect(await readGiftAccessFromCloud('loyalty')).toBeNull();

    mockGetDoc.mockResolvedValueOnce(snapshot(LOYALTY));
    expect(await readGiftAccessFromCloud('loyalty')).toEqual({ grantedAtMs: 1000, endsAtMs: 5000 });
    expect(mockGetDoc).toHaveBeenCalledTimes(2);
  });

  it('another account never reads the previous account cache', async () => {
    mockGetDoc.mockResolvedValueOnce(snapshot(LOYALTY));
    await readGiftAccessFromCloud('loyalty');

    mockGetCanonicalUserId.mockResolvedValue('uid_b');
    mockGetDoc.mockResolvedValueOnce(snapshot({}));
    expect(await readGiftAccessFromCloud('loyalty')).toEqual({ grantedAtMs: null, endsAtMs: null });
    expect(mockGetDoc).toHaveBeenLastCalledWith('users/uid_b');
  });

  it('explicit invalidation forces a fresh read', async () => {
    mockGetDoc.mockResolvedValue(snapshot(LOYALTY));
    await readGiftAccessFromCloud('loyalty');
    invalidateGiftAccessCache('test');
    await readGiftAccessFromCloud('loyalty');
    expect(mockGetDoc).toHaveBeenCalledTimes(2);
  });

  it('a late answer for an invalidated read does not repopulate the cache', async () => {
    let releaseOld: (value: unknown) => void = () => undefined;
    mockGetDoc.mockImplementationOnce(() => new Promise((resolve) => { releaseOld = resolve; }));
    const oldRead = readGiftAccessFromCloud('loyalty');
    await new Promise((resolve) => setImmediate(resolve));

    invalidateGiftAccessCache('account_switch');
    releaseOld(snapshot(LOYALTY));
    await oldRead;

    mockGetDoc.mockResolvedValueOnce(snapshot({}));
    expect(await readGiftAccessFromCloud('loyalty')).toEqual({ grantedAtMs: null, endsAtMs: null });
    expect(mockGetDoc).toHaveBeenCalledTimes(2);
  });

  it('returns null without a canonical user and does not touch the network', async () => {
    mockGetCanonicalUserId.mockResolvedValue(null);
    expect(await readGiftAccessFromCloud('loyalty')).toBeNull();
    expect(mockGetDoc).not.toHaveBeenCalled();
  });
});
