"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminTranslateMessage = void 0;
// ════════════════════════════════════════════════════════════════════════════
// admin_translate.ts — переиспользуемый admin-callable авто-перевода текстов.
//
// Зачем: в админке мультиязычный контент (сообщения inbox, опросы, VIP-survey,
// broadcast) раньше приходилось переводить вручную или вовсе отправлять только на
// RU — у части аудитории письма были пустыми. Здесь один callable, который берёт
// RU-исходник и возвращает переводы на все языки приложения одним запросом к OpenAI.
//
// Доступ: ТОЛЬКО админ (request.auth.token.admin === true) — ключ OpenAI никогда не
// уходит в браузер. Клиент шлёт массив строк (поля письма), получает по переводу на
// каждый целевой язык. Модель и kill-switch берутся из openai_jobs (job 'quiz' как
// дешёвый текстовый профиль), с безопасным дефолтом.
// ════════════════════════════════════════════════════════════════════════════
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const explain_provider_1 = require("./explain/explain_provider");
const REGION = 'us-central1';
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
// Целевые языки = языки приложения минус RU (исходник). Ключи совпадают с суффиксами
// полей Firestore: Uk → titleUk, PtBr → titlePtBr и т.д. (см. app/app_messages.ts).
const TARGET_LANGS = [
    { key: 'Uk', name: 'Ukrainian' },
    { key: 'Es', name: 'Spanish' },
    { key: 'PtBr', name: 'Brazilian Portuguese' },
    { key: 'Vi', name: 'Vietnamese' },
    { key: 'Id', name: 'Indonesian' },
    { key: 'Tr', name: 'Turkish' },
    { key: 'Pl', name: 'Polish' },
];
const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_FIELDS = 20;
const MAX_FIELD_CHARS = 2000;
const MAX_OUTPUT_TOKENS = 4000;
function asText(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function buildPrompt(fields, context) {
    const langList = TARGET_LANGS.map((l) => `"${l.key}": ${l.name}`).join(', ');
    const numbered = fields.map((f, i) => `${i}: ${JSON.stringify(f)}`).join('\n');
    return [
        'You are a professional localization engine for a language-learning mobile app.',
        context ? `Tone/context: ${context}` : 'Tone: friendly, concise in-app notification copy.',
        'Translate the following Russian source fields into each target language.',
        `Target languages (JSON key → language): ${langList}.`,
        'Rules:',
        '- Preserve meaning, tone and any emoji. Keep it natural, not literal.',
        '- Do NOT translate or alter placeholders, URLs, brand names (Phraseman) or numbers.',
        '- An empty source field must stay an empty string in every language.',
        '- Keep array order and length identical to the source.',
        'Source fields (index: text):',
        numbered,
        '',
        'Respond with STRICT JSON only, shape:',
        '{ "Uk": ["...", "..."], "Es": [...], "PtBr": [...], "Vi": [...], "Id": [...], "Tr": [...], "Pl": [...] }',
        'Each array MUST have exactly the same number of items as the source, in the same order.',
    ].join('\n');
}
function coerceArray(value, length, fallback) {
    const arr = Array.isArray(value) ? value : [];
    return Array.from({ length }, (_, i) => {
        const raw = arr[i];
        const text = typeof raw === 'string' ? raw.trim() : '';
        // Пустой перевод фолбэчит на исходный RU — пустых полей в базе не будет.
        return text || fallback[i] || '';
    });
}
exports.adminTranslateMessage = (0, https_1.onCall)({
    region: REGION,
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 5,
    secrets: [OPENAI_API_KEY],
}, async (request) => {
    if (!request.auth?.token?.admin) {
        throw new https_1.HttpsError('permission-denied', 'admin_only');
    }
    const apiKey = asText(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'openai_key_missing');
    const data = (request.data ?? {});
    const rawFields = Array.isArray(data.fields) ? data.fields : [];
    if (!rawFields.length)
        throw new https_1.HttpsError('invalid-argument', 'no_fields');
    if (rawFields.length > MAX_FIELDS)
        throw new https_1.HttpsError('invalid-argument', 'too_many_fields');
    const fields = rawFields.map((f) => asText(f, MAX_FIELD_CHARS));
    const context = asText(data.context, 200);
    // Нечего переводить (все поля пустые) → возвращаем пустые массивы без вызова OpenAI.
    if (fields.every((f) => !f)) {
        const empty = {};
        TARGET_LANGS.forEach((l) => { empty[l.key] = fields.map(() => ''); });
        return { ok: true, translations: empty };
    }
    let gen;
    try {
        gen = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: DEFAULT_MODEL,
            messages: [{ role: 'user', content: buildPrompt(fields, context) }],
            maxTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.2,
            responseFormat: { type: 'json_object' },
        });
    }
    catch (e) {
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError('unavailable', 'translate_failed');
    }
    let parsed;
    try {
        parsed = JSON.parse(gen.text || '{}');
    }
    catch {
        throw new https_1.HttpsError('internal', 'translate_bad_json');
    }
    const translations = {};
    TARGET_LANGS.forEach((l) => {
        translations[l.key] = coerceArray(parsed[l.key], fields.length, fields);
    });
    return { ok: true, translations };
});
//# sourceMappingURL=admin_translate.js.map