import {
  DATABASE_NAME,
  DATABASE_RELATIVE_PATH,
  MARKER,
  PASS_MARKERS,
  ProbeMode,
  runAndroidAccountSqlcipherProbe,
} from '../runtime-probes/android-account-sqlcipher/probe';

type ProbePort = Parameters<typeof runAndroidAccountSqlcipherProbe>[0];

const KEY_PREFIX = 'PRAGMA key = "x\'';
const CIPHER_SQL = 'PRAGMA cipher_version';
const BEGIN_SQL = 'BEGIN IMMEDIATE';
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS account_sqlcipher_probe_v1 (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  marker TEXT NOT NULL
) STRICT`;
const UPSERT_SQL = `INSERT INTO account_sqlcipher_probe_v1 (singleton, marker) VALUES (?, ?)
ON CONFLICT(singleton) DO UPDATE SET marker = excluded.marker`;
const MARKER_SQL = 'SELECT marker FROM account_sqlcipher_probe_v1 WHERE singleton = ?';
const SCHEMA_SQL = 'SELECT count(*) AS table_count FROM sqlite_schema';
const INTEGRITY_SQL = 'PRAGMA cipher_integrity_check';

type FakeOptions = {
  cipherRow?: unknown;
  markerRow?: unknown;
  schemaResolves?: boolean;
  integrityValue?: unknown;
  integrityRejects?: boolean;
  commitValue?: unknown;
  revokeValue?: unknown;
  closeValue?: unknown;
  closeNoop?: boolean;
  usableAfterClose?: boolean;
  wrongReceiver?: boolean;
  mutateAfterKey?: 'native' | 'execAsync' | 'nativeClose';
  hostileNativeAccessor?: boolean;
  nativeMethodGetter?:
    | 'revokeAccountLeaseSync'
    | 'closeAccountLeaseAsync'
    | 'closeSync'
    | 'execSync';
  openValue?: unknown;
  schemaDispatch?: 'sync-throw' | 'non-promise';
  commitDispatch?: 'sync-throw' | 'non-promise' | 'spoof' | 'then-getter';
  closeDispatch?: 'sync-throw' | 'non-promise' | 'spoof' | 'then-getter';
  wrapperMethodGetter?: 'execAsync' | 'getFirstAsync' | 'runAsync';
  missingMethod?:
    | 'execAsync'
    | 'getFirstAsync'
    | 'runAsync'
    | 'revokeAccountLeaseSync'
    | 'commitAccountLeaseAsync'
    | 'closeAccountLeaseAsync'
    | 'closeSync'
    | 'execSync';
  nonFunctionMethod?: FakeOptions['missingMethod'];
  mutateAfterSettledPromise?:
    | 'prepare-commit'
    | 'verify-marker'
    | 'wrong-key-schema-rejection'
    | 'wrong-key-integrity';
};

function spoofedPromise(kind: 'spoof' | 'then-getter'): Promise<unknown> {
  const value = Object.create(Promise.prototype) as object;
  if (kind === 'spoof') {
    Object.defineProperty(value, 'then', {
      value: () => Promise.resolve(undefined),
      enumerable: true,
    });
  } else {
    Object.defineProperty(value, 'then', {
      get(): never {
        throw new Error('C:\\private\\then-getter');
      },
    });
  }
  return value as Promise<unknown>;
}

function closedError(method: 'closeSync' | 'execSync'): Error {
  return new Error(
    `Call to function 'NativeDatabase.${method}' has been rejected.\n` +
      '→ Caused by: Access to closed resource',
  );
}

function createFake(mode: ProbeMode, options: FakeOptions = {}) {
  const events: string[] = [];
  const emitted: string[] = [];
  let revoked = false;
  let closed = false;

  const mutateCapturedConnection = (): void => {
    wrapper.nativeDatabase = { ...native };
  };

  const native = {
    revokeAccountLeaseSync: function revokeAccountLeaseSync(this: unknown): unknown {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:revoke');
      revoked = true;
      return options.revokeValue;
    },
    commitAccountLeaseAsync: function commitAccountLeaseAsync(this: unknown): unknown {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:commit');
      if (options.commitDispatch === 'sync-throw') throw new Error('C:\\private\\commit-sync');
      if (options.commitDispatch === 'non-promise') return { then: () => undefined };
      if (options.commitDispatch === 'spoof' || options.commitDispatch === 'then-getter') {
        return spoofedPromise(options.commitDispatch);
      }
      const result = Promise.resolve(
        Object.prototype.hasOwnProperty.call(options, 'commitValue')
          ? options.commitValue
          : 'committed',
      );
      return options.mutateAfterSettledPromise === 'prepare-commit'
        ? result.then((value) => {
          mutateCapturedConnection();
          return value;
        })
        : result;
    },
    closeAccountLeaseAsync: function closeAccountLeaseAsync(this: unknown): unknown {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:closeAsync');
      if (options.closeDispatch === 'sync-throw') throw new Error('C:\\private\\close-sync');
      if (options.closeDispatch === 'non-promise') return { then: () => undefined };
      if (options.closeDispatch === 'spoof' || options.closeDispatch === 'then-getter') {
        return spoofedPromise(options.closeDispatch);
      }
      if (options.usableAfterClose) {
        revoked = false;
      } else if (!options.closeNoop) {
        closed = true;
      }
      return Promise.resolve(options.closeValue);
    },
    closeSync: function closeSync(this: unknown): void {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push('native:closeSync');
      if (closed) throw closedError('closeSync');
    },
    execSync: function execSync(this: unknown, sql: string): void {
      if (this !== native || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push(`native:execSync:${sql}`);
      if (closed) throw closedError('execSync');
      if (revoked) throw new Error('account_native_sqlite_revoked');
    },
  };

  if (options.nativeMethodGetter !== undefined) {
    Object.defineProperty(native, options.nativeMethodGetter, {
      configurable: true,
      get(): never {
        throw new Error('C:\\private\\getter');
      },
    });
  }

  const wrapper = {
    nativeDatabase: native,
    execAsync: function execAsync(this: unknown, sql: string): Promise<void> {
      if (this !== wrapper || options.wrongReceiver) return Promise.reject(new Error('C:\\private\\receiver'));
      events.push(`wrapper:exec:${sql}`);
      if (sql.startsWith(KEY_PREFIX) && options.mutateAfterKey === 'native') {
        wrapper.nativeDatabase = { ...native };
      }
      if (sql.startsWith(KEY_PREFIX) && options.mutateAfterKey === 'execAsync') {
        wrapper.execAsync = async () => undefined;
      }
      if (sql.startsWith(KEY_PREFIX) && options.mutateAfterKey === 'nativeClose') {
        native.closeAccountLeaseAsync = async () => undefined;
      }
      return Promise.resolve();
    },
    getFirstAsync: function getFirstAsync(
      this: unknown,
      sql: string,
      ...params: readonly unknown[]
    ): unknown {
      if (this !== wrapper || options.wrongReceiver) return Promise.reject(new Error('C:\\private\\receiver'));
      events.push(`wrapper:first:${sql}:${JSON.stringify(params)}`);
      if (sql === CIPHER_SQL) {
        return Promise.resolve(
          Object.prototype.hasOwnProperty.call(options, 'cipherRow')
            ? options.cipherRow
            : { cipher_version: '4.7.0' },
        );
      }
      if (sql === MARKER_SQL) {
        const result = Promise.resolve(
          Object.prototype.hasOwnProperty.call(options, 'markerRow')
            ? options.markerRow
            : { marker: MARKER },
        );
        return options.mutateAfterSettledPromise === 'verify-marker'
          ? result.then((value) => {
            mutateCapturedConnection();
            return value;
          })
          : result;
      }
      if (sql === SCHEMA_SQL) {
        if (options.schemaDispatch === 'sync-throw') throw new Error('C:\\private\\schema-sync');
        if (options.schemaDispatch === 'non-promise') return { then: () => undefined };
        if (options.schemaResolves) return Promise.resolve({ table_count: 1 });
        const rejection = Promise.reject(new Error('C:\\private\\encrypted-page'));
        return options.mutateAfterSettledPromise === 'wrong-key-schema-rejection'
          ? rejection.catch((error: unknown) => {
            mutateCapturedConnection();
            throw error;
          })
          : rejection;
      }
      if (sql === INTEGRITY_SQL) {
        const result = options.integrityRejects
          ? Promise.reject(new Error('C:\\private\\integrity'))
          : Promise.resolve(options.integrityValue);
        return options.mutateAfterSettledPromise === 'wrong-key-integrity'
          ? result.then(
            (value) => {
              mutateCapturedConnection();
              return value;
            },
            (error: unknown) => {
              mutateCapturedConnection();
              throw error;
            },
          )
          : result;
      }
      return Promise.reject(new Error('C:\\private\\unexpected-query'));
    },
    runAsync: function runAsync(
      this: unknown,
      sql: string,
      params: readonly unknown[],
    ): Promise<unknown> {
      if (this !== wrapper || options.wrongReceiver) return Promise.reject(new Error('C:\\private\\receiver'));
      events.push(`wrapper:run:${sql}:${JSON.stringify(params)}`);
      return Promise.resolve({ changes: 1 });
    },
  };

  if (options.hostileNativeAccessor) {
    Object.defineProperty(wrapper, 'nativeDatabase', {
      configurable: true,
      get(): never {
        throw new Error('C:\\private\\native-getter');
      },
    });
  }

  if (options.wrapperMethodGetter !== undefined) {
    Object.defineProperty(wrapper, options.wrapperMethodGetter, {
      configurable: true,
      get(): never {
        throw new Error('C:\\private\\wrapper-method-getter');
      },
    });
  }

  if (options.missingMethod !== undefined) {
    Reflect.deleteProperty(
      options.missingMethod in wrapper ? wrapper : native,
      options.missingMethod,
    );
  }
  if (options.nonFunctionMethod !== undefined) {
    Reflect.set(
      options.nonFunctionMethod in wrapper ? wrapper : native,
      options.nonFunctionMethod,
      7,
    );
  }

  const port: ProbePort = {
    defaultDatabaseDirectory: '/data/user/0/app.phraseman/files/SQLite///',
    openDatabaseAsync: async function openDatabaseAsync(
      this: unknown,
      name: string,
      openOptions: Readonly<{ useNewConnection: boolean; enableChangeListener: boolean }>,
      directory: string,
    ): Promise<unknown> {
      if (this !== port || options.wrongReceiver) throw new Error('C:\\private\\receiver');
      events.push(`open:${name}:${JSON.stringify(openOptions)}:${directory}`);
      return Object.prototype.hasOwnProperty.call(options, 'openValue')
        ? options.openValue
        : wrapper;
    },
  };

  return { port, wrapper, native, events, emitted };
}

async function loadFreshProbe() {
  jest.resetModules();
  return import('../runtime-probes/android-account-sqlcipher/probe');
}

async function expectCode(operation: () => Promise<unknown>, code: string): Promise<void> {
  let observed: unknown;
  try {
    await operation();
  } catch (error) {
    observed = error;
  }
  expect(observed).toBeInstanceOf(Error);
  expect((observed as Error).message).toBe(code);
  expect(Object.getOwnPropertyNames(observed as object).sort()).toEqual(['message', 'stack']);
  expect(Object.prototype.hasOwnProperty.call(observed, 'cause')).toBe(false);
  expect((observed as Error).message).not.toMatch(/[\\/]|private/u);
}

describe('Android Account V2 SQLCipher core', () => {
  test.each([
    ['prepare', 'account_sqlcipher_android_prepare_pass'],
    ['verify', 'account_sqlcipher_android_verify_pass'],
    ['wrong-key', 'account_sqlcipher_android_wrong_key_rejected_pass'],
  ] as const)('uses one wrapper/native receiver and emits one fixed marker for %s', async (mode, marker) => {
    const fresh = await loadFreshProbe();
    const fake = createFake(mode);
    await fresh.runAndroidAccountSqlcipherProbe(fake.port, mode, (value) => {
      fake.events.push(`emit:${value}`);
      fake.emitted.push(value);
    });
    expect(fake.emitted).toEqual([marker]);
    expect(fake.events[0]).toBe(
      `open:${DATABASE_NAME}:{"useNewConnection":true,"enableChangeListener":false}:/data/user/0/app.phraseman/files/SQLite/accounts-v2`,
    );
    expect(fake.events[1]).toMatch(/^wrapper:exec:PRAGMA key = "x'[0-9a-f]{64}'"$/u);
    expect(fake.events[2]).toBe(`wrapper:first:${CIPHER_SQL}:[]`);
    expect(fake.events.slice(-5)).toEqual([
      'native:revoke',
      'native:closeAsync',
      'native:closeSync',
      'native:execSync:SELECT 1',
      `emit:${marker}`,
    ]);
  });

  test('prepare follows exact keyed schema/upsert/lease-commit order with parameter binding', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake('prepare');
    await fresh.runAndroidAccountSqlcipherProbe(fake.port, 'prepare', (value) => fake.emitted.push(value));
    expect(fake.events.slice(1, 8)).toEqual([
      expect.stringMatching(/^wrapper:exec:PRAGMA key = "x'[0-9a-f]{64}'"$/u),
      `wrapper:first:${CIPHER_SQL}:[]`,
      `wrapper:exec:${BEGIN_SQL}`,
      `wrapper:exec:${CREATE_SQL}`,
      `wrapper:run:${UPSERT_SQL}:[1,"${MARKER}"]`,
      'native:commit',
      'native:revoke',
    ]);
  });

  test('verify performs a read-only parameterized marker lookup and can repeat in a fresh process', async () => {
    for (let index = 0; index < 2; index += 1) {
      const fresh = await loadFreshProbe();
      const fake = createFake('verify');
      await fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value));
      expect(fake.events).toContain(`wrapper:first:${MARKER_SQL}:[1]`);
      expect(fake.events.join('\n')).not.toMatch(/CREATE|INSERT|UPDATE|DELETE|BEGIN/u);
    }
  });

  test.each([
    undefined,
    [],
    { table_count: 0 },
  ])('wrong-key rejects every successful schema resolution %#', async (schemaValue) => {
    const fresh = await loadFreshProbe();
    const fake = createFake('wrong-key', { schemaResolves: true });
    fake.wrapper.getFirstAsync = function getFirstAsync(this: unknown, sql: string): Promise<unknown> {
      fake.events.push(`wrapper:first:${sql}:[]`);
      if (sql === CIPHER_SQL) return Promise.resolve({ cipher_version: '4.7.0' });
      if (sql === SCHEMA_SQL) return Promise.resolve(schemaValue);
      return Promise.resolve([]);
    };
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'wrong-key', (value) => fake.emitted.push(value)),
      'account_sqlcipher_probe_wrong_key_false_success',
    );
    expect(fake.events).toContain('native:revoke');
    expect(fake.emitted).toEqual([]);
  });

  test.each([
    ['sync-throw', 'account_sqlcipher_probe_schema_failed'],
    ['non-promise', 'account_sqlcipher_probe_schema_failed'],
  ] as const)(
    'wrong-key requires a genuine rejecting Promise for schema dispatch: %s',
    async (schemaDispatch, expectedCode) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('wrong-key', { schemaDispatch });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'wrong-key', (value) => fake.emitted.push(value)),
        expectedCode,
      );
      expect(fake.events).toContain('native:revoke');
      expect(fake.events).toContain('native:closeAsync');
      expect(fake.emitted).toEqual([]);
    },
  );

  test.each([
    [{ integrityRejects: true }, 'rejects'],
    [{ integrityValue: [] }, 'returns an empty array'],
    [{ integrityValue: { anything: true } }, 'returns another value'],
  ] as const)('treats integrity diagnostics as neutral when it %s', async (options, _description) => {
    const fresh = await loadFreshProbe();
    const fake = createFake('wrong-key', options);
    await fresh.runAndroidAccountSqlcipherProbe(fake.port, 'wrong-key', (value) => fake.emitted.push(value));
    expect(fake.events).toContain(`wrapper:first:${INTEGRITY_SQL}:[]`);
    expect(fake.emitted).toEqual([PASS_MARKERS['wrong-key']]);
    expect(fake.events.join('\n')).not.toMatch(/rekey|ATTACH|CREATE|INSERT|UPDATE|DELETE/u);
  });

  test('uses distinct fixed correct and wrong keys without exposing them in constants or output', async () => {
    const correctModule = await loadFreshProbe();
    const correct = createFake('verify');
    await correctModule.runAndroidAccountSqlcipherProbe(correct.port, 'verify', (value) => correct.emitted.push(value));
    const wrongModule = await loadFreshProbe();
    const wrong = createFake('wrong-key');
    await wrongModule.runAndroidAccountSqlcipherProbe(wrong.port, 'wrong-key', (value) => wrong.emitted.push(value));
    const correctKeyEvent = correct.events.find((event) => event.startsWith('wrapper:exec:PRAGMA key'));
    const wrongKeyEvent = wrong.events.find((event) => event.startsWith('wrapper:exec:PRAGMA key'));
    expect(correctKeyEvent).toBeDefined();
    expect(wrongKeyEvent).toBeDefined();
    expect(correctKeyEvent).not.toBe(wrongKeyEvent);
    expect(JSON.stringify(correct.emitted)).not.toContain("x'");
    expect(DATABASE_RELATIVE_PATH).toBe(
      'files/SQLite/accounts-v2/accounts-v2-g-7b32e4de72ea35b9caf5468847f91e542f87c50c5062e82c794f7e9c8c92392c.db',
    );
  });

  test('rejects a second same or different mode before opening', async () => {
    const fresh = await loadFreshProbe();
    const first = createFake('verify');
    await fresh.runAndroidAccountSqlcipherProbe(first.port, 'verify', (value) => first.emitted.push(value));
    for (const mode of ['verify', 'prepare'] as const) {
      const second = createFake(mode);
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(second.port, mode, (value) => second.emitted.push(value)),
        'account_sqlcipher_probe_restart_required',
      );
      expect(second.events).toEqual([]);
    }
  });

  test.each([undefined, '', 'PREPARE', 'delete', null, 1])('rejects invalid mode before open: %#', async (mode) => {
    const fresh = await loadFreshProbe();
    const fake = createFake('verify');
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, mode as never, (value) => fake.emitted.push(value)),
      'account_sqlcipher_probe_invalid_mode',
    );
    expect(fake.events).toEqual([]);
  });

  test.each([
    null,
    {},
    { cipher_version: '' },
    { cipher_version: '   ' },
    { cipher_version: 4 },
    { cipher_version: '4.7.0', extra: true },
    Object.assign(Object.create(null) as object, { cipher_version: '4.7.0' }),
  ])('fails closed on malformed cipher attestation %#', async (cipherRow) => {
    const fresh = await loadFreshProbe();
    const fake = createFake('verify', { cipherRow });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
      'account_sqlcipher_probe_cipher_unavailable',
    );
    expect(fake.events).not.toContain(`wrapper:first:${MARKER_SQL}:[1]`);
    expect(fake.events).toContain('native:revoke');
  });

  test.each(['accessor', 'ownKeys', 'prototype', 'descriptor'] as const)(
    'fails closed when cipher row traps %s',
    async (trap) => {
      const target = { cipher_version: '4.7.0' };
      let cipherRow: unknown = target;
      if (trap === 'accessor') {
        Object.defineProperty(target, 'cipher_version', { get: () => { throw new Error('private'); } });
      } else if (trap === 'ownKeys') {
        cipherRow = new Proxy(target, { ownKeys: () => { throw new Error('private'); } });
      } else if (trap === 'prototype') {
        cipherRow = new Proxy(target, { getPrototypeOf: () => { throw new Error('private'); } });
      } else {
        cipherRow = new Proxy(target, { getOwnPropertyDescriptor: () => { throw new Error('private'); } });
      }
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { cipherRow });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_cipher_unavailable',
      );
    },
  );

  test.each([
    null,
    {},
    { marker: `${MARKER}-wrong` },
    { marker: MARKER, extra: true },
    Object.assign(Object.create(null) as object, { marker: MARKER }),
  ])('rejects malformed marker row %#', async (markerRow) => {
    const fresh = await loadFreshProbe();
    const fake = createFake('verify', { markerRow });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
      'account_sqlcipher_probe_marker_failed',
    );
  });

  test.each(['accessor', 'ownKeys', 'prototype', 'descriptor'] as const)(
    'rejects hostile marker descriptor/trap: %s',
    async (trap) => {
      const target = { marker: MARKER };
      let markerRow: unknown = target;
      if (trap === 'accessor') {
        Object.defineProperty(target, 'marker', { get: () => { throw new Error('private'); } });
      } else if (trap === 'ownKeys') {
        markerRow = new Proxy(target, { ownKeys: () => { throw new Error('private'); } });
      } else if (trap === 'prototype') {
        markerRow = new Proxy(target, { getPrototypeOf: () => { throw new Error('private'); } });
      } else {
        markerRow = new Proxy(target, { getOwnPropertyDescriptor: () => { throw new Error('private'); } });
      }
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { markerRow });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_marker_failed',
      );
      expect(fake.emitted).toEqual([]);
    },
  );

  test.each([
    [{ commitDispatch: 'sync-throw' }, 'account_sqlcipher_probe_commit_failed'],
    [{ commitDispatch: 'non-promise' }, 'account_sqlcipher_probe_commit_failed'],
    [{ commitDispatch: 'spoof' }, 'account_sqlcipher_probe_commit_failed'],
    [{ commitDispatch: 'then-getter' }, 'account_sqlcipher_probe_commit_failed'],
    [{ closeDispatch: 'sync-throw' }, 'account_sqlcipher_probe_close_failed'],
    [{ closeDispatch: 'non-promise' }, 'account_sqlcipher_probe_close_failed'],
    [{ closeDispatch: 'spoof' }, 'account_sqlcipher_probe_close_failed'],
    [{ closeDispatch: 'then-getter' }, 'account_sqlcipher_probe_close_failed'],
  ] as const)(
    'rejects malformed Promise dispatch without trusting prototype: %#',
    async (options, expectedCode) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('prepare', options);
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'prepare', (value) => fake.emitted.push(value)),
        expectedCode,
      );
      expect(fake.emitted).toEqual([]);
    },
  );

  test.each([
    'execAsync',
    'getFirstAsync',
    'runAsync',
    'commitAccountLeaseAsync',
  ] as const)(
    'captures cleanup first and cleans up when later method is missing: %s',
    async (missingMethod) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { missingMethod });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_unsupported',
      );
      expect(fake.events).toEqual(expect.arrayContaining([
        'native:revoke',
        'native:closeAsync',
        'native:closeSync',
        'native:execSync:SELECT 1',
      ]));
    },
  );

  test.each(['execAsync', 'getFirstAsync', 'runAsync', 'commitAccountLeaseAsync'] as const)(
    'captures cleanup first and cleans up when later method is non-function: %s',
    async (nonFunctionMethod) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { nonFunctionMethod });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_unsupported',
      );
      expect(fake.events).toContain('native:revoke');
      expect(fake.events).toContain('native:closeAsync');
    },
  );

  test.each([
    ['revokeAccountLeaseSync', ['native:closeAsync', 'native:closeSync', 'native:execSync:SELECT 1']],
    ['closeAccountLeaseAsync', ['native:revoke', 'native:closeSync', 'native:execSync:SELECT 1']],
    ['closeSync', ['native:revoke', 'native:closeAsync', 'native:execSync:SELECT 1']],
    ['execSync', ['native:revoke', 'native:closeAsync', 'native:closeSync']],
  ] as const)(
    'captures cleanup methods independently when %s is missing and attempts every available counterpart',
    async (missingMethod, expectedEvents) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { missingMethod });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_unsupported',
      );
      for (const event of expectedEvents) expect(fake.events).toContain(event);
      expect(fake.emitted).toEqual([]);
    },
  );

  test.each([
    ['revokeAccountLeaseSync', ['native:closeAsync', 'native:closeSync', 'native:execSync:SELECT 1']],
    ['closeAccountLeaseAsync', ['native:revoke', 'native:closeSync', 'native:execSync:SELECT 1']],
    ['closeSync', ['native:revoke', 'native:closeAsync', 'native:execSync:SELECT 1']],
    ['execSync', ['native:revoke', 'native:closeAsync', 'native:closeSync']],
  ] as const)(
    'survives a hostile %s accessor long enough to attempt every safely captured cleanup counterpart',
    async (nativeMethodGetter, expectedEvents) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { nativeMethodGetter });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_unsupported',
      );
      for (const event of expectedEvents) expect(fake.events).toContain(event);
      expect(fake.emitted).toEqual([]);
    },
  );

  test.each(['execAsync', 'getFirstAsync', 'runAsync'] as const)(
    'cleans up after hostile wrapper method accessor capture: %s',
    async (wrapperMethodGetter) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { wrapperMethodGetter });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_unsupported',
      );
      expect(fake.events).toContain('native:revoke');
      expect(fake.events).toContain('native:closeAsync');
      expect(fake.emitted).toEqual([]);
    },
  );

  test('cleans up when a captured wrapper becomes a revoked proxy during validation', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake('verify');
    let revocable: { proxy: typeof fake.wrapper; revoke: () => void };
    revocable = Proxy.revocable(fake.wrapper, {
      getOwnPropertyDescriptor(target, key) {
        if (key === 'getFirstAsync') {
          revocable.revoke();
          throw new Error('C:\\private\\revoked-during-capture');
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    fake.port.openDatabaseAsync = async () => revocable.proxy;
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
      'account_sqlcipher_probe_unsupported',
    );
    expect(fake.events).toContain('native:revoke');
    expect(fake.events).toContain('native:closeAsync');
    expect(fake.emitted).toEqual([]);
  });

  test.each([
    [{ openValue: null }, 'account_sqlcipher_probe_unsupported'],
    [{ hostileNativeAccessor: true }, 'account_sqlcipher_probe_unsupported'],
    [{ nativeMethodGetter: 'closeAccountLeaseAsync' }, 'account_sqlcipher_probe_unsupported'],
    [{ commitValue: 'revoked' }, 'account_sqlcipher_probe_commit_failed'],
    [{ commitValue: {} }, 'account_sqlcipher_probe_commit_failed'],
    [{ revokeValue: 'bad' }, 'account_sqlcipher_probe_revoke_failed'],
    [{ closeValue: 'bad' }, 'account_sqlcipher_probe_close_failed'],
    [{ closeNoop: true }, 'account_sqlcipher_probe_close_ineffective'],
    [{ usableAfterClose: true }, 'account_sqlcipher_probe_close_ineffective'],
    [{ wrongReceiver: true }, 'account_sqlcipher_probe_open_failed'],
  ] as const)('sanitizes malformed/ineffective native behavior %#', async (options, code) => {
    const fresh = await loadFreshProbe();
    const fake = createFake('prepare', options);
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'prepare', (value) => fake.emitted.push(value)),
      code,
    );
    expect(fake.emitted).toEqual([]);
  });

  test.each(['native', 'execAsync', 'nativeClose'] as const)(
    'rejects wrapper/native mutation after method capture: %s',
    async (mutateAfterKey) => {
      const fresh = await loadFreshProbe();
      const fake = createFake('verify', { mutateAfterKey });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_unsupported',
      );
      expect(fake.emitted).toEqual([]);
    },
  );

  test.each([
    ['prepare', 'prepare-commit'],
    ['verify', 'verify-marker'],
    ['wrong-key', 'wrong-key-schema-rejection'],
    ['wrong-key', 'wrong-key-integrity'],
  ] as const)(
    'revalidates captured identities immediately after the final awaited %s phase Promise: %s',
    async (mode, mutateAfterSettledPromise) => {
      const fresh = await loadFreshProbe();
      const fake = createFake(mode, { mutateAfterSettledPromise });
      await expectCode(
        () => fresh.runAndroidAccountSqlcipherProbe(fake.port, mode, (value) => fake.emitted.push(value)),
        'account_sqlcipher_probe_unsupported',
      );
      expect(fake.events).toEqual(expect.arrayContaining([
        'native:revoke',
        'native:closeAsync',
        'native:closeSync',
        'native:execSync:SELECT 1',
      ]));
      expect(fake.emitted).toEqual([]);
    },
  );

  test('cleanup failure overrides a pending phase failure and never emits twice', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake('verify', { cipherRow: null, revokeValue: 'bad' });
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
      'account_sqlcipher_probe_revoke_failed',
    );
    expect(fake.emitted).toEqual([]);
  });

  test('does not inspect hostile raw errors or leak metadata', async () => {
    const fresh = await loadFreshProbe();
    const fake = createFake('verify');
    const target = Object.assign(new Error('C:\\private\\open'), { cause: 'secret' });
    const revoked = Proxy.revocable(target, {});
    revoked.revoke();
    fake.port.openDatabaseAsync = async () => Promise.reject(revoked.proxy);
    await expectCode(
      () => fresh.runAndroidAccountSqlcipherProbe(fake.port, 'verify', (value) => fake.emitted.push(value)),
      'account_sqlcipher_probe_open_failed',
    );
  });
});
