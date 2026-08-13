import { HttpsError } from "firebase-functions/v2/https";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { parseLearningV2ActivityAuxiliaryClientDescriptorV1 } from "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import {
  createV2ActivityAuxiliarySessionHandlerV1,
  V2_ACTIVITY_AUXILIARY_SESSION_CALLABLE_OPTIONS_V1,
} from "./v2_activity_auxiliary_session_callable_v1";

jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1",
  () => ({
    parseLearningV2ActivityAuxiliaryClientDescriptorV1: jest.fn(),
  }),
);

const h = (value: string) => hashCanonicalBody({ value });
const canonicalDescriptorRaw = '{"safe":true}';
const descriptor = Object.freeze({
  environment: "lab",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  activeManifestHash: h("active"),
  episodeId: "episode-1",
  sessionId: "session-1",
  sessionOrdinal: 1,
  activityPackageFingerprint: h("package"),
  auxiliaryIndexFingerprint: h("index"),
  descriptorFingerprint: h("descriptor"),
});

const request = Object.freeze({
  environment: "lab" as const,
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  expectedActiveManifestHash: h("active"),
  episodeId: "episode-1",
  sessionOrdinal: 1,
});

describe("Learning V2 activity auxiliary session callable", () => {
  beforeEach(() => {
    jest
      .mocked(parseLearningV2ActivityAuxiliaryClientDescriptorV1)
      .mockReturnValue(descriptor as never);
  });

  test("requires Auth and App Check outside an explicit demo emulator", async () => {
    expect(
      V2_ACTIVITY_AUXILIARY_SESSION_CALLABLE_OPTIONS_V1.enforceAppCheck,
    ).toBe(true);
    const handler = createV2ActivityAuxiliarySessionHandlerV1(
      async () => {
        throw new Error("must_not_resolve");
      },
      async () => "stable-1",
    );
    await expect(handler({ data: request })).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  test("returns only a checked canonical learner descriptor", async () => {
    const handler = createV2ActivityAuxiliarySessionHandlerV1(
      async (_input, stableAccountId) => {
        expect(stableAccountId).toBe("stable-1");
        return {
          activeManifestHash: request.expectedActiveManifestHash,
          activityPackageFingerprint: h("package"),
          auxiliaryIndexFingerprint: h("index"),
          canonicalDescriptorRaw,
        };
      },
      async (authUid) => {
        expect(authUid).toBe("auth-1");
        return "stable-1";
      },
    );
    const response = await handler({ data: request, auth: { uid: "auth-1" } });
    expect(response.sessionId).toBe("session-1");
    expect(response.transportAuthority).toBe(
      "firebase_callable_auth_and_app_check_boundary",
    );
    expect(response.walletAuthority).toBe("none");
    expect(response.releaseAuthority).toBe(false);
    expect(response.canonicalDescriptorRaw).not.toContain("correctResponse");
    const discovered = await handler({
      data: { ...request, expectedActiveManifestHash: null },
      auth: { uid: "auth-1" },
    });
    expect(discovered.activeManifestHash).toBe(
      request.expectedActiveManifestHash,
    );
  });

  test("fails closed on release drift, malformed input and descriptor mismatch", async () => {
    const drift = createV2ActivityAuxiliarySessionHandlerV1(
      async () => ({
        activeManifestHash: h("other-release"),
        activityPackageFingerprint: h("package"),
        auxiliaryIndexFingerprint: h("index"),
        canonicalDescriptorRaw,
      }),
      async () => "stable-1",
    );
    await expect(
      drift({ data: request, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "failed-precondition" });

    const invalid = createV2ActivityAuxiliarySessionHandlerV1(
      async () => {
        throw new Error("must_not_resolve");
      },
      async () => "stable-1",
    );
    await expect(
      invalid({
        data: { ...request, extra: true },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toBeInstanceOf(HttpsError);

    const mismatch = createV2ActivityAuxiliarySessionHandlerV1(
      async () => ({
        activeManifestHash: request.expectedActiveManifestHash,
        activityPackageFingerprint: h("different-package"),
        auxiliaryIndexFingerprint: h("index"),
        canonicalDescriptorRaw,
      }),
      async () => "stable-1",
    );
    await expect(
      mismatch({ data: request, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "data-loss" });
  });
});
