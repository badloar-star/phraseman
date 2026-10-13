#!/usr/bin/env node
// зачем (решение владельца 12.10, журнал п.84: обращения и сообщения об ошибках хранятся 30 дней): новый код (98ff91799) ставит
// expireAt каждой новой записи error_reports, а TTL-политика удаляет по нему. Записи, созданные ДО выкладки, поля не имеют — TTL их
// не тронет. Этот скрипт проставляет им expireAt = время создания + 30 дней. Уже просроченные получат срок в прошлом — TTL удалит их
// в течение ~24 ч (так и задумано: «хранится 30 дней»). Жалобы на задания Шпиля (spire_task_report) не трогаем — у них нет TTL.
//
// ⛔ ЗАПУСК С --apply ТОЛЬКО ПО СЛОВУ ВЛАДЕЛЬЦА и только ПОСЛЕ выкладки firestore:indexes (TTL-политика) — это прод-запись.
//
// Режимы:
//   node scripts/error_reports_ttl_backfill_2026-10-13.mjs                     — dry-run (по умолчанию): только чтение и счётчики
//   node scripts/error_reports_ttl_backfill_2026-10-13.mjs --apply --owner-yes — запись expireAt батчами по 400
// Вход: `gcloud auth application-default login` (учётка владельца). Ключи service-account НЕ используются и не читаются.
// В вывод не попадают uid, тексты обращений и id документов — только счётчики и дата самого старого.
import { createRequire } from 'node:module';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const admin = require('firebase-admin');

const TARGET_PROJECT = 'phraseman-ea0b3';
const COLLECTION = 'error_reports';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // = SUPPORT_REPORT_TTL_MS в functions/src/log_ttl.ts
const PAGE = 400;
const TAG = '[ERR-REPORTS-TTL]';

const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const OWNER_YES = args.has('--owner-yes');

const log = (event, extra = {}) => console.log(`${TAG} ${event} ${JSON.stringify(extra)}`);

// зачем (координатор 13.10, Q2): после записи владельцем 09:48 повторные запуски печатали только «start» и молча выходили — ни
// «done», ни «failed». Немой выход: обещание get() не резолвилось, event loop пустел, catch не срабатывал. Теперь любой исход
// виден: незавершённый выход (beforeExit/exit без done), отклонение вне цепочки, а каждая страница — до/после чтения.
let finished = false;
process.on('unhandledRejection', (reason) => {
  log('unhandled_rejection', { message: String(reason?.message ?? reason).slice(0, 200), code: reason?.code ?? 'unknown' });
});
process.on('beforeExit', (code) => {
  if (!finished) log('silent_exit_detected', { code, reason: 'event loop опустел до done/failed — ожидание чтения оборвалось' });
});
process.on('exit', (code) => {
  if (!finished) log('exit_without_result', { code });
});

if (APPLY && !OWNER_YES) {
  log('refused', { reason: '--apply без --owner-yes: запись только по слову владельца' });
  process.exit(2);
}

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: TARGET_PROJECT });
const db = admin.firestore();

function millisOf(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return null;
}

function createdMs(doc) {
  const data = doc.data();
  return millisOf(data.createdAtMs) ?? millisOf(data.createdAt) ?? millisOf(data.serverCreatedAt) ?? millisOf(doc.createTime);
}

function isSpireReport(data) {
  return data.category === 'spire_task_report' || data.contentScope === 'spire';
}

async function main() {
  log('start', { mode: APPLY ? 'apply' : 'dry-run', project: TARGET_PROJECT, collection: COLLECTION, page: PAGE });
  const startedAt = Date.now();
  const counts = { scanned: 0, alreadyHasExpireAt: 0, spireSkipped: 0, noCreatedTime: 0, willSet: 0, alreadyExpiredOnSet: 0, written: 0 };
  let oldestMs = null;
  let cursor = null;
  for (;;) {
    let query = db.collection(COLLECTION).orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE);
    if (cursor) query = query.startAfter(cursor);
    const pageNo = Math.floor(counts.scanned / PAGE) + 1;
    const fetchStartedAt = Date.now();
    log('page_fetch_start', { page: pageNo, afterCursor: cursor ? 'yes' : 'no' });
    const snap = await query.get();
    log('page_fetch_done', { page: pageNo, size: snap.size, ms: Date.now() - fetchStartedAt });
    if (snap.empty) { log('page_empty_stop', { page: pageNo }); break; }
    const batch = APPLY ? db.batch() : null;
    let inBatch = 0;
    for (const doc of snap.docs) {
      counts.scanned += 1;
      const data = doc.data();
      if (data.expireAt) { counts.alreadyHasExpireAt += 1; continue; }
      if (isSpireReport(data)) { counts.spireSkipped += 1; continue; }
      const created = createdMs(doc);
      if (created === null) { counts.noCreatedTime += 1; continue; }
      if (oldestMs === null || created < oldestMs) oldestMs = created;
      const expireAtMs = created + TTL_MS;
      counts.willSet += 1;
      if (expireAtMs <= Date.now()) counts.alreadyExpiredOnSet += 1;
      if (batch) {
        batch.update(doc.ref, { expireAt: admin.firestore.Timestamp.fromMillis(expireAtMs) });
        inBatch += 1;
      }
    }
    if (batch && inBatch > 0) {
      await batch.commit();
      counts.written += inBatch;
      log('batch_committed', { written: inBatch, totalWritten: counts.written });
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }
  finished = true;
  log('done', {
    mode: APPLY ? 'apply' : 'dry-run',
    ...counts,
    oldestCreatedAt: oldestMs === null ? null : new Date(oldestMs).toISOString(),
    ms: Date.now() - startedAt,
    note: APPLY ? 'TTL удалит просроченные в течение ~24 ч' : 'ничего не записано — для записи нужно слово владельца: --apply --owner-yes',
  });
}

main().catch((error) => {
  finished = true;
  log('failed', { code: error?.code ?? 'unknown', message: String(error?.message ?? error).slice(0, 200) });
  process.exit(1);
});
