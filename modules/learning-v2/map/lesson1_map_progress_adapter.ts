import type { Lesson1LocalProgressState } from '../progress/lesson1_local_progress';
import type { LessonMapInput } from './lesson_map_model';

/** Converts only persisted V2 session state into the presentation model. */
export function lesson1MapInputFromProgress(
  state: Lesson1LocalProgressState,
): Omit<LessonMapInput, 'personalPlanTasks' | 'tournamentTasks'> {
  const completedSessionIds = state.requiredSessionIds.filter(
    sessionId => state.sessions[sessionId] === 'completed',
  );
  const currentSessionId = state.requiredSessionIds.find(
    sessionId => state.sessions[sessionId] !== 'completed',
  );

  return {
    lessonId: 1,
    completedSessionIds,
    ...(currentSessionId ? { currentSessionId } : {}),
  };
}
