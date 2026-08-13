const h = (value: string) => value.padEnd(64, value).slice(0, 64);
const plan = Object.freeze({ planFingerprint: h("a") });
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("b"),
});
const deviceHandle = Object.freeze({});
const audioHandle = Object.freeze({});
const listeningHandles = Object.freeze([Object.freeze({}), Object.freeze({})]);
const linguistHandles = Object.freeze([Object.freeze({}), Object.freeze({})]);
const pcmEpisodeReceipt = Object.freeze({
  receiptFingerprint: h("c"),
  pages: Object.freeze([
    Object.freeze({ pageStartIndex: 0 }),
    Object.freeze({ pageStartIndex: 32 }),
  ]),
});
const receipt = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: manifest.stageId,
  episodeId: manifest.episodeId,
  manifestFingerprint: manifest.manifestFingerprint,
  deviceEpisodeReceiptFingerprint: pcmEpisodeReceipt.receiptFingerprint,
  receiptFingerprint: h("d"),
  episodeDecision: "approved" as const,
  roles: Object.freeze([
    Object.freeze({ reviewerIdentityFingerprint: h("listener") }),
    Object.freeze({ reviewerIdentityFingerprint: h("linguist") }),
  ]),
});
const storage = new Map<
  string,
  { bytes: Uint8Array; generation: string; contentHash: string }
>();
const materialize = jest.fn();
const parse = jest.fn();
const coldLoadReviewPage = jest.fn();
let corruptDownload = false;

const reviewMaterial = (role: "listening" | "linguist", index: number) => ({
  review: Object.freeze({ reviewFingerprint: h(`${role}-${index}`) }),
  summary: Object.freeze({
    reviewPin: Object.freeze({
      objectPath: `review/${role}/${index}.json`,
      contentHash: h(`${role}-hash-${index}`),
      objectGeneration: String(index + 1),
      byteSize: 10,
      contentType: "application/json; charset=utf-8",
    }),
  }),
});

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({
    storage: {
      readMetadataExact: async (path: string) => {
        const value = storage.get(path);
        if (!value) return null;
        const bytes = value.bytes;
        return {
          generation: value.generation,
          byteSize: bytes.byteLength,
          contentHash: value.contentHash,
          contentType: "application/json; charset=utf-8",
        };
      },
      downloadGenerationExact: async ({
        objectPath,
      }: {
        objectPath: string;
      }) => {
        const value = storage.get(objectPath);
        if (!value) return { kind: "not_found" };
        const bytes = corruptDownload
          ? Uint8Array.from(value.bytes, (byte, index) =>
              index === 0 ? byte ^ 1 : byte,
            )
          : value.bytes;
        return { kind: "downloaded", bytes };
      },
    },
  }),
}));
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1:
    "application/json; charset=utf-8",
  persistV2ImmutableRepositoryObjectV1: async (input: {
    objectPath: string;
    bytes: Uint8Array;
    contentHash: string;
  }) => {
    storage.set(input.objectPath, {
      bytes: input.bytes,
      generation: "7",
      contentHash: input.contentHash,
    });
    return {
      kind: "created",
      pin: {
        objectPath: input.objectPath,
        contentHash: input.contentHash,
        objectGeneration: "7",
        byteSize: input.bytes.byteLength,
        contentType: "application/json; charset=utf-8",
      },
    };
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
      throw new Error("device handle invalid");
    return { pcmEpisodeReceipt };
  },
}));
jest.mock("./v2_firebase_voice_human_review_adapter_v1", () => ({
  createFirebaseAdminV2VoiceHumanReviewAdapterV1: () => ({
    coldLoadReviewPage,
  }),
  resolveV2FirebaseVoiceHumanReviewMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
    stageId: string;
    manifest: unknown;
    reviewerRole: string;
  }) => {
    if (
      input.plan !== plan ||
      input.stageId !== manifest.stageId ||
      input.manifest !== manifest
    )
      throw new Error("review handle invalid");
    const listeningIndex = listeningHandles.indexOf(input.handle as never);
    const linguistIndex = linguistHandles.indexOf(input.handle as never);
    if (
      input.reviewerRole === "human_listening_specialist" &&
      listeningIndex >= 0
    )
      return reviewMaterial("listening", listeningIndex);
    if (input.reviewerRole === "target_language_linguist" && linguistIndex >= 0)
      return reviewMaterial("linguist", linguistIndex);
    throw new Error("review handle invalid");
  },
}));
jest.mock("./v2_voice_human_episode_review_receipt_v1", () => ({
  V2_VOICE_HUMAN_EPISODE_REVIEW_RECEIPT_MAX_BYTES_V1: 512 * 1024,
  materializeV2VoiceHumanEpisodeReviewReceiptV1: (...args: unknown[]) =>
    materialize(...args),
  parseV2VoiceHumanEpisodeReviewReceiptV1: (...args: unknown[]) =>
    parse(...args),
}));

/* eslint-disable import/first -- private handles and storage are mocked first */
import {
  createFirebaseAdminV2VoiceHumanEpisodeReviewAdapterV1,
  getV2FirebaseVoiceHumanEpisodeReviewSummaryV1,
  isV2FirebaseVoiceHumanEpisodeReviewHandleV1,
  resolveV2FirebaseVoiceHumanEpisodeReviewMaterialV1,
} from "./v2_firebase_voice_human_episode_review_adapter_v1";
/* eslint-enable import/first */

function input() {
  return {
    plan: plan as never,
    stageId: manifest.stageId,
    manifest: manifest as never,
    deviceEpisodeReceiptHandle: deviceHandle as never,
    listeningReviewHandles: listeningHandles as never,
    linguistReviewHandles: linguistHandles as never,
  };
}

describe("Firebase Voice human episode review adapter", () => {
  beforeEach(() => {
    storage.clear();
    corruptDownload = false;
    materialize.mockReset().mockReturnValue(receipt);
    parse.mockReset().mockReturnValue(receipt);
    coldLoadReviewPage.mockReset().mockImplementation((request) => {
      const index = request.pageStartIndex === 0 ? 0 : 1;
      return request.reviewerRole === "human_listening_specialist"
        ? listeningHandles[index]
        : linguistHandles[index];
    });
  });

  it("persists and cold-reads only two complete private review families", async () => {
    const handle =
      await createFirebaseAdminV2VoiceHumanEpisodeReviewAdapterV1().commitAndColdReadEpisodeReview(
        input(),
      );
    expect(isV2FirebaseVoiceHumanEpisodeReviewHandleV1(handle)).toBe(true);
    expect(isV2FirebaseVoiceHumanEpisodeReviewHandleV1({ ...handle })).toBe(
      false,
    );
    expect(getV2FirebaseVoiceHumanEpisodeReviewSummaryV1(handle)).toMatchObject(
      {
        reviewerAuthentication:
          "firebase_admin_two_distinct_exact_role_review_handles",
        reviewAuthority:
          "authenticated_in_process_two_role_exact_episode_review",
        artifactStorageAuthority:
          "firebase_admin_generation_pinned_episode_review_readback",
        publicationAuthority: "none",
        releaseEligible: false,
      },
    );
    expect(
      resolveV2FirebaseVoiceHumanEpisodeReviewMaterialV1({
        handle,
        plan: plan as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
      }).receipt,
    ).toBe(receipt);
  });

  it("rejects a cloned role handle and a cross-plan resolver", async () => {
    await expect(
      createFirebaseAdminV2VoiceHumanEpisodeReviewAdapterV1().commitAndColdReadEpisodeReview(
        {
          ...input(),
          listeningReviewHandles: [{}, listeningHandles[1]] as never,
        },
      ),
    ).rejects.toThrow("review handle invalid");
    const handle =
      await createFirebaseAdminV2VoiceHumanEpisodeReviewAdapterV1().commitAndColdReadEpisodeReview(
        input(),
      );
    expect(() =>
      resolveV2FirebaseVoiceHumanEpisodeReviewMaterialV1({
        handle,
        plan: Object.freeze({ planFingerprint: plan.planFingerprint }) as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
      }),
    ).toThrow("v2_firebase_voice_human_episode_review_invalid");
  });

  it("fails closed when generation-pinned cold bytes drift", async () => {
    corruptDownload = true;
    await expect(
      createFirebaseAdminV2VoiceHumanEpisodeReviewAdapterV1().commitAndColdReadEpisodeReview(
        input(),
      ),
    ).rejects.toThrow("v2_firebase_voice_human_episode_review_invalid");
    expect(parse).not.toHaveBeenCalled();
  });

  it("cold-loads every exact page of both roles before episode assembly", async () => {
    const handle =
      await createFirebaseAdminV2VoiceHumanEpisodeReviewAdapterV1().coldLoadAndCommitEpisodeReview(
        {
          plan: plan as never,
          stageId: manifest.stageId,
          manifest: manifest as never,
          audioEpisodeReceiptHandle: audioHandle as never,
          deviceEpisodeReceiptHandle: deviceHandle as never,
        },
      );
    expect(isV2FirebaseVoiceHumanEpisodeReviewHandleV1(handle)).toBe(true);
    expect(coldLoadReviewPage).toHaveBeenCalledTimes(4);
    expect(
      coldLoadReviewPage.mock.calls.map(([call]) => [
        call.reviewerRole,
        call.pageStartIndex,
      ]),
    ).toEqual([
      ["human_listening_specialist", 0],
      ["human_listening_specialist", 32],
      ["target_language_linguist", 0],
      ["target_language_linguist", 32],
    ]);
  });
});
