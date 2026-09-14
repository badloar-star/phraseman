const storage = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => storage.get(key) ?? null);
const mockRemoveItem = jest.fn(async (key: string) => { storage.delete(key); });

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: jest.fn(async (key: string, value: string) => { storage.set(key, value); }),
    removeItem: (key: string) => mockRemoveItem(key),
  },
}));

import {
  ACCOUNT_SWITCH_QUARANTINE_KEY,
  ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY,
  ACCOUNT_SWITCH_POST_COMPLETION_HANDOFF_KEY,
  ACCOUNT_PROVIDER_HANDOFF_KEY,
  advanceAccountSwitchQuarantine,
  clearCompletedAccountSwitchQuarantine,
  consumeAccountSwitchPostCompletionHandoff,
  inspectAccountSwitchQuarantine,
  prepareAccountSwitchQuarantine,
  prepareProviderCredentialHandoff,
  markProviderCredentialHandoffAuthenticated,
  markProviderCredentialHandoffCredentialReady,
  resumeAccountSwitchQuarantine,
  type AccountSwitchQuarantineMarker,
  type AccountSwitchRecoveryDependencies,
} from '../app/account_switch_quarantine';

const OPERATION_ID = 'switch_01JTEST0000000000000000000';
const NONCE = 'nonce_01JTEST000000000000000000000';

function dependencies(overrides: Partial<AccountSwitchRecoveryDependencies> = {}) {
  let stableId: string | null = 'stable-A';
  let authUser: { uid: string; isAnonymous: boolean } | null = {
    uid: 'auth-A',
    isAnonymous: false,
  };
  const calls: string[] = [];
  const deps: AccountSwitchRecoveryDependencies = {
    readStableId: jest.fn(async () => stableId),
    readCachedStableId: jest.fn(() => stableId),
    readAuthUser: jest.fn(() => authUser),
    invalidateGeneration: jest.fn(() => { calls.push('invalidate'); }),
    beginPremiumTransition: jest.fn(() => { calls.push('premium'); }),
    quiesce: jest.fn(async () => { calls.push('quiesce'); return true; }),
    signOut: jest.fn(async () => { calls.push('signOut'); authUser = null; }),
    wipeLocalData: jest.fn(async () => { calls.push('wipe'); }),
    clearStableId: jest.fn(async () => { calls.push('clearStable'); stableId = null; }),
    ensureAnonymousIdentity: jest.fn(async () => {
      calls.push('ensureAnon');
      authUser = { uid: 'auth-fresh', isAnonymous: true };
      stableId = 'stable-fresh';
    }),
    activateGeneration: jest.fn((nextStableId: string) => { calls.push(`activate:${nextStableId}`); }),
    ...overrides,
  };
  return { deps, calls, getStableId: () => stableId, getAuthUser: () => authUser };
}

async function prepared() {
  return prepareAccountSwitchQuarantine({
    operationId: OPERATION_ID,
    nonce: NONCE,
    ownerStableId: 'stable-A',
    ownerAuthUid: 'auth-A',
    ownerProvider: 'google',
    now: 1_000,
  });
}

async function preparedAtPhase(phase: AccountSwitchQuarantineMarker['phase']) {
  let marker = await prepared();
  const next: readonly AccountSwitchQuarantineMarker['phase'][] = [
    'provider_signed_out',
    'local_data_cleared',
    'stable_id_cleared',
    'anonymous_authenticated',
    'fresh_stable_created',
    'ready',
  ];
  for (const candidate of next) {
    if (marker.phase === phase) break;
    marker = await advanceAccountSwitchQuarantine(marker, candidate, {
      ...(candidate === 'anonymous_authenticated' ? { freshAuthUid: 'auth-fresh' } : {}),
      ...(candidate === 'fresh_stable_created' || candidate === 'ready'
        ? { freshAuthUid: 'auth-fresh', freshStableId: 'stable-fresh' }
        : {}),
    });
  }
  return marker;
}

describe('durable account-switch quarantine', () => {
  beforeEach(() => {
    storage.clear();
    jest.clearAllMocks();
    mockGetItem.mockImplementation(async (key: string) => storage.get(key) ?? null);
    mockRemoveItem.mockImplementation(async (key: string) => { storage.delete(key); });
  });

  it('persists a strict versioned owner-bound marker before transition work', async () => {
    const marker = await prepared();
    expect(marker).toMatchObject({
      version: 1,
      phase: 'prepared',
      operationId: OPERATION_ID,
      nonce: NONCE,
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      ownerProvider: 'google',
      freshAuthUid: null,
      freshStableId: null,
    });
    expect(JSON.parse(storage.get(ACCOUNT_SWITCH_QUARANTINE_KEY)!)).toEqual(marker);
  });

  it('arms a one-time fresh-identity handoff after a completed switch', async () => {
    await preparedAtPhase('ready');

    await expect(clearCompletedAccountSwitchQuarantine({
      operationId: OPERATION_ID,
      nonce: NONCE,
      freshAuthUid: 'auth-fresh',
      freshStableId: 'stable-fresh',
    })).resolves.toBe(true);

    expect(storage.has(ACCOUNT_SWITCH_POST_COMPLETION_HANDOFF_KEY)).toBe(true);
    await expect(consumeAccountSwitchPostCompletionHandoff({
      freshAuthUid: 'auth-fresh',
      freshStableId: 'stable-fresh',
      now: 1_001,
    })).resolves.toBe(true);
    await expect(consumeAccountSwitchPostCompletionHandoff({
      freshAuthUid: 'auth-fresh',
      freshStableId: 'stable-fresh',
      now: 1_002,
    })).resolves.toBe(false);
  });

  it('advances phases monotonically and makes a repeated advance idempotent', async () => {
    const marker = await prepared();
    const signedOut = await advanceAccountSwitchQuarantine(marker, 'provider_signed_out');
    await expect(advanceAccountSwitchQuarantine(marker, 'local_data_cleared'))
      .rejects.toThrow('account_switch_marker_changed');
    await expect(advanceAccountSwitchQuarantine(signedOut, 'provider_signed_out'))
      .resolves.toEqual(signedOut);
    await expect(advanceAccountSwitchQuarantine(signedOut, 'stable_id_cleared'))
      .rejects.toThrow('account_switch_phase_invalid');
  });

  it('quarantines a corrupt marker without invoking destructive recovery', async () => {
    storage.set(ACCOUNT_SWITCH_QUARANTINE_KEY, '{corrupt');
    const { deps, calls } = dependencies();

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toMatchObject({
      result: 'quarantined',
      reason: 'marker_invalid',
    });
    expect(deps.invalidateGeneration).toHaveBeenCalledTimes(1);
    expect(deps.beginPremiumTransition).toHaveBeenCalledTimes(1);
    expect(calls.slice(0, 2)).toEqual(['invalidate', 'premium']);
    expect(deps.signOut).not.toHaveBeenCalled();
    expect(deps.wipeLocalData).not.toHaveBeenCalled();
    expect(storage.get(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe('{corrupt');
  });

  it('fails closed when the durable marker cannot be read', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage-unavailable'));
    const { deps } = dependencies();

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toMatchObject({
      result: 'retryable',
      reason: 'marker_read_failed',
    });
    expect(deps.invalidateGeneration).toHaveBeenCalledTimes(1);
    expect(deps.beginPremiumTransition).toHaveBeenCalledTimes(1);
    expect(deps.signOut).not.toHaveBeenCalled();
    expect(deps.wipeLocalData).not.toHaveBeenCalled();
  });

  it('never wipes when a prepared A marker is restored beside current provider B', async () => {
    await prepared();
    const { deps } = dependencies({
      readAuthUser: jest.fn(() => ({ uid: 'auth-B', isAnonymous: false })),
    });

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'quarantined',
      reason: 'owner_auth_mismatch',
    });
    expect(deps.signOut).not.toHaveBeenCalled();
    expect(deps.wipeLocalData).not.toHaveBeenCalled();
  });

  it('does not treat a missing owner stable id as proof before destructive phases', async () => {
    await prepared();
    const { deps } = dependencies({
      readStableId: jest.fn(async () => null),
      readCachedStableId: jest.fn(() => null),
    });

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'quarantined',
      reason: 'owner_stable_mismatch',
    });
    expect(deps.signOut).not.toHaveBeenCalled();
    expect(deps.wipeLocalData).not.toHaveBeenCalled();
  });

  it('accepts a hydrated null auth state as a resumable post-signout state', async () => {
    const marker = await prepared();
    await advanceAccountSwitchQuarantine(marker, 'provider_signed_out');
    const { deps } = dependencies();
    await deps.signOut();

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'completed',
      stableId: 'stable-fresh',
      authUid: 'auth-fresh',
    });
    expect(deps.wipeLocalData).toHaveBeenCalledTimes(1);
  });

  it('keeps the marker and generation quarantined after a partial wipe failure', async () => {
    await prepared();
    const { deps } = dependencies({
      wipeLocalData: jest.fn(async () => { throw new Error('disk-full'); }),
    });

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toMatchObject({
      result: 'retryable',
      reason: 'wipe_failed',
    });
    expect((await inspectAccountSwitchQuarantine()).status).toBe('ready');
    expect(JSON.parse(storage.get(ACCOUNT_SWITCH_QUARANTINE_KEY)!).phase)
      .toBe('provider_signed_out');
    expect(deps.activateGeneration).not.toHaveBeenCalled();
  });

  it('retries a partially completed wipe idempotently and activates only after marker removal', async () => {
    await prepared();
    let failOnce = true;
    const built = dependencies({
      wipeLocalData: jest.fn(async () => {
        built.calls.push('wipe');
        if (failOnce) { failOnce = false; throw new Error('disk-full'); }
      }),
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toMatchObject({ result: 'retryable' });
    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(false);
    expect(built.calls.at(-1)).toBe('activate:stable-fresh');
  });

  it('reconciles marker absence in the same attempt when removal succeeded but its promise rejected', async () => {
    await prepared();
    const built = dependencies();
    mockRemoveItem.mockImplementationOnce(async (key: string) => {
      storage.delete(key);
      throw new Error('native response lost');
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(false);
    expect(storage.has(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY)).toBe(false);
    expect(built.calls.at(-1)).toBe('activate:stable-fresh');
  });

  it('reconciles receipt absence in the same attempt when removal succeeded but its promise rejected', async () => {
    await prepared();
    const built = dependencies();
    mockRemoveItem
      .mockImplementationOnce(async (key: string) => { storage.delete(key); })
      .mockImplementationOnce(async (key: string) => {
        storage.delete(key);
        throw new Error('receipt native response lost');
      });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(false);
    expect(storage.has(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY)).toBe(false);
    expect(built.calls.at(-1)).toBe('activate:stable-fresh');
  });

  it('retries receipt deletion when removal rejects before deleting it', async () => {
    await prepared();
    const built = dependencies();
    mockRemoveItem
      .mockImplementationOnce(async (key: string) => { storage.delete(key); })
      .mockImplementationOnce(async () => { throw new Error('receipt remove rejected before delete'); });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toMatchObject({ result: 'retryable' });
    expect(storage.has(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY)).toBe(true);
    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
  });

  it('retries ready-marker deletion when the exact receipt exists and remove threw before deletion', async () => {
    await prepared();
    const built = dependencies();
    mockRemoveItem.mockImplementationOnce(async () => {
      throw new Error('native remove rejected before delete');
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toMatchObject({
      result: 'retryable',
    });
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(true);
    expect(storage.has(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY)).toBe(true);

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(false);
    expect(storage.has(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY)).toBe(false);
  });

  it.each([
    'prepared',
    'provider_signed_out',
    'local_data_cleared',
    'stable_id_cleared',
    'anonymous_authenticated',
    'fresh_stable_created',
    'ready',
  ] as const)('resumes idempotently after a crash at phase %s', async (phase) => {
    await preparedAtPhase(phase);
    const built = dependencies();
    const phaseIndex = [
      'prepared',
      'provider_signed_out',
      'local_data_cleared',
      'stable_id_cleared',
      'anonymous_authenticated',
      'fresh_stable_created',
      'ready',
    ].indexOf(phase);
    if (phaseIndex >= 1) await built.deps.signOut();
    if (phaseIndex >= 3) await built.deps.clearStableId();
    if (phaseIndex >= 4) await built.deps.ensureAnonymousIdentity();

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(false);
    expect(built.deps.activateGeneration).toHaveBeenCalledTimes(1);
  });

  it('does not activate or clear when the fresh anonymous identity is incoherent', async () => {
    await prepared();
    const { deps } = dependencies({
      ensureAnonymousIdentity: jest.fn(async () => {}),
    });

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'quarantined', reason: 'fresh_identity_invalid',
    });
    expect(deps.activateGeneration).not.toHaveBeenCalled();
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(true);
  });

  it('will not clear a completed marker unless the exact operation and fresh proof match', async () => {
    let marker = await prepared();
    marker = await advanceAccountSwitchQuarantine(marker, 'provider_signed_out');
    marker = await advanceAccountSwitchQuarantine(marker, 'local_data_cleared');
    marker = await advanceAccountSwitchQuarantine(marker, 'stable_id_cleared');
    marker = await advanceAccountSwitchQuarantine(marker, 'anonymous_authenticated', {
      freshAuthUid: 'auth-fresh',
    });
    marker = await advanceAccountSwitchQuarantine(marker, 'fresh_stable_created', {
      freshAuthUid: 'auth-fresh', freshStableId: 'stable-fresh',
    });
    marker = await advanceAccountSwitchQuarantine(marker, 'ready', {
      freshAuthUid: 'auth-fresh', freshStableId: 'stable-fresh',
    });

    await expect(clearCompletedAccountSwitchQuarantine({
      operationId: marker.operationId,
      nonce: 'nonce_wrong_wrong_wrong_wrong_wrong',
      freshAuthUid: 'auth-fresh',
      freshStableId: 'stable-fresh',
    })).resolves.toBe(false);
    expect(storage.has(ACCOUNT_SWITCH_QUARANTINE_KEY)).toBe(true);
  });

  it('recovers a crash before provider credential replacement without wiping the clean source', async () => {
    await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_01',
      nonce: 'provider_handoff_nonce_01',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 2_000,
    });
    const built = dependencies({
      readAuthUser: jest.fn(() => ({ uid: 'auth-A', isAnonymous: true, provider: 'anonymous' })),
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-A', authUid: 'auth-A',
    });
    expect(built.deps.wipeLocalData).not.toHaveBeenCalled();
    expect(storage.has(ACCOUNT_PROVIDER_HANDOFF_KEY)).toBe(false);
    expect(built.calls.at(-1)).toBe('activate:stable-A');
  });

  it('reconciles provider-handoff marker absence in the same attempt after delete-then-throw', async () => {
    await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_remove_01',
      nonce: 'provider_handoff_remove_nonce_01',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 2_100,
    });
    const built = dependencies({
      readAuthUser: jest.fn(() => ({ uid: 'auth-A', isAnonymous: true, provider: 'anonymous' })),
    });
    mockRemoveItem.mockImplementationOnce(async (key: string) => {
      storage.delete(key);
      throw new Error('provider handoff native response lost');
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-A', authUid: 'auth-A',
    });
    expect(storage.has(ACCOUNT_PROVIDER_HANDOFF_KEY)).toBe(false);
    expect(built.calls.at(-1)).toBe('activate:stable-A');
  });

  it('retries provider-handoff deletion when removal rejects before deleting it', async () => {
    await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_remove_02',
      nonce: 'provider_handoff_remove_nonce_02',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 2_200,
    });
    const built = dependencies({
      readAuthUser: jest.fn(() => ({ uid: 'auth-A', isAnonymous: true, provider: 'anonymous' })),
    });
    mockRemoveItem.mockImplementationOnce(async () => {
      throw new Error('provider handoff remove rejected before delete');
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toMatchObject({ result: 'retryable' });
    expect(storage.has(ACCOUNT_PROVIDER_HANDOFF_KEY)).toBe(true);
    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-A', authUid: 'auth-A',
    });
  });

  it('rolls a crash after provider replacement back to a fresh anonymous identity', async () => {
    let marker = await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_02',
      nonce: 'provider_handoff_nonce_02',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'apple',
      now: 3_000,
    });
    marker = await markProviderCredentialHandoffCredentialReady(marker, 'apple-sub-B');
    await markProviderCredentialHandoffAuthenticated(marker, 'auth-B');
    let stableId: string | null = 'stable-A';
    let authUser: {
      uid: string;
      isAnonymous: boolean;
      provider?: 'apple' | 'anonymous';
      providerSubjects?: Partial<Record<'google' | 'apple', string>>;
    } | null = {
      uid: 'auth-B', isAnonymous: false, provider: 'apple',
      providerSubjects: { apple: 'apple-sub-B' },
    };
    const calls: string[] = [];
    const deps: AccountSwitchRecoveryDependencies = {
      readStableId: async () => stableId,
      readCachedStableId: () => stableId,
      readAuthUser: () => authUser,
      invalidateGeneration: () => { calls.push('invalidate'); },
      beginPremiumTransition: () => { calls.push('premium'); },
      quiesce: async () => true,
      signOut: async () => { calls.push('signOut'); authUser = null; },
      wipeLocalData: async () => { calls.push('wipe'); },
      clearStableId: async () => { calls.push('clearStable'); stableId = null; },
      ensureAnonymousIdentity: async () => {
        calls.push('ensureAnon');
        stableId = 'stable-fresh';
        authUser = { uid: 'auth-fresh', isAnonymous: true, provider: 'anonymous' };
      },
      activateGeneration: (value) => { calls.push(`activate:${value}`); },
    };

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(calls).toEqual(expect.arrayContaining(['signOut', 'wipe', 'clearStable', 'ensureAnon']));
    expect(storage.has(ACCOUNT_PROVIDER_HANDOFF_KEY)).toBe(false);
    expect(calls.at(-1)).toBe('activate:stable-fresh');
  });

  it('reconciles the exact crash window after credential mutation but before authenticated phase', async () => {
    const marker = await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_window_01',
      nonce: 'provider_handoff_window_nonce_01',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 3_500,
    });
    await markProviderCredentialHandoffCredentialReady(marker, 'google-sub-B');
    let stableId: string | null = 'stable-A';
    let authUser: {
      uid: string;
      isAnonymous: boolean;
      provider?: 'google' | 'anonymous';
      providerSubjects?: Partial<Record<'google' | 'apple', string>>;
    } | null = {
      uid: 'auth-B', isAnonymous: false, provider: 'google',
      providerSubjects: { google: 'google-sub-B' },
    };
    const deps: AccountSwitchRecoveryDependencies = {
      readStableId: async () => stableId,
      readCachedStableId: () => stableId,
      readAuthUser: () => authUser,
      invalidateGeneration: jest.fn(),
      beginPremiumTransition: jest.fn(),
      quiesce: async () => true,
      signOut: jest.fn(async () => { authUser = null; }),
      wipeLocalData: jest.fn(async () => {}),
      clearStableId: async () => { stableId = null; },
      ensureAnonymousIdentity: async () => {
        stableId = 'stable-fresh';
        authUser = { uid: 'auth-fresh', isAnonymous: true, provider: 'anonymous' };
      },
      activateGeneration: jest.fn(),
    };

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(deps.wipeLocalData).toHaveBeenCalledTimes(1);
  });

  it('reconciles Apple credential_ready only from the exact Apple subject proof', async () => {
    const marker = await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_apple_subject_01',
      nonce: 'provider_handoff_apple_subject_nonce_01',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'apple',
      now: 3_510,
    });
    await markProviderCredentialHandoffCredentialReady(marker, 'apple-sub-B');
    let stableId: string | null = 'stable-A';
    let authUser: AccountSwitchRecoveryDependencies['readAuthUser'] extends () => infer T ? T : never = {
      uid: 'auth-B', isAnonymous: false, provider: 'apple',
      providerSubjects: { apple: 'apple-sub-B' },
    };
    const deps: AccountSwitchRecoveryDependencies = {
      readStableId: async () => stableId,
      readCachedStableId: () => stableId,
      readAuthUser: () => authUser,
      invalidateGeneration: jest.fn(),
      beginPremiumTransition: jest.fn(),
      quiesce: async () => true,
      signOut: async () => { authUser = null; },
      wipeLocalData: jest.fn(async () => {}),
      clearStableId: async () => { stableId = null; },
      ensureAnonymousIdentity: async () => {
        stableId = 'stable-fresh';
        authUser = { uid: 'auth-fresh', isAnonymous: true, provider: 'anonymous' };
      },
      activateGeneration: jest.fn(),
    };

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
  });

  it('uses the marker provider subject on a dual-linked Firebase account', async () => {
    const marker = await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_dual_subject_01',
      nonce: 'provider_handoff_dual_subject_nonce_01',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 3_520,
    });
    await markProviderCredentialHandoffCredentialReady(marker, 'google-sub-B');
    let stableId: string | null = 'stable-A';
    let authUser: ReturnType<AccountSwitchRecoveryDependencies['readAuthUser']> = {
      uid: 'auth-B', isAnonymous: false, provider: 'apple',
      providerSubjects: { apple: 'apple-sub-B', google: 'google-sub-B' },
    };
    const deps: AccountSwitchRecoveryDependencies = {
      readStableId: async () => stableId,
      readCachedStableId: () => stableId,
      readAuthUser: () => authUser,
      invalidateGeneration: jest.fn(), beginPremiumTransition: jest.fn(), quiesce: async () => true,
      signOut: jest.fn(async () => { authUser = null; }),
      wipeLocalData: jest.fn(async () => {}),
      clearStableId: async () => { stableId = null; },
      ensureAnonymousIdentity: async () => {
        stableId = 'stable-fresh';
        authUser = { uid: 'auth-fresh', isAnonymous: true, provider: 'anonymous' };
      },
      activateGeneration: jest.fn(),
    };

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
  });

  it('rolls back safely when credential_ready has no provider subject proof', async () => {
    const marker = await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_missing_subject_01',
      nonce: 'provider_handoff_missing_subject_nonce_01',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 3_530,
    });
    await markProviderCredentialHandoffCredentialReady(marker, null);
    let stableId: string | null = 'stable-A';
    let authUser: ReturnType<AccountSwitchRecoveryDependencies['readAuthUser']> = {
      uid: 'auth-B', isAnonymous: false, provider: 'google',
      providerSubjects: { google: 'google-sub-B' },
    };
    const deps: AccountSwitchRecoveryDependencies = {
      readStableId: async () => stableId,
      readCachedStableId: () => stableId,
      readAuthUser: () => authUser,
      invalidateGeneration: jest.fn(), beginPremiumTransition: jest.fn(), quiesce: async () => true,
      signOut: jest.fn(async () => { authUser = null; }),
      wipeLocalData: jest.fn(async () => {}),
      clearStableId: async () => { stableId = null; },
      ensureAnonymousIdentity: async () => {
        stableId = 'stable-fresh';
        authUser = { uid: 'auth-fresh', isAnonymous: true, provider: 'anonymous' };
      },
      activateGeneration: jest.fn(),
    };

    await expect(resumeAccountSwitchQuarantine(deps)).resolves.toEqual({
      result: 'completed', stableId: 'stable-fresh', authUid: 'auth-fresh',
    });
    expect(deps.signOut).toHaveBeenCalledTimes(1);
    expect(deps.wipeLocalData).toHaveBeenCalledTimes(1);
  });

  it('does not infer credential readiness from a prepared marker beside provider B', async () => {
    await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_window_02',
      nonce: 'provider_handoff_window_nonce_02',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 3_600,
    });
    const built = dependencies({
      readAuthUser: jest.fn(() => ({
        uid: 'auth-B', isAnonymous: false, provider: 'google', providerSubject: 'google-sub-B',
      })),
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'quarantined', reason: 'provider_auth_mismatch',
    });
    expect(built.deps.wipeLocalData).not.toHaveBeenCalled();
  });

  it('never wipes an authenticated provider when restored handoff ownership mismatches', async () => {
    const marker = await prepareProviderCredentialHandoff({
      operationId: 'provider_handoff_03',
      nonce: 'provider_handoff_nonce_03',
      ownerStableId: 'stable-A',
      ownerAuthUid: 'auth-A',
      provider: 'google',
      now: 4_000,
    });
    const ready = await markProviderCredentialHandoffCredentialReady(marker, 'google-sub-B');
    await markProviderCredentialHandoffAuthenticated(ready, 'auth-B');
    const built = dependencies({
      readStableId: jest.fn(async () => 'stable-B'),
      readAuthUser: jest.fn(() => ({ uid: 'auth-B', isAnonymous: false, provider: 'google' })),
    });

    await expect(resumeAccountSwitchQuarantine(built.deps)).resolves.toEqual({
      result: 'quarantined', reason: 'owner_stable_mismatch',
    });
    expect(built.deps.signOut).not.toHaveBeenCalled();
    expect(built.deps.wipeLocalData).not.toHaveBeenCalled();
  });
});
