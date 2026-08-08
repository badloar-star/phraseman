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
exports.openAiBudgetDashboard = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 90;
const MAX_DOCS_PER_COLLECTION = 2000;
const OPENAI_MODEL_PRICES = {
    'gpt-4.1-nano': { input: 0.10, cachedInput: 0.025, output: 0.40 },
    'gpt-4.1-mini': { input: 0.40, cachedInput: 0.10, output: 1.60 },
    'gpt-4.1': { input: 2.00, cachedInput: 0.50, output: 8.00 },
    'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.60 },
};
function num(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
}
function text(value, max = 120) {
    return String(value ?? '').trim().slice(0, max);
}
function clampDays(value) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n <= 0)
        return 30;
    return Math.max(1, Math.min(MAX_DAYS, n));
}
function createdMs(data) {
    const direct = num(data.createdAtMs);
    if (direct)
        return direct;
    const ts = data.createdAt;
    if (ts && typeof ts.toMillis === 'function') {
        try {
            return ts.toMillis();
        }
        catch {
            return 0;
        }
    }
    const parsed = Date.parse(String(data.createdAt || data.ts || ''));
    return Number.isFinite(parsed) ? parsed : 0;
}
function priceFor(model) {
    return OPENAI_MODEL_PRICES[model] || OPENAI_MODEL_PRICES['gpt-4.1-nano'];
}
function costUsd(model, inputTokens, outputTokens) {
    const p = priceFor(model);
    return (inputTokens / 1000000) * p.input + (outputTokens / 1000000) * p.output;
}
function usageFromDoc(collectionName, feature, snap) {
    const data = snap.data() || {};
    const model = text(data.model, 80) || 'gpt-4o-mini';
    // Разные фичи пишут токены в РАЗНЫХ полях. Три схемы:
    //  A) promptTokens/completionTokens        — dialog, weekly, stats, mistake, speaking, league-cron
    //  B) genPromptTokens/genCompletionTokens + judgePromptTokens/judgeCompletionTokens — explain, choice, compass
    // Суммируем все варианты — отсутствующие поля дают 0, поэтому одна формула
    // корректно покрывает все 11 billing-коллекций без спец-веток на коллекцию.
    const inputTokens = num(data.promptTokens) + num(data.genPromptTokens) + num(data.judgePromptTokens);
    const outputTokens = num(data.completionTokens) + num(data.genCompletionTokens) + num(data.judgeCompletionTokens);
    const totalTokens = num(data.totalTokens) || inputTokens + outputTokens;
    return {
        id: snap.id,
        feature,
        collection: collectionName,
        model,
        inputTokens,
        outputTokens,
        totalTokens,
        costUsd: costUsd(model, inputTokens, outputTokens),
        uid: text(data.uid || data.authUid, 120),
        createdAtMs: createdMs(data),
    };
}
async function openAiBudgetSafeGetDocs(collectionName, fromMs) {
    try {
        const snap = await admin.firestore()
            .collection(collectionName)
            .where('createdAtMs', '>=', fromMs)
            .limit(MAX_DOCS_PER_COLLECTION)
            .get();
        return { docs: snap.docs };
    }
    catch (e) {
        console.warn('openAiBudgetSafeGetDocs failed', collectionName, e);
        return { docs: [], error: e instanceof Error ? e.message : String(e) };
    }
}
function aggregate(rows, rangeDays) {
    const total = rows.reduce((acc, row) => {
        acc.calls += 1;
        acc.inputTokens += row.inputTokens;
        acc.outputTokens += row.outputTokens;
        acc.totalTokens += row.totalTokens;
        acc.costUsd += row.costUsd;
        if (row.uid)
            acc.uniqueUsers.add(row.uid);
        return acc;
    }, {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        uniqueUsers: new Set(),
    });
    const group = (key) => {
        const map = new Map();
        for (const row of rows) {
            const label = row[key] || 'unknown';
            const cur = map.get(label) || {
                calls: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                costUsd: 0,
                uniqueUsers: new Set(),
            };
            cur.calls += 1;
            cur.inputTokens += row.inputTokens;
            cur.outputTokens += row.outputTokens;
            cur.totalTokens += row.totalTokens;
            cur.costUsd += row.costUsd;
            if (row.uid)
                cur.uniqueUsers.add(row.uid);
            map.set(label, cur);
        }
        return Array.from(map.entries())
            .map(([label, value]) => ({
            label,
            calls: value.calls,
            inputTokens: value.inputTokens,
            outputTokens: value.outputTokens,
            totalTokens: value.totalTokens,
            costUsd: value.costUsd,
            uniqueUsers: value.uniqueUsers.size,
            avgCostUsd: value.calls ? value.costUsd / value.calls : 0,
        }))
            .sort((a, b) => b.costUsd - a.costUsd);
    };
    // Ряд по дням (для графика расходов по периодам). Ключ дня — YYYY-MM-DD в UTC,
    // чтобы бакеты были детерминированными и не зависели от таймзоны сервера.
    const dayKey = (ms) => new Date(ms).toISOString().slice(0, 10);
    const seriesMap = new Map();
    for (const row of rows) {
        const key = dayKey(row.createdAtMs);
        const cur = seriesMap.get(key) || { costUsd: 0, calls: 0, totalTokens: 0 };
        cur.costUsd += row.costUsd;
        cur.calls += 1;
        cur.totalTokens += row.totalTokens;
        seriesMap.set(key, cur);
    }
    // Заполняем весь диапазон днями (включая нулевые), чтобы график не «рвался».
    const series = [];
    const startMs = Date.now() - (rangeDays - 1) * DAY_MS;
    for (let i = 0; i < rangeDays; i += 1) {
        const key = dayKey(startMs + i * DAY_MS);
        const v = seriesMap.get(key) || { costUsd: 0, calls: 0, totalTokens: 0 };
        series.push({ date: key, costUsd: v.costUsd, calls: v.calls, totalTokens: v.totalTokens });
    }
    return {
        totals: {
            calls: total.calls,
            inputTokens: total.inputTokens,
            outputTokens: total.outputTokens,
            totalTokens: total.totalTokens,
            costUsd: total.costUsd,
            estimatedMonthUsd: rangeDays > 0 ? (total.costUsd / rangeDays) * 30 : total.costUsd,
            uniqueUsers: total.uniqueUsers.size,
        },
        features: group('feature'),
        models: group('model'),
        series,
    };
}
exports.openAiBudgetDashboard = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const rangeDays = clampDays(request.data?.rangeDays);
    const now = Date.now();
    const fromMs = now - rangeDays * DAY_MS;
    // ВСЕ billing-коллекции проекта. Раньше читались только первые 4 — из-за чего
    // дашборд недосчитывал >60% реальных трат (7 фич были не видны). Теперь честно
    // суммируем все 11 источников.
    const SOURCES = [
        { collection: 'premium_dialog_billing', feature: 'Компас chat' },
        { collection: 'explain_billing', feature: 'Explain phrase' },
        { collection: 'weekly_review_billing', feature: 'Weekly review legacy' },
        { collection: 'stats_insights_billing', feature: 'Stats insights legacy' },
        { collection: 'compass_billing', feature: 'Компас (daily, legacy)' },
        { collection: 'league_compass_daily_billing', feature: 'Компас лиги (cron)' },
        { collection: 'choice_explain_billing', feature: 'Объяснение выбора' },
        { collection: 'mistake_explain_billing', feature: 'Объяснение ошибки' },
        // ИИ-генератор турнирных заданий (адм. батчи): без регистрации здесь
        // дашборд повторил бы старый баг недосчёта трат.
        { collection: 'tournament_ai_billing', feature: 'Турниры: ИИ-генератор' },
    ];
    const fetchedDocs = await Promise.all(SOURCES.map((s) => openAiBudgetSafeGetDocs(s.collection, fromMs)));
    const fetched = SOURCES.map((s, i) => ({ ...s, ...fetchedDocs[i] }));
    const rows = fetched.flatMap((item) => item.docs.map((snap) => usageFromDoc(item.collection, item.feature, snap)))
        .filter((row) => row.createdAtMs >= fromMs)
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
    const agg = aggregate(rows, rangeDays);
    return {
        ok: true,
        rangeDays,
        generatedAtMs: now,
        prices: OPENAI_MODEL_PRICES,
        ...agg,
        recent: rows.slice(0, 25),
        errors: fetched
            .filter((item) => item.error)
            .map((item) => ({ collection: item.collection, error: item.error })),
    };
});
//# sourceMappingURL=openai_budget_dashboard.js.map
