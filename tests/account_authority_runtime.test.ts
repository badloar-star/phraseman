import {
  accountAuthorityGeneration,
  type AccountAuthorityGeneration,
  type AccountAuthorityResult,
} from '../modules/account-authority-v2/account_authority_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
  type AccountId,
  type FirebaseAuthUid,
  type OperationId,
  type SessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import type {
  AccountAuthorityDestructiveOperationKind,
  AccountAuthorityDestructiveOperationRecord,
  AccountAuthorityDestructiveReservation,
  AccountAuthorityLocalScope,
  AccountAuthorityLocalStorePort,
  AccountAuthorityOperationKind,
  AccountAuthorityPreservedWrite,
} from '../modules/account-authority-v2/account_authority_local_store';
import {
  createAccountAuthorityRuntime,
  type AccountAuthorityLeasePort,
  type AccountAuthorityProviderPort,
  type ProviderAuthenticationResult,
} from '../modules/account-authority-v2/account_authority_runtime';
import type {
  AccountAuthorityLogFields,
  AccountAuthorityLogger,
} from '../modules/account-authority-v2/account_authority_logger';

// зачем (AA S1): каждый прогон рантайма пишет логи в этот порт; после КАЖДОГО
// теста проверяем, что ни один идентификатор (uid, accountId, sessionId,
// deviceId, operationId) не попал в лог. Это поведенческая половина сторожа.
const recordedLogs: Array<Readonly<{ level: 'info' | 'warn'; event: string; fields?: AccountAuthorityLogFields }>> = [];
const recordingLogger: AccountAuthorityLogger = {
  info: (event, fields) => { recordedLogs.push({ level: 'info', event, fields }); },
  warn: (event, fields) => { recordedLogs.push({ level: 'warn', event, fields }); },
};
const LOG_FORBIDDEN_IDENTIFIERS = [
  'firebase-a', 'firebase-b', 'account-a', 'account-b', 'session-a', 'session-b', 'device-01',
  'sign-in', 'sign-out', 'delete-', 'revoke-', 'resume-',
];

afterEach(() => {
  const serialized = JSON.stringify(recordedLogs);
  recordedLogs.length = 0;
  for (const identifier of LOG_FORBIDDEN_IDENTIFIERS) expect(serialized).not.toContain(identifier);
});

const deviceId = parseDeviceId('device-01');
const accountA = parseAccountId('account-a');
const accountB = parseAccountId('account-b');
const sessionA = parseSessionId('session-a');
const sessionB = parseSessionId('session-b');
const uidA = parseFirebaseAuthUid('firebase-a');
const uidB = parseFirebaseAuthUid('firebase-b');

function operation(value: string): OperationId {
  return parseOperationId(value);
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

class RecordingLocalStore implements AccountAuthorityLocalStorePort {
  readonly events: string[];
  readonly committed: AccountAuthorityPreservedWrite[] = [];
  readonly operationKinds = new Map<string, AccountAuthorityOperationKind>();
  readonly destructiveOperations = new Map<string, AccountAuthorityDestructiveOperationRecord>();
  private authorityGeneration = accountAuthorityGeneration(0);
  private active: AccountAuthorityLocalScope | null = null;
  private concurrentScopes = 0;
  maxConcurrentScopes = 0;

  constructor(events: string[]) {
    this.events = events;
  }

  getOpenScope(): AccountAuthorityLocalScope | null {
    return this.active;
  }

  getAuthorityGeneration(): AccountAuthorityGeneration {
    return this.authorityGeneration;
  }

  advanceAuthorityGeneration(generation: AccountAuthorityGeneration): AccountAuthorityGeneration {
    if (generation.value > this.authorityGeneration.value) this.authorityGeneration = generation;
    return this.authorityGeneration;
  }

  getOperationKind(operationId: OperationId) {
    return this.operationKinds.get(operationId.value) ?? null;
  }

  reserveOperation(
    operationId: OperationId,
    kind: AccountAuthorityOperationKind,
    destructive?: AccountAuthorityDestructiveReservation,
  ): void {
    const existingKind = this.operationKinds.get(operationId.value);
    const existingDestructive = this.destructiveOperations.get(operationId.value);
    if (existingKind && existingKind !== kind) {
      throw new Error('account_authority_operation_id_reused');
    }
    if (existingDestructive) {
      const sameReservedOwner = existingDestructive.owner?.accountId.value
          === destructive?.owner?.accountId.value
        && existingDestructive.owner?.sessionId.value === destructive?.owner?.sessionId.value;
      if (
        !destructive
        || existingDestructive.kind !== kind
        || existingDestructive.fingerprint !== destructive.fingerprint
        || !sameReservedOwner
        || existingDestructive.expectedGeneration.value !== destructive.expectedGeneration.value
      ) {
        throw new Error('account_authority_operation_id_reused');
      }
    } else if (destructive && (kind === 'sign_out' || kind === 'delete' || kind === 'revoke')) {
      this.destructiveOperations.set(operationId.value, Object.freeze({
        kind,
        fingerprint: destructive.fingerprint,
        owner: destructive.owner,
        expectedGeneration: destructive.expectedGeneration,
        stage: destructive.stage,
      }));
    }
    this.operationKinds.set(operationId.value, kind);
  }

  getDestructiveOperation(operationId: OperationId) {
    return this.destructiveOperations.get(operationId.value) ?? null;
  }

  bindDeferredDestructiveOperation(
    operationId: OperationId,
    kind: AccountAuthorityDestructiveOperationKind,
    fingerprint: string,
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    expectedGeneration: AccountAuthorityGeneration,
  ): void {
    const existing = this.destructiveOperations.get(operationId.value);
    if (
      !existing
      || existing.kind !== kind
      || existing.receipt
      || existing.stage !== 'deferred_owner'
      || existing.owner !== null
    ) {
      throw new Error('account_authority_operation_id_reused');
    }
    this.destructiveOperations.set(operationId.value, Object.freeze({
      ...existing,
      fingerprint,
      owner,
      expectedGeneration,
      stage: 'local_applied',
    }));
  }

  markDestructiveOperationLocalApplied(
    operationId: OperationId,
    kind: AccountAuthorityDestructiveOperationKind,
    fingerprint: string,
  ): void {
    const existing = this.destructiveOperations.get(operationId.value);
    if (!existing || existing.kind !== kind || existing.fingerprint !== fingerprint || existing.receipt) {
      throw new Error('account_authority_operation_id_reused');
    }
    this.destructiveOperations.set(operationId.value, Object.freeze({
      ...existing,
      stage: 'local_applied',
    }));
  }

  completeDestructiveOperation(
    operationId: OperationId,
    kind: 'sign_out' | 'delete' | 'revoke',
    fingerprint: string,
    receipt: AccountAuthorityResult,
  ): void {
    const existing = this.destructiveOperations.get(operationId.value);
    if (!existing || existing.kind !== kind || existing.fingerprint !== fingerprint) {
      throw new Error('account_authority_operation_id_reused');
    }
    this.destructiveOperations.set(operationId.value, Object.freeze({ ...existing, receipt }));
  }

  async openScope(scope: AccountAuthorityLocalScope): Promise<void> {
    this.events.push(`open:${scope.accountId.value}:${scope.sessionId.value}`);
    this.concurrentScopes += 1;
    this.maxConcurrentScopes = Math.max(this.maxConcurrentScopes, this.concurrentScopes);
    if (this.active !== null) throw new Error('scope_already_open');
    this.active = scope;
  }

  async closeScope(scope: AccountAuthorityLocalScope): Promise<void> {
    this.events.push(`close:${scope.accountId.value}:${scope.sessionId.value}`);
    if (this.active?.accountId.value !== scope.accountId.value) throw new Error('wrong_scope_closed');
    this.active = null;
    this.concurrentScopes -= 1;
  }

  clearAccountData(accountId: AccountId): void {
    this.events.push(`clear:${accountId.value}`);
  }

  async commitPreservedWrite(write: AccountAuthorityPreservedWrite): Promise<void> {
    this.committed.push(write);
  }

  simulateScopeLoss(): void {
    this.active = null;
    this.concurrentScopes = 0;
  }

  simulatePartiallyBoundDeferredOperation(
    operationId: OperationId,
    owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>,
    generation: AccountAuthorityGeneration,
  ): void {
    const existing = this.destructiveOperations.get(operationId.value);
    if (!existing || existing.stage !== 'deferred_owner') throw new Error('missing_deferred_operation');
    this.destructiveOperations.set(operationId.value, Object.freeze({
      ...existing,
      fingerprint: JSON.stringify([owner.accountId.value, owner.sessionId.value, generation.value]),
      owner,
      expectedGeneration: generation,
    }));
  }
}

type Lease = Readonly<{ accountId: AccountId; sessionId: SessionId }>;

function createHarness(input?: Readonly<{ localStore?: RecordingLocalStore; logger?: AccountAuthorityLogger }>) {
  const events: string[] = input?.localStore?.events ?? [];
  const authentications: ProviderAuthenticationResult[] = [];
  const leases = new Map<string, Lease>([
    [uidA.value, { accountId: accountA, sessionId: sessionA }],
    [uidB.value, { accountId: accountB, sessionId: sessionB }],
  ]);
  let currentUid: FirebaseAuthUid | null = null;
  const provider: AccountAuthorityProviderPort = {
    authenticate: jest.fn(async ({ operationId }) => {
      events.push(`provider-auth:${operationId.value}`);
      const result = authentications.shift();
      if (!result) throw new Error('missing_provider_result');
      if (result.type === 'authenticated') currentUid = result.firebaseAuthUid;
      return result;
    }),
    currentIdentity: jest.fn(async () => currentUid),
    signOut: jest.fn(async ({ operationId }) => {
      events.push(`provider-sign-out:${operationId.value}`);
      currentUid = null;
    }),
  };
  const lease: AccountAuthorityLeasePort = {
    acquire: jest.fn(async ({ firebaseAuthUid, operationId }) => {
      events.push(`lease-acquire:${firebaseAuthUid.value}:${operationId.value}`);
      const result = leases.get(firebaseAuthUid.value);
      if (!result) throw new Error('missing_lease');
      return result;
    }),
    release: jest.fn(async ({ accountId, operationId }) => {
      events.push(`lease-release:${accountId.value}:${operationId.value}`);
    }),
    deleteAccount: jest.fn(async ({ accountId, operationId }) => {
      events.push(`remote-delete:${accountId.value}:${operationId.value}`);
    }),
  };
  const localStore = input?.localStore ?? new RecordingLocalStore(events);
  const runtime = createAccountAuthorityRuntime({
    deviceId, provider, lease, localStore, logger: input?.logger ?? recordingLogger,
  });

  return {
    events,
    authentications,
    lease,
    leases,
    localStore,
    provider,
    runtime,
    setCurrentUid: (uid: FirebaseAuthUid | null) => { currentUid = uid; },
  };
}

function authenticated(firebaseAuthUid: FirebaseAuthUid): ProviderAuthenticationResult {
  return Object.freeze({ type: 'authenticated', firebaseAuthUid });
}

describe('Account Authority 2.0 FIFO runtime', () => {
  test('A → B closes local scope A before opening B and never has concurrent scopes', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));

    await harness.runtime.signIn(operation('sign-in-a'));
    await harness.runtime.signIn(operation('sign-in-b'));

    const closeA = harness.events.indexOf('close:account-a:session-a');
    const openB = harness.events.indexOf('open:account-b:session-b');
    expect(closeA).toBeGreaterThanOrEqual(0);
    expect(openB).toBeGreaterThan(closeA);
    expect(harness.localStore.maxConcurrentScopes).toBe(1);
    expect(harness.runtime.getState()).toMatchObject({
      phase: 'authenticated', accountId: accountB, sessionId: sessionB,
    });
    expect(harness.events).toContain('lease-release:account-a:sign-in-b');
  });

  test('queued sign-out followed by sign-in executes in FIFO order', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const releaseGate = deferred<void>();
    jest.mocked(harness.lease.release).mockImplementationOnce(async ({ accountId, operationId }) => {
      harness.events.push(`lease-release-start:${accountId.value}:${operationId.value}`);
      await releaseGate.promise;
      harness.events.push(`lease-release-end:${accountId.value}:${operationId.value}`);
    });

    const signingOut = harness.runtime.signOut(operation('sign-out-a'));
    const signingIn = harness.runtime.signIn(operation('sign-in-b'));
    await Promise.resolve();

    expect(harness.events).not.toContain('provider-auth:sign-in-b');
    releaseGate.resolve();
    await Promise.all([signingOut, signingIn]);

    expect(harness.events.indexOf('provider-auth:sign-in-b')).toBeGreaterThan(
      harness.events.indexOf('lease-release-end:account-a:sign-out-a'),
    );
  });

  test('sign-out queued behind first sign-in binds, closes, and releases the authenticated A owner', async () => {
    const harness = createHarness();
    const authenticationGate = deferred<ProviderAuthenticationResult>();
    jest.mocked(harness.provider.authenticate).mockImplementationOnce(async ({ operationId }) => {
      harness.events.push(`provider-auth:${operationId.value}`);
      const result = await authenticationGate.promise;
      if (result.type === 'authenticated') harness.setCurrentUid(result.firebaseAuthUid);
      return result;
    });

    const signingIn = harness.runtime.signIn(operation('first-sign-in-a'));
    const signingOut = harness.runtime.signOut(operation('queued-sign-out-a'));
    authenticationGate.resolve(authenticated(uidA));
    await Promise.all([signingIn, signingOut]);

    expect(harness.events).toContain('close:account-a:session-a');
    expect(harness.events).toContain('lease-release:account-a:queued-sign-out-a');
    expect(harness.events).toContain('provider-sign-out:queued-sign-out-a');
    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.runtime.getState().phase).toBe('signed_out');
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();
  });

  test('queued sign-out persists deferred ownership and cannot resume before owner rehydration', async () => {
    const runtimeOne = createHarness();
    const authenticationGate = deferred<ProviderAuthenticationResult>();
    jest.mocked(runtimeOne.provider.authenticate).mockImplementationOnce(async ({ operationId }) => {
      runtimeOne.events.push(`provider-auth:${operationId.value}`);
      const result = await authenticationGate.promise;
      if (result.type === 'authenticated') runtimeOne.setCurrentUid(result.firebaseAuthUid);
      return result;
    });
    const signOutOperation = operation('deferred-owner-sign-out');

    const signingIn = runtimeOne.runtime.signIn(operation('deferred-owner-sign-in'));
    const signingOut = runtimeOne.runtime.signOut(signOutOperation);
    expect(runtimeOne.localStore.getDestructiveOperation(signOutOperation)).toMatchObject({
      kind: 'sign_out',
      owner: null,
      stage: 'deferred_owner',
    });

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    runtimeTwo.events.length = 0;
    await expect(runtimeTwo.runtime.signOut(signOutOperation)).rejects.toThrow(
      'account_authority_destructive_retry_requires_rehydration',
    );
    expect(runtimeTwo.events).toEqual([]);

    authenticationGate.resolve(authenticated(uidA));
    await Promise.all([signingIn, signingOut]);

    const recoveryStore = new RecordingLocalStore([]);
    const recoveryOperation = operation('rehydrated-deferred-owner-sign-out');
    recoveryStore.reserveOperation(recoveryOperation, 'sign_out', {
      fingerprint: JSON.stringify([null, null, 0]),
      owner: null,
      expectedGeneration: accountAuthorityGeneration(0),
      stage: 'deferred_owner',
    });
    const recoveredRuntime = createHarness({ localStore: recoveryStore });
    recoveredRuntime.setCurrentUid(uidA);
    await recoveredRuntime.runtime.resume(operation('rehydrate-deferred-owner-a'));
    recoveredRuntime.events.length = 0;

    await expect(recoveredRuntime.runtime.signOut(recoveryOperation)).resolves.toMatchObject({
      type: 'signed_out',
    });
    expect(recoveredRuntime.events).toContain('close:account-a:session-a');
    expect(recoveredRuntime.events).toContain('provider-sign-out:rehydrated-deferred-owner-sign-out');
  });

  test('partially bound deferred sign-out cannot rebind from durable A to authenticated B', async () => {
    const sharedStore = new RecordingLocalStore([]);
    const signOutOperation = operation('partially-bound-deferred-sign-out');
    sharedStore.reserveOperation(signOutOperation, 'sign_out', {
      fingerprint: JSON.stringify([null, null, 0]),
      owner: null,
      expectedGeneration: accountAuthorityGeneration(0),
      stage: 'deferred_owner',
    });
    sharedStore.simulatePartiallyBoundDeferredOperation(
      signOutOperation,
      { accountId: accountA, sessionId: sessionA },
      accountAuthorityGeneration(0),
    );
    const harness = createHarness({ localStore: sharedStore });
    harness.authentications.push(authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-b-after-partial-owner-bind'));
    harness.events.length = 0;

    await expect(harness.runtime.signOut(signOutOperation)).rejects.toThrow(
      'account_authority_destructive_retry_requires_recovery',
    );

    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(harness.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
    await expect(harness.provider.currentIdentity()).resolves.toEqual(uidB);
  });

  test('sign-out queued during A → B authentication follows and fully signs out B', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const authenticationGate = deferred<ProviderAuthenticationResult>();
    jest.mocked(harness.provider.authenticate).mockImplementationOnce(async ({ operationId }) => {
      harness.events.push(`provider-auth:${operationId.value}`);
      const result = await authenticationGate.promise;
      if (result.type === 'authenticated') harness.setCurrentUid(result.firebaseAuthUid);
      return result;
    });
    harness.events.length = 0;

    const switching = harness.runtime.signIn(operation('switch-a-to-b'));
    const signingOut = harness.runtime.signOut(operation('sign-out-after-switch'));
    authenticationGate.resolve(authenticated(uidB));
    const [, signOutResult] = await Promise.all([switching, signingOut]);

    expect(signOutResult).toMatchObject({ type: 'signed_out' });
    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.events).toContain('close:account-b:session-b');
    expect(harness.events).toContain('lease-release:account-b:sign-out-after-switch');
    expect(harness.events).toContain('provider-sign-out:sign-out-after-switch');
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();
  });

  test('same-UID resume is a no-op for a live matching scope and reopens a missing scope', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const transitionEventCount = harness.events.filter((value) => /^(open|close):/.test(value)).length;

    await harness.runtime.resume(operation('resume-a-live'));
    expect(harness.events.filter((value) => /^(open|close):/.test(value))).toHaveLength(transitionEventCount);

    harness.localStore.simulateScopeLoss();
    harness.setCurrentUid(uidA);
    await harness.runtime.resume(operation('resume-a-missing'));
    expect(harness.events.filter((value) => value === 'open:account-a:session-a')).toHaveLength(2);
  });

  test('provider failure restores live A only when the provider proves identity was preserved', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), {
      type: 'failed',
      error: new Error('provider-offline'),
      identityPreserved: true,
    });
    await harness.runtime.signIn(operation('sign-in-a'));

    await expect(harness.runtime.signIn(operation('failed-switch-provider'))).rejects.toThrow('provider-offline');

    expect(harness.runtime.getState()).toMatchObject({
      phase: 'authenticated', accountId: accountA, sessionId: sessionA,
    });
    expect(harness.localStore.getOpenScope()).toMatchObject({ accountId: accountA, sessionId: sessionA });
    const write = harness.runtime.capturePreservedWrite({
      operationId: operation('write-after-provider-failure'), domain: 'lesson_progress',
    });
    await expect(harness.runtime.commitPreservedWrite(write)).resolves.toMatchObject({ type: 'committed' });
  });

  test('unknown identity after resume rejection fails closed instead of restoring live A', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    jest.mocked(harness.provider.currentIdentity).mockRejectedValueOnce(new Error('identity-offline'));

    await expect(harness.runtime.resume(operation('failed-resume-provider'))).rejects.toThrow('identity-offline');

    expect(harness.runtime.getState()).toMatchObject({ phase: 'signed_out' });
    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.events).toContain('provider-sign-out:failed-resume-provider');
    expect(harness.events).toContain('lease-release:account-a:failed-resume-provider');
  });

  test('failed B scope open compensates provider and lease, then a cancelled retry cannot restore closed A', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB), { type: 'cancelled' });
    await harness.runtime.signIn(operation('sign-in-a'));
    jest.spyOn(harness.localStore, 'openScope').mockRejectedValueOnce(new Error('open-b-failed'));
    const switchOperation = operation('switch-to-b-with-open-failure');

    await expect(harness.runtime.signIn(switchOperation)).rejects.toThrow('open-b-failed');

    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.events).toContain('provider-sign-out:switch-to-b-with-open-failure');
    expect(harness.events).toContain('lease-release:account-b:switch-to-b-with-open-failure');
    expect(harness.events).toContain('lease-release:account-a:switch-to-b-with-open-failure');
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();

    await expect(harness.runtime.signIn(switchOperation)).resolves.toEqual({
      type: 'cancelled', reason: 'provider_cancelled',
    });
    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.localStore.getOpenScope()).toBeNull();
  });

  test('throwing local scope inspection cannot short-circuit provider and A/B lease compensation', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const originalGetOpenScope = harness.localStore.getOpenScope.bind(harness.localStore);
    jest.spyOn(harness.localStore, 'getOpenScope')
      .mockImplementationOnce(() => { throw new Error('scope-inspection-failed'); })
      .mockImplementationOnce(() => { throw new Error('scope-inspection-still-failed'); })
      .mockImplementation(originalGetOpenScope);
    const switchOperation = operation('switch-to-b-with-scope-inspection-failure');

    await expect(harness.runtime.signIn(switchOperation)).rejects.toThrow(
      'scope-inspection-still-failed',
    );

    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.events).toContain('provider-sign-out:switch-to-b-with-scope-inspection-failure');
    expect(harness.events).toContain('lease-release:account-a:switch-to-b-with-scope-inspection-failure');
    expect(harness.events).toContain('lease-release:account-b:switch-to-b-with-scope-inspection-failure');
    expect(harness.events).toContain('close:account-a:session-a');
    expect(harness.localStore.getOpenScope()).toBeNull();
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();
  });

  test('failed B lease acquire signs out provider B, retires A, and cancellation retry stays signed out', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB), { type: 'cancelled' });
    await harness.runtime.signIn(operation('sign-in-a'));
    jest.mocked(harness.lease.acquire).mockRejectedValueOnce(new Error('acquire-b-offline'));
    const switchOperation = operation('switch-to-b-with-acquire-failure');

    await expect(harness.runtime.signIn(switchOperation)).rejects.toThrow('acquire-b-offline');

    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.events).toContain('provider-sign-out:switch-to-b-with-acquire-failure');
    expect(harness.events).toContain('lease-release:account-a:switch-to-b-with-acquire-failure');
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();

    await expect(harness.runtime.signIn(switchOperation)).resolves.toEqual({
      type: 'cancelled', reason: 'provider_cancelled',
    });
    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.localStore.getOpenScope()).toBeNull();
  });

  test('generation persistence failure cannot short-circuit authentication compensation', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a-before-generation-failure'));
    jest.mocked(harness.lease.acquire).mockRejectedValueOnce(new Error('acquire-b-offline'));
    const originalAdvance = harness.localStore.advanceAuthorityGeneration.bind(harness.localStore);
    jest.spyOn(harness.localStore, 'advanceAuthorityGeneration').mockImplementation((generation) => {
      if (generation.value > harness.runtime.getState().generation.value) {
        throw new Error('generation-persistence-failed');
      }
      return originalAdvance(generation);
    });
    harness.events.length = 0;

    await expect(harness.runtime.signIn(operation('switch-b-generation-failure'))).rejects.toThrow(
      'generation-persistence-failed',
    );

    expect(harness.events).toContain('close:account-a:session-a');
    expect(harness.events).toContain('provider-sign-out:switch-b-generation-failure');
    expect(harness.events).toContain('lease-release:account-a:switch-b-generation-failure');
    expect(harness.localStore.getOpenScope()).toBeNull();
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();
  });

  test('an accepted revoked lease closes its local scope before provider sign-out', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const generation = harness.runtime.getState().generation;

    await harness.runtime.handleLeaseRevoked({
      operationId: operation('revoke-a'),
      revokedSessionId: sessionA,
      expectedGeneration: generation,
    });

    expect(harness.runtime.getState().phase).toBe('device_taken_over');
    expect(harness.events.indexOf('close:account-a:session-a')).toBeLessThan(
      harness.events.indexOf('provider-sign-out:revoke-a'),
    );
  });

  test('offline retries reuse operationId and a completed retry is deduplicated', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidA));
    jest.mocked(harness.lease.acquire)
      .mockRejectedValueOnce(new Error('offline'));
    const signInOperation = operation('retryable-sign-in');

    await expect(harness.runtime.signIn(signInOperation)).rejects.toThrow('offline');
    await expect(harness.runtime.signIn(signInOperation)).resolves.toMatchObject({ type: 'authenticated' });
    await expect(harness.runtime.signIn(signInOperation)).resolves.toMatchObject({ type: 'authenticated' });

    expect(jest.mocked(harness.lease.acquire).mock.calls.map(([request]) => request.operationId.value))
      .toEqual(['retryable-sign-in', 'retryable-sign-in']);
    expect(jest.mocked(harness.provider.authenticate)).toHaveBeenCalledTimes(2);
  });

  // AA S4b: запись, захваченная до смены аккаунта, фиксируется в области
  // ПРЕЖНЕГО владельца до её закрытия (не теряется) и никогда — в области B.
  test('a write captured under the old account/session is committed into A before switch, never into B', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const captured = harness.runtime.capturePreservedWrite({
      operationId: operation('write-a'), domain: 'lesson_progress',
    });

    await harness.runtime.signIn(operation('sign-in-b'));
    expect(harness.localStore.committed).toEqual([captured]);
    const result = await harness.runtime.commitPreservedWrite(captured);

    expect(result).toEqual({
      type: 'committed', operationId: operation('write-a'), domain: 'lesson_progress',
    });
    expect(harness.localStore.committed).toEqual([captured]);
  });

  test('delete clears local data synchronously before any awaited remote call', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    harness.events.length = 0;
    const providerGate = deferred<void>();
    jest.mocked(harness.provider.signOut).mockImplementationOnce(async ({ operationId }) => {
      harness.events.push(`provider-sign-out-start:${operationId.value}`);
      await providerGate.promise;
    });

    const deleting = harness.runtime.deleteAccount(operation('delete-a'));

    expect(harness.events[0]).toBe('clear:account-a');
    expect(harness.events).not.toContain('remote-delete:account-a:delete-a');
    providerGate.resolve();
    await deleting;
    expect(harness.events.indexOf('clear:account-a')).toBeLessThan(
      harness.events.indexOf('provider-sign-out-start:delete-a'),
    );
    expect(harness.events.indexOf('clear:account-a')).toBeLessThan(
      harness.events.indexOf('remote-delete:account-a:delete-a'),
    );
  });

  test('queued delete binds and clears A synchronously while A → B authentication is in flight', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const authenticationGate = deferred<ProviderAuthenticationResult>();
    jest.mocked(harness.provider.authenticate).mockImplementationOnce(async ({ operationId }) => {
      harness.events.push(`provider-auth:${operationId.value}`);
      return authenticationGate.promise;
    });
    harness.events.length = 0;

    const switching = harness.runtime.signIn(operation('sign-in-b'));
    const deleting = harness.runtime.deleteAccount(operation('delete-visible-a'));

    expect(harness.events).toContain('clear:account-a');
    expect(harness.events).not.toContain('clear:account-b');
    authenticationGate.resolve(authenticated(uidB));
    await Promise.all([switching, deleting]);

    expect(harness.events).toContain('remote-delete:account-a:delete-visible-a');
    expect(harness.events).not.toContain('remote-delete:account-b:delete-visible-a');
    expect(harness.events).not.toContain('close:account-b:session-b');
    expect(harness.events).not.toContain('provider-sign-out:delete-visible-a');
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('retrying an offline delete reuses its operation without repeating local deletion', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    jest.mocked(harness.lease.deleteAccount).mockRejectedValueOnce(new Error('offline'));
    const deleteOperation = operation('retry-delete-a');

    await expect(harness.runtime.deleteAccount(deleteOperation)).rejects.toThrow('offline');
    const generationAfterLocalDelete = harness.runtime.getState().generation.value;
    await expect(harness.runtime.deleteAccount(deleteOperation)).resolves.toMatchObject({ type: 'local_deleted' });

    expect(harness.events.filter((value) => value === 'clear:account-a')).toHaveLength(1);
    expect(harness.runtime.getState().generation.value).toBe(generationAfterLocalDelete);
    expect(jest.mocked(harness.lease.deleteAccount).mock.calls.map(([request]) => request.operationId.value))
      .toEqual(['retry-delete-a', 'retry-delete-a']);
  });

  test('failed sign-out retry after switching to B cannot close or sign out B', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    jest.mocked(harness.lease.release).mockRejectedValueOnce(new Error('offline'));
    const signOutOperation = operation('retry-sign-out-a');

    await expect(harness.runtime.signOut(signOutOperation)).rejects.toThrow('offline');
    await harness.runtime.signIn(operation('sign-in-b'));
    harness.events.length = 0;
    const providerCallsBeforeRetry = jest.mocked(harness.provider.signOut).mock.calls.length;

    await expect(harness.runtime.signOut(signOutOperation)).resolves.toMatchObject({ type: 'signed_out' });

    expect(jest.mocked(harness.provider.signOut)).toHaveBeenCalledTimes(providerCallsBeforeRetry);
    expect(harness.events).not.toContain('close:account-b:session-b');
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('sign-out cleanup attempts scope close and lease release when inspection and provider throw synchronously', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const originalGetOpenScope = harness.localStore.getOpenScope.bind(harness.localStore);
    jest.spyOn(harness.localStore, 'getOpenScope')
      .mockImplementationOnce(() => { throw new Error('scope-inspection-failed'); })
      .mockImplementation(originalGetOpenScope);
    jest.mocked(harness.provider.signOut).mockImplementationOnce(({ operationId }) => {
      harness.events.push(`provider-sign-out-throw:${operationId.value}`);
      harness.setCurrentUid(null);
      throw new Error('provider-sign-out-failed');
    });
    jest.mocked(harness.lease.release).mockImplementationOnce(({ accountId, operationId }) => {
      harness.events.push(`lease-release-throw:${accountId.value}:${operationId.value}`);
      throw new Error('lease-release-failed');
    });

    await expect(harness.runtime.signOut(operation('sync-throw-sign-out'))).rejects.toThrow();

    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.events).toContain('close:account-a:session-a');
    expect(harness.events).toContain('provider-sign-out-throw:sync-throw-sign-out');
    expect(harness.events).toContain('lease-release-throw:account-a:sync-throw-sign-out');
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();
  });

  test('successful sign-out waits for local scope close before provider sign-out and lease release', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('ordered-sign-out-sign-in-a'));
    harness.events.length = 0;
    let releaseClose!: () => void;
    const closeGate = new Promise<void>((resolve) => { releaseClose = resolve; });
    const originalClose = harness.localStore.closeScope.bind(harness.localStore);
    jest.spyOn(harness.localStore, 'closeScope').mockImplementationOnce(async (scope) => {
      harness.events.push('close-start');
      await closeGate;
      await originalClose(scope);
      harness.events.push('close-end');
    });

    const signingOut = harness.runtime.signOut(operation('ordered-sign-out-a'));
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(harness.events).toEqual(['close-start']);

    releaseClose();
    await signingOut;
    expect(harness.events.indexOf('close-end')).toBeLessThan(
      harness.events.indexOf('provider-sign-out:ordered-sign-out-a'),
    );
    expect(harness.events.indexOf('close-end')).toBeLessThan(
      harness.events.indexOf('lease-release:account-a:ordered-sign-out-a'),
    );
  });

  test('delete cleanup attempts scope close and provider sign-out when inspection and remote delete throw synchronously', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const originalGetOpenScope = harness.localStore.getOpenScope.bind(harness.localStore);
    jest.spyOn(harness.localStore, 'getOpenScope')
      .mockImplementationOnce(() => { throw new Error('scope-inspection-failed'); })
      .mockImplementation(originalGetOpenScope);
    jest.mocked(harness.lease.deleteAccount).mockImplementationOnce(({ accountId, operationId }) => {
      harness.events.push(`remote-delete-throw:${accountId.value}:${operationId.value}`);
      throw new Error('remote-delete-failed');
    });

    await expect(harness.runtime.deleteAccount(operation('sync-throw-delete'))).rejects.toThrow();

    expect(harness.runtime.getState().phase).toBe('signed_out');
    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.events).toContain('close:account-a:session-a');
    expect(harness.events).toContain('provider-sign-out:sync-throw-delete');
    expect(harness.events).toContain('remote-delete-throw:account-a:sync-throw-delete');
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();
  });

  test('revocation cleanup attempts scope close when inspection and provider throw synchronously', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const generation = harness.runtime.getState().generation;
    const originalGetOpenScope = harness.localStore.getOpenScope.bind(harness.localStore);
    jest.spyOn(harness.localStore, 'getOpenScope')
      .mockImplementationOnce(() => { throw new Error('scope-inspection-failed'); })
      .mockImplementation(originalGetOpenScope);
    jest.mocked(harness.provider.signOut).mockImplementationOnce(({ operationId }) => {
      harness.events.push(`provider-sign-out-throw:${operationId.value}`);
      harness.setCurrentUid(null);
      throw new Error('provider-sign-out-failed');
    });

    await expect(harness.runtime.handleLeaseRevoked({
      operationId: operation('sync-throw-revoke'),
      revokedSessionId: sessionA,
      expectedGeneration: generation,
    })).rejects.toThrow();

    expect(harness.runtime.getState().phase).toBe('device_taken_over');
    expect(harness.localStore.getOpenScope()).toBeNull();
    expect(harness.events).toContain('close:account-a:session-a');
    expect(harness.events).toContain('provider-sign-out-throw:sync-throw-revoke');
    await expect(harness.provider.currentIdentity()).resolves.toBeNull();
  });

  test('failed delete retry after switching to B cannot close or sign out B', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    jest.mocked(harness.lease.deleteAccount).mockRejectedValueOnce(new Error('offline'));
    const deleteOperation = operation('retry-delete-a-after-switch');

    await expect(harness.runtime.deleteAccount(deleteOperation)).rejects.toThrow('offline');
    await harness.runtime.signIn(operation('sign-in-b'));
    harness.events.length = 0;
    const providerCallsBeforeRetry = jest.mocked(harness.provider.signOut).mock.calls.length;

    await expect(harness.runtime.deleteAccount(deleteOperation)).resolves.toMatchObject({ type: 'local_deleted' });

    expect(jest.mocked(harness.provider.signOut)).toHaveBeenCalledTimes(providerCallsBeforeRetry);
    expect(harness.events).not.toContain('close:account-b:session-b');
    expect(harness.events).toEqual(['remote-delete:account-a:retry-delete-a-after-switch']);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('failed revocation retry after switching to B cannot close or sign out B', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const generationA = harness.runtime.getState().generation;
    jest.mocked(harness.provider.signOut).mockRejectedValueOnce(new Error('offline'));
    const notification = {
      operationId: operation('retry-revoke-a'),
      revokedSessionId: sessionA,
      expectedGeneration: generationA,
    } as const;

    await expect(harness.runtime.handleLeaseRevoked(notification)).rejects.toThrow('offline');
    await harness.runtime.signIn(operation('sign-in-b'));
    harness.events.length = 0;
    const providerCallsBeforeRetry = jest.mocked(harness.provider.signOut).mock.calls.length;

    await expect(harness.runtime.handleLeaseRevoked(notification)).resolves.toMatchObject({
      type: 'device_taken_over',
    });

    expect(jest.mocked(harness.provider.signOut)).toHaveBeenCalledTimes(providerCallsBeforeRetry);
    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('A → B → A advances generation so an old A write is rejected', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB), authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    const captured = harness.runtime.capturePreservedWrite({
      operationId: operation('old-write-a'), domain: 'lesson_progress',
    });

    await harness.runtime.signIn(operation('sign-in-b'));
    await harness.runtime.signIn(operation('sign-in-a-again'));
    // AA S4b: старая запись A зафиксирована при уходе с A (в старом поколении);
    // в новое поколение A она не попадает повторно.
    expect(harness.localStore.committed).toEqual([captured]);
    const result = await harness.runtime.commitPreservedWrite(captured);

    expect(result).toEqual({
      type: 'committed', operationId: operation('old-write-a'), domain: 'lesson_progress',
    });
    expect(harness.localStore.committed).toEqual([captured]);
  });

  test('restart preserves the ABA generation fence before resuming A', async () => {
    const runtimeOne = createHarness();
    runtimeOne.authentications.push(authenticated(uidA), authenticated(uidB), authenticated(uidA));
    await runtimeOne.runtime.signIn(operation('restart-aba-sign-in-a'));
    const staleWrite = runtimeOne.runtime.capturePreservedWrite({
      operationId: operation('restart-aba-old-write'), domain: 'lesson_progress',
    });
    await runtimeOne.runtime.signIn(operation('restart-aba-sign-in-b'));
    await runtimeOne.runtime.signIn(operation('restart-aba-sign-in-a-again'));
    const generationBeforeRestart = runtimeOne.runtime.getState().generation;

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    runtimeTwo.setCurrentUid(uidA);
    await runtimeTwo.runtime.resume(operation('restart-aba-resume-a'));
    const result = await runtimeTwo.runtime.commitPreservedWrite(staleWrite);

    expect(runtimeTwo.runtime.getState().generation.value).toBeGreaterThanOrEqual(
      generationBeforeRestart.value,
    );
    expect(result).toEqual({
      type: 'rejected', operationId: staleWrite.operationId, reason: 'stale_generation',
    });
  });

  test('successful operation receipts are bounded and evict the oldest receipt', async () => {
    const harness = createHarness();
    const operationCount = 300;
    harness.authentications.push(
      ...Array.from({ length: operationCount + 1 }, () => ({ type: 'cancelled' as const })),
    );

    for (let index = 0; index < operationCount; index += 1) {
      await harness.runtime.signIn(operation(`bounded-receipt-${index}`));
    }
    const callsAfterUniqueOperations = jest.mocked(harness.provider.authenticate).mock.calls.length;
    await harness.runtime.signIn(operation(`bounded-receipt-${operationCount - 1}`));
    expect(jest.mocked(harness.provider.authenticate)).toHaveBeenCalledTimes(callsAfterUniqueOperations);

    await harness.runtime.signIn(operation('bounded-receipt-0'));
    expect(jest.mocked(harness.provider.authenticate)).toHaveBeenCalledTimes(callsAfterUniqueOperations + 1);
  });

  test('bounded ordinary receipts retain operation kinds in the durable local ledger', async () => {
    const harness = createHarness();
    const operationCount = 300;
    harness.authentications.push(
      ...Array.from({ length: operationCount + 1 }, () => ({ type: 'cancelled' as const })),
    );
    for (let index = 0; index < operationCount; index += 1) {
      await harness.runtime.signIn(operation(`ledger-backed-operation-${index}`));
    }
    const callsAfterUniqueOperations = jest.mocked(harness.provider.authenticate).mock.calls.length;

    expect(harness.localStore.getOperationKind(operation('ledger-backed-operation-0'))).toBe('sign_in');
    await harness.runtime.signIn(operation('ledger-backed-operation-0'));

    expect(jest.mocked(harness.provider.authenticate)).toHaveBeenCalledTimes(callsAfterUniqueOperations + 1);
    await expect(harness.runtime.deleteAccount(operation('ledger-backed-operation-0'))).rejects.toThrow(
      'account_authority_operation_id_reused',
    );
  });

  test('successful delete receipt survives ordinary cache eviction and cannot retarget B', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const deleteOperation = operation('permanent-delete-a');
    const firstResult = await harness.runtime.deleteAccount(deleteOperation);
    await harness.runtime.signIn(operation('sign-in-b'));
    harness.authentications.push(
      ...Array.from({ length: 300 }, () => ({ type: 'cancelled' as const })),
    );
    for (let index = 0; index < 300; index += 1) {
      await harness.runtime.signIn(operation(`ordinary-after-delete-${index}`));
    }
    harness.events.length = 0;

    await expect(harness.runtime.deleteAccount(deleteOperation)).resolves.toEqual(firstResult);

    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(harness.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
  });

  test('successful delete receipt replays from durable store after runtime restart without touching B', async () => {
    const runtimeOne = createHarness();
    runtimeOne.authentications.push(authenticated(uidA));
    await runtimeOne.runtime.signIn(operation('runtime-one-sign-in-a'));
    const deleteOperation = operation('restart-safe-delete-a');
    const deleteReceipt = await runtimeOne.runtime.deleteAccount(deleteOperation);

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    runtimeTwo.authentications.push(authenticated(uidB));
    await runtimeTwo.runtime.signIn(operation('runtime-two-sign-in-b'));
    runtimeTwo.events.length = 0;

    await expect(runtimeTwo.runtime.deleteAccount(deleteOperation)).resolves.toEqual(deleteReceipt);

    expect(runtimeTwo.events).toEqual([]);
    expect(runtimeTwo.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(runtimeTwo.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
  });

  test('destructive kind and owner fence are reserved atomically before delete awaits remote work', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a-for-atomic-reservation'));
    const generationA = harness.runtime.getState().generation;
    const deleteOperation = operation('atomically-reserved-delete');
    const remoteGate = deferred<void>();
    jest.mocked(harness.lease.deleteAccount).mockImplementationOnce(async () => remoteGate.promise);

    const deleting = harness.runtime.deleteAccount(deleteOperation);

    expect(harness.localStore.getOperationKind(deleteOperation)).toBe('delete');
    expect(harness.localStore.getDestructiveOperation(deleteOperation)).toMatchObject({
      kind: 'delete',
      owner: { accountId: accountA, sessionId: sessionA },
      expectedGeneration: generationA,
    });
    remoteGate.resolve();
    await expect(deleting).resolves.toMatchObject({ type: 'local_deleted' });
  });

  test('failed destructive reservation rejects changed owner after runtime restart', async () => {
    const runtimeOne = createHarness();
    const deleteOperation = operation('restart-reserved-delete');
    await expect(runtimeOne.runtime.deleteAccount(deleteOperation)).rejects.toThrow(
      'account_authority_not_authenticated',
    );

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    runtimeTwo.authentications.push(authenticated(uidB));
    await runtimeTwo.runtime.signIn(operation('runtime-two-sign-in-b'));
    runtimeTwo.events.length = 0;

    await expect(runtimeTwo.runtime.deleteAccount(deleteOperation)).rejects.toThrow(
      'account_authority_destructive_retry_requires_recovery',
    );

    expect(runtimeTwo.events).toEqual([]);
    expect(runtimeTwo.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('partial crash-era destructive reservation fails closed instead of rebinding its owner', async () => {
    const sharedStore = new RecordingLocalStore([]);
    const deleteOperation = operation('crash-between-reservation-fields');
    sharedStore.operationKinds.set(deleteOperation.value, 'delete');
    const runtime = createHarness({ localStore: sharedStore });
    runtime.authentications.push(authenticated(uidB));
    await runtime.runtime.signIn(operation('sign-in-b-after-partial-reservation'));
    runtime.events.length = 0;

    await expect(runtime.runtime.deleteAccount(deleteOperation)).rejects.toThrow(
      'account_authority_destructive_retry_requires_recovery',
    );

    expect(runtime.events).toEqual([]);
    expect(sharedStore.getDestructiveOperation(deleteOperation)).toBeNull();
    expect(runtime.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('failed sign-out retry after restart releases only durable A and preserves B', async () => {
    const runtimeOne = createHarness();
    runtimeOne.authentications.push(authenticated(uidA));
    await runtimeOne.runtime.signIn(operation('runtime-one-sign-in-a'));
    const signOutOperation = operation('restart-reserved-sign-out');
    jest.mocked(runtimeOne.provider.signOut).mockRejectedValueOnce(new Error('offline'));
    await expect(runtimeOne.runtime.signOut(signOutOperation)).rejects.toThrow('offline');

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    runtimeTwo.authentications.push(authenticated(uidB));
    await runtimeTwo.runtime.signIn(operation('runtime-two-sign-in-b'));
    runtimeTwo.events.length = 0;

    await expect(runtimeTwo.runtime.signOut(signOutOperation)).resolves.toMatchObject({
      type: 'signed_out',
    });

    expect(runtimeTwo.events).toEqual(['lease-release:account-a:restart-reserved-sign-out']);
    expect(runtimeTwo.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(runtimeTwo.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
  });

  test('failed delete retry after restart deletes only durable A and preserves B', async () => {
    const runtimeOne = createHarness();
    runtimeOne.authentications.push(authenticated(uidA));
    await runtimeOne.runtime.signIn(operation('runtime-one-sign-in-a-for-delete'));
    const deleteOperation = operation('restart-reserved-remote-delete');
    jest.mocked(runtimeOne.lease.deleteAccount).mockRejectedValueOnce(new Error('offline'));
    await expect(runtimeOne.runtime.deleteAccount(deleteOperation)).rejects.toThrow('offline');
    expect(runtimeOne.localStore.getDestructiveOperation(deleteOperation)).toMatchObject({
      kind: 'delete',
      owner: { accountId: accountA, sessionId: sessionA },
      stage: 'local_applied',
    });

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    runtimeTwo.authentications.push(authenticated(uidB));
    await runtimeTwo.runtime.signIn(operation('runtime-two-sign-in-b-after-delete'));
    runtimeTwo.events.length = 0;

    await expect(runtimeTwo.runtime.deleteAccount(deleteOperation)).resolves.toMatchObject({
      type: 'local_deleted',
    });

    expect(runtimeTwo.events).toEqual(['remote-delete:account-a:restart-reserved-remote-delete']);
    expect(runtimeTwo.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(runtimeTwo.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
  });

  test('boot-time A retries defer when durable scope and provider may belong to newer B', async () => {
    const signOutRuntimeOne = createHarness();
    signOutRuntimeOne.authentications.push(authenticated(uidA), authenticated(uidB));
    await signOutRuntimeOne.runtime.signIn(operation('boot-fence-sign-in-a'));
    const signOutOperation = operation('boot-fence-sign-out-a');
    jest.mocked(signOutRuntimeOne.provider.signOut).mockRejectedValueOnce(new Error('offline'));
    await expect(signOutRuntimeOne.runtime.signOut(signOutOperation)).rejects.toThrow('offline');
    await signOutRuntimeOne.runtime.signIn(operation('boot-fence-sign-in-b'));

    const signOutRuntimeTwo = createHarness({ localStore: signOutRuntimeOne.localStore });
    signOutRuntimeTwo.setCurrentUid(uidB);
    signOutRuntimeTwo.events.length = 0;
    await expect(signOutRuntimeTwo.runtime.signOut(signOutOperation)).rejects.toThrow(
      'account_authority_destructive_retry_requires_rehydration',
    );
    expect(signOutRuntimeTwo.events).toEqual([]);
    expect(signOutRuntimeTwo.localStore.getOpenScope()).toMatchObject({
      accountId: accountB, sessionId: sessionB,
    });
    await expect(signOutRuntimeTwo.provider.currentIdentity()).resolves.toEqual(uidB);

    const deleteRuntimeOne = createHarness();
    deleteRuntimeOne.authentications.push(authenticated(uidA), authenticated(uidB));
    await deleteRuntimeOne.runtime.signIn(operation('boot-fence-delete-sign-in-a'));
    const deleteOperation = operation('boot-fence-delete-a');
    jest.mocked(deleteRuntimeOne.lease.deleteAccount).mockRejectedValueOnce(new Error('offline'));
    await expect(deleteRuntimeOne.runtime.deleteAccount(deleteOperation)).rejects.toThrow('offline');
    await deleteRuntimeOne.runtime.signIn(operation('boot-fence-delete-sign-in-b'));

    const deleteRuntimeTwo = createHarness({ localStore: deleteRuntimeOne.localStore });
    deleteRuntimeTwo.setCurrentUid(uidB);
    deleteRuntimeTwo.events.length = 0;
    await expect(deleteRuntimeTwo.runtime.deleteAccount(deleteOperation)).rejects.toThrow(
      'account_authority_destructive_retry_requires_rehydration',
    );
    expect(deleteRuntimeTwo.events).toEqual([]);
    expect(deleteRuntimeTwo.localStore.getOpenScope()).toMatchObject({
      accountId: accountB, sessionId: sessionB,
    });
    await expect(deleteRuntimeTwo.provider.currentIdentity()).resolves.toEqual(uidB);
  });

  test('unfinished delete reconstructs its durable A tail after restart without clearing again', async () => {
    const runtimeOne = createHarness();
    runtimeOne.authentications.push(authenticated(uidA));
    await runtimeOne.runtime.signIn(operation('runtime-one-sign-in-a-for-resume-delete'));
    const deleteOperation = operation('restart-resumable-delete');
    jest.mocked(runtimeOne.lease.deleteAccount).mockRejectedValueOnce(new Error('offline'));
    await expect(runtimeOne.runtime.deleteAccount(deleteOperation)).rejects.toThrow('offline');

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    await runtimeTwo.runtime.resume(operation('rehydrate-before-delete-tail'));
    runtimeTwo.events.length = 0;
    await expect(runtimeTwo.runtime.deleteAccount(deleteOperation)).resolves.toMatchObject({
      type: 'local_deleted',
    });

    expect(runtimeTwo.events).toContain('remote-delete:account-a:restart-resumable-delete');
    expect(runtimeTwo.events).not.toContain('clear:account-a');
    expect(runtimeTwo.localStore.getOpenScope()).toBeNull();
  });

  test('unfinished sign-out and revocation reconstruct provider cleanup after restart', async () => {
    const signOutRuntimeOne = createHarness();
    signOutRuntimeOne.authentications.push(authenticated(uidA));
    await signOutRuntimeOne.runtime.signIn(operation('runtime-one-sign-in-a-for-resume-sign-out'));
    const signOutOperation = operation('restart-resumable-sign-out');
    jest.mocked(signOutRuntimeOne.provider.signOut).mockRejectedValueOnce(new Error('offline'));
    await expect(signOutRuntimeOne.runtime.signOut(signOutOperation)).rejects.toThrow('offline');

    const signOutRuntimeTwo = createHarness({ localStore: signOutRuntimeOne.localStore });
    await signOutRuntimeTwo.runtime.resume(operation('rehydrate-before-sign-out-tail'));
    signOutRuntimeTwo.events.length = 0;
    await expect(signOutRuntimeTwo.runtime.signOut(signOutOperation)).resolves.toMatchObject({
      type: 'signed_out',
    });
    expect(signOutRuntimeTwo.events).toContain('provider-sign-out:restart-resumable-sign-out');

    const revokeRuntimeOne = createHarness();
    revokeRuntimeOne.authentications.push(authenticated(uidA));
    await revokeRuntimeOne.runtime.signIn(operation('runtime-one-sign-in-a-for-resume-revoke'));
    const revokeOperation = operation('restart-resumable-revoke');
    const generationA = revokeRuntimeOne.runtime.getState().generation;
    jest.mocked(revokeRuntimeOne.provider.signOut).mockRejectedValueOnce(new Error('offline'));
    const notification = {
      operationId: revokeOperation,
      revokedSessionId: sessionA,
      expectedGeneration: generationA,
    } as const;
    await expect(revokeRuntimeOne.runtime.handleLeaseRevoked(notification)).rejects.toThrow('offline');

    const revokeRuntimeTwo = createHarness({ localStore: revokeRuntimeOne.localStore });
    await revokeRuntimeTwo.runtime.resume(operation('rehydrate-before-revoke-tail'));
    revokeRuntimeTwo.events.length = 0;
    await expect(revokeRuntimeTwo.runtime.handleLeaseRevoked(notification)).resolves.toMatchObject({
      type: 'device_taken_over',
    });
    expect(revokeRuntimeTwo.events).toContain('provider-sign-out:restart-resumable-revoke');
  });

  test('failed revocation retry after restart preserves B while completing durable A', async () => {
    const runtimeOne = createHarness();
    runtimeOne.authentications.push(authenticated(uidA));
    await runtimeOne.runtime.signIn(operation('runtime-one-sign-in-a'));
    const generationA = runtimeOne.runtime.getState().generation;
    const revokeOperation = operation('restart-reserved-revocation');
    jest.mocked(runtimeOne.provider.signOut).mockRejectedValueOnce(new Error('offline'));
    const notification = {
      operationId: revokeOperation,
      revokedSessionId: sessionA,
      expectedGeneration: generationA,
    } as const;
    await expect(runtimeOne.runtime.handleLeaseRevoked(notification)).rejects.toThrow('offline');

    const runtimeTwo = createHarness({ localStore: runtimeOne.localStore });
    runtimeTwo.authentications.push(authenticated(uidB));
    await runtimeTwo.runtime.signIn(operation('runtime-two-sign-in-b'));
    runtimeTwo.events.length = 0;

    await expect(runtimeTwo.runtime.handleLeaseRevoked(notification)).resolves.toMatchObject({
      type: 'device_taken_over',
    });

    expect(runtimeTwo.events).toEqual([]);
    expect(runtimeTwo.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('failed destructive pending state is bounded while durable retry fences remain', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a'));
    jest.mocked(harness.provider.signOut).mockRejectedValue(new Error('offline'));
    const operationCount = 300;

    for (let index = 0; index < operationCount; index += 1) {
      await expect(harness.runtime.signOut(operation(`failed-sign-out-${index}`))).rejects.toThrow('offline');
    }
    jest.mocked(harness.provider.signOut).mockResolvedValue(undefined);
    const providerCallsBeforeRetries = jest.mocked(harness.provider.signOut).mock.calls.length;

    await expect(harness.runtime.signOut(operation('failed-sign-out-0'))).resolves.toMatchObject({
      type: 'signed_out',
    });
    expect(jest.mocked(harness.provider.signOut)).toHaveBeenCalledTimes(providerCallsBeforeRetries);

    await expect(harness.runtime.signOut(operation(`failed-sign-out-${operationCount - 1}`)))
      .resolves.toMatchObject({ type: 'signed_out' });
    expect(jest.mocked(harness.provider.signOut)).toHaveBeenCalledTimes(providerCallsBeforeRetries + 1);
  });

  test('destructive queue capacity never evicts admitted live sign-outs', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-a-for-queue-capacity'));
    const providerGate = deferred<void>();
    jest.mocked(harness.provider.signOut).mockImplementationOnce(async () => providerGate.promise);

    const operations = Array.from({ length: 300 }, (_, index) => (
      harness.runtime.signOut(operation(`capacity-sign-out-${index}`))
    ));
    await Promise.resolve();
    providerGate.resolve();
    const results = await Promise.allSettled(operations);
    const rejectedMessages = results.flatMap((result) => (
      result.status === 'rejected' ? [String(result.reason)] : []
    ));

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(256);
    expect(rejectedMessages).toHaveLength(44);
    expect(rejectedMessages.every((message) => (
      message.includes('account_authority_destructive_queue_full')
    ))).toBe(true);
    expect(rejectedMessages.some((message) => message.includes('pending_missing'))).toBe(false);
  });

  test('failed sign-out permanently reserves its operation ID before delete prepare can touch B', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const reservedOperation = operation('reserved-destructive-operation');
    jest.mocked(harness.lease.release).mockRejectedValueOnce(new Error('offline'));
    await expect(harness.runtime.signOut(reservedOperation)).rejects.toThrow('offline');
    await harness.runtime.signIn(operation('sign-in-b'));
    harness.events.length = 0;

    await expect(harness.runtime.deleteAccount(reservedOperation)).rejects.toThrow(
      'account_authority_operation_id_reused',
    );

    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(harness.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
  });

  test('delete rejected while signed out cannot be rebound to B on retry', async () => {
    const harness = createHarness();
    const deleteOperation = operation('delete-reserved-while-signed-out');

    await expect(harness.runtime.deleteAccount(deleteOperation)).rejects.toThrow(
      'account_authority_not_authenticated',
    );
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    await harness.runtime.signIn(operation('sign-in-b'));
    harness.events.length = 0;

    await expect(harness.runtime.deleteAccount(deleteOperation)).rejects.toThrow(
      'account_authority_destructive_retry_requires_recovery',
    );

    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(harness.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
  });

  test('cross-kind rejection preserves the original sign-in kind after ordinary receipt eviction', async () => {
    const harness = createHarness();
    const sharedOperation = operation('shared-sign-in-delete-id');
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(sharedOperation);
    harness.events.length = 0;

    await expect(harness.runtime.deleteAccount(sharedOperation)).rejects.toThrow(
      'account_authority_operation_id_reused',
    );
    expect(harness.events).toEqual([]);

    harness.authentications.push(
      ...Array.from({ length: 300 }, () => ({ type: 'cancelled' as const })),
    );
    for (let index = 0; index < 300; index += 1) {
      await harness.runtime.signIn(operation(`ordinary-after-cross-kind-${index}`));
    }
    harness.events.length = 0;

    await expect(harness.runtime.deleteAccount(sharedOperation)).rejects.toThrow(
      'account_authority_operation_id_reused',
    );

    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountA });
    expect(harness.localStore.getOpenScope()).toMatchObject({ accountId: accountA, sessionId: sessionA });
  });

  test('original sign-in kind survives receipt eviction before the first cross-kind call', async () => {
    const harness = createHarness();
    const sharedOperation = operation('shared-id-with-late-cross-kind-call');
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(sharedOperation);
    await harness.runtime.signIn(operation('switch-to-b-before-cache-churn'));
    harness.authentications.push(
      ...Array.from({ length: 300 }, () => ({ type: 'cancelled' as const })),
    );
    for (let index = 0; index < 300; index += 1) {
      await harness.runtime.signIn(operation(`ordinary-before-first-cross-kind-${index}`));
    }
    harness.events.length = 0;

    await expect(harness.runtime.deleteAccount(sharedOperation)).rejects.toThrow(
      'account_authority_operation_id_reused',
    );

    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(harness.localStore.getOpenScope()).toMatchObject({ accountId: accountB, sessionId: sessionB });
  });

  test('failed revocation reserves its operation ID to the original owner fingerprint', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const generationA = harness.runtime.getState().generation;
    const revokeOperation = operation('owner-bound-revocation');
    jest.mocked(harness.provider.signOut).mockRejectedValueOnce(new Error('offline'));
    await expect(harness.runtime.handleLeaseRevoked({
      operationId: revokeOperation,
      revokedSessionId: sessionA,
      expectedGeneration: generationA,
    })).rejects.toThrow('offline');
    await harness.runtime.signIn(operation('sign-in-b'));
    const generationB = harness.runtime.getState().generation;
    harness.events.length = 0;

    await expect(harness.runtime.handleLeaseRevoked({
      operationId: revokeOperation,
      revokedSessionId: sessionB,
      expectedGeneration: generationB,
    })).rejects.toThrow('account_authority_operation_id_reused');

    expect(harness.events).toEqual([]);
    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
  });

  test('stale revocation cannot close a newer account scope', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA), authenticated(uidB));
    await harness.runtime.signIn(operation('sign-in-a'));
    const oldGeneration: AccountAuthorityGeneration = accountAuthorityGeneration(
      harness.runtime.getState().generation.value,
    );
    await harness.runtime.signOut(operation('sign-out-a'));
    await harness.runtime.signIn(operation('sign-in-b'));
    harness.events.length = 0;

    await harness.runtime.handleLeaseRevoked({
      operationId: operation('late-revoke-a'),
      revokedSessionId: sessionA,
      expectedGeneration: oldGeneration,
    });

    expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountB });
    expect(harness.events).toEqual([]);
  });
});

describe('Account Authority runtime logging (S1)', () => {
  test('logs the driver transition, provider result, operation lifecycle and fail-closed reason', async () => {
    const harness = createHarness();
    harness.authentications.push(authenticated(uidA));
    await harness.runtime.signIn(operation('sign-in-log-a'));
    harness.authentications.push(Object.freeze({
      type: 'failed', error: new Error('account_authority_provider_error:boom'), identityPreserved: false,
    }));
    await expect(harness.runtime.signIn(operation('sign-in-log-b'))).rejects.toThrow();

    const events = recordedLogs.map((entry) => entry.event);
    expect(events).toEqual(expect.arrayContaining([
      'operation enqueued',
      'operation started',
      'sign_in provider_result',
      'state transition',
      'lease established',
      'operation done',
      'authentication fail_closed',
      'operation failed',
    ]));
    const transition = recordedLogs.find((entry) => entry.event === 'state transition'
      && entry.fields?.to === 'authenticated');
    expect(transition?.fields).toMatchObject({ from: 'authenticating', to: 'authenticated' });
    const failed = recordedLogs.find((entry) => entry.event === 'authentication fail_closed');
    // Текст «...:boom» не код — в лог уходит other, а не сырое сообщение.
    expect(failed?.fields).toMatchObject({ errorKind: 'Error', code: 'other' });
  });
});

describe('Account Authority runtime with a broken logger (S1, ревью L3)', () => {
  test('a throwing logger never breaks commitState or the operation queue', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const harness = createHarness({
        logger: {
          info: () => { throw new Error('log sink down'); },
          warn: () => { throw new Error('log sink down'); },
        },
      });
      harness.authentications.push(authenticated(uidA));
      await expect(harness.runtime.signIn(operation('sign-in-broken-log'))).resolves.toMatchObject({
        type: 'authenticated',
      });
      expect(harness.runtime.getState()).toMatchObject({ phase: 'authenticated', accountId: accountA });
      await expect(harness.runtime.signOut(operation('sign-out-broken-log'))).resolves.toMatchObject({
        type: 'signed_out',
      });
      expect(harness.runtime.getState().phase).toBe('signed_out');
      const lines = warn.mock.calls.map((call) => String(call[0]));
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every((line) => line.startsWith('[ACCOUNT-AUTHORITY] logger_failed'))).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });
});
