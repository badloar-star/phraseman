// зачем (координатор 25.10; Apple 5.1.1(v)): при удалении аккаунта с Sign in with Apple токены отзываются через Firebase
// auth().revokeToken(код из окна Apple). Сторож: за флагом, только iOS и только при провайдере apple.com; отмена окна, ошибка и
// потолок времени не бросают и не блокируют удаление; код авторизации не попадает в журнал.
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('../app/remote_flags', () => ({ getRemoteBool: () => false }));

import { revokeAppleSignInForDeletion, type AppleRevokeDeps } from '../app/apple_signin_revoke';

const CODE = 'c_secret_authorization_code_123';

function deps(over: Partial<{
  flag: boolean; os: string; providers: string[]; apple: boolean; revoke: ((code: string) => Promise<void>) | null;
  sheet: () => Promise<{ authorizationCode?: string | null }>; timeoutMs: number;
}> = {}): AppleRevokeDeps & { revokeMock: jest.Mock; sheetMock: jest.Mock } {
  const revokeMock = jest.fn(over.revoke ?? (async () => undefined));
  const sheetMock = jest.fn(over.sheet ?? (async () => ({ authorizationCode: CODE })));
  return {
    flagEnabled: () => over.flag ?? true,
    platformOs: () => over.os ?? 'ios',
    firebaseAuth: () => ({
      currentUser: { providerData: (over.providers ?? ['apple.com']).map((providerId) => ({ providerId })) },
      ...(over.revoke === null ? {} : { revokeToken: revokeMock }),
    }),
    appleAuth: () => (over.apple === false ? null : { signInAsync: sheetMock }),
    timeoutMs: over.timeoutMs ?? 50,
    revokeMock,
    sheetMock,
  };
}

describe('Sign in with Apple revoke on account deletion', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.restoreAllMocks(); });
  const allLogs = (): string => [...log.mock.calls, ...warn.mock.calls].map((c) => String(c[0])).join('\n');

  it('flag off (default): no Apple sheet, no revoke', async () => {
    const d = deps({ flag: false });
    await expect(revokeAppleSignInForDeletion('delete', d)).resolves.toBe('flag_off');
    expect(d.sheetMock).not.toHaveBeenCalled();
    expect(d.revokeMock).not.toHaveBeenCalled();
  });

  it('only iOS and only accounts with apple.com', async () => {
    const android = deps({ os: 'android' });
    await expect(revokeAppleSignInForDeletion('delete', android)).resolves.toBe('not_ios');
    const google = deps({ providers: ['google.com'] });
    await expect(revokeAppleSignInForDeletion('delete', google)).resolves.toBe('no_apple_provider');
    expect(android.sheetMock).not.toHaveBeenCalled();
    expect(google.sheetMock).not.toHaveBeenCalled();
  });

  it('success: fresh code from the Apple sheet goes to revokeToken; the code never reaches the log', async () => {
    const d = deps();
    await expect(revokeAppleSignInForDeletion('delete', d)).resolves.toBe('revoked');
    expect(d.sheetMock).toHaveBeenCalledWith({ requestedScopes: [] });
    expect(d.revokeMock).toHaveBeenCalledWith(CODE);
    expect(allLogs()).toContain('[APPLE-REVOKE] revoked');
    expect(allLogs()).not.toContain(CODE);
  });

  it('cancelled sheet, missing module, revoke failure and timeout never throw', async () => {
    const cancelled = deps({ sheet: async () => { throw Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' }); } });
    await expect(revokeAppleSignInForDeletion('delete', cancelled)).resolves.toBe('cancelled');
    await expect(revokeAppleSignInForDeletion('delete', deps({ apple: false }))).resolves.toBe('module_unavailable');
    await expect(revokeAppleSignInForDeletion('delete', deps({ revoke: null }))).resolves.toBe('module_unavailable');
    await expect(revokeAppleSignInForDeletion('delete', deps({ sheet: async () => ({ authorizationCode: null }) }))).resolves.toBe('no_code');
    const failing = deps({ revoke: async () => { throw Object.assign(new Error('no key'), { code: 'auth/invalid-credential' }); } });
    await expect(revokeAppleSignInForDeletion('delete', failing)).resolves.toBe('failed');
    expect(allLogs()).toContain('auth/invalid-credential');
    const slow = deps({ revoke: () => new Promise<void>(() => undefined), timeoutMs: 20 });
    await expect(revokeAppleSignInForDeletion('delete', slow)).resolves.toBe('timeout');
    expect(allLogs()).not.toContain(CODE);
  });
});

// зачем (Ревизор 25.10 на 045c5c569): динамический import до замка добавлял тик при ВЫКЛ флаге — красились тесты удаления.
describe('вызов из удаления аккаунта', () => {
  it('флаг проверяется синхронно; без await import; до beginLocalAccountDeletionAttempt', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const src: string = require('fs').readFileSync(require('path').join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8');
    expect(src).not.toContain("import('./apple_signin_revoke')");
    const guard = src.indexOf('if (isAppleSignInRevokeEnabled()) {');
    const call = src.indexOf("await revokeAppleSignInForDeletion('begin_account_deletion')");
    const lock = src.indexOf('beginLocalAccountDeletionAttempt();', guard);
    expect(guard).toBeGreaterThan(0);
    expect(call).toBeGreaterThan(guard);
    expect(lock).toBeGreaterThan(call);
    // зачем (Ревизор 25.10): при ВЫКЛ замок взводится синхронно — между проверкой флага и замком единственный await внутри if
    expect((src.slice(guard, lock).match(/\bawait\b/g) ?? []).length).toBe(1);
  });

  it('при ВЫКЛ флаге отзыв не зовётся и не трогает модули входа', async () => {
    const calls: string[] = [];
    const off = deps({ flag: false, revoke: async () => { calls.push('revoke'); } });
    await expect(revokeAppleSignInForDeletion('delete', off)).resolves.toBe('flag_off');
    expect(calls).toEqual([]);
  });
});
