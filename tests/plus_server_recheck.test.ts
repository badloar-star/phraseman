/* eslint-disable import/first */
// зачем (координатор 25.10, Б2): сервер отказал «нужен Plus», а телефон считал Plus включённым. Сторож: за флагом, не чаще раза
// в 10 мин, перечитывает облако существующим forcePremiumAccessCloudRestore, пишет итог [PLUS-RECHECK] и просит пересчёт доступа;
// локальные ключи Plus не трогает.
const mockFlag = { on: false };
const mockForceRestore = jest.fn(async () => true);
const mockAccess = jest.fn(async () => true);
const mockInvalidate = jest.fn();
const mockEmit = jest.fn();
const mockStore: Record<string, string> = { premium_active: 'true', premium_plan: 'yearly', premium_expiry: '0' };
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('../app/remote_flags', () => ({ getRemoteBool: (key: string) => key === 'plus_server_recheck_enabled' && mockFlag.on }));
jest.mock('../app/premium_guard', () => ({
  forcePremiumAccessCloudRestore: (reason: string) => mockForceRestore(reason),
  getVerifiedPremiumAccessStatus: () => mockAccess(),
  invalidatePremiumCache: () => mockInvalidate(),
}));
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmit(...args) }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    multiGet: async (keys: string[]) => keys.map((k) => [k, mockStore[k] ?? null]),
    setItem: (...args: unknown[]) => mockSetItem(...args),
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
  },
}));

import { PLUS_RECHECK_MIN_INTERVAL_MS, recheckPlusAfterServerRefusal, resetPlusRecheckForTests } from '../app/plus_server_recheck';

describe('Plus recheck after the server says «Plus required»', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    resetPlusRecheckForTests();
    mockFlag.on = false;
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('flag off: nothing is read or restored', async () => {
    await recheckPlusAfterServerRefusal('dialogue_v2_freeform_start', 1_000_000);
    expect(mockForceRestore).not.toHaveBeenCalled();
    expect(mockAccess).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('flag on: one cloud recheck, verdict logged, recompute requested, local keys untouched', async () => {
    mockFlag.on = true;
    mockAccess.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await recheckPlusAfterServerRefusal('dialogue_v2_freeform_start', 1_000_000);
    expect(mockForceRestore).toHaveBeenCalledWith('plus_recheck:dialogue_v2_freeform_start');
    expect(mockInvalidate).toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith('premium_server_recheck_done', { surface: 'dialogue_v2_freeform_start', accessAfter: false });
    const done = warn.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[PLUS-RECHECK] done'));
    expect(done).toContain('"verdict":"now_matches_server"');
    expect(done).toContain('"premium_plan":"yearly"');
    expect(done).not.toMatch(/uid|email|token/i);
    expect(mockSetItem).not.toHaveBeenCalled();
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });

  it('flag on: a second refusal within 10 minutes is skipped, after that it runs again', async () => {
    mockFlag.on = true;
    await recheckPlusAfterServerRefusal('s', 1_000_000);
    await recheckPlusAfterServerRefusal('s', 1_000_000 + PLUS_RECHECK_MIN_INTERVAL_MS - 1);
    expect(mockForceRestore).toHaveBeenCalledTimes(1);
    await recheckPlusAfterServerRefusal('s', 1_000_000 + PLUS_RECHECK_MIN_INTERVAL_MS);
    expect(mockForceRestore).toHaveBeenCalledTimes(2);
  });

  it('a failing restore never throws out of the recheck', async () => {
    mockFlag.on = true;
    mockForceRestore.mockRejectedValueOnce(new Error('offline'));
    await expect(recheckPlusAfterServerRefusal('s', 1_000_000)).resolves.toBeUndefined();
    expect(warn.mock.calls.map((c) => String(c[0])).some((l) => l.startsWith('[PLUS-RECHECK] failed'))).toBe(true);
  });
});
