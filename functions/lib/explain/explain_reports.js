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
exports.submitExplainReport = exports.REPORT_REJECT_THRESHOLD = exports.REPORT_RATE_WINDOW_MS = exports.REPORT_RATE_MAX = exports.REPORT_RATE_COLLECTION = exports.REPORTS_COLLECTION = void 0;
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
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const callable_options_1 = require("../callable_options");
const auth_identity_1 = require("../auth_identity");
const explain_cache_1 = require("./explain_cache");
const REGION = 'us-central1';
/** Per-hash счётчики репортов. Серверная (CF-only) коллекция, в firestore.rules: read/write false. */
exports.REPORTS_COLLECTION = 'explain_reports';
/** Rate-doc'и репортов (per-user окно). CF-only; в firestore.rules read/write false. */
exports.REPORT_RATE_COLLECTION = 'explain_report_rate_limits';
const HOUR_MS = 60 * 60 * 1000;
/** Per-user окно анти-спама репортов: совпадает с конвенцией client_reports (max:5/час). */
exports.REPORT_RATE_MAX = 5;
exports.REPORT_RATE_WINDOW_MS = HOUR_MS;
/**
 * Сколько РАЗНЫХ репортов на один phraseHash, чтобы авто-reject кэш-запись. 5 — под конвенцию
 * max:5 из client_reports. НОВАЯ логика (в submitClientReport счётчика/порога нет).
 */
exports.REPORT_REJECT_THRESHOLD = 5;
function numeric(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
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
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // Хэш ВСЕГДА выводится сервером из phraseEn — любой клиентский 'hash' игнорируется.
    const phraseHash = (0, explain_cache_1.phraseHashFor)(phraseEn);
    const now = Date.now();
    const rateRef = db.collection(exports.REPORT_RATE_COLLECTION).doc(rateDocId(authUid, stableUid));
    const counterRef = db.collection(exports.REPORTS_COLLECTION).doc(phraseHash);
    const cacheRef = db.collection(explain_cache_1.EXPLAIN_COLLECTION).doc(phraseHash);
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
        // --- per-hash счётчик репортов (НОВАЯ логика) ---
        const prevReports = numeric(counterSnap.data()?.reportCount);
        const reportCount = prevReports + 1;
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
                schemaVersion: explain_cache_1.EXPLAIN_SCHEMA_VERSION,
                reason: 'report_threshold',
                updatedAtMs: now,
            }, { merge: true });
        }
        return { ok: true, reportCount, flipped, rejected: alreadyRejected || flipped };
    });
});
//# sourceMappingURL=explain_reports.js.map