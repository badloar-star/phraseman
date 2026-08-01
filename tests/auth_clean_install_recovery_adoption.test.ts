const storage = new Map<string, string>();
const setItem = jest.fn(async (key: string, value: string) => { storage.set(key, value); });
let failAdoptionRemoveOnce = false;
const removeItem = jest.fn(async (key: string) => {
  if (key === 'auth_clean_install_recovery_adoption_v1' && failAdoptionRemoveOnce) {
    failAdoptionRemoveOnce = false;
    throw new Error('simulated-adoption-clear-crash');
  }
  storage.delete(key);
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => Promise.resolve(storage.get(key) ?? null),
    setItem: (key: string, value: string) => setItem(key, value),
    removeItem: (key: string) => removeItem(key),
  },
}));

const events: string[] = [];
let lockHeld = false;
let stableId = 'local-stable';
const getStableId = jest.fn(async () => stableId);
const setStableId = jest.fn(async (next: string) => {
  expect(lockHeld).toBe(true);
  events.push(`stable:${next}`); stableId = next;
});
jest.mock('../app/stable_id', () => ({
  getStableId: () => getStableId(),
  setStableId: (next: string) => setStableId(next),
}));

let generation = { generation: 7, stableId: 'local-stable', phase: 'active' as const };
const invalidate = jest.fn(() => {
  events.push('invalidate');
  generation = { generation: 8, stableId: null as any, phase: 'transitioning' as any };
  return { ...generation };
});
const begin = jest.fn((next: string) => { events.push(`begin:${next}`); generation = { generation: 9, stableId: next, phase: 'active' }; return generation; });
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ ...generation }),
  isCurrentAccountGeneration: (token: any, expected?: string) => (
    token.generation === generation.generation
    && token.phase === 'active'
    && generation.phase === 'active'
    && token.stableId === generation.stableId
    && (expected === undefined || expected === generation.stableId)
  ),
  invalidateAccountGeneration: () => invalidate(),
  beginAccountGeneration: (next: string) => begin(next),
  withAccountTransitionLock: async (work: () => Promise<unknown>) => work(),
  withAccountTransitionLockWithDeadline: async (work: () => Promise<unknown>) => {
    lockHeld = true;
    try { return { completed: true, value: await work() }; } finally { lockHeld = false; }
  },
}));

let pendingDelete = false;
const readPendingDelete = jest.fn(async () => pendingDelete ? '{"pending":true}' : null);
jest.mock('../app/account_delete_quarantine', () => ({
  readAccountDeletePendingAuthRaw: () => readPendingDelete(),
}));

const quiesce = jest.fn(async () => { events.push('quiesce'); return true; });
const backup = jest.fn(async () => { events.push('backup'); return true; });
const wipe = jest.fn(async () => {
  expect(lockHeld).toBe(true);
  events.push('wipe');
  const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
  expect(storage.has(adoption.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(true);
  expect(storage.has('auth_clean_install_recovery_v1')).toBe(true);
});
const complete = jest.fn(async () => { expect(lockHeld).toBe(true); events.push('ack'); });
const restore = jest.fn(async () => { expect(lockHeld).toBe(true); events.push('restore'); return { restored: true }; });
jest.mock('../app/cloud_sync', () => ({
  quiesceCloudSyncForAccountTransition: () => quiesce(),
  saveAccountSwitchEmergencyBackup: (...args: unknown[]) => backup(...args as []),
  wipeLocalAccountDataForCleanInstallRecoveryWhileLocked: () => wipe(),
  completeAuthRecoveryHandoffViaServer: (...args: unknown[]) => complete(...args as []),
  restoreFromCloudDetailed: (...args: unknown[]) => restore(...args as []),
}));

const beginPremium = jest.fn(() => { events.push('premium'); return 1; });
const waitPremium = jest.fn(async () => true);
jest.mock('../app/premium_guard', () => ({
  beginPremiumAccountTransition: () => beginPremium(),
  waitForPremiumAccountWorkIdleWithDeadline: () => waitPremium(),
}));

const syncRevenueCat = jest.fn(async () => { events.push('revenuecat'); return true; });
jest.mock('../app/revenuecat_init', () => ({
  syncRevenueCatIdentity: (...args: unknown[]) => syncRevenueCat(...args as []),
}));
const loadShards = jest.fn(async () => { events.push('shards'); });
jest.mock('../app/shards_system', () => ({ loadShardsFromCloud: () => loadShards() }));

const clearCleanJournal = jest.fn(async () => {
  events.push('clear-clean');
  storage.delete('auth_clean_install_recovery_v1');
  return true;
});
jest.mock('../app/auth_clean_install_recovery_journal', () => ({
  AUTH_CLEAN_INSTALL_RECOVERY_KEY: 'auth_clean_install_recovery_v1',
  clearCompletedCleanInstallRecoveryJournalIfExact: (...args: unknown[]) => clearCleanJournal(...args as []),
}));

let authUser: null | { uid: string; isAnonymous: boolean } = {
  uid: 'source-anon-auth', isAnonymous: true,
};
const signIn = jest.fn(async (_token?: string) => {
  expect(lockHeld).toBe(true);
  events.push('sign-in');
  authUser = { uid: 'provider-uid', isAnonymous: false };
  return { user: authUser };
});
const authInstance = {
  get currentUser() { return authUser; },
  signInWithCustomToken: (token: string) => signIn(token),
};
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => authInstance,
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync: async (_algorithm: string, value: string) => (
    value === 'provider-uid' ? 'a' : 'b'
  ).repeat(64),
}));

const NOW = 1_800_000_000_000;
let nowValue = NOW;
const TOKEN = `${'a'.repeat(40)}.${'b'.repeat(40)}.${'c'.repeat(40)}`;
const CLEAN_RAW = JSON.stringify({ phase: 'confirmed', opaque: true });

function validInput() {
  return {
    customToken: TOKEN,
    recoveryEventId: 'event-1',
    sourceStableId: 'local-stable',
    targetStableId: 'target-stable',
    sourceAuthUid: 'source-anon-auth',
    expectedUid: 'provider-uid',
    sourceAccountGeneration: 7,
    handoffAcknowledgeUntil: NOW + 60_000,
    cleanRecoveryJournalRaw: CLEAN_RAW,
  };
}

describe('dedicated clean-install L→S recovery adoption', () => {
  beforeEach(() => {
    jest.resetModules();
    nowValue = NOW;
    jest.spyOn(Date, 'now').mockImplementation(() => nowValue);
    storage.clear();
    storage.set('auth_clean_install_recovery_v1', CLEAN_RAW);
    events.length = 0;
    stableId = 'local-stable';
    generation = { generation: 7, stableId: 'local-stable', phase: 'active' };
    authUser = { uid: 'source-anon-auth', isAnonymous: true };
    pendingDelete = false;
    failAdoptionRemoveOnce = false;
    lockHeld = false;
    jest.clearAllMocks();
    signIn.mockImplementation(async () => {
      expect(lockHeld).toBe(true);
      events.push('sign-in');
      authUser = { uid: 'provider-uid', isAnonymous: false };
      return { user: authUser };
    });
    setStableId.mockImplementation(async next => {
      expect(lockHeld).toBe(true);
      events.push(`stable:${next}`); stableId = next;
    });
    quiesce.mockImplementation(async () => { events.push('quiesce'); return true; });
    backup.mockImplementation(async () => { events.push('backup'); return true; });
    wipe.mockImplementation(async () => {
      expect(lockHeld).toBe(true);
      events.push('wipe');
      const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
      expect(storage.has(adoption.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(true);
      expect(storage.has('auth_clean_install_recovery_v1')).toBe(true);
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('adopts authoritative distinct target after source-only wipe without local merge', async () => {
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput()))
      .resolves.toEqual({ result: 'completed' });
    expect(signIn).toHaveBeenCalledWith(TOKEN);
    expect(backup).toHaveBeenCalledWith('clean_install_recovery', 'local-stable');
    expect(setStableId).toHaveBeenCalledWith('target-stable');
    expect(events).toEqual([
      'invalidate', 'premium', 'quiesce', 'backup', 'sign-in', 'wipe',
      'stable:target-stable', 'begin:target-stable', 'ack', 'restore', 'shards',
      'revenuecat', 'clear-clean',
    ]);
    expect(storage.has(adoption.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(false);
  });

  it.each([
    ['missing', null],
    ['provider', { uid: 'source-anon-auth', isAnonymous: false }],
    ['wrong uid', { uid: 'other-anon', isAnonymous: true }],
  ])('requires hydrated exact anonymous default auth: %s', async (_label, user) => {
    authUser = user as typeof authUser;
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput())).rejects.toThrow();
    expect(signIn).not.toHaveBeenCalled();
    expect(wipe).not.toHaveBeenCalled();
  });

  it('blocks pending delete before adoption mutation', async () => {
    pendingDelete = true;
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput()))
      .rejects.toThrow('account_delete_pending');
    expect(signIn).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it.each(['uid', 'generation'] as const)('aborts pre-mutation %s drift', async drift => {
    quiesce.mockImplementationOnce(async () => {
      events.push('quiesce');
      if (drift === 'uid') authUser = { uid: 'other-anon', isAnonymous: true };
      else generation = { generation: 8, stableId: 'local-stable', phase: 'active' };
      return true;
    });
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput())).rejects.toThrow();
    expect(signIn).not.toHaveBeenCalled();
    expect(wipe).not.toHaveBeenCalled();
  });

  it('rechecks handoff deadline immediately before default-auth sign-in', async () => {
    quiesce.mockImplementationOnce(async () => {
      events.push('quiesce');
      nowValue = NOW + 60_000;
      return true;
    });
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput()))
      .rejects.toThrow('clean_recovery_handoff_deadline_expired');
    expect(signIn).not.toHaveBeenCalled();
    expect(wipe).not.toHaveBeenCalled();
  });

  it('rechecks handoff deadline after sign-in and before source wipe', async () => {
    signIn.mockImplementationOnce(async () => {
      events.push('sign-in');
      authUser = { uid: 'provider-uid', isAnonymous: false };
      nowValue = NOW + 60_000;
      return { user: authUser };
    });
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput()))
      .rejects.toThrow('clean_recovery_handoff_deadline_expired');
    expect(wipe).not.toHaveBeenCalled();
    expect(storage.has(adoption.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(true);
  });

  it('keeps both journals when target UID mismatches after default-auth mutation', async () => {
    signIn.mockImplementationOnce(async () => {
      events.push('sign-in');
      authUser = { uid: 'wrong-provider', isAnonymous: false };
      return { user: authUser };
    });
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput()))
      .resolves.toEqual({ result: 'quarantined', reason: 'auth_uid_mismatch' });
    expect(storage.has(adoption.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(true);
    expect(storage.has('auth_clean_install_recovery_v1')).toBe(true);
    expect(wipe).not.toHaveBeenCalled();
  });

  it('resumes after a crash following source wipe without merging source data', async () => {
    setStableId.mockRejectedValueOnce(new Error('simulated-crash'));
    const first = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(first.adoptCleanInstallRecoveryHandoff(validInput())).rejects.toThrow('simulated-crash');
    expect(wipe).toHaveBeenCalledTimes(1);
    expect(storage.has(first.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(true);
    expect(storage.has('auth_clean_install_recovery_v1')).toBe(true);

    jest.resetModules();
    setStableId.mockImplementation(async next => {
      expect(lockHeld).toBe(true);
      events.push(`stable:${next}`); stableId = next;
    });
    const restarted = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(restarted.resumeCleanInstallRecoveryAdoption())
      .resolves.toEqual({ result: 'completed' });
    expect(wipe).toHaveBeenCalledTimes(2);
    expect(setStableId).toHaveBeenLastCalledWith('target-stable');
    expect(storage.has(restarted.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(false);
  });

  it('retains resumable state when target cloud restore fails', async () => {
    restore.mockResolvedValueOnce('failed' as never);
    const adoption = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(adoption.adoptCleanInstallRecoveryHandoff(validInput()))
      .resolves.toEqual({ result: 'quarantined', reason: 'restore_failed' });
    expect(storage.has(adoption.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(true);
    expect(storage.has('auth_clean_install_recovery_v1')).toBe(true);
    expect(clearCleanJournal).not.toHaveBeenCalled();
  });

  it('finishes cleanup after a crash between clean and adoption journal clears', async () => {
    failAdoptionRemoveOnce = true;
    const first = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(first.adoptCleanInstallRecoveryHandoff(validInput()))
      .rejects.toThrow('simulated-adoption-clear-crash');
    expect(storage.has('auth_clean_install_recovery_v1')).toBe(false);
    expect(storage.has(first.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(true);
    const ackCalls = complete.mock.calls.length;
    const restoreCalls = restore.mock.calls.length;

    jest.resetModules();
    const restarted = require('../app/auth_clean_install_recovery_adoption') as typeof import('../app/auth_clean_install_recovery_adoption');
    await expect(restarted.resumeCleanInstallRecoveryAdoption())
      .resolves.toEqual({ result: 'completed' });
    expect(storage.has(restarted.AUTH_CLEAN_INSTALL_ADOPTION_KEY)).toBe(false);
    expect(complete).toHaveBeenCalledTimes(ackCalls);
    expect(restore).toHaveBeenCalledTimes(restoreCalls);
  });
});
