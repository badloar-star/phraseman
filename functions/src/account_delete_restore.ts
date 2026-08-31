import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_JOBS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeleteJobId,
  accountDeletePermanentDenialId,
} from './account_delete_job';
import { accountDeleteGraceDaysLeft, accountDeleteRestorable } from './account_delete_grace';

/*
 * Восстановление аккаунта в течение grace-периода (владелец, 2026-08-31).
 *
 * Пара к отложенному удалению: пока задача не созрела и воркер её не взял,
 * человек может передумать. Вход в такой аккаунт закрыт, приложение видит
 * состояние через accountDeleteStatusMine и показывает «Восстановить
 * аккаунт?»; согласие зовёт accountDeleteRestoreMine — задача снимается,
 * tombstone/маркер/постоянные отказы убираются, доступ возвращается.
 *
 * Firebase-экономия: обе функции — точечные чтения по известным id
 * (job + tombstone), без сканов; статус зовётся только на входе.
 */

const REGION = 'us-central1';

const OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
  timeoutSeconds: 30,
  memory: '256MiB' as const,
} as const;

type Row = Record<string, unknown>;

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Состояние удаления для ВОШЕДШЕГО пользователя.
 *
 * Возвращает ровно то, что нужно клиенту для модалки: идёт ли удаление,
 * сколько дней осталось и можно ли ещё вернуть аккаунт.
 */
export const accountDeleteStatusMine = onCall(OPTIONS, async (request) => {
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const nowMs = Date.now();
  const jobSnap = await db.collection(ACCOUNT_DELETE_JOBS).doc(accountDeleteJobId(authUid)).get();
  if (!jobSnap.exists) return { pending: false as const };

  const job = (jobSnap.data() ?? {}) as Row;
  const status = String(job.status ?? '');
  if (status === 'completed') return { pending: false as const, completed: true as const };

  const deadlineMs = num(job.graceDeadlineMs) || num(job.nextAttemptAtMs);
  const restorable = accountDeleteRestorable({
    status,
    deadlineMs,
    startedAtMs: num(job.startedAtMs),
    nowMs,
  });
  return {
    pending: true as const,
    restorable,
    deadlineMs,
    daysLeft: accountDeleteGraceDaysLeft(deadlineMs, nowMs),
  };
});

/**
 * Отмена удаления: аккаунт возвращается человеку.
 *
 * Снимаем ВСЕ следы заявки в одной транзакции — иначе разъехавшееся состояние
 * (например, снятый job при живом tombstone) снова запрёт вход, а это ровно
 * тот класс инцидентов, который мы чиним.
 */
export const accountDeleteRestoreMine = onCall(OPTIONS, async (request) => {
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const nowMs = Date.now();
  const jobRef = db.collection(ACCOUNT_DELETE_JOBS).doc(accountDeleteJobId(authUid));

  return db.runTransaction(async (tx) => {
    const jobSnap = await tx.get(jobRef);
    if (!jobSnap.exists) throw new HttpsError('not-found', 'account_delete_job_missing');

    const job = (jobSnap.data() ?? {}) as Row;
    const stableUid = String(job.stableUid ?? '').trim();
    const status = String(job.status ?? '');
    const deadlineMs = num(job.graceDeadlineMs) || num(job.nextAttemptAtMs);

    // Точка невозврата: воркер уже начал сносить данные — врать «восстановим»
    // нельзя. Клиент по этому коду покажет честный текст.
    if (!accountDeleteRestorable({ status, deadlineMs, startedAtMs: num(job.startedAtMs), nowMs })) {
      throw new HttpsError('failed-precondition', 'account_delete_not_restorable');
    }
    if (!stableUid) throw new HttpsError('failed-precondition', 'account_delete_job_identity_missing');

    const closure = Array.isArray(job.identityClosure)
      ? job.identityClosure.map((value) => String(value)).filter(Boolean)
      : [authUid, stableUid];

    tx.delete(jobRef);
    tx.delete(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableUid));
    tx.delete(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid));
    // guard-ok: closure ограничен MAX_ACCOUNT_DELETE_IDENTITIES (обычно 2),
    // и всё это — операции ОДНОЙ транзакции, батч тут не применим.
    for (const identity of closure) {
      tx.delete(db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(identity)));
    }
    // зачем след (правило «сперва логи»): отмена удаления — необратимое
    // решение в обратную сторону; без записи нельзя ответить «кто вернул
    // аккаунт и когда». PII не пишем — только хеши, они уже есть в job.
    // guard-ok: новый аудит-документ одного восстановления, полный набор полей
    // пишется целиком; повтор отмены обязан перезаписать запись, а не смешать
    // её со старой. Всё внутри runTransaction — гонка исключена.
    tx.set(db.collection('account_deletion_restores').doc(accountDeleteJobId(authUid)), {
      jobId: accountDeleteJobId(authUid),
      authUidHash: String(job.authUidHash ?? ''),
      stableUidHash: String(job.stableUidHash ?? ''),
      restoredAtMs: nowMs,
      graceDeadlineMs: deadlineMs,
      restoredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { restored: true as const };
  });
});
