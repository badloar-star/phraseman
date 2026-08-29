"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LESSON1_SESSION_04_MODE_NATIVE_PLAN_ID_V1 = exports.LESSON1_SESSION_03_MODE_NATIVE_PLAN_ID_V1 = exports.LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1 = exports.LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1 = void 0;
exports.inferLesson1WordFirstVocabularyCountV1 = inferLesson1WordFirstVocabularyCountV1;
exports.inferLesson1WordFirstPhraseCountV1 = inferLesson1WordFirstPhraseCountV1;
exports.lesson1SessionChoreographyV1 = lesson1SessionChoreographyV1;
const episode_01_session_map_v1_1 = require("./episode_01_session_map_v1");
exports.LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1 = 'en-e01-s01-mode-native-v1';
exports.LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1 = 'en-e01-s02-mode-native-v1';
exports.LESSON1_SESSION_03_MODE_NATIVE_PLAN_ID_V1 = 'en-e01-s03-mode-native-v1';
exports.LESSON1_SESSION_04_MODE_NATIVE_PLAN_ID_V1 = 'en-e01-s04-mode-native-v1';
function session01ModeNativeStepsV1() {
    return [
        { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
        { family: 'listen_build_dictation', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'recognize' },
        { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'recognize' },
        { family: 'listen_build_dictation', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'recognize' },
        { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
        { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'retrieve_meaning' },
        { family: 'phrase_builder', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'retrieve_meaning' },
        { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'retrieve_meaning' },
        { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'build_form' },
        { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
        { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'build_form' },
        { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'build_form' },
        { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0, 1, 2, 3], learningStage: 'apply_in_phrase' },
        { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
        { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
        { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
        { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    ];
}
/** Exact choreography paired with EPISODE_01_SESSION_02_MODE_NATIVE_PRACTICE_V1. */
function session02ModeNativeStepsV1() {
    return [
        { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
        { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'recognize' },
        { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'recognize' },
        { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'recognize' },
        { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'retrieve_meaning' },
        { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'retrieve_meaning' },
        { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'retrieve_meaning' },
        { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
        { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
        { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'build_form' },
        { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'build_form' },
        { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 3, learningStage: 'build_form' },
        { family: 'speed_match', purpose: 'near_transfer', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0, 1, 2, 3], learningStage: 'apply_in_phrase' },
        { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
        { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
        { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
        { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'speak_with_model' },
    ];
}
/** Exact contraction-first choreography for the owner-authored English session 3. */
function session03ModeNativeStepsV1() {
    return [
        { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
        { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
        { family: 'phrase_builder', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
        { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
        { family: 'scripted_repeat_compare', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'speak_with_model' },
        { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
        { family: 'speed_match', purpose: 'retrieval_practice', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [], learningStage: 'apply_in_phrase' },
        { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
        { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
        { family: 'listen_build_dictation', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
        { family: 'scripted_repeat_compare', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
        { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'apply_in_phrase' },
        { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
        { family: 'context_gap_grammar', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
        { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
        { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'speak_with_model' },
        { family: 'listen_choose', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
    ];
}
/** Three fresh state words first, then affirmative transfer with known I am / I’m. */
function session04ModeNativeStepsV1() {
    return [
        { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'recognize' },
        { family: 'scripted_repeat_compare', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'recognize' },
        { family: 'listen_choose', purpose: 'supported_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'recognize' },
        { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'retrieve_meaning' },
        { family: 'listen_choose', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'retrieve_meaning' },
        { family: 'context_gap_grammar', purpose: 'retrieval_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'retrieve_meaning' },
        { family: 'scripted_repeat_compare', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 0, learningStage: 'build_form' },
        { family: 'context_gap_grammar', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 1, learningStage: 'build_form' },
        { family: 'scripted_repeat_compare', purpose: 'guided_practice', targetKind: 'vocabulary', sourceVocabularyIndex: 2, learningStage: 'build_form' },
        { family: 'listen_build_dictation', purpose: 'guided_practice', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'apply_in_phrase' },
        { family: 'scripted_repeat_compare', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 1, learningStage: 'speak_with_model' },
        { family: 'listen_choose', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 2, learningStage: 'apply_in_phrase' },
        { family: 'phrase_builder', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 3, learningStage: 'apply_in_phrase' },
        { family: 'context_gap_grammar', purpose: 'near_transfer', targetKind: 'phrase', sourcePhraseIndex: 4, learningStage: 'apply_in_phrase' },
        { family: 'listen_build_dictation', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 5, learningStage: 'apply_in_phrase' },
        { family: 'speed_match', purpose: 'independent_check', targetKind: 'vocabulary_grid', sourceVocabularyIndices: [0, 1, 2], learningStage: 'apply_in_phrase' },
        { family: 'scripted_repeat_compare', purpose: 'independent_check', targetKind: 'phrase', sourcePhraseIndex: 0, learningStage: 'speak_with_model' },
    ];
}
/**
 * Published shards do not carry authoring-only `targetKind`. A word-first
 * shard is nevertheless self-describing: its 1–5 standalone targets appear
 * once in each of the three ordered contact stages before any phrase task.
 */
function inferLesson1WordFirstVocabularyCountV1(targetTexts) {
    // Word-first shards reserve slots 1-3 for the three intro questions. Their
    // standalone contacts therefore begin at slot 4 inside the 20-slot rapid
    // profile instead of being silently consumed by the intro.
    if (targetTexts.length !== 20)
        return 0;
    const practiceTargets = targetTexts.slice(3);
    for (let count = 1; count <= 5; count += 1) {
        const first = practiceTargets.slice(0, count);
        if (first.length === count &&
            first.every((target) => target.trim().length > 0 && !/\s/u.test(target.trim())) &&
            new Set(practiceTargets.slice(count, count * 2)).size === count &&
            practiceTargets.slice(count, count * 2).every((target) => first.includes(target)) &&
            new Set(practiceTargets.slice(count * 2, count * 3)).size === count &&
            practiceTargets.slice(count * 2, count * 3).every((target) => first.includes(target)))
            return count;
    }
    return 0;
}
/**
 * Reconstructs the authored phrase inventory from a published word-first
 * shard. Slots 1-3 are intro checks and every new word occupies three
 * standalone contacts, so only the remaining application targets count.
 */
function inferLesson1WordFirstPhraseCountV1(targetTexts, vocabularyCount) {
    if (vocabularyCount === 0)
        return 1;
    const phraseApplicationStart = 3 + vocabularyCount * 3;
    return Math.max(1, new Set(targetTexts
        .slice(phraseApplicationStart)
        .map((target) => target.normalize('NFC').trim())
        .filter(Boolean)).size);
}
const introSteps = (phraseCount = 15) => [0, 1, 2].map((sourcePhraseIndex) => ({
    family: 'phrase_builder',
    purpose: 'intro_check',
    targetKind: 'phrase',
    sourcePhraseIndex: sourcePhraseIndex % phraseCount,
    learningStage: 'intro_check',
}));
function legacyWordsThenPhrasesSteps() {
    const contacts = [];
    const stages = [
        ['listen_choose', 'supported_practice', 'recognize'],
        ['speed_match', 'retrieval_practice', 'retrieve_meaning'],
        ['phrase_builder', 'guided_practice', 'build_form'],
        ['context_gap_grammar', 'near_transfer', 'apply_in_phrase'],
    ];
    for (const [family, purpose, learningStage] of stages) {
        for (let sourcePhraseIndex = 0; sourcePhraseIndex < 4; sourcePhraseIndex += 1) {
            contacts.push({
                family,
                purpose,
                targetKind: 'phrase',
                sourcePhraseIndex,
                learningStage,
            });
        }
    }
    contacts.push({
        family: 'phrase_builder',
        purpose: 'independent_check',
        targetKind: 'phrase',
        sourcePhraseIndex: 4,
        learningStage: 'independent_assessment',
    });
    return contacts;
}
function wordsThenPhrasesSteps(vocabularyCount, phraseCount) {
    if (!Number.isInteger(vocabularyCount) || vocabularyCount < 1 || vocabularyCount > 5)
        throw new Error('lesson1_word_first_vocabulary_count_invalid');
    if (!Number.isInteger(phraseCount) || phraseCount < 1)
        throw new Error('lesson1_word_first_phrase_count_invalid');
    const contactStages = [
        ['listen_choose', 'supported_practice', 'recognize'],
        ['speed_match', 'retrieval_practice', 'retrieve_meaning'],
        ['context_gap_grammar', 'guided_practice', 'build_form'],
    ];
    const contacts = contactStages.flatMap(([family, purpose, learningStage]) => Array.from({ length: vocabularyCount }, (_, sourceVocabularyIndex) => ({
        family,
        purpose,
        targetKind: 'vocabulary',
        sourceVocabularyIndex,
        learningStage,
    })));
    const ordinaryPhraseFamilies = [
        'phrase_builder',
        'listen_choose',
        'context_gap_grammar',
        'listen_build_dictation',
        'speed_match',
    ];
    const extendedPhraseFamilies = [
        ...ordinaryPhraseFamilies,
        'sound_contrast',
        'scripted_repeat_compare',
    ];
    const phraseInteractionCount = 17 - contacts.length;
    if (phraseInteractionCount < 2)
        throw new Error('lesson1_word_first_phrase_application_budget_invalid');
    const ordinaryPairs = Array.from({ length: phraseInteractionCount }, (_, index) => ({
        sourcePhraseIndex: index % phraseCount,
        family: ordinaryPhraseFamilies[index % ordinaryPhraseFamilies.length],
    }));
    const ordinaryPairKeys = ordinaryPairs.map(({ sourcePhraseIndex, family }) => `${sourcePhraseIndex}\u0000${family}`);
    const ordinarySequenceRepeats = new Set(ordinaryPairKeys).size !== ordinaryPairKeys.length;
    const phraseFamilies = ordinarySequenceRepeats
        ? extendedPhraseFamilies
        : ordinaryPhraseFamilies;
    if (phraseInteractionCount > phraseCount * phraseFamilies.length) {
        throw new Error('lesson1_word_first_unique_target_family_budget_invalid');
    }
    const applications = Array.from({ length: phraseInteractionCount }, (_, index) => {
        const sourcePhraseIndex = index % phraseCount;
        const familyRound = Math.floor(index / phraseCount);
        return {
            family: ordinarySequenceRepeats
                ? phraseFamilies[(sourcePhraseIndex + familyRound) % phraseFamilies.length]
                : ordinaryPairs[index].family,
            purpose: index < 2
                ? 'guided_practice'
                : index < phraseInteractionCount - 2
                    ? 'near_transfer'
                    : 'independent_check',
            targetKind: 'phrase',
            sourcePhraseIndex,
            learningStage: 'apply_in_phrase',
        };
    });
    return [...contacts, ...applications];
}
function phraseSteps() {
    const families = [
        'listen_choose',
        'phrase_builder',
        'context_gap_grammar',
        'listen_choose',
        'phrase_builder',
        'context_gap_grammar',
        'speed_match',
        'phrase_builder',
        'listen_build_dictation',
        'context_gap_grammar',
        'listen_build_dictation',
        'phrase_builder',
    ];
    const purposes = [
        'supported_practice',
        'supported_practice',
        'guided_practice',
        'guided_practice',
        'retrieval_practice',
        'retrieval_practice',
        'retrieval_practice',
        'near_transfer',
        'near_transfer',
        'independent_check',
        'delayed_review',
        'independent_check',
    ];
    return families.map((family, index) => ({
        family,
        purpose: purposes[index],
        targetKind: 'phrase',
        sourcePhraseIndex: index + 3,
        learningStage: index < 4
            ? 'guided_phrase'
            : index < 9
                ? 'retrieve_phrase'
                : 'independent_assessment',
    }));
}
function voiceSteps() {
    const families = [
        'listen_choose',
        'sound_contrast',
        'scripted_repeat_compare',
        'scripted_repeat_compare',
        'listen_build_dictation',
        'scripted_repeat_compare',
        'sound_contrast',
        'scripted_repeat_compare',
        'listen_choose',
    ];
    return families.map((family, index) => ({
        family,
        purpose: index < 2
            ? 'retrieval_practice'
            : index < 6
                ? 'near_transfer'
                : 'independent_check',
        targetKind: 'phrase',
        sourcePhraseIndex: index + 3,
        learningStage: index < 6 ? 'speak_with_model' : 'speak_independently',
    }));
}
function recallSteps() {
    const families = [
        'speed_match',
        'listen_build_dictation',
        'phrase_builder',
        'context_gap_grammar',
        'speed_match',
        'listen_build_dictation',
        'phrase_builder',
        'context_gap_grammar',
        'speed_match',
        'listen_build_dictation',
        'phrase_builder',
        'speed_match',
    ];
    return families.map((family, index) => ({
        family,
        purpose: index < 6
            ? 'retrieval_practice'
            : index < 9
                ? 'delayed_review'
                : 'independent_check',
        targetKind: 'phrase',
        sourcePhraseIndex: index + 3,
        learningStage: index < 9 ? 'delayed_recall' : 'independent_assessment',
    }));
}
function checkpointSteps() {
    const families = [
        'speed_match',
        'listen_build_dictation',
        'context_gap_grammar',
        'phrase_builder',
        'listen_build_dictation',
        'context_gap_grammar',
        'phrase_builder',
        'speed_match',
        'listen_build_dictation',
        'context_gap_grammar',
        'phrase_builder',
        'speed_match',
    ];
    return families.map((family, index) => ({
        family,
        purpose: index < 4
            ? 'retrieval_practice'
            : index < 8
                ? 'near_transfer'
                : 'independent_check',
        targetKind: 'phrase',
        sourcePhraseIndex: index + 3,
        learningStage: 'independent_assessment',
    }));
}
function practiceSteps(kind) {
    if (kind === 'words_then_phrases')
        return legacyWordsThenPhrasesSteps();
    if (kind === 'voice')
        return voiceSteps();
    if (kind === 'recall')
        return recallSteps();
    if (kind === 'checkpoint')
        return checkpointSteps();
    return phraseSteps();
}
function kindMayIntroduceVocabulary(kind) {
    return kind !== 'voice' && kind !== 'recall' && kind !== 'checkpoint';
}
function profileFor(kind, vocabularyCount = 0) {
    if (vocabularyCount > 0 && kindMayIntroduceVocabulary(kind))
        return 'rapid';
    if (kind === 'words_then_phrases' || kind === 'irregular_verbs' || kind === 'prepositions') {
        return 'rapid';
    }
    if (kind === 'voice')
        return 'voice_heavy';
    return 'standard';
}
function supportFor(ordinal, kind) {
    if (kind === 'checkpoint' || kind === 'recall') {
        return { zone: 'master', support: 'none', promptNovelty: 'novel' };
    }
    if (kind === 'voice') {
        return { zone: 'master', support: 'visual_only', promptNovelty: 'varied' };
    }
    const position = ((ordinal - 1) % 8) + 1;
    if (position <= 3) {
        const support = position === 1 ? 'model' : position === 2 ? 'full_text' : 'partial_cue';
        return { zone: 'understand', support, promptNovelty: 'trained' };
    }
    if (position <= 6) {
        return {
            zone: 'use',
            support: position === 6 ? 'visual_only' : 'partial_cue',
            promptNovelty: 'varied',
        };
    }
    return { zone: 'master', support: 'visual_only', promptNovelty: 'novel' };
}
/**
 * Обратная совместимость: английский конвейер продолжает вызывать эту
 * функцию без второго аргумента и получает kind из английской карты,
 * байт в байт как раньше.
 */
function lesson1SessionChoreographyV1(sessionOrdinal, kindOverride, vocabularyCount = 0, phraseCount = 15, modeNativePlanId) {
    const kind = kindOverride ?? episode_01_session_map_v1_1.EPISODE_01_SESSION_MAP_V1[sessionOrdinal - 1]?.kind;
    if (!kind)
        throw new Error('lesson1_session_choreography_ordinal_invalid');
    const support = supportFor(sessionOrdinal, kind);
    return Object.freeze({
        sessionOrdinal,
        kind,
        interactionProfile: profileFor(kind, vocabularyCount),
        ...support,
        steps: Object.freeze(modeNativePlanId === exports.LESSON1_SESSION_01_MODE_NATIVE_PLAN_ID_V1
            ? [...introSteps(phraseCount), ...session01ModeNativeStepsV1()]
            : modeNativePlanId === exports.LESSON1_SESSION_02_MODE_NATIVE_PLAN_ID_V1
                ? [...introSteps(phraseCount), ...session02ModeNativeStepsV1()]
                : modeNativePlanId === exports.LESSON1_SESSION_03_MODE_NATIVE_PLAN_ID_V1
                    ? [...introSteps(phraseCount), ...session03ModeNativeStepsV1()]
                    : modeNativePlanId === exports.LESSON1_SESSION_04_MODE_NATIVE_PLAN_ID_V1
                        ? [...introSteps(phraseCount), ...session04ModeNativeStepsV1()]
                        : vocabularyCount > 0 && kindMayIntroduceVocabulary(kind)
                            ? [...introSteps(phraseCount), ...wordsThenPhrasesSteps(vocabularyCount, phraseCount)]
                            : [...introSteps(), ...practiceSteps(kind)]),
    });
}
//# sourceMappingURL=lesson1_session_choreography_v1.js.map