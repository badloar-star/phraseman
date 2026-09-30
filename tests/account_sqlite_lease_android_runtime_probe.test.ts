import { runAndroidAccountSqliteLeaseProbe } from '../runtime-probes/android-account-sqlite-lease/probe';

const PASS_MARKER = 'account_sqlite_lease_android_runtime_probe_pass';
const BEGIN_SQL = 'BEGIN IMMEDIATE';
const PROBE_SQL = 'SELECT 1';

type ProbePort = Parameters<typeof runAndroidAccountSqliteLeaseProbe>[0];

type FakeMode =
  | 'normal'
  | 'wrapped_close_proof'
  | 'unexpected_first_commit'
  | 'unexpected_post_revoke_commit'
  | 'ineffective_revoke'
  | 'revoke_throws'
  | 'close_rejects'
  | 'close_resolves_without_closing'
  | 'usable_after_close';

type RequiredDatabaseMethod =
  | 'execSync'
  | 'revokeAccountLeaseSync'
  | 'commitAccountLeaseAsync'
  | 'closeAccountLeaseAsync'
  | 'closeSync';

type HostileMessageShape = 'own_getter' | 'inherited_getter' | 'revoked_proxy';

type EvidenceFailures = Readonly<{
  revoked?: unknown;
  closed?: unknown;
}>;

type FakeProbe = Readonly<{
  port: ProbePort;
  events: string[];
  emitted: string[];
}>;

type FakeDatabase = {
  execSync(this: FakeDatabase, sql: string): void;
  revokeAccountLeaseSync(this: FakeDatabase): void;
  commitAccountLeaseAsync(this: FakeDatabase): Promise<string>;
  closeAccountLeaseAsync(this: FakeDatabase): Promise<void>;
  closeSync(this: FakeDatabase): void;
};

function createFakeProbe(
  mode: FakeMode = 'normal',
  missingMethod?: RequiredDatabaseMethod,
  revokedErrorMessage = 'account_native_sqlite_revoked',
  revokeFailure?: Error,
  evidenceFailures: EvidenceFailures = {},
): FakeProbe {
  const events: string[] = [];
  const emitted: string[] = [];
  let transactionOpen = false;
  let revoked = false;
  let closed = false;
  let commitCalls = 0;

  const database: FakeDatabase = {
    execSync: function execSync(this: FakeDatabase, sql: string): void {
      if (this !== database) throw new Error('C:\\private\\raw-exec-receiver');
      events.push(`execSync:${sql}`);
      if (revoked) {
        if (evidenceFailures.revoked !== undefined) throw evidenceFailures.revoked;
        throw new Error(revokedErrorMessage);
      }
      if (closed) throw new Error('account_native_sqlite_closed');
      if (sql === BEGIN_SQL) {
        if (transactionOpen) throw new Error('test_fake_transaction_already_open');
        transactionOpen = true;
        return;
      }
      if (sql !== PROBE_SQL) throw new Error('test_fake_unexpected_sql');
    },
    revokeAccountLeaseSync: function revokeAccountLeaseSync(this: FakeDatabase): void {
      if (this !== database) throw new Error('C:\\private\\raw-revoke-receiver');
      events.push('revokeAccountLeaseSync');
      if (closed) throw new Error('C:\\private\\raw-revoke-path');
      if (mode === 'revoke_throws') {
        throw revokeFailure ?? new Error('C:\\private\\raw-revoke-path');
      }
      if (mode !== 'ineffective_revoke') revoked = true;
      queueMicrotask(() => events.push('revokeMicrotask'));
    },
    commitAccountLeaseAsync: async function commitAccountLeaseAsync(
      this: FakeDatabase,
    ): Promise<string> {
      if (this !== database) throw new Error('C:\\private\\raw-commit-receiver');
      events.push('commitAccountLeaseAsync');
      commitCalls += 1;
      if (closed) throw new Error('C:\\private\\raw-commit-path');
      if (mode === 'unexpected_first_commit' && commitCalls === 1) {
        return 'private-unexpected-native-result';
      }
      if (mode === 'unexpected_post_revoke_commit' && commitCalls === 2) {
        return 'committed';
      }
      if (revoked) return 'revoked';
      if (!transactionOpen) throw new Error('C:\\private\\raw-no-transaction');
      transactionOpen = false;
      return 'committed';
    },
    closeAccountLeaseAsync: async function closeAccountLeaseAsync(
      this: FakeDatabase,
    ): Promise<void> {
      if (this !== database) throw new Error('C:\\private\\raw-close-receiver');
      events.push('closeAccountLeaseAsync');
      if (mode === 'close_rejects') {
        throw new Error('C:\\private\\raw-close-path');
      }
      if (mode === 'usable_after_close') {
        revoked = false;
      } else if (mode === 'close_resolves_without_closing') {
        // Deliberately retain the revoked state without closing the database.
      } else {
        closed = true;
      }
      transactionOpen = false;
    },
    closeSync: function closeSync(this: FakeDatabase): void {
      if (this !== database) throw new Error('C:\\private\\raw-close-sync-receiver');
      events.push('closeSync');
      if (closed) {
        if (evidenceFailures.closed !== undefined) throw evidenceFailures.closed;
        if (mode === 'wrapped_close_proof') {
          throw new Error(
            "Call to function 'NativeDatabase.closeSync' has been rejected.\n" +
              '→ Caused by: Access to closed resource',
          );
        }
        throw new Error('account_native_sqlite_closed');
      }
      closed = true;
    },
  };

  if (missingMethod !== undefined) Reflect.deleteProperty(database, missingMethod);

  const port: ProbePort = {
    openDatabaseAsync: async function openDatabaseAsync(this: ProbePort): Promise<unknown> {
      if (this !== port) throw new Error('C:\\private\\raw-open-receiver');
      events.push('openDatabaseAsync');
      return database;
    },
  };

  return Object.freeze({ port, events, emitted });
}

function createHostileEvidenceError(shape: HostileMessageShape): Error {
  const getterFailure = Object.assign(new Error('C:\\private\\message-getter-failure'), {
    cause: new Error('C:\\private\\message-getter-cause'),
    privatePath: 'C:\\private\\message-getter-metadata',
  });
  const target = Object.assign(new Error('account_native_sqlite_revoked'), {
    cause: new Error('C:\\private\\original-cause'),
    privatePath: 'C:\\private\\original-metadata',
  });

  if (shape === 'own_getter') {
    Object.defineProperty(target, 'message', {
      configurable: true,
      get(): never {
        throw getterFailure;
      },
    });
    return target;
  }

  if (shape === 'inherited_getter') {
    const hostilePrototype = Object.create(Error.prototype, {
      message: {
        configurable: true,
        get(): never {
          throw getterFailure;
        },
      },
    });
    return Object.assign(Object.create(hostilePrototype) as Error, {
      cause: target.cause,
      privatePath: target.privatePath,
    });
  }

  const revocable = Proxy.revocable(target, {});
  revocable.revoke();
  return revocable.proxy;
}

async function expectSanitizedFailure(
  operation: () => Promise<unknown>,
  expectedCode: string,
  emitted: readonly string[],
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expect(message).toBe(expectedCode);
    expect(message.length).toBeGreaterThan(0);
    expect(message.length).toBeLessThanOrEqual(96);
    expect(message).not.toMatch(/[\\/]/u);
    expect(message).not.toContain('private');
    expect(emitted).toEqual([]);
    return;
  }
  throw new Error(`Expected ${expectedCode}`);
}

async function expectFreshSanitizedFailure(
  operation: () => Promise<unknown>,
  expectedCode: string,
  emitted: readonly string[],
  originalFailure: unknown,
): Promise<void> {
  let observed: unknown;
  try {
    await operation();
  } catch (error) {
    observed = error;
  }

  expect(observed).toBeInstanceOf(Error);
  expect(observed).not.toBe(originalFailure);
  expect((observed as Error).message).toBe(expectedCode);
  expect(Object.prototype.hasOwnProperty.call(observed, 'cause')).toBe(false);
  expect(Object.prototype.hasOwnProperty.call(observed, 'privatePath')).toBe(false);
  expect(emitted).toEqual([]);
}

describe('Android account SQLite lease runtime probe', () => {
  test('proves ordered commit, synchronous revoke, close, and emits one sanitized PASS marker', async () => {
    const fake = createFakeProbe();

    await runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
      fake.events.push(`emit:${marker}`);
      fake.emitted.push(marker);
    });

    expect(fake.events).toEqual([
      'openDatabaseAsync',
      `execSync:${BEGIN_SQL}`,
      'commitAccountLeaseAsync',
      `execSync:${BEGIN_SQL}`,
      'revokeAccountLeaseSync',
      `execSync:${PROBE_SQL}`,
      'commitAccountLeaseAsync',
      'revokeMicrotask',
      'closeAccountLeaseAsync',
      'closeSync',
      `execSync:${PROBE_SQL}`,
      `emit:${PASS_MARKER}`,
    ]);
    expect(fake.emitted).toEqual([PASS_MARKER]);
    expect(fake.emitted[0]).not.toMatch(/[\\/]/u);
    expect(fake.emitted[0]).not.toContain('private');
    expect(fake.emitted[0]).not.toContain('error');
  });

  test('accepts the native revoked code as a terminal wrapped cause token', async () => {
    const fake = createFakeProbe(
      'normal',
      undefined,
      "Call to function 'NativeDatabase.execSync' has been rejected.\n" +
        '→ Caused by: Invalid arguments: account_native_sqlite_revoked',
    );

    await runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
      fake.emitted.push(marker);
    });

    expect(fake.emitted).toEqual([PASS_MARKER]);
  });

  test('accepts the complete Expo closeSync closed-resource wrapper as close proof', async () => {
    const fake = createFakeProbe('wrapped_close_proof');

    await runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
      fake.emitted.push(marker);
    });

    expect(fake.emitted).toEqual([PASS_MARKER]);
  });

  test.each<HostileMessageShape>([
    'own_getter',
    'inherited_getter',
    'revoked_proxy',
  ])('sanitizes a hostile revoked-evidence Error with a %s message', async (shape) => {
    const hostileError = createHostileEvidenceError(shape);
    const fake = createFakeProbe('normal', undefined, undefined, undefined, {
      revoked: hostileError,
    });

    await expectFreshSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_revoke_ineffective',
      fake.emitted,
      hostileError,
    );
  });

  test.each<HostileMessageShape>([
    'own_getter',
    'inherited_getter',
    'revoked_proxy',
  ])('sanitizes a hostile closed-evidence Error with a %s message', async (shape) => {
    const hostileError = createHostileEvidenceError(shape);
    const fake = createFakeProbe('normal', undefined, undefined, undefined, {
      closed: hostileError,
    });

    await expectFreshSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_close_ineffective',
      fake.emitted,
      hostileError,
    );
  });

  test.each([
    { label: 'near miss', message: 'account_native_sqlite_revoke' },
    { label: 'direct suffix', message: 'account_native_sqlite_revoked_extra' },
    { label: 'direct prefix', message: 'prefix_account_native_sqlite_revoked' },
    {
      label: 'wrapped prefix',
      message:
        "Call to function 'NativeDatabase.execSync' has been rejected.\n" +
        '→ Caused by: Invalid arguments: prefix_account_native_sqlite_revoked',
    },
    {
      label: 'wrapped suffix',
      message:
        "Call to function 'NativeDatabase.execSync' has been rejected.\n" +
        '→ Caused by: Invalid arguments: account_native_sqlite_revoked_extra',
    },
    {
      label: 'injected trailing line',
      message:
        "Call to function 'NativeDatabase.execSync' has been rejected.\n" +
        '→ Caused by: Invalid arguments: account_native_sqlite_revoked\ninjected',
    },
    {
      label: 'injected terminal suffix',
      message:
        "Call to function 'NativeDatabase.execSync' has been rejected.\n" +
        '→ Caused by: Invalid arguments: account_native_sqlite_revoked: injected',
    },
    {
      label: 'arbitrary prefix before canonical final line',
      message:
        'attacker-controlled-prefix\n' +
        '→ Caused by: Invalid arguments: account_native_sqlite_revoked',
    },
    { label: 'generic injected wrapper', message: 'Injected: account_native_sqlite_revoked' },
  ])('rejects a non-canonical native revoked error token: $label', async ({ message }) => {
    const fake = createFakeProbe('normal', undefined, message);

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_revoke_ineffective',
      fake.emitted,
    );
  });

  test.each<RequiredDatabaseMethod>([
    'execSync',
    'revokeAccountLeaseSync',
    'commitAccountLeaseAsync',
    'closeAccountLeaseAsync',
    'closeSync',
  ])('fails closed when the opened database lacks %s', async (missingMethod) => {
    const fake = createFakeProbe('normal', missingMethod);

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_unsupported',
      fake.emitted,
    );
  });

  test('fails closed on an unexpected first native commit result', async () => {
    const fake = createFakeProbe('unexpected_first_commit');

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_commit_failed',
      fake.emitted,
    );
  });

  test('fails closed when the post-revoke commit unexpectedly reports committed', async () => {
    const fake = createFakeProbe('unexpected_post_revoke_commit');

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_commit_failed',
      fake.emitted,
    );
  });

  test('fails closed when synchronous revoke does not stop immediate SQL', async () => {
    const fake = createFakeProbe('ineffective_revoke');

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_revoke_ineffective',
      fake.emitted,
    );
  });

  test('replaces a hostile revoke failure with a fresh sanitized Error', async () => {
    const hostileCause = new Error('C:\\private\\nested-revoke-cause');
    const hostileError = Object.assign(
      new Error('account_native_sqlite_revoke_failed'),
      {
        cause: hostileCause,
        privatePath: 'C:\\private\\raw-revoke-path',
      },
    );
    const fake = createFakeProbe('revoke_throws', undefined, undefined, hostileError);

    let observed: unknown;
    try {
      await runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      });
    } catch (error) {
      observed = error;
    }

    expect(observed).toBeInstanceOf(Error);
    expect(observed).not.toBe(hostileError);
    expect((observed as Error).message).toBe('account_native_sqlite_revoke_failed');
    expect(Object.prototype.hasOwnProperty.call(observed, 'cause')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(observed, 'privatePath')).toBe(false);
    expect(fake.emitted).toEqual([]);
  });

  test('fails closed and sanitizes a native close rejection', async () => {
    const fake = createFakeProbe('close_rejects');

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_close_failed',
      fake.emitted,
    );
  });

  test('fails closed when the database remains synchronously usable after close', async () => {
    const fake = createFakeProbe('usable_after_close');

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_close_ineffective',
      fake.emitted,
    );
  });

  test('fails closed when async close resolves without closing while revoked remains true', async () => {
    const fake = createFakeProbe('close_resolves_without_closing');

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(fake.port, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_close_ineffective',
      fake.emitted,
    );
  });

  test.each([
    {
      label: 'arbitrary prefix before canonical close cause',
      message: 'attacker-controlled-prefix\n→ Caused by: Access to closed resource',
    },
    {
      label: 'wrong wrapper method',
      message:
        "Call to function 'NativeDatabase.execSync' has been rejected.\n" +
        '→ Caused by: Access to closed resource',
    },
  ])('rejects non-canonical close proof: $label', async ({ message }) => {
    const fake = createFakeProbe();
    const closeProofError = new Error(message);

    const database = await fake.port.openDatabaseAsync() as FakeDatabase;
    database.closeSync = function closeSync(this: FakeDatabase): void {
      fake.events.push('closeSync');
      throw closeProofError;
    };
    const replayPort: ProbePort = {
      openDatabaseAsync: async () => database,
    };

    await expectSanitizedFailure(
      () => runAndroidAccountSqliteLeaseProbe(replayPort, (marker: string) => {
        fake.emitted.push(marker);
      }),
      'account_native_sqlite_close_ineffective',
      fake.emitted,
    );
  });
});
