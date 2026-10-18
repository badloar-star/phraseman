// 18.10 (владелец «ввёл имя — НЕ СОХРАНИЛОСЬ», координатор 09:25 (в)): ник, введённый без входа/сети, ждёт на телефоне и уходит
// одним nameReserve при возврате в приложение / входе; занято → прежнее имя возвращается, окно покажет «занято».
const mockStore = new Map<string, string>();
const mockReserve = jest.fn();
const mockStableId = { value: 'stable-a' as string | null };

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStore.delete(key); }),
  multiSet: jest.fn(async (pairs: [string, string][]) => { for (const [k, v] of pairs) mockStore.set(k, v); }),
}));
jest.mock('react-native', () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), currentState: 'active' } }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/stable_id', () => ({ peekStableId: () => mockStableId.value }));
jest.mock('../app/swallow_log', () => ({ noteSwallowedAs: (_tag: string, fallback: unknown) => () => fallback }));
jest.mock('../app/firestore_leaderboard', () => ({ reserveNameDetailed: (...args: unknown[]) => mockReserve(...args) }));
jest.mock('../app/app_snapshot_store', () => ({ patchAppSnapshot: jest.fn() }));
jest.mock('../app/nickname_change_helpers', () => ({ updateLocalNameReferences: jest.fn(async () => undefined) }));
jest.mock('../app/auth_provider', () => ({ subscribeFirebaseAuthUid: jest.fn(() => () => undefined) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pending: typeof import('../app/nickname_rename_pending') = require('../app/nickname_rename_pending');

beforeEach(() => {
  mockStore.clear();
  mockReserve.mockReset();
  mockStableId.value = 'stable-a';
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('nickname rename pending sync', () => {
  it('sends the pending name once and clears it when the server accepts', async () => {
    mockStore.set('user_name', 'New name');
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockReserve.mockResolvedValue({ status: 'ok' });
    await pending.flushNicknameRenamePending('test');
    expect(mockReserve).toHaveBeenCalledWith('New name', 'Old name', { source: 'settings' });
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(false);
    expect(mockStore.get('user_name')).toBe('New name');
  });

  it('taken → previous name comes back on the phone and the modal is told to show «taken»', async () => {
    mockStore.set('user_name', 'Busy name');
    await pending.markNicknameRenamePending('Busy name', 'Old name');
    mockReserve.mockResolvedValue({ status: 'taken' });
    await pending.flushNicknameRenamePending('test');
    expect(mockStore.get('user_name')).toBe('Old name');
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(false);
    expect(await pending.takeNicknameRenameTakenNotice()).toBe('Busy name');
    expect(await pending.takeNicknameRenameTakenNotice()).toBeNull();
  });

  it('still no sign-in / network → keeps waiting, name stays', async () => {
    mockStore.set('user_name', 'New name');
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockReserve.mockResolvedValue({ status: 'error' });
    await pending.flushNicknameRenamePending('test');
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(true);
    expect(mockStore.get('user_name')).toBe('New name');
  });

  it('rate limited → keeps the pending record, name stays, no «taken» notice', async () => {
    mockStore.set('user_name', 'New name');
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockReserve.mockResolvedValue({ status: 'rate_limited', nextChangeAt: 1 });
    await pending.flushNicknameRenamePending('test');
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(true);
    expect(mockStore.get('user_name')).toBe('New name');
    expect(await pending.takeNicknameRenameTakenNotice()).toBeNull();
  });

  it('listens for app return only while a name is pending — no forever listener', async () => {
    const { AppState } = jest.requireMock('react-native') as { AppState: { addEventListener: jest.Mock } };
    const remove = jest.fn();
    AppState.addEventListener.mockClear();
    AppState.addEventListener.mockReturnValue({ remove });
    // свежий экземпляр модуля: слушатели прошлых тестов живут в состоянии прежнего
    let fresh!: typeof import('../app/nickname_rename_pending');
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      fresh = require('../app/nickname_rename_pending');
    });
    mockStore.set('user_name', 'New name');
    await fresh.markNicknameRenamePending('New name', 'Old name');
    expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
    mockReserve.mockResolvedValue({ status: 'ok' });
    await fresh.flushNicknameRenamePending('test');
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('does not send a pending name of another account or one already superseded by a newer local name', async () => {
    mockStore.set('user_name', 'New name');
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockStableId.value = 'stable-b';
    await pending.flushNicknameRenamePending('test');
    expect(mockReserve).not.toHaveBeenCalled();
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(false);

    mockStableId.value = 'stable-a';
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockStore.set('user_name', 'Even newer');
    await pending.flushNicknameRenamePending('test');
    expect(mockReserve).not.toHaveBeenCalled();
  });

  // Ревизор 127fc785a / f6d8aa518 🟡: не стучаться до nextChangeAt, срок жизни записи, нет личности — не шлём, свежее имя не затираем.
  it('after rate_limited waits until nextChangeAt instead of calling on every app return', async () => {
    mockStore.set('user_name', 'New name');
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockReserve.mockResolvedValue({ status: 'rate_limited', nextChangeAt: Date.now() + 60_000 });
    await pending.flushNicknameRenamePending('test');
    await pending.flushNicknameRenamePending('app_active');
    expect(mockReserve).toHaveBeenCalledTimes(1);
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(true);
  });

  it('drops the record after 10 failed attempts', async () => {
    mockStore.set('user_name', 'New name');
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockReserve.mockResolvedValue({ status: 'error' });
    for (let i = 0; i < 11; i += 1) await pending.flushNicknameRenamePending('test');
    expect(mockReserve).toHaveBeenCalledTimes(10);
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(false);
    expect(mockStore.get('user_name')).toBe('New name');
  });

  it('does not send while there is no current account, keeps the record', async () => {
    mockStore.set('user_name', 'New name');
    await pending.markNicknameRenamePending('New name', 'Old name');
    mockStableId.value = null;
    await pending.flushNicknameRenamePending('test');
    expect(mockReserve).not.toHaveBeenCalled();
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(true);
  });

  it('taken answer does not overwrite a name typed while the request was in flight', async () => {
    mockStore.set('user_name', 'Busy name');
    await pending.markNicknameRenamePending('Busy name', 'Old name');
    mockReserve.mockImplementation(async () => {
      mockStore.set('user_name', 'Fresh name');
      return { status: 'taken' };
    });
    await pending.flushNicknameRenamePending('test');
    expect(mockStore.get('user_name')).toBe('Fresh name');
    expect(mockStore.has(pending.NICKNAME_RENAME_PENDING_KEY)).toBe(false);
    expect(await pending.takeNicknameRenameTakenNotice()).toBeNull();
  });
});
