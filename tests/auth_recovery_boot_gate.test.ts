const storage = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string) => storage.get(key) ?? null);
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: (key: string) => mockGetItem(key) },
}));

type AuthUser = { uid: string } | null;
let authListener: ((user: AuthUser) => void) | null = null;
const mockUnsubscribe = jest.fn();
const mockOnAuthStateChanged = jest.fn((listener: (user: AuthUser) => void) => {
  authListener = listener;
  return mockUnsubscribe;
});
const mockAuth = { onAuthStateChanged: mockOnAuthStateChanged };
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuth,
}));

const events: string[] = [];
const mockInvalidate = jest.fn(() => { events.push('invalidate'); });
jest.mock('../app/account_generation', () => ({
  invalidateAccountGeneration: () => mockInvalidate(),
}));

const mockQuiesce = jest.fn(async (_timeoutMs: number) => {
  events.push('quiesce');
  return true;
});
jest.mock('../app/cloud_sync', () => ({
  quiesceCloudSyncForAccountTransition: (timeoutMs: number) => mockQuiesce(timeoutMs),
}));

const mockResume = jest.fn<Promise<any>, []>(async () => {
  events.push('resume');
  return { result: 'completed' as const };
});
jest.mock('../app/auth_recovery_adoption', () => ({
  AUTH_RECOVERY_PENDING_ACK_KEY: 'auth_recovery_pending_ack_v1',
  resumePendingRecoveryHandoffAck: () => mockResume(),
}));

const mockResumeClean = jest.fn<Promise<any>, []>(async () => {
  events.push('resume-clean');
  return { result: 'completed' as const };
});
jest.mock('../app/auth_clean_install_recovery_adoption', () => ({
  AUTH_CLEAN_INSTALL_ADOPTION_KEY: 'auth_clean_install_recovery_adoption_v1',
  resumeCleanInstallRecoveryAdoption: () => mockResumeClean(),
}));
jest.mock('../app/auth_clean_install_recovery_journal', () => ({
  AUTH_CLEAN_INSTALL_RECOVERY_KEY: 'auth_clean_install_recovery_v1',
}));

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('auth recovery pre-cloud boot gate', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useRealTimers();
    storage.clear();
    authListener = null;
    events.length = 0;
    mockGetItem.mockClear();
    mockOnAuthStateChanged.mockClear();
    mockUnsubscribe.mockClear();
    mockInvalidate.mockClear();
    mockQuiesce.mockReset();
    mockQuiesce.mockImplementation(async () => {
      events.push('quiesce');
      return true;
    });
    mockResume.mockReset();
    mockResume.mockImplementation(async () => {
      events.push('resume');
      return { result: 'completed' };
    });
    mockResumeClean.mockReset();
    mockResumeClean.mockImplementation(async () => {
      events.push('resume-clean');
      return { result: 'completed' };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('proceeds immediately with zero auth, generation, or sync side effects when no journal exists', async () => {
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    await expect(gate.runAuthRecoveryBootGate()).resolves.toEqual({ result: 'proceed' });

    expect(mockGetItem).toHaveBeenCalledWith('auth_recovery_pending_ack_v1');
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
    expect(mockInvalidate).not.toHaveBeenCalled();
    expect(mockQuiesce).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
  });

  it('invalidates immediately but waits for persisted auth hydration before quiesce and resume', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{opaque-presence-only}');
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    const pending = gate.runAuthRecoveryBootGate({ timeoutMs: 5_000 });
    await flush();
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(mockQuiesce).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();

    authListener?.({ uid: 'persisted-provider-uid' });
    await expect(pending).resolves.toEqual({ result: 'proceed' });
    expect(events).toEqual(['invalidate', 'quiesce', 'resume']);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('blocks a confirmed clean-install journal before heavy bootstrap when adoption is not prepared', async () => {
    storage.set('auth_clean_install_recovery_v1', JSON.stringify({ phase: 'confirmed' }));
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    await expect(gate.runAuthRecoveryBootGate()).resolves.toEqual({
      result: 'blocked_quarantined',
      reason: 'clean_recovery_confirmation_pending',
    });
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(mockResumeClean).not.toHaveBeenCalled();
  });

  it('hydrates, quiesces, and resumes dedicated adoption when its journal exists', async () => {
    storage.set('auth_clean_install_recovery_v1', JSON.stringify({ phase: 'confirmed' }));
    storage.set('auth_clean_install_recovery_adoption_v1', '{opaque-adoption}');
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });

    await expect(pending).resolves.toEqual({ result: 'proceed' });
    expect(events).toEqual(['invalidate', 'quiesce', 'resume-clean']);
    expect(mockResume).not.toHaveBeenCalled();
  });

  it('maps dedicated adoption quarantine without falling through to legacy resume', async () => {
    storage.set('auth_clean_install_recovery_v1', JSON.stringify({ phase: 'confirmed' }));
    storage.set('auth_clean_install_recovery_adoption_v1', '{}');
    mockResumeClean.mockResolvedValueOnce({ result: 'quarantined', reason: 'clean_journal_mismatch' });
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });

    await expect(pending).resolves.toEqual({
      result: 'blocked_quarantined', reason: 'clean_journal_mismatch',
    });
    expect(mockResume).not.toHaveBeenCalled();
  });

  it('fails closed with generation invalid when the first hydrated auth emission has no UID', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate();
    await flush();

    authListener?.(null);

    await expect(pending).resolves.toEqual({
      result: 'blocked_quarantined',
      reason: 'auth_uid_missing',
    });
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(mockQuiesce).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('times out closed and removes the auth listener without resuming', async () => {
    jest.useFakeTimers();
    storage.set('auth_recovery_pending_ack_v1', '{}');
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate({ timeoutMs: 250 });
    await flush();

    jest.advanceTimersByTime(250);

    await expect(pending).resolves.toEqual({
      result: 'blocked_transient',
      reason: 'auth_hydration_timeout',
    });
    expect(mockInvalidate).toHaveBeenCalledTimes(1);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockResume).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps the gate blocked transiently when sync quiesce fails', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    mockQuiesce.mockImplementationOnce(async () => {
      events.push('quiesce');
      return false;
    });
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });

    await expect(pending).resolves.toEqual({
      result: 'blocked_transient',
      reason: 'quiesce_failed',
    });
    expect(events).toEqual(['invalidate', 'quiesce']);
    expect(mockResume).not.toHaveBeenCalled();
  });

  it.each([
    [{ result: 'none' }, { result: 'proceed' }],
    [{ result: 'completed' }, { result: 'proceed' }],
    [{ result: 'ack_pending' }, { result: 'blocked_transient', reason: 'ack_pending' }],
    [{ result: 'quarantined', reason: 'ack_rejected' }, { result: 'blocked_quarantined', reason: 'ack_rejected' }],
  ])('maps resume result %j to strict boot result %j', async (resumeResult, expected) => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    mockResume.mockImplementationOnce(async () => {
      events.push('resume');
      return resumeResult as never;
    });
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });

    await expect(pending).resolves.toEqual(expected);
  });

  it('coalesces concurrent callers into one journal read, listener, quiesce, and resume', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    const first = gate.runAuthRecoveryBootGate();
    const second = gate.runAuthRecoveryBootGate();
    expect(first).toBe(second);
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { result: 'proceed' },
      { result: 'proceed' },
    ]);
    expect(mockGetItem).toHaveBeenCalledTimes(3);
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(mockQuiesce).toHaveBeenCalledTimes(1);
    expect(mockResume).toHaveBeenCalledTimes(1);
  });

  it('allows a sequential retry after ack_pending and then proceeds on completion', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    mockResume
      .mockResolvedValueOnce({ result: 'ack_pending' })
      .mockResolvedValueOnce({ result: 'completed' });
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    const first = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });
    await expect(first).resolves.toEqual({ result: 'blocked_transient', reason: 'ack_pending' });
    const second = gate.runAuthRecoveryBootGate();
    expect(second).not.toBe(first);
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });
    await expect(second).resolves.toEqual({ result: 'proceed' });
    expect(mockResume).toHaveBeenCalledTimes(2);
  });

  it('allows a sequential retry after quiesce failure', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    mockQuiesce
      .mockImplementationOnce(async () => {
        events.push('quiesce');
        return false;
      })
      .mockImplementationOnce(async () => {
        events.push('quiesce');
        return true;
      });
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    const first = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });
    await expect(first).resolves.toEqual({ result: 'blocked_transient', reason: 'quiesce_failed' });
    const second = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });
    await expect(second).resolves.toEqual({ result: 'proceed' });
    expect(mockQuiesce).toHaveBeenCalledTimes(2);
    expect(mockResume).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending hydration wait and cleans subscription and timeout idempotently', async () => {
    jest.useFakeTimers();
    storage.set('auth_recovery_pending_ack_v1', '{}');
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const controller = new AbortController();
    const pending = gate.runAuthRecoveryBootGate({ timeoutMs: 5_000, signal: controller.signal });
    await flush();

    controller.abort();
    controller.abort();

    await expect(pending).resolves.toEqual({
      result: 'blocked_transient',
      reason: 'cancelled',
    });
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockResume).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('still resolves and clears its timer when Firebase unsubscribe throws', async () => {
    jest.useFakeTimers();
    storage.set('auth_recovery_pending_ack_v1', '{}');
    mockUnsubscribe.mockImplementationOnce(() => { throw new Error('unsubscribe failed'); });
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate({ timeoutMs: 5_000 });
    await flush();

    authListener?.({ uid: 'persisted-provider-uid' });

    await expect(pending).resolves.toEqual({ result: 'proceed' });
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('treats auth subscription setup failure as retryable fail-closed', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    mockOnAuthStateChanged.mockImplementationOnce(() => { throw new Error('native auth unavailable'); });
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    await expect(gate.runAuthRecoveryBootGate()).resolves.toEqual({
      result: 'blocked_transient',
      reason: 'auth_subscription_failed',
    });
    expect(mockResume).not.toHaveBeenCalled();
  });

  it('treats unexpected resume I/O failure as retryable fail-closed', async () => {
    storage.set('auth_recovery_pending_ack_v1', '{}');
    mockResume.mockRejectedValueOnce(new Error('storage temporarily unavailable'));
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');
    const pending = gate.runAuthRecoveryBootGate();
    await flush();
    authListener?.({ uid: 'persisted-provider-uid' });

    await expect(pending).resolves.toEqual({
      result: 'blocked_transient',
      reason: 'resume_failed',
    });
  });

  it('fails closed on journal read errors without touching default auth', async () => {
    mockGetItem.mockRejectedValueOnce(new Error('storage unavailable'));
    const gate = require('../app/auth_recovery_boot_gate') as typeof import('../app/auth_recovery_boot_gate');

    await expect(gate.runAuthRecoveryBootGate()).resolves.toEqual({
      result: 'blocked_transient',
      reason: 'journal_read_failed',
    });
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
    expect(mockResume).not.toHaveBeenCalled();
  });

  it('contains no anonymous sign-in or cloud-restore seam', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const source = fs.readFileSync(path.join(process.cwd(), 'app/auth_recovery_boot_gate.ts'), 'utf8');

    expect(source).not.toContain('ensureAnonUser');
    expect(source).not.toContain('signInAnonymously');
    expect(source).not.toContain('restoreFromCloud');
  });
});
