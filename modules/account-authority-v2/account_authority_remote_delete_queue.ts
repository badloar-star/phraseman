import {
  parseAccountId,
  parseOperationId,
  parseSessionId,
  type AccountId,
  type DeviceId,
  type SessionId,
} from './account_authority_ids';
import {
  createDurableSlotList,
  type DurableSlotList,
  type DurableSlotSecureStore,
} from './account_authority_durable_slots';
import type { AccountAuthorityInstallationBindingPort } from './account_authority_lease_transport';
import {
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  type AccountAuthorityLogger,
} from './account_authority_logger';
import type { AccountAuthorityLeasePort } from './account_authority_runtime';

/*
 * AA S4a: серверное удаление local-first — надёжная очередь запросов
 * `delete_begin`.
 *
 * Раунд 3 (H-B1, обязательство удалить данные): запись снимается ТОЛЬКО по
 * доказательству, что данные AA на сервере удалены или будут удалены:
 *   - успех delete_begin (сервер завёл задачу удаления, она сама доводит
 *     освобождение и purge и переживает сбои);
 *   - `identity_unresolved` (принципал не найден): принципал без TTL и
 *     стирается только purge AA или старым удалением (стадия
 *     account_authority_purge) — значит данные уже стёрты;
 *   - доказательство старого удаления: сервер принял старое удаление этого
 *     аккаунта (замок `server_enqueued`), а его задача сама чистит AA
 *     (`resolveByLegacyDeletion`).
 * Всё прочее НЕ доказательство (`unauthenticated` — просто «не вошёл»;
 * `binding_rejected` — привязка могла истечь по TTL; сбой чтения привязки —
 * временный SecureStore; `lease_rejected` — аренду держит другое устройство;
 * непонятный ответ) — запись остаётся с состоянием и догоняется при следующем
 * входе; бюджет попыток тратят только временные сетевые сбои.
 */

export type RemoteDeleteState = 'pending' | 'needs_sign_in' | 'needs_check' | 'not_completed' | 'awaiting_legacy';

/*
 * AA S5 (D-AA5, на подтверждение координатору): кто ведёт СЕРВЕРНОЕ удаление.
 *   'authority'      — эта очередь сама шлёт `delete_begin` (путь S4a);
 *   'legacy_primary' — главный путь — старое удаление (`account_delete`: полное
 *     стирание всех доменов, включая стадию account_authority_purge). Очередь
 *     только помнит операцию (`awaiting_legacy`) до доказательства старым
 *     удалением; `delete_begin` НЕ отправляется ни из потока удаления, ни на
 *     старте, ни при входе.
 * зачем: при cutover оба удаления шли параллельно — AA стирал Auth и выходил из
 * провайдера через ≤5 с, пока старый поток ещё ждал постановку своей задачи
 * (она требует входа) → полное стирание могло не начаться (дыра), и на одно
 * действие было два серверных удаления (двойная работа).
 */
export type AccountAuthorityServerDeletePath = 'authority' | 'legacy_primary';

/** AA S5 (D-AA5): путь серверного удаления в боевой сборке (тесты S4a держат 'authority'). */
export const ACCOUNT_AUTHORITY_PRODUCTION_SERVER_DELETE_PATH: AccountAuthorityServerDeletePath = 'legacy_primary';

/*
 * AA S5 (D-AA5): операции удаления, для которых выход из провайдера делает
 * СТАРЫЙ поток. зачем: старое удаление держит вход до подтверждения сервера
 * (без входа его задачу не поставить); выход AA раньше этого и был дырой.
 * Только память процесса: runtime выходит из провайдера в том же удалении.
 */
const providerSignOutDeferredDeletes = new Set<string>();

export function deferAccountAuthorityDeleteProviderSignOut(operationId: string): void {
  providerSignOutDeferredDeletes.add(parseOperationId(operationId).value);
}

export function releaseAccountAuthorityDeleteProviderSignOutDeferral(operationId: string): void {
  providerSignOutDeferredDeletes.delete(operationId);
}

export function isAccountAuthorityDeleteProviderSignOutDeferred(operationId: string): boolean {
  return providerSignOutDeferredDeletes.has(operationId);
}

export type RemoteDeleteEntry = Readonly<{
  operationId: string;
  accountId: string;
  sessionId: string;
  attempts: number;
  state: RemoteDeleteState;
  /** Раунд 4 (L-2): когда запись встала в очередь — срок жизни удержания. */
  enqueuedAtMs: number;
  /** Раунд 4 (L-2): сколько раз запись проверялась без входа (пауза растёт). */
  holdChecks: number;
  /** Раунд 4 (L-2): раньше этого времени needs_check не отправляется. */
  nextCheckAtMs: number;
}>;

/** Состояние очереди для будущего экрана (только числа, без id). */
export type RemoteDeleteQueueState = Readonly<{
  total: number;
  pending: number;
  needsSignIn: number;
  needsCheck: number;
  notCompleted: number;
  /** Записи, которые не прочитались (остаются в очереди, читаются на каждом старте). */
  unreadable: number;
  /** AA S5: ждут доказательства старым удалением (главный путь legacy_primary). */
  awaitingLegacy: number;
}>;

export const REMOTE_DELETE_QUEUE_PREFIX = 'phraseman.account_authority.remote_delete.v2';
const REMOTE_DELETE_QUEUE_SCHEMA = 'account-authority-remote-delete.v2';
export const MAX_REMOTE_DELETE_ENTRIES = 16;
export const MAX_REMOTE_DELETE_ATTEMPTS = 50;
export const REMOTE_DELETE_FIRST_SEND_DEADLINE_MS = 5_000;
/** Раунд 4 (L-2): срок жизни удержанной записи — как квитанция удаления на сервере. */
export const REMOTE_DELETE_HOLD_TTL_MS = 90 * 24 * 60 * 60_000;
/** Раунд 4 (L-2): пауза needs_check — сутки, дальше вдвое, не больше 30 дней. */
export const REMOTE_DELETE_CHECK_BASE_MS = 24 * 60 * 60_000;
export const REMOTE_DELETE_CHECK_MAX_MS = 30 * 24 * 60 * 60_000;

export function remoteDeleteCheckDelayMs(holdChecks: number): number {
  const exponent = Math.min(Math.max(holdChecks - 1, 0), 10);
  return Math.min(REMOTE_DELETE_CHECK_BASE_MS * 2 ** exponent, REMOTE_DELETE_CHECK_MAX_MS);
}

const STATES: ReadonlySet<string> = new Set(['pending', 'needs_sign_in', 'needs_check', 'not_completed', 'awaiting_legacy']);

/** Окончательные исходы — запись снимается: данные AA на сервере удалены/будут удалены. */
const PROOF_CODES: ReadonlyMap<string, string> = new Map([
  ['account_authority_lease_identity_unresolved', 'principal_already_purged'],
]);

/** Не доказательство — запись остаётся; попытки не тратятся. */
const HOLD_CODES: ReadonlyMap<string, RemoteDeleteState> = new Map([
  // «Не вошёл»: старый поток удаления выходит из аккаунта раньше выгрузки.
  ['account_authority_lease_unauthenticated', 'needs_sign_in'],
  // Сбой чтения привязки (в т.ч. временный SecureStore) — проверить при входе.
  ['account_authority_installation_binding_unavailable', 'needs_check'],
  ['account_authority_lease_revision_unavailable', 'needs_check'],
  // Привязку сервер не признал (могла истечь по TTL) — не доказательство удаления.
  ['account_authority_lease_binding_rejected', 'needs_check'],
  ['account_authority_lease_invalid', 'needs_check'],
  ['account_authority_lease_request_invalid', 'needs_check'],
  ['account_authority_lease_disabled', 'needs_check'],
  ['account_authority_lease_provider_rejected', 'needs_check'],
  // Аренду держит другое устройство и т.п. — удаление НЕ завершено, тревога.
  ['account_authority_lease_rejected', 'not_completed'],
]);

export type RemoteDeleteQueueController = Readonly<{
  state(): RemoteDeleteQueueState;
  resolveByLegacyDeletion(operationId: string): boolean;
}>;

let activeQueue: RemoteDeleteQueueController | null = null;

/** Геттер для будущего экрана: состояние очереди серверного удаления (null — AA не собран). */
export function accountAuthorityRemoteDeleteQueueState(): RemoteDeleteQueueState | null {
  return activeQueue === null ? null : activeQueue.state();
}

/**
 * Доказательство старого удаления (сервер принял его задачу, а она чистит и
 * данные AA). Снимает запись этой операции; true — запись была и снята.
 */
export function resolveAccountAuthorityRemoteDeleteByLegacy(operationId: string): boolean {
  return activeQueue === null ? false : activeQueue.resolveByLegacyDeletion(operationId);
}

function parseEntry(value: unknown): RemoteDeleteEntry {
  if (typeof value !== 'object' || value === null) throw new Error('invalid');
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expected = ['accountId', 'attempts', 'enqueuedAtMs', 'holdChecks', 'nextCheckAtMs', 'operationId', 'sessionId', 'state'];
  if (keys.join(',') !== expected.join(',')) throw new Error('invalid');
  for (const field of ['attempts', 'enqueuedAtMs', 'holdChecks', 'nextCheckAtMs']) {
    if (!Number.isSafeInteger(record[field]) || (record[field] as number) < 0) throw new Error('invalid');
  }
  if (typeof record.state !== 'string' || !STATES.has(record.state)) throw new Error('invalid');
  return Object.freeze({
    operationId: parseOperationId(record.operationId).value,
    accountId: parseAccountId(record.accountId).value,
    sessionId: parseSessionId(record.sessionId).value,
    attempts: record.attempts as number,
    state: record.state as RemoteDeleteState,
    enqueuedAtMs: record.enqueuedAtMs as number,
    holdChecks: record.holdChecks as number,
    nextCheckAtMs: record.nextCheckAtMs as number,
  });
}

export type InterruptedDelete = Readonly<{
  operationId: string;
  owner: Readonly<{ accountId: string; sessionId: string }>;
}>;

export function createLocalFirstDeleteLease(input: Readonly<{
  inner: AccountAuthorityLeasePort;
  installationBinding: AccountAuthorityInstallationBindingPort;
  secureStore: DurableSlotSecureStore;
  secureOptions: object;
  deviceId: DeviceId;
  interrupted: readonly InterruptedDelete[];
  log: AccountAuthorityLogger;
  /** Строка-тревога, переживающая перезапуск (DebugLogger critical); только коды. */
  reportCritical?: (event: string, code: string) => void;
  firstSendDeadlineMs?: number;
  /** Часы (тесты подменяют). */
  nowMs?: () => number;
  /** AA S5 (D-AA5): кто ведёт серверное удаление; по умолчанию — 'authority' (путь S4a). */
  serverDeletePath?: AccountAuthorityServerDeletePath;
}>): AccountAuthorityLeasePort {
  const { log } = input;
  const nowMs = input.nowMs ?? (() => Date.now());
  const serverDeletePath: AccountAuthorityServerDeletePath = input.serverDeletePath === 'legacy_primary'
    ? 'legacy_primary'
    : 'authority';
  const newEntryState: RemoteDeleteState = serverDeletePath === 'legacy_primary' ? 'awaiting_legacy' : 'pending';
  log.info('[AA-S5] remote_delete path', { reason: serverDeletePath });
  const queue: DurableSlotList<RemoteDeleteEntry> = createDurableSlotList({
    secureStore: input.secureStore,
    options: input.secureOptions,
    log,
    prefix: REMOTE_DELETE_QUEUE_PREFIX,
    schema: REMOTE_DELETE_QUEUE_SCHEMA,
    max: MAX_REMOTE_DELETE_ENTRIES,
    label: 'remote_delete',
    invalidCode: 'account_authority_remote_delete_outbox_invalid',
    fullCode: 'account_authority_remote_delete_queue_full',
    unavailableCode: 'account_authority_remote_delete_unavailable',
    parse: parseEntry,
    keyOf: (entry) => entry.operationId,
    reportCritical: input.reportCritical,
  });
  const firstSendDeadlineMs = Math.max(0, input.firstSendDeadlineMs ?? REMOTE_DELETE_FIRST_SEND_DEADLINE_MS);
  let drainInFlight: Promise<void> | null = null;
  type Trigger = Readonly<{ source: 'request' | 'startup' } | { source: 'acquire'; accountId: string }>;
  // Поводы, пришедшие во время прохода, — по очереди после него (ни один не теряется).
  const queuedTriggers: Trigger[] = [];

  const critical = (event: string, code: string): void => {
    log.warn(`[AA-S4] ${event}`, { code });
    try {
      input.reportCritical?.(`aa_s4:${event}`, code);
    } catch (error) {
      log.warn('[AA-S4] remote_delete critical_report_failed', {
        kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
    }
  };
  const enqueue = (entry: Readonly<{ operationId: string; accountId: string; sessionId: string }>, source: 'request' | 'recovery'): void => {
    if (queue.find(entry.operationId) !== null) {
      log.info('[AA-S4] remote_delete enqueue', { source, result: 'already_queued', pending: queue.size() });
      return;
    }
    queue.add(Object.freeze({
      ...entry, attempts: 0, state: newEntryState, enqueuedAtMs: nowMs(), holdChecks: 0, nextCheckAtMs: 0,
    }));
    log.info('[AA-S4] remote_delete enqueue', { source, result: 'queued', pending: queue.size() });
    if (newEntryState === 'awaiting_legacy') log.info('[AA-S5] remote_delete awaiting_legacy', { source });
  };
  const forgetBinding = async (owner: Readonly<{ accountId: AccountId; sessionId: SessionId }>): Promise<void> => {
    try {
      await input.installationBinding.resetForLease(owner);
      log.info('[AA-S4] remote_delete binding_forgotten');
    } catch (error) {
      log.warn('[AA-S4] remote_delete binding_forget_failed', {
        kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
    }
  };
  const settleDone = (entry: RemoteDeleteEntry, reason: string): boolean => {
    try {
      queue.remove(entry.operationId);
    } catch (error) {
      log.warn('[AA-S4] remote_delete settle_persist_failed', {
        result: 'done', kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
      return false;
    }
    log.info('[AA-S4] remote_delete settled', { result: 'done', reason, pending: queue.size() });
    return true;
  };
  const settleKeep = (entry: RemoteDeleteEntry, state: RemoteDeleteState, burnAttempt: boolean, reason: string): void => {
    // Раунд 4 (L-2): удержанная запись проверяется с нарастающей паузой, а не на каждом старте.
    const held = state !== 'pending';
    const holdChecks = held ? entry.holdChecks + 1 : 0;
    const next = Object.freeze({
      ...entry,
      state,
      attempts: entry.attempts + (burnAttempt ? 1 : 0),
      holdChecks,
      nextCheckAtMs: held ? nowMs() + remoteDeleteCheckDelayMs(holdChecks) : 0,
    });
    try {
      queue.replace(next);
    } catch (error) {
      log.warn('[AA-S4] remote_delete settle_persist_failed', {
        result: state, kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
      return;
    }
    log.info('[AA-S4] remote_delete settled', { result: state, reason, attempts: next.attempts, pending: queue.size() });
  };
  const sendOne = async (entry: RemoteDeleteEntry): Promise<void> => {
    const owner = Object.freeze({ accountId: parseAccountId(entry.accountId), sessionId: parseSessionId(entry.sessionId) });
    try {
      await input.inner.deleteAccount({ ...owner, deviceId: input.deviceId, operationId: parseOperationId(entry.operationId) });
    } catch (error) {
      const code = accountAuthorityErrorCode(error);
      const proof = PROOF_CODES.get(code);
      if (proof !== undefined) {
        log.info('[AA-S4] remote_delete proof', { reason: proof, code });
        if (settleDone(entry, proof)) await forgetBinding(owner);
        return;
      }
      const hold = HOLD_CODES.get(code);
      if (hold !== undefined) {
        log.warn('[AA-S4] remote_delete held', { result: hold, code });
        if (hold === 'not_completed') critical('remote_delete not_completed', code);
        settleKeep(entry, hold, false, code);
        return;
      }
      // Временный сбой (сеть/сервер) — единственное, что тратит бюджет попыток.
      if (entry.attempts + 1 >= MAX_REMOTE_DELETE_ATTEMPTS) {
        critical('remote_delete attempt_budget_exhausted', code);
        settleKeep(entry, 'not_completed', true, 'attempt_budget');
        return;
      }
      log.warn('[AA-S4] remote_delete retry_later', {
        reason: 'retryable', kind: accountAuthorityErrorKind(error), code,
      });
      settleKeep(entry, 'pending', true, 'retryable');
      return;
    }
    if (settleDone(entry, 'server_accepted')) await forgetBinding(owner);
  };
  /*
   * Какие записи берёт повод.
   *   вход (acquire) — ТОЛЬКО записи вошедшего аккаунта (раунд 4, L-3: токен
   *     привязки A не уходит под сессией B), любые состояния;
   *   старт и новое удаление — pending и needs_check, чья пауза истекла.
   */
  /*
   * Раунд 5 (LOW-2): часы недостоверны (перевели назад: «сейчас» раньше
   * постановки, или до проверки дольше максимальной паузы) — по сроку не
   * судим: проверяем при этом поводе, а пауза пересчитается после ответа.
   */
  const clockUnreliable = (entry: RemoteDeleteEntry): boolean => {
    const now = nowMs();
    return now < entry.enqueuedAtMs || entry.nextCheckAtMs - now > REMOTE_DELETE_CHECK_MAX_MS;
  };
  const eligible = (entry: RemoteDeleteEntry, trigger: Trigger): boolean => {
    // AA S5 (D-AA5): запись старого пути не отправляется НИКОГДА — даже при входе
    // этого аккаунта (delete_begin стёр бы Auth, а полное стирание ведёт старое удаление).
    if (entry.state === 'awaiting_legacy') return false;
    if (trigger.source === 'acquire') return entry.accountId === trigger.accountId;
    if (entry.state === 'pending') return true;
    if (entry.state !== 'needs_check') return false;
    if (clockUnreliable(entry)) {
      log.warn('[AA-S4] remote_delete clock_unreliable', { reason: 'check_now' });
      return true;
    }
    return nowMs() >= entry.nextCheckAtMs;
  };
  /*
   * Раунд 4 (L-2): удержание не вечное. Ответ мог потеряться, а сервер уже
   * стёр всё — тогда запись навсегда получала бы binding_rejected/unauthenticated.
   * Через 90 дней (срок квитанции удаления на сервере) удержанная запись
   * снимается с тревогой, переживающей перезапуск.
   */
  const expireHeld = (): void => {
    for (const entry of queue.values()) {
      // Раунд 5 (LOW-3): по сроку снимаются только «нужен вход»/«нужна проверка».
      // not_completed — сервер точно не удалил: держим до входа этим аккаунтом
      // или доказательства старым удалением; pending — свой бюджет попыток.
      if (entry.state !== 'needs_sign_in' && entry.state !== 'needs_check' && entry.state !== 'awaiting_legacy') continue;
      // Часы назад (now < enqueuedAtMs) дают отрицательный возраст — по сроку не снимаем.
      if (nowMs() - entry.enqueuedAtMs < REMOTE_DELETE_HOLD_TTL_MS) continue;
      critical('remote_delete hold_expired', `state_${entry.state}`);
      settleDone(entry, 'hold_expired');
    }
  };
  const drain = (trigger: Trigger): Promise<void> => {
    expireHeld();
    if (queue.size() === 0) {
      log.info('[AA-S4] remote_delete idle', { source: trigger.source });
      return Promise.resolve();
    }
    if (drainInFlight !== null) {
      if (queuedTriggers.length < 8) queuedTriggers.push(trigger);
      log.info('[AA-S4] remote_delete joined', { source: trigger.source });
      return drainInFlight;
    }
    const batch = queue.values().filter((entry) => eligible(entry, trigger));
    log.info('[AA-S4] remote_delete drain_start', { source: trigger.source, pending: queue.size(), eligible: batch.length });
    const run = (async () => {
      // Один проход по снимку: повтор — по следующему поводу, не в цикле.
      for (const entry of batch) await sendOne(entry);
    })();
    drainInFlight = run;
    void run.then(
      () => {
        drainInFlight = null;
        log.info('[AA-S4] remote_delete drain_done', { pending: queue.size() });
        const next = queuedTriggers.shift();
        if (next !== undefined) void drain(next);
      },
      (error: unknown) => {
        drainInFlight = null;
        log.warn('[AA-S4] remote_delete drain_failed', {
          kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
        });
      },
    );
    return run;
  };
  for (const item of input.interrupted) {
    try {
      enqueue({ operationId: item.operationId, accountId: item.owner.accountId, sessionId: item.owner.sessionId }, 'recovery');
    } catch (error) {
      log.warn('[AA-S4] remote_delete recovery_enqueue_failed', {
        kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
    }
  }
  if (queue.size() > 0) {
    Promise.resolve().then(() => drain({ source: 'startup' }), (error: unknown) => {
      log.warn('[AA-S4] remote_delete schedule_failed', {
        kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
    });
  }
  activeQueue = Object.freeze({
    state: (): RemoteDeleteQueueState => {
      const values = queue.values();
      const count = (state: RemoteDeleteState) => values.filter((entry) => entry.state === state).length;
      return Object.freeze({
        total: values.length,
        pending: count('pending'),
        needsSignIn: count('needs_sign_in'),
        needsCheck: count('needs_check'),
        notCompleted: count('not_completed'),
        unreadable: queue.unreadable(),
        awaitingLegacy: count('awaiting_legacy'),
      });
    },
    resolveByLegacyDeletion: (operationId: string): boolean => {
      const entry = queue.find(operationId);
      if (entry === null) {
        log.info('[AA-S4] remote_delete legacy_proof', { result: 'not_queued' });
        return false;
      }
      return settleDone(entry, 'legacy_delete_enqueued');
    },
  });
  const port: AccountAuthorityLeasePort = {
    acquire: async (request) => {
      const lease = await input.inner.acquire(request);
      // Вход удался — сеть и личность ЭТОГО аккаунта есть: догоняем только его записи.
      if (queue.size() > 0) void drain({ source: 'acquire', accountId: lease.accountId.value });
      return lease;
    },
    release: (request) => input.inner.release(request),
    /*
     * Ставит запрос в надёжную очередь (синхронно) и ждёт ПЕРВУЮ отправку не
     * дольше firstSendDeadlineMs. зачем (раунд 3): runtime выходит из
     * провайдера ПОСЛЕ этого вызова — запрос уходит, пока человек ещё вошёл.
     * Локальное состояние уже «удалено» (runtime закоммитил его раньше).
     */
    deleteAccount: async (request) => {
      enqueue({
        operationId: parseOperationId(request.operationId.value).value,
        accountId: parseAccountId(request.accountId.value).value,
        sessionId: parseSessionId(request.sessionId.value).value,
      }, 'request');
      if (serverDeletePath === 'legacy_primary') {
        // AA S5 (D-AA5): серверное удаление ведёт старый поток — сеть здесь не нужна.
        log.info('[AA-S5] remote_delete first_send', { result: 'skipped_legacy_primary', pending: queue.size() });
        return;
      }
      let timer: ReturnType<typeof setTimeout> | null = null;
      const deadline = new Promise<'deadline'>((resolve) => {
        timer = setTimeout(() => resolve('deadline'), firstSendDeadlineMs);
      });
      const outcome = await Promise.race([drain({ source: 'request' }).then(() => 'sent' as const), deadline]);
      if (timer !== null) clearTimeout(timer);
      log.info('[AA-S4] remote_delete first_send', { result: outcome, pending: queue.size() });
    },
  };
  return Object.freeze(port);
}
