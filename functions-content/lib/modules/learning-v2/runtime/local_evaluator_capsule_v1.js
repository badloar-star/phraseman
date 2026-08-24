"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateV2LocalEvaluatorCapsuleV1 = exports.isV2LocalEvaluatorCapsuleHandleV1 = exports.parseV2LocalEvaluatorCapsuleV1 = exports.buildV2LocalEvaluatorCapsuleRawV1 = exports.createV2LocalEvaluatorCommitmentV1 = exports.normalizeV2LocalEvaluatorResponseV1 = exports.v2LocalEvaluatorInputKindForFamilyV1 = exports.V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1 = exports.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 = exports.V2_LOCAL_EVALUATOR_NORMALIZATION_V1 = void 0;
const activity_catalog_v2_1 = require("../contracts/activity_catalog_v2");
const decision_registry_1 = require("../policies/decision_registry");
exports.V2_LOCAL_EVALUATOR_NORMALIZATION_V1 = "v2-local-evaluator-normalization.v1";
const normalizationProfileBody = Object.freeze({
    schemaVersion: "v2-local-evaluator-normalization-profile.v1",
    normalizationRef: exports.V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
    unicodeForm: "NFKC",
    caseMapping: "locale_lowercase",
    unicodeCaseDataAuthority: "runtime_compatibility_unverified",
    punctuationPolicy: "letters_numbers_internal_apostrophe",
});
exports.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 = (0, decision_registry_1.hashCanonicalBody)(normalizationProfileBody);
exports.V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1 = Object.freeze({
    phrase_builder: "text",
    listen_choose: "choice_token",
    sound_contrast: "choice_token",
    listen_build_dictation: "text",
    context_gap_grammar: "choice_token",
    speed_match: "choice_token",
    scripted_repeat_compare: "transcript",
});
const v2LocalEvaluatorInputKindForFamilyV1 = (family) => {
    const inputKind = exports.V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1[family];
    if (inputKind === undefined)
        throw new Error("invalid evaluator family");
    return inputKind;
};
exports.v2LocalEvaluatorInputKindForFamilyV1 = v2LocalEvaluatorInputKindForFamilyV1;
const BODY_KEYS = [
    "schemaVersion",
    "capsuleId",
    "taskId",
    "activityId",
    "family",
    "inputKind",
    "normalizationRef",
    "normalizationLocale",
    "normalizationProfileHash",
    "salt",
    "acceptedCommitments",
    "assessmentSecrecy",
    "verdictAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "releaseAuthority",
];
const FAMILY_SET = new Set(activity_catalog_v2_1.V2_REQUIRED_SESSION_FAMILIES_V2);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HEX_64 = /^[0-9a-f]{64}$/;
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/;
const internals = new WeakMap();
const expectedInputKind = (family) => (0, exports.v2LocalEvaluatorInputKindForFamilyV1)(family);
const normalizeUnicodeText = (value, locale) => {
    if (value.length > 1024 ||
        (0, decision_registry_1.utf8ByteLengthV1)(value) > 1024 ||
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value))
        return null;
    let normalized;
    try {
        normalized = value
            .normalize("NFKC")
            .toLocaleLowerCase(locale)
            .replace(/[’‘`´]/gu, "'");
    }
    catch {
        return null;
    }
    const tokens = normalized.match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];
    const result = tokens.join(" ");
    return result.length > 0 && (0, decision_registry_1.utf8ByteLengthV1)(result) <= 512 ? result : null;
};
const normalizeV2LocalEvaluatorResponseV1 = (inputKind, value, locale) => {
    if (typeof value !== "string" ||
        typeof locale !== "string" ||
        locale.length > 255 ||
        !LOCALE_PATTERN.test(locale))
        return null;
    if (inputKind === "choice_token") {
        if (value.length > 1024)
            return null;
        let token;
        try {
            token = value.normalize("NFKC").trim().toLocaleLowerCase(locale);
        }
        catch {
            return null;
        }
        return /^[a-z0-9][a-z0-9._:-]{0,159}$/.test(token) ? token : null;
    }
    return normalizeUnicodeText(value, locale);
};
exports.normalizeV2LocalEvaluatorResponseV1 = normalizeV2LocalEvaluatorResponseV1;
const createV2LocalEvaluatorCommitmentV1 = (input) => {
    if (!ID_PATTERN.test(input.capsuleId) ||
        !ID_PATTERN.test(input.taskId) ||
        !ID_PATTERN.test(input.activityId))
        throw new Error("invalid evaluator commitment identity");
    if (!FAMILY_SET.has(input.family) ||
        expectedInputKind(input.family) !== input.inputKind)
        throw new Error("invalid evaluator family/input kind pair");
    if (!HEX_64.test(input.salt))
        throw new Error("invalid evaluator commitment salt");
    if (!LOCALE_PATTERN.test(input.normalizationLocale) ||
        input.normalizationLocale.length > 255 ||
        input.normalizationProfileHash !==
            exports.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1)
        throw new Error("invalid evaluator normalization profile");
    const normalizedResponse = (0, exports.normalizeV2LocalEvaluatorResponseV1)(input.inputKind, input.response, input.normalizationLocale);
    if (normalizedResponse === null)
        throw new Error("invalid evaluator commitment response");
    return (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-local-evaluator-response-commitment.v1",
        capsuleId: input.capsuleId,
        taskId: input.taskId,
        activityId: input.activityId,
        family: input.family,
        inputKind: input.inputKind,
        normalizationRef: exports.V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
        normalizationLocale: input.normalizationLocale,
        normalizationProfileHash: input.normalizationProfileHash,
        salt: input.salt,
        normalizedResponse,
    });
};
exports.createV2LocalEvaluatorCommitmentV1 = createV2LocalEvaluatorCommitmentV1;
const buildV2LocalEvaluatorCapsuleRawV1 = (input) => (0, decision_registry_1.canonicalJsonV1)({
    schemaVersion: "v2-local-evaluator-capsule.v1",
    ...input,
    normalizationRef: exports.V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
    assessmentSecrecy: "none_device_inspectable",
    verdictAuthority: "local_provisional_only",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    releaseAuthority: "none",
});
exports.buildV2LocalEvaluatorCapsuleRawV1 = buildV2LocalEvaluatorCapsuleRawV1;
const parseV2LocalEvaluatorCapsuleV1 = (rawCanonical) => {
    if (typeof rawCanonical !== "string" ||
        rawCanonical.length > 64 * 1024 ||
        (0, decision_registry_1.utf8ByteLengthV1)(rawCanonical) > 64 * 1024)
        throw new Error("invalid local evaluator capsule bytes");
    let decoded;
    try {
        decoded = JSON.parse(rawCanonical);
    }
    catch {
        throw new Error("invalid local evaluator capsule JSON");
    }
    if ((0, decision_registry_1.canonicalJsonV1)(decoded) !== rawCanonical ||
        typeof decoded !== "object" ||
        decoded === null ||
        Array.isArray(decoded))
        throw new Error("local evaluator capsule must be a canonical object");
    const body = decoded;
    const actualKeys = Object.keys(body).sort();
    const expectedKeys = [...BODY_KEYS].sort();
    if (actualKeys.length !== expectedKeys.length ||
        actualKeys.some((key, index) => key !== expectedKeys[index]))
        throw new Error("local evaluator capsule keys mismatch");
    for (const key of ["capsuleId", "taskId", "activityId"])
        if (typeof body[key] !== "string" || !ID_PATTERN.test(body[key]))
            throw new Error(`invalid ${key}`);
    if (body.schemaVersion !== "v2-local-evaluator-capsule.v1" ||
        !FAMILY_SET.has(String(body.family)))
        throw new Error("invalid evaluator capsule schema/family");
    const family = body.family;
    if (body.inputKind !== expectedInputKind(family))
        throw new Error("invalid evaluator family/input kind pair");
    if (body.normalizationRef !== exports.V2_LOCAL_EVALUATOR_NORMALIZATION_V1 ||
        typeof body.normalizationLocale !== "string" ||
        body.normalizationLocale.length > 255 ||
        !LOCALE_PATTERN.test(body.normalizationLocale) ||
        body.normalizationProfileHash !==
            exports.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 ||
        typeof body.salt !== "string" ||
        !HEX_64.test(body.salt))
        throw new Error("invalid evaluator normalization/salt");
    if (!Array.isArray(body.acceptedCommitments) ||
        body.acceptedCommitments.length < 1 ||
        body.acceptedCommitments.length > 32 ||
        body.acceptedCommitments.some((value) => typeof value !== "string" || !HEX_64.test(value)))
        throw new Error("invalid accepted commitments");
    const acceptedCommitments = body.acceptedCommitments;
    const sorted = [...acceptedCommitments].sort();
    if (new Set(sorted).size !== sorted.length ||
        sorted.some((value, index) => value !== acceptedCommitments[index]))
        throw new Error("accepted commitments must be sorted and unique");
    const literals = {
        assessmentSecrecy: "none_device_inspectable",
        verdictAuthority: "local_provisional_only",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: "none",
    };
    for (const [key, value] of Object.entries(literals))
        if (body[key] !== value)
            throw new Error(`invalid evaluator authority: ${key}`);
    const internal = Object.freeze(decoded);
    Object.freeze(internal.acceptedCommitments);
    const handle = Object.freeze({
        schemaVersion: "v2-local-evaluator-capsule-handle.v1",
        capsuleId: internal.capsuleId,
        taskId: internal.taskId,
        activityId: internal.activityId,
        family: internal.family,
        inputKind: internal.inputKind,
        normalizationRef: internal.normalizationRef,
        normalizationLocale: internal.normalizationLocale,
        normalizationProfileHash: internal.normalizationProfileHash,
        assessmentSecrecy: internal.assessmentSecrecy,
        verdictAuthority: internal.verdictAuthority,
    });
    internals.set(handle, internal);
    return handle;
};
exports.parseV2LocalEvaluatorCapsuleV1 = parseV2LocalEvaluatorCapsuleV1;
const isV2LocalEvaluatorCapsuleHandleV1 = (value) => typeof value === "object" && value !== null && internals.has(value);
exports.isV2LocalEvaluatorCapsuleHandleV1 = isV2LocalEvaluatorCapsuleHandleV1;
const evaluateV2LocalEvaluatorCapsuleV1 = (handle, response) => {
    const capsule = internals.get(handle);
    if (!capsule)
        throw new Error("unrecognized local evaluator capsule handle");
    let resultCode = "technical_invalid";
    let responseCommitment = null;
    if (typeof response === "object" &&
        response !== null &&
        response.kind === capsule.inputKind &&
        typeof response.value === "string") {
        try {
            responseCommitment = (0, exports.createV2LocalEvaluatorCommitmentV1)({
                ...capsule,
                response: response.value,
            });
            resultCode = capsule.acceptedCommitments.includes(responseCommitment)
                ? "provisional_correct"
                : "provisional_wrong";
        }
        catch {
            resultCode = "technical_invalid";
        }
    }
    const verdictWithoutFingerprint = {
        schemaVersion: "v2-local-evaluator-verdict.v1",
        capsuleId: capsule.capsuleId,
        taskId: capsule.taskId,
        activityId: capsule.activityId,
        family: capsule.family,
        resultCode,
        assessmentSecrecy: "none_device_inspectable",
        verdictAuthority: "local_provisional_only",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: "none",
    };
    return Object.freeze({
        ...verdictWithoutFingerprint,
        decisionFingerprint: (0, decision_registry_1.hashCanonicalBody)({
            ...verdictWithoutFingerprint,
            responseCommitment,
        }),
    });
};
exports.evaluateV2LocalEvaluatorCapsuleV1 = evaluateV2LocalEvaluatorCapsuleV1;
//# sourceMappingURL=local_evaluator_capsule_v1.js.map