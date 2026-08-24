"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.materializeCompiledRequiredTaskAnswerKeys = void 0;
exports.compileV2EpisodeContent = compileV2EpisodeContent;
// зачем: адаптер Functions между утверждённым запросом генерации и чистым компилятором.
// Порядок жёсткий: (1) эпизод входит в запрос; (2) резолвер вернул РОВНО запрошенный
// ref профиля; (3) канонический hash резолвленного тела совпал с hash из ref —
// только после этого компиляция, шаблоны опциональной практики и блокирующий QA.
// Здесь НЕТ Firestore-чтений: резолвер инжектится вызывающим (тестируемость + стоимость).
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const session_compiler_1 = require("../../../modules/learning-v2/content/session_compiler");
const optional_practice_1 = require("../../../modules/learning-v2/content/optional_practice");
const language_profile_1 = require("../../../modules/learning-v2/content/language_profile");
const v2_episode_content_qa_1 = require("./v2_episode_content_qa");
const required_session_answer_verifier_1 = require("../learning_v2/required_session_answer_verifier");
const SERVER_VERIFIABLE_FAMILIES = new Set([
    'phrase_builder',
    'listen_choose',
    'sound_contrast',
    'listen_build_dictation',
    'context_gap_grammar',
    'speed_match',
]);
const expectedAnswerForCard = (family, item) => {
    if (family === 'listen_choose') {
        const meaning = item.learnerMeanings[0]?.value;
        if (!meaning)
            throw new Error('required_session_answer_source_missing');
        return meaning;
    }
    if (family === 'context_gap_grammar') {
        const tokens = item.target.text.replace(/[?.!,]/g, '').split(/\s+/).filter(Boolean);
        const answer = tokens[Math.min(1, tokens.length - 1)];
        if (!answer)
            throw new Error('required_session_answer_source_missing');
        return answer;
    }
    return item.target.text;
};
/**
 * Derives answer fingerprints from the same immutable content/card mapping as
 * the compiler. Raw answers are consumed here and are not stored in the key.
 */
const materializeCompiledRequiredTaskAnswerKeys = (compiled, contentItems) => {
    const items = new Map(contentItems.map((item) => [item.contentItemId, item]));
    const answerKeys = compiled.sessions.flatMap((session) => session.cards.flatMap((card) => {
        if (!SERVER_VERIFIABLE_FAMILIES.has(card.family)) {
            if (card.family !== 'scripted_repeat_compare') {
                throw new Error('required_session_answer_family_unsupported');
            }
            return [];
        }
        const item = items.get(card.contentItemId);
        if (!item || item.episodeId !== compiled.episodeId) {
            throw new Error('required_session_answer_source_missing');
        }
        const family = card.family;
        return [(0, required_session_answer_verifier_1.materializeRequiredSessionTaskAnswerKey)({
                taskId: card.cardId,
                activityId: card.activityId,
                family,
                expectedAnswer: expectedAnswerForCard(family, item),
            })];
    }));
    if (new Set(answerKeys.map((entry) => entry.taskId)).size !== answerKeys.length) {
        throw new Error('required_session_answer_key_duplicate');
    }
    return Object.freeze(answerKeys);
};
exports.materializeCompiledRequiredTaskAnswerKeys = materializeCompiledRequiredTaskAnswerKeys;
function deepFreeze(value) {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
async function compileV2EpisodeContent(input) {
    const { request, episodeId, canDoOutcomeId, contentItems, activityBindings, resolveLanguageProfile } = input;
    if (!request.episodeIds.includes(episodeId)) {
        throw new Error(`compilation_episode_not_requested: ${episodeId}`);
    }
    const resolved = await resolveLanguageProfile(request.languageProfileRef);
    const requested = request.languageProfileRef;
    if (resolved.ref.profileId !== requested.profileId
        || resolved.ref.version !== requested.version
        || resolved.ref.contentHash !== requested.contentHash) {
        throw new Error('language_profile_ref_mismatch');
    }
    // Профиль перепроверяется настоящим валидатором и его канонический hash обязан
    // совпасть с закреплённым в запросе — подмена тела после утверждения невозможна.
    const validated = (0, language_profile_1.validateV2LanguageProfile)(resolved.body);
    if (!validated.ok)
        throw new Error(`language_profile_body_invalid: ${validated.issues.join(',')}`);
    const actualHash = (0, decision_registry_1.hashCanonicalBody)(validated.value);
    if (actualHash !== requested.contentHash)
        throw new Error('language_profile_hash_mismatch');
    const compiled = (0, session_compiler_1.compileV2RequiredSessions)({
        episodeId,
        canDoOutcomeId,
        profile: validated.value,
        items: contentItems,
        activityBindings,
    });
    // Шаблоны опциональной практики консервативны: возможности устройства неизвестны
    // на этапе генерации, поэтому фильтров «нет микрофона/сети» здесь нет — рантайм
    // отфильтрует сам через selectOptionalPracticeSlots на устройстве.
    const optionalPracticeTemplates = (0, optional_practice_1.selectOptionalPracticeSlots)({
        episodeId,
        microphoneAvailable: true,
        networkAvailable: true,
        dueContentItemIds: [],
        mistakeContentItemIds: [],
        capabilities: [
            { capabilityId: 'quick-speak-v1', family: 'quick_spoken_response', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 75 },
            { capabilityId: 'echo-rhythm-v1', family: 'shadowing_prosody', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 90 },
        ].filter((capability) => validated.value.supportedActivityFamilies.includes(capability.family)),
    });
    const qualityReport = (0, v2_episode_content_qa_1.qaV2EpisodeContent)(compiled, contentItems, validated.value, activityBindings, optionalPracticeTemplates, requested);
    if (!qualityReport.ok) {
        throw new Error(`episode_content_qa_blocked: ${qualityReport.blockingIssues.join(',')}`);
    }
    const requiredTaskAnswerKeys = (0, exports.materializeCompiledRequiredTaskAnswerKeys)(compiled, contentItems);
    return deepFreeze({
        ...compiled,
        languageProfileRef: requested,
        optionalPracticeTemplates,
        requiredTaskAnswerKeys,
        qualityReport,
    });
}
//# sourceMappingURL=v2_content_compilation.js.map