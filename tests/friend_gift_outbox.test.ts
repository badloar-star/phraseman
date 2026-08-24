import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';

jest.mock('../app/friend_gifts', () => ({
  classifyFriendGiftError: jest.fn((error: { kind?: string }) => error?.kind ?? 'unknown'),
  makeFriendGiftIdempotencyKey: jest.fn(() => 'fg_test_outbox_12345678'),
  sendFriendGiftWithShards: jest.fn(),
}));

jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
const requestPhoneStateBackgroundSync = jest.fn();
jest.mock('../app/phone_state_background_sync_bridge', () => ({
  requestPhoneStateBackgroundSync: () => requestPhoneStateBackgroundSync(),
}));

const makeStorage = () => {
  const values = new Map<string, string>();
  return {
    values,
    api: {
      getAllKeys: jest.fn(async () => [...values.keys()]),
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { values.delete(key); }),
    },
  };
};

const receipt = {
  ok: true,
  giftId: 'chain_shield_1' as const,
  costShards: 8,
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetAccountGenerationForTests();
  beginAccountGeneration('gift-owner');
});

describe('friend gift durable background outbox', () => {
  it('persists the complete request before starting server work', async () => {
    const { enqueueFriendGiftSend } = await import('../app/friend_gift_outbox');
    const storage = makeStorage();
    let release!: (value: typeof receipt) => void;
    const send = jest.fn(() => new Promise<typeof receipt>((resolve) => { release = resolve; }));

    const queued = await enqueueFriendGiftSend({
      friendStableId: 'friend-a',
      giftId: 'chain_shield_1',
      senderDisplayName: 'Owner',
    }, {
      storage: storage.api,
      send: send as any,
      accountToken: captureAccountGeneration(),
      createIdempotencyKey: () => 'fg_test_outbox_12345678',
      now: () => 123,
    });

    expect(storage.values.size).toBe(1);
    expect(JSON.parse([...storage.values.values()][0]!)).toMatchObject({
      stableId: 'gift-owner',
      friendStableId: 'friend-a',
      giftId: 'chain_shield_1',
      idempotencyKey: 'fg_test_outbox_12345678',
    });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'fg_test_outbox_12345678' }));

    release(receipt);
    await expect(queued.completion).resolves.toEqual(receipt);
    expect(storage.values.size).toBe(0);
  });

  it('keeps an ambiguous network send and replays the exact idempotency key after restart', async () => {
    const { enqueueFriendGiftSend, resumePendingFriendGiftSends } = await import('../app/friend_gift_outbox');
    const storage = makeStorage();
    const offline = Object.assign(new Error('timeout'), { kind: 'network' });
    const firstSend = jest.fn(async () => { throw offline; });
    const token = captureAccountGeneration();

    const queued = await enqueueFriendGiftSend({
      friendStableId: 'friend-b',
      giftId: 'chain_shield_1',
    }, {
      storage: storage.api,
      send: firstSend as any,
      accountToken: token,
      createIdempotencyKey: () => 'fg_test_restart_12345678',
      now: () => 456,
    });
    await expect(queued.completion).rejects.toBe(offline);
    expect(storage.values.size).toBe(1);
    expect(requestPhoneStateBackgroundSync).toHaveBeenCalledTimes(1);

    const replay = jest.fn(async () => receipt);
    await expect(resumePendingFriendGiftSends({
      storage: storage.api,
      send: replay as any,
      accountToken: token,
    })).resolves.toEqual({ completed: 1, pending: 0, failed: 0 });
    expect(replay).toHaveBeenCalledWith(expect.objectContaining({
      friendStableId: 'friend-b',
      idempotencyKey: 'fg_test_restart_12345678',
    }));
    expect(storage.values.size).toBe(0);
  });

  it('removes a definitive failure and emits the late failure notification once', async () => {
    const { enqueueFriendGiftSend } = await import('../app/friend_gift_outbox');
    const storage = makeStorage();
    const failure = Object.assign(new Error('not friends'), { kind: 'not_friends' });
    const notifyFailure = jest.fn();
    const queued = await enqueueFriendGiftSend({
      friendStableId: 'friend-c',
      giftId: 'xp_boost_2x_24h',
    }, {
      storage: storage.api,
      send: jest.fn(async () => { throw failure; }) as any,
      accountToken: captureAccountGeneration(),
      createIdempotencyKey: () => 'fg_test_failure_12345678',
      now: () => 789,
      notifyFailure,
    });

    await expect(queued.completion).rejects.toBe(failure);
    expect(storage.values.size).toBe(0);
    expect(notifyFailure).toHaveBeenCalledTimes(1);
  });
});
