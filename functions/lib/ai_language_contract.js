"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_CONTRACT_VERSION = void 0;
exports.resolveAiOutputLang = resolveAiOutputLang;
exports.resolveStudyTarget = resolveStudyTarget;
exports.assertAiOutputLanguage = assertAiOutputLanguage;
exports.assertAiJsonTextFieldsLanguage = assertAiJsonTextFieldsLanguage;
const https_1 = require("firebase-functions/v2/https");
const ai_language_gate_1 = require("./ai_language_gate");
exports.LANGUAGE_CONTRACT_VERSION = 'ai-language-contract-v1';
const AI_OUTPUT_LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl', 'en'];
function normalizeLangCode(value) {
    const raw = String(value ?? '').trim();
    if (!raw)
        return '';
    return raw.toLowerCase();
}
function resolveAiOutputLang(value, feature) {
    const normalized = normalizeLangCode(value);
    const normalizedLower = normalized.toLowerCase();
    const exact = AI_OUTPUT_LANGS.find((lang) => lang.toLowerCase() === normalizedLower);
    if (exact)
        return exact;
    throw new https_1.HttpsError('invalid-argument', `${feature}_unsupported_language`);
}
function resolveStudyTarget(value) {
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'fr' ? 'fr' : 'en';
}
function assertAiOutputLanguage(params) {
    const lang = resolveAiOutputLang(params.targetLang, params.feature);
    const reason = (0, ai_language_gate_1.rejectGeneratedLanguageText)(params.text, lang);
    if (reason) {
        throw new https_1.HttpsError('unavailable', `${params.feature}_wrong_language`);
    }
}
function assertAiJsonTextFieldsLanguage(params) {
    const text = params.texts.map((item) => String(item ?? '').trim()).filter(Boolean).join('\n');
    if (!text)
        return;
    assertAiOutputLanguage({ text, targetLang: params.targetLang, feature: params.feature });
}
//# sourceMappingURL=ai_language_contract.js.map