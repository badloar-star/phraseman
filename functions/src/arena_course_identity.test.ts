import { normalizeArenaCourseIdentity, sameArenaCourseIdentity } from './arena_course_identity';

describe('arena course identity', () => {
  it('matches players only when target, source and release are identical', () => {
    const a = { studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' };
    expect(sameArenaCourseIdentity(a, { ...a })).toBe(true);
    expect(sameArenaCourseIdentity(a, { ...a, learnerSourceLocale: 'uk' })).toBe(false);
    expect(sameArenaCourseIdentity(a, { ...a, courseReleaseId: 'de-ru-r2' })).toBe(false);
  });

  it('keeps legacy queue entries backward-compatible but isolated', () => {
    expect(normalizeArenaCourseIdentity({})).toEqual({ studyTarget: 'en', learnerSourceLocale: 'ru', courseReleaseId: 'legacy-en-v1' });
    expect(sameArenaCourseIdentity({}, { studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'de-ru-r1' })).toBe(false);
    expect(() => normalizeArenaCourseIdentity({ studyTarget: 'de', learnerSourceLocale: 'ru', courseReleaseId: 'legacy-de-v1' })).toThrow('arena_course_identity_invalid');
  });
});
