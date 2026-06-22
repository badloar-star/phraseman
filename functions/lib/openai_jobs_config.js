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
exports.openAiJobsConfig = exports.ALLOWED_JOB_MODELS = exports.OPENAI_JOBS = void 0;
exports.resolveJobConfig = resolveJobConfig;
exports.assertJobEnabled = assertJobEnabled;
// ════════════════════════════════════════════════════════════════════════════
// openai_jobs_config.ts — админ-тюнинг моделей/капов/выключателей для платных
// OpenAI-функций weekly_review / stats_insights / explain_phrase.
//
// Зачем: эти функции жёстко зашивали модель и дневные капы в код (правка =
// передеплой). Здесь — тот же паттерн, что у диалога (admin_runtime_config),
// но для «джобов». Один Firestore-док `admin_runtime_config/openai_jobs`,
// один admin-CF `openAiJobsConfig` (get/set). Сервер читает через
// resolveJobConfig(); ПРИ ОТСУТСТВИИ дока поведение НЕ меняется — fallback на
// текущие хардкод-дефолты каждой функции.
//
// Также даёт kill-switch: enabled=false → функция мгновенно перестаёт жечь
// OpenAI (аварийный стоп расходов без передеплоя).
// ════════════════════════════════════════════════════════════════════════════
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'us-central1';
const CONFIG_COLLECTION = 'admin_runtime_config';
const CONFIG_DOC = 'openai_jobs';
exports.OPENAI_JOBS = ['weekly', 'stats', 'explain', 'dialog', 'choice', 'compass', 'quiz'];
exports.ALLOWED_JOB_MODELS = [
    'gpt-4.1-nano',
    'gpt-4.1-mini',
    'gpt-4.1',
    'gpt-4o-mini',
];
const DAILY_CAP_MAX = 1000000;
const JOB_DEFAULTS = {
    weekly: { model: 'gpt-4o-mini', globalDailyCap: 0 },
    stats: { model: 'gpt-4o-mini', globalDailyCap: 5000 },
    explain: { model: 'gpt-4o-mini', globalDailyCap: 3000 },
    dialog: { model: 'gpt-4.1-nano', globalDailyCap: 0 },
    choice: { model: 'gpt-4o-mini', globalDailyCap: 3000 },
    // Компас: дешёвый тёплый комментарий дня. nano-модель + кэш 1-на-продукт
    // (подписей дня мало, повторяются между учениками) → почти бесплатно.
    compass: { model: 'gpt-4.1-nano', globalDailyCap: 5000 },
    // Тематические квизы: батч-«разбор» 1-на-вопрос (вопросов мало, повторяются между учениками) →
    // кэш прогревается быстро. Та же дешёвая модель и кап, что у choice (родственная фича).
    quiz: { model: 'gpt-4o-mini', globalDailyCap: 3000 },
};
function text(value, max = 120) {
    return String(value ?? '').trim().slice(0, max);
}
function isAllowedJob(value) {
    return exports.OPENAI_JOBS.includes(text(value, 20));
}
function normalizeModel(value, fallback) {
    const m = text(value, 80);
    return exports.ALLOWED_JOB_MODELS.includes(m) ? m : fallback;
}
function normalizeCap(value, fallback) {
    const raw = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    const n = typeof raw === 'number' ? raw : NaN;
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(DAILY_CAP_MAX, Math.max(0, Math.floor(n)));
}
function jobFromData(job, data) {
    const d = (data && typeof data === 'object' ? data[job] : undefined);
    const def = JOB_DEFAULTS[job];
    return {
        model: normalizeModel(d?.model, def.model),
        globalDailyCap: normalizeCap(d?.globalDailyCap, def.globalDailyCap),
        // enabled по умолчанию TRUE (kill-switch семантика): фича работает, выключается вручную.
        enabled: d?.enabled === false ? false : true,
    };
}
/**
 * Резолвит конфиг джоба (model+cap+enabled) из Firestore с fallback на дефолты.
 * НИКОГДА не бросает: при ошибке/отсутствии дока возвращает дефолты (поведение
 * как до фичи). Один get на вызов функции — дешёво, кэшировать не обязательно.
 */
async function resolveJobConfig(db, job) {
    try {
        const snap = await db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC).get();
        return jobFromData(job, snap.data());
    }
    catch (e) {
        console.warn('resolveJobConfig failed, using fallback', job, e);
        return jobFromData(job, undefined);
    }
}
/** Бросает resource-exhausted, если джоб выключен админом. Вызывать в начале CF. */
function assertJobEnabled(cfg, job) {
    if (!cfg.enabled) {
        throw new https_1.HttpsError('resource-exhausted', `${job}_disabled_by_admin`);
    }
}
// ── Admin CF: чтение/запись конфига всех джобов ─────────────────────────────
exports.openAiJobsConfig = (0, https_1.onCall)({ region: REGION }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const db = admin.firestore();
    const ref = db.collection(CONFIG_COLLECTION).doc(CONFIG_DOC);
    const action = text(request.data?.action, 20) || 'get';
    if (action === 'set') {
        const job = request.data?.job;
        if (!isAllowedJob(job))
            throw new https_1.HttpsError('invalid-argument', 'unsupported_job');
        const def = JOB_DEFAULTS[job];
        const prevSnap = await ref.get();
        const prev = jobFromData(job, prevSnap.data());
        const next = {
            model: request.data?.model == null ? prev.model : normalizeModel(request.data.model, def.model),
            globalDailyCap: request.data?.globalDailyCap == null
                ? prev.globalDailyCap
                : normalizeCap(request.data.globalDailyCap, def.globalDailyCap),
            enabled: request.data?.enabled == null ? prev.enabled : request.data.enabled !== false,
        };
        await ref.set({
            [job]: next,
            allowedModels: exports.ALLOWED_JOB_MODELS,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAtMs: Date.now(),
            updatedBy: text(request.auth?.token?.email, 200) || 'admin',
        }, { merge: true });
    }
    else if (action !== 'get') {
        throw new https_1.HttpsError('invalid-argument', 'unsupported_action');
    }
    const snap = await ref.get();
    const jobs = {};
    for (const j of exports.OPENAI_JOBS)
        jobs[j] = jobFromData(j, snap.data());
    return {
        ok: true,
        jobs,
        defaults: JOB_DEFAULTS,
        allowedModels: exports.ALLOWED_JOB_MODELS,
        updatedAtMs: Number(snap.data()?.updatedAtMs || 0),
    };
});
//# sourceMappingURL=openai_jobs_config.js.map