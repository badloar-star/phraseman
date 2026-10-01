import type { SessionFence } from './account_session';
import type { AccountScopeHandle, ScopeJson } from './account_scope_store';
import type { AccountSyncOwnedOperation } from './account_sync';
import type { AccountSyncOutbox } from './account_sync_outbox';
import { operationKey, parseAck } from './account_sync_outbox_records';
import {
  planAccountsV2Change,
  type AccountsV2Change,
  type EntityMirror,
  type PlannedOperation,
  type ProducerEntityType,
} from './account_sync_producer_plan';

/*
 * Account V2, Пакет 6F (TG-84E5A5923FA4) — производитель операций: постановка
 * запланированных операций в outbox области.
 *
 * зачем: каждая операция ставится в очередь ВМЕСТЕ с зеркалом сущности одной
 * транзакцией области (outbox.applyLocalMutation): после краха нет ни операции
 * без зеркала (дубль при следующем снимке), ни зеркала без операции (потеря).
 * baseRevision — последняя известная ревизия сервера по сущности: из квитанции
 * (ack) последней операции, иначе прежняя база (операции одной сущности в
 * очереди — с одной базой, TEMP-контракт (а) ядра; урок — всегда null, D66).
 * clientSequence растёт по сущности — порядок операций одной сущности сохранён.
 * Логи — [ACCOUNT-V2], только коды и числа.
 */

const LOG = '[ACCOUNT-V2]';
const PREFIX = '__account_v2_producer__:';
/** Предел байт полезной нагрузки одной операции (запас до 131 072 байт конверта). */
const MAX_PAYLOAD_BYTES = 120_000;
/** Повторов постановки, если база устарела между чтением и транзакцией. */
const MAX_STALE_RETRIES = 3;
const STALE_CODE = 'account_v2_producer_stale_read';

class StaleProducerRead extends Error {
  readonly code = STALE_CODE;

  constructor() {
    super(STALE_CODE);
    this.name = 'StaleProducerRead';
  }
}

export type AccountsV2ProducerContext = Readonly<{
  uid: string;
  fence: SessionFence;
  handle: Pick<AccountScopeHandle, 'readRecord' | 'withTransaction'>;
  outbox: Pick<AccountSyncOutbox, 'applyLocalMutation'>;
  newOperationId: () => string;
}>;

export type AccountsV2ProduceResult = Readonly<{ enqueued: number; failed: number; notes: readonly string[] }>;

type EntityRecord = Readonly<{ mirror: EntityMirror; sequence: number; base: number | null; lastOperationId: string | null }>;

function entityKey(type: ProducerEntityType, id: string): string {
  return `${PREFIX}entity:${JSON.stringify([type, id])}`;
}

function indexKey(key: string): string {
  return `${PREFIX}list:${JSON.stringify(key)}`;
}

/**
 * Пакет 6G: ключи зеркала производителя — для гидрации. зачем: после чтения своей
 * учётки из V2 зеркало засевается состоянием сервера, иначе первый же снимок
 * приложения отправил бы ВСЁ заново (лишние вызовы и записи Firestore).
 */
export const accountsV2ProducerEntityKey = entityKey;
export const accountsV2ProducerListIndexKey = indexKey;

function kindOf(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

function codeOf(error: unknown): string {
  const raw = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: unknown }).code : null;
  return typeof raw === 'string' && /^[\w/-]{1,64}$/.test(raw) ? raw : kindOf(error);
}

/** Байты UTF-8 строки (без Buffer/TextEncoder — есть не во всех средах RN). */
function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit < 0x80) bytes += 1;
    else if (unit < 0x800) bytes += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) { bytes += 4; index += 1; } else bytes += 3;
  }
  return bytes;
}

function parseEntityRecord(value: ScopeJson | undefined): EntityRecord | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.v !== 1 || typeof row.mirror !== 'object' || row.mirror === null || !Number.isSafeInteger(row.sequence)) return null;
  const base = row.base === null || Number.isSafeInteger(row.base) ? row.base as number | null : null;
  const last = typeof row.lastOperationId === 'string' ? row.lastOperationId : null;
  return Object.freeze({ mirror: row.mirror as EntityMirror, sequence: row.sequence as number, base, lastOperationId: last });
}

export function createAccountsV2Producer(ctx: AccountsV2ProducerContext) {
  type Reader = Readonly<{ readRecord: AccountScopeHandle['readRecord'] }>;

  const readEntity = async (type: ProducerEntityType, id: string, reader: Reader = ctx.handle): Promise<EntityRecord | null> => {
    const record = await reader.readRecord(entityKey(type, id));
    if (record === null) return null;
    const parsed = parseEntityRecord(record.value);
    // зачем: битое зеркало = «не знаем, что отправлено»; операция уйдёт заново, ядро сольёт её без потерь.
    if (parsed === null) console.warn(`${LOG} producer mirror_corrupt type=${type}`);
    return parsed;
  };

  /** Последняя известная ревизия сервера по сущности (квитанция последней операции). */
  const baseFor = async (type: ProducerEntityType, record: EntityRecord | null, reader: Reader = ctx.handle): Promise<number | null> => {
    if (type === 'lesson_progress') return null;
    if (record === null) return 0;
    if (record.lastOperationId !== null) {
      const ack = await reader.readRecord(operationKey('ack', record.lastOperationId));
      if (ack !== null) {
        try {
          return parseAck(ack.value, ctx.uid).receipt.serverRevision;
        } catch (error) {
          console.warn(`${LOG} producer ack_unreadable code=${codeOf(error)}`);
        }
      }
    }
    return record.base ?? 0;
  };

  /** Та же база, что baseFor, но квитанция читается внутри транзакции постановки. */
  const baseInside = async (
    type: ProducerEntityType,
    record: EntityRecord | null,
    readAck: (operationId: string) => Promise<number | null>,
  ): Promise<number | null> => {
    if (type === 'lesson_progress') return null;
    if (record === null) return 0;
    if (record.lastOperationId !== null) {
      const revision = await readAck(record.lastOperationId);
      if (revision !== null) return revision;
    }
    return record.base ?? 0;
  };

  const enqueueOne = async (planned: PlannedOperation): Promise<boolean> => {
    const payloadBytes = utf8Bytes(JSON.stringify(planned.payload));
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      console.warn(`${LOG} producer skip reason=payload_too_large type=${planned.entityType} bytes=${payloadBytes}`);
      return false;
    }
    for (let attempt = 1; attempt <= MAX_STALE_RETRIES; attempt += 1) {
      const record = await readEntity(planned.entityType, planned.entityId);
      const base = await baseFor(planned.entityType, record);
      const operationId = ctx.newOperationId();
      const sequence = (record?.sequence ?? 0) + 1;
      const owned: AccountSyncOwnedOperation = {
        ownerUid: ctx.uid,
        operation: {
          schemaVersion: 1,
          operationId,
          entityType: planned.entityType,
          entityId: planned.entityId,
          clientSequence: sequence,
          baseRevision: base,
          payload: planned.payload,
        },
      };
      const next = {
        v: 1, mirror: planned.mirror as unknown as ScopeJson, sequence, base, lastOperationId: operationId,
      } as unknown as ScopeJson;
      // зачем: ошибка колбэка обёрнута outbox-ом в свой код — «устарело» несём флагом, а не типом.
      let stale = false;
      try {
        const result = await ctx.outbox.applyLocalMutation(owned, ctx.fence, async (tx) => {
          // зачем (ремонт №1, P3): база и номер сверяются ВНУТРИ транзакции постановки —
          // квитанция (ack) или соседняя операция между чтением и записью = «устарело», заново.
          const inside = await readEntity(planned.entityType, planned.entityId, tx);
          const insideBase = await baseInside(planned.entityType, inside, tx.readAckServerRevision);
          if ((inside?.sequence ?? 0) + 1 !== sequence || insideBase !== base) {
            stale = true;
            throw new StaleProducerRead();
          }
          await tx.putRecord({ key: entityKey(planned.entityType, planned.entityId), value: next });
        });
        return result.outcome === 'enqueued';
      } catch (error) {
        if (!stale) throw error;
        console.warn(`${LOG} producer stale_read_retry attempt=${attempt} type=${planned.entityType}`);
      }
    }
    console.warn(`${LOG} producer skip reason=stale_read_exhausted type=${planned.entityType}`);
    return false;
  };

  const produce = async (change: AccountsV2Change): Promise<AccountsV2ProduceResult> => {
    const plan = await planAccountsV2Change(
      change,
      async (type, id) => (await readEntity(type, id))?.mirror ?? null,
      async (key) => {
        const record = await ctx.handle.readRecord(indexKey(key));
        const ids = record !== null && typeof record.value === 'object' && record.value !== null && !Array.isArray(record.value)
          ? (record.value as Record<string, unknown>).ids : null;
        return Array.isArray(ids) && ids.every((id) => typeof id === 'string') ? ids as string[] : null;
      },
    );
    let enqueued = 0;
    let failed = 0;
    for (const planned of plan.operations) {
      try {
        if (await enqueueOne(planned)) enqueued += 1;
      } catch (error) {
        failed += 1;
        console.warn(`${LOG} producer enqueue_failed type=${planned.entityType} code=${codeOf(error)}`);
      }
    }
    if (plan.listIndex !== null && failed === 0) {
      // зачем: индекс списка (для удалений) двигаем только когда все операции снимка в очереди.
      const { key, ids } = plan.listIndex;
      try {
        await ctx.handle.withTransaction(async (tx) => {
          await tx.putRecord({ key: indexKey(key), value: { v: 1, ids: [...ids] } });
        });
      } catch (error) {
        console.warn(`${LOG} producer index_failed code=${codeOf(error)}`);
      }
    } else if (plan.listIndex !== null) {
      console.warn(`${LOG} producer index_kept reason=enqueue_failed failed=${failed}`);
    }
    console.log(`${LOG} producer done kind=${change.kind} planned=${plan.operations.length} enqueued=${enqueued} failed=${failed}${plan.notes.length > 0 ? ` notes=${plan.notes.join('|')}` : ''}`);
    return Object.freeze({ enqueued, failed, notes: plan.notes });
  };

  return Object.freeze({ produce });
}
