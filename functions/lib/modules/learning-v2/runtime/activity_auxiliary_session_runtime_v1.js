"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_AUXILIARY_SESSION_RUNTIME_SCHEMA_V1 = void 0;
exports.createLearningV2ActivityAuxiliarySessionRuntimeV1 = createLearningV2ActivityAuxiliarySessionRuntimeV1;
exports.isLearningV2ActivityAuxiliarySessionRuntimeV1 = isLearningV2ActivityAuxiliarySessionRuntimeV1;
const activity_auxiliary_client_descriptor_v1_1 = require("./activity_auxiliary_client_descriptor_v1");
exports.LEARNING_V2_ACTIVITY_AUXILIARY_SESSION_RUNTIME_SCHEMA_V1 = "learning-v2-activity-auxiliary-session-runtime.v1";
const runtimeHandles = new WeakSet();
function fail() {
    throw new Error("learning_v2_activity_auxiliary_session_runtime_invalid");
}
function createLearningV2ActivityAuxiliarySessionRuntimeV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !== "descriptor|interfaceLocale" ||
        !(0, activity_auxiliary_client_descriptor_v1_1.isLearningV2ActivityAuxiliaryClientDescriptorV1)(input.descriptor))
        fail();
    const descriptor = input.descriptor;
    if (!(input.interfaceLocale in descriptor.errorExplanations[0].textByLocale))
        fail();
    const tasks = new Map();
    descriptor.actionResource.entries.forEach((action, index) => {
        const explanation = descriptor.errorExplanations[index];
        const terminalCard = descriptor.postTerminalCards.entries[index];
        if (!explanation ||
            explanation.taskId !== action.taskId ||
            explanation.activityId !== action.activityId ||
            !terminalCard ||
            terminalCard.taskId !== action.taskId ||
            terminalCard.activityId !== action.activityId ||
            terminalCard.savablePhraseRef !== action.save.savablePhraseRef ||
            tasks.has(action.slot))
            fail();
        const audioAvailable = descriptor.audioRuntime.entries.some((entry) => entry.taskId === action.taskId);
        tasks.set(action.slot, Object.freeze({
            slot: action.slot,
            action,
            secondErrorExplanation: Object.freeze({
                explanationRef: explanation.explanationRef,
                text: explanation.textByLocale[input.interfaceLocale],
                interfaceLocale: input.interfaceLocale,
            }),
            audioAvailable,
            postTerminalSaveAvailable: true,
        }));
    });
    if (tasks.size !== 12)
        fail();
    const runtime = Object.freeze({
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUXILIARY_SESSION_RUNTIME_SCHEMA_V1,
        descriptorFingerprint: descriptor.descriptorFingerprint,
        activeManifestHash: descriptor.activeManifestHash,
        episodeId: descriptor.episodeId,
        sessionId: descriptor.sessionId,
        sessionOrdinal: descriptor.sessionOrdinal,
        interfaceLocale: input.interfaceLocale,
        taskCount: 12,
        transportDependency: "none_after_verified_descriptor_mount",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        releaseAuthority: false,
        resolveTaskBySlot: (slot) => {
            if (!Number.isSafeInteger(slot) || slot < 1 || slot > 12)
                fail();
            const task = tasks.get(slot);
            if (!task)
                fail();
            return task;
        },
        getDescriptor: () => descriptor,
    });
    runtimeHandles.add(runtime);
    return runtime;
}
function isLearningV2ActivityAuxiliarySessionRuntimeV1(value) {
    return (typeof value === "object" && value !== null && runtimeHandles.has(value));
}
//# sourceMappingURL=activity_auxiliary_session_runtime_v1.js.map