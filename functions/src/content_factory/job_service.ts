import type { FactorySurface } from './contracts';
import type { CanonicalReleaseSurface } from './course_release_contract';

export type GenerationUnitState = 'queued' | 'running' | 'succeeded' | 'failed';

export interface GenerationUnit {
  readonly unitId: string;
  readonly jobId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly surface: CanonicalReleaseSurface;
  readonly lessonId: number;
  readonly state: GenerationUnitState;
  readonly attempts: number;
}

const SURFACE_MAP: Readonly<Record<FactorySurface, CanonicalReleaseSurface>> = {
  lessons: 'lesson', vocabulary: 'lesson', drills: 'lesson', quizzes: 'quiz', cards: 'flashcard', arena_questions: 'arena',
};

export function splitGenerationJob(input: {
  jobId: string;
  studyTarget: string;
  learnerSourceLocale: string;
  lessonIds: readonly number[];
  surfaces: readonly FactorySurface[];
}): GenerationUnit[] {
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(input.jobId) || !input.studyTarget.trim() || !input.learnerSourceLocale.trim()) throw new Error('generation_job_identity_invalid');
  const surfaces = [...new Set(input.surfaces.map((surface) => SURFACE_MAP[surface]).filter(Boolean))];
  const units: GenerationUnit[] = [];
  for (const surface of surfaces) {
    for (const lessonId of input.lessonIds) {
      if (!Number.isInteger(lessonId) || lessonId < 1 || lessonId > 100) throw new Error('generation_lesson_id_invalid');
      units.push({ unitId: `${input.jobId}:${surface}:${lessonId}`, jobId: input.jobId, studyTarget: input.studyTarget, learnerSourceLocale: input.learnerSourceLocale, surface, lessonId, state: 'queued', attempts: 0 });
    }
  }
  return units;
}

export function summarizeUnitProgress(units: readonly GenerationUnit[]): { total: number; completed: number; failed: number; queued: number; running: number } {
  return {
    total: units.length,
    completed: units.filter((unit) => unit.state === 'succeeded').length,
    failed: units.filter((unit) => unit.state === 'failed').length,
    queued: units.filter((unit) => unit.state === 'queued').length,
    running: units.filter((unit) => unit.state === 'running').length,
  };
}
