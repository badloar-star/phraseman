import {
  ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES,
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
  ACCOUNTS_V2_REJECT_CODES,
  AccountsV2ApplyError,
  accountsV2JsonWireBytes,
  entityIdString,
  safeInteger,
  type AccountsV2EntityRecord,
  type AccountsV2EntityType,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2RejectCode,
  type AccountsV2StoredReceipt,
  type JsonObject,
  type JsonValue,
} from './accounts_v2_contract';
import {
  canonicalJson,
  hasExactKeys,
  isJsonObject,
  isSrsField,
  lessonResult,
  ownKeysOf,
  srsUpdatedAt,
} from './accounts_v2_merge';

/*
 * Account V2, Пакет 3S — кодек записей порта: запись и чтение (fail closed).
 *
 * зачем (ремонт №2, SPEC P1 + SEC P1-1/P1-2/P2): пользовательская структура
 * хранится ТОЛЬКО канонической JSON-строкой. Firestore не видит ни вложенных
 * массивов (варианты карточки-списка), ни глубины, ни имён полей `''`/`__x__`/
 * > 1500 байт, ни тысяч индексных записей, ни одиночных суррогатов —
 * JSON.stringify их экранирует. Все пользовательские строки записи
 * (entityId, operationId) тоже лежат JSON-строками, и идентичность сверяется
 * по РАСПАРСЕННОМУ значению.
 * JSON.parse создаёт свойства через CreateDataProperty: ключ `__proto__`
 * становится обычным своим полем, прототип не подменяется.
 */

function corrupt(): never {
  throw new AccountsV2ApplyError('stored_state_corrupt');
}

/** Пользовательская строка → JSON-строка для записи (одиночные суррогаты экранированы). */
export function encodeText(value: string): string {
  return JSON.stringify(value);
}

function decodeText(raw: unknown): string {
  if (typeof raw !== 'string') return corrupt();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Порча хранилища — это stored_state_corrupt; текст ошибки не логируем (может нести данные).
    console.warn('[ACCOUNTS-V2-CORE] stored id JSON unparseable');
    return corrupt();
  }
  return typeof parsed === 'string' ? parsed : corrupt();
}

/**
 * Каноническая строка состояния для записи. Вызывается ОДИН раз на сущность —
 * для итогового состояния после всего пакета (ремонт №3, P3).
 */
export function encodeState(state: JsonValue): string {
  return canonicalJson(state);
}

/**
 * Размер `stateJson` по формуле Firestore (байты UTF-8 + 1) БЕЗ построения
 * строки. зачем: предел проверяется после каждой операции пакета, а строить
 * канонический JSON всего состояния на каждой — лишняя работа. Длина
 * канонического JSON не зависит от порядка ключей, а wire-байты — ровно
 * Buffer.byteLength(JSON.stringify()) (сверяют тесты).
 */
export function stateFirestoreBytes(state: JsonValue): number {
  return accountsV2JsonWireBytes(state) + 1;
}

export function stateFits(state: JsonValue): boolean {
  return stateFirestoreBytes(state) <= ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES;
}

function plainRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>> : null;
}

function hasSameKeys(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((key) => expected.includes(key));
}

/** Ревизия внутри состояния: целое 1..ревизии сущности (из будущего — порча). */
function storedRevision(value: JsonValue | undefined, entityRevision: number): boolean {
  return safeInteger(value) && value >= 1 && value <= entityRevision;
}

/** Пары `[id, ревизия]` библиотеки: id по правилу клиента, ревизия 1..ревизии сущности, без повторов. */
function checkLibraryEntries(raw: JsonValue | undefined, entityRevision: number, seen: Set<string>): void {
  if (!Array.isArray(raw)) corrupt();
  for (const entry of raw as readonly JsonValue[]) {
    if (!Array.isArray(entry) || entry.length !== 2 || !entityIdString(entry[0])
      || !storedRevision(entry[1], entityRevision) || seen.has(entry[0])) corrupt();
    seen.add(entry[0] as string);
  }
}

/**
 * Библиотека (ремонт №4): `{ items: [[id, ревизия добавления]], removed:
 * [[id, ревизия удаления]] }`; id не бывает и живым, и удалённым; tombstone не
 * больше предела (сборка мусора его держит).
 */
function checkLibraryShape(state: JsonObject, entityRevision: number): void {
  if (!hasExactKeys(state, ['items', 'removed'])) corrupt();
  const seen = new Set<string>();
  checkLibraryEntries(state.items, entityRevision, seen);
  checkLibraryEntries(state.removed, entityRevision, seen);
  if ((state.removed as readonly JsonValue[]).length > ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES) corrupt();
}

function checkFlashcardField(name: string, field: JsonValue, entityRevision: number): void {
  if (!isJsonObject(field) || !storedRevision(field.revision, entityRevision) || !Array.isArray(field.variants)) {
    corrupt();
  }
  if (!isSrsField(name)) {
    if (!hasExactKeys(field, ['value', 'revision', 'variants'])) corrupt();
    return;
  }
  // SRS-поле (LWW, ремонт №4): отметка [updatedAtMs, база, clientSequence], время
  // равно `updatedAtMs` значения, база ≤ ревизии сущности, вариантов нет.
  const stamp = field.stamp;
  if (!hasExactKeys(field, ['value', 'revision', 'variants', 'stamp']) || field.variants.length !== 0
    || !Array.isArray(stamp) || stamp.length !== 3 || !stamp.every(safeInteger)
    || (stamp[1] as number) > entityRevision || srsUpdatedAt(field.value) !== stamp[0]) corrupt();
}

function checkStateShape(entityType: AccountsV2EntityType, state: JsonValue, entityRevision: number): JsonValue {
  if (!isJsonObject(state)) return corrupt();
  if (entityType === 'lesson_progress') {
    if (!hasExactKeys(state, ['best']) || lessonResult(state.best) === null) corrupt();
    return state;
  }
  if (entityType === 'library_membership') {
    checkLibraryShape(state, entityRevision);
    return state;
  }
  const fields = state.fields;
  if (!hasExactKeys(state, ['deleted', 'fields']) || typeof state.deleted !== 'boolean' || !isJsonObject(fields)) {
    corrupt();
  }
  for (const key of ownKeysOf(fields)) checkFlashcardField(key, fields[key], entityRevision);
  return state;
}

function decodeState(entityType: AccountsV2EntityType, raw: unknown, entityRevision: number): JsonValue {
  if (typeof raw !== 'string') return corrupt();
  let parsed: JsonValue;
  try {
    parsed = JSON.parse(raw) as JsonValue;
  } catch {
    // Непарсящийся stateJson — порча хранилища; текст ошибки не логируем.
    console.warn('[ACCOUNTS-V2-CORE] stored stateJson unparseable');
    return corrupt();
  }
  return checkStateShape(entityType, parsed, entityRevision);
}

export type LoadedEntity = Readonly<{ revision: number; state: JsonValue }>;

const ENTITY_RECORD_KEYS: readonly string[] = [
  'entityType', 'entityIdJson', 'revision', 'updatedAtMs', 'lastOperationIdJson', 'stateJson',
];

/**
 * Проверяет запись сущности целиком и возвращает распарсенное состояние.
 * Порт вернул не объект (undefined, число, строку), чужую сущность, старый
 * формат или битый JSON — это порча хранилища, а не TypeError посреди
 * транзакции. Отказ типизирован и откатывает пакет.
 */
export function loadEntityRecord(
  raw: unknown,
  entityType: AccountsV2EntityType,
  entityId: string,
): LoadedEntity | null {
  if (raw === null) return null;
  const record = plainRecord(raw);
  if (record === null || !hasSameKeys(Object.keys(record), ENTITY_RECORD_KEYS)) return corrupt();
  // зачем (P3): ревизия читается из записи ОДИН раз — проверка и использование
  // видят одно и то же значение (запись может оказаться геттером/прокси).
  const revision: unknown = record.revision;
  if (record.entityType !== entityType || !safeInteger(revision) || revision === 0
    || !safeInteger(record.updatedAtMs)) return corrupt();
  if (decodeText(record.entityIdJson) !== entityId) corrupt();
  decodeText(record.lastOperationIdJson);
  return { revision, state: decodeState(entityType, record.stateJson, revision) };
}

export function buildEntityRecord(
  entityType: AccountsV2EntityType,
  entityId: string,
  revision: number,
  nowMs: number,
  operationId: string,
  stateJson: string,
): AccountsV2EntityRecord {
  return {
    entityType, entityIdJson: encodeText(entityId), revision, updatedAtMs: nowMs,
    lastOperationIdJson: encodeText(operationId), stateJson,
  };
}

const OP_RECORD_KEYS: readonly string[] = ['operationIdJson', 'fingerprint', 'receipt', 'recordedAtMs'];
const STORED_RECEIPT_KEYS: readonly string[] = ['outcome', 'serverRevision'];
const STORED_REJECTED_KEYS: readonly string[] = ['outcome', 'code', 'serverRevision'];
const FINGERPRINT_HEX = /^[0-9a-f]{64}$/;

/** Сохранённая квитанция проверяется целиком и отдаётся НОВЫМ объектом ровно известной формы. */
function checkStoredReceipt(raw: unknown, operationId: string): AccountsV2Receipt {
  const receipt = plainRecord(raw);
  if (receipt === null || !safeInteger(receipt.serverRevision)) corrupt();
  const { outcome, serverRevision } = receipt;
  const keys = Object.keys(receipt);
  if (outcome === 'rejected') {
    const code = receipt.code;
    if (!hasSameKeys(keys, STORED_REJECTED_KEYS) || typeof code !== 'string'
      || !(ACCOUNTS_V2_REJECT_CODES as readonly string[]).includes(code)) corrupt();
    return { operationId, outcome, code: code as AccountsV2RejectCode, serverRevision: serverRevision as number };
  }
  if ((outcome !== 'applied' && outcome !== 'duplicate' && outcome !== 'conflict')
    || !hasSameKeys(keys, STORED_RECEIPT_KEYS)) corrupt();
  return { operationId, outcome, serverRevision: serverRevision as number };
}

export type LoadedOp = Readonly<{ fingerprint: string; receipt: AccountsV2Receipt }>;

export function loadOpRecord(raw: unknown, operationId: string): LoadedOp | null {
  if (raw === null) return null;
  const record = plainRecord(raw);
  if (record === null || !hasSameKeys(Object.keys(record), OP_RECORD_KEYS)
    || typeof record.fingerprint !== 'string' || !FINGERPRINT_HEX.test(record.fingerprint)
    || !safeInteger(record.recordedAtMs)) corrupt();
  if (decodeText(record.operationIdJson) !== operationId) corrupt();
  return { fingerprint: record.fingerprint as string, receipt: checkStoredReceipt(record.receipt, operationId) };
}

export function buildOpRecord(
  operationId: string,
  fingerprint: string,
  receipt: AccountsV2Receipt,
  nowMs: number,
): AccountsV2OpRecord {
  const stored: AccountsV2StoredReceipt = receipt.outcome === 'rejected'
    ? { outcome: 'rejected', code: receipt.code, serverRevision: receipt.serverRevision }
    : { outcome: receipt.outcome, serverRevision: receipt.serverRevision };
  return { operationIdJson: encodeText(operationId), fingerprint, receipt: stored, recordedAtMs: nowMs };
}
