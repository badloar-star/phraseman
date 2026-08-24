"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isVerifiedRequiredSessionTaskOutcome = exports.verifyRequiredSessionTaskAnswer = exports.parsePublishedRequiredSessionAnswerManifest = exports.createPublishedRequiredSessionAnswerManifest = exports.requiredSessionTaskAnswerResponseFingerprint = exports.parseRequiredSessionTaskAnswerResponse = exports.parseRequiredSessionTaskAnswerKey = exports.materializeRequiredSessionTaskAnswerKey = exports.requiredSessionAnswerProofFingerprint = exports.normalizeRequiredSessionShortAnswer = void 0;
const wallet_1 = require("../../../modules/learning-v2/contracts/wallet");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const required_session_answer_1 = require("../../../modules/learning-v2/contracts/required_session_answer");
Object.defineProperty(exports, "normalizeRequiredSessionShortAnswer", { enumerable: true, get: function () { return required_session_answer_1.normalizeRequiredSessionShortAnswer; } });
Object.defineProperty(exports, "requiredSessionAnswerProofFingerprint", { enumerable: true, get: function () { return required_session_answer_1.requiredSessionAnswerProofFingerprint; } });
const KEY_INPUT_KEYS = [
    "taskId",
    "activityId",
    "family",
    "expectedAnswer",
];
const KEY_KEYS = [
    "schemaVersion",
    "taskId",
    "activityId",
    "family",
    "normalization",
    "expectedAnswerFingerprint",
    "answerKeyFingerprint",
];
const RESPONSE_KEYS = [
    "schemaVersion",
    "taskId",
    "activityId",
    "family",
    "submittedAnswer",
];
const ANSWER_MANIFEST_BODY_KEYS = [
    "schemaVersion",
    "courseId",
    "studyTarget",
    "courseReleaseId",
    "seasonRevisionId",
    "episodeRevisionFingerprint",
    "episodeContentHash",
    "sessionSetId",
    "sessionSetHash",
    "answerKeys",
];
const ANSWER_MANIFEST_KEYS = [
    ...ANSWER_MANIFEST_BODY_KEYS,
    "manifestFingerprint",
];
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HASH = /^[a-f0-9]{64}$/;
const VERIFIED = new WeakSet();
const fail = () => {
    throw new Error("required_session_answer_invalid");
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, expected) => {
    const keys = Reflect.ownKeys(value);
    return keys.length === expected.length && keys.every((key) => typeof key === "string" && expected.includes(key));
};
const isFamily = (value) => (0, required_session_answer_1.isServerVerifiableRequiredSessionFamily)(value);
const isId = (value) => typeof value === "string" && ID.test(value);
const deepFreeze = (value) => {
    if (typeof value !== "object" || value === null || Object.isFrozen(value))
        return value;
    Object.freeze(value);
    for (const child of Object.values(value))
        deepFreeze(child);
    return value;
};
const detach = (input) => {
    let detached;
    try {
        detached = (0, wallet_1.detachBoundedWalletJson)(input, "required_session_answer_invalid");
    }
    catch {
        return fail();
    }
    if (!isRecord(detached) || Object.getPrototypeOf(detached) !== Object.prototype) {
        return fail();
    }
    return detached;
};
const readAnswerManifestRecord = (input, keys) => {
    try {
        if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
            return fail();
        const descriptors = Object.getOwnPropertyDescriptors(input);
        const ownKeys = Reflect.ownKeys(input);
        if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)))
            return fail();
        const result = Object.create(null);
        for (const key of keys) {
            const descriptor = descriptors[key];
            if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
                return fail();
            result[key] = descriptor.value;
        }
        return result;
    }
    catch {
        return fail();
    }
};
const readAnswerKeyArray = (input) => {
    try {
        if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype ||
            input.length < 1 || input.length > 144 ||
            Reflect.ownKeys(input).length !== input.length + 1)
            return fail();
        const result = [];
        for (let index = 0; index < input.length; index += 1) {
            const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
            if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
                return fail();
            result.push(descriptor.value);
        }
        return result;
    }
    catch {
        return fail();
    }
};
const materializeRequiredSessionTaskAnswerKey = (input) => {
    const value = detach(input);
    if (!exactKeys(value, KEY_INPUT_KEYS) || !isId(value.taskId) ||
        !isId(value.activityId) || !isFamily(value.family))
        return fail();
    const expectedAnswerFingerprint = (0, required_session_answer_1.requiredSessionAnswerProofFingerprint)(value.expectedAnswer);
    const body = {
        schemaVersion: "learning-v2-required-session-task-answer-key.v1",
        taskId: value.taskId,
        activityId: value.activityId,
        family: value.family,
        normalization: "learning-v2-short-answer-normalization.v1",
        expectedAnswerFingerprint,
    };
    return deepFreeze({
        ...body,
        answerKeyFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
exports.materializeRequiredSessionTaskAnswerKey = materializeRequiredSessionTaskAnswerKey;
const parseRequiredSessionTaskAnswerKey = (input) => {
    const value = detach(input);
    if (!exactKeys(value, KEY_KEYS) ||
        value.schemaVersion !== "learning-v2-required-session-task-answer-key.v1" ||
        !isId(value.taskId) || !isId(value.activityId) || !isFamily(value.family) ||
        value.normalization !== "learning-v2-short-answer-normalization.v1" ||
        typeof value.expectedAnswerFingerprint !== "string" ||
        !HASH.test(value.expectedAnswerFingerprint) ||
        typeof value.answerKeyFingerprint !== "string" ||
        !HASH.test(value.answerKeyFingerprint))
        return fail();
    const body = {
        schemaVersion: "learning-v2-required-session-task-answer-key.v1",
        taskId: value.taskId,
        activityId: value.activityId,
        family: value.family,
        normalization: "learning-v2-short-answer-normalization.v1",
        expectedAnswerFingerprint: value.expectedAnswerFingerprint,
    };
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== value.answerKeyFingerprint)
        return fail();
    return deepFreeze({ ...body, answerKeyFingerprint: value.answerKeyFingerprint });
};
exports.parseRequiredSessionTaskAnswerKey = parseRequiredSessionTaskAnswerKey;
const parseRequiredSessionTaskAnswerResponse = (input) => {
    const response = detach(input);
    if (!exactKeys(response, RESPONSE_KEYS) ||
        response.schemaVersion !== "learning-v2-required-session-task-answer-response.v1" ||
        !isId(response.taskId) || !isId(response.activityId) ||
        !isFamily(response.family) || typeof response.submittedAnswer !== "string") {
        return fail();
    }
    // Validate bounds/Unicode now; keep the original only until server scoring.
    (0, required_session_answer_1.normalizeRequiredSessionShortAnswer)(response.submittedAnswer);
    return deepFreeze({
        schemaVersion: "learning-v2-required-session-task-answer-response.v1",
        taskId: response.taskId,
        activityId: response.activityId,
        family: response.family,
        submittedAnswer: response.submittedAnswer,
    });
};
exports.parseRequiredSessionTaskAnswerResponse = parseRequiredSessionTaskAnswerResponse;
const requiredSessionTaskAnswerResponseFingerprint = (input) => {
    const response = (0, exports.parseRequiredSessionTaskAnswerResponse)(input);
    return (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-required-session-task-answer-response-fingerprint.v1",
        taskId: response.taskId,
        activityId: response.activityId,
        family: response.family,
        normalizedAnswer: (0, required_session_answer_1.normalizeRequiredSessionShortAnswer)(response.submittedAnswer),
    });
};
exports.requiredSessionTaskAnswerResponseFingerprint = requiredSessionTaskAnswerResponseFingerprint;
const createPublishedRequiredSessionAnswerManifest = (input) => {
    const value = readAnswerManifestRecord(input, ANSWER_MANIFEST_BODY_KEYS);
    if (!exactKeys(value, ANSWER_MANIFEST_BODY_KEYS) ||
        value.schemaVersion !== "learning-v2-published-required-session-answer-manifest.v1" ||
        !isId(value.courseId) || typeof value.studyTarget !== "string" ||
        !/^[a-z]{2,12}(?:-[A-Za-z0-9]{2,12})*$/.test(value.studyTarget) ||
        !isId(value.courseReleaseId) || !isId(value.seasonRevisionId) ||
        typeof value.episodeRevisionFingerprint !== "string" ||
        !HASH.test(value.episodeRevisionFingerprint) ||
        typeof value.episodeContentHash !== "string" || !HASH.test(value.episodeContentHash) ||
        !isId(value.sessionSetId) || typeof value.sessionSetHash !== "string" ||
        !HASH.test(value.sessionSetHash))
        return fail();
    const answerKeys = readAnswerKeyArray(value.answerKeys).map(exports.parseRequiredSessionTaskAnswerKey)
        .sort((left, right) => left.taskId.localeCompare(right.taskId, "en"));
    if (new Set(answerKeys.map((entry) => entry.taskId)).size !== answerKeys.length)
        return fail();
    const body = {
        schemaVersion: "learning-v2-published-required-session-answer-manifest.v1",
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        courseReleaseId: value.courseReleaseId,
        seasonRevisionId: value.seasonRevisionId,
        episodeRevisionFingerprint: value.episodeRevisionFingerprint,
        episodeContentHash: value.episodeContentHash,
        sessionSetId: value.sessionSetId,
        sessionSetHash: value.sessionSetHash,
        answerKeys: Object.freeze(answerKeys),
    };
    return deepFreeze({ ...body, manifestFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) });
};
exports.createPublishedRequiredSessionAnswerManifest = createPublishedRequiredSessionAnswerManifest;
const parsePublishedRequiredSessionAnswerManifest = (input) => {
    const value = readAnswerManifestRecord(input, ANSWER_MANIFEST_KEYS);
    if (!exactKeys(value, ANSWER_MANIFEST_KEYS) ||
        typeof value.manifestFingerprint !== "string" ||
        !HASH.test(value.manifestFingerprint))
        return fail();
    const body = Object.fromEntries(ANSWER_MANIFEST_BODY_KEYS.map((key) => [key, value[key]]));
    const parsed = (0, exports.createPublishedRequiredSessionAnswerManifest)(body);
    if (parsed.manifestFingerprint !== value.manifestFingerprint ||
        (0, decision_registry_1.hashCanonicalBody)(value.answerKeys) !== (0, decision_registry_1.hashCanonicalBody)(parsed.answerKeys))
        return fail();
    return parsed;
};
exports.parsePublishedRequiredSessionAnswerManifest = parsePublishedRequiredSessionAnswerManifest;
const verifyRequiredSessionTaskAnswer = (input) => {
    const request = detach(input);
    if (!exactKeys(request, ["answerKey", "response"]))
        return fail();
    const answerKey = (0, exports.parseRequiredSessionTaskAnswerKey)(request.answerKey);
    const response = (0, exports.parseRequiredSessionTaskAnswerResponse)(request.response);
    if (response.taskId !== answerKey.taskId ||
        response.activityId !== answerKey.activityId ||
        response.family !== answerKey.family)
        return fail();
    const responseFingerprint = (0, required_session_answer_1.requiredSessionAnswerProofFingerprint)(response.submittedAnswer);
    const body = {
        schemaVersion: "learning-v2-verified-required-task-outcome.v1",
        authority: "server_answer_verifier",
        taskId: answerKey.taskId,
        activityId: answerKey.activityId,
        family: answerKey.family,
        resultCode: responseFingerprint === answerKey.expectedAnswerFingerprint
            ? "CORRECT"
            : "WRONG",
        answerKeyFingerprint: answerKey.answerKeyFingerprint,
        responseFingerprint,
    };
    const outcome = deepFreeze({
        ...body,
        decisionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    VERIFIED.add(outcome);
    return outcome;
};
exports.verifyRequiredSessionTaskAnswer = verifyRequiredSessionTaskAnswer;
/** Runtime capability check used before a verified outcome may reach scoring. */
const isVerifiedRequiredSessionTaskOutcome = (input) => isRecord(input) && VERIFIED.has(input);
exports.isVerifiedRequiredSessionTaskOutcome = isVerifiedRequiredSessionTaskOutcome;
//# sourceMappingURL=required_session_answer_verifier.js.map