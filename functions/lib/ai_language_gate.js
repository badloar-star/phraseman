"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectGeneratedLanguageText = rejectGeneratedLanguageText;
const explain_gates_1 = require("./explain/explain_gates");
const ENGLISH_STOPWORDS = new Set([
    'the',
    'and',
    'you',
    'your',
    'are',
    'is',
    'to',
    'of',
    'in',
    'that',
    'this',
    'with',
    'for',
    'today',
    'practice',
    'keep',
    'try',
    'good',
    'small',
    'step',
    'phrase',
    'phrases',
    'words',
    'week',
]);
function hasMojibake(text) {
    return text.includes('\uFFFD') || text.includes('Ð');
}
function englishStopwordRatio(text) {
    const words = text
        .toLowerCase()
        .match(/[a-z]{2,}/g) ?? [];
    if (words.length < 6)
        return 0;
    const hits = words.filter((word) => ENGLISH_STOPWORDS.has(word)).length;
    return hits / words.length;
}
function hasTrackedLetters(text) {
    return /[A-Za-z\u00c0-\u024f\u0400-\u052f]/.test(text);
}
function stripQuotedEnglishExamples(text) {
    return text
        .replace(/"[^"\n]*[A-Za-z][^"\n]*"/g, ' ')
        .replace(/“[^”\n]*[A-Za-z][^”\n]*”/g, ' ')
        .replace(/«[^»\n]*[A-Za-z][^»\n]*»/g, ' ');
}
function textForLanguageCheck(text, lang) {
    const code = String(lang ?? '').slice(0, 2).toLowerCase();
    if (code === 'en')
        return text;
    const stripped = stripQuotedEnglishExamples(text);
    return hasTrackedLetters(stripped) ? stripped : text;
}
function looksLikeEnglishLeak(text, lang) {
    const code = String(lang ?? '').slice(0, 2).toLowerCase();
    if (code === 'en')
        return false;
    const words = text.toLowerCase().match(/[a-z]{2,}/g) ?? [];
    if (words.length < 8)
        return false;
    const hits = words.filter((word) => ENGLISH_STOPWORDS.has(word)).length;
    return hits >= 4 && englishStopwordRatio(text) >= 0.25;
}
function rejectGeneratedLanguageText(text, lang) {
    const trimmed = String(text ?? '').trim();
    if (!trimmed)
        return null;
    if (hasMojibake(trimmed))
        return 'mojibake';
    const checkText = textForLanguageCheck(trimmed, lang);
    if ((0, explain_gates_1.wrongScriptRatio)(checkText, lang) > explain_gates_1.MAX_WRONG_SCRIPT_RATIO)
        return 'non_target_language';
    if (looksLikeEnglishLeak(checkText, lang))
        return 'non_target_language';
    return null;
}
//# sourceMappingURL=ai_language_gate.js.map