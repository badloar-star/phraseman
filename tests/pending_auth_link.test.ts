import AsyncStorage from '@react-native-async-storage/async-storage';

const mockEnsureStableAuthLink = jest.fn();
let mockCurrentAuthUid: string | null = 'provider-a';

jest.mock('../app/cloud_sync', () => ({
  ensureStableAuthLinkForStableIdDetailed: (...args: unknown[]) => mockEnsureStableAuthLink(...args),
  getCurrentUid: () => mockCurrentAuthUid,
}));
jest.mock('../app/firebase', () => ({ logEvent: jest.fn() }));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async (_algorithm: string, value: string) =>
    value.endsWith('provider-a') ? 'a'.repeat(64) : 'b'.repeat(64)),
}));

const KEY = 'pending_auth_link_v1';

type StoredPending = Record<string, unknown>;

async function storedPending(): Promise<StoredPending | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) as StoredPending : null;
}

describe('pending auth-link journal', () => {
  let now = 10_000;

  beforeEach(() => {
    (AsyncStorage as unknown as { __reset(): void }).__reset();
    mockEnsureStableAuthLink.mockReset();
    mockCurrentAuthUid = 'provider-a';
    now = 10_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => jest.restoreAllMocks());

  it('never persists provider email or display name and bounds the failure code', async () => {
    const { recordPendingAuthLink } = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');

    await recordPendingAuthLink({
      provider: 'google',
      email: 'private@example.com',
      displayName: 'Private Person',
      stableId: 'stable-a',
      failure: 'raw transport failure private@example.com',
    });

    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).not.toContain('private@example.com');
    expect(raw).not.toContain('Private Person');
    expect(raw).not.toContain('provider-a');
    expect(await storedPending()).toMatchObject({
      v: 2,
      status: 'pending',
      provider: 'google',
      stableId: 'stable-a',
      failure: 'identity_unavailable',
      attempts: 0,
    });
  });

  it('scrubs legacy v1 PII while reading the journal', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({
      v: 1,
      provider: 'apple',
      email: 'legacy-private@example.com',
      displayName: 'Legacy Private',
      stableId: 'stable-a',
      failure: 'transport_unavailable',
      queuedAt: now - 100,
      lastAttemptAt: now - 100,
      attempts: 0,
    }));
    const { readPendingAuthLink } = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');

    await expect(readPendingAuthLink()).resolves.toMatchObject({
      v: 2,
      provider: 'apple',
      stableId: 'stable-a',
    });
    const raw = await AsyncStorage.getItem(KEY);
    expect(raw).not.toContain('legacy-private@example.com');
    expect(raw).not.toContain('Legacy Private');
  });

  it('removes an unreadable legacy record instead of leaving possible PII behind', async () => {
    await AsyncStorage.setItem(KEY, '{"email":"private@example.com"');
    const { readPendingAuthLink } = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');

    await expect(readPendingAuthLink()).resolves.toBeNull();
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('backs off after a transient failure and retries only when nextAttemptAt arrives', async () => {
    const journal = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');
    await journal.recordPendingAuthLink({
      provider: 'google', email: 'private@example.com', displayName: 'Private',
      stableId: 'stable-a', failure: 'transport_unavailable',
    });
    mockEnsureStableAuthLink.mockRejectedValueOnce(new Error('offline'));

    await expect(journal.processPendingAuthLink()).resolves.toBe('still_pending');
    const afterFailure = await storedPending();
    expect(afterFailure).toMatchObject({ attempts: 1, status: 'pending' });
    expect(Number(afterFailure?.nextAttemptAt)).toBeGreaterThan(now);

    await expect(journal.processPendingAuthLink()).resolves.toBe('still_pending');
    expect(mockEnsureStableAuthLink).toHaveBeenCalledTimes(1);

    now = Number(afterFailure?.nextAttemptAt);
    mockEnsureStableAuthLink.mockResolvedValueOnce({
      ok: true, stableUid: 'stable-a', authUid: 'provider-a', source: 'callable',
    });
    await expect(journal.processPendingAuthLink()).resolves.toBe('completed');
    expect(mockEnsureStableAuthLink).toHaveBeenLastCalledWith('stable-a', expect.not.objectContaining({
      email: expect.anything(),
      displayName: expect.anything(),
    }));
    await expect(AsyncStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('quarantines an expired journal without invoking the server', async () => {
    const journal = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');
    await journal.recordPendingAuthLink({
      provider: 'google', email: null, displayName: null,
      stableId: 'stable-a', failure: 'transport_unavailable',
    });
    const record = await storedPending();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...record, expiresAt: now - 1 }));

    await expect(journal.processPendingAuthLink()).resolves.toBe('quarantined');
    expect(mockEnsureStableAuthLink).not.toHaveBeenCalled();
    expect(await storedPending()).toMatchObject({
      status: 'quarantined',
      quarantineReason: 'expired',
    });
  });

  it('quarantines after the bounded final attempt instead of retrying forever', async () => {
    const journal = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');
    await journal.recordPendingAuthLink({
      provider: 'apple', email: null, displayName: null,
      stableId: 'stable-a', failure: 'app_check_unavailable',
    });
    const record = await storedPending();
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...record, attempts: 4, nextAttemptAt: 0 }));
    mockEnsureStableAuthLink.mockRejectedValueOnce(new Error('still offline'));

    await expect(journal.processPendingAuthLink()).resolves.toBe('quarantined');
    expect(mockEnsureStableAuthLink).toHaveBeenCalledTimes(1);
    expect(await storedPending()).toMatchObject({
      attempts: 5,
      status: 'quarantined',
      quarantineReason: 'attempts_exhausted',
    });
  });

  it('does not clear or report success when the server returns another stable uid', async () => {
    const journal = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');
    await journal.recordPendingAuthLink({
      provider: 'google', email: null, displayName: null,
      stableId: 'stable-a', failure: 'transport_unavailable',
    });
    mockEnsureStableAuthLink.mockResolvedValueOnce({
      ok: true, stableUid: 'foreign-stable', authUid: 'provider-a', source: 'callable',
    });

    await expect(journal.processPendingAuthLink()).resolves.toBe('quarantined');
    expect(await storedPending()).toMatchObject({
      stableId: 'stable-a',
      status: 'quarantined',
      quarantineReason: 'stable_uid_mismatch',
    });
  });

  it('checks the current Firebase uid after await and quarantines an account switch race', async () => {
    let resolveLink!: (value: unknown) => void;
    const linkPromise = new Promise((resolve) => { resolveLink = resolve; });
    const journal = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');
    await journal.recordPendingAuthLink({
      provider: 'google', email: null, displayName: null,
      stableId: 'stable-a', failure: 'transport_unavailable',
    });
    mockEnsureStableAuthLink.mockReturnValueOnce(linkPromise);

    const processing = journal.processPendingAuthLink();
    for (let i = 0; i < 10 && mockEnsureStableAuthLink.mock.calls.length === 0; i += 1) {
      await Promise.resolve();
    }
    mockCurrentAuthUid = 'provider-b';
    resolveLink({ ok: true, stableUid: 'stable-a', authUid: 'provider-a', source: 'callable' });

    await expect(processing).resolves.toBe('quarantined');
    expect(await storedPending()).toMatchObject({
      status: 'quarantined',
      quarantineReason: 'auth_uid_changed',
    });
  });

  it('binds the journal to the auth uid at record time and rejects a switch before processing', async () => {
    const journal = require('../app/pending_auth_link') as typeof import('../app/pending_auth_link');
    mockCurrentAuthUid = 'provider-a';
    await journal.recordPendingAuthLink({
      provider: 'google', email: null, displayName: null,
      stableId: 'stable-a', failure: 'transport_unavailable',
    });
    mockCurrentAuthUid = 'provider-b';
    mockEnsureStableAuthLink.mockResolvedValueOnce({
      ok: true, stableUid: 'stable-a', authUid: 'provider-b', source: 'callable',
    });

    await expect(journal.processPendingAuthLink()).resolves.toBe('quarantined');
    expect(mockEnsureStableAuthLink).not.toHaveBeenCalled();
    expect(await storedPending()).toMatchObject({
      status: 'quarantined',
      quarantineReason: 'auth_uid_changed',
    });
  });
});
