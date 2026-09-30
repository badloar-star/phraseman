import type { Firestore } from 'firebase-admin/firestore';
import { accountsV2FlagsReader } from '../accounts_v2_flags';
import { createFirestoreDeletionReceiptStore, purgeAccountsV2ForDeletion } from './firestore_ports';
import type { AccountsV2DeletionPipelineDeps } from './pipeline';

/*
 * Account V2, Пакет 6A — Firestore-шов для pipeline.ts.
 * зачем: конвейер account_delete.ts получает готовые зависимости одной строкой,
 * а pipeline.ts остаётся без Firestore (его тесты — на фейках).
 * Коллекция задач — та же, что у account_delete_job.ts (ACCOUNT_DELETE_JOBS);
 * имя продублировано строкой, чтобы не тянуть firebase-admin в этот модуль.
 */

export const ACCOUNTS_V2_DELETION_JOBS_COLLECTION = 'account_deletion_jobs';

export function createFirestoreAccountsV2DeletionDeps(db: Firestore): AccountsV2DeletionPipelineDeps {
  return {
    flags: accountsV2FlagsReader(db),
    store: createFirestoreDeletionReceiptStore(db),
    purge: (uid, options) => purgeAccountsV2ForDeletion(db, uid, { cursor: options.cursor, maxCommits: options.maxCommits }),
    jobs: {
      async read(jobId) {
        const snapshot = await db.collection(ACCOUNTS_V2_DELETION_JOBS_COLLECTION).doc(jobId).get(); // guard-ok: один документ задачи
        return snapshot.exists ? (snapshot.data() ?? {}) : null;
      },
      async merge(jobId, fields) {
        // зачем: точечная merge-запись одного документа задачи (заготовка/курсор).
        await db.collection(ACCOUNTS_V2_DELETION_JOBS_COLLECTION).doc(jobId).set({ ...fields }, { merge: true }); // guard-ok: один документ
      },
    },
    nowMs: () => Date.now(),
  };
}
