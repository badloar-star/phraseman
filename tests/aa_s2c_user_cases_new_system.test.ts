/*
 * AA S2c, часть B — реальные случаи пользователей (§126) на НОВОЙ системе.
 *
 *  Случай 5 «после смены Google-аккаунта не привязывается Google»: на одном
 *    устройстве A → B → A (B — новый Google-аккаунт). Привязка установки живёт по
 *    uid, поэтому ни binding_mismatch, ни цикла, ни лишней привязки при возврате A.
 *  Случай 6 «после перезапуска уровень 13↔12, дни 155↔52»: новая система не
 *    держит пары stableId в двух хранилищах — профиль решает аренда сервера по
 *    uid, а открытая область лежит в одном durable-хранилище. N перезапусков →
 *    тот же аккаунт, ни одного переключения.
 *  Плюс трассировка identity_trace: метки без идентификаторов.
 */
import { createHash } from 'crypto';
import {
  createAccountAuthorityFirebaseInstallationBindingPort,
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityCallableInvoker,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
  type FirebaseAuthUid,
} from '../modules/account-authority-v2/account_authority_ids';
import {
  createAccountAuthorityRuntime,
  type AccountAuthorityLeasePort,
  type AccountAuthorityProviderPort,
} from '../modules/account-authority-v2/account_authority_runtime';
import {
  createAccountAuthorityProductionBootstrap,
  createAccountAuthoritySecureInstallationBindingCredentialStore,
  createAccountAuthoritySecureRevisionStore,
  type AccountAuthorityProductionAdapterDependencies,
  type AccountAuthoritySecureStorePort,
} from '../modules/account-session-v2/account_authority_production_adapter';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const sha256 = async (value: string): Promise<string> => createHash('sha256').update(value).digest('hex');
const noSleep = async (_ms: number): Promise<void> => undefined;
const token = (suffix: string): string => ['bind', 'ing', '-', suffix].join('');
const INSTALLATION_ID = '550e8400-e29b-41d4-a716-446655440000';

function secureStore(): AccountAuthoritySecureStorePort {
  const values = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => { values.set(key, value); },
    deleteItemAsync: async (key) => { values.delete(key); },
  };
}

describe('identity_trace — correlation tags without identifiers', () => {
  const trace = jest.requireActual('../app/identity_trace') as typeof import('../app/identity_trace');

  test('same value → same tag, different value → different tag, empty → none, never the raw value', () => {
    const uid = 'Fz8cQe1uL2bWm9rT4yXk0aPq7Hn3';
    expect(trace.identityTag(uid)).toBe(trace.identityTag(uid));
    expect(trace.identityTag(uid)).not.toBe(trace.identityTag(`${uid}x`));
    expect(trace.identityTag(uid)).toMatch(/^h:[0-9a-f]{8}$/);
    expect(trace.identityTag(uid)).not.toContain(uid.slice(0, 6));
    expect(trace.identityTag('')).toBe('none');
    expect(trace.identityTag(null)).toBe('none');
  });

  test('error code never carries free text (email/uid in Firebase messages)', () => {
    expect(trace.identityErrorCode(Object.assign(new Error('user a@b.c not found'), { code: 'auth/user-not-found' })))
      .toBe('auth/user-not-found');
    expect(trace.identityErrorCode(new Error('timeout_swap_presync_20000ms'))).toBe('timeout_swap_presync_20000ms');
    expect(trace.identityErrorCode(new Error('uid Fz8cQe1u is not owner'))).toBe('error_without_code');
  });

  test('storage key names lose embedded ids but keep their meaning', () => {
    expect(trace.redactStorageKey('shard_delta_queue_v1::0f8fad5b-d9cb-469f-a165-70867728950e'))
      .toBe('shard_delta_queue_v1::<id>');
    expect(trace.redactStorageKey('receipt_Fz8cQe1uL2bWm9rT4yXk0aPq7Hn3')).toBe('receipt_<id>');
    expect(trace.redactStorageKey('account_switch_quarantine_v1')).toBe('account_switch_quarantine_v1');
    // L-S2c-1: uid Firebase без цифр тоже маскируется.
    expect(trace.redactStorageKey('receipt_FzcQeuLbWmrTyXkaPqHnKdZs')).toBe('receipt_<id>');
  });

  test('a trace line is one warn with the task prefix and bounded JSON fields', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    trace.identityTrace('[PROFILE-FLIP]', 'startup source', { source: 'secure_store', stable: trace.identityTag('abc') });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/^\[PROFILE-FLIP\] startup source \{"source":"secure_store","stable":"h:[0-9a-f]{8}"\}$/));
    warn.mockRestore();
  });
});

/** Сервер привязок/аренды: привязка принадлежит uid-вызывающему; чужой токен → binding_mismatch. */
function googleSwitchServer() {
  let currentUid = '';
  let tokens = 0;
  const bindingOwner = new Map<string, string>();
  const accountByUid = new Map<string, { revision: number; sessions: number }>();
  const created: string[] = [];
  const invoke: AccountAuthorityCallableInvoker = async (name, data) => {
    if (name === 'accountAuthorityInstallationBindingCreate') {
      tokens += 1;
      const minted = token(String(tokens));
      bindingOwner.set(minted, currentUid);
      created.push(currentUid);
      return { data: { bindingToken: minted, deviceBindingId: `server-device-${tokens}` } };
    }
    if (bindingOwner.get(String(data.bindingToken)) !== currentUid) {
      throw Object.assign(new Error('account_authority_binding_mismatch'), { code: 'functions/failed-precondition' });
    }
    const account = accountByUid.get(currentUid) ?? { revision: 0, sessions: 0 };
    accountByUid.set(currentUid, account);
    if (name === 'accountAuthorityLeaseAcquire') {
      const expected = data.expectedRevision === null ? account.revision : data.expectedRevision;
      if (expected !== account.revision) {
        throw Object.assign(new Error('account_authority_request_rejected'), {
          code: 'functions/failed-precondition', details: { leaseCode: 'revision_mismatch' },
        });
      }
      account.revision += 1;
      account.sessions += 1;
      return {
        data: {
          schemaVersion: 'account-authority-lease.v1', type: 'acquired',
          accountId: `account-of-${currentUid}`, sessionId: `session-${currentUid}-${account.sessions}`,
          revision: account.revision, idempotent: false, previousLeaseRevoked: false,
        },
      };
    }
    if (name === 'accountAuthorityLeaseRelease') {
      if (data.expectedRevision !== account.revision) throw new Error('unexpected_release_revision');
      account.revision += 1;
      return { data: { schemaVersion: 'account-authority-lease-release.v1', type: 'released', revision: account.revision, idempotent: false } };
    }
    throw new Error(`unexpected_${name}`);
  };
  return { invoke, created, signInAs: (uid: string) => { currentUid = uid; } };
}

describe('Case 5 (new system) — changing the Google account on the phone does not break linking', () => {
  test('A → B (new Google account) → A on one device: no mismatch, no loop, A reuses its own binding', async () => {
    const server = googleSwitchServer();
    const secure = secureStore();
    const credentials = createAccountAuthoritySecureInstallationBindingCredentialStore({ secureStore: secure, digestSha256: sha256 });
    const revisions = createAccountAuthoritySecureRevisionStore({ secureStore: secure, digestSha256: sha256 });
    let currentUid: string | null = null;
    const binding = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke: server.invoke, installationId: INSTALLATION_ID, credentials, currentAuthUid: () => currentUid,
    });
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke: server.invoke, revisionStore: revisions, installationBinding: binding,
      retry: { sleep: noSleep, maxAttempts: 2 },
    });
    const deviceId = parseDeviceId('device-01');
    const google = (uid: string) => { currentUid = uid; server.signInAs(uid); return parseFirebaseAuthUid(uid); };

    const uidA = google('google-old-account');
    const leaseA = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('a-1') });
    await port.release({ ...leaseA, deviceId, operationId: parseOperationId('a-out') });

    const uidB = google('google-new-account');
    const leaseB = await port.acquire({ firebaseAuthUid: uidB, deviceId, operationId: parseOperationId('b-1') });
    expect(leaseB.accountId.value).toBe('account-of-google-new-account');
    await port.release({ ...leaseB, deviceId, operationId: parseOperationId('b-out') });

    google('google-old-account');
    const leaseA2 = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('a-2') });

    expect(leaseA2.accountId.value).toBe('account-of-google-old-account');
    // По одной привязке на uid: возврат A не создаёт новую и не упирается в mismatch.
    expect(server.created).toEqual(['google-old-account', 'google-new-account']);
  });
});

describe('Case 6 (new system) — restarts never flip the profile', () => {
  test('signed in as A, six cold restarts: every resume opens the same account A', async () => {
    const secure = secureStore();
    const storage = new MemoryScopeStorageAdapter();
    let random = 0;
    const dependencies: AccountAuthorityProductionAdapterDependencies = {
      secureStore: secure as AccountAuthorityProductionAdapterDependencies['secureStore'],
      createStorageAdapter: () => storage,
      randomInstallationId: async () => `5d3b3527-07e0-4dc1-8aac-${String(++random).padStart(12, '0')}`,
      digestSha256: sha256,
      createInstallationBinding: () => ({
        obtain: async () => { throw new Error('not_used'); },
        readPersistedForLease: async () => null,
        rotate: async () => { throw new Error('not_used'); },
        reset: async () => undefined,
        resetForLease: async () => undefined,
      }),
      createLease: () => ({
        acquire: async () => { throw new Error('not_used'); },
        release: async () => undefined,
        deleteAccount: async () => undefined,
      }),
      providerSignOut: async () => undefined,
    };
    const uidA: FirebaseAuthUid = parseFirebaseAuthUid('firebase-a');
    // Сервер: аккаунт определяется uid; продление той же сессии на том же устройстве.
    const lease: AccountAuthorityLeasePort = {
      acquire: jest.fn(async ({ firebaseAuthUid }) => Object.freeze({
        accountId: parseAccountId(`account-of-${firebaseAuthUid.value}`),
        sessionId: parseSessionId('session-1'),
      })),
      release: jest.fn(async () => undefined),
      deleteAccount: jest.fn(async () => undefined),
    };
    const provider = (authenticated: boolean): AccountAuthorityProviderPort => ({
      authenticate: async () => (authenticated
        ? Object.freeze({ type: 'authenticated' as const, firebaseAuthUid: uidA })
        : Object.freeze({ type: 'cancelled' as const })),
      currentIdentity: async () => uidA,
      signOut: async () => undefined,
    });

    const first = await createAccountAuthorityProductionBootstrap(dependencies);
    if (first === null) throw new Error('bootstrap_missing');
    const runtime = createAccountAuthorityRuntime({
      deviceId: first.deviceId, provider: provider(true), lease, localStore: first.localStore,
    });
    await runtime.signIn(parseOperationId('sign-in-a'));
    expect(runtime.getState()).toMatchObject({ phase: 'authenticated' });

    const seen: string[] = [];
    for (let restart = 1; restart <= 6; restart += 1) {
      const booted = await createAccountAuthorityProductionBootstrap(dependencies);
      if (booted === null) throw new Error('bootstrap_missing');
      expect(booted.deviceId.value).toBe(first.deviceId.value);
      const restarted = createAccountAuthorityRuntime({
        deviceId: booted.deviceId, provider: provider(false), lease, localStore: booted.localStore,
      });
      await restarted.resume(parseOperationId(`resume-${restart}`));
      const state = restarted.getState();
      seen.push(state.phase === 'authenticated' ? state.accountId.value : `phase:${state.phase}`);
      expect(booted.localStore.getOpenScope()?.accountId.value).toBe('account-of-firebase-a');
    }

    expect(new Set(seen)).toEqual(new Set(['account-of-firebase-a']));
  });
});
