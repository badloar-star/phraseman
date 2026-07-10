import type { QuizDifficulty, QuizPhrase } from '../quiz_data';
import { loadCanonicalCourseReleaseSurfaceBundle, type CourseReleaseSurfaceBundleLoaderDeps } from './course_release_surface_bundle_loader';
import { quizRowsFromCourseSurfaceBundle, selectCourseReleaseQuizRows } from './course_release_quiz_runtime';
import type { CourseSurfaceBundleEnvelope } from './course_surface_bundle_client';

const CACHE_MAX_ENTRIES = 8;
const rowsByLocale = new Map<string, readonly QuizPhrase[]>();
const inFlight = new Map<string, Promise<void>>();

function key(studyTarget: string, learnerSourceLocale: string): string {
  return `${studyTarget}:${learnerSourceLocale}`;
}

function setRows(cacheKey: string, rows: readonly QuizPhrase[]): void {
  rowsByLocale.set(cacheKey, Object.freeze([...rows]));
  while (rowsByLocale.size > CACHE_MAX_ENTRIES) rowsByLocale.delete(rowsByLocale.keys().next().value as string);
}

export function primeCourseReleaseQuizRowsFromBundle(bundle: CourseSurfaceBundleEnvelope): readonly QuizPhrase[] {
  const rows = quizRowsFromCourseSurfaceBundle(bundle);
  setRows(key(bundle.studyTarget, bundle.learnerSourceLocale), rows);
  return rows;
}

export function getCachedCourseReleaseQuizRows(
  studyTarget: string,
  learnerSourceLocale: string,
  difficulty: QuizDifficulty,
  count: number,
): QuizPhrase[] {
  return selectCourseReleaseQuizRows(rowsByLocale.get(key(studyTarget, learnerSourceLocale)) ?? [], difficulty, count);
}

export async function ensureCourseReleaseQuizRows(
  studyTarget: string,
  learnerSourceLocale: string,
  deps?: CourseReleaseSurfaceBundleLoaderDeps,
): Promise<void> {
  const cacheKey = key(studyTarget, learnerSourceLocale);
  if (rowsByLocale.has(cacheKey)) return;
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;
  const task = loadCanonicalCourseReleaseSurfaceBundle({ studyTarget, learnerSourceLocale, surface: 'quiz' }, deps)
    .then((bundle) => { primeCourseReleaseQuizRowsFromBundle(bundle); })
    .finally(() => { inFlight.delete(cacheKey); });
  inFlight.set(cacheKey, task);
  return task;
}

export function prefetchCourseReleaseQuizRows(studyTarget: string, learnerSourceLocale: string): void {
  void ensureCourseReleaseQuizRows(studyTarget, learnerSourceLocale).catch(() => {});
}

export function __resetCourseReleaseQuizRuntimeForTests(): void {
  rowsByLocale.clear();
  inFlight.clear();
}
