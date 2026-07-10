import { parseCourseSurfaceEntryEnvelope } from '../app/language_runtime/course_surface_client';

const hash = 'a'.repeat(64);

describe('course release surface client', () => {
  it('keeps release, target, source, surface and lesson identity attached to payload', () => {
    expect(parseCourseSurfaceEntryEnvelope({ releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 1, contentHash: hash, payload: { lessonId: 1, phrases: [] } })).toMatchObject({ releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 1 });
  });

  it('rejects a malformed hash or mismatched payload lesson', () => {
    expect(() => parseCourseSurfaceEntryEnvelope({ releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 1, contentHash: 'bad', payload: {} })).toThrow('course_surface_envelope_invalid');
    expect(() => parseCourseSurfaceEntryEnvelope({ releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 1, contentHash: hash, payload: { lessonId: 2 } })).toThrow('course_surface_payload_identity_mismatch');
  });
});
