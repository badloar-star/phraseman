const storage = new Map<string, string>();
const mockSetItem = jest.fn(async (key: string, value: string) => { storage.set(key, value); });
const mockRemoveItem = jest.fn(async (key: string) => { storage.delete(key); });
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
    setItem: (key: string, value: string) => mockSetItem(key, value),
    removeItem: (key: string) => mockRemoveItem(key),
  },
}));

let mockStableId = 'stable-1';
const mockGetStableId = jest.fn(async () => mockStableId);
jest.mock('../app/stable_id', () => ({ getStableId: () => mockGetStableId() }));

const mockInvalidateGeneration = jest.fn();
const mockBeginGeneration = jest.fn();
jest.mock('../app/account_generation', () => ({
  invalidateAccountGeneration: () => {
    adoptionEvents.push('invalidate');
    return mockInvalidateGeneration();
  },
  beginAccountGeneration: (stableId: string | null) => {
    adoptionEvents.push('begin');
    return mockBeginGeneration(stableId);
  },
}));

const adoptionEvents: string[] = [];
const mockQuiesce = jest.fn<Promise<boolean>, [number]>(async () => {
  adoptionEvents.push('quiesce');
  return true;
});
const mockComplete = jest.fn(async (eventId: string) => ({
  ok: true, recoveryEventId: eventId, completed: true,
}));
jest.mock('../app/cloud_sync', () => ({
  quiesceCloudSyncForAccountTransition: (timeoutMs: number) => mockQuiesce(timeoutMs),
  completeAuthRecoveryHandoffViaServer: (eventId: string) => {
    adoptionEvents.push('ack');
    return mockComplete(eventId);
  },
}));

let mockCurrentUid: string | null = 'anonymous-uid';
const mockSignInWithCustomToken = jest.fn(async (_token: string) => {
  adoptionEvents.push('sign_in');
  mockCurrentUid = 'provider-uid';
  return { user: { uid: 'provider-uid' } };
});
const mockAuth = {
  get currentUser() { return mockCurrentUid ? { uid: mockCurrentUid } : null; },
  signInWithCustomToken: (token: string) => mockSignInWithCustomToken(token),
};
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuth,
}));

const uidHash = (value: string) => (value === 'provider-uid' ? 'a' : 'b').repeat(64);
const mockDigest = jest.fn(async (_algorithm: string, value: string) => uidHash(value));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync: (algorithm: string, value: string) => mockDigest(algorithm, value),
}));

const TOKEN = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
const NOW = 1_780_000_000_000;

function validInput() {
  return {
    customToken: TOKEN,
    recoveryEventId: 'event-1',
    stableId: 'stable-1',
    expectedUid: 'provider-uid',
    handoffAcknowledgeUntil: NOW + 60 * 60 * 1000,
  };
}

describe('default-auth recovery handoff adoption', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    storage.clear();
    adoptionEvents.length = 0;
    mockSetItem.mockClear();
    mockRemoveItem.mockClear();
    mockGetStableId.mockClear();
    mockStableId = 'stable-1';
    mockInvalidateGeneration.mockClear();
    mockBeginGeneration.mockClear();
    mockQuiesce.mockReset();
    mockQuiesce.mockImplementation(async () => {
      adoptionEvents.push('quiesce');
      return true;
    });
    mockComplete.mockReset();
    mockComplete.mockImplementation(async eventId => ({
      ok: true, recoveryEventId: eventId, completed: true,
    }));
    mockCurrentUid = 'anonymous-uid';
    mockSignInWithCustomToken.mockReset();
    mockSignInWithCustomToken.mockImplementation(async () => {
      adoptionEvents.push('sign_in');
      mockCurrentUid = 'provider-uid';
      return { user: { uid: 'provider-uid' } };
    });
    mockDigest.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('persists only a nonsecret ack journal, adopts exact UID, acks, and clears it', async () => {
    const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');

    await expect(adoption.adoptAuthRecoveryHandoffOnDefaultAuth(validInput()))
      .resolves.toEqual({ result: 'completed' });
    expect(mockInvalidateGeneration).toHaveBeenCalledTimes(1);
    expect(mockQuiesce).toHaveBeenCalledTimes(1);
    expect(mockSignInWithCustomToken).toHaveBeenCalledWith(TOKEN);
    expect(mockBeginGeneration).toHaveBeenCalledWith('stable-1');
    expect(mockComplete).toHaveBeenCalledWith('event-1');
    expect(adoptionEvents).toEqual(['invalidate', 'quiesce', 'sign_in', 'ack', 'begin']);
    const persisted = String(mockSetItem.mock.calls[0]?.[1] ?? '');
    expect(persisted).toContain('event-1');
    expect(persisted).toContain('stable-1');
    expect(persisted).toContain('a'.repeat(64));
    expect(persisted).not.toContain(TOKEN);
    expect(persisted).not.toContain('provider-uid');
    expect(storage.has(adoption.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(false);
  });

  it('fails before default mutation unless local stable id exactly matches target', async () => {
    mockStableId = 'other-stable';
    const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
    await expect(adoption.adoptAuthRecoveryHandoffOnDefaultAuth(validInput()))
      .rejects.toThrow('auth_recovery_local_stable_mismatch');
    expect(mockInvalidateGeneration).not.toHaveBeenCalled();
    expect(mockSignInWithCustomToken).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it.each([
    ['token', { customToken: 'short.token.value' }],
    ['event', { recoveryEventId: 'bad/event' }],
    ['stable', { stableId: 'bad/stable' }],
    ['uid', { expectedUid: 'bad/uid' }],
    ['expired deadline', { handoffAcknowledgeUntil: NOW - 1 }],
    ['overlong deadline', { handoffAcknowledgeUntil: NOW + 65 * 60 * 1000 + 1 }],
  ])('validates %s before any default-auth mutation', async (_label, override) => {
    const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
    await expect(adoption.adoptAuthRecoveryHandoffOnDefaultAuth({ ...validInput(), ...override }))
      .rejects.toThrow();
    expect(mockInvalidateGeneration).not.toHaveBeenCalled();
    expect(mockSignInWithCustomToken).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('retains the journal on ack response loss and resumes idempotently after restart', async () => {
    mockComplete.mockRejectedValueOnce({ code: 'functions/unavailable', message: 'offline' });
    const first = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
    await expect(first.adoptAuthRecoveryHandoffOnDefaultAuth(validInput()))
      .resolves.toEqual({ result: 'ack_pending' });
    expect(storage.has(first.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(true);
    expect(mockBeginGeneration).not.toHaveBeenCalled();

    jest.resetModules();
    const restarted = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
    const [a, b] = await Promise.all([
      restarted.resumePendingRecoveryHandoffAck(),
      restarted.resumePendingRecoveryHandoffAck(),
    ]);
    expect(a).toEqual({ result: 'completed' });
    expect(b).toEqual({ result: 'completed' });
    expect(mockComplete).toHaveBeenCalledTimes(2);
    expect(mockBeginGeneration).toHaveBeenCalledTimes(1);
    expect(mockBeginGeneration).toHaveBeenCalledWith('stable-1');
    expect(storage.has(restarted.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(false);
  });

  it.each([
    ['functions/permission-denied', 'hard-reject'],
    ['functions/failed-precondition', 'hard-reject'],
    ['functions/unauthenticated', 'hard-reject'],
    ['functions/resource-exhausted', 'hard-reject'],
    ['functions/deadline-exceeded', '[functions/deadline-exceeded] recovery_handoff_ack_expired'],
    ['functions/internal', 'unknown-internal'],
    ['functions/permission-denied', 'timeout_auth_recovery_ack_20000ms'],
    ['', 'offline'],
  ])(
    'quarantines hard initial ACK failure %s/%s and keeps generation invalid',
    async (code, message) => {
      mockComplete.mockRejectedValueOnce({ code, message });
      const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
      await expect(adoption.adoptAuthRecoveryHandoffOnDefaultAuth(validInput()))
        .resolves.toEqual({ result: 'quarantined', reason: 'ack_rejected' });
      expect(mockBeginGeneration).not.toHaveBeenCalled();
      expect(storage.has(adoption.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(true);
    },
  );

  it.each(['functions/permission-denied', 'functions/failed-precondition'])(
    'quarantines hard resumed ACK failure %s and keeps generation invalid',
    async code => {
      const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
      storage.set(adoption.AUTH_RECOVERY_PENDING_ACK_KEY, JSON.stringify({
        recoveryEventId: 'event-1',
        stableId: 'stable-1',
        handoffAcknowledgeUntil: NOW + 1000,
        expectedUidHash: 'a'.repeat(64),
      }));
      mockCurrentUid = 'provider-uid';
      mockComplete.mockRejectedValueOnce({ code, message: 'hard-reject' });

      await expect(adoption.resumePendingRecoveryHandoffAck())
        .resolves.toEqual({ result: 'quarantined', reason: 'ack_rejected' });
      expect(mockBeginGeneration).not.toHaveBeenCalled();
      expect(storage.has(adoption.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(true);
    },
  );

  it.each([
    ['functions/unavailable', 'transport unavailable'],
    ['functions/cancelled', 'transport cancelled'],
    ['auth/network-request-failed', 'network request failed'],
    ['functions/deadline-exceeded', 'transport deadline'],
    ['functions/internal', '[functions/internal] recovery_handoff_unavailable'],
    ['', 'timeout_auth_recovery_ack_20000ms'],
  ])('keeps generation invalid only for explicit transient ACK %s/%s', async (code, message) => {
    mockComplete.mockRejectedValueOnce({ code, message });
    const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
    await expect(adoption.adoptAuthRecoveryHandoffOnDefaultAuth(validInput()))
      .resolves.toEqual({ result: 'ack_pending' });
    expect(mockBeginGeneration).not.toHaveBeenCalled();
    expect(storage.has(adoption.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(true);
  });

  it('restores generation and clears journal when custom-token sign-in fails before auth mutation', async () => {
    mockSignInWithCustomToken.mockRejectedValueOnce(new Error('sign-in-failed'));
    const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
    await expect(adoption.adoptAuthRecoveryHandoffOnDefaultAuth(validInput()))
      .rejects.toThrow('sign-in-failed');
    expect(mockBeginGeneration).toHaveBeenCalledWith('stable-1');
    expect(storage.has(adoption.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(false);
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it.each(['wrong_uid', 'stable_race'] as const)(
    'keeps a post-mutation %s quarantined with journal and no ack',
    async failure => {
      mockSignInWithCustomToken.mockImplementationOnce(async () => {
        mockCurrentUid = failure === 'wrong_uid' ? 'wrong-provider' : 'provider-uid';
        if (failure === 'stable_race') mockStableId = 'other-stable';
        return { user: { uid: mockCurrentUid } };
      });
      const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
      await expect(adoption.adoptAuthRecoveryHandoffOnDefaultAuth(validInput()))
        .resolves.toMatchObject({ result: 'quarantined' });
      expect(storage.has(adoption.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(true);
      expect(mockBeginGeneration).not.toHaveBeenCalled();
      expect(mockComplete).not.toHaveBeenCalled();
    },
  );

  it.each(['expired', 'uid_hash', 'stable'] as const)(
    'resume fails closed for %s journal mismatch',
    async mismatch => {
      const adoption = require('../app/auth_recovery_adoption') as typeof import('../app/auth_recovery_adoption');
      storage.set(adoption.AUTH_RECOVERY_PENDING_ACK_KEY, JSON.stringify({
        recoveryEventId: 'event-1',
        stableId: mismatch === 'stable' ? 'other-stable' : 'stable-1',
        handoffAcknowledgeUntil: mismatch === 'expired' ? NOW - 1 : NOW + 1000,
        expectedUidHash: mismatch === 'uid_hash' ? 'b'.repeat(64) : 'a'.repeat(64),
      }));
      mockCurrentUid = 'provider-uid';

      await expect(adoption.resumePendingRecoveryHandoffAck())
        .resolves.toMatchObject({ result: 'quarantined' });
      expect(mockComplete).not.toHaveBeenCalled();
      expect(storage.has(adoption.AUTH_RECOVERY_PENDING_ACK_KEY)).toBe(true);
    },
  );
});
