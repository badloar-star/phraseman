import fs from 'fs';
import path from 'path';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
  type FirebaseAuthUid,
} from '../modules/account-authority-v2/account_authority_ids';
import { createDurableSlotList } from '../modules/account-authority-v2/account_authority_durable_slots';
import {
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityInstallationBindingPort,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import {
  accountAuthorityRemoteDeleteQueueState,
} from '../modules/account-authority-v2/account_authority_remote_delete_queue';
import {
  createAccountAuthorityRuntime,
  type AccountAuthorityLeasePort,
  type AccountAuthorityProviderPort,
} from '../modules/account-authority-v2/account_authority_runtime';
import type { AccountAuthorityLogFields } from '../modules/account-authority-v2/account_authority_logger';
import {
  OPERATION_JOURNAL_PREFIX,
  createAccountAuthorityProductionBootstrap,
  type AccountAuthorityProductionAdapterDependencies,
} from '../modules/account-session-v2/account_authority_production_adapter';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * AA S6: матрица сценариев — клиентская сторона. Каждый тест носит имя
 * `AA-S6 Mxx client …`; строка матрицы в пакете
 * docs/work/tasks/aa-s6-scenario-matrix-mutations-2026-10-04.md ↔ тест
 * сверяется сторожем в конце файла. Серверная сторона —
 * functions/src/account_authority/aa_s6_scenario_matrix.test.ts.
 */

const ROOT = path.resolve(__dirname, '..');
const PACKAGE = path.join(ROOT, 'docs', 'work', 'tasks', 'aa-s6-scenario-matrix-mutations-2026-10-04.md');
const SERVER_TESTS = path.join(ROOT, 'functions', 'src', 'account_authority', 'aa_s6_scenario_matrix.test.ts');
const LIMIT = 2048;
const ACCOUNT_A = 'account-server-a';
const ACCOUNT_B = 'account-server-b';
const V1_KEY = 'phraseman.account_authority.local_metadata.v1';
const V2_KEY = 'phraseman.account_authority.local_metadata.v2';

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

type Mode = 'online' | 'evicted' | 'offline' | 'server_failed' | 'revoked';

/**
 * Фейковый сервер аренды, как настоящий: продление того же аккаунта с того же
 * устройства отдаёт ТУ ЖЕ сессию (renewed); новую — только после захвата
 * аренды другим устройством (`takenOver`) или выхода.
 */
function fakeServer() {
  const state = {
    mode: 'online' as Mode,
    acquires: 0,
    releases: 0,
    deletes: 0,
    obtains: 0,
    intents: [] as string[],
    sessions: 0,
    takenOver: false,
    revokedCode: 'account_authority_lease_binding_rejected',
    current: new Map<string, string>(),
  };
  const accountFor = (uid: FirebaseAuthUid) => (uid.value === 'firebase-user-b' ? ACCOUNT_B : ACCOUNT_A);
  const lease: AccountAuthorityLeasePort = {
    acquire: async (request) => {
      state.acquires += 1;
      state.intents.push(request.intent ?? 'none');
      if (state.mode === 'evicted') throw new Error('account_authority_lease_evicted');
      if (state.mode === 'offline') throw new Error('account_authority_lease_unavailable');
      if (state.mode === 'server_failed') throw new Error('account_authority_lease_server_failed');
      if (state.mode === 'revoked') throw new Error(state.revokedCode);
      const account = accountFor(request.firebaseAuthUid);
      let session = state.current.get(account);
      if (session === undefined || state.takenOver) {
        state.sessions += 1;
        session = `session-server-${state.sessions}`;
        state.current.set(account, session);
        state.takenOver = false;
      }
      return Object.freeze({ accountId: parseAccountId(account), sessionId: parseSessionId(session) });
    },
    release: async (request) => {
      state.releases += 1;
      if (state.mode === 'offline') throw new Error('account_authority_lease_unavailable');
      state.current.delete(request.accountId.value);
    },
    deleteAccount: async () => {
      state.deletes += 1;
      if (state.mode === 'offline') throw new Error('account_authority_lease_unavailable');
    },
  };
  return { state, lease };
}

function dependencies(input: Readonly<{
  secure: Secure;
  storage: MemoryScopeStorageAdapter;
  server: ReturnType<typeof fakeServer>;
  lines: string[];
  path?: 'authority' | 'legacy_primary';
  installationId?: string;
}>): AccountAuthorityProductionAdapterDependencies {
  const binding: AccountAuthorityInstallationBindingPort = {
    obtain: async () => {
      input.server.state.obtains += 1;
      return Object.freeze({ bindingToken: 'opaque', deviceBindingId: parseDeviceId('server-device-a') });
    },
    readPersistedForLease: async () => null,
    rotate: async () => { throw new Error('not_used'); },
    reset: async () => undefined,
    resetForLease: async () => undefined,
  };
  return {
    secureStore: input.secure,
    createStorageAdapter: () => input.storage,
    randomInstallationId: async () => input.installationId ?? '5d3b3527-07e0-4dc1-8aac-000000000001',
    digestSha256: async (value) => `hash-${Buffer.from(value).toString('hex').slice(0, 48)}`,
    createInstallationBinding: () => binding,
    createLease: () => input.server.lease,
    providerSignOut: async () => undefined,
    remoteDeleteFirstSendDeadlineMs: 20,
    ...(input.path === undefined ? {} : { remoteDeleteServerPath: input.path }),
    logger: {
      info: (event: string, fields?: AccountAuthorityLogFields) => { input.lines.push(`${event} ${JSON.stringify(fields ?? {})}`); },
      warn: (event: string, fields?: AccountAuthorityLogFields) => { input.lines.push(`${event} ${JSON.stringify(fields ?? {})}`); },
    },
  };
}

async function flush(rounds = 30): Promise<void> {
  for (let index = 0; index < rounds; index += 1) await new Promise<void>((resolve) => setImmediate(resolve));
}

type Env = Awaited<ReturnType<typeof setup>>;

async function setup(options: Readonly<{
  server?: ReturnType<typeof fakeServer>;
  secure?: Secure;
  storage?: MemoryScopeStorageAdapter;
  path?: 'authority' | 'legacy_primary';
  installationId?: string;
}> = {}) {
  const server = options.server ?? fakeServer();
  const secure = options.secure ?? secureStore();
  const storage = options.storage ?? new MemoryScopeStorageAdapter();
  const lines: string[] = [];
  const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies({
    secure, storage, server, lines, path: options.path, installationId: options.installationId,
  }));
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
    logger: {
      info: (event: string, fields?: AccountAuthorityLogFields) => { lines.push(`${event} ${JSON.stringify(fields ?? {})}`); },
      warn: (event: string, fields?: AccountAuthorityLogFields) => { lines.push(`${event} ${JSON.stringify(fields ?? {})}`); },
    },
  });
  return { server, secure, storage, bootstrap, runtime, events, lines, useUid: (next: string) => { uid = next; } };
}

function records(env: Env, account: string): string[] {
  return env.storage.snapshot(`account:${account}`).map((record) => record.key);
}

function preserved(env: Env, account: string): string[] {
  return records(env, account).filter((key) => key.startsWith('account_authority.preserved.'));
}

function op(value: string) {
  return parseOperationId(value);
}

describe('AA-S6 матрица: клиент', () => {
  test('AA-S6 M01 client новый пользователь: вход открывает область своего аккаунта', async () => {
    const env = await setup();
    await expect(env.runtime.signIn(op('sign-in-a'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.runtime.getState().phase).toBe('authenticated');
    expect(env.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
    expect(env.server.state.intents).toEqual(['sign_in']);
  });

  test('AA-S6 M02 client существующий аккаунт: повторный запуск продлевает ту же область без нового входа', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    const restarted = await setup({ server: env.server, secure: env.secure, storage: env.storage });
    await expect(restarted.runtime.resume(op('resume-a'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(restarted.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
    expect(env.server.state.intents.slice(-1)).toEqual(['resume']);
  });

  test('AA-S6 M04 client смена A→B→A: области раздельны, запись A не попадает в B', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.runtime.capturePreservedWrite({ operationId: op('lesson-a'), domain: 'lesson_progress' });
    env.useUid('firebase-user-b');
    await env.runtime.signIn(op('sign-in-b'));
    env.useUid('firebase-user-a');
    await expect(env.runtime.signIn(op('sign-in-a2'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.storage.openCalls).toEqual([`account:${ACCOUNT_A}`, `account:${ACCOUNT_B}`, `account:${ACCOUNT_A}`]);
    expect(preserved(env, ACCOUNT_A)).toEqual(['account_authority.preserved.lesson_progress.lesson-a']);
    expect(preserved(env, ACCOUNT_B)).toEqual([]);
  });

  test('AA-S6 M05 client два устройства: вытеснение сохраняет запись и не выходит из провайдера', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.runtime.capturePreservedWrite({ operationId: op('srs-a'), domain: 'flashcards_srs' });
    env.server.state.mode = 'evicted';
    env.server.state.takenOver = true;
    await expect(env.runtime.resume(op('resume-evicted'))).resolves.toMatchObject({ type: 'device_taken_over' });
    expect(env.bootstrap.localStore.getOpenScope()).toBeNull();
    expect(preserved(env, ACCOUNT_A)).toEqual(['account_authority.preserved.flashcards_srs.srs-a']);
    expect(env.events).toEqual([]);
    expect(env.server.state.releases).toBe(0);
  });

  test('AA-S6 M06 client возврат входом: продление сеть не дёргает, явный вход забирает аренду', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.server.state.mode = 'evicted';
    env.server.state.takenOver = true;
    await env.runtime.resume(op('resume-evicted'));
    const acquires = env.server.state.acquires;
    await env.runtime.resume(op('resume-again'));
    expect(env.server.state.acquires).toBe(acquires);
    env.server.state.mode = 'online';
    await expect(env.runtime.signIn(op('sign-in-back'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.server.state.intents.slice(-1)).toEqual(['sign_in']);
    expect(env.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);

    // Вариант «после перезапуска»: вытеснение на холодном старте, затем вход.
    env.server.state.mode = 'evicted';
    env.server.state.takenOver = true;
    const restarted = await setup({ server: env.server, secure: env.secure, storage: env.storage });
    await expect(restarted.runtime.resume(op('cold-evicted'))).resolves.toMatchObject({ type: 'device_taken_over' });
    env.server.state.mode = 'online';
    await expect(restarted.runtime.signIn(op('sign-in-back-cold'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(restarted.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
    expect(restarted.events).toEqual([]);
  });

  test('AA-S6 M07 client офлайн-старт: из провайдера НЕ выходим, область не открыта до сети', async () => {
    const env = await setup();
    env.server.state.mode = 'offline';
    await expect(env.runtime.resume(op('cold-offline'))).resolves.toMatchObject({ type: 'cancelled' });
    expect(env.events).toEqual([]);
    expect(env.bootstrap.localStore.getOpenScope()).toBeNull();
    expect(env.lines.some((line) => line.startsWith('[AA-S6] resume offline_cold_kept_provider'))).toBe(true);
    // Сеть вернулась — следующий повод открывает область.
    env.server.state.mode = 'online';
    await expect(env.runtime.resume(op('cold-online'))).resolves.toMatchObject({ type: 'authenticated' });
  });

  test('AA-S6 M08 client офлайн-продление: сессия и область остаются', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.server.state.mode = 'offline';
    await expect(env.runtime.resume(op('resume-offline'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
    expect(env.events).toEqual([]);
  });

  test('AA-S6 M09 client офлайн-удаление: мгновенно local_deleted, обязательство в очереди (боевой путь — за старым удалением)', async () => {
    const env = await setup({ path: 'legacy_primary' });
    await env.runtime.signIn(op('sign-in-a'));
    env.server.state.mode = 'offline';
    await expect(env.runtime.deleteAccount(op('delete-a'))).resolves.toMatchObject({ type: 'local_deleted' });
    await flush();
    expect(env.runtime.getState().phase).toBe('signed_out');
    expect(env.server.state.deletes).toBe(0);
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 1, awaitingLegacy: 1 });
    expect(records(env, ACCOUNT_A)).toEqual([]);
  });

  test('AA-S6 M10 client обрыв процесса при входе: после перезапуска вход завершается', async () => {
    const env = await setup();
    const hold = env.storage.holdNext('open');
    const first = env.runtime.signIn(op('sign-in-a'));
    void first.catch(() => undefined);
    await hold.entered;
    // «Убит» до открытия области; новый процесс — те же хранилища.
    const restarted = await setup({ server: env.server, secure: env.secure, storage: env.storage });
    hold.release();
    await flush();
    await expect(restarted.runtime.signIn(op('sign-in-a-again'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(restarted.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
  });

  test('AA-S6 M11 client обрыв процесса при удалении: стирание и обязательство доделываются после перезапуска', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    const hold = env.storage.holdNext('close');
    void env.runtime.deleteAccount(op('delete-a')).catch(() => undefined);
    await hold.entered;
    const restarted = await setup({ server: env.server, secure: env.secure, storage: env.storage });
    await flush();
    expect(env.server.state.deletes).toBe(1);
    expect(records(env, ACCOUNT_A)).toEqual([]);
    expect(restarted.bootstrap.localStore.getOpenScope()).toBeNull();
    hold.release();
    await flush();
  });

  test('AA-S6 M12 client обрыв при переносе журнала: повторный перенос без дублей и потерь', async () => {
    const secure = secureStore();
    const operations = [
      { operationId: 'delete-open', kind: 'delete', destructive: {
        kind: 'delete', fingerprint: 'fp-open', owner: { accountId: 'acct-open', sessionId: 'sess-open' },
        expectedGeneration: 1, stage: 'local_applied', receipt: null,
      } },
      ...Array.from({ length: 10 }, (_, index) => ({ operationId: `commit-${index}`, kind: 'commit', destructive: null })),
    ];
    secure.raw.set(V1_KEY, JSON.stringify({ schemaVersion: 'account-authority-local-metadata.v1', generation: 4, operations }));
    // Первый перенос «убит» после слотов, до ключа v2: имитируем, перенеся и стерев ключ v2.
    const first = await setup({ secure });
    expect(first.bootstrap.localStore.getAuthorityGeneration().value).toBe(4);
    secure.raw.delete(V2_KEY);
    secure.raw.set(V1_KEY, JSON.stringify({ schemaVersion: 'account-authority-local-metadata.v1', generation: 4, operations }));
    const second = await setup({ secure, storage: first.storage });
    expect(second.bootstrap.localStore.getAuthorityGeneration().value).toBe(4);
    expect(second.bootstrap.localStore.getDestructiveOperation(op('delete-open'))).toMatchObject({ stage: 'local_applied' });
    const index = JSON.parse(secure.snapshot()[`${OPERATION_JOURNAL_PREFIX}.index`]) as { slots: number[] };
    expect(index.slots).toHaveLength(operations.length);
  });

  test('AA-S6 M13 client удаление + повтор: двойной тап — одна операция и одна запись очереди', async () => {
    const env = await setup({ path: 'legacy_primary' });
    await env.runtime.signIn(op('sign-in-a'));
    const [one, two] = await Promise.all([
      env.runtime.deleteAccount(op('delete-a')), env.runtime.deleteAccount(op('delete-a')),
    ]);
    expect(one).toMatchObject({ type: 'local_deleted' });
    expect(two).toMatchObject({ type: 'local_deleted' });
    await flush();
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 1 });
    await expect(env.runtime.deleteAccount(op('delete-a-later'))).rejects.toThrow('account_authority_not_authenticated');
  });

  test('AA-S6 M14 client переустановка: новое устройство, новая привязка, вход работает', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    const reinstalled = await setup({ server: env.server, installationId: '5d3b3527-07e0-4dc1-8aac-000000000002' });
    expect(reinstalled.bootstrap.deviceId.value).not.toBe(env.bootstrap.deviceId.value);
    await expect(reinstalled.runtime.signIn(op('sign-in-after-reinstall'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(reinstalled.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
  });

  test('AA-S6 M16 client 1.6.24 рядом: при выключенных воротах новый путь не грузится, старый поток удаления как раньше', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'android' }, AppState: { addEventListener: jest.fn() } }));
      jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => false }));
      const loaded = jest.fn();
      jest.doMock('../modules/account-session-v2/accounts_v2_client_runtime', () => {
        loaded();
        return {};
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const gate = require('../app/accounts_v2_client_flag') as typeof import('../app/accounts_v2_client_flag');
      expect(gate.isAccountAuthorityV2CutoverEnabled()).toBe(false);
      expect(gate.beginAccountAuthorityDeletionIfEnabled()).toBeNull();
      expect(loaded).not.toHaveBeenCalled();
    });
    jest.dontMock('react-native');
    jest.dontMock('../app/remote_flags');
    jest.dontMock('../modules/account-session-v2/accounts_v2_client_runtime');
  });

  test('AA-S6 M17 client удаление A, вход B: данные A стёрты и не видны B', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    const write = env.runtime.capturePreservedWrite({ operationId: op('lesson-a'), domain: 'lesson_progress' });
    await env.runtime.commitPreservedWrite(write);
    await env.runtime.deleteAccount(op('delete-a'));
    await flush();
    env.useUid('firebase-user-b');
    await env.runtime.signIn(op('sign-in-b'));
    expect(records(env, ACCOUNT_A)).toEqual([]);
    expect(preserved(env, ACCOUNT_B)).toEqual([]);
    expect(env.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_B);
  });

  test('AA-S6 M18 client логи сценариев без идентификаторов', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.runtime.capturePreservedWrite({ operationId: op('lesson-a'), domain: 'lesson_progress' });
    env.useUid('firebase-user-b');
    await env.runtime.signIn(op('sign-in-b'));
    env.server.state.mode = 'evicted';
    env.server.state.takenOver = true;
    await env.runtime.resume(op('resume-evicted'));
    env.server.state.mode = 'online';
    await env.runtime.signIn(op('sign-in-b-again'));
    await env.runtime.deleteAccount(op('delete-b'));
    await flush();
    expect(env.lines.length).toBeGreaterThan(10);
    expect(env.lines.join('\n')).not.toMatch(/account-server|session-server|firebase-user|sign-in-|delete-b|lesson-a/);
  });
});

describe('AA-S6 убийцы выживших мутантов: runtime', () => {
  test('RT10: надёжное поколение впереди целевого — вход закрыт (generation_regression), область не открыта', async () => {
    const env = await setup();
    const store = env.bootstrap.localStore;
    const warned: string[] = [];
    // Хранилище «уже видело» более новое поколение (другой экземпляр runtime).
    const ahead = {
      ...store,
      advanceAuthorityGeneration: (generation: Parameters<typeof store.advanceAuthorityGeneration>[0]) => (
        store.advanceAuthorityGeneration({ ...generation, value: generation.value + 5 } as typeof generation)
      ),
    };
    const runtime = createAccountAuthorityRuntime({
      deviceId: env.bootstrap.deviceId,
      provider: {
        authenticate: async () => Object.freeze({ type: 'authenticated' as const, firebaseAuthUid: parseFirebaseAuthUid('firebase-user-a') }),
        currentIdentity: async () => parseFirebaseAuthUid('firebase-user-a'),
        signOut: async () => undefined,
      },
      lease: env.bootstrap.lease,
      localStore: ahead,
      logger: { info: () => undefined, warn: (event: string) => { warned.push(event); } },
    });
    await expect(runtime.signIn(op('sign-in-ahead'))).rejects.toThrow('account_authority_generation_regression');
    expect(store.getOpenScope()).toBeNull();
    // Забор runtime сработал сам, а не только защита области в адаптере.
    expect(warned).toContain('lease establish_generation_regression');
  });
});

describe('AA-S6 убийцы выживших мутантов: очередь удаления', () => {
  test('Q4: повторная постановка той же операции (повтор после сбоя/перезапуска) — без ошибки и без дубля', async () => {
    const env = await setup({ path: 'legacy_primary' });
    const request = {
      accountId: parseAccountId(ACCOUNT_A),
      sessionId: parseSessionId('session-server-1'),
      deviceId: env.bootstrap.deviceId,
      operationId: op('delete-repeat'),
    };
    await env.bootstrap.lease.deleteAccount(request);
    await expect(env.bootstrap.lease.deleteAccount(request)).resolves.toBeUndefined();
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 1 });
  });
});

describe('AA-S6b LOW-1: окончательный отказ ≠ «нет сети»', () => {
  const binding: AccountAuthorityInstallationBindingPort = {
    obtain: async () => Object.freeze({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
    readPersistedForLease: async () => null,
    rotate: async () => { throw new Error('not_used'); },
    reset: async () => undefined,
    resetForLease: async () => undefined,
  };
  const port = (invoke: () => Promise<unknown>) => createAccountAuthorityFirebaseLeasePort({
    invoke,
    revisionStore: {
      read: async () => 3, write: async () => undefined, readLease: async () => null,
      bindLease: async () => undefined, writeLease: async () => undefined,
    },
    installationBinding: binding,
    retry: { sleep: async () => undefined, maxAttempts: 1 },
  });
  const request = {
    firebaseAuthUid: parseFirebaseAuthUid('firebase-user-a'),
    deviceId: parseDeviceId('device-a'),
    operationId: op('acquire-low1'),
    intent: 'resume' as const,
  };

  test.each([
    ['internal', 'account_authority_lease_server_failed'],
    ['permission-denied', 'account_authority_lease_server_failed'],
    ['unavailable', 'account_authority_lease_unavailable'],
    ['network-request-failed', 'account_authority_lease_unavailable'],
  ])('транспорт: код %s → %s', async (code, expected) => {
    const invoke = jest.fn(async () => { throw Object.assign(new Error('x'), { code: `functions/${code}` }); });
    await expect(port(invoke).acquire(request)).rejects.toThrow(expected);
  });

  test('транспорт: локальная поломка → local_failed (не «нет сети»)', async () => {
    const invoke = jest.fn(async () => { throw new Error('account_authority_lease_revision_unavailable'); });
    await expect(port(invoke).acquire(request)).rejects.toThrow('account_authority_lease_local_failed');
  });

  // S6b раунд 2 (ревью HIGH): выход из провайдера на продлении — ТОЛЬКО при
  // доказанном отзыве доступа; сбой сервера / нераспознанный код (iOS «нет
  // интернета» = unknown) вход сохраняет.
  test('runtime: сбой сервера при продлении живой сессии — сессия остаётся, выхода нет', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.server.state.mode = 'server_failed';
    const result = await env.runtime.resume(op('resume-server-failed'));
    expect(result.type).toBe('authenticated');
    expect(env.events).not.toContain('provider_sign_out');
    expect(env.lines.some((line) => line.startsWith('[AA-S4] resume offline_kept_session'))).toBe(true);
  });

  test('runtime: сбой сервера на холодном старте — вход Firebase сохранён (как D1)', async () => {
    const env = await setup();
    env.server.state.mode = 'server_failed';
    const result = await env.runtime.resume(op('cold-server-failed'));
    expect(result.type).toBe('cancelled');
    expect(env.events).not.toContain('provider_sign_out');
    expect(env.lines.some((line) => line.startsWith('[AA-S6] resume offline_cold_kept_provider'))).toBe(true);
  });

  test('runtime: доказанный отзыв доступа на продлении — закрыто (выход из провайдера)', async () => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.server.state.mode = 'revoked';
    await expect(env.runtime.resume(op('resume-revoked'))).rejects.toThrow('account_authority_lease_binding_rejected');
    expect(env.runtime.getState().phase).toBe('signed_out');
    expect(env.events).toContain('provider_sign_out');
    expect(env.lines.some((line) => line.startsWith('[AA-S6] lease establish_final_failure'))).toBe(true);
  });

  test('runtime: доказанный отзыв доступа на холодном старте — закрыто, без ветки D1', async () => {
    const env = await setup();
    env.server.state.mode = 'revoked';
    await expect(env.runtime.resume(op('cold-revoked'))).rejects.toThrow('account_authority_lease_binding_rejected');
    expect(env.events).toContain('provider_sign_out');
    expect(env.lines.some((line) => line.startsWith('[AA-S6] resume offline_cold_kept_provider'))).toBe(false);
  });

  // S6b раунд 3 (ревью M-1): КАЖДЫЙ код доказательства отзыва поштучно — иначе
  // выпавший из списка код (например, «аккаунт удаляется» с другого устройства)
  // оставил бы область удалённого аккаунта открытой.
  const REVOCATION_CODES = [
    'account_authority_lease_unauthenticated',
    'account_authority_lease_binding_rejected',
    'account_authority_lease_deletion_pending',
    'account_authority_lease_identity_unresolved',
    'account_authority_lease_provider_rejected',
  ] as const;

  test.each(REVOCATION_CODES)('отзыв %s при живой сессии — выход из провайдера, область закрыта', async (code) => {
    const env = await setup();
    await env.runtime.signIn(op('sign-in-a'));
    env.server.state.mode = 'revoked';
    env.server.state.revokedCode = code;
    await expect(env.runtime.resume(op(`resume-${code}`))).rejects.toThrow(code);
    expect(env.runtime.getState().phase).toBe('signed_out');
    expect(env.events).toContain('provider_sign_out');
    expect(env.lines.some((line) => line.startsWith('[AA-S4] resume offline_kept_session'))).toBe(false);
  });

  test.each(REVOCATION_CODES)('отзыв %s на холодном старте — выход из провайдера, без ветки D1', async (code) => {
    const env = await setup();
    env.server.state.mode = 'revoked';
    env.server.state.revokedCode = code;
    await expect(env.runtime.resume(op(`cold-${code}`))).rejects.toThrow(code);
    expect(env.events).toContain('provider_sign_out');
    expect(env.lines.some((line) => line.startsWith('[AA-S6] resume offline_cold_kept_provider'))).toBe(false);
  });

  test('сторож: список доказательств отзыва в runtime совпадает с ожидаемым', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'modules', 'account-authority-v2', 'account_authority_runtime.ts'), 'utf8');
    const start = source.indexOf('const LEASE_REVOCATION_PROOF_CODES');
    expect(start).toBeGreaterThan(-1);
    const block = source.slice(start, source.indexOf(']);', start));
    const listed = [...block.matchAll(/'(account_authority_lease_[a-z_]+)'/g)].map((match) => match[1]).sort();
    expect(listed).toEqual([...REVOCATION_CODES].sort());
  });

  test('транспорт: iOS «нет интернета» приходит как functions/unknown → не доказательство отзыва', async () => {
    const invoke = jest.fn(async () => { throw Object.assign(new Error('x'), { code: 'functions/unknown' }); });
    await expect(port(invoke).acquire(request)).rejects.toThrow('account_authority_lease_server_failed');
  });
});

describe('AA-S6 долг S4b LOW-2', () => {
  test('обычный add не обходит ёмкость; обход — только явным overCapacity и только до потолка индекса', () => {
    const secure = secureStore();
    const list = createDurableSlotList<string>({
      secureStore: secure, options: {}, log: { info: () => undefined, warn: () => undefined },
      prefix: 'test.s6', schema: 'test.v1', max: 2, label: 'test_s6',
      invalidCode: 'x_invalid', fullCode: 'x_full', unavailableCode: 'x_unavailable',
      parse: (value) => String(value), keyOf: (value) => value,
    });
    list.add('a');
    list.add('b');
    expect(() => list.add('c')).toThrow('x_full');
    expect(() => list.add('c', { overCapacity: false })).toThrow('x_full');
    expect(list.size()).toBe(2);
    list.add('c', { overCapacity: true });
    list.add('d', { overCapacity: true });
    expect(list.indexLimit()).toBe(4);
    expect(() => list.add('e', { overCapacity: true })).toThrow('x_full');
    expect(list.size()).toBe(4);
  });
});

describe('AA-S6 сторож матрицы', () => {
  type Row = Readonly<{ id: string; client: string; server: string }>;

  function matrixRows(): Row[] {
    const text = fs.readFileSync(PACKAGE, 'utf8');
    const start = text.indexOf('<!-- AA-S6-MATRIX:START -->');
    const end = text.indexOf('<!-- AA-S6-MATRIX:END -->');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return text.slice(start, end).split('\n')
      .filter((line) => /^\|\s*M\d{2}\s*\|/.test(line))
      .map((line) => {
        const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
        return Object.freeze({ id: cells[0], client: cells[4], server: cells[5] });
      });
  }

  function testIds(source: string, side: 'client' | 'server'): string[] {
    return [...source.matchAll(new RegExp(`AA-S6 (M\\d{2}) ${side}\\b`, 'g'))].map((match) => match[1]);
  }

  test('каждая клетка матрицы — живой тест (или «ждёт решения»), и каждый тест — в матрице', () => {
    const rows = matrixRows();
    expect(rows.length).toBeGreaterThanOrEqual(18);
    const clientSource = fs.readFileSync(__filename, 'utf8');
    const serverSource = fs.readFileSync(SERVER_TESTS, 'utf8');
    const clientIds = new Set(testIds(clientSource, 'client'));
    const serverIds = new Set(testIds(serverSource, 'server'));
    for (const row of rows) {
      for (const [cell, ids, side] of [[row.client, clientIds, 'client'], [row.server, serverIds, 'server']] as const) {
        if (cell === `AA-S6 ${row.id} ${side}`) {
          expect(`${row.id} ${side}: ${ids.has(row.id) ? 'test' : 'missing'}`).toBe(`${row.id} ${side}: test`);
        } else {
          expect(`${row.id} ${side}: ${cell}`).toMatch(new RegExp(`^${row.id} ${side}: (ждёт решения В[1-4]|—)`));
          expect(`${row.id} ${side}: ${ids.has(row.id) ? 'unexpected_test' : 'none'}`).toBe(`${row.id} ${side}: none`);
        }
      }
    }
    const listed = new Set(rows.map((row) => row.id));
    for (const id of [...clientIds, ...serverIds]) expect(`${id}: ${listed.has(id) ? 'listed' : 'not_in_matrix'}`).toBe(`${id}: listed`);
  });
});
