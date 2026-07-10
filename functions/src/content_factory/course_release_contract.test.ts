import { CANONICAL_RELEASE_SURFACES, validateCourseRelease, type CourseRelease } from './course_release_contract';

const hash = 'a'.repeat(64);
const release: CourseRelease = {
  releaseId: 'fr-ru-release-0001', studyTarget: 'fr', learnerSourceLocale: 'ru', blueprintId: 'english-core-32', blueprintLocale: 'en', blueprintHash: hash,
  schemaVersion: 'course-release-v1', contentVersion: '2026.07.10.1', createdAt: '2026-07-10T00:00:00.000Z', minAppVersion: '1.0.0',
  artifacts: Object.fromEntries(CANONICAL_RELEASE_SURFACES.map((surface) => [surface, {
    releaseId: 'fr-ru-release-0001', studyTarget: 'fr', learnerSourceLocale: 'ru', surface, contentHash: hash, objectGeneration: 'g1', byteSize: 100, entryIndex: 'index.json',
  }])) as CourseRelease['artifacts'],
};

describe('canonical immutable course release', () => {
  it('accepts one release containing all four identity-bound surfaces', () => {
    expect(validateCourseRelease(release)).toEqual({ ok: true, errors: [] });
  });

  it('rejects mixed target/source/release artifacts and blueprint confusion', () => {
    expect(validateCourseRelease({ ...release, blueprintLocale: 'ru' }).errors).toContain('blueprint_locale_must_be_en');
    expect(validateCourseRelease({ ...release, artifacts: { ...release.artifacts, arena: { ...release.artifacts.arena, studyTarget: 'es' } } }).errors).toContain('artifact_identity_mismatch');
    expect(validateCourseRelease({ ...release, artifacts: { ...release.artifacts, quiz: { ...release.artifacts.quiz, contentHash: 'bad' } } }).errors).toContain('artifact_hash_invalid');
  });
});
