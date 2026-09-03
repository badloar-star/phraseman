import { authoredLearningV2SessionSource } from "./authored_sessions_v1";
import { authoredLearningV2Episode02SessionSource } from "./authored_episode_02_sessions_v1";
import { authoredLearningV2Episode03SessionSource } from "./authored_episode_03_sessions_v1";
import type { SessionSource } from "./session_shard_from_source_v1";

/**
 * Lesson-aware source boundary for English authoring gates.
 *
 * Session ordinals restart at one in every lesson, so a gate must never infer
 * a source from the ordinal alone.  Keeping that dispatch here makes a future
 * lesson explicit rather than silently falling back to Lesson 1.
 */
export function authoredEnglishLessonSessionSourceV1(
  lessonOrdinal: number,
  sessionOrdinal: number,
): SessionSource | null {
  if (lessonOrdinal === 1) return authoredLearningV2SessionSource(sessionOrdinal);
  if (lessonOrdinal === 2) return authoredLearningV2Episode02SessionSource(sessionOrdinal);
  if (lessonOrdinal === 3) return authoredLearningV2Episode03SessionSource(sessionOrdinal);
  return null;
}
