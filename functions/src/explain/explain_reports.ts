/**
 * Бэкстоп-модерация (уровень 4) для «Объясни как для 5-летнего».
 *
 * submitExplainReport: юзер жалуется на объяснение. Каркас (auth + per-user rate-doc
 * через транзакцию) скопирован с submitClientReport (functions/src/client_reports.ts:218).
 *
 * ДВЕ фичи, ОДИН CF (kind): объяснение фразы ('phrase') и разбор ошибки ('mistake').
 * Лента и счётчики у них ОБЩИЕ — различается только кэш-коллекция и схема хэша (см. REPORT_KINDS).
 *
 * Что пишет (всё в ОДНОЙ транзакции):
 *  1) explain_report_entries/{auto} — КАЖДАЯ жалоба целиком (фраза, причина, комментарий,
 *     кто, когда, kind, cacheCollection) — это лента для раздела админки «Непонятно объяснили».
 *  2) explain_reports/{cacheHash} — счётчик РАЗНЫХ юзеров на фразу/ошибку. ДЕДУП: повторная
 *     жалоба того же stableUid НЕ инкрементит счётчик (иначе один юзер в одиночку добивал порог —
 *     rate-limit 5/час == порогу 5). Запись жалобы в ленту при этом всё равно создаётся.
 *  3) Кэш-док ({phrase|mistake}_explanations/{cacheHash}) НЕ меняется автоматически. Жалоба
 *     лишь попадает в очередь админки вместе с текущим текстом объяснения. Удалить кэш может
 *     только админ вручную: «Непонятно объяснили» → «Убрать из кэша».
 *
 * SECURITY (инварианты phraseman):
 *  - App Check enforced (ENFORCE_APP_CHECK из callable_options).
 *  - Идентичность из request.auth.uid через resolveStableUidForAuth(db, authUid) — НЕ из body.
 *  - cacheHash считает сервер (phraseHashFor / mistakeHashFor); поле 'hash' из body игнорируется.
 *  - kind/reason — только из белого списка; comment режется по длине и чистится от control-символов.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { resolveStableUidForAuth } from '../auth_identity';
import { buildRetireAlert, shouldRetireCache } from './auto_retire';
import {
  ADMIN_ALERT_BOT_TOKEN,
  alertTypeEnabled,
  markSent,
  readAlertsConfig,
  sendTelegramAlert,
} from '../admin_alerts';
import {
  EXPLAIN_COLLECTION,
  phraseHashFor,
} from './explain_cache';
import {
  MISTAKE_COLLECTION,
  mistakeHashFor,
} from './mistake_explain_cache';
import { resolvePromptLangKeySoft } from './explain_prompts';

const REGION = 'us-central1';

/** Per-hash счётчики репортов. Серверная коллекция; админка читает (isAdmin в rules). */
export const REPORTS_COLLECTION = 'explain_reports';

/** Лента жалоб (по одной записи на каждую отправку) — источник раздела админки. */
export const REPORT_ENTRIES_COLLECTION = 'explain_report_entries';

/** Rate-doc'и репортов (per-user окно). CF-only; в firestore.rules read/write false. */
export const REPORT_RATE_COLLECTION = 'explain_report_rate_limits';

const HOUR_MS = 60 * 60 * 1000;

/** Per-user окно анти-спама репортов: совпадает с конвенцией client_reports (max:5/час). */
export const REPORT_RATE_MAX = 5;
export const REPORT_RATE_WINDOW_MS = HOUR_MS;

/**
 * Сколько РАЗНЫХ юзеров должны пожаловаться на один phraseHash, чтобы авто-reject кэш-запись.
 * Считаются только УНИКАЛЬНЫЕ stableUid (см. reporters) — один юзер не может добить порог сам.
 */
// зачем реэкспорт: до 2026-08-16 константа жила здесь, но НИГДЕ не
// использовалась — имя обещало отклонение при пяти жалобах, а кода не было.
// Теперь она живёт рядом с логикой снятия (auto_retire), а здесь остаётся
// имя, на которое ссылаются тесты и админка. Два объявления одного порога
// неизбежно разошлись бы.
export { REPORT_REJECT_THRESHOLD } from './auto_retire';

/** Белый список причин жалобы (меню в шторке). Неизвестное/пустое значение → 'unclear'. */
export const REPORT_REASONS = ['unclear', 'incorrect', 'wrong_language', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * На какой кэш жалуется юзер. Один CF обслуживает обе фичи, потому что лента и счётчики
 * (explain_report_entries / explain_reports) у них общие — различаются только КЭШ-коллекция
 * и схема ключа:
 *  - 'phrase'  → объяснение фразы («Объясни просто»), кэш phrase_explanations,
 *               ключ = phraseHashFor(phraseEn, langKey).
 *  - 'mistake' → разбор ошибки (упражнение «Собери фразу»), кэш mistake_explanations,
 *               ключ = mistakeHashFor(targetEn, userAnswer, langKey) — учитывает И целевую
 *               фразу, И конкретный неправильный ответ.
 * Дефолт 'phrase' — старые клиенты без поля шлют жалобу на объяснение фразы как раньше.
 */
export const REPORT_KINDS = ['phrase', 'mistake'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** kind строго из enum; чужое/пустое → 'phrase' (обратная совместимость со старыми клиентами). */
export function normalizeReportKind(value: unknown): ReportKind {
  const s = String(value ?? '').trim();
  return (REPORT_KINDS as readonly string[]).includes(s) ? (s as ReportKind) : 'phrase';
}

/** Максимум символов свободного комментария юзера. */
export const REPORT_COMMENT_MAX_LEN = 300;

/** Максимум ключей в карте reporters (ограничение размера дока; порог=5, так что с запасом). */
export const REPORT_REPORTERS_CAP = 50;

function numeric(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Причина — строго из enum; всё чужое схлопывается в 'unclear' (дефолт старых клиентов). */
export function normalizeReportReason(value: unknown): ReportReason {
  const s = String(value ?? '').trim();
  return (REPORT_REASONS as readonly string[]).includes(s) ? (s as ReportReason) : 'unclear';
}

/** Комментарий: без control-символов (кроме переводов строк), trim, жёсткий cap длины. */
export function sanitizeReportComment(value: unknown): string {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .trim()
    .slice(0, REPORT_COMMENT_MAX_LEN);
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
  // зачем секрет здесь: при автоснятии объяснения владелец должен узнать
  // об этом сразу. Молча удалённый кэш выглядел бы как «само исчезло».
  secrets: [ADMIN_ALERT_BOT_TOKEN],
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const kind = normalizeReportKind(request.data?.kind);
  const phraseEn = String(request.data?.phraseEn ?? '').trim();
  if (!phraseEn) throw new HttpsError('invalid-argument', 'phrase_required');
  // Для разбора ошибки kind='mistake' нужен и неправильный ответ — кэш per-(target,userAnswer,lang).
  const userAnswer = String(request.data?.userAnswer ?? '').trim();
  if (kind === 'mistake' && !userAnswer) throw new HttpsError('invalid-argument', 'user_answer_required');
  // Язык объяснения, на которое жалуются. Кэш per-(…,lang) — репорт должен бить в
  // ТОТ ЖЕ док, что генерация. Тот же резолвер (unknown → ru), хэш всё равно считает сервер.
  const lang = String(request.data?.lang ?? '').trim();
  const reason = normalizeReportReason(request.data?.reason);
  const comment = sanitizeReportComment(request.data?.comment);

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Хэш ВСЕГДА выводится сервером — любой клиентский 'hash' игнорируется.
  //  - phrase:  phraseHashFor(phraseEn, langKey)            в phrase_explanations
  //  - mistake: mistakeHashFor(phraseEn=target, userAnswer, langKey) в mistake_explanations
  const langKey = resolvePromptLangKeySoft(lang);
  const cacheCollection = kind === 'mistake'
    ? MISTAKE_COLLECTION
    : EXPLAIN_COLLECTION;
  const cacheHash = kind === 'mistake'
    ? mistakeHashFor(phraseEn, userAnswer, langKey)
    : phraseHashFor(phraseEn, langKey);
  const now = Date.now();

  const rateRef = db.collection(REPORT_RATE_COLLECTION).doc(rateDocId(authUid, stableUid));
  const counterRef = db.collection(REPORTS_COLLECTION).doc(cacheHash);
  const cacheRef = db.collection(cacheCollection).doc(cacheHash);
  // Запись ленты создаётся в ТОЙ ЖЕ tx (ref с auto-id готовим заранее — reads-before-writes).
  const entryRef = db.collection(REPORT_ENTRIES_COLLECTION).doc();

  const outcome = await db.runTransaction(async (tx) => {
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

    // --- счётчик РАЗНЫХ юзеров на phraseHash (дедуп по stableUid) ---
    const counter = counterSnap.data() || {};
    const reporters = { ...((counter.reporters as Record<string, boolean>) ?? {}) };
    const knownReporter = reporters[stableUid] === true;
    const reportersFull = Object.keys(reporters).length >= REPORT_REPORTERS_CAP;
    const isNewReporter = !knownReporter && !reportersFull;
    if (isNewReporter) reporters[stableUid] = true;

    const prevReports = numeric(counter.reportCount);
    const reportCount = isNewReporter ? prevReports + 1 : prevReports;
    const cache = cacheSnap.data() || {};
    const cacheStatus = String(cache.status ?? '');
    // Текст объяснения хранится в разных полях: фраза → 'text', разбор ошибки → 'full'.
    let rawCacheText: unknown;
    if (kind === 'mistake') {
      rawCacheText = cache.full;
    } else {
      rawCacheText = cache.text;
    }
    const explanationText = typeof rawCacheText === 'string' ? rawCacheText.slice(0, 4000) : '';

    // зачем автоснятие (аудит 2026-08-16): до сих пор система знала, что
    // объяснение плохое, но ждала, пока владелец зайдёт в админку и нажмёт
    // «Убрать из кэша». До этого каждый следующий пользователь получал то
    // же самое объяснение, на которое уже пожаловались пятеро.
    //
    // зачем alreadyRetired по отсутствию документа: снятый кэш физически
    // удаляется, поэтому пустой снапшот И ЕСТЬ признак «уже снято». Отдельный
    // флаг завёл бы второй источник правды о том же самом.
    const willRetire = shouldRetireCache({
      reportCount,
      alreadyRetired: !cacheSnap.exists,
    });

    // rate-doc
    tx.set(rateRef, {
      authUid,
      stableUid,
      windowStartMs: sameWindow ? windowStartMs : now,
      count: rateCount + 1,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: now,
    }, { merge: true });

    // Лента для админки: КАЖДАЯ отправка (включая повторную от того же юзера —
    // комментарии разные, админу важны все).
    tx.set(entryRef, {
      // phraseHash оставлен под старым именем (его читает админка/ленты) = cacheHash для обоих kind.
      phraseHash: cacheHash,
      kind,
      cacheCollection,
      phraseEn: phraseEn.slice(0, 200),
      userAnswer: kind === 'mistake' && userAnswer ? userAnswer.slice(0, 200) : null,
      lang: langKey,
      reason,
      comment,
      stableUid,
      authUid,
      status: 'new',
      cacheStatus,
      cacheSchemaVersion: numeric(cache.schemaVersion),
      hasCachedExplanation: !!explanationText,
      explanationText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: now,
    });

    // per-hash counter doc (+ фраза/язык/kind, чтобы админка показывала текст и знала кэш-коллекцию)
    tx.set(counterRef, {
      phraseHash: cacheHash,
      kind,
      cacheCollection,
      phraseEn: phraseEn.slice(0, 200),
      userAnswer: kind === 'mistake' && userAnswer ? userAnswer.slice(0, 200) : null,
      lang: langKey,
      reportCount,
      reporters,
      lastReason: reason,
      lastReporterStableUid: stableUid,
      lastReporterAuthUid: authUid,
      latestCacheStatus: cacheStatus,
      latestExplanationText: explanationText,
      updatedAtMs: now,
      ...(willRetire ? { autoRetiredAtMs: now, autoRetiredCount: reportCount } : {}),
    }, { merge: true });

    // зачем внутри транзакции (аудит 2026-08-16): счётчик и удаление кэша
    // обязаны примениться вместе. Иначе при сбое между ними счётчик покажет
    // «снято», а объяснение останется — и никто больше его не снимет,
    // потому что повторно порог не сработает.
    if (willRetire) tx.delete(cacheRef);

    return {
      ok: true, reportCount, queued: true, flipped: false, rejected: willRetire, kind,
      // зачем наружу: сигнал шлётся ПОСЛЕ коммита — сеть внутри транзакции
      // означала бы, что при повторе транзакции уходит второе сообщение.
      retiredPhrase: willRetire ? phraseEn.slice(0, 120) : null,
      retiredLang: langKey,
    };
  });

  if (outcome.retiredPhrase) {
    // зачем не ронять жалобу при сбое сигнала: жалоба уже принята и кэш
    // уже снят. Упасть здесь значило бы показать пользователю ошибку там,
    // где всё сработало.
    try {
      const cfg = await readAlertsConfig();
      if (alertTypeEnabled(cfg, 'explanationRetired')) {
        const ok = await sendTelegramAlert(
          ADMIN_ALERT_BOT_TOKEN.value(),
          buildRetireAlert({
            phraseEn: outcome.retiredPhrase,
            reportCount: outcome.reportCount,
            lang: outcome.retiredLang,
          }),
          cfg,
        );
        if (ok) await markSent('explanationRetired');
      }
    } catch (error) {
      console.warn('explain_reports: retire alert failed', error);
    }
  }

  return {
    ok: outcome.ok,
    reportCount: outcome.reportCount,
    queued: outcome.queued,
    flipped: outcome.flipped,
    rejected: outcome.rejected,
    kind: outcome.kind,
  };
});
