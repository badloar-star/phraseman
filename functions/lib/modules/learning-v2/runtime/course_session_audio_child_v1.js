"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_COURSE_SESSION_AUDIO_FILE_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1 = void 0;
exports.materializeLearningV2CourseSessionAudioChildV1 = materializeLearningV2CourseSessionAudioChildV1;
exports.parseLearningV2CourseSessionAudioChildV1 = parseLearningV2CourseSessionAudioChildV1;
exports.encodeLearningV2CourseSessionAudioChildV1 = encodeLearningV2CourseSessionAudioChildV1;
exports.isLearningV2CourseSessionAudioChildV1 = isLearningV2CourseSessionAudioChildV1;
exports.selectLearningV2CourseSessionInteractionAudioV1 = selectLearningV2CourseSessionInteractionAudioV1;
exports.learningV2CourseSessionInteractionVoiceIndexV1 = learningV2CourseSessionInteractionVoiceIndexV1;
const voice_playback_policy_v1_1 = require("../contracts/voice_playback_policy_v1");
const decision_registry_1 = require("../policies/decision_registry");
const course_session_client_children_v1_1 = require("./course_session_client_children_v1");
exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1 = "learning-v2-course-session-audio-child.v1";
exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1 = 4 * 1024 * 1024;
exports.LEARNING_V2_COURSE_SESSION_AUDIO_FILE_MAX_BYTES_V1 = 64 * 1024;
const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const PATH_RE = /^learning-v2\/voice-audio\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\/[a-f0-9]{64}\.mp3$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const FILE_KEYS = Object.freeze([
    "voiceId",
    "objectPath",
    "contentHash",
    "objectGeneration",
    "byteSize",
    "contentType",
    "fileFingerprint",
]);
const SELECTABLE_KEYS = Object.freeze([
    "selectableId",
    "audioTargetId",
    "wordId",
    "wordOrdinal",
    "visibleTextHash",
    "files",
    "selectableFingerprint",
]);
const INTERACTION_KEYS = Object.freeze([
    "interactionId",
    "taskVoiceGroupFingerprint",
    "fullPhraseFiles",
    "selectables",
    "interactionAudioFingerprint",
]);
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "courseSessionId",
    "learnerFingerprint",
    "interactions",
    "interactionCount",
    "voiceIds",
    "variantsPerAudioCoordinate",
    "selectionPolicy",
    "taskVoiceScope",
    "serverRequestPerPlayback",
    "remoteTtsFallbackDuringSession",
    "answerPayload",
    "correctnessAuthority",
    "audioByteAuthority",
    "runtimeAuthority",
    "releaseAuthority",
    "audioFingerprint",
]);
const handles = new WeakSet();
function fail() {
    throw new Error("learning_v2_course_session_audio_child_invalid");
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
function freeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        for (const child of Object.values(value))
            freeze(child);
        Object.freeze(value);
    }
    return value;
}
function bodyWithoutFingerprint(value, field) {
    const body = { ...value };
    delete body[field];
    return body;
}
function exactFile(value) {
    if (!record(value))
        fail();
    exactKeys(value, FILE_KEYS);
    const file = value;
    if (!voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.includes(file.voiceId) ||
        !PATH_RE.test(file.objectPath) ||
        !HASH_RE.test(file.contentHash) ||
        !file.objectPath.endsWith(`/${file.contentHash}.mp3`) ||
        !GENERATION_RE.test(file.objectGeneration) ||
        !Number.isSafeInteger(file.byteSize) ||
        file.byteSize < 1 ||
        file.byteSize > exports.LEARNING_V2_COURSE_SESSION_AUDIO_FILE_MAX_BYTES_V1 ||
        file.contentType !== "audio/mpeg" ||
        file.fileFingerprint !==
            (0, decision_registry_1.hashCanonicalBody)(bodyWithoutFingerprint(value, "fileFingerprint")))
        fail();
    return freeze({ ...file });
}
function exactFourFiles(value) {
    if (!Array.isArray(value) || value.length !== voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.length)
        fail();
    const files = value.map(exactFile);
    if (files.some((file, index) => file.voiceId !== voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS[index]))
        fail();
    return freeze(files);
}
function exactSelectable(value) {
    if (!record(value))
        fail();
    exactKeys(value, SELECTABLE_KEYS);
    const selectable = value;
    const files = exactFourFiles(selectable.files);
    if (!ID_RE.test(selectable.selectableId) ||
        RESERVED.has(selectable.selectableId) ||
        !HASH_RE.test(selectable.audioTargetId) ||
        !HASH_RE.test(selectable.wordId) ||
        !Number.isSafeInteger(selectable.wordOrdinal) ||
        selectable.wordOrdinal < 1 ||
        selectable.wordOrdinal > 32 ||
        !HASH_RE.test(selectable.visibleTextHash))
        fail();
    const body = { ...selectable, files };
    if (selectable.selectableFingerprint !==
        (0, decision_registry_1.hashCanonicalBody)(bodyWithoutFingerprint(body, "selectableFingerprint")))
        fail();
    return freeze(body);
}
function exactInteraction(value) {
    if (!record(value))
        fail();
    exactKeys(value, INTERACTION_KEYS);
    const interaction = value;
    const fullPhraseFiles = interaction.fullPhraseFiles === null
        ? null
        : exactFourFiles(interaction.fullPhraseFiles);
    if (!ID_RE.test(interaction.interactionId) ||
        !HASH_RE.test(interaction.taskVoiceGroupFingerprint) ||
        !Array.isArray(interaction.selectables) ||
        interaction.selectables.length > 32)
        fail();
    const selectables = freeze(interaction.selectables.map(exactSelectable));
    const selectableIds = new Set(selectables.map((entry) => entry.selectableId));
    const wordOrdinals = new Set(selectables.map((entry) => entry.wordOrdinal));
    if (selectableIds.size !== selectables.length ||
        wordOrdinals.size !== selectables.length ||
        selectables.some((entry, index) => entry.wordOrdinal !== index + 1) ||
        (fullPhraseFiles === null && selectables.length === 0))
        fail();
    const body = { ...interaction, fullPhraseFiles, selectables };
    if (interaction.interactionAudioFingerprint !==
        (0, decision_registry_1.hashCanonicalBody)(bodyWithoutFingerprint(body, "interactionAudioFingerprint")))
        fail();
    return freeze(body);
}
function validate(value, learner) {
    if (!record(value))
        fail();
    exactKeys(value, ROOT_KEYS);
    const candidate = value;
    if (!(0, course_session_client_children_v1_1.isLearningV2CourseSessionLearnerChildV1)(learner) ||
        candidate.schemaVersion !==
            exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1 ||
        candidate.courseSessionId !== learner.courseSessionId ||
        candidate.learnerFingerprint !== learner.learnerFingerprint ||
        !Array.isArray(candidate.interactions))
        fail();
    const interactions = freeze(candidate.interactions.map(exactInteraction));
    const expected = learner.interactions.filter((entry) => entry.audioTargetIds.length > 0);
    if (interactions.length !== expected.length ||
        interactions.some((entry, index) => entry.interactionId !== expected[index]?.interactionId) ||
        interactions.some((entry, index) => {
            const learnerEntry = expected[index];
            if (!learnerEntry)
                return true;
            const allowed = new Set(learnerEntry.responseOptions.map((option) => option.responseId));
            return (entry.selectables.some((selectable) => !allowed.has(selectable.selectableId) ||
                selectable.visibleTextHash !==
                    (0, decision_registry_1.hashCanonicalBody)(learnerEntry.responseOptions.find((option) => option.responseId === selectable.selectableId)?.text ?? "")) ||
                entry.selectables.some((selectable) => !learnerEntry.audioTargetIds.includes(selectable.audioTargetId)));
        }) ||
        candidate.interactionCount !== interactions.length ||
        (0, decision_registry_1.canonicalJsonV1)(candidate.voiceIds) !==
            (0, decision_registry_1.canonicalJsonV1)(voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS) ||
        candidate.variantsPerAudioCoordinate !== 4 ||
        candidate.selectionPolicy !== "local_shuffled_round_robin" ||
        candidate.taskVoiceScope !==
            "one_voice_per_interaction_for_phrase_and_words" ||
        candidate.serverRequestPerPlayback !== false ||
        candidate.remoteTtsFallbackDuringSession !== false ||
        candidate.answerPayload !== "absent_by_exact_schema" ||
        candidate.correctnessAuthority !== "none" ||
        candidate.audioByteAuthority !== "none_active_release_readback_required" ||
        candidate.runtimeAuthority !== "none_active_release_join_required" ||
        candidate.releaseAuthority !== false)
        fail();
    const body = { ...candidate, interactions };
    if (candidate.audioFingerprint !==
        (0, decision_registry_1.hashCanonicalBody)(bodyWithoutFingerprint(body, "audioFingerprint")))
        fail();
    const result = freeze(body);
    handles.add(result);
    return result;
}
function withFileFingerprint(value) {
    return { ...value, fileFingerprint: (0, decision_registry_1.hashCanonicalBody)(value) };
}
function materializeLearningV2CourseSessionAudioChildV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !== "interactions|learner")
        fail();
    const interactions = input.interactions.map((entry) => {
        const selectables = entry.selectables.map((selectable) => {
            const body = {
                selectableId: selectable.selectableId,
                audioTargetId: selectable.audioTargetId,
                wordId: selectable.wordId,
                wordOrdinal: selectable.wordOrdinal,
                visibleTextHash: (0, decision_registry_1.hashCanonicalBody)(selectable.visibleText),
                files: selectable.files.map(withFileFingerprint),
            };
            return { ...body, selectableFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) };
        });
        const body = {
            interactionId: entry.interactionId,
            taskVoiceGroupFingerprint: entry.taskVoiceGroupFingerprint,
            fullPhraseFiles: entry.fullPhraseFiles?.map(withFileFingerprint) ?? null,
            selectables,
        };
        return { ...body, interactionAudioFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) };
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_SCHEMA_V1,
        courseSessionId: input.learner.courseSessionId,
        learnerFingerprint: input.learner.learnerFingerprint,
        interactions,
        interactionCount: interactions.length,
        voiceIds: voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS,
        variantsPerAudioCoordinate: 4,
        selectionPolicy: "local_shuffled_round_robin",
        taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words",
        serverRequestPerPlayback: false,
        remoteTtsFallbackDuringSession: false,
        answerPayload: "absent_by_exact_schema",
        correctnessAuthority: "none",
        audioByteAuthority: "none_active_release_readback_required",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
    };
    return validate({ ...body, audioFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }, input.learner);
}
function parseLearningV2CourseSessionAudioChildV1(raw, learner) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1)
        fail();
    let decoded;
    try {
        decoded = JSON.parse(raw);
    }
    catch {
        fail();
    }
    if ((0, decision_registry_1.canonicalJsonV1)(decoded) !== raw)
        fail();
    return validate(decoded, learner);
}
function encodeLearningV2CourseSessionAudioChildV1(child) {
    if (!handles.has(child))
        fail();
    const raw = (0, decision_registry_1.canonicalJsonV1)(child);
    if ((0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1)
        fail();
    return raw;
}
function isLearningV2CourseSessionAudioChildV1(value) {
    return typeof value === "object" && value !== null && handles.has(value);
}
function selectLearningV2CourseSessionInteractionAudioV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "child|interactionId|voiceSelectionIndex" ||
        !isLearningV2CourseSessionAudioChildV1(input.child) ||
        !ID_RE.test(input.interactionId) ||
        !Number.isSafeInteger(input.voiceSelectionIndex) ||
        input.voiceSelectionIndex < 0 ||
        input.voiceSelectionIndex > 3)
        fail();
    const interaction = input.child.interactions.find((entry) => entry.interactionId === input.interactionId);
    if (!interaction)
        fail();
    const selectableFiles = Object.fromEntries(interaction.selectables.map((entry) => [
        entry.selectableId,
        entry.files[input.voiceSelectionIndex],
    ]));
    return freeze({
        interactionId: interaction.interactionId,
        voiceId: voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS[input.voiceSelectionIndex],
        taskVoiceGroupFingerprint: interaction.taskVoiceGroupFingerprint,
        fullPhraseFile: interaction.fullPhraseFiles?.[input.voiceSelectionIndex] ?? null,
        selectableFiles,
    });
}
function learningV2CourseSessionInteractionVoiceIndexV1(input) {
    if (!record(input) ||
        Object.keys(input).sort().join("|") !==
            "courseSessionId|interactionOrdinal|sessionRunId" ||
        !ID_RE.test(input.sessionRunId) ||
        !ID_RE.test(input.courseSessionId) ||
        !Number.isSafeInteger(input.interactionOrdinal) ||
        input.interactionOrdinal < 1 ||
        input.interactionOrdinal > 22)
        fail();
    const cycleOffset = Number.parseInt((0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-course-session-voice-cycle.v1",
        sessionRunId: input.sessionRunId,
        courseSessionId: input.courseSessionId,
    }).slice(0, 8), 16) % voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.length;
    return ((cycleOffset + input.interactionOrdinal - 1) %
        voice_playback_policy_v1_1.V2_REQUIRED_VOICE_IDS.length);
}
//# sourceMappingURL=course_session_audio_child_v1.js.map