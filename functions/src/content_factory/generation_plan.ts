import type { FactorySurface } from './contracts';
import type { CanonicalReleaseSurface } from './course_release_contract';

const SURFACE_MAP: Readonly<Partial<Record<FactorySurface, CanonicalReleaseSurface>>> = Object.freeze({
  lessons: 'lesson',
  vocabulary: 'lesson',
  drills: 'lesson',
  cards: 'flashcard',
});

export function canonicalizeFactorySurfaces(surfaces: readonly FactorySurface[]): readonly CanonicalReleaseSurface[] {
  const canonical = surfaces
    .map((surface) => SURFACE_MAP[surface])
    .filter((surface): surface is CanonicalReleaseSurface => surface !== undefined);
  return Object.freeze([...new Set(canonical)]);
}

export function countLegacyGenerationUnits(lessonIds: readonly number[], surfaces: readonly FactorySurface[]): number {
  return lessonIds.length * canonicalizeFactorySurfaces(surfaces).length;
}

export function generationPlanFingerprint(lessonIds: readonly number[], surfaces: readonly FactorySurface[]): string {
  const normalizedLessonIds = [...new Set(lessonIds)].sort((left, right) => left - right);
  const normalizedSurfaces = [...canonicalizeFactorySurfaces(surfaces)].sort();
  return `legacy-v1:${normalizedLessonIds.join(',')}:${normalizedSurfaces.join(',')}`;
}
