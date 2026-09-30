export type AccountSqliteLeaseBindingErrorCode =
  | 'account_native_sqlite_unsupported'
  | 'account_native_sqlite_revoke_failed'
  | 'account_native_sqlite_commit_failed'
  | 'account_native_sqlite_close_failed'
  | 'account_native_sqlite_closed';

export class AccountSqliteLeaseBindingError extends Error {
  declare readonly code: AccountSqliteLeaseBindingErrorCode;

  constructor(rawCode: unknown) {
    const allowed: readonly AccountSqliteLeaseBindingErrorCode[] = [
      'account_native_sqlite_unsupported',
      'account_native_sqlite_revoke_failed',
      'account_native_sqlite_commit_failed',
      'account_native_sqlite_close_failed',
      'account_native_sqlite_closed',
    ];
    const code = typeof rawCode === 'string'
      && allowed.includes(rawCode as AccountSqliteLeaseBindingErrorCode)
      ? rawCode as AccountSqliteLeaseBindingErrorCode
      : 'account_native_sqlite_unsupported';
    super(code);
    delete this.stack;
    delete (this as Error & { cause?: unknown }).cause;
    Object.defineProperties(this, {
      name: {
        value: 'AccountSqliteLeaseBindingError', enumerable: true,
        writable: false, configurable: false,
      },
      message: { value: code, enumerable: true, writable: false, configurable: false },
      code: { value: code, enumerable: true, writable: false, configurable: false },
    });
    Object.freeze(this);
  }
}

export type AccountSqliteLeaseCommitOutcome = 'committed' | 'revoked';

export type AccountSqliteLeaseBinding = Readonly<{
  revoke(): undefined;
  commitIfActive(): Promise<AccountSqliteLeaseCommitOutcome>;
  close(): Promise<void>;
}>;

type NativeMethod = (this: object) => unknown;

function fail(code: AccountSqliteLeaseBindingErrorCode): never {
  throw new AccountSqliteLeaseBindingError(code);
}

function captureMethod(target: object, name: string): NativeMethod {
  try {
    const candidate = Reflect.get(target, name, target);
    if (typeof candidate !== 'function') return fail('account_native_sqlite_unsupported');
    return candidate as NativeMethod;
  } catch {
    return fail('account_native_sqlite_unsupported');
  }
}

function isThenableCandidate(value: unknown): value is object | ((...args: never[]) => unknown) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

function observeUnexpectedAsyncValue(value: unknown, onSettled: () => void): void {
  if (!isThenableCandidate(value)) {
    onSettled();
    return;
  }
  const observation = new Promise<unknown>((resolve) => resolve(value));
  void observation.then(onSettled, onSettled);
}

function adoptNativePromise(
  value: unknown,
  failureCode: AccountSqliteLeaseBindingErrorCode,
): Promise<unknown> {
  if (!isThenableCandidate(value)) {
    return Promise.reject(new AccountSqliteLeaseBindingError(failureCode));
  }
  const owned = new Promise<unknown>((resolve) => resolve(value));
  return owned.then(
    (resolved) => resolved,
    () => fail(failureCode),
  );
}

export function createAccountSqliteLeaseBinding(
  rawNativeDatabase: unknown,
): AccountSqliteLeaseBinding {
  if (typeof rawNativeDatabase !== 'object' || rawNativeDatabase === null) {
    return fail('account_native_sqlite_unsupported');
  }
  let target: object | null = rawNativeDatabase;
  let revokeMethod: NativeMethod | null = captureMethod(target, 'revokeAccountLeaseSync');
  let commitMethod: NativeMethod | null = captureMethod(target, 'commitAccountLeaseAsync');
  let closeMethod: NativeMethod | null = captureMethod(target, 'closeAccountLeaseAsync');
  let revoked = false;
  let closed = false;
  let pendingUnexpectedRevokeResult = false;
  let closeFlight: Promise<void> | null = null;

  const revoke = (): undefined => {
    if (revoked || closed) return undefined;
    if (pendingUnexpectedRevokeResult) {
      return fail('account_native_sqlite_revoke_failed');
    }
    const receiver = target;
    const method = revokeMethod;
    if (receiver === null || method === null) return fail('account_native_sqlite_closed');
    let result: unknown;
    try {
      result = Reflect.apply(method, receiver, []);
    } catch {
      return fail('account_native_sqlite_revoke_failed');
    }
    if (result !== undefined) {
      if (isThenableCandidate(result)) {
        pendingUnexpectedRevokeResult = true;
        observeUnexpectedAsyncValue(result, () => {
          pendingUnexpectedRevokeResult = false;
        });
      }
      return fail('account_native_sqlite_revoke_failed');
    }
    revoked = true;
    return undefined;
  };

  const commitIfActive = async (): Promise<AccountSqliteLeaseCommitOutcome> => {
    const receiver = target;
    const method = commitMethod;
    if (closed || receiver === null || method === null) {
      return fail('account_native_sqlite_closed');
    }
    let nativeResult: unknown;
    try {
      nativeResult = Reflect.apply(method, receiver, []);
    } catch {
      return fail('account_native_sqlite_commit_failed');
    }
    const outcome = await adoptNativePromise(
      nativeResult,
      'account_native_sqlite_commit_failed',
    );
    if (outcome !== 'committed' && outcome !== 'revoked') {
      return fail('account_native_sqlite_commit_failed');
    }
    return outcome;
  };

  const close = (): Promise<void> => {
    if (closed) return Promise.resolve();
    if (closeFlight !== null) return closeFlight;
    if (pendingUnexpectedRevokeResult) {
      return Promise.reject(new AccountSqliteLeaseBindingError(
        'account_native_sqlite_close_failed',
      ));
    }
    if (!revoked) {
      return Promise.reject(new AccountSqliteLeaseBindingError(
        'account_native_sqlite_close_failed',
      ));
    }
    const receiver = target;
    const method = closeMethod;
    if (receiver === null || method === null) {
      return Promise.reject(new AccountSqliteLeaseBindingError(
        'account_native_sqlite_close_failed',
      ));
    }
    let begin!: () => void;
    const flight = new Promise<void>((resolve, reject) => {
      begin = (): void => {
        let nativeResult: unknown;
        try {
          nativeResult = Reflect.apply(method, receiver, []);
        } catch {
          closeFlight = null;
          reject(new AccountSqliteLeaseBindingError('account_native_sqlite_close_failed'));
          return;
        }
        void adoptNativePromise(nativeResult, 'account_native_sqlite_close_failed').then(
          (result) => {
            if (result !== undefined) {
              closeFlight = null;
              reject(new AccountSqliteLeaseBindingError('account_native_sqlite_close_failed'));
              return;
            }
            closed = true;
            closeFlight = null;
            target = null;
            revokeMethod = null;
            commitMethod = null;
            closeMethod = null;
            resolve();
          },
          () => {
            closeFlight = null;
            reject(new AccountSqliteLeaseBindingError('account_native_sqlite_close_failed'));
          },
        );
      };
    });
    closeFlight = flight;
    begin();
    return flight;
  };

  return Object.freeze({ revoke, commitIfActive, close });
}
