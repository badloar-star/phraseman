import {
  createCipheriv,
  createDecipheriv,
  createHash,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

/*
 * Account V2, Пакет 4 (TG-DF4289FFB93C) — квитанция удаления аккаунта.
 * Решения владельца 13–15 (docs/work/tasks/account-v2-status-2026-09-30.md).
 *
 * зачем: квитанция — единственная запись, которая переживает удаление. Она
 * отвечает на один вопрос держателю ключа удаления: «на каком этапе». Поэтому:
 *  - uid в открытом виде в ней НЕТ: цель удаления запечатана AES-256-GCM
 *    ключом, выведенным из секрета телефона (HKDF). Сервер без секрета её не
 *    откроет; нужна она только чтобы «дотолкнуть» удаление по ключу. Сервер
 *    доводит удаление сам через свою задачу (решение 15), а не через квитанцию;
 *  - секрет и operationId хранятся только хэшами (sha256 с доменной солью);
 *  - после завершения цель и курсор стираются, остаётся только этап; срок
 *    жизни — 30 дней (решение 14, TTL-поле `expireAt`, политика — на группу
 *    `accounts_v2_deletion_receipts` в firestore.indexes.json).
 * Путь: accounts_v2/_deletion_receipts_v1/accounts_v2_deletion_receipts/{sha256}.
 * зачем именно там: весь `accounts_v2/**` уже закрыт правилом `if false` и
 * исключён из админского catch-all — новая коллекция не требует правки
 * firestore.rules. Контейнер `_deletion_receipts_v1` не может быть uid
 * (ядро удаления отвергает такой uid, uid Firebase — [A-Za-z0-9]{28}).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const ACCOUNTS_V2_DELETION_PURPOSE = 'deletion_status';
export const ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER = '_deletion_receipts_v1';
export const ACCOUNTS_V2_DELETION_RECEIPTS_COLLECTION = 'accounts_v2_deletion_receipts';
/** Решение 14: квитанция «удалён» живёт 30 дней после завершения. */
export const ACCOUNTS_V2_DELETION_RECEIPT_TTL_MS = 30 * DAY_MS;
/**
 * Запасной срок НЕзавершённой квитанции.
 * зачем: если задача удаления потерялась, квитанция не должна жить вечно.
 * Истечение не мешает серверу довести удаление — задача живёт отдельно.
 */
export const ACCOUNTS_V2_DELETION_PENDING_TTL_MS = 90 * DAY_MS;
/** Имя TTL-поля (Timestamp) — пишет адаптер Firestore рядом с expireAtMs. */
export const ACCOUNTS_V2_DELETION_TTL_FIELD = 'expireAt';

/**
 * Этапы. `v2_purged` (Ремонт №1 P2-1): толчок по ключу стёр только данные
 * accounts_v2 — это ещё НЕ «удалён». `completed` ставит лишь конвейер удаления
 * (completeAccountsV2DeletionReceipt) после ПОЛНОГО удаления всех данных.
 */
export type DeletionStage = 'accepted' | 'purging' | 'v2_purged' | 'completed';
export const DELETION_STAGES: readonly DeletionStage[] = Object.freeze(['accepted', 'purging', 'v2_purged', 'completed']);

export type DeletionCredential = Readonly<{ operationId: string; capability: string }>;

export type DeletionPurgeCursor = Readonly<{ collection: string; afterDocId: string | null }> | null;

type ReceiptBase = Readonly<{
  schemaVersion: 1;
  purpose: typeof ACCOUNTS_V2_DELETION_PURPOSE;
  operationIdHash: string;
  capabilityHash: string;
  attempts: number;
  rateWindowStartedAtMs: number;
  createdAtMs: number;
  updatedAtMs: number;
  expireAtMs: number;
}>;

export type PendingDeletionReceipt = ReceiptBase & Readonly<{
  stage: 'accepted' | 'purging' | 'v2_purged';
  targetSealed: string;
  cursor: DeletionPurgeCursor;
}>;

export type CompletedDeletionReceipt = ReceiptBase & Readonly<{
  stage: 'completed';
  completedAtMs: number;
}>;

export type DeletionReceiptRecord = PendingDeletionReceipt | CompletedDeletionReceipt;

const HEX_64 = /^[0-9a-f]{64}$/;

function sha256Hex(domain: string, value: string): string {
  return createHash('sha256').update(`${domain}\u0000${value}`, 'utf8').digest('hex');
}

/** Ключ удаления: base64url без паддинга, ровно 32 байта (43 символа). */
const CAPABILITY_BYTES = 32;
const CAPABILITY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
/** Минимум различных байтов: у 32 случайных байтов их ~30; меньше — не случайный ключ. */
const CAPABILITY_MIN_DISTINCT_BYTES = 12;

/**
 * Ремонт №1 P3-1. зачем: ключ — единственная защита статуса (App Check
 * запломбирован), значит он обязан нести 256 бит случайности. Принимаем только
 * каноническую base64url-запись ровно 32 байт: неканонический хвост ('aaaa…'),
 * другой алфавит, паддинг, hex старого клиента — отказ. Явно слабые ключи (мало
 * различных байтов: нули, повтор одного байта) — тоже отказ. Вероятность, что
 * настоящий случайный ключ даст < 12 различных байтов, пренебрежимо мала.
 */
export function isStrongCapability(capability: string): boolean {
  if (!CAPABILITY_PATTERN.test(capability)) return false;
  const bytes = Buffer.from(capability, 'base64url');
  if (bytes.length !== CAPABILITY_BYTES || bytes.toString('base64url') !== capability) return false;
  return new Set(bytes).size >= CAPABILITY_MIN_DISTINCT_BYTES;
}

/**
 * Форма пары «операция + секрет». Всё прочее (почта, uid, голый operationId) — null.
 * Пробелы по краям НЕ срезаются: секрет сравнивается байт в байт.
 */
export function cleanDeletionCredential(raw: unknown): DeletionCredential | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { operationId, capability } = raw as Record<string, unknown>;
  if (typeof operationId !== 'string' || typeof capability !== 'string') return null;
  if (operationId.length < 16 || operationId.length > 220 || operationId.includes('/')) return null;
  if (operationId.trim() !== operationId) return null;
  if (!isStrongCapability(capability)) return null;
  return Object.freeze({ operationId, capability });
}

export function deletionOperationIdHash(operationId: string): string {
  return sha256Hex('accounts_v2_deletion_operation', operationId);
}

export function deletionCapabilityHash(capability: string): string {
  return sha256Hex('accounts_v2_deletion_capability', capability);
}

/** id документа квитанции: из operationId, но сам operationId в пути не виден. */
export function deletionReceiptDocId(operationId: string): string {
  return sha256Hex('accounts_v2_deletion_receipt', operationId);
}

export function deletionReceiptPath(docId: string): string {
  if (!HEX_64.test(docId)) {
    console.warn('[ACCOUNTS-V2-DELETE] receipt path rejected code=receipt_id_invalid');
    throw new Error('accounts_v2_deletion_receipt_id_invalid');
  }
  return `accounts_v2/${ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER}/${ACCOUNTS_V2_DELETION_RECEIPTS_COLLECTION}/${docId}`;
}

/** Сравнение за постоянное время (длины хэшей фиксированы; иначе — сравнение с нулями). */
export function constantTimeEquals(left: unknown, right: string): boolean {
  const expected = Buffer.from(right, 'utf8');
  const actual = Buffer.from(typeof left === 'string' ? left : '', 'utf8');
  if (actual.length !== expected.length) {
    timingSafeEqual(expected, Buffer.alloc(expected.length));
    return false;
  }
  return timingSafeEqual(actual, expected);
}

function targetKey(credential: DeletionCredential): Buffer {
  // зачем: ключ привязан и к секрету, и к операции — чужая операция не откроет цель.
  return Buffer.from(hkdfSync(
    'sha256',
    Buffer.from(credential.capability, 'utf8'),
    Buffer.from(deletionOperationIdHash(credential.operationId), 'utf8'),
    Buffer.from('accounts_v2_deletion_target_v1', 'utf8'),
    32,
  ));
}

export function sealDeletionTarget(uid: string, credential: DeletionCredential): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', targetKey(credential), iv);
  const body = Buffer.concat([cipher.update(uid, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

/** null — не тот ключ, не та операция или битая печать. Причину пишет вызывающий. */
export function openDeletionTarget(sealed: unknown, credential: DeletionCredential): string | null {
  if (typeof sealed !== 'string') return null;
  const raw = Buffer.from(sealed, 'base64');
  if (raw.length < 12 + 16 + 1) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', targetKey(credential), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const uid = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
    return uid.length > 0 ? uid : null;
  } catch (error) {
    // зачем: неверный тег GCM — штатный отказ; пишем только класс ошибки, без данных.
    console.warn(`[ACCOUNTS-V2-DELETE] target_open_failed name=${error instanceof Error ? error.name : typeof error}`);
    return null;
  }
}

export function buildPendingDeletionReceipt(
  uid: string,
  credential: DeletionCredential,
  nowMs: number,
): PendingDeletionReceipt {
  return Object.freeze({
    schemaVersion: 1,
    purpose: ACCOUNTS_V2_DELETION_PURPOSE,
    stage: 'accepted',
    operationIdHash: deletionOperationIdHash(credential.operationId),
    capabilityHash: deletionCapabilityHash(credential.capability),
    targetSealed: sealDeletionTarget(uid, credential),
    cursor: null,
    attempts: 0,
    rateWindowStartedAtMs: 0,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    expireAtMs: nowMs + ACCOUNTS_V2_DELETION_PENDING_TTL_MS,
  });
}

/**
 * Завершённая квитанция: только этап. Повтор над уже завершённой — та же запись
 * (срок не продлевается, иначе дёргание статуса держало бы квитанцию вечно).
 */
export function buildCompletedDeletionReceipt(
  previous: DeletionReceiptRecord,
  nowMs: number,
): CompletedDeletionReceipt {
  if (previous.stage === 'completed') return previous;
  return Object.freeze({
    schemaVersion: 1,
    purpose: ACCOUNTS_V2_DELETION_PURPOSE,
    stage: 'completed',
    operationIdHash: previous.operationIdHash,
    capabilityHash: previous.capabilityHash,
    attempts: previous.attempts,
    rateWindowStartedAtMs: previous.rateWindowStartedAtMs,
    createdAtMs: previous.createdAtMs,
    completedAtMs: nowMs,
    updatedAtMs: nowMs,
    expireAtMs: nowMs + ACCOUNTS_V2_DELETION_RECEIPT_TTL_MS,
  });
}

/** Минимальная проверка формы прочитанной записи (fail closed). */
export function isDeletionReceiptRecord(value: unknown): value is DeletionReceiptRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const baseOk = record.schemaVersion === 1
    && record.purpose === ACCOUNTS_V2_DELETION_PURPOSE
    && typeof record.stage === 'string'
    && (DELETION_STAGES as readonly string[]).includes(record.stage)
    && typeof record.operationIdHash === 'string' && HEX_64.test(record.operationIdHash)
    && typeof record.capabilityHash === 'string' && HEX_64.test(record.capabilityHash)
    && Number.isFinite(record.expireAtMs)
    && Number.isFinite(record.attempts)
    && Number.isFinite(record.rateWindowStartedAtMs);
  if (!baseOk) return false;
  if (record.stage === 'completed') return true;
  return typeof record.targetSealed === 'string';
}
