import type { FactorySurface } from './contracts';
import type { CanonicalReleaseSurface } from './course_release_contract';

const SURFACE_MAP: Readonly<Record<FactorySurface, CanonicalReleaseSurface>> = Object.freeze({
  lessons: 'lesson',
  vocabulary: 'lesson',
  drills: 'lesson',
  quizzes: 'quiz',
  cards: 'flashcard',
  arena_questions: 'arena',
});

export function canonicalizeFactorySurfaces(surfaces: readonly FactorySurface[]): readonly CanonicalReleaseSurface[] {
  return Object.freeze([...new Set(surfaces.map((surface) => SURFACE_MAP[surface]).filter(Boolean))]);
}

export function countLegacyGenerationUnits(lessonIds: readonly number[], surfaces: readonly FactorySurface[]): number {
  return lessonIds.length * canonicalizeFactorySurfaces(surfaces).length;
}

export function generationPlanFingerprint(lessonIds: readonly number[], surfaces: readonly FactorySurface[]): string {
  const normalizedLessonIds = [...new Set(lessonIds)].sort((left, right) => left - right);
  const normalizedSurfaces = [...canonicalizeFactorySurfaces(surfaces)].sort();
  return `legacy-v1:${normalizedLessonIds.join(',')}:${normalizedSurfaces.join(',')}`;
}
