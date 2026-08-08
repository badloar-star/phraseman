import type { GenerationStageKind, GenerationStageState } from './stage_contracts';

const KIND_MAP: Readonly<Record<string, GenerationStageKind | undefined>> = Object.freeze({
  lesson: 'lesson_phrases',
  flashcard: 'flashcard_items',
});

export interface LegacyGenerationUnitInput {
  readonly unitId: string;
  readonly jobId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly surface: string;
  readonly lessonId: number;
  readonly state: string;
  readonly attempts: number;
}

export function adaptLegacyGenerationUnit(unit: LegacyGenerationUnitInput): Readonly<{
  legacy: true;
  legacyUnitId: string;
  stageKind: GenerationStageKind;
  scopeId: string;
  state: GenerationStageState;
  bundledSections: readonly string[];
}> {
  const stageKind = KIND_MAP[unit.surface];
  if (!stageKind) throw new Error('legacy_stage_surface_retired');
  const state: GenerationStageState = unit.state === 'succeeded' ? 'approved' : unit.state === 'running' ? 'running' : unit.state === 'failed' ? 'failed' : unit.state === 'generated' ? 'needs_review' : 'queued';
  return Object.freeze({
    legacy: true,
    legacyUnitId: unit.unitId,
    stageKind,
    scopeId: `lesson-${unit.lessonId}`,
    state,
    bundledSections: Object.freeze(unit.surface === 'lesson' ? ['vocabulary', 'drills'] : []),
  });
}
