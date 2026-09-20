import type { LearningLanguageTarget } from './learning_language_contour';
import type { LearningLanguageSurface } from './learning_language_surface_matrix';

/** A surface can be absent while its language remains a valid global choice. */
export type LearningLanguageSurfaceStatus = 'ready' | 'preparing';

export type LearningLanguageSurfaceAvailability = Readonly<{
  target: LearningLanguageTarget;
  surface: LearningLanguageSurface;
  status: LearningLanguageSurfaceStatus;
  /** English substitution is forbidden for every target and every surface. */
  fallbackTarget: null;
}>;

export function languageRemainsSelectable(_target: LearningLanguageTarget): true {
  return true;
}

export function learningLanguageSurfaceAvailability(
  target: LearningLanguageTarget,
  surface: LearningLanguageSurface,
  status: LearningLanguageSurfaceStatus,
): LearningLanguageSurfaceAvailability {
  return Object.freeze({ target, surface, status, fallbackTarget: null });
}

export default function __LearningLanguageSurfaceAvailabilityRouteShim() {
  return null;
}
