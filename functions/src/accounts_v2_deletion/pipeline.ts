import { accountsV2PurgeRequired, type AccountsV2FlagsReader } from '../accounts_v2_flags';
import {
  completeDeletionReceipt,
  isPreparedDeletionReceipt,
  prepareDeletionReceipt,
  publishPreparedDeletionReceipt,
  revokeDeletionReceipt,
  type DeletionReceiptStore,
  type DeletionRevokeResult,
  type PreparedDeletionReceipt,
} from './deletion_flow';
import {
  accountsV2PurgeMaxCommitsForBudget,
  accountsV2PurgeUidSafe,
  type AccountsV2PurgeResult,
} from './purge_core';
import type { DeletionPurgeCursor } from './receipt';

/*
 * Account V2, Пакет 6A (TG-29D525D1B798) — протокол удаления V2 внутри
 * конвейера account_delete.ts. Всё за флагом `config/accounts_v2.deletionPurgeEnabled`.
 *
 * зачем отдельным модулем: конвейер удаления — 2000 строк проверенного кода;
 * в него встают только четыре короткие точки вызова, а логика V2 живёт здесь и
 * проверяется на фейках без Firestore.
 *
 * Жизненный цикл (решения владельца 13–15, контракт выпуска Пакета 4):
 *  1. Постановка (accountDeleteEnqueue): телефон присылает ключ V2 →
 *     `prepareAccountsV2DeletionAtEnqueue` кладёт в задачу ЗАГОТОВКУ квитанции
 *     (цель запечатана ключом, секрет/операция — хэши). Квитанции ещё нет:
 *     14 дней grace человек может передумать, и ключ не должен успеть
 *     «дотолкнуть» стирание живого аккаунта.
 *  2. Точка невозврата (воркер взял созревшую задачу, пломба владельца пройдена)
 *     → `beginAccountsV2DeletionAtPointOfNoReturn` публикует квитанцию.
 *  3. Шаг конвейера `purgeAccountsV2DeletionStage` стирает accounts_v2/{uid}/**
 *     для каждой личности замыкания; бюджет — остаток таймаута функции; пауза →
 *     курсор в задачу + повторяемая ошибка (задача повторится с курсора).
 *  4. Конец конвейера → `completeAccountsV2DeletionAtEnd` ставит completed.
 *  Откат после публикации возможен в одном случае — пломба владельца на повторе
 *  задачи (claim admin выдан между попытками): `revokeAccountsV2DeletionOnRollback`.
 *  Отмена в grace (accountDeleteRestoreMine) снимает задачу вместе с заготовкой.
 *
 * Логи — префикс [ACCOUNTS-V2-DELETE], без uid, секрета и operationId.
 */

const LOG = '[ACCOUNTS-V2-DELETE]';

export const ACCOUNTS_V2_JOB_RECEIPT_FIELD = 'accountsV2DeletionReceipt';
export const ACCOUNTS_V2_JOB_CURSOR_FIELD = 'accountsV2PurgeCursor';

export interface AccountsV2DeletionJobPort {
  read(jobId: string): Promise<Readonly<Record<string, unknown>> | null>;
  merge(jobId: string, fields: Readonly<Record<string, unknown>>): Promise<void>;
}

export type AccountsV2DeletionPipelineDeps = {
  flags: AccountsV2FlagsReader;
  store: DeletionReceiptStore;
  purge: (uid: string, options: Readonly<{ cursor: DeletionPurgeCursor; maxCommits: number }>) => Promise<AccountsV2PurgeResult>;
  jobs: AccountsV2DeletionJobPort;
  nowMs: () => number;
};

type JobCursor = Readonly<{ uid: string; collection: string | null; afterDocId: string | null }>;

export type AccountsV2DeletionSession = Readonly<{
  enabled: boolean;
  jobId: string;
  jobExists: boolean;
  prepared: PreparedDeletionReceipt | null;
  published: boolean;
  cursor: JobCursor | null;
}>;

export class AccountsV2PurgeIncompleteError extends Error {
  readonly code = 'accounts_v2_purge_incomplete';

  constructor(readonly reason: 'commit_budget' | 'no_time' | 'late_writes') {
    super(`accounts_v2_purge_incomplete:${reason}`);
    this.name = 'AccountsV2PurgeIncompleteError';
  }
}

function errorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'none';
  return `name=${name} code=${code}`;
}

export type AccountsV2EnqueueOutcome = 'no_credential' | 'disabled' | 'flag_unavailable' | 'malformed' | 'prepared' | 'failed';

/**
 * Шаг 1. Никогда не бросает: сбой V2 не имеет права ломать старое удаление
 * (ключ V2 тогда просто не получит статус — решение 15, сервер доводит сам).
 */
export async function prepareAccountsV2DeletionAtEnqueue(
  deps: AccountsV2DeletionPipelineDeps,
  input: Readonly<{ jobId: string; authUid: string; credential: unknown }>,
): Promise<AccountsV2EnqueueOutcome> {
  if (input.credential === undefined || input.credential === null) return 'no_credential';
  const read = await deps.flags.read();
  if (!read.ok) {
    console.warn(`${LOG} enqueue prepare_skipped reason=flag_unavailable`);
    return 'flag_unavailable';
  }
  if (!read.flags.deletionPurgeEnabled) {
    console.log(`${LOG} enqueue prepare_skipped reason=flag_off`);
    return 'disabled';
  }
  let prepared: PreparedDeletionReceipt;
  try {
    prepared = prepareDeletionReceipt(input.authUid, input.credential, deps.nowMs());
  } catch (error) {
    console.warn(`${LOG} enqueue prepare_rejected code=malformed ${errorTag(error)}`);
    return 'malformed';
  }
  try {
    await deps.jobs.merge(input.jobId, { [ACCOUNTS_V2_JOB_RECEIPT_FIELD]: prepared });
  } catch (error) {
    console.error(`${LOG} enqueue prepare_failed ${errorTag(error)}`);
    return 'failed';
  }
  console.log(`${LOG} enqueue prepared ref=${prepared.receiptId.slice(0, 8)}`);
  return 'prepared';
}

function parseJobCursor(value: unknown): JobCursor | null {
  if (typeof value !== 'object' || value === null) return null;
  const { uid, collection, afterDocId } = value as Record<string, unknown>;
  if (typeof uid !== 'string' || !accountsV2PurgeUidSafe(uid)) return null;
  if (collection !== null && typeof collection !== 'string') return null;
  if (afterDocId !== null && typeof afterDocId !== 'string') return null;
  return Object.freeze({ uid, collection: collection as string | null, afterDocId: afterDocId as string | null });
}

const DISABLED = (jobId: string): AccountsV2DeletionSession => Object.freeze({
  enabled: false, jobId, jobExists: false, prepared: null, published: false, cursor: null,
});

/**
 * Шаг 2. Вызывать ПОСЛЕ пломбы владельца, первым шагом необратимой части.
 *
 * Ремонт №1 (ревью): стирать V2 нужно, когда данные V2 МОГЛИ появиться, а не
 * только при deletionPurgeEnabled:
 *  - флаги: deletionPurgeEnabled || syncEnabled || липкая метка everEnabled;
 *  - в задаче уже есть заготовка квитанции или курсор стирания → стираем и
 *    завершаем независимо от флагов (флаг мог выключиться между попытками);
 *  - флаг не прочитан → последнее удачное значение инстанса; его нет →
 *    стираем (ремонт №2: дешевле пары пустых чтений, чем риск оставить данные);
 *    удаление из-за флага не падает никогда.
 * Стоимость при выключенном V2: чтение флага (кэш) + одно чтение задачи.
 */
export async function beginAccountsV2DeletionAtPointOfNoReturn(
  deps: AccountsV2DeletionPipelineDeps,
  input: Readonly<{ jobId: string }>,
): Promise<AccountsV2DeletionSession> {
  const read = await deps.flags.read();
  const flags = read.ok ? read.flags : (read.lastGood ?? null);
  if (!read.ok) {
    console.error(`${LOG} pipeline flag_unavailable lastGood=${flags === null ? 'none' : 'used'}`);
  }
  const job = await deps.jobs.read(input.jobId);
  const rawPrepared = job?.[ACCOUNTS_V2_JOB_RECEIPT_FIELD];
  const prepared = isPreparedDeletionReceipt(rawPrepared) ? rawPrepared : null;
  if (rawPrepared !== undefined && rawPrepared !== null && prepared === null) {
    console.error(`${LOG} pipeline prepared_receipt_invalid -> no_receipt`);
  }
  const cursor = parseJobCursor(job?.[ACCOUNTS_V2_JOB_CURSOR_FIELD]);
  const jobState = prepared !== null || cursor !== null;
  // зачем (ремонт №2, P3): флаг неизвестен (холодный инстанс без последнего
  // удачного значения) → стираем. На пустых данных это несколько чтений, а
  // «выкл» наугад мог бы оставить данные V2 жить после удаления аккаунта.
  // Удаление при этом не падает и не ждёт флага.
  const required = flags === null || accountsV2PurgeRequired(flags);
  if (!required && !jobState) {
    console.log(`${LOG} pipeline skipped reason=flag_off`);
    return Object.freeze({ ...DISABLED(input.jobId), jobExists: job !== null });
  }
  const by = flags === null ? 'flag_unknown' : (accountsV2PurgeRequired(flags) ? 'flags' : 'job_state');
  console.log(`${LOG} pipeline enabled by=${by} sync=${String(flags?.syncEnabled ?? 'unknown')} `
    + `purge=${String(flags?.deletionPurgeEnabled ?? 'unknown')} ever=${String(flags?.everEnabled ?? 'unknown')}`);
  let published = false;
  if (prepared !== null) {
    try {
      await publishPreparedDeletionReceipt(deps.store, prepared, deps.nowMs());
      published = true;
    } catch (error) {
      // зачем: квитанция — удобство держателя ключа, не условие удаления (решение 15).
      console.error(`${LOG} pipeline publish_failed ${errorTag(error)} -> continue_without_receipt`);
    }
  }
  console.log(`${LOG} pipeline begin job=${job === null ? 'absent' : 'present'} receipt=${prepared === null ? 'none' : 'prepared'} `
    + `published=${String(published)} cursor=${cursor === null ? 'none' : 'resume'}`);
  return Object.freeze({ enabled: true, jobId: input.jobId, jobExists: job !== null, prepared, published, cursor });
}

async function pause(
  deps: AccountsV2DeletionPipelineDeps,
  session: AccountsV2DeletionSession,
  cursor: JobCursor,
  reason: AccountsV2PurgeIncompleteError['reason'],
): Promise<never> {
  if (session.jobExists) {
    try {
      await deps.jobs.merge(session.jobId, { [ACCOUNTS_V2_JOB_CURSOR_FIELD]: cursor });
    } catch (error) {
      // Повтор со старого курсора безопасен: удалённого уже нет.
      console.error(`${LOG} purge cursor_save_failed ${errorTag(error)}`);
    }
  } else {
    console.warn(`${LOG} purge cursor_not_saved reason=no_job`);
  }
  console.warn(`${LOG} purge paused reason=${reason}`);
  throw new AccountsV2PurgeIncompleteError(reason);
}

/**
 * Шаг 3. Идемпотентен: повтор с курсора или с нуля не находит уже стёртого.
 * deadlineMs — момент, к которому шаг обязан отдать управление (таймаут функции
 * минус запас на завершение конвейера).
 */
export async function purgeAccountsV2DeletionStage(
  deps: AccountsV2DeletionPipelineDeps,
  session: AccountsV2DeletionSession,
  input: Readonly<{ uids: readonly string[]; deadlineMs: number }>,
): Promise<Readonly<{ skipped: boolean; deletedDocs: number }>> {
  if (!session.enabled) {
    console.log(`${LOG} purge skipped reason=flag_off`);
    return Object.freeze({ skipped: true, deletedDocs: 0 });
  }
  const unique = [...new Set(input.uids)];
  const uids = unique.filter((uid) => accountsV2PurgeUidSafe(uid));
  if (uids.length !== unique.length) {
    // uid, непригодный для пути, не может владеть accounts_v2/{uid} — нечего стирать.
    console.warn(`${LOG} purge unsafe_uids=${unique.length - uids.length} skipped`);
  }
  const resumeIndex = session.cursor === null ? -1 : uids.indexOf(session.cursor.uid);
  const startIndex = Math.max(0, resumeIndex);
  let deletedDocs = 0;
  for (let index = startIndex; index < uids.length; index += 1) {
    const uid = uids[index];
    const resume = index === resumeIndex && session.cursor !== null && session.cursor.collection !== null
      ? Object.freeze({ collection: session.cursor.collection, afterDocId: session.cursor.afterDocId })
      : null;
    const maxCommits = accountsV2PurgeMaxCommitsForBudget(input.deadlineMs - deps.nowMs());
    if (maxCommits === 0) {
      return pause(deps, session, { uid, collection: resume?.collection ?? null, afterDocId: resume?.afterDocId ?? null }, 'no_time');
    }
    const result = await deps.purge(uid, { cursor: resume, maxCommits });
    deletedDocs += result.deletedDocs;
    console.log(`${LOG} purge identity=${index} done=${String(result.done)} deleted=${result.deletedDocs} maxCommits=${maxCommits}`);
    if (!result.done) {
      const next = result.cursor;
      return pause(
        deps, session,
        { uid, collection: next?.collection ?? null, afterDocId: next?.afterDocId ?? null },
        next === null ? 'late_writes' : 'commit_budget',
      );
    }
  }
  if (session.cursor !== null && session.jobExists) {
    try {
      await deps.jobs.merge(session.jobId, { [ACCOUNTS_V2_JOB_CURSOR_FIELD]: null });
    } catch (error) {
      // Устаревший курсор безопасен: повтор просто пройдёт пустые коллекции.
      console.warn(`${LOG} purge cursor_clear_failed ${errorTag(error)}`);
    }
  }
  console.log(`${LOG} purge finished identities=${uids.length} deleted=${deletedDocs}`);
  return Object.freeze({ skipped: false, deletedDocs });
}

/** Шаг 4. Не бросает: к этому моменту данные уже стёрты, квитанцию дочистит TTL. */
export async function completeAccountsV2DeletionAtEnd(
  deps: AccountsV2DeletionPipelineDeps,
  session: AccountsV2DeletionSession,
): Promise<'skipped' | 'completed' | 'absent' | 'failed'> {
  if (!session.enabled || session.prepared === null) {
    console.log(`${LOG} complete skipped reason=${session.enabled ? 'no_receipt' : 'flag_off'}`);
    return 'skipped';
  }
  try {
    const result = await completeDeletionReceipt(deps.store, session.prepared.receiptId, deps.nowMs());
    return result === 'absent' ? 'absent' : 'completed';
  } catch (error) {
    console.error(`${LOG} complete_failed ${errorTag(error)}`);
    return 'failed';
  }
}

/**
 * Откат после точки невозврата (пломба владельца на повторе задачи). Флаг не
 * проверяется: заготовка в задаче есть только если флаг был включён, а
 * опубликованная квитанция обязана исчезнуть даже после выключения флага.
 */
export async function revokeAccountsV2DeletionOnRollback(
  deps: AccountsV2DeletionPipelineDeps,
  input: Readonly<{ jobId: string }>,
): Promise<DeletionRevokeResult | 'none' | 'failed'> {
  try {
    const job = await deps.jobs.read(input.jobId);
    const prepared = job?.[ACCOUNTS_V2_JOB_RECEIPT_FIELD];
    if (!isPreparedDeletionReceipt(prepared)) {
      console.log(`${LOG} rollback revoke=none reason=no_prepared_receipt`);
      return 'none';
    }
    return await revokeDeletionReceipt(deps.store, prepared.receiptId);
  } catch (error) {
    console.error(`${LOG} rollback revoke_failed ${errorTag(error)}`);
    return 'failed';
  }
}
