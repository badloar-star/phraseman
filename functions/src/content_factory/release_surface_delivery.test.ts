import {
  parseCourseSurfaceBundleRequest,
  parseCourseSurfaceEntryRequest,
  parseHashedJsonBytes,
  resolveIndexedCourseUnit,
  resolveIndexedCourseUnits,
} from './release_surface_delivery';
import { createHash } from 'node:crypto';

const hash = 'a'.repeat(64);

describe('course release surface delivery', () => {
  it('parses an exact target/source/release surface request', () => {
    expect(parseCourseSurfaceEntryRequest({ studyTarget: 'fr', learnerSourceLocale: 'ru', releaseId: 'fr-ru-r1', surface: 'lesson', lessonId: 2 })).toEqual({ studyTarget: 'fr', learnerSourceLocale: 'ru', releaseId: 'fr-ru-r1', surface: 'lesson', lessonId: 2 });
    expect(() => parseCourseSurfaceEntryRequest({ studyTarget: '../fr', learnerSourceLocale: 'ru', releaseId: 'r1', surface: 'lesson', lessonId: 1 })).toThrow('course_surface_request_invalid');
  });

  it('resolves only a byte-addressed unit from the exact release index', () => {
    const unit = resolveIndexedCourseUnit({ releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', units: [{ lessonId: 2, objectPath: 'course-releases/fr-ru-r1/lesson/2.json', contentHash: hash, objectGeneration: 'g2' }] }, { releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 2 });
    expect(unit).toEqual({ lessonId: 2, objectPath: 'course-releases/fr-ru-r1/lesson/2.json', contentHash: hash, objectGeneration: 'g2' });
  });

  it('resolves a complete surface bundle in lesson order without losing identity', () => {
    const request = parseCourseSurfaceBundleRequest({ studyTarget: 'de', learnerSourceLocale: 'ru', releaseId: 'de-ru-r1', surface: 'quiz' });
    const units = resolveIndexedCourseUnits({
      ...request,
      units: [
        { lessonId: 2, objectPath: 'course-releases/de-ru-r1/quiz/2.json', contentHash: hash, objectGeneration: 'g2' },
        { lessonId: 1, objectPath: 'course-releases/de-ru-r1/quiz/1.json', contentHash: hash, objectGeneration: 'g1' },
      ],
    }, request);
    expect(units.map((unit) => unit.lessonId)).toEqual([1, 2]);
  });

  it('rejects mixed identity, duplicate lesson entries and unsafe paths', () => {
    const request = { releaseId: 'fr-ru-r1', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson' as const, lessonId: 2 };
    expect(() => resolveIndexedCourseUnit({ ...request, units: [{ lessonId: 2, objectPath: '../escape.json', contentHash: hash, objectGeneration: 'g2' }] }, request)).toThrow('course_surface_index_invalid');
    expect(() => resolveIndexedCourseUnit({ ...request, studyTarget: 'de', units: [] }, request)).toThrow('course_surface_index_identity_mismatch');
    const duplicate = { lessonId: 2, objectPath: 'course-releases/fr-ru-r1/lesson/2.json', contentHash: hash, objectGeneration: 'g2' };
    expect(() => resolveIndexedCourseUnit({ ...request, units: [duplicate, duplicate] }, request)).toThrow('course_surface_index_duplicate_lesson');
  });

  it('parses JSON only when downloaded bytes match the immutable SHA-256 receipt', () => {
    const bytes = Buffer.from('{"ok":true}', 'utf8');
    const expected = createHash('sha256').update(bytes).digest('hex');
    expect(parseHashedJsonBytes(bytes, expected)).toEqual({ ok: true });
    expect(() => parseHashedJsonBytes(bytes, '0'.repeat(64))).toThrow('course_surface_hash_mismatch');
  });
});
