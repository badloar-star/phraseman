import type { CardItem } from '../flashcards/types';
import { loadCanonicalCourseReleaseSurfaceBundle, type CourseReleaseSurfaceBundleLoaderDeps } from './course_release_surface_bundle_loader';
import { flashcardRowsFromCourseSurfaceBundle } from './course_release_flashcard_runtime';
import type { CourseSurfaceBundleEnvelope } from './course_surface_bundle_client';

const CACHE_MAX_ENTRIES = 8;
const cardsByLocale = new Map<string, readonly CardItem[]>();
const inFlight = new Map<string, Promise<void>>();

function key(studyTarget: string, learnerSourceLocale: string): string {
  return `${studyTarget}:${learnerSourceLocale}`;
}

function setCards(cacheKey: string, cards: readonly CardItem[]): void {
  cardsByLocale.set(cacheKey, Object.freeze([...cards]));
  while (cardsByLocale.size > CACHE_MAX_ENTRIES) cardsByLocale.delete(cardsByLocale.keys().next().value as string);
}

export function primeCourseReleaseFlashcardsFromBundle(bundle: CourseSurfaceBundleEnvelope): readonly CardItem[] {
  const cards = flashcardRowsFromCourseSurfaceBundle(bundle);
  setCards(key(bundle.studyTarget, bundle.learnerSourceLocale), cards);
  return cards;
}

export function getCachedCourseReleaseFlashcards(studyTarget: string, learnerSourceLocale: string): CardItem[] {
  return [...(cardsByLocale.get(key(studyTarget, learnerSourceLocale)) ?? [])];
}

export async function ensureCourseReleaseFlashcards(
  studyTarget: string,
  learnerSourceLocale: string,
  deps?: CourseReleaseSurfaceBundleLoaderDeps,
): Promise<void> {
  const cacheKey = key(studyTarget, learnerSourceLocale);
  if (cardsByLocale.has(cacheKey)) return;
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;
  const task = loadCanonicalCourseReleaseSurfaceBundle({ studyTarget, learnerSourceLocale, surface: 'flashcard' }, deps)
    .then((bundle) => { primeCourseReleaseFlashcardsFromBundle(bundle); })
    .finally(() => { inFlight.delete(cacheKey); });
  inFlight.set(cacheKey, task);
  return task;
}

export function prefetchCourseReleaseFlashcards(studyTarget: string, learnerSourceLocale: string): void {
  void ensureCourseReleaseFlashcards(studyTarget, learnerSourceLocale).catch(() => {});
}

export function __resetCourseReleaseFlashcardRuntimeForTests(): void {
  cardsByLocale.clear();
  inFlight.clear();
}
