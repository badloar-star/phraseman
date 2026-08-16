import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  decideV2UnifiedCourseReleaseHeadV1,
  isV2UnifiedCourseReleaseHeadV1,
  isV2UnifiedCourseReleaseRootV1,
  materializeV2UnifiedCourseReleaseRootV1,
  parseV2UnifiedCourseReleaseHeadV1,
  parseV2UnifiedCourseReleaseRootV1,
  type V2UnifiedCourseReleaseEpisodeV1,
} from "./v2_unified_course_release_v1";

const hash = (value: string) => sha256Utf8(value);
const pin = (name: string) => ({
  objectPath: `learning-v2/release/${name}/${hash(name)}.json`,
  contentHash: hash(name),
  objectGeneration: "1",
  byteSize: 100,
  contentType: "application/json; charset=utf-8" as const,
});

function episode(
  episodeOrdinal: number,
): Omit<V2UnifiedCourseReleaseEpisodeV1, "episodeReleaseFingerprint"> {
  const prefix = `e${episodeOrdinal}`;
  return {
    episodeOrdinal,
    episodeId: `episode-${episodeOrdinal}`,
    stageId: `stage-${episodeOrdinal}`,
    activityAssemblyFingerprint: hash(`${prefix}-assembly`),
    activityPackageFingerprint: hash(`${prefix}-package`),
    ownerInputFingerprint: hash(`${prefix}-owner`),
    ownerConfirmationFingerprint: hash(`${prefix}-confirmation`),
    ownerConfirmationObject: pin(`${prefix}-confirmation`),
    learnerCoreIndexFingerprint: hash(`${prefix}-learner`),
    learnerCoreIndexObject: pin(`${prefix}-learner`),
    serverEvaluatorIndexFingerprint: hash(`${prefix}-evaluator`),
    serverEvaluatorIndexObject: pin(`${prefix}-evaluator`),
    auxiliaryIndexFingerprint: hash(`${prefix}-auxiliary`),
    auxiliaryIndexObject: pin(`${prefix}-auxiliary`),
    voiceAudioIndexFingerprint: hash(`${prefix}-voice`),
    voiceAudioIndexObject: pin(`${prefix}-voice`),
    localizationIndexFingerprint: hash(`${prefix}-locale`),
    localizationIndexObject: pin(`${prefix}-locale`),
    errorGuidanceIndexFingerprint: hash(`${prefix}-errors`),
    errorGuidanceIndexObject: pin(`${prefix}-errors`),
  };
}

function release(releaseId: string) {
  return materializeV2UnifiedCourseReleaseRootV1({
    environment: "production",
    releaseId,
    activeManifestHash: hash(`${releaseId}-manifest`),
    planFingerprint: hash("plan"),
    courseContractFingerprint: hash("course"),
    seasonId: "season-1",
    targetLanguage: "en-US",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
    contentClass: "production_candidate",
    releaseScope: "full_season",
    rollout: {
      revision: 1,
      state: "live",
      percent: 100,
      cohortSaltVersion: 1,
      allowlistCohortIds: [],
      excludeCohortIds: [],
    },
    episodes: Array.from({ length: 32 }, (_, index) => episode(index + 1)),
  });
}

function rootPin(root: ReturnType<typeof release>) {
  const raw = canonicalJsonV1(root);
  return {
    objectPath: `learning-v2/unified-course-releases/${root.releaseId}/${root.rootFingerprint}.json`,
    contentHash: hash(raw),
    objectGeneration: "7",
    byteSize: new TextEncoder().encode(raw).byteLength,
    contentType: "application/json; charset=utf-8" as const,
  };
}

describe("unified Learning V2 course release", () => {
  it("binds all 32 owner episodes and every runtime projection into one canonical root", () => {
    const root = release("release-a");
    expect(root.episodeCount).toBe(32);
    expect(root.episodes).toHaveLength(32);
    expect(root.ownerContentAuthority).toBe(
      "none_structural_confirmation_pins_only",
    );
    expect(root.releaseAuthority).toBe(false);
    expect(root.runtimeConsumer).toBe(false);
    const parsed = parseV2UnifiedCourseReleaseRootV1(canonicalJsonV1(root));
    expect(isV2UnifiedCourseReleaseRootV1(parsed)).toBe(true);
    expect(parsed.rootFingerprint).toBe(root.rootFingerprint);
  });

  // зачем: до 2026-08-16 боевой релиз принимал только полный сезон из 32
  // уроков, и готовый первый урок невозможно было показать на телефоне —
  // раздел оставался пустым. Владелец решил разрешить частичный прод.
  //
  // Правило сняли, но сторожа у него не было вообще: тест прошёл, не заметив
  // изменения. Эти проверки закрепляют и новое разрешение, и то, что осталось
  // запрещённым, чтобы следующая правка контракта была осознанной.
  it("lets production ship a single finished lesson without the whole season", () => {
    const root = materializeV2UnifiedCourseReleaseRootV1({
      environment: "production",
      releaseId: "release-slice",
      activeManifestHash: hash("release-slice-manifest"),
      planFingerprint: hash("plan"),
      courseContractFingerprint: hash("course"),
      seasonId: "season-1",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
      contentClass: "production_candidate",
      releaseScope: "vertical_slice",
      rollout: {
        revision: 1,
        state: "live",
        percent: 100,
        cohortSaltVersion: 1,
        allowlistCohortIds: [],
        excludeCohortIds: [],
      },
      episodes: [episode(1)],
    });
    expect(root.episodeCount).toBe(1);
    expect(root.releaseScope).toBe("vertical_slice");
  });

  it("still refuses a season that claims to be full but is not", () => {
    const base = {
      environment: "production" as const,
      releaseId: "release-partial",
      activeManifestHash: hash("release-partial-manifest"),
      planFingerprint: hash("plan"),
      courseContractFingerprint: hash("course"),
      seasonId: "season-1",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
      contentClass: "production_candidate" as const,
      rollout: {
        revision: 1,
        state: "live" as const,
        percent: 100 as const,
        cohortSaltVersion: 1,
        allowlistCohortIds: [],
        excludeCohortIds: [],
      },
    };
    // Заявлен полный сезон, а уроков меньше — приложение показало бы дыры.
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV1({
        ...base,
        releaseScope: "full_season",
        episodes: Array.from({ length: 8 }, (_, index) => episode(index + 1)),
      }),
    ).toThrow("scope_invalid");
    // Vertical slice — это ровно один урок, не два и не ноль.
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV1({
        ...base,
        releaseScope: "vertical_slice",
        episodes: [],
      }),
    ).toThrow("scope_invalid");
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV1({
        ...base,
        releaseScope: "vertical_slice",
        episodes: [episode(1), episode(2)],
      }),
    ).toThrow("scope_invalid");
  });

  it("rejects missing episodes, episode drift, noncanonical bytes and production fixtures", () => {
    const input = {
      environment: "production" as const,
      releaseId: "release-a",
      activeManifestHash: hash("release-a-manifest"),
      planFingerprint: hash("plan"),
      courseContractFingerprint: hash("course"),
      seasonId: "season-1",
      targetLanguage: "en-US",
      studyTarget: "en",
      learnerSourceLocale: "ru",
      interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "tr", "pl"],
      contentClass: "production_candidate" as const,
      releaseScope: "full_season" as const,
      rollout: {
        revision: 1,
        state: "live" as const,
        percent: 100 as const,
        cohortSaltVersion: 1,
        allowlistCohortIds: [],
        excludeCohortIds: [],
      },
      episodes: Array.from({ length: 32 }, (_, index) => episode(index + 1)),
    };
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV1({
        ...input,
        episodes: input.episodes.slice(0, 31),
      }),
    ).toThrow("scope_invalid");
    const raw = canonicalJsonV1(release("release-a"));
    const drift = JSON.parse(raw);
    drift.episodes[0].learnerCoreIndexObject = pin("unrelated");
    expect(() =>
      parseV2UnifiedCourseReleaseRootV1(canonicalJsonV1(drift)),
    ).toThrow("episode_fingerprint_mismatch");
    expect(() =>
      parseV2UnifiedCourseReleaseRootV1(
        JSON.stringify(release("release-a"), null, 2),
      ),
    ).toThrow();
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV1({
        ...input,
        contentClass: "neutral_test_fixture",
      }),
    ).toThrow("scope_invalid");
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV1({
        ...input,
        interfaceLocales: ["ru", "uk", "es", "pt-BR", "vi", "id", "pl", "tr"],
      }),
    ).toThrow("locale_invalid");
    expect(() =>
      materializeV2UnifiedCourseReleaseRootV1({
        ...input,
        interfaceLocales: input.interfaceLocales.slice(0, 7),
      }),
    ).toThrow("locale_invalid");
  });

  it("performs deterministic A to B activation and immediate rollback to A", () => {
    const a = release("release-a");
    const b = release("release-b");
    const first = decideV2UnifiedCourseReleaseHeadV1({
      current: null,
      target: a,
      targetObject: rootPin(a),
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const second = decideV2UnifiedCourseReleaseHeadV1({
      current: first.head,
      target: b,
      targetObject: rootPin(b),
      action: "activate",
      expectedRevision: 1,
      operationId: "activate-b",
      updatedAtIso: "2026-08-13T00:01:00.000Z",
    });
    const rolledBack = decideV2UnifiedCourseReleaseHeadV1({
      current: second.head,
      target: a,
      targetObject: rootPin(a),
      action: "rollback",
      expectedRevision: 2,
      operationId: "rollback-a",
      updatedAtIso: "2026-08-13T00:02:00.000Z",
    });
    expect(rolledBack.head.activeReleaseId).toBe("release-a");
    expect(rolledBack.head.previousReleaseId).toBe("release-b");
    expect(rolledBack.head.state).toBe("rolled_back");
    const replay = decideV2UnifiedCourseReleaseHeadV1({
      current: rolledBack.head,
      target: a,
      targetObject: rootPin(a),
      action: "rollback",
      expectedRevision: 2,
      operationId: "rollback-a",
      updatedAtIso: "2026-08-13T00:03:00.000Z",
    });
    expect(replay.kind).toBe("exact_replay");
    expect(replay.head).toBe(rolledBack.head);
    const parsed = parseV2UnifiedCourseReleaseHeadV1(
      canonicalJsonV1(rolledBack.head),
    );
    expect(isV2UnifiedCourseReleaseHeadV1(parsed)).toBe(true);
  });

  it("fails closed on stale CAS, arbitrary rollback and cloned authority", () => {
    const a = release("release-a");
    const b = release("release-b");
    const c = release("release-c");
    const first = decideV2UnifiedCourseReleaseHeadV1({
      current: null,
      target: a,
      targetObject: rootPin(a),
      action: "activate",
      expectedRevision: 0,
      operationId: "activate-a",
      updatedAtIso: "2026-08-13T00:00:00.000Z",
    });
    const second = decideV2UnifiedCourseReleaseHeadV1({
      current: first.head,
      target: b,
      targetObject: rootPin(b),
      action: "activate",
      expectedRevision: 1,
      operationId: "activate-b",
      updatedAtIso: "2026-08-13T00:01:00.000Z",
    });
    expect(() =>
      decideV2UnifiedCourseReleaseHeadV1({
        current: second.head,
        target: c,
        targetObject: rootPin(c),
        action: "activate",
        expectedRevision: 1,
        operationId: "stale",
        updatedAtIso: "2026-08-13T00:02:00.000Z",
      }),
    ).toThrow("head_conflict");
    expect(() =>
      decideV2UnifiedCourseReleaseHeadV1({
        current: second.head,
        target: c,
        targetObject: rootPin(c),
        action: "rollback",
        expectedRevision: 2,
        operationId: "bad-rollback",
        updatedAtIso: "2026-08-13T00:02:00.000Z",
      }),
    ).toThrow("rollback_target_invalid");
    expect(isV2UnifiedCourseReleaseRootV1({ ...a })).toBe(false);
    expect(isV2UnifiedCourseReleaseHeadV1({ ...second.head })).toBe(false);
  });
});
