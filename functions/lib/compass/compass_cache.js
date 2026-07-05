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
exports.COMPASS_REJECTED_RETRY_TTL_MS = exports.COMPASS_SCHEMA_VERSION = exports.COMPASS_LOCK_TTL_MS = exports.COMPASS_COLLECTION = void 0;
exports.compassSignature = compassSignature;
exports.compassHashFor = compassHashFor;
exports.isRetryableRejected = isRetryableRejected;
exports.readCachedCompass = readCachedCompass;
exports.claimCompassLock = claimCompassLock;
exports.writeReadyCompass = writeReadyCompass;
exports.writeRejectedCompass = writeRejectedCompass;
/**
 * Компас — кэш тёплого комментария дня. Клон паттерна explain_cache.
 *
 * Один комментарий на (подпись дня, язык) = одна генерация на ВЕСЬ продукт.
 * Подписей дня немного и они повторяются между учениками («новичок, слаб в
 * артиклях, день-ремонт»), поэтому ≥90% показов — из кэша, 0 токенов.
 *
 * SECURITY: пишет только Cloud Function (Admin SDK). firestore.rules: read public,
 * write false, delete admin. Клиент хэш не шлёт — сервер выводит из briefing-числа.
 */
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
exports.COMPASS_COLLECTION = 'compass_briefings';
exports.COMPASS_LOCK_TTL_MS = 30000;
// v2 (2026-06-21): audit fixes — ≤10 words/sentence, few-shot per dayType, ban filler words,
// ban inventing numbers, allow one light human touch. Old v1 lines predate these, regenerate.
// v3 (2026-07-03): the day-comment was being validated by the PHRASE judge (judgeExplanation),
// which rejected every comment as off_topic ("not about an English phrase") → the entire cache was
// stuck at rejected. Fixed to a dedicated Compass judge; bump the version so all the wrongly-rejected
// v2 docs are treated as stale and regenerated fresh instead of waiting on the per-doc retry TTL.
exports.COMPASS_SCHEMA_VERSION = 3;
exports.COMPASS_REJECTED_RETRY_TTL_MS = 10 * 60000;
function isCurrentSchema(data) {
    return Number(data?.schemaVersion ?? 0) >= exports.COMPASS_SCHEMA_VERSION;
}
/**
 * Подпись дня = детерминированный отпечаток того, что определяет текст:
 * тип дня + список тем + грубый уровень. НЕ включает личные данные. Это и есть
 * ключ кэша: одинаковая подпись у тысяч учеников → одна генерация.
 */
function compassSignature(input) {
    const topics = [...input.topics].map((t) => t.trim().toLowerCase()).filter(Boolean).sort();
    return `${input.dayType}|lvl${Math.max(0, Math.floor(input.level))}|${topics.join(',')}`;
}
function compassHashFor(signature, langKey) {
    return (0, crypto_1.createHash)('sha256')
        .update(`${String(langKey ?? '').trim().toLowerCase()}|${String(signature ?? '').trim().toLowerCase()}`)
        .digest('hex')
        .slice(0, 40);
}
function docRef(hash) {
    return admin.firestore().collection(exports.COMPASS_COLLECTION).doc(hash);
}
function isRetryableRejected(data, nowMs) {
    if (!data || data.status !== 'rejected')
        return false;
    return nowMs - Number(data.updatedAtMs ?? 0) > exports.COMPASS_REJECTED_RETRY_TTL_MS;
}
async function readCachedCompass(hash) {
    const snap = await docRef(hash).get();
    const data = snap.data();
    if (!data)
        return null;
    if (!isCurrentSchema(data))
        return null;
    return data;
}
async function claimCompassLock(hash, nowMs) {
    const ref = docRef(hash);
    const db = admin.firestore();
    return db.runTransaction(async (tx) => {
        const data = (await tx.get(ref)).data();
        if (data && isCurrentSchema(data)) {
            if (data.status === 'ready')
                return false;
            if (data.status === 'rejected' && !isRetryableRejected(data, nowMs))
                return false;
            if (data.status === 'pending') {
                const stale = nowMs - Number(data.createdAtMs ?? 0) > exports.COMPASS_LOCK_TTL_MS;
                if (!stale)
                    return false;
            }
        }
        tx.set(ref, { status: 'pending', schemaVersion: exports.COMPASS_SCHEMA_VERSION, reason: null, createdAtMs: nowMs, updatedAtMs: nowMs }, { merge: true });
        return true;
    });
}
async function writeReadyCompass(hash, comment, meta) {
    await docRef(hash).set({ status: 'ready', schemaVersion: exports.COMPASS_SCHEMA_VERSION, comment, lang: meta.lang, model: meta.model ?? null, reason: null, updatedAtMs: Date.now() }, { merge: true });
}
async function writeRejectedCompass(hash, reason) {
    await docRef(hash).set({ status: 'rejected', schemaVersion: exports.COMPASS_SCHEMA_VERSION, reason, updatedAtMs: Date.now() }, { merge: true });
}
//# sourceMappingURL=compass_cache.js.map