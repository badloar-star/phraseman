// PM-213 — кэш друзей принадлежит аккаунту: поздний диск и смена аккаунта не мешают списки.
//
// зачем: `friends_tab_swr_v1` — общий ключ без uid, а `warm`/`_profilesCache`/once-промис жили
// до перезапуска процесса. Чужой список мог попасть на первый кадр нового аккаунта, а чтение
// диска, начатое прошлым владельцем, — лечь в память нового. Тест держит оба сценария.
export {};

const mockStore: Record<string, string> = {};
let mockReleasers: Array<() => void> = [];
const releaseReads = (): void => { const current = mockReleasers; mockReleasers = []; current.forEach((release) => release()); };
let mockGateReads = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => {
      if (mockGateReads) await new Promise<void>((resolve) => { mockReleasers.push(resolve); });
      return mockStore[key] ?? null;
    }),
    setItem: jest.fn(async (key: string, value: string) => { mockStore[key] = value; }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((key) => { delete mockStore[key]; }); }),
  },
}));

let mockGeneration = 1;
let mockStableId: string | null = 'stable-A';
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: mockGeneration, stableId: mockStableId, phase: mockStableId ? 'active' : 'transitioning' }),
  isCurrentAccountGeneration: (token: { generation: number; stableId: string | null }) =>
    token.generation === mockGeneration && token.stableId === mockStableId,
}));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  reportSwallowed: jest.fn(),
}));

const SWR_KEY = 'friends_tab_swr_v1';
const friendsOf = (uid: string) => JSON.stringify({
  canonicalUid: uid,
  friends: [{ uid: `${uid}-friend` }],
  requests: [],
});

async function load(): Promise<typeof import('../app/friends_tab_swr_warm')> {
  jest.resetModules();
  return import('../app/friends_tab_swr_warm');
}

describe('friends tab SWR warm cache is account-scoped', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;

  beforeEach(() => {
    Object.keys(mockStore).forEach((key) => { delete mockStore[key]; });
    mockGeneration = 1;
    mockStableId = 'stable-A';
    mockGateReads = false;
    mockReleasers = [];
    warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    log = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    log.mockRestore();
  });

  it('reset clears memory and disk so the next owner never sees the previous friends', async () => {
    mockStore[SWR_KEY] = friendsOf('uid-A');
    const warm = await load();
    await warm.startFriendsTabSwrPrime();
    expect(warm.peekFriendsTabSwrWarm()?.canonicalUid).toBe('uid-A');

    await warm.resetFriendsTabSwrWarmForAccountSwitch();

    expect(warm.peekFriendsTabSwrWarm()).toBeNull();
    expect(Object.keys(warm.peekProfilesCache())).toHaveLength(0);
    expect(mockStore[SWR_KEY]).toBeUndefined();
    // once-промис сброшен: прогрев для нового владельца читает диск заново, а не отдаёт старое.
    mockStore[SWR_KEY] = friendsOf('uid-B');
    await warm.startFriendsTabSwrPrime();
    expect(warm.peekFriendsTabSwrWarm()?.canonicalUid).toBe('uid-B');
  });

  it('discards a disk read that finishes after the account changed', async () => {
    mockStore[SWR_KEY] = friendsOf('uid-A');
    const warm = await load();
    mockGateReads = true;
    const pending = warm.startFriendsTabSwrPrime();
    await Promise.resolve();

    mockGeneration += 1;
    mockStableId = 'stable-B';
    mockGateReads = false;
    releaseReads();
    await pending;

    expect(warm.peekFriendsTabSwrWarm()).toBeNull();
    expect(warn.mock.calls.some(([message]) => String(message).includes('[FRIENDS-WARM] prime отброшен'))).toBe(true);

    // Следующий вызов прочитает диск уже для текущего владельца.
    mockStore[SWR_KEY] = friendsOf('uid-B');
    await warm.startFriendsTabSwrPrime();
    expect(warm.peekFriendsTabSwrWarm()?.canonicalUid).toBe('uid-B');
  });

  it('discards a read started before reset even if the generation token did not change yet', async () => {
    mockStore[SWR_KEY] = friendsOf('uid-A');
    const warm = await load();
    mockGateReads = true;
    const pending = warm.startFriendsTabSwrPrime();
    await Promise.resolve();

    await warm.resetFriendsTabSwrWarmForAccountSwitch();
    mockGateReads = false;
    releaseReads();
    await pending;

    expect(warm.peekFriendsTabSwrWarm()).toBeNull();
  });
});
