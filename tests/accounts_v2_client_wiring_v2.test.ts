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
  afterEach(() => { log.mockRestore(); warn.mockRestore(); jest.dontMock('../modules/account-session-v2/accounts_v2_client_runtime'); });

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
    expect(body).toContain('...accountsV2EnqueueArgs,');
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
    const body = functionBody(read('app/cloud_sync.ts'), 'export function startCloudDeletionEnqueue(');
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
});
