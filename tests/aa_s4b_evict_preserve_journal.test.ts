import { accountAuthorityGeneration } from '../modules/account-authority-v2/account_authority_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
  type FirebaseAuthUid,
} from '../modules/account-authority-v2/account_authority_ids';
import { createAccountAuthorityRenewalGate } from '../modules/account-authority-v2/account_authority_failure_policy';
import {
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityInstallationBindingPort,
  type AccountAuthorityLeaseRevisionStore,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import { createAccountAuthorityRenewalDriver } from '../modules/account-authority-v2/account_authority_renewal_driver';
import {
  createAccountAuthorityRuntime,
  type AccountAuthorityLeasePort,
  type AccountAuthorityProviderPort,
} from '../modules/account-authority-v2/account_authority_runtime';
import {
  MAX_JOURNAL_OPERATIONS,
  MAX_JOURNAL_RECEIPTS,
  OPERATION_JOURNAL_PREFIX,
  createAccountAuthorityProductionBootstrap,
  type AccountAuthorityProductionAdapterDependencies,
} from '../modules/account-session-v2/account_authority_production_adapter';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * AA S4b: вытеснение устройства, сохранение записей сохранённых доменов,
 * журнал операций в пределах SecureStore, шлюз продления R1.
 */

const LIMIT = 2048;
const V1_KEY = 'phraseman.account_authority.local_metadata.v1';
const V2_KEY = 'phraseman.account_authority.local_metadata.v2';
const ACCOUNT_A = 'account-server-a';
const ACCOUNT_B = 'account-server-b';

type Secure = AccountAuthorityProductionAdapterDependencies['secureStore'] & Readonly<{
  raw: Map<string, string>;
  snapshot(): Readonly<Record<string, string>>;
}>;

function secureStore(): Secure {
  const values = new Map<string, string>();
  return {
    raw: values,
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (Buffer.byteLength(value, 'utf8') > LIMIT) throw new Error('secure_store_value_too_large');
      values.set(key, value);
    },
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => { values.set(key, value); },
    deleteItemAsync: async (key) => { values.delete(key); },
    snapshot: () => Object.freeze(Object.fromEntries(values)),
  };
}

type Mode = 'online' | 'evicted' | 'offline';

function fakeLease() {
  const state = { mode: 'online' as Mode, acquires: 0, releases: 0, intents: [] as string[], sessions: 0 };
  const accountFor = (uid: FirebaseAuthUid) => (uid.value === 'firebase-user-b' ? ACCOUNT_B : ACCOUNT_A);
  const lease: AccountAuthorityLeasePort = {
    acquire: async (request) => {
      state.acquires += 1;
      state.intents.push(request.intent ?? 'none');
      if (state.mode === 'evicted') throw new Error('account_authority_lease_evicted');
      if (state.mode === 'offline') throw new Error('account_authority_lease_unavailable');
      state.sessions += 1;
      return Object.freeze({
        accountId: parseAccountId(accountFor(request.firebaseAuthUid)),
        sessionId: parseSessionId(`session-server-${state.sessions}`),
      });
    },
    release: async () => { state.releases += 1; },
    deleteAccount: async () => undefined,
  };
  return { state, lease };
}

function dependencies(
  secure: Secure, storage: MemoryScopeStorageAdapter, server: ReturnType<typeof fakeLease>, critical?: string[],
): AccountAuthorityProductionAdapterDependencies {
  const binding: AccountAuthorityInstallationBindingPort = {
    obtain: async () => Object.freeze({ bindingToken: 'opaque', deviceBindingId: parseDeviceId('server-device-a') }),
    readPersistedForLease: async () => null,
    rotate: async () => { throw new Error('not_used'); },
    reset: async () => undefined,
    resetForLease: async () => undefined,
  };
  return {
    secureStore: secure,
    createStorageAdapter: () => storage,
    randomInstallationId: async () => '5d3b3527-07e0-4dc1-8aac-000000000001',
    digestSha256: async (value) => `hash-${Buffer.from(value).toString('hex').slice(0, 48)}`,
    createInstallationBinding: () => binding,
    createLease: () => server.lease,
    providerSignOut: async () => undefined,
    remoteDeleteFirstSendDeadlineMs: 20,
    reportCritical: (event: string, code: string) => { critical?.push(`${event} ${code}`); },
  };
}

async function flush(rounds = 30): Promise<void> {
  for (let index = 0; index < rounds; index += 1) await new Promise<void>((resolve) => setImmediate(resolve));
}

async function setup(server = fakeLease(), secure = secureStore(), storage = new MemoryScopeStorageAdapter()) {
  const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies(secure, storage, server));
  if (bootstrap === null) throw new Error('bootstrap_missing');
  let uid = 'firebase-user-a';
  const events: string[] = [];
  const provider: AccountAuthorityProviderPort = {
    authenticate: async () => Object.freeze({ type: 'authenticated' as const, firebaseAuthUid: parseFirebaseAuthUid(uid) }),
    currentIdentity: async () => parseFirebaseAuthUid(uid),
    signOut: async () => { events.push('provider_sign_out'); },
  };
  const runtime = createAccountAuthorityRuntime({
    deviceId: bootstrap.deviceId, provider, lease: bootstrap.lease, localStore: bootstrap.localStore,
  });
  return { server, secure, storage, bootstrap, runtime, events, useUid: (next: string) => { uid = next; } };
}

function preservedKeys(storage: MemoryScopeStorageAdapter, account: string): string[] {
  return storage.snapshot(`account:${account}`).map((record) => record.key).filter((key) => key.startsWith('account_authority.preserved.'));
}

describe('AA S4b: вытеснение не теряет запись и не путается с сетью', () => {
  test('вытеснение во время записи урока: запись зафиксирована, состояние device_taken_over, выхода из провайдера нет', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    const write = env.runtime.capturePreservedWrite({ operationId: parseOperationId('lesson-write-1'), domain: 'lesson_progress' });
    const srs = env.runtime.capturePreservedWrite({ operationId: parseOperationId('srs-write-1'), domain: 'flashcards_srs' });
    env.server.state.mode = 'evicted';
    await expect(env.runtime.resume(parseOperationId('resume-1'))).resolves.toMatchObject({ type: 'device_taken_over' });
    expect(env.runtime.getState().phase).toBe('device_taken_over');
    expect(env.bootstrap.localStore.getOpenScope()).toBeNull();
    expect(preservedKeys(env.storage, ACCOUNT_A)).toEqual([
      'account_authority.preserved.flashcards_srs.srs-write-1',
      'account_authority.preserved.lesson_progress.lesson-write-1',
    ]);
    // Поздняя фиксация той же записи — уже «committed», без отката.
    await expect(env.runtime.commitPreservedWrite(write)).resolves.toMatchObject({ type: 'committed' });
    await expect(env.runtime.commitPreservedWrite(srs)).resolves.toMatchObject({ type: 'committed' });
    expect(env.events).not.toContain('provider_sign_out');
    expect(env.server.state.releases).toBe(0);
  });

  test('после вытеснения продление сеть не дёргает; явный вход идёт с намерением sign_in', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    env.server.state.mode = 'evicted';
    await env.runtime.resume(parseOperationId('resume-1'));
    const acquires = env.server.state.acquires;
    await expect(env.runtime.resume(parseOperationId('resume-2'))).resolves.toMatchObject({ type: 'cancelled' });
    expect(env.server.state.acquires).toBe(acquires);
    env.server.state.mode = 'online';
    await expect(env.runtime.signIn(parseOperationId('sign-in-a-again'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.server.state.intents.slice(-1)).toEqual(['sign_in']);
  });

  test('холодный старт после вытеснения: device_taken_over без выхода из провайдера', async () => {
    const env = await setup();
    env.server.state.mode = 'evicted';
    await expect(env.runtime.resume(parseOperationId('cold-resume'))).resolves.toMatchObject({ type: 'device_taken_over' });
    expect(env.runtime.getState().phase).toBe('device_taken_over');
    expect(env.events).not.toContain('provider_sign_out');
  });

  test('временный сбой сети при продлении — НЕ вытеснение: сессия и область остаются', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    env.server.state.mode = 'offline';
    await expect(env.runtime.resume(parseOperationId('resume-offline'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.runtime.getState().phase).toBe('authenticated');
    expect(env.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
    expect(env.events).not.toContain('provider_sign_out');
    expect(env.server.state.releases).toBe(0);
  });

  test('выход и смена аккаунта фиксируют захваченные записи до закрытия области', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    env.runtime.capturePreservedWrite({ operationId: parseOperationId('lesson-before-switch'), domain: 'lesson_progress' });
    env.useUid('firebase-user-b');
    await env.runtime.signIn(parseOperationId('sign-in-b'));
    expect(preservedKeys(env.storage, ACCOUNT_A)).toEqual(['account_authority.preserved.lesson_progress.lesson-before-switch']);
    env.runtime.capturePreservedWrite({ operationId: parseOperationId('srs-before-signout'), domain: 'flashcards_srs' });
    await env.runtime.signOut(parseOperationId('sign-out-b'));
    expect(preservedKeys(env.storage, ACCOUNT_B)).toEqual(['account_authority.preserved.flashcards_srs.srs-before-signout']);
  });
});

describe('AA S4b: транспорт — закрытый список кодов вытеснения', () => {
  const rejected = (leaseCode: string | null) => Object.assign(new Error('account_authority_request_rejected'), {
    code: 'functions/failed-precondition', details: leaseCode === null ? undefined : { leaseCode },
  });
  const acquired = (revision: number) => ({ data: {
    schemaVersion: 'account-authority-lease.v1', type: 'acquired', accountId: ACCOUNT_A, sessionId: 'session-x',
    revision, idempotent: false, previousLeaseRevoked: true,
  } });
  function revisions(stored: number | null): AccountAuthorityLeaseRevisionStore {
    return {
      read: async () => stored, write: async () => undefined, readLease: async () => null,
      bindLease: async () => undefined, writeLease: async () => undefined,
    };
  }
  const binding: AccountAuthorityInstallationBindingPort = {
    obtain: async () => Object.freeze({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
    readPersistedForLease: async () => null,
    rotate: async () => Object.freeze({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
    reset: async () => undefined,
    resetForLease: async () => undefined,
  };
  const request = (intent?: 'sign_in' | 'resume') => ({
    firebaseAuthUid: parseFirebaseAuthUid('firebase-user-a'),
    deviceId: parseDeviceId('device-a'),
    operationId: parseOperationId('acquire-op'),
    ...(intent === undefined ? {} : { intent }),
  });
  const port = (invoke: (name: string, data: Readonly<Record<string, unknown>>) => Promise<unknown>, stored: number | null = 4) => (
    createAccountAuthorityFirebaseLeasePort({ invoke, revisionStore: revisions(stored), installationBinding: binding, retry: { sleep: async () => undefined } })
  );

  test.each(['revision_mismatch', 'stale_lease'])('продление: %s → lease_evicted', async (code) => {
    const invoke = jest.fn(async () => { throw rejected(code); });
    await expect(port(invoke).acquire(request('resume'))).rejects.toThrow('account_authority_lease_evicted');
  });

  test('временная сеть — не вытеснение', async () => {
    const invoke = jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'functions/unavailable' }); });
    await expect(port(invoke).acquire(request('resume'))).rejects.toThrow('account_authority_lease_unavailable');
  });

  test('код вне списка (identity_mismatch) и старый сервер без кода — не вытеснение', async () => {
    const other = jest.fn(async () => { throw rejected('identity_mismatch'); });
    await expect(port(other).acquire(request('resume'))).rejects.toThrow('account_authority_lease_rejected');
    const old = jest.fn(async () => { throw rejected(null); });
    await expect(port(old).acquire(request('resume'))).rejects.toThrow('account_authority_lease_rejected');
  });

  test('явный вход: ОДИН повтор с ревизией сервера (забрать аренду), продление — никогда', async () => {
    let calls = 0;
    const invoke = jest.fn(async (_name: string, data: Readonly<Record<string, unknown>>) => {
      calls += 1;
      if (data.expectedRevision !== null) throw rejected('revision_mismatch');
      return acquired(9);
    });
    await expect(port(invoke).acquire(request('sign_in'))).resolves.toMatchObject({ accountId: parseAccountId(ACCOUNT_A) });
    expect(calls).toBe(2);
    expect(invoke.mock.calls[1]?.[1]).toMatchObject({ expectedRevision: null });
  });
});

describe('AA S4b: журнал операций в пределах SecureStore', () => {
  const destructive = (index: number, receipt: boolean) => ({
    operationId: `delete-op-${index}`,
    kind: 'delete',
    destructive: {
      kind: 'delete',
      fingerprint: JSON.stringify([`acct-${index}`, `sess-${index}`, 1]),
      owner: { accountId: `acct-${index}`, sessionId: `sess-${index}` },
      expectedGeneration: 1,
      stage: 'local_applied',
      receipt: receipt ? { type: 'local_deleted', generation: 2 } : null,
    },
  });

  test('больше 512 операций — журнал обрезан, незавершённые разрушающие не потеряны, значения ≤ 2048 Б', async () => {
    const env = await setup();
    const store = env.bootstrap.localStore;
    store.reserveOperation(parseOperationId('delete-keep'), 'delete', {
      fingerprint: 'fp-keep', owner: { accountId: parseAccountId('acct-keep'), sessionId: parseSessionId('sess-keep') },
      expectedGeneration: accountAuthorityGeneration(0), stage: 'reserved',
    });
    store.markDestructiveOperationLocalApplied(parseOperationId('delete-keep'), 'delete', 'fp-keep');
    for (let index = 0; index < 600; index += 1) store.reserveOperation(parseOperationId(`commit-op-${index}`), 'commit');
    const index = JSON.parse(env.secure.snapshot()[`${OPERATION_JOURNAL_PREFIX}.index`]) as { slots: number[] };
    expect(index.slots.length).toBeLessThanOrEqual(MAX_JOURNAL_OPERATIONS);
    expect(Math.max(...Object.values(env.secure.snapshot()).map((value) => Buffer.byteLength(value, 'utf8')))).toBeLessThanOrEqual(LIMIT);
    await flush();
    const restarted = await setup(env.server, env.secure, env.storage);
    expect(restarted.bootstrap.localStore.getDestructiveOperation(parseOperationId('delete-keep'))).toMatchObject({ stage: 'local_applied' });
    expect(restarted.bootstrap.localStore.getOperationKind(parseOperationId('commit-op-599'))).toBe('commit');
    expect(restarted.bootstrap.localStore.getOperationKind(parseOperationId('commit-op-0'))).toBeNull();
  });

  test('переполнение без неразрушающих: уходит старая квитанция, а не старая НЕзавершённая операция', async () => {
    const env = await setup();
    const store = env.bootstrap.localStore;
    const reserveDelete = (id: string) => {
      store.reserveOperation(parseOperationId(id), 'delete', {
        fingerprint: `fp-${id}`, owner: { accountId: parseAccountId(`acct-${id}`), sessionId: parseSessionId(`sess-${id}`) },
        expectedGeneration: accountAuthorityGeneration(0), stage: 'reserved',
      });
      store.markDestructiveOperationLocalApplied(parseOperationId(id), 'delete', `fp-${id}`);
    };
    reserveDelete('delete-first');
    for (let index = 0; index < MAX_JOURNAL_OPERATIONS - MAX_JOURNAL_RECEIPTS - 1; index += 1) reserveDelete(`delete-open-${index}`);
    for (let index = 0; index < MAX_JOURNAL_RECEIPTS; index += 1) {
      reserveDelete(`delete-done-${index}`);
      store.completeDestructiveOperation(parseOperationId(`delete-done-${index}`), 'delete', `fp-delete-done-${index}`,
        { type: 'local_deleted', generation: accountAuthorityGeneration(1) });
    }
    reserveDelete('delete-new');
    expect(store.getDestructiveOperation(parseOperationId('delete-first'))).toMatchObject({ stage: 'local_applied' });
    expect(store.getDestructiveOperation(parseOperationId('delete-new'))).not.toBeNull();
    expect(store.getDestructiveOperation(parseOperationId('delete-done-0'))).toBeNull();
  });

  test('L-1 (р2): 64 незавершённые разрушающие + ещё одна разрушающая → store_full, все 64 на месте', async () => {
    const env = await setup();
    const store = env.bootstrap.localStore;
    const reserve = (id: string) => store.reserveOperation(parseOperationId(id), 'delete', {
      fingerprint: `fp-${id}`, owner: { accountId: parseAccountId(`acct-${id}`), sessionId: parseSessionId(`sess-${id}`) },
      expectedGeneration: accountAuthorityGeneration(0), stage: 'reserved',
    });
    for (let index = 0; index < MAX_JOURNAL_OPERATIONS; index += 1) reserve(`delete-${index}`);
    expect(() => reserve('delete-extra')).toThrow('account_authority_operation_store_full');
    for (let index = 0; index < MAX_JOURNAL_OPERATIONS; index += 1) {
      expect(store.getDestructiveOperation(parseOperationId(`delete-${index}`))).not.toBeNull();
    }
    expect(store.getDestructiveOperation(parseOperationId('delete-extra'))).toBeNull();
  });

  test('L-3 (р2): перенос v1 со 100 незавершёнными — все перенесены, остальное обрезано, хранилище создаётся', async () => {
    const secure = secureStore();
    const operations = [
      ...Array.from({ length: 100 }, (_, index) => destructive(index, false)),
      ...Array.from({ length: 20 }, (_, index) => destructive(200 + index, true)),
      ...Array.from({ length: 30 }, (_, index) => ({ operationId: `commit-${index}`, kind: 'commit', destructive: null })),
    ];
    secure.raw.set(V1_KEY, JSON.stringify({ schemaVersion: 'account-authority-local-metadata.v1', generation: 3, operations }));
    const env = await setup(fakeLease(), secure);
    const store = env.bootstrap.localStore;
    for (let index = 0; index < 100; index += 1) {
      expect(store.getDestructiveOperation(parseOperationId(`delete-op-${index}`))).toMatchObject({ stage: 'local_applied' });
    }
    expect(store.getOperationKind(parseOperationId('commit-0'))).toBeNull();
    expect(Math.max(...Object.values(secure.snapshot()).map((value) => Buffer.byteLength(value, 'utf8')))).toBeLessThanOrEqual(LIMIT);
    expect(() => store.reserveOperation(parseOperationId('commit-new'), 'commit')).toThrow('account_authority_operation_store_full');
    const restarted = await setup(env.server, secure, env.storage);
    expect(restarted.bootstrap.localStore.getDestructiveOperation(parseOperationId('delete-op-99'))).not.toBeNull();
  });

  test('L-3 (р2): незавершённых больше физического потолка индекса — громкая тревога и отказ закрыто', async () => {
    const secure = secureStore();
    const operations = Array.from({ length: 2 * MAX_JOURNAL_OPERATIONS + 1 }, (_, index) => destructive(index, false));
    secure.raw.set(V1_KEY, JSON.stringify({ schemaVersion: 'account-authority-local-metadata.v1', generation: 3, operations }));
    const critical: string[] = [];
    await expect(createAccountAuthorityProductionBootstrap(dependencies(secure, new MemoryScopeStorageAdapter(), fakeLease(), critical)))
      .rejects.toThrow('account_authority_local_metadata_unavailable');
    expect(critical).toEqual(['aa_s4:journal migration_overflow account_authority_local_metadata_unavailable']);
    expect(secure.snapshot()[V1_KEY]).toBeDefined();
  });

  test('журнал полон незавершёнными разрушающими — новая операция отказ store_full, ничего не вытеснено', async () => {
    const env = await setup();
    const store = env.bootstrap.localStore;
    for (let index = 0; index < MAX_JOURNAL_OPERATIONS; index += 1) {
      store.reserveOperation(parseOperationId(`delete-${index}`), 'delete', {
        fingerprint: `fp-${index}`, owner: { accountId: parseAccountId(`acct-${index}`), sessionId: parseSessionId(`sess-${index}`) },
        expectedGeneration: accountAuthorityGeneration(0), stage: 'reserved',
      });
    }
    expect(() => store.reserveOperation(parseOperationId('commit-extra'), 'commit')).toThrow('account_authority_operation_store_full');
    expect(store.getDestructiveOperation(parseOperationId('delete-0'))).not.toBeNull();
  });

  test('перенос v1 → v2: поколение и незавершённые удаления на месте, квитанций ≤ 16, старый ключ убран', async () => {
    const secure = secureStore();
    const operations = [
      destructive(0, false),
      ...Array.from({ length: 20 }, (_, index) => destructive(index + 1, true)),
      ...Array.from({ length: 100 }, (_, index) => ({ operationId: `commit-${index}`, kind: 'commit', destructive: null })),
    ];
    secure.raw.set(V1_KEY, JSON.stringify({ schemaVersion: 'account-authority-local-metadata.v1', generation: 5, operations }));
    const server = fakeLease();
    const env = await setup(server, secure);
    const store = env.bootstrap.localStore;
    expect(store.getAuthorityGeneration().value).toBe(5);
    expect(store.getDestructiveOperation(parseOperationId('delete-op-0'))).toMatchObject({ stage: 'local_applied' });
    const index = JSON.parse(secure.snapshot()[`${OPERATION_JOURNAL_PREFIX}.index`]) as { slots: number[] };
    expect(index.slots.length).toBeLessThanOrEqual(MAX_JOURNAL_OPERATIONS);
    const receipts = Array.from({ length: 20 }, (_, i) => store.getDestructiveOperation(parseOperationId(`delete-op-${i + 1}`)))
      .filter((entry) => entry !== null);
    expect(receipts.length).toBe(MAX_JOURNAL_RECEIPTS);
    expect(store.getDestructiveOperation(parseOperationId('delete-op-20'))).not.toBeNull();
    await flush();
    expect(secure.snapshot()[V1_KEY]).toBeUndefined();
    expect(JSON.parse(secure.snapshot()[V2_KEY])).toEqual({ schemaVersion: 'account-authority-local-metadata.v2', generation: 5 });
    expect(Math.max(...Object.values(secure.snapshot()).map((value) => Buffer.byteLength(value, 'utf8')))).toBeLessThanOrEqual(LIMIT);
  });
});

describe('AA S4b: шлюз продления R1', () => {
  test('холодный старт и возврат из фона, не чаще раза в 5 минут; неудача не сдвигает отметку', async () => {
    let now = 1_000_000;
    const resume = jest.fn(async () => undefined);
    const lines: string[] = [];
    const driver = createAccountAuthorityRenewalDriver({
      gate: createAccountAuthorityRenewalGate({ nowMs: () => now }),
      resume,
      log: { info: (event: string) => { lines.push(event); }, warn: (event: string) => { lines.push(event); } },
    });
    await expect(driver.trigger('cold_start')).resolves.toBe('succeeded');
    await expect(driver.trigger('foreground')).resolves.toBe('skipped');
    await expect(driver.trigger('other')).resolves.toBe('skipped');
    now += 5 * 60_000;
    resume.mockRejectedValueOnce(new Error('account_authority_lease_unavailable'));
    await expect(driver.trigger('foreground')).resolves.toBe('failed');
    await expect(driver.trigger('foreground')).resolves.toBe('succeeded');
    expect(resume).toHaveBeenCalledTimes(3);
    expect(lines).toContain('[AA-S4] renewal skipped');
  });

  test('ворота cutover выключены — ни драйвера, ни слушателя AppState', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    jest.isolateModules(() => {
      const addEventListener = jest.fn();
      jest.doMock('react-native', () => ({ Platform: { OS: 'android' }, AppState: { addEventListener } }));
      jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => false }));
      const driverLoaded = jest.fn();
      jest.doMock('../modules/account-authority-v2/account_authority_renewal_driver', () => {
        driverLoaded();
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
      gate.syncAccountsV2ClientAuth('uid-a');
      expect(addEventListener).not.toHaveBeenCalled();
      expect(driverLoaded).not.toHaveBeenCalled();
    });
    jest.dontMock('react-native');
    jest.dontMock('../app/remote_flags');
    jest.dontMock('../modules/account-authority-v2/account_authority_renewal_driver');
  });
});
