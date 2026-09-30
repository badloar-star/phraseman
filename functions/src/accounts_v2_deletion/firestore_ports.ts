import { FieldPath, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { ACCOUNTS_V2_COLLECTIONS } from '../accounts_v2_adapter/firestore_port';
import {
  AccountsV2DeletionError,
  completeDeletionReceipt,
  issueDeletionReceipt,
  readDeletionStatus,
  revokeDeletionReceipt,
  type DeletionProbe,
  type DeletionReceiptStore,
  type DeletionStatusResult,
} from './deletion_flow';
import {
  ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT,
  accountsV2PurgeUidSafe,
  runAccountsV2Purge,
  type AccountsV2PurgeOptions,
  type AccountsV2PurgePort,
  type AccountsV2PurgeResult,
} from './purge_core';
import { ACCOUNTS_V2_DELETION_TTL_FIELD, deletionReceiptPath, type DeletionReceiptRecord } from './receipt';

/*
 * Account V2, Пакет 4 (TG-DF4289FFB93C) — тонкий адаптер Firestore.
 *
 * зачем: ядро (purge_core, deletion_flow) не знает Firestore; здесь единственный
 * шов. Модуль НЕ подключён к index.ts и к account_delete.ts: подключение —
 * Пакет 6. Точки подключения:
 *  - `purgeAccountsV2ForDeletion(db, uid, {cursor, maxCommits, onProgress})` —
 *    ещё один шаг конвейера удаления (курсор хранит задача удаления);
 *  - `issueAccountsV2DeletionReceipt` — при старте удаления после свежего входа;
 *  - `completeAccountsV2DeletionReceipt` — ЕДИНСТВЕННЫЙ, кто ставит completed: конвейер
 *    после полного удаления (решение 15; Ремонт №1 P2-1);
 *  - `revokeAccountsV2DeletionReceipt` — отзыв pending-квитанции при отмене/откате (P2-2);
 *  - `accountsV2DeletionStatusForCallable` — тело callable статуса по ключу.
 * Стоимость: статус — 1 чтение + 1 запись (попытка); толчок — +2 транзакции на
 * этап и по одной на курсор после каждой порции; удаление — N/450 коммитов,
 * чтения только id (select() без полей).
 */

const LOG = '[ACCOUNTS-V2-DELETE]';
const ROOT = 'accounts_v2';

export const ACCOUNTS_V2_PURGE_KNOWN_COLLECTIONS: readonly string[] = Object.freeze(Object.values(ACCOUNTS_V2_COLLECTIONS));

function assertUid(uid: string): void {
  if (!accountsV2PurgeUidSafe(uid)) {
    console.warn(`${LOG} port rejected code=uid_invalid`);
    throw new Error('accounts_v2_purge_uid_invalid');
  }
}

function assertCollection(collection: string): void {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(collection) || /^__.*__$/.test(collection)) {
    console.warn(`${LOG} port rejected code=collection_invalid`);
    throw new Error('accounts_v2_purge_collection_invalid');
  }
}

export function createFirestoreAccountsV2PurgePort(db: Firestore): AccountsV2PurgePort {
  return {
    async listSubcollections(uid) {
      assertUid(uid);
      const collections = await db.doc(`${ROOT}/${uid}`).listCollections();
      return collections.map((collection) => collection.id);
    },
    async listDocIds(uid, collection, afterDocId, limit) {
      assertUid(uid);
      assertCollection(collection);
      let query = db.collection(`${ROOT}/${uid}/${collection}`).orderBy(FieldPath.documentId()).limit(limit);
      if (afterDocId !== null) query = query.startAfter(afterDocId);
      // зачем select(): нужны только id — не тянем тела (stateJson бывает большим).
      const snapshot = await query.select().get(); // guard-ok: один запрос на порцию, только id
      return snapshot.docs.map((doc) => doc.id);
    },
    async deleteDocs(uid, collection, docIds) {
      assertUid(uid);
      assertCollection(collection);
      if (docIds.length === 0 || docIds.length > ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT) {
        console.warn(`${LOG} port rejected code=chunk_invalid size=${docIds.length}`);
        throw new Error('accounts_v2_purge_chunk_invalid');
      }
      const batch = db.batch();
      // guard-ok: один батч-коммит на порцию ≤ 450, не N отдельных запросов.
      for (const docId of docIds) batch.delete(db.doc(`${ROOT}/${uid}/${collection}/${docId}`));
      await batch.commit();
    },
    async deleteRoot(uid) {
      assertUid(uid);
      await db.doc(`${ROOT}/${uid}`).delete();
    },
  };
}

/** Шаг конвейера удаления: стереть accounts_v2/{uid}/** (Пакет 6 подключает). */
export async function purgeAccountsV2ForDeletion(
  db: Firestore,
  uid: string,
  options: Omit<AccountsV2PurgeOptions, 'knownCollections'> = {},
): Promise<AccountsV2PurgeResult> {
  return runAccountsV2Purge(createFirestoreAccountsV2PurgePort(db), uid, {
    ...options,
    knownCollections: ACCOUNTS_V2_PURGE_KNOWN_COLLECTIONS,
  });
}

function withoutTtlField(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key]) => key !== ACCOUNTS_V2_DELETION_TTL_FIELD));
}

export function createFirestoreDeletionReceiptStore(db: Firestore): DeletionReceiptStore {
  return {
    async transact<T>(docId: string, work: (stored: unknown) => Readonly<{ next: DeletionReceiptRecord | 'delete' | null; result: T }>) {
      const ref = db.doc(deletionReceiptPath(docId));
      // Retry транзакции безопасен: work чистая и детерминирована при том же nowMs.
      return db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const stored = snapshot.exists ? withoutTtlField(snapshot.data() ?? {}) : null;
        const { next, result } = work(stored);
        if (next === 'delete') {
          // Ремонт №1 P2-2: отзыв pending-квитанции — удаление в той же транзакции.
          tx.delete(ref); // guard-ok: одна операция в транзакции
        } else if (next !== null) {
          // зачем полная замена, а не merge: завершённая квитанция ОБЯЗАНА потерять
          // запечатанную цель и курсор — merge оставил бы их. Запись внутри транзакции.
          tx.set(ref, { ...next, [ACCOUNTS_V2_DELETION_TTL_FIELD]: Timestamp.fromMillis(next.expireAtMs) }); // guard-ok
        }
        return result;
      });
    },
  };
}

export function issueAccountsV2DeletionReceipt(db: Firestore, uid: string, credential: unknown, nowMs = Date.now()) {
  assertUid(uid);
  return issueDeletionReceipt(createFirestoreDeletionReceiptStore(db), uid, credential, nowMs);
}

export function completeAccountsV2DeletionReceipt(db: Firestore, receiptId: string, nowMs = Date.now()) {
  return completeDeletionReceipt(createFirestoreDeletionReceiptStore(db), receiptId, nowMs);
}

export function revokeAccountsV2DeletionReceipt(db: Firestore, receiptId: string) {
  return revokeDeletionReceipt(createFirestoreDeletionReceiptStore(db), receiptId);
}

/**
 * Тело callable статуса (Пакет 6 оборачивает в onCall; App Check запломбирован
 * и здесь не участвует). Наружу — только { stage } или HttpsError с кодом.
 */
export async function accountsV2DeletionStatusForCallable(
  db: Firestore,
  data: unknown,
  options: Readonly<{ nudge?: boolean; maxCommits?: number; nowMs?: number; probe?: DeletionProbe }> = {},
): Promise<DeletionStatusResult> {
  const nowMs = options.nowMs ?? Date.now();
  const nudge = options.nudge === true
    ? (uid: string, cursor: AccountsV2PurgeOptions['cursor'], onProgress: NonNullable<AccountsV2PurgeOptions['onProgress']>) => (
      purgeAccountsV2ForDeletion(db, uid, { cursor, onProgress, maxCommits: options.maxCommits })
    )
    : undefined;
  try {
    return await readDeletionStatus(createFirestoreDeletionReceiptStore(db), data, nowMs, { nudge, probe: options.probe });
  } catch (error) {
    if (error instanceof AccountsV2DeletionError) {
      if (error.code === 'rate_limited') throw new HttpsError('resource-exhausted', 'account_v2_deletion_status_rate_limited');
      if (error.code === 'conflict') throw new HttpsError('failed-precondition', 'account_v2_deletion_status_conflict');
      throw new HttpsError('permission-denied', 'account_v2_deletion_status_denied');
    }
    const name = error instanceof Error ? error.name : typeof error;
    console.error(`${LOG} status unavailable name=${name}`);
    throw new HttpsError('unavailable', 'account_v2_deletion_status_unavailable');
  }
}
