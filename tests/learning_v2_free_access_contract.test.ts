import {
  LEARNING_V2_FREE_LESSON_LIMIT,
  learningV2LessonIsAccessible,
  learningV2LessonRequiresPremium,
} from "../app/learning_v2_access_policy";

// зачем: владелец 13.10 — все уроки Learning V2 бесплатны в R1 (замок «Уроки 3+ доступны в Plus» снят).
describe("Learning V2 free access (R1: every lesson is free)", () => {
  beforeEach(() => jest.spyOn(console, "log").mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  test("every lesson is accessible without Plus", () => {
    for (const lesson of [1, 2, 3, 10, 32]) {
      expect(learningV2LessonRequiresPremium(lesson)).toBe(false);
      expect(learningV2LessonIsAccessible(lesson, false)).toBe(true);
    }
  });

  test("Plus stays unrestricted; the old limit constant is kept for a later decision", () => {
    expect(learningV2LessonIsAccessible(3, true)).toBe(true);
    expect(LEARNING_V2_FREE_LESSON_LIMIT).toBe(2);
  });
});
