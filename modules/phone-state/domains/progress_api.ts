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
  grantXp(input: Readonly<{
    eventId: string;
    amount: number;
    source: string;
    activityDate: string;
    exactResult: unknown;
  }>): Promise<Readonly<{
    totalXp: number;
    level: number;
    streakCount: number;
    duplicate: boolean;
  }>>;
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

function validateGrant(input: Parameters<PersonalProgressApi['grantXp']>[0]): void {
  if (
    typeof input.eventId !== 'string'
    || input.eventId.trim().length === 0
    || input.eventId.length > 160
    || !Number.isSafeInteger(input.amount)
    || input.amount <= 0
    || input.amount > 1_000_000
    || typeof input.source !== 'string'
    || input.source.trim().length === 0
    || !/^\d{4}-\d{2}-\d{2}$/.test(input.activityDate)
  ) {
    throw new Error('phone_state_progress_input_invalid');
  }
}

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

  const grantXp: PersonalProgressApi['grantXp'] = async (input) => {
    validateGrant(input);
    const committed = await options.journal.commit(Object.freeze({ kind: 'grant_xp', ...input }));
    await mirror(committed.projection);
    return Object.freeze({
      totalXp: committed.projection.totalXp,
      level: committed.projection.level,
      streakCount: committed.projection.streakCount,
      duplicate: committed.duplicate,
    });
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

  return Object.freeze({ grantXp, completeLesson, completeExam, read: options.journal.read });
}
