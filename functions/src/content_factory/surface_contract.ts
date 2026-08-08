import type { FactorySurface } from './contracts';

export interface GeneratedSurfaceItem {
  readonly id: string;
  readonly packId: string;
  readonly revision: number;
  readonly contentHash: string;
  readonly sourceLocale: string;
  readonly studyTarget: string;
  readonly lessonId: number;
  readonly surface: Extract<FactorySurface, 'cards'>;
  readonly difficulty: 'beginner' | 'elementary' | 'intermediate' | 'advanced';
}

export function validateGeneratedSurfaceItem(item: GeneratedSurfaceItem): void {
  if (!item.id.trim() || !item.packId.trim() || !item.studyTarget.trim() || !item.sourceLocale.trim() || !item.contentHash.trim() || !Number.isInteger(item.revision) || item.revision < 1 || !Number.isInteger(item.lessonId) || item.lessonId < 1) {
    throw new Error('validation_failed');
  }
  if (item.surface !== 'cards') throw new Error('surface_not_publishable');
}

export function assertSurfaceMatchesPack(item: GeneratedSurfaceItem, activePack: { packId: string; studyTarget: string; revision: number; contentHash: string; sourceLocale: string }): void {
  if (item.packId !== activePack.packId || item.studyTarget !== activePack.studyTarget || item.revision !== activePack.revision || item.contentHash !== activePack.contentHash || item.sourceLocale !== activePack.sourceLocale) throw new Error('cross_language_or_revision_mismatch');
}
