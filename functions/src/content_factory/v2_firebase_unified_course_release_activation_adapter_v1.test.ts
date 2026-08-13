import { createHash } from "node:crypto";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const root = Object.freeze({
  releaseId: "release-a",
  rootFingerprint: hash("root"),
});
const preflightHandle = Object.freeze({ kind: "private-preflight" });
const activeHandle = Object.freeze({ kind: "private-active" });
const preflightMaterial = Object.freeze({
  preflight: Object.freeze({
    rootFingerprint: root.rootFingerprint,
    preflightFingerprint: hash("preflight"),
  }),
  leafReadback: Object.freeze({
    rootFingerprint: root.rootFingerprint,
    totalLeafReadbackCount: 224,
    classification: "eligible_for_private_root_owner_activation_adapter_only",
    readbackFingerprint: hash("leaves"),
  }),
  owner: Object.freeze({ ownerIdentityFingerprint: hash("owner") }),
});
let commits = 0;

jest.mock("./v2_unified_course_release_v1", () => ({
  isV2UnifiedCourseReleaseRootV1: (value: unknown) => value === root,
}));
jest.mock(
  "./v2_firebase_unified_course_release_activation_preflight_adapter_v1",
  () => ({
    resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1:
      (input: { handle: unknown; root: unknown }) => {
        if (input.handle !== preflightHandle || input.root !== root)
          throw new Error("mock_preflight_invalid");
        return preflightMaterial;
      },
  }),
);
jest.mock("./v2_unified_course_release_repository_v1", () => ({
  createFirebaseAdminV2UnifiedCourseReleaseRepositoryV1: () => ({
    persistAndAdvance: async (input: {
      target: unknown;
      action: "activate" | "rollback";
    }) => {
      if (input.target !== root) throw new Error("mock_root_invalid");
      commits += 1;
      return {
        root,
        head: Object.freeze({
          activeReleaseId: root.releaseId,
          activeRootFingerprint: root.rootFingerprint,
          operationRevision: 1,
          state: input.action === "activate" ? "live" : "rolled_back",
        }),
        persistenceKind: "created",
        headDecision: "commit",
        activeHandle,
      };
    },
  }),
}));

/* eslint-disable import/first -- private seams are mocked first */
import {
  createFirebaseAdminV2UnifiedCourseReleaseActivationAdapterV1,
  getV2FirebaseUnifiedCourseReleaseActivationSummaryV1,
  isV2FirebaseUnifiedCourseReleaseActivationHandleV1,
  resolveV2FirebaseUnifiedCourseReleaseActivationMaterialV1,
} from "./v2_firebase_unified_course_release_activation_adapter_v1";
/* eslint-enable import/first */

describe("Firebase unified release activation authority", () => {
  beforeEach(() => {
    commits = 0;
  });

  test("advances the one head only from the exact root-owner 224-leaf handle", async () => {
    const handle =
      await createFirebaseAdminV2UnifiedCourseReleaseActivationAdapterV1().advance(
        {
          preflightHandle: preflightHandle as never,
          root: root as never,
          action: "activate",
          expectedRevision: 0,
          operationId: "operation-1",
          updatedAtIso: "2026-08-13T12:00:00.000Z",
        },
      );
    expect(isV2FirebaseUnifiedCourseReleaseActivationHandleV1(handle)).toBe(
      true,
    );
    expect(commits).toBe(1);
    expect(
      getV2FirebaseUnifiedCourseReleaseActivationSummaryV1(handle),
    ).toMatchObject({
      releaseId: "release-a",
      leafReadbackFingerprint: hash("leaves"),
      ownerIdentityFingerprint: hash("owner"),
      activationAuthority:
        "firebase_admin_single_unified_head_transaction_and_cold_readback",
      publicationAuthority: "unified_head_only",
      candidateOriginAuthority: "none_owner_authored_input_pin_only",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(
      resolveV2FirebaseUnifiedCourseReleaseActivationMaterialV1({
        handle,
        root: root as never,
      }).activeHandle,
    ).toBe(activeHandle);
  });

  test("rejects cloned preflight/activation handles before a head mutation", async () => {
    await expect(
      createFirebaseAdminV2UnifiedCourseReleaseActivationAdapterV1().advance({
        preflightHandle: { ...preflightHandle } as never,
        root: root as never,
        action: "activate",
        expectedRevision: 0,
        operationId: "operation-1",
        updatedAtIso: "2026-08-13T12:00:00.000Z",
      }),
    ).rejects.toThrow("mock_preflight_invalid");
    expect(commits).toBe(0);
    const fake = Object.freeze({
      kind: "v2_firebase_unified_course_release_activation_handle",
    });
    expect(isV2FirebaseUnifiedCourseReleaseActivationHandleV1(fake)).toBe(
      false,
    );
    expect(() =>
      getV2FirebaseUnifiedCourseReleaseActivationSummaryV1(fake as never),
    ).toThrow("handle_invalid");
  });
});
