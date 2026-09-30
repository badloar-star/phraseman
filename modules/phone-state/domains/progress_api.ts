import type {
  PersonalProgressCommand,
  PersonalProgressProjection,
} from './progress_projection';

export interface PersonalProgressJournal {
  commit(command: PersonalProgressCommand): Promise<Readonly<{
    projection: PersonalProgressProjection;
    duplicate: boolean;
  }>>;
  read(): Promise<PersonalProgressProjection>;
}

export interface PersonalProgressApi {
  completeLesson(input: Readonly<{
    eventId: string;
    lessonId: string;
    bestPct?: number;
  }>): Promise<PersonalProgressProjection>;
  completeExam(input: Readonly<{
    eventId: string;
    examId: string;
    bestPct: number;
  }>): Promise<PersonalProgressProjection>;
  read(): Promise<PersonalProgressProjection>;
}

export type CreatePersonalProgressApiOptions = Readonly<{
  journal: PersonalProgressJournal;
  mirror?(projection: PersonalProgressProjection): Promise<void>;
  recordDiagnostic?(metadata: Readonly<{ kind: 'legacy_mirror_failed' }>): void;
}>;

export function createPersonalProgressApi(
  options: CreatePersonalProgressApiOptions,
): PersonalProgressApi {
  const mirror = async (projection: PersonalProgressProjection): Promise<void> => {
    if (!options.mirror) return;
    try {
      await options.mirror(projection);
    } catch {
      options.recordDiagnostic?.(Object.freeze({ kind: 'legacy_mirror_failed' }));
    }
  };

  const completeLesson: PersonalProgressApi['completeLesson'] = async (input) => {
    const committed = await options.journal.commit(Object.freeze({ kind: 'complete_lesson', ...input }));
    await mirror(committed.projection);
    return committed.projection;
  };

  const completeExam: PersonalProgressApi['completeExam'] = async (input) => {
    const committed = await options.journal.commit(Object.freeze({ kind: 'complete_exam', ...input }));
    await mirror(committed.projection);
    return committed.projection;
  };

  return Object.freeze({ completeLesson, completeExam, read: options.journal.read });
}
