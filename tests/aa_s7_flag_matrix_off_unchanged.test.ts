import fs from 'fs';
import path from 'path';

/*
 * Account Authority 2.0, этап S7 (TG-E7105CAE3E22): выключенная система ничего не меняет.
 *
 * Поведенческая матрица «cutover OFF (константа) × Account V2 (`accounts_v2_client_enabled`)
 * OFF/ON × платформа» для четырёх действий — вход, выход, смена аккаунта, удаление — плюс
 * холодный старт. Каждый внешний эффект пишется в общий журнал:
 *   - Firebase Auth / провайдер (`provider:*`, `firebase:*`);
 *   - клиент V2 (`V2.*`) и загрузка модулей (`require:*`);
 *   - Account Authority (`AA:*`, `require:AA/*`);
 *   - SecureStore (`secure:<op>:<key>`), callables (`callable:<name>`), AppState-слушатели.
 * Журнал сравнивается с эталоном старого пути целиком (порядок важен).
 *
 * Эталон старого пути (до Account Authority, коммит c6e32459b^ + провайдерный переход V2):
 *   - V2 OFF — провайдер вызывается напрямую, клиент V2 не грузится, ни чтений, ни сети;
 *   - V2 ON  — только функции клиента V2 (синхронизация uid, провайдерный переход V2 там,
 *     где нативная область доказана, ключ удаления V2), и НИЧЕГО из Account Authority:
 *     ни bootstrap, ни runtime AA, ни ключей SecureStore AA, ни AA-callable.
 *
 * Решение S7 по bootstrap: при cutover OFF bootstrap AA не нужен ни в одном положении V2
 * (его потребители — только функции AA за воротами cutover), поэтому он снят под воротами
 * с логом `[AA-S7] bootstrap skip`. До правки ячейки «V2 ON» этого файла были красными.
 */

const ROOT = path.resolve(__dirname, '..');
const AA_DIR = 'modules/account-authority-v2';
const AA_MODULES = fs.readdirSync(path.join(ROOT, AA_DIR))
  .filter((file) => file.endsWith('.ts'))
  .map((file) => file.replace(/\.ts$/, ''))
  .sort();
const AA_SECURE_KEY = /account_authority/;
const AA_CALLABLE = /^accountAuthority/;

type Platform = 'android' | 'ios';
type Action = 'cold_start' | 'sign_in' | 'sign_out' | 'switch' | 'delete';
type Gate = typeof import('../app/accounts_v2_client_flag');

const flush = async (): Promise<void> => {
  for (let index = 0; index < 6; index += 1) await new Promise((resolve) => setImmediate(resolve));
};

const uidLabel = (uid: string | null): string => (uid === null ? 'null' : 'uid');

function journaledSecureStore(journal: string[]) {
  const store = new Map<string, string>();
  const note = (op: string, key: unknown) => journal.push(`secure:${op}:${String(key)}`);
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    getItem: (key: string) => { note('getItem', key); return store.get(key) ?? null; },
    setItem: (key: string, value: string) => { note('setItem', key); store.set(key, value); },
    getItemAsync: async (key: string) => { note('getItemAsync', key); return store.get(key) ?? null; },
    setItemAsync: async (key: string, value: string) => { note('setItemAsync', key); store.set(key, value); },
    deleteItemAsync: async (key: string) => { note('deleteItemAsync', key); store.delete(key); },
  };
}

function journaledFunctions(journal: string[]) {
  const httpsCallable = (_functions: unknown, name: string) => {
    journal.push(`callable:${name}`);
    return async () => ({ data: {} });
  };
  const getFunctions = () => ({ httpsCallable });
  return { __esModule: true, default: getFunctions, getFunctions, httpsCallable };
}

function journaledAuth(journal: string[], user: () => Readonly<{ uid: string; isAnonymous: boolean }> | null) {
  const instance = {
    get currentUser() { return user(); },
    signOut: async () => { journal.push('firebase:signOut'); },
  };
  const factory = () => instance;
  return { __esModule: true, default: factory };
}

/** Общие моки окружения: платформа, флаг «Пульта», SecureStore, Firebase, нативная среда V2. */
function mockEnvironment(journal: string[], platform: Platform, v2: boolean, iosProofSupported: boolean): void {
  jest.doMock('react-native', () => ({
    Platform: { OS: platform, select: (choices: Record<string, unknown>) => choices[platform] ?? choices.default },
    AppState: {
      currentState: 'active',
      addEventListener: () => { journal.push('AppState.addEventListener'); return { remove: () => undefined }; },
    },
  }));
  jest.doMock('../app/remote_flags', () => ({
    getRemoteBool: (key: string) => (key === 'accounts_v2_client_enabled' ? v2 : false),
  }));
  jest.doMock('expo-secure-store', () => journaledSecureStore(journal));
  jest.doMock('@react-native-firebase/functions', () => journaledFunctions(journal));
  jest.doMock('@react-native-firebase/app', () => ({ __esModule: true, getApp: () => ({}), default: () => ({}) }));
  jest.doMock('@react-native-firebase/auth', () => journaledAuth(journal, () => ({ uid: 'firebase-user-a', isAnonymous: false })));
  jest.doMock('../modules/account-session-v2/native/account_native_expo_environment', () => {
    journal.push('require:V2/native_env');
    return {
      isAccountV2NativePlatformSupported: () => { journal.push('V2/native_env.isSupported'); return iosProofSupported; },
      isAccountV2IosProofBuild: () => false,
      // Нативной области в node нет: клиент V2 обязан отработать fail-closed, без AA.
      createExpoAccountNativeEnvironment: () => { journal.push('V2/native_env.create'); return null; },
    };
  });
}

/** Каждый модуль AA: факт загрузки и любой вызов попадают в журнал. */
function mockAccountAuthorityModules(journal: string[]): void {
  for (const name of AA_MODULES) {
    jest.doMock(`../${AA_DIR}/${name}`, () => {
      journal.push(`require:AA/${name}`);
      return new Proxy({}, {
        get: (_target, property) => {
          if (property === '__esModule' || property === 'then' || typeof property === 'symbol') return undefined;
          return (..._args: unknown[]) => { journal.push(`AA/${name}.${String(property)}`); return undefined; };
        },
      });
    });
  }
}

/** Клиент V2: функции V2 ведут себя как настоящие по контракту, функции AA только журналятся. */
function mockAccountsV2Runtime(journal: string[]): void {
  jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => {
    journal.push('require:V2/runtime');
    const aa = (name: string, value: unknown) => (..._args: unknown[]) => { journal.push(`AA:${name}`); return value; };
    return {
      syncAccountsV2ClientAuthUid: (uid: string | null) => { journal.push(`V2.syncAccountsV2ClientAuthUid(${uidLabel(uid)})`); },
      runAccountsV2ProviderSignInTransition: async (authenticate: () => Promise<unknown>) => {
        journal.push('V2.runAccountsV2ProviderSignInTransition');
        return authenticate();
      },
      runAccountsV2ProviderSignOutTransition: async (authenticate: () => Promise<void>) => {
        journal.push('V2.runAccountsV2ProviderSignOutTransition');
        return authenticate();
      },
      beginAccountsV2Deletion: async () => {
        journal.push('V2.beginAccountsV2Deletion');
        return { operationId: 'acv2del_aaaaaaaaaaaaaaaa', capability: 'capability' };
      },
      readStoredAccountsV2DeletionCredential: async () => { journal.push('V2.readStoredAccountsV2DeletionCredential'); return null; },
      clearStoredAccountsV2DeletionCredential: async () => { journal.push('V2.clearStoredAccountsV2DeletionCredential'); return true; },
      accountsV2OpenScopeUid: () => { journal.push('V2.accountsV2OpenScopeUid'); return null; },
      produceAccountsV2Change: async () => { journal.push('V2.produceAccountsV2Change'); },
      installAccountAuthorityProductionBootstrapIfPossible: aa('installAccountAuthorityProductionBootstrapIfPossible', Promise.resolve(true)),
      installAccountAuthorityClientBootstrap: aa('installAccountAuthorityClientBootstrap', undefined),
      runAccountAuthorityProviderSignInTransition: aa('runAccountAuthorityProviderSignInTransition', Promise.resolve({ result: 'linked_existing' })),
      runAccountAuthorityProviderSignOutTransition: aa('runAccountAuthorityProviderSignOutTransition', Promise.resolve()),
      runAccountAuthorityDeleteTransition: aa('runAccountAuthorityDeleteTransition', Promise.resolve({ result: 'local_deleted', operationId: 'op' })),
      resumeAccountAuthorityProviderSession: aa('resumeAccountAuthorityProviderSession', Promise.resolve()),
      resolveAccountAuthorityRemoteDeleteByLegacyDeletion: aa('resolveAccountAuthorityRemoteDeleteByLegacyDeletion', false),
      accountAuthorityRemoteDeleteState: aa('accountAuthorityRemoteDeleteState', null),
    };
  });
}

/** Действия — в том порядке, в каком их зовут auth_provider, account_switch_quarantine и _layout. */
const ACTIONS: Readonly<Record<Action, (gate: Gate, journal: string[]) => Promise<void>>> = {
  // _layout: после первого кадра, uid известен.
  cold_start: async (gate) => {
    gate.syncAccountsV2ClientAuth('firebase-user-a');
    await flush();
  },
  // auth_provider.signInWithProvider → шов (authority-колбэк, старый колбэк); затем _layout видит новый uid.
  sign_in: async (gate, journal) => {
    const result = await gate.runAccountAuthorityProviderSignInTransition(
      async () => { journal.push('provider:authority_authenticate'); return { result: 'linked_existing' as const }; },
      async () => { journal.push('provider:legacy_authenticate'); return { result: 'linked_existing' as const }; },
    );
    journal.push(`result:sign_in=${result.result}`);
    gate.syncAccountsV2ClientAuth('firebase-user-b');
    await flush();
  },
  // auth_provider.signOutCurrentProvider → шов выхода; затем _layout видит null.
  sign_out: async (gate, journal) => {
    await gate.runAccountAuthorityProviderSignOutTransition(async () => { journal.push('firebase:signOut'); });
    gate.syncAccountsV2ClientAuth(null);
    await flush();
  },
  // account_switch_quarantine: выход через совместимый экспорт, затем вход в другой аккаунт.
  switch: async (gate, journal) => {
    gate.syncAccountsV2ClientAuth('firebase-user-a');
    await gate.runAccountsV2ProviderSignOutTransition(async () => { journal.push('firebase:signOut'); });
    gate.syncAccountsV2ClientAuth(null);
    const result = await gate.runAccountsV2ProviderSignInTransition(
      async () => { journal.push('provider:authority_authenticate'); return { result: 'linked_existing' as const }; },
      async () => { journal.push('provider:legacy_authenticate'); return { result: 'linked_existing' as const }; },
    );
    journal.push(`result:sign_in=${result.result}`);
    gate.syncAccountsV2ClientAuth('firebase-user-b');
    await flush();
  },
  // auth_provider: удаление (AA → V2-ключ → подтверждение сервера → повтор после перезапуска).
  delete: async (gate, journal) => {
    const authority = gate.beginAccountAuthorityDeletionIfEnabled();
    journal.push(`result:aa_deletion=${authority === null ? 'null' : 'promise'}`);
    const pending = gate.beginAccountsV2DeletionIfEnabled('firebase-user-a', 'lock-operation-a');
    const credential = pending === null ? null : await pending;
    journal.push(`result:v2_deletion=${pending === null ? 'null' : credential === null ? 'no_key' : 'key'}`);
    gate.resolveAccountAuthorityDeletionByLegacyIfEnabled('acv2del_aaaaaaaaaaaaaaaa');
    gate.clearStoredAccountsV2DeletionCredentialAfterAckIfEnabled('lock-operation-a', {
      ok: true, jobId: 'job-a', authReleased: true, credentialSafe: true,
    });
    const retry = gate.readStoredAccountsV2DeletionCredentialIfEnabled('lock-operation-a');
    journal.push(`result:v2_retry=${retry === null ? 'null' : 'promise'}`);
    if (retry !== null) await retry;
    gate.syncAccountsV2ClientAuth(null);
    await flush();
  },
};

const SIGN_IN_RESULT = 'result:sign_in=linked_existing';

/** Эталон старого пути. V2 OFF одинаков на всех платформах. */
const LEGACY_V2_OFF: Readonly<Record<Action, readonly string[]>> = {
  cold_start: [],
  sign_in: ['provider:legacy_authenticate', SIGN_IN_RESULT],
  sign_out: ['firebase:signOut'],
  switch: ['firebase:signOut', 'provider:legacy_authenticate', SIGN_IN_RESULT],
  delete: ['result:aa_deletion=null', 'result:v2_deletion=null', 'result:v2_retry=null'],
};

const V2_DELETE = [
  'result:aa_deletion=null',
  'require:V2/runtime',
  'V2.beginAccountsV2Deletion',
  'result:v2_deletion=key',
  'V2.clearStoredAccountsV2DeletionCredential',
  'V2.readStoredAccountsV2DeletionCredential',
  'result:v2_retry=promise',
  'V2.syncAccountsV2ClientAuthUid(null)',
];

/** Android: нативная область V2 доказана — провайдерные переходы идут через клиент V2. */
const LEGACY_V2_ON_ANDROID: Readonly<Record<Action, readonly string[]>> = {
  cold_start: ['require:V2/runtime', 'V2.syncAccountsV2ClientAuthUid(uid)'],
  sign_in: [
    'require:V2/runtime', 'V2.runAccountsV2ProviderSignInTransition', 'provider:legacy_authenticate', SIGN_IN_RESULT,
    'V2.syncAccountsV2ClientAuthUid(uid)',
  ],
  sign_out: [
    'require:V2/runtime', 'V2.runAccountsV2ProviderSignOutTransition', 'firebase:signOut',
    'V2.syncAccountsV2ClientAuthUid(null)',
  ],
  switch: [
    'require:V2/runtime', 'V2.syncAccountsV2ClientAuthUid(uid)',
    'V2.runAccountsV2ProviderSignOutTransition', 'firebase:signOut',
    'V2.syncAccountsV2ClientAuthUid(null)',
    'V2.runAccountsV2ProviderSignInTransition', 'provider:legacy_authenticate', SIGN_IN_RESULT,
    'V2.syncAccountsV2ClientAuthUid(uid)',
  ],
  delete: V2_DELETE,
};

/** Обычный iOS (не proof-сборка): переходы V2 обходятся после проверки возможности. */
const LEGACY_V2_ON_IOS: Readonly<Record<Action, readonly string[]>> = {
  cold_start: ['require:V2/runtime', 'V2.syncAccountsV2ClientAuthUid(uid)'],
  sign_in: [
    'require:V2/native_env', 'V2/native_env.isSupported', 'provider:legacy_authenticate', SIGN_IN_RESULT,
    'require:V2/runtime', 'V2.syncAccountsV2ClientAuthUid(uid)',
  ],
  sign_out: [
    'require:V2/native_env', 'V2/native_env.isSupported', 'firebase:signOut',
    'require:V2/runtime', 'V2.syncAccountsV2ClientAuthUid(null)',
  ],
  switch: [
    'require:V2/runtime', 'V2.syncAccountsV2ClientAuthUid(uid)',
    'require:V2/native_env', 'V2/native_env.isSupported', 'firebase:signOut',
    'V2.syncAccountsV2ClientAuthUid(null)',
    'V2/native_env.isSupported', 'provider:legacy_authenticate', SIGN_IN_RESULT,
    'V2.syncAccountsV2ClientAuthUid(uid)',
  ],
  delete: V2_DELETE,
};

function expectedJournal(platform: Platform, v2: boolean, action: Action): readonly string[] {
  if (!v2) return LEGACY_V2_OFF[action];
  return platform === 'android' ? LEGACY_V2_ON_ANDROID[action] : LEGACY_V2_ON_IOS[action];
}

/** Инварианты «cutover OFF»: ни следа Account Authority в журнале. */
function expectNoAccountAuthority(journal: readonly string[]): void {
  expect(journal.filter((entry) => entry.startsWith('AA') || entry.startsWith('require:AA/'))).toEqual([]);
  expect(journal.filter((entry) => entry.startsWith('secure:') && AA_SECURE_KEY.test(entry))).toEqual([]);
  expect(journal.filter((entry) => entry.startsWith('callable:') && AA_CALLABLE.test(entry.slice('callable:'.length)))).toEqual([]);
  expect(journal).not.toContain('AppState.addEventListener');
  expect(journal).not.toContain('provider:authority_authenticate');
}

const CELLS: ReadonlyArray<readonly [Platform, boolean, Action]> = (['android', 'ios'] as const).flatMap((platform) =>
  [false, true].flatMap((v2) =>
    (['cold_start', 'sign_in', 'sign_out', 'switch', 'delete'] as const).map((action) => [platform, v2, action] as const)));

describe('AA S7: cutover OFF — поведение входа/выхода/смены/удаления равно старому пути', () => {
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
    warn.mockRestore();
    for (const name of AA_MODULES) jest.dontMock(`../${AA_DIR}/${name}`);
    for (const name of [
      'react-native', '../app/remote_flags', 'expo-secure-store', '@react-native-firebase/functions',
      '@react-native-firebase/app', '@react-native-firebase/auth',
      '../modules/account-session-v2/native/account_native_expo_environment',
      '../modules/account-session-v2/accounts_v2_client_runtime',
      '../modules/account-session-v2/account_authority_production_adapter',
    ]) jest.dontMock(name);
  });

  test.each(CELLS)('%s · V2=%s · %s: журнал равен эталону, следов AA нет', async (platform, v2, action) => {
    const journal: string[] = [];
    mockEnvironment(journal, platform, v2, false);
    mockAccountAuthorityModules(journal);
    mockAccountsV2Runtime(journal);
    const gate = require('../app/accounts_v2_client_flag') as Gate;
    expect(gate.isAccountAuthorityV2CutoverEnabled()).toBe(false);

    await ACTIONS[action](gate, journal);

    expectNoAccountAuthority(journal);
    expect(journal).toEqual(expectedJournal(platform, v2, action));
  });

  test('сторож: при cutover OFF шов не грузит ни одного модуля modules/account-authority-v2/** во всей матрице', async () => {
    expect(AA_MODULES.length).toBeGreaterThanOrEqual(13);
    const journal: string[] = [];
    mockEnvironment(journal, 'android', true, true);
    mockAccountAuthorityModules(journal);
    mockAccountsV2Runtime(journal);
    const gate = require('../app/accounts_v2_client_flag') as Gate;
    for (const action of ['cold_start', 'sign_in', 'sign_out', 'switch', 'delete'] as const) {
      await ACTIONS[action](gate, journal);
    }
    expect(journal.filter((entry) => entry.startsWith('require:AA/'))).toEqual([]);
    expect(journal).not.toContain('AA:installAccountAuthorityProductionBootstrapIfPossible');
  });

  test('bootstrap AA при V2 ON без cutover снят: лог [AA-S7] с причиной, без SecureStore', async () => {
    const journal: string[] = [];
    mockEnvironment(journal, 'android', true, true);
    mockAccountAuthorityModules(journal);
    mockAccountsV2Runtime(journal);
    const gate = require('../app/accounts_v2_client_flag') as Gate;

    await expect(gate.installAccountAuthorityProductionBootstrapIfPossible()).resolves.toBe(false);
    await expect(gate.installAccountAuthorityProductionBootstrapIfPossible()).resolves.toBe(false);

    expect(journal).toEqual([]);
    const lines = log.mock.calls.map((args) => args.join(' '));
    expect(lines).toContain('[AA-S7] bootstrap skip reason=cutover_off v2=on');
    expect(lines.join('\n')).not.toMatch(/firebase-user|uid=/);
  });

  test('bootstrap при V2 OFF: тот же ранний выход, лог видит v2=off', async () => {
    const journal: string[] = [];
    mockEnvironment(journal, 'android', false, true);
    mockAccountAuthorityModules(journal);
    mockAccountsV2Runtime(journal);
    const gate = require('../app/accounts_v2_client_flag') as Gate;
    await expect(gate.installAccountAuthorityProductionBootstrapIfPossible()).resolves.toBe(false);
    expect(journal).toEqual([]);
    expect(log.mock.calls.map((args) => args.join(' '))).toContain('[AA-S7] bootstrap skip reason=cutover_off v2=off');
  });

  test('настоящий клиент V2 (V2 ON, cutover OFF): ни bootstrap AA, ни ключей SecureStore AA, ни AA-callable', async () => {
    const journal: string[] = [];
    mockEnvironment(journal, 'android', true, true);
    jest.doMock('../modules/account-session-v2/account_authority_production_adapter', () => {
      journal.push('require:V2/production_adapter');
      return {
        createAccountAuthorityProductionBootstrapIfPossible: async () => {
          journal.push('AA:production_bootstrap');
          return null;
        },
      };
    });
    const gate = require('../app/accounts_v2_client_flag') as Gate;
    for (const action of ['cold_start', 'sign_in', 'sign_out', 'switch', 'delete'] as const) {
      try {
        await ACTIONS[action](gate, journal);
      } catch (error) {
        // зачем: исход настоящего V2 без нативной области не предмет S7; важен только журнал.
        journal.push(`result:${action}_threw=${error instanceof Error ? error.message : typeof error}`);
      }
    }
    await flush();

    // Настоящий runtime статически импортирует AA (только при V2 ON) — но ничего из AA не исполняет.
    expect(journal).toContain('require:V2/production_adapter');
    expect(journal).not.toContain('AA:production_bootstrap');
    expect(journal.filter((entry) => entry.startsWith('secure:') && AA_SECURE_KEY.test(entry))).toEqual([]);
    expect(journal.filter((entry) => entry.startsWith('callable:') && AA_CALLABLE.test(entry.slice('callable:'.length)))).toEqual([]);
    expect(journal).not.toContain('AppState.addEventListener');
    expect(journal).not.toContain('provider:authority_authenticate');
    // Старый колбэк провайдера дошёл в обоих входах матрицы.
    expect(journal.filter((entry) => entry === 'provider:legacy_authenticate')).toHaveLength(2);
  });

  test('замер: что делал снятый bootstrap на чистом устройстве (стоимость, которой при cutover OFF больше нет)', async () => {
    const journal: string[] = [];
    const secure = journaledSecureStore(journal);
    const adapter = require('../modules/account-session-v2/account_authority_production_adapter') as
      typeof import('../modules/account-session-v2/account_authority_production_adapter');
    const { MemoryScopeStorageAdapter } = require('../modules/account-session-v2/testing/memory_scope_storage') as
      typeof import('../modules/account-session-v2/testing/memory_scope_storage');
    const unused = (port: string) => async () => { journal.push(`AA:${port}_called`); throw new Error('not_used'); };
    const started = Date.now();
    const bootstrap = await adapter.createAccountAuthorityProductionBootstrap({
      secureStore: secure,
      createStorageAdapter: () => new MemoryScopeStorageAdapter(),
      randomInstallationId: async () => '5d3b3527-07e0-4dc1-8aac-000000000001',
      digestSha256: async (value: string) => `hash-${Buffer.from(value).toString('hex').slice(0, 48)}`,
      createInstallationBinding: () => ({
        readPersistedForLease: unused('binding.read'),
        rotate: unused('binding.rotate'),
        reset: unused('binding.reset'),
        resetForLease: unused('binding.resetForLease'),
        obtain: unused('binding.obtain'),
      }),
      createLease: () => ({
        acquire: unused('lease.acquire'),
        release: unused('lease.release'),
        deleteAccount: unused('lease.deleteAccount'),
      }),
      providerSignOut: async () => undefined,
    });
    await flush();
    const ops = journal.filter((entry) => entry.startsWith('secure:'));
    const count = (op: string) => ops.filter((entry) => entry.startsWith(`secure:${op}:`)).length;
    const summary = {
      composed: bootstrap !== null,
      syncReads: count('getItem'),
      syncWrites: count('setItem'),
      asyncReads: count('getItemAsync'),
      asyncWrites: count('setItemAsync'),
      onlyAccountAuthorityKeys: ops.every((entry) => AA_SECURE_KEY.test(entry)),
      installationIdWritten: ops.includes('secure:setItemAsync:phraseman.account_authority.installation_id.v1'),
      portsCalled: journal.filter((entry) => entry.startsWith('AA:')),
    };
    // Замер для решения S7 (виден в выводе прогона): столько работы с SecureStore делал bootstrap.
    process.stdout.write(`[AA-S7] bootstrap_cost ${JSON.stringify(summary)} wallMs=${Date.now() - started}\n`);
    expect(summary.composed).toBe(true);
    expect(summary.onlyAccountAuthorityKeys).toBe(true);
    expect(summary.installationIdWritten).toBe(true);
    expect(summary.syncReads).toBeGreaterThan(0);
    expect(summary.portsCalled).toEqual([]);
  });
});

/*
 * Сторож по исходнику: при cutover OFF в старом пути статически грузятся ровно два модуля AA,
 * оба — часть отдельного усиления старого входа (S2b: nonce слияния M-1 и безопасный логгер),
 * только память процесса, без SecureStore, без сети, без AA-callable. Всё остальное AA —
 * только лениво и только за воротами cutover.
 */
describe('AA S7: перепись загрузки modules/account-authority-v2 вне клиента V2', () => {
  const SCAN_DIRS = ['app', 'components', 'hooks', 'modules'];
  const SKIP_DIRS = new Set([
    path.join(ROOT, 'modules', 'account-authority-v2'),
    // клиент V2 грузится только при V2 ON (сторож 6B, accounts_v2_client_wiring_v2)
    path.join(ROOT, 'modules', 'account-session-v2'),
  ]);

  const walk = (dir: string): string[] => {
    if (SKIP_DIRS.has(dir) || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
      return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
    });
  };

  const census = (): Record<string, string[]> => {
    const result: Record<string, string[]> = {};
    for (const file of SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))) {
      const source = fs.readFileSync(file, 'utf8');
      const found = new Set<string>();
      const staticImport = /^import\s+(?!type\b)[^;]*?from\s+'[^']*account-authority-v2\/([\w]+)'/gm;
      const lazyRequire = /require\('[^']*account-authority-v2\/([\w]+)'\)/g;
      for (const match of source.matchAll(staticImport)) found.add(`import:${match[1]}`);
      for (const match of source.matchAll(lazyRequire)) found.add(`require:${match[1]}`);
      if (found.size > 0) result[path.relative(ROOT, file).replace(/\\/g, '/')] = [...found].sort();
    }
    return result;
  };

  test('статически AA грузят только auth_provider и cloud_sync, и только nonce M-1 + логгер', () => {
    expect(census()).toEqual({
      'app/accounts_v2_client_flag.ts': [
        'require:account_authority_failure_policy',
        'require:account_authority_logger',
        'require:account_authority_renewal_driver',
      ],
      'app/auth_provider.ts': ['import:account_authority_anon_merge_nonce', 'import:account_authority_logger'],
      'app/cloud_sync.ts': ['import:account_authority_anon_merge_nonce'],
    });
  });

  test('разрешённые на старом пути модули AA — только память: без SecureStore, хранилища, сети и других AA', () => {
    for (const name of ['account_authority_anon_merge_nonce', 'account_authority_logger']) {
      const source = fs.readFileSync(path.join(ROOT, AA_DIR, `${name}.ts`), 'utf8');
      // Комментарии не в счёт (nonce-модуль прямо пишет «не пишется ни в AsyncStorage, ни в SecureStore»).
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/expo-secure-store|AsyncStorage|SecureStore|httpsCallable|@react-native-firebase|require\(/);
      const imports = [...source.matchAll(/^import\s+[^;]*?from\s+'([^']+)'/gm)].map((match) => match[1]);
      expect(imports.every((target) => target === './account_authority_logger')).toBe(true);
    }
  });

  test('ленивые require AA в шве живут только в драйвере продления, а он вызывается только за воротами cutover', () => {
    const gate = fs.readFileSync(path.join(ROOT, 'app/accounts_v2_client_flag.ts'), 'utf8');
    const driverStart = gate.indexOf('function accountAuthorityRenewalDriver(');
    const driverEnd = gate.indexOf('function installAccountAuthorityForegroundRenewal(');
    expect(driverStart).toBeGreaterThan(-1);
    expect(driverEnd).toBeGreaterThan(driverStart);
    const outside = gate.slice(0, driverStart) + gate.slice(driverEnd);
    expect(outside).not.toMatch(/require\('[^']*account-authority-v2\//);

    const sync = gate.slice(gate.indexOf('export function syncAccountsV2ClientAuth('));
    const syncBody = sync.slice(0, sync.indexOf('\n}\n'));
    const cutoverBranch = syncBody.indexOf('if (isAccountAuthorityV2CutoverEnabled()) {');
    expect(cutoverBranch).toBeGreaterThan(-1);
    const callers = [...gate.matchAll(/accountAuthorityRenewalDriver\(resume\)|installAccountAuthorityForegroundRenewal\(resume\)/g)]
      .map((match) => match.index ?? -1);
    const syncOffset = gate.indexOf('export function syncAccountsV2ClientAuth(');
    const legacyTail = syncOffset + syncBody.indexOf('const client = loadAccountsV2ClientIfEnabled();');
    // Вызовы драйвера: внутри шлюза foreground (сам ставится только из ветки cutover) и внутри ветки cutover.
    for (const index of callers) {
      const inForegroundInstaller = index > driverEnd && index < gate.indexOf('// Owner gate');
      const inCutoverBranch = index > syncOffset + cutoverBranch && index < legacyTail;
      expect(inForegroundInstaller || inCutoverBranch).toBe(true);
    }
  });
});
