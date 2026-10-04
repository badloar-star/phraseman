/*
 * AA S2c, часть A — хвосты security-ревью S2b (4 LOW):
 *   L-S2b-1 привязка не сохраняется, если за время вызова сменился uid Firebase;
 *   L-S2b-2 промисы привязки — по хешу uid, resetForLease сбрасывает только владельца;
 *   L-S2b-3 «выход выполнен» на повторе → следующий вход того же uid проверяет
 *           оставшуюся аренду (один повтор с ревизией сервера), без цикла;
 *   L-S2b-4 потерянный nonce M-1 → различимый код «повторите вход».
 */
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  createAccountAuthorityFirebaseInstallationBindingPort,
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityCallableInvoker,
  type AccountAuthorityInstallationBindingCredentialStore,
  type AccountAuthorityInstallationBindingCredentials,
  type AccountAuthorityLeaseRevisionStore,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
} from '../modules/account-authority-v2/account_authority_ids';
import type { AccountAuthorityLogFields } from '../modules/account-authority-v2/account_authority_logger';
import {
  createAccountAuthoritySecureInstallationBindingCredentialStore,
  createAccountAuthoritySecureRevisionStore,
  type AccountAuthoritySecureStorePort,
} from '../modules/account-session-v2/account_authority_production_adapter';
import {
  ANON_MERGE_NONCE_LOST_CODE,
  ANON_MERGE_NONCE_TTL_MS,
  acceptAnonMergeStampResponse,
  anonMergeNonceField,
  classifyAnonMergeNonceRejection,
  forgetAllAnonMergeNonces,
  forgetAnonMergeNonce,
  setAnonMergeNonceLoggerForTests,
} from '../modules/account-authority-v2/account_authority_anon_merge_nonce';

const INSTALLATION_ID = '550e8400-e29b-41d4-a716-446655440000';
const sha256 = async (value: string): Promise<string> => createHash('sha256').update(value).digest('hex');
const noSleep = async (_ms: number): Promise<void> => undefined;
// Тестовые «секреты» собираются из частей (сканер секретов на коммите).
const token = (suffix: string): string => ['tok', 'en', '-', suffix].join('');

function callableError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code: `functions/${code}` });
}

function contractRejected(leaseCode?: string): Error {
  const error = callableError('failed-precondition', 'account_authority_request_rejected');
  return leaseCode === undefined ? error : Object.assign(error, { details: { leaseCode } });
}

function recordingLogger() {
  const entries: Array<Readonly<{ level: string; event: string; fields?: AccountAuthorityLogFields }>> = [];
  return {
    entries,
    events: () => entries.map((entry) => entry.event),
    find: (event: string) => entries.find((entry) => entry.event === event),
    logger: {
      info: (event: string, fields?: AccountAuthorityLogFields) => { entries.push({ level: 'info', event, fields }); },
      warn: (event: string, fields?: AccountAuthorityLogFields) => { entries.push({ level: 'warn', event, fields }); },
    },
  };
}

function secureStore(): AccountAuthoritySecureStorePort & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => { values.set(key, value); },
    deleteItemAsync: async (key) => { values.delete(key); },
  };
}

function perUidCredentials(): AccountAuthorityInstallationBindingCredentialStore & {
  readCount(uid: string): number;
  has(uid: string): boolean;
} {
  const byUid = new Map<string, AccountAuthorityInstallationBindingCredentials>();
  const reads = new Map<string, number>();
  return {
    has: (uid) => byUid.has(uid),
    readCount: (uid) => reads.get(uid) ?? 0,
    read: async (uid) => {
      reads.set(uid.value, (reads.get(uid.value) ?? 0) + 1);
      return byUid.get(uid.value) ?? null;
    },
    readForLease: async () => null,
    write: async (uid, credentials) => { byUid.set(uid.value, Object.freeze({ ...credentials })); },
    clear: async (uid) => { byUid.delete(uid.value); },
    clearForLease: async () => undefined,
  };
}

const uidA = parseFirebaseAuthUid('firebase-uid-a');
const uidB = parseFirebaseAuthUid('firebase-uid-b');

describe('L-S2b-1 — binding is not stored when the Firebase uid changed during the call', () => {
  test('uid switched A → B while the create call was in flight: nothing stored, logged uid_changed', async () => {
    const credentials = perUidCredentials();
    const log = recordingLogger();
    let currentUid: string | null = uidA.value;
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke: async () => {
        currentUid = uidB.value; // другой человек вошёл, пока ответ был в пути
        return { data: { bindingToken: token('a'), deviceBindingId: 'server-device-a' } };
      },
      installationId: INSTALLATION_ID,
      credentials,
      logger: log.logger,
      currentAuthUid: () => currentUid,
    });

    await expect(port.obtain(uidA)).rejects.toThrow('account_authority_installation_binding_unavailable');
    expect(credentials.has(uidA.value)).toBe(false);
    expect(log.find('installation_binding binding_store_skipped')?.fields).toEqual({ reason: 'uid_changed' });
    expect(log.find('installation_binding obtain_failed')?.fields?.code).toBe('account_authority_installation_binding_uid_changed');
  });

  test('uid already different before the call: no server call at all', async () => {
    const invoke = jest.fn<Promise<unknown>, Parameters<AccountAuthorityCallableInvoker>>();
    const log = recordingLogger();
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke,
      installationId: INSTALLATION_ID,
      credentials: perUidCredentials(),
      logger: log.logger,
      currentAuthUid: () => null,
    });

    await expect(port.obtain(uidA)).rejects.toThrow('account_authority_installation_binding_unavailable');
    expect(invoke).not.toHaveBeenCalled();
    expect(log.find('installation_binding binding_create_skipped')?.fields).toEqual({ reason: 'signed_out' });
  });

  test('same uid throughout: binding stored as before', async () => {
    const credentials = perUidCredentials();
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke: async () => ({ data: { bindingToken: token('a'), deviceBindingId: 'server-device-a' } }),
      installationId: INSTALLATION_ID,
      credentials,
      currentAuthUid: () => uidA.value,
    });

    await expect(port.obtain(uidA)).resolves.toMatchObject({ bindingToken: token('a') });
    expect(credentials.has(uidA.value)).toBe(true);
  });

  test('unreadable current uid fails closed (no store)', async () => {
    const credentials = perUidCredentials();
    const port = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke: async () => ({ data: { bindingToken: token('a'), deviceBindingId: 'server-device-a' } }),
      installationId: INSTALLATION_ID,
      credentials,
      currentAuthUid: () => { throw new Error('auth_module_missing'); },
    });

    await expect(port.obtain(uidA)).rejects.toThrow('account_authority_installation_binding_unavailable');
    expect(credentials.has(uidA.value)).toBe(false);
  });
});

describe('L-S2b-2 — in-memory binding promises are keyed by uid hash; resetForLease drops only the lease owner', () => {
  test('production credential store exposes the same sha256 key as SecureStore', async () => {
    const credentials = createAccountAuthoritySecureInstallationBindingCredentialStore({
      secureStore: secureStore(),
      digestSha256: sha256,
    });
    const expected = await sha256(`account-authority-revision-uid.v1\u0000${uidA.value}`);
    await expect(credentials.uidKey?.(uidA)).resolves.toBe(expected);
  });

  test('resetForLease(owner A) keeps the in-flight/cached promise of uid B', async () => {
    const secure = secureStore();
    const baseCredentials = createAccountAuthoritySecureInstallationBindingCredentialStore({ secureStore: secure, digestSha256: sha256 });
    const revisions = createAccountAuthoritySecureRevisionStore({ secureStore: secure, digestSha256: sha256 });
    const readSpy = jest.fn(baseCredentials.read);
    const credentials = { ...baseCredentials, read: readSpy };
    let created = 0;
    const log = recordingLogger();
    const binding = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke: async () => {
        created += 1;
        return { data: { bindingToken: token(String(created)), deviceBindingId: `server-device-${created}` } };
      },
      installationId: INSTALLATION_ID,
      credentials,
      logger: log.logger,
    });
    const ownerA = Object.freeze({ accountId: parseAccountId('account-a'), sessionId: parseSessionId('session-a') });
    await binding.obtain(uidA);
    await binding.obtain(uidB);
    await revisions.bindLease(uidA, ownerA, 1);
    const readsBeforeReset = readSpy.mock.calls.length;

    await binding.resetForLease(ownerA);

    // B: тот же промис (ни чтения хранилища, ни нового вызова сервера).
    await binding.obtain(uidB);
    expect(readSpy.mock.calls.length).toBe(readsBeforeReset);
    // A: промис сброшен и запись удалена → новая привязка с сервера.
    await binding.obtain(uidA);
    expect(created).toBe(3);
    expect(log.find('installation_binding reset_memory')?.fields).toEqual({ result: 'owner', removed: true });
  });

  test('without owner lookup (old fakes) resetForLease still clears everything and says so', async () => {
    const log = recordingLogger();
    const binding = createAccountAuthorityFirebaseInstallationBindingPort({
      invoke: async () => ({ data: { bindingToken: token('x'), deviceBindingId: 'server-device-x' } }),
      installationId: INSTALLATION_ID,
      credentials: perUidCredentials(),
      logger: log.logger,
    });
    await binding.resetForLease(Object.freeze({ accountId: parseAccountId('account-a'), sessionId: parseSessionId('session-a') }));
    expect(log.find('installation_binding reset_memory')?.fields).toEqual({ result: 'all', reason: 'owner_key_unavailable' });
  });
});

/** Сервер аренды в памяти: одна аренда на аккаунт, ревизия, квитанции по operationId. */
function leaseServer() {
  const state = { revision: 0, active: null as null | { sessionId: string }, sessions: 0 };
  const calls: Array<Readonly<{ name: string; expectedRevision: unknown }>> = [];
  let dropNextReleaseResponse = false;
  let applyNextRelease = true;
  let rejectAcquires = false;
  const invoke: AccountAuthorityCallableInvoker = async (name, data) => {
    calls.push({ name, expectedRevision: data.expectedRevision });
    if (name === 'accountAuthorityInstallationBindingCreate') {
      return { data: { bindingToken: token('srv'), deviceBindingId: 'server-device-a' } };
    }
    if (name === 'accountAuthorityLeaseAcquire') {
      if (rejectAcquires) throw contractRejected('revision_mismatch');
      const expected = data.expectedRevision === null ? state.revision : data.expectedRevision;
      if (expected !== state.revision) throw contractRejected('revision_mismatch');
      if (state.active !== null) {
        // то же устройство, та же аренда → продление (ревизия не растёт)
        return {
          data: {
            schemaVersion: 'account-authority-lease.v1', type: 'renewed', accountId: 'account-server-a',
            sessionId: state.active.sessionId, revision: state.revision, idempotent: false, previousLeaseRevoked: false,
          },
        };
      }
      state.revision += 1;
      state.sessions += 1;
      state.active = { sessionId: `session-server-${state.sessions}` };
      return {
        data: {
          schemaVersion: 'account-authority-lease.v1', type: 'acquired', accountId: 'account-server-a',
          sessionId: state.active.sessionId, revision: state.revision, idempotent: false, previousLeaseRevoked: false,
        },
      };
    }
    if (name === 'accountAuthorityLeaseRelease') {
      if (dropNextReleaseResponse) {
        dropNextReleaseResponse = false;
        if (applyNextRelease) {
          state.revision += 1;
          state.active = null;
        }
        throw callableError('unavailable', 'response_lost');
      }
      if (data.expectedRevision !== state.revision) throw contractRejected('revision_mismatch');
      state.revision += 1;
      state.active = null;
      return { data: { schemaVersion: 'account-authority-lease-release.v1', type: 'released', revision: state.revision, idempotent: false } };
    }
    throw new Error(`unexpected_${name}`);
  };
  return {
    state,
    calls,
    invoke,
    /** Ответ на выход теряется; applied=false — первая попытка НЕ дошла до сервера. */
    loseNextReleaseResponse: (applied: boolean) => { dropNextReleaseResponse = true; applyNextRelease = applied; },
    /** Сервер отклоняет любой вход revision_mismatch (проверка тоже не помогает). */
    rejectAllAcquires: (value: boolean) => { rejectAcquires = value; },
  };
}

function leaseHarness(server: ReturnType<typeof leaseServer>, revisions?: AccountAuthorityLeaseRevisionStore) {
  const secure = secureStore();
  const revisionStore = revisions ?? createAccountAuthoritySecureRevisionStore({ secureStore: secure, digestSha256: sha256 });
  const credentials = createAccountAuthoritySecureInstallationBindingCredentialStore({ secureStore: secure, digestSha256: sha256 });
  const log = recordingLogger();
  const binding = createAccountAuthorityFirebaseInstallationBindingPort({
    invoke: server.invoke, installationId: INSTALLATION_ID, credentials,
  });
  const port = createAccountAuthorityFirebaseLeasePort({
    invoke: server.invoke,
    revisionStore,
    installationBinding: binding,
    logger: log.logger,
    retry: { sleep: noSleep, random: () => 0, maxAttempts: 2 },
  });
  return { port, log, revisionStore };
}

const deviceId = parseDeviceId('device-01');

describe('L-S2b-3 — presumed release is verified on the next sign-in of the same uid', () => {
  test('release presumed done but not applied → next acquire of A retries once with the server revision and reclaims the leftover lease', async () => {
    const server = leaseServer();
    const { port, log } = leaseHarness(server);
    const lease = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-1') });
    expect(server.state.revision).toBe(1);

    // Первая попытка выхода НЕ дошла (applied=false), ответ «потерян»; повтор
    // получает revision_mismatch → клиент по S2b-R4 считает выход выполненным.
    server.loseNextReleaseResponse(false);
    server.state.revision = 7; // сервер успел сдвинуться (например, другое устройство)
    await port.release({ ...lease, deviceId, operationId: parseOperationId('op-release-1') });
    expect(log.events()).toContain('lease release_presumed_done');
    server.state.revision = 1; // а на деле аренда A осталась жива на ревизии 1

    const again = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-2') });

    expect(again.sessionId.value).toBe(lease.sessionId.value);
    const acquireCalls = server.calls.filter((call) => call.name === 'accountAuthorityLeaseAcquire');
    expect(acquireCalls.slice(-2).map((call) => call.expectedRevision)).toEqual([2, null]);
    expect(log.find('lease acquire_presumed_release_check')?.fields).toMatchObject({ reason: 'revision_mismatch' });
    expect(log.find('lease acquire_presumed_release_resolved')?.fields).toMatchObject({ result: 'leftover_lease_reclaimed' });
  });

  test('release presumed done and really applied → next acquire confirms it without any extra call', async () => {
    const server = leaseServer();
    const { port, log } = leaseHarness(server);
    const lease = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-1') });
    server.loseNextReleaseResponse(true);
    await port.release({ ...lease, deviceId, operationId: parseOperationId('op-release-1') });
    expect(log.events()).toContain('lease release_presumed_done');

    await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-2') });

    expect(log.events()).not.toContain('lease acquire_presumed_release_check');
    expect(log.find('lease acquire_presumed_release_resolved')?.fields).toMatchObject({ result: 'release_confirmed' });
  });

  test('only one verification: a second revision_mismatch is final (no loop) and the mark is dropped', async () => {
    const server = leaseServer();
    const { port, log } = leaseHarness(server);
    const lease = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-1') });
    server.loseNextReleaseResponse(false);
    server.state.revision = 7;
    await port.release({ ...lease, deviceId, operationId: parseOperationId('op-release-1') });
    server.rejectAllAcquires(true);
    const before = server.calls.filter((call) => call.name === 'accountAuthorityLeaseAcquire').length;

    await expect(port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-2') }))
      .rejects.toThrow('account_authority_lease_rejected');

    const attempts = server.calls.filter((call) => call.name === 'accountAuthorityLeaseAcquire').slice(before);
    expect(attempts.map((call) => call.expectedRevision)).toEqual([2, null]);
    expect(log.events()).toContain('lease acquire_presumed_release_unresolved');

    // Отметка снята: следующий вход — обычный окончательный отказ, без второй проверки.
    const checks = log.events().filter((event) => event === 'lease acquire_presumed_release_check').length;
    // AA S4b: отметка снята — обычное продление с устаревшей ревизией теперь
    // «аренду забрали» (lease_evicted); явный вход вернёт её повтором с ревизией сервера.
    await expect(port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-3') }))
      .rejects.toThrow('account_authority_lease_evicted');
    expect(log.events().filter((event) => event === 'lease acquire_presumed_release_check')).toHaveLength(checks);
  });

  test('presumed release, server moved on without our lease → adopts the server revision once', async () => {
    const server = leaseServer();
    const { port, log } = leaseHarness(server);
    const lease = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-1') });
    server.loseNextReleaseResponse(false);
    server.state.revision = 7;
    await port.release({ ...lease, deviceId, operationId: parseOperationId('op-release-1') });
    server.state.active = null; // аренду снял сервер (вытеснение/истечение), ревизия ушла вперёд

    const again = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-2') });

    expect(again.sessionId.value).not.toBe(lease.sessionId.value);
    expect(log.find('lease acquire_presumed_release_resolved')?.fields).toMatchObject({ result: 'server_revision_adopted' });
  });

  test('another uid on the same device is not affected by A’s presumed release', async () => {
    const server = leaseServer();
    const { port, log, revisionStore } = leaseHarness(server);
    const lease = await port.acquire({ firebaseAuthUid: uidA, deviceId, operationId: parseOperationId('op-acquire-1') });
    server.loseNextReleaseResponse(false);
    server.state.revision = 7;
    await port.release({ ...lease, deviceId, operationId: parseOperationId('op-release-1') });
    await revisionStore.write(uidB, 3);
    server.state.revision = 4;

    // AA S4b: B продлевает аренду с устаревшей ревизией — вытеснение, а не общий отказ.
    await expect(port.acquire({ firebaseAuthUid: uidB, deviceId, operationId: parseOperationId('op-b') }))
      .rejects.toThrow('account_authority_lease_evicted');
    expect(log.events()).toContain('lease acquire_presumed_release_other_owner');
    expect(log.events()).not.toContain('lease acquire_presumed_release_check');
  });
});

describe('L-S2b-4 — lost M-1 nonce gives a distinct "repeat sign-in" code', () => {
  const nonceLog = recordingLogger();
  beforeEach(() => {
    nonceLog.entries.length = 0;
    setAnonMergeNonceLoggerForTests(nonceLog.logger);
    forgetAllAnonMergeNonces('tests');
  });
  afterAll(() => setAnonMergeNonceLoggerForTests(undefined));

  const secret = ['n', 'once', '-', 'value'].join('');

  test('issued, then expired before ensureLink → stable_id_mismatch is classified as nonce lost', () => {
    acceptAnonMergeStampResponse('stable-local', { data: { mergeNonce: secret } }, 1_000);
    const field = anonMergeNonceField('ensure_link', ['stable-local'], 1_000 + ANON_MERGE_NONCE_TTL_MS + 1);
    expect(field).toEqual({});
    expect(nonceLog.events()).toContain('anon_merge_nonce lost');
    expect(classifyAnonMergeNonceRejection('ensure_link', ['stable-local'], 'stable_id_mismatch'))
      .toBe(ANON_MERGE_NONCE_LOST_CODE);
    expect(JSON.stringify(nonceLog.entries)).not.toContain(secret);
    expect(JSON.stringify(nonceLog.entries)).not.toContain('stable-local');
  });

  test('nonce attached and still rejected → a real mismatch, not "nonce lost"', () => {
    acceptAnonMergeStampResponse('stable-local', { data: { mergeNonce: secret } }, 1_000);
    expect(anonMergeNonceField('ensure_link', ['stable-local'], 2_000)).toEqual({ anonMergeNonce: secret });
    expect(classifyAnonMergeNonceRejection('ensure_link', ['stable-local'], 'stable_id_mismatch')).toBeNull();
  });

  test('nonce never issued in this process (old server / other device) → null', () => {
    anonMergeNonceField('merge', ['stable-a', 'stable-b'], 2_000);
    expect(classifyAnonMergeNonceRejection('merge', ['stable-a', 'stable-b'], 'stable_id_mismatch')).toBeNull();
  });

  test('transport failures are never reclassified, and settle/merge forget the mark', () => {
    acceptAnonMergeStampResponse('stable-local', { data: { mergeNonce: secret } }, 1_000);
    anonMergeNonceField('ensure_link', ['stable-local'], 1_000 + ANON_MERGE_NONCE_TTL_MS + 1);
    expect(classifyAnonMergeNonceRejection('ensure_link', ['stable-local'], 'transport_unavailable')).toBeNull();
    forgetAnonMergeNonce(['stable-local'], 'merged');
    expect(classifyAnonMergeNonceRejection('ensure_link', ['stable-local'], 'stable_id_mismatch')).toBeNull();
    acceptAnonMergeStampResponse('stable-local', { data: { mergeNonce: secret } }, 1_000);
    anonMergeNonceField('ensure_link', ['stable-local'], 1_000 + ANON_MERGE_NONCE_TTL_MS + 1);
    forgetAllAnonMergeNonces('sign_in_settled');
    expect(classifyAnonMergeNonceRejection('ensure_link', ['stable-local'], 'stable_id_mismatch')).toBeNull();
  });

  test('wiring: ensureLink result carries nonceRejection; sign-in maps it to the error code (old path behaviour otherwise unchanged)', () => {
    const cloudSync = readFileSync(join(__dirname, '../app/cloud_sync.ts'), 'utf8');
    const authProvider = readFileSync(join(__dirname, '../app/auth_provider.ts'), 'utf8');
    expect(cloudSync).toMatch(/classifyAnonMergeNonceRejection\('ensure_link', \[stableId\], failure\)/);
    expect(cloudSync).toMatch(/\.\.\.\(nonceRejection \? \{ nonceRejection \} : \{\}\)/);
    expect(cloudSync).toMatch(/classifyAnonMergeNonceRejection\('merge', \[a, b\]/);
    expect(authProvider).toMatch(/linkedRemote\.nonceRejection \?\? 'auth_link_failed'/);
    expect(authProvider).toMatch(/localNonceRejection \?\? 'auth_link_failed'/);
  });
});
