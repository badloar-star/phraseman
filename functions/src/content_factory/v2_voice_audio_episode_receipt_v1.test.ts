import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const manifest = Object.freeze({
  planFingerprint: h("plan"),
  stageId: "voice-stage-1",
  episodeId: "episode-1",
  manifestFingerprint: h("manifest"),
  audioObjectCount: 65,
});
const maximumManifest = Object.freeze({
  ...manifest,
  manifestFingerprint: h("maximum-manifest"),
  audioObjectCount: 1_404 * 32,
});
const page = (start: number, count: number, next: number | null) =>
  Object.freeze({
    receipt: Object.freeze({
      planFingerprint: manifest.planFingerprint,
      stageId: manifest.stageId,
      episodeId: manifest.episodeId,
      manifestFingerprint: manifest.manifestFingerprint,
      manifestAudioObjectCount: manifest.audioObjectCount,
      pageStartIndex: start,
      pageItemCount: count,
      nextPageStartIndex: next,
      receiptFingerprint: h(["receipt", start]),
    }),
    receiptPin: Object.freeze({
      objectPath: `learning-v2/voice-audio-page-receipts/${h(["receipt", start])}.json`,
      contentHash: h(["raw", start]),
      objectGeneration: "7",
      byteSize: 1000,
      contentType: "application/json; charset=utf-8" as const,
    }),
    audioReadbackAggregateFingerprint: h(["readback", start]),
  });
jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) =>
    value === manifest || value === maximumManifest,
}));

// Jest hoists the private manifest predicate before this import.
// eslint-disable-next-line import/first
import {
  V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1,
  isV2VoiceAudioEpisodeReceiptV1,
  materializeV2VoiceAudioEpisodeReceiptV1,
  parseV2VoiceAudioEpisodeReceiptV1,
} from "./v2_voice_audio_episode_receipt_v1";

describe("Learning V2 complete episode audio-readback receipt", () => {
  it("fits the declared maximum 1,404-page episode inside its exact bounded receipt cap", () => {
    const pages = Object.freeze(
      Array.from({ length: 1_404 }, (_, index) => {
        const start = index * 32;
        return Object.freeze({
          receipt: Object.freeze({
            planFingerprint: maximumManifest.planFingerprint,
            stageId: maximumManifest.stageId,
            episodeId: maximumManifest.episodeId,
            manifestFingerprint: maximumManifest.manifestFingerprint,
            manifestAudioObjectCount: maximumManifest.audioObjectCount,
            pageStartIndex: start,
            pageItemCount: 32,
            nextPageStartIndex: index === 1_403 ? null : start + 32,
            receiptFingerprint: h(["maximum-receipt", start]),
          }),
          receiptPin: Object.freeze({
            objectPath: `learning-v2/voice-audio-page-receipts/${maximumManifest.planFingerprint}/${h("stage")}/${maximumManifest.manifestFingerprint}/${start}/${h(["maximum-receipt", start])}/${h(["maximum-raw", start])}.json`,
            contentHash: h(["maximum-raw", start]),
            objectGeneration: "9".repeat(31),
            byteSize: 128 * 1024,
            contentType: "application/json; charset=utf-8" as const,
          }),
          audioReadbackAggregateFingerprint: h(["maximum-readback", start]),
        });
      }),
    );
    const result = materializeV2VoiceAudioEpisodeReceiptV1({
      manifest: maximumManifest as never,
      pages: pages as never,
    });
    expect(
      new TextEncoder().encode(canonicalJsonV1(result)).byteLength,
    ).toBeLessThanOrEqual(V2_VOICE_AUDIO_EPISODE_RECEIPT_MAX_BYTES_V1);
    expect(result.pageCount).toBe(1_404);
  });

  it("closes exact ordered page coverage while keeping serialized authority none", () => {
    const result = materializeV2VoiceAudioEpisodeReceiptV1({
      manifest: manifest as never,
      pages: Object.freeze([
        page(0, 32, 32),
        page(32, 32, 64),
        page(64, 1, null),
      ]) as never,
    });
    expect(result).toMatchObject({
      audioObjectCount: 65,
      pageCount: 3,
      audioByteAuthority: "none",
      codecEvidenceAuthority: "unverified_serialized_claim",
      decoderEvidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(isV2VoiceAudioEpisodeReceiptV1(result)).toBe(true);
    const parsed = parseV2VoiceAudioEpisodeReceiptV1({
      raw: canonicalJsonV1(result),
      manifest: manifest as never,
      pageReceipts: Object.freeze(
        [page(0, 32, 32), page(32, 32, 64), page(64, 1, null)].map(
          (value) => value.receipt,
        ),
      ) as never,
    });
    expect(parsed.receiptFingerprint).toBe(result.receiptFingerprint);
    expect(isV2VoiceAudioEpisodeReceiptV1({ ...result })).toBe(false);
  });

  it.each([
    [page(0, 32, 33), page(32, 32, 64), page(64, 1, null)],
    [page(0, 32, 32), page(33, 31, 64), page(64, 1, null)],
    [page(0, 32, 32), page(32, 32, null)],
    [page(0, 32, 32), page(32, 32, 64), page(32, 32, 64), page(64, 1, null)],
  ])(
    "rejects gaps, overlaps, premature terminal or duplicate pages",
    (...pages) => {
      expect(() =>
        materializeV2VoiceAudioEpisodeReceiptV1({
          manifest: manifest as never,
          pages: Object.freeze(pages.flat()) as never,
        }),
      ).toThrow("v2_voice_audio_episode_receipt_invalid");
    },
  );

  it("rejects hostile depth before canonicalization", () => {
    const raw = `${"[".repeat(1000)}0${"]".repeat(1000)}`;
    expect(() =>
      parseV2VoiceAudioEpisodeReceiptV1({
        raw,
        manifest: manifest as never,
        pageReceipts: Object.freeze([]),
      }),
    ).toThrow("v2_voice_audio_episode_receipt_invalid");
  });
});
