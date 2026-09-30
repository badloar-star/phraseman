import {
  ACCOUNTS_V2_LIMITS,
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
  applyBatch,
  canonicalJson,
  docIdFor,
  validateBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2TxPort,
  type JsonValue,
} from './accounts_v2_apply_core';

/*
 * Account V2, Пакет 3S, ремонт №4 — бюджет коммита на РЕАЛЬНЫХ записях.
 *
 * зачем: прежний тест бюджета считал худший случай из констант. Здесь пакет из
 * 50 операций на пределе (разные сущности, максимально длинные допустимые id,
 * состояния почти на 180 000 байт) прогоняется через applyBatch, и суммарный
 * размер ВСЕХ записей порта считается по формуле размера Firestore
 * (строка = байты UTF-8 + 1, число = 8, map = сумма имён и значений,
 * документ = имя + поля + 32). Цель: < 9,5 МиБ на коммит, < 1 МиБ на документ.
 */

const UID = 'u'.repeat(128);
const NOW = 1_790_000_000_000;
const MIB = 1024 * 1024;
const LIMIT = ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES;

/** Размер значения поля по формуле Firestore. */
function valueBytes(value: unknown): number {
  if (value === null || typeof value === 'boolean') return 1;
  if (typeof value === 'number') return 8;
  if (typeof value === 'string') return Buffer.byteLength(value, 'utf8') + 1;
  if (Array.isArray(value)) return value.reduce<number>((total, item) => total + valueBytes(item), 0);
  return Object.entries(value as Record<string, unknown>)
    .reduce((total, [name, item]) => total + Buffer.byteLength(name, 'utf8') + 1 + valueBytes(item), 0);
}

/**
 * Имя документа: сегменты пути (байты + 1) + 16.
 * зачем (ремонт адаптера №1, TG-A09A44FE758E): пути — РЕАЛЬНЫЕ пути адаптера
 * `accounts_v2/{uid}/{accounts_v2_entities|accounts_v2_ops|accounts_v2_meta}/{id}`
 * (закреплены литералами в accounts_v2_adapter/firestore_port.test.ts; сюда не
 * импортируются, чтобы тест ядра не тянул firebase-admin).
 */
function documentBytes(collection: string, docId: string, fields: unknown): number {
  const segments = ['accounts_v2', UID, collection, docId];
  const name = segments.reduce((total, segment) => total + Buffer.byteLength(segment, 'utf8') + 1, 0) + 16;
  return name + valueBytes(fields) + 32;
}

/** Timestamp по формуле размера Firestore весит 8 байт — ровно как число, им и заменён. */
const TIMESTAMP_STANDIN = 0;
/** Поле TTL квитанции, которое адаптер дописывает к каждой квитанции. */
const RECEIPT_TTL_FIELD = { expireAt: TIMESTAMP_STANDIN };
/** Документ счётчика частоты: пять чисел, пишется в той же транзакции. */
const RATE_DOC_FIELDS = { windowStartMs: 0, count: 0, dayStartMs: 0, dayCount: 0, blockedUntilMs: 0 };

function flashcardState(fill: number): JsonValue {
  return { deleted: false, fields: { big: { revision: 1, value: 'x'.repeat(fill), variants: [] } } };
}

describe('бюджет коммита на реальных записях (ремонт №4)', () => {
  test('50 операций на пределе: сумма записей < 9,5 МиБ, каждый документ < 1 МиБ', () => {
    const count = ACCOUNTS_V2_LIMITS.maxBatchOperations;
    const operationId = (index: number): string => `${String(index).padStart(3, '0')}${'o'.repeat(157)}`;
    // Самый длинный entityId, при котором пакет из 50 операций ещё проходит проверку входа.
    const buildRaw = (idLength: number) => ({
      batchId: 'b'.repeat(ACCOUNTS_V2_LIMITS.maxBatchIdUtf8Bytes),
      operations: Array.from({ length: count }, (_, index) => ({
        ownerUid: UID,
        operation: {
          schemaVersion: 1, operationId: operationId(index), entityType: 'flashcard',
          entityId: `${String(index).padStart(3, '0')}${'e'.repeat(idLength - 3)}`,
          clientSequence: Number.MAX_SAFE_INTEGER, baseRevision: 1,
          payload: { op: 'upsert', fields: { tail: 't'.repeat(64) } },
        },
      })),
    });
    let low = 3;
    let high = ACCOUNTS_V2_LIMITS.maxBatchUtf8Bytes;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (validateBatch(buildRaw(middle)).ok) low = middle;
      else high = middle - 1;
    }
    const result = validateBatch(buildRaw(low));
    if (!result.ok) throw new Error(result.code);
    expect(low).toBeGreaterThan(9_000);

    // Каждая сущность уже почти на пределе: после операции состояние — ровно у 180 000 байт.
    const tailEntryBytes = Buffer.byteLength(canonicalJson({ tail: { revision: 2, value: 't'.repeat(64), variants: [] } }), 'utf8') - 1;
    const seedFill = LIMIT - 1 - Buffer.byteLength(canonicalJson(flashcardState(0)), 'utf8') - tailEntryBytes;
    const stored = new Map<string, AccountsV2EntityRecord>();
    for (const { operation } of result.batch.operations) {
      stored.set(docIdFor('flashcard', operation.entityId), {
        entityType: 'flashcard', entityIdJson: JSON.stringify(operation.entityId), revision: 1, updatedAtMs: NOW,
        lastOperationIdJson: JSON.stringify('o'.repeat(160)), stateJson: canonicalJson(flashcardState(seedFill)),
      });
    }
    const entityWrites: [string, AccountsV2EntityRecord][] = [];
    const opWrites: [string, AccountsV2OpRecord][] = [];
    const port: AccountsV2TxPort = {
      getOp: () => null,
      getEntity: (_uid, docId) => stored.get(docId) ?? null,
      putEntity: (_uid, docId, record) => { entityWrites.push([docId, record]); },
      putReceipt: (_uid, opDocId, record) => { opWrites.push([opDocId, record]); },
    };
    const receipts = applyBatch(port, UID, result.batch, NOW);
    expect(receipts.every(({ outcome }) => outcome === 'applied')).toBe(true);
    expect(entityWrites).toHaveLength(count);
    expect(opWrites).toHaveLength(count);

    const entitySizes = entityWrites.map(([docId, record]) => documentBytes('accounts_v2_entities', docId, record));
    // Квитанция уходит в Firestore с полем TTL expireAt (адаптер), его байты тоже в бюджете.
    const opSizes = opWrites.map(([opDocId, record]) =>
      documentBytes('accounts_v2_ops', opDocId, { ...record, ...RECEIPT_TTL_FIELD }));
    const rateSize = documentBytes('accounts_v2_meta', 'rate', RATE_DOC_FIELDS);
    for (const [, record] of entityWrites) {
      expect(Buffer.byteLength(record.stateJson, 'utf8') + 1).toBe(LIMIT);
    }
    for (const size of [...entitySizes, ...opSizes, rateSize]) expect(size).toBeLessThan(MIB);
    const total = [...entitySizes, ...opSizes, rateSize].reduce((sum, size) => sum + size, 0);
    expect(total).toBeLessThan(9.5 * MIB);
    // Нижняя граница: пакет действительно «на пределе» (иначе тест ничего не доказывает).
    expect(total).toBeGreaterThan(9 * MIB);
  });
});
