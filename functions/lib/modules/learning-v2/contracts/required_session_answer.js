"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiredSessionAnswerProofFingerprint = exports.normalizeRequiredSessionShortAnswer = exports.isServerVerifiableRequiredSessionFamily = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const FAMILIES = new Set([
    "phrase_builder",
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "context_gap_grammar",
    "speed_match",
]);
const MAX_RAW_ANSWER_BYTES = 1024;
const MAX_NORMALIZED_ANSWER_BYTES = 512;
const isServerVerifiableRequiredSessionFamily = (input) => typeof input === "string" &&
    FAMILIES.has(input);
exports.isServerVerifiableRequiredSessionFamily = isServerVerifiableRequiredSessionFamily;
const hasUnpairedSurrogate = (value) => {
    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        if (code >= 0xd800 && code <= 0xdbff) {
            const next = value.charCodeAt(index + 1);
            if (!(next >= 0xdc00 && next <= 0xdfff))
                return true;
            index += 1;
        }
        else if (code >= 0xdc00 && code <= 0xdfff)
            return true;
    }
    return false;
};
const normalizeRequiredSessionShortAnswer = (input) => {
    if (typeof input !== "string" || hasUnpairedSurrogate(input)) {
        throw new Error("required_session_answer_invalid");
    }
    let rawBytes;
    try {
        rawBytes = (0, decision_registry_1.utf8ByteLengthV1)(input);
    }
    catch {
        throw new Error("required_session_answer_invalid");
    }
    if (rawBytes < 1 || rawBytes > MAX_RAW_ANSWER_BYTES) {
        throw new Error("required_session_answer_invalid");
    }
    const normalized = input
        .normalize("NFKC")
        .toLocaleLowerCase("en-US")
        .replace(/[’‘`´]/gu, "'")
        .match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu)
        ?.join(" ") ?? "";
    if (!normalized || (0, decision_registry_1.utf8ByteLengthV1)(normalized) > MAX_NORMALIZED_ANSWER_BYTES) {
        throw new Error("required_session_answer_invalid");
    }
    return normalized;
};
exports.normalizeRequiredSessionShortAnswer = normalizeRequiredSessionShortAnswer;
/** Privacy-preserving proof persisted by the local post-session outbox. */
const requiredSessionAnswerProofFingerprint = (input) => (0, decision_registry_1.hashCanonicalBody)({
    schemaVersion: "learning-v2-required-session-normalized-answer.v1",
    normalizedAnswer: (0, exports.normalizeRequiredSessionShortAnswer)(input),
});
exports.requiredSessionAnswerProofFingerprint = requiredSessionAnswerProofFingerprint;
//# sourceMappingURL=required_session_answer.js.map