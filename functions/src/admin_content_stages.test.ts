import { HttpsError } from 'firebase-functions/v2/https';
import { contentStagePlanFingerprint, flashcardPublishedDuplicateIds, parseContentStageControlRequest, parseContentStageCreateRequest, parseContentStageListRequest, parseContentStagePreviewRequest, parseContentStageReviewRequest, stagePlanFromStoredPrerequisites } from './admin_content_stages';

describe('admin independent content stage callables', () => {
  it('records human linguistic review separately from structural QA for lesson phrases', () => {
    const source = require('node:fs').readFileSync(__filename.replace(/admin_content_stages\.test\.ts$/, 'admin_content_stages.ts'), 'utf8');
    expect(source).toContain("status: 'human_approved'");
    expect(source).toContain('automatedJudgeStatus: isRecord(stage.judgeReceipt)');
    expect(source).toContain("stage.judgeReceipt.status ?? 'not_collected'");
  });
  it('parses bounded cursor pagination and server-side stage filters', () => {
    expect(parseContentStageListRequest({ requestId: 'request-1', limit: 999, cursor: 'request-1:challenge_topic:topic:r1', kind: 'challenge_topic', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1' })).toEqual({ requestId: 'request-1', limit: 100, cursor: 'request-1:challenge_topic:topic:r1', kind: 'challenge_topic', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1' });
    expect(() => parseContentStageListRequest({ requestId: 'request-1', cursor: '../bad' })).toThrow(HttpsError);
  });
  it('parses a bounded server-owned stage request', () => {
    expect(parseContentStageCreateRequest({ requestId: 'request-1', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Practice introductions', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['request-1:challenge_topic:topic-1:r1'] })).toEqual({ requestId: 'request-1', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Practice introductions', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['request-1:challenge_topic:topic-1:r1'] });
  });

  it('rejects client-owned prompt, model, schema and QA fields', () => {
    for (const forbidden of ['model', 'promptVersion', 'schemaVersion', 'qaPolicy', 'qaReceipt', 'artifactId']) {
      expect(() => parseContentStageCreateRequest({ requestId: 'request-1', kind: 'challenge_topic', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Travel', scopeId: 'topic-1', count: 1, revision: 1, prerequisiteStageIds: [], [forbidden]: 'attacker-value' })).toThrow(HttpsError);
    }
  });

  it('builds a plan only from approved server prerequisite documents', () => {
    const plan = stagePlanFromStoredPrerequisites(parseContentStageCreateRequest({ requestId: 'request-1', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['topic-stage'] }), [{ stageId: 'topic-stage', requestId: 'request-1', kind: 'challenge_topic', artifactId: 'topic-artifact', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-1' }]);
    expect(plan.unit).toMatchObject({ kind: 'challenge_questions', prerequisiteArtifactIds: ['topic-artifact'], promptVersion: 'v2', schemaVersion: 2, qaPolicy: 'question-studio-quality-v2' });
  });

  it('selects strict server-owned v2 contracts for lesson outline and 50 phrases', () => {
    const outline = stagePlanFromStoredPrerequisites(parseContentStageCreateRequest({ requestId: 'request-lesson', kind: 'lesson_outline', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Directions', scopeId: 'lesson-20', count: 1, revision: 1, prerequisiteStageIds: [] }), []);
    expect(outline.unit).toMatchObject({ schemaVersion: 3, promptVersion: 'v3', qaPolicy: 'lesson-quality-v3' });
    const phrases = stagePlanFromStoredPrerequisites(parseContentStageCreateRequest({ requestId: 'request-lesson', kind: 'lesson_phrases', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Directions', scopeId: 'lesson-20', count: 50, revision: 1, prerequisiteStageIds: ['outline-stage'] }), [{ stageId: 'outline-stage', requestId: 'request-lesson', kind: 'lesson_outline', artifactId: 'outline-artifact', state: 'approved', studyTarget: 'en', sourceLocale: 'ru', scopeId: 'lesson-20' }]);
    expect(phrases.unit).toMatchObject({ count: 50, schemaVersion: 3, promptVersion: 'v3', qaPolicy: 'lesson-quality-v3' });
  });

  it.each([10, 49, 51])('rejects client lesson phrase count %i before planning', (count) => {
    expect(() => parseContentStageCreateRequest({ requestId: 'request-lesson', kind: 'lesson_phrases', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Directions', scopeId: 'lesson-20', count, revision: 1, prerequisiteStageIds: ['outline-stage'] })).toThrow('stage_capability_count_unsupported');
  });

  it.each([1, 9, 11, 100])('rejects client question batch count %i before planning', (count) => {
    expect(() => parseContentStageCreateRequest({ requestId: 'request-challenge', kind: 'challenge_questions', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Travel', scopeId: 'travel', count, revision: 1, prerequisiteStageIds: ['topic-stage'] })).toThrow('stage_capability_count_unsupported');
  });

  it('accepts a bounded one-question replacement identity only for replacement stages', () => {
    const input = parseContentStageCreateRequest({ requestId: 'request-challenge', kind: 'challenge_question_replacement', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Travel', scopeId: 'travel.replace.q-1', count: 1, revision: 1, prerequisiteStageIds: ['batch-stage'], replacementForQuestionId: 'q-1' });
    expect(input.replacementForQuestionId).toBe('q-1');
    expect(() => parseContentStageCreateRequest({ requestId: 'request-challenge', kind: 'challenge_questions', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'Travel', scopeId: 'travel', count: 10, revision: 1, prerequisiteStageIds: ['topic-stage'], replacementForQuestionId: 'q-1' })).toThrow('question_replacement_identity_invalid');
  });

  it('selects v3 flashcard contracts, accepts counts 1..20, and requires a one-card replacement identity', () => {
    const idea = stagePlanFromStoredPrerequisites(parseContentStageCreateRequest({ requestId: 'request-cards', kind: 'flashcard_pack_idea', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count: 1, revision: 1, prerequisiteStageIds: [] }), []);
    expect(idea.unit).toMatchObject({ schemaVersion: 3, promptVersion: 'v3', qaPolicy: 'flashcard-studio-quality-v3' });
    for (const count of [1, 10, 20]) expect(parseContentStageCreateRequest({ requestId: 'request-cards', kind: 'flashcard_items', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count, revision: 1, prerequisiteStageIds: ['idea-stage'] }).count).toBe(count);
    for (const count of [0, 21]) expect(() => parseContentStageCreateRequest({ requestId: 'request-cards', kind: 'flashcard_items', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count, revision: 1, prerequisiteStageIds: ['idea-stage'] })).toThrow('stage_capability_count_unsupported');
    expect(parseContentStageCreateRequest({ requestId: 'request-cards', kind: 'flashcard_item_replacement', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2.replace.c1', count: 1, revision: 1, prerequisiteStageIds: ['batch-stage'], replacementForCardId: 'c1' }).replacementForCardId).toBe('c1');
  });

  it('accepts an optional approved lesson phrase stage as a flashcard dedupe source across scopes', () => {
    const input = parseContentStageCreateRequest({ requestId: 'request-cards', kind: 'flashcard_items', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', objective: 'City', scopeId: 'city-a2', count: 10, revision: 1, prerequisiteStageIds: ['idea-stage', 'lesson-stage'] });
    const plan = stagePlanFromStoredPrerequisites(input, [
      { stageId: 'idea-stage', requestId: 'request-cards', kind: 'flashcard_pack_idea', artifactId: 'idea-artifact', state: 'approved', studyTarget: 'en', sourceLocale: 'ru', scopeId: 'city-a2' },
      { stageId: 'lesson-stage', requestId: 'request-cards', kind: 'lesson_phrases', artifactId: 'lesson-artifact', state: 'approved', studyTarget: 'en', sourceLocale: 'ru', scopeId: 'lesson-20' },
    ]);
    expect(plan.unit.prerequisiteArtifactIds).toEqual(['idea-artifact']);
  });

  it('detects catalog growth between flashcard generation and approval', () => {
    const items = [{ id: 'c1', front: 'Where is the station?', back: 'Где вокзал?' }];
    expect(flashcardPublishedDuplicateIds(items, [], 'en', 'ru')).toEqual([]);
    expect(flashcardPublishedDuplicateIds(items, [{ listingStatus: 'published', studyTarget: 'en', cards: [{ en: 'Where is the station?', ru: 'Где вокзал?' }] }], 'en', 'ru')).toEqual(['c1']);
  });

  it('rejects an approved prerequisite from another language or scope', () => {
    const input = parseContentStageCreateRequest({ requestId: 'request-1', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['topic-stage'] });
    expect(() => stagePlanFromStoredPrerequisites(input, [{ stageId: 'topic-stage', requestId: 'request-1', kind: 'challenge_topic', artifactId: 'topic-artifact', state: 'approved', studyTarget: 'de', sourceLocale: 'ru', scopeId: 'topic-1' }])).toThrow('generation_stage_prerequisite_identity_mismatch');
    expect(() => stagePlanFromStoredPrerequisites(input, [{ stageId: 'topic-stage', requestId: 'request-1', kind: 'challenge_topic', artifactId: 'topic-artifact', state: 'approved', studyTarget: 'fr', sourceLocale: 'ru', scopeId: 'topic-2' }])).toThrow('generation_stage_prerequisite_identity_mismatch');
  });

  it('fingerprints every generation input and sorted prerequisite identity', () => {
    const input = parseContentStageCreateRequest({ requestId: 'request-1', kind: 'challenge_questions', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 'topic-1', count: 10, revision: 1, prerequisiteStageIds: ['b', 'a'] });
    const first = contentStagePlanFingerprint(input, ['artifact-b', 'artifact-a']);
    const same = contentStagePlanFingerprint({ ...input, prerequisiteStageIds: ['a', 'b'] }, ['artifact-a', 'artifact-b']);
    const changed = contentStagePlanFingerprint({ ...input, prerequisiteStageIds: ['a', 'c'] }, ['artifact-a', 'artifact-c']);
    expect(first).toBe(same);
    expect(changed).not.toBe(first);
  });

  it('accepts the longest derived stage identity in every parser', () => {
    const input = parseContentStageCreateRequest({ requestId: 'r'.repeat(160), kind: 'lesson_irregular_verbs', studyTarget: 'fr', sourceLocale: 'ru', cefr: 'A1', objective: 'Identity', scopeId: 's'.repeat(160), count: 1, revision: 1, prerequisiteStageIds: [] });
    const stageId = `${input.requestId}:${input.kind}:${input.scopeId}:r1`;
    expect(stageId.length).toBeGreaterThan(300);
    expect(parseContentStageControlRequest({ stageId, action: 'pause' }).stageId).toBe(stageId);
    expect(parseContentStagePreviewRequest({ stageId }).stageId).toBe(stageId);
  });

  it('parses only explicit pause/resume/cancel controls', () => {
    expect(parseContentStageControlRequest({ stageId: 'request-1:challenge_topic:topic-1:r1', action: 'pause' })).toEqual({ stageId: 'request-1:challenge_topic:topic-1:r1', action: 'pause' });
    expect(() => parseContentStageControlRequest({ stageId: 'bad id', action: 'delete' })).toThrow(HttpsError);
  });

  it('parses server-owned preview and human review requests', () => {
    const stageId = 'request-1:challenge_topic:topic-1:r1';
    const expectedReviewFingerprint = 'a'.repeat(64);
    expect(parseContentStagePreviewRequest({ stageId })).toEqual({ stageId });
    expect(parseContentStageReviewRequest({ stageId, status: 'approved', reason: 'Проверены тема и уровень.', expectedReviewFingerprint })).toEqual({ stageId, status: 'approved', reason: 'Проверены тема и уровень.', expectedReviewFingerprint });
    expect(() => parseContentStageReviewRequest({ stageId, status: 'approved', reason: 'ok', qaReceipt: { status: 'passed' } })).toThrow(HttpsError);
  });
});
