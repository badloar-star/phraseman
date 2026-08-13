"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActivityAuxiliaryClientDescriptorV1 = materializeLearningV2ActivityAuxiliaryClientDescriptorV1;
exports.parseLearningV2ActivityAuxiliaryClientDescriptorV1 = parseLearningV2ActivityAuxiliaryClientDescriptorV1;
exports.encodeLearningV2ActivityAuxiliaryClientDescriptorV1 = encodeLearningV2ActivityAuxiliaryClientDescriptorV1;
exports.isLearningV2ActivityAuxiliaryClientDescriptorV1 = isLearningV2ActivityAuxiliaryClientDescriptorV1;
const generator_course_contract_1 = require("../content/generator_course_contract");
const decision_registry_1 = require("../policies/decision_registry");
const activity_audio_runtime_projection_v1_1 = require("./activity_audio_runtime_projection_v1");
const activity_learner_action_resource_v1_1 = require("./activity_learner_action_resource_v1");
const activity_post_terminal_card_capsule_v1_1 = require("./activity_post_terminal_card_capsule_v1");
exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1 = "learning-v2-activity-auxiliary-client-descriptor.v1";
exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_MAX_BYTES_V1 = 6 * 1024 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "environment",
    "studyTarget",
    "learnerSourceLocale",
    "seasonId",
    "releaseId",
    "activeManifestHash",
    "episodeId",
    "stageId",
    "sessionId",
    "sessionOrdinal",
    "activityPackageFingerprint",
    "auxiliaryIndexFingerprint",
    "auxiliaryManifestFingerprint",
    "sourceFingerprint",
    "renderFingerprint",
    "actionResource",
    "postTerminalCards",
    "audioRuntime",
    "errorSourceProjectionFingerprint",
    "errorExplanations",
    "errorExplanationCount",
    "serverProjectionClaim",
    "originAuthority",
    "assessmentSecrecy",
    "evaluatorPayload",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "publicationAuthority",
    "runtimeConsumer",
    "releaseAuthority",
    "descriptorFingerprint",
]);
const ERROR_KEYS = Object.freeze([
    "explanationRef",
    "taskId",
    "activityId",
    "textByLocale",
]);
const handles = new WeakSet();
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
function fail() {
    throw new Error("learning_v2_activity_auxiliary_client_descriptor_invalid");
}
function isPlainObject(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, keys) {
    const actual = Object.keys(value);
    if (actual.length !== keys.length ||
        actual.some((key) => !keys.includes(key)))
        fail();
}
function exactId(value) {
    if (typeof value !== "string" || !ID_RE.test(value))
        fail();
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactLocalized(value) {
    if (!isPlainObject(value))
        fail();
    exactKeys(value, generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES);
    const result = {};
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
        const text = value[locale];
        if (typeof text !== "string" ||
            text.length < 1 ||
            text.length > 2000 ||
            text !== text.normalize("NFC") ||
            CONTROL_RE.test(text))
            fail();
        result[locale] = text;
    }
    return Object.freeze(result);
}
function preflight(value) {
    const stack = [{ value, depth: 0 }];
    let nodes = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 200000 || current.depth > 32)
            fail();
        if (typeof current.value === "string") {
            if (current.value.length > 8192 ||
                current.value !== current.value.normalize("NFC") ||
                CONTROL_RE.test(current.value))
                fail();
        }
        else if (typeof current.value === "number") {
            if (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                (Number.isInteger(current.value) &&
                    !Number.isSafeInteger(current.value)))
                fail();
        }
        else if (Array.isArray(current.value)) {
            if (current.value.length > 8192)
                fail();
            for (const entry of current.value)
                stack.push({ value: entry, depth: current.depth + 1 });
        }
        else if (current.value !== null && typeof current.value === "object") {
            if (!isPlainObject(current.value))
                fail();
            const entries = Object.entries(current.value);
            if (entries.length > 64)
                fail();
            for (const [key, entry] of entries) {
                if (RESERVED_KEYS.has(key))
                    fail();
                stack.push({ value: entry, depth: current.depth + 1 });
            }
        }
        else if (current.value !== null && typeof current.value !== "boolean") {
            fail();
        }
    }
}
function parseDescriptor(value) {
    if (!isPlainObject(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1 ||
        !["lab", "staging", "production"].includes(String(value.environment)) ||
        typeof value.studyTarget !== "string" ||
        !CODE_RE.test(value.studyTarget) ||
        typeof value.learnerSourceLocale !== "string" ||
        !CODE_RE.test(value.learnerSourceLocale) ||
        !Number.isSafeInteger(value.sessionOrdinal) ||
        Number(value.sessionOrdinal) < 1 ||
        Number(value.sessionOrdinal) > 12 ||
        !Array.isArray(value.errorExplanations) ||
        value.errorExplanations.length !== 12 ||
        value.errorExplanationCount !== 12 ||
        value.serverProjectionClaim !==
            "authenticated_active_release_session_readback" ||
        value.originAuthority !== "none_transport_authentication_required" ||
        value.assessmentSecrecy !== "none_device_inspectable" ||
        value.evaluatorPayload !== "absent_by_exact_schema" ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.runtimeConsumer !== true ||
        value.releaseAuthority !== false)
        fail();
    const sessionOrdinal = Number(value.sessionOrdinal);
    const episodeId = exactId(value.episodeId);
    const sessionId = exactId(value.sessionId);
    const action = (0, activity_learner_action_resource_v1_1.parseLearningV2ActivityLearnerActionResourceV1)((0, decision_registry_1.canonicalJsonV1)(value.actionResource));
    const cards = (0, activity_post_terminal_card_capsule_v1_1.parseLearningV2ActivityPostTerminalCardCapsuleV1)((0, decision_registry_1.canonicalJsonV1)(value.postTerminalCards));
    const audio = (0, activity_audio_runtime_projection_v1_1.parseLearningV2ActivityAudioRuntimeProjectionV1)((0, decision_registry_1.canonicalJsonV1)(value.audioRuntime));
    if (action.episodeId !== episodeId ||
        action.sessionId !== sessionId ||
        action.sessionOrdinal !== sessionOrdinal ||
        cards.episodeId !== episodeId ||
        cards.sessionId !== sessionId ||
        cards.sessionOrdinal !== sessionOrdinal ||
        cards.actionResourceFingerprint !== action.resourceFingerprint ||
        audio.episodeId !== episodeId ||
        audio.sessionId !== sessionId ||
        audio.sessionOrdinal !== sessionOrdinal ||
        action.sourceFingerprint !== value.sourceFingerprint ||
        action.renderFingerprint !== value.renderFingerprint)
        fail();
    const taskIds = new Set();
    const activityIds = new Set();
    const errorExplanations = Object.freeze(value.errorExplanations.map((raw, index) => {
        if (!isPlainObject(raw))
            fail();
        exactKeys(raw, ERROR_KEYS);
        const explanationRef = exactId(raw.explanationRef);
        const taskId = exactId(raw.taskId);
        const activityId = exactId(raw.activityId);
        const actionEntry = action.entries[index];
        if (!actionEntry ||
            actionEntry.taskId !== taskId ||
            actionEntry.activityId !== activityId ||
            taskIds.has(taskId) ||
            activityIds.has(activityId))
            fail();
        taskIds.add(taskId);
        activityIds.add(activityId);
        return Object.freeze({
            explanationRef,
            taskId,
            activityId,
            textByLocale: exactLocalized(raw.textByLocale),
        });
    }));
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1,
        environment: value.environment,
        studyTarget: value.studyTarget,
        learnerSourceLocale: value.learnerSourceLocale,
        seasonId: exactId(value.seasonId),
        releaseId: exactId(value.releaseId),
        activeManifestHash: exactHash(value.activeManifestHash),
        episodeId,
        stageId: exactId(value.stageId),
        sessionId,
        sessionOrdinal,
        activityPackageFingerprint: exactHash(value.activityPackageFingerprint),
        auxiliaryIndexFingerprint: exactHash(value.auxiliaryIndexFingerprint),
        auxiliaryManifestFingerprint: exactHash(value.auxiliaryManifestFingerprint),
        sourceFingerprint: exactHash(value.sourceFingerprint),
        renderFingerprint: exactHash(value.renderFingerprint),
        actionResource: action,
        postTerminalCards: cards,
        audioRuntime: audio,
        errorSourceProjectionFingerprint: exactHash(value.errorSourceProjectionFingerprint),
        errorExplanations,
        errorExplanationCount: 12,
        serverProjectionClaim: "authenticated_active_release_session_readback",
        originAuthority: "none_transport_authentication_required",
        assessmentSecrecy: "none_device_inspectable",
        evaluatorPayload: "absent_by_exact_schema",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        runtimeConsumer: true,
        releaseAuthority: false,
    };
    if (typeof value.descriptorFingerprint !== "string" ||
        value.descriptorFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const descriptor = Object.freeze({
        ...body,
        descriptorFingerprint: value.descriptorFingerprint,
    });
    handles.add(descriptor);
    return descriptor;
}
function materializeLearningV2ActivityAuxiliaryClientDescriptorV1(input) {
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1,
        ...input,
        errorExplanationCount: 12,
        serverProjectionClaim: "authenticated_active_release_session_readback",
        originAuthority: "none_transport_authentication_required",
        assessmentSecrecy: "none_device_inspectable",
        evaluatorPayload: "absent_by_exact_schema",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        runtimeConsumer: true,
        releaseAuthority: false,
    };
    return parseLearningV2ActivityAuxiliaryClientDescriptorV1((0, decision_registry_1.canonicalJsonV1)({
        ...body,
        descriptorFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    }));
}
function parseLearningV2ActivityAuxiliaryClientDescriptorV1(raw) {
    if (typeof raw !== "string" ||
        raw.length >
            exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_MAX_BYTES_V1)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    preflight(value);
    if ((0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    return parseDescriptor(value);
}
function encodeLearningV2ActivityAuxiliaryClientDescriptorV1(value) {
    if (!isLearningV2ActivityAuxiliaryClientDescriptorV1(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
}
function isLearningV2ActivityAuxiliaryClientDescriptorV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
//# sourceMappingURL=activity_auxiliary_client_descriptor_v1.js.map