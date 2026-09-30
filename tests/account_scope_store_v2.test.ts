import {
  AccountScopeStoreError,
  createAccountScopeStore,
  type AccountScopeHandle,
  type AccountScopeTransaction,
  type ScopeJson,
  type ScopeEraseEvidence,
  type ScopeRecord,
  type ScopeStorageAdapter,
  type ScopeStorageConnection,
} from '../modules/account-session-v2/account_scope_store';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';
import type { AccountScope, SessionFence } from '../modules/account-session-v2/account_session';

const guest = (installationId: string): Extract<AccountScope, { kind: 'guest' }> => ({
  kind: 'guest',
  installationId,
  scopeKey: `guest:${installationId}`,
});

const account = (uid: string): Extract<AccountScope, { kind: 'account' }> => ({
  kind: 'account',
  uid,
  scopeKey: `account:${uid}`,
});

const fence = (scope: AccountScope, generation: number, nonce = `nonce-${generation}`): SessionFence => ({
  scopeKey: scope.scopeKey,
  uid: scope.kind === 'account' ? scope.uid : null,
  generation,
  nonce,
});

async function put(handle: AccountScopeHandle, key: string, value: ScopeJson): Promise<void> {
  await handle.withTransaction(async (transaction) => {
    await transaction.putRecord({ key, value });
  });
}

async function expectCode(
  operation: () => Promise<unknown>,
  code: AccountScopeStoreError['code'],
): Promise<AccountScopeStoreError> {
  try {
    await operation();
  } catch (error) {
    expect(error).toBeInstanceOf(AccountScopeStoreError);
    expect((error as AccountScopeStoreError).code).toBe(code);
    return error as AccountScopeStoreError;
  }
  throw new Error(`Expected ${code}`);
}

describe('Account Scope Store V2', () => {
  test('isolates guest, account A, and account B records', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const scopes = [guest('install-1'), account('uid-a'), account('uid-b')] as const;

    for (let index = 0; index < scopes.length; index += 1) {
      const scope = scopes[index];
      const currentFence = fence(scope, index + 1);
      const handle = await store.open(scope, currentFence);
      await put(handle, 'shared-key', { owner: scope.scopeKey });
      expect(await handle.readRecord('shared-key')).toEqual({
        key: 'shared-key',
        value: { owner: scope.scopeKey },
      });
      await store.close(currentFence);
    }

    expect(adapter.snapshot('guest:install-1')).toEqual([
      { key: 'shared-key', value: { owner: 'guest:install-1' } },
    ]);
    expect(adapter.snapshot('account:uid-a')).toEqual([
      { key: 'shared-key', value: { owner: 'account:uid-a' } },
    ]);
    expect(adapter.snapshot('account:uid-b')).toEqual([
      { key: 'shared-key', value: { owner: 'account:uid-b' } },
    ]);
  });

  test('requires close before any other fence opens', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const b = account('b');
    const first = fence(a, 1);
    await store.open(a, first);
    await expectCode(() => store.open(b, fence(b, 2)), 'account_scope_busy');
    await expectCode(() => store.open(a, fence(a, 2, 'new')), 'account_scope_busy');
    await store.close(first);
    await store.open(b, fence(b, 2));
  });

  test('reuses durable data but not runtime authority for repeated same-UID sessions', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const first = fence(a, 1, 'first');
    const firstOpening = store.open(a, first);
    expect(store.open(a, first)).toBe(firstOpening);
    const oldHandle = await firstOpening;
    expect(store.open(a, first)).toBe(firstOpening);
    await put(oldHandle, 'profile', { value: 1 });
    await store.close(first);
    const second = fence(a, 2, 'second');
    const newHandle = await store.open(a, second);
    expect(await newHandle.readRecord('profile')).toEqual({ key: 'profile', value: { value: 1 } });
    await expectCode(() => oldHandle.readRecord('profile'), 'account_scope_stale');
    await expectCode(() => store.open(a, first), 'account_scope_stale');
    expect(adapter.openCalls).toEqual(['account:a', 'account:a']);
  });

  test('revokes synchronously and makes double close idempotent', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const currentFence = fence(a, 1);
    const handle = await store.open(a, currentFence);
    const firstClose = store.close(currentFence);
    const duplicateClose = store.close(currentFence);
    expect(firstClose).toBe(duplicateClose);
    await expectCode(() => handle.readRecord('key'), 'account_scope_stale');
    await expect(firstClose).resolves.toMatchObject({ outcome: 'closed' });
    await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'already_closed' });
    expect(adapter.closeCalls).toEqual(['account:a']);
  });

  test('calls adapter revoke synchronously before physical close begins', async () => {
    const memory = new MemoryScopeStorageAdapter();
    const events: string[] = [];
    const adapter: ScopeStorageAdapter = {
      async open(scope) {
        const connection = await memory.open(scope);
        return {
          readRecord: (key) => connection.readRecord(key),
          withGuardedTransaction: (work, mayPublishNow) => (
            connection.withGuardedTransaction(work, mayPublishNow)
          ),
          revoke(): undefined {
            events.push('revoke');
            return connection.revoke();
          },
          async close(): Promise<void> {
            events.push('close');
            await connection.close();
          },
        };
      },
      eraseClosedAccountScope: (scope) => memory.eraseClosedAccountScope(scope),
    };
    const store = createAccountScopeStore(adapter);
    const scope = account('sync-revoke');
    const currentFence = fence(scope, 1);
    const handle = await store.open(scope, currentFence);

    const closing = store.close(currentFence);

    expect(events).toContain('revoke');
    await expectCode(() => handle.readRecord('key'), 'account_scope_stale');
    await closing;
    expect(events.indexOf('revoke')).toBeLessThan(events.indexOf('close'));
  });

  test('installs one close promise before a reentrant adapter revoke', async () => {
    const scope = account('reentrant-revoke');
    const currentFence = fence(scope, 1);
    let reentrantClose: Promise<unknown> | null = null;
    let physicalCloseCalls = 0;
    let store: ReturnType<typeof createAccountScopeStore>;
    const connection: ScopeStorageConnection = {
      async readRecord() { return null; },
      async withGuardedTransaction(work) {
        await work({
          async readRecord() { return null; },
          async putRecord() { /* no-op */ },
          async deleteRecord() { /* no-op */ },
        });
      },
      revoke(): undefined {
        reentrantClose = store.close(currentFence);
        return undefined;
      },
      async close(): Promise<void> {
        physicalCloseCalls += 1;
      },
    };
    const adapter: ScopeStorageAdapter = {
      async open() { return connection; },
      async eraseClosedAccountScope() { throw new Error('unused'); },
    };
    store = createAccountScopeStore(adapter);
    await store.open(scope, currentFence);

    const closing = store.close(currentFence);
    const duplicate = store.close(currentFence);

    expect(reentrantClose).toBe(closing);
    expect(duplicate).toBe(closing);
    await closing;
    expect(physicalCloseCalls).toBe(1);
  });

  test('the connection contract rejects an async revoke implementation', () => {
    const invalidConnection: ScopeStorageConnection = {
      async readRecord() { return null; },
      async withGuardedTransaction() { /* no-op */ },
      // @ts-expect-error revoke must complete synchronously and return exactly undefined.
      async revoke(): Promise<void> { /* invalid async implementation */ },
      async close() { /* no-op */ },
    };

    expect(typeof invalidConnection.revoke).toBe('function');
  });

  test.each([
    'rejected promise',
    'rejecting thenable',
    'throwing then getter',
    'primitive value',
  ] as const)(
    'quarantines a revoke that returns a %s without starting physical close',
    async (variant) => {
      const scope = account(`invalid-revoke-return-${variant.replaceAll(' ', '-')}`);
      const currentFence = fence(scope, 1);
      const secretError = new Error(`SECRET invalid revoke return ${variant}`);
      let invalidReturn = true;
      let physicalCloseCalls = 0;
      let thenObservations = 0;
      const rejectedPromise = Promise.reject(secretError);
      void rejectedPromise.catch(() => undefined);
      const rejectingThenable = {
        then(_resolve: (value: unknown) => void, reject: (reason: unknown) => void): void {
          thenObservations += 1;
          reject(secretError);
        },
      };
      const throwingThenGetter = Object.defineProperty({}, 'then', {
        get: () => {
          thenObservations += 1;
          throw secretError;
        },
      });
      const connection = {
        async readRecord() { return null; },
        async withGuardedTransaction() { /* no-op */ },
        revoke(): unknown {
          if (!invalidReturn) return undefined;
          if (variant === 'rejected promise') return rejectedPromise;
          if (variant === 'rejecting thenable') return rejectingThenable;
          if (variant === 'throwing then getter') return throwingThenGetter;
          return 1;
        },
        async close() { physicalCloseCalls += 1; },
      } as unknown as ScopeStorageConnection;
      const adapter: ScopeStorageAdapter = {
        async open() { return connection; },
        async eraseClosedAccountScope() { throw new Error('unused'); },
      };
      const store = createAccountScopeStore(adapter);
      await store.open(scope, currentFence);

      const closing = store.close(currentFence);
      const surfaced = await expectCode(() => closing, 'account_scope_close_failed');
      await Promise.resolve();

      expect(surfaced.message).toBe('account_scope_close_failed');
      expect((surfaced as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(surfaced.stack).not.toContain(secretError.message);
      expect(physicalCloseCalls).toBe(0);
      if (variant === 'rejecting thenable' || variant === 'throwing then getter') {
        expect(thenObservations).toBe(1);
      }
      await expectCode(() => store.open(scope, fence(scope, 2)), 'account_scope_busy');
      await expectCode(() => store.eraseClosedAccountScope(scope), 'account_scope_erase_active');

      invalidReturn = false;
      await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
      expect(physicalCloseCalls).toBe(1);
    },
  );

  test('keeps an unsettled unexpected revoke result quarantined until an exact retry', async () => {
    const scope = account('pending-revoke-result');
    const currentFence = fence(scope, 1);
    let settleUnexpected!: () => void;
    let invalidReturn = true;
    let revokeCalls = 0;
    let physicalCloseCalls = 0;
    let thenCalls = 0;
    const pendingThenable = {
      then(resolve: (value: unknown) => void): void {
        thenCalls += 1;
        settleUnexpected = () => resolve(undefined);
      },
    };
    const connection = {
      async readRecord() { return null; },
      async withGuardedTransaction() { /* no-op */ },
      revoke(): unknown {
        revokeCalls += 1;
        return invalidReturn ? pendingThenable : undefined;
      },
      async close() { physicalCloseCalls += 1; },
    } as unknown as ScopeStorageConnection;
    const adapter: ScopeStorageAdapter = {
      async open() { return connection; },
      async eraseClosedAccountScope() { throw new Error('unused'); },
    };
    const store = createAccountScopeStore(adapter);
    await store.open(scope, currentFence);

    const closing = store.close(currentFence);
    await expectCode(() => closing, 'account_scope_close_failed');
    await expectCode(() => store.close(currentFence), 'account_scope_close_failed');

    expect(thenCalls).toBe(1);
    expect(revokeCalls).toBe(1);
    expect(physicalCloseCalls).toBe(0);
    settleUnexpected();
    await Promise.resolve();
    await Promise.resolve();
    expect(physicalCloseCalls).toBe(0);

    invalidReturn = false;
    await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
    expect(revokeCalls).toBe(2);
    expect(physicalCloseCalls).toBe(1);
  });

  test('installs unexpected-result quarantine before a throwing reentrant then getter', async () => {
    const scope = account('reentrant-then-getter');
    const currentFence = fence(scope, 1);
    const secretError = new Error('SECRET reentrant then getter');
    let invalidReturn = true;
    let revokeCalls = 0;
    let physicalCloseCalls = 0;
    let reentrantClose: Promise<unknown> | null = null;
    let store: ReturnType<typeof createAccountScopeStore>;
    const unexpectedResult = Object.defineProperty({}, 'then', {
      get: () => {
        reentrantClose = store.close(currentFence);
        throw secretError;
      },
    });
    const connection = {
      async readRecord() { return null; },
      async withGuardedTransaction() { /* no-op */ },
      revoke(): unknown {
        revokeCalls += 1;
        return invalidReturn ? unexpectedResult : undefined;
      },
      async close() { physicalCloseCalls += 1; },
    } as unknown as ScopeStorageConnection;
    const adapter: ScopeStorageAdapter = {
      async open() { return connection; },
      async eraseClosedAccountScope() { throw new Error('unused'); },
    };
    store = createAccountScopeStore(adapter);
    await store.open(scope, currentFence);

    const closing = store.close(currentFence);
    const outerFailure = expectCode(() => closing, 'account_scope_close_failed');
    const reentrantFailure = expectCode(
      () => reentrantClose as Promise<unknown>,
      'account_scope_close_failed',
    );
    const [outerError, reentrantError] = await Promise.all([outerFailure, reentrantFailure]);

    expect(reentrantClose).toBe(closing);
    expect(outerError.message).toBe('account_scope_close_failed');
    expect(reentrantError.message).toBe('account_scope_close_failed');
    expect(outerError.stack).not.toContain(secretError.message);
    expect(reentrantError.stack).not.toContain(secretError.message);
    expect(revokeCalls).toBe(1);
    expect(physicalCloseCalls).toBe(0);
    await Promise.resolve();
    await Promise.resolve();

    invalidReturn = false;
    await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
    expect(revokeCalls).toBe(2);
    expect(physicalCloseCalls).toBe(1);
  });

  test.each(['returns undefined', 'throws'] as const)(
    'owns observation when an unexpected native Promise has a then override that %s',
    async (variant) => {
      const scope = account(`overridden-promise-then-${variant.replaceAll(' ', '-')}`);
      const currentFence = fence(scope, 1);
      const secretError = new Error(`SECRET overridden Promise then ${variant}`);
      const returnedPromise = Promise.reject(secretError);
      void Promise.prototype.catch.call(returnedPromise, () => undefined);
      Object.defineProperty(returnedPromise, 'then', {
        configurable: true,
        value: variant === 'returns undefined'
          ? () => undefined
          : () => { throw secretError; },
      });
      let invalidReturn = true;
      let revokeCalls = 0;
      let physicalCloseCalls = 0;
      const connection = {
        async readRecord() { return null; },
        async withGuardedTransaction() { /* no-op */ },
        revoke(): unknown {
          revokeCalls += 1;
          return invalidReturn ? returnedPromise : undefined;
        },
        async close() { physicalCloseCalls += 1; },
      } as unknown as ScopeStorageConnection;
      const adapter: ScopeStorageAdapter = {
        async open() { return connection; },
        async eraseClosedAccountScope() { throw new Error('unused'); },
      };
      const store = createAccountScopeStore(adapter);
      await store.open(scope, currentFence);

      let closing: Promise<unknown> | null = null;
      expect(() => { closing = store.close(currentFence); }).not.toThrow();
      const surfaced = await expectCode(
        () => closing as Promise<unknown>,
        'account_scope_close_failed',
      );

      expect(surfaced.message).toBe('account_scope_close_failed');
      expect(surfaced.stack).not.toContain(secretError.message);
      expect(revokeCalls).toBe(1);
      expect(physicalCloseCalls).toBe(0);
      await Promise.resolve();
      await Promise.resolve();

      invalidReturn = false;
      await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
      expect(revokeCalls).toBe(2);
      expect(physicalCloseCalls).toBe(1);
    },
  );

  test('revokes a pending open and cleans a late successful connection', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const hold = adapter.holdNext('open');
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const currentFence = fence(a, 1);
    const opening = store.open(a, currentFence);
    await hold.entered;
    const closing = store.close(currentFence);
    hold.release();
    await expectCode(() => opening, 'account_scope_stale');
    await expect(closing).resolves.toMatchObject({ outcome: 'closed' });
    expect(adapter.closeCalls).toEqual(['account:a']);
  });

  test('blocks open while close is pending', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const b = account('b');
    const currentFence = fence(a, 1);
    await store.open(a, currentFence);
    const hold = adapter.holdNext('close');
    const closing = store.close(currentFence);
    await hold.entered;
    await expectCode(() => store.open(b, fence(b, 2)), 'account_scope_busy');
    hold.release();
    await closing;
    await store.open(b, fence(b, 2));
  });

  test('discards a read result that arrives after close', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const currentFence = fence(a, 1);
    const handle = await store.open(a, currentFence);
    await put(handle, 'key', 'value');
    const hold = adapter.holdNext('read');
    const reading = handle.readRecord('key');
    await hold.entered;
    const closing = store.close(currentFence);
    hold.release();
    await expectCode(() => reading, 'account_scope_stale');
    await closing;
  });

  test('prevents late transaction publication at the exact memory boundary', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const currentFence = fence(a, 1);
    const handle = await store.open(a, currentFence);
    const hold = adapter.holdNext('before_publish');
    const writing = put(handle, 'late', true);
    await hold.entered;
    const closing = store.close(currentFence);
    hold.release();
    await expectCode(() => writing, 'account_scope_stale');
    await closing;
    expect(adapter.snapshot(a.scopeKey)).toEqual([]);
  });

  test('memory revoke is idempotent, rejects new work, and preserves isolated durable data', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const a = account('memory-revoke-a');
    const b = account('memory-revoke-b');
    const connection = await adapter.open(a);
    const otherConnection = await adapter.open(b);
    await connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'outbox/op-1', value: { pending: true } });
    }, () => true);
    await otherConnection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'other', value: 'untouched' });
    }, () => true);

    connection.revoke();
    connection.revoke();

    await expect(connection.readRecord('outbox/op-1')).rejects.toThrow('connection_revoked');
    let callbackCalled = false;
    await expect(connection.withGuardedTransaction(async () => {
      callbackCalled = true;
    }, () => true)).rejects.toThrow('connection_revoked');
    expect(callbackCalled).toBe(false);
    expect(adapter.snapshot(a.scopeKey)).toEqual([
      { key: 'outbox/op-1', value: { pending: true } },
    ]);
    expect(await otherConnection.readRecord('other')).toEqual({
      key: 'other',
      value: 'untouched',
    });
    await connection.close();

    const reopenedA = await adapter.open(a);
    expect(await reopenedA.readRecord('outbox/op-1')).toEqual({
      key: 'outbox/op-1',
      value: { pending: true },
    });
    expect(await otherConnection.readRecord('outbox/op-1')).toBeNull();
  });

  test('memory revoke blocks held publication even when the publication guard returns true', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const scope = account('memory-held-revoke');
    const connection = await adapter.open(scope);
    const hold = adapter.holdNext('before_publish');
    const writing = connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'late', value: true });
    }, () => true);
    await hold.entered;
    const observed = writing.then(
      () => null,
      (error: unknown) => error,
    );

    connection.revoke();
    hold.release();

    const surfaced = await observed;
    expect(surfaced).toBeInstanceOf(Error);
    expect((surfaced as Error).message).toBe('connection_revoked');
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('memory queued transaction rechecks revoke before invoking its callback', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const scope = account('memory-queued-revoke');
    const connection = await adapter.open(scope);
    const hold = adapter.holdNext('before_publish');
    const first = connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'first', value: 1 });
    }, () => true);
    await hold.entered;
    let queuedCallbackCalled = false;
    const queued = connection.withGuardedTransaction(async () => {
      queuedCallbackCalled = true;
    }, () => true);
    const firstObserved = first.then(
      () => null,
      (error: unknown) => error,
    );
    const queuedObserved = queued.then(
      () => null,
      (error: unknown) => error,
    );

    connection.revoke();
    hold.release();

    const [firstError, queuedError] = await Promise.all([firstObserved, queuedObserved]);
    expect(firstError).toBeInstanceOf(Error);
    expect((firstError as Error).message).toBe('connection_revoked');
    expect(queuedError).toBeInstanceOf(Error);
    expect((queuedError as Error).message).toBe('connection_revoked');
    expect(queuedCallbackCalled).toBe(false);
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('memory publication guard cannot revoke and still publish by returning true', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const scope = account('memory-guard-revokes');
    const connection = await adapter.open(scope);
    let guardCalls = 0;
    const writing = connection.withGuardedTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'late', value: true });
    }, () => {
      guardCalls += 1;
      connection.revoke();
      return true;
    });

    const surfaced = await writing.then(
      () => null,
      (error: unknown) => error,
    );

    expect(guardCalls).toBe(1);
    expect(surfaced).toBeInstanceOf(Error);
    expect((surfaced as Error).message).toBe('connection_revoked');
    expect(adapter.snapshot(scope.scopeKey)).toEqual([]);
  });

  test('invalidates an escaped transaction handle', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const handle = await store.open(a, fence(a, 1));
    let escaped: AccountScopeTransaction | null = null;
    await handle.withTransaction(async (transaction) => {
      escaped = transaction;
    });
    const transaction = escaped as unknown as AccountScopeTransaction;
    await expectCode(() => transaction.readRecord('key'), 'account_scope_transaction_closed');
    await expectCode(() => transaction.putRecord({ key: 'key', value: 1 }), 'account_scope_transaction_closed');
    await expectCode(() => transaction.deleteRecord('key'), 'account_scope_transaction_closed');
  });

  test('validates snapshots before effects and rejects mutable aliases', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const invalid = { kind: 'account', uid: ' a', scopeKey: 'account: a' } as AccountScope;
    await expectCode(() => store.open(invalid, fence(account('a'), 1)), 'account_scope_invalid_input');
    expect(adapter.openCalls).toEqual([]);

    const mutableScope = account('a') as { kind: 'account'; uid: string; scopeKey: `account:${string}` };
    const mutableFence = fence(mutableScope, 1) as { scopeKey: AccountScope['scopeKey']; uid: string | null; generation: number; nonce: string };
    const hold = adapter.holdNext('open');
    const opening = store.open(mutableScope, mutableFence);
    mutableScope.uid = 'b';
    mutableScope.scopeKey = 'account:b';
    mutableFence.scopeKey = 'account:b';
    mutableFence.uid = 'b';
    await hold.entered;
    hold.release();
    const handle = await opening;
    expect(handle.scope.scopeKey).toBe('account:a');

    const value = { nested: [1, { ok: true }] };
    const publishHold = adapter.holdNext('before_publish');
    const writing = put(handle, 'object', value);
    await publishHold.entered;
    value.nested[1] = { ok: false };
    publishHold.release();
    await writing;
    const record = await handle.readRecord('object');
    expect(record).toEqual({ key: 'object', value: { nested: [1, { ok: true }] } });
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen((record?.value as { nested: readonly ScopeJson[] }).nested)).toBe(true);

    const invalidValues: unknown[] = [undefined, Number.NaN, Infinity, () => undefined, Symbol('x')];
    for (const invalidValue of invalidValues) {
      await expectCode(
        () => handle.withTransaction((transaction) => transaction.putRecord({ key: 'bad', value: invalidValue as ScopeJson })),
        'account_scope_invalid_input',
      );
    }
    const sparse: ScopeJson[] = [];
    sparse[1] = 1;
    await expectCode(
      () => handle.withTransaction((transaction) => transaction.putRecord({ key: 'bad', value: sparse })),
      'account_scope_invalid_input',
    );
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    await expectCode(
      () => handle.withTransaction((transaction) => transaction.putRecord({ key: 'bad', value: cyclic as ScopeJson })),
      'account_scope_invalid_input',
    );
    const accessor = Object.defineProperty({}, 'secret', { enumerable: true, get: () => 1 });
    await expectCode(
      () => handle.withTransaction((transaction) => transaction.putRecord({ key: 'bad', value: accessor as ScopeJson })),
      'account_scope_invalid_input',
    );
    await expectCode(
      () => handle.withTransaction((transaction) => transaction.putRecord({ key: 'bad', value: new Date() as unknown as ScopeJson })),
      'account_scope_invalid_input',
    );
  });

  test('quarantines open failure without erase or identity rotation', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const first = fence(a, 1);
    const seeded = await store.open(a, first);
    await put(seeded, 'seed', 7);
    await store.close(first);
    const retryFence = fence(a, 2);
    adapter.failNext('open', a.scopeKey, 'secret-key-error');
    await expectCode(() => store.open(a, retryFence), 'account_scope_open_failed');
    expect(adapter.eraseCalls).toEqual([]);
    const retried = await store.open(a, retryFence);
    expect(await retried.readRecord('seed')).toEqual({ key: 'seed', value: 7 });
    expect(adapter.openCalls).toEqual(['account:a', 'account:a', 'account:a']);
  });

  test('keeps outbox records on logout-style close', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const first = fence(a, 1);
    const handle = await store.open(a, first);
    await put(handle, 'outbox/op-1', { pending: true });
    await store.close(first);
    const reopened = await store.open(a, fence(a, 2));
    expect(await reopened.readRecord('outbox/op-1')).toEqual({
      key: 'outbox/op-1',
      value: { pending: true },
    });
  });

  test('erases only the exact closed account scope with honest proof', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const scopes = [guest('g'), account('a'), account('b')] as const;
    for (let index = 0; index < scopes.length; index += 1) {
      const currentFence = fence(scopes[index], index + 1);
      const handle = await store.open(scopes[index], currentFence);
      await put(handle, 'key', scopes[index].scopeKey);
      await store.close(currentFence);
    }
    await expect(store.eraseClosedAccountScope(account('a'))).resolves.toEqual({
      scopeKey: 'account:a',
      outcome: 'erased',
      evidenceKind: 'memory_reference_only',
      erasedRecordCount: 1,
      manifestVersion: null,
    });
    expect(adapter.snapshot('account:a')).toEqual([]);
    expect(adapter.snapshot('guest:g')).toHaveLength(1);
    expect(adapter.snapshot('account:b')).toHaveLength(1);
  });

  test('rejects active-scope erase and makes absent erase retry idempotent', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const currentFence = fence(a, 1);
    const handle = await store.open(a, currentFence);
    await put(handle, 'key', 1);
    await expectCode(() => store.eraseClosedAccountScope(a), 'account_scope_erase_active');
    await store.close(currentFence);
    await expect(store.eraseClosedAccountScope(a)).resolves.toMatchObject({ outcome: 'erased' });
    await expect(store.eraseClosedAccountScope(a)).resolves.toMatchObject({ outcome: 'already_absent' });
  });

  test('copies validates and freezes exact erase proof', async () => {
    const a = account('a');
    const proof = {
      scopeKey: 'account:a' as const,
      outcome: 'erased' as const,
      evidenceKind: 'memory_reference_only' as const,
      erasedRecordCount: 2,
      manifestVersion: null,
    };
    const adapter: ScopeStorageAdapter = {
      async open() { throw new Error('unused'); },
      async eraseClosedAccountScope() { return proof; },
    };
    const store = createAccountScopeStore(adapter);
    const returned = await store.eraseClosedAccountScope(a);
    proof.erasedRecordCount = 99;
    expect(returned.erasedRecordCount).toBe(2);
    expect(Object.isFrozen(returned)).toBe(true);

    const wrong: ScopeStorageAdapter = {
      async open() { throw new Error('unused'); },
      async eraseClosedAccountScope() { return { ...proof, scopeKey: 'account:b' }; },
    };
    await expectCode(() => createAccountScopeStore(wrong).eraseClosedAccountScope(a), 'account_scope_erase_proof_invalid');
    const malformed: ScopeStorageAdapter = {
      async open() { throw new Error('unused'); },
      async eraseClosedAccountScope() { return { ...proof, erasedRecordCount: -1 }; },
    };
    await expectCode(() => createAccountScopeStore(malformed).eraseClosedAccountScope(a), 'account_scope_erase_proof_invalid');
  });

  test.each(['throwing getter', 'throwing proxy trap'] as const)(
    'sanitizes unreadable erase proof from a %s and releases its reservation',
    async (variant) => {
      const secretError = new Error(`SECRET C:/private/key/${variant}`);
      const unreadable = variant === 'throwing getter'
        ? Object.defineProperty({}, 'scopeKey', {
          enumerable: true,
          get: () => { throw secretError; },
        })
        : new Proxy({}, {
          get: (_target, property) => {
            if (property === 'then') return undefined;
            throw secretError;
          },
        });
      let eraseCallCount = 0;
      const adapter: ScopeStorageAdapter = {
        async open() { throw new Error('unused'); },
        async eraseClosedAccountScope(scope) {
          eraseCallCount += 1;
          if (eraseCallCount === 1) return unreadable as ScopeEraseEvidence;
          return {
            scopeKey: scope.scopeKey,
            outcome: 'already_absent',
            evidenceKind: 'memory_reference_only',
            erasedRecordCount: 0,
            manifestVersion: null,
          };
        },
      };
      const scope = account(`erase-proof-${variant.replaceAll(' ', '-')}`);
      const store = createAccountScopeStore(adapter);

      const surfaced = await expectCode(
        () => store.eraseClosedAccountScope(scope),
        'account_scope_erase_proof_invalid',
      );

      expect(surfaced).not.toBe(secretError);
      expect(surfaced.message).toBe('account_scope_erase_proof_invalid');
      expect((surfaced as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(surfaced.stack).not.toContain(secretError.message);
      await expect(store.eraseClosedAccountScope(scope)).resolves.toMatchObject({
        scopeKey: scope.scopeKey,
        outcome: 'already_absent',
      });
      expect(eraseCallCount).toBe(2);
    },
  );

  test('keeps revoked after close failure and retries close safely', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const currentFence = fence(a, 1);
    const handle = await store.open(a, currentFence);
    adapter.failNext('close', a.scopeKey, 'secret-close');
    await expectCode(() => store.close(currentFence), 'account_scope_close_failed');
    await expectCode(() => handle.readRecord('key'), 'account_scope_stale');
    await expectCode(() => store.open(a, currentFence), 'account_scope_busy');
    await expectCode(() => store.eraseClosedAccountScope(a), 'account_scope_erase_active');
    await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
    expect(adapter.closeCalls).toEqual(['account:a', 'account:a']);
  });

  test('quarantines a revoke failure and retries the same connection without losing outbox data', async () => {
    const memory = new MemoryScopeStorageAdapter();
    const secretError = new Error('SECRET C:/private/native/revoke');
    let revokeCalls = 0;
    let physicalCloseCalls = 0;
    let openedConnections = 0;
    const adapter: ScopeStorageAdapter = {
      async open(scope) {
        openedConnections += 1;
        const connection = await memory.open(scope);
        return {
          readRecord: (key) => connection.readRecord(key),
          withGuardedTransaction: (work, mayPublishNow) => (
            connection.withGuardedTransaction(work, mayPublishNow)
          ),
          revoke(): undefined {
            revokeCalls += 1;
            if (revokeCalls === 1) throw secretError;
            return connection.revoke();
          },
          async close(): Promise<void> {
            physicalCloseCalls += 1;
            await connection.close();
          },
        };
      },
      eraseClosedAccountScope: (scope) => memory.eraseClosedAccountScope(scope),
    };
    const store = createAccountScopeStore(adapter);
    const scope = account('revoke-retry');
    const firstFence = fence(scope, 1);
    const handle = await store.open(scope, firstFence);
    await put(handle, 'outbox/op-1', { pending: true });

    const closing = store.close(firstFence);
    const firstFailure = expectCode(() => closing, 'account_scope_close_failed');
    const surfaced = await firstFailure;

    expect(surfaced).not.toBe(secretError);
    expect(surfaced.message).toBe('account_scope_close_failed');
    expect((surfaced as Error & { cause?: unknown }).cause).toBeUndefined();
    expect(surfaced.stack).not.toContain(secretError.message);
    expect(physicalCloseCalls).toBe(0);
    await expectCode(() => handle.readRecord('outbox/op-1'), 'account_scope_stale');
    await expectCode(() => store.open(scope, fence(scope, 2)), 'account_scope_busy');
    await expectCode(() => store.eraseClosedAccountScope(scope), 'account_scope_erase_active');

    await expect(store.close(firstFence)).resolves.toMatchObject({ outcome: 'closed' });
    expect(openedConnections).toBe(1);
    expect(revokeCalls).toBe(2);
    expect(physicalCloseCalls).toBe(1);
    const reopened = await store.open(scope, fence(scope, 2));
    expect(await reopened.readRecord('outbox/op-1')).toEqual({
      key: 'outbox/op-1',
      value: { pending: true },
    });
  });

  test.each(['missing method', 'throwing getter'] as const)(
    'sanitizes a %s revoke failure and permits an exact retry',
    async (variant) => {
      const scope = account(`bad-revoke-${variant.replaceAll(' ', '-')}`);
      const currentFence = fence(scope, 1);
      const secretError = new Error(`SECRET revoke ${variant}`);
      let physicalCloseCalls = 0;
      let failing = true;
      const connectionTarget = {
        async readRecord() { return null; },
        async withGuardedTransaction(work: (transaction: AccountScopeTransaction) => Promise<void>) {
          await work({
            async readRecord() { return null; },
            async putRecord() { /* no-op */ },
            async deleteRecord() { /* no-op */ },
          });
        },
        async close() { physicalCloseCalls += 1; },
      } as {
        readRecord(): Promise<ScopeRecord | null>;
        withGuardedTransaction(work: (transaction: AccountScopeTransaction) => Promise<void>): Promise<void>;
        close(): Promise<void>;
        revoke?: () => undefined;
      };
      if (variant === 'throwing getter') {
        Object.defineProperty(connectionTarget, 'revoke', {
          configurable: true,
          get: () => {
            if (failing) throw secretError;
            return () => undefined;
          },
        });
      }
      const adapter: ScopeStorageAdapter = {
        async open() { return connectionTarget as ScopeStorageConnection; },
        async eraseClosedAccountScope() { throw new Error('unused'); },
      };
      const store = createAccountScopeStore(adapter);
      await store.open(scope, currentFence);

      const closing = store.close(currentFence);
      const surfaced = await expectCode(() => closing, 'account_scope_close_failed');

      expect(surfaced.message).toBe('account_scope_close_failed');
      expect((surfaced as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(surfaced.stack).not.toContain(secretError.message);
      expect(physicalCloseCalls).toBe(0);
      failing = false;
      if (variant === 'missing method') connectionTarget.revoke = () => undefined;
      await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
      expect(physicalCloseCalls).toBe(1);
    },
  );

  test('lets close win when a pending open later rejects', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const hold = adapter.holdNext('open');
    const a = account('a');
    adapter.failNext('open', a.scopeKey, 'late-open-secret');
    const store = createAccountScopeStore(adapter);
    const currentFence = fence(a, 1);
    const opening = store.open(a, currentFence);
    await hold.entered;
    const closing = store.close(currentFence);
    hold.release();
    await expectCode(() => opening, 'account_scope_stale');
    await expect(closing).resolves.toMatchObject({ outcome: 'closed' });
    expect(adapter.closeCalls).toEqual([]);
  });

  test('retains a late connection when pending-open cleanup close fails', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const hold = adapter.holdNext('open');
    const a = account('a');
    adapter.failNext('close', a.scopeKey, 'cleanup-secret');
    const store = createAccountScopeStore(adapter);
    const currentFence = fence(a, 1);
    const opening = store.open(a, currentFence);
    await hold.entered;
    const closing = store.close(currentFence);
    hold.release();
    await expectCode(() => opening, 'account_scope_stale');
    await expectCode(() => closing, 'account_scope_close_failed');
    await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
    expect(adapter.closeCalls).toEqual(['account:a', 'account:a']);
  });

  test('retains a late pending-open connection when revoke fails and retries in order', async () => {
    const memory = new MemoryScopeStorageAdapter();
    const hold = memory.holdNext('open');
    const events: string[] = [];
    let revokeCalls = 0;
    const adapter: ScopeStorageAdapter = {
      async open(scope) {
        const connection = await memory.open(scope);
        return {
          readRecord: (key) => connection.readRecord(key),
          withGuardedTransaction: (work, mayPublishNow) => (
            connection.withGuardedTransaction(work, mayPublishNow)
          ),
          revoke(): undefined {
            revokeCalls += 1;
            events.push('revoke');
            if (revokeCalls === 1) throw new Error('late-revoke-secret');
            return connection.revoke();
          },
          async close(): Promise<void> {
            events.push('close');
            await connection.close();
          },
        };
      },
      eraseClosedAccountScope: (scope) => memory.eraseClosedAccountScope(scope),
    };
    const store = createAccountScopeStore(adapter);
    const scope = account('late-revoke');
    const currentFence = fence(scope, 1);
    const opening = store.open(scope, currentFence);
    await hold.entered;

    const closing = store.close(currentFence);
    const openingFailure = expectCode(() => opening, 'account_scope_stale');
    const closingFailure = expectCode(() => closing, 'account_scope_close_failed');
    hold.release();
    await openingFailure;
    await closingFailure;

    expect(events).toEqual(['revoke']);
    await expectCode(() => store.open(scope, fence(scope, 2)), 'account_scope_busy');
    await expect(store.close(currentFence)).resolves.toMatchObject({ outcome: 'closed' });
    expect(events).toEqual(['revoke', 'revoke', 'close']);
    expect(memory.openCalls).toEqual([scope.scopeKey]);
  });

  test('repeats idempotent revoke when physical close fails and preserves data for retry', async () => {
    const memory = new MemoryScopeStorageAdapter();
    const scope = account('physical-close-retry');
    memory.failNext('close', scope.scopeKey, 'close-secret');
    let revokeCalls = 0;
    const adapter: ScopeStorageAdapter = {
      async open(currentScope) {
        const connection = await memory.open(currentScope);
        return {
          readRecord: (key) => connection.readRecord(key),
          withGuardedTransaction: (work, mayPublishNow) => (
            connection.withGuardedTransaction(work, mayPublishNow)
          ),
          revoke(): undefined {
            revokeCalls += 1;
            return connection.revoke();
          },
          close: () => connection.close(),
        };
      },
      eraseClosedAccountScope: (currentScope) => memory.eraseClosedAccountScope(currentScope),
    };
    const store = createAccountScopeStore(adapter);
    const firstFence = fence(scope, 1);
    const handle = await store.open(scope, firstFence);
    await put(handle, 'outbox/op-1', { pending: true });

    const closing = store.close(firstFence);
    await expectCode(() => closing, 'account_scope_close_failed');
    await expectCode(() => handle.readRecord('outbox/op-1'), 'account_scope_stale');
    await expect(store.close(firstFence)).resolves.toMatchObject({ outcome: 'closed' });

    expect(revokeCalls).toBe(2);
    expect(memory.closeCalls).toEqual([scope.scopeKey, scope.scopeKey]);
    const reopened = await store.open(scope, fence(scope, 2));
    expect(await reopened.readRecord('outbox/op-1')).toMatchObject({
      value: { pending: true },
    });
  });

  test('serializes same-scope transactions before snapshot', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const handle = await store.open(a, fence(a, 1));
    const hold = adapter.holdNext('before_publish');
    const first = put(handle, 'first', 1);
    await hold.entered;
    const second = put(handle, 'second', 2);
    hold.release();
    await Promise.all([first, second]);
    expect(adapter.snapshot(a.scopeKey)).toEqual([
      { key: 'first', value: 1 },
      { key: 'second', value: 2 },
    ]);
  });

  test('releases the same-scope transaction queue after failure', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const handle = await store.open(a, fence(a, 1));
    const rejection = new Error('caller rejection');
    const first = handle.withTransaction(async (transaction) => {
      await transaction.putRecord({ key: 'discarded', value: 1 });
      throw rejection;
    });
    const second = put(handle, 'kept', 2);
    await expect(first).rejects.toBe(rejection);
    await second;
    expect(adapter.snapshot(a.scopeKey)).toEqual([{ key: 'kept', value: 2 }]);
  });

  test('reserves erase synchronously and only for its exact scope', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const b = account('b');
    const aFence = fence(a, 1);
    const aHandle = await store.open(a, aFence);
    await put(aHandle, 'a', 1);
    await store.close(aFence);
    const hold = adapter.holdNext('erase');
    const erasing = store.eraseClosedAccountScope(a);
    const duplicate = store.eraseClosedAccountScope(a);
    expect(erasing).toBe(duplicate);
    await hold.entered;
    await expectCode(() => store.open(a, fence(a, 2)), 'account_scope_busy');
    const bFence = fence(b, 2);
    const bHandle = await store.open(b, bFence);
    await put(bHandle, 'b', 2);
    expect(await bHandle.readRecord('b')).toMatchObject({ value: 2 });
    hold.release();
    await erasing;
    await store.close(bFence);

    adapter.failNext('erase', a.scopeKey, 'erase-secret');
    await expectCode(() => store.eraseClosedAccountScope(a), 'account_scope_erase_failed');
    await store.open(a, fence(a, 3));
  });

  test('bounds fence history and enforces generation monotonicity', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const b = account('b');
    const first = fence(a, 5, 'first');
    await store.open(a, first);
    await expectCode(() => store.open(b, fence(b, 4)), 'account_scope_stale');
    await expectCode(() => store.open(b, fence(b, 5, 'conflict')), 'account_scope_stale');
    await store.close(first);
    await expect(store.close(first)).resolves.toMatchObject({ outcome: 'already_closed' });
    const failed = fence(b, 6, 'retryable');
    adapter.failNext('open', b.scopeKey, 'failed');
    await expectCode(() => store.open(b, failed), 'account_scope_open_failed');
    await store.open(b, failed);
    await expectCode(() => store.close(first), 'account_scope_stale');
  });

  test('lets revocation beat late adapter read and transaction errors', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const first = fence(a, 1);
    const handle = await store.open(a, first);
    const readHold = adapter.holdNext('read');
    adapter.failNext('read', a.scopeKey, 'read-secret');
    const reading = handle.readRecord('key');
    await readHold.entered;
    const closing = store.close(first);
    readHold.release();
    await expectCode(() => reading, 'account_scope_stale');
    await closing;

    const second = fence(a, 2);
    const reopened = await store.open(a, second);
    const txHold = adapter.holdNext('before_publish');
    adapter.failNext('transaction', a.scopeKey, 'tx-secret');
    const writing = put(reopened, 'key', 1);
    await txHold.entered;
    const closeAgain = store.close(second);
    txHold.release();
    await expectCode(() => writing, 'account_scope_stale');
    await closeAgain;
  });

  test('sanitizes current adapter errors and preserves callback rejection', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const a = account('a');
    const handle = await store.open(a, fence(a, 1));
    adapter.failNext('read', a.scopeKey, 'SECRET /private/path');
    const readError = await expectCode(() => handle.readRecord('key'), 'account_scope_read_failed');
    expect(readError.message).toBe('account_scope_read_failed');
    adapter.failNext('transaction', a.scopeKey, 'SECRET transaction');
    const transactionError = await expectCode(() => put(handle, 'key', 1), 'account_scope_transaction_failed');
    expect(transactionError.message).toBe('account_scope_transaction_failed');
    const rejection = Object.freeze({ exact: 'caller-error' });
    await expect(handle.withTransaction(async () => { throw rejection; })).rejects.toBe(rejection);
  });

  test.each(['readRecord', 'putRecord', 'deleteRecord'] as const)(
    'sanitizes adapter-origin %s transaction method errors',
    async (method) => {
      const secretError = new Error(`SECRET /private/key/path/${method}`);
      const adapter: ScopeStorageAdapter = {
        async open() {
          return {
            async readRecord() { return null; },
            async withGuardedTransaction(work) {
              const transaction: AccountScopeTransaction = {
                async readRecord() { throw secretError; },
                async putRecord() { throw secretError; },
                async deleteRecord() { throw secretError; },
              };
              await work(transaction);
            },
            revoke(): undefined { return undefined; },
            async close() { /* no-op test connection */ },
          };
        },
        async eraseClosedAccountScope() { throw new Error('unused'); },
      };
      const scope = account(`adapter-${method}`);
      const handle = await createAccountScopeStore(adapter).open(scope, fence(scope, 1));

      const surfaced = await expectCode(
        () => handle.withTransaction(async (transaction) => {
          if (method === 'readRecord') await transaction.readRecord('key');
          if (method === 'putRecord') await transaction.putRecord({ key: 'key', value: 1 });
          if (method === 'deleteRecord') await transaction.deleteRecord('key');
        }),
        'account_scope_transaction_failed',
      );

      expect(surfaced).not.toBe(secretError);
      expect(surfaced.message).toBe('account_scope_transaction_failed');
      expect((surfaced as Error & { cause?: unknown }).cause).toBeUndefined();
      expect(surfaced.stack).not.toContain(secretError.message);
    },
  );

  test.each(['readRecord', 'putRecord', 'deleteRecord'] as const)(
    'latches caught adapter-origin %s failures and prevents partial publication',
    async (method) => {
      const backendError = new Error(`SECRET backend ${method}`);
      const replacementError = Object.freeze({ replacement: method });
      let guardReached = false;
      let published = false;
      let caughtName: string | null = null;
      let caughtCode: string | null = null;
      let caughtMessage: string | null = null;
      let caughtCause: unknown = 'unset';
      const adapter: ScopeStorageAdapter = {
        async open() {
          return {
            async readRecord() { return null; },
            async withGuardedTransaction(work, mayPublishNow) {
              const staged = new Map<string, ScopeJson>();
              const transaction: AccountScopeTransaction = {
                async readRecord(key) {
                  if (method === 'readRecord' && key === 'fail') throw backendError;
                  const value = staged.get(key);
                  return value === undefined ? null : { key, value };
                },
                async putRecord(record) {
                  if (method === 'putRecord' && record.key === 'fail') throw backendError;
                  staged.set(record.key, record.value);
                },
                async deleteRecord(key) {
                  if (method === 'deleteRecord' && key === 'fail') throw backendError;
                  staged.delete(key);
                },
              };
              await work(transaction);
              guardReached = true;
              if (mayPublishNow()) published = true;
            },
            revoke(): undefined { return undefined; },
            async close() { /* no-op test connection */ },
          };
        },
        async eraseClosedAccountScope() { throw new Error('unused'); },
      };
      const scope = account(`latched-${method}`);
      const handle = await createAccountScopeStore(adapter).open(scope, fence(scope, 1));

      const surfaced = await expectCode(
        () => handle.withTransaction(async (transaction) => {
          await transaction.putRecord({ key: 'staged-before-failure', value: true });
          try {
            if (method === 'readRecord') await transaction.readRecord('fail');
            if (method === 'putRecord') await transaction.putRecord({ key: 'fail', value: 1 });
            if (method === 'deleteRecord') await transaction.deleteRecord('fail');
          } catch (error) {
            const sanitized = error as AccountScopeStoreError & { cause?: unknown };
            caughtName = sanitized.name;
            caughtCode = sanitized.code;
            caughtMessage = sanitized.message;
            caughtCause = sanitized.cause;
          }
          if (method === 'deleteRecord') throw replacementError;
        }),
        'account_scope_transaction_failed',
      );

      expect(caughtName).toBe('AccountScopeStoreError');
      expect(caughtCode).toBe('account_scope_transaction_failed');
      expect(caughtMessage).toBe('account_scope_transaction_failed');
      expect(caughtCause).toBeUndefined();
      expect(surfaced).not.toBe(backendError);
      expect(surfaced).not.toBe(replacementError);
      expect(guardReached).toBe(false);
      expect(published).toBe(false);
    },
  );

  test('preserves magic JSON own keys without prototype mutation', async () => {
    const adapter = new MemoryScopeStorageAdapter();
    const store = createAccountScopeStore(adapter);
    const scope = account('magic-json');
    const handle = await store.open(scope, fence(scope, 1));
    const value = JSON.parse(
      '{"__proto__":{"polluted":"no"},"constructor":{"prototype":{"evil":true}},"prototype":{"safe":1},"nested":{"__proto__":{"deep":2}}}',
    ) as ScopeJson;
    const expectedJson = JSON.stringify(value);

    await put(handle, 'magic', value);
    const returned = await handle.readRecord('magic');
    const snapshot = adapter.snapshot(scope.scopeKey);

    expect(JSON.stringify(returned?.value)).toBe(expectedJson);
    expect(JSON.stringify(snapshot[0]?.value)).toBe(expectedJson);
    expect(Object.prototype.hasOwnProperty.call(returned?.value, '__proto__')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call((returned?.value as { nested: ScopeJson }).nested, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(returned?.value)).toBe(Object.prototype);
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect((Object.prototype as { polluted?: unknown }).polluted).toBeUndefined();
    expect((Object.prototype as { evil?: unknown }).evil).toBeUndefined();
  });
});
