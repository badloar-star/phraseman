"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_OPENAI_TTS_VOICES = void 0;
exports.learningV2VoiceForSlot = learningV2VoiceForSlot;
exports.materializeLearningV2AudioGenerationInput = materializeLearningV2AudioGenerationInput;
exports.materializeLearningV2AudioGenerationVariants = materializeLearningV2AudioGenerationVariants;
exports.learningV2VoiceForPlayback = learningV2VoiceForPlayback;
exports.learningV2AudioDependencyFingerprint = learningV2AudioDependencyFingerprint;
exports.learningV2AudioNeedsRegeneration = learningV2AudioNeedsRegeneration;
exports.validateLearningV2GeneratedSessionIntro = validateLearningV2GeneratedSessionIntro;
const decision_registry_1 = require("../policies/decision_registry");
const generator_course_contract_1 = require("./generator_course_contract");
/** The only voices the Learning V2 content generator may assign. */
exports.LEARNING_V2_OPENAI_TTS_VOICES = Object.freeze([
    'ash',
    'onyx',
    'nova',
    'coral',
]);
const clean = (value, field, max) => {
    const normalized = value.trim();
    if (!normalized || normalized.length > max)
        throw new Error(`learning_v2_generator_${field}_invalid`);
    return normalized;
};
function learningV2VoiceForSlot(input) {
    if (!Number.isSafeInteger(input.episodeOrdinal) ||
        input.episodeOrdinal < 1 ||
        input.episodeOrdinal > 32 ||
        !Number.isSafeInteger(input.slotOrdinal) ||
        input.slotOrdinal < 1 ||
        input.slotOrdinal > 10000) {
        throw new Error('learning_v2_generator_voice_slot_invalid');
    }
    const characterId = input.characterId == null
        ? null
        : clean(input.characterId, 'character_id', 96);
    // A named character keeps one voice across every scene. Narration/non-dialogue
    // rotates predictably, so rerunning the generator never changes voices at random.
    if (!characterId) {
        return exports.LEARNING_V2_OPENAI_TTS_VOICES[(input.episodeOrdinal + input.slotOrdinal - 2) %
            exports.LEARNING_V2_OPENAI_TTS_VOICES.length];
    }
    const seed = (0, decision_registry_1.hashCanonicalBody)({
        schemaVersion: 'learning-v2-character-voice-seed.v1',
        characterId,
    });
    return exports.LEARNING_V2_OPENAI_TTS_VOICES[Number.parseInt(seed.slice(0, 8), 16) % exports.LEARNING_V2_OPENAI_TTS_VOICES.length];
}
function materializeLearningV2AudioGenerationInput(input) {
    const voice = learningV2VoiceForSlot(input);
    const variantOrdinal = (exports.LEARNING_V2_OPENAI_TTS_VOICES.indexOf(voice) + 1);
    const speed = input.speed ?? 1;
    if (!Number.isFinite(speed) || speed < 0.7 || speed > 1.2)
        throw new Error('learning_v2_generator_audio_speed_invalid');
    return Object.freeze({
        schemaVersion: 'learning-v2-openai-tts-input.v1',
        contentItemId: clean(input.contentItemId, 'content_item_id', 128),
        language: clean(input.language, 'audio_language', 24),
        inputText: clean(input.inputText, 'audio_text', 1000),
        characterId: input.characterId == null
            ? null
            : clean(input.characterId, 'character_id', 96),
        episodeOrdinal: input.episodeOrdinal,
        slotOrdinal: input.slotOrdinal,
        provider: 'openai',
        endpoint: '/v1/audio/speech',
        model: 'gpt-4o-mini-tts',
        voice,
        variantOrdinal,
        instructions: clean(input.instructions, 'audio_instructions', 800),
        speed,
        format: 'mp3',
        pipelineVersion: 1,
    });
}
function materializeLearningV2AudioGenerationVariants(input) {
    const base = materializeLearningV2AudioGenerationInput(input);
    return Object.freeze(exports.LEARNING_V2_OPENAI_TTS_VOICES.map((voice, index) => Object.freeze({
        ...base,
        voice,
        variantOrdinal: (index + 1),
    })));
}
/** Pure round-robin selector; callers own the bounded per-player play ordinal. */
function learningV2VoiceForPlayback(playbackOrdinal) {
    if (!Number.isSafeInteger(playbackOrdinal) || playbackOrdinal < 0)
        throw new Error('learning_v2_audio_playback_ordinal_invalid');
    return exports.LEARNING_V2_OPENAI_TTS_VOICES[playbackOrdinal % exports.LEARNING_V2_OPENAI_TTS_VOICES.length];
}
function learningV2AudioDependencyFingerprint(input) {
    return (0, decision_registry_1.hashCanonicalBody)(input);
}
function learningV2AudioNeedsRegeneration(expected, receipt) {
    if (!receipt)
        return true;
    return (receipt.dependencyFingerprint !==
        learningV2AudioDependencyFingerprint(expected) ||
        !/^[a-f0-9]{64}$/.test(receipt.assetSha256) ||
        !Number.isSafeInteger(receipt.assetBytes) ||
        receipt.assetBytes < 1);
}
function validateLearningV2GeneratedSessionIntro(input) {
    clean(input.sessionTemplateId, 'session_template_id', 128);
    (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(input.titleByLocale, 'intro_title');
    (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(input.summaryByLocale, 'intro_summary');
    (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(input.learningGoalByLocale, 'intro_goal');
    if (input.schemaVersion !== 'learning-v2-generated-session-intro.v3' ||
        input.pages.length !== 3 ||
        input.practiceStartSlot !== 4 ||
        input.slotPresentationPolicy !==
            'slots_1_2_3_embedded_in_intro_pages_not_repeated') {
        throw new Error('learning_v2_generator_intro_invalid');
    }
    const pageIds = new Set();
    const ids = new Set();
    const slots = new Set();
    for (let index = 0; index < input.pages.length; index += 1) {
        const page = input.pages[index];
        if (page.pageOrdinal !== index + 1)
            throw new Error('learning_v2_generator_intro_page_order_invalid');
        const pageId = clean(page.pageId, 'intro_page_id', 128);
        if (pageIds.has(pageId))
            throw new Error('learning_v2_generator_intro_page_duplicate');
        pageIds.add(pageId);
        (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(page.titleByLocale, 'intro_page_title');
        (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(page.bodyByLocale, 'intro_page_body');
        const question = page.question;
        const id = clean(question.questionId, 'intro_question_id', 128);
        if (ids.has(id))
            throw new Error('learning_v2_generator_intro_question_duplicate');
        ids.add(id);
        if (question.requiredTaskSlot !== index + 1 ||
            slots.has(question.requiredTaskSlot))
            throw new Error('learning_v2_generator_intro_star_slot_invalid');
        slots.add(question.requiredTaskSlot);
        (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(question.promptByLocale, 'intro_question_prompt');
        (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(question.choicesByLocale, 'intro_question_choices');
        if (Object.values(question.choicesByLocale).some((choices) => choices.length !== 3 ||
            choices.some((choice) => !choice.trim()) ||
            new Set(choices).size !== 3)) {
            throw new Error('learning_v2_generator_intro_choices_invalid');
        }
        if (![0, 1, 2].includes(question.correctChoiceIndex))
            throw new Error('learning_v2_generator_intro_answer_invalid');
        (0, generator_course_contract_1.assertLearningV2LocalizedEnvelope)(question.explanationByLocale, 'intro_question_explanation');
    }
    if (slots.size !== 3)
        throw new Error('learning_v2_generator_intro_star_slot_invalid');
    return input;
}
//# sourceMappingURL=generator_session_contract.js.map