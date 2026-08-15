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
  audioObjectCount: 33,
});
const audioEpisodeReceipt = Object.freeze({
  manifestFingerprint: manifest.manifestFingerprint,
  audioObjectCount: manifest.audioObjectCount,
  receiptFingerprint: h("audio-episode-receipt"),
});
const trustedManifests = new Set<object>([manifest]);
const trustedAudioReceipts = new Set<object>([audioEpisodeReceipt]);
const page = (
  start: number,
  count: number,
  next: number | null,
  platform: "ios" | "android" = "ios",
  deviceClass: "physical_device" | "simulator_or_emulator" = "physical_device",
) => {
  const nativeDecoderFamily =
    platform === "ios" ? ("avplayer" as const) : ("exoplayer" as const);
  const rows = Object.freeze(
    Array.from({ length: count }, (_, offset) =>
      Object.freeze({
        platform,
        deviceClass,
        osVersion: platform === "ios" ? "18.6" : "15",
        appBuildFingerprint: h(["build", platform]),
        expoAudioVersion: "1.1.1" as const,
        nativeDecoderFamily,
      }),
    ),
  );
  return Object.freeze({
    planFingerprint: manifest.planFingerprint,
    stageId: manifest.stageId,
    episodeId: manifest.episodeId,
    manifestFingerprint: manifest.manifestFingerprint,
    audioEpisodeReceiptFingerprint: audioEpisodeReceipt.receiptFingerprint,
    platform,
    deviceClass,
    pageStartIndex: start,
    pageItemCount: count,
    nextPageStartIndex: next,
    rows,
    orderedRowAggregateFingerprint: h(["rows", start, platform]),
    receiptFingerprint: h(["page", start, platform]),
  });
};
const trustedPages = new Set<object>();
const brandedPage = (...args: Parameters<typeof page>) => {
  const value = page(...args);
  trustedPages.add(value);
  return value;
};

jest.mock("./v2_voice_audio_manifest_v1", () => ({
  isV2VoiceAudioManifestV1: (value: unknown) =>
    typeof value === "object" && value !== null && trustedManifests.has(value),
}));
jest.mock("./v2_voice_audio_episode_receipt_v1", () => ({
  isV2VoiceAudioEpisodeReceiptV1: (value: unknown) =>
    typeof value === "object" &&
    value !== null &&
    trustedAudioReceipts.has(value),
}));
jest.mock("./v2_voice_native_decoder_page_receipt_v1", () => ({
  V2_VOICE_NATIVE_DECODER_PAGE_MAX_ITEMS_V1: 32,
  isV2VoiceNativeDecoderPageReceiptV1: (value: unknown) =>
    typeof value === "object" && value !== null && trustedPages.has(value),
}));

// Jest hoists the exact private predicates before this import.
// eslint-disable-next-line import/first
import {
  V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1,
  isV2VoiceNativeDecoderEpisodeReceiptV1,
  materializeV2VoiceNativeDecoderEpisodeReceiptV1,
  parseV2VoiceNativeDecoderEpisodeReceiptV1,
} from "./v2_voice_native_decoder_episode_receipt_v1";

describe("Learning V2 complete native decoder episode receipt", () => {
  beforeEach(() => {
    trustedPages.clear();
    trustedManifests.clear();
    trustedManifests.add(manifest);
    trustedAudioReceipts.clear();
    trustedAudioReceipts.add(audioEpisodeReceipt);
  });

  it.each([
    ["ios", "physical_device"],
    ["android", "physical_device"],
    ["ios", "simulator_or_emulator"],
  ] as const)(
    "closes exact %s %s decoder coverage while serialized authority remains none",
    (platform, deviceClass) => {
      const pages = Object.freeze([
        brandedPage(0, 32, 32, platform, deviceClass),
        brandedPage(32, 1, null, platform, deviceClass),
      ]);
      const result = materializeV2VoiceNativeDecoderEpisodeReceiptV1({
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        pages: pages as never,
      });
      expect(result).toMatchObject({
        platform,
        deviceClass,
        audioObjectCount: 33,
        pageCount: 2,
        decoderEvidenceAuthority: "unverified_serialized_device_observation",
        listeningEvidenceAuthority: "none",
        deviceEvidenceAuthority: "none",
        releaseAuthority: false,
      });
      expect(isV2VoiceNativeDecoderEpisodeReceiptV1(result)).toBe(true);
      const parsed = parseV2VoiceNativeDecoderEpisodeReceiptV1({
        raw: canonicalJsonV1(result),
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        pages: pages as never,
      });
      expect(parsed.receiptFingerprint).toBe(result.receiptFingerprint);
      expect(isV2VoiceNativeDecoderEpisodeReceiptV1({ ...result })).toBe(false);
    },
  );

  it("rejects gaps, reorder, cross-platform pages and build drift", () => {
    const validFirst = brandedPage(0, 32, 32);
    const validSecond = brandedPage(32, 1, null);
    const androidSecond = brandedPage(32, 1, null, "android");
    const buildDrift = brandedPage(32, 1, null);
    const buildDriftRow = Object.freeze({
      ...buildDrift.rows[0],
      appBuildFingerprint: h("other-build"),
    });
    const driftedPage = Object.freeze({
      ...buildDrift,
      rows: Object.freeze([buildDriftRow]),
    });
    trustedPages.add(driftedPage);
    for (const pages of [
      [validSecond, validFirst],
      [validFirst],
      [validFirst, androidSecond],
      [validFirst, driftedPage],
    ]) {
      expect(() =>
        materializeV2VoiceNativeDecoderEpisodeReceiptV1({
          manifest: manifest as never,
          audioEpisodeReceipt: audioEpisodeReceipt as never,
          pages: pages as never,
        }),
      ).toThrow("v2_voice_native_decoder_episode_receipt_invalid");
    }
  });

  it("rejects hostile depth before canonical comparison", () => {
    const raw = `${"[".repeat(1_000)}0${"]".repeat(1_000)}`;
    expect(() =>
      parseV2VoiceNativeDecoderEpisodeReceiptV1({
        raw,
        manifest: manifest as never,
        audioEpisodeReceipt: audioEpisodeReceipt as never,
        pages: [],
      }),
    ).toThrow("v2_voice_native_decoder_episode_receipt_invalid");
  });

  it("keeps the declared maximum 1,404-page episode inside the exact bounded cap", () => {
    const maximumManifest = Object.freeze({
      ...manifest,
      manifestFingerprint: h("maximum-manifest"),
      audioObjectCount: 1_404 * 32,
    });
    const maximumAudioReceipt = Object.freeze({
      ...audioEpisodeReceipt,
      manifestFingerprint: maximumManifest.manifestFingerprint,
      audioObjectCount: maximumManifest.audioObjectCount,
      receiptFingerprint: h("maximum-audio-receipt"),
    });
    trustedManifests.add(maximumManifest);
    trustedAudioReceipts.add(maximumAudioReceipt);
    const maximumPages = Object.freeze(
      Array.from({ length: 1_404 }, (_, index) => {
        const start = index * 32;
        const value = page(start, 32, index === 1_403 ? null : start + 32);
        const rebound = Object.freeze({
          ...value,
          planFingerprint: maximumManifest.planFingerprint,
          stageId: maximumManifest.stageId,
          episodeId: maximumManifest.episodeId,
          manifestFingerprint: maximumManifest.manifestFingerprint,
          audioEpisodeReceiptFingerprint:
            maximumAudioReceipt.receiptFingerprint,
        });
        trustedPages.add(rebound);
        return rebound;
      }),
    );
    const result = materializeV2VoiceNativeDecoderEpisodeReceiptV1({
      manifest: maximumManifest as never,
      audioEpisodeReceipt: maximumAudioReceipt as never,
      pages: maximumPages as never,
    });
    expect(
      new TextEncoder().encode(canonicalJsonV1(result)).byteLength,
    ).toBeLessThanOrEqual(V2_VOICE_NATIVE_DECODER_EPISODE_MAX_BYTES_V1);
    expect(result.pageCount).toBe(1_404);
  });
});
