import type { SourceLocale } from './source_locales';
import type { StudyTarget } from './study_target';
import type { CoursePackManifest, CoursePackSurface } from './course_pack_manifest';
import { isCoursePackSurface } from './course_pack_manifest';
import { normalizeSourceLocale } from './source_locales';
import { isStudyTarget } from './study_target';

export type CoursePackDeliveryMode = 'bundled_compatibility' | 'downloadable';

export type CoursePackAvailabilityIndexEntry = {
  studyTarget: StudyTarget;
  sourceLocale: SourceLocale;
  surface: CoursePackSurface;
  delivery: CoursePackDeliveryMode;
  activationApproved: false;
  manifest?: CoursePackManifest;
};

export type CoursePackAvailabilityRequest = {
  studyTarget: unknown;
  sourceLocale: unknown;
  surface: unknown;
};

const BUNDLED_COMPATIBILITY_SURFACES = [
  'lesson',
  'lesson_intro',
  'quiz',
  'plan_content',
] as const satisfies readonly CoursePackSurface[];

function makeBundledCompatibilityEntry(
  sourceLocale: Extract<SourceLocale, 'ru' | 'uk'>,
  surface: (typeof BUNDLED_COMPATIBILITY_SURFACES)[number],
): CoursePackAvailabilityIndexEntry {
  return {
    studyTarget: 'en',
    sourceLocale,
    surface,
    delivery: 'bundled_compatibility',
    activationApproved: false,
  };
}

export const EMBEDDED_COURSE_PACK_INDEX: readonly CoursePackAvailabilityIndexEntry[] = Object.freeze(
  (['ru', 'uk'] as const).flatMap((sourceLocale) =>
    BUNDLED_COMPATIBILITY_SURFACES.map((surface) =>
      makeBundledCompatibilityEntry(sourceLocale, surface),
    ),
  ),
);

export function findEmbeddedCoursePackIndexEntry(
  request: CoursePackAvailabilityRequest,
): CoursePackAvailabilityIndexEntry | null {
  if (!isStudyTarget(request.studyTarget)) return null;
  const sourceLocale = normalizeSourceLocale(request.sourceLocale);
  if (!sourceLocale) return null;
  if (!isCoursePackSurface(request.surface)) return null;

  return EMBEDDED_COURSE_PACK_INDEX.find((entry) =>
    entry.studyTarget === request.studyTarget &&
    entry.sourceLocale === sourceLocale &&
    entry.surface === request.surface,
  ) ?? null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __CoursePackIndexRouteShim() {
  return null;
}
