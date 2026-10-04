import { createHash } from 'crypto';
import { accountAuthorityGeneration } from '../modules/account-authority-v2/account_authority_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import {
  createAccountAuthorityProductionBootstrap,
  createAccountAuthoritySecureInstallationBindingCredentialStore,
  createAccountAuthoritySecureRevisionStore,
  type AccountAuthorityProductionAdapterDependencies,
} from '../modules/account-session-v2/account_authority_production_adapter';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

// зачем (AA S2b): ключ привязки — sha256 от uid; тест сверяет его настоящим хешем.
function sha256Sync(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
const sha256 = async (value: string): Promise<string> => sha256Sync(value);

type SecureStoreFake = AccountAuthorityProductionAdapterDependencies['secureStore'] & Readonly<{
  keysRead(): readonly string[];
  snapshot(): Readonly<Record<string, string>>;
}>;

function secureStore(initial: Readonly<Record<string, string>> = {}): SecureStoreFake {
  const values = new Map(Object.entries(initial));
  const reads: string[] = [];
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
    getItem: (key) => {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItem: (key, value) => { values.set(key, value); },
    getItemAsync: async (key) => {
      reads.push(key);
      return values.get(key) ?? null;
    },
    setItemAsync: async (key, value) => { values.set(key, value); },
    deleteItemAsync: async (key) => { values.delete(key); },
    keysRead: () => Object.freeze([...reads]),
    snapshot: () => Object.freeze(Object.fromEntries(values)),
  };
}

function dependencies(input: Readonly<{
  secure?: SecureStoreFake;
  storage?: MemoryScopeStorageAdapter | null;
}> = {}): AccountAuthorityProductionAdapterDependencies {
  let random = 0;
  return {
    secureStore: input.secure ?? secureStore(),
    createStorageAdapter: () => input.storage === undefined ? new MemoryScopeStorageAdapter() : input.storage,
    randomInstallationId: async () => `5d3b3527-07e0-4dc1-8aac-${String(++random).padStart(12, '0')}`,
    digestSha256: async (value) => `hash-${Buffer.from(value).toString('hex').slice(0, 48)}`,
    createInstallationBinding: ({ credentials }) => ({
      readPersistedForLease: async (owner) => {
        const persisted = await credentials.readForLease(owner);
        return persisted === null ? null : Object.freeze({
          bindingToken: persisted.bindingToken,
          deviceBindingId: parseDeviceId(persisted.deviceBindingId),
        });
      },
      rotate: async () => { throw new Error('not_used'); },
      reset: async (uid) => credentials.clear(uid),
      resetForLease: async (owner) => credentials.clearForLease(owner),
      obtain: async (uid) => {
        await credentials.write(uid, {
          bindingToken: 'opaque-binding-token',
          deviceBindingId: 'server-device-binding-a',
        });
        return Object.freeze({
          bindingToken: 'opaque-binding-token',
          deviceBindingId: parseDeviceId('server-device-binding-a'),
        });
      },
    }),
    createLease: () => ({
      acquire: async () => { throw new Error('not_used'); },
      release: async () => { throw new Error('account_authority_release_not_wired'); },
      deleteAccount: async () => { throw new Error('account_authority_delete_not_wired'); },
    }),
    providerSignOut: async () => undefined,
  };
}

describe('Account Authority production app integration', () => {
  afterEach(() => {
    jest.dontMock('../modules/account-session-v2/accounts_v2_client_runtime');
    jest.dontMock('../modules/account-session-v2/account_authority_production_adapter');
    jest.dontMock('../app/remote_flags');
    jest.dontMock('react-native');
  });

  test('creates a dedicated device identity without reading or importing stable_id', async () => {
    const secure = secureStore({
      stable_id: 'legacy-stable-owner',
      phraseman_stable_id: 'legacy-stable-owner-2',
    });
    const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies({ secure }));

    expect(bootstrap?.deviceId.value).toBe('5d3b3527-07e0-4dc1-8aac-000000000001');
    expect(secure.keysRead()).not.toContain('stable_id');
    expect(secure.keysRead()).not.toContain('phraseman_stable_id');
    expect(Object.entries(secure.snapshot())).toContainEqual([
      'phraseman.account_authority.installation_id.v1',
      '5d3b3527-07e0-4dc1-8aac-000000000001',
    ]);
  });

  test('rejects a malformed dedicated device identity instead of replacing it', async () => {
    const key = 'phraseman.account_authority.installation_id.v1';
    const secure = secureStore({ [key]: '../legacy-owner' });

    await expect(createAccountAuthorityProductionBootstrap(dependencies({ secure })))
      .rejects.toThrow('account_authority_installation_id_invalid');
    expect(secure.snapshot()[key]).toBe('../legacy-owner');
  });

  test('missing native scope support publishes no bootstrap and creates no fake account', async () => {
    const secure = secureStore();

    await expect(createAccountAuthorityProductionBootstrap(dependencies({ secure, storage: null })))
      .resolves.toBeNull();
    expect(secure.snapshot()).toEqual({});
  });

  test('fails closed when the installed SecureStore lacks synchronous durable metadata writes', async () => {
    const values = new Map<string, string>();
    const asyncOnly = {
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => { values.set(key, value); },
    } as unknown as SecureStoreFake;

    await expect(createAccountAuthorityProductionBootstrap(dependencies({ secure: asyncOnly })))
      .rejects.toThrow('account_authority_secure_store_sync_unavailable');
  });

  test('persists generation and operation fences while writing only authority metadata into the account scope', async () => {
    const secure = secureStore();
    const storage = new MemoryScopeStorageAdapter();
    const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies({ secure, storage }));
    expect(bootstrap).not.toBeNull();
    const store = bootstrap!.localStore;
    const scope = Object.freeze({
      accountId: parseAccountId('account-server-owned'),
      sessionId: parseSessionId('session-server-issued'),
      generation: accountAuthorityGeneration(2),
    });
    const operationId = parseOperationId('operation-lesson-progress');

    store.advanceAuthorityGeneration(scope.generation);
    store.reserveOperation(operationId, 'commit');
    await store.openScope(scope);
    await store.commitPreservedWrite({
      operationId,
      accountId: scope.accountId,
      sessionId: scope.sessionId,
      expectedGeneration: scope.generation,
      domain: 'lesson_progress',
    });

    const records = storage.snapshot('account:account-server-owned');
    expect(records.map((record) => record.key)).toEqual([
      'account_authority.preserved.lesson_progress.operation-lesson-progress',
      'account_authority.scope.v1',
    ]);
    expect(JSON.stringify(records)).not.toMatch(/stable_id|firebase/i);

    const rebound = await createAccountAuthorityProductionBootstrap(dependencies({ secure, storage }));
    expect(rebound!.localStore.getAuthorityGeneration().value).toBe(2);
    expect(rebound!.localStore.getOperationKind(operationId)).toBe('commit');
    await expect(rebound!.localStore.commitPreservedWrite({
      operationId: parseOperationId('operation-stale'),
      accountId: scope.accountId,
      sessionId: scope.sessionId,
      expectedGeneration: accountAuthorityGeneration(1),
      domain: 'lesson_progress',
    })).rejects.toThrow('account_authority_preserved_write_stale');
  });

  test('dedicated lease revision storage returns null when absent and never invents revision zero', async () => {
    const secure = secureStore();
    const revisions = createAccountAuthoritySecureRevisionStore({
      secureStore: secure,
      digestSha256: async () => 'f'.repeat(64),
    });
    const uid = parseFirebaseAuthUid('firebase-existing-account');

    await expect(revisions.read(uid)).resolves.toBeNull();
    expect(Object.values(secure.snapshot())).not.toContain('0');
    await revisions.write(uid, 7);
    await expect(revisions.read(uid)).resolves.toBe(7);
    expect(JSON.stringify(secure.snapshot())).not.toContain(uid.value);
  });

  // зачем (AA S0): release-транспорт читает ревизию конкретной аренды
  // (accountId+sessionId); без неё release падает закрыто. Проверяем, что
  // боевое хранилище это умеет, сдвигает ревизию UID для следующего acquire и
  // не кладёт на диск сырые uid/accountId/sessionId.
  test('lease owner revisions bind, advance on release and keep the uid revision in step', async () => {
    const secure = secureStore();
    const revisions = createAccountAuthoritySecureRevisionStore({
      secureStore: secure,
      digestSha256: async (value) => createHash('sha256').update(value).digest('hex'),
    });
    const uid = parseFirebaseAuthUid('firebase-lease-owner-uid');
    const owner = Object.freeze({
      accountId: parseAccountId('account-lease-owner'),
      sessionId: parseSessionId('session-lease-owner'),
    });
    const otherOwner = Object.freeze({
      accountId: parseAccountId('account-lease-owner'),
      sessionId: parseSessionId('session-lease-other'),
    });

    await expect(revisions.readLease(owner)).resolves.toBeNull();
    await expect(revisions.writeLease(owner, 4))
      .rejects.toThrow('account_authority_lease_revision_unavailable');

    await revisions.bindLease(uid, owner, 3);
    await expect(revisions.readLease(owner)).resolves.toBe(3);
    await expect(revisions.read(uid)).resolves.toBe(3);
    await expect(revisions.readLease(otherOwner)).resolves.toBeNull();

    await revisions.writeLease(owner, 4);
    await expect(revisions.readLease(owner)).resolves.toBe(4);
    await expect(revisions.read(uid)).resolves.toBe(4);

    const stored = JSON.stringify(secure.snapshot());
    expect(stored).not.toContain(uid.value);
    expect(stored).not.toContain(owner.accountId.value);
    expect(stored).not.toContain(owner.sessionId.value);
    await expect(revisions.bindLease(uid, owner, -1))
      .rejects.toThrow('account_authority_lease_revision_unavailable');
  });

  test('a malformed lease owner revision fails closed instead of inventing a revision', async () => {
    const digest = async (value: string) => createHash('sha256').update(value).digest('hex');
    const owner = Object.freeze({
      accountId: parseAccountId('account-lease-owner'),
      sessionId: parseSessionId('session-lease-owner'),
    });
    const ownerHash = await digest('account-authority-lease-owner.v1\u0000account-lease-owner\u0000session-lease-owner');
    const secure = secureStore({
      [`phraseman.account_authority.lease_owner_revision.v1.${ownerHash}`]: JSON.stringify({
        schemaVersion: 'account-authority-lease-owner-revision.v1',
        ownerHash,
        uidHash: 'not-a-hash',
        revision: 2,
      }),
    });
    const revisions = createAccountAuthoritySecureRevisionStore({ secureStore: secure, digestSha256: digest });

    await expect(revisions.readLease(owner)).rejects.toThrow('account_authority_lease_revision_unavailable');
    await expect(revisions.writeLease(owner, 3)).rejects.toThrow('account_authority_lease_revision_unavailable');
  });

  // зачем (AA S0): компенсирующее закрытие scope раньше глушилось немым
  // .catch(() => undefined). Наружу уходит исходная ошибка, а причина сбоя
  // закрытия обязана попасть в лог без идентификаторов.
  test('open scope compensation close failure is logged and the original failure is rethrown', async () => {
    const storage = new MemoryScopeStorageAdapter();
    const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies({ storage }));
    const scope = Object.freeze({
      accountId: parseAccountId('account-compensation'),
      sessionId: parseSessionId('session-compensation'),
      generation: accountAuthorityGeneration(1),
    });
    bootstrap!.localStore.advanceAuthorityGeneration(scope.generation);
    storage.failNext('transaction', 'account:account-compensation', 'transaction_down');
    storage.failNext('close', 'account:account-compensation', 'close_down');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const failure = await bootstrap!.localStore.openScope(scope).catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(Error);
      expect(String(failure)).not.toContain('close');
      const lines = warn.mock.calls.map((call) => String(call[0]));
      expect(lines.some((line) => line.startsWith('[ACCOUNT-AUTHORITY] local_store open_scope_metadata_failed'))).toBe(true);
      expect(lines.some((line) => line.startsWith('[ACCOUNT-AUTHORITY] local_store open_scope_compensation_close_failed')
        && line.includes('code=account_scope_close_failed'))).toBe(true);
      expect(lines.join('\n')).not.toContain('account-compensation');
      expect(lines.join('\n')).not.toContain('session-compensation');
      expect(bootstrap!.localStore.getOpenScope()).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });

  test('stores only the opaque binding token and server deviceBindingId in a per-uid hashed SecureStore key', async () => {
    const secure = secureStore({ stable_id: 'legacy-owner' });
    const credentials = createAccountAuthoritySecureInstallationBindingCredentialStore({
      secureStore: secure,
      digestSha256: sha256,
    });
    const uid = parseFirebaseAuthUid('firebase-client-a');

    await credentials.write(uid, {
      bindingToken: 'opaque-binding-token',
      deviceBindingId: 'server-device-binding-a',
    });

    await expect(credentials.read(uid)).resolves.toEqual({
      bindingToken: 'opaque-binding-token',
      deviceBindingId: 'server-device-binding-a',
    });

    const keys = Object.keys(secure.snapshot()).filter((key) => key.startsWith('phraseman.account_authority.binding'));
    expect(keys).toEqual(['phraseman.account_authority.binding.v2.' + sha256Sync('account-authority-revision-uid.v1\u0000firebase-client-a')]);
    expect(JSON.stringify(secure.snapshot())).not.toContain('firebase-client-a');
    expect(secure.keysRead()).not.toContain('stable_id');
    expect(JSON.stringify(secure.snapshot())).not.toContain('auth_links');
  });

  test.each([
    ['malformed json', 'not-json'],
    ['foreign uid hash', 'foreign'],
    ['malformed token', 'bad-token'],
    ['malformed device binding id', 'bad-device'],
  ])('fails closed on %s in the per-uid credential key', async (_case, variant) => {
    const uidHash = sha256Sync('account-authority-revision-uid.v1\u0000firebase-client-a');
    const record = (hash: string, token: string, device: string) => JSON.stringify({
      schemaVersion: 'account-authority-installation-binding.v2',
      uidHash: hash,
      bindingToken: token,
      deviceBindingId: device,
    });
    const raw = variant === 'not-json' ? 'not-json'
      : variant === 'foreign' ? record('0'.repeat(64), 'opaque-binding-token', 'server-device-binding-a')
        : variant === 'bad-token' ? record(uidHash, ' opaque-binding-token ', 'server-device-binding-a')
          : record(uidHash, 'opaque-binding-token', '../auth_links');
    const credentials = createAccountAuthoritySecureInstallationBindingCredentialStore({
      secureStore: secureStore({ ['phraseman.account_authority.binding.v2.' + uidHash]: raw }),
      digestSha256: sha256,
    });

    const failure = await credentials.read(parseFirebaseAuthUid('firebase-client-a')).catch((error: unknown) => error);

    expect(failure).toEqual(new Error('account_authority_installation_binding_unavailable'));
    expect(String(failure)).not.toContain('opaque-binding-token');
    expect(String(failure)).not.toContain('auth_links');
  });

  test('production lease acquisition fails closed when installation binding bootstrap is unavailable', async () => {
    const secure = secureStore();
    const base = dependencies({ secure });
    const bootstrap = await createAccountAuthorityProductionBootstrap({
      ...base,
      createInstallationBinding: () => ({
        obtain: async () => { throw new Error('binding_callable_unavailable'); },
        readPersistedForLease: async () => null,
        rotate: async () => { throw new Error('binding_callable_unavailable'); },
        reset: async () => undefined,
        resetForLease: async () => undefined,
      }),
      createLease: (_revisionStore, binding) => ({
        acquire: async (request) => {
          await binding.obtain(request.firebaseAuthUid);
          throw new Error('must_not_continue');
        },
        release: async () => { throw new Error('account_authority_release_not_wired'); },
        deleteAccount: async () => { throw new Error('account_authority_delete_not_wired'); },
      }),
    });

    await expect(bootstrap!.lease.acquire({
      firebaseAuthUid: parseFirebaseAuthUid('firebase-client-a'),
      deviceId: bootstrap!.deviceId,
      operationId: parseOperationId('operation-client-a'),
    })).rejects.toThrow('binding_callable_unavailable');
    expect(Object.keys(secure.snapshot()).some((key) => key.startsWith('phraseman.account_authority.binding'))).toBe(false);
  });

  test('real startup seam attempts production installation before legacy auth sync', async () => {
    jest.resetModules();
    const order: string[] = [];
    const install = jest.fn(async () => { order.push('install'); return true; });
    const sync = jest.fn(() => { order.push('legacy-sync'); });
    jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => ({
      installAccountAuthorityProductionBootstrapIfPossible: install,
      syncAccountsV2ClientAuthUid: sync,
    }));
    jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => true }));
    jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const appGate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');

    appGate.syncAccountsV2ClientAuth('observed-firebase-uid');
    await Promise.resolve();

    expect(install).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['install', 'legacy-sync']);
  });

  test('synchronous native module failure is contained and publishes no bootstrap', async () => {
    jest.resetModules();
    jest.doMock('../modules/account-session-v2/account_authority_production_adapter', () => ({
      createAccountAuthorityProductionBootstrapIfPossible: () => {
        throw new Error('native_module_missing');
      },
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');

    await expect(runtime.installAccountAuthorityProductionBootstrapIfPossible()).resolves.toBe(false);
  });

  test('production install is idempotent but direct bootstrap rebinding remains rejected', async () => {
    jest.resetModules();
    const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies());
    jest.doMock('../modules/account-session-v2/account_authority_production_adapter', () => ({
      createAccountAuthorityProductionBootstrapIfPossible: jest.fn(async () => bootstrap),
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const runtime = require('../modules/account-session-v2/accounts_v2_client_runtime') as
      typeof import('../modules/account-session-v2/accounts_v2_client_runtime');

    await expect(runtime.installAccountAuthorityProductionBootstrapIfPossible()).resolves.toBe(true);
    await expect(runtime.installAccountAuthorityProductionBootstrapIfPossible()).resolves.toBe(true);
    expect(() => runtime.installAccountAuthorityClientBootstrap(bootstrap!))
      .toThrow('account_authority_bootstrap_already_installed');
  });
});
