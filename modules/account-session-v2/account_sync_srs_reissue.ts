import {
  ACCOUNT_SYNC_LIMITS,
  AccountSyncInvariantError,
  type AccountSyncOwnedOperation,
  type AccountSyncServerReceipt,
} from './account_sync';
import { accountSyncFnv1aHex } from './account_sync_batching';
import { accountSyncHybridSrsUpdatedAtMs } from './account_sync_clock';
import { stringWireBytes } from './account_sync_outbox_records';

/*
 * Account V2 (TG-831C22D22486) — перевыпуск операции карточки после
 * `rejected srs_time_in_future` (TEMP-контракт сервера (г)).
 *
 * зачем: сервер отклоняет ВСЮ операцию, если время SRS-поля дальше 10 минут в
 * будущем. Повтор той же операции получит тот же отказ (квитанция окончательная),
 * поэтому клиент выпускает НОВЫЕ операции: SRS — отдельной операцией с исправленным
 * гибридным временем, остальные поля — своей, чтобы не потерять правку пользователя.
 * baseRevision НЕ меняется: устройство не видело ничего нового (контракт (а)).
 *
 * Ремонт №1 (TG-7CD73967EF61, P2):
 *  - id новых операций ДЕТЕРМИНИРОВАНЫ: `${id}:rest` / `${id}:srs`. Крах между
 *    постановкой замены и отметкой «разрешено» даёт при повторе тот же id —
 *    outbox отвечает duplicate, а не ставит вторую копию;
 *  - новые операции встают в КОНЕЦ очереди, то есть после более поздних правок
 *    той же карточки. Поле, которое такая правка уже переписала, из перевыпуска
 *    выкидывается — иначе старое значение затёрло бы новое. Более поздний
 *    tombstone — перевыпускать нечего.
 * Функция чистая: clientSequence выдаёт вызывающий, поставить в outbox — тоже он
 * (outbox.markResolved делает это атомарно с отметкой квитанции).
 */

export const ACCOUNT_SYNC_SRS_FIELDS = Object.freeze(['srs', 'srsPolicy'] as const);
export type AccountSyncSrsField = typeof ACCOUNT_SYNC_SRS_FIELDS[number];

export type AccountSyncSrsReissueInput = Readonly<{
  rejected: AccountSyncOwnedOperation;
  receipt: AccountSyncServerReceipt;
  localNowMs: number;
  serverOffsetMs: number;
  /** updatedAtMs подтверждённого сервером SRS-значения (по полю); нет или null — не видел. */
  seenSrsUpdatedAtMs: Readonly<Partial<Record<AccountSyncSrsField, number | null>>>;
  /** Ожидающие операции ЭТОЙ ЖЕ карточки, поставленные в outbox позже отклонённой. */
  laterOperations: readonly AccountSyncOwnedOperation[];
  /** clientSequence первой новой операции; вторая получает следующий номер. */
  nextClientSequence: number;
}>;

type PlainRecord = Readonly<Record<string, unknown>>;

const REISSUE_HASH_SUFFIX_BYTES = ':h'.length + 8 + ':rest'.length + 1;

function invalid(): never {
  throw new AccountSyncInvariantError('account_sync_invalid_input');
}

function plainRecord(value: unknown): value is PlainRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function idBytes(value: string): number {
  return stringWireBytes(value) - 2;
}

/**
 * Детерминированные id перевыпуска. Если `${id}:rest` не влезает в лимит id,
 * id укорачивается по кодовым точкам и получает хэш полного id — так же
 * детерминированно и без склейки разных исходных id.
 */
export function accountSyncReissueOperationIds(operationId: string): Readonly<{ srs: string; rest: string }> {
  if (typeof operationId !== 'string' || operationId.length === 0) return invalid();
  const limit = ACCOUNT_SYNC_LIMITS.maxOperationIdUtf8Bytes;
  if (idBytes(`${operationId}:rest`) <= limit) {
    return Object.freeze({ srs: `${operationId}:srs`, rest: `${operationId}:rest` });
  }
  let prefix = '';
  for (const point of operationId) {
    if (idBytes(prefix + point) > limit - REISSUE_HASH_SUFFIX_BYTES) break;
    prefix += point;
  }
  const stem = `${prefix}:h${accountSyncFnv1aHex(operationId)}`;
  return Object.freeze({ srs: `${stem}:srs`, rest: `${stem}:rest` });
}

function ownEntries(record: PlainRecord): readonly (readonly [string, unknown])[] {
  return Object.keys(record).map((key) => {
    const descriptor = Reflect.getOwnPropertyDescriptor(record, key);
    if (descriptor === undefined || !('value' in descriptor)) return invalid();
    return [key, descriptor.value] as const;
  });
}

function upsertFields(rejected: AccountSyncOwnedOperation, allowUnset = false): PlainRecord {
  const payload = rejected.operation.payload;
  if (!plainRecord(payload)) return invalid();
  // зачем (Пакет 7A): у более поздних операций допустим третий ключ `unsetFields`;
  // у отклонённой (SRS) — нет: производитель не смешивает SRS со снятием полей.
  const keys = Object.keys(payload).filter((key) => !(allowUnset && key === 'unsetFields')).sort();
  if (keys.length !== 2 || keys[0] !== 'fields' || keys[1] !== 'op' || payload.op !== 'upsert') return invalid();
  const fields = payload.fields;
  if (!plainRecord(fields)) return invalid();
  return fields;
}

/**
 * Пакет 7A: имена, снятые более поздней операцией (`{ op, fields, unsetFields }`).
 * Возвращает [] для операции без снятия; форма снятия проверяет сервер.
 */
function laterUnsetNames(later: AccountSyncOwnedOperation): readonly string[] {
  const payload = later.operation.payload;
  if (!plainRecord(payload) || !Object.prototype.hasOwnProperty.call(payload, 'unsetFields')) return [];
  const names = payload.unsetFields;
  if (!Array.isArray(names) || !names.every((name) => typeof name === 'string')) return invalid();
  return names as readonly string[];
}

/** Поля, переписанные более поздними операциями карточки; null — карточку позже удалили. */
function overwrittenByLater(
  rejected: AccountSyncOwnedOperation,
  laterOperations: readonly AccountSyncOwnedOperation[],
): ReadonlySet<string> | null {
  if (!Array.isArray(laterOperations)) return invalid();
  const overwritten = new Set<string>();
  for (const later of laterOperations) {
    const { operation } = later;
    if (later.ownerUid !== rejected.ownerUid || operation.entityType !== rejected.operation.entityType
      || operation.entityId !== rejected.operation.entityId
      || operation.operationId === rejected.operation.operationId) return invalid();
    const payload = operation.payload;
    if (plainRecord(payload) && payload.op === 'tombstone' && Object.keys(payload).length === 1) return null;
    // зачем (Пакет 7A): более поздняя операция могла СНЯТЬ поле (`unsetFields`) —
    // перевыпуск старого значения после неё воскресил бы удалённое поле.
    laterUnsetNames(later).forEach((name) => overwritten.add(name));
    Object.keys(upsertFields(later, true)).forEach((name) => overwritten.add(name));
  }
  return overwritten;
}

function newOperation(
  source: AccountSyncOwnedOperation,
  operationId: string,
  clientSequence: number,
  fields: PlainRecord,
): AccountSyncOwnedOperation {
  const operation = source.operation;
  return Object.freeze({
    ownerUid: source.ownerUid,
    operation: Object.freeze({
      schemaVersion: 1 as const,
      operationId,
      entityType: operation.entityType,
      entityId: operation.entityId,
      clientSequence,
      baseRevision: operation.baseRevision,
      payload: Object.freeze({ op: 'upsert', fields: Object.freeze(fields) }),
    }),
  });
}

/** Новые операции вместо отклонённой: [остальные поля?, SRS?]. Бросает на любой неподходящий вход. */
export function planAccountSyncSrsReissue(input: AccountSyncSrsReissueInput): readonly AccountSyncOwnedOperation[] {
  const { rejected, receipt, nextClientSequence } = input;
  if (receipt.outcome !== 'rejected' || receipt.code !== 'srs_time_in_future'
    || receipt.operationId !== rejected.operation.operationId
    || rejected.operation.entityType !== 'flashcard') return invalid();
  if (!Number.isSafeInteger(nextClientSequence) || nextClientSequence < 0
    || !Number.isSafeInteger(nextClientSequence + 1)) return invalid();
  const ids = accountSyncReissueOperationIds(rejected.operation.operationId);
  const overwritten = overwrittenByLater(rejected, input.laterOperations);
  const rest: Record<string, unknown> = {};
  const srs: Record<string, unknown> = {};
  let srsFields = 0;
  let dropped = 0;
  for (const [name, value] of ownEntries(upsertFields(rejected))) {
    const isSrs = (ACCOUNT_SYNC_SRS_FIELDS as readonly string[]).includes(name);
    if (isSrs) {
      srsFields += 1;
      if (!plainRecord(value)) return invalid();
    }
    if (overwritten === null || overwritten.has(name)) {
      dropped += 1;
      continue;
    }
    if (!isSrs) {
      Object.defineProperty(rest, name, { value, enumerable: true, writable: true, configurable: true });
      continue;
    }
    const seen = input.seenSrsUpdatedAtMs[name as AccountSyncSrsField] ?? null;
    const updatedAtMs = accountSyncHybridSrsUpdatedAtMs({
      localNowMs: input.localNowMs, serverOffsetMs: input.serverOffsetMs, seenUpdatedAtMs: seen,
    });
    srs[name] = Object.freeze({ ...(value as PlainRecord), updatedAtMs });
  }
  if (srsFields === 0) return invalid();
  const planned: AccountSyncOwnedOperation[] = [];
  if (Object.keys(rest).length > 0) planned.push(newOperation(rejected, ids.rest, nextClientSequence, rest));
  if (Object.keys(srs).length > 0) {
    planned.push(newOperation(rejected, ids.srs, nextClientSequence + planned.length, srs));
  }
  console.warn('[ACCOUNTS-V2-CLIENT] srs_reissue_planned',
    `operations=${planned.length}`, `restFields=${Object.keys(rest).length}`,
    `droppedByLater=${dropped}`, `laterTombstone=${overwritten === null}`);
  return Object.freeze(planned);
}
