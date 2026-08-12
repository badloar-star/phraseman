"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_EXACT_LANGUAGE_TAG_MAX_SUBTAGS_V1 = exports.V2_EXACT_LANGUAGE_TAG_MAX_BYTES_V1 = void 0;
exports.parseV2ExactLanguageTagV1 = parseV2ExactLanguageTagV1;
exports.v2ExactLanguageTagsCompatibleV1 = v2ExactLanguageTagsCompatibleV1;
exports.V2_EXACT_LANGUAGE_TAG_MAX_BYTES_V1 = 255;
exports.V2_EXACT_LANGUAGE_TAG_MAX_SUBTAGS_V1 = 3;
const EXACT_LANGUAGE_TAG_RE = /^([a-z]{2,3})(?:-([A-Z][a-z]{3}))?(?:-([A-Z]{2}|[0-9]{3}))?$/;
function parseV2ExactLanguageTagV1(value) {
    if (typeof value !== "string" ||
        value.length > exports.V2_EXACT_LANGUAGE_TAG_MAX_BYTES_V1 ||
        value.split("-").length > exports.V2_EXACT_LANGUAGE_TAG_MAX_SUBTAGS_V1)
        return null;
    const match = EXACT_LANGUAGE_TAG_RE.exec(value);
    if (!match)
        return null;
    return Object.freeze({
        primary: match[1],
        script: match[2] ?? null,
        region: match[3] ?? null,
    });
}
function v2ExactLanguageTagsCompatibleV1(targetLanguage, speechLocale) {
    const target = parseV2ExactLanguageTagV1(targetLanguage);
    const speech = parseV2ExactLanguageTagV1(speechLocale);
    return (target !== null &&
        speech !== null &&
        target.primary === speech.primary &&
        (target.script === null || target.script === speech.script) &&
        (target.region === null || target.region === speech.region));
}
//# sourceMappingURL=language_tag_v1.js.map