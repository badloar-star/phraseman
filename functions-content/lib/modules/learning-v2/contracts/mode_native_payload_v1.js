"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLearningV2ModeNativePayloadV1 = validateLearningV2ModeNativePayloadV1;
exports.validateLearningV2ModeTextAnalysisV1 = validateLearningV2ModeTextAnalysisV1;
exports.learningV2ModeNativeAudioTargetIdsV1 = learningV2ModeNativeAudioTargetIdsV1;
const FAMILY_REQUIRED_FIELDS = Object.freeze({
    phrase_builder: [
        "targetPhrase",
        "localizedMeaning",
        "orderedTokens",
        "authoredDistractorTokens",
        "slotFeedback",
    ],
    listen_choose: [
        "referenceAudio",
        "slowReferenceAudio",
        "localizedMeaningChoices",
        "transcriptRevealPolicy",
        "choiceFeedback",
    ],
    sound_contrast: [
        "contrastA",
        "contrastB",
        "ipaA",
        "ipaB",
        "audioA",
        "audioB",
        "testedPhoneticContrast",
        "choiceFeedback",
    ],
    listen_build_dictation: [
        "referenceAudio",
        "slowReferenceAudio",
        "hiddenTargetPhrase",
        "orderedTokens",
        "authoredDistractorTokens",
        "slotFeedback",
    ],
    context_gap_grammar: [
        "localizedScene",
        "gappedTargetPhrase",
        "gapOptions",
        "testedDimension",
        "choiceFeedback",
    ],
    speed_match: [
        "pairGrid",
        "leftColumn",
        "rightColumn",
        "pairingKey",
        "timerPolicy",
        "finishStats",
    ],
    scripted_repeat_compare: [
        "referenceAudio",
        "slowReferenceAudio",
        "targetPhrase",
        "recordControlPolicy",
        "modelPlayback",
        "learnerPlayback",
        "honestOutcomeStates",
    ],
});
function validateLearningV2ModeNativePayloadV1(value, expectedFamily) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("learning_v2_mode_native_payload_invalid");
    }
    const payload = value;
    const family = payload.family;
    if (!(family in FAMILY_REQUIRED_FIELDS) || (expectedFamily && family !== expectedFamily)) {
        throw new Error("learning_v2_mode_native_payload_family_invalid");
    }
    for (const field of FAMILY_REQUIRED_FIELDS[family]) {
        if (!(field in payload)) {
            throw new Error(`learning_v2_mode_native_payload_field_missing:${family}:${field}`);
        }
    }
    validateOptionalAnalyses(payload, family);
    return Object.freeze(payload);
}
function localizedTextPresent(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const localized = value;
    if (["ru", "uk"].some((locale) => typeof localized[locale] !== "string" || !localized[locale].trim()))
        return false;
    const entries = Object.values(localized);
    return entries.every((entry) => typeof entry === "string" && entry.trim().length > 0);
}
function validateLearningV2ModeTextAnalysisV1(value, expectedText) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("learning_v2_mode_text_analysis_invalid");
    const analysis = value;
    if (typeof analysis.text !== "string" || !analysis.text.trim() || (expectedText !== undefined && analysis.text !== expectedText))
        throw new Error("learning_v2_mode_text_analysis_text_mismatch");
    if (!localizedTextPresent(analysis.meaningByLocale) || !localizedTextPresent(analysis.explanationByLocale))
        throw new Error("learning_v2_mode_text_analysis_localized_copy_missing");
    if (!Array.isArray(analysis.units) || analysis.units.length === 0)
        throw new Error("learning_v2_mode_text_analysis_units_missing");
    const covered = new Set();
    let previousEnd = -1;
    for (const rawUnit of analysis.units) {
        if (!rawUnit || typeof rawUnit !== "object" || Array.isArray(rawUnit))
            throw new Error("learning_v2_mode_text_analysis_unit_invalid");
        const unit = rawUnit;
        if (!Number.isInteger(unit.start) || !Number.isInteger(unit.end) || unit.start < 0 || unit.end <= unit.start || unit.start < previousEnd)
            throw new Error("learning_v2_mode_text_analysis_unit_offsets");
        if (analysis.text.slice(unit.start, unit.end) !== unit.text)
            throw new Error("learning_v2_mode_text_analysis_unit_offsets");
        if (typeof unit.lemma !== "string" || !unit.lemma.trim() || typeof unit.partOfSpeech !== "string" || !unit.partOfSpeech.trim())
            throw new Error("learning_v2_mode_text_analysis_unit_grammar_missing");
        if (!localizedTextPresent(unit.partOfSpeechLabelByLocale) || !localizedTextPresent(unit.meaningByLocale) || !localizedTextPresent(unit.functionByLocale))
            throw new Error("learning_v2_mode_text_analysis_unit_localized_copy_missing");
        if (!Array.isArray(unit.sourceRefs) || unit.sourceRefs.length === 0 || unit.sourceRefs.some((ref) => typeof ref !== "string" || !ref.trim()))
            throw new Error("learning_v2_mode_text_analysis_unit_source_missing");
        for (let offset = unit.start; offset < unit.end; offset += 1)
            covered.add(offset);
        previousEnd = unit.end;
    }
    for (let offset = 0; offset < analysis.text.length; offset += 1) {
        if (!/\s/u.test(analysis.text[offset]) && !covered.has(offset))
            throw new Error("learning_v2_mode_text_analysis_unit_gap");
    }
    return Object.freeze(value);
}
function validateFeedbackAnalyses(rows, expectedTextById) {
    if (!Array.isArray(rows))
        return;
    for (const rawRow of rows) {
        if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow))
            continue;
        const row = rawRow;
        if (row.analysisV1 !== undefined)
            validateLearningV2ModeTextAnalysisV1(row.analysisV1, expectedTextById.get(String(row.responseId)));
        if (row.analysisV1 !== undefined && row.correct === false) {
            if (typeof row.errorType !== "string" || !row.errorType.trim() ||
                !localizedTextPresent(row.whyTemptingByLocale) || !localizedTextPresent(row.whyWrongHereByLocale) ||
                !localizedTextPresent(row.minimalContrastByLocale) || !localizedTextPresent(row.acceptabilityBoundaryByLocale))
                throw new Error("learning_v2_mode_choice_wrong_reason_missing");
        }
    }
}
function validateOptionalAnalyses(payload, family) {
    if (family === "context_gap_grammar") {
        const expected = new Map(payload.gapOptions.map((entry) => [String(entry.responseId), String(entry.text)]));
        validateFeedbackAnalyses(payload.choiceFeedback, expected);
    }
    else if (family === "listen_choose") {
        const expected = new Map(payload.localizedMeaningChoices.map((entry) => [String(entry.responseId), String(entry.targetText)]));
        validateFeedbackAnalyses(payload.choiceFeedback, expected);
    }
    else if (family === "phrase_builder" || family === "listen_build_dictation") {
        const distractors = payload.authoredDistractorTokens.map(String);
        const expected = new Map(payload.slotFeedback.map((entry, index) => [String(entry.responseId), distractors[index] ?? ""]));
        validateFeedbackAnalyses(payload.slotFeedback, expected);
        const explanation = payload.explanationV1;
        if (explanation?.phrase !== undefined)
            validateLearningV2ModeTextAnalysisV1(explanation.phrase, String(family === "phrase_builder" ? payload.targetPhrase : payload.hiddenTargetPhrase));
    }
    else if (family === "speed_match") {
        for (const rawPair of payload.pairGrid) {
            const analysis = rawPair.analysisV1;
            if (analysis?.phrase !== undefined)
                validateLearningV2ModeTextAnalysisV1(analysis.phrase, String(rawPair.target));
        }
    }
    else if (family === "scripted_repeat_compare") {
        const explanation = payload.explanationV1;
        if (explanation?.phrase !== undefined)
            validateLearningV2ModeTextAnalysisV1(explanation.phrase, String(payload.targetPhrase));
    }
}
function learningV2ModeNativeAudioTargetIdsV1(payload) {
    const refs = payload.family === "sound_contrast"
        ? [payload.audioA, payload.audioB]
        : payload.family === "listen_choose" ||
            payload.family === "listen_build_dictation" ||
            payload.family === "scripted_repeat_compare"
            ? [payload.referenceAudio, payload.slowReferenceAudio]
            : [];
    return Object.freeze([
        ...new Set(refs
            .filter((ref) => ref !== null)
            .map((ref) => ref.audioTargetId)),
    ]);
}
//# sourceMappingURL=mode_native_payload_v1.js.map