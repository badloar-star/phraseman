"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.E1_DEMO_CAN_DO_OUTCOME_ID = exports.E1_DEMO_EPISODE_ID = void 0;
exports.buildE1DemoProfile = buildE1DemoProfile;
exports.buildE1DemoItems = buildE1DemoItems;
exports.buildE1DemoActivityBindings = buildE1DemoActivityBindings;
// зачем: владелец хочет тестировать ВСЕ режимы Learning V2 прямо в приложении до
// готовности прод-контента. Это демо-банк E1 (тот же состав, что в тестовой фикстуре
// e1-content-source.json): данные прогоняются через НАСТОЯЩИЕ валидаторы, чтобы
// лаборатория показывала ровно то, что примет компилятор. Никакой сети, ноль Firestore.
const language_profile_1 = require("./language_profile");
const content_item_1 = require("./content_item");
const DEMO_SEEDS = [
    { suffix: 'introduce-name-01', text: 'I am Anna.', meaning: 'Я Анна.', accepted: ['I am Anna.', "I'm Anna."], rejectedValue: 'I Anna.', reasonCode: 'copula_missing', features: ['copula_be', 'first_person_singular'] },
    { suffix: 'introduce-you-02', text: 'You are Tom.', meaning: 'Ты Том.', accepted: ['You are Tom.', "You're Tom."], rejectedValue: 'You Tom.', reasonCode: 'copula_missing', features: ['copula_be', 'second_person_singular'] },
    { suffix: 'origin-city-03', text: 'I am from Madrid.', meaning: 'Я из Мадрида.', accepted: ['I am from Madrid.', "I'm from Madrid."], rejectedValue: 'I from Madrid.', reasonCode: 'copula_missing', features: ['copula_be', 'preposition_from'] },
    { suffix: 'greeting-04', text: 'Nice to meet you.', meaning: 'Приятно познакомиться.', accepted: ['Nice to meet you.'], rejectedValue: 'Nice meet you.', reasonCode: 'infinitive_marker_missing', features: ['fixed_expression'] },
    { suffix: 'name-question-05', text: 'What is your name?', meaning: 'Как тебя зовут?', accepted: ['What is your name?', "What's your name?"], rejectedValue: 'What your name?', reasonCode: 'copula_missing', features: ['question_word', 'copula_be'] },
    { suffix: 'origin-question-06', text: 'Where are you from?', meaning: 'Откуда ты?', accepted: ['Where are you from?'], rejectedValue: 'Where you from?', reasonCode: 'copula_missing', features: ['question_word', 'preposition_from'] },
    { suffix: 'she-name-07', text: 'She is Maria.', meaning: 'Она Мария.', accepted: ['She is Maria.', "She's Maria."], rejectedValue: 'She Maria.', reasonCode: 'copula_missing', features: ['copula_be', 'third_person_singular'] },
    { suffix: 'he-origin-08', text: 'He is from Japan.', meaning: 'Он из Японии.', accepted: ['He is from Japan.', "He's from Japan."], rejectedValue: 'He from Japan.', reasonCode: 'copula_missing', features: ['copula_be', 'third_person_singular', 'preposition_from'] },
    { suffix: 'greeting-hello-09', text: 'Hello, I am new here.', meaning: 'Привет, я здесь новенький.', accepted: ['Hello, I am new here.', "Hello, I'm new here."], rejectedValue: 'Hello, I new here.', reasonCode: 'copula_missing', features: ['copula_be', 'greeting'] },
    { suffix: 'polite-repeat-10', text: 'Sorry, can you repeat that?', meaning: 'Извините, можете повторить?', accepted: ['Sorry, can you repeat that?'], rejectedValue: 'Sorry, you repeat that?', reasonCode: 'modal_missing', features: ['modal_can', 'question'] },
];
// зачем: ротация покрытия семей — как в тестовых билдерах: у каждой сессии всегда
// есть выбор ≥3 семей при полном банке.
const FAMILY_ROTATION = [
    ['listen_choose', 'phrase_builder', 'quick_spoken_response', 'speed_match', 'scripted_dialogue'],
    ['listen_choose', 'sound_contrast', 'context_gap_grammar', 'listen_build_dictation', 'shadowing_prosody'],
    ['phrase_builder', 'speed_match', 'quick_spoken_response', 'scripted_repeat_compare', 'scripted_dialogue'],
    ['listen_choose', 'phrase_builder', 'listen_build_dictation', 'context_gap_grammar', 'shadowing_prosody'],
    ['sound_contrast', 'speed_match', 'quick_spoken_response', 'scripted_repeat_compare', 'scripted_dialogue'],
];
exports.E1_DEMO_EPISODE_ID = 'ep-01';
exports.E1_DEMO_CAN_DO_OUTCOME_ID = 'obj-introduce-self';
let cachedProfile = null;
let cachedItems = null;
let cachedActivityBindings = null;
function buildE1DemoProfile() {
    if (cachedProfile)
        return cachedProfile;
    const result = (0, language_profile_1.validateV2LanguageProfile)({
        schemaVersion: 'v2-language-profile-body.v1',
        profileId: 'english-general-a1',
        version: 1,
        targetLanguage: 'en',
        script: { system: 'latin', direction: 'ltr', tokenization: 'space_delimited', joiningBehavior: 'none' },
        grammar: {
            dominantWordOrders: ['svo'],
            morphology: 'mixed',
            grammaticalFeatures: ['person', 'number', 'tense'],
            registerFeatures: ['neutral', 'formal', 'informal'],
        },
        speech: { lexicalTone: false, stressSystem: 'lexical', ttsLocales: ['en-US', 'en-GB'], sttLocales: ['en-US', 'en-GB'] },
        scriptCurricula: [],
        supportedActivityFamilies: [
            'listen_choose', 'sound_contrast', 'speed_match', 'phrase_builder', 'listen_build_dictation',
            'context_gap_grammar', 'quick_spoken_response', 'shadowing_prosody', 'scripted_repeat_compare', 'scripted_dialogue',
        ],
    });
    if (!result.ok)
        throw new Error(`e1_demo_profile_invalid: ${result.issues.join(',')}`);
    cachedProfile = result.value;
    return result.value;
}
function buildE1DemoItems() {
    if (cachedItems)
        return cachedItems;
    const items = DEMO_SEEDS.map((seed, index) => {
        const result = (0, content_item_1.validateV2ContentItem)({
            schemaVersion: 'v2-content-item.v1',
            contentItemId: `e1-${seed.suffix}`,
            episodeId: exports.E1_DEMO_EPISODE_ID,
            intentId: 'introduce_self_name',
            target: { locale: 'en', text: seed.text, register: 'neutral', region: 'general' },
            learnerMeanings: [{ locale: 'ru', value: seed.meaning, sourceHash: 'a'.repeat(64) }],
            acceptedAnswers: [...seed.accepted],
            rejectedAnswers: [{ value: seed.rejectedValue, reasonCode: seed.reasonCode }],
            linguisticFeatures: [...seed.features],
            pronunciationTargets: [`stress_${index + 1}`],
            prerequisiteContentItemIds: [],
            objectiveIds: [exports.E1_DEMO_CAN_DO_OUTCOME_ID],
            compatibleFamilies: [...FAMILY_ROTATION[index % FAMILY_ROTATION.length]],
        });
        if (!result.ok)
            throw new Error(`e1_demo_item_invalid: ${result.issues.join(',')}`);
        return result.value;
    });
    cachedItems = Object.freeze(items);
    return cachedItems;
}
/** Authoring-source activity identities persisted with the E1 demo bank. */
function buildE1DemoActivityBindings() {
    if (cachedActivityBindings)
        return cachedActivityBindings;
    cachedActivityBindings = Object.freeze(buildE1DemoItems().flatMap((item) => item.compatibleFamilies.map((family) => Object.freeze({
        activityId: `activity-${family}-${item.contentItemId}`,
        family,
        contentUnitIds: Object.freeze([item.contentItemId]),
    }))));
    return cachedActivityBindings;
}
//# sourceMappingURL=e1_demo_bank.js.map