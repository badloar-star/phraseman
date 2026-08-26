"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLearningV2ModeNativePayloadV1 = validateLearningV2ModeNativePayloadV1;
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
    return Object.freeze(payload);
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