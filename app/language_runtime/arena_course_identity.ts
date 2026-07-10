import { fetchPublishedCourseRelease } from './course_release_client';
import type { CourseRelease } from './course_release_contract';

export interface ArenaCourseIdentity {
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly courseReleaseId: string;
}

export async function resolveArenaCourseIdentity(
  studyTarget: string,
  learnerSourceLocale: string,
  fetchRelease: (studyTarget: string, learnerSourceLocale: string) => Promise<CourseRelease> = fetchPublishedCourseRelease,
): Promise<ArenaCourseIdentity> {
  if (!/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(studyTarget) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(learnerSourceLocale)) throw new Error('arena_course_identity_invalid');
  if (studyTarget === 'en' || studyTarget === 'es') {
    return Object.freeze({ studyTarget, learnerSourceLocale, courseReleaseId: `legacy-${studyTarget}-v1` });
  }
  const release = await fetchRelease(studyTarget, learnerSourceLocale);
  if (release.studyTarget !== studyTarget || release.learnerSourceLocale !== learnerSourceLocale || !release.artifacts.arena) throw new Error('arena_course_identity_mismatch');
  return Object.freeze({ studyTarget, learnerSourceLocale, courseReleaseId: release.releaseId });
}
