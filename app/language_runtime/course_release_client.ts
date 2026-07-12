import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { parseCourseRelease, type CourseRelease } from './course_release_contract';

const FUNCTIONS_REGION = 'us-central1';
const inFlight = new Map<string, Promise<CourseRelease>>();

export async function fetchPublishedCourseRelease(studyTarget: string, learnerSourceLocale: string): Promise<CourseRelease> {
  if (!/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(studyTarget) || !/^[a-z]{2,12}(?:-[A-Z]{2})?$/.test(learnerSourceLocale)) throw new Error('course_release_request_invalid');
  const key = `${studyTarget}:${learnerSourceLocale}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const request = httpsCallable(getFunctions(getApp(), FUNCTIONS_REGION), 'getPublishedCourseRelease')({ studyTarget, learnerSourceLocale })
    .then((result) => {
      const release = parseCourseRelease(result.data);
      if (release.studyTarget !== studyTarget || release.learnerSourceLocale !== learnerSourceLocale) throw new Error('course_release_identity_mismatch');
      return release;
    })
    .finally(() => { inFlight.delete(key); });
  if (inFlight.size >= 20) inFlight.delete(inFlight.keys().next().value as string);
  inFlight.set(key, request);
  return request;
}
