import type { CanonicalReleaseSurface } from './course_release_contract';
import type { GenerationStageKind, GenerationStageState } from './stage_contracts';

const KIND_MAP: Readonly<Record<CanonicalReleaseSurface, GenerationStageKind>> = Object.freeze({ lesson: 'lesson_phrases', quiz: 'quiz_questions', flashcard: 'flashcard_items', arena: 'arena_questions' });

export interface LegacyGenerationUnitInput {
  readonly unitId: string;
  readonly jobId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly surface: CanonicalReleaseSurface;
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
  const state: GenerationStageState = unit.state === 'succeeded' ? 'approved' : unit.state === 'running' ? 'running' : unit.state === 'failed' ? 'failed' : unit.state === 'generated' ? 'needs_review' : 'queued';
  return Object.freeze({
    legacy: true,
    legacyUnitId: unit.unitId,
    stageKind: KIND_MAP[unit.surface],
    scopeId: `lesson-${unit.lessonId}`,
    state,
    bundledSections: Object.freeze(unit.surface === 'lesson' ? ['vocabulary', 'drills'] : []),
  });
}
