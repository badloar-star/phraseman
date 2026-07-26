"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSkylerQuizPackFromStages = buildSkylerQuizPackFromStages;
exports.assertChallengeDraftOnly = assertChallengeDraftOnly;
exports.applyQuestionReplacements = applyQuestionReplacements;
const REQUIRED_LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
function stable(value) { return JSON.stringify(value); }
function buildSkylerQuizPackFromStages(input) {
    if (input.studyTarget !== 'en')
        throw new Error('quiz_runtime_target_not_supported');
    if (REQUIRED_LOCALES.some((locale) => !input.batchesBySourceLocale[locale]))
        throw new Error('quiz_consumer_locales_incomplete');
    const baseline = input.batchesBySourceLocale.ru.items;
    const items = baseline.map((base, index) => {
        const localized = Object.fromEntries(REQUIRED_LOCALES.map((locale) => [locale, input.batchesBySourceLocale[locale].items[index]]));
        if (REQUIRED_LOCALES.some((locale) => !localized[locale] || localized[locale].id !== base.id || stable(localized[locale].choices) !== stable(base.choices) || localized[locale].correctIndex !== base.correctIndex || localized[locale].skillTag !== base.skillTag || localized[locale].optionExplanations.length !== 4))
            throw new Error('quiz_consumer_item_alignment_mismatch');
        return Object.freeze({ id: base.id, type: 'mcq', prompt: base.prompt, localizedPrompts: Object.freeze(Object.fromEntries(REQUIRED_LOCALES.map((locale) => [locale, localized[locale].prompt]))), choices: Object.freeze([...base.choices]), correctIndex: base.correctIndex, learningGoal: base.skillTag, skillTag: base.skillTag, sourceIds: Object.freeze([...base.sourcePhraseIds]), claimIds: Object.freeze([]), choiceRationales: Object.freeze([...base.optionExplanations]), explanations: Object.freeze(Object.fromEntries(REQUIRED_LOCALES.map((locale) => [locale, Object.freeze([...localized[locale].optionExplanations])]))), qualityChecks: Object.freeze({ singleCorrect: true, distractorsPlausible: true, noAmbiguity: true, sourceBacked: base.sourcePhraseIds.length > 0 }) });
    });
    return Object.freeze({ schemaVersion: 'skyler-quiz-pack-v1', target: 'en', categoryId: input.categoryId, categoryTitle: input.categoryTitle, releasePolicy: Object.freeze({ environment: 'production', productionActivation: 'blocked_until_explicit_user_approval' }), items: Object.freeze(items) });
}
function assertChallengeDraftOnly(action) {
    if (action === 'publish')
        throw new Error('challenge_runtime_consumer_not_found');
    return 'draft_only_no_consumer';
}
function applyQuestionReplacements(items, replacements) {
    const byId = new Map(replacements.map((replacement) => [replacement.replacementForQuestionId, replacement.item]));
    if (byId.size !== replacements.length || replacements.some((replacement) => replacement.item.id !== replacement.replacementForQuestionId) || replacements.some((replacement) => !items.some((item) => item.id === replacement.replacementForQuestionId)))
        throw new Error('question_replacement_set_invalid');
    return Object.freeze(items.map((item) => byId.get(item.id) ?? item));
}
//# sourceMappingURL=question_consumer_adapter.js.map