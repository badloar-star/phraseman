/*
 * AA S2b (пункты 8, 11; S2b-R1…R5): транспорт аренды различает окончательные и
 * повторяемые отказы, держит привязку по uid, ротирует её один раз на
 * stale_auth_epoch, считает потерянный выход выполненным.
 */
import { createHash } from 'crypto';
import {
  createAccountAuthorityFirebaseInstallationBindingPort,
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityCallableInvoker,
  type AccountAuthorityInstallationBindingCredentialStore,
  type AccountAuthorityInstallationBindingCredentials,
  type AccountAuthorityLeaseRevisionStore,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import {
  ACCOUNT_AUTHORITY_INITIAL_ACQUIRE_REPLAY_WINDOW_MS,
  ACCOUNT_AUTHORITY_RENEWAL_MIN_INTERVAL_MS,
  accountAuthorityRetryDelayMs,
  classifyAccountAuthorityFailure,
  createAccountAuthorityRenewalGate,
  planAccountAuthorityAcquireReplay,
} from '../modules/account-authority-v2/account_authority_failure_policy';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import type { AccountAuthorityLogFields } from '../modules/account-authority-v2/account_authority_logger';
import {
  createAccountAuthoritySecureInstallationBindingCredentialStore,
  createAccountAuthoritySecureRevisionStore,
  type AccountAuthoritySecureStorePort,
} from '../modules/account-session-v2/account_authority_production_adapter';

const INSTALLATION_ID = '550e8400-e29b-41d4-a716-446655440000';

function callableError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code: `functions/${code}` });
}

function contractRejected(leaseCode?: string): Error {
  const error = callableError('failed-precondition', 'account_authority_request_rejected');
  return leaseCode === undefined ? error : Object.assign(error, { details: { leaseCode } });
}

function memoryRevisions(initial: number | null = null): AccountAuthorityLeaseRevisionStore & {
  current(): number | null;
  seedLease(accountId: string, sessionId: string, revision: number): void;
  lease(accountId: string, sessionId: string): number | null;
} {
  let revision = initial;
  const leases = new Map<string, number>();
  const key = (accountId: string, sessionId: string) => `${accountId}\u0000${sessionId}`;
  return {
    current: () => revision,
    seedLease: (accountId, sessionId, next) => { leases.set(key(accountId, sessionId), next); },
    lease: (accountId, sessionId) => leases.get(key(accountId, sessionId)) ?? null,
    read: async () => revision,
    write: async (_uid, next) => { revision = next; },
    readLease: async (owner) => leases.get(key(owner.accountId.value, owner.sessionId.value)) ?? null,
    bindLease: async (_uid, owner, next) => {
      revision = next;
      leases.set(key(owner.accountId.value, owner.sessionId.value), next);
    },
    writeLease: async (owner, next) => {
      revision = next;
      leases.set(key(owner.accountId.value, owner.sessionId.value), next);
    },
  };
}

/** Хранилище привязок ПО UID (как настоящее, без SecureStore). */
function perUidCredentials(): AccountAuthorityInstallationBindingCredentialStore & {
  has(uid: string): boolean;
} {
  const byUid = new Map<string, AccountAuthorityInstallationBindingCredentials>();
  return {
    has: (uid) => byUid.has(uid),
    read: async (uid) => byUid.get(uid.value) ?? null,
    readForLease: async () => null,
    write: async (uid, credentials) => { byUid.set(uid.value, Object.freeze({ ...credentials })); },
    clear: async (uid) => { byUid.delete(uid.value); },
    clearForLease: async () => undefined,
  };
}

function acquiredResponse(revision: number, sessionId = 'session-server-a') {
  return {
    data: {
      schemaVersion: 'account-authority-lease.v1',
      type: 'acquired',
      accountId: 'account-server-a',
      sessionId,
      revision,
      idempotent: false,
      previousLeaseRevoked: false,
    },
  };
}

function recordingLogger() {
  const entries: Array<Readonly<{ level: string; event: string; fields?: AccountAuthorityLogFields }>> = [];
  return {
    entries,
    events: () => entries.map((entry) => entry.event),
    logger: {
      info: (event: string, fields?: AccountAuthorityLogFields) => { entries.push({ level: 'info', event, fields }); },
      warn: (event: string, fields?: AccountAuthorityLogFields) => { entries.push({ level: 'warn', event, fields }); },
    },
  };
}

const noSleep = async (_ms: number): Promise<void> => undefined;

describe('AA S2b — failure policy (S2b-R5)', () => {
  test.each([
    [callableError('failed-precondition', 'account_authority_binding_missing'), 'final', 'binding_missing', true],
    [callableError('failed-precondition', 'account_authority_binding_mismatch'), 'final', 'binding_mismatch', true],
    [callableError('failed-precondition', 'account_authority_deletion_pending'), 'final', 'deletion_pending', false],
    [callableError('failed-precondition', 'account_authority_identity_unresolved'), 'final', 'identity_unresolved', false],
    [callableError('permission-denied', 'account_authority_sign_in_provider_rejected'), 'final', 'provider_rejected', false],
    [callableError('permission-denied', 'account_authority_anonymous_rejected'), 'final', 'anonymous_rejected', false],
    [callableError('invalid-argument', 'account_authority_request_invalid'), 'final', 'request_invalid', false],
    [callableError('internal', 'account_authority_unavailable'), 'final', 'server_error', false],
  ] as const)('%s → final', (error, kind, reason, resetBinding) => {
    expect(classifyAccountAuthorityFailure(error)).toEqual({ kind, reason, resetBinding });
  });

  test('distinguishes retryable, contract-rejected, unauthenticated and local failures', () => {
    expect(classifyAccountAuthorityFailure(callableError('unavailable', 'account_authority_unavailable')))
      .toEqual({ kind: 'retryable', reason: 'unavailable' });
    expect(classifyAccountAuthorityFailure(callableError('deadline-exceeded', 'deadline')))
      .toEqual({ kind: 'retryable', reason: 'unavailable' });
    expect(classifyAccountAuthorityFailure(callableError('resource-exhausted', 'account_authority_installation_binding_throttled')))
      .toEqual({ kind: 'retryable', reason: 'throttled' });
    expect(classifyAccountAuthorityFailure(new Error('response_lost')))
      .toEqual({ kind: 'retryable', reason: 'network' });
    expect(classifyAccountAuthorityFailure(callableError('failed-precondition', 'account_authority_request_rejected')))
      .toEqual({ kind: 'contract_rejected', leaseCode: null });
    expect(classifyAccountAuthorityFailure(contractRejected('stale_auth_epoch')))
      .toEqual({ kind: 'contract_rejected', leaseCode: 'stale_auth_epoch' });
    expect(classifyAccountAuthorityFailure(contractRejected('users/account-a')))
      .toEqual({ kind: 'contract_rejected', leaseCode: null });
    expect(classifyAccountAuthorityFailure(callableError('unauthenticated', 'account_authority_auth_required')))
      .toEqual({ kind: 'unauthenticated' });
    expect(classifyAccountAuthorityFailure(new Error('account_authority_lease_invalid')))
      .toEqual({ kind: 'final', reason: 'local_failure', resetBinding: false });
  });

  test('backoff grows exponentially, is capped, and throttling waits at least 6 s', () => {
    const half = () => 0;
    const full = () => 1;
    expect(accountAuthorityRetryDelayMs(1, 'unavailable', full)).toBe(500);
    expect(accountAuthorityRetryDelayMs(2, 'unavailable', full)).toBe(1000);
    expect(accountAuthorityRetryDelayMs(3, 'unavailable', full)).toBe(2000);
    expect(accountAuthorityRetryDelayMs(30, 'unavailable', full)).toBe(8000);
    expect(accountAuthorityRetryDelayMs(1, 'unavailable', half)).toBe(250);
    expect(accountAuthorityRetryDelayMs(1, 'throttled', full)).toBe(6000);
  });
});

describe('AA S2b — retry and final failures in the lease transport', () => {
  test('a final refusal is not retried; binding_mismatch forgets this uid binding (no loop)', async () => {
    const credentials = perUidCredentials();
    const invoke = jest.fn<Promise<unknown>, Parameters<AccountAuthorityCallableInvoker>>(async (name) => {
      if (name === 'accountAuthorityInstallationBindingCreate') {
        return { data: { bindingToken: 'token-a', deviceBindingId: 'server-device-a' } };
      }
      throw callableError('failed-precondition', 'account_authority_binding_mismatch');
    });
    const sleep = jest.fn(noSleep);
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(3),
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke, installationId: INSTALLATION_ID, credentials,
      }),
      retry: { sleep },
    });
    const uid = parseFirebaseAuthUid('firebase-client-a');

    await expect(port.acquire({
      firebaseAuthUid: uid,
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-a'),
    })).rejects.toThrow('account_authority_lease_binding_rejected');

    expect(invoke.mock.calls.filter(([name]) => name === 'accountAuthorityLeaseAcquire')).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(credentials.has('firebase-client-a')).toBe(false);
  });

  test.each([
    ['account_authority_deletion_pending', 'account_authority_lease_deletion_pending'],
    ['account_authority_identity_unresolved', 'account_authority_lease_identity_unresolved'],
  ])('%s is final, not retried, and keeps the binding', async (message, mapped) => {
    const credentials = perUidCredentials();
    await credentials.write(parseFirebaseAuthUid('firebase-client-a'), {
      bindingToken: 'token-a', deviceBindingId: 'server-device-a',
    });
    const invoke = jest.fn(async () => { throw callableError('failed-precondition', message); });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(3),
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke, installationId: INSTALLATION_ID, credentials,
      }),
      retry: { sleep: noSleep },
    });
    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-a'),
    })).rejects.toThrow(mapped);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(credentials.has('firebase-client-a')).toBe(true);
  });

  test('unavailable is retried with growing backoff, same operationId and same expectedRevision (S2b-R2)', async () => {
    let calls = 0;
    const invoke = jest.fn(async (_name: string, _data: Readonly<Record<string, unknown>>) => {
      calls += 1;
      if (calls < 3) throw callableError('unavailable', 'account_authority_unavailable');
      return acquiredResponse(6);
    });
    const sleep = jest.fn(noSleep);
    const revisions = memoryRevisions(5);
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: revisions,
      installationBinding: {
        obtain: async () => ({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
        readPersistedForLease: async () => null,
        rotate: async () => { throw new Error('must_not_rotate'); },
        reset: async () => { throw new Error('must_not_reset'); },
        resetForLease: async () => undefined,
      },
      retry: { sleep, random: () => 1 },
    });

    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-retry'),
    })).resolves.toMatchObject({ sessionId: parseSessionId('session-server-a') });

    expect(invoke).toHaveBeenCalledTimes(3);
    for (const [, data] of invoke.mock.calls) {
      expect(data).toEqual({ operationId: 'operation-retry', expectedRevision: 5, bindingToken: 'token-a' });
    }
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([500, 1000]);
    expect(revisions.current()).toBe(6);
  });

  test('gives up after the attempt budget with a retryable code', async () => {
    const invoke = jest.fn(async () => { throw callableError('unavailable', 'account_authority_unavailable'); });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(5),
      installationBinding: {
        obtain: async () => ({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
        readPersistedForLease: async () => null,
        rotate: async () => { throw new Error('must_not_rotate'); },
        reset: async () => undefined,
        resetForLease: async () => undefined,
      },
      retry: { sleep: noSleep, maxAttempts: 3 },
    });
    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-retry'),
    })).rejects.toThrow('account_authority_lease_unavailable');
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  test('S2b-R2: an initial acquire (no revision) is replayed only within 50 minutes', async () => {
    let now = 1_000_000;
    const invoke = jest.fn(async () => { throw new Error('response_lost'); });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(null),
      installationBinding: {
        obtain: async () => ({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
        readPersistedForLease: async () => null,
        rotate: async () => { throw new Error('must_not_rotate'); },
        reset: async () => undefined,
        resetForLease: async () => undefined,
      },
      retry: { sleep: noSleep, maxAttempts: 1, nowMs: () => now },
    });
    const request = {
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-initial'),
    };
    await expect(port.acquire(request)).rejects.toThrow('account_authority_lease_unavailable');
    now += ACCOUNT_AUTHORITY_INITIAL_ACQUIRE_REPLAY_WINDOW_MS - 1;
    await expect(port.acquire(request)).rejects.toThrow('account_authority_lease_unavailable');
    expect(invoke).toHaveBeenCalledTimes(2);
    now += 2;
    await expect(port.acquire(request)).rejects.toThrow('account_authority_lease_replay_expired');
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  test('S2b-R2 policy: with a known revision the replay is always allowed', () => {
    expect(planAccountAuthorityAcquireReplay({ expectedRevision: 4, firstAttemptAtMs: 0, nowMs: 10 * 60 * 60_000 }))
      .toBe('replay_same_operation');
    expect(planAccountAuthorityAcquireReplay({ expectedRevision: null, firstAttemptAtMs: 0, nowMs: 49 * 60_000 }))
      .toBe('replay_same_operation');
    expect(planAccountAuthorityAcquireReplay({ expectedRevision: null, firstAttemptAtMs: 0, nowMs: 51 * 60_000 }))
      .toBe('requires_user_action');
  });

  test('S2b-R3: contract rejection rotates the binding once and retries once — no loop', async () => {
    const credentials = perUidCredentials();
    let issued = 0;
    const invoke = jest.fn(async (name: string, _data: Readonly<Record<string, unknown>>) => {
      if (name === 'accountAuthorityInstallationBindingCreate') {
        issued += 1;
        return { data: { bindingToken: `token-${issued}`, deviceBindingId: `server-device-${issued}` } };
      }
      throw callableError('failed-precondition', 'account_authority_request_rejected');
    });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(7),
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke, installationId: INSTALLATION_ID, credentials,
      }),
      retry: { sleep: noSleep },
    });
    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-epoch'),
    })).rejects.toThrow('account_authority_lease_rejected');
    const names = invoke.mock.calls.map(([name]) => name);
    expect(names).toEqual([
      'accountAuthorityInstallationBindingCreate',
      'accountAuthorityLeaseAcquire',
      'accountAuthorityInstallationBindingCreate',
      'accountAuthorityLeaseAcquire',
    ]);
    const acquireTokens = invoke.mock.calls
      .filter(([name]) => name === 'accountAuthorityLeaseAcquire')
      .map(([, data]) => data.bindingToken);
    expect(acquireTokens).toEqual(['token-1', 'token-2']);
  });

  test('S2b-R3: after the single rotation the retried acquire succeeds with the fresh epoch', async () => {
    const credentials = perUidCredentials();
    let issued = 0;
    const invoke = jest.fn(async (name: string, data: Readonly<Record<string, unknown>>) => {
      if (name === 'accountAuthorityInstallationBindingCreate') {
        issued += 1;
        return { data: { bindingToken: `token-${issued}`, deviceBindingId: `server-device-${issued}` } };
      }
      if (data.bindingToken === 'token-1') throw callableError('failed-precondition', 'account_authority_request_rejected');
      return acquiredResponse(8);
    });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(7),
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke, installationId: INSTALLATION_ID, credentials,
      }),
      retry: { sleep: noSleep },
    });
    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-epoch'),
    })).resolves.toMatchObject({ accountId: parseAccountId('account-server-a') });
    expect(issued).toBe(2);
    await expect(credentials.read(parseFirebaseAuthUid('firebase-client-a')))
      .resolves.toEqual({ bindingToken: 'token-2', deviceBindingId: 'server-device-2' });
  });
});

describe('AA S2b — A→B on one device', () => {
  test('signing in as B after A uses B\'s own binding; neither account loops on binding_mismatch', async () => {
    const credentials = perUidCredentials();
    let currentAuthUid = 'firebase-user-a';
    const tokenOwner = new Map<string, string>();
    let issued = 0;
    const invoke = jest.fn(async (name: string, data: Readonly<Record<string, unknown>>) => {
      if (name === 'accountAuthorityInstallationBindingCreate') {
        issued += 1;
        const token = `token-${issued}`;
        tokenOwner.set(token, currentAuthUid);
        return { data: { bindingToken: token, deviceBindingId: `server-device-${issued}` } };
      }
      if (tokenOwner.get(String(data.bindingToken)) !== currentAuthUid) {
        throw callableError('failed-precondition', 'account_authority_binding_mismatch');
      }
      return acquiredResponse(1, currentAuthUid === 'firebase-user-a' ? 'session-a' : 'session-b');
    });
    const binding = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke, installationId: INSTALLATION_ID, credentials,
    });
    const lease = (revisions: AccountAuthorityLeaseRevisionStore) => createAccountAuthorityFirebaseLeasePort({
      invoke, revisionStore: revisions, installationBinding: binding, retry: { sleep: noSleep },
    });

    await expect(lease(memoryRevisions(null)).acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-user-a'),
      deviceId: parseDeviceId('device-1'),
      operationId: parseOperationId('operation-a'),
    })).resolves.toMatchObject({ sessionId: parseSessionId('session-a') });

    currentAuthUid = 'firebase-user-b';
    await expect(lease(memoryRevisions(null)).acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-user-b'),
      deviceId: parseDeviceId('device-1'),
      operationId: parseOperationId('operation-b'),
    })).resolves.toMatchObject({ sessionId: parseSessionId('session-b') });

    currentAuthUid = 'firebase-user-a';
    await expect(lease(memoryRevisions(null)).acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-user-a'),
      deviceId: parseDeviceId('device-1'),
      operationId: parseOperationId('operation-a2'),
    })).resolves.toMatchObject({ sessionId: parseSessionId('session-a') });

    expect(issued).toBe(2);
    expect(invoke.mock.calls.filter(([name]) => name === 'accountAuthorityLeaseAcquire')).toHaveLength(3);
  });
});

describe('AA S2b — sign-out replay (S2b-R4)', () => {
  const releaseRequest = {
    accountId: parseAccountId('account-server-a'),
    sessionId: parseSessionId('session-server-a'),
    deviceId: parseDeviceId('device-client-a'),
    operationId: parseOperationId('release-operation-a'),
  };
  const bindingPort = () => ({
    obtain: async () => ({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
    readPersistedForLease: async () => ({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
    rotate: async () => { throw new Error('must_not_rotate'); },
    reset: async () => undefined,
    resetForLease: async () => undefined,
  });

  test('a replay after a lost response that meets revision_mismatch/stale_lease counts as done', async () => {
    const revisions = memoryRevisions();
    revisions.seedLease('account-server-a', 'session-server-a', 8);
    let calls = 0;
    const invoke = jest.fn(async (_name: string, data: Readonly<Record<string, unknown>>) => {
      calls += 1;
      expect(data).toMatchObject({ operationId: 'release-operation-a', expectedRevision: 8 });
      if (calls === 1) throw new Error('response_lost');
      throw callableError('failed-precondition', 'account_authority_request_rejected');
    });
    const log = recordingLogger();
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke, revisionStore: revisions, installationBinding: bindingPort(), logger: log.logger, retry: { sleep: noSleep },
    });
    await expect(port.release(releaseRequest)).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(revisions.lease('account-server-a', 'session-server-a')).toBe(9);
    expect(log.events()).toContain('lease release_presumed_done');
  });

  test('a first-attempt contract rejection of sign-out is NOT swallowed', async () => {
    const revisions = memoryRevisions();
    revisions.seedLease('account-server-a', 'session-server-a', 8);
    const invoke = jest.fn(async () => { throw callableError('failed-precondition', 'account_authority_request_rejected'); });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke, revisionStore: revisions, installationBinding: bindingPort(), retry: { sleep: noSleep },
    });
    await expect(port.release(releaseRequest)).rejects.toThrow('account_authority_lease_rejected');
    expect(revisions.lease('account-server-a', 'session-server-a')).toBe(8);
  });
});

describe('AA S2b — renewal gate (S2b-R1)', () => {
  test('renews only on cold start / foreground, at most once per 5 minutes', () => {
    let now = 0;
    const gate = createAccountAuthorityRenewalGate({ nowMs: () => now });
    expect(gate.tryBegin('other')).toEqual({ renew: false, reason: 'trigger_not_allowed' });
    expect(gate.tryBegin('cold_start')).toEqual({ renew: true });
    expect(gate.tryBegin('foreground')).toEqual({ renew: false, reason: 'in_flight' });
    gate.finish('succeeded');
    now += ACCOUNT_AUTHORITY_RENEWAL_MIN_INTERVAL_MS - 1;
    expect(gate.tryBegin('foreground')).toEqual({ renew: false, reason: 'debounced' });
    now += 1;
    expect(gate.tryBegin('foreground')).toEqual({ renew: true });
    gate.finish('failed');
    expect(gate.tryBegin('foreground')).toEqual({ renew: true });
  });
});

describe('AA S2b — per-uid binding storage in SecureStore (пункт 8)', () => {
  const sha256 = async (value: string) => createHash('sha256').update(value).digest('hex');
  function secureStore(initial: Readonly<Record<string, string>> = {}): AccountAuthoritySecureStorePort & {
    snapshot(): Readonly<Record<string, string>>;
    deletes: string[];
  } {
    const values = new Map(Object.entries(initial));
    const deletes: string[] = [];
    return {
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      getItemAsync: async (key) => values.get(key) ?? null,
      setItemAsync: async (key, value) => { values.set(key, value); },
      deleteItemAsync: async (key) => { deletes.push(key); values.delete(key); },
      snapshot: () => Object.freeze(Object.fromEntries(values)),
      deletes,
    };
  }

  test('A and B get separate hashed keys; release finds the binding through its own lease record', async () => {
    const secure = secureStore();
    const credentials = createAccountAuthoritySecureInstallationBindingCredentialStore({ secureStore: secure, digestSha256: sha256 });
    const revisions = createAccountAuthoritySecureRevisionStore({ secureStore: secure, digestSha256: sha256 });
    const uidA = parseFirebaseAuthUid('firebase-user-a');
    const uidB = parseFirebaseAuthUid('firebase-user-b');
    await credentials.write(uidA, { bindingToken: 'token-a', deviceBindingId: 'server-device-a' });
    await credentials.write(uidB, { bindingToken: 'token-b', deviceBindingId: 'server-device-b' });
    const ownerB = { accountId: parseAccountId('account-b'), sessionId: parseSessionId('session-b') };
    await revisions.bindLease(uidB, ownerB, 1);

    await expect(credentials.read(uidA)).resolves.toEqual({ bindingToken: 'token-a', deviceBindingId: 'server-device-a' });
    await expect(credentials.readForLease(ownerB)).resolves.toEqual({ bindingToken: 'token-b', deviceBindingId: 'server-device-b' });
    expect(JSON.stringify(Object.keys(secure.snapshot()))).not.toMatch(/firebase-user/);

    await credentials.clearForLease(ownerB);
    await expect(credentials.read(uidB)).resolves.toBeNull();
    await expect(credentials.read(uidA)).resolves.not.toBeNull();
    await credentials.clear(uidA);
    await expect(credentials.read(uidA)).resolves.toBeNull();
  });

  test('migration: the old one-per-installation binding is dropped exactly once and logged', async () => {
    const secure = secureStore({
      'phraseman.account_authority.binding_token.v1': 'legacy-token',
      'phraseman.account_authority.device_binding_id.v1': 'legacy-device',
    });
    const log = recordingLogger();
    const credentials = createAccountAuthoritySecureInstallationBindingCredentialStore({
      secureStore: secure, digestSha256: sha256, logger: log.logger,
    });
    const uid = parseFirebaseAuthUid('firebase-user-a');
    await expect(credentials.read(uid)).resolves.toBeNull();
    await expect(credentials.read(uid)).resolves.toBeNull();
    expect(secure.snapshot()).not.toHaveProperty('phraseman.account_authority.binding_token.v1');
    expect(secure.snapshot()).not.toHaveProperty('phraseman.account_authority.device_binding_id.v1');
    expect(secure.deletes.filter((key) => key.endsWith('.v1'))).toHaveLength(2);
    expect(log.events().filter((event) => event === 'binding_credentials legacy_dropped')).toHaveLength(1);
    expect(JSON.stringify(log.entries)).not.toContain('legacy-token');
  });
});

describe('AA S2b — logs (пункт 11)', () => {
  test('every branch is logged by code, never with uid, token or operation id', async () => {
    const log = recordingLogger();
    const credentials = perUidCredentials();
    let issued = 0;
    const invoke = jest.fn(async (name: string, data: Readonly<Record<string, unknown>>) => {
      if (name === 'accountAuthorityInstallationBindingCreate') {
        issued += 1;
        return { data: { bindingToken: `secret-token-${issued}`, deviceBindingId: `server-device-${issued}` } };
      }
      if (issued === 1) throw callableError('failed-precondition', 'account_authority_request_rejected');
      if (data.expectedRevision === 2) throw callableError('unavailable', 'account_authority_unavailable');
      return acquiredResponse(3);
    });
    const revisions = memoryRevisions(2);
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: revisions,
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke, installationId: INSTALLATION_ID, credentials, logger: log.logger,
      }),
      logger: log.logger,
      retry: { sleep: noSleep, maxAttempts: 2 },
    });
    await expect(port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-secret-uid'),
      deviceId: parseDeviceId('device-secret'),
      operationId: parseOperationId('operation-secret'),
    })).rejects.toThrow();
    expect(log.events()).toEqual(expect.arrayContaining([
      'lease acquire_failed', 'lease acquire_rotated_retry', 'installation_binding rotate_start',
    ]));
    const serialized = JSON.stringify(log.entries);
    for (const secret of ['firebase-secret-uid', 'secret-token', 'operation-secret', 'device-secret', INSTALLATION_ID]) {
      expect(serialized).not.toContain(secret);
    }
  });
});

describe('AA S2b round 2 — exact lease codes (R3/R4)', () => {
  function rotatingSetup(rejectWith: (token: string) => Error | null) {
    const credentials = perUidCredentials();
    let issued = 0;
    const invoke = jest.fn(async (name: string, data: Readonly<Record<string, unknown>>) => {
      if (name === 'accountAuthorityInstallationBindingCreate') {
        issued += 1;
        return { data: { bindingToken: `token-${issued}`, deviceBindingId: `server-device-${issued}` } };
      }
      const failure = rejectWith(String(data.bindingToken));
      if (failure !== null) throw failure;
      return acquiredResponse(8);
    });
    const log = recordingLogger();
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: memoryRevisions(7),
      installationBinding: createAccountAuthorityFirebaseInstallationBindingPort({
        invoke, installationId: INSTALLATION_ID, credentials,
      }),
      logger: log.logger,
      retry: { sleep: noSleep },
    });
    const run = () => port.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('operation-epoch'),
    });
    return { run, invoke, log, issued: () => issued };
  }

  test('stale_auth_epoch rotates once and the retry succeeds', async () => {
    const setup = rotatingSetup((token) => (token === 'token-1' ? contractRejected('stale_auth_epoch') : null));
    await expect(setup.run()).resolves.toMatchObject({ accountId: parseAccountId('account-server-a') });
    expect(setup.issued()).toBe(2);
  });

  test('stale_auth_epoch twice: one rotation, then final — no loop', async () => {
    const setup = rotatingSetup(() => contractRejected('stale_auth_epoch'));
    await expect(setup.run()).rejects.toThrow('account_authority_lease_rejected');
    expect(setup.issued()).toBe(2);
    expect(setup.invoke.mock.calls.filter(([name]) => name === 'accountAuthorityLeaseAcquire')).toHaveLength(2);
  });

  test.each(['revision_mismatch', 'stale_lease', 'identity_mismatch', 'account_lifecycle_blocked', 'other'])(
    'acquire %s is final: no rotation, no retry',
    async (code) => {
      const setup = rotatingSetup(() => contractRejected(code));
      await expect(setup.run()).rejects.toThrow('account_authority_lease_rejected');
      expect(setup.issued()).toBe(1);
      expect(setup.invoke.mock.calls.filter(([name]) => name === 'accountAuthorityLeaseAcquire')).toHaveLength(1);
      expect(setup.log.events()).not.toContain('lease acquire_lease_code_missing');
    },
  );

  test('old server without leaseCode keeps the coarse rotation and logs lease_code_missing', async () => {
    const setup = rotatingSetup((token) => (token === 'token-1' ? contractRejected() : null));
    await expect(setup.run()).resolves.toMatchObject({ accountId: parseAccountId('account-server-a') });
    expect(setup.issued()).toBe(2);
    expect(setup.log.events()).toContain('lease acquire_lease_code_missing');
  });

  function releaseSetup(replayFailure: Error) {
    const revisions = memoryRevisions();
    revisions.seedLease('account-server-a', 'session-server-a', 8);
    let calls = 0;
    const invoke = jest.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('response_lost');
      throw replayFailure;
    });
    const log = recordingLogger();
    const binding = { bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') };
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke,
      revisionStore: revisions,
      installationBinding: {
        obtain: async () => binding,
        readPersistedForLease: async () => binding,
        rotate: async () => { throw new Error('must_not_rotate'); },
        reset: async () => undefined,
        resetForLease: async () => undefined,
      },
      logger: log.logger,
      retry: { sleep: noSleep },
    });
    const run = () => port.release({
      accountId: parseAccountId('account-server-a'),
      sessionId: parseSessionId('session-server-a'),
      deviceId: parseDeviceId('device-client-a'),
      operationId: parseOperationId('release-operation-a'),
    });
    return { run, revisions, log };
  }

  test.each(['revision_mismatch', 'stale_lease'])('release replay with %s counts as done', async (code) => {
    const setup = releaseSetup(contractRejected(code));
    await expect(setup.run()).resolves.toBeUndefined();
    expect(setup.revisions.lease('account-server-a', 'session-server-a')).toBe(9);
  });

  test.each(['identity_mismatch', 'stale_auth_epoch', 'account_lifecycle_blocked', 'other'])(
    'release replay with %s is a final refusal',
    async (code) => {
      const setup = releaseSetup(contractRejected(code));
      await expect(setup.run()).rejects.toThrow('account_authority_lease_rejected');
      expect(setup.revisions.lease('account-server-a', 'session-server-a')).toBe(8);
    },
  );

  test('release replay from an old server without leaseCode: coarse done + lease_code_missing log', async () => {
    const setup = releaseSetup(contractRejected());
    await expect(setup.run()).resolves.toBeUndefined();
    expect(setup.log.events()).toContain('lease release_lease_code_missing');
  });
});
