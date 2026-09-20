import { learningV2CourseSessionIdV1 } from "../modules/learning-v2/content/course_topology_v1";
import {
  buildLearningV2CourseAccordionMapFromPreparedProgressV1,
  buildLearningV2CourseAccordionMapModelV1,
  prepareLearningV2CourseAccordionProgressV1,
  type LearningV2CourseAccordionRowV1,
} from "../modules/learning-v2/map/course_accordion_map_model_v1";

const sessions = (rows: readonly LearningV2CourseAccordionRowV1[]) =>
  rows.filter(
    (
      row,
    ): row is Extract<LearningV2CourseAccordionRowV1, { kind: "session" }> =>
      row.kind === "session",
  );

const PROJECTION_SCOPE = "test-account:en";

describe("Learning V2 owner-current course accordion map model v1", () => {
  // Владелец 20.09 отменил аккордеон: карта идёт вниз непрерывно через весь
  // курс. Прежние ожидания (32 строки, пока всё закрыто; 95 строк у одного
  // раскрытого урока) сторожили ОТМЕНЁННОЕ решение и переписаны здесь.
  test("builds one continuous map: every lesson always carries its 56 sessions", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: null,
      completedSessionIds: [],
      currentSessionId: null,
    });
    expect(model.rows.filter((row) => row.kind === "lesson")).toHaveLength(32);
    expect(sessions(model.rows)).toHaveLength(32 * 56);
    expect(model.rows.filter((row) => row.kind === "chapter")).toHaveLength(
      32 * 7,
    );
    // 32 плашки уроков + 224 главы + 1792 занятия.
    expect(model.rows).toHaveLength(2048);
  });

  test("keeps 56 sessions and 7 chapters between one lesson and the next", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 2,
      completedSessionIds: [],
      currentSessionId: learningV2CourseSessionIdV1(2, 1),
    });
    const lesson2Index = model.rows.findIndex((row) => row.id === "lesson-02");
    const lesson3Index = model.rows.findIndex((row) => row.id === "lesson-03");
    // 1 плашка + 7 глав + 56 занятий = 64 строки на урок.
    expect(lesson3Index - lesson2Index).toBe(64);
  });

  test("marks only the first session of the FIRST lesson current for a newcomer", () => {
    // На сплошной карте без проверки урока «текущими» становились первые
    // занятия всех 32 уроков сразу — человек не понял бы, откуда начинать.
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: null,
      completedSessionIds: [],
      currentSessionId: null,
    });
    const current = sessions(model.rows).filter(
      (row) => row.state === "current",
    );
    expect(current).toHaveLength(1);
    expect(current[0]?.id).toBe(learningV2CourseSessionIdV1(1, 1));
  });

  test("keeps the exact lesson, chapter and session order around the expanded lesson", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 2,
      completedSessionIds: [],
      currentSessionId: learningV2CourseSessionIdV1(2, 1),
    });
    const expectedExpandedRows = Array.from(
      { length: 7 },
      (_, chapterIndex) => {
        const chapterOrdinal = chapterIndex + 1;
        const firstSessionOrdinal = chapterIndex * 8 + 1;
        return [
          `lesson-02:chapter:${String(chapterOrdinal).padStart(2, "0")}`,
          ...Array.from({ length: 8 }, (_, sessionIndex) =>
            learningV2CourseSessionIdV1(2, firstSessionOrdinal + sessionIndex),
          ),
        ];
      },
    ).flat();

    // Карта сплошная: занятия урока 2 идут сразу после его плашки, а следом
    // без разрыва плашка урока 3 со своими занятиями.
    const ids = model.rows.map((row) => row.id);
    const lesson2At = ids.indexOf("lesson-02");
    expect(ids.slice(lesson2At + 1, lesson2At + 1 + expectedExpandedRows.length)).toEqual(
      expectedExpandedRows,
    );
    expect(ids[lesson2At + 1 + expectedExpandedRows.length]).toBe("lesson-03");
    expect(ids[0]).toBe("lesson-01");
  });

  test("maps current, next, checkpoint and final exam without plan side cards", () => {
    const current = learningV2CourseSessionIdV1(1, 7);
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 1,
      completedSessionIds: Array.from({ length: 6 }, (_, index) =>
        learningV2CourseSessionIdV1(1, index + 1),
      ),
      currentSessionId: current,
    });
    const route = sessions(model.rows);
    expect(route.slice(0, 8).map((session) => session.state)).toEqual([
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "completed",
      "current",
      "next",
    ]);
    expect(route[7].role).toBe("chapter_checkpoint");
    expect(route[55].role).toBe("final_exam");
    expect(JSON.stringify(model)).not.toContain("personal_plan");
  });

  test("rejects invalid lesson and progress coordinates", () => {
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        projectionScopeKey: PROJECTION_SCOPE,
        expandedLessonOrdinal: 33,
        completedSessionIds: [],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_expanded_lesson_invalid");
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        projectionScopeKey: PROJECTION_SCOPE,
        expandedLessonOrdinal: 1,
        completedSessionIds: ["unknown-session"],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_progress_invalid");
    expect(() =>
      buildLearningV2CourseAccordionMapModelV1({
        projectionScopeKey: "",
        expandedLessonOrdinal: 1,
        completedSessionIds: [],
        currentSessionId: null,
      }),
    ).toThrow("learning_v2_course_accordion_scope_invalid");
  });

  test("does not mark another lesson next when current progress belongs to lesson one", () => {
    const model = buildLearningV2CourseAccordionMapModelV1({
      projectionScopeKey: PROJECTION_SCOPE,
      expandedLessonOrdinal: 2,
      completedSessionIds: [],
      currentSessionId: learningV2CourseSessionIdV1(1, 1),
    });
    // Смысл прежний: прогресс урока 1 не должен «протекать» в урок 2.
    // Но на сплошной карте занятия урока 1 тоже есть в модели, поэтому
    // проверяем адресно, а не «всё заперто».
    const lit = sessions(model.rows).filter(
      (session) => session.state !== "locked",
    );
    expect(lit.map((session) => session.id)).toEqual([
      learningV2CourseSessionIdV1(1, 1),
      learningV2CourseSessionIdV1(1, 2),
    ]);
    expect(
      sessions(model.rows)
        .filter((session) => session.lessonOrdinal === 2)
        .every((session) => session.state === "locked"),
    ).toBe(true);
  });

  test("reuses one immutable projection for the same scoped semantic input", () => {
    const input = {
      projectionScopeKey: "account-1:en",
      expandedLessonOrdinal: 1,
      completedSessionIds: [learningV2CourseSessionIdV1(1, 1)],
      currentSessionId: learningV2CourseSessionIdV1(1, 2),
    } as const;

    expect(buildLearningV2CourseAccordionMapModelV1(input)).toBe(
      buildLearningV2CourseAccordionMapModelV1(input),
    );
  });

  test("hits the prepared projection cache before progress needs traversal", () => {
    const preparedProgress = prepareLearningV2CourseAccordionProgressV1({
      completedSessionIds: Array.from({ length: 56 }, (_, index) =>
        learningV2CourseSessionIdV1(1, index + 1),
      ),
      currentSessionId: learningV2CourseSessionIdV1(2, 1),
    });
    const input = {
      projectionScopeKey: "account-1:en",
      expandedLessonOrdinal: 1,
      preparedProgress,
    } as const;

    expect(buildLearningV2CourseAccordionMapFromPreparedProgressV1(input)).toBe(
      buildLearningV2CourseAccordionMapFromPreparedProgressV1(input),
    );
  });

  test("does not reuse a projection across account or target scopes", () => {
    const preparedProgress = prepareLearningV2CourseAccordionProgressV1({
      completedSessionIds: [learningV2CourseSessionIdV1(1, 1)],
      currentSessionId: learningV2CourseSessionIdV1(1, 2),
    });

    expect(
      buildLearningV2CourseAccordionMapFromPreparedProgressV1({
        projectionScopeKey: "account-1:en",
        expandedLessonOrdinal: 1,
        preparedProgress,
      }),
    ).not.toBe(
      buildLearningV2CourseAccordionMapFromPreparedProgressV1({
        projectionScopeKey: "account-2:en",
        expandedLessonOrdinal: 1,
        preparedProgress,
      }),
    );
  });
});
