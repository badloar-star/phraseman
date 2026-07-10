export type AdaptiveSurface = 'practice' | 'quiz' | 'cards';

export interface AdaptiveGenerationRequest {
  readonly userId: string;
  readonly studyTarget: string;
  readonly surface: AdaptiveSurface;
  readonly sourceLessonIds: readonly number[];
  readonly maxItems: number;
  readonly reason: 'repeated_mistakes' | 'spaced_repetition' | 'arena_review';
}

export function validateAdaptiveGenerationRequest(input: AdaptiveGenerationRequest): void {
  if (!input.userId.trim() || !input.studyTarget.trim() || input.sourceLessonIds.length === 0) throw new Error('validation_failed');
  if (!Number.isInteger(input.maxItems) || input.maxItems < 1 || input.maxItems > 20) throw new Error('max_items_exceeded');
}

/** User-adaptive generation is ephemeral practice only; it cannot publish lessons or theory. */
export function adaptiveGenerationStoragePath(input: AdaptiveGenerationRequest): string {
  validateAdaptiveGenerationRequest(input);
  return `users/${input.userId}/adaptive_content/${input.studyTarget}/${input.surface}`;
}
