import type { AccountScope, SessionFence } from './account_session';
import type { AccountScopeStore, ScopeEraseEvidence } from './account_scope_store';

/*
 * Account V2, Пакет 4 (TG-DF4289FFB93C) — немедленное отсоединение аккаунта
 * при подтверждённом удалении. Решение владельца 15.
 *
 * зачем: удаление на сервере может идти долго, ответ может потеряться, телефон
 * может уйти в офлайн. Локальные данные аккаунта не должны ждать ни ответа, ни
 * сети. Поэтому при подтверждении удаления — СИНХРОННО, до первого await:
 *   1) uid помечается «отсоединён» (защёлка в памяти процесса);
 *   2) останавливается раннер синхронизации (stopSync);
 *   3) вызывается close(fence) области аккаунта — хранилище в этот же момент
 *      переводит попытку в `closing`, и КАЖДЫЙ старый handle (а с ним и
 *      outbox, который пишет только через handle) становится stale.
 * Затем, не дожидаясь сервера, область стирается целиком (вместе с outbox).
 * Поздний ответ сервера (подтверждение пакета синхронизации или этап удаления)
 * пишет через мёртвый handle → отказ `account_scope_stale`, ничего не
 * воскресает. От ответа удаления берётся ТОЛЬКО этап; прочие поля игнорируются.
 * Вход той же почтой = новый uid = другой scopeKey = пустая область.
 * Уведомлений об удалении не показываем никогда (правило владельца): модуль
 * возвращает данные, UI (Пакет 6) ничего по ним не всплывает.
 * TEMP (Пакет 6): защёлка живёт в памяти процесса; переживание перезапуска —
 * вместе с подключением к reducer сессии.
 */

const LOG = '[ACCOUNTS-V2-DELETE-CLIENT]';

// зачем (Ремонт №1 P2-1): v2_purged — промежуточный этап сервера (стёрт только V2).
export type AccountDeletionStage = 'accepted' | 'purging' | 'v2_purged' | 'completed';
const STAGES: readonly AccountDeletionStage[] = Object.freeze(['accepted', 'purging', 'v2_purged', 'completed']);

type AccountScopeValue = Extract<AccountScope, { kind: 'account' }>;

export type AccountDeletionDetachPorts = Readonly<{
  scopeStore: Pick<AccountScopeStore, 'close' | 'eraseClosedAccountScope'>;
  /** Остановить раннер синхронизации (таймеры, повторы). Синхронно. */
  stopSync?: () => void;
}>;

export type AccountDeletionDetachResult = Readonly<{
  outcome: 'detached' | 'detached_erase_pending';
  closed: 'closed' | 'already_closed' | 'close_failed';
  erase: ScopeEraseEvidence | null;
  /** Машинный код сбоя (закрытия/стирания) — для повтора; без данных. */
  code: string | null;
}>;

export type AccountDeletionServerOutcome =
  | Readonly<{ kind: 'ok'; stage: AccountDeletionStage }>
  | Readonly<{ kind: 'failed'; code: string }>;

export type AccountDeletionDetacher = Readonly<{
  detach(scope: AccountScopeValue, fence: SessionFence): Promise<AccountDeletionDetachResult>;
  /** Пока true — старый uid нельзя открывать снова (Пакет 6 проверяет перед open). */
  isDetached(uid: string): boolean;
  runDeletion(
    scope: AccountScopeValue,
    fence: SessionFence,
    callServer: () => Promise<unknown>,
  ): Promise<Readonly<{ detach: AccountDeletionDetachResult; server: AccountDeletionServerOutcome }>>;
}>;

export class AccountDeletionDetachError extends Error {
  readonly code: 'account_deletion_detach_invalid_input';

  constructor() {
    super('account_deletion_detach_invalid_input');
    this.name = 'AccountDeletionDetachError';
    this.code = 'account_deletion_detach_invalid_input';
  }
}

function errorCode(error: unknown): string {
  const raw = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : null;
  return typeof raw === 'string' && /^[\w/-]{1,64}$/.test(raw) ? raw : 'unknown';
}

function assertAccountTarget(scope: AccountScopeValue, fence: SessionFence): void {
  const valid = typeof scope === 'object' && scope !== null
    && scope.kind === 'account'
    && typeof scope.uid === 'string' && scope.uid.length > 0
    && scope.scopeKey === `account:${scope.uid}`
    && typeof fence === 'object' && fence !== null
    && fence.scopeKey === scope.scopeKey
    && fence.uid === scope.uid;
  if (!valid) {
    console.warn(`${LOG} detach rejected code=invalid_input`);
    throw new AccountDeletionDetachError();
  }
}

/** От ответа сервера берётся только этап; всё прочее (uid, профиль) отбрасывается. */
export function parseAccountDeletionServerStage(response: unknown): AccountDeletionServerOutcome {
  const stage = typeof response === 'object' && response !== null ? (response as { stage?: unknown }).stage : null;
  if (typeof stage === 'string' && (STAGES as readonly string[]).includes(stage)) {
    return Object.freeze({ kind: 'ok', stage: stage as AccountDeletionStage });
  }
  console.warn(`${LOG} server stage_invalid`);
  return Object.freeze({ kind: 'failed', code: 'server_stage_invalid' });
}

export function createAccountDeletionDetacher(ports: AccountDeletionDetachPorts): AccountDeletionDetacher {
  const detachedUids = new Set<string>();

  const stopSync = (): void => {
    if (ports.stopSync === undefined) return;
    try {
      ports.stopSync();
    } catch (error) {
      // зачем: остановка раннера — страховка; очередь всё равно умирает на close.
      console.warn(`${LOG} stop_sync_failed code=${errorCode(error)}`);
    }
  };

  // Не async: всё до первого await выполняется синхронно в момент вызова.
  const detach = (scope: AccountScopeValue, fence: SessionFence): Promise<AccountDeletionDetachResult> => {
    try {
      assertAccountTarget(scope, fence);
    } catch (error) {
      return Promise.reject(error);
    }
    detachedUids.add(scope.uid); // guard-ok: Set в памяти, не хранилище
    stopSync();
    let closing: Promise<Readonly<{ outcome: 'closed' | 'already_closed' }>>;
    try {
      closing = ports.scopeStore.close(fence);
    } catch (error) {
      closing = Promise.reject(error);
    }
    return finishDetach(scope, closing);
  };

  const finishDetach = async (
    scope: AccountScopeValue,
    closing: Promise<Readonly<{ outcome: 'closed' | 'already_closed' }>>,
  ): Promise<AccountDeletionDetachResult> => {
    let closed: AccountDeletionDetachResult['closed'];
    try {
      closed = (await closing).outcome;
    } catch (error) {
      const code = errorCode(error);
      // зачем: закрытие не удалось, но попытка уже `failed_close` → старый handle
      // мёртв. Стирать открытую область нельзя (erase_active) — ждём повтора.
      console.warn(`${LOG} detach close_failed code=${code}`);
      return Object.freeze({ outcome: 'detached_erase_pending', closed: 'close_failed', erase: null, code });
    }
    try {
      const erase = await ports.scopeStore.eraseClosedAccountScope(scope);
      console.log(`${LOG} detach done closed=${closed} erase=${erase.outcome} records=${erase.erasedRecordCount}`);
      return Object.freeze({ outcome: 'detached', closed, erase, code: null });
    } catch (error) {
      const code = errorCode(error);
      console.warn(`${LOG} detach erase_failed closed=${closed} code=${code}`);
      return Object.freeze({ outcome: 'detached_erase_pending', closed, erase: null, code });
    }
  };

  return Object.freeze({
    detach,
    isDetached: (uid: string) => detachedUids.has(uid),
    async runDeletion(scope, fence, callServer) {
      // зачем порядок: detach() синхронно убивает handle ДО вызова сервера, так что
      // даже мгновенный ответ сервера не застанет живую очередь. Неверный вход —
      // отказ ДО вызова сервера.
      assertAccountTarget(scope, fence);
      const detaching = detach(scope, fence);
      let server: AccountDeletionServerOutcome;
      try {
        server = parseAccountDeletionServerStage(await callServer());
      } catch (error) {
        const code = errorCode(error);
        // зачем: сбой/потеря ответа не возвращают данные — удаление доведёт сервер (решение 15).
        console.warn(`${LOG} server failed code=${code}`);
        server = Object.freeze({ kind: 'failed', code });
      }
      const detachResult = await detaching;
      console.log(`${LOG} run done detach=${detachResult.outcome} server=${server.kind}`);
      return Object.freeze({ detach: detachResult, server });
    },
  });
}
