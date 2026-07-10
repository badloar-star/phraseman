import { fetchPublishedCourseRelease } from './course_release_client';
import type { CanonicalReleaseSurface, CourseRelease } from './course_release_contract';
import { fetchPublishedCourseSurfaceBundle, type CourseSurfaceBundleEnvelope } from './course_surface_bundle_client';

export interface CourseReleaseSurfaceBundleLoaderDeps {
  readonly fetchRelease: (studyTarget: string, learnerSourceLocale: string) => Promise<CourseRelease>;
  readonly fetchBundle: (release: CourseRelease, surface: CanonicalReleaseSurface) => Promise<CourseSurfaceBundleEnvelope>;
}

const DEFAULT_DEPS: CourseReleaseSurfaceBundleLoaderDeps = {
  fetchRelease: fetchPublishedCourseRelease,
  fetchBundle: fetchPublishedCourseSurfaceBundle,
};

export async function loadCanonicalCourseReleaseSurfaceBundle(
  input: { studyTarget: string; learnerSourceLocale: string; surface: CanonicalReleaseSurface },
  deps: CourseReleaseSurfaceBundleLoaderDeps = DEFAULT_DEPS,
): Promise<CourseSurfaceBundleEnvelope> {
  const release = await deps.fetchRelease(input.studyTarget, input.learnerSourceLocale);
  if (release.studyTarget !== input.studyTarget || release.learnerSourceLocale !== input.learnerSourceLocale) throw new Error('course_release_identity_mismatch');
  const bundle = await deps.fetchBundle(release, input.surface);
  if (bundle.releaseId !== release.releaseId || bundle.studyTarget !== input.studyTarget || bundle.learnerSourceLocale !== input.learnerSourceLocale || bundle.surface !== input.surface) throw new Error('course_surface_bundle_identity_mismatch');
  return bundle;
}
