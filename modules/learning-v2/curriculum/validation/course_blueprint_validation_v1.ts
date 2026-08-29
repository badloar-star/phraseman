import {
  LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseSessionIdV1,
} from "../../content/course_topology_v1";
import {
  assertLearningV2CurriculumSessionPacketV1,
  type LearningV2CurriculumSessionPacketV1,
} from "../contracts/course_blueprint_v1";

export type LearningV2CurriculumFindingV1 = Readonly<{
  severity: "blocker" | "error" | "warning";
  code: string;
  lessonOrdinal: number | null;
  sessionOrdinal: number | null;
  message: string;
}>;

export type LearningV2CourseBlueprintValidationInputV1 = Readonly<{
  lessons: readonly Readonly<{
    lessonOrdinal: number;
    sessions: readonly LearningV2CurriculumSessionPacketV1[];
  }>[];
  /** Opaque IDs from packets are resolved here; missing IDs are findings. */
  forbiddenSurfaceFormsById: Readonly<Record<string, readonly string[]>>;
}>;

function finding(
  code: string,
  lessonOrdinal: number | null,
  sessionOrdinal: number | null,
  message: string,
  severity: LearningV2CurriculumFindingV1["severity"] = "blocker",
): LearningV2CurriculumFindingV1 {
  return Object.freeze({ severity, code, lessonOrdinal, sessionOrdinal, message });
}

function absoluteOrdinal(lessonOrdinal: number, sessionOrdinal: number): number {
  return (
    (lessonOrdinal - 1) * LEARNING_V2_LESSON_SESSION_COUNT_V1 + sessionOrdinal
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsSurfaceForm(example: string, surfaceForm: string): boolean {
  const escaped = escapeRegExp(surfaceForm.trim());
  if (!escaped) return false;
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`,
    "iu",
  ).test(example);
}

export function validateLearningV2CourseBlueprintV1(
  input: LearningV2CourseBlueprintValidationInputV1,
): readonly LearningV2CurriculumFindingV1[] {
  const findings: LearningV2CurriculumFindingV1[] = [];

  if (input.lessons.length !== LEARNING_V2_COURSE_LESSON_COUNT_V1) {
    findings.push(
      finding(
        "course_lesson_count_invalid",
        null,
        null,
        `Ожидалось ${LEARNING_V2_COURSE_LESSON_COUNT_V1} урока, получено ${input.lessons.length}.`,
      ),
    );
  }

  const allPackets = input.lessons.flatMap((lesson) => lesson.sessions);
  const packetsById = new Map<string, LearningV2CurriculumSessionPacketV1>();
  const duplicateIds = new Set<string>();
  for (const packet of allPackets) {
    if (packetsById.has(packet.sessionId)) duplicateIds.add(packet.sessionId);
    else packetsById.set(packet.sessionId, packet);
  }

  for (const duplicateId of [...duplicateIds].sort()) {
    const packet = allPackets.find((candidate) => candidate.sessionId === duplicateId);
    findings.push(
      finding(
        "session_id_duplicate",
        packet?.lessonOrdinal ?? null,
        packet?.sessionOrdinal ?? null,
        `ID сессии «${duplicateId}» встречается более одного раза.`,
      ),
    );
  }

  for (const [lessonIndex, lesson] of input.lessons.entries()) {
    const expectedLessonOrdinal = lessonIndex + 1;
    if (lesson.lessonOrdinal !== expectedLessonOrdinal) {
      findings.push(
        finding(
          "lesson_ordinal_invalid",
          lesson.lessonOrdinal,
          null,
          `На позиции ${expectedLessonOrdinal} указан урок ${lesson.lessonOrdinal}.`,
        ),
      );
    }

    if (lesson.sessions.length !== LEARNING_V2_LESSON_SESSION_COUNT_V1) {
      findings.push(
        finding(
          "lesson_session_count_invalid",
          lesson.lessonOrdinal,
          null,
          `В уроке должно быть ${LEARNING_V2_LESSON_SESSION_COUNT_V1} сессий, получено ${lesson.sessions.length}.`,
        ),
      );
    }

    for (const [sessionIndex, packet] of lesson.sessions.entries()) {
      const expectedSessionOrdinal = sessionIndex + 1;
      const contextLesson = lesson.lessonOrdinal;
      const contextSession = packet.sessionOrdinal;

      try {
        assertLearningV2CurriculumSessionPacketV1(packet);
      } catch (error) {
        findings.push(
          finding(
            "packet_contract_invalid",
            contextLesson,
            contextSession,
            error instanceof Error ? error.message : "unknown_packet_error",
          ),
        );
      }

      if (packet.lessonOrdinal !== lesson.lessonOrdinal) {
        findings.push(
          finding(
            "packet_lesson_ordinal_mismatch",
            contextLesson,
            contextSession,
            `Пакет ссылается на урок ${packet.lessonOrdinal}, но расположен в уроке ${lesson.lessonOrdinal}.`,
          ),
        );
      }
      if (packet.sessionOrdinal !== expectedSessionOrdinal) {
        findings.push(
          finding(
            "session_ordinal_invalid",
            contextLesson,
            contextSession,
            `На позиции ${expectedSessionOrdinal} указана сессия ${packet.sessionOrdinal}.`,
          ),
        );
      }

      if (
        packet.lessonOrdinal >= 1 &&
        packet.lessonOrdinal <= LEARNING_V2_COURSE_LESSON_COUNT_V1 &&
        packet.sessionOrdinal >= 1 &&
        packet.sessionOrdinal <= LEARNING_V2_LESSON_SESSION_COUNT_V1
      ) {
        const expectedId = learningV2CourseSessionIdV1(
          packet.lessonOrdinal,
          packet.sessionOrdinal,
        );
        if (packet.sessionId !== expectedId) {
          findings.push(
            finding(
              "session_id_mismatch",
              contextLesson,
              contextSession,
              `Ожидался ID «${expectedId}», получен «${packet.sessionId}».`,
            ),
          );
        }
      }

      const expectedChapter = Math.ceil(
        packet.sessionOrdinal / LEARNING_V2_CHAPTER_SESSION_COUNT_V1,
      );
      if (packet.chapterOrdinal !== expectedChapter) {
        findings.push(
          finding(
            "chapter_ordinal_invalid",
            contextLesson,
            contextSession,
            `Сессия ${packet.sessionOrdinal} должна быть в главе ${expectedChapter}.`,
          ),
        );
      }

      const checkpointExpected =
        LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1.includes(
          packet.sessionOrdinal as never,
        );
      if (packet.role === "checkpoint" && !checkpointExpected) {
        findings.push(
          finding(
            "checkpoint_role_wrong_ordinal",
            contextLesson,
            contextSession,
            "Роль checkpoint разрешена только на фиксированной границе главы.",
          ),
        );
      } else if (checkpointExpected && packet.role !== "checkpoint") {
        findings.push(
          finding(
            "checkpoint_role_missing",
            contextLesson,
            contextSession,
            "На фиксированной границе главы обязательна роль checkpoint.",
          ),
        );
      }
      if (
        packet.sessionOrdinal === LEARNING_V2_LESSON_SESSION_COUNT_V1 &&
        packet.role !== "final_exam"
      ) {
        findings.push(
          finding(
            "final_exam_role_missing",
            contextLesson,
            contextSession,
            "Сессия 56 обязана быть final_exam.",
          ),
        );
      } else if (
        packet.sessionOrdinal !== LEARNING_V2_LESSON_SESSION_COUNT_V1 &&
        packet.role === "final_exam"
      ) {
        findings.push(
          finding(
            "final_exam_role_wrong_ordinal",
            contextLesson,
            contextSession,
            "Роль final_exam разрешена только в сессии 56.",
          ),
        );
      }

      if (packet.sourceEvidenceRefs.length === 0) {
        findings.push(
          finding(
            "source_evidence_missing",
            contextLesson,
            contextSession,
            "У пакета нет ссылки на исследовательское или owner-основание.",
          ),
        );
      }

      for (const forbiddenId of packet.forbiddenSurfaceFormIds) {
        const literalForms = input.forbiddenSurfaceFormsById[forbiddenId];
        if (!literalForms || literalForms.length === 0) {
          findings.push(
            finding(
              "forbidden_surface_form_id_unknown",
              contextLesson,
              contextSession,
              `Для запрещённой формы «${forbiddenId}» нет literal-справочника.`,
            ),
          );
          continue;
        }
        for (const example of packet.canonicalEnglishExamples) {
          if (literalForms.some((form) => containsSurfaceForm(example, form))) {
            findings.push(
              finding(
                "forbidden_surface_form_in_example",
                contextLesson,
                contextSession,
                `Канонический пример содержит запрещённую форму «${forbiddenId}».`,
              ),
            );
            break;
          }
        }
      }
    }
  }

  for (const packet of allPackets) {
    const packetAbsolute = absoluteOrdinal(
      packet.lessonOrdinal,
      packet.sessionOrdinal,
    );
    for (const sourceId of packet.reviewSourceSessionIds) {
      const source = packetsById.get(sourceId);
      if (!source) {
        findings.push(
          finding(
            "review_source_missing",
            packet.lessonOrdinal,
            packet.sessionOrdinal,
            `Review source «${sourceId}» отсутствует в blueprint.`,
          ),
        );
        continue;
      }
      if (
        absoluteOrdinal(source.lessonOrdinal, source.sessionOrdinal) >=
        packetAbsolute
      ) {
        findings.push(
          finding(
            "review_source_not_prior",
            packet.lessonOrdinal,
            packet.sessionOrdinal,
            `Review source «${sourceId}» не предшествует текущей сессии.`,
          ),
        );
      }
    }
  }

  return Object.freeze(findings);
}
