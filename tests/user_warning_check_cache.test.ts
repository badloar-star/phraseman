jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/config', () => ({
  IS_EXPO_GO: false,
  CLOUD_SYNC_ENABLED: true,
}));
jest.mock('../app/stable_id', () => ({
  getStableId: jest.fn(async () => 'stable_user_1'),
}));

const mockGet = jest.fn(async () => ({ empty: true, docs: [] }));
const mockWhere = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({ where: mockWhere }));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

type AsyncStorageMock = {
  getItem: jest.Mock<Promise<string | null>, [string]>;
  setItem: jest.Mock<Promise<void>, [string, string]>;
  __reset?: () => void;
};

async function loadUserWarningCheckWithFreshCache() {
  jest.resetModules();
  const storage = (await import('@react-native-async-storage/async-storage')).default as unknown as AsyncStorageMock;
  storage.__reset?.();
  jest.clearAllMocks();
  mockGet.mockClear();
  mockWhere.mockClear();
  mockCollection.mockClear();

  const userWarningCheck = await import('../app/user_warning_check');
  return { userWarningCheck, storage };
}

describe('user warning check cache', () => {
  const realDateNow = Date.now;

  afterEach(() => {
    Date.now = realDateNow;
  });

  it('drops repeated Home warning checks before rereading throttle storage or querying Firestore', async () => {
    Date.now = jest.fn(() => 2_000_000);
    const { userWarningCheck, storage } = await loadUserWarningCheckWithFreshCache();

    await expect(userWarningCheck.checkUserWarning()).resolves.toBeNull();
    await expect(userWarningCheck.checkUserWarning()).resolves.toBeNull();

    expect(storage.getItem.mock.calls.filter(([key]) => key === 'user_warnings_last_fetch_at_v1')).toHaveLength(1);
    expect(storage.getItem.mock.calls.filter(([key]) => key === 'seen_warning_ids')).toHaveLength(1);
    expect(storage.setItem.mock.calls.filter(([key]) => key === 'user_warnings_last_fetch_at_v1')).toHaveLength(1);
    expect(mockCollection).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledWith('uid', '==', 'stable_user_1');
    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});
