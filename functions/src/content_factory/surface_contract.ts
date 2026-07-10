import type { FactorySurface } from './contracts';

export interface GeneratedSurfaceItem {
  readonly id: string;
  readonly packId: string;
  readonly studyTarget: string;
  readonly lessonId: number;
  readonly surface: Extract<FactorySurface, 'quizzes' | 'cards' | 'arena_questions'>;
  readonly difficulty: 'beginner' | 'elementary' | 'intermediate' | 'advanced';
}

export function validateGeneratedSurfaceItem(item: GeneratedSurfaceItem): void {
  if (!item.id.trim() || !item.packId.trim() || !item.studyTarget.trim() || !Number.isInteger(item.lessonId) || item.lessonId < 1) {
    throw new Error('validation_failed');
  }
  if (!['quizzes', 'cards', 'arena_questions'].includes(item.surface)) throw new Error('surface_not_publishable');
}

export function assertSurfaceMatchesPack(item: GeneratedSurfaceItem, activePack: { packId: string; studyTarget: string }): void {
  if (item.packId !== activePack.packId || item.studyTarget !== activePack.studyTarget) throw new Error('cross_language_or_revision_mismatch');
}
