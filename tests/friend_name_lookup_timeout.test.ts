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
  mockFriendLookupCallable.mockReset();
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
  expect(mockEnsureStableAuthLinkForStableId).not.toHaveBeenCalled();
  expect(mockHttpsCallableFactory).toHaveBeenCalledWith('friendLookupUser', {
    timeout: FRIEND_NAME_LOOKUP_CALLABLE_MS,
  });
  expect(mockFriendLookupCallable).toHaveBeenCalledWith({ stableId: 'stable-me', query: 'Roma' });
});

test('lookupUserByNickname does not gate the authenticated read on a separate auth-link callable', async () => {
  mockEnsureStableAuthLinkForStableId.mockRejectedValueOnce(new Error('cold auth-link callable'));
  const { lookupUserByNickname } = require('../app/firestore_friends');

  await expect(lookupUserByNickname('Roma')).resolves.toMatchObject({
    uid: 'target-user',
    source: 'name_index',
  });
  expect(mockEnsureStableAuthLinkForStableId).not.toHaveBeenCalled();
  expect(mockFriendLookupCallable).toHaveBeenCalledTimes(1);
});

test('lookupUserByNickname reports unavailable instead of false not-found when the callable hangs', async () => {
  jest.useFakeTimers();
  mockFriendLookupCallable.mockImplementation(() => new Promise(() => {}));
  const {
    lookupUserByNickname,
    FRIEND_NAME_LOOKUP_CALLABLE_MS,
  } = require('../app/firestore_friends');

  const pending = lookupUserByNickname('Roma');
  const assertion = expect(pending).rejects.toThrow('friend_lookup_unavailable');
  await jest.advanceTimersByTimeAsync((FRIEND_NAME_LOOKUP_CALLABLE_MS * 2) + 40);

  await assertion;
});

test('lookupUserByNickname accepts a cold response after the former 2.5 second cutoff', async () => {
  jest.useFakeTimers();
  mockFriendLookupCallable.mockImplementation(() => new Promise((resolve) => {
    setTimeout(() => resolve({
      data: {
        ok: true,
        user: {
          uid: 'target-user',
          source: 'name_index',
          name: 'OlgaZ',
          totalXp: 2400,
          level: 9,
          avatar: 'avatar_9',
          frame: 'frame_9',
          aura: '',
          isPremium: false,
        },
      },
    }), 3_000);
  }));
  const { lookupUserByNickname } = require('../app/firestore_friends');

  const pending = lookupUserByNickname('OlgaZ');
  await jest.advanceTimersByTimeAsync(3_000);

  await expect(pending).resolves.toEqual({
    uid: 'target-user',
    source: 'name_index',
    name: 'OlgaZ',
    profile: {
      name: 'OlgaZ',
      totalXp: 2400,
      level: 9,
      avatar: 'avatar_9',
      frame: 'frame_9',
      aura: '',
      isPremium: false,
    },
  });
});

test('lookupUserByNickname lets the bounded auth bootstrap finish past the former 1.2 second cutoff', async () => {
  jest.useFakeTimers();
  mockEnsureAnonUser.mockImplementation(() => new Promise((resolve) => {
    setTimeout(() => resolve('stable-me'), 1_500);
  }));
  const { lookupUserByNickname } = require('../app/firestore_friends');

  const pending = lookupUserByNickname('Roma');
  await jest.advanceTimersByTimeAsync(1_500);

  await expect(pending).resolves.toMatchObject({ uid: 'target-user' });
  expect(mockFriendLookupCallable).toHaveBeenCalledTimes(1);
});

test('lookupUserByNickname retries one transient callable failure within the first search action', async () => {
  mockFriendLookupCallable
    .mockRejectedValueOnce(new Error('functions/unavailable'))
    .mockResolvedValueOnce({
      data: {
        ok: true,
        user: { uid: 'target-user', source: 'name_index', name: 'OlgaZ' },
      },
    });
  const { lookupUserByNickname } = require('../app/firestore_friends');

  await expect(lookupUserByNickname('OlgaZ')).resolves.toMatchObject({
    uid: 'target-user',
    name: 'OlgaZ',
  });
  expect(mockFriendLookupCallable).toHaveBeenCalledTimes(2);
});

test('lookupUserByNickname reports unavailable instead of not-found after persistent callable failure', async () => {
  mockFriendLookupCallable.mockRejectedValue(new Error('functions/unavailable'));
  const { lookupUserByNickname } = require('../app/firestore_friends');

  await expect(lookupUserByNickname('OlgaZ')).rejects.toThrow('friend_lookup_unavailable');
  expect(mockFriendLookupCallable).toHaveBeenCalledTimes(2);
});
