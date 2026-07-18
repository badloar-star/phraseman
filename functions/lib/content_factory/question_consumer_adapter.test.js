"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const question_consumer_adapter_1 = require("./question_consumer_adapter");
describe('question stage consumer adapters', () => {
    const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
    const item = (locale, index) => ({ id: `q${index}`, prompt: `${locale} prompt ${index}`, choices: [`Correct ${index}`, `Wrong A ${index}`, `Wrong B ${index}`, `Wrong C ${index}`], correctIndex: 0, optionExplanations: [`${locale} correct`, `${locale} wrong A`, `${locale} wrong B`, `${locale} wrong C`], skillTag: 'travel', difficulty: 'medium', sourcePhraseIds: [] });
    const batches = Object.fromEntries(locales.map((locale) => [locale, { items: [item(locale, 1)] }]));
    it('builds the existing skyler-quiz-pack-v1 shape only from aligned complete locales', () => {
        const pack = (0, question_consumer_adapter_1.buildSkylerQuizPackFromStages)({ studyTarget: 'en', categoryId: 'travel', categoryTitle: 'Travel', batchesBySourceLocale: batches });
        expect(pack).toMatchObject({ schemaVersion: 'skyler-quiz-pack-v1', target: 'en', categoryId: 'travel', items: [{ id: 'q1', type: 'mcq', correctIndex: 0 }] });
        expect(pack.items[0].localizedPrompts.ru).toBe('ru prompt 1');
        expect(pack.items[0].explanations.uk).toHaveLength(4);
    });
    it('fails closed for missing locale, misaligned choices or unsupported target', () => {
        const { pl, ...missing } = batches;
        expect(() => (0, question_consumer_adapter_1.buildSkylerQuizPackFromStages)({ studyTarget: 'en', categoryId: 'travel', categoryTitle: 'Travel', batchesBySourceLocale: missing })).toThrow('quiz_consumer_locales_incomplete');
        const changed = { ...batches, uk: { items: [{ ...batches.uk.items[0], choices: ['Different', 'A', 'B', 'C'] }] } };
        expect(() => (0, question_consumer_adapter_1.buildSkylerQuizPackFromStages)({ studyTarget: 'en', categoryId: 'travel', categoryTitle: 'Travel', batchesBySourceLocale: changed })).toThrow('quiz_consumer_item_alignment_mismatch');
        expect(() => (0, question_consumer_adapter_1.buildSkylerQuizPackFromStages)({ studyTarget: 'fr', categoryId: 'travel', categoryTitle: 'Travel', batchesBySourceLocale: batches })).toThrow('quiz_runtime_target_not_supported');
    });
    it('keeps Challenge explicitly draft-only', () => {
        expect(() => (0, question_consumer_adapter_1.assertChallengeDraftOnly)('publish')).toThrow('challenge_runtime_consumer_not_found');
        expect((0, question_consumer_adapter_1.assertChallengeDraftOnly)('preview')).toBe('draft_only_no_consumer');
    });
    it('materializes a replacement without changing any other accepted item', () => {
        const original = [item('ru', 1), item('ru', 2)];
        const replacement = { ...item('ru', 1), prompt: 'Новый вопрос' };
        expect((0, question_consumer_adapter_1.applyQuestionReplacements)(original, [{ replacementForQuestionId: 'q1', item: replacement }]).map((value) => value.prompt)).toEqual(['Новый вопрос', 'ru prompt 2']);
    });
});
//# sourceMappingURL=question_consumer_adapter.test.js.map