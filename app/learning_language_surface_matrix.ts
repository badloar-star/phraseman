export const LEARNING_LANGUAGE_TARGETS = ['en', 'es', 'fr', 'de'] as const;
export type LearningLanguageTarget = (typeof LEARNING_LANGUAGE_TARGETS)[number];

export const LEARNING_LANGUAGE_SURFACES = [
  'lessons',
  'learning_v2',
  'daily_phrase',
  'dialogues',
  'arena',
  'videos',
  'flashcards',
  'diagnostic_and_exam',
] as const;
export type LearningLanguageSurface = (typeof LEARNING_LANGUAGE_SURFACES)[number];

export function requiredLearningLanguageSurfaces(): readonly LearningLanguageSurface[] {
  return LEARNING_LANGUAGE_SURFACES;
}

export default function __LearningLanguageSurfaceMatrixRouteShim() {
  return null;
}
