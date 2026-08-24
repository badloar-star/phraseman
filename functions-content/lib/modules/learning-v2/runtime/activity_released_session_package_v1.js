"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_RUNTIME_SCHEMA_V1 = exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActivityReleasedSessionPackageV1 = materializeLearningV2ActivityReleasedSessionPackageV1;
exports.parseLearningV2ActivityReleasedSessionPackageV1 = parseLearningV2ActivityReleasedSessionPackageV1;
exports.isLearningV2ActivityReleasedSessionPackageHandleV1 = isLearningV2ActivityReleasedSessionPackageHandleV1;
exports.getLearningV2ActivityReleasedSessionPackageSummaryV1 = getLearningV2ActivityReleasedSessionPackageSummaryV1;
exports.mountLearningV2ActivityReleasedSessionRuntimeV1 = mountLearningV2ActivityReleasedSessionRuntimeV1;
exports.isLearningV2ActivityReleasedSessionRuntimeHandleV1 = isLearningV2ActivityReleasedSessionRuntimeHandleV1;
exports.getLearningV2ActivityReleasedSessionRuntimeSummaryV1 = getLearningV2ActivityReleasedSessionRuntimeSummaryV1;
exports.getLearningV2ActivityReleasedSessionTaskV1 = getLearningV2ActivityReleasedSessionTaskV1;
exports.evaluateLearningV2ActivityReleasedSessionTaskV1 = evaluateLearningV2ActivityReleasedSessionTaskV1;
const generator_course_contract_1 = require("../content/generator_course_contract");
const decision_registry_1 = require("../policies/decision_registry");
const activity_auxiliary_client_descriptor_v1_1 = require("./activity_auxiliary_client_descriptor_v1");
const activity_auxiliary_session_runtime_v1_1 = require("./activity_auxiliary_session_runtime_v1");
const local_evaluator_capsule_v1_1 = require("./local_evaluator_capsule_v1");
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V1 = "learning-v2-activity-released-session-package.v1";
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_MAX_BYTES_V1 = 7 * 1024 * 1024;
exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_RUNTIME_SCHEMA_V1 = "learning-v2-activity-released-session-runtime.v1";
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const FAMILY_SET = new Set([
    "phrase_builder",
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "context_gap_grammar",
    "speed_match",
    "scripted_repeat_compare",
]);
const PURPOSE_SET = new Set([
    "intro_comprehension_check",
    "supported_practice",
    "guided_practice",
    "retrieval_practice",
    "near_transfer",
    "independent_check",
    "interleaved_review",
]);
const SUPPORT_SET = new Set([
    "model",
    "full_text",
    "partial",
    "visual",
    "none",
]);
const INPUT_MODE_SET = new Set([
    "ordered_tokens",
    "single_choice",
    "scripted_speech",
]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "activityPackageFingerprint",
    "auxiliaryDescriptorRaw",
    "renderRaw",
    "capsuleEnvelopeRaw",
    "auxiliaryDescriptorFingerprint",
    "renderFingerprint",
    "capsuleEnvelopeFingerprint",
    "sourceFingerprint",
    "taskCount",
    "learnerSurfaceBinding",
    "assessmentSecrecy",
    "localFeedbackAuthority",
    "transportAuthentication",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "completionAuthority",
    "releaseAuthority",
    "packageFingerprint",
]);
const RENDER_KEYS = Object.freeze([
    "schemaVersion",
    "sourceFingerprint",
    "episodeId",
    "targetLanguage",
    "session",
    "executionAuthority",
    "rewardAuthority",
    "runtimeConsumer",
    "releaseAuthority",
]);
const SESSION_KEYS = Object.freeze([
    "sessionId",
    "ordinal",
    "zone",
    "targetSeconds",
    "tasks",
]);
const TASK_KEYS = Object.freeze([
    "taskId",
    "slot",
    "purpose",
    "family",
    "answerExposure",
    "promptNovelty",
    "inputMode",
    "support",
    "hintsAllowed",
    "learner",
    "scriptedAlternate",
    "runtimeCapabilityId",
]);
const LEARNER_KEYS = Object.freeze([
    "promptId",
    "prompt",
    "responseOptions",
    "mediaIds",
    "audioTargetIds",
    "accessibilityLabel",
]);
const OPTION_KEYS = Object.freeze(["responseId", "text"]);
const ALTERNATE_KEYS = Object.freeze([
    "alternateId",
    "instruction",
    "voiceEvidenceEquivalent",
    "canAward",
]);
const ENVELOPE_KEYS = Object.freeze([
    "schemaVersion",
    "sourceFingerprint",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "normalizationLocale",
    "normalizationProfileHash",
    "capsules",
    "commitmentAggregate",
    "consumer",
    "verdictAuthority",
]);
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const packageHandles = new WeakSet();
const packageMaterials = new WeakMap();
const runtimeHandles = new WeakSet();
const runtimeMaterials = new WeakMap();
function fail() {
    throw new Error("learning_v2_activity_released_session_package_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const keys = Object.keys(value);
    if (keys.length !== expected.length ||
        keys.some((key) => !expected.includes(key)))
        fail();
}
function exactId(value) {
    if (typeof value !== "string" ||
        !ID_RE.test(value) ||
        RESERVED_KEYS.has(value))
        fail();
    return value;
}
function exactHash(value) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail();
    return value;
}
function exactText(value, maximum = 8_192) {
    if (typeof value !== "string" ||
        value.length < 1 ||
        value.length > maximum ||
        value !== value.normalize("NFC") ||
        /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u.test(value))
        fail();
    return value;
}
function preflight(value) {
    const stack = [{ value, depth: 0 }];
    let nodes = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 220_000 || current.depth > 32)
            fail();
        if (typeof current.value === "string") {
            if (current.value.length >
                exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_MAX_BYTES_V1)
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
            if (current.value.length > 8_192)
                fail();
            current.value.forEach((child) => stack.push({ value: child, depth: current.depth + 1 }));
        }
        else if (current.value !== null && typeof current.value === "object") {
            if (!record(current.value))
                fail();
            const entries = Object.entries(current.value);
            if (entries.length > 64 ||
                entries.some(([key]) => RESERVED_KEYS.has(key)))
                fail();
            entries.forEach(([, child]) => stack.push({ value: child, depth: current.depth + 1 }));
        }
        else if (current.value !== null && typeof current.value !== "boolean")
            fail();
    }
}
function parseCanonical(raw, maximum) {
    if (typeof raw !== "string" ||
        raw.length > maximum ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > maximum)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    preflight(value);
    if (!record(value) || (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    return value;
}
function parseLearner(value) {
    if (!record(value))
        fail();
    exactKeys(value, LEARNER_KEYS);
    if (!Array.isArray(value.responseOptions) ||
        value.responseOptions.length > 16 ||
        !Array.isArray(value.mediaIds) ||
        value.mediaIds.length > 16 ||
        !Array.isArray(value.audioTargetIds) ||
        value.audioTargetIds.length > 16)
        fail();
    const responseOptions = value.responseOptions.map((candidate) => {
        if (!record(candidate))
            fail();
        exactKeys(candidate, OPTION_KEYS);
        return Object.freeze({
            responseId: exactId(candidate.responseId),
            text: exactText(candidate.text, 4_096),
        });
    });
    if (new Set(responseOptions.map((entry) => entry.responseId)).size !==
        responseOptions.length)
        fail();
    const mediaIds = value.mediaIds.map(exactId);
    const audioTargetIds = value.audioTargetIds.map(exactId);
    if (new Set(mediaIds).size !== mediaIds.length ||
        new Set(audioTargetIds).size !== audioTargetIds.length)
        fail();
    return Object.freeze({
        promptId: exactId(value.promptId),
        prompt: exactText(value.prompt),
        responseOptions: Object.freeze(responseOptions),
        mediaIds: Object.freeze(mediaIds),
        audioTargetIds: Object.freeze(audioTargetIds),
        accessibilityLabel: exactText(value.accessibilityLabel, 4_096),
    });
}
function parseTask(value, expectedSlot) {
    if (!record(value))
        fail();
    exactKeys(value, TASK_KEYS);
    if (value.slot !== expectedSlot ||
        !PURPOSE_SET.has(String(value.purpose)) ||
        !FAMILY_SET.has(String(value.family)) ||
        !["allowed_after_attempt", "forbidden"].includes(String(value.answerExposure)) ||
        !["trained", "varied", "novel"].includes(String(value.promptNovelty)) ||
        !INPUT_MODE_SET.has(String(value.inputMode)) ||
        !SUPPORT_SET.has(String(value.support)) ||
        ![0, 1, 2].includes(Number(value.hintsAllowed)))
        fail();
    let scriptedAlternate = null;
    if (value.scriptedAlternate !== null) {
        if (!record(value.scriptedAlternate))
            fail();
        exactKeys(value.scriptedAlternate, ALTERNATE_KEYS);
        if (value.scriptedAlternate.voiceEvidenceEquivalent !== false ||
            value.scriptedAlternate.canAward !== false)
            fail();
        scriptedAlternate = Object.freeze({
            alternateId: exactId(value.scriptedAlternate.alternateId),
            instruction: exactText(value.scriptedAlternate.instruction, 4_096),
            voiceEvidenceEquivalent: false,
            canAward: false,
        });
    }
    return Object.freeze({
        slot: expectedSlot,
        taskId: exactId(value.taskId),
        purpose: String(value.purpose),
        family: String(value.family),
        answerExposure: value.answerExposure,
        promptNovelty: value.promptNovelty,
        inputMode: value.inputMode,
        support: value.support,
        hintsAllowed: Number(value.hintsAllowed),
        learner: parseLearner(value.learner),
        scriptedAlternate,
        runtimeCapabilityId: exactId(value.runtimeCapabilityId),
        evaluatorInputKind: value.inputMode === "single_choice"
            ? "choice_token"
            : value.inputMode === "scripted_speech"
                ? "transcript"
                : "text",
    });
}
function parseRender(raw, descriptor) {
    const render = parseCanonical(raw, 256 * 1024);
    exactKeys(render, RENDER_KEYS);
    if (render.schemaVersion !== "v2-activity-session-render-seed.v2" ||
        render.sourceFingerprint !== descriptor.sourceFingerprint ||
        render.episodeId !== descriptor.episodeId ||
        render.targetLanguage !== descriptor.studyTarget ||
        render.executionAuthority !== "none" ||
        render.rewardAuthority !== "none" ||
        render.runtimeConsumer !== false ||
        render.releaseAuthority !== false ||
        !record(render.session))
        fail();
    exactKeys(render.session, SESSION_KEYS);
    if (render.session.sessionId !== descriptor.sessionId ||
        render.session.ordinal !== descriptor.sessionOrdinal ||
        !["understand", "use", "master"].includes(String(render.session.zone)) ||
        !Number.isSafeInteger(render.session.targetSeconds) ||
        Number(render.session.targetSeconds) < 1 ||
        !Array.isArray(render.session.tasks) ||
        render.session.tasks.length !== 12)
        fail();
    const tasks = render.session.tasks.map((task, index) => parseTask(task, index + 1));
    if (new Set(tasks.map((task) => task.taskId)).size !== 12)
        fail();
    return Object.freeze(tasks);
}
function parseCapsules(raw, descriptor, tasks) {
    const envelope = parseCanonical(raw, 64 * 1024);
    exactKeys(envelope, ENVELOPE_KEYS);
    if (envelope.schemaVersion !== "v2-activity-session-capsule-envelope.v1" ||
        envelope.sourceFingerprint !== descriptor.sourceFingerprint ||
        envelope.episodeId !== descriptor.episodeId ||
        envelope.sessionId !== descriptor.sessionId ||
        envelope.sessionOrdinal !== descriptor.sessionOrdinal ||
        typeof envelope.normalizationLocale !== "string" ||
        !HASH_RE.test(String(envelope.normalizationProfileHash)) ||
        !HASH_RE.test(String(envelope.commitmentAggregate)) ||
        envelope.consumer !== "app_internal_local_evaluator_only" ||
        envelope.verdictAuthority !== "local_provisional_only" ||
        !Array.isArray(envelope.capsules) ||
        envelope.capsules.length !== 12)
        fail();
    const actionBySlot = descriptor.actionResource.entries;
    const result = new Map();
    envelope.capsules.forEach((capsuleRaw, index) => {
        if (typeof capsuleRaw !== "string")
            fail();
        let capsule;
        try {
            capsule = (0, local_evaluator_capsule_v1_1.parseV2LocalEvaluatorCapsuleV1)(capsuleRaw);
        }
        catch {
            fail();
        }
        const task = tasks[index];
        const action = actionBySlot[index];
        if (!(0, local_evaluator_capsule_v1_1.isV2LocalEvaluatorCapsuleHandleV1)(capsule) ||
            !task ||
            !action ||
            action.slot !== index + 1 ||
            action.taskId !== task.taskId ||
            capsule.taskId !== task.taskId ||
            capsule.activityId !== action.activityId ||
            capsule.family !== task.family ||
            capsule.inputKind !== task.evaluatorInputKind ||
            result.has(capsule.taskId))
            fail();
        result.set(capsule.taskId, capsule);
    });
    return result;
}
function packageMaterial(handle) {
    const material = packageMaterials.get(handle);
    if (!material || !packageHandles.has(handle))
        fail();
    return material;
}
function materializeLearningV2ActivityReleasedSessionPackageV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "capsuleEnvelopeRaw|descriptor|renderRaw" ||
        !(0, activity_auxiliary_client_descriptor_v1_1.isLearningV2ActivityAuxiliaryClientDescriptorV1)(input.descriptor))
        fail();
    const auxiliaryDescriptorRaw = (0, activity_auxiliary_client_descriptor_v1_1.encodeLearningV2ActivityAuxiliaryClientDescriptorV1)(input.descriptor);
    const renderFingerprint = (0, decision_registry_1.sha256Utf8)(input.renderRaw);
    const capsuleEnvelopeFingerprint = (0, decision_registry_1.sha256Utf8)(input.capsuleEnvelopeRaw);
    if (renderFingerprint !== input.descriptor.renderFingerprint)
        fail();
    const body = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V1,
        episodeId: input.descriptor.episodeId,
        sessionId: input.descriptor.sessionId,
        sessionOrdinal: input.descriptor.sessionOrdinal,
        activityPackageFingerprint: input.descriptor.activityPackageFingerprint,
        auxiliaryDescriptorRaw,
        renderRaw: input.renderRaw,
        capsuleEnvelopeRaw: input.capsuleEnvelopeRaw,
        auxiliaryDescriptorFingerprint: input.descriptor.descriptorFingerprint,
        renderFingerprint,
        capsuleEnvelopeFingerprint,
        sourceFingerprint: input.descriptor.sourceFingerprint,
        taskCount: 12,
        learnerSurfaceBinding: "exact_render_action_capsule_bijection",
        assessmentSecrecy: "none_device_inspectable",
        localFeedbackAuthority: "local_provisional_only",
        transportAuthentication: "required_outside_pure_package",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: false,
    });
    const raw = (0, decision_registry_1.canonicalJsonV1)({
        ...body,
        packageFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    parseLearningV2ActivityReleasedSessionPackageV1(raw);
    return raw;
}
function parseLearningV2ActivityReleasedSessionPackageV1(raw) {
    const value = parseCanonical(raw, exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_MAX_BYTES_V1);
    exactKeys(value, ROOT_KEYS);
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V1 ||
        value.taskCount !== 12 ||
        value.learnerSurfaceBinding !== "exact_render_action_capsule_bijection" ||
        value.assessmentSecrecy !== "none_device_inspectable" ||
        value.localFeedbackAuthority !== "local_provisional_only" ||
        value.transportAuthentication !== "required_outside_pure_package" ||
        value.walletAuthority !== "none" ||
        value.masteryAuthority !== "none" ||
        value.evidenceAuthority !== "none" ||
        value.completionAuthority !== "none" ||
        value.releaseAuthority !== false ||
        typeof value.auxiliaryDescriptorRaw !== "string" ||
        typeof value.renderRaw !== "string" ||
        typeof value.capsuleEnvelopeRaw !== "string")
        fail();
    let descriptor;
    try {
        descriptor = (0, activity_auxiliary_client_descriptor_v1_1.parseLearningV2ActivityAuxiliaryClientDescriptorV1)(value.auxiliaryDescriptorRaw);
    }
    catch {
        fail();
    }
    const renderFingerprint = (0, decision_registry_1.sha256Utf8)(value.renderRaw);
    const capsuleEnvelopeFingerprint = (0, decision_registry_1.sha256Utf8)(value.capsuleEnvelopeRaw);
    if (value.episodeId !== descriptor.episodeId ||
        value.sessionId !== descriptor.sessionId ||
        value.sessionOrdinal !== descriptor.sessionOrdinal ||
        value.activityPackageFingerprint !==
            descriptor.activityPackageFingerprint ||
        value.auxiliaryDescriptorFingerprint !== descriptor.descriptorFingerprint ||
        value.renderFingerprint !== renderFingerprint ||
        value.renderFingerprint !== descriptor.renderFingerprint ||
        value.capsuleEnvelopeFingerprint !== capsuleEnvelopeFingerprint ||
        value.sourceFingerprint !== descriptor.sourceFingerprint)
        fail();
    const tasks = parseRender(value.renderRaw, descriptor);
    const capsulesByTaskId = parseCapsules(value.capsuleEnvelopeRaw, descriptor, tasks);
    const body = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V1,
        episodeId: exactId(value.episodeId),
        sessionId: exactId(value.sessionId),
        sessionOrdinal: Number(value.sessionOrdinal),
        activityPackageFingerprint: exactHash(value.activityPackageFingerprint),
        auxiliaryDescriptorRaw: value.auxiliaryDescriptorRaw,
        renderRaw: value.renderRaw,
        capsuleEnvelopeRaw: value.capsuleEnvelopeRaw,
        auxiliaryDescriptorFingerprint: exactHash(value.auxiliaryDescriptorFingerprint),
        renderFingerprint,
        capsuleEnvelopeFingerprint,
        sourceFingerprint: exactHash(value.sourceFingerprint),
        taskCount: 12,
        learnerSurfaceBinding: "exact_render_action_capsule_bijection",
        assessmentSecrecy: "none_device_inspectable",
        localFeedbackAuthority: "local_provisional_only",
        transportAuthentication: "required_outside_pure_package",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: false,
    });
    const packageFingerprint = (0, decision_registry_1.hashCanonicalBody)(body);
    if (value.packageFingerprint !== packageFingerprint ||
        (0, decision_registry_1.canonicalJsonV1)({ ...body, packageFingerprint }) !== raw)
        fail();
    const summary = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_PACKAGE_SCHEMA_V1,
        episodeId: body.episodeId,
        sessionId: body.sessionId,
        sessionOrdinal: body.sessionOrdinal,
        activityPackageFingerprint: body.activityPackageFingerprint,
        auxiliaryDescriptorFingerprint: body.auxiliaryDescriptorFingerprint,
        renderFingerprint,
        capsuleEnvelopeFingerprint,
        sourceFingerprint: body.sourceFingerprint,
        taskCount: 12,
        learnerSurfaceBinding: body.learnerSurfaceBinding,
        assessmentSecrecy: body.assessmentSecrecy,
        localFeedbackAuthority: body.localFeedbackAuthority,
        transportAuthentication: body.transportAuthentication,
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: false,
        packageFingerprint,
    });
    const handle = Object.freeze({});
    packageHandles.add(handle);
    packageMaterials.set(handle, Object.freeze({ summary, descriptor, tasks, capsulesByTaskId }));
    return handle;
}
function isLearningV2ActivityReleasedSessionPackageHandleV1(value) {
    return (typeof value === "object" && value !== null && packageHandles.has(value));
}
function getLearningV2ActivityReleasedSessionPackageSummaryV1(handle) {
    return packageMaterial(handle).summary;
}
function mountLearningV2ActivityReleasedSessionRuntimeV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !== "interfaceLocale|packageHandle" ||
        !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(input.interfaceLocale))
        fail();
    const material = packageMaterial(input.packageHandle);
    const auxiliaryRuntime = (0, activity_auxiliary_session_runtime_v1_1.createLearningV2ActivityAuxiliarySessionRuntimeV1)({
        descriptor: material.descriptor,
        interfaceLocale: input.interfaceLocale,
    });
    const tasks = new Map();
    material.tasks.forEach((task) => {
        const actions = auxiliaryRuntime.resolveTaskBySlot(task.slot);
        const action = actions.action;
        if (action.taskId !== task.taskId ||
            action.family !== task.family ||
            action.promptId !== task.learner.promptId ||
            action.report.prompt !== task.learner.prompt ||
            (0, decision_registry_1.canonicalJsonV1)(action.report.responseOptions) !==
                (0, decision_registry_1.canonicalJsonV1)(task.learner.responseOptions))
            fail();
        tasks.set(task.slot, Object.freeze({
            ...task,
            activityId: action.activityId,
            actions,
            localFeedbackAuthority: "local_provisional_only",
        }));
    });
    if (tasks.size !== 12)
        fail();
    const body = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_RELEASED_SESSION_RUNTIME_SCHEMA_V1,
        environment: material.descriptor.environment,
        studyTarget: material.descriptor.studyTarget,
        learnerSourceLocale: material.descriptor.learnerSourceLocale,
        seasonId: material.descriptor.seasonId,
        releaseId: material.descriptor.releaseId,
        activeManifestHash: material.descriptor.activeManifestHash,
        stageId: material.descriptor.stageId,
        activityPackageFingerprint: material.descriptor.activityPackageFingerprint,
        packageFingerprint: material.summary.packageFingerprint,
        descriptorFingerprint: material.descriptor.descriptorFingerprint,
        episodeId: material.summary.episodeId,
        sessionId: material.summary.sessionId,
        sessionOrdinal: material.summary.sessionOrdinal,
        interfaceLocale: input.interfaceLocale,
        taskCount: 12,
        answerTransport: "none_local_capsule_only",
        localFeedbackAuthority: "local_provisional_only",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        completionAuthority: "none",
        releaseAuthority: false,
    });
    const summary = Object.freeze({
        ...body,
        runtimeFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    const handle = Object.freeze({});
    runtimeHandles.add(handle);
    runtimeMaterials.set(handle, Object.freeze({
        summary,
        tasks,
        capsulesByTaskId: material.capsulesByTaskId,
    }));
    return handle;
}
function runtimeMaterial(handle) {
    const material = runtimeMaterials.get(handle);
    if (!material || !runtimeHandles.has(handle))
        fail();
    return material;
}
function isLearningV2ActivityReleasedSessionRuntimeHandleV1(value) {
    return (typeof value === "object" && value !== null && runtimeHandles.has(value));
}
function getLearningV2ActivityReleasedSessionRuntimeSummaryV1(handle) {
    return runtimeMaterial(handle).summary;
}
function getLearningV2ActivityReleasedSessionTaskV1(handle, slot) {
    if (!Number.isSafeInteger(slot) || slot < 1 || slot > 12)
        fail();
    const task = runtimeMaterial(handle).tasks.get(slot);
    if (!task)
        fail();
    return task;
}
function evaluateLearningV2ActivityReleasedSessionTaskV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !== "response|runtime|taskId")
        fail();
    const material = runtimeMaterial(input.runtime);
    const capsule = material.capsulesByTaskId.get(exactId(input.taskId));
    if (!capsule)
        fail();
    return (0, local_evaluator_capsule_v1_1.evaluateV2LocalEvaluatorCapsuleV1)(capsule, input.response);
}
//# sourceMappingURL=activity_released_session_package_v1.js.map