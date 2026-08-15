import {
  createLearningV2CourseLocalProgressStoreV1,
  initialLearningV2CourseLocalProgressV1,
  parseLearningV2CourseLocalProgressV1,
} from "../modules/learning-v2/progress/course_local_progress_v1";
import { learningV2CourseSessionIdV1 } from "../modules/learning-v2/content/course_topology_v1";

describe("Learning V2 local 32x56 progression", () => {
  const accountScopeHash = "a".repeat(64);
  const rows = new Map<string, string>();
  const storage = {
    getItem: async (key: string) => rows.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      rows.set(key, value);
    },
  };

  beforeEach(() => rows.clear());

  test("starts at lesson 1 session 1 and advances contiguously without server", async () => {
    const store = createLearningV2CourseLocalProgressStoreV1(storage);
    await expect(store.load(accountScopeHash)).resolves.toMatchObject({
      completedSessionIds: [],
      currentSessionId: learningV2CourseSessionIdV1(1, 1),
      progressionAuthority: "local_completed_session_sequence_only",
      serverUnlockAuthority: "none",
    });
    const first = await store.complete(
      accountScopeHash,
      learningV2CourseSessionIdV1(1, 1),
    );
    expect(first.completedSessionIds).toEqual([
      learningV2CourseSessionIdV1(1, 1),
    ]);
    expect(first.currentSessionId).toBe(learningV2CourseSessionIdV1(1, 2));
    await expect(
      store.complete(accountScopeHash, learningV2CourseSessionIdV1(1, 3)),
    ).rejects.toThrow("learning_v2_course_local_progress_invalid");
  });

  test("is idempotent and rejects a forged non-contiguous projection", async () => {
    const store = createLearningV2CourseLocalProgressStoreV1(storage);
    const sessionId = learningV2CourseSessionIdV1(1, 1);
    const first = await store.complete(accountScopeHash, sessionId);
    await expect(store.complete(accountScopeHash, sessionId)).resolves.toEqual(
      first,
    );
    expect(() =>
      parseLearningV2CourseLocalProgressV1({
        ...initialLearningV2CourseLocalProgressV1(accountScopeHash),
        completedSessionIds: [learningV2CourseSessionIdV1(2, 1)],
        revision: 1,
      }),
    ).toThrow("learning_v2_course_local_progress_invalid");
  });
});
