import {
  LEARNING_V2_FREE_LESSON_LIMIT,
  learningV2LessonIsAccessible,
  learningV2LessonRequiresPremium,
} from "../app/learning_v2_access_policy";

describe("Learning V2 free access", () => {
  test("keeps first two full lessons free", () => {
    expect(LEARNING_V2_FREE_LESSON_LIMIT).toBe(2);
    expect(learningV2LessonIsAccessible(1, false)).toBe(true);
    expect(learningV2LessonIsAccessible(2, false)).toBe(true);
    expect(learningV2LessonRequiresPremium(1)).toBe(false);
    expect(learningV2LessonRequiresPremium(2)).toBe(false);
  });

  test("requires Plus from lesson three while Plus remains unrestricted", () => {
    expect(learningV2LessonIsAccessible(3, false)).toBe(false);
    expect(learningV2LessonIsAccessible(32, false)).toBe(false);
    expect(learningV2LessonIsAccessible(3, true)).toBe(true);
  });
});
