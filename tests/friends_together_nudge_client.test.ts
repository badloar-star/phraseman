/**
 * nudge_client.ts — optimistic mark before the callable resolves, rollback only
 * on a definitive (non-network) error, single retry for network errors, and a
 * double-tap guard while a call is in flight. Same mocking pattern as friend_gifts.test.ts.
 */
const mockCallableInvoker = jest.fn(async (_payload: unknown) => ({ data: { ok: true } }));
const mockInitFirebaseAppCheckIfAvailable = jest.fn(async () => undefined);
const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { delete mockStorage[key]; return Promise.resolve(); }),
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallableInvoker),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

jest.mock('../app/app_check_init', () => ({
  initFirebaseAppCheckIfAvailable: mockInitFirebaseAppCheckIfAvailable,
}));

jest.mock('../app/local_date', () => ({
  getLocalDayKey: jest.fn(() => '2026-08-17'),
}));

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockCallableInvoker.mockReset().mockImplementation(async () => ({ data: { ok: true } }));
});

describe('nudgeFriend', () => {
  it('marks the friend as nudged optimistically and keeps it on success', async () => {
    const { nudgeFriend, isNudgedToday, primeNudgedTodayCache } = await import('../app/friends_together/nudge_client');
    await primeNudgedTodayCache();
    expect(isNudgedToday('friend-1')).toBe(false);

    const result = await nudgeFriend('friend-1');

    expect(result).toEqual({ ok: true });
    expect(isNudgedToday('friend-1')).toBe(true);
    expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
  });

  it('rolls back the optimistic mark on a definitive error (e.g. daily_limit)', async () => {
    mockCallableInvoker.mockImplementation(async () => {
      throw new Error('resource-exhausted daily_limit');
    });
    const { nudgeFriend, isNudgedToday, primeNudgedTodayCache } = await import('../app/friends_together/nudge_client');
    await primeNudgedTodayCache();

    const result = await nudgeFriend('friend-2');

    expect(result).toEqual({ ok: false, reason: 'daily_limit' });
    expect(isNudgedToday('friend-2')).toBe(false); // rolled back
  });

  it('maps known failure-precondition texts to typed reasons', async () => {
    const { nudgeFriend } = await import('../app/friends_together/nudge_client');

    mockCallableInvoker.mockImplementationOnce(async () => { throw new Error('failed-precondition disabled'); });
    expect(await nudgeFriend('a')).toEqual({ ok: false, reason: 'disabled' });

    mockCallableInvoker.mockImplementationOnce(async () => { throw new Error('failed-precondition quiet_hours'); });
    expect(await nudgeFriend('b')).toEqual({ ok: false, reason: 'quiet_hours' });

    mockCallableInvoker.mockImplementationOnce(async () => { throw new Error('resource-exhausted sender_limit'); });
    expect(await nudgeFriend('c')).toEqual({ ok: false, reason: 'sender_limit' });

    mockCallableInvoker.mockImplementationOnce(async () => { throw new Error('resource-exhausted receiver_limit'); });
    expect(await nudgeFriend('d')).toEqual({ ok: false, reason: 'receiver_limit' });

    mockCallableInvoker.mockImplementationOnce(async () => { throw new Error('failed-precondition not_friends'); });
    expect(await nudgeFriend('e')).toEqual({ ok: false, reason: 'not_friends' });
  });

  it('retries once on a network error and keeps the optimistic mark if it still fails', async () => {
    mockCallableInvoker.mockImplementation(async () => { throw new Error('unavailable network'); });
    const { nudgeFriend, isNudgedToday, primeNudgedTodayCache } = await import('../app/friends_together/nudge_client');
    await primeNudgedTodayCache();

    const result = await nudgeFriend('friend-3');

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(mockCallableInvoker).toHaveBeenCalledTimes(2); // 1 attempt + 1 retry
    // Network outcome is ambiguous — we do NOT know if the server applied it, so the
    // optimistic mark stays to avoid double-nudging in the same day.
    expect(isNudgedToday('friend-3')).toBe(true);
  });

  it('recovers on the retry after an initial network failure', async () => {
    let calls = 0;
    mockCallableInvoker.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) throw new Error('unavailable network');
      return { data: { ok: true } };
    });
    const { nudgeFriend } = await import('../app/friends_together/nudge_client');

    const result = await nudgeFriend('friend-4');

    expect(result).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('guards against a double tap on the same friend while a call is in flight', async () => {
    const resolveCallHolder: { current: (() => void) | null } = { current: null };
    mockCallableInvoker.mockImplementation(() => new Promise((resolve) => {
      resolveCallHolder.current = () => resolve({ data: { ok: true } });
    }));
    const { nudgeFriend } = await import('../app/friends_together/nudge_client');

    const first = nudgeFriend('friend-5');
    const second = await nudgeFriend('friend-5'); // fires while first is still in flight

    expect(second.ok).toBe(false); // second tap is rejected/ignored, not queued
    // The callable is only invoked after a few microtask hops inside the first call
    // (ensureMemoryFresh → optimistic write → attempt()) — poll until it's actually
    // in flight before resolving it, instead of assuming it's ready immediately.
    for (let i = 0; i < 50 && !resolveCallHolder.current; i += 1) await Promise.resolve();
    expect(resolveCallHolder.current).not.toBeNull();
    resolveCallHolder.current?.();
    const firstResult = await first;
    expect(firstResult).toEqual({ ok: true });
  });

  it('is idempotent when the friend was already nudged today (no extra callable call)', async () => {
    const { nudgeFriend, primeNudgedTodayCache } = await import('../app/friends_together/nudge_client');
    await primeNudgedTodayCache();

    await nudgeFriend('friend-6');
    mockCallableInvoker.mockClear();
    const second = await nudgeFriend('friend-6');

    expect(second).toEqual({ ok: true });
    expect(mockCallableInvoker).not.toHaveBeenCalled();
  });
});
