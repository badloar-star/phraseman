import { createHash } from "node:crypto";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const root = Object.freeze({
  releaseId: "fixture-release",
  rootFingerprint: hash("root"),
  planFingerprint: hash("plan"),
  courseContractFingerprint: hash("course"),
  episodeCount: 32,
});
const owner = Object.freeze({
  actorUid: "fixture-owner.invalid",
  role: "owner" as const,
  ownerIdentityFingerprint: hash("owner"),
  authenticationAuthority:
    "firebase_auth_explicit_owner_role_and_server_configured_uid_hash" as const,
  identityPolicyFingerprint: hash("owner-policy"),
});
const confirmationPreflight = Object.freeze({
  rootFingerprint: root.rootFingerprint,
  preflightFingerprint: hash("confirmation-preflight"),
});
const leafReadback = Object.freeze({
  rootFingerprint: root.rootFingerprint,
  totalLeafReadbackCount: 224,
  readbackFingerprint: hash("leaf-readback"),
  classification:
    "eligible_for_private_root_owner_activation_adapter_only" as const,
});
const nestedLocalizationRaw = JSON.stringify({
  locales: Array.from({ length: 8 }, (_, index) => ({
    localeIndexObject: {
      objectPath: `learning-v2/fixture/locale-${index}.json`,
      contentHash: hash(`locale-${index}`),
      objectGeneration: "1",
      byteSize: 10,
      contentType: "application/json; charset=utf-8",
    },
  })),
});
const nestedGuidanceRaw = JSON.stringify({
  catalogObject: {
    objectPath: "learning-v2/fixture/catalog.json",
    contentHash: hash("catalog"),
    objectGeneration: "1",
    byteSize: 10,
    contentType: "application/json; charset=utf-8",
  },
  learnerProjectionObject: {
    objectPath: "learning-v2/fixture/learner.json",
    contentHash: hash("learner"),
    objectGeneration: "1",
    byteSize: 10,
    contentType: "application/json; charset=utf-8",
  },
});
const storage = Object.freeze({
  readMetadataExact: jest.fn(),
  downloadGenerationExact: jest.fn(),
});

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({ storage }),
}));
jest.mock("./v2_root_owner_identity_v1", () => ({
  requireV2ConfiguredRootOwnerV1: (auth: unknown) => {
    if (auth !== ownerAuth) throw new Error("mock_owner_invalid");
    return owner;
  },
}));
jest.mock("./v2_unified_course_release_v1", () => ({
  isV2UnifiedCourseReleaseRootV1: (value: unknown) => value === root,
}));
jest.mock("./v2_unified_course_release_confirmation_readback_v1", () => ({
  readbackV2UnifiedCourseReleaseConfirmationsV1: jest.fn(async (input) => {
    if (input.root !== root || input.storage !== storage)
      throw new Error("mock_confirmation_input_invalid");
    return confirmationPreflight;
  }),
}));
jest.mock("./v2_unified_course_release_activation_v1", () => ({
  isV2UnifiedCourseReleaseActivationPreflightV1: (value: unknown) =>
    value === confirmationPreflight,
}));
jest.mock("./v2_unified_course_release_leaf_readback_v1", () => ({
  readbackV2UnifiedCourseReleaseLeavesV1: jest.fn(async (input) => {
    if (
      input.root !== root ||
      input.confirmationPreflight !== confirmationPreflight ||
      input.storage !== storage ||
      typeof input.loadNested !== "function"
    )
      throw new Error("mock_leaf_input_invalid");
    return leafReadback;
  }),
  isV2UnifiedCourseReleaseLeafReadbackV1: (value: unknown) =>
    value === leafReadback,
}));

const ownerAuth = Object.freeze({
  uid: "fixture-owner.invalid",
  token: Object.freeze({ admin: true, adminRole: "owner" }),
});

/* eslint-disable import/first -- private server boundaries are mocked first */
import {
  createFirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1,
  getV2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1,
  isV2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1,
  resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1,
} from "./v2_firebase_unified_course_release_activation_preflight_adapter_v1";
import { readbackV2UnifiedCourseReleaseConfirmationsV1 } from "./v2_unified_course_release_confirmation_readback_v1";
import { readbackV2UnifiedCourseReleaseLeavesV1 } from "./v2_unified_course_release_leaf_readback_v1";
/* eslint-enable import/first */

describe("Learning V2 Firebase unified activation preflight integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("mints a private handle only after exact owner, 32-confirmation and 224-leaf boundaries", async () => {
    const handle =
      await createFirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1().prepare(
        { auth: ownerAuth, root: root as never },
      );
    expect(readbackV2UnifiedCourseReleaseConfirmationsV1).toHaveBeenCalledTimes(
      1,
    );
    expect(readbackV2UnifiedCourseReleaseLeavesV1).toHaveBeenCalledTimes(1);
    expect(
      isV2FirebaseUnifiedCourseReleaseActivationPreflightHandleV1(handle),
    ).toBe(true);
    expect(
      getV2FirebaseUnifiedCourseReleaseActivationPreflightSummaryV1(handle),
    ).toMatchObject({
      releaseId: "fixture-release",
      confirmationReadbackCount: 32,
      leafInventoryReadbackCount: 224,
      leafInventoryReadbackFingerprint: leafReadback.readbackFingerprint,
      ownerIdentityFingerprint: owner.ownerIdentityFingerprint,
      ownerAuthenticationAuthority:
        "firebase_auth_explicit_owner_role_and_server_configured_uid_hash",
      ownerConfirmationReadbackAuthority:
        "firebase_admin_exact_generation_hash_size_content_type_snapshot",
      leafInventoryReadbackAuthority:
        "firebase_admin_exact_224_leaf_generation_hash_size_content_type_snapshot",
      publicationDecisionAuthority: "none",
      runtimeConsumer: false,
      releaseEligible: false,
      releaseAuthority: false,
    });
    expect(
      resolveV2FirebaseUnifiedCourseReleaseActivationPreflightMaterialV1({
        handle,
        root: root as never,
      }),
    ).toMatchObject({
      root,
      preflight: confirmationPreflight,
      leafReadback,
      owner,
    });
  });

  test("rejects a copied root before owner or leaf authority is created", async () => {
    await expect(
      createFirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1().prepare(
        { auth: ownerAuth, root: { ...root } as never },
      ),
    ).rejects.toThrow("input_invalid");
    expect(
      readbackV2UnifiedCourseReleaseConfirmationsV1,
    ).not.toHaveBeenCalled();
    expect(readbackV2UnifiedCourseReleaseLeavesV1).not.toHaveBeenCalled();
  });

  test("rejects a malformed nested pin with a stable code before Storage I/O", async () => {
    jest
      .mocked(readbackV2UnifiedCourseReleaseLeavesV1)
      .mockImplementationOnce(async (input) => {
        await input.loadNested({
          episodeOrdinal: 1,
          episodeId: "episode-1",
          localizationIndexRaw: JSON.stringify({
            ...JSON.parse(nestedLocalizationRaw),
            locales: [
              { localeIndexObject: null },
              ...JSON.parse(nestedLocalizationRaw).locales.slice(1),
            ],
          }),
          errorGuidanceIndexRaw: nestedGuidanceRaw,
        });
        throw new Error("unexpected_nested_success");
      });
    await expect(
      createFirebaseAdminV2UnifiedCourseReleaseActivationPreflightAdapterV1().prepare(
        { auth: ownerAuth, root: root as never },
      ),
    ).rejects.toThrow("nested_pin_invalid");
    expect(storage.readMetadataExact).not.toHaveBeenCalled();
    expect(storage.downloadGenerationExact).not.toHaveBeenCalled();
  });
});
