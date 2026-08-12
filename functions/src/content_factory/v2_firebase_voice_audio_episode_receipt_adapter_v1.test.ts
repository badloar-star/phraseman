import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const manifest = Object.freeze({
  planFingerprint: plan.planFingerprint,
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 33,
});
const pageHandle0 = Object.freeze({ page: 0 });
const pageHandle32 = Object.freeze({ page: 32 });
const pageMaterial = (start: number, count: number, next: number | null) => {
  const receiptFingerprint = h(["page-receipt", start]);
  return Object.freeze({
    plan,
    manifest,
    receipt: Object.freeze({
      planFingerprint: plan.planFingerprint,
      stageId: manifest.stageId,
      episodeId: manifest.episodeId,
      manifestFingerprint: manifest.manifestFingerprint,
      manifestAudioObjectCount: manifest.audioObjectCount,
      pageStartIndex: start,
      pageItemCount: count,
      nextPageStartIndex: next,
      receiptFingerprint,
    }),
    summary: Object.freeze({
      receiptPin: Object.freeze({
        objectPath: `learning-v2/voice-audio-page-receipts/${receiptFingerprint}.json`,
        contentHash: h(["page-raw", start]),
        objectGeneration: "7",
        byteSize: 1_000,
        contentType: "application/json; charset=utf-8" as const,
      }),
      orderedAudioReadbackAggregateFingerprint: h(["page-readback", start]),
    }),
  });
};
const materials = new Map<object, ReturnType<typeof pageMaterial>>([
  [pageHandle0, pageMaterial(0, 32, 32)],
  [pageHandle32, pageMaterial(32, 1, null)],
]);
let receiptRaw: string | null = null;
let receiptPin: Readonly<{
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
  contentType: "application/json; charset=utf-8";
}> | null = null;
let tamperReceipt = false;
const storage = Object.freeze({
  readMetadataExact: jest.fn(async (path: string) =>
    receiptPin && path === receiptPin.objectPath
      ? Object.freeze({
          generation: receiptPin.objectGeneration,
          byteSize: receiptPin.byteSize,
          contentType: receiptPin.contentType,
          contentHash: receiptPin.contentHash,
        })
      : null,
  ),
  downloadGenerationExact: jest.fn(async () => {
    const raw = receiptRaw!;
    const bytes = new TextEncoder().encode(raw);
    if (tamperReceipt) bytes[bytes.length - 2] ^= 1;
    return Object.freeze({ kind: "downloaded" as const, bytes });
  }),
});

jest.mock("./v2_canonical_generation_plan_v2", () => ({
  isV2CanonicalSeasonPlanV2: (value: unknown) => value === plan,
}));
jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) => value === manifest,
}));
jest.mock("./v2_firebase_voice_audio_page_receipt_adapter_v1", () => ({
  resolveV2FirebaseVoiceAudioPageReceiptMaterialV1: (input: {
    handle: object;
    plan: object;
    stageId: string;
    manifest: object;
  }) => {
    if (
      input.plan !== plan ||
      input.stageId !== manifest.stageId ||
      input.manifest !== manifest
    )
      throw new Error("v2_firebase_voice_audio_page_receipt_handle_invalid");
    const value = materials.get(input.handle);
    if (!value)
      throw new Error("v2_firebase_voice_audio_page_receipt_handle_invalid");
    return value;
  },
}));
jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({ storage }),
}));
jest.mock("./v2_firebase_repository_persistence_v1", () => ({
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1:
    "application/json; charset=utf-8",
  persistV2ImmutableRepositoryObjectV1: async (input: {
    objectPath: string;
    bytes: Uint8Array;
    contentHash: string;
  }) => {
    receiptRaw = new TextDecoder().decode(input.bytes);
    expect(sha256Utf8(receiptRaw)).toBe(input.contentHash);
    receiptPin = Object.freeze({
      objectPath: input.objectPath,
      contentHash: input.contentHash,
      objectGeneration: "8",
      byteSize: input.bytes.byteLength,
      contentType: "application/json; charset=utf-8" as const,
    });
    return Object.freeze({ kind: "created" as const, pin: receiptPin });
  },
}));

// Jest hoists the private ports before this import.
// eslint-disable-next-line import/first
import {
  createFirebaseAdminV2VoiceAudioEpisodeReceiptAdapterV1,
  getV2FirebaseVoiceAudioEpisodeReceiptSummaryV1,
  isV2FirebaseVoiceAudioEpisodeReceiptHandleV1,
  resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1,
} from "./v2_firebase_voice_audio_episode_receipt_adapter_v1";

describe("Learning V2 Firebase complete episode audio receipt", () => {
  beforeEach(() => {
    receiptRaw = null;
    receiptPin = null;
    tamperReceipt = false;
    jest.clearAllMocks();
  });

  it("binds every private page, persists one authority-none receipt, and cold reads it", async () => {
    const handle =
      await createFirebaseAdminV2VoiceAudioEpisodeReceiptAdapterV1().commitAndColdReadEpisodeReceipt(
        {
          plan: plan as never,
          stageId: manifest.stageId,
          manifest: manifest as never,
          pageHandles: [pageHandle0, pageHandle32] as never,
        },
      );
    const summary = getV2FirebaseVoiceAudioEpisodeReceiptSummaryV1(handle);
    expect(summary).toMatchObject({
      audioObjectCount: 33,
      pageCount: 2,
      audioByteAuthority:
        "firebase_admin_generation_pinned_all_pages_bound_to_episode_receipt",
      codecEvidenceAuthority: "structural_mpeg_layer_iii_all_pages_revalidated",
      decoderEvidenceAuthority: "none",
      listeningEvidenceAuthority: "none",
      deviceEvidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(isV2FirebaseVoiceAudioEpisodeReceiptHandleV1(handle)).toBe(true);
    expect(isV2FirebaseVoiceAudioEpisodeReceiptHandleV1({ ...summary })).toBe(
      false,
    );
    const material = resolveV2FirebaseVoiceAudioEpisodeReceiptMaterialV1({
      handle,
      plan: plan as never,
      stageId: manifest.stageId,
      manifest: manifest as never,
    });
    expect(material.receipt.audioByteAuthority).toBe("none");
    expect(canonicalJsonV1(material.receipt)).toBe(receiptRaw);
    expect(storage.readMetadataExact).toHaveBeenCalledTimes(1);
    expect(storage.downloadGenerationExact).toHaveBeenCalledTimes(1);
  });

  it("rejects reordered or incomplete private page coverage before persistence", async () => {
    const adapter = createFirebaseAdminV2VoiceAudioEpisodeReceiptAdapterV1();
    await expect(
      adapter.commitAndColdReadEpisodeReceipt({
        plan: plan as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
        pageHandles: [pageHandle32, pageHandle0] as never,
      }),
    ).rejects.toThrow("v2_voice_audio_episode_receipt_invalid");
    await expect(
      adapter.commitAndColdReadEpisodeReceipt({
        plan: plan as never,
        stageId: manifest.stageId,
        manifest: manifest as never,
        pageHandles: [pageHandle0] as never,
      }),
    ).rejects.toThrow("v2_firebase_voice_audio_episode_receipt_input_invalid");
    expect(receiptPin).toBeNull();
  });

  it("fails closed on a same-size cold receipt tamper", async () => {
    tamperReceipt = true;
    await expect(
      createFirebaseAdminV2VoiceAudioEpisodeReceiptAdapterV1().commitAndColdReadEpisodeReceipt(
        {
          plan: plan as never,
          stageId: manifest.stageId,
          manifest: manifest as never,
          pageHandles: [pageHandle0, pageHandle32] as never,
        },
      ),
    ).rejects.toThrow(
      "v2_firebase_voice_audio_episode_receipt_readback_mismatch",
    );
  });
});
