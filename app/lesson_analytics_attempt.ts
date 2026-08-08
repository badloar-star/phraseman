export type LessonAttemptTerminal = 'complete' | 'abandon';

export interface LessonAnalyticsAttempt {
  readonly id: string;
  readonly startedAtMs: number;
  startRecorded: boolean;
  terminal: LessonAttemptTerminal | null;
}

export function createLessonAnalyticsAttempt(
  createId: () => string,
  now: () => number = Date.now,
): LessonAnalyticsAttempt {
  const id = String(createId()).trim();
  if (!id || id.length > 80) throw new Error('Invalid lesson_attempt_id');
  return { id, startedAtMs: now(), startRecorded: false, terminal: null };
}

export function markLessonAttemptStarted(attempt: LessonAnalyticsAttempt): boolean {
  if (attempt.startRecorded) return false;
  attempt.startRecorded = true;
  return true;
}

export function markLessonAttemptTerminal(
  attempt: LessonAnalyticsAttempt,
  terminal: LessonAttemptTerminal,
): boolean {
  if (attempt.terminal) return false;
  attempt.terminal = terminal;
  return true;
}

export function lessonAttemptElapsedMs(
  attempt: LessonAnalyticsAttempt,
  now: () => number = Date.now,
): number {
  return Math.max(0, Math.round(now() - attempt.startedAtMs));
}

export default function __RouteShim() { return null; }
