import { HttpsError } from 'firebase-functions/v2/https';
import { assertContentFactorySourceCoverage, buildContentFactoryJobPlan, parseContentFactoryJobRequest, storedGenerationPlanFingerprint } from './admin_content_factory';
import type { SourceRegistry } from './content_factory/source_registry';

describe('parseContentFactoryJobRequest', () => {
  it('accepts bounded lesson and surface scopes', () => {
    expect(parseContentFactoryJobRequest({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1, 2], surfaces: ['lessons', 'cards'], idempotencyKey: 'job-1', blueprintVersion: 'english-core-32:v1' })).toMatchObject({ projectId: 'fr-a1', lessonIds: [1, 2] });
  });

  it('rejects unsupported surfaces and oversized scopes', () => {
    expect(() => parseContentFactoryJobRequest({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1], surfaces: ['theory'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(HttpsError);
    expect(() => parseContentFactoryJobRequest({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1], surfaces: ['quizzes'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(HttpsError);
    expect(() => parseContentFactoryJobRequest({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: [1], surfaces: ['arena_questions'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(HttpsError);
    expect(() => parseContentFactoryJobRequest({ projectId: 'p', studyTarget: 'fr', sourceLocale: 'en', lessonIds: Array.from({ length: 101 }, (_, index) => index + 1), surfaces: ['lessons'], idempotencyKey: 'j', blueprintVersion: 'v' })).toThrow(HttpsError);
  });

  it('creates one canonical queued unit per lesson/surface and reports the exact total', () => {
    const input = parseContentFactoryJobRequest({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'ru', lessonIds: [1, 2], surfaces: ['lessons', 'vocabulary', 'drills', 'cards'], idempotencyKey: 'job-1', blueprintVersion: 'english-core-32:v1' });
    const plan = buildContentFactoryJobPlan(input, 'admin-1', '2026-07-10T00:00:00.000Z');
    expect(plan.job.progress).toEqual({ total: 4, completed: 0, failed: 0 });
    expect(plan.job.releaseCandidate).toBe(true);
    expect(plan.units).toHaveLength(4);
    expect(new Set(plan.units.map((unit) => unit.unitId)).size).toBe(4);
  });

  it('keeps partial surface jobs out of the publish-review state', () => {
    const input = parseContentFactoryJobRequest({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'ru', lessonIds: [1], surfaces: ['lessons'], idempotencyKey: 'job-2', blueprintVersion: 'english-core-32:v1' });
    expect(buildContentFactoryJobPlan(input, 'admin-1').job.releaseCandidate).toBe(false);
  });

  it('rejects a non-versioned blueprint reference before writing a job', () => {
    expect(() => parseContentFactoryJobRequest({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'ru', lessonIds: [1], surfaces: ['lessons'], idempotencyKey: 'job-1', blueprintVersion: 'en-v1' })).toThrow(HttpsError);
  });

  it('returns an actionable source coverage error before creating a job', () => {
    const lessons = Object.fromEntries(Array.from({ length: 32 }, (_, index) => {
      const lessonId = index + 1;
      return [String(lessonId), { lessonId, topic: `topic-${lessonId}`, sourcePhrases: [`Phrase ${lessonId}`], vocabularyFocus: [], drills: [] }];
    }));
    const registry: SourceRegistry = {
      blueprintId: 'english-core-32', blueprintLocale: 'en', blueprintHash: 'a'.repeat(64), version: 'v1',
      evidence: [{ evidenceId: 'e1', kind: 'official_curriculum', authority: 'Source', url: 'https://example.com', retrievedAt: '2026-07-12T00:00:00.000Z', claim: 'sequence' }],
      lessons,
    };

    try {
      assertContentFactorySourceCoverage(registry, [32, 33]);
      throw new Error('expected coverage error');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpsError);
      expect(error).toMatchObject({ message: 'source_coverage', details: { missingLessonIds: [33] } });
    }
  });

  it('derives plan identity for legacy stored jobs without a fingerprint', () => {
    const legacy = storedGenerationPlanFingerprint({ lessonIds: [2, 1], surfaces: ['vocabulary', 'cards'] });
    const current = buildContentFactoryJobPlan(parseContentFactoryJobRequest({ projectId: 'fr-a1', studyTarget: 'fr', sourceLocale: 'ru', lessonIds: [1, 2], surfaces: ['lessons', 'cards'], idempotencyKey: 'job-legacy', blueprintVersion: 'english-core-32:v1' }), 'admin-1').job.planFingerprint;
    expect(legacy).toBe(current);
  });
});
