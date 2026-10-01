import { createHash } from 'crypto';

/*
 * Account V2, Пакет 3S — контракт серверного ядра: лимиты, схема, типы записей
 * порта, ключи документов и формула байт на проводе.
 *
 * зачем: вынесено из accounts_v2_apply_core.ts (правило ≤ 800 строк на файл).
 * Никакого Firebase SDK. Лимиты — ровно клиентские ACCOUNT_SYNC_LIMITS
 * (сверяет accounts_v2_envelope_parity.test.ts).
 */

export const ACCOUNTS_V2_LIMITS = Object.freeze({
  maxBatchOperations: 50,
  maxOperationIdUtf8Bytes: 160,
  maxBatchIdUtf8Bytes: 160,
  maxPayloadDepth: 32,
  maxPayloadNodes: 4096,
  maxEnvelopeUtf8Bytes: 131072,
  maxBatchUtf8Bytes: 524288,
} as const);

export const ACCOUNTS_V2_SCHEMA_VERSION = 1;
export const ACCOUNTS_V2_ENTITY_TYPES = Object.freeze([
  'lesson_progress', 'flashcard', 'library_membership',
] as const);
export const ACCOUNTS_V2_ENVELOPE_KEYS = Object.freeze([
  'schemaVersion', 'operationId', 'entityType', 'entityId',
  'clientSequence', 'baseRevision', 'payload',
] as const);
export const ACCOUNTS_V2_OWNED_OPERATION_KEYS = Object.freeze(['ownerUid', 'operation'] as const);
/**
 * Операция в пакете КЛИЕНТА (callable): рядом с конвертом — оценка времени
 * постановки в outbox по часам сервера (TG-DFA918464DFA).
 * зачем: оценка — метаданные доставки, а не содержимое операции. Поэтому она
 * лежит РЯДОМ с конвертом, а не внутри: конверт (и его отпечаток, и схема v1)
 * не меняется, повтор с уточнённой оценкой — тот же operationId и duplicate.
 * Серверные пакеты (миграция) формируются без неё — validateBatch.
 */
export const ACCOUNTS_V2_CLIENT_OPERATION_KEYS = Object.freeze(['ownerUid', 'operation', 'enqueuedAtServerMs'] as const);
export const ACCOUNTS_V2_BATCH_KEYS = Object.freeze(['batchId', 'operations'] as const);
export const ACCOUNTS_V2_RECEIPT_KEYS = Object.freeze(['operationId', 'outcome', 'serverRevision'] as const);
/** Все исходы, которые выдаёт сервер. Клиентские исходы обязаны быть подмножеством. */
export const ACCOUNTS_V2_RECEIPT_OUTCOMES = Object.freeze(['applied', 'duplicate', 'conflict', 'rejected'] as const);
// зачем: коды отказов хранения (глубина, имена полей) удалены в ремонте №2 —
// состояние лежит строкой JSON, и Firestore эти ограничения больше не видит.
// `srs_policy_hold` снят в ремонте №3: владелец решил SRS (см. ниже).
export const ACCOUNTS_V2_REJECT_CODES = Object.freeze([
  'payload_invalid', 'operation_id_reused', 'entity_state_too_large', 'revision_overflow',
  // Ремонт №4: время SRS-правки дальше допуска в будущем (часы телефона врут).
  'srs_time_in_future',
  // TG-DFA918464DFA: операция старше ACCOUNTS_V2_OPERATION_MAX_AGE_MS по часам
  // сервера / оценка времени постановки дальше допуска в будущем.
  'operation_expired', 'operation_time_in_future',
] as const);

/**
 * SRS-поля карточки. Решение владельца 2026-09-30: при расхождении между
 * устройствами побеждает самый свежий (last-writer-wins), без вариантов.
 * зачем: `srs` — расписание повторения карточки, `srsPolicy` — её политика
 * (раньше отказ srs_policy_hold). Оба сливаются одним правилом LWW
 * (accounts_v2_merge.ts → mergeFlashcard).
 */
export const ACCOUNTS_V2_SRS_FIELDS = Object.freeze(['srs', 'srsPolicy'] as const);

/**
 * Пакет 7A (TEMP из 6F закрыт): снятие полей карточки.
 * `{ op: 'upsert', fields: {…}, unsetFields: ['note', …] }` — поле убирается из
 * состояния карточки. зачем: раньше пропавшее на телефоне поле (например,
 * удалённая заметка) навсегда оставалось на сервере — `null` был бы значением,
 * а не удалением, и после отключения старой синхронизации другое устройство
 * получило бы «воскресшее» поле.
 * Белый список: снимать можно ЛЮБОЕ поле содержимого карточки, КРОМЕ
 * защищённых — `id` (личность карточки) и SRS (`srs`, `srsPolicy` живут по
 * своему правилу LWW-по-времени, их снятие не предусмотрено). Не больше
 * ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS имён, без повторов, без пересечения с
 * `fields`. Клиент держит те же константы (сверяет accounts_v2_card_unset.test.ts).
 */
export const ACCOUNTS_V2_CARD_UNSET_KEY = 'unsetFields';
export const ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS = 64;
export const ACCOUNTS_V2_CARD_UNSET_PROTECTED_FIELDS = Object.freeze(['id', 'srs', 'srsPolicy'] as const);

/**
 * Ремонт №4 (решение владельца 2026-09-30): «самый свежий» SRS — по ВРЕМЕНИ
 * ПРАВКИ на телефоне. Конверт клиента не меняется: время лежит внутри самого
 * SRS-значения — объект с целым полем `updatedAtMs` (≥ 0, safe integer).
 */
export const ACCOUNTS_V2_SRS_TIME_KEY = 'updatedAtMs';

/**
 * Допуск «будущего» времени SRS относительно часов сервера (10 минут).
 * зачем: время клиента недоверенное. Значение с временем далеко в будущем
 * побеждало бы все настоящие правки «навсегда». Такая операция получает
 * окончательный `rejected srs_time_in_future` (а не зажим): зажим сделал бы
 * итог зависимым от момента прихода, а отказ честно говорит клиенту, что
 * часы телефона врут. Закрепить значение можно максимум на 10 минут.
 */
export const ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;

/**
 * Предел возраста операции по часам СЕРВЕРА: 170 суток (TG-DFA918464DFA).
 * зачем: квитанция операции живёт 180 суток (ACCOUNTS_V2_RECEIPT_TTL_MS). Повтор
 * операции после истечения квитанции применился бы ВТОРОЙ раз как новая. Клиент
 * держит тот же предел (ACCOUNT_SYNC_OPERATION_MAX_AGE_MS, сверяет сторож
 * паритета), но меряет своими часами; сбитые вперёд и затем исправленные часы
 * занижали его оценку. Сервер меряет своими часами от оценки клиента
 * `enqueuedAtServerMs`: старше предела — окончательный `rejected operation_expired`.
 * Запас 10 суток до TTL — на задержку TTL-чистки Firestore и погрешность оценки.
 * TEMP (принято в пакете): оценку ставит клиент — это защита от сбитых часов
 * честного клиента, а не от атаки; соврав, клиент портит только свои данные.
 */
export const ACCOUNTS_V2_OPERATION_MAX_AGE_MS = 170 * 24 * 60 * 60 * 1000;

/**
 * Допуск «будущего» для оценки времени постановки: 10 минут, как у SRS.
 * зачем: время постановки не может быть позже прихода. Оценка дальше допуска —
 * часы телефона (или его поправка) врут, и возраст по ней занижен: окончательный
 * `rejected operation_time_in_future`. Клиент, узнав смещение из ответа, зажимает
 * оценку сверху своим «сейчас по серверу» — возвращённая операция проходит.
 */
export const ACCOUNTS_V2_OPERATION_MAX_FUTURE_SKEW_MS = 10 * 60 * 1000;

/**
 * Предел числа tombstone библиотеки. Сверх него (и когда состояние не
 * помещается в ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES) вытесняются самые старые
 * по ревизии удаления, созданные ДО начала пакета; свежие не вытесняются —
 * иначе entity_state_too_large (ремонт №5). См. accounts_v2_merge.ts →
 * collectLibraryGarbage.
 */
export const ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES = 1000;

/**
 * Предел хранимого `stateJson` в единицах Firestore: байты UTF-8 строки + 1.
 * зачем (ремонт №3, P1 обоих ревью): ограничивает не только документ
 * (≤ 1 МиБ), но и ОДНУ транзакцию — запрос коммита Firestore ≤ 10 МиБ.
 * Пакет — до 50 операций: до 50 документов сущностей и 50 квитанций. При
 * прежних 900 000 байт пакет выходил за 10 МиБ, коммит падал всегда, и
 * клиентская очередь блокировалась навсегда. Формула (сверяет тест из констант):
 *   50 × (состояние + прочие поля сущности ≈ 1,3 КБ + квитанция ≈ 1,4 КБ)
 *   + сумма entityIdJson по пакету (≤ maxBatchUtf8Bytes + 50) < 9,5 МиБ.
 * При 180 000: ≈ 9,66 МБ ≈ 9,21 МиБ — запас ~300 КБ до цели 9,5 МиБ.
 * Документ: 180 000 + entityIdJson ≤ 131 073 + ~2 КБ ≪ 1 048 576.
 */
export const ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES = 180_000;

/**
 * Поля записей порта, которые адаптер Firestore обязан исключить из
 * single-field индексов (fieldOverrides без индексов) и НИКОГДА не включать в
 * составные индексы. зачем: это длинные пользовательские строки (до 180 КБ
 * состояния, до 128 КБ id) или хэш — индексировать их бессмысленно и дорого,
 * а запись > 1500 байт в индексе Firestore отклоняет. Сверяет тест: все
 * `*Json`-поля записей + `fingerprint`.
 */
export const ACCOUNTS_V2_INDEX_EXEMPT_FIELDS = Object.freeze([
  'entityIdJson', 'stateJson', 'lastOperationIdJson', 'operationIdJson', 'fingerprint',
] as const);

export type JsonObject = { readonly [key: string]: JsonValue };
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonObject;

export type AccountsV2EntityType = typeof ACCOUNTS_V2_ENTITY_TYPES[number];
export type AccountsV2Envelope = Readonly<{
  schemaVersion: 1;
  operationId: string;
  entityType: AccountsV2EntityType;
  entityId: string;
  clientSequence: number;
  baseRevision: number | null;
  payload: JsonValue;
}>;
export type AccountsV2OwnedOperation = Readonly<{ ownerUid: string; operation: AccountsV2Envelope }>;
/** Операция из пакета клиента: с оценкой времени постановки (safe integer ≥ 0, мс по часам сервера). */
export type AccountsV2ClientOperation = AccountsV2OwnedOperation & Readonly<{ enqueuedAtServerMs: number }>;
export type AccountsV2Batch = Readonly<{
  batchId: string;
  operations: readonly (AccountsV2OwnedOperation | AccountsV2ClientOperation)[];
}>;

/**
 * Квитанции applied|duplicate. Клиентская `AccountSyncReceipt` знает ещё и
 * conflict, а rejected{code} — отдельным типом `AccountSyncRejectedReceipt`;
 * сторож паритета сверяет, что клиент знает КАЖДЫЙ исход сервера и форму rejected.
 */
export type AccountSyncReceipt = Readonly<{
  operationId: string;
  outcome: 'applied' | 'duplicate';
  serverRevision: number;
}>;
export type AccountsV2RejectCode = typeof ACCOUNTS_V2_REJECT_CODES[number];
// зачем: конфликт и отказ — окончательные исходы: без них сервер был бы вынужден
// либо молча перезаписать, либо уронить весь пакет. Клиент (TG-831C22D22486)
// подтверждает такую операцию, хранит квитанцию в ack с флагом resolved=false
// до слоя разрешения (listUnresolved, TG-7CD73967EF61) и НЕ повторяет её.
// Неизвестная клиенту форма квитанции даёт у него sync_receipt_invalid — это
// засчитанная неудача с backoff и потолком, а не вечный повтор.
export type AccountsV2ConflictReceipt = Readonly<{ operationId: string; outcome: 'conflict'; serverRevision: number }>;
export type AccountsV2RejectedReceipt = Readonly<{
  operationId: string; outcome: 'rejected'; code: AccountsV2RejectCode; serverRevision: number;
}>;
export type AccountsV2Receipt = AccountSyncReceipt | AccountsV2ConflictReceipt | AccountsV2RejectedReceipt;

/**
 * Запись сущности в порту. Пользовательские строки — ТОЛЬКО внутри JSON-строк
 * (`entityIdJson`, `lastOperationIdJson`, `stateJson`): JSON.stringify
 * экранирует одиночные суррогаты и управляющие символы, поэтому Firestore
 * видит лишь well-formed строки, а вложенность/имена полей/число индексных
 * записей состояния для него не существуют.
 */
export type AccountsV2EntityRecord = Readonly<{
  entityType: AccountsV2EntityType;
  entityIdJson: string;
  revision: number;
  updatedAtMs: number;
  lastOperationIdJson: string;
  stateJson: string;
}>;
/** Квитанция в хранилище — без operationId: он лежит в `operationIdJson` записи. */
export type AccountsV2StoredReceipt =
  | Readonly<{ outcome: 'applied' | 'duplicate' | 'conflict'; serverRevision: number }>
  | Readonly<{ outcome: 'rejected'; code: AccountsV2RejectCode; serverRevision: number }>;
export type AccountsV2OpRecord = Readonly<{
  operationIdJson: string; fingerprint: string; receipt: AccountsV2StoredReceipt; recordedAtMs: number;
}>;

/**
 * Порт ОДНОЙ транзакции. Адаптер (Firestore, следующий пакет) обязан вызывать
 * applyBatch внутри одной транзакции и коммитить только при нормальном
 * возврате; любое исключение порта или ядра — откат всего пакета.
 * Методы синхронные: адаптер заранее читает ключи из planBatchReads (getAll)
 * и бросает на любой ключ вне плана.
 * Ключи — ТОЛЬКО `opDocId`/`entityDocId` (sha256 hex из opDocIdFor/docIdFor),
 * никогда сырые пользовательские строки. Отсутствие документа — `null`.
 */
export interface AccountsV2TxPort {
  getOp(uid: string, opDocId: string): AccountsV2OpRecord | null;
  getEntity(uid: string, entityDocId: string): AccountsV2EntityRecord | null;
  putEntity(uid: string, entityDocId: string, record: AccountsV2EntityRecord): void;
  putReceipt(uid: string, opDocId: string, record: AccountsV2OpRecord): void;
}

export type AccountsV2ApplyErrorCode =
  | 'unauthenticated' | 'uid_mismatch' | 'invalid_now' | 'invalid_batch' | 'stored_state_corrupt';

export class AccountsV2ApplyError extends Error {
  readonly code: AccountsV2ApplyErrorCode;

  constructor(code: AccountsV2ApplyErrorCode) {
    super(code);
    this.name = 'AccountsV2ApplyError';
    this.code = code;
  }
}

export type AccountsV2ValidationCode =
  | 'not_plain_object' | 'not_array' | 'invalid_key' | 'accessor_property'
  | 'missing_field' | 'unknown_field' | 'invalid_type' | 'invalid_value' | 'number_not_finite'
  | 'schema_version_unsupported' | 'entity_type_unknown' | 'duplicate_operation_id'
  | 'batch_empty' | 'batch_too_many_operations' | 'batch_id_too_large' | 'operation_id_too_large'
  | 'payload_too_deep' | 'payload_too_many_nodes' | 'envelope_too_large' | 'batch_too_large';

// зачем: applyBatch/planBatchReads принимают только пакет, прошедший
// validateBatch. Бренд ловит ошибку на этапе типов, реестр выданных объектов
// (accounts_v2_validate.ts) — в рантайме.
declare const VALIDATED_BATCH: unique symbol;
export type ValidatedBatch = AccountsV2Batch & { readonly [VALIDATED_BATCH]: true };

// ─── ключи документов ──────────────────────────────────────────────────────

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Id документа сущности: sha256 hex от `JSON.stringify([entityType, entityId])`. */
export function docIdFor(entityType: AccountsV2EntityType, entityId: string): string {
  return sha256Hex(JSON.stringify([entityType, entityId]));
}

/** Id документа квитанции операции: sha256 hex от `JSON.stringify([operationId])`. */
export function opDocIdFor(operationId: string): string {
  return sha256Hex(JSON.stringify([operationId]));
}

/** Отпечаток операции (sha256 hex от канонического JSON). */
export function sha256OfText(text: string): string {
  return sha256Hex(text);
}

// ─── идентичность ──────────────────────────────────────────────────────────

/** Ровно клиентский identityString: непустая строка без пробелов по краям. */
export function identityString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

/** Ровно клиентский entityIdString: любая непустая строка. */
export function entityIdString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function safeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

// ─── размер на проводе (ровно как клиентский stringWireBytes) ─────────────

// зачем: клиент меряет «UTF-8 байты» как длину JSON-записи в UTF-8, с учётом
// экранирования (\" \\ \n → 2 байта, прочие управляющие → 6, одиночный
// суррогат → 6). Сервер обязан считать так же, иначе пограничный пакет клиент
// отправит, а сервер отклонит навсегда.
export function stringWireBytes(value: string): number {
  let bytes = 2;
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit === 0x22 || unit === 0x5c) bytes += 2;
    else if (unit === 0x08 || unit === 0x09 || unit === 0x0a || unit === 0x0c || unit === 0x0d) bytes += 2;
    else if (unit < 0x20) bytes += 6;
    else if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : -1;
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 6;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) bytes += 6;
    else bytes += 3;
  }
  return bytes;
}

export function numberWireBytes(value: number): number {
  return String(value).length;
}

/** Байты JSON-записи значения в UTF-8 — ровно клиентская формула (сторож паритета). */
export function accountsV2JsonWireBytes(value: JsonValue): number {
  if (value === null) return 4;
  if (typeof value === 'boolean') return value ? 4 : 5;
  if (typeof value === 'number') return numberWireBytes(value);
  if (typeof value === 'string') return stringWireBytes(value);
  if (Array.isArray(value)) {
    const items = value as readonly JsonValue[];
    return items.reduce<number>((total, item) => total + accountsV2JsonWireBytes(item), 2 + Math.max(0, items.length - 1));
  }
  const keys = Object.keys(value);
  return keys.reduce(
    (total, key) => total + stringWireBytes(key) + 1 + accountsV2JsonWireBytes((value as JsonObject)[key]),
    2 + Math.max(0, keys.length - 1),
  );
}

export function objectBaseWireBytes(keys: readonly string[]): number {
  return keys.reduce((total, key) => total + stringWireBytes(key) + 1, 2 + Math.max(0, keys.length - 1));
}

/** Размер строки по формуле Firestore: байты UTF-8 + 1. Строка — из JSON.stringify (well-formed). */
export function firestoreStringBytes(text: string): number {
  return Buffer.byteLength(text, 'utf8') + 1;
}

// ─── общее для объектов ────────────────────────────────────────────────────

export function defineData<T extends object>(target: T, key: string, value: unknown): T {
  // зачем: defineProperty, а не присваивание — ключ `__proto__` остаётся
  // обычным своим полем, прототип не подменяется.
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
  return target;
}

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    for (const key of Object.keys(value)) deepFreeze((value as Record<string, unknown>)[key]);
    Object.freeze(value);
  }
  return value;
}
