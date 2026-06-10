/**
 * Бэкстоп-модерация (уровень 4) для «Объясни как для 5-летнего».
 *
 * submitExplainReport: юзер жалуется на объяснение фразы. Каркас (auth + per-user rate-doc
 * через транзакцию) скопирован с submitClientReport (functions/src/client_reports.ts:218).
 *
 * НОВАЯ логика (в эталоне submitClientReport ОТСУТСТВУЕТ): порог авто-reject. Сервер выводит
 * phraseHash из phraseEn (client НИКОГДА не шлёт хэш) и в ОДНОЙ транзакции:
 *   1) инкрементит счётчик репортов на этот phraseHash (explain_reports/{phraseHash});
 *   2) если новый счётчик >= REPORT_REJECT_THRESHOLD — ставит phrase_explanations/{phraseHash}
 *      .status='rejected' (фраза начинает отдавать fallback вместо плохого текста).
 * Инкремент и флип статуса АТОМАРНЫ в одной tx — иначе параллельные репорты проскочат порог.
 *
 * Авто-reject НЕ регенерирует: rejected-запись отдаёт fallback, пока админ вручную не сбросит
 * её в pending (иначе массовые репорты вынуждали бы дорогую регенерацию).
 *
 * SECURITY (инварианты phraseman):
 *  - App Check enforced (ENFORCE_APP_CHECK из callable_options).
 *  - Идентичность из request.auth.uid через resolveStableUidForAuth(db, authUid) — НЕ из body.
 *  - phraseHash считает сервер (explain_cache.phraseHashFor); поле 'hash' из body игнорируется.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { resolveStableUidForAuth } from '../auth_identity';
import {
  EXPLAIN_COLLECTION,
  EXPLAIN_SCHEMA_VERSION,
  phraseHashFor,
} from './explain_cache';
import { resolvePromptLangKey } from './explain_prompts';

const REGION = 'us-central1';

/** Per-hash счётчики репортов. Серверная (CF-only) коллекция, в firestore.rules: read/write false. */
export const REPORTS_COLLECTION = 'explain_reports';

/** Rate-doc'и репортов (per-user окно). CF-only; в firestore.rules read/write false. */
export const REPORT_RATE_COLLECTION = 'explain_report_rate_limits';

const HOUR_MS = 60 * 60 * 1000;

/** Per-user окно анти-спама репортов: совпадает с конвенцией client_reports (max:5/час). */
export const REPORT_RATE_MAX = 5;
export const REPORT_RATE_WINDOW_MS = HOUR_MS;

/**
 * Сколько РАЗНЫХ репортов на один phraseHash, чтобы авто-reject кэш-запись. 5 — под конвенцию
 * max:5 из client_reports. НОВАЯ логика (в submitClientReport счётчика/порога нет).
 */
export const REPORT_REJECT_THRESHOLD = 5;

function numeric(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** sha256 doc id rate-дока, та же форма, что rateDocId() в client_reports. */
function rateDocId(authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`explain_report|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `explain_report_${hash}`;
}

export const submitExplainReport = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 15,
  memory: '256MiB',
  maxInstances: 40,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const phraseEn = String(request.data?.phraseEn ?? '').trim();
  if (!phraseEn) throw new HttpsError('invalid-argument', 'phrase_required');
  // Язык объяснения, на которое жалуются. Кэш теперь per-(phrase,lang) — репорт должен бить в
  // ТОТ ЖЕ док, что генерация. Тот же резолвер (unknown → ru), хэш всё равно считает сервер.
  const lang = String(request.data?.lang ?? '').trim();

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Хэш ВСЕГДА выводится сервером из (phraseEn, langKey) — любой клиентский 'hash' игнорируется.
  const phraseHash = phraseHashFor(phraseEn, resolvePromptLangKey(lang));
  const now = Date.now();

  const rateRef = db.collection(REPORT_RATE_COLLECTION).doc(rateDocId(authUid, stableUid));
  const counterRef = db.collection(REPORTS_COLLECTION).doc(phraseHash);
  const cacheRef = db.collection(EXPLAIN_COLLECTION).doc(phraseHash);

  return db.runTransaction(async (tx) => {
    // --- читаем всё ДО записи (Firestore требует reads-before-writes) ---
    const rateSnap = await tx.get(rateRef);
    const counterSnap = await tx.get(counterRef);
    const cacheSnap = await tx.get(cacheRef);

    // --- per-user rate-limit (каркас из submitClientReport) ---
    const rate = rateSnap.data() || {};
    const windowStartMs = numeric(rate.windowStartMs);
    const sameWindow = now - windowStartMs < REPORT_RATE_WINDOW_MS;
    const rateCount = sameWindow ? numeric(rate.count) : 0;
    if (rateCount >= REPORT_RATE_MAX) {
      throw new HttpsError('resource-exhausted', 'rate_limited');
    }

    // --- per-hash счётчик репортов (НОВАЯ логика) ---
    const prevReports = numeric(counterSnap.data()?.reportCount);
    const reportCount = prevReports + 1;
    const reachedThreshold = reportCount >= REPORT_REJECT_THRESHOLD;
    const cacheStatus = String(cacheSnap.data()?.status ?? '');
    const alreadyRejected = cacheStatus === 'rejected';

    // rate-doc
    tx.set(rateRef, {
      authUid,
      stableUid,
      windowStartMs: sameWindow ? windowStartMs : now,
      count: rateCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: now,
    }, { merge: true });

    // per-hash counter doc
    tx.set(counterRef, {
      phraseHash,
      reportCount,
      lastReporterStableUid: stableUid,
      lastReporterAuthUid: authUid,
      updatedAtMs: now,
    }, { merge: true });

    // --- авто-reject В ТОЙ ЖЕ tx: флип статуса кэша на 'rejected' при достижении порога ---
    // flipped = ИМЕННО ЭТА транзакция пересекла порог и отклонила кэш (для observability
    // атомарности: при гонке ровно одна tx даёт flipped=true). rejected = итоговое состояние
    // кэша (true и для последующих репортов уже отклонённой фразы).
    const flipped = reachedThreshold && !alreadyRejected;
    if (flipped) {
      tx.set(cacheRef, {
        status: 'rejected',
        schemaVersion: EXPLAIN_SCHEMA_VERSION,
        reason: 'report_threshold',
        updatedAtMs: now,
      }, { merge: true });
    }

    return { ok: true, reportCount, flipped, rejected: alreadyRejected || flipped };
  });
});
