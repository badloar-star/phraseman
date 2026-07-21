"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LANGUAGE_CONTRACT_VERSION = void 0;
exports.resolveAiOutputLang = resolveAiOutputLang;
exports.resolveStudyTarget = resolveStudyTarget;
exports.studyTargetName = studyTargetName;
exports.assertAiOutputLanguage = assertAiOutputLanguage;
exports.assertAiStudyLanguage = assertAiStudyLanguage;
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
/**
 * Единый справочник человеческих имён ИЗУЧАЕМЫХ языков (ось StudyTarget) для промптов.
 * Это единственный источник — не дублировать по файлам. Добавление языка = одна запись здесь.
 * Не путать с именами языков ВЫВОДА (AiOutputLang) — то отдельная ось (родной язык юзера).
 */
const STUDY_TARGET_NAME = {
    en: 'English',
    fr: 'French',
};
function studyTargetName(target) {
    return STUDY_TARGET_NAME[target] ?? STUDY_TARGET_NAME.en;
}
function assertAiOutputLanguage(params) {
    const lang = resolveAiOutputLang(params.targetLang, params.feature);
    const reason = (0, ai_language_gate_1.rejectGeneratedLanguageText)(params.text, lang);
    if (reason) {
        throw new https_1.HttpsError('unavailable', `${params.feature}_wrong_language`);
    }
}
/**
 * Guard that generated text is in the STUDY language (StudyTarget: en/fr), not the learner's own
 * language. Unlike assertAiOutputLanguage (which validates against the 9 AiOutputLang UI languages),
 * this validates against a StudyTarget, so 'fr' is accepted. Used by the dialog reply language-lock:
 * a French dialog reply is correct when studyTarget='fr', an English one is rejected, and vice versa.
 */
function assertAiStudyLanguage(params) {
    const reason = (0, ai_language_gate_1.rejectGeneratedLanguageText)(params.text, params.studyTarget);
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