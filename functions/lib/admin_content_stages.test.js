"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const https_1 = require("firebase-functions/v2/https");
const admin_content_stages_1 = require("./admin_content_stages");
describe('admin independent content stage callables', () => {
    it('records human linguistic review separately from structural QA for lesson phrases', () => {
        const source = require('node:fs').readFileSync(__filename.replace(/admin_content_stages\.test\.ts$/, 'admin_content_stages.ts'), 'utf8');
        expect(source).toContain("status: 'human_approved'");
        expect(source).toContain('automatedJudgeStatus: isRecord(stage.judgeReceipt)');
        expect(source).toContain("stage.judgeReceipt.status ?? 'not_collected'");
    });
    it('parses bounded cursor pagination and server-side stage filters', () => {
        expect((0, admin_content_stages_1.parseContentStageListRequest)({ requestId: 'request-1', limit: 999, cursor: 'request-1:quiz_topic:topic:r1', kind: 'quiz_topic', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1' })).toEqual({ requestId: 'request-1', limit: 100, cursor: 'request-1:quiz_topic:topic:r1', kind: 'quiz_topic', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1' });
        expect(() => (0, admin_content_stages_1.parseContentStageListRequest)({ requestId: 'request-1', cursor: '../bad' })).toThrow(https_1.HttpsError);
    });
    it('parses a bounded server-owned stage request', () => {
        expect((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-1', kind: 'quiz_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Practice introductions', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['request-1:quiz_topic:topic-1:r1'] })).toEqual({ requestId: 'request-1', kind: 'quiz_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Practice introductions', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['request-1:quiz_topic:topic-1:r1'] });
    });
    it('rejects client-owned prompt, model, schema and QA fields', () => {
        for (const forbidden of ['model', 'promptVersion', 'schemaVersion', 'qaPolicy', 'qaReceipt', 'artifactId']) {
            expect(() => (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-1', kind: 'quiz_topic', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Travel', scopeId: 'topic-1', count: 1, revision: 1, prerequisiteStageIds: [], [forbidden]: 'attacker-value' })).toThrow(https_1.HttpsError);
        }
    });
    it('builds a plan only from approved server prerequisite documents', () => {
        const plan = (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-1', kind: 'quiz_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['topic-stage'] }), [{ stageId: 'topic-stage', requestId: 'request-1', kind: 'quiz_topic', artifactId: 'topic-artifact', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1' }]);
        expect(plan.unit).toMatchObject({ kind: 'quiz_questions', prerequisiteArtifactIds: ['topic-artifact'], promptVersion: 'v2', schemaVersion: 2, qaPolicy: 'question-studio-quality-v2' });
    });
    it('selects strict server-owned v2 contracts for lesson outline and 50 phrases', () => {
        const outline = (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-lesson', kind: 'lesson_outline', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Directions', scopeId: 'lesson-20', count: 1, revision: 1, prerequisiteStageIds: [] }), []);
        expect(outline.unit).toMatchObject({ schemaVersion: 3, promptVersion: 'v3', qaPolicy: 'lesson-quality-v3' });
        const phrases = (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-lesson', kind: 'lesson_phrases', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Directions', scopeId: 'lesson-20', count: 50, revision: 1, prerequisiteStageIds: ['outline-stage'] }), [{ stageId: 'outline-stage', requestId: 'request-lesson', kind: 'lesson_outline', artifactId: 'outline-artifact', state: 'approved', studyTarget: 'en', sourceLocale: 'ru', scopeId: 'lesson-20' }]);
        expect(phrases.unit).toMatchObject({ count: 50, schemaVersion: 3, promptVersion: 'v3', qaPolicy: 'lesson-quality-v3' });
    });
    it.each([10, 49, 51])('rejects client lesson phrase count %i before planning', (count) => {
        expect(() => (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-lesson', kind: 'lesson_phrases', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Directions', scopeId: 'lesson-20', count, revision: 1, prerequisiteStageIds: ['outline-stage'] })).toThrow('stage_capability_count_unsupported');
    });
    it.each([1, 9, 11, 100])('rejects client question batch count %i before planning', (count) => {
        expect(() => (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-quiz', kind: 'quiz_questions', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Travel', scopeId: 'travel', count, revision: 1, prerequisiteStageIds: ['topic-stage'] })).toThrow('stage_capability_count_unsupported');
    });
    it('accepts a bounded one-question replacement identity only for replacement stages', () => {
        const input = (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-quiz', kind: 'quiz_question_replacement', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Travel', scopeId: 'travel.replace.q-1', count: 1, revision: 1, prerequisiteStageIds: ['batch-stage'], replacementForQuestionId: 'q-1' });
        expect(input.replacementForQuestionId).toBe('q-1');
        expect(() => (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-quiz', kind: 'quiz_questions', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Travel', scopeId: 'travel', count: 10, revision: 1, prerequisiteStageIds: ['topic-stage'], replacementForQuestionId: 'q-1' })).toThrow('question_replacement_identity_invalid');
    });
    it('selects v3 flashcard contracts, accepts counts 1..20, and requires a one-card replacement identity', () => {
        const idea = (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-cards', kind: 'flashcard_pack_idea', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count: 1, revision: 1, prerequisiteStageIds: [] }), []);
        expect(idea.unit).toMatchObject({ schemaVersion: 3, promptVersion: 'v3', qaPolicy: 'flashcard-studio-quality-v3' });
        for (const count of [1, 10, 20])
            expect((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-cards', kind: 'flashcard_items', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count, revision: 1, prerequisiteStageIds: ['idea-stage'] }).count).toBe(count);
        for (const count of [0, 21])
            expect(() => (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-cards', kind: 'flashcard_items', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count, revision: 1, prerequisiteStageIds: ['idea-stage'] })).toThrow('stage_capability_count_unsupported');
        expect((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-cards', kind: 'flashcard_item_replacement', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2.replace.c1', count: 1, revision: 1, prerequisiteStageIds: ['batch-stage'], replacementForCardId: 'c1' }).replacementForCardId).toBe('c1');
    });
    it('accepts an optional approved lesson phrase stage as a flashcard dedupe source across scopes', () => {
        const input = (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-cards', kind: 'flashcard_items', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count: 10, revision: 1, prerequisiteStageIds: ['idea-stage', 'lesson-stage'] });
        const plan = (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)(input, [
            { stageId: 'idea-stage', requestId: 'request-cards', kind: 'flashcard_pack_idea', artifactId: 'idea-artifact', state: 'approved', studyTarget: 'en', sourceLocale: 'ru', scopeId: 'city-a2' },
            { stageId: 'lesson-stage', requestId: 'request-cards', kind: 'lesson_phrases', artifactId: 'lesson-artifact', state: 'approved', studyTarget: 'en', sourceLocale: 'ru', scopeId: 'lesson-20' },
        ]);
        expect(plan.unit.prerequisiteArtifactIds).toEqual(['idea-artifact']);
    });
    it('detects catalog growth between flashcard generation and approval', () => {
        const items = [{ id: 'c1', front: 'Where is the station?', back: 'Где вокзал?' }];
        expect((0, admin_content_stages_1.flashcardPublishedDuplicateIds)(items, [], 'en', 'ru')).toEqual([]);
        expect((0, admin_content_stages_1.flashcardPublishedDuplicateIds)(items, [{ listingStatus: 'published', studyTarget: 'en', cards: [{ en: 'Where is the station?', ru: 'Где вокзал?' }] }], 'en', 'ru')).toEqual(['c1']);
    });
    it('selects Arena topic v2 and question quality v4, and rejects unsupported C1 or non-ten batches', () => {
        const topic = (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-arena', kind: 'arena_topic', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Fast city', scopeId: 'city-a2', count: 1, revision: 1, prerequisiteStageIds: [] }), []);
        expect(topic.unit).toMatchObject({ schemaVersion: 2, promptVersion: 'v2', qaPolicy: 'arena-studio-quality-v2' });
        const questions = (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)((0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-arena', kind: 'arena_questions', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Fast city', scopeId: 'city-a2', count: 10, revision: 1, prerequisiteStageIds: ['topic-stage'] }), [
            { stageId: 'topic-stage', requestId: 'request-arena', kind: 'arena_topic', artifactId: 'topic-artifact', state: 'approved', studyTarget: 'en', sourceLocale: 'ru', scopeId: 'city-a2' },
        ]);
        expect(questions.unit).toMatchObject({ schemaVersion: 3, promptVersion: 'v4', qaPolicy: 'arena-studio-quality-v4' });
        expect(() => (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-arena', kind: 'arena_topic', studyTarget: 'en', sourceLocale: 'ru', cefr: 'C1', objective: 'Fast city', scopeId: 'city-c1', count: 1, revision: 1, prerequisiteStageIds: [] })).toThrow('stage_capability_cefr_unsupported');
        expect(() => (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-arena', kind: 'arena_questions', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Fast city', scopeId: 'city-a2', count: 9, revision: 1, prerequisiteStageIds: ['topic-stage'] })).toThrow('stage_capability_count_unsupported');
    });
    it('rejects an approved prerequisite from another language or scope', () => {
        const input = (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-1', kind: 'quiz_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['topic-stage'] });
        expect(() => (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)(input, [{ stageId: 'topic-stage', requestId: 'request-1', kind: 'quiz_topic', artifactId: 'topic-artifact', state: 'approved', studyTarget: 'de', sourceLocale: 'ru', scopeId: 'topic-1' }])).toThrow('generation_stage_prerequisite_identity_mismatch');
        expect(() => (0, admin_content_stages_1.stagePlanFromStoredPrerequisites)(input, [{ stageId: 'topic-stage', requestId: 'request-1', kind: 'quiz_topic', artifactId: 'topic-artifact', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-2' }])).toThrow('generation_stage_prerequisite_identity_mismatch');
    });
    it('fingerprints every generation input and sorted prerequisite identity', () => {
        const input = (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'request-1', kind: 'quiz_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['b', 'a'] });
        const first = (0, admin_content_stages_1.contentStagePlanFingerprint)(input, ['artifact-b', 'artifact-a']);
        const same = (0, admin_content_stages_1.contentStagePlanFingerprint)({ ...input, prerequisiteStageIds: ['a', 'b'] }, ['artifact-a', 'artifact-b']);
        const changed = (0, admin_content_stages_1.contentStagePlanFingerprint)({ ...input, prerequisiteStageIds: ['a', 'c'] }, ['artifact-a', 'artifact-c']);
        expect(first).toBe(same);
        expect(changed).not.toBe(first);
    });
    it('accepts the longest derived stage identity in every parser', () => {
        const input = (0, admin_content_stages_1.parseContentStageCreateRequest)({ requestId: 'r'.repeat(160), kind: 'lesson_irregular_verbs', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 's'.repeat(160), count: 1, revision: 1, prerequisiteStageIds: [] });
        const stageId = `${input.requestId}:${input.kind}:${input.scopeId}:r1`;
        expect(stageId.length).toBeGreaterThan(300);
        expect((0, admin_content_stages_1.parseContentStageControlRequest)({ stageId, action: 'pause' }).stageId).toBe(stageId);
        expect((0, admin_content_stages_1.parseContentStagePreviewRequest)({ stageId }).stageId).toBe(stageId);
    });
    it('parses only explicit pause/resume/cancel controls', () => {
        expect((0, admin_content_stages_1.parseContentStageControlRequest)({ stageId: 'request-1:quiz_topic:topic-1:r1', action: 'pause' })).toEqual({ stageId: 'request-1:quiz_topic:topic-1:r1', action: 'pause' });
        expect(() => (0, admin_content_stages_1.parseContentStageControlRequest)({ stageId: 'bad id', action: 'delete' })).toThrow(https_1.HttpsError);
    });
    it('parses server-owned preview and human review requests', () => {
        const stageId = 'request-1:quiz_topic:topic-1:r1';
        const expectedReviewFingerprint = 'a'.repeat(64);
        expect((0, admin_content_stages_1.parseContentStagePreviewRequest)({ stageId })).toEqual({ stageId });
        expect((0, admin_content_stages_1.parseContentStageReviewRequest)({ stageId, status: 'approved', reason: 'Проверены тема и уровень.', expectedReviewFingerprint })).toEqual({ stageId, status: 'approved', reason: 'Проверены тема и уровень.', expectedReviewFingerprint });
        expect(() => (0, admin_content_stages_1.parseContentStageReviewRequest)({ stageId, status: 'approved', reason: 'ok', qaReceipt: { status: 'passed' } })).toThrow(https_1.HttpsError);
    });
});
//# sourceMappingURL=admin_content_stages.test.js.map