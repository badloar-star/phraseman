import {
  ACCOUNTS_V2_BATCH_KEYS,
  ACCOUNTS_V2_CLIENT_OPERATION_KEYS,
  ACCOUNTS_V2_ENTITY_TYPES,
  ACCOUNTS_V2_ENVELOPE_KEYS,
  ACCOUNTS_V2_LIMITS,
  ACCOUNTS_V2_OPERATION_MAX_AGE_MS,
  ACCOUNTS_V2_OPERATION_MAX_FUTURE_SKEW_MS,
  ACCOUNTS_V2_OWNED_OPERATION_KEYS,
  ACCOUNTS_V2_SCHEMA_VERSION,
  accountsV2JsonWireBytes,
  deepFreeze,
  defineData,
  entityIdString,
  identityString,
  numberWireBytes,
  objectBaseWireBytes,
  safeInteger,
  stringWireBytes,
  type AccountsV2Batch,
  type AccountsV2ClientOperation,
  type AccountsV2EntityType,
  type AccountsV2Envelope,
  type AccountsV2OwnedOperation,
  type AccountsV2RejectCode,
  type AccountsV2ValidationCode,
  type JsonValue,
  type ValidatedBatch,
} from './accounts_v2_contract';

/*
 * Account V2, Пакет 3S — строгая проверка входа (схема v1, лимиты клиента).
 *
 * зачем (ремонт №2, SEC P1-1): сервер НЕ строже клиента к строкам. id и ключи
 * принимаются по правилам клиента (identityString / entityIdString, любой
 * строковый ключ payload): в Firestore они попадают только хэшем (ключ
 * документа) или внутри JSON-строки, поэтому одиночные суррогаты и
 * управляющие символы хранилищу не страшны. Иначе одна «кривая» операция
 * навсегда блокировала бы клиентскую очередь.
 */

const ISSUED_BATCHES = new WeakSet<object>();

/** Выдан ли этот объект validateBatch (рантайм-половина бренда ValidatedBatch). */
export function isIssuedBatch(batch: unknown): boolean {
  return typeof batch === 'object' && batch !== null && ISSUED_BATCHES.has(batch);
}

export type AccountsV2ValidateResult =
  | Readonly<{ ok: true; batch: ValidatedBatch }>
  | Readonly<{ ok: false; code: AccountsV2ValidationCode; path: string }>;

export type AccountsV2CallerResult =
  | Readonly<{ ok: true; uid: string }>
  | Readonly<{ ok: false; code: 'unauthenticated' | 'uid_mismatch' }>;

/**
 * UID берётся ТОЛЬКО из auth. UID из payload полномочий не даёт: он обязан
 * отсутствовать (undefined) или совпадать побайтно; null и любое иное — отказ.
 */
export function resolveCallerUid(
  auth: Readonly<{ uid?: string }> | null | undefined,
  payloadUid?: unknown,
): AccountsV2CallerResult {
  const uid: unknown = typeof auth === 'object' && auth !== null ? auth.uid : undefined;
  if (!identityString(uid)) return Object.freeze({ ok: false, code: 'unauthenticated' });
  if (payloadUid !== undefined && payloadUid !== uid) {
    return Object.freeze({ ok: false, code: 'uid_mismatch' });
  }
  return Object.freeze({ ok: true, uid });
}

class Invalid extends Error {
  constructor(readonly code: AccountsV2ValidationCode, readonly path: string) {
    super(code);
  }
}

function fail(code: AccountsV2ValidationCode, path: string): never {
  throw new Invalid(code, path);
}

const MAX_PATH_KEY_CODE_POINTS = 64;

function keyPath(path: string, key: string): string {
  // зачем: путь уходит клиенту; огромный ключ (любой формы, включая
  // «идентификатор» из 5000 букв) не должен раздувать ответ.
  const head = Array.from(key.slice(0, MAX_PATH_KEY_CODE_POINTS * 2)).slice(0, MAX_PATH_KEY_CODE_POINTS).join('');
  if (head.length < key.length) return `${path}[${JSON.stringify(`${head}…`)}]`;
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return `${path}.${key}`;
  return `${path}[${JSON.stringify(key)}]`;
}

function dataEntries(value: unknown, path: string): readonly (readonly [string, unknown])[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('not_plain_object', path);
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail('not_plain_object', path);
  const entries: (readonly [string, unknown])[] = [];
  for (const key of Reflect.ownKeys(value)) {
    // Как клиентский captureJson: только тип ключа. Содержимое ключа (пустой,
    // `__x__`, управляющие символы, суррогаты) хранилищу не мешает — ключи
    // живут внутри stateJson.
    if (typeof key !== 'string') fail('invalid_key', path);
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      fail('accessor_property', keyPath(path, key));
    }
    entries.push([key, descriptor.value] as const);
  }
  return entries;
}

function exactRecord(value: unknown, keys: readonly string[], path: string): ReadonlyMap<string, unknown> {
  const entries = dataEntries(value, path);
  const captured = new Map<string, unknown>();
  for (const [key, child] of entries) {
    if (!keys.includes(key)) fail('unknown_field', keyPath(path, key));
    captured.set(key, child);
  }
  for (const key of keys) if (!captured.has(key)) fail('missing_field', keyPath(path, key));
  return captured;
}

function arrayItems(
  value: unknown,
  path: string,
  maxLength: number,
  tooLong: AccountsV2ValidationCode,
): readonly unknown[] {
  if (!Array.isArray(value) || Reflect.getPrototypeOf(value) !== Array.prototype) fail('not_array', path);
  const lengthDescriptor = Reflect.getOwnPropertyDescriptor(value, 'length');
  const length: unknown = lengthDescriptor !== undefined && 'value' in lengthDescriptor
    ? lengthDescriptor.value : undefined;
  if (!safeInteger(length)) fail('not_array', path);
  if (length > maxLength) fail(tooLong, path);
  const keys = Reflect.ownKeys(value);
  if (keys.length !== length + 1) fail('invalid_value', path);
  const items: unknown[] = [];
  for (let index = 0; index < length; index += 1) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
    const itemPath = `${path}[${index}]`;
    if (descriptor === undefined) fail('invalid_value', itemPath);
    if (!descriptor.enumerable || !('value' in descriptor)) fail('accessor_property', itemPath);
    items.push(descriptor.value);
  }
  return items;
}

type NodeBudget = { nodes: number };

// Глубина и счёт узлов — ровно как клиентский captureJson: корень-контейнер
// на глубине 1, каждый узел (включая примитивы) расходует бюджет.
function captureJson(value: unknown, path: string, parentDepth: number, budget: NodeBudget): JsonValue {
  budget.nodes += 1;
  if (budget.nodes > ACCOUNTS_V2_LIMITS.maxPayloadNodes) fail('payload_too_many_nodes', path);
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('number_not_finite', path);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== 'object') fail('invalid_type', path);
  const depth = parentDepth + 1;
  if (depth > ACCOUNTS_V2_LIMITS.maxPayloadDepth) fail('payload_too_deep', path);
  const remaining = ACCOUNTS_V2_LIMITS.maxPayloadNodes - budget.nodes;
  if (Array.isArray(value)) {
    const items = arrayItems(value, path, remaining, 'payload_too_many_nodes');
    return items.map((item, index) => captureJson(item, `${path}[${index}]`, depth, budget));
  }
  const entries = dataEntries(value, path);
  if (entries.length > remaining) fail('payload_too_many_nodes', path);
  const output: Record<string, JsonValue> = {};
  for (const [key, child] of entries) {
    defineData(output, key, captureJson(child, keyPath(path, key), depth, budget));
  }
  return output;
}

/** Идентификатор по правилу клиента boundedId: identityString + предел байт. */
function checkBoundedId(
  value: unknown,
  path: string,
  maxBytes: number,
  tooLarge: AccountsV2ValidationCode,
): string {
  if (typeof value !== 'string') fail('invalid_type', path);
  if (!identityString(value)) fail('invalid_value', path);
  if (stringWireBytes(value) - 2 > maxBytes) fail(tooLarge, path);
  return value;
}

function checkSafeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number') fail('invalid_type', path);
  if (!safeInteger(value)) fail('invalid_value', path);
  return value;
}

type BatchOrigin = 'server' | 'client';

function validateOwned(
  raw: unknown,
  path: string,
  origin: BatchOrigin,
): Readonly<{ owned: AccountsV2OwnedOperation | AccountsV2ClientOperation; bytes: number }> {
  const wrapper = exactRecord(raw, origin === 'client' ? ACCOUNTS_V2_CLIENT_OPERATION_KEYS : ACCOUNTS_V2_OWNED_OPERATION_KEYS, path);
  const ownerUid = wrapper.get('ownerUid');
  if (typeof ownerUid !== 'string') fail('invalid_type', `${path}.ownerUid`);
  if (!identityString(ownerUid)) fail('invalid_value', `${path}.ownerUid`);
  const opPath = `${path}.operation`;
  const fields = exactRecord(wrapper.get('operation'), ACCOUNTS_V2_ENVELOPE_KEYS, opPath);
  const schemaVersion = fields.get('schemaVersion');
  if (typeof schemaVersion !== 'number') fail('invalid_type', `${opPath}.schemaVersion`);
  if (schemaVersion !== ACCOUNTS_V2_SCHEMA_VERSION) fail('schema_version_unsupported', `${opPath}.schemaVersion`);
  const operationId = checkBoundedId(fields.get('operationId'), `${opPath}.operationId`,
    ACCOUNTS_V2_LIMITS.maxOperationIdUtf8Bytes, 'operation_id_too_large');
  const entityType = fields.get('entityType');
  if (typeof entityType !== 'string') fail('invalid_type', `${opPath}.entityType`);
  if (!(ACCOUNTS_V2_ENTITY_TYPES as readonly string[]).includes(entityType)) {
    fail('entity_type_unknown', `${opPath}.entityType`);
  }
  const entityId = fields.get('entityId');
  if (typeof entityId !== 'string') fail('invalid_type', `${opPath}.entityId`);
  // Длина entityId не ограничена отдельно (её держит лимит конверта): в ключ
  // документа идёт хэш, в запись — JSON-строка.
  if (!entityIdString(entityId)) fail('invalid_value', `${opPath}.entityId`);
  const clientSequence = checkSafeInteger(fields.get('clientSequence'), `${opPath}.clientSequence`);
  const rawBase = fields.get('baseRevision');
  const baseRevision = rawBase === null ? null : checkSafeInteger(rawBase, `${opPath}.baseRevision`);
  const payload = captureJson(fields.get('payload'), `${opPath}.payload`, 0, { nodes: 0 });
  const envelopeBytes = objectBaseWireBytes(ACCOUNTS_V2_ENVELOPE_KEYS) + 1
    + stringWireBytes(operationId) + stringWireBytes(entityType) + stringWireBytes(entityId)
    + numberWireBytes(clientSequence) + (baseRevision === null ? 4 : numberWireBytes(baseRevision))
    + accountsV2JsonWireBytes(payload);
  if (envelopeBytes > ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes) fail('envelope_too_large', opPath);
  const operation: AccountsV2Envelope = {
    schemaVersion: 1, operationId, entityType: entityType as AccountsV2EntityType,
    entityId, clientSequence, baseRevision, payload,
  };
  const bytes = objectBaseWireBytes(ACCOUNTS_V2_OWNED_OPERATION_KEYS) + stringWireBytes(ownerUid) + envelopeBytes;
  if (origin === 'server') return { owned: { ownerUid, operation }, bytes };
  // зачем (TG-DFA918464DFA): байты оценки НЕ входят в лимиты — клиент меряет пакет
  // без неё (планировщик outbox считает конверты), иначе пограничный пакет клиент
  // отправил бы, а сервер отклонил навсегда. Оценка — одно число ≤ 16 цифр.
  const enqueuedAtServerMs = checkSafeInteger(wrapper.get('enqueuedAtServerMs'), `${path}.enqueuedAtServerMs`);
  return { owned: { ownerUid, operation, enqueuedAtServerMs }, bytes };
}

/**
 * Строгая проверка пакета схемы v1. Никакого приведения типов: '1' ≠ 1.
 * Отказ несёт код и путь до поля. Возвращает собственную копию данных — дальше
 * ядро не читает исходный объект (защита от геттеров/прокси, меняющих ответ).
 */
export function validateBatch(raw: unknown): AccountsV2ValidateResult {
  return validateAnyBatch(raw, 'server');
}

/**
 * Пакет КЛИЕНТА (callable): каждая операция обязана нести `enqueuedAtServerMs`
 * (TG-DFA918464DFA). Отсутствие — `missing_field`, весь пакет (как любое
 * нарушение схемы). Старых версий конверта в реестре нет: схема одна (v1), ядро
 * не развёрнуто (callable не в index.ts), поэтому «пакета без оценки от старого
 * клиента» не существует — мягкого чтения не делаем.
 * зачем отдельная функция: validateBatch — пакеты, собранные самим сервером
 * (dry-run миграции), у них нет outbox и времени постановки. Поле у двух форм
 * взаимоисключающее: callable, по ошибке взявший validateBatch, отклонил бы
 * КАЖДЫЙ пакет клиента (громкий отказ), а не пропустил бы проверку молча.
 */
export function validateClientBatch(raw: unknown): AccountsV2ValidateResult {
  return validateAnyBatch(raw, 'client');
}

/**
 * Отказ по времени постановки операции клиента или null (TG-DFA918464DFA).
 * Возраст = nowMs сервера − оценка; ровно на пределе — ещё можно. Вызывается
 * applyBatch с ОДНИМ nowMs на пакет, до любых записей.
 */
export function operationTimeRejection(enqueuedAtServerMs: number, nowMs: number): AccountsV2RejectCode | null {
  if (enqueuedAtServerMs - nowMs > ACCOUNTS_V2_OPERATION_MAX_FUTURE_SKEW_MS) return 'operation_time_in_future';
  if (nowMs - enqueuedAtServerMs > ACCOUNTS_V2_OPERATION_MAX_AGE_MS) return 'operation_expired';
  return null;
}

function validateAnyBatch(raw: unknown, origin: BatchOrigin): AccountsV2ValidateResult {
  try {
    const top = exactRecord(raw, ACCOUNTS_V2_BATCH_KEYS, '$');
    const batchId = checkBoundedId(top.get('batchId'), '$.batchId',
      ACCOUNTS_V2_LIMITS.maxBatchIdUtf8Bytes, 'batch_id_too_large');
    const rows = arrayItems(top.get('operations'), '$.operations',
      ACCOUNTS_V2_LIMITS.maxBatchOperations, 'batch_too_many_operations');
    if (rows.length === 0) fail('batch_empty', '$.operations');
    let batchBytes = objectBaseWireBytes(ACCOUNTS_V2_BATCH_KEYS) + stringWireBytes(batchId)
      + 2 + Math.max(0, rows.length - 1);
    const seen = new Set<string>();
    const operations: (AccountsV2OwnedOperation | AccountsV2ClientOperation)[] = [];
    rows.forEach((row, index) => {
      const path = `$.operations[${index}]`;
      const { owned, bytes } = validateOwned(row, path, origin);
      if (seen.has(owned.operation.operationId)) {
        fail('duplicate_operation_id', `${path}.operation.operationId`);
      }
      seen.add(owned.operation.operationId);
      operations.push(owned);
      batchBytes += bytes;
    });
    if (batchBytes > ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes) fail('batch_too_large', '$');
    const batch: AccountsV2Batch = deepFreeze({ batchId, operations });
    ISSUED_BATCHES.add(batch);
    return Object.freeze({ ok: true, batch: batch as ValidatedBatch });
  } catch (error) {
    if (error instanceof Invalid) return Object.freeze({ ok: false, code: error.code, path: error.path });
    // зачем: прокси/экзотические объекты могут бросить что угодно — это тоже
    // отказ входа, а не падение функции. Логируем только имя класса ошибки:
    // текст может нести пользовательские данные.
    console.warn('[ACCOUNTS-V2-CORE] validateBatch: unexpected throw', safeErrorName(error));
    return Object.freeze({ ok: false, code: 'invalid_value', path: '$' });
  }
}

function safeErrorName(error: unknown): string {
  try {
    if (!(error instanceof Error)) return error === null ? 'null' : typeof error;
    const name: unknown = error.name;
    return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) ? name : 'Error';
  } catch (nameError) {
    // Даже чтение имени может бросить (прокси) — это и пишем, без данных.
    console.warn('[ACCOUNTS-V2-CORE] validateBatch: error name unreadable',
      nameError instanceof Error ? 'Error' : typeof nameError);
    return 'unreadable';
  }
}
