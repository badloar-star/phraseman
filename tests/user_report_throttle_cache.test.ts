jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: 'test-version' } },
}));
jest.mock('../app/client_reports', () => ({
  submitClientReport: jest.fn(async () => ({ ok: true, id: 'report_1' })),
}));

type AsyncStorageMock = {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  __reset?: () => void;
};

async function loadUserReportWithFreshCache() {
  jest.resetModules();
  const storage = (await import('@react-native-async-storage/async-storage')).default as unknown as AsyncStorageMock;
  storage.__reset?.();
  jest.clearAllMocks();

  const userReport = await import('../app/user_report');
  const clientReports = await import('../app/client_reports');

  return { userReport, storage, clientReports };
}

describe('user report throttle cache', () => {
  const realDateNow = Date.now;

  afterEach(() => {
    Date.now = realDateNow;
  });

  it('drops repeated user or pack reports before rereading throttle storage or sending another server report', async () => {
    Date.now = jest.fn(() => 1_000_000);
    const { userReport, storage, clientReports } = await loadUserReportWithFreshCache();

    await expect(userReport.submitUserReport({
      reportedUid: 'uid_1',
      reportedName: 'Bad Name',
      reason: 'offensive_nickname',
      screen: 'leaderboard',
    })).resolves.toBe('sent');

    await expect(userReport.submitPackReport({
      packId: 'pack_1',
      packTitle: 'Bad Pack',
      reason: 'spam',
      comment: 'duplicate tap',
    })).resolves.toBe('throttled');

    expect(storage.getItem.mock.calls.filter(([key]) => key === 'last_user_report_ts')).toHaveLength(1);
    expect(storage.getItem.mock.calls.filter(([key]) => key === 'user_name')).toHaveLength(1);
    expect(storage.setItem.mock.calls.filter(([key]) => key === 'last_user_report_ts')).toHaveLength(1);
    expect(clientReports.submitClientReport).toHaveBeenCalledTimes(1);
    expect(clientReports.submitClientReport).toHaveBeenCalledWith(
      'user_report',
      expect.objectContaining({
        reportedUid: 'uid_1',
        reason: 'offensive_nickname',
      }),
    );
  });
});
