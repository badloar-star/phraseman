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
import { createAccountsV2Producer } from './account_sync_producer';
import type { AccountsV2Change } from './account_sync_producer_plan';

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
/**
 * Не чаще одного перезапуска вставшей отправки за это окно.
 * зачем (ревью 6B, P3): возврат в приложение не должен каждый раз заново
 * открывать базу и раннер, если отправка встала по устойчивой причине.
 */
const RESUME_MIN_INTERVAL_MS = 120_000;
/** Коды стирания, которые повтор не исправит (хвост 6C P3) — отдельная ветка лога. */
const TERMINAL_ERASE_CODE = /manifest_mismatch|marker_foreign|lineage_exhausted/;
/**
 * Пакет 6E: после стольких терминальных неудач uid стирается не чаще раза в сутки.
 * зачем: повтор такие коды не лечит — каждый запуск тратил бы чтения/записи впустую.
 */
const TERMINAL_ERASE_MAX_ATTEMPTS = 3;
const TERMINAL_ERASE_RETRY_MS = 24 * 60 * 60 * 1000;
/**
 * Пакет 6F: пауза перед отправкой после новых операций производителя.
 * зачем: свайпы и правки идут пачками — одна отправка на пачку, а не вызов
 * callable на каждое действие (лимит 20 вызовов/мин на uid, Firebase-экономия).
 */
const PRODUCER_WAKE_MS = 3_000;

type AccountScopeValue = Extract<AccountScope, { kind: 'account' }>;

export type AccountsV2ClientPorts = Readonly<{
  isEnabled: () => boolean;
  /**
   * Нативное хранилище областей; null — не подключено (область не открываем).
   * Может нести `discoverPendingEraseUids()` (Пакет 6C) — след незаконченных стираний.
   */
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
  /**
   * Пакет 6F: изменение приложения → операции в outbox текущей области (dual-write).
   * Нет живой сессии текущего uid — ничего (лог). Никогда не отклоняется.
   */
  produce(change: AccountsV2Change, ownerUid: string): Promise<void>;
  status(): AccountsV2ClientStatus;
}>;

type Session = {
  readonly uid: string;
  readonly scope: AccountScopeValue;
  readonly fence: SessionFence;
  readonly runner: AccountSyncRunner;
  readonly produce: (change: AccountsV2Change) => Promise<Readonly<{ enqueued: number }>>;
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

/** Код адаптера под обёрткой стора (causeCode), иначе собственный код ошибки. */
function causeCodeOf(value: unknown): string {
  const raw = typeof value === 'object' && value !== null && 'causeCode' in value
    ? (value as { causeCode: unknown }).causeCode : null;
  return typeof raw === 'string' && /^[\w/-]{1,96}$/.test(raw) ? raw : codeOf(value);
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
  let storeAdapter: ScopeStorageAdapter | null = null;
  let storeChecked = false;
  let lastResumeAtMs = Number.NEGATIVE_INFINITY;
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
      storeAdapter = adapter;
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
    if (result.state.phase.tag === 'stopped') {
      // зачем: остановленный раннер больше ничего не отправит — без этого проход крутил бы пустые круги.
      console.warn(`${LOG} drain runner_stopped`);
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

  /** uid, чьё стирание упало (пусто — все подтверждены; в лог — код каждой неудачи). */
  const resumePendingErase = async (st: AccountScopeStore, uids: readonly string[]): Promise<readonly string[]> => {
    const failed: string[] = [];
    const terminal = ports.latch.readTerminal === undefined ? new Map() : await ports.latch.readTerminal();
    let capped = 0;
    for (const uid of uids) {
      const record = terminal.get(uid);
      if (record !== undefined && record.count >= TERMINAL_ERASE_MAX_ATTEMPTS && nowMs() - record.lastAtMs < TERMINAL_ERASE_RETRY_MS) {
        // зачем (6E): терминальный код повтором не лечится — не чаще раза в сутки; uid остаётся в защёлке.
        failed.push(uid);
        capped += 1;
        continue;
      }
      try {
        const evidence = await st.eraseClosedAccountScope(accountScope(uid));
        const cleared = await ports.latch.clear(uid);
        console.log(`${LOG} erase resumed outcome=${evidence.outcome} records=${evidence.erasedRecordCount} latchCleared=${cleared}`);
      } catch (error) {
        failed.push(uid);
        const code = codeOf(error);
        const cause = causeCodeOf(error);
        // зачем (Пакет 6D, хвост 6C P3): «чужой манифест / чужая метка / линия кончилась»
        // повтором не лечатся — отдельная ветка лога, чтобы это было видно, а не тонуло в io.
        if (TERMINAL_ERASE_CODE.test(cause)) {
          const noted = ports.latch.noteTerminal === undefined ? null : await ports.latch.noteTerminal(uid, nowMs());
          console.warn(`${LOG} erase resume_terminal code=${code} cause=${cause} uidStaysLatched=true attempts=${noted?.count ?? 'untracked'} cap=${TERMINAL_ERASE_MAX_ATTEMPTS}`);
        } else {
          console.warn(`${LOG} erase resume_failed code=${code} cause=${cause}`);
        }
      }
    }
    if (capped > 0) console.log(`${LOG} erase terminal_capped count=${capped} retryAfterHours=24`);
    return failed;
  };

  /** Найденные хранилищем uid с незаконченным стиранием (метка вывода из строя). */
  const discoverPendingErase = async (knownUids: readonly string[]): Promise<readonly string[]> => {
    const discover = (storeAdapter as { discoverPendingEraseUids?: unknown } | null)?.discoverPendingEraseUids;
    if (typeof discover !== 'function') {
      console.log(`${LOG} latch discover_unsupported`);
      return [];
    }
    try {
      const found = await Reflect.apply(discover, storeAdapter, [knownUids]) as unknown;
      return Array.isArray(found) ? found.filter((uid): uid is string => typeof uid === 'string' && uid.length > 0) : [];
    } catch (error) {
      console.warn(`${LOG} latch discover_failed code=${codeOf(error)}`);
      return [];
    }
  };

  /** Сколько семейств файлов последнее обнаружение не смогло приписать uid (адаптер 6E). */
  const unattributedAfterDiscovery = (): number => {
    const read = (storeAdapter as { lastDiscoveryUnattributed?: unknown } | null)?.lastDiscoveryUnattributed;
    if (typeof read !== 'function') return 0;
    try {
      const value = Reflect.apply(read, storeAdapter, []) as unknown;
      return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0;
    } catch (error) {
      console.warn(`${LOG} latch unattributed_unreadable code=${codeOf(error)}`);
      return 0;
    }
  };

  /**
   * Испорченная защёлка (ревью 6B, P2 + хвост 6C): сперва дочищаем всё, что
   * удалось найти (метки хранилища + uid, удалённые в этом процессе), и только
   * ПОСЛЕ этого прохода сбрасываем запись. Хранилища нет — прохода не было,
   * запись не трогаем (V2 и так не откроется без хранилища).
   */
  const recoverCorruptLatch = async (): Promise<void> => {
    const st = getStore();
    if (st === null) {
      console.warn(`${LOG} latch reset_deferred reason=storage_unavailable`);
      return;
    }
    const authUid = ports.currentAuthUid();
    const known = [...new Set([...detachedInProcess, ...(authUid === null ? [] : [authUid])])];
    const uids = [...new Set([...await discoverPendingErase(known), ...detachedInProcess])];
    console.warn(`${LOG} latch corrupt_recovery pending=${uids.length} known=${known.length}`);
    const failed = uids.length > 0 ? await resumePendingErase(st, uids) : [];
    if (failed.length > 0) {
      // зачем (ревью 6C P2 + хвост P3, Пакет 6D): упавшие uid НЕ теряем, но и битую запись
      // не держим вечно — переписываем её валидной защёлкой ровно из упавших uid
      // (mark поверх битой записи пишет только свой uid). Дальше они дотираются обычным
      // путём на каждом запуске, а остальные аккаунты V2 больше не заблокированы
      // стабильно падающим стиранием. Не записалось — запись остаётся битой, повтор позже.
      // зачем (6E): одной записью (replace) — оборванный цикл mark мог потерять часть uid.
      let rewritten: boolean;
      if (ports.latch.replace !== undefined) {
        rewritten = await ports.latch.replace(failed);
      } else {
        rewritten = true;
        for (const uid of failed) rewritten = (await ports.latch.mark(uid)) && rewritten;
      }
      console.warn(`${LOG} latch corrupt_rewritten failed=${failed.length} ok=${rewritten} atomic=${ports.latch.replace !== undefined}`);
      return;
    }
    const reset = await ports.latch.reset();
    // зачем (6E): области без метки и без известного uid стереть нельзя (в имени только хэш) —
    // защёлку сбрасываем, но сколько таких «бесхозных» осталось, видно в логе.
    const orphans = unattributedAfterDiscovery();
    if (orphans > 0) console.warn(`${LOG} latch reset_with_orphans unattributed=${orphans}`);
    console.warn(`${LOG} latch corrupt_recovery_done reset=${reset} unattributed=${orphans}`);
  };

  /** true — повторное чтение защёлки снова упало, но само SecureStore пишет/читает (probe). */
  const readFailureIsEntryOnly = async (): Promise<boolean> => {
    const again = await ports.latch.read();
    if (again.ok || again.code !== 'latch_read_failed') {
      console.log(`${LOG} latch reread ok=${again.ok} code=${again.ok ? 'none' : again.code}`);
      return false;
    }
    if (ports.latch.probe === undefined) {
      console.warn(`${LOG} latch probe_unsupported stays_fail_closed`);
      return false;
    }
    const healthy = await ports.latch.probe();
    if (!healthy) console.warn(`${LOG} latch store_unhealthy stays_fail_closed`);
    return healthy;
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
    const producer = createAccountsV2Producer({
      uid, fence, handle, outbox, newOperationId: () => `v2p-${ports.newNonce()}`,
    });
    const created: Session = {
      uid, scope, fence, runner, produce: producer.produce, alive: true, sending: true, draining: false, timer: null,
    };
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
    if (!latch.ok) {
      // зачем (ревью 6B, P2): отказ — только в этот раз. Битая запись в Keychain
      // переживает переустановку и иначе выключала бы V2 навсегда для всех аккаунтов.
      console.warn(`${LOG} lifecycle skip reason=latch_unreadable code=${latch.code}`);
      if (latch.code === 'latch_corrupt') {
        await recoverCorruptLatch();
      } else if (latch.code === 'latch_read_failed' && await readFailureIsEntryOnly()) {
        // зачем (6E): восстановленный телефон — ключ Keystore записи не переехал, запись
        // не расшифровать никогда. SecureStore при этом жив → это «битая запись», а не
        // «сломанное хранилище»: дочищаем найденное и сбрасываем, иначе V2 выключен навсегда.
        console.warn(`${LOG} latch read_failed_treated_as_corrupt`);
        await recoverCorruptLatch();
      }
      return;
    }
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
      if (session !== null && session.uid === uid && ports.isEnabled()) {
        // зачем (ревью 6B, P3): отправка могла встать (мгновенное расхождение uid →
        // reauth, fail-closed раннера). Повтор того же uid перезапускает сессию
        // свежим раннером; «сервер выключен» — до следующего запуска, не трогаем.
        if (session.sending || serverDisabled) return;
        const sinceMs = nowMs() - lastResumeAtMs;
        if (sinceMs < RESUME_MIN_INTERVAL_MS) {
          console.log(`${LOG} lifecycle resume_throttled sinceMs=${sinceMs} minMs=${RESUME_MIN_INTERVAL_MS}`);
          return;
        }
        lastResumeAtMs = nowMs();
        console.log(`${LOG} lifecycle resume_after_stop generation=${session.fence.generation}`);
      }
      await stopCurrent(uid === null ? 'sign_out' : 'account_switch');
      if (uid === null) { console.log(`${LOG} lifecycle idle reason=no_uid`); return; }
      await start(uid);
    }),
    stop: (reason: string) => serial(() => stopCurrent(reason)),
    beginDeletionDetach,
    produce: (change: AccountsV2Change, ownerUid: string) => serial(async () => {
      const current = session;
      if (!ports.isEnabled()) { console.log(`${LOG} producer skip reason=flag_off kind=${change.kind}`); return; }
      if (current === null || !current.alive) { console.warn(`${LOG} producer skip reason=no_session kind=${change.kind}`); return; }
      if (ownerUid !== current.uid) {
        // зачем (ремонт №1, P2): изменение записано аккаунтом, который уже не владеет
        // открытой областью (смена A→B между записью и постановкой) — в чужую область не пишем.
        console.warn(`${LOG} producer skip reason=uid_mismatch kind=${change.kind}`);
        return;
      }
      if (ports.currentAuthUid() !== current.uid) {
        // зачем: смена аккаунта идёт прямо сейчас — область ещё не переключилась.
        console.warn(`${LOG} producer skip reason=auth_mismatch kind=${change.kind}`);
        return;
      }
      let enqueued = 0;
      try {
        enqueued = (await current.produce(change)).enqueued;
      } catch (error) {
        console.warn(`${LOG} producer threw kind=${change.kind} code=${codeOf(error)}`);
        return;
      }
      if (enqueued > 0 && current.alive && current.sending && !current.draining && current.timer === null) {
        schedule(current, PRODUCER_WAKE_MS);
      }
    }),
    status: () => Object.freeze({
      uid: session?.uid ?? null,
      sending: session?.sending ?? false,
      serverDisabled,
      timerArmed: session !== null && session.timer !== null,
    }),
  });
}
