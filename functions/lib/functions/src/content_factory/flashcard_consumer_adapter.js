"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEnglishFlashcardDraft = buildEnglishFlashcardDraft;
exports.assertFlashcardCommunityPublishSupported = assertFlashcardCommunityPublishSupported;
function buildEnglishFlashcardDraft(input) {
    if (input.studyTarget !== 'en')
        throw new Error('flashcard_runtime_target_not_supported');
    if (input.sourceLocale !== 'ru')
        throw new Error('flashcard_runtime_source_not_supported');
    return Object.freeze({
        packId: input.idea.packId,
        title: input.idea.title,
        publicationPolicy: 'community_pack_rich_v1',
        cards: Object.freeze(input.items.map((item) => Object.freeze({
            id: item.id,
            en: item.front,
            ru: item.back,
            uk: '',
            categoryId: 'custom',
            isSystem: false,
            description: item.note,
            exampleEn: item.exampleTarget,
            exampleRu: item.exampleSource,
            level: input.idea.cefr,
            source: 'content_factory',
            sourceId: item.sourceReferences[0] ?? input.idea.packId,
            richSchemaVersion: 1,
            exampleTarget: item.exampleTarget,
            exampleSource: item.exampleSource,
            note: item.note,
            sourceReferences: Object.freeze([...item.sourceReferences]),
        }))),
    });
}
function assertFlashcardCommunityPublishSupported() {
    return true;
}
//# sourceMappingURL=flashcard_consumer_adapter.js.map