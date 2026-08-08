import { buildBulkStagePlan, parseBulkStagePlanRequest } from './bulk_stage_plan';

const base = {
  requestId: 'course-en-ru', idempotencyKey: 'bulk-001', studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2',
  objective: 'Daily communication', kinds: ['lesson_outline'] as const, lessonRange: { start: 1, end: 3 }, dependencyPolicy: 'approved_only' as const,
};

describe('bounded server bulk stage plan', () => {
  test('expands a lesson range deterministically', () => {
    const request = parseBulkStagePlanRequest(base);
    const plan = buildBulkStagePlan(request, []);
    expect(plan.units.map((unit) => unit.stageId)).toEqual([
      'course-en-ru:lesson_outline:lesson-1:r1', 'course-en-ru:lesson_outline:lesson-2:r1', 'course-en-ru:lesson_outline:lesson-3:r1',
    ]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.progress).toEqual({ planned: 3, queued: 3, completed: 0, failed: 0 });
    expect(plan.planFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  test('normalizes explicit scopes and kind order for an identical fingerprint', () => {
    const a = buildBulkStagePlan(parseBulkStagePlanRequest({ ...base, lessonRange: undefined, scopes: ['topic-2', 'topic-1'], kinds: ['challenge_topic'] }), []);
    const b = buildBulkStagePlan(parseBulkStagePlanRequest({ ...base, lessonRange: undefined, scopes: ['topic-1', 'topic-2'], kinds: ['challenge_topic'] }), []);
    expect(a.planFingerprint).toBe(b.planFingerprint);
    expect(a.units.map((unit) => unit.stageId)).toEqual(b.units.map((unit) => unit.stageId));
  });

  test('caps expanded work at 100 stages and blueprint lesson 32', () => {
    expect(() => parseBulkStagePlanRequest({ ...base, lessonRange: { start: 1, end: 33 } })).toThrow('bulk_stage_lesson_range_invalid');
    expect(() => parseBulkStagePlanRequest({ ...base, lessonRange: { start: 1, end: 32 }, kinds: ['lesson_outline', 'lesson_phrases', 'lesson_vocabulary', 'lesson_theory'] })).toThrow('bulk_stage_plan_too_large');
  });

  test('returns a conflict instead of treating a newly queued prerequisite as approved', () => {
    const request = parseBulkStagePlanRequest({ ...base, kinds: ['lesson_outline', 'lesson_phrases'], lessonRange: { start: 1, end: 1 } });
    const plan = buildBulkStagePlan(request, []);
    expect(plan.units.map((unit) => unit.kind)).toEqual(['lesson_outline']);
    expect(plan.conflicts).toEqual([{ kind: 'lesson_phrases', scopeId: 'lesson-1', code: 'approved_prerequisite_missing', prerequisiteKind: 'lesson_outline' }]);
  });

  test('uses exactly one approved matching prerequisite and rejects ambiguous matches', () => {
    const request = parseBulkStagePlanRequest({ ...base, kinds: ['lesson_phrases'], lessonRange: { start: 1, end: 1 } });
    const approved = { stageId: 'outline-1', requestId: base.requestId, kind: 'lesson_outline' as const, scopeId: 'lesson-1', studyTarget: 'en', sourceLocale: 'ru', state: 'approved' as const, artifactId: 'artifact:outline-1' };
    expect(buildBulkStagePlan(request, [approved]).units[0]).toMatchObject({ prerequisiteArtifactIds: ['artifact:outline-1'] });
    expect(buildBulkStagePlan(request, [approved, { ...approved, stageId: 'outline-2', artifactId: 'artifact:outline-2' }]).conflicts[0]?.code).toBe('approved_prerequisite_ambiguous');
  });

  test('rejects conflicting scope modes and unsupported stage/scope combinations', () => {
    expect(() => parseBulkStagePlanRequest({ ...base, scopes: ['lesson-1'] })).toThrow('bulk_stage_scope_mode_invalid');
    expect(() => parseBulkStagePlanRequest({ ...base, lessonRange: undefined, scopes: ['topic-1'], kinds: ['lesson_outline'] })).toThrow('bulk_stage_scope_kind_invalid');
  });
});
