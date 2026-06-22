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
exports.submitExplainReport = exports.REPORT_REPORTERS_CAP = exports.REPORT_COMMENT_MAX_LEN = exports.REPORT_KINDS = exports.REPORT_REASONS = exports.REPORT_REJECT_THRESHOLD = exports.REPORT_RATE_WINDOW_MS = exports.REPORT_RATE_MAX = exports.REPORT_RATE_COLLECTION = exports.REPORT_ENTRIES_COLLECTION = exports.REPORTS_COLLECTION = void 0;
exports.normalizeReportKind = normalizeReportKind;
exports.normalizeReportReason = normalizeReportReason;
exports.sanitizeReportComment = sanitizeReportComment;
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
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const crypto_1 = require("crypto");
const callable_options_1 = require("../callable_options");
const auth_identity_1 = require("../auth_identity");
const explain_cache_1 = require("./explain_cache");
const mistake_explain_cache_1 = require("./mistake_explain_cache");
const quiz_explain_cache_1 = require("./quiz_explain_cache");
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
/**
 * На какой кэш жалуется юзер. Один CF обслуживает обе фичи, потому что лента и счётчики
 * (explain_report_entries / explain_reports) у них общие — различаются только КЭШ-коллекция
 * и схема ключа:
 *  - 'phrase'  → объяснение фразы («Объясни просто»), кэш phrase_explanations,
 *               ключ = phraseHashFor(phraseEn, langKey).
 *  - 'mistake' → разбор ошибки (упражнение «Собери фразу»), кэш mistake_explanations,
 *               ключ = mistakeHashFor(targetEn, userAnswer, langKey) — учитывает И целевую
 *               фразу, И конкретный неправильный ответ.
 *  - 'quiz'    → ИИ-разбор тематического квиза, кэш quiz_explanations,
 *               ключ = quizHashFor(correctEn=phraseEn, allChoices, langKey) — учитывает правильный
 *               ответ И весь набор вариантов (порядок не важен: набор сортируется). Поэтому
 *               для 'quiz' клиент ОБЯЗАН прислать `choices` (все варианты вопроса).
 * Дефолт 'phrase' — старые клиенты без поля шлют жалобу на объяснение фразы как раньше.
 */
exports.REPORT_KINDS = ['phrase', 'mistake', 'quiz'];
/** kind строго из enum; чужое/пустое → 'phrase' (обратная совместимость со старыми клиентами). */
function normalizeReportKind(value) {
    const s = String(value ?? '').trim();
    return exports.REPORT_KINDS.includes(s) ? s : 'phrase';
}
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
    const kind = normalizeReportKind(request.data?.kind);
    const phraseEn = String(request.data?.phraseEn ?? '').trim();
    if (!phraseEn)
        throw new https_1.HttpsError('invalid-argument', 'phrase_required');
    // Для разбора ошибки kind='mistake' нужен и неправильный ответ — кэш per-(target,userAnswer,lang).
    const userAnswer = String(request.data?.userAnswer ?? '').trim();
    if (kind === 'mistake' && !userAnswer)
        throw new https_1.HttpsError('invalid-argument', 'user_answer_required');
    // Для квиза kind='quiz' нужен весь набор вариантов — кэш per-(correct, option-set, lang).
    // Сервер сам нормализует/сортирует набор внутри quizHashFor; порядок от клиента не важен.
    const rawChoices = Array.isArray(request.data?.choices) ? request.data.choices : [];
    const quizChoices = rawChoices
        .map((c) => String(c ?? '').trim())
        .filter((c) => Boolean(c))
        .slice(0, 12);
    if (kind === 'quiz' && quizChoices.length < 2) {
        throw new https_1.HttpsError('invalid-argument', 'choices_required');
    }
    // Язык объяснения, на которое жалуются. Кэш per-(…,lang) — репорт должен бить в
    // ТОТ ЖЕ док, что генерация. Тот же резолвер (unknown → ru), хэш всё равно считает сервер.
    const lang = String(request.data?.lang ?? '').trim();
    const reason = normalizeReportReason(request.data?.reason);
    const comment = sanitizeReportComment(request.data?.comment);
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    // Хэш ВСЕГДА выводится сервером — любой клиентский 'hash' игнорируется.
    //  - phrase:  phraseHashFor(phraseEn, langKey)            в phrase_explanations
    //  - mistake: mistakeHashFor(phraseEn=target, userAnswer, langKey) в mistake_explanations
    //  - quiz:    quizHashFor(phraseEn=correct, quizChoices, langKey) в quiz_explanations
    const langKey = (0, explain_prompts_1.resolvePromptLangKey)(lang);
    const cacheCollection = kind === 'mistake'
        ? mistake_explain_cache_1.MISTAKE_COLLECTION
        : kind === 'quiz'
            ? quiz_explain_cache_1.QUIZ_COLLECTION
            : explain_cache_1.EXPLAIN_COLLECTION;
    const cacheHash = kind === 'mistake'
        ? (0, mistake_explain_cache_1.mistakeHashFor)(phraseEn, userAnswer, langKey)
        : kind === 'quiz'
            ? (0, quiz_explain_cache_1.quizHashFor)(phraseEn, quizChoices, langKey)
            : (0, explain_cache_1.phraseHashFor)(phraseEn, langKey);
    const now = Date.now();
    const rateRef = db.collection(exports.REPORT_RATE_COLLECTION).doc(rateDocId(authUid, stableUid));
    const counterRef = db.collection(exports.REPORTS_COLLECTION).doc(cacheHash);
    const cacheRef = db.collection(cacheCollection).doc(cacheHash);
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
        const cache = cacheSnap.data() || {};
        const cacheStatus = String(cache.status ?? '');
        // Текст объяснения хранится в разных полях: фраза → 'text', разбор ошибки → 'full',
        // квиз → 'confirm' (разбор правильного) + карта 'options' (по варианту). Для админки
        // склеиваем квиз-батч в один читаемый блок.
        let rawCacheText;
        if (kind === 'mistake') {
            rawCacheText = cache.full;
        }
        else if (kind === 'quiz') {
            const confirm = typeof cache.confirm === 'string' ? cache.confirm : '';
            const optionsMap = cache.options && typeof cache.options === 'object'
                ? cache.options
                : {};
            const optionLines = Object.entries(optionsMap)
                .map(([opt, line]) => `${opt}: ${String(line ?? '')}`);
            rawCacheText = [confirm, ...optionLines].filter(Boolean).join('\n');
        }
        else {
            rawCacheText = cache.text;
        }
        const explanationText = typeof rawCacheText === 'string' ? rawCacheText.slice(0, 4000) : '';
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
            // userAnswer пишем для разбора ошибки и квиза — чтобы админ видел КОНКРЕТНЫЙ выбранный ответ.
            userAnswer: (kind === 'mistake' || kind === 'quiz') && userAnswer ? userAnswer.slice(0, 200) : null,
            // choices пишем только для квиза — весь набор вариантов (для контекста админа; хэш считает сервер).
            choices: kind === 'quiz' ? quizChoices.map((c) => c.slice(0, 200)) : null,
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
            userAnswer: (kind === 'mistake' || kind === 'quiz') && userAnswer ? userAnswer.slice(0, 200) : null,
            lang: langKey,
            reportCount,
            reporters,
            lastReason: reason,
            lastReporterStableUid: stableUid,
            lastReporterAuthUid: authUid,
            latestCacheStatus: cacheStatus,
            latestExplanationText: explanationText,
            updatedAtMs: now,
        }, { merge: true });
        return { ok: true, reportCount, queued: true, flipped: false, rejected: false, kind };
    });
});
//# sourceMappingURL=explain_reports.js.map