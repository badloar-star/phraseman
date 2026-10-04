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
  ACCOUNT_AUTHORITY_PRODUCTION_SERVER_DELETE_PATH,
  accountAuthorityRemoteDeleteQueueState,
  deferAccountAuthorityDeleteProviderSignOut,
  isAccountAuthorityDeleteProviderSignOutDeferred,
  releaseAccountAuthorityDeleteProviderSignOutDeferral,
  resolveAccountAuthorityRemoteDeleteByLegacy,
  type AccountAuthorityServerDeletePath,
} from '../modules/account-authority-v2/account_authority_remote_delete_queue';
import * as fs from 'fs';
import * as path from 'path';

/*
 * (харнесс скопирован из aa_s4a_client_delete_local_first.test.ts)
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
  serverPath?: AccountAuthorityServerDeletePath | 'omit';
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
    ...(input.serverPath === 'omit' ? {} : { remoteDeleteServerPath: input.serverPath ?? 'legacy_primary' }),
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
    // Как боевой порт (accounts_v2_client_runtime.ts): отложенный выход удаления пропускается.
    signOut: async ({ operationId }) => {
      if (isAccountAuthorityDeleteProviderSignOutDeferred(operationId.value)) {
        events?.push('provider_sign_out_deferred');
        return;
      }
      events?.push('provider_sign_out');
    },
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
  now?: () => number, serverPath?: AccountAuthorityServerDeletePath | 'omit',
) {
  const bootstrap = await createAccountAuthorityProductionBootstrap(dependencies({ secure, storage, server, lines, critical, now, serverPath }));
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

/*
 * AA S5 (D-AA5): главный путь серверного удаления при cutover — СТАРОЕ удаление.
 * AA: local-first (надгробие, стиратель, мгновенный UI) + запись очереди
 * `awaiting_legacy` — трекер доказательства; delete_begin НЕ отправляется,
 * выход из провайдера делает старый поток (после подтверждения сервера).
 */
const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const DAY = 24 * 60 * 60_000;

async function writeLessonData(bootstrap: NonNullable<Awaited<ReturnType<typeof createAccountAuthorityProductionBootstrap>>>, runtime: ReturnType<typeof createAccountAuthorityRuntime>) {
  const write = runtime.capturePreservedWrite({ operationId: parseOperationId('commit-lesson-1'), domain: 'lesson_progress' });
  await expect(runtime.commitPreservedWrite(write)).resolves.toMatchObject({ type: 'committed' });
  expect(bootstrap.localStore.getOpenScope()?.accountId.value).toBe(ACCOUNT_A);
}

async function deleteDeferred(env: Awaited<ReturnType<typeof setup>>, id: string) {
  deferAccountAuthorityDeleteProviderSignOut(id);
  try {
    return await env.runtime.deleteAccount(parseOperationId(id));
  } finally {
    releaseAccountAuthorityDeleteProviderSignOutDeferral(id);
  }
}

describe('AA S5: удаление — главный путь старое удаление (legacy_primary)', () => {
  test('боевой путь — legacy_primary', () => {
    expect(ACCOUNT_AUTHORITY_PRODUCTION_SERVER_DELETE_PATH).toBe('legacy_primary');
  });

  test('UI сразу «удалено», локальное стирание идёт, delete_begin НЕ отправляется, запись ждёт старое удаление', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await writeLessonData(env.bootstrap, env.runtime);
    const result = await deleteDeferred(env, 'delete-a');
    expect(result).toMatchObject({ type: 'local_deleted' });
    expect(env.runtime.getState().phase).toBe('signed_out');
    await flush();
    expect(env.storage.snapshot(`account:${ACCOUNT_A}`)).toEqual([]);
    expect(env.server.state.deleteCalls).toBe(0);
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ operationId: 'delete-a', state: 'awaiting_legacy', attempts: 0 })]);
    expect(accountAuthorityRemoteDeleteQueueState()).toMatchObject({ total: 1, awaitingLegacy: 1, pending: 0 });
  });

  test('закрыта дыра: AA НЕ выходит из провайдера при удалении (вход держит старый поток до подтверждения сервера)', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await deleteDeferred(env, 'delete-a');
    await flush();
    expect(env.server.state.events).toContain('provider_sign_out_deferred');
    expect(env.server.state.events).not.toContain('provider_sign_out');
    expect(env.server.state.events).not.toContain('delete_call');
    expect(isAccountAuthorityDeleteProviderSignOutDeferred('delete-a')).toBe(false);
  });

  test('обычный выход (не удаление) по-прежнему выходит из провайдера', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.signOut(parseOperationId('sign-out-a'));
    expect(env.server.state.events).toContain('provider_sign_out');
  });

  test('перезапуск и повторный вход того же аккаунта — delete_begin так и не уходит', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await deleteDeferred(env, 'delete-a');
    await flush();
    const restarted = await setup(env.server, env.secure, env.storage);
    await flush();
    await restarted.runtime.signIn(parseOperationId('sign-in-a-2')).catch(() => undefined);
    await flush();
    expect(env.server.state.deleteCalls).toBe(0);
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ operationId: 'delete-a', state: 'awaiting_legacy' })]);
  });

  test('доказательство старым удалением (server_enqueued) снимает запись', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await deleteDeferred(env, 'delete-a');
    expect(resolveAccountAuthorityRemoteDeleteByLegacy('delete-a')).toBe(true);
    expect(outbox(env.secure)).toEqual([]);
    expect(resolveAccountAuthorityRemoteDeleteByLegacy('delete-a')).toBe(false);
  });

  test('двойной тап: одна запись, ноль вызовов сервера', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    deferAccountAuthorityDeleteProviderSignOut('delete-a');
    const first = env.runtime.deleteAccount(parseOperationId('delete-a'));
    const second = env.runtime.deleteAccount(parseOperationId('delete-a'));
    await expect(first).resolves.toMatchObject({ type: 'local_deleted' });
    await expect(second).resolves.toMatchObject({ type: 'local_deleted' });
    releaseAccountAuthorityDeleteProviderSignOutDeferral('delete-a');
    await flush();
    expect(outbox(env.secure)).toHaveLength(1);
    expect(env.server.state.deleteCalls).toBe(0);
  });

  test('процесс убит до постановки записи: восстановление ставит awaiting_legacy, а не отправку', async () => {
    const env = await setup();
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    const hold = env.storage.holdNext('close');
    deferAccountAuthorityDeleteProviderSignOut('delete-a');
    void env.runtime.deleteAccount(parseOperationId('delete-a')).catch(() => undefined);
    await hold.entered;
    expect(outbox(env.secure)).toEqual([]);
    await setup(env.server, env.secure, env.storage);
    await flush();
    expect(env.server.state.deleteCalls).toBe(0);
    expect(outbox(env.secure)).toEqual([expect.objectContaining({ operationId: 'delete-a', state: 'awaiting_legacy' })]);
    hold.release();
    releaseAccountAuthorityDeleteProviderSignOutDeferral('delete-a');
    await flush();
  });

  test('без доказательства запись живёт 90 дней, потом снимается с тревогой', async () => {
    let now = 5_000_000;
    const clock = () => now;
    const critical: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, critical, clock);
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await deleteDeferred(env, 'delete-a');
    now += 89 * DAY;
    await setup(env.server, env.secure, env.storage, undefined, critical, clock);
    await flush();
    expect(outbox(env.secure)).toHaveLength(1);
    now += 2 * DAY;
    await setup(env.server, env.secure, env.storage, undefined, critical, clock);
    await flush();
    expect(outbox(env.secure)).toEqual([]);
    expect(critical).toContain('aa_s4:remote_delete hold_expired state_awaiting_legacy');
    expect(env.server.state.deleteCalls).toBe(0);
  });

  test('путь authority (S4a) не изменился: delete_begin уходит', async () => {
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, undefined, undefined, 'authority');
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    expect(env.server.state.deleteOperationIds).toEqual(['delete-a']);
    expect(outbox(env.secure)).toEqual([]);
  });

  test("путь не задан — по умолчанию 'authority' (как в S4a)", async () => {
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), undefined, undefined, undefined, 'omit');
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await env.runtime.deleteAccount(parseOperationId('delete-a'));
    await flush();
    expect(env.server.state.deleteOperationIds).toEqual(['delete-a']);
  });

  test('логи [AA-S5] на ветках и без идентификаторов', async () => {
    const lines: string[] = [];
    const env = await setup(fakeServer(), secureStore(), new MemoryScopeStorageAdapter(), lines);
    await env.runtime.signIn(parseOperationId('sign-in-a'));
    await deleteDeferred(env, 'delete-a');
    await flush();
    const text = lines.join('\n');
    expect(text).toContain('[AA-S5] remote_delete path {"reason":"legacy_primary"}');
    expect(text).toContain('[AA-S5] remote_delete awaiting_legacy');
    expect(text).toContain('[AA-S5] remote_delete first_send {"result":"skipped_legacy_primary"');
    // legacy_primary не ждёт отправку вовсе (нет первой отправки пути S4a).
    expect(text).not.toContain('[AA-S4] remote_delete first_send');
    for (const secret of [ACCOUNT_A, 'firebase-user-a', 'delete-a', 'session-server-1']) expect(text).not.toContain(secret);
  });

  test('проводка: боевые зависимости, порт провайдера и поток удаления следуют D-AA5', () => {
    const adapter = read('modules/account-session-v2/account_authority_production_adapter.ts');
    expect(adapter).toContain('remoteDeleteServerPath: ACCOUNT_AUTHORITY_PRODUCTION_SERVER_DELETE_PATH');
    expect(adapter).toContain('serverDeletePath: dependencies.remoteDeleteServerPath');
    const runtime = read('modules/account-session-v2/accounts_v2_client_runtime.ts');
    const port = runtime.slice(runtime.indexOf('const ACCOUNT_AUTHORITY_PROVIDER_PORT'), runtime.indexOf('function getAccountAuthorityRuntime'));
    expect(port).toMatch(/if \(isAccountAuthorityDeleteProviderSignOutDeferred\(operationId\.value\)\) \{\s*AUTHORITY_LOG\.info\('\[AA-S5\] delete provider_sign_out_deferred'[^;]*;\s*return;\s*\}/);
    const deferredAt = port.indexOf('isAccountAuthorityDeleteProviderSignOutDeferred(operationId.value)');
    expect(deferredAt).toBeGreaterThan(-1);
    expect(deferredAt).toBeLessThan(port.indexOf('bootstrap.providerSignOut()'));
    const transition = runtime.slice(runtime.indexOf('export function runAccountAuthorityDeleteTransition'));
    const deferAt = transition.indexOf('deferAccountAuthorityDeleteProviderSignOut(operationId.value)');
    expect(deferAt).toBeGreaterThan(-1);
    expect(deferAt).toBeLessThan(transition.indexOf('getAccountAuthorityRuntime().deleteAccount(operationId)'));
    expect(transition).toMatch(/finally \{\s*releaseAccountAuthorityDeleteProviderSignOutDeferral\(operationId\.value\);/);
    const auth = read('app/auth_provider.ts');
    expect(auth).toContain('[AA-S5] delete:aa_awaiting_legacy reason=legacy_not_enqueued');
  });
});
