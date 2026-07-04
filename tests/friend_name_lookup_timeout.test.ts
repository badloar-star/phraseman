const mockGetCanonicalUserId = jest.fn();
const mockEnsureAnonUser = jest.fn();
const mockEnsureStableAuthLinkForStableId = jest.fn();
const mockFriendLookupCallable = jest.fn();
const mockHttpsCallableFactory = jest.fn();

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: (...args: unknown[]) => mockGetCanonicalUserId(...args),
}));

jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: (...args: unknown[]) => mockEnsureAnonUser(...args),
  ensureStableAuthLinkForStableId: (...args: unknown[]) => mockEnsureStableAuthLinkForStableId(...args),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn((_functions, name: string, options?: { timeout?: number }) => {
    mockHttpsCallableFactory(name, options);
    return mockFriendLookupCallable;
  }),
}));

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  mockGetCanonicalUserId.mockResolvedValue('stable-me');
  mockEnsureAnonUser.mockResolvedValue('stable-me');
  mockEnsureStableAuthLinkForStableId.mockResolvedValue(true);
  mockFriendLookupCallable.mockResolvedValue({
    data: {
      ok: true,
      user: { uid: 'target-user', source: 'name_index', name: 'Roma' },
    },
  });
});

test('lookupUserByNickname uses the fast name-index callable with a bounded timeout', async () => {
  const {
    lookupUserByNickname,
    FRIEND_NAME_LOOKUP_CALLABLE_MS,
  } = require('../app/firestore_friends');

  // Клиент прокидывает полный публичный профиль из ответа сервера (users.progress).
  // Мок отдаёт только uid/source/name, поэтому числовые/строковые поля профиля пустые.
  await expect(lookupUserByNickname('  @Roma  ')).resolves.toEqual({
    uid: 'target-user',
    source: 'name_index',
    name: 'Roma',
    profile: {
      name: 'Roma',
      totalXp: 0,
      level: 0,
      avatar: '',
      frame: '',
      aura: '',
      isPremium: false,
    },
  });

  expect(mockEnsureAnonUser).toHaveBeenCalledTimes(1);
  expect(mockEnsureStableAuthLinkForStableId).toHaveBeenCalledWith('stable-me');
  expect(mockHttpsCallableFactory).toHaveBeenCalledWith('friendLookupUser', {
    timeout: FRIEND_NAME_LOOKUP_CALLABLE_MS,
  });
  expect(mockFriendLookupCallable).toHaveBeenCalledWith({ stableId: 'stable-me', query: 'Roma' });
});

test('lookupUserByNickname returns instead of spinning forever when the callable hangs', async () => {
  jest.useFakeTimers();
  mockFriendLookupCallable.mockImplementation(() => new Promise(() => {}));
  const {
    lookupUserByNickname,
    FRIEND_NAME_LOOKUP_CALLABLE_MS,
  } = require('../app/firestore_friends');

  const pending = lookupUserByNickname('Roma');
  await jest.advanceTimersByTimeAsync(FRIEND_NAME_LOOKUP_CALLABLE_MS + 20);

  await expect(pending).resolves.toBeNull();
});

test('lookupUserByNickname does not call the network when auth preparation hangs', async () => {
  jest.useFakeTimers();
  mockEnsureAnonUser.mockImplementation(() => new Promise(() => {}));
  const {
    lookupUserByNickname,
    FRIEND_NAME_LOOKUP_AUTH_MS,
  } = require('../app/firestore_friends');

  const pending = lookupUserByNickname('Roma');
  await jest.advanceTimersByTimeAsync(FRIEND_NAME_LOOKUP_AUTH_MS + 20);

  await expect(pending).resolves.toBeNull();
  expect(mockFriendLookupCallable).not.toHaveBeenCalled();
});
