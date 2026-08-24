"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.v2VoiceGenerationProfileRefV1 = exports.v2SpeechProfileRefV1 = exports.isV2VoiceGenerationProfileBodyV1 = exports.isV2SpeechProfileBodyV1 = exports.V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1 = exports.V2_SPEECH_SCRIPT_POLICY_V1 = exports.V2_WORD_SEGMENTATION_POLICY_V1 = exports.V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1 = exports.V2_VOICE_WORD_VARIANT_MAX_BYTES_V1 = exports.V2_VOICE_PROFILE_BODY_MAX_BYTES_V1 = exports.V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1 = exports.V2_SPEECH_PROFILE_BODY_SCHEMA_V1 = void 0;
exports.parseV2SpeechProfileBodyV1 = parseV2SpeechProfileBodyV1;
exports.parseV2VoiceGenerationProfileBodyV1 = parseV2VoiceGenerationProfileBodyV1;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const voice_playback_policy_v1_1 = require("../../../modules/learning-v2/contracts/voice_playback_policy_v1");
const language_tag_v1_1 = require("../../../modules/learning-v2/contracts/language_tag_v1");
exports.V2_SPEECH_PROFILE_BODY_SCHEMA_V1 = "v2-speech-profile-body.v1";
exports.V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1 = "v2-voice-generation-profile-body.v1";
exports.V2_VOICE_PROFILE_BODY_MAX_BYTES_V1 = 64 * 1024;
exports.V2_VOICE_WORD_VARIANT_MAX_BYTES_V1 = 64 * 1024;
const sourceNormalizationPolicyBody = Object.freeze({
    schemaVersion: "v2-speech-source-normalization-policy.v1",
    policyId: "canonical-nfc-source-without-implicit-rewrite",
    version: 1,
    unicodeNormalization: "NFC",
    trimOrCaseFoldAuthoredSource: false,
    interfaceLocaleIsDuplicationAxis: false,
});
const wordSegmentationPolicyBody = Object.freeze({
    schemaVersion: "v2-word-segmentation-policy.v1",
    policyId: "explicit-author-owned-word-boundaries",
    version: 1,
    inferWordsFromLearnerOptions: false,
    requireOrdinalDistinctRepeatedWords: true,
    splitGraphemeClusters: false,
});
const speechScriptPolicyBody = Object.freeze({
    schemaVersion: "v2-speech-script-policy.v1",
    policyId: "locale-compatible-plain-text-only",
    version: 1,
    allowSsml: false,
    allowXml: false,
    allowControlOrBidiOverrideCharacters: false,
});
const generationInstructionsPolicyBody = Object.freeze({
    schemaVersion: "v2-voice-generation-instructions-policy.v1",
    policyId: "clear-neutral-learning-pronunciation",
    version: 1,
    instructions: "Clear natural learning pronunciation; preserve authored words and punctuation; do not add commentary.",
    instructionsAuthority: "code_owned_exact_text",
});
const ref = (body) => Object.freeze({
    policyId: body.policyId,
    version: body.version,
    contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
});
exports.V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1 = Object.freeze({
    body: sourceNormalizationPolicyBody,
    ref: ref(sourceNormalizationPolicyBody),
});
exports.V2_WORD_SEGMENTATION_POLICY_V1 = Object.freeze({
    body: wordSegmentationPolicyBody,
    ref: ref(wordSegmentationPolicyBody),
});
exports.V2_SPEECH_SCRIPT_POLICY_V1 = Object.freeze({
    body: speechScriptPolicyBody,
    ref: ref(speechScriptPolicyBody),
});
exports.V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1 = Object.freeze({
    body: generationInstructionsPolicyBody,
    ref: ref(generationInstructionsPolicyBody),
});
const speechHandles = new WeakSet();
const generationHandles = new WeakSet();
const TOKEN_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const CONTROL_OR_BIDI_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const SPEECH_KEYS = [
    "executionAuthority",
    "lifecycleAuthority",
    "profileAuthority",
    "profileId",
    "publicationAuthority",
    "releaseAuthority",
    "releaseEligible",
    "repositoryAuthority",
    "runtimeConsumer",
    "schemaVersion",
    "scriptPolicyRef",
    "sourceNormalizationRef",
    "speechLocale",
    "targetLanguage",
    "version",
    "wordSegmentationRef",
];
const GENERATION_KEYS = [
    "audioByteAuthority",
    "contentType",
    "deviceEvidenceAuthority",
    "executionAuthority",
    "format",
    "generationInstructionsPolicyRef",
    "lifecycleAuthority",
    "listeningEvidenceAuthority",
    "maximumBytesPerWordVariant",
    "model",
    "pipelineVersion",
    "profileAuthority",
    "profileId",
    "providerExecutionAuthority",
    "providerFamily",
    "publicationAuthority",
    "releaseAuthority",
    "releaseEligible",
    "repositoryAuthority",
    "requiredVoiceIds",
    "runtimeConsumer",
    "schemaVersion",
    "speed",
    "variantsPerApprovedTarget",
    "version",
];
const REF_KEYS = ["contentHash", "policyId", "version"];
function fail(code) {
    throw new Error(code);
}
function isRecord(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
function exactKeys(value, keys, code) {
    if (!isRecord(value) ||
        Object.keys(value).sort().join("|") !== [...keys].sort().join("|"))
        fail(code);
}
function preflight(value, code) {
    const work = [
        { value, depth: 0 },
    ];
    let nodes = 0;
    while (work.length > 0) {
        const current = work.pop();
        nodes += 1;
        if (nodes > 512 || current.depth > 16)
            fail(code);
        if (typeof current.value === "string") {
            if (current.value.length > 1000 ||
                current.value.normalize("NFC") !== current.value ||
                CONTROL_OR_BIDI_RE.test(current.value))
                fail(code);
            continue;
        }
        if (typeof current.value === "number") {
            if (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                (Number.isInteger(current.value) &&
                    !Number.isSafeInteger(current.value)))
                fail(code);
            continue;
        }
        if (Array.isArray(current.value)) {
            if (current.value.length > 32)
                fail(code);
            current.value.forEach((child) => work.push({ value: child, depth: current.depth + 1 }));
            continue;
        }
        if (current.value !== null && typeof current.value === "object") {
            if (!isRecord(current.value))
                fail(code);
            const currentRecord = current.value;
            const keys = Object.keys(currentRecord);
            if (keys.length > 64 ||
                keys.some((key) => RESERVED_KEYS.has(key) ||
                    key.normalize("NFC") !== key ||
                    CONTROL_OR_BIDI_RE.test(key)))
                fail(code);
            keys.forEach((key) => work.push({ value: currentRecord[key], depth: current.depth + 1 }));
        }
    }
}
function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
function parseRaw(raw, code) {
    if (typeof raw !== "string" ||
        raw.length > exports.V2_VOICE_PROFILE_BODY_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_VOICE_PROFILE_BODY_MAX_BYTES_V1)
        fail(code);
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail(code);
    }
    preflight(value, code);
    if ((0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail(`${code}_noncanonical`);
    return value;
}
function exactRef(value, expected) {
    if (!isRecord(value))
        return false;
    exactKeys(value, REF_KEYS, "v2_voice_profile_policy_ref_invalid");
    return (value.policyId === expected.policyId &&
        value.version === expected.version &&
        value.contentHash === expected.contentHash);
}
function exactProfileIdentity(value) {
    return (typeof value.profileId === "string" &&
        TOKEN_RE.test(value.profileId) &&
        Number.isSafeInteger(value.version) &&
        Number(value.version) > 0 &&
        Number(value.version) <= 1_000_000);
}
const PROFILE_AUTHORITY = Object.freeze({
    profileAuthority: "none",
    repositoryAuthority: "none",
    lifecycleAuthority: "none",
    executionAuthority: "none",
    publicationAuthority: "none",
    runtimeConsumer: false,
    releaseEligible: false,
    releaseAuthority: false,
});
function parseV2SpeechProfileBodyV1(raw) {
    const value = parseRaw(raw, "v2_speech_profile_body_invalid");
    exactKeys(value, SPEECH_KEYS, "v2_speech_profile_body_invalid");
    const candidate = value;
    if (candidate.schemaVersion !== exports.V2_SPEECH_PROFILE_BODY_SCHEMA_V1 ||
        !exactProfileIdentity(candidate) ||
        typeof candidate.targetLanguage !== "string" ||
        typeof candidate.speechLocale !== "string" ||
        !(0, language_tag_v1_1.v2ExactLanguageTagsCompatibleV1)(candidate.targetLanguage, candidate.speechLocale) ||
        !exactRef(candidate.sourceNormalizationRef, exports.V2_SPEECH_SOURCE_NORMALIZATION_POLICY_V1.ref) ||
        !exactRef(candidate.wordSegmentationRef, exports.V2_WORD_SEGMENTATION_POLICY_V1.ref) ||
        !exactRef(candidate.scriptPolicyRef, exports.V2_SPEECH_SCRIPT_POLICY_V1.ref) ||
        Object.entries(PROFILE_AUTHORITY).some(([key, expected]) => candidate[key] !== expected))
        fail("v2_speech_profile_body_invalid");
    const result = deepFreeze(value);
    speechHandles.add(result);
    return result;
}
function parseV2VoiceGenerationProfileBodyV1(raw) {
    const value = parseRaw(raw, "v2_voice_generation_profile_body_invalid");
    exactKeys(value, GENERATION_KEYS, "v2_voice_generation_profile_body_invalid");
    const candidate = value;
    if (candidate.schemaVersion !== exports.V2_VOICE_GENERATION_PROFILE_BODY_SCHEMA_V1 ||
        !exactProfileIdentity(candidate) ||
        candidate.providerFamily !== "openai" ||
        candidate.model !== "gpt-4o-mini-tts" ||
        candidate.format !== "mp3" ||
        candidate.contentType !== "audio/mpeg" ||
        (0, decision_registry_1.canonicalJsonV1)(candidate.requiredVoiceIds) !==
            (0, decision_registry_1.canonicalJsonV1)(voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS) ||
        candidate.variantsPerApprovedTarget !== 4 ||
        candidate.speed !== 1 ||
        !exactRef(candidate.generationInstructionsPolicyRef, exports.V2_VOICE_GENERATION_INSTRUCTIONS_POLICY_V1.ref) ||
        candidate.pipelineVersion !== 1 ||
        candidate.maximumBytesPerWordVariant !==
            exports.V2_VOICE_WORD_VARIANT_MAX_BYTES_V1 ||
        Object.entries(PROFILE_AUTHORITY).some(([key, expected]) => candidate[key] !== expected) ||
        candidate.providerExecutionAuthority !== "none" ||
        candidate.audioByteAuthority !== "none" ||
        candidate.listeningEvidenceAuthority !== "none" ||
        candidate.deviceEvidenceAuthority !== "none")
        fail("v2_voice_generation_profile_body_invalid");
    const result = deepFreeze(value);
    generationHandles.add(result);
    return result;
}
const isV2SpeechProfileBodyV1 = (value) => typeof value === "object" && value !== null && speechHandles.has(value);
exports.isV2SpeechProfileBodyV1 = isV2SpeechProfileBodyV1;
const isV2VoiceGenerationProfileBodyV1 = (value) => typeof value === "object" && value !== null && generationHandles.has(value);
exports.isV2VoiceGenerationProfileBodyV1 = isV2VoiceGenerationProfileBodyV1;
const v2SpeechProfileRefV1 = (body) => {
    if (!(0, exports.isV2SpeechProfileBodyV1)(body))
        fail("v2_speech_profile_body_untrusted");
    return Object.freeze({
        profileId: body.profileId,
        version: body.version,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
exports.v2SpeechProfileRefV1 = v2SpeechProfileRefV1;
const v2VoiceGenerationProfileRefV1 = (body) => {
    if (!(0, exports.isV2VoiceGenerationProfileBodyV1)(body))
        fail("v2_voice_generation_profile_body_untrusted");
    return Object.freeze({
        profileId: body.profileId,
        version: body.version,
        contentHash: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
exports.v2VoiceGenerationProfileRefV1 = v2VoiceGenerationProfileRefV1;
//# sourceMappingURL=v2_voice_profile_contracts_v1.js.map