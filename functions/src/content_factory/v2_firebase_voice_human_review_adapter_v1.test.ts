const h = (value: string) => value.padEnd(64, value).slice(0, 64);
const plan = Object.freeze({ planFingerprint: h("a") });
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("b"),
});
const audioReceipt = Object.freeze({ receiptFingerprint: h("c") });
const pcmEpisodeReceipt = Object.freeze({ receiptFingerprint: h("d") });
const audioHandle = Object.freeze({});
const deviceHandle = Object.freeze({});
const review = Object.freeze({
  reviewFingerprint: h("e"),
  pageStartIndex: 0,
  pageItemCount: 1,
  nextPageStartIndex: null,
  pageDecision: "approved" as const,
});
const verifyIdToken = jest.fn();
const materialize = jest.fn();
const parse = jest.fn();
let currentReview: Record<string, unknown> = review;
const store = new Map<
  string,
  { bytes: Uint8Array; generation: string; contentHash: string }
>();
const firestoreStore = new Map<string, string>();

jest.mock("firebase-admin", () => ({
  app: () => ({
    name: "[DEFAULT]",
    options: {
      projectId: "phraseman-ea0b3",
      storageBucket: "phraseman-ea0b3.firebasestorage.app",
    },
  }),
  auth: () => ({ verifyIdToken }),
}));
jest.mock("./v2_firebase_repository_trust_root_v1", () => ({
  V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1: {
    appName: "[DEFAULT]",
    projectId: "phraseman-ea0b3",
    databaseId: "(default)",
    bucketName: "phraseman-ea0b3.firebasestorage.app",
  },
  validateV2FirebaseRepositoryTrustRootV1: jest.fn(),
}));
jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({
    firestore: {
      runTransaction: async (
        body: (transaction: {
          readExact(
            path: string,
          ): Promise<{ exists: false } | { exists: true; raw: string }>;
          createExact(path: string, raw: string): Promise<void>;
        }) => Promise<unknown>,
      ) =>
        body({
          readExact: async (path) =>
            firestoreStore.has(path)
              ? { exists: true as const, raw: firestoreStore.get(path)! }
              : { exists: false as const },
          createExact: async (path, raw) => {
            if (firestoreStore.has(path)) throw new Error("already exists");
            firestoreStore.set(path, raw);
          },
        }),
    },
    storage: {
      readMetadataExact: async (path: string) => {
        const value = store.get(path);
        return value
          ? {
              generation: value.generation,
              byteSize: value.bytes.byteLength,
              contentType: "application/json; charset=utf-8",
              contentHash: value.contentHash,
            }
          : null;
      },
      downloadGenerationExact: async ({
        objectPath,
      }: {
        objectPath: string;
      }) =>
        store.has(objectPath)
          ? { kind: "downloaded", bytes: store.get(objectPath)!.bytes }
          : { kind: "not_found" },
    },
  }),
}));
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1:
    "application/json; charset=utf-8",
  persistV2ImmutableRepositoryObjectV1: async (persistInput: {
    objectPath: string;
    bytes: Uint8Array;
    contentHash: string;
  }) => {
    store.set(persistInput.objectPath, {
      bytes: persistInput.bytes,
      generation: "7",
      contentHash: persistInput.contentHash,
    });
    return {
      kind: "created",
      pin: {
        objectPath: persistInput.objectPath,
        contentHash: persistInput.contentHash,
        objectGeneration: "7",
        byteSize: persistInput.bytes.byteLength,
        contentType: "application/json; charset=utf-8",
      },
    };
  },
}));
jest.mock("./v2_firebase_voice_audio_episode_receipt_adapter_v1", () => ({
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
    manifest: unknown;
  }) => {
    if (
      input.handle !== audioHandle ||
      input.plan !== plan ||
      input.stageId !== manifest.stageId ||
      input.manifest !== manifest
    )
      throw new Error("bad audio handle");
    return { receipt: audioReceipt };
  },
}));
jest.mock("./v2_firebase_voice_device_observation_receipt_adapter_v1", () => ({
  resolveV2FirebaseVoiceDeviceEpisodeReceiptMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
    manifest: unknown;
  }) => {
    if (
      input.handle !== deviceHandle ||
      input.plan !== plan ||
      input.stageId !== manifest.stageId ||
      input.manifest !== manifest
    )
      throw new Error("bad device handle");
    return { pcmEpisodeReceipt };
  },
}));
jest.mock("./v2_voice_human_review_contract_v1", () => ({
  V2_VOICE_HUMAN_REVIEW_MAX_BYTES_V1: 128 * 1024,
  materializeV2VoiceHumanReviewV1: (...args: unknown[]) => materialize(...args),
  parseV2VoiceHumanReviewV1: (...args: unknown[]) => parse(...args),
}));

/* eslint-disable import/first -- Firebase Admin and private handles are mocked */
import {
  createFirebaseAdminV2VoiceHumanReviewAdapterV1,
  getV2FirebaseVoiceHumanReviewSummaryV1,
  isV2FirebaseVoiceHumanReviewHandleV1,
  resolveV2FirebaseVoiceHumanReviewMaterialV1,
} from "./v2_firebase_voice_human_review_adapter_v1";
/* eslint-enable import/first */

const input = () => ({
  idToken: "x".repeat(40),
  reviewerRole: "human_listening_specialist" as const,
  plan: plan as never,
  stageId: manifest.stageId,
  manifest: manifest as never,
  audioEpisodeReceiptHandle: audioHandle as never,
  deviceEpisodeReceiptHandle: deviceHandle as never,
  reviewOperationId: "review-1",
  reviewedAtMs: 10,
  pageStartIndex: 0,
  nextPageStartIndex: null,
  decisions: [{ itemIndex: 0, decision: "approved" as const, issueCodes: [] }],
});

describe("Firebase Voice human review adapter", () => {
  beforeEach(() => {
    store.clear();
    firestoreStore.clear();
    verifyIdToken.mockReset().mockResolvedValue({
      uid: "reviewer-1",
      admin: true,
      adminRole: "content_reviewer",
      auth_time: 10,
      learningV2VoiceReviewRoles: ["human_listening_specialist"],
    });
    materialize.mockReset().mockImplementation((reviewInput) => {
      currentReview = Object.freeze({
        ...review,
        reviewerRole: reviewInput.reviewerRole,
        reviewerIdentityFingerprint: reviewInput.reviewerIdentityFingerprint,
        reviewerCredentialFingerprint:
          reviewInput.reviewerCredentialFingerprint,
      });
      return currentReview;
    });
    parse.mockReset().mockImplementation(() => currentReview);
  });

  it("uses a revocation-checked exact reviewer role and keeps release closed", async () => {
    const adapter = createFirebaseAdminV2VoiceHumanReviewAdapterV1();
    const handle = await adapter.authenticateAndReviewPage(input());
    expect(verifyIdToken).toHaveBeenCalledWith(input().idToken, true);
    expect(isV2FirebaseVoiceHumanReviewHandleV1(handle)).toBe(true);
    expect(isV2FirebaseVoiceHumanReviewHandleV1({ ...handle })).toBe(false);
    expect(getV2FirebaseVoiceHumanReviewSummaryV1(handle)).toMatchObject({
      reviewerRole: "human_listening_specialist",
      reviewerAuthentication: "firebase_admin_revocation_checked_id_token",
      reviewAuthority: "authenticated_in_process_exact_audio_page_review",
      artifactStorageAuthority:
        "firebase_admin_generation_pinned_review_readback",
      publicationAuthority: "none",
      releaseEligible: false,
    });
    expect(materialize).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest,
        audioEpisodeReceipt: audioReceipt,
        deviceEpisodeReceipt: pcmEpisodeReceipt,
      }),
    );
  });

  it("rejects a general admin without the exact specialist role", async () => {
    verifyIdToken.mockResolvedValue({
      uid: "owner-1",
      admin: true,
      adminRole: "owner",
      auth_time: 10,
      learningV2VoiceReviewRoles: ["target_language_linguist"],
    });
    await expect(
      createFirebaseAdminV2VoiceHumanReviewAdapterV1().authenticateAndReviewPage(
        input(),
      ),
    ).rejects.toThrow("v2_firebase_voice_human_review_invalid");
    expect(materialize).not.toHaveBeenCalled();
  });

  it("rejects a cloned private input handle before review materialization", async () => {
    await expect(
      createFirebaseAdminV2VoiceHumanReviewAdapterV1().authenticateAndReviewPage(
        { ...input(), deviceEpisodeReceiptHandle: {} as never },
      ),
    ).rejects.toThrow("bad device handle");
    expect(materialize).not.toHaveBeenCalled();
  });

  it("cold-loads an indexed page in a fresh adapter without reviewer token", async () => {
    const first = createFirebaseAdminV2VoiceHumanReviewAdapterV1();
    await first.authenticateAndReviewPage(input());
    verifyIdToken.mockClear();
    const coldHandle =
      await createFirebaseAdminV2VoiceHumanReviewAdapterV1().coldLoadReviewPage(
        {
          plan: plan as never,
          stageId: manifest.stageId,
          manifest: manifest as never,
          audioEpisodeReceiptHandle: audioHandle as never,
          deviceEpisodeReceiptHandle: deviceHandle as never,
          reviewerRole: "human_listening_specialist",
          pageStartIndex: 0,
        },
      );
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(isV2FirebaseVoiceHumanReviewHandleV1(coldHandle)).toBe(true);
    expect(
      resolveV2FirebaseVoiceHumanReviewMaterialV1({
        handle: coldHandle,
        plan: plan as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
        reviewerRole: "human_listening_specialist",
      }).review,
    ).toBe(currentReview);
  });
});
