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
exports.triageBacklog = exports.triageOnUserReport = exports.triageOnErrorReport = void 0;
const admin = __importStar(require("firebase-admin"));
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
/**
 * AI triage for moderation queues.
 *
 * On every new error_report / user_report, call gpt-4o-mini to classify it and
 * suggest an action, then write the verdict back onto the same doc under `triage`.
 * The admin panel reads `triage` to pre-sort the queue (priority badges + hints).
 *
 * Reuses the existing thin OpenAI wrapper (explain_provider) and the OPENAI_API_KEY
 * secret, with gpt-4o-mini + json_object for cheap structured output.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { openAiChat } = require('./explain/explain_provider');
const REGION = 'us-central1';
const MODEL = 'gpt-4o-mini';
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
function clamp(s, n) {
    return String(s ?? '').slice(0, n);
}
function safeParseVerdict(text) {
    try {
        const j = JSON.parse(text);
        if (!j || typeof j !== 'object')
            return null;
        return j;
    }
    catch {
        return null;
    }
}
function normalizeVerdict(raw) {
    const sev = String(raw?.severity || 'normal').toLowerCase();
    return {
        severity: (sev === 'critical' || sev === 'low') ? sev : 'normal',
        isSpam: raw?.isSpam === true,
        suggestedAction: clamp(raw?.suggestedAction, 200) || '—',
        reason: clamp(raw?.reason, 400) || '',
        model: MODEL,
        at: Date.now(),
    };
}
async function runTriage(systemPrompt, userPrompt) {
    try {
        const res = await openAiChat({
            apiKey: OPENAI_API_KEY.value(),
            model: MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            maxTokens: 220,
            temperature: 0.1,
            responseFormat: { type: 'json_object' },
        });
        return normalizeVerdict(safeParseVerdict(res.text));
    }
    catch (error) {
        console.error('[adminTriage] openAiChat failed', error);
        return null;
    }
}
// ── Content reports (error_reports) ──────────────────────────────────────────
const CONTENT_SYSTEM = 'Ты модератор приложения для изучения английского. Классифицируй жалобу пользователя на ошибку в контенте. ' +
    'Ответь СТРОГО JSON: {"severity":"critical|normal|low","isSpam":true|false,"suggestedAction":"короткая рекомендация","reason":"кратко почему"}. ' +
    'critical = реальная грубая ошибка в обучении (неверный ответ/перевод). low = мелочь или непонятная жалоба. isSpam=true если это мусор/реклама/бессмыслица. На русском.';
exports.triageOnErrorReport = (0, firestore_1.onDocumentCreated)({ document: 'error_reports/{id}', region: REGION, secrets: [OPENAI_API_KEY] }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const d = snap.data() || {};
    if (d.triage)
        return; // already triaged
    const userPrompt = [
        `Экран: ${clamp(d.screen, 80)}`,
        `Категория: ${clamp(d.category, 80)}`,
        `dataId: ${clamp(d.dataId, 180)}`,
        `Текст/контекст: ${clamp(d.dataText || d.context, 1500)}`,
        d.userAnswer ? `Ответ пользователя: ${clamp(d.userAnswer, 200)}` : '',
    ].filter(Boolean).join('\n');
    const verdict = await runTriage(CONTENT_SYSTEM, userPrompt);
    if (!verdict)
        return;
    try {
        await snap.ref.set({ triage: verdict }, { merge: true });
    }
    catch (error) {
        console.error('[adminTriage] write error_report verdict failed', error);
    }
});
// ── User reports (user_reports) ──────────────────────────────────────────────
const USER_SYSTEM = 'Ты модератор. Классифицируй жалобу одного пользователя на другого (ник/поведение). ' +
    'Ответь СТРОГО JSON: {"severity":"critical|normal|low","isSpam":true|false,"suggestedAction":"бан|предупреждение|переименование|пропустить","reason":"кратко"}. ' +
    'critical = явное серьёзное нарушение (оскорбления/читы). isSpam=true если жалоба ложная/бессмысленная. На русском.';
exports.triageOnUserReport = (0, firestore_1.onDocumentCreated)({ document: 'user_reports/{id}', region: REGION, secrets: [OPENAI_API_KEY] }, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const d = snap.data() || {};
    if (d.triage)
        return;
    const userPrompt = [
        `Причина жалобы: ${clamp(d.reason, 120)}`,
        `Ник нарушителя: ${clamp(d.reportedName, 80)}`,
        `Экран: ${clamp(d.screen, 80)}`,
        d.comment ? `Комментарий: ${clamp(d.comment, 300)}` : '',
    ].filter(Boolean).join('\n');
    const verdict = await runTriage(USER_SYSTEM, userPrompt);
    if (!verdict)
        return;
    try {
        await snap.ref.set({ triage: verdict }, { merge: true });
    }
    catch (error) {
        console.error('[adminTriage] write user_report verdict failed', error);
    }
});
// ── On-demand backlog triage (admin button) ──────────────────────────────────
// Triages up to `limit` already-existing reports that have no `triage` yet.
// Admin-only. Lets the admin see priority badges on the existing queue instead
// of waiting for only-new reports to be processed.
function buildContentPrompt(d) {
    return [
        `Экран: ${clamp(d.screen, 80)}`,
        `Категория: ${clamp(d.category, 80)}`,
        `dataId: ${clamp(d.dataId, 180)}`,
        `Текст/контекст: ${clamp(d.dataText || d.context, 1500)}`,
        d.userAnswer ? `Ответ пользователя: ${clamp(d.userAnswer, 200)}` : '',
    ].filter(Boolean).join('\n');
}
function buildUserPrompt(d) {
    return [
        `Причина жалобы: ${clamp(d.reason, 120)}`,
        `Ник нарушителя: ${clamp(d.reportedName, 80)}`,
        `Экран: ${clamp(d.screen, 80)}`,
        d.comment ? `Комментарий: ${clamp(d.comment, 300)}` : '',
    ].filter(Boolean).join('\n');
}
exports.triageBacklog = (0, https_1.onCall)({ region: REGION, secrets: [OPENAI_API_KEY], timeoutSeconds: 300 }, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    }
    const which = String(request.data?.which || 'error') === 'user' ? 'user' : 'error';
    const max = Math.max(1, Math.min(40, Number(request.data?.limit) || 20));
    const collName = which === 'user' ? 'user_reports' : 'error_reports';
    const sys = which === 'user' ? USER_SYSTEM : CONTENT_SYSTEM;
    const buildPrompt = which === 'user' ? buildUserPrompt : buildContentPrompt;
    const db = admin.firestore();
    // Fetch recent docs, then process the ones still missing a verdict.
    const snap = await db.collection(collName).orderBy('createdAt', 'desc').limit(max * 3).get();
    const pending = snap.docs.filter((doc) => !doc.data().triage).slice(0, max);
    let done = 0, failed = 0;
    for (const doc of pending) {
        const verdict = await runTriage(sys, buildPrompt(doc.data()));
        if (verdict) {
            try {
                await doc.ref.set({ triage: verdict }, { merge: true });
                done++;
            }
            catch {
                failed++;
            }
        }
        else {
            failed++;
        }
    }
    return { collection: collName, scanned: snap.size, processed: done, failed, remaining: Math.max(0, snap.docs.filter((d) => !d.data().triage).length - done) };
});
//# sourceMappingURL=admin_triage.js.map