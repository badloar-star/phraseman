const storage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
    setItem: (key: string, value: string) => { storage.set(key, value); return Promise.resolve(); },
    removeItem: (key: string) => { storage.delete(key); return Promise.resolve(); },
  },
}));

let pendingDelete = false;
const readPending = jest.fn(async () => pendingDelete ? '{"pending":true}' : null);
jest.mock('../app/account_delete_quarantine', () => ({
  readAccountDeletePendingAuthRaw: () => readPending(),
}));

let stableId = 'local-stable';
jest.mock('../app/stable_id', () => ({ getStableId: async () => stableId }));
let generation = { generation: 7, stableId: 'local-stable', phase: 'active' as const };
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ ...generation }),
  isCurrentAccountGeneration: (token: any, expected: string) => (
    token.generation === generation.generation
    && generation.phase === 'active'
    && generation.stableId === expected
  ),
}));

const ensureAnon = jest.fn(async () => stableId);
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: () => ensureAnon() }));
let defaultUser: null | { uid: string; isAnonymous: boolean } = {
  uid: 'source-anon-auth', isAnonymous: true,
};
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({ get currentUser() { return defaultUser; } }),
}));

const acquire = jest.fn();
jest.mock('../app/auth_provider', () => ({
  acquireAuthRecoveryNativeCredential: (...args: unknown[]) => acquire(...args),
}));

const request = jest.fn();
const confirm = jest.fn();
const issue = jest.fn();
const cleanup = jest.fn(async () => {});
const session: any = {
  provider: 'google',
  authUid: 'provider-uid',
  requestCleanInstallCode: (...args: unknown[]) => request(...args),
  confirmCleanInstallCode: (...args: unknown[]) => confirm(...args),
  issueHandoffToken: (...args: unknown[]) => issue(...args),
  cleanup: () => cleanup(),
};
const startSecondary = jest.fn(async (_provider?: unknown, _acquirer?: unknown) => ({ result: 'ready', session }));
jest.mock('../app/auth_recovery_secondary', () => ({
  startSecondaryAuthRecoverySession: (provider: unknown, acquirer: unknown) => (
    startSecondary(provider, acquirer)
  ),
}));

const adopt = jest.fn(async (_input?: unknown) => ({ result: 'completed' }));
jest.mock('../app/auth_clean_install_recovery_adoption', () => ({
  adoptCleanInstallRecoveryHandoff: (input: unknown) => adopt(input),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync: async (_algorithm: string, value: string) => (
    value === 'provider-uid' ? 'a' : value === 'source-anon-auth' ? 'c' : 'd'
  ).repeat(64),
}));

const NOW = 1_800_000_000_000;
const TOKEN = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
const ids = [
  'request-id', 'confirm-id', 'handoff-id',
  'resend-request-id', 'resend-confirm-id', 'resend-handoff-id',
];

function createFlow() {
  let index = 0;
  const mod = require('../app/auth_clean_install_recovery_flow') as typeof import('../app/auth_clean_install_recovery_flow');
  return mod.createCleanInstallRecoveryFlow({
    now: () => NOW,
    createRequestId: () => ids[index++] ?? `unexpected-${index}`,
  });
}

describe('clean-install recovery coordinator', () => {
  beforeEach(() => {
    jest.resetModules();
    storage.clear();
    pendingDelete = false;
    stableId = 'local-stable';
    generation = { generation: 7, stableId: 'local-stable', phase: 'active' };
    defaultUser = { uid: 'source-anon-auth', isAnonymous: true };
    session.provider = 'google';
    session.authUid = 'provider-uid';
    jest.clearAllMocks();
    request.mockResolvedValue({
      challengeId: 'clean_challenge_1234567890', expiresInSec: 600, retryAfterSec: 0,
    });
    confirm.mockResolvedValue({
      stableId: 'target-stable', recoveryEventId: 'event-1', handoffEligibleUntil: NOW + 60_000,
    });
    issue.mockResolvedValue({
      customToken: TOKEN, stableId: 'target-stable', handoffAcknowledgeUntil: NOW + 120_000,
    });
    adopt.mockResolvedValue({ result: 'completed' });
  });

  it.each([
    ['missing', null],
    ['provider', { uid: 'source-anon-auth', isAnonymous: false }],
  ])('requires hydrated anonymous default Auth before provider acquisition: %s', async (_label, user) => {
    defaultUser = user as typeof defaultUser;
    const flow = createFlow();
    await expect(flow.start('google')).rejects.toThrow();
    expect(startSecondary).not.toHaveBeenCalled();
  });

  it('blocks pending delete before provider acquisition', async () => {
    pendingDelete = true;
    let flow: ReturnType<typeof createFlow> | null = null;
    let observed: unknown;
    try {
      flow = createFlow();
      await flow.start('google');
    } catch (error) { observed = error; }
    expect(String((observed as Error)?.message ?? observed)).toBe('account_delete_pending');
    expect(flow).not.toBeNull();
    expect(startSecondary).not.toHaveBeenCalled();
  });

  it('reuses the same persisted request id after response loss and restart', async () => {
    request.mockRejectedValueOnce({ code: 'functions/unavailable' });
    const first = createFlow();
    await first.start('google');
    await expect(first.requestCode('owner@example.com')).rejects.toBeTruthy();
    expect(JSON.parse(storage.get('auth_clean_install_recovery_request_intent_v1') || '{}'))
      .toMatchObject({ guardExpiresAt: NOW });
    await first.dispose();

    const restarted = createFlow();
    await restarted.start('google');
    await expect(restarted.requestCode('owner@example.com')).resolves.toMatchObject({ stage: 'code_sent' });
    expect(request.mock.calls[0][1]).toBe('request-id');
    expect(request.mock.calls[1][1]).toBe('request-id');
  });

  it('cancel clears both an ordinary challenge and its request intent', async () => {
    const flow = createFlow();
    await flow.start('google');
    await flow.requestCode('owner@example.com');

    expect(storage.has('auth_clean_install_recovery_v1')).toBe(true);
    expect(storage.has('auth_clean_install_recovery_request_intent_v1')).toBe(true);
    await flow.cancel();

    expect(storage.has('auth_clean_install_recovery_v1')).toBe(false);
    expect(storage.has('auth_clean_install_recovery_request_intent_v1')).toBe(false);
  });

  it('resends with fresh idempotency ids and replaces the challenge only after success', async () => {
    const flow = createFlow();
    await flow.start('google');
    await flow.requestCode('owner@example.com');
    request.mockResolvedValueOnce({
      challengeId: 'replacement_challenge_123456', expiresInSec: 600, retryAfterSec: 30,
    });

    await expect(flow.resendCode('owner@example.com')).resolves.toMatchObject({
      stage: 'code_sent', retryAfterSec: 30,
    });

    expect(request.mock.calls.map(call => call[1])).toEqual(['request-id', 'resend-request-id']);
    expect(JSON.parse(storage.get('auth_clean_install_recovery_v1') || '{}')).toMatchObject({
      challengeId: 'replacement_challenge_123456',
      requestClientRequestId: 'resend-request-id',
      confirmClientRequestId: 'resend-confirm-id',
    });
  });

  it('keeps the previous challenge usable when resend fails before persistence', async () => {
    const flow = createFlow();
    await flow.start('google');
    await flow.requestCode('owner@example.com');
    const before = storage.get('auth_clean_install_recovery_v1');
    request.mockRejectedValueOnce({ code: 'functions/unavailable' });

    await expect(flow.resendCode('owner@example.com')).rejects.toBeTruthy();

    expect(flow.getState()).toMatchObject({ stage: 'code_sent' });
    expect(storage.get('auth_clean_install_recovery_v1')).toBe(before);
  });

  it('reuses confirm and handoff ids across response loss and restart', async () => {
    const first = createFlow();
    await first.start('google');
    await first.requestCode('owner@example.com');
    confirm.mockRejectedValueOnce({ code: 'functions/unavailable' });
    await expect(first.confirmCode('481927')).rejects.toBeTruthy();
    await first.dispose();

    const second = createFlow();
    await expect(second.start('google')).resolves.toMatchObject({ stage: 'code_sent' });
    issue.mockRejectedValueOnce({ code: 'functions/unavailable' });
    await expect(second.confirmCode('481927')).rejects.toBeTruthy();
    await second.dispose();

    const third = createFlow();
    await expect(third.start('google')).resolves.toMatchObject({ stage: 'confirmed' });
    await expect(third.resumeConfirmed()).resolves.toEqual({ result: 'completed' });
    expect(confirm.mock.calls.map(call => call[2])).toEqual(['confirm-id', 'confirm-id']);
    expect(issue.mock.calls.map(call => call[1])).toEqual(['handoff-id', 'handoff-id']);
  });

  it.each(['request', 'confirm', 'issue', 'adopt'] as const)(
    'blocks pending delete immediately before %s',
    async phase => {
      const flow = createFlow();
      await flow.start('google');
      if (phase === 'request') {
        pendingDelete = true;
        await expect(flow.requestCode('owner@example.com')).rejects.toThrow('account_delete_pending');
        expect(request).not.toHaveBeenCalled();
        return;
      }
      await flow.requestCode('owner@example.com');
      if (phase === 'confirm') {
        pendingDelete = true;
        await expect(flow.confirmCode('481927')).rejects.toThrow('account_delete_pending');
        expect(confirm).not.toHaveBeenCalled();
        return;
      }
      if (phase === 'issue') confirm.mockImplementationOnce(async () => {
        pendingDelete = true;
        return { stableId: 'target-stable', recoveryEventId: 'event-1', handoffEligibleUntil: NOW + 60_000 };
      });
      if (phase === 'adopt') issue.mockImplementationOnce(async () => {
        pendingDelete = true;
        return { customToken: TOKEN, stableId: 'target-stable', handoffAcknowledgeUntil: NOW + 120_000 };
      });
      await expect(flow.confirmCode('481927')).rejects.toThrow('account_delete_pending');
      if (phase === 'issue') expect(issue).not.toHaveBeenCalled();
      if (phase === 'adopt') expect(adopt).not.toHaveBeenCalled();
    },
  );

  it.each(['uid', 'provider', 'generation'] as const)('aborts %s drift before request', async drift => {
    const flow = createFlow();
    await flow.start('google');
    if (drift === 'uid') defaultUser = { uid: 'other-anon', isAnonymous: true };
    if (drift === 'provider') session.provider = 'apple';
    if (drift === 'generation') generation = { generation: 8, stableId: 'local-stable', phase: 'active' };
    await expect(flow.requestCode('owner@example.com')).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('passes distinct authoritative target to dedicated adoption and exposes no enumeration data', async () => {
    const flow = createFlow();
    await flow.start('google');
    const sent = await flow.requestCode('owner@example.com');
    expect(sent).toEqual(expect.objectContaining({ stage: 'code_sent' }));
    expect(JSON.stringify(sent)).not.toContain('owner@example.com');
    await expect(flow.confirmCode('481927')).resolves.toEqual({ result: 'completed' });
    expect(adopt).toHaveBeenCalledWith(expect.objectContaining({
      sourceStableId: 'local-stable', targetStableId: 'target-stable',
      sourceAuthUid: 'source-anon-auth', expectedUid: 'provider-uid',
      sourceAccountGeneration: 7,
    }));
  });
});
