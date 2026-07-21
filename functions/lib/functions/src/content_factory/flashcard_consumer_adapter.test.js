"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const flashcard_consumer_adapter_1 = require("./flashcard_consumer_adapter");
describe('flashcard consumer adapter', () => {
    const idea = { packId: 'city-a2', title: 'City A2', learningPromise: 'Navigate the city.', audience: 'Adults', cefr: 'A2', tags: ['city'], inclusions: ['directions'], exclusions: [], uniquenessFingerprint: 'city-a2-directions' };
    const item = { id: 'c1', front: 'Where is the station?', back: 'Где вокзал?', exampleTarget: 'Where is the station, please?', exampleSource: 'Подскажите, где вокзал?', note: 'Вежливая форма.', sourceReferences: ['lesson:20:phrase:4'] };
    it('maps the rich English/Russian draft into the existing CardItem shape without losing details', () => {
        expect((0, flashcard_consumer_adapter_1.buildEnglishFlashcardDraft)({ studyTarget: 'en', sourceLocale: 'ru', idea, items: [item] })).toEqual({
            packId: 'city-a2', title: 'City A2', publicationPolicy: 'community_pack_rich_v1',
            cards: [{ id: 'c1', en: item.front, ru: item.back, uk: '', categoryId: 'custom', isSystem: false, description: item.note, exampleEn: item.exampleTarget, exampleRu: item.exampleSource, level: 'A2', source: 'content_factory', sourceId: 'lesson:20:phrase:4', richSchemaVersion: 1, exampleTarget: item.exampleTarget, exampleSource: item.exampleSource, note: item.note, sourceReferences: item.sourceReferences }],
        });
    });
    it('fails closed for unsupported target/source mappings and enables the gated rich consumer', () => {
        expect(() => (0, flashcard_consumer_adapter_1.buildEnglishFlashcardDraft)({ studyTarget: 'fr', sourceLocale: 'ru', idea, items: [item] })).toThrow('flashcard_runtime_target_not_supported');
        expect(() => (0, flashcard_consumer_adapter_1.buildEnglishFlashcardDraft)({ studyTarget: 'en', sourceLocale: 'uk', idea, items: [item] })).toThrow('flashcard_runtime_source_not_supported');
        expect((0, flashcard_consumer_adapter_1.assertFlashcardCommunityPublishSupported)()).toBe(true);
    });
});
//# sourceMappingURL=flashcard_consumer_adapter.test.js.map