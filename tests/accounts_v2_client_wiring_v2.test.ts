import fs from 'fs';
import path from 'path';

/*
 * Account V2, Пакет 6B — проводка клиента V2 в приложение за выключенным флагом.
 *  - флаг по умолчанию выключен, включает только remote_config («Пульт»);
 *  - флаг выключен → клиент V2 даже не грузится (ни require, ни чтений, ни сети);
 *  - удаление: отсоединение V2 синхронно ДО стирания и ДО сети; ключ — в запросе
 *    accountDeleteEnqueue отдельным полем, без ключа запрос прежний;
 *  - корневой layout будит клиент только после первого кадра.
 */

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function functionBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error(`unterminated ${signature}`);
}

describe('accounts v2 client wiring v2', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.resetModules();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.useRealTimers();
    log.mockRestore();
    warn.mockRestore();
    jest.dontMock('../modules/account-session-v2/accounts_v2_client_runtime');
    jest.dontMock('react-native');
    jest.dontMock('@react-native-firebase/auth');
  });

  test('flag defaults OFF and only remote_config can turn it on', () => {
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    expect(flags.getRemoteBool('accounts_v2_client_enabled')).toBe(false);
    flags.applyRemoteConfigSnapshot({ bools: { accounts_v2_client_enabled: 'yes' } });
    expect(flags.getRemoteBool('accounts_v2_client_enabled')).toBe(false);
    flags.applyRemoteConfigSnapshot({ bools: { accounts_v2_client_enabled: true } });
    expect(flags.getRemoteBool('accounts_v2_client_enabled')).toBe(true);
    flags.applyRemoteConfigSnapshot({ bools: {} });
    expect(flags.getRemoteBool('accounts_v2_client_enabled')).toBe(false);
  });

  test('flag OFF: the V2 client module is never loaded and nothing runs', () => {
    const factory = jest.fn(() => ({
      syncAccountsV2ClientAuthUid: jest.fn(),
      beginAccountsV2Deletion: jest.fn(),
    }));
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', factory);
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    gate.syncAccountsV2ClientAuth('uid-a');
    expect(gate.beginAccountsV2DeletionIfEnabled('uid-a')).toBeNull();
    expect(factory).not.toHaveBeenCalled();
    expect(log.mock.calls.map((args) => args.join(' '))).toEqual(expect.arrayContaining([
      '[ACCOUNT-V2] auth_sync skip reason=flag_off', '[ACCOUNT-V2] delete skip reason=flag_off',
    ]));
  });

  test('flag ON: auth changes and deletion reach the V2 client', async () => {
    const runtime = {
      syncAccountsV2ClientAuthUid: jest.fn(),
      beginAccountsV2Deletion: jest.fn(async () => ({ operationId: 'acv2del_xxxxxxxxxxxxxxxx', capability: 'c' })),
    };
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => runtime);
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    flags.applyRemoteConfigSnapshot({ bools: { accounts_v2_client_enabled: true } });
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    gate.syncAccountsV2ClientAuth('uid-a');
    expect(runtime.syncAccountsV2ClientAuthUid).toHaveBeenCalledWith('uid-a', gate.isAccountsV2ClientEnabled);
    await expect(gate.beginAccountsV2DeletionIfEnabled('uid-a')).resolves.toEqual(expect.objectContaining({ capability: 'c' }));
    // Флаг выключили живьём: загруженный клиент всё равно получает событие (и сам остановится).
    flags.applyRemoteConfigSnapshot({ bools: {} });
    gate.syncAccountsV2ClientAuth(null);
    expect(runtime.syncAccountsV2ClientAuthUid).toHaveBeenLastCalledWith(null, gate.isAccountsV2ClientEnabled);
  });

  test('authority startup resume coalesces repeated UID/foreground emissions while one resume is in flight', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const client = {
      resumeAccountAuthorityProviderSession: jest.fn()
        .mockImplementationOnce(() => pending)
        .mockResolvedValue(undefined),
    };
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');

    gate.resumeAccountAuthorityProviderSessionIfIdle(client);
    gate.resumeAccountAuthorityProviderSessionIfIdle(client);
    gate.resumeAccountAuthorityProviderSessionIfIdle(client);
    expect(client.resumeAccountAuthorityProviderSession).toHaveBeenCalledTimes(1);

    release();
    await pending;
    await Promise.resolve();
    // Coalescing retains one trailing read so a UID change emitted during the
    // first currentIdentity call cannot be lost when no later event fires.
    expect(client.resumeAccountAuthorityProviderSession).toHaveBeenCalledTimes(2);
  });

  test.each([
    ['ios', true],
    ['android', false],
  ] as const)('%s provider transition bypasses V2 when enabled=%s', async (platform, enabled) => {
    const runtimeFactory = jest.fn(() => ({ runAccountsV2ProviderSignInTransition: jest.fn() }));
    jest.doMock('react-native', () => ({ Platform: { OS: platform } }));
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', runtimeFactory);
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    flags.applyRemoteConfigSnapshot({ bools: enabled ? { accounts_v2_client_enabled: true } : {} });
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    const authenticate = jest.fn(async () => ({ result: 'linked_existing' as const }));

    await expect(gate.runAccountsV2ProviderSignInTransition(authenticate)).resolves.toEqual({ result: 'linked_existing' });
    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(runtimeFactory).not.toHaveBeenCalled();
  });

  test('Android flag ON routes provider transition through the runtime coordinator', async () => {
    const runtime = {
      runAccountsV2ProviderSignInTransition: jest.fn(async (authenticate: () => Promise<unknown>) => authenticate()),
    };
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => runtime);
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    flags.applyRemoteConfigSnapshot({ bools: { accounts_v2_client_enabled: true } });
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    const authenticate = jest.fn(async () => ({ result: 'linked_existing' as const }));

    await expect(gate.runAccountsV2ProviderSignInTransition(authenticate)).resolves.toEqual({ result: 'linked_existing' });
    expect(runtime.runAccountsV2ProviderSignInTransition).toHaveBeenCalledWith(
      authenticate,
      gate.isAccountsV2ClientEnabled,
    );
  });

  test('iOS proof capability routes provider transition through the runtime coordinator', async () => {
    const runtime = {
      runAccountsV2ProviderSignInTransition: jest.fn(async (authenticate: () => Promise<unknown>) => authenticate()),
    };
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    jest.doMock('../modules/account-session-v2/native/account_native_expo_environment', () => ({
      isAccountV2NativePlatformSupported: () => true,
    }));
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => runtime);
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    flags.applyRemoteConfigSnapshot({ bools: { accounts_v2_client_enabled: true } });
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    const authenticate = jest.fn(async () => ({ result: 'linked_existing' as const }));

    await expect(gate.runAccountsV2ProviderSignInTransition(authenticate)).resolves.toEqual({ result: 'linked_existing' });
    expect(runtime.runAccountsV2ProviderSignInTransition).toHaveBeenCalledWith(
      authenticate,
      gate.isAccountsV2ClientEnabled,
    );
  });

  test('iOS flag OFF does not load the native capability gate', async () => {
    const environmentFactory = jest.fn(() => ({ isAccountV2NativePlatformSupported: () => true }));
    jest.doMock('react-native', () => ({ Platform: { OS: 'ios' } }));
    jest.doMock('../modules/account-session-v2/native/account_native_expo_environment', environmentFactory);
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    flags.applyRemoteConfigSnapshot({ bools: {} });
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    const authenticate = jest.fn(async () => ({ result: 'linked_existing' as const }));

    await expect(gate.runAccountsV2ProviderSignInTransition(authenticate)).resolves.toEqual({ result: 'linked_existing' });
    expect(environmentFactory).not.toHaveBeenCalled();
  });

  test('V2 producer is queued immediately so an account switch cannot overtake a card write', async () => {
    jest.useFakeTimers();
    try {
      const runtime = {
        produceAccountsV2Change: jest.fn(async () => undefined),
      };
      jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => runtime);
      const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
      flags.applyRemoteConfigSnapshot({ bools: { accounts_v2_client_enabled: true } });
      const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');

      gate.produceAccountsV2ChangeIfEnabled('uid-a', () => ({
        kind: 'card_snapshot', target: 'en', list: 'saved', cards: [],
      }));

      await Promise.resolve();
      expect(runtime.produceAccountsV2Change).toHaveBeenCalledTimes(1);
      // The gate must hand the mutation to the runtime queue in this turn;
      // a timer would allow an auth transition to overtake it.
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('anonymous Firebase identities are never captured as Account V2 owners', () => {
    jest.doMock('@react-native-firebase/auth', () => ({
      default: () => ({ currentUser: { uid: 'anon-uid', isAnonymous: true } }),
    }));
    const flags = require('../app/remote_flags') as typeof import('../app/remote_flags');
    flags.applyRemoteConfigSnapshot({ bools: { accounts_v2_client_enabled: true } });
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');

    expect(gate.captureAccountsV2OwnerUid()).toBeNull();
  });

  test('runtime deletion: detach latch + a server-valid key land in SecureStore; failures never throw', async () => {
    const secure = new Map<string, string>();
    jest.doMock('expo-secure-store', () => ({
      getItemAsync: async (key: string) => secure.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => { secure.set(key, value); },
      deleteItemAsync: async (key: string) => { secure.delete(key); },
    }));
    const nodeCrypto = jest.requireActual('crypto') as typeof import('crypto');
    jest.doMock('expo-crypto', () => ({
      getRandomBytesAsync: async (count: number) => Uint8Array.from(nodeCrypto.randomBytes(count)),
      randomUUID: () => nodeCrypto.randomUUID(),
    }));
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');
    const credentialModule = require('../modules/account-session-v2/account_deletion_credential') as
      typeof import('../modules/account-session-v2/account_deletion_credential');
    const credential = await runtime.beginAccountsV2Deletion('uid-a', () => true);
    expect(credential).not.toBeNull();
    expect(credentialModule.isStrongAccountsV2Capability(credential!.capability)).toBe(true);
    expect(secure.get(credentialModule.ACCOUNTS_V2_DELETION_CREDENTIAL_KEY)).toContain(credential!.capability);
    // Повтор после перезапуска читает тот же ключ — только своим замком (Пакет 6C).
    await expect(runtime.readStoredAccountsV2DeletionCredential(null)).resolves.toEqual(credential);
    await expect(runtime.readStoredAccountsV2DeletionCredential('lock-op-other')).resolves.toBeNull();
    for (let index = 0; index < 20; index += 1) await new Promise((resolve) => setImmediate(resolve));
    // Хранилище области в этом тесте не открывалось — защёлка остаётся до стирания (будущий запуск).
    expect(secure.get('accounts_v2_detach_latch_v1')).toContain('uid-a');
    jest.dontMock('expo-secure-store');
    jest.dontMock('expo-crypto');
  });

  test('deletion: V2 detaches after the point of no return, BEFORE the local wipe and the network', () => {
    const body = functionBody(read('app/auth_provider.ts'), 'async function prepareAccountDeletion(');
    const guard = body.indexOf('if (!isProvablyAnonymousAccount && !pendingDeleteLock) return null;');
    const detach = body.indexOf('beginAccountsV2DeletionIfEnabled(');
    // Пакет 6C: ключ V2 привязан к operationId замка удаления.
    expect(body).toContain('pendingDeleteLock?.operationId ?? null,');
    const wipe = body.indexOf('wipeAndVerifyPostDeleteLocalData(');
    const network = body.indexOf('startCloudDeletionEnqueue(');
    expect(guard).toBeGreaterThan(0);
    expect(detach).toBeGreaterThan(guard);
    expect(detach).toBeLessThan(wipe);
    expect(detach).toBeLessThan(network);
    // Между guard и отсоединением нет ни одного await: отсоединение синхронное.
    expect(body.slice(guard, detach)).not.toContain('await');
    // Флаг выключен → вызов enqueue прежний, с двумя аргументами (третий — только с ключом V2).
    expect(body).toContain('const accountsV2EnqueueArgs: [] | [AccountDeleteCredentialProof] = accountsV2Deletion ? [accountsV2Deletion] : [];');
    // зачем (52429d419, 12.10): связанные — прежний вызов; гость передаёт свой дедлайн четвёртым аргументом,
    // поэтому ключ V2 у него явно (`?? null` → без ключа запрос байт-в-байт прежний, см. тест ниже).
    expect(body).toContain(': startCloudDeletionEnqueue(pendingDeleteStableId, enqueueProof, ...accountsV2EnqueueArgs);');
    expect(body).toContain('? startCloudDeletionEnqueue(pendingDeleteStableId, enqueueProof, accountsV2Deletion ?? null, {');
  });

  test('retry after restart resends the stored V2 key; fast phase waits at most 250 ms', () => {
    const source = read('app/auth_provider.ts');
    const retry = functionBody(source, 'async function ensureAccountDeleteCredentialSafe(');
    const readKey = retry.indexOf('readStoredAccountsV2DeletionCredentialIfEnabled(lock.operationId)');
    const send = retry.indexOf('startCloudDeletionEnqueue(lock.stableId, proof, ...retryAccountsV2Args)');
    expect(readKey).toBeGreaterThan(0);
    expect(send).toBeGreaterThan(readKey);
    expect(source).toContain('const ACCOUNTS_V2_KEY_FAST_WAIT_MS = 250;');
    const prepare = functionBody(source, 'async function prepareAccountDeletion(');
    expect(prepare).toContain('withLocalStepDeadline(() => accountsV2DeletionPending, null, ACCOUNTS_V2_KEY_FAST_WAIT_MS)');
  });

  test('flag OFF: the restart retry does not load the V2 client either', () => {
    const factory = jest.fn(() => ({ readStoredAccountsV2DeletionCredential: jest.fn() }));
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', factory);
    const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
    expect(gate.readStoredAccountsV2DeletionCredentialIfEnabled('lock-op')).toBeNull();
    gate.clearStoredAccountsV2DeletionCredentialIfEnabled('lock-op');
    expect(factory).not.toHaveBeenCalled();
  });

  test('enqueue request carries accountsV2Deletion only when a V2 key exists', () => {
    // зачем (52429d419): в подписи появились комментарий со скобкой и `options?: Readonly<{ … }>` — тело ищем от типа возврата.
    const body = functionBody(read('app/cloud_sync.ts'), '): AccountDeleteEnqueueOperation<AccountDeleteEnqueueAck> {');
    expect(body).toContain('accountsV2Deletion: { operationId: accountsV2Deletion.operationId, capability: accountsV2Deletion.capability }');
    expect(body).toContain(': { stableId, ...proof });');
  });

  test('root layout wakes the V2 client only after the first content frame', () => {
    const layout = read('app/_layout.tsx');
    const at = layout.indexOf('syncAccountsV2ClientAuth(spireAuthenticatedUid)');
    expect(at).toBeGreaterThan(0);
    const effect = layout.slice(layout.lastIndexOf('useEffect(() => {', at), at);
    expect(effect).toContain('if (!ready || !firstContentReady)');
    // Поздний «Пульт» и живое выключение доходят до клиента; foreground снимает залипшую паузу.
    expect(layout.slice(at, at + 600)).toContain(
      '}, [accountsV2ClientFlag, appIsActive, firstContentReady, ready, spireAuthenticatedUid]);',
    );
    expect(layout).toContain("onAppEvent('remote_config_changed', () => setAccountsV2ClientFlag(isAccountsV2ClientEnabled()))");
    expect(layout).toContain('useState(false);');
    // Тяжёлый клиент не импортируется статически ни одним файлом приложения.
    for (const file of ['app/_layout.tsx', 'app/auth_provider.ts', 'app/cloud_sync.ts', 'app/accounts_v2_client_flag.ts']) {
      expect(read(file)).not.toMatch(/^import[^;]*accounts_v2_client_runtime/m);
      expect(read(file)).not.toMatch(/^import[^;]*account-session-v2/m);
    }
  });

  test('auth provider delegates provider mutations through the Account Authority cutover seam', () => {
    const source = read('app/auth_provider.ts');
    const signIn = functionBody(source, 'export async function signInWithProvider(');
    const signOut = functionBody(source, 'export async function signOutCurrentProvider(');
    const recoveryMismatch = functionBody(source, 'async function rejectRecoveryProviderMismatch(');
    expect(signIn).toContain('runAccountAuthorityProviderSignInTransition(');
    expect(signOut).toContain('runAccountAuthorityProviderSignOutTransition(');
    expect(signIn).not.toContain('syncAccountsV2ClientAuth(');
    expect(signOut).not.toContain('syncAccountsV2ClientAuth(null)');
    // Recovery can run from inside the queued sign-in callback. Re-entering the
    // public coordinator there would deadlock on its own FIFO slot.
    expect(recoveryMismatch).toContain('await performCurrentProviderSignOut();');
    expect(recoveryMismatch).not.toContain('await signOutCurrentProvider();');

    const gate = read('app/accounts_v2_client_flag.ts');
    expect(gate).toContain("Platform.OS === 'android'");
    expect(gate).toContain('isAccountV2NativePlatformSupported()');
    expect(gate).toContain('client.runAccountsV2ProviderSignInTransition(');
    expect(gate).toContain('client.runAccountsV2ProviderSignOutTransition(');

    const runtime = read('modules/account-session-v2/accounts_v2_client_runtime.ts');
    const currentUid = functionBody(runtime, 'function currentAuthUid(');
    expect(currentUid).toContain('user?.isAnonymous !== false');
    expect(currentUid).toContain('return null');
  });

  test('account-switch quarantine recovery delegates cold-boot sign-out to the same authority seam', () => {
    const source = read('app/account_switch_quarantine.ts');
    const body = functionBody(source, 'export function resumeRuntimeAccountSwitchQuarantine()');
    const signOut = functionBody(body, 'signOut: async () =>');
    expect(signOut).toContain('await accountsV2.runAccountsV2ProviderSignOutTransition(');
    expect(signOut).toContain('if (auth?.currentUser) await auth.signOut();');
  });

});
