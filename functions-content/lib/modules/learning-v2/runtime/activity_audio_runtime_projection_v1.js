"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_ENTRY_MAX_COUNT_V1 = exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActivityAudioRuntimeProjectionV1 = materializeLearningV2ActivityAudioRuntimeProjectionV1;
exports.encodeLearningV2ActivityAudioRuntimeProjectionV1 = encodeLearningV2ActivityAudioRuntimeProjectionV1;
exports.parseLearningV2ActivityAudioRuntimeProjectionV1 = parseLearningV2ActivityAudioRuntimeProjectionV1;
exports.isLearningV2ActivityAudioRuntimeProjectionV1 = isLearningV2ActivityAudioRuntimeProjectionV1;
exports.selectLearningV2ActivityTaskAudioV1 = selectLearningV2ActivityTaskAudioV1;
exports.getLearningV2ActivitySelectableAudioBindingsV1 = getLearningV2ActivitySelectableAudioBindingsV1;
exports.bindLearningV2ActivityAttemptAudioV1 = bindLearningV2ActivityAttemptAudioV1;
exports.isLearningV2ActivityAttemptAudioBindingV1 = isLearningV2ActivityAttemptAudioBindingV1;
const decision_registry_1 = require("../policies/decision_registry");
const voice_playback_policy_v1_1 = require("../contracts/voice_playback_policy_v1");
exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_SCHEMA_V1 = "learning-v2-activity-audio-runtime-projection.v1";
exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1 = 4 * 1024 * 1024;
exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_ENTRY_MAX_COUNT_V1 = 4_096;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const AUDIO_PATH_RE = /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ENTRY_KEYS = Object.freeze([
    "generationTargetFingerprint",
    "itemFingerprint",
    "taskId",
    "taskVoiceGroupFingerprint",
    "audioTargetId",
    "inputKind",
    "wordId",
    "wordOrdinal",
    "voiceId",
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
    "codecRulesFingerprint",
    "codecResultFingerprint",
    "entryFingerprint",
]);
const PROJECTION_KEYS = Object.freeze([
    "schemaVersion",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "voiceAudioManifestFingerprint",
    "sourceSessionManifestFingerprint",
    "activityAudioCatalogFingerprint",
    "voiceTargetsPackageFingerprint",
    "entryCount",
    "entries",
    "selectableBindingCount",
    "selectableBindings",
    "orderedEntryAggregateFingerprint",
    "voiceCoverage",
    "taskVoiceSelectionScope",
    "storagePinAuthority",
    "runtimeAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "publicationAuthority",
    "releaseEligible",
    "releaseAuthority",
    "projectionFingerprint",
]);
const SELECTABLE_BINDING_KEYS = Object.freeze([
    "taskId",
    "taskVoiceGroupFingerprint",
    "selectableId",
    "audioTargetId",
    "wordId",
    "wordOrdinal",
    "bindingFingerprint",
]);
const projectionHandles = new WeakSet();
const attemptAudioBindingHandles = new WeakSet();
function fail() {
    throw new Error("learning_v2_activity_audio_runtime_projection_invalid");
}
function isRecord(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const keys = Object.keys(value);
    return (keys.length === expected.length &&
        keys.every((key) => expected.includes(key)));
}
function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
function preflightJson(root) {
    const stack = [
        { value: root, depth: 0 },
    ];
    let nodes = 0;
    let strings = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 40_000 || current.depth > 16)
            fail();
        if (typeof current.value === "string") {
            strings += current.value.length;
            if (strings > exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1 ||
                current.value !== current.value.normalize("NFC"))
                fail();
            continue;
        }
        if (typeof current.value === "number") {
            if (!Number.isFinite(current.value) ||
                Object.is(current.value, -0) ||
                (Number.isInteger(current.value) &&
                    !Number.isSafeInteger(current.value)))
                fail();
            continue;
        }
        if (current.value === null || typeof current.value !== "object")
            continue;
        if (Array.isArray(current.value)) {
            if (current.value.length >
                exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_ENTRY_MAX_COUNT_V1)
                fail();
            for (let index = current.value.length - 1; index >= 0; index -= 1)
                stack.push({ value: current.value[index], depth: current.depth + 1 });
            continue;
        }
        if (!isRecord(current.value))
            fail();
        const keys = Object.keys(current.value);
        if (keys.length > 24 ||
            keys.some((key) => RESERVED_KEYS.has(key) ||
                key !== key.normalize("NFC") ||
                key.length > 100))
            fail();
        for (let index = keys.length - 1; index >= 0; index -= 1)
            stack.push({
                value: current.value[keys[index]],
                depth: current.depth + 1,
            });
    }
}
function entryBody(value) {
    const { entryFingerprint: _ignored, ...body } = value;
    return body;
}
function exactEntry(value) {
    if (!isRecord(value) || !exactKeys(value, ENTRY_KEYS))
        fail();
    const result = value;
    const wordShapeValid = result.inputKind === "full_utterance"
        ? result.wordId === null && result.wordOrdinal === null
        : result.inputKind === "word" &&
            typeof result.wordId === "string" &&
            HASH_RE.test(result.wordId) &&
            Number.isSafeInteger(result.wordOrdinal) &&
            Number(result.wordOrdinal) >= 1 &&
            Number(result.wordOrdinal) <= 12;
    if (!HASH_RE.test(result.generationTargetFingerprint) ||
        !HASH_RE.test(result.itemFingerprint) ||
        !ID_RE.test(result.taskId) ||
        !HASH_RE.test(result.taskVoiceGroupFingerprint) ||
        !HASH_RE.test(result.audioTargetId) ||
        !wordShapeValid ||
        !voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.includes(result.voiceId) ||
        typeof result.objectPath !== "string" ||
        !AUDIO_PATH_RE.test(result.objectPath) ||
        !HASH_RE.test(result.contentHash) ||
        !result.objectPath.endsWith(`/${result.contentHash}.mp3`) ||
        !GENERATION_RE.test(result.objectGeneration) ||
        !Number.isSafeInteger(result.byteSize) ||
        result.byteSize < 1 ||
        result.byteSize > 64 * 1024 ||
        result.contentType !== "audio/mpeg" ||
        !HASH_RE.test(result.codecRulesFingerprint) ||
        !HASH_RE.test(result.codecResultFingerprint) ||
        result.entryFingerprint !== (0, decision_registry_1.hashCanonicalBody)(entryBody(result)))
        fail();
    return deepFreeze({ ...result });
}
function coordinate(entry) {
    return (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-activity-audio-runtime-coordinate.v1",
        taskId: entry.taskId,
        taskVoiceGroupFingerprint: entry.taskVoiceGroupFingerprint,
        audioTargetId: entry.audioTargetId,
        inputKind: entry.inputKind,
        wordId: entry.wordId,
        wordOrdinal: entry.wordOrdinal,
    });
}
function selectableBindingBody(value) {
    const { bindingFingerprint: _ignored, ...body } = value;
    return body;
}
function exactSelectableBinding(value) {
    if (!isRecord(value) || !exactKeys(value, SELECTABLE_BINDING_KEYS))
        fail();
    const result = value;
    if (!ID_RE.test(result.taskId) ||
        !HASH_RE.test(result.taskVoiceGroupFingerprint) ||
        !ID_RE.test(result.selectableId) ||
        RESERVED_KEYS.has(result.selectableId) ||
        !HASH_RE.test(result.audioTargetId) ||
        !HASH_RE.test(result.wordId) ||
        !Number.isSafeInteger(result.wordOrdinal) ||
        result.wordOrdinal < 1 ||
        result.wordOrdinal > 12 ||
        result.bindingFingerprint !==
            (0, decision_registry_1.hashCanonicalBody)(selectableBindingBody(result)))
        fail();
    return deepFreeze({ ...result });
}
function validateCoverage(entries) {
    const fingerprints = new Set();
    const generationTargets = new Set();
    const voicesByCoordinate = new Map();
    const targetGroups = new Map();
    for (const entry of entries) {
        if (fingerprints.has(entry.entryFingerprint) ||
            generationTargets.has(entry.generationTargetFingerprint))
            fail();
        fingerprints.add(entry.entryFingerprint);
        generationTargets.add(entry.generationTargetFingerprint);
        const key = coordinate(entry);
        const voices = voicesByCoordinate.get(key) ?? new Set();
        if (voices.has(entry.voiceId))
            fail();
        voices.add(entry.voiceId);
        voicesByCoordinate.set(key, voices);
        const current = targetGroups.get(entry.audioTargetId);
        if (current &&
            (current.taskId !== entry.taskId ||
                current.taskVoiceGroupFingerprint !== entry.taskVoiceGroupFingerprint))
            fail();
        const group = current ??
            Object.freeze({
                taskId: entry.taskId,
                taskVoiceGroupFingerprint: entry.taskVoiceGroupFingerprint,
                fullUtteranceCount: 0,
                wordCoordinates: new Map(),
            });
        if (entry.inputKind === "full_utterance") {
            targetGroups.set(entry.audioTargetId, Object.freeze({
                ...group,
                fullUtteranceCount: group.fullUtteranceCount + 1,
            }));
        }
        else {
            const ordinal = entry.wordOrdinal;
            const priorWordId = group.wordCoordinates.get(ordinal);
            if (priorWordId !== undefined && priorWordId !== entry.wordId)
                fail();
            group.wordCoordinates.set(ordinal, entry.wordId);
            targetGroups.set(entry.audioTargetId, group);
        }
    }
    if (voicesByCoordinate.size < 1 ||
        [...voicesByCoordinate.values()].some((voices) => voices.size !== voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.length ||
            voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.some((voice) => !voices.has(voice))))
        fail();
    for (const group of targetGroups.values()) {
        const ordinals = [...group.wordCoordinates.keys()].sort((left, right) => left - right);
        if (group.fullUtteranceCount !== voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.length ||
            ordinals.length < 1 ||
            ordinals.some((ordinal, index) => ordinal !== index + 1))
            fail();
    }
}
function bodyWithoutFingerprint(value) {
    const { projectionFingerprint: _ignored, ...body } = value;
    return body;
}
function materializeLearningV2ActivityAudioRuntimeProjectionV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            [
                "activityAudioCatalogFingerprint",
                "entries",
                "episodeId",
                "selectableBindings",
                "sessionId",
                "sessionOrdinal",
                "sourceSessionManifestFingerprint",
                "voiceAudioManifestFingerprint",
                "voiceTargetsPackageFingerprint",
            ]
                .sort()
                .join("|") ||
        !ID_RE.test(input.episodeId) ||
        !ID_RE.test(input.sessionId) ||
        !Number.isSafeInteger(input.sessionOrdinal) ||
        input.sessionOrdinal < 1 ||
        input.sessionOrdinal > 12 ||
        !HASH_RE.test(input.voiceAudioManifestFingerprint) ||
        !HASH_RE.test(input.sourceSessionManifestFingerprint) ||
        !HASH_RE.test(input.activityAudioCatalogFingerprint) ||
        !HASH_RE.test(input.voiceTargetsPackageFingerprint) ||
        !Array.isArray(input.entries) ||
        input.entries.length < 4 ||
        input.entries.length >
            exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_ENTRY_MAX_COUNT_V1 ||
        !Array.isArray(input.selectableBindings) ||
        input.selectableBindings.length > 864)
        fail();
    const entries = Object.freeze(input.entries.map(exactEntry));
    validateCoverage(entries);
    const selectableBindings = Object.freeze(input.selectableBindings.map(exactSelectableBinding));
    const bindingFingerprints = new Set();
    const selectableCoordinates = new Set();
    for (const binding of selectableBindings) {
        const coordinateKey = (0, decision_registry_1.hashCanonicalBody)({
            taskId: binding.taskId,
            selectableId: binding.selectableId,
        });
        if (bindingFingerprints.has(binding.bindingFingerprint) ||
            selectableCoordinates.has(coordinateKey) ||
            !entries.some((entry) => entry.taskId === binding.taskId &&
                entry.taskVoiceGroupFingerprint ===
                    binding.taskVoiceGroupFingerprint &&
                entry.audioTargetId === binding.audioTargetId &&
                entry.inputKind === "word" &&
                entry.wordId === binding.wordId &&
                entry.wordOrdinal === binding.wordOrdinal))
            fail();
        bindingFingerprints.add(binding.bindingFingerprint);
        selectableCoordinates.add(coordinateKey);
    }
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_SCHEMA_V1,
        episodeId: input.episodeId,
        sessionId: input.sessionId,
        sessionOrdinal: input.sessionOrdinal,
        voiceAudioManifestFingerprint: input.voiceAudioManifestFingerprint,
        sourceSessionManifestFingerprint: input.sourceSessionManifestFingerprint,
        activityAudioCatalogFingerprint: input.activityAudioCatalogFingerprint,
        voiceTargetsPackageFingerprint: input.voiceTargetsPackageFingerprint,
        entryCount: entries.length,
        entries,
        selectableBindingCount: selectableBindings.length,
        selectableBindings,
        orderedEntryAggregateFingerprint: (0, decision_registry_1.hashCanonicalBody)(entries.map((entry) => entry.entryFingerprint)),
        voiceCoverage: "exact_ash_onyx_nova_coral_per_audio_coordinate",
        taskVoiceSelectionScope: "once_per_task_attempt",
        storagePinAuthority: "unverified_serialized_manifest_projection",
        runtimeAuthority: "none_release_binding_required",
        walletAuthority: "none",
        masteryAuthority: "none",
        evidenceAuthority: "none",
        publicationAuthority: "none",
        releaseEligible: false,
        releaseAuthority: false,
    };
    const result = deepFreeze({
        ...body,
        projectionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(result)) >
        exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1)
        fail();
    projectionHandles.add(result);
    return result;
}
function encodeLearningV2ActivityAudioRuntimeProjectionV1(projection) {
    if (!isLearningV2ActivityAudioRuntimeProjectionV1(projection))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(projection);
}
function parseLearningV2ActivityAudioRuntimeProjectionV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_AUDIO_RUNTIME_PROJECTION_MAX_BYTES_V1)
        fail();
    let value;
    try {
        value = JSON.parse(raw);
    }
    catch {
        fail();
    }
    preflightJson(value);
    if (!isRecord(value) ||
        !exactKeys(value, PROJECTION_KEYS) ||
        (0, decision_registry_1.canonicalJsonV1)(value) !== raw)
        fail();
    const candidate = value;
    const rebuilt = materializeLearningV2ActivityAudioRuntimeProjectionV1({
        episodeId: candidate.episodeId,
        sessionId: candidate.sessionId,
        sessionOrdinal: candidate.sessionOrdinal,
        voiceAudioManifestFingerprint: candidate.voiceAudioManifestFingerprint,
        sourceSessionManifestFingerprint: candidate.sourceSessionManifestFingerprint,
        activityAudioCatalogFingerprint: candidate.activityAudioCatalogFingerprint,
        voiceTargetsPackageFingerprint: candidate.voiceTargetsPackageFingerprint,
        entries: candidate.entries,
        selectableBindings: candidate.selectableBindings,
    });
    if ((0, decision_registry_1.canonicalJsonV1)(rebuilt) !== raw ||
        candidate.projectionFingerprint !==
            (0, decision_registry_1.hashCanonicalBody)(bodyWithoutFingerprint(candidate)))
        fail();
    return rebuilt;
}
function isLearningV2ActivityAudioRuntimeProjectionV1(value) {
    return (typeof value === "object" && value !== null && projectionHandles.has(value));
}
function selectLearningV2ActivityTaskAudioV1(input) {
    if (!isLearningV2ActivityAudioRuntimeProjectionV1(input.projection) ||
        !ID_RE.test(input.taskId) ||
        !voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.includes(input.voiceId))
        fail();
    const entries = input.projection.entries.filter((entry) => entry.taskId === input.taskId && entry.voiceId === input.voiceId);
    if (entries.length < 1)
        fail();
    const groupFingerprints = new Set(entries.map((entry) => entry.taskVoiceGroupFingerprint));
    if (groupFingerprints.size !== 1)
        fail();
    return Object.freeze(entries);
}
function getLearningV2ActivitySelectableAudioBindingsV1(projection, taskId) {
    if (!isLearningV2ActivityAudioRuntimeProjectionV1(projection) ||
        !ID_RE.test(taskId))
        fail();
    const bindings = projection.selectableBindings.filter((binding) => binding.taskId === taskId);
    if (bindings.length < 1)
        fail();
    return Object.freeze(bindings);
}
function bindLearningV2ActivityAttemptAudioV1(input) {
    if (!input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.getPrototypeOf(input) !== Object.prototype ||
        Object.keys(input).sort().join("|") !==
            "fullPhraseAudioTargetId|projection|taskId|voiceSelectionIndex" ||
        !isLearningV2ActivityAudioRuntimeProjectionV1(input.projection) ||
        !ID_RE.test(input.taskId) ||
        !Number.isSafeInteger(input.voiceSelectionIndex) ||
        input.voiceSelectionIndex < 0 ||
        input.voiceSelectionIndex > 3 ||
        (input.fullPhraseAudioTargetId !== null &&
            !HASH_RE.test(input.fullPhraseAudioTargetId)))
        fail();
    const voiceId = voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS[input.voiceSelectionIndex];
    const taskEntries = selectLearningV2ActivityTaskAudioV1({
        projection: input.projection,
        taskId: input.taskId,
        voiceId,
    });
    const bindings = getLearningV2ActivitySelectableAudioBindingsV1(input.projection, input.taskId);
    const selectableAudioTargets = {};
    for (const binding of bindings) {
        if (!taskEntries.some((entry) => entry.inputKind === "word" &&
            entry.audioTargetId === binding.audioTargetId &&
            entry.wordId === binding.wordId &&
            entry.voiceId === voiceId))
            fail();
        selectableAudioTargets[binding.selectableId] = Object.freeze({
            audioTargetId: binding.audioTargetId,
            wordId: binding.wordId,
        });
    }
    if (input.fullPhraseAudioTargetId !== null &&
        !taskEntries.some((entry) => entry.inputKind === "full_utterance" &&
            entry.audioTargetId === input.fullPhraseAudioTargetId &&
            entry.voiceId === voiceId))
        fail();
    const body = {
        schemaVersion: "learning-v2-activity-attempt-audio-binding.v1",
        taskId: input.taskId,
        voiceId,
        voiceSelectionIndex: input.voiceSelectionIndex,
        fullPhraseAudioTargetId: input.fullPhraseAudioTargetId,
        selectableAudioTargets: deepFreeze(selectableAudioTargets),
        sourceProjectionFingerprint: input.projection.projectionFingerprint,
        runtimeAuthority: "none_release_binding_required",
    };
    const result = deepFreeze({
        ...body,
        bindingFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    attemptAudioBindingHandles.add(result);
    return result;
}
function isLearningV2ActivityAttemptAudioBindingV1(value) {
    return (typeof value === "object" &&
        value !== null &&
        attemptAudioBindingHandles.has(value));
}
//# sourceMappingURL=activity_audio_runtime_projection_v1.js.map