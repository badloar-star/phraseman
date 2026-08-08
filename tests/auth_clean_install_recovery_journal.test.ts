const storage = new Map<string, string>();
const setItem = jest.fn(async (key: string, value: string) => { storage.set(key, value); });
let pauseRemove: null | (() => Promise<void>) = null;
let removeIsNoop = false;
const removeItem = jest.fn(async (key: string) => {
  await pauseRemove?.();
  if (!removeIsNoop) storage.delete(key);
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
    setItem: (key: string, value: string) => setItem(key, value),
    removeItem: (key: string) => removeItem(key),
  },
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync: async (_algorithm: string, value: string) => (
    value === 'provider-uid' ? 'a' : 'b'
  ).repeat(64),
}));

const NOW = 1_800_000_000_000;
const SECRET_SENTINELS = [
  '481927',
  'secret-owner+clean-install@example.invalid',
  'native-id-token-clean-install-secret',
  'custom-token-clean-install-secret',
  'firebase-raw-uid-clean-install-secret',
] as const;

function expectNoSecretSentinels(raw: string): void {
  for (const sentinel of SECRET_SENTINELS) {
    expect(raw).not.toContain(sentinel);
  }
}

const SOURCE_SCOPE = {
  provider: 'google' as const,
  sourceStableId: 'local-stable',
  requesterUidHash: 'a'.repeat(64),
  sourceAuthUidHash: 'c'.repeat(64),
  sourceAccountGeneration: 7,
};

const CHALLENGE_INPUT = {
  ...SOURCE_SCOPE,
  challengeId: 'clean_challenge_1234567890',
  requestClientRequestId: 'request-1',
  confirmClientRequestId: 'confirm-1',
  expiresInSec: 600,
  now: NOW,
};

describe('clean-install recovery opaque journal', () => {
  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();
    pauseRemove = null;
    removeIsNoop = false;
  });

  it('persists an opaque account-scoped challenge with a hard ten-minute TTL', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    const requesterUidHash = await journal.hashCleanInstallRequesterUid('provider-uid');
    await journal.persistCleanInstallChallenge({
      ...CHALLENGE_INPUT,
      requesterUidHash,
      expiresInSec: 5_000,
      submittedCodeForBoundaryTest: SECRET_SENTINELS[0],
      emailForBoundaryTest: SECRET_SENTINELS[1],
      nativeTokenForBoundaryTest: SECRET_SENTINELS[2],
      customTokenForBoundaryTest: SECRET_SENTINELS[3],
      rawUidForBoundaryTest: SECRET_SENTINELS[4],
    } as any);

    const raw = storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY) ?? '';
    expect(raw).not.toContain('provider-uid');
    expectNoSecretSentinels(raw);
    const persisted = JSON.parse(raw);
    expect(Object.keys(persisted).sort()).toEqual([
      'challengeId',
      'confirmClientRequestId',
      'createdAt',
      'expiresAt',
      'phase',
      'provider',
      'requestClientRequestId',
      'requesterUidHash',
      'sourceAuthUidHash',
      'sourceAccountGeneration',
      'sourceStableId',
      'version',
    ].sort());
    expect(persisted).toMatchObject({
      version: 1,
      phase: 'challenge',
      provider: 'google',
      sourceStableId: 'local-stable',
      requesterUidHash: 'a'.repeat(64),
      sourceAuthUidHash: 'c'.repeat(64),
      sourceAccountGeneration: 7,
      challengeId: 'clean_challenge_1234567890',
      createdAt: NOW,
      expiresAt: NOW + journal.AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS,
    });
    await expect(journal.readCleanInstallRecoveryJournal({
      ...SOURCE_SCOPE, requesterUidHash, now: NOW,
    })).resolves.toMatchObject({ status: 'ready', journal: { phase: 'challenge' } });
  });

  it.each([
    ['code', SECRET_SENTINELS[0]],
    ['email', SECRET_SENTINELS[1]],
    ['customToken', SECRET_SENTINELS[2]],
    ['requesterUid', SECRET_SENTINELS[3]],
    ['unexpected', 'anything'],
  ])('quarantines a challenge journal carrying forbidden key %s', async (key, value) => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    const persisted = JSON.parse(storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)!);
    storage.set(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY, JSON.stringify({ ...persisted, [key]: value }));

    await expect(journal.readCleanInstallRecoveryJournal({
      ...SOURCE_SCOPE, now: NOW,
    })).resolves.toEqual({ status: 'quarantined', reason: 'journal_invalid' });
  });

  it.each([
    ['provider', { provider: 'apple' }],
    ['source stable', { sourceStableId: 'other-stable' }],
    ['requester', { requesterUidHash: 'b'.repeat(64) }],
    ['source auth', { sourceAuthUidHash: 'd'.repeat(64) }],
    ['source generation', { sourceAccountGeneration: 8 }],
  ])('fails closed on %s scope mismatch', async (_label, override) => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    await expect(journal.readCleanInstallRecoveryJournal({
      ...SOURCE_SCOPE, now: NOW, ...override,
    } as any)).resolves.toEqual({ status: 'quarantined', reason: 'scope_mismatch' });
  });

  it('promotes only to a bounded confirmed phase and clears by exact snapshot', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    const rawChallenge = storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)!;
    await journal.promoteCleanInstallRecoveryConfirmed(rawChallenge, {
      targetStableId: 'target-stable', recoveryEventId: 'event-1',
      handoffRequestId: 'handoff-1', handoffEligibleUntil: NOW + 60_000, now: NOW,
      submittedCodeForBoundaryTest: SECRET_SENTINELS[0],
      emailForBoundaryTest: SECRET_SENTINELS[1],
      nativeTokenForBoundaryTest: SECRET_SENTINELS[2],
      customTokenForBoundaryTest: SECRET_SENTINELS[3],
      rawUidForBoundaryTest: SECRET_SENTINELS[4],
    } as any);
    const rawConfirmed = storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)!;
    expectNoSecretSentinels(rawConfirmed);
    const confirmed = JSON.parse(rawConfirmed);
    expect(Object.keys(confirmed).sort()).toEqual([
      'challengeId',
      'confirmClientRequestId',
      'createdAt',
      'expiresAt',
      'handoffRequestId',
      'phase',
      'provider',
      'recoveryEventId',
      'requestClientRequestId',
      'requesterUidHash',
      'sourceAuthUidHash',
      'sourceAccountGeneration',
      'sourceStableId',
      'targetStableId',
      'version',
    ].sort());
    expect(confirmed).toMatchObject({
      phase: 'confirmed', targetStableId: 'target-stable', recoveryEventId: 'event-1',
      handoffRequestId: 'handoff-1', expiresAt: NOW + 60_000,
    });
    await journal.clearCleanInstallRecoveryJournalIfExact(rawChallenge);
    expect(storage.has(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)).toBe(true);
    await expect(journal.clearCleanInstallRecoveryJournalIfExact(rawConfirmed))
      .resolves.toBe(false);
    expect(storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)).toBe(rawConfirmed);
    await expect(journal.clearCompletedCleanInstallRecoveryJournalIfExact(rawConfirmed, {
      targetStableId: 'wrong-target', recoveryEventId: 'event-1',
    })).resolves.toBe(false);
    await expect(journal.clearCompletedCleanInstallRecoveryJournalIfExact(rawConfirmed, {
      targetStableId: 'target-stable', recoveryEventId: 'event-1',
    })).resolves.toBe(true);
    expect(storage.has(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)).toBe(false);
    for (const [, persistedRaw] of setItem.mock.calls) expectNoSecretSentinels(persistedRaw);
  });

  it('allows expiry cleanup only for a pre-confirm challenge', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    await journal.persistCleanInstallChallenge({ ...CHALLENGE_INPUT, expiresInSec: 1 });
    await expect(journal.readCleanInstallRecoveryJournal({
      ...SOURCE_SCOPE, now: NOW + 1_001,
    })).resolves.toEqual({ status: 'expired' });
    const expiredRaw = storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)!;
    await expect(journal.clearCleanInstallRecoveryJournalIfExact(expiredRaw)).resolves.toBe(true);
    expect(storage.has(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)).toBe(false);
  });

  it('retains an expired confirmed journal as a blocking repair record', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    const challengeRaw = await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    const confirmedRaw = await journal.promoteCleanInstallRecoveryConfirmed(challengeRaw, {
      targetStableId: 'target-stable', recoveryEventId: 'event-1', handoffRequestId: 'handoff-1',
      handoffEligibleUntil: NOW + 1_000, now: NOW,
    });
    await expect(journal.readCleanInstallRecoveryJournal({
      ...SOURCE_SCOPE, now: NOW + 1_001,
    })).resolves.toEqual({ status: 'quarantined', reason: 'confirmed_expired' });
    await expect(journal.clearCleanInstallRecoveryJournalIfExact(confirmedRaw)).resolves.toBe(false);
    expect(storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)).toBe(confirmedRaw);
  });

  it('quarantines a persisted lifetime beyond the hard cap', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    const raw = await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    const tampered = JSON.parse(raw);
    tampered.expiresAt = tampered.createdAt + journal.AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS + 1;
    storage.set(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY, JSON.stringify(tampered));
    await expect(journal.readCleanInstallRecoveryJournal({ ...SOURCE_SCOPE, now: NOW }))
      .resolves.toEqual({ status: 'quarantined', reason: 'journal_invalid' });
  });

  it.each(['challenge', 'confirmed'])('quarantines future createdAt in %s phase', async (phase) => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    const challengeRaw = await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    const raw = phase === 'confirmed'
      ? await journal.promoteCleanInstallRecoveryConfirmed(challengeRaw, {
        targetStableId: 'target-stable', recoveryEventId: 'event-1', handoffRequestId: 'handoff-1',
        handoffEligibleUntil: NOW + 60_000, now: NOW,
      })
      : challengeRaw;
    const tampered = JSON.parse(raw);
    tampered.createdAt = NOW + 1;
    tampered.expiresAt = tampered.createdAt + 1_000;
    storage.set(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY, JSON.stringify(tampered));
    await expect(journal.readCleanInstallRecoveryJournal({ ...SOURCE_SCOPE, now: NOW }))
      .resolves.toEqual({ status: 'quarantined', reason: 'journal_invalid' });
  });

  it('serializes replacement with stale exact-clear so the replacement survives', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    const oldRaw = await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    const replacement = { ...CHALLENGE_INPUT, challengeId: 'replacement_challenge_123456', now: NOW + 1 };
    await Promise.all([
      journal.persistCleanInstallChallenge(replacement),
      journal.clearCleanInstallRecoveryJournalIfExact(oldRaw),
    ]);
    const finalRaw = storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)!;
    expect(JSON.parse(finalRaw).challengeId).toBe(replacement.challengeId);
  });

  it('keeps a queued replacement when stale clear already owns the old snapshot', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    const oldRaw = await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    let announceRemove!: () => void;
    let releaseRemove!: () => void;
    const removeStarted = new Promise<void>((resolve) => { announceRemove = resolve; });
    const removeReleased = new Promise<void>((resolve) => { releaseRemove = resolve; });
    pauseRemove = async () => {
      announceRemove();
      await removeReleased;
    };

    const staleClear = journal.clearCleanInstallRecoveryJournalIfExact(oldRaw);
    await removeStarted;
    const replacement = {
      ...CHALLENGE_INPUT,
      challengeId: 'replacement_challenge_123456',
      now: NOW + 1,
    };
    const queuedReplacement = journal.persistCleanInstallChallenge(replacement);
    releaseRemove();
    await expect(staleClear).resolves.toBe(true);
    await queuedReplacement;
    expect(JSON.parse(storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)!).challengeId)
      .toBe(replacement.challengeId);
  });

  it('fails clear when storage resolves remove without satisfying the postcondition', async () => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    const raw = await journal.persistCleanInstallChallenge(CHALLENGE_INPUT);
    removeIsNoop = true;
    await expect(journal.clearCleanInstallRecoveryJournalIfExact(raw))
      .rejects.toThrow('clean_recovery_journal_clear_failed');
    expect(storage.get(journal.AUTH_CLEAN_INSTALL_RECOVERY_KEY)).toBe(raw);
  });

  it.each([
    ['coerced source stable', { sourceStableId: 123 }],
    ['fractional source generation', { sourceAccountGeneration: 7.5 }],
    ['uninitialized source generation', { sourceAccountGeneration: 0 }],
    ['coerced expiry', { expiresInSec: '600' }],
    ['short challenge', { challengeId: 'short' }],
    ['punctuated challenge', { challengeId: 'clean.challenge.123456789012' }],
    ['fractional now', { now: NOW + 0.5 }],
  ])('rejects strict write boundary: %s', async (_label, override) => {
    const journal = require('../app/auth_clean_install_recovery_journal') as typeof import('../app/auth_clean_install_recovery_journal');
    await expect(journal.persistCleanInstallChallenge({ ...CHALLENGE_INPUT, ...override } as any))
      .rejects.toThrow();
  });
});
