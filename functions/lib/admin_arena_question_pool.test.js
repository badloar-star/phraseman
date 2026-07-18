"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_arena_question_pool_1 = require("./admin_arena_question_pool");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
describe('admin arena question pool request contracts', () => {
    it('accepts bounded operator filters only', () => {
        expect((0, admin_arena_question_pool_1.parseArenaPoolListRequest)({ limit: 100, level: 'A2', availability: 'removed', topicArtifactId: 'topic-1' })).toEqual({ limit: 100, level: 'A2', availability: 'removed', topicArtifactId: 'topic-1' });
        expect(() => (0, admin_arena_question_pool_1.parseArenaPoolListRequest)({ limit: 101 })).toThrow(https_1.HttpsError);
    });
    it('requires an exact reviewed-stage fingerprint before publication', () => {
        expect((0, admin_arena_question_pool_1.parseArenaPoolPublishRequest)({ stageId: 'request:arena_questions:city:r1', expectedReviewFingerprint: 'a'.repeat(64) })).toEqual({ stageId: 'request:arena_questions:city:r1', expectedReviewFingerprint: 'a'.repeat(64) });
        expect(() => (0, admin_arena_question_pool_1.parseArenaPoolPublishRequest)({ stageId: 'stage', expectedReviewFingerprint: 'stale' })).toThrow(https_1.HttpsError);
    });
    it('requires a reason and revision for removal, and rejects client-owned extra fields', () => {
        expect((0, admin_arena_question_pool_1.parseArenaPoolMutationRequest)({ questionId: 'arena-1', expectedRevision: 3, reason: 'Duplicate wording' }, true)).toEqual({ questionId: 'arena-1', expectedRevision: 3, reason: 'Duplicate wording' });
        expect(() => (0, admin_arena_question_pool_1.parseArenaPoolMutationRequest)({ questionId: 'arena-1', expectedRevision: 3 }, true)).toThrow(https_1.HttpsError);
        expect(() => (0, admin_arena_question_pool_1.parseArenaPoolMutationRequest)({ questionId: 'arena-1', expectedRevision: 3, availability: 'active' }, false)).toThrow(https_1.HttpsError);
    });
    it('returns an explicit safe DTO and strips unexpected stored fields', () => {
        const module = require('./admin_arena_question_pool');
        expect(typeof module.publicArenaPoolQuestion).toBe('function');
        if (!module.publicArenaPoolQuestion)
            return;
        const dto = module.publicArenaPoolQuestion('question-1', {
            id: 'stored-id',
            studyTarget: 'en',
            learnerSourceLocale: 'ru',
            level: 'A2',
            availability: 'active',
            skillTag: 'city',
            difficulty: 'medium',
            rand: 0.25,
            question: 'Question?',
            options: ['A', 'B', 'C', 'D'],
            correct: 'A',
            correctIndex: 0,
            sourceStageId: 'stage-doc-1',
            artifactId: 'artifact-1',
            contentHash: 'a'.repeat(64),
            topicArtifactId: 'topic-1',
            revision: 1,
            publishedAtMs: 1000,
            publishedBy: 'admin-1',
            objectPath: 'private/artifact.json',
            unexpectedSecret: 'must-not-leak',
        });
        expect(dto).toMatchObject({ id: 'question-1', sourceStageId: 'stage-doc-1', artifactId: 'artifact-1' });
        expect(dto).not.toHaveProperty('objectPath');
        expect(dto).not.toHaveProperty('unexpectedSecret');
    });
    it('defines every supported admin filter combination ordered by publishedAtMs', () => {
        const indexes = JSON.parse((0, node_fs_1.readFileSync)(node_path_1.default.resolve(__dirname, '..', '..', 'firestore.indexes.json'), 'utf8'));
        const signatures = new Set(indexes.indexes
            .filter((index) => index.collectionGroup === 'arena_questions')
            .map((index) => index.fields.map((field) => `${field.fieldPath}:${field.order}`).join('|')));
        const filters = ['level', 'availability', 'topicArtifactId'];
        for (let mask = 1; mask < (1 << filters.length); mask += 1) {
            const equalityFields = filters.filter((_, index) => (mask & (1 << index)) !== 0);
            const signature = [...equalityFields.map((field) => `${field}:ASCENDING`), 'publishedAtMs:DESCENDING'].join('|');
            expect(signatures).toContain(signature);
        }
    });
});
//# sourceMappingURL=admin_arena_question_pool.test.js.map