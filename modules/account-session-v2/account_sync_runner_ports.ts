import type { SessionFence } from './account_session';
import {
  ACCOUNT_SYNC_REJECT_CODES,
  AccountSyncInvariantError,
  type AccountSyncBatch,
  type AccountSyncEffect,
} from './account_sync';
import { errorKind, type AccountSyncDispatchState } from './account_sync_outbox_records';

const LOG = '[ACCOUNTS-V2-CLIENT]';

/*
 * Account V2 — порты раннера синхронизации и чтение недоверенных ответов портов.
 * зачем: вынесено из account_sync_runner.ts без изменения логики (правило ≤ 800
 * строк на файл) при ремонте №1 (TG-7CD73967EF61), когда раннер получил порты
 * учёта отправки на диске и диагностику `sync_receipt_invalid`.
 */

type LoadEffect = Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }>;
type DispatchEffect = Extract<AccountSyncEffect, { type: 'DISPATCH_OUTBOX_BATCH' }>;
type AckEffect = Extract<AccountSyncEffect, { type: 'COMMIT_OUTBOX_ACKS' }>;
type QuarantineEffect = Extract<AccountSyncEffect, { type: 'QUARANTINE_OUTBOX_BATCH' }>;

export type AccountSyncRunnerPorts = Readonly<{
  load(effect: LoadEffect): unknown;
  /**
   * Отправка пакета (callable). Бросает ошибку транспорта как есть (FirebaseError:
   * `code`, `details`) — решение по ней принимает раннер (TEMP-контракт сервера).
   * Успех: `{ outcome: 'accepted', receipts, serverNowMs? }`.
   * На callable уходит `outbox.wireBatch(effect)` (TG-DFA918464DFA): операции с
   * `enqueuedAtServerMs`, иначе сервер отклонит пакет целиком (missing_field).
   */
  dispatch(effect: DispatchEffect): unknown;
  /**
   * Resolves only after a transaction has matched the effect's exact owner, full fence,
   * envelopes and receipts, persisted those receipts, and deleted only those outbox rows.
   * The runner consumes that assertion; it does not prove native durability or atomicity.
   */
  ackCommit(effect: AckEffect): unknown;
  /**
   * Перенос пакета в карантин outbox (`{ quarantinedOperationIds,
   * remainingPendingCountObserved }`). Без этого порта окончательный отказ
   * блокирует пакет (fail-closed), а не отправляет его снова.
   */
  quarantine?(effect: QuarantineEffect): unknown;
  /**
   * Учёт отправки на диске (outbox.readDispatchState / writeDispatchState) —
   * только парой. зачем (TG-7CD73967EF61, P1): без него перезапуск обнулял
   * счётчик неудач, время первой неудачи, паузу и смещение часов сервера.
   */
  readDispatchState?(expectedFence: SessionFence): unknown;
  writeDispatchState?(expectedFence: SessionFence, state: AccountSyncDispatchState): unknown;
}>;

export type CapturedRecord = ReadonlyMap<string, unknown>;
export type PortSettlement =
  | Readonly<{ kind: 'fulfilled'; value: unknown }>
  | Readonly<{ kind: 'rejected'; error: unknown }>
  | Readonly<{ kind: 'invalidated' }>;

const REQUIRED_PORTS = Object.freeze(['load', 'dispatch', 'ackCommit']);
const OPTIONAL_PORTS = Object.freeze(['quarantine', 'readDispatchState', 'writeDispatchState']);
const KNOWN_OUTCOMES: readonly unknown[] = Object.freeze(['applied', 'duplicate', 'conflict', 'rejected']);

export function invalidInput(): never {
  throw new AccountSyncInvariantError('account_sync_invalid_input');
}

export function captureExactRecord(value: unknown, exactKeys: readonly string[]): CapturedRecord | null {
  try {
    if (typeof value !== 'object' || value === null) return null;
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== exactKeys.length
      || keys.some((key) => typeof key !== 'string' || !exactKeys.includes(key))) return null;
    const captured = new Map<string, unknown>();
    for (const key of keys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)
        || descriptor.get !== undefined || descriptor.set !== undefined) return null;
      captured.set(key as string, descriptor.value);
    }
    return captured;
  } catch (error) {
    // Ловушка Proxy при чтении ответа = ответ непригоден; вызывающий уходит в malformed-ветку.
    console.warn(`${LOG} runner_response_unreadable`, `error=${errorKind(error)}`);
    return null;
  }
}

export function capturedValue(record: CapturedRecord, key: string): unknown {
  return record.get(key);
}

function portKeys(value: unknown): readonly string[] | null {
  try {
    if (typeof value !== 'object' || value === null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== 'string'
      || (!REQUIRED_PORTS.includes(key) && !OPTIONAL_PORTS.includes(key)))) return null;
    return REQUIRED_PORTS.every((key) => keys.includes(key)) ? keys as string[] : null;
  } catch (error) {
    // Ловушка Proxy при перечислении портов = порты непригодны.
    console.warn(`${LOG} runner_ports_unreadable`, `error=${errorKind(error)}`);
    return null;
  }
}

export function capturePorts(value: unknown): AccountSyncRunnerPorts {
  const keys = portKeys(value);
  const captured = keys === null ? null : captureExactRecord(value, keys);
  if (captured === null) return invalidInput();
  const ports = new Map([...REQUIRED_PORTS, ...OPTIONAL_PORTS].map((key) => [key, capturedValue(captured, key)] as const));
  if (REQUIRED_PORTS.some((key) => typeof ports.get(key) !== 'function')
    || OPTIONAL_PORTS.some((key) => ports.get(key) !== undefined && typeof ports.get(key) !== 'function')
    || (ports.get('readDispatchState') === undefined) !== (ports.get('writeDispatchState') === undefined)) {
    return invalidInput();
  }
  return Object.freeze(Object.fromEntries(
    [...ports.entries()].filter(([, port]) => port !== undefined),
  ) as unknown as AccountSyncRunnerPorts);
}

/** Почему квитанции не прошли проверку — только машинный код, без содержимого. */
export function receiptInvalidReason(raw: unknown, batch: AccountSyncBatch): string {
  try {
    if (!Array.isArray(raw)) return 'receipts_not_array';
    const rows = raw as readonly unknown[];
    if (rows.length !== batch.operations.length) return 'receipts_count_mismatch';
    const expected = new Set(batch.operations.map(({ operation }) => operation.operationId));
    const seen = new Set<unknown>();
    for (const row of rows) {
      const record = captureExactRecord(row, ['operationId', 'outcome', 'serverRevision'])
        ?? captureExactRecord(row, ['operationId', 'outcome', 'code', 'serverRevision']);
      if (record === null) return 'receipt_shape';
      const outcome = capturedValue(record, 'outcome');
      if (!KNOWN_OUTCOMES.includes(outcome)) return 'receipt_outcome_unknown';
      if (record.has('code') !== (outcome === 'rejected')) return 'receipt_shape';
      if (outcome === 'rejected'
        && !(ACCOUNT_SYNC_REJECT_CODES as readonly unknown[]).includes(capturedValue(record, 'code'))) {
        return 'receipt_code_unknown';
      }
      const operationId = capturedValue(record, 'operationId');
      if (typeof operationId !== 'string' || !expected.has(operationId)) return 'receipt_operation_unknown';
      if (seen.has(operationId)) return 'receipt_duplicate';
      seen.add(operationId);
      const revision = capturedValue(record, 'serverRevision');
      if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) {
        return 'receipt_revision_invalid';
      }
    }
    return 'receipt_other';
  } catch (error) {
    // Ловушка Proxy при диагностике — причина неизвестна, но сам отказ уже решён.
    console.warn(`${LOG} receipt_diagnosis_unreadable`, `error=${errorKind(error)}`);
    return 'receipts_unreadable';
  }
}

export function observePort(
  invoke: () => unknown,
  invalidated: Promise<void>,
): Promise<PortSettlement> {
  let returned: unknown;
  try {
    returned = invoke();
  } catch (error) {
    return Promise.resolve(Object.freeze({ kind: 'rejected' as const, error }));
  }
  const ownedObservation = new Promise<unknown>((resolve, reject) => {
    try {
      resolve(returned);
    } catch (error) {
      reject(error);
    }
  });
  const settled = ownedObservation.then<PortSettlement, PortSettlement>(
    (value) => Object.freeze({ kind: 'fulfilled' as const, value }),
    (error: unknown) => Object.freeze({ kind: 'rejected' as const, error }),
  );
  return Promise.race([
    settled,
    invalidated.then<PortSettlement>(() => Object.freeze({ kind: 'invalidated' as const })),
  ]);
}
