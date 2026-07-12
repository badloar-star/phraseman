import { splitGenerationJob, summarizeUnitProgress, type GenerationUnit } from './job_service';
import { createGenerationJob, type FactorySurface } from './contracts';

describe('resumable generation units', () => {
  it('splits a bounded job into stable surface/lesson units without duplicates', () => {
    const units = splitGenerationJob({ jobId: 'job-1', studyTarget: 'fr', learnerSourceLocale: 'ru', lessonIds: [1, 2], surfaces: ['lessons', 'quizzes', 'cards', 'arena_questions'] });
    expect(units.map((unit) => unit.unitId)).toEqual([
      'job-1:lesson:1', 'job-1:lesson:2', 'job-1:quiz:1', 'job-1:quiz:2', 'job-1:flashcard:1', 'job-1:flashcard:2', 'job-1:arena:1', 'job-1:arena:2',
    ]);
    expect(new Set(units.map((unit) => unit.unitId)).size).toBe(units.length);
  });

  it('summarizes retries/failures deterministically', () => {
    const units: GenerationUnit[] = [
      { unitId: 'a', jobId: 'j', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'lesson', lessonId: 1, state: 'succeeded', attempts: 1 },
      { unitId: 'b', jobId: 'j', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'quiz', lessonId: 1, state: 'failed', attempts: 3 },
      { unitId: 'c', jobId: 'j', studyTarget: 'fr', learnerSourceLocale: 'ru', surface: 'arena', lessonId: 2, state: 'queued', attempts: 0 },
    ];
    expect(summarizeUnitProgress(units)).toEqual({ total: 3, completed: 1, failed: 1, queued: 1, running: 0 });
  });

  it.each<readonly FactorySurface[][]>([
    [['lessons']],
    [['vocabulary']],
    [['drills']],
    [['lessons', 'vocabulary', 'drills']],
    [['quizzes', 'cards', 'arena_questions']],
    [['lessons', 'vocabulary', 'drills', 'quizzes', 'cards', 'arena_questions']],
  ])('derives progress.total from the persisted canonical units for %j', (surfaces) => {
    const lessonIds = [1, 2];
    const job = createGenerationJob({
      projectId: 'fr-ru-course',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      lessonIds,
      surfaces,
      idempotencyKey: `job-${surfaces.join('-')}`,
      requestedBy: 'admin-1',
      blueprintVersion: 'english-core-32:v1',
    });
    const units = splitGenerationJob({
      jobId: job.idempotencyKey,
      studyTarget: job.studyTarget,
      learnerSourceLocale: job.sourceLocale,
      lessonIds,
      surfaces,
    });

    expect(job.progress.total).toBe(units.length);
    expect(new Set(units.map((unit) => unit.unitId)).size).toBe(units.length);
  });
});
