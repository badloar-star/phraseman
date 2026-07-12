import type { LessonPhrase } from '../lesson_data_types';
import { fetchPublishedCourseRelease } from './course_release_client';
import type { CourseRelease } from './course_release_contract';
import { lessonRowsFromCourseReleasePayload } from './course_release_lesson_runtime';
import { fetchPublishedCourseSurfaceEntry, type CourseSurfaceEntryEnvelope } from './course_surface_client';

export interface CourseReleaseLessonLoaderDeps {
  readonly fetchRelease: (studyTarget: string, learnerSourceLocale: string) => Promise<CourseRelease>;
  readonly fetchEntry: (release: CourseRelease, surface: 'lesson', lessonId: number) => Promise<CourseSurfaceEntryEnvelope>;
}

const DEFAULT_DEPS: CourseReleaseLessonLoaderDeps = {
  fetchRelease: fetchPublishedCourseRelease,
  fetchEntry: fetchPublishedCourseSurfaceEntry,
};

export async function loadCanonicalCourseReleaseLessonRows(
  input: { studyTarget: string; learnerSourceLocale: string; lessonId: number },
  deps: CourseReleaseLessonLoaderDeps = DEFAULT_DEPS,
): Promise<LessonPhrase[]> {
  const release = await deps.fetchRelease(input.studyTarget, input.learnerSourceLocale);
  if (release.studyTarget !== input.studyTarget || release.learnerSourceLocale !== input.learnerSourceLocale) throw new Error('course_release_identity_mismatch');
  const entry = await deps.fetchEntry(release, 'lesson', input.lessonId);
  if (entry.releaseId !== release.releaseId || entry.studyTarget !== input.studyTarget || entry.learnerSourceLocale !== input.learnerSourceLocale || entry.surface !== 'lesson' || entry.lessonId !== input.lessonId) throw new Error('course_surface_identity_mismatch');
  return lessonRowsFromCourseReleasePayload(entry.payload, input);
}
