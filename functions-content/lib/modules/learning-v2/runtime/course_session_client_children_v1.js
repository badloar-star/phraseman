"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeLearningV2CourseSessionAuxiliaryChildV1 = exports.isLearningV2CourseSessionLearnerChildV1 = exports.encodeLearningV2CourseSessionLearnerChildV1 = exports.encodeLearningV2CourseSessionIntroChildV1 = exports.LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 = exports.LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1 = exports.LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1 = exports.LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1 = void 0;
exports.materializeLearningV2CourseSessionSavablePhraseV1 = materializeLearningV2CourseSessionSavablePhraseV1;
exports.parseLearningV2CourseSessionIntroChildV1 = parseLearningV2CourseSessionIntroChildV1;
exports.materializeLearningV2CourseSessionIntroChildV1 = materializeLearningV2CourseSessionIntroChildV1;
exports.parseLearningV2CourseSessionLearnerChildV1 = parseLearningV2CourseSessionLearnerChildV1;
exports.materializeLearningV2CourseSessionLearnerChildV1 = materializeLearningV2CourseSessionLearnerChildV1;
exports.parseLearningV2CourseSessionAuxiliaryChildV1 = parseLearningV2CourseSessionAuxiliaryChildV1;
exports.materializeLearningV2CourseSessionAuxiliaryChildV1 = materializeLearningV2CourseSessionAuxiliaryChildV1;
const generator_course_contract_1 = require("../content/generator_course_contract");
const intro_semantic_runs_v1_1 = require("../content/intro_semantic_runs_v1");
const decision_registry_1 = require("../policies/decision_registry");
exports.LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1 = "learning-v2-course-session-intro-child.v1";
exports.LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1 = "learning-v2-course-session-learner-child.v1";
exports.LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1 = "learning-v2-course-session-auxiliary-child.v1";
exports.LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 = 256 * 1024;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/u;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const introHandles = new WeakSet();
const learnerHandles = new WeakSet();
const auxiliaryHandles = new WeakSet();
function fail() {
    throw new Error("learning_v2_course_session_client_child_invalid");
}
function record(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected) {
    const keys = Object.keys(value).sort();
    const target = [...expected].sort();
    if (keys.length !== target.length ||
        keys.some((key, index) => key !== target[index] || RESERVED.has(key)))
        fail();
}
function text(value, maximum) {
    if (typeof value !== "string" ||
        value.length < 1 ||
        value.length > maximum ||
        value !== value.normalize("NFC") ||
        CONTROL_RE.test(value))
        fail();
    return value;
}
function id(value) {
    const result = text(value, 160);
    if (!ID_RE.test(result) || RESERVED.has(result))
        fail();
    return result;
}
function localized(value, maximum) {
    if (!record(value))
        fail();
    exactKeys(value, generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES);
    const result = {};
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES)
        result[locale] = text(value[locale], maximum);
    return Object.freeze(result);
}
function materializeLearningV2CourseSessionSavablePhraseV1(input) {
    if (!LANGUAGE_RE.test(input.targetLanguage))
        fail();
    const targetLanguage = input.targetLanguage;
    const targetText = text(input.targetText, 4_000);
    const meaningByLocale = localized(input.meaningByLocale, 4_000);
    const sourceTextFingerprint = (0, decision_registry_1.hashCanonicalBody)({ targetText });
    return Object.freeze({
        available: true,
        savablePhraseRef: (0, decision_registry_1.hashCanonicalBody)({
            targetLanguage,
            targetText,
            meaningByLocale,
            sourceTextFingerprint,
        }),
        targetLanguage,
        targetText,
        meaningByLocale,
        sourceTextFingerprint,
        contentOrigin: "learner_safe_release_projection",
    });
}
function localizedChoices(value) {
    if (!record(value))
        fail();
    exactKeys(value, generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES);
    const result = {};
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
        const choices = value[locale];
        if (!Array.isArray(choices) || choices.length < 2 || choices.length > 6)
            fail();
        const parsed = choices.map((choice) => text(choice, 512));
        if (new Set(parsed).size !== parsed.length)
            fail();
        result[locale] = Object.freeze(parsed);
    }
    return Object.freeze(result);
}
function localizedIntroRuns(value) {
    let validated;
    try {
        validated = (0, intro_semantic_runs_v1_1.validateLearningV2IntroRunsByLocaleV1)(value);
    }
    catch {
        fail();
    }
    const result = {};
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
        result[locale] = Object.freeze(validated[locale].map((run) => Object.freeze({
            text: text(run.text, 1_000),
            semantic: run.semantic,
        })));
    }
    return Object.freeze(result);
}
function preflight(value) {
    const stack = [{ value, depth: 0 }];
    let nodes = 0;
    while (stack.length) {
        const current = stack.pop();
        if (++nodes > 12_000 || current.depth > 20)
            fail();
        if (typeof current.value === "string") {
            if (current.value.length > 8_192 ||
                current.value !== current.value.normalize("NFC"))
                fail();
        }
        else if (typeof current.value === "number") {
            if (!Number.isSafeInteger(current.value) || Object.is(current.value, -0))
                fail();
        }
        else if (Array.isArray(current.value)) {
            if (current.value.length > 128)
                fail();
            current.value.forEach((child) => stack.push({ value: child, depth: current.depth + 1 }));
        }
        else if (record(current.value)) {
            const entries = Object.entries(current.value);
            if (entries.length > 64 || entries.some(([key]) => RESERVED.has(key)))
                fail();
            entries.forEach(([, child]) => stack.push({ value: child, depth: current.depth + 1 }));
        }
        else if (current.value !== null && typeof current.value !== "boolean")
            fail();
    }
}
function parseCanonical(raw) {
    if (typeof raw !== "string" ||
        raw.length < 2 ||
        raw.length > exports.LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) > exports.LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1)
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
const INTRO_ROOT_KEYS = [
    "schemaVersion",
    "courseSessionId",
    "learningOutcomeByLocale",
    "pages",
    "pageCount",
    "embeddedQuestionCount",
    "practiceStartOrdinal",
    "questionPolicy",
    "answerDataPolicy",
    "runtimeAuthority",
    "releaseAuthority",
    "introFingerprint",
];
const INTRO_PAGE_KEYS_LEGACY = [
    "pageOrdinal",
    "pageId",
    "kind",
    "titleByLocale",
    "bodyByLocale",
    "question",
];
const INTRO_PAGE_KEYS_WITH_RUNS = [
    "pageOrdinal",
    "pageId",
    "kind",
    "titleByLocale",
    "bodyByLocale",
    "bodyRunsByLocale",
    "question",
];
const INTRO_QUESTION_KEYS = [
    "interactionId",
    "promptByLocale",
    "choicesByLocale",
    "accessibilityLabelByLocale",
];
function parseLearningV2CourseSessionIntroChildV1(raw) {
    const value = parseCanonical(raw);
    exactKeys(value, INTRO_ROOT_KEYS);
    if (value.schemaVersion !== exports.LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1 ||
        !Array.isArray(value.pages) ||
        value.pages.length !== 3 ||
        value.pageCount !== 3 ||
        value.embeddedQuestionCount !== 3 ||
        value.practiceStartOrdinal !== 4)
        fail();
    const ids = new Set();
    const pages = value.pages.map((entry, index) => {
        if (!record(entry))
            fail();
        const hasBodyRuns = Object.prototype.hasOwnProperty.call(entry, "bodyRunsByLocale");
        exactKeys(entry, hasBodyRuns ? INTRO_PAGE_KEYS_WITH_RUNS : INTRO_PAGE_KEYS_LEGACY);
        if (entry.pageOrdinal !== index + 1 ||
            !["concept", "formula", "example", "trap", "tip"].includes(String(entry.kind)) ||
            !record(entry.question))
            fail();
        exactKeys(entry.question, INTRO_QUESTION_KEYS);
        const interactionId = id(entry.question.interactionId);
        if (ids.has(interactionId))
            fail();
        ids.add(interactionId);
        const bodyByLocale = localized(entry.bodyByLocale, 4_000);
        const bodyRunsByLocale = hasBodyRuns
            ? localizedIntroRuns(entry.bodyRunsByLocale)
            : undefined;
        if (bodyRunsByLocale &&
            generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.some((locale) => (0, intro_semantic_runs_v1_1.introRunsPlainTextV1)(bodyRunsByLocale[locale]) !==
                bodyByLocale[locale])) {
            fail();
        }
        return Object.freeze({
            pageOrdinal: (index + 1),
            pageId: id(entry.pageId),
            kind: entry.kind,
            titleByLocale: localized(entry.titleByLocale, 240),
            bodyByLocale,
            ...(bodyRunsByLocale ? { bodyRunsByLocale } : {}),
            question: Object.freeze({
                interactionId,
                promptByLocale: localized(entry.question.promptByLocale, 1_000),
                choicesByLocale: localizedChoices(entry.question.choicesByLocale),
                accessibilityLabelByLocale: localized(entry.question.accessibilityLabelByLocale, 512),
            }),
        });
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1,
        courseSessionId: id(value.courseSessionId),
        learningOutcomeByLocale: localized(value.learningOutcomeByLocale, 1_000),
        pages: Object.freeze(pages),
        pageCount: 3,
        embeddedQuestionCount: 3,
        practiceStartOrdinal: 4,
        questionPolicy: "one_question_at_bottom_of_each_intro_page_no_post_intro_duplicate",
        answerDataPolicy: "none_server_evaluator_child_only",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
    };
    if (value.questionPolicy !== body.questionPolicy ||
        value.answerDataPolicy !== body.answerDataPolicy ||
        value.runtimeAuthority !== body.runtimeAuthority ||
        value.releaseAuthority !== false ||
        value.introFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const result = Object.freeze({
        ...body,
        introFingerprint: value.introFingerprint,
    });
    introHandles.add(result);
    return result;
}
function materializeLearningV2CourseSessionIntroChildV1(input) {
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_INTRO_CHILD_SCHEMA_V1,
        ...input,
        pageCount: 3,
        embeddedQuestionCount: 3,
        practiceStartOrdinal: 4,
        questionPolicy: "one_question_at_bottom_of_each_intro_page_no_post_intro_duplicate",
        answerDataPolicy: "none_server_evaluator_child_only",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
    };
    return parseLearningV2CourseSessionIntroChildV1((0, decision_registry_1.canonicalJsonV1)({ ...body, introFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }));
}
const LEARNER_ROOT_KEYS = [
    "schemaVersion",
    "courseSessionId",
    "targetLanguage",
    "interactionProfile",
    "interactions",
    "practiceInteractionCount",
    "firstPracticeOrdinal",
    "evaluatorPayload",
    "acceptedAnswerPayload",
    "runtimeAuthority",
    "releaseAuthority",
    "learnerFingerprint",
];
const INTERACTION_KEYS = [
    "interactionId",
    "ordinal",
    "purpose",
    "family",
    "inputMode",
    "prompt",
    "responseOptions",
    "mediaIds",
    "audioTargetIds",
    "accessibilityLabel",
    "scriptedAlternate",
];
const OPTION_KEYS = ["responseId", "text"];
const ALTERNATE_KEYS = [
    "alternateId",
    "instruction",
    "voiceEvidenceEquivalent",
    "canAward",
];
function parseLearningV2CourseSessionLearnerChildV1(raw) {
    const value = parseCanonical(raw);
    exactKeys(value, LEARNER_ROOT_KEYS);
    if (!Array.isArray(value.interactions) ||
        value.interactions.length < 7 ||
        value.interactions.length > 19 ||
        !LANGUAGE_RE.test(String(value.targetLanguage)) ||
        !["standard", "rapid", "voice_heavy"].includes(String(value.interactionProfile)))
        fail();
    const ids = new Set();
    const interactions = Object.freeze(value.interactions.map((entry, index) => {
        if (!record(entry))
            fail();
        exactKeys(entry, INTERACTION_KEYS);
        const interactionId = id(entry.interactionId);
        if (ids.has(interactionId) ||
            entry.ordinal !== index + 4 ||
            ![
                "supported_practice",
                "guided_practice",
                "retrieval_practice",
                "near_transfer",
                "independent_check",
                "interleaved_review",
            ].includes(String(entry.purpose)) ||
            ![
                "phrase_builder",
                "listen_choose",
                "sound_contrast",
                "listen_build_dictation",
                "context_gap_grammar",
                "speed_match",
                "scripted_repeat_compare",
            ].includes(String(entry.family)) ||
            !["ordered_tokens", "single_choice", "scripted_speech"].includes(String(entry.inputMode)) ||
            !Array.isArray(entry.responseOptions) ||
            entry.responseOptions.length > 8 ||
            !Array.isArray(entry.mediaIds) ||
            entry.mediaIds.length > 8 ||
            !Array.isArray(entry.audioTargetIds) ||
            entry.audioTargetIds.length > 32)
            fail();
        ids.add(interactionId);
        const responseIds = new Set();
        const responseOptions = Object.freeze(entry.responseOptions.map((option) => {
            if (!record(option))
                fail();
            exactKeys(option, OPTION_KEYS);
            const responseId = id(option.responseId);
            if (responseIds.has(responseId))
                fail();
            responseIds.add(responseId);
            return Object.freeze({ responseId, text: text(option.text, 512) });
        }));
        let scriptedAlternate = null;
        if (entry.scriptedAlternate !== null) {
            if (!record(entry.scriptedAlternate))
                fail();
            exactKeys(entry.scriptedAlternate, ALTERNATE_KEYS);
            if (entry.scriptedAlternate.voiceEvidenceEquivalent !== false ||
                entry.scriptedAlternate.canAward !== false)
                fail();
            scriptedAlternate = Object.freeze({
                alternateId: id(entry.scriptedAlternate.alternateId),
                instruction: text(entry.scriptedAlternate.instruction, 1_000),
                voiceEvidenceEquivalent: false,
                canAward: false,
            });
        }
        return Object.freeze({
            interactionId,
            ordinal: index + 4,
            purpose: entry.purpose,
            family: entry.family,
            inputMode: entry.inputMode,
            prompt: text(entry.prompt, 2_000),
            responseOptions,
            mediaIds: Object.freeze(entry.mediaIds.map(id)),
            audioTargetIds: Object.freeze(entry.audioTargetIds.map(id)),
            accessibilityLabel: text(entry.accessibilityLabel, 1_000),
            scriptedAlternate,
        });
    }));
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1,
        courseSessionId: id(value.courseSessionId),
        targetLanguage: value.targetLanguage,
        interactionProfile: value.interactionProfile,
        interactions,
        practiceInteractionCount: interactions.length,
        firstPracticeOrdinal: 4,
        evaluatorPayload: "absent_by_exact_schema",
        acceptedAnswerPayload: "absent_by_exact_schema",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
    };
    if (value.schemaVersion !== body.schemaVersion ||
        value.practiceInteractionCount !== body.practiceInteractionCount ||
        value.firstPracticeOrdinal !== 4 ||
        value.evaluatorPayload !== body.evaluatorPayload ||
        value.acceptedAnswerPayload !== body.acceptedAnswerPayload ||
        value.runtimeAuthority !== body.runtimeAuthority ||
        value.releaseAuthority !== false ||
        value.learnerFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const result = Object.freeze({
        ...body,
        learnerFingerprint: value.learnerFingerprint,
    });
    learnerHandles.add(result);
    return result;
}
function materializeLearningV2CourseSessionLearnerChildV1(input) {
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_LEARNER_CHILD_SCHEMA_V1,
        ...input,
        practiceInteractionCount: input.interactions.length,
        firstPracticeOrdinal: 4,
        evaluatorPayload: "absent_by_exact_schema",
        acceptedAnswerPayload: "absent_by_exact_schema",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
    };
    return parseLearningV2CourseSessionLearnerChildV1((0, decision_registry_1.canonicalJsonV1)({ ...body, learnerFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }));
}
const AUX_ROOT_KEYS = [
    "schemaVersion",
    "courseSessionId",
    "entries",
    "entryCount",
    "actionCoverage",
    "firstWrongBehavior",
    "secondWrongBehavior",
    "explanationOrigin",
    "evaluatorPayload",
    "recordingArtifactPolicy",
    "runtimeAuthority",
    "releaseAuthority",
    "auxiliaryFingerprint",
];
const AUX_ENTRY_KEYS = [
    "interactionId",
    "report",
    "save",
    "voice",
    "secondErrorExplanationRef",
    "secondErrorExplanationByLocale",
];
const NEW_WORD_ENCOUNTER_KEYS = [
    "lexicalItemId",
    "transcription",
    "playfulMeaningByLocale",
    "motionVariant",
    "presentation",
    "dismissal",
    "saveControl",
    "orderWithinSession",
    "save",
];
function parseLearningV2CourseSessionAuxiliaryChildV1(raw) {
    const value = parseCanonical(raw);
    exactKeys(value, AUX_ROOT_KEYS);
    if (!Array.isArray(value.entries) ||
        value.entries.length < 10 ||
        value.entries.length > 22)
        fail();
    const ids = new Set();
    const entries = Object.freeze(value.entries.map((entry) => {
        if (!record(entry))
            fail();
        exactKeys(entry, [
            ...AUX_ENTRY_KEYS,
            ...(Object.prototype.hasOwnProperty.call(entry, "responseFeedbackById")
                ? ["responseFeedbackById"]
                : []),
            ...(Object.prototype.hasOwnProperty.call(entry, "newWordEncounter")
                ? ["newWordEncounter"]
                : []),
        ]);
        const interactionId = id(entry.interactionId);
        if (ids.has(interactionId) ||
            !record(entry.report) ||
            !record(entry.save) ||
            !record(entry.voice))
            fail();
        let responseFeedbackById;
        if ("responseFeedbackById" in entry) {
            if (!record(entry.responseFeedbackById))
                fail();
            const feedbackEntries = Object.entries(entry.responseFeedbackById);
            if (feedbackEntries.length > 8)
                fail();
            responseFeedbackById = Object.freeze(Object.fromEntries(feedbackEntries.map(([responseId, copy]) => [
                id(responseId),
                localized(copy, 2_000),
            ])));
        }
        ids.add(interactionId);
        exactKeys(entry.report, ["available", "reportContextRef", "screen"]);
        exactKeys(entry.save, [
            "available",
            "savablePhraseRef",
            "targetLanguage",
            "targetText",
            "meaningByLocale",
            "sourceTextFingerprint",
            "contentOrigin",
        ]);
        exactKeys(entry.voice, [
            "available",
            "tapToRecordAllowed",
            "holdToTalkAllowed",
        ]);
        if (entry.report.available !== true ||
            entry.report.screen !== "learning_v2_session" ||
            entry.save.available !== true ||
            entry.voice.available !== true ||
            entry.voice.tapToRecordAllowed !== true ||
            entry.voice.holdToTalkAllowed !== true)
            fail();
        const save = materializeLearningV2CourseSessionSavablePhraseV1({
            targetLanguage: entry.save.targetLanguage,
            targetText: entry.save.targetText,
            meaningByLocale: entry.save.meaningByLocale,
        });
        if (entry.save.savablePhraseRef !== save.savablePhraseRef ||
            entry.save.sourceTextFingerprint !== save.sourceTextFingerprint ||
            entry.save.contentOrigin !== save.contentOrigin)
            fail();
        let newWordEncounter;
        if (Object.prototype.hasOwnProperty.call(entry, "newWordEncounter")) {
            if (!record(entry.newWordEncounter))
                fail();
            exactKeys(entry.newWordEncounter, NEW_WORD_ENCOUNTER_KEYS);
            if (!record(entry.newWordEncounter.save))
                fail();
            exactKeys(entry.newWordEncounter.save, [
                "available",
                "savablePhraseRef",
                "targetLanguage",
                "targetText",
                "meaningByLocale",
                "sourceTextFingerprint",
                "contentOrigin",
            ]);
            const encounterSave = materializeLearningV2CourseSessionSavablePhraseV1({
                targetLanguage: entry.newWordEncounter.save
                    .targetLanguage,
                targetText: entry.newWordEncounter.save.targetText,
                meaningByLocale: entry.newWordEncounter.save
                    .meaningByLocale,
            });
            const transcription = text(entry.newWordEncounter.transcription, 160);
            const orderWithinSession = entry.newWordEncounter.orderWithinSession;
            const motionVariant = entry.newWordEncounter.motionVariant;
            if (!/^\/.+\/$/u.test(transcription) ||
                !Number.isInteger(orderWithinSession) ||
                orderWithinSession < 1 ||
                orderWithinSession > 20 ||
                (motionVariant !== "lesson_hero_b" &&
                    motionVariant !== "premium_a") ||
                entry.newWordEncounter.presentation !== "blocking_task_overlay" ||
                entry.newWordEncounter.dismissal !== "continue_only" ||
                entry.newWordEncounter.saveControl !== "bookmark_icon" ||
                entry.newWordEncounter.save.available !== true ||
                entry.newWordEncounter.save.savablePhraseRef !==
                    encounterSave.savablePhraseRef ||
                entry.newWordEncounter.save.sourceTextFingerprint !==
                    encounterSave.sourceTextFingerprint ||
                entry.newWordEncounter.save.contentOrigin !==
                    encounterSave.contentOrigin ||
                encounterSave.savablePhraseRef !== save.savablePhraseRef)
                fail();
            newWordEncounter = Object.freeze({
                lexicalItemId: id(entry.newWordEncounter.lexicalItemId),
                transcription,
                playfulMeaningByLocale: localized(entry.newWordEncounter.playfulMeaningByLocale, 400),
                motionVariant,
                presentation: "blocking_task_overlay",
                dismissal: "continue_only",
                saveControl: "bookmark_icon",
                orderWithinSession: orderWithinSession,
                save: encounterSave,
            });
        }
        return Object.freeze({
            interactionId,
            report: Object.freeze({
                available: true,
                reportContextRef: id(entry.report.reportContextRef),
                screen: "learning_v2_session",
            }),
            save,
            voice: Object.freeze({
                available: true,
                tapToRecordAllowed: true,
                holdToTalkAllowed: true,
            }),
            secondErrorExplanationRef: id(entry.secondErrorExplanationRef),
            secondErrorExplanationByLocale: localized(entry.secondErrorExplanationByLocale, 2_000),
            ...(responseFeedbackById ? { responseFeedbackById } : {}),
            ...(newWordEncounter ? { newWordEncounter } : {}),
        });
    }));
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1,
        courseSessionId: id(value.courseSessionId),
        entries,
        entryCount: entries.length,
        actionCoverage: "every_intro_and_practice_interaction",
        firstWrongBehavior: "transparent_shake_not_selected_no_red_frame",
        secondWrongBehavior: "show_localized_server_approved_explanation",
        explanationOrigin: "admin_reviewed_error_guidance_release_reference",
        evaluatorPayload: "absent_by_exact_schema",
        recordingArtifactPolicy: "none_command_only",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
    };
    if (value.schemaVersion !== body.schemaVersion ||
        value.entryCount !== body.entryCount ||
        value.actionCoverage !== body.actionCoverage ||
        value.firstWrongBehavior !== body.firstWrongBehavior ||
        value.secondWrongBehavior !== body.secondWrongBehavior ||
        value.explanationOrigin !== body.explanationOrigin ||
        value.evaluatorPayload !== body.evaluatorPayload ||
        value.recordingArtifactPolicy !== body.recordingArtifactPolicy ||
        value.runtimeAuthority !== body.runtimeAuthority ||
        value.releaseAuthority !== false ||
        value.auxiliaryFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail();
    const result = Object.freeze({
        ...body,
        auxiliaryFingerprint: value.auxiliaryFingerprint,
    });
    auxiliaryHandles.add(result);
    return result;
}
function materializeLearningV2CourseSessionAuxiliaryChildV1(input) {
    const body = {
        schemaVersion: exports.LEARNING_V2_COURSE_SESSION_AUXILIARY_CHILD_SCHEMA_V1,
        ...input,
        entryCount: input.entries.length,
        actionCoverage: "every_intro_and_practice_interaction",
        firstWrongBehavior: "transparent_shake_not_selected_no_red_frame",
        secondWrongBehavior: "show_localized_server_approved_explanation",
        explanationOrigin: "admin_reviewed_error_guidance_release_reference",
        evaluatorPayload: "absent_by_exact_schema",
        recordingArtifactPolicy: "none_command_only",
        runtimeAuthority: "none_active_release_join_required",
        releaseAuthority: false,
    };
    return parseLearningV2CourseSessionAuxiliaryChildV1((0, decision_registry_1.canonicalJsonV1)({ ...body, auxiliaryFingerprint: (0, decision_registry_1.hashCanonicalBody)(body) }));
}
const encodeLearningV2CourseSessionIntroChildV1 = (value) => {
    if (!introHandles.has(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
};
exports.encodeLearningV2CourseSessionIntroChildV1 = encodeLearningV2CourseSessionIntroChildV1;
const encodeLearningV2CourseSessionLearnerChildV1 = (value) => {
    if (!learnerHandles.has(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
};
exports.encodeLearningV2CourseSessionLearnerChildV1 = encodeLearningV2CourseSessionLearnerChildV1;
const isLearningV2CourseSessionLearnerChildV1 = (value) => typeof value === "object" && value !== null && learnerHandles.has(value);
exports.isLearningV2CourseSessionLearnerChildV1 = isLearningV2CourseSessionLearnerChildV1;
const encodeLearningV2CourseSessionAuxiliaryChildV1 = (value) => {
    if (!auxiliaryHandles.has(value))
        fail();
    return (0, decision_registry_1.canonicalJsonV1)(value);
};
exports.encodeLearningV2CourseSessionAuxiliaryChildV1 = encodeLearningV2CourseSessionAuxiliaryChildV1;
//# sourceMappingURL=course_session_client_children_v1.js.map