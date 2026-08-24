"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_SESSION_CARD_PURPOSES = void 0;
exports.learningV2GeneratedMeaningSourceHash = learningV2GeneratedMeaningSourceHash;
exports.validateLearningV2GeneratedSessionShardV1 = validateLearningV2GeneratedSessionShardV1;
exports.learningV2GeneratedSessionShardFingerprint = learningV2GeneratedSessionShardFingerprint;
const decision_registry_1 = require("../policies/decision_registry");
const content_item_1 = require("./content_item");
const generator_course_contract_1 = require("./generator_course_contract");
const generator_session_contract_1 = require("./generator_session_contract");
const course_topology_v1_1 = require("./course_topology_v1");
const lesson1_session_choreography_v1_1 = require("./source/lesson1_session_choreography_v1");
/**
 * Назначение каждой карточки по её месту в сессии. Кривая нагрузки:
 * проверка после интро → практика с опорой → практика с подсказкой →
 * извлечение из памяти → перенос → самостоятельная проверка.
 *
 * зачем 15, а не 12 (владелец, 2026-08-17): контракт пакета сессии требует
 * 14–18 заданий в профиле standard, а 12 карточек давали ровно 12 заданий —
 * публикация падала. Владелец выбрал привести содержание к контракту.
 * Три добавленных слота продолжают ту же кривую: закрепить (retrieval),
 * применить в новом окружении (near_transfer), проверить себя без опоры.
 */
exports.LEARNING_V2_SESSION_CARD_PURPOSES = Object.freeze([
    'intro_check',
    'intro_check',
    'intro_check',
    'supported_practice',
    'supported_practice',
    'guided_practice',
    'guided_practice',
    'retrieval_practice',
    'near_transfer',
    'independent_check',
    'delayed_review',
    'independent_check',
    'retrieval_practice',
    'near_transfer',
    'independent_check',
]);
const TOP_KEYS = Object.freeze([
    'schemaVersion',
    'packageId',
    'targetLanguage',
    'episodeOrdinal',
    'requiredSessionOrdinal',
    'episodeId',
    'sessionId',
    'sessionTemplateId',
    'canDoOutcomeId',
    'zone',
    'support',
    'generationInputFingerprint',
    'interfaceLocales',
    'contentKinds',
    'intro',
    'cards',
]);
const CARD_KEYS = Object.freeze([
    'cardId',
    'taskSlot',
    'purpose',
    'activityId',
    'family',
    'learningFunction',
    'support',
    'promptNovelty',
    'promptId',
    'introQuestionId',
    'contentItem',
    'instructionByLocale',
    'hintByLocale',
    'successMessageByLocale',
    'retryMessageByLocale',
    'errorExplanationByLocale',
    'accessibilityLabelByLocale',
    'audioScript',
]);
const AUDIO_KEYS = Object.freeze([
    'contentItemId',
    'language',
    'inputText',
    'characterId',
    'instructions',
]);
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LANGUAGE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const HASH_RE = /^[a-f0-9]{64}$/;
const MAX_SESSION_SHARD_BYTES = 512 * 1024;
const AUDIO_FAMILIES = new Set([
    'listen_choose',
    'sound_contrast',
    'listen_build_dictation',
    'scripted_repeat_compare',
]);
const FAMILY_FUNCTION = Object.freeze({
    visual_discovery: 'notice',
    listen_choose: 'comprehend',
    sound_contrast: 'discriminate',
    sound_syllable_lab: 'discriminate',
    scripted_repeat_compare: 'pronounce',
    phrase_builder: 'assemble',
    listen_build_dictation: 'assemble',
    context_gap_grammar: 'retrieve',
    quick_spoken_response: 'respond',
    shadowing_prosody: 'pronounce',
    describe_scene: 'notice',
    microstory_radio: 'comprehend',
    branching_scene: 'transfer',
    scripted_dialogue: 'transfer',
    personalized_review: 'review',
    speed_match: 'retrieve',
});
function exactKeys(value, expected, code) {
    const keys = Object.keys(value);
    if (keys.length !== expected.length ||
        keys.some((key) => !expected.includes(key)))
        throw new Error(code);
}
function exactTuple(value, expected, code) {
    if (!Array.isArray(value) ||
        value.length !== expected.length ||
        value.some((item, index) => item !== expected[index]))
        throw new Error(code);
}
function clean(value, code, max = 320) {
    if (typeof value !== 'string' || !value.trim() || value.length > max)
        throw new Error(code);
    return value.trim();
}
function pad(value) {
    return String(value).padStart(2, '0');
}
function assertExpected(expected) {
    if (!TOKEN_RE.test(expected.packageId) ||
        !LANGUAGE_RE.test(expected.targetLanguage) ||
        !Number.isSafeInteger(expected.episodeOrdinal) ||
        expected.episodeOrdinal < 1 ||
        expected.episodeOrdinal > 32 ||
        !Number.isSafeInteger(expected.requiredSessionOrdinal) ||
        expected.requiredSessionOrdinal < 1 ||
        expected.requiredSessionOrdinal > course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1 ||
        !HASH_RE.test(expected.generationInputFingerprint)) {
        throw new Error('learning_v2_session_shard_expected_invalid');
    }
}
function learningV2GeneratedMeaningSourceHash(input) {
    return (0, decision_registry_1.hashCanonicalBody)(Object.freeze({
        schemaVersion: 'learning-v2-generated-meaning-source.v1',
        ...input,
    }));
}
function validateLocalizedCopy(value, field) {
    (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(value, field);
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES)
        clean(value[locale], `learning_v2_session_shard_${field}_invalid`, 1000);
}
function validateAudioScript(value, card, family, targetLanguage) {
    if (!AUDIO_FAMILIES.has(family)) {
        if (value !== null)
            throw new Error('learning_v2_session_shard_audio_unexpected');
        return;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value))
        throw new Error('learning_v2_session_shard_audio_required');
    const input = value;
    exactKeys(input, AUDIO_KEYS, 'learning_v2_session_shard_audio_invalid');
    if (input.contentItemId !== card.contentItemId ||
        input.language !== targetLanguage ||
        input.inputText !== card.target.text ||
        (input.characterId !== null &&
            (typeof input.characterId !== 'string' ||
                !TOKEN_RE.test(input.characterId)))) {
        throw new Error('learning_v2_session_shard_audio_invalid');
    }
    clean(input.instructions, 'learning_v2_session_shard_audio_invalid', 800);
}
function validateLearningV2GeneratedSessionShardV1(value, expected) {
    assertExpected(expected);
    let canonical;
    try {
        canonical = (0, decision_registry_1.canonicalJsonV1)(value);
    }
    catch {
        throw new Error('learning_v2_session_shard_json_invalid');
    }
    // ASCII length is a constant-memory first fence. The exact UTF-8 count runs
    // only after that, so a corrupt stored/provider value cannot allocate a huge
    // byte array before the 512 KiB limit is enforced.
    if (canonical.length > MAX_SESSION_SHARD_BYTES ||
        (0, decision_registry_1.utf8ByteLengthV1)(canonical) > MAX_SESSION_SHARD_BYTES) {
        throw new Error('learning_v2_session_shard_size_invalid');
    }
    let input;
    try {
        input = JSON.parse(JSON.stringify(value));
    }
    catch {
        throw new Error('learning_v2_session_shard_json_invalid');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('learning_v2_session_shard_invalid');
    exactKeys(input, TOP_KEYS, 'learning_v2_session_shard_fields_invalid');
    const episodeId = `episode-${pad(expected.episodeOrdinal)}`;
    const sessionId = `session-${episodeId}-${pad(expected.requiredSessionOrdinal)}`;
    const sessionTemplateId = `${episodeId}:session-${pad(expected.requiredSessionOrdinal)}`;
    const rawCardTargets = Array.isArray(input.cards)
        ? input.cards.map((raw) => {
            if (!raw || typeof raw !== 'object' || Array.isArray(raw))
                return '';
            const contentItem = raw.contentItem;
            if (!contentItem || typeof contentItem !== 'object' || Array.isArray(contentItem))
                return '';
            const target = contentItem.target;
            return target && typeof target === 'object' && !Array.isArray(target)
                ? String(target.text ?? '')
                : '';
        })
        : [];
    const vocabularyCount = (0, lesson1_session_choreography_v1_1.inferLesson1WordFirstVocabularyCountV1)(rawCardTargets);
    const phraseCount = (0, lesson1_session_choreography_v1_1.inferLesson1WordFirstPhraseCountV1)(rawCardTargets, vocabularyCount);
    const choreography = (0, lesson1_session_choreography_v1_1.lesson1SessionChoreographyV1)(expected.requiredSessionOrdinal, undefined, vocabularyCount, phraseCount);
    if (input.schemaVersion !== 'learning-v2-generated-session-shard.v1' ||
        input.packageId !== expected.packageId ||
        input.targetLanguage !== expected.targetLanguage ||
        input.episodeOrdinal !== expected.episodeOrdinal ||
        input.requiredSessionOrdinal !== expected.requiredSessionOrdinal ||
        input.episodeId !== episodeId ||
        input.sessionId !== sessionId ||
        input.sessionTemplateId !== sessionTemplateId ||
        typeof input.canDoOutcomeId !== 'string' ||
        !TOKEN_RE.test(input.canDoOutcomeId) ||
        input.zone !== choreography.zone ||
        input.support !== choreography.support ||
        input.generationInputFingerprint !== expected.generationInputFingerprint) {
        throw new Error('learning_v2_session_shard_identity_invalid');
    }
    exactTuple(input.interfaceLocales, generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES, 'learning_v2_session_shard_locales_invalid');
    exactTuple(input.contentKinds, generator_course_contract_1.LEARNING_V2_REQUIRED_CONTENT_KINDS, 'learning_v2_session_shard_content_kinds_invalid');
    const intro = (0, generator_session_contract_1.validateLearningV2GeneratedSessionIntro)(input.intro);
    if (intro.sessionTemplateId !== sessionTemplateId)
        throw new Error('learning_v2_session_shard_intro_identity_invalid');
    // Первые три карточки связывают три вопроса интро. В word-first rapid все
    // standalone-контакты начинаются только со слота 4 и остаются видимыми в
    // оставшихся 17 заданиях 20-слотового rapid-профиля.
    if (!Array.isArray(input.cards) ||
        input.cards.length !== choreography.steps.length)
        throw new Error('learning_v2_session_shard_cards_invalid');
    const cards = [];
    const contentIds = new Set();
    for (let index = 0; index < input.cards.length; index += 1) {
        const raw = input.cards[index];
        if (!raw || typeof raw !== 'object' || Array.isArray(raw))
            throw new Error('learning_v2_session_shard_card_invalid');
        const card = raw;
        exactKeys(card, CARD_KEYS, 'learning_v2_session_shard_card_fields_invalid');
        const slot = index + 1;
        const step = choreography.steps[index];
        if (!step)
            throw new Error('learning_v2_session_shard_card_invalid');
        const family = step.family;
        const contentItemId = `content-${episodeId}-s${pad(expected.requiredSessionOrdinal)}-${pad(slot)}`;
        const activityId = `activity-${episodeId}-s${pad(expected.requiredSessionOrdinal)}-${pad(slot)}-${family}`;
        if (card.cardId !==
            `card-${episodeId}-s${pad(expected.requiredSessionOrdinal)}-${pad(slot)}` ||
            card.taskSlot !== slot ||
            card.purpose !== step.purpose ||
            card.activityId !== activityId ||
            card.family !== family ||
            card.learningFunction !== FAMILY_FUNCTION[family] ||
            card.support !== choreography.support ||
            card.promptNovelty !== choreography.promptNovelty ||
            card.promptId !==
                `prompt-${episodeId}-${pad(expected.requiredSessionOrdinal)}-${pad(slot)}`) {
            throw new Error('learning_v2_session_shard_card_identity_invalid');
        }
        const introQuestionId = slot <= 3 ? intro.pages[slot - 1].question.questionId : null;
        if (card.introQuestionId !== introQuestionId)
            throw new Error('learning_v2_session_shard_intro_binding_invalid');
        const validated = (0, content_item_1.validateV2ContentItem)(card.contentItem);
        if (!validated.ok)
            throw new Error(`learning_v2_session_shard_content_item_invalid:${validated.issues.join(',')}`);
        const item = validated.value;
        if (item.contentItemId !== contentItemId ||
            item.episodeId !== episodeId ||
            item.target.locale !== expected.targetLanguage ||
            !item.objectiveIds.includes(input.canDoOutcomeId) ||
            !item.compatibleFamilies.includes(family) ||
            contentIds.has(item.contentItemId)) {
            throw new Error('learning_v2_session_shard_content_item_identity_invalid');
        }
        const previousContentIds = new Set(cards.map((previous) => previous.contentItem.contentItemId));
        if (item.prerequisiteContentItemIds.some((id) => !previousContentIds.has(id)))
            throw new Error('learning_v2_session_shard_prerequisite_invalid');
        if (item.learnerMeanings.length !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length ||
            item.learnerMeanings.some((meaning, localeIndex) => {
                const locale = generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES[localeIndex];
                return (meaning.locale !== locale ||
                    meaning.sourceHash !==
                        learningV2GeneratedMeaningSourceHash({
                            contentItemId: item.contentItemId,
                            targetLanguage: expected.targetLanguage,
                            targetText: item.target.text,
                            locale,
                            meaning: meaning.value,
                            generationInputFingerprint: expected.generationInputFingerprint,
                        }));
            }))
            throw new Error('learning_v2_session_shard_meanings_invalid');
        for (const field of [
            'instructionByLocale',
            'hintByLocale',
            'successMessageByLocale',
            'retryMessageByLocale',
            'errorExplanationByLocale',
            'accessibilityLabelByLocale',
        ]) {
            validateLocalizedCopy(card[field], field);
        }
        validateAudioScript(card.audioScript, item, family, expected.targetLanguage);
        contentIds.add(item.contentItemId);
        cards.push(Object.freeze({
            ...card,
            contentItem: item,
        }));
    }
    return Object.freeze({
        ...input,
        interfaceLocales: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES,
        contentKinds: generator_course_contract_1.LEARNING_V2_REQUIRED_CONTENT_KINDS,
        intro,
        cards: Object.freeze(cards),
    });
}
function learningV2GeneratedSessionShardFingerprint(value, expected) {
    return (0, decision_registry_1.hashCanonicalBody)(validateLearningV2GeneratedSessionShardV1(value, expected));
}
//# sourceMappingURL=generator_session_shard.js.map