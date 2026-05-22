import {
  DEFAULT_STUDY_TARGET,
  SOURCE_LOCALES,
  STUDY_TARGETS,
  STUDY_TARGET_STORAGE_KEY,
  assertStudyTarget,
  defaultStudyTarget,
  isStudyTarget,
} from '../app/study_target';

describe('P1A production StudyTarget contract', () => {
  it('accepts only English and French production study targets', () => {
    expect(STUDY_TARGETS).toEqual(['en', 'fr']);
    expect(isStudyTarget('en')).toBe(true);
    expect(isStudyTarget('fr')).toBe(true);
    expect(isStudyTarget('es')).toBe(false);
    expect(() => assertStudyTarget('es')).toThrow(/Unsupported StudyTarget/);
  });

  it('keeps sourceLocale separate from studyTarget', () => {
    expect(SOURCE_LOCALES).toEqual(['ru', 'uk']);
    expect(DEFAULT_STUDY_TARGET).toBe('en');
    expect(defaultStudyTarget()).toBe('en');
    expect(STUDY_TARGET_STORAGE_KEY).toBe('study_target_v1');
  });
});

