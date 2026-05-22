import {
  assertTargetKey,
  legacyEnglishKey,
  sourceTargetKey,
  targetKey,
  type TargetKeyDomain,
} from '../app/target_storage_keys';

describe('P1A target storage key contract', () => {
  it('produces distinct target keys for English and French', () => {
    expect(targetKey('lesson_progress', 'en', '1')).toBe('lesson_progress_v2::en::1');
    expect(targetKey('lesson_progress', 'fr', '1')).toBe('lesson_progress_v2::fr::1');
    expect(targetKey('lesson_progress', 'en', '1')).not.toBe(targetKey('lesson_progress', 'fr', '1'));
  });

  it('keeps sourceLocale as a separate key segment only where required', () => {
    expect(sourceTargetKey('personal_practice', 'fr', 'ru', 'diagnosis-1')).toBe('personal_practice_v2::fr::ru::diagnosis-1');
    expect(sourceTargetKey('personal_practice', 'fr', 'uk', 'diagnosis-1')).toBe('personal_practice_v2::fr::uk::diagnosis-1');
  });

  it('keeps legacy English keys visibly English-only', () => {
    expect(legacyEnglishKey('lesson_progress', '1')).toBe('lesson_progress_legacy_en::1');
    expect(legacyEnglishKey('lesson_progress', '1')).not.toContain('fr');
  });

  it('encodes reserved id characters without leaking separators', () => {
    const key = targetKey('lesson_progress', 'fr', 'lesson::1/a?b=c#d&e=%25');
    expect(key).toBe('lesson_progress_v2::fr::lesson%3A%3A1%2Fa%3Fb%3Dc%23d%26e%3D%2525');
    expect(key.split('::')).toHaveLength(3);
  });

  it('rejects empty ids and raw target-sensitive keys', () => {
    expect(() => targetKey('lesson_progress', 'fr', '')).toThrow(/Empty target key id/);
    expect(() => assertTargetKey('lesson_progress_v1')).toThrow(/Raw target-sensitive key/);
    expect(assertTargetKey(targetKey('flashcards' as TargetKeyDomain, 'fr'))).toBe('flashcards_v2::fr');
  });
});

