jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    deviceName: 'Test Device',
    expoConfig: { version: 'test-version' },
    nativeAppVersion: 'test-native-version',
  },
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '17.0' },
  Dimensions: { get: jest.fn(() => ({ width: 390, height: 844 })) },
  PixelRatio: { get: jest.fn(() => 3) },
}));
jest.mock('../app/client_reports', () => ({
  submitClientReport: jest.fn(async () => ({ ok: true, id: 'error_report_1' })),
}));
jest.mock('../app/xp_manager', () => ({
  registerXP: jest.fn(async () => ({ ok: true })),
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stable_user_1'),
}));
jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(async () => false),
}));
jest.mock('../constants/theme', () => ({
  getLevelFromXP: jest.fn(() => 7),
}));

type AsyncStorageMock = {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  __reset?: () => void;
};

async function loadErrorReportWithFreshCache() {
  jest.resetModules();
  const storage = (await import('@react-native-async-storage/async-storage')).default as unknown as AsyncStorageMock;
  storage.__reset?.();
  jest.clearAllMocks();

  await storage.setItem('user_total_xp', '1234');
  await storage.setItem('streak_count', '12');
  await storage.setItem('install_date', '1000');
  await storage.setItem('anon_id', 'anon_1');
  await storage.setItem('user_name', 'Ada');
  jest.clearAllMocks();

  const errorReport = await import('../app/error_report');
  const clientReports = await import('../app/client_reports');
  const xpManager = await import('../app/xp_manager');

  return { errorReport, storage, clientReports, xpManager };
}

describe('error report throttle cache', () => {
  const realDateNow = Date.now;

  afterEach(() => {
    Date.now = realDateNow;
  });

  it('drops repeated bug reports before rereading throttle storage, metadata, server, or XP work', async () => {
    Date.now = jest.fn(() => 3_000_000);
    const { errorReport, storage, clientReports, xpManager } = await loadErrorReportWithFreshCache();

    const payload = {
      screen: 'lesson',
      dataId: 'lesson_1_phrase_1',
      dataText: 'Example phrase',
      comment: 'This explanation is wrong',
    };

    await expect(errorReport.submitErrorReport(payload, 'Ada', 'ru')).resolves.toBe('sent');
    await expect(errorReport.submitErrorReport(payload, 'Ada', 'ru')).resolves.toBe('throttled');

    expect(storage.getItem.mock.calls.filter(([key]) => key === 'last_error_report_ts')).toHaveLength(1);
    expect(storage.getItem.mock.calls.filter(([key]) => key === 'user_total_xp')).toHaveLength(1);
    expect(storage.getItem.mock.calls.filter(([key]) => key === 'streak_count')).toHaveLength(1);
    expect(storage.setItem.mock.calls.filter(([key]) => key === 'last_error_report_ts')).toHaveLength(1);
    expect(clientReports.submitClientReport).toHaveBeenCalledTimes(1);
    expect(clientReports.submitClientReport).toHaveBeenCalledWith(
      'error_report',
      expect.objectContaining({
        dataId: 'lesson_1_phrase_1',
        comment: 'This explanation is wrong',
        userXP: 1234,
        userStreak: 12,
      }),
    );
    expect(xpManager.registerXP).toHaveBeenCalledTimes(1);
  });
});
