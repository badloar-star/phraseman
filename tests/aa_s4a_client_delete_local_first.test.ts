import { accountAuthorityGeneration } from '../modules/account-authority-v2/account_authority_contract';
import {
  parseAccountId,
  parseDeviceId,
  parseFirebaseAuthUid,
  parseOperationId,
  parseSessionId,
  type FirebaseAuthUid,
} from '../modules/account-authority-v2/account_authority_ids';
import {
  createAccountAuthorityFirebaseLeasePort,
  type AccountAuthorityInstallationBindingPort,
  type AccountAuthorityLeaseRevisionStore,
} from '../modules/account-authority-v2/account_authority_lease_transport';
import {
  createAccountAuthorityRuntime,
  type AccountAuthorityLeasePort,
  type AccountAuthorityProviderPort,
} from '../modules/account-authority-v2/account_authority_runtime';
import type { AccountAuthorityLogFields } from '../modules/account-authority-v2/account_authority_logger';
import {
  createAccountAuthorityProductionBootstrap,
  type AccountAuthorityProductionAdapterDependencies,
} from '../modules/account-session-v2/account_authority_production_adapter';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';
import { createDurableSlotList } from '../modules/account-authority-v2/account_authority_durable_slots';
import {
  accountAuthorityRemoteDeleteQueueState,
  resolveAccountAuthorityRemoteDeleteByLegacy,
} from '../modules/account-authority-v2/account_authority_remote_delete_queue';

/*
 * AA S4a (клиент): удаление аккаунта local-first.
 *   - надгробие синхронно, UI сразу «удалено», сеть не ждём;
 *   - стиратель локальных данных асинхронный, идемпотентный, доживает до
 *     перезапуска; серверное удаление — надёжная очередь, тоже доживает;
 *   - поздний ответ сервера/входа не воскрешает удалённый аккаунт;
 *   - двойной тап — одна операция; A→B→A без цикла.
 */

const ERASE_PREFIX = 'phraseman.account_authority.local_erase.v2';
const OUTBOX_PREFIX = 'phraseman.account_authority.remote_delete.v2';
const SECURE_VALUE_LIMIT = 2048;
const ACCOUNT_A = 'account-server-a';
const ACCOUNT_B = 'account-server-b';

type SecureStoreFake = AccountAuthorityProductionAdapterDependencies['secureStore'] & Readonly<{
  snapshot(): Readonly<Record<string, string>>;
  /** Раунд 4: асинхронные удаления задерживаются до releaseDeletes(). */
  deferDeletes(): void;
  releaseDeletes(): Promise<void>;
  raw: Map<string, string>;
}>;

function secureStore(): SecureStoreFake {
  const values = new Map<string, string>();
  let defer = false;
  const deferred: Array<() => void> = [];
  return {
    raw: values,
    deferDeletes: () => { defer = true; },
    releaseDeletes: async () => {
      defer = false;
      for (const run of deferred.splice(0)) run();
      await flush();
    },
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device-only',
    getItem: (key) => values.get(key) ?? null,
    // Как настоящий SecureStore: значение больше 2048 байт не сохраняется.
    setItem: (key, value) => {
      if (Buffer.byteLength(value, 'utf8') > SECURE_VALUE_LIMIT) throw new Error('secure_store_value_too_large');
      values.set(key, value);
    },
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => { values.set(key, value); },
    deleteItemAsync: (key) => {
      if (!defer) {
        values.delete(key);
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => { deferred.push(() => { values.delete(key); resolve(); }); });
    },
    snapshot: () => Object.freeze(Object.fromEntries(values)),
  };
}

type ServerMode = 'online' | 'offline' | 'hang' | 'unauthenticated' | 'purged' | 'rejected' | 'binding_unavailable'
  | 'revision_unavailable' | 'binding_rejected' | 'invalid';

const MODE_ERRORS: Readonly<Record<string, string>> = {
  offline: 'account_authority_lease_unavailable',
  unauthenticated: 'account_authority_lease_unauthenticated',
  purged: 'account_authority_lease_identity_unresolved',
  rejected: 'account_authority_lease_rejected',
  binding_unavailable: 'account_authority_installation_binding_unavailable',
  revision_unavailable: 'account_authority_lease_revision_unavailable',
  binding_rejected: 'account_authority_lease_binding_rejected',
  invalid: 'account_authority_lease_invalid',
};

/** Фейковый сервер аренды: вход по uid, удаление — по режиму. */
function fakeServer() {
  const state = {
    mode: 'online' as ServerMode,
    deleteCalls: 0,
    deleteOperationIds: [] as string[],
    acquireCalls: 0,
    sessions: 0,
    resetForLease: 0,
    events: [] as string[],
  };
  const accountFor = (uid: FirebaseAuthUid) => (uid.value === 'firebase-user-b' ? ACCOUNT_B : ACCOUNT_A);
  const lease: AccountAuthorityLeasePort = {
    acquire: async (request) => {
      state.acquireCalls += 1;
      state.sessions += 1;
      return Object.freeze({
        accountId: parseAccountId(accountFor(request.firebaseAuthUid)),
        sessionId: parseSessionId(`session-server-${state.sessions}`),
      });
    },
    release: async () => undefined,
    deleteAccount: async (request) => {
      state.deleteCalls += 1;
      state.events.push('delete_call');
      state.deleteOperationIds.push(request.operationId.value);
      const code = MODE_ERRORS[state.mode];
      if (code !== undefined) throw new Error(code);
      if (state.mode === 'hang') await new Promise<void>(() => undefined);
    },
  };
  return { state, lease };
}

function dependencies(input: Readonly<{
  secure: SecureStoreFake;
  storage: MemoryScopeStorageAdapter;
  server: ReturnType<typeof fakeServer>;
  lines?: string[];
  critical?: string[];
  now?: () => number;
}>): AccountAuthorityProductionAdapterDependencies {
  const binding: AccountAuthorityInstallationBindingPort = {
    obtain: async () => Object.freeze({ bindingToken: 'opaque-binding-token', deviceBindingId: parseDeviceId('server-device-binding-a') }),
    readPersistedForLease: async () => null,
    rotate: async () => { throw new Error('not_used'); },
    reset: async () => undefined,
    resetForLease: async () => { input.server.state.resetForLease += 1; },
  };
  return {
    secureStore: input.secure,
    createStorageAdapter: () => input.storage,
    randomInstallationId: async () => '5d3b3527-07e0-4dc1-8aac-000000000001',
    digestSha256: async (value) => `hash-${Buffer.from(value).toString('hex').slice(0, 48)}`,
    createInstallationBinding: () => binding,
    createLease: () => input.server.lease,
    providerSignOut: async () => undefined,
    remoteDeleteFirstSendDeadlineMs: 20,
    remoteDeleteNowMs: input.now,
    reportCritical: (event: string, code: string) => { input.critical?.push(`${event} ${code}`); },
    logger: input.lines === undefined ? undefined : {
      info: (event: string, fields?: AccountAuthorityLogFields) => { input.lines?.push(`${event} ${JSON.stringify(fields ?? {})}`); },
      warn: (event: string, fields?: AccountAuthorityLogFields) => { input.lines?.push(`${event} ${JSON.stringify(fields ?? {})}`); },
    },
  };
}

function provider(initialUid: string, events?: string[]): AccountAuthorityProviderPort & { use(uid: string): void } {
  let uid = initialUid;
  return {
    use: (next: string) => { uid = next; },
    authenticate: async () => Object.freeze({ type: 'authenticated' as const, firebaseAuthUid: parseFirebaseAuthUid(uid) }),
    currentIdentity: async () => parseFirebaseAuthUid(uid),
    signOut: async () => { events?.push('provider_sign_out'); },
  };
}

async function flush(rounds = 40): Promise<void> {
  for (let index = 0; index < rounds; index += 1) await new Promise<void>((resolve) => setImmediate(resolve));
}

function slotted<T>(secure: SecureStoreFake, prefix: string): readonly T[] {
  const snapshot = secure.snapshot();
  const index = snapshot[`${prefix}.index`];
  if (index === undefined) return [];
  return (JSON.parse(index) as { slots: number[] }).slots
    .map((slot) => (JSON.parse(snapshot[`${prefix}.slot.${slot}`]) as { value: T }).value);
}

function eraseQueue(secure: SecureStoreFake): readonly string[] {
  return slotted<string>(secure, ERASE_PREFIX);
}

type OutboxEntry = Readonly<{ operationId: string; attempts: number; state: string }>;
function outbox(secure: SecureStoreFake): readonly OutboxEntry[] {
  return slotted<OutboxEntry>(secure, OUTBOX_PREFIX);
}

async function setup(
  server = fakeServer(), secure = secureStore(), storage = new MemoryScopeStorageAdapter(), lines?: string[], critical?: string[],
  now?: () => number,
) {
  const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies({ secure, storage, server, lines, critical, now }));
  if (bootstrap === null) throw new Error('bootstrap_missing');
  const identity = provider('firebase-user-a', server.state.events);
  const runtime = createAccountAuthorityRuntime({
    deviceId: bootstrap.deviceId,
    provider: identity,
    lease: bootstrap.lease,
    localStore: bootstrap.localStore,
  });
  return { server, secure, storage, bootstrap, identity, runtime };
}

async function writeLessonData(bootstrap: NonNullable<Awaited<ReturnType<typeof createAccountAuthorityProductionBootstrap>>>, runtime: ReturnType<typeof createAccountAuthorityRuntime>) {
  const write = runtime.capturePreservedWrite({ operationId: parseOperationId('commit-lesson-1'), domain: 'lesson_progress' });
  await expect(runtime.commitPreservedWrite(write)).resolves.toMatchObject({ type: 'committed' });
  expect(bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
}

describe('AA S4a: удаление local-first', () => {
  test('UI сразу «удалено»: удаление не ждёт сеть; стиратель и серверная очередь догоняют фоном', async () => {
    const env = await setup();
    env.server.state.mode = 'hang';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await writeLessonData(env.bootstrap, env.runtime);

    const result = await env.runtime.deleteAccount(parseOperationId('delete-a'));
    expect(result).toMatchObject({ type: 'local_deleted' });
    expect(env.runtime.getState().phase).toBe('signed_out');
    expect(env.bootstrap.localStore.getOpenScope()).toBeNull();
    // Сервер «висит», а надёжная очередь уже записана — UI не ждал сеть.
    expect(outbox(env.secure)).toHaveLength(1);
    await flush();
    expect(env.storage.eraseCalls).toContain(`account:${ACCOUNT_A}`);
    expect(env.storage.snapshot(`account:${ACCOUNT_A}`)).toEqual([]);
    expect(eraseQueue(env.secure)).toEqual([]);
    expect(env.server.state.deleteCalls).toBe(1);
  });

  test('онлайн: серверная задача поставлена, очередь пуста, привязка удалённого аккаунта забыта', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    expect(env.server.state.deleteOperationIds).toEqual(['delete-a']);
    expect(outbox(env.secure)).toEqual([]);
    expect(env.server.state.resetForLease).toBe(1);
  });

  test('офлайн → перезапуск: стиратель и серверная очередь доделывают на старте', async () => {
    const env = await setup();
    env.server.state.mode = 'offline';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await writeLessonData(env.bootstrap, env.runtime);
    env.storage.failNext('erase', `account:${ACCOUNT_A}`, 'disk_busy');
    await expect(env.runtime.deleteAccount(parseOperationId('delete-a'))).resolves.toMatchObject({ type: 'local_deleted' });
    await flush();
    expect(eraseQueue(env.secure)).toEqual([ACCOUNT_A]);
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ operationId: 'delete-a', attempts: 1 })]);
    expect(env.storage.snapshot(`account:${ACCOUNT_A}`).length).toBeGreaterThan(0);

    // «Перезапуск процесса»: тот же SecureStore и то же хранилище, сеть вернулась.
    env.server.state.mode = 'online';
    await setup(env.server, env.secure, env.storage);
    await flush();
    expect(eraseQueue(env.secure)).toEqual([]);
    expect(env.storage.snapshot(`account:${ACCOUNT_A}`)).toEqual([]);
    expect(outbox(env.secure)).toEqual([]);
    expect(env.server.state.deleteOperationIds).toEqual(['delete-a', 'delete-a']);
  });

  test('процесс убит до постановки серверного удаления: перезапуск восстанавливает задачу из записи операции', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    const hold = env.storage.holdNext('close');
    void env.runtime.deleteAccount(parseOperationId('delete-a')).catch(() => undefined);
    await hold.entered;
    // Надгробие уже стоит (синхронно), а до сервера дело не дошло.
    expect(eraseQueue(env.secure)).toEqual([ACCOUNT_A]);
    expect(outbox(env.secure)).toEqual([]);

    const restarted = await setup(env.server, env.secure, env.storage);
    await flush();
    expect(env.server.state.deleteOperationIds).toEqual(['delete-a']);
    expect(outbox(env.secure)).toEqual([]);
    expect(restarted.bootstrap.localStore.getOpenScope()).toBeNull();
    hold.release();
    await flush();
  });

  test('поздний ответ входа не воскрешает удалённый аккаунт, пока стиратель не дочистил', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    const eraseHold = env.storage.holdNext('erase');
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await eraseHold.entered;
    const opensBefore = env.storage.openCalls.filter((key) => key === `account:${ACCOUNT_A}`).length;

    // Сервер (поздно) снова отдаёт аренду того же аккаунта.
    await expect(env.runtime.signIn(parseOperationId('sign-in-a-late'))).rejects.toThrow('account_authority_account_tombstoned');
    expect(env.runtime.getState().phase).toBe('signed_out');
    expect(env.bootstrap.localStore.getOpenScope()).toBeNull();
    expect(env.storage.openCalls.filter((key) => key === `account:${ACCOUNT_A}`).length).toBe(opensBefore);

    eraseHold.release();
    await flush();
    expect(eraseQueue(env.secure)).toEqual([]);
  });

  test('двойной тап: одна операция, одна запись в очереди, один вызов сервера', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    const first = env.runtime.deleteAccount(parseOperationId('delete-a'));
    const second = env.runtime.deleteAccount(parseOperationId('delete-a'));
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ type: 'local_deleted' }),
      expect.objectContaining({ type: 'local_deleted' }),
    ]);
    await flush();
    expect(env.server.state.deleteCalls).toBe(1);
  });

  test('H-B1: «не вошёл» — НЕ доказательство: запись остаётся «нужен вход», попытки не тратятся, вход догоняет', async () => {
    const env = await setup();
    env.server.state.mode = 'unauthenticated';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ operationId: 'delete-a', state: 'needs_sign_in', attempts: 0 })]);
    expect(env.server.state.resetForLease).toBe(0);
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 1, needsSignIn: 1 });
    // Перезапуск без входа «нужен вход» не дёргает.
    const callsBefore = env.server.state.deleteCalls;
    await setup(env.server, env.secure, env.storage);
    await flush();
    expect(env.server.state.deleteCalls).toBe(callsBefore);
    // Вход — сеть и личность есть: запрос уходит и снимается по успеху.
    env.server.state.mode = 'online';
    const after = await setup(env.server, env.secure, env.storage);
    await after.runtime.signIn(parseOperationId('sign-in-a2'));
    await flush();
    expect(outbox(env.secure)).toEqual([]);
    expect(env.server.state.resetForLease).toBe(1);
  });

  test.each([
    ['binding_unavailable', 'needs_check'],
    ['revision_unavailable', 'needs_check'],
    ['binding_rejected', 'needs_check'],
    ['invalid', 'needs_check'],
  ] as const)('H-B1: %s — не доказательство: запись остаётся (%s), попытки не тратятся', async (mode, state) => {
    const env = await setup();
    env.server.state.mode = mode;
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ state, attempts: 0 })]);
  });

  test('H-B1: аренду держит другое устройство — «не завершено» + тревога, переживающая перезапуск', async () => {
    const critical: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, critical);
    env.server.state.mode = 'rejected';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ state: 'not_completed', attempts: 0 })]);
    expect(critical).toEqual(['aa_s4:remote_delete not_completed account_authority_lease_rejected']);
    expect(critical.join(' ')).not.toMatch(/account-server|session-server|delete-a/);
  });

  test('H-B1: доказательства — identity_unresolved (принципал стёрт) и принятое старое удаление', async () => {
    const env = await setup();
    env.server.state.mode = 'purged';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    expect(outbox(env.secure)).toEqual([]);

    env.server.state.mode = 'unauthenticated';
    await env.runtime.signIn(parseOperationId('sign-in-a2'));
    await env.runtime.deleteAccount(parseOperationId('delete-a2'));
    await flush();
    expect(outbox(env.secure)).toHaveLength(1);
    expect(resolveAccountAuthorityRemoteDeleteByLegacy('delete-other')).toBe(false);
    expect(resolveAccountAuthorityRemoteDeleteByLegacy('delete-a2')).toBe(true);
    expect(outbox(env.secure)).toEqual([]);
  });

  test('H-B1: запрос удаления уходит ДО выхода из провайдера', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    const events = env.server.state.events;
    expect(events.indexOf('delete_call')).toBeGreaterThanOrEqual(0);
    expect(events.indexOf('delete_call')).toBeLessThan(events.indexOf('provider_sign_out'));
  });

  test('временный сбой тратит попытку; бюджет исчерпан → «не завершено», запись НЕ снимается', async () => {
    const critical: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, critical);
    env.server.state.mode = 'offline';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    for (let restart = 0; restart < 60 && outbox(env.secure)[0]?.state !== 'not_completed'; restart += 1) {
      await setup(env.server, env.secure, env.storage, undefined, critical);
      await flush();
    }
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ state: 'not_completed', attempts: 50 })]);
    expect(critical).toContain('aa_s4:remote_delete attempt_budget_exhausted account_authority_lease_unavailable');
  });

  test('M-1: удаление → немедленное добавление → отложенное удаление слота догоняет → перезапуск: данные на месте', async () => {
    const env = await setup();
    env.secure.deferDeletes();
    env.bootstrap.localStore.clearAccountData(parseAccountId('acct-first'));
    await flush();
    // Стиратель снял первое надгробие — удаление его слота ЗАДЕРЖАНО.
    expect(eraseQueue(env.secure)).toEqual([]);
    env.storage.holdNext('erase');
    env.bootstrap.localStore.clearAccountData(parseAccountId('acct-second'));
    await env.secure.releaseDeletes();
    expect(eraseQueue(env.secure)).toEqual(['acct-second']);
    const restarted = await setup(env.server, env.secure, env.storage);
    expect(restarted.bootstrap.localStore.getOpenScope()).toBeNull();
    expect(eraseQueue(env.secure)).toEqual(['acct-second']);
  });

  test('M-1: процесс убит между шагами удаления — сирота дочищается на старте, разбор не ломается', async () => {
    const env = await setup();
    env.secure.deferDeletes();
    env.bootstrap.localStore.clearAccountData(parseAccountId('acct-first'));
    await flush();
    const index = JSON.parse(env.secure.snapshot()[`${ERASE_PREFIX}.index`]) as { trash: number[] };
    expect(index.trash).toEqual([0]);
    expect(env.secure.snapshot()[`${ERASE_PREFIX}.slot.0`]).toBeDefined();
    // «Перезапуск» с недоделанным удалением: сирота стирается, номер уходит из trash.
    const fresh = secureStore();
    for (const [key, value] of env.secure.raw) fresh.raw.set(key, value);
    await setup(env.server, fresh, env.storage);
    await flush();
    expect(fresh.snapshot()[`${ERASE_PREFIX}.slot.0`]).toBeUndefined();
    expect((JSON.parse(fresh.snapshot()[`${ERASE_PREFIX}.index`]) as { trash: number[] }).trash).toEqual([]);
  });

  test('M-1: нечитаемая запись не валит хранилище — тревога, остальное работает, запись читается снова на старте', async () => {
    const critical: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, critical);
    env.server.state.mode = 'unauthenticated';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    const slotKey = Object.keys(env.secure.snapshot()).find((key) => key.startsWith(`${OUTBOX_PREFIX}.slot.`)) as string;
    const saved = env.secure.raw.get(slotKey) as string;
    env.secure.raw.delete(slotKey);
    const broken = await setup(env.server, env.secure, env.storage, undefined, critical);
    expect(broken.bootstrap.localStore.getOpenScope()).toBeNull();
    expect(critical).toContain('aa_s4:remote_delete slot_unreadable other');
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 0, unreadable: 1 });
    env.secure.raw.set(slotKey, saved);
    await setup(env.server, env.secure, env.storage, undefined, critical);
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 1, unreadable: 0, needsSignIn: 1 });
  });

  test('LOW-1 (р5): нечитаемая запись не занимает ёмкость — новые удаления не блокируются', async () => {
    const env = await setup();
    env.server.state.mode = 'unauthenticated';
    const request = (index: number) => ({
      accountId: parseAccountId(`acct-cap-${index}`),
      sessionId: parseSessionId(`sess-cap-${index}`),
      deviceId: env.bootstrap.deviceId,
      operationId: parseOperationId(`op-cap-${index}`),
    });
    for (let index = 0; index < 16; index += 1) await env.bootstrap.lease.deleteAccount(request(index));
    await flush();
    env.secure.raw.delete(`${OUTBOX_PREFIX}.slot.0`);
    const restarted = await setup(env.server, env.secure, env.storage);
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 15, unreadable: 1 });
    await expect(restarted.bootstrap.lease.deleteAccount(request(16))).resolves.toBeUndefined();
    await expect(restarted.bootstrap.lease.deleteAccount(request(17))).rejects.toThrow('account_authority_remote_delete_queue_full');
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 16, unreadable: 1 });
  });

  test('LOW-1 (р5): список слотов — size() считает только читаемые, unreadable() — остальные', () => {
    const secure = secureStore();
    const make = () => createDurableSlotList<string>({
      secureStore: secure, options: {}, log: { info: () => undefined, warn: () => undefined },
      prefix: 'test.slots', schema: 'test.v1', max: 2, label: 'test_slots',
      invalidCode: 'x_invalid', fullCode: 'x_full', unavailableCode: 'x_unavailable',
      parse: (value) => String(value), keyOf: (value) => value,
    });
    const list = make();
    list.add('a');
    list.add('b');
    secure.raw.delete('test.slots.slot.0');
    const reloaded = make();
    expect(reloaded.size()).toBe(1);
    expect(reloaded.unreadable()).toBe(1);
    reloaded.add('c');
    expect(() => reloaded.add('d')).toThrow('x_full');
  });

  test('LOW-1 (р5): дубль после временно нечитаемого слота — действует новый, старый уходит в trash', async () => {
    const critical: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, critical);
    env.server.state.mode = 'unauthenticated';
    const request = {
      accountId: parseAccountId('acct-dup'),
      sessionId: parseSessionId('sess-dup'),
      deviceId: env.bootstrap.deviceId,
      operationId: parseOperationId('op-dup'),
    };
    await env.bootstrap.lease.deleteAccount(request);
    await flush();
    const saved = env.secure.raw.get(`${OUTBOX_PREFIX}.slot.0`) as string;
    env.secure.raw.delete(`${OUTBOX_PREFIX}.slot.0`);
    const second = await setup(env.server, env.secure, env.storage, undefined, critical);
    await second.bootstrap.lease.deleteAccount(request);
    await flush();
    env.secure.raw.set(`${OUTBOX_PREFIX}.slot.0`, saved);
    critical.length = 0;
    await setup(env.server, env.secure, env.storage, undefined, critical);
    await flush();
    expect(critical).toEqual([]);
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 1, unreadable: 0 });
    const index = JSON.parse(env.secure.snapshot()[`${OUTBOX_PREFIX}.index`]) as { slots: number[]; trash: number[] };
    expect(index.slots).toEqual([1]);
    expect(env.secure.snapshot()[`${OUTBOX_PREFIX}.slot.0`]).toBeUndefined();
  });

  test('LOW-2 (р5): часы переведены назад — needs_check проверяется при этом поводе, по сроку не снимается', async () => {
    let now = 100 * 24 * 60 * 60_000;
    const clock = () => now;
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, undefined, clock);
    env.server.state.mode = 'binding_unavailable';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    const calls = env.server.state.deleteCalls;
    now -= 40 * 24 * 60 * 60_000;
    await setup(env.server, env.secure, env.storage, undefined, undefined, clock);
    await flush();
    expect(env.server.state.deleteCalls).toBe(calls + 1);
    const [entry] = outbox(env.secure) as unknown as { nextCheckAtMs: number }[];
    expect(entry.nextCheckAtMs - now).toBeLessThanOrEqual(30 * 24 * 60 * 60_000);
    expect(outbox(env.secure)).toHaveLength(1);
  });

  test('LOW-3 (р5): not_completed по сроку НЕ снимается (сервер точно не удалил)', async () => {
    let now = 1_000_000;
    const clock = () => now;
    const critical: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, critical, clock);
    env.server.state.mode = 'rejected';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    now += 200 * 24 * 60 * 60_000;
    await setup(env.server, env.secure, env.storage, undefined, critical, clock);
    await flush();
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ state: 'not_completed' })]);
    expect(critical.some((line) => line.includes('hold_expired'))).toBe(false);
  });

  test('L-3: при входе B записи A не отправляются; вход A — отправляются', async () => {
    const env = await setup();
    env.server.state.mode = 'unauthenticated';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    const calls = env.server.state.deleteCalls;
    env.server.state.mode = 'online';
    env.identity.use('firebase-user-b');
    await env.runtime.signIn(parseOperationId('sign-in-b'));
    await flush();
    expect(env.server.state.deleteCalls).toBe(calls);
    env.identity.use('firebase-user-a');
    await env.runtime.signIn(parseOperationId('sign-in-a2'));
    await flush();
    expect(env.server.state.deleteCalls).toBe(calls + 1);
    expect(outbox(env.secure)).toEqual([]);
  });

  test('L-2: needs_check не отправляется на каждом старте — пауза сутки, дальше растёт', async () => {
    let now = 1_000_000;
    const clock = () => now;
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, undefined, clock);
    env.server.state.mode = 'binding_unavailable';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    const calls = env.server.state.deleteCalls;
    await setup(env.server, env.secure, env.storage, undefined, undefined, clock);
    await flush();
    expect(env.server.state.deleteCalls).toBe(calls);
    now += 24 * 60 * 60_000;
    await setup(env.server, env.secure, env.storage, undefined, undefined, clock);
    await flush();
    expect(env.server.state.deleteCalls).toBe(calls + 1);
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ state: 'needs_check', holdChecks: 2 })]);
    now += 24 * 60 * 60_000;
    await setup(env.server, env.secure, env.storage, undefined, undefined, clock);
    await flush();
    expect(env.server.state.deleteCalls).toBe(calls + 1);
  });

  test('L-2: удержание живёт 90 дней — потом снимается с тревогой', async () => {
    let now = 1_000_000;
    const clock = () => now;
    const critical: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, critical, clock);
    env.server.state.mode = 'unauthenticated';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    now += 89 * 24 * 60 * 60_000;
    await setup(env.server, env.secure, env.storage, undefined, critical, clock);
    await flush();
    expect(outbox(env.secure)).toHaveLength(1);
    now += 2 * 24 * 60 * 60_000;
    await setup(env.server, env.secure, env.storage, undefined, critical, clock);
    await flush();
    expect(outbox(env.secure)).toEqual([]);
    expect(critical).toContain('aa_s4:remote_delete hold_expired state_needs_sign_in');
  });

  test('M-B2: обе очереди при полном заполнении id предельной длины — каждое значение ≤ 2048 байт', async () => {
    const env = await setup();
    env.server.state.mode = 'offline';
    const long = (prefix: string, index: number) => `${prefix}-${String(index).padStart(2, '0')}-${'x'.repeat(250 - prefix.length)}`;
    for (let index = 0; index < 32; index += 1) env.bootstrap.localStore.clearAccountData(parseAccountId(long('acct', index)));
    expect(() => env.bootstrap.localStore.clearAccountData(parseAccountId(long('acct', 99)))).toThrow('account_authority_local_erase_queue_full');
    for (let index = 0; index < 16; index += 1) {
      await env.bootstrap.lease.deleteAccount({
        accountId: parseAccountId(long('acct', index)),
        sessionId: parseSessionId(long('sess', index)),
        deviceId: env.bootstrap.deviceId,
        operationId: parseOperationId(long('op', index)),
      });
    }
    await expect(env.bootstrap.lease.deleteAccount({
      accountId: parseAccountId(long('acct', 98)),
      sessionId: parseSessionId(long('sess', 98)),
      deviceId: env.bootstrap.deviceId,
      operationId: parseOperationId(long('op', 98)),
    })).rejects.toThrow('account_authority_remote_delete_queue_full');
    await flush();
    expect(eraseQueue(env.secure).length + outbox(env.secure).length).toBeGreaterThan(0);
    expect(outbox(env.secure)).toHaveLength(16);
    const sizes = Object.values(env.secure.snapshot()).map((value) => Buffer.byteLength(value, 'utf8'));
    expect(Math.max(...sizes)).toBeLessThanOrEqual(SECURE_VALUE_LIMIT);
    // Перезапуск читает обе очереди целиком.
    const restarted = await setup(env.server, env.secure, env.storage);
    expect(restarted.bootstrap.localStore.getOpenScope()).toBeNull();
    expect(outbox(env.secure)).toHaveLength(16);
  });

  test('L-B3: открытая область того же аккаунта не стирается — стирание откладывается до закрытия', async () => {
    const lines: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), lines);
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await writeLessonData(env.bootstrap, env.runtime);
    const scope = env.bootstrap.localStore.getOpenScope();
    env.bootstrap.localStore.clearAccountData(parseAccountId(ACCOUNT_A));
    await flush();
    expect(lines.some((line) => line.startsWith('[AA-S4] local_erase deferred'))).toBe(true);
    expect(lines.some((line) => line.startsWith('[AA-S4] local_erase failed_kept'))).toBe(false);
    expect(env.storage.eraseCalls).toEqual([]);
    expect(env.storage.snapshot(`account:${ACCOUNT_A}`).length).toBeGreaterThan(0);
    await env.bootstrap.localStore.closeScope(scope!);
    await flush();
    expect(env.storage.eraseCalls).toEqual([`account:${ACCOUNT_A}`]);
    expect(eraseQueue(env.secure)).toEqual([]);
  });

  test('A→B→A без цикла; удалённый A не мешает входу B', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    env.identity.use('firebase-user-b');
    await expect(env.runtime.signIn(parseOperationId('sign-in-b'))).resolves.toMatchObject({ type: 'authenticated' });
    env.identity.use('firebase-user-a');
    await expect(env.runtime.signIn(parseOperationId('sign-in-a2'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.storage.openCalls).toEqual([`account:${ACCOUNT_A}`, `account:${ACCOUNT_B}`, `account:${ACCOUNT_A}`]);

    const eraseHold = env.storage.holdNext('erase');
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await eraseHold.entered;
    env.identity.use('firebase-user-b');
    await expect(env.runtime.signIn(parseOperationId('sign-in-b2'))).resolves.toMatchObject({ type: 'authenticated' });
    expect(env.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_B);
    eraseHold.release();
    await flush();
    expect(eraseQueue(env.secure)).toEqual([]);
    expect(env.bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_B);
  });

  test('логи [AA-S4] есть на каждой ветке и не несут идентификаторов', async () => {
    const lines: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), lines);
    env.server.state.mode = 'offline';
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    const aa = lines.filter((line) => line.startsWith('[AA-S4]'));
    expect(aa.some((line) => line.startsWith('[AA-S4] local_erase tombstone'))).toBe(true);
    expect(aa.some((line) => line.startsWith('[AA-S4] local_erase done'))).toBe(true);
    expect(aa.some((line) => line.startsWith('[AA-S4] remote_delete enqueue'))).toBe(true);
    expect(aa.some((line) => line.startsWith('[AA-S4] remote_delete retry_later'))).toBe(true);
    expect(aa.some((line) => line.startsWith('[AA-S4] remote_delete first_send'))).toBe(true);
    expect(lines.join('\n')).not.toMatch(/account-server|session-server|firebase-user|delete-a/);
  });

  test('порча надгробий/очереди — отказ закрыто, а не тихий сброс; тревога переживает перезапуск', async () => {
    const secure = secureStore();
    const critical: string[] = [];
    secure.setItem(`${ERASE_PREFIX}.index`, '{"schemaVersion":"x"}');
    await expect(createAccountAuthorityProductionBootstrap(dependencies({
      secure, storage: new MemoryScopeStorageAdapter(), server: fakeServer(), critical,
    }))).rejects.toThrow('account_authority_local_erase_queue_invalid');
    expect(critical).toEqual(['aa_s4:local_erase index_invalid other']);
    expect(accountAuthorityGeneration(0).value).toBe(0);
  });
});

describe('AA S4a: транспорт начала удаления', () => {
  function revisions(initial: number): AccountAuthorityLeaseRevisionStore & { leaseRevision(): number | null } {
    let lease: number | null = initial;
    return {
      leaseRevision: () => lease,
      read: async () => null,
      write: async () => undefined,
      readLease: async () => lease,
      bindLease: async () => undefined,
      writeLease: async (_owner, next) => { lease = next; },
    };
  }
  const binding: AccountAuthorityInstallationBindingPort = {
    obtain: async () => { throw new Error('not_used'); },
    readPersistedForLease: async () => Object.freeze({ bindingToken: 'token-a', deviceBindingId: parseDeviceId('server-device-a') }),
    rotate: async () => { throw new Error('not_used'); },
    reset: async () => undefined,
    resetForLease: async () => undefined,
  };
  const request = {
    accountId: parseAccountId(ACCOUNT_A),
    sessionId: parseSessionId('session-server-a'),
    deviceId: parseDeviceId('device-client-a'),
    operationId: parseOperationId('delete-a'),
  };
  const job = (status: string) => ({ data: {
    schemaVersion: 'account-authority-delete.v1', jobId: 'aadel_x', status, createdAtMs: 1, updatedAtMs: 2,
  } });

  test('потерянный ответ: повтор delete_begin с тем же operationId и ревизией идемпотентен', async () => {
    let calls = 0;
    const invoke = jest.fn(async (name: string, data: Readonly<Record<string, unknown>>) => {
      calls += 1;
      expect(name).toBe('accountAuthorityDeleteBegin');
      expect(data).toEqual({ operationId: 'delete-a', expectedRevision: 3, bindingToken: 'token-a' });
      if (calls === 1) throw Object.assign(new Error('deadline'), { code: 'functions/unavailable' });
      return job('purge_queued');
    });
    const store = revisions(3);
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke, revisionStore: store, installationBinding: binding, retry: { sleep: async () => undefined },
    });
    await expect(port.deleteAccount(request)).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(store.leaseRevision()).toBe(4);
  });

  test('ответ неизвестной формы отвергается (закрытая форма)', async () => {
    const invoke = jest.fn(async () => ({ data: { schemaVersion: 'account-authority-delete.v1', status: 'purge_queued' } }));
    const port = createAccountAuthorityFirebaseLeasePort({
      invoke, revisionStore: revisions(3), installationBinding: binding, retry: { sleep: async () => undefined },
    });
    await expect(port.deleteAccount(request)).rejects.toThrow('account_authority_lease_invalid');
  });
});

describe('AA S4a раунд 4 (L-1): доказательство старым удалением — фаза server_enqueued', () => {
  test('метка ставится только после advanceAccountDeletePendingAuthLock(server_enqueued), снятие — по метке, не по result.ok', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'app', 'auth_provider.ts'), 'utf8') as string;
    const advance = source.indexOf("advanceAccountDeletePendingAuthLock(\n        pendingDeleteLock,\n        'server_enqueued',");
    const mark = source.indexOf('legacyDeletionServerEnqueuedOperations.add(pendingDeleteLock.operationId);');
    const anonymousBranch = source.indexOf('// зачем: для анонима ждём только отправки запроса');
    expect(advance).toBeGreaterThan(0);
    expect(mark).toBeGreaterThan(advance);
    expect(mark).toBeLessThan(anonymousBranch);
    expect(source.match(/legacyDeletionServerEnqueuedOperations\.add\(/g)).toHaveLength(1);
    const proof = source.slice(source.indexOf('const legacyServerEnqueued'), source.indexOf('resolveAccountAuthorityDeletionByLegacyIfEnabled(operationId)'));
    expect(proof).toContain('legacyDeletionServerEnqueuedOperations.delete(pendingOperationId)');
    expect(proof).toContain('if (legacyServerEnqueued && authorityDeletion !== null)');
    expect(proof).not.toMatch(/if \(result\.ok/);
  });
});

describe('AA S4a: ворота cutover', () => {
  test('ворота выключены — null без загрузки клиента, поток удаления как раньше', () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'android' } }));
      jest.doMock('../app/remote_flags', () => ({ getRemoteBool: () => true }));
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
});
