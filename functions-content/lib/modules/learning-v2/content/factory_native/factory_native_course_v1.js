"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factoryNativeLearningV2CourseIdentityV1 = exports.factoryNativeLearningV2CatalogSeedV1 = exports.factoryNativeLearningV2AvailabilityV1 = exports.FACTORY_NATIVE_PROJECTION_VERSION_V1 = exports.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1 = exports.FACTORY_NATIVE_AUTHORED_LOCALES_V1 = void 0;
exports.factoryNativeExplanationV1 = factoryNativeExplanationV1;
exports.factoryNativeIntroResponseFeedbackByIdV1 = factoryNativeIntroResponseFeedbackByIdV1;
exports.factoryNativeIntroResponseAnalysisByIdV1 = factoryNativeIntroResponseAnalysisByIdV1;
exports.factoryNativeIntroResponseDiagnosticsByIdV1 = factoryNativeIntroResponseDiagnosticsByIdV1;
exports.factoryNativeSpeedMatchColumnsV1 = factoryNativeSpeedMatchColumnsV1;
exports.factoryNativeChoiceFeedbackV1 = factoryNativeChoiceFeedbackV1;
exports.factoryNativeOrderedTokenSlotFeedbackV1 = factoryNativeOrderedTokenSlotFeedbackV1;
exports.factoryNativeLearningV2InitialRewardBindingV1 = factoryNativeLearningV2InitialRewardBindingV1;
exports.materializeFactoryNativeLearningV2SessionV1 = materializeFactoryNativeLearningV2SessionV1;
const factory_native_manifest_v1_generated_1 = require("./factory_native_manifest_v1.generated");
const factory_native_catalog_v1_1 = require("./factory_native_catalog_v1");
const generator_course_contract_1 = require("../generator_course_contract");
const course_topology_v1_1 = require("../course_topology_v1");
const course_session_client_children_v1_1 = require("../../runtime/course_session_client_children_v1");
const course_session_evaluator_capsule_child_v1_1 = require("../../runtime/course_session_evaluator_capsule_child_v1");
const decision_registry_1 = require("../../policies/decision_registry");
const transcription_1 = require("../../../../app/transcription");
const learner_visible_text_v1_1 = require("../learner_visible_text_v1");
// зачем (координатор, 2026-10-01, решение по §43): транскрипцию на карточках
// слов берём из словаря проекта (app/transcription.ts), без скачивания CMU.
// Словарь честно возвращает пустую строку, если не уверен хотя бы в одном
// слове, — тогда карточка идёт без транскрипции (null), а не с выдумкой.
function knownTranscriptionOrNull(word) {
    const ipa = (0, transcription_1.getTranscription)(word);
    return ipa === "" ? null : ipa;
}
var factory_native_catalog_v1_2 = require("./factory_native_catalog_v1");
Object.defineProperty(exports, "FACTORY_NATIVE_AUTHORED_LOCALES_V1", { enumerable: true, get: function () { return factory_native_catalog_v1_2.FACTORY_NATIVE_AUTHORED_LOCALES_V1; } });
Object.defineProperty(exports, "FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1", { enumerable: true, get: function () { return factory_native_catalog_v1_2.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1; } });
Object.defineProperty(exports, "FACTORY_NATIVE_PROJECTION_VERSION_V1", { enumerable: true, get: function () { return factory_native_catalog_v1_2.FACTORY_NATIVE_PROJECTION_VERSION_V1; } });
Object.defineProperty(exports, "factoryNativeLearningV2AvailabilityV1", { enumerable: true, get: function () { return factory_native_catalog_v1_2.factoryNativeLearningV2AvailabilityV1; } });
Object.defineProperty(exports, "factoryNativeLearningV2CatalogSeedV1", { enumerable: true, get: function () { return factory_native_catalog_v1_2.factoryNativeLearningV2CatalogSeedV1; } });
Object.defineProperty(exports, "factoryNativeLearningV2CourseIdentityV1", { enumerable: true, get: function () { return factory_native_catalog_v1_2.factoryNativeLearningV2CourseIdentityV1; } });
function record(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value))
        throw new Error("learning_v2_factory_native_projection_invalid");
    return value;
}
function localized(value) {
    const source = record(value);
    const ru = String(source.ru ?? "").replace(/\s+/gu, " ").trim();
    const uk = String(source.uk ?? ru).replace(/\s+/gu, " ").trim();
    if (!ru || !uk)
        throw new Error("learning_v2_factory_native_locale_missing");
    return Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        locale === "uk" ? uk : ru,
    ])));
}
function factoryNativeTextAnalysisV1(rawValue) {
    const raw = record(rawValue);
    return Object.freeze({
        text: String(raw.text),
        meaningByLocale: localized(raw.meaningByLocale),
        explanationByLocale: localized(raw.explanationByLocale),
        units: Object.freeze((Array.isArray(raw.units) ? raw.units : []).map((value) => {
            const unit = record(value);
            return Object.freeze({
                text: String(unit.text),
                start: Number(unit.start),
                end: Number(unit.end),
                lemma: String(unit.lemma),
                partOfSpeech: String(unit.partOfSpeech),
                partOfSpeechLabelByLocale: localized(unit.partOfSpeechLabelByLocale),
                meaningByLocale: localized(unit.meaningByLocale),
                functionByLocale: localized(unit.functionByLocale),
                sourceRefs: Object.freeze((Array.isArray(unit.sourceRefs) ? unit.sourceRefs : []).map(String)),
            });
        })),
    });
}
function factoryNativeSpeedPairAnalysisV1(rawValue) {
    const raw = record(rawValue);
    return Object.freeze({
        lemma: String(raw.lemma),
        partOfSpeech: String(raw.partOfSpeech),
        partOfSpeechLabelByLocale: localized(raw.partOfSpeechLabelByLocale),
        meaningByLocale: localized(raw.meaningByLocale),
        functionByLocale: localized(raw.functionByLocale),
        matchExplanationByLocale: localized(raw.matchExplanationByLocale),
        sourceRefs: Object.freeze((Array.isArray(raw.sourceRefs) ? raw.sourceRefs : []).map(String)),
        ...(raw.phrase === undefined ? {} : { phrase: factoryNativeTextAnalysisV1(raw.phrase) }),
    });
}
function factoryNativeExplanationV1(rawValue) {
    if (rawValue === null || rawValue === undefined)
        return null;
    const raw = record(rawValue);
    if (raw.analysisV1 !== undefined)
        return Object.freeze({
            analysisV1: factoryNativeSpeedPairAnalysisV1(raw.analysisV1),
        });
    if (raw.phrase === undefined)
        return Object.freeze({
            completionFeedbackByLocale: localized(raw.completionFeedbackByLocale),
        });
    return Object.freeze({
        ...(raw.completionFeedbackByLocale === undefined ? {} : { completionFeedbackByLocale: localized(raw.completionFeedbackByLocale) }),
        phrase: factoryNativeTextAnalysisV1(raw.phrase),
    });
}
function remapText(value, oldPrefix, courseSessionId) {
    return value.split(oldPrefix).join(courseSessionId);
}
function remapId(value, oldPrefix, courseSessionId) {
    const id = remapText(String(value ?? ""), oldPrefix, courseSessionId);
    if (!id)
        throw new Error("learning_v2_factory_native_id_missing");
    return id;
}
function factoryNativeIntroResponseFeedbackByIdV1(input) {
    const auxiliary = record(input.rawAuxiliary);
    if (!Array.isArray(auxiliary.entries))
        throw new Error("learning_v2_factory_native_auxiliary_missing");
    const entry = auxiliary.entries
        .map(record)
        .find((candidate) => candidate.interactionId === input.sourceInteractionId);
    if (!entry || !entry.responseFeedbackById)
        throw new Error("learning_v2_factory_native_intro_feedback_missing");
    const sourceFeedback = record(entry.responseFeedbackById);
    const expected = new Set(input.sourceResponseIds);
    const expectedLegacyWrongOnly = new Set(input.sourceResponseIds.filter((responseId) => responseId !== input.sourceCorrectResponseId));
    const actual = Object.keys(sourceFeedback);
    const isExactSet = (candidate) => actual.length === candidate.size && actual.every((responseId) => candidate.has(responseId));
    if (expected.size !== input.sourceResponseIds.length ||
        (!isExactSet(expected) && !isExactSet(expectedLegacyWrongOnly)))
        throw new Error("learning_v2_factory_native_intro_feedback_incomplete");
    return Object.freeze(Object.fromEntries(actual.map((responseId) => [
        remapId(responseId, input.oldPrefix, input.courseSessionId),
        localized(sourceFeedback[responseId]),
    ])));
}
function factoryNativeIntroResponseAnalysisByIdV1(input) {
    const auxiliary = record(input.rawAuxiliary);
    if (!Array.isArray(auxiliary.entries))
        throw new Error("learning_v2_factory_native_auxiliary_missing");
    const entry = auxiliary.entries.map(record).find((candidate) => candidate.interactionId === input.sourceInteractionId);
    if (!entry || !entry.responseAnalysisById)
        throw new Error("learning_v2_factory_native_intro_analysis_missing");
    const sourceAnalysis = record(entry.responseAnalysisById);
    if (Object.keys(sourceAnalysis).length !== input.sourceResponseIds.length ||
        input.sourceResponseIds.some((responseId) => !(responseId in sourceAnalysis)))
        throw new Error("learning_v2_factory_native_intro_analysis_incomplete");
    return Object.freeze(Object.fromEntries(input.sourceResponseIds.map((responseId) => {
        const byAuthoredLocale = record(sourceAnalysis[responseId]);
        const projectedByLocale = Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
            const authoredLocale = factory_native_catalog_v1_1.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[locale];
            return [locale, factoryNativeTextAnalysisV1(byAuthoredLocale[authoredLocale])];
        })));
        return [remapId(responseId, input.oldPrefix, input.courseSessionId), projectedByLocale];
    })));
}
function factoryNativeIntroResponseDiagnosticsByIdV1(input) {
    const auxiliary = record(input.rawAuxiliary);
    if (!Array.isArray(auxiliary.entries))
        throw new Error("learning_v2_factory_native_auxiliary_missing");
    const entry = auxiliary.entries.map(record).find((candidate) => candidate.interactionId === input.sourceInteractionId);
    if (!entry || !entry.responseDiagnosticsById)
        throw new Error("learning_v2_factory_native_intro_diagnostics_missing");
    const sourceDiagnostics = record(entry.responseDiagnosticsById);
    const wrongResponseIds = input.sourceResponseIds.filter((responseId) => responseId !== input.sourceCorrectResponseId);
    if (Object.keys(sourceDiagnostics).length !== wrongResponseIds.length ||
        wrongResponseIds.some((responseId) => !(responseId in sourceDiagnostics)))
        throw new Error("learning_v2_factory_native_intro_diagnostics_incomplete");
    return Object.freeze(Object.fromEntries(wrongResponseIds.map((responseId) => {
        const diagnostic = record(sourceDiagnostics[responseId]);
        const localizedDiagnostic = (key) => {
            const byAuthoredLocale = record(diagnostic[key]);
            return localized(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
                locale,
                byAuthoredLocale[factory_native_catalog_v1_1.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[locale]],
            ])));
        };
        return [remapId(responseId, input.oldPrefix, input.courseSessionId), Object.freeze({
                errorType: String(diagnostic.errorType ?? ""),
                whyTemptingByLocale: localizedDiagnostic("whyTemptingByLocale"),
                whyWrongHereByLocale: localizedDiagnostic("whyWrongHereByLocale"),
                minimalContrastByLocale: localizedDiagnostic("minimalContrastByLocale"),
                acceptabilityBoundaryByLocale: localizedDiagnostic("acceptabilityBoundaryByLocale"),
            })];
    })));
}
function factoryNativeIntroFallbackFeedbackByIdV1(input) {
    const wrongResponseIds = input.sourceResponseIds.filter((responseId) => responseId !== input.sourceCorrectResponseId);
    if (!wrongResponseIds.length || wrongResponseIds.length !== input.sourceResponseIds.length - 1)
        throw new Error("learning_v2_factory_native_intro_feedback_incomplete");
    if (generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.some((locale) => input.feedbackByLocale[locale].length !== wrongResponseIds.length ||
        input.feedbackByLocale[locale].some((feedback) => !feedback.trim())))
        throw new Error("learning_v2_factory_native_intro_feedback_incomplete");
    return Object.freeze(Object.fromEntries(wrongResponseIds.map((responseId, wrongIndex) => [
        remapId(responseId, input.oldPrefix, input.courseSessionId),
        localized(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
            locale,
            input.feedbackByLocale[locale][wrongIndex],
        ]))),
    ])));
}
function stablePermutation(values, seed) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const digest = (0, decision_registry_1.sha256Utf8)(`${seed}:${index}`);
        const swap = Number.parseInt(digest.slice(0, 8), 16) % (index + 1);
        [result[index], result[swap]] = [result[swap], result[index]];
    }
    if (result.length > 1 && result.every((value, index) => value === values[index]))
        result.push(result.shift());
    return Object.freeze(result);
}
function factoryNativeSpeedMatchColumnsV1(pairIds, boardSeed) {
    if (pairIds.length < 3 || new Set(pairIds).size !== pairIds.length)
        throw new Error("learning_v2_factory_native_pair_shuffle_invalid");
    const leftColumn = stablePermutation(pairIds, `${boardSeed}:left`);
    const rightSeed = stablePermutation(pairIds, `${boardSeed}:right`);
    // Preserve the published four-pair board ordering before considering the
    // complete fallback used by future board sizes.
    const rightCandidates = [rightSeed, Object.freeze([...rightSeed].reverse())]
        .flatMap((candidate) => candidate.map((_, offset) => Object.freeze(candidate.map((__, index) => candidate[(index + offset) % candidate.length]))));
    const isValid = (candidate) => candidate.some((pairId, index) => pairId !== pairIds[index]) &&
        candidate.every((pairId, index) => pairId !== leftColumn[index]);
    const existingCandidate = rightCandidates.find(isValid);
    if (existingCandidate)
        return Object.freeze({ leftColumn, rightColumn: existingCandidate });
    // Every non-zero cyclic shift of distinct left-column IDs is a derangement.
    // For n >= 3, at most one of those n-1 shifts can equal the source order, so
    // this search always contains a valid non-identity presentation.
    for (let offset = 1; offset < leftColumn.length; offset += 1) {
        const candidate = Object.freeze(leftColumn.map((_, index) => leftColumn[(index + offset) % leftColumn.length]));
        if (isValid(candidate))
            return Object.freeze({ leftColumn, rightColumn: candidate });
    }
    throw new Error("learning_v2_factory_native_pair_shuffle_invalid");
}
function bodyRuns(text) {
    const runs = [];
    let cursor = 0;
    for (const match of text.matchAll(/`([^`]+)`/gu)) {
        const index = match.index ?? 0;
        if (index > cursor)
            runs.push({ text: text.slice(cursor, index), semantic: "explanation" });
        // Backticks preserve an authored language fragment, but do not establish
        // correctness: reviewed intros also use them for counterexamples.
        runs.push({ text: match[1], semantic: "explanation" });
        cursor = index + match[0].length;
    }
    if (cursor < text.length)
        runs.push({ text: text.slice(cursor), semantic: "explanation" });
    return Object.freeze(runs.length ? runs.map((run) => Object.freeze(run)) : [Object.freeze({ text, semantic: "explanation" })]);
}
function localizedRuns(value) {
    const source = localized(value);
    return Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, bodyRuns(source[locale])])));
}
function factoryNativeChoiceFeedbackV1(raw, responseOptions, correctResponseId, oldPrefix, courseSessionId) {
    const source = (Array.isArray(raw.choiceFeedback) ? raw.choiceFeedback : []).map(record);
    return Object.freeze(source.map((feedback) => {
        const responseId = remapId(feedback.responseId, oldPrefix, courseSessionId);
        return Object.freeze({
            responseId,
            correct: responseId === correctResponseId,
            testedDimension: String(feedback.testedDimension ?? "reviewed_factory_feedback"),
            feedbackByLocale: localized(feedback.feedbackByLocale),
            ...(feedback.analysisV1 === undefined ? {} : { analysisV1: factoryNativeTextAnalysisV1(feedback.analysisV1) }),
            ...(feedback.errorType === undefined ? {} : {
                errorType: String(feedback.errorType),
                whyTemptingByLocale: localized(feedback.whyTemptingByLocale),
                whyWrongHereByLocale: localized(feedback.whyWrongHereByLocale),
                minimalContrastByLocale: localized(feedback.minimalContrastByLocale),
                acceptabilityBoundaryByLocale: localized(feedback.acceptabilityBoundaryByLocale),
            }),
        });
    }));
}
function factoryNativeOrderedTokenSlotFeedbackV1(raw, responseOptions) {
    const orderedTokenCount = Array.isArray(raw.orderedTokens) ? raw.orderedTokens.length : 0;
    const distractorTokenCount = Array.isArray(raw.authoredDistractorTokens)
        ? raw.authoredDistractorTokens.length
        : Array.isArray(raw.distractorTokens)
            ? raw.distractorTokens.length
            : 0;
    const source = (Array.isArray(raw.slotFeedback) ? raw.slotFeedback : []).map(record);
    // Older admitted generated bundles predate authored slot feedback. They
    // remain readable; once the field is present it must cover every distractor.
    if (source.length === 0)
        return Object.freeze([]);
    if (source.length !== distractorTokenCount)
        throw new Error("learning_v2_factory_native_slot_feedback_incomplete");
    const seen = new Set();
    return Object.freeze(source.map((feedback, feedbackIndex) => {
        const match = /:tile:d([1-9]\d*)$/u.exec(String(feedback.responseId ?? ""));
        // Current source IDs name the physical distractor (`:tile:dN`). Older
        // admitted bundles used `:rN`; their retained order is the only binding.
        const distractorOrdinal = match ? Number(match[1]) : feedbackIndex + 1;
        const response = responseOptions[orderedTokenCount + distractorOrdinal - 1];
        if (!response || distractorOrdinal > distractorTokenCount || seen.has(distractorOrdinal))
            throw new Error("learning_v2_factory_native_slot_feedback_binding_invalid");
        seen.add(distractorOrdinal);
        return Object.freeze({
            responseId: response.responseId,
            correct: false,
            testedDimension: String(feedback.testedDimension ?? "reviewed_factory_feedback"),
            feedbackByLocale: localized(feedback.feedbackByLocale),
            ...(feedback.analysisV1 === undefined ? {} : { analysisV1: factoryNativeTextAnalysisV1(feedback.analysisV1) }),
            ...(feedback.errorType === undefined ? {} : {
                errorType: String(feedback.errorType),
                whyTemptingByLocale: localized(feedback.whyTemptingByLocale),
                whyWrongHereByLocale: localized(feedback.whyWrongHereByLocale),
                minimalContrastByLocale: localized(feedback.minimalContrastByLocale),
                acceptabilityBoundaryByLocale: localized(feedback.acceptabilityBoundaryByLocale),
            }),
        });
    }));
}
function nativeModePayload(rawValue, responseOptions, correctResponseId, oldPrefix, courseSessionId, fallbackLocalizedScene, interactionFamily, fallbackSourceAudioTargetId) {
    const raw = record(rawValue);
    // Early release bundles stored the family on the interaction but omitted
    // the duplicate mode field. The interaction contract remains authoritative.
    const family = String(raw.family ?? interactionFamily);
    const feedback = ["listen_choose", "sound_contrast", "context_gap_grammar"].includes(family)
        ? factoryNativeChoiceFeedbackV1(raw, responseOptions, correctResponseId, oldPrefix, courseSessionId)
        : Object.freeze([]);
    const slotFeedback = ["phrase_builder", "listen_build_dictation"].includes(family)
        ? factoryNativeOrderedTokenSlotFeedbackV1(raw, responseOptions)
        : Object.freeze([]);
    const audioTargetId = (value) => (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: "learning-v2-factory-native-audio-target.v1",
        courseSessionId,
        sourceAudioTargetId: remapId(value, oldPrefix, courseSessionId),
    });
    // Legacy reviewed bundles use both null and an absent field for an optional
    // slow reference. Both mean that no slow recording exists; neither is an
    // invalid audio object.
    const audioRef = (value) => value === null || value === undefined
        ? null
        : Object.freeze({
            audioTargetId: audioTargetId(record(value).audioTargetId ?? fallbackSourceAudioTargetId),
            transcript: String(record(value).transcript ?? ""),
        });
    if (family === "phrase_builder") {
        const explanationV1 = factoryNativeExplanationV1(raw.explanationV1);
        const completionFeedbackByLocale = explanationV1?.completionFeedbackByLocale
            ?? (raw.completionFeedbackByLocale === undefined ? undefined : localized(raw.completionFeedbackByLocale));
        return Object.freeze({
            family,
            targetPhrase: String(raw.targetPhrase),
            // Source packets may name this reviewed learner explanation `localizedScene`.
            // It is not optional: use it verbatim rather than dropping a real context
            // and crashing the entire session because a legacy release used that key.
            localizedMeaning: localized(raw.localizedMeaning ?? raw.localizedScene ?? fallbackLocalizedScene),
            orderedTokens: Object.freeze((Array.isArray(raw.orderedTokens) ? raw.orderedTokens : []).map(String)),
            authoredDistractorTokens: Object.freeze((Array.isArray(raw.authoredDistractorTokens) ? raw.authoredDistractorTokens : []).map(String)),
            slotFeedback,
            ...(completionFeedbackByLocale ? { completionFeedbackByLocale } : {}),
            ...(explanationV1?.phrase ? { explanationV1: explanationV1 } : {}),
        });
    }
    if (family === "listen_choose")
        return Object.freeze({
            family,
            referenceAudio: audioRef(raw.referenceAudio),
            slowReferenceAudio: audioRef(raw.slowReferenceAudio),
            localizedMeaningChoices: Object.freeze(raw.localizedMeaningChoices.map((value) => {
                const choice = record(value);
                return Object.freeze({
                    responseId: remapId(choice.responseId, oldPrefix, courseSessionId),
                    targetText: String(choice.targetText),
                    meaningByLocale: choice.meaningByLocale === null || choice.meaningByLocale === undefined
                        ? null
                        : localized(choice.meaningByLocale),
                });
            })),
            transcriptRevealPolicy: "after_first_attempt",
            choiceFeedback: feedback,
        });
    if (family === "sound_contrast")
        return Object.freeze({
            family,
            contrastA: String(raw.contrastA), contrastB: String(raw.contrastB),
            ipaA: String(raw.ipaA ?? ""), ipaB: String(raw.ipaB ?? ""),
            audioA: audioRef(raw.audioA), audioB: audioRef(raw.audioB),
            testedPhoneticContrast: String(raw.testedPhoneticContrast),
            choiceFeedback: feedback,
        });
    if (family === "listen_build_dictation") {
        const explanationV1 = factoryNativeExplanationV1(raw.explanationV1);
        const completionFeedbackByLocale = explanationV1?.completionFeedbackByLocale
            ?? (raw.completionFeedbackByLocale === undefined ? undefined : localized(raw.completionFeedbackByLocale));
        return Object.freeze({
            family,
            referenceAudio: audioRef(raw.referenceAudio),
            slowReferenceAudio: audioRef(raw.slowReferenceAudio),
            hiddenTargetPhrase: String(raw.hiddenTargetPhrase),
            orderedTokens: Object.freeze((Array.isArray(raw.orderedTokens) ? raw.orderedTokens : []).map(String)),
            authoredDistractorTokens: Object.freeze((Array.isArray(raw.authoredDistractorTokens)
                ? raw.authoredDistractorTokens
                : Array.isArray(raw.distractorTokens)
                    ? raw.distractorTokens
                    : []).map(String)),
            slotFeedback,
            ...(completionFeedbackByLocale ? { completionFeedbackByLocale } : {}),
            ...(explanationV1?.phrase ? { explanationV1: explanationV1 } : {}),
        });
    }
    if (family === "context_gap_grammar")
        return Object.freeze({
            family,
            // Older admitted bundles sometimes omitted the display scene altogether.
            // Recover only from the reviewed per-locale practice title, never from a
            // guessed situation; that same title passes through the shared projection.
            localizedScene: raw.localizedScene === undefined || raw.localizedScene === null
                ? fallbackLocalizedScene
                : localized(raw.localizedScene),
            gappedTargetPhrase: String(raw.gappedTargetPhrase),
            gapOptions: Object.freeze(responseOptions),
            testedDimension: String(raw.testedDimension),
            choiceFeedback: feedback,
        });
    if (family === "speed_match") {
        const pairGrid = Object.freeze(raw.pairGrid.map((value) => {
            const pair = record(value);
            return Object.freeze({
                pairId: remapId(pair.pairId, oldPrefix, courseSessionId),
                target: String(pair.target),
                meaningByLocale: localized(pair.meaningByLocale),
                ...(pair.analysisV1 === undefined ? {} : {
                    analysisV1: factoryNativeSpeedPairAnalysisV1(pair.analysisV1),
                }),
            });
        }));
        const pairIds = Object.freeze(pairGrid.map((pair) => pair.pairId));
        const boardSeed = `${courseSessionId}:${pairIds.join(":")}`;
        const { leftColumn, rightColumn } = factoryNativeSpeedMatchColumnsV1(pairIds, boardSeed);
        return Object.freeze({
            family, pairGrid, leftColumn, rightColumn,
            pairingKey: "pair_id",
            timerPolicy: Object.freeze({ enabledByDefault: true, learnerCanDisable: true, pausesOnInterruption: true }),
            finishStats: Object.freeze(["speed", "accuracy", "personal_best"]),
        });
    }
    if (family === "scripted_repeat_compare") {
        const explanationV1 = factoryNativeExplanationV1(raw.explanationV1);
        return Object.freeze({
            family,
            referenceAudio: audioRef(raw.referenceAudio), slowReferenceAudio: audioRef(raw.slowReferenceAudio),
            targetPhrase: String(raw.targetPhrase),
            recordControlPolicy: "hold_press_release_with_accessible_toggle",
            modelPlayback: "reference_and_slow",
            learnerPlayback: "available_after_capture",
            honestOutcomeStates: Object.freeze(["PASS_CONFIDENT", "NEEDS_WORK_CONFIDENT", "UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM"]),
            ...(explanationV1?.phrase ? { explanationV1: Object.freeze({ phrase: explanationV1.phrase }) } : {}),
        });
    }
    throw new Error(`learning_v2_factory_native_family_unsupported:${family}`);
}
function shortMeaning(definition, word, lessonOrdinal, sessionOrdinal) {
    const quoted = /[«“"]([^»”"]+)[»”"]/u.exec(definition)?.[1]?.trim();
    if (quoted)
        return quoted;
    // The one card is the sole reviewed card without a short quoted gloss.
    // Preserve its exact reviewed definition instead of inventing a word-level
    // translation from a later phrase.
    if (word.toLocaleLowerCase("en") === "one" && lessonOrdinal === 2 && sessionOrdinal === 29)
        return definition.trim();
    throw new Error(`learning_v2_factory_native_word_translation_missing:l${String(lessonOrdinal).padStart(2, "0")}` +
        `:s${String(sessionOrdinal).padStart(2, "0")}:${word}`);
}
function localizedWordMeaning(definitions, word, lessonOrdinal, sessionOrdinal) {
    const ru = shortMeaning(definitions.ru, word, lessonOrdinal, sessionOrdinal);
    const uk = shortMeaning(definitions.uk, word, lessonOrdinal, sessionOrdinal);
    return localized({ ru, uk });
}
function lexicalSense(word, lessonOrdinal, sessionOrdinal) {
    const normalized = word.normalize("NFKC").trim().toLocaleLowerCase("en");
    if (normalized === "busy")
        return lessonOrdinal === 1 && sessionOrdinal === 30 ? "place-crowded" : "person-occupied";
    if (normalized === "full")
        return lessonOrdinal === 1 && sessionOrdinal === 45 ? "container-filled" : "person-satiated";
    if (normalized === "free")
        return lessonOrdinal === 1 && sessionOrdinal === 30 ? "without-charge" : "available";
    if (normalized === "late")
        return lessonOrdinal === 1 && sessionOrdinal === 26 ? "late-time" : "late-arrival";
    if (normalized === "cold")
        return lessonOrdinal === 1 && [3, 25].includes(sessionOrdinal) ? "person-feeling" : "temperature";
    if (normalized === "hot")
        return lessonOrdinal === 1 && sessionOrdinal === 5 ? "person-feeling" : "temperature";
    return "default-reviewed-sense";
}
function learnerPrompt(title, family, correctText) {
    return (0, learner_visible_text_v1_1.projectLearnerVisiblePromptV1)({ title, family, correctText });
}
function localizedSceneMeaning(value) {
    return Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        value[locale].replace(/^.+?\s+—\s+/u, "").trim(),
    ])));
}
function localizedQuotedMeaning(value) {
    return Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
        const quotes = [...value[locale].matchAll(/«([^»]+)»/gu)];
        return [locale, quotes.at(-1)?.[1]?.trim() || localizedSceneMeaning(value)[locale]];
    })));
}
function reviewedQuotedMeaning(value) {
    const ru = [...value.ru.matchAll(/«([^»]+)»/gu)].at(-1)?.[1]?.trim();
    const uk = [...value.uk.matchAll(/«([^»]+)»/gu)].at(-1)?.[1]?.trim();
    return ru && uk ? localized({ ru, uk }) : null;
}
function practiceSaveProjection(interaction, correctResponseId, correctText, fallbackMeaning) {
    const mode = interaction.modePayload;
    if (mode?.family === "phrase_builder")
        return { targetText: mode.targetPhrase, meaningByLocale: localizedSceneMeaning(mode.localizedMeaning) };
    if (mode?.family === "listen_build_dictation")
        return { targetText: mode.hiddenTargetPhrase, meaningByLocale: localizedSceneMeaning(fallbackMeaning) };
    if (mode?.family === "context_gap_grammar") {
        const correct = interaction.responseOptions.find((option) => option.responseId === correctResponseId)?.text ?? correctText;
        return {
            targetText: mode.gappedTargetPhrase.replace(/_{2,}/u, correct),
            meaningByLocale: localizedSceneMeaning(mode.localizedScene),
        };
    }
    if (mode?.family === "speed_match") {
        const firstPair = mode.pairGrid[0];
        return {
            targetText: firstPair.target,
            meaningByLocale: firstPair.meaningByLocale,
        };
    }
    const visibleCorrect = interaction.responseOptions.find((option) => option.responseId === correctResponseId)?.text ?? correctText;
    return { targetText: visibleCorrect, meaningByLocale: localizedSceneMeaning(fallbackMeaning) };
}
function factoryNativeLearningV2InitialRewardBindingV1() {
    const row = factory_native_manifest_v1_generated_1.FACTORY_NATIVE_MANIFEST_V1.find((candidate) => candidate.lessonOrdinal === 1 && candidate.sessionOrdinal === 1);
    if (!row)
        throw new Error("learning_v2_factory_native_initial_session_missing");
    const learner = record(row.loadLearner("ru"));
    if (!Array.isArray(learner.interactions))
        throw new Error("learning_v2_factory_native_initial_session_invalid");
    const courseSessionId = (0, course_topology_v1_1.learningV2CourseSessionIdV1)(1, 1);
    return Object.freeze({
        sourceFingerprint: row.sourceFingerprint,
        interactionIds: Object.freeze([
            `${courseSessionId}:intro1:q`, `${courseSessionId}:intro2:q`, `${courseSessionId}:intro3:q`,
            ...learner.interactions.flatMap((value) => {
                const interaction = record(value);
                return record(interaction.modePayload).isWordCard === true
                    ? [] : [remapId(interaction.interactionId, "en:lesson-01:session-01", courseSessionId)];
            }),
        ]),
    });
}
function materializeFactoryNativeLearningV2SessionV1(input) {
    const row = factory_native_manifest_v1_generated_1.FACTORY_NATIVE_MANIFEST_V1.find((candidate) => candidate.lessonOrdinal === input.lessonOrdinal && candidate.sessionOrdinal === input.sessionOrdinal);
    if (!row || !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(input.interfaceLocale))
        return null;
    const authoredLocale = factory_native_catalog_v1_1.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[input.interfaceLocale];
    const courseSessionId = (0, course_topology_v1_1.learningV2CourseSessionIdV1)(row.lessonOrdinal, row.sessionOrdinal);
    const rawIntro = record(row.loadIntro());
    const rawPages = rawIntro.pages;
    const rawAuxiliary = row.loadAuxiliary?.() ?? null;
    const oldPrefix = String(record(rawPages[0]).pageId).replace(/:intro1$/u, "");
    const introPages = rawPages.map((value, pageIndex) => {
        const page = record(value);
        const question = record(page.question);
        const choiceSource = record(question.choicesByLocale);
        const choicesByLocale = Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => {
            const sourceLocale = factory_native_catalog_v1_1.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[locale];
            const choices = (choiceSource[sourceLocale] ?? choiceSource.ru);
            return [locale, Object.freeze(choices.map((choice) => String(record(choice).text)))];
        })));
        const bodies = localized(page.bodyByLocale);
        return Object.freeze({
            pageOrdinal: (pageIndex + 1),
            pageId: remapId(page.pageId, oldPrefix, courseSessionId),
            kind: page.kind,
            titleByLocale: localized(page.titleByLocale),
            bodyByLocale: Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, bodyRuns(bodies[locale]).map((run) => run.text).join("")]))),
            bodyRunsByLocale: localizedRuns(page.bodyByLocale),
            question: Object.freeze({
                interactionId: remapId(question.interactionId, oldPrefix, courseSessionId),
                promptByLocale: localized({
                    ru: row.introPromptByAuthoredLocale.ru[pageIndex],
                    uk: row.introPromptByAuthoredLocale.uk[pageIndex],
                }),
                choicesByLocale,
                accessibilityLabelByLocale: localized({
                    ru: row.introPromptByAuthoredLocale.ru[pageIndex],
                    uk: row.introPromptByAuthoredLocale.uk[pageIndex],
                }),
            }),
        });
    });
    const introChild = (0, course_session_client_children_v1_1.materializeLearningV2CourseSessionIntroChildV1)({
        courseSessionId,
        learningOutcomeByLocale: localized(row.learningOutcomeByAuthoredLocale),
        pages: introPages,
    });
    const rawLearner = record(row.loadLearner(authoredLocale));
    const rawInteractions = rawLearner.interactions;
    const rawAnswers = row.loadAnswers();
    if (!Array.isArray(rawAnswers))
        throw new Error("learning_v2_factory_native_answers_invalid");
    const answers = new Map(rawAnswers.map((value) => {
        const answer = record(value);
        return [String(answer.interactionId), answer];
    }));
    const titleByOrdinalByLocale = new Map(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        new Map(row.practiceTitlesByAuthoredLocale[factory_native_catalog_v1_1.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[locale]]
            .map((entry) => [entry.ordinal, entry.title])),
    ]));
    const interactions = [];
    const practiceSemantics = new Map();
    const cardQueues = new Map();
    let pendingCards = [];
    let wordOrder = 0;
    for (const rawValue of rawInteractions) {
        const raw = record(rawValue);
        const rawMode = record(raw.modePayload);
        const oldInteractionId = String(raw.interactionId);
        if (rawMode.isWordCard === true) {
            const definitionByLocale = localized(record(rawMode.wordCard).definitionByLocale);
            const word = String(record(rawMode.wordCard).word);
            const meaningByLocale = localizedWordMeaning(definitionByLocale, word, row.lessonOrdinal, row.sessionOrdinal);
            const save = (0, course_session_client_children_v1_1.materializeLearningV2CourseSessionSavablePhraseV1)({ targetLanguage: "en", targetText: word, meaningByLocale });
            wordOrder += 1;
            pendingCards.push(Object.freeze({
                encounterId: `${remapId(oldInteractionId, oldPrefix, courseSessionId)}:word-card`,
                lexicalItemId: `lexical-en-${(0, decision_registry_1.hashCanonicalBody)({
                    word,
                    sense: lexicalSense(word, row.lessonOrdinal, row.sessionOrdinal),
                }).slice(0, 32)}`,
                transcription: knownTranscriptionOrNull(word),
                playfulMeaningByLocale: definitionByLocale,
                motionVariant: wordOrder % 2 === 0 ? "premium_a" : "lesson_hero_b",
                presentation: "blocking_task_overlay", dismissal: "continue_only", saveControl: "bookmark_icon",
                orderWithinSession: wordOrder,
                save,
            }));
            continue;
        }
        const answer = answers.get(oldInteractionId);
        if (!answer)
            throw new Error("learning_v2_factory_native_answer_missing");
        let responseOptions = Object.freeze(raw.responseOptions.map((value) => {
            const option = record(value);
            return Object.freeze({ responseId: remapId(option.responseId, oldPrefix, courseSessionId), text: String(option.text) });
        }));
        const correctResponseId = answer.correctResponseId === null ? null : remapId(answer.correctResponseId, oldPrefix, courseSessionId);
        if (raw.inputMode === "ordered_tokens") {
            const orderedTokens = Array.isArray(rawMode.orderedTokens) ? rawMode.orderedTokens : [];
            const distractorTokens = Array.isArray(rawMode.authoredDistractorTokens)
                ? rawMode.authoredDistractorTokens
                : Array.isArray(rawMode.distractorTokens)
                    ? rawMode.distractorTokens
                    : [];
            const tileTexts = [...orderedTokens, ...distractorTokens].map(String);
            responseOptions = Object.freeze(tileTexts.map((text, index) => Object.freeze({
                responseId: `${remapId(oldInteractionId, oldPrefix, courseSessionId)}:t${String(index + 1).padStart(2, "0")}`,
                text,
            })));
        }
        const interactionId = remapId(oldInteractionId, oldPrefix, courseSessionId);
        const ordinal = Number(String(oldInteractionId).match(/:i(\d+)$/u)?.[1]);
        const title = titleByOrdinalByLocale.get(authoredLocale)?.get(ordinal) ?? String(raw.prompt);
        const prompt = learnerPrompt(title, String(raw.family), String(answer.correctText ?? ""));
        const fallbackLocalizedScene = localized(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [locale, learnerPrompt(titleByOrdinalByLocale.get(locale)?.get(ordinal) ?? String(raw.prompt), String(raw.family), String(answer.correctText ?? ""))])));
        const modePayload = nativeModePayload(raw.modePayload, responseOptions, correctResponseId, oldPrefix, courseSessionId, fallbackLocalizedScene, String(raw.family), String((Array.isArray(raw.audioTargetIds) ? raw.audioTargetIds[0] : undefined) ?? `${oldInteractionId}:audio`));
        const sourceAudioTargetIds = Array.isArray(raw.audioTargetIds)
            ? raw.audioTargetIds
            : rawMode.referenceAudio && typeof rawMode.referenceAudio === "object"
                ? [record(rawMode.referenceAudio).audioTargetId ?? `${oldInteractionId}:audio`]
                : [];
        interactions.push(Object.freeze({
            interactionId,
            ordinal: interactions.length + 4,
            purpose: raw.purpose,
            family: raw.family,
            inputMode: raw.inputMode,
            prompt,
            responseOptions,
            mediaIds: Object.freeze((Array.isArray(raw.mediaIds) ? raw.mediaIds : []).map((id) => remapId(id, oldPrefix, courseSessionId))),
            audioTargetIds: Object.freeze(sourceAudioTargetIds.map((id) => (0, decision_registry_1.hashCanonicalBody)({
                schemaVersion: "learning-v2-factory-native-audio-target.v1",
                courseSessionId,
                sourceAudioTargetId: remapId(id, oldPrefix, courseSessionId),
            }))),
            accessibilityLabel: prompt,
            modePayload,
            scriptedAlternate: null,
        }));
        if (pendingCards.length) {
            cardQueues.set(interactionId, pendingCards);
            pendingCards = [];
        }
    }
    if (pendingCards.length)
        throw new Error("learning_v2_factory_native_terminal_word_card");
    const interactionProfile = interactions.filter((entry) => entry.family === "scripted_repeat_compare").length >= 4
        ? "voice_heavy"
        : interactions.length >= 18 ? "rapid" : "standard";
    const learnerChild = (0, course_session_client_children_v1_1.materializeLearningV2CourseSessionLearnerChildV1)({ courseSessionId, targetLanguage: "en", interactionProfile, interactions });
    const evaluatorEntries = [];
    const auxiliaryEntries = [];
    introChild.pages.forEach((page, pageIndex) => {
        const correctIndex = row.introCorrectChoiceIndexes[pageIndex];
        const accepted = page.question.choicesByLocale[authoredLocale][correctIndex];
        if (!accepted)
            throw new Error("learning_v2_factory_native_intro_answer_missing");
        evaluatorEntries.push({
            interactionId: page.question.interactionId,
            activityId: `${page.question.interactionId}:activity`, capsuleId: `${page.question.interactionId}:capsule`,
            family: "phrase_builder", normalizationLocale: "en", salt: (0, decision_registry_1.sha256Utf8)(`${row.sourceFingerprint}:${page.question.interactionId}`),
            acceptedResponses: [accepted],
        });
        const save = (0, course_session_client_children_v1_1.materializeLearningV2CourseSessionSavablePhraseV1)({ targetLanguage: "en", targetText: accepted, meaningByLocale: localizedQuotedMeaning(page.question.promptByLocale) });
        const rawPage = record(rawPages[pageIndex]);
        const rawQuestion = record(rawPage.question);
        const rawChoices = record(rawQuestion.choicesByLocale)[authoredLocale];
        if (!Array.isArray(rawChoices))
            throw new Error("learning_v2_factory_native_intro_choices_missing");
        const sourceResponseIds = rawChoices.map((choice) => String(record(choice).responseId));
        const sourceCorrectResponseId = sourceResponseIds[correctIndex];
        if (!sourceCorrectResponseId)
            throw new Error("learning_v2_factory_native_intro_answer_missing");
        const responseFeedbackById = rawAuxiliary
            ? factoryNativeIntroResponseFeedbackByIdV1({
                rawAuxiliary,
                sourceInteractionId: String(rawQuestion.interactionId),
                sourceResponseIds,
                sourceCorrectResponseId,
                oldPrefix,
                courseSessionId,
            })
            : factoryNativeIntroFallbackFeedbackByIdV1({
                feedbackByLocale: Object.freeze(Object.fromEntries(generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
                    locale,
                    row.introWrongFeedbackByAuthoredLocale[factory_native_catalog_v1_1.FACTORY_NATIVE_DISPLAY_LOCALE_FALLBACK_V1[locale]][pageIndex] ?? [],
                ]))),
                sourceResponseIds,
                sourceCorrectResponseId,
                oldPrefix,
                courseSessionId,
            });
        const rawAuxiliaryEntries = rawAuxiliary && Array.isArray(record(rawAuxiliary).entries)
            ? record(rawAuxiliary).entries
            : [];
        const rawAuxiliaryEntry = rawAuxiliaryEntries.map(record)
            .find((candidate) => candidate.interactionId === String(rawQuestion.interactionId));
        const responseAnalysisById = rawAuxiliaryEntry?.responseAnalysisById
            ? factoryNativeIntroResponseAnalysisByIdV1({
                rawAuxiliary,
                sourceInteractionId: String(rawQuestion.interactionId),
                sourceResponseIds,
                oldPrefix,
                courseSessionId,
            })
            : undefined;
        const responseDiagnosticsById = rawAuxiliaryEntry?.responseDiagnosticsById
            ? factoryNativeIntroResponseDiagnosticsByIdV1({
                rawAuxiliary,
                sourceInteractionId: String(rawQuestion.interactionId),
                sourceResponseIds,
                sourceCorrectResponseId,
                oldPrefix,
                courseSessionId,
            })
            : undefined;
        const firstWrongResponseId = sourceResponseIds.find((_, index) => index !== correctIndex);
        if (!firstWrongResponseId)
            throw new Error("learning_v2_factory_native_intro_wrong_response_missing");
        const introFeedback = responseFeedbackById[remapId(firstWrongResponseId, oldPrefix, courseSessionId)];
        if (!introFeedback)
            throw new Error("learning_v2_factory_native_intro_feedback_incomplete");
        auxiliaryEntries.push(Object.freeze({
            interactionId: page.question.interactionId,
            report: Object.freeze({ available: true, reportContextRef: `${page.question.interactionId}:report`, screen: "learning_v2_session" }),
            save, voice: Object.freeze({ available: true, tapToRecordAllowed: true, holdToTalkAllowed: true }),
            secondErrorExplanationRef: `${page.question.interactionId}:feedback`,
            secondErrorExplanationByLocale: introFeedback,
            responseFeedbackById,
            ...(responseAnalysisById ? { responseAnalysisById } : {}),
            ...(responseDiagnosticsById ? { responseDiagnosticsById } : {}),
        }));
    });
    learnerChild.interactions.forEach((interaction) => {
        const oldId = remapText(interaction.interactionId, courseSessionId, oldPrefix);
        const answer = answers.get(oldId);
        let acceptedResponses;
        if (interaction.inputMode === "single_choice")
            acceptedResponses = [remapId(answer.correctResponseId, oldPrefix, courseSessionId)];
        else if (interaction.inputMode === "pair_grid")
            acceptedResponses = ["all_pairs_matched"];
        else if (interaction.modePayload?.family === "phrase_builder")
            acceptedResponses = [interaction.modePayload.orderedTokens.join(" ")];
        else if (interaction.modePayload?.family === "listen_build_dictation")
            acceptedResponses = [interaction.modePayload.orderedTokens.join(" ")];
        else
            acceptedResponses = [String(answer.correctText)];
        evaluatorEntries.push({
            interactionId: interaction.interactionId,
            activityId: `${interaction.interactionId}:activity`, capsuleId: `${interaction.interactionId}:capsule`,
            family: interaction.family, normalizationLocale: "en", salt: (0, decision_registry_1.sha256Utf8)(`${row.sourceFingerprint}:${interaction.interactionId}`),
            acceptedResponses,
        });
        const promptByLocale = localized({
            ru: row.practiceTitlesByAuthoredLocale.ru.find((entry) => entry.ordinal === Number(oldId.match(/:i(\d+)$/u)?.[1]))?.title ?? interaction.prompt,
            uk: row.practiceTitlesByAuthoredLocale.uk.find((entry) => entry.ordinal === Number(oldId.match(/:i(\d+)$/u)?.[1]))?.title ?? interaction.prompt,
        });
        const saveProjection = practiceSaveProjection(interaction, answer.correctResponseId === null ? null : remapId(answer.correctResponseId, oldPrefix, courseSessionId), String(answer.correctText ?? ""), promptByLocale);
        const exactModeMeaning = interaction.modePayload?.family === "listen_choose"
            ? interaction.modePayload.localizedMeaningChoices.find((choice) => choice.responseId === (answer.correctResponseId === null ? null : remapId(answer.correctResponseId, oldPrefix, courseSessionId)))?.meaningByLocale ?? null
            : interaction.modePayload?.family === "speed_match"
                ? interaction.modePayload.pairGrid[0]?.meaningByLocale ?? null
                : interaction.modePayload?.family === "phrase_builder"
                    ? reviewedQuotedMeaning(interaction.modePayload.localizedMeaning)
                    : reviewedQuotedMeaning(promptByLocale);
        practiceSemantics.set(interaction.interactionId, Object.freeze({
            canonicalTarget: saveProjection.targetText,
            reviewedMeaningByLocale: exactModeMeaning,
        }));
        const save = (0, course_session_client_children_v1_1.materializeLearningV2CourseSessionSavablePhraseV1)({ targetLanguage: "en", ...saveProjection });
        const feedback = interaction.modePayload && "choiceFeedback" in interaction.modePayload
            ? interaction.modePayload.choiceFeedback
            : interaction.modePayload && "slotFeedback" in interaction.modePayload
                ? interaction.modePayload.slotFeedback
                : [];
        const responseFeedbackById = feedback.length ? Object.freeze(Object.fromEntries(feedback.map((entry) => [entry.responseId, entry.feedbackByLocale]))) : undefined;
        auxiliaryEntries.push(Object.freeze({
            interactionId: interaction.interactionId,
            report: Object.freeze({ available: true, reportContextRef: `${interaction.interactionId}:report`, screen: "learning_v2_session" }),
            save, voice: Object.freeze({ available: true, tapToRecordAllowed: true, holdToTalkAllowed: true }),
            secondErrorExplanationRef: `${interaction.interactionId}:feedback`,
            secondErrorExplanationByLocale: feedback[0]?.feedbackByLocale ?? promptByLocale,
            ...(responseFeedbackById ? { responseFeedbackById } : {}),
        }));
    });
    const evaluatorCapsuleChild = (0, course_session_evaluator_capsule_child_v1_1.materializeLearningV2CourseSessionEvaluatorCapsuleChildV1)({ courseSessionId, entries: evaluatorEntries });
    const auxiliaryChild = (0, course_session_client_children_v1_1.materializeLearningV2CourseSessionAuxiliaryChildV1)({ courseSessionId, entries: auxiliaryEntries });
    return Object.freeze({
        courseSessionId,
        sourceFingerprint: row.sourceFingerprint,
        localeResolution: Object.freeze({
            requestedLocale: input.interfaceLocale,
            authoredLocale,
            kind: input.interfaceLocale === authoredLocale ? "authored" : "explicit_display_fallback",
        }),
        introChild, learnerChild, evaluatorCapsuleChild, auxiliaryChild,
        wordEncounterQueuesByInteractionId: Object.freeze(Object.fromEntries([...cardQueues.entries()].map(([interactionId, encounters]) => [interactionId, Object.freeze(encounters)]))),
        practiceSemanticsByInteractionId: Object.freeze(Object.fromEntries(practiceSemantics)),
        deviceSpeechFingerprint: (0, decision_registry_1.hashCanonicalBody)(learnerChild.interactions.map((entry) => ({ interactionId: entry.interactionId, audioTargetIds: entry.audioTargetIds, modePayload: entry.modePayload }))),
    });
}
//# sourceMappingURL=factory_native_course_v1.js.map