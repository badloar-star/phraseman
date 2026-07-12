import { parseCourseSurfaceBundleEnvelope } from '../app/language_runtime/course_surface_bundle_client';

const hash = 'a'.repeat(64);

describe('course release surface bundle client', () => {
  it('keeps one exact release identity on every bundled lesson payload', () => {
    const bundle = parseCourseSurfaceBundleEnvelope({
      releaseId: 'de-ru-r1',
      studyTarget: 'de',
      learnerSourceLocale: 'ru',
      surface: 'quiz',
      entries: [
        { lessonId: 2, contentHash: hash, payload: { lessonId: 2, surface: 'quiz', items: [] } },
        { lessonId: 1, contentHash: hash, payload: { lessonId: 1, surface: 'quiz', items: [] } },
      ],
    });
    expect(bundle.entries.map((entry) => entry.lessonId)).toEqual([1, 2]);
    expect(bundle).toMatchObject({ releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru', surface: 'quiz' });
  });

  it('rejects duplicate lessons and payload identity drift', () => {
    const base = { releaseId: 'de-ru-r1', studyTarget: 'de', learnerSourceLocale: 'ru', surface: 'quiz', contentHash: hash };
    expect(() => parseCourseSurfaceBundleEnvelope({ ...base, entries: [
      { lessonId: 1, contentHash: hash, payload: { lessonId: 1 } },
      { lessonId: 1, contentHash: hash, payload: { lessonId: 1 } },
    ] })).toThrow('course_surface_bundle_duplicate_lesson');
    expect(() => parseCourseSurfaceBundleEnvelope({ ...base, entries: [
      { lessonId: 1, contentHash: hash, payload: { lessonId: 2 } },
    ] })).toThrow('course_surface_bundle_payload_identity_mismatch');
  });
});
