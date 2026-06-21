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
exports.openAiDialogQuotaConfig = exports.openAiDialogModelConfig = exports.ALLOWED_DIALOG_MODELS = exports.DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT = exports.DIALOG_FREE_DAILY_REPLIES_DEFAULT = void 0;
exports.modelSupportsJsonObject = modelSupportsJsonObject;
exports.resolveConfiguredDialogModel = resolveConfiguredDialogModel;
exports.resolveConfiguredDialogQuota = resolveConfiguredDialogQuota;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
const CONFIG_COLLECTION = 'admin_runtime_config';
const CONFIG_DOC = 'openai_dialog_model';
const QUOTA_CONFIG_DOC = 'openai_dialog_quota';
// Дефолт диалога = gpt-4o-mini: поддерживает response_format json_object, нужный
// «диалогу как игре» (gpt-4.1-nano его НЕ поддерживает → игра бы не включилась;
// аудит C1). Цена 4o-mini сопоставима с nano, остальные json-функции проекта
// (stats_insights/weekly_review/explain_choice) тоже на 4o-mini.
const MODEL_DEFAULT = 'gpt-4o-mini';
exports.DIALOG_FREE_DAILY_REPLIES_DEFAULT = 3;
exports.DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT = 100;
const DIALOG_DAILY_REPLIES_MAX = 10000;
exports.ALLOWED_DIALOG_MODELS = [
    'gpt-4.1-nano',
    'gpt-4.1-mini',
    'gpt-4.1',
    'gpt-4o-mini',
];
/**
 * Какие диалоговые модели надёжно поддерживают `response_format: json_object`.
 * Нужно для «диалога как игры»: он просит модель вернуть строгий JSON-конверт.
 * Дефолтная `gpt-4.1-nano` — самая урезанная, JSON mode на ней ненадёжен →
 * НЕ включаем для неё игровой режим (упал бы HTTP 400, см. аудит C1). Для таких
 * моделей диалог идёт обычным текстом без игровой механики (мягкая деградация).
 *
 * Источник истины: остальные json_object-функции проекта (stats_insights,
 * weekly_review, explain_choice) намеренно работают на gpt-4o-mini.
 */
const JSON_OBJECT_SUPPORTED_MODELS = {
    'gpt-4o-mini': true,
    'gpt-4.1': true,
    'gpt-4.1-mini': true,
    'gpt-4.1-nano': false,
};
/** true — модель надёжно поддерживает response_format json_object. */
function modelSupportsJsonObject(model) {
    return JSON_OBJECT_SUPPORTED_MODELS[model] === true;
}
function text(value, max = 120) {
    return String(value ?? '').trim().slice(0, max);
}
function isAllowedDialogModel(model) {
    return exports.ALLOWED_DIALOG_MODELS.includes(model);
}
function normalizeDialogModel(value) {
    const model = text(value, 80);
    return isAllowedDialogModel(model) ? model : null;
}
function normalizeDailyReplies(value) {
    const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    const n = typeof raw === 'number' ? raw : NaN;
    if (!Number.isFinite(n))
        return null;
    const clean = Math.floor(n);
    if (clean < 0 || clean > DIALOG_DAILY_REPLIES_MAX)
        return null;
    return clean;
}
function quotaFromData(data) {
    return {
        freeDailyReplies: normalizeDailyReplies(data?.freeDailyReplies) ?? exports.DIALOG_FREE_DAILY_REPLIES_DEFAULT,
        premiumDailyReplies: normalizeDailyReplies(data?.premiumDailyReplies) ?? exports.DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT,
    };
}
async function resolveConfiguredDialogModel(db, envModel) {
    try {
        const snap = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
        const configured = normalizeDialogModel(snap.data()?.model);
        if (configured)
            return configured;
    }
    catch (e) {
        console.warn('resolveConfiguredDialogModel failed, using fallback', e);
    }
    return normalizeDialogModel(envModel) || MODEL_DEFAULT;
}
async function resolveConfiguredDialogQuota(db) {
    try {
        const snap = await db.collection(CONFIG_COLLECTION).doc(QUOTA_CONFIG_DOC).get();
        return quotaFromData(snap.data());
    }
    catch (e) {
        console.warn('resolveConfiguredDialogQuota failed, using fallback', e);
        return quotaFromData(undefined);
    }
}
exports.openAiDialogModelConfig = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const db = admin.firestore();
    const ref = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);
    const action = text(request.data?.action, 20) || 'get';
    if (action === 'set') {
        const model = normalizeDialogModel(request.data?.model);
        if (!model) {
            throw new https_1.HttpsError('invalid-argument', 'unsupported_dialog_model');
        }
        await ref.set({
            model,
            allowedModels: exports.ALLOWED_DIALOG_MODELS,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAtMs: Date.now(),
            updatedBy: text(request.auth?.token?.email, 200) || 'admin',
        }, { merge: true });
    }
    else if (action !== 'get') {
        throw new https_1.HttpsError('invalid-argument', 'unsupported_action');
    }
    const snap = await ref.get();
    const configured = normalizeDialogModel(snap.data()?.model);
    const activeModel = configured || normalizeDialogModel(process.env.OPENAI_DIALOG_MODEL) || MODEL_DEFAULT;
    return {
        ok: true,
        activeModel,
        configuredModel: configured,
        defaultModel: MODEL_DEFAULT,
        allowedModels: exports.ALLOWED_DIALOG_MODELS,
        updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
    };
});
exports.openAiDialogQuotaConfig = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const db = admin.firestore();
    const ref = db.collection(CONFIG_COLLECTION).doc(QUOTA_CONFIG_DOC);
    const action = text(request.data?.action, 20) || 'get';
    if (action === 'set') {
        const current = quotaFromData((await ref.get()).data());
        const freeDailyReplies = request.data?.freeDailyReplies == null
            ? current.freeDailyReplies
            : normalizeDailyReplies(request.data.freeDailyReplies);
        const premiumDailyReplies = request.data?.premiumDailyReplies == null
            ? current.premiumDailyReplies
            : normalizeDailyReplies(request.data.premiumDailyReplies);
        if (freeDailyReplies == null || premiumDailyReplies == null) {
            throw new https_1.HttpsError('invalid-argument', 'unsupported_dialog_quota');
        }
        await ref.set({
            freeDailyReplies,
            premiumDailyReplies,
            defaultFreeDailyReplies: exports.DIALOG_FREE_DAILY_REPLIES_DEFAULT,
            defaultPremiumDailyReplies: exports.DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT,
            maxDailyReplies: DIALOG_DAILY_REPLIES_MAX,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAtMs: Date.now(),
            updatedBy: text(request.auth?.token?.email, 200) || 'admin',
        }, { merge: true });
    }
    else if (action !== 'get') {
        throw new https_1.HttpsError('invalid-argument', 'unsupported_action');
    }
    const snap = await ref.get();
    const activeQuota = quotaFromData(snap.data());
    return {
        ok: true,
        ...activeQuota,
        defaultFreeDailyReplies: exports.DIALOG_FREE_DAILY_REPLIES_DEFAULT,
        defaultPremiumDailyReplies: exports.DIALOG_PREMIUM_DAILY_REPLIES_DEFAULT,
        maxDailyReplies: DIALOG_DAILY_REPLIES_MAX,
        updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
    };
});
//# sourceMappingURL=openai_dialog_model_config.js.map