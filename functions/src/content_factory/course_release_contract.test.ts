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
  it('accepts one release containing every supported identity-bound surface', () => {
    expect(validateCourseRelease(release)).toEqual({ ok: true, errors: [] });
  });

  it('rejects mixed target/source/release artifacts and blueprint confusion', () => {
    expect(validateCourseRelease({ ...release, blueprintLocale: 'ru' }).errors).toContain('blueprint_locale_must_be_en');
    expect(validateCourseRelease({ ...release, artifacts: { ...release.artifacts, lesson: { ...release.artifacts.lesson, studyTarget: 'es' } } }).errors).toContain('artifact_identity_mismatch');
    expect(validateCourseRelease({ ...release, artifacts: { ...release.artifacts, flashcard: { ...release.artifacts.flashcard, contentHash: 'bad' } } }).errors).toContain('artifact_hash_invalid');
  });

  it('rejects artifacts for surfaces outside the current release contract', () => {
    expect(validateCourseRelease({
      ...release,
      artifacts: {
        ...release.artifacts,
        retired: { ...release.artifacts.lesson, surface: 'retired' },
      },
    }).errors).toContain('artifact_surface_unsupported');
  });
});
