/**
 * nudge_client.ts — optimistic mark before the callable resolves, rollback only
 * on a definitive (non-network) error, single retry for network errors, and a
 * double-tap guard while a call is in flight. Same mocking pattern as friend_gifts.test.ts.
 */
const mockCallableInvoker = jest.fn(async (_payload: unknown) => ({ data: { ok: true } }));
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


jest.mock('../app/local_date', () => ({
  getLocalDayKey: jest.fn(() => '2026-08-17'),
}));

// зачем: sender_identity тянет cloud_sync (тяжёлый модуль) — стабим; заодно проверяем,
// что stableId и имя зовущего реально уходят в payload (аудит 2026-08-17).
const mockPrepareTogetherSender = jest.fn(async () => ({ stableId: 'me-stable', displayName: 'Марина' }));
jest.mock('../app/friends_together/sender_identity', () => ({
  prepareTogetherSender: () => mockPrepareTogetherSender(),
}));

// зачем (идея 1, макет «Нет сети»): сеть управляется из теста — офлайн зов встаёт в очередь, слушатель «сеть вернулась» её отправляет
type MockNetState = { isConnected: boolean | null; isInternetReachable: boolean | null };
const mockNetState: MockNetState = { isConnected: true, isInternetReachable: true };
const mockNetListeners: Array<(state: MockNetState) => void> = [];
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(async () => ({ ...mockNetState })),
  addEventListener: jest.fn((listener: (state: MockNetState) => void) => {
    mockNetListeners.push(listener);
    return () => {
      const index = mockNetListeners.indexOf(listener);
      if (index >= 0) mockNetListeners.splice(index, 1);
    };
  }),
}));

// зачем (Ревизор 22.10, 🔴): владелец зова — stableId аккаунта на телефоне; тест «меняет аккаунт» через него
const mockStableId = { current: 'me-stable' };
jest.mock('../app/stable_id', () => ({
  getStableId: jest.fn(async () => mockStableId.current),
}));

const QUEUE_KEY = 'friends_nudge_queue_v1';
const requestIdOf = (call: unknown[] | undefined): string => (call?.[0] as { requestId: string }).requestId;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  mockCallableInvoker.mockReset().mockImplementation(async () => ({ data: { ok: true } }));
  mockNetState.isConnected = true;
  mockNetState.isInternetReachable = true;
  mockNetListeners.splice(0, mockNetListeners.length);
  mockStableId.current = 'me-stable';
  mockPrepareTogetherSender.mockImplementation(async () => ({ stableId: 'me-stable', displayName: 'Марина' }));
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
    expect(mockCallableInvoker).toHaveBeenCalledWith(expect.objectContaining({ stableId: 'me-stable', friendUid: 'friend-1', senderDisplayName: 'Марина' }));
  });

  it('rolls back and reports network when sender identity is unavailable', async () => {
    mockPrepareTogetherSender.mockResolvedValueOnce(null as any);
    const { nudgeFriend, isNudgedToday, primeNudgedTodayCache } = await import('../app/friends_together/nudge_client');
    await primeNudgedTodayCache();
    const result = await nudgeFriend('friend-3');
    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(isNudgedToday('friend-3')).toBe(false);
    expect(mockCallableInvoker).not.toHaveBeenCalled();
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

  it('retries once on a network error, then rolls back to «Позвать» and the next tap reuses the same requestId', async () => {
    mockCallableInvoker.mockImplementation(async () => { throw new Error('unavailable network'); });
    const { nudgeFriend, isNudgedToday, primeNudgedTodayCache } = await import('../app/friends_together/nudge_client');
    await primeNudgedTodayCache();

    const result = await nudgeFriend('friend-3');

    expect(result).toEqual({ ok: false, reason: 'network' });
    expect(mockCallableInvoker).toHaveBeenCalledTimes(2); // 1 attempt + 1 retry
    const firstRequestId = requestIdOf(mockCallableInvoker.mock.calls[0]);
    expect(requestIdOf(mockCallableInvoker.mock.calls[1])).toBe(firstRequestId);
    // Макет «Нет сети — попробуй ещё раз» + «Повторить» (владелец 21.10): кнопка снова «Позвать».
    // Двойного зова нет: повтор идёт тем же requestId (сервер отвечает nudge:replay без пуша), лимит «раз в день» сервер держит сам.
    expect(isNudgedToday('friend-3')).toBe(false);

    mockCallableInvoker.mockReset().mockImplementation(async () => ({ data: { ok: true } }));
    const retry = await nudgeFriend('friend-3');

    expect(retry).toEqual({ ok: true });
    expect(requestIdOf(mockCallableInvoker.mock.calls[0])).toBe(firstRequestId);
    expect(isNudgedToday('friend-3')).toBe(true);
  });

  it('a definitive error does not keep a retry id — the next tap gets a fresh requestId', async () => {
    let calls = 0;
    mockCallableInvoker.mockImplementation(async () => {
      calls += 1;
      if (calls <= 2) throw new Error('unavailable network');
      if (calls === 3) throw new Error('failed-precondition quiet_hours');
      return { data: { ok: true } };
    });
    const { nudgeFriend } = await import('../app/friends_together/nudge_client');

    await nudgeFriend('friend-7'); // network ×2 → rollback, id remembered
    expect(await nudgeFriend('friend-7')).toEqual({ ok: false, reason: 'quiet_hours' }); // same id → definitive
    const quietId = requestIdOf(mockCallableInvoker.mock.calls[2]);
    expect(quietId).toBe(requestIdOf(mockCallableInvoker.mock.calls[0]));
    await nudgeFriend('friend-7');

    expect(requestIdOf(mockCallableInvoker.mock.calls[3])).not.toBe(quietId);
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

describe('nudge offline queue (идея 1, макет «Нет сети»: «В очереди»)', () => {
  const goOffline = (): void => { mockNetState.isConnected = false; };
  const goOnline = (): void => {
    mockNetState.isConnected = true;
    mockNetListeners.slice().forEach((listener) => listener({ isConnected: true, isInternetReachable: true }));
  };

  it('offline: marks the friend, queues the call and sends nothing yet', async () => {
    goOffline();
    const { nudgeFriend, isNudgedToday, isNudgeQueuedToday, primeNudgedTodayCache } = await import('../app/friends_together/nudge_client');
    await primeNudgedTodayCache();

    const result = await nudgeFriend('friend-q');

    expect(result).toEqual({ ok: true, queued: true });
    expect(mockCallableInvoker).not.toHaveBeenCalled();
    expect(mockPrepareTogetherSender).not.toHaveBeenCalled(); // офлайн связку аккаунта не собрать — отправителя готовим при отправке
    expect(isNudgedToday('friend-q')).toBe(true);
    expect(isNudgeQueuedToday('friend-q')).toBe(true);
    expect(JSON.parse(mockStorage[QUEUE_KEY])).toEqual([expect.objectContaining({ friendUid: 'friend-q', dayKey: '2026-08-17' })]);
    // повторный тап, пока зов ждёт сети, — тот же ответ, без вызова
    expect(await nudgeFriend('friend-q')).toEqual({ ok: true, queued: true });
    expect(mockCallableInvoker).not.toHaveBeenCalled();
  });

  it('network back: sends the queued call with its own requestId, clears the queue and reports the outcome', async () => {
    goOffline();
    const mod = await import('../app/friends_together/nudge_client');
    await mod.primeNudgedTodayCache();
    await mod.nudgeFriend('friend-q');
    const queuedId = JSON.parse(mockStorage[QUEUE_KEY])[0].requestId as string;
    const outcomes: unknown[] = [];
    mod.subscribeQueuedNudgeOutcomes((outcome) => outcomes.push(outcome));

    goOnline();
    await mod.flushNudgeQueue('test_await');

    expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
    expect(mockCallableInvoker).toHaveBeenCalledWith(expect.objectContaining({ friendUid: 'friend-q', requestId: queuedId, stableId: 'me-stable' }));
    expect(outcomes).toEqual([{ friendUid: 'friend-q', result: { ok: true } }]);
    expect(mockStorage[QUEUE_KEY]).toBeUndefined();
    expect(mod.isNudgeQueuedToday('friend-q')).toBe(false);
    expect(mod.isNudgedToday('friend-q')).toBe(true);
  });

  it('a definitive answer from the queue (quiet hours) rolls the mark back and leaves the queue', async () => {
    goOffline();
    const mod = await import('../app/friends_together/nudge_client');
    await mod.primeNudgedTodayCache();
    await mod.nudgeFriend('friend-q');
    const outcomes: unknown[] = [];
    mod.subscribeQueuedNudgeOutcomes((outcome) => outcomes.push(outcome));
    mockCallableInvoker.mockImplementation(async () => { throw new Error('failed-precondition quiet_hours'); });

    goOnline();
    await mod.flushNudgeQueue('test_await');

    expect(outcomes).toEqual([{ friendUid: 'friend-q', result: { ok: false, reason: 'quiet_hours' } }]);
    expect(mod.isNudgedToday('friend-q')).toBe(false);
    expect(mockStorage[QUEUE_KEY]).toBeUndefined();
  });

  it('a network failure while flushing keeps the call queued for the next chance', async () => {
    goOffline();
    const mod = await import('../app/friends_together/nudge_client');
    await mod.primeNudgedTodayCache();
    await mod.nudgeFriend('friend-q');
    const outcomes: unknown[] = [];
    mod.subscribeQueuedNudgeOutcomes((outcome) => outcomes.push(outcome));
    mockCallableInvoker.mockImplementation(async () => { throw new Error('unavailable network'); });

    goOnline();
    await mod.flushNudgeQueue('test_await');

    expect(mockCallableInvoker).toHaveBeenCalledTimes(2); // попытка + повтор тем же requestId
    expect(outcomes).toEqual([]);
    expect(mod.isNudgeQueuedToday('friend-q')).toBe(true);
    expect(mod.isNudgedToday('friend-q')).toBe(true);
  });

  it('drops a call queued on a previous day without sending it', async () => {
    mockStorage[QUEUE_KEY] = JSON.stringify([{ friendUid: 'old-friend', requestId: 'ftn_old', dayKey: '2026-08-16', queuedAt: 1, ownerStableId: 'me-stable' }]);
    const mod = await import('../app/friends_together/nudge_client');

    await mod.primeNudgedTodayCache(); // prime запускает отправку очереди
    await mod.flushNudgeQueue('test_await');

    expect(mockCallableInvoker).not.toHaveBeenCalled();
    expect(mockStorage[QUEUE_KEY]).toBeUndefined();
  });

  it('while still offline a flush keeps everything in place', async () => {
    goOffline();
    const mod = await import('../app/friends_together/nudge_client');
    await mod.primeNudgedTodayCache();
    await mod.nudgeFriend('friend-q');

    await mod.flushNudgeQueue('test_offline');

    expect(mockCallableInvoker).not.toHaveBeenCalled();
    expect(mod.isNudgeQueuedToday('friend-q')).toBe(true);
  });
});

describe('nudge offline queue belongs to its account (Ревизор 22.10, 🔴)', () => {
  const goOffline = (): void => { mockNetState.isConnected = false; };
  const goOnline = (): void => {
    mockNetState.isConnected = true;
    mockNetListeners.slice().forEach((listener) => listener({ isConnected: true, isInternetReachable: true }));
  };

  it('A queued a call offline → B signed in → the call never goes (owner_changed)', async () => {
    goOffline();
    const mod = await import('../app/friends_together/nudge_client');
    await mod.primeNudgedTodayCache();
    expect(await mod.nudgeFriend('friend-q')).toEqual({ ok: true, queued: true });
    expect(JSON.parse(mockStorage[QUEUE_KEY])[0]).toMatchObject({ friendUid: 'friend-q', ownerStableId: 'me-stable' });

    // вошёл B
    mockStableId.current = 'boris-stable';
    mockPrepareTogetherSender.mockImplementation(async () => ({ stableId: 'boris-stable', displayName: 'Борис' }));
    const log = jest.spyOn(console, 'log');
    goOnline();
    await mod.flushNudgeQueue('test_await');

    expect(mockCallableInvoker).not.toHaveBeenCalled();
    expect(mockStorage[QUEUE_KEY]).toBeUndefined();
    expect(log.mock.calls.some((call) => String(call[0]).includes('[FRIENDS-NUDGE-QUEUE] reason=owner_changed'))).toBe(true);
    expect(mod.isNudgedToday('friend-q')).toBe(false); // у B этот друг не «позван»
    log.mockRestore();
  });

  it('a queue another account left on the phone is dropped on start, never sent', async () => {
    mockStorage[QUEUE_KEY] = JSON.stringify([{ friendUid: 'friend-q', requestId: 'ftn_alice_1', dayKey: '2026-08-17', queuedAt: 1, ownerStableId: 'alice-stable' }]);
    mockStorage['friends_nudged_today_v1::alice-stable::2026-08-17'] = JSON.stringify({ 'friend-q': 1 });
    const mod = await import('../app/friends_together/nudge_client');

    await mod.primeNudgedTodayCache(); // текущий аккаунт — me-stable
    await mod.flushNudgeQueue('test_await');

    expect(mockCallableInvoker).not.toHaveBeenCalled();
    expect(mockStorage[QUEUE_KEY]).toBeUndefined();
    expect(JSON.parse(mockStorage['friends_nudged_today_v1::alice-stable::2026-08-17'])).toEqual({});
  });

  it('A queued offline → signed out → A again: the old call is gone and a new tap sends exactly once', async () => {
    goOffline();
    const mod = await import('../app/friends_together/nudge_client');
    await mod.primeNudgedTodayCache();
    await mod.nudgeFriend('friend-q');

    // выход: на телефоне другой (анонимный) аккаунт — очередь A сброшена, отметка снята
    mockStableId.current = 'anon-after-signout';
    await mod.primeNudgedTodayCache();
    expect(mockStorage[QUEUE_KEY]).toBeUndefined();

    // A снова, сеть есть
    mockStableId.current = 'me-stable';
    goOnline();
    await mod.primeNudgedTodayCache();
    await mod.flushNudgeQueue('test_await');
    expect(mockCallableInvoker).not.toHaveBeenCalled(); // старый зов не ожил

    expect(await mod.nudgeFriend('friend-q')).toEqual({ ok: true });
    await mod.flushNudgeQueue('test_await_2');
    expect(mockCallableInvoker).toHaveBeenCalledTimes(1);
    expect(mockCallableInvoker).toHaveBeenCalledWith(expect.objectContaining({ friendUid: 'friend-q', stableId: 'me-stable' }));
  });
});
