import {
  createLesson1LocalProgressStore,
  type Lesson1ProgressStorage,
} from "../modules/learning-v2/progress/lesson1_local_progress";

const REQUIRED_SESSIONS = Array.from(
  { length: 12 },
  (_, index) => `session-lesson-01-${String(index + 1).padStart(2, "0")}`,
);

const scope = {
  stableId: "account-A",
  accountScopeHash: "aaaaaaaaaaaaaaaa",
  seasonId: "season-1",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 3,
};

const makeStorage = (): Lesson1ProgressStorage & {
  values: Map<string, string>;
} => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
};

const result = (
  operationId: string,
  sessionId = REQUIRED_SESSIONS[0],
  status: "in_progress" | "completed" = "completed",
) => ({
  operationId,
  sessionId,
  status,
  awarded: { xp: 25, shards: 1 },
});

describe("Learning V2 Lesson 1 local-first progress", () => {
  it("persists an applied result and restores it after restart", async () => {
    const storage = makeStorage();
    const first = createLesson1LocalProgressStore(
      storage,
      () => true,
      REQUIRED_SESSIONS,
    );

    await first.applyResult(scope, result("lesson1-op-1"));

    const restarted = createLesson1LocalProgressStore(
      storage,
      () => true,
      REQUIRED_SESSIONS,
    );
    await expect(restarted.load(scope)).resolves.toEqual(
      expect.objectContaining({
        lessonStatus: "in_progress",
        sessions: {
          [REQUIRED_SESSIONS[0]]: "completed",
        },
      }),
    );
  });

  it("applies one operationId once even when the same result races", async () => {
    const storage = makeStorage();
    const store = createLesson1LocalProgressStore(
      storage,
      () => true,
      REQUIRED_SESSIONS,
    );

    const [left, right] = await Promise.all([
      store.applyResult(scope, result("lesson1-op-race")),
      store.applyResult(scope, result("lesson1-op-race")),
    ]);

    expect([left.changed, right.changed].sort()).toEqual([false, true]);
    expect(
      [left.acceptedAward, right.acceptedAward].filter(Boolean),
    ).toEqual([{ xp: 25, shards: 1 }]);
  });

  it("rejects reuse of an operationId with a different payload", async () => {
    const store = createLesson1LocalProgressStore(
      makeStorage(),
      () => true,
      REQUIRED_SESSIONS,
    );
    await store.applyResult(scope, result("lesson1-op-conflict"));

    await expect(
      store.applyResult(scope, {
        ...result("lesson1-op-conflict"),
        awarded: { xp: 26, shards: 1 },
      }),
    ).rejects.toThrow("lesson1_operation_conflict");
  });

  it("derives completed only after all twelve required sessions complete", async () => {
    const store = createLesson1LocalProgressStore(
      makeStorage(),
      () => true,
      REQUIRED_SESSIONS,
    );

    for (const [index, sessionId] of REQUIRED_SESSIONS.entries()) {
      const applied = await store.applyResult(
        scope,
        result(`lesson1-op-${index}`, sessionId),
      );
      expect(applied.state.lessonStatus).toBe(
        index === REQUIRED_SESSIONS.length - 1 ? "completed" : "in_progress",
      );
    }
  });

  it("recognizes legacy completed progress without creating V2 completion", async () => {
    const storage = makeStorage();
    const store = createLesson1LocalProgressStore(
      storage,
      () => true,
      REQUIRED_SESSIONS,
    );
    const progressJson = JSON.stringify(new Array(50).fill("correct"));

    const migrated = await store.recordLegacySnapshot(scope, {
      operationId: "lesson1-legacy-complete",
      progressJson,
      bestScoreRaw: "5.0",
      passCountRaw: "4",
      totalXpRaw: "001250",
      shardsBalanceRaw: "0007",
    });

    expect(migrated.state.lessonStatus).toBe("not_started");
    expect(migrated.state.migration).toEqual(
      expect.objectContaining({
        status: "recognized",
        legacyLessonStatus: "completed",
        source: expect.objectContaining({
          progressJson,
          totalXpRaw: "001250",
          shardsBalanceRaw: "0007",
        }),
      }),
    );
  });

  it("recognizes legacy in-progress state and preserves raw economy values", async () => {
    const store = createLesson1LocalProgressStore(
      makeStorage(),
      () => true,
      REQUIRED_SESSIONS,
    );
    const progressJson = JSON.stringify([
      "correct",
      "wrong",
      ...new Array(48).fill("empty"),
    ]);

    const migrated = await store.recordLegacySnapshot(scope, {
      operationId: "lesson1-legacy-in-progress",
      progressJson,
      bestScoreRaw: "2.5",
      passCountRaw: "0",
      totalXpRaw: "900719925474099312345",
      shardsBalanceRaw: "42",
    });

    expect(migrated.state.migration).toEqual(
      expect.objectContaining({
        status: "recognized",
        legacyLessonStatus: "in_progress",
        source: expect.objectContaining({
          totalXpRaw: "900719925474099312345",
          shardsBalanceRaw: "42",
        }),
      }),
    );
  });

  it("persists blocked migration state for malformed legacy progress", async () => {
    const store = createLesson1LocalProgressStore(
      makeStorage(),
      () => true,
      REQUIRED_SESSIONS,
    );

    const migrated = await store.recordLegacySnapshot(scope, {
      operationId: "lesson1-legacy-invalid",
      progressJson: "not-json",
      bestScoreRaw: "5",
      passCountRaw: "1",
      totalXpRaw: "100",
      shardsBalanceRaw: "9",
    });

    expect(migrated.state.migration).toEqual(
      expect.objectContaining({
        status: "blocked",
        reason: "legacy_progress_invalid",
        source: expect.objectContaining({ progressJson: "not-json" }),
      }),
    );
  });

  it("never writes while merely reading a legacy snapshot", async () => {
    const storage = makeStorage();
    const store = createLesson1LocalProgressStore(
      storage,
      () => true,
      REQUIRED_SESSIONS,
    );

    const recognition = store.inspectLegacySnapshot({
      progressJson: JSON.stringify(new Array(50).fill("empty")),
      bestScoreRaw: null,
      passCountRaw: null,
      totalXpRaw: "17",
      shardsBalanceRaw: "3",
    });

    expect(recognition).toEqual(
      expect.objectContaining({ legacyLessonStatus: "none" }),
    );
    expect(storage.values.size).toBe(0);
  });

  it("fails closed when persisted migration state is malformed", async () => {
    const storage = makeStorage();
    const store = createLesson1LocalProgressStore(
      storage,
      () => true,
      REQUIRED_SESSIONS,
    );
    await store.recordLegacySnapshot(scope, {
      operationId: "lesson1-legacy-valid-before-corruption",
      progressJson: JSON.stringify(new Array(50).fill("empty")),
      bestScoreRaw: null,
      passCountRaw: null,
      totalXpRaw: "17",
      shardsBalanceRaw: "3",
    });
    const [key, encoded] = [...storage.values.entries()][0];
    const parsed = JSON.parse(encoded) as Record<string, unknown>;
    parsed.migration = { status: "recognized" };
    storage.values.set(key, JSON.stringify(parsed));

    await expect(store.load(scope)).rejects.toThrow(
      "lesson1_progress_corrupt",
    );
  });

  it("fails closed for a stale account generation", async () => {
    const store = createLesson1LocalProgressStore(
      makeStorage(),
      (candidate) => candidate.generation === 4,
      REQUIRED_SESSIONS,
    );

    await expect(store.applyResult(scope, result("stale-op"))).rejects.toThrow(
      "lesson1_progress_generation_stale",
    );
  });
});
