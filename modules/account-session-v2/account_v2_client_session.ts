import type { AccountScope, SessionFence } from './account_session';
import { sameSessionFence } from './account_session';
import {
  createAccountScopeStore,
  type AccountScopeStore,
  type ScopeStorageAdapter,
} from './account_scope_store';
import type { AccountSyncWireBatch } from './account_sync';
import { createAccountSyncOutbox } from './account_sync_outbox';
import { createAccountSyncDispatchPort } from './account_sync_outbox_time';
import { createAccountSyncRunner, type AccountSyncRunner, type AccountSyncRunnerResult } from './account_sync_runner';
import { createAccountSyncCallableSend } from './account_sync_callable_transport';
import { createAccountDeletionDetacher, type AccountDeletionDetachResult } from './account_deletion_detach';
import type { AccountDetachLatch } from './account_detach_latch';

/*
 * Account V2, Пакет 6B (TG-F76EA3701B55) — жизненный цикл клиента V2.
 *
 * зачем: связывает готовые части (область → outbox → раннер → callable) с
 * авторизацией приложения, ничего не меняя в них самих:
 *  - старт только при включённом клиентском флаге и известном uid; при выходе и
 *    смене аккаунта раннер останавливается и область закрывается ДО открытия
 *    новой (нет перекрёстного доступа: fence + владелец пакета = uid области);
 *  - перед каждой отправкой сверяем текущий uid Firebase с владельцем области —
 *    иначе сервер ответил бы окончательным uid_mismatch и пакет ушёл бы в
 *    карантин из-за гонки смены аккаунта (здесь это «перелогин», не неудача);
 *  - `accounts_v2_disabled` — стоп отправки до следующего запуска, без карантина;
 *  - удаление: синхронное отсоединение ДО сети, защёлка на диске до стирания,
 *    автоповтор стирания при следующем запуске.
 * Модуль грузится лениво и только при включённом флаге (app/accounts_v2_client_flag.ts).
 * Логи — [ACCOUNT-V2], только коды и числа; uid в лог не пишем.
 */

const LOG = '[ACCOUNT-V2]';
/** Пакетов за один проход; дальше — пауза, чтобы не держать JS-поток. */
const MAX_BATCHES_PER_DRAIN = 20;
/** Пауза между проходами без явной паузы от раннера. */
const DRAIN_YIELD_MS = 5_000;

type AccountScopeValue = Extract<AccountScope, { kind: 'account' }>;

export type AccountsV2ClientPorts = Readonly<{
  isEnabled: () => boolean;
  /** Нативное хранилище областей; null — ещё не подключено (область не открываем). */
  createStorageAdapter: () => ScopeStorageAdapter | null;
  latch: AccountDetachLatch;
  /** callable accountsV2SyncApply: результат httpsCallable (`{ data }`) или его ошибка. */
  callSync: (batch: AccountSyncWireBatch) => Promise<unknown>;
  currentAuthUid: () => string | null;
  newNonce: () => string;
  setTimer: (run: () => void, delayMs: number) => unknown;
  clearTimer: (handle: unknown) => void;
  nowMs?: () => number;
  random?: () => number;
}>;

export type AccountsV2ClientStatus = Readonly<{
  uid: string | null;
  sending: boolean;
  serverDisabled: boolean;
  timerArmed: boolean;
}>;

export type AccountsV2ClientController = Readonly<{
  /** Текущий uid Firebase (null — вышли). Последовательно: стоп старого → старт нового. */
  setAuthUid(uid: string | null): Promise<void>;
  /** Остановить раннер и закрыть область (выход, смена аккаунта, флаг выключен). */
  stop(reason: string): Promise<void>;
  /**
   * Удаление аккаунта: СИНХРОННО (до возврата) останавливает отправку и закрывает
   * область uid; затем стирает её, защёлка на диске — до подтверждённого стирания.
   */
  beginDeletionDetach(uid: string | null): Promise<AccountDeletionDetachResult | null>;
  status(): AccountsV2ClientStatus;
}>;

type Session = {
  readonly uid: string;
  readonly scope: AccountScopeValue;
  readonly fence: SessionFence;
  readonly runner: AccountSyncRunner;
  alive: boolean;
  sending: boolean;
  draining: boolean;
  timer: unknown;
};

function kindOf(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
}

function codeOf(value: unknown): string {
  const raw = typeof value === 'object' && value !== null && 'code' in value ? (value as { code: unknown }).code : null;
  return typeof raw === 'string' && /^[\w/-]{1,64}$/.test(raw) ? raw : kindOf(value);
}

function accountScope(uid: string): AccountScopeValue {
  return Object.freeze({ kind: 'account' as const, uid, scopeKey: `account:${uid}` as const });
}

/** Ошибка «перелогин» для раннера: попытку не тратит, карантина не даёт. */
class AccountsV2AuthMismatch extends Error {
  readonly code = 'unauthenticated';
  readonly details = Object.freeze({ final: false });

  constructor() {
    super('accounts_v2_auth_mismatch');
    this.name = 'AccountsV2AuthMismatch';
  }
}

export function createAccountsV2ClientController(ports: AccountsV2ClientPorts): AccountsV2ClientController {
  const nowMs = ports.nowMs ?? Date.now;
  let store: AccountScopeStore | null = null;
  let storeChecked = false;
  let session: Session | null = null;
  let generation = 0;
  let serverDisabled = false;
  let eraseResumed = false;
  const detachedInProcess = new Set<string>();
  let queue: Promise<void> = Promise.resolve();

  const serial = (work: () => Promise<void>): Promise<void> => {
    const next = queue.then(work, work);
    queue = next.catch((error: unknown) => {
      console.warn(`${LOG} lifecycle step_failed code=${codeOf(error)}`);
    });
    return queue;
  };

  const getStore = (): AccountScopeStore | null => {
    if (storeChecked) return store;
    storeChecked = true;
    try {
      const adapter = ports.createStorageAdapter();
      store = adapter === null ? null : createAccountScopeStore(adapter);
    } catch (error) {
      console.warn(`${LOG} lifecycle storage_adapter_failed code=${codeOf(error)}`);
      store = null;
    }
    if (store === null) console.warn(`${LOG} lifecycle storage_unavailable`);
    return store;
  };

  /** Синхронная остановка отправки: таймер, раннер. Область закрывает вызывающий. */
  const halt = (target: Session, reason: string): void => {
    if (!target.alive) return;
    target.alive = false;
    target.sending = false;
    if (target.timer !== null) {
      ports.clearTimer(target.timer);
      target.timer = null;
    }
    target.runner.invalidate();
    console.log(`${LOG} lifecycle halted reason=${reason} generation=${target.fence.generation}`);
  };

  const closeScope = async (target: Session, reason: string): Promise<void> => {
    const st = getStore();
    if (st === null) return;
    try {
      const closed = await st.close(target.fence);
      console.log(`${LOG} lifecycle closed reason=${reason} outcome=${closed.outcome}`);
    } catch (error) {
      console.warn(`${LOG} lifecycle close_failed reason=${reason} code=${codeOf(error)}`);
    }
  };

  const schedule = (target: Session, delayMs: number): void => {
    if (!target.alive || !target.sending) return;
    if (target.timer !== null) ports.clearTimer(target.timer);
    target.timer = ports.setTimer(() => {
      target.timer = null;
      void drain(target);
    }, Math.max(0, delayMs));
  };

  /** true — продолжать проход; false — проход окончен (пауза поставлена или ждём события). */
  const afterBatch = (target: Session, result: AccountSyncRunnerResult): boolean => {
    if (result.failure !== null) {
      console.warn(`${LOG} drain fail_closed code=${result.failure}`);
      target.sending = false;
      return false;
    }
    const transport = result.transport;
    if (transport?.action === 'reauth') {
      // зачем: uid Firebase не совпал с владельцем области — ждём setAuthUid.
      console.warn(`${LOG} drain reauth code=${transport.errorCode}`);
      target.sending = false;
      return false;
    }
    if (transport !== null && transport.delayMs > 0) {
      console.log(`${LOG} drain paused action=${transport.action} delayMs=${transport.delayMs} attempts=${transport.failedAttempts}`);
      schedule(target, transport.delayMs);
      return false;
    }
    if (result.state.phase.tag === 'idle' && result.state.pendingCount === 0) {
      console.log(`${LOG} drain empty`);
      return false;
    }
    return true;
  };

  const drain = async (target: Session): Promise<void> => {
    if (!target.alive || !target.sending || target.draining) return;
    target.draining = true;
    try {
      for (let batch = 0; batch < MAX_BATCHES_PER_DRAIN; batch += 1) {
        const result = await target.runner.runOneBatch();
        if (!target.alive || !target.sending) {
          console.log(`${LOG} drain stopped_midway alive=${target.alive} sending=${target.sending}`);
          return;
        }
        if (!afterBatch(target, result)) return;
      }
      schedule(target, DRAIN_YIELD_MS);
    } catch (error) {
      console.warn(`${LOG} drain threw code=${codeOf(error)}`);
    } finally {
      target.draining = false;
    }
  };

  const onServerDisabled = (target: Session): void => {
    serverDisabled = true;
    // зачем: сервер выключен целиком — ни пакета в карантин, ни повторов до следующего запуска.
    target.sending = false;
    if (target.timer !== null) {
      ports.clearTimer(target.timer);
      target.timer = null;
    }
    target.runner.invalidate();
    console.warn(`${LOG} lifecycle server_disabled sending_stopped_until_restart`);
  };

  const guardedCall = (uid: string) => async (batch: AccountSyncWireBatch): Promise<unknown> => {
    const authUid = ports.currentAuthUid();
    if (authUid !== uid) {
      console.warn(`${LOG} transport auth_mismatch auth=${authUid === null ? 'none' : 'other'}`);
      throw new AccountsV2AuthMismatch();
    }
    return ports.callSync(batch);
  };

  const resumePendingErase = async (st: AccountScopeStore, uids: readonly string[]): Promise<void> => {
    for (const uid of uids) {
      try {
        const evidence = await st.eraseClosedAccountScope(accountScope(uid));
        const cleared = await ports.latch.clear(uid);
        console.log(`${LOG} erase resumed outcome=${evidence.outcome} records=${evidence.erasedRecordCount} latchCleared=${cleared}`);
      } catch (error) {
        console.warn(`${LOG} erase resume_failed code=${codeOf(error)}`);
      }
    }
  };

  const openSession = async (uid: string, st: AccountScopeStore): Promise<void> => {
    generation += 1;
    const scope = accountScope(uid);
    const fence: SessionFence = Object.freeze({ scopeKey: scope.scopeKey, uid, generation, nonce: ports.newNonce() });
    let handle;
    try {
      handle = await st.open(scope, fence);
    } catch (error) {
      console.warn(`${LOG} lifecycle open_failed code=${codeOf(error)}`);
      return;
    }
    const outbox = createAccountSyncOutbox(handle, { nowMs });
    const holder: { session: Session | null } = { session: null };
    const send = createAccountSyncCallableSend({
      call: guardedCall(uid),
      onServerDisabled: () => { if (holder.session !== null) onServerDisabled(holder.session); },
    });
    const runner = createAccountSyncRunner(uid, fence, 0, {
      load: (effect) => outbox.load(effect),
      dispatch: createAccountSyncDispatchPort((effect) => outbox.wireBatch(effect), send),
      ackCommit: (effect) => outbox.ackCommit(effect),
      quarantine: (effect) => outbox.quarantine(effect),
      readDispatchState: (expected) => outbox.readDispatchState(expected),
      writeDispatchState: (expected, state) => outbox.writeDispatchState(expected, state),
    }, (expected) => holder.session !== null && holder.session.alive && sameSessionFence(expected, fence),
    { nowMs, random: ports.random });
    const created: Session = { uid, scope, fence, runner, alive: true, sending: true, draining: false, timer: null };
    holder.session = created;
    if (detachedInProcess.has(uid) || ports.currentAuthUid() !== uid) {
      // зачем: пока область открывалась, uid успели удалить или сменить — не оставляем её открытой.
      console.warn(`${LOG} lifecycle open_superseded detached=${detachedInProcess.has(uid)}`);
      halt(created, 'superseded');
      await closeScope(created, 'superseded');
      return;
    }
    session = created;
    console.log(`${LOG} lifecycle started generation=${generation}`);
    void drain(created);
  };

  const start = async (uid: string): Promise<void> => {
    if (!ports.isEnabled()) { console.log(`${LOG} lifecycle skip reason=flag_off`); return; }
    if (serverDisabled) { console.log(`${LOG} lifecycle skip reason=server_disabled`); return; }
    if (detachedInProcess.has(uid)) { console.warn(`${LOG} lifecycle skip reason=detached_in_process`); return; }
    const latch = await ports.latch.read();
    if (!latch.ok) { console.warn(`${LOG} lifecycle skip reason=latch_unreadable code=${latch.code}`); return; }
    const st = getStore();
    if (st === null) { console.warn(`${LOG} lifecycle skip reason=storage_unavailable`); return; }
    if (!eraseResumed) {
      eraseResumed = true;
      if (latch.uids.length > 0) await resumePendingErase(st, latch.uids);
    }
    if (latch.uids.includes(uid)) { console.warn(`${LOG} lifecycle skip reason=detached_persisted`); return; }
    if (ports.currentAuthUid() !== uid) { console.warn(`${LOG} lifecycle skip reason=auth_changed`); return; }
    await openSession(uid, st);
  };

  const stopCurrent = async (reason: string): Promise<void> => {
    const current = session;
    if (current === null) return;
    session = null;
    halt(current, reason);
    await closeScope(current, reason);
  };

  const finishDeletion = async (
    uid: string,
    marking: Promise<boolean>,
    detaching: Promise<AccountDeletionDetachResult> | null,
  ): Promise<AccountDeletionDetachResult | null> => {
    const [marked, result] = await Promise.all([marking, detaching ?? Promise.resolve(null)]);
    if (result === null) {
      console.log(`${LOG} delete detach_no_local_scope latchMarked=${marked}`);
      return null;
    }
    if (result.outcome === 'detached') {
      const cleared = marked ? await ports.latch.clear(uid) : true;
      console.log(`${LOG} delete detach_done closed=${result.closed} latchCleared=${cleared}`);
    } else {
      // зачем: защёлка остаётся — следующий запуск не откроет область и дотрёт её.
      console.warn(`${LOG} delete erase_pending closed=${result.closed} code=${result.code ?? 'none'} latchMarked=${marked}`);
    }
    return result;
  };

  const beginDeletionDetach = (uid: string | null): Promise<AccountDeletionDetachResult | null> => {
    if (uid === null || uid.length === 0) {
      console.warn(`${LOG} delete skip reason=no_uid`);
      return Promise.resolve(null);
    }
    // Всё до первого await — синхронно: защёлка в памяти, стоп отправки, закрытие области.
    detachedInProcess.add(uid); // guard-ok: Set в памяти процесса, не хранилище
    const current = session !== null && session.uid === uid ? session : null;
    if (current !== null) {
      session = null;
      halt(current, 'account_delete');
    }
    const st = storeChecked ? store : null;
    let detaching: Promise<AccountDeletionDetachResult> | null = null;
    if (st !== null) {
      const detacher = createAccountDeletionDetacher({ scopeStore: st });
      detaching = current !== null
        ? detacher.detach(current.scope, current.fence)
        : st.eraseClosedAccountScope(accountScope(uid)).then(
          (erase) => Object.freeze({ outcome: 'detached' as const, closed: 'already_closed' as const, erase, code: null }),
          (error: unknown) => {
            console.warn(`${LOG} delete erase_closed_failed code=${codeOf(error)}`);
            return Object.freeze({
              outcome: 'detached_erase_pending' as const, closed: 'already_closed' as const, erase: null, code: codeOf(error),
            });
          },
        );
    }
    const marking = ports.latch.mark(uid);
    console.log(`${LOG} delete detach_started hadSession=${current !== null} hasStore=${st !== null}`);
    return finishDeletion(uid, marking, detaching);
  };

  return Object.freeze({
    setAuthUid: (uid: string | null) => serial(async () => {
      // зачем: тот же uid и флаг включён — ничего не делаем; флаг выключили живьём — стоп.
      if (session !== null && session.uid === uid && ports.isEnabled()) return;
      await stopCurrent(uid === null ? 'sign_out' : 'account_switch');
      if (uid === null) { console.log(`${LOG} lifecycle idle reason=no_uid`); return; }
      await start(uid);
    }),
    stop: (reason: string) => serial(() => stopCurrent(reason)),
    beginDeletionDetach,
    status: () => Object.freeze({
      uid: session?.uid ?? null,
      sending: session?.sending ?? false,
      serverDisabled,
      timerArmed: session !== null && session.timer !== null,
    }),
  });
}
