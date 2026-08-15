import { HttpsError } from "firebase-functions/v2/https";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
} from "../../../modules/learning-v2/runtime/activity_released_session_package_v1";
import {
  assertV2UnifiedActivityReleaseJoinV1,
  createV2ActivityReleasedSessionHandlerV1,
  loadV2ActivityReleaseHandlesFromUnifiedRootV1,
  V2_ACTIVITY_RELEASED_SESSION_CALLABLE_OPTIONS_V1,
} from "./v2_activity_released_session_callable_v1";
import { parseLearningV2ActivityAuxiliaryClientDescriptorV1 } from "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";

jest.mock(
  "../../../modules/learning-v2/runtime/activity_released_session_package_v1",
  () => ({
    getLearningV2ActivityReleasedSessionPackageSummaryV1: jest.fn(),
    materializeLearningV2ActivityReleasedSessionPackageV1: jest.fn(),
    parseLearningV2ActivityReleasedSessionPackageV1: jest.fn(),
  }),
);
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1",
  () => ({ parseLearningV2ActivityAuxiliaryClientDescriptorV1: jest.fn() }),
);

const h = (character: string) => character.repeat(64);
const canonicalPackageRaw = '{"auxiliaryDescriptorRaw":"{\\"safe\\":true}"}';
const request = Object.freeze({
  environment: "lab" as const,
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  expectedActiveManifestHash: h("a"),
  episodeId: "episode-1",
  sessionOrdinal: 1,
});
const summary = Object.freeze({
  episodeId: "episode-1",
  sessionId: "session-1",
  sessionOrdinal: 1,
  activityPackageFingerprint: h("b"),
  auxiliaryDescriptorFingerprint: h("c"),
  renderFingerprint: h("d"),
  capsuleEnvelopeFingerprint: h("e"),
  sourceFingerprint: h("f"),
  packageFingerprint: h("1"),
});

describe("Learning V2 released Activity session callable", () => {
  test("rollback reads all three projections from the opaque unified A handle and never legacy pointers", async () => {
    const activeHandle = Object.freeze({
      kind: "v2_unified_course_release_active_handle" as const,
    });
    const legacyLoad = jest.fn(async () => {
      throw new Error("legacy_pointer_must_not_be_read");
    });
    const auxiliaryPinned = jest.fn(async (handle, episodeId) => ({
      kind: `${episodeId}-aux`,
      handle,
    }));
    const learnerPinned = jest.fn(async (handle, episodeId) => ({
      kind: `${episodeId}-learner`,
      handle,
    }));
    const evaluatorPinned = jest.fn(async (handle, episodeId) => ({
      kind: `${episodeId}-evaluator`,
      handle,
    }));
    const loaded = await loadV2ActivityReleaseHandlesFromUnifiedRootV1({
      activeHandle: activeHandle as never,
      episodeId: "episode-a",
      auxiliary: { load: legacyLoad, loadPinned: auxiliaryPinned } as never,
      learnerCore: { load: legacyLoad, loadPinned: learnerPinned } as never,
      evaluator: { load: legacyLoad, loadPinned: evaluatorPinned } as never,
    });
    expect(legacyLoad).not.toHaveBeenCalled();
    expect([auxiliaryPinned, learnerPinned, evaluatorPinned]).toEqual(
      expect.arrayContaining([expect.any(Function)]),
    );
    expect(auxiliaryPinned).toHaveBeenCalledWith(activeHandle, "episode-a");
    expect(learnerPinned).toHaveBeenCalledWith(activeHandle, "episode-a");
    expect(evaluatorPinned).toHaveBeenCalledWith(activeHandle, "episode-a");
    expect(loaded.auxiliaryHandle).toMatchObject({ kind: "episode-a-aux" });
  });

  test("unified root rejects a swapped learner, evaluator or auxiliary leaf", () => {
    const base = {
      environment: "production" as const,
      releaseId: "release-1",
      activeManifestHash: h("a"),
      seasonId: "season-1",
      episodeId: "episode-1",
      stageId: "stage-1",
      activityPackageFingerprint: h("b"),
    };
    const input = {
      unifiedReleaseId: "release-1",
      unifiedEpisode: {
        episodeId: "episode-1",
        stageId: "stage-1",
        activityPackageFingerprint: h("b"),
        learnerCoreIndexFingerprint: h("1"),
        serverEvaluatorIndexFingerprint: h("2"),
        auxiliaryIndexFingerprint: h("3"),
      },
      learnerCore: { ...base, indexFingerprint: h("1") },
      evaluator: { ...base, indexFingerprint: h("2") },
      auxiliary: { ...base, indexFingerprint: h("3") },
    };
    expect(() => assertV2UnifiedActivityReleaseJoinV1(input)).not.toThrow();
    for (const drift of [
      { learnerCore: { ...input.learnerCore, indexFingerprint: h("9") } },
      { evaluator: { ...input.evaluator, releaseId: "release-2" } },
      { auxiliary: { ...input.auxiliary, activityPackageFingerprint: h("8") } },
    ]) {
      expect(() =>
        assertV2UnifiedActivityReleaseJoinV1({ ...input, ...drift }),
      ).toThrow("activity_release_join_mismatch");
    }
  });

  beforeEach(() => {
    jest
      .mocked(parseLearningV2ActivityAuxiliaryClientDescriptorV1)
      .mockReturnValue(
        Object.freeze({
          environment: request.environment,
          studyTarget: request.studyTarget,
          learnerSourceLocale: request.learnerSourceLocale,
          seasonId: request.seasonId,
          activeManifestHash: h("a"),
          episodeId: request.episodeId,
          sessionOrdinal: request.sessionOrdinal,
          auxiliaryIndexFingerprint: h("2"),
          descriptorFingerprint: h("c"),
        }) as never,
      );
    jest
      .mocked(parseLearningV2ActivityReleasedSessionPackageV1)
      .mockReturnValue(Object.freeze({}) as never);
    jest
      .mocked(getLearningV2ActivityReleasedSessionPackageSummaryV1)
      .mockReturnValue(summary as never);
  });

  test("requires Auth/App Check and returns only the checked learner package", async () => {
    expect(
      V2_ACTIVITY_RELEASED_SESSION_CALLABLE_OPTIONS_V1.enforceAppCheck,
    ).toBe(true);
    const handler = createV2ActivityReleasedSessionHandlerV1(
      async (_input, stableAccountId) => {
        expect(stableAccountId).toBe("stable-1");
        return Object.freeze({
          activeManifestHash: h("a"),
          unifiedReleaseId: "release-1",
          unifiedRootFingerprint: h("3"),
          auxiliaryIndexFingerprint: h("2"),
          canonicalPackageRaw,
        });
      },
      async (authUid) => {
        expect(authUid).toBe("auth-1");
        return "stable-1";
      },
    );
    await expect(handler({ data: request })).rejects.toMatchObject({
      code: "unauthenticated",
    });
    const response = await handler({
      data: request,
      auth: { uid: "auth-1" },
    });
    expect(response).toMatchObject({
      schemaVersion: "v2-activity-released-session-response.v1",
      activeManifestHash: h("a"),
      unifiedReleaseId: "release-1",
      unifiedRootFingerprint: h("3"),
      sessionId: "session-1",
      packageFingerprint: h("1"),
      canonicalPackageRaw,
      repositoryOriginProjection:
        "joined_unified_active_release_learner_evaluator_auxiliary",
      localFeedbackAuthority: "local_provisional_only",
      completionAuthority: "none",
      releaseAuthority: false,
    });
    expect(JSON.stringify(response)).not.toMatch(
      /correctResponse|acceptedResponses|serverSidecar|sourceRaw/u,
    );
  });

  test("fails closed on malformed input, release drift and package mismatch", async () => {
    const handler = createV2ActivityReleasedSessionHandlerV1(
      async () => ({
        activeManifestHash: h("a"),
        unifiedReleaseId: "release-1",
        unifiedRootFingerprint: h("3"),
        auxiliaryIndexFingerprint: h("2"),
        canonicalPackageRaw,
      }),
      async () => "stable-1",
    );
    await expect(
      handler({
        data: { ...request, extra: true },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toBeInstanceOf(HttpsError);

    const drift = createV2ActivityReleasedSessionHandlerV1(
      async () => ({
        activeManifestHash: h("9"),
        unifiedReleaseId: "release-1",
        unifiedRootFingerprint: h("3"),
        auxiliaryIndexFingerprint: h("2"),
        canonicalPackageRaw,
      }),
      async () => "stable-1",
    );
    await expect(
      drift({ data: request, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "data-loss" });

    jest
      .mocked(getLearningV2ActivityReleasedSessionPackageSummaryV1)
      .mockReturnValue({ ...summary, sessionOrdinal: 2 } as never);
    await expect(
      handler({ data: request, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "data-loss" });

    jest
      .mocked(getLearningV2ActivityReleasedSessionPackageSummaryV1)
      .mockReturnValue(summary as never);
    jest
      .mocked(parseLearningV2ActivityAuxiliaryClientDescriptorV1)
      .mockReturnValue({
        environment: request.environment,
        studyTarget: request.studyTarget,
        learnerSourceLocale: request.learnerSourceLocale,
        seasonId: request.seasonId,
        activeManifestHash: h("8"),
        episodeId: request.episodeId,
        sessionOrdinal: request.sessionOrdinal,
        auxiliaryIndexFingerprint: h("2"),
        descriptorFingerprint: h("c"),
      } as never);
    await expect(
      handler({ data: request, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "data-loss" });
  });
});
