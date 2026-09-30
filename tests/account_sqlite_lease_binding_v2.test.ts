import {
  AccountSqliteLeaseBindingError,
  createAccountSqliteLeaseBinding,
} from '../modules/account-session-v2/native/account_sqlite_lease_binding';

async function expectLeaseCode(
  operation: () => unknown | Promise<unknown>,
  code: AccountSqliteLeaseBindingError['code'],
): Promise<void> {
  try {
    await operation();
  } catch (error) {
    expect(error).toBeInstanceOf(AccountSqliteLeaseBindingError);
    expect((error as AccountSqliteLeaseBindingError).code).toBe(code);
    expect(Object.isFrozen(error)).toBe(true);
    expect(Reflect.ownKeys(error).sort()).toEqual(['code', 'message', 'name']);
    expect(String(error)).not.toContain('private');
    return;
  }
  throw new Error(`Expected ${code}`);
}

function nativeLease(overrides: Partial<{
  revokeAccountLeaseSync(): unknown;
  commitAccountLeaseAsync(): unknown;
  closeAccountLeaseAsync(): unknown;
}> = {}): {
  revokeAccountLeaseSync(): unknown;
  commitAccountLeaseAsync(): unknown;
  closeAccountLeaseAsync(): unknown;
} {
  return {
    revokeAccountLeaseSync: () => undefined,
    commitAccountLeaseAsync: async () => 'committed',
    closeAccountLeaseAsync: async () => undefined,
    ...overrides,
  };
}

describe('account SQLite lease binding v2', () => {
  test('captures native methods once and invokes them with the exact receiver', async () => {
    const reads = new Map<string, number>();
    const calls: string[] = [];
    const target: Record<string, unknown> = {};
    for (const name of [
      'revokeAccountLeaseSync',
      'commitAccountLeaseAsync',
      'closeAccountLeaseAsync',
    ] as const) {
      Object.defineProperty(target, name, {
        configurable: true,
        get() {
          reads.set(name, (reads.get(name) ?? 0) + 1);
          return function nativeMethod(this: unknown): unknown {
            expect(this).toBe(target);
            calls.push(name);
            if (name === 'commitAccountLeaseAsync') return Promise.resolve('committed');
            if (name === 'closeAccountLeaseAsync') return Promise.resolve(undefined);
            return undefined;
          };
        },
      });
    }
    const binding = createAccountSqliteLeaseBinding(target);
    expect(Object.isFrozen(binding)).toBe(true);
    expect(await binding.commitIfActive()).toBe('committed');
    expect(binding.revoke()).toBeUndefined();
    await binding.close();
    expect([...reads.entries()]).toEqual([
      ['revokeAccountLeaseSync', 1],
      ['commitAccountLeaseAsync', 1],
      ['closeAccountLeaseAsync', 1],
    ]);
    expect(calls).toEqual([
      'commitAccountLeaseAsync', 'revokeAccountLeaseSync', 'closeAccountLeaseAsync',
    ]);
  });

  test('fails closed when the installed native library lacks the exact primitive', async () => {
    for (const missing of [
      'revokeAccountLeaseSync',
      'commitAccountLeaseAsync',
      'closeAccountLeaseAsync',
    ] as const) {
      const candidate = nativeLease() as Record<string, unknown>;
      delete candidate[missing];
      await expectLeaseCode(
        () => createAccountSqliteLeaseBinding(candidate),
        'account_native_sqlite_unsupported',
      );
    }
  });

  test('revokes synchronously and maps only exact native commit outcomes', async () => {
    let revoked = false;
    const binding = createAccountSqliteLeaseBinding(nativeLease({
      revokeAccountLeaseSync: () => {
        revoked = true;
        return undefined;
      },
      commitAccountLeaseAsync: async () => 'revoked',
    }));
    expect(binding.revoke()).toBeUndefined();
    expect(revoked).toBe(true);
    expect(await binding.commitIfActive()).toBe('revoked');
    await expectLeaseCode(
      () => createAccountSqliteLeaseBinding(nativeLease({
        commitAccountLeaseAsync: async () => 'unknown',
      })).commitIfActive(),
      'account_native_sqlite_commit_failed',
    );
  });

  test('observes a malformed asynchronous revoke return and exposes no raw error', async () => {
    let thenCalls = 0;
    const malformed = {
      then(_resolve: (value: unknown) => void, reject: (reason: unknown) => void): void {
        thenCalls += 1;
        reject(new Error('private revoke rejection'));
      },
    };
    const binding = createAccountSqliteLeaseBinding(nativeLease({
      revokeAccountLeaseSync: () => malformed,
    }));
    await expectLeaseCode(
      () => binding.revoke(),
      'account_native_sqlite_revoke_failed',
    );
    await Promise.resolve();
    expect(thenCalls).toBe(1);
  });

  test('quarantines retry and close until a malformed asynchronous revoke settles', async () => {
    let settleUnexpected!: () => void;
    const unexpected = new Promise<void>((resolve) => { settleUnexpected = resolve; });
    let revokeCalls = 0;
    let closeCalls = 0;
    const binding = createAccountSqliteLeaseBinding(nativeLease({
      revokeAccountLeaseSync: () => {
        revokeCalls += 1;
        return revokeCalls === 1 ? unexpected : undefined;
      },
      closeAccountLeaseAsync: async () => { closeCalls += 1; },
    }));
    await expectLeaseCode(
      () => binding.revoke(),
      'account_native_sqlite_revoke_failed',
    );
    await expectLeaseCode(
      () => binding.revoke(),
      'account_native_sqlite_revoke_failed',
    );
    await expectLeaseCode(
      () => binding.close(),
      'account_native_sqlite_close_failed',
    );
    expect({ revokeCalls, closeCalls }).toEqual({ revokeCalls: 1, closeCalls: 0 });
    settleUnexpected();
    await unexpected;
    await Promise.resolve();
    expect(binding.revoke()).toBeUndefined();
    await binding.close();
    expect({ revokeCalls, closeCalls }).toEqual({ revokeCalls: 2, closeCalls: 1 });
  });

  test('installs one close flight and retains the raw receiver after failure for retry', async () => {
    let closeCalls = 0;
    let allowClose = false;
    const binding = createAccountSqliteLeaseBinding(nativeLease({
      closeAccountLeaseAsync: () => {
        closeCalls += 1;
        return allowClose
          ? Promise.resolve(undefined)
          : Promise.reject(new Error('private close failure'));
      },
    }));
    binding.revoke();
    const first = binding.close();
    expect(binding.close()).toBe(first);
    await expectLeaseCode(() => first, 'account_native_sqlite_close_failed');
    allowClose = true;
    await binding.close();
    expect(closeCalls).toBe(2);
    await binding.close();
    expect(closeCalls).toBe(2);
    await expectLeaseCode(
      () => binding.commitIfActive(),
      'account_native_sqlite_closed',
    );
  });

  test('requires successful revoke before native close and sanitizes native failures', async () => {
    let closeCalls = 0;
    const binding = createAccountSqliteLeaseBinding(nativeLease({
      commitAccountLeaseAsync: () => Promise.reject(new Error('private SQL error')),
      closeAccountLeaseAsync: async () => { closeCalls += 1; },
    }));
    await expectLeaseCode(() => binding.close(), 'account_native_sqlite_close_failed');
    expect(closeCalls).toBe(0);
    await expectLeaseCode(
      () => binding.commitIfActive(),
      'account_native_sqlite_commit_failed',
    );
  });
});
