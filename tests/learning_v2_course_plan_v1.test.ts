import {
  buildLearningV2CoursePlanV1,
  LEARNING_V2_COURSE_PLAN_V1,
} from "../modules/learning-v2/content/course_plan_v1";
import { LEARNING_V2_COURSE_LESSON_COUNT_V1 } from "../modules/learning-v2/content/course_topology_v1";

/**
 * зачем: главный риск курса — сползти обратно к грамматическим заголовкам
 * («Present Simple: Отрицание»), как в старом constants/lessons.ts и как у
 * Duolingo. Reference v3 (CEFR-Q1) прямо называет это слабой целью. Тест
 * охраняет именно эту границу, а не наличие таблицы.
 */

describe("Learning V2 course plan", () => {
  test("has exactly 32 lessons with unique ordinals 1..32", () => {
    const plan = buildLearningV2CoursePlanV1();
    expect(plan.lessonCount).toBe(LEARNING_V2_COURSE_LESSON_COUNT_V1);
    const ordinals = plan.lessons.map((lesson) => lesson.lessonOrdinal);
    expect(new Set(ordinals).size).toBe(LEARNING_V2_COURSE_LESSON_COUNT_V1);
    expect(Math.min(...ordinals)).toBe(1);
    expect(Math.max(...ordinals)).toBe(32);
  });

  test("every lesson states what the learner can DO, not a grammar topic", () => {
    for (const lesson of LEARNING_V2_COURSE_PLAN_V1) {
      // Ни один заголовок не может быть названием грамматики.
      expect(lesson.canDo).not.toMatch(
        /present simple|past simple|present perfect|герундий|passive voice|артикл/iu,
      );
      expect(lesson.canDo).not.toMatch(/^(изучить|выучить|тема)/iu);
      // И обязан описывать наблюдаемое действие.
      expect(lesson.canDo.length).toBeGreaterThan(10);
      expect(lesson.situation.length).toBeGreaterThan(10);
    }
  });

  test("grammar lives in languageMeans, where it belongs", () => {
    // Грамматика не исчезла — она перестала быть заголовком.
    const allMeans = LEARNING_V2_COURSE_PLAN_V1.flatMap(
      (lesson) => lesson.languageMeans,
    ).join(" ");
    expect(allMeans).toMatch(/I'm|don't|Do you/u);
    expect(allMeans).toMatch(/have been/u);
    expect(allMeans).toMatch(/used to/u);
  });

  test("no hidden prerequisites: every prerequisite comes strictly earlier", () => {
    for (const lesson of LEARNING_V2_COURSE_PLAN_V1) {
      for (const prerequisite of lesson.prerequisiteLessons) {
        expect(prerequisite).toBeLessThan(lesson.lessonOrdinal);
        expect(prerequisite).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("difficulty never goes backwards across the course", () => {
    const order = ["pre-A1", "A1", "A1+", "A2", "A2+", "B1"];
    let seenSoFar = 0;
    for (const lesson of LEARNING_V2_COURSE_PLAN_V1) {
      const index = order.indexOf(lesson.cefrBand);
      expect(index).toBeGreaterThanOrEqual(0);
      // Полоса может держаться, но не откатываться назад.
      expect(index).toBeGreaterThanOrEqual(seenSoFar);
      seenSoFar = index;
    }
    // Курс реально доходит до B1, а не топчется на A1.
    expect(LEARNING_V2_COURSE_PLAN_V1.at(-1)!.cefrBand).toBe("B1");
  });

  test("the first lesson needs nothing and starts from absolute zero", () => {
    const first = LEARNING_V2_COURSE_PLAN_V1[0]!;
    expect(first.prerequisiteLessons).toHaveLength(0);
    expect(first.cefrBand).toBe("pre-A1");
  });

  test("every lesson declares objective components for the coverage matrix", () => {
    for (const lesson of LEARNING_V2_COURSE_PLAN_V1) {
      expect(lesson.objectiveComponents.length).toBeGreaterThanOrEqual(3);
      expect(new Set(lesson.objectiveComponents).size).toBe(
        lesson.objectiveComponents.length,
      );
    }
  });

  test("the plan is deterministic", () => {
    expect(buildLearningV2CoursePlanV1().planFingerprint).toBe(
      buildLearningV2CoursePlanV1().planFingerprint,
    );
  });
});
