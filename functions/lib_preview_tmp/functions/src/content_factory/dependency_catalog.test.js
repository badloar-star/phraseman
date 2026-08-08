"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dependency_catalog_1 = require("./dependency_catalog");
describe('approved dependency catalog', () => {
    test('derives kinds and approved state from the consumer capability', () => {
        expect((0, dependency_catalog_1.parseDependencyCatalogRequest)({ requestId: 'req-1', studyTarget: 'en', sourceLocale: 'ru', consumerKind: 'challenge_questions', limit: 25 })).toMatchObject({
            requestId: 'req-1', state: 'approved', allowedKinds: ['challenge_topic'], limit: 25,
        });
        expect((0, dependency_catalog_1.parseDependencyCatalogRequest)({ requestId: 'req-1', studyTarget: 'en', sourceLocale: 'ru', consumerKind: 'flashcard_items' }).allowedKinds).toEqual(['flashcard_pack_idea', 'lesson_phrases']);
    });
    test('rejects arbitrary state/kind and tampered cursor', () => {
        expect(() => (0, dependency_catalog_1.parseDependencyCatalogRequest)({ requestId: 'req-1', studyTarget: 'en', sourceLocale: 'ru', consumerKind: 'challenge_questions', state: 'rejected' })).toThrow('dependency_catalog_invalid');
        expect(() => (0, dependency_catalog_1.parseDependencyCatalogRequest)({ requestId: 'req-1', studyTarget: 'en', sourceLocale: 'ru', consumerKind: 'challenge_questions', cursor: 'bad cursor!' })).toThrow('dependency_catalog_invalid');
    });
    test('sanitizes a limit+1 page and exposes partial state', () => {
        const docs = Array.from({ length: 3 }, (_, index) => ({ id: `s${index}`, data: { kind: 'challenge_topic', scopeId: `topic-${index}`, title: `Topic ${index}`, revision: 1, artifactId: `a${index}`, contentHash: 'a'.repeat(64), createdAt: { toDate: () => new Date(`2026-07-0${index + 1}T00:00:00Z`) } } }));
        expect((0, dependency_catalog_1.dependencyCatalogItems)(docs, 2)).toEqual({
            items: [expect.objectContaining({ stageId: 's0', title: 'Topic 0' }), expect.objectContaining({ stageId: 's1' })], nextCursor: 's1', isPartial: true,
        });
    });
});
//# sourceMappingURL=dependency_catalog.test.js.map