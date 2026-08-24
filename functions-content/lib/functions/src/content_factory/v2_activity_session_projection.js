"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isV2ActivitySessionProjectionArtifacts = exports.assembleV2ActivityEpisodeProjectionV1 = exports.buildV2ActivitySessionProjection = exports.parseV2ActivitySessionProjectionSource = exports.v2ActivitySemanticSurfaceFingerprintV2 = exports.V2_SCRIPTED_ALTERNATE_REQUIRED_FAMILIES_V2 = exports.V2_ACTIVITY_FAMILIES = exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES = exports.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES = exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES = exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES = exports.V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1 = exports.V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 = exports.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1 = exports.V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2 = exports.V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2 = void 0;
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const activity_session_package_v2_1 = require("../../../modules/learning-v2/contracts/activity_session_package_v2");
const activity_catalog_v2_1 = require("../../../modules/learning-v2/contracts/activity_catalog_v2");
const local_evaluator_capsule_v1_1 = require("../../../modules/learning-v2/runtime/local_evaluator_capsule_v1");
exports.V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2 = "v2-activity-session-source-shard.v2";
exports.V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2 = "v2-activity-session-render-seed.v2";
exports.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1 = "v2-activity-session-capsule-envelope.v1";
exports.V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 = "v2-activity-session-server-sidecar.v2";
exports.V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1 = "v2-activity-episode-projection-assembly.v1";
exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES = 512 * 1024;
exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES = 256 * 1024;
exports.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES = 64 * 1024;
exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES = 128 * 1024;
exports.V2_ACTIVITY_FAMILIES = activity_catalog_v2_1.V2_REQUIRED_SESSION_FAMILIES_V2;
exports.V2_SCRIPTED_ALTERNATE_REQUIRED_FAMILIES_V2 = Object.freeze([
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "scripted_repeat_compare",
]);
const CLASSIFICATIONS = Object.freeze({
    phrase_builder: Object.freeze({
        inputMode: "ordered_tokens",
        runtimeCapabilityId: "v2.activity.phrase_builder.v1",
    }),
    listen_choose: Object.freeze({
        inputMode: "single_choice",
        runtimeCapabilityId: "v2.activity.listen_choose.v1",
    }),
    sound_contrast: Object.freeze({
        inputMode: "single_choice",
        runtimeCapabilityId: "v2.activity.sound_contrast.v1",
    }),
    listen_build_dictation: Object.freeze({
        inputMode: "ordered_tokens",
        runtimeCapabilityId: "v2.activity.listen_build_dictation.v1",
    }),
    context_gap_grammar: Object.freeze({
        inputMode: "single_choice",
        runtimeCapabilityId: "v2.activity.context_gap_grammar.v1",
    }),
    speed_match: Object.freeze({
        inputMode: "single_choice",
        runtimeCapabilityId: "v2.activity.speed_match.v1",
    }),
    scripted_repeat_compare: Object.freeze({
        inputMode: "scripted_speech",
        runtimeCapabilityId: "v2.activity.scripted_repeat_compare.v1",
    }),
});
const SOURCE_KEYS = [
    "episodeId",
    "normalizationLocale",
    "normalizationProfileHash",
    "schemaVersion",
    "session",
    "targetLanguage",
];
const SESSION_KEYS = ["ordinal", "sessionId", "targetSeconds", "tasks", "zone"];
const TASK_KEYS = [
    "activityId",
    "answerExposure",
    "contentItemId",
    "evaluator",
    "family",
    "hintsAllowed",
    "inputMode",
    "introQuestionRef",
    "learner",
    "learningFunction",
    "localEvaluatorCapsuleId",
    "objectiveId",
    "promptNovelty",
    "purpose",
    "reviewSource",
    "scriptedAlternate",
    "slot",
    "support",
    "taskId",
];
const LEARNER_KEYS = [
    "accessibilityLabel",
    "audioTargetIds",
    "mediaIds",
    "prompt",
    "promptId",
    "responseOptions",
];
const RESPONSE_OPTION_KEYS = ["responseId", "text"];
const ALTERNATE_KEYS = [
    "alternateId",
    "canAward",
    "instruction",
    "voiceEvidenceEquivalent",
];
const INTRO_QUESTION_KEYS = [
    "coveredConceptIds",
    "introArtifactFingerprint",
    "questionId",
];
const REVIEW_SOURCE_KEYS = ["kind", "reviewOfTaskId", "sourceSessionOrdinal"];
const EVALUATOR_KEYS = [
    "acceptedResponses",
    "correctResponse",
    "inputKind",
    "normalizationRef",
    "salt",
];
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/;
const CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const trustedSources = new WeakSet();
const trustedArtifacts = new WeakSet();
const SCRIPTED_ALTERNATE_REQUIRED_FAMILY_SET = new Set(exports.V2_SCRIPTED_ALTERNATE_REQUIRED_FAMILIES_V2);
function fail(code) {
    throw new Error(code);
}
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
function exactKeys(value, keys, code) {
    if (!isRecord(value))
        fail(code);
    const actual = Object.keys(value).sort();
    const expected = Array.from(keys).sort();
    if (actual.length !== expected.length ||
        actual.some((key, index) => key !== expected[index]))
        fail(code);
}
const safeId = (value, code) => {
    if (typeof value !== "string" || !ID_PATTERN.test(value))
        fail(code);
    return value;
};
const safeText = (value, maxLength, code) => {
    if (typeof value !== "string" ||
        value.length < 1 ||
        value.length > maxLength ||
        value.trim() !== value ||
        value.normalize("NFC") !== value ||
        CONTROL_PATTERN.test(value))
        fail(code);
    return value;
};
const safeIdArray = (value, maximum, code) => {
    if (!Array.isArray(value) || value.length > maximum)
        fail(code);
    const values = value.map((item) => safeId(item, code));
    if (new Set(values).size !== values.length)
        fail(code);
    return values;
};
const safeResponseArray = (value) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > 32) {
        fail("v2_activity_session_accepted_responses_invalid");
    }
    const values = value.map((item) => safeText(item, 512, "v2_activity_session_accepted_responses_invalid"));
    if (new Set(values).size !== values.length) {
        fail("v2_activity_session_accepted_responses_invalid");
    }
    return values;
};
const isFamily = (value) => typeof value === "string" &&
    exports.V2_ACTIVITY_FAMILIES.includes(value);
const deepFreeze = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) {
            deepFreeze(child);
        }
        Object.freeze(value);
    }
    return value;
};
const expectedZone = (ordinal) => ordinal <= 4 ? "understand" : ordinal <= 8 ? "use" : "master";
const normalizeVisibleText = (value, locale) => (0, local_evaluator_capsule_v1_1.normalizeV2LocalEvaluatorResponseV1)("text", value, locale) ?? "";
const acceptedSemanticValues = (task, locale) => {
    if (task.evaluator.inputKind === "choice_token") {
        const optionTextById = new Map(task.learner.responseOptions.map((option) => [
            (0, local_evaluator_capsule_v1_1.normalizeV2LocalEvaluatorResponseV1)("choice_token", option.responseId, locale),
            normalizeVisibleText(option.text, locale),
        ]));
        return task.evaluator.acceptedResponses
            .map((response) => optionTextById.get((0, local_evaluator_capsule_v1_1.normalizeV2LocalEvaluatorResponseV1)("choice_token", response, locale)))
            .filter((value) => typeof value === "string")
            .sort();
    }
    return task.evaluator.acceptedResponses
        .map((response) => (0, local_evaluator_capsule_v1_1.normalizeV2LocalEvaluatorResponseV1)(task.evaluator.inputKind, response, locale))
        .filter((value) => typeof value === "string")
        .sort();
};
const v2ActivitySemanticSurfaceFingerprintV2 = (task, normalizationLocale) => (0, decision_registry_1.hashCanonicalBody)({
    prompt: normalizeVisibleText(task.learner.prompt, normalizationLocale),
    acceptedSemanticValues: acceptedSemanticValues(task, normalizationLocale),
});
exports.v2ActivitySemanticSurfaceFingerprintV2 = v2ActivitySemanticSurfaceFingerprintV2;
const visibleFieldContainsAnswer = (visible, answer) => visible === answer || ` ${visible} `.includes(` ${answer} `);
function validateSource(candidate) {
    exactKeys(candidate, SOURCE_KEYS, "v2_activity_session_source_fields_invalid");
    if (candidate.schemaVersion !== exports.V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2) {
        fail("v2_activity_session_source_schema_invalid");
    }
    safeId(candidate.episodeId, "v2_activity_session_episode_id_invalid");
    if (typeof candidate.targetLanguage !== "string" ||
        candidate.targetLanguage.length > 255 ||
        !LANGUAGE_PATTERN.test(candidate.targetLanguage) ||
        candidate.normalizationLocale !== candidate.targetLanguage ||
        candidate.normalizationProfileHash !==
            local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1)
        fail("v2_activity_session_normalization_profile_invalid");
    const rawSession = candidate.session;
    exactKeys(rawSession, SESSION_KEYS, "v2_activity_session_session_fields_invalid");
    safeId(rawSession.sessionId, "v2_activity_session_session_id_invalid");
    if (typeof rawSession.ordinal !== "number" ||
        !Number.isSafeInteger(rawSession.ordinal) ||
        rawSession.ordinal < 1 ||
        rawSession.ordinal > 12)
        fail("v2_activity_session_session_ordinal_invalid");
    const sessionOrdinal = Number(rawSession.ordinal);
    if (rawSession.zone !== expectedZone(rawSession.ordinal)) {
        fail("v2_activity_session_zone_invalid");
    }
    if (rawSession.sessionId !==
        (0, activity_session_package_v2_1.v2ActivitySessionIdV2)(candidate.episodeId, rawSession.ordinal))
        fail("v2_activity_session_session_id_invalid");
    if (typeof rawSession.targetSeconds !== "number" ||
        !Number.isSafeInteger(rawSession.targetSeconds) ||
        rawSession.targetSeconds < 150 ||
        rawSession.targetSeconds > 360)
        fail("v2_activity_session_target_seconds_invalid");
    if (!Array.isArray(rawSession.tasks) || rawSession.tasks.length !== 12) {
        fail("v2_activity_session_task_count_invalid");
    }
    const objectIds = new Set();
    const responseIds = new Set();
    const alternateIds = new Set();
    const salts = new Set();
    const sessionFamilies = new Set();
    const introArtifactFingerprints = new Set();
    const introQuestionIds = new Set();
    const taughtObjectiveIds = new Set();
    const earlierTasksById = new Map();
    rawSession.tasks.forEach((rawTask, taskIndex) => {
        exactKeys(rawTask, TASK_KEYS, "v2_activity_session_task_fields_invalid");
        const slot = taskIndex + 1;
        if (rawTask.slot !== slot)
            fail("v2_activity_session_task_slot_invalid");
        const slotPolicy = activity_session_package_v2_1.V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2[taskIndex];
        if (!slotPolicy || rawTask.purpose !== slotPolicy.purpose) {
            fail("v2_activity_session_purpose_invalid");
        }
        if (!isFamily(rawTask.family))
            fail("v2_activity_session_family_invalid");
        sessionFamilies.add(rawTask.family);
        const classification = CLASSIFICATIONS[rawTask.family];
        if (rawTask.inputMode !== classification.inputMode) {
            fail("v2_activity_session_classification_invalid");
        }
        safeId(rawTask.contentItemId, "v2_activity_session_contentItemId_invalid");
        const objectiveId = safeId(rawTask.objectiveId, "v2_activity_session_objectiveId_invalid");
        let taskId = "";
        for (const key of [
            "taskId",
            "activityId",
            "localEvaluatorCapsuleId",
        ]) {
            const identity = safeId(rawTask[key], `v2_activity_session_${key}_invalid`);
            if (objectIds.has(identity))
                fail(`v2_activity_session_${key}_invalid`);
            objectIds.add(identity);
            if (key === "taskId")
                taskId = identity;
        }
        safeText(rawTask.learningFunction, 240, "v2_activity_session_learning_function_invalid");
        if (rawTask.answerExposure !== "allowed_after_attempt" &&
            rawTask.answerExposure !== "forbidden")
            fail("v2_activity_session_answer_exposure_invalid");
        if (!["trained", "varied", "novel"].includes(String(rawTask.promptNovelty))) {
            fail("v2_activity_session_prompt_novelty_invalid");
        }
        if (!["model", "full_text", "partial_cue", "visual_only", "none"].includes(String(rawTask.support)))
            fail("v2_activity_session_support_invalid");
        if (![0, 1, 2].includes(rawTask.hintsAllowed) ||
            Number(rawTask.hintsAllowed) > slotPolicy.maxHints) {
            fail("v2_activity_session_help_policy_invalid");
        }
        if (slotPolicy.independent &&
            (rawTask.support !== slotPolicy.requiredSupport ||
                rawTask.answerExposure !== slotPolicy.requiredAnswerExposure ||
                (!slotPolicy.trainedPromptAllowed &&
                    rawTask.promptNovelty === "trained")))
            fail("v2_activity_session_independent_check_invalid");
        if (slotPolicy.independent && rawTask.family === "scripted_repeat_compare")
            fail("v2_activity_session_independent_scripted_repeat_invalid");
        if (slot <= 3) {
            exactKeys(rawTask.introQuestionRef, INTRO_QUESTION_KEYS, "v2_activity_session_intro_question_ref_invalid");
            if (typeof rawTask.introQuestionRef.introArtifactFingerprint !== "string" ||
                !HASH_PATTERN.test(rawTask.introQuestionRef.introArtifactFingerprint))
                fail("v2_activity_session_intro_question_ref_invalid");
            introArtifactFingerprints.add(rawTask.introQuestionRef.introArtifactFingerprint);
            const questionId = safeId(rawTask.introQuestionRef.questionId, "v2_activity_session_intro_question_ref_invalid");
            if (introQuestionIds.has(questionId))
                fail("v2_activity_session_intro_question_ref_invalid");
            introQuestionIds.add(questionId);
            const coveredConceptIds = safeIdArray(rawTask.introQuestionRef.coveredConceptIds, 16, "v2_activity_session_intro_question_ref_invalid");
            if (coveredConceptIds.length < 1)
                fail("v2_activity_session_intro_question_ref_invalid");
        }
        else if (rawTask.introQuestionRef !== null) {
            fail("v2_activity_session_intro_question_ref_invalid");
        }
        if (slot === 11) {
            exactKeys(rawTask.reviewSource, REVIEW_SOURCE_KEYS, "v2_activity_session_review_source_invalid");
            const reviewOfTaskId = safeId(rawTask.reviewSource.reviewOfTaskId, "v2_activity_session_review_source_invalid");
            if (!Number.isSafeInteger(rawTask.reviewSource.sourceSessionOrdinal) ||
                Number(rawTask.reviewSource.sourceSessionOrdinal) < 1 ||
                Number(rawTask.reviewSource.sourceSessionOrdinal) > 12)
                fail("v2_activity_session_review_source_invalid");
            if (rawSession.ordinal === 1) {
                if (rawTask.reviewSource.kind !== "same_session_bootstrap" ||
                    rawTask.reviewSource.sourceSessionOrdinal !== 1)
                    fail("v2_activity_session_review_source_invalid");
                const reviewed = earlierTasksById.get(reviewOfTaskId);
                if (!reviewed || reviewed.objectiveId !== rawTask.objectiveId)
                    fail("v2_activity_session_review_source_invalid");
            }
            else if (rawTask.reviewSource.kind !== "prior_session" ||
                Number(rawTask.reviewSource.sourceSessionOrdinal) >= sessionOrdinal) {
                fail("v2_activity_session_review_source_invalid");
            }
        }
        else if (rawTask.reviewSource !== null) {
            fail("v2_activity_session_review_source_invalid");
        }
        exactKeys(rawTask.learner, LEARNER_KEYS, "v2_activity_session_learner_fields_invalid");
        const promptId = safeId(rawTask.learner.promptId, "v2_activity_session_prompt_id_invalid");
        if (objectIds.has(promptId))
            fail("v2_activity_session_prompt_id_invalid");
        objectIds.add(promptId);
        safeText(rawTask.learner.prompt, 1000, "v2_activity_session_prompt_invalid");
        safeText(rawTask.learner.accessibilityLabel, 300, "v2_activity_session_accessibility_label_invalid");
        safeIdArray(rawTask.learner.mediaIds, 4, "v2_activity_session_media_ids_invalid");
        safeIdArray(rawTask.learner.audioTargetIds, 4, "v2_activity_session_audio_target_ids_invalid");
        if (!Array.isArray(rawTask.learner.responseOptions) ||
            rawTask.learner.responseOptions.length < 2 ||
            rawTask.learner.responseOptions.length > 6)
            fail("v2_activity_session_response_options_invalid");
        const localResponseIds = new Set();
        const normalizedChoiceIds = new Set();
        rawTask.learner.responseOptions.forEach((option) => {
            exactKeys(option, RESPONSE_OPTION_KEYS, "v2_activity_session_response_option_fields_invalid");
            const responseId = safeId(option.responseId, "v2_activity_session_response_id_invalid");
            if (localResponseIds.has(responseId) || responseIds.has(responseId)) {
                fail("v2_activity_session_response_id_invalid");
            }
            localResponseIds.add(responseId);
            responseIds.add(responseId);
            safeText(option.text, 500, "v2_activity_session_response_text_invalid");
            const normalized = (0, local_evaluator_capsule_v1_1.normalizeV2LocalEvaluatorResponseV1)("choice_token", responseId, candidate.normalizationLocale);
            if (normalized === null || normalizedChoiceIds.has(normalized)) {
                fail("v2_activity_session_normalized_choice_id_collision");
            }
            normalizedChoiceIds.add(normalized);
        });
        const alternateRequired = SCRIPTED_ALTERNATE_REQUIRED_FAMILY_SET.has(rawTask.family);
        if (alternateRequired !== (rawTask.scriptedAlternate !== null))
            fail("v2_activity_session_scripted_alternate_policy_invalid");
        if (rawTask.scriptedAlternate !== null) {
            exactKeys(rawTask.scriptedAlternate, ALTERNATE_KEYS, "v2_activity_session_scripted_alternate_fields_invalid");
            const alternateId = safeId(rawTask.scriptedAlternate.alternateId, "v2_activity_session_scripted_alternate_id_invalid");
            if (alternateIds.has(alternateId)) {
                fail("v2_activity_session_scripted_alternate_id_invalid");
            }
            alternateIds.add(alternateId);
            safeText(rawTask.scriptedAlternate.instruction, 500, "v2_activity_session_scripted_alternate_instruction_invalid");
            if (rawTask.scriptedAlternate.voiceEvidenceEquivalent !== false ||
                rawTask.scriptedAlternate.canAward !== false)
                fail("v2_activity_session_scripted_alternate_authority_invalid");
        }
        exactKeys(rawTask.evaluator, EVALUATOR_KEYS, "v2_activity_session_evaluator_fields_invalid");
        const inputKind = (0, local_evaluator_capsule_v1_1.v2LocalEvaluatorInputKindForFamilyV1)(rawTask.family);
        if (rawTask.evaluator.inputKind !== inputKind ||
            rawTask.evaluator.normalizationRef !== local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_V1)
            fail("v2_activity_session_classification_invalid");
        const correctResponse = safeText(rawTask.evaluator.correctResponse, 512, "v2_activity_session_correct_response_invalid");
        const acceptedResponses = safeResponseArray(rawTask.evaluator.acceptedResponses);
        if (!acceptedResponses.includes(correctResponse)) {
            fail("v2_activity_session_accepted_responses_invalid");
        }
        const normalizedResponses = acceptedResponses.map((response) => (0, local_evaluator_capsule_v1_1.normalizeV2LocalEvaluatorResponseV1)(inputKind, response, candidate.normalizationLocale));
        if (normalizedResponses.some((value) => value === null) ||
            new Set(normalizedResponses).size !== normalizedResponses.length)
            fail("v2_activity_session_normalized_responses_overlap");
        if (inputKind === "choice_token" &&
            normalizedResponses.some((value) => !normalizedChoiceIds.has(value)))
            fail("v2_activity_session_accepted_responses_invalid");
        if (typeof rawTask.evaluator.salt !== "string" ||
            !HASH_PATTERN.test(rawTask.evaluator.salt) ||
            salts.has(rawTask.evaluator.salt))
            fail("v2_activity_session_commitment_salt_invalid");
        salts.add(rawTask.evaluator.salt);
        if (slotPolicy.independent) {
            if (!taughtObjectiveIds.has(objectiveId))
                fail("v2_activity_session_independent_objective_invalid");
            if (inputKind !== "choice_token") {
                const normalizedVisible = [
                    rawTask.learner.prompt,
                    rawTask.learner.accessibilityLabel,
                    ...(rawTask.scriptedAlternate === null
                        ? []
                        : [
                            rawTask.scriptedAlternate.instruction,
                        ]),
                    ...rawTask.learner.responseOptions.map((option) => option.text),
                ].map((value) => normalizeVisibleText(value, candidate.normalizationLocale));
                for (const answer of normalizedResponses) {
                    if (normalizedVisible.some((visible) => visibleFieldContainsAnswer(visible, answer)))
                        fail("v2_activity_session_independent_answer_leak");
                }
                if (rawTask.inputMode === "ordered_tokens" &&
                    normalizedResponses.includes(normalizeVisibleText(rawTask.learner.responseOptions
                        .map((option) => option.text)
                        .join(" "), candidate.normalizationLocale)))
                    fail("v2_activity_session_independent_answer_leak");
            }
            const independentFingerprint = (0, exports.v2ActivitySemanticSurfaceFingerprintV2)(rawTask, candidate.normalizationLocale);
            if (Array.from(earlierTasksById.values()).some((earlier) => earlier.objectiveId === rawTask.objectiveId &&
                (0, exports.v2ActivitySemanticSurfaceFingerprintV2)(earlier, candidate.normalizationLocale) === independentFingerprint))
                fail("v2_activity_session_independent_surface_not_varied");
        }
        if (slot <= 9)
            taughtObjectiveIds.add(objectiveId);
        earlierTasksById.set(taskId, rawTask);
    });
    if (introArtifactFingerprints.size !== 1 || introQuestionIds.size !== 3)
        fail("v2_activity_session_intro_question_ref_invalid");
    if (sessionFamilies.size < 3 || sessionFamilies.size > 4) {
        fail("v2_activity_session_family_distribution_invalid");
    }
}
const parseV2ActivitySessionProjectionSource = (raw) => {
    if (typeof raw !== "string")
        fail("v2_activity_session_source_raw_invalid");
    if (raw.length > exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES)
        fail("v2_activity_session_source_too_large");
    let candidate;
    try {
        candidate = JSON.parse(raw);
    }
    catch {
        fail("v2_activity_session_source_json_invalid");
    }
    validateSource(candidate);
    if ((0, decision_registry_1.canonicalJsonV1)(candidate) !== raw) {
        fail("v2_activity_session_source_noncanonical");
    }
    deepFreeze(candidate);
    trustedSources.add(candidate);
    return candidate;
};
exports.parseV2ActivitySessionProjectionSource = parseV2ActivitySessionProjectionSource;
const copyLearner = (source) => Object.freeze({
    promptId: source.promptId,
    prompt: source.prompt,
    responseOptions: Object.freeze(source.responseOptions.map((option) => Object.freeze({ ...option }))),
    mediaIds: Object.freeze([...source.mediaIds]),
    audioTargetIds: Object.freeze([...source.audioTargetIds]),
    accessibilityLabel: source.accessibilityLabel,
});
const copyAlternate = (source) => source === null
    ? null
    : Object.freeze({
        alternateId: source.alternateId,
        instruction: source.instruction,
        voiceEvidenceEquivalent: false,
        canAward: false,
    });
function boundedCanonical(value, maximum, code) {
    if ((0, decision_registry_1.utf8ByteLengthV1)((0, decision_registry_1.canonicalJsonV1)(value)) > maximum)
        fail(code);
}
const buildV2ActivitySessionProjection = (source) => {
    if (!isRecord(source) || !trustedSources.has(source)) {
        fail("v2_activity_session_source_untrusted");
    }
    const sourceFingerprint = (0, decision_registry_1.hashCanonicalBody)(source);
    const renderTasks = [];
    const capsuleRaws = [];
    const sidecarTasks = [];
    for (const task of source.session.tasks) {
        const inputKind = (0, local_evaluator_capsule_v1_1.v2LocalEvaluatorInputKindForFamilyV1)(task.family);
        const commitmentInput = {
            capsuleId: task.localEvaluatorCapsuleId,
            taskId: task.taskId,
            activityId: task.activityId,
            family: task.family,
            inputKind,
            normalizationLocale: source.normalizationLocale,
            normalizationProfileHash: source.normalizationProfileHash,
            salt: task.evaluator.salt,
        };
        const acceptedCommitments = task.evaluator.acceptedResponses
            .map((response) => (0, local_evaluator_capsule_v1_1.createV2LocalEvaluatorCommitmentV1)({
            ...commitmentInput,
            response,
        }))
            .sort();
        if (new Set(acceptedCommitments).size !== acceptedCommitments.length) {
            fail("v2_activity_session_normalized_responses_overlap");
        }
        const capsuleRaw = (0, local_evaluator_capsule_v1_1.buildV2LocalEvaluatorCapsuleRawV1)({
            ...commitmentInput,
            acceptedCommitments,
        });
        capsuleRaws.push(capsuleRaw);
        renderTasks.push(Object.freeze({
            taskId: task.taskId,
            slot: task.slot,
            purpose: task.purpose,
            family: task.family,
            answerExposure: task.answerExposure,
            promptNovelty: task.promptNovelty,
            inputMode: task.inputMode,
            support: task.support,
            hintsAllowed: task.hintsAllowed,
            learner: copyLearner(task.learner),
            scriptedAlternate: copyAlternate(task.scriptedAlternate),
            runtimeCapabilityId: CLASSIFICATIONS[task.family].runtimeCapabilityId,
        }));
        sidecarTasks.push(Object.freeze({
            ...commitmentInput,
            normalizationRef: local_evaluator_capsule_v1_1.V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
            correctResponse: task.evaluator.correctResponse,
            acceptedResponses: Object.freeze([...task.evaluator.acceptedResponses]),
            acceptedCommitments: Object.freeze([...acceptedCommitments]),
        }));
    }
    const sidecarRecomputedCapsules = sidecarTasks.map((task) => (0, local_evaluator_capsule_v1_1.buildV2LocalEvaluatorCapsuleRawV1)({
        capsuleId: task.capsuleId,
        taskId: task.taskId,
        activityId: task.activityId,
        family: task.family,
        inputKind: task.inputKind,
        normalizationLocale: task.normalizationLocale,
        normalizationProfileHash: task.normalizationProfileHash,
        salt: task.salt,
        acceptedCommitments: task.acceptedCommitments,
    }));
    if ((0, decision_registry_1.canonicalJsonV1)(sidecarRecomputedCapsules) !== (0, decision_registry_1.canonicalJsonV1)(capsuleRaws)) {
        fail("v2_activity_session_capsule_sidecar_mismatch");
    }
    const commitmentAggregate = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "v2-activity-session-commitment-aggregate.v2",
        sourceFingerprint,
        sessionId: source.session.sessionId,
        capsules: capsuleRaws,
    });
    const renderSeed = deepFreeze({
        schemaVersion: exports.V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
        sourceFingerprint,
        episodeId: source.episodeId,
        targetLanguage: source.targetLanguage,
        session: {
            sessionId: source.session.sessionId,
            ordinal: source.session.ordinal,
            zone: source.session.zone,
            targetSeconds: source.session.targetSeconds,
            tasks: renderTasks,
        },
        executionAuthority: "none",
        rewardAuthority: "none",
        runtimeConsumer: false,
        releaseAuthority: false,
    });
    const appLocalCapsuleEnvelope = deepFreeze({
        schemaVersion: exports.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1,
        sourceFingerprint,
        episodeId: source.episodeId,
        sessionId: source.session.sessionId,
        sessionOrdinal: source.session.ordinal,
        normalizationLocale: source.normalizationLocale,
        normalizationProfileHash: source.normalizationProfileHash,
        capsules: capsuleRaws,
        commitmentAggregate,
        consumer: "app_internal_local_evaluator_only",
        verdictAuthority: "local_provisional_only",
    });
    const serverSidecar = deepFreeze({
        schemaVersion: exports.V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
        sourceFingerprint,
        episodeId: source.episodeId,
        sessionId: source.session.sessionId,
        sessionOrdinal: source.session.ordinal,
        tasks: sidecarTasks,
        commitmentAggregate,
        serverOnly: true,
        evaluationAuthority: "none",
        rewardAuthority: "none",
        releaseAuthority: false,
    });
    boundedCanonical(renderSeed, exports.V2_ACTIVITY_SESSION_RENDER_MAX_BYTES, "v2_activity_session_render_seed_too_large");
    boundedCanonical(appLocalCapsuleEnvelope, exports.V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES, "v2_activity_session_capsule_too_large");
    boundedCanonical(serverSidecar, exports.V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES, "v2_activity_session_sidecar_too_large");
    const artifacts = Object.freeze({
        renderSeed,
        appLocalCapsuleEnvelope,
        serverSidecar,
    });
    trustedArtifacts.add(artifacts);
    return artifacts;
};
exports.buildV2ActivitySessionProjection = buildV2ActivitySessionProjection;
const assembleV2ActivityEpisodeProjectionV1 = (sources) => {
    if (!Array.isArray(sources) || sources.length !== 12) {
        fail("v2_activity_episode_session_count_invalid");
    }
    const first = sources[0];
    if (!first || !trustedSources.has(first)) {
        fail("v2_activity_episode_source_untrusted");
    }
    const identities = new Set();
    const families = new Set();
    const tasksById = new Map();
    const surfaces = new Map();
    const artifacts = sources.map((source, index) => {
        if (!trustedSources.has(source) ||
            source.episodeId !== first.episodeId ||
            source.targetLanguage !== first.targetLanguage ||
            source.normalizationLocale !== first.normalizationLocale ||
            source.normalizationProfileHash !== first.normalizationProfileHash ||
            source.session.ordinal !== index + 1)
            fail("v2_activity_episode_source_identity_invalid");
        for (const task of source.session.tasks) {
            families.add(task.family);
            for (const identity of [
                task.taskId,
                task.activityId,
                task.localEvaluatorCapsuleId,
                task.learner.promptId,
                ...(task.scriptedAlternate === null
                    ? []
                    : [task.scriptedAlternate.alternateId]),
            ]) {
                if (identities.has(identity)) {
                    fail("v2_activity_episode_execution_identity_invalid");
                }
                identities.add(identity);
            }
            if (task.purpose === "interleaved_review") {
                if (task.reviewSource === null)
                    fail("v2_activity_episode_review_source_invalid");
                const reviewed = tasksById.get(task.reviewSource.reviewOfTaskId);
                if (!reviewed ||
                    reviewed.task.objectiveId !== task.objectiveId ||
                    reviewed.sessionOrdinal !== task.reviewSource.sourceSessionOrdinal)
                    fail("v2_activity_episode_review_source_invalid");
                if (source.session.ordinal === 1) {
                    if (task.reviewSource.kind !== "same_session_bootstrap" ||
                        reviewed.sessionOrdinal !== 1 ||
                        reviewed.task.slot >= task.slot)
                        fail("v2_activity_episode_review_source_invalid");
                }
                else if (task.reviewSource.kind !== "prior_session" ||
                    reviewed.sessionOrdinal >= source.session.ordinal) {
                    fail("v2_activity_episode_review_source_invalid");
                }
            }
            const surfaceFingerprint = (0, exports.v2ActivitySemanticSurfaceFingerprintV2)(task, source.normalizationLocale);
            const priorSurface = surfaces.get(surfaceFingerprint);
            if (priorSurface &&
                (task.purpose !== "interleaved_review" ||
                    task.reviewSource === null ||
                    task.reviewSource.reviewOfTaskId !== priorSurface.taskId ||
                    task.reviewSource.sourceSessionOrdinal !==
                        priorSurface.sessionOrdinal))
                fail("v2_activity_episode_duplicate_semantic_surface");
            if (!priorSurface) {
                surfaces.set(surfaceFingerprint, {
                    taskId: task.taskId,
                    sessionOrdinal: source.session.ordinal,
                });
            }
            tasksById.set(task.taskId, {
                task,
                sessionOrdinal: source.session.ordinal,
            });
        }
        return (0, exports.buildV2ActivitySessionProjection)(source);
    });
    if (families.size !== exports.V2_ACTIVITY_FAMILIES.length) {
        fail("v2_activity_episode_family_coverage_invalid");
    }
    const body = deepFreeze({
        schemaVersion: exports.V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1,
        episodeId: first.episodeId,
        targetLanguage: first.targetLanguage,
        normalizationLocale: first.normalizationLocale,
        normalizationProfileHash: first.normalizationProfileHash,
        sessionCount: 12,
        taskCount: 144,
        sessions: artifacts,
    });
    return deepFreeze({
        ...body,
        assemblyFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
};
exports.assembleV2ActivityEpisodeProjectionV1 = assembleV2ActivityEpisodeProjectionV1;
const isV2ActivitySessionProjectionArtifacts = (value) => typeof value === "object" && value !== null && trustedArtifacts.has(value);
exports.isV2ActivitySessionProjectionArtifacts = isV2ActivitySessionProjectionArtifacts;
//# sourceMappingURL=v2_activity_session_projection.js.map