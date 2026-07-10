import { adaptiveGenerationStoragePath, validateAdaptiveGenerationRequest } from './adaptive_contract';

describe('adaptive generation contract', () => {
  it('keeps generated practice user-scoped and bounded', () => {
    const input = { userId: 'u1', studyTarget: 'fr', surface: 'quiz' as const, sourceLessonIds: [1, 2], maxItems: 10, reason: 'repeated_mistakes' as const };
    validateAdaptiveGenerationRequest(input);
    expect(adaptiveGenerationStoragePath(input)).toBe('users/u1/adaptive_content/fr/quiz');
    expect(() => validateAdaptiveGenerationRequest({ ...input, maxItems: 21 })).toThrow('max_items_exceeded');
  });
});
