import { adaptiveGenerationStoragePath, validateAdaptiveGenerationRequest } from './adaptive_contract';

describe('adaptive generation contract', () => {
  it('keeps generated practice user-scoped and bounded', () => {
    const input = { userId: 'u1', studyTarget: 'fr', surface: 'quiz' as const, sourceLessonIds: [1, 2], maxItems: 10, reason: 'repeated_mistakes' as const, activePackRevision: 4, expiresAt: new Date(Date.now() + 60_000).toISOString() };
    validateAdaptiveGenerationRequest(input);
    expect(adaptiveGenerationStoragePath(input)).toBe('users/u1/adaptive_content/fr/quiz/r4');
    expect(() => validateAdaptiveGenerationRequest({ ...input, maxItems: 21 })).toThrow('max_items_exceeded');
    expect(() => validateAdaptiveGenerationRequest({ ...input, userId: '../u1' })).toThrow('validation_failed');
  });
});
