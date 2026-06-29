import fs from 'fs';
import path from 'path';

import {
  buildCoursePackCacheKey,
  COURSE_PACK_CACHE_STATES,
  COURSE_PACK_SCHEMA_VERSION,
  validateCoursePackManifest,
  type CoursePackManifest,
} from '../app/course_pack_manifest';
import { EMBEDDED_COURSE_PACK_INDEX } from '../app/course_pack_index';
import {
  resolveCoursePackReadiness,
} from '../app/course_pack_loader';

const ROOT = path.resolve(__dirname, '..');
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function validManifest(overrides: Partial<CoursePackManifest> = {}): CoursePackManifest {
  return {
    packId: 'en.ru.quiz.v1',
    studyTarget: 'en',
    sourceLocale: 'ru',
    surface: 'quiz',
    schemaVersion: COURSE_PACK_SCHEMA_VERSION,
    contentVersion: '2026.06.26',
    minAppVersion: '1.5.43',
    sha256: HASH_A,
    byteSize: 1024,
    createdAt: '2026-06-26T00:00:00.000Z',
    dependencies: [],
    entryIndex: 'quiz/index.json',
    ...overrides,
  };
}

describe('course pack runtime contract', () => {
  it('accepts the minimum P1 manifest schema', () => {
    expect(validateCoursePackManifest(validManifest())).toEqual({ ok: true, errors: [] });
  });

  it('fails closed for unknown language dimensions and unsafe manifest paths', () => {
    const result = validateCoursePackManifest(validManifest({
      studyTarget: 'de' as never,
      sourceLocale: 'pt_BR' as never,
      entryIndex: '../quiz/index.json',
      sha256: 'not-a-hash',
    }));

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      'studyTarget must be an explicit supported StudyTarget',
      'sourceLocale must be an explicit normalized SourceLocale',
      'entryIndex must be a safe relative index path',
      'sha256 must be a 64 character hex digest',
    ]));
  });

  it('fails closed when packId identity does not match study target, source locale and surface', () => {
    const mixedIdentity = validateCoursePackManifest(validManifest({
      packId: 'en.ru.quiz.v1',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      surface: 'quiz',
    }));

    expect(mixedIdentity.ok).toBe(false);
    expect(mixedIdentity.errors).toContain('packId must start with studyTarget.sourceLocale.surface');

    expect(validateCoursePackManifest(validManifest({
      packId: 'fr.ru.quiz.v1',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      surface: 'quiz',
    }))).toEqual({ ok: true, errors: [] });
  });

  it('isolates cache keys by target, source locale, surface, schema, version and hash', () => {
    const base = validManifest();
    const keys = new Set([
      buildCoursePackCacheKey(base),
      buildCoursePackCacheKey(validManifest({ sourceLocale: 'uk' })),
      buildCoursePackCacheKey(validManifest({ studyTarget: 'fr' })),
      buildCoursePackCacheKey(validManifest({ surface: 'lesson' })),
      buildCoursePackCacheKey(validManifest({ schemaVersion: 'course-pack-v2' })),
      buildCoursePackCacheKey(validManifest({ contentVersion: '2026.06.27' })),
      buildCoursePackCacheKey(validManifest({ sha256: HASH_B })),
    ]);

    expect(keys.size).toBe(7);
  });

  it('defines all P1 cache states explicitly', () => {
    expect([...COURSE_PACK_CACHE_STATES]).toEqual([
      'missing',
      'downloading',
      'ready',
      'corrupt',
      'stale',
      'offline_fallback',
    ]);
  });

  it('keeps the embedded index tiny and non-activating', () => {
    expect(EMBEDDED_COURSE_PACK_INDEX.length).toBeGreaterThan(0);
    expect(EMBEDDED_COURSE_PACK_INDEX.every((entry) => entry.activationApproved === false)).toBe(true);
    expect(EMBEDDED_COURSE_PACK_INDEX.every((entry) => entry.delivery === 'bundled_compatibility')).toBe(true);
    expect(EMBEDDED_COURSE_PACK_INDEX.some((entry) => entry.studyTarget !== 'en')).toBe(false);
  });

  it('keeps the embedded plan_content index bundled-only even with remote loading enabled', () => {
    // Remote loading is now enabled, but the EMBEDDED index must still describe
    // plan_content as bundled compatibility with no attached manifest: the server
    // pack is fetched via the separate flag-gated registration, NOT this index, so
    // the bundled copy always remains the integrity/offline fallback.
    const planContentEntries = EMBEDDED_COURSE_PACK_INDEX.filter((entry) => entry.surface === 'plan_content');

    expect(planContentEntries.length).toBeGreaterThan(0);
    expect(planContentEntries.every((entry) => entry.delivery === 'bundled_compatibility')).toBe(true);
    expect(planContentEntries.every((entry) => entry.activationApproved === false)).toBe(true);
    expect(planContentEntries.every((entry) => entry.manifest === undefined)).toBe(true);
  });

  it('requires explicit source and target selection before readiness can resolve', () => {
    expect(resolveCoursePackReadiness({
      studyTarget: 'en',
      sourceLocale: 'ru',
      surface: 'quiz',
      selectionConfirmed: false,
    })).toEqual({
      state: 'missing',
      reason: 'selection_required',
    });

    expect(resolveCoursePackReadiness({
      studyTarget: 'en',
      sourceLocale: 'ru',
      surface: 'quiz',
      selectionConfirmed: true,
    })).toEqual({
      state: 'offline_fallback',
      delivery: 'bundled_compatibility',
      reason: 'bundled_compatibility_until_pack_extraction',
    });
  });

  it('keeps French downloadable surfaces missing until an approved French index entry exists', () => {
    for (const surface of ['lesson', 'lesson_intro', 'quiz', 'plan_content'] as const) {
      expect(resolveCoursePackReadiness({
        studyTarget: 'fr',
        sourceLocale: 'ru',
        surface,
        selectionConfirmed: true,
      })).toEqual({
        state: 'missing',
        reason: 'no_index_entry',
      });
    }
  });

  it('does not connect the pack loader to startup or network modules', () => {
    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8').replace(/\\/g, '/'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/course_pack_(manifest|index|loader)|CoursePack/i);
    }

    const loaderSource = fs.readFileSync(path.join(ROOT, 'app', 'course_pack_loader.ts'), 'utf8');
    expect(loaderSource).not.toMatch(/firebase|firestore|storage\(\)|fetch\(|XMLHttpRequest|expo-file-system|AsyncStorage/i);
  });
});
