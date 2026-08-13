import { hashCanonicalBody } from "../policies/decision_registry";

/**
 * Owner-current Learning V2 course topology.
 *
 * This contract describes structure only. It does not create lesson content:
 * the 32 real lesson bodies remain owner-authored through the generator.
 */
export const LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1 =
  "learning-v2-course-topology.v1" as const;
export const LEARNING_V2_COURSE_LESSON_COUNT_V1 = 32 as const;
export const LEARNING_V2_LESSON_SESSION_COUNT_V1 = 56 as const;
export const LEARNING_V2_LESSON_CHAPTER_COUNT_V1 = 7 as const;
export const LEARNING_V2_CHAPTER_SESSION_COUNT_V1 = 8 as const;
export const LEARNING_V2_SESSION_MIN_MINUTES_V1 = 5 as const;
export const LEARNING_V2_SESSION_TARGET_MINUTES_V1 = 7 as const;
export const LEARNING_V2_SESSION_MAX_MINUTES_V1 = 8 as const;
export const LEARNING_V2_COURSE_SESSION_COUNT_V1 = 1_792 as const;
export const LEARNING_V2_COURSE_TARGET_MINUTES_V1 = 12_544 as const;

export const LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1 = Object.freeze([
  8, 16, 24, 32, 40, 48,
] as const);

export type LearningV2CourseSessionRoleV1 =
  | "guided_learning"
  | "chapter_checkpoint"
  | "transfer_practice"
  | "final_exam";

export type LearningV2CourseSessionTopologyV1 = Readonly<{
  sessionId: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  chapterOrdinal: number;
  positionInChapter: number;
  role: LearningV2CourseSessionRoleV1;
  durationMinutes: Readonly<{
    min: typeof LEARNING_V2_SESSION_MIN_MINUTES_V1;
    target: typeof LEARNING_V2_SESSION_TARGET_MINUTES_V1;
    max: typeof LEARNING_V2_SESSION_MAX_MINUTES_V1;
  }>;
}>;

export type LearningV2CourseLessonTopologyV1 = Readonly<{
  lessonId: string;
  lessonOrdinal: number;
  chapterCount: typeof LEARNING_V2_LESSON_CHAPTER_COUNT_V1;
  sessionCount: typeof LEARNING_V2_LESSON_SESSION_COUNT_V1;
  sessions: readonly LearningV2CourseSessionTopologyV1[];
  contentAuthorship: "owner_only";
}>;

export type LearningV2CourseTopologyV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1;
  lessonCount: typeof LEARNING_V2_COURSE_LESSON_COUNT_V1;
  sessionsPerLesson: typeof LEARNING_V2_LESSON_SESSION_COUNT_V1;
  chaptersPerLesson: typeof LEARNING_V2_LESSON_CHAPTER_COUNT_V1;
  sessionsPerChapter: typeof LEARNING_V2_CHAPTER_SESSION_COUNT_V1;
  lessons: readonly LearningV2CourseLessonTopologyV1[];
  courseTotals: Readonly<{
    sessionCount: typeof LEARNING_V2_COURSE_SESSION_COUNT_V1;
    targetMinutes: typeof LEARNING_V2_COURSE_TARGET_MINUTES_V1;
    targetWholeHours: 209;
    targetRemainingMinutes: 4;
  }>;
  realContentAuthorship: "owner_only";
  generatorResponsibility: "structure_validation_preview_release_tooling_only";
  topologyFingerprint: string;
}>;

function assertOrdinal(value: number, max: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`learning_v2_course_topology_${field}_invalid`);
  }
}

export function learningV2CourseLessonIdV1(lessonOrdinal: number): string {
  assertOrdinal(
    lessonOrdinal,
    LEARNING_V2_COURSE_LESSON_COUNT_V1,
    "lesson_ordinal",
  );
  return `lesson-${String(lessonOrdinal).padStart(2, "0")}`;
}

export function learningV2CourseSessionIdV1(
  lessonOrdinal: number,
  sessionOrdinal: number,
): string {
  assertOrdinal(
    lessonOrdinal,
    LEARNING_V2_COURSE_LESSON_COUNT_V1,
    "lesson_ordinal",
  );
  assertOrdinal(
    sessionOrdinal,
    LEARNING_V2_LESSON_SESSION_COUNT_V1,
    "session_ordinal",
  );
  return `${learningV2CourseLessonIdV1(lessonOrdinal)}:session:${String(sessionOrdinal).padStart(2, "0")}`;
}

export function learningV2CourseSessionRoleV1(
  sessionOrdinal: number,
): LearningV2CourseSessionRoleV1 {
  assertOrdinal(
    sessionOrdinal,
    LEARNING_V2_LESSON_SESSION_COUNT_V1,
    "session_ordinal",
  );
  if (sessionOrdinal === LEARNING_V2_LESSON_SESSION_COUNT_V1)
    return "final_exam";
  if (
    LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1.includes(
      sessionOrdinal as never,
    )
  ) {
    return "chapter_checkpoint";
  }
  if (sessionOrdinal >= 49) return "transfer_practice";
  return "guided_learning";
}

function buildSession(
  lessonOrdinal: number,
  sessionOrdinal: number,
): LearningV2CourseSessionTopologyV1 {
  return Object.freeze({
    sessionId: learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal),
    lessonOrdinal,
    sessionOrdinal,
    chapterOrdinal: Math.ceil(
      sessionOrdinal / LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
    ),
    positionInChapter:
      ((sessionOrdinal - 1) % LEARNING_V2_CHAPTER_SESSION_COUNT_V1) + 1,
    role: learningV2CourseSessionRoleV1(sessionOrdinal),
    durationMinutes: Object.freeze({
      min: LEARNING_V2_SESSION_MIN_MINUTES_V1,
      target: LEARNING_V2_SESSION_TARGET_MINUTES_V1,
      max: LEARNING_V2_SESSION_MAX_MINUTES_V1,
    }),
  });
}

export function buildLearningV2CourseTopologyV1(): LearningV2CourseTopologyV1 {
  const lessons = Object.freeze(
    Array.from(
      { length: LEARNING_V2_COURSE_LESSON_COUNT_V1 },
      (_, lessonIndex) => {
        const lessonOrdinal = lessonIndex + 1;
        return Object.freeze({
          lessonId: learningV2CourseLessonIdV1(lessonOrdinal),
          lessonOrdinal,
          chapterCount: LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
          sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
          sessions: Object.freeze(
            Array.from(
              { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
              (_, sessionIndex) =>
                buildSession(lessonOrdinal, sessionIndex + 1),
            ),
          ),
          contentAuthorship: "owner_only" as const,
        });
      },
    ),
  );

  const body = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1,
    lessonCount: LEARNING_V2_COURSE_LESSON_COUNT_V1,
    sessionsPerLesson: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    chaptersPerLesson: LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
    sessionsPerChapter: LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
    lessons,
    courseTotals: Object.freeze({
      sessionCount: LEARNING_V2_COURSE_SESSION_COUNT_V1,
      targetMinutes: LEARNING_V2_COURSE_TARGET_MINUTES_V1,
      targetWholeHours: 209 as const,
      targetRemainingMinutes: 4 as const,
    }),
    realContentAuthorship: "owner_only" as const,
    generatorResponsibility:
      "structure_validation_preview_release_tooling_only" as const,
  });

  return Object.freeze({
    ...body,
    topologyFingerprint: hashCanonicalBody(body),
  });
}
