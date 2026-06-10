"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitExplainReport = exports.REPORT_REPORTERS_CAP = exports.REPORT_COMMENT_MAX_LEN = exports.REPORT_REASONS = exports.REPORT_REJECT_THRESHOLD = exports.REPORT_RATE_WINDOW_MS = exports.REPORT_RATE_MAX = exports.REPORT_RATE_COLLECTION = exports.REPORT_ENTRIES_COLLECTION = exports.REPORTS_COLLECTION = void 0;
exports.normalizeReportReason = normalizeReportReason;
exports.sanitizeReportComment = sanitizeReportComment;
/**
 * Бэкстоп-модерация (уровень 4) для «Объясни как для 5-летнего».
 *
 * submitExplainReport: юзер жалуется на объяснение фразы. Каркас (auth + per-user rate-doc
 * через транзакцию) скопирован с submitClientReport (functions/src/client_reports.ts:218).
 *
 * Что пишет (всё в ОДНОЙ транзакции):
 *  1) explain_report_entries/{auto} — КАЖДАЯ жалоба целиком (фраза, причина, комментарий,
 *     кто, когда) — это лента для раздела админки «Непонятно объяснили».
 *  2) explain_reports/{phraseHash} — счётчик РАЗНЫХ юзеров на фразу. ДЕДУП: повторная жалоба
 *     того же stableUid НЕ инкрементит счётчик (иначе один юзер в одиночку добивал порог —
 *     rate-limit 5/час == порогу 5). Запись жалобы в ленту при этом всё равно создаётся.
 *  3) если счётчик РАЗНЫХ юзеров >= REPORT_REJECT_THRESHOLD — ставит
 *     phrase_explanations/{phraseHash}.status='rejected' (фраза отдаёт fallback).
 * Инкремент и флип статуса АТОМАРНЫ в одной tx — иначе параллельные репорты проскочат порог.
 *
 * Авто-reject по порогу НЕ регенерируется автоматически (reason=report_threshold — sticky),
 * сбросить может только админ (раздел «Непонятно объяснили» в админке → «Сбросить кэш»).
 *
 * SECURITY (инварианты phraseman):
 *  - App Check enforced (ENFORCE_APP_CHECK из callable_options).
 *  - Идентичность из request.auth.uid через resolveStableUidForAuth(db, authUid) — НЕ из body.
 *  - phraseHash считает сервер (explain_cache.phraseHashFor); поле 'hash' из body игнорируется.
 *  - reason — только из белого списка; comment режется по длине и чистится от control-символов.
 */
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const callable_options_1 = require("../callable_options");
const auth_identity_1 = require("../auth_identity");
const explain_cache_1 = require("./explain_cache");
const explain_prompts_1 = require("./explain_prompts");
const REGION = 'us-central1';
/** Per-hash счётчики репортов. Серверная коллекция; админка читает (isAdmin в rules). */
exports.REPORTS_COLLECTION = 'explain_reports';
/** Лента жалоб (по одной записи на каждую отправку) — источник раздела админки. */
exports.REPORT_ENTRIES_COLLECTION = 'explain_report_entries';
/** Rate-doc'и репортов (per-user окно). CF-only; в firestore.rules read/write false. */
exports.REPORT_RATE_COLLECTION = 'explain_report_rate_limits';
const HOUR_MS = 60 * 60 * 1000;
/** Per-user окно анти-спама репортов: совпадает с конвенцией client_reports (max:5/час). */
exports.REPORT_RATE_MAX = 5;
exports.REPORT_RATE_WINDOW_MS = HOUR_MS;
/**
 * Сколько РАЗНЫХ юзеров должны пожаловаться на один phraseHash, чтобы авто-reject кэш-запись.
 * Считаются только УНИКАЛЬНЫЕ stableUid (см. reporters) — один юзер не может добить порог сам.
 */
exports.REPORT_REJECT_THRESHOLD = 5;
/** Белый список причин жалобы (меню в шторке). Неизвестное/пустое значение → 'unclear'. */
exports.REPORT_REASONS = ['unclear', 'incorrect', 'wrong_language', 'other'];
/** Максимум символов свободного комментария юзера. */
exports.REPORT_COMMENT_MAX_LEN = 300;
/** Максимум ключей в карте reporters (ограничение размера дока; порог=5, так что с запасом). */
exports.REPORT_REPORTERS_CAP = 50;
function numeric(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
/** Причина — строго из enum; всё чужое схлопывается в 'unclear' (дефолт старых клиентов). */
function normalizeReportReason(value) {
    const s = String(value ?? '').trim();
    return exports.REPORT_REASONS.includes(s) ? s : 'unclear';
}
/** Комментарий: без control-символов (кроме переводов строк), trim, жёсткий cap длины. */
function sanitizeReportComment(value) {
    return String(value ?? '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
        .trim()
        .slice(0, exports.REPORT_COMMENT_MAX_LEN);
}
/** sha256 doc id rate-дока, та же форма, что rateDocId() в client_reports. */
function rateDocId(authUid, stableUid) {
    const hash = (0, crypto_1.createHash)('sha256').update(`explain_report|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
    return `explain_report_${hash}`;
}
exports.submitExplainReport = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 40,
}, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const phraseEn = String(request.data?.phraseEn ?? '').trim();
    if (!phraseEn)
        throw new https_1.HttpsError('invalid-argument', 'phrase_required');
    // Язык объяснения, на которое жалуются. Кэш per-(phrase,lang) — репорт должен бить в
    // ТОТ ЖЕ док, что генерация. Тот же резолвер (unknown → ru), хэш всё равно считает сервер.
    const lang = String(request.data?.lang ?? '').trim();
    const reason = normalizeReportReason(request.data?.reason);
    const comment = sanitizeReportComment(request.data?.comment);
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // Хэш ВСЕГДА выводится сервером из (phraseEn, langKey) — любой клиентский 'hash' игнорируется.
    const langKey = (0, explain_prompts_1.resolvePromptLangKey)(lang);
    const phraseHash = (0, explain_cache_1.phraseHashFor)(phraseEn, langKey);
    const now = Date.now();
    const rateRef = db.collection(exports.REPORT_RATE_COLLECTION).doc(rateDocId(authUid, stableUid));
    const counterRef = db.collection(exports.REPORTS_COLLECTION).doc(phraseHash);
    const cacheRef = db.collection(explain_cache_1.EXPLAIN_COLLECTION).doc(phraseHash);
    // Запись ленты создаётся в ТОЙ ЖЕ tx (ref с auto-id готовим заранее — reads-before-writes).
    const entryRef = db.collection(exports.REPORT_ENTRIES_COLLECTION).doc();
    return db.runTransaction(async (tx) => {
        // --- читаем всё ДО записи (Firestore требует reads-before-writes) ---
        const rateSnap = await tx.get(rateRef);
        const counterSnap = await tx.get(counterRef);
        const cacheSnap = await tx.get(cacheRef);
        // --- per-user rate-limit (каркас из submitClientReport) ---
        const rate = rateSnap.data() || {};
        const windowStartMs = numeric(rate.windowStartMs);
        const sameWindow = now - windowStartMs < exports.REPORT_RATE_WINDOW_MS;
        const rateCount = sameWindow ? numeric(rate.count) : 0;
        if (rateCount >= exports.REPORT_RATE_MAX) {
            throw new https_1.HttpsError('resource-exhausted', 'rate_limited');
        }
        // --- счётчик РАЗНЫХ юзеров на phraseHash (дедуп по stableUid) ---
        const counter = counterSnap.data() || {};
        const reporters = { ...(counter.reporters ?? {}) };
        const knownReporter = reporters[stableUid] === true;
        const reportersFull = Object.keys(reporters).length >= exports.REPORT_REPORTERS_CAP;
        const isNewReporter = !knownReporter && !reportersFull;
        if (isNewReporter)
            reporters[stableUid] = true;
        const prevReports = numeric(counter.reportCount);
        const reportCount = isNewReporter ? prevReports + 1 : prevReports;
        const reachedThreshold = reportCount >= exports.REPORT_REJECT_THRESHOLD;
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
        // Лента для админки: КАЖДАЯ отправка (включая повторную от того же юзера —
        // комментарии разные, админу важны все).
        tx.set(entryRef, {
            phraseHash,
            phraseEn: phraseEn.slice(0, 200),
            lang: langKey,
            reason,
            comment,
            stableUid,
            authUid,
            status: 'new',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAtMs: now,
        });
        // per-hash counter doc (+ фраза/язык, чтобы админка показывала текст, а не только хэш)
        tx.set(counterRef, {
            phraseHash,
            phraseEn: phraseEn.slice(0, 200),
            lang: langKey,
            reportCount,
            reporters,
            lastReason: reason,
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
                schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
                reason: explain_cache_1.REPORT_REJECT_REASON,
                updatedAtMs: now,
            }, { merge: true });
        }
        return { ok: true, reportCount, flipped, rejected: alreadyRejected || flipped };
    });
});
//# sourceMappingURL=explain_reports.js.map